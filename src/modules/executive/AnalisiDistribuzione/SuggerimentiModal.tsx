import React from 'react'
import { Icon } from '../../purchasing/_shared/Icon'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from 'recharts'
import './SuggerimentiModal.sass'

const NAVY = '#204769'
const ORANGE = '#E07B39'
const VERDE = '#5A8A3C'
const VIOLA = '#9B59B6'

// Tariffe individuali — confronto tariffa suggerita vs applicata (€)
const TARIFFE_DATA = [
  { giorno: 9, suggerita: 128, applicata: 122 }, { giorno: 10, suggerita: 126, applicata: 121 },
  { giorno: 11, suggerita: 132, applicata: 124 }, { giorno: 12, suggerita: 130, applicata: 123 },
  { giorno: 13, suggerita: 127, applicata: 120 }, { giorno: 14, suggerita: 125, applicata: 119 },
  { giorno: 15, suggerita: 129, applicata: 122 }, { giorno: 16, suggerita: 134, applicata: 126 },
  { giorno: 17, suggerita: 131, applicata: 124 }, { giorno: 18, suggerita: 128, applicata: 121 },
  { giorno: 19, suggerita: 133, applicata: 125 }, { giorno: 20, suggerita: 136, applicata: 128 },
  { giorno: 21, suggerita: 138, applicata: 130 },
]

// Disponibilità — suggerimenti accolti (Q.tà)
const DISP_DATA = [
  { giorno: 9, valore: 658 }, { giorno: 10, valore: 662 }, { giorno: 11, valore: 660 },
  { giorno: 12, valore: 661 }, { giorno: 13, valore: 659 }, { giorno: 14, valore: 663 },
  { giorno: 15, valore: 660 }, { giorno: 16, valore: 662 }, { giorno: 17, valore: 661 },
  { giorno: 18, valore: 664 }, { giorno: 19, valore: 662 }, { giorno: 20, valore: 666 },
  { giorno: 21, valore: 684 },
]

// Gruppi — variazione tariffe gruppi (€)
const GRUPPI_DATA = [
  { giorno: 9, tariffa: 95 }, { giorno: 10, tariffa: 110 }, { giorno: 11, tariffa: 140 },
  { giorno: 12, tariffa: 120 }, { giorno: 13, tariffa: 135 }, { giorno: 14, tariffa: 100 },
  { giorno: 15, tariffa: 115 }, { giorno: 16, tariffa: 150 }, { giorno: 17, tariffa: 130 },
  { giorno: 18, tariffa: 118 }, { giorno: 19, tariffa: 145 }, { giorno: 20, tariffa: 125 },
  { giorno: 21, tariffa: 160 },
]

const X_AXIS = { dataKey: 'giorno', tickLine: false, axisLine: { stroke: '#C3C9D0' }, tick: { fontSize: 11, fill: '#6E7175' } }
const Y_AXIS = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: '#6E7175' } }

interface Props {
  open: boolean
  onClose: () => void
}

export default function SuggerimentiModal({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="sugg-modal__overlay" onMouseDown={onClose}>
      <div className="sugg-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sugg-modal__head">
          <h2 className="sugg-modal__title">Suggerimenti Accolti</h2>
          <button type="button" className="sugg-modal__close" onClick={onClose} aria-label="Chiudi">
            <Icon family="regular" name="xmark" />
          </button>
        </div>

        <div className="sugg-modal__body">
          {/* ── Tariffe individuali ─────────────────────────────────────── */}
          <section className="sugg-modal__sec">
            <h3 className="sugg-modal__sec-title">Tariffe individuali <Icon family="light" name="tag" /></h3>
            <div className="sugg-modal__card">
              <div className="sugg-modal__chart">
                <span className="sugg-modal__ylab">€</span>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={TARIFFE_DATA} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#E0E7EE" />
                    <XAxis {...X_AXIS} />
                    <YAxis {...Y_AXIS} domain={[90, 150]} width={42} tickFormatter={(v: any) => `€${v}`} />
                    <Tooltip formatter={(v: any, n: any) => [`€ ${v}`, n]} labelFormatter={(l: any) => `Giorno ${l} giugno`} />
                    <Line type="monotone" dataKey="suggerita" name="Suggerita" stroke={NAVY} strokeWidth={2} dot={{ r: 2.5, fill: NAVY }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="applicata" name="Applicata" stroke={ORANGE} strokeWidth={2} dot={{ r: 2.5, fill: ORANGE }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="sugg-modal__aside">
                <span className="sugg-modal__aside-title">Variazione tariffe individuali</span>
                <span className="sugg-modal__aside-sub">dal 9 al 21 giugno 2026</span>
                <span className="sugg-modal__legend"><span className="sugg-modal__dot sugg-modal__dot--navy" /> Tariffa suggerita</span>
                <span className="sugg-modal__legend"><span className="sugg-modal__dot sugg-modal__dot--orange" /> Tariffa applicata</span>
                <span className="sugg-modal__aside-foot">Giugno 2026</span>
              </div>
            </div>
          </section>

          {/* ── Disponibilità ───────────────────────────────────────────── */}
          <section className="sugg-modal__sec">
            <h3 className="sugg-modal__sec-title">Disponibilità <Icon family="light" name="building-magnifying-glass" /></h3>
            <div className="sugg-modal__card">
              <div className="sugg-modal__chart">
                <span className="sugg-modal__ylab">Q.ta</span>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={DISP_DATA} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="suggFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={VERDE} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={VERDE} stopOpacity={0.12} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E0E7EE" />
                    <XAxis {...X_AXIS} />
                    <YAxis {...Y_AXIS} domain={[0, 800]} ticks={[0, 200, 400, 600, 800]} width={36} />
                    <Tooltip formatter={(v: any) => [`${v}`, 'Suggerimenti accolti']} labelFormatter={(l: any) => `Giorno ${l} giugno`} />
                    <Area type="monotone" dataKey="valore" stroke={VERDE} strokeWidth={2} fill="url(#suggFill)" dot={{ r: 2.5, fill: VERDE }} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="sugg-modal__aside">
                <span className="sugg-modal__aside-title">Variazione disponibilità</span>
                <span className="sugg-modal__aside-sub">dal 9 al 21 giugno 2026</span>
                <span className="sugg-modal__legend"><span className="sugg-modal__dot sugg-modal__dot--green" /> Suggerimenti accolti</span>
                <span className="sugg-modal__aside-foot">Giugno 2026</span>
              </div>
            </div>
          </section>

          {/* ── Gruppi ──────────────────────────────────────────────────── */}
          <section className="sugg-modal__sec">
            <h3 className="sugg-modal__sec-title">Gruppi <Icon family="light" name="people-group" /></h3>
            <div className="sugg-modal__card">
              <div className="sugg-modal__chart">
                <span className="sugg-modal__ylab">€</span>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={GRUPPI_DATA} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="#E0E7EE" vertical={false} />
                    <XAxis {...X_AXIS} />
                    <YAxis {...Y_AXIS} domain={[0, 180]} width={42} tickFormatter={(v: any) => `€${v}`} />
                    <Tooltip formatter={(v: any) => [`€ ${v}`, 'Tariffa gruppi']} labelFormatter={(l: any) => `Giorno ${l} giugno`} cursor={{ fill: 'rgba(155,89,182,0.08)' }} />
                    <Bar dataKey="tariffa" name="Tariffa gruppi" fill={VIOLA} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="sugg-modal__aside">
                <span className="sugg-modal__aside-title">Variazione tariffe gruppi</span>
                <span className="sugg-modal__aside-sub">dal 9 al 21 giugno 2026</span>
                <span className="sugg-modal__legend"><span className="sugg-modal__dot sugg-modal__dot--purple" /> Tariffa gruppi</span>
                <span className="sugg-modal__aside-foot">Giugno 2026</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
