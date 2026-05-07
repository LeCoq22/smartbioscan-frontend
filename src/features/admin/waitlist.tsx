import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: 'Pendientes',
  approved: 'Aprobados',
  rejected: 'Rechazados',
  all: 'Todos',
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR') : '—'

export function WaitlistSection() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rejectTarget, setRejectTarget] = useState<{ id: string; nombre: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-waitlist', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('waitlist')
        .select('id, nombre, email, profesion, status, created_at, approved_at, rejected_at, rejected_reason')
        .order('created_at', { ascending: false })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/waitlist/${id}/approve`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      toast.success('Aprobado — email enviado')
      void queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al aprobar'),
  })

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const token = await getToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/waitlist/${id}/reject`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      )
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      toast.success('Rechazado')
      setRejectTarget(null)
      setRejectReason('')
      void queryClient.invalidateQueries({ queryKey: ['admin-waitlist'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al rechazar'),
  })

  return (
    <div className='space-y-4'>
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList>
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {STATUS_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Profesión</TableHead>
              <TableHead>Fecha registro</TableHead>
              <TableHead>Acciones / Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center text-muted-foreground'>
                  Cargando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center text-muted-foreground'>
                  Sin registros
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.nombre}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.profesion ?? '—'}</TableCell>
                  <TableCell>{fmt(row.created_at)}</TableCell>
                  <TableCell>
                    {row.status === 'pending' ? (
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(row.id)}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() =>
                            setRejectTarget({ id: row.id, nombre: row.nombre })
                          }
                        >
                          Rechazar
                        </Button>
                      </div>
                    ) : row.status === 'approved' ? (
                      <span className='text-sm text-muted-foreground'>
                        Aprobado {fmt(row.approved_at)}
                      </span>
                    ) : (
                      <div className='space-y-0.5'>
                        <p className='text-sm text-muted-foreground'>
                          Rechazado {fmt(row.rejected_at)}
                        </p>
                        {row.rejected_reason && (
                          <p className='text-xs text-muted-foreground italic'>
                            "{row.rejected_reason}"
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar a {rejectTarget?.nombre}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder='Motivo del rechazo (opcional)'
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setRejectTarget(null)
                setRejectReason('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant='destructive'
              disabled={reject.isPending}
              onClick={() =>
                reject.mutate({ id: rejectTarget!.id, reason: rejectReason })
              }
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
