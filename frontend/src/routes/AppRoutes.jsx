import ReplenishmentPage from '../pages/Inventory/ReplenishmentPage'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Mascot from '../components/Mascot'
import { localRoutes } from '../localExtensions'
import AuthLayout from '../layouts/AuthLayout'
import AppLayout from '../layouts/AppLayout'
import AccessDeniedPage from '../pages/Auth/AccessDeniedPage'
import CustomersPage from '../pages/Customers/CustomersPage'
import CategoriesPage from '../pages/Inventory/CategoriesPage'
import ProductsPage from '../pages/Inventory/ProductsPage'
import LoginPage from '../pages/Login/LoginPage'
import POSPage from '../pages/POS/POSOperationsPage'
const PresalesPage = lazy(() => import('../pages/Presales/PresalesPage'))
import AuditPage from '../pages/Reports/AuditPage'
import CashPage from '../pages/Cash/CashPage'
import UsersPage from '../pages/Settings/UsersPage'
import OperationsPage from '../pages/Reports/OperationsPage'
import PurchaseDetailPage from '../pages/Purchases/PurchaseDetailPage'
import PurchasesPage from '../pages/Purchases/PurchasesPage'
import SaleDetailPage from '../pages/Sales/SaleDetailPage'
import SalesHistoryPage from '../pages/Sales/SalesHistoryPage'
import SuppliersPage from '../pages/Suppliers/SuppliersPage'
import BusinessSettingsPage from '../pages/Settings/BusinessSettingsPage'
import ProtectedRoute from './ProtectedRoute'
import RequirePermission from './RequirePermission'

const BklitSmokeTestPage = import.meta.env.DEV
  ? lazy(() => import('../pages/Dev/BklitSmokeTestPage'))
  : null
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage'))
const WireframeV2 = lazy(() => import('../pages/WireframeV2/WireframeV2'))
const routeFallback = <div className="surface p-5 state-message" role="status"><Mascot state="cargando" size={64} />Cargando módulo…</div>

function AppRoutes() {
  return (
    <Routes>
      <Route path="/wireframe-v2" element={<Suspense fallback={routeFallback}><WireframeV2 /></Suspense>} />
      {localRoutes.filter((route) => !route.requiresAuth).map(({ path, Component }) => (
        <Route key={path} path={path} element={<Suspense fallback={routeFallback}><Component /></Suspense>} />
      ))}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      {BklitSmokeTestPage ? (
        <Route
          path="/dev/bklit-smoke"
          element={(
            <Suspense fallback={routeFallback}>
              <BklitSmokeTestPage />
            </Suspense>
          )}
        />
      ) : null}

      <Route element={<ProtectedRoute />}>
        {localRoutes.filter((route) => route.requiresAuth).map(({ path, Component }) => (
          <Route key={path} path={path} element={<Suspense fallback={routeFallback}><Component /></Suspense>} />
        ))}
        <Route element={<AppLayout />}>
          <Route
            index
            element={(
              <Suspense fallback={routeFallback}>
                <DashboardPage />
              </Suspense>
            )}
          />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          <Route element={<RequirePermission permissions={['sales:complete']} />}>
            <Route path="/checkout" element={<Suspense fallback={routeFallback}><PresalesPage checkout key="checkout" /></Suspense>} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/cash" element={<CashPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['presales:write']} />}>
            <Route path="/presales" element={<Suspense fallback={routeFallback}><PresalesPage key="prepare" /></Suspense>} />
          </Route>
          <Route element={<RequirePermission permissions={['reports:sensitive']} />}>
            <Route path="/audit" element={<AuditPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['sales:read']} />}>
            <Route path="/sales" element={<SalesHistoryPage />} />
            <Route path="/reports" element={<OperationsPage />} />
            <Route path="/sales/:saleId" element={<SaleDetailPage />} />
          </Route>
          <Route element={<RequirePermission permissions={['purchases:write']} />}><Route path="/inventory/replenishment" element={<ReplenishmentPage />} /></Route>
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
          <Route element={<RequirePermission permissions={['settings:read']} />}>
            <Route path="/settings/business" element={<BusinessSettingsPage />} />
            <Route path="/settings/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default AppRoutes
