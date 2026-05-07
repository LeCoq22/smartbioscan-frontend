import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type SortKey =
  | 'full_name'
  | 'email'
  | 'subscription_type'
  | 'subscription_status'
  | 'reports_total'
  | 'reports_this_month'
  | 'max_reports_month'
  | 'last_sign_in_at'

type SortDir = 'asc' | 'desc'

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-AR') : '—'

export function NutrisSection() {
  const queryClient = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>('reports_total')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data: nutris = [], isLoading } = useQuery({
    queryKey: ['admin-nutris'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutris')
        .select(
          'id, full_name, email, subscription_type, subscription_status, reports_total, reports_this_month, max_reports_month'
        )
        .neq('role', 'admin')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: signInData = [] } = useQuery({
    queryKey: ['nutris-last-sign-in'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_nutris_with_last_sign_in')
      return (data ?? []) as { id: string; last_sign_in_at: string | null }[]
    },
  })

  const signInMap = new Map(signInData.map((r) => [r.id, r.last_sign_in_at]))

  const merged = nutris.map((n) => ({
    ...n,
    last_sign_in_at: signInMap.get(n.id) ?? null,
  }))

  const sorted = [...merged].sort((a, b) => {
    const av = a[sortKey] ?? ''
    const bv = b[sortKey] ?? ''
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('nutris')
        .update({ subscription_status: status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      toast.success(status === 'suspended' ? 'Nutri suspendido' : 'Nutri reactivado')
      void queryClient.invalidateQueries({ queryKey: ['admin-nutris'] })
    },
    onError: () => toast.error('Error al actualizar estado'),
  })

  function SortIcon({ field }: { field: SortKey }) {
    if (sortKey !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className='h-3 w-3' />
    ) : (
      <ChevronDown className='h-3 w-3' />
    )
  }

  function SortHead({
    label,
    field,
  }: {
    label: string
    field: SortKey
  }) {
    return (
      <TableHead
        className='cursor-pointer select-none whitespace-nowrap'
        onClick={() => toggleSort(field)}
      >
        <div className='flex items-center gap-1'>
          {label}
          <SortIcon field={field} />
        </div>
      </TableHead>
    )
  }

  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge className='bg-green-600'>Activo</Badge>
    if (status === 'suspended') return <Badge variant='destructive'>Suspendido</Badge>
    return <Badge variant='secondary'>Pendiente</Badge>
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead label='Nombre' field='full_name' />
            <SortHead label='Email' field='email' />
            <SortHead label='Tipo' field='subscription_type' />
            <SortHead label='Estado' field='subscription_status' />
            <SortHead label='Total rep.' field='reports_total' />
            <SortHead label='Este mes' field='reports_this_month' />
            <SortHead label='Máx/mes' field='max_reports_month' />
            <SortHead label='Último acceso' field='last_sign_in_at' />
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={9} className='text-center text-muted-foreground'>
                Cargando…
              </TableCell>
            </TableRow>
          ) : sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className='text-center text-muted-foreground'>
                Sin nutris registrados
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((nutri) => (
              <TableRow key={nutri.id}>
                <TableCell className='font-medium'>{nutri.full_name}</TableCell>
                <TableCell>{nutri.email}</TableCell>
                <TableCell className='capitalize'>
                  {nutri.subscription_type ?? '—'}
                </TableCell>
                <TableCell>{statusBadge(nutri.subscription_status ?? '')}</TableCell>
                <TableCell>{nutri.reports_total ?? 0}</TableCell>
                <TableCell>{nutri.reports_this_month ?? 0}</TableCell>
                <TableCell>{nutri.max_reports_month ?? 0}</TableCell>
                <TableCell>{fmt(nutri.last_sign_in_at)}</TableCell>
                <TableCell>
                  {nutri.subscription_status === 'active' ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size='sm' variant='destructive'>
                          Suspender
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Suspender a {nutri.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            El nutri perderá acceso inmediatamente. Podés reactivarlo en
                            cualquier momento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            onClick={() =>
                              updateStatus.mutate({
                                id: nutri.id,
                                status: 'suspended',
                              })
                            }
                          >
                            Suspender
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : nutri.subscription_status === 'suspended' ? (
                    <Button
                      size='sm'
                      disabled={updateStatus.isPending}
                      onClick={() =>
                        updateStatus.mutate({ id: nutri.id, status: 'active' })
                      }
                    >
                      Reactivar
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
