import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import LoginForm from './LoginForm'

function LoginPage() {
  const { isAuthenticated, isSubmitting, login } = useAuth()
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname ?? '/'

  if (isAuthenticated) {
    return <Navigate replace to="/" />
  }

  async function handleLogin(credentials) {
    setError('')

    try {
      await login(credentials)
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      const status = loginError.response?.status
      setError(
        status === 401
          ? 'Correo o contrasena incorrectos.'
          : 'No se pudo iniciar sesion. Intenta nuevamente.',
      )
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center lg:hidden">
        <img
          src="/brand/LogoBoskePOS.webp"
          alt="BoskePOS"
          className="mx-auto h-24 w-auto object-contain"
        />
      </div>

      <section className="surface p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
            Acceso seguro
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Iniciar sesion</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Usa las credenciales creadas en el backend para entrar al sistema.
          </p>
        </div>

        <LoginForm error={error} isSubmitting={isSubmitting} onSubmit={handleLogin} />
      </section>
    </div>
  )
}

export default LoginPage
