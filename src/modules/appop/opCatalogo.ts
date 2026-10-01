// ─── CATALOGO APP OP! ─────────────────────────────────────────────────────────
//  Reparti, moduli e gradi dell'app Op! (Sibylla Operation). È la copia per la
//  piattaforma del catalogo di Op.Api: sibylla-op/packages/shared/src/moduli.ts e
//  backend/src/Op.Api/Contracts/Moduli.cs. Le chiavi devono restare identiche.

export type RepartoOp =
  | 'pulizie' | 'manutenzione' | 'magazzino' | 'frontOffice'
  | 'foodBeverage' | 'risorseUmane' | 'businessIntelligence' | 'purchasing'

export type LivelloOp = 'amministratore' | 'responsabile' | 'impiegato'

export interface ModuloOp {
  key: string
  label: string
  /** Funzione che richiede il gestionale alberghiero (non adatta ai clienti indipendenti). */
  pms?: boolean
}

export const MODULI_COMUNI: ModuloOp[] = [
  { key: 'turni',         label: 'Turni e calendario' },
  { key: 'timbratura',    label: 'Timbratura' },
  { key: 'richieste',     label: 'Permessi, ferie e cambi turno' },
  { key: 'chat',          label: 'Chat WhatsOp!' },
  { key: 'comunicazioni', label: 'Comunicazioni' },
  { key: 'segnalazioni',  label: 'Segnalazioni' },
  { key: 'compiti',       label: 'I miei compiti' },
  { key: 'walkie',        label: 'Walkie talkie' },
]

export const MODULI_SPECIFICI: ModuloOp[] = [
  { key: 'camere',          label: 'Avvia camera (pulizie)' },
  { key: 'interventi',      label: 'Intervento straordinario' },
  { key: 'magazzino',       label: 'Carico e chiusure di magazzino' },
  { key: 'checkin',         label: 'Check In', pms: true },
  { key: 'checkout',        label: 'Check Out', pms: true },
  { key: 'serviziCamera',   label: 'Servizi in camera', pms: true },
  { key: 'oggetti',         label: 'Oggetti smarriti' },
  { key: 'turniPersonale',  label: 'Turni del personale' },
  { key: 'hrApprovazioni',  label: 'Approvazioni (HR)' },
  { key: 'hrPresenze',      label: 'Presenze dei reparti' },
  { key: 'hrTurni',         label: 'Pianifica turni' },
  { key: 'hrComunicazioni', label: 'Comunicazioni al personale' },
  { key: 'hrTimbrature',    label: 'Entrate e uscite' },
  { key: 'hrPersonale',     label: 'Personale e saldi' },
  { key: 'fbSala',          label: 'Sala e tavoli' },
  { key: 'fbComande',       label: 'Comande' },
  { key: 'fbPrenotazioni',  label: 'Prenotazioni tavoli' },
  { key: 'fbOspiti',        label: 'Ospiti del giorno', pms: true },
  { key: 'fbMenu',          label: 'Menu e allergeni' },
  { key: 'biCruscotto',     label: 'Cruscotto (in preparazione)' },
  { key: 'acquisti',        label: 'Acquisti (in preparazione)' },
]

export const MODULI_OP: ModuloOp[] = [...MODULI_COMUNI, ...MODULI_SPECIFICI]

const COMUNI = MODULI_COMUNI.map(m => m.key)

export interface InfoRepartoOp {
  key: RepartoOp
  /** Id di op.reparti in Sibylla (e nell'archivio dei clienti indipendenti). */
  id: number
  nome: string
  predefiniti: string[]
}

export const REPARTI_OP: InfoRepartoOp[] = [
  { key: 'pulizie',              id: 2, nome: 'Pulizie',               predefiniti: [...COMUNI, 'camere'] },
  { key: 'manutenzione',         id: 3, nome: 'Manutenzione',          predefiniti: [...COMUNI, 'interventi'] },
  { key: 'magazzino',            id: 1, nome: 'Magazzino',             predefiniti: [...COMUNI, 'magazzino'] },
  { key: 'frontOffice',          id: 4, nome: 'Front Office',          predefiniti: [...COMUNI, 'checkin', 'checkout', 'serviziCamera', 'oggetti', 'turniPersonale'] },
  { key: 'foodBeverage',         id: 5, nome: 'Food & Beverage',       predefiniti: [...COMUNI, 'fbSala', 'fbComande', 'fbPrenotazioni', 'fbOspiti', 'fbMenu'] },
  { key: 'risorseUmane',         id: 6, nome: 'Risorse umane',         predefiniti: [...COMUNI, 'hrApprovazioni', 'hrPresenze', 'hrTurni', 'hrComunicazioni', 'hrTimbrature', 'hrPersonale'] },
  { key: 'businessIntelligence', id: 7, nome: 'Business Intelligence', predefiniti: [...COMUNI, 'biCruscotto'] },
  { key: 'purchasing',           id: 8, nome: 'Purchasing',            predefiniti: [...COMUNI, 'acquisti'] },
]

export const LIVELLI_OP: { value: LivelloOp; label: string }[] = [
  { value: 'impiegato',      label: 'Impiegato' },
  { value: 'responsabile',   label: 'Responsabile' },
  { value: 'amministratore', label: 'Amministratore' },
]

export const nomeReparto = (key: string) => REPARTI_OP.find(r => r.key === key)?.nome ?? key
export const repartoDaId = (id: number) => REPARTI_OP.find(r => r.id === id)
export const labelLivello = (l: string) => LIVELLI_OP.find(x => x.value === l)?.label ?? l

/** Moduli nell'ordine del catalogo (come li restituisce Op.Api). */
export const ordinaModuli = (moduli: string[]) => MODULI_OP.map(m => m.key).filter(k => moduli.includes(k))

/** Configurazione reparti → moduli. */
export type RepartiModuli = Partial<Record<RepartoOp, string[]>>
