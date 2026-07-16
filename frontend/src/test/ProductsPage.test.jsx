import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProductsPage from '../pages/Inventory/ProductsPage'
import { renderWithRouter } from './utils/renderWithRouter'

const listProductsPageMock = vi.fn()
const listCategoriesPageMock = vi.fn()
const listStockMovementsPageMock = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    hasPermission: (permission) => ['inventory:adjust_stock', 'inventory:view_costs', 'inventory:write', 'stock_movements:read'].includes(permission),
  }),
}))

vi.mock('../services/inventoryService', () => ({
  activateProduct: vi.fn(),
  adjustProductStock: vi.fn(),
  createProduct: vi.fn(),
  deactivateProduct: vi.fn(),
  getProductByBarcode: vi.fn(),
  listCategoriesPage: (...args) => listCategoriesPageMock(...args),
  listProductsPage: (...args) => listProductsPageMock(...args),
  listStockMovementsPage: (...args) => listStockMovementsPageMock(...args),
  updateProduct: vi.fn(),
}))

describe('ProductsPage', () => {
  beforeEach(() => {
    listProductsPageMock.mockReset().mockResolvedValue({ results: [{ id: 1, name: 'Martillo', sku: 'MRT-1', stock: 3, category: null, is_active: true }], count: 1 })
    listCategoriesPageMock.mockReset().mockResolvedValue({ results: [] })
    listStockMovementsPageMock.mockReset().mockResolvedValue({ results: [], count: 0 })
  })

  it('renders the product grid and shows the empty state when no products match', async () => {
    listProductsPageMock.mockResolvedValueOnce({ results: [], count: 0 })

    renderWithRouter(<ProductsPage />)

    expect(await screen.findByText(/no hay productos/i)).toBeInTheDocument()
  })

  it('shows the product from the service response', async () => {
    renderWithRouter(<ProductsPage />)

    await waitFor(() => expect(screen.getByText('Martillo')).toBeInTheDocument())
  })
})
