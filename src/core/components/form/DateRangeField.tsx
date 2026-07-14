import React from 'react'
import clsx from 'clsx'
import { DateRangePicker, CustomProvider } from 'rsuite'
import itIT from 'rsuite/locales/it_IT'
import { format, parseISO, isValid } from 'date-fns'
import 'rsuite/dist/rsuite-no-reset.min.css'
import './DateRangeField.sass'

export interface DateRangeFieldProps {
  label?:        string
  nameFrom:      string
  nameTo:        string
  valueFrom?:    string
  valueTo?:      string
  defaultFrom?:  string
  defaultTo?:    string
  hint?:         string
  error?:        string
  disabled?:     boolean
  required?:     boolean
  min?:          string
  max?:          string
  onChangeFrom?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onChangeTo?:   (e: React.ChangeEvent<HTMLInputElement>) => void
  onChange?:     (from: Date | null, to: Date | null) => void
  className?:    string
}

// Icona calendario (caret a destra) con FontAwesome.
const CalendarCaret = ({ className, ...rest }: { className?: string }) => (
  <i className={`fa-regular fa-calendar ${className ?? ''}`} aria-hidden="true" {...rest} />
)

// Parse difensivo: null se non è una data ISO valida.
const safeParseISO = (s?: string): Date | null => {
  if (!s) return null
  const d = parseISO(s)
  return isValid(d) ? d : null
}

// Standard di piattaforma per gli intervalli di date: RSuite DateRangePicker
// (due calendari affiancati, selezione fluida con anteprima). API invariata: i
// consumer continuano a usare valueFrom/valueTo + onChangeFrom/onChangeTo
// (ricevono un evento sintetico con target.value in formato ISO yyyy-MM-dd).
const DateRangeField: React.FC<DateRangeFieldProps> = ({
  label, nameFrom, nameTo, valueFrom, valueTo,
  defaultFrom, defaultTo, hint, error,
  disabled = false, required = false,
  min, max, onChangeFrom, onChangeTo, onChange, className,
}) => {
  const from = safeParseISO(valueFrom ?? defaultFrom)
  const to   = safeParseISO(valueTo ?? defaultTo)
  const value: [Date, Date] | null = from && to ? [from, to] : null

  const minD = safeParseISO(min)
  const maxD = safeParseISO(max)
  const shouldDisableDate = (minD || maxD)
    ? (d: Date) => (!!minD && d < minD) || (!!maxD && d > maxD)
    : undefined

  const emit = (h: ((e: React.ChangeEvent<HTMLInputElement>) => void) | undefined, v: string, name: string) =>
    h?.({ target: { value: v, name } } as unknown as React.ChangeEvent<HTMLInputElement>)

  const handleChange = (range: [Date, Date] | null) => {
    const f = range?.[0] ?? null
    const t = range?.[1] ?? null
    emit(onChangeFrom, f ? format(f, 'yyyy-MM-dd') : '', nameFrom)
    emit(onChangeTo,   t ? format(t, 'yyyy-MM-dd') : '', nameTo)
    onChange?.(f, t)
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-[12px] font-semibold font-poppins text-primary">
          {label}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <CustomProvider locale={itIT}>
        <DateRangePicker
          value={value}
          onChange={handleChange as (v: [Date, Date] | null) => void}
          format="dd/MM/yyyy"
          character=" – "
          caretAs={CalendarCaret}
          isoWeek
          ranges={[]}
          cleanable={false}
          disabled={disabled}
          placeholder="Seleziona periodo"
          placement="bottomStart"
          shouldDisableDate={shouldDisableDate}
          className={clsx('sib-daterange', error && 'sib-daterange--error')}
        />
      </CustomProvider>
      {error  && <span className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}
      {!error && hint && <span className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
}

export default DateRangeField
