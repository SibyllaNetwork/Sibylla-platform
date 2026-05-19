import React from 'react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

const ICONS: Record<AlertType, string> = {
  success: 'fa-check',
  error:   'fa-circle-exclamation',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
}

interface AlertBannerProps {
  type?: AlertType
  children: React.ReactNode
  className?: string
}

const AlertBanner: React.FC<AlertBannerProps> = ({ type = 'success', children, className = '' }) => (
  <div className={`alert-banner alert-banner--${type} ${className}`}>
    <i className={`fa-duotone ${ICONS[type]}`} style={{ fontSize: 16 }} aria-hidden="true" />
    {children}
  </div>
)

export default AlertBanner
