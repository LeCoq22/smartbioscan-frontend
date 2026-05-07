import { Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { CuentaSuspendida } from '@/components/layout/cuenta-suspendida'
import { PantallaMantenimiento } from '@/components/layout/pantalla-mantenimiento'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  const { data, isLoading } = useQuery({
    queryKey: ['session-checks'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return { suspended: false, maintenance: false, maintenanceMessage: '', isAdmin: false }

      const [nutriRes, settingsRes] = await Promise.all([
        supabase.from('nutris').select('is_suspended, role').eq('id', session.user.id).single(),
        supabase.from('app_settings').select('is_maintenance, maintenance_message').eq('id', 1).single(),
      ])

      return {
        suspended: nutriRes.data?.is_suspended === true,
        isAdmin: nutriRes.data?.role === 'admin',
        maintenance: settingsRes.data?.is_maintenance ?? false,
        maintenanceMessage: settingsRes.data?.maintenance_message ?? 'Estamos haciendo mejoras. Volvemos en unos minutos.',
      }
    },
    staleTime: 30 * 1000,
  })

  if (isLoading) {
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (data?.suspended && !data?.isAdmin) return <CuentaSuspendida />
  if (data?.maintenance && !data?.isAdmin) return <PantallaMantenimiento message={data.maintenanceMessage} />

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset
            className={cn(
              '@container/content',
              'has-data-[layout=fixed]:h-svh',
              'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
            )}
          >
            {children ?? <Outlet />}
          </SidebarInset>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
