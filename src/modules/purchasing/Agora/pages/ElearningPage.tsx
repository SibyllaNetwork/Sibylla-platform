import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { Button } from '../ds/button';
import { H2, H3, P3 } from '../ds/typography';
import './ElearningPage.css';

type VideoLevel = 'base' | 'intermedio' | 'avanzato';

interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  views: number;
  daysAgo: number;
  level: VideoLevel;
}

interface VideoCategory {
  id: string;
  label: string;
  icon: string;
}

const CATEGORIES: VideoCategory[] = [
  { id: 'primi-passi', label: 'Primi passi', icon: 'compass' },
  { id: 'pacchetti', label: 'Pacchetti dinamici', icon: 'box' },
  { id: 'catalogo', label: 'Catalogo', icon: 'grid-2' },
  { id: 'preventivi', label: 'Preventivi', icon: 'file-circle-check' },
  { id: 'acquisti', label: 'Acquisti di Rete', icon: 'users' },
  { id: 'tradezone', label: 'Tradezone', icon: 'scale-balanced' },
  { id: 'match', label: 'Match Zone', icon: 'circle-nodes' },
  { id: 'academy', label: 'Accademia', icon: 'graduation-cap' },
];

const CATEGORY_GRADIENT: Record<string, string> = {
  'primi-passi': 'linear-gradient(135deg, #1a3a5c 0%, #2e5f8f 100%)',
  'pacchetti': 'linear-gradient(135deg, #b06d00 0%, #f3a823 100%)',
  'catalogo': 'linear-gradient(135deg, #1a6b5e 0%, #2ba390 100%)',
  'preventivi': 'linear-gradient(135deg, #5a2c7b 0%, #8a52b0 100%)',
  'acquisti': 'linear-gradient(135deg, #a13838 0%, #d76060 100%)',
  'tradezone': 'linear-gradient(135deg, #204769 0%, #5c9cd4 100%)',
  'match': 'linear-gradient(135deg, #0c5778 0%, #1d8eb8 100%)',
  'academy': 'linear-gradient(135deg, #2c3a6b 0%, #4f63a4 100%)',
};

const VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'Benvenuto in Agorà — tour della piattaforma',
    description:
      'Una panoramica completa di tutte le sezioni: dalla landing alla dashboard, fino alle funzionalità avanzate.',
    category: 'primi-passi',
    duration: '5:24',
    views: 1240,
    daysAgo: 2,
    level: 'base',
  },
  {
    id: 'v2',
    title: 'Crea il tuo primo pacchetto dinamico',
    description:
      'Impara a selezionare servizi, impostare il budget e generare voucher personalizzati per i tuoi clienti.',
    category: 'pacchetti',
    duration: '8:12',
    views: 890,
    daysAgo: 4,
    level: 'base',
  },
  {
    id: 'v3',
    title: 'Borsellino voucher: salvare, acquistare, condividere',
    description: 'Come gestire la collezione di voucher generati, distinguere salvati e acquistati.',
    category: 'pacchetti',
    duration: '4:45',
    views: 540,
    daysAgo: 7,
    level: 'intermedio',
  },
  {
    id: 'v4',
    title: 'Esplorare l\'area merceologica',
    description: 'Naviga le categorie di prodotti e trova rapidamente quello che ti serve.',
    category: 'catalogo',
    duration: '6:30',
    views: 720,
    daysAgo: 10,
    level: 'base',
  },
  {
    id: 'v5',
    title: 'Filtrare e ordinare i fornitori',
    description: 'Usa filtri avanzati per individuare i partner più adatti alla tua struttura.',
    category: 'catalogo',
    duration: '3:55',
    views: 410,
    daysAgo: 12,
    level: 'base',
  },
  {
    id: 'v6',
    title: 'Creare un preventivo da zero',
    description:
      'Compila richieste di preventivo dettagliate e tracciale dalla creazione alla conferma.',
    category: 'preventivi',
    duration: '12:08',
    views: 1100,
    daysAgo: 15,
    level: 'intermedio',
  },
  {
    id: 'v7',
    title: 'Acquisti di Rete: condividere il potere d\'acquisto',
    description:
      'Unisci la domanda con altre strutture per ottenere condizioni migliori dai fornitori.',
    category: 'acquisti',
    duration: '7:20',
    views: 850,
    daysAgo: 18,
    level: 'intermedio',
  },
  {
    id: 'v8',
    title: 'Tradezone: annunci, offerte e bacheca',
    description: 'Pubblica e rispondi agli annunci della community Agorà.',
    category: 'tradezone',
    duration: '5:10',
    views: 320,
    daysAgo: 20,
    level: 'base',
  },
  {
    id: 'v9',
    title: 'Match Zone: trovare i partner ideali',
    description: 'L\'algoritmo che ti suggerisce le connessioni più affini al tuo profilo.',
    category: 'match',
    duration: '9:45',
    views: 680,
    daysAgo: 25,
    level: 'avanzato',
  },
  {
    id: 'v10',
    title: 'Accademia: gestire personale e corsi',
    description: 'Pubblica offerte, organizza corsi di formazione e mantieni il team allineato.',
    category: 'academy',
    duration: '6:55',
    views: 450,
    daysAgo: 28,
    level: 'intermedio',
  },
  {
    id: 'v11',
    title: 'Profilo struttura: ottimizzare la presenza',
    description: 'Compila i dati della tua struttura per apparire al meglio nei risultati.',
    category: 'primi-passi',
    duration: '4:20',
    views: 980,
    daysAgo: 32,
    level: 'base',
  },
  {
    id: 'v12',
    title: 'Stampa, PDF ed email dei voucher',
    description: 'Esporta i tuoi voucher pronti alla consegna, in formato digitale o cartaceo.',
    category: 'pacchetti',
    duration: '3:48',
    views: 290,
    daysAgo: 35,
    level: 'base',
  },
];

function formatViews(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k.toFixed(k >= 10 ? 0 : 1).replace('.0', '')}k`;
  }
  return `${n}`;
}

function formatTimeAgo(daysAgo: number): string {
  if (daysAgo < 1) return 'oggi';
  if (daysAgo === 1) return '1 giorno fa';
  if (daysAgo < 7) return `${daysAgo} giorni fa`;
  if (daysAgo < 30) {
    const w = Math.floor(daysAgo / 7);
    return w === 1 ? '1 settimana fa' : `${w} settimane fa`;
  }
  const m = Math.floor(daysAgo / 30);
  return m === 1 ? '1 mese fa' : `${m} mesi fa`;
}

const LEVEL_LABEL: Record<VideoLevel, string> = {
  base: 'Base',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
};

export function ElearningPage() {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const featured = useMemo(
    () => (featuredId ? VIDEOS.find((v) => v.id === featuredId) ?? null : null),
    [featuredId],
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const videos = useMemo(() => {
    let base =
      activeFilter === 'all'
        ? VIDEOS
        : VIDEOS.filter((v) => v.category === activeFilter);
    if (trimmedQuery) {
      base = base.filter(
        (v) =>
          v.title.toLowerCase().includes(trimmedQuery) ||
          v.description.toLowerCase().includes(trimmedQuery),
      );
    }
    if (featured) return base.filter((v) => v.id !== featured.id);
    return base;
  }, [activeFilter, trimmedQuery, featured]);

  // Scroll the hero into view when a video is opened
  useEffect(() => {
    if (featured && heroRef.current) {
      heroRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [featured]);

  return (
    <Layout>
      <div className="el-page">
        <PageHeader
          title="E-learning"
          subtitle="Video tutorial per padroneggiare Agorà"
        />

        <div className="el-search">
          <Icon family="light" name="magnifying-glass" className="el-search__icon" />
          <input
            type="text"
            placeholder="Cerca tra i tutorial…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="el-search__input"
            aria-label="Cerca tra i tutorial"
          />
          {searchQuery && (
            <button
              type="button"
              className="el-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Cancella ricerca"
            >
              <Icon family="light" name="xmark" />
            </button>
          )}
        </div>

        {featured && (
          <section ref={heroRef} className="el-hero">
            <FeaturedVideo
              video={featured}
              onClose={() => setFeaturedId(null)}
            />
          </section>
        )}

        <section className="el-section">
          <div className="el-section__head">
            <H3>Esplora per argomento</H3>
          </div>
          <div className="el-filters">
            <FilterChip
              active={activeFilter === 'all'}
              icon="layer-group"
              onClick={() => setActiveFilter('all')}
            >
              Tutti
            </FilterChip>
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat.id}
                active={activeFilter === cat.id}
                icon={cat.icon}
                onClick={() => setActiveFilter(cat.id)}
              >
                {cat.label}
              </FilterChip>
            ))}
            <Link to="/academy" className="sib-btn sib-btn--primary el-cta">
              <i className="fa-duotone fa-graduation-cap text-[12px]" aria-hidden="true" />
              Nuove risorse
            </Link>
          </div>
        </section>

        <section className="el-section">
          <div className="el-section__head">
            <H3>
              {trimmedQuery
                ? `Risultati per "${searchQuery.trim()}"`
                : activeFilter === 'all'
                  ? 'Tutti i tutorial'
                  : CATEGORIES.find((c) => c.id === activeFilter)?.label}
            </H3>
            <span className="el-section__count">{videos.length} video</span>
          </div>

          {videos.length === 0 ? (
            <P3 className="el-empty">
              {trimmedQuery
                ? `Nessun tutorial trovato per "${searchQuery.trim()}".`
                : 'Nessun tutorial in questa categoria.'}
            </P3>
          ) : (
            <div className="el-grid">
              {videos.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onSelect={() => setFeaturedId(v.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

/* ============================================================
   Subcomponents
   ============================================================ */

interface FilterChipProps {
  active: boolean;
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
}

function FilterChip({ active, icon, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`el-chip${active ? ' el-chip--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <Icon family="light" name={icon} className="el-chip__icon" />
      <span>{children}</span>
    </button>
  );
}

function FeaturedVideo({
  video,
  onClose,
}: {
  video: Video;
  onClose: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === video.category);
  return (
    <article className="el-hero__card">
      <div
        className="el-hero__thumb"
        style={{ background: CATEGORY_GRADIENT[video.category] }}
      >
        <span className="el-hero__bg-icon" aria-hidden="true">
          <Icon family="light" name={cat?.icon ?? 'play'} />
        </span>
        <button
          type="button"
          className="el-hero__play"
          aria-label={`Riproduci: ${video.title}`}
        >
          <Icon family="solid" name="play" />
        </button>
        <span className="el-hero__duration">{video.duration}</span>
      </div>

      <div className="el-hero__body">
        <button
          type="button"
          className="el-hero__close"
          onClick={onClose}
          aria-label="Chiudi"
          title="Chiudi"
        >
          <Icon family="light" name="xmark" />
        </button>
        <span className="el-hero__tag">
          <Icon family="light" name={cat?.icon ?? 'play'} />
          {cat?.label}
        </span>
        <H2>{video.title}</H2>
        <P3>{video.description}</P3>
        <div className="el-hero__meta">
          <span>
            <Icon family="light" name="eye" /> {formatViews(video.views)} visualizzazioni
          </span>
          <span>
            <Icon family="light" name="clock" /> {formatTimeAgo(video.daysAgo)}
          </span>
          <span>
            <Icon family="light" name="signal-bars" /> Livello {LEVEL_LABEL[video.level]}
          </span>
        </div>
        <div className="el-hero__actions">
          <Button variant="primary" size="lg">
            <Icon family="solid" name="play" data-slot="icon" />
            Guarda ora
          </Button>
          <Button variant="tertiary" size="md">
            <Icon family="light" name="bookmark" data-slot="icon" />
            Salva
          </Button>
        </div>
      </div>
    </article>
  );
}

interface VideoCardProps {
  video: Video;
  onSelect: () => void;
}

function VideoCard({ video, onSelect }: VideoCardProps) {
  const cat = CATEGORIES.find((c) => c.id === video.category);
  return (
    <button type="button" className="el-card" onClick={onSelect}>
      <div
        className="el-card__thumb"
        style={{ background: CATEGORY_GRADIENT[video.category] }}
      >
        <span className="el-card__bg-icon" aria-hidden="true">
          <Icon family="light" name={cat?.icon ?? 'play'} />
        </span>
        <span className="el-card__play" aria-hidden="true">
          <Icon family="solid" name="play" />
        </span>
        <span className="el-card__duration">{video.duration}</span>
      </div>
      <div className="el-card__body">
        <p className="el-card__title">{video.title}</p>
        <div className="el-card__meta">
          <span className="el-card__meta-cat">{cat?.label}</span>
          <span className="el-card__meta-sep">•</span>
          <span>{formatViews(video.views)} visualizzazioni</span>
          <span className="el-card__meta-sep">•</span>
          <span>{formatTimeAgo(video.daysAgo)}</span>
        </div>
      </div>
    </button>
  );
}
