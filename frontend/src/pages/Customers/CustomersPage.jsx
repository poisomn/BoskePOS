import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '../../services/customersService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import CustomerForm from './CustomerForm'

const PAGE_SIZE = 8

function CustomersPage() {
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [customers, setCustomers] = useState([])
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listCustomers(search)
      setCustomers(data)
      setPage(1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los clientes.'))
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    queueMicrotask(fetchCustomers)
  }, [fetchCustomers])

  const paginatedCustomers = useMemo(
    () => customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [customers, page],
  )

  function openCreateModal() {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  function openEditModal(customer) {
    setEditingCustomer(customer)
    setIsFormOpen(true)
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true)
    setError('')

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload)
      } else {
        await createCustomer(payload)
      }

      setEditingCustomer(null)
      setIsFormOpen(false)
      await fetchCustomers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo guardar el cliente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    setIsSubmitting(true)
    setError('')

    try {
      await deleteCustomer(customerToDelete.id)
      setCustomerToDelete(null)
      await fetchCustomers()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo eliminar el cliente.'))
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
          <button className="icon-btn" onClick={() => openEditModal(customer)} type="button">
            <FiEdit2 aria-hidden="true" />
          </button>
          <button className="icon-btn" onClick={() => setCustomerToDelete(customer)} type="button">
            <FiTrash2 aria-hidden="true" />
          </button>
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-72">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
              <input
                className="input pl-10"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o RUT"
                value={search}
              />
            </label>
            <button className="btn btn-primary" onClick={openCreateModal} type="button">
              Nuevo cliente
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : paginatedCustomers}
        emptyMessage={isLoading ? 'Cargando clientes...' : 'No hay clientes.'}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={customers.length}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCustomer ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <CustomerForm
          customer={editingCustomer}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
        />
      </FormModal>

      <ConfirmDialog
        description={`Se eliminara el cliente "${customerToDelete?.name}". Esta accion no se puede deshacer.`}
        isOpen={Boolean(customerToDelete)}
        isSubmitting={isSubmitting}
        onCancel={() => setCustomerToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
      />
    </div>
  )
}

export default CustomersPage
