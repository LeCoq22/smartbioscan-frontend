import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL as string

interface BackendError {
  id: string
  created_at: string
  request_id: string
  nutri_id: string | null
  nutri_full_name?: string
  nutri_email?: string
  request_path: string
  request_method: string
  status_code: number
  error_message: string
  stack_trace: string | null
  request_body: string | null
  response_body: string | null
  user_agent: string | null
  ip_address: string | null
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function statusVariant(code: number): 'destructive' | 'secondary' {
  return code >= 500 && code < 600 ? 'destructive' : 'secondary'
}

export function BackendErrorsSection() {
  const [errors, setErrors] = useState<BackendError[]>([])
  const [loading, setLoading] = useState(false)
  const [filterPath, setFilterPath] = useState('')
  const [selectedError, setSelectedError] = useState<BackendError | null>(null)

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Sesión expirada')
        return
      }

      const params = new URLSearchParams({ limit: '100' })
      if (filterPath.trim()) {
        params.set('path_contains', filterPath.trim())
      }

      const res = await fetch(`${API_URL}/admin/backend-errors?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`HTTP ${res.status}: ${err}`)
      }
      const json = await res.json()
      setErrors(json.errors || [])
    } catch (e) {
      toast.error(`Error al cargar: ${e instanceof Error ? e.message : 'desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Errores del backend</h2>
          <p className='text-sm text-muted-foreground'>
            Capturas de errores 5xx con stack traces y contexto del request.
          </p>
        </div>
        <div className='flex gap-2'>
          <Input
            placeholder='Filtrar por endpoint (ej: /reports/generate)'
            value={filterPath}
            onChange={(e) => setFilterPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchErrors()}
            className='w-64'
          />
          <Button onClick={fetchErrors} disabled={loading} size='sm'>
            {loading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <RefreshCw className='size-4' />
            )}
            <span className='ml-2'>Recargar</span>
          </Button>
        </div>
      </div>

      {errors.length === 0 && !loading && (
        <div className='rounded-md border border-dashed p-8 text-center text-muted-foreground'>
          No hay errores capturados con ese filtro.
        </div>
      )}

      {errors.length > 0 && (
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Nutri</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((err) => (
                <TableRow
                  key={err.id}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => setSelectedError(err)}
                >
                  <TableCell className='whitespace-nowrap text-xs'>
                    {fmtDate(err.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(err.status_code)}>
                      {err.status_code}
                    </Badge>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    <span className='text-muted-foreground'>{err.request_method}</span>{' '}
                    {err.request_path}
                  </TableCell>
                  <TableCell className='text-xs'>
                    {err.nutri_full_name ? (
                      <div>
                        <div>{err.nutri_full_name}</div>
                        <div className='text-muted-foreground'>{err.nutri_email}</div>
                      </div>
                    ) : (
                      <span className='text-muted-foreground italic'>anónimo</span>
                    )}
                  </TableCell>
                  <TableCell className='max-w-md truncate text-xs'>
                    {err.error_message}
                  </TableCell>
                  <TableCell>
                    <ExternalLink className='size-3 text-muted-foreground' />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de detalle */}
      <Dialog open={!!selectedError} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className='max-w-4xl max-h-[85vh] overflow-y-auto'>
          {selectedError && (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  <Badge variant={statusVariant(selectedError.status_code)}>
                    {selectedError.status_code}
                  </Badge>
                  <span className='font-mono text-sm'>
                    {selectedError.request_method} {selectedError.request_path}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {fmtDate(selectedError.created_at)} · request_id:{' '}
                  <code className='text-xs'>{selectedError.request_id}</code>
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4 text-sm'>
                {selectedError.nutri_full_name && (
                  <div>
                    <div className='font-semibold mb-1'>Nutri</div>
                    <div>
                      {selectedError.nutri_full_name}
                      <span className='text-muted-foreground'>
                        {' '}
                        — {selectedError.nutri_email}
                      </span>
                    </div>
                    <div className='text-xs text-muted-foreground font-mono'>
                      {selectedError.nutri_id}
                    </div>
                  </div>
                )}

                <div>
                  <div className='font-semibold mb-1'>Error</div>
                  <div className='rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap'>
                    {selectedError.error_message}
                  </div>
                </div>

                {selectedError.stack_trace && (
                  <div>
                    <div className='font-semibold mb-1'>Stack trace</div>
                    <pre className='rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto'>
                      {selectedError.stack_trace}
                    </pre>
                  </div>
                )}

                {selectedError.request_body && (
                  <div>
                    <div className='font-semibold mb-1'>Request body (sanitizado)</div>
                    <pre className='rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto'>
                      {selectedError.request_body}
                    </pre>
                  </div>
                )}

                {selectedError.response_body && (
                  <div>
                    <div className='font-semibold mb-1'>Response body</div>
                    <pre className='rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto'>
                      {selectedError.response_body}
                    </pre>
                  </div>
                )}

                <div className='grid grid-cols-2 gap-4 text-xs text-muted-foreground'>
                  {selectedError.ip_address && (
                    <div>
                      <span className='font-semibold'>IP:</span>{' '}
                      <code>{selectedError.ip_address}</code>
                    </div>
                  )}
                  {selectedError.user_agent && (
                    <div className='truncate'>
                      <span className='font-semibold'>UA:</span> {selectedError.user_agent}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
