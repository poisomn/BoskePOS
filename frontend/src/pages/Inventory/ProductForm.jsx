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

function ProductForm({ categories, isSubmitting, onCancel, onSubmit, product }) {
  const [formData, setFormData] = useState(() =>
    product ? mapProductToForm(product) : initialState,
  )

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      category: formData.category ? Number(formData.category) : null,
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      barcode: formData.barcode.trim() || null,
      brand: formData.brand.trim(),
      unit: formData.unit,
      location: formData.location.trim(),
      description: formData.description.trim(),
      cost_price: formData.cost_price || '0.00',
      sale_price: formData.sale_price,
      tax_rate: formData.tax_rate || '19.00',
      stock: Number(formData.stock),
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
            className="input"
            onChange={(event) => updateField('name', event.target.value)}
            required
            value={formData.name}
          />
        </label>

        <label>
          <span className="field-label">SKU</span>
          <input
            className="input"
            onChange={(event) => updateField('sku', event.target.value)}
            required
            value={formData.sku}
          />
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
            className="select"
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
        </label>

        <label>
          <span className="field-label">Codigo de barras</span>
          <input
            className="input"
            onChange={(event) => updateField('barcode', event.target.value)}
            value={formData.barcode}
          />
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
            className="input"
            min="0"
            onChange={(event) => updateField('cost_price', event.target.value)}
            step="0.01"
            type="number"
            value={formData.cost_price}
          />
        </label>

        <label>
          <span className="field-label">Precio venta</span>
          <input
            className="input"
            min="0"
            onChange={(event) => updateField('sale_price', event.target.value)}
            required
            step="0.01"
            type="number"
            value={formData.sale_price}
          />
        </label>

        <label>
          <span className="field-label">IVA (%)</span>
          <input
            className="input"
            min="0"
            onChange={(event) => updateField('tax_rate', event.target.value)}
            required
            step="0.01"
            type="number"
            value={formData.tax_rate}
          />
        </label>

        <label>
          <span className="field-label">Stock</span>
          <input
            className="input"
            min="0"
            onChange={(event) => updateField('stock', event.target.value)}
            required
            type="number"
            value={formData.stock}
          />
        </label>

        <label>
          <span className="field-label">Stock minimo</span>
          <input
            className="input"
            min="0"
            onChange={(event) => updateField('minimum_stock', event.target.value)}
            type="number"
            value={formData.minimum_stock}
          />
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
