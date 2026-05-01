import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, FileText, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute(
  '/_authenticated/patients/$patientId/reports'
)({
  component: PatientReportsPage,
})

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── TEMPORAL: nutri_id hardcodeado hasta implementar Supabase Auth ──
const NUTRI_ID = 'e1883327-d219-4ba5-a305-0135efb2ab57'

interface Measurement {
  id: string
  measurement_date: string
  report_generated: boolean
  report_id: string | null
  raw_data: {
    weight_kg?: number | null
    body_fat_pct?: number | null
    muscle_mass_kg?: number | null
    visceral_fat?: number | null
    bmr_kcal?: number | null
  }
}

function fmt(v: number | null | undefined, decimals = 1): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

function PatientReportsPage() {
  const { patientId } = Route.useParams()
  const navigate = useNavigate()

  const [patientName, setPatientName] = useState('')
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [patientId])

  async function loadAll() {
    setLoading(true)
    const [nameRes, csvRes] = await Promise.all([
      supabase.from('patients').select('full_name').eq('id', patientId).single(),
      supabase
        .from('patient_csvs')
        .select('*')
        .eq('patient_id', patientId)
        .order('measurement_date', { ascending: false })
        .limit(50),
    ])
    setPatientName(nameRes.data?.full_name ?? '')
    setMeasurements(csvRes.data ?? [])
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patients/${patientId}/sync-csvs`,
        {
          method: 'POST',
          headers: { 'X-Nutri-Id': NUTRI_ID },
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success(
          `Sincronizado: ${data.synced} mediciones${data.latest_date ? ` — última: ${data.latest_date}` : ''}`
        )
        await loadAll()
      } else {
        toast.error(data.detail ?? 'Error al sincronizar')
      }
    } catch {
      toast.error('No se pudo conectar con el servidor')
    } finally {
      setSyncing(false)
    }
  }

  async function handleGenerateReport(measurementDate: string) {
    setGeneratingFor(measurementDate)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nutri-Id': NUTRI_ID,
        },
        body: JSON.stringify({ patient_id: patientId }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        if (data.skipped) {
          toast.info('No hay mediciones nuevas desde el último reporte')
        } else {
          toast.success('Reporte generado correctamente')
          if (data.pdf_url) {
            window.open(data.pdf_url, '_blank')
          }
          await loadAll()
        }
      } else {
        toast.error(data.detail ?? data.error ?? 'Error al generar el reporte')
      }
    } catch {
      toast.error('No se pudo conectar con el servidor')
    } finally {
      setGeneratingFor(null)
    }
  }

  async function handleViewReport(reportId: string) {
    window.open(
      `${import.meta.env.VITE_API_URL}/reports/${reportId}/html?nutri_id=${NUTRI_ID}`,
      '_blank'
    )
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => navigate({ to: '/patients' })}
          >
            <ArrowLeft className='mr-2 h-4 w-4' />Volver
          </Button>
          {loading ? (
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          ) : (
            <h1 className='text-2xl font-bold'>{patientName}</h1>
          )}
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className='mr-2 h-4 w-4' />
              Actualizar mediciones
            </>
          )}
        </Button>
      </div>

      {/* Tabla de mediciones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de mediciones</CardTitle>
          <CardDescription>
            {measurements.length} medición{measurements.length !== 1 ? 'es' : ''} registrada
            {measurements.length !== 1 ? 's' : ''}. Usá "Actualizar mediciones" para sincronizar desde MyTanita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : measurements.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>Sin mediciones todavía.</p>
              <p className='text-sm mt-1'>
                Presioná "Actualizar mediciones" para traer los datos desde MyTanita.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className='text-right'>Peso (kg)</TableHead>
                  <TableHead className='text-right'>% Grasa</TableHead>
                  <TableHead className='text-right'>Músculo (kg)</TableHead>
                  <TableHead className='text-right'>Gr. Visceral</TableHead>
                  <TableHead className='text-right'>BMR</TableHead>
                  <TableHead>Reporte</TableHead>
                  <TableHead className='w-[140px]' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className='font-medium'>
                      {new Date(m.measurement_date + 'T00:00:00').toLocaleDateString(
                        'es-AR',
                        { day: '2-digit', month: '2-digit', year: 'numeric' }
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      {fmt(m.raw_data?.weight_kg)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {fmt(m.raw_data?.body_fat_pct)}%
                    </TableCell>
                    <TableCell className='text-right'>
                      {fmt(m.raw_data?.muscle_mass_kg)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {fmt(m.raw_data?.visceral_fat, 0)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {fmt(m.raw_data?.bmr_kcal, 0)}
                    </TableCell>
                    <TableCell>
                      {m.report_generated ? (
                        <Badge variant='default'>PDF listo</Badge>
                      ) : (
                        <Badge variant='outline'>Sin reporte</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1 justify-end'>
                        {m.report_generated && m.report_id ? (
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleViewReport(m.report_id!)}
                            title='Ver reporte'
                          >
                            <Eye className='mr-1 h-4 w-4' />Ver
                          </Button>
                        ) : (
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={generatingFor === m.measurement_date}
                            onClick={() => handleGenerateReport(m.measurement_date)}
                          >
                            {generatingFor === m.measurement_date ? (
                              <>
                                <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                                Generando...
                              </>
                            ) : (
                              <>
                                <FileText className='mr-1 h-4 w-4' />PDF
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
