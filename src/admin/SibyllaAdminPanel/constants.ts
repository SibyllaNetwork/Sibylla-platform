import MENU from '../../navigation/menu'
import { getAllPages } from './helpers'
import { FNB_ITEMS } from '../../modules/impostazioni/Configuratore/configuratoriList'
import type { Cliente, Intestatario, Modulo, Ruolo, TipologiaCategoria, UserRow } from './types'

export const ALL_PAGES: string[] = getAllPages(MENU as any)

// Strutture/clienti di test — una per ciascuna tipologia gestita
// (Hotel, B&B, Ristoranti, Bar, Case Vacanze, Appartamenti, Studentati).
export const CLIENTS_INIT: Cliente[] = [
  { id: 1, nome: 'Hotel Noto',          categoria: 'hotel',        classificazione: 'Resort 5★',  citta: 'Noto (SR)',        camere: 80,  valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@hotelnoto.it',        tel: '+39 0931 000001' },
  { id: 2, nome: 'Grand Hotel Roma',    categoria: 'hotel',        classificazione: '4★',         citta: 'Roma (RM)',        camere: 120, valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@grandhotelroma.it',   tel: '+39 06 000002'   },
  { id: 3, nome: 'B&B Il Glicine',      categoria: 'bnb',          classificazione: '',           citta: 'Lecce (LE)',       camere: 6,   valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@bbilglicine.it',      tel: '+39 0832 000003' },
  { id: 4, nome: 'Trattoria del Porto', categoria: 'ristorante',   classificazione: 'Trattoria',  citta: 'Catania (CT)',     camere: 0,   valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@trattoriadelporto.it', tel: '+39 095 000004' },
  { id: 5, nome: 'Sky Lounge Bar',      categoria: 'bar',          classificazione: 'Cocktail Bar', citta: 'Milano (MI)',    camere: 0,   valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@skyloungebar.it',     tel: '+39 02 000005'   },
  { id: 6, nome: 'Case Vacanze Riviera',categoria: 'case-vacanze', classificazione: '',           citta: 'Rimini (RN)',      camere: 12,  valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@casevacanzeriviera.it', tel: '+39 0541 000006' },
  { id: 7, nome: 'Residence Aurora',    categoria: 'appartamenti', classificazione: '',           citta: 'Firenze (FI)',     camere: 24,  valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@residenceaurora.it',  tel: '+39 055 000007'  },
  { id: 8, nome: 'Campus Living Torino',categoria: 'studentato',   classificazione: '',           citta: 'Torino (TO)',      camere: 150, valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@campuslivingto.it',   tel: '+39 011 000008'  },
]

// ─── Intestatari del contratto (clienti) → strutture possedute ────────────────
// Un intestatario sottoscrive il contratto e possiede una o più strutture
// (CLIENTS_INIT). I `moduli` qui indicati sono quelli del contratto e guidano il
// menu che il cliente vede da loggato (preview nella console assistenza).
export const INTESTATARI_INIT: Intestatario[] = [
  { id: 'int-gar',     nome: 'Gar S.r.l.',         email: 'amministrazione@gar.it',        moduli: ['full-suite'], struttureIds: [1, 2] },
  { id: 'int-salento', nome: 'Salento Stays',      email: 'info@salentostays.it',          moduli: ['operation'],  struttureIds: [3] },
  { id: 'int-rsud',    nome: 'Ristorazione Sud',   email: 'contratti@ristorazionesud.it',  moduli: ['ristoranti'], struttureIds: [4, 5] },
  { id: 'int-riviera', nome: 'Riviera Group',      email: 'admin@rivieragroup.it',         moduli: ['solo-sales'], struttureIds: [6, 7] },
  { id: 'int-campus',  nome: 'Campus Italia',      email: 'direzione@campusitalia.it',     moduli: ['executive'],  struttureIds: [8] },
]

export interface CategoriaStruttura {
  id: TipologiaCategoria
  label: string
  icona: string
  classificazioni: string[]    // [] = nessuna classificazione richiesta
  hasCamere: boolean           // mostra il campo "N° camere"
}

export const CATEGORIE_STRUTTURA: CategoriaStruttura[] = [
  { id: 'hotel',          label: 'Hotel',          icona: 'fa-hotel',          classificazioni: ['3★', '4★', '5★', 'Resort 4★', 'Resort 5★', 'Boutique', 'Luxury', 'Agriturismo'], hasCamere: true },
  { id: 'bnb',            label: 'B&B',            icona: 'fa-bed',            classificazioni: [],                                                                                hasCamere: true  },
  { id: 'appartamenti',   label: 'Appartamenti',   icona: 'fa-building',       classificazioni: [],                                                                                hasCamere: true  },
  { id: 'case-vacanze',   label: 'Case vacanze',   icona: 'fa-house',          classificazioni: [],                                                                                hasCamere: true  },
  { id: 'ostello',        label: 'Ostello',        icona: 'fa-bed-front',      classificazioni: [],                                                                                hasCamere: true  },
  { id: 'studentato',     label: 'Studentato',     icona: 'fa-building-user',  classificazioni: [],                                                                                hasCamere: true  },
  { id: 'ristorante',     label: 'Ristorante',     icona: 'fa-utensils',       classificazioni: ['Trattoria', 'Pizzeria', 'Fine Dining', 'Etnico'],                                hasCamere: false },
  { id: 'bar',            label: 'Bar',            icona: 'fa-mug-hot',        classificazioni: ['Caffetteria', 'Cocktail Bar', 'Wine Bar', 'Pub'],                                hasCamere: false },
  { id: 'centro-sportivo',label: 'Centro sportivo',icona: 'fa-dumbbell',       classificazioni: ['Palestra', 'Piscina', 'Tennis', 'Multidisciplinare'],                            hasCamere: false },
]

export function tipologiaLabel(c: Cliente): string {
  const cat = CATEGORIE_STRUTTURA.find(x => x.id === c.categoria)
  if (!cat) return c.classificazione || ''
  if (cat.id === 'hotel' && c.classificazione) return /★/.test(c.classificazione) ? `Hotel ${c.classificazione}` : c.classificazione
  if (c.classificazione) return `${cat.label} · ${c.classificazione}`
  return cat.label
}

const impresa = (MENU as any).find((m: any) => m.id === 'impresa')?.children || []
const salesPages    = getAllPages(impresa.find((c: any) => c.id === 'sales')?.children || [])
const execPages     = getAllPages(impresa.find((c: any) => c.id === 'executive')?.children || [])
const opPages       = getAllPages(impresa.find((c: any) => c.id === 'operation')?.children || [])

// Profilo (nodo top-level) + Food & Beverage (sotto Operation) + Configuratore
// (sezione Impostazioni) per il modulo Ristoranti.
const profiloPages = getAllPages((MENU as any).find((m: any) => m.id === 'profilo')?.children || [])
const operationChildren = impresa.find((c: any) => c.id === 'operation')?.children || []
const fbPages      = getAllPages(operationChildren.find((c: any) => c.id === 'food-beverage')?.children || [])
const ristorantiPages = Array.from(new Set([...profiloPages, ...fbPages, 'configuratore']))

// Voci F&B del Configuratore — il modulo Ristoranti vede del Configuratore solo queste.
const FNB_CONFIG_IDS = FNB_ITEMS.map(i => i.id)

export const PACCHETTI_INIT: Modulo[] = [
  { id: 'solo-sales',  label: 'Solo Sales',     desc: 'Pricing, E-distribution, Booking', pages: salesPages },
  { id: 'full-suite',  label: 'Full Suite',     desc: 'Tutti i moduli disponibili',       pages: [...ALL_PAGES] },
  { id: 'executive',   label: 'Executive Only', desc: 'Dashboard e reportistica',         pages: execPages },
  { id: 'operation',   label: 'Operation',      desc: 'Front office, F&B, Movimenti',     pages: opPages },
  { id: 'ristoranti',  label: 'Ristoranti',     desc: 'Profilo completo + Food & Beverage', pages: ristorantiPages, configuratoreItems: FNB_CONFIG_IDS },
]

// ─── Amministratori e moduli per azienda (singola fonte) ──────────────────────
// Ogni azienda (cliente) ha un amministratore — la stessa utenza usata come
// profilo di login — e i moduli sottoscritti dal contratto. Da qui derivano:
// gli utenti del cliente (USERS_INIT), i moduli assegnati (ASSIGNED_MODULI_INIT)
// e i profili di accesso (useAccessStore).
export interface ClientAdminSeed {
  nome: string
  email: string
  moduli: string[]
}

export const CLIENT_ADMINS: Record<number, ClientAdminSeed> = {
  1: { nome: 'Maria Rossi',  email: 'maria@hotelnoto.it',          moduli: ['solo-sales'] },
  2: { nome: 'Carlo Verdi',  email: 'carlo@grandhotelroma.it',     moduli: ['full-suite'] },
  3: { nome: 'Anna Conti',   email: 'anna@bbilglicine.it',         moduli: ['operation'] },
  4: { nome: 'Giulia Neri',  email: 'giulia@trattoriadelporto.it', moduli: ['ristoranti'] },
  5: { nome: 'Marco Bruno',  email: 'marco@skyloungebar.it',       moduli: ['ristoranti'] },
  6: { nome: 'Sara Greco',   email: 'sara@casevacanzeriviera.it',  moduli: ['solo-sales'] },
  7: { nome: 'Paolo Ferri',  email: 'paolo@residenceaurora.it',    moduli: ['operation'] },
  8: { nome: 'Elena Russo',  email: 'elena@campuslivingto.it',     moduli: ['executive'] },
}

// Moduli assegnati per cliente (id → id moduli).
export const ASSIGNED_MODULI_INIT: Record<number, string[]> = Object.fromEntries(
  Object.entries(CLIENT_ADMINS).map(([id, a]) => [Number(id), a.moduli]),
) as Record<number, string[]>

/** Unione delle pagine dei moduli indicati (da PACCHETTI_INIT). */
export function pagesForModuli(ids: string[]): string[] {
  const s = new Set<string>()
  PACCHETTI_INIT.forEach(m => { if (ids.includes(m.id)) m.pages.forEach(p => s.add(p)) })
  return Array.from(s)
}

// Ogni cliente ha come utente il proprio amministratore (= profilo di login).
export const USERS_INIT: Record<number, UserRow[]> = Object.fromEntries(
  CLIENTS_INIT.map(c => {
    const a = CLIENT_ADMINS[c.id]
    return [c.id, a ? [{ id: c.id, nome: a.nome, email: a.email, ruolo: 'Amministratore', attivo: true }] : []]
  }),
) as Record<number, UserRow[]>

export const RUOLO_COLORS: string[] = [
  '#5C9CD4', '#5A8A3C', '#E07B39', '#9B59B6',
  '#C4A820', '#E74C3C', '#204769', '#1ABC9C',
]

// Ruoli di esempio assegnati a ogni azienda cliente, così i tab Ruoli e Funzioni
// non risultano vuoti. Persistiti via useAdminConfigStore (le creazioni si salvano).
const RUOLI_TEMPLATE: ReadonlyArray<readonly [string, string, number]> = [
  ['Amministratore', 'Accesso completo alla struttura',  6],
  ['Direttore',      'Direzione e supervisione',         0],
  ['Manager',        'Gestione operativa quotidiana',    2],
  ['Operatore',      'Operatività di reparto',           1],
  ['Viewer',         'Sola consultazione',               5],
]

export const RUOLI_INIT: Record<number, Ruolo[]> = Object.fromEntries(
  CLIENTS_INIT.map(c => [
    c.id,
    RUOLI_TEMPLATE.map(([nome, desc, ci], i) => ({
      id: `r-${c.id}-${i}`, nome, desc, colore: RUOLO_COLORS[ci],
    })),
  ]),
) as Record<number, Ruolo[]>

export const LINGUA_OPTIONS = ['Italiano', 'English', 'Français', 'Deutsch', 'Español']
export const VALUTA_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF']
export const RUOLI_UTENTE   = ['Amministratore', 'Manager', 'Supervisore', 'Operatore', 'Viewer']
