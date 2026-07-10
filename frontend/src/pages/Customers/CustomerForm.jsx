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

function CustomerForm({ customer, isSubmitting, onCancel, onSubmit }) {
  const [formData, setFormData] = useState(() =>
    customer ? mapCustomerToForm(customer) : initialState,
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
          <span className="field-label">Nombre</span>
          <input
            className="input"
            onChange={(event) => updateField('name', event.target.value)}
            required
            value={formData.name}
          />
        </label>

        <label>
          <span className="field-label">RUT</span>
          <input
            className="input"
            onChange={(event) => updateField('rut', event.target.value)}
            placeholder="12.345.678-5"
            value={formData.rut}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Opcional. Se validara contra el backend.
          </p>
        </label>

        <label>
          <span className="field-label">Email</span>
          <input
            className="input"
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
            value={formData.email}
          />
        </label>

        <label>
          <span className="field-label">Telefono</span>
          <input
            className="input"
            onChange={(event) => updateField('phone', event.target.value)}
            value={formData.phone}
          />
        </label>

        <label>
          <span className="field-label">Ciudad / comuna</span>
          <input
            className="input"
            onChange={(event) => updateField('city', event.target.value)}
            value={formData.city}
          />
        </label>

        <label className="sm:col-span-2">
          <span className="field-label">Direccion</span>
          <input
            className="input"
            onChange={(event) => updateField('address', event.target.value)}
            value={formData.address}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={formData.is_active}
          onChange={(event) => updateField('is_active', event.target.checked)}
          type="checkbox"
        />
        Cliente activo
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

function mapCustomerToForm(customer) {
  return {
    name: customer.name ?? '',
    rut: customer.rut ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    is_active: Boolean(customer.is_active),
  }
}

export default CustomerForm
