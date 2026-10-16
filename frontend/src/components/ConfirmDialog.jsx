import FormModal from './FormModal'

function ConfirmDialog({
  confirmLabel = 'Eliminar',
  description,
  isOpen,
  isSubmitting,
  loadingLabel = 'Eliminando...',
  onCancel,
  onConfirm,
  title,
  tone = 'danger',
}) {
  if (!isOpen) {
    return null
  }

  return (
    <FormModal isOpen={isOpen} title={title} onClose={() => { if (!isSubmitting) onCancel() }}>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className={`btn ${tone === 'primary' ? 'btn-primary' : 'btn-danger'}`}
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? loadingLabel : confirmLabel}
          </button>
        </div>
    </FormModal>
  )
}

export default ConfirmDialog
