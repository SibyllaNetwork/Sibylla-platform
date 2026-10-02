import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { SelectField } from '../../../core/components/form'
import { Donut, DonutLegend, type DonutSlice } from '../../sales/distribution/_charts/Donut'
import { AreaTrend, type SeriesPoint } from '../../sales/distribution/_charts/AreaTrend'
import { HBars, type HBar } from '../../sales/distribution/_charts/HBars'
import { useStrutturaPagina, useStruttureCliente } from '../../../hooks/useStrutturaCorrente'
import type { SchedaDemo } from '../../../core/demo/struttureDemo'
import './HrOverview.sass'

const TUTTE = 'Tutte le strutture'
/** Organico di riferimento dei dati base qui sotto: si scala sulla selezione. */
const ORGANICO_BASE = 142

// Organico stimato dalla dimensione e dal tipo della struttura (scheda demo).
const organicoDi = (s: SchedaDemo) =>
  s.categoria === 'bnb' ? 3
    : s.categoria === 'studentato' ? Math.round(s.camere * 0.12) + 6
    : s.camere === 0 ? 14 + (s.seme % 10)
    : Math.round(s.camere * (s.stelle >= 5 ? 1.1 : s.stelle === 4 ? 0.7 : 0.45)) + 8
const ANNI = [2026, 2025, 2024]
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(n)

// ─── KPI ──────────────────────────────────────────────────────────────────────
interface Kpi { icon: string; label: string; value: string; delta?: string; deltaUp?: boolean }
const KPIS: Kpi[] = [
  { icon: 'fa-users',          label: 'Organico totale',     value: '142' },
  { icon: 'fa-user-plus',      label: 'Nuove assunzioni',    value: '18', delta: '+4 vs 2025', deltaUp: true },
  { icon: 'fa-user-minus',     label: 'Cessazioni',          value: '9',  delta: '-2 vs 2025', deltaUp: true },
  { icon: 'fa-arrows-rotate',  label: 'Turnover',            value: '6,3%', delta: '-0,8 pt', deltaUp: true },
  { icon: 'fa-calendar-xmark', label: 'Tasso assenteismo',   value: '4,1%', delta: '+0,3 pt', deltaUp: false },
  { icon: 'fa-euro-sign',      label: 'Costo del personale', value: '1,24 M€' },
]

// ─── DATI GRAFICI ─────────────────────────────────────────────────────────────
const ORGANICO_2026 = [120, 122, 125, 128, 130, 133, 136, 138, 139, 140, 141, 142]
const ORGANICO_2025 = [112, 113, 116, 118, 119, 121, 124, 126, 127, 128, 129, 130]
const trend2026: SeriesPoint[] = MESI.map((m, i) => ({ x: m, y: ORGANICO_2026[i] }))
const trend2025: SeriesPoint[] = MESI.map((m, i) => ({ x: m, y: ORGANICO_2025[i] }))

const CONTRATTI: DonutSlice[] = [
  { label: 'Indeterminato', value: 96, color: '#204769' },
  { label: 'Determinato',   value: 28, color: '#5C9CD4' },
  { label: 'Stagionale',    value: 18, color: '#E0922A' },
]
const GENERE: DonutSlice[] = [
  { label: 'Donne', value: 78, color: '#2BB0A6' },
  { label: 'Uomini', value: 64, color: '#204769' },
]
const REPARTI_BARS: HBar[] = [
  { label: 'Housekeeping',    value: 34, color: '#204769', format: (v) => `${v}` },
  { label: 'F&B',             value: 30, color: '#5C9CD4', format: (v) => `${v}` },
  { label: 'Front office',    value: 28, color: '#2BB0A6', format: (v) => `${v}` },
  { label: 'Cucina',          value: 16, color: '#E0922A', format: (v) => `${v}` },
  { label: 'Manutenzione',    value: 14, color: '#9B6DD6', format: (v) => `${v}` },
  { label: 'Amministrazione', value: 10, color: '#E2574C', format: (v) => `${v}` },
  { label: 'Marketing',       value: 6,  color: '#3BA99C', format: (v) => `${v}` },
  { label: 'Direzione',       value: 4,  color: '#6E7175', format: (v) => `${v}` },
]
const PERFORMANCE: DonutSlice[] = [
  { label: 'Raggiunti', value: 38, color: '#1F9D55' },
  { label: 'In linea',  value: 64, color: '#5C9CD4' },
  { label: 'A rischio', value: 21, color: '#E0922A' },
]
const DOCUMENTAZIONE: DonutSlice[] = [
  { label: 'Completa',   value: 118, color: '#1F9D55' },
  { label: 'Incompleta', value: 24,  color: '#E2574C' },
]
const ASSENZE_BARS: HBar[] = [
  { label: 'Ferie',      value: 52, color: '#5C9CD4', format: (v) => `${v} gg` },
  { label: 'Malattia',   value: 31, color: '#E2574C', format: (v) => `${v} gg` },
  { label: 'Permessi',   value: 24, color: '#E0922A', format: (v) => `${v} gg` },
  { label: 'Congedi',    value: 12, color: '#2BB0A6', format: (v) => `${v} gg` },
]

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function HrOverview({ navigate }: { navigate?: (p: string) => void } = {}) {
  // Struttura selezionata in alto (o tutte quelle del cliente): i numeri si
  // scalano sull'organico stimato della selezione.
  const [struttura, setStruttura, , elenco] = useStrutturaPagina()
  const schede = useStruttureCliente()
  const STRUTTURE = [TUTTE, ...elenco]
  const selezione = struttura === TUTTE ? schede : schede.filter((x) => x.nome === struttura)
  const organico = Math.max(1, selezione.reduce((a, x) => a + organicoDi(x), 0))
  const f = organico / ORGANICO_BASE
  const sc = (n: number) => Math.max(0, Math.round(n * f))
  const scSlices = (xs: DonutSlice[]) => xs.map((x) => ({ ...x, value: sc(x.value) }))
  const scBars = (xs: HBar[]) => xs.map((x) => ({ ...x, value: sc(x.value) }))
  const costo = 1.24 * f
  const kpis: Kpi[] = KPIS.map((k) =>
    k.label === 'Organico totale' ? { ...k, value: String(organico) }
      : k.label === 'Nuove assunzioni' ? { ...k, value: String(sc(18)) }
      : k.label === 'Cessazioni' ? { ...k, value: String(sc(9)) }
      : k.label === 'Costo del personale' ? { ...k, value: costo >= 1 ? `${costo.toLocaleString('it-IT', { maximumFractionDigits: 2 })} M€` : `${Math.round(costo * 1000)} k€` }
      : k)
  const t26 = trend2026.map((p) => ({ ...p, y: sc(p.y) }))
  const t25 = trend2025.map((p) => ({ ...p, y: sc(p.y) }))
  const contratti = scSlices(CONTRATTI)
  const genere = scSlices(GENERE)
  const reparti = scBars(REPARTI_BARS)
  const performance = scSlices(PERFORMANCE)
  const documentazione = scSlices(DOCUMENTAZIONE)
  const assenze = scBars(ASSENZE_BARS)
  // Le parti di un intero tornano sempre all'organico (niente scarti di arrotondamento).
  const chiudi = (xs: DonutSlice[]) => { if (xs.length) xs[xs.length - 1].value = Math.max(0, organico - xs.slice(0, -1).reduce((a, x) => a + x.value, 0)) }
  chiudi(contratti); chiudi(genere); chiudi(documentazione)
  const docOk = documentazione[0]?.value ?? 0
  const [anno, setAnno] = useState(2026)
  const go = (p: string) => navigate?.(p)

  return (
    <div className="hr-ov">
      <PageHead title="HR Overview" subtitle="Panoramica completa del personale, delle performance e dei trend HR" />

      {/* ─── Filtri ─────────────────────────────────────────────────────────── */}
      <div className="hr-ov__filters">
        <div className="hr-ov__field">
          <SelectField name="struttura" label="Struttura" className="hr-ov__select" value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        </div>
        <div className="hr-ov__field">
          <SelectField name="anno" label="Anno" className="hr-ov__select-sm" value={String(anno)} onChange={(e) => setAnno(Number(e.target.value))}
            options={ANNI.map((a) => ({ value: String(a), label: String(a) }))} />
        </div>
      </div>

      {/* ─── KPI ────────────────────────────────────────────────────────────── */}
      <div className="hr-ov__kpis">
        {kpis.map((k) => (
          <div className="hr-ov__kpi" key={k.label}>
            <div className="hr-ov__kpi-ico"><i className={`fa-light ${k.icon}`} /></div>
            <div className="hr-ov__kpi-body">
              <div className="hr-ov__kpi-value">{k.value}</div>
              <div className="hr-ov__kpi-label">{k.label}</div>
              {k.delta && <div className={'hr-ov__kpi-delta' + (k.deltaUp ? ' is-up' : ' is-down')}><i className={`fa-solid ${k.deltaUp ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} /> {k.delta}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Alert operativi ─────────────────────────────────────────────────── */}
      <div className="hr-ov__alerts">
        <button type="button" className="hr-ov__alert hr-ov__alert--warn" onClick={() => go('archivio-personale')}>
          <i className="fa-solid fa-triangle-exclamation" />
          <span><strong>24</strong> dipendenti con documentazione incompleta</span>
          <i className="fa-light fa-arrow-right hr-ov__alert-go" />
        </button>
        <button type="button" className="hr-ov__alert hr-ov__alert--info" onClick={() => go('monitoraggio-perf')}>
          <i className="fa-solid fa-flag" />
          <span><strong>21</strong> obiettivi performance a rischio</span>
          <i className="fa-light fa-arrow-right hr-ov__alert-go" />
        </button>
      </div>

      {/* ─── Riga 1: andamento organico + composizione ──────────────────────── */}
      <div className="hr-ov__grid hr-ov__grid--2-1">
        <div className="hr-ov__card">
          <h3 className="hr-ov__card-title">Andamento organico</h3>
          <AreaTrend primary={t26} secondary={t25} primaryLabel={`${anno}`} secondaryLabel={`${anno - 1}`} height={240} />
          <div className="hr-ov__legend">
            <span><span className="hr-ov__dot" style={{ background: '#5C9CD4' }} /> {anno}</span>
            <span><span className="hr-ov__dot" style={{ background: '#204769' }} /> {anno - 1}</span>
          </div>
        </div>
        <div className="hr-ov__card hr-ov__card--center">
          <h3 className="hr-ov__card-title">Composizione contratti</h3>
          <Donut slices={contratti} centerValue={fmtNum(contratti.reduce((s, c) => s + c.value, 0))} centerSubLabel="dipendenti" size={190} thickness={32} />
          <DonutLegend slices={contratti} total={contratti.reduce((s, c) => s + c.value, 0)} />
        </div>
      </div>

      {/* ─── Riga 2: reparti + performance ──────────────────────────────────── */}
      <div className="hr-ov__grid hr-ov__grid--2-1">
        <div className="hr-ov__card">
          <h3 className="hr-ov__card-title">Organico per reparto</h3>
          <HBars bars={reparti} showAxis ticks={4} labelWidth={120} />
        </div>
        <div className="hr-ov__card hr-ov__card--center">
          <div className="hr-ov__card-head">
            <h3 className="hr-ov__card-title">Performance obiettivi</h3>
            <button type="button" className="hr-ov__link" onClick={() => go('monitoraggio-perf')}>Monitoraggio <i className="fa-light fa-arrow-right" /></button>
          </div>
          <Donut slices={performance} centerValue="71%" centerSubLabel="avanz. medio" size={190} thickness={32} />
          <DonutLegend slices={performance} total={performance.reduce((s, c) => s + c.value, 0)} />
        </div>
      </div>

      {/* ─── Riga 3: documentazione + assenze + genere ──────────────────────── */}
      <div className="hr-ov__grid hr-ov__grid--3">
        <div className="hr-ov__card hr-ov__card--center">
          <div className="hr-ov__card-head">
            <h3 className="hr-ov__card-title">Stato documentazione</h3>
            <button type="button" className="hr-ov__link" onClick={() => go('archivio-personale')}>Archivio <i className="fa-light fa-arrow-right" /></button>
          </div>
          <Donut slices={documentazione} centerValue={`${Math.round((docOk / organico) * 100)}%`} centerSubLabel="completa" size={170} thickness={28} />
          <DonutLegend slices={documentazione} total={organico} />
        </div>
        <div className="hr-ov__card">
          <h3 className="hr-ov__card-title">Assenze per tipologia</h3>
          <HBars bars={assenze} showAxis ticks={4} labelWidth={90} />
        </div>
        <div className="hr-ov__card hr-ov__card--center">
          <h3 className="hr-ov__card-title">Composizione di genere</h3>
          <Donut slices={genere} centerValue={String(organico)} centerSubLabel="dipendenti" size={170} thickness={28} />
          <DonutLegend slices={genere} total={organico} />
        </div>
      </div>
    </div>
  )
}
