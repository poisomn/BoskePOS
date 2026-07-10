import { http } from '../api/http'

function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results ?? [])
}

export async function listCustomers(search = '') {
  const { data } = await http.get('/customers/customers/', {
    params: search ? { search } : undefined,
  })
  return normalizeListResponse(data)
}

export async function createCustomer(payload) {
  const { data } = await http.post('/customers/customers/', payload)
  return data
}

export async function updateCustomer(id, payload) {
  const { data } = await http.patch(`/customers/customers/${id}/`, payload)
  return data
}

export async function deleteCustomer(id) {
  await http.delete(`/customers/customers/${id}/`)
}
