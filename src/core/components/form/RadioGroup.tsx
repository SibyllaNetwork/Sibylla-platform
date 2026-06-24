import React, { useId } from 'react'
import clsx from 'clsx'

interface RadioOption {
  value: string
  label: string
  disabled?: boolean
}

export interface RadioGroupProps {
  label?: string
  name: string
  options: RadioOption[]
  value?: string
  hint?: string
  error?: string
  disabled?: boolean
  onChange?: (value: string) => void
  className?: string
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  label, name, options, value, hint, error,
  disabled = false, onChange, className,
}) => {
  const id = useId()
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && <span className="text-[12px] font-semibold font-poppins text-primary">{label}</span>}
      <div className="flex items-center gap-4 h-9">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-[13px] font-opensans text-ink">
            <input
              type="radio" name={name}
              className="sib-radio"
              value={opt.value}
              checked={value === opt.value}
              disabled={disabled || opt.disabled}
              onChange={() => onChange?.(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && <span id={`${id}-error`} className="text-[11px] font-opensans text-error">{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
}

export default RadioGroup
