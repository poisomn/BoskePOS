import { http } from '../api/http'

function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results ?? [])
}

function normalizePaginatedResponse(data) {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    }
  }

  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: data.results ?? [],
  }
}

export async function listCustomers(search = '') {
  const { data } = await http.get('/customers/customers/', {
    params: search ? { search } : undefined,
  })
  return normalizeListResponse(data)
}

export async function listCustomersPage({ isActive = '', page = 1, pageSize = 8, search = '' } = {}) {
  const params = {
    page,
    page_size: pageSize,
  }

  if (search) {
    params.search = search
  }

  if (isActive !== '') {
    params.is_active = isActive
  }

  const { data } = await http.get('/customers/customers/', { params })
  return normalizePaginatedResponse(data)
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

export async function activateCustomer(id) {
  const { data } = await http.post(`/customers/customers/${id}/activate/`)
  return data
}

export async function deactivateCustomer(id) {
  const { data } = await http.post(`/customers/customers/${id}/deactivate/`)
  return data
}
