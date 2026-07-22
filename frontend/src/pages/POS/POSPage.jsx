import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiCopy,
  FiCreditCard,
  FiDollarSign,
  FiMinus,
  FiPauseCircle,
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
import {
  completeSale,
  createSale,
  discardSale,
  listSalesPage,
  updateSale,
} from '../../services/salesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatMoney } from '../../utils/formatters'

const emptyQuote = {
  items: [],
  subtotal: '0.00',
  discount_total: '0.00',
  tax_total: '0.00',
  total: '0.00',
}

const paymentMethods = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Debito' },
  { value: 'credit', label: 'Credito' },
  { value: 'transfer', label: 'Transferencia' },
]

function createLineId() {
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeMoneyInput(value) {
  return String(value ?? '').replace(',', '.').trim()
}

function buildCartPayloadItems(cartItems) {
  return cartItems.map((item) => ({
    line_id: item.line_id,
    product_id: item.product_id,
    quantity: item.quantity,
    discount_amount: item.discount_amount ? normalizeMoneyInput(item.discount_amount) : '0.00',
    note: item.note || '',
  }))
}

function POSPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const barcodeInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [activeSuspendedSaleId, setActiveSuspendedSaleId] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState('')
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoadingSuspendedSales, setIsLoadingSuspendedSales] = useState(false)
  const [isQuoting, setIsQuoting] = useState(false)
  const [isRegisteringSale, setIsRegisteringSale] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSuspendingSale, setIsSuspendingSale] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [quote, setQuote] = useState(emptyQuote)
  const [saleNotes, setSaleNotes] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)
  const [suspendedSales, setSuspendedSales] = useState([])

  useEffect(() => {
    barcodeInputRef.current?.focus()
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

  const fetchSuspendedSales = useCallback(async () => {
    setIsLoadingSuspendedSales(true)

    try {
      const data = await listSalesPage({ page: 1, pageSize: 8, status: 'pending' })
      setSuspendedSales(data.results)
    } catch {
      setSuspendedSales([])
    } finally {
      setIsLoadingSuspendedSales(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(fetchSuspendedSales)
  }, [fetchSuspendedSales])

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
      const quotedCart = await quotePosCart(buildCartPayloadItems(cartItems))
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

  const cartQuantityByLineId = useMemo(
    () =>
      cartItems.reduce((accumulator, item) => {
        accumulator[item.line_id] = item.quantity
        return accumulator
      }, {}),
    [cartItems],
  )

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId))

  function focusSearch() {
    searchInputRef.current?.focus()
  }

  function focusBarcode() {
    barcodeInputRef.current?.focus()
  }

  function addProduct(product, onAdded = focusBarcode) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) =>
          item.product_id === product.id
          && !Number(item.discount_amount)
          && !item.note,
      )

      if (existingItem) {
        return currentItems.map((item) =>
          item.line_id === existingItem.line_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...currentItems,
        {
          line_id: createLineId(),
          product_id: product.id,
          quantity: 1,
          discount_amount: '0.00',
          note: '',
        },
      ]
    })

    setSearch('')
    setSearchResults([])
    window.requestAnimationFrame(onAdded)
  }

  async function handleBarcodeSubmit(barcode) {
    setIsBarcodeLoading(true)
    setBarcodeError('')
    setBarcodeProduct(null)

    try {
      const product = await getProductByBarcode(barcode)
      setBarcodeProduct(product)
      addProduct(product, focusBarcode)
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
      window.requestAnimationFrame(focusBarcode)
    }
  }

  function updateQuantity(lineId, quantity) {
    const nextQuantity = Number(quantity)

    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.line_id === lineId ? { ...item, quantity: nextQuantity } : item,
      ),
    )
  }

  function updateLineDiscount(lineId, discountAmount) {
    const nextDiscount = normalizeMoneyInput(discountAmount)

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.line_id === lineId ? { ...item, discount_amount: nextDiscount } : item,
      ),
    )
  }

  function updateLineNote(lineId, note) {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.line_id === lineId ? { ...item, note } : item,
      ),
    )
  }

  function duplicateLine(lineId) {
    setCartItems((currentItems) => {
      const sourceIndex = currentItems.findIndex((item) => item.line_id === lineId)
      if (sourceIndex < 0) return currentItems

      const source = currentItems[sourceIndex]
      const copy = {
        ...source,
        line_id: createLineId(),
        quantity: 1,
      }

      return [
        ...currentItems.slice(0, sourceIndex + 1),
        copy,
        ...currentItems.slice(sourceIndex + 1),
      ]
    })
    window.requestAnimationFrame(focusBarcode)
  }

  function removeProduct(lineId) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.line_id !== lineId),
    )
    window.requestAnimationFrame(focusBarcode)
  }

  function clearCart() {
    setCartItems([])
    setActiveSuspendedSaleId(null)
    setSaleNotes('')
    setAmountPaid('')
    window.requestAnimationFrame(focusBarcode)
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

  function buildSalePayload(status = 'completed') {
    return {
      customer_id: customerId ? Number(customerId) : null,
      status,
      payment_method: paymentMethod,
      amount_paid: amountPaid ? normalizeMoneyInput(amountPaid) : undefined,
      notes: saleNotes,
      items: buildCartPayloadItems(cartItems),
    }
  }

  async function handleSuspendSale() {
    if (!cartItems.length) return

    setIsSuspendingSale(true)
    setError('')

    try {
      const payload = buildSalePayload('pending')
      if (activeSuspendedSaleId) {
        await updateSale(activeSuspendedSaleId, payload)
      } else {
        await createSale(payload)
      }

      clearCart()
      await fetchSuspendedSales()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo suspender la venta.'))
    } finally {
      setIsSuspendingSale(false)
    }
  }

  function recoverSuspendedSale(sale) {
    setActiveSuspendedSaleId(sale.id)
    setCustomerId(sale.customer ? String(sale.customer) : '')
    setPaymentMethod(sale.payment_method || 'cash')
    setAmountPaid('')
    setSaleNotes(sale.notes || '')
    setCartItems(
      sale.items.map((item) => ({
        line_id: createLineId(),
        product_id: item.product,
        quantity: item.quantity,
        discount_amount: item.discount_total || '0.00',
        note: item.note || '',
      })),
    )
    window.requestAnimationFrame(focusBarcode)
  }

  async function handleDiscardSuspendedSale(saleId) {
    setError('')

    try {
      await discardSale(saleId)
      if (activeSuspendedSaleId === saleId) {
        clearCart()
      }
      await fetchSuspendedSales()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo eliminar la venta suspendida.'))
    }
  }

  async function handleConfirmSale() {
    setIsRegisteringSale(true)
    setError('')

    try {
      let sale
      if (activeSuspendedSaleId) {
        await updateSale(activeSuspendedSaleId, buildSalePayload('pending'))
        sale = await completeSale(activeSuspendedSaleId, {
          payment_method: paymentMethod,
          amount_paid: amountPaid ? normalizeMoneyInput(amountPaid) : undefined,
          notes: saleNotes,
        })
      } else {
        sale = await createSale(buildSalePayload('completed'))
      }

      clearCart()
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
          activeSuspendedSaleId={activeSuspendedSaleId}
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
          barcodeInputRef={barcodeInputRef}
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
        activeSuspendedSaleId={activeSuspendedSaleId}
        amountPaid={amountPaid}
        cartItems={cartItems}
        cartQuantityByLineId={cartQuantityByLineId}
        customerId={customerId}
        customers={customers}
        isLoadingSuspendedSales={isLoadingSuspendedSales}
        isQuoting={isQuoting}
        isRegisteringSale={isRegisteringSale}
        isSuspendingSale={isSuspendingSale}
        onAmountPaidChange={setAmountPaid}
        onClearCart={clearCart}
        onCustomerChange={setCustomerId}
        onDiscardSuspendedSale={handleDiscardSuspendedSale}
        onDuplicateLine={duplicateLine}
        onLineDiscountChange={updateLineDiscount}
        onLineNoteChange={updateLineNote}
        onOpenConfirm={() => setIsConfirmOpen(true)}
        onPaymentMethodChange={setPaymentMethod}
        onRecoverSuspendedSale={recoverSuspendedSale}
        onRemoveProduct={removeProduct}
        onSaleNotesChange={setSaleNotes}
        onSuspendSale={handleSuspendSale}
        onUpdateQuantity={updateQuantity}
        paymentMethod={paymentMethod}
        quote={quote}
        saleNotes={saleNotes}
        suspendedSales={suspendedSales}
      />

      <ConfirmDialog
        confirmLabel="Confirmar venta"
        description={`Se registrara una venta por ${formatMoney(quote.total)}. Recibido: ${formatMoney(amountPaid || quote.total)}. Vuelto: ${formatMoney(paymentMethod === 'cash' ? Math.max(0, Number(normalizeMoneyInput(amountPaid) || 0) - Number(quote.total || 0)) : 0)}.`}
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

function PosStatusBar({ activeSuspendedSaleId, customerName, isQuoting, user }) {
  return (
    <section className="surface p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
        {activeSuspendedSaleId ? (
          <StatusItem
            icon={FiPauseCircle}
            label="Suspendida"
            tone="warning"
            value={`#${activeSuspendedSaleId}`}
          />
        ) : null}
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
  barcodeInputRef,
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

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div>
          <BarcodeInput
            autoFocus
            disabled={isBarcodeLoading}
            isLoading={isBarcodeLoading}
            label="Escanear codigo de barras"
            onSubmit={onBarcodeSubmit}
            placeholder="Escanea o escribe el codigo y presiona Enter"
            ref={barcodeInputRef}
          />
          {barcodeError ? <div className="alert alert-error mt-3">{barcodeError}</div> : null}
          {barcodeProduct ? (
            <div className="alert alert-success mt-3">
              Producto agregado: {barcodeProduct.name}
            </div>
          ) : null}
        </div>

        <div>
          <label className="field-label" htmlFor="pos-product-search">
            Busqueda manual
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
              placeholder="Nombre, SKU o codigo"
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
  activeSuspendedSaleId,
  amountPaid,
  cartItems,
  cartQuantityByLineId,
  customerId,
  customers,
  isLoadingSuspendedSales,
  isQuoting,
  isRegisteringSale,
  isSuspendingSale,
  onAmountPaidChange,
  onClearCart,
  onCustomerChange,
  onDiscardSuspendedSale,
  onDuplicateLine,
  onLineDiscountChange,
  onLineNoteChange,
  onOpenConfirm,
  onPaymentMethodChange,
  onRecoverSuspendedSale,
  onRemoveProduct,
  onSaleNotesChange,
  onSuspendSale,
  onUpdateQuantity,
  paymentMethod,
  quote,
  saleNotes,
  suspendedSales,
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

        <label className="mt-4 block">
          <span className="field-label">Observacion de venta</span>
          <textarea
            className="textarea min-h-20"
            onChange={(event) => onSaleNotesChange(event.target.value)}
            placeholder="Comentario interno para el comprobante"
            value={saleNotes}
          />
        </label>

        <SuspendedSalesPanel
          activeSuspendedSaleId={activeSuspendedSaleId}
          isLoading={isLoadingSuspendedSales}
          onDiscard={onDiscardSuspendedSale}
          onRecover={onRecoverSuspendedSale}
          sales={suspendedSales}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {quote.items.length ? (
          <div className="space-y-3">
            {quote.items.map((item) => {
              const cartLine = cartItems.find((cartItem) => cartItem.line_id === item.line_id)

              return (
                <CartItem
                  discountValue={cartLine?.discount_amount ?? item.discount_total}
                  item={item}
                  key={item.line_id || `${item.product_id}-${item.quantity}-${item.line_total}`}
                  noteValue={cartLine?.note ?? item.note ?? ''}
                  onDiscountChange={(discount) => onLineDiscountChange(item.line_id, discount)}
                  onDuplicate={() => onDuplicateLine(item.line_id)}
                  onNoteChange={(note) => onLineNoteChange(item.line_id, note)}
                  onRemove={() => onRemoveProduct(item.line_id)}
                  onUpdateQuantity={(quantity) => onUpdateQuantity(item.line_id, quantity)}
                  quantity={cartQuantityByLineId[item.line_id] ?? item.quantity}
                />
              )
            })}
          </div>
        ) : (
          <EmptyCart />
        )}
      </div>

      <PaymentSummary
        amountPaid={amountPaid}
        cartItems={cartItems}
        isQuoting={isQuoting}
        isRegisteringSale={isRegisteringSale}
        isSuspendingSale={isSuspendingSale}
        onAmountPaidChange={onAmountPaidChange}
        onOpenConfirm={onOpenConfirm}
        onPaymentMethodChange={onPaymentMethodChange}
        onSuspendSale={onSuspendSale}
        paymentMethod={paymentMethod}
        quote={quote}
      />
    </aside>
  )
}

function SuspendedSalesPanel({
  activeSuspendedSaleId,
  isLoading,
  onDiscard,
  onRecover,
  sales,
}) {
  return (
    <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Ventas suspendidas</p>
        <span className="badge badge-neutral">
          {isLoading ? 'Cargando' : sales.length}
        </span>
      </div>
      <div className="mt-3 max-h-36 space-y-2 overflow-auto">
        {sales.length ? (
          sales.map((sale) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border bg-white p-2 text-sm"
              key={sale.id}
              style={{
                borderColor: activeSuspendedSaleId === sale.id
                  ? 'var(--color-brand-600)'
                  : 'var(--color-border)',
              }}
            >
              <button
                className="min-w-0 text-left"
                onClick={() => onRecover(sale)}
                type="button"
              >
                <span className="block truncate font-semibold">Venta #{sale.id}</span>
                <span className="block truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {sale.customer_name || 'Consumidor final'} - {formatMoney(sale.total)}
                </span>
              </button>
              <button
                aria-label={`Eliminar venta suspendida ${sale.id}`}
                className="icon-btn"
                onClick={() => onDiscard(sale.id)}
                type="button"
              >
                <FiTrash2 aria-hidden="true" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No hay ventas suspendidas.
          </p>
        )}
      </div>
    </div>
  )
}

function CartItem({
  discountValue,
  item,
  noteValue,
  onDiscountChange,
  onDuplicate,
  onNoteChange,
  onRemove,
  onUpdateQuantity,
  quantity,
}) {
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Descuento linea</span>
          <input
            className="input"
            inputMode="decimal"
            min="0"
            onChange={(event) => onDiscountChange(event.target.value)}
            placeholder="0"
            type="text"
            value={discountValue}
          />
        </label>
        <label>
          <span className="field-label">Observacion</span>
          <input
            className="input"
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Opcional"
            type="text"
            value={noteValue}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div style={{ color: 'var(--color-text-muted)' }}>
          <span>{item.quantity} x {formatMoney(item.unit_price)}</span>
          <span className="ml-2">IVA {formatMoney(item.tax_total)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary h-9 px-3" onClick={onDuplicate} type="button">
            <FiCopy aria-hidden="true" />
            Duplicar
          </button>
          <strong>{formatMoney(item.line_total ?? item.line_subtotal)}</strong>
        </div>
      </div>
    </article>
  )
}

function PaymentSummary({
  amountPaid,
  cartItems,
  isQuoting,
  isRegisteringSale,
  isSuspendingSale,
  onAmountPaidChange,
  onOpenConfirm,
  onPaymentMethodChange,
  onSuspendSale,
  paymentMethod,
  quote,
}) {
  const total = Number(quote.total || 0)
  const paid = Number(normalizeMoneyInput(amountPaid) || 0)
  const change = paymentMethod === 'cash' ? Math.max(0, paid - total) : 0
  const canCharge = Boolean(cartItems.length) && !isQuoting && !isRegisteringSale

  return (
    <div className="border-t p-5" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
        <p className="font-semibold">Medio de pago</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => (
            <button
              className={`btn h-10 ${paymentMethod === method.value ? 'btn-primary' : 'btn-secondary'}`}
              key={method.value}
              onClick={() => onPaymentMethodChange(method.value)}
              type="button"
            >
              {method.label}
            </button>
          ))}
        </div>
        {paymentMethod === 'cash' ? (
          <label className="mt-3 block">
            <span className="field-label">Efectivo recibido</span>
            <input
              className="input"
              inputMode="decimal"
              onChange={(event) => onAmountPaidChange(event.target.value)}
              placeholder="Ej: 10000"
              type="text"
              value={amountPaid}
            />
          </label>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
          <strong>{formatMoney(quote.subtotal)}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Descuentos</span>
          <strong>{formatMoney(quote.discount_total)}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-text-muted)' }}>Impuestos</span>
          <strong>{formatMoney(quote.tax_total)}</strong>
        </div>
        {paymentMethod === 'cash' ? (
          <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Recibido</span>
              <strong>{formatMoney(paid)}</strong>
            </div>
            <div className="mt-2 flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Vuelto</span>
              <strong>{formatMoney(change)}</strong>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-lg font-semibold">Total</span>
          <strong className="text-3xl" style={{ color: 'var(--color-brand-700)' }}>
            {formatMoney(quote.total)}
          </strong>
        </div>
        <button
          className="btn btn-secondary mt-3 h-11 w-full text-base"
          disabled={!cartItems.length || isQuoting || isSuspendingSale}
          onClick={onSuspendSale}
          type="button"
        >
          <FiPauseCircle aria-hidden="true" />
          {isSuspendingSale ? 'Guardando...' : 'Suspender venta'}
        </button>
        <button
          className="btn btn-primary mt-3 h-12 w-full text-base"
          disabled={!canCharge}
          onClick={onOpenConfirm}
          type="button"
        >
          {paymentMethod === 'cash' ? <FiDollarSign aria-hidden="true" /> : <FiCreditCard aria-hidden="true" />}
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
