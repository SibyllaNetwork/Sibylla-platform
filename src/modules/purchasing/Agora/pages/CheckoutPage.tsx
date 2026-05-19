import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useVoucherParking } from '../context/VoucherParkingContext';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Button } from '../ds/button';
import { Icon } from '../ds/icon';
import { Input } from '../ds/input';
import { Label } from '../ds/label';
import { Field } from '../ds/field';
import { H3, P3 } from '../ds/typography';
import './CheckoutPage.css';

type PaymentMethod = 'bonifico' | 'carta' | 'wallet-aziendale' | 'wallet-personale';

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethod;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: 'bonifico',
    icon: 'building-columns',
    title: 'Bonifico bancario',
    description: 'Riceverai le coordinate IBAN via email dopo la conferma.',
  },
  {
    id: 'carta',
    icon: 'credit-card',
    title: 'Carta di credito',
    description: 'Visa, Mastercard o American Express. Pagamento sicuro.',
  },
  {
    id: 'wallet-aziendale',
    icon: 'briefcase',
    title: 'Wallet aziendale',
    description: 'Addebito sul plafond aziendale.',
  },
  {
    id: 'wallet-personale',
    icon: 'wallet',
    title: 'Wallet personale',
    description: 'Addebito sul tuo saldo personale.',
  },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { purchaseVoucher } = useVoucherParking();
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderCode] = useState(() => Math.random().toString(36).substring(2, 11).toUpperCase());
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bonifico');

  useEffect(() => {
    if (items.length === 0 && !orderCompleted) navigate('/cart');
  }, [items.length, orderCompleted, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mark any package items in the cart as purchased in the borsellino
    for (const item of items) {
      if (item.kind === 'package') {
        purchaseVoucher(item.voucherId);
      }
    }
    setOrderCompleted(true);
    clearCart();
  };

  if (orderCompleted) {
    return (
      <Layout>
        <PageHeader title="Checkout" subtitle="Ordine completato con successo" hideBack />
        <div className="checkout-success">
          <div className="checkout-success__icon">
            <Icon family="regular" name="circle-check" />
          </div>
          <H3>Ordine completato</H3>
          <P3>Grazie per il tuo ordine. Riceverai una conferma via email a breve.</P3>
          <P3>
            Numero ordine: <strong className="checkout-success__code">#{orderCode}</strong>
          </P3>
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            Torna alla home
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Checkout"
        subtitle="Completa i dati per confermare l'ordine"
        onBack={() => navigate('/cart')}
        backLabel="Torna al carrello"
      />

      <div className="checkout__grid">
        <form onSubmit={handleSubmit} className="checkout__form">
          <section className="checkout__section">
            <H3 className="checkout__section-title">Dati di spedizione</H3>

            <div className="checkout__fields">
              <Field className="checkout__field--full">
                <Label>Nome completo *</Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mario Rossi"
                />
              </Field>

              <Field>
                <Label>Email *</Label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="mario.rossi@example.com"
                />
              </Field>

              <Field>
                <Label>Telefono *</Label>
                <Input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                />
              </Field>

              <Field className="checkout__field--full">
                <Label>Indirizzo *</Label>
                <Input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Via Roma, 123"
                />
              </Field>

              <Field>
                <Label>Città *</Label>
                <Input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Milano"
                />
              </Field>

              <Field>
                <Label>CAP *</Label>
                <Input
                  type="text"
                  required
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="20100"
                />
              </Field>

              <Field className="checkout__field--full">
                <Label>Note aggiuntive</Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="checkout__textarea"
                  placeholder="Aggiungi note per la consegna..."
                />
              </Field>
            </div>
          </section>

          <section className="checkout__section">
            <H3 className="checkout__section-title">Metodo di pagamento</H3>
            <div className="checkout__payment-methods" role="radiogroup" aria-label="Metodo di pagamento">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = paymentMethod === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`checkout__payment-method${isSelected ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => setPaymentMethod(opt.id)}
                      className="checkout__payment-radio"
                    />
                    <span className="checkout__payment-method-icon">
                      <Icon family="regular" name={opt.icon} />
                    </span>
                    <span className="checkout__payment-method-info">
                      <span className="checkout__payment-method-title">{opt.title}</span>
                      <span className="checkout__payment-method-desc">{opt.description}</span>
                    </span>
                    <span className="checkout__payment-method-check" aria-hidden="true">
                      <Icon family="regular" name="circle-check" />
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="checkout__actions">
            <Button variant="primary" size="lg" type="submit">
              <Icon family="regular" name="circle-check" data-slot="icon" />
              Conferma ordine
            </Button>
          </div>
        </form>

        <aside className="checkout__summary">
          <H3 className="checkout__summary-title">Il tuo ordine</H3>

          <div className="checkout__summary-items">
            {items.map((item) => {
              const key = `${item.kind}-${item.id}`;
              let lineTotal: number;
              let calc: string;
              let imageSrc: string | undefined;
              let displayName: string;
              if (item.kind === 'stay') {
                lineTotal = item.pricePerNight * item.nights;
                calc = `${item.nights} ${item.nights === 1 ? 'notte' : 'notti'} × € ${item.pricePerNight.toFixed(2)}`;
                imageSrc = item.image;
                displayName = item.name;
              } else if (item.kind === 'package') {
                lineTotal = item.price;
                calc = `${item.nights} ${item.nights === 1 ? 'notte' : 'notti'} • Voucher ${item.code}`;
                imageSrc = undefined;
                displayName = item.title;
              } else {
                lineTotal = item.price * item.quantity;
                calc = `${item.quantity} × € ${item.price.toFixed(2)}`;
                imageSrc = item.image;
                displayName = item.name;
              }
              return (
                <div key={key} className="checkout__summary-item">
                  {imageSrc && (
                    <img src={imageSrc} alt={displayName} className="checkout__summary-image" />
                  )}
                  <div className="checkout__summary-info">
                    <p className="checkout__summary-name">{displayName}</p>
                    <p className="checkout__summary-calc">{calc}</p>
                  </div>
                  <p className="checkout__summary-total">€ {lineTotal.toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          <hr className="checkout__summary-divider" />

          <div className="checkout__summary-row">
            <P3>Subtotale</P3>
            <span>€ {totalPrice.toFixed(2)}</span>
          </div>
          <div className="checkout__summary-row checkout__summary-row--success">
            <P3>Spedizione</P3>
            <span>Gratis</span>
          </div>

          <hr className="checkout__summary-divider" />

          <div className="checkout__summary-total">
            <H3>Totale</H3>
            <span className="checkout__summary-total-value">€ {totalPrice.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
