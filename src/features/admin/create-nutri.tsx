import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EMPTY_FORM = {
  email: '',
  nombre: '',
  apellido: '',
  profesion: '',
  subscription_type: 'mensual',
}

export function CreateNutriSection() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [isPending, setIsPending] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/nutris`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        }
      )
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      toast.success(`Nutri creado, email enviado a ${form.email}`)
      setForm(EMPTY_FORM)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear nutri')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className='max-w-md space-y-4'>
      <div className='space-y-1.5'>
        <Label htmlFor='email'>Email *</Label>
        <Input
          id='email'
          type='email'
          required
          value={form.email}
          onChange={set('email')}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='nombre'>Nombre *</Label>
        <Input
          id='nombre'
          required
          value={form.nombre}
          onChange={set('nombre')}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='apellido'>Apellido</Label>
        <Input
          id='apellido'
          value={form.apellido}
          onChange={set('apellido')}
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='profesion'>Profesión</Label>
        <Input
          id='profesion'
          value={form.profesion}
          onChange={set('profesion')}
        />
      </div>
      <div className='space-y-1.5'>
        <Label>Tipo de suscripción</Label>
        <Select
          value={form.subscription_type}
          onValueChange={(v) => setForm((f) => ({ ...f, subscription_type: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='mensual'>Mensual</SelectItem>
            <SelectItem value='semestral'>Semestral</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type='submit' disabled={isPending}>
        {isPending ? 'Creando…' : 'Crear nutri'}
      </Button>
    </form>
  )
}
