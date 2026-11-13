// ─── Ordini ai fornitori: nomi degli stati ───────────────────────────────────
import type { StatoOrdine } from '../api/tipi'

export const STATI_ORDINE: Record<StatoOrdine, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  parziale: 'Arrivato in parte',
  ricevuto: 'Arrivato',
  chiuso: 'Chiuso',
  annullato: 'Annullato',
}
