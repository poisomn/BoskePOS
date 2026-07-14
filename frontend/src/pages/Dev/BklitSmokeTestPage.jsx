import { BarChart } from '@/components/charts/bar-chart'
import { Bar } from '@/components/charts/bar'
import { BarXAxis } from '@/components/charts/bar-x-axis'
import { Grid } from '@/components/charts/grid'
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip'
import { chartCssVars } from '@/components/charts/chart-context'
import { PieChart } from '@/components/charts/pie-chart'
import { PieCenter } from '@/components/charts/pie-center'
import { PieSlice } from '@/components/charts/pie-slice'

const testBarData = [
  { day: 'Lun', value: 120000 },
  { day: 'Mar', value: 185000 },
  { day: 'Mie', value: 143000 },
  { day: 'Jue', value: 210000 },
  { day: 'Vie', value: 198000 },
  { day: 'Sab', value: 176000 },
  { day: 'Dom', value: 94000 },
]

const testPieData = [
  { label: 'Stock saludable', value: 72 },
  { label: 'Stock bajo', value: 20 },
  { label: 'Sin stock', value: 8 },
]

const moneyFormatter = new Intl.NumberFormat('es-CL', {
  currency: 'CLP',
  maximumFractionDigits: 0,
  style: 'currency',
})

function BklitSmokeTestPage() {
  const inventoryTotal = testPieData.reduce((total, item) => total + item.value, 0)

  return (
    <div className="w-full space-y-6">
      <section className="surface p-5">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-brand-700)' }}>
          Dev
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Bklit UI smoke test</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Datos estaticos de prueba para verificar render, tokens y responsive. No consume API.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <article className="surface p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">Bar Chart</h2>
              <p className="section-note">Ventas de prueba por dia.</p>
            </div>
            <span className="badge badge-info">Smoke</span>
          </div>

          <div className="min-h-72 overflow-hidden">
            <BarChart
              aspectRatio="4 / 1"
              barGap={0.1}
              data={testBarData}
              margin={{ top: 8, right: 8, bottom: 40, left: 8 }}
              xDataKey="day"
            >
              <Grid horizontal />
              <Bar dataKey="value" fill={chartCssVars.linePrimary} lineCap="butt" />
              <BarXAxis maxLabels={8} />
              <ChartTooltip
                content={({ point }) => (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">
                    <p className="font-semibold">{point.day}</p>
                    <p className="mt-1">{moneyFormatter.format(Number(point.value ?? 0))}</p>
                  </div>
                )}
              />
            </BarChart>
          </div>
        </article>

        <article className="surface p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">Pie Chart</h2>
              <p className="section-note">Salud de inventario de prueba.</p>
            </div>
            <span className="badge badge-info">Smoke</span>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1">
            <div className="grid place-items-center overflow-hidden">
              <PieChart data={testPieData} innerRadius={60} size={220}>
                {testPieData.map((item, index) => (
                  <PieSlice index={index} key={item.label} />
                ))}
                <PieCenter defaultLabel="Total" />
              </PieChart>
            </div>

            <ul className="space-y-3">
              {testPieData.map((item, index) => {
                const percentage = Math.round((item.value / inventoryTotal) * 100)
                return (
                  <li className="flex items-center justify-between gap-3" key={item.label}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: `var(--chart-${index + 1})` }}
                      />
                      <span className="truncate text-sm">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {item.value} ({percentage}%)
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </article>
      </section>
    </div>
  )
}

export default BklitSmokeTestPage
