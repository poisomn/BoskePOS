import { http } from '../api/http'
export const listTickets = async (params, signal) => (await http.get('/presales/tickets/', { params, signal })).data
export const getTicket = async id => (await http.get(`/presales/tickets/${id}/`)).data
export const issueTicket = async payload => (await http.post('/presales/tickets/', payload)).data
export const ticketAction = async (id, action, payload = {}) => (await http.post(`/presales/tickets/${id}/${action}/`, payload)).data
export const listStations = async () => (await http.get('/presales/stations/')).data
export const createStation = async payload => (await http.post('/presales/stations/', payload)).data
export const updateStation = async (id, payload) => (await http.patch(`/presales/stations/${id}/`, payload)).data
