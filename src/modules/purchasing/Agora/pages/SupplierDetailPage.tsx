import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Layout } from './Layout';
import { findSupplierBySlug, slugifySupplier } from '../data/categories';
import { Icon } from '../ds/icon';
import './SupplierDetailPage.css';

interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface SupplierDetail {
  id: string;
  name: string;
  description: string;
  history: string;
  address: string;
  city: string;
  region: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  foundedYear: number;
  certifications: string[];
  characteristics: string[];
  image: string;
  products: SupplierProduct[];
}

const RICH_SUPPLIERS: Record<string, SupplierDetail> = {
  'cantina-toscana': {
    id: 'cantina-toscana',
    name: 'Cantina Toscana Del Chianti',
    description: 'Produttore storico di vini pregiati toscani dal 1872',
    history:
      "Fondata nel 1872 dalla famiglia Bianchi, la Cantina Toscana Del Chianti rappresenta oltre 150 anni di tradizione vinicola. Situata nel cuore del Chianti Classico, l'azienda si estende su 80 ettari di vigneti coltivati con metodi sostenibili. Attraverso cinque generazioni, la cantina ha mantenuto viva la tradizione combinandola con tecniche moderne di vinificazione.",
    address: 'Via dei Vigneti, 45',
    city: 'Greve in Chianti',
    region: 'Toscana',
    zipCode: '50022',
    phone: '+39 055 854 2100',
    email: 'info@cantinatoscana.it',
    website: 'www.cantinatoscana.it',
    foundedYear: 1872,
    certifications: ['DOCG Chianti Classico', 'Biologico Certificato', 'Vegan OK'],
    characteristics: [
      '80 ettari di vigneti di proprietà',
      'Produzione annuale: 400.000 bottiglie',
      'Cantina storica del 1872 ristrutturata',
      'Sala degustazione con vista sui vigneti',
      'Visite guidate e wine tasting',
    ],
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200',
    products: [
      { id: '1', name: 'Chianti Classico DOCG Riserva 2019', category: 'Vini Rossi', price: 24.9, image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400' },
      { id: '2', name: 'Vernaccia di San Gimignano DOCG', category: 'Vini Bianchi', price: 16.5, image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400' },
      { id: '3', name: 'Super Tuscan IGT', category: 'Vini Rossi', price: 32.0, image: 'https://images.unsplash.com/photo-1574285013029-29296a71930e?w=400' },
      { id: '4', name: 'Vin Santo del Chianti DOC', category: 'Vini Dessert', price: 28.9, image: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=400' },
    ],
  },
  'caseificio-alpino': {
    id: 'caseificio-alpino',
    name: 'Caseificio Alpino Tradizionale',
    description: "Formaggi DOP e prodotti lattiero-caseari d'eccellenza",
    history:
      "Il Caseificio Alpino Tradizionale nasce nel 1965 ai piedi delle Alpi piemontesi. La cooperativa riunisce 25 allevatori locali che conferiscono latte di altissima qualità proveniente da bovine al pascolo. Ogni formaggio è frutto di ricette tramandate di generazione in generazione, con l'utilizzo esclusivo di latte crudo e fermenti naturali.",
    address: 'Strada delle Langhe, 12',
    city: 'Bra',
    region: 'Piemonte',
    zipCode: '12042',
    phone: '+39 0172 431 890',
    email: 'info@caseificioalpino.it',
    website: 'www.caseificioalpino.it',
    foundedYear: 1965,
    certifications: ['DOP Raschera', 'DOP Castelmagno', 'Presidio Slow Food'],
    characteristics: [
      'Cooperativa di 25 allevatori locali',
      'Lavorazione artigianale del latte crudo',
      'Stagionatura in grotte naturali',
      'Produzione media: 500 forme al giorno',
      'Caseificio visitabile con laboratorio didattico',
    ],
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200',
    products: [
      { id: '5', name: 'Raschera DOP Stagionato 6 mesi', category: 'Formaggi', price: 18.5, image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400' },
      { id: '6', name: "Castelmagno DOP d'Alpeggio", category: 'Formaggi', price: 32.0, image: 'https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400' },
      { id: '7', name: 'Ricotta Fresca di Montagna', category: 'Formaggi Freschi', price: 8.9, image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400' },
      { id: '8', name: 'Burro di Centrifuga Artigianale', category: 'Latticini', price: 12.5, image: 'https://images.unsplash.com/photo-1589881133595-c7f8c1801e81?w=400' },
    ],
  },
  'pastificio-artigiano': {
    id: 'pastificio-artigiano',
    name: 'Pastificio Artigiano Napoletano',
    description: 'Pasta fresca e secca di alta qualità dal 1920',
    history:
      'Dal 1920 il Pastificio Artigiano Napoletano produce pasta nel rispetto della tradizione di Gragnano, patria della pasta italiana. Situato nella "Valle dei Mulini", l\'azienda utilizza esclusivamente grano duro 100% italiano, acqua purissima delle sorgenti del Vesuvio e antiche trafile in bronzo.',
    address: 'Via dei Pastai, 78',
    city: 'Gragnano',
    region: 'Campania',
    zipCode: '80054',
    phone: '+39 081 879 3200',
    email: 'ordini@pastificioartigiano.it',
    website: 'www.pastificioartigiano.it',
    foundedYear: 1920,
    certifications: ['IGP Pasta di Gragnano', 'Certificazione Biologica', 'Made in Italy 100%'],
    characteristics: [
      'Trafilatura al bronzo con trafile storiche',
      'Essiccazione lenta a bassa temperatura',
      'Grano duro 100% italiano selezionato',
      'Oltre 60 formati di pasta prodotti',
      'Laboratorio visitabile su prenotazione',
    ],
    image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=1200',
    products: [
      { id: '9', name: 'Paccheri IGP Gragnano', category: 'Pasta Secca', price: 4.9, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400' },
      { id: '10', name: 'Linguine al Bronzo', category: 'Pasta Secca', price: 4.5, image: 'https://images.unsplash.com/photo-1611171711912-e03647bd4e4d?w=400' },
      { id: '11', name: 'Fusilloni Integrali Bio', category: 'Pasta Integrale', price: 5.2, image: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400' },
      { id: '12', name: 'Ravioli Ricotta e Spinaci Freschi', category: 'Pasta Fresca', price: 7.9, image: 'https://images.unsplash.com/photo-1587740908075-9ea5b2d8f9b0?w=400' },
    ],
  },
};

const CATEGORY_IMAGES: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=1200',
  2: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200',
  3: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200',
  4: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200',
  5: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
  6: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200',
  7: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200',
  8: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=1200',
  9: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=1200',
  10: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200',
  11: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200',
  12: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200',
};

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function buildGenericSupplier(slug: string, name: string, categoryId: number, categoryName: string): SupplierDetail {
  const seed = hashCode(name);
  const foundedYear = 1950 + (seed % 70);
  const cities = [
    { city: 'Milano', region: 'Lombardia', zipCode: '20121' },
    { city: 'Roma', region: 'Lazio', zipCode: '00185' },
    { city: 'Torino', region: 'Piemonte', zipCode: '10121' },
    { city: 'Bologna', region: 'Emilia-Romagna', zipCode: '40121' },
    { city: 'Napoli', region: 'Campania', zipCode: '80121' },
    { city: 'Firenze', region: 'Toscana', zipCode: '50121' },
    { city: 'Padova', region: 'Veneto', zipCode: '35121' },
  ];
  const location = cities[seed % cities.length];
  const streets = ['Via Industriale', 'Viale Europa', 'Corso Italia', 'Via del Commercio', 'Via della Stazione'];
  const street = streets[seed % streets.length];
  const streetNumber = 10 + (seed % 120);

  const domainSlug = slug.replace(/-/g, '');
  const email = `info@${domainSlug}.it`;
  const website = `www.${domainSlug}.it`;
  const phonePrefix = ['055', '02', '011', '06', '051', '081'][seed % 6];
  const phoneSuffix = 1000000 + (seed % 9000000);
  const phone = `+39 ${phonePrefix} ${String(phoneSuffix).slice(0, 3)} ${String(phoneSuffix).slice(3)}`;

  return {
    id: slug,
    name,
    description: `Partner di riferimento nella categoria "${categoryName}".`,
    history: `${name} opera dal ${foundedYear} nel settore "${categoryName}". L'azienda rappresenta una realtà consolidata della rete Agora, selezionata per la qualità dei prodotti e dei servizi offerti, l'affidabilità operativa e il rispetto degli standard richiesti dai nostri partner alberghieri.`,
    address: `${street}, ${streetNumber}`,
    city: location.city,
    region: location.region,
    zipCode: location.zipCode,
    phone,
    email,
    website,
    foundedYear,
    certifications: ['Partner Certificato Agora', 'ISO 9001', 'Qualità Garantita'],
    characteristics: [
      `Operativo nel settore ${categoryName.toLowerCase()}`,
      'Copertura logistica nazionale',
      'Assistenza dedicata ai partner della rete',
      'Listino aggiornato e condizioni riservate',
    ],
    image: CATEGORY_IMAGES[categoryId] || CATEGORY_IMAGES[1],
    products: [],
  };
}

export function SupplierDetailPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const { addProduct } = useCart();

  let supplier: SupplierDetail | null = null;

  if (supplierId) {
    if (RICH_SUPPLIERS[supplierId]) {
      supplier = RICH_SUPPLIERS[supplierId];
    } else {
      const lookup = findSupplierBySlug(supplierId);
      if (lookup) {
        supplier = buildGenericSupplier(
          slugifySupplier(lookup.name),
          lookup.name,
          lookup.categoryId,
          lookup.categoryName,
        );
      }
    }
  }

  if (!supplier) {
    return (
      <Layout>
        <div className="supplier-not-found">
          <h2 className="supplier-not-found__title">Fornitore non trovato</h2>
          <button
            type="button"
            onClick={() => navigate('/suppliers')}
            className="supplier-not-found__action"
          >
            Torna all'elenco fornitori
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section
        className="supplier-detail__hero"
        style={{ backgroundImage: `url(${supplier.image})` }}
      >
        <div className="supplier-detail__hero-overlay" />
        <div className="supplier-detail__hero-inner">
          <button
            type="button"
            onClick={() => navigate('/suppliers')}
            className="supplier-detail__hero-back"
          >
            <Icon family="regular" name="arrow-left" />
            Torna ai fornitori
          </button>
          <h1 className="supplier-detail__hero-title">{supplier.name}</h1>
          <p className="supplier-detail__hero-location">
            <Icon family="regular" name="location-dot" />
            {supplier.city}, {supplier.region}
          </p>
          <p className="supplier-detail__hero-description">{supplier.description}</p>
        </div>
      </section>

      <div className="supplier-detail__body">
        <div className="supplier-detail__grid">
          <div className="supplier-detail__column">
            <div className="supplier-card">
              <h2 className="supplier-card__title">Contatti</h2>
              <ul className="contact-list">
                <li className="contact-list__item">
                  <Icon family="regular" name="location-dot" className="contact-list__icon" />
                  <div>
                    <p>{supplier.address}</p>
                    <p>
                      {supplier.zipCode} {supplier.city}, {supplier.region}
                    </p>
                  </div>
                </li>
                <li className="contact-list__item">
                  <Icon family="regular" name="phone" className="contact-list__icon" />
                  <a href={`tel:${supplier.phone}`} className="contact-list__link">
                    {supplier.phone}
                  </a>
                </li>
                <li className="contact-list__item">
                  <Icon family="regular" name="envelope" className="contact-list__icon" />
                  <a href={`mailto:${supplier.email}`} className="contact-list__link">
                    {supplier.email}
                  </a>
                </li>
                <li className="contact-list__item">
                  <Icon family="regular" name="globe" className="contact-list__icon" />
                  <a
                    href={`https://${supplier.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-list__link"
                  >
                    {supplier.website}
                  </a>
                </li>
              </ul>
            </div>

            <div className="supplier-card">
              <h2 className="supplier-card__title">
                <Icon family="regular" name="award"  />
                Certificazioni
              </h2>
              <ul className="cert-list">
                {supplier.certifications.map((cert) => (
                  <li key={cert} className="cert-list__item">
                    {cert}
                  </li>
                ))}
              </ul>
            </div>

            <div className="supplier-card">
              <h2 className="supplier-card__title">Caratteristiche</h2>
              <ul className="feature-list">
                {supplier.characteristics.map((char) => (
                  <li key={char} className="feature-list__item">
                    <span className="feature-list__bullet">•</span>
                    <span>{char}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="supplier-detail__column">
            <div className="supplier-card supplier-card--lg">
              <div className="history-head">
                <h2 className="supplier-card__title supplier-card__title--xl">La nostra storia</h2>
                <span className="history-badge">Dal {supplier.foundedYear}</span>
              </div>
              <p className="history-body">{supplier.history}</p>
            </div>

            <div className="supplier-card supplier-card--lg">
              <h2 className="supplier-card__title supplier-card__title--xl">
                <Icon family="regular" name="box"  />
                Prodotti in piattaforma
              </h2>

              {supplier.products.length === 0 ? (
                <div className="supplier-products__empty">
                  Il catalogo di questo fornitore sarà presto disponibile in piattaforma.
                </div>
              ) : (
                <div className="products-grid">
                  {supplier.products.map((product) => (
                    <div key={product.id} className="product-card">
                      <div className="product-card__image-wrap">
                        <img src={product.image} alt={product.name} className="product-card__image" />
                      </div>
                      <p className="product-card__category">{product.category}</p>
                      <h3 className="product-card__name">{product.name}</h3>
                      <p className="product-card__price">€{product.price.toFixed(2)}</p>
                      <button
                        type="button"
                        className="product-card__add"
                        onClick={() =>
                          addProduct(
                            {
                              id: product.id,
                              categoryId: '',
                              productClassId: '',
                              name: product.name,
                              supplier: supplier!.name,
                              price: product.price,
                              image: product.image,
                              unit: 'Pezzo',
                            },
                            1,
                          )
                        }
                      >
                        <Icon family="regular" name="plus"  />
                        Aggiungi al carrello
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
