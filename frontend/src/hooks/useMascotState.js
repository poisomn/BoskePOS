import { useSyncExternalStore } from 'react'
import { mascotController } from '../lib/mascotController'

export function useMascotState() {
  return useSyncExternalStore(mascotController.subscribe, mascotController.getSnapshot, mascotController.getServerSnapshot)
}
