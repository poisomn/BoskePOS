import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiCreditCard,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiWifi,
  FiX,
} from 'react-icons/fi'

import BarcodeInput from '../../components/BarcodeInput'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { listCustomers } from '../../services/customersService'
import { getProductByBarcode } from '../../services/inventoryService'
import { quotePosCart, searchPosProducts } from '../../services/posService'
import { createSale } from '../../services/salesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatMoney } from '../../utils/formatters'

const emptyQuote = {
  items: [],
  subtotal: '0.00',
  total: '0.00',
}

function POSPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const searchInputRef = useRef(null)
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState('')
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isQuoting, setIsQuoting] = useState(false)
  const [isRegisteringSale, setIsRegisteringSale] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [quote, setQuote] = useState(emptyQuote)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const data = await listCustomers()
        setCustomers(data.filter((customer) => customer.is_active !== false))
      } catch {
        setCustomers([])
      }
    })
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      queueMicrotask(async () => {
        if (!search.trim()) {
          setSearchResults([])
          setSelectedResultIndex(0)
          return
        }

        setIsSearching(true)
        setError('')

        try {
          const products = await searchPosProducts(search.trim())
          setSearchResults(products.slice(0, 8))
          setSelectedResultIndex(0)
        } catch (requestError) {
          setError(getApiErrorMessage(requestError, 'No se pudo buscar productos.'))
        } finally {
          setIsSearching(false)
        }
      })
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  const refreshQuote = useCallback(async () => {
    if (!cartItems.length) {
      setQuote(emptyQuote)
      setError('')
      return
    }

    setIsQuoting(true)

    try {
      const quotedCart = await quotePosCart(cartItems)
      setQuote(quotedCart)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo recalcular el carrito.'))
    } finally {
      setIsQuoting(false)
    }
  }, [cartItems])

  useEffect(() => {
    queueMicrotask(refreshQuote)
  }, [refreshQuote])

  const cartQuantityByProductId = useMemo(
    () =>
      cartItems.reduce((accumulator, item) => {
        accumulator[item.product_id] = item.quantity
        return accumulator
      }, {}),
    [cartItems],
  )

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId))

  function focusSearch() {
    searchInputRef.current?.focus()
  }

  function addProduct(product) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.product_id === product.id)

      if (existingItem) {
        return currentItems.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [...currentItems, { product_id: product.id, quantity: 1 }]
    })

    setSearch('')
    setSearchResults([])
    window.requestAnimationFrame(focusSearch)
  }

  async function handleBarcodeSubmit(barcode) {
    setIsBarcodeLoading(true)
    setBarcodeError('')
    setBarcodeProduct(null)

    try {
      const product = await getProductByBarcode(barcode)
      setBarcodeProduct(product)
      addProduct(product)
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setBarcodeError('No existe un producto activo con ese codigo.')
      } else if (requestError.response?.status === 409) {
        setBarcodeError('El producto existe, pero esta inactivo.')
      } else {
        setBarcodeError(getApiErrorMessage(requestError, 'No se pudo procesar el codigo.'))
      }
    } finally {
      setIsBarcodeLoading(false)
      window.requestAnimationFrame(focusSearch)
    }
  }

  function updateQuantity(productId, quantity) {
    const nextQuantity = Number(quantity)

    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.product_id === productId ? { ...item, quantity: nextQuantity } : item,
      ),
    )
  }

  function removeProduct(productId) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.product_id !== productId),
    )
    window.requestAnimationFrame(focusSearch)
  }

  function clearCart() {
    setCartItems([])
    window.requestAnimationFrame(focusSearch)
  }

  function handleSearchKeyDown(event) {
    if (!searchResults.length) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedResultIndex((current) => Math.min(current + 1, searchResults.length - 1))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedResultIndex((current) => Math.max(current - 1, 0))
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      addProduct(searchResults[selectedResultIndex])
    }

    if (event.key === 'Escape') {
      setSearch('')
      setSearchResults([])
    }
  }

  async function handleConfirmSale() {
    setIsRegisteringSale(true)
    setError('')

    try {
      const sale = await createSale({
        customer_id: customerId ? Number(customerId) : null,
        items: cartItems,
      })
      setCartItems([])
      setCustomerId('')
      setQuote(emptyQuote)
      setIsConfirmOpen(false)
      navigate(`/sales/${sale.id}`, {
        replace: true,
        state: { saleRegistered: true },
      })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo registrar la venta.'))
      setIsConfirmOpen(false)
    } finally {
      setIsRegisteringSale(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100svh-8rem)] w-full gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="flex min-h-0 flex-col gap-4">
        <PosStatusBar
          customerName={selectedCustomer?.name ?? 'Consumidor final'}
          isQuoting={isQuoting}
          user={user}
        />

        <ProductSearchPanel
          barcodeError={barcodeError}
          barcodeProduct={barcodeProduct}
          isBarcodeLoading={isBarcodeLoading}
          isSearching={isSearching}
          onBarcodeSubmit={handleBarcodeSubmit}
          onClearSearch={() => {
            setSearch('')
            setSearchResults([])
            focusSearch()
          }}
          onKeyDown={handleSearchKeyDown}
          onSearchChange={setSearch}
          search={search}
          searchInputRef={searchInputRef}
        />

        {error ? <div className="alert alert-error">{error}</div> : null}

        <ProductResults
          isSearching={isSearching}
          onAddProduct={addProduct}
          results={searchResults}
          search={search}
          selectedIndex={selectedResultIndex}
        />
      </section>

      <PosCart
        cartItems={cartItems}
        cartQuantityByProductId={cartQuantityByProductId}
        customerId={customerId}
        customers={customers}
        isQuoting={isQuoting}
        isRegisteringSale={isRegisteringSale}
        onClearCart={clearCart}
        onCustomerChange={setCustomerId}
        onOpenConfirm={() => setIsConfirmOpen(true)}
        onRemoveProduct={removeProduct}
        onUpdateQuantity={updateQuantity}
        quote={quote}
      />

      <ConfirmDialog
        confirmLabel="Confirmar venta"
        description={`Se registrara una venta por ${formatMoney(quote.total)}. El inventario se descontara automaticamente.`}
        isOpen={isConfirmOpen}
        isSubmitting={isRegisteringSale}
        loadingLabel="Registrando..."
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSale}
        title="Confirmar venta"
        tone="primary"
      />
    </div>
  )
}

function PosStatusBar({ customerName, isQuoting, user }) {
  return (
    <section className="surface p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatusItem label="Caja" value="Principal" />
        <StatusItem label="Turno" value="Activo" />
        <StatusItem label="Cajero" value={user?.email ?? 'Usuario'} />
        <StatusItem label="Cliente" value={customerName} />
        <StatusItem
          icon={FiWifi}
          label="Servicios"
          tone={isQuoting ? 'warning' : 'success'}
          value={isQuoting ? 'Recalculando' : 'Conectado'}
        />
      </div>
    </section>
  )
}

function StatusItem({ icon: Icon = null, label, tone = 'neutral', value }) {
  const badgeClass = tone === 'success' ? 'badge-success' : tone === 'warning' ? 'badge-warning' : 'badge-neutral'

  return (
    <div className="rounded-lg border bg-white px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <span className={`badge mt-2 max-w-full ${badgeClass}`}>
        {Icon ? <Icon aria-hidden="true" /> : null}
        <span className="truncate">{value}</span>
      </span>
    </div>
  )
}

function ProductSearchPanel({
  barcodeError,
  barcodeProduct,
  isBarcodeLoading,
  isSearching,
  onBarcodeSubmit,
  onClearSearch,
  onKeyDown,
  onSearchChange,
  search,
  searchInputRef,
}) {
  return (
    <section className="surface p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
            Punto de venta
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Caja POS</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Escanea, escribe o busca por nombre y SKU. Enter agrega el producto seleccionado.
          </p>
        </div>
        <span className="badge badge-info">
          <FiShoppingCart aria-hidden="true" />
          Optimizado para teclado
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <label className="field-label" htmlFor="pos-product-search">
            Buscar producto
          </label>
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--color-steel-500)' }}
            />
            <input
              className="input h-14 pl-11 pr-12 text-lg"
              id="pos-product-search"
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Nombre, SKU o codigo de barras"
              ref={searchInputRef}
              value={search}
            />
            {search ? (
              <button
                aria-label="Limpiar busqueda"
                className="icon-btn absolute right-2 top-2"
                onClick={onClearSearch}
                type="button"
              >
                <FiX aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {isSearching ? 'Buscando productos...' : 'Usa flechas para seleccionar y Enter para agregar.'}
          </p>
        </div>

        <div>
          <BarcodeInput
            disabled={isBarcodeLoading}
            isLoading={isBarcodeLoading}
            label="Escaneo directo"
            onSubmit={onBarcodeSubmit}
            placeholder="Escanea y presiona Enter"
          />
          {barcodeError ? <div className="alert alert-error mt-3">{barcodeError}</div> : null}
          {barcodeProduct ? (
            <div className="alert alert-success mt-3">
              Producto agregado: {barcodeProduct.name}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function ProductResults({ isSearching, onAddProduct, results, search, selectedIndex }) {
  return (
    <section className="surface min-h-0 flex-1 overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="section-title">Resultados</h2>
          <p className="section-note">
            {isSearching ? 'Buscando productos...' : 'Selecciona un producto para agregarlo.'}
          </p>
        </div>
        <span className="badge badge-neutral">{results.length} resultados</span>
      </div>

      <div className="max-h-full overflow-auto p-3">
        {results.length ? (
          <div className="grid gap-2">
            {results.map((product, index) => (
              <ProductResultRow
                isSelected={index === selectedIndex}
                key={product.id}
                onAdd={() => onAddProduct(product)}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {search ? 'No se encontraron productos.' : 'Escribe o escanea para buscar productos.'}
          </div>
        )}
      </div>
    </section>
  )
}

function ProductResultRow({ isSelected, onAdd, product }) {
  return (
    <button
      aria-label={`Agregar ${product.name} al carrito`}
      className="grid gap-3 rounded-lg border bg-white p-4 text-left transition hover:bg-[var(--color-steel-50)] md:grid-cols-[minmax(0,1fr)_150px_110px]"
      onClick={onAdd}
      style={{
        borderColor: isSelected ? 'var(--color-brand-600)' : 'var(--color-border)',
        boxShadow: isSelected ? '0 0 0 3px rgb(217 119 6 / 0.16)' : 'var(--shadow-xs)',
      }}
      type="button"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{product.name}</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          SKU {product.sku}
          {product.barcode ? ` - ${product.barcode}` : ''}
        </p>
        {product.category?.name ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {product.category.name}
          </p>
        ) : null}
      </div>
      <div className="text-sm">
        <p className="font-semibold">{formatMoney(product.sale_price)}</p>
        <p className={Number(product.stock) <= 0 ? 'badge badge-error mt-2' : 'badge badge-success mt-2'}>
          Stock {product.stock}
        </p>
      </div>
      <span className="btn btn-primary h-9 self-center px-3" aria-hidden="true">
        <FiPlus aria-hidden="true" />
        Agregar
      </span>
      <span className="sr-only">
        Presiona Enter o espacio para agregar este producto.
      </span>
    </button>
  )
}

function PosCart({
  cartItems,
  cartQuantityByProductId,
  customerId,
  customers,
  isQuoting,
  isRegisteringSale,
  onClearCart,
  onCustomerChange,
  onOpenConfirm,
  onRemoveProduct,
  onUpdateQuantity,
  quote,
}) {
  return (
    <aside className="surface flex min-h-[620px] flex-col">
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Carrito de venta</h2>
            <p className="section-note">
              {isQuoting ? 'Recalculando...' : `${quote.items.length} productos`}
            </p>
          </div>
          <button className="btn btn-secondary" disabled={!cartItems.length} onClick={onClearCart} type="button">
            Limpiar
          </button>
        </div>

        <label className="mt-4 block">
          <span className="field-label">Cliente</span>
          <select
            className="select"
            onChange={(event) => onCustomerChange(event.target.value)}
            value={customerId}
          >
            <option value="">Consumidor final</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {quote.items.length ? (
          <div className="space-y-3">
            {quote.items.map((item) => (
              <CartItem
                item={item}
                key={item.product_id}
                onRemove={() => onRemoveProduct(item.product_id)}
                onUpdateQuantity={(quantity) => onUpdateQuantity(item.product_id, quantity)}
                quantity={cartQuantityByProductId[item.product_id] ?? item.quantity}
              />
            ))}
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>

      <PaymentSummary
        cartItems={cartItems}
        isQuoting={isQuoting}
        isRegisteringSale={isRegisteringSale}
        onOpenConfirm={onOpenConfirm}
        quote={quote}
      />
    </aside>
  )
}

function CartItem({ item, onRemove, onUpdateQuantity, quantity }) {
  const stockExceeded = Number(quantity) > Number(item.available_stock)

  return (
    <article className="card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.name}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            SKU {item.sku} - Stock {item.available_stock}
          </p>
        </div>
        <button
          aria-label={`Eliminar ${item.name}`}
          className="icon-btn"
          onClick={onRemove}
          type="button"
        >
          <FiTrash2 aria-hidden="true" />
        </button>
      </div>

      {stockExceeded ? (
        <div className="alert alert-warning mt-3 py-2">
          <FiAlertTriangle aria-hidden="true" />
          La cantidad supera el stock informado.
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          aria-label="Disminuir cantidad"
          className="icon-btn"
          onClick={() => onUpdateQuantity(Math.max(1, Number(quantity) - 1))}
          type="button"
        >
          <FiMinus aria-hidden="true" />
        </button>
        <input
          className="input text-center"
          min="1"
          onChange={(event) => onUpdateQuantity(event.target.value)}
          type="number"
          value={quantity}
        />
        <button
          aria-label="Aumentar cantidad"
          className="icon-btn"
          onClick={() => onUpdateQuantity(Number(quantity) + 1)}
          type="button"
        >
          <FiPlus aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span style={{ color: 'var(--color-text-muted)' }}>
          {item.quantity} x {formatMoney(item.unit_price)}
        </span>
        <strong>{formatMoney(item.line_subtotal)}</strong>
      </div>
    </article>
  )
}

function PaymentSummary({ cartItems, isQuoting, isRegisteringSale, onOpenConfirm, quote }) {
  return (
    <div className="border-t p-5" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
        <p className="font-semibold">Cobro MVP</p>
        <p className="mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Esta version registra la venta y descuenta inventario. El metodo de pago no se guarda aun.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
          <strong>{formatMoney(quote.subtotal)}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Descuentos</span>
          <strong>{formatMoney(0)}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Impuestos</span>
          <strong>Incluidos si aplica</strong>
        </div>
        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-lg font-semibold">Total</span>
          <strong className="text-3xl" style={{ color: 'var(--color-brand-700)' }}>
            {formatMoney(quote.total)}
          </strong>
        </div>
        <button
          className="btn btn-primary mt-3 h-12 w-full text-base"
          disabled={!cartItems.length || isQuoting || isRegisteringSale}
          onClick={onOpenConfirm}
          type="button"
        >
          <FiCreditCard aria-hidden="true" />
          Cobrar venta
        </button>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="grid h-full min-h-72 place-items-center text-center">
      <div>
        <div
          className="mx-auto grid size-14 place-items-center rounded-full"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
        >
          <FiShoppingCart size={24} aria-hidden="true" />
        </div>
        <p className="mt-3 font-semibold">Carrito vacio</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Busca un producto y presiona Enter.
        </p>
      </div>
    </div>
  )
}

export default POSPage
