import React, { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import { SelectField } from '../../../../core/components/form'
import './AnalisiBooking.sass'

// ── Mock data ─────────────────────────────────────────────────────────────────
const OPERATORI = [
  { id: 'tot', nome: 'Tour Operator Test', produzione: 17000.64, riempimento: 16.27, trend: 'up', giorniExtra: 0, servizi: 0, adr: 100.25, camere: 299, ricavo: 3000.00 },
  { id: 'ota', nome: 'Booking.com',         produzione:  8400.00, riempimento:  9.80, trend: 'up', giorniExtra: 2, servizi: 1, adr: 92.40, camere: 168, ricavo: 1980.00 },
  { id: 'dir', nome: 'Prenotazione diretta',produzione: 12300.00, riempimento: 14.50, trend: 'down', giorniExtra: 0, servizi: 3, adr: 110.80, camere: 221, ricavo: 2640.00 },
]

const STRUTTURE = ['Hotel Tutorial', 'Grim\'s Hotel', 'Hotel Azzurro Mare']
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const MESI_ABBR = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const CATEGORIE = ['Tutte','Standard','Superior','Suite']

const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

// Genera dati giornalieri mock per il grafico (deterministici per seed = riga + mese)
function genChartData(mese: number, anno: number, capienza: number, seed = 'tot') {
  const giorni = new Date(anno, mese, 0).getDate()
  let s = (hashStr(seed) ^ (mese * 2654435761)) >>> 0 || 1
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const data: { giorno: string; vendute: number }[] = []
  for (let d = 1; d <= giorni; d++) {
    const label = `${String(d).padStart(2,'0')}/${String(mese).padStart(2,'0')}/${anno}`
    const peak = d >= 7 && d <= 10 ? Math.round(capienza * (0.7 + rnd() * 0.3)) : d >= 15 && d <= 17 ? Math.round(capienza * 0.24) : Math.round(rnd() * capienza * 0.18)
    data.push({ giorno: label, vendute: peak })
  }
  return data
}

interface Segment { label: string; start: number; count: number }

// ── Multiselect mesi (dropdown con checkbox, pattern dei multiselect condivisi) ─
function MonthMultiSelect({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [open, setOpen] = useState(false)
  const trigRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const reposition = useCallback(() => {
    const trig = trigRef.current
    if (!trig) return
    const r = trig.getBoundingClientRect()
    const popH = popRef.current?.offsetHeight ?? 340
    let top = r.bottom + 4
    if (top + popH > window.innerHeight - 8 && r.top - 4 - popH > 8) top = r.top - 4 - popH
    setPos({ top, left: r.left, width: Math.max(r.width, 240) })
  }, [])

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    reposition()
    const onScroll = () => reposition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, reposition])

  const toggle = (m: number) =>
    onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m])

  const sorted = [...value].sort((a, b) => a - b)
  const summary = sorted.length === 0
    ? 'Seleziona mesi'
    : sorted.length <= 2
      ? sorted.map((m) => MESI[m - 1]).join(', ')
      : `${MESI[sorted[0] - 1]}, ${MESI[sorted[1] - 1]} +${sorted.length - 2}`

  return (
    <div className="abm-ms">
      <button
        ref={trigRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={'abm-ms__trigger' + (open ? ' is-open' : '')}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={'abm-ms__summary' + (sorted.length === 0 ? ' abm-ms__summary--ph' : '')}>{summary}</span>
        <i className="fa-solid fa-chevron-down abm-ms__chev" aria-hidden="true" />
      </button>

      {open && createPortal(
        <>
          <div className="abm-ms__overlay" onClick={() => setOpen(false)} />
          <div
            ref={popRef}
            className="abm-ms__list"
            role="listbox"
            aria-multiselectable="true"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width, visibility: pos ? 'visible' : 'hidden' }}
          >
            <div className="abm-ms__opts">
              {MESI.map((m, i) => {
                const val = i + 1
                const sel = value.includes(val)
                return (
                  <button
                    key={val}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    className={'abm-ms__opt' + (sel ? ' is-selected' : '')}
                    onClick={() => toggle(val)}
                  >
                    <span className={'abm-ms__box' + (sel ? ' is-on' : '')}>
                      {sel && <i className="fa-solid fa-check" aria-hidden="true" />}
                    </span>
                    <span className="abm-ms__opt-name">{m}</span>
                  </button>
                )
              })}
            </div>
            <div className="abm-ms__foot">
              <button type="button" className="abm-ms__foot-btn" onClick={() => onChange(MESI.map((_, i) => i + 1))}>Seleziona tutti</button>
              <button type="button" className="abm-ms__foot-btn" onClick={() => onChange([])} disabled={value.length === 0}>Pulisci</button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}

// ── Chart SVG semplice (supporta una o due mensilita concatenate) ───────────────
function LineChart({ data, capienza, segments }: { data: { giorno: string; vendute: number }[], capienza: number, segments: Segment[] }) {
  const W = 660; const H = 240; const PL = 36; const PR = 10; const PT = 10; const PB = 50
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const maxY = Math.ceil(capienza * 1.15)
  const n = data.length
  const multi = segments.length > 1

  const toX = (i: number) => n <= 1 ? PL : PL + (i / (n - 1)) * chartW
  const toY = (v: number) => PT + chartH - (v / maxY) * chartH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.vendute).toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${toX(n - 1).toFixed(1)},${(PT + chartH).toFixed(1)} L${PL},${(PT + chartH).toFixed(1)} Z`

  const yTicks = [0, 5, 10, 15, 20, 25, Math.ceil(capienza * 1.1)].filter(v => v <= maxY)
  // Mese singolo: etichette giorno/mese ruotate. Multi-mese: numeri-giorno
  // radi (1, 5, 10, …) come dettaglio, piu il nome del mese sotto ogni segmento.
  const dayLabels = multi ? [] : data.filter((_, i) => i % 4 === 0 || i === n - 1)
  const dayTicks = multi
    ? data.map((d, i) => ({ d, i })).filter(({ d }) => { const g = parseInt(d.giorno.slice(0, 2), 10); return g === 1 || g % 5 === 0 })
    : []

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke={T.border} strokeWidth={0.5} />
          <text x={PL - 4} y={toY(v) + 3} textAnchor="end" fontSize={9} fill={T.textDisabled}>{v}</text>
        </g>
      ))}

      <line x1={PL} y1={toY(capienza)} x2={W - PR} y2={toY(capienza)}
        stroke="#E74C3C" strokeWidth={1.5} strokeDasharray="6 4" />

      {multi && segments.map((seg, i) => {
        if (i === 0) return null
        const xb = (toX(seg.start - 1) + toX(seg.start)) / 2
        return <line key={`sep-${i}`} x1={xb} y1={PT} x2={xb} y2={PT + chartH} stroke={T.border} strokeWidth={0.75} strokeDasharray="3 3" />
      })}

      <path d={areaPath} fill="#9DD7E8" fillOpacity={0.35} />
      <path d={linePath} fill="none" stroke="#5C9CD4" strokeWidth={1.8} />

      {dayLabels.map((d, i) => {
        const idx = data.indexOf(d)
        return (
          <text key={i} x={toX(idx)} y={H - 8} textAnchor="middle"
            fontSize={8.5} fill={T.textDisabled}
            transform={`rotate(-40, ${toX(idx)}, ${H - 8})`}>
            {d.giorno.slice(0, 5)}
          </text>
        )
      })}

      {/* Dettaglio giorni (multi-mese) */}
      {dayTicks.map(({ d, i }) => (
        <text key={`d-${i}`} x={toX(i)} y={H - 24} textAnchor="middle" fontSize={8} fill={T.textDisabled}>
          {d.giorno.slice(0, 2)}
        </text>
      ))}

      {/* Nome mese sotto ogni segmento (multi-mese) */}
      {multi && segments.map((seg, i) => {
        const xMid = (toX(seg.start) + toX(seg.start + seg.count - 1)) / 2
        return (
          <text key={`m-${i}`} x={xMid} y={H - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill={T.textInactive}>
            {seg.label}
          </text>
        )
      })}

      <text x={10} y={PT + chartH / 2} textAnchor="middle" fontSize={9} fill={T.textDisabled}
        transform={`rotate(-90, 10, ${PT + chartH / 2})`}>Quantità</text>
    </svg>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function AnalisiBooking({ navigate }: { navigate: (p: string) => void }) {
  // Una o piu mensilita selezionate contemporaneamente (multiselect)
  const [mesi,      setMesi]      = useState<number[]>([4])
  const [anno,      setAnno]      = useState(2026)
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [categoria, setCategoria] = useState('Tutte')

  const capienza  = 25
  const [selectedOp, setSelectedOp] = useState('tot')
  const selName = selectedOp === 'tot' ? 'totale' : (OPERATORI.find((o) => o.id === selectedOp)?.nome ?? 'totale')

  // Righe espandibili: mostrano il dettaglio per mese quando ci sono piu mesi
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExp = (key: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  // Grafico a slider: due mesi per pagina, si scorre con i pulsanti in overlay
  const [pair, setPair] = useState(0)
  const changeMesi = (v: number[]) => { setMesi(v); setPair(0) }

  const mesiSorted = [...mesi].sort((a, b) => a - b)
  const multi = mesiSorted.length > 1

  // Metriche per singolo mese (deterministiche, variano per mese cosi somma/media
  // dei mesi = valore aggregato mostrato nella riga principale)
  const monthMetrics = (op: typeof OPERATORI[number], mese: number) => {
    const f  = 0.70 + (hashStr('f' + mese) % 60) / 100
    const fr = 0.85 + (hashStr('r' + mese + op.id) % 30) / 100
    const fa = 0.95 + (hashStr('a' + mese + op.id) % 11) / 100
    return {
      mese,
      produzione:  op.produzione * f,
      riempimento: op.riempimento * fr,
      giorniExtra: Math.round(op.giorniExtra * f),
      servizi:     Math.round(op.servizi * f),
      adr:         op.adr * fa,
      camere:      Math.round(op.camere * f),
      ricavo:      op.ricavo * f,
    }
  }
  type MM = ReturnType<typeof monthMetrics>
  const sumK = (a: MM[], k: keyof MM) => a.reduce((s, x) => s + (x[k] as number), 0)
  const avgK = (a: MM[], k: keyof MM) => a.length ? sumK(a, k) / a.length : 0
  const aggregate = (a: MM[]) => ({
    produzione: sumK(a, 'produzione'), riempimento: avgK(a, 'riempimento'),
    giorniExtra: sumK(a, 'giorniExtra'), servizi: sumK(a, 'servizi'),
    adr: avgK(a, 'adr'), camere: sumK(a, 'camere'), ricavo: sumK(a, 'ricavo'),
  })

  const rows = OPERATORI.map(op => {
    const months = mesiSorted.map(m => monthMetrics(op, m))
    return { ...op, months, ...aggregate(months) }
  })

  // Totale: per ogni mese somma i canali, poi aggrega sui mesi
  const totMonths: MM[] = mesiSorted.map(m => {
    const mm = OPERATORI.map(o => monthMetrics(o, m))
    return {
      mese: m,
      produzione: sumK(mm, 'produzione'), riempimento: avgK(mm, 'riempimento'),
      giorniExtra: sumK(mm, 'giorniExtra'), servizi: sumK(mm, 'servizi'),
      adr: avgK(mm, 'adr'), camere: sumK(mm, 'camere'), ricavo: sumK(mm, 'ricavo'),
    }
  })
  const totale = aggregate(totMonths)

  const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  // Finestra dello slider: due mesi per pagina
  const pages = Math.max(1, Math.ceil(mesiSorted.length / 2))
  const curPair = Math.min(pair, pages - 1)
  const windowMonths = multi ? mesiSorted.slice(curPair * 2, curPair * 2 + 2) : mesiSorted

  const chartData: { giorno: string; vendute: number }[] = []
  const segments: Segment[] = []
  windowMonths.forEach(m => {
    const days = genChartData(m, anno, capienza, selectedOp)
    segments.push({ label: MESI_ABBR[m - 1], start: chartData.length, count: days.length })
    chartData.push(...days)
  })
  const windowLabel = windowMonths.map(m => MESI[m - 1]).join(' – ') + ` ${anno}`

  return (
    <div className="analisi-booking">
      <PageHead title="Analisi booking" subtitle="Dashboard su revenue, tasso di occupazione, giorni extra e servizi venduti"/>

      {/* ── Filtri ── */}
      <div className="analisi-booking__filters">
        <div className="analisi-booking__filter analisi-booking__filter--months">
          <span className="analisi-booking__filter-label">Mesi <span className="analisi-booking__hint">(una o più mensilità)</span></span>
          <MonthMultiSelect value={mesi} onChange={changeMesi} />
        </div>
        <SelectField
          label="Anno"
          name="anno"
          className="w-[90px]"
          value={anno}
          onChange={e => setAnno(+e.target.value)}
          options={[2024, 2025, 2026, 2027].map(y => ({ value: y, label: String(y) }))}
        />
        <SelectField
          label="Struttura"
          name="struttura"
          className="w-[180px]"
          value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
        />
        <SelectField
          label="Categoria"
          name="categoria"
          className="w-[110px]"
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          options={CATEGORIE.map(c => ({ value: c, label: c }))}
        />
      </div>

      {/* ── Body ── */}
      <div className="analisi-booking__body">

        {/* Tabella */}
        <div className="analisi-booking__table-wrap">
          <table className="analisi-booking__table">
            <thead>
              <tr>
                <th className="analisi-booking__th">Nome</th>
                <th className="analisi-booking__th analisi-booking__th--right">Produzione</th>
                <th className="analisi-booking__th analisi-booking__th--right">Riempimento</th>
                <th className="analisi-booking__th analisi-booking__th--right">Giorni extra</th>
                <th className="analisi-booking__th analisi-booking__th--right">Servizi</th>
                <th className="analisi-booking__th analisi-booking__th--right">
                  <Tooltip text="ADR — Average Daily Rate (ricavo medio per notte)">
                    <span className="analisi-booking__th-ico">ADR <i className="fa-sharp fa-light fa-chart-radar analisi-booking__adr-ico" /></span>
                  </Tooltip>
                </th>
                <th className="analisi-booking__th analisi-booking__th--right">
                  <Tooltip text="Camere / notti vendute"><i className="fa-light fa-bed-front" /></Tooltip>
                </th>
                <th className="analisi-booking__th analisi-booking__th--right">
                  <Tooltip text="Ricavo"><i className="fa-light fa-euro-sign" /></Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(op => (
                <React.Fragment key={op.id}>
                  <tr className={'analisi-booking__tr' + (selectedOp === op.id ? ' analisi-booking__tr--selected' : '')} onClick={() => setSelectedOp(op.id)}>
                    <td className="analisi-booking__td analisi-booking__td--name">
                      {multi && (
                        <button type="button" className="analisi-booking__exp-btn" aria-label={expanded.has(op.id) ? 'Nascondi dettaglio mensile' : 'Mostra dettaglio mensile'}
                          onClick={(e) => { e.stopPropagation(); toggleExp(op.id) }}>
                          <i className={`fa-solid fa-chevron-${expanded.has(op.id) ? 'down' : 'right'}`} />
                        </button>
                      )}
                      {op.nome}
                    </td>
                    <td className="analisi-booking__td analisi-booking__td--right">{eur(op.produzione)}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">
                      <div className="analisi-booking__riempimento">
                        {op.riempimento.toFixed(2)} %
                        <Tooltip text="Mostra grafico di questa riga">
                          <button type="button" className="analisi-booking__chart-btn" aria-label="Mostra grafico"
                            onClick={(e) => { e.stopPropagation(); setSelectedOp(op.id) }}>
                            <Ico n="chart-line" s={13} c={selectedOp === op.id ? T.primary : (op.trend === 'up' ? T.success : T.error)} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                    <td className="analisi-booking__td analisi-booking__td--right">{op.giorniExtra}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{op.servizi}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{eur(op.adr)}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{op.camere}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{eur(op.ricavo)}</td>
                  </tr>
                  {multi && expanded.has(op.id) && op.months.map(mm => (
                    <tr key={op.id + '-' + mm.mese} className="analisi-booking__tr analisi-booking__subtr">
                      <td className="analisi-booking__td analisi-booking__td--month">{MESI[mm.mese - 1]}</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{eur(mm.produzione)}</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{mm.riempimento.toFixed(2)} %</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{mm.giorniExtra}</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{mm.servizi}</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{eur(mm.adr)}</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{mm.camere}</td>
                      <td className="analisi-booking__td analisi-booking__td--right">{eur(mm.ricavo)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              <React.Fragment key="__total">
                <tr className={'analisi-booking__tr analisi-booking__tr--total' + (selectedOp === 'tot' ? ' analisi-booking__tr--selected' : '')} onClick={() => setSelectedOp('tot')}>
                  <td className="analisi-booking__td">
                    {multi && (
                      <button type="button" className="analisi-booking__exp-btn" aria-label={expanded.has('__total') ? 'Nascondi dettaglio mensile' : 'Mostra dettaglio mensile'}
                        onClick={(e) => { e.stopPropagation(); toggleExp('__total') }}>
                        <i className={`fa-solid fa-chevron-${expanded.has('__total') ? 'down' : 'right'}`} />
                      </button>
                    )}
                    Totale
                  </td>
                  <td className="analisi-booking__td analisi-booking__td--right"><strong>{eur(totale.produzione)}</strong></td>
                  <td className="analisi-booking__td analisi-booking__td--right">
                    <div className="analisi-booking__riempimento">
                      <strong>{totale.riempimento.toFixed(2)} %</strong>
                      <Tooltip text="Mostra grafico totale">
                        <button type="button" className="analisi-booking__chart-btn" aria-label="Mostra grafico"
                          onClick={(e) => { e.stopPropagation(); setSelectedOp('tot') }}>
                          <Ico n="chart-line" s={13} c={T.primary} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="analisi-booking__td analisi-booking__td--right"><strong>{totale.giorniExtra}</strong></td>
                  <td className="analisi-booking__td analisi-booking__td--right"><strong>{totale.servizi}</strong></td>
                  <td className="analisi-booking__td analisi-booking__td--right"><strong>{eur(totale.adr)}</strong></td>
                  <td className="analisi-booking__td analisi-booking__td--right"><strong>{totale.camere}</strong></td>
                  <td className="analisi-booking__td analisi-booking__td--right"><strong>{eur(totale.ricavo)}</strong></td>
                </tr>
                {multi && expanded.has('__total') && totMonths.map(mm => (
                  <tr key={'__total-' + mm.mese} className="analisi-booking__tr analisi-booking__subtr analisi-booking__subtr--total">
                    <td className="analisi-booking__td analisi-booking__td--month">{MESI[mm.mese - 1]}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{eur(mm.produzione)}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{mm.riempimento.toFixed(2)} %</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{mm.giorniExtra}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{mm.servizi}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{eur(mm.adr)}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{mm.camere}</td>
                    <td className="analisi-booking__td analisi-booking__td--right">{eur(mm.ricavo)}</td>
                  </tr>
                ))}
              </React.Fragment>
            </tbody>
          </table>
        </div>

        {/* Grafico */}
        <div className="analisi-booking__chart-wrap">
          <div className="analisi-booking__chart-title">Riempimento — {selName} · {windowLabel}</div>
          <div className="analisi-booking__chart-legend">
            <div className="analisi-booking__legend-item">
              <div className="analisi-booking__legend-line analisi-booking__legend-line--capacity" />
              Capienza Massima ({capienza} camere)
            </div>
            <div className="analisi-booking__legend-item">
              <div className="analisi-booking__legend-line analisi-booking__legend-line--sold" />
              Camere Vendute
            </div>
          </div>
          <div className="analisi-booking__chart-slider">
            <div className="analisi-booking__chart-area">
              <LineChart data={chartData} capienza={capienza} segments={segments} />
            </div>
            {multi && (
              <>
                <button type="button" className="analisi-booking__slide-btn analisi-booking__slide-btn--prev"
                  aria-label="Due mesi precedenti" disabled={curPair === 0}
                  onClick={() => setPair(p => Math.max(0, p - 1))}>
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button type="button" className="analisi-booking__slide-btn analisi-booking__slide-btn--next"
                  aria-label="Due mesi successivi" disabled={curPair >= pages - 1}
                  onClick={() => setPair(p => Math.min(pages - 1, p + 1))}>
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </>
            )}
          </div>
          {multi && (
            <div className="analisi-booking__slide-dots" aria-hidden="true">
              {Array.from({ length: pages }).map((_, i) => (
                <span key={i} className={'analisi-booking__slide-dot' + (i === curPair ? ' is-active' : '')} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
