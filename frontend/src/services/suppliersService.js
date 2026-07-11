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

export async function listSuppliersPage({ isActive = '', page = 1, pageSize = 8, search = '' } = {}) {
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

  const { data } = await http.get('/suppliers/suppliers/', { params })
  return normalizePaginatedResponse(data)
}

export async function listSuppliers(search = '') {
  const { data } = await http.get('/suppliers/suppliers/', {
    params: {
      is_active: 'true',
      page_size: 100,
      ...(search ? { search } : {}),
    },
  })
  return normalizePaginatedResponse(data).results
}

export async function createSupplier(payload) {
  const { data } = await http.post('/suppliers/suppliers/', payload)
  return data
}

export async function updateSupplier(id, payload) {
  const { data } = await http.patch(`/suppliers/suppliers/${id}/`, payload)
  return data
}

export async function activateSupplier(id) {
  const { data } = await http.post(`/suppliers/suppliers/${id}/activate/`)
  return data
}

export async function deactivateSupplier(id) {
  const { data } = await http.post(`/suppliers/suppliers/${id}/deactivate/`)
  return data
}
