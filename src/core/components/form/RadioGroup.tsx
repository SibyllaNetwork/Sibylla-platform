import React, { useId } from 'react'
import clsx from 'clsx'
import Tooltip from '../Tooltip'
import { withAcronimi } from '../Acronimo'

interface RadioOption {
  value: string
  label: string
  disabled?: boolean
  /** Testo mostrato all'hover (tooltip scuro standard), utile per spiegare un'opzione disabilitata. */
  tooltip?: string
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
      {label && <span className="text-[12px] font-semibold font-poppins text-primary">{withAcronimi(label)}</span>}
      <div className="flex items-center gap-4 h-9">
        {options.map(opt => {
          const isDisabled = disabled || !!opt.disabled
          const control = (
            <label
              className={clsx(
                'flex items-center gap-1.5 text-[13px] font-opensans',
                isDisabled ? 'cursor-not-allowed text-ink-muted opacity-60' : 'cursor-pointer text-ink',
              )}
            >
              <input
                type="radio" name={name}
                className="sib-radio"
                value={opt.value}
                checked={value === opt.value}
                disabled={isDisabled}
                onChange={() => onChange?.(opt.value)}
              />
              {opt.tooltip ? opt.label : withAcronimi(opt.label)}
            </label>
          )
          return opt.tooltip
            ? <Tooltip key={opt.value} text={opt.tooltip}>{control}</Tooltip>
            : <React.Fragment key={opt.value}>{control}</React.Fragment>
        })}
      </div>
      {error && <span id={`${id}-error`} className="text-[11px] font-opensans text-error">{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
}

export default RadioGroup
