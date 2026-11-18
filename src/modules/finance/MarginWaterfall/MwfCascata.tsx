import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { ANIM, CHART, ChartTooltip, fmtAxisNum, gridProps, reducedMotion, series, xAxisProps, yAxisProps } from '../../../core/bi'
import { Conto, fmtCompatto, fmtEuro } from './mwfData'

/**
 * Cascata della marginalità: barre fluttuanti dai ricavi all'utile. I totali
 * (ricavi, margine, utile) partono da zero; i costi scendono dal livello
 * precedente.
 */
export default function MwfCascata({ c }: { c: Conto }) {
  const still = reducedMotion()
  const dati = [
    { nome: 'Ricavi', range: [0, c.ricavi], v: c.ricavi, tipo: 'tot' },
    { nome: 'Costi variabili', range: [c.mdc, c.ricavi], v: -c.costiVariabili, tipo: 'costo' },
    { nome: 'Margine di contribuzione', range: [0, c.mdc], v: c.mdc, tipo: 'tot' },
    { nome: 'Costi fissi', range: [Math.min(c.utile, c.mdc), Math.max(c.utile, c.mdc)], v: -c.costiFissi, tipo: 'costo' },
    { nome: c.utile < 0 ? 'Perdita' : 'Utile', range: [Math.min(0, c.utile), Math.max(0, c.utile)], v: c.utile, tipo: 'utile' },
  ]
  const colore = (t: string, v: number) => (t === 'costo' ? series(5) : t === 'utile' ? (v < 0 ? CHART.bad : CHART.good) : series(0))

  return (
    <div className="mwf-casc">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dati} margin={{ top: 24, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="nome" {...xAxisProps} interval={0} />
          <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
          <RTooltip
            cursor={{ fill: CHART.grid }}
            content={(props: any) => (
              <ChartTooltip {...props} payload={props.payload?.map((p: any) => ({ ...p, value: p.payload.v }))}
                names={{ range: 'Importo' }} format={(v: number) => fmtEuro(v)} />
            )}
          />
          <Bar dataKey="range" radius={[4, 4, 4, 4]} isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
            {dati.map(d => <Cell key={d.nome} fill={colore(d.tipo, d.v)} />)}
            <LabelList dataKey="v" position="top" formatter={(v: unknown) => fmtCompatto(Number(v))} className="mwf-casc__lbl" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
