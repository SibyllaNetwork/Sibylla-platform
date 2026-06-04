import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import AlertBanner from '../../../../core/components/AlertBanner'
import { SelectField, DateRangeField, SearchField } from '../../../../core/components/form'
import StrategyTooltip, { StrategyTooltipState } from '../StrategyTooltip/StrategyTooltip'
import { STRATEGIES, STRATEGIES_BY_ID, STRUTTURE, TIPI_CALENDARIO, type Strategia, type TipoCalendario } from '../strategieData'
import './CalendarioStrategie.sass'

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MONTH_ABBR  = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']
const WEEKDAY_ABBR = ['L','M','M','G','V','S','D']
const WD3 = ['LUN','MAR','MER','GIO','VEN','SAB','DOM']  // 0 = Lunedì

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
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

interface MonthCardProps {
  year:             number
  month:            number
  assignments:      Record<string, string>
  strategiesById:   Record<string, Strategia>
  selectedStrategy: Strategia | null
  eraseMode:        boolean
  onToggleDay:      (key: string) => void
  onShowTip:        (tip: StrategyTooltipState | null) => void
}

function MonthCard({ year, month, assignments, strategiesById, selectedStrategy, eraseMode, onToggleDay, onShowTip }: MonthCardProps) {
  const dim     = daysInMonth(year, month)
  const offset  = weekdayIndex(year, month, 1)
  const cells   = offset + dim
  const rows    = Math.ceil(cells / 7)
  const today   = new Date()
  const todayK  = dayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const canApply = eraseMode || !!selectedStrategy

  return (
    <div className="cal-strategie__month">
      <header className="cal-strategie__month-header">
        <span className="cal-strategie__month-name">{MONTH_NAMES[month]}</span>
        <span className="cal-strategie__month-year">{year}</span>
      </header>

      <div className="cal-strategie__weekdays">
        {WEEKDAY_ABBR.map((w, i) => (
          <span key={i} className={clsx('cal-strategie__weekday', i >= 5 && 'cal-strategie__weekday--we')}>{w}</span>
        ))}
      </div>

      <div className="cal-strategie__days">
        {Array.from({ length: rows * 7 }, (_, idx) => {
          const dayNum = idx - offset + 1
          if (dayNum < 1 || dayNum > dim) {
            return <span key={idx} className="cal-strategie__day cal-strategie__day--empty" aria-hidden="true"/>
          }
          const k         = dayKey(year, month, dayNum)
          const stratId   = assignments[k]
          const strat     = stratId ? strategiesById[stratId] : null
          const wdIdx     = (idx % 7)
          const isWeekend = wdIdx >= 5
          const isToday   = k === todayK

          // CSS custom property per il colore dinamico (canale prescritto per dati runtime).
          const styleVar = strat
            ? ({ '--day-color': strat.colore } as React.CSSProperties)
            : undefined

          const handleEnter = (e: React.SyntheticEvent<HTMLButtonElement>) => {
            if (!strat) return
            const r = e.currentTarget.getBoundingClientRect()
            onShowTip({
              strat,
              date: new Date(year, month, dayNum),
              x:    r.left + r.width / 2,
              y:    r.top,
            })
          }
          const handleLeave = () => onShowTip(null)

          return (
            <button
              key={idx}
              type="button"
              className={clsx(
                'cal-strategie__day',
                strat      && 'cal-strategie__day--assigned',
                !strat     && isWeekend && 'cal-strategie__day--we',
                isToday    && 'cal-strategie__day--today',
                !canApply  && 'cal-strategie__day--readonly',
              )}
              style={styleVar}
              aria-label={strat ? `${dayNum} — ${strat.nome}` : `${dayNum}`}
              disabled={!canApply}
              onClick={() => canApply && onToggleDay(k)}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onFocus={handleEnter}
              onBlur={handleLeave}
            >
              <span className="cal-strategie__day-num">{dayNum}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Vista "per righe": ogni mese è una riga di celle 1..31 (etichetta giorno settimana)
function MonthRow({ year, month, assignments, strategiesById, selectedStrategy, eraseMode, onToggleDay, onShowTip }: MonthCardProps) {
  const dim      = daysInMonth(year, month)
  const today    = new Date()
  const todayK   = dayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const canApply = eraseMode || !!selectedStrategy

  return (
    <div className="cal-strategie__row">
      <span className="cal-strategie__row-badge">
        <span className="cal-strategie__row-mon">{MONTH_ABBR[month]}</span>
        <span className="cal-strategie__row-yr">{year}</span>
      </span>
      <div className="cal-strategie__row-days">
        {Array.from({ length: 31 }, (_, i) => {
          const d = i + 1
          if (d > dim) {
            return <span key={i} className="cal-strategie__rcell cal-strategie__rcell--out" aria-hidden="true"/>
          }
          const k         = dayKey(year, month, d)
          const stratId   = assignments[k]
          const strat     = stratId ? strategiesById[stratId] : null
          const wd        = weekdayIndex(year, month, d)
          const isWeekend = wd >= 5
          const isToday   = k === todayK
          const styleVar  = strat ? ({ '--day-color': strat.colore } as React.CSSProperties) : undefined

          const handleEnter = (e: React.SyntheticEvent<HTMLButtonElement>) => {
            if (!strat) return
            const r = e.currentTarget.getBoundingClientRect()
            onShowTip({ strat, date: new Date(year, month, d), x: r.left + r.width / 2, y: r.top })
          }
          const handleLeave = () => onShowTip(null)

          return (
            <button
              key={i}
              type="button"
              className={clsx(
                'cal-strategie__rcell',
                strat     && 'cal-strategie__rcell--assigned',
                !strat    && isWeekend && 'cal-strategie__rcell--we',
                isToday   && 'cal-strategie__rcell--today',
                !canApply && 'cal-strategie__rcell--readonly',
              )}
              style={styleVar}
              aria-label={strat ? `${d} — ${strat.nome}` : `${d}`}
              disabled={!canApply}
              onClick={() => canApply && onToggleDay(k)}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onFocus={handleEnter}
              onBlur={handleLeave}
            >
              {WD3[wd]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarioStrategie({ navigate }: { navigate: (p: string) => void }) {
  const initRange = useMemo(defaultRange, [])

  const [dateFrom,         setDateFrom]         = useState(initRange.from)
  const [dateTo,           setDateTo]           = useState(initRange.to)
  const [struttura,        setStruttura]        = useState(STRUTTURE[0])
  const [tipoCalendario,   setTipoCalendario]   = useState<TipoCalendario>('Tariffe')
  const [selectedStrategy, setSelectedStrategy] = useState<string>('inverno-25')
  const [eraseMode,        setEraseMode]        = useState(false)
  const [saved,            setSaved]            = useState(false)
  const [search,           setSearch]           = useState('')
  const [assignments,      setAssignments]      = useState<Record<string, string>>({})
  const [tip,              setTip]              = useState<StrategyTooltipState | null>(null)
  const [calView,          setCalView]          = useState<'grid' | 'rows'>('grid')

  const strategiesById = STRATEGIES_BY_ID

  const filteredStrategies = useMemo(() => {
    const q = search.trim().toLowerCase()
    return STRATEGIES
      .filter(s => s.tipo === tipoCalendario)
      .filter(s => !q || s.nome.toLowerCase().includes(q) || s.descrizione.toLowerCase().includes(q))
  }, [search, tipoCalendario])

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

  const activeStrategy = eraseMode ? null : (strategiesById[selectedStrategy] || null)

  const counts = useMemo(() => {
    const acc: Record<string, number> = {}
    Object.values(assignments).forEach(id => { acc[id] = (acc[id] || 0) + 1 })
    return acc
  }, [assignments])

  const totalAssigned = Object.keys(assignments).length

  const handleToggleDay = (key: string) => {
    setAssignments(prev => {
      const next = { ...prev }
      if (eraseMode) {
        delete next[key]
      } else if (activeStrategy) {
        if (next[key] === activeStrategy.id) delete next[key]
        else next[key] = activeStrategy.id
      }
      return next
    })
  }

  const handleSave = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 3000)
  }

  const handleClearAll = () => {
    if (totalAssigned === 0) return
    if (window.confirm('Rimuovere tutte le strategie applicate al periodo visualizzato?')) {
      setAssignments({})
    }
  }

  const handleSelectStrategy = (id: string) => {
    setSelectedStrategy(id)
    setEraseMode(false)
  }

  return (
    <div className="cal-strategie">
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader
        title="Calendario strategie"
        subtitle="Pianifica le tue strategie giorno per giorno: scegli un periodo, una struttura, il tipo di calendario, seleziona la strategia e applicala con un click."
      />

      {saved && <AlertBanner type="success">Modifiche salvate con successo</AlertBanner>}

      {/* ── Filtri ──────────────────────────────────────────────────── */}
      <div className="cal-strategie__filters">
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
          className="cal-strategie__filter cal-strategie__filter--struttura"
        />
        <SelectField
          name="tipoCalendario"
          label="Tipo calendario"
          value={tipoCalendario}
          onChange={e => setTipoCalendario(e.target.value as TipoCalendario)}
          options={TIPI_CALENDARIO.map(o => ({ value: o, label: o }))}
          className="cal-strategie__filter"
        />

        <div className="cal-strategie__filters-spacer" aria-hidden="true"/>

        <div className="cal-strategie__viewtoggle" role="group" aria-label="Visualizzazione calendario">
          <button
            type="button"
            className={clsx('cal-strategie__viewbtn', calView === 'grid' && 'cal-strategie__viewbtn--on')}
            aria-pressed={calView === 'grid'}
            title="Vista calendari"
            onClick={() => setCalView('grid')}
          >
            <i className="fa-light fa-grid-2" aria-hidden="true"/>
          </button>
          <button
            type="button"
            className={clsx('cal-strategie__viewbtn', calView === 'rows' && 'cal-strategie__viewbtn--on')}
            aria-pressed={calView === 'rows'}
            title="Vista per righe"
            onClick={() => setCalView('rows')}
          >
            <i className="fa-light fa-list" aria-hidden="true"/>
          </button>
        </div>

        <button
          type="button"
          className="sib-btn sib-btn--secondary cal-strategie__btn"
          onClick={() => navigate('calendario-master')}
        >
          <i className="fa-duotone fa-calendar-days" aria-hidden="true"/>
          Calendario master
        </button>
        <button
          type="button"
          className="sib-btn sib-btn--primary cal-strategie__btn"
          onClick={() => navigate('crea-strategia')}
        >
          <i className="fa-duotone fa-plus" aria-hidden="true"/>
          Crea strategia
        </button>
      </div>

      {/* ── Status bar contestuale ──────────────────────────────────── */}
      <div className="cal-strategie__statusbar" role="status">
        {eraseMode ? (
          <>
            <i className="fa-duotone fa-eraser cal-strategie__statusbar-icon cal-strategie__statusbar-icon--erase" aria-hidden="true"/>
            <span>Modalità deseleziona attiva — clicca un giorno per togliere la strategia</span>
          </>
        ) : activeStrategy ? (
          <>
            <span
              className="cal-strategie__statusbar-dot"
              style={{ '--day-color': activeStrategy.colore } as React.CSSProperties}
              aria-hidden="true"
            />
            <span>
              Applicherai <strong>{activeStrategy.nome}</strong> ai giorni che cliccherai
              <span className="cal-strategie__statusbar-sep">•</span>
              <span className="cal-strategie__statusbar-meta">{activeStrategy.descrizione}</span>
            </span>
          </>
        ) : (
          <span>Seleziona una strategia dalla colonna a sinistra per iniziare</span>
        )}
        <span className="cal-strategie__statusbar-total">
          {totalAssigned} {totalAssigned === 1 ? 'giorno applicato' : 'giorni applicati'}
        </span>
      </div>

      {/* ── Layout: sidebar strategie + griglia calendario ──────────── */}
      <div className="cal-strategie__layout">
        <aside className="cal-strategie__sidebar" aria-label="Strategie disponibili">
          <header className="cal-strategie__sidebar-header">
            <div className="cal-strategie__sidebar-title">Strategie</div>
            <span className="cal-strategie__sidebar-count">{filteredStrategies.length}</span>
          </header>

          <div className="cal-strategie__sidebar-search">
            <label className="cal-strategie__search-label" htmlFor="cercaStrategia">Cerca</label>
            <SearchField
              name="cercaStrategia"
              placeholder="Cerca strategia…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <div className="cal-strategie__sidebar-list" role="listbox" aria-label="Strategie">
            {filteredStrategies.length === 0 ? (
              <div className="cal-strategie__sidebar-empty">
                Nessuna strategia trovata per <strong>{tipoCalendario}</strong>.
              </div>
            ) : (
              filteredStrategies.map(s => {
                const isActive = !eraseMode && selectedStrategy === s.id
                const count    = counts[s.id] || 0
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={clsx(
                      'cal-strategie__strat',
                      isActive && 'cal-strategie__strat--active',
                    )}
                    style={{ '--strat-color': s.colore } as React.CSSProperties}
                    onClick={() => handleSelectStrategy(s.id)}
                    title={s.descrizione}
                  >
                    <span className="cal-strategie__strat-dot" aria-hidden="true"/>
                    <span className="cal-strategie__strat-body">
                      <span className="cal-strategie__strat-name">{s.nome}</span>
                      <span className="cal-strategie__strat-desc">{s.descrizione}</span>
                    </span>
                    {count > 0 && (
                      <span className="cal-strategie__strat-count" aria-label={`${count} giorni applicati`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <footer className="cal-strategie__sidebar-footer">
            <button
              type="button"
              className={clsx(
                'cal-strategie__tool',
                eraseMode && 'cal-strategie__tool--active',
              )}
              onClick={() => setEraseMode(v => !v)}
              title="Deseleziona la strategia dai giorni che cliccherai"
            >
              <i className="fa-duotone fa-eraser" aria-hidden="true"/>
              Deseleziona
            </button>
            <button
              type="button"
              className="cal-strategie__tool"
              onClick={handleClearAll}
              disabled={totalAssigned === 0}
              title="Azzera tutte le assegnazioni del periodo"
            >
              <i className="fa-duotone fa-trash" aria-hidden="true"/>
              Azzera
            </button>
            <button
              type="button"
              className="sib-btn sib-btn--primary cal-strategie__sidebar-save"
              onClick={handleSave}
            >
              <i className="fa-duotone fa-floppy-disk" aria-hidden="true"/>
              Salva
            </button>
          </footer>
        </aside>

        <div className="cal-strategie__content">
          {months.length === 0 ? (
            <div className="cal-strategie__empty">
              Periodo non valido — controlla le date selezionate.
            </div>
          ) : calView === 'grid' ? (
            <div className="cal-strategie__grid">
              {months.map(({ year, month }) => (
                <MonthCard
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  assignments={assignments}
                  strategiesById={strategiesById}
                  selectedStrategy={activeStrategy}
                  eraseMode={eraseMode}
                  onToggleDay={handleToggleDay}
                  onShowTip={setTip}
                />
              ))}
            </div>
          ) : (
            <div className="cal-strategie__rows">
              <div className="cal-strategie__rows-inner">
                <div className="cal-strategie__rows-head">
                  <span className="cal-strategie__rows-corner" aria-hidden="true"/>
                  <div className="cal-strategie__rows-nums">
                    {Array.from({ length: 31 }, (_, i) => (
                      <span key={i} className="cal-strategie__rows-daynum">{i + 1}</span>
                    ))}
                  </div>
                </div>
                {months.map(({ year, month }) => (
                  <MonthRow
                    key={`${year}-${month}`}
                    year={year}
                    month={month}
                    assignments={assignments}
                    strategiesById={strategiesById}
                    selectedStrategy={activeStrategy}
                    eraseMode={eraseMode}
                    onToggleDay={handleToggleDay}
                    onShowTip={setTip}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {tip && <StrategyTooltip tip={tip}/>}
    </div>
  )
}
