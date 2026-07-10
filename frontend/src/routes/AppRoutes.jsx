import { Navigate, Route, Routes } from 'react-router-dom'

import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import CategoriesPage from '../pages/Inventory/CategoriesPage'
import ProductsPage from '../pages/Inventory/ProductsPage'
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
          <Route index element={<DashboardPage />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/categories" element={<CategoriesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default AppRoutes
