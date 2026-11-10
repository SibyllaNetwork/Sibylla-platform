// ─── Magazzino della Ristorazione: tipi del contratto con Op ─────────────────
//  Ricavati alla lettera dal § 8 di sibylla-op/docs/integrazione-sibylla/
//  17-magazzino-ristorazione.md, con gli stessi nomi dei campi (snake_case).
//  Se qui serve un campo che la scheda non dà, si aggiunge prima alla scheda.

export type Unita = 'kg' | 'l' | 'pz'
export type TipoPunto = 'magazzino' | 'cucina' | 'bar'
export type TipoMovimento = 'carico' | 'scarico' | 'trasferimento' | 'reso' | 'scarto' | 'vendita' | 'rettifica'
export type OrigineMovimento = 'manuale' | 'codice_a_barre' | 'bolla' | 'comanda' | 'inventario'
export type StatoInventario = 'aperto' | 'chiuso' | 'annullato'
export type RepartoRicetta = 'cucina' | 'bar'

/** § 8.0 — esito di ogni azione che modifica (sempre 200). */
export interface Esito {
  success: boolean
  error_message: string | null
  id: number | null
  duplicato: boolean
  avvisi: string[]
}

export interface Rif { id: number; nome: string }

/** § 8.2 */
export interface CodiceABarre { ean: string; quantita: number; descrizione: string | null }
/** `confezione`: multiplo d'ordine presso quel fornitore, nell'unità dell'articolo (es. cartone da 10 kg); null = qualsiasi quantità. */
export interface FornitoreArticolo { id_fornitore: number; nome: string; codice_fornitore: string | null; prezzo: number | null; confezione: number | null }

export interface Articolo {
  id: number
  codice: string
  nome: string
  id_categoria: number | null
  categoria: string | null
  unita: Unita
  codici_a_barre: CodiceABarre[]
  fornitori: FornitoreArticolo[]
  scorta_minima: number
  /** Riordino: quando la giacenza (più la merce in arrivo) scende a questo valore, l'articolo va riordinato. null = si usa la scorta minima. */
  punto_riordino: number | null
  /** Riordino: livello fino a cui riempire con l'ordine. null = il doppio del punto di riordino. */
  scorta_obiettivo: number | null
  id_punto_predefinito: number | null
  costo_medio: number | null
  giacenza_totale: number
  sotto_scorta: boolean
  attivo: boolean
  note: string | null
}

/** § 8.3 */
export interface Punto { id: number; id_struttura: number; nome: string; tipo: TipoPunto; attivo: boolean }
export interface FornitoreBreve { id: number; nome: string; partita_iva: string | null }
export interface Chiave { key: string; nome: string }

/** Struttura di Op; `id_struttura_platform` = id della struttura in Platform (null se creata solo in Op). */
export interface StrutturaMag { id: number; id_struttura_platform: number | null; nome: string }

export interface Contesto {
  strutture: StrutturaMag[]
  punti: Punto[]
  categorie: Rif[]
  fornitori: FornitoreBreve[]
  unita: { key: Unita; nome: string }[]
  motivi_scarto: Chiave[]
  bolla_attiva: boolean
  permessi: { gestore: boolean }
}

/** § 8.4 */
export interface FiltriGiacenze {
  id_struttura: number
  id_punto?: number | null
  id_categoria?: number | null
  cerca?: string | null
  solo_sotto_scorta?: boolean
  inattivi?: boolean
}

export interface RigaGiacenza {
  id_articolo: number
  nome: string
  categoria: string | null
  unita: Unita
  per_punto: { id_punto: number; quantita: number }[]
  totale: number
  scorta_minima: number
  sotto_scorta: boolean
  negativa: boolean
  costo_medio: number | null
  valore: number
  ultimo_movimento: string | null
}

export interface Giacenze { aggiornato_il: string; righe: RigaGiacenza[]; valore_totale: number }

/** § 8.5 */
export interface FiltriArticoli { cerca?: string | null; id_categoria?: number | null; inattivi?: boolean; pagina?: number; per_pagina?: number }
export interface Pagina<T> { totale: number; righe: T[] }

export interface ArticoloDettaglio extends Articolo {
  giacenze: { id_punto: number; quantita: number }[]
  ultimi_movimenti: RigaRegistro[]
  usato_in_ricette: Rif[]
}

export interface RisultatoCodice { trovato: boolean; articolo: Articolo | null; quantita: number; descrizione: string | null }

export interface ArticoloRichiesta {
  id: number | null
  id_operazione?: string
  nome: string
  id_categoria: number | null
  unita: Unita
  codici_a_barre: CodiceABarre[]
  fornitori: { id_fornitore: number; codice_fornitore: string | null; confezione?: number | null }[]
  scorta_minima: number
  punto_riordino?: number | null
  scorta_obiettivo?: number | null
  id_punto_predefinito: number | null
  attivo: boolean
  note: string | null
}

/** § 8.6 */
export interface RigaMovimentoRichiesta {
  id_articolo?: number | null
  quantita?: number | null
  prezzo_unitario?: number | null
  lotto?: string | null
  scadenza?: string | null
  /** Solo per `vendita`. */
  id_voce?: number | null
  porzioni?: number | null
}

export interface MovimentoRichiesta {
  id_operazione: string
  tipo: TipoMovimento
  id_struttura: number
  id_punto?: number | null
  id_punto_destinazione?: number | null
  data?: string | null
  id_fornitore?: number | null
  documento?: string | null
  motivo?: string | null
  note?: string | null
  origine?: 'manuale' | 'codice_a_barre' | 'bolla'
  /** Solo `carico`: l'ordine al fornitore che questo carico evade (le quantità ricevute si sommano alle sue righe). */
  id_ordine?: number | null
  righe: RigaMovimentoRichiesta[]
}

/** § 8.7 */
export interface FiltriMovimenti {
  id_struttura: number
  dal: string
  al: string
  tipo?: TipoMovimento | TipoMovimento[] | null
  id_articolo?: number | null
  id_punto?: number | null
  origine?: OrigineMovimento | null
  automatici?: boolean
  pagina?: number
  per_pagina?: number
}

export interface RigaRegistro {
  id: number
  tipo: TipoMovimento
  origine: OrigineMovimento
  data: string
  registrato_il: string
  autore: string
  punto: Rif | null
  punto_destinazione: Rif | null
  fornitore: Rif | null
  documento: string | null
  motivo: string | null
  comanda: { id: number; tavolo: string; voce: string; porzioni: number } | null
  annulla: number | null
  annullato_da: number | null
  righe_count: number
  valore: number
  anteprima: string
}

export interface RigaMovimento {
  id_articolo: number
  nome: string
  unita: Unita
  quantita: number
  prezzo_unitario: number | null
  lotto: string | null
  scadenza: string | null
  id_punto: number
  giacenza_dopo: number
}

export interface MovimentoDettaglio extends RigaRegistro { righe: RigaMovimento[] }

/** § 8.8 */
export interface FileBolla { tipo: 'image/jpeg' | 'image/png' | 'application/pdf'; dati: string }

export interface FornitoreLetto {
  nome: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  indirizzo: string | null
  cap: string | null
  comune: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  pec: string | null
  id_fornitore: number | null
}

export interface PropostaArticolo { nome: string; unita: Unita; quantita: number | null; categoria: string | null; id_categoria: number | null }

export interface RigaBolla {
  codice: string | null
  ean: string | null
  descrizione: string
  quantita_letta: number | null
  unita_letta: string | null
  lotto: string | null
  scadenza: string | null
  prezzo_letto: number | null
  id_articolo: number | null
  quantita: number | null
  prezzo_unitario: number | null
  proposta: PropostaArticolo | null
}

export interface BollaLetta {
  leggibile: boolean
  fornitore: FornitoreLetto | null
  numero: string | null
  data: string | null
  documento: string | null
  righe: RigaBolla[]
  avvisi: string[]
}

/** § 8.9 */
export interface FornitoreRichiesta {
  id: number | null
  id_operazione?: string
  nome: string
  partita_iva: string | null
  codice_fiscale: string | null
  indirizzo: string | null
  cap: string | null
  comune: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  pec: string | null
}

export interface PuntoRichiesta { id: number | null; id_operazione?: string; id_struttura: number; nome: string; tipo: TipoPunto; attivo: boolean }

/** § 8.10 */
export interface VoceRicetta {
  id_voce: number
  nome: string
  prezzo: number
  disponibile: boolean
  ricetta: boolean
  reparto: RepartoRicetta | null
  ingredienti: number
  costo_porzione: number | null
  food_cost: number | null
  articoli_mancanti: number
}

export interface CategoriaRicette { id_categoria_menu: number; categoria_menu: string; voci: VoceRicetta[] }

export interface IngredienteRicetta { id_articolo: number; nome: string; unita: Unita; quantita: number; costo: number | null }

export interface Ricetta {
  id_voce: number
  nome: string
  prezzo: number
  reparto: RepartoRicetta | null
  ingredienti: IngredienteRicetta[]
  costo_porzione: number | null
  food_cost: number | null
  aggiornata_il: string | null
  aggiornata_da: string | null
}

export interface RicettaRichiesta { id_voce: number; reparto: RepartoRicetta; ingredienti: { id_articolo: number; quantita: number }[] }

/** § 8.11 */
export interface InventarioRiga {
  id: number
  punto: Rif
  stato: StatoInventario
  aperto_il: string
  aperto_da: string
  chiuso_il: string | null
  chiuso_da: string | null
  articoli: number
  contati: number
  differenze: number
  valore_differenze: number
  id_movimento: number | null
}

export interface RigaConta {
  id_articolo: number
  nome: string
  categoria: string | null
  unita: Unita
  teorica: number
  contata: number | null
  differenza: number | null
  valore_differenza: number | null
  contata_da: string | null
  contata_il: string | null
}

export interface InventarioDettaglio extends InventarioRiga { righe: RigaConta[] }

/** Fornitore completo (azione `fornitore`). */
export interface FornitoreDettaglio extends FornitoreRichiesta { id: number; articoli: number }

/** Riordino e ordini ai fornitori (docs/portal-magazzino-riordino.md). */
export type StatoOrdine = 'bozza' | 'inviato' | 'parziale' | 'ricevuto' | 'chiuso' | 'annullato'

export interface RigaRiordino {
  id_articolo: number
  nome: string
  categoria: string | null
  unita: Unita
  giacenza: number
  in_arrivo: number
  punto_riordino: number
  scorta_obiettivo: number
  quantita_proposta: number
  fornitori: { id_fornitore: number; nome: string; codice_fornitore: string | null; prezzo: number | null; confezione: number | null }[]
  id_fornitore_proposto: number | null
}

export interface Riordino { aggiornato_il: string; righe: RigaRiordino[] }

export interface RigaOrdine {
  id_articolo: number
  nome: string
  unita: Unita
  codice_fornitore: string | null
  quantita: number
  prezzo_atteso: number | null
  ricevuta: number
}

export interface OrdineSintesi {
  id: number
  numero: string
  id_struttura: number
  fornitore: { id: number; nome: string; email: string | null }
  stato: StatoOrdine
  creato_il: string
  creato_da: string
  inviato_il: string | null
  consegna_richiesta: string | null
  righe_count: number
  totale_atteso: number
}

export interface Ordine extends OrdineSintesi {
  inviato_da: string | null
  inviato_a: string[]
  note: string | null
  motivo_chiusura: string | null
  righe: RigaOrdine[]
}

export interface OrdineRichiesta {
  id: number | null
  id_operazione?: string
  id_struttura: number
  id_fornitore: number
  consegna_richiesta: string | null
  note: string | null
  righe: { id_articolo: number; quantita: number; prezzo_atteso: number | null }[]
}

export interface InvioOrdine {
  id: number
  id_operazione: string
  a: string[]
  cc: string[]
  oggetto: string
  messaggio: string
  pdf: { nome_file: string; dati: string }
}

/** § 8.13 — "Fotografa col telefono". */
export interface PassaggioTelefono { codice: string; url: string; scade_il: string }
export interface StatoTelefono { stato: 'attesa' | 'inviata' | 'ritirata' | 'scaduta'; scade_il: string; file: FileBolla[] }

/** § 8.1 — azioni e relativi dati/risposte, per tipizzare il client. */
export interface Azioni {
  contesto: [Record<string, never>, Contesto]
  giacenze: [FiltriGiacenze, Giacenze]
  articoli: [FiltriArticoli, Pagina<Articolo>]
  articolo: [{ id: number; id_struttura: number }, ArticoloDettaglio]
  cerca_codice: [{ codice: string }, RisultatoCodice]
  salva_articolo: [ArticoloRichiesta, Esito]
  elimina_articolo: [{ id: number }, Esito]
  salva_categoria: [{ id: number | null; id_operazione?: string; nome: string }, Esito]
  elimina_categoria: [{ id: number }, Esito]
  salva_punto: [PuntoRichiesta, Esito]
  elimina_punto: [{ id: number }, Esito]
  salva_fornitore: [FornitoreRichiesta, Esito]
  fornitore: [{ id: number }, FornitoreDettaglio]
  riordino: [{ id_struttura: number }, Riordino]
  ordini: [{ id_struttura: number; stato?: StatoOrdine | null; id_fornitore?: number | null }, OrdineSintesi[]]
  ordine: [{ id: number }, Ordine]
  salva_ordine: [OrdineRichiesta, Esito]
  invia_ordine: [InvioOrdine, Esito]
  annulla_ordine: [{ id: number; motivo: string }, Esito]
  chiudi_ordine: [{ id: number; motivo: string }, Esito]
  registra: [MovimentoRichiesta, Esito]
  movimenti: [FiltriMovimenti, Pagina<RigaRegistro>]
  movimento: [{ id: number }, MovimentoDettaglio]
  annulla_movimento: [{ id: number; id_operazione: string; motivo: string }, Esito]
  leggi_bolla: [{ id_struttura: number; file: FileBolla[] }, BollaLetta]
  bolla_telefono_apri: [{ id_struttura: number }, PassaggioTelefono]
  bolla_telefono_stato: [{ codice: string }, StatoTelefono]
  ricette: [{ cerca?: string | null; id_categoria_menu?: number | null; senza_ricetta?: boolean; id_struttura?: number | null }, CategoriaRicette[]]
  ricetta: [{ id_voce: number }, Ricetta]
  salva_ricetta: [RicettaRichiesta, Esito]
  elimina_ricetta: [{ id_voce: number }, Esito]
  inventari: [{ id_struttura: number; stato?: StatoInventario | null }, InventarioRiga[]]
  inventario: [{ id: number }, InventarioDettaglio]
  inventario_apri: [{ id_operazione: string; id_struttura: number; id_punto: number }, Esito]
  inventario_conta: [{ id: number; righe: { id_articolo: number; contata: number | null }[] }, Esito]
  inventario_chiudi: [{ id: number; non_contati: 'ignora' | 'azzera' }, Esito]
  inventario_annulla: [{ id: number }, Esito]
}

export type NomeAzione = keyof Azioni
export type DatiAzione<A extends NomeAzione> = Azioni[A][0]
export type RispostaAzione<A extends NomeAzione> = Azioni[A][1]
