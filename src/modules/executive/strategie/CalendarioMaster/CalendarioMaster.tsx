import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { SelectField, DateRangeField } from '../../../../core/components/form'
import MasterDayTooltip, { MasterDayTooltipState, MasterLayerEntry } from '../MasterDayTooltip/MasterDayTooltip'
import { STRATEGIES_BY_TIPO, STRUTTURE, type Strategia, type TipoCalendario } from '../strategieData'
import './CalendarioMaster.sass'

interface Layer {
  id:     'tariffarie' | 'distributive' | 'gruppi'
  label:  string
  icon:   string
  tipo:   TipoCalendario
}

const LAYERS: Layer[] = [
  { id: 'tariffarie',   label: 'Tariffarie',   icon: 'fa-tag',   tipo: 'Tariffe' },
  { id: 'distributive', label: 'Distributive', icon: 'fa-bed',   tipo: 'Disponibilità' },
  { id: 'gruppi',       label: 'Gruppi',       icon: 'fa-users', tipo: 'Richieste Extra' },
]

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const WEEKDAY_ABBR = ['L','M','M','G','V','S','D']

const pad = (n: number) => String(n).padStart(2, '0')
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const weekdayIndex = (y: number, m: number, d: number) => (new Date(y, m, d).getDay() + 6) % 7

function defaultRange(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  const to   = new Date(today.getFullYear() + 1, today.getMonth() + 1, 0)
  return {
    from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-01`,
    to:   `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  }
}

// Mock deterministico: usa un hash integer per assegnare strategie ai giorni in
// modo riproducibile. Quando arriverà il service backend, sostituire questa
// funzione con una fetch (struttura, layer, periodo).
function pickStrategy(year: number, month: number, day: number, layer: Layer): Strategia | null {
  const pool   = STRATEGIES_BY_TIPO[layer.tipo]
  if (!pool.length) return null
  const seed   = year * 10000 + (month + 1) * 100 + day
  const layerOff = layer.id === 'tariffarie' ? 0 : layer.id === 'distributive' ? 13 : 29
  const h      = (seed * 9301 + layerOff * 49297) % 233280
  // densità: tariffarie ~85%, distributive ~75%, gruppi ~30%
  const density = layer.id === 'tariffarie' ? 0.85 : layer.id === 'distributive' ? 0.75 : 0.30
  if ((h / 233280) >= density) return null
  return pool[Math.abs(seed + layerOff) % pool.length]
}

interface MonthCardProps {
  year:        number
  month:       number
  onShowTip:   (tip: MasterDayTooltipState | null) => void
}

function MonthCard({ year, month, onShowTip }: MonthCardProps) {
  const dim    = daysInMonth(year, month)
  const offset = weekdayIndex(year, month, 1)
  const cells  = offset + dim
  const rows   = Math.ceil(cells / 7)
  const today  = new Date()
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  return (
    <div className="cal-master__month">
      <header className="cal-master__month-header">
        <span className="cal-master__month-name">{MONTH_NAMES[month]}</span>
        <span className="cal-master__month-year">{year}</span>
      </header>

      <div className="cal-master__weekdays">
        {WEEKDAY_ABBR.map((w, i) => (
          <span key={i} className={clsx('cal-master__weekday', i >= 5 && 'cal-master__weekday--we')}>{w}</span>
        ))}
      </div>

      <div className="cal-master__days">
        {Array.from({ length: rows * 7 }, (_, idx) => {
          const day = idx - offset + 1
          if (day < 1 || day > dim) {
            return <span key={idx} className="cal-master__day cal-master__day--empty" aria-hidden="true"/>
          }
          const wdIdx     = idx % 7
          const isWeekend = wdIdx >= 5
          const today     = isToday(day)
          const layerStrats: Array<Strategia | null> = LAYERS.map(l => pickStrategy(year, month, day, l))
          const hasAny    = layerStrats.some(s => s !== null)

          const handleEnter = (e: React.SyntheticEvent<HTMLDivElement>) => {
            const r = e.currentTarget.getBoundingClientRect()
            const layers: MasterLayerEntry[] = LAYERS.map((l, i) => ({
              label: l.label,
              icon:  l.icon,
              strat: layerStrats[i],
            }))
            onShowTip({
              date:   new Date(year, month, day),
              layers,
              x:      r.left + r.width / 2,
              y:      r.top,
            })
          }
          const handleLeave = () => onShowTip(null)

          return (
            <div
              key={idx}
              className={clsx(
                'cal-master__day',
                isWeekend && 'cal-master__day--we',
                today     && 'cal-master__day--today',
                !hasAny   && 'cal-master__day--idle',
              )}
              tabIndex={0}
              role="button"
              aria-label={`${day} ${MONTH_NAMES[month]} ${year}`}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onFocus={handleEnter}
              onBlur={handleLeave}
            >
              <div className="cal-master__day-head">
                <span className="cal-master__day-num">{day}</span>
                {today && <span className="cal-master__day-today" aria-label="oggi"/>}
              </div>
              <div className="cal-master__bands" aria-hidden="true">
                {LAYERS.map((l, i) => {
                  const s = layerStrats[i]
                  return (
                    <span
                      key={l.id}
                      className={clsx(
                        'cal-master__band',
                        s && 'cal-master__band--on',
                      )}
                      style={s ? ({ '--day-color': s.colore } as React.CSSProperties) : undefined}
                    >
                      <i className={`fa-duotone ${l.icon} cal-master__band-ico`} aria-hidden="true"/>
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarioMaster({ navigate }: { navigate: (p: string) => void }) {
  const initRange = useMemo(defaultRange, [])

  const [dateFrom,  setDateFrom]  = useState(initRange.from)
  const [dateTo,    setDateTo]    = useState(initRange.to)
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [tip,       setTip]       = useState<MasterDayTooltipState | null>(null)

  const months = useMemo(() => {
    const out: Array<{ year: number; month: number }> = []
    const s = new Date(dateFrom + 'T00:00:00')
    const e = new Date(dateTo   + 'T00:00:00')
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return out
    let cur = new Date(s.getFullYear(), s.getMonth(), 1)
    while (cur <= e && out.length < 24) {
      out.push({ year: cur.getFullYear(), month: cur.getMonth() })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    return out
  }, [dateFrom, dateTo])

  return (
    <div className="cal-master">
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader
        title="Calendario master"
        subtitle="Visione d'insieme delle strategie applicate alle tariffe, alla distribuzione delle camere e alle prenotazioni di gruppo."
      />

      {/* ── Filtri ──────────────────────────────────────────────────── */}
      <div className="cal-master__filters">
        <DateRangeField
          nameFrom="dateFrom"
          nameTo="dateTo"
          label="Periodo"
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChangeFrom={e => setDateFrom(e.target.value)}
          onChangeTo={e => setDateTo(e.target.value)}
        />
        <SelectField
          name="struttura"
          label="Struttura"
          value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
          className="cal-master__filter cal-master__filter--struttura"
        />

        <div className="cal-master__filters-spacer" aria-hidden="true"/>

        <button
          type="button"
          className="sib-btn sib-btn--primary cal-master__btn"
          onClick={() => navigate('calendario-strategie')}
        >
          <i className="fa-duotone fa-pen" aria-hidden="true"/>
          Pianifica strategie
        </button>
      </div>

      {/* ── Legenda layer ───────────────────────────────────────────── */}
      <div className="cal-master__legend" role="note">
        <span className="cal-master__legend-label">Layer visualizzati:</span>
        {LAYERS.map((l, i) => (
          <span key={l.id} className="cal-master__legend-item">
            <span className={`cal-master__legend-pos cal-master__legend-pos--${i}`} aria-hidden="true">
              <span/><span/><span/>
            </span>
            <i className={`fa-duotone ${l.icon}`} aria-hidden="true"/>
            <span>{l.label}</span>
          </span>
        ))}
        <span className="cal-master__legend-hint">
          Passa sopra un giorno per vederne il dettaglio
        </span>
      </div>

      {/* ── Griglia mesi ────────────────────────────────────────────── */}
      {months.length > 0 ? (
        <div className="cal-master__grid">
          {months.map(({ year, month }) => (
            <MonthCard
              key={`${year}-${month}`}
              year={year}
              month={month}
              onShowTip={setTip}
            />
          ))}
        </div>
      ) : (
        <div className="cal-master__empty">
          Periodo non valido — controlla le date selezionate.
        </div>
      )}

      {tip && <MasterDayTooltip tip={tip}/>}
    </div>
  )
}
