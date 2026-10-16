import axios from 'axios'

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../utils/tokenStorage'
import { mascotController } from '../lib/mascotController'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshRequest = null

http.interceptors.request.use((config) => {
  config._mascotRequest = mascotController.beginRequest()
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

http.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase()
    const url = response.config.url || ''
    const saved = ['post', 'patch', 'put', 'delete'].includes(method)
      && !url.includes('/accounts/') && !url.includes('/cart/quote/')
    mascotController.finishRequest(response.config._mascotRequest, saved ? 'exito' : null)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (status !== 401 || originalRequest?._retry || originalRequest?.skipAuthRefresh) {
      mascotController.finishRequest(originalRequest?._mascotRequest, axios.isCancel(error) ? null : 'error')
      return Promise.reject(error)
    }

    mascotController.finishRequest(originalRequest?._mascotRequest)

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
      setTokens({ access: data.access, refresh: data.refresh })
      originalRequest.headers.Authorization = `Bearer ${data.access}`
      return http(originalRequest)
    } catch (refreshError) {
      mascotController.react('error')
      clearTokens()
      window.dispatchEvent(new Event('boskepos:auth-expired'))
      return Promise.reject(refreshError)
    } finally {
      refreshRequest = null
    }
  },
)
