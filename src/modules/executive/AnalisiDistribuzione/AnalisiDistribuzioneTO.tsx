import React, { useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts'
import GaugeArc from '../../../core/components/GaugeArc'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import SuggerimentiModal from './SuggerimentiModal'
import './AnalisiDistribuzioneTO.sass'

// ─── ANALISI DELLA DISTRIBUZIONE — variante Tour Operator ────────────────────────
//  Analisi per DESTINAZIONE e CITTÀ (default "Tutte le città"). Con "Tutte le città"
//  la vista è completa (Eventi, Meteo, Market demand); selezionando una singola città
//  la vista è semplificata e quelle tre colonne sono nascoste. Dati mock deterministici.

// ── Destinazioni → città ──────────────────────────────────────────────────────────
const TUTTE = 'Tutte le città'
const DESTINAZIONI: Record<string, string[]> = {
  'Mar Rosso':      ['Sharm el-Sheikh', 'Hurghada', 'Marsa Alam'],
  'Grecia & Isole': ['Atene', 'Santorini', 'Mykonos', 'Rodi'],
  'Andalusia':      ['Siviglia', 'Granada', 'Malaga', 'Cordova'],
  'Maldive':        ['Malé', 'Maafushi', 'Addu'],
  'Tour Capitali':  ['Roma', 'Parigi', 'Praga', 'Vienna'],
}
const DEST_KEYS = Object.keys(DESTINAZIONI)

// ── Box informativo all'hover in PORTAL (non tagliato dall'overflow) ──────────────
function HoverCard({ trigger, children, width }: { trigger: React.ReactNode; children: React.ReactNode; width: number }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const ref = useRef<HTMLSpanElement>(null)
  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - width - 12)), top: r.bottom + 8 })
    setOpen(true)
  }
  return (
    <span ref={ref} className="adto__hc-trig" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      {trigger}
      {open && createPortal(
        <div className="adto__hc" style={{ left: pos.left, top: pos.top, width }}>{children}</div>,
        document.body,
      )}
    </span>
  )
}

// ── Eventi ──────────────────────────────────────────────────────────────────────
interface EventoMeta { icon: string; label: string; nome: string; img: string; ora: string }
const EVENTI: Record<string, EventoMeta> = {
  concerto: { icon: 'fa-music',         label: 'Concerto',         nome: 'Concerto live in piazza',       img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=420', ora: '21:00' },
  sport:    { icon: 'fa-futbol',        label: 'Evento sportivo',  nome: 'Torneo internazionale',         img: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=420', ora: '20:45' },
  cultura:  { icon: 'fa-masks-theater', label: 'Evento culturale', nome: 'Prima teatrale',                img: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=420', ora: '20:30' },
  sagra:    { icon: 'fa-wine-glass',    label: 'Sagra',            nome: 'Festa gastronomica locale',     img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=420', ora: '19:00' },
  festival: { icon: 'fa-party-horn',    label: 'Festival',         nome: 'Festival cittadino',            img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=420', ora: 'tutto il giorno' },
  fiera:    { icon: 'fa-store',         label: 'Fiera',            nome: 'Fiera del turismo',             img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=420', ora: '09:00–20:00' },
  mostra:   { icon: 'fa-palette',       label: 'Mostra',           nome: 'Mostra d\'arte',                img: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=420', ora: '10:00–19:00' },
}
function EventHover({ evType, date, citta }: { evType: string; date: string; citta: string }) {
  const ev = EVENTI[evType] ?? EVENTI.festival
  return (
    <HoverCard width={230} trigger={<i className={`fa-duotone ${ev.icon} adto__ev-ico`} aria-hidden="true" />}>
      <span className="adto__ev-pop-media">
        <img src={ev.img} alt={ev.nome} />
        <span className="adto__ev-pop-tag">{ev.label}</span>
      </span>
      <span className="adto__ev-pop-body">
        <span className="adto__ev-pop-name">{ev.nome}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-calendar" /> {date}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-clock" /> {ev.ora}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-location-dot" /> {citta}</span>
      </span>
    </HoverCard>
  )
}

// ── Meteo ─────────────────────────────────────────────────────────────────────────
interface MeteoMeta { icon: string; label: string; img: string; umidita: string; vento: string }
const METEO: Record<string, MeteoMeta> = {
  sereno:   { icon: 'fa-sun',        label: 'Sereno',                img: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=420', umidita: '40%', vento: '8 km/h' },
  parziale: { icon: 'fa-cloud-sun',  label: 'Parzialmente nuvoloso', img: 'https://images.unsplash.com/photo-1611928482473-7b27d24eab80?w=420', umidita: '55%', vento: '12 km/h' },
  nuvoloso: { icon: 'fa-cloud',      label: 'Nuvoloso',              img: 'https://images.unsplash.com/photo-1499956827185-0d63ee78a910?w=420', umidita: '66%', vento: '15 km/h' },
  pioggia:  { icon: 'fa-cloud-rain', label: 'Pioggia',               img: 'https://images.unsplash.com/photo-1438449805896-28a666819a20?w=420', umidita: '85%', vento: '20 km/h' },
}
function MeteoHover({ cond, temp, date, citta }: { cond: string; temp: string; date: string; citta: string }) {
  const m = METEO[cond] ?? METEO.sereno
  return (
    <HoverCard width={230} trigger={<i className={`fa-duotone ${m.icon} adto__meteo-ico`} aria-hidden="true" />}>
      <span className="adto__ev-pop-media">
        <img src={m.img} alt={m.label} />
        <span className="adto__ev-pop-tag">{m.label}</span>
      </span>
      <span className="adto__ev-pop-body">
        <span className="adto__meteo-pop-temp">{temp}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-calendar" /> {date}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-location-dot" /> {citta}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-droplet" /> Umidità {m.umidita}</span>
        <span className="adto__ev-pop-info"><i className="fa-duotone fa-wind" /> Vento {m.vento}</span>
      </span>
    </HoverCard>
  )
}

// ── Righe base (15 giorni) ────────────────────────────────────────────────────────
type Market = 'basso' | 'medio' | 'alto'
interface RowBase {
  date: string
  evType: string
  meteo: string
  temp: string
  market: Market
  stag: string
  ospiti: number
  vendute: number
  giacenza: number   // camere a contratto (giacenza)
  sugg: number
}
const ROWS: RowBase[] = [
  { date: '09/06/2026', evType: 'concerto', meteo: 'sereno',   temp: '28°', market: 'medio', stag: 'Alta Stagione', ospiti: 112, vendute: 46, giacenza: 60, sugg: 3 },
  { date: '10/06/2026', evType: 'sport',    meteo: 'parziale', temp: '27°', market: 'alto',  stag: 'Alta Stagione', ospiti: 128, vendute: 52, giacenza: 60, sugg: 2 },
  { date: '11/06/2026', evType: 'cultura',  meteo: 'nuvoloso', temp: '24°', market: 'alto',  stag: 'Alta Stagione', ospiti: 141, vendute: 55, giacenza: 60, sugg: 4 },
  { date: '12/06/2026', evType: 'sagra',    meteo: 'pioggia',  temp: '21°', market: 'basso', stag: 'Alta Stagione', ospiti: 98,  vendute: 40, giacenza: 60, sugg: 1 },
  { date: '13/06/2026', evType: 'festival', meteo: 'sereno',   temp: '29°', market: 'alto',  stag: 'Alta Stagione', ospiti: 133, vendute: 51, giacenza: 60, sugg: 3 },
  { date: '14/06/2026', evType: 'fiera',    meteo: 'parziale', temp: '26°', market: 'medio', stag: 'Alta Stagione', ospiti: 104, vendute: 43, giacenza: 60, sugg: 2 },
  { date: '15/06/2026', evType: 'mostra',   meteo: 'nuvoloso', temp: '23°', market: 'basso', stag: 'Alta Stagione', ospiti: 88,  vendute: 38, giacenza: 60, sugg: 0 },
  { date: '16/06/2026', evType: 'concerto', meteo: 'sereno',   temp: '30°', market: 'medio', stag: 'Alta Stagione', ospiti: 119, vendute: 47, giacenza: 60, sugg: 2 },
  { date: '17/06/2026', evType: 'sport',    meteo: 'sereno',   temp: '31°', market: 'alto',  stag: 'Alta Stagione', ospiti: 137, vendute: 54, giacenza: 60, sugg: 3 },
  { date: '18/06/2026', evType: 'cultura',  meteo: 'parziale', temp: '28°', market: 'alto',  stag: 'Alta Stagione', ospiti: 145, vendute: 57, giacenza: 60, sugg: 5 },
  { date: '19/06/2026', evType: 'sagra',    meteo: 'pioggia',  temp: '22°', market: 'basso', stag: 'Alta Stagione', ospiti: 91,  vendute: 39, giacenza: 60, sugg: 1 },
  { date: '20/06/2026', evType: 'festival', meteo: 'nuvoloso', temp: '25°', market: 'medio', stag: 'Alta Stagione', ospiti: 121, vendute: 48, giacenza: 60, sugg: 2 },
  { date: '21/06/2026', evType: 'mostra',   meteo: 'sereno',   temp: '29°', market: 'alto',  stag: 'Alta Stagione', ospiti: 130, vendute: 50, giacenza: 60, sugg: 3 },
  { date: '22/06/2026', evType: 'fiera',    meteo: 'parziale', temp: '27°', market: 'medio', stag: 'Alta Stagione', ospiti: 108, vendute: 44, giacenza: 60, sugg: 2 },
  { date: '23/06/2026', evType: 'concerto', meteo: 'sereno',   temp: '32°', market: 'alto',  stag: 'Alta Stagione', ospiti: 139, vendute: 53, giacenza: 60, sugg: 4 },
]

const STAGIONI_PERIODI: Record<string, string[]> = {
  'Alta Stagione': ['Dal 01/01/2026 al 29/05/2026', 'Dal 03/06/2026 al 03/08/2026', 'Dal 01/09/2026 al 31/10/2026'],
  'Bassa Stagione': ['Dal 30/05/2026 al 02/06/2026', 'Dal 04/08/2026 al 31/08/2026'],
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── Confronto LY (anno su anno) ─────────────────────────────────────────────────
function ConfrontaLY({ ospiti, vendute, date }: { ospiti: number; vendute: number; date: string }) {
  const data = [
    { kpi: 'Ospiti', ty: ospiti, ly: Math.round(ospiti * 0.87) },
    { kpi: 'Vendute', ty: vendute, ly: Math.round(vendute * 0.82) },
  ]
  return (
    <HoverCard width={280} trigger={
      <button type="button" className="adto__ly-btn" aria-label="Confronta con l'anno precedente">
        <i className="fa-duotone fa-chart-column" aria-hidden="true" />
      </button>
    }>
      <div className="adto__hc-pad">
        <span className="adto__ly-title">Confronto anno su anno · {date}</span>
        <BarChart width={244} height={150} data={data} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barGap={2} barCategoryGap="30%">
          <CartesianGrid stroke="#E0E7EE" vertical={false} />
          <XAxis dataKey="kpi" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} />
          <YAxis tick={{ fontSize: 10, fill: '#6E7175' }} tickLine={false} axisLine={false} width={30} />
          <RTooltip />
          <Bar dataKey="ty" name="Quest'anno" fill="#204769" radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="ly" name="Anno scorso" fill="#C3C9D0" radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
        <span className="adto__ly-legend">
          <span className="adto__ly-leg"><span className="adto__ly-dot adto__ly-dot--ty" /> Quest'anno</span>
          <span className="adto__ly-leg"><span className="adto__ly-dot adto__ly-dot--ly" /> Anno scorso</span>
        </span>
      </div>
    </HoverCard>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────────────
export default function AnalisiDistribuzioneTO({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [destinazione, setDestinazione] = useState(DEST_KEYS[0])
  const [citta, setCitta] = useState(TUTTE)
  const [suggOpen, setSuggOpen] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  // Selezione destinazione → resetta la città a "Tutte le città"
  const onDest = (v: string) => { setDestinazione(v); setCitta(TUTTE); setPage(1) }
  const onCitta = (v: string) => { setCitta(v); setPage(1) }

  // Con "Tutte le città" la vista è completa; con una città specifica è semplificata.
  const vistaCompleta = citta === TUTTE

  // I numeri scalano in base alla selezione (aggregato città vs singola città).
  const rows = useMemo(() => {
    const cityFactor = vistaCompleta ? 1 : 0.3 + (hashStr(citta) % 5) * 0.08
    const destFactor = 0.75 + (hashStr(destinazione) % 6) * 0.08
    return ROWS.map((r) => {
      const ospiti = Math.round(r.ospiti * cityFactor * destFactor)
      const vendute = Math.round(r.vendute * cityFactor * destFactor)
      const giacenza = Math.max(vendute, Math.round(r.giacenza * cityFactor * destFactor))
      return { ...r, ospiti, vendute, giacenza, residua: giacenza - vendute }
    })
  }, [destinazione, citta, vistaCompleta])

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const cittaLabel = vistaCompleta ? destinazione : citta

  return (
    <div className="adto">
      <PageHead
        title="Analisi della distribuzione"
        subtitle="Esplorazione analitica della distribuzione delle vendite per destinazione e città, con KPI strategici per guidare la programmazione"
      />

      {/* ── Box Destinazione + Città (in alto a sinistra) ────────────────────── */}
      <div className="adto__boxes">
        <div className="adto__box">
          <span className="adto__box-lbl"><i className="fa-solid fa-earth-europe" aria-hidden="true" /> Destinazione</span>
          <SelectField
            name="destinazione"
            value={destinazione}
            options={DEST_KEYS.map((d) => ({ value: d, label: d }))}
            onChange={(e) => onDest(e.target.value)}
          />
        </div>
        <div className="adto__box">
          <span className="adto__box-lbl"><i className="fa-solid fa-location-dot" aria-hidden="true" /> Città</span>
          <SelectField
            name="citta"
            value={citta}
            options={[{ value: TUTTE, label: TUTTE }, ...DESTINAZIONI[destinazione].map((c) => ({ value: c, label: c }))]}
            onChange={(e) => onCitta(e.target.value)}
          />
        </div>
        {!vistaCompleta && (
          <span className="adto__simplified" title="Con una città specifica la vista è semplificata">
            <i className="fa-solid fa-filter" aria-hidden="true" /> Vista semplificata
          </span>
        )}
      </div>

      {/* ── Tabella ──────────────────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table adto__table">
          <thead>
            <tr>
              <th className="adto__c-center">LY</th>
              <th>Data</th>
              {vistaCompleta && <th className="adto__c-center">Eventi</th>}
              {vistaCompleta && <th className="adto__c-center">Meteo</th>}
              {vistaCompleta && <th>Market demand</th>}
              <th>Stagionalità</th>
              <th className="adto__c-num">
                <Tooltip text="Numero di ospiti presenti nella struttura"><span>Ospiti presenti</span></Tooltip>
              </th>
              <th className="adto__c-num">Camere vendute</th>
              <th className="adto__c-num">
                <Tooltip text="Disponibilità residua da giacenza a contratto"><span>Disponibilità</span></Tooltip>
              </th>
              <th className="adto__c-num">
                <Tooltip text="Suggerimenti data-driven accolti"><span>Sugg. accolti</span></Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.date}>
                <td className="adto__c-center"><ConfrontaLY ospiti={r.ospiti} vendute={r.vendute} date={r.date} /></td>
                <td className="adto__nowrap">{r.date}</td>
                {vistaCompleta && <td className="adto__c-center"><EventHover evType={r.evType} date={r.date} citta={cittaLabel} /></td>}
                {vistaCompleta && <td className="adto__c-center"><MeteoHover cond={r.meteo} temp={r.temp} date={r.date} citta={cittaLabel} /></td>}
                {vistaCompleta && <td><GaugeArc level={r.market} /></td>}
                <td>
                  <Tooltip content={
                    <span className="adto__stag-tip">
                      {(STAGIONI_PERIODI[r.stag] ?? []).map((p) => <span key={p} className="adto__stag-tip-row">{p}</span>)}
                    </span>
                  }>
                    <span className="adto__stag">{r.stag}</span>
                  </Tooltip>
                </td>
                <td className="adto__c-num">
                  <span className="adto__guests"><i className="fa-duotone fa-users" aria-hidden="true" /> {r.ospiti}</span>
                </td>
                <td className="adto__c-num">{r.vendute}</td>
                <td className="adto__c-num">
                  <Tooltip text={`${r.residua} camere residue su ${r.giacenza} a contratto (${r.vendute} vendute)`}>
                    <span className={`adto__avail ${r.residua <= 5 ? 'adto__avail--low' : ''}`}>
                      {r.residua} <span className="adto__avail-sep">/ {r.giacenza}</span>
                    </span>
                  </Tooltip>
                </td>
                <td className="adto__c-num">
                  <button type="button" className="adto__sugg-link" onClick={() => setSuggOpen(true)} title="Apri dettaglio suggerimenti accolti">
                    {r.sugg}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="adto__pagination" />

      <SuggerimentiModal open={suggOpen} onClose={() => setSuggOpen(false)} />
    </div>
  )
}
