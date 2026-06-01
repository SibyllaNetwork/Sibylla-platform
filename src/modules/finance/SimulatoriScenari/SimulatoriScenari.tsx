import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Modal from '../../../core/components/Modal'
import { InputField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './SimulatoriScenari.sass'

/**
 * Simulatori scenari — replica `Views/Budget/SimulatoreScenari.cshtml`.
 * BE: `BudgetController.SaveSimulazione` → catch-all
 * `/Sibylla/budget/SaveSimulazioneScenari`.
 */

const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']

const SEGMENTI = [
  { key: 'diretto',   label: 'Diretto',   color: '#0F2C4A' },
  { key: 'corporate', label: 'Corporate', color: '#E94B4B' },
  { key: 'b2b',       label: 'B2B',       color: '#2EB85C' },
  { key: 'b2c',       label: 'B2C',       color: '#F1B33F' },
  { key: 'gruppi',    label: 'Gruppi',    color: '#9C5BD2' },
] as const
type SegKey = typeof SEGMENTI[number]['key']

interface ValoreBase { adr: number; rn: number }
interface Variazione { adrPct: number; rnPct: number }

const ZERO_BASE: Record<SegKey, ValoreBase> = {
  diretto:   { adr: 0, rn: 0 },
  corporate: { adr: 0, rn: 0 },
  b2b:       { adr: 0, rn: 0 },
  b2c:       { adr: 0, rn: 0 },
  gruppi:    { adr: 0, rn: 0 },
}

const ZERO_VAR: Record<SegKey, Variazione> = {
  diretto:   { adrPct: 0, rnPct: 0 },
  corporate: { adrPct: 0, rnPct: 0 },
  b2b:       { adrPct: 0, rnPct: 0 },
  b2c:       { adrPct: 0, rnPct: 0 },
  gruppi:    { adrPct: 0, rnPct: 0 },
}

interface CostiBase { fissi: number; variabili: number }
interface CostiVar  { fissiPct: number; variabiliPct: number }

const ZERO_COSTI_BASE: CostiBase = { fissi: 0, variabili: 0 }
const ZERO_COSTI_VAR:  CostiVar  = { fissiPct: 0, variabiliPct: 0 }

function fmtEuro(v: number): string {
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function applicaVariazione(base: ValoreBase, v: Variazione): { adr: number; rn: number; revenue: number } {
  const adr = base.adr * (1 + v.adrPct / 100)
  const rn  = base.rn  * (1 + v.rnPct / 100)
  return { adr, rn, revenue: adr * rn }
}

export default function SimulatoriScenari({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura] = useState('Hotel Tutorial')
  const [base] = useState<Record<SegKey, ValoreBase>>(ZERO_BASE)
  const [costiBase] = useState<CostiBase>(ZERO_COSTI_BASE)

  const [scenari, setScenari] = useState<Record<SegKey, Variazione>[]>([
    { ...ZERO_VAR }, { ...ZERO_VAR }, { ...ZERO_VAR },
  ])
  const [costiScenari, setCostiScenari] = useState<CostiVar[]>([
    { ...ZERO_COSTI_VAR }, { ...ZERO_COSTI_VAR }, { ...ZERO_COSTI_VAR },
  ])

  const [openSave, setOpenSave] = useState(false)
  const [saveScenarioIdx, setSaveScenarioIdx] = useState(0)
  const [nomeSimulazione, setNomeSimulazione] = useState('')

  const [ricaviOpen, setRicaviOpen] = useState(true)
  const [costiOpen,  setCostiOpen]  = useState(true)

  const setVarSegmento = (idxScenario: number, seg: SegKey, patch: Partial<Variazione>) =>
    setScenari((prev) => {
      const next = prev.map((s) => ({ ...s }))
      next[idxScenario] = { ...next[idxScenario], [seg]: { ...next[idxScenario][seg], ...patch } }
      return next
    })

  const setVarCosti = (idxScenario: number, patch: Partial<CostiVar>) =>
    setCostiScenari((prev) => {
      const next = prev.map((s) => ({ ...s }))
      next[idxScenario] = { ...next[idxScenario], ...patch }
      return next
    })

  const totaleCostiBase = costiBase.fissi + costiBase.variabili

  const profittoAtteso = useMemo(() => {
    // Profitto = ricavi totali (scenario1) − costi totali (scenario1)
    const ricaviTot = SEGMENTI.reduce((acc, s) => acc + applicaVariazione(base[s.key], scenari[0][s.key]).revenue, 0)
    const costiTot  = costiBase.fissi * (1 + costiScenari[0].fissiPct / 100) + costiBase.variabili * (1 + costiScenari[0].variabiliPct / 100)
    return ricaviTot - costiTot
  }, [base, scenari, costiBase, costiScenari])

  function ripristina() {
    setScenari([{ ...ZERO_VAR }, { ...ZERO_VAR }, { ...ZERO_VAR }])
    setCostiScenari([{ ...ZERO_COSTI_VAR }, { ...ZERO_COSTI_VAR }, { ...ZERO_COSTI_VAR }])
  }

  async function salvaSimulazione() {
    try {
      await apiFetchSibylla('budget/SaveSimulazioneScenari', {
        method: 'POST',
        body: { nome: nomeSimulazione, struttura, scenarioIdx: saveScenarioIdx, scenari, costiScenari },
      })
    } catch (e) {
      // ignore — fallback locale
    } finally {
      setOpenSave(false)
      navigate('budget-complessivo')
    }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Simulatori scenari" subtitle="Prova oggi la decisione di domani, senza alcun rischio" />

      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div className="w-64">
          <SelectField name="struttura" label="Strutture" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        </div>
        <button className="sib-btn sib-btn--secondary ml-auto" onClick={ripristina}>
          <i className="fa-duotone fa-eraser" /> Ripristina
        </button>
        <button className="sib-btn sib-btn--icon" title="Esporta PDF">
          <i className="fa-duotone fa-file-pdf" />
        </button>
      </div>

      {/* RICAVI */}
      <SectionCard
        icon="fa-database"
        title="Ricavi"
        open={ricaviOpen}
        onToggle={() => setRicaviOpen((o) => !o)}
      >
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Periodo attuale */}
          <div className="bg-white border border-line rounded-field p-4">
            <h4 className="text-[14px] font-bold mb-3">Periodo attuale</h4>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-ink-muted">
                  <th className="text-left font-semibold py-1">Periodo</th>
                  <th className="text-left font-semibold py-1">Segmenti</th>
                  <th className="text-right font-semibold py-1">Adr</th>
                  <th className="text-right font-semibold py-1">Rn</th>
                  <th className="text-right font-semibold py-1">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {SEGMENTI.map((s) => (
                  <tr key={s.key} className="border-t border-line">
                    <td className="py-2">2025</td>
                    <td className="py-2 font-semibold">{s.label}</td>
                    <td className="py-2 text-right">{fmtEuro(base[s.key].adr)}</td>
                    <td className="py-2 text-right">{base[s.key].rn}</td>
                    <td className="py-2 text-right">{fmtEuro(base[s.key].adr * base[s.key].rn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-3 gap-2 mt-4 text-[11px]">
              {SEGMENTI.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm sim-scenari__swatch" style={{ '--swatch-color': s.color } as React.CSSProperties} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Scenari */}
          {scenari.map((sc, idx) => (
            <ScenarioRicaviCard
              key={idx}
              idx={idx}
              base={base}
              variazioni={sc}
              onChangeSegmento={(seg, patch) => setVarSegmento(idx, seg, patch)}
            />
          ))}
        </div>
      </SectionCard>

      {/* COSTI */}
      <SectionCard
        icon="fa-gear"
        title="Costi"
        open={costiOpen}
        onToggle={() => setCostiOpen((o) => !o)}
      >
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-line rounded-field p-4">
            <h4 className="text-[14px] font-bold mb-3">Periodo attuale</h4>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-ink-muted">
                  <th className="text-left font-semibold py-1">Periodo</th>
                  <th className="text-right font-semibold py-1">Fissi</th>
                  <th className="text-right font-semibold py-1">Variabili</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="py-2">2025</td>
                  <td className="py-2 text-right">{fmtEuro(costiBase.fissi)}</td>
                  <td className="py-2 text-right">{fmtEuro(costiBase.variabili)}</td>
                </tr>
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-pink-500" />
                <span>{fmtEuro(costiBase.fissi)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-green-600" />
                <span>{fmtEuro(costiBase.variabili)}</span>
              </div>
            </div>
            <div className="mt-4 text-[13px] font-bold">Totale costi: {fmtEuro(totaleCostiBase)}</div>
          </div>

          {costiScenari.map((sc, idx) => (
            <ScenarioCostiCard
              key={idx}
              idx={idx}
              base={costiBase}
              variazione={sc}
              onChange={(patch) => setVarCosti(idx, patch)}
            />
          ))}
        </div>
      </SectionCard>

      {/* Footer profitto atteso */}
      <div className="bg-white border border-line rounded-field px-4 py-3 mt-6 flex items-center justify-between">
        <div className="text-[15px] font-bold">Profitto atteso: <span className="text-primary">{fmtEuro(profittoAtteso)}</span></div>
        <button className="sib-btn sib-btn--primary" onClick={() => { setSaveScenarioIdx(0); setOpenSave(true) }}>
          Salva scenari
        </button>
      </div>

      {/* Modale salva simulazione */}
      <Modal open={openSave} onClose={() => setOpenSave(false)} title="Salva la simulazione degli scenari" size="lg">
        <div className="p-5">
          <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px]">
              <InputField name="nomeSim" label="Nome simulazione" value={nomeSimulazione} onChange={(e) => setNomeSimulazione(e.target.value)} />
            </div>
            <div className="text-[13px] font-semibold">Profitto atteso: <span className="text-primary">{fmtEuro(profittoAtteso)}</span></div>
          </div>

          <div className="bg-white border border-line rounded-field p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold">Ricavi - Scenario {romano(saveScenarioIdx + 1)}</h4>
              <div className="text-[12px] font-semibold">Totale ricavi: {fmtEuro(SEGMENTI.reduce((a, s) => a + applicaVariazione(base[s.key], scenari[saveScenarioIdx][s.key]).revenue, 0))}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <table className="w-full text-[12px]">
                <tbody>
                  {SEGMENTI.map((s) => (
                    <tr key={s.key} className="border-b border-line last:border-0">
                      <td className="py-1.5 w-12 text-right pr-3">{scenari[saveScenarioIdx][s.key].adrPct}%</td>
                      <td className="py-1.5 font-bold">{s.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CartesianBarChart
                dati={SEGMENTI.map((s) => {
                  const calc = applicaVariazione(base[s.key], scenari[saveScenarioIdx][s.key])
                  return { label: s.label, costo: calc.revenue, percentuale: scenari[saveScenarioIdx][s.key].adrPct, color: s.color }
                })}
              />
            </div>
          </div>

          <div className="bg-white border border-line rounded-field p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[14px] font-bold">Costi - Scenario {romano(saveScenarioIdx + 1)}</h4>
              <div className="text-[12px] font-semibold">Totale costi: {fmtEuro(costiBase.fissi + costiBase.variabili)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <table className="w-full text-[12px]">
                <tbody>
                  <tr className="border-b border-line">
                    <td className="py-1.5 w-12 text-right pr-3">{costiScenari[saveScenarioIdx].fissiPct}%</td>
                    <td className="py-1.5 font-bold">Fissi</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 w-12 text-right pr-3">{costiScenari[saveScenarioIdx].variabiliPct}%</td>
                    <td className="py-1.5 font-bold">Variabili</td>
                  </tr>
                </tbody>
              </table>
              <CartesianBarChart
                variante="costi"
                dati={[
                  { label: 'Fissi',     costo: costiBase.fissi * (1 + costiScenari[saveScenarioIdx].fissiPct / 100),         percentuale: costiScenari[saveScenarioIdx].fissiPct,     color: '#E94B8B' },
                  { label: 'Variabili', costo: costiBase.variabili * (1 + costiScenari[saveScenarioIdx].variabiliPct / 100), percentuale: costiScenari[saveScenarioIdx].variabiliPct, color: '#2EB85C' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button className="sib-btn sib-btn--secondary" onClick={() => setOpenSave(false)}>Annulla</button>
            <button className="sib-btn sib-btn--primary" onClick={salvaSimulazione}>
              Salva e simula scenario nel Budget complessivo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SectionCard({
  icon, title, open, onToggle, children,
}: {
  icon: string; title: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between border-b-2 border-line pb-2 mb-4">
        <h3 className="text-[18px] font-bold flex items-center gap-2">
          <i className={`fa-duotone ${icon} text-primary`} /> {title}
        </h3>
        <button className="sib-btn sib-btn--icon" onClick={onToggle} title={open ? 'Chiudi' : 'Espandi'}>
          <i className={`fa-solid ${open ? 'fa-minus' : 'fa-plus'}`} />
        </button>
      </div>
      {open && children}
    </div>
  )
}

function ScenarioRicaviCard({
  idx, base, variazioni, onChangeSegmento,
}: {
  idx: number
  base: Record<SegKey, ValoreBase>
  variazioni: Record<SegKey, Variazione>
  onChangeSegmento: (seg: SegKey, patch: Partial<Variazione>) => void
}) {
  const num = ['I', 'II', 'III'][idx]
  const totale = SEGMENTI.reduce((a, s) => a + applicaVariazione(base[s.key], variazioni[s.key]).revenue, 0)
  const isFirst = idx === 0
  return (
    <div className={`bg-white border ${isFirst ? 'border-primary' : 'border-line'} rounded-field p-4`}>
      <h4 className="text-[14px] font-bold mb-3">Scenario {num}</h4>
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[11px] font-semibold text-ink-muted mb-1 px-1">
        <div>Adr</div>
        <div>Rn</div>
        <div>Revenue</div>
      </div>
      {SEGMENTI.map((s) => {
        const v = variazioni[s.key]
        const calc = applicaVariazione(base[s.key], v)
        return (
          <div key={s.key} className="grid grid-cols-[1fr_1fr_1fr] gap-2 mb-1.5">
            <PctCell value={fmtEuro(calc.adr)} pct={v.adrPct} onChange={(p) => onChangeSegmento(s.key, { adrPct: p })} />
            <PctCell value={String(Math.round(calc.rn))} pct={v.rnPct} onChange={(p) => onChangeSegmento(s.key, { rnPct: p })} />
            <div className="bg-success-light text-ink rounded text-[12px] flex items-center justify-center min-h-[40px]">
              {fmtEuro(calc.revenue)}
            </div>
          </div>
        )
      })}
      <div className="mt-4 text-[11px] text-ink-muted">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary" />
          <span>Scenario {idx + 1} Ricavi</span>
        </div>
        <CartesianBarChart
          dati={SEGMENTI.map((s) => {
            const calc = applicaVariazione(base[s.key], variazioni[s.key])
            return { label: s.label, costo: calc.revenue, percentuale: variazioni[s.key].adrPct, color: s.color }
          })}
        />
      </div>
      <div className="mt-2 text-[12px] font-semibold text-right">Totale: {fmtEuro(totale)}</div>
    </div>
  )
}

function ScenarioCostiCard({
  idx, base, variazione, onChange,
}: {
  idx: number
  base: CostiBase
  variazione: CostiVar
  onChange: (patch: Partial<CostiVar>) => void
}) {
  const num = ['I', 'II', 'III'][idx]
  const isFirst = idx === 0
  const fissi = base.fissi * (1 + variazione.fissiPct / 100)
  const variabili = base.variabili * (1 + variazione.variabiliPct / 100)
  return (
    <div className={`bg-white border ${isFirst ? 'border-primary' : 'border-line'} rounded-field p-4`}>
      <h4 className="text-[14px] font-bold mb-3">Scenario {num}</h4>
      <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-ink-muted mb-1 px-1">
        <div>Fissi</div>
        <div>Variabili</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PctCell value={fmtEuro(fissi)}     pct={variazione.fissiPct}     onChange={(p) => onChange({ fissiPct: p })} />
        <PctCell value={fmtEuro(variabili)} pct={variazione.variabiliPct} onChange={(p) => onChange({ variabiliPct: p })} />
      </div>
      <div className="mt-4 text-[11px] text-ink-muted">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-pink-500" />
          <span>Scenario {num} costi</span>
        </div>
        <CartesianBarChart
          variante="costi"
          dati={[
            { label: 'Fissi',     costo: fissi,     percentuale: variazione.fissiPct,     color: '#E94B8B' },
            { label: 'Variabili', costo: variabili, percentuale: variazione.variabiliPct, color: '#2EB85C' },
          ]}
        />
      </div>
    </div>
  )
}

function PctCell({ value, pct, onChange }: { value: string; pct: number; onChange: (n: number) => void }) {
  return (
    <div className="bg-link-light/40 rounded p-1.5">
      <div className="text-[12px] text-center mb-1">{value}</div>
      <div className="flex items-center justify-center gap-1">
        <button type="button" className="w-5 h-5 rounded border border-line bg-white hover:bg-canvas text-[11px] flex items-center justify-center" onClick={() => onChange(pct + 1)}>
          <i className="fa-solid fa-plus" />
        </button>
        <span className="text-[11px] font-semibold w-9 text-center">{pct}%</span>
        <button type="button" className="w-5 h-5 rounded border border-line bg-white hover:bg-canvas text-[11px] flex items-center justify-center" onClick={() => onChange(pct - 1)}>
          <i className="fa-solid fa-minus" />
        </button>
      </div>
    </div>
  )
}

interface PuntoChart { label: string; costo: number; percentuale: number; color: string }

interface ChartOpts {
  /** 'ricavi' → label segmento sotto, no tick % visibili. 'costi' → tick % visibili + valore € sotto */
  variante?: 'ricavi' | 'costi'
}

function CartesianBarChart({ dati, variante = 'ricavi' }: { dati: PuntoChart[] } & ChartOpts) {
  const maxAbsPct = Math.max(1, ...dati.map((d) => Math.abs(d.percentuale)))
  const hasNegative = dati.some((d) => d.percentuale < 0)
  const yMax = Math.ceil(maxAbsPct)
  const yMin = hasNegative ? -yMax : 0

  const showYTicks = variante === 'costi'
  const yTicks = hasNegative
    ? [yMax, 0, -yMax]
    : [yMax, 0]

  // Layout SVG
  const W = 280
  const H = 120
  const PAD_L = showYTicks ? 26 : 8
  const PAD_R = 8
  const PAD_T = 8
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const yToPx = (v: number) => PAD_T + innerH - ((v - yMin) / (yMax - yMin)) * innerH
  const baseY = yToPx(0)

  const barW = Math.max(8, Math.min(20, innerW / dati.length / 2))
  const slot = innerW / dati.length

  return (
    <div className="flex items-stretch gap-2">
      {/* Y-axis label ruotata, fuori dal grafico a sinistra */}
      <div className="flex items-center justify-center shrink-0 sim-scenari__yaxis">
        <span className="text-[10px] text-ink-muted whitespace-nowrap sim-scenari__yaxis-label">
          Percentuale %
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          {/* tick orizzontali (solo per costi) */}
          {showYTicks && yTicks.map((tk) => (
            <g key={`tk-${tk}`}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yToPx(tk)} y2={yToPx(tk)} stroke="#E5E7EB" strokeWidth="1" />
              <text x={PAD_L - 3} y={yToPx(tk) + 3} fontSize="9" textAnchor="end" fill="#6E7175">{tk}%</text>
            </g>
          ))}
          {/* separatori verticali */}
          {dati.map((_, i) => {
            const x = PAD_L + slot * i
            return <line key={`sep-${i}`} x1={x} x2={x} y1={PAD_T} y2={PAD_T + innerH} stroke="#E5E7EB" strokeWidth="1" />
          })}
          <line x1={PAD_L + innerW} x2={PAD_L + innerW} y1={PAD_T} y2={PAD_T + innerH} stroke="#E5E7EB" strokeWidth="1" />
          {/* asse X (base 0) */}
          <line x1={PAD_L} x2={W - PAD_R} y1={baseY} y2={baseY} stroke="#0F2C4A" strokeWidth="1" />

          {/* barre */}
          {dati.map((d, i) => {
            const cx = PAD_L + slot * i + slot / 2
            const top = d.percentuale >= 0 ? yToPx(d.percentuale) : baseY
            const bottom = d.percentuale >= 0 ? baseY : yToPx(d.percentuale)
            const h = Math.max(0, bottom - top)
            const xLabel = variante === 'costi' ? fmtEuro(d.costo) : d.label
            return (
              <g key={i}>
                {h > 0 && <rect x={cx - barW / 2} y={top} width={barW} height={h} fill={d.color} rx={2} />}
                <text x={cx} y={H - PAD_B + 14} fontSize="10" textAnchor="middle" fill="#6E7175">
                  {xLabel}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="text-[10px] text-ink-muted text-center -mt-0.5">Costo (in migliaia)</div>
      </div>
    </div>
  )
}

function romano(n: number): string {
  return ['', 'I', 'II', 'III', 'IV', 'V'][n] ?? String(n)
}
