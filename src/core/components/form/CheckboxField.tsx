import React, { useId } from 'react'
import clsx from 'clsx'
import { withAcronimi } from '../Acronimo'

export interface CheckboxFieldProps {
  label?: string
  name: string
  checked?: boolean
  defaultChecked?: boolean
  hint?: string
  error?: string
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label, name, checked, defaultChecked, hint, error,
  disabled = false, onChange, className,
}) => {
  const id = useId()
  return (
    <div className={clsx('flex items-start gap-2', className)}>
      <input
        id={id} name={name} type="checkbox"
        className="sib-checkbox mt-0.5"
        checked={checked} defaultChecked={defaultChecked}
        disabled={disabled} onChange={onChange}
      />
      <div className="flex flex-col gap-0.5">
        {label && <label htmlFor={id} className="text-[13px] font-opensans text-ink cursor-pointer">{withAcronimi(label)}</label>}
        {error && <span className="text-[11px] font-opensans text-error">{error}</span>}
        {!error && hint && <span className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
      </div>
    </div>
  )
}

export default CheckboxField
