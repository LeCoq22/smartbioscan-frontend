import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Search as SearchIcon,
} from 'lucide-react'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── TEMPORAL: nutri_id hardcodeado hasta implementar Supabase Auth ──
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

function calcAge(dob: string): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--
  return age
}

function scrapeStatusBadge(status: string) {
  const map: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    ok: { label: '✓ OK', variant: 'default' },
    login_failed: { label: 'Login error', variant: 'destructive' },
    timeout: { label: 'Timeout', variant: 'destructive' },
    pending: { label: 'Pendiente', variant: 'secondary' },
    no_data: { label: 'Sin datos', variant: 'outline' },
  }
  const s = map[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

// ─────────────────────────────────────────────
// NUEVO PACIENTE
// ─────────────────────────────────────────────

const EMPTY_FORM = {
  full_name: '',
  tanita_email: '',
  tanita_password: '',
}

type VerifyStatus = 'idle' | 'loading' | 'ok' | 'error'

interface ProfileOption {
  profile_id: string | null
  profile_name: string
}

function NewPatientDialog({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle')
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setForm(EMPTY_FORM)
      setError(null)
      setVerifyStatus('idle')
      setProfiles([])
      setSelectedProfileId('')
    }
  }

  function field(name: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [name]: e.target.value }))
      if (name === 'tanita_email' || name === 'tanita_password') {
        setVerifyStatus('idle')
        setProfiles([])
        setSelectedProfileId('')
      }
    }
  }

  async function handleVerify() {
    setVerifyStatus('loading')
    setProfiles([])
    setSelectedProfileId('')
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patients/verify-credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Nutri-Id': NUTRI_ID,
          },
          body: JSON.stringify({
            tanita_email: form.tanita_email,
            tanita_password: form.tanita_password,
          }),
        }
      )

      if (res.status >= 500) {
        setVerifyStatus('idle')
        setError(
          'Error del servidor, intentá de nuevo en unos segundos. Si persiste, contactá soporte.'
        )
        return
      }

      const data = await res.json()

      if (res.status === 404 || data?.error === 'no_profiles_found') {
        setVerifyStatus('idle')
        setError('No se encontraron perfiles en esta cuenta.')
        return
      }

      if (
        res.status === 401 ||
        !res.ok ||
        data?.error === 'invalid_credentials' ||
        !data?.ok
      ) {
        setVerifyStatus('error')
        return
      }

      // Success
      setVerifyStatus('ok')
      const list: ProfileOption[] = data.profiles ?? []
      setProfiles(list)
      const first = list[0]
      if (first) setSelectedProfileId(first.profile_id ?? '')
    } catch {
      setVerifyStatus('idle')
      setError(
        'Error del servidor, intentá de nuevo en unos segundos. Si persiste, contactá soporte.'
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nutri-Id': NUTRI_ID,
        },
        body: JSON.stringify({
          full_name:           form.full_name,
          tanita_email:        form.tanita_email,
          tanita_password:     form.tanita_password,
          mytanita_profile_id: selectedProfileId || null,
        }),
      })
      const resData = await res.json().catch(() => ({}))
      if (res.ok) {
        const newPatientId: string = resData.patient_id
        setOpen(false)
        setForm(EMPTY_FORM)
        setVerifyStatus('idle')
        setProfiles([])
        setSelectedProfileId('')
        onCreated()
        toast.success('Paciente creado correctamente')
        sessionStorage.setItem('smartbioscan_autosync', newPatientId)
        navigate({
          to: '/patients/$patientId/reports',
          params: { patientId: newPatientId },
        })
      } else {
        if (res.status === 409) {
          setError('Ya existe un paciente registrado con estos datos.')
        } else if (res.status === 422) {
          const detail = resData.detail ?? ''
          if (
            detail.toLowerCase().includes('límite') ||
            detail.toLowerCase().includes('limite') ||
            detail.toLowerCase().includes('plan')
          ) {
            setError(detail)
          } else {
            setError('Credenciales MyTanita inválidas.')
          }
        } else {
          setError(resData.detail ?? 'Error al crear el paciente')
        }
      }
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setSaving(false)
    }
  }

  const canVerify =
    form.tanita_email.length > 0 &&
    form.tanita_password.length > 0 &&
    verifyStatus !== 'loading'

  const needsProfileSelection = verifyStatus === 'ok' && profiles.length > 1

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
            <Input
              id='full_name'
              value={form.full_name}
              onChange={field('full_name')}
              placeholder='Ej: María García'
              required
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='tanita_email'>Email MyTanita *</Label>
            <Input
              id='tanita_email'
              type='email'
              value={form.tanita_email}
              onChange={field('tanita_email')}
              placeholder='paciente@email.com'
              required
            />
          </div>
          <div className='space-y-1'>
            <Label htmlFor='tanita_password'>Contraseña MyTanita *</Label>
            <Input
              id='tanita_password'
              type='password'
              value={form.tanita_password}
              onChange={field('tanita_password')}
              placeholder='••••••••'
              required
            />
          </div>
          <div className='flex items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canVerify}
              onClick={handleVerify}
            >
              {verifyStatus === 'loading' ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Verificando...
                </>
              ) : (
                'Verificar credenciales'
              )}
            </Button>
            {verifyStatus === 'ok' && (
              <span className='flex items-center gap-1 text-sm text-green-600'>
                <CheckCircle className='h-4 w-4' />Credenciales válidas
              </span>
            )}
            {verifyStatus === 'error' && (
              <span className='flex items-center gap-1 text-sm text-destructive'>
                <XCircle className='h-4 w-4' />Credenciales incorrectas
              </span>
            )}
          </div>
          {needsProfileSelection && (
            <div className='space-y-1'>
              <Label>Perfil MyTanita *</Label>
              <Select
                value={selectedProfileId}
                onValueChange={setSelectedProfileId}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Seleccioná el perfil del paciente' />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem
                      key={p.profile_id ?? 'single'}
                      value={p.profile_id ?? ''}
                    >
                      {p.profile_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Esta cuenta tiene múltiples perfiles. Seleccioná el que corresponde a este paciente.
              </p>
            </div>
          )}
          {error && <p className='text-sm text-destructive'>{error}</p>}
          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type='submit'
              disabled={
                saving ||
                verifyStatus !== 'ok' ||
                (needsProfileSelection && !selectedProfileId)
              }
            >
              {saving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Guardando...
                </>
              ) : (
                'Guardar paciente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// EDITAR PACIENTE
// ─────────────────────────────────────────────

interface EditForm {
  full_name: string
  sex: string
  height_cm: string
  date_of_birth: string
  phone_whatsapp: string
}

function EditPatientModal({
  patient,
  onSaved,
}: {
  patient: Patient
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm>({
    full_name: patient.full_name ?? '',
    sex: patient.sex ?? 'F',
    height_cm: patient.height_cm?.toString() ?? '',
    date_of_birth: patient.date_of_birth ?? '',
    phone_whatsapp: patient.phone_whatsapp ?? '',
  })

  function handleOpenChange(v: boolean) {
    if (!v) {
      setError(null)
      setForm({
        full_name: patient.full_name ?? '',
        sex: patient.sex ?? 'F',
        height_cm: patient.height_cm?.toString() ?? '',
        date_of_birth: patient.date_of_birth ?? '',
        phone_whatsapp: patient.phone_whatsapp ?? '',
      })
    }
    setOpen(v)
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError(null)
    const { error: sbError } = await supabase
      .from('patients')
      .update({
        full_name: form.full_name.trim(),
        sex: form.sex,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        date_of_birth: form.date_of_birth || null,
        phone_whatsapp: form.phone_whatsapp.trim() || null,
      })
      .eq('id', patient.id)
    setSaving(false)
    if (sbError) {
      setError(sbError.message)
      return
    }
    setOpen(false)
    onSaved()
    toast.success('Datos del paciente actualizados')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size='icon'
          variant='ghost'
          className='h-8 w-8'
          title='Editar paciente'
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent
        className='sm:max-w-md'
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
          <DialogDescription>
            Modificá los datos de {patient.full_name}.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='space-y-1'>
            <Label>Nombre completo *</Label>
            <Input
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='space-y-1'>
              <Label>Sexo</Label>
              <Select
                value={form.sex}
                onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='F'>Femenino</SelectItem>
                  <SelectItem value='M'>Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label>Altura (cm)</Label>
              <Input
                type='number'
                value={form.height_cm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_cm: e.target.value }))
                }
              />
            </div>
          </div>
          <div className='space-y-1'>
            <Label>Fecha de nacimiento</Label>
            <Input
              type='date'
              value={form.date_of_birth}
              onChange={(e) =>
                setForm((f) => ({ ...f, date_of_birth: e.target.value }))
              }
            />
          </div>
          <div className='space-y-1'>
            <Label>WhatsApp</Label>
            <Input
              value={form.phone_whatsapp}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone_whatsapp: e.target.value }))
              }
              placeholder='+54 9 11...'
            />
          </div>
          {error && <p className='text-sm text-destructive'>{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// DAR DE BAJA (UI solamente — lógica pendiente)
// ─────────────────────────────────────────────

function DeletePatientDialog({
  patient,
  onDeleted,
}: {
  patient: Patient
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [reportCount, setReportCount] = useState<number | null>(null)

  async function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    setStep(1)
    setConfirmText('')
    setOpen(true)
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patient.id)
    setReportCount(count ?? 0)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/patients/${patient.id}`,
        {
          method: 'DELETE',
          headers: { 'X-Nutri-Id': NUTRI_ID },
        }
      )
      if (res.ok) {
        setOpen(false)
        onDeleted()
        toast.success(`${patient.full_name} dado de baja correctamente`)
      } else {
        const err = await res.json()
        toast.error(err.detail ?? 'Error al dar de baja el paciente')
      }
    } catch {
      toast.error('No se pudo conectar con el servidor')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        size='icon'
        variant='ghost'
        className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10'
        title='Dar de baja'
        onClick={handleOpen}
      >
        <Trash2 className='h-4 w-4' />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setOpen(false)
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>
                  ¿Dar de baja a {patient.full_name}?
                </DialogTitle>
                <DialogDescription>
                  {reportCount === null ? (
                    'Calculando reportes asociados...'
                  ) : (
                    <>
                      Se eliminarán también{' '}
                      <strong>{reportCount}</strong>{' '}
                      reporte{reportCount !== 1 ? 's' : ''} asociado
                      {reportCount !== 1 ? 's' : ''}. Los datos se
                      moverán a una papelera segura.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant='outline' onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant='destructive'
                  onClick={() => setStep(2)}
                  disabled={reportCount === null}
                >
                  Continuar
                </Button>
              </DialogFooter>
            </>
          )}
          {step === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Confirmación final</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer desde la interfaz. Escribí{' '}
                  <strong>ELIMINAR</strong> para confirmar.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Escribí ELIMINAR'
                onClick={(e) => e.stopPropagation()}
                className='mt-2'
              />
              <DialogFooter className='mt-2'>
                <Button variant='outline' onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant='destructive'
                  disabled={confirmText !== 'ELIMINAR' || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Eliminando...
                    </>
                  ) : (
                    'Eliminar definitivamente'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPatients()
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

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.phone_whatsapp?.toLowerCase().includes(q) ||
      p.tanita_credentials?.tanita_email?.toLowerCase().includes(q)
    )
  })

  function handleRowClick(patient: Patient) {
    navigate({
      to: '/patients/$patientId/reports',
      params: { patientId: patient.id },
    })
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Pacientes</h1>
          <p className='text-muted-foreground'>
            Hacé clic en un paciente para ver sus reportes
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={loadPatients}>
            <RefreshCw className='mr-2 h-4 w-4' />Actualizar
            {/* TODO (2.e): trigger scrape on-demand when scraper multi-perfil esté listo */}
          </Button>
          <NewPatientDialog onCreated={loadPatients} />
        </div>
      </div>

      {/* Buscador local */}
      <div className='relative max-w-sm'>
        <SearchIcon className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Buscar por nombre, email o teléfono...'
          className='pl-9'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de pacientes</CardTitle>
          <CardDescription>
            {filtered.length} paciente{filtered.length !== 1 ? 's' : ''}
            {search ? ` para "${search}"` : ' activo' + (filtered.length !== 1 ? 's' : '')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              {search ? (
                <p>Sin resultados para "{search}".</p>
              ) : (
                <>
                  <p>No hay pacientes cargados todavía.</p>
                  <div className='mt-4 flex justify-center'>
                    <NewPatientDialog onCreated={loadPatients} />
                  </div>
                </>
              )}
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
                  <TableHead className='w-[80px]' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className='cursor-pointer hover:bg-accent/50'
                    onClick={() => handleRowClick(patient)}
                  >
                    <TableCell className='font-medium'>
                      {patient.full_name}
                    </TableCell>
                    <TableCell>
                      {patient.date_of_birth
                        ? `${calcAge(patient.date_of_birth)}a`
                        : '—'}
                      {' · '}
                      {patient.sex === 'F'
                        ? 'Fem.'
                        : patient.sex === 'M'
                          ? 'Masc.'
                          : '—'}
                    </TableCell>
                    <TableCell>
                      {patient.phone_whatsapp ?? (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.tanita_credentials?.last_scraped_at ? (
                        new Date(
                          patient.tanita_credentials.last_scraped_at
                        ).toLocaleDateString('es-AR')
                      ) : (
                        <span className='text-muted-foreground'>Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.tanita_credentials ? (
                        scrapeStatusBadge(
                          patient.tanita_credentials.last_scrape_status
                        )
                      ) : (
                        <Badge variant='outline'>Sin credenciales</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className='flex items-center gap-1 justify-end'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EditPatientModal
                          patient={patient}
                          onSaved={loadPatients}
                        />
                        <DeletePatientDialog
                          patient={patient}
                          onDeleted={loadPatients}
                        />
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
