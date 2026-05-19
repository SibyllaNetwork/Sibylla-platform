import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
import { H3, P3 } from '../ds/typography';
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

type AccentKey =
  | 'tradezone'
  | 'pacchetti'
  | 'match'
  | 'preventivi'
  | 'acquisti'
  | 'elearning';

const ACCENT_COLOR: Record<AccentKey, string> = {
  tradezone: '#2e5f8f',
  pacchetti: '#c87f00',
  match: '#1d8eb8',
  preventivi: '#8a52b0',
  acquisti: '#c95e0b',
  elearning: '#4f63a4',
};

interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: number;
  spark: SparkPoint[];
  accent: AccentKey;
  href?: string;
}
const KPI_LIST: Kpi[] = [
  { id: 'revenue', label: 'Fatturato voucher',         value: '€ 1.840', delta: 24,  spark: makeSpark(1, 14, 40, 28), accent: 'pacchetti', href: '/dynamic-packages' },
  { id: 'views',   label: 'Visualizzazioni annunci',   value: '487',     delta: 52,  spark: makeSpark(2, 14, 50, 30), accent: 'tradezone', href: '/announcements' },
  { id: 'match',   label: 'Connessioni Match Zone',    value: '6',       delta: 33,  spark: makeSpark(3, 14, 30, 18), accent: 'match',     href: '/match-zone' },
  { id: 'conv',    label: 'Tasso conversione voucher', value: '28%',     delta: -3,  spark: makeSpark(4, 14, 45, 20), accent: 'preventivi' },
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

interface CatFilter {
  id: string;
  label: string;
  scale: number; // mock scaling factor
}
const CATEGORY_FILTERS: CatFilter[] = [
  { id: 'all',        label: 'Tutte',      scale: 1.0 },
  { id: 'soggiorno',  label: 'Soggiorno',  scale: 0.55 },
  { id: 'pacchetti',  label: 'Pacchetti',  scale: 0.3 },
  { id: 'sapori',     label: 'Sapori',     scale: 0.18 },
  { id: 'esperienze', label: 'Esperienze', scale: 0.12 },
];

const CATEGORY_DIST = [
  { name: 'Soggiorno',  value: 12, color: '#204769' },
  { name: 'Pacchetti',  value: 8,  color: '#c87f00' },
  { name: 'Sapori',     value: 5,  color: '#1d8eb8' },
  { name: 'Esperienze', value: 3,  color: '#8a52b0' },
];

const REVENUE_BY_CAT = [
  { name: 'Soggiorno',          value: 1240, color: '#204769' },
  { name: 'Sapori',             value: 380,  color: '#1d8eb8' },
  { name: 'Esperienze',         value: 220,  color: '#8a52b0' },
  { name: 'Prodotti & Servizi', value: 95,   color: '#c95e0b' },
];

interface Region {
  name: string;
  count: number;
  color: string;
}
const REGIONS: Region[] = [
  { name: 'Roma',    count: 12, color: '#204769' },
  { name: 'Milano',  count: 9,  color: '#5c9cd4' },
  { name: 'Firenze', count: 6,  color: '#1d8eb8' },
  { name: 'Napoli',  count: 5,  color: '#8a52b0' },
  { name: 'Venezia', count: 4,  color: '#c87f00' },
  { name: 'Torino',  count: 3,  color: '#c95e0b' },
  { name: 'Bologna', count: 2,  color: '#4f63a4' },
];

interface VoucherRow {
  code: string;
  title: string;
  category: string;
  date: string;
  price: number;
  status: 'purchased' | 'saved';
}
const TOP_VOUCHERS: VoucherRow[] = [
  { code: 'PKD-K7X3A-01', title: 'Pacchetto Romantico',     category: 'Soggiorno',  date: '18 mag', price: 240, status: 'purchased' },
  { code: 'PKD-K7X3A-03', title: 'Pacchetto Famiglia',      category: 'Soggiorno',  date: '17 mag', price: 360, status: 'purchased' },
  { code: 'PKD-J2K9P-02', title: 'Pacchetto Gourmet',       category: 'Sapori',     date: '14 mag', price: 320, status: 'purchased' },
  { code: 'PKD-M4F7E-01', title: 'Avventura Adrenalina',    category: 'Esperienze', date: '11 mag', price: 280, status: 'saved' },
  { code: 'PKD-N8H2Q-04', title: 'Tour & musei urbano',     category: 'Esperienze', date: '09 mag', price: 180, status: 'purchased' },
];

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
  const [activeCat, setActiveCat] = useState<string>('all');

  const catScale =
    CATEGORY_FILTERS.find((c) => c.id === activeCat)?.scale ?? 1;
  const perfData = useMemo(
    () => makePerfData(range, catScale, compare),
    [range, catScale, compare],
  );

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
                <button
                  type="button"
                  className="dash-export__btn"
                  onClick={handleExportCsv}
                  title="Esporta CSV"
                >
                  <Icon family="light" name="file-csv" />
                  CSV
                </button>
                <button
                  type="button"
                  className="dash-export__btn"
                  onClick={handleExportPdf}
                  title="Esporta PDF"
                >
                  <Icon family="light" name="file-pdf" />
                  PDF
                </button>
              </div>
              <RangeFilter value={range} onChange={setRange} />
            </div>
          }
        />

        <section className="dash-kpis">
          {KPI_LIST.map((k) => (
            <KpiTile
              key={k.id}
              kpi={k}
              onClick={k.href ? () => navigate(k.href!) : undefined}
            />
          ))}
        </section>

        <section className="dash-goals">
          {GOALS.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </section>

        <div className="dash-grid">
          {/* Performance area chart — wide */}
          <section className="dash-card dash-card--wide">
            <div className="dash-card__head">
              <H3>Andamento</H3>
              <div className="dash-card__head-actions">
                <div className="dash-chips" role="tablist" aria-label="Filtra per categoria">
                  {CATEGORY_FILTERS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="tab"
                      aria-selected={activeCat === c.id}
                      className={`dash-chip${activeCat === c.id ? ' dash-chip--active' : ''}`}
                      onClick={() => setActiveCat(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <label className="dash-toggle">
                  <input
                    type="checkbox"
                    checked={compare}
                    onChange={(e) => setCompare(e.target.checked)}
                  />
                  Confronta periodo
                </label>
              </div>
            </div>
            <div className="dash-legend">
              <span className="dash-legend__item">
                <span className="dash-legend__dot" style={{ background: '#5c9cd4' }} />
                Visualizzazioni
              </span>
              <span className="dash-legend__item">
                <span className="dash-legend__dot" style={{ background: '#c87f00' }} />
                Acquisti
              </span>
              {compare && (
                <span className="dash-legend__item dash-legend__item--dashed">
                  Periodo precedente
                </span>
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

          {/* Category donut */}
          <section className="dash-card">
            <div className="dash-card__head">
              <H3>Voucher per categoria</H3>
            </div>
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={CATEGORY_DIST} dataKey="value" innerRadius={56} outerRadius={86} paddingAngle={3} stroke="none">
                    {CATEGORY_DIST.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dbdbdb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut__center">
                <span className="dash-donut__value">
                  {CATEGORY_DIST.reduce((a, b) => a + b.value, 0)}
                </span>
                <span className="dash-donut__label">voucher</span>
              </div>
            </div>
            <ul className="dash-pie-legend">
              {CATEGORY_DIST.map((c) => (
                <li key={c.name}>
                  <span className="dash-pie-legend__dot" style={{ background: c.color }} />
                  <span>{c.name}</span>
                  <span className="dash-pie-legend__val">{c.value}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Bar chart — fatturato per categoria */}
          <section className="dash-card">
            <div className="dash-card__head">
              <H3>Fatturato per categoria</H3>
              <span className="dash-card__hint">€</span>
            </div>
            <div className="dash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_BY_CAT} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#ececf0" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6e7175' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#4a4d53' }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip
                    cursor={{ fill: 'rgba(92, 156, 212, 0.08)' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #dbdbdb', fontSize: 12 }}
                    formatter={(value) => [`€ ${value}`, 'Fatturato'] as [string, string]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {REVENUE_BY_CAT.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Regions widget — wide */}
          <section className="dash-card dash-card--wide">
            <div className="dash-card__head">
              <H3>Connessioni per città</H3>
              <span className="dash-card__hint">
                {REGIONS.reduce((a, b) => a + b.count, 0)} totali
              </span>
            </div>
            <ul className="dash-regions">
              {(() => {
                const max = Math.max(...REGIONS.map((r) => r.count));
                return REGIONS.map((r) => (
                  <li key={r.name} className="dash-region">
                    <span className="dash-region__name">{r.name}</span>
                    <span className="dash-region__bar">
                      <span
                        className="dash-region__fill"
                        style={{
                          width: `${(r.count / max) * 100}%`,
                          background: `linear-gradient(90deg, ${r.color}, ${r.color}dd)`,
                        }}
                      />
                    </span>
                    <span className="dash-region__count">{r.count}</span>
                  </li>
                ));
              })()}
            </ul>
          </section>

          {/* Top voucher table — full row */}
          <section className="dash-card dash-card--full">
            <div className="dash-card__head">
              <H3>Voucher recenti</H3>
              <button
                type="button"
                className="dash-link"
                onClick={() => navigate('/dynamic-packages')}
              >
                Vedi tutti <Icon family="light" name="arrow-right" />
              </button>
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Pacchetto</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th className="dash-table__num">Prezzo</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {TOP_VOUCHERS.map((v) => (
                  <tr key={v.code}>
                    <td><code className="dash-code">{v.code}</code></td>
                    <td className="dash-table__title">{v.title}</td>
                    <td>{v.category}</td>
                    <td>{v.date}</td>
                    <td className="dash-table__num">€ {v.price}</td>
                    <td>
                      <span className={`dash-pill dash-pill--${v.status}`}>
                        {v.status === 'purchased' ? 'Acquistato' : 'Salvato'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
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

function KpiTile({ kpi, onClick }: { kpi: Kpi; onClick?: () => void }) {
  const isInteractive = !!onClick;
  const cls = `dash-kpi${isInteractive ? ' dash-kpi--clickable' : ''}`;
  const positive = kpi.delta >= 0;
  const inner = (
    <>
      <div className="dash-kpi__top">
        <span className="dash-kpi__label">{kpi.label}</span>
        <span className="dash-kpi__dot" style={{ background: ACCENT_COLOR[kpi.accent] }} />
      </div>
      <span className="dash-kpi__value">{kpi.value}</span>
      <div className="dash-kpi__bottom">
        <span className={`dash-kpi__delta dash-kpi__delta--${positive ? 'pos' : 'neg'}`}>
          <Icon family="solid" name={positive ? 'arrow-trend-up' : 'arrow-trend-down'} />
          {positive ? '+' : ''}
          {kpi.delta}%
        </span>
        <span className="dash-kpi__spark">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpi.spark}>
              <Line type="monotone" dataKey="y" stroke={ACCENT_COLOR[kpi.accent]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </span>
      </div>
    </>
  );
  if (isInteractive) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
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
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
