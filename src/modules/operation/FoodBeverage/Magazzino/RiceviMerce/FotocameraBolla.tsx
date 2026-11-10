// ─── Ricevi merce › Da bolla: scatto dalla fotocamera ────────────────────────
//  Webcam o document camera USB (IPEVO, CZUR… sono UVC: il browser le vede come
//  webcam). Anteprima grande alla risoluzione più alta disponibile, scelta della
//  fotocamera se ce n'è più di una, "Scatta" → JPEG con il lato lungo al massimo
//  3000 px (resta sotto i 5 MB della lettura). Funziona solo in HTTPS o su
//  localhost; senza permesso o senza fotocamera resta il caricamento dei file.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import { SelectField } from '../../../../../core/components/form'
import { MagCorpo, MagPiede } from '../comune/MagModale'
import './FotocameraBolla.sass'

const LATO_MAX = 3000
const QUALITA = 0.85

interface Props {
  open: boolean
  /** Pagine ancora caricabili (massimo 3 per bolla). */
  posti: number
  onClose: () => void
  onScatto: (file: File) => void
}

function messaggioErrore(e: unknown): string {
  const nome = e instanceof DOMException ? e.name : ''
  if (!window.isSecureContext) return 'La fotocamera funziona solo con un collegamento sicuro (HTTPS). Puoi comunque caricare i file della bolla.'
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'Il browser non ha il permesso di usare la fotocamera: consentilo dall’icona nella barra degli indirizzi, oppure carica i file.'
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'Nessuna fotocamera trovata: collega una webcam o una document camera, oppure carica i file.'
  if (nome === 'NotReadableError') return 'La fotocamera è usata da un’altra applicazione: chiudila e riprova.'
  return 'Fotocamera non disponibile: puoi comunque caricare i file della bolla.'
}

export default function FotocameraBolla({ open, posti, onClose, onScatto }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const flusso = useRef<MediaStream | null>(null)
  const [dispositivi, setDispositivi] = useState<MediaDeviceInfo[]>([])
  const [idDisp, setIdDisp] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [pronta, setPronta] = useState(false)
  const [lampo, setLampo] = useState(false)
  const [scattate, setScattate] = useState(0)

  const ferma = useCallback(() => {
    flusso.current?.getTracks().forEach(t => t.stop())
    flusso.current = null
    setPronta(false)
  }, [])

  useEffect(() => {
    if (!open) { ferma(); return }
    let annullato = false
    setErrore(null)
    setScattate(0)
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('', window.isSecureContext ? 'NotFoundError' : 'SecurityError')
        ferma()
        const s = await navigator.mediaDevices.getUserMedia({
          video: { ...(idDisp ? { deviceId: { exact: idDisp } } : { facingMode: 'environment' }), width: { ideal: 3840 }, height: { ideal: 2160 } },
          audio: false,
        })
        if (annullato) { s.getTracks().forEach(t => t.stop()); return }
        flusso.current = s
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => undefined) }
        setPronta(true)
        // Dopo il permesso le etichette delle fotocamere sono leggibili.
        const tutti = await navigator.mediaDevices.enumerateDevices()
        if (!annullato) setDispositivi(tutti.filter(d => d.kind === 'videoinput'))
      } catch (e) {
        if (!annullato) setErrore(messaggioErrore(e))
      }
    })()
    return () => { annullato = true }
  }, [open, idDisp, ferma])

  useEffect(() => () => ferma(), [ferma])

  const scatta = async () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const s = Math.min(1, LATO_MAX / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * s)
    c.height = Math.round(v.videoHeight * s)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    const blob = await new Promise<Blob | null>(ok => c.toBlob(ok, 'image/jpeg', QUALITA))
    if (!blob) return
    setLampo(true)
    setTimeout(() => setLampo(false), 250)
    const n = scattate + 1
    setScattate(n)
    onScatto(new File([blob], `Foto dalla fotocamera ${n}.jpg`, { type: 'image/jpeg' }))
    if (posti - 1 <= 0) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Scatta la bolla" size="xl">
      <MagCorpo className="magcam">
        {errore ? (
          <p className="magcam__errore"><i className="fa-solid fa-video-slash" aria-hidden="true" /> {errore}</p>
        ) : (
          <div className={`magcam__vista ${lampo ? 'is-lampo' : ''}`}>
            <video ref={video} className="magcam__video" muted playsInline />
            {!pronta && <span className="magcam__attesa"><i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Accendo la fotocamera…</span>}
            <span className="magcam__guida" aria-hidden="true" />
          </div>
        )}
        <div className="magcam__barra">
          {dispositivi.length > 1 && (
            <SelectField
              name="cam-disp" label="Fotocamera" className="magcam__sel" value={idDisp}
              options={[{ value: '', label: 'Predefinita' }, ...dispositivi.map((d, i) => ({ value: d.deviceId, label: d.label || `Fotocamera ${i + 1}` }))]}
              onChange={e => setIdDisp(e.target.value)}
            />
          )}
          <p className="magpag__nota">
            Inquadra il foglio intero, ben illuminato e dritto: i numeri piccoli devono leggersi. {posti > 0 ? `Puoi scattare ancora ${posti === 1 ? '1 pagina' : `${posti} pagine`}.` : ''}
          </p>
        </div>
        <MagPiede
          onAnnulla={onClose} onConferma={scatta} etichetta={scattate ? 'Scatta un’altra pagina' : 'Scatta'} icona="fa-camera"
          disabilitato={!pronta || !!errore || posti <= 0}
          sinistra={scattate > 0 ? <span className="magcam__fatte"><i className="fa-solid fa-check" aria-hidden="true" /> {scattate === 1 ? '1 pagina aggiunta' : `${scattate} pagine aggiunte`}</span> : undefined}
        />
      </MagCorpo>
    </Modal>
  )
}
