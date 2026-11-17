import { create } from 'zustand'
import { softwarePaghe, type CanalePaghe, type SoftwarePagheId } from './pagheCatalogo'
import { persist } from 'zustand/middleware'
import type { RepartoOp } from '../modules/appop/opCatalogo'
import STRUTTURA_RICETTIVA from './data/hr-struttura-ricettiva.json'

// ─── HUMAN RESOURCES › CONFIGURATORE HR ──────────────────────────────────────
//  Fonte unica dei dati con cui si inquadra un dipendente: reparti, orari di
//  lavoro, turnistica (turni + schemi di rotazione), tipologie di rapporto e
//  contratti collettivi (CCNL) con livelli, ferie, permessi e loro maturazione.
//  Lo scrivono i pane del gruppo «Risorse umane» del Configuratore; lo leggono
//  Crea anagrafica personale (select e spettanze proposte) e Archivio del
//  personale (reparto e inquadramento del contratto vigente).
//  Mock persistito (demo): il back end sostituirà i seed. I valori economici
//  dei CCNL sono indicativi e vanno allineati alle tabelle in vigore.

export const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const

// ── Reparti ──────────────────────────────────────────────────────────────────
export interface RepartoHr {
  id: string
  nome: string
  codice: string
  responsabile: string
  centroCosto: string
  /** Indice colore 1..8 (palette --chart-*). */
  colore: number
  /** Reparto dell'App Op! in cui entra di default chi appartiene a questo reparto. */
  repartoOp?: RepartoOp
  attivo: boolean
  descrizione?: string
}

// ── Orari di lavoro ──────────────────────────────────────────────────────────
export type RegimeOrario = 'full-time' | 'part-time-orizzontale' | 'part-time-verticale' | 'part-time-misto'
export const REGIMI_ORARIO: { value: RegimeOrario; label: string }[] = [
  { value: 'full-time',             label: 'Full time' },
  { value: 'part-time-orizzontale', label: 'Part time orizzontale' },
  { value: 'part-time-verticale',   label: 'Part time verticale' },
  { value: 'part-time-misto',       label: 'Part time misto' },
]

/** Intervallo di lavoro nella giornata (hh:mm, fine > inizio). */
export interface IntervalloOrario { inizio: string; fine: string }
/** Giornata dell'orario: una o più fasce (giornata spezzata) e pausa non retribuita dentro le fasce. */
export interface FasciaGiorno { attivo: boolean; fasce: IntervalloOrario[]; pausaMin: number }

export interface OrarioHr {
  id: string
  nome: string
  regime: RegimeOrario
  /** true = gli orari giornalieri li decide la turnistica: conta solo il monte ore. */
  aTurni: boolean
  /** Con aTurni: ore settimanali e giorni di servizio a settimana. */
  oreSettimanali: number
  giorniSettimana: number
  /** Senza aTurni: griglia Lun→Dom. */
  giorni: FasciaGiorno[]
  /** Tolleranza in entrata/uscita (minuti). */
  flessibilitaMin: number
}

// ── Turnistica ───────────────────────────────────────────────────────────────
export interface TurnoHr {
  id: string
  sigla: string
  nome: string
  inizio: string
  fine: string
  /** Turno spezzato: seconda fascia. */
  inizio2?: string
  fine2?: string
  pausaMin: number
  colore: number
  /** Reparti in cui il turno è utilizzabile (vuoto = tutti). */
  reparti: string[]
}

export const RIPOSO = 'R'

export interface SchemaTurniHr {
  id: string
  nome: string
  descrizione: string
  /** Sequenza del ciclo: id turno oppure RIPOSO. */
  sequenza: string[]
}

// ── Regole di pianificazione (lette da Turni del personale) ─────────────────
export type FasciaId = 'M' | 'P' | 'N'
export const FASCE_ID: FasciaId[] = ['M', 'P', 'N']
export type PersonePerFascia = Record<FasciaId, number>

/** Fascia della giornata su cui si misura la copertura (Mattina, Pomeriggio, Notte). */
export interface FasciaCoperturaHr { id: FasciaId; nome: string; inizio: string; fine: string; attiva: boolean }

/** Fabbisogno di personale di un reparto, per fascia. */
export interface FabbisognoRepartoHr {
  /** Reparto (id di RepartoHr). */
  id: string
  /** 'occupazione' = cresce con l'occupazione (rinforzo oltre la soglia); 'fisso' = minimo costante. */
  modalita: 'occupazione' | 'fisso'
  /** Turno proposto quando si trascina un dipendente del reparto (id di TurnoHr). */
  turnoPredefinito?: string
  /** Persone sempre necessarie per fascia nei giorni di apertura. */
  base: PersonePerFascia
  /** Con 'occupazione': persone in più per fascia quando l'occupazione raggiunge la soglia. */
  rinforzo: PersonePerFascia
  sogliaOccupazione: number
  /** Giorni senza fabbisogno (0 = lunedì … 6 = domenica). */
  giorniChiusura: number[]
}

export interface PianificazioneTurniHr {
  fasce: FasciaCoperturaHr[]
  /** Ore minime lavorate dentro una fascia perché il turno la copra. */
  coperturaMinOre: number
  /** Riposo minimo fra la fine di un turno e l'inizio del successivo (D.Lgs. 66/2003: 11 h). */
  riposoMinOre: number
  /** Ore sotto il monte ore settimanale oltre cui il dipendente risulta da completare. */
  tolleranzaSottoOre: number
  fabbisogni: FabbisognoRepartoHr[]
}

// ── Tipologie di rapporto ────────────────────────────────────────────────────
export interface TipologiaContrattoHr {
  id: string
  nome: string
  /** Codice tipologia per la comunicazione obbligatoria (UniLav). */
  codice: string
  conScadenza: boolean
  durataMaxMesi?: number
  periodoProva: boolean
  attiva: boolean
}

// ── CCNL ─────────────────────────────────────────────────────────────────────
export type CategoriaLivello = 'Dirigente' | 'Quadro' | 'Impiegato' | 'Operaio' | 'Apprendista'
export const CATEGORIE_LIVELLO: CategoriaLivello[] = ['Dirigente', 'Quadro', 'Impiegato', 'Operaio', 'Apprendista']

export interface LivelloCcnl {
  id: string
  codice: string
  descrizione: string
  categoria: CategoriaLivello
  /** Minimo tabellare mensile lordo (€). */
  minimoMensile: number
  /** Importo di uno scatto di anzianità (€). */
  scattoImporto: number
  /** Periodo di prova (giorni di lavoro effettivo). */
  provaGiorni: number
  /** Preavviso di dimissioni/licenziamento (giorni di calendario). */
  preavvisoGiorni: number
}

export type MaturazioneTipo = 'mensile' | 'annuale' | 'oraria'
export const MATURAZIONI: { value: MaturazioneTipo; label: string }[] = [
  { value: 'mensile', label: 'Ratei mensili (1/12)' },
  { value: 'annuale', label: 'Annuale, a inizio anno' },
  { value: 'oraria',  label: 'Per ora lavorata' },
]

export interface CcnlHr {
  id: string
  nome: string
  /** Codice CNEL dell'archivio contratti. */
  codiceCnel: string
  settore: string
  validoDal: string
  validoAl: string
  oreSettimanaliPieno: number
  mensilita: number
  // Ferie
  ferieGiorni: number
  /** Le ferie si contano su settimana di 5 o 6 giorni lavorativi. */
  ferieSettimanaGiorni: 5 | 6
  /** Ferie da godere obbligatoriamente nell'anno di maturazione (settimane). */
  ferieMinimeAnnoSettimane: number
  /** Le residue vanno godute entro N mesi dalla fine dell'anno di maturazione. */
  ferieScadenzaMesi: number
  // Permessi
  rolOre: number
  exFestivitaOre: number
  /** ROL non goduti liquidati entro N mesi dalla fine dell'anno. */
  permessiScadenzaMesi: number
  // Maturazione
  maturazione: MaturazioneTipo
  /** Frazione di mese ≥ N giorni conta come mese intero. */
  frazioneMeseGiorni: number
  /** Part time: ferie e permessi riproporzionati alla percentuale. */
  riproporzionaPartTime: boolean
  /** Maturano anche durante malattia/maternità. */
  maturaInAssenzeRetribuite: boolean
  // Retribuzione
  scattiNumero: number
  scattiCadenzaAnni: number
  maggStraordinario: number
  maggNotturno: number
  maggFestivo: number
  comportoGiorni: number
  // Enti e fondi
  fondoSanitario: string
  previdenzaComplementare: string
  enteBilaterale: string
  livelli: LivelloCcnl[]
}

// ── Collaboratori esterni ────────────────────────────────────────────────────
//  Addetti di ditte in appalto (fornitori di Purchasing con `appalto`), non
//  dipendenti: niente CCNL, ferie o cedolini. La categoria fissa i reparti
//  dell'App Op! a cui possono accedere, i documenti richiesti e la durata
//  massima dell'autorizzazione (alla scadenza l'accesso all'app si spegne).
export interface CategoriaEsterniHr {
  id: string
  nome: string
  repartiOp: RepartoOp[]
  documenti: string[]
  durataMaxMesi: number
  colore: number
  attiva: boolean
}

/** Badge di riconoscimento dei collaboratori esterni (tessera art. 26 c. 8 D.Lgs. 81/2008). */
export interface BadgeConfigHr {
  /** Intestazione (committente): vuoto = nome della struttura corrente. */
  intestazione: string
  /** Colore della banda (palette --chart-*, come reparti e turni). */
  colore: number
  orientamento: 'orizzontale' | 'verticale'
  /** cr80 = una tessera per pagina (stampanti di card), a4 = foglio con più tessere da ritagliare. */
  formatoStampa: 'cr80' | 'a4'
  mostraNascita: boolean
  mostraCategoria: boolean
  mostraValidita: boolean
  mostraPartitaIva: boolean
  mostraQr: boolean
  /** Stampa anche il retro con dicitura e recapiti. */
  retro: boolean
  dicitura: string
  testoRetro: string
}

export const BADGE_DEFAULT: BadgeConfigHr = {
  intestazione: '', colore: 1, orientamento: 'orizzontale', formatoStampa: 'a4',
  mostraNascita: true, mostraCategoria: true, mostraValidita: true, mostraPartitaIva: true, mostraQr: true, retro: true,
  dicitura: 'Tessera di riconoscimento — art. 26 c. 8 D.Lgs. 81/2008 e art. 5 L. 136/2010',
  testoRetro: 'Il titolare è autorizzato ad accedere alla struttura solo nel periodo indicato. In caso di smarrimento avvisare il ricevimento. La tessera va esposta in modo visibile durante il servizio.',
}

// Il DUVRI NON è un documento del singolo addetto: è dell'appalto (Aziende in appalto).
export const DOCUMENTI_ESTERNI = [
  'Contratto d’appalto', 'DURC', 'Formazione sicurezza', 'Documento d’identità', 'Attestato HACCP', 'Idoneità sanitaria',
]

// ─── Seed ─────────────────────────────────────────────────────────────────────

// Configurazione tipo di una struttura ricettiva (reparti, orari, turni, schemi,
// regole di pianificazione): fonte unica in data/hr-struttura-ricettiva.json,
// la stessa che il back end carica per precompilare una nuova struttura
// (docs/human-resources/17-turni-e-turnistica-v2.md § 6).
// Nella demo i responsabili dei reparti sono valorizzati a parte.
const RESPONSABILI_DEMO: Record<string, string> = {
  'rep-dir': 'Piero Aragona', 'rep-fo': 'Piero Aragona', 'rep-fb': 'Andrea Grimaudo', 'rep-hk': 'Marco Campo', 'rep-amm': 'Ruggero Novi',
}
const SEED_REPARTI: RepartoHr[] = (STRUTTURA_RICETTIVA.reparti as RepartoHr[]).map(r => ({ ...r, responsabile: RESPONSABILI_DEMO[r.id] ?? r.responsabile }))

const SEED_ORARI: OrarioHr[] = STRUTTURA_RICETTIVA.orari as OrarioHr[]

/** Giornata nel formato attuale (gli orari salvati prima avevano entrata/uscita singole). */
export function normalizzaGiorno(d: any): FasciaGiorno {
  if (d && Array.isArray(d.fasce)) return { attivo: !!d.attivo, fasce: d.fasce, pausaMin: Number(d.pausaMin) || 0 }
  const fasce = d?.attivo && d.entrata && d.uscita ? [{ inizio: d.entrata, fine: d.uscita }] : []
  return { attivo: !!d?.attivo, fasce, pausaMin: Number(d?.pausaMin) || 0 }
}

// Turni standard di un hotel (CCNL Turismo, 40 h su 5 giorni): ricevimento a
// ciclo continuo con portiere di notte, intermedio per i check-in, colazioni,
// pranzo e cena in sala e cucina, piani con couverture serale, uffici centrali.
// Ore nette = durata delle fasce − pausa (pausa non retribuita).
const SEED_TURNI: TurnoHr[] = STRUTTURA_RICETTIVA.turni as TurnoHr[]

const SEED_SCHEMI: SchemaTurniHr[] = STRUTTURA_RICETTIVA.schemi as SchemaTurniHr[]

export const PIANIFICAZIONE_DEFAULT: PianificazioneTurniHr = STRUTTURA_RICETTIVA.pianificazione as PianificazioneTurniHr
/** Fabbisogno di un reparto senza regole: minimo fisso a zero (nessuna copertura richiesta). */
export const fabbisognoVuoto = (id: string): FabbisognoRepartoHr =>
  ({ id, modalita: 'fisso', base: { M: 0, P: 0, N: 0 }, rinforzo: { M: 0, P: 0, N: 0 }, sogliaOccupazione: 85, giorniChiusura: [] })

const SEED_TIPOLOGIE: TipologiaContrattoHr[] = [
  { id: 'tip-ind',  nome: 'Tempo indeterminato',          codice: 'A.01.00', conScadenza: false, periodoProva: true,  attiva: true },
  { id: 'tip-det',  nome: 'Tempo determinato',            codice: 'A.02.00', conScadenza: true, durataMaxMesi: 24, periodoProva: true, attiva: true },
  { id: 'tip-sta',  nome: 'Stagionale',                   codice: 'A.02.01', conScadenza: true, durataMaxMesi: 8,  periodoProva: true, attiva: true },
  { id: 'tip-app',  nome: 'Apprendistato professionalizzante', codice: 'A.03.02', conScadenza: false, durataMaxMesi: 36, periodoProva: true, attiva: true },
  { id: 'tip-int',  nome: 'Intermittente (a chiamata)',   codice: 'A.05.00', conScadenza: false, periodoProva: false, attiva: true },
  { id: 'tip-som',  nome: 'Somministrazione',             codice: 'A.07.00', conScadenza: true, durataMaxMesi: 24, periodoProva: false, attiva: true },
  { id: 'tip-coco', nome: 'Collaborazione (Co.co.co.)',   codice: 'A.09.00', conScadenza: true, periodoProva: false, attiva: true },
  { id: 'tip-tir',  nome: 'Tirocinio / Stage',            codice: 'C.01.00', conScadenza: true, durataMaxMesi: 6, periodoProva: false, attiva: true },
]

const SEED_CATEGORIE_ESTERNI: CategoriaEsterniHr[] = [
  { id: 'cest-pul', nome: 'Addetto pulizie', repartiOp: ['pulizie'], documenti: ['Contratto d’appalto', 'DURC', 'Formazione sicurezza', 'Documento d’identità'], durataMaxMesi: 12, colore: 3, attiva: true },
  { id: 'cest-man', nome: 'Manutentore', repartiOp: ['manutenzione'], documenti: ['Contratto d’appalto', 'DURC', 'Formazione sicurezza', 'Documento d’identità'], durataMaxMesi: 12, colore: 4, attiva: true },
  { id: 'cest-fac', nome: 'Facchino', repartiOp: ['frontOffice', 'magazzino'], documenti: ['Contratto d’appalto', 'DURC', 'Documento d’identità'], durataMaxMesi: 6, colore: 1, attiva: true },
]

const lv = (id: string, codice: string, descrizione: string, categoria: CategoriaLivello, minimoMensile: number, scattoImporto: number, provaGiorni: number, preavvisoGiorni: number): LivelloCcnl =>
  ({ id, codice, descrizione, categoria, minimoMensile, scattoImporto, provaGiorni, preavvisoGiorni })

const SEED_CCNL: CcnlHr[] = [
  {
    id: 'ccnl-tur', nome: 'CCNL Turismo – Aziende alberghiere', codiceCnel: 'H052', settore: 'Turismo e ospitalità',
    validoDal: '2024-06-01', validoAl: '2027-12-31', oreSettimanaliPieno: 40, mensilita: 14,
    ferieGiorni: 26, ferieSettimanaGiorni: 6, ferieMinimeAnnoSettimane: 2, ferieScadenzaMesi: 18,
    rolOre: 72, exFestivitaOre: 32, permessiScadenzaMesi: 6,
    maturazione: 'mensile', frazioneMeseGiorni: 15, riproporzionaPartTime: true, maturaInAssenzeRetribuite: true,
    scattiNumero: 6, scattiCadenzaAnni: 4, maggStraordinario: 30, maggNotturno: 25, maggFestivo: 20, comportoGiorni: 180,
    fondoSanitario: 'Fondo FAST', previdenzaComplementare: 'Fon.Te.', enteBilaterale: 'EBNT',
    livelli: [
      lv('tur-qa', 'Q.A', 'Quadro A – direttore di struttura',        'Quadro',    2390, 41, 180, 120),
      lv('tur-qb', 'Q.B', 'Quadro B – vice direttore',                 'Quadro',    2170, 40, 180, 120),
      lv('tur-1',  '1°',  'Capo servizio, capo ricevimento',           'Impiegato', 1990, 39, 180,  90),
      lv('tur-2',  '2°',  'Primo portiere, chef de rang, governante',  'Impiegato', 1790, 38,  90,  60),
      lv('tur-3',  '3°',  'Portiere, cuoco capo partita',              'Impiegato', 1680, 37,  90,  60),
      lv('tur-4',  '4°',  'Addetto ricevimento, cameriere',            'Impiegato', 1590, 36,  60,  30),
      lv('tur-5',  '5°',  'Commis, aiuto cuoco, manutentore',          'Operaio',   1490, 35,  60,  30),
      lv('tur-6s', '6°S', 'Cameriera ai piani, facchino',              'Operaio',   1440, 34,  45,  20),
      lv('tur-6',  '6°',  'Addetto pulizie, lavapiatti',               'Operaio',   1420, 34,  45,  20),
      lv('tur-7',  '7°',  'Personale di fatica',                       'Operaio',   1330, 33,  30,  15),
    ],
  },
  {
    id: 'ccnl-pe', nome: 'CCNL Pubblici esercizi', codiceCnel: 'H05Y', settore: 'Ristorazione e bar',
    validoDal: '2024-06-01', validoAl: '2027-12-31', oreSettimanaliPieno: 40, mensilita: 14,
    ferieGiorni: 26, ferieSettimanaGiorni: 6, ferieMinimeAnnoSettimane: 2, ferieScadenzaMesi: 18,
    rolOre: 72, exFestivitaOre: 32, permessiScadenzaMesi: 6,
    maturazione: 'mensile', frazioneMeseGiorni: 15, riproporzionaPartTime: true, maturaInAssenzeRetribuite: true,
    scattiNumero: 6, scattiCadenzaAnni: 4, maggStraordinario: 30, maggNotturno: 25, maggFestivo: 20, comportoGiorni: 180,
    fondoSanitario: 'Fondo FAST', previdenzaComplementare: 'Fon.Te.', enteBilaterale: 'EBNT',
    livelli: [
      lv('pe-q', 'Q',  'Quadro – responsabile di locale',  'Quadro',    2300, 40, 180, 120),
      lv('pe-1', '1°', 'Direttore di sala, chef',          'Impiegato', 1960, 39, 180,  90),
      lv('pe-3', '3°', 'Barman, cuoco',                    'Impiegato', 1660, 37,  90,  60),
      lv('pe-4', '4°', 'Cameriere, banconiere',            'Impiegato', 1580, 36,  60,  30),
      lv('pe-5', '5°', 'Commis di sala e cucina',          'Operaio',   1480, 35,  60,  30),
      lv('pe-6', '6°', 'Addetto pulizie, lavapiatti',      'Operaio',   1410, 34,  45,  20),
    ],
  },
]

// ─── Helper ──────────────────────────────────────────────────────────────────

const minuti = (hhmm: string) => {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0
}
/** Durata di una fascia in minuti (gestisce l'attraversamento della mezzanotte). */
export const durataMin = (inizio: string, fine: string) => {
  if (!inizio || !fine) return 0
  const d = minuti(fine) - minuti(inizio)
  return d < 0 ? d + 1440 : d
}

/** Minuti lavorati nelle fasce della giornata, al netto della pausa. */
export const minutiGiorno = (f: FasciaGiorno) =>
  f.attivo ? Math.max(0, f.fasce.reduce((a, x) => a + durataMin(x.inizio, x.fine), 0) - f.pausaMin) : 0
export const oreGiorno = (f: FasciaGiorno) => minutiGiorno(f) / 60

/** Ore settimanali effettive dell'orario. */
export const oreSettimanaliOrario = (o: OrarioHr) =>
  o.aTurni ? o.oreSettimanali : Math.round(o.giorni.reduce((a, f) => a + oreGiorno(f), 0) * 100) / 100

export const giorniLavorativiOrario = (o: OrarioHr) =>
  o.aTurni ? o.giorniSettimana : o.giorni.filter(f => f.attivo).length

/** Ore nette di un turno (fasce − pausa). */
export const oreTurno = (t: TurnoHr) =>
  Math.max(0, durataMin(t.inizio, t.fine) + durataMin(t.inizio2 ?? '', t.fine2 ?? '') - t.pausaMin) / 60

// ─── Coerenza fra orari di lavoro, turni e schemi ───────────────────────────
//  L'orario dice QUANTO lavora il dipendente (ore e giorni a settimana), la
//  Turnistica COME si compone la giornata. Un orario «a turni» chiede turni
//  della durata media giornaliera (ore ÷ giorni) e schemi con lo stesso monte ore.
/** Ore medie al giorno dell'orario. */
export const oreMedieGiorno = (o: OrarioHr) => {
  const g = giorniLavorativiOrario(o)
  return g ? oreSettimanaliOrario(o) / g : 0
}
/**
 * Turni con cui, ripetuti nei giorni dell'orario, il monte ore si raggiunge
 * senza superarlo e senza scendere sotto la tolleranza delle Regole di
 * pianificazione (stessa soglia che Turni del personale usa per «da completare»).
 */
export const turniCompatibili = (o: OrarioHr, turni: TurnoHr[], tolleranza = useHrConfigStore.getState().pianificazione?.tolleranzaSottoOre ?? 4) => {
  const ore = oreSettimanaliOrario(o), gg = giorniLavorativiOrario(o)
  return turni.filter(t => { const sett = oreTurno(t) * gg; return sett <= ore + 0.01 && sett >= ore - tolleranza - 0.01 })
}
/** Ore medie a settimana di uno schema di rotazione (ciclo riportato a 7 giorni). */
export const oreSettimanaliSchema = (s: SchemaTurniHr, turni: TurnoHr[]) => {
  if (!s.sequenza.length) return 0
  const ore = s.sequenza.reduce((a, id) => a + (id === RIPOSO ? 0 : (() => { const t = turni.find(x => x.id === id); return t ? oreTurno(t) : 0 })()), 0)
  return (ore / s.sequenza.length) * 7
}
/** Giorni lavorati medi a settimana di uno schema. */
export const giorniSettimanaliSchema = (s: SchemaTurniHr) =>
  s.sequenza.length ? (s.sequenza.filter(x => x !== RIPOSO).length / s.sequenza.length) * 7 : 0
/** Schemi con monte ore entro ± 2,5 h e giorni entro ± 0,5 rispetto all'orario. */
export const schemiCompatibili = (o: OrarioHr, schemi: SchemaTurniHr[], turni: TurnoHr[]) =>
  schemi.filter(s => Math.abs(oreSettimanaliSchema(s, turni) - oreSettimanaliOrario(o)) <= 2.5
    && Math.abs(giorniSettimanaliSchema(s) - giorniLavorativiOrario(o)) <= 0.5)
/** Limite di legge sull'orario settimanale (D.Lgs. 66/2003, art. 4). */
export const ORE_MAX_SETTIMANA = 48
/** Avvisi sull'orario: limiti di legge e, per gli orari a turni, turni adatti in Turnistica. */
export function avvisiOrario(o: OrarioHr, turni: TurnoHr[]): string[] {
  const out: string[] = []
  const ore = oreSettimanaliOrario(o), gg = giorniLavorativiOrario(o)
  if (ore > ORE_MAX_SETTIMANA) out.push(`Supera le ${ORE_MAX_SETTIMANA} ore settimanali consentite (D.Lgs. 66/2003).`)
  if (gg >= 7) out.push('Nessun giorno di riposo: serve almeno un riposo settimanale di 24 ore consecutive.')
  if (o.aTurni && gg > 0 && !turniCompatibili(o, turni).length) {
    const m = oreMedieGiorno(o)
    out.push(`In Turnistica non c'è un turno adatto (circa ${Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')} h al giorno): con i turni esistenti in ${gg} giorni il monte di ${ore} h si supera o non si raggiunge.`)
  }
  return out
}

/** Minuti di una fascia che cadono tra le 22 e le 6 (a passi di 15 minuti). */
const minutiNotturni = (inizio: string, fine: string) => {
  if (!inizio || !fine) return 0
  const s = minuti(inizio), e = s + durataMin(inizio, fine)
  let notte = 0
  for (let m = s; m < e; m += 15) { const h = (m % 1440) / 60; if (h >= 22 || h < 6) notte += 15 }
  return notte
}

/** Turno notturno: almeno 3 ore lavorate tra le 22 e le 6, sommando le due
 *  fasce del turno spezzato (soglia del lavoratore notturno, D.Lgs. 66/2003). */
export const turnoNotturno = (t: TurnoHr) =>
  minutiNotturni(t.inizio, t.fine) + minutiNotturni(t.inizio2 ?? '', t.fine2 ?? '') >= 180

/** Percentuale di part time rispetto all'orario pieno del CCNL (100 = full time). */
export const percentualePartTime = (orario?: OrarioHr, ccnl?: CcnlHr) => {
  if (!orario || !ccnl || !ccnl.oreSettimanaliPieno) return 100
  return Math.min(100, Math.round((oreSettimanaliOrario(orario) / ccnl.oreSettimanaliPieno) * 100))
}

export interface SpettanzeAnnue {
  ferieGiorni: number
  rolOre: number
  exFestivitaOre: number
  /** Maturazione mensile (ratei). */
  ferieMese: number
  permessiMeseOre: number
  percentuale: number
}

/** Ferie e permessi annui spettanti, riproporzionati al part time se il CCNL lo prevede. */
export function spettanzeAnnue(ccnl: CcnlHr, percentuale = 100): SpettanzeAnnue {
  const k = ccnl.riproporzionaPartTime ? percentuale / 100 : 1
  const r1 = (n: number) => Math.round(n * 10) / 10
  const ferie = r1(ccnl.ferieGiorni * k)
  const rol = r1(ccnl.rolOre * k)
  const ex = r1(ccnl.exFestivitaOre * k)
  return {
    ferieGiorni: ferie, rolOre: rol, exFestivitaOre: ex,
    ferieMese: Math.round((ferie / 12) * 100) / 100,
    permessiMeseOre: Math.round(((rol + ex) / 12) * 100) / 100,
    percentuale,
  }
}

/** RAL minima da CCNL: minimo tabellare × mensilità, riproporzionata al part time. */
export const ralMinima = (ccnl: CcnlHr, livello: LivelloCcnl, percentuale = 100) =>
  Math.round(livello.minimoMensile * ccnl.mensilita * (percentuale / 100))

export const fmtEuro = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 0 })

export const nuovoId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`

// ─── Integrazione paghe ──────────────────────────────────────────────────────
//  Un profilo di collegamento per ciascun software paghe del catalogo
//  (pagheCatalogo): canale, campi, formato del tracciato, chiave del
//  dipendente e codici voce. Uno solo è «in uso» per Trasmetti consuntivo;
//  le regole d'invio valgono per tutti.

export interface ProfiloPaghe {
  canale: CanalePaghe
  /** Valori dei campi del collegamento (chiave del catalogo → valore). */
  valori: Record<string, string>
  formato: string
  chiaveDipendente: string
  /** Codice voce per ciascuna voce del registro. */
  voci: Record<string, string>
  ultimoTest?: { at: string; ok: boolean; messaggio: string }
  /** Codice di ciascun dipendente nel software paghe (id anagrafica → codice). */
  codiciDipendente?: Record<number, string>
  /** Voci i cui giustificativi si sommano all'ordinario (TeamSystem RP / Teamtime). */
  sommaOrdinario?: string[]
}

/** Codice proposto per il dipendente nel software paghe, finché l'HR non lo imposta. */
export const codiceDipendentePaghe = (p: ProfiloPaghe | undefined, id: number) => p?.codiciDipendente?.[id] ?? String(1000 + id)

export interface IntegrazionePagheHr {
  /** Software usato da Trasmetti consuntivo; null = nessuno collegato. */
  inUso: SoftwarePagheId | null
  profili: Partial<Record<SoftwarePagheId, ProfiloPaghe>>
  invioAutomatico: boolean
  /** Giorno del mese successivo in cui parte l'invio automatico. */
  giornoInvio: number
  oraInvio: string
  soloStraordinarioApprovato: boolean
  bloccaConAnomalie: boolean
  /** Avviso all'ufficio del personale a invio riuscito o fallito. */
  notificaEsito: boolean
}

/** Profilo vuoto di un software, con i default del catalogo. */
export function profiloPagheVuoto(id: SoftwarePagheId): ProfiloPaghe {
  const sw = softwarePaghe(id)
  return { canale: sw.canali[0], valori: {}, formato: sw.formati[0], chiaveDipendente: sw.chiaveDipendente[0], voci: { ...sw.voci } }
}

export const INTEGRAZIONE_PAGHE_DEFAULT: IntegrazionePagheHr = {
  inUso: 'zucchetti',
  profili: {
    zucchetti: {
      ...profiloPagheVuoto('zucchetti'),
      valori: { codiceDitta: '000123', codiceAzienda: '0001', tenant: 'https://hotelnoto.infinity.zucchetti.it', clientId: 'sibylla-presenze', clientSecret: '••••••••' },
      ultimoTest: { at: '2026-11-02T09:00:00.000Z', ok: true, messaggio: 'Collegamento riuscito, ditta 000123 trovata.' },
    },
  },
  invioAutomatico: true, giornoInvio: 2, oraInvio: '09:00',
  soloStraordinarioApprovato: true, bloccaConAnomalie: false, notificaEsito: true,
}

/** Integrazione salvata solo se ha la forma attuale (profili per software), altrimenti il default. */
export const integrazioneValida = (v: unknown): IntegrazionePagheHr =>
  v && typeof v === 'object' && (v as IntegrazionePagheHr).profili && typeof (v as IntegrazionePagheHr).profili === 'object'
    ? { ...INTEGRAZIONE_PAGHE_DEFAULT, ...(v as IntegrazionePagheHr) }
    : INTEGRAZIONE_PAGHE_DEFAULT

// ─── Store ───────────────────────────────────────────────────────────────────

export interface HrConfigData {
  reparti: RepartoHr[]
  orari: OrarioHr[]
  turni: TurnoHr[]
  schemi: SchemaTurniHr[]
  pianificazione: PianificazioneTurniHr
  tipologie: TipologiaContrattoHr[]
  ccnl: CcnlHr[]
  categorieEsterni: CategoriaEsterniHr[]
  badge: BadgeConfigHr
  integrazionePaghe: IntegrazionePagheHr
}

interface HrConfigState extends HrConfigData {
  setReparti: (v: RepartoHr[]) => void
  setOrari: (v: OrarioHr[]) => void
  setTurnistica: (turni: TurnoHr[], schemi: SchemaTurniHr[], pianificazione?: PianificazioneTurniHr) => void
  setTipologie: (v: TipologiaContrattoHr[]) => void
  setCcnl: (v: CcnlHr[]) => void
  setCategorieEsterni: (v: CategoriaEsterniHr[]) => void
  setBadge: (v: BadgeConfigHr) => void
  setIntegrazionePaghe: (v: IntegrazionePagheHr) => void
}

export const HR_CONFIG_SEED: HrConfigData = {
  reparti: SEED_REPARTI, orari: SEED_ORARI, turni: SEED_TURNI, schemi: SEED_SCHEMI, pianificazione: PIANIFICAZIONE_DEFAULT,
  tipologie: SEED_TIPOLOGIE, ccnl: SEED_CCNL, categorieEsterni: SEED_CATEGORIE_ESTERNI, badge: BADGE_DEFAULT,
  integrazionePaghe: INTEGRAZIONE_PAGHE_DEFAULT,
}

/** Aggiunge (per id) gli elementi della configurazione tipo che mancano nei dati salvati. */
function migraV11(d: HrConfigData, version: number): HrConfigData {
  if (version >= 11) return d
  const unisci = <T extends { id: string }>(cur: T[], seed: T[], stessa?: (a: T, b: T) => boolean) =>
    [...cur, ...seed.filter(x => !cur.some(y => y.id === x.id || (stessa ? stessa(x, y) : false)))]
  return {
    ...d,
    reparti: unisci(d.reparti, SEED_REPARTI, (a, b) => a.nome.toLowerCase() === b.nome.toLowerCase()),
    orari: unisci(d.orari, SEED_ORARI),
    turni: unisci(d.turni, SEED_TURNI, (a, b) => a.sigla.toUpperCase() === b.sigla.toUpperCase()),
    schemi: unisci(d.schemi, SEED_SCHEMI),
    pianificazione: { ...d.pianificazione, fabbisogni: unisci(d.pianificazione.fabbisogni, PIANIFICAZIONE_DEFAULT.fabbisogni) },
  }
}

export const useHrConfigStore = create<HrConfigState>()(
  persist(
    (set) => ({
      ...HR_CONFIG_SEED,
      setReparti: (reparti) => set({ reparti }),
      setOrari: (orari) => set({ orari }),
      setTurnistica: (turni, schemi, pianificazione) => set(pianificazione ? { turni, schemi, pianificazione } : { turni, schemi }),
      setTipologie: (tipologie) => set({ tipologie }),
      setCcnl: (ccnl) => set({ ccnl }),
      setCategorieEsterni: (categorieEsterni) => set({ categorieEsterni }),
      setBadge: (badge) => set({ badge }),
      setIntegrazionePaghe: (integrazionePaghe) => set({ integrazionePaghe }),
    }),
    {
      name: 'sibylla.hr-config',
      version: 11,
      // v2: categorie dei collaboratori esterni; v3: badge; v4: orari con più fasce al giorno;
      // v5: il DUVRI esce dai documenti dei singoli addetti (è dell'appalto); v6–7: integrazione paghe (profili per software)
      // v8: regole di pianificazione dei turni (fasce, fabbisogno per reparto, riposo minimo)
      // v9: turni e schemi standard da hotel (aggiunti a quelli salvati se mancano)
      // v10: orari «a turni» di esempio (Turnista 5 giorni, part time, a chiamata) aggiunti se mancano
      // v11: configurazione tipo struttura ricettiva: reparti, orari, turni, schemi e fabbisogni mancanti aggiunti per id
      //      (in fondo; da v8 a v10 restano le migrazioni precedenti)
      migrate: (persisted: any, version: number) => migraV11(({
        ...HR_CONFIG_SEED, ...(persisted ?? {}),
        orari: ((persisted?.orari ?? HR_CONFIG_SEED.orari) as any[]).map(o => ({ ...o, giorni: (o.giorni ?? []).map(normalizzaGiorno) })),
        categorieEsterni: ((persisted?.categorieEsterni ?? SEED_CATEGORIE_ESTERNI) as CategoriaEsterniHr[])
          .map(c => ({ ...c, documenti: c.documenti.filter(d => d !== 'DUVRI') })),
        badge: { ...BADGE_DEFAULT, ...(persisted?.badge ?? {}) },
        integrazionePaghe: integrazioneValida(persisted?.integrazionePaghe),
        pianificazione: { ...PIANIFICAZIONE_DEFAULT, ...(persisted?.pianificazione ?? {}) },
        ...(version < 10 && persisted?.orari ? {
          orari: [...((persisted.orari as any[]).map(o => ({ ...o, giorni: (o.giorni ?? []).map(normalizzaGiorno) }))),
            ...SEED_ORARI.filter(o => !(persisted.orari as OrarioHr[]).some(x => x.id === o.id))],
        } : {}),
        ...(version < 9 && persisted?.turni ? {
          turni: [...persisted.turni, ...SEED_TURNI.filter(t => !persisted.turni.some((x: TurnoHr) => x.id === t.id || x.sigla === t.sigla))],
          schemi: [...(persisted.schemi ?? []), ...SEED_SCHEMI.filter(t => !(persisted.schemi ?? []).some((x: SchemaTurniHr) => x.id === t.id))],
        } : {}),
      }) as any, version) as any,
    },
  ),
)

// Lookup comodi (fuori da React o nei render)
export const findById = <T extends { id: string }>(list: T[], id?: string) => (id ? list.find(x => x.id === id) : undefined)
