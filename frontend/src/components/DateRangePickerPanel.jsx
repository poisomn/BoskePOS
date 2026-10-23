import { useId, useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { CalendarDays } from 'lucide-react'
import { Calendar } from './ui/calendar'
import { businessToday, calendarDate, datePresets, dateValue, displayDate, rangeDays, rangeError } from '../utils/dateRanges'

export default function DateRangePicker({ from = '', to = '', onChange, maxDays, clearable = false, disabled = false, label = 'Período' }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from, to })
  const [month, setMonth] = useState(() => calendarDate(from || businessToday()))
  const id = useId()
  const error = rangeError(draft.from, draft.to, maxDays)
  function changeOpen(next) {
    if (next) { setDraft({ from, to }); setMonth(calendarDate(from || businessToday())) }
    setOpen(next)
  }
  function apply() { if (!error) { onChange({ from: draft.from, to: draft.to }); setOpen(false) } }
  return <div className="date-range-field"><span className="field-label">{label}</span><Popover.Root open={open} onOpenChange={changeOpen}>
    <Popover.Trigger type="button" disabled={disabled} className="input date-range-trigger" aria-label={`${label}: ${from && to ? `${displayDate(from)} al ${displayDate(to)}` : 'Seleccionar fechas'}`}><CalendarDays size={17} /><span>{from && to ? `${displayDate(from)} — ${displayDate(to)}` : 'Seleccionar fechas'}</span></Popover.Trigger>
    <Popover.Portal><Popover.Positioner sideOffset={8} align="end" className="date-range-positioner"><Popover.Popup className="date-range-popup">
      <Popover.Title className="date-range-title">Selecciona un período</Popover.Title><Popover.Description className="date-range-description">Hora de Chile · {maxDays ? `hasta ${maxDays} días` : 'elige inicio y fin'}</Popover.Description>
      <div className="date-range-presets">{datePresets().map(([name, start, end]) => <button type="button" key={name} aria-pressed={draft.from === start && draft.to === end} onClick={() => { setDraft({ from: start, to: end }); setMonth(calendarDate(start)) }}>{name}</button>)}</div>
      <Calendar mode="range" month={month} onMonthChange={setMonth} selected={{ from: calendarDate(draft.from), to: calendarDate(draft.to) }} onSelect={range => setDraft({ from: dateValue(range?.from), to: dateValue(range?.to) })} />
      <div className="date-range-inputs">{[['from', 'Desde'], ['to', 'Hasta']].map(([key, title]) => <label key={key}><span>{title}</span><input aria-label={`${title} (AAAA-MM-DD)`} placeholder="AAAA-MM-DD" inputMode="numeric" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} aria-describedby={id} /></label>)}</div>
      <p id={id} className={error ? 'date-range-error' : 'date-range-description'} role="status">{error || `${rangeDays(draft.from, draft.to)} ${rangeDays(draft.from, draft.to) === 1 ? 'día seleccionado' : 'días seleccionados'} · ${displayDate(draft.from)} al ${displayDate(draft.to)}`}</p>
      <div className="date-range-footer">{clearable && <button type="button" onClick={() => { onChange({ from: '', to: '' }); setOpen(false) }}>Limpiar filtro</button>}<Popover.Close type="button">Cancelar</Popover.Close><button type="button" className="date-range-apply" disabled={!!error} onClick={apply}>Aplicar período</button></div>
    </Popover.Popup></Popover.Positioner></Popover.Portal>
  </Popover.Root></div>
}
