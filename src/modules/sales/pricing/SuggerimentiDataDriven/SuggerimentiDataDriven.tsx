import React, { useMemo, useEffect, useRef, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import PageHead from '../../../../core/components/PageHead'
import SelectField from '../../../../core/components/form/SelectField'
import DateRangeField from '../../../../core/components/form/DateRangeField'
import CheckboxField from '../../../../core/components/form/CheckboxField'
import Tooltip from '../../../../core/components/Tooltip'
import { withAcronimi } from '../../../../core/components/Acronimo'
import TruncatedText from '../../../../core/components/TruncatedText'
import Tabs from '../../../../core/components/Tabs'
import ToggleSwitch from '../../../../core/components/ToggleSwitch'
import { toast } from '../../../../core/components/Toast/useToast'
import './SuggerimentiDataDriven.sass'
import { useStruttureCliente } from '../../../../hooks/useStrutturaCorrente'

/**
 * Suggerimenti data driven — indicazioni strategiche data-driven su tariffe,
 * disponibilità (numero di camere da mettere a disposizione) e richieste extra
 * per gruppi. Tre corsie di schede (Pricing · Disponibilità · Richieste per
 * gruppi), filtrabili dalla toolbar e attivabili dalle lenti Tariffe/Disp./Gruppi.
 * Ogni scheda si seleziona e si invia; le inviate restano marcate "Inviato".
 */

interface PricingRow { id: number; struttura: string; dn: number; barAtt: number; att: number; barSug: number; sug: number; affidabilita: number; motivo: string }
interface DispRow { id: number; struttura: string; dn: number; tipo: string; edist: number; reale: number; suggerito: number; overbooking?: boolean; locked?: boolean; totem?: boolean; occupancy: number; bookingWindow: number; ovp: number; ovl: number }
interface GruppoRow { id: number; dn: number; notti: number; codice: string; label: string; camere: number; persone: number; tot: number }

// ── Dati demo ──────────────────────────────────────────────────────────────────
//  Suggerimenti sulle strutture del cliente corrente, a partire da oggi.
const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const GIORNI_BREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const traGiorni = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d }
const ddmm = (n: number) => { const d = traGiorni(n); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
const isoFra = (n: number) => { const d = traGiorni(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const quando = (n: number) => (n === 0 ? 'Oggi' : n === 1 ? 'Domani' : `Tra ${n} giorni`)

function datiDemo(h: string[]) {
  const H = (i: number) => h[i % Math.max(1, h.length)] ?? ''
  const PRICING: PricingRow[] = [
    { id: 1, struttura: H(0), dn: 4,  barAtt: 102, att: 135.10, barSug: 101, sug: 136.79, affidabilita: 4, motivo: 'Pick-up sopra il ritmo atteso' },
    { id: 2, struttura: H(1), dn: 5,  barAtt: 102, att: 135.10, barSug: 101, sug: 136.79, affidabilita: 3, motivo: 'Compset in rialzo nel weekend' },
    { id: 3, struttura: H(2), dn: 5,  barAtt: 101, att: 136.79, barSug: 99,  sug: 140.23, affidabilita: 5, motivo: 'Occupazione all\'88% a 5 giorni' },
    { id: 4, struttura: H(0), dn: 19, barAtt: 115, att: 114.96, barSug: 120, sug: 108.03, affidabilita: 3, motivo: 'Domanda sotto la media del periodo' },
    { id: 5, struttura: H(1), dn: 20, barAtt: 115, att: 114.96, barSug: 107, sug: 126.97, affidabilita: 4, motivo: 'Evento in città: ricerche +32%' },
    { id: 6, struttura: H(1), dn: 21, barAtt: 115, att: 114.96, barSug: 107, sug: 126.97, affidabilita: 4, motivo: 'Evento in città: ricerche +32%' },
  ]
  const DISP: DispRow[] = [
    { id: 1, struttura: H(2), dn: 0, tipo: 'Singola Classic',      edist: 3, reale: 2, suggerito: 1, totem: true, occupancy: 76, bookingWindow: 0, ovp: 6, ovl: 4 },
    { id: 2, struttura: H(1), dn: 0, tipo: 'Doppia Classic',       edist: 3, reale: 2, suggerito: 5, overbooking: false, occupancy: 82, bookingWindow: 0, ovp: 6, ovl: 4 },
    { id: 3, struttura: H(2), dn: 0, tipo: 'Doppia Classic',       edist: 3, reale: 2, suggerito: 0, locked: true, occupancy: 91, bookingWindow: 0, ovp: 6, ovl: 4 },
    { id: 4, struttura: H(1), dn: 1, tipo: 'Doppia Economy',       edist: 3, reale: 2, suggerito: 4, overbooking: false, occupancy: 68, bookingWindow: 1, ovp: 6, ovl: 4 },
    { id: 5, struttura: H(2), dn: 1, tipo: 'Doppia Economy',       edist: 3, reale: 2, suggerito: 0, locked: true, occupancy: 94, bookingWindow: 1, ovp: 6, ovl: 4 },
    { id: 6, struttura: H(1), dn: 2, tipo: 'Matrimoniale Economy', edist: 3, reale: 2, suggerito: 4, totem: true, occupancy: 57, bookingWindow: 2, ovp: 6, ovl: 4 },
  ]
  const anno = traGiorni(0).getFullYear()
  const GRUPPI: GruppoRow[] = [
    { id: 1, dn: 16, notti: 2, codice: `${anno}/016420`, label: 'Stop in Italy', camere: 16, persone: 30, tot: 4350 },
    { id: 2, dn: 27, notti: 3, codice: `${anno}/016424`, label: 'Stop in Italy', camere: 11, persone: 21, tot: 3213 },
  ]
  return { PRICING, DISP, GRUPPI }
}

const CATEGORIE = ['1', '2', '3', '4', '5']

// Azioni della toolbar: su viste strette (laptop con sidenav) diventano
// pulsanti-icona con tooltip esplicativa.
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

const eur = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`

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

/** Funnel di ordinamento (Tutti / ↑ $ / ↓ $) sulla tariffa suggerita. */
function SortMenu({ value, onChange }: { value: SortDir; onChange: (d: SortDir) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <span className="sdd__pop" ref={ref}>
      <Tooltip text="Ordina per tariffa suggerita">
        <button type="button" className={`sdd__icobtn ${value !== 'tutti' ? 'is-on' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Ordina">
          <i className="fa-solid fa-arrow-down-wide-short" aria-hidden="true" />
        </button>
      </Tooltip>
      {open && (
        <div className="sdd__menu">
          <button type="button" className={`sdd__menu-item sdd__menu-item--head ${value === 'tutti' ? 'is-active' : ''}`} onClick={() => { onChange('tutti'); setOpen(false) }}>Per data</button>
          <div className="sdd__menu-sep" />
          <div className="sdd__menu-label"><i className="fa-light fa-arrow-up-arrow-down" aria-hidden="true" /> Tariffa suggerita</div>
          <button type="button" className={`sdd__menu-item ${value === 'asc' ? 'is-active' : ''}`} onClick={() => { onChange('asc'); setOpen(false) }}><i className="fa-light fa-arrow-up" aria-hidden="true" /> Crescente</button>
          <button type="button" className={`sdd__menu-item ${value === 'desc' ? 'is-active' : ''}`} onClick={() => { onChange('desc'); setOpen(false) }}><i className="fa-light fa-arrow-down" aria-hidden="true" /> Decrescente</button>
        </div>
      )}
    </span>
  )
}

/** Filtro "Lista camere" con toggle "Solo totem". */
function TipoCameraFilter({ soloTotem, onApply }: { soloTotem: boolean; onApply: (v: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(soloTotem)
  const ref = useClickOutside(() => setOpen(false))
  return (
    <span className="sdd__pop" ref={ref}>
      <Tooltip text="Filtra tipologie camera">
        <button type="button" className={`sdd__icobtn ${soloTotem ? 'is-on' : ''}`} onClick={() => { if (!open) setDraft(soloTotem); setOpen((o) => !o) }} aria-label="Tipo camera">
          <i className="fa-solid fa-filter" aria-hidden="true" />
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

/** Tessera data (giorno della settimana · numero · mese). */
function DateTile({ dn }: { dn: number }) {
  const d = traGiorni(dn)
  return (
    <Tooltip text={quando(dn)}>
      <span className={`sdd__date ${dn <= 1 ? 'is-soon' : ''}`}>
        <span className="sdd__date-wd">{GIORNI_BREVI[d.getDay()]}</span>
        <span className="sdd__date-d">{d.getDate()}</span>
        <span className="sdd__date-m">{MESI_BREVI[d.getMonth()]}</span>
      </span>
    </Tooltip>
  )
}

/** Affidabilità del suggerimento su 5 tacche. */
function Confidence({ value }: { value: number }) {
  const label = ['molto bassa', 'bassa', 'media', 'alta', 'molto alta'][value - 1]
  return (
    <Tooltip text={`Affidabilità del modello: ${label}`}>
      <span className="sdd__conf" aria-label={`Affidabilità ${label}`}>
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? 'is-on' : ''} />)}
      </span>
    </Tooltip>
  )
}

/** Pallini camera: base comune, camere aggiunte (verde) o da togliere (tratteggio). */
function RoomPips({ from, to }: { from: number; to: number }) {
  const n = Math.max(from, to)
  return (
    <span className="sdd__pips" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const k = i < Math.min(from, to) ? 'base' : to > from ? 'add' : 'cut'
        return <span key={i} className={`sdd__pip sdd__pip--${k}`} />
      })}
    </span>
  )
}

interface LaneProps {
  kind: 'pricing' | 'disp' | 'gruppi'
  icon: string
  title: string
  summary: React.ReactNode
  tools: React.ReactNode
  onRefresh: () => void
  refreshing: boolean
  selectable: number
  selected: number
  onToggleAll: () => void
  onSend: () => void
  empty: string
  children: React.ReactNode
  count: number
}

/** Corsia: intestazione con accento colore, schede, barra di invio. */
function Lane({ kind, icon, title, summary, tools, onRefresh, refreshing, selectable, selected, onToggleAll, onSend, empty, children, count }: LaneProps) {
  const all = selectable > 0 && selected === selectable
  return (
    <section className={`sdd__lane sdd__lane--${kind}`}>
      <header className="sdd__lane-head">
        <span className="sdd__lane-ico"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span>
        <div className="sdd__lane-titles">
          <h2 className="sdd__lane-title">{title}</h2>
          <div className="sdd__lane-sum">{summary}</div>
        </div>
        <div className="sdd__lane-tools">
          {tools}
          <Tooltip text="Aggiorna suggerimenti">
            <button type="button" className={`sdd__icobtn ${refreshing ? 'is-spinning' : ''}`} onClick={onRefresh} aria-label="Aggiorna">
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className={`sdd__cards ${refreshing ? 'is-refreshing' : ''}`}>
        {count > 0 ? children : (
          <div className="sdd__empty">
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
            <span>{empty}</span>
          </div>
        )}
      </div>

      {count > 0 && (
        <footer className="sdd__lane-foot">
          <CheckboxField name={`all-${kind}`} label="Seleziona tutti" checked={all} disabled={selectable === 0} onChange={onToggleAll} />
          <span className="sdd__lane-count">{selected > 0 ? `${selected} selezionat${selected === 1 ? 'o' : 'i'}` : ''}</span>
          <button type="button" className="sib-btn sib-btn--primary sdd__send" disabled={selected === 0} onClick={onSend}>
            <i className="fa-solid fa-paper-plane-top" aria-hidden="true" /> Invia
          </button>
        </footer>
      )}
    </section>
  )
}

export default function SuggerimentiDataDriven({ navigate }: { navigate: (p: string) => void }) {
  // Prossimo mese, sulle strutture (con camere) del cliente corrente.
  const [from, setFrom] = useState(() => isoFra(0))
  const [to, setTo] = useState(() => isoFra(30))
  const [struttura, setStruttura] = useState('')
  const schede = useStruttureCliente()
  const STRUTTURE = useMemo(() => schede.filter((x) => x.camere > 0).map((x) => x.nome), [schede])
  const { PRICING, DISP, GRUPPI } = useMemo(() => datiDemo(STRUTTURE), [STRUTTURE])
  const [categoria, setCategoria] = useState('4')
  const [show, setShow] = useState({ tariffe: true, disp: true, gruppi: true })

  const [selP, setSelP] = useState<Set<number>>(new Set())
  const [selD, setSelD] = useState<Set<number>>(new Set())
  const [selG, setSelG] = useState<Set<number>>(new Set())
  const [sentP, setSentP] = useState<Set<number>>(new Set())
  const [sentD, setSentD] = useState<Set<number>>(new Set())
  const [sentG, setSentG] = useState<Set<number>>(new Set())
  const [ob, setOb] = useState<Record<number, boolean>>({})
  const [pricingModal, setPricingModal] = useState(false)
  const [ratePlan, setRatePlan] = useState<'flessibile' | 'nonRimborsabile'>('flessibile')
  const [sortSugg, setSortSugg] = useState<SortDir>('tutti')
  const [soloTotem, setSoloTotem] = useState(false)
  const [guidaOpen, setGuidaOpen] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  // Larghezza reale disponibile alla pagina (non il viewport, per essere robusti
  // alla sidenav): sotto soglia le azioni toolbar si comprimono in icone.
  const rootRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 1520))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // I filtri Struttura/Categoria restringono le schede di ogni corsia; le
  // richieste per gruppi non sono legate a una struttura specifica, quindi una
  // struttura selezionata le azzera.
  const fP = applySort(PRICING.filter((r) => !struttura || r.struttura === struttura), sortSugg, (r) => r.sug)
  const fD = DISP.filter((r) => (!struttura || r.struttura === struttura) && (!soloTotem || r.totem))
  const fG = GRUPPI.filter(() => !struttura)

  const okP = fP.filter((r) => !sentP.has(r.id))
  const okD = fD.filter((r) => !r.locked && !sentD.has(r.id))
  const okG = fG.filter((r) => !sentG.has(r.id))
  const nSel = (sel: Set<number>, ok: { id: number }[]) => ok.filter((r) => sel.has(r.id)).length

  const rialzi = fP.filter((r) => r.sug > r.att).length
  const deltaCamere = fD.filter((r) => !r.locked).reduce((s, r) => s + (r.suggerito - r.edist), 0)
  const camereGruppi = fG.reduce((s, r) => s + r.camere, 0)
  const valoreGruppi = fG.reduce((s, r) => s + r.tot, 0)

  const refresh = (k: string) => {
    setRefreshing(k)
    window.setTimeout(() => setRefreshing(null), 900)
  }

  const send = (
    ok: { id: number }[], sel: Set<number>,
    setSel: (s: Set<number>) => void, setSent: React.Dispatch<React.SetStateAction<Set<number>>>, cosa: string,
  ) => {
    const ids = ok.filter((r) => sel.has(r.id)).map((r) => r.id)
    if (!ids.length) return
    setSent((s) => new Set([...Array.from(s), ...ids]))
    setSel(new Set())
    toast.success(`Invio ai canali completato: ${ids.length} ${cosa}`, 'Suggerimenti applicati')
  }

  const LENTI = [
    { k: 'tariffe' as const, label: 'Tariffe', icon: 'fa-tags', n: fP.length },
    { k: 'disp' as const, label: 'Disponibilità', icon: 'fa-bed-front', n: fD.length },
    { k: 'gruppi' as const, label: 'Gruppi', icon: 'fa-people-group', n: fG.length },
  ]

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

        <div className="sdd__lenses" role="group" aria-label="Suggerimenti da mostrare">
          {LENTI.map((l) => (
            <button key={l.k} type="button" aria-pressed={show[l.k]}
              className={`sdd__lens sdd__lens--${l.k} ${show[l.k] ? 'is-active' : ''}`}
              onClick={() => setShow((s) => ({ ...s, [l.k]: !s[l.k] }))}>
              <i className={`fa-solid ${l.icon}`} aria-hidden="true" />
              {l.label}
              <span className="sdd__lens-n">{l.n}</span>
            </button>
          ))}
        </div>

        <div className="sdd__links">
          <Tooltip text="Screening open Price">
            <button type="button" className="sib-btn sib-btn--icon" onClick={() => navigate('screening-open')} aria-label="Screening open Price">
              <i className="fa-regular fa-microchip" aria-hidden="true" />
            </button>
          </Tooltip>
          {LINKS.map((l) => (narrow ? (
            <Tooltip key={l.page} text={l.label}>
              <button type="button" className="sib-btn sib-btn--icon" onClick={() => navigate(l.page)} aria-label={l.label}>
                <i className={`fa-regular ${l.icon}`} aria-hidden="true" />
              </button>
            </Tooltip>
          ) : (
            <button key={l.page} type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate(l.page)}>
              <i className={`fa-regular ${l.icon}`} aria-hidden="true" /> {l.label}
            </button>
          )))}
        </div>
      </div>

      {/* ── Corsie ── */}
      <div className="sdd__lanes">

        {show.tariffe && (
          <Lane kind="pricing" icon="fa-tags" title="Pricing" count={fP.length}
            summary={fP.length > 0
              ? <><strong>{fP.length}</strong> suggeriment{fP.length === 1 ? 'o' : 'i'} · <span className="sdd__up">{rialzi} rialz{rialzi === 1 ? 'o' : 'i'}</span> · <span className="sdd__dn">{fP.length - rialzi} ribass{fP.length - rialzi === 1 ? 'o' : 'i'}</span></>
              : 'Nessun suggerimento'}
            tools={<>
              <SortMenu value={sortSugg} onChange={setSortSugg} />
              <Tooltip text="Modifica strategie"><button type="button" className="sdd__icobtn" onClick={() => navigate('calendario-strategie')} aria-label="Modifica strategie"><i className="fa-solid fa-calendar-pen" aria-hidden="true" /></button></Tooltip>
            </>}
            onRefresh={() => refresh('p')} refreshing={refreshing === 'p'}
            selectable={okP.length} selected={nSel(selP, okP)}
            onToggleAll={() => setSelP(nSel(selP, okP) === okP.length ? new Set() : new Set(okP.map((r) => r.id)))}
            onSend={() => send(okP, selP, setSelP, setSentP, 'tariff' + (nSel(selP, okP) === 1 ? 'a' : 'e'))}
            empty="Nessun suggerimento di prezzo per il periodo selezionato.">
            {fP.map((r) => {
              const delta = ((r.sug - r.att) / r.att) * 100
              const up = delta > 0
              const sent = sentP.has(r.id)
              const sel = selP.has(r.id)
              return (
                <article key={r.id}
                  className={`sdd__card ${sel ? 'is-selected' : ''} ${sent ? 'is-sent' : ''}`}>
                  <div className="sdd__card-top">
                    {sent
                      ? <span className="sdd__sent"><i className="fa-solid fa-check" aria-hidden="true" /> Inviato</span>
                      : <CheckboxField name={`p-${r.id}`} checked={sel} onChange={() => setSelP((s) => toggleIn(s, r.id))} />}
                    <DateTile dn={r.dn} />
                    <div className="sdd__card-id">
                      <TruncatedText text={r.struttura} className="sdd__card-name" />
                      <span className="sdd__card-sub">{quando(r.dn)}</span>
                    </div>
                    <span className={`sdd__delta ${up ? 'is-up' : 'is-down'}`}>
                      <i className={`fa-solid ${up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
                      {pct(delta)}
                    </span>
                  </div>

                  <div className="sdd__price">
                    <div className="sdd__price-col">
                      <span className="sdd__price-lbl">{withAcronimi(`Attuale · BAR ${r.barAtt}`)}</span>
                      <span className="sdd__price-old">{eur(r.att)}</span>
                    </div>
                    <i className="fa-solid fa-arrow-right-long sdd__price-arrow" aria-hidden="true" />
                    <div className="sdd__price-col">
                      <span className="sdd__price-lbl">{withAcronimi(`Suggerito · BAR ${r.barSug}`)}</span>
                      <span className={`sdd__price-new ${up ? 'is-up' : 'is-down'}`}>{eur(r.sug)}</span>
                    </div>
                  </div>

                  <div className="sdd__card-foot">
                    <span className="sdd__why"><i className="fa-solid fa-lightbulb" aria-hidden="true" /><TruncatedText text={r.motivo} className="sdd__why-txt" /></span>
                    <Confidence value={r.affidabilita} />
                    <Tooltip text="Variazioni di pricing per tipologia">
                      <button type="button" className="sdd__cmp" onClick={() => { setRatePlan('flessibile'); setPricingModal(true) }} aria-label="Variazioni di pricing">
                        <i className="fa-solid fa-code-compare" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </div>
                </article>
              )
            })}
          </Lane>
        )}

        {show.disp && (
          <Lane kind="disp" icon="fa-bed-front" title="Disponibilità" count={fD.length}
            summary={fD.length > 0
              ? <><strong>{fD.length}</strong> tipologi{fD.length === 1 ? 'a' : 'e'} · saldo <span className={deltaCamere >= 0 ? 'sdd__up' : 'sdd__dn'}>{deltaCamere > 0 ? '+' : ''}{deltaCamere} camer{Math.abs(deltaCamere) === 1 ? 'a' : 'e'}</span></>
              : 'Nessun suggerimento'}
            tools={<>
              <TipoCameraFilter soloTotem={soloTotem} onApply={setSoloTotem} />
              <Tooltip text="Guida disponibilità"><button type="button" className="sdd__icobtn" onClick={() => setGuidaOpen(true)} aria-label="Guida disponibilità"><i className="fa-solid fa-circle-info" aria-hidden="true" /></button></Tooltip>
              <Tooltip text="Modifica strategie"><button type="button" className="sdd__icobtn" onClick={() => navigate('calendario-strategie')} aria-label="Modifica strategie"><i className="fa-solid fa-calendar-pen" aria-hidden="true" /></button></Tooltip>
            </>}
            onRefresh={() => refresh('d')} refreshing={refreshing === 'd'}
            selectable={okD.length} selected={nSel(selD, okD)}
            onToggleAll={() => setSelD(nSel(selD, okD) === okD.length ? new Set() : new Set(okD.map((r) => r.id)))}
            onSend={() => send(okD, selD, setSelD, setSentD, 'disponibilità')}
            empty="Nessun suggerimento di disponibilità per il periodo selezionato.">
            {fD.map((r) => {
              const diff = r.suggerito - r.edist
              const sent = sentD.has(r.id)
              const sel = selD.has(r.id)
              return (
                <article key={r.id}
                  className={`sdd__card ${sel ? 'is-selected' : ''} ${sent ? 'is-sent' : ''} ${r.locked ? 'is-locked' : ''}`}>
                  <div className="sdd__card-top">
                    {r.locked
                      ? <Tooltip text="Suggerimento in elaborazione"><span className="sdd__hourglass"><i className="fa-solid fa-hourglass-half" aria-hidden="true" /></span></Tooltip>
                      : sent
                        ? <span className="sdd__sent"><i className="fa-solid fa-check" aria-hidden="true" /> Inviato</span>
                        : <CheckboxField name={`d-${r.id}`} checked={sel} onChange={() => setSelD((s) => toggleIn(s, r.id))} />}
                    <DateTile dn={r.dn} />
                    <div className="sdd__card-id">
                      <span className="sdd__card-name-row">
                        <TruncatedText text={r.tipo} className="sdd__card-name" />
                        {r.totem && <Tooltip text="Camera totem"><span className="sdd__totem"><i className="fa-solid fa-star" aria-hidden="true" /></span></Tooltip>}
                      </span>
                      <TruncatedText text={r.struttura} className="sdd__card-sub" />
                    </div>
                    {r.locked
                      ? <span className="sdd__delta is-wait">In elaborazione</span>
                      : <span className={`sdd__delta ${diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}`}>{diff > 0 ? '+' : diff < 0 ? '−' : ''}{Math.abs(diff)} cam.</span>}
                  </div>

                  <div className="sdd__units">
                    <div className="sdd__units-col">
                      <span className="sdd__price-lbl">E-distribution</span>
                      <span className="sdd__units-n">
                        {r.edist}
                        <Tooltip text={`Disponibilità reale: ${r.reale} cam.`}><i className="fa-solid fa-circle-info sdd__info" aria-hidden="true" /></Tooltip>
                      </span>
                    </div>
                    <i className="fa-solid fa-arrow-right-long sdd__price-arrow" aria-hidden="true" />
                    <div className="sdd__units-col">
                      <span className="sdd__price-lbl">Suggerito</span>
                      <span className={`sdd__units-n is-sug ${diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}`}>{r.suggerito}</span>
                    </div>
                    <RoomPips from={r.edist} to={r.suggerito} />
                  </div>

                  <div className="sdd__drivers">
                    <Tooltip text="Occupancy della tipologia nella giornata">
                      <span className="sdd__chip sdd__chip--occ">
                        <span className="sdd__occ" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <span key={k} className={k < Math.round(r.occupancy / 10) ? 'is-on' : ''} />)}</span>
                        Occ. {r.occupancy}%
                      </span>
                    </Tooltip>
                    <Tooltip text="Booking window"><span className="sdd__chip"><i className="fa-solid fa-hourglass-start" aria-hidden="true" />{r.bookingWindow} gg</span></Tooltip>
                    <Tooltip text="Overbooking protection"><span className="sdd__chip">OVP {r.ovp}%</span></Tooltip>
                    <Tooltip text="Overbooking limit"><span className="sdd__chip">OVL {r.ovl}%</span></Tooltip>
                    {r.overbooking !== undefined && (
                      <span className="sdd__ob">
                        <span>Overbooking</span>
                        <ToggleSwitch checked={ob[r.id] ?? r.overbooking} onChange={(v) => setOb((o) => ({ ...o, [r.id]: v }))} disabled={sent} />
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </Lane>
        )}

        {show.gruppi && (
          <Lane kind="gruppi" icon="fa-people-group" title="Richieste per gruppi" count={fG.length}
            summary={fG.length > 0
              ? <><strong>{fG.length}</strong> richiest{fG.length === 1 ? 'a' : 'e'} · {camereGruppi} camere · {eur(valoreGruppi)}</>
              : 'Nessuna richiesta'}
            tools={
              <Tooltip text="Modifica strategie"><button type="button" className="sdd__icobtn" onClick={() => navigate('calendario-strategie')} aria-label="Modifica strategie"><i className="fa-solid fa-calendar-pen" aria-hidden="true" /></button></Tooltip>
            }
            onRefresh={() => refresh('g')} refreshing={refreshing === 'g'}
            selectable={okG.length} selected={nSel(selG, okG)}
            onToggleAll={() => setSelG(nSel(selG, okG) === okG.length ? new Set() : new Set(okG.map((r) => r.id)))}
            onSend={() => send(okG, selG, setSelG, setSentG, nSel(selG, okG) === 1 ? 'richiesta' : 'richieste')}
            empty="Nessun suggerimento trovato per la struttura/categoria selezionati.">
            {fG.map((r) => {
              const sent = sentG.has(r.id)
              const sel = selG.has(r.id)
              return (
                <article key={r.id}
                  className={`sdd__card ${sel ? 'is-selected' : ''} ${sent ? 'is-sent' : ''}`}>
                  <div className="sdd__card-top">
                    {sent
                      ? <span className="sdd__sent"><i className="fa-solid fa-check" aria-hidden="true" /> Inviato</span>
                      : <CheckboxField name={`g-${r.id}`} checked={sel} onChange={() => setSelG((s) => toggleIn(s, r.id))} />}
                    <DateTile dn={r.dn} />
                    <div className="sdd__card-id">
                      <TruncatedText text={r.label} className="sdd__card-name" />
                      <span className="sdd__card-sub">Pratica {r.codice}</span>
                    </div>
                    <span className="sdd__amount">{eur(r.tot)}</span>
                  </div>

                  <div className="sdd__stay">
                    <span className="sdd__stay-range">
                      {ddmm(r.dn)}
                      <span className="sdd__stay-line"><span>{r.notti} nott{r.notti === 1 ? 'e' : 'i'}</span></span>
                      {ddmm(r.dn + r.notti)}
                    </span>
                  </div>

                  <div className="sdd__drivers">
                    <span className="sdd__chip"><i className="fa-solid fa-bed" aria-hidden="true" />{r.camere} camere</span>
                    <span className="sdd__chip"><i className="fa-solid fa-user" aria-hidden="true" />{r.persone} persone</span>
                    <span className="sdd__chip">{eur(r.tot / r.camere / r.notti)} / cam. notte</span>
                    {!sent && (
                      <button type="button" className="sdd__link"
                        onClick={() => { setSentG((s) => new Set([...Array.from(s), r.id])); toast.success(`Pratica ${r.codice} confermata senza importo extra`) }}>
                        Conferma senza importo extra <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </Lane>
        )}

        {!show.tariffe && !show.disp && !show.gruppi && (
          <div className="sdd__none">
            <i className="fa-solid fa-chart-network" aria-hidden="true" />
            <span>Attiva una delle lenti — Tariffe, Disponibilità o Gruppi — per vedere i suggerimenti.</span>
          </div>
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
