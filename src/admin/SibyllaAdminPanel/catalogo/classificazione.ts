// ─── CLASSIFICAZIONE MERCEOLOGICA ───────────────────────────────────────────────
// Tassonomia a 4 livelli: Area → Categoria → Classe → Tipologia.
// Fonte: Classificazione_Merceologica_Area_Tipologia_categoria.xlsx
//
// Dato STATICO e locale alla pagina Area merceologica: non è collegato allo store
// catalogo (prodotti/fornitori), che resta la fonte del flusso e-commerce di Agorà.

export type Area = 'Prodotti' | 'Servizi'

export interface Classe {
  nome: string
  area: Area
  /** Esempi di tipologia (chip). Vuoto se nel file non erano specificati. */
  tipologie: string[]
}

export interface CategoriaMerceologica {
  id: string
  nome: string
  /** Nome icona Font Awesome (senza prefisso `fa-`), per <Icon>. */
  icon: string
  classi: Classe[]
}

export const CATEGORIE: CategoriaMerceologica[] = [
  {
    id: 'alimenti',
    nome: 'Alimenti',
    icon: 'utensils',
    classi: [
      { nome: 'Condimenti',           area: 'Prodotti', tipologie: ['Olio', 'Aceto', 'Spezie', 'Salse'] },
      { nome: 'Salumi e formaggi',    area: 'Prodotti', tipologie: ['Salumi', 'Formaggi'] },
      { nome: 'Sapori del territorio',area: 'Prodotti', tipologie: ['Prodotti tipici'] },
      { nome: 'Dolci e forno',        area: 'Prodotti', tipologie: ['Pane', 'Biscotti', 'Pasticceria'] },
      { nome: 'Alimenti per animali', area: 'Prodotti', tipologie: ['Cibo secco e umido'] },
    ],
  },
  {
    id: 'soluzioni-energetiche',
    nome: 'Soluzioni energetiche',
    icon: 'bolt',
    classi: [
      { nome: 'Servizi per la gestione dell’energia',          area: 'Servizi', tipologie: ['Audit energetici'] },
      { nome: 'Fonti rinnovabili ed efficientamento energetico',    area: 'Servizi', tipologie: [] },
    ],
  },
  {
    id: 'cancelleria-consumo',
    nome: 'Cancelleria e materiale di consumo',
    icon: 'file-lines',
    classi: [
      { nome: 'Fornitura ufficio',            area: 'Prodotti', tipologie: ['Carta', 'Penne'] },
      { nome: 'Consumabili da copie e stampa', area: 'Prodotti', tipologie: ['Toner', 'Cartucce'] },
    ],
  },
  {
    id: 'informatica-macchinari',
    nome: 'Informatica e macchinari per ufficio',
    icon: 'display',
    classi: [
      { nome: 'Macchine per ufficio',                                  area: 'Prodotti', tipologie: ['Stampanti', 'Scanner'] },
      { nome: 'Computer, tablet e componentistica',                    area: 'Prodotti', tipologie: ['Notebook', 'Tablet'] },
      { nome: 'Sicurezza informatica',                                 area: 'Servizi',  tipologie: [] },
      { nome: 'Videosorveglianza, controllo accessi e antintrusione',  area: 'Servizi',  tipologie: ['Telecamere', 'Allarmi'] },
    ],
  },
  {
    id: 'editoria-eventi-comunicazione',
    nome: 'Editoria, eventi e comunicazione',
    icon: 'bullhorn',
    classi: [
      { nome: 'Libri e prodotti editoriali',  area: 'Prodotti', tipologie: ['Libri', 'Riviste'] },
      { nome: 'Comunicazione e marketing',    area: 'Servizi',  tipologie: [] },
      { nome: 'Fotografia, audio e video',    area: 'Servizi',  tipologie: ['Foto', 'Luci'] },
      { nome: 'Telefonia e reti',             area: 'Servizi',  tipologie: [] },
    ],
  },
  {
    id: 'lavori-manutenzione',
    nome: 'Lavori di manutenzione',
    icon: 'wrench',
    classi: [
      { nome: 'Opere generali',      area: 'Servizi', tipologie: [] },
      { nome: 'Opere specializzate', area: 'Servizi', tipologie: [] },
    ],
  },
  {
    id: 'edilizia-impianti',
    nome: 'Edilizia e impianti',
    icon: 'trowel-bricks',
    classi: [
      { nome: 'Ferramenta idraulica ed edilizia', area: 'Prodotti', tipologie: ['Utensili'] },
      { nome: 'Riscaldamento e condizionamento',  area: 'Prodotti', tipologie: ['Caldaie', 'Climatizzatori'] },
      { nome: 'Materiale da restauro',            area: 'Prodotti', tipologie: [] },
      { nome: 'Materiale elettrico',              area: 'Prodotti', tipologie: ['Cavi', 'Interruttori'] },
    ],
  },
  {
    id: 'attrezzature-abbigliamento',
    nome: 'Attrezzature e abbigliamento',
    icon: 'helmet-safety',
    classi: [
      { nome: 'Attrezzature per la sicurezza sul lavoro', area: 'Prodotti', tipologie: ['DPI', 'Caschi', 'Scarpe'] },
      { nome: 'Indumenti generici',                       area: 'Prodotti', tipologie: ['Abbigliamento tecnico'] },
      { nome: 'Attrezzature varie',                       area: 'Prodotti', tipologie: ['Utensili'] },
    ],
  },
  {
    id: 'ricerca-welfare-benefit',
    nome: 'Ricerca, welfare e benefit',
    icon: 'hand-holding-heart',
    classi: [
      { nome: 'Benefit sanitari', area: 'Servizi', tipologie: ['Assicurazioni'] },
      { nome: 'Benefit sportivi', area: 'Servizi', tipologie: ['Palestre'] },
      { nome: 'Buoni pasto',      area: 'Servizi', tipologie: [] },
      { nome: 'Formazione',       area: 'Servizi', tipologie: ['Corsi'] },
    ],
  },
  {
    id: 'arredi-elettrodomestici',
    nome: 'Arredi ed elettrodomestici',
    icon: 'couch',
    classi: [
      { nome: 'Arredi per interni ed esterni',      area: 'Prodotti', tipologie: ['Sedute', 'Tavoli'] },
      { nome: 'Segnaletica da interno ed esterno',  area: 'Prodotti', tipologie: ['Cartellonistica'] },
      { nome: 'Elettrodomestici',                   area: 'Prodotti', tipologie: [] },
    ],
  },
  {
    id: 'bevande',
    nome: 'Bevande',
    icon: 'wine-glass',
    classi: [
      { nome: 'Bibite analcoliche', area: 'Prodotti', tipologie: [] },
      { nome: 'Birra',              area: 'Prodotti', tipologie: ['Industriali', 'Artigianali'] },
      { nome: 'Vino',               area: 'Prodotti', tipologie: ['Rossi', 'Bianchi', 'Rosati', 'Spumanti e Champagne'] },
      { nome: 'Acqua',              area: 'Prodotti', tipologie: ['Naturale', 'Frizzante'] },
      { nome: 'Caffetteria',        area: 'Prodotti', tipologie: ['Caffè', 'Tè', 'Infusi', 'Cioccolata'] },
    ],
  },
  {
    id: 'design-manifattura',
    nome: 'Design e manifattura',
    icon: 'palette',
    classi: [
      { nome: 'Artigianato',             area: 'Prodotti', tipologie: ['Ceramica e vetro', 'Tessile e ricamo'] },
      { nome: 'Interior design',         area: 'Prodotti', tipologie: ['Oggettistica', 'Illuminazione'] },
      { nome: 'Produzione personalizzata', area: 'Prodotti', tipologie: ['Lavorazioni tradizionali'] },
    ],
  },
  {
    id: 'sapori',
    nome: 'Sapori',
    icon: 'plate-utensils',
    classi: [
      { nome: 'Osteria',       area: 'Servizi', tipologie: [] },
      { nome: 'Gourmet',       area: 'Servizi', tipologie: [] },
      { nome: 'Internazionale', area: 'Servizi', tipologie: [] },
    ],
  },
  {
    id: 'soggiorni',
    nome: 'Soggiorni',
    icon: 'bed',
    classi: [
      { nome: 'Hotel',        area: 'Servizi', tipologie: ['3, 4, 5 stelle'] },
      { nome: 'Appartamenti', area: 'Servizi', tipologie: ['Lusso', 'Economy'] },
      { nome: 'B&B',          area: 'Servizi', tipologie: [] },
    ],
  },
  {
    id: 'esperienze',
    nome: 'Esperienze',
    icon: 'ticket',
    classi: [
      { nome: 'Adrenalina',  area: 'Servizi', tipologie: [] },
      { nome: 'Eventi',      area: 'Servizi', tipologie: ['Concerti', 'Spettacoli'] },
      { nome: 'Tour & musei', area: 'Servizi', tipologie: [] },
    ],
  },
  {
    id: 'servizi',
    nome: 'Servizi',
    icon: 'bell-concierge',
    classi: [
      { nome: 'Ticketing & trasporti', area: 'Servizi', tipologie: [] },
      { nome: 'Deposito bagagli',      area: 'Servizi', tipologie: [] },
      { nome: 'Noleggio',              area: 'Servizi', tipologie: ['Auto', 'Bike'] },
    ],
  },
]

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Aree presenti tra le classi di una categoria (ordine fisso: Prodotti, Servizi). */
export function areeOf(cat: CategoriaMerceologica): Area[] {
  const set = new Set(cat.classi.map(c => c.area))
  return (['Prodotti', 'Servizi'] as Area[]).filter(a => set.has(a))
}

export function getCategoria(id: string): CategoriaMerceologica | undefined {
  return CATEGORIE.find(c => c.id === id)
}

/** Slug stabile di una classe (per routing: prodotti-classe:<catId>__<classeSlug>). */
export function classeSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getClasse(catId: string, slug: string): { categoria: CategoriaMerceologica; classe: Classe } | undefined {
  const categoria = getCategoria(catId)
  if (!categoria) return undefined
  const classe = categoria.classi.find(cl => classeSlug(cl.nome) === slug)
  return classe ? { categoria, classe } : undefined
}
