import { useState } from 'react'
import { SmartBioScanLogo } from '@/assets/smartbioscan-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (authError) {
      setError('Email o contraseña incorrectos')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  async function handleFacebook() {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  return (
    <div className='flex min-h-svh items-center justify-center bg-background p-4'>
      <div className='w-full max-w-sm space-y-6'>
        <div className='flex flex-col items-center gap-3'>
          <SmartBioScanLogo className='h-16 w-auto' />
          <h1 className='text-xl font-semibold tracking-tight'>
            Panel de Nutricionistas
          </h1>
        </div>

        <div className='space-y-3'>
          <button
            type='button'
            onClick={handleGoogle}
            className='flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1'
          >
            <svg width='18' height='18' viewBox='0 0 18 18' aria-hidden='true'>
              <path
                fill='#4285F4'
                d='M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z'
              />
              <path
                fill='#34A853'
                d='M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z'
              />
              <path
                fill='#FBBC05'
                d='M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z'
              />
              <path
                fill='#EA4335'
                d='M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z'
              />
            </svg>
            Continuar con Google
          </button>

          <button
            type='button'
            onClick={handleFacebook}
            className='flex w-full items-center justify-center gap-3 rounded-md bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-offset-1'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='white'
              aria-hidden='true'
            >
              <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
            </svg>
            Continuar con Facebook
          </button>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex-1 border-t border-border' />
          <span className='text-sm text-muted-foreground'>o</span>
          <div className='flex-1 border-t border-border' />
        </div>

        <form onSubmit={handleEmailLogin} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder='nombre@ejemplo.com'
              autoComplete='email'
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password'>Contraseña</Label>
            <Input
              id='password'
              type='password'
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              placeholder='••••••••'
              autoComplete='current-password'
              required
            />
          </div>
          {error && <p className='text-sm text-destructive'>{error}</p>}
          <Button type='submit' className='w-full' disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  )
}
