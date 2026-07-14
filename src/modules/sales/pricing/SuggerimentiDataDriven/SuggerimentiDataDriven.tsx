import React, { useEffect, useRef, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import PageHead from '../../../../core/components/PageHead'
import SelectField from '../../../../core/components/form/SelectField'
import DateRangeField from '../../../../core/components/form/DateRangeField'
import Tooltip from '../../../../core/components/Tooltip'
import Tabs from '../../../../core/components/Tabs'
import ToggleSwitch from '../../../../core/components/ToggleSwitch'
import './SuggerimentiDataDriven.sass'

/**
 * Suggerimenti data driven — indicazioni strategiche data-driven su tariffe,
 * disponibilità (numero di camere da mettere a disposizione) e richieste extra
 * per gruppi. Tre pannelli affiancati (Pricing · Disponibilità · Richieste per
 * gruppi), filtrabili dalla toolbar e attivabili dai toggle Tariffe/Disp./Gruppi.
 */

interface PricingRow { id: number; struttura: string; giorno: string; attuale: string; suggerito: string }
interface DispRow { id: number; struttura: string; giorno: string; tipo: string; edist: number; reale: number; suggerito: number; trend?: 'up' | 'down'; overbooking?: boolean; locked?: boolean; totem?: boolean; occupancy: number; bookingWindow: number; ovp: number; ovl: number }
interface GruppoRow { id: number; giorno: string; codice: string; label: string; periodo: string; camere: number; persone: number; tot: string }

const PRICING: PricingRow[] = [
  { id: 1, struttura: 'Hotel Lux',       giorno: '23 Giu 2026', attuale: 'BAR(102) - 135,10 €', suggerito: 'BAR(101) - 136,79 €' },
  { id: 2, struttura: 'Hotel Archimede', giorno: '24 Giu 2026', attuale: 'BAR(102) - 135,10 €', suggerito: 'BAR(101) - 136,79 €' },
  { id: 3, struttura: 'Hotel Luce',      giorno: '24 Giu 2026', attuale: 'BAR(101) - 136,79 €', suggerito: 'BAR(99) - 140,23 €' },
  { id: 4, struttura: 'Hotel Lux',       giorno: '08 Lug 2026', attuale: 'BAR(115) - 114,96 €', suggerito: 'BAR(120) - 108,03 €' },
  { id: 5, struttura: 'Hotel Archimede', giorno: '09 Lug 2026', attuale: 'BAR(115) - 114,96 €', suggerito: 'BAR(107) - 126,97 €' },
  { id: 6, struttura: 'Hotel Archimede', giorno: '10 Lug 2026', attuale: 'BAR(115) - 114,96 €', suggerito: 'BAR(107) - 126,97 €' },
]

const DISP: DispRow[] = [
  { id: 1, struttura: 'Hotel Luce',      giorno: '19 Giu 2026', tipo: 'Singola Classic',     edist: 3, reale: 2, suggerito: 1, totem: true, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
  { id: 2, struttura: 'Hotel Archimede', giorno: '19 Giu 2026', tipo: 'Doppia Classic',      edist: 3, reale: 2, suggerito: 5, trend: 'up', overbooking: false, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
  { id: 3, struttura: 'Hotel Luce',      giorno: '19 Giu 2026', tipo: 'Doppia Classic',      edist: 3, reale: 2, suggerito: 0, locked: true, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
  { id: 4, struttura: 'Hotel Archimede', giorno: '19 Giu 2026', tipo: 'Doppia Economy',      edist: 3, reale: 2, suggerito: 1, trend: 'up', overbooking: false, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
  { id: 5, struttura: 'Hotel Luce',      giorno: '19 Giu 2026', tipo: 'Doppia Economy',      edist: 3, reale: 2, suggerito: 0, locked: true, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
  { id: 6, struttura: 'Hotel Archimede', giorno: '19 Giu 2026', tipo: 'Matrimoniale Economy', edist: 3, reale: 2, suggerito: 4, totem: true, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
]

const GRUPPI: GruppoRow[] = [
  { id: 1, giorno: '05 Lug 2026', codice: '2026/016420', label: '[Stop in Italy]', periodo: '05/07-07/07', camere: 16, persone: 30, tot: '4.350,00€' },
  { id: 2, giorno: '16 Lug 2026', codice: '2026/016424', label: '[Stop in Italy]', periodo: '16/07-19/07', camere: 11, persone: 21, tot: '3.213,00€' },
]

const STRUTTURE = ['Hotel Lux', 'Hotel Archimede', 'Hotel Luce', "Grim's Hotel", 'Hotel Miranda']
const CATEGORIE = ['1', '2', '3', '4', '5']

// Azioni della toolbar: su viste strette (laptop con sidenav) diventano
// pulsanti-icona con tooltip esplicativa (vedi useElementNarrow).
const LINKS = [
  { icon: 'fa-calendar-days', label: 'Calendario master', page: 'calendario-master' },
  { icon: 'fa-table-list', label: 'Tariffe & disponibilità', page: 'tariffe-disp' },
  { icon: 'fa-ruler', label: 'Pianifica strategie', page: 'crea-strategia' },
]

// ── Dati modale "Suggerimenti proposti" ──────────────────────────────────────
// Ogni riga: tariffe Attuale e Suggerita per [Adulti, Ragazzi, Bambini, Infanti].
type Quad = [number, number, number, number]
interface RoomPrice { tipo: string; att: Quad; sug: Quad }

const RATE_STD: RoomPrice[] = [
  { tipo: 'Singola Classic',                    att: [83.11, 83.11, 15, 0],   sug: [72.70, 72.70, 15, 0] },
  { tipo: 'Doppia Economy',                     att: [95.41, 95.41, 15, 0],   sug: [84.34, 84.34, 15, 0] },
  { tipo: 'Matrimoniale Economy',               att: [95.41, 95.41, 15, 0],   sug: [84.34, 84.34, 15, 0] },
  { tipo: 'Matrimoniale Classic',               att: [104.73, 104.73, 15, 0], sug: [94.46, 94.46, 15, 0] },
  { tipo: 'Doppia Classic',                     att: [104.73, 104.73, 15, 0], sug: [94.46, 94.46, 15, 0] },
  { tipo: 'Matrimoniale Superior',              att: [123.31, 123.31, 15, 0], sug: [111.28, 111.28, 15, 0] },
  { tipo: 'Matrimoniale convertibile in Tripla', att: [126.71, 126.71, 15, 0], sug: [114.91, 114.91, 15, 0] },
  { tipo: 'Doppia convertibile in Tripla',      att: [126.71, 126.71, 15, 0], sug: [114.91, 114.91, 15, 0] },
  { tipo: 'Tripla Classic',                     att: [126.71, 126.71, 15, 0], sug: [114.91, 114.91, 15, 0] },
  { tipo: 'Matrimoniale Deluxe',                att: [132.09, 132.09, 15, 0], sug: [119.14, 119.14, 15, 0] },
  { tipo: 'Doppia convertibile in Quadrupla',   att: [145.97, 145.97, 15, 0], sug: [133.10, 133.10, 15, 0] },
  { tipo: 'DUS',                                att: [88.41, 88.41, 15, 0],   sug: [77.34, 77.34, 15, 0] },
]

const RATE_NR: RoomPrice[] = [
  { tipo: 'Singola Classic',                    att: [76.46, 76.46, 13.80, 0],   sug: [66.88, 66.88, 13.80, 0] },
  { tipo: 'Doppia Economy',                     att: [87.78, 87.78, 13.80, 0],   sug: [77.59, 77.59, 13.80, 0] },
  { tipo: 'Matrimoniale Economy',               att: [87.78, 87.78, 13.80, 0],   sug: [77.59, 77.59, 13.80, 0] },
  { tipo: 'Matrimoniale Classic',               att: [96.35, 96.35, 13.80, 0],   sug: [86.90, 86.90, 13.80, 0] },
  { tipo: 'Doppia Classic',                     att: [96.35, 96.35, 13.80, 0],   sug: [86.90, 86.90, 13.80, 0] },
  { tipo: 'Matrimoniale Superior',              att: [113.45, 113.45, 13.80, 0], sug: [102.38, 102.38, 13.80, 0] },
  { tipo: 'Matrimoniale convertibile in Tripla', att: [116.57, 116.57, 13.80, 0], sug: [105.72, 105.72, 13.80, 0] },
  { tipo: 'Doppia convertibile in Tripla',      att: [116.57, 116.57, 13.80, 0], sug: [105.72, 105.72, 13.80, 0] },
  { tipo: 'Tripla Classic',                     att: [116.57, 116.57, 13.80, 0], sug: [105.72, 105.72, 13.80, 0] },
  { tipo: 'Matrimoniale Deluxe',                att: [121.52, 121.52, 13.80, 0], sug: [109.61, 109.61, 13.80, 0] },
  { tipo: 'Doppia convertibile in Quadrupla',   att: [134.29, 134.29, 13.80, 0], sug: [122.45, 122.45, 13.80, 0] },
  { tipo: 'DUS',                                att: [81.34, 81.34, 13.80, 0],   sug: [71.15, 71.15, 13.80, 0] },
]

const eur = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`

// Abbreviazioni tipo camera per stare su una riga; il nome completo resta nel tooltip.
const TIPO_ABBR: Record<string, string> = {
  'Doppia Economy': 'Doppia Eco.',
  'Matrimoniale Economy': 'Matr. Econ.',
}
const shortTipo = (t: string) => TIPO_ABBR[t] ?? t

/** Tabella Attuale vs Suggerita per un piano tariffario. */
function PriceTable({ rows }: { rows: RoomPrice[] }) {
  return (
    <table className="sib-table sdd-modal__tbl">
      <thead>
        <tr className="sdd-modal__grp">
          <th aria-hidden />
          <th colSpan={4} className="sdd-modal__grp-cell">Attuale</th>
          <th colSpan={4} className="sdd-modal__grp-cell">Suggerita</th>
        </tr>
        <tr className="sdd-modal__sub">
          <th className="sdd-modal__th-room">Tipo camera</th>
          <th>Adulti</th><th>Ragazzi</th><th>Bambini</th><th>Infanti</th>
          <th>Adulti</th><th>Ragazzi</th><th>Bambini</th><th>Infanti</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.tipo}-${i}`}>
            <td className="sdd-modal__room">{r.tipo}</td>
            {r.att.map((v, j) => <td key={`a${j}`} className="sdd-modal__num">{eur(v)}</td>)}
            {r.sug.map((v, j) => {
              const dir = v < r.att[j] ? 'down' : v > r.att[j] ? 'up' : 'eq'
              return (
                <td key={`s${j}`} className="sdd-modal__num">
                  {eur(v)}
                  {dir === 'down' && <i className="fa-solid fa-arrow-down sdd-modal__dn" aria-label="in calo" />}
                  {dir === 'up' && <i className="fa-solid fa-arrow-up sdd-modal__up" aria-label="in aumento" />}
                  {dir === 'eq' && <i className="fa-solid fa-equals sdd-modal__eq" aria-label="invariato" />}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Helper per toggle di un id in un Set di selezione. */
function toggleIn(set: Set<number>, id: number): Set<number> {
  const n = new Set(set)
  n.has(id) ? n.delete(id) : n.add(id)
  return n
}

type SortDir = 'tutti' | 'asc' | 'desc'

/** Estrae il valore in euro da una stringa tipo "BAR(101) - 136,79 €". */
const parsePrice = (s: string): number => {
  const m = s.match(/([\d.]+),(\d{2})\s*€\s*$/)
  return m ? Number(`${m[1].replace(/\./g, '')}.${m[2]}`) : 0
}

function applySort<T>(rows: T[], dir: SortDir, key: (r: T) => number): T[] {
  if (dir === 'tutti') return rows
  return [...rows].sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)))
}

/** Hook: chiude il menu al click fuori dal contenitore. */
function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onOutside])
  return ref
}

/** Funnel di ordinamento (Tutti / ↑ $ / ↓ $) — colonna "Suggerito". */
function SortMenu({ value, onChange }: { value: SortDir; onChange: (d: SortDir) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <span className="sdd__pop" ref={ref}>
      <Tooltip text="Ordina">
        <button type="button" className={`sdd__filter-btn ${value !== 'tutti' ? 'is-on' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Ordina">
          <i className="fa-duotone fa-filter" aria-hidden="true" />
        </button>
      </Tooltip>
      {open && (
        <div className="sdd__menu">
          <button type="button" className={`sdd__menu-item sdd__menu-item--head ${value === 'tutti' ? 'is-active' : ''}`} onClick={() => { onChange('tutti'); setOpen(false) }}>Tutti</button>
          <div className="sdd__menu-sep" />
          <div className="sdd__menu-label"><i className="fa-light fa-arrow-up-arrow-down" aria-hidden="true" /> Ordina</div>
          <button type="button" className={`sdd__menu-item ${value === 'asc' ? 'is-active' : ''}`} onClick={() => { onChange('asc'); setOpen(false) }}><i className="fa-light fa-arrow-up" aria-hidden="true" /> $</button>
          <button type="button" className={`sdd__menu-item ${value === 'desc' ? 'is-active' : ''}`} onClick={() => { onChange('desc'); setOpen(false) }}><i className="fa-light fa-arrow-down" aria-hidden="true" /> $</button>
        </div>
      )}
    </span>
  )
}

/** Funnel "Tipo camera" — popover "Lista camere" con toggle "Solo totem". */
function TipoCameraFilter({ soloTotem, onApply }: { soloTotem: boolean; onApply: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(soloTotem)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <span className="sdd__pop" ref={ref}>
      <Tooltip text="Tipo camera">
        <button type="button" className={`sdd__filter-btn ${soloTotem ? 'is-on' : ''}`} onClick={() => { if (!open) setDraft(soloTotem); setOpen((o) => !o) }} aria-label="Tipo camera">
          <i className="fa-duotone fa-filter" aria-hidden="true" />
        </button>
      </Tooltip>
      {open && (
        <div className="sdd__menu sdd__menu--wide">
          <div className="sdd__menu-title">Lista camere</div>
          <div className="sdd__menu-row">
            <span>Solo totem</span>
            <ToggleSwitch checked={draft} onChange={setDraft} />
          </div>
          <div className="sdd__menu-actions">
            <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" onClick={() => { onApply(draft); setOpen(false) }}>OK</button>
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => setOpen(false)}>Annulla</button>
          </div>
        </div>
      )}
    </span>
  )
}

export default function SuggerimentiDataDriven({ navigate }: { navigate: (p: string) => void }) {
  const [from, setFrom] = useState('2026-06-19')
  const [to, setTo] = useState('2026-07-19')
  const [struttura, setStruttura] = useState('')
  const [categoria, setCategoria] = useState('4')
  const [show, setShow] = useState({ tariffe: true, disp: true, gruppi: true })

  const [selP, setSelP] = useState<Set<number>>(new Set())
  const [selD, setSelD] = useState<Set<number>>(new Set())
  const [selG, setSelG] = useState<Set<number>>(new Set())
  const [ob, setOb] = useState<Record<number, boolean>>({})
  const [pricingModal, setPricingModal] = useState(false)
  const [ratePlan, setRatePlan] = useState<'flessibile' | 'nonRimborsabile'>('flessibile')
  const [sortSugg, setSortSugg] = useState<SortDir>('tutti')
  const [soloTotem, setSoloTotem] = useState(false)
  const [guidaOpen, setGuidaOpen] = useState(false)

  // Larghezza reale disponibile alla pagina: sotto soglia (laptop con sidenav
  // aperta) le azioni toolbar si comprimono in icone. Misuriamo l'elemento
  // (non il viewport) per essere robusti alla presenza della sidenav.
  const rootRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  // stacked = pannelli in colonna singola (larghezza < 2 pannelli affiancati):
  // in questa condizione la Disponibilita e a piena larghezza, quindi mostra
  // le intestazioni/tipo camera per esteso (niente abbreviazioni).
  const [stacked, setStacked] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      setNarrow(w < 1360)
      setStacked(w < 1218)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // I filtri Struttura/Categoria restringono le righe di ogni pannello; le
  // richieste per gruppi non sono legate a una struttura specifica, quindi una
  // struttura selezionata le azzera.
  const fP = applySort(PRICING.filter((r) => !struttura || r.struttura === struttura), sortSugg, (r) => parsePrice(r.suggerito))
  const fD = DISP.filter((r) => (!struttura || r.struttura === struttura) && (!soloTotem || r.totem))
  const fG = GRUPPI.filter(() => !struttura)

  const allP = fP.length > 0 && fP.every((r) => selP.has(r.id))
  const allG = fG.length > 0 && fG.every((r) => selG.has(r.id))
  const selectableD = fD.filter((r) => !r.locked)
  const allD = selectableD.length > 0 && selectableD.every((r) => selD.has(r.id))

  return (
    <div className="sdd" ref={rootRef}>
      <PageHead
        title="Suggerimenti data driven"
        subtitle="Indicazioni strategiche data-driven su tariffe, numero di camere da mettere a disposizione, richieste extra per gruppi"
      />

      {/* ── Toolbar ── */}
      <div className="sdd__toolbar">
        <div className="sdd__filters">
          <DateRangeField label="Date" nameFrom="from" nameTo="to" valueFrom={from} valueTo={to}
            onChangeFrom={(e) => setFrom(e.target.value)} onChangeTo={(e) => setTo(e.target.value)} />
          <SelectField label="Struttura" name="struttura" value={struttura} placeholder="Tutte"
            onChange={(e) => setStruttura(e.target.value)}
            options={[{ value: '', label: 'Tutte' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]} />
          <SelectField label="Categoria" name="categoria" value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            options={[{ value: '', label: '----' }, ...CATEGORIE.map((c) => ({ value: c, label: c }))]} className="sdd__cat" />
        </div>

        <div className="sdd__segmented">
          <button type="button" className={`sdd__seg ${show.tariffe ? 'is-active' : ''}`} onClick={() => setShow((s) => ({ ...s, tariffe: !s.tariffe }))}>Tariffe</button>
          <button type="button" className={`sdd__seg ${show.disp ? 'is-active' : ''}`} onClick={() => setShow((s) => ({ ...s, disp: !s.disp }))}>Disponibilità</button>
          <button type="button" className={`sdd__seg ${show.gruppi ? 'is-active' : ''}`} onClick={() => setShow((s) => ({ ...s, gruppi: !s.gruppi }))}>Gruppi</button>
        </div>

        <div className="sdd__links">
          <Tooltip text="Screening open Price">
            <button type="button" className="sib-btn sib-btn--icon" onClick={() => navigate('screening-open')} aria-label="Screening open Price">
              <i className="fa-light fa-microchip" aria-hidden="true" />
            </button>
          </Tooltip>
          {LINKS.map((l) => (narrow ? (
            <Tooltip key={l.page} text={l.label}>
              <button type="button" className="sib-btn sib-btn--icon" onClick={() => navigate(l.page)} aria-label={l.label}>
                <i className={`fa-light ${l.icon}`} aria-hidden="true" />
              </button>
            </Tooltip>
          ) : (
            <button key={l.page} type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate(l.page)}>
              <i className={`fa-light ${l.icon}`} aria-hidden="true" /> {l.label}
            </button>
          )))}
        </div>
      </div>

      {/* ── Pannelli ── */}
      <div className="sdd__panels">

        {show.tariffe && (
          <section className="sdd__panel">
            <header className="sdd__panel-head">
              <Tooltip text="Aggiorna"><button type="button" className="sdd__icobtn" aria-label="Aggiorna"><i className="fa-light fa-arrows-rotate" aria-hidden="true" /></button></Tooltip>
              <h2 className="sdd__panel-title">Pricing</h2>
              <div className="sdd__panel-tools">
                <Tooltip text="Modifica Strategie"><button type="button" className="sdd__icobtn" onClick={() => navigate('calendario-strategie')} aria-label="Modifica Strategie"><i className="fa-light fa-calendar-pen" aria-hidden="true" /></button></Tooltip>
              </div>
            </header>
            <div className="sdd__scroll">
              <table className="sdd__tbl">
                <thead>
                  <tr>
                    <th className="sdd__col-check"><input type="checkbox" checked={allP} onChange={() => setSelP(allP ? new Set() : new Set(fP.map((r) => r.id)))} aria-label="Seleziona tutti" /></th>
                    <th>Struttura</th>
                    <th>Giorno</th>
                    <th>Attuale</th>
                    <th className="sdd__th-filter"><Tooltip text="Suggerito"><span>Sugg.</span></Tooltip> <SortMenu value={sortSugg} onChange={setSortSugg} /></th>
                  </tr>
                </thead>
                <tbody>
                  {fP.map((r) => (
                    <tr key={r.id}>
                      <td className="sdd__col-check"><input type="checkbox" checked={selP.has(r.id)} onChange={() => setSelP((s) => toggleIn(s, r.id))} aria-label={`Seleziona ${r.struttura}`} /></td>
                      <td className="sdd__nc">{r.struttura}</td>
                      <td className="sdd__nc">{r.giorno}</td>
                      <td className="sdd__hl sdd__hl--l">{r.attuale}</td>
                      <td className="sdd__hl sdd__hl--r">
                        <Tooltip text="Variazioni di pricing">
                          <button type="button" className="sdd__hl-ico" onClick={() => { setRatePlan('flessibile'); setPricingModal(true) }} aria-label="Variazioni di pricing">
                            <i className="fa-duotone fa-code-compare" aria-hidden="true" />
                          </button>
                        </Tooltip>
                        <strong>{r.suggerito}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fP.length === 0 && <div className="sdd__empty">Nessuna prenotazione disponibile per il periodo selezionato.</div>}
            </div>
            {fP.length > 0 && (
              <footer className="sdd__panel-foot">
                <button className="sib-btn sib-btn--primary sdd__send">Invia</button>
              </footer>
            )}
          </section>
        )}

        {show.disp && (
          <section className="sdd__panel">
            <header className="sdd__panel-head">
              <Tooltip text="Aggiorna"><button type="button" className="sdd__icobtn" aria-label="Aggiorna"><i className="fa-light fa-arrows-rotate" aria-hidden="true" /></button></Tooltip>
              <h2 className="sdd__panel-title">Disponibilità</h2>
              <div className="sdd__panel-tools">
                <Tooltip text="Guida disponibilità"><button type="button" className="sdd__icobtn" onClick={() => setGuidaOpen(true)} aria-label="Guida disponibilità"><i className="fa-light fa-circle-info" aria-hidden="true" /></button></Tooltip>
                <Tooltip text="Modifica Strategie"><button type="button" className="sdd__icobtn" onClick={() => navigate('calendario-strategie')} aria-label="Modifica Strategie"><i className="fa-light fa-calendar-pen" aria-hidden="true" /></button></Tooltip>
              </div>
            </header>
            <div className="sdd__scroll">
              <table className="sdd__tbl">
                <thead>
                  <tr>
                    <th className="sdd__col-check"><input type="checkbox" checked={allD} disabled={selectableD.length === 0} onChange={() => setSelD(allD ? new Set() : new Set(selectableD.map((r) => r.id)))} aria-label="Seleziona tutti" /></th>
                    <th>Struttura</th>
                    <th>Giorno</th>
                    <th className="sdd__th-filter">Tipo camera <TipoCameraFilter soloTotem={soloTotem} onApply={setSoloTotem} /></th>
                    <th className="sdd__col-num">{stacked ? 'E-distribution' : <Tooltip text="E-distribution"><span>E-distrib.</span></Tooltip>}</th>
                    <th className="sdd__col-num">{stacked ? 'Suggerito' : <Tooltip text="Suggerito"><span>Sugg.</span></Tooltip>}</th>
                    <th className="sdd__col-num">{stacked ? 'Overbooking limit' : <Tooltip text="Overbooking limit"><span>Over. limit</span></Tooltip>}</th>
                  </tr>
                </thead>
                <tbody>
                  {fD.map((r) => (
                    <tr key={r.id}>
                      <td className="sdd__col-check">
                        {r.locked
                          ? <i className="fa-light fa-hourglass-half sdd__hourglass" title="In elaborazione" aria-hidden="true" />
                          : <input type="checkbox" checked={selD.has(r.id)} onChange={() => setSelD((s) => toggleIn(s, r.id))} aria-label={`Seleziona ${r.tipo}`} />}
                      </td>
                      <td className="sdd__nc">{r.struttura}</td>
                      <td className="sdd__nc">{r.giorno}</td>
                      <td className="sdd__nc">
                        {!stacked && shortTipo(r.tipo) !== r.tipo
                          ? <Tooltip text={r.tipo}><span>{shortTipo(r.tipo)}</span></Tooltip>
                          : r.tipo}
                      </td>
                      <td className="sdd__col-num">
                        <span className="sdd__val">{r.edist}<Tooltip text={`Disponibilità reale: ${r.reale} Cam.`}><i className="fa-light fa-circle-info sdd__info" aria-hidden="true" /></Tooltip></span>
                      </td>
                      <td className="sdd__col-num">
                        <span className="sdd__val">
                          {r.suggerito}
                          {r.trend === 'up' && <i className="fa-light fa-arrow-up sdd__trend-up" aria-hidden="true" />}
                          {r.trend === 'down' && <i className="fa-light fa-arrow-down sdd__trend-down" aria-hidden="true" />}
                          <Tooltip content={<span className="sdd__tip">Occupancy: {r.occupancy}%<br />BookingWindow: {r.bookingWindow} giorni<br />OVP: {r.ovp}% OVL: {r.ovl}%</span>}><i className="fa-light fa-circle-info sdd__info" aria-hidden="true" /></Tooltip>
                        </span>
                      </td>
                      <td className="sdd__col-num">
                        {r.overbooking !== undefined && (
                          <ToggleSwitch checked={ob[r.id] ?? r.overbooking} onChange={(v) => setOb((o) => ({ ...o, [r.id]: v }))} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fD.length === 0 && <div className="sdd__empty">Nessuna prenotazione disponibile per il periodo selezionato.</div>}
            </div>
            {fD.length > 0 && (
              <footer className="sdd__panel-foot">
                <button className="sib-btn sib-btn--primary sdd__send">Invia</button>
              </footer>
            )}
          </section>
        )}

        {show.gruppi && (
          <section className="sdd__panel">
            <header className="sdd__panel-head">
              <Tooltip text="Aggiorna"><button type="button" className="sdd__icobtn" aria-label="Aggiorna"><i className="fa-light fa-arrows-rotate" aria-hidden="true" /></button></Tooltip>
              <h2 className="sdd__panel-title">Richieste per gruppi</h2>
              <div className="sdd__panel-tools">
                <Tooltip text="Modifica Strategie"><button type="button" className="sdd__icobtn" onClick={() => navigate('calendario-strategie')} aria-label="Modifica Strategie"><i className="fa-light fa-calendar-pen" aria-hidden="true" /></button></Tooltip>
              </div>
            </header>
            <div className="sdd__scroll">
              <table className="sdd__tbl">
                <thead>
                  <tr>
                    <th className="sdd__col-check"><input type="checkbox" checked={allG} disabled={fG.length === 0} onChange={() => setSelG(allG ? new Set() : new Set(fG.map((r) => r.id)))} aria-label="Seleziona tutti" /></th>
                    <th>Struttura</th>
                    <th>Giorno</th>
                    <th><Tooltip text="Suggerito"><span>Sugg.</span></Tooltip></th>
                  </tr>
                </thead>
                <tbody>
                  {fG.map((r) => (
                    <tr key={r.id}>
                      <td className="sdd__col-check"><input type="checkbox" checked={selG.has(r.id)} onChange={() => setSelG((s) => toggleIn(s, r.id))} aria-label={`Seleziona ${r.codice}`} /></td>
                      <td />
                      <td className="sdd__nc">{r.giorno}</td>
                      <td>
                        <div className="sdd__gruppo">
                          <span className="sdd__gruppo-info">
                            {r.codice} - {r.label} - {r.periodo} - <i className="fa-light fa-bed" aria-hidden="true" />{r.camere} <i className="fa-light fa-user" aria-hidden="true" />{r.persone} - Tot {r.tot}
                          </span>
                          <button type="button" className="sdd__gruppo-link">Conferma senza importo extra.</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fG.length === 0 && <div className="sdd__empty">Nessun suggerimento trovato per la struttura/categoria selezionati</div>}
            </div>
            {fG.length > 0 && (
              <footer className="sdd__panel-foot">
                <button className="sib-btn sib-btn--primary sdd__send">Invia</button>
              </footer>
            )}
          </section>
        )}

        {!show.tariffe && !show.disp && !show.gruppi && (
          <div className="sdd__none">Seleziona una delle opzioni per visualizzare la strategia.</div>
        )}

      </div>

      <Modal open={pricingModal} onClose={() => setPricingModal(false)} title="Suggerimenti proposti" size="xl" className="sdd-modal">
        <p className="sdd-modal__lead">Decidi quali dei consigli di Sibylla Platform attuare per implementare le tue performance</p>
        <Tabs
          tabs={[{ id: 'flessibile', label: 'Flessibile' }, { id: 'nonRimborsabile', label: 'Non Rimborsabile' }]}
          active={ratePlan}
          onChange={(id) => setRatePlan(id as 'flessibile' | 'nonRimborsabile')}
        />
        <div className="sdd-modal__body">
          {(ratePlan === 'flessibile' ? [RATE_STD] : [RATE_STD, RATE_NR]).map((rows, i) => (
            <PriceTable key={i} rows={rows} />
          ))}
        </div>
      </Modal>

      <Modal open={guidaOpen} onClose={() => setGuidaOpen(false)} title="Guida disponibilità" size="lg" className="sdd-guida">
        <p>In questa sezione, <strong>Disp. Attuale</strong> rappresenta le camere attualmente messe in vendita sui canali <strong>O.T.A. (Online Travel Agency)</strong>.</p>
        <p>Qui puoi anche consultare la <strong>disponibilità reale residua</strong>, che può essere diversa da quella esposta online.</p>
        <p>Quando necessario, viene inoltre evidenziato se una parte del residuo deve essere preservata per la <strong>riprotezione</strong> di altre tipologie di camera in overbooking nella stessa data.</p>
        <p>Il valore <strong>Suggerito</strong> viene calcolato in modalità <strong>protetta</strong> o <strong>non protetta</strong>, per supportarti nella scelta più efficace della disponibilità da pubblicare.</p>
        <p>Nella sezione trovi anche il dettaglio dei principali driver che compongono il suggerimento:</p>
        <ul className="sdd-guida__list">
          <li><strong>occupancy</strong> della tipologia di camera nella giornata;</li>
          <li><strong>booking window</strong>, cioè i giorni che separano l'oggi dalla data di prenotabilità;</li>
          <li><strong>OVL</strong>, il valore di <strong>Overbooking Limit</strong> configurato in piattaforma;</li>
          <li><strong>OVP</strong>, il valore di <strong>Overbooking Protection</strong> configurato in piattaforma;</li>
          <li>l'eventuale quota riservata alla <strong>riprotezione</strong>, quando il suggerimento protetto viene ribassato.</li>
        </ul>
      </Modal>
    </div>
  )
}
