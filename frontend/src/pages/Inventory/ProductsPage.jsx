import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'

import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
} from '../../services/inventoryService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import InventoryHeader from './InventoryHeader'
import ProductForm from './ProductForm'

const PAGE_SIZE = 8

function ProductsPage() {
  const [categories, setCategories] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [productToDelete, setProductToDelete] = useState(null)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [productsData, categoriesData] = await Promise.all([
        listProducts(search),
        listCategories(),
      ])
      setProducts(productsData)
      setCategories(categoriesData.filter((category) => category.is_active))
      setPage(1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los productos.'))
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    queueMicrotask(fetchProducts)
  }, [fetchProducts])

  const paginatedProducts = useMemo(
    () => products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, products],
  )

  function openCreateModal() {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  function openEditModal(product) {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true)
    setError('')

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload)
      }

      setEditingProduct(null)
      setIsFormOpen(false)
      await fetchProducts()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo guardar el producto.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    setIsSubmitting(true)
    setError('')

    try {
      await deleteProduct(productToDelete.id)
      setProductToDelete(null)
      await fetchProducts()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo eliminar el producto.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Producto' },
    {
      key: 'category',
      header: 'Categoria',
      render: (product) => product.category_detail?.name ?? 'Sin categoria',
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product) => (
        <span className={`badge ${product.stock <= product.minimum_stock ? 'badge-warning' : 'badge-neutral'}`}>
          {product.stock}
        </span>
      ),
    },
    {
      key: 'sale_price',
      header: 'Precio',
      render: (product) => formatMoney(product.sale_price),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (product) => (
        <span className={`badge ${product.is_active ? 'badge-success' : 'badge-neutral'}`}>
          {product.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (product) => (
        <div className="flex gap-2">
          <button className="icon-btn" onClick={() => openEditModal(product)} type="button">
            <FiEdit2 aria-hidden="true" />
          </button>
          <button className="icon-btn" onClick={() => setProductToDelete(product)} type="button">
            <FiTrash2 aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <InventoryHeader
        actionLabel="Nuevo producto"
        onAction={openCreateModal}
        onSearchChange={setSearch}
        search={search}
        subtitle="Administra productos, stock, precios, SKU y codigos de barra."
        title="Productos"
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : paginatedProducts}
        emptyMessage={isLoading ? 'Cargando productos...' : 'No hay productos.'}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={products.length}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
      >
        <ProductForm
          categories={categories}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          product={editingProduct}
        />
      </FormModal>

      <ConfirmDialog
        description={`Se eliminara el producto "${productToDelete?.name}". Esta accion no se puede deshacer.`}
        isOpen={Boolean(productToDelete)}
        isSubmitting={isSubmitting}
        onCancel={() => setProductToDelete(null)}
        onConfirm={handleDelete}
        title="Eliminar producto"
      />
    </div>
  )
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value))
}

export default ProductsPage
