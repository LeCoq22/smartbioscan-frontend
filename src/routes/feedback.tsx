import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { SmartBioScanLogo } from '@/assets/smartbioscan-logo'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

const REASONS = ['sin_bascula', 'no_entendi', 'sin_tiempo', 'otra'] as const

export const Route = createFileRoute('/feedback')({
  validateSearch: z.object({
    r: z.string().catch(''),
    n: z.string().catch(''),
  }),
  component: FeedbackPage,
})

function FeedbackPage() {
  const { r, n } = Route.useSearch()
  const reason = (REASONS as readonly string[]).includes(r) ? r : null
  const nutriId = z.string().uuid().safeParse(n).success ? n : null

  // Id del insert inicial, para luego adjuntarle el detalle opcional.
  const feedbackIdRef = useRef<string | null>(null)
  const insertedRef = useRef(false)

  const [detail, setDetail] = useState('')
  const [detailState, setDetailState] = useState<'idle' | 'sending' | 'sent'>('idle')

  // Registramos la respuesta principal apenas carga la página.
  useEffect(() => {
    if (insertedRef.current || !reason) return
    insertedRef.current = true
    supabase
      .from('beta_feedback')
      .insert({ reason, nutri_id: nutriId })
      .select('id')
      .single()
      .then(({ data }) => {
        if (data?.id) feedbackIdRef.current = data.id
      })
  }, [reason, nutriId])

  async function handleSendDetail(e: React.FormEvent) {
    e.preventDefault()
    const text = detail.trim()
    if (!text || detailState === 'sending') return
    setDetailState('sending')

    const id = feedbackIdRef.current
    if (id) {
      await supabase.from('beta_feedback').update({ detail: text }).eq('id', id)
    } else {
      // Fallback: si no tenemos el id (o el reason era inválido), guardamos
      // igual el texto como un registro nuevo para no perder la respuesta.
      await supabase
        .from('beta_feedback')
        .insert({ reason: reason ?? 'otra', nutri_id: nutriId, detail: text })
    }
    setDetailState('sent')
  }

  return (
    <div className='flex min-h-svh items-center justify-center bg-background p-4'>
      <div className='w-full max-w-sm space-y-6 text-center'>
        <div className='flex flex-col items-center gap-3'>
          <SmartBioScanLogo className='h-16 w-auto' />
          <CheckCircle2 className='h-12 w-12 text-primary' />
        </div>

        <div className='space-y-2'>
          <h1 className='text-xl font-semibold tracking-tight'>
            Gracias por tu respuesta.
          </h1>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            La leemos nosotros y nos ayuda a mejorar SmartBioScan.
          </p>
          <p className='text-sm text-muted-foreground'>— Lic. Diana Makk</p>
        </div>

        {detailState === 'sent' ? (
          <p className='text-sm text-primary'>
            ¡Gracias! Recibimos tu comentario.
          </p>
        ) : (
          <form onSubmit={handleSendDetail} className='space-y-3 text-left'>
            <label className='text-sm font-medium leading-none'>
              ¿Querés contarnos algo más?
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={4}
              placeholder='Opcional'
              className='flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
            />
            <Button
              type='submit'
              className='w-full'
              disabled={detail.trim().length === 0 || detailState === 'sending'}
            >
              {detailState === 'sending' ? 'Enviando…' : 'Enviar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
