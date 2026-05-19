/*
 * DynamicPackagesConfigContext — sorgente unica per la configurazione della
 * pagina "Pacchetti dinamici". Espone categorie/servizi, temi pacchetto e
 * parametri di selezione, con i relativi CRUD. La pagina utente legge da qui
 * la struttura del catalogo; la pagina admin (/admin/packages) la modifica.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type DPAccent = 'sleep' | 'services' | 'taste' | 'adventure';

export const DP_ACCENTS: { value: DPAccent; label: string }[] = [
  { value: 'sleep',     label: 'Soggiorno (blu)' },
  { value: 'services',  label: 'Servizi (turchese)' },
  { value: 'taste',     label: 'Sapori (ambra)' },
  { value: 'adventure', label: 'Esperienze (verde)' },
];

export interface DPSubcategory {
  id: string;
  label: string;
  icon: string;
  venue: string;
  address: string;
}

export interface DPCategory {
  id: string;
  title: string;
  icon: string;
  accent: DPAccent;
  subcategories: DPSubcategory[];
}

export interface DPTheme {
  id: string;
  name: string;
  /** Fattore di prezzo (0.1 – 1.0) applicato al budget per stimare il totale. */
  factor: number;
  /** Numero di notti suggerite del pacchetto. */
  nights: number;
  description: string;
}

export interface DPParams {
  budgetMin: number;
  budgetMax: number;
  budgetDefault: number;
  budgetStep: number;
  defaultAdults: number;
  defaultChildren: number;
  maxAdults: number;
  maxChildren: number;
}

/* ─── Default seed (allineato ai valori storici della DynamicPackagesPage) ─ */

const DEFAULT_CATEGORIES: DPCategory[] = [
  {
    id: 'soggiorno',
    title: 'Soggiorno',
    icon: 'bed',
    accent: 'sleep',
    subcategories: [
      { id: 'hotel',        label: 'Hotel',        icon: 'hotel',    venue: 'Hotel Continental',           address: 'Via Veneto 24, Roma' },
      { id: 'appartamento', label: 'Appartamento', icon: 'building', venue: 'Casa Trastevere',             address: 'Via della Lungaretta 78, Roma' },
      { id: 'bnb',          label: 'B&B',          icon: 'house',    venue: 'B&B Domus',                   address: 'Via Arenula 5, Roma' },
    ],
  },
  {
    id: 'prodotti-servizi',
    title: 'Prodotti & Servizi',
    icon: 'box',
    accent: 'services',
    subcategories: [
      { id: 'trasporti',        label: 'Trasporti',        icon: 'car',          venue: 'Roma Cab Service',     address: 'Servizio NCC con autista' },
      { id: 'deposito-bagagli', label: 'Deposito bagagli', icon: 'suitcase',     venue: 'Stash Termini',        address: 'Via Marsala 10, Roma' },
      { id: 'prodotti',         label: 'Prodotti',         icon: 'bag-shopping', venue: 'Eataly Roma Ostiense', address: 'Piazzale 12 Ottobre 1492, Roma' },
    ],
  },
  {
    id: 'sapori',
    title: 'Sapori',
    icon: 'utensils',
    accent: 'taste',
    subcategories: [
      { id: 'osteria', label: 'Osteria', icon: 'wine-glass',         venue: 'Osteria del Pegno',          address: 'Vicolo di Montevecchio 8, Roma' },
      { id: 'gourmet', label: 'Gourmet', icon: 'champagne-glasses',  venue: 'Ristorante Romolo e Remo',   address: 'Via Tragliatella 2, Roma' },
      { id: 'casual',  label: 'Casual',  icon: 'burger',             venue: 'Trapizzino Piazza Trilussa', address: 'Piazza Trilussa 46, Roma' },
    ],
  },
  {
    id: 'esperienze',
    title: 'Esperienze',
    icon: 'compass',
    accent: 'adventure',
    subcategories: [
      { id: 'adrenalina', label: 'Adrenalina',   icon: 'mountain', venue: 'Roma Rafting',                  address: 'Fiume Aniene, Tivoli' },
      { id: 'tour-musei', label: 'Tour & musei', icon: 'landmark', venue: 'Musei Vaticani',                address: 'Viale Vaticano, Roma' },
      { id: 'eventi',     label: 'Eventi',       icon: 'ticket',   venue: 'Auditorium Parco della Musica', address: 'Viale Pietro de Coubertin 30, Roma' },
    ],
  },
];

const DEFAULT_THEMES: DPTheme[] = [
  { id: 'romantico', name: 'Pacchetto Romantico', factor: 0.55, nights: 2, description: 'Esperienza curata per coppie' },
  { id: 'avventura', name: 'Pacchetto Avventura', factor: 0.7,  nights: 3, description: 'Adrenalina e scoperta del territorio' },
  { id: 'famiglia',  name: 'Pacchetto Famiglia',  factor: 0.85, nights: 4, description: 'Ideale per gruppi e famiglie' },
  { id: 'gourmet',   name: 'Pacchetto Gourmet',   factor: 0.95, nights: 2, description: 'Sapori autentici e ospitalità' },
];

const DEFAULT_PARAMS: DPParams = {
  budgetMin: 0,
  budgetMax: 500,
  budgetDefault: 250,
  budgetStep: 10,
  defaultAdults: 2,
  defaultChildren: 0,
  maxAdults: 12,
  maxChildren: 8,
};

/* ─── Context ──────────────────────────────────────────────────────────── */

interface DPConfigCtx {
  categories: DPCategory[];
  themes: DPTheme[];
  params: DPParams;

  /** ID dei prodotti del catalogo merceologico esclusi dalla pagina pacchetti.
   *  Per default tutti i prodotti del catalogo sono inclusi: vengono escluse
   *  solo le voci esplicitamente disattivate dall'admin (set per minimizzare
   *  l'occupazione quando il catalogo cresce). */
  disabledCatalogProductIds: Set<string>;

  addCategory: (c: Omit<DPCategory, 'id' | 'subcategories'>) => void;
  updateCategory: (id: string, c: Omit<DPCategory, 'id' | 'subcategories'>) => void;
  removeCategory: (id: string) => void;

  addSubcategory: (catId: string, s: Omit<DPSubcategory, 'id'>) => void;
  updateSubcategory: (catId: string, subId: string, s: Omit<DPSubcategory, 'id'>) => void;
  removeSubcategory: (catId: string, subId: string) => void;

  addTheme: (t: Omit<DPTheme, 'id'>) => void;
  updateTheme: (id: string, t: Omit<DPTheme, 'id'>) => void;
  removeTheme: (id: string) => void;

  updateParams: (p: Partial<DPParams>) => void;
  setCatalogProductEnabled: (id: string, enabled: boolean) => void;
  isCatalogProductEnabled: (id: string) => boolean;
  resetToDefaults: () => void;
}

const Ctx = createContext<DPConfigCtx | undefined>(undefined);

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DynamicPackagesConfigProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<DPCategory[]>(DEFAULT_CATEGORIES);
  const [themes, setThemes] = useState<DPTheme[]>(DEFAULT_THEMES);
  const [params, setParams] = useState<DPParams>(DEFAULT_PARAMS);
  const [disabledCatalogProductIds, setDisabledCatalogProductIds] = useState<Set<string>>(
    () => new Set(),
  );

  const addCategory: DPConfigCtx['addCategory'] = useCallback((c) => {
    setCategories((prev) => [...prev, { ...c, id: newId('cat'), subcategories: [] }]);
  }, []);

  const updateCategory: DPConfigCtx['updateCategory'] = useCallback((id, c) => {
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...c } : cat)));
  }, []);

  const removeCategory: DPConfigCtx['removeCategory'] = useCallback((id) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  }, []);

  const addSubcategory: DPConfigCtx['addSubcategory'] = useCallback((catId, s) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, subcategories: [...cat.subcategories, { ...s, id: newId('sub') }] }
          : cat,
      ),
    );
  }, []);

  const updateSubcategory: DPConfigCtx['updateSubcategory'] = useCallback((catId, subId, s) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              subcategories: cat.subcategories.map((sub) =>
                sub.id === subId ? { ...sub, ...s } : sub,
              ),
            }
          : cat,
      ),
    );
  }, []);

  const removeSubcategory: DPConfigCtx['removeSubcategory'] = useCallback((catId, subId) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, subcategories: cat.subcategories.filter((s) => s.id !== subId) }
          : cat,
      ),
    );
  }, []);

  const addTheme: DPConfigCtx['addTheme'] = useCallback((t) => {
    setThemes((prev) => [...prev, { ...t, id: newId('thm') }]);
  }, []);

  const updateTheme: DPConfigCtx['updateTheme'] = useCallback((id, t) => {
    setThemes((prev) => prev.map((th) => (th.id === id ? { ...th, ...t } : th)));
  }, []);

  const removeTheme: DPConfigCtx['removeTheme'] = useCallback((id) => {
    setThemes((prev) => prev.filter((th) => th.id !== id));
  }, []);

  const updateParams: DPConfigCtx['updateParams'] = useCallback((p) => {
    setParams((prev) => ({ ...prev, ...p }));
  }, []);

  const setCatalogProductEnabled: DPConfigCtx['setCatalogProductEnabled'] = useCallback(
    (id, enabled) => {
      setDisabledCatalogProductIds((prev) => {
        const next = new Set(prev);
        if (enabled) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  const isCatalogProductEnabled: DPConfigCtx['isCatalogProductEnabled'] = useCallback(
    (id) => !disabledCatalogProductIds.has(id),
    [disabledCatalogProductIds],
  );

  const resetToDefaults: DPConfigCtx['resetToDefaults'] = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    setThemes(DEFAULT_THEMES);
    setParams(DEFAULT_PARAMS);
    setDisabledCatalogProductIds(new Set());
  }, []);

  const value = useMemo<DPConfigCtx>(
    () => ({
      categories,
      themes,
      params,
      disabledCatalogProductIds,
      addCategory, updateCategory, removeCategory,
      addSubcategory, updateSubcategory, removeSubcategory,
      addTheme, updateTheme, removeTheme,
      updateParams,
      setCatalogProductEnabled, isCatalogProductEnabled,
      resetToDefaults,
    }),
    [
      categories, themes, params, disabledCatalogProductIds,
      addCategory, updateCategory, removeCategory,
      addSubcategory, updateSubcategory, removeSubcategory,
      addTheme, updateTheme, removeTheme,
      updateParams,
      setCatalogProductEnabled, isCatalogProductEnabled,
      resetToDefaults,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDynamicPackagesConfig(): DPConfigCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDynamicPackagesConfig deve essere usato dentro <DynamicPackagesConfigProvider>');
  return ctx;
}
