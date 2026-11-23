import React, { useEffect, useRef, useState } from 'react'
import { reducedMotion, useCountUp } from '../../../core/bi'
import { Conto, fmtCompatto } from './mwfData'

/**
 * Racconto in 5 tempi condiviso da Flusso e Macchina:
 *   1. entrano i ricavi · 2. escono i costi variabili · 3. resta il margine ·
 *   4. si pagano i costi fissi · 5. resta l'utile (o la perdita).
 * useRacconto fa avanzare i tempi; Passi è la barra delle tappe con contatori,
 * Riproduci e la didascalia del tempo corrente.
 */
export const ULTIMA = 5

export function useRacconto(riproduci: string, passoMs: number) {
  const still = reducedMotion()
  const [fase, setFase] = useState(still ? ULTIMA : 0)
  const [play, setPlay] = useState(0)
  const timer = useRef<number[]>([])

  // Parte all'apertura e quando cambiano struttura, anno, prospettiva o filtro
  useEffect(() => {
    timer.current.forEach(clearTimeout)
    if (still) { setFase(ULTIMA); return }
    setFase(0)
    timer.current = Array.from({ length: ULTIMA }, (_, i) => window.setTimeout(() => setFase(i + 1), 250 + i * passoMs))
    return () => timer.current.forEach(clearTimeout)
  }, [riproduci, play, still, passoMs])

  const vaiA = (f: number) => { timer.current.forEach(clearTimeout); setFase(f) }
  const ricomincia = () => setPlay(x => x + 1)
  return { fase, still, vaiA, ricomincia }
}

function Tappa({ n, titolo, valore, segno, attiva, raggiunta, tono, onClick }: {
  n: number; titolo: string; valore: number; segno: string; attiva: boolean; raggiunta: boolean; tono: string; onClick: () => void
}) {
  const v = useCountUp(raggiunta ? Math.abs(valore) : 0, 1100)
  return (
    <button type="button" onClick={onClick} aria-current={attiva ? 'step' : undefined}
      className={`mwf-flx__tappa mwf-flx__tappa--${tono} ${attiva ? 'mwf-flx__tappa--attiva' : ''} ${raggiunta ? 'mwf-flx__tappa--fatta' : ''}`}>
      <span className="mwf-flx__tappa-n">{n}</span>
      <span className="mwf-flx__tappa-txt">
        <span className="mwf-flx__tappa-tit">{titolo}</span>
        <span className="mwf-flx__tappa-val">{raggiunta ? `${segno}${fmtCompatto(v)}` : '—'}</span>
      </span>
    </button>
  )
}

export function Passi({ totale, nSorgenti, fase, vaiA, ricomincia, didascalie }: {
  totale: Conto; nSorgenti: number; fase: number; vaiA: (f: number) => void; ricomincia: () => void
  /** Testi propri della vista; se assenti quelli standard del flusso del denaro. */
  didascalie?: string[]
}) {
  const r = totale.ricavi || 1
  const perdita = totale.utile < 0
  const TAPPE = [
    { titolo: 'Entrano i ricavi', valore: totale.ricavi, segno: '', tono: 'ric' },
    { titolo: 'Escono i costi variabili', valore: totale.costiVariabili, segno: '−', tono: 'cv' },
    { titolo: 'Resta il margine', valore: totale.mdc, segno: '', tono: 'mdc' },
    { titolo: 'Si pagano i costi fissi', valore: totale.costiFissi, segno: '−', tono: 'cf' },
    { titolo: perdita ? 'Resta una perdita' : "Resta l'utile", valore: totale.utile, segno: perdita ? '−' : '', tono: perdita ? 'perdita' : 'utile' },
  ]
  const testi = didascalie ?? [
    'Il denaro sta per entrare…',
    `Entrano i ricavi di ${nSorgenti === 1 ? 'una voce' : `${nSorgenti} voci`}: insieme fanno ${fmtCompatto(totale.ricavi)}.`,
    `Per ogni 100 € incassati, ${Math.round((totale.costiVariabili / r) * 100)} € escono subito in costi di camera e commissioni.`,
    `Resta il margine di contribuzione: ${fmtCompatto(totale.mdc)}, cioè ${Math.round((totale.mdc / r) * 100)} € ogni 100 € di ricavi.`,
    `Con il margine si pagano i costi fissi della struttura: ${fmtCompatto(totale.costiFissi)}.`,
    perdita
      ? `Il margine non basta a coprire i costi fissi: perdita di ${fmtCompatto(-totale.utile)}.`
      : `Alla fine, di ogni 100 € di ricavi restano ${Math.round((totale.utile / r) * 100)} € di utile: ${fmtCompatto(totale.utile)}.`,
  ]
  return (
    <>
      <div className="mwf-flx__passi" aria-label="Passaggi">
        {TAPPE.map((t, i) => (
          <React.Fragment key={t.titolo}>
            <Tappa n={i + 1} {...t} attiva={fase === i + 1} raggiunta={fase >= i + 1} onClick={() => vaiA(i + 1)} />
            {i < TAPPE.length - 1 && <i className={`fa-solid fa-chevron-right mwf-flx__sep ${fase > i + 1 ? 'mwf-flx__sep--on' : ''}`} aria-hidden="true" />}
          </React.Fragment>
        ))}
        <button type="button" className="sib-btn sib-btn--icon mwf-flx__play" aria-label="Riproduci il racconto" onClick={ricomincia}>
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>
      <p className="mwf-flx__didascalia" aria-live="polite" key={fase}>{testi[fase]}</p>
    </>
  )
}
