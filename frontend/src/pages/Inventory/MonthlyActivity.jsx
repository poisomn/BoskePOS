import { useEffect, useState } from 'react'
import { http } from '../../api/http'
import { formatMoney } from '../../utils/formatters'
import { getApiErrorMessage } from '../../utils/apiErrors'
import FormModal from '../../components/FormModal'

export default function MonthlyActivity({ product, onClose }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!product) return
    const controller = new AbortController()
    http.get(`/inventory/products/${product.id}/monthly-activity/`, { params: { year }, signal: controller.signal }).then(({ data }) => { setData(data); setError('') }).catch(e => { if (!controller.signal.aborted) setError(getApiErrorMessage(e)) })
    return () => controller.abort()
  }, [product, year])
  return <FormModal isOpen={!!product} title={`Compras, ventas y stock · ${product?.name || ''}`} onClose={onClose}>{error && <div className="alert alert-error" role="alert">{error}</div>}<label className="block mb-3"><span className="field-label">Año</span><input className="input" type="number" min="2000" max="2100" value={year} onChange={e => { const value = Number(e.target.value); if (value >= 2000 && value <= 2100) setYear(value) }} /></label>{data && <><p className="mb-3">Stock actual: <strong>{data.stock}</strong> · Mínimo: {data.minimum_stock}</p><div className="overflow-auto"><table className="data-table"><thead><tr><th>Mes</th><th>Comprado (u.)</th><th>Vendido (u.)</th><th>Ventas</th></tr></thead><tbody>{data.months.map(row => <tr key={row.month}><td>{row.month.slice(0, 7)}</td><td>{row.purchased_quantity}</td><td>{row.sold_quantity}</td><td>{formatMoney(row.sales_total)}</td></tr>)}</tbody></table></div><p className="section-note mt-3">Compras confirmadas y ventas completadas vigentes. Las anuladas se excluyen. El stock corresponde al saldo actual.</p></>}</FormModal>
}
