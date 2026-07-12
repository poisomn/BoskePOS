import { FiLogOut, FiUser } from 'react-icons/fi'

import { useAuth } from '../hooks/useAuth'

function Navbar() {
  const { logout, user } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8" style={{ borderColor: 'var(--color-border)' }}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-700)' }}>
          BoskePOS
        </p>
        <h1 className="text-base font-semibold">Sistema operativo</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-sm sm:flex" style={{ color: 'var(--color-text-muted)' }}>
          <FiUser aria-hidden="true" />
          <span>{user?.email}</span>
          {user?.roles?.length ? (
            <span className="badge badge-neutral">{user.roles.join(', ')}</span>
          ) : null}
        </div>
        <button className="btn btn-secondary" type="button" onClick={logout}>
          <FiLogOut aria-hidden="true" />
          Salir
        </button>
      </div>
    </header>
  )
}

export default Navbar
