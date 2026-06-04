import React, { useRef, useState } from 'react'
import Modal from './Modal'
import { avatarUrl, avatarIds } from '../avatar'
import './AvatarPicker.sass'

interface Props {
  open: boolean
  onClose: () => void
  value?: string               // id avatar o foto (data URL) attualmente selezionato
  onSelect: (value: string) => void
  allowUpload?: boolean        // se true mostra il caricamento di una foto/immagine
}

const MAX_BYTES = 2 * 1024 * 1024   // 2 MB
const isUploaded = (v?: string): boolean => !!v && /^(data:|blob:|https?:)/.test(v)

export default function AvatarPicker({ open, onClose, value, onSelect, allowUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''   // permette di ricaricare lo stesso file
    if (!file) return
    if (!file.type.startsWith('image/')) { setUploadError('Seleziona un file immagine.'); return }
    if (file.size > MAX_BYTES)           { setUploadError('Immagine troppo grande (max 2MB).'); return }
    setUploadError('')
    const reader = new FileReader()
    reader.onload = () => {
      onSelect(String(reader.result))
      onClose()
    }
    reader.readAsDataURL(file)
  }

  return (
    <Modal open={open} onClose={onClose} title="Scegli avatar" size="md">
      <p className="avatar-picker__hint">Seleziona un avatar oppure carica una tua foto. Viene salvato solo il riferimento.</p>

      {allowUpload && (
        <div className="avatar-picker__upload">
          {isUploaded(value) && (
            <img className="avatar-picker__upload-preview" src={value} alt="Foto caricata" />
          )}
          <button
            type="button"
            className="sib-btn sib-btn--secondary avatar-picker__upload-btn"
            onClick={() => fileRef.current?.click()}>
            <i className="fa-light fa-arrow-up-from-bracket" aria-hidden="true" />
            {isUploaded(value) ? 'Cambia foto' : 'Carica una foto'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="avatar-picker__file"
            onChange={handleFile}
          />
          {uploadError && <span className="avatar-picker__upload-error">{uploadError}</span>}
        </div>
      )}

      <div className="avatar-picker__grid">
        {avatarIds.map(id => (
          <button
            key={id}
            type="button"
            className={`avatar-picker__item ${value === id ? 'avatar-picker__item--on' : ''}`}
            onClick={() => { onSelect(id); onClose() }}>
            <img src={avatarUrl(id)} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </Modal>
  )
}
