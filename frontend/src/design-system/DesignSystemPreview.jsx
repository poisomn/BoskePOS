import {
  FiAlertTriangle,
  FiBarChart2,
  FiBox,
  FiCheckCircle,
  FiCreditCard,
  FiEdit2,
  FiHome,
  FiInfo,
  FiPackage,
  FiSearch,
  FiSettings,
  FiShoppingCart,
  FiTrash2,
  FiUsers,
  FiXCircle,
} from 'react-icons/fi'

const colorTokens = [
  ['Primary', 'var(--primary)'],
  ['Accent', 'var(--accent)'],
  ['Card', 'var(--card)'],
  ['Foreground', 'var(--foreground)'],
  ['Muted', 'var(--muted)'],
  ['Border', 'var(--border)'],
  ['Success', 'var(--status-success)'],
  ['Danger', 'var(--status-danger)'],
]

const navItems = [
  [FiHome, 'Dashboard', true],
  [FiShoppingCart, 'POS', false],
  [FiPackage, 'Inventario', false],
  [FiUsers, 'Clientes', false],
  [FiBarChart2, 'Ventas', false],
  [FiSettings, 'Ajustes', false],
]

const products = [
  ['FER-001', 'Martillo carpintero', 'Herramientas', '12', '$3.990', 'Activo'],
  ['PIN-014', 'Esmalte al agua blanco', 'Pinturas', '4', '$6.990', 'Bajo stock'],
  ['ELE-082', 'Cable EVA 2.5 mm', 'Electricidad', '0', '$1.290', 'Sin stock'],
]

function DesignSystemPreview() {
  return (
    <main className="app-shell">
      <div className="flex min-h-svh">
        <aside className="sidebar hidden lg:flex">
          <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
            <img
              src="/brand/LogoBoskePOS.webp"
              alt="BoskePOS"
              className="h-14 w-auto object-contain"
            />
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {navItems.map(([Icon, label, active]) => (
              <a className={`nav-item ${active ? 'nav-item-active' : ''}`} href="/" key={label}>
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-700)' }}>
                  Design System
                </p>
                <h1 className="text-xl font-semibold">BoskePOS UI Kit</h1>
              </div>
              <div className="hidden w-full max-w-sm items-center gap-2 rounded-md border bg-white px-3 md:flex" style={{ borderColor: 'var(--color-border)' }}>
                <FiSearch style={{ color: 'var(--color-steel-500)' }} />
                <input className="h-10 flex-1 outline-none" placeholder="Buscar producto, cliente o venta" />
              </div>
            </div>
          </header>

          <div className="ds-container space-y-6">
            <IntroSection />
            <FoundationSection />
            <ControlsSection />
            <DataSection />
            <LayoutSection />
          </div>
        </div>
      </div>
    </main>
  )
}

function IntroSection() {
  return (
    <section className="surface p-5">
      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
            Tema claro estandar
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Interfaz rapida para ferreteria y POS</h2>
          <p className="mt-3 max-w-3xl text-sm" style={{ color: 'var(--color-text-muted)' }}>
            La identidad usa naranjo para acciones, gris acero para estructura y blanco para
            superficies limpias. El resultado prioriza lectura rapida, baja friccion y controles
            predecibles para cajeros y vendedores.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Ventas hoy" value="$428.900" />
          <MetricCard label="Tickets" value="38" />
          <MetricCard label="Stock bajo" value="12" tone="warning" />
        </div>
      </div>
    </section>
  )
}

function FoundationSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="section-title">Paleta</h2>
        <p className="section-note">Tokens derivados del logo y extendidos para estados.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colorTokens.map(([name, color]) => (
            <div key={name}>
              <div className="h-14 rounded-md border" style={{ background: color, borderColor: 'var(--color-border)' }} />
              <p className="mt-2 text-xs font-medium">{name}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{color}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Tipografia y espaciado</h2>
        <p className="section-note">Sistema compacto para pantallas operativas.</p>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-2xl font-semibold">Titulo de modulo</p>
            <p className="text-base font-medium">Subtitulo de seccion</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Texto auxiliar y descripcion breve.</p>
          </div>
          <div className="flex items-end gap-2">
            {[4, 8, 12, 16, 24, 32].map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                <div className="w-8 rounded-sm" style={{ height: size, background: 'var(--color-brand-300)' }} />
                <span className="text-xs">{size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ControlsSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="section-title">Botones e iconografia</h2>
        <p className="section-note">Acciones claras con iconos reconocibles.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn btn-primary" type="button"><FiCreditCard /> Cobrar</button>
          <button className="btn btn-secondary" type="button"><FiEdit2 /> Editar</button>
          <button className="btn btn-danger" type="button"><FiTrash2 /> Eliminar</button>
          <button className="icon-btn" type="button" aria-label="Buscar"><FiSearch /></button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Formularios</h2>
        <p className="section-note">Campos altos, legibles y con foco visible.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">Nombre</span>
            <input className="input" defaultValue="Martillo carpintero" />
          </label>
          <label>
            <span className="field-label">Categoria</span>
            <select className="select" defaultValue="herramientas">
              <option value="herramientas">Herramientas</option>
              <option value="pinturas">Pinturas</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Descripcion</span>
            <textarea className="textarea" defaultValue="Producto de alta rotacion para meson." />
          </label>
        </div>
      </div>
    </section>
  )
}

function DataSection() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div>
        <h2 className="section-title">Tablas</h2>
        <p className="section-note">Filas escaneables, acciones pequenas y estados visibles.</p>
        <div className="table-wrap mt-4">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map(([sku, name, category, stock, price, state]) => (
                <tr key={sku}>
                  <td className="font-medium">{sku}</td>
                  <td>{name}</td>
                  <td>{category}</td>
                  <td>{stock}</td>
                  <td>{price}</td>
                  <td><StatusBadge state={state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="section-title">Estados y alertas</h2>
        <div className="alert alert-success"><FiCheckCircle /> Venta registrada correctamente.</div>
        <div className="alert alert-warning"><FiAlertTriangle /> Producto con stock bajo.</div>
        <div className="alert alert-error"><FiXCircle /> No hay stock suficiente.</div>
        <div className="alert alert-info"><FiInfo /> Usa el lector para buscar por codigo.</div>
      </div>
    </section>
  )
}

function LayoutSection() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="card">
        <h2 className="section-title">Cards y dashboard</h2>
        <p className="section-note">Metricas simples para decidir rapido.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricCard label="Inventario" value="1.248" icon={<FiBox />} />
          <MetricCard label="Clientes" value="312" icon={<FiUsers />} />
          <MetricCard label="Ventas" value="38" icon={<FiBarChart2 />} />
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Modal</h2>
        <p className="section-note">Panel centrado con jerarquia clara para confirmaciones.</p>
        <div className="mt-4 rounded-lg p-4" style={{ background: 'var(--color-steel-100)' }}>
          <div className="modal-panel mx-auto">
            <h3 className="text-lg font-semibold">Confirmar eliminacion</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Esta accion requiere confirmacion antes de continuar.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-secondary" type="button">Cancelar</button>
              <button className="btn btn-danger" type="button">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricCard({ label, value, tone = 'neutral', icon = null }) {
  return (
    <article className="card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        {icon ? <span style={{ color: 'var(--color-brand-600)' }}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <span className={`badge mt-3 ${tone === 'warning' ? 'badge-warning' : 'badge-neutral'}`}>
        Operativo
      </span>
    </article>
  )
}

function StatusBadge({ state }) {
  if (state === 'Activo') return <span className="badge badge-success">Activo</span>
  if (state === 'Bajo stock') return <span className="badge badge-warning">Bajo stock</span>
  return <span className="badge badge-error">Sin stock</span>
}

export default DesignSystemPreview
