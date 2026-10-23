import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import JsBarcode from 'jsbarcode'
import { CreditCard, FileText, Minus, Package, Plus, Printer, RefreshCw, Search, Ticket } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { PageHeading } from '../../components/OperationsUI'
import FormModal from '../../components/FormModal'
import Mascot from '../../components/Mascot'
import { createStation, getTicket, issueTicket, listStations, listTickets, ticketAction, updateStation } from '../../services/presalesService'
import { listCustomersPage } from '../../services/customersService'
import { quotePosCart, searchPosProducts } from '../../services/posService'
import { cashGet } from '../../services/cashService'
import { formatDateTime, formatMoney, formatNumber } from '../../utils/formatters'
import { getApiErrorMessage } from '../../utils/apiErrors'

const labels = { pending: 'Pendiente de cobro', claimed: 'En caja', paid: 'Pagado', cancelled: 'Cancelado', expired: 'Vencido' }
const methods = { debit: 'Débito', cash: 'Efectivo', credit: 'Crédito', transfer: 'Transferencia' }
const empty = { items: [], total: 0 }

export default function PresalesPage({ checkout = false }) {
  const { user, hasPermission } = useAuth()
  const draftKey = `boskepos:presale:${user.id}`
  const [draft] = useState(() => { try { return JSON.parse(sessionStorage.getItem(draftKey) || '{}') } catch { return {} } })
  const [items, setItems] = useState(draft.items || [])
  const [station, setStation] = useState(draft.station || '')
  const [stations, setStations] = useState([])
  const [customer, setCustomer] = useState(draft.customer || '')
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [notes, setNotes] = useState(draft.notes || '')
  const [issueKey, setIssueKey] = useState(() => draft.issueKey || crypto.randomUUID())
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [quote, setQuote] = useState(empty)
  const [quoted, setQuoted] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [queue, setQueue] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [state, setState] = useState('open')
  const [selected, setSelected] = useState(null)
  const [method, setMethod] = useState('debit')
  const [received, setReceived] = useState('')
  const [confirm, setConfirm] = useState('')
  const [reason, setReason] = useState('')
  const [name, setName] = useState('')
  const [session, setSession] = useState(null)
  const inFlight = useRef(false)
  const paymentKeys = useRef(new Map())
  const input = useRef(null)
  const ready = items.length > 0 && quoted === items && !quoteError
  const selectedId = selected?.id
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer) }, [])
  const owned = selected?.effective_status === 'claimed' && selected.claimed_by === user.id && new Date(selected.claim_until).getTime() > now

  useEffect(() => { sessionStorage.setItem(draftKey, JSON.stringify({ items, station, customer, notes, issueKey })) }, [draftKey, items, station, customer, notes, issueKey])
  useEffect(() => {
    let active = true
    listStations().then(boxes => { if (active) setStations(boxes) }).catch(e => { if (active) setError(getApiErrorMessage(e)) })
    if (checkout) cashGet('sessions/current').then(value => { if (active) setSession(value) }).catch(e => { if (active) setError(getApiErrorMessage(e)) })
    return () => { active = false }
  }, [checkout])
  useEffect(() => {
    if (checkout) return
    let active = true
    const timer = setTimeout(() => listCustomersPage({ search: customerSearch, pageSize: 100, isActive: true }).then(data => { if (active) setCustomers(data.results) }).catch(e => { if (active) setError(getApiErrorMessage(e)) }), 180)
    return () => { active = false; clearTimeout(timer) }
  }, [checkout, customerSearch])
  const reload = useCallback(async (signal) => {
    const data = await listTickets({ search: checkout ? search : '', status: state, page, page_size: 10 }, signal)
    if (!signal?.aborted) { setQueue(data.results); setCount(data.count) }
  }, [checkout, search, state, page])
  useEffect(() => {
    const controller = new AbortController()
    const refresh = () => reload(controller.signal).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)) })
    refresh()
    const interval = setInterval(() => { if (!document.hidden) refresh() }, 15000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [reload])
  useEffect(() => {
    if (!selectedId) return
    let active = true
    const interval = setInterval(() => { if (!document.hidden) getTicket(selectedId).then(value => { if (active) setSelected(value) }).catch(e => { if (active) setError(getApiErrorMessage(e)) }) }, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [selectedId])
  useEffect(() => {
    if (checkout) return
    const controller = new AbortController()
    const timer = setTimeout(async () => { try { const data = await searchPosProducts(search, { signal: controller.signal }); if (!controller.signal.aborted) setResults(data) } catch (e) { if (!controller.signal.aborted) setError(getApiErrorMessage(e)) } }, 180)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [search, checkout])
  useEffect(() => {
    if (checkout) return
    const controller = new AbortController()
    queueMicrotask(async () => {
      if (controller.signal.aborted) return
      setQuoteError('')
      if (!items.length) { setQuote(empty); setQuoted(items); return }
      try { const data = await quotePosCart(items, { signal: controller.signal }); if (!controller.signal.aborted) { setQuote(data); setQuoted(items) } }
      catch (e) { if (!controller.signal.aborted) setQuoteError(getApiErrorMessage(e)) }
    })
    return () => controller.abort()
  }, [items, checkout])
  function changed() { setIssueKey(crypto.randomUUID()); setError(''); setMessage('') }
  function add(product, fromScanner = false) {
    if (inFlight.current && !fromScanner) return
    if ((items.find(line => line.product_id === product.id)?.quantity || 0) >= product.stock) { setError(`Stock insuficiente para ${product.name}. Disponible: ${formatNumber(product.stock)}.`); return }
    changed()
    setItems(list => list.some(line => line.product_id === product.id) ? list.map(line => line.product_id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...list, { product_id: product.id, quantity: 1, line_id: crypto.randomUUID(), name: product.name }])
    setSearch(''); input.current?.focus()
  }
  async function run(work) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setMessage('')
    try { await work(); await reload() } catch (e) { setError(getApiErrorMessage(e)) } finally { inFlight.current = false; setBusy(false) }
  }
  function operation(action, data = {}) { return run(async () => { const value = await ticketAction(selected.id, action, data); setSelected(value); setConfirm(''); setReason(''); if (action === 'complete') { setReceipt(value); setMessage(`${value.code} cobrado. Venta #${value.sale.id} registrada.`) } else setMessage('Ticket actualizado.') }) }
  async function emit() {
    await run(async () => {
      const ticket = await issueTicket({ station: Number(station), customer_id: customer ? Number(customer) : null, notes, items, idempotency_key: issueKey })
      setReceipt(ticket); setItems([]); setCustomer(''); setNotes(''); setIssueKey(crypto.randomUUID()); setMessage(`${ticket.code} enviado a caja de venta.`)
    })
  }
  function payment() {
    const id = `${selected.id}:${method}:${received}`
    if (!paymentKeys.current.has(id)) paymentKeys.current.set(id, crypto.randomUUID())
    operation('complete', { payment_method: method, ...(method === 'cash' ? { amount_paid: received } : {}), idempotency_key: paymentKeys.current.get(id) })
  }
  const hasError = error || quoteError
  return <div className="space-y-6"><PageHeading section={checkout ? 'Caja de venta' : 'Cajas de preventa'} title={checkout ? 'Todo listo para cobrar' : 'Prepara la compra. Agiliza la caja.'} description={checkout ? 'Recupera, revisa y cobra un ticket con tu turno de caja.' : 'El vendedor arma el pedido y envía un ticket numerado a venta.'}>{checkout ? <Link className="btn btn-secondary" to="/pos">Venta directa</Link> : <Link className="btn btn-secondary" to="/checkout">Ver caja de venta</Link>}</PageHeading>
    {hasError && <div className="alert alert-error items-center" role="alert"><Mascot state="error" size={52} />{hasError}</div>}{message && <div className="alert alert-success" role="status">{message}</div>}
    {checkout && !session && <div className="alert alert-warning">Abre tu turno antes de tomar o cobrar tickets. <Link className="underline" to="/cash">Abrir caja</Link></div>}
    {!checkout && <div className="ops-ticket-queue"><section className="surface p-5 space-y-5"><div className="grid sm:grid-cols-2 gap-4"><label><span className="field-label">Estación de preventa</span><select className="select" required value={station} disabled={busy} onChange={e => { setStation(e.target.value); changed() }}><option value="">Selecciona estación</option>{stations.filter(box => box.is_active).map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></label><label><span className="field-label">Cliente</span><input className="input mb-2" aria-label="Buscar cliente por nombre o RUT" placeholder="Buscar por nombre o RUT" disabled={busy} value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setCustomer(''); changed() }} /><select className="select" value={customer} disabled={busy} onChange={e => { setCustomer(e.target.value); changed() }}><option value="">Consumidor final</option>{customers.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><small className="section-note">Busca por nombre o RUT para filtrar los contactos.</small></label></div><label className="block"><span className="field-label">Buscar o escanear producto · Enter agrega el primer resultado</span><div className="flex gap-2"><Search size={20} className="self-center" /><input ref={input} className="input" placeholder="Nombre, SKU o código" disabled={busy} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { e.preventDefault(); run(async () => { const found = await searchPosProducts(search.trim()); const product = found.find(item => item.sku === search.toUpperCase() || item.barcode === search) || found[0]; if (product) add(product, true); else setError('No se encontró un producto activo.'); }) } }} /></div></label><div className="max-h-[550px] overflow-auto">{results.map(product => <div key={product.id} className="flex gap-3 py-4 border-t items-center"><span className="ops-title-icon"><Package size={19} /></span><div className="flex-1 min-w-0"><strong className="block">{product.name}</strong><span className="section-note">{product.sku} · Stock {formatNumber(product.stock)}</span></div><strong>{formatMoney(product.sale_price)}</strong><button className="icon-btn" disabled={busy} type="button" aria-label={`Agregar ${product.name}`} onClick={() => add(product)}><Plus size={17} /></button></div>)}{!results.length && <p className="section-note py-8 text-center">Sin coincidencias.</p>}</div></section>
      <aside className="surface p-5 space-y-4 ops-ticket-summary"><h2 className="section-title">Ticket de preventa</h2>{items.map(line => { const calculated = quote.items.find(item => item.line_id === line.line_id); return <div key={line.line_id} className="border-t py-3"><strong>{line.name}</strong><div className="flex items-center justify-between mt-3 gap-3"><div className="flex items-center gap-3"><button className="icon-btn" aria-label={`Quitar una unidad de ${line.name}`} disabled={busy} onClick={() => { changed(); setItems(list => list.map(item => item.line_id === line.line_id ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0)) }}><Minus size={15} /></button><b>{formatNumber(line.quantity)}</b><button className="icon-btn" aria-label={`Agregar una unidad de ${line.name}`} disabled={busy} onClick={() => { changed(); setItems(list => list.map(item => item.line_id === line.line_id ? { ...item, quantity: item.quantity + 1 } : item)) }}><Plus size={15} /></button></div><b>{calculated ? formatMoney(calculated.line_total) : 'Recalculando…'}</b></div></div>})}{!items.length && <div className="empty-state"><Mascot state={hasError ? 'error' : 'reposo'} size={90} /><p>La próxima venta empieza aquí.</p></div>}<label className="block"><span className="field-label">Observaciones</span><textarea className="textarea" maxLength={1000} value={notes} disabled={busy} onChange={e => { setNotes(e.target.value); changed() }} /></label><div className="flex justify-between border-t pt-4"><span>Total con IVA</span><strong className="text-3xl text-[var(--primary)]">{formatMoney(ready ? quote.total : 0)}</strong></div><button className="btn btn-primary h-12" disabled={!ready || !station || busy} onClick={emit}><Ticket size={18} />{busy ? 'Emitiendo…' : 'Emitir y enviar a venta'}</button><p className="section-note">No registra pago ni reserva stock. Vence al cierre del día o según la estación. Se valida stock y precio al cobrar.</p></aside></div>}
    <section className="surface p-5 space-y-4"><div className="ops-table-top"><div><h2 className="section-title">{checkout ? 'Cola de preventas' : 'Tickets emitidos'}</h2><p className="section-note">{formatNumber(count)} resultados · actualización cada 15 segundos</p></div><div className="flex flex-wrap gap-2"><select aria-label="Estado de tickets" className="select w-auto" value={state} onChange={e => { setState(e.target.value); setPage(1) }}><option value="open">Por cobrar</option><option value="paid">Pagados</option><option value="cancelled">Cancelados</option><option value="expired">Vencidos</option><option value="">Todos</option></select><button className="icon-btn" aria-label="Actualizar cola" disabled={busy} onClick={() => run(async () => {})}><RefreshCw size={17} /></button></div></div>
    {checkout && <label className="block"><span className="field-label">Buscar o escanear ticket</span><input className="input" placeholder="PV-00000001, cliente o estación" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { e.preventDefault(); run(async () => { const data = await listTickets({ search: search.trim(), status: 'open', page_size: 10 }); const ticket = data.results.find(item => item.code.toUpperCase() === search.toUpperCase() || String(item.id) === search.trim()) || (data.results.length === 1 ? data.results[0] : null); if (ticket) setSelected(ticket); else setError('No se encontró un ticket único pendiente. Revisa el código.'); }) } }} /></label>}
    <div className={checkout ? 'ops-ticket-queue' : ''}><div>{queue.map(ticket => <button type="button" disabled={busy} className={`ops-ticket ${selected?.id === ticket.id ? 'selected' : ''}`} key={ticket.id} onClick={() => { setSelected(ticket); setReceived(''); setError(''); if (!checkout) setReceipt(ticket) }}><div><strong>{ticket.code}</strong><small>{ticket.sale.customer_name || 'Consumidor final'} · {ticket.station_name}</small><small>{ticket.seller} · {formatDateTime(ticket.created_at)}</small>{['pending', 'claimed'].includes(ticket.effective_status) && <small>Espera: {formatNumber(Math.max(0, Math.floor((now-new Date(ticket.created_at).getTime())/60000)))} min{new Date(ticket.expires_at).getTime()-now <= 15*60000 && <strong className="text-amber-700 block">Próximo a vencer · {formatDateTime(ticket.expires_at)}</strong>}</small>}</div><div className="text-right"><b>{formatMoney(ticket.sale.total)}</b><small>{labels[ticket.effective_status]}</small></div></button>)}{!queue.length && <div className="empty-state"><Mascot state="reposo" size={65} /><p>No hay tickets para estos filtros.</p></div>}<div className="flex justify-between gap-2"><button className="btn btn-secondary" disabled={page <= 1 || busy} onClick={() => setPage(n => n-1)}>Anterior</button><span className="section-note">Página {formatNumber(page)} de {formatNumber(Math.max(1, Math.ceil(count/10)))}</span><button className="btn btn-secondary" disabled={page*10 >= count || busy} onClick={() => setPage(n => n+1)}>Siguiente</button></div></div>
    {checkout && <aside className="surface p-5 space-y-4 ops-ticket-summary">{selected ? <><h2 className="section-title">{selected.code}</h2><p className="section-note">{selected.sale.customer_name || 'Consumidor final'} · {selected.station_name}</p><span className="badge badge-info">{labels[selected.effective_status]}</span>{selected.claimed_by_email && selected.effective_status === 'claimed' && <p className="section-note">En atención: {selected.claimed_by_email}<br />Toma válida hasta {formatDateTime(selected.claim_until)}</p>}{selected.sale.items.map(line => <div key={line.id} className="flex justify-between gap-4 border-t pt-3"><div><strong>{line.product_name}</strong><p className="section-note">{formatNumber(line.quantity)} × {formatMoney(line.unit_price)}</p></div><b>{formatMoney(line.line_total)}</b></div>)}<div className="flex justify-between border-t pt-4"><span>Total con IVA</span><b className="text-3xl text-[var(--primary)]">{formatMoney(selected.sale.total)}</b></div>
    {selected.effective_status === 'pending' && <button className="btn btn-primary" disabled={busy || !session} onClick={() => operation('take')}>Tomar en esta caja</button>}{owned && <><label><span className="field-label">Medio de pago</span><select className="select" value={method} disabled={busy} onChange={e => setMethod(e.target.value)}>{Object.entries(methods).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>{method === 'cash' && <><label className="block"><span className="field-label">Efectivo recibido</span><input className="input" type="number" min="0" step="1" value={received} disabled={busy} onChange={e => setReceived(e.target.value)} /></label><p>Vuelto <b>{formatMoney(Math.max(0, Number(received)-Number(selected.sale.total)))}</b></p></>}<button className="btn btn-primary h-12" disabled={busy || !session || (method === 'cash' && Number(received) < Number(selected.sale.total))} onClick={() => setConfirm('pay')}><CreditCard size={18} />Cobrar {formatMoney(selected.sale.total)}</button><button className="btn btn-secondary" disabled={busy} onClick={() => operation('release')}>Liberar ticket</button></>}
    {hasPermission('presales:write') && ['pending', 'claimed'].includes(selected.effective_status) && <button className="btn btn-secondary" disabled={busy} onClick={() => setConfirm('reprice')}>Revisar precios actuales</button>}{hasPermission('sales:cancel') && ['pending', 'claimed'].includes(selected.effective_status) && <button className="btn btn-secondary" disabled={busy} onClick={() => setConfirm('cancel')}>Cancelar ticket con motivo</button>}<button className="btn btn-secondary" onClick={() => setReceipt(selected)}><FileText size={16} />Ver ticket</button>{selected.effective_status === 'paid' && <Link className="btn btn-primary" to={`/sales/${selected.sale.id}`}>Ver comprobante de venta</Link>}</> : <div className="empty-state"><Ticket size={32} /><p>Selecciona un ticket para revisar su detalle.</p></div>}</aside>}</div></section>
    {!checkout && hasPermission('settings:write') && <section className="surface p-5 space-y-4"><h2 className="section-title">Estaciones de preventa</h2><form className="flex gap-2" onSubmit={e => { e.preventDefault(); run(async () => { await createStation({ name }); setStations(await listStations()); setName(''); setMessage('Estación creada.') }) }}><input className="input" required maxLength={100} aria-label="Nombre de estación" placeholder="Mesón, Patio, Atención empresas…" value={name} onChange={e => setName(e.target.value)} /><button className="btn btn-primary" disabled={busy}>Crear estación</button></form>{stations.map(box => <Station key={box.id} box={box} busy={busy} save={changes => run(async () => { await updateStation(box.id, changes); setStations(await listStations()); setMessage('Estación actualizada.') })} />)}</section>}
    <FormModal isOpen={!!receipt} title={receipt?.code || 'Ticket'} onClose={() => setReceipt(null)}>{receipt && <><Receipt ticket={receipt} /><div className="ops-no-print flex flex-wrap gap-3 mt-6"><button className="btn btn-primary" onClick={() => window.print()}><Printer size={17} />Imprimir ticket</button><Link className="btn btn-secondary" to="/checkout">Ir a caja de venta</Link></div></>}</FormModal>
    <FormModal isOpen={!!confirm} title={confirm === 'cancel' ? 'Cancelar preventa' : confirm === 'reprice' ? 'Revalidar precios' : 'Confirmar pago'} onClose={() => !busy && setConfirm('')}>{hasError && <p role="alert" className="alert alert-error mb-4">{hasError}</p>}{confirm === 'cancel' ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); operation('cancel', { reason }) }}><label><span className="field-label">Motivo</span><textarea className="textarea" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button className="btn btn-danger" disabled={busy}>Cancelar ticket</button></form> : confirm === 'reprice' ? <><p className="section-note mb-4">Se recalcularán las partidas con los precios e impuestos vigentes. Revisa el nuevo total antes de tomar o cobrar el ticket.</p><button className="btn btn-primary" disabled={busy} onClick={() => operation('reprice')}>Actualizar a precios actuales</button></> : <><p className="text-3xl mb-3">{formatMoney(selected?.sale.total)}</p><p className="section-note mb-5">{selected?.code} · {methods[method]} · {session?.register_name}</p><button className="btn btn-primary" disabled={busy} onClick={payment}>{busy ? 'Registrando…' : 'Confirmar y registrar pago'}</button></>}</FormModal>
  </div>
}

function Station({ box, save, busy }) {
  const [minutes, setMinutes] = useState(String(box.valid_minutes))
  return <form className="grid sm:grid-cols-[1fr_180px_auto_auto] items-end gap-3 border-t pt-4" onSubmit={e => { e.preventDefault(); save({ valid_minutes: Number(minutes) }) }}><div><strong>{box.name}</strong><p className="section-note">{box.is_active ? 'Activa' : 'Inactiva'}</p></div><label><span className="field-label">Vigencia en minutos · 0 = fin del día</span><input required className="input" type="number" min="0" max="1440" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} /></label><button className="btn btn-secondary" disabled={busy}>Guardar vigencia</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save({ is_active: !box.is_active })}>{box.is_active ? 'Desactivar' : 'Activar'}</button></form>
}

function Receipt({ ticket }) {
  const barcode = useRef(null)
  useEffect(() => { JsBarcode(barcode.current, ticket.code, { format: 'CODE128', width: 2, height: 48, fontSize: 13, margin: 10 }) }, [ticket.code])
  return <section className="ops-receipt"><img src="/brand/boskepos-logo.png" alt="BoskePOS" /><p>TICKET INTERNO DE PREVENTA</p><h2>{ticket.code}</h2><p>{ticket.station_name}<br />{ticket.seller}<br />{formatDateTime(ticket.created_at)}<br />{ticket.sale.customer_name || 'Consumidor final'}</p>{ticket.sale.items.map(line => <div key={line.id}><span>{line.product_name}<small>{formatNumber(line.quantity)} × {formatMoney(line.unit_price)}</small></span><b>{formatMoney(line.line_total)}</b></div>)}<div><b>Total con IVA</b><b>{formatMoney(ticket.sale.total)}</b></div><svg className="ops-barcode" ref={barcode} role="img" aria-label={`Código de barras ${ticket.code}`} /><p>Válido hasta {formatDateTime(ticket.expires_at)}<br />Presentar en caja de venta.<br />No acredita pago ni es documento tributario.<br />Estado: {labels[ticket.effective_status]}</p></section>
}
