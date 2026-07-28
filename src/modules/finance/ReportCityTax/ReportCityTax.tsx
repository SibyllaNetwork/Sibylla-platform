import React, { useMemo, useState } from 'react';
import PageHead from '../../../core/components/PageHead';
import Tooltip from '../../../core/components/Tooltip';
import { SelectField } from '../../../core/components/form';
import { toast } from '../../../core/components/Toast/useToast';
import { downloadCityTaxExcel, MOCK_CITY_TAX_STAYS, CITY_TAX_CATEGORIA, CITY_TAX_TARIFFA } from './cityTaxExcel';
import './ReportCityTax.sass';

// ─── Report City Tax (tassa di soggiorno) ─────────────────────────────────────
// Report settimanale della tassa di soggiorno, struttura per struttura.
// Raggiunto dal link della notifica Platform ("Report City Tax disponibile",
// inviata ogni lunedì alle 09:00 — abilitabile dal Configuratore notifiche).
//
// In alto: la CATEGORIA della struttura e la relativa TARIFFA della tassa di
// soggiorno, in sola lettura: le tariffe sono configurate per categoria e per
// tutte le regioni italiane dal Pannello di controllo (es. ★★★ = 6,00 €,
// ★★★★ = 7,50 €). La tassa si calcola PER PERSONA PER NOTTE.
//
// Tabella per settimana: Struttura · Paganti (n. ospiti) · Esenti (con causa) ·
// Totale (n. notti × tariffa). Esportabile in Excel.

// Categoria struttura e tariffa €/persona/notte (sola lettura, da Pannello di
// controllo): sorgente condivisa con l'Excel City Tax.
const CATEGORIA = CITY_TAX_CATEGORIA;
const TARIFFA = CITY_TAX_TARIFFA;

interface Struttura { id: string; nome: string; sigla: string }
const STRUTTURE: Struttura[] = [
  { id: 'm1', nome: 'Hotel Siracusa',   sigla: 'M1' },
  { id: 'm2', nome: 'Hotel Luce',       sigla: 'M2' },
  { id: 'm3', nome: 'Hotel Ortigia',    sigla: 'M3' },
  { id: 'm4', nome: 'Resort Plemmirio', sigla: 'M4' },
  { id: 'm5', nome: 'B&B Aretusa',      sigla: 'M5' },
];

const DAY = 86400000;
const BASE_LUN = new Date(2026, 6, 20); // lunedì di riferimento (settimana corrente)
const N_SETT = 8;

const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const fmtEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(Math.round(n));

// pseudo-casuale deterministico in [0,1)
const rnd = (a: number, b: number) => { const x = Math.sin(a * 97.13 + b * 131.7 + 3.1) * 10000; return x - Math.floor(x); };

// Principali cause di esenzione dalla tassa di soggiorno (richiamate in tabella).
const CAUSE_ESENZIONE = ['Residente nel Comune', 'Day use', 'Minori', 'Disabili e accompagnatori', 'Non vuole pagare'] as const;

interface Esenzione { causa: string; n: number }
interface Riga {
  struttura: Struttura;
  ospitiPaganti: number;   // ospiti soggetti a imposta
  nottiPaganti: number;    // notti-persona soggette (ospiti × notti)
  esenti: number;          // ospiti esenti (totale)
  esenzioni: Esenzione[];  // dettaglio esenti per causa
  totale: number;          // nottiPaganti × TARIFFA
}

// Settimane disponibili (indice 0 = più recente)
const SETTIMANE = Array.from({ length: N_SETT }, (_, i) => {
  const lun = new Date(BASE_LUN.getTime() - i * 7 * DAY);
  const dom = new Date(lun.getTime() + 6 * DAY);
  return { idx: i, lun, dom, label: `${ddmm(lun)} – ${ddmm(dom)}` };
});

const rigaFor = (s: Struttura, si: number, w: number): Riga => {
  const ospitiPaganti = 40 + Math.round(rnd(si + 1, w + 1) * 180);
  const nottiMedie = 1 + Math.round(rnd(si + 3, w + 2) * 4);      // 1..5 notti
  const nottiPaganti = ospitiPaganti * nottiMedie;
  const esentiTot = Math.round(rnd(si + 7, w + 6) * 34);
  // ripartizione esenti per causa (deterministica)
  const pesi = CAUSE_ESENZIONE.map((_, ci) => rnd(si + ci + 11, w + ci + 4));
  const somma = pesi.reduce((a, b) => a + b, 0) || 1;
  const esenzioni = CAUSE_ESENZIONE.map((causa, ci) => ({ causa, n: Math.round(esentiTot * pesi[ci] / somma) }));
  const esenti = esenzioni.reduce((a, e) => a + e.n, 0);
  return { struttura: s, ospitiPaganti, nottiPaganti, esenti, esenzioni, totale: nottiPaganti * TARIFFA };
};

interface Props { navigate?: (page: string) => void }

const ReportCityTax: React.FC<Props> = () => {
  // 'all' oppure indice settimana ('0'..)
  const [week, setWeek] = useState<string>('0');
  const tutte = week === 'all';
  const weekIdx = tutte ? 0 : Number(week);

  const righe: Riga[] = useMemo(() => {
    if (tutte) {
      return STRUTTURE.map((s, si) => {
        const acc = SETTIMANE.reduce((a, w) => {
          const r = rigaFor(s, si, w.idx);
          a.ospitiPaganti += r.ospitiPaganti; a.nottiPaganti += r.nottiPaganti; a.esenti += r.esenti; a.totale += r.totale;
          r.esenzioni.forEach((e, ci) => { a.esenzioni[ci] = { causa: e.causa, n: (a.esenzioni[ci]?.n ?? 0) + e.n }; });
          return a;
        }, { ospitiPaganti: 0, nottiPaganti: 0, esenti: 0, totale: 0, esenzioni: [] as Esenzione[] });
        return { struttura: s, ...acc };
      });
    }
    return STRUTTURE.map((s, si) => rigaFor(s, si, weekIdx));
  }, [weekIdx, tutte]);

  const tot = righe.reduce((a, r) => ({
    ospitiPaganti: a.ospitiPaganti + r.ospitiPaganti,
    nottiPaganti: a.nottiPaganti + r.nottiPaganti,
    esenti: a.esenti + r.esenti,
    totale: a.totale + r.totale,
  }), { ospitiPaganti: 0, nottiPaganti: 0, esenti: 0, totale: 0 });

  const settLabel = tutte ? 'Tutte le settimane' : `Settimana ${SETTIMANE[weekIdx].label}`;

  const weekOptions = [
    ...SETTIMANE.map((w) => ({ value: String(w.idx), label: w.idx === 0 ? `${w.label} (corrente)` : w.label })),
    { value: 'all', label: 'Tutte le settimane' },
  ];

  // Excel dettagliato per-ospite (Struttura · Camera · Ospite · Check-in ·
  // Check-out · RN · Canale · Totale · Stato · Motivazione), struttura condivisa
  // con la pagina Ospiti in casa.
  const exportExcel = () => {
    downloadCityTaxExcel(MOCK_CITY_TAX_STAYS, {
      tariffa: TARIFFA,
      label: `Report City Tax — ${settLabel}`,
      fileName: `report-city-tax-${tutte ? 'tutte' : SETTIMANE[weekIdx].label.replace(/[^\d]/g, '-')}.csv`,
    });
    toast.success('Export Excel avviato', 'Report City Tax');
  };

  return (
    <div className="rct">
      <PageHead
        title="Report City Tax"
        subtitle="Report settimanale della tassa di soggiorno, struttura per struttura. La tassa si calcola per persona a notte."
      />

      {/* Categoria + tariffa (sola lettura, da Pannello di controllo) */}
      <div className="rct__meta">
        <div className="rct__meta-item">
          <span className="rct__meta-label">Categoria struttura</span>
          <span className="rct__stars" aria-label={`${CATEGORIA} stelle`}>
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} className={`fa-${i < CATEGORIA ? 'solid' : 'light'} fa-star`} aria-hidden="true" />
            ))}
          </span>
        </div>
        <div className="rct__meta-sep" />
        <div className="rct__meta-item">
          <span className="rct__meta-label">Tassa di soggiorno</span>
          <span className="rct__meta-val">
            {fmtEur(TARIFFA)} <small>per persona a notte</small>
          </span>
        </div>
      </div>

      {/* barra: selettore settimana + esporta */}
      <div className="rct__bar">
        <SelectField
          name="rct-week"
          className="rct__weeksel"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          options={weekOptions}
        />
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm rct__export" onClick={exportExcel}>
          <i className="fa-regular fa-file-xls" /> Scarica Excel
        </button>
      </div>

      <div className="sib-table-wrap rct__table-wrap">
        <table className="sib-table rct__table">
          <thead>
            <tr>
              <th>Struttura</th>
              <th className="rct__num">Paganti</th>
              <th className="rct__num">Esenti</th>
              <th className="rct__num rct__imp-col">Totale</th>
            </tr>
          </thead>
          <tbody>
            {righe.map(r => (
              <tr key={r.struttura.id}>
                <td><span className="rct__struct">{r.struttura.nome}</span></td>
                <td className="rct__num">
                  <b>{fmtNum(r.ospitiPaganti)}</b>
                  <span className="rct__sub">{fmtNum(r.ospitiPaganti)} ospiti · {fmtNum(r.nottiPaganti)} notti</span>
                </td>
                <td className="rct__num">
                  <Tooltip text={r.esenzioni.filter(e => e.n > 0).map(e => `${e.causa}: ${e.n}`).join(' · ') || 'Nessun esente'}>
                    <span className="rct__esenti">{fmtNum(r.esenti)} <i className="fa-light fa-circle-info" /></span>
                  </Tooltip>
                </td>
                <td className="rct__num rct__imp-col"><b>{fmtEur(r.totale)}</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rct__tot">
              <td>Totale{tutte ? ' (tutte le settimane)' : ''}</td>
              <td className="rct__num">{fmtNum(tot.ospitiPaganti)}</td>
              <td className="rct__num">{fmtNum(tot.esenti)}</td>
              <td className="rct__num rct__imp-col">{fmtEur(tot.totale)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="rct__legend">
        <i className="fa-light fa-circle-info" /> La tassa di soggiorno è dovuta <b>per persona a notte</b> ({fmtEur(TARIFFA)}) e si paga al checkout.
        Il <b>Totale</b> è calcolato come notti-persona paganti × tariffa. Sono <b>esenti</b> le categorie previste (residenti, day use, minori, disabili e accompagnatori, ecc.); passa sulla colonna Esenti per il dettaglio delle cause.
      </p>
    </div>
  );
};

export default ReportCityTax;
