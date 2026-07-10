import { http } from '../api/http'

export async function loginRequest(credentials) {
  const { data } = await http.post('/accounts/login/', credentials, {
    skipAuthRefresh: true,
  })
  return data
}

export async function getAuthenticatedUserRequest() {
  const { data } = await http.get('/accounts/me/')
  return data
}

export async function logoutRequest(refreshToken) {
  await http.post(
    '/accounts/logout/',
    { refresh: refreshToken },
    { skipAuthRefresh: true },
  )
}
