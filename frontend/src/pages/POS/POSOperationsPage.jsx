import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiMinus, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../../hooks/useAuth'
import FormModal from '../../components/FormModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import CustomerForm from '../Customers/CustomerForm'
import { http } from '../../api/http'
import { listCustomersPage, createCustomer } from '../../services/customersService'
import { quotePosCart, searchPosProducts } from '../../services/posService'
import { createSale, updateSale, completeSale, listSalesPage, getSale, discardSale } from '../../services/salesService'
import { cashGet } from '../../services/cashService'
import { formatMoney, formatPercent, formatDateTime } from '../../utils/formatters'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { ProductResults } from './ProductResults'
import CartMascot from './CartMascot'
import { mascotController } from '../../lib/mascotController'

const emptyQuote = { items: [], subtotal: 0, discount_total: 0, tax_total: 0, total: 0 }
const methods = { cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', transfer: 'Transferencia' }
function readDraft(key) { try { return JSON.parse(sessionStorage.getItem(key) || '{}') } catch { return {} } }

export default function POSOperationsPage() {
  const { user } = useAuth()
  const key = `boskepos:cart:${user.id}`
  const [draft] = useState(() => readDraft(key))
  const [items, setItems] = useState(draft.items || [])
  const [customer, setCustomer] = useState(draft.customer || null)
  const [pending, setPending] = useState(draft.pending || null)
  const [reason, setReason] = useState(draft.reason || '')
  const [notes, setNotes] = useState(draft.notes || '')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selected, setSelected] = useState(0)
  const [quote, setQuote] = useState(emptyQuote)
  const [quoted, setQuoted] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [session, setSession] = useState(null)
  const [cashLoaded, setCashLoaded] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState('')
  const [method, setMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [admins, setAdmins] = useState([])
  const [adminId, setAdminId] = useState('')
  const [pin, setPin] = useState('')
  const [suspended, setSuspended] = useState([])
  const [replace, setReplace] = useState(null)
  const [lastSale, setLastSale] = useState(null)
  const input = useRef(null)
  const checkout = useRef(draft.checkout || null)
  const inFlight = useRef(false)
  const ready = items.length > 0 && quoted === items && !quoteError
  const focus = () => requestAnimationFrame(() => input.current?.focus())
  useEffect(() => {
    input.current?.focus()
    cashGet('sessions/current').then(value => { setSession(value); setCashLoaded(true) }).catch(e => { setError(getApiErrorMessage(e)); setCashLoaded(true) })
    cashGet('sessions/authorizers').then(setAdmins).catch(e => setError(getApiErrorMessage(e)))
  }, [])
  useEffect(() => { sessionStorage.setItem(key, JSON.stringify({ items, customer, pending, reason, notes, checkout: checkout.current })) }, [key, items, customer, pending, reason, notes])
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsSearching(Boolean(search.trim()))
      try { const found = search.trim() ? await searchPosProducts(search.trim(), { signal: controller.signal }) : []; if (!controller.signal.aborted) { setResults(found); setSelected(0) } }
      catch (e) { if (!controller.signal.aborted) setError(getApiErrorMessage(e)) }
      finally { if (!controller.signal.aborted) setIsSearching(false) }
    }, 160)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search])
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(async () => {
      if (controller.signal.aborted) return
      setQuoteError('')
      if (!items.length) { setQuote(emptyQuote); setQuoted(items); return }
      try { const data = await quotePosCart(items, { signal: controller.signal }); if (!controller.signal.aborted) { setQuote(data); setQuoted(items) } }
      catch (e) { if (!controller.signal.aborted) setQuoteError(getApiErrorMessage(e)) }
    })
    return () => controller.abort()
  }, [items])
  useEffect(() => {
    if (error || quoteError) mascotController.react('error')
  }, [error, quoteError])
  const shortcut = useEffectEvent(event => {
    if (busy || modal || replace) return
    if (event.key === 'F4') { event.preventDefault(); focus() }
    if (event.key === 'F2' && ready && session) { event.preventDefault(); setError(''); setModal('pay') }
    if (event.key === 'F8' && items.length) { event.preventDefault(); setModal('clear') }
  })
  useEffect(() => { const listener = e => shortcut(e); window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener) }, [])
  function add(product) {
    if (busy) return
    if (items.filter(i => i.product_id === product.id).reduce((sum, i) => sum + i.quantity, 0) >= product.stock) { setError(`Stock insuficiente: ${product.name}. Disponible: ${product.stock}.`); focus(); return }
    setItems(current => {
      const existing = current.find(i => i.product_id === product.id && !i.discount_percent && !Number(i.discount_amount))
      return existing ? current.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i) : [...current, { line_id: crypto.randomUUID(), product_id: product.id, quantity: 1, discount_percent: 0, name: product.name, sku: product.sku }]
    })
    setSearch(''); setResults([]); setError(''); setLastSale(null); focus()
  }
  async function searchKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(n => Math.min(n + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(n => Math.max(n - 1, 0)) }
    if (e.key === 'Escape') setSearch('')
    if (e.key === 'Enter') {
      e.preventDefault()
      try { const found = await searchPosProducts(search.trim()); const product = found.find(p => p.barcode === search.trim() || p.sku === search.trim().toUpperCase()) || found[selected]; if (product) add(product); else setError('No se encontró un producto activo.') } catch (err) { setError(getApiErrorMessage(err)) }
    }
  }
  function change(id, patch) { if (!busy) setItems(current => current.map(i => i.line_id === id ? { ...i, ...patch } : i)) }
  function adjustQuantity(id, delta) {
    if (!busy) setItems(current => current.map(item => item.line_id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
  }
  function clear() { setItems([]); setPending(null); setCustomer(null); setReason(''); setNotes(''); setPaid(''); setPin(''); setAdminId(''); checkout.current = null; setModal(''); sessionStorage.removeItem(key); focus() }
  async function submit(status) {
    if (!ready || inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    const body = { items: items.map(i => ({ line_id: i.line_id, product_id: i.product_id, quantity: i.quantity, ...(i.discount_percent != null ? { discount_percent: i.discount_percent } : { discount_amount: i.discount_amount }), note: i.note || '' })), customer_id: customer?.id || null, status, payment_method: method, amount_paid: method === 'cash' ? (paid || quote.total) : quote.total, notes, discount_reason: reason }
    const signature = JSON.stringify(body)
    if (!checkout.current || checkout.current.signature !== signature) checkout.current = { signature, key: crypto.randomUUID() }
    body.idempotency_key = checkout.current.key
    sessionStorage.setItem(key, JSON.stringify({ items, customer, pending, reason, notes, checkout: checkout.current }))
    if (adminId) Object.assign(body, { admin_id: Number(adminId), pin })
    try {
      let sale
      if (pending) {
        const saved = await getSale(pending)
        if (saved.status === 'pending') await updateSale(pending, body)
        sale = status === 'completed' ? await completeSale(pending, { payment_method: method, amount_paid: body.amount_paid, notes, idempotency_key: body.idempotency_key, ...(adminId ? { admin_id: Number(adminId), pin } : {}) }) : saved
      } else sale = await createSale(body)
      clear(); setLastSale({ ...sale, paused: status === 'pending' })
    } catch (e) { setError(getApiErrorMessage(e)); setPin('') } finally { setBusy(false); inFlight.current = false }
  }
  async function showPending() { try { const data = await listSalesPage({ status: 'pending', pageSize: 100 }); setSuspended(data.results); setModal('pending') } catch (e) { setError(getApiErrorMessage(e)) } }
  async function recover(sale) {
    try {
      const contact = sale.customer ? (await http.get(`/customers/customers/${sale.customer}/`)).data : null
      setCustomer(contact); setPending(sale.id); setReason(sale.discount_reason || ''); setNotes(sale.notes || ''); setPaid(''); checkout.current = null
      setItems(sale.items.map(i => ({ line_id: crypto.randomUUID(), product_id: i.product, quantity: i.quantity, ...(i.discount_percent != null ? { discount_percent: Number(i.discount_percent) } : { discount_amount: i.discount_total }), name: i.product_name, sku: i.product_sku, note: i.note })))
      setModal(''); setReplace(null); setError(''); setLastSale(null); setPin(''); setAdminId(''); focus()
    } catch (e) { setError(getApiErrorMessage(e)) }
  }
  const received = Number(paid || quote.total)
  return <div className="space-y-4">
    <header className="surface p-4 flex flex-wrap justify-between items-center gap-3"><div><p className="section-note">BoskePOS · Punto de venta</p><h1 className="text-2xl font-semibold">{session?.register_name || 'Venta de mostrador'}</h1><p className="section-note">{user.email} · {session ? `Turno #${session.id}` : 'Sin turno abierto'}{pending ? ` · Pendiente #${pending}` : ''}</p></div><div className="flex gap-2"><button className="btn btn-secondary" disabled={busy} onClick={showPending}>En espera</button><Link className="btn btn-secondary" to="/cash">{session ? 'Movimientos / cerrar caja' : 'Abrir caja'}</Link></div></header>
    {cashLoaded && !session && <div className="alert alert-warning">Abre una caja para cobrar. Puedes preparar el carrito.</div>}
    {error && <div className="alert alert-error" role="alert">{error}</div>}{quoteError && <div className="alert alert-error" role="alert">{quoteError}</div>}
    {lastSale && <div className="alert alert-success flex gap-3 items-center" role="status">{lastSale.paused ? `Venta #${lastSale.id} guardada en espera.` : <>Venta #{lastSale.id} registrada · Vuelto: <strong>{formatMoney(lastSale.change_amount)}</strong><Link className="btn btn-secondary" to={`/sales/${lastSale.id}`}>Ver / imprimir</Link></>}</div>}
    <div className="pos-operation-grid"><section className="min-w-0 space-y-4"><div className="surface p-4"><label htmlFor="pos-search" className="field-label">Buscar o escanear · F4</label><div className="relative"><FiSearch className="absolute left-4 top-5" /><input ref={input} id="pos-search" className="input h-14 pl-11 text-lg" autoComplete="off" disabled={busy} placeholder="Nombre, SKU o código de barras" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={searchKey} /></div><p className="section-note mt-2">↑ ↓ Seleccionar · Enter Agregar · F2 Cobrar · F8 Limpiar</p></div>
      {search && <ProductResults error={error} isProcessing={isSearching} results={results} search={search} selectedIndex={selected} onAddProduct={add} />}
      <section className="surface overflow-hidden"><div className="p-4 flex justify-between items-center border-b"><div className="flex items-center gap-2"><h2 className="section-title">Carrito · {items.length} líneas</h2>{items.length > 0 && <CartMascot compact error={error || quoteError} isProcessing={busy || !ready} />}</div><button className="btn btn-secondary" disabled={!items.length || busy} onClick={() => setModal('clear')}>Limpiar</button></div>{!items.length ? <CartMascot error={error || quoteError} isProcessing={busy || isSearching} /> : <div className="overflow-auto"><table className="data-table pos-sale-table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Total</th><th>Acción</th></tr></thead><tbody>{items.map(i => {
        const line = quote.items.find(row => row.line_id === i.line_id)
        return <tr key={i.line_id}><td><strong>{line?.name || i.name}</strong><p className="section-note">{line?.sku || i.sku} · Stock {line?.available_stock ?? '…'}</p><p className="section-note">IVA {formatPercent(line?.tax_rate ?? 19)}</p></td><td>
          <div className="inline-flex items-center gap-1">
            <button type="button" className="icon-btn shrink-0" aria-label={`Disminuir cantidad de ${i.name}`} disabled={busy || i.quantity <= 1} onClick={() => adjustQuantity(i.line_id, -1)}><FiMinus aria-hidden="true" /></button>
            <input className="input w-16 text-center" aria-label={`Cantidad ${i.name}`} type="number" min="1" step="1" disabled={busy} value={i.quantity} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n > 0) change(i.line_id, { quantity: n }) }} />
            <button type="button" className="icon-btn shrink-0" aria-label={`Aumentar cantidad de ${i.name}`} disabled={busy || (line && items.filter(item => item.product_id === i.product_id).reduce((sum, item) => sum + item.quantity, 0) >= Number(line.available_stock))} onClick={() => adjustQuantity(i.line_id, 1)}><FiPlus aria-hidden="true" /></button>
          </div>
        </td><td>{line ? formatMoney(line.unit_price) : '…'}</td><td>{i.discount_percent != null ? <label className="flex gap-1 items-center"><input className="input w-20" aria-label={`Descuento porcentaje ${i.name}`} type="number" min="0" max="100" step="1" disabled={busy} value={i.discount_percent} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 0 && n <= 100) change(i.line_id, { discount_percent: n, discount_amount: undefined }) }} />%</label> : <button className="btn btn-secondary" disabled={busy} onClick={() => change(i.line_id, { discount_percent: 0, discount_amount: undefined })}>{formatMoney(i.discount_amount)} · editar %</button>}</td><td><strong>{line ? formatMoney(line.line_total) : '…'}</strong></td><td><button className="icon-btn" disabled={busy} aria-label={`Eliminar ${i.name}`} onClick={() => { setItems(items.filter(row => row.line_id !== i.line_id)); focus() }}><FiTrash2 /></button></td></tr>
      })}</tbody></table></div>}</section></section>
      <aside className="surface pos-sale-summary p-5 space-y-4"><h2 className="section-title">Resumen de venta</h2><button className="w-full border rounded-lg p-3 text-left" disabled={busy} onClick={() => setModal('customer')}><span className="section-note">Cliente · Buscar / agregar</span><strong className="block">{customer?.name || 'Cliente final'}</strong><span className="section-note">{customer?.rut || 'Registro opcional'}</span></button>
        <div className="space-y-2 text-sm">{[['Subtotal con IVA', quote.subtotal], ['Descuentos', quote.discount_total], ['Redondeo al peso', quote.rounding_adjustment || 0], ['Neto', Number(quote.total) - Number(quote.tax_total)], ['IVA incluido', quote.tax_total]].map(([label, amount]) => <div key={label} className="flex justify-between"><span>{label}</span><strong>{formatMoney(amount, label === 'Neto' || label === 'IVA incluido' ? 0 : 2)}</strong></div>)}</div><div className="border-t pt-4 flex justify-between items-center"><span>Total</span><strong className="text-3xl text-[var(--color-brand-700)]">{formatMoney(quote.total)}</strong></div>
        {items.length > 0 && !ready && <p role="status" className="section-note">{quoteError ? 'Corrige el carrito para continuar.' : 'Recalculando…'}</p>}
        <button className="btn btn-primary w-full h-14 text-lg" disabled={!ready || !session || busy} onClick={() => { setError(''); setModal('pay') }}>Cobrar · F2</button><button className="btn btn-secondary w-full" disabled={!ready || busy} onClick={() => { setError(''); setModal('pause') }}>Pausar venta</button><label className="block"><span className="field-label">Observación (opcional)</span><textarea className="textarea" maxLength={1000} value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} /></label><p className="section-note">Comprobante interno</p>
      </aside></div>
    <CustomerPicker open={modal === 'customer'} close={() => { setModal(''); focus() }} select={value => { setCustomer(value); setModal(''); focus() }} />
    <FormModal isOpen={modal === 'pay' || modal === 'pause'} title={modal === 'pause' ? 'Guardar venta en espera' : 'Completar venta'} onClose={() => { if (!busy) { setModal(''); setPin(''); focus() } }}>{error && <div className="alert alert-error mb-3" role="alert">{error}</div>}<form className="space-y-4" onSubmit={e => { e.preventDefault(); submit(modal === 'pause' ? 'pending' : 'completed') }}><p className="section-note">{customer?.name || 'Cliente final'}</p><p className="text-4xl font-semibold text-[var(--color-brand-700)]">{formatMoney(quote.total)}</p>
      {modal === 'pay' && <><div className="grid grid-cols-2 gap-2">{Object.entries(methods).map(([id, label]) => <button className={`btn ${method === id ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={method === id} disabled={busy} type="button" key={id} onClick={() => { setMethod(id); setPaid('') }}>{label}</button>)}</div>{method === 'cash' && <><label className="block"><span className="field-label">Efectivo recibido</span><input className="input" type="number" min={quote.total} step="1" value={paid} disabled={busy} placeholder={`Exacto: ${formatMoney(quote.total)}`} onChange={e => setPaid(e.target.value)} /></label><div className="flex flex-wrap gap-2">{[Number(quote.total), ...[5000, 10000, 20000].filter(n => n > Number(quote.total))].map((n, index) => <button className="btn btn-secondary" type="button" key={index} disabled={busy} onClick={() => setPaid(String(n))}>{index ? formatMoney(n) : 'Exacto'}</button>)}</div><p className="rounded-lg border p-4">{received < Number(quote.total) ? 'Restante' : 'Vuelto'}: <strong className="text-xl">{formatMoney(Math.abs(received - Number(quote.total)))}</strong></p></>}</>}
      {Number(quote.discount_total) > 0 && <><label className="block"><span className="field-label">Motivo del descuento</span><input required className="input" maxLength={500} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} /></label><details><summary className="cursor-pointer">Autorizar descuento excepcional</summary><label className="block mt-3"><span className="field-label">Administrador</span><select className="select" disabled={busy} value={adminId} onChange={e => setAdminId(e.target.value)}><option value="">Sin autorización adicional</option>{admins.map(person => <option key={person.id} value={person.id}>{person.email}</option>)}</select></label>{adminId && <label className="block mt-3"><span className="field-label">PIN de 4 dígitos</span><input className="input" required type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} disabled={busy} value={pin} onChange={e => setPin(e.target.value)} /></label>}</details></>}
      <button className="btn btn-primary w-full h-12" disabled={busy || !ready || (modal === 'pay' && (!session || (method === 'cash' && received < Number(quote.total))))}>{busy ? 'Registrando…' : modal === 'pause' ? 'Guardar en espera' : 'Confirmar y registrar'}</button></form></FormModal>
    <FormModal isOpen={modal === 'pending'} title="Ventas en espera" onClose={() => setModal('')}>{error && <p role="alert" className="alert alert-error">{error}</p>}<div className="space-y-3">{suspended.map(sale => <div key={sale.id} className="border rounded-lg p-3 flex gap-3 items-center"><div className="flex-1"><strong>#{sale.id} · {sale.customer_name || 'Cliente final'}</strong><p className="section-note">{sale.user_email} · {formatDateTime(sale.created_at)}</p><strong>{formatMoney(sale.total)}</strong></div><button className="btn btn-primary" onClick={() => items.length ? setReplace(sale) : recover(sale)}>Retomar</button><button className="icon-btn" aria-label={`Descartar venta ${sale.id}`} onClick={() => setReplace({ ...sale, discard: true })}><FiTrash2 /></button></div>)}{!suspended.length && <p>No hay ventas en espera.</p>}</div></FormModal>
    <ConfirmDialog isOpen={modal === 'clear'} title="Limpiar carrito" description="Se quitarán los productos del carrito actual. Las ventas guardadas seguirán en espera." onConfirm={clear} onCancel={() => setModal('')} confirmLabel="Limpiar" />
    <ConfirmDialog isOpen={!!replace} title={replace?.discard ? 'Descartar venta en espera' : 'Reemplazar carrito actual'} description={replace?.discard ? 'Se eliminará esta venta pendiente.' : 'El carrito tiene productos. Confirma si quieres reemplazarlo por la venta guardada.'} isSubmitting={busy} onCancel={() => setReplace(null)} confirmLabel="Confirmar" onConfirm={async () => { if (replace.discard) { setBusy(true); try { await discardSale(replace.id); setReplace(null); await showPending() } catch (e) { setError(getApiErrorMessage(e)) } finally { setBusy(false) } } else await recover(replace) }} />
  </div>
}

function CustomerPicker({ open, close, select }) {
  const { hasPermission } = useAuth()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  useEffect(() => {
    let active = true
    if (!open) return
    const timer = setTimeout(() => listCustomersPage({ search, isActive: true, pageSize: 20 }).then(data => { if (active) setResults(data.results) }).catch(e => { if (active) setError(getApiErrorMessage(e)) }), 160)
    return () => { active = false; clearTimeout(timer) }
  }, [open, search])
  return <FormModal isOpen={open} title={creating ? 'Crear y asociar cliente' : 'Asociar cliente'} onClose={() => { if (!busy) { setCreating(false); setError(''); close() } }}>{error && <div className="alert alert-error mb-3" role="alert">{error}</div>}{creating ? <CustomerForm fieldErrors={fields} isSubmitting={busy} onCancel={() => setCreating(false)} onSubmit={async payload => { setBusy(true); setError(''); setFields({}); try { const person = await createCustomer(payload); select(person); setCreating(false) } catch (e) { setFields(e.response?.data || {}); setError(getApiErrorMessage(e)) } finally { setBusy(false) } }} /> : <div className="space-y-3"><label className="block"><span className="field-label">Nombre, RUT o correo</span><input className="input" placeholder="Buscar cliente" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="flex gap-2"><button className="btn btn-secondary" onClick={() => select(null)}>Cliente final</button>{hasPermission('customers:write') && <button className="btn btn-primary" onClick={() => { setCreating(true); setError(''); setFields({}) }}>Agregar cliente</button>}</div><div className="max-h-72 overflow-auto space-y-2">{results.map(person => <button key={person.id} className="border rounded-lg w-full p-3 text-left" onClick={() => select(person)}><strong>{person.name}</strong><p className="section-note">{person.rut || 'Sin RUT'} · {person.email}</p></button>)}{!results.length && <p className="section-note">No hay clientes que coincidan.</p>}</div></div>}</FormModal>
}
