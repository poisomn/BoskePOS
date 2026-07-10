import { Outlet } from 'react-router-dom'

import Navbar from './Navbar'
import Sidebar from './Sidebar'

function AppLayout() {
  return (
    <main className="app-shell flex min-h-svh">
      <Sidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </section>
    </main>
  )
}

export default AppLayout
