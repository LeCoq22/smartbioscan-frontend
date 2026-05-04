import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SmartBioScanLogo } from '@/assets/smartbioscan-logo'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Please enter your email' })
    .email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(1, { message: 'Please enter your password' })
    .min(7, { message: 'Password must be at least 7 characters long' }),
})

const GoogleIcon = () => (
  <svg role='img' viewBox='0 0 24 24' className='mr-2 h-4 w-4' fill='currentColor'>
    <path d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z' />
  </svg>
)

const FacebookIcon = () => (
  <svg role='img' viewBox='0 0 24 24' className='mr-2 h-4 w-4' fill='currentColor'>
    <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
  </svg>
)

export function Login() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/auth/login-hint`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email }),
          }
        )
        if (res.ok) {
          const { hint } = await res.json()
          if (hint === 'not_registered') {
            toast.error('Email no registrado', {
              description: 'No encontramos una cuenta con ese email. ¿Querés registrarte?',
            })
            setIsLoading(false)
            return
          }
        }
      } catch {
        // fallback to generic
      }
      toast.error('Credenciales incorrectas', {
        description: 'Revisá tu email y contraseña e intentá de nuevo.',
      })
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    navigate({ to: '/', replace: true })
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setOauthLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    })
    setOauthLoading(null)
    if (error) {
      toast.error(`${provider} sign-in failed`, { description: error.message })
    }
  }

  return (
    <div className='flex min-h-svh items-center justify-center bg-background p-4'>
      <div className='w-full max-w-sm space-y-6'>

        {/* Logo + title */}
        <div className='flex flex-col items-center gap-3'>
          <SmartBioScanLogo className='h-16 w-auto' />
          <h1 className='text-xl font-semibold tracking-tight'>
            Panel de Nutricionistas
          </h1>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='w-full'>
            <div className='grid gap-2 w-full'>

              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='name@example.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <div className='flex items-center justify-between'>
                      <FormLabel>Contraseña</FormLabel>
                      <Link
                        to='/forgot-password'
                        className='text-sm font-medium text-muted-foreground hover:opacity-75'
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput placeholder='••••••••' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className='mt-2' disabled={isLoading} type='submit'>
                {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </Button>

              <div className='relative my-2'>
                <div className='absolute inset-0 flex items-center'>
                  <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                  <span className='bg-background px-2 text-muted-foreground'>o</span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <Button
                  variant='outline'
                  type='button'
                  disabled={oauthLoading !== null}
                  onClick={() => handleOAuth('google')}
                >
                  <GoogleIcon />
                  {oauthLoading === 'google' ? 'Redirigiendo…' : 'Google'}
                </Button>

                <Button
                  variant='outline'
                  type='button'
                  disabled={oauthLoading !== null}
                  onClick={() => handleOAuth('facebook')}
                >
                  <FacebookIcon />
                  {oauthLoading === 'facebook' ? 'Redirigiendo…' : 'Facebook'}
                </Button>
              </div>

            </div>
          </form>
        </Form>

        {/* Registration link */}
        <p className='text-center text-sm text-muted-foreground'>
          ¿No tenés cuenta?{' '}
          <a
            href='/planes'
            className='font-medium underline underline-offset-4 hover:text-primary'
          >
            Registrate gratis
          </a>
        </p>

      </div>
    </div>
  )
}
