import React, { useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Tooltip from '../../../../core/components/Tooltip'
import { SelectField } from '../../../../core/components/form'
import { exportTableToXls } from '../../booking/GrigliaDisponibilita/exportGriglia'
import './BudgetRicavi.sass'

// Budget dei ricavi — dashboard revenue per mese: Anno Precedente, Impostazione
// Rapida % (editabile, guida la Previsione Attesa), Previsione Attesa e Anno
// Corrente con scostamenti vs budget. Replica `Views/Budget/BudgetR.cshtml`.

interface MeseBase {
  mese: string
  precRN: number; precADR: number   // anno precedente
  corrRN: number; corrADR: number   // anno corrente (consuntivo)
}

const MESI: MeseBase[] = [
  { mese: 'GEN', precRN: 0,  precADR: 0,      corrRN: 33,  corrADR: 245.62 },
  { mese: 'FEB', precRN: 0,  precADR: 0,      corrRN: 18,  corrADR: 258.77 },
  { mese: 'MAR', precRN: 0,  precADR: 0,      corrRN: 79,  corrADR: 198.48 },
  { mese: 'APR', precRN: 0,  precADR: 0,      corrRN: 83,  corrADR: 246.90 },
  { mese: 'MAG', precRN: 0,  precADR: 0,      corrRN: 106, corrADR: 221.68 },
  { mese: 'GIU', precRN: 0,  precADR: 0,      corrRN: 205, corrADR: 140.87 },
  { mese: 'LUG', precRN: 0,  precADR: 0,      corrRN: 73,  corrADR: 100.51 },
  { mese: 'AGO', precRN: 0,  precADR: 0,      corrRN: 6,   corrADR: 140.27 },
  { mese: 'SET', precRN: 0,  precADR: 0,      corrRN: 0,   corrADR: 0 },
  { mese: 'OTT', precRN: 13, precADR: 120.90, corrRN: 0,   corrADR: 0 },
  { mese: 'NOV', precRN: 61, precADR: 88.31,  corrRN: 0,   corrADR: 0 },
  { mese: 'DIC', precRN: 56, precADR: 101.00, corrRN: 12,  corrADR: 55.80 },
]

const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare']
const SEGMENTI  = ['Tutti i segmenti', 'Individuali', 'Gruppi', 'Business', 'Leisure']
const ANNI      = ['2026', '2025', '2024']
const INIT_DRN  = [2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1]

const eur = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const round = (n: number) => Math.round(n)

// Scostamento %: ∞ quando il budget è 0, -100% quando il consuntivo è 0.
function pct(curr: number, base: number): { text: string; cls: string } {
  if (base === 0 && curr === 0) return { text: '—', cls: 'bdg-ric__delta--zero' }
  if (base === 0)               return { text: '+∞%', cls: 'bdg-ric__delta--up' }
  const v = ((curr - base) / base) * 100
  const text = `${v >= 0 ? '+' : ''}${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  return { text, cls: v >= 0 ? 'bdg-ric__delta--up' : 'bdg-ric__delta--down' }
}

export default function BudgetRicavi({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [segmento, setSegmento]   = useState(SEGMENTI[0])
  const [anno, setAnno]           = useState(ANNI[0])
  const [dRN, setDRN]   = useState<number[]>(INIT_DRN)
  const [dADR, setDADR] = useState<number[]>(MESI.map(() => 2))
  // Valori "applica a tutti" dell'header Impostazione Rapida %
  const [headRN, setHeadRN]   = useState(1)
  const [headADR, setHeadADR] = useState(2)
  const num = (v: string) => Number(v.replace(',', '.')) || 0
  const applyAllRN  = (v: string) => { const n = num(v); setHeadRN(n);  setDRN(MESI.map(() => n)) }
  const applyAllADR = (v: string) => { const n = num(v); setHeadADR(n); setDADR(MESI.map(() => n)) }

  const rows = useMemo(() => MESI.map((m, i) => {
    const precRev = m.precRN * m.precADR
    // Previsione attesa = anno precedente rivalutato con le % rapide
    const prevRN  = round(m.precRN * (1 + dRN[i] / 100))
    const prevADR = m.precADR * (1 + dADR[i] / 100)
    const prevRev = prevRN * prevADR
    const corrRev = m.corrRN * m.corrADR
    return { ...m, precRev, prevRN, prevADR, prevRev, corrRev }
  }), [dRN, dADR])

  const tot = useMemo(() => {
    const s = (sel: (r: typeof rows[number]) => number) => rows.reduce((a, r) => a + sel(r), 0)
    const precRN = s((r) => r.precRN), precRev = s((r) => r.precRev)
    const prevRN = s((r) => r.prevRN), prevRev = s((r) => r.prevRev)
    const corrRN = s((r) => r.corrRN), corrRev = s((r) => r.corrRev)
    return {
      precRN, precRev, precADR: precRN ? precRev / precRN : 0,
      prevRN, prevRev, prevADR: prevRN ? prevRev / prevRN : 0,
      corrRN, corrRev, corrADR: corrRN ? corrRev / corrRN : 0,
    }
  }, [rows])

  // Mesi già trascorsi: valori fissi (non editabili) e sbiaditi
  const now = new Date()
  const isPast = (i: number) => {
    const y = Number(anno)
    if (y < now.getFullYear()) return true
    if (y > now.getFullYear()) return false
    return i < now.getMonth()
  }

  const setD = (setter: React.Dispatch<React.SetStateAction<number[]>>, i: number, v: string) =>
    setter((p) => p.map((x, j) => (j === i ? Number(v.replace(',', '.')) || 0 : x)))

  const ripristina = () => { setDRN(INIT_DRN); setDADR(MESI.map(() => 2)); setHeadRN(1); setHeadADR(2) }

  const esportaXls = () => {
    const header = ['Mese', 'RN Prec.', 'ADR Prec.', 'Revenue Prec.', 'Δ%RN', 'Δ%ADR', 'RN Prev.', 'ADR Prev.', 'Revenue Prev.', 'RN', 'ADR', 'Revenue']
    const body = rows.map((r, i) => [r.mese, r.precRN, eur(r.precADR), eur(r.precRev), dRN[i], dADR[i], r.prevRN, eur(r.prevADR), eur(r.prevRev), r.corrRN, eur(r.corrADR), eur(r.corrRev)])
    exportTableToXls('budget-ricavi.xls', header, body, `Budget dei ricavi ${anno}`)
  }

  const Delta = ({ d }: { d: { text: string; cls: string } }) => <span className={`bdg-ric__delta ${d.cls}`}>{d.text}</span>

  return (
    <div className="bdg-ric">
      <BtnBack />
      <PageHeader title="Budget dei ricavi" subtitle="Dashboard interattiva del revenue con confronto dei dati storici e previsioni future" />

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="bdg-ric__bar">
        <div className="bdg-ric__filters">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
          <SelectField name="segmento" label="Segmenti" value={segmento} onChange={(e) => setSegmento(e.target.value)} options={SEGMENTI.map((s) => ({ value: s, label: s }))} />
          <SelectField name="anno" label="Anno" className="w-[110px]" value={anno} onChange={(e) => setAnno(e.target.value)} options={ANNI.map((a) => ({ value: a, label: a }))} />
          <Tooltip text="Configurando il budget aziendale in modalità aggregata non avrai un dettaglio analitico pesato per segmento">
            <i className="fa-light fa-circle-info bdg-ric__info" />
          </Tooltip>
        </div>
        <div className="bdg-ric__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={ripristina}><i className="fa-light fa-eraser" /> Ripristina</button>
          <button type="button" className="sib-btn sib-btn--primary"><i className="fa-light fa-floppy-disk" /> Salva</button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('cabina-controllo')}><i className="fa-light fa-gauge-high" /> Cabina di controllo</button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('budget-complessivo')}><i className="fa-light fa-coins" /> Budget complessivo</button>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel" onClick={esportaXls}><i className="fa-light fa-file-excel" /></button>
          </Tooltip>
          <Tooltip text="Esporta in PDF">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in PDF"><i className="fa-light fa-file-pdf" /></button>
          </Tooltip>
        </div>
      </div>

      {/* ── Tabella ─────────────────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table bdg-ric__table">
          <thead>
            <tr>
              <th rowSpan={2}>Mese</th>
              <th colSpan={3} className="bdg-ric__grp bdg-ric__grp--prec">Anno Precedente</th>
              <th colSpan={2} className="bdg-ric__grp bdg-ric__grp--imp">Impostazione Rapida %</th>
              <th colSpan={3} className="bdg-ric__grp bdg-ric__grp--prev">Previsione Attesa</th>
              <th colSpan={6} className="bdg-ric__grp bdg-ric__grp--corr">Anno Corrente</th>
            </tr>
            <tr>
              <th>RN</th><th>ADR</th><th>Revenue</th>
              <th>
                <span className="bdg-ric__head-imp">Δ%RN
                  <input type="number" min={0} step={1} className="sib-input bdg-ric__imp-input" value={headRN} onChange={(e) => applyAllRN(e.target.value)} aria-label="Δ%RN per tutti i mesi" />
                </span>
              </th>
              <th>
                <span className="bdg-ric__head-imp">Δ%ADR
                  <input type="number" min={0} step={0.01} className="sib-input bdg-ric__imp-input" value={headADR} onChange={(e) => applyAllADR(e.target.value)} aria-label="Δ%ADR per tutti i mesi" />
                </span>
              </th>
              <th>RN</th><th>ADR</th><th>Revenue</th>
              <th>RN</th><th>Δ% RN vs BDG</th><th>ADR</th><th>Δ% ADR vs BDG</th><th>Revenue</th><th>Δ% RV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.mese} className={isPast(i) ? 'bdg-ric__row--past' : ''}>
                <td className="bdg-ric__mese-cell">
                  <span className="bdg-ric__cal" aria-label={r.mese}>
                    <span className="bdg-ric__cal-head" />
                    <span className="bdg-ric__cal-day">{r.mese}</span>
                  </span>
                </td>
                <td>{r.precRN} Notti</td>
                <td>{eur(r.precADR)}</td>
                <td>{eur(r.precRev)}</td>
                {isPast(i) ? (
                  <>
                    <td className="bdg-ric__imp-cell">{dRN[i]}</td>
                    <td className="bdg-ric__imp-cell">{dADR[i].toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  </>
                ) : (
                  <>
                    <td className="bdg-ric__imp-cell">
                      <input type="number" min={0} step={1} className="sib-input bdg-ric__imp-input" value={dRN[i]} onChange={(e) => setD(setDRN, i, e.target.value)} />
                    </td>
                    <td className="bdg-ric__imp-cell">
                      <input type="number" min={0} step={0.01} className="sib-input bdg-ric__imp-input" value={dADR[i]} onChange={(e) => setD(setDADR, i, e.target.value)} />
                    </td>
                  </>
                )}
                <td>{r.prevRN} Notti</td>
                <td>{eur(r.prevADR)}</td>
                <td>{eur(r.prevRev)}</td>
                <td className="bdg-ric__corr">{r.corrRN} Notti</td>
                <td className="bdg-ric__corr"><Delta d={pct(r.corrRN, r.prevRN)} /></td>
                <td className="bdg-ric__corr">{eur(r.corrADR)}</td>
                <td className="bdg-ric__corr"><Delta d={pct(r.corrADR, r.prevADR)} /></td>
                <td className="bdg-ric__corr">{eur(r.corrRev)}</td>
                <td className="bdg-ric__corr"><Delta d={pct(r.corrRev, r.prevRev)} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bdg-ric__tot">
              <td>Totale</td>
              <td>{tot.precRN} Notti</td>
              <td>{eur(tot.precADR)}</td>
              <td>{eur(tot.precRev)}</td>
              <td>—</td>
              <td>—</td>
              <td>{tot.prevRN} Notti</td>
              <td>{eur(tot.prevADR)}</td>
              <td>{eur(tot.prevRev)}</td>
              <td>{tot.corrRN} Notti</td>
              <td><Delta d={pct(tot.corrRN, tot.prevRN)} /></td>
              <td>{eur(tot.corrADR)}</td>
              <td><Delta d={pct(tot.corrADR, tot.prevADR)} /></td>
              <td>{eur(tot.corrRev)}</td>
              <td><Delta d={pct(tot.corrRev, tot.prevRev)} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
