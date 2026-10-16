import { FiBarChart2, FiCreditCard, FiFileText, FiGrid, FiHome, FiPackage, FiSettings, FiShoppingBag, FiShoppingCart, FiTruck, FiUsers } from 'react-icons/fi'
import { localNavItems } from '../localExtensions'

export const navItems = [
  { icon: FiHome, label: 'Dashboard', to: '/', group: 'Operación' },
  { icon: FiShoppingCart, label: 'POS', permissions: ['sales:complete'], to: '/pos', group: 'Operación' },
  { icon: FiCreditCard, label: 'Cajas y cierres', permissions: ['sales:complete'], to: '/cash', group: 'Operación' },
  { icon: FiFileText, label: 'Ventas', permissions: ['sales:read'], to: '/sales', group: 'Operación' },
  { icon: FiBarChart2, label: 'Reportes', permissions: ['sales:read'], to: '/reports', group: 'Operación' },
  { icon: FiShoppingBag, label: 'Compras', permissions: ['purchases:read'], to: '/purchases', group: 'Operación' },
  ...localNavItems,
  { icon: FiPackage, label: 'Productos', permissions: ['inventory:read'], to: '/inventory/products', group: 'Catálogo y contactos' },
  { icon: FiGrid, label: 'Categorías', permissions: ['inventory:read'], to: '/inventory/categories', group: 'Catálogo y contactos' },
  { icon: FiUsers, label: 'Clientes', permissions: ['customers:read'], to: '/customers', group: 'Catálogo y contactos' },
  { icon: FiTruck, label: 'Proveedores', permissions: ['suppliers:read'], to: '/suppliers', group: 'Catálogo y contactos' },
  { icon: FiSettings, label: 'Configuración', permissions: ['settings:read'], to: '/settings/business', group: 'Administración' },
  { icon: FiUsers, label: 'Usuarios', permissions: ['settings:write'], to: '/settings/users', group: 'Administración' },
]
