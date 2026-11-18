import React, { useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import { Conto, fmtCompatto, fmtPct } from './mwfData'

/**
 * Imbuto interattivo della marginalità. I ricavi entrano come mattoncini
 * (trascinati dall'elenco a destra nella bocca dell'imbuto); dalla deviazione
 * laterale escono i costi variabili, che si raccolgono nella loro scatola; dal
 * fondo scende il margine di contribuzione, da cui escono i costi fissi e
 * l'utile, ognuno nel suo contenitore. I livelli delle scatole sono in scala
 * sui ricavi totali: si riempiono man mano che si versano ricavi.
 */
export interface Mattoncino { id: string; nome: string; icona: string; ricavi: number }

interface Props {
  c: Conto
  /** Ricavi di tutti i mattoncini: scala dei livelli. */
  scala: number
  dentro: Mattoncino[]
  cadendo: string | null
  onVersa: (id: string) => void
  onTogli: (id: string) => void
}

const livello = (v: number, scala: number) => (scala > 0 ? Math.max(0, Math.min(20, Math.round((Math.abs(v) / scala) * 20))) : 0)

function Scatola({ titolo, valore, quota, tono, icona, info }: { titolo: string; valore: number; quota: number; tono: string; icona: string; info: string }) {
  return (
    <div className={`mwf-box mwf-box--${tono}`}>
      <Tooltip text={info}>
        <span className="mwf-box__tit"><i className={`fa-solid ${icona}`} aria-hidden="true" />{titolo}</span>
      </Tooltip>
      <span className="mwf-box__val">{fmtCompatto(valore)}</span>
      <span className="mwf-box__vaso" aria-hidden="true">
        <span className={`mwf-box__liquido mwf-box__h${quota}`} />
      </span>
    </div>
  )
}

export default function MwfImbuto({ c, scala, dentro, cadendo, onVersa, onTogli }: Props) {
  const [sopra, setSopra] = useState(false)
  const vuoto = dentro.length === 0
  const r = c.ricavi || 1
  const scorre = (v: number) => (v > 0 ? 'mwf-imb__tubo--on' : '')
  const perdita = c.utile < 0

  return (
    <div className="mwf-imb">
      {/* ── Costi variabili: scatola alimentata dalla deviazione ── */}
      <div className="mwf-imb__cv">
        <Scatola titolo="Costi variabili" valore={c.costiVariabili} quota={livello(c.costiVariabili, scala)} tono="cv" icona="fa-box-open"
          info={`Costi di camera ${fmtCompatto(c.costiCamera)} + commissioni ${fmtCompatto(c.commissioni)}${vuoto ? '' : ` · ${fmtPct(c.costiVariabili / r, 0)} dei ricavi`}`} />
      </div>

      {/* ── Imbuto ── */}
      <div className="mwf-imb__centro">
        <div
          className={`mwf-imb__bocca ${sopra ? 'mwf-imb__bocca--sopra' : ''} ${vuoto ? 'mwf-imb__bocca--vuota' : ''}`}
          onDragOver={e => { e.preventDefault(); setSopra(true) }}
          onDragLeave={() => setSopra(false)}
          onDrop={e => { e.preventDefault(); setSopra(false); const id = e.dataTransfer.getData('text/plain'); if (id) onVersa(id) }}
          aria-label="Bocca dell'imbuto: trascina qui i ricavi"
        >
          {vuoto ? (
            <span className="mwf-imb__invito"><i className="fa-solid fa-hand-pointer" aria-hidden="true" />Trascina qui i ricavi</span>
          ) : dentro.map(m => (
            <Tooltip key={m.id} text={`${m.nome}: ${fmtCompatto(m.ricavi)} · clic per toglierlo`}>
              <button type="button" className={`mwf-imb__chip ${cadendo === m.id ? 'mwf-imb__chip--cade' : ''}`} onClick={() => onTogli(m.id)}>
                <i className={`fa-solid ${m.icona}`} aria-hidden="true" />{m.nome}
              </button>
            </Tooltip>
          ))}
        </div>

        <svg className="mwf-imb__svg" viewBox="-100 0 600 230" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
          {/* deviazione laterale verso la scatola dei costi variabili */}
          <path d="M 96 92 L 20 124 L -100 124" className={`mwf-imb__tubo ${scorre(c.costiVariabili)}`} />
          <polygon points="30,0 370,0 228,190 172,190" className={`mwf-imb__corpo ${vuoto ? 'mwf-imb__corpo--vuoto' : ''}`} />
          <ellipse cx="200" cy="0" rx="170" ry="9" className="mwf-imb__orlo" />
          <rect x="182" y="188" width="36" height="42" rx="3" className="mwf-imb__becco" />
          <path d="M 200 192 L 200 230" className={`mwf-imb__tubo mwf-imb__tubo--giu ${scorre(c.mdc)}`} />
          <text x="200" y="62" className="mwf-imb__t">Ricavi</text>
          <text x="200" y="88" className="mwf-imb__v">{vuoto ? '—' : fmtCompatto(c.ricavi)}</text>
          {!vuoto && <text x="200" y="128" className="mwf-imb__s">−{fmtPct(c.costiVariabili / r, 0)} costi variabili</text>}
        </svg>
      </div>

      {/* ── Fondo: margine di contribuzione → costi fissi e utile ── */}
      <div className="mwf-imb__fondo">
        <Scatola titolo="Costi fissi" valore={c.costiFissi} quota={livello(c.costiFissi, scala)} tono="cf" icona="fa-building"
          info="Costi fissi della struttura ripartiti sui ricavi versati (criterio provvisorio)" />
        <span className={`mwf-imb__freccia mwf-imb__freccia--sx ${scorre(c.costiFissi)}`} aria-hidden="true"><i className="fa-solid fa-arrow-left" /></span>
        <div className="mwf-imb__vasca">
          <span className="mwf-imb__vasca-tit">Margine di contribuzione</span>
          <span className="mwf-imb__vasca-val">{vuoto ? '—' : fmtCompatto(c.mdc)}</span>
          {!vuoto && <span className="mwf-imb__vasca-sub">{fmtPct(c.mdc / r, 0)} dei ricavi</span>}
        </div>
        <span className={`mwf-imb__freccia ${scorre(Math.abs(c.utile))}`} aria-hidden="true"><i className="fa-solid fa-arrow-right" /></span>
        <Scatola titolo={perdita ? 'Perdita' : 'Utile'} valore={c.utile} quota={livello(c.utile, scala)} tono={perdita ? 'perdita' : 'utile'} icona={perdita ? 'fa-arrow-trend-down' : 'fa-piggy-bank'}
          info={vuoto ? 'Margine di contribuzione − costi fissi' : `Margine di contribuzione − costi fissi · ${fmtPct(c.utile / r, 0)} dei ricavi`} />
      </div>
    </div>
  )
}
