import { http } from '../api/http'

function normalizeListResponse(data) {
  return Array.isArray(data) ? data : (data.results ?? [])
}

export async function searchPosProducts(search = '', { signal } = {}) {
  const { data } = await http.get('/sales/pos/products/', {
    params: search ? { search } : undefined,
    signal,
  })
  return normalizeListResponse(data)
}

export async function quotePosCart(items, { signal } = {}) {
  const { data } = await http.post('/sales/pos/cart/quote/', { items }, { signal })
  return data
}
