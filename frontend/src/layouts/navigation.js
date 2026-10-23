import { FiBarChart2, FiCreditCard, FiFileText, FiGrid, FiHome, FiPackage, FiSettings, FiShoppingBag, FiShoppingCart, FiTruck, FiUsers, FiTag, FiShield } from 'react-icons/fi'
import { localNavItems } from '../localExtensions'

export const navItems = [
  { icon: FiHome, label: 'Dashboard', to: '/', group: 'Operación' },
  { icon: FiTag, label: 'Cajas de preventa', permissions: ['presales:write'], to: '/presales', group: 'Operación' },
  { icon: FiCreditCard, label: 'Caja de venta', permissions: ['sales:complete'], to: '/checkout', group: 'Operación' },
  { icon: FiShoppingCart, label: 'Venta directa', permissions: ['sales:complete'], to: '/pos', group: 'Operación' },
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
  { icon: FiShield, label: 'Auditoría', permissions: ['reports:sensitive'], to: '/audit', group: 'Administración' },
]
