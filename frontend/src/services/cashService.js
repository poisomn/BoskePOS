import { http } from '../api/http'

export async function cashGet(path, params) {
  const { data } = await http.get(`/cash/${path}/`, { params })
  return data
}
export async function cashPost(path, payload) {
  const { data } = await http.post(`/cash/${path}/`, payload)
  return data
}
export async function cashPatch(path, payload) {
  const { data } = await http.patch(`/cash/${path}/`, payload)
  return data
}
