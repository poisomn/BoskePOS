export function downloadCsv(name, headers, rows) {
  // Neutralizar fórmulas al abrir datos de terceros en Excel.
  const safe = value => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"` }
  const blob = new Blob(['\uFEFF' + [headers, ...rows].map(row => row.map(safe).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

