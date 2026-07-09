import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import { SelectField } from '../../../../core/components/form'
import { apiFetchSibylla } from '../../../../services/api'
import './AllocazioneRisorse.sass'

interface Prenotazione {
  id: number
  startISO: string  // YYYY-MM-DD
  endISO: string    // YYYY-MM-DD (esclusivo)
  badge: number
  row: number
  ai?: boolean      // prenotazione generata dall'AI Sibylla
}

interface DettaglioRiga {
  cliente: string
  dataIn: string
  dataOut: string
  tipoCamera: string
  numCamere: number
  numPersone: number
}

// Dettaglio mock mostrato nella modale (uguale per ogni prenotazione del mock)
const DETTAGLIO_MOCK: DettaglioRiga[] = [
  { cliente: '',                      dataIn: '27/06/2026', dataOut: '29/06/2026', tipoCamera: 'Singola Classic', numCamere: 13, numPersone: 13 },
  { cliente: 'Test Ale checkin 234 new', dataIn: '27/06/2026', dataOut: '29/06/2026', tipoCamera: 'Doppia Classic',  numCamere: 1,  numPersone: 2 },
  { cliente: 'test ar',               dataIn: '27/06/2026', dataOut: '29/06/2026', tipoCamera: 'Doppia Classic',  numCamere: 40, numPersone: 80 },
  { cliente: 'Tour Operator Test',    dataIn: '27/06/2026', dataOut: '29/06/2026', tipoCamera: 'Doppia Classic',  numCamere: 8,  numPersone: 16 },
  { cliente: 'Tour Operator Test',    dataIn: '27/06/2026', dataOut: '29/06/2026', tipoCamera: 'Tripla Classic',  numCamere: 1,  numPersone: 3 },
]

interface PanelData {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Stato: 'Tutte' | 'Confermata' | 'Opzionata'
  TipoPren: 'Tutti' | 'Individuali' | 'Gruppi'
  Search: string
  Da: string  // YYYY-MM-DD
  Prenotazioni: Prenotazione[]
}

const DAYS_PER_PANEL = 25

const FALLBACK_LEFT: PanelData = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  Stato: 'Tutte',
  TipoPren: 'Tutti',
  Search: '',
  Da: '2026-04-30',
  Prenotazioni: [
    { id: 1, startISO: '2026-05-01', endISO: '2026-05-07', badge: 1, row: 0 },
    { id: 2, startISO: '2026-05-02', endISO: '2026-05-04', badge: 1, row: 1, ai: true },
    { id: 3, startISO: '2026-05-03', endISO: '2026-05-08', badge: 1, row: 2 },
    { id: 4, startISO: '2026-05-06', endISO: '2026-05-09', badge: 1, row: 3 },
    { id: 5, startISO: '2026-05-12', endISO: '2026-05-19', badge: 1, row: 4, ai: true },
  ],
}

const FALLBACK_RIGHT: PanelData = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  Stato: 'Tutte',
  TipoPren: 'Tutti',
  Search: '',
  Da: '2026-05-01',
  Prenotazioni: [
    { id: 1, startISO: '2026-05-02', endISO: '2026-05-05', badge: 1, row: 0 },
    { id: 2, startISO: '2026-05-04', endISO: '2026-05-07', badge: 1, row: 1, ai: true },
    { id: 3, startISO: '2026-05-06', endISO: '2026-05-18', badge: 1, row: 2 },
  ],
}

const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

function parseISO(s: string): Date { return new Date(`${s}T00:00:00`) }

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function formatDayHeader(d: Date): { mese: string; giorno: string } {
  return { mese: MESI_SHORT[d.getMonth()], giorno: String(d.getDate()).padStart(2, '0') }
}

export default function AllocazioneRisorse({ navigate }: { navigate: (p: string) => void }) {
  const [left, setLeft] = useState<PanelData>(FALLBACK_LEFT)
  const [right, setRight] = useState<PanelData>(FALLBACK_RIGHT)
  const [expandedLeft, setExpandedLeft] = useState(false)
  const [expandedRight, setExpandedRight] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<{ left: PanelData; right: PanelData }>('booking/GetAllocazioneRisorse', {
      method: 'POST',
      body: { left: { da: left.Da, struttura: left.StrutturaId }, right: { da: right.Da, struttura: right.StrutturaId } },
    })
      .then((d) => { if (!cancelled) { setLeft(d.left); setRight(d.right) } })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="alloc-risorse">
      <PageHead
        title="Allocazione risorse"
        subtitle="Ripartizione delle prenotazioni nelle camere al fine di ottimizzarne la capienza"
      />

      <div className="alloc-risorse__panels">
        <Panel
          data={left}
          onChange={setLeft}
          expanded={expandedLeft}
          onToggleExpand={() => setExpandedLeft((v) => !v)}
        />
        <Panel
          data={right}
          onChange={setRight}
          expanded={expandedRight}
          onToggleExpand={() => setExpandedRight((v) => !v)}
        />
      </div>
    </div>
  )
}

// ─── PANEL ────────────────────────────────────────────────────────────────────

interface PanelProps {
  data: PanelData
  onChange: (d: PanelData) => void
  expanded: boolean
  onToggleExpand: () => void
}

function Panel({ data, onChange, expanded, onToggleExpand }: PanelProps) {
  const [detail, setDetail] = useState<Prenotazione | null>(null)
  const days = useMemo(() => {
    const start = parseISO(data.Da)
    return Array.from({ length: DAYS_PER_PANEL }, (_, i) => addDays(start, i))
  }, [data.Da])

  const start = parseISO(data.Da)

  const prenFiltrate = useMemo(() => {
    const q = data.Search.toLowerCase().trim()
    let rows = data.Prenotazioni
    if (q) rows = rows.filter((p) => String(p.id).includes(q))
    return rows
  }, [data.Prenotazioni, data.Search])

  const maxRow = Math.max(0, ...prenFiltrate.map((p) => p.row))
  const visibleRows = expanded ? Math.max(maxRow + 1, 12) : Math.max(maxRow + 1, 6)

  return (
    <div className="alloc-risorse__panel">
      <div className="alloc-risorse__filters">
        <div className="alloc-risorse__field alloc-risorse__field-raw"><label>Da</label>
          <input type="date" className="sib-input" value={data.Da} onChange={(e) => onChange({ ...data, Da: e.target.value })} />
        </div>
        <SelectField
          name="struttura"
          label="Struttura"
          className="alloc-risorse__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => onChange({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
        />
        <SelectField
          name="stato"
          label="Stato allocazione"
          className="alloc-risorse__field"
          value={data.Stato}
          onChange={(e) => onChange({ ...data, Stato: e.target.value as PanelData['Stato'] })}
          options={[
            { value: 'Tutte', label: 'Tutte' },
            { value: 'Confermata', label: 'Confermata' },
            { value: 'Opzionata', label: 'Opzionata' },
          ]}
        />
        <SelectField
          name="tipoPren"
          label="Prenotazioni"
          className="alloc-risorse__field"
          value={data.TipoPren}
          onChange={(e) => onChange({ ...data, TipoPren: e.target.value as PanelData['TipoPren'] })}
          options={[
            { value: 'Tutti', label: 'Tutti' },
            { value: 'Individuali', label: 'Individuali' },
            { value: 'Gruppi', label: 'Gruppi' },
          ]}
        />
        <div className="alloc-risorse__field alloc-risorse__field--search alloc-risorse__field-raw"><label>Cerca</label>
          <div className="alloc-risorse__search">
            <input type="search" className="sib-input" placeholder="Cerca" value={data.Search} onChange={(e) => onChange({ ...data, Search: e.target.value })} />
            <i className="fa-light fa-magnifying-glass alloc-risorse__search-icon" />
          </div>
        </div>
      </div>

      <div className="alloc-risorse__timeline" style={{ ['--cols' as any]: DAYS_PER_PANEL, ['--rows' as any]: visibleRows }}>
        <div className="alloc-risorse__header-row">
          {days.map((d, i) => {
            const h = formatDayHeader(d)
            return (
              <div className="alloc-risorse__day-col" key={i}>
                <span className="alloc-risorse__day-mese">{h.mese}</span>
                <span className="alloc-risorse__day-num">{h.giorno}</span>
              </div>
            )
          })}
        </div>

        <div className="alloc-risorse__grid">
          {Array.from({ length: visibleRows }, (_, r) => (
            <div className="alloc-risorse__grid-row" key={r}>
              {Array.from({ length: DAYS_PER_PANEL }, (_, c) => (
                <div className="alloc-risorse__grid-cell" key={c} />
              ))}
            </div>
          ))}

          {prenFiltrate.map((p) => {
            const dStart = parseISO(p.startISO)
            const dEnd = parseISO(p.endISO)
            const colStart = daysBetween(start, dStart)
            const span = Math.max(1, daysBetween(dStart, dEnd))
            if (colStart >= DAYS_PER_PANEL || colStart + span < 0) return null
            const clampedStart = Math.max(0, colStart)
            const clampedSpan = Math.min(span - (clampedStart - colStart), DAYS_PER_PANEL - clampedStart)
            const left = (clampedStart / DAYS_PER_PANEL) * 100
            const width = (clampedSpan / DAYS_PER_PANEL) * 100
            const top = p.row * 28
            return (
              <div
                className={'alloc-risorse__bar' + (p.ai ? ' alloc-risorse__bar--ai' : '')}
                key={p.id}
                style={{ '--bar-left': `${left}%`, '--bar-width': `${width}%`, '--bar-top': `${top}px` } as React.CSSProperties}
                role="button"
                tabIndex={0}
                onClick={() => setDetail(p)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(p) } }}
              >
                <span className="alloc-risorse__bar-badge">{p.badge}</span>
                {p.ai && (
                  <Tooltip text="Prenotazione generata dall'AI Sibylla">
                    <span className="alloc-risorse__bar-ai" aria-label="Generata dall'AI Sibylla">
                      <i className="fa-solid fa-wand-magic-sparkles" />
                    </span>
                  </Tooltip>
                )}
              </div>
            )
          })}
        </div>

        <div className="alloc-risorse__expand-bar" onClick={onToggleExpand}>
          <button type="button" className="alloc-risorse__expand-btn">
            {expanded ? 'COMPRIMI' : 'ESPANDI'}
          </button>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Dettaglio prenotazione" size="xl">
        {detail?.ai && (
          <div className="alloc-risorse__detail-ai">
            <i className="fa-solid fa-wand-magic-sparkles" /> Prenotazione generata dall'AI Sibylla
          </div>
        )}
        <div className="sib-table-wrap alloc-risorse__detail-table">
          <table className="sib-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="alloc-risorse__detail-c">Data In</th>
                <th className="alloc-risorse__detail-c">Data Out</th>
                <th className="alloc-risorse__detail-c">Tipo camera Sibylla</th>
                <th className="alloc-risorse__detail-c">Numero camere</th>
                <th className="alloc-risorse__detail-c">Numero persone</th>
              </tr>
            </thead>
            <tbody>
              {DETTAGLIO_MOCK.map((r, i) => (
                <tr key={i}>
                  <td className="alloc-risorse__detail-cl">{r.cliente || <span className="sib-cell--muted">-</span>}</td>
                  <td className="alloc-risorse__detail-c">{r.dataIn}</td>
                  <td className="alloc-risorse__detail-c">{r.dataOut}</td>
                  <td className="alloc-risorse__detail-c">{r.tipoCamera}</td>
                  <td className="alloc-risorse__detail-c">{r.numCamere}</td>
                  <td className="alloc-risorse__detail-c">{r.numPersone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
