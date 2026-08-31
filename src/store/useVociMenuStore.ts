import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  useCategorieMenuStore,
  type CategoriaMenu as CategoriaMenuDef,
} from './useCategorieMenuStore'

// ─── VOCI MENU (F&B) ──────────────────────────────────────────────────────────
//  Fonte unica delle voci di menu — piatti, bevande e articoli — dell'anagrafica
//  F&B: nomi multilingua, categoria, prezzo base, allergeni UE, outlet su cui la
//  voce è attiva e instradamento alla produzione (stampanti + service monitor).
//  Sostituisce la pagina «Voci menu» della sub-app Outlet Manager, che teneva
//  gli stessi campi ma dietro a chiamate REST: qui il modello è locale e
//  persistito, come per gli altri pane nativi del Configuratore.

/** Codice dell'allergene secondo l'allegato II del Reg. UE 1169/2011. */
export type CodiceAllergene =
  'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N'

/**
 * Contesto di stampa di una comanda: la stessa voce può stampare in produzione
 * (il reparto che la prepara) e/o alla chiusura della comanda.
 */
export type ContestoStampa = 'reparto-produzione' | 'chiusura-comanda'

/** Riga «stampanti» della voce: quale stampante, su quale outlet, in che contesto. */
export interface RigaStampante {
  /** Id di riga: serve solo come key stabile in fase di editing. */
  rid: string
  /** Outlet della stampante; null = non ancora scelto. */
  outletId: number | null
  stampanteId: string
  contesto: ContestoStampa
}

/** Riga «service monitor» della voce: su quale KDS compare. */
export interface RigaMonitor {
  rid: string
  monitorId: string
}

export interface VoceMenu {
  id: string
  categoriaId: string
  nomeIt: string
  nomeEn: string
  nomeDe: string
  nomeFr: string
  descrizione: string
  /** Prezzo base in euro; i prezzi speciali per outlet/categoria cliente non stanno qui. */
  prezzo: number
  /**
   * Costo della materia prima in euro (food cost). Serve a comporre i menu:
   * margine = (prezzo - foodCost) / prezzo. Sta sulla voce e non sul menu
   * perché è un dato di catalogo: cambiando qui si aggiorna ogni menu.
   */
  foodCost: number
  allergeni: CodiceAllergene[]
  /** Outlet su cui la voce è attiva; array vuoto = tutti gli outlet. */
  outletIds: number[]
  stampanti: RigaStampante[]
  monitor: RigaMonitor[]
  attivo: boolean
}

// ── Allergeni UE ──────────────────────────────────────────────────────────────
//  I 14 allergeni a dichiarazione obbligatoria, nell'ordine dell'allegato II.
export const ALLERGENI_UE: Array<{ codice: CodiceAllergene; nome: string }> = [
  { codice: 'A', nome: 'Glutine' },
  { codice: 'B', nome: 'Crostacei' },
  { codice: 'C', nome: 'Uova' },
  { codice: 'D', nome: 'Pesce' },
  { codice: 'E', nome: 'Arachidi' },
  { codice: 'F', nome: 'Soia' },
  { codice: 'G', nome: 'Latte' },
  { codice: 'H', nome: 'Frutta a guscio' },
  { codice: 'I', nome: 'Sedano' },
  { codice: 'J', nome: 'Senape' },
  { codice: 'K', nome: 'Semi di sesamo' },
  { codice: 'L', nome: 'Anidride solforosa' },
  { codice: 'M', nome: 'Lupini' },
  { codice: 'N', nome: 'Molluschi' },
]

/**
 * Incidenza di default del food cost sul prezzo di carta, per categoria: la
 * materia prima di un caffè pesa molto meno di quella di una bottiglia di
 * vino, e un'unica percentuale su tutto renderebbe il margine dei menu una
 * colonna di numeri identici. Sono valori di partenza: il food cost reale si
 * corregge sulla singola voce.
 */
const INCIDENZA_FOOD_COST: Record<string, number> = {
  'cat-bollicine':   0.45,
  'cat-rossi':       0.42,
  'cat-bianchi':     0.40,
  'cat-rose':        0.38,
  'cat-secondi':     0.34,
  'cat-antipasti':   0.28,
  'cat-primi':       0.26,
  'cat-birre':       0.25,
  'cat-dessert':     0.24,
  'cat-contorni':    0.22,
  'cat-soft':        0.18,
  'cat-caffetteria': 0.12,
}

/** Food cost di partenza di una voce: quota del prezzo secondo la categoria. */
export const foodCostDiDefault = (prezzo: number, categoriaId: string): number =>
  Number((prezzo * (INCIDENZA_FOOD_COST[categoriaId] ?? 0.3)).toFixed(2))

/** Margine percentuale di una voce: (prezzo - food cost) / prezzo. */
export const marginePerc = (prezzo: number, foodCost: number): number =>
  prezzo > 0 ? Math.round(((prezzo - foodCost) / prezzo) * 100) : 0

export const allergeneMeta = (codice: CodiceAllergene) =>
  ALLERGENI_UE.find(a => a.codice === codice)

/** Etichetta completa di un allergene, per i tooltip: «A — Glutine». */
export const allergeneLabel = (codice: CodiceAllergene) => {
  const meta = allergeneMeta(codice)
  return meta ? `${meta.codice} — ${meta.nome}` : codice
}

// ── Categorie di menu ─────────────────────────────────────────────────────────
//  Le categorie NON sono un elenco di questa pagina: sono quelle gestite in
//  Configuratore → F&B → Categorie (`useCategorieMenuStore`). Qui si
//  referenziano per id, come Turni di servizio fa con le sale.
export type { CategoriaMenuDef }

/** Elenco delle categorie configurate, in ordine. */
export const categorieDisponibili = (): CategoriaMenuDef[] =>
  [...useCategorieMenuStore.getState().categorie].sort((a, b) => a.ordine - b.ordine)

export const categoriaMeta = (id: string): CategoriaMenuDef | undefined =>
  useCategorieMenuStore.getState().categorie.find(c => c.id === id)

export const categoriaNome = (id: string): string => categoriaMeta(id)?.nome ?? '—'

// ── Outlet, stampanti e monitor referenziati dalle voci ───────────────────────
//  Anagrafiche brevi condivise con gli altri pane F&B: qui si referenziano per
//  id, non si gestiscono.
export const OUTLET_FB: Array<{ id: number; nome: string }> = [
  { id: 1, nome: 'Sibylla Restaurant' },
  { id: 2, nome: 'Roof Top Garden' },
  { id: 3, nome: 'Lounge Bar Sibylla' },
]

export const STAMPANTI_FB: Array<{ id: string; nome: string; tipo: string; outletId: number }> = [
  { id: 'st-caldi',      nome: 'Cucina - Caldi',    tipo: 'Termica', outletId: 1 },
  { id: 'st-freddi',     nome: 'Cucina - Freddi',   tipo: 'Termica', outletId: 1 },
  { id: 'st-pasticceria',nome: 'Pasticceria',       tipo: 'Termica', outletId: 1 },
  { id: 'st-cassa-rest', nome: 'Cassa Restaurant',  tipo: 'Fiscale', outletId: 1 },
  { id: 'st-roof',       nome: 'Cucina Roof Top',   tipo: 'Termica', outletId: 2 },
  { id: 'st-cassa-roof', nome: 'Cassa Roof Top',    tipo: 'Fiscale', outletId: 2 },
  { id: 'st-bar',        nome: 'Bar Sibylla',       tipo: 'Termica', outletId: 3 },
]

export const stampanteLabel = (id: string): string => {
  const s = STAMPANTI_FB.find(x => x.id === id)
  return s ? `${s.nome} (${s.tipo})` : id
}

export const SERVICE_MONITOR_FB: Array<{ id: string; nome: string }> = [
  { id: 'mon-primi',   nome: 'KDS Cucina - Primi' },
  { id: 'mon-secondi', nome: 'KDS Cucina - Secondi' },
  { id: 'mon-freddi',  nome: 'KDS Freddi e antipasti' },
  { id: 'mon-past',    nome: 'KDS Pasticceria' },
  { id: 'mon-bar',     nome: 'KDS Bar' },
  { id: 'mon-pass',    nome: 'KDS Pass / Espositore' },
]

export const CONTESTI_STAMPA: Array<{ id: ContestoStampa; label: string }> = [
  { id: 'reparto-produzione', label: 'Reparto produzione' },
  { id: 'chiusura-comanda',   label: 'Chiusura comanda' },
]

// ── Seed ──────────────────────────────────────────────────────────────────────
//  Anagrafica di esempio ripresa dal prodotto attuale: abbastanza voci per
//  verificare filtro per categoria, contatore e larghezze delle colonne.
const v = (
  id: string,
  categoriaId: string,
  nomeIt: string,
  prezzo: number,
  allergeni: CodiceAllergene[] = [],
  extra: Partial<VoceMenu> = {},
): VoceMenu => ({
  id,
  categoriaId,
  nomeIt,
  nomeEn: '', nomeDe: '', nomeFr: '',
  descrizione: '',
  prezzo,
  foodCost: foodCostDiDefault(prezzo, categoriaId),
  allergeni,
  outletIds: [],
  stampanti: [],
  monitor: [],
  attivo: true,
  ...extra,
})

const SEED: VoceMenu[] = [
  v('vm-acqua', 'cat-soft', 'Acqua', 2.5, ['A', 'C'], {
    nomeEn: 'Water', nomeDe: 'Wasser', nomeFr: 'Eau',
    outletIds: [1, 2, 3],
  }),
  v('vm-amarone', 'cat-rossi', 'Amarone della Valpolicella', 55, ['L'], {
    descrizione: 'Veneto, annata 2017 — bottiglia 0,75 l.',
    stampanti: [{ rid: 'rs-amarone', outletId: 1, stampanteId: 'st-cassa-rest', contesto: 'chiusura-comanda' }],
  }),
  v('vm-barolo', 'cat-rossi', 'Barolo DOCG', 45, ['L']),
  v('vm-birra-media', 'cat-birre', 'Birra media', 5, ['A'], {
    nomeEn: 'Draft beer 0,4 l',
    outletIds: [3],
    monitor: [{ rid: 'rm-birra', monitorId: 'mon-bar' }],
  }),
  v('vm-bistecca', 'cat-secondi', 'Bistecca', 22, [], {
    nomeEn: 'Beef steak', nomeDe: 'Rindersteak', nomeFr: 'Steak de bœuf',
    descrizione: 'Controfiletto di scottona alla griglia, cottura a scelta.',
    stampanti: [{ rid: 'rs-bistecca', outletId: 1, stampanteId: 'st-caldi', contesto: 'reparto-produzione' }],
    monitor: [{ rid: 'rm-bistecca', monitorId: 'mon-secondi' }],
  }),
  v('vm-broccoletti', 'cat-contorni', 'Broccoletti', 5),
  v('vm-bruschetta', 'cat-antipasti', 'Bruschetta', 6.5, ['A'], {
    nomeEn: 'Bruschetta with tomato',
    stampanti: [{ rid: 'rs-brusc', outletId: 1, stampanteId: 'st-freddi', contesto: 'reparto-produzione' }],
    monitor: [{ rid: 'rm-brusc', monitorId: 'mon-freddi' }],
  }),
  v('vm-carbonara', 'cat-primi', 'Carbonara', 13, ['A', 'C', 'G'], {
    nomeEn: 'Spaghetti carbonara',
    descrizione: 'Guanciale, pecorino romano, uova, pepe nero.',
    monitor: [{ rid: 'rm-carbo', monitorId: 'mon-primi' }],
  }),
  v('vm-carpaccio', 'cat-antipasti', 'Carpaccio di manzo', 12, ['G']),
  v('vm-cerasuolo', 'cat-rose', 'Cerasuolo d\'Abruzzo', 20, ['L']),
  v('vm-champagne', 'cat-bollicine', 'Champagne Brut', 60, ['L'], { outletIds: [2, 3] }),
  v('vm-chardonnay', 'cat-bianchi', 'Chardonnay', 24, ['L']),
  v('vm-tagliatelle', 'cat-primi', 'Tagliatelle al ragù', 14, ['A', 'C']),
  v('vm-risotto', 'cat-primi', 'Risotto ai funghi porcini', 15, ['G'], {
    monitor: [{ rid: 'rm-risotto', monitorId: 'mon-primi' }],
  }),
  v('vm-vongole', 'cat-primi', 'Spaghetti alle vongole', 16, ['A', 'N']),
  v('vm-branzino', 'cat-secondi', 'Branzino al forno', 24, ['D']),
  v('vm-tonno', 'cat-secondi', 'Tagliata di tonno', 26, ['D', 'F'], { attivo: false }),
  v('vm-patate', 'cat-contorni', 'Patate al forno', 4.5),
  v('vm-tiramisu', 'cat-dessert', 'Tiramisù', 7, ['A', 'C', 'G'], {
    nomeEn: 'Tiramisu',
    stampanti: [{ rid: 'rs-tira', outletId: 1, stampanteId: 'st-pasticceria', contesto: 'reparto-produzione' }],
    monitor: [{ rid: 'rm-tira', monitorId: 'mon-past' }],
  }),
  v('vm-espresso', 'cat-caffetteria', 'Caffè espresso', 1.5),
]

interface VociMenuState {
  voci: VoceMenu[]
  addVoce:    (voce: Omit<VoceMenu, 'id'>) => VoceMenu
  updateVoce: (id: string, patch: Partial<VoceMenu>) => void
  removeVoce: (id: string) => void
  toggleVoce: (id: string) => void
}

const newId = () => `vm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

/** Id di riga per stampanti/monitor: key stabile mentre si edita il form. */
export const newRigaId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`

export const useVociMenuStore = create<VociMenuState>()(
  persist(
    (set) => ({
      voci: SEED.map(x => ({ ...x })),

      addVoce: (voce) => {
        const created: VoceMenu = { id: newId(), ...voce }
        set(s => ({ voci: [...s.voci, created] }))
        return created
      },
      updateVoce: (id, patch) =>
        set(s => ({ voci: s.voci.map(x => x.id === id ? { ...x, ...patch } : x) })),
      removeVoce: (id) =>
        set(s => ({ voci: s.voci.filter(x => x.id !== id) })),
      toggleVoce: (id) =>
        set(s => ({ voci: s.voci.map(x => x.id === id ? { ...x, attivo: !x.attivo } : x) })),
    }),
    {
      name: 'sibylla.fb.vociMenu',
      version: 2,
      // v2: la voce porta il food cost, base del margine nella composizione dei
      // menu. Le voci già salvate lo ricevono dalla quota della loro categoria.
      migrate: (stato: any) => ({
        ...stato,
        voci: (stato?.voci ?? []).map((v: VoceMenu) => ({
          ...v,
          foodCost: typeof v.foodCost === 'number'
            ? v.foodCost
            : foodCostDiDefault(v.prezzo ?? 0, v.categoriaId),
        })),
      }),
    },
  ),
)

/**
 * Voci ordinate per categoria (nell'ordine del menu) e poi per nome, con
 * filtro opzionale sulla categoria (null = tutte).
 */
export function vociOrdinate(voci: VoceMenu[], categoriaId: string | null): VoceMenu[] {
  return voci
    .filter(x => categoriaId == null || x.categoriaId === categoriaId)
    .sort((a, b) =>
      (categoriaMeta(a.categoriaId)?.ordine ?? 99) - (categoriaMeta(b.categoriaId)?.ordine ?? 99)
      || a.nomeIt.localeCompare(b.nomeIt, 'it'))
}

/**
 * Voce omonima nella stessa categoria: due piatti con lo stesso nome nella
 * stessa categoria sarebbero indistinguibili in comanda e sul web menu.
 */
export function voceDuplicata(voci: VoceMenu[], candidata: VoceMenu): VoceMenu | null {
  const nome = candidata.nomeIt.trim().toLowerCase()
  return voci.find(x =>
    x.id !== candidata.id
    && x.categoriaId === candidata.categoriaId
    && x.nomeIt.trim().toLowerCase() === nome,
  ) ?? null
}

/** Prezzo in euro formattato all'italiana: «13,00». */
export const formattaPrezzo = (prezzo: number): string =>
  prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Prezzo digitato nel form: accetta virgola o punto, rifiuta negativi e testo. */
export function prezzoDaTesto(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.')
  if (pulito === '') return null
  const n = Number(pulito)
  return Number.isFinite(n) && n >= 0 ? n : null
}
