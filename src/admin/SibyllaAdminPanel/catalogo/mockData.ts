import type { Categoria, DatiAppalto, Fornitore, Prodotto, UnitaMisura } from './types'
import { CATEGORIE, areeOf } from './classificazione'
import { ean13FromBase } from './helpers'

export const MACRO_AREE = [
  { id: 'prodotti',        label: 'Prodotti' },
  { id: 'servizi',         label: 'Servizi' },
  { id: 'vini-bevande',    label: 'Vini e Bevande' },
  { id: 'alimentari',      label: 'Alimentari e Gastronomia' },
  { id: 'prodotti-tipici', label: 'Prodotti Tipici DOP/IGP' },
  { id: 'cereali-pasta',   label: 'Cereali e Pasta' },
  { id: 'bio-certificati', label: 'Bio e Certificati' },
  { id: 'pulizie',         label: 'Pulizie e Igiene' },
  { id: 'cancelleria',     label: 'Cancelleria' },
  { id: 'manutenzione',    label: 'Manutenzione' },
  { id: 'arredi',          label: 'Arredi' },
  { id: 'energia',         label: 'Energia' },
  { id: 'rifiuti',         label: 'Rifiuti' },
  { id: 'informatica',     label: 'Informatica ed Elettronica' },
  { id: 'editoria-eventi', label: 'Editoria, Eventi e Comunicazione' },
  { id: 'welfare',         label: 'Welfare e Benefit' },
]

export const ICON_OPTIONS = [
  'fa-utensils', 'fa-bolt', 'fa-file-lines', 'fa-display', 'fa-shirt',
  'fa-wrench', 'fa-bed', 'fa-gear', 'fa-spray-can-sparkles', 'fa-boxes-stacked',
  'fa-briefcase', 'fa-truck', 'fa-wine-bottle', 'fa-award', 'fa-wheat-awn',
  'fa-apple-whole', 'fa-building',
]

export const UNITA_MISURA_OPTIONS: Array<{ value: UnitaMisura; label: string }> = [
  { value: 'pz',    label: 'Pezzo' },
  { value: 'kg',    label: 'Chilogrammo (kg)' },
  { value: 'g',     label: 'Grammo (g)' },
  { value: 'l',     label: 'Litro (l)' },
  { value: 'ml',    label: 'Millilitro (ml)' },
  { value: 'cassa', label: 'Cassa' },
  { value: 'box',   label: 'Box' },
  { value: 'conf',  label: 'Confezione' },
]

// ─── SEED DERIVATO DALLA CLASSIFICAZIONE ─────────────────────────────────────
// CATEGORIE / FORNITORI / PRODOTTI demo sono generati dalla tassonomia
// (Area → Categoria → Classe → Tipologia) in classificazione.ts, così il
// catalogo, l'inserimento prodotti e il flusso d'acquisto restano allineati.

const round2 = (n: number) => Math.round(n * 100) / 100

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Nome del fornitore di riferimento per categoria (demo).
const FORNITORE_PER_CATEGORIA: Record<string, string> = {
  'alimenti':                     'Granaio del Sud',
  'soluzioni-energetiche':        'EnerGreen Solutions',
  'cancelleria-consumo':          'UfficioPiù',
  'informatica-macchinari':       'TecnoStore Pro',
  'editoria-eventi-comunicazione':'MediaLab Comunicazione',
  'lavori-manutenzione':          'Manutenzioni Integrate',
  'edilizia-impianti':            'EdilCasa Forniture',
  'attrezzature-abbigliamento':   'SafeWork Equip',
  'ricerca-welfare-benefit':      'Welfare Partners',
  'arredi-elettrodomestici':      'CasaDesign Arredi',
  'bevande':                      'Cantine & Bollicine',
  'design-manifattura':           'Manifattura Italiana',
  'sapori':                       'Tavola Tipica',
  'soggiorni':                    'Ospitalità Network',
  'esperienze':                   'Experience Maker',
  'servizi':                      'ServiziPiù',
}

function macroAreaOf(catId: string): string {
  const cat = CATEGORIE.find(c => c.id === catId)
  return cat && areeOf(cat)[0] === 'Servizi' ? 'servizi' : 'prodotti'
}

// ─── CATEGORIE_INIT ──────────────────────────────────────────────────────────
export const CATEGORIE_INIT: Categoria[] = CATEGORIE.map((cat) => ({
  id: cat.id,
  nome: cat.nome,
  icona: `fa-${cat.icon}`,
  descrizione: cat.classi.map(c => c.nome).join(' · '),
  macroArea: macroAreaOf(cat.id),
}))

// ─── FORNITORI_INIT ──────────────────────────────────────────────────────────
export const FORNITORI_INIT: Fornitore[] = CATEGORIE.map((cat) => {
  const nome = FORNITORE_PER_CATEGORIA[cat.id] ?? `Fornitore ${cat.nome}`
  const slug = slugify(nome)
  return {
    id: `forn-${cat.id}`,
    nome,
    descrizione: `Fornitore di riferimento per ${cat.nome}.`,
    storia: '',
    indirizzo: 'Via Roma 1',
    citta: 'Milano',
    regione: 'Lombardia',
    cap: '20100',
    telefono: '+39 02 0000000',
    email: `info@${slug}.it`,
    sito: `www.${slug}.it`,
    annoFondazione: 2005,
    certificazioni: [],
    caratteristiche: areeOf(cat),
    categoriaId: cat.id,
    macroArea: macroAreaOf(cat.id),
    immagineUrl: '',
    pubblicato: true,
  }
})

// ─── PRODOTTI_INIT ───────────────────────────────────────────────────────────
// Un prodotto per ogni Tipologia; per le classi senza tipologie, un prodotto
// che rappresenta la classe stessa.
export const PRODOTTI_INIT: Prodotto[] = (() => {
  const out: Prodotto[] = []
  let counter = 0
  for (const cat of CATEGORIE) {
    cat.classi.forEach((classe, cli) => {
      const tipologie = classe.tipologie.length > 0 ? classe.tipologie : ['']
      tipologie.forEach((tip, ti) => {
        counter += 1
        const prezzoBase = round2(6.9 + ((counter * 7) % 90))
        out.push({
          id: `prod-${cat.id}-${cli}-${ti}`,
          barcode: ean13FromBase(800000000000 + counter),
          nome: tip || classe.nome,
          descrizione: `${classe.nome}${tip ? ` · ${tip}` : ''} — ${cat.nome}.`,
          categoriaId: cat.id,
          classe: classe.nome,
          tipologia: tip,
          fornitoreId: `forn-${cat.id}`,
          prezzoBase,
          unita: 'pz',
          quantitaUnita: 1,
          immagineUrl: '',
          scortaMinima: 5,
          attivo: true,
          mercati: {
            agora:   { abilitato: true, prezzoVendita: round2(prezzoBase * 1.35) },
            network: { abilitato: true, prezzoVendita: round2(prezzoBase * 1.20) },
          },
          pubblicato: true,
        })
      })
    })
  }
  return out
})()

// ─── Fornitori di servizi in appalto ─────────────────────────────────────────
// Ditte esterne i cui addetti lavorano in struttura (pulizie, manutenzione,
// facchinaggio): in HR › Collaboratori esterni si registrano gli addetti e li
// si invita all'App Op! nel reparto operativo della loro categoria.
const appalto = (id: string, nome: string, descrizione: string, citta: string, regione: string, caratteristiche: string[], dati: Partial<DatiAppalto> = {}): Fornitore => {
  const slug = slugify(nome)
  const datiAppalto: DatiAppalto = {
    ragioneSociale: nome, partitaIva: '', codiceFiscale: '', sedeLegale: `Via dell’Industria 12, ${citta}`, oggetto: descrizione,
    referente: '', referenteTelefono: '', referenteEmail: '', contrattoNumero: '', contrattoData: '', contrattoScadenza: '',
    durcScadenza: '', posizioneInps: '', posizioneInail: '', subappalto: false, subappaltoAutorizzazione: '', ...dati,
  }
  return {
    datiAppalto,
    id, nome, descrizione, storia: '', indirizzo: 'Via dell’Industria 12', citta, regione, cap: '00100',
    telefono: '+39 06 0000000', email: `commerciale@${slug}.it`, sito: `www.${slug}.it`, annoFondazione: 2008,
    certificazioni: ['ISO 9001', 'ISO 14001'], caratteristiche, categoriaId: '', macroArea: 'servizi',
    immagineUrl: '', pubblicato: true, appalto: true,
  }
}

export const FORNITORI_APPALTO_INIT: Fornitore[] = [
  appalto('forn-app-splendor', 'Splendor Servizi Integrati', 'Pulizie camere, aree comuni e lavanderia in appalto.', 'Roma', 'Lazio',
    ['Pulizie camere e aree comuni', 'Lavanderia e guardaroba', 'Personale formato HACCP'],
    { ragioneSociale: 'Splendor Servizi Integrati S.r.l.', partitaIva: '09876543210', codiceFiscale: '09876543210', referente: 'Laura Fabbri', referenteTelefono: '+39 06 5550101',
      referenteEmail: 'l.fabbri@splendorservizi.it', contrattoNumero: 'APP-2026/014', contrattoData: '2026-02-15', contrattoScadenza: '2027-02-28', durcScadenza: '2027-01-15',
      posizioneInps: '7012345678', posizioneInail: '12345678/90',
      duvri: { dovuto: true, allegato: { nome: 'DUVRI_Splendor_rev2.pdf' }, dataRedazione: '2026-02-10', dataSottoscrizione: '2026-02-15', revisione: '2',
        prossimoAggiornamento: '2027-02-15', costiSicurezza: 1850, esenzione: '', incaricatoCoordinamento: '' },
      idoneita: { visura: { nome: 'visura_splendor.pdf' }, visuraData: '2026-10-01', autocertificazione: { nome: 'autocert_art26_splendor.pdf' }, autocertificazioneData: '2026-02-12' },
      informativaRischi: { allegato: { nome: 'informativa_rischi_emergenze_2026.pdf' }, dataConsegna: '2026-02-15', presaVisioneData: '2026-02-16', presaVisioneFirmatario: 'Laura Fabbri' },
      fisco: { art17bis: true, durf: { nome: 'durf_splendor_2026.pdf' }, durfScadenza: '2027-01-31', pagamenti: [
        { id: 'pag-s1', periodo: '2026-08', fattura: 'FT 2026/412', importo: 18450, dataPagamento: '2026-09-30', durcVerificato: true },
        { id: 'pag-s2', periodo: '2026-09', fattura: 'FT 2026/468', importo: 17980, dataPagamento: '2026-10-31', durcVerificato: true },
        { id: 'pag-s3', periodo: '2026-10', fattura: 'FT 2026/521', importo: 18200, dataPagamento: '', durcVerificato: false },
      ] },
      privacy: { informativa: { nome: 'informativa_privacy_esterni.pdf' }, informativaData: '2026-02-20', responsabileNecessario: true, accordo: { nome: 'accordo_art28_splendor.pdf' }, accordoData: '2026-02-15' } }),
  appalto('forn-app-tecnoimpianti', 'Tecno Impianti Hotel', 'Manutenzione ordinaria e straordinaria di impianti e camere.', 'Roma', 'Lazio',
    ['Impianti elettrici e idraulici', 'Climatizzazione', 'Pronto intervento 24/7'],
    { ragioneSociale: 'Tecno Impianti Hotel S.p.A.', partitaIva: '01234567890', codiceFiscale: '01234567890', referente: 'Marco Serra', referenteTelefono: '+39 06 5550202',
      referenteEmail: 'm.serra@tecnoimpiantihotel.it', contrattoNumero: 'APP-2025/031', contrattoData: '2025-12-10', contrattoScadenza: '2026-12-31', durcScadenza: '2026-11-22',
      posizioneInps: '7023456789', posizioneInail: '23456789/01',
      duvri: { dovuto: true, allegato: { nome: 'DUVRI_TecnoImpianti_rev1.pdf' }, dataRedazione: '2025-12-01', dataSottoscrizione: '', revisione: '1',
        prossimoAggiornamento: '2026-11-20', costiSicurezza: 2400, esenzione: '', incaricatoCoordinamento: '' },
      idoneita: { visura: { nome: 'visura_tecnoimpianti.pdf' }, visuraData: '2025-11-28', autocertificazioneData: '' } }),
  appalto('forn-app-movi', 'Movi Facchinaggio', 'Facchinaggio, movimentazione bagagli e allestimenti sale.', 'Fiumicino', 'Lazio',
    ['Facchinaggio ai piani', 'Allestimento sale meeting', 'Gestione magazzino'],
    { ragioneSociale: 'Movi Facchinaggio Soc. Coop.', partitaIva: '05554443332', codiceFiscale: '05554443332', referente: 'Paolo Rinaldi', referenteTelefono: '+39 06 5550303',
      contrattoNumero: 'APP-2026/022', contrattoData: '2026-04-20', contrattoScadenza: '2026-10-31', durcScadenza: '2026-09-30',
      subappalto: true, subappaltoAutorizzazione: 'Autorizzazione al subappalto n. 7/2026 del 22/04/2026 (appaltatore principale: Splendor Servizi Integrati)',
      duvri: { dovuto: true, dataRedazione: '', dataSottoscrizione: '', revisione: '', prossimoAggiornamento: '', costiSicurezza: 0, esenzione: '', incaricatoCoordinamento: '' },
      idoneita: { visuraData: '', autocertificazioneData: '' } }),
]

