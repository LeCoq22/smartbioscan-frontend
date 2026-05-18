import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SmartBioScanLogo } from '@/assets/smartbioscan-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const plans = [
  {
    apiPlanId: 'bioscan_basico_mensual',
    name: 'BioScan Básico',
    period: 'Mensual',
    reports: 30,
    monthlyPrice: '$24.500/mes',
    billingNote: null,
    pricePerReport: '$817',
    savings: null,
    featured: false,
  },
  {
    apiPlanId: 'bioscan_plus_mensual',
    name: 'BioScan Plus',
    period: 'Mensual',
    reports: 100,
    monthlyPrice: '$55.000/mes',
    billingNote: null,
    pricePerReport: '$550',
    savings: null,
    featured: false,
  },
  {
    apiPlanId: 'bioscan_basico_semestral',
    name: 'BioScan Básico',
    period: 'Semestral',
    reports: 30,
    monthlyPrice: '$20.400/mes',
    billingNote: '$122.400 cada 6 meses',
    pricePerReport: '$680',
    savings: 'Ahorrás $24.600',
    featured: true,
  },
  {
    apiPlanId: 'bioscan_plus_semestral',
    name: 'BioScan Plus',
    period: 'Semestral',
    reports: 100,
    monthlyPrice: '$45.800/mes',
    billingNote: '$274.800 cada 6 meses',
    pricePerReport: '$458',
    savings: 'Ahorrás $55.200',
    featured: false,
  },
]

interface NutriSubscription {
  subscription_status: string | null
  subscription_type: string | null
  subscription_end: string | null
  subscription_next_billing_date: string | null
  max_reports_month: number | null
}

const API_URL = import.meta.env.VITE_API_URL as string

const PAID_TYPES = ['monthly', 'semestral']

function getActivePlanId(subType: string, maxReports: number): string | null {
  if (!PAID_TYPES.includes(subType)) return null
  const tier = maxReports >= 100 ? 'plus' : 'basico'
  const period = subType === 'semestral' ? 'semestral' : 'mensual'
  return `bioscan_${tier}_${period}`
}

function getPlanDisplayName(subType: string, maxReports: number): string {
  const tier = maxReports >= 100 ? 'Plus' : 'Básico'
  const period = subType === 'semestral' ? 'Semestral' : 'Mensual'
  return `BioScan ${tier} ${period}`
}

export function Planes() {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<NutriSubscription | null>(null)

  useEffect(() => {
    // Limpiar ?status de MP y mostrar toast correspondiente
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    if (status === 'success') {
      toast.success('¡Pago confirmado! Tu suscripción está activa.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (status === 'pending') {
      toast.warning('Tu pago está siendo procesado. Te avisaremos cuando se confirme.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (status === 'failure') {
      toast.error('El pago no pudo procesarse. Intentá de nuevo.')
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Cargar suscripción si hay sesión activa
    async function loadSubscription() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(`${API_URL}/api/nutris/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const data: NutriSubscription & Record<string, unknown> = await res.json()
        setSubscription({
          subscription_status: data.subscription_status ?? null,
          subscription_type: data.subscription_type ?? null,
          subscription_end: data.subscription_end ?? null,
          subscription_next_billing_date: data.subscription_next_billing_date ?? null,
          max_reports_month: data.max_reports_month ?? null,
        })
      } catch {
        // No bloqueamos la pantalla si falla cargar la suscripción
      }
    }
    void loadSubscription()
  }, [])

  const hasActiveSub =
    subscription !== null &&
    PAID_TYPES.includes(subscription.subscription_type ?? '') &&
    subscription.subscription_status === 'active' &&
    subscription.subscription_end !== null &&
    new Date(subscription.subscription_end) > new Date()

  const activePlanId =
    hasActiveSub &&
    subscription?.subscription_type &&
    subscription?.max_reports_month !== null
      ? getActivePlanId(
          subscription.subscription_type,
          subscription.max_reports_month!,
        )
      : null

  const bannerText = (() => {
    if (!hasActiveSub || !subscription?.subscription_type || !subscription?.max_reports_month)
      return null
    const planName = getPlanDisplayName(
      subscription.subscription_type,
      subscription.max_reports_month,
    )
    const dateSource =
      subscription.subscription_next_billing_date ?? subscription.subscription_end
    const dateStr = dateSource
      ? new Date(dateSource).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null
    return dateStr
      ? `Tu plan actual: ${planName} — próximo cobro: ${dateStr}`
      : `Tu plan actual: ${planName}`
  })()

  async function handleChoosePlan(apiPlanId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      toast.error('Tenés que iniciar sesión para suscribirte.', {
        action: {
          label: 'Ir al login',
          onClick: () => {
            window.location.href = '/sign-in'
          },
        },
      })
      return
    }

    setLoadingPlanId(apiPlanId)
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan_id: apiPlanId }),
      })
      if (!res.ok) {
        const err: { detail?: string } = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `Error ${res.status}`)
      }
      const data: { init_point: string } = await res.json()
      window.location.href = data.init_point
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'No se pudo iniciar el pago. Intentá de nuevo.',
      )
      setLoadingPlanId(null)
    }
  }

  return (
    <div className='min-h-svh bg-background px-4 py-12'>
      <div className='mx-auto max-w-5xl space-y-10'>

        <div className='flex flex-col items-center gap-3 text-center'>
          <SmartBioScanLogo className='h-14 w-auto' />
          <h1 className='text-2xl font-bold tracking-tight'>
            Elegí tu plan SmartBioScan
          </h1>
          <p className='text-sm text-muted-foreground'>
            Reportes de composición corporal para tu consultorio
          </p>
        </div>

        {bannerText && (
          <div className='rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm font-medium text-primary'>
            {bannerText}
          </div>
        )}

        <div className='grid grid-cols-1 gap-6 pt-5 sm:grid-cols-2 xl:grid-cols-4'>
          {plans.map((plan) => {
            const isCurrent = plan.apiPlanId === activePlanId
            return (
              <div key={plan.apiPlanId} className='relative'>
                {plan.featured && (
                  <div className='absolute -top-5 left-0 right-0 flex justify-center'>
                    <Badge className='px-4 py-1 text-sm font-semibold shadow-md'>
                      ⭐ Mejor valor
                    </Badge>
                  </div>
                )}
                <Card
                  className={cn(
                    'flex h-full flex-col overflow-hidden',
                    plan.featured
                      ? 'border-primary shadow-lg ring-2 ring-primary'
                      : 'border-border',
                  )}
                >
                  <CardHeader className='pb-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='secondary'>{plan.period}</Badge>
                      {plan.savings && (
                        <Badge
                          variant='outline'
                          className='border-green-600 text-green-600'
                        >
                          {plan.savings}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className='text-base'>{plan.name}</CardTitle>
                    <CardDescription>{plan.reports} reportes/mes</CardDescription>
                  </CardHeader>

                  <CardContent className='flex flex-1 flex-col justify-between gap-4'>
                    <div>
                      <div className='text-4xl font-bold tracking-tight'>
                        {plan.pricePerReport}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        por reporte
                      </div>
                    </div>

                    <div>
                      <div className='font-semibold'>{plan.monthlyPrice}</div>
                      {plan.billingNote && (
                        <div className='text-xs text-muted-foreground'>
                          {plan.billingNote}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter>
                    {isCurrent ? (
                      <Button className='w-full' variant='outline' disabled>
                        Plan actual
                      </Button>
                    ) : (
                      <Button
                        className='w-full'
                        variant={plan.featured ? 'default' : 'outline'}
                        disabled={loadingPlanId !== null}
                        onClick={() => handleChoosePlan(plan.apiPlanId)}
                      >
                        {loadingPlanId === plan.apiPlanId ? (
                          <>
                            <Loader2 className='animate-spin' />
                            Redirigiendo...
                          </>
                        ) : (
                          'Elegir este plan'
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            )
          })}
        </div>

        <p className='text-center text-sm text-muted-foreground'>
          ¿Necesitás más reportes? Podés adquirir packs de 10 reportes
          adicionales al precio por reporte de tu plan actual.
        </p>

        <div className='text-center'>
          <Link to='/'>
            <Button variant='ghost' size='sm' className='text-muted-foreground'>
              ← Ya tengo cuenta, ir al login
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}
