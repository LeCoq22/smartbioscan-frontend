import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/styles/index.css'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { supabase } from '@/lib/supabase'
import { BillingPanel } from './billing-panel'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))
const basic = {
  id: 'basic',
  title: 'Básico mensual',
  months: 1,
  max_reports_month: 30,
  unit_price: 28500,
}
const plus = {
  id: 'plus',
  title: 'Plus mensual',
  months: 1,
  max_reports_month: 100,
  unit_price: 65000,
}
let summary: Record<string, unknown>
beforeEach(() => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'test' } },
  } as never)
  summary = {
    enabled: true,
    current_plan: basic,
    subscription_end: '2026-10-30',
    cycle_end: '2026-10-30',
    quota: { remaining: 15, used: 15, limit: 30 },
    packs: [{ reports: 10, amount: '9500.00' }],
    plans: [basic, plus],
    pending: null,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (_url, init) =>
        new Response(
          JSON.stringify(
            init?.method === 'POST' ? { status: 'scheduled' } : summary
          )
        )
    )
  )
})
afterEach(() => vi.unstubAllGlobals())
async function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <BillingPanel />
    </QueryClientProvider>
  )
}
it('shows packs and reviews purchase before creating checkout', async () => {
  const screen = await mount()
  await expect
    .element(screen.getByText('10 reportes', { exact: true }))
    .toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: 'Comprar paquete' }).first()
  )
  await expect
    .element(screen.getByRole('alertdialog'))
    .toHaveTextContent('no vencen')
  expect(
    vi.mocked(fetch).mock.calls.filter((c) => c[1]?.method === 'POST')
  ).toHaveLength(0)
  await userEvent.click(
    screen.getByRole('button', { name: 'Ir a Mercado Pago' })
  )
  await expect
    .poll(
      () =>
        vi.mocked(fetch).mock.calls.filter((c) => c[1]?.method === 'POST')
          .length
    )
    .toBe(1)
  const call = vi.mocked(fetch).mock.calls.find((c) => c[1]?.method === 'POST')!
  expect(JSON.parse(call[1]!.body as string)).toMatchObject({ reports: 10 })
  expect(JSON.parse(call[1]!.body as string)).not.toHaveProperty('amount')
})
it('schedules downgrade at expiry without immediate checkout', async () => {
  summary.current_plan = plus
  const screen = await mount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Programar cambio' })
  )
  await expect
    .element(screen.getByRole('alertdialog'))
    .toHaveTextContent('30/10/2026')
  await expect
    .element(screen.getByRole('alertdialog'))
    .toHaveTextContent('Importe al renovar')
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar programación' })
  )
  await expect
    .poll(
      () =>
        vi.mocked(fetch).mock.calls.filter((c) => c[1]?.method === 'POST')
          .length
    )
    .toBe(1)
})
it('keeps the same idempotency key when retrying a failed purchase', async () => {
  vi.mocked(fetch).mockImplementation(
    async (_url, init) =>
      new Response(
        JSON.stringify(
          init?.method === 'POST' ? { detail: 'Intentalo de nuevo' } : summary
        ),
        { status: init?.method === 'POST' ? 502 : 200 }
      )
  )
  const screen = await mount()
  await userEvent.click(screen.getByRole('button', { name: 'Elegir y pagar' }))
  await userEvent.click(
    screen.getByRole('button', { name: 'Ir a Mercado Pago' })
  )
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Intentalo de nuevo')
  await userEvent.click(
    screen.getByRole('button', { name: 'Ir a Mercado Pago' })
  )
  await expect
    .poll(
      () =>
        vi.mocked(fetch).mock.calls.filter((c) => c[1]?.method === 'POST')
          .length
    )
    .toBe(2)
  const calls = vi
    .mocked(fetch)
    .mock.calls.filter((c) => c[1]?.method === 'POST')
  expect(JSON.parse(calls[0][1]!.body as string).request_id).toBe(
    JSON.parse(calls[1][1]!.body as string).request_id
  )
})
it('does not offer purchase buttons when feature is disabled', async () => {
  summary = { enabled: false }
  const screen = await mount()
  await expect
    .element(screen.getByRole('button', { name: 'Comprar paquete' }))
    .not.toBeInTheDocument()
})

it('retries renewal authorization without making another purchase', async () => {
  summary.pending = {
    id: 'paid-upgrade',
    status: 'syncing',
    mode: 'exhaustion',
    target_plan: plus,
    provider_synced: false,
    renewal_init_point: 'https://www.mercadopago.com.ar/subscriptions/checkout',
  }
  vi.mocked(fetch).mockImplementation(
    async (_url, init) =>
      new Response(
        JSON.stringify(
          init?.method === 'POST'
            ? { detail: 'Reintentá la autorización' }
            : summary
        ),
        { status: init?.method === 'POST' ? 502 : 200 }
      )
  )
  const screen = await mount()
  await userEvent.click(
    screen.getByRole('button', { name: 'Autorizar nuevo débito' })
  )
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Reintentá la autorización')
  await userEvent.click(
    screen.getByRole('button', { name: 'Autorizar nuevo débito' })
  )
  await expect
    .poll(
      () =>
        vi.mocked(fetch).mock.calls.filter((c) => c[1]?.method === 'POST')
          .length
    )
    .toBe(2)
  const posts = vi
    .mocked(fetch)
    .mock.calls.filter((c) => c[1]?.method === 'POST')
  expect(
    posts.every((c) => String(c[0]).endsWith('/orders/paid-upgrade/renewal'))
  ).toBe(true)
})
it('does not request authorization again once a scheduled change is authorized', async () => {
  summary.pending = {
    id: 'downgrade',
    status: 'scheduled',
    mode: 'expiry',
    target_plan: basic,
    previous_end: '2026-10-30',
    provider_synced: true,
    renewal_init_point: 'https://www.mercadopago.com.ar/subscriptions/checkout',
  }
  const screen = await mount()
  await expect.element(screen.getByText(/autorizado/i)).toBeVisible()
  await expect
    .element(screen.getByRole('button', { name: 'Autorizar nuevo débito' }))
    .not.toBeInTheDocument()
})
