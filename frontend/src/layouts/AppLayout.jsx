import { Outlet } from 'react-router-dom'

import Navbar from './Navbar'
import Sidebar from './Sidebar'

function AppLayout() {
  return (
    <main className="app-shell flex min-h-svh">
      <Sidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center p-6">
          <Outlet />
        </div>
      </section>
    </main>
  )
}

export default AppLayout
