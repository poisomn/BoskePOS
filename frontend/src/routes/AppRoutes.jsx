import { Navigate, Route, Routes } from 'react-router-dom'

import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/Login/LoginPage'
import ProtectedRoute from './ProtectedRoute'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <div className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Base autenticada lista. Los modulos se implementaran en proximos sprints.
              </div>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default AppRoutes
