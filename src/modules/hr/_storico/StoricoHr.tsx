import React from 'react'
import type { EventoHr } from '../../../store/useHrGestioneStore'
import './StoricoHr.sass'

/**
 * Storico di una richiesta o di una spesa: il primo passo è l'invio del dipendente
 * dall'App Op!, poi ogni intervento dell'ufficio del personale (decisione o
 * correzione) con autore, data e ora, campi cambiati e messaggio al dipendente.
 */

const fmtQuando = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const ICO: Record<string, string> = {
  Inviata: 'fa-mobile-screen',
  Approvata: 'fa-circle-check',
  Rifiutata: 'fa-circle-xmark',
  Rimborsata: 'fa-money-bill',
  Modificata: 'fa-pen',
  'Rimessa in attesa': 'fa-rotate-left',
}

const tono = (azione: string) => azione === 'Approvata' || azione === 'Rimborsata' ? 'ok' : azione === 'Rifiutata' ? 'ko' : azione === 'Modificata' ? 'mod' : 'base'

export default function StoricoHr({ origine, storico, titolo = 'Storico' }: {
  /** Invio dall'App Op!: data (ISO) e da chi. Facoltativo se la data non è nota. */
  origine?: { at?: string; autore: string }
  storico?: EventoHr[]
  titolo?: string
}) {
  const eventi: EventoHr[] = [
    ...(origine ? [{ at: origine.at ?? '', autore: origine.autore, azione: 'Inviata' }] : []),
    ...(storico ?? []),
  ]
  return (
    <section className="hrsto" aria-label={titolo}>
      <h3 className="hrsto__title">{titolo}</h3>
      <ol className="hrsto__list">
        {eventi.map((e, i) => (
          <li key={i} className={`hrsto__item hrsto__item--${tono(e.azione)}`}>
            <span className="hrsto__ico" aria-hidden="true"><i className={`fa-solid ${ICO[e.azione] ?? 'fa-circle'}`} /></span>
            <div className="hrsto__body">
              <div className="hrsto__head">
                <strong>{e.azione === 'Inviata' ? 'Inviata dall\'App Op!' : e.azione}</strong>
                <span className="hrsto__meta">{e.autore}{e.at ? ` · ${fmtQuando(e.at)}` : ''}</span>
              </div>
              {e.modifiche && e.modifiche.length > 0 && (
                <ul className="hrsto__mods">{e.modifiche.map((m, j) => <li key={j}>{m}</li>)}</ul>
              )}
              {e.messaggio && <p className="hrsto__msg"><i className="fa-solid fa-comment" aria-hidden="true" /> {e.messaggio}</p>}
            </div>
          </li>
        ))}
      </ol>
      {!storico?.length && <p className="hrsto__empty">Nessun intervento dell'ufficio del personale finora.</p>}
    </section>
  )
}
