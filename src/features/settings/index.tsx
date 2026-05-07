import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { AccountForm } from './account/account-form'

export function Settings() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user.email ?? null)
    })
  }, [])

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Mi cuenta
          </h1>
          <p className='text-muted-foreground text-sm'>
            Configurá tu perfil y preferencias.
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />

        <div className='max-w-xl space-y-6'>
          <div className='space-y-1'>
            <p className='text-sm font-medium leading-none'>Email</p>
            <p className='text-sm text-muted-foreground'>
              {email ?? '—'}
            </p>
          </div>

          <Separator />

          <AccountForm />
        </div>
      </Main>
    </>
  )
}
