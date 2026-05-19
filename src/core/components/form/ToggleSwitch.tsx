import React from 'react'
import clsx from 'clsx'

export interface ToggleSwitchProps {
  label?: string
  description?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label, description, checked = false, disabled = false, onChange, className,
}) => (
  <label className={clsx('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-ink-subtle',
      )}
    >
      <span className={clsx(
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0',
      )} />
    </button>
    {(label || description) && (
      <div className="flex flex-col">
        {label && <span className="text-[13px] font-opensans text-ink font-medium">{label}</span>}
        {description && <span className="text-[11px] font-opensans text-ink-muted">{description}</span>}
      </div>
    )}
  </label>
)

export default ToggleSwitch
