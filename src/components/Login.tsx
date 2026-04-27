import { useState } from 'react'
import { SmartBioScanLogo } from '@/assets/smartbioscan-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginProps = {
  onSuccess: () => void
}

export function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      sessionStorage.setItem('sbs_auth', 'true')
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className='flex min-h-svh items-center justify-center bg-background p-4'>
      <div className='w-full max-w-sm space-y-8'>
        <div className='flex flex-col items-center gap-4'>
          <SmartBioScanLogo className='h-16 w-auto' />
        </div>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='password'>Contraseña</Label>
            <div className='relative'>
              <Input
                id='password'
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                placeholder='••••••••'
                autoFocus
                className={error ? 'border-destructive' : ''}
              />
              <button
                type='button'
                onClick={() => setShowPassword((v) => !v)}
                className='absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='size-4'>
                    <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
                    <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
                    <line x1='1' y1='1' x2='23' y2='23' />
                  </svg>
                ) : (
                  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='size-4'>
                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                    <circle cx='12' cy='12' r='3' />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <p className='text-sm text-destructive'>Contraseña incorrecta</p>
            )}
          </div>
          <Button type='submit' className='w-full'>
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  )
}
