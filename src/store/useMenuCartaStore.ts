import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  useVociMenuStore,
  marginePerc,
  type VoceMenu,
  type CodiceAllergene,
} from './useVociMenuStore'

// ─── MENU (F&B) ───────────────────────────────────────────────────────────────
//  Fonte unica dei menu di un outlet: il menu di carta o il menu fisso che si
//  compone scegliendo le voci del catalogo F&B. Serve a due pane che lavorano
//  sullo stesso dato:
//   • «Crea menu»  → composizione (intestazione + righe + salvataggio);
//   • «Lista menu» → elenco dei menu salvati, con modifica/anteprima/duplica.
//
//  Le voci sono referenziate per id (`useVociMenuStore`): il menu NON copia
//  nome, prezzo, food cost e allergeni, così una correzione al catalogo si
//  riflette su ogni menu che quella voce compone — ed è per questo che food
//  cost e margine possono essere calcolati e non vanno riscritti a mano.

/** Riga di un menu: la voce scelta più la descrizione con cui compare a menu. */
export interface RigaMenu {
  /** Id di riga: key stabile in fase di composizione. */
  rid: string
  voceId: string
  /**
   * Descrizione stampata sul menu. Parte da quella della voce e si può
   * ritoccare per il singolo menu (la voce di catalogo resta intatta).
   */
  descrizione: string
}

export interface MenuCarta {
  id: string
  outletId: number
  nome: string
  /** Dettagli del menu: la colonna «Dettagli» dell'elenco. */
  dettagli: string
  /** yyyy-mm-dd */
  dataCreazione: string
  /** Menu fisso = un unico prezzo di vendita per tutto il menu. */
  fisso: boolean
  /** Prezzo del menu fisso in euro; `null` sui menu non fissi. */
  prezzoVendita: number | null
  righe: RigaMenu[]
  attivo: boolean
}

// ── Calcoli del menu ─────────────────────────────────────────────────────────
//  Un solo posto in cui vivono le regole economiche del menu.

const voce = (voci: VoceMenu[], id: string): VoceMenu | undefined =>
  voci.find(v => v.id === id)

/** Somma dei food cost delle voci incluse. */
export const foodCostMenu = (m: MenuCarta, voci: VoceMenu[]): number =>
  m.righe.reduce((t, r) => t + (voce(voci, r.voceId)?.foodCost ?? 0), 0)

/** Somma dei prezzi di carta delle voci incluse. */
export const prezzoListinoMenu = (m: MenuCarta, voci: VoceMenu[]): number =>
  m.righe.reduce((t, r) => t + (voce(voci, r.voceId)?.prezzo ?? 0), 0)

/**
 * Prezzo di vendita effettivo: il prezzo fisso quando il menu è fisso,
 * altrimenti la somma dei prezzi di carta delle voci.
 */
export const prezzoMenu = (m: MenuCarta, voci: VoceMenu[]): number =>
  m.fisso ? (m.prezzoVendita ?? 0) : prezzoListinoMenu(m, voci)

/** Margine percentuale del menu: (prezzo di vendita - food cost) / prezzo. */
export const margineMenu = (m: MenuCarta, voci: VoceMenu[]): number =>
  marginePerc(prezzoMenu(m, voci), foodCostMenu(m, voci))

/**
 * Allergeni presenti nel menu: l'unione di quelli delle voci incluse, in
 * ordine di codice. È l'informazione che sostituisce il semaforo sì/no
 * dell'elenco precedente: al cliente serve *quali* allergeni, non se ce ne sono.
 */
export const allergeniMenu = (m: MenuCarta, voci: VoceMenu[]): CodiceAllergene[] => {
  const set = new Set<CodiceAllergene>()
  m.righe.forEach(r => voce(voci, r.voceId)?.allergeni.forEach(a => set.add(a)))
  return Array.from(set).sort()
}

/** Menu di un outlet, dal più vecchio al più recente come nell'elenco. */
export const menuOrdinati = (menu: MenuCarta[], outletId: number | 'tutti'): MenuCarta[] =>
  menu
    .filter(m => outletId === 'tutti' || m.outletId === outletId)
    .sort((a, b) => a.dataCreazione.localeCompare(b.dataCreazione) || a.nome.localeCompare(b.nome, 'it'))

// ── Seed ──────────────────────────────────────────────────────────────────────
const r = (voceId: string, descrizione = ''): RigaMenu => ({
  rid: `rm-${voceId}`,
  voceId,
  descrizione,
})

const SEED: MenuCarta[] = [
  {
    id: 'mc-inverno', outletId: 1, nome: 'Menu Gennaio 2026',
    dettagli: 'Menu carne e pesce invernale',
    dataCreazione: '2026-01-12', fisso: true, prezzoVendita: 55,
    righe: [
      r('vm-carpaccio'), r('vm-tagliatelle'), r('vm-bistecca'),
      r('vm-patate'), r('vm-tiramisu'), r('vm-espresso'),
    ],
    attivo: true,
  },
  {
    id: 'mc-pesce', outletId: 1, nome: 'Menu Pesce',
    dettagli: 'Menu di pesce fresco',
    dataCreazione: '2026-02-02', fisso: true, prezzoVendita: 62,
    righe: [
      r('vm-bruschetta'), r('vm-vongole'), r('vm-branzino'),
      r('vm-broccoletti'), r('vm-tiramisu'),
    ],
    attivo: true,
  },
  {
    id: 'mc-veg', outletId: 1, nome: 'Menu Vegetariano',
    dettagli: 'Menu vegetariano stagionale',
    dataCreazione: '2026-02-15', fisso: true, prezzoVendita: 42,
    righe: [
      r('vm-bruschetta'), r('vm-risotto'), r('vm-broccoletti'),
      r('vm-patate'), r('vm-tiramisu'),
    ],
    attivo: true,
  },
  {
    id: 'mc-bambini', outletId: 1, nome: 'Menu Bambini',
    dettagli: 'Menu dedicato ai bambini',
    dataCreazione: '2026-02-20', fisso: true, prezzoVendita: 22,
    righe: [r('vm-carbonara'), r('vm-patate'), r('vm-tiramisu'), r('vm-acqua')],
    attivo: true,
  },
  {
    id: 'mc-carta-roof', outletId: 2, nome: 'Carta Roof Top',
    dettagli: 'Carta a la carte del Roof Top Garden',
    dataCreazione: '2026-05-04', fisso: false, prezzoVendita: null,
    righe: [
      r('vm-carpaccio'), r('vm-tonno'), r('vm-champagne'), r('vm-chardonnay'),
    ],
    attivo: true,
  },
]

interface MenuCartaState {
  menu: MenuCarta[]
  /** Menu aperto in composizione: come «Lista menu» passa la staffetta a «Crea menu». */
  menuInModifica: string | null
  addMenu:      (m: Omit<MenuCarta, 'id'>) => MenuCarta
  updateMenu:   (id: string, patch: Partial<MenuCarta>) => void
  removeMenu:   (id: string) => void
  duplicaMenu:  (id: string) => MenuCarta | null
  toggleMenu:   (id: string) => void
  setMenuInModifica: (id: string | null) => void
}

const newId = () => `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useMenuCartaStore = create<MenuCartaState>()(
  persist(
    (set, get) => ({
      menu: SEED.map(m => ({ ...m, righe: m.righe.map(x => ({ ...x })) })),
      menuInModifica: null,

      addMenu: (m) => {
        const created: MenuCarta = { id: newId(), ...m }
        set(s => ({ menu: [...s.menu, created] }))
        return created
      },
      updateMenu: (id, patch) =>
        set(s => ({ menu: s.menu.map(m => m.id === id ? { ...m, ...patch } : m) })),
      removeMenu: (id) =>
        set(s => ({
          menu: s.menu.filter(m => m.id !== id),
          menuInModifica: s.menuInModifica === id ? null : s.menuInModifica,
        })),
      duplicaMenu: (id) => {
        const orig = get().menu.find(m => m.id === id)
        if (!orig) return null
        const copia: MenuCarta = {
          ...orig,
          id: newId(),
          nome: `${orig.nome} (copia)`,
          dataCreazione: new Date().toISOString().slice(0, 10),
          righe: orig.righe.map((x, i) => ({ ...x, rid: `${x.rid}-c${i}` })),
        }
        set(s => ({ menu: [...s.menu, copia] }))
        return copia
      },
      toggleMenu: (id) =>
        set(s => ({ menu: s.menu.map(m => m.id === id ? { ...m, attivo: !m.attivo } : m) })),
      setMenuInModifica: (id) => set({ menuInModifica: id }),
    }),
    {
      name: 'sibylla.fb.menu',
      version: 1,
      // La staffetta tra i due pane è di sessione: non va persistita
      partialize: (s) => ({ menu: s.menu }) as MenuCartaState,
    },
  ),
)

/** Voci di catalogo attive, in ordine alfabetico: sorgente della select «Piatto». */
export const vociSelezionabili = (): VoceMenu[] =>
  useVociMenuStore.getState().voci
    .filter(v => v.attivo)
    .sort((a, b) => a.nomeIt.localeCompare(b.nomeIt, 'it'))
