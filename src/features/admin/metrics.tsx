import { Users, FileText, Clock, BarChart2, UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MetricsSection() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const [nutrisRes, patientsRes, reportsRes, waitlistRes, nutrisMesRes] =
        await Promise.all([
          supabase
            .from('nutris')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .neq('role', 'admin'),
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }),
          supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('nutris')
            .select('reports_this_month')
            .eq('subscription_status', 'active')
            .neq('role', 'admin'),
        ])

      const reportesEsteMes = (nutrisMesRes.data ?? []).reduce(
        (acc, n) => acc + (n.reports_this_month ?? 0),
        0
      )

      return {
        nutrisActivos: nutrisRes.count ?? 0,
        pacientes: patientsRes.count ?? 0,
        reportesTotal: reportsRes.count ?? 0,
        waitlistPendientes: waitlistRes.count ?? 0,
        reportesEsteMes,
      }
    },
  })

  const cards = [
    { label: 'Nutris activos', value: metrics?.nutrisActivos, icon: Users },
    { label: 'Pacientes', value: metrics?.pacientes, icon: UserCheck },
    { label: 'Reportes totales', value: metrics?.reportesTotal, icon: FileText },
    { label: 'Waitlist pendientes', value: metrics?.waitlistPendientes, icon: Clock },
    { label: 'Reportes este mes', value: metrics?.reportesEsteMes, icon: BarChart2 },
  ]

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{label}</CardTitle>
            <Icon className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>
              {isLoading ? '…' : (value ?? 0)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
