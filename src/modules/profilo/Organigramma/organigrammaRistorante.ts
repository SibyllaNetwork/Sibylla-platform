// ─── ORGANIGRAMMA · RISTORANTE ────────────────────────────────────────────────
//  Ruoli, funzioni e persone tipici di un ristorante, per le utenze Food &
//  Beverage stand alone (es. Elena Russo). L'organigramma parte già costruito:
//  Amministratore → Direzione → Sala / Cucina / Bar / Cassa / Economato, con la
//  brigata del ristorante selezionato (la stessa di sala, cassa e utenti F&B).
//  ⚠️ Dati mock — verranno dal backend.

import type { ProfiloRow, RuoloRow } from '../../../store/useRuoliStore'
import { STILI, stileDa, brigataDi } from '../../operation/FoodBeverage/stiliRistorante'

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

/** Organigramma del ristorante selezionato: ruoli (rinominati secondo lo stile) e brigata del locale. */
export function organigrammaDi(struttura: string, classificazione?: string): {
  ruoli: RuoloRow[]; profili: ProfiloRow[]; albero: { ruolo: string; padre: string | null }[]
} {
  const rinomina = STILI[stileDa(classificazione)].ruoli ?? {}
  const r = (nome: string) => rinomina[nome] ?? nome
  return {
    ruoli: RUOLI_RISTORANTE.map(x => ({ ...x, nome: r(x.nome) })),
    profili: brigataDi(struttura, classificazione).map(m => ({
      nome: m.nome, initials: iniz(m.nome), color: '#204769', ruolo: m.ruolo, contratto: m.contratto, seed: m.seed,
    })),
    albero: ALBERO_RISTORANTE.map(a => ({ ruolo: r(a.ruolo), padre: a.padre ? r(a.padre) : null })),
  }
}

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
