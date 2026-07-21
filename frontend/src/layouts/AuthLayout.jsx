import { Outlet } from 'react-router-dom'
import { Hexagon } from 'lucide-react'

function AuthLayout() {
  return (
    <main className="flex min-h-screen bg-white">
      {/* LADO IZQUIERDO: Visual Oscuro */}
      <section className="relative hidden w-0 flex-1 lg:block bg-[#1f2937] overflow-hidden">
        <div className="absolute -left-32 top-20 h-[30rem] w-[30rem] rounded-full bg-[#374151] opacity-50"></div>
        <div className="absolute -bottom-40 -right-32 h-[40rem] w-[40rem] rounded-full bg-[#F59E0B] opacity-10"></div>
        
        <div className="absolute inset-0 flex flex-col justify-between p-12 z-10">
          <div>
            <div className="bg-white px-5 py-3 rounded-2xl inline-block shadow-md">
              <img
                src="/brand/LogoBoskePOS.webp"
                alt="BoskePOS"
                className="h-25 w-auto object-contain"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-start max-w-lg">
            <Hexagon className="h-16 w-16 text-[#F59E0B] mb-8" strokeWidth={1.5} />
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F59E0B] mb-3">
              ERP/POS Comercial
            </p>
            <h1 className="text-6xl font-bold text-white tracking-tight leading-tight">
              BoskePOS
            </h1>

            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
              Soluciones informáticas para tu negocio.
            </h1>
            <p className="mt-4 text-lg text-gray-400">
              Acceso seguro para usuarios del sistema. Interfaz rápida, versátil y sólida para todas sus necesidades.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            BoskePOS v0.1
          </div>
        </div>
      </section>

      {/* LADO DERECHO: Contenedor del Formulario */}
      <section className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-[480px] xl:w-[560px]">
        <Outlet />
      </section>
    </main>
  )
}

export default AuthLayout