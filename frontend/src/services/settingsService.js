import { http } from '../api/http'


export async function getBusinessSettings() {
  const { data } = await http.get('/settings/business/')
  return data
}

export async function updateBusinessSettings(payload) {
  const { data } = await http.patch('/settings/business/', payload)
  return data
}
