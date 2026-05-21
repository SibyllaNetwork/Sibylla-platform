import React, { useId } from 'react'

export type SelectSize = 'standard' | 'dense'

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps {
  label?: string
  hint?: string
  error?: string
  size?: SelectSize
  options: SelectOption[]
  value?: string | number
  defaultValue?: string | number
  placeholder?: string
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void
  name?: string
  className?: string
}

const sizeClasses: Record<SelectSize, string> = {
  standard: 'h-10 pl-3 pr-9 text-sm border-2',
  dense:    'h-[30px] pl-2.5 pr-[30px] text-[13px] border-[1px]',
}

export default function Select({
  label,
  hint,
  error,
  size = 'standard',
  options,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  onChange,
  onBlur,
  name,
  className = '',
}: SelectProps) {
  const id = useId()

  const selectCls = [
    'w-full font-opensans font-normal text-ink bg-white rounded-field outline-none appearance-none cursor-pointer box-border transition-[border-color] duration-150 ease-in-out',
    'border-[#CFCFCF]',
    'hover:enabled:border-[#BBBDBF]',
    'focus:enabled:border-ink',
    'disabled:text-line disabled:border-[#CFCFCF] disabled:bg-white disabled:cursor-not-allowed',
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
        <select
          id={id}
          name={name}
          className={selectCls}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {/* Chevron custom — sovrascrive quello nativo */}
        <i className={`fa-regular fa-angle-down absolute right-2.5 text-[13px] pointer-events-none ${disabled ? 'text-line' : 'text-ink'}`} aria-hidden="true" />
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
