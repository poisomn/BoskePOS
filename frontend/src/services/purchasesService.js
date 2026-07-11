import { http } from '../api/http'

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

export async function listPurchasesPage({
  dateFrom = '',
  dateTo = '',
  page = 1,
  pageSize = 8,
  search = '',
  status = '',
  supplier = '',
} = {}) {
  const params = {
    page,
    page_size: pageSize,
  }

  if (search) params.search = search
  if (status) params.status = status
  if (supplier) params.supplier = supplier
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo

  const { data } = await http.get('/purchases/purchases/', { params })
  return normalizePaginatedResponse(data)
}

export async function getPurchase(id) {
  const { data } = await http.get(`/purchases/purchases/${id}/`)
  return data
}

export async function createPurchase(payload) {
  const { data } = await http.post('/purchases/purchases/', payload)
  return data
}

export async function updatePurchase(id, payload) {
  const { data } = await http.patch(`/purchases/purchases/${id}/`, payload)
  return data
}

export async function confirmPurchase(id) {
  const { data } = await http.post(`/purchases/purchases/${id}/confirm/`)
  return data
}

export async function cancelPurchase(id) {
  const { data } = await http.post(`/purchases/purchases/${id}/cancel/`)
  return data
}
