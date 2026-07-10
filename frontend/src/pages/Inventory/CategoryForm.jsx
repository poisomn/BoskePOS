import { useState } from 'react'

const initialState = {
  name: '',
  description: '',
  is_active: true,
}

function CategoryForm({ category, fieldErrors = {}, isSubmitting, onCancel, onSubmit }) {
  const [formData, setFormData] = useState(() => mapCategoryToForm(category))
  const [localErrors, setLocalErrors] = useState({})

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
    setLocalErrors((current) => ({ ...current, [field]: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = formData.name.trim()

    if (!name) {
      setLocalErrors({ name: 'El nombre de la categoria es obligatorio.' })
      return
    }

    onSubmit({
      name,
      description: formData.description.trim(),
      is_active: formData.is_active,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label>
        <span className="field-label">Nombre</span>
        <input
          aria-describedby={getFieldError('name', localErrors, fieldErrors) ? 'category-name-error' : undefined}
          aria-invalid={Boolean(getFieldError('name', localErrors, fieldErrors))}
          className="input"
          id="category-name"
          onChange={(event) => updateField('name', event.target.value)}
          required
          value={formData.name}
        />
        <FieldError id="category-name-error" message={getFieldError('name', localErrors, fieldErrors)} />
      </label>

      <label>
        <span className="field-label">Descripcion</span>
        <textarea
          aria-describedby={getFieldError('description', localErrors, fieldErrors) ? 'category-description-error' : undefined}
          aria-invalid={Boolean(getFieldError('description', localErrors, fieldErrors))}
          className="textarea"
          id="category-description"
          onChange={(event) => updateField('description', event.target.value)}
          value={formData.description}
        />
        <FieldError
          id="category-description-error"
          message={getFieldError('description', localErrors, fieldErrors)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={formData.is_active}
          onChange={(event) => updateField('is_active', event.target.checked)}
          type="checkbox"
        />
        Categoria activa
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

function mapCategoryToForm(category) {
  if (!category) {
    return initialState
  }

  return {
    description: category.description ?? '',
    is_active: Boolean(category.is_active),
    name: category.name ?? '',
  }
}

export default CategoryForm
