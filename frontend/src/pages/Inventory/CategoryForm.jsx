import { useState } from 'react'

const initialState = {
  name: '',
  description: '',
  is_active: true,
}

function CategoryForm({ category, isSubmitting, onCancel, onSubmit }) {
  const [formData, setFormData] = useState(() => category ?? initialState)

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim(),
      is_active: formData.is_active,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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

export default CategoryForm
