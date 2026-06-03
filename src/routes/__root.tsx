import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { toast } from 'sonner'
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
    pathname.startsWith('/planes/') ||
    pathname === '/set-password' ||
    pathname === '/forgot-password'
  )
}

function RootComponent() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useInactivityLogout(!!session)

  useEffect(() => {
    let cancelled = false

    async function validateAndSetSession(newSession: Session | null) {
      if (cancelled) return
      if (!newSession) {
        setSession(null)
        return
      }
      try {
        const { data: nutri, error } = await supabase
          .from('nutris')
          .select('id, is_suspended')
          .eq('id', newSession.user.id)
          .maybeSingle()

        if (error) {
          console.error('Error validando nutri:', error)
          setSession(newSession) // fail-open: dejar pasar si hay error de red
          return
        }

        if (!nutri) {
          // Usuario autenticado pero sin fila en nutris (probablemente OAuth orphan)
          console.warn('Auth user sin fila en nutris — sign out + redirect')
          try {
            await supabase.auth.signOut()
          } catch {
            /* noop */
          }
          toast.error('Tu email no está aprobado para acceder a SmartBioScan', {
            description: 'Si querés sumarte, anotate en la waitlist desde smartbioscan.com',
            duration: 15000,
          })
          setSession(null)
          return
        }

        if (nutri.is_suspended) {
          try {
            await supabase.auth.signOut()
          } catch {
            /* noop */
          }
          toast.error('Tu cuenta está suspendida', {
            description: 'Contactanos a equipo@mail.smartbioscan.com',
            duration: 15000,
          })
          setSession(null)
          return
        }

        setSession(newSession)
      } catch (e) {
        console.error('Error inesperado validando nutri:', e)
        setSession(newSession) // fail-open
      }
    }

    const timeoutId = setTimeout(() => {
      if (cancelled) return
      // getSession() colgado >5s → sesión corrupta en storage
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
          .forEach((k) => localStorage.removeItem(k))
      } catch {
        /* noop */
      }
      try {
        fetch(`${import.meta.env.VITE_API_URL}/errors/frontend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'timeout:getSession',
            source: 'hang',
            url: window.location.href,
            user_agent: navigator.userAgent,
            context: { where: 'RootComponent.getSession' },
          }),
        }).catch(() => {})
      } catch {
        /* noop */
      }
      setSession(null)
    }, 5000)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return
        clearTimeout(timeoutId)
        void validateAndSetSession(data.session)
      })
      .catch(() => {
        if (cancelled) return
        clearTimeout(timeoutId)
        setSession(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void validateAndSetSession(newSession)
    })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
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
