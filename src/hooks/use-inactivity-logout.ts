import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

const INACTIVITY_MS = 30 * 60 * 1000   // 30 min sin actividad
const MAX_SESSION_MS = 8 * 60 * 60 * 1000  // 8 h de sesión absoluta
const CHECK_INTERVAL_MS = 60_000        // chequear cada 1 min

export function useInactivityLogout(isAuthenticated: boolean) {
  const lastActivityRef = useRef(0)
  const sessionStartRef = useRef(0)

  useEffect(() => {
    if (!isAuthenticated) return

    sessionStartRef.current = Date.now()
    lastActivityRef.current = Date.now()

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }))

    const interval = setInterval(async () => {
      const now = Date.now()
      const inactive = now - lastActivityRef.current > INACTIVITY_MS
      const tooLong = now - sessionStartRef.current > MAX_SESSION_MS

      if (inactive || tooLong) {
        clearInterval(interval)
        await supabase.auth.signOut()
        toast.warning(
          tooLong && !inactive
            ? 'Tu sesión expiró (límite de 8 horas)'
            : 'Tu sesión expiró por inactividad',
          { duration: 8000 }
        )
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity))
      clearInterval(interval)
    }
  }, [isAuthenticated])
}
