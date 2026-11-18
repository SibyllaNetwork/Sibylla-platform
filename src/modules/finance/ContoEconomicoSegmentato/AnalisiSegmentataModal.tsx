import React from 'react'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { Calcolo, Segmento, Voce, fmtEuro2, fmtNum, fmtPct } from './cesData'
import './AnalisiSegmentataModal.sass'

/**
 * "Analisi segmentata" (disegno di Matteo): sei card, una per indicatore delle
 * tabelle della specifica —
 *   Margini: margine di contribuzione %, margine di segmento %, MdC per ospite;
 *   Pareggio: volumi BE, margine di sicurezza, grado di leva operativa —
 * e sotto i dati per ospite / coperto da cui sono calcolati.
 */
interface Props {
  open: boolean
  onClose: () => void
  titolo: string
  segmenti: Segmento[]
  calcolo: Calcolo
  vociVariabili: Voce[]
}

type Valore = { testo: React.ReactNode; pct?: number; neg?: boolean }
interface CardDef { key: string; icona: string; titolo: string; formula: string; valori: Valore[] }

const unita = (s: Segmento) => (s.unita === 'coperto' ? 'coperto' : 'ospite')
const plurale = (s: Segmento) => (s.unita === 'coperto' ? 'coperti' : 'ospiti')

export default function AnalisiSegmentataModal({ open, onClose, titolo, segmenti, calcolo: c, vociVariabili }: Props) {
  const mcu = segmenti.map((s, i) => (s.volume ? c.mdc[i] / s.volume : 0))
  const be = segmenti.map((_, i) => (mcu[i] > 0 ? c.totFissi[i] / mcu[i] : NaN))
  const sicurezza = segmenti.map((s, i) => (s.volume && isFinite(be[i]) ? (s.volume - be[i]) / s.volume : NaN))
  const leva = segmenti.map((_, i) => (c.mss[i] > 0 ? c.mdc[i] / c.mss[i] : NaN))
  const vociPresenti = vociVariabili.filter(v => segmenti.some(s => s.variabili[v.key]))

  const ns = (motivo: string): Valore => ({ testo: <Tooltip text={motivo}><span className="cesa__ns">n.s.</span></Tooltip> })
  const pct = (v: number): Valore => ({ testo: fmtPct(v), pct: v, neg: v < 0 })

  const CARDS: CardDef[] = [
    { key: 'mdc', icona: 'fa-percent', titolo: 'Margine di contribuzione %', formula: 'Margine di contribuzione / Ricavi',
      valori: segmenti.map((_, i) => pct(c.ricavi[i] ? c.mdc[i] / c.ricavi[i] : 0)) },
    { key: 'mss', icona: 'fa-percent', titolo: 'Margine di segmento %', formula: 'Margine specifico / Ricavi',
      valori: segmenti.map((_, i) => pct(c.ricavi[i] ? c.mss[i] / c.ricavi[i] : 0)) },
    { key: 'mcu', icona: 'fa-user', titolo: 'Margine di contribuzione per ospite', formula: 'Margine di contribuzione / n. ospiti (MCU)',
      valori: segmenti.map((s, i) => ({ testo: <>{fmtEuro2(mcu[i])}<span className="cesa__per"> / {unita(s)}</span></>, neg: mcu[i] < 0 })) },
    { key: 'be', icona: 'fa-scale-balanced', titolo: 'Volumi BE', formula: 'Costi fissi / MCU',
      valori: segmenti.map((s, i) => (isFinite(be[i])
        ? { testo: <>{fmtNum(Math.round(be[i]))}<span className="cesa__per"> {plurale(s)}</span></> }
        : ns('Margine di contribuzione unitario nullo o negativo: il pareggio non è raggiungibile'))) },
    { key: 'sic', icona: 'fa-shield-halved', titolo: 'Margine di sicurezza', formula: '(Volumi − Volumi BE) / Volumi',
      valori: segmenti.map((_, i) => {
        const v = sicurezza[i]
        if (!isFinite(v)) return ns('Non calcolabile senza volumi di pareggio')
        const t = v < 0 ? 'neg' : v < 0.1 ? 'warn' : 'pos'
        return {
          testo: (
            <span className={`cesa__semaforo cesa__semaforo--${t}`}>
              <i className={`fa-solid ${t === 'neg' ? 'fa-circle-exclamation' : t === 'warn' ? 'fa-triangle-exclamation' : 'fa-shield-check'}`} aria-hidden="true" />
              {fmtPct(v, 0)}
            </span>
          ),
        }
      }) },
    { key: 'leva', icona: 'fa-gauge-high', titolo: 'Grado di leva operativa', formula: 'Margine di contribuzione / Margine specifico',
      valori: segmenti.map((_, i) => (isFinite(leva[i])
        ? { testo: leva[i].toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
        : ns('Margine specifico nullo o negativo: leva non significativa'))) },
  ]

  return (
    <Modal open={open} onClose={onClose} title={`Analisi segmentata · ${titolo}`} size="xl" className="cesa-box">
      <div className="cesa">
        <div className="cesa__grid">
          {CARDS.map(card => (
            <section key={card.key} className="cesa__card">
              <header className="cesa__card-head">
                <i className={`fa-solid ${card.icona}`} aria-hidden="true" />
                <div className="cesa__card-tit">
                  <h3><TruncatedText text={card.titolo} className="cesa__card-h" /></h3>
                  <TruncatedText text={card.formula} className="cesa__formula" />
                </div>
              </header>
              <ul className="cesa__vals">
                {segmenti.map((s, i) => {
                  const v = card.valori[i]
                  return (
                    <li key={s.id} className="cesa__val">
                      <span className="cesa__val-row">
                        <i className={`cesa__dot cesa__dot--${i}`} aria-hidden="true" />
                        <TruncatedText text={s.nome} className="cesa__seg" />
                        <span className={`cesa__num ${v.neg ? 'cesa__neg' : ''}`}>{v.testo}</span>
                      </span>
                      {v.pct !== undefined && (
                        <span className="cesa__bar">
                          <span className={`cesa__fill ${v.neg ? 'cesa__fill--neg' : ''} cesa__w${Math.min(20, Math.round(Math.abs(v.pct) * 20))}`} />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* ── Dati per ospite / coperto ─────────────────────────── */}
        <section className="cesa__dati">
          <h3 className="cesa__dati-tit">
            <i className="fa-solid fa-user-group" aria-hidden="true" />
            Dati per ospite / coperto
            <span>volumi, prezzo e costi medi da cui sono calcolati gli indicatori</span>
          </h3>
          <table className="sib-table cesa__table">
            <thead>
              <tr>
                <th>Dato</th>
                {segmenti.map((s, i) => (
                  <th key={s.id} className="cesa__num">
                    <span className="cesa__th-seg"><i className={`cesa__dot cesa__dot--${i}`} aria-hidden="true" /><TruncatedText text={s.nome} className="cesa__seg" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="cesa__lbl">N. ospiti / coperti</span></td>
                {segmenti.map(s => <td key={s.id} className="cesa__num cesa__strong">{fmtNum(s.volume)}<span className="cesa__per"> {plurale(s)}</span></td>)}
              </tr>
              <tr>
                <td><span className="cesa__lbl">Prezzo per ospite / coperto</span></td>
                {segmenti.map((s, i) => <td key={s.id} className="cesa__num">{fmtEuro2(s.volume ? c.ricavi[i] / s.volume : 0)}</td>)}
              </tr>
              {vociPresenti.map(v => (
                <tr key={v.key}>
                  <td><TruncatedText text={`Costo medio · ${v.label}`} className="cesa__voce" /></td>
                  {segmenti.map(s => (
                    <td key={s.id} className="cesa__num">{s.variabili[v.key] && s.volume ? fmtEuro2(s.variabili[v.key] / s.volume) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="cesa__nota">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          {segmenti.some(s => s.unita === 'coperto')
            ? 'Soggiorno e SPA sono per ospite (presenze); F&B per coperto.'
            : 'Nella vista di gruppo l\'unità è l\'ospite (presenze in struttura).'}
        </p>
      </div>
    </Modal>
  )
}
