export function getApiErrorMessage(error, fallback = 'No se pudo completar la operacion.') {
  const data = error.response?.data

  if (!data) {
    return fallback
  }

  if (typeof data === 'string') {
    return data
  }

  if (data.detail) {
    return data.detail
  }

  const firstField = Object.keys(data)[0]
  const firstError = data[firstField]

  if (Array.isArray(firstError)) {
    return `${firstField}: ${firstError[0]}`
  }

  if (typeof firstError === 'string') {
    return `${firstField}: ${firstError}`
  }

  return fallback
}
