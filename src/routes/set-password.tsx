import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SmartBioScanLogo } from '@/assets/smartbioscan-logo'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/password-input'
import { CheckCircle2, XCircle, Circle } from 'lucide-react'

export const Route = createFileRoute('/set-password')({
  validateSearch: z.object({ token: z.string().catch('') }),
  component: SetPasswordPage,
})

type PageState =
  | { status: 'loading' }
  | { status: 'invalid'; reason: string }
  | { status: 'ready'; email: string; full_name: string }
  | { status: 'success' }

const checks = [
  { label: '8 caracteres mínimo', test: (p: string) => p.length >= 8 },
  { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un número', test: (p: string) => /[0-9]/.test(p) },
]

const INVALID_MESSAGES: Record<string, { title: string; body: string }> = {
  not_found: {
    title: 'Link inválido',
    body: 'Este link de invitación no existe. Si creés que es un error, contactá al equipo de SmartBioScan.',
  },
  already_used: {
    title: 'Link ya utilizado',
    body: 'Ya estableciste tu contraseña con este link. Iniciá sesión normalmente o usá "¿Olvidaste tu contraseña?" si necesitás restablecerla.',
  },
  expired: {
    title: 'Link vencido',
    body: 'Este link de invitación venció (tenía 7 días de validez). Contactá al equipo para que te envíen uno nuevo.',
  },
}

function SetPasswordPage() {
  const navigate = useNavigate()
  const { token } = Route.useSearch()

  const [state, setState] = useState<PageState>(() =>
    token ? { status: 'loading' } : { status: 'invalid', reason: 'not_found' }
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/validate-token?token=${encodeURIComponent(token)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setState({ status: 'ready', email: data.email, full_name: data.full_name })
        } else {
          setState({ status: 'invalid', reason: data.reason ?? 'not_found' })
        }
      })
      .catch(() => setState({ status: 'invalid', reason: 'not_found' }))
  }, [token])

  const allChecksPassed = checks.every((c) => c.test(password))
  const passwordsMatch = password === confirm && confirm.length > 0
  const canSubmit = allChecksPassed && passwordsMatch && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/set-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.detail ?? 'Ocurrió un error. Intentá de nuevo.')
        setSubmitting(false)
        return
      }

      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
        navigate({ to: '/', replace: true })
      } else {
        setState({ status: 'success' })
      }
    } catch {
      setSubmitError('Error de conexión. Revisá tu internet e intentá de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-svh items-center justify-center bg-background p-4'>
      <div className='w-full max-w-sm space-y-6'>

        <div className='flex flex-col items-center gap-3'>
          <SmartBioScanLogo className='h-16 w-auto' />
          <h1 className='text-xl font-semibold tracking-tight'>
            Establecer contraseña
          </h1>
        </div>

        {state.status === 'loading' && (
          <div className='flex justify-center py-8'>
            <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          </div>
        )}

        {state.status === 'invalid' && (
          <InvalidCard reason={state.reason} />
        )}

        {state.status === 'ready' && (
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-1'>
              <p className='text-sm text-muted-foreground'>
                Creando contraseña para
              </p>
              <p className='font-medium text-sm'>{state.email}</p>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium leading-none'>
                Contraseña
              </label>
              <PasswordInput
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='new-password'
              />
            </div>

            <div className='space-y-1.5'>
              {checks.map((c) => {
                const ok = c.test(password)
                return (
                  <div key={c.label} className='flex items-center gap-2 text-sm'>
                    {password.length === 0 ? (
                      <Circle className='h-3.5 w-3.5 text-muted-foreground/50' />
                    ) : ok ? (
                      <CheckCircle2 className='h-3.5 w-3.5 text-green-500' />
                    ) : (
                      <XCircle className='h-3.5 w-3.5 text-destructive' />
                    )}
                    <span
                      className={
                        password.length === 0
                          ? 'text-muted-foreground'
                          : ok
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-destructive'
                      }
                    >
                      {c.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium leading-none'>
                Confirmar contraseña
              </label>
              <PasswordInput
                placeholder='••••••••'
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete='new-password'
              />
              {confirm.length > 0 && (
                <p
                  className={`text-xs ${passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                >
                  {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            {submitError && (
              <p className='text-sm text-destructive'>{submitError}</p>
            )}

            <Button className='w-full' disabled={!canSubmit} type='submit'>
              {submitting ? 'Guardando…' : 'Establecer contraseña'}
            </Button>
          </form>
        )}

        {state.status === 'success' && (
          <div className='space-y-4 text-center'>
            <CheckCircle2 className='mx-auto h-12 w-12 text-green-500' />
            <div className='space-y-1'>
              <p className='font-semibold'>¡Contraseña establecida!</p>
              <p className='text-sm text-muted-foreground'>
                Ya podés iniciar sesión con tu email y la contraseña que elegiste.
              </p>
            </div>
            <Button className='w-full' onClick={() => navigate({ to: '/', replace: true })}>
              Ir al panel
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}

function InvalidCard({ reason }: { reason: string }) {
  const msg = INVALID_MESSAGES[reason] ?? INVALID_MESSAGES['not_found']
  return (
    <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2'>
      <div className='flex items-center gap-2'>
        <XCircle className='h-5 w-5 text-destructive flex-shrink-0' />
        <p className='font-semibold text-destructive'>{msg.title}</p>
      </div>
      <p className='text-sm text-muted-foreground leading-relaxed'>{msg.body}</p>
    </div>
  )
}
