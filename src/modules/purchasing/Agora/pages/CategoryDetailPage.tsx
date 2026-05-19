import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Button } from '../ds/button';
import { categoryData, slugifySupplier } from '../data/categories';
import { Icon } from '../ds/icon';
import './CategoryDetailPage.css';

function getProductSlug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function hasProductData(name: string): boolean {
  return getProductSlug(name) === 'vini';
}

export function CategoryDetailPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const category = categoryData[Number(categoryId) || 1];

  if (!category) {
    return (
      <Layout>
        <div className="category-not-found">
          <p className="category-not-found__text">Categoria non trovata</p>
          <Button variant="primary" size="md" onClick={() => navigate('/')}>
            Torna alle categorie
          </Button>
        </div>
      </Layout>
    );
  }

  const handleProductClick = (productName: string) => {
    if (hasProductData(productName)) {
      navigate(`/category/${categoryId}/products/${getProductSlug(productName)}`);
    }
  };

  const handleSupplierClick = (supplierName: string) => {
    navigate(`/supplier/${slugifySupplier(supplierName)}`);
  };

  return (
    <Layout>
      <PageHeader
        title={category.name}
        subtitle={`Esplora ${category.classes.length} classi merceologiche e ${category.suppliers.length} fornitori verificati per questa categoria`}
        onBack={() => navigate('/categories')}
        backLabel="Torna alle categorie"
      />

      <div className="category-hero__stats">
        <span className="category-hero__chip">
          <Icon family="regular" name="boxes-stacked" className="category-hero__chip-icon" />
          {category.classes.length} Classi
        </span>
        <span className="category-hero__chip">
          <Icon family="regular" name="store" className="category-hero__chip-icon" />
          {category.suppliers.length} Fornitori
        </span>
        <span className="category-hero__chip">
          <Icon family="regular" name="circle-check"
            className="category-hero__chip-icon category-hero__chip-icon--success" />
          Certificati
        </span>
      </div>

      <div className="category-detail__grid">
        <aside className="category-detail__side">
          <section className="category-panel">
            <header className="category-panel__head">
              <span className="category-panel__icon">
                <Icon family="regular" name="store"  />
              </span>
              <div>
                <h2 className="category-panel__title">Fornitori</h2>
                <p className="category-panel__subtitle">
                  {category.suppliers.length} partner certificati
                </p>
              </div>
            </header>

            <ul className="supplier-list">
              {category.suppliers.map((supplier, index) => {
                const initials = supplier.substring(0, 2).toUpperCase();
                const hue = index % 6;
                return (
                  <li key={supplier}>
                    <button
                      type="button"
                      className="supplier-list__item"
                      onClick={() => handleSupplierClick(supplier)}
                    >
                      <span className="supplier-list__avatar" data-hue={hue}>
                        {initials}
                      </span>
                      <span className="supplier-list__body">
                        <span className="supplier-list__name">{supplier}</span>
                        <span className="supplier-list__badge">
                          <Icon family="regular" name="circle-check"
                            className="supplier-list__badge-icon" />
                          <span className="supplier-list__badge-text">Verificato</span>
                        </span>
                      </span>
                      <Icon family="regular" name="arrow-right"
                        className="supplier-list__chevron" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="category-info-card">
            <div className="category-info-card__head">
              <span className="category-info-card__icon">
                <Icon family="regular" name="award"  />
              </span>
              <div>
                <h3 className="category-info-card__title">Qualità Garantita</h3>
                <p className="category-info-card__desc">
                  Tutti i fornitori sono certificati e verificati dal nostro team
                </p>
              </div>
            </div>
          </section>
        </aside>

        <section className="classes-panel">
          <header className="classes-panel__head">
            <span className="category-panel__icon">
              <Icon family="regular" name="boxes-stacked"  />
            </span>
            <div>
              <h2 className="classes-panel__title">Classi Merceologiche</h2>
              <p className="classes-panel__subtitle">
                {category.classes.length} categorie disponibili
              </p>
            </div>
          </header>

          <div className="classes-grid">
            {category.classes.map((classItem) => (
              <article key={classItem.title} className="class-card">
                <div className="class-card__title-row">
                  <span className="class-card__accent" />
                  <h3 className="class-card__title">{classItem.title}</h3>
                </div>

                <span className="class-card__counter">
                  <span className="class-card__counter-dot" />
                  <span className="class-card__counter-text">
                    {classItem.items.length} prodotti
                  </span>
                </span>

                <ul className="class-card__items">
                  {classItem.items.slice(0, 5).map((item) => {
                    const clickable = hasProductData(item.name);
                    const modifier = item.isBold ? 'class-card__item--bold' : '';
                    const clickableClass = clickable ? 'class-card__item--clickable' : '';
                    return (
                      <li key={item.name}>
                        <button
                          type="button"
                          onClick={() => handleProductClick(item.name)}
                          disabled={!clickable}
                          className={['class-card__item', modifier, clickableClass]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <Icon family="regular" name="circle-check"
                            className="class-card__item-icon" />
                          <span className="class-card__item-text">{item.name}</span>
                        </button>
                      </li>
                    );
                  })}
                  {classItem.items.length > 5 && (
                    <li className="class-card__more">
                      +{classItem.items.length - 5} altri...
                    </li>
                  )}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="category-cta">
        <div className="category-cta__left">
          <span className="category-cta__icon">
            <Icon family="regular" name="arrow-trend-up"  />
          </span>
          <div>
            <h3 className="category-cta__title">Non trovi quello che cerchi?</h3>
            <p className="category-cta__desc">
              Contattaci per richiedere un nuovo fornitore o classe merceologica
            </p>
          </div>
        </div>
        <Button variant="secondary" size="lg">
          Contattaci
        </Button>
      </section>
    </Layout>
  );
}
