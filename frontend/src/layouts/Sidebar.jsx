import { NavLink } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { useAuth } from '../hooks/useAuth'
import { hasAnyPermission } from '../utils/permissions'
import { navItems } from './navigation'

function Sidebar({ mobile = false, onNavigate }) {
  const { user } = useAuth()
  const visibleItems = navItems.filter((item) => !item.permissions || hasAnyPermission(user, item.permissions))
  const groups = [...new Set(visibleItems.map((item) => item.group))]
  return (
    <aside className={mobile ? 'sidebar sidebar-mobile' : 'sidebar hidden lg:flex'}>
      <div className="sidebar-brand"><BrandLogo linked /></div>
      <nav className="sidebar-navigation" aria-label="Navegación principal">
        {groups.map((group) => <div key={group} className="nav-group">
          <p className="nav-group-label">{group}</p>
          {visibleItems.filter((item) => item.group === group).map(({ icon: Icon, label, to }) => (
            <NavLink className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`} end={to === '/'} key={to} to={to} onClick={onNavigate}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </div>)}
      </nav>
      <div className="sidebar-footer"><span className="brand-dot" /> BoskePOS <span>Gestión para tu ferretería</span></div>
    </aside>
  )
}
export default Sidebar
