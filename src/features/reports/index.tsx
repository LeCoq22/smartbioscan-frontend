import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Download, Eye, Search, Loader2 } from 'lucide-react'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface Report {
  id: string
  measurement_date: string
  weight_kg: number
  body_fat_pct: number
  muscle_mass_kg: number
  visceral_fat: number
  pdf_storage_path: string
  generation_secs: number
  generated_at: string
  patients: {
    full_name: string
    sex: string
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [nutriId, setNutriId] = useState('')

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setLoading(false)
      const currentNutriId = session.user.id
      setNutriId(currentNutriId)

      const { data, error } = await supabase
        .from('reports')
        .select('*, patients(full_name, sex)')
        .eq('nutri_id', currentNutriId)
        .order('generated_at', { ascending: false })
        .limit(100)

      if (error) return setLoading(false)
      setReports(data ?? [])
      setLoading(false)
    })()
  }, [])

  async function downloadPdf(report: Report) {
    if (!report.pdf_storage_path) return
    setDownloading(report.id)
    try {
      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/reports/${report.pdf_storage_path}`
      const a = document.createElement('a')
      a.href = publicUrl
      a.target = '_blank'
      a.download = `reporte_${report.patients?.full_name?.replace(' ', '_') ?? 'paciente'}_${report.measurement_date?.slice(0, 10) ?? ''}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(null)
    }
  }

  const filtered = reports.filter(r =>
    r.patients?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Reportes</h1>
          <p className='text-muted-foreground'>
            Historial de reportes generados para todos tus pacientes
          </p>
        </div>
      </div>

      <div className='relative max-w-sm'>
        <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Buscar por paciente...'
          className='pl-9'
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de reportes</CardTitle>
          <CardDescription>
            {filtered.length} reporte{filtered.length !== 1 ? 's' : ''}
            {search ? ` para "${search}"` : ' en total'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              No hay reportes todavía. Generá el primer reporte desde la página de Pacientes.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha medición</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>% Grasa</TableHead>
                  <TableHead>Músculo</TableHead>
                  <TableHead>Visc.</TableHead>
                  <TableHead>Generado</TableHead>
                  <TableHead className='text-right'>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className='font-medium'>
                      {report.patients?.full_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      {new Date(report.measurement_date).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell>{report.weight_kg} kg</TableCell>
                    <TableCell>
                      <Badge variant={report.body_fat_pct < 25 ? 'default' : 'secondary'}>
                        {report.body_fat_pct}%
                      </Badge>
                    </TableCell>
                    <TableCell>{report.muscle_mass_kg} kg</TableCell>
                    <TableCell>
                      <Badge variant={report.visceral_fat <= 12 ? 'default' : 'destructive'}>
                        {report.visceral_fat}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {new Date(report.generated_at).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                      <br />
                      <span className='text-xs'>{report.generation_secs}s</span>
                    </TableCell>
                    <TableCell className='text-right'>
                      {report.pdf_storage_path ? (
                        <div className='flex justify-end gap-1'>
                          <Button
                            size='sm'
                            variant='outline'
                            title='Ver reporte en el browser'
                            onClick={() => window.open(
                              `${import.meta.env.VITE_API_URL}/reports/${report.id}/html?nutri_id=${nutriId}`,
                              '_blank'
                            )}
                          >
                            <Eye className='h-4 w-4' />
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            title='Descargar PDF'
                            onClick={() => downloadPdf(report)}
                            disabled={downloading === report.id}
                          >
                            {downloading === report.id
                              ? <Loader2 className='h-4 w-4 animate-spin' />
                              : <Download className='h-4 w-4' />}
                          </Button>
                        </div>
                      ) : (
                        <span className='text-muted-foreground text-sm'>—</span>
                      )}
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
