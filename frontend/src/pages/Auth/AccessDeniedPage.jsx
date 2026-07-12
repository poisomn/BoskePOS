import { Link } from 'react-router-dom'
import { FiLock } from 'react-icons/fi'

function AccessDeniedPage() {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <section className="surface max-w-lg p-6 text-center">
        <div
          className="mx-auto grid size-14 place-items-center rounded-full"
          style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
        >
          <FiLock size={24} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Acceso denegado</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Tu usuario no tiene permisos para acceder a esta seccion o ejecutar esta operacion.
        </p>
        <Link className="btn btn-primary mt-5" to="/">
          Volver al inicio
        </Link>
      </section>
    </div>
  )
}

export default AccessDeniedPage
