import { differenceInDays } from 'date-fns';
import type { ManagementAnnouncement } from '../context/AnnouncementsContext';

export type AnnouncementType = 'vendita' | 'acquisto';
export type AnnouncementStatus = 'attivo' | 'in_trattativa' | 'concluso';
export type AnnouncementCategory =
  | 'mare'
  | 'montagna'
  | 'citta_arte'
  | 'business'
  | 'wellness'
  | 'eventi';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  description: string;
  location: string;
  hotel: string;
  lots: number;
  roomsPerLot: number;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  status: AnnouncementStatus;
  publishedDate: string;
  publisher: string;
  contactEmail: string;
  nights: number;
  category: AnnouncementCategory;
  showRecipient: boolean;
}

export const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  mare: 'Mare',
  montagna: 'Montagna',
  citta_arte: "Città d'Arte",
  business: 'Business',
  wellness: 'Wellness',
  eventi: 'Eventi',
};

export const CATEGORY_ICONS: Record<AnnouncementCategory, string> = {
  mare: 'umbrella-beach',
  montagna: 'mountain',
  citta_arte: 'landmark',
  business: 'briefcase',
  wellness: 'spa',
  eventi: 'calendar-star',
};

export const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  attivo: 'Attivo',
  in_trattativa: 'In Trattativa',
  concluso: 'Concluso',
};

const BASE_TYPE_LABELS = {
  base_doppia: 'Base Doppia',
  base_multipla: 'Base Multipla',
  mista: 'Mista',
} as const;

/* Converte una ManagementAnnouncement (creata dall'utente in /announcements/manage)
   nel formato Announcement usato sia da AnnouncementsPage che da MatchZone. */
export function convertManagementToAnnouncement(ma: ManagementAnnouncement): Announcement {
  const checkIn = new Date(ma.checkInDate);
  const checkOut = new Date(ma.checkOutDate);
  const nights = differenceInDays(checkOut, checkIn);
  const lotTypeLabel = ma.lotType === 'lotto' ? 'Lotto' : 'Mezzo Lotto';

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
  };
}

/* Annunci pre-popolati di altri utenti sulla piattaforma. */
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', type: 'vendita', title: 'Lotto Camere Evento Fiera Milano - Hotel 4 Stelle', description: 'Disponibilità eccezionale per evento fieristico del settore tecnologico. Camere Superior con colazione inclusa, WiFi gratuito, accesso spa e servizio navetta per la fiera.', location: 'Milano, Lombardia', hotel: 'Grand Hotel Milano', lots: 5, roomsPerLot: 10, roomType: 'Doppia Superior', checkInDate: '2026-05-15', checkOutDate: '2026-05-20', status: 'attivo', publishedDate: '2026-03-25', publisher: 'Hotel Group Lombardia', contactEmail: 'vendite@hotelgroup.it', nights: 5, category: 'business', showRecipient: false },
  { id: '2', type: 'acquisto', title: 'Ricerca Lotti Camere per Congresso Medico - Roma', description: 'Cerchiamo disponibilità per gruppo congressuale del settore medicale. Necessarie camere con scrivania e connessione internet ad alta velocità.', location: 'Roma, Lazio', hotel: 'Da definire', lots: 3, roomsPerLot: 10, roomType: 'Singola Business', checkInDate: '2026-06-10', checkOutDate: '2026-06-13', status: 'attivo', publishedDate: '2026-03-28', publisher: 'Corporate Travel Solutions', contactEmail: 'booking@corporate.it', nights: 3, category: 'business', showRecipient: false },
  { id: '3', type: 'vendita', title: 'Lotti Mix Camere Resort Lusso Costa Smeralda', description: 'Cancellazione gruppo importante. Disponibili lotti misti con doppie vista mare e suite panoramiche. Pensione completa inclusa, accesso spa, campo da golf.', location: 'Costa Smeralda, Sardegna', hotel: 'Luxury Resort Sardegna', lots: 8, roomsPerLot: 10, roomType: 'Mix Doppie/Suite', checkInDate: '2026-07-20', checkOutDate: '2026-07-27', status: 'in_trattativa', publishedDate: '2026-03-26', publisher: 'Sardinia Hotels Network', contactEmail: 'sales@sardinia.it', nights: 7, category: 'mare', showRecipient: false },
  { id: '4', type: 'acquisto', title: 'Ricerca Lotti per Evento Sportivo Internazionale', description: 'Team sportivo internazionale cerca alloggio per atleti e staff. Necessarie camere triple e quadruple con servizio lavanderia quotidiano.', location: 'Torino, Piemonte', hotel: 'Da definire', lots: 10, roomsPerLot: 10, roomType: 'Triple/Quadruple', checkInDate: '2026-09-05', checkOutDate: '2026-09-12', status: 'attivo', publishedDate: '2026-03-29', publisher: 'Sport Events Italia', contactEmail: 'info@sportevents.it', nights: 7, category: 'eventi', showRecipient: false },
  { id: '5', type: 'vendita', title: 'Lotti Camere Vista Duomo Centro Storico Firenze', description: 'Disponibilità last minute per annullamento gruppo turistico. Camere eleganti con affaccio sul Duomo di Firenze.', location: 'Firenze, Toscana', hotel: 'Hotel Duomo Firenze', lots: 4, roomsPerLot: 10, roomType: 'Doppia Vista Duomo', checkInDate: '2026-04-18', checkOutDate: '2026-04-21', status: 'attivo', publishedDate: '2026-03-30', publisher: 'Firenze Hospitality', contactEmail: 'reservations@firenze.it', nights: 3, category: 'citta_arte', showRecipient: false },
  { id: '6', type: 'acquisto', title: 'Ricerca Lotti per Matrimonio Venezia - Hotel di Charme', description: 'Organizzazione evento matrimoniale di prestigio cerca disponibilità per ospiti. Richieste camere eleganti in strutture di charme.', location: 'Venezia, Veneto', hotel: 'Da definire', lots: 6, roomsPerLot: 10, roomType: 'Doppia Deluxe', checkInDate: '2026-08-14', checkOutDate: '2026-08-16', status: 'attivo', publishedDate: '2026-03-27', publisher: 'Wedding Planners Venezia', contactEmail: 'events@wedding.it', nights: 2, category: 'eventi', showRecipient: false },
  { id: '7', type: 'vendita', title: 'Lotti Camere Ski Resort Alta Valtellina', description: 'Hotel ai piedi delle piste con disponibilità per settimana bianca. Skipass incluso, deposito sci riscaldato, centro benessere con piscina coperta.', location: 'Bormio, Lombardia', hotel: 'Alpine Resort Bormio', lots: 6, roomsPerLot: 8, roomType: 'Family Room', checkInDate: '2026-12-20', checkOutDate: '2026-12-27', status: 'attivo', publishedDate: '2026-03-29', publisher: 'Mountain Hotels Group', contactEmail: 'info@mountainhotels.it', nights: 7, category: 'montagna', showRecipient: false },
  { id: '8', type: 'acquisto', title: 'Ricerca Lotti Wellness Retreat Spa Resort', description: 'Azienda cerca location per ritiro aziendale wellness. Necessari trattamenti spa inclusi, sale meeting, area fitness e alimentazione salutistica.', location: 'Terme di Saturnia, Toscana', hotel: 'Da definire', lots: 4, roomsPerLot: 12, roomType: 'Doppia Wellness', checkInDate: '2026-10-15', checkOutDate: '2026-10-18', status: 'attivo', publishedDate: '2026-03-31', publisher: 'Corporate Wellness Solutions', contactEmail: 'wellness@corporate.it', nights: 3, category: 'wellness', showRecipient: false },
  { id: '9', type: 'vendita', title: 'Lotti Camere Business Hotel Aeroporto Malpensa', description: 'Disponibilità immediata per gruppi business in transito. Camere moderne con servizio 24h, transfer aeroporto gratuito, sale riunioni.', location: 'Malpensa, Lombardia', hotel: 'Airport Business Hotel', lots: 12, roomsPerLot: 5, roomType: 'Singola Business', checkInDate: '2026-05-01', checkOutDate: '2026-05-31', status: 'attivo', publishedDate: '2026-03-30', publisher: 'Airport Hotels Network', contactEmail: 'booking@airporthotels.it', nights: 30, category: 'business', showRecipient: false },
  { id: '10', type: 'vendita', title: 'Lotti Suite Lago di Como - Vista Panoramica', description: 'Struttura luxury con camere vista lago disponibili per periodi prolungati. Suite con terrazzo privato, ristorante gourmet, servizio maggiordomo.', location: 'Bellagio, Lago di Como', hotel: 'Como Luxury Hotel', lots: 3, roomsPerLot: 15, roomType: 'Suite Vista Lago', checkInDate: '2026-06-01', checkOutDate: '2026-06-15', status: 'in_trattativa', publishedDate: '2026-03-26', publisher: 'Lakes Hotels Consortium', contactEmail: 'luxury@lakeshotels.it', nights: 14, category: 'citta_arte', showRecipient: false },
];
