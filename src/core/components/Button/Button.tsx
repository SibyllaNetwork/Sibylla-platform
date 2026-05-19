import React from 'react'
import './Button.sass'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
export type ButtonSize = 'lg' | 'md' | 'sm'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: string            // nome icona FA (es. "plus", "trash") — usa fa-duotone
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  className?: string
  title?: string
  fullWidth?: boolean
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
  const iconSize = size === 'lg' ? 14 : 12

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    loading ? 'btn--loading' : '',
    fullWidth ? 'btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const iconEl = icon ? (
    <i className={`fa-duotone fa-${icon}`} style={{ fontSize: iconSize }} aria-hidden="true" />
  ) : null

  const spinnerEl = (
    <i className="fa-duotone fa-spinner btn__spinner" style={{ fontSize: iconSize }} aria-hidden="true" />
  )

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      aria-busy={loading}
    >
      {loading ? (
        <>
          {spinnerEl}
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && iconEl}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && iconEl}
        </>
      )}
    </button>
  )
}
