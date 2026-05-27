import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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

const formSchema = z.object({
  email: z.string().email({
    message: 'Ingresá un email válido.',
  }),
})

type ForgotPasswordResponse = {
  ok: boolean
  status: 'sent' | 'not_nutri' | 'suspended'
  message: string
}

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email }),
        }
      )

      if (res.status === 429) {
        toast.error('Demasiadas solicitudes', {
          description: 'Esperá un minuto e intentá de nuevo.',
        })
        setIsLoading(false)
        return
      }

      if (res.status === 400) {
        toast.error('Email inválido', {
          description: 'Revisá el email e intentá de nuevo.',
        })
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        toast.error('Algo salió mal', {
          description: 'Intentá de nuevo en unos segundos.',
        })
        setIsLoading(false)
        return
      }

      const body: ForgotPasswordResponse = await res.json()

      if (body.status === 'sent') {
        toast.success('Email enviado', {
          description: body.message,
          duration: 8000,
        })
        form.reset()
        navigate({ to: '/sign-in' })
      } else if (body.status === 'not_nutri') {
        toast.error('Email no registrado', {
          description: body.message,
          duration: 12000,
        })
      } else if (body.status === 'suspended') {
        toast.error('Cuenta suspendida', {
          description: body.message,
          duration: 12000,
        })
      }
    } catch {
      toast.error('Error de conexión', {
        description: 'No pudimos conectarnos al servidor. Verificá tu conexión e intentá de nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='tu-email@ejemplo.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? (
            <>
              Enviando...
              <Loader2 className='animate-spin' />
            </>
          ) : (
            <>
              Enviar link de recuperación
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
