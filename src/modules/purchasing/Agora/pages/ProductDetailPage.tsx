import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Button } from '../ds/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Icon } from '../ds/icon';
import { useCart } from '../context/CartContext';
import './ProductDetailPage.css';

interface ProductData {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  orderNumber: string;
  imageUrl: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  specifications: Array<{ label: string; value: string }>;
  features: string[];
}

const productDetails: Record<string, ProductData> = {
  v1: {
    id: 'v1',
    name: 'H. LANVIN & FILS',
    description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs',
    longDescription:
      'Un champagne eccezionale della prestigiosa Maison H. Lanvin & Fils, prodotto esclusivamente da uve Chardonnay provenienti da vigneti Grand Cru. La tecnica "Dosage Zero" garantisce un gusto puro e autentico, senza aggiunta di zuccheri, rivelando la vera essenza del terroir champenois.',
    price: 355.55,
    orderNumber: '0008966',
    imageUrl:
      'https://images.unsplash.com/photo-1648838449951-50dc859ef442?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.8,
    reviews: 127,
    inStock: true,
    specifications: [
      { label: 'Origine', value: 'Champagne, Francia' },
      { label: 'Produttore', value: 'H. Lanvin & Fils' },
      { label: 'Tipologia', value: 'Champagne Brut Grand Cru' },
      { label: 'Vitigno', value: '100% Chardonnay' },
      { label: 'Gradazione', value: '12.5% vol.' },
      { label: 'Formato', value: '750 ml' },
      { label: 'Temperatura servizio', value: '6-8°C' },
    ],
    features: [
      'Dosage Zero - senza aggiunta di zuccheri',
      'Uve provenienti da vigneti Grand Cru',
      'Affinamento minimo 36 mesi',
      'Note di agrumi, pane tostato e mandorle',
      'Perfetto per aperitivi e cene eleganti',
      'Certificazione biologica',
    ],
  },
  v2: {
    id: 'v2',
    name: 'M.HOSTOMME',
    description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"',
    longDescription:
      'Un champagne rosé unico nel suo genere, prodotto con il metodo de saignée esclusivamente da uve Pinot Meunier. Il nome "3300" rappresenta il numero di viti presenti nel vigneto di origine.',
    price: 285.0,
    orderNumber: '0008967',
    imageUrl:
      'https://images.unsplash.com/photo-1652188907697-1999f41ad5b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
    rating: 4.9,
    reviews: 89,
    inStock: true,
    specifications: [
      { label: 'Origine', value: 'Champagne, Francia' },
      { label: 'Produttore', value: 'M. Hostomme' },
      { label: 'Tipologia', value: 'Champagne Rosé Brut Nature' },
      { label: 'Vitigno', value: '100% Pinot Meunier' },
      { label: 'Gradazione', value: '12% vol.' },
      { label: 'Formato', value: '750 ml' },
      { label: 'Temperatura servizio', value: '7-9°C' },
    ],
    features: [
      'Metodo de Saignée per massima concentrazione',
      'Uve da singolo vigneto (3300 viti)',
      'Brut Nature - zero dosaggio',
      'Note di fragola, ciliegia e spezie',
      'Ideale con pesce crudo e tartare',
      'Produzione limitata',
    ],
  },
};

export function ProductDetailPage() {
  const { categoryId, productClassId, productId } = useParams<{
    categoryId: string;
    productClassId: string;
    productId: string;
  }>();
  const navigate = useNavigate();
  const { addProduct } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications'>('description');
  const [addedToCart, setAddedToCart] = useState(false);

  const product = productDetails[productId || 'v1'];

  if (!product) {
    return (
      <Layout>
        <div className="product-detail__not-found">
          <p className="product-detail__not-found-text">Prodotto non trovato</p>
          <Button
            variant="primary"
            size="md"
            onClick={() =>
              navigate(`/category/${categoryId}/products/${productClassId}`)
            }
          >
            Torna alla lista
          </Button>
        </div>
      </Layout>
    );
  }

  const handleAddToCart = () => {
    addProduct(
      {
        id: product.id,
        categoryId: categoryId || '',
        productClassId: productClassId || '',
        name: product.name,
        supplier: product.orderNumber,
        price: product.price,
        image: product.imageUrl,
        unit: 'Bottiglia',
      },
      quantity,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  return (
    <Layout>
      <PageHeader
        title={product.name}
        subtitle={product.description}
        onBack={() => navigate(`/category/${categoryId}/products/${productClassId}`)}
        backLabel="Torna alla lista prodotti"
      />

      <div className="product-detail__grid">
        <div className="product-detail__media">
          <div className="product-detail__image-wrap">
            <ImageWithFallback
              src={product.imageUrl}
              alt={product.name}
              className="product-detail__image"
            />
            {product.inStock && (
              <div className="product-detail__stock">
                <Icon family="regular" name="check"  />
                <span>Disponibile</span>
              </div>
            )}
          </div>

          <div className="product-detail__badges">
            <div className="trust-badge">
              <div className="trust-badge__icon">
                <Icon family="regular" name="truck"  />
              </div>
              <div className="trust-badge__text">Spedizione Gratuita</div>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon">
                <Icon family="regular" name="shield"  />
              </div>
              <div className="trust-badge__text">Garanzia 24 mesi</div>
            </div>
            <div className="trust-badge">
              <div className="trust-badge__icon">
                <Icon family="regular" name="award"  />
              </div>
              <div className="trust-badge__text">Certificato</div>
            </div>
          </div>
        </div>

        <div>
          <div className="product-detail__rating">
            <div className="product-detail__stars">
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  family="solid"
                  name="star"
                  className={i < Math.floor(product.rating) ? '' : 'product-detail__star--dim'}
                />
              ))}
            </div>
            <span className="product-detail__rating-value">{product.rating}</span>
            <span className="product-detail__reviews">({product.reviews} recensioni)</span>
          </div>

          <div className="product-detail__code">
            <span className="product-detail__code-label">Codice prodotto:</span>
            <span className="product-detail__code-value">{product.orderNumber}</span>
          </div>

          <div className="product-detail__price-box">
            <div className="product-detail__price-row">
              <span className="product-detail__price">{product.price.toFixed(2)}€</span>
              <span className="product-detail__iva">IVA inclusa</span>
            </div>
            <div className="product-detail__price-note">
              ✓ Prezzo bloccato fino al 31/12/2026
            </div>
          </div>

          <label className="product-detail__qty-label">Seleziona quantità:</label>
          <div className="product-detail__qty-row">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="product-detail__qty-btn"
            >
              <Icon family="regular" name="minus"  />
            </button>
            <div className="product-detail__qty-value">{quantity}</div>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="product-detail__qty-btn"
            >
              <Icon family="regular" name="plus"  />
            </button>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            className="btn--full"
            icon={<Icon family="regular" name="cart-shopping"  />}
          >
            Aggiungi al Carrello - {(product.price * quantity).toFixed(2)}€
          </Button>

          {addedToCart && (
            <div className="product-detail__feedback">
              <Icon family="regular" name="check" className="product-detail__feedback-icon" />
              <div>
                <p className="product-detail__feedback-text">Prodotto aggiunto al carrello!</p>
                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  className="product-detail__feedback-link"
                >
                  Vai al carrello
                </button>
              </div>
            </div>
          )}

          <Button
            variant="secondary"
            size="lg"
            className="btn--full"
            onClick={() => {
              handleAddToCart();
              navigate('/cart');
            }}
          >
            Acquista Ora
          </Button>
        </div>
      </div>

      <div className="product-detail__tabs">
        <div className="product-detail__tabs-head">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`product-detail__tab${activeTab === 'description' ? ' product-detail__tab--active' : ''}`}
          >
            Descrizione
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specifications')}
            className={`product-detail__tab${activeTab === 'specifications' ? ' product-detail__tab--active' : ''}`}
          >
            Specifiche Tecniche
          </button>
        </div>

        <div className="product-detail__tabs-body">
          {activeTab === 'description' && (
            <>
              <p className="product-detail__long">{product.longDescription}</p>
              <h3 className="product-detail__section-title">Caratteristiche principali:</h3>
              <div className="product-detail__features">
                {product.features.map((feature) => (
                  <div key={feature} className="product-detail__feature">
                    <span className="product-detail__feature-icon">
                      <Icon family="regular" name="check"  />
                    </span>
                    <span className="product-detail__feature-text">{feature}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'specifications' && (
            <>
              <h3 className="product-detail__section-title">Specifiche Tecniche</h3>
              <div className="product-detail__specs">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="product-detail__spec">
                    <div className="product-detail__spec-label">{spec.label}</div>
                    <div className="product-detail__spec-value">{spec.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
