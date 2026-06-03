import React from 'react'
import Modal from './Modal'
import { avatarUrl, avatarVariants } from '../avatar'
import './AvatarPicker.sass'

interface Props {
  open: boolean
  onClose: () => void
  base: string                 // base del seed (di norma il nome del profilo)
  value?: string               // seed attualmente selezionato
  onSelect: (seed: string) => void
}

export default function AvatarPicker({ open, onClose, base, value, onSelect }: Props) {
  const variants = avatarVariants(base, 12)
  const current = value ?? base

  return (
    <Modal open={open} onClose={onClose} title="Scegli avatar" size="md">
      <p className="avatar-picker__hint">Seleziona una variante. Viene salvato solo il riferimento (seed), non l'immagine.</p>
      <div className="avatar-picker__grid">
        {variants.map(seed => (
          <button
            key={seed}
            type="button"
            className={`avatar-picker__item ${current === seed ? 'avatar-picker__item--on' : ''}`}
            onClick={() => { onSelect(seed); onClose() }}>
            <img src={avatarUrl(seed)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
