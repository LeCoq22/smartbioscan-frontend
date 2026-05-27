/**
 * Frontend error reporter
 *
 * Captura excepciones JS no manejadas (window.onerror y unhandledrejection)
 * y las postea al backend /errors/frontend. Estos quedan en la tabla
 * Supabase `frontend_errors` para que admin pueda revisarlas después.
 *
 * Diseñado para fallar silenciosamente — el reporter NUNCA debe romper
 * la app ni generar nuevos errores que se reporten a sí mismos.
 */

import { supabase } from '@/lib/supabase'

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://smartbioscan-backend-production.up.railway.app'

// Dedupe: no reportamos el mismo error 2 veces en 30s
const _recent: Map<string, number> = new Map()
const DEDUPE_WINDOW_MS = 30_000

function shouldReport(key: string): boolean {
  const now = Date.now()
  // Limpieza cada cierto tiempo
  for (const [k, t] of _recent) {
    if (now - t > DEDUPE_WINDOW_MS) _recent.delete(k)
  }
  const last = _recent.get(key)
  if (last && now - last < DEDUPE_WINDOW_MS) return false
  _recent.set(key, now)
  return true
}

// TODO: implementar detector de "promise hang" genérico para
// monitorear cualquier await > N segundos como source='hang'.
// Por ahora los hangs conocidos (Login.onSubmit, RootComponent.getSession)
// reportan a /errors/frontend con source='hang' directamente desde el callsite.

interface ReportErrorOptions {
  message: string
  stack?: string | null
  source?: 'onerror' | 'unhandledrejection' | 'manual'
  context?: Record<string, unknown>
}

async function reportError(opts: ReportErrorOptions): Promise<void> {
  try {
    const message = (opts.message ?? '').slice(0, 2000)
    const stack = (opts.stack ?? '').slice(0, 10_000)

    // Dedupe por mensaje + primeras líneas de stack
    const dedupeKey = `${message}|${stack.slice(0, 200)}`
    if (!shouldReport(dedupeKey)) return

    // Intentar obtener nutri_id del usuario logueado (silencioso si falla)
    let nutri_id: string | null = null
    try {
      const { data } = await supabase.auth.getSession()
      nutri_id = data.session?.user?.id ?? null
    } catch {
      /* ignore */
    }

    const payload = {
      message,
      stack: stack || null,
      url: window.location.href.slice(0, 500),
      user_agent: navigator.userAgent.slice(0, 500),
      source: opts.source ?? 'manual',
      nutri_id,
      context: opts.context ?? null,
    }

    // Usar keepalive para que el fetch se complete incluso si la página se descarga
    await fetch(`${BACKEND_URL}/errors/frontend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* ignorar errores del propio reporter — sino loop */
    })
  } catch {
    /* fail-silent total */
  }
}

/**
 * Instalar handlers globales. Llamar 1 vez al boot del frontend.
 */
export function installErrorReporter(): void {
  // window.onerror — errores de runtime JS (síncronos o async no manejados
  // que terminan en el handler global)
  window.addEventListener('error', (event) => {
    const err = event.error as Error | undefined
    void reportError({
      message: err?.message ?? event.message ?? 'Unknown error',
      stack: err?.stack ?? null,
      source: 'onerror',
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  // unhandledrejection — promesas rechazadas sin catch (muy comunes con fetch)
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    let message: string
    let stack: string | null = null
    if (reason instanceof Error) {
      message = reason.message
      stack = reason.stack ?? null
    } else if (typeof reason === 'string') {
      message = reason
    } else {
      try {
        message = JSON.stringify(reason).slice(0, 500)
      } catch {
        message = String(reason)
      }
    }
    void reportError({
      message,
      stack,
      source: 'unhandledrejection',
    })
  })
}

/**
 * Reportar manualmente desde código (ej: dentro de un try/catch).
 */
export function reportManualError(
  err: unknown,
  context?: Record<string, unknown>
): void {
  let message: string
  let stack: string | null = null
  if (err instanceof Error) {
    message = err.message
    stack = err.stack ?? null
  } else if (typeof err === 'string') {
    message = err
  } else {
    try {
      message = JSON.stringify(err)
    } catch {
      message = String(err)
    }
  }
  void reportError({ message, stack, source: 'manual', context })
}
