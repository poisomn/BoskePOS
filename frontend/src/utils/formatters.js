export function formatMoney(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits,
    style: 'currency',
  }).format(Object.is(Number(value), -0) ? 0 : Number(value))
}

export function formatPercent(value) {
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(Number(value))}%`
}

export function percentInput(value) {
  return String(Number(value ?? 0))
}

export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
