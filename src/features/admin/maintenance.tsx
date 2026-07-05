import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Mail, Loader2, Gift } from 'lucide-react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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

type NutriHit = {
  id: string
  full_name: string | null
  email: string | null
  subscription_type: string | null
  subscription_end: string | null
}

const COURTESY_REASONS = ['Compró Balanza', 'Compró Protocolo', 'Otros'] as const

// dd/mm/yyyy sin desfase de timezone (subscription_end viene como YYYY-MM-DD)
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function CourtesyCard() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<NutriHit | null>(null)
  const [months, setMonths] = useState('')
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const safe = search.trim().replace(/[,()*%]/g, '')

  const searchQuery = useQuery({
    queryKey: ['courtesy-nutri-search', safe],
    queryFn: async (): Promise<NutriHit[]> => {
      const { data, error } = await supabase
        .from('nutris')
        .select('id, full_name, email, subscription_type, subscription_end')
        .neq('role', 'admin')
        .or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
        .limit(8)
      if (error) throw error
      return data ?? []
    },
    enabled: safe.length >= 2 && !selected,
  })

  const grant = useMutation({
    mutationFn: async (): Promise<{ subscription_end: string }> => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/nutris/${selected!.id}/grant-courtesy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ months: Number(months), reason }),
        }
      )
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Cortesía otorgada a ${selected?.full_name ?? 'el nutri'}`, {
        description: `Tipo Cortesía · vence ${fmtDate(data.subscription_end)}`,
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-nutris'] })
      setConfirmOpen(false)
      setSelected(null)
      setSearch('')
      setMonths('')
      setReason('')
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al otorgar cortesía')
      setConfirmOpen(false)
    },
  })

  const canGrant = !!selected && (months === '1' || months === '2' || months === '3') && !!reason

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Gift className='h-4 w-4' />
          Otorgar acceso de cortesía
        </CardTitle>
        <CardDescription>
          Regala 1 a 3 meses del plan Básico (30 reportes/mes). Queda como tipo
          "Cortesía" (no cuenta como ingreso). Solo Básico.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {!selected ? (
          <div className='space-y-2'>
            <Label>Buscar nutri (nombre o email)</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Nombre o email…'
            />
            {safe.length >= 2 && (
              <div className='rounded-md border'>
                {searchQuery.isLoading ? (
                  <div className='flex justify-center py-4'>
                    <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                  </div>
                ) : searchQuery.data && searchQuery.data.length > 0 ? (
                  <ul className='max-h-60 divide-y overflow-auto'>
                    {searchQuery.data.map((n) => (
                      <li key={n.id}>
                        <button
                          type='button'
                          onClick={() => setSelected(n)}
                          className='flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent/50'
                        >
                          <span className='text-sm font-medium'>{n.full_name}</span>
                          <span className='text-xs text-muted-foreground'>{n.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='py-4 text-center text-sm text-muted-foreground'>
                    Sin resultados
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='flex items-center justify-between rounded-md border p-3'>
              <div>
                <p className='text-sm font-medium'>{selected.full_name}</p>
                <p className='text-xs text-muted-foreground'>{selected.email}</p>
              </div>
              <Button variant='ghost' size='sm' onClick={() => setSelected(null)}>
                Cambiar
              </Button>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Meses</Label>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger>
                    <SelectValue placeholder='Elegir' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>1 mes</SelectItem>
                    <SelectItem value='2'>2 meses</SelectItem>
                    <SelectItem value='3'>3 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder='Elegir' />
                  </SelectTrigger>
                  <SelectContent>
                    {COURTESY_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button disabled={!canGrant} onClick={() => setConfirmOpen(true)}>
              Otorgar cortesía
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmás otorgar la cortesía?</AlertDialogTitle>
            <AlertDialogDescription>
              {months} {Number(months) === 1 ? 'mes' : 'meses'} de cortesía (Básico) a{' '}
              <strong>{selected?.full_name}</strong> por <strong>{reason}</strong>. Esto
              cambia el plan del nutri a tipo Cortesía.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={grant.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                grant.mutate()
              }}
              disabled={grant.isPending}
            >
              {grant.isPending ? 'Otorgando…' : 'Otorgar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

      <div className='max-w-lg'>
        <CourtesyCard />
      </div>
    </div>
  )
}
