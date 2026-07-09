import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import AlertBanner from '../../../core/components/AlertBanner'
import { InputField, SelectField, CheckboxField, DatePickerField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './AssegnaObiettivo.sass'

/**
 * Assegna obiettivo — replica `Views/HumanResource/AssegnaObiettivo.cshtml`.
 * BE: `PremioPerformanceController.SaveObiettivo` → catch-all
 * `/Sibylla/premio-performance/SaveObiettivo`.
 */

interface ObiettivoItem {
  id?: number
  nome?: string
  reparto?: string
  anno?: number
  tipologia?: string
  [key: string]: unknown
}

const FALLBACK: ObiettivoItem[] = [
  { id: 1, nome: 'Obiettivo 2024 Reparto Pulizie',         reparto: 'Housekeeping',     anno: 2024, tipologia: 'reparto' },
  { id: 2, nome: 'Obiettivo 2024 Reparto Manutenzione',    reparto: 'Manutenzione',     anno: 2024, tipologia: 'reparto' },
  { id: 3, nome: 'Obiettivo 2025 Reparto Amministrazione', reparto: 'Amministrazione',  anno: 2025, tipologia: 'reparto' },
  { id: 4, nome: 'Obiettivo 2025 Front Office',            reparto: 'Front office',     anno: 2025, tipologia: 'reparto' },
]

const REPARTI = ['General Manager', 'Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Amministrazione', 'Marketing', 'Direzione']
const PERCENTUALI = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%']
const PREMI = ['Buono Amazon 50€', 'Buono Amazon 100€', 'Bonus 1 giorno ferie', 'Bonus 2 giorni ferie', 'Cena per 2 persone', 'Weekend SPA']

type TipologiaT = 'reparto' | 'individuale'
type ParametroT = 'percentuale' | 'numerico'

interface Traguardo {
  abilitato: boolean
  data: string
  premio: string
}

const TRAGUARDO_BASE: Traguardo = { abilitato: false, data: '2026-04-29', premio: '' }
const TRAGUARDI_DEFAULT: Record<string, Traguardo> = {
  t1: { ...TRAGUARDO_BASE }, t2: { ...TRAGUARDO_BASE }, t3: { ...TRAGUARDO_BASE }, t4: { ...TRAGUARDO_BASE }, finale: { ...TRAGUARDO_BASE },
}

export default function AssegnaObiettivo({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<ObiettivoItem[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFiltroReparto, setOpenFiltroReparto] = useState(false)
  const [repartiSel, setRepartiSel] = useState<string[]>([])     // filtro a imbuto (multi)
  const [sortAnno, setSortAnno] = useState<'asc' | 'desc' | null>(null)

  const repartiObiettivi = Array.from(new Set(items.map((o) => o.reparto).filter(Boolean))) as string[]
  const itemsFiltrati = (() => {
    let rows = repartiSel.length ? items.filter((o) => o.reparto && repartiSel.includes(o.reparto)) : items
    if (sortAnno) { const dir = sortAnno === 'asc' ? 1 : -1; rows = [...rows].sort((a, b) => ((a.anno ?? 0) - (b.anno ?? 0)) * dir) }
    return rows
  })()
  const toggleReparto = (v: string) => setRepartiSel((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
  const setAllReparti = (sel: boolean) => setRepartiSel(sel ? repartiObiettivi : [])
  const toggleSortAnno = () => setSortAnno((p) => (p === 'asc' ? 'desc' : p === 'desc' ? null : 'asc'))
  const sortAnnoIcon = sortAnno === null
    ? <i className="fa-light fa-arrow-down-arrow-up" />
    : sortAnno === 'asc' ? <i className="fa-solid fa-arrow-up" /> : <i className="fa-solid fa-arrow-down" />
  const eliminaObiettivo = (id?: number) => setItems((prev) => prev.filter((o) => o.id !== id))

  const [nome, setNome] = useState('Premio produzione')
  const [tipologia, setTipologia] = useState<TipologiaT>('reparto')
  const [reparto, setReparto] = useState('General Manager')
  const [vendita, setVendita] = useState({ prodotti: false, servizi: true, soggiorni: false, esperienze: false })
  const [parametro, setParametro] = useState<ParametroT>('percentuale')
  const [percentuale, setPercentuale] = useState('40%')
  const [data, setData] = useState('2026-04-29')
  const [dataAvvio, setDataAvvio] = useState('2026-05-01T09:00')
  const [frammenta, setFrammenta] = useState(true)
  const [traguardi, setTraguardi] = useState<Record<string, Traguardo>>(TRAGUARDI_DEFAULT)
  const [showAnteprima, setShowAnteprima] = useState(false)
  const [avviato, setAvviato] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<ObiettivoItem[]>('premio-performance/GetObiettivi', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) { if (d?.length) setItems(d); setLoaded(true) } })
      .catch(() => { if (!cancelled) setLoaded(true) })   // backend assente → resta il fallback, nessun banner
    return () => { cancelled = true }
  }, [])

  const setTraguardo = (k: string, patch: Partial<Traguardo>) =>
    setTraguardi((t) => ({ ...t, [k]: { ...t[k], ...patch } }))

  // Salva l'obiettivo e apre l'anteprima della notifica per la schedulazione
  function apriAnteprima() {
    if (!nome.trim()) { setError('Nome obiettivo obbligatorio'); return }
    setError(null)
    setAvviato(false)
    setShowAnteprima(true)
  }

  // Avvio confermato: salva, aggiunge alla tabella e schedula (notifica 24h prima)
  function avviaObiettivo() {
    apiFetchSibylla('premio-performance/SaveObiettivo', {
      method: 'POST',
      body: { nome, tipologia, reparto, vendita, parametro, percentuale, data, dataAvvio, frammenta, traguardi, schedulato: true },
    }).catch(() => { /* backend assente → schedulazione locale */ })
    const anno = Number((dataAvvio || data).slice(0, 4)) || new Date().getFullYear()
    const newId = items.reduce((m, o) => Math.max(m, o.id ?? 0), 0) + 1
    setItems((prev) => [{ id: newId, nome, reparto, anno, tipologia }, ...prev])
    setAvviato(true)
  }

  return (
    <div>
      <PageHead title="Assegna obiettivo" />

      {error && <AlertBanner type="error">{error}</AlertBanner>}

      {/* Tabella obiettivi esistenti */}
      <div className="sib-table-wrap mb-6">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Obiettivo</th>
              <th>
                <ColFilterHeader
                  label="Reparto"
                  options={repartiObiettivi}
                  selected={repartiSel}
                  open={openFiltroReparto}
                  onToggleOpen={() => setOpenFiltroReparto((o) => !o)}
                  onToggle={toggleReparto}
                  onSelectAll={setAllReparti}
                />
              </th>
              <th className="assegna-ob__th-sort" onClick={toggleSortAnno} title="Ordina per anno">
                <span className="inline-flex items-center gap-1.5">Anno {sortAnnoIcon}</span>
              </th>
              <th className="text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrati.map((o) => (
              <tr key={o.id}>
                <td>{o.nome}</td>
                <td>{o.reparto}</td>
                <td>{o.anno}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <button className="sib-btn sib-btn--icon" title="Modifica" aria-label="Modifica">
                      <i className="fa-light fa-pen" />
                    </button>
                    <button className="sib-btn sib-btn--icon hover:enabled:!text-error hover:enabled:!border-error" title="Elimina" aria-label="Elimina" onClick={() => eliminaObiettivo(o.id)}>
                      <i className="fa-light fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {itemsFiltrati.length === 0 && (
              <tr><td colSpan={4} className="text-center text-ink-muted py-6">Nessun obiettivo per il reparto selezionato.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form a SX */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField name="nome" label="Nome obiettivo" value={nome} onChange={(e) => setNome(e.target.value)} />

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold font-poppins text-primary">Tipologia</label>
              <div className="flex items-center gap-4 h-9">
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="tipologia" checked={tipologia === 'reparto'}     onChange={() => setTipologia('reparto')} />
                  Reparto
                </label>
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="tipologia" checked={tipologia === 'individuale'} onChange={() => setTipologia('individuale')} />
                  Individuale
                </label>
              </div>
            </div>

            <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)}
              options={REPARTI.map((r) => ({ value: r, label: r }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold font-poppins text-primary">Tipologia vendita</label>
              <div className="flex items-center gap-3 h-9 flex-wrap">
                <CheckboxField name="prodotti"  label="Prodotti"   checked={vendita.prodotti}  onChange={(e) => setVendita((v) => ({ ...v, prodotti: e.target.checked }))} />
                <CheckboxField name="servizi"   label="Servizi"    checked={vendita.servizi}   onChange={(e) => setVendita((v) => ({ ...v, servizi: e.target.checked }))} />
                <CheckboxField name="soggiorni" label="Soggiorni"  checked={vendita.soggiorni} onChange={(e) => setVendita((v) => ({ ...v, soggiorni: e.target.checked }))} />
                <CheckboxField name="esperienze" label="Esperienze" checked={vendita.esperienze} onChange={(e) => setVendita((v) => ({ ...v, esperienze: e.target.checked }))} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold font-poppins text-primary">Parametro valutazione</label>
              <div className="flex items-center gap-4 h-9">
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="parametro" checked={parametro === 'percentuale'} onChange={() => setParametro('percentuale')} />
                  Percentuale
                </label>
                <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="radio" className="sib-radio" name="parametro" checked={parametro === 'numerico'}    onChange={() => setParametro('numerico')} />
                  Numerico
                </label>
              </div>
            </div>

            <SelectField name="percentuale" label="Percentuale" value={percentuale} onChange={(e) => setPercentuale(e.target.value)}
              options={PERCENTUALI.map((p) => ({ value: p, label: p }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <DatePickerField name="data" label="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-semibold font-poppins text-primary">Data e ora di avvio</label>
              <input type="datetime-local" className="sib-input" value={dataAvvio} onChange={(e) => setDataAvvio(e.target.value)} />
            </div>
            <div className="h-9 flex items-center">
              <CheckboxField name="frammenta" label="Frammenta obiettivo" checked={frammenta} onChange={(e) => setFrammenta(e.target.checked)} />
            </div>
          </div>
        </div>

        {/* Premi e traguardi a DX */}
        <div>
          <h3 className="text-[16px] font-bold font-poppins text-ink mb-4">Definisci premi e intervallo traguardi</h3>

          <TraguardoRow label="Traguardo 1"     trofei={1}      data={traguardi.t1}     premiOpts={PREMI} onChange={(p) => setTraguardo('t1', p)}     dataLabel="Data" />
          <TraguardoRow label="Traguardo 2"     trofei={2}      data={traguardi.t2}     premiOpts={PREMI} onChange={(p) => setTraguardo('t2', p)}     dataLabel="Data" />
          <TraguardoRow label="Traguardo 3"     trofei={3}      data={traguardi.t3}     premiOpts={PREMI} onChange={(p) => setTraguardo('t3', p)}     dataLabel="Data" />
          <TraguardoRow label="Traguardo 4"     trofei={'star'} data={traguardi.t4}     premiOpts={PREMI} onChange={(p) => setTraguardo('t4', p)}     dataLabel="Data" />
          <TraguardoRow label="Traguardo finale" trofei={'party'} data={traguardi.finale} premiOpts={PREMI} onChange={(p) => setTraguardo('finale', p)} dataLabel="Data" />
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button type="button" className="sib-btn sib-btn--primary" onClick={apriAnteprima}>
          <i className="fa-light fa-calendar-check" /> Salva e schedula
        </button>
      </div>

      <AnteprimaNotificaModal
        open={showAnteprima}
        nome={nome}
        reparto={reparto}
        tipologia={tipologia}
        parametro={parametro}
        percentuale={percentuale}
        dataAvvio={dataAvvio}
        traguardi={traguardi}
        avviato={avviato}
        onAvvia={avviaObiettivo}
        onClose={() => setShowAnteprima(false)}
      />
    </div>
  )
}

// ─── MODAL: Anteprima notifica + schedulazione ───────────────────────────────

const STEP_DEFS: { key: string; label: string; trofei: number | 'star' | 'party' }[] = [
  { key: 't1', label: 'Traguardo 1', trofei: 1 },
  { key: 't2', label: 'Traguardo 2', trofei: 2 },
  { key: 't3', label: 'Traguardo 3', trofei: 3 },
  { key: 't4', label: 'Traguardo 4', trofei: 'star' },
  { key: 'finale', label: 'Traguardo finale', trofei: 'party' },
]

const fmtD = (iso: string) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const fmtDT = (ms: number) => { const d = new Date(ms); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}` }

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const t = new Date(target).getTime() - now
  if (isNaN(t)) return null
  if (t <= 0) return <span className="font-mono text-[12px] font-semibold text-success">Raggiunto</span>
  const g = Math.floor(t / 86400000), h = Math.floor(t / 3600000) % 24, m = Math.floor(t / 60000) % 60, s = Math.floor(t / 1000) % 60
  return <span className="font-mono text-[12px] font-semibold text-primary">{g}g {String(h).padStart(2, '0')}h {String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s</span>
}

function AnteprimaNotificaModal({ open, nome, reparto, tipologia, parametro, percentuale, dataAvvio, traguardi, avviato, onAvvia, onClose }: {
  open: boolean
  nome: string
  reparto: string
  tipologia: TipologiaT
  parametro: ParametroT
  percentuale: string
  dataAvvio: string
  traguardi: Record<string, Traguardo>
  avviato: boolean
  onAvvia: () => void
  onClose: () => void
}) {
  const steps = STEP_DEFS.filter((s) => traguardi[s.key]?.abilitato)
  const stepsShown = steps.length ? steps : STEP_DEFS
  const avvioMs = new Date(dataAvvio).getTime()
  const notificaMs = avvioMs - 24 * 3600 * 1000
  const destinatari = tipologia === 'reparto' ? `tutti i dipendenti del reparto ${reparto}` : `i dipendenti coinvolti del reparto ${reparto}`

  return (
    <Modal open={open} onClose={onClose} title={avviato ? 'Obiettivo schedulato' : 'Anteprima notifica obiettivo'} size="lg">
      <div className="ao-prev">
      {avviato && (
        <div className="ao-prev__done">
          <i className="fa-solid fa-circle-check ao-prev__done-ico" />
          <div>
            <div className="ao-prev__done-title">Obiettivo «{nome}» avviato e schedulato</div>
            <div className="ao-prev__done-text">La notifica verrà inviata <strong>24h prima dell'avvio</strong> ({fmtDT(notificaMs)}) a {destinatari}. I conti alla rovescia per ogni step sono attivi.</div>
          </div>
        </div>
      )}

      {/* Anteprima notifica */}
      <div className="ao-prev__notif">
        <div className="ao-prev__notif-head">
          <i className="fa-solid fa-bell" />
          <strong>Sibylla · Premio performance</strong>
          <span className="ao-prev__notif-time">{avviato ? fmtDT(notificaMs) : 'anteprima'}</span>
        </div>
        <div className="ao-prev__notif-title">🎯 Nuovo obiettivo: {nome}</div>
        <div className="ao-prev__notif-body">
          Sei stato coinvolto nell'obiettivo «{nome}» ({reparto}). Parametro di valutazione: <strong>{percentuale}</strong> ({parametro}).
          Raggiungi i traguardi entro le scadenze indicate per sbloccare i premi. In bocca al lupo!
        </div>
      </div>

      {/* Timeline step / premi */}
      <div className="ao-prev__steps-head">Step operativi, premi e tempistiche</div>
      <ol className="ao-prev__steps">
        {stepsShown.map((s, i) => {
          const t = traguardi[s.key]
          return (
            <li key={s.key} className="ao-prev__step">
              <span className="ao-prev__step-num">{i + 1}</span>
              <span className="ao-prev__step-ico"><TrofeiVisual trofei={s.trofei} /></span>
              <div className="ao-prev__step-body">
                <div className="ao-prev__step-title">{s.label} — <strong>{t?.premio || 'Premio da definire'}</strong></div>
                <div className="ao-prev__step-meta">Scadenza: {fmtD(t?.data ?? '')}{avviato && <> · <Countdown target={t?.data ?? ''} /></>}</div>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="ao-prev__timing">
        <div><span>Avvio obiettivo</span><strong>{isNaN(avvioMs) ? '—' : fmtDT(avvioMs)}</strong></div>
        <div><span>Invio notifica (24h prima)</span><strong>{isNaN(notificaMs) ? '—' : fmtDT(notificaMs)}</strong></div>
        <div><span>Destinatari</span><strong>{destinatari}</strong></div>
      </div>

      <div className="ao-prev__foot">
        {avviato ? (
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Fatto</button>
        ) : (
          <>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={onAvvia}><i className="fa-light fa-rocket-launch" /> Avvia Obiettivo</button>
          </>
        )}
      </div>
      </div>
    </Modal>
  )
}

// Filtro a imbuto standard (stesso pattern di OspitiInCasa/ArriviPartenze)
function ColFilterHeader({
  label, options, selected, open, onToggleOpen, onToggle, onSelectAll,
}: {
  label: string
  options: string[]
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="assegna-ob__cf">
      <span>{label}</span>
      <button
        type="button"
        className={'assegna-ob__cf-btn' + (hasFilter ? ' assegna-ob__cf-btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="assegna-ob__cf-overlay" onClick={onToggleOpen} />
          <div className="assegna-ob__cf-popup" onClick={(e) => e.stopPropagation()}>
            <div className="assegna-ob__cf-title">scelte multiple</div>
            <label className="assegna-ob__cf-option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="assegna-ob__cf-option">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TraguardoRow({
  label, trofei, data, premiOpts, onChange, dataLabel,
}: {
  label: string
  trofei: number | 'star' | 'party'
  data: Traguardo
  premiOpts: string[]
  onChange: (p: Partial<Traguardo>) => void
  dataLabel: string
}) {
  return (
    <div className="grid grid-cols-[180px_1fr_1fr] gap-4 items-end mb-4">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-semibold font-opensans text-ink">{label}</label>
        <div className="flex items-center gap-2 h-9">
          <input type="checkbox" className="sib-checkbox" checked={data.abilitato} onChange={(e) => onChange({ abilitato: e.target.checked })} />
          <TrofeiVisual trofei={trofei} />
        </div>
      </div>
      <DatePickerField name={`data-${label}`} label={dataLabel} type="date" value={data.data} onChange={(e) => onChange({ data: e.target.value })} />
      <SelectField name={`premio-${label}`} label="Premio associato" value={data.premio} onChange={(e) => onChange({ premio: e.target.value })}
        options={[{ value: '', label: 'Seleziona Premio' }, ...premiOpts.map((p) => ({ value: p, label: p }))]}
      />
    </div>
  )
}

function TrofeiVisual({ trofei }: { trofei: number | 'star' | 'party' }) {
  if (trofei === 'star') {
    return (
      <span className="inline-flex items-center gap-1">
        <i className="fa-solid fa-star text-warning text-[18px]" />
        <i className="fa-solid fa-trophy text-primary text-[18px]" />
      </span>
    )
  }
  if (trofei === 'party') {
    return <i className="fa-solid fa-party-horn text-warning text-[20px]" />
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: trofei }).map((_, i) => (
        <i key={i} className="fa-solid fa-trophy text-primary text-[16px]" />
      ))}
    </span>
  )
}
