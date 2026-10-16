import assert from 'node:assert/strict'
import test from 'node:test'
import { createMascotController } from '../src/lib/mascotController.js'

function fixture() {
  let now = 0
  let nextId = 0
  const timers = new Map()
  const controller = createMascotController({
    schedule(callback, delay) { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id },
    cancel(id) { timers.delete(id) },
  })
  return {
    controller,
    advance(ms) {
      const end = now + ms
      while (true) {
        const entry = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
        if (!entry || entry[1].at > end) break
        now = entry[1].at
        timers.delete(entry[0])
        entry[1].callback()
      }
      now = end
    },
  }
}

test('rests by default, sleeps at five seconds and wakes on activity', () => {
  const { controller: c, advance } = fixture()
  assert.equal(c.getSnapshot(), 'reposo')
  c.active(); advance(4999)
  assert.equal(c.getSnapshot(), 'reposo')
  advance(1)
  assert.equal(c.getSnapshot(), 'inactivo')
  c.active()
  assert.equal(c.getSnapshot(), 'reposo')
})

test('activity restarts the five second idle deadline', () => {
  const { controller: c, advance } = fixture()
  c.active(); advance(4000); c.active(); advance(4000)
  assert.equal(c.getSnapshot(), 'reposo')
  advance(1000)
  assert.equal(c.getSnapshot(), 'inactivo')
})

test('parallel requests keep loading until the final request finishes', () => {
  const { controller: c, advance } = fixture()
  c.active()
  const first = c.beginRequest(), second = c.beginRequest()
  advance(5000)
  c.finishRequest(first)
  assert.equal(c.getSnapshot(), 'cargando')
  c.finishRequest(second)
  assert.equal(c.getSnapshot(), 'inactivo')
  c.active()
  assert.equal(c.getSnapshot(), 'reposo')
})

test('error feedback survives other requests and cannot turn into a false success', () => {
  const { controller: c, advance } = fixture()
  const first = c.beginRequest(), second = c.beginRequest()
  c.finishRequest(first, 'error'); advance(10000)
  assert.equal(c.getSnapshot(), 'cargando')
  c.finishRequest(second, 'exito')
  assert.equal(c.getSnapshot(), 'error')
  advance(2400)
  assert.equal(c.getSnapshot(), 'reposo')
})

test('a cancelled or duplicate request does not report an error or leave a busy mascot', () => {
  const { controller: c } = fixture()
  const request = c.beginRequest()
  c.finishRequest(request)
  c.finishRequest(request, 'error')
  assert.equal(c.getSnapshot(), 'reposo')
})

test('login wink and success are temporary and return to the current activity state', () => {
  const { controller: c, advance } = fixture()
  c.active(); c.react('login')
  assert.equal(c.getSnapshot(), 'login')
  advance(2400)
  assert.equal(c.getSnapshot(), 'reposo')
  const request = c.beginRequest()
  c.finishRequest(request, 'exito')
  assert.equal(c.getSnapshot(), 'exito')
  advance(2600)
  assert.equal(c.getSnapshot(), 'inactivo')
})

test('new work interrupts feedback and reset ignores late responses', () => {
  const { controller: c, advance } = fixture()
  c.react('exito')
  const request = c.beginRequest()
  assert.equal(c.getSnapshot(), 'cargando')
  c.reset(); c.finishRequest(request, 'error'); advance(10000)
  assert.equal(c.getSnapshot(), 'reposo')
})

test('subscribers are notified on meaningful changes and can unsubscribe', () => {
  const { controller: c, advance } = fixture()
  const states = []
  const unsubscribe = c.subscribe(() => states.push(c.getSnapshot()))
  c.active(); c.active(); advance(5000); c.active(); unsubscribe(); advance(5000)
  assert.deepEqual(states, ['inactivo', 'reposo'])
})
