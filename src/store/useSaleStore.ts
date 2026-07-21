import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Sale & tavoli (Food & Beverage) ──────────────────────────────────────────
//  Planimetria di una sala ristorante/bar: su una griglia si posizionano i TAVOLI
//  (con numero, capienza, forma e stato) e alcuni ELEMENTI di sala (bancone bar,
//  cucina, ingresso, bagni…). La pagina "Sale e tavoli" mostra la planimetria a
//  sinistra e il dettaglio ingrandito del tavolo selezionato a destra (stile
//  Planner). Store singleton persistito, con una o più sale.

export type TavoloForma = 'rotondo' | 'quadrato' | 'rettangolare'
export type TavoloStato = 'libero' | 'occupato' | 'riservato' | 'conto' | 'pulizia'

export const TAVOLO_STATO_META: Record<TavoloStato, { label: string; color: string }> = {
  libero:    { label: 'Libero',    color: '#00CF86' },
  occupato:  { label: 'Occupato',  color: '#FF616E' },
  riservato: { label: 'Prenotato', color: '#C69520' },
  conto:     { label: 'Conto',     color: '#5C9CD4' },
  pulizia:   { label: 'Da pulire', color: '#8399AB' },
}

// Camerieri assegnabili (demo)
export const CAMERIERI = ['—', 'Marco', 'Giulia', 'Luca', 'Sara', 'Paolo']

export type SalaElementKind = 'bar' | 'cucina' | 'ingresso' | 'bagno' | 'pianta' | 'area'

export const SALA_EL_META: Record<SalaElementKind, { label: string; icon: string }> = {
  bar:      { label: 'Bancone bar', icon: 'fa-martini-glass' },
  cucina:   { label: 'Cucina',      icon: 'fa-kitchen-set' },
  ingresso: { label: 'Ingresso',    icon: 'fa-door-open' },
  bagno:    { label: 'Bagni',       icon: 'fa-restroom' },
  pianta:   { label: 'Pianta',      icon: 'fa-seedling' },
  area:     { label: 'Area',        icon: 'fa-vector-square' },
}

export interface Tavolo {
  id: string
  numero: string
  capienza: number
  forma: TavoloForma
  stato: TavoloStato
  x: number; y: number; w: number; h: number
  // ── Servizio (gestione capo sala) ──
  /** Nominativo prenotazione / cliente al tavolo. */
  nominativo?: string
  /** Orario prenotazione (HH:MM). */
  orario?: string
  /** Coperti effettivamente seduti. */
  coperti?: number
  /** Note operative, allergie e intolleranze. */
  note?: string
  /** Telefono di contatto (prenotazione). */
  telefono?: string
  /** Data prenotazione (ISO yyyy-mm-dd). */
  data?: string
  /** Cameriere assegnato al tavolo. */
  cameriere?: string
  /** Cliente abituale collegato (id anagrafica). */
  clienteId?: string
  /** Timestamp (ms) di quando il tavolo è stato occupato (per il timer). */
  seatedAt?: number
  /** Id del gruppo di unione: i tavoli con lo stesso gruppo sono "uniti"
   *  (condividono stato e prenotazione; il tavolo capofila tiene i dati). */
  gruppo?: string
  /** Camera/soggiorno collegato: conto ed extra addebitati alla camera. */
  camera?: string
  /** Nominativo ospite della camera collegata (per il riepilogo addebito). */
  cameraOspite?: string
}

export interface SalaElement {
  id: string
  kind: SalaElementKind
  label?: string
  x: number; y: number; w: number; h: number
}

export interface Sala {
  id: string
  nome: string
  cols: number
  rows: number
  tavoli: Tavolo[]
  elementi: SalaElement[]
}

// Ingombro (in celle) di un tavolo in base a capienza e forma
export const tavoloSize = (capienza: number, forma: TavoloForma): [number, number] => {
  if (forma === 'rettangolare') {
    if (capienza <= 4) return [3, 2]
    if (capienza <= 6) return [4, 2]
    return [5, 2]
  }
  // rotondo / quadrato
  return capienza <= 2 ? [2, 2] : capienza <= 4 ? [2, 2] : capienza <= 6 ? [3, 3] : [3, 3]
}

// ── Seed dimostrativo: "Sala principale" ───────────────────────────────────────
const t = (numero: string, capienza: number, forma: TavoloForma, x: number, y: number, stato: TavoloStato = 'libero'): Tavolo => {
  const [w, h] = tavoloSize(capienza, forma)
  return { id: `seed-t${numero}`, numero, capienza, forma, stato, x, y, w, h }
}
const SEED_SALA: Sala = {
  id: 'sala-1',
  nome: 'Sala principale',
  cols: 16,
  rows: 10,
  tavoli: [
    t('1', 2, 'rotondo', 1, 1),
    t('2', 2, 'rotondo', 4, 1, 'occupato'),
    t('3', 4, 'quadrato', 7, 1),
    t('4', 4, 'quadrato', 10, 1, 'riservato'),
    t('5', 6, 'rettangolare', 1, 5),
    t('6', 6, 'rettangolare', 6, 5, 'occupato'),
    t('7', 8, 'rettangolare', 11, 5),
  ],
  elementi: [
    { id: 'seed-bar', kind: 'bar', label: 'Bancone bar', x: 13, y: 1, w: 2, h: 4 },
    { id: 'seed-ing', kind: 'ingresso', label: 'Ingresso', x: 7, y: 8, w: 2, h: 1 },
    { id: 'seed-cuc', kind: 'cucina', label: 'Cucina', x: 0, y: 8, w: 3, h: 2 },
  ],
}

interface SaleState {
  sale: Sala[]
  getSala: (id: string) => Sala | undefined
  addTavolo: (salaId: string, capienza: number, forma: TavoloForma) => string | undefined
  addElemento: (salaId: string, kind: SalaElementKind) => void
  updateTavolo: (salaId: string, tavoloId: string, patch: Partial<Tavolo>) => void
  updateElemento: (salaId: string, elId: string, patch: Partial<SalaElement>) => void
  moveItem: (salaId: string, itemId: string, x: number, y: number) => void
  /** Posiziona più item in blocco (allineamento/distribuzione): applica diretto,
   *  con solo clamp ai bordi della griglia (le sovrapposizioni sono ammesse). */
  setPositions: (salaId: string, updates: Array<{ id: string; x: number; y: number }>) => void
  removeItem: (salaId: string, itemId: string) => void
  /** Elimina più item (tavoli/elementi) in un colpo solo. */
  removeItems: (salaId: string, ids: string[]) => void
  setGrid: (salaId: string, cols: number, rows: number) => void
  addSala: (nome: string) => string
  renameSala: (salaId: string, nome: string) => void
  removeSala: (salaId: string) => void
  /** Unisce due o più tavoli in un unico gruppo (assorbe gruppi già esistenti). */
  unisciTavoli: (salaId: string, ids: string[]) => void
  /** Separa un gruppo di tavoli uniti. */
  separaGruppo: (salaId: string, gruppo: string) => void
  /** Trasferisce prenotazione/servizio da un tavolo a un altro (il primo torna libero). */
  trasferisci: (salaId: string, fromId: string, toId: string) => void
}

const nextNumero = (s: Sala) => {
  const max = s.tavoli.reduce((m, tv) => Math.max(m, parseInt(tv.numero, 10) || 0), 0)
  return String(max + 1)
}
const uid = (p: string) => `${p}-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e4)}`

// area libera sulla griglia (esclude un item per il move)
const free = (s: Sala, x: number, y: number, w: number, h: number, exceptId?: string) => {
  if (x < 0 || y < 0 || x + w > s.cols || y + h > s.rows) return false
  const all: Array<{ id: string; x: number; y: number; w: number; h: number }> = [...s.tavoli, ...s.elementi]
  return !all.some(it => it.id !== exceptId && x < it.x + it.w && x + w > it.x && y < it.y + it.h && y + h > it.y)
}
const findSpot = (s: Sala, w: number, h: number): [number, number] => {
  for (let y = 0; y + h <= s.rows; y++)
    for (let x = 0; x + w <= s.cols; x++)
      if (free(s, x, y, w, h)) return [x, y]
  return [0, 0]
}

export const useSaleStore = create<SaleState>()(
  persist(
    (set, get) => ({
      sale: [SEED_SALA],
      getSala: (id) => get().sale.find(s => s.id === id),
      addTavolo: (salaId, capienza, forma) => {
        const s = get().sale.find(x => x.id === salaId); if (!s) return
        const [w, h] = tavoloSize(capienza, forma)
        const [x, y] = findSpot(s, w, h)
        const id = uid('t')
        const nuovo: Tavolo = { id, numero: nextNumero(s), capienza, forma, stato: 'libero', x, y, w, h }
        set(st => ({ sale: st.sale.map(sa => sa.id === salaId ? { ...sa, tavoli: [...sa.tavoli, nuovo] } : sa) }))
        return id
      },
      addElemento: (salaId, kind) => {
        const s = get().sale.find(x => x.id === salaId); if (!s) return
        const size: Record<SalaElementKind, [number, number]> = {
          bar: [2, 4], cucina: [3, 2], ingresso: [2, 1], bagno: [2, 2], pianta: [1, 1], area: [3, 2],
        }
        const [w, h] = size[kind]
        const [x, y] = findSpot(s, w, h)
        const el: SalaElement = { id: uid('e'), kind, label: SALA_EL_META[kind].label, x, y, w, h }
        set(st => ({ sale: st.sale.map(sa => sa.id === salaId ? { ...sa, elementi: [...sa.elementi, el] } : sa) }))
      },
      updateTavolo: (salaId, tavoloId, patch) =>
        set(st => ({
          sale: st.sale.map(sa => sa.id !== salaId ? sa : {
            ...sa,
            tavoli: sa.tavoli.map(tv => {
              if (tv.id !== tavoloId) return tv
              const merged = { ...tv, ...patch }
              // ricalcola l'ingombro se cambiano capienza/forma
              if (patch.capienza !== undefined || patch.forma !== undefined) {
                const [w, h] = tavoloSize(merged.capienza, merged.forma)
                merged.w = w; merged.h = h
              }
              return merged
            }),
          }),
        })),
      updateElemento: (salaId, elId, patch) =>
        set(st => ({
          sale: st.sale.map(sa => sa.id !== salaId ? sa : {
            ...sa, elementi: sa.elementi.map(el => el.id === elId ? { ...el, ...patch } : el),
          }),
        })),
      moveItem: (salaId, itemId, x, y) =>
        set(st => ({
          sale: st.sale.map(sa => {
            if (sa.id !== salaId) return sa
            const it = [...sa.tavoli, ...sa.elementi].find(i => i.id === itemId)
            if (!it || !free(sa, x, y, it.w, it.h, itemId)) return sa
            return {
              ...sa,
              tavoli: sa.tavoli.map(tv => tv.id === itemId ? { ...tv, x, y } : tv),
              elementi: sa.elementi.map(el => el.id === itemId ? { ...el, x, y } : el),
            }
          }),
        })),
      setPositions: (salaId, updates) =>
        set(st => ({
          sale: st.sale.map(sa => {
            if (sa.id !== salaId) return sa
            const map = new Map(updates.map(u => [u.id, u]))
            const apply = <T extends { id: string; x: number; y: number; w: number; h: number }>(it: T): T => {
              const u = map.get(it.id); if (!u) return it
              return {
                ...it,
                x: Math.max(0, Math.min(sa.cols - it.w, Math.round(u.x))),
                y: Math.max(0, Math.min(sa.rows - it.h, Math.round(u.y))),
              }
            }
            return { ...sa, tavoli: sa.tavoli.map(apply), elementi: sa.elementi.map(apply) }
          }),
        })),
      removeItem: (salaId, itemId) =>
        set(st => ({
          sale: st.sale.map(sa => sa.id !== salaId ? sa : {
            ...sa,
            tavoli: sa.tavoli.filter(tv => tv.id !== itemId),
            elementi: sa.elementi.filter(el => el.id !== itemId),
          }),
        })),
      removeItems: (salaId, ids) =>
        set(st => ({
          sale: st.sale.map(sa => sa.id !== salaId ? sa : {
            ...sa,
            tavoli: sa.tavoli.filter(tv => !ids.includes(tv.id)),
            elementi: sa.elementi.filter(el => !ids.includes(el.id)),
          }),
        })),
      setGrid: (salaId, cols, rows) =>
        set(st => ({ sale: st.sale.map(sa => sa.id === salaId ? { ...sa, cols, rows } : sa) })),
      addSala: (nome) => {
        const id = uid('sala')
        set(st => ({ sale: [...st.sale, { id, nome, cols: 16, rows: 10, tavoli: [], elementi: [] }] }))
        return id
      },
      renameSala: (salaId, nome) =>
        set(st => ({ sale: st.sale.map(sa => sa.id === salaId ? { ...sa, nome } : sa) })),
      removeSala: (salaId) =>
        set(st => st.sale.length <= 1 ? st : ({ sale: st.sale.filter(sa => sa.id !== salaId) })),
      unisciTavoli: (salaId, ids) => {
        if (ids.length < 2) return
        const g = uid('grp')
        set(st => ({
          sale: st.sale.map(sa => {
            if (sa.id !== salaId) return sa
            // assorbi anche i gruppi già esistenti dei tavoli selezionati
            const gruppiSel = new Set(sa.tavoli.filter(tv => ids.includes(tv.id) && tv.gruppo).map(tv => tv.gruppo))
            const inGroup = (tv: Tavolo) => ids.includes(tv.id) || (!!tv.gruppo && gruppiSel.has(tv.gruppo))
            const membri = sa.tavoli.filter(inGroup)
            // capofila: chi ha una prenotazione, poi chi è non-libero, poi numero più basso
            const capo = membri.find(m => m.nominativo)
              ?? membri.find(m => m.stato !== 'libero')
              ?? [...membri].sort((a, b) => (parseInt(a.numero, 10) || 0) - (parseInt(b.numero, 10) || 0))[0]
            return {
              ...sa,
              tavoli: sa.tavoli.map(tv => {
                if (!inGroup(tv)) return tv
                if (tv.id === capo.id) return { ...tv, gruppo: g }
                // gli altri membri adottano stato/seatedAt del capofila e azzerano i propri dati
                return {
                  ...tv, gruppo: g, stato: capo.stato, seatedAt: capo.seatedAt,
                  nominativo: undefined, telefono: undefined, orario: undefined, data: undefined,
                  coperti: undefined, note: undefined, clienteId: undefined, cameriere: undefined,
                  camera: undefined, cameraOspite: undefined,
                }
              }),
            }
          }),
        }))
      },
      separaGruppo: (salaId, gruppo) =>
        set(st => ({
          sale: st.sale.map(sa => sa.id !== salaId ? sa : {
            ...sa, tavoli: sa.tavoli.map(tv => tv.gruppo === gruppo ? { ...tv, gruppo: undefined } : tv),
          }),
        })),
      trasferisci: (salaId, fromId, toId) =>
        set(st => ({
          sale: st.sale.map(sa => {
            if (sa.id !== salaId) return sa
            const from = sa.tavoli.find(t => t.id === fromId)
            if (!from || fromId === toId) return sa
            const carry: Partial<Tavolo> = {
              stato: from.stato, nominativo: from.nominativo, telefono: from.telefono,
              orario: from.orario, data: from.data, coperti: from.coperti, note: from.note,
              cameriere: from.cameriere, clienteId: from.clienteId, seatedAt: from.seatedAt,
              camera: from.camera, cameraOspite: from.cameraOspite,
            }
            const vuoto: Partial<Tavolo> = {
              stato: 'libero', nominativo: undefined, telefono: undefined, orario: undefined,
              data: undefined, coperti: undefined, note: undefined, cameriere: undefined,
              clienteId: undefined, seatedAt: undefined, camera: undefined, cameraOspite: undefined,
            }
            return {
              ...sa,
              tavoli: sa.tavoli.map(t =>
                t.id === toId ? { ...t, ...carry }
                : t.id === fromId ? { ...t, ...vuoto }
                : t),
            }
          }),
        })),
    }),
    { name: 'sibylla.sale', version: 1 },
  ),
)
