import { useState } from 'react'
import { FiLock, FiMail } from 'react-icons/fi'

function LoginForm({ error, isSubmitting, onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? <div className="alert alert-error">{error}</div> : null}

      <label>
        <span className="field-label">Correo electronico</span>
        <div className="relative">
          <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
          <input
            autoComplete="email"
            className="input pl-10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@boskepos.cl"
            required
            type="email"
            value={email}
          />
        </div>
      </label>

      <label>
        <span className="field-label">Contrasena</span>
        <div className="relative">
          <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
          <input
            autoComplete="current-password"
            className="input pl-10"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contrasena"
            required
            type="password"
            value={password}
          />
        </div>
      </label>

      <button className="btn btn-primary w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}

export default LoginForm
