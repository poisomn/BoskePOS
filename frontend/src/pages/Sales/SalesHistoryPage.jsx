import { PageHeading, PageStats, RecordDrawer, DensityControl, ExportButton } from '../../components/OperationsUI'
import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiEye, FiSearch } from 'react-icons/fi'

import DataTable from '../../components/DataTable'
import { useAuth } from '../../hooks/useAuth'
import { listSalesPage } from '../../services/salesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const PAGE_SIZE = 10

function SalesHistoryPage() {
  const { hasPermission } = useAuth()
  const [contactParams] = useSearchParams()
  const contactId = contactParams.get('customer') || ''
  const [detail, setDetail] = useState(null)
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
        customer: contactId,
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
  }, [page, search, statusFilter, contactId])

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
      <PageHeading section="Ventas" title="Cada venta, en su lugar" description="Busca operaciones, consulta comprobantes y revisa sus estados."><Link className="btn btn-primary" to="/checkout">Ir a caja de venta</Link></PageHeading>
      <PageStats total={total} rows={sales} resource="ventas" />
      <div className="ops-table-top"><DensityControl /><ExportButton rows={sales} name="sales" columns={[['id','Identificador','number'],['customer_name','Cliente'],['user_email','Responsable'],['status_label','Estado'],['payment_method_label','Medio de pago'],['total','Total','money'],['created_at','Fecha','date']]} /></div>

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

      <RecordDrawer record={detail} resource="Venta" onClose={() => setDetail(null)} />
      <DataTable
        onRowSelect={setDetail}
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
