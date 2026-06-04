import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { H3 } from '../ds/typography';
import { ITALY_VIEWBOX, REGIONS as ITALY_REGIONS } from '../data/italyMap';
import './DashboardPage.css';

type Range = '7g' | '30g' | '90g' | 'anno';
const RANGE_LENGTH: Record<Range, number> = {
  '7g': 7,
  '30g': 30,
  '90g': 90,
  anno: 12,
};

function seed(n: number): number {
  return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
}

function monthLabel(i: number): string {
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return months[i % 12];
}

interface PerfPoint {
  label: string;
  views: number;
  purchases: number;
  revenue: number;
  prevViews?: number;
  prevPurchases?: number;
}

function makePerfData(
  range: Range,
  catScale: number,
  withPrev: boolean,
): PerfPoint[] {
  const len = RANGE_LENGTH[range];
  const arr: PerfPoint[] = [];
  for (let i = 0; i < len; i++) {
    const baseViews = Math.round(30 + seed(i + 1) * 40 + Math.sin(i / 4) * 10);
    const basePurchases = Math.round(seed(i + 100) * 5 + Math.sin(i / 6) * 1.5 + 1);
    const views = Math.max(0, Math.round(baseViews * catScale));
    const purchases = Math.max(0, Math.round(basePurchases * catScale));
    const point: PerfPoint = {
      label: range === 'anno' ? monthLabel(i) : `${i + 1}`,
      views,
      purchases,
      revenue: purchases * (180 + Math.round(seed(i + 50) * 90)),
    };
    if (withPrev) {
      point.prevViews = Math.max(
        0,
        Math.round((20 + seed(i + 200) * 35 + Math.sin(i / 5) * 8) * catScale),
      );
      point.prevPurchases = Math.max(
        0,
        Math.round((seed(i + 300) * 4 + Math.sin(i / 7) * 1 + 0.5) * catScale),
      );
    }
    arr.push(point);
  }
  return arr;
}

interface SparkPoint {
  x: number;
  y: number;
}
function makeSpark(s: number, len = 14, base = 50, amp = 30): SparkPoint[] {
  return Array.from({ length: len }, (_, i) => ({
    x: i,
    y: Math.max(4, Math.round(base + Math.sin(i * 0.5 + s) * amp + seed(i + s * 10) * 12)),
  }));
}

/* ---------- Data ---------- */

type AccentKey = 'tradezone' | 'pacchetti' | 'elearning';

const ACCENT_COLOR: Record<AccentKey, string> = {
  tradezone: '#2e5f8f',
  pacchetti: '#c87f00',
  elearning: '#4f63a4',
};

/* Le tre macro-aree della home Agorà, richiamate in dashboard. */
interface AreaStat {
  label: string;
  value: string;
  hot?: boolean;
}
interface MacroArea {
  id: AccentKey;
  title: string;
  icon: string;
  href: string;
  delta: number;
  stats: AreaStat[];
  spark: SparkPoint[];
}
const MACRO_AREAS: MacroArea[] = [
  {
    id: 'tradezone',
    title: 'Trade Zone',
    icon: 'display-chart-up',
    href: '/announcements',
    delta: 18,
    stats: [
      { label: 'Annunci pubblicati', value: '12' },
      { label: 'Interazioni ricevute', value: '487' },
      { label: 'Acquisti di rete', value: '5' },
      { label: 'Opportunità Match Zone', value: '6', hot: true },
    ],
    spark: makeSpark(2, 14, 50, 30),
  },
  {
    id: 'pacchetti',
    title: 'Pacchetti dinamici',
    icon: 'boxes-packing',
    href: '/dynamic-packages',
    delta: 24,
    stats: [
      { label: 'Fatturato voucher', value: '€ 1.840' },
      { label: 'Voucher generati', value: '28' },
      { label: 'Tasso conversione', value: '28%' },
    ],
    spark: makeSpark(1, 14, 40, 28),
  },
  {
    id: 'elearning',
    title: 'E-learning',
    icon: 'head-side-gear',
    href: '/elearning',
    delta: 9,
    stats: [
      { label: 'Corsi completati', value: '9' },
      { label: 'Corsi in corso', value: '3' },
      { label: 'Ore di formazione', value: '24h' },
    ],
    spark: makeSpark(5, 14, 35, 16),
  },
];

interface Goal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  icon: string;
}
const GOALS: Goal[] = [
  { id: 'g1', label: 'Fatturato voucher',     current: 1840, target: 2000, unit: '€', icon: 'wallet' },
  { id: 'g2', label: 'Match Zone',            current: 6,    target: 10,   unit: '',  icon: 'circle-nodes' },
  { id: 'g3', label: 'Annunci pubblicati',    current: 12,   target: 15,   unit: '',  icon: 'bullhorn' },
  { id: 'g4', label: 'Corsi e-learning',      current: 9,    target: 12,   unit: '',  icon: 'graduation-cap' },
];

/* Filtri del trend: le sezioni di Agorà (non più le categorie voucher). */
interface AreaFilter {
  id: string;
  label: string;
  scale: number;
}
const AREA_FILTERS: AreaFilter[] = [
  { id: 'all',        label: 'Tutte',              scale: 1.0 },
  { id: 'tradezone',  label: 'Trade Zone',         scale: 0.55 },
  { id: 'pacchetti',  label: 'Pacchetti dinamici', scale: 0.32 },
  { id: 'elearning',  label: 'E-learning',         scale: 0.18 },
];

/* Distribuzione per categoria — sintetizza i due grafici (voucher + fatturato)
   in un'unica torta filtrabile. */
interface CatSlice {
  name: string;
  voucher: number;
  fatturato: number;
  color: string;
}
const CATEGORY_DATA: CatSlice[] = [
  { name: 'Soggiorno',          voucher: 12, fatturato: 1240, color: '#204769' },
  { name: 'Pacchetti',          voucher: 8,  fatturato: 760,  color: '#c87f00' },
  { name: 'Sapori',             voucher: 5,  fatturato: 380,  color: '#1d8eb8' },
  { name: 'Esperienze',         voucher: 3,  fatturato: 220,  color: '#8a52b0' },
  { name: 'Prodotti & Servizi', voucher: 2,  fatturato: 95,   color: '#c95e0b' },
];

/* Connessioni territoriali per regione (choropleth sulla mappa d'Italia). */
const CONNECTIONS: Record<string, number> = {
  Lazio: 12,
  Lombardia: 9,
  Toscana: 6,
  Campania: 5,
  Veneto: 4,
  'Emilia-Romagna': 3,
  Sicilia: 3,
  Piemonte: 2,
  Puglia: 2,
};

/* ---------- Export helpers ---------- */

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- Component ---------- */

export function DashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('30g');
  const [compare, setCompare] = useState(false);
  const [activeArea, setActiveArea] = useState<string>('all');
  const [catMetric, setCatMetric] = useState<'voucher' | 'fatturato'>('voucher');

  const areaScale = AREA_FILTERS.find((a) => a.id === activeArea)?.scale ?? 1;
  const perfData = useMemo(
    () => makePerfData(range, areaScale, compare),
    [range, areaScale, compare],
  );

  const catTotal = useMemo(
    () => CATEGORY_DATA.reduce((acc, c) => acc + c[catMetric], 0),
    [catMetric],
  );
  const fmtCat = (v: number) =>
    catMetric === 'fatturato' ? `€ ${v.toLocaleString('it-IT')}` : `${v}`;

  const handleExportCsv = () => {
    const head = compare
      ? ['Periodo', 'Visualizzazioni', 'Acquisti', 'Fatturato', 'Visualizz. precedenti', 'Acquisti precedenti']
      : ['Periodo', 'Visualizzazioni', 'Acquisti', 'Fatturato'];
    const rows: (string | number)[][] = [head];
    for (const p of perfData) {
      rows.push(
        compare
          ? [p.label, p.views, p.purchases, p.revenue, p.prevViews ?? 0, p.prevPurchases ?? 0]
          : [p.label, p.views, p.purchases, p.revenue],
      );
    }
    downloadCsv(`dashboard-${range}.csv`, rows);
  };

  const handleExportPdf = () => {
    document.body.classList.add('is-printing-dashboard');
    window.print();
    setTimeout(() => document.body.classList.remove('is-printing-dashboard'), 200);
  };

  return (
    <Layout>
      <div className="dash-page">
        <PageHeader
          title="Dashboard"
          subtitle="Performance e metriche della piattaforma"
          hideBack
          actions={
            <div className="dash-header-actions">
              <div className="dash-export">
                <button type="button" className="dash-export__btn" onClick={handleExportCsv} title="Esporta CSV">
                  <Icon family="light" name="file-csv" />
                  CSV
                </button>
                <button type="button" className="dash-export__btn" onClick={handleExportPdf} title="Esporta PDF">
                  <Icon family="light" name="file-pdf" />
                  PDF
                </button>
              </div>
              <RangeFilter value={range} onChange={setRange} />
            </div>
          }
        />

        {/* Le tre macro-aree della home Agorà */}
        <section className="dash-areas">
          {MACRO_AREAS.map((a) => (
            <AreaCard key={a.id} area={a} onClick={() => navigate(a.href)} />
          ))}
        </section>

        {/* Trend in alto, filtrato per sezione di Agorà */}
        <section className="dash-card dash-card--full">
          <div className="dash-card__head">
            <H3>Andamento per area</H3>
            <div className="dash-card__head-actions">
              <div className="dash-chips" role="tablist" aria-label="Filtra per area Agorà">
                {AREA_FILTERS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    aria-selected={activeArea === a.id}
                    className={`dash-chip${activeArea === a.id ? ' dash-chip--active' : ''}`}
                    onClick={() => setActiveArea(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <label className="dash-toggle">
                <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                Confronta periodo
              </label>
            </div>
          </div>
          <div className="dash-legend">
            <span className="dash-legend__item">
              <span className="dash-legend__dot dash-legend__dot--views" />
              Visualizzazioni
            </span>
            <span className="dash-legend__item">
              <span className="dash-legend__dot dash-legend__dot--purchases" />
              Acquisti
            </span>
            {compare && (
              <span className="dash-legend__item dash-legend__item--dashed">Periodo precedente</span>
            )}
          </div>
          <div className="dash-chart dash-chart--lg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perfData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5c9cd4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#5c9cd4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-purchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c87f00" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#c87f00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ececf0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6e7175' }} axisLine={{ stroke: '#cfcfcf' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6e7175' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #dbdbdb', fontSize: 12 }}
                  labelStyle={{ color: '#204769', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="views" name="Visualizzazioni" stroke="#5c9cd4" strokeWidth={2} fill="url(#grad-views)" />
                <Area type="monotone" dataKey="purchases" name="Acquisti" stroke="#c87f00" strokeWidth={2} fill="url(#grad-purchases)" />
                {compare && (
                  <Line type="monotone" dataKey="prevViews" name="Visualizz. precedenti" stroke="#5c9cd4" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                )}
                {compare && (
                  <Line type="monotone" dataKey="prevPurchases" name="Acquisti precedenti" stroke="#c87f00" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="dash-grid">
          {/* Torta categorie unificata (voucher + fatturato) — in alto a sinistra */}
          <section className="dash-card">
            <div className="dash-card__head">
              <H3>Per categoria</H3>
              <div className="dash-chips" role="tablist" aria-label="Metrica per categoria">
                <button
                  type="button"
                  role="tab"
                  aria-selected={catMetric === 'voucher'}
                  className={`dash-chip${catMetric === 'voucher' ? ' dash-chip--active' : ''}`}
                  onClick={() => setCatMetric('voucher')}
                >
                  Voucher
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={catMetric === 'fatturato'}
                  className={`dash-chip${catMetric === 'fatturato' ? ' dash-chip--active' : ''}`}
                  onClick={() => setCatMetric('fatturato')}
                >
                  Fatturato
                </button>
              </div>
            </div>
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={CATEGORY_DATA} dataKey={catMetric} nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={3} stroke="none">
                    {CATEGORY_DATA.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #dbdbdb', fontSize: 12 }}
                    formatter={(value) => [fmtCat(Number(value)), catMetric === 'fatturato' ? 'Fatturato' : 'Voucher'] as [string, string]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut__center">
                <span className="dash-donut__value">{fmtCat(catTotal)}</span>
                <span className="dash-donut__label">{catMetric === 'fatturato' ? 'fatturato' : 'voucher'}</span>
              </div>
            </div>
            <ul className="dash-pie-legend">
              {CATEGORY_DATA.map((c) => (
                <li key={c.name}>
                  <span className="dash-pie-legend__dot" style={{ '--dot-bg': c.color } as React.CSSProperties} />
                  <span>{c.name}</span>
                  <span className="dash-pie-legend__val">{fmtCat(c[catMetric])}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Connessioni territoriali — mappa choropleth */}
          <section className="dash-card dash-card--wide">
            <div className="dash-card__head">
              <H3>Connessioni territoriali</H3>
              <span className="dash-card__hint">
                {Object.values(CONNECTIONS).reduce((a, b) => a + b, 0)} connessioni · {Object.keys(CONNECTIONS).length} regioni
              </span>
            </div>
            <ConnectionsMap />
          </section>
        </div>

        {/* Obiettivi */}
        <section className="dash-goals">
          {GOALS.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </section>
      </div>
    </Layout>
  );
}

/* ============================================================
   Subcomponents
   ============================================================ */

function RangeFilter({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const items: Range[] = ['7g', '30g', '90g', 'anno'];
  return (
    <div className="dash-range" role="tablist" aria-label="Intervallo">
      {items.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={value === r}
          className={`dash-range__btn${value === r ? ' dash-range__btn--active' : ''}`}
          onClick={() => onChange(r)}
        >
          {r === 'anno' ? '12m' : r}
        </button>
      ))}
    </div>
  );
}

function AreaCard({ area, onClick }: { area: MacroArea; onClick: () => void }) {
  const positive = area.delta >= 0;
  return (
    <button type="button" className="dash-area" onClick={onClick}>
      <div className="dash-area__head">
        <span className="dash-area__icon" style={{ '--accent': ACCENT_COLOR[area.id] } as React.CSSProperties}>
          <Icon family="light" name={area.icon} />
        </span>
        <span className="dash-area__title">{area.title}</span>
        <span className={`dash-area__delta dash-area__delta--${positive ? 'pos' : 'neg'}`}>
          <Icon family="solid" name={positive ? 'arrow-trend-up' : 'arrow-trend-down'} />
          {positive ? '+' : ''}{area.delta}%
        </span>
      </div>
      <ul className="dash-area__stats">
        {area.stats.map((s) => (
          <li key={s.label} className={`dash-area__stat${s.hot ? ' dash-area__stat--hot' : ''}`}>
            <span className="dash-area__stat-label">{s.label}</span>
            <span className="dash-area__stat-value">
              {s.hot && <Icon family="solid" name="bolt" />}
              {s.value}
            </span>
          </li>
        ))}
      </ul>
      <span className="dash-area__spark">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={area.spark}>
            <Line type="monotone" dataKey="y" stroke={ACCENT_COLOR[area.id]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </span>
      <span className="dash-area__cta">
        Apri sezione <Icon family="light" name="arrow-right" />
      </span>
    </button>
  );
}

function ConnectionsMap() {
  const [tip, setTip] = useState<{ name: string; count: number; x: number; y: number } | null>(null);
  const max = Math.max(...Object.values(CONNECTIONS));
  const ranked = useMemo(
    () =>
      Object.entries(CONNECTIONS)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    [],
  );

  const fillFor = (name: string): string => {
    const c = CONNECTIONS[name] ?? 0;
    if (!c) return 'var(--color-surface-subtle)';
    const pct = Math.round((0.28 + 0.72 * (c / max)) * 100);
    return `color-mix(in srgb, var(--color-primary) ${pct}%, var(--color-surface))`;
  };

  return (
    <div className="dash-conn">
      <div className="dash-conn__map">
        <svg
          className="dash-conn__svg"
          viewBox={`0 0 ${ITALY_VIEWBOX.w} ${ITALY_VIEWBOX.h}`}
          role="img"
          aria-label="Mappa connessioni territoriali per regione"
          onMouseLeave={() => setTip(null)}
        >
          {ITALY_REGIONS.map((r) => (
            <path
              key={r.c}
              d={r.d}
              className={`dash-conn__region${CONNECTIONS[r.n] ? ' is-active' : ''}`}
              style={{ '--fill': fillFor(r.n) } as React.CSSProperties}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement)?.getBoundingClientRect();
                if (!rect) return;
                setTip({ name: r.n, count: CONNECTIONS[r.n] ?? 0, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => setTip(null)}
            />
          ))}
        </svg>
        {tip && (
          <span className="dash-conn__tip" style={{ left: tip.x, top: tip.y } as React.CSSProperties}>
            <strong>{tip.name}</strong>
            {tip.count > 0 ? ` · ${tip.count} connessioni` : ' · nessuna'}
          </span>
        )}
      </div>
      <ul className="dash-regions dash-conn__rank">
        {ranked.map((r) => (
          <li key={r.name} className="dash-region">
            <span className="dash-region__name">{r.name}</span>
            <span className="dash-region__bar">
              <span
                className="dash-region__fill"
                style={{ '--bar-w': `${(r.count / max) * 100}%`, '--bar-color': 'var(--color-primary)' } as React.CSSProperties}
              />
            </span>
            <span className="dash-region__count">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const tier = pct >= 90 ? 'high' : pct >= 60 ? 'mid' : 'low';
  const fmt = (n: number) =>
    goal.unit === '€'
      ? `€ ${n.toLocaleString('it-IT')}`
      : `${n}`;
  return (
    <div className="dash-goal">
      <div className="dash-goal__head">
        <span className="dash-goal__icon">
          <Icon family="light" name={goal.icon} />
        </span>
        <span className="dash-goal__label">{goal.label}</span>
      </div>
      <div className="dash-goal__values">
        <span className="dash-goal__current">{fmt(goal.current)}</span>
        <span className="dash-goal__target">/ {fmt(goal.target)}</span>
        <span className={`dash-goal__pct dash-goal__pct--${tier}`}>{pct}%</span>
      </div>
      <span className="dash-goal__bar">
        <span
          className={`dash-goal__fill dash-goal__fill--${tier}`}
          style={{ '--bar-w': `${pct}%` } as React.CSSProperties}
        />
      </span>
    </div>
  );
}
