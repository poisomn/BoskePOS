// No operation data or credentials belong in this visual state controller.
export function createMascotController({ schedule = setTimeout, cancel = clearTimeout, idleMs = 5000, feedbackMs = 2400 } = {}) {
  const listeners = new Set()
  const requests = new Set()
  let idle = false
  let idleTimer
  let feedbackTimer
  let feedback = null
  let snapshot = 'reposo'

  function publish() {
    const next = requests.size ? 'cargando' : feedback || (idle ? 'inactivo' : 'reposo')
    if (snapshot === next) return
    snapshot = next
    listeners.forEach(listener => listener())
  }
  function expireFeedback() {
    cancel(feedbackTimer)
    if (!requests.size && feedback) feedbackTimer = schedule(() => { feedback = null; publish() }, feedbackMs)
  }
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => 'reposo',
    active() {
      cancel(idleTimer)
      idle = false
      idleTimer = schedule(() => { idle = true; publish() }, idleMs)
      publish()
    },
    pauseIdle() { cancel(idleTimer) },
    beginRequest() {
      if (!requests.size) feedback = null
      cancel(feedbackTimer)
      const id = Symbol('mascot-request')
      requests.add(id)
      publish()
      return id
    },
    finishRequest(id, outcome = null) {
      if (!requests.delete(id)) return
      if (outcome === 'error' || (outcome === 'exito' && feedback !== 'error')) feedback = outcome
      expireFeedback()
      publish()
    },
    react(state) {
      if (!['login', 'exito', 'error'].includes(state)) return
      feedback = state
      expireFeedback()
      publish()
    },
    reset() {
      cancel(idleTimer)
      cancel(feedbackTimer)
      requests.clear()
      feedback = null
      idle = false
      publish()
    },
  }
}

export const mascotController = createMascotController()
