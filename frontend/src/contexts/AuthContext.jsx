import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  getAuthenticatedUserRequest,
  loginRequest,
  logoutRequest,
} from '../services/authService'
import { clearTokens, getRefreshToken, setTokens } from '../utils/tokenStorage'
import { hasAnyPermission, hasPermission, hasRole } from '../utils/permissions'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clearSession = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function bootstrapSession() {
      if (!getRefreshToken()) {
        if (isMounted) {
          setIsBootstrapping(false)
        }
        return
      }

      try {
        const currentUser = await getAuthenticatedUserRequest()
        if (isMounted) {
          setUser(currentUser)
        }
      } catch {
        if (isMounted) {
          clearSession()
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    queueMicrotask(bootstrapSession)

    return () => {
      isMounted = false
    }
  }, [clearSession])

  useEffect(() => {
    window.addEventListener('boskepos:auth-expired', clearSession)
    return () => window.removeEventListener('boskepos:auth-expired', clearSession)
  }, [clearSession])

  const login = useCallback(async ({ email, password }) => {
    setIsSubmitting(true)

    try {
      const authData = await loginRequest({ email, password })
      setTokens({ access: authData.access, refresh: authData.refresh })
      setUser(authData.user)
      return authData.user
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()

    try {
      if (refreshToken) {
        await logoutRequest(refreshToken)
      }
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      isSubmitting,
      login,
      logout,
      hasPermission: (permission) => hasPermission(user, permission),
      hasAnyPermission: (permissions) => hasAnyPermission(user, permissions),
      hasRole: (role) => hasRole(user, role),
    }),
    [isBootstrapping, isSubmitting, login, logout, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
