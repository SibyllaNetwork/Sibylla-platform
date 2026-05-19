/**
 * Lista dei configuratori, raggruppati in macro-aree collassabili nella
 * sidebar interna del Configuratore.
 */

export type ConfiguratoreId =
  | 'scaglioni-occupazione'
  | 'finestre-prenotazione'
  | 'richieste-extra'
  | 'stagionalita'
  | 'personalizza-struttura'
  | 'camere-mapping'
  | 'overbooking-limit'
  | 'buffer-presenze'
  | 'mapping-segmento-mercato'
  | 'lotti-mapping'
  | 'listini-individuali'
  | 'listini-gruppi'
  | 'politiche-prenotazione'
  | 'contratti'
  | 'market-specifics'
  | 'bar-fit'
  | 'arrangiamenti'
  | 'bottom-rate'
  | 'vincolo-matriosca'
  | 'fasce-eta'
  | 'voci-incasso'
  | 'configura-outlet'
  | 'fb-impostazioni'
  | 'fb-voci-menu'
  | 'fb-crea-menu'
  | 'fb-lista-menu'
  | 'fb-allergeni'
  | 'fb-gestione-costi'

export interface ConfiguratoreItem {
  id: ConfiguratoreId
  label: string
  /** Font Awesome icon name (without `fa-` prefix). */
  icon: string
}

export interface ConfiguratoreGroup {
  id: string
  label: string
  /** Icona del gruppo. */
  icon: string
  items: ConfiguratoreItem[]
  /** Aperto di default? */
  defaultOpen?: boolean
}

export const GROUPS: ConfiguratoreGroup[] = [
  {
    id: 'occupazione',
    label: 'Occupazione & Disponibilità',
    icon: 'bed-front',
    defaultOpen: true,
    items: [
      { id: 'scaglioni-occupazione', label: 'Scaglioni occupazione', icon: 'file-pen' },
      { id: 'finestre-prenotazione', label: 'Finestre prenotazione', icon: 'calendar-check' },
      { id: 'buffer-presenze',       label: 'Buffer presenze',       icon: 'layer-group' },
      { id: 'overbooking-limit',     label: 'Overbooking limit',     icon: 'chart-line-up' },
      { id: 'camere-mapping',        label: 'Camere mapping',        icon: 'bed-front' },
      { id: 'lotti-mapping',         label: 'Lotti mapping',         icon: 'cube' },
      { id: 'vincolo-matriosca',     label: 'Vincolo matriosca',     icon: 'circles-overlap' },
    ],
  },
  {
    id: 'tariffe',
    label: 'Tariffe & Prezzi',
    icon: 'tag',
    items: [
      { id: 'listini-individuali', label: 'Listini individuali', icon: 'square-list' },
      { id: 'listini-gruppi',      label: 'Listini gruppi',      icon: 'rectangle-list' },
      { id: 'bottom-rate',         label: 'Bottom rate',         icon: 'ranking-star' },
      { id: 'bar-fit',             label: 'B.A.R / F.I.T.',      icon: 'bars' },
      { id: 'stagionalita',        label: 'Stagionalità',        icon: 'sun-cloud' },
      { id: 'fasce-eta',           label: "Fasce d'età",         icon: 'family' },
      { id: 'market-specifics',    label: 'Market specifics',    icon: 'store' },
    ],
  },
  {
    id: 'booking',
    label: 'Booking & Politiche',
    icon: 'calendar-check',
    items: [
      { id: 'politiche-prenotazione',   label: 'Politiche di prenotazione',   icon: 'hotel-circle-info' },
      { id: 'richieste-extra',          label: 'Richieste extra',             icon: 'hand-holding-circle-dollar' },
      { id: 'arrangiamenti',            label: 'Arrangiamenti',               icon: 'bell-concierge' },
      { id: 'mapping-segmento-mercato', label: 'Mapping segmento di mercato', icon: 'map-location-dot' },
    ],
  },
  {
    id: 'struttura',
    label: 'Struttura & Outlet',
    icon: 'hotel',
    items: [
      { id: 'personalizza-struttura', label: 'Personalizza struttura', icon: 'hotel' },
      { id: 'configura-outlet',       label: 'Configura Outlet',       icon: 'house-building' },
    ],
  },
  {
    id: 'contabilita',
    label: 'Contabilità & Contratti',
    icon: 'file-contract',
    items: [
      { id: 'contratti',    label: 'Contratti',    icon: 'file-contract' },
      { id: 'voci-incasso', label: 'Voci Incasso', icon: 'receipt' },
    ],
  },
  {
    id: 'food-beverage',
    label: 'Food & Beverage',
    icon: 'burger-glass',
    items: [
      { id: 'fb-impostazioni',   label: 'Impostazioni',   icon: 'gear' },
      { id: 'fb-voci-menu',      label: 'Voci Menu',      icon: 'list' },
      { id: 'fb-crea-menu',      label: 'Crea Menu',      icon: 'plus' },
      { id: 'fb-lista-menu',     label: 'Lista Menu',     icon: 'rectangle-list' },
      { id: 'fb-allergeni',      label: 'Allergeni',      icon: 'wheat' },
      { id: 'fb-gestione-costi', label: 'Gestione costi', icon: 'coins' },
    ],
  },
]
