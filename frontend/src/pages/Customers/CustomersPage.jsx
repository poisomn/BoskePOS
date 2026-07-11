import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPower, FiRefreshCw, FiSearch } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import {
  activateCustomer,
  createCustomer,
  deactivateCustomer,
  listCustomersPage,
  updateCustomer,
} from '../../services/customersService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import CustomerForm from './CustomerForm'

const PAGE_SIZE = 8

function CustomersPage() {
  const [customerToDeactivate, setCustomerToDeactivate] = useState(null)
  const [customers, setCustomers] = useState([])
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [total, setTotal] = useState(0)

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listCustomersPage({
        isActive: isActiveFilter,
        page,
        pageSize: PAGE_SIZE,
        search,
      })
      setCustomers(data.results)
      setTotal(data.count)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los clientes.'))
    } finally {
      setIsLoading(false)
    }
  }, [isActiveFilter, page, search])

  useEffect(() => {
    queueMicrotask(fetchCustomers)
  }, [fetchCustomers])

  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return 'Cargando clientes...'
    }

    if (search || isActiveFilter !== '') {
      return 'No hay clientes que coincidan con los filtros.'
    }

    return 'No hay clientes.'
  }, [isActiveFilter, isLoading, search])

  function openCreateModal() {
    setEditingCustomer(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  function openEditModal(customer) {
    setEditingCustomer(customer)
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
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload)
        setSuccessMessage('Cliente actualizado correctamente.')
      } else {
        await createCustomer(payload)
        setSuccessMessage('Cliente creado correctamente.')
      }

      setEditingCustomer(null)
      setIsFormOpen(false)
      await fetchCustomers()
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(requestError.response.data ?? {})
      } else {
        setError(getApiErrorMessage(requestError, 'No se pudo guardar el cliente.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleActivate(customer) {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await activateCustomer(customer.id)
      setSuccessMessage('Cliente activado correctamente.')
      await fetchCustomers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo activar el cliente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await deactivateCustomer(customerToDeactivate.id)
      setCustomerToDeactivate(null)
      setSuccessMessage('Cliente desactivado correctamente.')
      await fetchCustomers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo desactivar el cliente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'rut', header: 'RUT', render: (customer) => customer.rut || 'Sin RUT' },
    { key: 'email', header: 'Email', render: (customer) => customer.email || 'Sin email' },
    { key: 'phone', header: 'Telefono', render: (customer) => customer.phone || 'Sin telefono' },
    { key: 'city', header: 'Ciudad', render: (customer) => customer.city || '-' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (customer) => (
        <span className={`badge ${customer.is_active ? 'badge-success' : 'badge-neutral'}`}>
          {customer.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (customer) => (
        <div className="flex gap-2">
          <button aria-label={`Editar ${customer.name}`} className="icon-btn" onClick={() => openEditModal(customer)} type="button">
            <FiEdit2 aria-hidden="true" />
          </button>
          {customer.is_active ? (
            <button
              aria-label={`Desactivar ${customer.name}`}
              className="icon-btn"
              onClick={() => setCustomerToDeactivate(customer)}
              type="button"
            >
              <FiPower aria-hidden="true" />
            </button>
          ) : (
            <button
              aria-label={`Activar ${customer.name}`}
              className="icon-btn"
              disabled={isSubmitting}
              onClick={() => handleActivate(customer)}
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
              Clientes
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Clientes</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Administra clientes y busca rapidamente por nombre o RUT.
            </p>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal} type="button">
            Nuevo cliente
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
                placeholder="Nombre, RUT, email o telefono"
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
        data={isLoading ? [] : customers}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCustomer ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <CustomerForm
          customer={editingCustomer}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
        />
      </FormModal>

      <ConfirmDialog
        confirmLabel="Desactivar"
        description={`El cliente "${customerToDeactivate?.name}" quedara inactivo, pero se conservara su historial.`}
        isOpen={Boolean(customerToDeactivate)}
        isSubmitting={isSubmitting}
        loadingLabel="Desactivando..."
        onCancel={() => setCustomerToDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Desactivar cliente"
      />
    </div>
  )
}

export default CustomersPage
