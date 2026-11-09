// ─── ORGANIGRAMMA · RISTORANTE ────────────────────────────────────────────────
//  Ruoli, funzioni e persone tipici di un ristorante, per le utenze Food &
//  Beverage stand alone (es. Elena Russo — Osteria della Mole). L'organigramma
//  parte già costruito: Amministratore → Direzione → Sala / Cucina / Bar /
//  Cassa / Economato. I nomi di sala coincidono con i camerieri del modello F&B.
//  ⚠️ Dati mock — verranno dal backend.

import type { ProfiloRow, RuoloRow } from '../../../store/useRuoliStore'

/** Ruoli del ristorante con la loro funzione (stesse funzioni di "Ruoli & funzioni"). */
export const RUOLI_RISTORANTE: RuoloRow[] = [
  { nome: 'Direttore di ristorante', funzione: 'Manager' },
  { nome: 'Maître',                  funzione: 'Responsabile' },
  { nome: 'Chef de rang',            funzione: 'Supervisore' },
  { nome: 'Commis di sala',          funzione: 'Operatore' },
  { nome: 'Sommelier',               funzione: 'Operatore' },
  { nome: 'Hostess di sala',         funzione: 'Operatore' },
  { nome: 'Executive chef',          funzione: 'Responsabile' },
  { nome: 'Sous chef',               funzione: 'Supervisore' },
  { nome: 'Chef de partie',          funzione: 'Operatore' },
  { nome: 'Commis di cucina',        funzione: 'Operatore' },
  { nome: 'Pasticcere',              funzione: 'Operatore' },
  { nome: 'Lavapiatti',              funzione: 'Operatore' },
  { nome: 'Barman',                  funzione: 'Operatore' },
  { nome: 'Cassiere',                funzione: 'Operatore' },
  { nome: 'Economo',                 funzione: 'Responsabile' },
]

const iniz = (nome: string) => nome.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase()
const p = (nome: string, ruolo: string, seed: string, contratto = 'Full-time', color = '#204769'): ProfiloRow =>
  ({ nome, initials: iniz(nome), color, ruolo, contratto, seed })

/** Personale del ristorante (avatar scelti per corrispondere al nome). */
export const PROFILI_RISTORANTE: ProfiloRow[] = [
  p('Roberto Ferraro',     'Direttore di ristorante', 'avatar-18'),
  p('Chiara Gallo',        'Maître',                  'avatar-09'),
  p('Luca Villa',          'Chef de rang',            'avatar-31'),
  p('Sara Testa',          'Chef de rang',            'avatar-35'),
  p('Davide Rizzo',        'Commis di sala',          'avatar-26', 'Stagionale'),
  p('Martina Galli',       'Commis di sala',          'avatar-34', 'Part-time'),
  p('Paolo Neri',          'Sommelier',               'avatar-29'),
  p('Giorgia Leone',       'Hostess di sala',         'avatar-39', 'Part-time'),
  p('Antonio Esposito',    'Executive chef',          'avatar-43'),
  p('Francesca Marino',    'Sous chef',               'avatar-44'),
  p('Matteo Conte',        'Chef de partie',          'avatar-36'),
  p('Giulia Pellegrini',   'Chef de partie',          'avatar-23'),
  p('Simone Greco',        'Commis di cucina',        'avatar-28', 'Apprendistato'),
  p('Elisa Fontana',       'Pasticcere',              'avatar-46'),
  p('Karim Haddad',        'Lavapiatti',              'avatar-41', 'Part-time'),
  p('Andrea Costa',        'Barman',                  'avatar-47'),
  p('Valentina Moretti',   'Cassiere',                'avatar-50'),
  p('Stefano Rinaldi',     'Economo',                 'avatar-20'),
]

/** Albero di partenza: ruolo → ruolo padre (null = sotto l'Amministratore). */
export const ALBERO_RISTORANTE: { ruolo: string; padre: string | null }[] = [
  { ruolo: 'Direttore di ristorante', padre: null },
  { ruolo: 'Maître',                  padre: 'Direttore di ristorante' },
  { ruolo: 'Executive chef',          padre: 'Direttore di ristorante' },
  { ruolo: 'Barman',                  padre: 'Direttore di ristorante' },
  { ruolo: 'Cassiere',                padre: 'Direttore di ristorante' },
  { ruolo: 'Economo',                 padre: 'Direttore di ristorante' },
  { ruolo: 'Chef de rang',            padre: 'Maître' },
  { ruolo: 'Sommelier',               padre: 'Maître' },
  { ruolo: 'Hostess di sala',         padre: 'Maître' },
  { ruolo: 'Commis di sala',          padre: 'Chef de rang' },
  { ruolo: 'Sous chef',               padre: 'Executive chef' },
  { ruolo: 'Chef de partie',          padre: 'Sous chef' },
  { ruolo: 'Pasticcere',              padre: 'Sous chef' },
  { ruolo: 'Lavapiatti',              padre: 'Sous chef' },
  { ruolo: 'Commis di cucina',        padre: 'Chef de partie' },
]
