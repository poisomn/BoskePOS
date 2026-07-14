import { http } from '../api/http'

export async function getDashboardSummary({ dateFrom = '', dateTo = '', limit = 5 } = {}) {
  const params = { limit }

  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo

  const { data } = await http.get('/dashboard/summary/', { params })
  return data
}
