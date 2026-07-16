import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Wifi,
  X,
  PackageSearch
} from 'lucide-react'

import BarcodeInput from '../../components/BarcodeInput'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { listCustomers } from '../../services/customersService'
import { getProductByBarcode, listProducts, listCategories } from '../../services/inventoryService'
import { quotePosCart } from '../../services/posService'
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
  
  const [customers, setCustomers] = useState([])
  const [categories, setCategories] = useState([])
  const [allProducts, setAllProducts] = useState([])
  
  const [activeCategory, setActiveCategory] = useState('')
  const [search, setSearch] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [cartItems, setCartItems] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [quote, setQuote] = useState(emptyQuote)
  
  const [error, setError] = useState('')
  const [isQuoting, setIsQuoting] = useState(false)
  const [isRegisteringSale, setIsRegisteringSale] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    queueMicrotask(async () => {
      setIsLoadingData(true)
      try {
        const [customersData, productsData, categoriesData] = await Promise.all([
          listCustomers(),
          listProducts('', ''),
          listCategories()
        ])
        
        setCustomers(customersData.filter((c) => c.is_active !== false))
        setAllProducts(productsData.filter(p => p.is_active))
        setCategories(categoriesData.filter((c) => c.is_active))
      } catch (err) {
        setError('Error al cargar la base de datos del POS.')
      } finally {
        setIsLoadingData(false)
      }
    })
  }, [])

  const displayedProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesCategory = activeCategory === '' || product.category === activeCategory;
      const searchLower = search.toLowerCase();
      const matchesSearch = search === '' || 
                            product.name.toLowerCase().includes(searchLower) || 
                            product.sku.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, activeCategory, search])


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
    () => cartItems.reduce((acc, item) => {
        acc[item.product_id] = item.quantity
        return acc
      }, {}),
    [cartItems],
  )

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId))

  function focusSearch() {
    searchInputRef.current?.focus()
  }

  // VALIDACIÓN ESTRICTA DE FRONTEND APLICADA AQUÍ
  function addProduct(product) {
    if (product.stock <= 0) {
      setError(`Stock agotado: No puedes agregar "${product.name}".`);
      setTimeout(() => setError(''), 4000); // El error desaparece solo
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.product_id === product.id)
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          setError(`Límite alcanzado: Solo hay ${product.stock} unidades de "${product.name}".`);
          setTimeout(() => setError(''), 4000);
          return currentItems;
        }
        setError('');
        return currentItems.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      setError('');
      return [...currentItems, { product_id: product.id, quantity: 1 }]
    })
    setSearch('')
    window.requestAnimationFrame(focusSearch)
  }

  async function handleBarcodeSubmit(barcode) {
    setBarcodeError('')
    try {
      const product = await getProductByBarcode(barcode)
      if (product.stock <= 0) {
        setBarcodeError(`El producto "${product.name}" no tiene stock disponible.`);
        setTimeout(() => setBarcodeError(''), 4000);
        return;
      }
      addProduct(product)
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        setBarcodeError('Código no encontrado.')
      } else {
        setBarcodeError('Error al procesar código.')
      }
      setTimeout(() => setBarcodeError(''), 4000);
    } finally {
      window.requestAnimationFrame(focusSearch)
    }
  }

  function updateQuantity(productId, quantity) {
    const nextQuantity = Number(quantity)
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) return
    setCartItems((currentItems) =>
      currentItems.map((item) => item.product_id === productId ? { ...item, quantity: nextQuantity } : item)
    )
  }

  function removeProduct(productId) {
    setCartItems((currentItems) => currentItems.filter((item) => item.product_id !== productId))
    window.requestAnimationFrame(focusSearch)
  }

  function clearCart() {
    setCartItems([])
    window.requestAnimationFrame(focusSearch)
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
      navigate(`/sales/${sale.id}`, { replace: true, state: { saleRegistered: true } })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo registrar la venta.'))
      setIsConfirmOpen(false)
    } finally {
      setIsRegisteringSale(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100svh-5rem)] w-full gap-5 bg-[#F8FAFC]">
      
      <section className="flex flex-1 flex-col min-w-0 gap-4">
        <PosStatusBar
          customerName={selectedCustomer?.name ?? 'Consumidor final'}
          isQuoting={isQuoting}
          user={user}
        />

        {error && <div className="p-3 text-sm text-[#EF4444] bg-red-50 rounded-lg border border-red-100">{error}</div>}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={searchInputRef}
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-gray-300 focus:ring-1 focus:ring-[#F59E0B] focus:border-[#F59E0B] text-sm outline-none"
              placeholder="Buscar producto por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="w-full md:w-72 relative">
            <BarcodeInput
              label=""
              onSubmit={handleBarcodeSubmit}
              placeholder="Escanea código de barras..."
            />
            {barcodeError && <span className="text-xs text-red-500 mt-1 absolute -bottom-5 right-0">{barcodeError}</span>}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === '' 
                ? 'bg-[#F59E0B] text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.id 
                  ? 'bg-[#F59E0B] text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pb-4 pr-2">
          {isLoadingData ? (
             <div className="flex h-64 items-center justify-center text-gray-500">Cargando inventario...</div>
          ) : displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    disabled={isOutOfStock}
                    className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all text-left flex flex-col justify-between h-36 group focus:outline-none focus:ring-2 focus:ring-[#F59E0B] ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-[#F59E0B] hover:shadow-md'}`}
                  >
                    <div>
                      <h3 className={`font-semibold leading-tight line-clamp-2 transition-colors ${isOutOfStock ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#F59E0B]'}`}>{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                    </div>
                    <div className="flex justify-between items-end w-full mt-2">
                      <span className={`font-bold text-lg ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'}`}>{formatMoney(product.sale_price)}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isOutOfStock ? 'bg-gray-200 text-gray-600' : product.stock > product.minimum_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} un.
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col h-64 items-center justify-center text-gray-400">
              <PackageSearch className="h-16 w-16 mb-4 text-gray-300" />
              <p>No se encontraron productos.</p>
            </div>
          )}
        </div>
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
        description={`Se registrará una venta por ${formatMoney(quote.total)}. El inventario se descontará automáticamente.`}
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatusItem label="Caja" value="Principal" />
      <StatusItem label="Turno" value="Activo" />
      <StatusItem label="Cajero" value={user?.email ?? 'Usuario'} />
      <StatusItem label="Cliente" value={customerName} />
      <StatusItem
        icon={Wifi}
        label="Servicios"
        isWarning={isQuoting}
        value={isQuoting ? 'Calculando...' : 'Conectado'}
      />
    </div>
  )
}

function StatusItem({ icon: Icon = null, label, isWarning = false, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm flex flex-col justify-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`h-4 w-4 ${isWarning ? 'text-[#F59E0B]' : 'text-green-500'}`} />}
        <span className={`text-sm font-semibold truncate ${isWarning ? 'text-[#F59E0B]' : 'text-gray-700'}`}>{value}</span>
      </div>
    </div>
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
  const total = Number(quote.total) || 0;
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  return (
    <aside className="w-full lg:w-[400px] xl:w-[430px] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[calc(100svh-5rem)] flex-shrink-0">
      
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Orden actual</h2>
          <p className="text-xs text-gray-500 mt-1">{cartItems.length} ítems en el carrito</p>
        </div>
        <button 
          onClick={onClearCart} 
          disabled={!cartItems.length}
          className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors"
        >
          Vaciar
        </button>
      </div>

      <div className="p-4 border-b border-gray-100">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Cliente Asignado</label>
        <select
          className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm text-gray-700 focus:ring-1 focus:ring-[#F59E0B] focus:border-[#F59E0B] outline-none bg-gray-50"
          onChange={(e) => onCustomerChange(e.target.value)}
          value={customerId}
        >
          <option value="">Consumidor final (Sin RUT)</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {quote.items.length > 0 ? (
          quote.items.map((item) => (
            <CartItem
              item={item}
              key={item.product_id}
              onRemove={() => onRemoveProduct(item.product_id)}
              onUpdateQuantity={(quantity) => onUpdateQuantity(item.product_id, quantity)}
              quantity={cartQuantityByProductId[item.product_id] ?? item.quantity}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm">El carrito está vacío</p>
          </div>
        )}
      </div>

      <div className="p-5 border-t border-gray-200 bg-white rounded-b-xl">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Neto</span>
            <span>{formatMoney(neto)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>IVA (19%)</span>
            <span>{formatMoney(iva)}</span>
          </div>
          <div className="flex justify-between items-end pt-3 border-t border-dashed border-gray-200 mt-2">
            <span className="text-base font-semibold text-gray-900">Total a Pagar</span>
            <span className="text-3xl font-bold text-[#F59E0B]">{formatMoney(total)}</span>
          </div>
        </div>

        <button
          disabled={!cartItems.length || isQuoting || isRegisteringSale}
          onClick={onOpenConfirm}
          className="w-full h-14 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <CreditCard className="h-6 w-6" />
          {isQuoting ? 'Calculando...' : 'Cobrar Orden'}
        </button>
      </div>
    </aside>
  )
}

function CartItem({ item, onRemove, onUpdateQuantity, quantity }) {
  const isMaxStockReached = Number(quantity) >= Number(item.available_stock);

  return (
    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative">
      <div className="flex justify-between items-start pr-8">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
        </div>
        <p className="font-bold text-gray-900">{formatMoney(item.line_subtotal)}</p>
      </div>

      {isMaxStockReached && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-red-600 bg-red-50 p-1.5 rounded-md">
          <AlertTriangle className="h-3 w-3" /> Supera stock ({item.available_stock})
        </div>
      )}

      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-9">
          
          {/* MEJORA 1: Si la cantidad es 1, el botón de restar se convierte en eliminar */}
          <button 
            onClick={() => {
              if (Number(quantity) === 1) {
                onRemove();
              } else {
                onUpdateQuantity(Number(quantity) - 1);
              }
            }} 
            className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition-colors"
          >
            {Number(quantity) === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </button>
          
          <input
            type="number"
            min="1"
            max={item.available_stock}
            value={quantity}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > item.available_stock) {
                onUpdateQuantity(item.available_stock);
              } else if (val >= 1) {
                onUpdateQuantity(val);
              }
            }}
            className="w-10 h-full text-center text-sm font-semibold bg-transparent outline-none border-x border-gray-200 hide-arrows"
          />
          
          <button 
            onClick={() => {
              if (isMaxStockReached) return;
              onUpdateQuantity(Number(quantity) + 1);
            }} 
            disabled={isMaxStockReached}
            className={`w-8 h-full flex items-center justify-center transition-colors rounded-r-lg ${isMaxStockReached ? 'text-gray-300' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs font-medium text-gray-400">{formatMoney(item.unit_price)} c/u</span>
      </div>

      {/* MEJORA 2: El basurero principal ahora es SIEMPRE visible, ya no se oculta */}
      <button 
        onClick={onRemove} 
        title="Quitar del carrito"
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 p-1 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export default POSPage