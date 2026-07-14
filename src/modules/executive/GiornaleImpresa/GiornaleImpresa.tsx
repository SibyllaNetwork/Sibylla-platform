import React, { useState } from 'react'
import T from '../../../core/tokens'
import Ico from '../../../core/icons/Ico'
import MenuIco from '../../../core/icons/MenuIco'
import BtnBack from '../../../core/components/BtnBack'
import { Tabs } from '../../../core/components'
import { SelectField } from '../../../core/components/form'
import MENU from '../../../navigation/menu'
import MENU_TO from '../../../navigation/menuTourOperator'
import { useAccessStore } from '../../../store/useAccessStore'
import GiornaleImpresaTO from './GiornaleImpresaTO'
import './GiornaleImpresa.sass'

// La pagina è CONDIVISA tra moduli: i Tour Operator vedono una versione con
// contenuti propri (pratiche, preventivi, partenze, destinazioni) mentre gli
// altri moduli vedono la versione standard (hotel/struttura ricettiva).
type GiornaleVariant = 'hotel' | 'to'

// Meta (icona + titolo) delle card custom della Panoramica
const CUSTOM_META: Record<string, { icon: string; title: string; sdly?: boolean }> = {
  numeri:     { icon:'bar',       title:'I numeri di oggi', sdly:true },
  almanacco:  { icon:'calendar',  title:'Almanacco' },
  meteo:      { icon:'cloud-sun', title:'Meteo' },
  eventi:     { icon:'bell',      title:'Eventi in città' },
  turni:      { icon:'clock',     title:'Turni di oggi' },
  compleanni: { icon:'star',      title:'Compleanni di oggi' },
}

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const WDAYS  = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato']
const WDAYS_SHORT = ['D','L','M','M','G','V','S']

// ── Card per tab (vista estesa) ─────────────────────────────────────────────
// Panoramica = widget dashboard dedicati (renderExtCard).
// Gli altri tab elencano le SEZIONI DEL MENU del modulo Impresa corrispondente:
// ogni gruppo di primo livello del modulo diventa una card con le pagine navigabili.
const impresaModule = (modId: string, menu: any[]) => {
  const imp = (menu as any[]).find(m => m.id === 'impresa')
  return imp?.children?.find((c: any) => c.id === modId)
}
const leafPages = (node: any, acc: any[] = []): any[] => {
  if (node.page) acc.push({ page: node.page, label: node.label, id: node.id })
  if (node.children) node.children.forEach((c: any) => leafPages(c, acc))
  return acc
}
// Catalogo: una card per ARGOMENTO (pagina) del modulo, con la sua sezione.
const pageCatalog = (modId: string, menu: any[]) => {
  const out: any[] = []
  ;(impresaModule(modId, menu)?.children ?? []).forEach((group: any) => {
    leafPages(group).forEach((leaf: any) => {
      out.push({
        id: `${modId}:${out.length}`,
        type: 'page',
        page: leaf.page,
        label: leaf.label,
        section: group.label,
        groupId: group.id,
        nodeId: leaf.id,
      })
    })
  })
  return out
}

// Card per tab, costruite dal menu del modulo corrente (MENU o MENU_TO).
const buildTabCards = (menu: any[]): Record<string, any[]> => ({
  panoramica: [
    { id:'numeri', type:'custom' }, { id:'almanacco', type:'custom' },
    { id:'meteo', type:'custom' }, { id:'eventi', type:'custom' },
    { id:'turni', type:'custom' }, { id:'compleanni', type:'custom' },
  ],
  vendite:   pageCatalog('sales', menu),
  gestione:  pageCatalog('finance', menu),
  acquisti:  pageCatalog('purchasing', menu),
  operativa: pageCatalog('operation', menu),
  personale: pageCatalog('hr', menu),
})

// Di default pubblica solo le prime 6 card per sezione; le altre restano
// disponibili nella personalizzazione.
const DEFAULT_VISIBLE = 6

// ── Mini-visualizzazioni (senza librerie) ───────────────────────────────────
const cssVar = (k: string, v: string) => ({ [k]: v } as React.CSSProperties)

const vKpis = (items: any[]) => (
  <div className="giornale__kpis">
    {items.map((k, i) => (
      <div key={i} className="giornale__kpi">
        <div className="giornale__kpi-val">{k.val}</div>
        <div className="giornale__kpi-label">{k.label}</div>
        {k.delta && <div className={`giornale__kpi-delta ${String(k.delta).startsWith('-') ? 'giornale__kpi-delta--neg' : ''}`}>{k.delta}</div>}
      </div>
    ))}
  </div>
)
const vBars = (items: any[]) => (
  <div className="giornale__bars">
    {items.map((b, i) => (
      <div key={i} className="giornale__bar-row">
        <span className="giornale__bar-label">{b.label}</span>
        <span className="giornale__bar-track"><span className="giornale__bar-fill" style={cssVar('--w', `${b.pct}%`)} /></span>
        <span className="giornale__bar-pct">{b.pct}%</span>
      </div>
    ))}
  </div>
)
const vCols = (items: any[]) => (
  <div className="giornale__cols">
    {items.map((c, i) => (
      <div key={i} className="giornale__col">
        <span className="giornale__col-track"><span className="giornale__col-bar" style={cssVar('--h', `${c.pct}%`)} /></span>
        <span className="giornale__col-label">{c.label}</span>
      </div>
    ))}
  </div>
)
const vDonut = (value: number, label?: string) => {
  const r = 26, c = 2 * Math.PI * r
  return (
    <div className="giornale__donut">
      <svg className="giornale__donut-svg" viewBox="0 0 64 64">
        <circle className="giornale__donut-bg" cx="32" cy="32" r={r} />
        <circle className="giornale__donut-fg" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="giornale__donut-val">{value}%</div>
      {label && <div className="giornale__donut-cap">{label}</div>}
    </div>
  )
}
const vSpark = (data: number[], caption?: string) => {
  const max = Math.max(...data), min = Math.min(...data), span = (max - min) || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(' ')
  return (
    <div className="giornale__spark-wrap">
      <svg className="giornale__spark" viewBox="0 0 100 28" preserveAspectRatio="none">
        <polyline className="giornale__spark-line" points={pts} vectorEffect="non-scaling-stroke" />
      </svg>
      {caption && <div className="giornale__spark-cap">{caption}</div>}
    </div>
  )
}
const vList = (items: any[]) => (
  <div className="giornale__mini-list">
    {items.map((it, i) => (
      <div key={i} className="giornale__mini-li">
        <div className="giornale__mini-li-body">
          <div className="giornale__mini-li-main">{it.main}</div>
          {it.sub && <div className="giornale__mini-li-sub">{it.sub}</div>}
        </div>
        {it.val && <div className="giornale__mini-li-val">{it.val}</div>}
      </div>
    ))}
  </div>
)
const renderBlock = (b: any, i: number) => {
  switch (b.kind) {
    case 'kpis':  return <React.Fragment key={i}>{vKpis(b.data)}</React.Fragment>
    case 'bars':  return <React.Fragment key={i}>{vBars(b.data)}</React.Fragment>
    case 'cols':  return <React.Fragment key={i}>{vCols(b.data)}</React.Fragment>
    case 'donut': return <React.Fragment key={i}>{vDonut(b.value, b.label)}</React.Fragment>
    case 'spark': return <React.Fragment key={i}>{vSpark(b.data, b.caption)}</React.Fragment>
    case 'list':  return <React.Fragment key={i}>{vList(b.data)}</React.Fragment>
    default:      return null
  }
}

// Riepilogo dati per pagina (le voci pubblicate di default + altre comuni)
const SUMMARIES: Record<string, any[]> = {
  // Vendite
  'analisi-dist-sales': [{kind:'bars', data:[{label:'Booking.com',pct:38},{label:'Diretto',pct:24},{label:'Expedia',pct:18},{label:'Agenzie',pct:12},{label:'Altri',pct:8}]}],
  'crea-strategia':      [{kind:'kpis', data:[{label:'Attive',val:'6'},{label:'Bozze',val:'2'},{label:'Concluse',val:'14'}]}],
  'calendario-strategie':[{kind:'cols', data:[{label:'Gen',pct:40},{label:'Feb',pct:55},{label:'Mar',pct:60},{label:'Apr',pct:72},{label:'Mag',pct:80},{label:'Giu',pct:95}]}],
  'calendario-master':   [{kind:'cols', data:[{label:'Set',pct:35},{label:'Ott',pct:50},{label:'Nov',pct:62},{label:'Dic',pct:88},{label:'Gen',pct:70},{label:'Feb',pct:58}]}],
  'sugg-data-driven':    [{kind:'donut', value:62, label:'Adozione'}],
  'screening-open':      [{kind:'bars', data:[{label:'Sotto mercato',pct:34},{label:'In linea',pct:48},{label:'Sopra',pct:18}]}],
  // Controllo gestione (Finance)
  'budget-costi':        [{kind:'bars', data:[{label:'Personale',pct:38},{label:'Acquisti',pct:24},{label:'Energia',pct:14},{label:'Manutenz.',pct:12},{label:'Marketing',pct:12}]}],
  'centro-costo':        [{kind:'kpis', data:[{label:'Centri',val:'8'},{label:'Allocato',val:'92%'}]}],
  'cost-analysis':       [{kind:'cols', data:[{label:'Gen',pct:62},{label:'Feb',pct:58},{label:'Mar',pct:66},{label:'Apr',pct:60},{label:'Mag',pct:54},{label:'Giu',pct:50}]}],
  'finance-overview':    [{kind:'kpis', data:[{label:'Ricavi',val:'142k€',delta:'+8%'},{label:'Costi',val:'68k€'},{label:'Margine',val:'52%'},{label:'EBITDA',val:'41k€',delta:'+5%'}]}],
  'decision-tree':       [{kind:'donut', value:71, label:'Confidenza'}],
  'incoming-analysis':   [{kind:'spark', data:[12,18,15,22,28,24,31], caption:'Incoming · ultimi 7 gg'}],
  // Acquisti
  'area-merceologica':   [{kind:'bars', data:[{label:'Food',pct:42},{label:'Beverage',pct:21},{label:'Pulizie',pct:14},{label:'Manutenz.',pct:13},{label:'Energia',pct:10}]}],
  'lista-fornitori':     [{kind:'kpis', data:[{label:'Fornitori',val:'18'},{label:'Attivi',val:'14'},{label:'Nuovi',val:'2'}]}],
  'servizi-acquisto':    [{kind:'kpis', data:[{label:'Servizi',val:'23'},{label:'In corso',val:'5'}]}],
  'miei-contratti-a':    [{kind:'list', data:[{main:'Enel Energia',sub:'Scade tra 18 gg',val:'attivo'},{main:'Lavasecco Sud',sub:'Scade tra 32 gg',val:'attivo'},{main:'OtisCare',sub:'Scade tra 54 gg',val:'attivo'}]}],
  'inserisci-contratto-a':[{kind:'kpis', data:[{label:'Bozze',val:'3'},{label:'Da firmare',val:'1'}]}],
  'crea-struttura':      [{kind:'kpis', data:[{label:'Strutture',val:'10'},{label:'Outlet',val:'24'}]}],
  // Operativa
  'planner':             [{kind:'kpis', data:[{label:'Camere occ.',val:'41'},{label:'Arrivi',val:'18'},{label:'Partenze',val:'14'}]}],
  'assegnazione-board':  [{kind:'bars', data:[{label:'Assegnate',pct:78},{label:'Da assegnare',pct:22}]}],
  'on-the-book':         [{kind:'cols', data:[{label:'L',pct:40},{label:'M',pct:52},{label:'M',pct:66},{label:'G',pct:60},{label:'V',pct:80},{label:'S',pct:95},{label:'D',pct:70}]}],
  'op-overview':         [{kind:'donut', value:85, label:'Occupazione'}],
  'guest-room':          [{kind:'kpis', data:[{label:'Ospiti',val:'72'},{label:'Camere',val:'48'},{label:'Rating',val:'4.6'}]}],
  'acquisti-servizi':    [{kind:'kpis', data:[{label:'Richieste',val:'9'},{label:'Approvate',val:'6'}]}],
  // Personale
  'registro-presenze':   [{kind:'donut', value:92, label:'Presenza'}],
  'turni-personale':     [{kind:'cols', data:[{label:'L',pct:80},{label:'M',pct:75},{label:'M',pct:90},{label:'G',pct:85},{label:'V',pct:95},{label:'S',pct:60},{label:'D',pct:45}]}],
  'crea-anagrafica':     [{kind:'kpis', data:[{label:'Dipendenti',val:'34'},{label:'Nuovi/mese',val:'2'}]}],
  'archivio-personale':  [{kind:'kpis', data:[{label:'Schede',val:'34'},{label:'Attive',val:'31'},{label:'Cessate',val:'3'}]}],
  'profile-analysis':    [{kind:'bars', data:[{label:'F&B',pct:35},{label:'Housekeeping',pct:26},{label:'Reception',pct:24},{label:'Manutenz.',pct:9},{label:'Direzione',pct:6}]}],
  'assegna-obiettivo':   [{kind:'kpis', data:[{label:'Obiettivi',val:'12'},{label:'Raggiunti',val:'7'},{label:'In corso',val:'5'}]}],
}
const hashNum = (s: string, lo: number, hi: number) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return lo + h % (hi - lo + 1)
}
// Riepilogo per una card pagina: specifico se presente, altrimenti generico
const summaryFor = (card: any) =>
  SUMMARIES[card.nodeId] ?? [{ kind:'donut', value: hashNum(card.nodeId ?? card.id, 48, 92), label:'Andamento' }]

// ─── Dati variabili per variante (hotel vs Tour Operator) ────────────────────
interface VariantData {
  subtitle: string
  struttureLabel: string
  strutture: string[]
  orbit: { id: string; label: string; icon: string }[]
  statsRows: { label: string; ieri: string; oggi: string }[]
  eventi: { data: string; mese: string; titolo: string; luogo: string }[]
  // hotel = turni di servizio · TO = partenze di oggi (stessa forma)
  turni: { orario: string; nome: string; ruolo: string }[]
  turniLabel: string
  turniEmpty: string
  vip: { nome: string; nota: string }[]
  vipLabel: string
  meteoCity: string
  meteoTemp: string
}

const VARIANT_DATA: Record<GiornaleVariant, VariantData> = {
  hotel: {
    subtitle: 'Centro strategico per il monitoraggio aziendale, che offre una visione complessiva e dettagliata dell\'andamento economico e operativo della struttura',
    struttureLabel: 'Struttura',
    strutture: ['Hotel Noto','Grand Hotel Roma','Villa Bellini','Terrazza sul Mare','Palazzo Storico'],
    orbit: [
      { id:'calendario', label:'Almanacco',  icon:'calendar' },
      { id:'turni',      label:'Turni',      icon:'clock'    },
      { id:'vip',        label:'Ospiti VIP', icon:'star'     },
      { id:'eventi',     label:'Eventi',     icon:'bell'     },
      { id:'numeri',     label:'I numeri',   icon:'bar'      },
      { id:'meteo',      label:'Meteo',      icon:'cloud-sun' },
    ],
    statsRows: [
      {label:'Arrivi',          ieri:'12',      oggi:'18'},
      {label:'Partenze',        ieri:'9',       oggi:'14'},
      {label:'Gruppi',          ieri:'40,00%',  oggi:'55,00%'},
      {label:'Individuali',     ieri:'60,00%',  oggi:'45,00%'},
      {label:'Camere',          ieri:'34',      oggi:'41'},
      {label:'Presenze',        ieri:'58',      oggi:'72'},
      {label:'Occupazione',     ieri:'71,00 %', oggi:'85,00 %'},
      {label:'Revenue',         ieri:'4.210 €', oggi:'5.380 €'},
      {label:'Av. Daily Rate',  ieri:'124 €',   oggi:'131 €'},
      {label:'Av. Daily Guest', ieri:'72 €',    oggi:'81 €'},
    ],
    eventi: [
      { data:'05', mese:'GIU', titolo:'Roma Creativa 365 – Cultura tutto l\'anno', luogo:'Roma · Centro' },
      { data:'07', mese:'GIU', titolo:'Stagione del Teatro dell\'Opera', luogo:'Roma · Teatro Costanzi' },
      { data:'12', mese:'GIU', titolo:'Mostra "Tesori dei Faraoni"', luogo:'Roma · Scuderie del Quirinale' },
      { data:'18', mese:'GIU', titolo:'Festival del Gusto Mediterraneo', luogo:'Ostia · Lungomare' },
      { data:'24', mese:'GIU', titolo:'Notte Bianca dei Musei', luogo:'Roma · Centro storico' },
    ],
    turni: [
      { orario:'07–15', nome:'Maria Rossi',   ruolo:'Reception' },
      { orario:'08–16', nome:'Luca Bianchi',  ruolo:'Sala ristorante' },
      { orario:'15–23', nome:'Sara Verdi',    ruolo:'Reception' },
      { orario:'16–00', nome:'Marco Neri',    ruolo:'Cucina' },
      { orario:'23–07', nome:'Anna Conti',    ruolo:'Night audit' },
    ],
    turniLabel: 'Turni di oggi',
    turniEmpty: 'Non ci sono turni per oggi.',
    vip: [
      { nome:'Famiglia Conti',   nota:'Suite Belvedere · check-in 15:00' },
      { nome:'Dott. M. Ferrara', nota:'Late check-out · allergie segnalate' },
      { nome:'Gruppo Aurora',    nota:'Tavolo riservato ristorante 20:30' },
    ],
    vipLabel: 'Ospiti VIP',
    meteoCity: 'MILANO',
    meteoTemp: '19°',
  },
  to: {
    subtitle: 'Cabina di regia del tour operator: andamento di pratiche, preventivi e marginalità, con la visione d\'insieme di partenze, destinazioni e partner di rete',
    struttureLabel: 'Sede operativa',
    strutture: ['Sede centrale','Filiale Milano','Filiale Roma','Online B2C','Network agenzie'],
    orbit: [
      { id:'calendario', label:'Almanacco',     icon:'calendar' },
      { id:'turni',      label:'Partenze',      icon:'clock'    },
      { id:'vip',        label:'Clienti VIP',   icon:'star'     },
      { id:'eventi',     label:'Fiere & eventi', icon:'bell'    },
      { id:'numeri',     label:'I numeri',      icon:'bar'      },
      { id:'meteo',      label:'Destinazioni',  icon:'cloud-sun' },
    ],
    statsRows: [
      {label:'Pratiche aperte',     ieri:'22',       oggi:'27'},
      {label:'Preventivi inviati',  ieri:'14',       oggi:'19'},
      {label:'Conferme',            ieri:'6',        oggi:'9'},
      {label:'Opzioni in scadenza', ieri:'4',        oggi:'3'},
      {label:'Passeggeri',          ieri:'88',       oggi:'126'},
      {label:'Tasso conversione',   ieri:'38,00 %',  oggi:'44,00 %'},
      {label:'Fatturato',           ieri:'18.400 €', oggi:'24.900 €'},
      {label:'Margine medio',       ieri:'16,5 %',   oggi:'18,2 %'},
      {label:'Ticket medio',        ieri:'1.180 €',  oggi:'1.320 €'},
      {label:'Pratiche chiuse',     ieri:'5',        oggi:'8'},
    ],
    eventi: [
      { data:'12', mese:'FEB', titolo:'BIT — Borsa Internazionale del Turismo', luogo:'Milano · Allianz MiCo' },
      { data:'09', mese:'OTT', titolo:'TTG Travel Experience', luogo:'Rimini · Expo Centre' },
      { data:'21', mese:'MAR', titolo:'ITB — Fiera del turismo', luogo:'Berlino · Messe' },
      { data:'15', mese:'MAG', titolo:'Roadshow Mar Rosso & Maldive', luogo:'Online · Webinar partner' },
      { data:'03', mese:'SET', titolo:'Workshop Incoming Sud Italia', luogo:'Napoli · Stazione Marittima' },
    ],
    turni: [
      { orario:'06:40', nome:'Gruppo Marsa Alam',  ruolo:'Volo charter · 28 pax' },
      { orario:'09:15', nome:'Fam. Bianchi',       ruolo:'Maldive · 2 pax' },
      { orario:'12:30', nome:'Gruppo Andalusia',   ruolo:'Bus GT · 45 pax' },
      { orario:'15:50', nome:'Sig. Conte',         ruolo:'New York · 1 pax' },
      { orario:'21:10', nome:'Viaggio nozze Rossi', ruolo:'Bali · 2 pax' },
    ],
    turniLabel: 'Partenze di oggi',
    turniEmpty: 'Non ci sono partenze per oggi.',
    vip: [
      { nome:'Welcome Travel Group', nota:'Top partner · 142 pratiche YTD' },
      { nome:'Gruppo Aurora Tours',  nota:'Serie partenze estate · alto margine' },
      { nome:'Dott. M. Ferrara',     nota:'Cliente luxury · proposta Giappone' },
    ],
    vipLabel: 'Clienti VIP',
    meteoCity: 'SHARM EL SHEIKH',
    meteoTemp: '29°',
  },
}

export default function GiornaleImpresa({ navigate }: { navigate: (p: string) => void }) {
  const today     = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)

  // Variante: i Tour Operator (modulo `tour-operator`) vedono contenuti propri;
  // gli altri moduli vedono la versione standard. I moduli effettivi vengono
  // dall'eventuale sessione di assistenza, altrimenti dal profilo caricato.
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)
  const moduli = assist ? assist.moduli : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  const variant: GiornaleVariant = moduli?.includes('tour-operator') ? 'to' : 'hotel'
  const D = VARIANT_DATA[variant]
  // Vista estesa: catalogo card dal menu del modulo corrente (MENU o MENU_TO).
  const tabCards = React.useMemo(() => buildTabCards(variant === 'to' ? (MENU_TO as any[]) : (MENU as any[])), [variant])

  const [struttura, setStruttura] = useState(D.strutture[0])
  const [activeTab, setActiveTab] = useState('panoramica')
  const [viewMode,  setViewMode]  = useState<'sintetica' | 'estesa'>('sintetica')

  // vista sintetica
  const [active, setActive] = useState(0)

  // vista estesa — ordine delle card per ciascun tab (riordinabile col drag)
  const [orders, setOrders] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(Object.entries(tabCards).map(([k, cards]) => [k, cards.slice(0, DEFAULT_VISIBLE).map((c: any) => c.id)]))
  )
  const [editMode, setEditMode] = useState(false)
  const [dragId, setDragId]     = useState<string | null>(null)
  // Box News nella Panoramica estesa: gestito dal personalizza (bacchetta)
  const [newsHidden, setNewsHidden] = useState(false)

  // striscia settimana centrata su oggi (3 giorni prima/dopo)
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d
  })

  const strutture = D.strutture
  const orbit = D.orbit
  // Titolo card: per il TO "turni"→"Partenze di oggi" ed "eventi"→"Fiere & eventi".
  const titleFor = (card: any) => {
    if (card.type === 'page') return card.label
    if (card.id === 'turni') return D.turniLabel
    if (variant === 'to' && card.id === 'eventi') return 'Fiere & eventi'
    return CUSTOM_META[card.id]?.title ?? card.id
  }
  const tabs = [
    {id:'panoramica',label:'Panoramica impresa'},
    {id:'vendite',   label:'Analisi vendite'},
    {id:'gestione',  label:'Controllo gestione'},
    {id:'acquisti',  label:'Analisi acquisti'},
    {id:'operativa', label:'Analisi operativa'},
    {id:'personale', label:'Analisi del personale'},
  ]

  // Indicatori con valore di ieri e di oggi (tabella unica della vista estesa)
  const statsRows = D.statsRows
  const eventi = D.eventi
  const turni = D.turni
  const compleanni = [
    { nome:'Giulia Ferrari', ruolo:'Housekeeping', eta:'34' },
    { nome:'Davide Russo',   ruolo:'F&B Manager',  eta:'41' },
    { nome:'Chiara Galli',   ruolo:'Reception',    eta:'28' },
  ]
  const meteoForecast = [
    { g:'Sab', icon:'fa-cloud-sun',           t:'21°' },
    { g:'Dom', icon:'fa-sun',                 t:'24°' },
    { g:'Lun', icon:'fa-cloud-showers-heavy', t:'18°' },
    { g:'Mar', icon:'fa-cloud-sun',           t:'22°' },
  ]
  const almanaccoFatti = [
    '1889 — Apre al pubblico la Tour Eiffel',
    '1953 — Prima scalata dell\'Everest',
    '1962 — Primo collegamento TV transatlantico',
  ]
  const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2)
  const vip = D.vip
  const news = [
    {
      cat:'Economia', fonte:'Il Sole 24 Ore', tempo:'2h',
      img:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=70&auto=format&fit=crop',
      titolo:'Turismo, presenze in crescita del 6% nel trimestre',
      testo:'Il comparto ricettivo italiano chiude il trimestre con un incremento delle presenze trainato dal turismo internazionale e dall\'allungamento della stagione nelle località costiere.',
    },
    {
      cat:'Trasporti', fonte:'Travel Daily', tempo:'4h',
      img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70&auto=format&fit=crop',
      titolo:'Nuove rotte aeree verso il Sud Italia per l\'estate',
    },
    {
      cat:'Tecnologia', fonte:'HotelMag', tempo:'6h',
      img:'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=400&q=70&auto=format&fit=crop',
      titolo:'Revenue management: l\'AI cambia le tariffe dinamiche',
    },
    {
      cat:'Mercato', fonte:'Largo Consumo', tempo:'8h',
      img:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=70&auto=format&fit=crop',
      titolo:'Food & Beverage, i consumi premium trainano i ricavi',
    },
  ]

  // ── Contenuto dello stage centrale (vista sintetica) ───────────────────────
  function renderStage(id: string) {
    switch (id) {
      case 'calendario':
        return (
          <div className="giornale__cal">
            <div className="giornale__cal-hero">
              <span className="giornale__cal-weekday">{WDAYS[today.getDay()]}</span>
              <span className="giornale__cal-num">{today.getDate()}</span>
              <span className="giornale__cal-monthyear">{MONTHS[today.getMonth()]} {today.getFullYear()}</span>
            </div>
            <div className="giornale__cal-week">
              {weekStrip.map((d, i) => (
                <div key={i} className={`giornale__cal-wday ${d.getDate() === today.getDate() ? 'giornale__cal-wday--today' : ''}`}>
                  <span className="giornale__cal-wday-l">{WDAYS_SHORT[d.getDay()]}</span>
                  <span className="giornale__cal-wday-n">{d.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="giornale__cal-insight">
              <Ico n="info" s={12} c={T.primary} />
              <span>Accadde nel mese di {MONTHS[today.getMonth()]}: un mese di contrasti, tra sole e pioggia.</span>
            </div>
            <button className="giornale__stage-link" onClick={() => navigate('scadenzario')}>
              Scadenzario <Ico n="chevr" s={11} c={T.blue} />
            </button>
          </div>
        )
      case 'turni':
        // Hotel: nessun turno (vista vuota). Tour Operator: partenze di oggi.
        if (variant !== 'to') return <div className="giornale__stage-empty">{D.turniEmpty}</div>
        return (
          <div className="giornale__stage-list">
            {turni.map((t, i) => (
              <div key={i} className="giornale__stage-list-item">
                <div className="giornale__stage-list-title">{t.orario} · {t.nome}</div>
                <div className="giornale__stage-list-sub">{t.ruolo}</div>
              </div>
            ))}
          </div>
        )
      case 'vip':
        return (
          <div className="giornale__stage-list">
            {vip.map((v, i) => (
              <div key={i} className="giornale__stage-list-item">
                <div className="giornale__stage-list-title">{v.nome}</div>
                <div className="giornale__stage-list-sub">{v.nota}</div>
              </div>
            ))}
          </div>
        )
      case 'eventi':
        return (
          <div className="giornale__stage-list">
            {eventi.map((ev, i) => (
              <div key={i} className="giornale__stage-list-item">
                <div className="giornale__stage-list-title">{ev.titolo}</div>
                <div className="giornale__stage-list-sub">{ev.data} {ev.mese} · {ev.luogo}</div>
              </div>
            ))}
          </div>
        )
      case 'numeri':
        return (
          <div className="giornale__stage-numbers">
            {statsRows.slice(4, 8).map((r, i) => (
              <div key={i} className="giornale__stage-num">
                <div className="giornale__stage-num-val">{r.oggi}</div>
                <div className="giornale__stage-num-label">{r.label}</div>
              </div>
            ))}
          </div>
        )
      case 'meteo':
        return (
          <div className="giornale__stage-meteo">
            <i className="fa-duotone fa-cloud-sun giornale__stage-meteo-icon" aria-hidden="true" />
            <div className="giornale__stage-meteo-temp">{D.meteoTemp}</div>
            <div className="giornale__stage-meteo-city">{D.meteoCity}</div>
            <p className="giornale__stage-note">
              Velature sparse. Soleggiato per il resto del giorno. Folate di vento fino a 3,6 km/h.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  // ── Card riposizionabili (vista estesa) ─────────────────────────────────────
  function renderExtCard(id: string) {
    switch (id) {
      case 'numeri':
        return (
          <>
            <div className="giornale__merged-row giornale__merged-row--head">
              <div className="giornale__merged-label">Indicatore</div>
              <div className="giornale__merged-val">Ieri</div>
              <div className="giornale__merged-val">Oggi</div>
            </div>
            {statsRows.map((row, i) => (
              <div key={i} className="giornale__merged-row">
                <div className="giornale__merged-label">{row.label}</div>
                <div className="giornale__merged-val giornale__merged-val--ieri">{row.ieri}</div>
                <div className="giornale__merged-val">{row.oggi}</div>
              </div>
            ))}
          </>
        )
      case 'almanacco':
        return (
          <>
            <div className="giornale__almanacco-body">
              <div className="giornale__almanacco-date">
                <div className="giornale__almanacco-day-name">{WDAYS[today.getDay()]}</div>
                <div className="giornale__almanacco-day-num">{today.getDate()}</div>
                <div className="giornale__almanacco-month">{MONTHS[today.getMonth()]}</div>
              </div>
              <div className="giornale__almanacco-content">
                <div className="giornale__almanacco-text-title">Accadde nel mese di {MONTHS[today.getMonth()]}:</div>
                <p className="giornale__almanacco-text">Un mese di contrasti, tra piogge che bagnano l'anima e giornate di sole che la illuminano.</p>
                <button className="giornale__almanacco-link" onClick={() => navigate('scadenzario')}>
                  Scadenzario <Ico n="chevr" s={11} c={T.blue} />
                </button>
              </div>
            </div>
            <div className="giornale__alm-facts">
              <div className="giornale__alm-facts-title">Accadde oggi</div>
              {almanaccoFatti.map((f, i) => (
                <div key={i} className="giornale__alm-fact">{f}</div>
              ))}
            </div>
          </>
        )
      case 'meteo':
        return (
          <>
            <div className="giornale__meteo-body">
              <div className="giornale__meteo-row">
                <i className="fa-duotone fa-cloud-sun giornale__meteo-icon" aria-hidden="true" />
                <div>
                  <div className="giornale__meteo-city">{D.meteoCity}</div>
                  <div className="giornale__meteo-temp">{D.meteoTemp}</div>
                </div>
              </div>
              <p className="giornale__meteo-desc">Velature sparse. Soleggiato per il resto del giorno.</p>
              <div className="giornale__meteo-stats">
                <div><span>Umidità</span><strong>54%</strong></div>
                <div><span>Vento</span><strong>3,6 km/h</strong></div>
                <div><span>Precip.</span><strong>10%</strong></div>
              </div>
              <div className="giornale__meteo-forecast">
                {meteoForecast.map((d, i) => (
                  <div key={i} className="giornale__meteo-fc">
                    <span className="giornale__meteo-fc-day">{d.g}</span>
                    <i className={`fa-duotone ${d.icon} giornale__meteo-fc-icon`} aria-hidden="true" />
                    <span className="giornale__meteo-fc-temp">{d.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      case 'eventi':
        return (
          <>
            <div className="giornale__list">
              {eventi.map((ev, i) => (
                <div key={i} className="giornale__ev">
                  <div className="giornale__ev-date"><strong>{ev.data}</strong>{ev.mese}</div>
                  <div className="giornale__ev-body">
                    <div className="giornale__ev-title">{ev.titolo}</div>
                    <div className="giornale__ev-loc">{ev.luogo}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      case 'turni':
        return (
          <>
            <div className="giornale__list">
              {turni.map((t, i) => (
                <div key={i} className="giornale__shift">
                  <span className="giornale__shift-time">{t.orario}</span>
                  <div className="giornale__shift-body">
                    <div className="giornale__shift-name">{t.nome}</div>
                    <div className="giornale__shift-role">{t.ruolo}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      case 'compleanni':
        return (
          <>
            <div className="giornale__list">
              {compleanni.map((c, i) => (
                <div key={i} className="giornale__bday">
                  <span className="giornale__bday-avatar">{initials(c.nome)}</span>
                  <div className="giornale__bday-body">
                    <div className="giornale__bday-name">{c.nome}</div>
                    <div className="giornale__bday-role">{c.ruolo} · compie {c.eta} anni</div>
                  </div>
                  <i className="fa-duotone fa-cake-candles giornale__bday-cake" aria-hidden="true" />
                </div>
              ))}
            </div>
          </>
        )
      default:
        return null
    }
  }

  // ── Corpo card (l'header con le azioni è reso dal wrapper) ──────────────────
  function renderCard(card: any) {
    if (card.type === 'custom') return renderExtCard(card.id)
    if (card.type === 'page') return (
      <div className="giornale__page-body">
        <div className="giornale__summary">
          {summaryFor(card).map((b: any, i: number) => renderBlock(b, i))}
        </div>
        <button className="giornale__page-open" onClick={() => navigate(card.page)}>
          Apri pagina <Ico n="arrow-right" s={12} c={T.primary} />
        </button>
      </div>
    )
    return null
  }

  // ── Gestione card: riordino, comprimi, elimina, aggiungi ────────────────────
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    setOrders(prev => {
      const cur  = prev[activeTab] ?? []
      const next = cur.filter(x => x !== dragId)
      next.splice(next.indexOf(targetId), 0, dragId)
      return { ...prev, [activeTab]: next }
    })
    setDragId(null)
  }
  const removeCard = (id: string) =>
    setOrders(p => ({ ...p, [activeTab]: (p[activeTab] ?? []).filter(x => x !== id) }))
  const addCard = (id: string) =>
    setOrders(p => (p[activeTab] ?? []).includes(id) ? p : { ...p, [activeTab]: [...(p[activeTab] ?? []), id] })

  // I Tour Operator hanno una pagina con layout dedicato.
  if (variant === 'to') return <GiornaleImpresaTO navigate={navigate} />

  return (
    <div className="giornale">
      {/* Top bar */}
      <div className="giornale__top-bar">
        <div>
          <BtnBack />
          <h1 className="giornale__title">Giornale impresa</h1>
          <p className="giornale__subtitle">{D.subtitle}</p>
        </div>
        <button className="giornale__live-btn" onClick={() => navigate('sugg-data-driven')}>
          <div className="giornale__live-dot" />LIVE
        </button>
      </div>

      {/* Struttura + toggle vista */}
      <div className="giornale__control-bar">
        {/* Select strutture: solo in vista estesa (nella sintetica e nascosta) */}
        {viewMode === 'estesa' && (
          <SelectField
            name="struttura"
            label={D.struttureLabel}
            value={struttura}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
            options={strutture.map(s => ({ value: s, label: s }))}
            className="w-48"
          />
        )}
        <div className="giornale__view-toggle">
          <button
            className={`giornale__view-btn ${viewMode === 'sintetica' ? 'giornale__view-btn--active' : ''}`}
            onClick={() => setViewMode('sintetica')}
          >
            Sintetica
          </button>
          <button
            className={`giornale__view-btn ${viewMode === 'estesa' ? 'giornale__view-btn--active' : ''}`}
            onClick={() => setViewMode('estesa')}
          >
            Estesa
          </button>
        </div>
      </div>

      {/* ───────────────────────── VISTA SINTETICA ───────────────────────── */}
      {viewMode === 'sintetica' && (
        <>
          <div className="giornale__ring">
            <button
              className="giornale__ring-arrow giornale__ring-arrow--prev"
              onClick={() => setActive(a => (a - 1 + orbit.length) % orbit.length)}
              aria-label="Sezione precedente"
            >
              <Ico n="back" s={18} c={T.primary} />
            </button>

            {/* Stage centrale */}
            <div className="giornale__stage">
              <div className="giornale__stage-head">
                <Ico n={orbit[active].icon} s={14} c={T.primary} />
                {orbit[active].label}
              </div>
              <div className="giornale__stage-body" key={orbit[active].id}>
                {renderStage(orbit[active].id)}
              </div>
            </div>

            <button
              className="giornale__ring-arrow giornale__ring-arrow--next"
              onClick={() => setActive(a => (a + 1) % orbit.length)}
              aria-label="Sezione successiva"
            >
              <Ico n="chevr" s={18} c={T.primary} />
            </button>

            {/* Sfere orbitanti */}
            {orbit.map((node, i) => (
              <button
                key={node.id}
                className={`giornale__node giornale__node--p${i} ${i === active ? 'giornale__node--active' : ''}`}
                onClick={() => setActive(i)}
              >
                <span className="giornale__node-circle">
                  <Ico n={node.icon} s={38} c={T.primary} />
                </span>
                <span className="giornale__node-label">{node.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ───────────────────────── VISTA ESTESA ───────────────────────── */}
      {viewMode === 'estesa' && (
        <>
          {/* Tab + bacchetta magica (personalizza) a destra della riga tab */}
          <div className="giornale__ext-tabsrow">
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            <button
              type="button"
              className={`giornale__wand ${editMode ? 'giornale__wand--on' : ''}`}
              onClick={() => setEditMode(v => !v)}
              aria-label={editMode ? 'Fine personalizzazione' : 'Personalizza'}
              title={editMode ? 'Fine personalizzazione' : 'Personalizza'}
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
            </button>
          </div>

          {/* Pannello "aggiungi/rimuovi sezioni" (dalle voci di menu della categoria) */}
          {editMode && (
            <div className="giornale__add-panel">
              <div className="giornale__add-title">Sezioni disponibili</div>
              <div className="giornale__add-chips">
                {tabCards[activeTab].map((c: any) => {
                  const shown = (orders[activeTab] ?? []).includes(c.id)
                  return (
                    <button
                      key={c.id}
                      className={`giornale__add-chip ${shown ? 'giornale__add-chip--on' : ''}`}
                      onClick={() => shown ? removeCard(c.id) : addCard(c.id)}
                    >
                      <Ico n={shown ? 'check' : 'plus'} s={11} c={shown ? T.white : T.primary} />
                      {titleFor(c)}
                    </button>
                  )
                })}
                {activeTab === 'panoramica' && (
                  <button
                    className={`giornale__add-chip ${!newsHidden ? 'giornale__add-chip--on' : ''}`}
                    onClick={() => setNewsHidden(v => !v)}
                  >
                    <Ico n={!newsHidden ? 'check' : 'plus'} s={11} c={!newsHidden ? T.white : T.primary} />
                    News &amp; comunicazione
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Card del tab selezionato — riposizionabili, comprimibili, eliminabili */}
          <div className={`giornale__ext-grid ${editMode ? 'giornale__ext-grid--edit' : ''}`}>
            {(orders[activeTab] ?? []).map(id => {
              const card = tabCards[activeTab].find((c: any) => c.id === id)
              if (!card) return null
              const meta = CUSTOM_META[card.id]
              return (
                <div
                  key={id}
                  className={`giornale__card giornale__ext-card ${dragId === id ? 'giornale__ext-card--dragging' : ''}`}
                  draggable={editMode}
                  onDragStart={() => editMode && setDragId(id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={e => { if (editMode) e.preventDefault() }}
                  onDrop={() => editMode && handleDrop(id)}
                >
                  <div className="giornale__card-bar">
                    <div className="giornale__card-bar-title">
                      {card.type === 'page'
                        ? <MenuIco id={card.nodeId} s={15} c={T.primary} />
                        : <Ico n={meta?.icon ?? 'bar'} s={13} c={T.primary} />}
                      <span className="giornale__card-bar-label">{titleFor(card)}</span>
                      {meta?.sdly && <span className="giornale__merged-sdly">S.D.L.Y.</span>}
                    </div>
                    {editMode && (
                      <div className="giornale__card-actions">
                        <span className="giornale__card-act giornale__card-drag"><Ico n="dots-v" s={13} c={T.primary} /></span>
                      </div>
                    )}
                  </div>
                  <div className="giornale__card-body">{renderCard(card)}</div>
                </div>
              )
            })}
          </div>

          {/* News & comunicazione — ultimo elemento della Panoramica impresa */}
          {activeTab === 'panoramica' && !newsHidden && (
            <div className="giornale__news">
              <div className="giornale__news-head">
                <span className="giornale__news-head-title"><Ico n="bar" s={14} c={T.primary} />News &amp; comunicazione</span>
                <button className="giornale__news-all" onClick={() => navigate('scadenzario')}>
                  Tutte le news <Ico n="chevr" s={11} c={T.blue} />
                </button>
              </div>
              <div className="giornale__news-grid">
                {/* articolo in evidenza */}
                <article className="giornale__news-feat">
                  <div className="giornale__news-feat-media" style={{ '--img': `url(${news[0].img})` } as React.CSSProperties}>
                    <span className="giornale__news-cat">{news[0].cat}</span>
                  </div>
                  <div className="giornale__news-feat-body">
                    <h3 className="giornale__news-feat-title">{news[0].titolo}</h3>
                    <p className="giornale__news-feat-text">{news[0].testo}</p>
                    <div className="giornale__news-meta">{news[0].fonte} · {news[0].tempo} fa</div>
                  </div>
                </article>

                {/* lista secondaria con thumbnail */}
                <div className="giornale__news-list">
                  {news.slice(1).map((n, i) => (
                    <article key={i} className="giornale__news-item">
                      <div className="giornale__news-thumb" style={{ '--img': `url(${n.img})` } as React.CSSProperties} />
                      <div className="giornale__news-item-body">
                        <span className="giornale__news-cat giornale__news-cat--sm">{n.cat}</span>
                        <h4 className="giornale__news-item-title">{n.titolo}</h4>
                        <div className="giornale__news-meta">{n.fonte} · {n.tempo} fa</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
