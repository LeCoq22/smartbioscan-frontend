import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminPanel } from '@/features/admin'

export const Route = createFileRoute('/_authenticated/admin')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === 'string' ? search.tab : 'waitlist',
  }),
  component: AdminRoute,
})

function AdminRoute() {
  const navigate = useNavigate()
  const { tab } = Route.useSearch()

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return null
      const { data } = await supabase
        .from('nutris')
        .select('role')
        .eq('id', session.user.id)
        .single()
      return data?.role ?? null
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!isLoading && role !== 'admin') {
      void navigate({ to: '/' })
    }
  }, [isLoading, role, navigate])

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center py-24'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (role !== 'admin') return null

  return (
    <AdminPanel
      tab={tab}
      onTabChange={(t) => void navigate({ search: (prev) => ({ ...prev, tab: t }) })}
    />
  )
}
