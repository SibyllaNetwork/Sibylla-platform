import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import './GroupPurchasesPage.css';
import { Icon } from '../ds/icon';
import { Button } from '../ds/button';
import { PageToolbar, type ViewMode } from './PageToolbar';
import { JoinGroupPurchaseModal } from './JoinGroupPurchaseModal';
import './groupPurchaseModals.css';
import {
  useGroupPurchasesStore,
  GROUP_PURCHASE_CATEGORIES,
  getProgressPercentage,
  getDaysRemaining,
  type GroupPurchase,
} from '../../../../store/useGroupPurchasesStore';

type SortKey = 'name-asc' | 'name-desc' | 'discount-desc' | 'end-asc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',      label: 'Nome (A → Z)' },
  { value: 'name-desc',     label: 'Nome (Z → A)' },
  { value: 'discount-desc', label: 'Sconto maggiore prima' },
  { value: 'end-asc',       label: 'Fine più vicina prima' },
];

const DEFAULT_SORT: SortKey = 'name-asc';

export function GroupPurchasesPage() {
  const navigate = useNavigate();
  const purchases = useGroupPurchasesStore((s) => s.purchases);
  const addPurchase = useGroupPurchasesStore((s) => s.addPurchase);
  const joinPurchase = useGroupPurchasesStore((s) => s.joinPurchase);

  const [selectedCategory, setSelectedCategory] = useState('Tutti');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);
  const [showCreate, setShowCreate] = useState(false);
  const [joinTarget, setJoinTarget] = useState<GroupPurchase | null>(null);

  const activeGroupsCount = useMemo(
    () => purchases.filter((g) => g.status === 'active' || g.status === 'closing-soon').length,
    [purchases],
  );

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = purchases.filter((gp) => {
      const matchesCategory = selectedCategory === 'Tutti' || gp.category === selectedCategory;
      const matchesSearch =
        q === '' ||
        gp.productName.toLowerCase().includes(q) ||
        gp.description.toLowerCase().includes(q) ||
        gp.supplier.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':      return a.productName.localeCompare(b.productName);
        case 'name-desc':     return b.productName.localeCompare(a.productName);
        case 'discount-desc': return b.discount - a.discount;
        case 'end-asc':       return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
    });
  }, [purchases, selectedCategory, search, sortBy]);

  const filtersDirty = sortBy !== DEFAULT_SORT;
  const resetFilters = () => setSortBy(DEFAULT_SORT);

  const handleCreate = (data: Omit<GroupPurchase, 'id' | 'currentParticipants' | 'status' | 'discount'>) => {
    addPurchase(data);
    setShowCreate(false);
  };

  const handleJoin = (id: string) => {
    joinPurchase(id);
    setJoinTarget(null);
  };

  const renderStatusBadge = (status: GroupPurchase['status']) => {
    if (status === 'closing-soon') {
      return (
        <span className="gp-card__badge-status gp-card__badge-status--closing">
          <Icon family="regular" name="triangle-exclamation"  />
          In chiusura
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="gp-card__badge-status gp-card__badge-status--completed">
          <Icon family="regular" name="circle-check"  />
          Completato
        </span>
      );
    }
    return (
      <span className="gp-card__badge-status gp-card__badge-status--active">
        <Icon family="regular" name="users"  />
        Attivo
      </span>
    );
  };

  return (
    <Layout>
      <div className="group-purchases-page">
      <PageHeader
        title="Acquisti condivisi"
        subtitle="Unisciti ai gruppi di acquisto e risparmia acquistando insieme ad altri"
        actions={
          <>
            <Button variant="tertiary" size="md" onClick={() => navigate('/group-purchases/active')}>
              <Icon family="regular" name="layer-group" data-slot="icon" />
              Gruppi attivi
              <span className="group-purchases__active-count">{activeGroupsCount}</span>
            </Button>
            <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
              <Icon family="solid" name="plus" data-slot="icon" />
              Crea acquisto condiviso
            </Button>
          </>
        }
      />

      {showCreate && (
        <CreateGroupPurchaseModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {joinTarget && (
        <JoinGroupPurchaseModal
          purchase={joinTarget}
          onClose={() => setJoinTarget(null)}
          onConfirm={() => handleJoin(joinTarget.id)}
        />
      )}

      <div className="group-purchases__filter-row">
        {GROUP_PURCHASE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`group-purchases__tab${selectedCategory === category ? ' group-purchases__tab--active' : ''}`}
          >
            {category}
          </button>
        ))}
      </div>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Cerca prodotto, descrizione o fornitore…',
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
                    name="group-purchases-sortBy"
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

      <div className="group-purchases__content">
        <p className="group-purchases__count">
          {filteredPurchases.length} gruppi di acquisto disponibili
        </p>

        <div
          className={`group-purchases__grid${view === 'list' ? ' group-purchases__grid--list' : ''}`}
        >
          {filteredPurchases.map((purchase) => {
            const progress = getProgressPercentage(
              purchase.currentParticipants,
              purchase.minQuantity,
            );
            const daysRemaining = getDaysRemaining(purchase.endDate);
            const isAlmostComplete =
              purchase.currentParticipants >= purchase.minQuantity * 0.8;
            const progressWidthClass = `gp-progress-${Math.round(progress / 5) * 5}`;

            return (
              <article key={purchase.id} className="gp-card">
                <div className="gp-card__image-wrap">
                  <img
                    src={purchase.image}
                    alt={purchase.productName}
                    className="gp-card__image"
                  />
                  <div className="gp-card__image-overlay" />
                  {renderStatusBadge(purchase.status)}
                  <div className="gp-card__badge-discount">-{purchase.discount}%</div>
                  <div className="gp-card__image-caption">
                    <h3 className="gp-card__product">{purchase.productName}</h3>
                    <p className="gp-card__supplier">{purchase.supplier}</p>
                  </div>
                </div>

                <div className="gp-card__body">
                  <p className="gp-card__desc">{purchase.description}</p>

                  <div className="gp-card__progress-head">
                    <span className="gp-card__progress-label">
                      Partecipanti: {purchase.currentParticipants}/{purchase.minQuantity} min
                    </span>
                    <span className="gp-card__progress-value">{Math.round(progress)}%</span>
                  </div>
                  <div className="gp-card__progress">
                    <div
                      className={`gp-card__progress-bar${isAlmostComplete ? ' gp-card__progress-bar--near' : ''} ${progressWidthClass}`}
                    />
                  </div>

                  <div className="gp-card__prices">
                    <div className="gp-card__prices-row">
                      <div>
                        <p className="gp-card__prices-label">Prezzo normale</p>
                        <p className="gp-card__prices-regular">
                          €{purchase.regularPrice.toFixed(2)}
                        </p>
                      </div>
                      <Icon family="regular" name="arrow-trend-down" className="gp-card__prices-arrow" />
                      <div>
                        <p className="gp-card__prices-label">Prezzo gruppo</p>
                        <p className="gp-card__prices-group">€{purchase.groupPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="gp-card__prices-unit">
                      per {purchase.unit} • Min. {purchase.quantityPerPerson} {purchase.unit}
                    </p>
                  </div>

                  <div className="gp-card__info-row">
                    <span className="gp-card__info">
                      <Icon family="regular" name="clock"  />
                      {daysRemaining} giorni
                    </span>
                    <span className="gp-card__info">
                      <Icon family="regular" name="calendar"  />
                      Scade: {new Date(purchase.endDate).toLocaleDateString('it-IT')}
                    </span>
                    <span className="gp-card__info">
                      <Icon family="regular" name="users"  />
                      Max {purchase.maxParticipants}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setJoinTarget(purchase)}
                    className="gp-card__cta"
                  >
                    <Icon family="regular" name="cart-shopping"  />
                    Partecipa al Gruppo
                  </button>

                  {isAlmostComplete && (
                    <p className="gp-card__near-msg">⚡ Quasi al traguardo! Unisciti ora!</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <section className="group-purchases__info">
        <h2 className="group-purchases__info-title">Come funzionano gli Acquisti condivisi?</h2>
        <div className="group-purchases__info-grid">
            <div className="gp-step">
              <div className="gp-step__num">1</div>
              <h3 className="gp-step__title">Scegli il prodotto</h3>
              <p className="gp-step__text">
                Esplora i gruppi di acquisto attivi e trova i prodotti che ti interessano con
                sconti esclusivi.
              </p>
            </div>
            <div className="gp-step">
              <div className="gp-step__num">2</div>
              <h3 className="gp-step__title">Partecipa al gruppo</h3>
              <p className="gp-step__text">
                Conferma la tua adesione indicando la quantità desiderata. Il gruppo si attiva al
                raggiungimento del minimo.
              </p>
            </div>
            <div className="gp-step">
              <div className="gp-step__num">3</div>
              <h3 className="gp-step__title">Ricevi il prodotto</h3>
              <p className="gp-step__text">
                Una volta chiuso il gruppo, riceverai i prodotti al prezzo scontato concordato
                insieme!
              </p>
            </div>
          </div>
      </section>
      </div>
    </Layout>
  );
}

/* ============================================================
   CreateGroupPurchaseModal — form per creare un nuovo gruppo
   d'acquisto direttamente dalla pagina Acquisti di Rete.
   ============================================================ */

interface CreateModalProps {
  onClose: () => void;
  onSave: (data: Omit<GroupPurchase, 'id' | 'currentParticipants' | 'status' | 'discount'>) => void;
}

function CreateGroupPurchaseModal({ onClose, onSave }: CreateModalProps) {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState(
    GROUP_PURCHASE_CATEGORIES.find((c) => c !== 'Tutti') ?? '',
  );
  const [regularPrice, setRegularPrice] = useState(0);
  const [groupPrice, setGroupPrice] = useState(0);
  const [unit, setUnit] = useState('pz');
  const [quantityPerPerson, setQuantityPerPerson] = useState(1);
  const [minQuantity, setMinQuantity] = useState(10);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !supplier.trim() || !category || !endDate) return;
    if (groupPrice <= 0 || regularPrice <= 0 || groupPrice >= regularPrice) return;
    onSave({
      productName: productName.trim(),
      description: description.trim(),
      image: image.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
      supplier: supplier.trim(),
      category,
      regularPrice,
      groupPrice,
      minQuantity: Math.max(1, Math.floor(minQuantity)),
      maxParticipants: Math.max(minQuantity, Math.floor(maxParticipants)),
      endDate,
      unit: unit.trim() || 'pz',
      quantityPerPerson: Math.max(1, Math.floor(quantityPerPerson)),
    });
  };

  return (
    <div className="gp-modal" role="presentation" onClick={onClose}>
      <div className="gp-modal__box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="gp-modal__head">
          <h2>Crea acquisto condiviso</h2>
          <button type="button" className="gp-modal__close" onClick={onClose} aria-label="Chiudi">
            <Icon family="light" name="xmark" />
          </button>
        </header>

        <form className="gp-modal__form" onSubmit={handleSubmit}>
          <div className="gp-modal__row">
            <label className="gp-modal__field gp-modal__field--full">
              <span>Nome prodotto *</span>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="es. Olio extravergine DOP" />
            </label>
          </div>

          <div className="gp-modal__row">
            <label className="gp-modal__field gp-modal__field--full">
              <span>Descrizione</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Breve descrizione del prodotto" />
            </label>
          </div>

          <div className="gp-modal__row">
            <label className="gp-modal__field">
              <span>Fornitore *</span>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} required placeholder="Nome fornitore" />
            </label>
            <label className="gp-modal__field">
              <span>Categoria *</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                {GROUP_PURCHASE_CATEGORIES.filter((c) => c !== 'Tutti').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="gp-modal__row">
            <label className="gp-modal__field">
              <span>Prezzo di listino (€) *</span>
              <input type="number" min="0.01" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(Number(e.target.value))} required />
            </label>
            <label className="gp-modal__field">
              <span>Prezzo gruppo (€) *</span>
              <input type="number" min="0.01" step="0.01" value={groupPrice} onChange={(e) => setGroupPrice(Number(e.target.value))} required />
            </label>
          </div>

          <div className="gp-modal__row">
            <label className="gp-modal__field">
              <span>Unità di vendita</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="es. bottiglia da 750ml" />
            </label>
            <label className="gp-modal__field">
              <span>Quantità per persona</span>
              <input type="number" min="1" value={quantityPerPerson} onChange={(e) => setQuantityPerPerson(Number(e.target.value))} />
            </label>
          </div>

          <div className="gp-modal__row">
            <label className="gp-modal__field">
              <span>Quantità minima</span>
              <input type="number" min="1" value={minQuantity} onChange={(e) => setMinQuantity(Number(e.target.value))} />
            </label>
            <label className="gp-modal__field">
              <span>Max partecipanti</span>
              <input type="number" min="1" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} />
            </label>
          </div>

          <div className="gp-modal__row">
            <label className="gp-modal__field">
              <span>Data di chiusura *</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </label>
            <label className="gp-modal__field">
              <span>URL immagine</span>
              <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
            </label>
          </div>

          <footer className="gp-modal__actions">
            <Button variant="tertiary" onClick={onClose} type="button">Annulla</Button>
            <Button variant="primary" type="submit">
              <Icon family="solid" name="check" data-slot="icon" />
              Crea gruppo
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}
