import type { Categoria, Fornitore, Prodotto, UnitaMisura } from './types'
import { CATEGORY_MAPPING, NEWAGORA_CATEGORIES } from './newagoraSeed'

export const MACRO_AREE = [
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

// ─── CATEGORIE_INIT ──────────────────────────────────────────────────────────
// Derivate dal dataset Newagora copiato in newagoraSeed.ts.
// La descrizione è derivata dalle "classes" della categoria (titoli concatenati).
export const CATEGORIE_INIT: Categoria[] = Object.entries(NEWAGORA_CATEGORIES)
  .map(([key, cat]) => {
    const map = CATEGORY_MAPPING[Number(key)]
    return {
      id: map.id,
      nome: cat.name,
      icona: map.icona,
      descrizione: cat.classes.map(c => c.title).join(' · '),
      macroArea: map.macroArea,
    }
  })

// helper: slug del nome fornitore (per id stabile)
function slugifySupplier(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── FORNITORI_INIT ──────────────────────────────────────────────────────────
// Derivati dal dataset Newagora — un fornitore può comparire in più categorie:
// la versione "primaria" è la prima occorrenza incontrata nell'iterazione,
// le altre vengono aggiunte come tag in `caratteristiche`.
export const FORNITORI_INIT: Fornitore[] = (() => {
  const byName = new Map<string, Fornitore>()
  for (const [key, cat] of Object.entries(NEWAGORA_CATEGORIES)) {
    const map = CATEGORY_MAPPING[Number(key)]
    for (const supplierName of cat.suppliers) {
      if (byName.has(supplierName)) {
        // multi-categoria: aggiungo la categoria come caratteristica informativa
        const existing = byName.get(supplierName)!
        if (!existing.caratteristiche.includes(`Anche in: ${cat.name}`)) {
          existing.caratteristiche.push(`Anche in: ${cat.name}`)
        }
        continue
      }
      byName.set(supplierName, {
        id: `newa-forn-${slugifySupplier(supplierName)}`,
        nome: supplierName,
        descrizione: `Fornitore presente nel catalogo ${cat.name}`,
        storia: '',
        indirizzo: '',
        citta: '',
        regione: '',
        cap: '',
        telefono: '',
        email: '',
        sito: '',
        annoFondazione: 0,
        certificazioni: [],
        caratteristiche: [],
        categoriaId: map.id,
        macroArea: map.macroArea,
        immagineUrl: '',
        pubblicato: true,
      })
    }
  }
  return Array.from(byName.values())
})()

// ─── PRODOTTI_INIT ───────────────────────────────────────────────────────────
// Prodotti demo agganciati a fornitori reali del seed Newagora.
// Servono per dimostrare i due mercati Agorà/Network e la lettura via barcode.
export const PRODOTTI_INIT: Prodotto[] = [
  {
    id: 'prod-1',
    barcode: '8001234567890',
    nome: 'Pasta di semola di grano duro 500g',
    descrizione: 'Spaghetti n.5, formato classico, confezione da 500g',
    categoriaId: 'newa-cat-1',
    fornitoreId: 'newa-forn-barilla',
    prezzoBase: 0.78,
    unita: 'pz',
    quantitaUnita: 1,
    immagineUrl: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400',
    scortaMinima: 50,
    attivo: true,
    pubblicato: true,
    mercati: {
      agora:   { abilitato: true, prezzoVendita: 1.49 },
      network: { abilitato: true, prezzoVendita: 1.19 },
    },
  },
  {
    id: 'prod-2',
    barcode: '8001234567906',
    nome: 'Risma carta A4 80g — 500 fogli',
    descrizione: 'Carta multifunzione 80g/m², adatta per stampanti laser e inkjet',
    categoriaId: 'newa-cat-3',
    fornitoreId: 'newa-forn-fabriano',
    prezzoBase: 3.20,
    unita: 'conf',
    quantitaUnita: 500,
    immagineUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400',
    scortaMinima: 10,
    attivo: true,
    pubblicato: true,
    mercati: {
      agora:   { abilitato: false, prezzoVendita: 0 },
      network: { abilitato: true,  prezzoVendita: 4.90 },
    },
  },
  {
    id: 'prod-3',
    barcode: '8001234567913',
    nome: 'Detergente disinfettante multiuso 5L',
    descrizione: 'Detergente igienizzante professionale concentrato per superfici',
    categoriaId: 'newa-cat-9',
    fornitoreId: 'newa-forn-lysoform',
    prezzoBase: 8.50,
    unita: 'l',
    quantitaUnita: 5,
    immagineUrl: 'https://images.unsplash.com/photo-1583947581924-860bda3c6730?w=400',
    scortaMinima: 6,
    attivo: true,
    pubblicato: true,
    mercati: {
      agora:   { abilitato: true,  prezzoVendita: 13.90 },
      network: { abilitato: true,  prezzoVendita: 11.50 },
    },
  },
]
