import { TZDate } from 'react-day-picker'

export const BUSINESS_TIME_ZONE = 'America/Santiago'
export function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return undefined
  const [year, month, day] = value.split('-').map(Number)
  const date = new TZDate(year, month - 1, day, 12, 0, 0, BUSINESS_TIME_ZONE)
  return dateValue(date) === value ? date : undefined
}
export function dateValue(date) {
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
}
export function businessToday() { return dateValue(new TZDate(Date.now(), BUSINESS_TIME_ZONE)) }
export function shiftDate(value, days) {
  const date = calendarDate(value)
  date.setDate(date.getDate() + days)
  return dateValue(date)
}
export function rangeDays(from, to) { return Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 }
export function rangeError(from, to, maxDays) {
  if (!calendarDate(from) || !calendarDate(to)) return 'Selecciona la fecha inicial y final.'
  if (from > to) return 'La fecha final debe ser igual o posterior a la inicial.'
  if (maxDays && rangeDays(from, to) > maxDays) return `Selecciona como máximo ${maxDays} días.`
  return ''
}
export function displayDate(value) { return value ? value.split('-').reverse().join('/') : 'Seleccionar' }
export function datePresets() {
  const today = businessToday()
  return [['Hoy', today, today], ['Ayer', shiftDate(today, -1), shiftDate(today, -1)], ['Últimos 7 días', shiftDate(today, -6), today], ['Últimos 30 días', shiftDate(today, -29), today], ['Este mes', `${today.slice(0, 7)}-01`, today]]
}
