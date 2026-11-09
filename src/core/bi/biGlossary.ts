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
  budget: {
    term: 'Budget',
    description: 'Obiettivo economico fissato prima dell’anno',
    formula: 'Consuntivo dello stesso periodo dell’anno precedente più l’obiettivo di crescita',
  },
  CostPAR: {
    term: 'CostPAR',
    description: 'Cost Per Available Room — costo per camera disponibile',
    formula: 'Costi totali diviso il numero delle camere disponibili nel periodo',
  },
  atterraggio: {
    term: 'Atterraggio',
    description: 'Chiusura attesa dell’anno: mesi consuntivati più previsione dei mesi restanti',
    formula: 'Somma dei mesi chiusi più la previsione dei mesi ancora da consuntivare',
  },
  OOO: {
    term: 'OOO',
    description: 'Out Of Order — camere fuori servizio, non vendibili',
    formula: 'Camere non disponibili alla vendita per guasto o lavori, in media giornaliera',
  },
  manutenzione: {
    term: 'In manutenzione',
    description: 'Camere ferme per interventi programmati o guasti in lavorazione',
    formula: 'Camere in manutenzione diviso le camere totali, in media giornaliera nel periodo',
  },
  indisponibilita: {
    term: 'Tasso di indisponibilità',
    description: 'Quota di camere non vendibili',
    formula: 'Camere fuori servizio o in manutenzione diviso le camere totali, in media giornaliera nel periodo',
  },
  SLA: {
    term: 'SLA',
    description: 'Service Level Agreement — tempo massimo di intervento concordato',
    formula: 'Quota di interventi chiusi entro il tempo previsto dalla loro priorità',
  },
  MTTR: {
    term: 'MTTR',
    description: 'Mean Time To Repair — tempo medio di chiusura di un intervento',
    formula: 'Somma delle ore di lavorazione diviso il numero di interventi chiusi',
  },
  pace: {
    term: 'Pace',
    description: 'Ritmo di riempimento rispetto all\'anno precedente',
    formula: 'Ricavo (o camere) a libro oggi confrontato con quello a libro l\'anno scorso alla stessa distanza dall\'arrivo',
  },
  presenze: {
    term: 'Presenze',
    description: 'Notti trascorse dagli ospiti in struttura',
    formula: 'Somma, giorno per giorno, degli ospiti in casa (un ospite per tre notti = 3 presenze)',
  },
  ripetenti: {
    term: 'Ospiti ripetenti',
    description: 'Ospiti che erano già stati in struttura',
    formula: 'Ospiti arrivati con almeno un soggiorno precedente diviso il totale degli ospiti arrivati',
  },
  revGuest: {
    term: 'Ricavo per ospite',
    description: 'Quanto rende in media ogni ospite arrivato',
    formula: 'Ricavi camere più servizi extra diviso il numero di ospiti arrivati',
  },
  upsell: {
    term: 'Upsell',
    description: 'Vendita di servizi in più rispetto alla camera prenotata',
    formula: 'Ricavo dei servizi extra (upgrade, late check-out, spa, parcheggio, transfer) nel periodo',
  },
  upgrade: {
    term: 'Upgrade',
    description: 'Passaggio a una tipologia di camera superiore',
    formula: 'Venduto: pagato dall\'ospite. Concesso: gratuito, per fidelizzazione o per riassetto dell\'inventario',
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

  // ── Human Resources ──
  organico: {
    term: 'Organico',
    description: 'Dipendenti in forza',
    formula: 'Rapporti di lavoro attivi a fine periodo, qualunque sia il contratto (indeterminato, determinato, stagionale)',
  },
  RAL: {
    term: 'RAL',
    description: 'Retribuzione annua lorda',
    formula: 'Somma delle mensilità lorde dell’anno (tredicesima e quattordicesima comprese), prima di tasse e contributi a carico del dipendente',
  },
  CCNL: {
    term: 'CCNL',
    description: 'Contratto collettivo nazionale di lavoro',
    formula: 'Per il turismo fissa livelli, minimi retributivi, scatti di anzianità e orario: il livello del dipendente ne determina la paga base',
  },
  straordinari: {
    term: 'Straordinari',
    description: 'Ore lavorate oltre l’orario del contratto',
    formula: 'Ore registrate in presenza oltre quelle contrattuali; la quota si calcola sulle ore da contratto del periodo',
  },
  compliance: {
    term: 'Compliance',
    description: 'Formazione obbligatoria in regola',
    formula: 'Corsi obbligatori validi o in scadenza diviso i corsi richiesti dal ruolo (sicurezza, antincendio, primo soccorso, privacy e specifici di reparto)',
  },
  premioRisultato: {
    term: 'Premio di risultato',
    description: 'Bonus legato agli obiettivi',
    formula: 'Raggiungimento ponderato degli obiettivi (risultato, soddisfazione ospiti, presenza) applicato al premio massimo; sotto il 50% non matura',
  },
  turnover: {
    term: 'Turnover',
    description: 'Ricambio del personale',
    formula: 'Cessazioni del periodo diviso l’organico medio del periodo',
  },
  assenteismo: {
    term: 'Assenteismo',
    description: 'Peso delle assenze non programmate',
    formula: 'Ore di assenza non programmata (malattia, permessi non pianificati) diviso le ore lavorabili',
  },

  // ── Food & Beverage ──
  RevPASH: {
    term: 'RevPASH',
    description: 'Revenue Per Available Seat Hour',
    formula: 'Ricavo del servizio diviso (posti a sedere × ore di apertura)',
  },
  scontrinoMedio: {
    term: 'Scontrino medio',
    description: 'Spesa media per coperto servito',
    formula: 'Ricavo del servizio diviso il numero di coperti serviti',
  },
  rotazione: {
    term: 'Rotazione',
    description: 'Quante volte un tavolo viene rioccupato nel servizio',
    formula: 'Comande chiuse e aperte nel turno diviso il numero di tavoli in servizio',
  },
  occupazioneCoperti: {
    term: 'Occupazione coperti',
    description: 'Quota di posti a sedere effettivamente occupati',
    formula: 'Coperti serviti diviso i coperti disponibili nel turno',
  },
  margineLordo: {
    term: 'Margine lordo',
    description: 'Quanto resta dei conti dopo la materia prima',
    formula: 'Incasso dei conti meno il food cost dei piatti serviti (schede tecniche)',
  },
  marginePerCoperto: {
    term: 'Margine per coperto',
    description: 'Valore che ogni ospite lascia al ristorante, al netto della materia prima',
    formula: 'Margine lordo diviso il numero di coperti serviti',
  },
}

/** Voci del glossario per una pagina, nell'ordine dichiarato (ignora le chiavi sconosciute). */
export function glossaryFor(keys: string[]): BiGlossaryEntry[] {
  return keys.map((k) => BI_GLOSSARY[k]).filter(Boolean)
}
