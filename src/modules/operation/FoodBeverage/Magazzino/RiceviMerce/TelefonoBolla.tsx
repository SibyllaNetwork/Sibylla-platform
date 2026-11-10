// ─── Ricevi merce › Da bolla: "Fotografa col telefono" ───────────────────────
//  § 8.13 della scheda 17. Dal computer senza fotocamera: `bolla_telefono_apri`
//  dà un indirizzo di Op da mostrare come QR (scade dopo 15 minuti); il
//  telefono lo apre, scatta fino a 3 foto e le invia. La pagina chiede
//  `bolla_telefono_stato` ogni 2 secondi; con "inviata" le foto arrivano (una
//  sola volta) e si aggiungono alle pagine della bolla. Il codice è segreto:
//  non si mostra come testo e non si scrive nei log.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import Modal from '../../../../../core/components/Modal'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { FileBolla } from '../api/tipi'
import { MagCorpo, MagErrore } from '../comune/MagModale'
import './TelefonoBolla.sass'

const OGNI_MS = 2000

interface Props {
  open: boolean
  idStruttura: number
  onClose: () => void
  onFoto: (file: FileBolla[]) => void
}

type Fase = 'apro' | 'attesa' | 'arrivate' | 'scaduta'

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function TelefonoBolla({ open, idStruttura, onClose, onFoto }: Props) {
  const [fase, setFase] = useState<Fase>('apro')
  const [qr, setQr] = useState<string | null>(null)
  const [scade, setScade] = useState(0)
  const [ora, setOra] = useState(Date.now())
  const [errore, setErrore] = useState<string | null>(null)
  const [arrivate, setArrivate] = useState(0)
  const codice = useRef<string | null>(null)
  const onFotoRef = useRef(onFoto)
  onFotoRef.current = onFoto
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const apri = useCallback(async () => {
    setFase('apro'); setErrore(null); setQr(null); codice.current = null
    try {
      const p = await eseguiMag('bolla_telefono_apri', { id_struttura: idStruttura })
      codice.current = p.codice
      setScade(new Date(p.scade_il).getTime())
      setQr(await QRCode.toDataURL(p.url, { width: 560, margin: 1, errorCorrectionLevel: 'M' }))
      setFase('attesa')
    } catch (e) { setErrore(messaggioErrore(e)) }
  }, [idStruttura])

  useEffect(() => {
    if (open) apri()
    else { codice.current = null; setQr(null) }
  }, [open, apri])

  // Conto alla rovescia e controllo dello stato ogni 2 secondi finché il QR è visibile.
  useEffect(() => {
    if (!open || fase !== 'attesa') return
    let fermo = false
    const orologio = setInterval(() => setOra(Date.now()), 1000)
    const controlla = async () => {
      const c = codice.current
      if (!c || fermo) return
      try {
        const s = await eseguiMag('bolla_telefono_stato', { codice: c })
        if (fermo) return
        if (s.stato === 'inviata') {
          setArrivate(s.file.length)
          setFase('arrivate')
          onFotoRef.current(s.file)
          setTimeout(() => onCloseRef.current(), 1600)
          return
        }
        if (s.stato === 'scaduta' || s.stato === 'ritirata') { setFase('scaduta'); return }
      } catch (e) { setErrore(messaggioErrore(e)) }
      if (!fermo) timer = setTimeout(controlla, OGNI_MS)
    }
    let timer = setTimeout(controlla, OGNI_MS)
    return () => { fermo = true; clearInterval(orologio); clearTimeout(timer) }
  }, [open, fase])

  const resta = scade - ora
  useEffect(() => { if (fase === 'attesa' && scade && resta <= 0) setFase('scaduta') }, [fase, scade, resta])

  return (
    <Modal open={open} onClose={onClose} title="Fotografa la bolla col telefono" size="lg">
      <MagCorpo className="magtel">
        <MagErrore testo={errore} />
        {fase === 'arrivate' ? (
          <div className="magtel__ok" role="status">
            <span className="magtel__ok-ico" aria-hidden="true"><i className="fa-solid fa-check" /></span>
            <strong>Foto arrivate dal telefono</strong>
            <span className="magpag__nota">{arrivate === 1 ? '1 pagina aggiunta alla bolla' : `${arrivate} pagine aggiunte alla bolla`}</span>
          </div>
        ) : (
          <div className="magtel__corpo">
            <div className={`magtel__qr ${fase === 'scaduta' ? 'is-scaduto' : ''}`}>
              {qr ? <img src={qr} alt="QR per fotografare la bolla col telefono" className="magtel__qr-img" /> : <span className="magtel__qr-attesa"><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /></span>}
              {fase === 'scaduta' && (
                <button type="button" className="sib-btn sib-btn--primary magtel__nuovo" onClick={apri}>
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Nuovo QR
                </button>
              )}
            </div>
            <div className="magtel__testo">
              <p className="magtel__tit">Inquadra il QR con la fotocamera del telefono</p>
              <ol className="magtel__passi">
                <li>Si apre una pagina di Sibylla, senza accedere</li>
                <li>Scatta fino a 3 foto della bolla o sceglile dalla galleria</li>
                <li>Tocca “Invia al computer”: le pagine compaiono qui</li>
              </ol>
              {fase === 'attesa' && (
                <p className="magtel__stato">
                  <span className="magtel__pulsa" aria-hidden="true" /> In attesa delle foto · il QR scade tra <strong>{mmss(resta)}</strong>
                </p>
              )}
              {fase === 'scaduta' && <p className="magtel__stato magtel__stato--off"><i className="fa-solid fa-clock" aria-hidden="true" /> QR scaduto: creane uno nuovo.</p>}
            </div>
          </div>
        )}
        <footer className="magtel__piede">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </footer>
      </MagCorpo>
    </Modal>
  )
}
