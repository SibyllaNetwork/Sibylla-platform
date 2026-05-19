import React from 'react'

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'disabled'

const variants: Record<BadgeVariant, string> = {
  success:  'bg-success-light text-success-dark',
  error:    'bg-error-light text-error-dark',
  warning:  'bg-warning-light text-warning',
  info:     'bg-link-light text-link',
  neutral:  'bg-primary-100 text-primary',
  disabled: 'bg-[#F0F0F0] text-ink-subtle',
}

interface StatusBadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ variant = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold font-opensans ${variants[variant]} ${className}`}>
    {children}
  </span>
)

export default StatusBadge
