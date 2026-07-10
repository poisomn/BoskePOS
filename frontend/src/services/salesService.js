import { http } from '../api/http'

function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results ?? [])
}

export async function createSale(payload) {
  const { data } = await http.post('/sales/sales/', payload)
  return data
}

export async function listSales() {
  const { data } = await http.get('/sales/sales/')
  return normalizeListResponse(data)
}

export async function getSale(id) {
  const { data } = await http.get(`/sales/sales/${id}/`)
  return data
}
