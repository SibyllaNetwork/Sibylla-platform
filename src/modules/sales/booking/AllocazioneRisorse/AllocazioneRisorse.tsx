import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../../services/api'
import './AllocazioneRisorse.sass'

interface Prenotazione {
  id: number
  startISO: string  // YYYY-MM-DD
  endISO: string    // YYYY-MM-DD (esclusivo)
  badge: number
  row: number
}

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
    { id: 2, startISO: '2026-05-02', endISO: '2026-05-04', badge: 1, row: 1 },
    { id: 3, startISO: '2026-05-03', endISO: '2026-05-08', badge: 1, row: 2 },
    { id: 4, startISO: '2026-05-06', endISO: '2026-05-09', badge: 1, row: 3 },
    { id: 5, startISO: '2026-05-12', endISO: '2026-05-19', badge: 1, row: 4 },
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
    { id: 2, startISO: '2026-05-04', endISO: '2026-05-07', badge: 1, row: 1 },
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
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
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
        <div className="alloc-risorse__field"><label>Da</label>
          <input type="date" className="sib-input" value={data.Da} onChange={(e) => onChange({ ...data, Da: e.target.value })} />
        </div>
        <div className="alloc-risorse__field"><label>Struttura</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => onChange({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="alloc-risorse__field"><label>Stato allocazione</label>
          <select className="sib-select" value={data.Stato} onChange={(e) => onChange({ ...data, Stato: e.target.value as PanelData['Stato'] })}>
            <option value="Tutte">Tutte</option>
            <option value="Confermata">Confermata</option>
            <option value="Opzionata">Opzionata</option>
          </select>
        </div>
        <div className="alloc-risorse__field"><label>Prenotazioni</label>
          <select className="sib-select" value={data.TipoPren} onChange={(e) => onChange({ ...data, TipoPren: e.target.value as PanelData['TipoPren'] })}>
            <option value="Tutti">Tutti</option>
            <option value="Individuali">Individuali</option>
            <option value="Gruppi">Gruppi</option>
          </select>
        </div>
        <div className="alloc-risorse__field alloc-risorse__field--search"><label>Cerca</label>
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
                className="alloc-risorse__bar"
                key={p.id}
                style={{ left: `${left}%`, width: `${width}%`, top }}
                title={`Prenotazione #${p.id}`}
              >
                <span className="alloc-risorse__bar-badge">{p.badge}</span>
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
    </div>
  )
}
