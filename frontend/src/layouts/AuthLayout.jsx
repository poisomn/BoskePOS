import { Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <main className="app-shell grid min-h-svh lg:grid-cols-[1fr_480px]">
      <section className="hidden border-r bg-white lg:flex lg:flex-col lg:justify-between" style={{ borderColor: 'var(--color-border)' }}>
        <div className="p-10">
          <img
            src="/brand/LogoBoskePOS.webp"
            alt="BoskePOS"
            className="h-28 w-auto object-contain"
          />
          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-700)' }}>
              ERP/POS comercial
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Operacion rapida para ferreterias chilenas.
            </h1>
            <p className="mt-4 text-base" style={{ color: 'var(--color-text-muted)' }}>
              Acceso seguro para cajeros y vendedores. La interfaz esta preparada para
              trabajar con rapidez desde el meson.
            </p>
          </div>
        </div>
        <div className="p-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          BoskePOS v0.1
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout
