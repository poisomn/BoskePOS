import { FiX } from 'react-icons/fi'

function FormModal({ children, isOpen, title, onClose }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="modal-panel">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} type="button" aria-label="Cerrar">
            <FiX aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export default FormModal
