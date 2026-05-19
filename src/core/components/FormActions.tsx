import React from 'react'

interface FormActionsProps {
  onCancel?: () => void
  onConfirm?: () => void
  cancelLabel?: string
  confirmLabel?: string
  confirmIcon?: string
  confirmDisabled?: boolean
  children?: React.ReactNode
  className?: string
}

const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  onConfirm,
  cancelLabel = 'Annulla',
  confirmLabel = 'Salva',
  confirmIcon = 'fa-check',
  confirmDisabled = false,
  children,
  className = '',
}) => (
  <div className={`form-actions ${className}`}>
    {children ?? (
      <>
        {onCancel && (
          <button className="sib-btn sib-btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
        {onConfirm && (
          <button className="sib-btn sib-btn--primary" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmIcon && <i className={`fa-duotone ${confirmIcon}`} style={{ fontSize: 14, color: '#fff' }} aria-hidden="true" />}
            {confirmLabel}
          </button>
        )}
      </>
    )}
  </div>
)

export default FormActions
