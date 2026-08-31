import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── STAMPANTI (F&B) ──────────────────────────────────────────────────────────
//  Anagrafica delle stampanti dell'outlet: quelle di reparto, che stampano le
//  comande dove il piatto si prepara, e quelle fiscali/preconto della cassa.
//  Le voci di menu (`useVociMenuStore`) instradano le comande a queste
//  stampanti per id: è la fonte unica dei nomi che compaiono là.

export type TipoStampante = 'produzione' | 'fiscale' | 'preconto'

/** Come la stampante è raggiunta: in rete (serve l'IP) o collegata alla cassa. */
export type ConnessioneStampante = 'rete' | 'locale'

export type ProtocolloStampante = 'epson' | 'star' | 'custom' | 'escpos'

export interface Stampante {
  id: string
  nome: string
  tipo: TipoStampante
  connessione: ConnessioneStampante
  /** Indirizzo IP: valorizzato solo sulle stampanti in rete. */
  ip: string
  protocollo: ProtocolloStampante
  /** Outlet servito; null = tutti gli outlet della struttura. */
  outletId: number | null
  /** Reparto servito, sulle stampanti di produzione (cucina, bar, pasticceria…). */
  reparto: string
  attiva: boolean
}

export const TIPI_STAMPANTE: Array<{
  id: TipoStampante
  label: string
  /** Che cosa stampa, in chiaro: la sigla da sola non lo dice. */
  hint: string
  /** Famiglia dei filtri: produzione oppure cassa. */
  famiglia: 'produzione' | 'cassa'
  /** Token della palette validata. */
  colore: string
}> = [
  { id: 'produzione', label: 'Reparto produzione', hint: 'comande di cucina e bar',  famiglia: 'produzione', colore: 'var(--chart-3)' },
  { id: 'fiscale',    label: 'Fiscale',            hint: 'scontrino e fattura',      famiglia: 'cassa',      colore: 'var(--chart-5)' },
  { id: 'preconto',   label: 'Preconto',           hint: 'conto non fiscale al tavolo', famiglia: 'cassa',   colore: 'var(--chart-4)' },
]

export const tipoStampanteMeta = (id: TipoStampante) =>
  TIPI_STAMPANTE.find(t => t.id === id) ?? TIPI_STAMPANTE[0]

export const PROTOCOLLI_STAMPANTE: Array<{ id: ProtocolloStampante; label: string }> = [
  { id: 'epson',  label: 'Epson (ESC/POS)' },
  { id: 'star',   label: 'Star' },
  { id: 'escpos', label: 'ESC/POS generico' },
  { id: 'custom', label: 'Custom / RT' },
]

export const protocolloLabel = (id: ProtocolloStampante): string =>
  PROTOCOLLI_STAMPANTE.find(p => p.id === id)?.label ?? id

/** Reparti proposti per le stampanti di produzione. */
export const REPARTI_STAMPA: string[] = [
  'Cucina - Caldi', 'Cucina - Freddi', 'Pasticceria', 'Bar', 'Dispensa', 'Pass',
]

/** IPv4 valido: la stampante in rete senza indirizzo corretto non stampa. */
export const ipValido = (ip: string): boolean =>
  /^(\d{1,3}\.){3}\d{1,3}$/.test(ip.trim())
  && ip.trim().split('.').every(n => Number(n) >= 0 && Number(n) <= 255)

const SEED: Stampante[] = [
  { id: 'st-caldi',       nome: 'Cucina - Caldi',     tipo: 'produzione', connessione: 'rete',   ip: '192.168.1.70', protocollo: 'epson',  outletId: null, reparto: 'Cucina - Caldi',  attiva: true },
  { id: 'st-freddi',      nome: 'Cucina - Freddi',    tipo: 'produzione', connessione: 'rete',   ip: '192.168.1.71', protocollo: 'epson',  outletId: 1,    reparto: 'Cucina - Freddi', attiva: true },
  { id: 'st-pasticceria', nome: 'Pasticceria',        tipo: 'produzione', connessione: 'rete',   ip: '192.168.1.72', protocollo: 'epson',  outletId: 1,    reparto: 'Pasticceria',     attiva: true },
  { id: 'st-preconto',    nome: 'Stampa Pre-Conto',   tipo: 'preconto',   connessione: 'locale', ip: '',             protocollo: 'epson',  outletId: 1,    reparto: '',                attiva: true },
  { id: 'st-cassa-rest',  nome: 'Cassa Restaurant',   tipo: 'fiscale',    connessione: 'rete',   ip: '192.168.1.80', protocollo: 'custom', outletId: 1,    reparto: '',                attiva: true },
  { id: 'st-roof',        nome: 'Cucina Roof Top',    tipo: 'produzione', connessione: 'rete',   ip: '192.168.2.70', protocollo: 'star',   outletId: 2,    reparto: 'Cucina - Caldi',  attiva: true },
  { id: 'st-cassa-roof',  nome: 'Cassa Roof Top',     tipo: 'fiscale',    connessione: 'rete',   ip: '192.168.2.80', protocollo: 'custom', outletId: 2,    reparto: '',                attiva: false },
  { id: 'st-bar',         nome: 'Bar Sibylla',        tipo: 'produzione', connessione: 'rete',   ip: '192.168.3.70', protocollo: 'epson',  outletId: 3,    reparto: 'Bar',             attiva: true },
]

interface StampantiState {
  stampanti: Stampante[]
  addStampante:    (s: Omit<Stampante, 'id'>) => Stampante
  updateStampante: (id: string, patch: Partial<Stampante>) => void
  removeStampante: (id: string) => void
  toggleStampante: (id: string) => void
}

const newId = () => `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useStampantiStore = create<StampantiState>()(
  persist(
    (set) => ({
      stampanti: SEED.map(s => ({ ...s })),

      addStampante: (s) => {
        const created: Stampante = { id: newId(), ...s }
        set(st => ({ stampanti: [...st.stampanti, created] }))
        return created
      },
      updateStampante: (id, patch) =>
        set(st => ({ stampanti: st.stampanti.map(s => s.id === id ? { ...s, ...patch } : s) })),
      removeStampante: (id) =>
        set(st => ({ stampanti: st.stampanti.filter(s => s.id !== id) })),
      toggleStampante: (id) =>
        set(st => ({ stampanti: st.stampanti.map(s => s.id === id ? { ...s, attiva: !s.attiva } : s) })),
    }),
    { name: 'sibylla.fb.stampanti', version: 1 },
  ),
)

/** Anagrafica per i pane che le referenziano (voci di menu). */
export const stampantiDisponibili = (): Stampante[] =>
  useStampantiStore.getState().stampanti

/** Etichetta di una stampante: «Cucina - Caldi (Reparto produzione)». */
export const stampanteLabel = (id: string): string => {
  const s = stampantiDisponibili().find(x => x.id === id)
  return s ? `${s.nome} (${tipoStampanteMeta(s.tipo).label})` : id
}

/** Stampanti ordinate: prima la produzione, poi la cassa; a pari tipo per nome. */
export const stampantiOrdinate = (
  stampanti: Stampante[],
  outletId: number | 'tutti',
): Stampante[] =>
  stampanti
    // null = tutti gli outlet: la stampante compare comunque nel filtro outlet
    .filter(s => outletId === 'tutti' || s.outletId === null || s.outletId === outletId)
    .sort((a, b) =>
      TIPI_STAMPANTE.findIndex(t => t.id === a.tipo) - TIPI_STAMPANTE.findIndex(t => t.id === b.tipo)
      || a.nome.localeCompare(b.nome, 'it'))
