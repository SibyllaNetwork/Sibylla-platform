import React, { useId, useState } from 'react'
import clsx from 'clsx'
import { DayPicker, type DateRange } from 'react-day-picker'
import { it } from 'date-fns/locale'
import { format, parseISO, isValid } from 'date-fns'
import 'react-day-picker/dist/style.css'
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
  onChange?:      (from: Date | null, to: Date | null) => void
  className?:    string
}

// Parse difensivo: ritorna null se la stringa non è una data ISO valida
// (es. dd/MM/yyyy o vuota) invece di produrre una Date "Invalid" che farebbe
// crashare format() con "RangeError: Invalid time value".
const safeParseISO = (s?: string): Date | null => {
  if (!s) return null
  const d = parseISO(s)
  return isValid(d) ? d : null
}

const fmtIt = (s?: string) => {
  const d = safeParseISO(s)
  return d ? format(d, 'dd/MM/yyyy') : ''
}

// Standard di piattaforma per gli intervalli di date: un unico Date Range Picker
// con due calendari affiancati (react-day-picker). API invariata rispetto alla
// versione a due input: i consumer continuano a usare valueFrom/valueTo +
// onChangeFrom/onChangeTo (riceveranno un evento sintetico con target.value).
const DateRangeField: React.FC<DateRangeFieldProps> = ({
  label, nameFrom, nameTo, valueFrom, valueTo,
  defaultFrom, defaultTo, hint, error,
  disabled = false, required = false,
  min, max, onChangeFrom, onChangeTo, onChange, className,
}) => {
  const id = useId()
  const [open, setOpen] = useState(false)

  const from = valueFrom ?? defaultFrom ?? ''
  const to   = valueTo   ?? defaultTo   ?? ''
  const fromDate = safeParseISO(from)
  const toDate   = safeParseISO(to)
  const selected: DateRange | undefined = fromDate ? { from: fromDate, to: toDate ?? undefined } : undefined

  const emit = (h: ((e: React.ChangeEvent<HTMLInputElement>) => void) | undefined, value: string, name: string) =>
    h?.({ target: { value, name } } as unknown as React.ChangeEvent<HTMLInputElement>)

  const handleSelect = (r: DateRange | undefined) => {
    emit(onChangeFrom, r?.from ? format(r.from, 'yyyy-MM-dd') : '', nameFrom)
    emit(onChangeTo,   r?.to   ? format(r.to,   'yyyy-MM-dd') : '', nameTo)
    onChange?.(r?.from ?? null, r?.to ?? null)
    if (r?.from && r?.to) setOpen(false)
  }

  const trigLabel = from ? `${fmtIt(from)} – ${to ? fmtIt(to) : '…'}` : 'Seleziona periodo'

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-[12px] font-semibold font-poppins text-primary">
          {label}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <div className="sib-daterange">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={clsx('sib-input inline-flex items-center gap-2 w-auto cursor-pointer', error && 'sib-input--error')}
          onClick={() => !disabled && setOpen(o => !o)}
        >
          <i className="fa-duotone fa-calendar text-[10px] text-ink-subtle shrink-0" aria-hidden="true" />
          <span className="sib-daterange__val">{trigLabel}</span>
          <i className="fa-solid fa-chevron-down text-[9px] text-ink-subtle shrink-0" aria-hidden="true" />
        </button>

        {open && (
          <>
            <div className="sib-daterange__overlay" onClick={() => setOpen(false)} />
            <div className="sib-daterange__pop" role="dialog" aria-label="Seleziona intervallo date" onClick={e => e.stopPropagation()}>
              <DayPicker
                mode="range"
                numberOfMonths={2}
                pagedNavigation
                weekStartsOn={1}
                locale={it}
                selected={selected}
                onSelect={handleSelect}
                defaultMonth={selected?.from}
                fromDate={safeParseISO(min) ?? undefined}
                toDate={safeParseISO(max) ?? undefined}
              />
            </div>
          </>
        )}
      </div>
      {error  && <span id={`${id}-error`} className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
}

export default DateRangeField
