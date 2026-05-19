// ─── PLANNER TYPES ────────────────────────────────────────────────────────────

export type StatoCam =
  | 'libera'
  | 'occupata'
  | 'checkout'
  | 'manutenzione'
  | 'pulizia'
  | 'prenotata';

export type StatoPren =
  | 'confermata'
  | 'opzione'
  | 'noshow'
  | 'checkin'
  | 'checkin_p'
  | 'checkout'
  | 'manutenzione'
  | 'pulizia';

export interface Camera {
  numero: string;
  tipo: string;
  stato: StatoCam;
}

export interface Piano {
  id: number;
  nome: string;
  camere: Camera[];
}

export interface Pren {
  id: string;
  booking: string;
  nominativo: string;
  checkIn: string;
  checkOut: string;
  stato: StatoPren;
  numeroCamera: string;
  agenzia?: string;
  segmento?: string;
}

export interface PrenPendente {
  booking: string;
  nominativo: string;
  checkIn: string;
  checkOut: string;
  agenzia: string;
  segmento: string;
  tipo: 'assegnare' | 'allocare';
}

export interface PlannerProps {
  navigate?: (page: string) => void;
}
