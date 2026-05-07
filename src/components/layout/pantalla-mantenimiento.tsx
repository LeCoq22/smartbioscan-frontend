import { Wrench } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

interface PantallaMantenimientoProps {
  message: string
}

export function PantallaMantenimiento({ message }: PantallaMantenimientoProps) {
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    auth.reset()
    void navigate({ to: '/sign-in', replace: true })
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4'>
      <Wrench className='h-12 w-12 text-muted-foreground' />
      <h1 className='text-2xl font-bold'>App en mantenimiento</h1>
      <p className='max-w-sm text-muted-foreground'>{message}</p>
      <Button variant='outline' onClick={() => void handleSignOut()}>
        Cerrar sesión
      </Button>
    </div>
  )
}
