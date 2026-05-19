import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import './CreateQuotePage.css';
import { Icon } from '../ds/icon';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface QuoteFormData {
  firstName: string;
  lastName: string;
  companyName: string;
  vatNumber: string;
  email: string;
  address: string;
  billingAddress: string;
  subject: string;
  notes: string;
  validityDays: number;
  paymentMethod: string;
  items: QuoteItem[];
}

const PAYMENT_METHODS = [
  'Bonifico Bancario',
  'Carta di Credito',
  'PayPal',
  'Contrassegno',
  'Assegno',
  'RiBa',
  'SDD (Addebito Diretto)',
];

const VALIDITY_OPTIONS = [
  { value: 15, label: '15 giorni' },
  { value: 30, label: '30 giorni' },
  { value: 60, label: '60 giorni' },
  { value: 90, label: '90 giorni' },
];

const VAT_RATES = [
  { value: 0, label: '0% - Esente' },
  { value: 4, label: '4% - Ridotta' },
  { value: 5, label: '5% - Ridotta' },
  { value: 10, label: '10% - Ridotta' },
  { value: 22, label: '22% - Ordinaria' },
];

export function CreateQuotePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<QuoteFormData>({
    firstName: '',
    lastName: '',
    companyName: '',
    vatNumber: '',
    email: '',
    address: '',
    billingAddress: '',
    subject: '',
    notes: '',
    validityDays: 30,
    paymentMethod: 'Bonifico Bancario',
    items: [
      { id: '1', description: '', quantity: 1, unitPrice: 0, vatRate: 22, total: 0 },
    ],
  });

  const [sameAddress, setSameAddress] = useState(true);

  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const totalVAT = formData.items.reduce(
    (sum, item) => sum + (item.total * item.vatRate) / 100,
    0,
  );
  const grandTotal = subtotal + totalVAT;

  const handleInputChange = (field: keyof QuoteFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (id: string, field: keyof QuoteItem, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value } as QuoteItem;
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now().toString(),
          description: '',
          quantity: 1,
          unitPrice: 0,
          vatRate: 22,
          total: 0,
        },
      ],
    }));
  };

  const removeItem = (id: string) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
    }
  };

  const handleSameAddressToggle = () => {
    setSameAddress((prev) => !prev);
    if (!sameAddress) {
      handleInputChange('billingAddress', formData.address);
    }
  };

  const handleSaveDraft = () => {
   window.alert('Preventivo salvato come bozza!');
    navigate('/quotes');
  };

  const handleSendQuote = () => {
    if (!formData.email || !formData.companyName || formData.items.some((item) => !item.description)) {
     window.alert('Compila tutti i campi obbligatori prima di inviare!');
      return;
    }
   window.alert(`Preventivo inviato via email a ${formData.email}!`);
    navigate('/quotes');
  };

  return (
    <Layout>
      <PageHeader
        title="Crea Nuovo Preventivo"
        subtitle="Compila i campi per generare un preventivo professionale"
        onBack={() => navigate('/quotes')}
        actions={
          <>
            <button type="button" onClick={handleSaveDraft} className="create-quote__toolbar-btn">
              <Icon family="regular" name="floppy-disk"  />
              Salva Bozza
            </button>
            <button
              type="button"
              onClick={handleSendQuote}
              className="create-quote__toolbar-btn create-quote__toolbar-btn--primary"
            >
              <Icon family="regular" name="paper-plane"  />
              Invia Preventivo
            </button>
          </>
        }
      />

      <div className="create-quote__grid">
        <div className="create-quote__left">
          <section className="cq-card">
            <header className="cq-card__head">
              <span className="cq-card__icon">
                <Icon family="regular" name="building"  />
              </span>
              <h2 className="cq-card__title">Dati Destinatario</h2>
            </header>

            <div className="cq-fields">
              <div className="cq-field">
                <label className="cq-label">Nome *</label>
                <div className="cq-control">
                  <Icon family="regular" name="user" className="cq-icon" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="cq-input cq-input--icon"
                    placeholder="Mario"
                  />
                </div>
              </div>

              <div className="cq-field">
                <label className="cq-label">Cognome *</label>
                <div className="cq-control">
                  <Icon family="regular" name="user" className="cq-icon" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="cq-input cq-input--icon"
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div className="cq-field cq-field--full">
                <label className="cq-label">Ragione Sociale *</label>
                <div className="cq-control">
                  <Icon family="regular" name="building" className="cq-icon" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="cq-input cq-input--icon"
                    placeholder="Hotel Splendid S.r.l."
                  />
                </div>
              </div>

              <div className="cq-field">
                <label className="cq-label">Partita IVA *</label>
                <div className="cq-control">
                  <Icon family="regular" name="file-lines" className="cq-icon" />
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                    className="cq-input cq-input--icon"
                    placeholder="IT12345678901"
                  />
                </div>
              </div>

              <div className="cq-field">
                <label className="cq-label">Email *</label>
                <div className="cq-control">
                  <Icon family="regular" name="envelope" className="cq-icon" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="cq-input cq-input--icon"
                    placeholder="info@hotelsplendid.it"
                  />
                </div>
              </div>

              <div className="cq-field cq-field--full">
                <label className="cq-label">Indirizzo *</label>
                <div className="cq-control">
                  <Icon family="regular" name="location-dot" className="cq-icon" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => {
                      handleInputChange('address', e.target.value);
                      if (sameAddress) handleInputChange('billingAddress', e.target.value);
                    }}
                    className="cq-input cq-input--icon"
                    placeholder="Via Roma 123, 00100 Roma (RM)"
                  />
                </div>
              </div>

              <div className="cq-checkbox-row">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAddress}
                  onChange={handleSameAddressToggle}
                  className="cq-checkbox"
                />
                <label htmlFor="sameAddress" className="cq-label">
                  Indirizzo di fatturazione uguale all'indirizzo
                </label>
              </div>

              {!sameAddress && (
                <div className="cq-field cq-field--full">
                  <label className="cq-label">Indirizzo di Fatturazione *</label>
                  <div className="cq-control">
                    <Icon family="regular" name="location-dot" className="cq-icon" />
                    <input
                      type="text"
                      value={formData.billingAddress}
                      onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                      className="cq-input cq-input--icon"
                      placeholder="Via Milano 456, 20100 Milano (MI)"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="cq-card">
            <header className="cq-card__head">
              <span className="cq-card__icon">
                <Icon family="regular" name="file-lines"  />
              </span>
              <h2 className="cq-card__title">Dettagli Preventivo</h2>
            </header>

            <div className="cq-fields">
              <div className="cq-field cq-field--full">
                <label className="cq-label">Oggetto Preventivo *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="cq-input"
                  placeholder="Es: Fornitura mensile prodotti alimentari"
                />
              </div>

              <div className="cq-field">
                <label className="cq-label">
                  <Icon family="regular" name="calendar"  />
                  Validità Preventivo *
                </label>
                <select
                  value={formData.validityDays}
                  onChange={(e) => handleInputChange('validityDays', Number(e.target.value))}
                  className="cq-select"
                >
                  {VALIDITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cq-field">
                <label className="cq-label">
                  <Icon family="regular" name="credit-card"  />
                  Modalità di Pagamento *
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="cq-select"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cq-field cq-field--full">
                <label className="cq-label">Note Aggiuntive</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="cq-textarea"
                  placeholder="Inserisci eventuali note o condizioni particolari..."
                />
              </div>
            </div>
          </section>

          <section className="cq-card">
            <header className="cq-items-head">
              <div className="cq-card__head cq-card__head--inline">
                <span className="cq-card__icon">
                  <Icon family="regular" name="boxes-stacked"  />
                </span>
                <h2 className="cq-card__title">Prodotti e Servizi</h2>
              </div>
              <button type="button" onClick={addItem} className="cq-items-add">
                <Icon family="regular" name="plus"  />
                Aggiungi Voce
              </button>
            </header>

            <div className="cq-items">
              {formData.items.map((item, index) => (
                <div key={item.id} className="cq-item">
                  <div className="cq-item__head">
                    <span className="cq-item__index">Voce #{index + 1}</span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="cq-item__remove"
                        aria-label="Rimuovi voce"
                      >
                        <Icon family="regular" name="trash"  />
                      </button>
                    )}
                  </div>

                  <div className="cq-item__fields">
                    <div className="cq-field">
                      <label className="cq-label">Descrizione Prodotto/Servizio *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="cq-input"
                        placeholder="Es: Olio EVO DOP Puglia - 750ml"
                      />
                    </div>

                    <div className="cq-item__row">
                      <div className="cq-field">
                        <label className="cq-label">Quantità *</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', Number(e.target.value))
                          }
                          className="cq-input"
                        />
                      </div>

                      <div className="cq-field">
                        <label className="cq-label">
                          <Icon family="regular" name="euro-sign"  />
                          Prezzo Unitario *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(item.id, 'unitPrice', Number(e.target.value))
                          }
                          className="cq-input"
                        />
                      </div>

                      <div className="cq-field">
                        <label className="cq-label">
                          <Icon family="regular" name="percent"  />
                          IVA *
                        </label>
                        <select
                          value={item.vatRate}
                          onChange={(e) =>
                            handleItemChange(item.id, 'vatRate', Number(e.target.value))
                          }
                          className="cq-select"
                        >
                          {VAT_RATES.map((rate) => (
                            <option key={rate.value} value={rate.value}>
                              {rate.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="cq-field">
                        <label className="cq-label">Totale</label>
                        <div className="cq-item__total">€{item.total.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <div className="cq-summary">
            <h3 className="cq-summary__title">Riepilogo Preventivo</h3>

            {formData.companyName && (
              <div className="cq-summary__block">
                <p className="cq-summary__block-label">Cliente</p>
                <p className="cq-summary__client-name">{formData.companyName}</p>
                {formData.firstName && formData.lastName && (
                  <p className="cq-summary__client-person">
                    {formData.firstName} {formData.lastName}
                  </p>
                )}
                {formData.email && (
                  <p className="cq-summary__client-email">{formData.email}</p>
                )}
              </div>
            )}

            <div className="cq-summary__block">
              <div className="cq-summary__items-row">
                <span className="cq-summary__items-label">Numero voci</span>
                <span className="cq-summary__items-count">{formData.items.length}</span>
              </div>
            </div>

            <div className="cq-summary__block">
              <div className="cq-summary__meta">
                <div className="cq-summary__meta-row">
                  <Icon family="regular" name="calendar"  />
                  Validità: <strong>{formData.validityDays} giorni</strong>
                </div>
                <div className="cq-summary__meta-row">
                  <Icon family="regular" name="credit-card"  />
                  {formData.paymentMethod}
                </div>
              </div>
            </div>

            <div className="cq-summary__totals">
              <div className="cq-summary__total-row">
                <span className="cq-summary__total-label">Subtotale</span>
                <span className="cq-summary__total-value">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="cq-summary__total-row">
                <span className="cq-summary__total-label">IVA</span>
                <span className="cq-summary__total-value">€{totalVAT.toFixed(2)}</span>
              </div>
              <div className="cq-summary__total-row cq-summary__total-row--grand">
                <span className="cq-summary__total-label">Totale</span>
                <span className="cq-summary__total-value">€{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="cq-summary__actions">
              <button
                type="button"
                onClick={handleSendQuote}
                className="cq-summary__action cq-summary__action--primary"
              >
                <Icon family="regular" name="paper-plane"  />
                Invia Preventivo
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="cq-summary__action cq-summary__action--secondary"
              >
                <Icon family="regular" name="floppy-disk"  />
                Salva Bozza
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
