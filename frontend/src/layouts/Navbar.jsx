import { FiLogOut, FiMenu } from 'react-icons/fi'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { navItems } from './navigation'

function Navbar({ isMenuOpen, onToggleMenu }) {
  const { logout, user } = useAuth()
  const { pathname } = useLocation()
  const current = navItems.find((item) => item.to === '/' ? pathname === '/' : pathname.startsWith(item.to))
  const name = user?.first_name || user?.email?.split('@')[0] || 'Usuario'
  return (
    <header className="app-navbar">
      <div className="flex min-w-0 items-center gap-3">
        <button className="icon-btn lg:hidden" type="button" aria-label="Abrir navegación" aria-expanded={isMenuOpen} aria-controls="mobile-navigation" onClick={onToggleMenu}><FiMenu aria-hidden="true" /></button>
        <img src="/brand/boskepos-copa.png" alt="" aria-hidden="true" width={44} height={44} className="navbar-mascot" />
        <div className="min-w-0"><p className="navbar-eyebrow">BoskePOS <span>/ {current?.group || 'Operación'}</span></p><p className="navbar-title">{current?.label || 'Acceso'}</p></div>
      </div>
      <div className="navbar-account">
        <div className="user-avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</div>
        <div className="user-details"><span className="user-email" title={user?.email}>{user?.email}</span><span className="user-role">{user?.roles?.join(', ') || 'Usuario'}</span></div>
        <button className="icon-btn" type="button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><FiLogOut aria-hidden="true" /></button>
      </div>
    </header>
  )
}
export default Navbar
