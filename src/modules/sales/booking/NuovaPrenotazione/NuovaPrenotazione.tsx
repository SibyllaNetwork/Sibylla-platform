import React, { useEffect, useMemo, useRef, useState } from 'react'
import T from '../../../../core/tokens'
import { bookingStore } from '../../../../core/bookingStore'
import PageHead from '../../../../core/components/PageHead'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Ico from '../../../../core/icons/Ico'
import GhostIcon from '../../../../core/icons/GhostIcon'
import ToggleSwitch from '../../../../core/components/ToggleSwitch'
import { Button } from '../../../../core/components'
import FormActions from '../../../../core/components/FormActions'
import Widget from '../../../../core/components/Widget/Widget'
import { InputField, SelectField, DateRangeField, DatePickerField, TextareaField, NumCell } from '../../../../core/components/form'
import { useWidgetLayout } from '../../../../core/hooks/useWidgetLayout'
import { useServiziStore } from '../../../../store/useServiziStore'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import type { Servizio } from '../../../purchasing/Servizi/servizi-types'
import { PIANI_DATA } from '../../../operation/planner/planner.data'
import { withFlag } from '../../../../core/utils/countryFlags'
import {
  useBlocchiFantasmaStore,
  bloccoPerCameraPeriodo,
  type BloccoFantasma,
} from '../../../../store/useBlocchiFantasmaStore'
import './NuovaPrenotazione.sass'

const TODAY        = new Date().toISOString().split('T')[0]
/** Data di oggi + n giorni, in yyyy-MM-dd. */
const traGiorni = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const NAZIONALITA  = ['ITALIA','FRANCIA','GERMANIA','SPAGNA','REGNO UNITO','STATI UNITI']
const ARRANGIAMENTI = ['RO','BB','HB','FB','AI']
const CREDIT        = ['NC','HC','FC','HCT']
const REPARTI      = ['Manutenzione','Pulizie','Reception','Cucina','SPA']
// Strutture del cliente (tab della lista camere nella card Soggiorno gruppo)
const STRUTTURE_GRUPPO = ['Hotel dei Mille','Hotel Luce','Hotel Archimede']
const TIPI_CAMERA  = [
  { v: '53', l: '53 | Doppia classic' },
  { v: '54', l: '54 | Doppia superior' },
  { v: '55', l: '55 | Tripla' },
  { v: '56', l: '56 | Singola' },
]
// Lista camere della struttura (numeri) derivata dai piani del planner
const CAMERE = PIANI_DATA.flatMap(p => p.camere.map(c => c.numero))
// Tipologie camera (per la gestione segmenti)
const TIPOLOGIE_CAMERA = ['Doppia Classic','Doppia Superior','Singola Classic','Tripla Classic','Matrimoniale','Suite']

interface SegmentoRow { id: string; dal: string; al: string; tipo: string; nCamera: string; persone: number; stato: string }
// Parametri della singola camera: nella lista gruppo una riga ne raggruppa
// `quantita`, tutte modificabili una per una dalla modale di dettaglio
interface DettCamera {
  tipo: string; adulti: number; ragazzi: number; bambini: number; infanti: number
  prezzoPersona: number; arrangiamento: string; dataIn: string; dataOut: string
  /** Numero camera assegnato (vuoto = da assegnare) */
  numero: string
  /** Nota di servizio della singola camera (culla, piano alto, allergie…). */
  note: string
}
// I campi quantita/prezzoPersona/arrangiamento/dataIn/dataOut sono usati dalla
// lista camere del tab Gruppo (la lista del tab Individuale ignora le colonne).
// Sulla riga valgono da valori "cumulativi": modificarli aggiorna tutte le
// camere del gruppo; le singole camere possono poi divergere dal dettaglio.
interface CameraRow {
  id: string;
  tipo: string; adulti: number; ragazzi: number; bambini: number; infanti: number; nCamera: string
  quantita: number; prezzoPersona: number; arrangiamento: string; dataIn: string; dataOut: string
  dettagli: DettCamera[]
}
interface NotaReparto { id: string; reparto: string; testo: string }
interface NotaSemplice { id: string; testo: string }
interface OspiteRow { nome: string; cognome: string; dataNascita: string; paese: string; sesso: string; nCamera: string; dataArrivo: string }
interface ExtraAggiunto { id: string; servizio: string; quando: string; quantita: number; intestatario: string; camera: string; importo: number; descrizione: string }
interface PrezzoRow { giorno: string; camera: string; arrangiamento: string; piani: string; promozioni: string; totale: number; listino: number }

const uid = () => Math.random().toString(36).slice(2, 9)
const initRow = (n=''): CameraRow      => ({
  id: uid(),
  tipo: '53', adulti: 2, ragazzi: 0, bambini: 0, infanti: 0, nCamera: n,
  quantita: 1, prezzoPersona: 0, arrangiamento: 'RO', dataIn: '', dataOut: '', dettagli: [],
})
// Riga della lista camere gruppo: eredita periodo e arrangiamento dal soggiorno
const initRowGr = (dal: string, al: string, arr: string): CameraRow =>
  ({ ...initRow(), arrangiamento: arr, dataIn: dal, dataOut: al })

// ── Calcoli della lista camere gruppo ────────────────────────────────────────
const notti = (dal: string, al: string) => {
  if (!dal || !al) return 0
  const d = (new Date(al).getTime() - new Date(dal).getTime()) / 86400000
  return Number.isFinite(d) && d > 0 ? Math.round(d) : 0
}
// Persone della camera: tutte e quattro le categorie, infanti compresi
const persone = (d: DettCamera) => d.adulti + d.ragazzi + d.bambini + d.infanti
// Camere della riga: sempre `quantita`, le mancanti ereditano i valori di riga
const dettCamera = (c: CameraRow): DettCamera => ({
  tipo: c.tipo, adulti: c.adulti, ragazzi: c.ragazzi, bambini: c.bambini, infanti: c.infanti,
  prezzoPersona: c.prezzoPersona, arrangiamento: c.arrangiamento,
  dataIn: c.dataIn, dataOut: c.dataOut, numero: '', note: '',
})
// Le camere non ancora materializzate clonano l'ultima definita (senza numero,
// che è per forza diverso): così il totale della riga resta sempre
// `quantità × valori mostrati` e lo specchietto non può divergere dalla lista
const dettagliDi = (c: CameraRow): DettCamera[] => {
  const n = Math.max(1, c.quantita)
  // Riga appena creata: i totali di persone della riga si distribuiscono
  // sulle sue camere (il resto alle prime)
  if (!c.dettagli.length) {
    const quote = {
      adulti: ripartisci(c.adulti, n), ragazzi: ripartisci(c.ragazzi, n),
      bambini: ripartisci(c.bambini, n), infanti: ripartisci(c.infanti, n),
    }
    return Array.from({ length: n }, (_, k) => ({
      ...dettCamera(c),
      adulti: quote.adulti[k], ragazzi: quote.ragazzi[k],
      bambini: quote.bambini[k], infanti: quote.infanti[k],
    }))
  }
  return Array.from({ length: n },
    (_, k) => c.dettagli[k] ?? { ...c.dettagli[c.dettagli.length - 1], numero: '', note: '' })
}
// Costo della camera: le sue persone per il prezzo a persona del soggiorno
const totaleDett = (d: DettCamera) => persone(d) * d.prezzoPersona
const totaleRigaGr = (c: CameraRow) => dettagliDi(c).reduce((a, d) => a + totaleDett(d), 0)
/** Ripartisce un totale sulle camere della riga: il resto va alle prime. */
const ripartisci = (totale: number, camere: number): number[] => {
  const base = Math.floor(Math.max(0, totale) / Math.max(1, camere))
  const resto = Math.max(0, totale) - base * camere
  return Array.from({ length: camere }, (_, i) => base + (i < resto ? 1 : 0))
}

// Valore comune a tutte le camere della riga (undefined se divergono)
function comune<K extends keyof DettCamera>(c: CameraRow, k: K): DettCamera[K] | undefined {
  const dd = dettagliDi(c)
  return dd.every(d => d[k] === dd[0][k]) ? dd[0][k] : undefined
}

// Le colonne Adulti/Ragazzi/Bambini/Infanti della riga sono il TOTALE della riga
// (di tutte le sue camere), non il valore di una camera: è così che si prende
// una prenotazione di gruppo — «10 camere per 20 adulti e 6 ragazzi».
type CampoPersone = 'adulti' | 'ragazzi' | 'bambini' | 'infanti'

const personeRiga = (c: CameraRow, k: CampoPersone) =>
  dettagliDi(c).reduce((a, d) => a + d[k], 0)
/** Nome della tipologia senza il codice davanti: "53 | Doppia classic" → "Doppia classic". */
const nomeTipo = (v: string) => {
  const l = TIPI_CAMERA.find(t => t.v === v)?.l ?? v
  const i = l.indexOf('|')
  return i < 0 ? l : l.slice(i + 1).trim()
}

const initOsp = (): OspiteRow          => ({ nome: '', cognome: '', dataNascita: '', paese: '', sesso: '', nCamera: '', dataArrivo: '' })
// Data del calendario → yyyy-MM-dd, senza passare per UTC (che sposta il giorno)
const isoDate = (d: Date | null) => d
  ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  : ''

// ── Modifica prenotazione: mapping dalla prenotazione esistente al form ─────────
const isGruppo = (e: any) => !!e && /grupp/i.test(e.segmento || '')
// Sovrascritture comuni dai campi della prenotazione esistente
const editOverridesInd = (e: any) => !e ? {} : {
  dal: e.checkIn || TODAY, al: e.checkOut || TODAY,
  camere: e.camere ?? 1, persone: e.persone ?? 2,
  confermata: e.stato !== 'opzione', opzione: e.stato === 'opzione',
  arrangiamento: e.arrangiamento || 'BB',
  agenzia: e.agenzia || '', cliente: e.cliente || e.nominativo || '',
  notePrenotazione: e.note || '',
}
const editOverridesGr = (e: any) => !e ? {} : {
  dal: e.checkIn || TODAY, al: e.checkOut || TODAY,
  camere: e.camere ?? 1, persone: e.persone ?? 2,
  confermata: e.stato !== 'opzione', opzione: e.stato === 'opzione',
  arrangiamento: e.arrangiamento || 'RO',
  agenzia: e.agenzia || '', nomeGruppo: e.nominativo || '',
  notePrenotazione: e.note || '',
}
const editCamere = (e: any): CameraRow[] =>
  e?.dettaglioCamere?.length ? e.dettaglioCamere.map((d: any) => initRow(d.numero)) : [initRow(e?.numeroCamera || '103')]

// ── Layout default per i due tab ───────────────────────────────────────────────
// Ordine di lettura (sinistra→destra, riga per riga): le card seguono la sequenza
// richiesta; le non nominate (agenzia, prezzi) restano in coda.
// Individuale: Soggiorno, Stato & classificazione, Anticipi, Extra, Altre info,
//   Note di reparto, [in coda] Agenzia & cliente, Dettaglio prezzi
// NB: la card Soggiorno è ancorata a tutta larghezza in cima (fuori dalle colonne),
// per far entrare tutti i campi della tabella camere alla giusta dimensione.
const LAYOUT_IND = [
  ['extra','agenzia'],
  ['stato','altre'],
  ['anticipi','note-reparto'],
]
// Gruppo: Soggiorno gruppo (pinned full-width), Dati gruppo, Stato & opzioni, Anticipi, Extra, Altre info, Note di reparto
const LAYOUT_GR  = [
  ['anticipi','note-reparto'],
  ['dati-gr','extra'],
  ['stato-gr','altre'],
]


export default function NuovaPrenotazione({ navigate }: { navigate: (p:string)=>void }) {
  // Modifica prenotazione: cattura una sola volta la prenotazione passata via bookingStore
  const [editing] = useState<any>(() => bookingStore.editing)
  const [editId]  = useState<string | null>(() => bookingStore.editing?.booking ?? null)
  // Precompilazione periodo (selezione dal Tableau): date {dal, al}
  const [prefill] = useState<any>(() => bookingStore.prefill)
  // Azzeramento differito: sopravvive al doppio-mount di StrictMode (entrambe le init leggono il valore)
  useEffect(() => { const t = setTimeout(() => { bookingStore.editing = null; bookingStore.prefill = null }, 0); return () => clearTimeout(t) }, [])

  const [activeTab, setActiveTab] = useState<'gruppo'|'individuale'>(() => isGruppo(editing) ? 'gruppo' : 'individuale')

  // Servizi disponibili sulla piattaforma (selezionabili come extra)
  const serviziAll = useServiziStore(s => s.servizi)
  const serviziDisponibili = useMemo(() => serviziAll.filter(x => x.attivo), [serviziAll])

  const layoutInd = useMemo(() => LAYOUT_IND, [])
  const layoutGr  = useMemo(() => LAYOUT_GR,  [])

  // .v2 = nuovo ordine di default (invalida i layout salvati col vecchio ordine)
  const indLayout = useWidgetLayout('nuova-prenotazione.individuale.v3', layoutInd)
  const grLayout  = useWidgetLayout('nuova-prenotazione.gruppo.v3',      layoutGr)

  // ── State form ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => ({
    dal: TODAY, al: traGiorni(2),
    camere: 1, persone: 1,
    confermata: true, opzione: false,
    scadenza: '', arrangiamento: 'BB', credit: 'NC',
    segmento: { b2b: true, dirette: false, b2c: false, corporate: false },
    agenzia: '', rifEsterno: '', cliente: '', email: '',
    nazionalita: 'ITALIA', notePrenotazione: '',
    notePrenotazioneList: [] as NotaSemplice[],
    reparto: 'Manutenzione', notaReparto: '',
    noteReparti: [] as NotaReparto[],
    tipoAnticipo: 'caparra' as 'caparra' | 'acconto',
    metodoPagamento: 'Contanti', importoAnticipo: 0, ripartizioneAuto: false,
    anticipoQuote: [] as number[],
    ...editOverridesInd(editing),
    ...(!editing && prefill ? { dal: prefill.dal, al: prefill.al } : {}),
  }))

  const [grForm, setGrForm] = useState(() => ({
    dal: TODAY, al: traGiorni(2),
    camere: 4, persone: 10,
    tipologiaOspiti: 'adulti' as 'adulti' | 'studenti',
    hotel: STRUTTURE_GRUPPO[0],
    confermata: true, opzione: false,
    scadenza: '', personeConf: 2, arrangiamento: 'RO',
    agenzia: '', nomeGruppo: '', nomeCapoGruppo: '', emailCapoGruppo: '',
    nazionalita: 'ITALIA', notePrenotazione: '',
    notePrenotazioneList: [] as NotaSemplice[],
    reparto: 'Manutenzione', notaReparto: '',
    noteReparti: [] as NotaReparto[],
    tipoAnticipo: 'caparra' as 'caparra' | 'acconto',
    metodoPagamento: 'Contanti', importoAnticipo: 0, ripartizioneAuto: false,
    anticipoQuote: [] as number[],
    ...editOverridesGr(editing),
    ...(!editing && prefill ? { dal: prefill.dal, al: prefill.al } : {}),
  }))

  const [camereInd, setCamereInd] = useState<CameraRow[]>(() => editing ? editCamere(editing) : [initRow(prefill?.numeroCamera || '103')])
  // Gruppo: una lista camere per ciascuna struttura del cliente (tab dedicati)
  const [camereGrMap, setCamereGrMap] = useState<Record<string, CameraRow[]>>(() => {
    const riga = () => initRowGr(grForm.dal, grForm.al, grForm.arrangiamento)
    const seed = editing
      ? editCamere(editing).map(c => ({ ...riga(), ...c, dataIn: grForm.dal, dataOut: grForm.al }))
      : [{ ...riga(), quantita: 2, adulti: 4 }, { ...riga(), tipo: '55', quantita: 1, adulti: 3 }]
    return {
      [STRUTTURE_GRUPPO[0]]: seed,
      [STRUTTURE_GRUPPO[1]]: [riga()],
      [STRUTTURE_GRUPPO[2]]: [riga()],
    }
  })
  // Lista camere della struttura attiva (derivata): i consumatori esistenti
  // (anticipi, updCameraGr…) continuano a lavorare su questa.
  const camereGr = camereGrMap[grForm.hotel] ?? []
  const setCamereGr = (u: CameraRow[] | ((p: CameraRow[]) => CameraRow[])) =>
    setCamereGrMap(m => ({ ...m, [grForm.hotel]: typeof u === 'function' ? (u as (p: CameraRow[]) => CameraRow[])(m[grForm.hotel] ?? []) : u }))
  const [ospiti,    setOspiti]    = useState<OspiteRow[]>([initOsp(), initOsp(), initOsp(), initOsp()])

  // ── Card full-width riordinabili verticalmente (Anagrafica ospiti, Gestione segmenti)
  // Ordine di default: ospiti (ultima nominata) poi segmenti (non nominata → in coda)
  const [fullOrder, setFullOrder] = useState<string[]>(['prezzi', 'ospiti', 'segmenti'])
  const fullDragId = useRef<string | null>(null)
  const [fullOverId, setFullOverId] = useState<string | null>(null)
  const onFullDragStart = (id: string) => { fullDragId.current = id }
  const onFullDragOver = (e: React.DragEvent, id: string) => {
    if (!fullDragId.current || fullDragId.current === id) return
    e.preventDefault(); setFullOverId(id)
  }
  const onFullDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const src = fullDragId.current; fullDragId.current = null; setFullOverId(null)
    if (!src || src === targetId) return
    setFullOrder(prev => {
      const next = prev.filter(x => x !== src)
      const idx = next.indexOf(targetId)
      next.splice(idx, 0, src)
      return next
    })
  }
  const onFullDragEnd = () => { fullDragId.current = null; setFullOverId(null) }
  const fullCommon = (id: string) => ({
    id, isDragOver: fullOverId === id,
    onDragStart: onFullDragStart, onDragOver: onFullDragOver, onDrop: onFullDrop, onDragEnd: onFullDragEnd,
  })

  const [ospitiCollapsed, setOspitiCollapsed] = useState(false)
  const [prezziCollapsed, setPrezziCollapsed] = useState(false)

  // ── Gestione segmenti (suddivisione del soggiorno in intervalli di date) ──────
  const [segmentiCollapsed, setSegmentiCollapsed] = useState(false)
  const [segmenti, setSegmenti] = useState<SegmentoRow[]>([
    { id: 's1', dal: '2026-06-13', al: '2026-06-16', tipo: 'Doppia Classic', nCamera: '105', persone: 2, stato: 'Persistito' },
    { id: 's2', dal: '2026-06-16', al: '2026-06-18', tipo: 'Doppia Classic', nCamera: '118', persone: 2, stato: 'Persistito' },
  ])

  const [extra,        setExtra]        = useState<ExtraAggiunto[]>([])
  const [extraOpenId,  setExtraOpenId]  = useState<string | null>(null)
  const [extraEditId,  setExtraEditId]  = useState<string | null>(null)
  const [extraDraft,   setExtraDraft]   = useState<Omit<ExtraAggiunto,'id'>>({
    servizio: '', quando: TODAY, quantita: 1, intestatario: '', camera: '103', importo: 0, descrizione: '',
  })

  // ── Dettaglio prezzi (condiviso fra widget e modale "Modifica importo globale") ─
  const [prezzi, setPrezzi] = useState<PrezzoRow[]>([
    { giorno: TODAY, camera: 'Singola Classic', arrangiamento: '0,00 €', piani: '', promozioni: '', totale: 260.41, listino: 260.41 },
  ])

  // ── Stato modale "Modifica importo globale" ─────────────────────────────────
  const [importoModalOpen, setImportoModalOpen] = useState(false)
  const [modGlobalActive,  setModGlobalActive]  = useState(false)
  const [modGlobalMode,    setModGlobalMode]    = useState<'libero'|'percentuale'>('libero')
  const [modGlobalValue,   setModGlobalValue]   = useState<number>(260.41)
  const [editRowIdx,       setEditRowIdx]       = useState<number|null>(null)
  const [editRowValue,     setEditRowValue]     = useState<number>(0)

  // ── Totali ────────────────────────────────────────────────────────────────────
  const totaleSoggiorno = prezzi.reduce((a, r) => a + r.totale, 0)
  const totaleServizi   = extra.reduce((a, e) => a + e.importo * e.quantita, 0)
  const totale          = totaleSoggiorno + totaleServizi

  // ── Render helpers ───────────────────────────────────────────────────────────
  // Segmento di mercato: selezione singola (radio) — il segmento scelto è true, gli altri false
  const setSegmento = (k: keyof typeof form.segmento) =>
    setForm(f => ({
      ...f,
      segmento: (Object.keys(f.segmento) as (keyof typeof f.segmento)[])
        .reduce((acc, key) => ({ ...acc, [key]: key === k }), {} as typeof f.segmento),
    }))

  const updCamera = (i: number, p: Partial<CameraRow>) =>
    setCamereInd(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r))

  const updCameraGr = (i: number, p: Partial<CameraRow>) =>
    setCamereGr(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r))

  // Riga aperta nella modale "Dettaglio camere" (indice nella lista della struttura)
  const [dettaglioIdx, setDettaglioIdx] = useState<number | null>(null)

  // Righe sbloccate: una volta inserita, la riga è in sola lettura e si riapre
  // con la matita. Chiave = id riga (tabella) o `id:slot` (dettaglio camera).
  const [editKeys, setEditKeys] = useState<string[]>([])
  const inModifica = (k: string) => editKeys.includes(k)
  const apriModifica   = (k: string) => setEditKeys(v => v.includes(k) ? v : [...v, k])
  const chiudiModifica = (k: string) => setEditKeys(v => v.filter(x => x !== k))

  // Modifica dalla riga cumulativa: il valore si applica a tutte le sue camere
  const PERSONE: CampoPersone[] = ['adulti', 'ragazzi', 'bambini', 'infanti']

  const updRigaGr = (i: number, p: Partial<CameraRow>) =>
    setCamereGr(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      const row = { ...r, ...p }
      const chiavi = Object.keys(p).filter(k => k !== 'quantita') as (keyof DettCamera)[]
      // Cambiando il numero di camere i totali della riga restano quelli:
      // si ridistribuiscono sulle camere nuove
      if (p.quantita !== undefined && p.quantita !== r.quantita) {
        const n = Math.max(1, p.quantita)
        const quote = Object.fromEntries(
          PERSONE.map(k => [k, ripartisci(personeRiga(r, k), n)]),
        ) as Record<CampoPersone, number[]>
        const base = dettagliDi(r)
        const dettagli = Array.from({ length: n }, (_, k) => ({
          ...(base[k] ?? { ...base[base.length - 1], numero: '', note: '' }),
          adulti: quote.adulti[k], ragazzi: quote.ragazzi[k],
          bambini: quote.bambini[k], infanti: quote.infanti[k],
        }))
        return { ...row, dettagli }
      }
      // Le persone sono un totale di riga: si ripartiscono sulle camere.
      // Gli altri campi (tipo, prezzo, arrangiamento, date) valgono per tutte.
      const quote = Object.fromEntries(
        PERSONE.filter(k => chiavi.includes(k))
          .map(k => [k, ripartisci((row as any)[k], Math.max(1, row.quantita))]),
      ) as Partial<Record<CampoPersone, number[]>>
      const comuni = chiavi.filter(k => !PERSONE.includes(k as CampoPersone))
      const dettagli = dettagliDi(row).map((d, slot) => {
        const agg = comuni.reduce((acc, k) => ({ ...acc, [k]: (row as any)[k] }), { ...d })
        PERSONE.forEach(k => { if (quote[k]) (agg as any)[k] = quote[k]![slot] ?? 0 })
        return agg
      })
      return { ...row, dettagli }
    }))

  // Modifica di una singola camera dalla modale di dettaglio
  const updDettaglioGr = (i: number, slot: number, p: Partial<DettCamera>, silent = false) => {
    const riga = camereGr[i]
    if (!riga) return
    const prev = dettagliDi(riga)[slot]
    setCamereGr(list => list.map((r, idx) => idx === i
      ? { ...r, dettagli: dettagliDi(r).map((d, k) => k === slot ? { ...d, ...p } : d) }
      : r))
    if (silent || !p.numero) return
    const d = { ...prev, ...p }
    const b = bloccoPerCameraPeriodo(blocchiFantasma, d.numero, d.dataIn, d.dataOut)
    if (b) setGhostAlert({ scope: 'gr', idx: i, slot, prev: prev.numero, block: b })
  }

  // Conferma obbligatoria prima di eliminare una riga camera
  const confirm = useConfirmStore(s => s.confirm)
  const eliminaCameraGr = async (i: number) => {
    const ok = await confirm({ message: 'Eliminare questa riga dalla lista camere?', confirmLabel: 'Elimina' })
    if (ok) setCamereGr(prev => prev.filter((_, idx) => idx !== i))
  }

  // ── Periodo del soggiorno → date delle camere ───────────────────────────────
  // Il periodo scelto in "Date soggiorno" è il default delle camere: quando
  // cambia, le camere che portavano ancora le date ereditate (mai modificate a
  // mano) lo seguono; quelle con date proprie restano come sono.
  const allineaPeriodoCamere = (dal: string, al: string) => {
    const pDal = grForm.dal, pAl = grForm.al
    if (!dal || !al || (dal === pDal && al === pAl)) return
    const ereditata = (dIn: string, dOut: string) => dIn === pDal && dOut === pAl
    const agg = (rows: CameraRow[]) => rows.map(r => ({
      ...r,
      ...(ereditata(r.dataIn, r.dataOut) ? { dataIn: dal, dataOut: al } : {}),
      dettagli: dettagliDi(r).map(d =>
        ereditata(d.dataIn, d.dataOut) ? { ...d, dataIn: dal, dataOut: al } : d),
    }))
    setCamereGrMap(m => Object.fromEntries(Object.entries(m).map(([h, rows]) => [h, agg(rows)])))
  }

  // ── Specchietto: riepilogo di quanto inserito nella lista camere ────────────
  // È la somma, camera per camera, di quanto c'è nella lista qui accanto: gli
  // stessi numeri sono ripetuti nella riga dei totali in fondo alla tabella.
  const riepilogoCamere = (rows: CameraRow[]) => rows.reduce((a, c) => {
    dettagliDi(c).forEach(d => {
      const n = notti(d.dataIn, d.dataOut)
      a.camere  += 1
      a.perTipo[d.tipo] = (a.perTipo[d.tipo] ?? 0) + 1
      a.adulti  += d.adulti
      a.ragazzi += d.ragazzi
      a.bambini += d.bambini
      a.infanti += d.infanti
      a.totale  += totaleDett(d)
      if (d.numero) a.assegnate += 1
      if (d.dataIn  && (!a.dal || d.dataIn  < a.dal)) a.dal = d.dataIn
      if (d.dataOut && (!a.al  || d.dataOut > a.al))  a.al  = d.dataOut
      if (a.nottiMin === null || n < a.nottiMin) a.nottiMin = n
      if (a.nottiMax === null || n > a.nottiMax) a.nottiMax = n
    })
    return a
  }, { camere: 0, assegnate: 0, adulti: 0, ragazzi: 0, bambini: 0, infanti: 0, totale: 0, dal: '', al: '',
       nottiMin: null as number | null, nottiMax: null as number | null,
       perTipo: {} as Record<string, number> })
  // La colonna Prezzo mostra un prezzo per riga (non per camera): il piede
  // somma esattamente quei valori. Se le camere di una riga hanno prezzi
  // diversi, la riga porta la loro media, che è il solo numero che la
  // rappresenta.
  const sommaPrezzi = useMemo(() => camereGr.reduce((a, c) => {
    const dd = dettagliDi(c)
    const uguali = dd.every(d => d.prezzoPersona === dd[0].prezzoPersona)
    return a + (uguali ? dd[0].prezzoPersona : dd.reduce((x, d) => x + d.prezzoPersona, 0) / dd.length)
  }, 0), [camereGr])

  const recapGr    = useMemo(() => riepilogoCamere(camereGr), [camereGr])
  const recapGrAll = useMemo(() => riepilogoCamere(Object.values(camereGrMap).flat()), [camereGrMap])

  // ── Blocco fantasma: se la camera scelta è in prelazione nel periodo, avvisa;
  //    confermando, il blocco viene rimosso e la prenotazione procede.
  const blocchiFantasma = useBlocchiFantasmaStore(s => s.blocchi)
  const removeBlocco     = useBlocchiFantasmaStore(s => s.remove)
  type GhostAlert =
    | { scope: 'ind'; idx: number; prev: string; block: BloccoFantasma }
    | { scope: 'gr';  idx: number; slot: number; prev: string; block: BloccoFantasma }
  const [ghostAlert, setGhostAlert] = useState<GhostAlert | null>(null)

  const chooseRoomInd = (i: number, val: string, prev: string) => {
    updCamera(i, { nCamera: val })
    const b = bloccoPerCameraPeriodo(blocchiFantasma, val, form.dal, form.al)
    if (b) setGhostAlert({ scope: 'ind', idx: i, prev, block: b })
  }
  const cancelGhostAlert = () => {
    if (!ghostAlert) return
    if (ghostAlert.scope === 'ind') updCamera(ghostAlert.idx, { nCamera: ghostAlert.prev })
    else updDettaglioGr(ghostAlert.idx, ghostAlert.slot, { numero: ghostAlert.prev }, true)
    setGhostAlert(null)
  }
  const confirmGhostAlert = () => {
    if (ghostAlert) removeBlocco(ghostAlert.block.id)
    setGhostAlert(null)
  }

  // Aperta da una strisciata sul planner: se la camera+periodo precompilati si
  // sovrappongono (anche parzialmente) a un blocco fantasma, avvisa subito.
  useEffect(() => {
    if (editing || !prefill?.numeroCamera) return
    const b = bloccoPerCameraPeriodo(
      useBlocchiFantasmaStore.getState().blocchi,
      prefill.numeroCamera, prefill.dal, prefill.al,
    )
    if (b) setGhostAlert({ scope: 'ind', idx: 0, prev: prefill.numeroCamera, block: b })
    // solo al mount (i valori del prefill sono catturati una volta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updOspite = (i: number, p: Partial<OspiteRow>) =>
    setOspiti(prev => prev.map((r, idx) => idx === i ? { ...r, ...p } : r))

  // ── Helpers Gestione segmenti ──────────────────────────────────────────────
  const fmtData = (iso: string) => iso ? new Date(iso).toLocaleDateString('it-IT') : ''
  const addDays = (iso: string, n: number) => {
    const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
  }
  const updSegmento = (i: number, p: Partial<SegmentoRow>) =>
    setSegmenti(prev => prev.map((s, idx) => idx === i ? { ...s, ...p } : s))

  const addSegmento = () => setSegmenti(prev => {
    const last = prev[prev.length - 1]
    const dal = last ? last.al : TODAY
    return [...prev, {
      id: Date.now().toString(),
      dal, al: addDays(dal, 1),
      tipo: last?.tipo ?? TIPOLOGIE_CAMERA[0],
      nCamera: last?.nCamera ?? '',
      persone: last?.persone ?? 2,
      stato: 'Da salvare',
    }]
  })

  const removeSegmento = (id: string) =>
    setSegmenti(prev => prev.filter(s => s.id !== id))

  // "Segmento unico": elimina tutte le segmentazioni e ripristina lo stato di origine
  // (un solo segmento che copre l'intero intervallo del soggiorno)
  const segmentoUnico = () => setSegmenti(prev => {
    if (!prev.length) return prev
    const dal = prev.reduce((m, s) => s.dal < m ? s.dal : m, prev[0].dal)
    const al  = prev.reduce((m, s) => s.al  > m ? s.al  : m, prev[0].al)
    return [{ ...prev[0], dal, al, stato: 'Da salvare' }]
  })

  // ── Helpers Anticipi: ripartizione importo per camera ─────────────────────
  const updQuota = (isGr: boolean, i: number, val: number) => {
    const rooms = isGr ? camereGr : camereInd
    const setF = isGr ? setGrForm : setForm
    setF((v: any) => {
      const arr = [...(v.anticipoQuote ?? [])]
      while (arr.length < rooms.length) arr.push(0)
      arr[i] = val
      return { ...v, anticipoQuote: arr }
    })
  }
  // Ripartisce l'importo totale in parti uguali fra le camere
  const redistribuisci = (isGr: boolean) => {
    const rooms = isGr ? camereGr : camereInd
    const tot = (isGr ? grForm : form).importoAnticipo
    const n = rooms.length || 1
    const each = Math.round((tot / n) * 100) / 100
    const setF = isGr ? setGrForm : setForm
    setF((v: any) => ({ ...v, anticipoQuote: rooms.map(() => each) }))
  }

  const openExtraDraft = (s: Servizio) => {
    setExtraEditId(null)
    setExtraOpenId(s.id)
    setExtraDraft({ servizio: s.nome, quando: form.dal, quantita: 1, intestatario: '', camera: '103', importo: s.prezzoB2C, descrizione: s.descrizione })
  }

  const openExtraEdit = (e: ExtraAggiunto) => {
    const { id, ...rest } = e
    setExtraEditId(id)
    setExtraOpenId(id)
    setExtraDraft(rest)
  }

  const removeExtra = (id: string) =>
    setExtra(prev => prev.filter(e => e.id !== id))

  const confirmExtra = () => {
    if (extraEditId) {
      setExtra(prev => prev.map(e => e.id === extraEditId ? { ...e, ...extraDraft } : e))
    } else {
      setExtra(prev => [...prev, { id: Date.now().toString(), ...extraDraft }])
    }
    setExtraOpenId(null)
    setExtraEditId(null)
  }

  const startEditRow = (i: number) => {
    setEditRowIdx(i)
    setEditRowValue(prezzi[i].totale)
  }

  const confirmEditRow = () => {
    if (editRowIdx === null) return
    setPrezzi(prev => prev.map((r, idx) => idx === editRowIdx ? { ...r, totale: editRowValue } : r))
    setEditRowIdx(null)
  }

  const cancelEditRow = () => setEditRowIdx(null)

  const applyModGlobal = () => {
    setPrezzi(prev => prev.map(r => {
      if (modGlobalMode === 'libero')      return { ...r, totale: modGlobalValue }
      const pct = modGlobalValue / 100
      return { ...r, totale: +(r.listino * (1 + pct)).toFixed(2) }
    }))
    setModGlobalActive(false)
  }

  const resetModGlobal = () => {
    setPrezzi(prev => prev.map(r => ({ ...r, totale: r.listino })))
    setModGlobalActive(false)
  }

  // ── Widgets renderer ─────────────────────────────────────────────────────────
  const renderIndWidget = (id: string, pinned = false) => {
    const collapsed = indLayout.collapsed.has(id)
    const isOver    = indLayout.overId === id
    const common = pinned
      ? { id, collapsed, onToggleCollapse: indLayout.toggleCollapse, className: 'np-widget--full' }
      : {
          id, collapsed, isDragOver: isOver,
          onToggleCollapse: indLayout.toggleCollapse,
          onDragStart:      indLayout.handleDragStart,
          onDragOver:       indLayout.handleDragOver,
          onDrop:           indLayout.handleDrop,
          onDragEnd:        indLayout.handleDragEnd,
        }

    switch (id) {
      case 'soggiorno': return (
        <Widget key={id} {...common} title="Soggiorno">
          <div className="np-soggiorno">
            {/* Colonna sinistra: parametri soggiorno + azioni */}
            <div className="np-soggiorno__side">
              <DateRangeField
                nameFrom="dal" nameTo="al" label="Date"
                valueFrom={form.dal} valueTo={form.al}
                onChangeFrom={e=>setForm(f=>({...f,dal:e.target.value}))}
                onChangeTo={e=>setForm(f=>({...f,al:e.target.value}))}
              />
              <div className="np-soggiorno__cp">
                <InputField name="camere" label="Camere" type="number" value={form.camere} onChange={e=>setForm(f=>({...f,camere:+e.target.value||0}))} className="np-w-num"/>
                <InputField name="persone" label="Persone" type="number" value={form.persone} onChange={e=>setForm(f=>({...f,persone:+e.target.value||0}))} className="np-w-num"/>
              </div>
              <div className="np-soggiorno__actions">
                <button type="button" className="sib-btn np-soggiorno__btn"><i className="fa-light fa-grid-2" /> Alloca</button>
                <button type="button" className="sib-btn np-soggiorno__btn"><i className="fa-light fa-user-plus" /> Assegna</button>
              </div>
            </div>

            {/* Colonna destra: lista camere */}
            <div className="np-soggiorno__rooms">
              <div className="np-table-scroll">
                <table className="np-table">
                  <thead>
                    <tr>
                      <th className="np-col-idx">#</th><th>Tipologie camere disponibili</th><th>Adulti</th><th>Ragazzi</th><th>Bambini</th><th>Infanti</th><th>N. Camera</th><th className="np-col-actions" aria-label="Azioni" />
                    </tr>
                  </thead>
                  <tbody>
                    {camereInd.map((c, i) => (
                      <tr key={i}>
                        <td className="np-col-idx">{i+1}</td>
                        <td>
                          <div className="np-tipo-cell">
                            <i className="fa-solid fa-bed-front np-tipo-ico" aria-hidden="true" />
                            <select className="sib-input np-cell-input np-cell-input--tipo" value={c.tipo} onChange={e=>updCamera(i,{tipo:e.target.value})}>
                              {TIPI_CAMERA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                            </select>
                          </div>
                        </td>
                        <td><NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={c.adulti} onChange={n=>updCamera(i,{adulti:n})}/></td>
                        <td><NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={c.ragazzi} onChange={n=>updCamera(i,{ragazzi:n})}/></td>
                        <td><NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={c.bambini} onChange={n=>updCamera(i,{bambini:n})}/></td>
                        <td><NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={c.infanti} onChange={n=>updCamera(i,{infanti:n})}/></td>
                        <td>
                          <div className="np-room-cell">
                            <select className="sib-input np-cell-input np-cell-input--room" value={c.nCamera} onChange={e=>chooseRoomInd(i, e.target.value, c.nCamera)}>
                              <option value="">—</option>
                              {CAMERE.map(n => <option key={n} value={n}>{n}{bloccoPerCameraPeriodo(blocchiFantasma, n, form.dal, form.al) ? ' 👻' : ''}</option>)}
                            </select>
                            {!!bloccoPerCameraPeriodo(blocchiFantasma, c.nCamera, form.dal, form.al) && (
                              <Tooltip text="Camera in blocco fantasma">
                                <GhostIcon className="np-ghost-ico" title="Camera in blocco fantasma" />
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="np-col-actions">
                          <button
                            type="button"
                            className="np-row-action np-row-action--danger"
                            aria-label="Elimina camera"
                            title="Elimina camera"
                            disabled={camereInd.length <= 1}
                            onClick={()=>setCamereInd(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="np-add-row" onClick={()=>setCamereInd(p=>[...p, initRow()])}>
                <i className="fa-light fa-plus" /> Aggiungi camera
              </button>
            </div>
          </div>
        </Widget>
      )

      case 'stato': return (
        <Widget key={id} {...common} title="Stato & classificazione">
          <span className="np-label">Stato</span>
          <div className="np-checks-row">
            <label className="np-check">
              <input type="radio" name="stato-ind" className="sib-radio" checked={form.confermata} onChange={()=>setForm(f=>({...f,confermata:true,opzione:false}))}/>
              <span className="np-dot np-dot--ok" /> Confermata
            </label>
            <label className="np-check">
              <input type="radio" name="stato-ind" className="sib-radio" checked={form.opzione} onChange={()=>setForm(f=>({...f,confermata:false,opzione:true}))}/>
              <span className="np-dot np-dot--ko" /> Opzione
            </label>
          </div>
          {form.opzione && (
            <div className="np-row">
              <DatePickerField name="scadenza" label="Scadenza opzione" value={form.scadenza} onChange={e=>setForm(f=>({...f,scadenza:e.target.value}))}/>
            </div>
          )}
          <div className="np-row">
            <SelectField name="arrangiamento" label="Arrangiamento" value={form.arrangiamento} onChange={e=>setForm(f=>({...f,arrangiamento:e.target.value}))} options={ARRANGIAMENTI.map(o=>({value:o,label:o}))}/>
            <SelectField name="credit" label="Credit" value={form.credit} onChange={e=>setForm(f=>({...f,credit:e.target.value}))} options={CREDIT.map(o=>({value:o,label:o}))}/>
          </div>
          <span className="np-label">Segmento di mercato</span>
          <div className="np-checks-row">
            {(Object.keys(form.segmento) as (keyof typeof form.segmento)[]).map(k=>(
              <label key={k} className="np-check">
                <input type="radio" name="segmento-ind" className="sib-radio" checked={form.segmento[k]} onChange={()=>setSegmento(k)}/>
                <span className="np-cap">{k.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </Widget>
      )

      case 'agenzia': return (
        <Widget key={id} {...common} title="Agenzia & cliente">
          <div className="np-row">
            <InputField name="agenzia"    label="Agenzia"      value={form.agenzia}    onChange={e=>setForm(f=>({...f,agenzia:e.target.value}))}/>
            <InputField name="rifEsterno" label="Rif. esterno" value={form.rifEsterno} onChange={e=>setForm(f=>({...f,rifEsterno:e.target.value}))}/>
          </div>
          <div className="np-row">
            <InputField name="cliente" label="Cliente" value={form.cliente} onChange={e=>setForm(f=>({...f,cliente:e.target.value}))}/>
            <InputField name="email"   label="E-mail"  type="email" value={form.email}   onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
          </div>
        </Widget>
      )

      case 'extra': return renderExtraInclusiWidget(common)
      case 'altre': return renderAltreInfoWidget(common, false)
      case 'note-reparto': return renderNoteRepartoWidget(common, false)
      case 'anticipi': return renderAnticipiWidget(common, false)
      default: return null
    }
  }

  const renderGrWidget = (id: string, pinned = false) => {
    const collapsed = grLayout.collapsed.has(id)
    const isOver    = grLayout.overId === id
    const common = pinned
      ? { id, collapsed, onToggleCollapse: grLayout.toggleCollapse, className: 'np-widget--full' }
      : {
          id, collapsed, isDragOver: isOver,
          onToggleCollapse: grLayout.toggleCollapse,
          onDragStart:      grLayout.handleDragStart,
          onDragOver:       grLayout.handleDragOver,
          onDrop:           grLayout.handleDrop,
          onDragEnd:        grLayout.handleDragEnd,
        }

    switch (id) {
      case 'soggiorno-gr': return (
        <Widget key={id} {...common} title="Soggiorno gruppo">
          <div className="np-soggiorno">
            {/* Colonna sinistra: parametri soggiorno + tipologia ospiti + azioni */}
            <div className="np-soggiorno__side">
              {/* Periodo del soggiorno: è il default delle date delle camere
                  aggiunte dopo averlo scelto */}
              <DateRangeField
                nameFrom="dal" nameTo="al" label="Date soggiorno"
                valueFrom={grForm.dal} valueTo={grForm.al}
                onChangeFrom={e=>setGrForm(f=>({...f,dal:e.target.value}))}
                onChangeTo={e=>setGrForm(f=>({...f,al:e.target.value}))}
                onChange={(f,t)=>allineaPeriodoCamere(isoDate(f), isoDate(t))}
              />
              {/* Specchietto: riepilogo del prenotato nella lista camere qui sotto */}
              <div className="np-recap">
                <div className="np-recap__title">Riepilogo prenotato</div>
                <div className="np-recap__row">
                  <span>Camere</span><strong>{recapGr.camere}</strong>
                </div>
                {/* Di che tipo sono: la composizione conta quanto il totale */}
                {!!recapGr.camere && (
                  <ul className="np-recap__tipi">
                    {Object.entries(recapGr.perTipo)
                      .sort((a, b) => b[1] - a[1])
                      .map(([tipo, n]) => (
                        <li key={tipo}>
                          <span className="np-recap__tipi-n">{n}</span>
                          <TruncatedText className="np-recap__tipi-l" text={nomeTipo(tipo)} />
                        </li>
                      ))}
                  </ul>
                )}
                <div className="np-recap__row">
                  <span>Persone</span><strong>{recapGr.adulti + recapGr.ragazzi + recapGr.bambini + recapGr.infanti}</strong>
                </div>
                <div className="np-recap__mix">
                  {([['Adulti', recapGr.adulti], ['Ragazzi', recapGr.ragazzi], ['Bambini', recapGr.bambini], ['Infanti', recapGr.infanti]] as const).map(([l, v]) => (
                    <div key={l} className="np-recap__mix-item">
                      <span className="np-recap__mix-val">{v}</span>
                      <span className="np-recap__mix-lab">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="np-recap__row">
                  <span>Periodo</span><strong>{fmtData(recapGr.dal) || '—'} → {fmtData(recapGr.al) || '—'}</strong>
                </div>
                <div className="np-recap__row">
                  <span>Notti</span>
                  <strong>{recapGr.nottiMin === null
                    ? 0
                    : recapGr.nottiMin === recapGr.nottiMax
                      ? recapGr.nottiMin
                      : `${recapGr.nottiMin}–${recapGr.nottiMax}`}</strong>
                </div>
                <div className="np-recap__row np-recap__row--tot">
                  <span>Totale</span><strong>{euro(recapGr.totale)}</strong>
                </div>
                {recapGrAll.camere > recapGr.camere && (
                  <div className="np-recap__foot">
                    Tutte le strutture: {recapGrAll.camere} camere · {euro(recapGrAll.totale)}
                  </div>
                )}
              </div>

              <div className="np-soggiorno__actions">
                <button type="button" className="sib-btn np-soggiorno__btn"><i className="fa-light fa-grid-2" /> Alloca</button>
                <button type="button" className="sib-btn np-soggiorno__btn"><i className="fa-light fa-user-plus" /> Assegna</button>
              </div>
            </div>

            {/* Colonna destra: tab per struttura + lista camere della struttura attiva */}
            <div className="np-soggiorno__rooms">
              <div className="np-hotels-tabs">
                {STRUTTURE_GRUPPO.map(h=>(
                  <button key={h} type="button" className={`np-hotels-tab ${grForm.hotel===h?'np-hotels-tab--active':''}`} onClick={()=>setGrForm(f=>({...f,hotel:h}))}>{h}</button>
                ))}
              </div>
              <div className="np-table-scroll">
                <table className="np-table np-table--edit np-table--gr">
                  <colgroup>
                    <col className="np-c-qta" /><col className="np-c-tipo" />
                    <col className="np-c-num" /><col className="np-c-num" /><col className="np-c-num" /><col className="np-c-num" />
                    <col className="np-c-prezzo" /><col className="np-c-arr" />
                    <col className="np-c-data" /><col className="np-c-data" />
                    <col className="np-c-tot" /><col className="np-c-act" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th><TruncatedText text="Q.tà" full="Quantità" /></th>
                      <th><TruncatedText text="Tipologia camera" /></th>
                      <th><TruncatedText text="Adulti" /></th>
                      <th><TruncatedText text="Ragazzi" /></th>
                      <th><TruncatedText text="Bambini" /></th>
                      <th><TruncatedText text="Infanti" /></th>
                      <th><TruncatedText text="Prezzo" full="Prezzo a persona per il soggiorno" /></th>
                      <th><TruncatedText text="Arrang." full="Arrangiamento" /></th>
                      <th><TruncatedText text="Data in" /></th>
                      <th><TruncatedText text="Data out" /></th>
                      <th className="np-amt">Totale</th>
                      <th className="np-col-actions" aria-label="Azioni" />
                    </tr>
                  </thead>
                  <tbody>
                    {camereGr.map((c, i)=>{
                      // La riga mostra i valori della prima camera del gruppo:
                      // modificarli qui li applica a tutte le camere della riga
                      const dd  = dettagliDi(c)
                      const v   = dd[0]
                      const ed  = inModifica(c.id)
                      const tipoLabel = TIPI_CAMERA.find(t => t.v === v.tipo)?.l ?? v.tipo
                      // Sola lettura: se le camere della riga divergono (modificate
                      // una per una dal dettaglio) la riga non può mostrare un valore
                      // unico e lo dichiara, così quello che si legge qui × la quantità
                      // corrisponde sempre allo specchietto
                      const ro = (k: keyof DettCamera, fmt: (x: any) => React.ReactNode = x => x) => {
                        const u = comune(c, k)
                        return u === undefined
                          ? <Tooltip text="Valori diversi fra le camere: apri il dettaglio camere"><span className="np-cell-ro np-cell-ro--misto">misto</span></Tooltip>
                          : <span className="np-cell-ro">{fmt(u)}</span>
                      }
                      // Totale della riga: è quello che si scrive e quello che
                      // si legge, coerente con la somma in fondo alla tabella
                      const num = (k: CampoPersone) => {
                        const tot = personeRiga(c, k)
                        return ed
                          ? <NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={tot} onChange={n=>updRigaGr(i,{[k]:n})}/>
                          : <span className="np-cell-ro">{tot}</span>
                      }
                      return (
                      // Il dettaglio camere si apre SOLO dall'icona dedicata:
                      // la riga non è cliccabile
                      <tr key={c.id} className={ed ? 'np-row-edit' : ''}>
                        <td>
                          {ed
                            ? <NumCell className="sib-input np-cell-input np-cell-input--num" min={1} value={c.quantita} onChange={n=>updRigaGr(i,{quantita:n})}/>
                            : <span className="np-cell-ro">{c.quantita}</span>}
                        </td>
                        <td>
                          <div className="np-tipo-cell">
                            <i className="fa-solid fa-bed-front np-tipo-ico" aria-hidden="true" />
                            {/* L'etichetta può non entrare nella colonna: tooltip col testo completo */}
                            {ed ? (
                              <Tooltip text={tipoLabel}>
                                <select className="sib-input np-cell-input np-cell-input--tipo" value={v.tipo} onChange={e=>updRigaGr(i,{tipo:e.target.value})}>
                                  {TIPI_CAMERA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                                </select>
                              </Tooltip>
                            ) : comune(c, 'tipo') === undefined
                              ? ro('tipo')
                              : <TruncatedText className="np-cell-ro" text={tipoLabel} />}
                          </div>
                        </td>
                        <td>{num('adulti')}</td>
                        <td>{num('ragazzi')}</td>
                        <td>{num('bambini')}</td>
                        <td>{num('infanti')}</td>
                        <td>
                          {ed
                            ? <NumCell className="sib-input np-cell-input np-cell-input--num" min={0} step={1} decimals={2} value={v.prezzoPersona} onChange={n=>updRigaGr(i,{prezzoPersona:n})}/>
                            : ro('prezzoPersona', x => euro(x))}
                        </td>
                        <td>
                          {ed ? (
                            <select className="sib-input np-cell-input" value={v.arrangiamento} onChange={e=>updRigaGr(i,{arrangiamento:e.target.value})}>
                              {ARRANGIAMENTI.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          ) : ro('arrangiamento')}
                        </td>
                        <td>
                          {ed
                            ? <input type="date" className="sib-input np-cell-input np-cell-input--data" value={v.dataIn} onChange={e=>updRigaGr(i,{dataIn:e.target.value})}/>
                            : ro('dataIn', x => fmtData(x) || '—')}
                        </td>
                        <td>
                          {ed
                            ? <input type="date" className="sib-input np-cell-input np-cell-input--data" value={v.dataOut} onChange={e=>updRigaGr(i,{dataOut:e.target.value})}/>
                            : ro('dataOut', x => fmtData(x) || '—')}
                        </td>
                        <td className="np-amt">
                          <Tooltip text={`${personeRiga(c, 'adulti') + personeRiga(c, 'ragazzi') + personeRiga(c, 'bambini') + personeRiga(c, 'infanti')} persone × ${euro(v.prezzoPersona)} · ${c.quantita} ${c.quantita === 1 ? 'camera' : 'camere'} · ${notti(v.dataIn, v.dataOut)} notti`}>
                            <span>{euro(totaleRigaGr(c))}</span>
                          </Tooltip>
                        </td>
                        <td className="np-col-actions">
                          <button
                            type="button"
                            className="np-row-action"
                            aria-label="Dettaglio camere"
                            onClick={()=>setDettaglioIdx(i)}
                          >
                            <Tooltip text="Dettaglio camere"><i className="fa-solid fa-list-ul" /></Tooltip>
                          </button>
                          {ed ? (
                            <button
                              type="button"
                              className="np-row-action np-row-action--ok"
                              aria-label="Conferma la riga"
                              onClick={()=>chiudiModifica(c.id)}
                            >
                              <Tooltip text="Conferma la riga"><i className="fa-solid fa-check" /></Tooltip>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="np-row-action"
                              aria-label="Modifica la riga"
                              onClick={()=>apriModifica(c.id)}
                            >
                              <Tooltip text="Modifica la riga"><i className="fa-solid fa-pen" /></Tooltip>
                            </button>
                          )}
                          <button
                            type="button"
                            className="np-row-action np-row-action--danger"
                            aria-label="Elimina camera"
                            disabled={camereGr.length <= 1}
                            onClick={()=>eliminaCameraGr(i)}
                          >
                            <Tooltip text="Elimina camera"><i className="fa-solid fa-trash" /></Tooltip>
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                  {/* Totali: sono esattamente i numeri dello specchietto
                      "Riepilogo prenotato" qui a sinistra */}
                  <tfoot>
                    <tr className="np-tot-row">
                      <td>{recapGr.camere}</td>
                      <td><TruncatedText text="Totale camere" /></td>
                      <td>{recapGr.adulti}</td>
                      <td>{recapGr.ragazzi}</td>
                      <td>{recapGr.bambini}</td>
                      <td>{recapGr.infanti}</td>
                      <td className="np-amt">
                        <Tooltip text="Somma dei prezzi a persona delle righe">
                          <span>{euro(sommaPrezzi)}</span>
                        </Tooltip>
                      </td>
                      <td colSpan={3} />
                      <td className="np-amt">{euro(recapGr.totale)}</td>
                      <td className="np-col-actions" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button
                type="button"
                className="np-add-row"
                onClick={()=>{
                  const riga = initRowGr(grForm.dal, grForm.al, grForm.arrangiamento)
                  setCamereGr(p=>[...p, riga])
                  apriModifica(riga.id)
                }}
              >
                <i className="fa-light fa-plus" /> Aggiungi camera
              </button>
            </div>
          </div>
        </Widget>
      )

      case 'stato-gr': return (
        <Widget key={id} {...common} title="Stato & opzioni">
          <span className="np-label">Stato</span>
          <div className="np-checks-row">
            <label className="np-check">
              <input type="checkbox" className="sib-checkbox" checked={grForm.confermata} onChange={e=>setGrForm(f=>({...f,confermata:e.target.checked}))}/>
              <span className="np-dot np-dot--ok" /> Confermata
            </label>
            <label className="np-check">
              <input type="checkbox" className="sib-checkbox" checked={grForm.opzione} onChange={e=>setGrForm(f=>({...f,opzione:e.target.checked}))}/>
              <span className="np-dot np-dot--ko" /> Opzione
            </label>
          </div>
          <div className="np-row">
            <DatePickerField name="scadenza" label="Scadenza" value={grForm.scadenza} onChange={e=>setGrForm(f=>({...f,scadenza:e.target.value}))}/>
            <InputField name="personeConf" label="Persone conf." type="number" value={grForm.personeConf} onChange={e=>setGrForm(f=>({...f,personeConf:+e.target.value||0}))} className="np-w-num"/>
            <SelectField name="arrangiamento" label="Arrangiamento" value={grForm.arrangiamento} onChange={e=>setGrForm(f=>({...f,arrangiamento:e.target.value}))} options={ARRANGIAMENTI.map(o=>({value:o,label:o}))}/>
          </div>
        </Widget>
      )

      case 'dati-gr': return (
        <Widget key={id} {...common} title="Dati gruppo">
          <InputField name="agenzia" label="Agenzia" value={grForm.agenzia} onChange={e=>setGrForm(f=>({...f,agenzia:e.target.value}))}/>
          <div className="np-row">
            <InputField name="nomeGruppo"     label="Nome gruppo"      value={grForm.nomeGruppo}     onChange={e=>setGrForm(f=>({...f,nomeGruppo:e.target.value}))}/>
            <InputField name="nomeCapoGruppo" label="Nome capo gruppo" value={grForm.nomeCapoGruppo} onChange={e=>setGrForm(f=>({...f,nomeCapoGruppo:e.target.value}))}/>
          </div>
          <InputField name="emailCapoGruppo" type="email" label="E-mail capo gruppo" value={grForm.emailCapoGruppo} onChange={e=>setGrForm(f=>({...f,emailCapoGruppo:e.target.value}))}/>
        </Widget>
      )

      case 'extra': return renderExtraInclusiWidget(common)
      case 'altre': return renderAltreInfoWidget(common, true)
      case 'note-reparto': return renderNoteRepartoWidget(common, true)
      case 'anticipi': return renderAnticipiWidget(common, true)
      default: return null
    }
  }

  function renderSegmentiWidget() {
    const cameraOpts = Array.from(new Set([...CAMERE, ...segmenti.map(s => s.nCamera).filter(Boolean)]))
    const base = segmenti[0]
    return (
      <Widget
        key="segmenti"
        {...fullCommon('segmenti')}
        title="Gestione segmenti"
        collapsed={segmentiCollapsed}
        onToggleCollapse={() => setSegmentiCollapsed(v => !v)}
        className="np-seg-widget"
      >
        <div className="np-seg-head">
          <div className="np-seg-summary np-table-scroll">
            <table className="np-table">
              <thead>
                <tr><th>#</th><th>Tipologia</th><th>Camera</th><th>Persone</th><th>Segmenti</th></tr>
              </thead>
              <tbody>
                <tr className="np-seg-summary-row">
                  <td>1</td>
                  <td>{base?.tipo ?? '—'}</td>
                  <td>{base?.nCamera || '—'}</td>
                  <td>{base?.persone ?? 0}</td>
                  <td>{segmenti.length} segment{segmenti.length === 1 ? 'o' : 'i'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="np-seg-side">
            <button type="button" className="np-seg-btn" onClick={addSegmento}>Aggiungi segmento</button>
            <button type="button" className="np-seg-btn" onClick={segmentoUnico}>Segmento unico</button>
          </div>
        </div>

        <div className="np-seg-list np-table-scroll">
          <table className="np-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Tipologia</th><th>Camera</th><th>Persone</th><th className="np-col-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {segmenti.map((s, i) => (
                <tr key={s.id}>
                  <td><span className="np-seg-num">{i + 1}</span></td>
                  <td className="np-seg-dates">{fmtData(s.dal)} - {fmtData(s.al)}</td>
                  <td>
                    <select className="sib-input np-cell-input np-cell-input--tipo" value={s.tipo} onChange={e=>updSegmento(i,{tipo:e.target.value})}>
                      {TIPOLOGIE_CAMERA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="sib-input np-cell-input np-cell-input--room" value={s.nCamera} onChange={e=>updSegmento(i,{nCamera:e.target.value})}>
                      <option value="">—</option>
                      {cameraOpts.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td><NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={s.persone} onChange={n=>updSegmento(i,{persone:n})}/></td>
                  <td className="np-col-actions">
                    <button type="button" className="np-row-action" aria-label="Modifica" title="Modifica"><i className="fa-solid fa-pen-to-square" /></button>
                    <button type="button" className="np-row-action np-row-action--danger" aria-label="Elimina" title="Elimina" onClick={()=>removeSegmento(s.id)}><i className="fa-solid fa-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Widget>
    )
  }

  function renderOspitiWidget() {
    return (
      <Widget key="ospiti" {...fullCommon('ospiti')} title="Anagrafica ospiti" bodyClassName="widget__body--flush" collapsed={ospitiCollapsed} onToggleCollapse={() => setOspitiCollapsed(v => !v)}>
        <div className="np-ospiti-toolbar">
          <button type="button" className="np-link-add" onClick={scaricaExcelOspiti}>
            <i className="fa-light fa-file-xls" /> Scarica Excel
          </button>
          <button type="button" className="np-link-add" onClick={scaricaPdfOspiti}>
            <i className="fa-light fa-file-pdf" /> Scarica PDF
          </button>
          <button type="button" className="np-link-add" onClick={()=>setOspiti(p=>[...p, initOsp()])}>
            <i className="fa-light fa-plus" /> Aggiungi ospite
          </button>
        </div>
        <table className="np-table np-table--full">
          <thead>
            <tr>
              <th>Nome</th><th>Cognome</th><th>Data di nascita</th><th>Paese di nascita</th><th>Sesso</th><th>N. Camera</th><th>Data di arrivo</th><th className="np-col-actions" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {ospiti.map((o, i)=>(
              <tr key={i}>
                <td><input type="text" className="sib-input np-cell-input" value={o.nome}        onChange={e=>updOspite(i,{nome:e.target.value})}/></td>
                <td><input type="text" className="sib-input np-cell-input" value={o.cognome}     onChange={e=>updOspite(i,{cognome:e.target.value})}/></td>
                <td><input type="date" className="sib-input np-cell-input" value={o.dataNascita} onChange={e=>updOspite(i,{dataNascita:e.target.value})}/></td>
                <td>
                  <select className="sib-input np-cell-input" value={o.paese} onChange={e=>updOspite(i,{paese:e.target.value})}>
                    <option value="">—</option>
                    {NAZIONALITA.map(p => <option key={p} value={p}>{withFlag(p)}</option>)}
                  </select>
                </td>
                <td>
                  <select className="sib-input np-cell-input" value={o.sesso} onChange={e=>updOspite(i,{sesso:e.target.value})}>
                    <option value="">—</option><option value="M">M</option><option value="F">F</option>
                  </select>
                </td>
                <td>
                  <select className="sib-input np-cell-input" value={o.nCamera} onChange={e=>updOspite(i,{nCamera:e.target.value})}>
                    <option value="">—</option>
                    {CAMERE.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </td>
                <td><input type="date" className="sib-input np-cell-input" value={o.dataArrivo} onChange={e=>updOspite(i,{dataArrivo:e.target.value})}/></td>
                <td className="np-col-actions">
                  <button type="button" className="np-row-action" aria-label="Modifica" title="Modifica">
                    <i className="fa-solid fa-pen-to-square" />
                  </button>
                  <button type="button" className="np-row-action np-row-action--danger" aria-label="Elimina" title="Elimina" onClick={()=>setOspiti(prev => prev.filter((_, idx) => idx !== i))}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Widget>
    )
  }

  function renderExtraInclusiWidget(common: any) {
    return (
      <Widget key="extra" {...common} title="Extra inclusi">
        <SelectField
          name="extra-servizio"
          label="Aggiungi servizio"
          value=""
          onChange={e => { const s = serviziDisponibili.find(x => x.id === e.target.value); if (s) openExtraDraft(s) }}
          options={[{ value: '', label: '— Seleziona un servizio —' }, ...serviziDisponibili.map(s => ({ value: s.id, label: s.nome }))]}
        />

        {extraOpenId && (
          <div className="np-extra-popup">
            <div className="np-extra-popup-head">
              <span>{extraEditId ? 'Modifica' : 'Aggiungi'}: {extraDraft.servizio}</span>
              <button type="button" className="np-extra-popup-close" onClick={()=>{setExtraOpenId(null);setExtraEditId(null)}} aria-label="Chiudi"><i className="fa-light fa-xmark" /></button>
            </div>
            <div className="np-row">
              <DatePickerField name="quando" label="Quando" value={extraDraft.quando} onChange={e=>setExtraDraft(d=>({...d,quando:e.target.value}))}/>
              <InputField name="quantita" label="Quantità" type="number" value={extraDraft.quantita} onChange={e=>setExtraDraft(d=>({...d,quantita:+e.target.value||0}))} className="np-w-num"/>
            </div>
            <InputField name="intestatario" label="Intestatario" value={extraDraft.intestatario} onChange={e=>setExtraDraft(d=>({...d,intestatario:e.target.value}))}/>
            <div className="np-row">
              <SelectField name="camera" label="Camera" value={extraDraft.camera} onChange={e=>setExtraDraft(d=>({...d,camera:e.target.value}))} options={['103','104','105'].map(o=>({value:o,label:o}))}/>
              <InputField name="importo" label="Importo (€)" type="number" value={extraDraft.importo} onChange={e=>setExtraDraft(d=>({...d,importo:+e.target.value||0}))}/>
            </div>
            <TextareaField name="descrizione" label="Descrizione" value={extraDraft.descrizione} onChange={e=>setExtraDraft(d=>({...d,descrizione:e.target.value}))} rows={2} placeholder="Note opzionali"/>
            <div className="np-extra-popup-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={()=>{setExtraOpenId(null);setExtraEditId(null)}}>Indietro</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confirmExtra}>
                <i className={extraEditId ? 'fa-light fa-check' : 'fa-light fa-plus'} /> {extraEditId ? 'Salva' : 'Aggiungi'}
              </button>
            </div>
          </div>
        )}

        {extra.length > 0 && (
          <ul className="np-extra-added">
            {extra.map(e => (
              <li key={e.id} className="np-extra-added-row">
                <div className="np-extra-added-info">
                  <span className="np-extra-added-name">{e.servizio}</span>
                  <span className="np-extra-added-meta">{e.quantita} × {e.importo.toFixed(2).replace('.',',')} € · {e.quando}</span>
                </div>
                <div className="np-extra-added-actions">
                  <button type="button" className="np-extra-added-edit" onClick={()=>openExtraEdit(e)} aria-label="Modifica extra">
                    <i className="fa-light fa-pen" />
                  </button>
                  <button type="button" className="np-extra-added-del" onClick={()=>removeExtra(e.id)} aria-label="Elimina extra">
                    <i className="fa-light fa-trash-can" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="np-extra-total">
          <span>Totale servizi:</span>
          <strong>{totaleServizi.toFixed(2).replace('.',',')} €</strong>
        </div>
      </Widget>
    )
  }

  function renderPrezziWidget() {
    return (
      <Widget
        key="prezzi"
        {...fullCommon('prezzi')}
        title="Dettaglio prezzi"
        collapsed={prezziCollapsed}
        onToggleCollapse={() => setPrezziCollapsed(v => !v)}
      >
        <div className="np-table-scroll np-prezzi__scroll">
          <table className="np-table">
            <thead>
              <tr><th>Giorno</th><th>Camera</th><th>Arrangiamento</th><th>Piani</th><th>Promozioni</th><th>Totale</th></tr>
            </thead>
            <tbody>
              {prezzi.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.giorno).toLocaleDateString('it-IT')}</td>
                  <td>{r.camera}</td>
                  <td>{r.arrangiamento}</td>
                  <td>{r.piani}</td>
                  <td>{r.promozioni}</td>
                  <td className="np-amt">{r.totale.toFixed(2).replace('.',',')} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Widget>
    )
  }

  function renderAltreInfoWidget(common: any, isGr: boolean) {
    const f = isGr ? grForm : form
    const setF = isGr ? setGrForm : setForm
    const note: NotaSemplice[] = f.notePrenotazioneList ?? []
    const addNota = () => {
      const testo = f.notePrenotazione.trim()
      if (!testo) return
      setF((v:any)=>({ ...v, notePrenotazioneList: [...(v.notePrenotazioneList ?? []), { id: Date.now().toString(), testo }], notePrenotazione: '' }))
    }
    const removeNota = (id: string) =>
      setF((v:any)=>({ ...v, notePrenotazioneList: (v.notePrenotazioneList ?? []).filter((n: NotaSemplice) => n.id !== id) }))

    return (
      <Widget key="altre" {...common} title="Altre informazioni">
        <SelectField name="nazionalita" label="Nazionalità" value={f.nazionalita} onChange={e=>setF((v:any)=>({...v,nazionalita:e.target.value}))} options={NAZIONALITA.map(o=>({value:o,label:withFlag(o)}))}/>
        <div className="np-noterep__form">
          <TextareaField name="notePrenotazione" label="Note prenotazione" value={f.notePrenotazione} onChange={e=>setF((v:any)=>({...v,notePrenotazione:e.target.value}))} rows={2} placeholder="Inserisci una nota di prenotazione"/>
          <button type="button" className="np-add-row np-noterep__add" onClick={addNota} disabled={!f.notePrenotazione.trim()}>
            <i className="fa-light fa-plus" /> Aggiungi nota
          </button>
        </div>

        {note.length > 0 && (
          <ul className="np-noterep__list">
            {note.map(n => (
              <li key={n.id} className="np-noterep__item">
                <span className="np-noterep__text">{n.testo}</span>
                <button type="button" className="np-row-action np-row-action--danger" aria-label="Elimina nota" title="Elimina nota" onClick={()=>removeNota(n.id)}>
                  <i className="fa-light fa-trash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    )
  }

  function renderNoteRepartoWidget(common: any, isGr: boolean) {
    const f = isGr ? grForm : form
    const setF = isGr ? setGrForm : setForm
    const note: NotaReparto[] = f.noteReparti ?? []
    const addNota = () => {
      const testo = f.notaReparto.trim()
      if (!testo) return
      setF((v:any)=>({ ...v, noteReparti: [...(v.noteReparti ?? []), { id: Date.now().toString(), reparto: v.reparto, testo }], notaReparto: '' }))
    }
    const removeNota = (id: string) =>
      setF((v:any)=>({ ...v, noteReparti: (v.noteReparti ?? []).filter((n: NotaReparto) => n.id !== id) }))

    return (
      <Widget key="note-reparto" {...common} title="Note di reparto">
        <div className="np-noterep__form">
          <SelectField name="reparto" label="Reparto" value={f.reparto} onChange={e=>setF((v:any)=>({...v,reparto:e.target.value}))} options={REPARTI.map(o=>({value:o,label:o}))}/>
          <TextareaField name="notaReparto" label="Nota" value={f.notaReparto} onChange={e=>setF((v:any)=>({...v,notaReparto:e.target.value}))} rows={2} placeholder="Inserisci una nota per il reparto selezionato"/>
          <button type="button" className="np-add-row np-noterep__add" onClick={addNota} disabled={!f.notaReparto.trim()}>
            <i className="fa-light fa-plus" /> Aggiungi nota
          </button>
        </div>

        {note.length > 0 && (
          <ul className="np-noterep__list">
            {note.map(n => (
              <li key={n.id} className="np-noterep__item">
                <span className="np-noterep__badge">{n.reparto}</span>
                <span className="np-noterep__text">{n.testo}</span>
                <button type="button" className="np-row-action np-row-action--danger" aria-label="Elimina nota" title="Elimina nota" onClick={()=>removeNota(n.id)}>
                  <i className="fa-light fa-trash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    )
  }

  function renderAnticipiWidget(common: any, isGr: boolean) {
    const f = isGr ? grForm : form
    const setF = isGr ? setGrForm : setForm
    const rooms = isGr ? camereGr : camereInd
    return (
      <Widget key="anticipi" {...common} title="Anticipi">
        <div className="np-anticipi-top">
          <div className="np-checks-row">
            {(['caparra','acconto'] as const).map(t=>(
              <label key={t} className="np-check">
                <input type="radio" name={`tipoAnticipo-${isGr?'gr':'ind'}`} className="sib-radio" checked={f.tipoAnticipo===t} onChange={()=>setF((v:any)=>({...v,tipoAnticipo:t}))}/>
                <span className="np-capitalize">{t}</span>
              </label>
            ))}
          </div>
          <span className="np-label np-anticipi-tot-label">Importo totale</span>
          <NumCell className="sib-input np-anticipi-tot-input" min={0} decimals={2} value={f.importoAnticipo} onChange={n=>setF((v:any)=>({...v,importoAnticipo:n}))}/>
          <span className="np-anticipi-eur">€</span>
        </div>

        <label className="np-check np-anticipi-ripart">
          <input
            type="checkbox"
            className="sib-checkbox"
            checked={f.ripartizioneAuto}
            onChange={e=>{ const ck = e.target.checked; setF((v:any)=>({...v,ripartizioneAuto:ck})); if (ck) redistribuisci(isGr) }}
          />
          Ripartizione per camera
        </label>

        {!f.ripartizioneAuto && (
          <div className="np-anticipi-quote">
            <div className="np-anticipi-quote-head">
              <span className="np-label">Camera</span>
              <span className="np-label">Quota</span>
              <button type="button" className="np-anticipi-redistrib" title="Ripartisci in parti uguali" aria-label="Ripartisci in parti uguali" onClick={()=>redistribuisci(isGr)}>
                <i className="fa-light fa-arrows-rotate" />
              </button>
            </div>
            {rooms.map((r, i) => (
              <div key={i} className="np-anticipi-quote-row">
                <span className="np-anticipi-quote-cam">{r.nCamera || (i + 1)}</span>
                <div className="np-anticipi-quote-val">
                  <NumCell className="sib-input" min={0} decimals={2} value={f.anticipoQuote[i] ?? 0} onChange={n=>updQuota(isGr, i, n)}/>
                  <span className="np-anticipi-eur">€</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Widget>
    )
  }

  // ── Save handler ─────────────────────────────────────────────────────────────
  const handleSalva = (close = true) => {
    if (activeTab === 'individuale') {
      const sd = new Date(form.dal), ed = new Date(form.al)
      bookingStore.pending = {
        id: Date.now(),
        nome: form.cliente || 'Nuova prenotazione',
        startDay: sd.getDate(), endDay: ed.getDate(),
        startMonth: sd.getMonth(), startYear: sd.getFullYear(),
        row: 0, colore: form.confermata ? T.successMid : T.error,
        camere: form.camere, persone: form.persone, importo: totale,
      }
    } else {
      const sd = new Date(grForm.dal), ed = new Date(grForm.al)
      bookingStore.pending = {
        id: Date.now(),
        nome: grForm.nomeGruppo || 'Gruppo',
        startDay: sd.getDate(), endDay: ed.getDate(),
        startMonth: sd.getMonth(), startYear: sd.getFullYear(),
        row: 0, colore: grForm.confermata ? T.successMid : T.blue,
        camere: grForm.camere, persone: grForm.persone, importo: totale,
      }
    }
    if (close) navigate('tableau-book')
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  const downloadBlob = (content: BlobPart, type: string, filename: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }
  const euro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

  // PDF: riepilogo di tutti i dati della prenotazione
  const scaricaPdfPrenotazione = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const f: any = activeTab === 'individuale' ? form : grForm
    let y = 16
    const nl = (n = 7) => { y += n; if (y > 282) { doc.addPage(); y = 16 } }
    const line = (label: string, val: any) => {
      doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 14, y)
      doc.setFont('helvetica', 'normal'); doc.text(String(val ?? ''), 62, y); nl()
    }
    const heading = (t: string) => { nl(4); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(t, 14, y); doc.setFontSize(10); nl(6) }
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text(editId ? `Modifica Prenotazione N. ${editId}` : 'Riepilogo prenotazione', 14, y); nl(10)
    doc.setFontSize(10)
    heading('Soggiorno')
    line('Check-in', fmtData(f.dal)); line('Check-out', fmtData(f.al))
    line('Camere', f.camere); line('Persone', f.persone)
    line('Arrangiamento', f.arrangiamento)
    line('Stato', f.confermata ? 'Confermata' : (f.opzione ? 'Opzione' : '—'))
    heading('Agenzia & cliente')
    line('Agenzia', f.agenzia || '—')
    if (activeTab === 'individuale') { line('Cliente', form.cliente || '—'); line('E-mail', form.email || '—') }
    else { line('Nome gruppo', grForm.nomeGruppo || '—'); line('Capo gruppo', grForm.nomeCapoGruppo || '—') }
    if (segmenti.length) {
      heading('Gestione segmenti')
      segmenti.forEach((s, i) => line(`Segmento ${i + 1}`, `${fmtData(s.dal)} - ${fmtData(s.al)} · ${s.tipo} · cam ${s.nCamera || '—'} · ${s.persone} pax`))
    }
    if (extra.length) {
      heading('Extra inclusi')
      extra.forEach(e => line(e.servizio, `${e.quantita} × ${euro(e.importo)}`))
    }
    heading('Totali')
    line('Totale soggiorno', euro(totaleSoggiorno))
    line('Totale servizi', euro(totaleServizi))
    line('Totale', euro(totale))
    doc.save(`prenotazione${editId ? '_' + editId : ''}.pdf`)
  }

  // Rooming list — Excel (tabella HTML apribile da Excel)
  const scaricaExcelOspiti = () => {
    const righe = ospiti.map(o =>
      `<tr><td>${o.nome}</td><td>${o.cognome}</td><td>${o.dataNascita}</td><td>${o.paese}</td><td>${o.sesso}</td><td>${o.nCamera}</td><td>${o.dataArrivo}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"></head><body>` +
      `<h3>Rooming list</h3>` +
      `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>` +
      `<th>Nome</th><th>Cognome</th><th>Data di nascita</th><th>Paese di nascita</th><th>Sesso</th><th>N. Camera</th><th>Data di arrivo</th>` +
      `</tr></thead><tbody>${righe}</tbody></table></body></html>`
    downloadBlob(html, 'application/vnd.ms-excel', 'rooming-list.xls')
  }

  // Rooming list — PDF
  const scaricaPdfOspiti = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Rooming list', 14, 16)
    doc.setFontSize(9)
    const cols: [string, number][] = [['Nome', 14], ['Cognome', 45], ['Nascita', 78], ['Paese', 105], ['Sesso', 138], ['Cam.', 152], ['Arrivo', 168]]
    let y = 26
    doc.setFont('helvetica', 'bold'); cols.forEach(([t, x]) => doc.text(t, x, y)); y += 5
    doc.setFont('helvetica', 'normal')
    ospiti.forEach(o => {
      if (y > 285) { doc.addPage(); y = 16 }
      const vals = [o.nome, o.cognome, o.dataNascita, o.paese, o.sesso, o.nCamera, o.dataArrivo]
      vals.forEach((v, k) => doc.text(String(v || '—'), cols[k][1], y))
      y += 5
    })
    doc.save('rooming-list.pdf')
  }

  const activeLayout = activeTab === 'individuale' ? indLayout : grLayout
  const renderWidget = activeTab === 'individuale' ? renderIndWidget : renderGrWidget

  return (
    <div className="np-page">
      <PageHead
        title={editId ? `Modifica Prenotazione N. ${editId}` : 'Nuova prenotazione'}
        subtitle={editId ? 'Modifica i campi della prenotazione e salva per aggiornarla.' : 'Compila i campi per inserire una nuova prenotazione nel sistema'}
        onBack={() => navigate('tableau-book')}
      />

      <div className="np-toolbar">
        <div className="np-tabs" role="tablist" aria-label="Tipo prenotazione">
          <button
            type="button" role="tab" aria-selected={activeTab === 'individuale'}
            className={`np-tab ${activeTab === 'individuale' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('individuale')}
          >
            <i className="fa-light fa-user" aria-hidden="true" /> Individuale
          </button>
          <button
            type="button" role="tab" aria-selected={activeTab === 'gruppo'}
            className={`np-tab ${activeTab === 'gruppo' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('gruppo')}
          >
            <i className="fa-light fa-users" aria-hidden="true" /> Gruppo
          </button>
        </div>
        <div className="np-toolbar-icons">
          <button type="button" className="sib-btn sib-btn--secondary np-importo-btn" onClick={scaricaPdfPrenotazione}>
            <i className="fa-light fa-file-pdf" /> Scarica PDF
          </button>
          <button type="button" className="sib-btn sib-btn--primary np-importo-btn" onClick={()=>setImportoModalOpen(true)}>
            <i className="fa-light fa-money-bill" /> Modifica importo globale
          </button>
        </div>
      </div>

      {/* Soggiorno ancorato a piena larghezza: la tabella camere entra tutta */}
      {activeTab === 'individuale' ? renderIndWidget('soggiorno', true) : renderGrWidget('soggiorno-gr', true)}

      <div className="np-columns">
        {activeLayout.layout.map((col, ci) => (
          <div
            key={ci}
            className="np-column"
            onDragOver={(e)=>{ e.preventDefault() }}
            onDrop={(e)=>activeLayout.handleColumnDrop(e, ci)}
          >
            {col.map(id => renderWidget(id))}
          </div>
        ))}
      </div>

      {/* Card full-width riordinabili verticalmente (trascinamento) */}
      {fullOrder.map(id =>
        id === 'segmenti' ? renderSegmentiWidget()
        : id === 'prezzi' ? renderPrezziWidget()
        : renderOspitiWidget())}

      <footer className="np-footer">
        <div className="np-totals">
          <div className="np-total">
            <span className="np-total-label">Soggiorno</span>
            <span className="np-total-val">{totaleSoggiorno.toFixed(2).replace('.',',')} €</span>
          </div>
          <div className="np-total">
            <span className="np-total-label">Servizi</span>
            <span className="np-total-val">{totaleServizi.toFixed(2).replace('.',',')} €</span>
          </div>
          <div className="np-total np-total--strong">
            <span className="np-total-label">Totale</span>
            <span className="np-total-val">{totale.toFixed(2).replace('.',',')} €</span>
          </div>
        </div>
        <div className="np-footer-actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={()=>navigate('tableau-book')}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={()=>handleSalva(false)}>Salva e prosegui</button>
          <button type="button" className="sib-btn sib-btn--primary"   onClick={()=>handleSalva(true)}>Salva e chiudi</button>
        </div>
      </footer>

      <Modal open={importoModalOpen} onClose={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }} size="xl">
        <div className="modimp">
          <header className="modimp__head">
            <div className="modimp__head-text">
              <h2 className="modimp__title">Modifica importo globale</h2>
              <p className="modimp__subtitle">Sovrascrivi gli importi del soggiorno con un valore fisso o una variazione percentuale dal listino.</p>
            </div>
            <button className="modimp__close" onClick={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }} aria-label="Chiudi">
              <Ico n="x" s={18} c="currentColor" />
            </button>
          </header>

          <div className="modimp__body">
            <section className="modimp__section">
              <div className="modimp__toggle-row">
                <ToggleSwitch checked={modGlobalActive} onChange={setModGlobalActive} />
                <div className="modimp__toggle-label">
                  <span className="modimp__toggle-title">Applica modifica globale</span>
                  <span className="modimp__toggle-hint">Calcola in automatico tutti gli importi delle righe sottostanti.</span>
                </div>
              </div>

              {modGlobalActive && (
                <div className="modimp__panel">
                  <div className="modimp__panel-row">
                    <span className="modimp__panel-label">Modalità</span>
                    <div className="modimp__segmented">
                      <label className={`modimp__seg ${modGlobalMode==='libero'?'modimp__seg--on':''}`}>
                        <input type="radio" name="modGlobalMode" checked={modGlobalMode==='libero'} onChange={()=>setModGlobalMode('libero')} />
                        Importo libero
                      </label>
                      <label className={`modimp__seg ${modGlobalMode==='percentuale'?'modimp__seg--on':''}`}>
                        <input type="radio" name="modGlobalMode" checked={modGlobalMode==='percentuale'} onChange={()=>setModGlobalMode('percentuale')} />
                        Percentuale
                      </label>
                    </div>
                  </div>

                  <div className="modimp__panel-row">
                    <span className="modimp__panel-label">{modGlobalMode==='libero' ? 'Importo' : 'Variazione'}</span>
                    <div className="modimp__amount-wrap">
                      <input
                        type="number"
                        step="0.01"
                        className="sib-input modimp__amount"
                        value={modGlobalValue}
                        onChange={e=>setModGlobalValue(+e.target.value||0)}
                      />
                      <span className="modimp__amount-suffix">{modGlobalMode==='libero' ? '€' : '%'}</span>
                    </div>
                    <span className="modimp__listino">Listino: <strong>{prezzi[0]?.listino.toFixed(2).replace('.',',')} €</strong></span>
                  </div>

                  <div className="modimp__panel-actions">
                    <Button variant="secondary" size="sm" onClick={resetModGlobal}>Ripristina listino</Button>
                    <Button variant="primary"   size="sm" icon="check" onClick={applyModGlobal}>Applica a tutte le righe</Button>
                  </div>
                </div>
              )}
            </section>

            <section className="modimp__section">
              <header className="modimp__section-head">
                <h3 className="modimp__section-title">Dettaglio prezzi</h3>
                <span className="modimp__section-meta">{prezzi.length} righ{prezzi.length===1?'a':'e'}</span>
              </header>
              <div className="modimp__table-wrap">
                <table className="np-table">
                  <thead>
                    <tr>
                      <th>Giorno</th><th>Camera</th><th>Arrangiamento</th><th>Piani</th><th>Promozioni</th><th className="modimp__th-right">Totale</th><th className="np-col-actions" aria-label="Azioni" />
                    </tr>
                  </thead>
                  <tbody>
                    {prezzi.map((r, i) => (
                      <tr key={i} className={editRowIdx===i ? 'modimp__row--editing' : ''}>
                        <td>{new Date(r.giorno).toLocaleDateString('it-IT')}</td>
                        <td>{r.camera}</td>
                        <td>{r.arrangiamento}</td>
                        <td>{r.piani || '—'}</td>
                        <td>{r.promozioni || '—'}</td>
                        <td className="modimp__td-right">
                          {editRowIdx === i ? (
                            <div className="modimp__inline-edit">
                              <input
                                type="number"
                                step="0.01"
                                autoFocus
                                className="sib-input modimp__inline-input"
                                value={editRowValue}
                                onChange={e=>setEditRowValue(+e.target.value||0)}
                                onKeyDown={e=>{ if(e.key==='Enter') confirmEditRow(); if(e.key==='Escape') cancelEditRow() }}
                              />
                              <span className="modimp__amount-suffix">€</span>
                            </div>
                          ) : (
                            <span className="np-amt">{r.totale.toFixed(2).replace('.',',')} €</span>
                          )}
                        </td>
                        <td className="np-col-actions">
                          {editRowIdx === i ? (
                            <>
                              <button type="button" className="np-row-action np-row-action--ok" aria-label="Conferma" onClick={confirmEditRow}><i className="fa-solid fa-check" /></button>
                              <button type="button" className="np-row-action" aria-label="Annulla" onClick={cancelEditRow}><i className="fa-solid fa-xmark" /></button>
                            </>
                          ) : (
                            <button type="button" className="np-row-action" aria-label="Modifica" onClick={()=>startEditRow(i)}>
                              <i className="fa-solid fa-pen-to-square" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modimp__totals-bar">
                <span className="modimp__totals-label">Totale soggiorno</span>
                <span className="modimp__totals-val">{totaleSoggiorno.toFixed(2).replace('.',',')} €</span>
              </div>
            </section>
          </div>

          <footer className="modimp__foot">
            <FormActions
              cancelLabel="Annulla"
              confirmLabel="Salva modifiche"
              onCancel={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }}
              onConfirm={()=>{ setImportoModalOpen(false); setEditRowIdx(null) }}
            />
          </footer>
        </div>
      </Modal>

      {/* Alert: camera in blocco fantasma nel periodo selezionato */}
      {/* Dettaglio camere: una riga per camera, tutti i parametri modificabili */}
      <Modal
        open={dettaglioIdx !== null && !!camereGr[dettaglioIdx]}
        onClose={()=>setDettaglioIdx(null)}
        title="Dettaglio camere"
        size="xl"
        className="np-dett-modal"
      >
        {dettaglioIdx !== null && camereGr[dettaglioIdx] && (() => {
          const i = dettaglioIdx
          const c = camereGr[i]
          const dd = dettagliDi(c)
          const assegnate = dd.filter(d => d.numero).length
          return (
            <div className="np-dett">
              <div className="np-dett__head">
                <span className="np-dett__hotel">{grForm.hotel}</span>
                <span className="np-dett__sub">
                  {c.quantita} {c.quantita === 1 ? 'camera' : 'camere'} · totale riga {euro(totaleRigaGr(c))}
                  {' '}· i parametri si modificano camera per camera con la matita
                </span>
              </div>

              <table className="np-table np-table--edit np-table--dett">
                <colgroup>
                  <col className="np-d-idx" /><col className="np-d-tipo" />
                  <col className="np-d-num" /><col className="np-d-num" /><col className="np-d-num" /><col className="np-d-num" />
                  <col className="np-d-prezzo" /><col className="np-d-arr" />
                  <col className="np-d-data" /><col className="np-d-data" />
                  <col className="np-d-note" />
                  <col className="np-d-tot" /><col className="np-d-sel" /><col className="np-d-act" />
                </colgroup>
                <thead>
                  <tr>
                    <th><TruncatedText text="Camera" /></th>
                    <th><TruncatedText text="Tipologia camera" /></th>
                    <th><TruncatedText text="Adulti" /></th>
                    <th><TruncatedText text="Ragazzi" /></th>
                    <th><TruncatedText text="Bambini" /></th>
                    <th><TruncatedText text="Infanti" /></th>
                    <th><TruncatedText text="Prezzo p.p." full="Prezzo a persona per il soggiorno" /></th>
                    <th><TruncatedText text="Arrang." full="Arrangiamento" /></th>
                    <th><TruncatedText text="Data in" /></th>
                    <th><TruncatedText text="Data out" /></th>
                    <th><TruncatedText text="Note" /></th>
                    <th className="np-amt">Totale</th>
                    <th><TruncatedText text="N. camera" /></th>
                    <th className="np-col-actions" aria-label="Azioni" />
                  </tr>
                </thead>
                <tbody>
                  {dd.map((d, k) => {
                    const key = `${c.id}:${k}`
                    const ed  = inModifica(key)
                    const tipoLabel = TIPI_CAMERA.find(t => t.v === d.tipo)?.l ?? d.tipo
                    const num = (f: 'adulti'|'ragazzi'|'bambini'|'infanti') => ed
                      ? <NumCell className="sib-input np-cell-input np-cell-input--num" min={0} value={d[f]} onChange={n=>updDettaglioGr(i,k,{[f]:n})}/>
                      : <span className="np-cell-ro">{d[f]}</span>
                    return (
                      <tr key={key}>
                        <td><span className="np-cell-ro">{k + 1}</span></td>
                        <td>
                          {ed ? (
                            <Tooltip text={tipoLabel}>
                              <select className="sib-input np-cell-input np-cell-input--tipo" value={d.tipo} onChange={e=>updDettaglioGr(i,k,{tipo:e.target.value})}>
                                {TIPI_CAMERA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                              </select>
                            </Tooltip>
                          ) : <TruncatedText className="np-cell-ro" text={tipoLabel} />}
                        </td>
                        <td>{num('adulti')}</td>
                        <td>{num('ragazzi')}</td>
                        <td>{num('bambini')}</td>
                        <td>{num('infanti')}</td>
                        <td>
                          {ed
                            ? <NumCell className="sib-input np-cell-input np-cell-input--num" min={0} step={1} decimals={2} value={d.prezzoPersona} onChange={n=>updDettaglioGr(i,k,{prezzoPersona:n})}/>
                            : <span className="np-cell-ro">{euro(d.prezzoPersona)}</span>}
                        </td>
                        <td>
                          {ed ? (
                            <select className="sib-input np-cell-input" value={d.arrangiamento} onChange={e=>updDettaglioGr(i,k,{arrangiamento:e.target.value})}>
                              {ARRANGIAMENTI.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          ) : <span className="np-cell-ro">{d.arrangiamento}</span>}
                        </td>
                        <td>
                          {ed
                            ? <input type="date" className="sib-input np-cell-input np-cell-input--data" value={d.dataIn} onChange={e=>updDettaglioGr(i,k,{dataIn:e.target.value})}/>
                            : <span className="np-cell-ro">{fmtData(d.dataIn) || '—'}</span>}
                        </td>
                        <td>
                          {ed
                            ? <input type="date" className="sib-input np-cell-input np-cell-input--data" value={d.dataOut} onChange={e=>updDettaglioGr(i,k,{dataOut:e.target.value})}/>
                            : <span className="np-cell-ro">{fmtData(d.dataOut) || '—'}</span>}
                        </td>
                        <td>
                          {/* La nota è della singola camera: si legge dal tooltip
                              anche a riga bloccata, si scrive con la matita */}
                          {ed
                            ? <input
                                type="text" className="sib-input np-cell-input"
                                value={d.note}
                                placeholder="culla, piano alto…"
                                aria-label={`Nota della camera ${k + 1}`}
                                onChange={e=>updDettaglioGr(i,k,{note:e.target.value})}
                              />
                            : d.note
                              ? <Tooltip text={d.note}><span className="np-cell-ro np-cell-nota"><i className="fa-solid fa-note-sticky" aria-hidden="true" /> {d.note}</span></Tooltip>
                              : <span className="np-cell-ro np-cell-ro--misto">—</span>}
                        </td>
                        <td className="np-amt">{euro(totaleDett(d))}</td>
                        <td>
                          {/* L'assegnazione resta sempre disponibile, anche a riga bloccata */}
                          <div className="np-dett__assign">
                            <select
                              className="sib-input np-cell-input"
                              aria-label={`Numero camera ${k + 1}`}
                              value={d.numero}
                              onChange={e=>updDettaglioGr(i, k, { numero: e.target.value })}
                            >
                              <option value="">—</option>
                              {CAMERE.map(nr => (
                                <option key={nr} value={nr}>
                                  {nr}{bloccoPerCameraPeriodo(blocchiFantasma, nr, d.dataIn, d.dataOut) ? ' 👻' : ''}
                                </option>
                              ))}
                            </select>
                            {!!bloccoPerCameraPeriodo(blocchiFantasma, d.numero, d.dataIn, d.dataOut) && (
                              <Tooltip text="Camera in blocco fantasma">
                                <GhostIcon className="np-ghost-ico" title="Camera in blocco fantasma" />
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="np-col-actions">
                          {ed ? (
                            <button type="button" className="np-row-action np-row-action--ok" aria-label="Conferma la camera" onClick={()=>chiudiModifica(key)}>
                              <Tooltip text="Conferma la camera"><i className="fa-solid fa-check" /></Tooltip>
                            </button>
                          ) : (
                            <button type="button" className="np-row-action" aria-label="Modifica la camera" onClick={()=>apriModifica(key)}>
                              <Tooltip text="Modifica la camera"><i className="fa-solid fa-pen" /></Tooltip>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="np-dett__foot">
                <span className="np-dett__count">Assegnate {assegnate} di {c.quantita}</span>
                <button type="button" className="sib-btn sib-btn--primary" onClick={()=>setDettaglioIdx(null)}>Chiudi</button>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal open={!!ghostAlert} onClose={cancelGhostAlert} title="Camera in blocco fantasma" size="sm">
        {ghostAlert && (
          <>
            <p className="np-ghost-alert-text">
              La camera <strong>{ghostAlert.block.numeroCamera}</strong> risulta in blocco fantasma nel
              periodo selezionato. Confermando, l’intero blocco verrà rimosso.
            </p>
            <div className="np-ghost-alert-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={cancelGhostAlert}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={confirmGhostAlert}>Conferma</button>
            </div>
          </>
        )}
      </Modal>

    </div>
  )
}
