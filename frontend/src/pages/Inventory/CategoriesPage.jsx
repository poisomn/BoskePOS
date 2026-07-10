import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../services/inventoryService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import CategoryForm from './CategoryForm'
import InventoryHeader from './InventoryHeader'

const PAGE_SIZE = 8

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listCategories(search)
      setCategories(data)
      setPage(1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar las categorias.'))
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    queueMicrotask(fetchCategories)
  }, [fetchCategories])

  const paginatedCategories = useMemo(
    () => categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [categories, page],
  )

  function openCreateModal() {
    setEditingCategory(null)
    setIsFormOpen(true)
  }

  function openEditModal(category) {
    setEditingCategory(category)
    setIsFormOpen(true)
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true)
    setError('')

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
      } else {
        await createCategory(payload)
      }

      setIsFormOpen(false)
      setEditingCategory(null)
      await fetchCategories()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo guardar la categoria.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    setIsSubmitting(true)
    setError('')

    try {
      await deleteCategory(categoryToDelete.id)
      setCategoryToDelete(null)
      await fetchCategories()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo eliminar la categoria.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Nombre' },
    {
      key: 'description',
      header: 'Descripcion',
      render: (category) => category.description || 'Sin descripcion',
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
      key: 'actions',
      header: 'Acciones',
      render: (category) => (
        <div className="flex gap-2">
          <button className="icon-btn" onClick={() => openEditModal(category)} type="button">
            <FiEdit2 aria-hidden="true" />
          </button>
          <button className="icon-btn" onClick={() => setCategoryToDelete(category)} type="button">
            <FiTrash2 aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <InventoryHeader
        actionLabel="Nueva categoria"
        onAction={openCreateModal}
        onSearchChange={setSearch}
        search={search}
        subtitle="Administra familias de productos para ordenar el catalogo."
        title="Categorias"
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : paginatedCategories}
        emptyMessage={isLoading ? 'Cargando categorias...' : 'No hay categorias.'}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={categories.length}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCategory ? 'Editar categoria' : 'Nueva categoria'}
      >
        <CategoryForm
          category={editingCategory}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
        />
      </FormModal>

      <ConfirmDialog
        description={`Se eliminara la categoria "${categoryToDelete?.name}". Esta accion no se puede deshacer.`}
        isOpen={Boolean(categoryToDelete)}
        isSubmitting={isSubmitting}
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar categoria"
      />
    </div>
  )
}

export default CategoriesPage
