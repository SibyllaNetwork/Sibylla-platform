import React, { useEffect, useId, useRef } from 'react'
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
  /** Nome accessibile quando non c'è label (es. casella di selezione in tabella). */
  ariaLabel?: string
  /** Stato "parziale" (es. selezione di una parte delle righe). */
  indeterminate?: boolean
}

const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label, name, checked, defaultChecked, hint, error,
  disabled = false, onChange, className, ariaLabel, indeterminate = false,
}) => {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate }, [indeterminate])
  return (
    <div className={clsx('flex items-start gap-2', className)}>
      <input
        ref={ref} id={id} name={name} type="checkbox" aria-label={ariaLabel}
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
