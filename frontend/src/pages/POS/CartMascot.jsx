import Mascot from '../../components/Mascot'
import { useMascotState } from '../../hooks/useMascotState'

export default function CartMascot({ error = '', isProcessing = false, compact = false }) {
  const activity = useMascotState()
  const state = error ? 'error' : isProcessing ? 'cargando' : activity
  const messages = {
    reposo: 'Tu próxima venta comienza aquí.',
    login: '¡Bienvenido! Preparemos la próxima venta.',
    cargando: 'Actualizando el carrito…',
    error: 'Revisa el aviso para continuar.',
    exito: '¡Listo! Todo preparado para continuar.',
    inactivo: 'Te espero para la próxima venta.',
  }
  if (compact) return <span title={messages[state]} data-testid="cart-mascot"><Mascot state={state} size={52} /></span>
  return <div className="empty-state pos-cart-empty" data-testid="cart-mascot">
    <Mascot state={state} size={136} />
    <p>{messages[state]}</p>
    <p className="section-note">{error ? 'Corrige el producto o la cantidad indicada para continuar.' : isProcessing ? 'Espera un momento mientras se actualiza la venta.' : 'Escanea o busca un producto para comenzar.'}</p>
  </div>
}
