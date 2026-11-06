// Conti camera — tipi e dati demo.
//
// Il conto di un soggiorno è fatto di addebiti, anticipi, documenti emessi e
// di uno STORICO: il registro di ogni azione compiuta su quella camera per quel
// soggiorno (cambi camera, addebiti aggiunti/modificati/frazionati/trasferiti/
// eliminati, richieste degli ospiti, pagamenti, tassa di soggiorno).
// Il backend (frontoffice/GetContiCamera) restituisce lo stesso formato; finché
// non risponde la pagina usa il soggiorno demo della struttura selezionata.

import { pmsAttivo, inCasa, ARRANGIAMENTO } from '../_data/pmsDemo'

// ─── TIPI ─────────────────────────────────────────────────────────────────────

export interface Dettaglio {
  prenotazioneNum: string
  nominativo: string
  camera: string
  dataArrivo: string
  dataPartenza: string
  giorni: number
  ospiti: number
  agenzia: string
  credit: string
  struttura: string
  arrangiamento: string
  nCamere: number
  totale: number
  diCuiCamere: number
  diCuiServizi: number
  diCuiTasse: number
  pagato: number
  daPagare: number
  note: string
  /** Ospiti del soggiorno: servono a scegliere chi paga e a chi addebitare. */
  nomiOspiti?: string[]
}

export type StatoTassa = 'pagata' | 'da-pagare'

/** Pagamento della tassa di soggiorno di una notte. */
export interface TassaInfo {
  stato: StatoTassa
  /** Adulti soggetti all'imposta e ospiti esenti (minori). */
  tassati: number
  esenti: number
  /** Chi l'ha pagata: un ospite, l'agenzia, l'intestatario del conto. */
  pagataDa?: string
  metodo?: string
  /** Data e ora del pagamento (gg/mm/aaaa hh:mm). */
  il?: string
  operatore?: string
}

export interface Addebito {
  id: number
  camera: string
  /** gg/mm/aaaa */
  data: string
  /** aaaa-mm-gg: per ordinare */
  iso: string
  pertinenza: string
  descrizione: string
  prezzo: number
  iva: number
  /** Provenienza del trasferimento (es. "da 214"), vuoto se mai trasferito. */
  trasf: string
  /** Presente solo sulle righe "Tassa di soggiorno". */
  tassa?: TassaInfo
}

export interface Anticipo {
  id: number
  camera: string
  data: string
  tipologia: string
  prezzo: number
  iva: number
  trasf: string
}

export interface Documento {
  id: number
  documento: string
  data: string
  intestatario: string
  totale: number
  pagato: number
  sospeso: number
}

export type TipoAzione =
  | 'Prenotazione'
  | 'Check-in'
  | 'Cambio camera'
  | 'Addebito'
  | 'Modifica'
  | 'Frazionamento'
  | 'Trasferimento'
  | 'Eliminazione'
  | 'Richiesta ospite'
  | 'Pagamento'
  | 'Tassa di soggiorno'
  | 'Nota'

export const TIPI_AZIONE: TipoAzione[] = [
  'Prenotazione', 'Check-in', 'Cambio camera', 'Addebito', 'Modifica', 'Frazionamento',
  'Trasferimento', 'Eliminazione', 'Richiesta ospite', 'Pagamento', 'Tassa di soggiorno', 'Nota',
]

/** Icona Font Awesome (fa-solid) per ogni tipo di azione. */
export const ICONA_AZIONE: Record<TipoAzione, string> = {
  'Prenotazione':       'fa-calendar-check',
  'Check-in':           'fa-key',
  'Cambio camera':      'fa-door-open',
  'Addebito':           'fa-circle-plus',
  'Modifica':           'fa-pen',
  'Frazionamento':      'fa-arrows-split-up-and-left',
  'Trasferimento':      'fa-right-left',
  'Eliminazione':       'fa-trash',
  'Richiesta ospite':   'fa-bell-concierge',
  'Pagamento':          'fa-credit-card',
  'Tassa di soggiorno': 'fa-landmark',
  'Nota':               'fa-note-sticky',
}

/** Una riga dello storico del conto. */
export interface Azione {
  id: number
  /** aaaa-mm-ggThh:mm — per ordinare e filtrare. */
  ts: string
  tipo: TipoAzione
  camera: string
  /** Camera di provenienza (cambio camera, trasferimenti): l'azione compare
   *  nello storico di entrambe le camere. */
  cameraDa?: string
  descrizione: string
  /** Importo coinvolto (positivo = addebito, negativo = incasso/storno). */
  importo?: number
  operatore: string
  /** Precisazione: motivazione, valori prima/dopo, chi ha pagato… */
  dettaglio?: string
}

export interface Data {
  dettaglio: Dettaglio
  addebiti: Addebito[]
  anticipi: Anticipo[]
  documenti: Documento[]
  storico?: Azione[]
}

// ─── UTILITÀ ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDi = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const itDi = (iso: string) => iso.split('-').reverse().join('/')
const piuGiorni = (iso: string, n: number) => { const t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + n); return isoDi(t) }
/** aaaa-mm-ggThh:mm → gg/mm/aaaa hh:mm */
export const tsIt = (ts: string) => `${itDi(ts.slice(0, 10))} ${ts.slice(11, 16)}`
/** Adesso, nel formato dello storico. */
export const tsOra = () => { const d = new Date(); return `${isoDi(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
/** gg/mm/aaaa → aaaa-mm-gg (se il formato non torna, oggi). */
export const isoDaIt = (it: string) => {
  const m = it.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}` : isoDi(new Date())
}

export const TASSA_PER_ADULTO = 3.5
export const round2 = (v: number) => Math.round(v * 100) / 100

const OPERATORI = ['M. Ferri · Reception', 'L. Conti · Reception', 'G. Sala · Night audit', 'A. Riva · Guest relation']

// ─── DEMO ─────────────────────────────────────────────────────────────────────

/** Conto vuoto: nessun soggiorno in casa nella struttura. */
function contoVuoto(struttura: string): Data {
  return {
    dettaglio: { prenotazioneNum: '', nominativo: '', camera: '', dataArrivo: '', dataPartenza: '', giorni: 0, ospiti: 0, agenzia: '', credit: '', struttura, arrangiamento: '', nCamere: 0, totale: 0, diCuiCamere: 0, diCuiServizi: 0, diCuiTasse: 0, pagato: 0, daPagare: 0, note: '' },
    addebiti: [], anticipi: [], documenti: [], storico: [],
  }
}

// Il conto del primo soggiorno in casa nel gestionale demo della struttura
// selezionata, con le varianti di un soggiorno reale: cambio camera dopo la
// prima notte (gli addebiti della camera di partenza vengono trasferiti),
// servizi extra, richieste degli ospiti, un importo corretto con motivazione,
// caparra e tassa di soggiorno pagata in parte, da ospiti diversi.
export function datiDemo(struttura: string): Data {
  const oggi = isoDi(new Date())
  const pms = pmsAttivo()
  const x = pms.prenotazioni.find((p) => inCasa(p, oggi) && p.checkIn < oggi)
  if (!x) return contoVuoto(struttura)

  const notti = Math.max(1, Math.round((new Date(x.checkOut).getTime() - new Date(x.checkIn).getTime()) / 86400000))
  const prezzo = round2(x.importo / notti)
  const adulti = x.ospiti.filter((o) => o.fascia === 'Adulto')
  const esenti = x.ospiti.length - adulti.length
  const tassa = TASSA_PER_ADULTO * x.adulti
  const titolare = x.ospiti[0].nome
  const secondo = adulti.find((o) => o.nome !== titolare)?.nome ?? x.ospiti.find((o) => o.nome !== titolare)?.nome ?? titolare
  const agenzia = ['Diretto', 'Sito web'].includes(x.canale) ? '' : x.canale
  const op = (i: number) => OPERATORI[(Number(x.booking) + i) % OPERATORI.length]

  // Camera di partenza (cambio camera dopo la prima notte), solo se il
  // soggiorno ha almeno due notti già trascorse.
  const giorniTrascorsi = Math.round((new Date(oggi).getTime() - new Date(x.checkIn).getTime()) / 86400000)
  const conCambio = notti >= 2 && giorniTrascorsi >= 2
  const altra = pms.camere.find((c) => c.numero !== x.camera && c.categoria === pms.camere.find((k) => k.numero === x.camera)?.categoria)
    ?? pms.camere.find((c) => c.numero !== x.camera)
  const camPrima = conCambio && altra ? altra.numero : x.camera

  const addebiti: Addebito[] = []
  const storico: Azione[] = []
  const add = (a: Omit<Addebito, 'id'>) => { addebiti.push({ ...a, id: addebiti.length + 1 }); return addebiti[addebiti.length - 1] }
  const log = (a: Omit<Azione, 'id'>) => storico.push({ ...a, id: storico.length + 1 })

  // Prenotazione e caparra
  const camere = round2(prezzo * notti)
  const caparra = Math.max(50, Math.round((camere * 0.25) / 10) * 10)
  const meno = (n: number) => piuGiorni(x.checkIn, -n)
  log({ ts: `${meno(21)}T10:42`, tipo: 'Prenotazione', camera: camPrima, descrizione: `Prenotazione n. ${x.booking} creata`, operatore: agenzia ? `Channel manager · ${agenzia}` : op(0), dettaglio: `${notti} notti, ${x.ospiti.length} ospiti, ${ARRANGIAMENTO[x.arrangiamento].label}` })
  log({ ts: `${meno(3)}T16:05`, tipo: 'Pagamento', camera: camPrima, descrizione: 'Caparra incassata', importo: -caparra, operatore: op(1), dettaglio: `Bonifico da ${titolare}` })

  // Notti: soggiorno + tassa di soggiorno
  for (let n = 0; n < notti; n++) {
    const iso = piuGiorni(x.checkIn, n)
    const passata = iso < oggi
    const camNotte = conCambio && n === 0 ? camPrima : x.camera
    add({ camera: x.camera, data: itDi(iso), iso, pertinenza: 'Ospite', descrizione: ARRANGIAMENTO[x.arrangiamento].label, prezzo, iva: 10, trasf: camNotte !== x.camera ? `da ${camNotte}` : '' })

    // Tassa: la prima notte la incassa l'agenzia (se c'è) o il titolare al
    // check-in; le notti già trascorse le paga il secondo ospite; le altre
    // sono ancora da pagare.
    let info: TassaInfo = { stato: 'da-pagare', tassati: x.adulti, esenti }
    if (n === 0) {
      info = agenzia
        ? { stato: 'pagata', tassati: x.adulti, esenti, pagataDa: `${agenzia} (agenzia)`, metodo: 'Prepagata', il: `${itDi(meno(21))} 10:42`, operatore: `Channel manager · ${agenzia}` }
        : { stato: 'pagata', tassati: x.adulti, esenti, pagataDa: titolare, metodo: 'Carta di credito', il: `${itDi(x.checkIn)} 15:20`, operatore: op(2) }
    } else if (passata) {
      info = { stato: 'pagata', tassati: x.adulti, esenti, pagataDa: secondo, metodo: 'Contanti', il: `${itDi(iso)} 09:15`, operatore: op(3) }
    }
    add({ camera: x.camera, data: itDi(iso), iso, pertinenza: 'Ospite', descrizione: 'Tassa di soggiorno', prezzo: tassa, iva: 0, trasf: camNotte !== x.camera ? `da ${camNotte}` : '', tassa: info })
  }

  // Check-in
  log({ ts: `${x.checkIn}T15:20`, tipo: 'Check-in', camera: camPrima, descrizione: `Check-in di ${x.ospiti.length} ospiti`, operatore: op(2), dettaglio: x.ospiti.map((o) => o.nome).join(', ') })
  const t0 = addebiti.find((a) => a.tassa && a.iso === x.checkIn)
  if (t0?.tassa?.stato === 'pagata') {
    log({ ts: agenzia ? `${meno(21)}T10:43` : `${x.checkIn}T15:22`, tipo: 'Tassa di soggiorno', camera: camPrima, descrizione: `Tassa di soggiorno del ${itDi(x.checkIn)} pagata`, importo: -tassa, operatore: t0.tassa.operatore!, dettaglio: `Pagata da ${t0.tassa.pagataDa} · ${t0.tassa.metodo}` })
  }

  // Prima sera: richiesta ospite e frigobar (in camera di partenza)
  const g1 = x.checkIn
  log({ ts: `${g1}T21:10`, tipo: 'Richiesta ospite', camera: camPrima, descrizione: 'Cuscino anallergico e coperta extra', operatore: op(2), dettaglio: `Richiesta di ${titolare} al telefono · eseguita dal piano alle 21:35` })
  const frigo = add({ camera: x.camera, data: itDi(g1), iso: g1, pertinenza: 'Camera', descrizione: 'Frigo bar', prezzo: 14, iva: 22, trasf: conCambio ? `da ${camPrima}` : '' })
  log({ ts: `${g1}T23:40`, tipo: 'Addebito', camera: camPrima, descrizione: 'Frigo bar', importo: frigo.prezzo, operatore: op(2), dettaglio: '2 acque, 1 birra, 1 snack' })

  if (conCambio) {
    const g2 = piuGiorni(x.checkIn, 1)
    log({ ts: `${g2}T08:25`, tipo: 'Richiesta ospite', camera: camPrima, descrizione: 'Cambio camera richiesto', operatore: op(0), dettaglio: `${titolare}: rumore dall'ascensore, chiede una camera più tranquilla` })
    log({ ts: `${g2}T11:05`, tipo: 'Cambio camera', camera: x.camera, cameraDa: camPrima, descrizione: `Spostamento da camera ${camPrima} a camera ${x.camera}`, operatore: op(0), dettaglio: 'Stessa categoria, nessun supplemento' })
    const daTrasferire = addebiti.filter((a) => a.trasf === `da ${camPrima}`)
    log({ ts: `${g2}T11:07`, tipo: 'Trasferimento', camera: x.camera, cameraDa: camPrima, descrizione: `${daTrasferire.length} addebiti trasferiti da camera ${camPrima}`, importo: round2(daTrasferire.reduce((s, a) => s + a.prezzo, 0)), operatore: op(0), dettaglio: daTrasferire.map((a) => `${a.descrizione} ${a.data}`).join(', ') })

    // Lavanderia, poi parcheggio corretto con motivazione
    const lav = add({ camera: x.camera, data: itDi(g2), iso: g2, pertinenza: 'Ospite', descrizione: 'Lavanderia', prezzo: 18, iva: 22, trasf: '' })
    log({ ts: `${g2}T09:30`, tipo: 'Richiesta ospite', camera: x.camera, descrizione: 'Servizio lavanderia express', operatore: op(3), dettaglio: `Richiesta di ${secondo} · consegna in giornata` })
    log({ ts: `${g2}T18:10`, tipo: 'Addebito', camera: x.camera, descrizione: 'Lavanderia', importo: lav.prezzo, operatore: op(3), dettaglio: '3 capi, express' })
    const park = add({ camera: x.camera, data: itDi(g2), iso: g2, pertinenza: 'Prenotazione', descrizione: 'Parcheggio', prezzo: 15, iva: 22, trasf: '' })
    log({ ts: `${g2}T19:00`, tipo: 'Addebito', camera: x.camera, descrizione: 'Parcheggio', importo: 20, operatore: op(1) })
    log({ ts: `${g2}T19:12`, tipo: 'Modifica', camera: x.camera, descrizione: 'Parcheggio: importo da 20,00 € a 15,00 €', importo: park.prezzo, operatore: op(1), dettaglio: 'Motivazione: tariffa convenzionata ospiti in cambio camera' })

    // Tassa delle notti già trascorse pagata dal secondo ospite
    addebiti.filter((a) => a.tassa?.stato === 'pagata' && a.iso !== x.checkIn).forEach((a) =>
      log({ ts: `${a.iso}T09:15`, tipo: 'Tassa di soggiorno', camera: x.camera, descrizione: `Tassa di soggiorno del ${a.data} pagata`, importo: -a.prezzo, operatore: a.tassa!.operatore!, dettaglio: `Pagata da ${a.tassa!.pagataDa} · ${a.tassa!.metodo}` }))
  }

  if (x.note) log({ ts: `${x.checkIn}T15:25`, tipo: 'Nota', camera: camPrima, descrizione: 'Nota sul soggiorno', operatore: op(2), dettaglio: x.note })

  // Richiesta di late check-out per l'ultimo giorno
  log({ ts: `${oggi}T08:50`, tipo: 'Richiesta ospite', camera: x.camera, descrizione: 'Late check-out alle 14:00', operatore: op(0), dettaglio: `Richiesta di ${titolare} · in attesa di conferma da Housekeeping` })

  addebiti.sort((a, b) => a.iso.localeCompare(b.iso) || a.id - b.id)
  storico.sort((a, b) => a.ts.localeCompare(b.ts))

  const tasse = round2(addebiti.filter((a) => a.tassa).reduce((s, a) => s + a.prezzo, 0))
  const soggiorno = ARRANGIAMENTO[x.arrangiamento].label
  const servizi = round2(addebiti.filter((a) => !a.tassa && a.descrizione !== soggiorno).reduce((s, a) => s + a.prezzo, 0))
  const tassePagate = round2(addebiti.filter((a) => a.tassa?.stato === 'pagata').reduce((s, a) => s + a.prezzo, 0))
  const pagato = round2(caparra + tassePagate)
  const totale = round2(camere + servizi + tasse)
  const arrivoMeno3 = meno(3)

  return {
    dettaglio: {
      prenotazioneNum: x.booking, nominativo: x.nominativo, camera: x.camera, dataArrivo: itDi(x.checkIn), dataPartenza: itDi(x.checkOut),
      giorni: notti, ospiti: x.ospiti.length, agenzia: x.canale, credit: 'NC', struttura,
      arrangiamento: ARRANGIAMENTO[x.arrangiamento].label, nCamere: 1,
      totale, diCuiCamere: camere, diCuiServizi: servizi, diCuiTasse: tasse,
      pagato, daPagare: round2(totale - pagato), note: x.note,
      nomiOspiti: x.ospiti.map((o) => o.nome),
    },
    addebiti,
    anticipi: [{ id: 1, camera: x.camera, data: itDi(x.checkIn), tipologia: 'Caparra', prezzo: -caparra, iva: 0, trasf: '' }],
    documenti: [{ id: 1, documento: `Caparra n. ${Number(x.booking) % 90 + 10}`, data: itDi(arrivoMeno3), intestatario: titolare, totale: caparra, pagato: caparra, sospeso: 0 }],
    storico,
  }
}

/** L'azione riguarda la camera (come camera dell'azione o di provenienza). */
export const riguardaCamera = (a: Azione, camera: string) => a.camera === camera || a.cameraDa === camera

/** Camere toccate dal conto (addebiti e storico), quella del conto per prima. */
export const camereDelConto = (d: Data) => {
  const set = new Set<string>([d.dettaglio.camera])
  d.addebiti.forEach((a) => set.add(a.camera))
  ;(d.storico ?? []).forEach((a) => { set.add(a.camera); if (a.cameraDa) set.add(a.cameraDa) })
  return Array.from(set).filter(Boolean)
}

/** Camere della struttura (per trasferimenti e anticipi). */
export const camereStruttura = () => pmsAttivo().camere.map((c) => c.numero)
