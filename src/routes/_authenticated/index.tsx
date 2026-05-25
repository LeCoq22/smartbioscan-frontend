import { createFileRoute, redirect } from '@tanstack/react-router'
import { Dashboard } from '@/features/dashboard'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: nutri } = await supabase
      .from('nutris')
      .select('role')
      .eq('id', user.id)
      .single()

    if (nutri?.role === 'admin') {
      throw redirect({ to: '/admin' })
    }
  },
  component: Dashboard,
})
