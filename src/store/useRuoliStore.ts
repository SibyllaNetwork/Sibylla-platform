import { create } from 'zustand'
import T from '../core/tokens'

// Stato condiviso di Ruoli & Profili, configurato nella pagina "Ruoli & funzioni"
// e importato dall'Organigramma. ⚠️ Dati mock — verranno dal backend.

export interface RuoloRow   { nome: string; funzione: string }
// `seed` (opzionale) = avatar Notionists scelto; se assente si usa il nome come seed.
export interface ProfiloRow { nome: string; initials: string; color: string; ruolo: string; contratto: string; seed?: string }

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
    { nome: 'Operatore Tutorial', initials: 'OT', color: '#9B59B6',       ruolo: '', contratto: '' },
    { nome: 'Andrea G Test',      initials: 'AG', color: T.blue,          ruolo: '', contratto: '' },
    { nome: 'Test Test',          initials: 'TT', color: T.textDisabled,  ruolo: '', contratto: '' },
    { nome: 'Sicilia Andrea',     initials: 'SA', color: '#E07B39',       ruolo: '', contratto: '' },
    { nome: 'Gianpaolo Armeni',   initials: 'GA', color: '#5A8A3C',       ruolo: '', contratto: '' },
    { nome: 'Ali Aslan',          initials: 'AA', color: T.primary,       ruolo: '', contratto: '' },
    { nome: 'Massimo Belloni',    initials: 'MB', color: '#C4A820',       ruolo: '', contratto: '' },
    { nome: 'Marco Campo',        initials: 'MC', color: '#E07B39',       ruolo: '', contratto: '' },
  ],
  setRuoli:   (ruoli)   => set({ ruoli }),
  setProfili: (profili) => set({ profili }),
}))
