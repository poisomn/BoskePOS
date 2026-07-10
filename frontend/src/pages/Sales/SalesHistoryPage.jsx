import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiEye, FiFileText } from 'react-icons/fi'

import DataTable from '../../components/DataTable'
import { listSales } from '../../services/salesService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const PAGE_SIZE = 10

function SalesHistoryPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sales, setSales] = useState([])

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const data = await listSales()
      setSales(data)
      setPage(1)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el historial de ventas.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(fetchSales)
  }, [fetchSales])

  const paginatedSales = useMemo(
    () => sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, sales],
  )

  const columns = [
    { key: 'id', header: 'Venta', render: (sale) => `#${sale.id}` },
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
        <Link className="icon-btn" to={`/sales/${sale.id}`} aria-label={`Ver venta ${sale.id}`}>
          <FiEye aria-hidden="true" />
        </Link>
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

      {error ? <div className="alert alert-error">{error}</div> : null}

      <DataTable
        columns={columns}
        data={isLoading ? [] : paginatedSales}
        emptyMessage={isLoading ? 'Cargando ventas...' : 'No hay ventas registradas.'}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={sales.length}
      />
    </div>
  )
}

export default SalesHistoryPage
