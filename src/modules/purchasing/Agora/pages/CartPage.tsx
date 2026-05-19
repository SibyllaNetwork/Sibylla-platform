import { useNavigate } from 'react-router-dom';
import {
  useCart,
  type ProductCartItem,
  type StayCartItem,
  type PackageCartItem,
} from '../context/CartContext';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Button } from '../ds/button';
import { Icon } from '../ds/icon';
import { H3, P3, P4 } from '../ds/typography';
import './CartPage.css';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CartPage() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, updateStayNights, totalPrice, clearCart } = useCart();

  const products = items.filter((i): i is ProductCartItem => i.kind === 'product');
  const stays = items.filter((i): i is StayCartItem => i.kind === 'stay');
  const packages = items.filter((i): i is PackageCartItem => i.kind === 'package');

  if (items.length === 0) {
    return (
      <Layout>
        <PageHeader title="Carrello" hideBack />
        <div className="cart-empty">
          <div className="cart-empty__icon">
            <Icon family="regular" name="cart-shopping" />
          </div>
          <H3 className="cart-empty__title">Il tuo carrello è vuoto</H3>
          <P3 className="cart-empty__text">Aggiungi prodotti o soggiorni al carrello per procedere</P3>
          <div className="cart-empty__actions">
            <Button variant="primary" size="lg" onClick={() => navigate('/accommodations')}>
              <Icon family="regular" name="bed" data-slot="icon" />
              Strutture ricettive
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/categories')}>
              <Icon family="regular" name="grid-2" data-slot="icon" />
              Area merceologica
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Carrello"
        subtitle={`${items.length} ${items.length === 1 ? 'elemento' : 'elementi'} nel carrello`}
        hideBack
        actions={
          <Button variant="reject-tertiary" size="md" onClick={clearCart}>
            <Icon family="regular" name="trash" data-slot="icon" />
            Svuota carrello
          </Button>
        }
      />

      <div className="cart-page__grid">
        <div className="cart-page__items">
          {stays.length > 0 && (
            <section className="cart-section">
              <header className="cart-section__head">
                <Icon family="regular" name="bed" className="cart-section__icon" />
                <H3>Soggiorni</H3>
                <span className="cart-section__count">{stays.length}</span>
              </header>
              <div className="cart-section__body">
                {stays.map((s) => (
                  <article key={`stay-${s.id}`} className="cart-item">
                    <img src={s.image} alt={s.name} className="cart-item__image" />
                    <div className="cart-item__body">
                      <div className="cart-item__head">
                        <div>
                          <H3 className="cart-item__name">{s.name}</H3>
                          <P3 className="cart-item__meta">
                            <Icon family="regular" name="location-dot" /> {s.location}
                          </P3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(s.id)}
                          className="cart-item__remove"
                          aria-label="Rimuovi"
                        >
                          <Icon family="regular" name="trash" />
                        </button>
                      </div>

                      <dl className="cart-item__stay-details">
                        <div>
                          <dt>Check-in</dt>
                          <dd>{formatDate(s.checkIn)}</dd>
                        </div>
                        <div>
                          <dt>Check-out</dt>
                          <dd>{formatDate(s.checkOut)}</dd>
                        </div>
                        <div>
                          <dt>Ospiti</dt>
                          <dd>
                            {s.adults} {s.adults === 1 ? 'adulto' : 'adulti'}
                            {s.children > 0 ? `, ${s.children} bambini` : ''}
                          </dd>
                        </div>
                        <div>
                          <dt>Camera</dt>
                          <dd>{s.rooms}</dd>
                        </div>
                      </dl>

                      <div className="cart-item__footer">
                        <div className="cart-item__qty">
                          <button
                            type="button"
                            onClick={() => updateStayNights(s.id, s.nights - 1)}
                            className="cart-item__qty-btn"
                            aria-label="Riduci notti"
                          >
                            <Icon family="regular" name="minus" />
                          </button>
                          <span className="cart-item__qty-value">{s.nights}</span>
                          <button
                            type="button"
                            onClick={() => updateStayNights(s.id, s.nights + 1)}
                            className="cart-item__qty-btn"
                            aria-label="Aumenta notti"
                          >
                            <Icon family="regular" name="plus" />
                          </button>
                          <span className="cart-item__unit">
                            {s.nights === 1 ? 'notte' : 'notti'}
                          </span>
                        </div>
                        <div className="cart-item__totals">
                          <P3 className="cart-item__calc">
                            € {s.pricePerNight.toFixed(2)} × {s.nights}
                          </P3>
                          <span className="cart-item__total">
                            € {(s.pricePerNight * s.nights).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {packages.length > 0 && (
            <section className="cart-section">
              <header className="cart-section__head">
                <Icon family="regular" name="box" className="cart-section__icon" />
                <H3>Pacchetti dinamici</H3>
                <span className="cart-section__count">{packages.length}</span>
              </header>
              <div className="cart-section__body">
                {packages.map((p) => (
                  <article key={`pkg-${p.id}`} className="cart-item cart-item--pkg">
                    <div className="cart-item__body">
                      <div className="cart-item__head">
                        <div>
                          <H3 className="cart-item__name">{p.title}</H3>
                          <P3 className="cart-item__meta">
                            <Icon family="regular" name="ticket" /> {p.code}
                            {p.location ? <> · <Icon family="regular" name="location-dot" /> {p.location}</> : null}
                          </P3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(p.id)}
                          className="cart-item__remove"
                          aria-label="Rimuovi"
                        >
                          <Icon family="regular" name="trash" />
                        </button>
                      </div>

                      <ul className="cart-item__services">
                        {p.services.map((s, i) => (
                          <li key={i}>
                            <strong>{s.categoryLabel}:</strong> {s.label}
                            {s.venue ? <> — {s.venue}</> : null}
                          </li>
                        ))}
                      </ul>

                      <div className="cart-item__footer">
                        <P3 className="cart-item__calc">
                          {p.nights} {p.nights === 1 ? 'notte' : 'notti'}
                          {p.adults
                            ? ` · ${p.adults} ${p.adults === 1 ? 'adulto' : 'adulti'}`
                            : ''}
                          {p.children && p.children > 0
                            ? `, ${p.children} ${p.children === 1 ? 'bambino' : 'bambini'}`
                            : ''}
                        </P3>
                        <span className="cart-item__total">€ {p.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section className="cart-section">
              <header className="cart-section__head">
                <Icon family="regular" name="box-open" className="cart-section__icon" />
                <H3>Prodotti</H3>
                <span className="cart-section__count">{products.length}</span>
              </header>
              <div className="cart-section__body">
                {products.map((p) => (
                  <article key={`product-${p.id}`} className="cart-item">
                    <img src={p.image} alt={p.name} className="cart-item__image" />
                    <div className="cart-item__body">
                      <div className="cart-item__head">
                        <div>
                          <H3 className="cart-item__name">{p.name}</H3>
                          <P3 className="cart-item__meta">{p.supplier}</P3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(p.id)}
                          className="cart-item__remove"
                          aria-label="Rimuovi"
                        >
                          <Icon family="regular" name="trash" />
                        </button>
                      </div>

                      <div className="cart-item__footer">
                        <div className="cart-item__qty">
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, p.quantity - 1)}
                            className="cart-item__qty-btn"
                            aria-label="Riduci quantità"
                          >
                            <Icon family="regular" name="minus" />
                          </button>
                          <span className="cart-item__qty-value">{p.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, p.quantity + 1)}
                            className="cart-item__qty-btn"
                            aria-label="Aumenta quantità"
                          >
                            <Icon family="regular" name="plus" />
                          </button>
                          <span className="cart-item__unit">{p.unit}</span>
                        </div>
                        <div className="cart-item__totals">
                          <P3 className="cart-item__calc">
                            € {p.price.toFixed(2)} × {p.quantity}
                          </P3>
                          <span className="cart-item__total">
                            € {(p.price * p.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="cart-summary">
          <H3 className="cart-summary__title">Riepilogo ordine</H3>

          {stays.length > 0 && (
            <div className="cart-summary__row">
              <P4>Soggiorni</P4>
              <span>
                € {stays.reduce((sum, s) => sum + s.pricePerNight * s.nights, 0).toFixed(2)}
              </span>
            </div>
          )}
          {products.length > 0 && (
            <div className="cart-summary__row">
              <P4>Prodotti</P4>
              <span>
                € {products.reduce((sum, p) => sum + p.price * p.quantity, 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="cart-summary__row cart-summary__row--success">
            <P3>Spese di spedizione</P3>
            <span>Gratis</span>
          </div>

          <hr className="cart-summary__divider" />

          <div className="cart-summary__total-row">
            <H3>Totale</H3>
            <span className="cart-summary__total-value">€ {totalPrice.toFixed(2)}</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="cart-summary__checkout"
            onClick={() => navigate('/checkout')}
          >
            Procedi al checkout
            <Icon family="regular" name="arrow-right" data-slot="icon" />
          </Button>
        </aside>
      </div>
    </Layout>
  );
}
