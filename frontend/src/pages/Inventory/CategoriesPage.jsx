import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPower, FiRefreshCw } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import { useAuth } from '../../hooks/useAuth'
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  listCategoriesPage,
  updateCategory,
} from '../../services/inventoryService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime } from '../../utils/formatters'
import CategoryForm from './CategoryForm'
import InventoryHeader from './InventoryHeader'

const PAGE_SIZE = 8

function CategoriesPage() {
  const { hasPermission } = useAuth()
  const canWriteInventory = hasPermission('inventory:write')
  const [categories, setCategories] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryToDeactivate, setCategoryToDeactivate] = useState(null)
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

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listCategoriesPage({
        isActive: isActiveFilter,
        page,
        pageSize: PAGE_SIZE,
        search,
      })
      setCategories(data.results)
      setTotal(data.count)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar las categorias.'))
    } finally {
      setIsLoading(false)
    }
  }, [isActiveFilter, page, search])

  useEffect(() => {
    queueMicrotask(fetchCategories)
  }, [fetchCategories])

  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return 'Cargando categorias...'
    }

    if (search || isActiveFilter !== '') {
      return 'No hay categorias que coincidan con los filtros.'
    }

    return 'No hay categorias.'
  }, [isActiveFilter, isLoading, search])

  function openCreateModal() {
    setEditingCategory(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  function openEditModal(category) {
    setEditingCategory(category)
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
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
        setSuccessMessage('Categoria actualizada correctamente.')
      } else {
        await createCategory(payload)
        setSuccessMessage('Categoria creada correctamente.')
      }

      setIsFormOpen(false)
      setEditingCategory(null)
      await fetchCategories()
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(requestError.response.data ?? {})
      } else {
        setError(getApiErrorMessage(requestError, 'No se pudo guardar la categoria.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleActivate(category) {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await activateCategory(category.id)
      setSuccessMessage('Categoria activada correctamente.')
      await fetchCategories()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo activar la categoria.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await deactivateCategory(categoryToDeactivate.id)
      setCategoryToDeactivate(null)
      setSuccessMessage('Categoria desactivada correctamente.')
      await fetchCategories()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo desactivar la categoria.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Nombre' },
    {
      key: 'description',
      header: 'Descripcion',
      render: (category) => (
        <span className="line-clamp-2">{category.description || 'Sin descripcion'}</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (category) => (
        <span className={`badge ${category.is_active ? 'badge-success' : 'badge-neutral'}`}>
          {category.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizada',
      render: (category) => formatDateTime(category.updated_at),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (category) => (
        <div className="flex gap-2">
          {canWriteInventory ? (
            <>
              <button aria-label={`Editar ${category.name}`} className="icon-btn" onClick={() => openEditModal(category)} type="button">
                <FiEdit2 aria-hidden="true" />
              </button>
              {category.is_active ? (
                <button
                  aria-label={`Desactivar ${category.name}`}
                  className="icon-btn"
                  onClick={() => setCategoryToDeactivate(category)}
                  type="button"
                >
                  <FiPower aria-hidden="true" />
                </button>
              ) : (
                <button
                  aria-label={`Activar ${category.name}`}
                  className="icon-btn"
                  disabled={isSubmitting}
                  onClick={() => handleActivate(category)}
                  type="button"
                >
                  <FiRefreshCw aria-hidden="true" />
                </button>
              )}
            </>
          ) : (
            <span className="badge badge-neutral">Solo lectura</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <InventoryHeader
        actionLabel="Nueva categoria"
        canCreate={canWriteInventory}
        onAction={openCreateModal}
        onSearchChange={handleSearchChange}
        search={search}
        subtitle="Administra familias de productos para ordenar el catalogo."
        title="Categorias"
      />

      <section className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="w-full sm:max-w-64">
          <span className="field-label">Estado</span>
          <select
            className="select"
            onChange={(event) => handleStateFilterChange(event.target.value)}
            value={isActiveFilter}
          >
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </label>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : categories}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCategory ? 'Editar categoria' : 'Nueva categoria'}
      >
        <CategoryForm
          category={editingCategory}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
        />
      </FormModal>

      <ConfirmDialog
        confirmLabel="Desactivar"
        description={`La categoria "${categoryToDeactivate?.name}" dejara de estar disponible para nuevos usos, pero sus productos asociados se conservaran.`}
        isOpen={Boolean(categoryToDeactivate)}
        isSubmitting={isSubmitting}
        loadingLabel="Desactivando..."
        onCancel={() => setCategoryToDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Desactivar categoria"
      />
    </div>
  )
}

export default CategoriesPage
