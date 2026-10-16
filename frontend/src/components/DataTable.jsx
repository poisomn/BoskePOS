import Mascot from './Mascot'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

function DataTable({
  columns,
  data,
  emptyMessage = 'No hay registros para mostrar.',
  page,
  pageSize,
  total,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="text-center" colSpan={columns.length}>
                <div className="empty-state"><Mascot state="inactivo" size={72} /><span style={{ color: 'var(--color-text-muted)' }}>{emptyMessage}</span></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Pagina {page} de {totalPages} - {total} registros
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
