import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../services/api'
import { DateRangeField } from '../../../core/components/form'
import './MaintenanceAnalysis.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DettaglioMese {
  reparto: string
  gen: number
  feb: number
  mar: number
  apr: number
}

interface PersonaleBar {
  nominativo: string
  interventi: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  tipiCamera: string[]
  tipoCameraSel: string
  dettaglio: DettaglioMese[]
  trend: { label: string; value: number }[]
  personale: PersonaleBar[]
}

const FALLBACK: Data = {
  Strutture: [
    { Id: 0, nome: 'Tutte le Strutture' },
    { Id: 1, nome: 'Hotel Azzurro Mare' },
  ],
  StrutturaId: 0,
  tipiCamera: ['Tutte', 'Singola classic', 'Doppia classic'],
  tipoCameraSel: 'Tutte',
  dettaglio: [
    { reparto: 'Pulizie',      gen: 0, feb: 0, mar: 2, apr: 5  },
    { reparto: 'Manutenzione', gen: 0, feb: 0, mar: 6, apr: 17 },
  ],
  trend: [
    { label: 'Gen 26', value: 0 },
    { label: 'Feb 26', value: 0 },
    { label: 'Mar 26', value: 8 },
    { label: 'Apr 26', value: 22 },
  ],
  personale: [
    { nominativo: 'Segnalazioni camere', interventi: 30 },
  ],
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function MaintenanceAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [dataDa, setDataDa] = useState('2026-01-01')
  const [dataA, setDataA] = useState('2026-04-30')
  const [tipoCamera, setTipoCamera] = useState('Tutte')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetMaintenanceAnalysis', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: dataDa, a: dataA, tipoCamera },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDa, dataA, data.StrutturaId, tipoCamera])

  const toggleRow = (reparto: string) =>
    setExpandedRows((p) => {
      const next = new Set(p)
      if (next.has(reparto)) next.delete(reparto); else next.add(reparto)
      return next
    })

  const maxBar = Math.max(...data.personale.map((p) => p.interventi), 30)
  const maxTrend = Math.max(...data.trend.map((t) => t.value), 10)

  return (
    <div className="maint-an">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Maintenance analysis"
        subtitle="Monitoraggio e analisi degli interventi di manutenzione per camere e strutture"
      />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="maint-an__bar">
        <div className="maint-an__field">
          <label>Struttura</label>
          <select className="sib-select maint-an__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value === '' ? null : Number(e.target.value) })}>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <DateRangeField
          className="maint-an__field"
          nameFrom="dataDa"
          nameTo="dataA"
          label="Intervallo"
          valueFrom={dataDa}
          valueTo={dataA}
          onChangeFrom={(e) => setDataDa(e.target.value)}
          onChangeTo={(e) => setDataA(e.target.value)}
        />
        <button type="button" className="sib-btn sib-btn--primary maint-an__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
        <button type="button" className="sib-btn sib-btn--icon maint-an__info" title="Info" aria-label="Info">
          <i className="fa-light fa-circle-info" />
        </button>
      </div>

      {/* ─── Tipi camera ───────────────────────────────────────────────────── */}
      <div className="maint-an__section maint-an__section--tipi">
        <div className="maint-an__section-title">Tipi camera</div>
        <div className="maint-an__tipi-row">
          {data.tipiCamera.map((t) => (
            <button
              key={t}
              type="button"
              className={'maint-an__tipo-pill' + (tipoCamera === t ? ' maint-an__tipo-pill--active' : '')}
              onClick={() => setTipoCamera(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="maint-an__side-label maint-an__side-label--right">ROOMS NUMBER</div>
      </div>

      {/* ─── Dettaglio interventi + Trend ──────────────────────────────────── */}
      <div className="maint-an__section maint-an__section--dettaglio">
        <div className="maint-an__side-label">DETTAGLIO</div>
        <div className="maint-an__section-content">
          <div className="maint-an__section-title">Dettaglio interventi</div>
          <table className="sib-table maint-an__matrix">
            <thead>
              <tr>
                <th>Reparto/Intervento</th>
                <th className="maint-an__td-num">Gen 26</th>
                <th className="maint-an__td-num">Feb 26</th>
                <th className="maint-an__td-num">Mar 26</th>
                <th className="maint-an__td-num">Apr 26</th>
              </tr>
            </thead>
            <tbody>
              {data.dettaglio.map((d) => (
                <React.Fragment key={d.reparto}>
                  <tr>
                    <td>
                      <button type="button" className="maint-an__expand-btn" onClick={() => toggleRow(d.reparto)} aria-label={expandedRows.has(d.reparto) ? 'Comprimi' : 'Espandi'}>
                        <i className={`fa-light fa-${expandedRows.has(d.reparto) ? 'circle-minus' : 'circle-plus'}`} />
                      </button>
                      <span>{d.reparto}</span>
                    </td>
                    <td className="maint-an__td-num">{d.gen}</td>
                    <td className="maint-an__td-num">{d.feb}</td>
                    <td className="maint-an__td-num">{d.mar}</td>
                    <td className="maint-an__td-num">{d.apr}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="maint-an__section maint-an__section--trend">
        <div className="maint-an__side-label">TREND</div>
        <div className="maint-an__section-content">
          <svg className="maint-an__trend-svg" viewBox="0 0 800 180" preserveAspectRatio="none">
            {data.trend.map((t, i) => {
              const x = 60 + (i / Math.max(data.trend.length - 1, 1)) * 700
              const y = 160 - (t.value / maxTrend) * 130
              const next = data.trend[i + 1]
              return (
                <g key={i}>
                  {next && (() => {
                    const nx = 60 + ((i + 1) / Math.max(data.trend.length - 1, 1)) * 700
                    const ny = 160 - (next.value / maxTrend) * 130
                    return <line x1={x} y1={y} x2={nx} y2={ny} stroke="#1F4E5F" strokeWidth={2} />
                  })()}
                  <circle cx={x} cy={y} r={4} fill="#1F4E5F" />
                  <text x={x} y={175} textAnchor="middle" fontSize="11" fill="#888">{t.label}</text>
                  <text x={x} y={y - 8} textAnchor="middle" fontSize="11" fill="#1F4E5F" fontWeight="600">{t.value}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* ─── Personale ─────────────────────────────────────────────────────── */}
      <div className="maint-an__section maint-an__section--personale">
        <div className="maint-an__side-label">PERSONALE</div>
        <div className="maint-an__section-content">
          <div className="maint-an__section-title">
            Interventi per personale
            <button type="button" className="maint-an__personale-ico" title="Personale" aria-label="Personale">
              <i className="fa-light fa-users" />
            </button>
          </div>

          <div className="maint-an__bars">
            <div className="maint-an__bars-yaxis">
              {[30, 20, 10, 0].map((v) => (
                <div key={v} className="maint-an__bars-tick">{v}</div>
              ))}
            </div>
            <div className="maint-an__bars-area">
              {data.personale.map((p, i) => (
                <div key={i} className="maint-an__bar-row">
                  <div className="maint-an__bar" style={{ '--bar-h': `${(p.interventi / maxBar) * 100}%` } as React.CSSProperties} />
                  <div className="maint-an__bar-label">{p.nominativo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
