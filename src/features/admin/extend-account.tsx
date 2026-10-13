import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

type Account = {
  id: string
  full_name: string
  email: string
  subscription_end: string | null
  subscription_type: string
  is_suspended: boolean
}

const fmtDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

export function ExtendAccountCard() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Account | null>(null)
  const [days, setDays] = useState('15')
  const [addReports, setAddReports] = useState(false)
  const [reports, setReports] = useState('')
  const [confirmation, setConfirmation] = useState<{
    account: Account
    days: number
    extraReports: number
    requestId: string
    newEnd: string
  } | null>(null)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [success, setSuccess] = useState('')
  const safe = search.trim().replace(/[,().*%"\\]/g, '')
  const searchQuery = useQuery({
    queryKey: ['extend-account-search', safe],
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('nutris')
        .select(
          'id, full_name, email, subscription_end, subscription_type, is_suspended'
        )
        .neq('role', 'admin')
        .or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`)
        .order('full_name')
        .limit(10)
      if (error) throw error
      return data ?? []
    },
    enabled: safe.length >= 2 && !selected,
  })
  const extraReports = addReports ? Number(reports) : 0
  const validReports =
    !addReports ||
    (/^\d+$/.test(reports) && extraReports > 0 && extraReports <= 10000)
  const today = new Date().toISOString().slice(0, 10)
  const base =
    selected?.subscription_end && selected.subscription_end > today
      ? selected.subscription_end
      : today
  const newEndDate = new Date(`${base}T00:00:00Z`)
  newEndDate.setUTCDate(newEndDate.getUTCDate() + Number(days))
  const newEnd = newEndDate.toISOString().slice(0, 10)
  const extend = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!confirmation) throw new Error('Seleccioná una cuenta.')
      setError('')
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Tu sesión venció. Volvé a iniciar sesión.')
      let res: Response
      try {
        res = await fetch(
          `${import.meta.env.VITE_API_URL}/admin/nutris/${confirmation.account.id}/extend-account`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              request_id: confirmation.requestId,
              days: confirmation.days,
              extra_reports: confirmation.extraReports,
              expected_subscription_end: confirmation.account.subscription_end,
            }),
            signal: AbortSignal.timeout(20000),
          }
        )
      } catch {
        setUncertain(true)
        throw new Error(
          'No pudimos confirmar el resultado. Reintentá esta misma operación: no se duplicarán los días ni los reportes.'
        )
      }
      if (!res.ok) {
        // Server errors may happen after commit; keep the same request ID on retry.
        setUncertain(res.status >= 500)
        const body = await res.json().catch(() => null)
        throw new Error(
          typeof body?.detail === 'string'
            ? body.detail
            : 'No se pudo extender la cuenta. Reintentá la operación.'
        )
      }
      try {
        return (await res.json()) as {
          subscription_end: string
          extra_reports: number
        }
      } catch {
        setUncertain(true)
        throw new Error(
          'No pudimos leer el resultado. Reintentá la misma operación para verificarla sin duplicarla.'
        )
      }
    },
    onSuccess: (data) => {
      const message = `${confirmation?.account.full_name}: acceso hasta el ${fmtDate(data.subscription_end)}${data.extra_reports ? ` y ${data.extra_reports} reportes extra agregados` : ', sin agregar reportes'}.`
      setSuccess(message)
      toast.success('Cuenta extendida', { description: message })
      setConfirmation(null)
      setSelected(null)
      setSearch('')
      setReports('')
      setAddReports(false)
      setUncertain(false)
      for (const key of [
        'admin-nutris',
        'extend-account-search',
        'courtesy-nutri-search',
        'dashboard-stats',
        'nutri-me',
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
    onError: (e) =>
      setError(
        e instanceof Error ? e.message : 'No se pudo extender la cuenta.'
      ),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <CalendarPlus className='h-4 w-4' />
          Extender cuenta
        </CardTitle>
        <CardDescription>
          Agregá 15 o 30 días de acceso y, si hace falta, reportes extra por
          única vez. Se mantiene el plan actual.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {success && (
          <p role='status' className='rounded-md border p-3 text-sm'>
            {success}
          </p>
        )}
        {!selected ? (
          <div className='space-y-2'>
            <Label htmlFor='extension-search'>
              Buscar cuenta por nombre o email
            </Label>
            <Input
              id='extension-search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Nombre o email…'
            />
            {safe.length >= 2 && (
              <div className='rounded-md border'>
                {searchQuery.isFetching ? (
                  <p className='flex items-center gap-2 p-3 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Buscando…
                  </p>
                ) : searchQuery.isError ? (
                  <p role='alert' className='p-3 text-sm text-destructive'>
                    No se pudieron cargar las cuentas.{' '}
                    <button
                      className='underline'
                      onClick={() => void searchQuery.refetch()}
                    >
                      Reintentar
                    </button>
                  </p>
                ) : searchQuery.data?.length ? (
                  <ul className='max-h-60 divide-y overflow-auto'>
                    {searchQuery.data.map((account) => (
                      <li key={account.id}>
                        <button
                          type='button'
                          className='flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent'
                          onClick={() => {
                            setSelected(account)
                            setSuccess('')
                          }}
                        >
                          <span className='text-sm font-medium'>
                            {account.full_name}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {account.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='p-3 text-sm text-muted-foreground'>
                    Sin resultados. Probá con el email.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className='flex items-start justify-between gap-2 rounded-md border p-3'>
              <div className='min-w-0 text-sm'>
                <p className='font-medium'>{selected.full_name}</p>
                <p className='break-all text-muted-foreground'>
                  {selected.email}
                </p>
                <p className='mt-2'>
                  Vencimiento actual:{' '}
                  {selected.subscription_end
                    ? fmtDate(selected.subscription_end)
                    : 'Sin vencimiento'}
                </p>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelected(null)}
              >
                Cambiar
              </Button>
            </div>
            {selected.is_suspended || !selected.subscription_end ? (
              <Alert>
                <AlertDescription>
                  {selected.is_suspended
                    ? 'Esta cuenta está suspendida. Revisá su suspensión antes de extenderla.'
                    : 'Esta cuenta ya tiene acceso sin vencimiento.'}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='extension-days'>Días adicionales</Label>
                  <Select value={days} onValueChange={setDays}>
                    <SelectTrigger id='extension-days'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='15'>15 días</SelectItem>
                      <SelectItem value='30'>30 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Se cuentan desde{' '}
                  {selected.subscription_end < today
                    ? 'hoy porque la cuenta está vencida'
                    : 'el vencimiento actual'}
                  . Nuevo vencimiento:{' '}
                  <strong className='text-foreground'>{fmtDate(newEnd)}</strong>
                  .
                </p>
                <div className='flex items-center justify-between gap-3'>
                  <Label htmlFor='extension-add-reports'>
                    Agregar reportes extra
                  </Label>
                  <Switch
                    id='extension-add-reports'
                    checked={addReports}
                    onCheckedChange={setAddReports}
                  />
                </div>
                {addReports && (
                  <div className='space-y-2'>
                    <Label htmlFor='extension-reports'>
                      Cantidad de reportes
                    </Label>
                    <Input
                      id='extension-reports'
                      type='number'
                      min='1'
                      max='10000'
                      step='1'
                      value={reports}
                      onChange={(e) => setReports(e.target.value)}
                      placeholder='Ej. 15'
                      aria-invalid={!validReports}
                    />
                    <p className='text-sm text-muted-foreground'>
                      Saldo por única vez: se usa después del cupo normal y se
                      conserva hasta consumirse, mientras la cuenta tenga acceso
                      vigente.
                    </p>
                  </div>
                )}
                <Button
                  disabled={!validReports}
                  onClick={() => {
                    setError('')
                    setUncertain(false)
                    setConfirmation({
                      account: selected,
                      days: Number(days),
                      extraReports,
                      requestId: crypto.randomUUID(),
                      newEnd,
                    })
                  }}
                >
                  Revisar extensión
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !extend.isPending && !uncertain) setConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar extensión</DialogTitle>
            <DialogDescription>
              Revisá la cuenta, la fecha y los reportes antes de aplicar.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 text-sm'>
            <p className='font-medium'>{confirmation?.account.full_name}</p>
            <p className='break-all'>{confirmation?.account.email}</p>
            <p>
              Extensión: <strong>{confirmation?.days} días</strong>
            </p>
            <p>
              Nuevo vencimiento:{' '}
              <strong>{confirmation && fmtDate(confirmation.newEnd)}</strong>
            </p>
            <p>
              Reportes extra:{' '}
              <strong>{confirmation?.extraReports || 'Ninguno'}</strong>
            </p>
          </div>
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              disabled={extend.isPending || uncertain}
              onClick={() => setConfirmation(null)}
            >
              Cancelar
            </Button>
            <Button disabled={extend.isPending} onClick={() => extend.mutate()}>
              {extend.isPending
                ? 'Aplicando…'
                : uncertain
                  ? 'Reintentar la misma operación'
                  : 'Confirmar extensión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
