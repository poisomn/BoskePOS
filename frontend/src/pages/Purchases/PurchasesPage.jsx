import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiEdit2, FiEye, FiSearch, FiXCircle } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import { useAuth } from '../../hooks/useAuth'
import {
  cancelPurchase,
  confirmPurchase,
  createPurchase,
  getPurchase,
  listPurchasesPage,
  updatePurchase,
} from '../../services/purchasesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'
import PurchaseForm from './PurchaseForm'

const PAGE_SIZE = 8

function PurchasesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [total, setTotal] = useState(0)

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listPurchasesPage({
        page,
        pageSize: PAGE_SIZE,
        search,
        status: statusFilter,
      })
      setPurchases(data.results)
      setTotal(data.count)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar las compras.'))
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    queueMicrotask(fetchPurchases)
  }, [fetchPurchases])

  const emptyMessage = useMemo(() => {
    if (isLoading) return 'Cargando compras...'
    if (search || statusFilter) return 'No hay compras que coincidan con los filtros.'
    return 'No hay compras registradas.'
  }, [isLoading, search, statusFilter])

  function openCreateModal() {
    setEditingPurchase(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  async function openEditModal(purchase) {
    setIsSubmitting(true)
    setError('')
    setFieldErrors({})
    try {
      const data = await getPurchase(purchase.id)
      setEditingPurchase(data)
      setIsFormOpen(true)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el detalle de la compra.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')

    try {
      if (editingPurchase) {
        await updatePurchase(editingPurchase.id, payload)
        setSuccessMessage('Compra actualizada correctamente.')
      } else {
        await createPurchase(payload)
        setSuccessMessage('Compra creada como borrador.')
      }

      setIsFormOpen(false)
      setEditingPurchase(null)
      await fetchPurchases()
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(requestError.response.data ?? {})
      } else {
        setError(getApiErrorMessage(requestError, 'No se pudo guardar la compra.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirm() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await confirmPurchase(confirmTarget.id)
      setConfirmTarget(null)
      setSuccessMessage('Compra confirmada. El inventario fue actualizado.')
      await fetchPurchases()
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
      await cancelPurchase(cancelTarget.id)
      setCancelTarget(null)
      setSuccessMessage('Compra anulada correctamente.')
      await fetchPurchases()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo anular la compra.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'id', header: 'Compra', render: (purchase) => `#${purchase.id}` },
    { key: 'supplier_name', header: 'Proveedor' },
    {
      key: 'status',
      header: 'Estado',
      render: (purchase) => <StatusBadge status={purchase.status} label={purchase.status_label} />,
    },
    { key: 'reference', header: 'Referencia', render: (purchase) => purchase.reference || '-' },
    { key: 'total', header: 'Total', render: (purchase) => formatMoney(purchase.total) },
    { key: 'created_at', header: 'Fecha', render: (purchase) => formatDateTime(purchase.created_at) },
    {
      key: 'actions',
      header: 'Acciones',
      render: (purchase) => (
        <div className="flex gap-2">
          <button aria-label={`Ver compra ${purchase.id}`} className="icon-btn" onClick={() => navigate(`/purchases/${purchase.id}`)} type="button">
            <FiEye aria-hidden="true" />
          </button>
          {purchase.status === 'draft' && hasPermission('purchases:write') ? (
            <>
              <button aria-label={`Editar compra ${purchase.id}`} className="icon-btn" onClick={() => openEditModal(purchase)} type="button">
                <FiEdit2 aria-hidden="true" />
              </button>
            </>
          ) : null}
          {purchase.status === 'draft' && hasPermission('purchases:confirm') ? (
            <>
              <button aria-label={`Confirmar compra ${purchase.id}`} className="icon-btn" onClick={() => setConfirmTarget(purchase)} type="button">
                <FiCheckCircle aria-hidden="true" />
              </button>
            </>
          ) : null}
          {purchase.status === 'confirmed' && hasPermission('purchases:cancel') ? (
            <button aria-label={`Anular compra ${purchase.id}`} className="icon-btn" onClick={() => setCancelTarget(purchase)} type="button">
              <FiXCircle aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <section className="surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
              Compras
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Compras</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Registra entradas de mercaderia y confirma inventario con trazabilidad.
            </p>
          </div>
          {hasPermission('purchases:write') ? (
            <button className="btn btn-primary" onClick={openCreateModal} type="button">
              Nueva compra
            </button>
          ) : null}
        </div>
      </section>

      <section className="surface p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
          <label>
            <span className="field-label">Buscar</span>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
              <input
                className="input pl-10"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Proveedor, RUT, referencia o numero"
                value={search}
              />
            </div>
          </label>
          <label>
            <span className="field-label">Estado</span>
            <select
              className="select"
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              value={statusFilter}
            >
              <option value="">Todos</option>
              <option value="draft">Borrador</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Anulada</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : purchases}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingPurchase ? `Editar compra #${editingPurchase.id}` : 'Nueva compra'}
      >
        <PurchaseForm
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          purchase={editingPurchase}
        />
      </FormModal>

      <ConfirmDialog
        confirmLabel="Confirmar"
        description={`La compra #${confirmTarget?.id} actualizara el inventario y no podra editarse directamente.`}
        isOpen={Boolean(confirmTarget)}
        isSubmitting={isSubmitting}
        loadingLabel="Confirmando..."
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleConfirm}
        title="Confirmar compra"
        tone="primary"
      />

      <ConfirmDialog
        confirmLabel="Anular"
        description={`La compra #${cancelTarget?.id} generara movimientos compensatorios de inventario.`}
        isOpen={Boolean(cancelTarget)}
        isSubmitting={isSubmitting}
        loadingLabel="Anulando..."
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Anular compra"
      />
    </div>
  )
}

function StatusBadge({ label, status }) {
  const className = {
    cancelled: 'badge-error',
    confirmed: 'badge-success',
    draft: 'badge-warning',
  }[status] ?? 'badge-neutral'

  return <span className={`badge ${className}`}>{label}</span>
}

export default PurchasesPage
