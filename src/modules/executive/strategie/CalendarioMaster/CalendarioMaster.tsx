import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../../core/components/PageHead'
import { SelectField, DateRangeField } from '../../../../core/components/form'
import { STRATEGIES_BY_TIPO, STRUTTURE, type Strategia, type TipoCalendario } from '../strategieData'
import './CalendarioMaster.sass'

interface Layer {
  id:    'tariffarie' | 'distributive' | 'gruppi'
  label: string
  icon:  string
  tipo:  TipoCalendario
}

const LAYERS: Layer[] = [
  { id: 'tariffarie',   label: 'Tariffarie',   icon: 'fa-user',  tipo: 'Tariffe' },
  { id: 'distributive', label: 'Distributive', icon: 'fa-user',  tipo: 'Disponibilità' },
  { id: 'gruppi',       label: 'Gruppi',       icon: 'fa-users', tipo: 'Richieste Extra' },
]

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTH_ABBR  = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const pad = (n: number) => String(n).padStart(2, '0')
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

function defaultRange(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  const to   = new Date(today.getFullYear() + 1, today.getMonth() + 1, 0)
  return {
    from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-01`,
    to:   `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  }
}

// Mock deterministico: poche giornate con strategia (cluster sparsi), il resto
// senza. Sostituire con fetch (struttura, layer, periodo) quando ci sarà il BE.
function pickStrategy(year: number, month: number, day: number, layer: Layer): Strategia | null {
  const pool = STRATEGIES_BY_TIPO[layer.tipo]
  if (!pool.length) return null
  const layerOff = layer.id === 'tariffarie' ? 0 : layer.id === 'distributive' ? 13 : 29
  const seed = year * 10000 + (month + 1) * 100 + day
  const h = (seed * 9301 + layerOff * 49297) % 233280
  // densità bassa: la maggior parte dei giorni resta "nessuna strategia"
  const density = layer.id === 'gruppi' ? 0.10 : 0.18
  if ((h / 233280) >= density) return null
  return pool[Math.abs(seed + layerOff) % pool.length]
}

type TipState = { text: string; x: number; y: number } | null

export default function CalendarioMaster({ navigate }: { navigate: (p: string) => void }) {
  const initRange = useMemo(defaultRange, [])
  const [dateFrom,  setDateFrom]  = useState(initRange.from)
  const [dateTo,    setDateTo]    = useState(initRange.to)
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [tip,       setTip]       = useState<TipState>(null)

  const { fromDate, toDate, months } = useMemo(() => {
    const s = new Date(dateFrom + 'T00:00:00')
    const e = new Date(dateTo   + 'T00:00:00')
    const out: Array<{ year: number; month: number }> = []
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return { fromDate: s, toDate: e, months: out }
    let cur = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cur <= e && out.length < 36) {
      out.push({ year: cur.getFullYear(), month: cur.getMonth() })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return { fromDate: s, toDate: e, months: out }
  }, [dateFrom, dateTo])

  const showTip = (e: React.MouseEvent<HTMLElement>, text: string) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ text, x: r.left + r.width / 2, y: r.top })
  }
  const hideTip = () => setTip(null)

  return (
    <div className="cm">
      <PageHead
        title="Calendario master"
        subtitle="Visione d'insieme delle strategie applicate alle tariffe, alla distribuzione delle camere e alle prenotazioni di gruppo"
      />

      {/* ── Filtri ──────────────────────────────────────────────────── */}
      <div className="cm__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
          className="cm__filter-struttura"
        />
        <DateRangeField
          nameFrom="dateFrom"
          nameTo="dateTo"
          label="Date"
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChangeFrom={e => setDateFrom(e.target.value)}
          onChangeTo={e => setDateTo(e.target.value)}
        />
        <div className="cm__filters-spacer" aria-hidden="true" />
        <button type="button" className="sib-btn sib-btn--secondary cm__btn" onClick={() => navigate('calendario-strategie')}>
          <i className="fa-light fa-pen-ruler" aria-hidden="true" /> Pianifica strategie
        </button>
      </div>

      {/* ── Matrice mese × giorni ───────────────────────────────────── */}
      {months.length > 0 ? (
        <div className="cm__table-wrap">
          <div className="cm__table">
            {/* Header: numeri dei giorni */}
            <div className="cm__head">
              <span className="cm__head-gutter" aria-hidden="true" />
              <div className="cm__head-days">
                {DAYS.map(d => <span key={d} className="cm__head-day">{d}</span>)}
              </div>
            </div>

            {/* Un blocco per mese */}
            {months.map(({ year, month }) => {
              const dim = daysInMonth(year, month)
              return (
                <div className="cm__month" key={`${year}-${month}`}>
                  <button
                    type="button"
                    className="cm__badge"
                    onMouseEnter={e => showTip(e, MONTH_NAMES[month])}
                    onMouseLeave={hideTip}
                  >
                    <span className="cm__badge-year">{year}</span>
                    <span className="cm__badge-month">{MONTH_ABBR[month]}</span>
                  </button>

                  <span className="cm__strategie">Strategie</span>

                  <div className="cm__layers">
                    {LAYERS.map(layer => (
                      <div className="cm__row" key={layer.id}>
                        <span className="cm__layer">
                          <i className={`fa-light ${layer.icon}`} aria-hidden="true" />
                          {layer.label}
                        </span>
                        <div className="cm__dots">
                          {DAYS.map(day => {
                            if (day > dim) return <span key={day} className="cm__cell" aria-hidden="true" />
                            const dayDate = new Date(year, month, day)
                            const inRange = dayDate >= fromDate && dayDate <= toDate
                            const strat   = inRange ? pickStrategy(year, month, day, layer) : null
                            const state   = !inRange ? 'out' : strat ? 'on' : 'none'
                            const tipText = !inRange
                              ? 'Fuori dal periodo selezionato'
                              : strat ? strat.nome : 'Nessuna strategia applicata'
                            return (
                              <span key={day} className="cm__cell">
                                <span
                                  className={clsx('cm__dot', `cm__dot--${state}`)}
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${day} ${MONTH_NAMES[month]} ${year} · ${layer.label} · ${tipText}`}
                                  onMouseEnter={e => showTip(e, tipText)}
                                  onMouseLeave={hideTip}
                                  onFocus={e => showTip(e as unknown as React.MouseEvent<HTMLElement>, tipText)}
                                  onBlur={hideTip}
                                />
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="cm__empty">Periodo non valido — controlla le date selezionate.</div>
      )}

      {tip && (
        <div className="cm__tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          {tip.text}
        </div>
      )}
    </div>
  )
}
