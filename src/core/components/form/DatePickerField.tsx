import React, { forwardRef, useId } from 'react'
import clsx from 'clsx'

export type DateFieldType = 'date' | 'datetime-local' | 'time' | 'month' | 'week'

export interface DatePickerFieldProps {
  label?:        string
  name:          string
  type?:         DateFieldType
  value?:        string
  defaultValue?: string
  placeholder?:  string
  hint?:         string
  error?:        string
  disabled?:     boolean
  readOnly?:     boolean
  required?:     boolean
  min?:          string
  max?:          string
  onChange?:     (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?:       (e: React.FocusEvent<HTMLInputElement>) => void
  className?:    string
}

const DatePickerField = forwardRef<HTMLInputElement, DatePickerFieldProps>((
  {
    label, name, type = 'date', value, defaultValue, placeholder,
    hint, error, disabled = false, readOnly = false, required = false,
    min, max, onChange, onBlur, className,
  },
  ref
) => {
  const id = useId()

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] font-semibold font-opensans text-ink"
        >
          {label}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        className={clsx('sib-input', error && 'sib-input--error')}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        min={min}
        max={max}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {error  && <span id={`${id}-error`} className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
})

DatePickerField.displayName = 'DatePickerField'
export default DatePickerField
