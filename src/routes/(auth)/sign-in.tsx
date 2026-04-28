import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/(auth)/sign-in')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
})
