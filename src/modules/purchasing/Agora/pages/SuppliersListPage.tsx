import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { PageToolbar, type ViewMode } from './PageToolbar';
import './SuppliersListPage.css';

type SortKey = 'name-asc' | 'name-desc' | 'products-desc' | 'products-asc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',      label: 'Nome (A → Z)' },
  { value: 'name-desc',     label: 'Nome (Z → A)' },
  { value: 'products-desc', label: 'Più prodotti prima' },
  { value: 'products-asc',  label: 'Meno prodotti prima' },
];

const DEFAULT_SORT: SortKey = 'name-asc';

interface Supplier {
  id: string;
  name: string;
  description: string;
  city: string;
  region: string;
  productsCount: number;
  categories: string[];
  image: string;
  macroArea: string;
}

const MACRO_AREAS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'all', label: 'Tutti', icon: 'building' },
  { id: 'vini-bevande', label: 'Vini e Bevande', icon: 'wine-bottle' },
  { id: 'alimentari', label: 'Alimentari e Gastronomia', icon: 'utensils' },
  { id: 'prodotti-tipici', label: 'Prodotti Tipici DOP/IGP', icon: 'award' },
  { id: 'cereali-pasta', label: 'Cereali e Pasta', icon: 'wheat-awn' },
  { id: 'bio-certificati', label: 'Bio e Certificati', icon: 'apple-whole' },
];

const SUPPLIERS: Supplier[] = [
  { id: 'cantina-toscana', name: 'Cantina Toscana Del Chianti', description: 'Produttore storico di vini pregiati toscani dal 1872', city: 'Greve in Chianti', region: 'Toscana', productsCount: 24, categories: ['Vini e Bevande', 'Prodotti Tipici'], image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800', macroArea: 'vini-bevande' },
  { id: 'caseificio-alpino', name: 'Caseificio Alpino Tradizionale', description: "Formaggi DOP e prodotti lattiero-caseari d'eccellenza", city: 'Bra', region: 'Piemonte', productsCount: 18, categories: ['Alimentari', 'Prodotti Tipici'], image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800', macroArea: 'prodotti-tipici' },
  { id: 'pastificio-artigiano', name: 'Pastificio Artigiano Napoletano', description: 'Pasta fresca e secca di alta qualità dal 1920', city: 'Gragnano', region: 'Campania', productsCount: 32, categories: ['Alimentari'], image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=800', macroArea: 'cereali-pasta' },
  { id: 'oleificio-pugliese', name: 'Oleificio Pugliese Bio', description: 'Olio extravergine di oliva biologico certificato', city: 'Andria', region: 'Puglia', productsCount: 12, categories: ['Alimentari', 'Prodotti Tipici'], image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800', macroArea: 'bio-certificati' },
  { id: 'salumificio-emiliano', name: 'Salumificio Emiliano D.O.P.', description: "Salumi e insaccati tradizionali dell'Emilia", city: 'Langhirano', region: 'Emilia-Romagna', productsCount: 22, categories: ['Alimentari', 'Prodotti Tipici'], image: 'https://images.unsplash.com/photo-1542843289-3b0e1c9ea8f0?w=800', macroArea: 'prodotti-tipici' },
  { id: 'conservificio-siciliano', name: 'Conservificio Siciliano del Sole', description: 'Conserve, passate e prodotti della tradizione siciliana', city: 'Pachino', region: 'Sicilia', productsCount: 28, categories: ['Alimentari', 'Prodotti Tipici'], image: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=800', macroArea: 'alimentari' },
  { id: 'birrificio-artigianale', name: 'Birrificio Artigianale delle Dolomiti', description: 'Birre artigianali premium con materie prime locali', city: 'Trento', region: 'Trentino-Alto Adige', productsCount: 16, categories: ['Vini e Bevande'], image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800', macroArea: 'vini-bevande' },
  { id: 'dolceria-veneta', name: 'Dolceria Veneta Tradizionale', description: 'Dolci e pasticceria tipica veneziana dal 1890', city: 'Venezia', region: 'Veneto', productsCount: 20, categories: ['Alimentari', 'Prodotti Tipici'], image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', macroArea: 'alimentari' },
];

export function SuppliersListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMacroArea, setSelectedMacroArea] = useState('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = SUPPLIERS.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(q) ||
        supplier.description.toLowerCase().includes(q) ||
        supplier.city.toLowerCase().includes(q) ||
        supplier.region.toLowerCase().includes(q);

      const matchesMacroArea =
        selectedMacroArea === 'all' || supplier.macroArea === selectedMacroArea;

      return matchesSearch && matchesMacroArea;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':      return a.name.localeCompare(b.name);
        case 'name-desc':     return b.name.localeCompare(a.name);
        case 'products-asc':  return a.productsCount - b.productsCount;
        case 'products-desc': return b.productsCount - a.productsCount;
      }
    });
  }, [searchQuery, selectedMacroArea, sortBy]);

  const filtersDirty = sortBy !== DEFAULT_SORT;
  const resetFilters = () => setSortBy(DEFAULT_SORT);

  const getCountByMacroArea = (areaId: string) => {
    if (areaId === 'all') return SUPPLIERS.length;
    return SUPPLIERS.filter((s) => s.macroArea === areaId).length;
  };

  return (
    <Layout>
      <PageHeader
        title="I Nostri Fornitori"
        subtitle="Scopri i partner selezionati per la qualità e l'eccellenza dei loro prodotti"
        onBack={() => navigate('/categories')}
        backLabel="Torna alle categorie"
      />

      <div className="suppliers-list__tabs-row">
        {MACRO_AREAS.map((area) => {
          const isActive = selectedMacroArea === area.id;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => setSelectedMacroArea(area.id)}
              className={`suppliers-list__tab${isActive ? ' suppliers-list__tab--active' : ''}`}
            >
              <Icon family="regular" name={area.icon} />
              <span>{area.label}</span>
              <span className="suppliers-list__tab-count">{getCountByMacroArea(area.id)}</span>
            </button>
          );
        })}
      </div>

      <PageToolbar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Cerca fornitori per nome, città o regione…',
        }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        filterPanel={
          <fieldset className="page-toolbar__filter-section">
            <legend className="page-toolbar__filter-label">Ordina per</legend>
            <div className="page-toolbar__filter-options">
              {SORT_OPTIONS.map((opt) => (
                <label key={opt.value} className="page-toolbar__filter-option">
                  <input
                    type="radio"
                    name="suppliers-sortBy"
                    value={opt.value}
                    checked={sortBy === opt.value}
                    onChange={() => setSortBy(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        }
      />

      <div className="suppliers-list__content">
        <p className="suppliers-list__count">
          {filteredSuppliers.length} fornitori{' '}
          {selectedMacroArea !== 'all' &&
            `in ${MACRO_AREAS.find((a) => a.id === selectedMacroArea)?.label}`}
        </p>

        {filteredSuppliers.length === 0 ? (
          <div className="suppliers-list__empty">Nessun fornitore trovato per questa ricerca</div>
        ) : (
          <div
            className={`suppliers-list__grid${view === 'list' ? ' suppliers-list__grid--list' : ''}`}
          >
            {filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => navigate(`/supplier/${supplier.id}`)}
                className="supplier-card"
              >
                <div className="supplier-card__image-wrap">
                  <img src={supplier.image} alt={supplier.name} className="supplier-card__image" />
                  <div className="supplier-card__image-overlay" />
                  <div className="supplier-card__image-caption">
                    <h3 className="supplier-card__name">{supplier.name}</h3>
                    <span className="supplier-card__location">
                      <Icon family="regular" name="location-dot" />
                      {supplier.city}, {supplier.region}
                    </span>
                  </div>
                </div>

                <div className="supplier-card__body">
                  <p className="supplier-card__desc">{supplier.description}</p>

                  <div className="supplier-card__meta">
                    <Icon family="regular" name="box-open" />
                    <span>{supplier.productsCount} prodotti</span>
                  </div>

                  <div className="supplier-card__tags">
                    {supplier.categories.map((cat) => (
                      <span key={cat} className="supplier-card__tag">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
