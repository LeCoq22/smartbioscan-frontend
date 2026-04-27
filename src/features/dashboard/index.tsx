import { useQuery } from '@tanstack/react-query'
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
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const NUTRI_ID = 'e1883327-d219-4ba5-a305-0135efb2ab57'

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats', NUTRI_ID],
    queryFn: async () => {
      const [patientsRes, reportsRes, nutriRes] = await Promise.all([
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('nutri_id', NUTRI_ID),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('nutri_id', NUTRI_ID),
        supabase
          .from('nutris')
          .select('subscription_until')
          .eq('id', NUTRI_ID)
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
  const { data, isLoading } = useDashboardStats()

  return (
    <>
      <Header>
        <Search />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground text-sm'>Panel del nutricionista</p>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <Card>
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
            </CardContent>
          </Card>

          <Card>
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
