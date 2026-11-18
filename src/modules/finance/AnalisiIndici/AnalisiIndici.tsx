import React, { useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField } from '../../../core/components/form'
import { Sparkline, CHART } from '../../../core/bi'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import IndiceTrendModal from './IndiceTrendModal'
import { ANNI, Indice, SEZIONI, Tono, bilanci, fmtDelta, fmtValore, serie, tono, unitaLbl } from './indiciData'
import './AnalisiIndici.sass'

/**
 * Analisi per indici — i quattro gruppi di indici aziendali (Crescita,
 * Redditività, Liquidità, Solidità) sugli ultimi tre esercizi, impaginati come
 * la Cabina di controllo. L'icona grafico accanto a ogni indice apre
 * l'andamento storico dell'indicatore.
 */

const TONO_COLOR: Record<Tono, string> = { pos: CHART.good, neg: CHART.bad, neutral: 'var(--chart-1)' }

export default function AnalisiIndici({ navigate }: { navigate: (p: string) => void }) {
  const [anno, setAnno] = useState('2024')
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const [chiuse, setChiuse] = useState<Record<string, boolean>>({})
  const [aperto, setAperto] = useState<Indice | null>(null)

  // X = anno scelto: le colonne sono X, X+1, X+2
  const fino = Number(anno) + 2
  const bil = useMemo(() => bilanci(struttura, fino), [struttura, fino])
  const idx = [bil.length - 3, bil.length - 2, bil.length - 1]
  const anni = idx.map(i => bil[i].anno)

  const righe = useMemo(() => SEZIONI.map(sez => ({
    sez,
    indici: sez.indici.map(ind => {
      const valori = idx.map(i => ind.calc(bil[i], bil[i - 1]))
      const delta = valori[2] - valori[1]
      return { ind, valori, delta, tono: tono(delta, ind.polarita, ind.unita), storia: serie(ind, bil).map(p => p.v) }
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [bil])

  // ── Letture dell'ultimo esercizio (sotto la tabella) ─────────────────
  const letture = useMemo(() => {
    const tutte = righe.flatMap(r => r.indici)
    const migliorati = tutte.filter(r => r.tono === 'pos').length
    const peggiorati = tutte.filter(r => r.tono === 'neg').length
    const roe = tutte.find(r => r.ind.key === 'roe')!
    const indeb = tutte.find(r => r.ind.key === 'indebFinanziario')!
    return { migliorati, peggiorati, valutati: tutte.filter(r => r.ind.polarita !== 'neutral').length, roe, indeb }
  }, [righe])

  // ── Export ───────────────────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null)
  const titoloExport = `Analisi per indici — ${anni[0]}-${anni[2]} · ${struttura}`
  function exportXls() {
    const header = ['Indice', 'Formula', ...anni.map(String), `Var. ${anni[2]} vs ${anni[1]}`]
    const rows: (string | number)[][] = []
    righe.forEach(({ sez, indici }) => {
      rows.push([sez.titolo.toUpperCase()])
      indici.forEach(r => rows.push([r.ind.label, r.ind.formula, ...r.valori.map(v => fmtValore(v, r.ind.unita)), fmtDelta(r.delta, r.ind.unita)]))
    })
    exportTableToXls(`analisi-indici-${anno}.xls`, header, rows, titoloExport)
  }
  function exportPdf() {
    exportElementToPdf(tableRef.current, `analisi-indici-${anno}.pdf`, titoloExport)
  }

  return (
    <div className="aind">
      <PageHead title="Analisi per indici" subtitle="Crescita, redditività, liquidità e solidità: lo stato di salute dell'impresa esercizio per esercizio" />

      <div className="aind__toolbar">
        <div className="aind__filters">
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(e.target.value)} options={ANNI.map(a => ({ value: a, label: a }))} className="w-24" />
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)} options={opzioniStrutture} className="w-56" />
        </div>
        <div className="aind__actions">
          <Tooltip text="Esporta PDF"><button className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={exportPdf}><i className="fa-regular fa-file-pdf" /></button></Tooltip>
          <Tooltip text="Esporta Excel"><button className="sib-btn sib-btn--icon" aria-label="Esporta Excel" onClick={exportXls}><i className="fa-regular fa-file-xls" /></button></Tooltip>
        </div>
      </div>

      <div className="sib-table-wrap aind__wrap">
        <table className="sib-table aind__table" ref={tableRef}>
          <colgroup>
            <col className="aind__col-ind" />
            <col className="aind__col-formula" />
            <col /><col /><col className="aind__col-last" />
            <col className="aind__col-trend" />
          </colgroup>
          <thead>
            <tr>
              <th>Indice</th>
              <th>Formula</th>
              {anni.map((a, i) => (
                <th key={a} className={`aind__num ${i === 2 ? 'aind__last' : ''}`}>
                  {a}
                  <span className="aind__xlbl">{i === 0 ? 'X' : `X+${i}`}</span>
                </th>
              ))}
              <th className="aind__num">
                <TruncatedText text={`Andamento ${bil[0].anno + 1}–${anni[2]}`} full={`Andamento storico ${bil[0].anno + 1}–${anni[2]} e variazione ${anni[2]} vs ${anni[1]}`} className="aind__trend-head" />
              </th>
            </tr>
          </thead>
          <tbody>
            {righe.map(({ sez, indici }) => {
              const chiusa = !!chiuse[sez.id]
              return (
                <React.Fragment key={sez.id}>
                  <tr className="aind__section">
                    <td colSpan={6} className={`aind__section-cell aind__section-cell--${sez.id}`}>
                      <button type="button" className="aind__sec-toggle" aria-expanded={!chiusa}
                        onClick={() => setChiuse(s => ({ ...s, [sez.id]: !chiusa }))}>
                        <i className={`fa-solid fa-chevron-${chiusa ? 'right' : 'down'} aind__sec-chev`} aria-hidden="true" />
                        <i className={`fa-solid ${sez.icona}`} aria-hidden="true" />
                        {sez.titolo}
                        <span className="aind__sec-desc">{sez.desc}</span>
                      </button>
                    </td>
                  </tr>
                  {!chiusa && indici.map(r => (
                    <tr key={r.ind.key} className="aind__row">
                      <td className="aind__ind">
                        <span className="aind__ind-cell">
                          <Tooltip text={r.ind.nota}>
                            <TruncatedText text={r.ind.breve ?? r.ind.label} full={r.ind.label} className="aind__ind-txt" />
                          </Tooltip>
                          <Tooltip text="Andamento storico">
                            <button type="button" className="aind__chart-btn" aria-label={`Andamento storico: ${r.ind.label}`} onClick={() => setAperto(r.ind)}>
                              <i className="fa-solid fa-chart-line" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        </span>
                      </td>
                      <td className="aind__formula"><TruncatedText text={r.ind.formula} className="aind__formula-txt" /></td>
                      {r.valori.map((v, i) => (
                        <td key={anni[i]} className={`aind__num ${i === 2 ? 'aind__last' : ''} ${v < 0 ? 'aind__neg' : ''}`}>
                          {fmtValore(v, r.ind.unita)}
                        </td>
                      ))}
                      <td className="aind__num">
                        <span className="aind__trend">
                          <Sparkline values={r.storia} height={24} color={TONO_COLOR[r.tono]} className="aind__spark" />
                          <Tooltip text={`${anni[2]} vs ${anni[1]} (${unitaLbl[r.ind.unita]})${r.ind.polarita === 'neutral' ? ' · indice senza direzione favorevole' : ''}`}>
                            <span className={`aind__delta aind__delta--${r.tono}`}>
                              <i className={`fa-solid ${r.delta > 0 ? 'fa-caret-up' : r.delta < 0 ? 'fa-caret-down' : 'fa-minus'}`} aria-hidden="true" />
                              {fmtDelta(r.delta, r.ind.unita)}
                            </span>
                          </Tooltip>
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Letture dell'ultimo esercizio */}
      <div className="aind__insights" aria-label="Letture dell'esercizio">
        <div className="aind__insight">
          <i className="fa-solid fa-scale-balanced aind__insight-ico" aria-hidden="true" />
          <span>
            Nel {anni[2]} <strong className="aind__delta--pos">{letture.migliorati} indici migliorano</strong> e{' '}
            <strong className="aind__delta--neg">{letture.peggiorati} peggiorano</strong> su {letture.valutati} rispetto al {anni[1]}
          </span>
        </div>
        <div className="aind__insight">
          <i className={`fa-solid fa-chart-line-up aind__insight-ico aind__insight-ico--${letture.roe.tono}`} aria-hidden="true" />
          <span>ROE <strong>{fmtValore(letture.roe.valori[2], 'pct')}</strong> ({fmtDelta(letture.roe.delta, 'pct')})</span>
        </div>
        <div className="aind__insight">
          <i className={`fa-solid fa-building-columns aind__insight-ico aind__insight-ico--${letture.indeb.tono}`} aria-hidden="true" />
          <span>PFN / Patrimonio netto <strong>{fmtValore(letture.indeb.valori[2], 'x')}</strong></span>
        </div>
        <button type="button" className="aind__link" onClick={() => navigate('conto-economico-segmentato')}>
          Conto economico segmentato <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </div>

      <IndiceTrendModal indice={aperto} bilanci={bil} struttura={struttura} onClose={() => setAperto(null)} />
    </div>
  )
}
