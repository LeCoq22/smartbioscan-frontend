import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection
      title='Mi cuenta'
      desc='Personalizá cómo aparecés en los reportes que generás para tus pacientes.'
    >
      <AccountForm />
    </ContentSection>
  )
}
