import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DashboardPage from '../pages/Dashboard/DashboardPage'
import { renderWithRouter } from './utils/renderWithRouter'

const getDashboardSummaryMock = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: (permission) => ['sales:read', 'inventory:read', 'purchases:read', 'customers:read'].includes(permission),
    user: { first_name: 'Alicia', last_name: 'Mora', email: 'alicia@boskepos.cl' },
  }),
}))

vi.mock('../services/dashboardService', () => ({
  getDashboardSummary: (...args) => getDashboardSummaryMock(...args),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    getDashboardSummaryMock.mockReset()
  })

  it('renders the dashboard summary and allows refreshing the data', async () => {
    getDashboardSummaryMock.mockResolvedValueOnce({
      sales: { total: 1200000, count: 12, recent: [], top_products: [] },
      inventory: { low_stock_count: 3, out_of_stock_count: 2 },
      purchases: { recent: [] },
      stock_movements: { recent: [] },
      period: { from: '2026-07-01', to: '2026-07-07' },
    })

    const user = userEvent.setup()
    renderWithRouter(<DashboardPage />)

    expect(await screen.findByRole('heading', { name: /bienvenido, alicia mora/i })).toBeInTheDocument()
    expect(screen.getByText(/ventas del periodo/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /actualizar/i }))

    await waitFor(() => expect(getDashboardSummaryMock).toHaveBeenCalled())
  })
})
