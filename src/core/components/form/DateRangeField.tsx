import React, { useId, useRef } from 'react'
import clsx from 'clsx'

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

const DateRangeField: React.FC<DateRangeFieldProps> = ({
  label, nameFrom, nameTo, valueFrom, valueTo,
  defaultFrom, defaultTo, hint, error,
  disabled = false, required = false,
  min, max, onChangeFrom, onChangeTo, className,
}) => {
  const id = useId()
  const fromRef = useRef<HTMLInputElement>(null)

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-[11px] font-semibold font-opensans text-ink">
          {label}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <div
        className={clsx(
          'sib-input inline-flex items-center w-auto gap-0.5 px-1.5 cursor-pointer',
          error && 'sib-input--error',
        )}
        onClick={() => fromRef.current?.showPicker?.()}
      >
        <i className="fa-duotone fa-calendar text-[10px] text-ink-subtle shrink-0" aria-hidden="true"/>
        <input
          ref={fromRef}
          id={nameFrom}
          name={nameFrom}
          type="date"
          className="sib-date-range-inner"
          value={valueFrom}
          defaultValue={defaultFrom}
          disabled={disabled}
          required={required}
          min={min}
          max={valueTo || max}
          onChange={onChangeFrom}
        />
        <span className="text-ink-subtle text-[10px] select-none leading-none">–</span>
        <input
          id={nameTo}
          name={nameTo}
          type="date"
          className="sib-date-range-inner"
          value={valueTo}
          defaultValue={defaultTo}
          disabled={disabled}
          required={required}
          min={valueFrom || min}
          max={max}
          onChange={onChangeTo}
        />
      </div>
      {error  && <span id={`${id}-error`} className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
}

export default DateRangeField
