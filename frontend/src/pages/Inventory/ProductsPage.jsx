import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiPower, FiRefreshCw } from 'react-icons/fi'

import BarcodeInput from '../../components/BarcodeInput'
import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import {
  activateProduct,
  createProduct,
  deactivateProduct,
  getProductByBarcode,
  listCategoriesPage,
  listProductsPage,
  updateProduct,
} from '../../services/inventoryService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatMoney } from '../../utils/formatters'
import InventoryHeader from './InventoryHeader'
import ProductForm from './ProductForm'

const PAGE_SIZE = 8

function ProductsPage() {
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeResult, setBarcodeResult] = useState(null)
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLowStockFilter, setIsLowStockFilter] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [productToDeactivate, setProductToDeactivate] = useState(null)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [total, setTotal] = useState(0)

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [productsData, categoriesData] = await Promise.all([
        listProductsPage({
          category: categoryFilter,
          isActive: isActiveFilter,
          lowStock: isLowStockFilter,
          page,
          pageSize: PAGE_SIZE,
          search,
        }),
        listCategoriesPage({ pageSize: 100 }),
      ])
      setProducts(productsData.results)
      setTotal(productsData.count)
      setCategories(categoriesData.results.filter((category) => category.is_active))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los productos.'))
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter, isActiveFilter, isLowStockFilter, page, search])

  useEffect(() => {
    queueMicrotask(fetchProducts)
  }, [fetchProducts])

  const emptyMessage = useMemo(() => {
    if (isLoading) {
      return 'Cargando productos...'
    }

    if (search || categoryFilter || isActiveFilter !== '' || isLowStockFilter) {
      return 'No hay productos que coincidan con los filtros.'
    }

    return 'No hay productos.'
  }, [categoryFilter, isActiveFilter, isLoading, isLowStockFilter, search])

  function openCreateModal() {
    setEditingProduct(null)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  function openEditModal(product) {
    setEditingProduct(product)
    setFieldErrors({})
    setIsFormOpen(true)
  }

  function handleSearchChange(value) {
    setSearch(value)
    setPage(1)
  }

  function handleCategoryFilterChange(value) {
    setCategoryFilter(value)
    setPage(1)
  }

  function handleStateFilterChange(value) {
    setIsActiveFilter(value)
    setPage(1)
  }

  function handleLowStockFilterChange(value) {
    setIsLowStockFilter(value)
    setPage(1)
  }

  async function handleBarcodeSubmit(barcode) {
    setIsBarcodeLoading(true)
    setBarcodeError('')
    setBarcodeResult(null)

    try {
      const product = await getProductByBarcode(barcode)
      setBarcodeResult(product)
    } catch (requestError) {
      const status = requestError.response?.status

      if (status === 400) {
        setBarcodeError(getApiErrorMessage(requestError, 'Ingresa un codigo de barras valido.'))
      } else if (status === 404) {
        setBarcodeError('No existe un producto asociado a este codigo de barras.')
      } else if (status === 409) {
        setBarcodeError(requestError.response?.data?.detail ?? 'El producto existe, pero esta inactivo.')
        setBarcodeResult(requestError.response?.data?.product ?? null)
      } else {
        setBarcodeError(getApiErrorMessage(requestError, 'No se pudo buscar el codigo de barras.'))
      }
    } finally {
      setIsBarcodeLoading(false)
    }
  }

  async function handleSubmit(payload) {
    setIsSubmitting(true)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
        setSuccessMessage('Producto actualizado correctamente.')
      } else {
        await createProduct(payload)
        setSuccessMessage('Producto creado correctamente.')
      }

      setEditingProduct(null)
      setIsFormOpen(false)
      await fetchProducts()
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(requestError.response.data ?? {})
      } else {
        setError(getApiErrorMessage(requestError, 'No se pudo guardar el producto.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleActivate(product) {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await activateProduct(product.id)
      setSuccessMessage('Producto activado correctamente.')
      await fetchProducts()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo activar el producto.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      await deactivateProduct(productToDeactivate.id)
      setProductToDeactivate(null)
      setSuccessMessage('Producto desactivado correctamente.')
      await fetchProducts()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo desactivar el producto.'))
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
        <div className="space-y-1">
          <span className={`badge ${getStockBadgeClass(product)}`}>
            {getStockLabel(product)}
          </span>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Min. {product.minimum_stock}
          </p>
        </div>
      ),
    },
    {
      key: 'cost_price',
      header: 'Costo',
      render: (product) => formatMoney(product.cost_price),
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
          <button aria-label={`Editar ${product.name}`} className="icon-btn" onClick={() => openEditModal(product)} type="button">
            <FiEdit2 aria-hidden="true" />
          </button>
          {product.is_active ? (
            <button
              aria-label={`Desactivar ${product.name}`}
              className="icon-btn"
              onClick={() => setProductToDeactivate(product)}
              type="button"
            >
              <FiPower aria-hidden="true" />
            </button>
          ) : (
            <button
              aria-label={`Activar ${product.name}`}
              className="icon-btn"
              disabled={isSubmitting}
              onClick={() => handleActivate(product)}
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
      <InventoryHeader
        actionLabel="Nuevo producto"
        onAction={openCreateModal}
        onSearchChange={handleSearchChange}
        search={search}
        subtitle="Administra productos, stock, precios, SKU y codigos de barras."
        title="Productos"
      />

      <section className="surface p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
          <BarcodeInput
            autoFocus
            isLoading={isBarcodeLoading}
            onSubmit={handleBarcodeSubmit}
          />

          <div className="rounded-md border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm font-semibold">Resultado del codigo</p>
            {isBarcodeLoading ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Buscando producto...
              </p>
            ) : null}
            {barcodeError ? <div className="alert alert-warning mt-3">{barcodeError}</div> : null}
            {barcodeResult ? (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="font-semibold">{barcodeResult.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {barcodeResult.sku} · {barcodeResult.barcode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-info">
                    {barcodeResult.category_detail?.name ?? 'Sin categoria'}
                  </span>
                  <span className={`badge ${getStockBadgeClass(barcodeResult)}`}>
                    {getStockLabel(barcodeResult)}
                  </span>
                  <span className={`badge ${barcodeResult.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    {barcodeResult.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-lg font-semibold">{formatMoney(barcodeResult.sale_price)}</p>
              </div>
            ) : null}
            {!isBarcodeLoading && !barcodeError && !barcodeResult ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Escanea un producto para ver su informacion.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="surface grid gap-3 p-4 md:grid-cols-3">
        <label>
          <span className="field-label">Categoria</span>
          <select
            className="select"
            onChange={(event) => handleCategoryFilterChange(event.target.value)}
            value={categoryFilter}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
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

        <label className="flex items-end gap-2 text-sm">
          <input
            checked={isLowStockFilter}
            onChange={(event) => handleLowStockFilterChange(event.target.checked)}
            type="checkbox"
          />
          Mostrar solo stock bajo
        </label>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : products}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
      >
        <ProductForm
          categories={categories}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          product={editingProduct}
        />
      </FormModal>

      <ConfirmDialog
        confirmLabel="Desactivar"
        description={`El producto "${productToDeactivate?.name}" dejara de estar disponible para nuevos usos, pero se conservara su historial.`}
        isOpen={Boolean(productToDeactivate)}
        isSubmitting={isSubmitting}
        loadingLabel="Desactivando..."
        onCancel={() => setProductToDeactivate(null)}
        onConfirm={handleDeactivate}
        title="Desactivar producto"
      />
    </div>
  )
}

function getStockBadgeClass(product) {
  if (product.stock <= 0) {
    return 'badge-error'
  }

  if (product.stock <= product.minimum_stock) {
    return 'badge-warning'
  }

  return 'badge-neutral'
}

function getStockLabel(product) {
  if (product.stock <= 0) {
    return 'Sin stock'
  }

  if (product.stock <= product.minimum_stock) {
    return `Stock bajo: ${product.stock}`
  }

  return `Stock: ${product.stock}`
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
