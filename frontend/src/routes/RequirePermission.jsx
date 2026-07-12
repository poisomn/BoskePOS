import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import LoadingScreen from '../layouts/LoadingScreen'
import { hasAnyPermission } from '../utils/permissions'

function RequirePermission({ permissions = [] }) {
  const { isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return <LoadingScreen />
  }

  if (!hasAnyPermission(user, permissions)) {
    return <Navigate replace to="/access-denied" />
  }

  return <Outlet />
}

export default RequirePermission
