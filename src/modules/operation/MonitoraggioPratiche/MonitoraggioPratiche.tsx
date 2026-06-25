import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { avatarUrl } from '../../../core/avatar'
import { useRuoliStore, type ProfiloRow } from '../../../store/useRuoliStore'
import {
  usePraticheStore,
  STATO_PRATICA_META,
  STATO_PRATICA_FLOW,
  TIPOLOGIA_META,
  oreInGestione,
  praticheInRitardo,
  type Pratica,
  type StatoPratica,
  type Assegnazione,
} from '../../../store/usePraticheStore'
import { InputField, CheckboxField } from '../../../core/components/form'
import './MonitoraggioPratiche.sass'

const fmtEur = (n: number) => `€ ${n.toLocaleString('it-IT')}`

// Tempo di gestione leggibile (ore → "45m" / "3h" / "2g 4h").
function fmtDurata(ore: number): string {
  if (ore < 1) return `${Math.max(1, Math.round(ore * 60))}m`
  if (ore < 24) return `${Math.floor(ore)}h`
  const g = Math.floor(ore / 24)
  const h = Math.floor(ore % 24)
  return h ? `${g}g ${h}h` : `${g}g`
}

function profiloBySeed(profili: ProfiloRow[], nome: string): ProfiloRow | undefined {
  return profili.find((p) => p.nome === nome)
}

function ProfiloCell({ assegnazione, profili }: { assegnazione: Assegnazione; profili: ProfiloRow[] }) {
  if (assegnazione.tipo === 'team') {
    const shown = profili.slice(0, 4)
    const rest = profili.length - shown.length
    return (
      <div className="mon-prat__assignee">
        <span className="mon-prat__avatars">
          {shown.map((p) => (
            <img key={p.nome} className="mon-prat__avatar" src={avatarUrl(p.seed || p.nome)} alt={p.nome} title={p.nome} />
          ))}
          {rest > 0 && <span className="mon-prat__avatar mon-prat__avatar--more">+{rest}</span>}
        </span>
        <span className="mon-prat__assignee-label">Tutto il team</span>
      </div>
    )
  }
  const p = profiloBySeed(profili, assegnazione.nome)
  return (
    <div className="mon-prat__assignee">
      <img className="mon-prat__avatar" src={avatarUrl(p?.seed || assegnazione.nome)} alt={assegnazione.nome} />
      <span className="mon-prat__assignee-label">{assegnazione.nome}</span>
    </div>
  )
}

// ── Filtro di colonna (header) ───────────────────────────────────────────────
type ColKey = 'destinazione' | 'categoria' | 'tipologia' | 'stato' | 'profilo'
const COLS: { key: ColKey; label: string }[] = [
  { key: 'destinazione', label: 'Destinazione' },
  { key: 'categoria',    label: 'Categoria' },
  { key: 'tipologia',    label: 'Tipologia' },
  { key: 'stato',        label: 'Stato' },
  { key: 'profilo',      label: 'Profilo' },
]
function colValue(p: Pratica, key: ColKey): string {
  switch (key) {
    case 'destinazione': return p.destinazione
    case 'categoria':    return `${p.categoria} stelle`
    case 'tipologia':    return TIPOLOGIA_META[p.tipologia].label
    case 'stato':        return STATO_PRATICA_META[p.stato].label
    case 'profilo':      return p.assegnazione.tipo === 'team' ? 'Tutto il team' : p.assegnazione.nome
  }
}

interface ColFilterHeaderProps {
  label: string
  options: string[]
  selected: string[] | null   // null = nessun filtro (tutti)
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}
function ColFilterHeader({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll }: ColFilterHeaderProps) {
  const allSelected = selected === null
  const isChecked = (o: string) => selected === null || selected.includes(o)
  return (
    <div className="mon-prat__cf">
      <span>{label}</span>
      <button
        type="button"
        className={'mon-prat__cf-btn' + (selected !== null ? ' mon-prat__cf-btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="mon-prat__cf-overlay" onClick={onToggleOpen} />
          <div className="mon-prat__cf-popup" onClick={(e) => e.stopPropagation()}>
            <div className="mon-prat__cf-title">{label}</div>
            <label className="mon-prat__cf-option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="mon-prat__cf-option">
                <input type="checkbox" className="sib-checkbox" checked={isChecked(opt)} onChange={() => onToggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────
export default function MonitoraggioPratiche({ navigate }: { navigate: (p: string) => void }) {
  const profili = useRuoliStore((s) => s.profili)
  const pratiche = usePraticheStore((s) => s.pratiche)
  const setStato = usePraticheStore((s) => s.setStato)
  const slaHours = usePraticheStore((s) => s.slaHours)
  const notificaSolleciti = usePraticheStore((s) => s.notificaSolleciti)
  const setSlaHours = usePraticheStore((s) => s.setSlaHours)
  const setNotificaSolleciti = usePraticheStore((s) => s.setNotificaSolleciti)

  // Tick per aggiornare i "tempi di gestione" in tempo reale (ogni minuto).
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  const [showConfig, setShowConfig] = useState(false)

  // ── Filtri di colonna ──────────────────────────────────────────────────────
  const [colFilters, setColFilters] = useState<Record<ColKey, string[] | null>>({
    destinazione: null, categoria: null, tipologia: null, stato: null, profilo: null,
  })
  const [openCol, setOpenCol] = useState<ColKey | null>(null)
  const distinct = useMemo(() => {
    const d = {} as Record<ColKey, string[]>
    COLS.forEach((c) => { d[c.key] = Array.from(new Set(pratiche.map((p) => colValue(p, c.key)))) })
    return d
  }, [pratiche])

  const toggleColValue = (key: ColKey, value: string) =>
    setColFilters((prev) => {
      const cur = prev[key] ?? distinct[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...prev, [key]: next.length === distinct[key].length ? null : next }
    })
  const selectAllCol = (key: ColKey, select: boolean) =>
    setColFilters((prev) => ({ ...prev, [key]: select ? null : [] }))
  // Card stato: filtro rapido a singolo stato (toggle).
  const toggleStatoCard = (label: string) =>
    setColFilters((prev) => ({
      ...prev,
      stato: prev.stato?.length === 1 && prev.stato[0] === label ? null : [label],
    }))

  const inRitardo = useMemo(() => praticheInRitardo(pratiche, slaHours, nowMs), [pratiche, slaHours, nowMs])
  const ritardoIds = useMemo(() => new Set(inRitardo.map((p) => p.id)), [inRitardo])
  const pendingCount = useMemo(() => pratiche.filter((p) => p.stato === 'in-attesa').length, [pratiche])
  const conteggi = useMemo(() => {
    const c: Record<StatoPratica, number> = { 'in-attesa': 0, 'in-corso': 0, confermata: 0, chiusa: 0 }
    pratiche.forEach((p) => { c[p.stato]++ })
    return c
  }, [pratiche])

  const righe = useMemo(
    () => pratiche.filter((p) => COLS.every((c) => colFilters[c.key] === null || colFilters[c.key]!.includes(colValue(p, c.key)))),
    [pratiche, colFilters],
  )

  return (
    <div className="mon-prat">
      <BtnBack />
      <PageHeader
        title="Monitoraggio pratiche"
        subtitle="Stato e profilo di gestione di ogni pratica, con tempo di gestione e solleciti automatici oltre la soglia"
      />

      {/* ── Card riepilogative (stile platform) + pending ─────────────────────── */}
      <div className="mon-prat__top">
        <div className="mon-prat__cards">
          {STATO_PRATICA_FLOW.map((s) => {
            const meta = STATO_PRATICA_META[s]
            const active = colFilters.stato?.length === 1 && colFilters.stato[0] === meta.label
            const valueMod =
              meta.tone === 'wait' ? ' sib-stat-card__value--warning'
              : meta.tone === 'ok' ? ' sib-stat-card__value--success'
              : ''
            return (
              <button
                key={s}
                type="button"
                className={`sib-stat-card mon-prat__card${active ? ' mon-prat__card--active' : ''}`}
                onClick={() => toggleStatoCard(meta.label)}
              >
                <span className="sib-stat-card__label">{meta.label}</span>
                <span className={`sib-stat-card__value${valueMod}`}>{conteggi[s]}</span>
              </button>
            )
          })}
        </div>

        <div className="mon-prat__pending">
          <span className="mon-prat__pending-icon"><i className="fa-light fa-bell" aria-hidden="true" /></span>
          <div className="mon-prat__pending-body">
            <span className="mon-prat__pending-num">{pendingCount}</span>
            <span className="mon-prat__pending-lbl">Pratiche in pending</span>
          </div>
          <button
            type="button"
            className="mon-prat__gear"
            title="Soglia sollecito (Configuratore)"
            aria-expanded={showConfig}
            onClick={() => setShowConfig((v) => !v)}
          >
            <i className="fa-light fa-gear" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Impostazioni sollecito (riflettono il Configuratore) */}
      {showConfig && (
        <div className="mon-prat__config">
          <div className="mon-prat__config-field">
            <label className="mon-prat__config-label">Soglia sollecito</label>
            <div className="mon-prat__config-input">
              <InputField
                name="slaHours"
                type="number"
                min={1}
                value={slaHours}
                onChange={(e) => setSlaHours(Number(e.target.value) || 1)}
              />
              <span className="mon-prat__config-suffix">ore</span>
            </div>
          </div>
          <CheckboxField
            className="mon-prat__config-toggle"
            name="notificaSolleciti"
            label="Notifica di sollecito automatica"
            checked={notificaSolleciti}
            onChange={(e) => setNotificaSolleciti(e.target.checked)}
          />
          <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => navigate('configuratore')}>
            <i className="fa-light fa-sliders" aria-hidden="true" /> Apri Configuratore
          </button>
        </div>
      )}

      {/* Alert sollecito */}
      {notificaSolleciti && inRitardo.length > 0 && (
        <div className="mon-prat__alert" role="status">
          <i className="fa-solid fa-bell" aria-hidden="true" />
          <span>
            <strong>{inRitardo.length}</strong> {inRitardo.length === 1 ? 'pratica in attesa' : 'pratiche in attesa'} oltre la soglia di {slaHours}h — sollecito di gestione attivato.
          </span>
        </div>
      )}

      {/* ── Tabella con filtri di colonna ─────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table mon-prat__table">
          <thead>
            <tr>
              {COLS.slice(0, 3).map((c) => (
                <th key={c.key}>
                  <ColFilterHeader
                    label={c.label}
                    options={distinct[c.key]}
                    selected={colFilters[c.key]}
                    open={openCol === c.key}
                    onToggleOpen={() => setOpenCol((o) => (o === c.key ? null : c.key))}
                    onToggle={(v) => toggleColValue(c.key, v)}
                    onSelectAll={(s) => selectAllCol(c.key, s)}
                  />
                </th>
              ))}
              <th>Budget</th>
              <th>
                <ColFilterHeader
                  label="Stato"
                  options={distinct.stato}
                  selected={colFilters.stato}
                  open={openCol === 'stato'}
                  onToggleOpen={() => setOpenCol((o) => (o === 'stato' ? null : 'stato'))}
                  onToggle={(v) => toggleColValue('stato', v)}
                  onSelectAll={(s) => selectAllCol('stato', s)}
                />
              </th>
              <th>Tempo di gestione</th>
              <th>
                <ColFilterHeader
                  label="Profilo"
                  options={distinct.profilo}
                  selected={colFilters.profilo}
                  open={openCol === 'profilo'}
                  onToggleOpen={() => setOpenCol((o) => (o === 'profilo' ? null : 'profilo'))}
                  onToggle={(v) => toggleColValue('profilo', v)}
                  onSelectAll={(s) => selectAllCol('profilo', s)}
                />
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 ? (
              <tr><td colSpan={8} className="sib-empty">Nessuna pratica per i filtri selezionati.</td></tr>
            ) : righe.map((p) => (
              <PraticaRow
                key={p.id}
                p={p}
                profili={profili}
                nowMs={nowMs}
                inRitardo={ritardoIds.has(p.id)}
                onStato={(s) => setStato(p.id, s)}
                onAccelera={() => navigate(`market-lens:${p.id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PraticaRow({
  p,
  profili,
  nowMs,
  inRitardo,
  onStato,
  onAccelera,
}: {
  p: Pratica
  profili: ProfiloRow[]
  nowMs: number
  inRitardo: boolean
  onStato: (s: StatoPratica) => void
  onAccelera: () => void
}) {
  const meta = STATO_PRATICA_META[p.stato]
  const ore = oreInGestione(p, nowMs)
  const isFinal = p.stato === 'confermata' || p.stato === 'chiusa'
  const idx = STATO_PRATICA_FLOW.indexOf(p.stato)
  const next = idx >= 0 && idx < STATO_PRATICA_FLOW.length - 1 ? STATO_PRATICA_FLOW[idx + 1] : null

  return (
    <tr className={inRitardo ? 'mon-prat__row--late' : ''}>
      <td>{p.destinazione}</td>
      <td>
        <span className="mon-prat__stars" aria-label={`${p.categoria} stelle`}>
          {[1, 2, 3, 4, 5].map((i) => <i key={i} className={`fa-${i <= p.categoria ? 'solid' : 'light'} fa-star`} aria-hidden="true" />)}
        </span>
      </td>
      <td>
        <span className="mon-prat__tipo">
          <i className={`fa-light fa-${TIPOLOGIA_META[p.tipologia].icon}`} aria-hidden="true" /> {TIPOLOGIA_META[p.tipologia].label}
        </span>
      </td>
      <td>{fmtEur(p.budget)}</td>
      <td>
        <span className={`mon-prat__badge mon-prat__badge--${meta.tone}`}>{meta.label}</span>
      </td>
      <td>
        <span className={`mon-prat__tempo${inRitardo ? ' mon-prat__tempo--late' : ''}`}>
          {isFinal ? (
            <span className="mon-prat__tempo-muted">—</span>
          ) : (
            <>
              <i className={`fa-${inRitardo ? 'solid' : 'light'} fa-clock`} aria-hidden="true" />
              {fmtDurata(ore)}
              {inRitardo && <i className="fa-solid fa-bell mon-prat__tempo-bell" title="Sollecito attivo" aria-hidden="true" />}
            </>
          )}
        </span>
      </td>
      <td><ProfiloCell assegnazione={p.assegnazione} profili={profili} /></td>
      <td className="mon-prat__td-actions">
        {inRitardo ? (
          <button
            type="button"
            className="sib-btn sib-btn--sm mon-prat__accelera"
            onClick={onAccelera}
            title="Apri Market lens per riformulare il preventivo"
          >
            <i className="fa-solid fa-gauge-high" aria-hidden="true" /> Accelera i tempi di gestione
          </button>
        ) : next ? (
          <button
            type="button"
            className="sib-btn sib-btn--secondary sib-btn--sm"
            onClick={() => onStato(next)}
            title={`Porta a "${STATO_PRATICA_META[next].label}"`}
          >
            {p.stato === 'in-attesa' ? 'Prendi in carico' : STATO_PRATICA_META[next].label}
          </button>
        ) : null}
      </td>
    </tr>
  )
}
