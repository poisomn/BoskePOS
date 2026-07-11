import { Navigate, Route, Routes } from 'react-router-dom'

import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import CustomersPage from '../pages/Customers/CustomersPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import CategoriesPage from '../pages/Inventory/CategoriesPage'
import ProductsPage from '../pages/Inventory/ProductsPage'
import LoginPage from '../pages/Login/LoginPage'
import POSPage from '../pages/POS/POSPage'
import SaleDetailPage from '../pages/Sales/SaleDetailPage'
import SalesHistoryPage from '../pages/Sales/SalesHistoryPage'
import SuppliersPage from '../pages/Suppliers/SuppliersPage'
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
          <Route path="/pos" element={<POSPage />} />
          <Route path="/sales" element={<SalesHistoryPage />} />
          <Route path="/sales/:saleId" element={<SaleDetailPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/inventory/products" element={<ProductsPage />} />
          <Route path="/inventory/categories" element={<CategoriesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default AppRoutes
