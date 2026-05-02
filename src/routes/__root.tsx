import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Login } from '@/components/Login'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { supabase } from '@/lib/supabase'
import { useInactivityLogout } from '@/hooks/use-inactivity-logout'

function isPublicPath(pathname: string) {
  return (
    pathname === '/auth/callback' ||
    pathname === '/planes' ||
    pathname.startsWith('/planes/')
  )
}

function RootComponent() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useInactivityLogout(!!session)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Rutas públicas: bypass completo del chequeo de sesión
  if (!isPublicPath(window.location.pathname)) {
    if (session === undefined) {
      return (
        <div className='flex min-h-svh items-center justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
        </div>
      )
    }
    if (!session) {
      return <Login />
    }
  }

  return (
    <>
      <NavigationProgress />
      <Outlet />
      <Toaster duration={5000} />
      {import.meta.env.MODE === 'development' && (
        <>
          <ReactQueryDevtools buttonPosition='bottom-left' />
          <TanStackRouterDevtools position='bottom-right' />
        </>
      )}
    </>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
