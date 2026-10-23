import { lazy, Suspense } from 'react'
const Picker = lazy(() => import('./DateRangePickerPanel'))
export default function DateRangePicker(props) {
  return <Suspense fallback={<div><span className="field-label">{props.label || 'Período'}</span><button disabled type="button" className="input">Cargando calendario…</button></div>}><Picker {...props} /></Suspense>
}
