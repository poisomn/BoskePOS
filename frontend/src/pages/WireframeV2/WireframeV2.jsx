import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Bell, Box, Check, CheckCheck, ChevronRight, Clock3, CreditCard, FileText, Grid2X2, LayoutDashboard, Lightbulb, Menu, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Ticket, Trash2, Truck, Users, X } from 'lucide-react'
import { InventoryHealthChart, SalesBarChart } from '../Dashboard/DashboardPage'
import Mascot from '../../components/Mascot'
import { initialTickets, integer, inventorySample, money, operations, people, products, salesSample, stockState, total, validateTicket } from './model'
import './wireframe.css'

const navigation = [
  ['dashboard', 'Dashboard', LayoutDashboard, 'Tu negocio'],
  ['presale', 'Cajas de preventa', Ticket, 'Tu negocio'],
  ['checkout', 'Caja de venta', CreditCard, 'Tu negocio'],
  ['sales', 'Ventas', FileText, 'Tu negocio'],
  ['purchases', 'Compras', ShoppingBag, 'Tu negocio'],
  ['products', 'Productos', Package, 'Catálogo y contactos'],
  ['categories', 'Categorías', Grid2X2, 'Catálogo y contactos'],
  ['customers', 'Clientes', Users, 'Catálogo y contactos'],
  ['suppliers', 'Proveedores', Truck, 'Catálogo y contactos'],
  ['reports', 'Reportes', BarChart3, 'Gestión'],
  ['ideas', 'Decisiones y mejoras', Lightbulb, 'Gestión'],
]
const descriptions = {
  dashboard: ['Así va tu ferretería', 'Una mirada clara a tus ventas, inventario y próximos pasos.'],
  products: ['Tu catálogo, bajo control', 'Encuentra productos, revisa existencias y anticipa la reposición.'],
  categories: ['Un catálogo más ordenado', 'Agrupa tus productos para encontrarlos y gestionarlos mejor.'],
  customers: ['Conoce a quienes vuelven', 'Contactos, compras e historial en una sola ficha.'],
  suppliers: ['Tus aliados de abastecimiento', 'Contactos y compras para que nunca falte lo importante.'],
  purchases: ['Abastece con tranquilidad', 'Desde el borrador hasta la recepción de tus productos.'],
  sales: ['Cada venta, en su lugar', 'Sigue tus operaciones, consulta comprobantes y revisa sus estados.'],
  presale: ['Prepara la compra. Agiliza la caja.', 'El vendedor arma el pedido y envía un ticket a la caja de venta.'],
  checkout: ['Todo listo para cobrar', 'Recupera un ticket de preventa, revisa el detalle y confirma el pago.'],
  reports: ['Decisiones con buenos números', 'Ventas, medios de pago y márgenes, siempre sin decimales.'],
  ideas: ['Lo que podemos construir', 'Mejoras propuestas y reglas que conviene acordar antes de implementar.'],
}
const positive = ['Disponible', 'Activo', 'Completada', 'Recibida', 'Pagado']
const critical = ['Sin stock', 'Anulada', 'Inactivo', 'Cancelado']
function Status({ children }) { return <span className={`w2-status ${positive.includes(children) ? 'good' : critical.includes(children) ? 'bad' : 'wait'}`}><i />{children}</span> }
function Button({ children, primary, onClick, disabled, ...props }) { return <button type="button" className={`w2-button ${primary ? 'primary' : ''}`} onClick={onClick} disabled={disabled} {...props}>{children}</button> }
function Card({ title, note, action, children, className = '' }) { return <section className={`w2-card ${className}`}><div className="w2-card-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</div>{children}</section> }
function Stat({ label, value, note, icon: Icon = Box, emphasis }) { return <article className={`w2-stat ${emphasis ? 'emphasis' : ''}`}><div><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><p>{note}</p></article> }
function Empty({ children = 'No hay resultados para esta búsqueda.' }) { return <div className="w2-empty"><Mascot size={64} state="reposo" /><h3>{children}</h3><p>Prueba con otra búsqueda o cambia el filtro.</p></div> }
function exportCsv(headers, rows, name) {
  const cell = (value) => `"${String(value).replaceAll('"', '""')}"`
  const blob = new Blob(['\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = `boskepos-demo-${name}.csv`; link.click(); URL.revokeObjectURL(url)
}

export default function WireframeV2() {
  const initial = new URLSearchParams(window.location.search).get('section')
  const [page, setPage] = useState(navigation.some(([key]) => key === initial) ? initial : 'dashboard')
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Todos')
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(null)
  const [added, setAdded] = useState({})
  const [notice, setNotice] = useState('')
  const [tickets, setTickets] = useState(initialTickets)
  const [cart, setCart] = useState([])
  const [station, setStation] = useState('Preventa 1 · Mesón')
  const [customer, setCustomer] = useState('Consumidor final')
  const [selected, setSelected] = useState('PV-1041')
  const [payment, setPayment] = useState('Débito')
  const [received, setReceived] = useState('')
  const [problem, setProblem] = useState('')
  const [period, setPeriod] = useState('Últimos 7 días')
  const [paid, setPaid] = useState(null)
  const [previewTicket, setPreviewTicket] = useState(null)
  useEffect(() => {
    if (!menu) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event) => { if (event.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', close)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close) }
  }, [menu])
  useEffect(() => {
    const desktop = matchMedia('(min-width: 1001px)')
    const close = () => { if (desktop.matches) setMenu(false) }
    desktop.addEventListener('change', close)
    return () => desktop.removeEventListener('change', close)
  }, [])
  function navigate(next) {
    setPage(next); setSearch(''); setFilter('Todos'); setMenu(false); setNotice(''); setProblem(''); setPaid(null)
    window.history.replaceState(null, '', `?section=${next}`)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const current = navigation.find(([key]) => key === page)
  const pending = tickets.filter(ticket => ticket.status === 'Pendiente')
  const activeTicket = tickets.find(ticket => ticket.id === selected)
  const matches = (values) => values.join(' ').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))
  function addProduct(product) {
    setProblem('')
    const quantity = (cart.find(line => line.productId === product.id)?.quantity ?? 0) + 1
    if (quantity > product.stock) { setProblem(`No hay stock suficiente para ${product.name}.`); return }
    setCart(lines => lines.some(line => line.productId === product.id) ? lines.map(line => line.productId === product.id ? { ...line, quantity } : line) : [...lines, { productId: product.id, quantity: 1 }])
  }
  function sendTicket() {
    const next = { id: `PV-${1043 + tickets.length - initialTickets.length}`, box: station, customer, seller: station.includes('1') ? 'Valentina' : 'Diego', time: 'Ahora', status: 'Pendiente', items: cart.map(line => ({ ...line })) }
    const issue = validateTicket(next)
    if (issue) { setProblem(issue); return }
    setTickets(list => [...list, next]); setSelected(next.id); setPreviewTicket(next); setCart([]); setProblem(''); setNotice(`Ticket ${next.id} enviado a la cola de venta. Simulación completada.`)
  }
  function payTicket() {
    const issue = validateTicket(activeTicket)
    if (issue) { setProblem(issue); return }
    if (payment === 'Efectivo' && Number(received) < total(activeTicket.items)) { setProblem('El efectivo recibido es menor al total.'); return }
    setTickets(list => list.map(ticket => ticket.id === selected ? { ...ticket, status: 'Pagado', payment } : ticket)); setProblem(''); setPaid(selected); setNotice('Cobro simulado completado. El ticket ya no se puede volver a cobrar.')
  }
  const searchBox = (placeholder) => <label className="w2-search"><Search size={17} /><input aria-label={placeholder} placeholder={placeholder} value={search} onChange={event => setSearch(event.target.value)} /></label>
  const tabs = (options) => <div className="w2-tabs" aria-label="Filtros">{options.map(option => <button type="button" key={option} aria-pressed={filter === option} className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div>
  const detailRow = (id, title, entries) => <button type="button" className="w2-text-button" aria-label={`Ver detalle ${id}`} onClick={() => setDetail({ title, entries })}>Ver ficha <ChevronRight size={15} /></button>
  function table(headers, rows) {
    return rows.length ? <div className="w2-table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></div> : <Empty />
  }
  const daily = period === 'Hoy' ? salesSample.daily.slice(-1) : salesSample.daily
  const salesTotal = daily.reduce((sum, day) => sum + day.total, 0)
  const salesCount = daily.reduce((sum, day) => sum + day.count, 0)

  function renderDashboard() {
    return <>
      <div className="w2-welcome"><div><span className="w2-eyebrow">LUNES 19 DE OCTUBRE</span><h2>Buenos días, Valentina <span>✳</span></h2><p>Tu operación en orden, desde el mesón hasta la caja.</p></div><div className="w2-period">{['Hoy', 'Últimos 7 días'].map(value => <button type="button" className={period === value ? 'selected' : ''} key={value} onClick={() => setPeriod(value)}>{value}</button>)}</div></div>
      <div className="w2-stats"><Stat label="Ventas del período" value={money(salesTotal)} note={`${integer(salesCount)} ventas completadas`} icon={ArrowUpRight} emphasis /><Stat label="Ticket promedio" value={money(salesTotal / salesCount)} note="Por venta completada" icon={ShoppingCart} /><Stat label="Preventas por cobrar" value={integer(pending.length)} note="En cola de caja de venta" icon={Ticket} /><Stat label="Productos por reponer" value="22" note="14 bajo mínimo · 8 sin stock" icon={Package} /></div>
      <div className="w2-charts"><SalesBarChart sales={{ daily }} isLoading={false} unavailable={false} /><InventoryHealthChart inventory={inventorySample} isLoading={false} unavailable={false} /></div>
      <div className="w2-split"><Card title="Tu atención hace la diferencia" note="Pendientes que puedes resolver ahora" action={<span className="w2-count">3 tareas</span>}><div className="w2-tasks">{[[Package, 'Reponer productos prioritarios', '8 productos agotados necesitan una revisión.', 'products', 'Revisar stock'], [Truck, 'Recibir materiales pendientes', 'La compra OC-0312 está por llegar.', 'purchases', 'Ver compras'], [Ticket, 'Atender la cola de preventa', `${integer(pending.length)} tickets esperan en caja de venta.`, 'checkout', 'Ir a caja']].map(([Icon, title, note, to, action]) => <div key={title}><span className="w2-icon-tile"><Icon size={19} /></span><div><h3>{title}</h3><p>{note}</p></div><button type="button" onClick={() => navigate(to)}>{action}<ArrowRight size={16} /></button></div>)}</div></Card>
      <Card title="Actividad reciente" note="Lo que acaba de pasar"><ol className="w2-timeline"><li><i /><div><h3>Venta completada en Caja 1</h3><p>{money(57970)} · Débito · 10:38</p></div></li><li><i /><div><h3>Compra enviada a proveedor</h3><p>OC-0312 · Materiales del Sur · 10:21</p></div></li><li><i /><div><h3>Preventa preparada en Patio</h3><p>PV-1042 · Diego · 10:16</p></div></li></ol><div className="w2-assistant"><Mascot size={56} /><p>Un buen día comienza con todo en orden.</p></div></Card></div>
    </>
  }

  function renderCatalogue() {
    const filtered = products.filter(product => matches([product.name, product.sku, product.category]) && (filter === 'Todos' || stockState(product) === filter))
    const rows = filtered.map(product => [<div className="w2-product" key={product.id}><span className="w2-icon-tile"><Package size={19} /></span><div><strong>{product.name}</strong><small>{product.sku} · {product.unit}</small></div></div>, product.category, <div key="stock"><strong>{integer(product.stock)}</strong><small>Mínimo {integer(product.min)}</small></div>, money(product.price), <Status key="status">{stockState(product)}</Status>, detailRow(product.id, product.name, [['SKU', product.sku], ['Categoría', product.category], ['Precio de venta', money(product.price)], ['Costo · solo rol autorizado', money(product.cost)], ['Stock', integer(product.stock)], ['Mínimo', integer(product.min)], ['Ubicación', product.location]])])
    return <><div className="w2-stats three"><Stat label="Productos de muestra" value="6" note="Catálogo ilustrativo" icon={Package} /><Stat label="Stock bajo" value="1" note="Priorizar reposición" icon={Bell} /><Stat label="Sin stock" value="1" note="No disponible para vender" icon={Box} /></div><Card title="Todos tus productos" note="Precio, disponibilidad y ubicación a primera vista" action={<Button primary onClick={() => setForm('Producto')}><Plus size={16} />Nuevo producto</Button>}><div className="w2-toolbar">{searchBox('Buscar por nombre, SKU o categoría')}{tabs(['Todos', 'Disponible', 'Stock bajo', 'Sin stock'])}</div>{table(['Producto', 'Categoría', 'Stock', 'Precio venta', 'Estado', ''], rows)}<div className="w2-table-footer">{integer(filtered.length)} productos de muestra · precios con IVA incluido<span>Catálogo · Vista cómoda</span></div></Card></>
  }
  function renderCategories() {
    return <><div className="w2-category-grid">{['Herramientas', 'Construcción', 'Pinturas', 'Electricidad'].map((name, index) => <button type="button" key={name} className={`w2-category c${index}`} onClick={() => setSearch(name)}><Grid2X2 size={24} /><span>{name}</span><small>{integer(products.filter(product => product.category === name).length)} producto de muestra</small><ArrowUpRight size={17} /></button>)}</div><Card title="Organiza tu catálogo" note="Una estructura simple y fácil de mantener" action={<Button primary onClick={() => setForm('Categoría')}><Plus size={16} />Nueva categoría</Button>}><div className="w2-toolbar">{searchBox('Buscar categoría')}<span className="w2-caption">Pulsa una tarjeta para filtrar</span></div>{table(['Categoría', 'Productos de muestra', 'Estado', ''], [...new Set(products.map(product => product.category))].filter(category => matches([category])).map(category => [<strong key={category}>{category}</strong>, integer(products.filter(product => product.category === category).length), <Status key="state">Activo</Status>, detailRow(category, category, [['Nombre', category], ['Productos de muestra', integer(products.filter(product => product.category === category).length)], ['Propuesta', 'Edición y desactivación con validación de productos asociados.']])]))}</Card></>
  }
  function renderContacts() {
    const supplier = page === 'suppliers'
    const list = people[page].filter(row => matches(row) && (filter === 'Todos' || row[7] === filter))
    return <><div className="w2-stats three"><Stat label={supplier ? 'Proveedores activos' : 'Clientes activos'} value={supplier ? '3' : '2'} note="Directorio de demostración" icon={supplier ? Truck : Users} /><Stat label={supplier ? 'Compras registradas' : 'Compras de clientes'} value={supplier ? '15' : '26'} note="Historial ilustrativo" icon={ShoppingBag} /><Stat label={supplier ? 'Categorías abastecidas' : 'Empresas en cartera'} value={supplier ? '3' : '1'} note={supplier ? 'Abastecimiento organizado' : 'Atención a personas y empresas'} icon={Box} /></div><Card title={supplier ? 'Tu red de proveedores' : 'Personas y empresas'} note="Abre una ficha para consultar el detalle" action={<Button primary onClick={() => setForm(supplier ? 'Proveedor' : 'Cliente')}><Plus size={16} />{supplier ? 'Nuevo proveedor' : 'Nuevo cliente'}</Button>}><div className="w2-toolbar">{searchBox('Buscar por nombre, RUT o contacto')}{tabs(['Todos', 'Activo', 'Inactivo'])}</div>{table([supplier ? 'Proveedor' : 'Cliente', 'RUT', 'Contacto', supplier ? 'Compras acumuladas' : 'Ventas acumuladas', 'Estado', ''], list.map(row => [<div className="w2-product" key={row[0]}><span className="w2-avatar">{row[1].slice(0, 2).toUpperCase()}</span><div><strong>{row[1]}</strong><small>{row[2]}</small></div></div>, row[4], row[3], money(row[5]), <Status key="status">{row[7]}</Status>, detailRow(row[0], row[1], [['Identificador', row[0]], ['RUT de muestra', row[4]], ['Correo de muestra', row[3]], ['Operaciones', integer(row[6])], ['Monto acumulado', money(row[5])], ['Próxima mejora', supplier ? 'Historial de compras y acceso a nueva orden.' : 'Historial de compras y selección rápida en POS.']])]))}</Card></>
  }
  function renderOperations() {
    const buying = page === 'purchases'
    const list = operations[page].filter(row => matches(row) && (filter === 'Todos' || row[6] === filter))
    return <><div className="w2-stats three"><Stat label={buying ? 'Pendiente de recibir' : 'Ventas completadas'} value={buying ? money(1214000) : money(200930)} note={buying ? '2 compras de muestra' : '3 ventas de muestra'} icon={buying ? Truck : ShoppingBag} emphasis /><Stat label={buying ? 'Recepciones parciales' : 'Ticket promedio'} value={buying ? '1' : money(200930 / 3)} note={buying ? 'Ver diferencias antes de confirmar' : 'Excluye operaciones anuladas'} icon={buying ? Box : CreditCard} /><Stat label={buying ? 'Borradores' : 'Ventas anuladas'} value="1" note={buying ? 'Pendiente de enviar' : 'Con trazabilidad y motivo'} icon={FileText} /></div><Card title={buying ? 'Compras y recepciones' : 'Historial de ventas'} note={buying ? 'Cada etapa tiene su lugar' : 'Busca, filtra y abre el detalle de una operación'} action={<Button primary onClick={() => buying ? setForm('Compra') : navigate('checkout')}><Plus size={16} />{buying ? 'Nueva compra' : 'Ir a caja de venta'}</Button>}><div className="w2-toolbar">{searchBox('Buscar documento, cliente o proveedor')}<Button onClick={() => { exportCsv(['Documento', 'Fecha', 'Contacto', 'Caja o bodega', 'Medio o fecha prevista', 'Total CLP', 'Estado'], list.map(row => row.map(value => typeof value === 'number' ? integer(value) : value)), page); setNotice('CSV de demostración exportado con los filtros actuales y sin decimales.') }}><ArrowDownToLine size={16} />Exportar</Button></div>{tabs(buying ? ['Todos', 'Borrador', 'Por recibir', 'Parcial', 'Recibida'] : ['Todos', 'Completada', 'Anulada'])}{table(['Documento', buying ? 'Proveedor' : 'Cliente', buying ? 'Recepción prevista' : 'Medio de pago', 'Total', 'Estado', ''], list.map(row => [<div key={row[0]}><strong>{row[0]}</strong><small>{row[1]}</small></div>, row[2], row[4], money(row[5]), <Status key="status">{row[6]}</Status>, detailRow(row[0], row[0], [['Fecha', row[1]], [buying ? 'Proveedor' : 'Cliente', row[2]], [buying ? 'Bodega' : 'Caja', row[3]], ['Total', money(row[5])], ['Estado', row[6]], ['Comprobante', buying ? 'Orden de compra de muestra.' : 'Comprobante interno de muestra. No es un documento tributario.'], ['Propuesta', buying ? 'Recibir por línea y registrar diferencias.' : 'Anulación con permiso, motivo e historial.']])]))}</Card></>
  }

  function renderPresale() {
    return <><div className="w2-flow"><span className="active"><Ticket size={18} />1 · Preparar preventa</span><ChevronRight size={17} /><span><FileText size={18} />2 · Emitir ticket</span><ChevronRight size={17} /><button type="button" onClick={() => navigate('checkout')}><CreditCard size={18} />3 · Cobrar en venta <ArrowRight size={16} /></button></div><div className="w2-pos"><Card title="Estación de preventa" note="El vendedor prepara; la caja de venta cobra"><div className="w2-fields"><label>Estación<select value={station} onChange={e => setStation(e.target.value)}><option>Preventa 1 · Mesón</option><option>Preventa 2 · Patio</option><option>Preventa 3 · Atención empresas</option></select></label><label>Cliente<select value={customer} onChange={e => setCustomer(e.target.value)}><option>Consumidor final</option><option>Camila Soto</option><option>Constructora Los Robles</option></select></label></div><div className="w2-toolbar">{searchBox('Buscar producto para preventa')}</div><div className="w2-picker">{products.filter(product => matches([product.name, product.sku])).map(product => <div key={product.id}><span className="w2-icon-tile"><Package size={19} /></span><div><strong>{product.name}</strong><small>{product.sku} · {integer(product.stock)} {product.unit}</small></div><b>{money(product.price)}</b><Button aria-label={`Agregar ${product.name}`} onClick={() => addProduct(product)}><Plus size={17} /></Button></div>)}</div></Card><Card title="Ticket de preventa" note={`${station} · ${customer}`} className="w2-cart">{cart.length ? <div className="w2-cart-lines">{cart.map(line => { const p = products.find(product => product.id === line.productId); return <div key={line.productId}><strong>{p.name}</strong><div><div className="w2-quantity"><button type="button" aria-label={`Quitar una unidad de ${p.name}`} onClick={() => { setCart(list => list.map(item => item.productId === p.id ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0)); setProblem('') }}><Minus size={14} /></button><span>{integer(line.quantity)}</span><button type="button" aria-label={`Agregar una unidad de ${p.name}`} onClick={() => addProduct(p)}><Plus size={14} /></button></div><b>{money(p.price * line.quantity)}</b></div></div> })}</div> : <div className="w2-empty"><Mascot state={problem ? 'error' : 'reposo'} size={88} /><h3>La próxima venta empieza aquí</h3><p>Agrega productos para preparar el ticket.</p></div>}<div className="w2-total"><span>Total con IVA</span><strong>{money(total(cart))}</strong></div><Button primary disabled={!cart.length} onClick={sendTicket}><Ticket size={17} />Emitir y enviar a venta</Button><p className="w2-caption">No registra un pago ni descuenta stock. El ticket queda disponible para todas las cajas de venta.</p></Card></div></>
  }
  function renderCheckout() {
    const ticket = activeTicket
    const amount = ticket ? total(ticket.items) : 0
    return <><div className="w2-stats three"><Stat label="En espera" value={integer(pending.length)} note="Tickets listos para revisar" icon={Ticket} emphasis /><Stat label="Importe en cola" value={money(pending.reduce((sum, item) => sum + total(item.items), 0))} note="Aún no es ingreso por ventas" icon={Clock3} /><Stat label="Pagados en esta demo" value={integer(tickets.filter(item => item.status === 'Pagado').length)} note="No se pueden cobrar otra vez" icon={CheckCheck} /></div><div className="w2-pos"><Card title="Cola de preventas" note="Buscar o escanear el código del ticket" action={<span className="w2-count">Compartida</span>}><div className="w2-toolbar">{searchBox('Buscar ticket, cliente o estación')}</div><div className="w2-ticket-list">{tickets.filter(item => matches([item.id, item.customer, item.box])).map(item => <button type="button" className={selected === item.id ? 'selected' : ''} key={item.id} onClick={() => { setSelected(item.id); setProblem(''); setPaid(null); setReceived('') }}><span className="w2-icon-tile"><Ticket size={21} /></span><div><strong>{item.id} <small>{item.time}</small></strong><p>{item.customer}</p><small>{item.box} · {item.seller}</small></div><div><b>{money(total(item.items))}</b><Status>{item.status}</Status></div></button>)}</div><div className="w2-inline-note"><ShieldCheck size={18} /><p>Propuesta: bloquear el ticket al tomarlo en caja y volver a validar stock y precio antes del cobro.</p></div></Card><Card title={ticket ? `Cobrar ${ticket.id}` : 'Selecciona un ticket'} note="Caja venta 1 · Valentina" className="w2-cart">{ticket && <><div className="w2-checkout-client"><Users size={18} /><div><strong>{ticket.customer}</strong><small>{ticket.box}</small></div><Status>{ticket.status}</Status></div>{ticket.items.map(line => { const p = products.find(product => product.id === line.productId); return <div className="w2-checkout-line" key={p.id}><div><strong>{p.name}</strong><small>{integer(line.quantity)} × {money(p.price)}</small></div><b>{money(p.price * line.quantity)}</b></div> })}<div className="w2-total"><span>Total con IVA</span><strong>{money(amount)}</strong></div><label className="w2-field">Medio de pago<select value={payment} onChange={e => { setPayment(e.target.value); setProblem('') }} disabled={ticket.status !== 'Pendiente'}>{['Débito', 'Crédito', 'Efectivo', 'Transferencia'].map(method => <option key={method}>{method}</option>)}</select></label>{payment === 'Efectivo' && <><label className="w2-field">Efectivo recibido<input type="number" min="0" step="1" value={received} onChange={e => setReceived(e.target.value)} /></label><div className="w2-change">Vuelto <strong>{money(Math.max(0, Number(received) - amount))}</strong></div></>}<Button primary disabled={ticket.status !== 'Pendiente'} onClick={payTicket}><CreditCard size={18} />{ticket.status === 'Pagado' ? 'Ticket ya pagado' : `Simular cobro de ${money(amount)}`}</Button><Button disabled={ticket.status !== 'Pendiente'} onClick={() => { setTickets(list => list.map(item => item.id === selected ? { ...item, status: 'Cancelado' } : item)); setNotice('Ticket cancelado en la demo. En producción se exigirá permiso y motivo.') }}><Trash2 size={16} />Cancelar ticket de muestra</Button><p className="w2-caption">El cobro es una simulación. En producción, pago, cierre del ticket y descuento de stock deben confirmarse juntos en el servidor.</p></>}{paid && <div className="w2-paid" role="status"><Mascot state="exito" temporary size={72} /><h3>¡Ticket cobrado!</h3><p>{paid} salió de la cola pendiente.</p></div>}</Card></div></>
  }
  function renderReports() {
    return <><div className="w2-report-hero"><div><span className="w2-eyebrow">LECTURA CLARA · SIN DECIMALES</span><h2>De los datos a la acción.</h2><p>Pesos, unidades y porcentajes con separador de miles chileno.</p></div><Button onClick={() => exportCsv(['Indicador', 'Valor mostrado'], [['Ventas', integer(salesTotal)], ['Transacciones', integer(salesCount)], ['Ticket promedio', integer(salesTotal / salesCount)], ['Margen bruto (%)', integer(32.48)]], 'reporte')}><ArrowDownToLine size={17} />Exportar muestra</Button></div><div className="w2-stats"><Stat label="Ventas" value={money(salesTotal)} note="Período de muestra" icon={ArrowUpRight} emphasis /><Stat label="Transacciones" value={integer(salesCount)} note="Completadas" icon={ShoppingCart} /><Stat label="Ticket promedio" value={money(salesTotal / salesCount)} note="Redondeo solo al mostrar" icon={Ticket} /><Stat label="Margen bruto" value={`${integer(32.48)}%`} note="Solo para rol autorizado" icon={BarChart3} /></div><div className="w2-split"><Card title="Ventas por medio de pago" note="Participación ilustrativa">{[['Débito', 48], ['Efectivo', 27], ['Crédito', 17], ['Transferencia', 8]].map(([method, percent]) => <div className="w2-report-bar" key={method}><div><strong>{method}</strong><span>{integer(percent)}%</span></div><div><span style={{ width: `${percent}%` }} /></div></div>)}</Card><Card title="Productos con mayor rotación" note="Cantidades vendidas y total de muestra">{table(['Producto', 'Unidades', 'Venta'], products.slice(0, 4).map((p, index) => [p.name, integer((4 - index) * 8), money(p.price * (4 - index) * 8)]))}</Card></div><div className="w2-inline-note"><ShieldCheck size={20} /><p><b>Regla propuesta para todo el sistema:</b> mostrar números sin decimales en pantalla, comprobantes y exportaciones. Conservar la precisión original en base de datos y cálculos; redondear únicamente la presentación. Los campos de captura deben respetar la unidad de venta para no perder cantidades fraccionarias.</p></div></>
  }
  function renderIdeas() {
    return <><div className="w2-ideas-grid">{[
      ['01', 'Preventa con trazabilidad', 'Cada ticket identifica estación, vendedor, cliente, hora y productos. En producción: código escaneable, vencimiento y bloqueo al tomarlo en caja.', 'Prioridad alta'],
      ['02', 'Permisos por trabajo', 'Vendedor prepara y envía; cajero cobra; supervisor autoriza cancelaciones y descuentos. Los costos y márgenes requieren permiso.', 'Prioridad alta'],
      ['03', 'Precios y stock confiables', 'Revalidar al recuperar el ticket y antes del pago. Mostrar cualquier cambio de precio para confirmarlo; impedir un segundo cobro con idempotencia.', 'Prioridad alta'],
      ['04', 'Atención con teclado', 'Escanear código, buscar por nombre o SKU, navegar resultados y recuperar un ticket sin depender del mouse. Ayuda de atajos siempre disponible.', 'Siguiente etapa'],
      ['05', 'Reposición que ayuda', 'De la alerta de stock a una compra sugerida, con proveedor habitual y revisión humana antes de emitir la orden.', 'Siguiente etapa'],
      ['06', 'Historial que explica', 'Registrar quién cambió precios, existencias, descuentos y estados; conservar motivo y fecha. Vista de auditoría para administración.', 'Siguiente etapa'],
    ].map(([n, title, text, priority]) => <Card key={n} title={title} action={<span className="w2-idea-number">{n}</span>}><p className="w2-idea-text">{text}</p><span className="w2-tag">{priority}</span></Card>)}</div><Card title="Decisiones para tu visto bueno" note="Estas son las reglas propuestas; aún no cambian la operación real">{table(['Tema', 'Propuesta inicial', 'Motivo'], [['Stock en preventa', 'No reservar; validar al cobrar.', 'Evita bloquear existencias con pedidos abandonados. Si hay mucha concurrencia, evaluar reservas con vencimiento.'], ['Destino del ticket', 'Cola compartida entre cajas de venta.', 'La siguiente caja disponible atiende al cliente.'], ['Vencimiento', 'Al cierre del día; configurable.', 'Evita acumular pedidos con precio o stock desactualizados.'], ['Cambios en caja', 'Devolver a preventa para editar.', 'Mantiene clara la responsabilidad del vendedor y del cajero.'], ['Documento', 'Ticket interno con código escaneable.', 'No confundirlo con boleta o factura tributaria.'], ['Sin decimales', 'Redondear al presentar.', 'No truncar cálculos, impuestos ni existencias fraccionarias.']])}</Card></>
  }
  return <div className="w2-app">
    <aside className={`w2-sidebar ${menu ? 'open' : ''}`}><a className="w2-brand" href="/wireframe-v2"><img src="/brand/boskepos-logo.png" alt="BoskePOS" /><span>PROPUESTA DE INTERFAZ</span></a><button type="button" className="w2-close-menu" aria-label="Cerrar navegación" onClick={() => setMenu(false)}><X /></button><nav aria-label="Secciones del wireframe">{[...new Set(navigation.map(item => item[3]))].map(group => <div key={group}><p>{group}</p>{navigation.filter(item => item[3] === group).map(([key, label, Icon]) => <button type="button" key={key} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={18} /><span>{label}</span>{key === 'checkout' && <b>{integer(pending.length)}</b>}</button>)}</div>)}</nav><div className="w2-sidebar-bottom"><span className="w2-avatar">VS</span><div><strong>Valentina Soto</strong><small>Administración · Demo</small></div><ShieldCheck size={17} /></div></aside>
    {menu && <button type="button" className="w2-menu-backdrop" aria-label="Cerrar navegación" onClick={() => setMenu(false)} />}
    <main className="w2-main" inert={menu}><header className="w2-topbar"><div><button type="button" className="w2-menu-button" aria-label="Abrir navegación" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu size={21} /></button><span>BoskePOS</span><ChevronRight size={14} /><strong>{current[1]}</strong></div><div><span className="w2-demo-badge">Wireframe 2.0</span><span className="w2-topbar-date">19 oct 2026</span></div></header><div className="w2-content"><div className="w2-demo-note"><span><i />Propuesta para tu visto bueno · datos ficticios</span><span>Los cambios se reinician al recargar. No registra operaciones reales.</span></div><div className="w2-page-heading"><div><p className="w2-eyebrow">{current[1]}</p><h1>{descriptions[page][0]}</h1><p>{descriptions[page][1]}</p></div>{page === 'dashboard' && <Button primary onClick={() => navigate('presale')}><Plus size={17} />Nueva preventa</Button>}</div>
    {notice && <div className="w2-notice" role="status"><Check size={18} /><span>{notice}</span><button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {problem && <div className="w2-problem" role="alert"><Mascot state="error" size={54} /><span>{problem}</span></div>}
    {page === 'dashboard' && renderDashboard()}{page === 'products' && renderCatalogue()}{page === 'categories' && renderCategories()}{['customers', 'suppliers'].includes(page) && renderContacts()}{['sales', 'purchases'].includes(page) && renderOperations()}{page === 'presale' && renderPresale()}{page === 'checkout' && renderCheckout()}{page === 'reports' && renderReports()}{page === 'ideas' && renderIdeas()}
    {added[page]?.length > 0 && <Card title="Registros creados durante esta revisión" note="Solo se conservan mientras mantengas abierta esta demo">{table(['Nombre o referencia', 'Contacto o descripción', 'Estado'], added[page].map(item => [item.name, item.note, <Status key="status">Borrador</Status>]))}</Card>}
    <footer className="w2-footer"><span>BoskePOS · Un negocio más conectado.</span><span>Blanco + verde bosque + navy · Cifras sin decimales</span></footer></div></main>
    {detail && <Detail title={detail.title} onClose={() => setDetail(null)}><dl className="w2-detail-list">{detail.entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="w2-inline-note"><Clock3 size={18} /><p>Propuesta: ficha lateral con historial y acciones según el rol.</p></div></Detail>}
    {form && <Detail title={`Crear ${form.toLowerCase()} · muestra`} onClose={() => setForm(null)}><form className="w2-form" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); setAdded(records => ({ ...records, [page]: [...(records[page] || []), { name: values.get('name'), note: values.get('note') }] })); setNotice(`${form} de muestra creado. Está al final de esta pantalla.`); setForm(null) }}><p>Formulario conceptual. Al implementar se conservarán las validaciones específicas de cada módulo.</p><label>Nombre o referencia<input name="name" required placeholder={form === 'Compra' ? 'Ej.: reposición de cemento' : 'Nombre del registro'} /></label><label>Contacto o descripción<textarea name="note" required placeholder="Datos para esta demostración" /></label><label>Estado<input value="Borrador de demostración" readOnly /></label><button className="w2-button primary" type="submit"><Check size={16} />Guardar muestra</button></form></Detail>}
    {previewTicket && <Detail title={`Ticket ${previewTicket.id}`} onClose={() => setPreviewTicket(null)}><div className="w2-paper-ticket"><img src="/brand/boskepos-logo.png" alt="BoskePOS" /><span>TICKET INTERNO DE PREVENTA</span><h2>{previewTicket.id}</h2><p>{previewTicket.box}<br />Vendedor: {previewTicket.seller}<br />{previewTicket.customer}</p><hr />{previewTicket.items.map(line => { const p = products.find(product => product.id === line.productId); return <div key={p.id}><span>{p.name}<small>{integer(line.quantity)} × {money(p.price)}</small></span><b>{money(line.quantity * p.price)}</b></div> })}<hr /><div><b>Total con IVA</b><b>{money(total(previewTicket.items))}</b></div><p>Presenta este código en caja de venta.<br />No acredita pago ni es documento tributario.</p><div className="w2-barcode" aria-label="Espacio propuesto para el código escaneable" /><small>Vista ilustrativa: código aún no escaneable</small></div><Button primary onClick={() => { setPreviewTicket(null); navigate('checkout') }}>Ver ticket en caja de venta<ArrowRight size={16} /></Button></Detail>}
  </div>
}

function Detail({ title, children, onClose }) {
  const dialog = useRef(null)
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog className="w2-detail" ref={dialog} aria-label={title} onCancel={onClose} onClose={onClose}><header><div><span className="w2-eyebrow">BOSKEPOS · VISTA DE DETALLE</span><h2>{title}</h2></div><button type="button" aria-label="Cerrar detalle" onClick={onClose}><X size={21} /></button></header><div>{children}</div></dialog>
}
