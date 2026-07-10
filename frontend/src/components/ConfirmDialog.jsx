function ConfirmDialog({
  confirmLabel = 'Eliminar',
  description,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
  title,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="modal-panel">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn btn-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="btn btn-danger" disabled={isSubmitting} onClick={onConfirm} type="button">
            {isSubmitting ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmDialog
