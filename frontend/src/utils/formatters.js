export function formatMoney(value) {
  return new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Object.is(Number(value), -0) ? 0 : Number(value))
}

export function formatPercent(value) {
  return `${formatNumber(value)}%`
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Number(value))
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
