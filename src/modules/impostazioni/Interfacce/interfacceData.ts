// ─── Interfacce: sistemi esterni collegati a Sibylla ─────────────────────────
//  Ogni sistema scambia uno o più flussi di dati (in entrata, in uscita o in
//  entrambe le direzioni) con una frequenza; storico delle ultime 24 ore e,
//  se c'è, l'errore in corso con la causa e il rimedio. Dati d'esempio a
//  ridosso di adesso: il BE fornirà lo stato reale delle integrazioni.

export type Stato = 'Operativo' | 'Avviso' | 'Errore' | 'Sospeso'
export const STATI: Stato[] = ['Operativo', 'Avviso', 'Errore', 'Sospeso']

export type Direzione = 'in' | 'out' | 'both'

export interface Flusso {
  nome: string
  direzione: Direzione
  frequenza: string
  ultimo: Date | null
  record: number
  stato: Stato
  nota?: string
}

export interface ErroreInterfaccia {
  codice: string
  messaggio: string
  rimedio: string
  dal: Date
  /** true se si risolve con un nuovo tentativo (timeout, servizio giù). */
  transitorio: boolean
}

export interface Sistema {
  id: string
  nome: string
  sigla: string
  tipologia: string
  descrizione: string
  protocollo: string
  endpoint: string
  stato: Stato
  errore?: ErroreInterfaccia
  flussi: Flusso[]
  /** Esito delle sincronizzazioni nelle ultime 24 ore, un valore per ora. */
  storico: (boolean | null)[]
}

export const TIPOLOGIE = [
  'Centrale prenotazioni', 'Fonti esterne', 'Contabilità', 'Marketing', 'Booking engine (mirroring)',
]

const fa = (min: number) => new Date(Date.now() - min * 60_000)

/** Storico orario: `ko` = ore in errore (contate a ritroso da adesso). */
const storico = (seme: number, ko: number[] = [], vuoto = false): (boolean | null)[] =>
  Array.from({ length: 24 }, (_, i) => {
    if (vuoto) return false
    const ore = 23 - i
    if (ko.includes(ore)) return false
    return ((seme * 31 + i * 17) % 23) === 0 ? null : true
  })

const MIRRORING = (ultimo: Date | null, stato: Stato, nota?: string): Flusso[] => [
  { nome: 'Prenotazioni', direzione: 'in', frequenza: 'in tempo reale', ultimo, record: 2, stato, nota },
  { nome: 'Tariffe e disponibilità', direzione: 'out', frequenza: 'ogni 15 minuti', ultimo, record: 24, stato },
]

export const SISTEMI_INIZIALI: Sistema[] = [
  {
    id: 'verticalbooking', nome: 'Vertical Booking', sigla: 'VB', tipologia: 'Centrale prenotazioni',
    descrizione: 'CRS e booking engine del sito: riceve tariffe e disponibilità, invia le prenotazioni dirette.',
    protocollo: 'REST API', endpoint: 'https://api.verticalbooking.com/v3', stato: 'Operativo',
    flussi: [
      { nome: 'Prenotazioni', direzione: 'in', frequenza: 'in tempo reale', ultimo: fa(3), record: 1, stato: 'Operativo' },
      { nome: 'Tariffe', direzione: 'out', frequenza: 'ogni 5 minuti', ultimo: fa(2), record: 42, stato: 'Operativo' },
      { nome: 'Disponibilità', direzione: 'out', frequenza: 'ogni 5 minuti', ultimo: fa(2), record: 18, stato: 'Operativo' },
    ],
    storico: storico(1),
  },
  {
    id: 'hqrevenue', nome: 'HQ revenue', sigla: 'HQ', tipologia: 'Fonti esterne',
    descrizione: 'Dati di mercato e tariffe dei competitor per il revenue management.',
    protocollo: 'REST API', endpoint: 'https://api.hqrevenue.com/v2', stato: 'Errore',
    errore: {
      codice: '401 Unauthorized', messaggio: 'Credenziali API rifiutate: la chiave è scaduta il mese scorso.',
      rimedio: 'Genera una nuova API key nel portale HQ revenue e aggiornala nel Configuratore → Connettori partner.',
      dal: fa(60 * 26), transitorio: false,
    },
    flussi: [{ nome: 'Dati di mercato', direzione: 'in', frequenza: 'ogni notte alle 03:00', ultimo: null, record: 0, stato: 'Errore' }],
    storico: storico(2, [], true),
  },
  {
    id: 'syselicat', nome: 'SYS.ELICAT', sigla: 'SE', tipologia: 'Contabilità',
    descrizione: 'Gestionale contabile: riceve corrispettivi e fatture emesse.',
    protocollo: 'SFTP', endpoint: 'sftp://ftp.elicat.it/import', stato: 'Operativo',
    flussi: [
      { nome: 'Corrispettivi', direzione: 'out', frequenza: 'ogni ora', ultimo: fa(21), record: 37, stato: 'Operativo' },
      { nome: 'Fatture', direzione: 'out', frequenza: 'ogni ora', ultimo: fa(21), record: 6, stato: 'Operativo' },
    ],
    storico: storico(3),
  },
  {
    id: 'gamma', nome: 'Gamma Enterprise', sigla: 'GE', tipologia: 'Contabilità',
    descrizione: 'ERP TeamSystem: documenti fiscali, riconciliazione passiva e tipi di addebito.',
    protocollo: 'SOAP', endpoint: 'https://gamma.cliente.it/ws/sibylla', stato: 'Avviso',
    flussi: [
      { nome: 'Documenti fiscali', direzione: 'out', frequenza: 'ogni ora', ultimo: fa(34), record: 0, stato: 'Avviso', nota: 'Dati non presenti: nessun documento da trasferire da 3 giorni' },
      { nome: 'Riconciliazione passiva', direzione: 'in', frequenza: 'ogni giorno alle 06:00', ultimo: fa(60 * 11), record: 128, stato: 'Operativo' },
      { nome: 'Tipo addebito', direzione: 'both', frequenza: 'a ogni modifica', ultimo: fa(60 * 50), record: 2, stato: 'Operativo' },
    ],
    storico: storico(4),
  },
  {
    id: 'sojern', nome: 'Sojern', sigla: 'SJ', tipologia: 'Marketing',
    descrizione: 'Campagne di retargeting: riceve ricerche e prenotazioni anonime del sito.',
    protocollo: 'Webhook', endpoint: 'https://pixel.sojern.com/hook', stato: 'Operativo',
    flussi: [{ nome: 'Eventi di ricerca e prenotazione', direzione: 'out', frequenza: 'in tempo reale', ultimo: fa(1), record: 12, stato: 'Operativo' }],
    storico: storico(5),
  },
  {
    id: 'travco', nome: 'Travco', sigla: 'TC', tipologia: 'Booking engine (mirroring)',
    descrizione: 'Tour operator: prenotazioni in mirroring e allotment.',
    protocollo: 'SFTP', endpoint: 'sftp://xml.travco.co.uk/inbound', stato: 'Errore',
    errore: {
      codice: 'Timeout', messaggio: 'Il server SFTP non risponde da 2 ore (connessione scaduta dopo 60 s).',
      rimedio: 'Problema temporaneo del fornitore: riprova; se persiste, contatta il supporto Travco.',
      dal: fa(124), transitorio: true,
    },
    flussi: MIRRORING(fa(127), 'Errore'),
    storico: storico(6, [0, 1, 2]),
  },
  {
    id: 'g2travel', nome: 'G2 Travel', sigla: 'G2', tipologia: 'Booking engine (mirroring)',
    descrizione: 'Wholesaler: prenotazioni in mirroring e tariffe contrattate.',
    protocollo: 'REST API', endpoint: 'https://api.g2travel.com/hotel', stato: 'Operativo',
    flussi: MIRRORING(fa(9), 'Operativo'),
    storico: storico(7),
  },
  {
    id: 'italcamel', nome: 'Italcamel', sigla: 'IC', tipologia: 'Booking engine (mirroring)',
    descrizione: 'Tour operator: prenotazioni in mirroring.',
    protocollo: 'REST API', endpoint: 'https://ws.italcamel.com/v1', stato: 'Avviso',
    flussi: MIRRORING(fa(14), 'Avviso', '2 tipologie di camera non mappate: le loro prenotazioni restano in attesa'),
    storico: storico(8, [9]),
  },
  {
    id: 'avoris', nome: 'Avoris', sigla: 'AV', tipologia: 'Booking engine (mirroring)',
    descrizione: 'Gruppo turistico: prenotazioni in mirroring.',
    protocollo: 'SOAP', endpoint: 'https://b2b.avoristravel.com/soap', stato: 'Errore',
    errore: {
      codice: '403 Forbidden', messaggio: 'Contratto della struttura non attivo sul portale Avoris.',
      rimedio: 'Verifica con il referente commerciale Avoris che il contratto 2026 sia stato rinnovato.',
      dal: fa(60 * 70), transitorio: false,
    },
    flussi: MIRRORING(fa(60 * 70), 'Errore'),
    storico: storico(9, [], true),
  },
  {
    id: 'agoda', nome: 'Agoda', sigla: 'AG', tipologia: 'Booking engine (mirroring)',
    descrizione: 'OTA: prenotazioni in mirroring.',
    protocollo: 'REST API', endpoint: 'https://supply.agoda.com/api', stato: 'Operativo',
    flussi: MIRRORING(fa(6), 'Operativo'),
    storico: storico(10),
  },
  {
    id: 'ratehawk', nome: 'RateHawk', sigla: 'RH', tipologia: 'Booking engine (mirroring)',
    descrizione: 'B2B: prenotazioni in mirroring. Sospeso dalla struttura a fine stagione.',
    protocollo: 'REST API', endpoint: 'https://api.ratehawk.com/v3', stato: 'Sospeso',
    flussi: MIRRORING(fa(60 * 24 * 12), 'Sospeso'),
    storico: Array.from({ length: 24 }, () => null),
  },
]

/** Ultimo trasferimento del sistema (il più recente fra i suoi flussi). */
export const ultimoDi = (s: Sistema): Date | null =>
  s.flussi.reduce<Date | null>((m, f) => (f.ultimo && (!m || f.ultimo > m) ? f.ultimo : m), null)
