import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calendarDate, dateValue, shiftDate, rangeDays, rangeError, displayDate } from '../src/utils/dateRanges.js'

test('Civil dates round-trip in Chile without UTC offset drift', () => {
  for (const value of ['2026-10-20', '2026-09-06', '2026-04-05', '2028-02-29']) assert.equal(dateValue(calendarDate(value)), value)
  assert.equal(displayDate('2026-10-20'), '20/10/2026')
})
test('Invalid or incomplete dates are rejected', () => {
  for (const value of ['', '2026-02-30', '2026-13-01', '2026-10', 'texto']) assert.equal(calendarDate(value), undefined)
  assert.ok(rangeError('', '2026-10-20', 31))
  assert.ok(rangeError('2026-10-21', '2026-10-20', 31))
})
test('Inclusive ranges respect the API limit, including same-day selection', () => {
  assert.equal(rangeDays('2026-10-20', '2026-10-20'), 1)
  assert.equal(rangeError('2026-10-01', '2026-10-31', 31), '')
  assert.ok(rangeError('2026-10-01', '2026-11-01', 31))
  assert.equal(rangeError('2026-01-01', '2026-12-31', 366), '')
})
test('Date arithmetic crosses month boundaries and Chile daylight saving safely', () => {
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28')
  assert.equal(shiftDate('2026-09-05', 1), '2026-09-06')
  assert.equal(shiftDate('2026-09-06', 1), '2026-09-07')
  assert.equal(rangeDays('2026-09-05', '2026-09-07'), 3)
})
