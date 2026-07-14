import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiClock,
  FiCreditCard,
  FiPackage,
  FiRefreshCw,
  FiShoppingBag,
  FiShoppingCart,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi'

import { Bar } from '@/components/charts/bar'
import { BarChart } from '@/components/charts/bar-chart'
import { BarXAxis } from '@/components/charts/bar-x-axis'
import { chartCssVars } from '@/components/charts/chart-context'
import { Grid } from '@/components/charts/grid'
import { PieCenter } from '@/components/charts/pie-center'
import { PieChart } from '@/components/charts/pie-chart'
import { PieSlice } from '@/components/charts/pie-slice'
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardSummary } from '../../services/dashboardService'
import { getApiErrorMessage } from '../../utils/apiErrors'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const RECENT_LIMIT = 5

const periodOptions = [
  { key: 'today', label: 'Hoy', days: 1 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: 'custom', label: 'Rango personalizado' },
]

function DashboardPage() {
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()
  const today = useMemo(() => getLocalDateInputValue(), [])
  const [periodMode, setPeriodMode] = useState('today')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const displayName = getDisplayName(user)

  const fetchSummary = useCallback(async (range) => {
    setIsLoading(true)
    setError('')

    try {
      const data = await getDashboardSummary({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        limit: RECENT_LIMIT,
      })
      setSummary(data)
    } catch (requestError) {
      setSummary(null)
      setError(getApiErrorMessage(requestError, 'No se pudo cargar el dashboard.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => fetchSummary({ dateFrom: today, dateTo: today }))
  }, [fetchSummary, today])

  function applyPeriod(option) {
    setPeriodMode(option.key)

    if (option.key === 'custom') {
      return
    }

    const nextRange = getRangeForDays(option.days)
    setDateFrom(nextRange.dateFrom)
    setDateTo(nextRange.dateTo)
    fetchSummary(nextRange)
  }

  function handleSubmit(event) {
    event.preventDefault()
    fetchSummary({ dateFrom, dateTo })
  }

  const quickActions = [
    {
      icon: FiShoppingCart,
      label: 'Abrir POS',
      onClick: () => navigate('/pos'),
      visible: hasPermission('sales:complete'),
    },
    {
      icon: FiPackage,
      label: 'Productos',
      onClick: () => navigate('/inventory/products'),
      visible: hasPermission('inventory:read'),
    },
    {
      icon: FiShoppingBag,
      label: 'Compras',
      onClick: () => navigate('/purchases'),
      visible: hasPermission('purchases:read'),
    },
    {
      icon: FiCreditCard,
      label: 'Ventas',
      onClick: () => navigate('/sales'),
      visible: hasPermission('sales:read'),
    },
    {
      icon: FiUser,
      label: 'Clientes',
      onClick: () => navigate('/customers'),
      visible: hasPermission('customers:read'),
    },
  ].filter((action) => action.visible)

  return (
    <div className="w-full space-y-6">
      <DashboardHeader
        dateFrom={dateFrom}
        dateTo={dateTo}
        displayName={displayName}
        isLoading={isLoading}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onPeriodChange={applyPeriod}
        onSubmit={handleSubmit}
        periodMode={periodMode}
      />

      {error ? <ErrorState message={error} onRetry={() => fetchSummary({ dateFrom, dateTo })} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={FiTrendingUp}
          isLoading={isLoading}
          label="Ventas del periodo"
          note={formatPeriod(summary)}
          unavailable={!hasPermission('sales:read')}
          value={summary?.sales ? formatMoney(summary.sales.total) : '-'}
        />
        <KpiCard
          icon={FiCreditCard}
          isLoading={isLoading}
          label="Cantidad de ventas"
          note="Solo ventas completadas"
          unavailable={!hasPermission('sales:read')}
          value={summary?.sales ? formatInteger(summary.sales.count) : '-'}
        />
        <KpiCard
          icon={FiAlertTriangle}
          isLoading={isLoading}
          label="Stock bajo"
          note="Productos activos bajo minimo"
          tone="warning"
          unavailable={!hasPermission('inventory:read')}
          value={summary?.inventory ? formatInteger(summary.inventory.low_stock_count) : '-'}
        />
        <KpiCard
          icon={FiPackage}
          isLoading={isLoading}
          label="Sin stock"
          note="Productos activos con stock cero"
          tone="danger"
          unavailable={!hasPermission('inventory:read')}
          value={summary?.inventory ? formatInteger(summary.inventory.out_of_stock_count) : '-'}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SalesBarChart
          isLoading={isLoading}
          period={summary?.period}
          sales={summary?.sales}
          unavailable={!hasPermission('sales:read')}
        />
        <InventoryHealthChart
          inventory={summary?.inventory}
          isLoading={isLoading}
          unavailable={!hasPermission('inventory:read')}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RecentSalesTable
          isLoading={isLoading}
          sales={summary?.sales?.recent ?? []}
          unavailable={!hasPermission('sales:read')}
        />
        <TopProductsPanel products={summary?.sales?.top_products ?? []} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RecentPurchasesTable
          isLoading={isLoading}
          purchases={summary?.purchases?.recent ?? []}
          unavailable={!hasPermission('purchases:read')}
        />
        <RecentStockMovementsTable
          isLoading={isLoading}
          movements={summary?.stock_movements?.recent ?? []}
          unavailable={!hasPermission('stock_movements:read')}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <InventoryAlerts
          inventory={summary?.inventory}
          isLoading={isLoading}
          unavailable={!hasPermission('inventory:read')}
        />
        <QuickActions actions={quickActions} user={user} />
      </section>
    </div>
  )
}

function DashboardHeader({
  dateFrom,
  dateTo,
  displayName,
  isLoading,
  onDateFromChange,
  onDateToChange,
  onPeriodChange,
  onSubmit,
  periodMode,
}) {
  return (
    <section className="surface p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
            Dashboard operativo
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Bienvenido, {displayName}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Indicadores calculados por el backend para revisar ventas, inventario y actividad reciente.
          </p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <button
                className={`btn h-9 px-3 ${periodMode === option.key ? 'btn-primary' : 'btn-secondary'}`}
                key={option.key}
                onClick={() => onPeriodChange(option)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[155px_155px_auto]">
            <label>
              <span className="field-label">Desde</span>
              <input
                className="input"
                max={dateTo}
                onChange={(event) => {
                  onDateFromChange(event.target.value)
                  onPeriodChange({ key: 'custom' })
                }}
                type="date"
                value={dateFrom}
              />
            </label>
            <label>
              <span className="field-label">Hasta</span>
              <input
                className="input"
                min={dateFrom}
                onChange={(event) => {
                  onDateToChange(event.target.value)
                  onPeriodChange({ key: 'custom' })
                }}
                type="date"
                value={dateTo}
              />
            </label>
            <button className="btn btn-primary self-end" disabled={isLoading} type="submit">
              <FiRefreshCw aria-hidden="true" className={isLoading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function KpiCard({ icon: Icon, isLoading, label, note, tone = 'neutral', unavailable, value }) {
  const toneClass = {
    danger: 'badge-error',
    neutral: 'badge-neutral',
    warning: 'badge-warning',
  }[tone]

  return (
    <article className="card min-h-36">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-28" />
          ) : (
            <p className="mt-2 truncate text-2xl font-semibold">
              {unavailable ? 'Sin permiso' : value}
            </p>
          )}
        </div>
        <div
          className="grid size-10 shrink-0 place-items-center rounded-md"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
        >
          <Icon aria-hidden="true" />
        </div>
      </div>
      <span className={`badge mt-4 ${unavailable ? 'badge-neutral' : toneClass}`}>
        {unavailable ? 'No disponible para tu rol' : note}
      </span>
    </article>
  )
}

function SalesBarChart({ isLoading, sales, unavailable }) {
  const chartData = useMemo(() => {
    if (!sales?.daily || unavailable) {
      return []
    }

    return sales.daily.map((item) => ({
      count: Number(item.count ?? 0),
      day: formatShortDate(item.date),
      fullDate: item.date,
      value: Number(item.total ?? 0),
    }))
  }, [sales, unavailable])

  const barWidth = chartData.length <= 7 ? 28 : chartData.length <= 14 ? 22 : undefined

  return (
    <DashboardPanel
      icon={FiTrendingUp}
      isLoading={isLoading}
      subtitle="Ventas completadas agrupadas por dia dentro del periodo seleccionado."
      title="Ventas del periodo"
      unavailable={unavailable}
    >
      {chartData.some((item) => item.value > 0) ? (
        <div className="min-h-72 overflow-hidden">
          <BarChart
            aspectRatio="4 / 1"
            barGap={0.1}
            barWidth={barWidth}
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 40, left: 8 }}
            xDataKey="day"
          >
            <Grid horizontal />
            <Bar dataKey="value" fill={chartCssVars.linePrimary} lineCap="butt" />
            <BarXAxis maxLabels={8} />
            <ChartTooltip
              content={({ point }) => (
                <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">
                  <p className="font-semibold">{formatDisplayDate(point.fullDate)}</p>
                  <p className="mt-1">{formatMoney(point.value ?? 0)}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatInteger(point.count)} ventas
                  </p>
                </div>
              )}
            />
          </BarChart>
        </div>
      ) : (
        <EmptyState message="No hay ventas completadas para graficar en este periodo." />
      )}
    </DashboardPanel>
  )
}

function InventoryHealthChart({ inventory, isLoading, unavailable }) {
  const pieData = useMemo(() => {
    if (!inventory || unavailable) {
      return []
    }

    return [
      { color: 'var(--status-success)', label: 'Stock saludable', value: Number(inventory.healthy_stock_count ?? 0) },
      { color: 'var(--status-warning)', label: 'Stock bajo', value: Number(inventory.alert_stock_count ?? 0) },
      { color: 'var(--status-danger)', label: 'Sin stock', value: Number(inventory.out_of_stock_count ?? 0) },
    ].filter((item) => item.value > 0)
  }, [inventory, unavailable])
  const total = pieData.reduce((currentTotal, item) => currentTotal + item.value, 0)

  return (
    <DashboardPanel
      icon={FiPackage}
      isLoading={isLoading}
      subtitle="Distribucion de productos activos segun stock actual."
      title="Salud de inventario"
      unavailable={unavailable}
    >
      {pieData.length ? (
        <div className="grid gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1">
          <div className="grid place-items-center overflow-hidden">
            <PieChart data={pieData} innerRadius={60} size={220}>
              {pieData.map((item, index) => (
                <PieSlice index={index} key={item.label} />
              ))}
              <PieCenter defaultLabel="Alertas" />
            </PieChart>
          </div>
          <ul className="space-y-3">
            {pieData.map((item, index) => (
              <li className="flex items-center justify-between gap-3" key={item.label}>
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: item.color ?? `var(--chart-${index + 1})` }}
                  />
                  <span className="truncate text-sm">{item.label}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {formatInteger(item.value)} ({Math.round((item.value / total) * 100)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState message="No hay alertas de inventario para graficar." />
      )}
    </DashboardPanel>
  )
}

function RecentSalesTable({ isLoading, sales, unavailable }) {
  return (
    <DashboardPanel
      icon={FiCreditCard}
      isLoading={isLoading}
      title="Ventas recientes"
      unavailable={unavailable}
    >
      <RecentTable
        columns={['Venta', 'Cliente', 'Estado', 'Total', 'Fecha']}
        emptyMessage="No hay ventas recientes."
        rows={sales.map((sale) => [
          `#${sale.id}`,
          sale.customer,
          <StatusBadge key="status" label={sale.status_label} status={sale.status} />,
          formatMoney(sale.total),
          formatDateTime(sale.created_at),
        ])}
      />
    </DashboardPanel>
  )
}

function RecentPurchasesTable({ isLoading, purchases, unavailable }) {
  return (
    <DashboardPanel
      icon={FiShoppingBag}
      isLoading={isLoading}
      title="Compras recientes"
      unavailable={unavailable}
    >
      <RecentTable
        columns={['Compra', 'Proveedor', 'Estado', 'Total', 'Fecha']}
        emptyMessage="No hay compras recientes."
        rows={purchases.map((purchase) => [
          `#${purchase.id}`,
          purchase.supplier,
          <StatusBadge key="status" label={purchase.status_label} status={purchase.status} />,
          formatMoney(purchase.total),
          formatDateTime(purchase.created_at),
        ])}
      />
    </DashboardPanel>
  )
}

function RecentStockMovementsTable({ isLoading, movements, unavailable }) {
  return (
    <DashboardPanel
      icon={FiRefreshCw}
      isLoading={isLoading}
      title="Movimientos recientes"
      unavailable={unavailable}
    >
      <RecentTable
        columns={['Producto', 'Tipo', 'Cantidad', 'Saldo', 'Fecha']}
        emptyMessage="No hay movimientos recientes."
        rows={movements.map((movement) => [
          `${movement.product} (${movement.sku})`,
          movement.movement_type_label,
          formatInteger(movement.quantity),
          `${formatInteger(movement.stock_before)} -> ${formatInteger(movement.stock_after)}`,
          formatDateTime(movement.created_at),
        ])}
      />
    </DashboardPanel>
  )
}

function InventoryAlerts({ inventory, isLoading, unavailable }) {
  const lowStockProducts = inventory?.low_stock_products ?? []
  const outOfStockProducts = inventory?.out_of_stock_products ?? []

  return (
    <DashboardPanel
      icon={FiAlertTriangle}
      isLoading={isLoading}
      title="Alertas de inventario"
      unavailable={unavailable}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <StockList products={lowStockProducts} title="Stock bajo" />
        <StockList products={outOfStockProducts} title="Sin stock" tone="danger" />
      </div>
    </DashboardPanel>
  )
}

function TopProductsPanel({ products = [] }) {
  return (
    <DashboardPanel
      icon={FiPackage}
      subtitle="Productos con mas unidades vendidas en el periodo."
      title="Top de productos"
    >
      {products.length ? (
        <div className="space-y-3">
          {products.map((product) => (
            <div className="grid gap-2" key={product.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    SKU {product.sku}
                  </p>
                </div>
                <span className="badge badge-info">
                  {formatInteger(product.quantity)} uds
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--color-steel-100)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: 'var(--primary)',
                    width: `${getTopProductWidth(product, products)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Sin productos vendidos en este periodo." />
      )}
    </DashboardPanel>
  )
}

function QuickActions({ actions, user }) {
  return (
    <DashboardPanel icon={FiClock} title="Acciones rapidas">
      <div className="card mb-4 flex items-center gap-3 p-3">
        <div
          className="grid size-10 place-items-center rounded-md"
          style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }}
        >
          <FiUser aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.email}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Usuario autenticado
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.length ? actions.map(({ icon: Icon, label, onClick }) => (
          <button className="btn btn-secondary justify-start" key={label} onClick={onClick} type="button">
            <Icon aria-hidden="true" />
            {label}
          </button>
        )) : (
          <EmptyState message="No hay accesos disponibles para tu rol." />
        )}
      </div>
    </DashboardPanel>
  )
}

function DashboardPanel({ children, icon: Icon, isLoading = false, subtitle = '', title, unavailable = false }) {
  let content = children

  if (isLoading) {
    content = <PanelSkeleton />
  } else if (unavailable) {
    content = <EmptyState message="No disponible para tu rol." />
  }

  return (
    <article className="surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="section-note">{subtitle}</p> : null}
        </div>
        <span className="badge badge-neutral shrink-0">
          <Icon aria-hidden="true" />
          Operativo
        </span>
      </div>
      {content}
    </article>
  )
}

function RecentTable({ columns, emptyMessage, rows }) {
  if (!rows.length) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockList({ products, title, tone = 'warning' }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {products.length ? (
        <div className="mt-3 space-y-2">
          {products.map((product) => (
            <article className="card p-3" key={product.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    SKU {product.sku}
                  </p>
                </div>
                <span className={`badge ${tone === 'danger' ? 'badge-error' : 'badge-warning'}`}>
                  {formatInteger(product.stock)} / min {formatInteger(product.minimum_stock)}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="Sin productos." />
      )}
    </div>
  )
}

function StatusBadge({ label, status }) {
  const normalizedStatus = String(status ?? '').toLowerCase()

  if (normalizedStatus.includes('cancel') || normalizedStatus.includes('annul')) {
    return <span className="badge badge-error">{label}</span>
  }

  if (normalizedStatus.includes('pend') || normalizedStatus.includes('draft')) {
    return <span className="badge badge-warning">{label}</span>
  }

  return <span className="badge badge-success">{label}</span>
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-error items-center justify-between">
      <span>{message}</span>
      <button className="btn btn-secondary h-9" onClick={onRetry} type="button">
        <FiRefreshCw aria-hidden="true" />
        Reintentar
      </button>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
      {message}
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-6 w-1/2" />
    </div>
  )
}

function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: 'var(--color-steel-100)' }}
    />
  )
}

function formatPeriod(summary) {
  if (!summary?.period) {
    return 'Rango seleccionado'
  }

  if (summary.period.date_from === summary.period.date_to) {
    return summary.period.date_from
  }

  return `${summary.period.date_from} al ${summary.period.date_to}`
}

function formatShortDate(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00`))
}

function formatDisplayDate(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`))
}

function formatInteger(value) {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function getTopProductWidth(product, products) {
  const maxQuantity = Math.max(
    ...products.map((item) => Number(item.quantity ?? 0)),
    1,
  )

  return Math.max(8, Math.round((Number(product.quantity ?? 0) / maxQuantity) * 100))
}

function getDisplayName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
  return fullName || user?.email || 'usuario'
}

function getRangeForDays(days) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - (days - 1))

  return {
    dateFrom: formatDateInputValue(startDate),
    dateTo: formatDateInputValue(endDate),
  }
}

function getLocalDateInputValue() {
  return formatDateInputValue(new Date())
}

function formatDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default DashboardPage
