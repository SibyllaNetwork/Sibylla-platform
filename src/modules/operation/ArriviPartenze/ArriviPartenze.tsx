import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import Modal from '../../../core/components/Modal'
import { Pagination } from '../../../core/components'
import { DateRangeField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import 'react-day-picker/dist/style.css'
import './ArriviPartenze.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface OspitiCount { adulti: number; bambini: number; infanti: number }

type AzioneStato = 'Check-in completo' | 'Check-in parziale' | 'Check-in da fare' | 'No Show'
type StatoPren   = 'Confermata' | 'Opzionata' | 'In attesa' | 'Annullata'

interface Arrivo {
  id: number
  prenotazioneNum: string
  camera: string
  nominativo: string
  ospiti: OspitiCount
  ospitiTot: { adulti: number; bambini: number; infanti: number }
  arrivo: string       // dd/MM/yyyy
  partenza: string     // dd/MM/yyyy
  arrangiamento: string
  arrangiamentoIcon: string
  agenzia: string
  tipoPren: string
  importo: number
  azione: AzioneStato
  vip: boolean
  statoPren: StatoPren
  dataOpzione?: string
}

interface Partenza {
  id: number
  prenotazioneNum: string
  camera: string
  ospite: string
  fasciaEta: string
  arrivo: string
  partenza: string
  arrangiamento: string
  canale: string
  tipoPrenotazione: string
  residuo: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  inArrivo: Arrivo[]
  inPartenza: Partenza[]
}

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  inArrivo: [
    {
      id: 1, prenotazioneNum: '14997', camera: '307', nominativo: 'Novi Ruggero',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '03/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Nessuna', tipoPren: 'Individuale', importo: 781.60,
      azione: 'Check-in da fare', vip: false, statoPren: 'Confermata',
    },
    {
      id: 2, prenotazioneNum: '15185', camera: '107', nominativo: 'Ovest Destination Italy',
      ospiti: { adulti: 2, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '01/05/2026',
      arrangiamento: 'Room only', arrangiamentoIcon: 'bed',
      agenzia: 'Ovest Destination Italy', tipoPren: 'Individuale', importo: 313.84,
      azione: 'Check-in completo', vip: false, statoPren: 'Confermata',
    },
    {
      id: 3, prenotazioneNum: '15201', camera: '210', nominativo: 'Bianchi Federica',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 1, infanti: 0 },
      arrivo: '30/04/2026', partenza: '04/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Booking.com', tipoPren: 'Individuale', importo: 1248.00,
      azione: 'Check-in da fare', vip: true, statoPren: 'Confermata',
    },
    {
      id: 4, prenotazioneNum: '15212', camera: '115', nominativo: 'Gruppo Welcome Travel',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 4, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '02/05/2026',
      arrangiamento: 'Room only', arrangiamentoIcon: 'bed',
      agenzia: 'Welcome Travel', tipoPren: 'Gruppo', importo: 1880.00,
      azione: 'Check-in parziale', vip: false, statoPren: 'Confermata',
    },
    {
      // stessa prenotazione 15212 → seconda camera
      id: 13, prenotazioneNum: '15212', camera: '116', nominativo: 'Gruppo Welcome Travel',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 2, infanti: 0 },
      arrivo: '30/04/2026', partenza: '02/05/2026',
      arrangiamento: 'Room only', arrangiamentoIcon: 'bed',
      agenzia: 'Welcome Travel', tipoPren: 'Gruppo', importo: 1880.00,
      azione: 'Check-in parziale', vip: false, statoPren: 'Confermata',
    },
    {
      // stessa prenotazione 15212 → terza camera
      id: 14, prenotazioneNum: '15212', camera: '117', nominativo: 'Gruppo Welcome Travel',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 3, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '02/05/2026',
      arrangiamento: 'Room only', arrangiamentoIcon: 'bed',
      agenzia: 'Welcome Travel', tipoPren: 'Gruppo', importo: 1880.00,
      azione: 'Check-in parziale', vip: false, statoPren: 'Confermata',
    },
    {
      id: 5, prenotazioneNum: '15233', camera: '402', nominativo: 'Rossi Marco',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 1, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '31/04/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Expedia', tipoPren: 'Individuale', importo: 142.50,
      azione: 'No Show', vip: false, statoPren: 'Confermata',
    },
    {
      id: 6, prenotazioneNum: '15240', camera: '118', nominativo: 'Müller Hans',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 1 },
      arrivo: '01/05/2026', partenza: '06/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Nessuna', tipoPren: 'Individuale', importo: 1890.00,
      azione: 'Check-in da fare', vip: true, statoPren: 'Confermata',
    },
    {
      id: 7, prenotazioneNum: '15255', camera: '305', nominativo: 'Ferrari Giulia',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 0 },
      arrivo: '01/05/2026', partenza: '03/05/2026',
      arrangiamento: 'Room only', arrangiamentoIcon: 'bed',
      agenzia: 'Booking.com', tipoPren: 'Individuale', importo: 456.00,
      azione: 'Check-in da fare', vip: false, statoPren: 'Opzionata', dataOpzione: '28/04/2026',
    },
    {
      id: 8, prenotazioneNum: '15268', camera: '120', nominativo: 'Gruppo Aurora Tours',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 24, bambini: 4, infanti: 0 },
      arrivo: '01/05/2026', partenza: '05/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Aurora Tours', tipoPren: 'Gruppo', importo: 9820.00,
      azione: 'Check-in da fare', vip: false, statoPren: 'Confermata',
    },
    {
      id: 9, prenotazioneNum: '15271', camera: '208', nominativo: 'Conte Alessandro',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 2, infanti: 0 },
      arrivo: '01/05/2026', partenza: '08/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Expedia', tipoPren: 'Individuale', importo: 1120.00,
      azione: 'Check-in da fare', vip: false, statoPren: 'In attesa',
    },
    {
      id: 10, prenotazioneNum: '15288', camera: '410', nominativo: 'Esposito Carmen',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 1, bambini: 0, infanti: 0 },
      arrivo: '02/05/2026', partenza: '04/05/2026',
      arrangiamento: 'Room only', arrangiamentoIcon: 'bed',
      agenzia: 'Nessuna', tipoPren: 'Individuale', importo: 298.00,
      azione: 'Check-in da fare', vip: false, statoPren: 'Confermata',
    },
    {
      id: 11, prenotazioneNum: '15294', camera: '112', nominativo: 'Dubois Marie',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 0 },
      arrivo: '02/05/2026', partenza: '07/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Welcome Travel', tipoPren: 'Individuale', importo: 1675.00,
      azione: 'Check-in da fare', vip: true, statoPren: 'Confermata',
    },
    {
      id: 12, prenotazioneNum: '15301', camera: '301', nominativo: 'Greco Salvatore',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 3, bambini: 0, infanti: 0 },
      arrivo: '02/05/2026', partenza: '05/05/2026',
      arrangiamento: 'Bed & Breakfast', arrangiamentoIcon: 'mug-saucer',
      agenzia: 'Booking.com', tipoPren: 'Individuale', importo: 845.00,
      azione: 'Check-in da fare', vip: false, statoPren: 'Opzionata', dataOpzione: '29/04/2026',
    },
  ],
  inPartenza: [
    { id: 1, prenotazioneNum: '14880', camera: '205', ospite: 'Romano Lucia',     fasciaEta: 'Adulto', arrivo: '27/04/2026', partenza: '30/04/2026', arrangiamento: 'Room only',    canale: 'Diretto',     tipoPrenotazione: 'Individuale', residuo: 0 },
    { id: 2, prenotazioneNum: '14902', camera: '109', ospite: 'Smith John',        fasciaEta: 'Adulto', arrivo: '26/04/2026', partenza: '01/05/2026', arrangiamento: 'Bed & Breakfast', canale: 'Booking.com', tipoPrenotazione: 'Individuale', residuo: 124.00 },
    { id: 3, prenotazioneNum: '14915', camera: '311', ospite: 'Gruppo Robintur',   fasciaEta: '—',      arrivo: '25/04/2026', partenza: '30/04/2026', arrangiamento: 'Bed & Breakfast', canale: 'Agenzia',     tipoPrenotazione: 'Gruppo',      residuo: 1430.00 },
    { id: 4, prenotazioneNum: '14931', camera: '118', ospite: 'García Sofía',      fasciaEta: 'Adulto', arrivo: '28/04/2026', partenza: '02/05/2026', arrangiamento: 'Bed & Breakfast', canale: 'Expedia',     tipoPrenotazione: 'Individuale', residuo: 0 },
    { id: 5, prenotazioneNum: '14944', camera: '402', ospite: 'Lombardi Davide',   fasciaEta: 'Adulto', arrivo: '23/04/2026', partenza: '01/05/2026', arrangiamento: 'Room only',    canale: 'Diretto',     tipoPrenotazione: 'Individuale', residuo: 58.50 },
    { id: 6, prenotazioneNum: '14958', camera: '210', ospite: 'Moreau Pierre',     fasciaEta: 'Adulto', arrivo: '27/04/2026', partenza: '03/05/2026', arrangiamento: 'Bed & Breakfast', canale: 'Booking.com', tipoPrenotazione: 'Individuale', residuo: 0 },
    { id: 7, prenotazioneNum: '14970', camera: '115', ospite: 'Bambino Rossi',     fasciaEta: 'Bambino',arrivo: '27/04/2026', partenza: '30/04/2026', arrangiamento: 'Room only',    canale: 'Diretto',     tipoPrenotazione: 'Individuale', residuo: 0 },
    { id: 8, prenotazioneNum: '14986', camera: '308', ospite: 'Kovač Ana',         fasciaEta: 'Adulto', arrivo: '24/04/2026', partenza: '02/05/2026', arrangiamento: 'Bed & Breakfast', canale: 'Agenzia',     tipoPrenotazione: 'Gruppo',      residuo: 312.00 },
    { id: 9, prenotazioneNum: '14991', camera: '120', ospite: 'Neri Valentina',    fasciaEta: 'Adulto', arrivo: '28/04/2026', partenza: '01/05/2026', arrangiamento: 'Room only',    canale: 'Diretto',     tipoPrenotazione: 'Individuale', residuo: 0 },
    { id: 10, prenotazioneNum: '14999', camera: '301', ospite: 'Tanaka Yuki',      fasciaEta: 'Adulto', arrivo: '26/04/2026', partenza: '03/05/2026', arrangiamento: 'Bed & Breakfast', canale: 'Expedia',     tipoPrenotazione: 'Individuale', residuo: 0 },
  ],
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'agenzia' | 'azione' | 'statoPren' | 'tipo'
type PartFilterKey = 'fasciaEta' | 'arrangiamento' | 'canale' | 'tipoPrenotazione'

// ms da una data dd/MM/yyyy (per ordinamento Periodo)
const msDate = (s: string) => { const [d, m, y] = s.split('/').map(Number); return new Date(y, m - 1, d).getTime() }

const AZIONI_ALL: AzioneStato[] = ['Check-in completo', 'Check-in parziale', 'Check-in da fare', 'No Show']
const STATI_ALL: StatoPren[]    = ['Confermata', 'Opzionata', 'In attesa', 'Annullata']

// icona di stato per la colonna Check-in (tutte le tipologie del filtro)
const AZIONE_ICON: Record<AzioneStato, { icon: string; cls: string }> = {
  'Check-in completo': { icon: 'fa-circle-check',       cls: 'ok' },
  'Check-in parziale': { icon: 'fa-circle-half-stroke', cls: 'warn' },
  'Check-in da fare':  { icon: 'fa-clock',              cls: 'todo' },
  'No Show':           { icon: 'fa-user-xmark',         cls: 'ko' },
}

const REPORT_SERVIZI = ['Tutti', 'Colazione', 'Pranzo', 'Cena'] as const
// prenotazioni con rooming list già comunicata (dato per-prenotazione)
const ROOMING_DONE = new Set(['15185', '15201', '15212', '15271'])
const PAGE_SIZE = 10

export default function ArriviPartenze({ navigate }: { navigate: (p: string) => void }) {
  const today = todayISO()
  const [tab, setTab] = useState<'arrivi' | 'partenze'>('arrivi')
  const [pageArr, setPageArr] = useState(1)
  const [pagePart, setPagePart] = useState(1)
  const [data, setData] = useState<Data>(FALLBACK)
  const [searchArr, setSearchArr] = useState('')
  const [searchPart, setSearchPart] = useState('')
  const [dataDa, setDataDa] = useState(today)
  const [dataA, setDataA] = useState(today)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [checkIn, setCheckIn] = useState<Arrivo | null>(null)
  const [checkout, setCheckout] = useState<{ multi: boolean; camera?: string } | null>(null)
  const [reportServizio, setReportServizio] = useState<string>('')
  const [dateRangeOpen, setDateRangeOpen] = useState(false)

  // La scelta nella select scarica direttamente il report PDF del servizio.
  const scaricaReportServizio = (servizio: string) => {
    // TODO: hook download PDF report servizio
    // params: strutturaId, dataDa, dataA, servizio
    window.print()
  }

  const selectedRange: DateRange | undefined = dataDa
    ? { from: parseISO(dataDa), to: dataA ? parseISO(dataA) : undefined }
    : undefined

  const handleRangeSelect = (r: DateRange | undefined) => {
    setDataDa(r?.from ? format(r.from, 'yyyy-MM-dd') : '')
    setDataA(r?.to   ? format(r.to,   'yyyy-MM-dd') : '')
    if (r?.from && r?.to) setDateRangeOpen(false)
  }

  const dateRangeLabel = dataDa
    ? `${format(parseISO(dataDa), 'dd/MM/yyyy')} – ${dataA ? format(parseISO(dataA), 'dd/MM/yyyy') : '…'}`
    : 'Seleziona periodo'

  // Column filters (multi-select)
  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    agenzia: [],
    azione: [],
    statoPren: [],
    tipo: [],
  })
  // Ordinamento per data di arrivo (Periodo): default = più prossima (arrivo più imminente)
  const [arrSort, setArrSort] = useState<'prossima' | 'lontana' | null>('prossima')
  const cycleArrSort = () => setArrSort((s) => (s === 'prossima' ? 'lontana' : s === 'lontana' ? null : 'prossima'))

  const toggleColFilter = (key: ColFilterKey, value: string) => {
    setColFilters((p) => {
      const cur = p[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...p, [key]: next }
    })
  }
  const setAllColFilter = (key: ColFilterKey, allValues: string[], select: boolean) => {
    setColFilters((p) => ({ ...p, [key]: select ? [...allValues] : [] }))
  }

  // ── Filtri colonna "In partenza" ─────────────────────────────────────────────
  const [openPartFilter, setOpenPartFilter] = useState<PartFilterKey | null>(null)
  const [partFilters, setPartFilters] = useState<Record<PartFilterKey, string[]>>({
    fasciaEta: [], arrangiamento: [], canale: [], tipoPrenotazione: [],
  })
  const togglePartFilter = (key: PartFilterKey, value: string) => {
    setPartFilters((p) => {
      const cur = p[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...p, [key]: next }
    })
  }
  const setAllPartFilter = (key: PartFilterKey, allValues: string[], select: boolean) => {
    setPartFilters((p) => ({ ...p, [key]: select ? [...allValues] : [] }))
  }
  // Ordinamento per data di partenza: 'prossima' (più vicina) ↔ 'lontana' (più lontana)
  const [partSort, setPartSort] = useState<'prossima' | 'lontana' | null>(null)
  const cyclePartSort = () => setPartSort((s) => (s === null ? 'prossima' : s === 'prossima' ? 'lontana' : null))

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetArriviPartenze', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: dataDa, a: dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDa, dataA, data.StrutturaId])

  const arrivi = useMemo(() => {
    let rows = data.inArrivo
    const q = searchArr.toLowerCase().trim()
    if (q) {
      rows = rows.filter((r) =>
        r.prenotazioneNum.includes(q) ||
        r.nominativo.toLowerCase().includes(q) ||
        r.camera.toLowerCase().includes(q),
      )
    }
    if (colFilters.agenzia.length)   rows = rows.filter((r) => colFilters.agenzia.includes(r.agenzia))
    if (colFilters.azione.length)    rows = rows.filter((r) => colFilters.azione.includes(r.azione))
    if (colFilters.statoPren.length) rows = rows.filter((r) => colFilters.statoPren.includes(r.statoPren))
    if (colFilters.tipo.length)      rows = rows.filter((r) => colFilters.tipo.includes(r.tipoPren))
    if (arrSort) rows = [...rows].sort((a, b) => arrSort === 'prossima' ? msDate(a.arrivo) - msDate(b.arrivo) : msDate(b.arrivo) - msDate(a.arrivo))
    return rows
  }, [data.inArrivo, searchArr, colFilters, arrSort])

  const agenzieDistinct = useMemo(
    () => Array.from(new Set(data.inArrivo.map((r) => r.agenzia))).sort(),
    [data.inArrivo],
  )
  const tipiDistinct = useMemo(
    () => Array.from(new Set(data.inArrivo.map((r) => r.tipoPren))).sort(),
    [data.inArrivo],
  )

  const partenze = useMemo(() => {
    let rows = data.inPartenza
    const q = searchPart.toLowerCase().trim()
    if (q) rows = rows.filter((r) =>
      r.prenotazioneNum.includes(q) ||
      r.ospite.toLowerCase().includes(q) ||
      r.camera.toLowerCase().includes(q),
    )
    if (partFilters.fasciaEta.length)       rows = rows.filter((r) => partFilters.fasciaEta.includes(r.fasciaEta))
    if (partFilters.arrangiamento.length)   rows = rows.filter((r) => partFilters.arrangiamento.includes(r.arrangiamento))
    if (partFilters.canale.length)          rows = rows.filter((r) => partFilters.canale.includes(r.canale))
    if (partFilters.tipoPrenotazione.length)rows = rows.filter((r) => partFilters.tipoPrenotazione.includes(r.tipoPrenotazione))
    if (partSort) rows = [...rows].sort((a, b) => partSort === 'prossima' ? msDate(a.partenza) - msDate(b.partenza) : msDate(b.partenza) - msDate(a.partenza))
    return rows
  }, [data.inPartenza, searchPart, partFilters, partSort])

  const fasceDistinct      = useMemo(() => Array.from(new Set(data.inPartenza.map((r) => r.fasciaEta))).sort(), [data.inPartenza])
  const arrPartDistinct    = useMemo(() => Array.from(new Set(data.inPartenza.map((r) => r.arrangiamento))).sort(), [data.inPartenza])
  const canaliDistinct     = useMemo(() => Array.from(new Set(data.inPartenza.map((r) => r.canale))).sort(), [data.inPartenza])
  const tipiPartDistinct   = useMemo(() => Array.from(new Set(data.inPartenza.map((r) => r.tipoPrenotazione))).sort(), [data.inPartenza])

  // Paginazione (10 per pagina). Reset alla pagina 1 quando cambiano i filtri.
  useEffect(() => { setPageArr(1) }, [searchArr, colFilters])
  useEffect(() => { setPagePart(1) }, [searchPart, partFilters])

  const arrTotalPages = Math.max(1, Math.ceil(arrivi.length / PAGE_SIZE))
  const arrPage = Math.min(pageArr, arrTotalPages)
  const arriviPage = arrivi.slice((arrPage - 1) * PAGE_SIZE, arrPage * PAGE_SIZE)

  const partTotalPages = Math.max(1, Math.ceil(partenze.length / PAGE_SIZE))
  const partPage = Math.min(pagePart, partTotalPages)
  const partenzePage = partenze.slice((partPage - 1) * PAGE_SIZE, partPage * PAGE_SIZE)

  // Stats
  const totPresenze = arrivi.reduce((s, a) => s + a.ospitiTot.adulti + a.ospitiTot.bambini + a.ospitiTot.infanti, 0)
  const totCamere = new Set(arrivi.map((a) => a.camera)).size
  const totGruppi = arrivi.filter((a) => a.tipoPren?.toLowerCase().includes('gruppo')).length
  const pctGruppi = arrivi.length ? Math.round((totGruppi / arrivi.length) * 100) : 0
  const pctIndividuali = 100 - pctGruppi

  const totPartCamere = new Set(partenze.map((p) => p.camera)).size
  const totPartGruppi = partenze.filter((p) => p.tipoPrenotazione?.toLowerCase().includes('gruppo')).length
  const partPctGruppi = partenze.length ? Math.round((totPartGruppi / partenze.length) * 100) : 0
  const partPctIndividuali = partenze.length ? 100 - partPctGruppi : 0

  // ── Export PDF / Excel ────────────────────────────────────────────────────────
  const arrTableRef = useRef<HTMLTableElement>(null)
  const partTableRef = useRef<HTMLTableElement>(null)

  const buildArrExport = () => {
    const header = ['Prenotazione', 'Camera', 'Nominativo', 'Rooming list', 'Ospiti (A/B/I)', 'Periodo', 'Arrangiamento', 'Agenzia', 'Tipo', 'Importo', 'Check-in', 'VIP', 'Stato', 'Data opzione']
    const rows = arrivi.map((r) => [
      r.prenotazioneNum, r.camera, r.nominativo,
      ROOMING_DONE.has(r.prenotazioneNum) ? 'Comunicata' : 'Non comunicata',
      `${r.ospitiTot.adulti}/${r.ospitiTot.bambini}/${r.ospitiTot.infanti}`,
      `${r.arrivo} → ${r.partenza}`, r.arrangiamento, r.agenzia, r.tipoPren,
      fmtCurrency(r.importo), r.azione, r.vip ? 'Sì' : '', r.statoPren, r.dataOpzione ?? '-',
    ])
    return { header, rows }
  }
  const buildPartExport = () => {
    const header = ['Prenotazione', 'Camera', 'Ospite', 'Fascia età', 'Periodo', 'Arrangiamento', 'Canale', 'Tipo prenotazione', 'Residuo']
    const rows = partenze.map((p) => [
      p.prenotazioneNum, p.camera, p.ospite, fasciaEtaInfo(p.fasciaEta).label,
      `${p.arrivo} → ${p.partenza}`, p.arrangiamento, p.canale, p.tipoPrenotazione, fmtCurrency(p.residuo),
    ])
    return { header, rows }
  }
  const exportArrXls = () => { const { header, rows } = buildArrExport(); exportTableToXls('arrivi.xls', header, rows, 'In arrivo') }
  const exportArrPdf = () => exportElementToPdf(arrTableRef.current, 'arrivi.pdf', 'In arrivo')
  const exportPartXls = () => { const { header, rows } = buildPartExport(); exportTableToXls('partenze.xls', header, rows, 'In partenza') }
  const exportPartPdf = () => exportElementToPdf(partTableRef.current, 'partenze.pdf', 'In partenza')

  if (checkIn) {
    // stessa prenotazione = più camere → la vista mostra tutte le camere del gruppo
    const gruppo = data.inArrivo.filter(a => a.prenotazioneNum === checkIn.prenotazioneNum)
    return <CheckInView gruppo={gruppo.length ? gruppo : [checkIn]} onBack={() => setCheckIn(null)} />
  }

  return (
    <div className="arrivi-partenze">
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader
        title="Arrivi e partenze"
        subtitle="Monitoraggio del flusso giornaliero di check-in e check-out"
      />

      {/* Switch a linguette: una sezione alla volta, a tutta larghezza */}
      <div className="arrivi-partenze__tabs" role="tablist" aria-label="Arrivi / Partenze">
        <button type="button" role="tab" aria-selected={tab === 'arrivi'}
          className={`arrivi-partenze__tab ${tab === 'arrivi' ? 'is-active' : ''}`}
          onClick={() => setTab('arrivi')}>
          <i className="fa-light fa-plane-arrival" aria-hidden="true" /> In arrivo
          <em className="arrivi-partenze__tab-count">{arrivi.length}</em>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'partenze'}
          className={`arrivi-partenze__tab ${tab === 'partenze' ? 'is-active' : ''}`}
          onClick={() => setTab('partenze')}>
          <i className="fa-light fa-plane-departure" aria-hidden="true" /> In partenza
          <em className="arrivi-partenze__tab-count">{partenze.length}</em>
        </button>
      </div>

      {tab === 'arrivi' && (
      <>
      <div className="arrivi-partenze__toolbar">
        {/* Filtri sx */}
        <div className="arrivi-partenze__field arrivi-partenze__field--search">
          <label className="arrivi-partenze__label" htmlFor="ap-search">Cerca</label>
          <div className="arrivi-partenze__search-wrap">
            <input
              id="ap-search"
              type="search"
              className="sib-input arrivi-partenze__search-input"
              placeholder="Prenotazione, nominativo, camera…"
              value={searchArr}
              onChange={(e) => setSearchArr(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass arrivi-partenze__search-icon" />
          </div>
        </div>

        <div className="arrivi-partenze__field">
          <label className="arrivi-partenze__label" htmlFor="ap-strutture">Strutture</label>
          <select
            id="ap-strutture"
            className="sib-select arrivi-partenze__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="arrivi-partenze__field arrivi-partenze__field--date">
          <label className="arrivi-partenze__label" htmlFor="ap-date-range">Data</label>
          <button
            id="ap-date-range"
            type="button"
            className="arrivi-partenze__date-range"
            onClick={() => setDateRangeOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={dateRangeOpen}
          >
            <span className="arrivi-partenze__date-range-label">{dateRangeLabel}</span>
            <i className="fa-light fa-calendar arrivi-partenze__date-icon" aria-hidden="true" />
          </button>

          {dateRangeOpen && (
            <>
              <div
                className="arrivi-partenze__date-overlay"
                onClick={() => setDateRangeOpen(false)}
              />
              <div
                className="arrivi-partenze__date-popover"
                role="dialog"
                aria-label="Seleziona intervallo date"
                onClick={(e) => e.stopPropagation()}
              >
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  pagedNavigation
                  weekStartsOn={1}
                  locale={it}
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  defaultMonth={selectedRange?.from ?? new Date()}
                />
              </div>
            </>
          )}
        </div>

        {/* Azioni rapide (icona) */}
        <div className="arrivi-partenze__toolbar-icons">
          <Tooltip text="Check-in libero">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Check-in libero" onClick={() => setCheckinOpen(true)}>
              <i className="fa-light fa-calendar-clock" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Planner operativo">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Planner operativo" onClick={() => navigate('planner')}>
              <i className="fa-light fa-building" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Ospiti in casa">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Ospiti in casa" onClick={() => navigate('ospiti-in-casa')}>
              <i className="fa-light fa-house" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

        {/* Stats inline */}
        <div className="arrivi-partenze__stats">
          <span className="arrivi-partenze__stat"><i className="fa-light fa-user" aria-hidden="true" /> Presenze: <strong>{totPresenze}</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-bed-front" aria-hidden="true" /> Camere: <strong>{totCamere}</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-users" aria-hidden="true" /> Gruppi: <strong>{pctGruppi}%</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-user-check" aria-hidden="true" /> Individuali: <strong>{pctIndividuali}%</strong></span>
        </div>

        {/* Report servizio (stampa promemoria del giorno) + export tabella (dx) */}
        <div className="arrivi-partenze__toolbar-right">
          <div className="arrivi-partenze__field arrivi-partenze__report">
            <label className="arrivi-partenze__label" htmlFor="ap-report-serv">Report servizio</label>
            <select
              id="ap-report-serv"
              className="sib-select arrivi-partenze__select"
              value={reportServizio}
              onChange={(e) => { const v = e.target.value; if (!v) return; scaricaReportServizio(v); setReportServizio('') }}
            >
              <option value="">Scarica report…</option>
              {REPORT_SERVIZI.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="arrivi-partenze__toolbar-icons">
            <Tooltip text="Scarica previsioni presenze e pasti">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Scarica previsioni presenze e pasti">
                <i className="fa-light fa-chart-line" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta in PDF">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in PDF" onClick={exportArrPdf}>
                <i className="fa-light fa-file-pdf" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta in Excel">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel" onClick={exportArrXls}>
                <i className="fa-light fa-file-excel" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="sib-table-wrap arrivi-partenze__scroll">
        <table className="sib-table arrivi-partenze__table" ref={arrTableRef}>
          <thead>
            <tr>
              <th>Prenot. n°</th>
              <th className="arrivi-partenze__th-center">Camera</th>
              <th>Nominativo</th>
              <th className="arrivi-partenze__th-center">Rooming</th>
              <th className="arrivi-partenze__th-center">Ospiti</th>
              <th className="arrivi-partenze__th-center">
                <Tooltip text={arrSort === 'prossima' ? 'Arrivo prossimo — clic per più lontano' : arrSort === 'lontana' ? 'Arrivo più lontano — clic per rimuovere' : 'Ordina per data di arrivo'}>
                  <button type="button" className={`arrivi-partenze__sortbtn ${arrSort ? 'is-on' : ''}`} onClick={cycleArrSort}>
                    Periodo
                    <i className={`fa-solid ${arrSort === 'prossima' ? 'fa-arrow-down-short-wide' : arrSort === 'lontana' ? 'fa-arrow-up-wide-short' : 'fa-arrow-up-arrow-down'} arrivi-partenze__sort-ico`} aria-hidden="true" />
                  </button>
                </Tooltip>
              </th>
              <th className="arrivi-partenze__th-center">Arrangiamento</th>
              <th>
                <ColFilterHeader
                  label="Agenzia"
                  popupTitle="Tutti"
                  options={agenzieDistinct}
                  selected={colFilters.agenzia}
                  open={openFilter === 'agenzia'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'agenzia' ? null : 'agenzia')}
                  onToggle={(v) => toggleColFilter('agenzia', v)}
                  onSelectAll={(s) => setAllColFilter('agenzia', agenzieDistinct, s)}
                />
              </th>
              <th className="arrivi-partenze__th-center">
                <ColFilterHeader
                  label="Tipo"
                  popupTitle="Tutti"
                  options={tipiDistinct}
                  selected={colFilters.tipo}
                  open={openFilter === 'tipo'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'tipo' ? null : 'tipo')}
                  onToggle={(v) => toggleColFilter('tipo', v)}
                  onSelectAll={(s) => setAllColFilter('tipo', tipiDistinct, s)}
                />
              </th>
              <th className="arrivi-partenze__th-right">Importo</th>
              <th className="arrivi-partenze__th-center">
                <ColFilterHeader
                  label="Check-in"
                  popupTitle="scelte multiple"
                  options={AZIONI_ALL}
                  selected={colFilters.azione}
                  open={openFilter === 'azione'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'azione' ? null : 'azione')}
                  onToggle={(v) => toggleColFilter('azione', v)}
                  onSelectAll={(s) => setAllColFilter('azione', AZIONI_ALL, s)}
                />
              </th>
              <th className="arrivi-partenze__th-center">Vip</th>
              <th>
                <ColFilterHeader
                  label="Stato"
                  popupTitle="Tutti"
                  options={STATI_ALL}
                  selected={colFilters.statoPren}
                  open={openFilter === 'statoPren'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'statoPren' ? null : 'statoPren')}
                  onToggle={(v) => toggleColFilter('statoPren', v)}
                  onSelectAll={(s) => setAllColFilter('statoPren', STATI_ALL, s)}
                />
              </th>
              <th className="arrivi-partenze__th-nowrap">Data opz. <i className="fa-solid fa-arrow-up arrivi-partenze__sort-ico" /></th>
            </tr>
          </thead>
          <tbody>
            {arrivi.length === 0 ? (
              <tr><td colSpan={14} className="sib-empty">Nessun arrivo per i criteri selezionati.</td></tr>
            ) : arriviPage.map((r) => (
              <tr key={r.id}>
                <td><Tooltip text="Check in prenotazione"><button type="button" className="arrivi-partenze__pren-badge" onClick={() => setCheckIn(r)}><i className="fa-light fa-id-card" /> {r.prenotazioneNum}</button></Tooltip></td>
                <td className="arrivi-partenze__td-center">{r.camera}</td>
                <td>{r.nominativo}</td>
                <td className="arrivi-partenze__td-center">
                  {ROOMING_DONE.has(r.prenotazioneNum) ? (
                    <Tooltip text="Rooming list comunicata"><i className="fa-solid fa-envelope-circle-check arrivi-partenze__rooming arrivi-partenze__rooming--ok" aria-hidden="true" /></Tooltip>
                  ) : (
                    <Tooltip text="Rooming list non comunicata"><i className="fa-light fa-envelope arrivi-partenze__rooming arrivi-partenze__rooming--ko" aria-hidden="true" /></Tooltip>
                  )}
                </td>
                <td className="arrivi-partenze__td-center arrivi-partenze__ospiti">
                  <span className="arrivi-partenze__osp" title="Adulti"><i className="fa-light fa-people-simple" /> {r.ospitiTot.adulti}</span>
                  <span className="arrivi-partenze__osp" title="Bambini"><i className="fa-light fa-child" /> {r.ospitiTot.bambini}</span>
                  <span className="arrivi-partenze__osp" title="Infanti"><i className="fa-light fa-baby-carriage" /> {r.ospitiTot.infanti}</span>
                </td>
                <td className="arrivi-partenze__td-center arrivi-partenze__nowrap">
                  <Tooltip text={`${r.arrivo} → ${r.partenza}`}><span>{r.arrivo.slice(0, 5)} → {r.partenza.slice(0, 5)}</span></Tooltip>
                </td>
                <td className="arrivi-partenze__td-center"><Tooltip text={r.arrangiamento}><i className={`fa-light fa-${r.arrangiamentoIcon}`} aria-hidden="true" /></Tooltip></td>
                <td className={r.agenzia === '-' ? 'sib-cell--muted' : ''}>{r.agenzia}</td>
                <td className="arrivi-partenze__td-center"><Tooltip text={r.tipoPren}><i className={`fa-light fa-${r.tipoPren?.toLowerCase().includes('gruppo') ? 'users' : 'user'}`} aria-hidden="true" /></Tooltip></td>
                <td className="arrivi-partenze__td-right arrivi-partenze__nowrap">{fmtCurrency(r.importo)}</td>
                <td className="arrivi-partenze__td-center">
                  <Tooltip text={`Check-in: ${r.azione}`}>
                    <button type="button" className={`sib-btn sib-btn--icon arrivi-partenze__checkin arrivi-partenze__checkin--${AZIONE_ICON[r.azione].cls}`} aria-label={`Check-in: ${r.azione}`} onClick={() => setCheckIn(r)}>
                      <i className={`fa-solid ${AZIONE_ICON[r.azione].icon}`} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </td>
                <td className="arrivi-partenze__td-center">{r.vip ? <i className="fa-solid fa-star arrivi-partenze__vip" /> : ''}</td>
                <td><span className={`arrivi-partenze__stato arrivi-partenze__stato--${r.statoPren.toLowerCase()}`}>{r.statoPren}</span></td>
                <td className="sib-cell--muted arrivi-partenze__nowrap">{r.dataOpzione ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination className="arrivi-partenze__pager" page={arrPage} totalPages={arrTotalPages} onPageChange={setPageArr} />

      </>
      )}

      {tab === 'partenze' && (
      <>
      <div className="arrivi-partenze__toolbar">
        <div className="arrivi-partenze__field arrivi-partenze__field--search">
          <label className="arrivi-partenze__label" htmlFor="ap-search-part">Cerca</label>
          <div className="arrivi-partenze__search-wrap">
            <input
              id="ap-search-part"
              type="search"
              className="sib-input arrivi-partenze__search-input"
              placeholder="Prenotazione, ospite, camera…"
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass arrivi-partenze__search-icon" />
          </div>
        </div>

        <div className="arrivi-partenze__field">
          <label className="arrivi-partenze__label" htmlFor="ap-strutture-part">Strutture</label>
          <select
            id="ap-strutture-part"
            className="sib-select arrivi-partenze__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="arrivi-partenze__field arrivi-partenze__field--date">
          <label className="arrivi-partenze__label" htmlFor="ap-date-range-part">Data</label>
          <button
            id="ap-date-range-part"
            type="button"
            className="arrivi-partenze__date-range"
            onClick={() => setDateRangeOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={dateRangeOpen}
          >
            <span className="arrivi-partenze__date-range-label">{dateRangeLabel}</span>
            <i className="fa-light fa-calendar arrivi-partenze__date-icon" aria-hidden="true" />
          </button>

          {dateRangeOpen && (
            <>
              <div className="arrivi-partenze__date-overlay" onClick={() => setDateRangeOpen(false)} />
              <div className="arrivi-partenze__date-popover" role="dialog" aria-label="Seleziona intervallo date" onClick={(e) => e.stopPropagation()}>
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  pagedNavigation
                  weekStartsOn={1}
                  locale={it}
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  defaultMonth={selectedRange?.from ?? new Date()}
                />
              </div>
            </>
          )}
        </div>

        {/* Azioni rapide (icona) — come "In arrivo" */}
        <div className="arrivi-partenze__toolbar-icons">
          <Tooltip text="Check-in libero">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Check-in libero" onClick={() => setCheckinOpen(true)}>
              <i className="fa-light fa-calendar-clock" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Planner operativo">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Planner operativo" onClick={() => navigate('planner')}>
              <i className="fa-light fa-building" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Ospiti in casa">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Ospiti in casa" onClick={() => navigate('ospiti-in-casa')}>
              <i className="fa-light fa-house" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

        <div className="arrivi-partenze__stats">
          <span className="arrivi-partenze__stat"><i className="fa-light fa-bed-front" aria-hidden="true" /> Camere: <strong>{totPartCamere}</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-users" aria-hidden="true" /> Gruppi: <strong>{partPctGruppi}%</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-user-check" aria-hidden="true" /> Individuali: <strong>{partPctIndividuali}%</strong></span>
        </div>

        <div className="arrivi-partenze__toolbar-right">
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setCheckout({ multi: true })}>
            <i className="fa-light fa-bed-front" aria-hidden="true" /> Checkout camere
          </button>
          <div className="arrivi-partenze__toolbar-icons">
            <Tooltip text="Esporta in PDF"><button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in PDF" onClick={exportPartPdf}><i className="fa-light fa-file-pdf" aria-hidden="true" /></button></Tooltip>
            <Tooltip text="Esporta in Excel"><button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel" onClick={exportPartXls}><i className="fa-light fa-file-excel" aria-hidden="true" /></button></Tooltip>
          </div>
        </div>
      </div>

      <div className="sib-table-wrap arrivi-partenze__scroll">
        <table className="sib-table arrivi-partenze__table" ref={partTableRef}>
          <thead>
            <tr>
              <th>Prenotazione n°</th>
              <th className="arrivi-partenze__th-center">Camera</th>
              <th>Ospite</th>
              <th className="arrivi-partenze__th-center">
                <ColFilterHeader label="Fascia età" popupTitle="Tutti" options={fasceDistinct}
                  selected={partFilters.fasciaEta} open={openPartFilter === 'fasciaEta'}
                  onToggleOpen={() => setOpenPartFilter(openPartFilter === 'fasciaEta' ? null : 'fasciaEta')}
                  onToggle={(v) => togglePartFilter('fasciaEta', v)} onSelectAll={(s) => setAllPartFilter('fasciaEta', fasceDistinct, s)} />
              </th>
              <th className="arrivi-partenze__th-center">
                <Tooltip text={partSort === 'prossima' ? 'Partenza più prossima — clic per più lontana' : partSort === 'lontana' ? 'Partenza più lontana — clic per rimuovere' : 'Ordina per data di partenza'}>
                  <button type="button" className={`arrivi-partenze__sortbtn ${partSort ? 'is-on' : ''}`} onClick={cyclePartSort}>
                    Periodo
                    <i className={`fa-solid ${partSort === 'prossima' ? 'fa-arrow-down-short-wide' : partSort === 'lontana' ? 'fa-arrow-up-wide-short' : 'fa-arrow-up-arrow-down'} arrivi-partenze__sort-ico`} aria-hidden="true" />
                  </button>
                </Tooltip>
              </th>
              <th className="arrivi-partenze__th-center">
                <ColFilterHeader label="Arrangiamento" popupTitle="Tutti" options={arrPartDistinct}
                  selected={partFilters.arrangiamento} open={openPartFilter === 'arrangiamento'}
                  onToggleOpen={() => setOpenPartFilter(openPartFilter === 'arrangiamento' ? null : 'arrangiamento')}
                  onToggle={(v) => togglePartFilter('arrangiamento', v)} onSelectAll={(s) => setAllPartFilter('arrangiamento', arrPartDistinct, s)} />
              </th>
              <th>
                <ColFilterHeader label="Canale" popupTitle="Tutti" options={canaliDistinct}
                  selected={partFilters.canale} open={openPartFilter === 'canale'}
                  onToggleOpen={() => setOpenPartFilter(openPartFilter === 'canale' ? null : 'canale')}
                  onToggle={(v) => togglePartFilter('canale', v)} onSelectAll={(s) => setAllPartFilter('canale', canaliDistinct, s)} />
              </th>
              <th className="arrivi-partenze__th-center">
                <ColFilterHeader label="Tipo" popupTitle="Tutti" options={tipiPartDistinct}
                  selected={partFilters.tipoPrenotazione} open={openPartFilter === 'tipoPrenotazione'}
                  onToggleOpen={() => setOpenPartFilter(openPartFilter === 'tipoPrenotazione' ? null : 'tipoPrenotazione')}
                  onToggle={(v) => togglePartFilter('tipoPrenotazione', v)} onSelectAll={(s) => setAllPartFilter('tipoPrenotazione', tipiPartDistinct, s)} />
              </th>
              <th className="arrivi-partenze__th-right">Residuo</th>
              <th className="arrivi-partenze__th-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {partenze.length === 0 ? (
              <tr><td colSpan={10} className="sib-empty">Nessuna partenza per i criteri selezionati.</td></tr>
            ) : partenzePage.map((p) => {
              const fe = fasciaEtaInfo(p.fasciaEta)
              const arr = arrangiamentoInfo(p.arrangiamento)
              return (
              <tr key={p.id}>
                <td><span className="arrivi-partenze__pren-badge arrivi-partenze__pren-badge--static"><i className="fa-light fa-id-card" /> {p.prenotazioneNum}</span></td>
                <td className="arrivi-partenze__td-center">{p.camera}</td>
                <td>{p.ospite}</td>
                <td className="arrivi-partenze__td-center"><Tooltip text={fe.label}><i className={`fa-light ${fe.icon} arrivi-partenze__fascia-ico`} aria-hidden="true" /></Tooltip></td>
                <td className="arrivi-partenze__td-center arrivi-partenze__nowrap"><Tooltip text={`${p.arrivo} → ${p.partenza}`}><span>{p.arrivo.slice(0, 5)} → {p.partenza.slice(0, 5)}</span></Tooltip></td>
                <td className="arrivi-partenze__td-center"><Tooltip text={arr.label}><i className={`fa-light ${arr.icon}`} aria-hidden="true" /></Tooltip></td>
                <td>{p.canale}</td>
                <td className="arrivi-partenze__td-center"><Tooltip text={p.tipoPrenotazione}><i className={`fa-light ${tipoPrenIcon(p.tipoPrenotazione)}`} aria-hidden="true" /></Tooltip></td>
                <td className="arrivi-partenze__td-right arrivi-partenze__nowrap">{fmtCurrency(p.residuo)}</td>
                <td className="arrivi-partenze__td-center">
                  <span className="arrivi-partenze__row-actions">
                    <Tooltip text="Conti camera"><button type="button" className="sib-btn sib-btn--icon" aria-label="Conti camera" onClick={() => navigate('conti-camera')}><i className="fa-light fa-receipt" aria-hidden="true" /></button></Tooltip>
                    <Tooltip text="Check out camera"><button type="button" className="sib-btn sib-btn--icon" aria-label="Check out camera" onClick={() => setCheckout({ multi: false, camera: p.camera })}><i className="fa-light fa-door-open" aria-hidden="true" /></button></Tooltip>
                    <Tooltip text="Chiudi conto"><button type="button" className="sib-btn sib-btn--icon" aria-label="Chiudi conto" onClick={() => navigate('emissione-documenti')}><i className="fa-light fa-coins" aria-hidden="true" /></button></Tooltip>
                  </span>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination className="arrivi-partenze__pager" page={partPage} totalPages={partTotalPages} onPageChange={setPagePart} />
      </>
      )}

      <Modal open={!!checkout} onClose={() => setCheckout(null)} title="Conferma check-out" size="sm">
        <div className="arrivi-partenze__confirm">
          <p className="arrivi-partenze__confirm-text">
            {checkout?.multi
              ? <>Sei sicuro di voler effettuare il <strong>check-out delle camere selezionate</strong>? L'operazione è irreversibile.</>
              : <>Sei sicuro di voler effettuare il <strong>check-out della camera {checkout?.camera}</strong>? L'operazione è irreversibile.</>}
          </p>
          <div className="arrivi-partenze__confirm-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setCheckout(null)}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--danger" onClick={() => setCheckout(null)}>Esegui check-out</button>
          </div>
        </div>
      </Modal>

      <CheckinLiberoModal open={checkinOpen} onClose={() => setCheckinOpen(false)} />
    </div>
  )
}

// ─── CHECK IN (dettaglio prenotazione in arrivo) ────────────────────────────────

// Icona + descrizione dell'arrangiamento (es. B&B → caffè "Colazione inclusa").
function arrangiamentoInfo(a: string): { icon: string; label: string } {
  const x = a.toLowerCase()
  if (x.includes('room only') || x.includes('pernottamento')) return { icon: 'fa-bed', label: 'Room only' }
  return { icon: 'fa-mug-saucer', label: 'Bed & Breakfast' }
}

function fasciaEtaInfo(f: string): { icon: string; label: string } {
  const x = (f || '').toLowerCase()
  if (x.includes('bambino')) return { icon: 'fa-child', label: 'Bambino' }
  if (x.includes('infante')) return { icon: 'fa-baby-carriage', label: 'Infante' }
  if (x.includes('adulto')) return { icon: 'fa-person', label: 'Adulto' }
  return { icon: 'fa-users', label: 'Gruppo' }
}

const tipoPrenIcon = (t: string) => (t?.toLowerCase().includes('gruppo') ? 'fa-users' : 'fa-user')

interface AnagForm {
  nome: string; cognome: string; sesso: string; nascita: string
  paeseNascita: string; tipologia: string; paeseResidenza: string
  documento: string; numeroDoc: string; scadeIl: string; emessoDa: string
  note: string; vip: boolean; esenzione: boolean
}
const EMPTY_ANAG: AnagForm = {
  nome: '', cognome: '', sesso: '', nascita: '', paeseNascita: '', tipologia: 'Ospite singolo',
  paeseResidenza: '', documento: '', numeroDoc: '', scadeIl: '', emessoDa: '', note: '', vip: false, esenzione: false,
}
// Anagrafica fittizia precompilata per ospite (per la modalità modifica).
function mockAnag(arrivo: Arrivo, i: number): AnagForm {
  const parts = arrivo.nominativo.trim().split(/\s+/)
  const cognome = parts[0] ?? ''
  const nome = parts.slice(1).join(' ')
  return {
    nome: i === 0 && nome ? nome : `Ospite ${i + 1}`,
    cognome: cognome || 'Rossi',
    sesso: 'Maschio',
    nascita: '1988-04-12',
    paeseNascita: 'Italia',
    tipologia: 'Ospite singolo',
    paeseResidenza: 'Italia',
    documento: "Carta d'identità",
    numeroDoc: `CA${1000000 + i}`,
    scadeIl: '2030-09-30',
    emessoDa: 'Comune di Roma',
    note: '',
    vip: arrivo.vip,
    esenzione: false,
  }
}

function roomGuests(a: Arrivo): string[] {
  const t = a.ospitiTot
  return [
    ...Array.from({ length: t.adulti },  () => 'Adulto'),
    ...Array.from({ length: t.bambini }, () => 'Bambino'),
    ...Array.from({ length: t.infanti }, () => 'Infante'),
  ]
}

function CheckInView({ gruppo, onBack }: { gruppo: Arrivo[]; onBack: () => void }) {
  const booking = gruppo[0]
  const parseIt = (s: string) => { const [d, m, y] = s.split('/').map(Number); return new Date(y, m - 1, d) }
  const giorni = Math.max(1, Math.round((parseIt(booking.partenza).getTime() - parseIt(booking.arrivo).getTime()) / 86400000))
  const totCamere = gruppo.length
  const totOspiti = gruppo.reduce((s, a) => s + a.ospitiTot.adulti + a.ospitiTot.bambini + a.ospitiTot.infanti, 0)
  const totImporto = gruppo.reduce((s, a) => s + a.importo, 0)

  // camere espandibili (default: tutte aperte)
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(gruppo.map(a => a.id)))
  const toggleRoom = (id: number) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  // serratura Hao booking e registrazione: chiavi composite `${roomId}:${i}`
  const [hao, setHao] = useState<Set<string>>(new Set())
  const toggleHao = (roomId: number, i: number) => setHao(prev => { const k = `${roomId}:${i}`; const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s })
  const [registrato, setRegistrato] = useState<Set<string>>(new Set())

  const [guestData, setGuestData] = useState<Record<number, AnagForm[]>>(() => {
    const o: Record<number, AnagForm[]> = {}
    gruppo.forEach(a => { o[a.id] = roomGuests(a).map((_g, i) => mockAnag(a, i)) })
    return o
  })
  const [anag, setAnag] = useState<{ open: boolean; mode: 'new' | 'edit'; roomId: number; index: number; key: number }>({ open: false, mode: 'new', roomId: -1, index: -1, key: 0 })
  const openNewAnag = (roomId: number) => setAnag(a => ({ open: true, mode: 'new', roomId, index: -1, key: a.key + 1 }))
  const openEditAnag = (roomId: number, i: number) => setAnag(a => ({ open: true, mode: 'edit', roomId, index: i, key: a.key + 1 }))
  const closeAnag = () => setAnag(a => ({ ...a, open: false }))
  const saveAnag = (form: AnagForm) => {
    if (anag.mode === 'edit' && anag.index >= 0) {
      setGuestData(prev => ({ ...prev, [anag.roomId]: prev[anag.roomId].map((x, j) => (j === anag.index ? form : x)) }))
      setRegistrato(prev => new Set(prev).add(`${anag.roomId}:${anag.index}`))
    }
    closeAnag()
  }

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="ap-cki__cell">
      <span className="ap-cki__cell-label">{label}</span>
      <span className="ap-cki__cell-value">{value || '—'}</span>
    </div>
  )

  return (
    <div className="ap-cki">
      <BtnBack onClick={onBack} />
      <PageHeader title="Check In" subtitle="Registrazione degli ospiti e completamento del soggiorno" />

      <h2 className="ap-cki__section">Dettaglio</h2>
      <div className="ap-cki__panel">
        <div className="ap-cki__grid">
          <Field label="N. Prenotazione" value={booking.prenotazioneNum} />
          <Field label="Nominativo" value={booking.nominativo} />
          <Field label="Data di arrivo" value={booking.arrivo} />
          <Field label="Data di partenza" value={booking.partenza} />
          <Field label="Giorni" value={giorni} />
          <Field label="Ospiti" value={totOspiti} />
          <Field label="Agenzia" value={booking.agenzia === 'Nessuna' ? <em className="ap-cki__muted">Agenzia non presente</em> : booking.agenzia} />
          <Field label="Credit" value="" />
          <Field label="Struttura" value="Hotel Tutorial" />
        </div>
      </div>

      <div className="ap-cki__panel">
        <div className="ap-cki__grid">
          <Field label="Arrangiamento" value={booking.arrangiamento} />
          <Field label="N camere" value={totCamere} />
          <Field label="Totale" value={fmtCurrency(totImporto)} />
          <Field label="Di cui camere" value={fmtCurrency(totImporto)} />
          <Field label="Di cui servizi" value={fmtCurrency(0)} />
          <Field label="Di cui tasse di soggiorno" value={fmtCurrency(0)} />
          <Field label="Pagato" value={fmtCurrency(0)} />
          <Field label="Da pagare" value={fmtCurrency(totImporto)} />
          <Field label="Note" value="" />
        </div>
      </div>

      <div className="ap-cki__panel ap-cki__panel--rooms">
        <div className="sib-table-wrap">
          <table className="sib-table ap-cki__rooms">
            <thead>
              <tr>
                <th className="ap-cki__exp-th" aria-hidden="true" />
                <th>Tipologia di camera</th>
                <th className="ap-cki__c">Camera N°</th>
                <th className="ap-cki__c">Arrivo</th>
                <th className="ap-cki__c">Partenza</th>
                <th className="ap-cki__c">Arrangiamento</th>
                <th className="ap-cki__c">Sistemazione</th>
                <th className="ap-cki__c">Importo</th>
                <th className="ap-cki__c">Ospiti</th>
                <th className="ap-cki__c">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {gruppo.map((room) => {
                const guests = roomGuests(room)
                const open = expanded.has(room.id)
                const arrInfo = arrangiamentoInfo(room.arrangiamento)
                return (
                  <React.Fragment key={room.id}>
                    <tr className={`ap-cki__room-row ${open ? 'is-open' : ''}`} onClick={() => toggleRoom(room.id)}>
                      <td className="ap-cki__exp">
                        <button type="button" className="ap-cki__exp-btn" aria-expanded={open} aria-label="Mostra ospiti" onClick={(e) => { e.stopPropagation(); toggleRoom(room.id) }}>
                          <i className={`fa-solid fa-chevron-${open ? 'down' : 'right'}`} aria-hidden="true" />
                        </button>
                      </td>
                      <td><span className="ap-cki__room-tipo"><i className="fa-light fa-bed-front" aria-hidden="true" /> Standard</span></td>
                      <td className="ap-cki__c">{room.camera}</td>
                      <td className="ap-cki__c">{room.arrivo}</td>
                      <td className="ap-cki__c">{room.partenza}</td>
                      <td className="ap-cki__c"><Tooltip text={arrInfo.label}><i className={`fa-light ${arrInfo.icon}`} aria-hidden="true" /></Tooltip></td>
                      <td className="ap-cki__c">Doppia Classic</td>
                      <td className="ap-cki__c">{fmtCurrency(room.importo)}</td>
                      <td className="ap-cki__c"><span className="ap-cki__ospiti-pill"><i className="fa-light fa-user" aria-hidden="true" /> {guests.length}</span></td>
                      <td className="ap-cki__c">
                        <button type="button" className="sib-btn sib-btn--primary sib-btn--sm" onClick={(e) => { e.stopPropagation(); openNewAnag(room.id) }}><i className="fa-light fa-user-plus" /> Aggiungere anagrafica</button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="ap-cki__detail-row">
                        <td className="ap-cki__detail-cell" colSpan={10}>
                          <div className="ap-cki__detail">
                            <div className="ap-cki__detail-head">
                              <i className="fa-light fa-users" aria-hidden="true" />
                              <span>Ospiti in camera</span>
                              <strong>{room.camera}</strong>
                              <span className="ap-cki__detail-count">{guests.length}</span>
                            </div>
                            <table className="sib-table ap-cki__guests">
                              <thead>
                                <tr>
                                  <th>Tipologia ospite</th>
                                  <th className="ap-cki__c">Arrivo differito</th>
                                  <th className="ap-cki__c">Registrazione</th>
                                  <th className="ap-cki__c">Hao booking</th>
                                  <th className="ap-cki__c">Azioni</th>
                                </tr>
                              </thead>
                              <tbody>
                                {guests.map((g, i) => {
                                  const k = `${room.id}:${i}`
                                  return (
                                    <tr key={i}>
                                      <td><span className="ap-cki__badge">{g}</span></td>
                                      <td className="ap-cki__c">—</td>
                                      <td className="ap-cki__c">
                                        {registrato.has(k) ? (
                                          <span className="ap-cki__reg ap-cki__reg--ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Completata</span>
                                        ) : (
                                          <Tooltip text="Completa l'anagrafica">
                                            <span className="ap-cki__reg ap-cki__reg--ko"><i className="fa-solid fa-circle-xmark" aria-hidden="true" /> Da completare</span>
                                          </Tooltip>
                                        )}
                                      </td>
                                      <td className="ap-cki__c">
                                        <Tooltip text={hao.has(k) ? 'Disattiva Hao booking' : 'Attiva Hao booking'}>
                                          <label className="ap-cki__hao-check">
                                            <input type="checkbox" className="sib-checkbox" checked={hao.has(k)} onChange={() => toggleHao(room.id, i)} aria-label="Hao booking" />
                                            <i className={`fa-${hao.has(k) ? 'solid' : 'light'} fa-grid-2 ap-cki__hao-key${hao.has(k) ? ' is-on' : ''}`} aria-hidden="true" />
                                          </label>
                                        </Tooltip>
                                      </td>
                                      <td className="ap-cki__c">
                                        <Tooltip text="Modifica anagrafica"><button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica anagrafica" onClick={() => openEditAnag(room.id, i)}><i className="fa-light fa-pen" /></button></Tooltip>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {anag.open && (
        <AnagraficaModal
          key={anag.key}
          mode={anag.mode}
          initial={anag.mode === 'edit' && anag.index >= 0 ? guestData[anag.roomId]?.[anag.index] : undefined}
          onClose={closeAnag}
          onSave={saveAnag}
        />
      )}
    </div>
  )
}

// ─── INSERISCI ANAGRAFICA (modale, step 1/2) ─────────────────────────────────────

const PAESI = ['Italia', 'Germania', 'Francia', 'Spagna', 'Regno Unito', 'Stati Uniti', 'Svizzera', 'Giappone']
const DOCUMENTI = ["Carta d'identità", 'Passaporto', 'Patente']
const TIPOLOGIE_OSPITE = ['Ospite singolo', 'Capogruppo', 'Componente gruppo']
const SESSI = ['Maschio', 'Femmina', 'Altro']

function AnagraficaModal({ mode, initial, onClose, onSave }: { mode: 'new' | 'edit'; initial?: AnagForm; onClose: () => void; onSave: (f: AnagForm) => void }) {
  const [f, setF] = useState<AnagForm>(initial ?? EMPTY_ANAG)
  const set = (k: keyof AnagForm, v: string | boolean) => setF(p => ({ ...p, [k]: v } as AnagForm))

  // indicatore di obbligatorietà: bordo rosso + icona finché il campo è vuoto
  const inv = (v: string) => !v.trim()

  const Req = ({ show }: { show: boolean }) => show
    ? <i className="fa-solid fa-circle-exclamation ap-anag__req" aria-hidden="true" />
    : null

  return (
    <div className="ap-anag__backdrop" onClick={onClose}>
      <div className="ap-anag" role="dialog" aria-label="Inserisci anagrafica" onClick={(e) => e.stopPropagation()}>
        <div className="ap-anag__head">
          <h3 className="ap-anag__title">{mode === 'edit' ? 'Modifica anagrafica' : 'Inserisci anagrafica'} <span className="ap-anag__step">(1/2)</span></h3>
          <button type="button" className="ap-anag__close" onClick={onClose} aria-label="Chiudi"><i className="fa-light fa-xmark" /></button>
        </div>

        <div className="ap-anag__row">
          <div className="ap-anag__field">
            <label className="ap-anag__label">Nome*</label>
            <div className="ap-anag__control">
              <input className={`sib-input ${inv(f.nome) ? 'is-invalid' : ''}`} placeholder="inserire nome" value={f.nome} onChange={e => set('nome', e.target.value)} />
              <Req show={inv(f.nome)} />
            </div>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Cognome*</label>
            <div className="ap-anag__control">
              <input className={`sib-input ${inv(f.cognome) ? 'is-invalid' : ''}`} placeholder="inserire cognome" value={f.cognome} onChange={e => set('cognome', e.target.value)} />
              <Req show={inv(f.cognome)} />
            </div>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Sesso*</label>
            <select className={`sib-select ${inv(f.sesso) ? 'is-invalid' : ''}`} value={f.sesso} onChange={e => set('sesso', e.target.value)}>
              <option value="">Seleziona</option>
              {SESSI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Data di Nascita*</label>
            <div className="ap-anag__control">
              <input type="date" className={`sib-input ${inv(f.nascita) ? 'is-invalid' : ''}`} value={f.nascita} onChange={e => set('nascita', e.target.value)} />
              <Req show={inv(f.nascita)} />
            </div>
          </div>
        </div>

        <div className="ap-anag__row">
          <div className="ap-anag__field">
            <label className="ap-anag__label">Paese di nascita*</label>
            <select className={`sib-select ${inv(f.paeseNascita) ? 'is-invalid' : ''}`} value={f.paeseNascita} onChange={e => set('paeseNascita', e.target.value)}>
              <option value="">Seleziona…</option>
              {PAESI.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Tipologia ospite*</label>
            <select className="sib-select" value={f.tipologia} onChange={e => set('tipologia', e.target.value)}>
              {TIPOLOGIE_OSPITE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="ap-anag__row">
          <div className="ap-anag__field">
            <label className="ap-anag__label">Paese di residenza*</label>
            <select className={`sib-select ${inv(f.paeseResidenza) ? 'is-invalid' : ''}`} value={f.paeseResidenza} onChange={e => set('paeseResidenza', e.target.value)}>
              <option value="">Seleziona…</option>
              {PAESI.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="ap-anag__row">
          <div className="ap-anag__field">
            <label className="ap-anag__label">Documento identità*</label>
            <select className={`sib-select ${inv(f.documento) ? 'is-invalid' : ''}`} value={f.documento} onChange={e => set('documento', e.target.value)}>
              <option value="">Seleziona…</option>
              {DOCUMENTI.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Numero di documento*</label>
            <div className="ap-anag__control">
              <input className={`sib-input ${inv(f.numeroDoc) ? 'is-invalid' : ''}`} placeholder="inserire numero di documento" value={f.numeroDoc} onChange={e => set('numeroDoc', e.target.value)} />
              <Req show={inv(f.numeroDoc)} />
            </div>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Scade il*</label>
            <div className="ap-anag__control">
              <input type="date" className={`sib-input ${inv(f.scadeIl) ? 'is-invalid' : ''}`} value={f.scadeIl} onChange={e => set('scadeIl', e.target.value)} />
              <Req show={inv(f.scadeIl)} />
            </div>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Emesso da*</label>
            <div className="ap-anag__control">
              <input className={`sib-input ${inv(f.emessoDa) ? 'is-invalid' : ''}`} placeholder="inserire ente" value={f.emessoDa} onChange={e => set('emessoDa', e.target.value)} />
              <Req show={inv(f.emessoDa)} />
            </div>
          </div>
        </div>

        <div className="ap-anag__row">
          <div className="ap-anag__field">
            <label className="ap-anag__label">Carica documento</label>
            <label className="ap-anag__file"><i className="fa-light fa-paperclip" /> Scegli file<input type="file" hidden /></label>
          </div>
          <div className="ap-anag__field">
            <label className="ap-anag__label">Acquisisci documento</label>
            <button type="button" className="ap-anag__file"><i className="fa-light fa-camera" /> Acquisisci</button>
          </div>
          <div className="ap-anag__field ap-anag__field--vip">
            <label className="ap-anag__check">
              <input type="checkbox" className="sib-checkbox" checked={f.vip} onChange={e => set('vip', e.target.checked)} /> VIP
            </label>
          </div>
        </div>

        <div className="ap-anag__field ap-anag__field--note">
          <label className="ap-anag__label">Note</label>
          <input className="sib-input" placeholder="Inserire note aggiuntive" value={f.note} onChange={e => set('note', e.target.value)} />
        </div>

        <label className="ap-anag__check ap-anag__check--esenzione">
          <input type="checkbox" className="sib-checkbox" checked={f.esenzione} onChange={e => set('esenzione', e.target.checked)} /> Esenzione tassa di sogg.
        </label>

        <div className="ap-anag__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => onSave(f)}>Salva</button>
        </div>
      </div>
    </div>
  )
}

// ─── CHECK-IN LIBERO (modale: registrazione manuale arrivo) ──────────────────────

const ARRANGIAMENTI_CI = [
  { label: 'Room only',       icon: 'fa-bed' },
  { label: 'Bed & Breakfast', icon: 'fa-mug-saucer' },
]
const CAMERE_CI = [
  { n: '011', tipo: 'Quadrupla', capienza: 6, prezzo: 0.00 },
  { n: '012', tipo: 'Singola',   capienza: 2, prezzo: -6.47 },
  { n: '013', tipo: 'Singola',   capienza: 2, prezzo: -6.47 },
  { n: '014', tipo: 'Singola',   capienza: 2, prezzo: -6.47 },
  { n: '015', tipo: 'Doppia',    capienza: 3, prezzo: 84.09 },
  { n: '016', tipo: 'Doppia',    capienza: 3, prezzo: 84.09 },
  { n: '017', tipo: 'Tripla',    capienza: 4, prezzo: 120.00 },
]

function CheckinLiberoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [da, setDa] = useState(todayISO())
  const [a, setA]   = useState(todayISO())
  const [nome, setNome] = useState('')
  const [arr, setArr] = useState(0)
  const [note, setNote] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [persone, setPersone] = useState<Record<string, number>>({})

  if (!open) return null

  const toggle = (n: string) => setSel(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s })
  const setPers = (n: string, v: number, max: number) => setPersone(prev => ({ ...prev, [n]: Math.min(max, Math.max(1, v)) }))
  const pers = (n: string) => persone[n] ?? 1

  return (
    <div className="ap-ci__backdrop" onClick={onClose}>
      <div className="ap-ci" role="dialog" aria-label="Check-in libero" onClick={(e) => e.stopPropagation()}>
        <div className="ap-ci__head">
          <div>
            <h3 className="ap-ci__title">Check-in libero</h3>
            <p className="ap-ci__sub">Registrazione manuale di un arrivo</p>
          </div>
          <button type="button" className="ap-ci__close" onClick={onClose} aria-label="Chiudi">
            <i className="fa-light fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="ap-ci__form">
          <DateRangeField
            label="Date *" nameFrom="ci-da" nameTo="ci-a"
            valueFrom={da} valueTo={a}
            onChange={(f, t) => { setDa(f ? f.toISOString().slice(0, 10) : ''); setA(t ? t.toISOString().slice(0, 10) : '') }}
            className="ap-ci__date"
          />
          <div className="ap-ci__field">
            <label className="ap-ci__label">Nome</label>
            <input className="sib-input" placeholder="inserire nominativo" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="ap-ci__field">
            <label className="ap-ci__label">Arrangiamento</label>
            <div className="ap-ci__arr">
              {ARRANGIAMENTI_CI.map((o, i) => (
                <button key={o.label} type="button" role="radio" aria-checked={arr === i} title={o.label}
                  className={`ap-ci__arr-opt ${arr === i ? 'is-on' : ''}`} onClick={() => setArr(i)}>
                  <i className={`fa-light ${o.icon}`} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ap-ci__field ap-ci__field--note">
          <label className="ap-ci__label">Note</label>
          <input className="sib-input" placeholder="Inserire note aggiuntive" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="ap-ci__rooms">
          <table className="sib-table">
            <thead>
              <tr>
                <th>Camera</th>
                <th className="ap-ci__th-c">Capienza</th>
                <th className="ap-ci__th-c">Prezzo per il periodo</th>
                <th className="ap-ci__th-c">Numero persone</th>
              </tr>
            </thead>
            <tbody>
              {CAMERE_CI.map((c) => (
                <tr key={c.n} className={sel.has(c.n) ? 'is-selected' : ''} onClick={() => toggle(c.n)}>
                  <td>
                    <span className="ap-ci__room">
                      <i className={`fa-light ${sel.has(c.n) ? 'fa-bed-front' : 'fa-bed'} ap-ci__room-ico`} aria-hidden="true" />
                      <strong>{c.n}</strong> {c.tipo}
                    </span>
                  </td>
                  <td className="ap-ci__th-c">{c.capienza}</td>
                  <td className="ap-ci__th-c">{c.prezzo.toFixed(2).replace('.', ',')} €</td>
                  <td className="ap-ci__th-c" onClick={(e) => e.stopPropagation()}>
                    <div className="ap-ci__stepper">
                      <input type="number" className="sib-input ap-ci__stepper-input" min={1} max={c.capienza}
                        value={pers(c.n)} onChange={(e) => setPers(c.n, parseInt(e.target.value, 10) || 1, c.capienza)} />
                      <div className="ap-ci__stepper-btns">
                        <button type="button" onClick={() => setPers(c.n, pers(c.n) + 1, c.capienza)} aria-label="Aumenta"><i className="fa-solid fa-chevron-up" /></button>
                        <button type="button" onClick={() => setPers(c.n, pers(c.n) - 1, c.capienza)} aria-label="Diminuisci"><i className="fa-solid fa-chevron-down" /></button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="ap-ci__hint">* Selezionare almeno una camera per effettuare il check-in libero</p>

        <div className="ap-ci__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={sel.size === 0} onClick={onClose}>Salva</button>
        </div>
      </div>
    </div>
  )
}

// ─── COL FILTER HEADER ────────────────────────────────────────────────────────

interface ColFilterHeaderProps {
  label: string
  popupTitle: string
  options: string[]
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader(props: ColFilterHeaderProps) {
  const { label, popupTitle, options, selected, open, onToggleOpen, onToggle, onSelectAll } = props
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0

  return (
    <div className="ap-colfilter">
      <span>{label}</span>
      <button
        type="button"
        className={'ap-colfilter__btn' + (hasFilter ? ' ap-colfilter__btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="ap-colfilter__overlay" onClick={onToggleOpen} />
          <div className="ap-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="ap-colfilter__title">{popupTitle}</div>
            <label className="ap-colfilter__option">
              <input
                type="checkbox"
                className="sib-checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="ap-colfilter__option">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
