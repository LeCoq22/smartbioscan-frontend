import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

const API_URL = import.meta.env.VITE_API_URL as string

export function Planes() {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)

  async function handleChoosePlan(apiPlanId: string) {
    setLoadingPlanId(apiPlanId)
    try {
      const res = await fetch(`${API_URL}/payments/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: apiPlanId, user_email: '' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? `Error ${res.status}`)
      }
      const data = await res.json()
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.init_point
    } catch (_e) {
      toast.error('No se pudo iniciar el pago. Intentá de nuevo.')
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

        <div className='grid grid-cols-1 gap-6 pt-5 sm:grid-cols-2 xl:grid-cols-4'>
          {plans.map((plan) => (
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
                </CardFooter>
              </Card>
            </div>
          ))}
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
