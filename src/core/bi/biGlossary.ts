// ─── GLOSSARIO BI ───────────────────────────────────────────────────────────────
//  Dizionario UNICO degli acronimi e delle metriche usate nelle pagine BI:
//  acronimo → descrizione + modalità di calcolo. Ogni pagina dichiara solo le
//  chiavi che compaiono al suo interno (`<BiGlossaryRail keys={[...]}/>`), così la
//  stessa voce ha la stessa definizione su tutta la piattaforma: una metrica si
//  corregge qui una volta e cambia ovunque.
//
//  Fonte iniziale: glossario del BI storico (popup "i" delle pagine Monthly
//  trend/analisi). La definizione di TY nel legacy era quella del RevPAR: qui è
//  corretta.

export interface BiGlossaryEntry {
  /** Acronimo o etichetta come compare nella pagina. */
  term: string
  /** Che cos'è. */
  description: string
  /** Come si ottiene il numero. */
  formula: string
}

export const BI_GLOSSARY: Record<string, BiGlossaryEntry> = {
  TY: {
    term: 'TY',
    description: 'This Year',
    formula: 'Valore della metrica nel periodo selezionato dell’anno corrente',
  },
  LY: {
    term: 'LY',
    description: 'Last Year',
    formula: 'Valore della metrica nello stesso periodo dell’anno precedente',
  },
  delta: {
    term: 'Δ',
    description: 'Variazione',
    formula: 'Differenza fra il valore dell’anno corrente e quello dell’anno precedente',
  },
  B2B: {
    term: 'B2B',
    description: 'Business to Business',
    formula: 'Valore dei ricavi B2B diviso il valore dei ricavi totali',
  },
  B2C: {
    term: 'B2C',
    description: 'Business to Customer',
    formula: 'Valore dei ricavi B2C diviso il valore dei ricavi totali',
  },
  dirette: {
    term: 'Dirette',
    description: 'Vendite dirette',
    formula: 'Valore dei ricavi diretti diviso il valore dei ricavi totali',
  },
  corporate: {
    term: 'Corporate',
    description: 'Vendite corporate',
    formula: 'Valore dei ricavi corporate diviso il valore dei ricavi totali',
  },
  gruppi: {
    term: 'Gruppi',
    description: 'Vendite a gruppi',
    formula: 'Valore dei ricavi da prenotazioni di gruppo diviso il valore dei ricavi totali',
  },
  complimentary: {
    term: 'Complimentary',
    description: 'Camere omaggio',
    formula: 'Numero delle camere complimentary diviso il numero delle camere occupate',
  },
  ADR: {
    term: 'ADR',
    description: 'Average Daily Rate — ricavo medio giornaliero per camera venduta',
    formula: 'Ricavi camere diviso il numero delle camere occupate',
  },
  RevPAR: {
    term: 'RevPAR',
    description: 'Revenue Per Available Room — ricavo per camera disponibile',
    formula: 'Ricavi camere diviso il numero delle camere disponibili alla vendita',
  },
  TRevPAR: {
    term: 'TRevPAR',
    description: 'Total Revenue Per Available Room — ricavo totale per camera disponibile',
    formula: 'Ricavi totali (camere, F&B, extra) diviso il numero delle camere disponibili',
  },
  occupazione: {
    term: 'Occupazione',
    description: 'Tasso di occupazione',
    formula: 'Camere occupate diviso camere disponibili alla vendita',
  },
  OTB: {
    term: 'OTB',
    description: 'On The Book — quanto è già a libro alla data di analisi',
    formula: 'Somma delle prenotazioni confermate per il periodo, alla data odierna',
  },
  pickup: {
    term: 'Pickup',
    description: 'Prenotazioni acquisite nell’intervallo di osservazione',
    formula: 'Differenza fra l’on the book di oggi e quello della data di confronto',
  },
  forecastGarantito: {
    term: 'Forecast garantito',
    description: 'Previsione basata sulle sole prenotazioni confermate',
    formula: 'On the book confermato del periodo, al netto delle cancellazioni attese',
  },
  forecastOpzionato: {
    term: 'Forecast opzionato',
    description: 'Previsione che include le opzioni non ancora confermate',
    formula: 'Forecast garantito più il valore delle prenotazioni in opzione',
  },
  GOP: {
    term: 'GOP',
    description: 'Gross Operating Profit — margine operativo lordo',
    formula: 'Ricavi totali meno i costi operativi diretti e indiretti',
  },
  GOPPAR: {
    term: 'GOPPAR',
    description: 'Gross Operating Profit Per Available Room — margine per camera disponibile',
    formula: 'GOP diviso il numero delle camere disponibili nel periodo',
  },
  costiFissi: {
    term: 'Costi fissi',
    description: 'Costi che non si muovono con le camere occupate',
    formula: 'Quota fissa di ogni voce di costo, più affitti e ammortamenti',
  },
  costiVariabili: {
    term: 'Costi variabili',
    description: 'Costi che seguono i volumi venduti',
    formula: 'Quota variabile di ogni voce di costo, proporzionale alle camere occupate',
  },
  foodCost: {
    term: 'Food cost',
    description: 'Incidenza delle materie prime sul ricavo F&B',
    formula: 'Costo delle materie prime F&B diviso i ricavi food & beverage',
  },
  incidenzaPersonale: {
    term: 'Costo del personale',
    description: 'Peso del lavoro sui ricavi',
    formula: 'Costo del personale (reparti e amministrazione) diviso i ricavi totali',
  },
  DSO: {
    term: 'DSO',
    description: 'Days Sales Outstanding — tempo medio d’incasso',
    formula: 'Giorni medi fra emissione del documento e incasso, pesati sul fatturato',
  },
  DPO: {
    term: 'DPO',
    description: 'Days Payable Outstanding — tempo medio di pagamento ai fornitori',
    formula: 'Giorni medi fra ricevimento della fattura passiva e pagamento',
  },
  creditoAperto: {
    term: 'Credito aperto',
    description: 'Fatturato emesso e non ancora incassato',
    formula: 'Documenti emessi meno incassi ricevuti, alla data di analisi',
  },
  insoluti: {
    term: 'Insoluti',
    description: 'Credito non rientrato nei termini',
    formula: 'Partite scadute oltre la soglia di tolleranza, da mettere a rischio',
  },
  costoPerCamera: {
    term: 'Costo per camera',
    description: 'Costo sostenuto per ogni camera occupata',
    formula: 'Costi totali diviso il numero delle camere occupate',
  },
  scostamento: {
    term: 'Scostamento',
    description: 'Differenza fra consuntivo e budget',
    formula: 'Valore consuntivato meno valore di budget dello stesso periodo',
  },
  ALOS: {
    term: 'ALOS',
    description: 'Average Length Of Stay — permanenza media',
    formula: 'Numero di notti vendute diviso il numero di prenotazioni',
  },
  leadTime: {
    term: 'Lead time',
    description: 'Anticipo medio di prenotazione',
    formula: 'Media dei giorni fra data di prenotazione e data di arrivo',
  },
  noShow: {
    term: 'No show',
    description: 'Prenotazioni non presentate',
    formula: 'Numero di prenotazioni non presentate diviso il totale delle prenotazioni',
  },
  cancellazioni: {
    term: 'Cancellazioni',
    description: 'Tasso di cancellazione',
    formula: 'Prenotazioni cancellate diviso il totale delle prenotazioni ricevute',
  },
  ranking: {
    term: 'Ranking',
    description: 'Classifica per contributo al valore',
    formula: 'Voci ordinate per ricavo decrescente nel periodo selezionato',
  },
}

/** Voci del glossario per una pagina, nell'ordine dichiarato (ignora le chiavi sconosciute). */
export function glossaryFor(keys: string[]): BiGlossaryEntry[] {
  return keys.map((k) => BI_GLOSSARY[k]).filter(Boolean)
}
