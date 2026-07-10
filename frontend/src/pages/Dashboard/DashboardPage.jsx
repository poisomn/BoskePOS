import {
  FiClock,
  FiCreditCard,
  FiPackage,
  FiPlusCircle,
  FiShoppingCart,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from 'react-icons/fi'

import { useAuth } from '../../hooks/useAuth'

const kpis = [
  {
    label: 'Ventas de hoy',
    value: '$0',
    note: 'Pendiente de API de metricas',
    icon: FiTrendingUp,
  },
  {
    label: 'Tickets emitidos',
    value: '0',
    note: 'Pendiente de API de ventas',
    icon: FiCreditCard,
  },
  {
    label: 'Productos activos',
    value: '0',
    note: 'Pendiente de API de inventario',
    icon: FiPackage,
  },
  {
    label: 'Clientes registrados',
    value: '0',
    note: 'Pendiente de API de clientes',
    icon: FiUsers,
  },
]

const quickActions = [
  ['Abrir POS', FiShoppingCart],
  ['Nuevo producto', FiPackage],
  ['Nuevo cliente', FiUser],
  ['Registrar venta', FiPlusCircle],
]

const placeholderSales = [
  ['Sin ventas registradas en esta vista', 'Cuando exista API de metricas se mostraran aqui.'],
  ['Resumen diario pendiente', 'El backend de dashboard se implementara en un sprint futuro.'],
  ['Historial rapido pendiente', 'No se usan datos falsos si existe API real.'],
]

function DashboardPage() {
  const { user } = useAuth()
  const displayName = getDisplayName(user)

  return (
    <div className="w-full space-y-6">
      <section className="surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Bienvenido, {displayName}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Base operativa lista. Las metricas se conectaran cuando exista el endpoint de
              dashboard.
            </p>
          </div>

          <div className="card flex items-center gap-3 p-3">
            <div
              className="grid size-10 place-items-center rounded-md"
              style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
            >
              <FiUser aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">{user?.email}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Usuario autenticado
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Ultimas ventas</h2>
              <p className="section-note">Placeholder hasta contar con API de dashboard.</p>
            </div>
            <span className="badge badge-neutral">
              <FiClock aria-hidden="true" />
              Tiempo real futuro
            </span>
          </div>

          <div className="mt-4 divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {placeholderSales.map(([title, note]) => (
              <article className="flex items-start gap-3 py-4" key={title}>
                <div
                  className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md"
                  style={{ background: 'var(--color-steel-100)', color: 'var(--color-steel-700)' }}
                >
                  <FiCreditCard aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="surface p-5">
          <h2 className="section-title">Accesos rapidos</h2>
          <p className="section-note">Preparados para conectar en los proximos sprints.</p>

          <div className="mt-4 grid gap-3">
            {quickActions.map(([label, Icon]) => (
              <button className="btn btn-secondary justify-start" disabled key={label} type="button">
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function KpiCard({ icon: Icon, label, note, value }) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div
          className="grid size-10 place-items-center rounded-md"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
        >
          <Icon aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {note}
      </p>
    </article>
  )
}

function getDisplayName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
  return fullName || user?.email || 'usuario'
}

export default DashboardPage
