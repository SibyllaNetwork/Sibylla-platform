import React, { useEffect, useState } from 'react'
import { useHrConfigStore, type BadgeConfigHr } from '../../../store/useHrConfigStore'
import { badgeHtml, payloadQr, qrDataUrl, type BadgeDati } from './badgeEsterno'
import './BadgeAnteprima.sass'

// ─── ANTEPRIMA DEL BADGE ─────────────────────────────────────────────────────
//  Stesso HTML della stampa, in un iframe: quello che si vede è quello che esce.

export default function BadgeAnteprima({ dati, config }: { dati: BadgeDati; config?: BadgeConfigHr }) {
  const salvata = useHrConfigStore((s) => s.badge)
  const cfg = config ?? salvata
  const [qr, setQr] = useState('')
  const c = dati.collaboratore
  // Il QR si rigenera solo quando cambia il suo contenuto (non a ogni render della scheda)
  const payload = payloadQr(c)
  useEffect(() => {
    let off = false
    qrDataUrl(c).then((u) => { if (!off) setQr(u) })
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])
  const verticale = cfg.orientamento === 'verticale'
  return (
    <iframe
      title={`Anteprima badge di ${c.nome} ${c.cognome}`}
      className={`badge-prev badge-prev--${verticale ? 'v' : 'h'}${cfg.retro ? ' badge-prev--retro' : ''}`}
      srcDoc={badgeHtml([{ dati, qr }], cfg, 'anteprima')}
    />
  )
}
