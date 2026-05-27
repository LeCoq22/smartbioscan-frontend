import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent, type Locator } from 'vitest/browser'
import { ForgotPasswordForm } from './forgot-password-form'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

describe('ForgotPasswordForm', () => {
  let screen: RenderResult
  let emailInput: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              status: 'sent',
              message: 'Te enviamos un email a a@b.com',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      )
    )

    screen = await render(<ForgotPasswordForm />)
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    submitButton = screen.getByRole('button', { name: /Enviar link de recuperación/i })
  })

  it('renders email field and submit button', async () => {
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(submitButton).toBeInTheDocument()
  })

  it('shows validation when submitting empty form', async () => {
    await userEvent.click(submitButton)
    await expect
      .element(screen.getByText(/Ingresá un email válido\./i))
      .toBeInTheDocument()
  })

  it('resets the form and navigates to /sign-in on sent', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.click(submitButton)

    await vi.waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({ to: '/sign-in' })
    )

    await expect.element(emailInput).toHaveValue('')
  })
})
