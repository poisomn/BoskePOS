import { FiX } from 'react-icons/fi'
import { useEffect, useRef } from 'react'

function FormModal({ children, isOpen, title, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    if (isOpen && element && !element.open) element.showModal()
    return () => { if (element?.open) element.close() }
  }, [isOpen])
  if (!isOpen) {
    return null
  }

  return (
    <dialog ref={dialog} className="app-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}>
      <section className="modal-panel">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} type="button" aria-label="Cerrar">
            <FiX aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </dialog>
  )
}

export default FormModal
