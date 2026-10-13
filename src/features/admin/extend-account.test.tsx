import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/styles/index.css'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent, page } from 'vitest/browser'
import { supabase } from '@/lib/supabase'
import { ExtendAccountCard } from './extend-account'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn() } },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
const account = {
  id: 'account-id',
  full_name: 'Cuenta de prueba',
  email: 'prueba@example.com',
  subscription_end: '2026-01-01' as string | null,
  subscription_type: 'free_trial',
  is_suspended: false,
}
let accounts: (typeof account)[]

beforeEach(() => {
  vi.clearAllMocks()
  accounts = [account]
  const chain = {
    select: vi.fn(),
    neq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(async () => ({ data: accounts, error: null })),
  }
  chain.select.mockReturnValue(chain)
  chain.neq.mockReturnValue(chain)
  chain.or.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  vi.mocked(supabase.from).mockReturnValue(chain as never)
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
    error: null,
  } as never)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          subscription_end: '2026-10-28',
          extra_reports: 0,
        })
      )
    )
  )
})
afterEach(() => vi.unstubAllGlobals())
async function selectAccount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const screen = await render(
    <QueryClientProvider client={client}>
      <ExtendAccountCard />
    </QueryClientProvider>
  )
  await userEvent.fill(
    screen.getByRole('textbox', { name: 'Buscar cuenta por nombre o email' }),
    'prueba'
  )
  await userEvent.click(
    screen.getByRole('button', { name: /Cuenta de prueba/ })
  )
  return screen
}
it('extends for 15 days without credits after explicit review', async () => {
  const screen = await selectAccount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar extensión' })
  )
  expect(fetch).not.toHaveBeenCalled()
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar extensión', exact: true })
  )
  await expect
    .element(screen.getByRole('status'))
    .toHaveTextContent('28/10/2026, sin agregar reportes')
  const [url, init] = vi.mocked(fetch).mock.calls[0]
  expect(url).toContain('/admin/nutris/account-id/extend-account')
  expect(JSON.parse(init!.body as string)).toMatchObject({
    days: 15,
    extra_reports: 0,
    expected_subscription_end: '2026-01-01',
  })
  expect(init!.headers).toMatchObject({ Authorization: 'Bearer test-token' })
})
it('sends 30 days and the specified extra reports, rejecting fractions', async () => {
  const screen = await selectAccount()
  await userEvent.click(
    screen.getByRole('combobox', { name: 'Días adicionales' })
  )
  await userEvent.click(screen.getByRole('option', { name: '30 días' }))
  await userEvent.click(
    screen.getByRole('switch', { name: 'Agregar reportes extra' })
  )
  const input = screen.getByRole('spinbutton', { name: 'Cantidad de reportes' })
  await userEvent.fill(input, '1.5')
  await expect
    .element(screen.getByRole('button', { name: 'Revisar extensión' }))
    .toBeDisabled()
  await userEvent.fill(input, '12')
  if (import.meta.env.VITE_CAPTURE_ADMIN_PREVIEW)
    await page.screenshot({
      path: '/private/tmp/smartbioscan-account-extension/extension-preview.png',
    })
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar extensión' })
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar extensión', exact: true })
  )
  await expect.element(screen.getByRole('status')).toBeVisible()
  expect(
    JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  ).toMatchObject({ days: 30, extra_reports: 12 })
})
it('retries an uncertain response using the same request ID', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  const screen = await selectAccount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Revisar extensión' })
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar extensión', exact: true })
  )
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('no se duplicarán')
  await userEvent.click(
    screen.getByRole('button', { name: 'Reintentar la misma operación' })
  )
  await expect.element(screen.getByRole('status')).toBeVisible()
  expect(vi.mocked(fetch).mock.calls[0][1]!.body).toBe(
    vi.mocked(fetch).mock.calls[1][1]!.body
  )
})
it('blocks suspended accounts', async () => {
  accounts = [{ ...account, is_suspended: true }]
  const screen = await selectAccount()
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('suspendida')
  expect(fetch).not.toHaveBeenCalled()
})

it('does not put an expiration on an unlimited account', async () => {
  accounts = [{ ...account, subscription_end: null }]
  const screen = await selectAccount()
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('sin vencimiento')
  expect(fetch).not.toHaveBeenCalled()
})
