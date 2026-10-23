import { FiSearch } from 'react-icons/fi'

function InventoryHeader({ actionLabel, canCreate = true, onAction, onSearchChange, search, subtitle, title }) {
  return (
    <section className="ops-inventory-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
            Inventario
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative w-full sm:min-w-64">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
            <input
              className="input pl-10"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nombre"
              value={search}
            />
          </label>
          {canCreate ? (
            <button className="btn btn-primary" onClick={onAction} type="button">
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default InventoryHeader
