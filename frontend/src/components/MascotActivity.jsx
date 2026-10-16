import { useEffect } from 'react'
import { mascotController } from '../lib/mascotController'

export default function MascotActivity() {
  useEffect(() => {
    const events = ['pointermove', 'pointerdown', 'keydown', 'input', 'touchstart', 'scroll']
    const active = () => { if (!document.hidden) mascotController.active() }
    const visibility = () => document.hidden ? mascotController.pauseIdle() : active()
    events.forEach(event => window.addEventListener(event, active, { passive: true, capture: true }))
    window.addEventListener('focus', active)
    document.addEventListener('visibilitychange', visibility)
    active()
    return () => {
      events.forEach(event => window.removeEventListener(event, active, { capture: true }))
      window.removeEventListener('focus', active)
      document.removeEventListener('visibilitychange', visibility)
      mascotController.pauseIdle()
    }
  }, [])
  return null
}
