import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from '@/components/ui/card'
import { FileText, Plus, RefreshCw, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── TEMPORAL: nutri_id hardcodeado hasta implementar Supabase Auth ──
// Reemplazar con auth.getUser() cuando esté configurado el login
const NUTRI_ID = 'e1883327-d219-4ba5-a305-0135efb2ab57'

interface Patient {
  id: string
  full_name: string
  sex: string
  height_cm: number
  phone_whatsapp: string
  is_active: boolean
  date_of_birth: string
  tanita_credentials?: {
    tanita_email: string
    last_scrape_status: string
    last_scraped_at: string
  }
}

interface ReportStatus {
  [patientId: string]: 'idle' | 'loading' | 'success' | 'skipped' | 'error'
}

function calcAge(dob: string): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

function scrapeStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ok:           { label: '✓ OK',        variant: 'default' },
    login_failed: { label: 'Login error', variant: 'destructive' },
    timeout:      { label: 'Timeout',     variant: 'destructive' },
    pending:      { label: 'Pendiente',   variant: 'secondary' },
    no_data:      { label: 'Sin datos',   variant: 'outline' },
  }
  const s = map[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

const EMPTY_FORM = {
  full_name: '',
  tanita_email: '',
  tanita_password: '',
}

type VerifyStatus = 'idle' | 'loading' | 'ok' | 'error'

function NewPatientDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle')

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setForm(EMPTY_FORM)
      setError(null)
      setVerifyStatus('idle')
    }
  }

  function field(name: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(f => ({ ...f, [name]: e.target.value }))
      if (name === 'tanita_email' || name === 'tanita_password') {
        setVerifyStatus('idle')
      }
    }
  }

  async function handleVerify() {
    setVerifyStatus('loading')
    try {
      const res = await fetch('http://localhost:8000/patients/verify-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nutri-Id': NUTRI_ID,
        },
        body: JSON.stringify({
          tanita_email:    form.tanita_email,
          tanita_password: form.tanita_password,
        }),
      })
      const data = await res.json()
      setVerifyStatus(data.ok ? 'ok' : 'error')
    } catch {
      setVerifyStatus('error')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nutri-Id': NUTRI_ID,
        },
        body: JSON.stringify({
          full_name:       form.full_name,
          tanita_email:    form.tanita_email,
          tanita_password: form.tanita_password,
        }),
      })
      if (res.ok) {
        setOpen(false)
        setForm(EMPTY_FORM)
        setVerifyStatus('idle')
        onCreated()
      } else {
        const err = await res.json()
        setError(err.detail ?? 'Error al crear el paciente')
      }
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setSaving(false)
    }
  }

  const canVerify = form.tanita_email.length > 0 && form.tanita_password.length > 0
    && verifyStatus !== 'loading'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Plus className='mr-2 h-4 w-4' />Nuevo paciente
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
          <DialogDescription>
            Completá los datos del paciente y sus credenciales MyTanita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='space-y-1'>
            <Label htmlFor='full_name'>Nombre completo *</Label>
            <Input id='full_name' value={form.full_name} onChange={field('full_name')}
              placeholder='Ej: María García' required />
          </div>

          <div className='space-y-1'>
            <Label htmlFor='tanita_email'>Email MyTanita *</Label>
            <Input id='tanita_email' type='email' value={form.tanita_email}
              onChange={field('tanita_email')} placeholder='paciente@email.com' required />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='tanita_password'>Contraseña MyTanita *</Label>
            <Input id='tanita_password' type='password' value={form.tanita_password}
              onChange={field('tanita_password')} placeholder='••••••••' required />
          </div>

          <div className='flex items-center gap-3'>
            <Button type='button' variant='outline' size='sm'
              disabled={!canVerify} onClick={handleVerify}>
              {verifyStatus === 'loading'
                ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Verificando...</>
                : 'Verificar credenciales'}
            </Button>
            {verifyStatus === 'ok' && (
              <span className='flex items-center gap-1 text-sm text-green-600'>
                <CheckCircle className='h-4 w-4' />Credenciales válidas
              </span>
            )}
            {verifyStatus === 'error' && (
              <span className='flex items-center gap-1 text-sm text-destructive'>
                <XCircle className='h-4 w-4' />Login fallido
              </span>
            )}
          </div>

          {error && (
            <p className='text-sm text-destructive'>{error}</p>
          )}

          <DialogFooter className='pt-2'>
            <Button type='button' variant='outline' onClick={() => handleOpenChange(false)}
              disabled={saving}>Cancelar</Button>
            <Button type='submit' disabled={saving || verifyStatus !== 'ok'}>
              {saving
                ? <><Loader2 className='mr-2 h-4 w-4 animate-spin' />Guardando...</>
                : 'Guardar paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [reportStatus, setReportStatus] = useState<ReportStatus>({})
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null)

  useEffect(() => {
    loadPatients()
    loadQuota()
  }, [])

  async function loadPatients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*, tanita_credentials(tanita_email, last_scrape_status, last_scraped_at)')
      .eq('nutri_id', NUTRI_ID)
      .eq('is_active', true)
      .order('full_name')

    if (error) console.error('Error cargando pacientes:', error)
    setPatients(data ?? [])
    setLoading(false)
  }

  async function loadQuota() {
    const { data, error } = await supabase
      .rpc('can_generate_report', { p_nutri_id: NUTRI_ID })
    if (data) setQuota({ used: data.used ?? 0, limit: data.limit ?? 0 })
  }

async function generateReport(patient: Patient) {
  setReportStatus(s => ({ ...s, [patient.id]: 'loading' }))
  try {
    const res = await fetch('http://localhost:8000/reports/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nutri-Id': NUTRI_ID,
      },
      body: JSON.stringify({ patient_id: patient.id }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.skipped) {
        setReportStatus(s => ({ ...s, [patient.id]: 'skipped' }))
      } else {
        setReportStatus(s => ({ ...s, [patient.id]: 'success' }))
        loadQuota()
      }
    } else {
      const err = await res.json()
      console.error('Error del pipeline:', err)
      setReportStatus(s => ({ ...s, [patient.id]: 'error' }))
    }
  } catch {
    setReportStatus(s => ({ ...s, [patient.id]: 'error' }))
  }
  setTimeout(() => setReportStatus(s => ({ ...s, [patient.id]: 'idle' })), 5000)
}
  function ReportButton({ patient }: { patient: Patient }) {
    const status = reportStatus[patient.id] ?? 'idle'
    const hasCredentials = !!patient.tanita_credentials
    if (status === 'loading') return (
      <Button size='sm' disabled>
        <Loader2 className='mr-2 h-4 w-4 animate-spin' />Generando...
      </Button>
    )
    if (status === 'success') return (
      <Button size='sm' variant='outline' className='text-green-600 border-green-600'>
        <CheckCircle className='mr-2 h-4 w-4' />Enviado
      </Button>
    )
    if (status === 'skipped') return (
      <Button size='sm' variant='outline' className='text-yellow-600 border-yellow-600'>
        <AlertCircle className='mr-2 h-4 w-4' />Sin datos nuevos
      </Button>
    )
    if (status === 'error') return (
      <Button size='sm' variant='outline' className='text-red-600 border-red-600'>
        <XCircle className='mr-2 h-4 w-4' />Error
      </Button>
    )
    return (
      <Button size='sm' onClick={() => generateReport(patient)}
        disabled={!hasCredentials}
        title={!hasCredentials ? 'Sin credenciales MyTanita' : 'Generar reporte PDF'}>
        <FileText className='mr-2 h-4 w-4' />Generar reporte
      </Button>
    )
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Pacientes</h1>
          <p className='text-muted-foreground'>
            Gestioná tus pacientes y generá reportes de composición corporal
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={loadPatients}>
            <RefreshCw className='mr-2 h-4 w-4' />Actualizar
          </Button>
          <NewPatientDialog onCreated={loadPatients} />
        </div>
      </div>

      {quota && (
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>Reportes este mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-4'>
              <div className='text-2xl font-bold'>{quota.used} / {quota.limit}</div>
              <div className='flex-1 bg-secondary rounded-full h-2'>
                <div className='bg-primary rounded-full h-2 transition-all'
                  style={{ width: `{Math.min(quota.used / quota.limit * 100, 100)}%` }} />
              </div>
              <span className='text-sm text-muted-foreground'>
                {quota.limit - quota.used} restantes
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de pacientes</CardTitle>
          <CardDescription>
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} activo{patients.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : patients.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <p>No hay pacientes cargados todavía.</p>
              <div className='mt-4 flex justify-center'>
                <NewPatientDialog onCreated={loadPatients} />
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Edad / Sexo</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Último scrape</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className='text-right'>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map(patient => (
                  <TableRow key={patient.id}>
                    <TableCell className='font-medium'>{patient.full_name}</TableCell>
                    <TableCell>
                      {patient.date_of_birth ? `${calcAge(patient.date_of_birth)}a` : '—'}
                      {' · '}
                      {patient.sex === 'F' ? 'Fem.' : patient.sex === 'M' ? 'Masc.' : '—'}
                    </TableCell>
                    <TableCell>
                      {patient.phone_whatsapp ?? <span className='text-muted-foreground'>—</span>}
                    </TableCell>
                    <TableCell>
                      {patient.tanita_credentials?.last_scraped_at
                        ? new Date(patient.tanita_credentials.last_scraped_at).toLocaleDateString('es-AR')
                        : <span className='text-muted-foreground'>Nunca</span>}
                    </TableCell>
                    <TableCell>
                      {patient.tanita_credentials
                        ? scrapeStatusBadge(patient.tanita_credentials.last_scrape_status)
                        : <Badge variant='outline'>Sin credenciales</Badge>}
                    </TableCell>
                    <TableCell className='text-right'>
                      <ReportButton patient={patient} />
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
