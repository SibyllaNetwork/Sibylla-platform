import React from 'react'
import { useToastStore, ToastVariant } from './useToast'
import './Toast.sass'

const ICON: Record<ToastVariant, string> = {
  success: 'circle-check',
  error:   'circle-xmark',
  warning: 'triangle-exclamation',
  info:    'circle-info',
}

/**
 * Contenitore globale dei toast. Montare una sola volta a root (App.tsx).
 * I toast si pilotano via l'API `toast` in useToast.ts.
 */
const Toaster: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="region" aria-live="polite" aria-label="Notifiche">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.variant}`} role="status">
          <i className={`fa-light fa-${ICON[t.variant]} toast__icon`} aria-hidden="true" />
          <div className="toast__body">
            {t.title && <div className="toast__title">{t.title}</div>}
            <div className="toast__msg">{t.message}</div>
          </div>
          <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Chiudi">
            <i className="fa-light fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default Toaster
