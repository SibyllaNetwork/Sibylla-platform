import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { DateRangeField } from '../../../../core/components/form'
import Tooltip from '../../../../core/components/Tooltip'
import { AreaTrend, type SeriesPoint } from '../_charts/AreaTrend'
import { HOTELS, buildSeries, parseIso, fmtIt, type Day } from './idsData'
import './PrenotazioniIDS.sass'

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const W = 88, H = 22, max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 2) - 1).toFixed(1)}`).join(' ')
  return <svg className="ids__spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`}><polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" /></svg>
}
const sample = (arr: Day[], n: number) => { if (arr.length <= n) return arr.map((d) => d.count); const step = arr.length / n; return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)].count) }

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function PrenotazioniIDS({ navigate }: { navigate?: (p: string) => void } = {}) {
  const [dataDa, setDataDa] = useState('2026-04-01')
  const [dataA, setDataA] = useState('2026-06-30')
  const [selected, setSelected] = useState(HOTELS[3])

  const da = parseIso(dataDa), a = parseIso(dataA)
  const seriesByHotel = useMemo(() => Object.fromEntries(HOTELS.map((h) => [h, buildSeries(h, da, a)])) as Record<string, Day[]>, [dataDa, dataA])
  const totByHotel = useMemo(() => Object.fromEntries(HOTELS.map((h) => [h, seriesByHotel[h].reduce((s, d) => s + d.count, 0)])) as Record<string, number>, [seriesByHotel])

  const giorni = seriesByHotel[HOTELS[0]]?.length ?? 0
  const totale = HOTELS.reduce((s, h) => s + totByHotel[h], 0)
  const maxTot = Math.max(1, ...HOTELS.map((h) => totByHotel[h]))

  const sel = seriesByHotel[selected] ?? []
  const selTot = totByHotel[selected] ?? 0
  const selMedia = giorni ? Math.round(selTot / giorni) : 0
  const selPicco = sel.reduce((b, d) => (d.count > b.count ? d : b), sel[0] ?? { count: 0, label: '-' } as Day)
  const trend: SeriesPoint[] = sel.map((d) => ({ x: d.label, y: d.count }))

  return (
    <div className="ids">
      <PageHead title="Prenotazioni IDS" subtitle="Visione centralizzata per monitoraggio in tempo reale delle prenotazioni ricevute dai canali di distribuzione online" />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="ids__bar">
        <div className="ids__field">
          <DateRangeField nameFrom="dataDa" nameTo="dataA" label="Periodo (dallo scorso anno a oggi)" valueFrom={dataDa} valueTo={dataA}
            onChangeFrom={(e) => setDataDa(e.target.value)} onChangeTo={(e) => setDataA(e.target.value)} />
        </div>
        <div className="ids__summary">
          <span className="ids__sum"><i className="fa-regular fa-building" /> {HOTELS.length} strutture</span>
          <span className="ids__sum"><i className="fa-regular fa-calendar-days" /> {giorni} giorni</span>
          <span className="ids__sum ids__sum--tot"><i className="fa-regular fa-calendar-check" /> {totale.toLocaleString('it-IT')} prenotazioni</span>
        </div>
      </div>

      {/* ─── Master / Detail ───────────────────────────────────────────────── */}
      <div className="ids__split">
        {/* Elenco strutture */}
        <aside className="ids__list">
          {HOTELS.map((h) => (
            <button key={h} type="button" className={'ids__item' + (h === selected ? ' is-sel' : '')} onClick={() => setSelected(h)}>
              <div className="ids__item-top">
                <span className="ids__item-name">{h}</span>
                <span className="ids__item-tot">{totByHotel[h].toLocaleString('it-IT')}</span>
              </div>
              <div className="ids__item-bottom">
                <span className="ids__item-bar"><span className="ids__item-bar-fill" style={{ width: `${Math.round((totByHotel[h] / maxTot) * 100)}%` }} /></span>
                <Spark values={sample(seriesByHotel[h], 20)} />
              </div>
            </button>
          ))}
        </aside>

        {/* Dettaglio giorno per giorno */}
        <section className="ids__detail">
          <div className="ids__detail-head">
            <div>
              <div className="ids__detail-name">{selected}</div>
              <div className="ids__detail-sub">{fmtIt(da)} → {fmtIt(a)}</div>
            </div>
            <div className="ids__detail-kpis">
              <div className="ids__kpi"><span>Totale</span><strong>{selTot.toLocaleString('it-IT')}</strong></div>
              <div className="ids__kpi"><span>Media/giorno</span><strong>{selMedia}</strong></div>
              <div className="ids__kpi"><span>Picco</span><strong>{selPicco?.count} <small>({selPicco?.label?.slice(0, 5)})</small></strong></div>
            </div>
          </div>

          <div className="ids__chart">
            <AreaTrend primary={trend} primaryLabel="Prenotazioni/giorno" primaryColor="#5C9CD4" height={200} />
          </div>

          <div className="ids__daily">
            <div className="ids__daily-title">Dettaglio giorno per giorno</div>
            <div className="ids__daily-scroll">
              <table className="ids__daily-table">
                <thead><tr><th>Data</th><th>Giorno</th><th className="ids__r">Prenotazioni</th></tr></thead>
                <tbody>
                  {sel.map((d) => (
                    <tr key={d.iso} className={d.count === selPicco?.count ? 'is-peak' : undefined}>
                      <td>{d.label}</td>
                      <td className="ids__dow">{d.dow}</td>
                      <td className="ids__r">
                        {d.count > 0 ? (
                          <Tooltip content={`Apri le ${d.count} prenotazioni di ${selected} inserite il ${d.label}`} position="left" variant="dark">
                            <button type="button" className="ids__count ids__count--link"
                              onClick={() => navigate?.(`prenotazioni-ids-dett:${d.iso}|${encodeURIComponent(selected)}`)}>
                              {d.count}
                            </button>
                          </Tooltip>
                        ) : <span className="ids__count">{d.count}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
