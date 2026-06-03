import { create } from 'zustand'
import T from '../core/tokens'

// Stato condiviso di Ruoli & Profili, configurato nella pagina "Ruoli & funzioni"
// e importato dall'Organigramma. ⚠️ Dati mock — verranno dal backend.

export interface RuoloRow   { nome: string; funzione: string }
export interface ProfiloRow { nome: string; initials: string; color: string; ruolo: string; contratto: string; icona?: string }

// Set di icone profilo (segnaposto FontAwesome — sostituibili con gli SVG reali).
// `icona` su un profilo memorizza il nome FA (es. 'fa-user-tie').
export interface ProfileIcon { fa: string; label: string; gruppo: 'Maschile' | 'Femminile' }
export const PROFILE_ICONS: ProfileIcon[] = [
  { fa: 'fa-person',        label: 'Uomo',        gruppo: 'Maschile' },
  { fa: 'fa-user-tie',      label: 'Manager',     gruppo: 'Maschile' },
  { fa: 'fa-user',          label: 'Utente',      gruppo: 'Maschile' },
  { fa: 'fa-user-gear',     label: 'Tecnico',     gruppo: 'Maschile' },
  { fa: 'fa-user-headset',  label: 'Operatore',   gruppo: 'Maschile' },
  { fa: 'fa-user-graduate', label: 'Junior',      gruppo: 'Maschile' },
  { fa: 'fa-person-dress',  label: 'Donna',       gruppo: 'Femminile' },
  { fa: 'fa-user-nurse',    label: 'Staff',       gruppo: 'Femminile' },
  { fa: 'fa-user-doctor',   label: 'Specialista', gruppo: 'Femminile' },
  { fa: 'fa-user-pen',      label: 'Ufficio',     gruppo: 'Femminile' },
]

interface RuoliState {
  ruoli:   RuoloRow[]
  profili: ProfiloRow[]
  setRuoli:   (r: RuoloRow[]) => void
  setProfili: (p: ProfiloRow[]) => void
}

export const useRuoliStore = create<RuoliState>((set) => ({
  ruoli: [
    { nome: 'Operation', funzione: '' },
    { nome: 'Prova',     funzione: '' },
    { nome: 'Prova',     funzione: '' },
    { nome: 'Ruoloooo',  funzione: '' },
  ],
  profili: [
    { nome: 'Operatore Tutorial', initials: 'OT', color: '#9B59B6',       ruolo: '', contratto: '', icona: 'fa-user-headset' },
    { nome: 'Andrea G Test',      initials: 'AG', color: T.blue,          ruolo: '', contratto: '', icona: 'fa-user-tie' },
    { nome: 'Test Test',          initials: 'TT', color: T.textDisabled,  ruolo: '', contratto: '', icona: 'fa-user' },
    { nome: 'Sicilia Andrea',     initials: 'SA', color: '#E07B39',       ruolo: '', contratto: '', icona: 'fa-person-dress' },
    { nome: 'Gianpaolo Armeni',   initials: 'GA', color: '#5A8A3C',       ruolo: '', contratto: '', icona: 'fa-user-gear' },
    { nome: 'Ali Aslan',          initials: 'AA', color: T.primary,       ruolo: '', contratto: '', icona: 'fa-user-graduate' },
    { nome: 'Massimo Belloni',    initials: 'MB', color: '#C4A820',       ruolo: '', contratto: '', icona: 'fa-person' },
    { nome: 'Marco Campo',        initials: 'MC', color: '#E07B39',       ruolo: '', contratto: '', icona: 'fa-user-tie' },
  ],
  setRuoli:   (ruoli)   => set({ ruoli }),
  setProfili: (profili) => set({ profili }),
}))
