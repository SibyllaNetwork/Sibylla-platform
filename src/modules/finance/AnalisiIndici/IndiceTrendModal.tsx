import React, { useMemo } from 'react'
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import Modal from '../../../core/components/Modal'
import TruncatedText from '../../../core/components/TruncatedText'
import { ANIM, CHART, ChartTooltip, cursorProps, fmtAxisNum, gridProps, reducedMotion, series, xAxisProps, yAxisProps } from '../../../core/bi'
import { Bilancio, Indice, fmtDelta, fmtEuro, fmtValore, serie, tono, unitaLbl } from './indiciData'
import './IndiceTrendModal.sass'

/**
 * Andamento storico di un singolo indice: grafico per esercizio (fascia sugli
 * ultimi tre, quelli della tabella), media del periodo, minimo/massimo e le
 * grandezze di bilancio da cui l'indice è calcolato.
 */
interface Props {
  indice: Indice | null
  bilanci: Bilancio[]
  struttura: string
  onClose: () => void
}

const tick = (v: number, u: Indice['unita']) => {
  if (u === 'pct') return `${Math.round(v * 100)}%`
  if (u === 'gg') return `${Math.round(v)}`
  if (u === 'x') return v.toLocaleString('it-IT', { maximumFractionDigits: 1 })
  return fmtAxisNum(v)
}

export default function IndiceTrendModal({ indice, bilanci, struttura, onClose }: Props) {
  const dati = useMemo(() => (indice ? serie(indice, bilanci) : []), [indice, bilanci])
  if (!indice || !dati.length) return null

  const u = indice.unita
  const vals = dati.map(d => d.v)
  const media = vals.reduce((a, v) => a + v, 0) / vals.length
  const min = dati.reduce((a, d) => (d.v < a.v ? d : a))
  const max = dati.reduce((a, d) => (d.v > a.v ? d : a))
  const primo = dati[0], ultimo = dati[dati.length - 1]
  const delta = ultimo.v - primo.v
  const t = tono(delta, indice.polarita, u)
  const colore = series(0)
  const still = reducedMotion()
  const n = dati.length
  const daAnno = dati[Math.max(0, n - 3)].anno
  const bil = (anno: number) => bilanci.find(b => b.anno === anno)!

  return (
    <Modal open onClose={onClose} title={`${indice.label} · andamento storico`} size="xl" className="aindm-box">
      <div className="aindm">
        <p className="aindm__head">
          <span className="aindm__formula">{indice.formula}</span>
          <span className="aindm__sub">{struttura} · {primo.anno}–{ultimo.anno} · {unitaLbl[u]}</span>
        </p>

        <div className="aindm__chart">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={dati} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="aindm-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colore} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={colore} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <ReferenceArea x1={daAnno} x2={ultimo.anno} fill={CHART.grid} fillOpacity={0.5} ifOverflow="extendDomain" />
              <XAxis dataKey="anno" {...xAxisProps} />
              <YAxis {...yAxisProps} width={56} tickFormatter={(v: number) => tick(v, u)} domain={u === 'eur' ? [0, 'auto'] : ['auto', 'auto']} />
              <ReferenceLine y={media} stroke={CHART.inkMuted} strokeDasharray="4 4" />
              {u === 'pct' && <ReferenceLine y={0} stroke={CHART.axis} />}
              <RTooltip cursor={u === 'eur' ? { fill: CHART.grid } : cursorProps}
                content={<ChartTooltip names={{ v: indice.label }} format={(v: number) => fmtValore(v, u)} />} />
              {u === 'eur' ? (
                <Bar dataKey="v" fill={colore} radius={[4, 4, 0, 0]} maxBarSize={42}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
              ) : (
                <Area type="monotone" dataKey="v" stroke={colore} strokeWidth={2.5} fill="url(#aindm-grad)"
                  dot={{ r: 3.5, fill: colore, strokeWidth: 0 }} activeDot={{ r: 5 }}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="aindm__letture">
          <span><i className="aindm__media-sw" aria-hidden="true" /><span className="aindm__k">Media</span> <strong>{fmtValore(media, u)}</strong></span>
          <span><span className="aindm__k">Minimo</span> <strong>{fmtValore(min.v, u)}</strong> nel {min.anno}</span>
          <span><span className="aindm__k">Massimo</span> <strong>{fmtValore(max.v, u)}</strong> nel {max.anno}</span>
          <span>
            <span className="aindm__k">Dal {primo.anno}</span>{' '}
            <strong className={`aindm__tono--${t}`}>{fmtDelta(delta, u)}</strong>
          </span>
          <span className="aindm__fascia"><i className="aindm__fascia-sw" aria-hidden="true" /> esercizi in tabella</span>
        </div>

        <p className="aindm__nota"><i className="fa-solid fa-circle-info" aria-hidden="true" />{indice.nota}</p>

        <table className="sib-table aindm__table">
          <colgroup><col className="aindm__col-lbl" /></colgroup>
          <thead>
            <tr>
              <th>Componenti (€)</th>
              {dati.map(d => <th key={d.anno} className="aindm__num">{d.anno}</th>)}
            </tr>
          </thead>
          <tbody>
            {indice.componenti.map(c => (
              <tr key={c.label}>
                <td><TruncatedText text={c.label} className="aindm__lbl" /></td>
                {dati.map(d => <td key={d.anno} className="aindm__num">{fmtEuro(c.get(bil(d.anno)))}</td>)}
              </tr>
            ))}
            <tr className="aindm__row-ind">
              <td><TruncatedText text={indice.label} className="aindm__lbl" /></td>
              {dati.map(d => <td key={d.anno} className="aindm__num">{fmtValore(d.v, u)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
