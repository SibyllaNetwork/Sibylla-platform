import React, { useState } from 'react'
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

// ── Chart SVG semplice (supporta una o piu mensilita concatenate) ───────────────
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

  // Y axis ticks
  const yTicks = [0, 5, 10, 15, 20, 25, Math.ceil(capienza * 1.1)].filter(v => v <= maxY)

  // X axis labels: piu mesi -> nome mese al centro di ogni segmento; un mese -> giorni
  const dayLabels = multi ? [] : data.filter((_, i) => i % 4 === 0 || i === n - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke={T.border} strokeWidth={0.5} />
          <text x={PL - 4} y={toY(v) + 3} textAnchor="end" fontSize={9} fill={T.textDisabled}>{v}</text>
        </g>
      ))}

      {/* Capienza massima — dashed red */}
      <line x1={PL} y1={toY(capienza)} x2={W - PR} y2={toY(capienza)}
        stroke="#E74C3C" strokeWidth={1.5} strokeDasharray="6 4" />

      {/* Separatori di mese (solo multi-mese) */}
      {multi && segments.map((seg, i) => {
        if (i === 0) return null
        const xb = (toX(seg.start - 1) + toX(seg.start)) / 2
        return <line key={`sep-${i}`} x1={xb} y1={PT} x2={xb} y2={PT + chartH} stroke={T.border} strokeWidth={0.75} strokeDasharray="3 3" />
      })}

      {/* Area fill */}
      <path d={areaPath} fill="#9DD7E8" fillOpacity={0.35} />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#5C9CD4" strokeWidth={1.8} />

      {/* X labels — giorni (mese singolo) */}
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

      {/* X labels — nomi mese (multi-mese) */}
      {multi && segments.map((seg, i) => {
        const xMid = (toX(seg.start) + toX(seg.start + seg.count - 1)) / 2
        return (
          <text key={`m-${i}`} x={xMid} y={H - 12} textAnchor="middle" fontSize={10} fontWeight={600} fill={T.textInactive}>
            {seg.label}
          </text>
        )
      })}

      {/* Y axis label */}
      <text x={10} y={PT + chartH / 2} textAnchor="middle" fontSize={9} fill={T.textDisabled}
        transform={`rotate(-90, 10, ${PT + chartH / 2})`}>Quantità</text>
    </svg>
  )
}

// ── Componente principale ─────────────────────────────────────────────────────
export default function AnalisiBooking({ navigate }: { navigate: (p: string) => void }) {
  // Una o piu mensilita selezionate contemporaneamente
  const [mesi,      setMesi]      = useState<number[]>([4])
  const [anno,      setAnno]      = useState(2026)
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [categoria, setCategoria] = useState('Tutte')

  const capienza  = 25
  const [selectedOp, setSelectedOp] = useState('tot')
  const selName = selectedOp === 'tot' ? 'totale' : (OPERATORI.find((o) => o.id === selectedOp)?.nome ?? 'totale')

  // Toggle di una mensilita (resta sempre almeno un mese selezionato)
  const toggleMese = (m: number) =>
    setMesi(prev => prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m])

  const mesiSorted = [...mesi].sort((a, b) => a - b)
  const nMesi = mesiSorted.length || 1

  // Grafico: giorni di tutti i mesi selezionati concatenati + segmenti per i separatori
  const chartData: { giorno: string; vendute: number }[] = []
  const segments: Segment[] = []
  mesiSorted.forEach(m => {
    const days = genChartData(m, anno, capienza, selectedOp)
    segments.push({ label: MESI_ABBR[m - 1], start: chartData.length, count: days.length })
    chartData.push(...days)
  })

  // Tabella: metriche aggregate sul periodo selezionato (le voci additive scalano
  // col numero di mesi; riempimento e ADR restano medie)
  const rows = OPERATORI.map(o => ({
    ...o,
    produzione:  o.produzione  * nMesi,
    giorniExtra: o.giorniExtra * nMesi,
    servizi:     o.servizi     * nMesi,
    camere:      o.camere      * nMesi,
    ricavo:      o.ricavo      * nMesi,
  }))

  const totale = {
    produzione:   rows.reduce((s, o) => s + o.produzione, 0),
    riempimento:  rows.reduce((s, o) => s + o.riempimento, 0) / rows.length,
    giorniExtra:  rows.reduce((s, o) => s + o.giorniExtra, 0),
    servizi:      rows.reduce((s, o) => s + o.servizi, 0),
    adr:          rows.reduce((s, o) => s + o.adr, 0) / rows.length,
    camere:       rows.reduce((s, o) => s + o.camere, 0),
    ricavo:       rows.reduce((s, o) => s + o.ricavo, 0),
  }
  const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  const periodoLabel = mesiSorted.map(m => MESI[m - 1]).join(', ') + ` ${anno}`

  return (
    <div className="analisi-booking">
      <PageHead title="Analisi booking" subtitle="Dashboard su revenue, tasso di occupazione, giorni extra e servizi venduti"/>

      {/* ── Filtri ── */}
      <div className="analisi-booking__filters">
        <div className="analisi-booking__filter analisi-booking__filter--months">
          <span className="analisi-booking__filter-label">Mesi <span className="analisi-booking__hint">(una o più mensilità)</span></span>
          <div className="analisi-booking__months" role="group" aria-label="Selezione mesi">
            {MESI_ABBR.map((m, i) => {
              const val = i + 1
              const active = mesi.includes(val)
              return (
                <Tooltip key={val} text={MESI[i]}>
                  <button
                    type="button"
                    className={'analisi-booking__month-chip' + (active ? ' analisi-booking__month-chip--active' : '')}
                    onClick={() => toggleMese(val)}
                    aria-pressed={active}
                  >
                    {m}
                  </button>
                </Tooltip>
              )
            })}
          </div>
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
                <tr key={op.id} className={'analisi-booking__tr' + (selectedOp === op.id ? ' analisi-booking__tr--selected' : '')} onClick={() => setSelectedOp(op.id)}>
                  <td className="analisi-booking__td analisi-booking__td--name">{op.nome}</td>
                  <td className="analisi-booking__td analisi-booking__td--right">
                    {op.produzione.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                  </td>
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
              ))}
              <tr className={'analisi-booking__tr analisi-booking__tr--total' + (selectedOp === 'tot' ? ' analisi-booking__tr--selected' : '')} onClick={() => setSelectedOp('tot')}>
                <td className="analisi-booking__td">Totale</td>
                <td className="analisi-booking__td analisi-booking__td--right">
                  <strong>{totale.produzione.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</strong>
                </td>
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
            </tbody>
          </table>
        </div>

        {/* Grafico */}
        <div className="analisi-booking__chart-wrap">
          <div className="analisi-booking__chart-title">Riempimento — {selName} · {periodoLabel}</div>
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
          <div className="analisi-booking__chart-area">
            <LineChart data={chartData} capienza={capienza} segments={segments} />
          </div>
        </div>

      </div>
    </div>
  )
}
