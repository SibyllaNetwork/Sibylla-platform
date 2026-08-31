/**
 * Registry dei configuratori — fonte unica di verità della sezione.
 *
 * Sostituisce la vecchia `configuratoriList.ts`: ogni voce dichiara il gruppo
 * tematico (le 7 corsie della navigazione), una descrizione a una riga, i
 * sinonimi per la ricerca della command palette, gli eventuali prerequisiti
 * (gating) e lo stato di costruzione (`soon` = pane non ancora realizzato).
 *
 * Inventario e ordinamento da docs/configuratori.md §2 (PDF Configuratori HOTEL):
 * `contratti` e `tipologie-basi` sono stati RIMOSSI; `gateway`,
 * `intestazioni-fiscali`, `business-central` e `costi-mapping` sono NUOVI.
 */

// ─── Id delle voci ────────────────────────────────────────────────────────────

export type ConfiguratoreId =
  // Main (ordine PDF)
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
  | 'lotti-mapping'
  | 'market-specifics'
  | 'listini-individuali'
  | 'listini-gruppi'
  | 'politiche-prenotazione'
  | 'voci-incasso'
  | 'gateway'
  | 'configura-outlet'
  | 'intestazioni-fiscali'
  | 'business-central'
  | 'personalizza-struttura'
  | 'costi-mapping'
  // Food & Beverage (sub-app Outlet Manager)
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

// ─── Gruppi tematici (le 7 corsie) ────────────────────────────────────────────

export type CfgGroupId =
  | 'camere-inventario'
  | 'mercati-segmenti'
  | 'tariffe-listini'
  | 'regole-vendita'
  | 'amministrazione-fiscale'
  | 'struttura'
  | 'food-beverage'

export interface CfgGroup {
  id: CfgGroupId
  label: string
  /** Font Awesome icon name (senza prefisso `fa-`). */
  icon: string
}

export const CFG_GROUPS: CfgGroup[] = [
  { id: 'camere-inventario',       label: 'Camere e inventario',       icon: 'bed' },
  { id: 'mercati-segmenti',        label: 'Mercati e segmenti',        icon: 'globe' },
  { id: 'tariffe-listini',         label: 'Tariffe e listini',         icon: 'tags' },
  { id: 'regole-vendita',          label: 'Regole di vendita',         icon: 'scale-balanced' },
  { id: 'amministrazione-fiscale', label: 'Amministrazione e fiscale', icon: 'file-invoice' },
  { id: 'struttura',               label: 'Struttura',                 icon: 'house' },
  { id: 'food-beverage',           label: 'Food & Beverage',           icon: 'utensils' },
]

// ─── Definizione di una voce ──────────────────────────────────────────────────

export interface CfgRequirement {
  /** Id del configuratore prerequisito. */
  id: ConfiguratoreId
  /** Motivo leggibile del blocco (mostrato in CfgLocked e nei tooltip). */
  reason: string
}

export interface ConfiguratoreDef {
  id: ConfiguratoreId
  label: string
  /** Font Awesome icon name (senza prefisso `fa-`). */
  icon: string
  group: CfgGroupId
  /** Una riga: cosa configura questa voce (dal §4 del brief). */
  description: string
  /** Sinonimi per la ricerca fuzzy della command palette. */
  keywords: string[]
  /** Prerequisito che sblocca la voce (gating dal PDF). */
  requires?: CfgRequirement
  /** 'soon' = pane non ancora costruito (mostra CfgEmpty "in arrivo"). */
  status?: 'ready' | 'soon'
}

// ─── Inventario (ordine PDF §2) ───────────────────────────────────────────────

export const CONFIGURATORI: ConfiguratoreDef[] = [
  {
    id: 'camere-mapping', label: 'Mapping camere', icon: 'bed', group: 'camere-inventario',
    description: 'Riconduce le tipologie camera della struttura allo standard Sibylla e definisce la camera di riferimento.',
    keywords: ['tipologie camera', 'standard sibylla', 'pms', 'camera di riferimento', 'associazione'],
  },
  {
    id: 'mapping-segmento-mercato', label: 'Mapping segmenti', icon: 'bullseye-arrow', group: 'mercati-segmenti',
    description: 'Associa i segmenti commerciali locali ai segmenti standard della piattaforma.',
    keywords: ['segmenti', 'mercato', 'pms', 'nuovo segmento', 'parametro associato'],
  },
  {
    id: 'bar-fit', label: 'B.A.R. / F.I.T.', icon: 'chart-line', group: 'tariffe-listini',
    description: 'Livelli e regole B.A.R. e F.I.T. della struttura per il calendario tariffario annuale.',
    keywords: ['bar', 'fit', 'b2b', 'best available rate', 'griglia', 'livelli tariffari'],
  },
  {
    id: 'bottom-rate', label: 'Bottom rate', icon: 'arrow-down-to-line', group: 'tariffe-listini',
    description: 'Soglia tariffaria minima per tipologia camera, struttura e piano tariffario.',
    keywords: ['soglia minima', 'tariffa minima', 'pricing', 'piano tariffario', 'notifica sotto-soglia'],
  },
  {
    id: 'fasce-eta', label: "Fasce d'età", icon: 'user-group', group: 'tariffe-listini',
    description: 'Fasce anagrafiche (infanti, bambini, ragazzi, adulti) usate da listini, supplementi e riduzioni.',
    keywords: ['età', 'infanti', 'bambini', 'ragazzi', 'adulti extra', 'posto letto', 'riduzioni'],
  },
  {
    id: 'stagionalita', label: 'Stagionalità', icon: 'sun', group: 'tariffe-listini',
    description: 'Suddivide il calendario in periodi stagionali collegati alle logiche commerciali e tariffarie.',
    keywords: ['stagioni', 'periodi', 'calendario', 'low season', 'high season', 'peak season'],
  },
  {
    id: 'scaglioni-occupazione', label: 'Scaglioni occupazione', icon: 'chart-bar', group: 'regole-vendita',
    description: 'Intervalli percentuali di occupazione usati come driver delle strategie tariffarie.',
    keywords: ['occupazione', 'percentuale', 'intervalli', 'driver', 'scaglioni'],
  },
  {
    id: 'finestre-prenotazione', label: 'Finestre prenotazione', icon: 'calendar-clock', group: 'regole-vendita',
    description: 'Intervalli di booking window: i giorni di anticipo con cui arrivano le prenotazioni.',
    keywords: ['booking window', 'anticipo', 'giorni', 'finestre', 'advance booking'],
  },
  {
    id: 'richieste-extra', label: 'Richieste extra', icon: 'plus-large', group: 'regole-vendita',
    description: 'Richieste extra applicabili alle prenotazioni di gruppo, opzionate o garantite.',
    keywords: ['extra', 'gruppi', 'opzionata', 'garantita', 'servizi aggiuntivi'],
  },
  {
    id: 'buffer-presenze', label: 'Buffer presenze', icon: 'shield-halved', group: 'camere-inventario',
    description: 'Margine di sicurezza su presenze e disponibilità per struttura.',
    keywords: ['licenza ospiti', 'capienza', 'maggiorazione', 'margine di sicurezza'],
  },
  {
    id: 'overbooking-limit', label: 'Overbooking limit', icon: 'triangle-exclamation', group: 'camere-inventario',
    description: 'Fino a che livello il sistema può accettare vendite oltre la disponibilità fisica.',
    keywords: ['overbooking', 'protection', 'disponibilità', 'vendite oltre capienza'],
    requires: { id: 'stagionalita', reason: 'Richiede la Stagionalità configurata e applicata: il limite di overbooking si definisce sui periodi stagionali.' },
  },
  {
    id: 'vincolo-matriosca', label: 'Vincolo matriosca', icon: 'layer-group', group: 'camere-inventario',
    description: 'Relazioni gerarchiche tra tipologie di camera per upgrade, downgrade e ottimizzazione.',
    keywords: ['upgrade', 'downgrade', 'corrispondenze', 'gerarchia camere', 'ottimizzazione'],
  },
  {
    id: 'arrangiamenti', label: 'Arrangiamenti', icon: 'box', group: 'tariffe-listini',
    description: 'Trattamenti configurabili (Room Only, colazione, pranzo, cena) con il relativo valore economico.',
    keywords: ['trattamenti', 'mezza pensione', 'pasti', 'room only', 'colazione', 'pensione completa'],
  },
  {
    id: 'lotti-mapping', label: 'Lotti mapping', icon: 'cubes-stacked', group: 'camere-inventario',
    description: 'Lotti e contingenti: a ogni tipologia camera la quantità disponibile per Gruppi e B2B.',
    keywords: ['lotti', 'contingenti', 'allotment', 'gruppi', 'b2b', 'campanella', 'consulenza'],
  },
  {
    id: 'market-specifics', label: 'Market specifics', icon: 'globe', group: 'mercati-segmenti',
    description: 'Specificità e pesi per mercato geografico, riferiti al segmento Gruppi.',
    keywords: ['mercati', 'nazionalità', 'promozione', 'pesi', 'geografico', 'scontistica'],
  },
  {
    id: 'listini-individuali', label: 'Listini individuali', icon: 'user', group: 'tariffe-listini',
    description: 'Listini per la clientela individuale, per struttura e stagionalità, con riepilogo calendario.',
    keywords: ['prezzi', 'tariffe', 'individuali', 'camere hotel', 'pdf', 'calendario'],
    requires: { id: 'stagionalita', reason: 'Richiede la Stagionalità B2B completata: i listini individuali si agganciano ai periodi stagionali.' },
  },
  {
    id: 'listini-gruppi', label: 'Listini gruppi', icon: 'users', group: 'tariffe-listini',
    description: 'Listini per i gruppi con tariffe e supplementi per adulti e studenti.',
    keywords: ['prezzi', 'gruppi', 'supplementi', 'studenti', 'distribuzione', 'per camera', 'per persona'],
    requires: { id: 'stagionalita', reason: 'Richiede la Stagionalità Gruppi completata: le tariffe gruppi si leggono sul calendario stagionale.' },
  },
  {
    id: 'politiche-prenotazione', label: 'Politiche di prenotazione', icon: 'clipboard-list', group: 'regole-vendita',
    description: 'Regole di pagamento e cancellazione, termini e condizioni, gratuità e concessioni.',
    keywords: ['no-show', 'cancellazione', 'penale', 'termini', 'caparra', 'gratuità', 'pagamenti', 'mancato arrivo'],
  },
  {
    id: 'voci-incasso', label: 'Voci incasso', icon: 'receipt', group: 'amministrazione-fiscale',
    description: "Codici e voci d'incasso con commissioni, gateway e scadenze sospesi.",
    keywords: ['incasso', 'commissioni', 'fel', 'scel', 'sospesi', 'pagamenti', 'scadenze'],
  },
  {
    id: 'gateway', label: 'Gateway', icon: 'credit-card', group: 'amministrazione-fiscale',
    description: 'Gateway di pagamento della struttura con le relative API key.',
    keywords: ['nexy', 'pagamenti', 'api key', 'pos', 'carte'],
  },
  {
    id: 'configura-outlet', label: 'Configura Outlet', icon: 'shop', group: 'struttura',
    description: 'Sale e turni di servizio degli outlet della struttura.',
    keywords: ['sale', 'turni', 'tavoli', 'ristorante', 'servizio', 'outlet'],
    requires: { id: 'fb-outlet', reason: 'Richiede almeno un Outlet creato: la configurazione di sale e turni si applica a un outlet esistente.' },
  },
  {
    id: 'intestazioni-fiscali', label: 'Intestazioni fiscali', icon: 'building-columns', group: 'amministrazione-fiscale',
    description: 'Intestazioni fiscali della struttura e mapping con i sistemi e gli hotel collegati.',
    keywords: ['partita iva', 'ragione sociale', 'sdi', 'pec', 'rea', 'fatturazione', 'predefinita'],
  },
  {
    id: 'business-central', label: 'Business Central', icon: 'diagram-project', group: 'amministrazione-fiscale',
    description: 'Integrazione contabile: documenti, conti e journal batch verso Business Central.',
    keywords: ['erp', 'contabilità', 'documenti', 'conti', 'journal batch', 'fattura', 'nota di credito'],
  },
  {
    id: 'personalizza-struttura', label: 'Personalizza struttura', icon: 'house-medical', group: 'struttura',
    description: 'Dati e orari della struttura: indirizzo, descrizione, sezionale, check-in e check-out.',
    keywords: ['check-in', 'check-out', 'indirizzo', 'descrizione', 'sovrapprezzo', 'early check-in', 'late check-out'],
  },
  {
    id: 'costi-mapping', label: 'Costi mapping', icon: 'coins', group: 'amministrazione-fiscale',
    description: 'Mappa le tipologie di costo e attribuisce i valori economici alle componenti.',
    keywords: ['costi', 'centro di costo', 'variabile', 'fisso', 'anno', 'copia costi'],
  },
  // ── Food & Beverage (sub-app Outlet Manager) ────────────────────────────────
  {
    id: 'fb-outlet', label: 'Outlet', icon: 'store', group: 'food-beverage',
    description: 'Punti vendita della struttura: ristoranti, bar, boutique.',
    keywords: ['punti vendita', 'ristorante', 'bar', 'boutique'],
  },
  {
    id: 'fb-sale-tavoli', label: 'Sale e tavoli', icon: 'chair', group: 'food-beverage',
    description: 'Le sale con i relativi tavoli e la loro disposizione.',
    keywords: ['sala', 'tavoli', 'planimetria', 'coperti'],
  },
  {
    id: 'fb-turni', label: 'Turni di servizio', icon: 'clock', group: 'food-beverage',
    description: 'Orari e copertura dei turni: colazione, pranzo e cena.',
    keywords: ['orari', 'turni', 'servizio', 'colazione', 'pranzo', 'cena'],
  },
  {
    id: 'fb-categorie', label: 'Categorie', icon: 'tags', group: 'food-beverage',
    description: 'Categorie del menu: antipasti, primi, secondi, dolci, vini.',
    keywords: ['categorie menu', 'antipasti', 'primi', 'dolci', 'vini'],
  },
  {
    id: 'fb-voci-menu', label: 'Voci menu', icon: 'list', group: 'food-beverage',
    description: 'Piatti, bevande e articoli del menu, multilingua.',
    keywords: ['piatti', 'bevande', 'articoli', 'multilingua', 'prezzi'],
  },
  {
    id: 'fb-crea-menu', label: 'Crea menu', icon: 'plus', group: 'food-beverage',
    description: 'Composizione di un nuovo menu a partire dalle voci configurate.',
    keywords: ['componi', 'nuovo menu', 'composizione'],
  },
  {
    id: 'fb-lista-menu', label: 'Lista menu', icon: 'list-ul', group: 'food-beverage',
    description: "L'elenco dei menu configurati.",
    keywords: ['elenco menu', 'menu configurati'],
  },
  {
    id: 'fb-tipi-menu', label: 'Tipi menu', icon: 'layer-group', group: 'food-beverage',
    description: 'Categorizzazione macro dei menu: food, beverage, cantina.',
    keywords: ['food', 'beverage', 'cantina', 'macro categorie'],
  },
  {
    id: 'fb-web-menu', label: 'Web menu', icon: 'globe', group: 'food-beverage',
    description: 'Menu digitale accessibile via URL e QR code, personalizzabile.',
    keywords: ['qr code', 'digitale', 'web', 'url'],
  },
  {
    id: 'fb-menu-giorno', label: 'Menu del giorno', icon: 'calendar-day', group: 'food-beverage',
    description: 'Il menu giornaliero, composto selezionando le voci disponibili.',
    keywords: ['giornaliero', 'oggi', 'piatto del giorno'],
  },
  {
    id: 'fb-allergeni', label: 'Allergeni', icon: 'leaf', group: 'food-beverage',
    description: 'I 14 allergeni standard EU, obbligatori per legge.',
    keywords: ['allergie', 'eu', 'glutine', 'lattosio', 'obbligo di legge'],
  },
  {
    id: 'fb-arrangiamenti', label: 'Arrangiamenti', icon: 'box', group: 'food-beverage',
    description: 'Trattamenti F&B collegati ai piani di vendita della struttura.',
    keywords: ['trattamenti', 'pensione', 'piani di vendita'],
    status: 'soon',
  },
  {
    id: 'fb-categoria-ospite', label: 'Categoria ospite', icon: 'user-tag', group: 'food-beverage',
    description: 'Categorie cliente con prezzi differenziati: ospiti hotel, esterni, VIP.',
    keywords: ['vip', 'esterni', 'ospiti hotel', 'prezzi differenziati'],
  },
  {
    id: 'fb-stampanti', label: 'Stampanti', icon: 'print', group: 'food-beverage',
    description: 'Stampanti di produzione, fiscali e pre-conto.',
    keywords: ['stampa', 'fiscale', 'comanda', 'pre-conto'],
  },
  {
    id: 'fb-service-monitor', label: 'Service monitor', icon: 'display', group: 'food-beverage',
    description: 'Monitor KDS per i reparti di produzione: cucina, bar, pasticceria.',
    keywords: ['kds', 'monitor', 'cucina', 'reparti di produzione'],
  },
]

// ─── Lookup e derivazioni ─────────────────────────────────────────────────────

const BY_ID = new Map<string, ConfiguratoreDef>(CONFIGURATORI.map(d => [d.id, d]))
const GROUP_BY_ID = new Map<string, CfgGroup>(CFG_GROUPS.map(g => [g.id, g]))

export function configuratoreById(id: string): ConfiguratoreDef | undefined {
  return BY_ID.get(id)
}

export function cfgGroupById(id: string): CfgGroup | undefined {
  return GROUP_BY_ID.get(id)
}

export function configuratoriOfGroup(group: CfgGroupId): ConfiguratoreDef[] {
  return CONFIGURATORI.filter(d => d.group === group)
}

/** True se l'id è una voce valida del registry (deep link `configuratore:<id>`). */
export function isConfiguratoreId(id: string): id is ConfiguratoreId {
  return BY_ID.has(id)
}

// ─── Export compatibili con il codice esistente ───────────────────────────────
// (SibyllaAdminPanel, AdminModulesPage, allowedConfiguratoreIds in useAccessStore)

export interface ConfiguratoreItem {
  id: ConfiguratoreId
  label: string
  /** Font Awesome icon name (without `fa-` prefix). */
  icon: string
}

export const MAIN_ITEMS: ConfiguratoreItem[] = CONFIGURATORI
  .filter(d => d.group !== 'food-beverage')
  .map(({ id, label, icon }) => ({ id, label, icon }))

export const FNB_ITEMS: ConfiguratoreItem[] = CONFIGURATORI
  .filter(d => d.group === 'food-beverage')
  .map(({ id, label, icon }) => ({ id, label, icon }))

/** Tutti gli id delle voci del Configuratore (Main + F&B) — default "tutte visibili". */
export const ALL_CONFIGURATORE_IDS: string[] = CONFIGURATORI.map(i => i.id)
