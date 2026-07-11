import { useState } from 'react'

const PRODUCT_UNITS = [
  { label: 'Unidad', value: 'unidad' },
  { label: 'Metro', value: 'metro' },
  { label: 'Kilo', value: 'kilo' },
  { label: 'Litro', value: 'litro' },
  { label: 'Caja', value: 'caja' },
  { label: 'Bolsa', value: 'bolsa' },
  { label: 'Rollo', value: 'rollo' },
  { label: 'Par', value: 'par' },
]

const initialState = {
  category: '',
  name: '',
  sku: '',
  barcode: '',
  brand: '',
  unit: 'unidad',
  location: '',
  description: '',
  cost_price: '0.00',
  sale_price: '',
  tax_rate: '19.00',
  stock: '0',
  minimum_stock: '0',
  is_active: true,
}

function ProductForm({ categories, fieldErrors = {}, isSubmitting, onCancel, onSubmit, product }) {
  const [formData, setFormData] = useState(() =>
    product ? mapProductToForm(product) : initialState,
  )
  const [localErrors, setLocalErrors] = useState({})

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setLocalErrors((current) => ({ ...current, [field]: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = formData.name.trim()
    const sku = formData.sku.trim()

    if (!name || !sku) {
      setLocalErrors({
        name: name ? '' : 'El nombre del producto es obligatorio.',
        sku: sku ? '' : 'El SKU del producto es obligatorio.',
      })
      return
    }

    onSubmit({
      category: formData.category ? Number(formData.category) : null,
      name,
      sku,
      barcode: formData.barcode.trim() || null,
      brand: formData.brand.trim(),
      unit: formData.unit,
      location: formData.location.trim(),
      description: formData.description.trim(),
      cost_price: formData.cost_price || '0.00',
      sale_price: formData.sale_price,
      tax_rate: formData.tax_rate || '19.00',
      minimum_stock: Number(formData.minimum_stock),
      is_active: formData.is_active,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="field-label">Nombre</span>
          <input
            aria-describedby={getFieldError('name', localErrors, fieldErrors) ? 'product-name-error' : undefined}
            aria-invalid={Boolean(getFieldError('name', localErrors, fieldErrors))}
            className="input"
            id="product-name"
            onChange={(event) => updateField('name', event.target.value)}
            required
            value={formData.name}
          />
          <FieldError id="product-name-error" message={getFieldError('name', localErrors, fieldErrors)} />
        </label>

        <label>
          <span className="field-label">SKU</span>
          <input
            aria-describedby={getFieldError('sku', localErrors, fieldErrors) ? 'product-sku-error' : undefined}
            aria-invalid={Boolean(getFieldError('sku', localErrors, fieldErrors))}
            className="input"
            id="product-sku"
            onChange={(event) => updateField('sku', event.target.value.toUpperCase())}
            required
            value={formData.sku}
          />
          <FieldError id="product-sku-error" message={getFieldError('sku', localErrors, fieldErrors)} />
        </label>

        <label>
          <span className="field-label">Marca</span>
          <input
            className="input"
            onChange={(event) => updateField('brand', event.target.value)}
            placeholder="Ej: Bosch, Makita, 3M"
            value={formData.brand}
          />
        </label>

        <label>
          <span className="field-label">Categoria</span>
          <select
            aria-describedby={getFieldError('category', localErrors, fieldErrors) ? 'product-category-error' : undefined}
            aria-invalid={Boolean(getFieldError('category', localErrors, fieldErrors))}
            className="select"
            id="product-category"
            onChange={(event) => updateField('category', event.target.value)}
            value={formData.category}
          >
            <option value="">Sin categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldError id="product-category-error" message={getFieldError('category', localErrors, fieldErrors)} />
        </label>

        <label>
          <span className="field-label">Codigo de barras</span>
          <input
            aria-describedby={getFieldError('barcode', localErrors, fieldErrors) ? 'product-barcode-error' : undefined}
            aria-invalid={Boolean(getFieldError('barcode', localErrors, fieldErrors))}
            className="input"
            id="product-barcode"
            onChange={(event) => updateField('barcode', event.target.value)}
            value={formData.barcode}
          />
          <FieldError id="product-barcode-error" message={getFieldError('barcode', localErrors, fieldErrors)} />
        </label>

        <label>
          <span className="field-label">Unidad</span>
          <select
            className="select"
            onChange={(event) => updateField('unit', event.target.value)}
            required
            value={formData.unit}
          >
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Ubicacion</span>
          <input
            className="input"
            onChange={(event) => updateField('location', event.target.value)}
            placeholder="Ej: A-01-01"
            value={formData.location}
          />
        </label>

        <label>
          <span className="field-label">Costo</span>
          <input
            aria-describedby={getFieldError('cost_price', localErrors, fieldErrors) ? 'product-cost-error' : undefined}
            aria-invalid={Boolean(getFieldError('cost_price', localErrors, fieldErrors))}
            className="input"
            id="product-cost"
            min="0"
            onChange={(event) => updateField('cost_price', event.target.value)}
            step="0.01"
            type="number"
            value={formData.cost_price}
          />
          <FieldError id="product-cost-error" message={getFieldError('cost_price', localErrors, fieldErrors)} />
        </label>

        <label>
          <span className="field-label">Precio venta</span>
          <input
            aria-describedby={getFieldError('sale_price', localErrors, fieldErrors) ? 'product-sale-error' : undefined}
            aria-invalid={Boolean(getFieldError('sale_price', localErrors, fieldErrors))}
            className="input"
            id="product-sale"
            min="0"
            onChange={(event) => updateField('sale_price', event.target.value)}
            required
            step="0.01"
            type="number"
            value={formData.sale_price}
          />
          <FieldError id="product-sale-error" message={getFieldError('sale_price', localErrors, fieldErrors)} />
        </label>

        <label>
          <span className="field-label">IVA (%)</span>
          <input
            aria-describedby={getFieldError('tax_rate', localErrors, fieldErrors) ? 'product-tax-error' : undefined}
            aria-invalid={Boolean(getFieldError('tax_rate', localErrors, fieldErrors))}
            className="input"
            id="product-tax"
            min="0"
            onChange={(event) => updateField('tax_rate', event.target.value)}
            required
            step="0.01"
            type="number"
            value={formData.tax_rate}
          />
          <FieldError id="product-tax-error" message={getFieldError('tax_rate', localErrors, fieldErrors)} />
        </label>

        <div>
          <span className="field-label">Stock actual</span>
          <div className="input flex items-center" style={{ background: 'var(--color-steel-50)' }}>
            {formData.stock}
          </div>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Las existencias se modifican desde ajustes de stock.
          </p>
        </div>

        <label>
          <span className="field-label">Stock minimo</span>
          <input
            aria-describedby={getFieldError('minimum_stock', localErrors, fieldErrors) ? 'product-min-stock-error' : undefined}
            aria-invalid={Boolean(getFieldError('minimum_stock', localErrors, fieldErrors))}
            className="input"
            id="product-min-stock"
            min="0"
            onChange={(event) => updateField('minimum_stock', event.target.value)}
            type="number"
            value={formData.minimum_stock}
          />
          <FieldError id="product-min-stock-error" message={getFieldError('minimum_stock', localErrors, fieldErrors)} />
        </label>
      </div>

      <label>
        <span className="field-label">Descripcion</span>
        <textarea
          className="textarea"
          onChange={(event) => updateField('description', event.target.value)}
          value={formData.description}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={formData.is_active}
          onChange={(event) => updateField('is_active', event.target.checked)}
          type="checkbox"
        />
        Producto activo
      </label>

      <div className="flex justify-end gap-2">
        <button className="btn btn-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="btn btn-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function FieldError({ id, message }) {
  if (!message) {
    return null
  }

  return (
    <p className="mt-1 text-sm" id={id} style={{ color: 'var(--color-error)' }}>
      {message}
    </p>
  )
}

function getFieldError(field, localErrors, fieldErrors) {
  return localErrors[field] || fieldErrors[field]?.[0] || fieldErrors[field] || ''
}

function mapProductToForm(product) {
  return {
    category: product.category ?? '',
    name: product.name ?? '',
    sku: product.sku ?? '',
    barcode: product.barcode ?? '',
    brand: product.brand ?? '',
    unit: product.unit ?? 'unidad',
    location: product.location ?? '',
    description: product.description ?? '',
    cost_price: product.cost_price ?? '0.00',
    sale_price: product.sale_price ?? '',
    tax_rate: product.tax_rate ?? '19.00',
    stock: String(product.stock ?? 0),
    minimum_stock: String(product.minimum_stock ?? 0),
    is_active: Boolean(product.is_active),
  }
}

export default ProductForm
