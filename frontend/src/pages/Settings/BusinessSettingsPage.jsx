import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { percentInput } from '../../utils/formatters'
import { FiSave, FiSettings } from 'react-icons/fi'

import { getBusinessSettings, updateBusinessSettings } from '../../services/settingsService'
import { getApiErrorMessage } from '../../utils/apiErrors'

const emptyForm = {
  business_name: '',
  rut: '',
  giro: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  currency: 'CLP',
  default_tax_rate: '19',
  seller_discount_limit: 5,
  ticket_footer: '',
}

function BusinessSettingsPage() {
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getBusinessSettings()
      setForm({ ...emptyForm, ...data, default_tax_rate: percentInput(data.default_tax_rate) })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar la configuracion.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(fetchSettings)
  }, [fetchSettings])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setFieldErrors({})
    setSuccessMessage('')

    try {
      const data = await updateBusinessSettings({
        business_name: form.business_name.trim(),
        rut: form.rut.trim(),
        giro: form.giro.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        currency: form.currency.trim().toUpperCase(),
        default_tax_rate: form.default_tax_rate,
        seller_discount_limit: Number(form.seller_discount_limit),
        ticket_footer: form.ticket_footer.trim(),
      })
      setForm({ ...emptyForm, ...data, default_tax_rate: percentInput(data.default_tax_rate) })
      setSuccessMessage('Configuracion actualizada correctamente.')
    } catch (requestError) {
      if (requestError.response?.status === 400) {
        setFieldErrors(requestError.response.data ?? {})
      } else {
        setError(getApiErrorMessage(requestError, 'No se pudo guardar la configuracion.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="surface p-5">Cargando configuracion...</div>
  }

  return (
    <div className="w-full space-y-6">
      <section className="surface p-5">
        <div className="flex items-start gap-4">
          <div
            className="grid size-11 place-items-center rounded-md"
            style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
          >
            <FiSettings aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
              Configuracion
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Datos del negocio</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Base operacional para comprobantes internos y futura configuracion tributaria.
            </p>
          </div>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <div className="flex flex-wrap gap-2"><Link className="btn btn-secondary" to="/settings/users">Usuarios y PIN</Link><Link className="btn btn-secondary" to="/cash">Cajas</Link></div>
      <form className="surface space-y-5 p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            error={fieldErrors.business_name}
            label="Nombre del negocio"
            onChange={(value) => updateField('business_name', value)}
            required
            value={form.business_name}
          />
          <TextField
            error={fieldErrors.rut}
            label="RUT"
            onChange={(value) => updateField('rut', value)}
            placeholder="76.123.456-7"
            value={form.rut}
          />
          <TextField
            error={fieldErrors.giro}
            label="Giro"
            onChange={(value) => updateField('giro', value)}
            value={form.giro}
          />
          <TextField
            error={fieldErrors.email}
            label="Correo"
            onChange={(value) => updateField('email', value)}
            type="email"
            value={form.email}
          />
          <TextField
            error={fieldErrors.address}
            label="Direccion"
            onChange={(value) => updateField('address', value)}
            value={form.address}
          />
          <TextField
            error={fieldErrors.city}
            label="Ciudad"
            onChange={(value) => updateField('city', value)}
            value={form.city}
          />
          <TextField
            error={fieldErrors.phone}
            label="Telefono"
            onChange={(value) => updateField('phone', value)}
            value={form.phone}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              error={fieldErrors.currency}
              label="Moneda"
              maxLength={3}
              onChange={(value) => updateField('currency', value)}
              value={form.currency}
            />
            <TextField
              error={fieldErrors.default_tax_rate}
              label="IVA por defecto"
              onChange={(value) => updateField('default_tax_rate', value)}
              type="number"
              value={form.default_tax_rate}
            />
          </div>
        </div>

        <TextField error={fieldErrors.seller_discount_limit} label="Límite de descuento de vendedor (%)" type="number" value={form.seller_discount_limit} onChange={value => updateField('seller_discount_limit', value)} />
        <p className="section-note">Los descuentos que superan este límite requieren autorización de administrador. Cada descuento registra un motivo.</p>
        <label>
          <span className="field-label">Pie de comprobante</span>
          <textarea
            className="textarea"
            onChange={(event) => updateField('ticket_footer', event.target.value)}
            value={form.ticket_footer}
          />
          <FieldError error={fieldErrors.ticket_footer} />
        </label>

        <div className="flex justify-end border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            <FiSave aria-hidden="true" />
            {isSubmitting ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </form>
    </div>
  )
}

function TextField({
  error,
  label,
  maxLength,
  onChange,
  placeholder = '',
  required = false,
  type = 'text',
  value,
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        className={`input ${error ? 'input-error' : ''}`}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={type === 'number' ? '0.01' : undefined}
        type={type}
        value={value}
      />
      <FieldError error={error} />
    </label>
  )
}

function FieldError({ error }) {
  if (!error) return null

  const message = Array.isArray(error) ? error[0] : error
  return <p className="mt-1 text-xs text-red-700">{message}</p>
}

export default BusinessSettingsPage
