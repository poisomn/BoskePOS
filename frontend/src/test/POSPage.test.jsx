import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import POSPage from '../pages/POS/POSPage'
import { renderWithRouter } from './utils/renderWithRouter'

const listCustomersMock = vi.fn()
const searchPosProductsMock = vi.fn()
const quotePosCartMock = vi.fn()
const createSaleMock = vi.fn()
const getProductByBarcodeMock = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'cajero@boskepos.cl' } }),
}))

vi.mock('../services/customersService', () => ({ listCustomers: (...args) => listCustomersMock(...args) }))
vi.mock('../services/inventoryService', () => ({ getProductByBarcode: (...args) => getProductByBarcodeMock(...args) }))
vi.mock('../services/posService', () => ({
  quotePosCart: (...args) => quotePosCartMock(...args),
  searchPosProducts: (...args) => searchPosProductsMock(...args),
}))
vi.mock('../services/salesService', () => ({ createSale: (...args) => createSaleMock(...args) }))

describe('POSPage', () => {
  beforeEach(() => {
    listCustomersMock.mockReset().mockResolvedValue([])
    searchPosProductsMock.mockReset().mockResolvedValue([])
    quotePosCartMock.mockReset().mockResolvedValue({ items: [], subtotal: '0.00', total: '0.00' })
    createSaleMock.mockReset().mockResolvedValue({ id: 99 })
    getProductByBarcodeMock.mockReset()
  })

  it('adds a product from the search results to the cart', async () => {
    searchPosProductsMock.mockResolvedValueOnce([
      { id: 10, name: 'Taladro', sku: 'TLD-100', stock: 5, sale_price: 50000, category: { name: 'Herramientas' } },
    ])
    quotePosCartMock.mockResolvedValueOnce({ items: [{ product_id: 10, name: 'Taladro', sku: 'TLD-100', available_stock: 5, quantity: 1, unit_price: 50000, line_subtotal: 50000 }], subtotal: '50000', total: '50000' })

    const user = userEvent.setup()
    renderWithRouter(<POSPage />)

    const input = screen.getByLabelText(/buscar producto/i)
    await user.type(input, 'taladro')

    await waitFor(() => expect(searchPosProductsMock).toHaveBeenCalled())

    const addButton = await screen.findByRole('button', { name: /agregar taladro al carrito/i })
    await user.click(addButton)

    expect(await screen.findByText(/taladro/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cobrar venta/i })).toBeEnabled()
  })
})
