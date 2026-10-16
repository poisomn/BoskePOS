import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductResults } from '../src/pages/POS/POSPage.jsx'
import POSOperationsPage from '../src/pages/POS/POSOperationsPage.jsx'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../src/contexts/authContextValue.js'

const product = { id: 1, name: 'Producto de prueba', sku: 'TEST', sale_price: '1990', stock: 0 }
const baseProps = { results: [], search: '', selectedIndex: 0, onAddProduct() {} }
const render = (props) => renderToStaticMarkup(<ProductResults {...baseProps} {...props} />)

test('Stock rejection changes the empty-results mascot and recovery text', () => {
  const html = render({ error: 'No hay stock suficiente para el producto TEST.' })
  assert.match(html, /estado="error"/)
  assert.match(html, /corrige el producto o la cantidad/)
  assert.doesNotMatch(html, /Tu próxima venta comienza aquí/)
})

test('Errors keep a visible mascot when product results are present', () => {
  const html = render({ error: 'No se pudo procesar el código.', results: [product] })
  assert.match(html, /estado="error"/)
  assert.match(html, /Producto de prueba/)
})

test('An active error takes priority over processing', () => {
  assert.match(render({ error: 'Error de carrito', isProcessing: true }), /estado="error"/)
})

test('Processing changes the mascot both with and without results', () => {
  for (const results of [[], [product]]) {
    assert.match(render({ isProcessing: true, results }), /estado="cargando"/)
  }
})

test('Clearing the error restores the idle mascot and normal empty-state text', () => {
  const html = render({ error: '', isProcessing: false })
  assert.match(html, /estado="reposo"/)
  assert.match(html, /Tu próxima venta comienza aquí/)
  assert.doesNotMatch(html, /corrige el producto o la cantidad/)
})

test('The routed POS keeps its mascot visible in the empty cart without a product search', () => {
  const html = renderToStaticMarkup(
    <AuthContext.Provider value={{ user: { id: 1, email: 'test@example.test' }, hasPermission: () => true }}>
      <MemoryRouter><POSOperationsPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
  assert.match(html, /data-testid="cart-mascot"/)
  assert.match(html, /<arbol-mascota/)
  assert.match(html, /Tu próxima venta comienza aquí/)
})
