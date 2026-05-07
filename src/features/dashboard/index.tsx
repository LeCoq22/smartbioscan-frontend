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
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No autenticado')
      const nutriId = session.user.id

      const [patientsRes, reportsRes, nutriRes] = await Promise.all([
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('nutri_id', nutriId),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('nutri_id', nutriId),
        supabase
          .from('nutris')
          .select('subscription_until')
          .eq('id', nutriId)
          .single(),
      ])
      return {
        patients: patientsRes.count ?? 0,
        reports: reportsRes.count ?? 0,
        subscriptionUntil: nutriRes.data?.subscription_until ?? null,
      }
    },
  })
}

function formatSubscription(dateStr: string | null) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
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
        <Search />
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
                {isLoading ? '—' : data?.reports}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>Ver reportes →</p>
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
                {isLoading ? '—' : formatSubscription(data?.subscriptionUntil ?? null)}
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
