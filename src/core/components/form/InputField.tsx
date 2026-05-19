import React, { forwardRef, useState, useId } from 'react'
import clsx from 'clsx'

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'

export interface InputFieldProps {
  label?:        string
  name:          string
  type?:         InputType
  value?:        string | number
  defaultValue?: string | number
  placeholder?:  string
  hint?:         string
  error?:        string
  disabled?:     boolean
  readOnly?:     boolean
  required?:     boolean
  iconLeft?:     string   // FontAwesome class es: 'fa-light fa-envelope'
  iconRight?:    string
  maxLength?:    number
  min?:          number
  max?:          number
  step?:         number
  autoComplete?: string
  onChange?:     (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?:       (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?:      (e: React.FocusEvent<HTMLInputElement>) => void
  className?:    string
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>((
  {
    label, name, type = 'text', value, defaultValue, placeholder,
    hint, error, disabled = false, readOnly = false, required = false,
    iconLeft, iconRight, maxLength, min, max, step, autoComplete,
    onChange, onBlur, onFocus, className,
  },
  ref
) => {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPassword ? 'text' : 'password') : type

  const hasIcon = iconLeft || iconRight || isPassword

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
      <div className="relative flex items-center">
        {iconLeft && (
          <i className={clsx(iconLeft, 'absolute left-3 text-[13px] text-ink-subtle pointer-events-none')} aria-hidden="true" />
        )}
        <input
          ref={ref}
          id={id}
          name={name}
          type={inputType}
          className={clsx(
            'sib-input',
            error && 'sib-input--error',
            iconLeft && 'pl-9',
            (iconRight || isPassword) && 'pr-9',
          )}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          title={value != null ? String(value) : undefined}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 text-[13px] text-ink-subtle cursor-pointer"
          >
            <i className={`fa-light ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
          </button>
        ) : iconRight ? (
          <i className={clsx(iconRight, 'absolute right-3 text-[13px] text-ink-subtle pointer-events-none')} aria-hidden="true" />
        ) : null}
      </div>
      {error  && <span id={`${id}-error`} className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
})

InputField.displayName = 'InputField'
export default InputField
