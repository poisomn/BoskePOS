import { useCallback, useEffect, useState } from 'react'
import { FiArrowLeft, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'

import ConfirmDialog from '../../components/ConfirmDialog'
import { cancelPurchase, confirmPurchase, getPurchase } from '../../services/purchasesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'

function PurchaseDetailPage() {
  const navigate = useNavigate()
  const { purchaseId } = useParams()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [purchase, setPurchase] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const fetchPurchase = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getPurchase(purchaseId)
      setPurchase(data)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar la compra.'))
    } finally {
      setIsLoading(false)
    }
  }, [purchaseId])

  useEffect(() => {
    queueMicrotask(fetchPurchase)
  }, [fetchPurchase])

  async function handleConfirm() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')
    try {
      const data = await confirmPurchase(purchase.id)
      setPurchase(data)
      setConfirmOpen(false)
      setSuccessMessage('Compra confirmada. Inventario actualizado.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo confirmar la compra.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancel() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')
    try {
      const data = await cancelPurchase(purchase.id)
      setPurchase(data)
      setCancelOpen(false)
      setSuccessMessage('Compra anulada correctamente.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo anular la compra.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="surface p-5">Cargando compra...</div>
  }

  if (!purchase) {
    return <div className="alert alert-error">{error || 'Compra no disponible.'}</div>
  }

  return (
    <div className="w-full space-y-6">
      <section className="surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button className="btn btn-secondary mb-4" onClick={() => navigate('/purchases')} type="button">
              <FiArrowLeft aria-hidden="true" />
              Volver
            </button>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
              Compra #{purchase.id}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{purchase.supplier_name}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Creada por {purchase.user_email} el {formatDateTime(purchase.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            {purchase.status === 'draft' ? (
              <button className="btn btn-primary" onClick={() => setConfirmOpen(true)} type="button">
                <FiCheckCircle aria-hidden="true" />
                Confirmar
              </button>
            ) : null}
            {purchase.status === 'confirmed' ? (
              <button className="btn btn-danger" onClick={() => setCancelOpen(true)} type="button">
                <FiXCircle aria-hidden="true" />
                Anular
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <InfoCard label="Estado" value={purchase.status_label} />
        <InfoCard label="Referencia" value={purchase.reference || '-'} />
        <InfoCard label="Subtotal" value={formatMoney(purchase.subtotal)} />
        <InfoCard label="Total oficial" value={formatMoney(purchase.total)} />
      </section>

      <section className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Cantidad</th>
              <th>Costo</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product_name}</td>
                <td>{item.product_sku}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unit_cost)}</td>
                <td>{formatMoney(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {purchase.notes ? (
        <section className="surface p-5">
          <h2 className="section-title">Observaciones</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {purchase.notes}
          </p>
        </section>
      ) : null}

      <ConfirmDialog
        confirmLabel="Confirmar"
        description="Esta accion generara movimientos de entrada y aumentara el stock."
        isOpen={confirmOpen}
        isSubmitting={isSubmitting}
        loadingLabel="Confirmando..."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirmar compra"
        tone="primary"
      />

      <ConfirmDialog
        confirmLabel="Anular"
        description="Esta accion generara movimientos compensatorios y puede fallar si no hay stock suficiente."
        isOpen={cancelOpen}
        isSubmitting={isSubmitting}
        loadingLabel="Anulando..."
        onCancel={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Anular compra"
      />
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default PurchaseDetailPage
