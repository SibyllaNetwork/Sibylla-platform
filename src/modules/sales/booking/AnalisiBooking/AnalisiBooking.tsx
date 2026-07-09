import React, { useState, useRef, useEffect } from 'react'
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
const CATEGORIE = ['Tutte','Standard','Superior','Suite']

const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

// Genera dati giornalieri mock per il grafico (deterministici per seed = riga selezionata)
function genChartData(mese: number, anno: number, capienza: number, seed = 'tot') {
  const giorni = new Date(anno, mese, 0).getDate()
  let s = hashStr(seed) || 1
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const data: { giorno: string; vendute: number }[] = []
  for (let d = 1; d <= giorni; d++) {
    const label = `${String(d).padStart(2,'0')}/${String(mese).padStart(2,'0')}/${anno}`
    const peak = d >= 7 && d <= 10 ? Math.round(capienza * (0.7 + rnd() * 0.3)) : d >= 15 && d <= 17 ? Math.round(capienza * 0.24) : Math.round(rnd() * capienza * 0.18)
    data.push({ giorno: label, vendute: peak })
  }
  return data
}

// ── Chart SVG semplice ────────────────────────────────────────────────────────
function LineChart({ data, capienza }: { data: { giorno: string; vendute: number }[], capienza: number }) {
  const W = 660; const H = 240; const PL = 36; const PR = 10; const PT = 10; const PB = 50
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const maxY = Math.ceil(capienza * 1.15)
  const n = data.length

  const toX = (i: number) => PL + (i / (n - 1)) * chartW
  const toY = (v: number) => PT + chartH - (v / maxY) * chartH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.vendute).toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${toX(n - 1).toFixed(1)},${(PT + chartH).toFixed(1)} L${PL},${(PT + chartH).toFixed(1)} Z`

  // Y axis ticks
  const yTicks = [0, 5, 10, 15, 20, 25, Math.ceil(capienza * 1.1)].filter(v => v <= maxY)

  // X axis labels — ogni 5 giorni
  const xLabels = data.filter((_, i) => i % 4 === 0 || i === n - 1)

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

      {/* Area fill */}
      <path d={areaPath} fill="#9DD7E8" fillOpacity={0.35} />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#5C9CD4" strokeWidth={1.8} />

      {/* X labels */}
      {xLabels.map((d, i) => {
        const idx = data.indexOf(d)
        return (
          <text key={i} x={toX(idx)} y={H - 8} textAnchor="middle"
            fontSize={8.5} fill={T.textDisabled}
            transform={`rotate(-40, ${toX(idx)}, ${H - 8})`}>
            {d.giorno.slice(0, 5)}
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
  const [mese,      setMese]      = useState(4)
  const [anno,      setAnno]      = useState(2026)
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [categoria, setCategoria] = useState('Tutte')

  const capienza  = 25
  const [selectedOp, setSelectedOp] = useState('tot')
  const selName = selectedOp === 'tot' ? 'totale' : (OPERATORI.find((o) => o.id === selectedOp)?.nome ?? 'totale')
  const chartData = genChartData(mese, anno, capienza, selectedOp)

  const totale = {
    produzione:   OPERATORI.reduce((s, o) => s + o.produzione, 0),
    riempimento:  OPERATORI.reduce((s, o) => s + o.riempimento, 0) / OPERATORI.length,
    giorniExtra:  OPERATORI.reduce((s, o) => s + o.giorniExtra, 0),
    servizi:      OPERATORI.reduce((s, o) => s + o.servizi, 0),
    adr:          OPERATORI.reduce((s, o) => s + o.adr, 0) / OPERATORI.length,
    camere:       OPERATORI.reduce((s, o) => s + o.camere, 0),
    ricavo:       OPERATORI.reduce((s, o) => s + o.ricavo, 0),
  }
  const eur = (v: number) => v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  return (
    <div className="analisi-booking">
      <PageHead title="Analisi booking" subtitle="Dashboard su revenue, tasso di occupazione, giorni extra e servizi venduti"/>

      {/* ── Filtri ── */}
      <div className="analisi-booking__filters">
        <SelectField
          label="Mese"
          name="mese"
          className="w-[130px]"
          value={mese}
          onChange={e => setMese(+e.target.value)}
          options={MESI.map((m, i) => ({ value: i + 1, label: m }))}
        />
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
              {OPERATORI.map(op => (
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
          <div className="analisi-booking__chart-title">Riempimento mensile — {selName}</div>
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
            <LineChart data={chartData} capienza={capienza} />
          </div>
        </div>

      </div>
    </div>
  )
}
