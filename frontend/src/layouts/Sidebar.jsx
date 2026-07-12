import { NavLink } from 'react-router-dom'
import { FiBarChart2, FiGrid, FiHome, FiPackage, FiShoppingBag, FiShoppingCart, FiTruck, FiUsers } from 'react-icons/fi'

import { useAuth } from '../hooks/useAuth'
import { hasAnyPermission } from '../utils/permissions'

const navItems = [
  { icon: FiHome, label: 'Dashboard', to: '/' },
  { icon: FiShoppingCart, label: 'POS', permissions: ['sales:complete'], to: '/pos' },
  { icon: FiBarChart2, label: 'Ventas', permissions: ['sales:read'], to: '/sales' },
  { icon: FiShoppingBag, label: 'Compras', permissions: ['purchases:read'], to: '/purchases' },
  { icon: FiUsers, label: 'Clientes', permissions: ['customers:read'], to: '/customers' },
  { icon: FiTruck, label: 'Proveedores', permissions: ['suppliers:read'], to: '/suppliers' },
  { icon: FiPackage, label: 'Productos', permissions: ['inventory:read'], to: '/inventory/products' },
  { icon: FiGrid, label: 'Categorias', permissions: ['inventory:read'], to: '/inventory/categories' },
]

function Sidebar() {
  const { user } = useAuth()
  const visibleItems = navItems.filter(
    (item) => !item.permissions || hasAnyPermission(user, item.permissions),
  )

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
        {visibleItems.map(({ icon: Icon, label, to }) => (
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
