import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiCheckCircle,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiX,
} from 'react-icons/fi'

import BarcodeInput from '../../components/BarcodeInput'
import ConfirmDialog from '../../components/ConfirmDialog'
import { getProductByBarcode } from '../../services/inventoryService'
import { quotePosCart, searchPosProducts } from '../../services/posService'
import { listCustomers } from '../../services/customersService'
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
    searchInputRef.current?.focus()
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
    searchInputRef.current?.focus()
  }

  function clearCart() {
    setCartItems([])
    searchInputRef.current?.focus()
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
    <div className="grid h-[calc(100svh-8rem)] min-h-[680px] w-full gap-6 xl:grid-cols-[1fr_420px]">
      <section className="flex min-h-0 flex-col gap-4">
        <div className="surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
                Punto de venta
              </p>
              <h1 className="mt-1 text-2xl font-semibold">POS</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Busca por nombre, SKU o codigo de barras. Usa Enter para agregar rapidamente.
              </p>
            </div>

            <span className="badge badge-info">
              Teclado optimizado
            </span>
          </div>

          <div className="relative mt-5">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
            <input
              className="input h-12 pl-11 text-base"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar producto, SKU o codigo de barras"
              ref={searchInputRef}
              value={search}
            />
            {search ? (
              <button
                className="icon-btn absolute right-1 top-1"
                onClick={() => {
                  setSearch('')
                  setSearchResults([])
                }}
                type="button"
                aria-label="Limpiar busqueda"
              >
                <FiX aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <BarcodeInput
                disabled={isBarcodeLoading}
                isLoading={isBarcodeLoading}
                label="Codigo de barras"
                onSubmit={handleBarcodeSubmit}
                placeholder="Escanea y presiona Enter"
              />
              {barcodeError ? <div className="alert alert-error mt-3">{barcodeError}</div> : null}
              {barcodeProduct ? (
                <div className="alert alert-success mt-3">
                  Producto agregado: {barcodeProduct.name}
                </div>
              ) : null}
            </div>
            <label>
              <span className="field-label">Cliente</span>
              <select
                className="select"
                onChange={(event) => setCustomerId(event.target.value)}
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
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <div className="surface min-h-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <h2 className="section-title">Resultados</h2>
              <p className="section-note">
                {isSearching ? 'Buscando productos...' : 'Selecciona un producto para agregarlo.'}
              </p>
            </div>
          </div>

          <div className="max-h-full overflow-auto p-3">
            {searchResults.length ? (
              <div className="grid gap-2">
                {searchResults.map((product, index) => (
                  <button
                    className="flex items-center justify-between gap-4 rounded-md border bg-white p-4 text-left transition hover:bg-[var(--color-steel-50)]"
                    key={product.id}
                    onClick={() => addProduct(product)}
                    style={{
                      borderColor:
                        index === selectedResultIndex
                          ? 'var(--color-brand-600)'
                          : 'var(--color-border)',
                      boxShadow:
                        index === selectedResultIndex
                          ? '0 0 0 3px rgb(242 122 0 / 0.14)'
                          : 'var(--shadow-xs)',
                    }}
                    type="button"
                  >
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        SKU {product.sku}
                        {product.barcode ? ` - ${product.barcode}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(product.sale_price)}</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Stock {product.stock}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {search ? 'No se encontraron productos.' : 'Escribe para buscar productos.'}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="surface flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="section-title">Carrito</h2>
            <p className="section-note">
              {isQuoting ? 'Recalculando...' : `${quote.items.length} productos`}
            </p>
          </div>
          <button className="btn btn-secondary" disabled={!cartItems.length} onClick={clearCart} type="button">
            Limpiar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {quote.items.length ? (
            <div className="space-y-3">
              {quote.items.map((item) => (
                <article className="card p-3" key={item.product_id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        SKU {item.sku} - Stock {item.available_stock}
                      </p>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => removeProduct(item.product_id)}
                      type="button"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <button
                      className="icon-btn"
                      onClick={() =>
                        updateQuantity(
                          item.product_id,
                          Math.max(1, cartQuantityByProductId[item.product_id] - 1),
                        )
                      }
                      type="button"
                      aria-label="Disminuir cantidad"
                    >
                      <FiMinus aria-hidden="true" />
                    </button>
                    <input
                      className="input text-center"
                      min="1"
                      onChange={(event) => updateQuantity(item.product_id, event.target.value)}
                      type="number"
                      value={cartQuantityByProductId[item.product_id] ?? item.quantity}
                    />
                    <button
                      className="icon-btn"
                      onClick={() =>
                        updateQuantity(
                          item.product_id,
                          (cartQuantityByProductId[item.product_id] ?? item.quantity) + 1,
                        )
                      }
                      type="button"
                      aria-label="Aumentar cantidad"
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
              ))}
            </div>
          ) : (
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
          )}
        </div>

        <div className="border-t p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
              <strong>{formatMoney(quote.subtotal)}</strong>
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
              onClick={() => setIsConfirmOpen(true)}
              type="button"
            >
              <FiCheckCircle aria-hidden="true" />
              Cobrar
            </button>
          </div>
        </div>
      </aside>

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

export default POSPage
