import React, { useState } from 'react';
import Ico from '../../../core/icons/Ico';
import BtnBack from '../../../core/components/BtnBack';
import GaugeArc from '../../../core/components/GaugeArc';
import PageHeader from '../../../core/components/PageHeader';
import { SelectField, DateRangeField } from '../../../core/components/form'
import './AnalisiDistribuzione.sass'

type AnalisiTipo = 'aumento' | 'valutazione' | 'verifica';

const ANALISI: Record<AnalisiTipo, { icon: string; text: string; tip: string }> = {
  aumento:     { icon: 'fa-thumbs-up',           text: 'Aumento consigliato',    tip: 'Domanda rigida (ε < 1): aumento dei prezzi consigliato' },
  valutazione: { icon: 'fa-file-pen',            text: 'Valutazione su quantità', tip: 'Elasticità incerta: valutare la leva sulla quantità' },
  verifica:    { icon: 'fa-triangle-exclamation', text: 'Verificare fattori esterni', tip: 'Domanda elastica (ε ≥ 1): verificare i fattori esterni' },
};

type Row = {
  date: string;
  market: string;
  occ: string;
  meteo: 'gear' | 'nd';
  stag: string;
  pct: string;
  rev: string;
  adr: string;
  pickup: number[];
  analisi: AnalisiTipo;
  camera: string;
  disp: number;
  sugg: number;
  compset: string;
};

const ROWS: Row[] = [
  { date: '09/06/2026', market: 'very-low', occ: 'very-low', meteo: 'gear', stag: 'Alta Stagione', pct: '17,61 %', rev: '13.565,89', adr: '114,97', pickup: [5, 7, 30, 63, 13], analisi: 'valutazione', camera: '152,97', disp: 37, sugg: 95, compset: '—' },
  { date: '10/06/2026', market: 'very-low', occ: 'very-low', meteo: 'gear', stag: 'Alta Stagione', pct: '16,42 %', rev: '13.290,93', adr: '120,83', pickup: [5, 10, 33, 46, 16], analisi: 'aumento', camera: '145,56', disp: 45, sugg: 0, compset: '—' },
  { date: '11/06/2026', market: 'very-low', occ: 'very-low', meteo: 'gear', stag: 'Alta Stagione', pct: '18,51 %', rev: '15.081,76', adr: '121,63', pickup: [3, 2, 31, 49, 39], analisi: 'aumento', camera: '163,85', disp: 31, sugg: 0, compset: '—' },
  { date: '12/06/2026', market: 'very-low', occ: 'very-low', meteo: 'nd', stag: 'Alta Stagione', pct: '16,12 %', rev: '12.948,17', adr: '119,89', pickup: [3, 9, 26, 36, 34], analisi: 'aumento', camera: '145,56', disp: 47, sugg: 0, compset: '—' },
  { date: '13/06/2026', market: 'very-low', occ: 'very-low', meteo: 'nd', stag: 'Alta Stagione', pct: '14,63 %', rev: '11.537,33', adr: '117,73', pickup: [3, 6, 25, 36, 28], analisi: 'aumento', camera: '143,76', disp: 57, sugg: 0, compset: '—' },
  { date: '14/06/2026', market: 'very-low', occ: 'very-low', meteo: 'nd', stag: 'Alta Stagione', pct: '12,13 %', rev: '7.574,66', adr: '116,53', pickup: [3, 3, 19, 34, 6], analisi: 'valutazione', camera: '135,10', disp: 91, sugg: 0, compset: '—' },
  { date: '15/06/2026', market: 'very-low', occ: 'very-low', meteo: 'nd', stag: 'Alta Stagione', pct: '13,81 %', rev: '8.510,18', adr: '115,00', pickup: [1, 6, 19, 40, 8], analisi: 'aumento', camera: '135,10', disp: 82, sugg: 0, compset: '—' },
  { date: '16/06/2026', market: 'very-low', occ: 'very-low', meteo: 'nd', stag: 'Alta Stagione', pct: '12,09 %', rev: '9.042,94', adr: '111,64', pickup: [1, 4, 20, 39, 17], analisi: 'valutazione', camera: '138,50', disp: 75, sugg: 0, compset: '—' },
];

const PKL = [1, 7, 30, 60, 90];
const NCOLS = 17;

export default function AnalisiDistribuzione({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura]       = useState('Hotel Archimede');
  const [dateFrom, setDateFrom]         = useState('2026-06-09');
  const [dateTo, setDateTo]             = useState('2026-07-09');
  const [tipologia, setTipologia]       = useState<'individuale' | 'gruppo'>('individuale');
  const [expanded, setExpanded]         = useState<Set<number>>(new Set());
  const toggle = (i: number) => setExpanded(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  // ── Pie hover (Revenue / ADR / Occupancy) ────────────────────────────────────
  type Seg = { label: string; val: number; color: string };
  const conic = (segs: Seg[]) => {
    const total = segs.reduce((s, x) => s + x.val, 0) || 1;
    let acc = 0;
    const parts = segs.map(s => { const start = (acc / total) * 100; acc += s.val; return `${s.color} ${start}% ${(acc / total) * 100}%`; });
    return `conic-gradient(${parts.join(', ')})`;
  };
  const PieHover = ({ value, segs, title }: { value: React.ReactNode; segs: Seg[]; title: string }) => {
    const total = segs.reduce((s, x) => s + x.val, 0) || 1;
    return (
      <span className="analisi__pie-cell">
        {value}
        <span className="analisi__pie-pop" role="tooltip">
          <span className="analisi__pie-pop-title">{title}</span>
          <span className="analisi__pie-pop-body">
            <span className="analisi__pie-chart" style={{ ['--pie' as any]: conic(segs) }} aria-hidden="true" />
            <span className="analisi__pie-legend">
              {segs.map(s => (
                <span key={s.label} className="analisi__pie-leg">
                  <span className="analisi__pie-dot" style={{ ['--dot' as any]: s.color }} />
                  <span className="analisi__pie-leg-lbl">{s.label}</span>
                  <span className="analisi__pie-leg-val">{Math.round((s.val / total) * 100)}%</span>
                </span>
              ))}
            </span>
          </span>
        </span>
      </span>
    );
  };
  const REV_SEGS: Seg[] = [
    { label: 'Diretto', val: 42, color: 'var(--color-primary)' },
    { label: 'OTA', val: 33, color: '#E07B39' },
    { label: 'Tour Operator', val: 15, color: '#9B59B6' },
    { label: 'Corporate', val: 10, color: 'var(--color-link)' },
  ];
  const ADR_SEGS: Seg[] = [
    { label: 'Standard', val: 38, color: 'var(--color-primary)' },
    { label: 'Superior', val: 30, color: 'var(--color-link)' },
    { label: 'Suite', val: 20, color: '#E07B39' },
    { label: 'Altro', val: 12, color: '#9B59B6' },
  ];
  const occSegs = (pct: string): Seg[] => {
    const n = Math.max(0, Math.min(100, parseFloat(pct.replace('%', '').replace(',', '.')) || 0));
    return [
      { label: 'Occupato', val: n, color: 'var(--color-success)' },
      { label: 'Libero', val: 100 - n, color: 'var(--color-border)' },
    ];
  };

  // ── TH / TD (allineati a sinistra) ───────────────────────────────────────────
  const TH = ({ ch, colSpan = 1, last = false }: { ch?: React.ReactNode; colSpan?: number; last?: boolean }) => (
    <th colSpan={colSpan} className={`analisi__th ${last ? 'analisi__th--last' : ''}`}>{ch}</th>
  );
  const TD = ({ ch, last = false, className = '' }: { ch?: React.ReactNode; last?: boolean; className?: string }) => (
    <td className={`analisi__td ${last ? 'analisi__td--last' : ''} ${className}`}>{ch}</td>
  );

  return (
    <div className="analisi">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Analisi della distribuzione" subtitle="Esplorazione analitica della distribuzione basata su dati granulari e KPI strategici per guidare decisioni mirate" className="analisi__page-title" />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="analisi__filter-bar">
        <div className="analisi__filter-group">
          <SelectField
            name="struttura"
            label="Struttura"
            value={struttura}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
            options={['Hotel Archimede', 'Hotel Noto', 'Grand Hotel Roma'].map(s => ({ value: s, label: s }))}
            className="w-44"
          />
        </div>
        <div className="analisi__filter-group">
          <DateRangeField
            nameFrom="dateFrom"
            nameTo="dateTo"
            label="Date"
            valueFrom={dateFrom}
            valueTo={dateTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
          />
        </div>
        <div className="analisi__filter-group--col">
          <span className="analisi__filter-label">Tipologia</span>
          <div className="analisi__radio-row">
            {(['individuale', 'gruppo'] as const).map(s => (
              <label key={s} className="analisi__radio-label">
                <input type="radio" name="tipologia-dist" checked={tipologia === s} onChange={() => setTipologia(s)} className="sib-radio" />
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div className="analisi__filter-group--col">
          <div className="analisi__filter-actions">
            <button className="analisi__icon-btn analisi__icon-btn--round" title="Aggiorna">
              <i className="fa-duotone fa-arrows-rotate" aria-hidden="true" />
            </button>
            <div className="analisi__pickup">
              <span className="analisi__pickup-title">Pickup</span>
              <span className="analisi__pickup-metric"><i className="fa-duotone fa-bed" aria-hidden="true" /> 21409</span>
              <span className="analisi__pickup-metric"><i className="fa-duotone fa-euro-sign" aria-hidden="true" /> 1.967.604,08 €</span>
            </div>
            <button className="analisi__icon-btn" title="Esporta PDF">
              <i className="fa-duotone fa-file-pdf" aria-hidden="true" />
            </button>
            <button className="analisi__icon-btn" title="Esporta lista">
              <i className="fa-duotone fa-file-lines" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="analisi__filter-group--col analisi__filter-group--ml-auto">
          <div className="analisi__filter-actions">
            <button className="analisi__icon-btn" title="Grafico"><i className="fa-duotone fa-chart-line" aria-hidden="true" /></button>
            <button className="analisi__icon-btn" title="Vista a griglia"><i className="fa-duotone fa-table-cells" aria-hidden="true" /></button>
            <button className="analisi__icon-btn" title="Informazioni"><i className="fa-duotone fa-circle-info" aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="analisi__table-wrap">
        <div className="analisi__table-scroll">
          <table className="analisi__table">
            <thead>
              <tr>
                <TH />
                <TH ch="Data" />
                <TH ch="Evento" />
                <TH ch="Market demand" />
                <TH ch="Meteo" />
                <TH ch="Stagionalità" />
                <TH ch="Occupancy" />
                <TH ch="%" />
                <TH ch="Revenue" />
                <TH ch="A.D.R." />
                {PKL.map(l => (
                  <TH key={l} ch={
                    <span className="analisi__pk-head">
                      <i className="fa-duotone fa-calendar" aria-hidden="true" />
                      <span className="analisi__pk-head-n">{l}</span>
                    </span>
                  } />
                ))}
                <TH ch={
                  <span className="analisi__an-head">
                    Analisi
                    <i className="fa-duotone fa-left-right analisi__an-head-ico" title="Elasticità della domanda" aria-hidden="true" />
                  </span>
                } />
                <TH ch="Camera di riferimento" />
                <TH ch="Disponibilità" />
                <TH ch="Suggerimenti accolti" />
                <TH ch="Compset score" last />
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                const isExp = expanded.has(i);
                const an = ANALISI[row.analisi];
                return (
                  <React.Fragment key={i}>
                    <tr className={`analisi__row${isExp ? ' analisi__row--expanded' : ''}`}>
                      <TD ch={
                        <button onClick={() => toggle(i)} title="Confronta LY" aria-label="Confronta LY" className={`analisi__expand-btn ${isExp ? 'analisi__expand-btn--open' : ''}`}>
                          <Ico n="chevd" s={11} c="var(--color-primary)" />
                        </button>
                      } />
                      <TD ch={<span className="analisi__date-cell">{row.date}</span>} />
                      <TD ch={<i className="fa-duotone fa-party-horn analisi__ev-ico" aria-hidden="true" />} />
                      <TD ch={<GaugeArc level={row.market} />} />
                      <TD ch={row.meteo === 'gear'
                        ? <i className="fa-duotone fa-gear analisi__meteo-ico" aria-hidden="true" />
                        : <span className="analisi__nd">n/d</span>} />
                      <TD ch={<span className="analisi__stag">{row.stag}</span>} />
                      <TD ch={<GaugeArc level={row.occ} />} />
                      <TD ch={
                        <PieHover title="Occupazione per segmento" segs={occSegs(row.pct)} value={<span className="analisi__pct-val">{row.pct}</span>} />
                      } />
                      <TD ch={
                        <PieHover title="Revenue per canale" segs={REV_SEGS} value={<span className="analisi__rev-val">{row.rev} €</span>} />
                      } />
                      <TD ch={
                        <PieHover title="ADR per tipologia camera" segs={ADR_SEGS} value={<span>{row.adr} €</span>} />
                      } />
                      {row.pickup.map((n, j) => (
                        <TD key={j} ch={<span className={`analisi__pickup-cell ${n > 0 ? 'analisi__pickup-cell--active' : ''}`}>{n}</span>} />
                      ))}
                      <TD ch={
                        <span className={`analisi__an analisi__an--${row.analisi}`} title={an.tip}>
                          <i className={`fa-duotone ${an.icon} analisi__an-icon`} aria-hidden="true" />
                          <span className="analisi__an-text">{an.text}</span>
                        </span>
                      } />
                      <TD ch={<span className="analisi__camera">{row.camera} €</span>} />
                      <TD ch={
                        <span className="analisi__disp-cell">
                          <span className="analisi__disp-num">{row.disp}</span>
                          <i className="fa-duotone fa-bed analisi__disp-bed" aria-hidden="true" />
                        </span>
                      } />
                      <TD ch={<span className="analisi__sugg">{row.sugg}</span>} />
                      <TD last ch={<span className="analisi__compset">{row.compset}</span>} />
                    </tr>

                    {isExp && (
                      <tr>
                        <td colSpan={NCOLS} className="analisi__exp-row">
                          <div className="analisi__exp-grid">
                            <div className="analisi__exp-col analisi__exp-col--border">
                              <div className="analisi__exp-label">Riepilogo · {row.date}</div>
                              {([{ label: '%', val: row.pct, tone: 'active' }, { label: 'Revenue', val: row.rev + ' €', tone: 'success' }, { label: 'A.D.R.', val: row.adr + ' €', tone: 'primary' }] as { label: string; val: string; tone: string }[]).map(item => (
                                <div key={item.label} className="analisi__kpi-item">
                                  <div className="analisi__kpi-label">{item.label}</div>
                                  <div className={`analisi__kpi-val analisi__kpi-val--${item.tone}`}>{item.val}</div>
                                </div>
                              ))}
                            </div>
                            <div className="analisi__exp-col analisi__exp-col--border">
                              <div className="analisi__exp-label">Pickup</div>
                              <div className="analisi__pickup-row">
                                {PKL.map((lbl, j) => (
                                  <div key={j} className="analisi__pickup-item">
                                    <div className="analisi__pickup-item-lbl">{lbl}</div>
                                    <div className={`analisi__pickup-item-val ${row.pickup[j] > 0 ? 'analisi__pickup-item-val--active' : ''}`}>{row.pickup[j]}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="analisi__exp-col">
                              <div className="analisi__exp-label">Analisi</div>
                              <span className={`analisi__an analisi__an--${row.analisi}`}>
                                <i className={`fa-duotone ${an.icon} analisi__an-icon`} aria-hidden="true" />
                                <span className="analisi__an-text">{an.text}</span>
                              </span>
                              <p className="analisi__exp-note">{an.tip}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
