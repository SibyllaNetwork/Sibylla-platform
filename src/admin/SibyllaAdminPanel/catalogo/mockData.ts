import type { Categoria, Fornitore, Prodotto, UnitaMisura } from './types'
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
