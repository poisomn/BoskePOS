import Mascot from './Mascot'
import { useState } from 'react'
import { formatNumber } from '../utils/formatters'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

function DataTable({
  columns,
  data,
  emptyMessage = 'No hay registros para mostrar.',
  page,
  pageSize,
  total,
  onPageChange,
  onRowSelect,
  defaultHidden = [],
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const storageKey = `boskepos:columns:${columns.map(column => column.key).join('-')}`
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(defaultHidden)) } catch { return [] } })
  const visible = columns.filter((column, index) => index === 0 || column.key === 'actions' || !hidden.includes(column.key))
  function toggle(key) { const next = hidden.includes(key) ? hidden.filter(value => value !== key) : [...hidden, key]; setHidden(next); localStorage.setItem(storageKey, JSON.stringify(next)) }
  const numeric = new Set(['stock', 'min_stock', 'quantity', 'stock_before', 'stock_after', 'count'])

  return (
    <div className="table-wrap">
      <details className="ops-column-picker"><summary>Columnas visibles</summary><div>{columns.slice(1).filter(column => column.key !== 'actions').map(column => <label key={column.key}><input type="checkbox" checked={!hidden.includes(column.key)} onChange={() => toggle(column.key)} />{column.header}</label>)}</div></details>
      <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {visible.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
            {onRowSelect && <th>Ficha</th>}
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((row) => (
              <tr key={row.id}>
                {visible.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : numeric.has(column.key) ? formatNumber(row[column.key]) : row[column.key]}</td>
                ))}
                {onRowSelect && <td><button type="button" className="btn btn-secondary" aria-label={`Ver ficha ${row.name || row.id}`} onClick={() => onRowSelect(row)}>Ver ficha</button></td>}
              </tr>
            ))
          ) : (
            <tr>
              <td className="text-center" colSpan={visible.length + (onRowSelect ? 1 : 0)}>
                <div className="empty-state"><Mascot state="inactivo" size={72} /><span style={{ color: 'var(--color-text-muted)' }}>{emptyMessage}</span></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Página {formatNumber(page)} de {formatNumber(totalPages)} · {formatNumber(total)} registros
        </p>
        <div className="flex gap-2">
          <button
            aria-label="Página anterior"
            className="icon-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <button
            aria-label="Página siguiente"
            className="icon-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DataTable
