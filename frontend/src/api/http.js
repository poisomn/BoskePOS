import axios from 'axios'

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../utils/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshRequest = null

http.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (status !== 401 || originalRequest?._retry || originalRequest?.skipAuthRefresh) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      window.dispatchEvent(new Event('boskepos:auth-expired'))
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshRequest ??= axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
        refresh: refreshToken,
      })
      const { data } = await refreshRequest
      setTokens({ access: data.access })
      originalRequest.headers.Authorization = `Bearer ${data.access}`
      return http(originalRequest)
    } catch (refreshError) {
      clearTokens()
      window.dispatchEvent(new Event('boskepos:auth-expired'))
      return Promise.reject(refreshError)
    } finally {
      refreshRequest = null
    }
  },
)
