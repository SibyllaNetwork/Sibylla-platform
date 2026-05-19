import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import './QuotesPage.css';
import { Icon } from '../ds/icon';
import { PageToolbar, type ViewMode } from './PageToolbar';

type SortKey = 'date-desc' | 'date-asc' | 'client-asc' | 'total-desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'date-desc',  label: 'Più recenti prima' },
  { value: 'date-asc',   label: 'Più vecchi prima' },
  { value: 'client-asc', label: 'Cliente (A → Z)' },
  { value: 'total-desc', label: 'Importo decrescente' },
];

const DEFAULT_SORT: SortKey = 'date-desc';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type QuoteStatus = 'draft' | 'sent' | 'received' | 'accepted';

interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  createdDate: string;
  sentDate?: string;
  notes: string;
}

const MOCK_QUOTES: Quote[] = [
  { id: '1', quoteNumber: 'PRV-2026-001', clientName: 'Hotel Splendid Roma', clientEmail: 'acquisti@hotelsplendid.it', subject: 'Fornitura mensile prodotti alimentari', items: [{ id: '1', description: 'Olio EVO DOP Puglia - 750ml', quantity: 24, unitPrice: 13.9, total: 333.6 }, { id: '2', description: 'Parmigiano Reggiano DOP 24m - kg', quantity: 10, unitPrice: 24, total: 240 }, { id: '3', description: 'Pasta di Gragnano IGP - Box 12 pz', quantity: 5, unitPrice: 35, total: 175 }], subtotal: 748.6, tax: 74.86, total: 823.46, status: 'accepted', createdDate: '2026-03-15', sentDate: '2026-03-15', notes: 'Consegna entro 5 giorni lavorativi' },
  { id: '2', quoteNumber: 'PRV-2026-002', clientName: 'Grand Hotel Firenze', clientEmail: 'direzione@grandhotelfirenze.com', subject: 'Fornitura vini per evento aziendale', items: [{ id: '1', description: 'Chianti Classico DOCG - Cassa 6 bt', quantity: 10, unitPrice: 59.9, total: 599 }, { id: '2', description: 'Prosecco Valdobbiadene - Cassa 6 bt', quantity: 8, unitPrice: 45, total: 360 }], subtotal: 959, tax: 95.9, total: 1054.9, status: 'sent', createdDate: '2026-03-28', sentDate: '2026-03-28', notes: 'Evento previsto per il 15 Aprile' },
  { id: '3', quoteNumber: 'PRV-2026-003', clientName: 'Boutique Hotel Venezia', clientEmail: 'info@boutiquevenice.it', subject: 'Fornitura prodotti tipici per colazione', items: [{ id: '1', description: 'Miele Biologico - Set 12 vasetti', quantity: 3, unitPrice: 38.4, total: 115.2 }, { id: '2', description: 'Marmellate artigianali - Box 24 pz', quantity: 2, unitPrice: 42, total: 84 }, { id: '3', description: 'Biscotti tradizionali - Box 48 pz', quantity: 4, unitPrice: 28.5, total: 114 }], subtotal: 313.2, tax: 31.32, total: 344.52, status: 'received', createdDate: '2026-03-30', sentDate: '2026-03-30', notes: 'Richiesta conferma entro 3 giorni' },
  { id: '4', quoteNumber: 'PRV-2026-004', clientName: 'Resort Costa Smeralda', clientEmail: 'procurement@resortcostasmeralda.it', subject: 'Fornitura salumi e formaggi premium', items: [{ id: '1', description: 'Prosciutto Crudo Parma DOP - kg', quantity: 15, unitPrice: 19.5, total: 292.5 }, { id: '2', description: 'Salame Milano - kg', quantity: 8, unitPrice: 16.8, total: 134.4 }], subtotal: 426.9, tax: 42.69, total: 469.59, status: 'draft', createdDate: '2026-03-31', notes: 'Da completare con formaggio pecorino' },
];

const STATUS_CONFIG: Record<QuoteStatus, { label: string; modifier: string }> = {
  draft: { label: 'Bozza', modifier: 'quote-card__status--draft' },
  sent: { label: 'Inviato', modifier: 'quote-card__status--sent' },
  received: { label: 'Ricevuto', modifier: 'quote-card__status--received' },
  accepted: { label: 'Accettato', modifier: 'quote-card__status--accepted' },
};

const STAT_ICONS: Array<{ icon: string; label: string; key: QuoteStatus }> = [
  { icon: 'file-lines', label: 'Bozze', key: 'draft' },
  { icon: 'paper-plane', label: 'Inviati', key: 'sent' },
  { icon: 'envelope', label: 'Ricevuti', key: 'received' },
  { icon: 'circle-check', label: 'Accettati', key: 'accepted' },
];

export function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES);
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = quotes.filter((quote) => {
      const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
      const matchesSearch =
        q === '' ||
        quote.quoteNumber.toLowerCase().includes(q) ||
        quote.clientName.toLowerCase().includes(q) ||
        quote.subject.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':  return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        case 'date-asc':   return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
        case 'client-asc': return a.clientName.localeCompare(b.clientName);
        case 'total-desc': return b.total - a.total;
      }
    });
  }, [quotes, filterStatus, search, sortBy]);

  const filtersDirty = sortBy !== DEFAULT_SORT;
  const resetFilters = () => setSortBy(DEFAULT_SORT);

  const getStatusCount = (status: string) => {
    if (status === 'all') return quotes.length;
    return quotes.filter((q) => q.status === status).length;
  };

  const handleSendQuote = (quoteId: string) => {
    setQuotes(
      quotes.map((q) =>
        q.id === quoteId
          ? { ...q, status: 'sent' as QuoteStatus, sentDate: new Date().toISOString().split('T')[0] }
          : q,
      ),
    );
   window.alert('Preventivo inviato via email!');
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo preventivo?')) {
      setQuotes(quotes.filter((q) => q.id !== quoteId));
    }
  };

  const handleStatusChange = (quoteId: string, newStatus: QuoteStatus) => {
    setQuotes(quotes.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q)));
  };

  return (
    <Layout>
      <PageHeader
        title="Gestione Preventivi"
        subtitle="Crea, gestisci e invia preventivi ai tuoi clienti"
        actions={
          <button
            type="button"
            onClick={() => navigate('/quotes/create')}
            className="quotes-page__new"
          >
            <Icon family="regular" name="plus"  />
            Nuovo Preventivo
          </button>
        }
      />

      <div className="quotes-page__stats">
        {STAT_ICONS.map((stat) => (
          <div key={stat.key} className="quote-stat">
            <div className="quote-stat__head">
              <p className="quote-stat__label">{stat.label}</p>
              <Icon family="regular" name={stat.icon} className="quote-stat__icon" />
            </div>
            <p className="quote-stat__value">{getStatusCount(stat.key)}</p>
          </div>
        ))}
      </div>

      <div className="quotes-page__filter-tabs">
        <div className="quotes-page__filter-tabs-row">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`quotes-page__filter-tab${filterStatus === 'all' ? ' quotes-page__filter-tab--active' : ''}`}
          >
            Tutti ({getStatusCount('all')})
          </button>
          {(Object.entries(STATUS_CONFIG) as Array<[QuoteStatus, { label: string }]>).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterStatus(key)}
              className={`quotes-page__filter-tab${filterStatus === key ? ' quotes-page__filter-tab--active' : ''}`}
            >
              {config.label} ({getStatusCount(key)})
            </button>
          ))}
        </div>
      </div>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Cerca per numero, cliente o oggetto…',
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
                    name="quotes-sortBy"
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

      <div
        className={`quotes-page__list${view === 'grid' ? ' quotes-page__list--grid' : ''}`}
      >
        {filteredQuotes.length === 0 ? (
          <div className="quote-empty">
            <div className="quote-empty__icon">
              <Icon family="regular" name="file-lines"  />
            </div>
            <p className="quote-empty__text">Nessun preventivo trovato</p>
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const statusCfg = STATUS_CONFIG[quote.status];
            return (
              <article key={quote.id} className="quote-card">
                <div className="quote-card__head">
                  <div className="quote-card__head-row">
                    <div className="quote-card__info">
                      <div className="quote-card__id-row">
                        <h3 className="quote-card__id">{quote.quoteNumber}</h3>
                        <span className={`quote-card__status ${statusCfg.modifier}`}>
                          <span className="quote-card__status-dot" />
                          {statusCfg.label}
                        </span>
                      </div>
                      <h4 className="quote-card__client">{quote.clientName}</h4>
                      <p className="quote-card__subject">{quote.subject}</p>
                    </div>
                    <div className="quote-card__totals">
                      <p className="quote-card__amount">€{quote.total.toFixed(2)}</p>
                      <p className="quote-card__iva">IVA inclusa</p>
                    </div>
                  </div>

                  <div className="quote-card__meta">
                    <span className="quote-card__meta-item">
                      <Icon family="regular" name="calendar"  />
                      Creato: {new Date(quote.createdDate).toLocaleDateString('it-IT')}
                    </span>
                    {quote.sentDate && (
                      <span className="quote-card__meta-item">
                        <Icon family="regular" name="paper-plane"  />
                        Inviato: {new Date(quote.sentDate).toLocaleDateString('it-IT')}
                      </span>
                    )}
                    <span className="quote-card__meta-item">
                      <Icon family="regular" name="envelope"  />
                      {quote.clientEmail}
                    </span>
                  </div>
                </div>

                <div className="quote-card__items-section">
                  <h5 className="quote-card__items-title">
                    Dettaglio voci ({quote.items.length})
                  </h5>
                  <div className="quote-card__items">
                    {quote.items.map((item) => (
                      <div key={item.id} className="quote-card__item">
                        <div>
                          <p className="quote-card__item-desc">{item.description}</p>
                          <p className="quote-card__item-calc">
                            {item.quantity} x €{item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <span className="quote-card__item-total">€{item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="quote-card__totals-summary">
                    <div className="quote-card__totals-row">
                      <span>Subtotale</span>
                      <span>€{quote.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="quote-card__totals-row">
                      <span>IVA (10%)</span>
                      <span>€{quote.tax.toFixed(2)}</span>
                    </div>
                    <div className="quote-card__totals-row quote-card__totals-row--grand">
                      <span>Totale</span>
                      <span className="quote-card__totals-value">€{quote.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {quote.notes && (
                    <div className="quote-card__notes">
                      <strong>Note:</strong> {quote.notes}
                    </div>
                  )}
                </div>

                <div className="quote-card__actions">
                  <button
                    type="button"
                    onClick={() =>window.alert(`Visualizza preventivo ${quote.quoteNumber}`)}
                    className="quote-btn"
                  >
                    <Icon family="regular" name="eye"  />
                    Visualizza
                  </button>

                  {quote.status === 'draft' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>window.alert(`Modifica preventivo ${quote.quoteNumber}`)}
                        className="quote-btn"
                      >
                        <Icon family="regular" name="pen-to-square"  />
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendQuote(quote.id)}
                        className="quote-btn quote-btn--primary"
                      >
                        <Icon family="regular" name="paper-plane"  />
                        Invia
                      </button>
                    </>
                  )}

                  {quote.status === 'sent' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(quote.id, 'received')}
                      className="quote-btn quote-btn--warning"
                    >
                      <Icon family="regular" name="envelope"  />
                      Segna come Ricevuto
                    </button>
                  )}

                  {quote.status === 'received' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(quote.id, 'accepted')}
                      className="quote-btn quote-btn--success"
                    >
                      <Icon family="regular" name="circle-check"  />
                      Segna come Accettato
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteQuote(quote.id)}
                    className="quote-btn quote-btn--danger"
                  >
                    <Icon family="regular" name="trash"  />
                    Elimina
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {showNewQuoteModal && (
        <div className="quote-modal">
          <div className="quote-modal__dialog">
            <div className="quote-modal__head">
              <h2 className="quote-modal__title">Nuovo Preventivo</h2>
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="quote-modal__close"
              >
                <Icon family="regular" name="xmark"  />
              </button>
            </div>
            <div className="quote-modal__body">
              <p className="quote-modal__text">
                Funzionalità di creazione preventivo in sviluppo.
                <br />
                Questa modal conterrà un form completo per creare nuovi preventivi.
              </p>
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="quote-modal__cta"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
