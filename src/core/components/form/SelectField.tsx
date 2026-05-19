import React, { forwardRef, useId } from 'react'
import clsx from 'clsx'

export interface SelectOption {
  value:     string | number
  label:     string
  disabled?: boolean
}

export interface SelectFieldProps {
  label?:        string
  name:          string
  options:       SelectOption[]
  value?:        string | number
  defaultValue?: string | number
  placeholder?:  string
  hint?:         string
  error?:        string
  disabled?:     boolean
  required?:     boolean
  onChange?:     (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur?:       (e: React.FocusEvent<HTMLSelectElement>) => void
  className?:    string
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>((
  {
    label, name, options, value, defaultValue, placeholder,
    hint, error, disabled = false, required = false,
    onChange, onBlur, className,
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
      <select
        ref={ref}
        id={id}
        name={name}
        className={clsx('sib-select', error && 'sib-input--error')}
        value={value}
        defaultValue={defaultValue ?? ''}
        title={value != null ? options.find(o => String(o.value) === String(value))?.label ?? String(value) : undefined}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error  && <span id={`${id}-error`} className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
})

SelectField.displayName = 'SelectField'
export default SelectField
