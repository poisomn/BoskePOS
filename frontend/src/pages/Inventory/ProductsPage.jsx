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
import { formatMoney } from '../../utils/formatters'
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
    {
      key: 'product',
      header: 'Producto',
      render: (product) => (
        <div className="flex min-w-64 items-center gap-3">
          {product.image ? (
            <img
              alt=""
              className="size-10 rounded-md border object-cover"
              src={product.image}
              style={{ borderColor: 'var(--color-border)' }}
            />
          ) : (
            <div
              className="grid size-10 place-items-center rounded-md border text-xs font-semibold"
              style={{
                background: 'var(--color-steel-50)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-steel-600)',
              }}
            >
              {getProductInitials(product.name)}
            </div>
          )}
          <div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {product.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {product.brand || 'Sin marca'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => <span className="font-mono text-xs font-semibold">{product.sku}</span>,
    },
    {
      key: 'barcode',
      header: 'Codigo',
      render: (product) => (
        <span className="font-mono text-xs">{product.barcode || 'Sin codigo'}</span>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (product) => product.category_detail?.name ?? 'Sin categoria',
    },
    {
      key: 'storage',
      header: 'Unidad / Ubicacion',
      render: (product) => (
        <div className="space-y-1">
          <span className="badge badge-info">{formatUnit(product.unit)}</span>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {product.location || 'Sin ubicacion'}
          </p>
        </div>
      ),
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
      header: 'Precio venta',
      render: (product) => (
        <div>
          <p className="font-semibold">{formatMoney(product.sale_price)}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            IVA {product.tax_rate ?? '19.00'}%
          </p>
        </div>
      ),
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

function formatUnit(value) {
  const labels = {
    bolsa: 'Bolsa',
    caja: 'Caja',
    kilo: 'Kilo',
    litro: 'Litro',
    metro: 'Metro',
    par: 'Par',
    rollo: 'Rollo',
    unidad: 'Unidad',
  }

  return labels[value] ?? 'Unidad'
}

function getProductInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PR'
}

export default ProductsPage
