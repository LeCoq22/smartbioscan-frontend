import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL as string

const signatureSchema = z.object({
  display_signature: z
    .string()
    .min(1, 'La firma no puede estar vacía.')
    .max(120, 'Máximo 120 caracteres.')
    .refine((v) => v.trim().length > 0, 'La firma no puede ser solo espacios.')
    .refine((v) => !/[\n\r]/.test(v), 'La firma no puede tener saltos de línea.'),
})

type SignatureFormValues = z.infer<typeof signatureSchema>

export function AccountForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureSchema),
    defaultValues: { display_signature: '' },
  })

  const displaySignature = form.watch('display_signature')

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setIsLoading(false)
          return
        }
        const res = await fetch(`${API_URL}/api/nutris/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'X-Nutri-Id': session.user.id,
          },
        })
        if (!res.ok) throw new Error('Error al cargar el perfil')
        const data: { display_signature?: string; full_name?: string } =
          await res.json()
        form.reset({
          display_signature:
            data.display_signature ?? data.full_name ?? '',
        })
      } catch {
        toast.error('No se pudo cargar el perfil.')
      } finally {
        setIsLoading(false)
      }
    }
    void loadProfile()
  }, [form])

  async function onSubmit(values: SignatureFormValues) {
    setIsSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')
      const res = await fetch(`${API_URL}/api/nutris/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Nutri-Id': session.user.id,
        },
        body: JSON.stringify({
          display_signature: values.display_signature,
        }),
      })
      if (!res.ok) {
        const err: { detail?: string } = await res.json()
        throw new Error(err.detail ?? 'Error al guardar')
      }
      toast.success('Firma actualizada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>Cargando perfil…</p>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='display_signature'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cómo aparezco en los reportes</FormLabel>
              <FormControl>
                <Input
                  placeholder='Ej: Lic. Diana Makk - Nutricionista'
                  maxLength={120}
                  {...field}
                />
              </FormControl>
              <div className='flex justify-end'>
                <span className='text-xs text-muted-foreground'>
                  {field.value.length} / 120
                </span>
              </div>
              <FormDescription>
                Esta línea es lo que verán tus pacientes en el encabezado del
                reporte. Por ejemplo:{' '}
                <em>&quot;Lic. Diana Makk - Nutricionista&quot;</em> o{' '}
                <em>
                  &quot;Lic. García Paz - Centro de Nutrición Recoleta&quot;
                </em>
                .
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {displaySignature.trim() && (
          <div className='rounded-md border bg-muted/40 px-4 py-3 space-y-1'>
            <p className='text-xs text-muted-foreground'>
              Vista previa en el reporte:
            </p>
            <p className='text-sm font-medium'>{displaySignature.trim()}</p>
          </div>
        )}

        <Button type='submit' disabled={isSaving}>
          {isSaving ? 'Guardando…' : 'Guardar firma'}
        </Button>
      </form>
    </Form>
  )
}
