import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { glossaryFor } from './biGlossary'
import './BiGlossaryRail.sass'

// ─── LEGENDA ACRONIMI (rail laterale) ───────────────────────────────────────────
//  Presente su OGNI pagina BI: linguetta verticale sul bordo destro del contenuto
//  che apre il pannello con gli acronimi della pagina (acronimo, descrizione,
//  modalità di calcolo). Le voci arrivano dal dizionario condiviso `biGlossary`,
//  quindi la stessa metrica ha la stessa definizione su tutta la piattaforma.
//  Il pannello si chiude con Esc, col click fuori e con la X: non occupa spazio in
//  pagina e non introduce scroll (regole_ui.md §13).

export interface BiGlossaryRailProps {
  /** Chiavi del dizionario presenti nella pagina, nell'ordine di lettura. */
  keys: string[]
  className?: string
}

export default function BiGlossaryRail({ keys, className }: BiGlossaryRailProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const entries = glossaryFor(keys)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  if (!entries.length) return null

  return (
    <div className={clsx('bi-gloss', open && 'bi-gloss--open', className)} ref={wrapRef}>
      <button
        type="button"
        className="bi-gloss__tab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="bi-gloss-panel"
      >
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        <span className="bi-gloss__tab-lbl">Legenda</span>
      </button>

      <div id="bi-gloss-panel" className="bi-gloss__panel" role="dialog" aria-label="Legenda degli acronimi" hidden={!open}>
        <div className="bi-gloss__head">
          <span className="bi-gloss__title">Legenda degli acronimi</span>
          <button type="button" className="bi-gloss__close" onClick={() => setOpen(false)} aria-label="Chiudi la legenda">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="bi-gloss__table-wrap">
          <table className="bi-gloss__table">
            <thead>
              <tr>
                <th scope="col">Acronimo</th>
                <th scope="col">Descrizione</th>
                <th scope="col">Modalità di calcolo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.term}>
                  <th scope="row">{e.term}</th>
                  <td>{e.description}</td>
                  <td>{e.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
