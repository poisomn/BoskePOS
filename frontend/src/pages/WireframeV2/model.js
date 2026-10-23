export const integer = (value) => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Number(value))
export const money = (value) => `$${integer(value)}`
export const products = [
  { id: 'P001', name: 'Taladro percutor 13 mm', sku: 'HER-001', category: 'Herramientas', stock: 18, min: 5, price: 49990, cost: 32000, unit: 'unidad', location: 'A · 03' },
  { id: 'P002', name: 'Cemento especial 25 kg', sku: 'CON-002', category: 'Construcción', stock: 7, min: 15, price: 5990, cost: 3800, unit: 'saco', location: 'B · 01' },
  { id: 'P003', name: 'Pintura látex blanco 1 galón', sku: 'PIN-003', category: 'Pinturas', stock: 0, min: 6, price: 18990, cost: 12000, unit: 'galón', location: 'C · 02' },
  { id: 'P004', name: 'Tornillo autoperforante 100 unidades', sku: 'FIJ-004', category: 'Fijaciones', stock: 42, min: 10, price: 3990, cost: 2100, unit: 'caja', location: 'A · 08' },
  { id: 'P005', name: 'Cable eléctrico 2 mm', sku: 'ELE-005', category: 'Electricidad', stock: 120, min: 30, price: 1290, cost: 750, unit: 'metro', location: 'D · 04' },
  { id: 'P006', name: 'Guante de seguridad reforzado', sku: 'SEG-006', category: 'Seguridad', stock: 26, min: 8, price: 4990, cost: 2800, unit: 'par', location: 'A · 02' },
]
export const stockState = (p) => p.stock === 0 ? 'Sin stock' : p.stock < p.min ? 'Stock bajo' : 'Disponible'
export const initialTickets = [
  { id: 'PV-1041', box: 'Preventa 1 · Mesón', customer: 'Camila Soto', seller: 'Valentina', time: '10:42', status: 'Pendiente', items: [{ productId: 'P001', quantity: 1 }, { productId: 'P004', quantity: 2 }] },
  { id: 'PV-1042', box: 'Preventa 2 · Patio', customer: 'Consumidor final', seller: 'Diego', time: '10:46', status: 'Pendiente', items: [{ productId: 'P002', quantity: 3 }] },
]
export const total = (items) => items.reduce((sum, item) => sum + products.find(p => p.id === item.productId).price * item.quantity, 0)
export function validateTicket(ticket) {
  if (!ticket || ticket.status !== 'Pendiente') return 'Este ticket ya no está disponible para cobro.'
  if (!ticket.items.length) return 'Agrega al menos un producto.'
  for (const line of ticket.items) {
    const product = products.find(p => p.id === line.productId)
    if (!product || !Number.isInteger(line.quantity) || line.quantity < 1) return 'Revisa la cantidad del producto.'
    if (line.quantity > product.stock) return `Stock insuficiente: ${product.name}. Vuelve a preventa para corregir el ticket.`
  }
  return ''
}
export const people = {
  customers: [
    ['CL-001', 'Camila Soto', 'Persona', 'camila@example.com', '18.432.900-6', 124990, 6, 'Activo'],
    ['CL-002', 'Constructora Los Robles', 'Empresa', 'compras@example.com', '76.120.450-3', 1458900, 18, 'Activo'],
    ['CL-003', 'Juan Pérez', 'Persona', 'juan@example.com', '15.340.210-8', 45990, 2, 'Inactivo'],
  ],
  suppliers: [
    ['PR-001', 'Distribuidora Austral', 'Herramientas', 'ventas@example.com', '76.540.320-1', 890000, 8, 'Activo'],
    ['PR-002', 'Materiales del Sur', 'Construcción', 'pedidos@example.com', '77.210.430-2', 324000, 4, 'Activo'],
    ['PR-003', 'Eléctrica Central', 'Electricidad', 'central@example.com', '76.980.110-5', 168000, 3, 'Activo'],
  ],
}
export const operations = {
  sales: [
    ['V-2084', '19 oct · 10:38', 'Camila Soto', 'Caja venta 1', 'Débito', 57970, 'Completada'],
    ['V-2083', '19 oct · 10:31', 'Consumidor final', 'Caja venta 2', 'Efectivo', 17970, 'Completada'],
    ['V-2082', '19 oct · 10:24', 'Constructora Los Robles', 'Caja venta 1', 'Transferencia', 124990, 'Completada'],
    ['V-2081', '19 oct · 10:12', 'Juan Pérez', 'Caja venta 1', 'Efectivo', 3990, 'Anulada'],
  ],
  purchases: [
    ['OC-0312', '19 oct', 'Materiales del Sur', 'Bodega principal', '21 oct', 324000, 'Por recibir'],
    ['OC-0311', '18 oct', 'Distribuidora Austral', 'Bodega principal', '20 oct', 890000, 'Parcial'],
    ['OC-0310', '17 oct', 'Eléctrica Central', 'Bodega principal', '18 oct', 168000, 'Recibida'],
    ['OC-0309', '17 oct', 'Materiales del Sur', 'Bodega principal', 'Por definir', 45000, 'Borrador'],
  ],
}
export const salesSample = { daily: [125990, 189900, 154990, 234900, 198990, 315900, 254990].map((amount, i) => ({ date: `2026-10-${13 + i}`, total: amount, count: 8 + i * 2 })) }
export const inventorySample = { healthy_stock_count: 182, alert_stock_count: 14, out_of_stock_count: 8 }
