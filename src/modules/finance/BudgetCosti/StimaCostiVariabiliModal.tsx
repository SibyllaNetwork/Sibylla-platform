import React from 'react'
import Modal from '../../../core/components/Modal'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts'

// Pop-up "Stima dei costi variabili": trend della stima (asse sx, €) messo a
// confronto con l'occupancy (asse dx, %) — i costi variabili seguono
// l'occupazione — e tabella laterale con il dettaglio mensile.

const NAVY = '#204769'
const AZZURRO = '#14A0DE'

export interface MeseStima {
  mese: string
  occupancy: number      // %
  occupate: number       // camere occupate
  costiVariabili: number // € (consuntivo sui mesi chiusi, stima sui successivi)
  consolidato: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  anno: string
  struttura: string
  occupancyAttuale: number
  costPor: number
  mesi: MeseStima[]
}

const eur = (n: number) =>
  `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const eurK = (n: number) =>
  `${Math.round(n / 1000).toLocaleString('it-IT')}k €`
const pct = (n: number) =>
  `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

export default function StimaCostiVariabiliModal({
  open, onClose, anno, struttura, occupancyAttuale, costPor, mesi,
}: Props) {
  const totale = mesi.reduce((s, m) => s + m.costiVariabili, 0)
  const occMedia = mesi.length ? mesi.reduce((s, m) => s + m.occupancy, 0) / mesi.length : 0

  return (
    <Modal open={open} onClose={onClose} title="Stima dei costi variabili" size="xl" className="stima-cv">
      <div className="stima-cv__body">

        <p className="stima-cv__copy">
          <i className="fa-solid fa-lightbulb-on stima-cv__copy-ico" />
          In funzione di un'occupancy attuale del <strong>{pct(occupancyAttuale)}</strong> e di un
          CostPor di <strong>{eur(costPor)}</strong>, la stima dei costi variabili per il {anno} è
          di <strong>{eur(totale)}</strong>. I costi variabili variano in funzione dell'occupazione:
          il CostPor viene applicato alle camere occupate di ogni mese.
          <span className="stima-cv__copy-sub">{struttura} · {anno}</span>
        </p>

        <div className="stima-cv__content">

          <div className="stima-cv__chart">
            <div className="stima-cv__chart-title">Andamento della stima dei costi variabili</div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={mesi} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#E0E7EE" />
                <XAxis
                  dataKey="mese" tickLine={false}
                  axisLine={{ stroke: '#C3C9D0' }} tick={{ fontSize: 11, fill: '#6E7175' }}
                />
                <YAxis
                  yAxisId="costi" tickLine={false} axisLine={false} width={58}
                  tick={{ fontSize: 11, fill: '#6E7175' }} tickFormatter={eurK}
                />
                <YAxis
                  yAxisId="occ" orientation="right" domain={[0, 100]} width={42}
                  tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: '#6E7175' }} tickFormatter={(v: any) => `${v}%`}
                />
                <Tooltip
                  formatter={(v: any, n: any) => (n === 'Occupancy' ? [pct(Number(v)), n] : [eur(Number(v)), n])}
                  labelFormatter={(l: any) => `${l} ${anno}`}
                />
                <Legend verticalAlign="bottom" height={28} iconType="plainline" />
                {/* isAnimationActive off: dentro la modale il container parte a
                    larghezza 0 e l'animazione lascerebbe la linea invisibile */}
                <Line
                  yAxisId="costi" type="monotone" dataKey="costiVariabili" name="Stima costi variabili"
                  stroke={NAVY} strokeWidth={2.5} dot={{ r: 2.5, fill: NAVY }} activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="occ" type="monotone" dataKey="occupancy" name="Occupancy"
                  stroke={AZZURRO} strokeWidth={2} strokeDasharray="5 4"
                  dot={{ r: 2, fill: AZZURRO }} activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="stima-cv__aside">
            <table className="sib-table stima-cv__table">
              <thead>
                <tr>
                  <th>Mese</th>
                  <th>Occ.</th>
                  <th>Cos.Var</th>
                </tr>
              </thead>
              <tbody>
                {mesi.map(m => (
                  <tr key={m.mese} className={m.consolidato ? '' : 'stima-cv__row--stima'}>
                    <td>{m.mese}</td>
                    <td>{pct(m.occupancy)}</td>
                    <td>{eur(m.costiVariabili)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="stima-cv__tot">
                  <td>Totale</td>
                  <td>{pct(occMedia)}</td>
                  <td>{eur(totale)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="stima-cv__legend">
              <span><i className="stima-cv__dot stima-cv__dot--navy" /> Consuntivo</span>
              <span><i className="stima-cv__dot stima-cv__dot--azzurro" /> Stima</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
