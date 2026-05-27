import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Mail, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LocalSettings {
  is_maintenance: boolean
  maintenance_message: string
}

type PreviewItem = {
  invite_id: string
  nutri_id: string
  nutri_email: string
  nutri_full_name: string
  token: string
  expires_at: string
}

type PreviewResponse = {
  items: PreviewItem[]
  total: number
}

type SendResponse = {
  ok: boolean
  sent_count: number
  error_count: number
  errors: string[]
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function InviteRemindersCard() {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  const previewQuery = useQuery({
    queryKey: ['invite-reminders-preview'],
    queryFn: async (): Promise<PreviewResponse> => {
      const token = await getToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/invites/expiry-reminders-preview`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: isOpen,
  })

  const sendMutation = useMutation({
    mutationFn: async (): Promise<SendResponse> => {
      const token = await getToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/invites/send-expiry-reminders`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      if (data.error_count === 0) {
        toast.success(`Recordatorios enviados: ${data.sent_count}`)
      } else {
        toast.warning(
          `Enviados: ${data.sent_count}. Errores: ${data.error_count}.`,
          { description: data.errors.slice(0, 3).join(', '), duration: 12000 }
        )
      }
      setIsOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['invite-reminders-preview'] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al enviar recordatorios')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Mail className='h-4 w-4' />
          Recordatorios de invites
        </CardTitle>
        <CardDescription>
          Manda un recordatorio a los nutris que tienen invites por vencer en
          las próximas 48hs y todavía no entraron. Cada nutri recibe el recordatorio
          una sola vez.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setIsOpen(true)}>
          Ver y enviar recordatorios pendientes
        </Button>
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Recordatorios pendientes</DialogTitle>
            <DialogDescription>
              {previewQuery.isLoading
                ? 'Buscando…'
                : previewQuery.data
                ? `Hay ${previewQuery.data.total} ${
                    previewQuery.data.total === 1 ? 'invite' : 'invites'
                  } que vencen en 48hs o menos y no recibieron recordatorio.`
                : null}
            </DialogDescription>
          </DialogHeader>

          {previewQuery.isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : previewQuery.data && previewQuery.data.items.length > 0 ? (
            <div className='max-h-96 overflow-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewQuery.data.items.map((item) => (
                    <TableRow key={item.invite_id}>
                      <TableCell className='font-medium'>{item.nutri_full_name}</TableCell>
                      <TableCell>{item.nutri_email}</TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {fmtDateTime(item.expires_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className='py-8 text-center text-muted-foreground'>
              No hay recordatorios pendientes en este momento.
            </p>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                sendMutation.isPending ||
                !previewQuery.data ||
                previewQuery.data.items.length === 0
              }
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Enviando…
                </>
              ) : (
                `Enviar ${previewQuery.data?.total ?? 0} recordatorio${previewQuery.data?.total === 1 ? '' : 's'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
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
    <div className='space-y-8'>
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

      <div className='max-w-lg'>
        <InviteRemindersCard />
      </div>
    </div>
  )
}
