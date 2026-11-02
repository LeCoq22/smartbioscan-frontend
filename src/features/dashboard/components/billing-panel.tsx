import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, CreditCard, ArrowRightLeft, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

type Plan = {
  id: string
  title: string
  months: number
  max_reports_month: number
  unit_price: number
}
type Order = {
  id: string
  status: string
  mode: string
  target_plan: Plan
  previous_end: string
  init_point?: string
  renewal_init_point?: string
  provider_synced: boolean
}
export type BillingSummary = {
  review_required?: boolean
  enabled: boolean
  current_plan: Plan
  subscription_end: string
  expiry_policy?: string
  cycle_end: string
  quota: {
    used: number
    limit: number
    remaining: number
    pack_remaining: number
  }
  packs: { reports: number; amount: string }[]
  plans: Plan[]
  pending: Order | null
}
const money = (value: number | string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    Number(value)
  )
const day = (value: string) =>
  value?.slice(0, 10).split('-').reverse().join('/')
async function billingRequest(path: string, body?: unknown) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Tu sesión venció. Volvé a iniciar sesión.')
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/billing${path}`,
    {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  )
  const result = await response.json()
  if (!response.ok)
    throw new Error(
      typeof result.detail === 'string'
        ? result.detail
        : 'No se pudo completar la operación'
    )
  return result
}
export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: ['billing-summary'],
    queryFn: () => billingRequest('/summary'),
    retry: false,
    refetchInterval: (query) => (query.state.data?.pending ? 15000 : false),
  })
}
type Choice = {
  request_id: string
  plan_id?: string
  reports?: number
  title: string
  amount: number | string
  timing: string
  scheduled: boolean
}
export function BillingPanel() {
  const { data, isLoading, error, refetch } = useBillingSummary()
  const client = useQueryClient()
  const [choice, setChoice] = useState<Choice | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  if (data?.enabled === false) return null
  async function cancelPending() {
    if (!data?.pending) return
    setBusy(true)
    setFailure('')
    try {
      await billingRequest(`/orders/${data.pending.id}/cancel`, {})
      await client.invalidateQueries({ queryKey: ['billing-summary'] })
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : 'No se pudo cancelar el cambio'
      )
    } finally {
      setBusy(false)
    }
  }
  async function authorizeRenewal() {
    if (!data?.pending) return
    setBusy(true)
    setFailure('')
    try {
      const result = await billingRequest(
        `/orders/${data.pending.id}/renewal`,
        {}
      )
      if (result.init_point) {
        const url = new URL(result.init_point)
        if (
          url.protocol !== 'https:' ||
          !/(^|\.)mercadopago\.com(\.ar)?$/.test(url.hostname)
        )
          throw new Error('El enlace de autorización no es válido')
        window.location.assign(url.toString())
      } else {
        await client.invalidateQueries({ queryKey: ['billing-summary'] })
      }
    } catch (err) {
      setFailure(
        err instanceof Error
          ? err.message
          : 'No se pudo preparar la autorización'
      )
    } finally {
      setBusy(false)
    }
  }
  async function confirm() {
    if (!choice) return
    setBusy(true)
    setFailure('')
    try {
      const result = await billingRequest('/orders', {
        request_id: choice.request_id,
        plan_id: choice.plan_id,
        reports: choice.reports,
      })
      if (result.init_point) {
        const url = new URL(result.init_point)
        if (
          url.protocol !== 'https:' ||
          !/(^|\.)mercadopago\.com(\.ar)?$/.test(url.hostname)
        )
          throw new Error('El enlace de pago no es válido')
        window.location.assign(url.toString())
      } else {
        setChoice(null)
        await client.invalidateQueries({ queryKey: ['billing-summary'] })
        await client.invalidateQueries({ queryKey: ['dashboard-stats'] })
      }
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : 'No se pudo completar la compra'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className='mt-6'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <CreditCard className='h-5 w-5' /> Mi plan y reportes
        </CardTitle>
        <CardDescription>
          Gestioná tu suscripción y comprá paquetes de 10 reportes sin
          vencimiento.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {isLoading && <p role='status'>Cargando tu plan…</p>}
        {error && (
          <div role='alert' className='space-y-2'>
            <p>{error.message}</p>
            <Button variant='outline' onClick={() => refetch()}>
              Reintentar
            </Button>
            <a className='ml-4 underline' href='/planes'>
              Ver planes
            </a>
          </div>
        )}
        {data?.enabled && (
          <>
            <div className='flex flex-wrap justify-between gap-6 rounded-lg bg-muted p-4'>
              <div>
                <p className='font-semibold'>{data.current_plan.title}</p>
                <p className='text-sm text-muted-foreground'>
                  Vigente hasta {day(data.subscription_end)}
                </p>
              </div>
              <div>
                <p className='text-2xl font-bold'>
                  {data.quota.remaining ?? 0}{' '}
                  <span className='text-sm font-normal'>
                    reportes disponibles
                  </span>
                </p>
                <p className='text-sm text-muted-foreground'>
                  Ciclo hasta {day(data.cycle_end)}
                </p>
              </div>
            </div>
            {data.review_required && (
              <p
                role='alert'
                className='rounded-lg border border-amber-300 p-3 text-sm'
              >
                Hay un pago que necesita revisión. Contactá a soporte antes de
                volver a pagar esa operación.
              </p>
            )}
            {data.pending && (
              <div
                role='status'
                className='rounded-lg border border-primary/30 bg-primary/5 p-4'
              >
                <p className='font-semibold'>
                  {data.pending.target_plan.title}
                </p>
                <p className='text-sm'>
                  {data.pending.status === 'cancelling'
                    ? 'Restaurando la renovación del plan anterior…'
                    : data.pending.status === 'checkout'
                      ? 'El cambio todavía no está pagado. Completá el pago para reservar el nuevo plan.'
                      : data.pending.status === 'syncing'
                        ? 'Tu plan pagado está activado. Falta autorizar el nuevo débito automático en Mercado Pago; el débito anterior está pausado.'
                        : data.pending.mode === 'expiry'
                          ? data.pending.provider_synced
                            ? `Cambio autorizado para el vencimiento del ${day(data.pending.previous_end)}. El plan actual se mantiene hasta entonces; el nuevo período se activa al confirmarse el cobro.`
                            : `Autorizá el nuevo débito para programar el cambio al vencimiento del ${day(data.pending.previous_end)}. Hasta completar esa autorización, tu abono anterior sigue renovándose normalmente.`
                          : 'Cambio pagado. Se activará al agotar el cupo de tu plan o al terminar el ciclo vigente. Tus reportes extra se conservan.'}
                </p>
                {data.pending.renewal_init_point &&
                  !data.pending.provider_synced &&
                  ['scheduled', 'syncing'].includes(data.pending.status) && (
                    <Button
                      className='mt-3'
                      disabled={busy}
                      onClick={authorizeRenewal}
                    >
                      Autorizar nuevo débito
                    </Button>
                  )}
                {data.pending.status === 'checkout' && (
                  <Button
                    className='mt-3'
                    onClick={() =>
                      setChoice({
                        request_id: data.pending!.id,
                        plan_id: data.pending!.target_plan.id,
                        title: data.pending!.target_plan.title,
                        amount: data.pending!.target_plan.unit_price,
                        timing: 'Completá el pago del cambio pendiente.',
                        scheduled: false,
                      })
                    }
                  >
                    Continuar pago
                  </Button>
                )}
                {['checkout', 'scheduled'].includes(data.pending.status) && (
                  <Button
                    variant='ghost'
                    className='mt-3'
                    disabled={busy}
                    onClick={cancelPending}
                  >
                    Cancelar cambio pendiente
                  </Button>
                )}
                {failure && !choice && (
                  <p role='alert' className='mt-2 text-destructive'>
                    {failure}
                  </p>
                )}
              </div>
            )}
            <section>
              <h2 className='mb-3 flex items-center gap-2 font-semibold'>
                <ArrowRightLeft className='h-4 w-4' /> Cambiar de plan
              </h2>
              <div className='grid gap-3 md:grid-cols-2'>
                {data.plans
                  .filter((p) => p.id !== data.current_plan.id)
                  .map((plan) => {
                    const upgrade =
                      plan.max_reports_month >
                      data.current_plan.max_reports_month
                    const timing = upgrade
                      ? `Pagás ahora. Se activa al agotar el cupo de tu plan o al terminar el ciclo; recibís el cupo completo del nuevo plan. Tus reportes extra se conservan. El nuevo período se suma al vencimiento actual. Después autorizás el nuevo débito automático desde este panel; el anterior queda pausado.`
                      : `Autorizás el nuevo débito en Mercado Pago para el ${day(data.subscription_end)}. Conservás tu plan actual y el nuevo importe se cobra al vencimiento.`
                    return (
                      <div
                        key={plan.id}
                        className='flex flex-col gap-2 rounded-lg border p-4'
                      >
                        <h3 className='font-semibold'>{plan.title}</h3>
                        <p>
                          {money(plan.unit_price)}{' '}
                          <span className='text-sm text-muted-foreground'>
                            / {plan.months === 1 ? '30 días' : '6 meses'}
                          </span>
                        </p>
                        <p className='text-sm'>
                          {plan.max_reports_month} reportes por ciclo
                          {plan.months === 6 ? ' mensual' : ''}
                        </p>
                        <p className='flex-1 text-sm text-muted-foreground'>
                          {timing}
                        </p>
                        <Button
                          variant='outline'
                          disabled={!!data.pending}
                          onClick={() => {
                            setFailure('')
                            setChoice({
                              request_id: crypto.randomUUID(),
                              plan_id: plan.id,
                              title: plan.title,
                              amount: plan.unit_price,
                              timing,
                              scheduled: !upgrade,
                            })
                          }}
                        >
                          {upgrade ? 'Elegir y pagar' : 'Programar cambio'}
                        </Button>
                      </div>
                    )
                  })}
              </div>
            </section>
            <section>
              <h2 className='mb-1 flex items-center gap-2 font-semibold'>
                <Plus className='h-4 w-4' /> Reportes extra
              </h2>
              <p className='mb-3 text-sm text-muted-foreground'>
                Al precio por reporte que pagaste en tu plan. No vencen y se
                conservan al renovar o cambiar de abono. Se usan después del
                cupo del plan y requieren una suscripción vigente.
              </p>
              <p className='mb-3 text-sm font-medium'>
                Saldo comprado sin vencimiento: {data.quota.pack_remaining ?? 0}{' '}
                reportes
              </p>
              <div className='grid gap-3 sm:grid-cols-3'>
                {data.packs.map((pack) => (
                  <div
                    key={pack.reports}
                    className='space-y-3 rounded-lg border p-4'
                  >
                    <p className='font-semibold'>{pack.reports} reportes</p>
                    <p className='text-xl font-bold'>{money(pack.amount)}</p>
                    <Button
                      className='w-full'
                      disabled={data.pending?.status === 'syncing'}
                      onClick={() => {
                        setFailure('')
                        setChoice({
                          request_id: crypto.randomUUID(),
                          reports: pack.reports,
                          title: `${pack.reports} reportes extra`,
                          amount: pack.amount,
                          scheduled: false,
                          timing:
                            'Se suman al confirmarse el pago y no vencen. Se conservan al renovar o cambiar de abono. No cambian tu fecha de renovación y requieren una suscripción vigente.',
                        })
                      }}
                    >
                      Comprar paquete
                    </Button>
                  </div>
                ))}
              </div>
              {data.pending?.status === 'syncing' && (
                <p className='mt-2 text-sm text-muted-foreground'>
                  Esperá a que se confirme el cambio antes de comprar otro
                  paquete.
                </p>
              )}
            </section>
          </>
        )}
      </CardContent>
      <AlertDialog
        open={!!choice}
        onOpenChange={(open) => {
          if (!open && !busy) setChoice(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{choice?.title}</AlertDialogTitle>
            <AlertDialogDescription>{choice?.timing}</AlertDialogDescription>
          </AlertDialogHeader>
          <p className='font-semibold'>
            {choice?.scheduled ? 'Importe al renovar' : 'Total a pagar'}:{' '}
            {choice && money(choice.amount)}
          </p>
          {!choice?.scheduled && (
            <p className='text-sm text-muted-foreground'>
              El saldo se acredita cuando confirmamos el pago con Mercado Pago.
              Volver del checkout no confirma la compra.
            </p>
          )}
          {failure && (
            <p role='alert' className='text-destructive'>
              {failure}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Volver</AlertDialogCancel>
            <Button onClick={confirm} disabled={busy}>
              {busy && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {choice?.scheduled
                ? 'Confirmar programación'
                : 'Ir a Mercado Pago'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
