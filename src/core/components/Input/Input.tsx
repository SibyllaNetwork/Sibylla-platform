import React, { useId } from 'react'

export type InputSize = 'standard' | 'dense'

interface InputProps {
  label?: string
  hint?: string
  error?: string
  size?: InputSize
  icon?: string            // nome icona FA — mostrata a destra
  disabled?: boolean
  placeholder?: string
  value?: string
  defaultValue?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'search' | 'url'
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  name?: string
  autoComplete?: string
  readOnly?: boolean
  className?: string
}

const sizeClasses: Record<InputSize, string> = {
  standard: 'h-10 px-3 pr-9 text-sm border-2',
  dense:    'h-[30px] px-2.5 pr-[30px] text-[13px] border-[1px]',
}

export default function Input({
  label,
  hint,
  error,
  size = 'standard',
  icon,
  disabled = false,
  placeholder,
  value,
  defaultValue,
  type = 'text',
  onChange,
  onBlur,
  onFocus,
  name,
  autoComplete,
  readOnly = false,
  className = '',
}: InputProps) {
  const id = useId()

  const inputCls = [
    'w-full font-opensans font-normal text-ink bg-white rounded-field outline-none box-border transition-[border-color] duration-150 ease-in-out',
    'border-[#CFCFCF]',
    'placeholder:text-ink-muted placeholder:font-normal',
    'hover:enabled:not(:read-only):border-[#BBBDBF]',
    'focus:enabled:border-ink',
    'disabled:text-line disabled:border-[#CFCFCF] disabled:bg-white disabled:cursor-not-allowed disabled:placeholder:text-line',
    sizeClasses[size],
    error ? 'border-error focus:border-error' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label className="font-opensans text-xs font-semibold text-ink leading-[1.4]" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          name={name}
          type={type}
          className={inputCls}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {icon && (
          <i
            className={`fa-duotone fa-${icon} absolute right-2.5 text-sm pointer-events-none ${disabled ? 'text-line' : 'text-ink'}`}
            aria-hidden="true"
          />
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="font-opensans text-[11px] font-normal text-error leading-[1.3]">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className="font-opensans text-[11px] font-normal text-ink-muted leading-[1.3]">
          {hint}
        </span>
      )}
    </div>
  )
}
