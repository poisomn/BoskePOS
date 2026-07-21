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
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Intenta nuevamente.'
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm lg:w-96">
      
      {/* Logo visible solo en móviles */}
      <div className="flex items-center gap-2 mb-10 lg:hidden justify-center">
        <img
          src="/brand/LogoBoskePOS.webp"
          alt="BoskePOS"
          className="h-16 w-auto object-contain"
        />
      </div>

      <div>
        <h2 className="text-3xl font-bold leading-9 tracking-tight text-gray-900">
          Iniciar sesión
        </h2>
      </div>

      <div className="mt-10">
        <LoginForm error={error} isSubmitting={isSubmitting} onSubmit={handleLogin} />
      </div>
      
    </div>
  )
}

export default LoginPage