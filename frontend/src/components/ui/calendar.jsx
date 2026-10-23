import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { BUSINESS_TIME_ZONE, calendarDate, businessToday } from '../../utils/dateRanges'
import 'react-day-picker/style.css'
import './calendar.css'

// Shared DayPicker foundation from the supplied shadcn Calendar documentation.
export function Calendar({ className = '', ...props }) {
  return <DayPicker locale={es} weekStartsOn={1} timeZone={BUSINESS_TIME_ZONE}
    today={calendarDate(businessToday())} showOutsideDays captionLayout="dropdown"
    labels={{ labelNav: () => 'Navegación del calendario', labelPrevious: () => 'Mes anterior', labelNext: () => 'Mes siguiente', labelMonthDropdown: () => 'Elegir mes', labelYearDropdown: () => 'Elegir año', labelDayButton: (date, modifiers) => `${new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: BUSINESS_TIME_ZONE }).format(date)}${modifiers.today ? ', hoy' : ''}${modifiers.selected ? ', seleccionado' : ''}` }}
    startMonth={calendarDate('2000-01-01')} endMonth={calendarDate('2100-12-01')}
    className={`boske-calendar ${className}`} {...props} />
}
