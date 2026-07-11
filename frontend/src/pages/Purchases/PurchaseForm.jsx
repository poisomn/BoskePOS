import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'

import BarcodeInput from '../../components/BarcodeInput'
import { getProductByBarcode, listProducts } from '../../services/inventoryService'
import { listSuppliers } from '../../services/suppliersService'
import { formatMoney } from '../../utils/formatters'

function PurchaseForm({ fieldErrors = {}, isSubmitting, onCancel, onSubmit, purchase }) {
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true)
  const [lines, setLines] = useState(() => mapPurchaseLines(purchase))
  const [productOptions, setProductOptions] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [reference, setReference] = useState(purchase?.reference ?? '')
  const [notes, setNotes] = useState(purchase?.notes ?? '')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [supplierId, setSupplierId] = useState(purchase?.supplier ? String(purchase.supplier) : '')
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    let ignore = false
    async function fetchSuppliers() {
      setIsLoadingSuppliers(true)
      try {
        const data = await listSuppliers()
        if (!ignore) setSuppliers(data)
      } finally {
        if (!ignore) setIsLoadingSuppliers(false)
      }
    }
    fetchSuppliers()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function fetchProducts() {
      setIsLoadingProducts(true)
      try {
        const data = await listProducts(productSearch)
        if (!ignore) setProductOptions(data.filter((product) => product.is_active !== false))
      } finally {
        if (!ignore) setIsLoadingProducts(false)
      }
    }
    fetchProducts()
    return () => {
      ignore = true
    }
  }, [productSearch])

  const estimatedTotal = useMemo(
    () =>
      lines.reduce((total, line) => {
        const quantity = Number(line.quantity || 0)
        const unitCost = Number(line.unit_cost || 0)
        return total + quantity * unitCost
      }, 0),
    [lines],
  )

  const addProduct = useCallback((product) => {
    if (!product) return

    setLines((current) => {
      if (current.some((line) => String(line.product_id) === String(product.id))) {
        return current
      }

      return [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: 1,
          unit_cost: product.cost_price ?? '0.00',
        },
      ]
    })
  }, [])

  function handleAddSelectedProduct() {
    const product = productOptions.find((option) => String(option.id) === String(selectedProductId))
    addProduct(product)
    setSelectedProductId('')
  }

  async function handleBarcodeSubmit(barcode) {
    setIsBarcodeLoading(true)
    setBarcodeError('')
    setBarcodeProduct(null)

    try {
      const product = await getProductByBarcode(barcode)
      setBarcodeProduct(product)
      addProduct(product)
    } catch (error) {
      if (error.response?.status === 404) {
        setBarcodeError('No existe un producto activo con ese codigo.')
      } else if (error.response?.status === 409) {
        setBarcodeError('El producto existe, pero esta inactivo.')
      } else {
        setBarcodeError('No se pudo buscar el codigo de barras.')
      }
    } finally {
      setIsBarcodeLoading(false)
    }
  }

  function updateLine(productId, field, value) {
    setLines((current) =>
      current.map((line) =>
        String(line.product_id) === String(productId) ? { ...line, [field]: value } : line,
      ),
    )
  }

  function removeLine(productId) {
    setLines((current) => current.filter((line) => String(line.product_id) !== String(productId)))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      supplier_id: supplierId,
      reference: reference.trim(),
      notes: notes.trim(),
      items: lines.map((line) => ({
        product_id: Number(line.product_id),
        quantity: Number(line.quantity),
        unit_cost: String(line.unit_cost || '0'),
      })),
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-3">
        <label>
          <span className="field-label">Proveedor</span>
          <select
            className={`select ${fieldErrors.supplier_id ? 'input-error' : ''}`}
            disabled={isLoadingSuppliers}
            onChange={(event) => setSupplierId(event.target.value)}
            required
            value={supplierId}
          >
            <option value="">Seleccionar proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <FieldError error={fieldErrors.supplier_id} />
        </label>

        <label>
          <span className="field-label">Referencia</span>
          <input
            className="input"
            onChange={(event) => setReference(event.target.value)}
            placeholder="OC, guia o factura interna"
            value={reference}
          />
        </label>

        <label>
          <span className="field-label">Buscar productos</span>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
            <input
              className="input pl-10"
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Nombre, SKU o codigo"
              value={productSearch}
            />
          </div>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label>
          <span className="field-label">Producto</span>
          <select
            className="select"
            disabled={isLoadingProducts}
            onChange={(event) => setSelectedProductId(event.target.value)}
            value={selectedProductId}
          >
            <option value="">Seleccionar producto</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.sku}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary" disabled={!selectedProductId} onClick={handleAddSelectedProduct} type="button">
          <FiPlus aria-hidden="true" />
          Agregar
        </button>
      </div>

      <div className="surface p-4">
        <BarcodeInput
          disabled={isBarcodeLoading}
          isLoading={isBarcodeLoading}
          label="Codigo de barras"
          onSubmit={handleBarcodeSubmit}
        />
        {barcodeError ? <div className="alert alert-error mt-3">{barcodeError}</div> : null}
        {barcodeProduct ? (
          <div className="alert alert-success mt-3">
            Producto agregado: {barcodeProduct.name} ({barcodeProduct.sku})
          </div>
        ) : null}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Cantidad</th>
              <th>Costo</th>
              <th>Subtotal estimado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line) => (
                <tr key={line.product_id}>
                  <td>{line.name}</td>
                  <td>{line.sku}</td>
                  <td>
                    <input
                      className="input max-w-24"
                      min="1"
                      onChange={(event) => updateLine(line.product_id, 'quantity', event.target.value)}
                      type="number"
                      value={line.quantity}
                    />
                  </td>
                  <td>
                    <input
                      className="input max-w-32"
                      min="0"
                      onChange={(event) => updateLine(line.product_id, 'unit_cost', event.target.value)}
                      step="0.01"
                      type="number"
                      value={line.unit_cost}
                    />
                  </td>
                  <td>{formatMoney(Number(line.quantity || 0) * Number(line.unit_cost || 0))}</td>
                  <td>
                    <button className="icon-btn" onClick={() => removeLine(line.product_id)} type="button">
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="text-center" colSpan="6">
                  <span style={{ color: 'var(--color-text-muted)' }}>Agrega productos a la compra.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FieldError error={fieldErrors.items} />

      <label>
        <span className="field-label">Observaciones</span>
        <textarea
          className="textarea"
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </label>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Total estimado
          </p>
          <p className="text-2xl font-semibold">{formatMoney(estimatedTotal)}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={isSubmitting || !lines.length} type="submit">
            {isSubmitting ? 'Guardando...' : 'Guardar borrador'}
          </button>
        </div>
      </div>
    </form>
  )
}

function FieldError({ error }) {
  if (!error) return null
  const message = Array.isArray(error) ? error[0] : error
  return <p className="mt-1 text-xs text-red-700">{message}</p>
}

function mapPurchaseLines(purchase) {
  if (!purchase?.items) return []

  return purchase.items.map((item) => ({
    product_id: item.product,
    name: item.product_name,
    sku: item.product_sku,
    barcode: item.product_barcode,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
  }))
}

export default PurchaseForm
