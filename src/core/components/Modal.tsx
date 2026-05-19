import React, { useEffect } from 'react'
import Ico from '../icons/Ico'

interface Props {
  open     : boolean
  onClose  : () => void
  title?   : string
  children : React.ReactNode
  size?    : 'sm' | 'md' | 'lg' | 'xl'
}

function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal__overlay">
      <div className="modal__backdrop" onClick={onClose} />
      <div className={`modal__box modal__box--${size}`}>
        {title && (
          <div className="modal__header">
            <h2 className="modal__title">{title}</h2>
            <button className="modal__close" onClick={onClose}>
              <Ico n="x" s={18} c="currentColor" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default Modal
