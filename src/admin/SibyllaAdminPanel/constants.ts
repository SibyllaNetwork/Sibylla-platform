import MENU from '../../navigation/menu'
import { getAllPages } from './helpers'
import type { Cliente, Modulo, TipologiaCategoria, UserRow } from './types'

export const ALL_PAGES: string[] = getAllPages(MENU as any)

export const CLIENTS_INIT: Cliente[] = [
  { id: 1, nome: 'Hotel Noto',        categoria: 'hotel',           classificazione: 'Resort 5★',  citta: 'Noto (SR)',         camere: 80,  valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@hotelnoto.it',     tel: '+39 0931 000001' },
  { id: 2, nome: 'Grand Hotel Roma',  categoria: 'hotel',           classificazione: '4★',         citta: 'Roma (RM)',         camere: 120, valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@grandhotelroma.it', tel: '+39 06 000002'   },
  { id: 3, nome: 'Villa Bellini',     categoria: 'hotel',           classificazione: 'Boutique',   citta: 'Catania (CT)',      camere: 24,  valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@villabellini.it',   tel: '+39 095 000003'  },
  { id: 4, nome: 'Hotel Siracusa',    categoria: 'hotel',           classificazione: '3★',         citta: 'Siracusa (SR)',     camere: 40,  valuta: 'EUR', lingua: 'Italiano', stato: 'sospeso', email: 'info@hotelsiracusa.it',  tel: '+39 0931 000004' },
  { id: 5, nome: 'Masseria Pugliese', categoria: 'bnb',             classificazione: 'Agriturismo',citta: 'Alberobello (BA)',  camere: 18,  valuta: 'EUR', lingua: 'Italiano', stato: 'attivo',  email: 'info@masserio.it',       tel: '+39 080 000005'  },
  { id: 6, nome: 'Palazzo Storico',   categoria: 'hotel',           classificazione: 'Luxury',     citta: 'Firenze (FI)',      camere: 55,  valuta: 'EUR', lingua: 'English',  stato: 'attivo',  email: 'info@palazzostorico.it', tel: '+39 055 000006'  },
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

export const PACCHETTI_INIT: Modulo[] = [
  { id: 'solo-sales',  label: 'Solo Sales',     desc: 'Pricing, E-distribution, Booking', pages: salesPages },
  { id: 'full-suite',  label: 'Full Suite',     desc: 'Tutti i moduli disponibili',       pages: [...ALL_PAGES] },
  { id: 'executive',   label: 'Executive Only', desc: 'Dashboard e reportistica',         pages: execPages },
  { id: 'operation',   label: 'Operation',      desc: 'Front office, F&B, Movimenti',     pages: opPages },
]

export const USERS_INIT: Record<number, UserRow[]> = {
  1: [
    { id: 1, nome: 'Luca H.',  email: 'luca.h@sibyllanetwork.com', ruolo: 'Amministratore', attivo: true },
    { id: 2, nome: 'Maria R.', email: 'maria.r@hotelnoto.it',      ruolo: 'Manager',        attivo: true },
  ],
  2: [
    { id: 3, nome: 'Carlo B.', email: 'carlo.b@grandhotelroma.it', ruolo: 'Amministratore', attivo: true },
  ],
  3: [], 4: [], 5: [], 6: [],
}

export const RUOLO_COLORS: string[] = [
  '#5C9CD4', '#5A8A3C', '#E07B39', '#9B59B6',
  '#C4A820', '#E74C3C', '#204769', '#1ABC9C',
]

export const LINGUA_OPTIONS = ['Italiano', 'English', 'Français', 'Deutsch', 'Español']
export const VALUTA_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF']
export const RUOLI_UTENTE   = ['Amministratore', 'Manager', 'Supervisore', 'Operatore', 'Viewer']
