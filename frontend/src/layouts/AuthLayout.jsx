import { Outlet } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

function AuthLayout() {
  return (
    <main className="app-shell grid min-h-svh lg:grid-cols-[1fr_480px]">
      <section className="hidden border-r bg-white lg:flex lg:flex-col lg:justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div className="p-10">
          <BrandLogo className="w-full max-w-sm" />
          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-700)' }}>
              ERP/POS comercial
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Tu ferretería, conectada.
            </h1>
            <p className="mt-4 text-base" style={{ color: 'var(--color-text-muted)' }}>
              Ventas, inventario y clientes en un mismo lugar.
              Todo lo que necesitas para atender mejor desde el mesón.
            </p>
          </div>
        </div>
        <div className="p-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          BoskePOS · Gestión para tu ferretería
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout
