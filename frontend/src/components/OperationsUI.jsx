import { downloadCsv } from '../utils/exportCsv'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpRight, Box, ChevronRight, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { formatDateTime, formatMoney, formatNumber, formatPercent } from '../utils/formatters'

export function PageHeading({ section, title, description, children }) {
  return <header className="ops-heading"><div><p>{section}</p><h1>{title}</h1><span>{description}</span></div>{children && <div className="ops-heading-actions">{children}</div>}</header>
}

export function PageStats({ total, rows = [], resource = 'registros' }) {
  const monetary = rows.some(row => row.total != null)
  const stats = [['Resultados del filtro', formatNumber(total), `${resource} · según el filtro`],
    [monetary ? 'Importe en esta página' : 'Activos en esta página', monetary ? formatMoney(rows.reduce((sum, row) => sum + Number(row.total || 0), 0)) : formatNumber(rows.filter(row => row.is_active).length), monetary ? 'Incluye los estados que estás viendo' : 'Según el filtro y la página actual'],
    ['Registros mostrados', formatNumber(rows.length), 'Abre una ficha para ver el detalle']]
  return <section className="ops-stats">{stats.map(([label, value, note], i) => <article key={label} className={i === 0 ? 'ops-emphasis' : ''}><div><span>{label}</span>{i === 0 ? <ArrowUpRight size={17} /> : <Box size={17} />}</div><strong>{value}</strong><p>{note}</p></article>)}</section>
}

export function FilterTabs({ value, onChange, options }) {
  return <div className="ops-tabs" aria-label="Filtros rápidos">{options.map(([key, label]) => <button key={key} type="button" className={value === key ? 'selected' : ''} aria-pressed={value === key} onClick={() => onChange(key)}>{label}</button>)}</div>
}

export function ExportButton({ rows, columns, name }) {
  return <button className="btn btn-secondary" type="button" disabled={!rows.length} onClick={() => downloadCsv(name, columns.map(c => c[1]), rows.map(row => columns.map(([key,, type]) => row[key] == null ? '' : type === 'money' ? formatMoney(row[key]) : type === 'number' ? formatNumber(row[key]) : type === 'active' ? row[key] ? 'Activo' : 'Inactivo' : type === 'date' ? formatDateTime(row[key]) : row[key])))}><ArrowDownToLine size={16} />Exportar página</button>
}

export function Drawer({ title, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog className="ops-drawer" aria-label={title} ref={ref} onCancel={e => { e.preventDefault(); onClose() }}><header><div><p>BOSKEPOS · DETALLE</p><h2>{title}</h2></div><button className="icon-btn" aria-label="Cerrar ficha" type="button" onClick={onClose}><X size={19} /></button></header><div>{children}</div></dialog>
}

const labels = { id: 'Identificador', name: 'Nombre', rut: 'RUT', email: 'Correo', phone: 'Teléfono', address: 'Dirección', city: 'Ciudad', giro: 'Giro', sku: 'SKU', barcode: 'Código de barras', brand: 'Marca', unit: 'Unidad', location: 'Ubicación', description: 'Descripción', stock: 'Stock', minimum_stock: 'Stock mínimo', sale_price: 'Precio venta', cost_price: 'Costo', tax_rate: 'IVA', reference: 'Referencia', notes: 'Observación', status_label: 'Estado', supplier_name: 'Proveedor', customer_name: 'Cliente', total: 'Total', subtotal: 'Subtotal', created_at: 'Creado', updated_at: 'Actualizado', user_email: 'Responsable', is_active: 'Estado', seller: 'Vendedor' }
export function RecordDrawer({ record, resource, onClose }) {
  const { hasPermission } = useAuth()
  if (!record) return null
  return <Drawer title={record.name || `${resource} #${record.id}`} onClose={onClose}>{record.image && <img className="ops-record-image" src={record.image} alt={record.name} />}<dl className="ops-record">{Object.entries(labels).filter(([key]) => record[key] != null && (key !== 'cost_price' || hasPermission('inventory:view_costs'))).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key.endsWith('_at') ? formatDateTime(record[key]) : ['total', 'subtotal', 'cost_price', 'sale_price'].includes(key) ? formatMoney(record[key]) : ['stock', 'minimum_stock', 'id'].includes(key) ? formatNumber(record[key]) : key === 'tax_rate' ? formatPercent(record[key]) : key === 'is_active' ? record[key] ? 'Activo' : 'Inactivo' : String(record[key])}</dd></div>)}</dl>{resource === 'Cliente' && hasPermission('sales:read') && <Link className="btn btn-primary mt-5" to={`/sales?customer=${record.id}`}>Historial de ventas<ChevronRight size={16} /></Link>}{resource === 'Proveedor' && hasPermission('purchases:read') && <Link className="btn btn-primary mt-5" to={`/purchases?supplier=${record.id}`}>Historial de compras<ChevronRight size={16} /></Link>}</Drawer>
}

export function DensityControl() {
  const [compact, setCompact] = useState(() => localStorage.getItem('boskepos:compact') === 'true')
  useEffect(() => { document.documentElement.classList.toggle('ops-compact', compact); localStorage.setItem('boskepos:compact', String(compact)); return () => document.documentElement.classList.remove('ops-compact') }, [compact])
  return <button className="btn btn-secondary" type="button" aria-pressed={compact} onClick={() => setCompact(!compact)}>{compact ? 'Vista compacta' : 'Vista cómoda'}</button>
}
