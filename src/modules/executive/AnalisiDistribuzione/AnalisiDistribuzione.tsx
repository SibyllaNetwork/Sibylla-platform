import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts';
import GaugeArc from '../../../core/components/GaugeArc';
import PageHead from '../../../core/components/PageHead';
import Pagination from '../../../core/components/Pagination';
import Tooltip from '../../../core/components/Tooltip';
import { SelectField, DateRangeField } from '../../../core/components/form'
import SuggerimentiModal from './SuggerimentiModal';
import AnalisiDistribuzioneTO from './AnalisiDistribuzioneTO';
import { useAccessStore } from '../../../store/useAccessStore'
import './AnalisiDistribuzione.sass'

// Pagina CONDIVISA tra modulo hotel e Tour Operator: doppia visualizzazione di
// contenuti (il colore è già module-aware via sectionForPage). I TO analizzano
// la distribuzione per DESTINAZIONE, gli altri moduli per STRUTTURA.
type DistVariant = 'hotel' | 'to'
const DIST_VARIANT: Record<DistVariant, { title: string; subtitle: string; selLabel: string; sel: string[] }> = {
  hotel: {
    title: 'Analisi della distribuzione',
    subtitle: 'Esplorazione analitica della distribuzione basata su dati granulari e KPI strategici per guidare decisioni mirate',
    selLabel: 'Struttura',
    sel: ['Hotel Archimede', 'Hotel Noto', 'Grand Hotel Roma'],
  },
  to: {
    title: 'Analisi della distribuzione',
    subtitle: 'Esplorazione analitica della distribuzione delle vendite per destinazione e canale, con KPI strategici per guidare la programmazione',
    selLabel: 'Destinazione',
    sel: ['Mar Rosso', 'Maldive', 'Andalusia', 'Grecia & Isole', 'Tour Capitali'],
  },
}

// Box informativo all'hover renderizzato in PORTAL (position:fixed) così non
// viene tagliato dall'overflow della tabella. Il trigger resta inline nella cella.
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
    <span ref={ref} className="analisi__hc-trig" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      {trigger}
      {open && createPortal(
        <div className="analisi__hc" style={{ left: pos.left, top: pos.top, width }}>{children}</div>,
        document.body,
      )}
    </span>
  )
}

type AnalisiTipo = 'aumento' | 'valutazione' | 'verifica';

const ANALISI: Record<AnalisiTipo, { icon: string; text: string; tip: string }> = {
  aumento:     { icon: 'fa-thumbs-up',           text: 'Aumento consigliato',    tip: 'Domanda rigida (ε < 1): aumento dei prezzi consigliato' },
  valutazione: { icon: 'fa-file-pen',            text: 'Valutazione su quantità', tip: 'Elasticità incerta: valutare la leva sulla quantità' },
  verifica:    { icon: 'fa-triangle-exclamation', text: 'Verificare fattori esterni', tip: 'Domanda elastica (ε ≥ 1): verificare i fattori esterni' },
};

// Tipologie evento → icona FA + locandina/dettagli per il riquadro all'hover
interface EventoMeta { icon: string; label: string; nome: string; img: string; ora: string; luogo: string }
const EVENTI: Record<string, EventoMeta> = {
  concerto:  { icon: 'fa-music',         label: 'Concerto',         nome: 'Concerto live — Coldplay',                   img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=420', ora: '21:00',        luogo: 'Stadio Olimpico, Roma' },
  sport:     { icon: 'fa-futbol',        label: 'Evento sportivo',  nome: 'Finale Champions League — Roma vs Real Madrid', img: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=420', ora: '20:45',        luogo: 'Stadio Olimpico, Roma' },
  cultura:   { icon: 'fa-masks-theater', label: 'Evento culturale', nome: 'Prima teatrale — Nabucco',                   img: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=420', ora: '20:30',        luogo: 'Teatro dell\'Opera, Roma' },
  sagra:     { icon: 'fa-wine-glass',    label: 'Sagra',            nome: 'Sagra del Tartufo',                          img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=420', ora: '19:00',        luogo: 'Piazza Navona, Roma' },
  festival:  { icon: 'fa-party-horn',    label: 'Festival',         nome: 'Festival della Musica',                      img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=420', ora: 'tutto il giorno', luogo: 'Centro storico, Roma' },
  fiera:     { icon: 'fa-store',         label: 'Fiera',            nome: 'Fiera Internazionale del Turismo',           img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=420', ora: '09:00–20:00',  luogo: 'Fiera di Roma' },
  mostra:    { icon: 'fa-palette',       label: 'Mostra',           nome: 'Mostra — Gli Impressionisti',                img: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=420', ora: '10:00–19:00',  luogo: 'Scuderie del Quirinale' },
  religioso: { icon: 'fa-church',        label: 'Evento religioso', nome: 'Festa patronale di San Giovanni',            img: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=420', ora: '18:00',        luogo: 'Basilica San Giovanni' },
}

// Riquadro all'hover sull'icona evento: locandina + tipo, nome, data, orario, luogo.
function EventHover({ evType, date }: { evType: string; date: string }) {
  const ev = EVENTI[evType] ?? EVENTI.festival
  return (
    <HoverCard width={232} trigger={<i className={`fa-duotone ${ev.icon} analisi__ev-ico`} aria-hidden="true" />}>
      <span className="analisi__ev-pop-media">
        {ev.img
          ? <img src={ev.img} alt={ev.nome} />
          : <span className="analisi__ev-pop-ph"><i className={`fa-duotone ${ev.icon}`} /></span>}
        <span className="analisi__ev-pop-tag">{ev.label}</span>
      </span>
      <span className="analisi__ev-pop-body">
        <span className="analisi__ev-pop-name">{ev.nome}</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-calendar" /> {date}</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-clock" /> {ev.ora}</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-location-dot" /> {ev.luogo}</span>
      </span>
    </HoverCard>
  )
}

// Condizioni meteo → icona FA + immagine esplicativa + dettagli per il box hover
interface MeteoMeta { icon: string; label: string; img: string; umidita: string; vento: string }
const METEO: Record<string, MeteoMeta> = {
  sereno:    { icon: 'fa-sun',         label: 'Sereno',                img: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=420', umidita: '40%', vento: '8 km/h' },
  parziale:  { icon: 'fa-cloud-sun',   label: 'Parzialmente nuvoloso', img: 'https://images.unsplash.com/photo-1611928482473-7b27d24eab80?w=420', umidita: '55%', vento: '12 km/h' },
  nuvoloso:  { icon: 'fa-cloud',       label: 'Nuvoloso',              img: 'https://images.unsplash.com/photo-1499956827185-0d63ee78a910?w=420', umidita: '66%', vento: '15 km/h' },
  pioggia:   { icon: 'fa-cloud-rain',  label: 'Pioggia',               img: 'https://images.unsplash.com/photo-1438449805896-28a666819a20?w=420', umidita: '85%', vento: '20 km/h' },
  temporale: { icon: 'fa-cloud-bolt',  label: 'Temporale',             img: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=420', umidita: '90%', vento: '35 km/h' },
  neve:      { icon: 'fa-snowflake',   label: 'Neve',                  img: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=420', umidita: '80%', vento: '10 km/h' },
  ventoso:   { icon: 'fa-wind',        label: 'Ventoso',               img: 'https://images.unsplash.com/photo-1505672678657-cc7037095e60?w=420', umidita: '50%', vento: '45 km/h' },
}

// Riquadro all'hover sull'icona meteo: icona grande, condizione, temperatura, data, località, umidità, vento.
function MeteoHover({ cond, temp, date }: { cond: string; temp: string; date: string }) {
  const m = METEO[cond] ?? METEO.sereno
  return (
    <HoverCard width={232} trigger={<i className={`fa-duotone ${m.icon} analisi__meteo-ico`} aria-hidden="true" />}>
      <span className="analisi__ev-pop-media">
        {m.img
          ? <img src={m.img} alt={m.label} />
          : <span className="analisi__ev-pop-ph"><i className={`fa-duotone ${m.icon}`} /></span>}
        <span className="analisi__ev-pop-tag">{m.label}</span>
      </span>
      <span className="analisi__ev-pop-body">
        <span className="analisi__meteo-pop-temp">{temp}</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-calendar" /> {date}</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-location-dot" /> Roma</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-droplet" /> Umidità {m.umidita}</span>
        <span className="analisi__ev-pop-info"><i className="fa-duotone fa-wind" /> Vento {m.vento}</span>
      </span>
    </HoverCard>
  )
}

type Row = {
  date: string;
  evType: string;
  market: string;
  occ: string;
  meteo: string;
  temp: string;
  stag: string;
  pct: string;
  rev: string;
  adr: string;
  pickup: number[];
  analisi: AnalisiTipo;
  camera: string;
  disp: number;
  sugg: number;
  compset: string;
};

const ROWS: Row[] = [
  { date: '09/06/2026', evType: 'concerto',  market: 'medio', occ: 'basso', meteo: 'sereno',    temp: '24°', stag: 'Alta Stagione', pct: '17,61 %', rev: '13.565,89', adr: '114,97', pickup: [5, 7, 30, 63, 13], analisi: 'valutazione', camera: '152,97', disp: 37, sugg: 95, compset: '—' },
  { date: '10/06/2026', evType: 'sport',     market: 'alto',  occ: 'basso', meteo: 'parziale',  temp: '22°', stag: 'Alta Stagione', pct: '16,42 %', rev: '13.290,93', adr: '120,83', pickup: [5, 10, 33, 46, 16], analisi: 'aumento', camera: '145,56', disp: 45, sugg: 0, compset: '—' },
  { date: '11/06/2026', evType: 'cultura',   market: 'alto',  occ: 'medio', meteo: 'nuvoloso',  temp: '19°', stag: 'Alta Stagione', pct: '18,51 %', rev: '15.081,76', adr: '121,63', pickup: [3, 2, 31, 49, 39], analisi: 'aumento', camera: '163,85', disp: 31, sugg: 0, compset: '—' },
  { date: '12/06/2026', evType: 'sagra',     market: 'basso', occ: 'basso', meteo: 'pioggia',   temp: '17°', stag: 'Alta Stagione', pct: '16,12 %', rev: '12.948,17', adr: '119,89', pickup: [3, 9, 26, 36, 34], analisi: 'aumento', camera: '145,56', disp: 47, sugg: 0, compset: '—' },
  { date: '13/06/2026', evType: 'festival',  market: 'alto',  occ: 'medio', meteo: 'sereno',    temp: '26°', stag: 'Alta Stagione', pct: '14,63 %', rev: '11.537,33', adr: '117,73', pickup: [3, 6, 25, 36, 28], analisi: 'aumento', camera: '143,76', disp: 57, sugg: 0, compset: '—' },
  { date: '14/06/2026', evType: 'fiera',     market: 'medio', occ: 'basso', meteo: 'parziale',  temp: '23°', stag: 'Alta Stagione', pct: '12,13 %', rev: '7.574,66', adr: '116,53', pickup: [3, 3, 19, 34, 6], analisi: 'valutazione', camera: '135,10', disp: 91, sugg: 0, compset: '—' },
  { date: '15/06/2026', evType: 'mostra',    market: 'basso', occ: 'basso', meteo: 'temporale', temp: '18°', stag: 'Alta Stagione', pct: '13,81 %', rev: '8.510,18', adr: '115,00', pickup: [1, 6, 19, 40, 8], analisi: 'aumento', camera: '135,10', disp: 82, sugg: 0, compset: '—' },
  { date: '16/06/2026', evType: 'religioso', market: 'alto',  occ: 'medio', meteo: 'sereno',    temp: '25°', stag: 'Alta Stagione', pct: '12,09 %', rev: '9.042,94', adr: '111,64', pickup: [1, 4, 20, 39, 17], analisi: 'valutazione', camera: '138,50', disp: 75, sugg: 0, compset: '—' },
  { date: '17/06/2026', evType: 'concerto',  market: 'medio', occ: 'basso', meteo: 'sereno',    temp: '27°', stag: 'Alta Stagione', pct: '15,40 %', rev: '10.980,40', adr: '118,20', pickup: [4, 8, 28, 51, 22], analisi: 'aumento', camera: '149,90', disp: 40, sugg: 0, compset: '—' },
  { date: '18/06/2026', evType: 'sport',     market: 'alto',  occ: 'medio', meteo: 'parziale',  temp: '24°', stag: 'Alta Stagione', pct: '19,10 %', rev: '16.320,75', adr: '123,40', pickup: [6, 12, 35, 58, 29], analisi: 'aumento', camera: '158,40', disp: 28, sugg: 0, compset: '—' },
  { date: '19/06/2026', evType: 'sagra',     market: 'basso', occ: 'basso', meteo: 'pioggia',   temp: '18°', stag: 'Alta Stagione', pct: '11,80 %', rev: '7.210,00', adr: '112,90', pickup: [2, 5, 18, 30, 11], analisi: 'valutazione', camera: '133,20', disp: 84, sugg: 0, compset: '—' },
  { date: '20/06/2026', evType: 'cultura',   market: 'alto',  occ: 'medio', meteo: 'nuvoloso',  temp: '21°', stag: 'Alta Stagione', pct: '17,95 %', rev: '14.760,30', adr: '120,10', pickup: [5, 9, 31, 47, 26], analisi: 'aumento', camera: '155,00', disp: 33, sugg: 0, compset: '—' },
  { date: '21/06/2026', evType: 'festival',  market: 'alto',  occ: 'medio', meteo: 'temporale', temp: '19°', stag: 'Alta Stagione', pct: '16,70 %', rev: '13.040,90', adr: '117,00', pickup: [4, 7, 27, 44, 20], analisi: 'aumento', camera: '146,70', disp: 36, sugg: 0, compset: '—' },
  { date: '22/06/2026', evType: 'mostra',    market: 'medio', occ: 'basso', meteo: 'ventoso',   temp: '20°', stag: 'Alta Stagione', pct: '13,30 %', rev: '8.940,10', adr: '114,50', pickup: [2, 6, 21, 34, 14], analisi: 'valutazione', camera: '137,10', disp: 70, sugg: 0, compset: '—' },
  { date: '23/06/2026', evType: 'fiera',     market: 'medio', occ: 'basso', meteo: 'sereno',    temp: '28°', stag: 'Alta Stagione', pct: '14,10 %', rev: '9.530,60', adr: '115,80', pickup: [3, 5, 23, 38, 15], analisi: 'valutazione', camera: '139,40', disp: 62, sugg: 0, compset: '—' },
  { date: '24/06/2026', evType: 'religioso', market: 'alto',  occ: 'medio', meteo: 'neve',      temp: '3°',  stag: 'Bassa Stagione', pct: '20,40 %', rev: '17.880,25', adr: '125,90', pickup: [6, 13, 38, 60, 31], analisi: 'aumento', camera: '162,30', disp: 25, sugg: 0, compset: '—' },
];

const PKL = [1, 7, 30, 60, 90];
// Prenotazioni totali per finestra pickup (giorni → totale)
const PKL_TOTALI: Record<number, number> = { 1: 31, 7: 50, 30: 679, 60: 1393, 90: 509 };

// Periodi associati a ciascuna stagionalità (mostrati nel tooltip)
const STAGIONI_PERIODI: Record<string, string[]> = {
  'Alta Stagione': [
    'Dal 01/11/2025 al 03/11/2025',
    'Dal 01/01/2026 al 29/05/2026',
    'Dal 03/06/2026 al 03/08/2026',
    'Dal 01/09/2026 al 31/10/2026',
  ],
  'Bassa Stagione': [
    'Dal 04/11/2025 al 31/12/2025',
    'Dal 30/05/2026 al 02/06/2026',
    'Dal 04/08/2026 al 31/08/2026',
  ],
};

// Tipo di camera di riferimento (mostrato nel tooltip sul prezzo)
const CAMERE_TIPO = ['Doppia Economy', 'Doppia Superior', 'Singola Standard', 'Tripla Comfort', 'Suite Vista', 'Doppia Deluxe', 'Quadrupla Family', 'Junior Suite'];

// Dettaglio mensile notti/entrate (box all'hover sul valore notti pickup)
const PICKUP_NOTTI = [
  { mese: 'Gennaio',   rn: 2679, imp: '166.607,16' },
  { mese: 'Febbraio',  rn: 2823, imp: '193.328,35' },
  { mese: 'Marzo',     rn: 3109, imp: '292.544,51' },
  { mese: 'Aprile',    rn: 3311, imp: '360.954,37' },
  { mese: 'Maggio',    rn: 3544, imp: '391.682,76' },
  { mese: 'Giugno',    rn: 2673, imp: '285.207,61' },
  { mese: 'Luglio',    rn: 2038, imp: '181.308,36' },
  { mese: 'Agosto',    rn: 672,  imp: '45.023,59' },
  { mese: 'Settembre', rn: 240,  imp: '22.159,09' },
  { mese: 'Ottobre',   rn: 77,   imp: '9.323,52' },
  { mese: 'Novembre',  rn: 163,  imp: '11.885,74' },
  { mese: 'Dicembre',  rn: 90,   imp: '8.627,73' },
]

function PickupNottiHover() {
  return (
    <span className="analisi__pk-notti-cell">
      <span className="analisi__pickup-metric"><i className="fa-duotone fa-bed" aria-hidden="true" /> 21419</span>
      <span className="analisi__pk-notti-pop" role="tooltip">
        <span className="analisi__pk-notti-title">N° Notti Entrate</span>
        <table className="analisi__pk-notti-table">
          <thead><tr><th>Mese</th><th>Room night</th><th>Importo</th></tr></thead>
          <tbody>
            {PICKUP_NOTTI.map(m => (
              <tr key={m.mese}><td>{m.mese}</td><td>{m.rn}</td><td>{m.imp} €</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="analisi__pk-notti-tot"><td>Totale 2026</td><td>21419</td><td>1.968.652,79 €</td></tr>
            <tr><td>Totale 2027</td><td>0</td><td>0,00 €</td></tr>
          </tfoot>
        </table>
      </span>
    </span>
  )
}

// ── Confronta LY: istogramma quest'anno vs anno scorso (box al click) ─────────
function buildLYData(row: Row) {
  const pct = parseFloat(row.pct.replace('%', '').replace(',', '.')) || 0
  const adr = parseFloat(row.adr.replace('.', '').replace(',', '.')) || 0
  const r = (n: number) => Math.round(n * 10) / 10
  return [
    { kpi: '%',          ty: r(pct),         ly: r(pct * 0.88) },
    { kpi: 'A.D.R.',     ty: r(adr),         ly: r(adr * 0.93) },
    { kpi: 'Disp.',      ty: row.disp,       ly: Math.round(row.disp * 1.12) },
    { kpi: 'Sugg.',      ty: row.sugg,       ly: Math.round(row.sugg * 0.7) },
    { kpi: 'Pickup 30g', ty: row.pickup[2],  ly: Math.round(row.pickup[2] * 0.8) },
  ]
}

function ConfrontaLY({ row }: { row: Row }) {
  return (
    <HoverCard width={340} trigger={
      <button type="button" className="analisi__ly-btn" aria-label="Confronta con l'anno precedente">
        <i className="fa-duotone fa-chart-column" aria-hidden="true" />
      </button>
    }>
      <div className="analisi__hc-pad">
        <span className="analisi__ly-pop-title">Confronto anno su anno · {row.date}</span>
        <div className="analisi__ly-chart">
          <BarChart width={300} height={190} data={buildLYData(row)} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid stroke="#E0E7EE" vertical={false} />
            <XAxis dataKey="kpi" tick={{ fontSize: 10, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: '#6E7175' }} tickLine={false} axisLine={false} width={32} />
            <RTooltip labelFormatter={(l: any) => `${l}`} />
            <Bar dataKey="ty" name="Quest'anno" fill="#204769" radius={[3, 3, 0, 0]} maxBarSize={16} />
            <Bar dataKey="ly" name="Anno scorso" fill="#C3C9D0" radius={[3, 3, 0, 0]} maxBarSize={16} />
          </BarChart>
        </div>
        <span className="analisi__ly-legend">
          <span className="analisi__ly-leg"><span className="analisi__ly-dot analisi__ly-dot--ty" /> Quest'anno</span>
          <span className="analisi__ly-leg"><span className="analisi__ly-dot analisi__ly-dot--ly" /> Anno scorso</span>
        </span>
      </div>
    </HoverCard>
  )
}

// Dispatcher: instrada alla tabella dedicata Tour Operator o alla versione hotel/altri.
export default function AnalisiDistribuzione({ navigate }: { navigate: (p: string) => void }) {
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist ? assist.moduli : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  if (moduli?.includes('tour-operator')) return <AnalisiDistribuzioneTO navigate={navigate} />
  return <AnalisiDistribuzioneHotel navigate={navigate} />
}

// ── Variante hotel / altri moduli ──────────────────────────────────────────────────
function AnalisiDistribuzioneHotel({ navigate }: { navigate: (p: string) => void }) {
  const D = DIST_VARIANT.hotel

  const [struttura, setStruttura]       = useState(D.sel[0]);
  const [dateFrom, setDateFrom]         = useState('2026-06-09');
  const [dateTo, setDateTo]             = useState('2026-07-09');
  const [tipologia, setTipologia]       = useState<'individuale' | 'gruppo'>('individuale');
  const [suggOpen, setSuggOpen]         = useState(false);
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 8;
  const totalPages = Math.ceil(ROWS.length / PAGE_SIZE);
  const paged = ROWS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Pie hover (Revenue / ADR / Occupancy) ────────────────────────────────────
  type Seg = { label: string; val: number; color: string };
  const conic = (segs: Seg[]) => {
    const total = segs.reduce((s, x) => s + x.val, 0) || 1;
    let acc = 0;
    const parts = segs.map(s => { const start = (acc / total) * 100; acc += s.val; return `${s.color} ${start}% ${(acc / total) * 100}%`; });
    return `conic-gradient(${parts.join(', ')})`;
  };
  const PieHover = ({ value, segs, title }: { value: React.ReactNode; segs: Seg[]; title: string }) => {
    const total = segs.reduce((s, x) => s + x.val, 0) || 1;
    return (
      <HoverCard width={216} trigger={value}>
        <div className="analisi__hc-pad">
          <span className="analisi__pie-pop-title">{title}</span>
          <span className="analisi__pie-pop-body">
            <span className="analisi__pie-chart" style={{ ['--pie' as any]: conic(segs) }} aria-hidden="true" />
            <span className="analisi__pie-legend">
              {segs.map(s => (
                <span key={s.label} className="analisi__pie-leg">
                  <span className="analisi__pie-dot" style={{ ['--dot' as any]: s.color }} />
                  <span className="analisi__pie-leg-lbl">{s.label}</span>
                  <span className="analisi__pie-leg-val">{Math.round((s.val / total) * 100)}%</span>
                </span>
              ))}
            </span>
          </span>
        </div>
      </HoverCard>
    );
  };
  const REV_SEGS: Seg[] = [
    { label: 'Diretto', val: 42, color: 'var(--color-primary)' },
    { label: 'OTA', val: 33, color: '#E07B39' },
    { label: 'Tour Operator', val: 15, color: '#9B59B6' },
    { label: 'Corporate', val: 10, color: 'var(--color-link)' },
  ];
  const ADR_SEGS: Seg[] = [
    { label: 'Standard', val: 38, color: 'var(--color-primary)' },
    { label: 'Superior', val: 30, color: 'var(--color-link)' },
    { label: 'Suite', val: 20, color: '#E07B39' },
    { label: 'Altro', val: 12, color: '#9B59B6' },
  ];
  const occSegs = (pct: string): Seg[] => {
    const n = Math.max(0, Math.min(100, parseFloat(pct.replace('%', '').replace(',', '.')) || 0));
    return [
      { label: 'Occupato', val: n, color: 'var(--color-success)' },
      { label: 'Libero', val: 100 - n, color: 'var(--color-border)' },
    ];
  };

  // ── TH / TD (allineati a sinistra) ───────────────────────────────────────────
  const TH = ({ ch, colSpan = 1, last = false, className = '' }: { ch?: React.ReactNode; colSpan?: number; last?: boolean; className?: string }) => (
    <th colSpan={colSpan} className={`analisi__th ${last ? 'analisi__th--last' : ''} ${className}`}>{ch}</th>
  );
  const TD = ({ ch, last = false, className = '' }: { ch?: React.ReactNode; last?: boolean; className?: string }) => (
    <td className={`analisi__td ${last ? 'analisi__td--last' : ''} ${className}`}>{ch}</td>
  );

  return (
    <div className="analisi">
      <PageHead title={D.title} subtitle={D.subtitle} />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="analisi__filter-bar">
        <div className="analisi__filter-group">
          <SelectField
            name="struttura"
            label={D.selLabel}
            value={struttura}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
            options={D.sel.map(s => ({ value: s, label: s }))}
            className="w-44"
          />
        </div>
        <div className="analisi__filter-group">
          <DateRangeField
            nameFrom="dateFrom"
            nameTo="dateTo"
            label="Date"
            valueFrom={dateFrom}
            valueTo={dateTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
          />
        </div>
        <div className="analisi__filter-group--col">
          <span className="text-[12px] font-semibold font-poppins text-primary">Tipologia</span>
          <div className="analisi__radio-row">
            {(['individuale', 'gruppo'] as const).map(s => (
              <label key={s} className="analisi__radio-label">
                <input type="radio" name="tipologia-dist" checked={tipologia === s} onChange={() => setTipologia(s)} className="sib-radio" />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div className="analisi__filter-group--col">
          <div className="analisi__filter-actions">
            <Tooltip text="Aggiorna">
              <button className="analisi__icon-btn analisi__icon-btn--round"><i className="fa-duotone fa-arrows-rotate" aria-hidden="true" /></button>
            </Tooltip>
            <div className="analisi__pickup">
              <Tooltip text="Pickup da ieri alla fine dell'anno"><span className="analisi__pickup-title">Pickup</span></Tooltip>
              <PickupNottiHover />
              <Tooltip text="Fatturato generato"><span className="analisi__pickup-metric"><i className="fa-duotone fa-euro-sign" aria-hidden="true" /> 1.968.652,79 €</span></Tooltip>
            </div>
            <Tooltip text="Pdf pickup">
              <button className="analisi__icon-btn"><i className="fa-duotone fa-file-pdf" aria-hidden="true" /></button>
            </Tooltip>
            <Tooltip text="Excel pickup">
              <button className="analisi__icon-btn"><i className="fa-duotone fa-file-excel" aria-hidden="true" /></button>
            </Tooltip>
          </div>
        </div>

        <div className="analisi__filter-group--col analisi__filter-group--ml-auto">
          <div className="analisi__filter-actions">
            <Tooltip text="Comparazione di mercato — Confrontati con i tuoi competitors">
              <button className="analisi__icon-btn" onClick={() => navigate('comparazione-mercato')}><i className="fa-duotone fa-display-chart-up" aria-hidden="true" /></button>
            </Tooltip>
            <Tooltip text="Imposta distribuzione di rete — a chi affidare la vendita dei tuoi prodotti">
              <button className="analisi__icon-btn" onClick={() => navigate('imposta-dist')}><i className="fa-duotone fa-grid-2-plus" aria-hidden="true" /></button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="analisi__table-wrap">
        <div className="analisi__table-scroll">
          <table className="analisi__table">
            <thead>
              <tr>
                <TH ch="Confronta LY" />
                <TH ch="Data" />
                <TH ch="Evento" />
                <TH ch="Market demand" />
                <TH ch="Meteo" />
                <TH ch="Stagionalità" />
                <TH ch="%" />
                <TH ch="Revenue" />
                <TH ch="A.D.R." />
                {PKL.map(l => (
                  <TH key={l} className="analisi__th--center" ch={
                    <Tooltip content={
                      <span className="analisi__pk-tip">
                        Prenotazioni degli ultimi:<br />{l} {l === 1 ? 'giorno' : 'giorni'}<br />Totale: ({PKL_TOTALI[l]})
                      </span>
                    }>
                      <span className="analisi__pk-head">
                        <i className="fa-duotone fa-calendar" aria-hidden="true" />
                        <span className="analisi__pk-head-n">{l}</span>
                      </span>
                    </Tooltip>
                  } />
                ))}
                <TH className="analisi__th--center" ch={
                  <Tooltip text="Elasticità della domanda"><span className="analisi__eps">ε</span></Tooltip>
                } />
                <TH ch="Camera di riferimento" />
                <TH ch="Disponibilità" />
                <TH ch="Suggerimenti accolti" last />
              </tr>
            </thead>
            <tbody>
              {paged.map((row, j) => {
                const i = (page - 1) * PAGE_SIZE + j;
                const an = ANALISI[row.analisi];
                return (
                  <tr key={i} className="analisi__row">
                      <TD className="analisi__td--center" ch={<ConfrontaLY row={row} />} />
                      <TD ch={<span className="analisi__date-cell">{row.date}</span>} />
                      <TD className="analisi__td--center" ch={<EventHover evType={row.evType} date={row.date} />} />
                      <TD ch={<GaugeArc level={row.market} />} />
                      <TD className="analisi__td--center" ch={<MeteoHover cond={row.meteo} temp={row.temp} date={row.date} />} />
                      <TD ch={
                        <Tooltip content={
                          <span className="analisi__stag-tip">
                            {(STAGIONI_PERIODI[row.stag] ?? []).map(p => (
                              <span key={p} className="analisi__stag-tip-row">{p}</span>
                            ))}
                          </span>
                        }>
                          <span className="analisi__stag">{row.stag}</span>
                        </Tooltip>
                      } />
                      <TD ch={
                        <PieHover title="Occupazione per segmento" segs={occSegs(row.pct)} value={<span className="analisi__pct-val">{row.pct}</span>} />
                      } />
                      <TD ch={
                        <PieHover title="Revenue per canale" segs={REV_SEGS} value={<span className="analisi__rev-val">{row.rev} €</span>} />
                      } />
                      <TD ch={
                        <PieHover title="ADR per tipologia camera" segs={ADR_SEGS} value={<span>{row.adr} €</span>} />
                      } />
                      {row.pickup.map((n, j) => (
                        <TD key={j} className="analisi__td--center" ch={
                          <Tooltip text={`Pickup ${PKL[j]} ${PKL[j] === 1 ? 'giorno' : 'giorni'}: ${n}`}>
                            <span className={`analisi__pickup-cell ${n > 0 ? 'analisi__pickup-cell--active' : ''}`}>{n}</span>
                          </Tooltip>
                        } />
                      ))}
                      <TD className="analisi__td--center" ch={
                        <Tooltip text={`${an.text} — ${an.tip}`}>
                          <span className={`analisi__an analisi__an--${row.analisi}`}>
                            <i className={`fa-duotone ${an.icon} analisi__an-icon`} aria-hidden="true" />
                          </span>
                        </Tooltip>
                      } />
                      <TD ch={
                        <Tooltip text={CAMERE_TIPO[i % CAMERE_TIPO.length]}>
                          <span className="analisi__camera">{row.camera} €</span>
                        </Tooltip>
                      } />
                      <TD ch={
                        <span className="analisi__disp-cell">
                          <span className="analisi__disp-num">{row.disp}</span>
                          <i className="fa-duotone fa-bed analisi__disp-bed" aria-hidden="true" />
                        </span>
                      } />
                      <TD last ch={
                        <button type="button" className="analisi__sugg-link" onClick={() => setSuggOpen(true)} title="Apri dettaglio suggerimenti accolti">
                          {row.sugg}
                        </button>
                      } />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="analisi__pagination" />

      <SuggerimentiModal open={suggOpen} onClose={() => setSuggOpen(false)} />
    </div>
  );
}
