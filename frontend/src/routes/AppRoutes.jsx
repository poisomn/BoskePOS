import { Navigate, Route, Routes } from 'react-router-dom'

import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import AccessDeniedPage from '../pages/Auth/AccessDeniedPage'
import CustomersPage from '../pages/Customers/CustomersPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import CategoriesPage from '../pages/Inventory/CategoriesPage'
import ProductsPage from '../pages/Inventory/ProductsPage'
import LoginPage from '../pages/Login/LoginPage'
import POSPage from '../pages/POS/POSPage'
import PurchaseDetailPage from '../pages/Purchases/PurchaseDetailPage'
import PurchasesPage from '../pages/Purchases/PurchasesPage'
import SaleDetailPage from '../pages/Sales/SaleDetailPage'
import SalesHistoryPage from '../pages/Sales/SalesHistoryPage'
import SuppliersPage from '../pages/Suppliers/SuppliersPage'
import ProtectedRoute from './ProtectedRoute'
import RequirePermission from './RequirePermission'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          <Route element={<RequirePermission permissions={['sales:complete']} />}>
            <Route path="/pos" element={<POSPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['sales:read']} />}>
            <Route path="/sales" element={<SalesHistoryPage />} />
            <Route path="/sales/:saleId" element={<SaleDetailPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['purchases:read']} />}>
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/purchases/:purchaseId" element={<PurchaseDetailPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['customers:read']} />}>
            <Route path="/customers" element={<CustomersPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['suppliers:read']} />}>
            <Route path="/suppliers" element={<SuppliersPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['inventory:read']} />}>
            <Route path="/inventory/products" element={<ProductsPage />} />
            <Route path="/inventory/categories" element={<CategoriesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default AppRoutes
