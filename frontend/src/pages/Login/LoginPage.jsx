import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import Mascot from '../../components/Mascot'
import BrandLogo from '../../components/BrandLogo'
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
        <BrandLogo className="mx-auto max-w-xs" />
      </div>

      <section className="surface p-6">
        <div className="mb-6 flex items-center justify-between gap-3"><div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
            Acceso seguro
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Iniciar sesion</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Ingresa con tu cuenta para comenzar a trabajar.
          </p>
          </div><Mascot state={isSubmitting ? 'cargando' : error ? 'error' : undefined} size={88} />
        </div>

        <LoginForm error={error} isSubmitting={isSubmitting} onSubmit={handleLogin} />
      </section>
    </div>
  )
}

export default LoginPage
