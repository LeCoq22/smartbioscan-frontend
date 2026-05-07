import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LocalSettings {
  is_maintenance: boolean
  maintenance_message: string
}

export function MaintenanceSection() {
  const queryClient = useQueryClient()
  const [local, setLocal] = useState<LocalSettings | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('is_maintenance, maintenance_message')
        .eq('id', 1)
        .single()
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (settings && !local) {
      setLocal({
        is_maintenance: settings.is_maintenance,
        maintenance_message: settings.maintenance_message ?? '',
      })
    }
  }, [settings, local])

  const save = useMutation({
    mutationFn: async () => {
      if (!local) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const { error } = await supabase
        .from('app_settings')
        .update({
          is_maintenance: local.is_maintenance,
          maintenance_message: local.maintenance_message,
          updated_at: new Date().toISOString(),
          updated_by: session?.user.id,
        })
        .eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Configuración guardada')
      void queryClient.invalidateQueries({ queryKey: ['app-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['session-checks'] })
    },
    onError: () => toast.error('Error al guardar'),
  })

  if (!local) return <p className='text-muted-foreground text-sm'>Cargando…</p>

  return (
    <div className='max-w-lg space-y-6'>
      <div className='flex items-center justify-between rounded-lg border p-4'>
        <div className='space-y-0.5'>
          <p className='font-medium'>Modo mantenimiento</p>
          <p className='text-sm text-muted-foreground'>
            Todos los usuarios no-admin verán la pantalla de mantenimiento cuando esté activo.
          </p>
        </div>
        <Switch
          checked={local.is_maintenance}
          onCheckedChange={(v) =>
            setLocal((s) => s && { ...s, is_maintenance: v })
          }
        />
      </div>

      <div className='space-y-1.5'>
        <Label>Mensaje de mantenimiento</Label>
        <Textarea
          rows={4}
          value={local.maintenance_message}
          onChange={(e) =>
            setLocal((s) => s && { ...s, maintenance_message: e.target.value })
          }
        />
      </div>

      {local.is_maintenance && (
        <Alert variant='destructive'>
          <AlertDescription>
            El modo mantenimiento está <strong>ACTIVO</strong>. Los usuarios no-admin no pueden
            acceder a la app.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
    </div>
  )
}
