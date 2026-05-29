import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
export type ButtonSize = 'lg' | 'md' | 'sm'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: string            // nome icona FA (es. "plus", "trash") — reso con fa-light
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  className?: string
  title?: string
  fullWidth?: boolean
}

// Wrapper ergonomico sopra la classe canonica `.sib-btn` (unica fonte di verità
// per lo stile dei bottoni — vedi src/tailwind.css). Mantiene retro-compatibilità
// con l'API esistente (variant/size/loading/icon).
const VARIANT: Record<ButtonVariant, string> = {
  primary:   'sib-btn--primary',
  secondary: 'sib-btn--secondary',
  tertiary:  'sib-btn--ghost',
}
const SIZE: Record<ButtonSize, string> = {
  lg: 'sib-btn--lg',
  md: '',
  sm: 'sib-btn--sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled = false,
  onClick,
  children,
  type = 'button',
  className = '',
  title,
  fullWidth = false,
}: ButtonProps) {
  const classes = [
    'sib-btn',
    VARIANT[variant],
    SIZE[size],
    loading ? 'sib-btn--loading' : '',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ')

  const iconEl = icon ? <i className={`fa-light fa-${icon}`} aria-hidden="true" /> : null

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      aria-busy={loading}
    >
      {icon && iconPosition === 'left' && iconEl}
      {children}
      {icon && iconPosition === 'right' && iconEl}
    </button>
  )
}
