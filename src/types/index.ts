export type FnType = "completo" | "lettura" | "nascosta";

export interface Client {
  id: number;
  nome: string;
  tipo: string;
  citta: string;
  camere: number;
  valuta: string;
  lingua: string;
  stato: string;
  email: string;
  tel: string;
}

export interface Ruolo {
  id: string;
  nome: string;
  desc: string;
  colore: string;
}

export interface Booking {
  id: number;
  nome: string;
  startDay: number;
  endDay: number;
  row: number;
  colore: string;
  camere: number;
  persone: number;
  importo: number;
}
export interface AuthUser {
  id_azienda: number;
  nome?: string;
  cognome?: string;
  email?: string;
  sub?: string;
}

export interface PageItem {
  id: number;
  nome: string;
  link: string;
  icon?: string;
  parent_id?: number | null;
  is_menu?: number;
}