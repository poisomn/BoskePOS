import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheckCircle, FiFileText, FiXCircle } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import { cancelSale, getSale } from '../../services/salesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'

function SaleDetailPage() {
  const { saleId } = useParams()
  const location = useLocation()
  const [error, setError] = useState('')
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sale, setSale] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const saleRegistered = Boolean(location.state?.saleRegistered)

  const fetchSale = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getSale(saleId)
      setSale(data)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el comprobante.'))
    } finally {
      setIsLoading(false)
    }
  }, [saleId])

  useEffect(() => {
    queueMicrotask(fetchSale)
  }, [fetchSale])

  async function handleCancelSale() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const data = await cancelSale(sale.id)
      setSale(data)
      setIsCancelOpen(false)
      setSuccessMessage('Venta anulada correctamente. El stock fue restaurado.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo anular la venta.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="surface p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Cargando comprobante...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-4">
        <div className="alert alert-error">{error}</div>
        <Link className="btn btn-secondary" to="/sales">
          <FiArrowLeft aria-hidden="true" />
          Volver al historial
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {saleRegistered ? (
        <div className="alert alert-success">
          <FiCheckCircle aria-hidden="true" />
          Venta registrada correctamente.
        </div>
      ) : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="grid size-11 place-items-center rounded-md"
              style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
            >
              <FiFileText aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
                Comprobante
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Venta #{sale.id}</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {formatDateTime(sale.created_at)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {sale.status === 'completed' ? (
              <button className="btn btn-danger" onClick={() => setIsCancelOpen(true)} type="button">
                <FiXCircle aria-hidden="true" />
                Anular
              </button>
            ) : null}
            <Link className="btn btn-secondary" to="/sales">
              <FiArrowLeft aria-hidden="true" />
              Historial
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total linea</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.product_sku}</td>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price)}</td>
                  <td><strong>{formatMoney(item.line_total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="surface p-5">
          <h2 className="section-title">Resumen</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Cliente</span>
              <strong>{sale.customer_name || 'Consumidor final'}</strong>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Vendedor</span>
              <strong>{sale.user_email}</strong>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Estado</span>
              <StatusBadge status={sale.status} label={sale.status_label} />
            </div>
            <div className="flex justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <span>Subtotal</span>
              <strong>{formatMoney(sale.subtotal)}</strong>
            </div>
            <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-lg font-semibold">Total</span>
              <strong className="text-3xl" style={{ color: 'var(--color-brand-700)' }}>
                {formatMoney(sale.total)}
              </strong>
            </div>
          </div>
        </aside>
      </section>

      <ConfirmDialog
        confirmLabel="Anular"
        description="Esta accion restaurara stock mediante movimientos de entrada y dejara la venta como anulada."
        isOpen={isCancelOpen}
        isSubmitting={isSubmitting}
        loadingLabel="Anulando..."
        onCancel={() => setIsCancelOpen(false)}
        onConfirm={handleCancelSale}
        title="Anular venta"
      />
    </div>
  )
}

function StatusBadge({ label, status }) {
  const className = {
    cancelled: 'badge-error',
    completed: 'badge-success',
    pending: 'badge-warning',
  }[status] ?? 'badge-neutral'

  return <span className={`badge ${className}`}>{label}</span>
}

export default SaleDetailPage
