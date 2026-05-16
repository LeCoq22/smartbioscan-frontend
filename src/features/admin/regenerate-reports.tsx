import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'

const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'https://smartbioscan-backend-production.up.railway.app'

interface NutriOpt {
  id: string
  full_name: string
  email: string
  reports_total: number
}

interface JobStatus {
  id: string
  kind: string
  status: 'running' | 'done' | 'failed'
  created_at: string
  finished_at: string | null
  total: number
  processed: number
  ok: number
  failed: number
  last_error?: string | null
  errors_count?: number
  errors_preview?: Array<{ report_id: string; error: string }>
  params?: { dry_run: boolean; nutri_id: string | null; limit: number | null }
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No hay sesión activa')
  return { Authorization: `Bearer ${token}` }
}

export function RegenerateReportsSection() {
  const [selectedNutri, setSelectedNutri] = useState<string>('ALL')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  // ── Lista de nutris con reportes (para el selector) ─────────
  const { data: nutris = [], isLoading: nutrisLoading } = useQuery<NutriOpt[]>({
    queryKey: ['admin-regen-nutris'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutris')
        .select('id, full_name, email, reports_total')
        .neq('role', 'admin')
        .gt('reports_total', 0)
        .order('reports_total', { ascending: false })
      if (error) throw error
      return (data ?? []) as NutriOpt[]
    },
  })

  // ── Polling del job activo ──────────────────────────────────
  const { data: activeJob } = useQuery<JobStatus | null>({
    queryKey: ['admin-job', activeJobId],
    enabled: !!activeJobId,
    refetchInterval: (q) => {
      const j = q.state.data
      return j && j.status === 'running' ? 2000 : false
    },
    queryFn: async () => {
      if (!activeJobId) return null
      const res = await fetch(`${BACKEND_URL}/admin/jobs/${activeJobId}`, {
        headers: await authHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as JobStatus
    },
  })

  // ── Toast cuando el job termina ─────────────────────────────
  const prevStatus = useRef<string | null>(null)
  useEffect(() => {
    if (!activeJob) return
    if (prevStatus.current === 'running' && activeJob.status !== 'running') {
      if (activeJob.failed === 0) {
        toast.success(
          `Regeneración completa: ${activeJob.ok} de ${activeJob.total} reportes`
        )
      } else {
        toast.warning(
          `Regeneración terminada con errores: ${activeJob.ok} OK, ${activeJob.failed} fallaron`
        )
      }
    }
    prevStatus.current = activeJob.status
  }, [activeJob])

  // ── Historial de jobs recientes ─────────────────────────────
  const { data: recentJobs = [], refetch: refetchHistory } = useQuery<JobStatus[]>({
    queryKey: ['admin-jobs-history'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/admin/jobs`, {
        headers: await authHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as JobStatus[]
    },
    refetchInterval: 10000,
  })

  // ── Disparar batch ──────────────────────────────────────────
  const startBatch = useMutation({
    mutationFn: async ({ nutriId }: { nutriId: string | null }) => {
      const headers = {
        ...(await authHeaders()),
        'Content-Type': 'application/json',
      }
      const res = await fetch(`${BACKEND_URL}/admin/reports/regenerate-batch-async`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ dry_run: false, nutri_id: nutriId }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`No se pudo iniciar: ${txt.slice(0, 200)}`)
      }
      return (await res.json()) as { job_id: string; total: number; status: string }
    },
    onSuccess: (data) => {
      setActiveJobId(data.job_id)
      toast.success(`Job iniciado — ${data.total} reportes a regenerar`)
      void refetchHistory()
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al iniciar el batch')
    },
  })

  const selectedNutriObj =
    selectedNutri === 'ALL' ? null : nutris.find((n) => n.id === selectedNutri)
  const totalReportsTarget =
    selectedNutri === 'ALL'
      ? nutris.reduce((acc, n) => acc + (n.reports_total ?? 0), 0)
      : (selectedNutriObj?.reports_total ?? 0)

  const isBatchRunning = activeJob?.status === 'running'
  const pct =
    activeJob && activeJob.total > 0
      ? Math.round((activeJob.processed / activeJob.total) * 100)
      : 0

  function StatusBadge({ status }: { status: string }) {
    if (status === 'done') return <Badge className='bg-green-600 text-white'>Completado</Badge>
    if (status === 'running') return <Badge className='bg-blue-600 text-white'>En curso</Badge>
    if (status === 'failed') return <Badge variant='destructive'>Falló</Badge>
    return <Badge variant='secondary'>{status}</Badge>
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className='space-y-6 max-w-4xl'>
      {/* ── Sección: disparar regeneración ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <RefreshCw className='h-5 w-5' />
            Regenerar reportes
          </CardTitle>
          <p className='text-sm text-muted-foreground'>
            Reescribe los PDFs en Storage usando el código actual + los CSVs guardados.
            No re-scrapea MyTanita ni cuenta como nuevos reportes en los límites de los nutris.
          </p>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>Alcance</Label>
            <Select
              value={selectedNutri}
              onValueChange={setSelectedNutri}
              disabled={isBatchRunning || nutrisLoading}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Seleccioná un alcance...' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>
                  Todos los nutris ({nutris.reduce((a, n) => a + (n.reports_total ?? 0), 0)} reportes)
                </SelectItem>
                {nutris.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.full_name} — {n.email} ({n.reports_total} reportes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isBatchRunning || totalReportsTarget === 0}>
                {isBatchRunning ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' /> En curso…
                  </>
                ) : (
                  <>Regenerar {totalReportsTarget} reportes</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Regenerar {totalReportsTarget} reportes?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedNutri === 'ALL' ? (
                    <>
                      Se van a regenerar <strong>todos los reportes de todos los nutris</strong>
                      {' '}({totalReportsTarget} en total). Los PDFs existentes se reemplazan en
                      Storage. Tarda aproximadamente 2 segundos por reporte.
                    </>
                  ) : (
                    <>
                      Se van a regenerar los <strong>{totalReportsTarget} reportes</strong> de{' '}
                      <strong>{selectedNutriObj?.full_name}</strong>. Los PDFs existentes se
                      reemplazan en Storage.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    startBatch.mutate({
                      nutriId: selectedNutri === 'ALL' ? null : selectedNutri,
                    })
                  }
                >
                  Sí, regenerar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* ── Sección: progreso del job activo ────────────── */}
      {activeJob && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              {activeJob.status === 'running' && <Loader2 className='h-5 w-5 animate-spin text-blue-600' />}
              {activeJob.status === 'done' && <CheckCircle2 className='h-5 w-5 text-green-600' />}
              {activeJob.status === 'failed' && <AlertCircle className='h-5 w-5 text-destructive' />}
              Job en curso
              <StatusBadge status={activeJob.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='space-y-1'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>
                  {activeJob.processed} de {activeJob.total} procesados
                </span>
                <span className='font-medium'>{pct}%</span>
              </div>
              <div className='h-2 bg-secondary rounded-full overflow-hidden'>
                <div
                  className='h-full bg-blue-600 transition-all'
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className='grid grid-cols-3 gap-3 text-sm'>
              <div className='rounded-md bg-green-50 p-3'>
                <p className='text-xs text-green-700'>OK</p>
                <p className='text-lg font-semibold text-green-700'>{activeJob.ok}</p>
              </div>
              <div className='rounded-md bg-red-50 p-3'>
                <p className='text-xs text-red-700'>Fallaron</p>
                <p className='text-lg font-semibold text-red-700'>{activeJob.failed}</p>
              </div>
              <div className='rounded-md bg-secondary p-3'>
                <p className='text-xs text-muted-foreground'>Iniciado</p>
                <p className='text-sm font-medium'>{fmtDate(activeJob.created_at)}</p>
              </div>
            </div>

            {activeJob.errors_preview && activeJob.errors_preview.length > 0 && (
              <div className='rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm'>
                <p className='font-medium text-destructive mb-1'>Primeros errores:</p>
                <ul className='space-y-1 text-xs text-muted-foreground'>
                  {activeJob.errors_preview.slice(0, 3).map((e, i) => (
                    <li key={i}>
                      <code>{e.report_id.slice(0, 8)}</code>: {e.error.slice(0, 120)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeJob.status !== 'running' && (
              <Button variant='ghost' size='sm' onClick={() => setActiveJobId(null)}>
                Cerrar
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Sección: historial ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Historial reciente</CardTitle>
          <p className='text-sm text-muted-foreground'>
            Últimos jobs ejecutados (en memoria; se borran al reiniciar el backend).
          </p>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className='text-sm text-muted-foreground'>Sin jobs registrados.</p>
          ) : (
            <div className='space-y-2'>
              {recentJobs.slice(0, 10).map((j) => (
                <div
                  key={j.id}
                  className='flex items-center justify-between rounded-md border p-3 text-sm cursor-pointer hover:bg-secondary/30'
                  onClick={() => setActiveJobId(j.id)}
                >
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <code className='text-xs text-muted-foreground'>{j.id.slice(0, 8)}</code>
                      <StatusBadge status={j.status} />
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      {fmtDate(j.created_at)}
                      {j.finished_at && ` → ${fmtDate(j.finished_at).slice(-8)}`}
                    </p>
                  </div>
                  <div className='text-right space-y-1'>
                    <p className='text-sm font-medium'>
                      {j.ok}/{j.total}
                      {j.failed > 0 && (
                        <span className='text-destructive ml-2'>· {j.failed} fallos</span>
                      )}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {j.processed === j.total ? 'completado' : `${j.processed} procesados`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
