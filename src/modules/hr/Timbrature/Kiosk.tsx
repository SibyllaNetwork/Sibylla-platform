import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Tooltip from '../../../core/components/Tooltip'
import './Kiosk.sass'

/**
 * Kiosk di timbratura — QR grande che si rinnova ogni minuto, orologio e
 * istruzioni. Lo stesso componente vive in due posti:
 *  - overlay a schermo intero aperto da «Apri kiosk» nella pagina Timbrature
 *    (`onClose` valorizzato: pulsante di chiusura ed Esc per uscire);
 *  - pagina autonoma `/kiosk?p=<postazione>` (vedi `KioskPage`), senza sidenav
 *    né topbar, da lasciare aperta sul tablet o sul monitor all'ingresso.
 */

export const DURATA_QR = 60
export const APP_URL = 'https://app.sibyllaop.it/'
export const POSTAZIONE_DEFAULT = 'principale'

/** Indirizzo relativo del kiosk di una postazione. */
export const kioskPath = (postazione = POSTAZIONE_DEFAULT) => `/kiosk?p=${encodeURIComponent(postazione)}`

/** Token del QR: cambia a ogni finestra di DURATA_QR secondi. */
const tokenQr = (finestra: number) => (finestra * 2654435761 >>> 0).toString(36).toUpperCase()

/** Immagine (data URL) del QR che codifica `testo`. */
export function useQr(testo: string, larghezza = 240) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(testo, { errorCorrectionLevel: 'M', margin: 1, width: larghezza, color: { dark: '#1E293B', light: '#FFFFFF' } })
      .then((u) => { if (vivo) setUrl(u) })
      .catch(() => { if (vivo) setUrl('') })
    return () => { vivo = false }
  }, [testo, larghezza])
  return url
}

/** Orologio al secondo (per il countdown del QR e l'orologio del kiosk). */
export function useAdesso() {
  const [ora, setOra] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => setOra(new Date()), 1000); return () => window.clearInterval(t) }, [])
  return ora
}

/** QR di timbratura della postazione nel minuto corrente e secondi al rinnovo. */
export function useQrTimbratura(postazione: string, adesso: Date, larghezza = 480) {
  const secondi = Math.floor(adesso.getTime() / 1000)
  const finestra = Math.floor(secondi / DURATA_QR)
  const scadeTra = DURATA_QR - (secondi % DURATA_QR)
  const qr = useQr(`${APP_URL}timbra?p=${encodeURIComponent(postazione)}&k=${tokenQr(finestra)}`, larghezza)
  return { qr, scadeTra }
}

interface KioskProps {
  postazione?: string
  /** Presente nell'overlay: mostra il pulsante di chiusura e abilita Esc. */
  onClose?: () => void
}

export default function Kiosk({ postazione = POSTAZIONE_DEFAULT, onClose }: KioskProps) {
  const adesso = useAdesso()
  const { qr, scadeTra } = useQrTimbratura(postazione, adesso)
  const [pieno, setPieno] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    if (!onClose) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    const cambio = () => setPieno(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', cambio)
    return () => document.removeEventListener('fullscreenchange', cambio)
  }, [])

  const schermoIntero = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined)
    else document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  const ora = `${String(adesso.getHours()).padStart(2, '0')}:${String(adesso.getMinutes()).padStart(2, '0')}`
  const data = adesso.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="tmb-kiosk" role={onClose ? 'dialog' : 'main'} aria-label="Kiosk di timbratura">
      <div className="tmb-kiosk__tools">
        {!onClose && (
          <Tooltip text={pieno ? 'Esci dallo schermo intero' : 'Schermo intero'} position="bottom">
            <button type="button" className="tmb-kiosk__tool" onClick={schermoIntero}
              aria-label={pieno ? 'Esci dallo schermo intero' : 'Schermo intero'}>
              <i className={`fa-solid ${pieno ? 'fa-compress' : 'fa-expand'}`} aria-hidden="true" />
            </button>
          </Tooltip>
        )}
        {onClose && (
          <Tooltip text="Chiudi il kiosk" position="bottom">
            <button type="button" className="tmb-kiosk__tool" onClick={onClose} aria-label="Chiudi il kiosk">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </div>
      <div className="tmb-kiosk__clock">{ora}</div>
      <div className="tmb-kiosk__date">{data}</div>
      <div className="tmb-kiosk__qr">{qr && <img src={qr} alt="QR code di timbratura" />}</div>
      <p className="tmb-kiosk__msg">Inquadra il codice con l'<b>App Op!</b> per timbrare l'entrata o l'uscita</p>
      <div className="tmb-kiosk__bar"><span className="tmb-kiosk__bar-fill" style={{ '--p': `${(scadeTra / DURATA_QR) * 100}%` } as React.CSSProperties} /></div>
      <p className="tmb-kiosk__scade">
        Il codice si rinnova tra {scadeTra}s · Postazione {postazione}{onClose ? ' · Esc per uscire' : ''}
      </p>
    </div>
  )
}

/** Postazione dal parametro `p` dell'indirizzo (default «principale»). */
export function postazioneDaUrl(search = window.location.search) {
  const p = (new URLSearchParams(search).get('p') ?? '').trim().slice(0, 40)
  return p || POSTAZIONE_DEFAULT
}

/** Pathname servito dalla pagina autonoma del kiosk. */
export const isKioskPath = (pathname = window.location.pathname) => /^\/kiosk\/?$/i.test(pathname)

/**
 * Pagina autonoma `/kiosk?p=<postazione>`: montata dall'entry point al posto
 * dell'app (niente sidenav, topbar né login). Tiene lo schermo acceso quando il
 * browser lo consente.
 */
export function KioskPage() {
  const postazione = postazioneDaUrl()

  useEffect(() => {
    document.title = `Kiosk di timbratura · ${postazione}`
  }, [postazione])

  useEffect(() => {
    type WakeLock = { release: () => Promise<void> }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } }
    let lock: WakeLock | null = null
    const chiedi = () => {
      if (document.visibilityState !== 'visible' || !nav.wakeLock) return
      nav.wakeLock.request('screen').then((l) => { lock = l }).catch(() => undefined)
    }
    chiedi()
    document.addEventListener('visibilitychange', chiedi)
    return () => {
      document.removeEventListener('visibilitychange', chiedi)
      lock?.release().catch(() => undefined)
    }
  }, [])

  return <Kiosk postazione={postazione} />
}
