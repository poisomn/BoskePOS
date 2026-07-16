import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'

function LoginForm({ error, isSubmitting, onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 text-sm text-[#EF4444] bg-red-50 rounded-lg border border-red-100 flex items-center">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full h-11 pl-10 bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] text-sm text-gray-900 outline-none transition-all"
            placeholder="usuario@boskepos.cl"
            autoComplete="email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full h-11 pl-10 bg-gray-50 rounded-lg border border-gray-200 focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] text-sm text-gray-900 outline-none transition-all"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 mt-2 flex justify-center items-center bg-[#F59E0B] hover:bg-[#D97706] text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Ingresando...' : 'Ingresar al sistema'}
      </button>
    </form>
  )
}

export default LoginForm