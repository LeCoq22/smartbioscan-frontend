import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings2,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { SmartBioScanIcon } from '@/assets/smartbioscan-logo'
import { supabase } from '@/lib/supabase'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: role } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
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

  const isAdmin = role === 'admin'

  const navGroups = [
    {
      title: 'Principal',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Pacientes', url: '/patients', icon: Users },
        { title: 'Reportes', url: '/reports', icon: FileText },
        ...(isAdmin ? [{ title: 'Admin', url: '/admin', icon: ShieldCheck }] : []),
      ],
    },
    {
      title: 'Configuración',
      items: [
        {
          title: 'Ajustes',
          icon: Settings2,
          items: [{ title: 'Mi cuenta', url: '/settings' }],
        },
        { title: 'Ayuda', url: '/help-center', icon: HelpCircle },
      ],
    },
  ]

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='pointer-events-none'>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <SmartBioScanIcon className='size-4' />
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>SmartBioScan</span>
                <span className='truncate text-xs'>Panel del Nutricionista</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
