import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Button } from '../ds/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Icon } from '../ds/icon';
import { PageToolbar, type ViewMode } from './PageToolbar';
import { useCart } from '../context/CartContext';
import './ProductListPage.css';

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'price-asc',  label: 'Prezzo crescente' },
  { value: 'price-desc', label: 'Prezzo decrescente' },
];

const DEFAULT_SORT: SortKey = 'name-asc';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  orderNumber: string;
  imageUrl: string;
}

interface ProductClass {
  categoryId: number;
  categoryName: string;
  className: string;
  products: ProductItem[];
}

const productsData: Record<string, ProductClass> = {
  vini: {
    categoryId: 1,
    categoryName: 'Alimenti, Ristorazione e Buoni Pasto',
    className: 'Vini',
    products: [
      { id: 'v1', name: 'H. LANVIN & FILS', description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs', price: 355.55, orderNumber: '0008966', imageUrl: 'https://images.unsplash.com/photo-1648838449951-50dc859ef442?w=1080' },
      { id: 'v2', name: 'M.HOSTOMME', description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"', price: 285.0, orderNumber: '0008967', imageUrl: 'https://images.unsplash.com/photo-1652188907697-1999f41ad5b8?w=1080' },
      { id: 'v3', name: 'IL AMORE & FILS', description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs', price: 420.0, orderNumber: '0008968', imageUrl: 'https://images.unsplash.com/photo-1695048475525-11eab42ad873?w=1080' },
      { id: 'v4', name: 'M.HOSTOMME', description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"', price: 312.8, orderNumber: '0008969', imageUrl: 'https://images.unsplash.com/photo-1761757225438-711aa1bbf8d9?w=1080' },
      { id: 'v5', name: 'MAISON VALLÉE', description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs', price: 398.5, orderNumber: '0008970', imageUrl: 'https://images.unsplash.com/photo-1648838449951-50dc859ef442?w=1080' },
      { id: 'v6', name: 'M.HOSTOMME', description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"', price: 275.0, orderNumber: '0008971', imageUrl: 'https://images.unsplash.com/photo-1652188907697-1999f41ad5b8?w=1080' },
      { id: 'v7', name: 'H. LANVIN & FILS', description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs', price: 355.55, orderNumber: '0008972', imageUrl: 'https://images.unsplash.com/photo-1695048475525-11eab42ad873?w=1080' },
      { id: 'v8', name: 'M.HOSTOMME', description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"', price: 285.0, orderNumber: '0008973', imageUrl: 'https://images.unsplash.com/photo-1761757225438-711aa1bbf8d9?w=1080' },
      { id: 'v9', name: 'IL LANVIN & FILS', description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs', price: 340.0, orderNumber: '0008974', imageUrl: 'https://images.unsplash.com/photo-1648838449951-50dc859ef442?w=1080' },
      { id: 'v10', name: 'M.HOSTOMME', description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"', price: 295.0, orderNumber: '0008975', imageUrl: 'https://images.unsplash.com/photo-1652188907697-1999f41ad5b8?w=1080' },
      { id: 'v11', name: 'H. LANVIN & FILS', description: 'Champagne Brut Grand Cru "Dosage Zero" Blanc de Blancs', price: 355.55, orderNumber: '0008976', imageUrl: 'https://images.unsplash.com/photo-1695048475525-11eab42ad873?w=1080' },
      { id: 'v12', name: 'M.HOSTOMME', description: 'Champagne Rosé de Saignée Brut Nature "3300 Meunier"', price: 285.0, orderNumber: '0008977', imageUrl: 'https://images.unsplash.com/photo-1761757225438-711aa1bbf8d9?w=1080' },
    ],
  },
};

export function ProductListPage() {
  const { categoryId, productClassId } = useParams<{ categoryId: string; productClassId: string }>();
  const navigate = useNavigate();
  const { addProduct } = useCart();
  const [walletType, setWalletType] = useState<'personal' | 'business'>('personal');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const data = productsData[productClassId || 'vini'];

  const displayed = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.products.filter(
      (p) =>
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.orderNumber.toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.name.localeCompare(b.name);
        case 'name-desc':  return b.name.localeCompare(a.name);
        case 'price-asc':  return a.price - b.price;
        case 'price-desc': return b.price - a.price;
      }
    });
  }, [data, search, sortBy]);

  const filtersDirty = sortBy !== DEFAULT_SORT;
  const resetFilters = () => setSortBy(DEFAULT_SORT);

  if (!data) {
    return (
      <Layout>
        <div className="product-list__not-found">
          <p className="product-list__not-found-text">Classe merceologica non trovata</p>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(`/category/${categoryId}`)}
          >
            Torna alla categoria
          </Button>
        </div>
      </Layout>
    );
  }

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };

  const handleAddToCart = (productId: string) => {
    if (!data) return;
    const quantity = quantities[productId] || 0;
    if (quantity <= 0) return;
    const product = data.products.find((p) => p.id === productId);
    if (!product) return;
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
    setQuantities((prev) => ({ ...prev, [productId]: 0 }));
    setLastAddedId(productId);
    window.setTimeout(() => setLastAddedId((curr) => (curr === productId ? null : curr)), 2000);
  };

  return (
    <Layout>
      <PageHeader
        title="Elenco prodotti"
        subtitle={`${data.categoryName} › ${data.className}`}
        onBack={() => navigate(`/category/${categoryId}`)}
      />

      <div className="product-list__breadcrumb">
        <button type="button" onClick={() => navigate('/')} className="product-list__crumb">
          Area merceologica
        </button>
        <span className="product-list__sep">›</span>
        <button
          type="button"
          onClick={() => navigate(`/category/${categoryId}`)}
          className="product-list__crumb"
        >
          {data.categoryName}
        </button>
        <span className="product-list__sep">›</span>
        <span className="product-list__crumb product-list__crumb--current">{data.className}</span>
      </div>

      <div className="product-list__wallet">
        <button
          type="button"
          onClick={() => setWalletType('personal')}
          className={`product-list__wallet-btn${walletType === 'personal' ? ' product-list__wallet-btn--active' : ''}`}
        >
          <Icon family="regular" name="wallet"  />
          Wallet personale
        </button>
        <button
          type="button"
          onClick={() => setWalletType('business')}
          className={`product-list__wallet-btn${walletType === 'business' ? ' product-list__wallet-btn--active' : ''}`}
        >
          <Icon family="regular" name="wallet"  />
          Wallet aziendale
        </button>
      </div>

      <div className="product-list__company">
        <div className="product-list__company-name">Tornico Srl Corso Barthoudi,</div>
        <div className="product-list__company-details">
          <div>89 20121 Milano, Italia</div>
          <div>Capitale sociale 186.837,42 i.v.</div>
          <div>CF/P.IVA: IT07344470960</div>
        </div>
      </div>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Cerca prodotto…',
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
                    name="products-sortBy"
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
        className={`product-list__grid${view === 'list' ? ' product-list__grid--list' : ''}`}
      >
        {displayed.map((product) => (
          <article key={product.id} className="product-tile">
            <div className="product-tile__image-wrap">
              <ImageWithFallback
                src={product.imageUrl}
                alt={product.name}
                className="product-tile__image"
              />
              <button
                type="button"
                onClick={() =>
                  navigate(`/category/${categoryId}/products/${productClassId}/${product.id}`)
                }
                className="product-tile__eye"
                aria-label="Dettaglio prodotto"
              >
                <Icon family="regular" name="eye"  />
              </button>
            </div>

            <div className="product-tile__body">
              <h3 className="product-tile__name">{product.name}</h3>
              <p className="product-tile__desc">{product.description}</p>

              <div className="product-tile__order">
                <span className="product-tile__order-label">N° ordine:</span>
                <span className="product-tile__order-value">{product.orderNumber}</span>
              </div>

              <p className="product-tile__price">{product.price.toFixed(2)}€</p>

              <div className="product-tile__qty">
                <span className="product-tile__qty-label">Quantità:</span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(product.id, -1)}
                  className="product-tile__qty-btn"
                >
                  <Icon family="regular" name="minus"  />
                </button>
                <div className="product-tile__qty-value">{quantities[product.id] || 0}</div>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(product.id, 1)}
                  className="product-tile__qty-btn"
                >
                  <Icon family="regular" name="plus"  />
                </button>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleAddToCart(product.id)}
                disabled={!quantities[product.id] || quantities[product.id] === 0}
                className="btn--full"
                icon={<Icon family="regular" name={lastAddedId === product.id ? 'check' : 'cart-shopping'}  />}
              >
                {lastAddedId === product.id ? 'Aggiunto' : 'Aggiungi al Carrello'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  );
}
