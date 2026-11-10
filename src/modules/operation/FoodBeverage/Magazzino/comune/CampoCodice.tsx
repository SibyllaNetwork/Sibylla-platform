// ─── Magazzino ristorazione: campo per il codice a barre ─────────────────────
//  Riceve l'input del lettore USB (che "scrive" il codice e preme Invio) e,
//  con il pulsante fotocamera, legge il codice dalla webcam o dal telefono con
//  zxing (caricato solo quando serve).

import React, { useEffect, useRef, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import { SearchField } from '../../../../../core/components/form'
import './CampoCodice.sass'

interface Props {
  onCodice: (codice: string) => void
  placeholder?: string
  /** Il campo resta a fuoco, pronto per la prossima lettura del lettore USB. */
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

export default function CampoCodice({ onCodice, placeholder = 'Leggi o scrivi il codice a barre e premi Invio', autoFocus, disabled, className }: Props) {
  const [valore, setValore] = useState('')
  const [fotocamera, setFotocamera] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])

  const invia = (v: string) => {
    const c = v.trim()
    if (!c) return
    onCodice(c)
    setValore('')
    ref.current?.focus()
  }

  return (
    <div className={`magcod ${className ?? ''}`}>
      <SearchField
        ref={ref} name="mag-codice" className="magcod__campo" placeholder={placeholder} disabled={disabled}
        value={valore} onChange={e => setValore(e.target.value)} onSearch={invia} onClear={() => setValore('')}
      />
      <Tooltip text="Leggi con la fotocamera">
        <button type="button" className="sib-btn sib-btn--icon magcod__cam" disabled={disabled} onClick={() => setFotocamera(true)} aria-label="Leggi con la fotocamera">
          <i className="fa-regular fa-camera" aria-hidden="true" />
        </button>
      </Tooltip>
      <ScannerFotocamera open={fotocamera} onClose={() => setFotocamera(false)} onCodice={c => { setFotocamera(false); invia(c) }} />
    </div>
  )
}

/** Lettura del codice con la fotocamera (zxing). Si chiude alla prima lettura. */
export function ScannerFotocamera({ open, onClose, onCodice }: { open: boolean; onClose: () => void; onCodice: (c: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const onCodiceRef = useRef(onCodice)
  onCodiceRef.current = onCodice

  useEffect(() => {
    if (!open) return
    let fermo = false
    let controlli: { stop: () => void } | null = null
    setErrore(null)
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (fermo || !video.current) return
        const lettore = new BrowserMultiFormatReader()
        controlli = await lettore.decodeFromVideoDevice(undefined, video.current, (risultato, _err, c) => {
          if (risultato && !fermo) {
            fermo = true
            c.stop()
            onCodiceRef.current(risultato.getText())
          }
        })
        if (fermo) controlli.stop()
      } catch {
        if (!fermo) setErrore('Fotocamera non disponibile: consenti l’accesso alla fotocamera nel browser o usa il lettore.')
      }
    })()
    return () => { fermo = true; controlli?.stop() }
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Leggi il codice a barre" size="md">
      <div className="magcod-cam">
        {errore
          ? <p className="magcod-cam__errore"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {errore}</p>
          : <video ref={video} className="magcod-cam__video" muted playsInline />}
        <p className="magcod-cam__nota">Inquadra il codice a barre: la lettura è automatica.</p>
        <footer className="magcod-cam__foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </footer>
      </div>
    </Modal>
  )
}
