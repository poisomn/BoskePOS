import { useState } from 'react'

const initialState = {
  name: '',
  rut: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  is_active: true,
}

function SupplierForm({ fieldErrors = {}, isSubmitting, onCancel, onSubmit, supplier }) {
  const [formData, setFormData] = useState(() =>
    supplier ? mapSupplierToForm(supplier) : initialState,
  )

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      name: formData.name.trim(),
      rut: formData.rut.trim() || null,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      is_active: formData.is_active,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="field-label">Razon social</span>
          <input
            aria-invalid={Boolean(fieldErrors.name)}
            className={`input ${fieldErrors.name ? 'input-error' : ''}`}
            onChange={(event) => updateField('name', event.target.value)}
            required
            value={formData.name}
          />
          <FieldError error={fieldErrors.name} />
        </label>

        <label>
          <span className="field-label">RUT</span>
          <input
            aria-invalid={Boolean(fieldErrors.rut)}
            className={`input ${fieldErrors.rut ? 'input-error' : ''}`}
            onChange={(event) => updateField('rut', event.target.value)}
            placeholder="76.543.210-3"
            value={formData.rut}
          />
          <FieldError error={fieldErrors.rut} />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Opcional. Se normalizara y validara en el backend.
          </p>
        </label>

        <label>
          <span className="field-label">Email</span>
          <input
            aria-invalid={Boolean(fieldErrors.email)}
            className={`input ${fieldErrors.email ? 'input-error' : ''}`}
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
            value={formData.email}
          />
          <FieldError error={fieldErrors.email} />
        </label>

        <label>
          <span className="field-label">Telefono</span>
          <input
            aria-invalid={Boolean(fieldErrors.phone)}
            className={`input ${fieldErrors.phone ? 'input-error' : ''}`}
            onChange={(event) => updateField('phone', event.target.value)}
            value={formData.phone}
          />
          <FieldError error={fieldErrors.phone} />
        </label>

        <label>
          <span className="field-label">Ciudad / comuna</span>
          <input
            aria-invalid={Boolean(fieldErrors.city)}
            className={`input ${fieldErrors.city ? 'input-error' : ''}`}
            onChange={(event) => updateField('city', event.target.value)}
            value={formData.city}
          />
          <FieldError error={fieldErrors.city} />
        </label>

        <label className="sm:col-span-2">
          <span className="field-label">Direccion</span>
          <input
            aria-invalid={Boolean(fieldErrors.address)}
            className={`input ${fieldErrors.address ? 'input-error' : ''}`}
            onChange={(event) => updateField('address', event.target.value)}
            value={formData.address}
          />
          <FieldError error={fieldErrors.address} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={formData.is_active}
          onChange={(event) => updateField('is_active', event.target.checked)}
          type="checkbox"
        />
        Proveedor activo
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

function FieldError({ error }) {
  if (!error) {
    return null
  }

  const message = Array.isArray(error) ? error[0] : error
  return <p className="mt-1 text-xs text-red-700">{message}</p>
}

function mapSupplierToForm(supplier) {
  return {
    name: supplier.name ?? '',
    rut: supplier.rut ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
    city: supplier.city ?? '',
    is_active: Boolean(supplier.is_active),
  }
}

export default SupplierForm
