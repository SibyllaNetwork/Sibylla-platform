import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RepartoOp } from '../modules/appop/opCatalogo'

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

export interface FasciaGiorno { attivo: boolean; entrata: string; uscita: string; pausaMin: number }

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

// ─── Seed ─────────────────────────────────────────────────────────────────────

const SEED_REPARTI: RepartoHr[] = [
  { id: 'rep-fo',   nome: 'Front office',    codice: 'FO',  responsabile: 'Piero Aragona',  centroCosto: 'CDC-01 Ricevimento',   colore: 1, repartoOp: 'frontOffice',  attivo: true },
  { id: 'rep-fb',   nome: 'F&B',             codice: 'FB',  responsabile: 'Andrea Grimaudo', centroCosto: 'CDC-02 Ristorazione',  colore: 2, repartoOp: 'foodBeverage', attivo: true },
  { id: 'rep-hk',   nome: 'Housekeeping',    codice: 'HK',  responsabile: 'Marco Campo',    centroCosto: 'CDC-03 Piani',         colore: 3, repartoOp: 'pulizie',      attivo: true },
  { id: 'rep-man',  nome: 'Manutenzione',    codice: 'MAN', responsabile: '',               centroCosto: 'CDC-04 Manutenzione',  colore: 4, repartoOp: 'manutenzione', attivo: true },
  { id: 'rep-cuc',  nome: 'Cucina',          codice: 'CUC', responsabile: '',               centroCosto: 'CDC-02 Ristorazione',  colore: 5, repartoOp: 'foodBeverage', attivo: true },
  { id: 'rep-amm',  nome: 'Amministrazione', codice: 'AMM', responsabile: 'Ruggero Novi',   centroCosto: 'CDC-05 Sede',          colore: 6, repartoOp: 'risorseUmane', attivo: true },
  { id: 'rep-dir',  nome: 'Direzione',       codice: 'DIR', responsabile: 'Piero Aragona',  centroCosto: 'CDC-05 Sede',          colore: 7, attivo: true },
  { id: 'rep-mkt',  nome: 'Marketing',       codice: 'MKT', responsabile: '',               centroCosto: 'CDC-05 Sede',          colore: 8, attivo: false },
]

const g = (attivo: boolean, entrata = '09:00', uscita = '18:00', pausaMin = 60): FasciaGiorno => ({ attivo, entrata, uscita, pausaMin })
const OFF = g(false, '', '', 0)

const SEED_ORARI: OrarioHr[] = [
  { id: 'ora-ft5', nome: 'Full time 40 h · 5 giorni', regime: 'full-time', aTurni: false, oreSettimanali: 40, giorniSettimana: 5, flessibilitaMin: 15,
    giorni: [g(true), g(true), g(true), g(true), g(true), OFF, OFF] },
  { id: 'ora-ft6', nome: 'Full time 40 h · 6 giorni', regime: 'full-time', aTurni: false, oreSettimanali: 40, giorniSettimana: 6, flessibilitaMin: 10,
    giorni: [g(true, '08:00', '15:10', 30), g(true, '08:00', '15:10', 30), g(true, '08:00', '15:10', 30), g(true, '08:00', '15:10', 30), g(true, '08:00', '15:10', 30), g(true, '08:00', '15:10', 30), OFF] },
  { id: 'ora-tur', nome: 'Turnista 40 h · 6 giorni', regime: 'full-time', aTurni: true, oreSettimanali: 40, giorniSettimana: 6, flessibilitaMin: 0,
    giorni: Array.from({ length: 7 }, () => ({ ...OFF })) },
  { id: 'ora-pt30', nome: 'Part time 30 h orizzontale', regime: 'part-time-orizzontale', aTurni: false, oreSettimanali: 30, giorniSettimana: 5, flessibilitaMin: 10,
    giorni: [g(true, '09:00', '15:00', 0), g(true, '09:00', '15:00', 0), g(true, '09:00', '15:00', 0), g(true, '09:00', '15:00', 0), g(true, '09:00', '15:00', 0), OFF, OFF] },
  { id: 'ora-pt24', nome: 'Part time 24 h verticale', regime: 'part-time-verticale', aTurni: false, oreSettimanali: 24, giorniSettimana: 3, flessibilitaMin: 10,
    giorni: [g(true, '08:00', '16:30', 30), g(true, '08:00', '16:30', 30), g(true, '08:00', '16:30', 30), OFF, OFF, OFF, OFF] },
]

const SEED_TURNI: TurnoHr[] = [
  { id: 'tur-m', sigla: 'M', nome: 'Mattina',    inizio: '07:00', fine: '15:00', pausaMin: 30, colore: 1, reparti: [] },
  { id: 'tur-p', sigla: 'P', nome: 'Pomeriggio', inizio: '15:00', fine: '23:00', pausaMin: 30, colore: 3, reparti: [] },
  { id: 'tur-n', sigla: 'N', nome: 'Notte',      inizio: '23:00', fine: '07:00', pausaMin: 30, colore: 6, reparti: ['rep-fo'] },
  { id: 'tur-s', sigla: 'S', nome: 'Spezzato',   inizio: '10:00', fine: '14:00', inizio2: '18:00', fine2: '22:00', pausaMin: 0, colore: 5, reparti: ['rep-fb', 'rep-cuc'] },
  { id: 'tur-c', sigla: 'C', nome: 'Centrale',   inizio: '09:00', fine: '17:00', pausaMin: 60, colore: 2, reparti: ['rep-hk', 'rep-amm'] },
]

const SEED_SCHEMI: SchemaTurniHr[] = [
  { id: 'sch-cc',  nome: 'Ciclo continuo 3 turni', descrizione: 'Due mattine, due pomeriggi, due notti, due riposi: copre le 24 ore del ricevimento.',
    sequenza: ['tur-m', 'tur-m', 'tur-p', 'tur-p', 'tur-n', 'tur-n', RIPOSO, RIPOSO] },
  { id: 'sch-61',  nome: 'Rotazione 6+1 M/P', descrizione: 'Settimana di mattine e settimana di pomeriggi alternate, un riposo a settimana.',
    sequenza: ['tur-m', 'tur-m', 'tur-m', 'tur-m', 'tur-m', 'tur-m', RIPOSO, 'tur-p', 'tur-p', 'tur-p', 'tur-p', 'tur-p', 'tur-p', RIPOSO] },
  { id: 'sch-52',  nome: 'Centrale 5+2', descrizione: 'Cinque giorni sul turno centrale, sabato e domenica di riposo.',
    sequenza: ['tur-c', 'tur-c', 'tur-c', 'tur-c', 'tur-c', RIPOSO, RIPOSO] },
]

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

export const oreGiorno = (f: FasciaGiorno) =>
  f.attivo ? Math.max(0, durataMin(f.entrata, f.uscita) - f.pausaMin) / 60 : 0

/** Ore settimanali effettive dell'orario. */
export const oreSettimanaliOrario = (o: OrarioHr) =>
  o.aTurni ? o.oreSettimanali : Math.round(o.giorni.reduce((a, f) => a + oreGiorno(f), 0) * 100) / 100

export const giorniLavorativiOrario = (o: OrarioHr) =>
  o.aTurni ? o.giorniSettimana : o.giorni.filter(f => f.attivo).length

/** Ore nette di un turno (fasce − pausa). */
export const oreTurno = (t: TurnoHr) =>
  Math.max(0, durataMin(t.inizio, t.fine) + durataMin(t.inizio2 ?? '', t.fine2 ?? '') - t.pausaMin) / 60

/** Turno notturno: almeno 3 ore della fascia tra le 22 e le 6. */
export const turnoNotturno = (t: TurnoHr) => {
  const s = minuti(t.inizio), e = s + durataMin(t.inizio, t.fine)
  let notte = 0
  for (let m = s; m < e; m += 15) { const h = (m % 1440) / 60; if (h >= 22 || h < 6) notte += 15 }
  return notte >= 180
}

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

// ─── Store ───────────────────────────────────────────────────────────────────

export interface HrConfigData {
  reparti: RepartoHr[]
  orari: OrarioHr[]
  turni: TurnoHr[]
  schemi: SchemaTurniHr[]
  tipologie: TipologiaContrattoHr[]
  ccnl: CcnlHr[]
}

interface HrConfigState extends HrConfigData {
  setReparti: (v: RepartoHr[]) => void
  setOrari: (v: OrarioHr[]) => void
  setTurnistica: (turni: TurnoHr[], schemi: SchemaTurniHr[]) => void
  setTipologie: (v: TipologiaContrattoHr[]) => void
  setCcnl: (v: CcnlHr[]) => void
}

export const HR_CONFIG_SEED: HrConfigData = {
  reparti: SEED_REPARTI, orari: SEED_ORARI, turni: SEED_TURNI, schemi: SEED_SCHEMI,
  tipologie: SEED_TIPOLOGIE, ccnl: SEED_CCNL,
}

export const useHrConfigStore = create<HrConfigState>()(
  persist(
    (set) => ({
      ...HR_CONFIG_SEED,
      setReparti: (reparti) => set({ reparti }),
      setOrari: (orari) => set({ orari }),
      setTurnistica: (turni, schemi) => set({ turni, schemi }),
      setTipologie: (tipologie) => set({ tipologie }),
      setCcnl: (ccnl) => set({ ccnl }),
    }),
    { name: 'sibylla.hr-config', version: 1 },
  ),
)

// Lookup comodi (fuori da React o nei render)
export const findById = <T extends { id: string }>(list: T[], id?: string) => (id ? list.find(x => x.id === id) : undefined)
