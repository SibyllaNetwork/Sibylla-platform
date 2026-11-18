import React, { forwardRef } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { RadioGroup } from '../../../core/components/form'
import { ANIM, reducedMotion, series } from '../../../core/bi'
import { BASI, BaseRiparto, Calcolo, Segmento, fmtCompatto, fmtNum, fmtPct, tot } from './cesData'
import './CesPannello.sass'

/**
 * Pannello laterale del Conto economico segmentato (dal disegno di Matteo):
 *  - card Ricavi: totale, ripartizione per segmento (barre + torta);
 *  - card Costi comuni: totale da allocare e criterio di riparto
 *    (Ricavi %, Margine %, N. camere) con le quote per segmento.
 */
interface Props {
  evidenza: 'ricavi' | 'comuni' | null
  titolo: string
  sottotitolo: string
  segmenti: Segmento[]
  calcolo: Calcolo
  comuni: Record<string, number>
  base: BaseRiparto
  onBase: (b: BaseRiparto) => void
  vistaStruttura: boolean
  onDettaglioComuni: () => void
}

const CesPannello = forwardRef<HTMLDivElement, Props>(function CesPannello(
  { evidenza, titolo, sottotitolo, segmenti, calcolo: c, comuni, base, onBase, vistaStruttura, onDettaglioComuni }, ref,
) {
  const totRicavi = tot(c.ricavi)
  const totComuni = Object.values(comuni).reduce((a, b) => a + b, 0)
  const dati = segmenti.map((s, i) => ({ nome: s.nome, v: Math.max(0, c.ricavi[i]) }))
  const still = reducedMotion()
  const opzioni = BASI.map(b => ({
    value: b.value,
    label: b.breve,
    tooltip: b.desc,
  }))

  return (
    <aside className="cesp" ref={ref} aria-label="Ricavi e costi comuni">
      {/* ── Ricavi ─────────────────────────────────────────────── */}
      <section data-card="ricavi" className={`cesp__card ${evidenza === 'ricavi' ? 'cesp__card--on' : ''}`}>
        <header className="cesp__head">
          <span className="cesp__title"><i className="fa-solid fa-chart-pie" aria-hidden="true" />Ricavi</span>
          <Tooltip text={`Ricavi di ${titolo} (${sottotitolo}) ripartiti per segmento`}>
            <i className="fa-solid fa-circle-info cesp__info" aria-label="Informazioni" />
          </Tooltip>
        </header>
        <div className="cesp__big">{fmtCompatto(totRicavi)}</div>
        <div className="cesp__sub">{titolo} · {sottotitolo}</div>
        <div className="cesp__ricavi">
          <ul className="cesp__list">
            {segmenti.map((s, i) => {
              const q = totRicavi ? c.ricavi[i] / totRicavi : 0
              return (
                <li key={s.id} className="cesp__item">
                  <span className="cesp__item-row">
                    <i className={`cesp__dot cesp__dot--${i}`} aria-hidden="true" />
                    <TruncatedText text={s.nome} className="cesp__name" />
                    <Tooltip text={`${fmtNum(c.ricavi[i])} €`}><span className="cesp__pct">{fmtPct(q, 0)}</span></Tooltip>
                  </span>
                  <span className="cesp__bar"><span className={`cesp__fill cesp__fill--${i} cesp__w${Math.min(20, Math.round(q * 20))}`} /></span>
                </li>
              )
            })}
          </ul>
          <div className="cesp__pie" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dati} dataKey="v" nameKey="nome" innerRadius="55%" outerRadius="100%" paddingAngle={1.5} stroke="none"
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                  {dati.map((_, i) => <Cell key={i} fill={series(i)} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Costi comuni ───────────────────────────────────────── */}
      <section data-card="comuni" className={`cesp__card ${evidenza === 'comuni' ? 'cesp__card--on' : ''}`}>
        <header className="cesp__head">
          <span className="cesp__title"><i className="fa-solid fa-sliders" aria-hidden="true" />Costi comuni</span>
          <Tooltip text={vistaStruttura ? 'Costi comuni della struttura e sua quota dei costi di sede, da allocare alle linee di ricavo' : 'Costi di sede del gruppo, da allocare agli hotel'}>
            <i className="fa-solid fa-circle-info cesp__info" aria-label="Informazioni" />
          </Tooltip>
        </header>
        <div className="cesp__big">{fmtCompatto(totComuni)}</div>
        <div className="cesp__sub">da allocare ai segmenti</div>
        <RadioGroup name="ces-base" label="Criterio di riparto" options={opzioni} value={base} onChange={v => onBase(v as BaseRiparto)} className="cesp__radio" />
        {vistaStruttura && base === 'camere' && (
          <p className="cesp__nota">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            Soggiorno, F&amp;B e SPA non hanno camere proprie: fra le linee si usa il peso sui ricavi, le camere ripartiscono la quota di sede dell'hotel.
          </p>
        )}
        <ul className="cesp__quote">
          {segmenti.map((s, i) => (
            <li key={s.id}>
              <i className={`cesp__dot cesp__dot--${i}`} aria-hidden="true" />
              <TruncatedText text={s.nome} className="cesp__name" />
              <span className="cesp__quota">{fmtNum(c.totComuni[i])}</span>
              <span className="cesp__peso">{fmtPct(c.pesi[i], 0)}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="cesp__link" onClick={onDettaglioComuni}>
          Quote per voce <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </section>
    </aside>
  )
})

export default CesPannello
