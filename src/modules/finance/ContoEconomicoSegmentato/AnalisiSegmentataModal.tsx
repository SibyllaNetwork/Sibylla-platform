import React from 'react'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { Calcolo, Segmento, Voce, fmtEuro2, fmtNum, fmtPct } from './cesData'
import './AnalisiSegmentataModal.sass'

/**
 * "Analisi segmentata": le voci dell'analisi in card, una per tabella della
 * specifica — Margini, Pareggio e rischio, Dati per ospite/coperto. Gli
 * indicatori unitari sono per ospite (presenze) o per coperto (F&B).
 */
interface Props {
  open: boolean
  onClose: () => void
  titolo: string
  segmenti: Segmento[]
  calcolo: Calcolo
  vociVariabili: Voce[]
}

const unitaLbl = (s: Segmento) => (s.unita === 'coperto' ? 'coperto' : 'ospite')

export default function AnalisiSegmentataModal({ open, onClose, titolo, segmenti, calcolo: c, vociVariabili }: Props) {
  const n = segmenti.length
  const mcu = segmenti.map((s, i) => (s.volume ? c.mdc[i] / s.volume : 0))
  const be = segmenti.map((_, i) => (mcu[i] > 0 ? c.totFissi[i] / mcu[i] : NaN))
  const sicurezza = segmenti.map((s, i) => (s.volume && isFinite(be[i]) ? (s.volume - be[i]) / s.volume : NaN))
  const leva = segmenti.map((_, i) => (c.mss[i] > 0 ? c.mdc[i] / c.mss[i] : NaN))
  const vociPresenti = vociVariabili.filter(v => segmenti.some(s => s.variabili[v.key]))

  const Head = ({ label }: { label: string }) => (
    <thead>
      <tr>
        <th>{label}</th>
        {segmenti.map(s => (
          <th key={s.id} className="cesa__num">
            <TruncatedText text={s.nome} className="cesa__seg" />
            <span className="cesa__unit">per {unitaLbl(s)}</span>
          </th>
        ))}
      </tr>
    </thead>
  )

  // Barra orizzontale per le percentuali (passi del 5%, niente style inline)
  const Pct = ({ v }: { v: number }) => (
    <span className="cesa__pct">
      <span className={v < 0 ? 'cesa__neg' : ''}>{fmtPct(v)}</span>
      <span className="cesa__bar"><span className={`cesa__fill ${v < 0 ? 'cesa__fill--neg' : ''} cesa__w${Math.min(20, Math.round(Math.abs(v) * 20))}`} /></span>
    </span>
  )

  const ns = (motivo: string) => (
    <Tooltip text={motivo}><span className="cesa__ns">n.s.</span></Tooltip>
  )

  return (
    <Modal open={open} onClose={onClose} title={`Analisi segmentata · ${titolo}`} size="xl" className="cesa-box">
      <div className="cesa">
        <div className="cesa__grid">
          {/* ── Margini ─────────────────────────────────────────── */}
          <section className="cesa__card">
            <header className="cesa__card-head">
              <i className="fa-solid fa-percent" aria-hidden="true" />
              <div>
                <h3>Margini</h3>
                <p>Quanto resta dei ricavi a ogni livello del conto</p>
              </div>
            </header>
            <table className="sib-table cesa__table">
              <Head label="Margine" />
              <tbody>
                <tr>
                  <td><Tooltip text="Margine di contribuzione / Ricavi"><span className="cesa__lbl">Margine di contribuzione %</span></Tooltip></td>
                  {segmenti.map((s, i) => <td key={s.id} className="cesa__num"><Pct v={c.ricavi[i] ? c.mdc[i] / c.ricavi[i] : 0} /></td>)}
                </tr>
                <tr>
                  <td><Tooltip text="Margine di segmento specifico / Ricavi"><span className="cesa__lbl">Margine di segmento %</span></Tooltip></td>
                  {segmenti.map((s, i) => <td key={s.id} className="cesa__num"><Pct v={c.ricavi[i] ? c.mss[i] / c.ricavi[i] : 0} /></td>)}
                </tr>
                <tr>
                  <td><Tooltip text="Margine di contribuzione / n. ospiti o coperti (MCU)"><span className="cesa__lbl">Margine di contribuzione unitario</span></Tooltip></td>
                  {segmenti.map((s, i) => <td key={s.id} className="cesa__num cesa__strong">{fmtEuro2(mcu[i])}</td>)}
                </tr>
              </tbody>
            </table>
          </section>

          {/* ── Pareggio e rischio ──────────────────────────────── */}
          <section className="cesa__card">
            <header className="cesa__card-head">
              <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
              <div>
                <h3>Pareggio e rischio</h3>
                <p>Volumi di break-even, margine di sicurezza e leva operativa</p>
              </div>
            </header>
            <table className="sib-table cesa__table">
              <Head label="Indicatore" />
              <tbody>
                <tr>
                  <td>
                    <span className="cesa__lbl">Volumi di pareggio</span>
                    <span className="cesa__formula">Costi fissi specifici / MCU</span>
                  </td>
                  {segmenti.map((s, i) => (
                    <td key={s.id} className="cesa__num cesa__strong">
                      {isFinite(be[i]) ? fmtNum(Math.round(be[i])) : ns('Margine di contribuzione unitario nullo o negativo: il pareggio non è raggiungibile')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <span className="cesa__lbl">Margine di sicurezza</span>
                    <span className="cesa__formula">(Volumi − Volumi BE) / Volumi</span>
                  </td>
                  {segmenti.map((s, i) => (
                    <td key={s.id} className="cesa__num">
                      {isFinite(sicurezza[i]) ? (
                        <span className={`cesa__semaforo cesa__semaforo--${sicurezza[i] < 0 ? 'neg' : sicurezza[i] < 0.1 ? 'warn' : 'pos'}`}>
                          <i className={`fa-solid ${sicurezza[i] < 0 ? 'fa-circle-exclamation' : sicurezza[i] < 0.1 ? 'fa-triangle-exclamation' : 'fa-shield-check'}`} aria-hidden="true" />
                          {fmtPct(sicurezza[i], 0)}
                        </span>
                      ) : ns('Non calcolabile senza volumi di pareggio')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <span className="cesa__lbl">Grado di leva operativa</span>
                    <span className="cesa__formula">Margine di contribuzione / Margine specifico</span>
                  </td>
                  {segmenti.map((s, i) => (
                    <td key={s.id} className="cesa__num cesa__strong">
                      {isFinite(leva[i]) ? leva[i].toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : ns('Margine specifico nullo o negativo: leva non significativa')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* ── Dati per ospite / coperto ─────────────────────────── */}
        <section className="cesa__card">
          <header className="cesa__card-head">
            <i className="fa-solid fa-user-group" aria-hidden="true" />
            <div>
              <h3>Dati per ospite / coperto</h3>
              <p>Volumi, prezzo medio e costi variabili medi alla base degli indicatori</p>
            </div>
          </header>
          <table className="sib-table cesa__table">
            <Head label="Dato" />
            <tbody>
              <tr>
                <td><span className="cesa__lbl">N. ospiti / coperti</span></td>
                {segmenti.map(s => <td key={s.id} className="cesa__num cesa__strong">{fmtNum(s.volume)}</td>)}
              </tr>
              <tr>
                <td><span className="cesa__lbl">Prezzo medio</span></td>
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
          {n > 0 && segmenti[0].id !== 'room' && segmenti.every(s => s.unita === 'ospite')
            ? 'Nella vista di gruppo l\'unità è l\'ospite (presenze in struttura).'
            : 'Room department, SPA e servizi ancillari sono per ospite (presenze); F&B per coperto.'}
        </p>
      </div>
    </Modal>
  )
}
