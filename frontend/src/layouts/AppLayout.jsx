import { Outlet } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import '../design-system/operations.css'

function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const drawer = useRef(null)
  useEffect(() => {
    if (isMenuOpen) drawer.current.showModal()
    else drawer.current.close()
  }, [isMenuOpen])
  useEffect(() => {
    const desktop = matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setIsMenuOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])
  return (
    <div className="app-shell app-v2 flex min-h-svh">
      <a className="skip-link" href="#main-content">Ir al contenido</a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar isMenuOpen={isMenuOpen} onToggleMenu={() => setIsMenuOpen((open) => !open)} />
        <main id="main-content" className="app-content flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}><Outlet /></main>
      </div>
      <dialog ref={drawer} id="mobile-navigation" className="navigation-drawer" aria-label="Navegación principal" onCancel={() => setIsMenuOpen(false)} onClose={() => setIsMenuOpen(false)}>
        <button className="icon-btn drawer-close" type="button" aria-label="Cerrar navegación" onClick={() => setIsMenuOpen(false)}><FiX aria-hidden="true" /></button>
        <Sidebar mobile onNavigate={() => setIsMenuOpen(false)} />
      </dialog>
    </div>
  )
}
export default AppLayout
