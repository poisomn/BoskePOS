import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPower, FiRefreshCw, FiSearch } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import {
  activateSupplier,
  createSupplier,
  deactivateSupplier,
  listSuppliersPage,
  updateSupplier,
} from '../../services/suppliersService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import SupplierForm from './SupplierForm'

const PAGE_SIZE = 8

function SuppliersPage() {
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [supplierToDeactivate, setSupplierToDeactivate] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [total, setTotal] = useState(0)

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listSuppliersPage({
        isActive: isActiveFilter,
        page,
        pageSize: PAGE_SIZE,
        search,
      })
      setSuppliers(data.results)
      setTotal(data.count)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los proveedores.'))
    } finally {
      setIsLoading(false)
    }
  }, [isActiveFilter, page, search])

  useEffect(() => {
    queueMicrotask(fetchSuppliers)
  }, [fetchSuppliers])

  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return 'Cargando proveedores...'
    }

    if (search || isActiveFilter !== '') {
      return 'No hay proveedores que coincidan con los filtros.'
    }

    return 'No hay proveedores.'
  }, [isActiveFilter, isLoading, search])

  function openCreateModal() {
    setEditingSupplier(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  function openEditModal(supplier) {
    setEditingSupplier(supplier)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  function handleSearchChange(value) {
    setSearch(value)
    setPage(1)
  }

  function handleStateFilterChange(value) {
    setIsActiveFilter(value)
    setPage(1)
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload)
        setSuccessMessage('Proveedor actualizado correctamente.')
      } else {
        await createSupplier(payload)
        setSuccessMessage('Proveedor creado correctamente.')
      }

      setEditingSupplier(null)
      setIsFormOpen(false)
      await fetchSuppliers()
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(requestError.response.data ?? {})
      } else {
        setError(getApiErrorMessage(requestError, 'No se pudo guardar el proveedor.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleActivate(supplier) {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await activateSupplier(supplier.id)
      setSuccessMessage('Proveedor activado correctamente.')
      await fetchSuppliers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo activar el proveedor.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await deactivateSupplier(supplierToDeactivate.id)
      setSupplierToDeactivate(null)
      setSuccessMessage('Proveedor desactivado correctamente.')
      await fetchSuppliers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo desactivar el proveedor.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Razon social' },
    { key: 'rut', header: 'RUT', render: (supplier) => supplier.rut || 'Sin RUT' },
    { key: 'email', header: 'Email', render: (supplier) => supplier.email || 'Sin email' },
    { key: 'phone', header: 'Telefono', render: (supplier) => supplier.phone || 'Sin telefono' },
    { key: 'city', header: 'Ciudad', render: (supplier) => supplier.city || '-' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (supplier) => (
        <span className={`badge ${supplier.is_active ? 'badge-success' : 'badge-neutral'}`}>
          {supplier.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (supplier) => (
        <div className="flex gap-2">
          <button aria-label={`Editar ${supplier.name}`} className="icon-btn" onClick={() => openEditModal(supplier)} type="button">
            <FiEdit2 aria-hidden="true" />
          </button>
          {supplier.is_active ? (
            <button
              aria-label={`Desactivar ${supplier.name}`}
              className="icon-btn"
              onClick={() => setSupplierToDeactivate(supplier)}
              type="button"
            >
              <FiPower aria-hidden="true" />
            </button>
          ) : (
            <button
              aria-label={`Activar ${supplier.name}`}
              className="icon-btn"
              disabled={isSubmitting}
              onClick={() => handleActivate(supplier)}
              type="button"
            >
              <FiRefreshCw aria-hidden="true" />
            </button>
          )}
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
              Proveedores
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Proveedores</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Administra proveedores y busca rapidamente por razon social, RUT o contacto.
            </p>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal} type="button">
            Nuevo proveedor
          </button>
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
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Razon social, RUT, email o telefono"
                value={search}
              />
            </div>
          </label>
          <label>
            <span className="field-label">Estado</span>
            <select
              className="select"
              onChange={(event) => handleStateFilterChange(event.target.value)}
              value={isActiveFilter}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : suppliers}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      >
        <SupplierForm
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          supplier={editingSupplier}
        />
      </FormModal>

      <ConfirmDialog
        confirmLabel="Desactivar"
        description={`El proveedor "${supplierToDeactivate?.name}" quedara inactivo, pero se conservara su historial.`}
        isOpen={Boolean(supplierToDeactivate)}
        isSubmitting={isSubmitting}
        loadingLabel="Desactivando..."
        onCancel={() => setSupplierToDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Desactivar proveedor"
      />
    </div>
  )
}

export default SuppliersPage
