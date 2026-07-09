import { Route, Routes } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="min-h-svh bg-slate-50 px-6 py-8 text-slate-950">
            <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
              <header className="border-b border-slate-200 pb-6">
                <p className="text-sm font-medium text-emerald-700">BoskePOS</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal">
                  Configuracion inicial lista
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-600">
                  Base React, Vite y Tailwind preparada para conectar con la API
                  Django sin agregar funcionalidad de negocio todavia.
                </p>
              </header>

              <div className="grid gap-4 md:grid-cols-3">
                {['Backend API', 'Frontend App', 'MVP Pendiente'].map((item) => (
                  <article
                    className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
                    key={item}
                  >
                    <h2 className="text-base font-semibold">{item}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Estructura base preparada para el siguiente paso.
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </main>
        }
      />
    </Routes>
  )
}

export default App
