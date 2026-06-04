/* =====================================================================
   MATCH ZONE — dataset annunci (Vendita/Acquisto) e motore di affinità.
   Insieme coerente: per ogni mio annuncio esistono controparti della
   community di tipo opposto, stessa categoria e periodo sovrapposto,
   più alcune corrispondenze parziali e non-corrispondenze.
   ===================================================================== */
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type AnnouncementCategory,
  type AnnouncementType,
} from './announcements';

export { CATEGORY_ICONS, CATEGORY_LABELS };
export type { AnnouncementCategory, AnnouncementType };

/* Immagine hero "commerciale" per categoria (stock Unsplash).
   In caso di mancato caricamento resta il gradiente di categoria sotto. */
export const CATEGORY_HERO: Record<AnnouncementCategory, string> = {
  mare: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=640&q=70&auto=format&fit=crop',
  montagna: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=640&q=70&auto=format&fit=crop',
  citta_arte: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=640&q=70&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=640&q=70&auto=format&fit=crop',
  wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=640&q=70&auto=format&fit=crop',
  eventi: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=640&q=70&auto=format&fit=crop',
};

export interface MzListing {
  id: string;
  ditta: string;
  initials: string;
  type: AnnouncementType;
  category: AnnouncementCategory;
  title: string;
  location: string;
  periodFrom: string; // ISO
  periodTo: string; // ISO
  quantity: number; // lotti
  roomsPerLot: number;
  description: string;
  contactEmail: string;
}

/* I miei annunci (struttura corrente). */
export const MY_LISTINGS: MzListing[] = [
  {
    id: 'm1',
    ditta: 'La Mia Struttura',
    initials: 'MS',
    type: 'vendita',
    category: 'business',
    title: 'Lotto camere evento Fiera Milano',
    location: 'Milano, Lombardia',
    periodFrom: '2026-06-08',
    periodTo: '2026-07-05',
    quantity: 5,
    roomsPerLot: 10,
    description:
      'Disponibilità Superior con colazione, WiFi e navetta fiera. Lotti cedibili per gruppi business in transito.',
    contactEmail: 'info@struttura.it',
  },
  {
    id: 'm2',
    ditta: 'La Mia Struttura',
    initials: 'MS',
    type: 'acquisto',
    category: 'mare',
    title: 'Cerco lotti resort mare — alta stagione',
    location: 'Olbia, Sardegna',
    periodFrom: '2026-07-18',
    periodTo: '2026-08-20',
    quantity: 8,
    roomsPerLot: 10,
    description:
      'Ricerca disponibilità fronte mare per pacchetti estate. Preferenza pensione completa e camere vista mare.',
    contactEmail: 'info@struttura.it',
  },
  {
    id: 'm3',
    ditta: 'La Mia Struttura',
    initials: 'MS',
    type: 'vendita',
    category: 'citta_arte',
    title: 'Lotti centro storico Firenze',
    location: 'Firenze, Toscana',
    periodFrom: '2026-04-12',
    periodTo: '2026-05-10',
    quantity: 4,
    roomsPerLot: 8,
    description:
      'Camere eleganti a due passi dal Duomo, ideali per tour culturali e gruppi città d’arte.',
    contactEmail: 'info@struttura.it',
  },
];

/* Annunci della community su cui cercare il match. */
export const COMMUNITY: MzListing[] = [
  // --- Controparti forti per m1 (vendita business Milano, giu) ---
  {
    id: 'c1',
    ditta: 'GAR S.r.l.',
    initials: 'GAR',
    type: 'acquisto',
    category: 'business',
    title: 'Ricerca camere congresso medico',
    location: 'Milano, Lombardia',
    periodFrom: '2026-06-10',
    periodTo: '2026-06-28',
    quantity: 4,
    roomsPerLot: 10,
    description:
      'Gruppo congressuale, necessarie singole con scrivania e connessione ad alta velocità.',
    contactEmail: 'booking@gar.it',
  },
  {
    id: 'c2',
    ditta: 'Corporate Travel Solutions',
    initials: 'CTS',
    type: 'acquisto',
    category: 'business',
    title: 'Lotti singole business trasferta',
    location: 'Roma, Lazio',
    periodFrom: '2026-06-15',
    periodTo: '2026-07-10',
    quantity: 33,
    roomsPerLot: 5,
    description: 'Programma trasferte aziendali ricorrenti, alta rotazione camere singole.',
    contactEmail: 'booking@corporate.it',
  },
  {
    id: 'c3',
    ditta: 'Tech Events Italia',
    initials: 'TEI',
    type: 'acquisto',
    category: 'business',
    title: 'Camere staff evento tecnologico',
    location: 'Milano, Lombardia',
    periodFrom: '2026-09-05',
    periodTo: '2026-09-20',
    quantity: 6,
    roomsPerLot: 8,
    description: 'Alloggio staff e relatori per fiera autunnale del settore tech.',
    contactEmail: 'info@techevents.it',
  },
  // --- Controparti per m2 (acquisto mare Sardegna, lug-ago) ---
  {
    id: 'c4',
    ditta: 'Sardinia Hotels Network',
    initials: 'SHN',
    type: 'vendita',
    category: 'mare',
    title: 'Lotti resort lusso Costa Smeralda',
    location: 'Costa Smeralda, Sardegna',
    periodFrom: '2026-07-20',
    periodTo: '2026-08-18',
    quantity: 8,
    roomsPerLot: 10,
    description:
      'Cancellazione gruppo: lotti misti vista mare e suite, pensione completa, accesso spa.',
    contactEmail: 'sales@sardinia.it',
  },
  {
    id: 'c5',
    ditta: 'Salento Mare Resort',
    initials: 'SMR',
    type: 'vendita',
    category: 'mare',
    title: 'Villaggio fronte spiaggia Puglia',
    location: 'Gallipoli, Puglia',
    periodFrom: '2026-06-20',
    periodTo: '2026-09-10',
    quantity: 10,
    roomsPerLot: 12,
    description: 'Camere family e doppie a 50 m dalla spiaggia, mezza pensione inclusa.',
    contactEmail: 'info@salentomare.it',
  },
  // --- Controparti per m3 (vendita città d'arte Firenze, apr-mag) ---
  {
    id: 'c6',
    ditta: 'Tour Operator Arte&Co',
    initials: 'TAC',
    type: 'acquisto',
    category: 'citta_arte',
    title: 'Ricerca camere tour Firenze',
    location: 'Firenze, Toscana',
    periodFrom: '2026-04-15',
    periodTo: '2026-05-08',
    quantity: 4,
    roomsPerLot: 8,
    description: 'Tour culturali primaverili, gruppi da 30-40 ospiti, camere doppie centro.',
    contactEmail: 'gruppi@arteco.it',
  },
  {
    id: 'c7',
    ditta: 'Musei Network Roma',
    initials: 'MNR',
    type: 'acquisto',
    category: 'citta_arte',
    title: 'Lotti camere circuito musei',
    location: 'Roma, Lazio',
    periodFrom: '2026-05-02',
    periodTo: '2026-06-05',
    quantity: 3,
    roomsPerLot: 6,
    description: 'Pacchetti culturali con ingressi musei, richieste camere doppie centrali.',
    contactEmail: 'eventi@museiroma.it',
  },
  // --- Annunci aggiuntivi (volume tabella, categorie varie) ---
  {
    id: 'c8',
    ditta: 'Mountain Hotels Group',
    initials: 'MHG',
    type: 'vendita',
    category: 'montagna',
    title: 'Lotti settimana bianca Bormio',
    location: 'Bormio, Lombardia',
    periodFrom: '2026-12-20',
    periodTo: '2027-01-06',
    quantity: 6,
    roomsPerLot: 8,
    description: 'Hotel ai piedi delle piste, skipass incluso e centro benessere.',
    contactEmail: 'info@mountainhotels.it',
  },
  {
    id: 'c9',
    ditta: 'Corporate Wellness Solutions',
    initials: 'CWS',
    type: 'acquisto',
    category: 'wellness',
    title: 'Ritiro aziendale spa resort',
    location: 'Saturnia, Toscana',
    periodFrom: '2026-10-12',
    periodTo: '2026-10-22',
    quantity: 4,
    roomsPerLot: 12,
    description: 'Ritiro wellness con sale meeting, trattamenti spa e area fitness.',
    contactEmail: 'wellness@corporate.it',
  },
  {
    id: 'c10',
    ditta: 'Wedding Planners Venezia',
    initials: 'WPV',
    type: 'vendita',
    category: 'eventi',
    title: 'Camere charme matrimonio Venezia',
    location: 'Venezia, Veneto',
    periodFrom: '2026-08-10',
    periodTo: '2026-09-02',
    quantity: 6,
    roomsPerLot: 6,
    description: 'Strutture di charme per ospiti evento matrimoniale di prestigio.',
    contactEmail: 'events@wedding.it',
  },
];

/* ---------- Helpers ---------- */

export function periodLabel(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  return `${f.getMonth() + 1}/${f.getFullYear()} - ${t.getMonth() + 1}/${t.getFullYear()}`;
}

export function regionOf(location: string): string {
  const parts = location.split(',');
  return (parts[parts.length - 1] ?? location).trim().toLowerCase();
}

/** Rapporto di sovrapposizione [0..1] tra due periodi. */
export function overlapRatio(aFrom: string, aTo: string, bFrom: string, bTo: string): number {
  const a0 = new Date(aFrom).getTime();
  const a1 = new Date(aTo).getTime();
  const b0 = new Date(bFrom).getTime();
  const b1 = new Date(bTo).getTime();
  const start = Math.max(a0, b0);
  const end = Math.min(a1, b1);
  const overlap = Math.max(0, end - start);
  const minDur = Math.max(1, Math.min(a1 - a0, b1 - b0));
  return Math.min(1, overlap / minDur);
}

export interface MatchReasons {
  category: boolean;
  periodOverlap: number; // 0..1
  sameRegion: boolean;
  quantityProx: number; // 0..1
}
export interface MatchResult {
  score: number; // 0..100
  reasons: MatchReasons;
}

/** Compatibilità tra un mio annuncio e una controparte (tipo opposto atteso). */
export function compatibility(mine: MzListing, cand: MzListing): MatchResult {
  const category = mine.category === cand.category;
  const periodOverlap = overlapRatio(mine.periodFrom, mine.periodTo, cand.periodFrom, cand.periodTo);
  const sameRegion = regionOf(mine.location) === regionOf(cand.location);
  const maxQ = Math.max(mine.quantity, cand.quantity);
  const quantityProx = maxQ === 0 ? 1 : 1 - Math.min(1, Math.abs(mine.quantity - cand.quantity) / maxQ);
  const score = Math.round(
    40 * (category ? 1 : 0) + 30 * periodOverlap + 20 * (sameRegion ? 1 : 0) + 10 * quantityProx,
  );
  return { score, reasons: { category, periodOverlap, sameRegion, quantityProx } };
}
