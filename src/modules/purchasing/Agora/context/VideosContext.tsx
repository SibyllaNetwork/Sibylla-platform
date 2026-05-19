/*
 * VideosContext — registry di video tutorial della pagina E-learning.
 *
 * Storage: localStorage (chiave `agora.videos.v1`). Niente backend: i video
 * NON sono ospitati dalla piattaforma, sono solo metadati che puntano a
 * un provider esterno (YouTube / Vimeo / URL diretto). Conseguenza voluta:
 * il bundle dell'app non aumenta al crescere della libreria video.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type VideoLevel = 'base' | 'intermedio' | 'avanzato';
export type VideoProvider = 'youtube' | 'vimeo' | 'url';

export interface Video {
  id: string;
  title: string;
  description: string;
  category: string;        // id categoria (vedi VIDEO_CATEGORIES)
  level: VideoLevel;
  duration: string;        // formato libero (es. "5:24")
  views: number;
  daysAgo: number;         // giorni dalla pubblicazione (cosmetico)
  provider: VideoProvider;
  source: string;          // YouTube ID, Vimeo ID o URL diretto (mp4/hls/...)
  poster?: string;         // thumb custom — se assente, fallback automatico (YouTube)
  createdAt: string;       // ISO timestamp di inserimento
  /**
   * Visibilità lato utente. Indipendente da `source`:
   *  - published=true + source vuoto → l'admin lo considera pubblicabile ma
   *    finché manca la sorgente la pagina E-learning mostra il bottone disabilitato.
   *  - published=false → il video resta nell'elenco admin ma non compare
   *    affatto sulla pagina E-learning (utile per nasconderlo temporaneamente).
   */
  published: boolean;
}

export interface VideoCategory {
  id: string;
  label: string;
  icon: string;
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  { id: 'primi-passi', label: 'Primi passi',         icon: 'compass'           },
  { id: 'pacchetti',   label: 'Pacchetti dinamici',  icon: 'box'               },
  { id: 'catalogo',    label: 'Catalogo',            icon: 'grid-2'            },
  { id: 'preventivi',  label: 'Preventivi',          icon: 'file-circle-check' },
  { id: 'acquisti',    label: 'Acquisti di Rete',    icon: 'users'             },
  { id: 'tradezone',   label: 'Tradezone',           icon: 'scale-balanced'    },
  { id: 'match',       label: 'Match Zone',          icon: 'circle-nodes'      },
  { id: 'academy',     label: 'Accademia',           icon: 'graduation-cap'    },
];

export const VIDEO_CATEGORY_GRADIENT: Record<string, string> = {
  'primi-passi': 'linear-gradient(135deg, #1a3a5c 0%, #2e5f8f 100%)',
  'pacchetti':   'linear-gradient(135deg, #b06d00 0%, #f3a823 100%)',
  'catalogo':    'linear-gradient(135deg, #1a6b5e 0%, #2ba390 100%)',
  'preventivi':  'linear-gradient(135deg, #5a2c7b 0%, #8a52b0 100%)',
  'acquisti':    'linear-gradient(135deg, #a13838 0%, #d76060 100%)',
  'tradezone':   'linear-gradient(135deg, #204769 0%, #5c9cd4 100%)',
  'match':       'linear-gradient(135deg, #0c5778 0%, #1d8eb8 100%)',
  'academy':     'linear-gradient(135deg, #2c3a6b 0%, #4f63a4 100%)',
};

/* ────────────────────────────────────────────────────────────────────────
 * Helpers — estrazione id provider, thumbnail di fallback
 * ──────────────────────────────────────────────────────────────────────── */

const YT_ID_RE = /^[\w-]{11}$/;
const YT_URL_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

/** Accetta sia ID puro (11 char) sia URL completo, restituisce solo l'ID. */
export function parseYouTubeId(input: string): string {
  const t = input.trim();
  if (YT_ID_RE.test(t)) return t;
  const m = t.match(YT_URL_RE);
  return m ? m[1] : t;
}

const VIMEO_URL_RE = /vimeo\.com\/(?:video\/|channels\/[\w]+\/)?(\d+)/;

/** Accetta sia ID numerico sia URL Vimeo, restituisce solo l'ID. */
export function parseVimeoId(input: string): string {
  const t = input.trim();
  if (/^\d+$/.test(t)) return t;
  const m = t.match(VIMEO_URL_RE);
  return m ? m[1] : t;
}

/** URL del poster da mostrare prima del play. */
export function videoPoster(v: Video): string | undefined {
  if (v.poster) return v.poster;
  if (v.provider === 'youtube' && v.source) {
    return `https://i.ytimg.com/vi/${parseYouTubeId(v.source)}/hqdefault.jpg`;
  }
  return undefined;
}

/* ────────────────────────────────────────────────────────────────────────
 * Seed — i 12 tutorial originari rimangono visibili anche al primo avvio,
 * con `source` vuoto: l'admin completerà i metadati dal pannello.
 * ──────────────────────────────────────────────────────────────────────── */

const NOW = new Date().toISOString();

const SEED: Video[] = [
  { id: 'v1',  title: 'Benvenuto in Agorà — tour della piattaforma',         description: 'Una panoramica completa di tutte le sezioni: dalla landing alla dashboard, fino alle funzionalità avanzate.', category: 'primi-passi', level: 'base',        duration: '5:24',  views: 1240, daysAgo: 2,  provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v2',  title: 'Crea il tuo primo pacchetto dinamico',                description: 'Impara a selezionare servizi, impostare il budget e generare voucher personalizzati per i tuoi clienti.',     category: 'pacchetti',   level: 'base',        duration: '8:12',  views: 890,  daysAgo: 4,  provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v3',  title: 'Borsellino voucher: salvare, acquistare, condividere',description: 'Come gestire la collezione di voucher generati, distinguere salvati e acquistati.',                            category: 'pacchetti',   level: 'intermedio',  duration: '4:45',  views: 540,  daysAgo: 7,  provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v4',  title: "Esplorare l'area merceologica",                       description: 'Naviga le categorie di prodotti e trova rapidamente quello che ti serve.',                                    category: 'catalogo',    level: 'base',        duration: '6:30',  views: 720,  daysAgo: 10, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v5',  title: 'Filtrare e ordinare i fornitori',                     description: 'Usa filtri avanzati per individuare i partner più adatti alla tua struttura.',                                category: 'catalogo',    level: 'base',        duration: '3:55',  views: 410,  daysAgo: 12, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v6',  title: 'Creare un preventivo da zero',                        description: 'Compila richieste di preventivo dettagliate e tracciale dalla creazione alla conferma.',                      category: 'preventivi',  level: 'intermedio',  duration: '12:08', views: 1100, daysAgo: 15, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v7',  title: "Acquisti di Rete: condividere il potere d'acquisto",  description: 'Unisci la domanda con altre strutture per ottenere condizioni migliori dai fornitori.',                       category: 'acquisti',    level: 'intermedio',  duration: '7:20',  views: 850,  daysAgo: 18, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v8',  title: 'Tradezone: annunci, offerte e bacheca',               description: 'Pubblica e rispondi agli annunci della community Agorà.',                                                     category: 'tradezone',   level: 'base',        duration: '5:10',  views: 320,  daysAgo: 20, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v9',  title: 'Match Zone: trovare i partner ideali',                description: "L'algoritmo che ti suggerisce le connessioni più affini al tuo profilo.",                                     category: 'match',       level: 'avanzato',    duration: '9:45',  views: 680,  daysAgo: 25, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v10', title: 'Accademia: gestire personale e corsi',                description: 'Pubblica offerte, organizza corsi di formazione e mantieni il team allineato.',                               category: 'academy',     level: 'intermedio',  duration: '6:55',  views: 450,  daysAgo: 28, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v11', title: 'Profilo struttura: ottimizzare la presenza',          description: 'Compila i dati della tua struttura per apparire al meglio nei risultati.',                                    category: 'primi-passi', level: 'base',        duration: '4:20',  views: 980,  daysAgo: 32, provider: 'youtube', source: '', createdAt: NOW, published: true },
  { id: 'v12', title: 'Stampa, PDF ed email dei voucher',                    description: 'Esporta i tuoi voucher pronti alla consegna, in formato digitale o cartaceo.',                                category: 'pacchetti',   level: 'base',        duration: '3:48',  views: 290,  daysAgo: 35, provider: 'youtube', source: '', createdAt: NOW, published: true },
];

/* ────────────────────────────────────────────────────────────────────────
 * Context
 * ──────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'agora.videos.v1';

interface VideosCtx {
  videos: Video[];
  getById: (id: string) => Video | undefined;
  addVideo: (v: Omit<Video, 'id' | 'createdAt'>) => Video;
  updateVideo: (id: string, patch: Partial<Omit<Video, 'id' | 'createdAt'>>) => void;
  removeVideo: (id: string) => void;
  resetToSeed: () => void;
}

const Ctx = createContext<VideosCtx | undefined>(undefined);

function loadFromStorage(): Video[] {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Video[];
    if (!Array.isArray(parsed)) return SEED;
    // Retrocompat: record salvati prima dell'introduzione del flag `published`.
    return parsed.map((v) => ({
      ...v,
      published: typeof v.published === 'boolean' ? v.published : true,
    }));
  } catch {
    return SEED;
  }
}

function saveToStorage(videos: Video[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  } catch {
    /* quota? niente da fare lato client */
  }
}

function genId(): string {
  return 'v_' + Math.random().toString(36).slice(2, 9);
}

export function VideosProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Video[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(videos);
  }, [videos]);

  const getById = useCallback((id: string) => videos.find((v) => v.id === id), [videos]);

  const addVideo: VideosCtx['addVideo'] = useCallback((data) => {
    const v: Video = { ...data, id: genId(), createdAt: new Date().toISOString() };
    setVideos((prev) => [v, ...prev]);
    return v;
  }, []);

  const updateVideo: VideosCtx['updateVideo'] = useCallback((id, patch) => {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const removeVideo: VideosCtx['removeVideo'] = useCallback((id) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const resetToSeed = useCallback(() => setVideos(SEED), []);

  const value = useMemo(
    () => ({ videos, getById, addVideo, updateVideo, removeVideo, resetToSeed }),
    [videos, getById, addVideo, updateVideo, removeVideo, resetToSeed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVideos(): VideosCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVideos deve essere usato dentro <VideosProvider>');
  return ctx;
}
