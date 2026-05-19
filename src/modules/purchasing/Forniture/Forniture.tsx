import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Pagination from '../../../core/components/Pagination'
import { SearchField, SelectField } from '../../../core/components/form'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import './Forniture.sass'

type SortKey = 'name-asc' | 'name-desc' | 'products-desc' | 'products-asc'

interface SupplierProduct {
  id: string
  name: string
  category: string
  price: number
  image: string
}

interface Supplier {
  id: string
  name: string
  description: string
  history: string
  address: string
  city: string
  region: string
  zipCode: string
  phone: string
  email: string
  website: string
  foundedYear: number
  certifications: string[]
  characteristics: string[]
  productsCount: number
  categories: string[]
  image: string
  macroArea: string
  products: SupplierProduct[]
}

interface MacroArea {
  id: string
  label: string
  icon: string
}

const MACRO_AREAS: MacroArea[] = [
  { id: 'all',             label: 'Tutti',                    icon: 'fa-building' },
  { id: 'vini-bevande',    label: 'Vini e Bevande',           icon: 'fa-wine-bottle' },
  { id: 'alimentari',      label: 'Alimentari e Gastronomia', icon: 'fa-utensils' },
  { id: 'prodotti-tipici', label: 'Prodotti Tipici DOP/IGP',  icon: 'fa-award' },
  { id: 'cereali-pasta',   label: 'Cereali e Pasta',          icon: 'fa-wheat-awn' },
  { id: 'bio-certificati', label: 'Bio e Certificati',        icon: 'fa-apple-whole' },
]

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',      label: 'Nome (A → Z)' },
  { value: 'name-desc',     label: 'Nome (Z → A)' },
  { value: 'products-desc', label: 'Più prodotti prima' },
  { value: 'products-asc',  label: 'Meno prodotti prima' },
]

const PAGE_SIZE = 12

const SUPPLIERS: Supplier[] = [
  {
    id: 'cantina-toscana', macroArea: 'vini-bevande',
    name: 'Cantina Toscana del Chianti',
    description: 'Produttore storico di vini pregiati toscani dal 1872',
    history: "Fondata nel 1872 dalla famiglia Bianchi, la Cantina Toscana del Chianti rappresenta oltre 150 anni di tradizione vinicola. Situata nel cuore del Chianti Classico, l'azienda si estende su 80 ettari di vigneti coltivati con metodi sostenibili. Attraverso cinque generazioni, la cantina ha mantenuto viva la tradizione combinandola con tecniche moderne di vinificazione.",
    address: 'Via dei Vigneti, 45', city: 'Greve in Chianti', region: 'Toscana', zipCode: '50022',
    phone: '+39 055 854 2100', email: 'info@cantinatoscana.it', website: 'www.cantinatoscana.it',
    foundedYear: 1872,
    certifications: ['DOCG Chianti Classico', 'Biologico Certificato', 'Vegan OK'],
    characteristics: [
      '80 ettari di vigneti di proprietà',
      'Produzione annuale: 400.000 bottiglie',
      'Cantina storica del 1872 ristrutturata',
      'Sala degustazione con vista sui vigneti',
      'Visite guidate e wine tasting',
    ],
    productsCount: 24, categories: ['Vini e Bevande', 'Prodotti Tipici'],
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200',
    products: [
      { id: '1', name: 'Chianti Classico DOCG Riserva 2019', category: 'Vini Rossi',   price: 24.9, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400' },
      { id: '2', name: 'Vernaccia di San Gimignano DOCG',     category: 'Vini Bianchi', price: 16.5, image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400' },
      { id: '3', name: 'Super Tuscan IGT',                    category: 'Vini Rossi',   price: 32.0, image: 'https://images.unsplash.com/photo-1574285013029-29296a71930e?w=400' },
      { id: '4', name: 'Vin Santo del Chianti DOC',           category: 'Vini Dessert', price: 28.9, image: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400' },
    ],
  },
  {
    id: 'caseificio-alpino', macroArea: 'prodotti-tipici',
    name: 'Caseificio Alpino Tradizionale',
    description: "Formaggi DOP e prodotti lattiero-caseari d'eccellenza",
    history: "Il Caseificio Alpino Tradizionale nasce nel 1965 ai piedi delle Alpi piemontesi. La cooperativa riunisce 25 allevatori locali che conferiscono latte di altissima qualità proveniente da bovine al pascolo. Ogni formaggio è frutto di ricette tramandate di generazione in generazione, con l'utilizzo esclusivo di latte crudo e fermenti naturali.",
    address: 'Strada delle Langhe, 12', city: 'Bra', region: 'Piemonte', zipCode: '12042',
    phone: '+39 0172 431 890', email: 'info@caseificioalpino.it', website: 'www.caseificioalpino.it',
    foundedYear: 1965,
    certifications: ['DOP Raschera', 'DOP Castelmagno', 'Presidio Slow Food'],
    characteristics: [
      'Cooperativa di 25 allevatori locali',
      'Lavorazione artigianale del latte crudo',
      'Stagionatura in grotte naturali',
      'Produzione media: 500 forme al giorno',
      'Caseificio visitabile con laboratorio didattico',
    ],
    productsCount: 18, categories: ['Alimentari', 'Prodotti Tipici'],
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200',
    products: [
      { id: '5', name: 'Raschera DOP Stagionato 6 mesi', category: 'Formaggi',         price: 18.5, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400' },
      { id: '6', name: "Castelmagno DOP d'Alpeggio",     category: 'Formaggi',         price: 32.0, image: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400' },
      { id: '7', name: 'Ricotta Fresca di Montagna',     category: 'Formaggi Freschi', price: 8.9,  image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400' },
      { id: '8', name: 'Burro di Centrifuga Artigianale', category: 'Latticini',       price: 12.5, image: 'https://images.unsplash.com/photo-1589881133595-c7f8c1801e81?w=400' },
    ],
  },
  {
    id: 'pastificio-artigiano', macroArea: 'cereali-pasta',
    name: 'Pastificio Artigiano Napoletano',
    description: 'Pasta fresca e secca di alta qualità dal 1920',
    history: 'Dal 1920 il Pastificio Artigiano Napoletano produce pasta nel rispetto della tradizione di Gragnano, patria della pasta italiana. Situato nella "Valle dei Mulini", l\'azienda utilizza esclusivamente grano duro 100% italiano, acqua purissima delle sorgenti del Vesuvio e antiche trafile in bronzo.',
    address: 'Via dei Pastai, 78', city: 'Gragnano', region: 'Campania', zipCode: '80054',
    phone: '+39 081 879 3200', email: 'ordini@pastificioartigiano.it', website: 'www.pastificioartigiano.it',
    foundedYear: 1920,
    certifications: ['IGP Pasta di Gragnano', 'Certificazione Biologica', 'Made in Italy 100%'],
    characteristics: [
      'Trafilatura al bronzo con trafile storiche',
      'Essiccazione lenta a bassa temperatura',
      'Grano duro 100% italiano selezionato',
      'Oltre 60 formati di pasta prodotti',
      'Laboratorio visitabile su prenotazione',
    ],
    productsCount: 32, categories: ['Alimentari'],
    image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=1200',
    products: [
      { id: '9',  name: 'Paccheri IGP Gragnano',             category: 'Pasta Secca',     price: 4.9, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400' },
      { id: '10', name: 'Linguine al Bronzo',                category: 'Pasta Secca',     price: 4.5, image: 'https://images.unsplash.com/photo-1611171711912-e03647bd4e4d?w=400' },
      { id: '11', name: 'Fusilloni Integrali Bio',           category: 'Pasta Integrale', price: 5.2, image: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400' },
      { id: '12', name: 'Ravioli Ricotta e Spinaci Freschi', category: 'Pasta Fresca',    price: 7.9, image: 'https://images.unsplash.com/photo-1587740908075-9ea5b2d8f9b0?w=400' },
    ],
  },
  {
    id: 'oleificio-pugliese', macroArea: 'bio-certificati',
    name: 'Oleificio Pugliese Bio',
    description: 'Olio extravergine di oliva biologico certificato',
    history: 'Dal 1985 produciamo olio EVO biologico nel cuore della Puglia. Le nostre olive provengono da uliveti centenari coltivati senza pesticidi chimici. La spremitura a freddo entro 4 ore dalla raccolta garantisce la massima qualità organolettica.',
    address: 'Contrada Uliveti, 23', city: 'Andria', region: 'Puglia', zipCode: '76123',
    phone: '+39 0883 555 200', email: 'info@oleificiopugliese.it', website: 'www.oleificiopugliese.it',
    foundedYear: 1985,
    certifications: ['Biologico Certificato', 'DOP Terra di Bari', 'IFS Food'],
    characteristics: [
      '500 ettari di uliveti biologici',
      'Spremitura a freddo entro 4 ore',
      '5 varietà di cultivar tradizionali',
      'Capacità produttiva: 200.000 litri/anno',
      'Tour aziendale con degustazione',
    ],
    productsCount: 12, categories: ['Alimentari', 'Prodotti Tipici'],
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200',
    products: [],
  },
  {
    id: 'salumificio-emiliano', macroArea: 'prodotti-tipici',
    name: 'Salumificio Emiliano DOP',
    description: "Salumi e insaccati tradizionali dell'Emilia",
    history: "Fondato nel 1948, il salumificio porta avanti la tradizione emiliana di salumi e insaccati DOP. Ogni prodotto è frutto di lavorazioni artigianali tramandate da quattro generazioni, nel rispetto dei disciplinari di produzione storici.",
    address: 'Via dei Norcini, 8', city: 'Langhirano', region: 'Emilia-Romagna', zipCode: '43013',
    phone: '+39 0521 858 700', email: 'info@salumificioemiliano.it', website: 'www.salumificioemiliano.it',
    foundedYear: 1948,
    certifications: ['DOP Prosciutto di Parma', 'DOP Culatello di Zibello', 'BRC Food Safety'],
    characteristics: [
      'Stagionatura naturale fino a 24 mesi',
      'Sale marino e spezie selezionate',
      'Ambienti climatizzati certificati',
      'Tracciabilità completa di filiera',
      'Visite guidate al museo del salume',
    ],
    productsCount: 22, categories: ['Alimentari', 'Prodotti Tipici'],
    image: 'https://images.unsplash.com/photo-1542843289-3b0e1c9ea8f0?w=1200',
    products: [],
  },
  {
    id: 'conservificio-siciliano', macroArea: 'alimentari',
    name: 'Conservificio Siciliano del Sole',
    description: 'Conserve, passate e prodotti della tradizione siciliana',
    history: "Lo stabilimento di Pachino lavora dal 1972 i pomodorini e le verdure della terra siciliana, trasformandoli in conserve e passate dal sapore autentico. Tutta la materia prima proviene da agricoltori locali entro 30 km dalla sede.",
    address: 'Strada del Pomodoro, 14', city: 'Pachino', region: 'Sicilia', zipCode: '96018',
    phone: '+39 0931 845 100', email: 'ordini@conservificiosicilia.it', website: 'www.conservificiosicilia.it',
    foundedYear: 1972,
    certifications: ['IGP Pomodoro di Pachino', 'BIO EU', 'IFS Higher Level'],
    characteristics: [
      'Materia prima locale (filiera 30 km)',
      'Produzione stagionale luglio-settembre',
      'Linea di confezionamento automatizzata',
      'Pastorizzazione delicata',
      'Catena del freddo controllata',
    ],
    productsCount: 28, categories: ['Alimentari', 'Prodotti Tipici'],
    image: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=1200',
    products: [],
  },
  {
    id: 'birrificio-dolomiti', macroArea: 'vini-bevande',
    name: 'Birrificio Artigianale delle Dolomiti',
    description: 'Birre artigianali premium con materie prime locali',
    history: "Nato nel 2008 dalla passione di tre amici trentini, il birrificio produce birre artigianali utilizzando malto d'orzo coltivato in valle e luppolo italiano. L'acqua di sorgente delle Dolomiti dà il carattere distintivo a ogni stile.",
    address: 'Via del Luppolo, 4', city: 'Trento', region: 'Trentino-Alto Adige', zipCode: '38122',
    phone: '+39 0461 220 950', email: 'info@birrificiodolomiti.it', website: 'www.birrificiodolomiti.it',
    foundedYear: 2008,
    certifications: ['Indipendente Italiana', 'Slow Food'],
    characteristics: [
      'Acqua di sorgente delle Dolomiti',
      'Malti italiani non OGM',
      'Fermentazione bassa e alta',
      '10 stili di birra in catalogo',
      'Brew pub con visite guidate',
    ],
    productsCount: 16, categories: ['Vini e Bevande'],
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=1200',
    products: [],
  },
  {
    id: 'dolceria-veneta', macroArea: 'alimentari',
    name: 'Dolceria Veneta Tradizionale',
    description: 'Dolci e pasticceria tipica veneziana dal 1890',
    history: "Storica pasticceria veneziana fondata nel 1890. Quattro generazioni di pasticceri custodiscono ricette antiche di baicoli, pan del doge e bussolai buranei, distribuiti oggi in tutta Italia ai migliori hotel e ristoranti.",
    address: 'Calle dei Dolci, 67', city: 'Venezia', region: 'Veneto', zipCode: '30121',
    phone: '+39 041 522 1190', email: 'info@dolceriaveneta.it', website: 'www.dolceriaveneta.it',
    foundedYear: 1890,
    certifications: ['Bottega Storica del Veneto', 'BRC Food'],
    characteristics: [
      'Ricette tradizionali veneziane',
      'Forni a legna per i lievitati',
      'Senza conservanti artificiali',
      'Produzione giornaliera limitata',
      'Showroom storico nel centro di Venezia',
    ],
    productsCount: 20, categories: ['Alimentari', 'Prodotti Tipici'],
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200',
    products: [],
  },
]

export default function Forniture({ navigate }: { navigate: (p: string) => void }) {
  const [search, setSearch]         = useState('')
  const [macroArea, setMacroArea]   = useState('all')
  const [sortBy, setSortBy]         = useState<SortKey>('name-asc')
  const [page, setPage]             = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Fornitori pubblicati dallo store (Sibylla Admin) — merge con i seed legacy
  const storeFornitori = useCatalogoStore(s => s.fornitori)
  const storeProdotti  = useCatalogoStore(s => s.prodotti)
  const storeCategorie = useCatalogoStore(s => s.categorie)

  const allSuppliers = useMemo<Supplier[]>(() => {
    const fromStore: Supplier[] = storeFornitori
      .filter(f => f.pubblicato)
      .map(f => {
        const prods = storeProdotti
          .filter(p => p.fornitoreId === f.id && p.pubblicato && p.attivo)
        const catNome = storeCategorie.find(c => c.id === f.categoriaId)?.nome
        return {
          id: f.id,
          name: f.nome,
          description: f.descrizione,
          history: f.storia,
          address: f.indirizzo,
          city: f.citta,
          region: f.regione,
          zipCode: f.cap,
          phone: f.telefono,
          email: f.email,
          website: f.sito,
          foundedYear: f.annoFondazione,
          certifications: f.certificazioni,
          characteristics: f.caratteristiche,
          productsCount: prods.length,
          categories: catNome ? [catNome] : [],
          image: f.immagineUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
          macroArea: f.macroArea,
          products: prods.map(p => ({
            id: p.id,
            name: p.nome,
            category: storeCategorie.find(c => c.id === p.categoriaId)?.nome || '',
            price: p.mercati.network.abilitato ? p.mercati.network.prezzoVendita : p.prezzoBase,
            image: p.immagineUrl,
          })),
        }
      })
    // I seed hard-coded restano sempre visibili (demo data)
    const seedIds = new Set(SUPPLIERS.map(s => s.id))
    const merged = [...SUPPLIERS, ...fromStore.filter(s => !seedIds.has(s.id))]
    return merged
  }, [storeFornitori, storeProdotti, storeCategorie])

  const counts = useMemo(() => {
    const acc: Record<string, number> = { all: allSuppliers.length }
    for (const a of MACRO_AREAS) {
      if (a.id === 'all') continue
      acc[a.id] = allSuppliers.filter(s => s.macroArea === a.id).length
    }
    return acc
  }, [allSuppliers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = allSuppliers.filter(s => {
      if (macroArea !== 'all' && s.macroArea !== macroArea) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.region.toLowerCase().includes(q)
      )
    })
    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':      return a.name.localeCompare(b.name)
        case 'name-desc':     return b.name.localeCompare(a.name)
        case 'products-asc':  return a.productsCount - b.productsCount
        case 'products-desc': return b.productsCount - a.productsCount
      }
    })
  }, [allSuppliers, search, macroArea, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, macroArea, sortBy])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  // ─── Vista dettaglio ───────────────────────────────────────────────
  if (selectedId) {
    const s = allSuppliers.find(x => x.id === selectedId)
    if (!s) {
      return (
        <div className="forniture">
          <BtnBack onClick={() => setSelectedId(null)} />
          <div className="sib-empty-state">Fornitore non trovato.</div>
        </div>
      )
    }
    return <SupplierDetail s={s} onBack={() => setSelectedId(null)} />
  }

  // ─── Vista lista ───────────────────────────────────────────────────
  return (
    <div className="forniture">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Lista fornitori"
        subtitle="Scopri i partner selezionati per la qualità e l'eccellenza dei loro prodotti"
      />

      <div className="forniture__macros">
        {MACRO_AREAS.map(a => (
          <button
            key={a.id}
            type="button"
            className={'forniture__macro' + (macroArea === a.id ? ' forniture__macro--active' : '')}
            onClick={() => setMacroArea(a.id)}
          >
            <i className={`fa-light ${a.icon}`} aria-hidden="true" />
            <span>{a.label}</span>
            <span className="forniture__macro-count">{counts[a.id]}</span>
          </button>
        ))}
      </div>

      <FilterToolbar>
        <div className="forniture__search">
          <SearchField
            placeholder="Cerca fornitori per nome, città o regione…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <SelectField
          name="sort" label="Ordina per"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          options={SORT_OPTIONS}
        />
      </FilterToolbar>

      <p className="forniture__count">
        {filtered.length} fornitori
        {macroArea !== 'all' && ` in ${MACRO_AREAS.find(a => a.id === macroArea)?.label}`}
      </p>

      {pageItems.length === 0 ? (
        <div className="sib-empty-state">Nessun fornitore trovato per questa ricerca.</div>
      ) : (
        <div className="forniture__grid">
          {pageItems.map(s => (
            <SupplierCard key={s.id} s={s} onClick={() => setSelectedId(s.id)} />
          ))}
        </div>
      )}

      <div className="forniture__pagination">
        <span className="forniture__pagination-info">
          {filtered.length > 0
            ? `Risultati ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filtered.length)} di ${filtered.length}`
            : '0 risultati'}
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}

// ─── Card lista fornitore ─────────────────────────────────────────────
function SupplierCard({ s, onClick }: { s: Supplier; onClick: () => void }) {
  return (
    <button type="button" className="forniture__card" onClick={onClick}>
      <div className="forniture__card-img">
        <img src={s.image} alt={s.name} loading="lazy" />
        <div className="forniture__card-overlay" />
        <div className="forniture__card-caption">
          <h4 className="forniture__card-name">{s.name}</h4>
          <span className="forniture__card-location">
            <i className="fa-light fa-location-dot" /> {s.city}, {s.region}
          </span>
        </div>
      </div>
      <div className="forniture__card-body">
        <p className="forniture__card-desc">{s.description}</p>
        <p className="forniture__card-meta">
          <i className="fa-light fa-box-open" /> {s.productsCount} prodotti
        </p>
        <span className="forniture__card-tags">
          {s.categories.map(c => (
            <span key={c} className="forniture__card-tag">{c}</span>
          ))}
        </span>
      </div>
    </button>
  )
}

// ─── Pagina dettaglio fornitore ───────────────────────────────────────
function SupplierDetail({ s, onBack }: { s: Supplier; onBack: () => void }) {
  return (
    <div className="forniture">
      <section
        className="forniture__hero"
        style={{ backgroundImage: `url(${s.image})` }}
      >
        <div className="forniture__hero-overlay" />
        <div className="forniture__hero-inner">
          <button type="button" className="forniture__hero-back" onClick={onBack}>
            <i className="fa-light fa-arrow-left" /> Torna ai fornitori
          </button>
          <h1 className="forniture__hero-title">{s.name}</h1>
          <p className="forniture__hero-location">
            <i className="fa-light fa-location-dot" /> {s.city}, {s.region}
          </p>
          <p className="forniture__hero-desc">{s.description}</p>
        </div>
      </section>

      <div className="forniture__detail-grid">
        {/* COL SX: contatti / certificazioni / caratteristiche */}
        <div className="forniture__detail-col">
          <div className="forniture__detail-card">
            <h2 className="forniture__detail-title">
              <i className="fa-light fa-address-card" /> Contatti
            </h2>
            <ul className="forniture__contact-list">
              <li>
                <i className="fa-light fa-location-dot" />
                <div>
                  <p>{s.address}</p>
                  <p>{s.zipCode} {s.city}, {s.region}</p>
                </div>
              </li>
              <li>
                <i className="fa-light fa-phone" />
                <a href={`tel:${s.phone}`}>{s.phone}</a>
              </li>
              <li>
                <i className="fa-light fa-envelope" />
                <a href={`mailto:${s.email}`}>{s.email}</a>
              </li>
              <li>
                <i className="fa-light fa-globe" />
                <a href={`https://${s.website}`} target="_blank" rel="noopener noreferrer">{s.website}</a>
              </li>
            </ul>
          </div>

          <div className="forniture__detail-card">
            <h2 className="forniture__detail-title">
              <i className="fa-light fa-award" /> Certificazioni
            </h2>
            <ul className="forniture__cert-list">
              {s.certifications.map(c => (
                <li key={c}>
                  <i className="fa-light fa-circle-check" /> {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="forniture__detail-card">
            <h2 className="forniture__detail-title">
              <i className="fa-light fa-list-check" /> Caratteristiche
            </h2>
            <ul className="forniture__feature-list">
              {s.characteristics.map(c => (
                <li key={c}>
                  <span className="forniture__bullet">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* COL DX: storia + prodotti */}
        <div className="forniture__detail-col">
          <div className="forniture__detail-card forniture__detail-card--lg">
            <div className="forniture__history-head">
              <h2 className="forniture__detail-title forniture__detail-title--xl">La nostra storia</h2>
              <span className="forniture__history-badge">Dal {s.foundedYear}</span>
            </div>
            <p className="forniture__history-body">{s.history}</p>
          </div>

          <div className="forniture__detail-card forniture__detail-card--lg">
            <h2 className="forniture__detail-title forniture__detail-title--xl">
              <i className="fa-light fa-box" /> Prodotti in piattaforma
            </h2>
            {s.products.length === 0 ? (
              <div className="forniture__products-empty">
                Il catalogo di questo fornitore sarà presto disponibile in piattaforma.
              </div>
            ) : (
              <div className="forniture__products-grid">
                {s.products.map(p => (
                  <article key={p.id} className="forniture__product-card">
                    <div className="forniture__product-img">
                      <img src={p.image} alt={p.name} loading="lazy" />
                    </div>
                    <p className="forniture__product-cat">{p.category}</p>
                    <h3 className="forniture__product-name">{p.name}</h3>
                    <p className="forniture__product-price">€ {p.price.toFixed(2)}</p>
                    <button type="button" className="sib-btn sib-btn--primary forniture__product-add">
                      <i className="fa-light fa-circle-plus" /> Aggiungi al carrello
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
