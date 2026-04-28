import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth
      .exchangeCodeForSession(window.location.search)
      .then(({ error }) => {
        if (error) {
          navigate({ to: '/' })
        } else {
          navigate({ to: '/' })
        }
      })
  }, [navigate])

  return (
    <div className='flex min-h-svh items-center justify-center'>
      <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
    </div>
  )
}

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})
