import { NavLink } from 'react-router-dom'
import { FiGrid, FiHome, FiPackage } from 'react-icons/fi'

const navItems = [
  { icon: FiHome, label: 'Dashboard', to: '/' },
  { icon: FiPackage, label: 'Productos', to: '/inventory/products' },
  { icon: FiGrid, label: 'Categorias', to: '/inventory/categories' },
]

function Sidebar() {
  return (
    <aside className="sidebar hidden lg:flex">
      <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <img
          src="/brand/LogoBoskePOS.webp"
          alt="BoskePOS"
          className="h-14 w-auto object-contain"
        />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            end={to === '/'}
            key={to}
            to={to}
          >
            <Icon aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
