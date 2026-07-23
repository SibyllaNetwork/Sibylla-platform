import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Layout } from './Layout';
import { Icon } from '../ds/icon';
import { Slider } from '../ds/slider';
import { Field } from '../ds/field';
import {
  DsButton,
  DsInput,
  DsLabel,
  DsH3,
  DsP3,
  DsPageHeader,
} from './dpDs';
import { LocationMap } from './LocationMap';
import {
  useVoucherParking,
  type VoucherPackage,
  type VoucherService,
  type VoucherStatus,
  type VoucherStay,
} from '../context/VoucherParkingContext';
import { useCart } from '../context/CartContext';
import {
  useDynamicPackagesConfig,
  type DPCategory,
  type DPSubcategory,
  type DPTheme,
} from '../context/DynamicPackagesConfigContext';
import { useCatalogoStore } from '../../../../store/useCatalogoStore';
import { useNavigate } from 'react-router-dom';
import './DynamicPackagesPage.css';

const CATALOG_CATEGORY_ID = '__catalog__';

type Subcategory = DPSubcategory;
type Category = DPCategory;

type ConstellationPhase = 'idle' | 'drawing' | 'done';

export function DynamicPackagesPage() {
  const navigate = useNavigate();
  const { vouchers, addVoucher, removeVoucher, markInCart, purchaseVoucher, hasVoucher } =
    useVoucherParking();
  const { addPackage, totalItems, totalPrice } = useCart();
  const { categories: configCategories, themes: PACKAGE_THEMES, params, isCatalogProductEnabled } =
    useDynamicPackagesConfig();

  // Prodotti, fornitori e categorie merceologiche dal catalogo globale.
  const catalogProdotti  = useCatalogoStore((s) => s.prodotti);
  const catalogFornitori = useCatalogoStore((s) => s.fornitori);
  const catalogCategorie = useCatalogoStore((s) => s.categorie);

  // Categoria sintetica "Prodotti merceologici" generata dai prodotti del
  // catalogo abilitati nella sezione pacchetti dal pannello admin.
  const catalogCategory = useMemo<Category | null>(() => {
    const subs: Subcategory[] = catalogProdotti
      .filter((p) => p.attivo && p.pubblicato && isCatalogProductEnabled(p.id))
      .map((p) => {
        const f = catalogFornitori.find((x) => x.id === p.fornitoreId);
        const c = catalogCategorie.find((x) => x.id === p.categoriaId);
        return {
          id: `cat-prod-${p.id}`,
          label: p.nome,
          icon: c?.icona?.replace(/^fa-/, '') || 'bag-shopping',
          venue: f?.nome ?? '—',
          address: f ? [f.indirizzo, f.citta].filter(Boolean).join(', ') : '',
        };
      });
    if (subs.length === 0) return null;
    return {
      id: CATALOG_CATEGORY_ID,
      title: 'Prodotti merceologici',
      icon: 'bag-shopping',
      accent: 'services',
      subcategories: subs,
    };
  }, [catalogProdotti, catalogFornitori, catalogCategorie, isCatalogProductEnabled]);

  // Categorie effettive viste dall'utente = quelle del context + categoria
  // sintetica del catalogo (in coda).
  const CATEGORIES = useMemo(
    () => (catalogCategory ? [...configCategories, catalogCategory] : configCategories),
    [configCategories, catalogCategory],
  );

  // Mappa "id sotto-categoria → { sub, cat }" derivata da CATEGORIES.
  const SUB_INDEX = useMemo(() => {
    const idx: Record<string, { sub: Subcategory; cat: Category }> = {};
    for (const c of CATEGORIES) {
      for (const s of c.subcategories) idx[s.id] = { sub: s, cat: c };
    }
    return idx;
  }, [CATEGORIES]);

  const generatePackages = useCallback(
    (selected: VoucherService[], budget: number, stay: VoucherStay): VoucherPackage[] => {
      const ts = Date.now();
      const baseCode = ts.toString(36).slice(-5).toUpperCase();
      return PACKAGE_THEMES.map((t: DPTheme, i: number) => ({
        id: `pkg-${ts}-${i}`,
        title: t.name,
        description: t.description,
        services: selected,
        price: Math.max(0, Math.min(budget, Math.round(budget * t.factor))),
        nights: t.nights,
        code: `PKD-${baseCode}-${(i + 1).toString().padStart(2, '0')}`,
        stay,
      }));
    },
    [PACKAGE_THEMES],
  );

  const voucherStatusFor = (id: string): VoucherStatus | undefined =>
    vouchers.find((v) => v.id === id)?.status;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [budget, setBudget] = useState(params.budgetDefault);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [mapOpen, setMapOpen] = useState(false);
  const [adults, setAdults] = useState<number>(params.defaultAdults);
  const [children, setChildren] = useState<number>(params.defaultChildren);
  const [results, setResults] = useState<VoucherPackage[]>([]);
  const [analyzed, setAnalyzed] = useState(0);   // n. fornitori "analizzati" (mostrato nei risultati)
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [constellationPhase, setConstellationPhase] = useState<ConstellationPhase>('idle');
  const drawTimerRef = useRef<number | null>(null);

  const selectedServices: VoucherService[] = useMemo(
    () =>
      Array.from(selectedSubs)
        .map((id) => SUB_INDEX[id])
        .filter(Boolean)
        .map(({ sub, cat }) => ({
          id: sub.id,
          label: sub.label,
          categoryId: cat.id,
          categoryLabel: cat.title,
        })),
    [selectedSubs, SUB_INDEX],
  );

  // Categorie distinte tra i servizi scelti — alimentano l'animazione di caricamento
  const loadingCats = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; title: string; icon: string }[] = [];
    for (const s of selectedServices) {
      if (seen.has(s.categoryId)) continue;
      seen.add(s.categoryId);
      const cat = CATEGORIES.find((c) => c.id === s.categoryId);
      out.push({ id: s.categoryId, title: s.categoryLabel, icon: cat?.icon ?? 'box' });
    }
    return out;
  }, [selectedServices, CATEGORIES]);

  // Mappa "id categoria → icona" per i nodi della costellazione.
  const categoryIcons = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon])) as Record<string, string>,
    [CATEGORIES],
  );

  const toggleCat = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSub = (id: string) =>
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Whenever filters change, invalidate results and re-collapse the constellation.
  useEffect(() => {
    if (drawTimerRef.current != null) {
      window.clearTimeout(drawTimerRef.current);
      drawTimerRef.current = null;
    }
    setResults([]);
    setConstellationPhase('idle');
  }, [selectedSubs, budget, dateFrom, dateTo, location, adults, children]);

  // Clear any pending draw timeout on unmount.
  useEffect(
    () => () => {
      if (drawTimerRef.current != null) window.clearTimeout(drawTimerRef.current);
    },
    [],
  );

  const handleSearch = () => {
    setAnalyzed(1000 + selectedServices.length * 24 + loadingCats.length * 37);
    setConstellationPhase('drawing');
    // Tempo di analisi più lungo per far apprezzare l'animazione delle card categorie.
    const drawDuration = 4200;
    drawTimerRef.current = window.setTimeout(() => {
      const stay: VoucherStay = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        location: location || undefined,
        adults: adults || undefined,
        children: children || undefined,
      };
      setResults(generatePackages(selectedServices, budget, stay));
      setConstellationPhase('done');
      drawTimerRef.current = null;
    }, drawDuration);
  };

  /* Add a package to the cart and mark the related voucher as 'in_cart'.
     Used by all "Acquista" actions across cards and the details modal. */
  const handleAddToCart = (pkg: VoucherPackage) => {
    if (!hasVoucher(pkg.id)) addVoucher(pkg);
    markInCart(pkg.id);
    addPackage({
      id: pkg.id,
      voucherId: pkg.id,
      title: pkg.title,
      description: pkg.description,
      code: pkg.code,
      price: pkg.price,
      nights: pkg.nights,
      services: pkg.services.map((s) => {
        const sub = SUB_INDEX[s.id]?.sub;
        return {
          categoryLabel: s.categoryLabel,
          label: s.label,
          venue: sub?.venue,
          address: sub?.address,
        };
      }),
      dateFrom: pkg.stay?.dateFrom,
      dateTo: pkg.stay?.dateTo,
      location: pkg.stay?.location,
      adults: pkg.stay?.adults,
      children: pkg.stay?.children,
    });
  };

  const handleReset = () => {
    setSelectedSubs(new Set());
    setBudget(params.budgetDefault);
    setDateFrom('');
    setDateTo('');
    setLocation('');
    setAdults(params.defaultAdults);
    setChildren(params.defaultChildren);
    setResults([]);
    setExpanded(new Set());
    setConstellationPhase('idle');
  };

  // Trigger print after the printing voucher gets its class applied
  useEffect(() => {
    if (printingId == null) return;
    const t = window.setTimeout(() => window.print(), 60);
    const cleanup = () => setPrintingId(null);
    window.addEventListener('afterprint', cleanup);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', cleanup);
    };
  }, [printingId]);

  const printVoucher = (id: string) => setPrintingId(id);

  const emailVoucher = (v: VoucherPackage) => {
    const subject = encodeURIComponent(`Voucher ${v.code} — ${v.title}`);
    const body = encodeURIComponent(
      [
        `Voucher: ${v.code}`,
        `Pacchetto: ${v.title}`,
        v.description,
        '',
        `Servizi inclusi:`,
        ...v.services.map((s) => `  • ${s.categoryLabel}: ${s.label}`),
        '',
        `Notti: ${v.nights}`,
        `Prezzo: € ${v.price.toFixed(2)}`,
      ].join('\n'),
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <Layout>
      <div className="dp-page">
        <DsPageHeader
          title="Pacchetti dinamici"
          subtitle="Crea pacchetti personalizzati di esperienze, soggiorni, sapori e servizi"
        />

        {totalItems > 0 && (
          <aside className="dp-cart-banner" aria-label="Riepilogo carrello Agorà">
            <div className="dp-cart-banner__info">
              <span className="dp-cart-banner__icon" aria-hidden="true">
                <Icon family="solid" name="cart-shopping" />
              </span>
              <div className="dp-cart-banner__text">
                <span className="dp-cart-banner__title">
                  {totalItems} {totalItems === 1 ? 'articolo' : 'articoli'} nel carrello
                </span>
                <span className="dp-cart-banner__total">
                  Totale € {totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="dp-cart-banner__actions">
              <DsButton variant="secondary" size="md" onClick={() => navigate('/cart')}>
                <Icon family="light" name="cart-shopping" data-slot="icon" />
                Vai al carrello
              </DsButton>
              <DsButton variant="primary" size="md" onClick={() => navigate('/checkout')}>
                <Icon family="light" name="circle-check" data-slot="icon" />
                Procedi al checkout
              </DsButton>
            </div>
          </aside>
        )}

        <div className="dp-workspace">
          <div className="dp-controls">
            <section className="dp-step">
              <div className="dp-step__head">
                <span className="dp-step__num">1</span>
                <DsH3>Dettagli pacchetto</DsH3>
              </div>
              <DsP3 className="dp-step__hint">
                Periodo, località, ospiti e budget del pacchetto.
              </DsP3>

              <div className="dp-stay">
                <Field>
                  <DsLabel htmlFor="dp-date-from">Dal</DsLabel>
                  <div className="dp-ifield">
                    <Icon family="light" name="calendar-day" className="dp-ifield__icon" aria-hidden="true" />
                    <DsInput
                      id="dp-date-from"
                      type="date"
                      className="dp-ifield__input"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                </Field>
                <Field>
                  <DsLabel htmlFor="dp-date-to">Al</DsLabel>
                  <div className="dp-ifield">
                    <Icon family="light" name="calendar-day" className="dp-ifield__icon" aria-hidden="true" />
                    <DsInput
                      id="dp-date-to"
                      type="date"
                      className="dp-ifield__input"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                    />
                  </div>
                </Field>
                <Field className="dp-field--wide">
                  <DsLabel htmlFor="dp-location">Località</DsLabel>
                  <button
                    type="button"
                    id="dp-location"
                    className="dp-ifield dp-locbtn"
                    aria-expanded={mapOpen}
                    onClick={() => setMapOpen((o) => !o)}
                  >
                    <Icon family="light" name="location-dot" className="dp-ifield__icon" aria-hidden="true" />
                    <span className={`dp-locbtn__value${location ? '' : ' is-placeholder'}`}>
                      {location || 'Scegli sulla mappa…'}
                    </span>
                    <Icon family="light" name="chevron-down" className="dp-locbtn__chev" aria-hidden="true" />
                  </button>
                </Field>
                {mapOpen && (
                  <div className="dp-field--full">
                    <LocationMap
                      value={location}
                      onSelect={({ region, province }) => {
                        setLocation(province ? `${province} (${region})` : region);
                        if (province) setMapOpen(false);
                      }}
                    />
                  </div>
                )}
                <Field>
                  <DsLabel>Adulti</DsLabel>
                  <Stepper value={adults} min={1} max={params.maxAdults} onChange={setAdults} />
                </Field>
                <Field>
                  <DsLabel>Bambini</DsLabel>
                  <Stepper value={children} min={0} max={params.maxChildren} onChange={setChildren} />
                </Field>
                <Field className="dp-field--wide">
                  <DsLabel htmlFor="dp-budget">Budget</DsLabel>
                  <div className="dp-budget">
                    <Slider
                      id="dp-budget"
                      min={params.budgetMin}
                      max={params.budgetMax}
                      step={params.budgetStep}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      formatValue={(v) => `€ ${v}`}
                    />
                    <div className="dp-budget__scale">
                      <span>€ {params.budgetMin}</span>
                      <span>€ {params.budgetMax}</span>
                    </div>
                  </div>
                </Field>
              </div>
            </section>

            <section className="dp-step">
              <div className="dp-step__head">
                <span className="dp-step__num">2</span>
                <DsH3>Scegli i servizi</DsH3>
              </div>
              <DsP3 className="dp-step__hint">
                Espandi una categoria e seleziona uno o più servizi da includere nel pacchetto.
              </DsP3>

              <div className="dp-cat-grid">
                {CATEGORIES.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    expanded={expanded.has(cat.id)}
                    selectedSubs={selectedSubs}
                    onToggle={() => toggleCat(cat.id)}
                    onToggleSub={toggleSub}
                  />
                ))}
              </div>
            </section>

            <div className="dp-actions">
          <DsButton variant="tertiary" onClick={handleReset}>
            <Icon family="light" name="arrow-rotate-left" data-slot="icon" />
            Reset
          </DsButton>
          <DsButton
            variant="primary"
            size="lg"
            onClick={handleSearch}
            disabled={selectedServices.length === 0}
          >
            <Icon family="light" name="magnifying-glass" data-slot="icon" />
            Genera pacchetti
          </DsButton>
            </div>
          </div>

          <aside className="dp-workspace__viz">
            <ServiceConstellation
              services={selectedServices}
              phase={constellationPhase}
              categoryIcons={categoryIcons}
              onRemove={toggleSub}
            />
          </aside>
        </div>

        {constellationPhase === 'drawing' && (
          <section className="dp-loading" aria-live="polite" role="status">
            <div className="dp-loading__panel">
              <div className="dp-loading__scene">
                <div className="dp-loading__cards">
                  {(loadingCats.length ? loadingCats : [{ id: 'x', title: 'Servizi', icon: 'box' }]).map((c, i) => (
                    <span key={c.id} className="dp-loading__card" style={{ '--i': i } as React.CSSProperties} title={c.title} aria-hidden="true">
                      <Icon family="solid" name={c.icon} />
                    </span>
                  ))}
                </div>
              </div>
              <div className="dp-loading__text">
                <strong>Stiamo analizzando oltre {analyzed.toLocaleString('it-IT')} fornitori…</strong>
                <span>Generiamo per te i pacchetti migliori in base alle categorie scelte</span>
              </div>
              <div className="dp-loading__bar" aria-hidden="true"><span /></div>
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="dp-results">
            <header className="dp-results__head">
              <DsH3>I migliori pacchetti per te</DsH3>
              <p className="dp-results__meta">
                Abbiamo analizzato <strong>{analyzed.toLocaleString('it-IT')}</strong> fornitori e questi sono i{' '}
                <strong>{results.length}</strong> pacchetti migliori che riusciamo a generare per te.
              </p>
            </header>
            <div className="dp-voucher-grid">
              {results.map((pkg) => (
                <VoucherCard
                  key={pkg.id}
                  pkg={pkg}
                  status={voucherStatusFor(pkg.id)}
                  onSave={() => addVoucher(pkg)}
                  onRemove={() => removeVoucher(pkg.id)}
                  onPurchase={() => handleAddToCart(pkg)}
                  onGoToCart={() => navigate('/cart')}
                  onGenerateVoucher={() => printVoucher(pkg.id)}
                  onDetails={() => setDetailsId(pkg.id)}
                  printing={printingId === pkg.id}
                />
              ))}
            </div>
          </section>
        )}

        <section className="dp-parking">
          <div className="dp-parking__head">
            <DsH3>
              <span className="dp-parking__icon">
                <Icon family="light" name="wallet" />
              </span>
              Borsellino voucher
            </DsH3>
            <span className="dp-parking__counts">
              {(() => {
                const purchased = vouchers.filter((v) => v.status === 'purchased').length;
                const saved = vouchers.length - purchased;
                return (
                  <>
                    {saved > 0 && (
                      <span className="dp-parking__count dp-parking__count--saved">
                        {saved} salvati
                      </span>
                    )}
                    {purchased > 0 && (
                      <span className="dp-parking__count dp-parking__count--purchased">
                        {purchased} acquistati
                      </span>
                    )}
                    {vouchers.length === 0 && (
                      <span className="dp-parking__count">0</span>
                    )}
                  </>
                );
              })()}
            </span>
          </div>

          {vouchers.length === 0 ? (
            <DsP3 className="dp-empty">
              Nessun voucher salvato. Aggiungi pacchetti dai risultati per metterli nel borsellino.
            </DsP3>
          ) : (
            <div className="dp-voucher-grid">
              {vouchers.map((v) => (
                <ParkedVoucher
                  key={v.id}
                  voucher={v}
                  onRemove={() => removeVoucher(v.id)}
                  onPrint={() => printVoucher(v.id)}
                  onPdf={() => printVoucher(v.id)}
                  onEmail={() => emailVoucher(v)}
                  onPurchase={() => handleAddToCart(v)}
                  onDetails={() => setDetailsId(v.id)}
                  onOpenCart={() => navigate('/cart')}
                  onGenerateVoucher={() => printVoucher(v.id)}
                  printing={printingId === v.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {printingId &&
        (() => {
          const pkg =
            results.find((p) => p.id === printingId) ??
            vouchers.find((v) => v.id === printingId);
          if (!pkg) return null;
          return <VoucherPrintTemplate voucher={pkg} subIndex={SUB_INDEX} />;
        })()}

      {detailsId &&
        (() => {
          const pkg =
            results.find((p) => p.id === detailsId) ??
            vouchers.find((v) => v.id === detailsId);
          if (!pkg) return null;
          const saved = hasVoucher(pkg.id);
          const purchased = pkg.status === 'purchased';
          const inCart = pkg.status === 'in_cart';
          return (
            <VoucherDetailsModal
              pkg={pkg}
              stay={{
                dateFrom: pkg.stay?.dateFrom ?? dateFrom,
                dateTo: pkg.stay?.dateTo ?? dateTo,
                location: pkg.stay?.location ?? location,
                adults: pkg.stay?.adults ?? adults,
                children: pkg.stay?.children ?? children,
              }}
              saved={saved}
              purchased={purchased}
              inCart={inCart}
              subIndex={SUB_INDEX}
              onClose={() => setDetailsId(null)}
              onSave={() => addVoucher(pkg)}
              onRemove={() => removeVoucher(pkg.id)}
              onPurchase={() => {
                handleAddToCart(pkg);
                setDetailsId(null);
              }}
              onGoToCart={() => {
                setDetailsId(null);
                navigate('/cart');
              }}
              onGenerateVoucher={() => {
                setDetailsId(null);
                printVoucher(pkg.id);
              }}
            />
          );
        })()}
    </Layout>
  );
}

/* ============================================================
   Subcomponents
   ============================================================ */

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="dp-stepper">
      <button
        type="button"
        className="dp-stepper__btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuisci"
      >
        −
      </button>
      <span className="dp-stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="dp-stepper__btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumenta"
      >
        +
      </button>
    </div>
  );
}

interface CategoryCardProps {
  cat: Category;
  expanded: boolean;
  selectedSubs: Set<string>;
  onToggle: () => void;
  onToggleSub: (id: string) => void;
}

function CategoryCard({ cat, expanded, selectedSubs, onToggle, onToggleSub }: CategoryCardProps) {
  const activeCount = cat.subcategories.filter((s) => selectedSubs.has(s.id)).length;
  return (
    <div
      className={`dp-cat${expanded ? ' dp-cat--expanded' : ''}${activeCount > 0 ? ' dp-cat--has-selection' : ''}`}
      data-accent={cat.accent}
    >
      <button
        type="button"
        className="dp-cat__header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="dp-cat__icon">
          <Icon family="light" name={cat.icon} />
        </span>
        <span className="dp-cat__titles">
          <span className="dp-cat__title">{cat.title}</span>
          {activeCount > 0 && (
            <span className="dp-cat__count">
              {activeCount} {activeCount === 1 ? 'selezionato' : 'selezionati'}
            </span>
          )}
        </span>
        <span className="dp-cat__chev" aria-hidden="true">
          <Icon family="light" name={expanded ? 'chevron-up' : 'chevron-down'} />
        </span>
      </button>

      <div className="dp-cat__body" hidden={!expanded}>
        {cat.subcategories.map((sub) => {
          const active = selectedSubs.has(sub.id);
          return (
            <button
              key={sub.id}
              type="button"
              className={`dp-chip${active ? ' dp-chip--active' : ''}`}
              onClick={() => onToggleSub(sub.id)}
              aria-pressed={active}
            >
              <span className="dp-chip__icon" aria-hidden="true">
                <Icon family="light" name={sub.icon} />
              </span>
              <span>{sub.label}</span>
              {active && (
                <span className="dp-chip__check" aria-hidden="true">
                  <Icon family="solid" name="check" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface VoucherCardProps {
  pkg: VoucherPackage;
  status: VoucherStatus | undefined;
  onSave: () => void;
  onRemove: () => void;
  onPurchase: () => void;
  onGoToCart: () => void;
  onGenerateVoucher: () => void;
  onDetails: () => void;
  printing: boolean;
}

function VoucherCard({
  pkg,
  status,
  onSave,
  onRemove,
  onPurchase,
  onGoToCart,
  onGenerateVoucher,
  onDetails,
  printing,
}: VoucherCardProps) {
  const isPurchased = status === 'purchased';
  const isInCart = status === 'in_cart';
  const isSaved = status !== undefined;
  return (
    <article
      className={`dp-voucher${printing ? ' dp-voucher--printing' : ''}${
        isPurchased ? ' dp-voucher--purchased' : ''
      }${isInCart ? ' dp-voucher--in-cart' : ''}`}
    >
      <div className="dp-voucher__main">
        <div className="dp-voucher__head">
          <div className="dp-voucher__title-row">
            <DsH3>{pkg.title}</DsH3>
            {isPurchased && (
              <span className="dp-voucher__badge">
                <Icon family="solid" name="circle-check" /> Acquistato
              </span>
            )}
            {isInCart && (
              <span className="dp-voucher__badge dp-voucher__badge--cart">
                <Icon family="solid" name="cart-shopping" /> Aggiunto al carrello
              </span>
            )}
          </div>
          <DsP3>{pkg.description}</DsP3>
        </div>
        <div className="dp-voucher__services">
          {pkg.services.map((s) => (
            <span key={s.id} className="dp-voucher__service">
              <strong>{s.categoryLabel}:</strong> {s.label}
            </span>
          ))}
        </div>
        <div className="dp-voucher__meta">
          <span>
            <Icon family="light" name="moon" /> {pkg.nights} notti
          </span>
          <span className="dp-voucher__code">{pkg.code}</span>
        </div>
      </div>

      <div className="dp-voucher__stub">
        <span className="dp-voucher__price-label">Totale</span>
        <span className="dp-voucher__price">€ {pkg.price.toFixed(0)}</span>
        <div className="dp-voucher__stub-actions">
          <DsButton variant="tertiary" size="sm" onClick={onDetails}>
            <Icon family="light" name="circle-info" data-slot="icon" />
            Dettagli
          </DsButton>
          {isPurchased ? (
            <DsButton variant="primary" size="sm" onClick={onGenerateVoucher}>
              <Icon family="light" name="ticket" data-slot="icon" />
              Genera Voucher
            </DsButton>
          ) : isInCart ? (
            <DsButton variant="primary" size="sm" onClick={onGoToCart}>
              <Icon family="light" name="cart-shopping" data-slot="icon" />
              Vai al carrello
            </DsButton>
          ) : (
            <>
              {isSaved ? (
                <DsButton variant="tertiary" size="sm" onClick={onRemove}>
                  <Icon family="light" name="bookmark-slash" data-slot="icon" />
                  Rimuovi
                </DsButton>
              ) : (
                <DsButton variant="secondary" size="sm" onClick={onSave}>
                  <Icon family="light" name="bookmark" data-slot="icon" />
                  Salva
                </DsButton>
              )}
              <DsButton variant="primary" size="sm" onClick={onPurchase}>
                <Icon family="light" name="bag-shopping" data-slot="icon" />
                Acquista
              </DsButton>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

interface ParkedVoucherProps {
  voucher: VoucherPackage;
  onRemove: () => void;
  onPrint: () => void;
  onPdf: () => void;
  onEmail: () => void;
  onPurchase: () => void;
  onDetails: () => void;
  onOpenCart: () => void;
  onGenerateVoucher: () => void;
  printing: boolean;
}

function ParkedVoucher({
  voucher,
  onRemove,
  onPrint,
  onPdf,
  onEmail,
  onPurchase,
  onDetails,
  onOpenCart,
  onGenerateVoucher,
  printing,
}: ParkedVoucherProps) {
  const isPurchased = voucher.status === 'purchased';
  const isInCart = voucher.status === 'in_cart';
  return (
    <article
      className={`dp-voucher dp-voucher--parked${
        isPurchased ? ' dp-voucher--purchased' : ''
      }${isInCart ? ' dp-voucher--in-cart' : ''}${printing ? ' dp-voucher--printing' : ''}`}
    >
      <div className="dp-voucher__main">
        <div className="dp-voucher__head">
          <div className="dp-voucher__title-row">
            <DsH3>{voucher.title}</DsH3>
            {isPurchased && (
              <span className="dp-voucher__badge">
                <Icon family="solid" name="circle-check" /> Acquistato
              </span>
            )}
            {isInCart && (
              <span className="dp-voucher__badge dp-voucher__badge--cart">
                <Icon family="solid" name="cart-shopping" /> Aggiunto al carrello
              </span>
            )}
          </div>
          <DsP3>{voucher.description}</DsP3>
        </div>
        <div className="dp-voucher__services">
          {voucher.services.map((s) => (
            <span key={s.id} className="dp-voucher__service">
              <strong>{s.categoryLabel}:</strong> {s.label}
            </span>
          ))}
        </div>
        <div className="dp-voucher__actions">
          <DsButton variant="tertiary" size="sm" onClick={onDetails}>
            <Icon family="light" name="circle-info" data-slot="icon" />
            Dettagli
          </DsButton>
          {isPurchased && (
            <DsButton variant="primary" size="sm" onClick={onGenerateVoucher}>
              <Icon family="light" name="ticket" data-slot="icon" />
              Genera Voucher
            </DsButton>
          )}
          {isInCart && (
            <DsButton variant="secondary" size="sm" onClick={onOpenCart}>
              <Icon family="light" name="cart-shopping" data-slot="icon" />
              Vai al carrello
            </DsButton>
          )}
          {!isPurchased && !isInCart && (
            <DsButton variant="primary" size="sm" onClick={onPurchase}>
              <Icon family="light" name="bag-shopping" data-slot="icon" />
              Acquista
            </DsButton>
          )}
          <DsButton variant="tertiary" size="sm" onClick={onPrint}>
            <Icon family="light" name="print" data-slot="icon" />
            Stampa
          </DsButton>
          <DsButton variant="tertiary" size="sm" onClick={onPdf}>
            <Icon family="light" name="file-pdf" data-slot="icon" />
            PDF
          </DsButton>
          <DsButton variant="tertiary" size="sm" onClick={onEmail}>
            <Icon family="light" name="envelope" data-slot="icon" />
            Email
          </DsButton>
          <button
            type="button"
            className="dp-voucher__remove"
            onClick={onRemove}
            aria-label="Rimuovi dal borsellino"
            title="Rimuovi dal borsellino"
          >
            <Icon family="light" name="trash" />
          </button>
        </div>
      </div>

      <div className="dp-voucher__stub">
        <span className="dp-voucher__price-label">Totale</span>
        <span className="dp-voucher__price">€ {voucher.price.toFixed(0)}</span>
        <span className="dp-voucher__meta-line">
          <Icon family="light" name="moon" /> {voucher.nights} notti
        </span>
        <span className="dp-voucher__code">{voucher.code}</span>
      </div>
    </article>
  );
}

/* ============================================================
   Service Constellation — stars appear with selections,
   lines draw on Generate to form a constellation
   ============================================================ */

interface ConstellationNode {
  service: VoucherService;
  x: number;
  y: number;
  r: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* viewBox is 160×100 (1.6:1 aspect, matches container).
   Coordinates here are in viewBox units. */
const VIEWBOX_W = 160;
const VIEWBOX_H = 100;

function computePositions(services: VoucherService[]): ConstellationNode[] {
  const n = services.length;
  if (n === 0) return [];
  const cx = VIEWBOX_W / 2;
  const cy = VIEWBOX_H / 2;
  // Services orbit around Sibylla in an ellipse that fits the 1.6:1 stage.
  const rx = 60;
  const ry = 32;
  return services.map((s, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    const h = hashStr(s.id);
    const jitterR = ((h % 100) / 100 - 0.5) * 6;
    const jitterStar = 1.6 + ((h >> 8) % 60) / 100;
    return {
      service: s,
      x: cx + Math.cos(angle) * (rx + jitterR),
      y: cy + Math.sin(angle) * (ry + jitterR / 1.4),
      r: jitterStar,
    };
  });
}

function pctX(x: number): string {
  return `${(x / VIEWBOX_W) * 100}%`;
}
function pctY(y: number): string {
  return `${(y / VIEWBOX_H) * 100}%`;
}

interface ServiceConstellationProps {
  services: VoucherService[];
  phase: ConstellationPhase;
  /** Mappa id-categoria → nome icona FontAwesome, per i nodi e il recap. */
  categoryIcons: Record<string, string>;
  /** Rimuove un servizio (id sotto-categoria) cliccando il nodo. */
  onRemove: (subId: string) => void;
}

function ServiceConstellation({ services, phase, categoryIcons, onRemove }: ServiceConstellationProps) {
  const positions = useMemo(() => computePositions(services), [services]);
  const [hovered, setHovered] = useState<string | null>(null);
  const cx = VIEWBOX_W / 2;
  const cy = VIEWBOX_H / 2;

  // Recap raggruppato per categoria (con conteggio + icona).
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; icon: string; items: VoucherService[] }>();
    for (const s of services) {
      const g = map.get(s.categoryId);
      if (g) g.items.push(s);
      else map.set(s.categoryId, { label: s.categoryLabel, icon: categoryIcons[s.categoryId] ?? 'box', items: [s] });
    }
    return Array.from(map.values());
  }, [services, categoryIcons]);

  const status =
    phase === 'drawing'
      ? 'Sibylla sta componendo il pacchetto…'
      : phase === 'done'
        ? 'Composizione completata'
        : positions.length === 0
          ? 'Seleziona i servizi da includere'
          : `${positions.length} ${positions.length === 1 ? 'servizio collegato' : 'servizi collegati'}`;

  return (
    <section className={`dp-eco dp-eco--${phase}`} aria-live="polite">
      <p className="dp-eco__status">
        <Icon family="light" name="sparkles" />
        {status}
      </p>

      <div className="dp-eco__stage">
        <svg
          className="dp-eco__svg"
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Static radial rails from hub to each service */}
          {positions.map((p) => (
            <line
              key={`rail-${p.service.id}`}
              className={`dp-eco__rail${hovered === p.service.id ? ' is-hot' : ''}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
            />
          ))}

          {/* Data pulses outward from Sibylla — only while composing */}
          {phase === 'drawing' &&
            positions.map((p, i) => {
              const motionPath = `M ${cx},${cy} L ${p.x},${p.y}`;
              return (
                <circle
                  key={`pulse-${p.service.id}`}
                  className="dp-eco__pulse"
                  r={1.6}
                >
                  <animateMotion
                    dur="1.2s"
                    repeatCount="indefinite"
                    begin={`${(i * 0.18).toFixed(2)}s`}
                    path={motionPath}
                    keyTimes="0;1"
                    keyPoints="0;1"
                  />
                </circle>
              );
            })}
        </svg>

        {/* Central Sibylla hub — the "computer" */}
        <div
          className="dp-eco__core"
          style={{ '--core-left': pctX(cx), '--core-top': pctY(cy) } as CSSProperties}
        >
          <Icon family="light" name="microchip" />
          <span className="dp-eco__core-label">Sibylla</span>
        </div>

        {/* Service nodes on the orbit — ora con icona categoria + rimozione */}
        {positions.map((p, i) => (
          <button
            type="button"
            key={`node-${p.service.id}`}
            className={`dp-eco__node${hovered === p.service.id ? ' is-hover' : ''}`}
            style={
              {
                ['--star-left' as string]: pctX(p.x),
                ['--star-top' as string]: pctY(p.y),
                ['--appear-delay' as string]: `${i * 0.06}s`,
              } as CSSProperties
            }
            title={`${p.service.categoryLabel} · ${p.service.label} — clic per rimuovere`}
            aria-label={`Rimuovi ${p.service.label}`}
            onMouseEnter={() => setHovered(p.service.id)}
            onMouseLeave={() => setHovered((h) => (h === p.service.id ? null : h))}
            onClick={() => onRemove(p.service.id)}
          >
            <Icon family="light" name={categoryIcons[p.service.categoryId] ?? 'box'} className="dp-eco__node-icon" />
            <Icon family="solid" name="xmark" className="dp-eco__node-x" />
          </button>
        ))}

        {/* Labels */}
        {positions.map((p, i) => (
          <div
            key={`lbl-${p.service.id}`}
            className={`dp-eco__label${hovered === p.service.id ? ' is-hot' : ''}`}
            style={
              {
                ['--label-left' as string]: pctX(p.x),
                ['--label-top' as string]: pctY(p.y),
                ['--appear-delay' as string]: `${i * 0.06 + 0.08}s`,
              } as CSSProperties
            }
          >
            {p.service.label}
          </div>
        ))}
      </div>

      {/* Metriche live — alza il valore percepito */}
      <div className="dp-eco__metrics" aria-hidden={positions.length === 0}>
        <div className="dp-eco__metric">
          <span className="dp-eco__metric-num">{positions.length}</span>
          <span className="dp-eco__metric-lbl">{positions.length === 1 ? 'servizio' : 'servizi'}</span>
        </div>
        <div className="dp-eco__metric">
          <span className="dp-eco__metric-num">{groups.length}</span>
          <span className="dp-eco__metric-lbl">{groups.length === 1 ? 'categoria' : 'categorie'}</span>
        </div>
        <div className="dp-eco__metric">
          <span className="dp-eco__metric-num">∞</span>
          <span className="dp-eco__metric-lbl">combinazioni</span>
        </div>
      </div>

      <div className="dp-eco__summary">
        <p className="dp-eco__summary-title">Servizi collegati</p>
        {positions.length === 0 ? (
          <p className="dp-eco__summary-empty">
            Nessun servizio selezionato.
          </p>
        ) : (
          <ul className="dp-eco__summary-list">
            {groups.map((g) => (
              <li key={`grp-${g.label}`} className="dp-eco__group">
                <span className="dp-eco__group-head">
                  <span className="dp-eco__group-icon"><Icon family="light" name={g.icon} /></span>
                  <span className="dp-eco__group-name">{g.label}</span>
                  <span className="dp-eco__group-count">{g.items.length}</span>
                </span>
                <span className="dp-eco__group-tags">
                  {g.items.map((s) => (
                    <button
                      type="button"
                      key={`tag-${s.id}`}
                      className="dp-eco__tag"
                      title="Rimuovi servizio"
                      onClick={() => onRemove(s.id)}
                    >
                      {s.label}
                      <Icon family="solid" name="xmark" />
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   Voucher details modal
   ============================================================ */

interface StayInfo {
  dateFrom: string;
  dateTo: string;
  location: string;
  adults: number;
  children: number;
}

interface VoucherDetailsModalProps {
  pkg: VoucherPackage;
  stay: StayInfo;
  saved: boolean;
  purchased: boolean;
  inCart: boolean;
  subIndex: Record<string, { sub: Subcategory; cat: Category }>;
  onClose: () => void;
  onSave: () => void;
  onRemove: () => void;
  onPurchase: () => void;
  onGoToCart: () => void;
  onGenerateVoucher: () => void;
}

function formatDateIt(s: string): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* Plausible defaults invented when the user did not provide stay info, so
   the recap modal still presents a complete picture. */
interface FallbackStay {
  dateFrom: string;
  dateTo: string;
  location: string;
  adults: number;
}
function fallbackStay(nights: number): FallbackStay {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, nights));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    dateFrom: iso(start),
    dateTo: iso(end),
    location: 'Roma',
    adults: 2,
  };
}

/* ============================================================
   Voucher print template — formal layout rendered only while
   printing (CSS @media print hides everything else).
   ============================================================ */
function VoucherPrintTemplate({
  voucher,
  subIndex,
}: {
  voucher: VoucherPackage;
  subIndex: Record<string, { sub: Subcategory; cat: Category }>;
}) {
  const SUB_INDEX = subIndex;
  const fb = fallbackStay(voucher.nights);
  const stay = voucher.stay ?? {};
  const dateFrom = stay.dateFrom || fb.dateFrom;
  const dateTo = stay.dateTo || fb.dateTo;
  const loc = stay.location || fb.location;
  const adults = stay.adults && stay.adults > 0 ? stay.adults : fb.adults;
  const childrenN = stay.children ?? 0;

  const grouped = new Map<string, { label: string; items: VoucherService[] }>();
  for (const s of voucher.services) {
    const entry = grouped.get(s.categoryId);
    if (entry) entry.items.push(s);
    else grouped.set(s.categoryId, { label: s.categoryLabel, items: [s] });
  }

  const issued = voucher.purchasedAt ? new Date(voucher.purchasedAt) : new Date();
  const issuedStr = issued.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="voucher-print">
      <header className="voucher-print__head">
        <div>
          <h1 className="voucher-print__brand">Agorà</h1>
          <p className="voucher-print__type">Voucher di servizi turistici</p>
        </div>
        <div className="voucher-print__code-box">
          <span className="voucher-print__code-label">Codice voucher</span>
          <span className="voucher-print__code">{voucher.code}</span>
        </div>
      </header>

      <section className="voucher-print__title-block">
        <h2 className="voucher-print__title">{voucher.title}</h2>
        <p className="voucher-print__desc">{voucher.description}</p>
      </section>

      <section className="voucher-print__section">
        <h3 className="voucher-print__h3">Riferimenti soggiorno</h3>
        <dl className="voucher-print__dl">
          <dt>Periodo</dt>
          <dd>
            {formatDateIt(dateFrom)} → {formatDateIt(dateTo)}
          </dd>
          <dt>Località</dt>
          <dd>{loc}</dd>
          <dt>Persone</dt>
          <dd>
            {adults} adult{adults === 1 ? 'o' : 'i'}
            {childrenN > 0
              ? `, ${childrenN} bambin${childrenN === 1 ? 'o' : 'i'}`
              : ''}
          </dd>
          <dt>Notti</dt>
          <dd>{voucher.nights}</dd>
        </dl>
      </section>

      <section className="voucher-print__section">
        <h3 className="voucher-print__h3">Servizi inclusi</h3>
        <ul className="voucher-print__services">
          {Array.from(grouped.values()).map((g) => (
            <li key={g.label} className="voucher-print__service-group">
              <span className="voucher-print__service-cat">{g.label}</span>
              <ul className="voucher-print__service-items">
                {g.items.map((item) => {
                  const sub = SUB_INDEX[item.id]?.sub;
                  return (
                    <li key={item.id}>
                      <span className="voucher-print__service-name">{item.label}</span>
                      {sub && (
                        <span className="voucher-print__service-meta">
                          <span>{sub.venue}</span>
                          <span>{sub.address}</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="voucher-print__total">
        <span className="voucher-print__total-label">Importo corrisposto</span>
        <span className="voucher-print__total-value">€ {voucher.price.toFixed(2)}</span>
      </section>

      <footer className="voucher-print__foot">
        <p>
          <strong>Validità:</strong> 12 mesi dalla data di emissione.
        </p>
        <p>
          <strong>Riferimenti:</strong> presentare il presente voucher al fornitore del servizio
          all'atto della prenotazione o dell'utilizzo.
        </p>
        <p>
          <strong>Assistenza:</strong> support@agora.it · +39 06 1234 567
        </p>
        <p className="voucher-print__issued">Emesso il {issuedStr}</p>
      </footer>
    </div>
  );
}

function VoucherDetailsModal({
  pkg,
  stay,
  saved,
  purchased,
  inCart,
  subIndex,
  onClose,
  onSave,
  onRemove,
  onPurchase,
  onGoToCart,
  onGenerateVoucher,
}: VoucherDetailsModalProps) {
  const SUB_INDEX = subIndex;
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: VoucherService[] }>();
    for (const s of pkg.services) {
      const entry = map.get(s.categoryId);
      if (entry) entry.items.push(s);
      else map.set(s.categoryId, { label: s.categoryLabel, items: [s] });
    }
    return Array.from(map.values());
  }, [pkg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Defaults invented when the user hasn't filled the stay fields, so the
  // recap always presents complete info.
  const fb = useMemo(() => fallbackStay(pkg.nights), [pkg.nights]);
  const effDateFrom = stay.dateFrom || fb.dateFrom;
  const effDateTo = stay.dateTo || fb.dateTo;
  const effLocation = stay.location || fb.location;
  const effAdults = stay.adults > 0 ? stay.adults : fb.adults;
  const effChildren = stay.children;

  const periodo = `${formatDateIt(effDateFrom)} → ${formatDateIt(effDateTo)}`;
  const persone = `${effAdults} adult${effAdults === 1 ? 'o' : 'i'}${
    effChildren > 0
      ? `, ${effChildren} bambin${effChildren === 1 ? 'o' : 'i'}`
      : ''
  }`;

  return (
    <div className="dp-modal" role="presentation" onClick={onClose}>
      <div
        className="dp-modal__box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dp-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dp-modal__head">
          <div className="dp-modal__head-text">
            {purchased && (
              <span className="dp-voucher__badge">
                <Icon family="solid" name="circle-check" /> Acquistato
              </span>
            )}
            {inCart && (
              <span className="dp-voucher__badge dp-voucher__badge--cart">
                <Icon family="solid" name="cart-shopping" /> Aggiunto al carrello
              </span>
            )}
            <h2 id="dp-modal-title" className="dp-modal__title">
              {pkg.title}
            </h2>
            <span className="dp-modal__code">{pkg.code}</span>
          </div>
          <button
            type="button"
            className="dp-modal__close"
            onClick={onClose}
            aria-label="Chiudi"
            title="Chiudi"
          >
            <Icon family="light" name="xmark" />
          </button>
        </header>

        <div className="dp-modal__body">
          <DsP3>{pkg.description}</DsP3>

          <div className="dp-modal__section">
            <h3 className="dp-modal__section-title">Dettagli soggiorno</h3>
            <dl className="dp-modal__dl">
              <dt>Periodo</dt>
              <dd>{periodo}</dd>

              <dt>Località</dt>
              <dd>{effLocation}</dd>

              <dt>Persone</dt>
              <dd>{persone}</dd>

              <dt>Notti</dt>
              <dd>{pkg.nights}</dd>
            </dl>
          </div>

          <div className="dp-modal__section">
            <h3 className="dp-modal__section-title">Servizi inclusi</h3>
            <ul className="dp-modal__services">
              {grouped.map((g) => (
                <li key={g.label} className="dp-modal__service-group">
                  <span className="dp-modal__service-cat">{g.label}</span>
                  <ul className="dp-modal__service-items">
                    {g.items.map((item) => {
                      const sub = SUB_INDEX[item.id]?.sub;
                      return (
                        <li key={item.id}>
                          <Icon family="solid" name="check" />
                          <span className="dp-modal__service-line">
                            <span className="dp-modal__service-name">
                              {item.label}
                            </span>
                            {sub && (
                              <span className="dp-modal__service-meta">
                                {sub.venue} · {sub.address}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="dp-modal__foot">
          <div className="dp-modal__price">
            <span className="dp-modal__price-label">Totale</span>
            <span className="dp-modal__price-value">€ {pkg.price.toFixed(0)}</span>
          </div>
          <div className="dp-modal__actions">
            {purchased ? (
              <DsButton variant="primary" size="lg" onClick={onGenerateVoucher}>
                <Icon family="light" name="ticket" data-slot="icon" />
                Genera Voucher
              </DsButton>
            ) : inCart ? (
              <DsButton variant="primary" size="lg" onClick={onGoToCart}>
                <Icon family="light" name="cart-shopping" data-slot="icon" />
                Vai al carrello
              </DsButton>
            ) : (
              <>
                {saved ? (
                  <DsButton variant="tertiary" onClick={onRemove}>
                    <Icon family="light" name="bookmark-slash" data-slot="icon" />
                    Rimuovi
                  </DsButton>
                ) : (
                  <DsButton variant="secondary" onClick={onSave}>
                    <Icon family="light" name="bookmark" data-slot="icon" />
                    Salva
                  </DsButton>
                )}
                <DsButton variant="primary" size="lg" onClick={onPurchase}>
                  <Icon family="light" name="bag-shopping" data-slot="icon" />
                  Acquista
                </DsButton>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
