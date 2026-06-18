import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'beta_closure_popup_dismissed_v1'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return true
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* noop */
  }
}

type Props = {
  subscriptionType: string | null | undefined
  isAdmin?: boolean
}

export function BetaClosurePopup({ subscriptionType, isAdmin }: Props) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<boolean>(readDismissed)

  const isBeta = subscriptionType === 'beta'
  const open = isBeta && !isAdmin && !dismissed

  function handleDismiss() {
    writeDismissed()
    setDismissed(true)
  }

  function handleViewPlanes() {
    writeDismissed()
    setDismissed(true)
    navigate({ to: '/planes' })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss() }}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>La etapa beta termina el 30 de junio</DialogTitle>
          <DialogDescription className='space-y-3 pt-2 text-sm leading-relaxed'>
            <span className='block'>
              Gracias por acompañarnos durante la beta de SmartBioScan. A partir del 1 de julio, el sistema pasa a funcionar con planes de suscripción.
            </span>
            <span className='block'>
              Lo importante: todos los reportes que ya generaste y tus pacientes cargados se mantienen. No se pierde nada. Vas a poder seguir viéndolos y descargándolos siempre.
            </span>
            <span className='block'>
              Para seguir generando reportes nuevos a partir de julio, vas a necesitar elegir un plan.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-0'>
          <Button variant='outline' onClick={handleDismiss}>
            Ahora no
          </Button>
          <Button onClick={handleViewPlanes}>
            Ver los planes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
