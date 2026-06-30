import React, { useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Tooltip from '../../../../core/components/Tooltip'
import { SelectField } from '../../../../core/components/form'
import './PrenotazioniIDS.sass'

type ImportRow = { data: string; prenotazioni: number }

const STRUTTURE = ['Tutte le strutture', 'Hotel Archimede', 'Hotel Floridia', 'Hotel Lazio', 'Hotel Luce', 'Hotel Lux', 'Hotel Noto', 'Hotel Regio']

const HOTEL_DATA: Record<string, ImportRow[]> = {
  'Hotel Archimede': [{ data: '05/04/2026', prenotazioni: 17 }, { data: '06/04/2026', prenotazioni: 21 }, { data: '07/04/2026', prenotazioni: 48 }, { data: '08/04/2026', prenotazioni: 11 }],
  'Hotel Floridia':  [{ data: '05/04/2026', prenotazioni: 8 },  { data: '06/04/2026', prenotazioni: 14 }, { data: '07/04/2026', prenotazioni: 32 }, { data: '08/04/2026', prenotazioni: 6 }],
  'Hotel Lazio':     [{ data: '05/04/2026', prenotazioni: 23 }, { data: '06/04/2026', prenotazioni: 41 }, { data: '07/04/2026', prenotazioni: 19 }, { data: '08/04/2026', prenotazioni: 28 }],
  'Hotel Luce':      [{ data: '05/04/2026', prenotazioni: 55 }, { data: '06/04/2026', prenotazioni: 62 }, { data: '07/04/2026', prenotazioni: 38 }, { data: '08/04/2026', prenotazioni: 44 }],
  'Hotel Lux':       [{ data: '05/04/2026', prenotazioni: 12 }, { data: '06/04/2026', prenotazioni: 9 },  { data: '07/04/2026', prenotazioni: 27 }, { data: '08/04/2026', prenotazioni: 15 }],
  'Hotel Noto':      [{ data: '05/04/2026', prenotazioni: 33 }, { data: '06/04/2026', prenotazioni: 47 }, { data: '07/04/2026', prenotazioni: 52 }, { data: '08/04/2026', prenotazioni: 29 }],
  'Hotel Regio':     [{ data: '05/04/2026', prenotazioni: 18 }, { data: '06/04/2026', prenotazioni: 24 }, { data: '07/04/2026', prenotazioni: 31 }, { data: '08/04/2026', prenotazioni: 16 }],
}

const dateMs = (d: string) => { const [g, m, y] = d.split('/').map(Number); return new Date(y, m - 1, g).getTime() }

export default function PrenotazioniIDS(_props: { navigate?: (p: string) => void } = {}) {
  const [struttura, setStruttura] = useState('Tutte le strutture')
  const [dataUltMod, setDataUltMod] = useState('2026-03-26')

  const hotels = struttura === 'Tutte le strutture' ? Object.keys(HOTEL_DATA) : [struttura]
  const dates = useMemo(
    () => Array.from(new Set(hotels.flatMap((h) => (HOTEL_DATA[h] || []).map((r) => r.data)))).sort((a, b) => dateMs(a) - dateMs(b)),
    [hotels],
  )
  const val = (h: string, d: string) => (HOTEL_DATA[h] || []).find((r) => r.data === d)?.prenotazioni ?? 0
  const maxCell = useMemo(() => hotels.reduce((m, h) => dates.reduce((mm, d) => Math.max(mm, val(h, d)), m), 1), [hotels, dates])
  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / maxCell) * 4)))

  const hotelTot = (h: string) => dates.reduce((s, d) => s + val(h, d), 0)
  const dateTot = (d: string) => hotels.reduce((s, h) => s + val(h, d), 0)
  const globale = hotels.reduce((s, h) => s + hotelTot(h), 0)
  const piccoH = hotels.reduce((best, h) => (hotelTot(h) > hotelTot(best || h) ? h : best), hotels[0])

  return (
    <div className="ids">
      <BtnBack />
      <PageHeader title="Prenotazioni IDS" subtitle="Visione centralizzata per monitoraggio in tempo reale delle prenotazioni ricevute dai canali di distribuzione online" />

      {/* ─── Toolbar + sintesi ─────────────────────────────────────────────── */}
      <div className="ids__bar">
        <div className="ids__filters">
          <div className="ids__field">
            <SelectField name="struttura" label="Struttura" className="ids__select" value={struttura} onChange={(e) => setStruttura(e.target.value)}
              options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
          </div>
          <div className="ids__field">
            <label htmlFor="dataUltMod">Data ultima modifica</label>
            <input id="dataUltMod" type="date" className="sib-input" value={dataUltMod} onChange={(e) => setDataUltMod(e.target.value)} />
          </div>
        </div>
        <div className="ids__summary">
          <span className="ids__sum"><i className="fa-light fa-building" /> {hotels.length} struttur{hotels.length === 1 ? 'a' : 'e'}</span>
          <span className="ids__sum"><i className="fa-light fa-calendar-days" /> {dates.length} import</span>
          <span className="ids__sum ids__sum--peak"><i className="fa-light fa-arrow-trend-up" /> picco: {piccoH}</span>
          <span className="ids__sum ids__sum--tot"><i className="fa-light fa-calendar-check" /> {globale.toLocaleString('it-IT')} prenotazioni</span>
        </div>
      </div>

      {/* ─── Matrice (heatmap) ─────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table ids__matrix">
          <thead>
            <tr>
              <th className="ids__th-name">Struttura</th>
              {dates.map((d) => (
                <th key={d} className="ids__th-date"><Tooltip text={`Import ${d}`}><span>{d.slice(0, 5)}</span></Tooltip></th>
              ))}
              <th className="ids__th-tot">Totale</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h}>
                <td className="ids__name">{h}</td>
                {dates.map((d) => {
                  const v = val(h, d)
                  return <td key={d} className={`ids__cell ids__cell--l${level(v)}`}>{v || <span className="ids__zero">·</span>}</td>
                })}
                <td className="ids__tot">{hotelTot(h)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="ids__name ids__foot-label">Totale</td>
              {dates.map((d) => <td key={d} className="ids__foot-val">{dateTot(d)}</td>)}
              <td className="ids__foot-tot">{globale.toLocaleString('it-IT')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ─── Legenda heatmap ───────────────────────────────────────────────── */}
      <div className="ids__legend">
        <span className="ids__legend-label">Volume prenotazioni</span>
        <span className="ids__legend-scale">
          <span>basso</span>
          <i className="ids__cell--l1" /><i className="ids__cell--l2" /><i className="ids__cell--l3" /><i className="ids__cell--l4" />
          <span>alto</span>
        </span>
      </div>
    </div>
  )
}
