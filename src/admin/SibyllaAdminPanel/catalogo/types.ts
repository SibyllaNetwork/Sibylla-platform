export interface Categoria {
  id: string
  nome: string
  icona: string
  descrizione: string
  macroArea: string
}

export interface Fornitore {
  id: string
  nome: string
  descrizione: string
  storia: string
  indirizzo: string
  citta: string
  regione: string
  cap: string
  telefono: string
  email: string
  sito: string
  annoFondazione: number
  certificazioni: string[]
  caratteristiche: string[]
  categoriaId: string
  macroArea: string
  immagineUrl: string
  pubblicato: boolean
}

export type UnitaMisura = 'pz' | 'kg' | 'g' | 'l' | 'ml' | 'cassa' | 'box' | 'conf'

export type Mercato = 'agora' | 'network'

export interface ProdottoMercato {
  abilitato: boolean
  prezzoVendita: number
}

export type ProdottoMercati = Record<Mercato, ProdottoMercato>

export interface Prodotto {
  id: string
  barcode: string
  nome: string
  descrizione: string
  categoriaId: string
  fornitoreId: string
  prezzoBase: number  // prezzo di acquisto / listino fornitore
  unita: UnitaMisura
  quantitaUnita: number
  immagineUrl: string
  scortaMinima: number
  attivo: boolean
  mercati: ProdottoMercati
  pubblicato: boolean
}

export interface CategoriaForm {
  nome: string
  icona: string
  descrizione: string
  macroArea: string
}

export interface FornitoreForm {
  nome: string
  descrizione: string
  storia: string
  indirizzo: string
  citta: string
  regione: string
  cap: string
  telefono: string
  email: string
  sito: string
  annoFondazione: string
  certificazioni: string
  caratteristiche: string
  categoriaId: string
  macroArea: string
  immagineUrl: string
}

export interface ProdottoForm {
  barcode: string
  nome: string
  descrizione: string
  categoriaId: string
  fornitoreId: string
  prezzoBase: string
  unita: UnitaMisura
  quantitaUnita: string
  immagineUrl: string
  scortaMinima: string
  attivo: boolean
  agoraAbilitato: boolean
  agoraPrezzo: string
  networkAbilitato: boolean
  networkPrezzo: string
}

export const MERCATI: Array<{ id: Mercato; label: string; descrizione: string; colore: string }> = [
  { id: 'agora',   label: 'Agorà',   descrizione: 'Marketplace Sibylla aperto a tutta la rete',     colore: '#E07B39' },
  { id: 'network', label: 'Network', descrizione: 'Vendite riservate ai clienti Sibylla affiliati', colore: '#5C9CD4' },
]

export type CatalogoSubTab = 'categorie' | 'fornitori' | 'prodotti'
