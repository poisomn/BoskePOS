import assert from 'node:assert/strict'
import test from 'node:test'
import { initialTickets, integer, money, products, total, validateTicket } from '../src/pages/WireframeV2/model.js'

test('Formats currencies, quantities and percentages without decimal digits', () => {
  assert.equal(money(15058.7755), '$15.059')
  assert.equal(integer(32.48), '32')
  assert.equal(integer(120), '120')
  assert.equal(money(0), '$0')
})
test('Preview totals use catalogue prices and integer quantities', () => {
  assert.equal(total(initialTickets[0].items), 57970)
  assert.equal(total(initialTickets[1].items), 17970)
  assert.equal(total([]), 0)
})
test('A ticket with insufficient stock cannot proceed', () => {
  const ticket = { status: 'Pendiente', items: [{ productId: 'P003', quantity: 1 }] }
  assert.match(validateTicket(ticket), /Stock insuficiente/)
})
test('Paid, cancelled, missing and empty tickets cannot be charged', () => {
  for (const status of ['Pagado', 'Cancelado']) assert.ok(validateTicket({ ...initialTickets[0], status }))
  assert.ok(validateTicket(null))
  assert.ok(validateTicket({ status: 'Pendiente', items: [] }))
})
test('Negative, missing and fractional product lines are rejected in the whole-unit demo', () => {
  for (const quantity of [0, -1, 1.5]) assert.ok(validateTicket({ status: 'Pendiente', items: [{ productId: 'P001', quantity }] }))
  assert.ok(validateTicket({ status: 'Pendiente', items: [{ productId: 'MISSING', quantity: 1 }] }))
})
test('Validation leaves the original ticket and stock unchanged', () => {
  const before = JSON.stringify({ initialTickets, products })
  assert.equal(validateTicket(initialTickets[0]), '')
  assert.equal(JSON.stringify({ initialTickets, products }), before)
})
