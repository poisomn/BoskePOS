import { useRef, useState } from 'react'
import { http } from '../../api/http'
import FormModal from '../../components/FormModal'
import { formatDateTime, formatMoney, formatNumber } from '../../utils/formatters'
import { getApiErrorMessage } from '../../utils/apiErrors'

export default function ReceivePurchase({ purchase, onSaved }) {
  const [open, setOpen] = useState(false), [rows, setRows] = useState([]), [notes, setNotes] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [key, setKey] = useState(() => crypto.randomUUID())
  const flight = useRef(false)
  function begin() { setRows(purchase.items.filter(item => item.received_quantity < item.quantity).map(item => ({ ...item, incoming: item.quantity-item.received_quantity, cost: item.unit_cost, display: formatNumber(item.unit_cost) }))); setNotes(''); setError(''); setKey(crypto.randomUUID()); setOpen(true) }
  function patch(id, change) { setRows(list => list.map(row => row.id === id ? { ...row, ...change } : row)); setKey(crypto.randomUUID()) }
  async function save(event) {
    event.preventDefault(); if (flight.current) return
    const lines = rows.filter(row => Number(row.incoming) > 0).map(row => ({ item_id: row.id, quantity: Number(row.incoming), unit_cost: row.cost }))
    if (!lines.length) { setError('Indica al menos una cantidad recibida.'); return }
    flight.current = true; setBusy(true); setError('')
    try { const { data } = await http.post(`/purchases/purchases/${purchase.id}/receive/`, { idempotency_key: key, lines, notes }); onSaved(data); setOpen(false) }
    catch (e) { setError(getApiErrorMessage(e)) } finally { flight.current = false; setBusy(false) }
  }
  return <><button className="btn btn-primary" onClick={begin}>Recibir productos por línea</button><FormModal isOpen={open} title={`Recepción de compra #${purchase.id}`} onClose={() => !busy && setOpen(false)}>{error && <p className="alert alert-error mb-4" role="alert">{error}</p>}<form className="space-y-4" onSubmit={save}><p className="section-note">Recibe solo lo que llegó. Una cantidad en cero queda pendiente. Revisa diferencias antes de registrar. Los costos se muestran redondeados; si no los editas se conserva su precisión original.</p>{rows.map(row => <div key={row.id} className="border rounded-lg p-4 space-y-3"><strong>{row.product_name}</strong><p className="section-note">Pedido {formatNumber(row.quantity)} · recibido {formatNumber(row.received_quantity)} · pendiente {formatNumber(row.quantity-row.received_quantity)}</p><div className="grid sm:grid-cols-2 gap-3"><label><span className="field-label">Cantidad que llegó ahora</span><input required className="input" type="number" min="0" step="1" max={row.quantity-row.received_quantity} value={row.incoming} disabled={busy} onChange={e => patch(row.id, { incoming: e.target.value })} /></label><label><span className="field-label">Costo unitario real · pesos</span><input required className="input" type="text" inputMode="numeric" pattern="[0-9.]+" value={row.display} disabled={busy} onChange={e => patch(row.id, { cost: e.target.value.replaceAll('.', ''), display: e.target.value })} /></label></div>{Number(row.cost) !== Number(row.unit_cost) && <p className="alert alert-warning">Diferencia de costo: pedido {formatMoney(row.unit_cost)} → recibido {formatMoney(row.cost)} por unidad.</p>}<p className="text-right">Esta recepción: <b>{formatMoney(Number(row.incoming)*Number(row.cost))}</b></p></div>)}<label className="block"><span className="field-label">Observación y diferencias</span><textarea className="textarea" maxLength={1000} value={notes} disabled={busy} onChange={e => { setNotes(e.target.value); setKey(crypto.randomUUID()) }} /></label><button className="btn btn-primary" disabled={busy}>{busy ? 'Registrando…' : 'Confirmar recepción e ingresar stock'}</button></form></FormModal></>
}

export function ReceiptHistory({ purchase }) {
  return <section className="surface p-5 space-y-4"><h2 className="section-title">Historial de recepciones</h2>{purchase.receipts?.map(receipt => <article key={receipt.id} className="border rounded-lg p-4"><strong>{formatDateTime(receipt.created_at)}</strong><p className="section-note">{receipt.user} · {receipt.notes || 'Sin observación'}</p>{receipt.lines.map(line => { const item = purchase.items.find(item => item.id === line.item_id); return <p key={line.item_id} className="text-sm mt-2">{item?.product_name || `Partida ${line.item_id}`} · {formatNumber(line.quantity)} unidades × {formatMoney(line.unit_cost)}</p> })}</article>)}{!purchase.receipts?.length && <p className="section-note">Sin recepciones detalladas. Las compras anteriores a esta versión conservan sus movimientos de inventario.</p>}</section>
}
