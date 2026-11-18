import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { InputField, SelectField } from '../../../core/components/form'
import {
  ANIM, CHART, ChartTooltip, cursorProps, fmtAxisNum, fmtEur, fmtEurK, fmtPct,
  gridProps, reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { useStrutturaIdRevenue } from '../../../hooks/useStrutturaCorrente'
import { useScenariBudgetStore } from '../../../store/useScenariBudgetStore'
import { buildFinance, computeBep, type FinanceData } from '../_data/financeMock'
import SimulaBepModal from './SimulaBepModal'
import { Obiettivi, mesiScenario, simula } from './bepScenario'
import './BreakEvenPoint.sass'

// ─── BEP ANALYSIS ───────────────────────────────────────────────────────────────
//  Pagina integrata (non più BI) dal disegno del CEO:
//    • "Simula" in alto a sinistra → pop-up Ricavi obiettivo / Margine obiettivo;
//    • a sinistra gli indicatori del pareggio, al centro i numeri da cui nasce,
//      a destra il grafico del break-even point (oggi e, se simulato, scenario);
//    • "Usa come budget complessivo" porta lo scenario nel Budget complessivo,
//      come il flusso del Simulatore di scenari.
//  Il pareggio è calcolato con `computeBep` sugli stessi dati di prima
//  (`finance/_data/financeMock` + conto economico dal BE): coincide con quello
//  della vecchia pagina BI.
//    camere di pareggio = costi fissi / (ricavo per camera − costo variabile per camera)

const ANNI = [2024, 2025, 2026]
// useGrouping 'always': in it-IT i numeri a 4 cifre (8.667) non avrebbero il punto
const INT = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions)
const fmtInt = (n: number) => INT.format(n)

export default function BreakEvenPoint({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useStrutturaIdRevenue()
  const [anno, setAnno] = useState(2026)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const bep = useMemo(() => computeBep(data.mesi), [data])

  useEffect(() => {
    let annullato = false
    apiFetchSibylla<Partial<FinanceData>>('finance/GetContoEconomico', { method: 'POST', body: { strutturaId, anno } })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
    return () => { annullato = true }
  }, [strutturaId, anno])

  // ── Simulazione ─────────────────────────────────────────────────────────────
  const [obiettivi, setObiettivi] = useState<Obiettivi | null>(null)
  const [simOpen, setSimOpen] = useState(false)
  const [usaOpen, setUsaOpen] = useState(false)
  const [nomeScenario, setNomeScenario] = useState('')
  const aggiungiScenario = useScenariBudgetStore(st => st.aggiungi)
  const ricaviAttuali = useMemo(() => data.mesi.reduce((a, m) => a + m.ricaviTotali, 0), [data])
  const margineAttuale = bep.camereVendute * bep.mcu - bep.costiFissi
  const scenario = useMemo(() => (obiettivi ? simula(bep, obiettivi) : null), [bep, obiettivi])
  const nomeStruttura = data.strutture.find(s => s.id === strutturaId)?.nome ?? 'Tutte le strutture'
  useEffect(() => { setObiettivi(null) }, [strutturaId, anno])

  function usaComeBudget() {
    const nome = nomeScenario.trim()
    if (!scenario || !nome) return
    aggiungiScenario({
      id: `bep-${Date.now()}`,
      nome,
      origine: 'bep',
      struttura: nomeStruttura,
      anno: data.anno,
      creatoIl: new Date().toISOString(),
      ricaviObiettivo: scenario.ricavi,
      margineObiettivo: scenario.margine,
      mesi: mesiScenario(scenario, data.mesi),
    })
    apiFetchSibylla('budget/SaveSimulazioneScenari', {
      method: 'POST',
      body: { nome, origine: 'bep', strutturaId, anno: data.anno, obiettivi: scenario },
    }).catch(() => { /* resta lo scenario locale */ })
    setUsaOpen(false)
    navigate('budget-complessivo')
  }

  // ── Curva ricavi/costi al variare delle camere vendute ──────────────────────
  const curva = useMemo(() => {
    const max = Math.max(bep.camereVendute, bep.camereBep, scenario?.camere ?? 0, scenario?.camereBep ?? 0) * 1.15
    const passi = 24
    return Array.from({ length: passi + 1 }, (_, i) => {
      const camere = (max / passi) * i
      return {
        camere: Math.round(camere),
        ricavi: camere * bep.ricavoPerCamera,
        costi: bep.costiFissi + camere * bep.cvu,
        fissi: bep.costiFissi,
        ...(scenario ? { costiScen: scenario.costiFissi + camere * scenario.cvu } : {}),
      }
    })
  }, [bep, scenario])

  const still = reducedMotion()
  const camereDisp = data.mesi.reduce((a, m) => a + m.camereDisponibili, 0)

  // Indicatori (colonna sinistra): oggi → scenario
  const indicatori = [
    { key: 'camere', icona: 'fa-scale-balanced', label: 'Camere di pareggio', oggi: fmtInt(Math.round(bep.camereBep)),
      scen: scenario && fmtInt(Math.round(scenario.camereBep)), info: "Camere da vendere nell'anno perché il margine di contribuzione copra i costi fissi." },
    { key: 'ricavi', icona: 'fa-euro-sign', label: 'Ricavi di pareggio', oggi: fmtEurK(bep.ricaviBep),
      scen: scenario && fmtEurK(scenario.ricaviBep), info: 'Ricavo totale corrispondente alle camere di pareggio.' },
    { key: 'occ', icona: 'fa-door-open', label: 'Occupazione minima', oggi: fmtPct(bep.occBep),
      scen: scenario && fmtPct(camereDisp ? (scenario.camereBep / camereDisp) * 100 : 0), info: 'Occupazione media annua sotto la quale la gestione è in perdita.' },
    { key: 'sic', icona: 'fa-shield-halved', label: 'Margine di sicurezza', oggi: fmtPct(bep.margineSicurezza),
      scen: scenario && fmtPct(scenario.camere ? ((scenario.camere - scenario.camereBep) / scenario.camere) * 100 : 0),
      info: 'Di quanto possono scendere le vendite prima di tornare in perdita.' },
  ]

  const numeri = [
    { label: "Costi fissi dell'anno", oggi: fmtEurK(bep.costiFissi), scen: scenario && fmtEurK(scenario.costiFissi) },
    { label: 'Ricavo per camera venduta', oggi: fmtEur(bep.ricavoPerCamera, 0), scen: null },
    { label: 'Costo variabile per camera', oggi: fmtEur(bep.cvu, 0), scen: scenario && fmtEur(scenario.cvu, 0) },
    { label: 'Margine di contribuzione per camera', oggi: fmtEur(bep.mcu, 0), scen: scenario && fmtEur(scenario.mcu, 0) },
    { label: "Camere vendute nell'anno", oggi: fmtInt(bep.camereVendute), scen: scenario && fmtInt(Math.round(scenario.camere)) },
    { label: 'Ricavi', oggi: fmtEurK(ricaviAttuali), scen: scenario && fmtEurK(scenario.ricavi) },
    { label: 'Margine', oggi: fmtEurK(margineAttuale), scen: scenario && fmtEurK(scenario.margine) },
    { label: 'Leva operativa', oggi: `${bep.levaOperativa.toFixed(1).replace('.', ',')}×`, scen: null },
  ]

  return (
    <div className="bep">
      <PageHead title="BEP analysis" subtitle="Break-even point: quante camere servono per coprire i costi, oggi e negli scenari simulati" />

      <div className="bep__toolbar">
        <button type="button" className="sib-btn sib-btn--primary bep__simula" onClick={() => setSimOpen(true)}>
          <i className="fa-solid fa-flask" aria-hidden="true" /> Simula
        </button>
        <SelectField
          name="struttura" label="Struttura" value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[{ value: '', label: 'Tutte le strutture' }, ...data.strutture.map((s) => ({ value: s.id, label: s.nome }))]}
          className="w-56"
        />
        <SelectField
          name="anno" label="Anno" value={anno} onChange={(e) => setAnno(Number(e.target.value))}
          options={ANNI.map((a) => ({ value: a, label: String(a) }))} className="w-24"
        />
        {scenario && (
          <span className="bep__scen-tag">
            <i className="fa-solid fa-flask" aria-hidden="true" />
            Scenario: ricavi {fmtEurK(scenario.ricavi)} · margine {fmtEurK(scenario.margine)}
          </span>
        )}
      </div>

      <div className="bep__layout">
        {/* ── Indicatori del pareggio ─────────────────────────────────── */}
        <div className="bep__kpis">
          {indicatori.map(k => (
            <section key={k.key} className="bep__kpi">
              <span className="bep__kpi-head">
                <i className={`fa-solid ${k.icona}`} aria-hidden="true" />
                {k.label}
                <Tooltip text={k.info}><i className="fa-regular fa-circle-info bep__info" aria-label="Informazioni" /></Tooltip>
              </span>
              <span className="bep__kpi-val">{k.oggi}</span>
              {k.scen && (
                <span className="bep__kpi-scen"><i className="fa-solid fa-arrow-right" aria-hidden="true" />{k.scen} <em>scenario</em></span>
              )}
            </section>
          ))}
        </div>

        {/* ── Composizione del pareggio ───────────────────────────────── */}
        <section className="bep__card bep__comp">
          <header className="bep__card-head">
            <h2>Composizione del pareggio</h2>
            <p>I numeri da cui nasce la soglia</p>
          </header>
          <table className="sib-table bep__table">
            <thead>
              <tr>
                <th>Voce</th>
                <th className="bep__num">Oggi</th>
                {scenario && <th className="bep__num bep__col-scen">Scenario</th>}
              </tr>
            </thead>
            <tbody>
              {numeri.map(n => (
                <tr key={n.label}>
                  <td>{n.label}</td>
                  <td className="bep__num">{n.oggi}</td>
                  {scenario && <td className="bep__num bep__col-scen">{n.scen ?? '='}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Grafico del break-even point ────────────────────────────── */}
        <section className="bep__card bep__main">
          <header className="bep__card-head bep__card-head--row">
            <div>
              <h2>{scenario ? 'Break-even point · scenario simulato' : 'Break-even point'}</h2>
              <p>Ricavi e costi al variare delle camere vendute nell'anno</p>
            </div>
            {scenario && (
              <span className="bep__sim-actions">
                <Tooltip text="Modifica gli obiettivi">
                  <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica gli obiettivi" onClick={() => setSimOpen(true)}><i className="fa-solid fa-pen" /></button>
                </Tooltip>
                <Tooltip text="Togli lo scenario">
                  <button type="button" className="sib-btn sib-btn--icon" aria-label="Togli lo scenario" onClick={() => setObiettivi(null)}><i className="fa-solid fa-xmark" /></button>
                </Tooltip>
                <button type="button" className="sib-btn sib-btn--secondary bep__usa"
                  onClick={() => { setNomeScenario(`BEP · ricavi ${fmtEurK(scenario.ricavi)}`); setUsaOpen(true) }}>
                  <i className="fa-solid fa-file-import" aria-hidden="true" /> Usa come budget complessivo
                </button>
              </span>
            )}
          </header>

          <ul className="bep__legend" aria-label="Legenda">
            <li><i className="bep__sw bep__sw--ric" aria-hidden="true" />Ricavi</li>
            <li><i className="bep__sw bep__sw--cos" aria-hidden="true" />{scenario ? 'Costi totali oggi' : 'Costi totali'}</li>
            {scenario && <li><i className="bep__sw bep__sw--scen" aria-hidden="true" />Costi totali scenario</li>}
            <li><i className="bep__sw bep__sw--cf" aria-hidden="true" />Costi fissi</li>
          </ul>

          <div className="bep__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curva} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bep-ric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="camere" {...xAxisProps} type="number" domain={['dataMin', 'dataMax']} tickFormatter={fmtAxisNum} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(props: any) => (
                    <ChartTooltip
                      {...props}
                      title={`${fmtInt(Number(props.label))} camere vendute`}
                      names={{ ricavi: 'Ricavi', costi: scenario ? 'Costi totali oggi' : 'Costi totali', costiScen: 'Costi totali scenario', fissi: 'Costi fissi' }}
                      format={(v: number) => fmtEur(v, 0)}
                    />
                  )}
                />
                <ReferenceLine
                  x={Math.round(bep.camereBep)} stroke={CHART.forecast} strokeDasharray="4 3"
                  label={{ value: `pareggio ${fmtInt(Math.round(bep.camereBep))}`, position: 'insideTopRight', fill: CHART.inkMuted, fontSize: 11 }}
                />
                <ReferenceDot x={Math.round(bep.camereBep)} y={bep.ricaviBep} r={4} fill={CHART.forecast} stroke={CHART.surface} strokeWidth={2} />
                <Area type="monotone" dataKey="ricavi" stroke={series(0)} strokeWidth={2.4} fill="url(#bep-ric)" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
                <Line type="monotone" dataKey="costi" stroke={series(5)} strokeWidth={2.4} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
                <Line type="monotone" dataKey="fissi" stroke={CHART.ly} strokeWidth={1.5} strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
                {scenario && (
                  <>
                    <Line type="monotone" dataKey="costiScen" stroke={series(2)} strokeWidth={2.4} dot={false}
                      isAnimationActive={!still} animationBegin={ANIM.begin(3)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
                    <ReferenceLine
                      x={Math.round(scenario.camereBep)} stroke={series(2)} strokeDasharray="4 3"
                      label={{ value: `scenario ${fmtInt(Math.round(scenario.camereBep))}`, position: 'insideBottomRight', fill: series(2), fontSize: 11 }}
                    />
                    <ReferenceDot x={Math.round(scenario.camereBep)} y={scenario.ricaviBep} r={4} fill={series(2)} stroke={CHART.surface} strokeWidth={2} />
                    <ReferenceDot
                      x={Math.round(scenario.camere)} y={scenario.ricavi} r={5} fill={series(2)} stroke={CHART.surface} strokeWidth={2}
                      label={{ value: 'obiettivo', position: 'top', fill: CHART.ink, fontSize: 11 }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="bep__foot">
            {scenario ? (
              <>
                Per <strong>{fmtEurK(scenario.ricavi)}</strong> di ricavi e <strong>{fmtEurK(scenario.margine)}</strong> di margine servono{' '}
                <strong>{fmtInt(Math.round(scenario.camere))}</strong> camere e{' '}
                {scenario.leva === 'fissi'
                  ? <>costi fissi entro <strong>{fmtEurK(scenario.costiFissi)}</strong></>
                  : <>un costo variabile entro <strong>{fmtEur(scenario.cvu, 0)}</strong> a camera</>}{' '}
                ({scenario.variazioneLeva > 0 ? '+' : '−'}{fmtPct(Math.abs(scenario.variazioneLeva) * 100)} rispetto a oggi): il pareggio passa da{' '}
                <strong>{fmtInt(Math.round(bep.camereBep))}</strong> a <strong>{fmtInt(Math.round(scenario.camereBep))}</strong> camere.
              </>
            ) : (
              <>
                Nel {data.anno} le camere vendute sono <strong>{fmtInt(bep.camereVendute)}</strong>,{' '}
                <strong>{fmtInt(Math.max(0, Math.round(bep.camereVendute - bep.camereBep)))}</strong> oltre la soglia di pareggio.
                Con <strong>Simula</strong> imposti ricavi e margine obiettivo e vedi il pareggio dello scenario.
              </>
            )}
          </p>
        </section>
      </div>

      <SimulaBepModal
        open={simOpen}
        onClose={() => setSimOpen(false)}
        bep={bep}
        ricaviAttuali={ricaviAttuali}
        margineAttuale={margineAttuale}
        iniziali={obiettivi}
        onSimula={o => { setObiettivi(o); setSimOpen(false) }}
      />

      <Modal open={usaOpen} onClose={() => setUsaOpen(false)} title="Usa come budget complessivo" size="sm">
        <div className="bep__usa-modal">
          <p>
            Lo scenario viene ripartito sui 12 mesi con la stagionalità del {data.anno} e si apre nel Budget complessivo
            in modalità <strong>Simulato</strong>.
          </p>
          <InputField name="nomeScenario" label="Nome dello scenario" value={nomeScenario} onChange={e => setNomeScenario(e.target.value)} />
          <div className="bep__usa-footer">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setUsaOpen(false)}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" disabled={!nomeScenario.trim()} onClick={usaComeBudget}>Salva e apri</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
