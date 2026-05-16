import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { WaitlistSection } from './waitlist'
import { NutrisSection } from './nutris-list'
import { MetricsSection } from './metrics'
import { CreateNutriSection } from './create-nutri'
import { MaintenanceSection } from './maintenance'
import { RegenerateReportsSection } from './regenerate-reports'

const TABS = [
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'nutris', label: 'Nutris' },
  { value: 'metricas', label: 'Métricas' },
  { value: 'crear', label: 'Crear nutri' },
  { value: 'regenerar', label: 'Regenerar reportes' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
]

interface AdminPanelProps {
  tab: string
  onTabChange: (tab: string) => void
}

export function AdminPanel({ tab, onTabChange }: AdminPanelProps) {
  const activeTab = TABS.some((t) => t.value === tab) ? tab : 'waitlist'

  return (
    <>
      <Header>
        <h1 className='text-base font-semibold'>Panel de administración</h1>
      </Header>
      <Main>
        <Tabs value={activeTab} onValueChange={onTabChange} className='space-y-6'>
          <TabsList>
            {TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value='waitlist'>
            <WaitlistSection />
          </TabsContent>

          <TabsContent value='nutris'>
            <NutrisSection />
          </TabsContent>

          <TabsContent value='metricas'>
            <MetricsSection />
          </TabsContent>

          <TabsContent value='crear'>
            <CreateNutriSection />
          </TabsContent>

          <TabsContent value='regenerar'>
            <RegenerateReportsSection />
          </TabsContent>

          <TabsContent value='mantenimiento'>
            <MaintenanceSection />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
