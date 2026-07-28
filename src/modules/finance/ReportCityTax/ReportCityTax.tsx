import React, { useMemo, useState } from 'react';
import PageHead from '../../../core/components/PageHead';
import { toast } from '../../../core/components/Toast/useToast';
import './ReportCityTax.sass';

// ─── Report City Tax (tassa di soggiorno) ─────────────────────────────────────
// Report settimanale della tassa di soggiorno, struttura per struttura.
// Raggiunto dal link della notifica Platform quotidiana ("Report City Tax
// disponibile", ore 09:00). Per ogni struttura e settimana: presenze suddivise
// in Day use / Residenti / Esenti (esenti da imposta) e Paganti (soggette),
// con tariffa €/notte, imposta dovuta e note di pagamento. Esportabile in Excel.

interface Struttura { id: string; nome: string; sigla: string; tariffa: number }
const STRUTTURE: Struttura[] = [
  { id: 'm1', nome: 'Hotel Siracusa',   sigla: 'M1', tariffa: 2.50 },
  { id: 'm2', nome: 'Hotel Luce',       sigla: 'M2', tariffa: 2.00 },
  { id: 'm3', nome: 'Hotel Ortigia',    sigla: 'M3', tariffa: 3.00 },
  { id: 'm4', nome: 'Resort Plemmirio', sigla: 'M4', tariffa: 4.00 },
  { id: 'm5', nome: 'B&B Aretusa',      sigla: 'M5', tariffa: 1.50 },
];

const DAY = 86400000;
// Lunedì di riferimento (settimana corrente): 20/07/2026
const BASE_LUN = new Date(2026, 6, 20);
const N_SETT = 8; // settimane disponibili (dalla più recente a ritroso)

const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const fmtEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(Math.round(n));

// pseudo-casuale deterministico in [0,1)
const rnd = (a: number, b: number) => { const x = Math.sin(a * 97.13 + b * 131.7 + 3.1) * 10000; return x - Math.floor(x); };

const NOTE_POOL = ['Versato con F24 (16/mese)', 'Bonifico effettuato', 'In attesa di versamento', 'Ravvedimento operoso', '—'];

interface Riga {
  struttura: Struttura;
  dayUse: number; residenti: number; esenti: number; paganti: number;
  imposta: number; nota: string;
}

// Settimane disponibili (indice 0 = più recente)
const SETTIMANE = Array.from({ length: N_SETT }, (_, i) => {
  const lun = new Date(BASE_LUN.getTime() - i * 7 * DAY);
  const dom = new Date(lun.getTime() + 6 * DAY);
  return { idx: i, lun, dom, label: `${ddmm(lun)} – ${ddmm(dom)}` };
});

const rigaFor = (s: Struttura, si: number, w: number): Riga => {
  const paganti = 40 + Math.round(rnd(si + 1, w + 1) * 180);
  const dayUse = Math.round(rnd(si + 2, w + 3) * 14);
  const residenti = Math.round(rnd(si + 5, w + 2) * 9);
  const esenti = Math.round(rnd(si + 7, w + 6) * 26);
  const nota = w === 0 ? NOTE_POOL[2] : NOTE_POOL[(si + w) % NOTE_POOL.length];
  return { struttura: s, dayUse, residenti, esenti, paganti, imposta: paganti * s.tariffa, nota };
};

interface Props { navigate?: (page: string) => void }

const ReportCityTax: React.FC<Props> = () => {
  const [weekIdx, setWeekIdx] = useState(0);
  const [tutte, setTutte] = useState(false);

  const righe: Riga[] = useMemo(() => {
    if (tutte) {
      // aggregato su tutte le settimane
      return STRUTTURE.map((s, si) => {
        const acc = SETTIMANE.reduce((a, w) => {
          const r = rigaFor(s, si, w.idx);
          a.dayUse += r.dayUse; a.residenti += r.residenti; a.esenti += r.esenti; a.paganti += r.paganti; a.imposta += r.imposta;
          return a;
        }, { dayUse: 0, residenti: 0, esenti: 0, paganti: 0, imposta: 0 });
        return { struttura: s, ...acc, nota: '—' };
      });
    }
    return STRUTTURE.map((s, si) => rigaFor(s, si, weekIdx));
  }, [weekIdx, tutte]);

  const tot = righe.reduce((a, r) => ({
    dayUse: a.dayUse + r.dayUse, residenti: a.residenti + r.residenti,
    esenti: a.esenti + r.esenti, paganti: a.paganti + r.paganti, imposta: a.imposta + r.imposta,
  }), { dayUse: 0, residenti: 0, esenti: 0, paganti: 0, imposta: 0 });

  const settLabel = tutte ? 'Tutte le settimane' : `Settimana ${ddmm(SETTIMANE[weekIdx].lun)} – ${ddmm(SETTIMANE[weekIdx].dom)}`;

  const exportExcel = () => {
    const head = ['Struttura', 'Sigla', 'Day use', 'Residenti', 'Esenti', 'Paganti', 'Tariffa €/notte', 'Imposta dovuta €', 'Note di pagamento'];
    const body = righe.map(r => [r.struttura.nome, r.struttura.sigla, r.dayUse, r.residenti, r.esenti, r.paganti, r.struttura.tariffa.toFixed(2), r.imposta.toFixed(2), r.nota]);
    const totale = ['TOTALE', '', tot.dayUse, tot.residenti, tot.esenti, tot.paganti, '', tot.imposta.toFixed(2), ''];
    const rows = [[`Report City Tax — ${settLabel}`], head, ...body, totale];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-city-tax-${tutte ? 'tutte' : SETTIMANE[weekIdx].label.replace(/[^\d]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Excel avviato', 'Report City Tax');
  };

  return (
    <div className="rct">
      <PageHead
        title="Report City Tax"
        subtitle="Report settimanale della tassa di soggiorno, struttura per struttura: presenze imponibili ed esenti, imposta dovuta e note di pagamento."
      />

      {/* barra: navigazione settimana + esporta */}
      <div className="rct__bar">
        <div className="rct__weeknav">
          <button type="button" className="rct__wk-btn" disabled={tutte || weekIdx >= N_SETT - 1}
            onClick={() => setWeekIdx(i => Math.min(N_SETT - 1, i + 1))} aria-label="Settimana precedente">
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span className="rct__wk-label">
            <i className="fa-regular fa-calendar-week" /> {settLabel}
            {!tutte && weekIdx === 0 && <span className="rct__wk-tag">corrente</span>}
          </span>
          <button type="button" className="rct__wk-btn" disabled={tutte || weekIdx <= 0}
            onClick={() => setWeekIdx(i => Math.max(0, i - 1))} aria-label="Settimana successiva">
            <i className="fa-solid fa-chevron-right" />
          </button>
          <button type="button" className={`rct__all${tutte ? ' is-on' : ''}`} onClick={() => setTutte(v => !v)}>
            <i className="fa-solid fa-layer-group" /> Tutte le settimane
          </button>
        </div>
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm rct__export" onClick={exportExcel}>
          <i className="fa-solid fa-file-xls" /> Esporta in Excel
        </button>
      </div>

      <div className="sib-table-wrap rct__table-wrap">
        <table className="sib-table rct__table">
          <thead>
            <tr>
              <th>Struttura</th>
              <th className="rct__num">Day use</th>
              <th className="rct__num">Residenti</th>
              <th className="rct__num">Esenti</th>
              <th className="rct__num">Paganti</th>
              <th className="rct__num">Tariffa</th>
              <th className="rct__num rct__imp-col">Imposta dovuta</th>
              <th>Note di pagamento</th>
            </tr>
          </thead>
          <tbody>
            {righe.map(r => (
              <tr key={r.struttura.id}>
                <td>
                  <span className="rct__struct">{r.struttura.nome}</span>
                </td>
                <td className="rct__num rct__muted">{fmtNum(r.dayUse)}</td>
                <td className="rct__num rct__muted">{fmtNum(r.residenti)}</td>
                <td className="rct__num rct__muted">{fmtNum(r.esenti)}</td>
                <td className="rct__num"><b>{fmtNum(r.paganti)}</b></td>
                <td className="rct__num rct__muted">{fmtEur(r.struttura.tariffa)}</td>
                <td className="rct__num rct__imp-col"><b>{fmtEur(r.imposta)}</b></td>
                <td className="rct__note">{r.nota}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rct__tot">
              <td>Totale{tutte ? ' (tutte le settimane)' : ''}</td>
              <td className="rct__num">{fmtNum(tot.dayUse)}</td>
              <td className="rct__num">{fmtNum(tot.residenti)}</td>
              <td className="rct__num">{fmtNum(tot.esenti)}</td>
              <td className="rct__num">{fmtNum(tot.paganti)}</td>
              <td className="rct__num" />
              <td className="rct__num rct__imp-col">{fmtEur(tot.imposta)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="rct__legend">
        <i className="fa-light fa-circle-info" /> Sono <b>esenti</b> dalla tassa di soggiorno le presenze in <em>day use</em>, i <em>residenti</em> nel Comune e le altre categorie <em>esenti</em> (minori, disabili e accompagnatori, ecc.). L'imposta dovuta è calcolata sulle sole presenze <b>paganti</b> × tariffa €/notte della struttura.
      </p>
    </div>
  );
};

export default ReportCityTax;
