import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings2,
  HelpCircle,
} from 'lucide-react'
import { SmartBioScanIcon } from '@/assets/smartbioscan-logo'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: 'Nutri',
    email: 'nutri@smartbioscan.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'SmartBioScan',
      logo: SmartBioScanIcon,
      plan: 'Panel del Nutri',
    },
  ],
  navGroups: [
    {
      title: 'Principal',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Pacientes',
          url: '/patients',
          icon: Users,
        },
        {
          title: 'Reportes',
          url: '/reports',
          icon: FileText,
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        {
          title: 'Ajustes',
          icon: Settings2,
          items: [
            { title: 'Perfil', url: '/settings' },
            { title: 'Cuenta', url: '/settings/account' },
            { title: 'Apariencia', url: '/settings/appearance' },
          ],
        },
        {
          title: 'Ayuda',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
