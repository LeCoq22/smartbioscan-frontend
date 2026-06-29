import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Users, FileText, CalendarCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'

type NutriStats = {
  subscription_end: string | null
  subscription_type: string | null
  subscription_start: string | null
  reports_this_month: number | null
  max_reports_month: number | null
  reports_month_reset: string | null
}

// ── Helpers de fecha (date-only, sin desfase de timezone) ──
function parseDateOnly(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfToday(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function addMonths(d: Date, months: number): Date {
  const total = d.getMonth() + months
  const year = d.getFullYear() + Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(d.getDate(), lastDay))
}

// Espejo de public.cupo_cycle_start: aniversario mensual de `start` más reciente <= `today`.
function cupoCycleStart(start: Date, today: Date): Date {
  let n =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth())
  while (n > 0 && addMonths(start, n) > today) n--
  return addMonths(start, n)
}

// Consumo EFECTIVO del período: si cruzó el aniversario y aún no generó, el contador
// en la columna puede estar "stale". Replica la lógica del gate (solo monthly/semestral
// resetean por aniversario; el resto acumula).
function effectiveReportsThisMonth(n: NutriStats | null | undefined): number {
  if (!n) return 0
  const used = n.reports_this_month ?? 0
  const resetsMonthly =
    n.subscription_type === 'monthly' || n.subscription_type === 'semestral'
  if (resetsMonthly && n.subscription_start) {
    const cs = cupoCycleStart(parseDateOnly(n.subscription_start), startOfToday())
    if (n.reports_month_reset == null || parseDateOnly(n.reports_month_reset) < cs) {
      return 0
    }
  }
  return used
}

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No autenticado')
      const nutriId = session.user.id

      const [patientsRes, nutriRes] = await Promise.all([
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('nutri_id', nutriId),
        supabase
          .from('nutris')
          .select(
            'subscription_end, subscription_type, subscription_start, reports_this_month, max_reports_month, reports_month_reset'
          )
          .eq('id', nutriId)
          .single(),
      ])
      const n = nutriRes.data as NutriStats | null
      return {
        patients: patientsRes.count ?? 0,
        reportsThisMonth: effectiveReportsThisMonth(n),
        maxReportsMonth: n?.max_reports_month ?? null,
        subscriptionEnd: n?.subscription_end ?? null,
      }
    },
  })
}

function formatSubscription(dateStr: string | null) {
  if (!dateStr) return '—'
  return parseDateOnly(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data, isLoading } = useDashboardStats()

  function clickableCardProps(to: string) {
    return {
      role: 'button' as const,
      tabIndex: 0,
      className:
        'cursor-pointer transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      onClick: () => navigate({ to }),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate({ to })
        }
      },
    }
  }

  return (
    <>
      <Header>
        <ThemeSwitch />
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground text-sm'>Panel del nutricionista</p>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Card {...clickableCardProps('/patients')}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Pacientes cargados
              </CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {isLoading ? '—' : data?.patients}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>Ver pacientes →</p>
            </CardContent>
          </Card>

          <Card {...clickableCardProps('/reports')}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Reportes generados
              </CardTitle>
              <FileText className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {isLoading || !data
                  ? '—'
                  : data.maxReportsMonth != null
                    ? `${data.reportsThisMonth} / ${data.maxReportsMonth}`
                    : data.reportsThisMonth}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Consumo del período · Ver reportes →
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Vigencia de suscripción
              </CardTitle>
              <CalendarCheck className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {isLoading ? '—' : formatSubscription(data?.subscriptionEnd ?? null)}
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
