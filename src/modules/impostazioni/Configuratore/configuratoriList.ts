/**
 * Lista dei configuratori — singola lista piatta (MAIN_ITEMS) + lista
 * Food & Beverage (FNB_ITEMS) accessibile come sotto-pagina dalla sidebar.
 */

export type ConfiguratoreId =
  // Main
  | 'camere-mapping'
  | 'mapping-segmento-mercato'
  | 'bar-fit'
  | 'bottom-rate'
  | 'fasce-eta'
  | 'stagionalita'
  | 'scaglioni-occupazione'
  | 'finestre-prenotazione'
  | 'richieste-extra'
  | 'buffer-presenze'
  | 'overbooking-limit'
  | 'vincolo-matriosca'
  | 'arrangiamenti'
  | 'contratti'
  | 'lotti-mapping'
  | 'market-specifics'
  | 'listini-individuali'
  | 'listini-gruppi'
  | 'tipologie-basi'
  | 'politiche-prenotazione'
  | 'voci-incasso'
  | 'configura-outlet'
  | 'personalizza-struttura'
  // F&B
  | 'fb-outlet'
  | 'fb-sale-tavoli'
  | 'fb-turni'
  | 'fb-categorie'
  | 'fb-voci-menu'
  | 'fb-crea-menu'
  | 'fb-lista-menu'
  | 'fb-tipi-menu'
  | 'fb-web-menu'
  | 'fb-menu-giorno'
  | 'fb-allergeni'
  | 'fb-arrangiamenti'
  | 'fb-categoria-ospite'
  | 'fb-stampanti'
  | 'fb-service-monitor'

export interface ConfiguratoreItem {
  id: ConfiguratoreId
  label: string
  /** Font Awesome icon name (without `fa-` prefix). */
  icon: string
}

export const MAIN_ITEMS: ConfiguratoreItem[] = [
  { id: 'camere-mapping',           label: 'Mapping camere',         icon: 'bed' },
  { id: 'mapping-segmento-mercato', label: 'Mapping segmenti',       icon: 'bullseye-arrow' },
  { id: 'bar-fit',                  label: 'B.A.R / F.I.T.',         icon: 'chart-line' },
  { id: 'bottom-rate',              label: 'Bottom rate',            icon: 'arrow-down-to-line' },
  { id: 'fasce-eta',                label: "Fasce d'età",            icon: 'user-group' },
  { id: 'stagionalita',             label: 'Stagionalità',           icon: 'sun' },
  { id: 'scaglioni-occupazione',    label: 'Scaglioni occupazione',  icon: 'chart-bar' },
  { id: 'finestre-prenotazione',    label: 'Finestre prenotazione',  icon: 'calendar-clock' },
  { id: 'richieste-extra',          label: 'Richieste extra',        icon: 'plus-large' },
  { id: 'buffer-presenze',          label: 'Buffer presenze',        icon: 'shield-halved' },
  { id: 'overbooking-limit',        label: 'Overbooking limit',      icon: 'triangle-exclamation' },
  { id: 'vincolo-matriosca',        label: 'Vincolo matriosca',      icon: 'layer-group' },
  { id: 'arrangiamenti',            label: 'Arrangiamenti',          icon: 'box' },
  { id: 'contratti',                label: 'Contratti',              icon: 'file-contract' },
  { id: 'lotti-mapping',            label: 'Lotti mapping',          icon: 'cubes-stacked' },
  { id: 'market-specifics',         label: 'Market specifics',       icon: 'globe' },
  { id: 'listini-individuali',      label: 'Listini individuali',    icon: 'user' },
  { id: 'listini-gruppi',           label: 'Listini gruppi',         icon: 'users' },
  { id: 'tipologie-basi',           label: 'Tipologie basi',         icon: 'layer-group' },
  { id: 'politiche-prenotazione',   label: 'Politiche prenotazione', icon: 'clipboard-list' },
  { id: 'voci-incasso',             label: 'Voci incasso',           icon: 'receipt' },
  { id: 'configura-outlet',         label: 'Configura Outlet',       icon: 'shop' },
  { id: 'personalizza-struttura',   label: 'Personalizza struttura', icon: 'house-medical' },
]

export const FNB_ITEMS: ConfiguratoreItem[] = [
  { id: 'fb-outlet',            label: 'Outlet',           icon: 'store' },
  { id: 'fb-sale-tavoli',       label: 'Sale e tavoli',    icon: 'chair' },
  { id: 'fb-turni',             label: 'Turni di servizio', icon: 'clock' },
  { id: 'fb-categorie',         label: 'Categorie',        icon: 'tags' },
  { id: 'fb-voci-menu',         label: 'Voci menu',        icon: 'list' },
  { id: 'fb-crea-menu',         label: 'Crea menu',        icon: 'plus' },
  { id: 'fb-lista-menu',        label: 'Lista menu',       icon: 'list-ul' },
  { id: 'fb-tipi-menu',         label: 'Tipi menu',        icon: 'layer-group' },
  { id: 'fb-web-menu',          label: 'Web menu',         icon: 'globe' },
  { id: 'fb-menu-giorno',       label: 'Menu del giorno',  icon: 'calendar-day' },
  { id: 'fb-allergeni',         label: 'Allergeni',        icon: 'leaf' },
  { id: 'fb-arrangiamenti',     label: 'Arrangiamenti',    icon: 'box' },
  { id: 'fb-categoria-ospite',  label: 'Categoria ospite', icon: 'user-tag' },
  { id: 'fb-stampanti',         label: 'Stampanti',        icon: 'print' },
  { id: 'fb-service-monitor',   label: 'Service monitor',  icon: 'display' },
]

/** Tutti gli id delle voci del Configuratore (Main + F&B) — default "tutte visibili". */
export const ALL_CONFIGURATORE_IDS: string[] = [...MAIN_ITEMS, ...FNB_ITEMS].map(i => i.id)
