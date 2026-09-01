import React, { forwardRef, useId } from 'react'
import clsx from 'clsx'
import { withAcronimi } from '../Acronimo'

export interface TextareaFieldProps {
  label?: string
  name: string
  value?: string
  defaultValue?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
  rows?: number
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  className?: string
}

const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>((
  { label, name, value, defaultValue, placeholder, hint, error,
    disabled = false, required = false, rows = 4, onChange, onBlur, className },
  ref
) => {
  const id = useId()
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold font-poppins text-primary">
          {withAcronimi(label)}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref} id={id} name={name} rows={rows}
        className={clsx(
          'sib-input h-auto py-2 resize-y min-h-[80px]',
          error && 'sib-input--error',
        )}
        value={value} defaultValue={defaultValue} placeholder={placeholder}
        disabled={disabled} required={required}
        onChange={onChange} onBlur={onBlur}
      />
      {error && <span className="text-[11px] font-opensans text-error">{error}</span>}
      {!error && hint && <span className="text-[11px] font-opensans text-ink-muted">{hint}</span>}
    </div>
  )
})

TextareaField.displayName = 'TextareaField'
export default TextareaField
