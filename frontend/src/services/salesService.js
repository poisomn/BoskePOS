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

export async function createSale(payload) {
  const { data } = await http.post('/sales/sales/', payload)
  return data
}

export async function listSales() {
  const { data } = await http.get('/sales/sales/')
  return normalizeListResponse(data)
}

export async function listSalesPage({ page = 1, pageSize = 10, search = '', status = '' } = {}) {
  const params = {
    page,
    page_size: pageSize,
  }

  if (search) params.search = search
  if (status) params.status = status

  const { data } = await http.get('/sales/sales/', { params })
  return normalizePaginatedResponse(data)
}

export async function getSale(id) {
  const { data } = await http.get(`/sales/sales/${id}/`)
  return data
}

export async function cancelSale(id) {
  const { data } = await http.post(`/sales/sales/${id}/cancel/`)
  return data
}
