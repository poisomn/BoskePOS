import { useEffect, useRef } from 'react'
import { useMascotState } from '../hooks/useMascotState'

function Mascot({ state, size = 80, temporary = false, className = '' }) {
  const activityState = useMascotState()
  const currentState = state || activityState
  const ref = useRef(null)
  useEffect(() => {
    const mascot = ref.current
    let disposed = false
    // Wait for the component definition if the script loads after React.
    customElements.whenDefined('arbol-mascota').then(() => {
      if (!disposed && temporary) mascot.reproducir(currentState, { ms: 2400, volverA: 'reposo' })
    })
    return () => { disposed = true; clearTimeout(mascot?._to) }
  }, [currentState, temporary])
  return <span className={`mascot ${className}`} aria-hidden="true" data-mascot-state={currentState}><arbol-mascota ref={ref} estado={currentState} size={size} src="/brand/mascot/mascota.png" /></span>
}

export default Mascot
