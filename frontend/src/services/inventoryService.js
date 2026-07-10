import { http } from '../api/http'

function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results ?? [])
}

export async function listCategories(search = '') {
  const { data } = await http.get('/inventory/categories/', {
    params: search ? { search } : undefined,
  })
  return normalizeListResponse(data)
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
