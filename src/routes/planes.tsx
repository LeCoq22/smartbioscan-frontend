import { createFileRoute } from '@tanstack/react-router'
import { Planes } from '@/pages/Planes'

export const Route = createFileRoute('/planes')({
  component: Planes,
})
