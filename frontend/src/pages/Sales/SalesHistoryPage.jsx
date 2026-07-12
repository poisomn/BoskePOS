import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiEye, FiFileText, FiSearch } from 'react-icons/fi'

import DataTable from '../../components/DataTable'
import { useAuth } from '../../hooks/useAuth'
import { listSalesPage } from '../../services/salesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const PAGE_SIZE = 10

function SalesHistoryPage() {
  const { hasPermission } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [total, setTotal] = useState(0)

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listSalesPage({
        page,
        pageSize: PAGE_SIZE,
        search,
        status: statusFilter,
      })
      setSales(data.results)
      setTotal(data.count)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el historial de ventas.'))
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    queueMicrotask(fetchSales)
  }, [fetchSales])

  const emptyMessage = useMemo(() => {
    if (isLoading) return 'Cargando ventas...'
    if (search || statusFilter) return 'No hay ventas que coincidan con los filtros.'
    return 'No hay ventas registradas.'
  }, [isLoading, search, statusFilter])

  const columns = [
    { key: 'id', header: 'Venta', render: (sale) => `#${sale.id}` },
    {
      key: 'status',
      header: 'Estado',
      render: (sale) => <StatusBadge status={sale.status} label={sale.status_label} />,
    },
    {
      key: 'created_at',
      header: 'Fecha',
      render: (sale) => formatDateTime(sale.created_at),
    },
    {
      key: 'customer_name',
      header: 'Cliente',
      render: (sale) => sale.customer_name || 'Consumidor final',
    },
    {
      key: 'user_email',
      header: 'Vendedor',
      render: (sale) => sale.user_email || '-',
    },
    {
      key: 'total',
      header: 'Total',
      render: (sale) => <strong>{formatMoney(sale.total)}</strong>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (sale) => (
        <div className="flex gap-2">
          <Link className="icon-btn" to={`/sales/${sale.id}`} aria-label={`Ver venta ${sale.id}`}>
            <FiEye aria-hidden="true" />
          </Link>
          {!hasPermission('sales:cancel') && sale.status === 'completed' ? (
            <span className="badge badge-neutral">Sin anulacion</span>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <section className="surface p-5">
        <div className="flex items-start gap-4">
          <div
            className="grid size-11 place-items-center rounded-md"
            style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
          >
            <FiFileText aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
              Ventas
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Historial de ventas</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Consulta ventas registradas y abre su comprobante.
            </p>
          </div>
        </div>
      </section>

      <section className="surface p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
          <label>
            <span className="field-label">Buscar</span>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-steel-500)' }} />
              <input
                className="input pl-10"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Numero, cliente, RUT o producto"
                value={search}
              />
            </div>
          </label>
          <label>
            <span className="field-label">Estado</span>
            <select
              className="select"
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              value={statusFilter}
            >
              <option value="">Todos</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Anuladas</option>
              <option value="pending">Pendientes</option>
            </select>
          </label>
        </div>
      </section>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : sales}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />
    </div>
  )
}

function StatusBadge({ label, status }) {
  const className = {
    cancelled: 'badge-error',
    completed: 'badge-success',
    pending: 'badge-warning',
  }[status] ?? 'badge-neutral'

  return <span className={`badge ${className}`}>{label}</span>
}

export default SalesHistoryPage
