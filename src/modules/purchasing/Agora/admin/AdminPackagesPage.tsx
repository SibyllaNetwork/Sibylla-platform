/*
 * AdminPackagesPage — CRUD per la pagina utente "Pacchetti dinamici".
 *
 * Tre sezioni interne:
 *   1. Categorie & servizi — gestione delle categorie e dei sottoservizi che
 *      l'utente seleziona per comporre il pacchetto.
 *   2. Temi pacchetto — i preset di nome/fattore/notti applicati al budget.
 *   3. Parametri di selezione — range budget, default adulti/bambini, max.
 *
 * Tutti i dati sono persistiti nel DynamicPackagesConfigContext condiviso con
 * la pagina utente.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../ds/icon';
import { AdminPageHeader } from './AdminPageHeader';
import {
  useDynamicPackagesConfig,
  DP_ACCENTS,
  type DPAccent,
  type DPCategory,
  type DPParams,
  type DPSubcategory,
  type DPTheme,
} from '../context/DynamicPackagesConfigContext';
import { useCatalogoStore } from '../../../../store/useCatalogoStore';
import './AdminPackagesPage.css';

type SectionTab = 'categories' | 'themes' | 'params';

const SECTION_TABS: { id: SectionTab; label: string; icon: string }[] = [
  { id: 'categories', label: 'Categorie & servizi', icon: 'sitemap'  },
  { id: 'themes',     label: 'Temi pacchetto',      icon: 'box-archive' },
  { id: 'params',     label: 'Parametri',           icon: 'sliders'  },
];

export function AdminPackagesPage() {
  const cfg = useDynamicPackagesConfig();
  const [section, setSection] = useState<SectionTab>('categories');

  return (
    <div className="admin-pkg">
      <AdminPageHeader
        title="Pacchetti dinamici"
        subtitle="Configura categorie, servizi, temi e parametri della pagina utente"
        actions={
          <button
            type="button"
            className="admin-pkg__btn admin-pkg__btn--ghost"
            onClick={() => {
              if (window.confirm('Ripristinare tutti i valori di default? Le modifiche correnti andranno perse.')) {
                cfg.resetToDefaults();
              }
            }}
          >
            <Icon family="light" name="arrow-rotate-left" /> Ripristina default
          </button>
        }
      />

      <nav className="admin-pkg__tabs" role="tablist" aria-label="Sezioni configurazione">
        {SECTION_TABS.map(t => {
          const active = section === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              className={`admin-pkg__tab${active ? ' admin-pkg__tab--active' : ''}`}
              onClick={() => setSection(t.id)}
            >
              <Icon family="light" name={t.icon} /> {t.label}
            </button>
          );
        })}
      </nav>

      <div className="admin-pkg__body">
        {section === 'categories' && <CategoriesSection />}
        {section === 'themes'     && <ThemesSection />}
        {section === 'params'     && <ParamsSection />}
      </div>
    </div>
  );
}

/* ============================================================
   Sezione 1 — Categorie & servizi
   ============================================================ */

function CategoriesSection() {
  const { categories, addCategory, updateCategory, removeCategory,
          addSubcategory, updateSubcategory, removeSubcategory } = useDynamicPackagesConfig();

  const [editingCat, setEditingCat] = useState<DPCategory | 'new' | null>(null);
  const [editingSub, setEditingSub] = useState<
    | { mode: 'new'; categoryId: string }
    | { mode: 'edit'; categoryId: string; sub: DPSubcategory }
    | null
  >(null);

  return (
    <section className="admin-pkg__section">
      <div className="admin-pkg__section-head">
        <div>
          <h2 className="admin-pkg__section-title">Categorie & servizi</h2>
          <p className="admin-pkg__section-hint">
            Definisci le categorie principali (es. Soggiorno, Sapori) e i servizi specifici
            che l'utente può selezionare per comporre il pacchetto.
          </p>
        </div>
        <button
          type="button"
          className="admin-pkg__btn admin-pkg__btn--primary"
          onClick={() => setEditingCat('new')}
        >
          <Icon family="solid" name="plus" /> Nuova categoria
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="admin-pkg__empty">Nessuna categoria definita.</div>
      ) : (
        <ul className="admin-pkg__cats">
          {categories.map(cat => (
            <li key={cat.id} className="admin-pkg__cat" data-accent={cat.accent}>
              <header className="admin-pkg__cat-head">
                <span className="admin-pkg__cat-icon">
                  <Icon family="light" name={cat.icon} />
                </span>
                <div className="admin-pkg__cat-text">
                  <span className="admin-pkg__cat-title">{cat.title}</span>
                  <span className="admin-pkg__cat-meta">
                    {cat.subcategories.length}{' '}
                    {cat.subcategories.length === 1 ? 'servizio' : 'servizi'}
                    {'  ·  '}
                    accent: {accentLabel(cat.accent)}
                  </span>
                </div>
                <div className="admin-pkg__cat-actions">
                  <button
                    type="button"
                    className="admin-pkg__icon-btn"
                    title="Modifica categoria"
                    onClick={() => setEditingCat(cat)}
                  >
                    <Icon family="light" name="pen" />
                  </button>
                  <button
                    type="button"
                    className="admin-pkg__icon-btn admin-pkg__icon-btn--danger"
                    title="Elimina categoria"
                    onClick={() => {
                      if (window.confirm(`Eliminare la categoria "${cat.title}"? Tutti i servizi associati saranno eliminati.`)) {
                        removeCategory(cat.id);
                      }
                    }}
                  >
                    <Icon family="light" name="trash" />
                  </button>
                </div>
              </header>

              <div className="admin-pkg__subs">
                {cat.subcategories.length === 0 ? (
                  <div className="admin-pkg__subs-empty">Nessun servizio nella categoria.</div>
                ) : (
                  <ul className="admin-pkg__sub-list">
                    {cat.subcategories.map(sub => (
                      <li key={sub.id} className="admin-pkg__sub">
                        <span className="admin-pkg__sub-icon">
                          <Icon family="light" name={sub.icon} />
                        </span>
                        <div className="admin-pkg__sub-text">
                          <span className="admin-pkg__sub-label">{sub.label}</span>
                          <span className="admin-pkg__sub-meta">
                            <strong>{sub.venue || '—'}</strong>
                            {sub.address ? <> · {sub.address}</> : null}
                          </span>
                        </div>
                        <div className="admin-pkg__sub-actions">
                          <button
                            type="button"
                            className="admin-pkg__icon-btn"
                            title="Modifica servizio"
                            onClick={() => setEditingSub({ mode: 'edit', categoryId: cat.id, sub })}
                          >
                            <Icon family="light" name="pen" />
                          </button>
                          <button
                            type="button"
                            className="admin-pkg__icon-btn admin-pkg__icon-btn--danger"
                            title="Elimina servizio"
                            onClick={() => {
                              if (window.confirm(`Eliminare il servizio "${sub.label}"?`)) {
                                removeSubcategory(cat.id, sub.id);
                              }
                            }}
                          >
                            <Icon family="light" name="trash" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="admin-pkg__btn admin-pkg__btn--ghost admin-pkg__btn--sm"
                  onClick={() => setEditingSub({ mode: 'new', categoryId: cat.id })}
                >
                  <Icon family="solid" name="plus" /> Aggiungi servizio
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingCat !== null && (
        <CategoryFormModal
          initial={editingCat === 'new' ? null : editingCat}
          onClose={() => setEditingCat(null)}
          onSave={(data) => {
            if (editingCat === 'new') addCategory(data);
            else updateCategory(editingCat.id, data);
            setEditingCat(null);
          }}
        />
      )}

      {editingSub !== null && (
        <SubcategoryFormModal
          initial={editingSub.mode === 'edit' ? editingSub.sub : null}
          onClose={() => setEditingSub(null)}
          onSave={(data) => {
            if (editingSub.mode === 'new') addSubcategory(editingSub.categoryId, data);
            else updateSubcategory(editingSub.categoryId, editingSub.sub.id, data);
            setEditingSub(null);
          }}
        />
      )}

      <CatalogProductsBlock />
    </section>
  );
}

/* ─── Prodotti dal catalogo merceologico ─────────────────────────────────
   Mostra tutti i prodotti definiti nell'area merceologica (useCatalogoStore).
   Sono inclusi di default nella pagina pacchetti come servizi selezionabili.
   Da qui l'admin può disabilitare singole voci per la sezione pacchetti senza
   toccare il catalogo principale. */

function CatalogProductsBlock() {
  const { isCatalogProductEnabled, setCatalogProductEnabled, disabledCatalogProductIds } =
    useDynamicPackagesConfig();
  const prodotti  = useCatalogoStore((s) => s.prodotti);
  const fornitori = useCatalogoStore((s) => s.fornitori);
  const categorie = useCatalogoStore((s) => s.categorie);

  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCategory = new Map<string, { categoriaNome: string; items: typeof prodotti }>();
    for (const p of prodotti) {
      if (q) {
        const fNome = fornitori.find((f) => f.id === p.fornitoreId)?.nome ?? '';
        const hay = `${p.nome} ${p.descrizione} ${fNome}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const cat = categorie.find((c) => c.id === p.categoriaId);
      const key = cat?.id ?? '__none__';
      const entry = byCategory.get(key);
      if (entry) entry.items.push(p);
      else byCategory.set(key, { categoriaNome: cat?.nome ?? 'Senza categoria', items: [p] });
    }
    return Array.from(byCategory.entries()).map(([id, g]) => ({ id, ...g }));
  }, [prodotti, fornitori, categorie, search]);

  const totalEnabled = prodotti.length - disabledCatalogProductIds.size;

  const enableAll = () => {
    disabledCatalogProductIds.forEach((id) => setCatalogProductEnabled(id, true));
  };
  const disableAll = () => {
    for (const p of prodotti) setCatalogProductEnabled(p.id, false);
  };

  return (
    <div className="admin-pkg__catalog">
      <div className="admin-pkg__section-head">
        <div>
          <h3 className="admin-pkg__catalog-title">
            <Icon family="light" name="bag-shopping" /> Prodotti dal catalogo merceologico
          </h3>
          <p className="admin-pkg__section-hint">
            Tutti i prodotti dell'area merceologica sono inseriti di default come servizi della
            categoria <strong>Prodotti merceologici</strong> nella pagina utente. Disattiva qui
            le singole voci che non devono comparire nella composizione dei pacchetti.
          </p>
        </div>
        <div className="admin-pkg__catalog-summary">
          <span className="admin-pkg__catalog-count">
            {totalEnabled}/{prodotti.length} attivi
          </span>
          <button type="button" className="admin-pkg__btn admin-pkg__btn--ghost admin-pkg__btn--sm" onClick={enableAll}>
            Abilita tutti
          </button>
          <button type="button" className="admin-pkg__btn admin-pkg__btn--ghost admin-pkg__btn--sm" onClick={disableAll}>
            Disabilita tutti
          </button>
        </div>
      </div>

      <div className="admin-pkg__catalog-search">
        <Icon family="light" name="magnifying-glass" />
        <input
          type="text"
          placeholder="Cerca prodotto, fornitore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {prodotti.length === 0 ? (
        <div className="admin-pkg__empty">
          Nessun prodotto in catalogo. Aggiungi prodotti dall'area merceologica per vederli qui.
        </div>
      ) : groups.length === 0 ? (
        <div className="admin-pkg__empty">Nessun prodotto corrisponde alla ricerca.</div>
      ) : (
        <div className="admin-pkg__catalog-groups">
          {groups.map((g) => (
            <div key={g.id} className="admin-pkg__catalog-group">
              <div className="admin-pkg__catalog-group-head">
                <span className="admin-pkg__catalog-group-name">{g.categoriaNome}</span>
                <span className="admin-pkg__catalog-group-count">{g.items.length}</span>
              </div>
              <ul className="admin-pkg__catalog-list">
                {g.items.map((p) => {
                  const enabled = isCatalogProductEnabled(p.id);
                  const fornitore = fornitori.find((f) => f.id === p.fornitoreId);
                  const notPublishable = !p.attivo || !p.pubblicato;
                  return (
                    <li
                      key={p.id}
                      className={`admin-pkg__catalog-item${enabled ? '' : ' admin-pkg__catalog-item--disabled'}`}
                    >
                      <div className="admin-pkg__catalog-item-thumb">
                        {p.immagineUrl ? (
                          <img src={p.immagineUrl} alt={p.nome} />
                        ) : (
                          <Icon family="light" name="image" />
                        )}
                      </div>
                      <div className="admin-pkg__catalog-item-text">
                        <span className="admin-pkg__catalog-item-name">{p.nome}</span>
                        <span className="admin-pkg__catalog-item-meta">
                          {fornitore?.nome ?? '—'}
                          {' · '}€ {p.prezzoBase.toFixed(2)} / {p.unita}
                          {notPublishable && (
                            <span className="admin-pkg__catalog-item-tag" title="Prodotto non attivo o non pubblicato in catalogo">
                              non pubblicato
                            </span>
                          )}
                        </span>
                      </div>
                      <label className="admin-pkg__switch" title={enabled ? 'Disattiva nei pacchetti' : 'Attiva nei pacchetti'}>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setCatalogProductEnabled(p.id, e.target.checked)}
                        />
                        <span className="admin-pkg__switch-slider" />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function accentLabel(a: DPAccent): string {
  return DP_ACCENTS.find(x => x.value === a)?.label ?? a;
}

/* ─── Category form ──────────────────────────────────────── */

interface CategoryFormProps {
  initial: DPCategory | null;
  onClose: () => void;
  onSave: (data: Omit<DPCategory, 'id' | 'subcategories'>) => void;
}

function CategoryFormModal({ initial, onClose, onSave }: CategoryFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'box');
  const [accent, setAccent] = useState<DPAccent>(initial?.accent ?? 'sleep');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), icon: icon.trim() || 'box', accent });
  };

  return (
    <ModalShell title={initial ? 'Modifica categoria' : 'Nuova categoria'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="admin-pkg__form">
        <div className="admin-pkg__field">
          <label>Titolo</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="es. Soggiorno" />
        </div>
        <div className="admin-pkg__field">
          <label>Icona (nome Font Awesome)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="es. bed" />
          <span className="admin-pkg__field-hint">
            Nome icona Font Awesome senza prefisso fa-. Es: <code>bed</code>, <code>utensils</code>, <code>compass</code>.
          </span>
        </div>
        <div className="admin-pkg__field">
          <label>Accent (colore)</label>
          <select value={accent} onChange={e => setAccent(e.target.value as DPAccent)}>
            {DP_ACCENTS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <FormActions onClose={onClose} saveLabel={initial ? 'Salva' : 'Crea categoria'} />
      </form>
    </ModalShell>
  );
}

/* ─── Subcategory form ───────────────────────────────────── */

interface SubFormProps {
  initial: DPSubcategory | null;
  onClose: () => void;
  onSave: (data: Omit<DPSubcategory, 'id'>) => void;
}

function SubcategoryFormModal({ initial, onClose, onSave }: SubFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'tag');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      icon: icon.trim() || 'tag',
      venue: venue.trim(),
      address: address.trim(),
    });
  };

  return (
    <ModalShell title={initial ? 'Modifica servizio' : 'Nuovo servizio'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="admin-pkg__form">
        <div className="admin-pkg__field">
          <label>Etichetta</label>
          <input value={label} onChange={e => setLabel(e.target.value)} required placeholder="es. Hotel" />
        </div>
        <div className="admin-pkg__field">
          <label>Icona (nome Font Awesome)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="es. hotel" />
        </div>
        <div className="admin-pkg__field">
          <label>Fornitore / venue</label>
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="es. Hotel Continental" />
        </div>
        <div className="admin-pkg__field">
          <label>Indirizzo</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="es. Via Veneto 24, Roma" />
        </div>
        <FormActions onClose={onClose} saveLabel={initial ? 'Salva' : 'Crea servizio'} />
      </form>
    </ModalShell>
  );
}

/* ============================================================
   Sezione 2 — Temi pacchetto
   ============================================================ */

function ThemesSection() {
  const { themes, addTheme, updateTheme, removeTheme } = useDynamicPackagesConfig();
  const [editing, setEditing] = useState<DPTheme | 'new' | null>(null);

  return (
    <section className="admin-pkg__section">
      <div className="admin-pkg__section-head">
        <div>
          <h2 className="admin-pkg__section-title">Temi pacchetto</h2>
          <p className="admin-pkg__section-hint">
            I temi sono i pacchetti preconfezionati proposti all'utente: per ogni tema vengono
            generati un nome, un numero di notti suggerite e un prezzo derivato dal budget tramite
            un fattore moltiplicativo (0–1).
          </p>
        </div>
        <button
          type="button"
          className="admin-pkg__btn admin-pkg__btn--primary"
          onClick={() => setEditing('new')}
        >
          <Icon family="solid" name="plus" /> Nuovo tema
        </button>
      </div>

      {themes.length === 0 ? (
        <div className="admin-pkg__empty">Nessun tema configurato.</div>
      ) : (
        <div className="sib-table-wrap">
        <table className="sib-table admin-pkg__table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Fattore prezzo</th>
              <th>Notti</th>
              <th>Descrizione</th>
              <th className="admin-pkg__table-actions" />
            </tr>
          </thead>
          <tbody>
            {themes.map(t => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong></td>
                <td>×&nbsp;{t.factor.toFixed(2)}</td>
                <td>{t.nights}</td>
                <td className="admin-pkg__table-desc">{t.description}</td>
                <td className="admin-pkg__table-actions">
                  <button
                    type="button"
                    className="admin-pkg__icon-btn"
                    title="Modifica tema"
                    onClick={() => setEditing(t)}
                  >
                    <Icon family="light" name="pen" />
                  </button>
                  <button
                    type="button"
                    className="admin-pkg__icon-btn admin-pkg__icon-btn--danger"
                    title="Elimina tema"
                    onClick={() => {
                      if (window.confirm(`Eliminare il tema "${t.name}"?`)) removeTheme(t.id);
                    }}
                  >
                    <Icon family="light" name="trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {editing !== null && (
        <ThemeFormModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') addTheme(data);
            else updateTheme(editing.id, data);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

interface ThemeFormProps {
  initial: DPTheme | null;
  onClose: () => void;
  onSave: (data: Omit<DPTheme, 'id'>) => void;
}

function ThemeFormModal({ initial, onClose, onSave }: ThemeFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [factor, setFactor] = useState(initial?.factor ?? 0.5);
  const [nights, setNights] = useState(initial?.nights ?? 2);
  const [description, setDescription] = useState(initial?.description ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const f = Math.min(1, Math.max(0.05, factor || 0));
    const n = Math.max(1, Math.round(nights || 1));
    onSave({ name: name.trim(), factor: f, nights: n, description: description.trim() });
  };

  return (
    <ModalShell title={initial ? 'Modifica tema' : 'Nuovo tema'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="admin-pkg__form">
        <div className="admin-pkg__field">
          <label>Nome tema</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="es. Pacchetto Romantico" />
        </div>
        <div className="admin-pkg__row">
          <div className="admin-pkg__field">
            <label>Fattore prezzo (0.05 – 1.00)</label>
            <input
              type="number"
              step="0.05"
              min="0.05"
              max="1"
              value={factor}
              onChange={e => setFactor(Number(e.target.value))}
              required
            />
            <span className="admin-pkg__field-hint">
              Es. 0.55 = il pacchetto costa il 55% del budget impostato.
            </span>
          </div>
          <div className="admin-pkg__field">
            <label>Notti suggerite</label>
            <input
              type="number"
              min="1"
              max="30"
              value={nights}
              onChange={e => setNights(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <div className="admin-pkg__field">
          <label>Descrizione</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrizione del pacchetto" />
        </div>
        <FormActions onClose={onClose} saveLabel={initial ? 'Salva' : 'Crea tema'} />
      </form>
    </ModalShell>
  );
}

/* ============================================================
   Sezione 3 — Parametri di selezione
   ============================================================ */

function ParamsSection() {
  const { params, updateParams } = useDynamicPackagesConfig();
  const [draft, setDraft] = useState<DPParams>(params);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(params), [params]);

  const dirty = useMemo(
    () => (Object.keys(params) as (keyof DPParams)[]).some(k => params[k] !== draft[k]),
    [params, draft],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Vincoli base: min <= default <= max, default ≥ 1
    const next: DPParams = {
      ...draft,
      budgetMin:    Math.max(0, Math.floor(draft.budgetMin)),
      budgetMax:    Math.max(draft.budgetMin + draft.budgetStep, Math.floor(draft.budgetMax)),
      budgetDefault: Math.min(Math.max(draft.budgetMin, draft.budgetDefault), draft.budgetMax),
      budgetStep:   Math.max(1, Math.floor(draft.budgetStep)),
      defaultAdults: Math.min(Math.max(1, draft.defaultAdults), draft.maxAdults),
      defaultChildren: Math.min(Math.max(0, draft.defaultChildren), draft.maxChildren),
      maxAdults:    Math.max(1, draft.maxAdults),
      maxChildren:  Math.max(0, draft.maxChildren),
    };
    updateParams(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const set = (k: keyof DPParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => ({ ...d, [k]: Number(e.target.value) }));

  return (
    <section className="admin-pkg__section">
      <div className="admin-pkg__section-head">
        <div>
          <h2 className="admin-pkg__section-title">Parametri di selezione</h2>
          <p className="admin-pkg__section-hint">
            Imposta i limiti dei controlli (slider budget, stepper adulti/bambini) e i loro valori
            iniziali nella pagina utente.
          </p>
        </div>
        {saved && <span className="admin-pkg__saved">✓ Salvato</span>}
      </div>

      <form onSubmit={handleSubmit} className="admin-pkg__params">
        <fieldset className="admin-pkg__fieldset">
          <legend>Budget (€)</legend>
          <div className="admin-pkg__row">
            <div className="admin-pkg__field">
              <label>Minimo</label>
              <input type="number" min="0" value={draft.budgetMin} onChange={set('budgetMin')} required />
            </div>
            <div className="admin-pkg__field">
              <label>Massimo</label>
              <input type="number" min="0" value={draft.budgetMax} onChange={set('budgetMax')} required />
            </div>
            <div className="admin-pkg__field">
              <label>Default</label>
              <input type="number" min="0" value={draft.budgetDefault} onChange={set('budgetDefault')} required />
            </div>
            <div className="admin-pkg__field">
              <label>Step</label>
              <input type="number" min="1" value={draft.budgetStep} onChange={set('budgetStep')} required />
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-pkg__fieldset">
          <legend>Adulti</legend>
          <div className="admin-pkg__row">
            <div className="admin-pkg__field">
              <label>Default</label>
              <input type="number" min="1" value={draft.defaultAdults} onChange={set('defaultAdults')} required />
            </div>
            <div className="admin-pkg__field">
              <label>Massimo</label>
              <input type="number" min="1" value={draft.maxAdults} onChange={set('maxAdults')} required />
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-pkg__fieldset">
          <legend>Bambini</legend>
          <div className="admin-pkg__row">
            <div className="admin-pkg__field">
              <label>Default</label>
              <input type="number" min="0" value={draft.defaultChildren} onChange={set('defaultChildren')} required />
            </div>
            <div className="admin-pkg__field">
              <label>Massimo</label>
              <input type="number" min="0" value={draft.maxChildren} onChange={set('maxChildren')} required />
            </div>
          </div>
        </fieldset>

        <div className="admin-pkg__params-actions">
          <button
            type="button"
            className="admin-pkg__btn admin-pkg__btn--ghost"
            onClick={() => setDraft(params)}
            disabled={!dirty}
          >
            Annulla modifiche
          </button>
          <button type="submit" className="admin-pkg__btn admin-pkg__btn--primary" disabled={!dirty}>
            <Icon family="solid" name="floppy-disk" /> Salva parametri
          </button>
        </div>
      </form>
    </section>
  );
}

/* ============================================================
   Shared bits — modal + form actions
   ============================================================ */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

  return (
    <div className="admin-pkg__modal" role="presentation" onClick={onClose}>
      <div className="admin-pkg__modal-box" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <header className="admin-pkg__modal-head">
          <h3>{title}</h3>
          <button type="button" className="admin-pkg__icon-btn" onClick={onClose} aria-label="Chiudi">
            <Icon family="light" name="xmark" />
          </button>
        </header>
        <div className="admin-pkg__modal-body">{children}</div>
      </div>
    </div>
  );
}

function FormActions({ onClose, saveLabel }: { onClose: () => void; saveLabel: string }) {
  return (
    <div className="admin-pkg__form-actions">
      <button type="button" className="admin-pkg__btn admin-pkg__btn--ghost" onClick={onClose}>
        Annulla
      </button>
      <button type="submit" className="admin-pkg__btn admin-pkg__btn--primary">
        {saveLabel}
      </button>
    </div>
  );
}
