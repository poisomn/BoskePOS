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

export async function listCategories(search = '') {
  const { data } = await http.get('/inventory/categories/', {
    params: search ? { search } : undefined,
  })
  return normalizeListResponse(data)
}

export async function listCategoriesPage({ isActive = '', page = 1, pageSize = 8, search = '' } = {}) {
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

  const { data } = await http.get('/inventory/categories/', { params })
  return normalizePaginatedResponse(data)
}

export async function getCategory(id) {
  const { data } = await http.get(`/inventory/categories/${id}/`)
  return data
}

export async function createCategory(payload) {
  const { data } = await http.post('/inventory/categories/', payload)
  return data
}

export async function updateCategory(id, payload) {
  const { data } = await http.patch(`/inventory/categories/${id}/`, payload)
  return data
}

export async function deleteCategory(id) {
  await http.delete(`/inventory/categories/${id}/`)
}

export async function activateCategory(id) {
  const { data } = await http.post(`/inventory/categories/${id}/activate/`)
  return data
}

export async function deactivateCategory(id) {
  const { data } = await http.post(`/inventory/categories/${id}/deactivate/`)
  return data
}

export async function listProducts(search = '') {
  const { data } = await http.get('/inventory/products/', {
    params: search ? { search } : undefined,
  })
  return normalizeListResponse(data)
}

export async function createProduct(payload) {
  const { data } = await http.post('/inventory/products/', payload)
  return data
}

export async function updateProduct(id, payload) {
  const { data } = await http.patch(`/inventory/products/${id}/`, payload)
  return data
}

export async function deleteProduct(id) {
  await http.delete(`/inventory/products/${id}/`)
}
