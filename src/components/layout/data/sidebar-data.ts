import {
  LayoutDashboard,
  Users,
  FileText,
  Settings2,
  HelpCircle,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Nutri',
    email: 'nutri@smartbioscan.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [],
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
          title: 'Mi cuenta',
          url: '/settings',
          icon: Settings2,
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
