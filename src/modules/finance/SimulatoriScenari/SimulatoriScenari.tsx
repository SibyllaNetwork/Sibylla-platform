import React, { useMemo, useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { InputField, RangeField, SelectField } from '../../../core/components/form'
import {
  ANIM, CHART, ChartTooltip, fmtAxisNum, gridProps, reducedMotion, series, useCountUp, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { useScenariBudgetStore } from '../../../store/useScenariBudgetStore'
import { exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  Base, Esito, Leve, MODELLI, SEGMENTI, Scenario, SegKey, baseStruttura, calcola, fmtEuro, fmtK, fmtNum, fmtPct,
  leveVuote, levaMigliore, ponte, scenariIniziali, segno,
} from './simData'
import './SimulatoriScenari.sass'

/**
 * Simulatore di scenari — "prova oggi la decisione di domani".
 * A sinistra le leve dello scenario attivo (ADR e notti per segmento, costi
 * fissi e variabili, leve generali e modelli rapidi); a destra il confronto
 * vivo fra base e tre scenari (profitto con contatore, scenario migliore), il
 * ponte del profitto (da dove viene la differenza) e i ricavi per segmento.
 * "Porta nel Budget complessivo" salva lo scenario scelto (BE:
 * budget/SaveSimulazioneScenari) e lo apre nel Budget complessivo in modalità
 * Simulato, ripartito sui mesi.
 */

// Stagionalità per la ripartizione mensile nel Budget complessivo
const STAGIONE = [0.58, 0.6, 0.74, 0.9, 1.06, 1.28, 1.5, 1.55, 1.16, 0.94, 0.68, 0.82]
const SOMMA_STAGIONE = STAGIONE.reduce((a, b) => a + b, 0)

const COL = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

function Contatore({ v, f }: { v: number; f: (x: number) => string }) {
  const x = useCountUp(v, 700)
  return <>{f(x)}</>
}

export default function SimulatoriScenari({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const annoBase = new Date().getFullYear() - 1
  const base: Base = useMemo(() => baseStruttura(struttura, annoBase), [struttura, annoBase])
  const [scenari, setScenari] = useState<Scenario[]>(scenariIniziali)
  const [attivo, setAttivo] = useState(1)
  const [salvaOpen, setSalvaOpen] = useState(false)
  const [daSalvare, setDaSalvare] = useState(1)
  const [nome, setNome] = useState('')
  const aggiungi = useScenariBudgetStore(s => s.aggiungi)
  const mainRef = useRef<HTMLDivElement>(null)
  const still = reducedMotion()

  const e0 = useMemo(() => calcola(base, leveVuote()), [base])
  const esiti: Esito[] = useMemo(() => scenari.map(s => calcola(base, s.leve)), [base, scenari])
  const migliore = esiti.reduce((bi, e, i) => (e.profitto > esiti[bi].profitto ? i : bi), 0)
  const sc = scenari[attivo]
  const p = useMemo(() => ponte(base, sc.leve), [base, sc])
  const leva = useMemo(() => levaMigliore(base), [base])

  // ── Modifica delle leve dello scenario attivo ─────────────────────────────
  const setLeve = (f: (l: Leve) => Leve) =>
    setScenari(prev => prev.map((s, i) => (i === attivo ? { ...s, leve: f(s.leve) } : s)))
  const setSeg = (k: SegKey, campo: 'adr' | 'rn', v: number) =>
    setLeve(l => ({ ...l, seg: { ...l.seg, [k]: { ...l.seg[k], [campo]: v } } }))
  const setTutti = (campo: 'adr' | 'rn', v: number) =>
    setLeve(l => ({ ...l, seg: Object.fromEntries(SEGMENTI.map(s => [s.key, { ...l.seg[s.key], [campo]: v }])) as Leve['seg'] }))
  // Leva generale: mostra il valore comune se tutti i segmenti coincidono
  const comune = (campo: 'adr' | 'rn') => {
    const vals = SEGMENTI.map(s => sc.leve.seg[s.key][campo])
    return vals.every(v => v === vals[0]) ? vals[0] : null
  }

  // ── Porta nel Budget complessivo ───────────────────────────────────────────
  function apriSalva() {
    setDaSalvare(attivo)
    setNome(`Scenario ${scenari[attivo].nome} · ${struttura}`)
    setSalvaOpen(true)
  }
  function salva() {
    const s = scenari[daSalvare], e = esiti[daSalvare]
    const n = nome.trim() || `Scenario ${s.nome}`
    aggiungi({
      id: `sim-${Date.now()}`,
      nome: n,
      origine: 'simulatore',
      struttura,
      anno: annoBase + 1,
      creatoIl: new Date().toISOString(),
      ricaviObiettivo: e.ricavi,
      margineObiettivo: e.profitto,
      mesi: {
        vendite: STAGIONE.map(k => Math.round(e.ricavi * k / SOMMA_STAGIONE)),
        proventi: STAGIONE.map(() => 0),
        fisso: STAGIONE.map(() => Math.round(e.fissi / 12)),
        variabile: STAGIONE.map(k => Math.round(e.variabili * k / SOMMA_STAGIONE)),
      },
    })
    apiFetchSibylla('budget/SaveSimulazioneScenari', {
      method: 'POST', body: { nome: n, struttura, scenario: s.nome, leve: s.leve },
    }).catch(() => { /* resta lo scenario locale */ })
    setSalvaOpen(false)
    navigate('budget-complessivo')
  }

  // ── Grafici ────────────────────────────────────────────────────────────────
  const datiPonte = [
    { nome: `Base ${annoBase}`, range: [0, p.base], v: p.base, tipo: 'tot' },
    { nome: 'Prezzo (ADR)', range: [p.base, p.base + p.prezzo], v: p.prezzo, tipo: 'delta' },
    { nome: 'Volumi (notti)', range: [p.base + p.prezzo, p.base + p.prezzo + p.volumi], v: p.volumi, tipo: 'delta' },
    { nome: 'Costi variabili', range: [p.base + p.prezzo + p.volumi, p.base + p.prezzo + p.volumi + p.variabili], v: p.variabili, tipo: 'delta' },
    { nome: 'Costi fissi', range: [p.scenario - p.fissi, p.scenario], v: p.fissi, tipo: 'delta' },
    { nome: sc.nome, range: [0, p.scenario], v: p.scenario, tipo: 'scen' },
  ].map(d => ({ ...d, range: [Math.min(d.range[0], d.range[1]), Math.max(d.range[0], d.range[1])] }))
  const colorePonte = (d: { tipo: string; v: number }) =>
    d.tipo === 'tot' ? CHART.ly : d.tipo === 'scen' ? COL[attivo] : d.v >= 0 ? CHART.good : CHART.bad

  const datiSeg = SEGMENTI.map(s => ({
    nome: s.label,
    base: e0.ricaviSeg[s.key],
    ...Object.fromEntries(esiti.map((e, i) => [`s${i}`, e.ricaviSeg[s.key]])),
  }))

  const deltaBase = (e: Esito) => e.profitto - e0.profitto

  return (
    <div className="sim">
      <PageHead title="Simulatore di scenari" subtitle="Prova oggi la decisione di domani, senza alcun rischio" />

      <div className="sim__toolbar">
        <div className="sim__filters">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)} options={opzioniStrutture} className="w-56" />
          <span className="sim__base-info">
            <i className="fa-solid fa-database" aria-hidden="true" />
            Base: consuntivo {annoBase} · {fmtNum(e0.notti)} notti · ricavi {fmtK(e0.ricavi)} · profitto {fmtK(e0.profitto)}
          </span>
        </div>
        <div className="sim__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setScenari(scenariIniziali())}>
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Ripristina
          </button>
          <Tooltip text="Esporta PDF">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={() => exportElementToPdf(mainRef.current, `simulatore-scenari-${struttura}.pdf`, `Simulatore di scenari — ${struttura}`)}>
              <i className="fa-regular fa-file-pdf" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="sim__layout">
        {/* ── Leve dello scenario attivo ─────────────────────────────── */}
        <aside className={`sim__card sim__leve sim__leve--s${attivo}`}>
          <div className="sim__tabs" role="tablist" aria-label="Scenari">
            {scenari.map((s, i) => (
              <button key={s.id} type="button" role="tab" aria-selected={i === attivo}
                className={`sim__tab sim__tab--s${i} ${i === attivo ? 'sim__tab--on' : ''}`} onClick={() => setAttivo(i)}>
                <span className="sim__tab-n">{['I', 'II', 'III'][i]}</span>
                <span className="sim__tab-txt">
                  <TruncatedText text={s.nome} className="sim__tab-nome" />
                  <span className={`sim__tab-val ${esiti[i].profitto < 0 ? 'sim__neg' : ''}`}>{fmtK(esiti[i].profitto)}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="sim__modelli">
            <span className="sim__lbl">Modelli rapidi</span>
            <div className="sim__chips">
              {MODELLI.map(m => (
                <Tooltip key={m.id} text={m.desc}>
                  <button type="button" className="sim__chip" onClick={() => setLeve(m.leve)}>
                    <i className={`fa-solid ${m.icona}`} aria-hidden="true" />{m.label}
                  </button>
                </Tooltip>
              ))}
              <Tooltip text="Riporta a zero tutte le leve dello scenario">
                <button type="button" className="sim__chip sim__chip--reset" onClick={() => setLeve(leveVuote)}>
                  <i className="fa-solid fa-eraser" aria-hidden="true" />Azzera
                </button>
              </Tooltip>
            </div>
          </div>

          <section className="sim__sez">
            <h3 className="sim__sez-tit"><i className="fa-solid fa-sack-dollar" aria-hidden="true" />Ricavi</h3>
            <div className="sim__tutti">
              <span className="sim__tutti-lbl"><i className="fa-solid fa-layer-group" aria-hidden="true" />Tutti i segmenti</span>
              <div className="sim__pair">
                <RangeField name={`tutti-adr-${attivo}`} label="ADR" value={comune('adr') ?? 0} onChange={v => setTutti('adr', v)} min={-20} max={20}
                  valueLabel={comune('adr') === null ? 'misto' : undefined} hideReset />
                <RangeField name={`tutti-rn-${attivo}`} label="Notti" value={comune('rn') ?? 0} onChange={v => setTutti('rn', v)} min={-30} max={30}
                  valueLabel={comune('rn') === null ? 'misto' : undefined} hideReset />
              </div>
            </div>
            {SEGMENTI.map(s => {
              const b = base.seg[s.key], v = sc.leve.seg[s.key]
              const e = esiti[attivo]
              const d = e.ricaviSeg[s.key] - e0.ricaviSeg[s.key]
              return (
                <div key={s.key} className="sim__seg">
                  <div className="sim__seg-head">
                    <i className={`fa-solid ${s.icona}`} aria-hidden="true" />
                    <strong>{s.label}</strong>
                    <span className="sim__seg-base">{fmtEuro(b.adr)} · {fmtNum(b.rn)} notti</span>
                    <span className={`sim__seg-delta ${d > 0 ? 'sim__pos' : d < 0 ? 'sim__neg' : ''}`}>{d === 0 ? '=' : segno(d, fmtK)}</span>
                  </div>
                  <div className="sim__pair">
                    <RangeField name={`${s.key}-adr-${attivo}`} label="ADR" value={v.adr} onChange={x => setSeg(s.key, 'adr', x)} min={-20} max={20}
                      hint={fmtEuro(b.adr * (1 + v.adr / 100))} />
                    <RangeField name={`${s.key}-rn-${attivo}`} label="Notti" value={v.rn} onChange={x => setSeg(s.key, 'rn', x)} min={-30} max={30}
                      hint={fmtNum(e.nottiSeg[s.key])} />
                  </div>
                </div>
              )
            })}
          </section>

          <section className="sim__sez">
            <h3 className="sim__sez-tit"><i className="fa-solid fa-receipt" aria-hidden="true" />Costi</h3>
            <div className="sim__pair">
              <RangeField name={`fissi-${attivo}`} label="Costi fissi" value={sc.leve.fissi} onChange={x => setLeve(l => ({ ...l, fissi: x }))} min={-20} max={20}
                hint={fmtK(esiti[attivo].fissi)} />
              <RangeField name={`var-${attivo}`} label="Costo variabile a notte" value={sc.leve.variabili} onChange={x => setLeve(l => ({ ...l, variabili: x }))} min={-20} max={20}
                hint={`${fmtEuro(base.varPerNotte * (1 + sc.leve.variabili / 100))} · tot. ${fmtK(esiti[attivo].variabili)}`} />
            </div>
            <p className="sim__nota"><i className="fa-solid fa-circle-info" aria-hidden="true" /> I costi variabili seguono le notti vendute: più volumi, più pulizie, lavanderia e commissioni.</p>
          </section>
        </aside>

        {/* ── Risultati ──────────────────────────────────────────────── */}
        <div className="sim__main" ref={mainRef}>
          <div className="sim__confronto">
            {[{ nome: `Base ${annoBase}`, e: e0, i: -1 }, ...scenari.map((s, i) => ({ nome: s.nome, e: esiti[i], i }))].map(x => {
              const d = deltaBase(x.e)
              const scala = Math.max(...[e0, ...esiti].map(e => Math.abs(e.profitto)), 1)
              return (
                <button key={x.nome} type="button" disabled={x.i < 0}
                  className={`sim__scen ${x.i < 0 ? 'sim__scen--base' : `sim__scen--s${x.i}`} ${x.i === attivo ? 'sim__scen--on' : ''}`}
                  onClick={() => x.i >= 0 && setAttivo(x.i)}>
                  <span className="sim__scen-head">
                    {x.i >= 0 && <span className="sim__scen-n">{['I', 'II', 'III'][x.i]}</span>}
                    <span className="sim__scen-nome">{x.nome}</span>
                    {x.i === migliore && <Tooltip text="Scenario con il profitto più alto"><i className="fa-solid fa-trophy sim__trofeo" aria-label="Migliore" /></Tooltip>}
                  </span>
                  <span className="sim__scen-lbl">Profitto</span>
                  <span className={`sim__scen-big ${x.e.profitto < 0 ? 'sim__neg' : ''}`}><Contatore v={x.e.profitto} f={fmtK} /></span>
                  {x.i >= 0 ? (
                    <span className={`sim__scen-delta ${d > 0 ? 'sim__pos' : d < 0 ? 'sim__neg' : ''}`}>
                      <i className={`fa-solid fa-arrow-${d >= 0 ? 'trend-up' : 'trend-down'}`} aria-hidden="true" />
                      {segno(d, fmtK)} vs base
                    </span>
                  ) : <span className="sim__scen-delta">punto di partenza</span>}
                  <span className="sim__scen-bar"><span className={`sim__scen-fill sim__w${Math.round(Math.max(0, x.e.profitto) / scala * 20)}`} /></span>
                  <span className="sim__scen-dl">
                    <span>Ricavi <strong>{fmtK(x.e.ricavi)}</strong></span>
                    <span>Costi <strong>{fmtK(x.e.costi)}</strong></span>
                    <span>Margine <strong>{fmtPct(x.e.margine)}</strong></span>
                  </span>
                </button>
              )
            })}
          </div>

          <section className="sim__card sim__ponte">
            <header className="sim__card-head">
              <div>
                <h2>Da dove viene la differenza · {sc.nome}</h2>
                <p>Ponte del profitto: dalla base allo scenario, quanto vale ogni leva</p>
              </div>
            </header>
            <div className="sim__chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datiPonte} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="nome" {...xAxisProps} interval={0} />
                  <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} domain={[(min: number) => Math.min(0, min), 'auto']} />
                  <RTooltip cursor={{ fill: CHART.grid }}
                    content={(pr: any) => (
                      <ChartTooltip {...pr} payload={pr.payload?.map((q: any) => ({ ...q, value: q.payload.v }))}
                        names={{ range: 'Effetto sul profitto' }} format={(v: number) => fmtEuro(v)} />
                    )} />
                  <Bar dataKey="range" radius={[4, 4, 4, 4]} isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                    {datiPonte.map(d => <Cell key={d.nome} fill={colorePonte(d)} />)}
                    <LabelList dataKey="v" position="top" formatter={(v: unknown) => (Number(v) === 0 ? '=' : fmtK(Number(v)).replace(/ /g, '\u00a0'))} className="sim__chart-lbl" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="sim__insight">
              <i className="fa-solid fa-lightbulb" aria-hidden="true" />
              La leva più potente per {struttura}: <strong>+1% di {leva.leva} su {leva.seg}</strong> vale circa <strong>{fmtK(leva.valore)}</strong> di profitto in più.
            </p>
          </section>

          <section className="sim__card sim__segm">
            <header className="sim__card-head">
              <div>
                <h2>Ricavi per segmento</h2>
                <p>Base {annoBase} e i tre scenari a confronto</p>
              </div>
              <ul className="sim__legend">
                <li><i className="sim__sw sim__sw--base" aria-hidden="true" />Base</li>
                {scenari.map((s, i) => <li key={s.id}><i className={`sim__sw sim__sw--s${i}`} aria-hidden="true" />{s.nome}</li>)}
              </ul>
            </header>
            <div className="sim__chart sim__chart--basso">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datiSeg} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%" barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="nome" {...xAxisProps} />
                  <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                  <RTooltip cursor={{ fill: CHART.grid }}
                    content={<ChartTooltip names={{ base: `Base ${annoBase}`, ...Object.fromEntries(scenari.map((s, i) => [`s${i}`, s.nome])) }} format={(v: number) => fmtEuro(v)} />} />
                  <Bar dataKey="base" fill={CHART.ly} radius={[3, 3, 0, 0]} isAnimationActive={!still} animationDuration={ANIM.duration} />
                  {scenari.map((s, i) => (
                    <Bar key={s.id} dataKey={`s${i}`} fill={series(i)} radius={[3, 3, 0, 0]} fillOpacity={i === attivo ? 1 : 0.45}
                      isAnimationActive={!still} animationBegin={ANIM.begin(i + 1)} animationDuration={ANIM.duration} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      <div className="sim__barra">
        <span className="sim__barra-txt">
          <span className={`sim__tab-n sim__tab--s${attivo}`}>{['I', 'II', 'III'][attivo]}</span>
          Scenario <strong>{sc.nome}</strong>: profitto <strong className={esiti[attivo].profitto < 0 ? 'sim__neg' : ''}>{fmtEuro(esiti[attivo].profitto)}</strong>
          {' '}({segno(deltaBase(esiti[attivo]), fmtK)} rispetto al {annoBase})
        </span>
        <button type="button" className="sib-btn sib-btn--primary" onClick={apriSalva}>
          <i className="fa-solid fa-file-import" aria-hidden="true" /> Porta nel Budget complessivo
        </button>
      </div>

      <Modal open={salvaOpen} onClose={() => setSalvaOpen(false)} title="Porta lo scenario nel Budget complessivo" size="lg">
        <div className="sim-salva">
          <span className="sim__lbl">Quale scenario?</span>
          <div className="sim-salva__scelte" role="radiogroup" aria-label="Scenario da salvare">
            {scenari.map((s, i) => (
              <button key={s.id} type="button" role="radio" aria-checked={daSalvare === i}
                className={`sim-salva__scelta sim__scen--s${i} ${daSalvare === i ? 'sim-salva__scelta--on' : ''}`}
                onClick={() => { setDaSalvare(i); setNome(`Scenario ${s.nome} · ${struttura}`) }}>
                <span className="sim__scen-head">
                  <i className={`fa-${daSalvare === i ? 'solid' : 'regular'} fa-circle${daSalvare === i ? '-dot' : ''}`} aria-hidden="true" />
                  <span className="sim__scen-n">{['I', 'II', 'III'][i]}</span>
                  <span className="sim__scen-nome">{s.nome}</span>
                  {i === migliore && <i className="fa-solid fa-trophy sim__trofeo" aria-label="Migliore" />}
                </span>
                <span className="sim-salva__dl">
                  <span>Ricavi <strong>{fmtK(esiti[i].ricavi)}</strong></span>
                  <span>Costi <strong>{fmtK(esiti[i].costi)}</strong></span>
                  <span>Profitto <strong className={esiti[i].profitto < 0 ? 'sim__neg' : ''}>{fmtK(esiti[i].profitto)}</strong></span>
                </span>
              </button>
            ))}
          </div>
          <InputField name="nomeSim" label="Nome della simulazione" value={nome} onChange={e => setNome(e.target.value)} />
          <p className="sim-salva__nota">
            <i className="fa-solid fa-calendar-days" aria-hidden="true" />
            Ricavi e costi variabili vengono ripartiti sui 12 mesi del {annoBase + 1} con la stagionalità tipica; i costi fissi in quote uguali.
            Lo scenario si apre nel Budget complessivo in modalità <strong>Simulato</strong>.
          </p>
          <div className="sim-salva__foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSalvaOpen(false)}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>
              <i className="fa-solid fa-file-import" aria-hidden="true" /> Salva e apri nel Budget complessivo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
