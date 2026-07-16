import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PurchasesPage from '../pages/Purchases/PurchasesPage'
import { renderWithRouter } from './utils/renderWithRouter'

const listPurchasesPageMock = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: (permission) => ['purchases:write', 'purchases:confirm', 'purchases:cancel'].includes(permission) }),
}))

vi.mock('../services/purchasesService', () => ({
  cancelPurchase: vi.fn(),
  confirmPurchase: vi.fn(),
  createPurchase: vi.fn(),
  getPurchase: vi.fn(),
  listPurchasesPage: (...args) => listPurchasesPageMock(...args),
  updatePurchase: vi.fn(),
}))

describe('PurchasesPage', () => {
  beforeEach(() => {
    listPurchasesPageMock.mockReset().mockResolvedValue({ results: [{ id: 7, supplier_name: 'Ferreteria ABC', status: 'draft', status_label: 'Borrador', reference: 'OC-01', total: 150000, created_at: '2026-07-14T10:00:00Z' }], count: 1 })
  })

  it('renders a purchase and allows opening the creation modal', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PurchasesPage />)

    expect(await screen.findByRole('heading', { name: /^compras$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /nueva compra/i }))

    expect(screen.getByRole('heading', { name: /nueva compra/i })).toBeInTheDocument()
  })
})
