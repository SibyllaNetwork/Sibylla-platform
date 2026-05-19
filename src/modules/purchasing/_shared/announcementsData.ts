import { useSyncExternalStore } from 'react'

export type AnnouncementType = 'vendita' | 'acquisto'
export type AnnouncementStatus = 'attivo' | 'in_trattativa' | 'concluso'
export type AnnouncementCategory =
  | 'mare'
  | 'montagna'
  | 'citta_arte'
  | 'business'
  | 'wellness'
  | 'eventi'

export type AnnouncementStructureType = 'struttura' | 'categoria'
export type GuestType = 'gruppi' | 'individuali'
export type BaseType = 'base_doppia' | 'base_multipla' | 'mista'
export type LotType = 'lotto' | 'mezzo_lotto'

export interface Announcement {
  id: string
  type: AnnouncementType
  title: string
  description: string
  location: string
  hotel: string
  lots: number
  roomsPerLot: number
  roomType: string
  checkInDate: string
  checkOutDate: string
  status: AnnouncementStatus
  publishedDate: string
  publisher: string
  contactEmail: string
  nights: number
  category: AnnouncementCategory
  showRecipient: boolean
}

export interface ManagementAnnouncement {
  id: string
  type: AnnouncementType
  structureType: AnnouncementStructureType
  structure: string
  guestType: GuestType
  baseType: BaseType
  lotType: LotType
  checkInDate: string
  checkOutDate: string
  quantity: number
  createdDate: string
  published: boolean
  category: AnnouncementCategory
}

export const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  mare: 'Mare',
  montagna: 'Montagna',
  citta_arte: "Città d'Arte",
  business: 'Business',
  wellness: 'Wellness',
  eventi: 'Eventi',
}

export const CATEGORY_ICONS: Record<AnnouncementCategory, string> = {
  mare: 'umbrella-beach',
  montagna: 'mountain',
  citta_arte: 'landmark',
  business: 'briefcase',
  wellness: 'spa',
  eventi: 'calendar-star',
}

export const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  attivo: 'Attivo',
  in_trattativa: 'In Trattativa',
  concluso: 'Concluso',
}

const BASE_TYPE_LABELS: Record<BaseType, string> = {
  base_doppia: 'Base Doppia',
  base_multipla: 'Base Multipla',
  mista: 'Mista',
}

export const HOTEL_CATEGORY_MAP: Record<string, AnnouncementCategory> = {
  'Grand Hotel Milano':       'business',
  'Luxury Resort Sardegna':   'mare',
  'Hotel Duomo Firenze':      'citta_arte',
  'Alpine Resort Bormio':     'montagna',
  'Como Luxury Hotel':        'citta_arte',
  'Airport Business Hotel':   'business',
  'Venetian Palace Hotel':    'citta_arte',
  'Rome Imperial Hotel':      'citta_arte',
  'Seaside Resort Amalfi':    'mare',
  'Mountain Lodge Cortina':   'montagna',
  'Spa & Wellness Center':    'wellness',
  'Conference Center Plaza':  'eventi',
}

const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const MONTHS_IT_LONG = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export function formatDateIT(iso: string, withYear = true): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const m = MONTHS_IT[d.getMonth()]
  return withYear ? `${day} ${m} ${d.getFullYear()}` : `${day} ${m}`
}

export function formatDateLongIT(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} ${MONTHS_IT_LONG[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateShortIT(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

function diffDays(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  return Math.round(ms / 86400000)
}

export function convertManagementToAnnouncement(ma: ManagementAnnouncement): Announcement {
  const nights = diffDays(ma.checkInDate, ma.checkOutDate)
  const lotTypeLabel = ma.lotType === 'lotto' ? 'Lotto' : 'Mezzo Lotto'
  return {
    id: ma.id,
    type: ma.type,
    title: `${ma.type === 'vendita' ? 'Vendita' : 'Acquisto'} ${lotTypeLabel} - ${ma.structure}`,
    description: `Disponibilità ${BASE_TYPE_LABELS[ma.baseType]} per ${ma.guestType === 'gruppi' ? 'gruppi' : 'individuali'}. Categoria: ${CATEGORY_LABELS[ma.category]}.`,
    location: ma.structure,
    hotel: ma.structure,
    lots: ma.quantity,
    roomsPerLot: ma.lotType === 'lotto' ? 10 : 5,
    roomType: BASE_TYPE_LABELS[ma.baseType],
    checkInDate: ma.checkInDate,
    checkOutDate: ma.checkOutDate,
    status: 'attivo',
    publishedDate: ma.createdDate,
    publisher: 'La Mia Struttura',
    contactEmail: 'info@struttura.it',
    nights,
    category: ma.category,
    showRecipient: false,
  }
}

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: '1',  type: 'vendita',  title: 'Lotto Camere Evento Fiera Milano - Hotel 4 Stelle', description: 'Disponibilità eccezionale per evento fieristico del settore tecnologico. Camere Superior con colazione inclusa, WiFi gratuito, accesso spa e servizio navetta per la fiera.', location: 'Milano, Lombardia',         hotel: 'Grand Hotel Milano',      lots: 5,  roomsPerLot: 10, roomType: 'Doppia Superior',     checkInDate: '2026-05-15', checkOutDate: '2026-05-20', status: 'attivo',        publishedDate: '2026-03-25', publisher: 'Hotel Group Lombardia',         contactEmail: 'vendite@hotelgroup.it',     nights: 5,  category: 'business',   showRecipient: false },
  { id: '2',  type: 'acquisto', title: 'Ricerca Lotti Camere per Congresso Medico - Roma',  description: 'Cerchiamo disponibilità per gruppo congressuale del settore medicale. Necessarie camere con scrivania e connessione internet ad alta velocità.', location: 'Roma, Lazio',           hotel: 'Da definire',          lots: 3,  roomsPerLot: 10, roomType: 'Singola Business',    checkInDate: '2026-06-10', checkOutDate: '2026-06-13', status: 'attivo',        publishedDate: '2026-03-28', publisher: 'Corporate Travel Solutions',    contactEmail: 'booking@corporate.it',      nights: 3,  category: 'business',   showRecipient: false },
  { id: '3',  type: 'vendita',  title: 'Lotti Mix Camere Resort Lusso Costa Smeralda',      description: 'Cancellazione gruppo importante. Disponibili lotti misti con doppie vista mare e suite panoramiche. Pensione completa inclusa, accesso spa, campo da golf.',                                  location: 'Costa Smeralda, Sardegna', hotel: 'Luxury Resort Sardegna', lots: 8,  roomsPerLot: 10, roomType: 'Mix Doppie/Suite',    checkInDate: '2026-07-20', checkOutDate: '2026-07-27', status: 'in_trattativa', publishedDate: '2026-03-26', publisher: 'Sardinia Hotels Network',       contactEmail: 'sales@sardinia.it',         nights: 7,  category: 'mare',       showRecipient: false },
  { id: '4',  type: 'acquisto', title: 'Ricerca Lotti per Evento Sportivo Internazionale',  description: 'Team sportivo internazionale cerca alloggio per atleti e staff. Necessarie camere triple e quadruple con servizio lavanderia quotidiano.',                                                  location: 'Torino, Piemonte',      hotel: 'Da definire',          lots: 10, roomsPerLot: 10, roomType: 'Triple/Quadruple',    checkInDate: '2026-09-05', checkOutDate: '2026-09-12', status: 'attivo',        publishedDate: '2026-03-29', publisher: 'Sport Events Italia',           contactEmail: 'info@sportevents.it',       nights: 7,  category: 'eventi',     showRecipient: false },
  { id: '5',  type: 'vendita',  title: 'Lotti Camere Vista Duomo Centro Storico Firenze',   description: "Disponibilità last minute per annullamento gruppo turistico. Camere eleganti con affaccio sul Duomo di Firenze.",                                                                              location: 'Firenze, Toscana',      hotel: 'Hotel Duomo Firenze',  lots: 4,  roomsPerLot: 10, roomType: 'Doppia Vista Duomo',  checkInDate: '2026-04-18', checkOutDate: '2026-04-21', status: 'attivo',        publishedDate: '2026-03-30', publisher: 'Firenze Hospitality',           contactEmail: 'reservations@firenze.it',   nights: 3,  category: 'citta_arte', showRecipient: false },
  { id: '6',  type: 'acquisto', title: 'Ricerca Lotti per Matrimonio Venezia - Hotel di Charme', description: 'Organizzazione evento matrimoniale di prestigio cerca disponibilità per ospiti. Richieste camere eleganti in strutture di charme.',                                                       location: 'Venezia, Veneto',       hotel: 'Da definire',          lots: 6,  roomsPerLot: 10, roomType: 'Doppia Deluxe',       checkInDate: '2026-08-14', checkOutDate: '2026-08-16', status: 'attivo',        publishedDate: '2026-03-27', publisher: 'Wedding Planners Venezia',      contactEmail: 'events@wedding.it',         nights: 2,  category: 'eventi',     showRecipient: false },
  { id: '7',  type: 'vendita',  title: 'Lotti Camere Ski Resort Alta Valtellina',           description: 'Hotel ai piedi delle piste con disponibilità per settimana bianca. Skipass incluso, deposito sci riscaldato, centro benessere con piscina coperta.',                                            location: 'Bormio, Lombardia',     hotel: 'Alpine Resort Bormio', lots: 6,  roomsPerLot: 8,  roomType: 'Family Room',         checkInDate: '2026-12-20', checkOutDate: '2026-12-27', status: 'attivo',        publishedDate: '2026-03-29', publisher: 'Mountain Hotels Group',         contactEmail: 'info@mountainhotels.it',    nights: 7,  category: 'montagna',   showRecipient: false },
  { id: '8',  type: 'acquisto', title: 'Ricerca Lotti Wellness Retreat Spa Resort',         description: 'Azienda cerca location per ritiro aziendale wellness. Necessari trattamenti spa inclusi, sale meeting, area fitness e alimentazione salutistica.',                                              location: 'Terme di Saturnia, Toscana', hotel: 'Da definire',     lots: 4,  roomsPerLot: 12, roomType: 'Doppia Wellness',     checkInDate: '2026-10-15', checkOutDate: '2026-10-18', status: 'attivo',        publishedDate: '2026-03-31', publisher: 'Corporate Wellness Solutions',  contactEmail: 'wellness@corporate.it',     nights: 3,  category: 'wellness',   showRecipient: false },
  { id: '9',  type: 'vendita',  title: 'Lotti Camere Business Hotel Aeroporto Malpensa',    description: 'Disponibilità immediata per gruppi business in transito. Camere moderne con servizio 24h, transfer aeroporto gratuito, sale riunioni.',                                                       location: 'Malpensa, Lombardia',   hotel: 'Airport Business Hotel', lots: 12, roomsPerLot: 5, roomType: 'Singola Business',    checkInDate: '2026-05-01', checkOutDate: '2026-05-31', status: 'attivo',        publishedDate: '2026-03-30', publisher: 'Airport Hotels Network',        contactEmail: 'booking@airporthotels.it',  nights: 30, category: 'business',   showRecipient: false },
  { id: '10', type: 'vendita',  title: 'Lotti Suite Lago di Como - Vista Panoramica',       description: 'Struttura luxury con camere vista lago disponibili per periodi prolungati. Suite con terrazzo privato, ristorante gourmet, servizio maggiordomo.',                                              location: 'Bellagio, Lago di Como', hotel: 'Como Luxury Hotel',  lots: 3,  roomsPerLot: 15, roomType: 'Suite Vista Lago',    checkInDate: '2026-06-01', checkOutDate: '2026-06-15', status: 'in_trattativa', publishedDate: '2026-03-26', publisher: 'Lakes Hotels Consortium',       contactEmail: 'luxury@lakeshotels.it',     nights: 14, category: 'citta_arte', showRecipient: false },
]

// ── Store: management announcements (utente corrente) ──────────────────────
let _state: ManagementAnnouncement[] = [
  { id: 'seed-1', type: 'vendita',  structureType: 'struttura', structure: 'Luxury Resort Sardegna', guestType: 'gruppi',      baseType: 'base_doppia',   lotType: 'lotto',       checkInDate: '2026-06-12', checkOutDate: '2026-06-19', quantity: 4, createdDate: '2026-04-20', published: true, category: 'mare' },
  { id: 'seed-2', type: 'acquisto', structureType: 'struttura', structure: 'Grand Hotel Milano',     guestType: 'individuali', baseType: 'base_multipla', lotType: 'mezzo_lotto', checkInDate: '2026-09-08', checkOutDate: '2026-09-11', quantity: 2, createdDate: '2026-04-22', published: true, category: 'business' },
]
const _listeners = new Set<() => void>()

function _emit() { _listeners.forEach((l) => l()) }

function subscribeManagementAnnouncements(l: () => void): () => void {
  _listeners.add(l)
  return () => { _listeners.delete(l) }
}

function getManagementAnnouncementsSnapshot(): ManagementAnnouncement[] {
  return _state
}

export function useManagementAnnouncements(): ManagementAnnouncement[] {
  return useSyncExternalStore(subscribeManagementAnnouncements, getManagementAnnouncementsSnapshot, getManagementAnnouncementsSnapshot)
}

export function addManagementAnnouncement(a: ManagementAnnouncement): void {
  _state = [..._state, a]
  _emit()
}

export function deleteManagementAnnouncement(id: string): void {
  _state = _state.filter((a) => a.id !== id)
  _emit()
}

export function publishManagementAnnouncement(id: string): void {
  _state = _state.map((a) => (a.id === id ? { ...a, published: true } : a))
  _emit()
}
