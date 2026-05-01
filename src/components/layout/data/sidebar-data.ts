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
