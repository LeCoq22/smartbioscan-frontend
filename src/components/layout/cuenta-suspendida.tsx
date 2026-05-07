import { ShieldX } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export function CuentaSuspendida() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    auth.reset()
    void navigate({ to: '/sign-in', replace: true })
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4'>
      <ShieldX className='h-12 w-12 text-destructive' />
      <h1 className='text-2xl font-bold'>Cuenta en suspenso</h1>
      <p className='text-muted-foreground'>
        Contactá a soporte para más información.
      </p>
      <Button variant='outline' onClick={() => void handleSignOut()}>
        Cerrar sesión
      </Button>
    </div>
  )
}
