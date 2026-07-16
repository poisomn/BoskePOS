import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import LoginPage from '../pages/Login/LoginPage'
import { renderWithRouter } from './utils/renderWithRouter'

const loginMock = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isSubmitting: false,
    login: loginMock,
  }),
}))

describe('LoginPage', () => {
  it('submits credentials and shows the error state when login fails', async () => {
    loginMock.mockRejectedValueOnce({ response: { status: 401 } })
    const user = userEvent.setup()

    renderWithRouter(<LoginPage />)

    await user.type(screen.getByLabelText(/correo electronico/i), 'admin@boskepos.cl')
    await user.type(screen.getByLabelText(/contrasena/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText(/correo o contrasena incorrectos/i)).toBeInTheDocument()
  })

  it('calls login with the entered credentials', async () => {
    loginMock.mockResolvedValueOnce({ id: 1 })
    const user = userEvent.setup()

    renderWithRouter(<LoginPage />)

    await user.type(screen.getByLabelText(/correo electronico/i), 'owner@boskepos.cl')
    await user.type(screen.getByLabelText(/contrasena/i), 'password')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(loginMock).toHaveBeenCalledWith({ email: 'owner@boskepos.cl', password: 'password' })
  })
})
