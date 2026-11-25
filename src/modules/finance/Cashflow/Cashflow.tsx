import React, { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import VistaSwitch from '../../../core/components/VistaSwitch'
import { DatePickerField, SelectField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { CHART, ChartCard, ChartTooltip, fmtAxisNum, gridProps, reducedMotion, series } from '../../../core/bi'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { useCashflowStore } from '../../../store/useCashflowStore'
import {
  dataBreve, dataIncasso, dataLunga, distribuisci, eur, eurPieno, generaCassa, giorniTra, iso, livelloTermometro,
  oggi, piuGiorni, posizioneTermometro, proietta,
  type DatiCassa, type Incasso, type Uscita,
} from './cfData'
import './Cashflow.sass'

// ─── CASHFLOW ──────────────────────────────────────────────────────────────────
//  Pagina operativa e predittiva della cassa (non una fotografia di fine anno):
//    1. Liquidità effettiva oggi su tutti i conti collegati → popup con i conti
//    2. Termometro delle aspettative: stima del sistema vs realtà → perché
//    3. Stima degli incassi dalle abitudini di pagamento → sollecito ai ritardatari
//    4. Pianificazione delle uscite: la data di ogni pagamento fra oggi e la
//       scadenza, per livellare i picchi (in produzione → Business Central)
//  Sotto: liquidità reale vs stimata degli ultimi 30 giorni e prevista per i
//  prossimi 60 con il piano corrente, e i prossimi movimenti.

type Box = 'conti' | 'termometro' | 'incassi' | 'uscite' | null
type Orizzonte = '7' | '10' | '30' | '50'
const ORIZZONTI = [
  { value: '7' as const, label: 'Prossima settimana', icon: 'fa-calendar-week' },
  { value: '10' as const, label: '10 giorni', icon: 'fa-calendar-day' },
  { value: '30' as const, label: '30 giorni', icon: 'fa-calendar-days' },
  { value: '50' as const, label: '50 giorni', icon: 'fa-calendar' },
]

export default function Cashflow({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioni] = useStrutturaPagina()
  const d = useMemo(() => generaCassa(struttura), [struttura])
  const piano = useCashflowStore(s => s.piani[struttura]) ?? NESSUN_PIANO
  const [aperto, setAperto] = useState<Box>(null)

  const oggiIso = iso(oggi())
  const fra30 = iso(piuGiorni(oggi(), 30))
  const proiezione = useMemo(() => proietta(d, piano), [d, piano])
  const livello = livelloTermometro(d.liquidita, d.attesa)

  const incassi30 = d.incassi.filter(i => i.stato !== 'incassato' && dataIncasso(i, oggiIso) <= fra30)
  const inRitardo = d.incassi.filter(i => i.stato === 'in-ritardo')
  const uscite30 = d.uscite.filter(u => (piano[u.id] ?? u.scadenza) <= fra30)
  const picco = proiezione.slice(0, 31).reduce((m, p) => (p.uscite > m.uscite ? p : m), proiezione[0])
  const minimo = proiezione.reduce((m, p) => (p.saldo < m.saldo ? p : m), proiezione[0])

  return (
    <div className="cfl">
      <PageHead
        title="Cashflow"
        subtitle="Liquidità reale, stime e pianificazione di incassi e uscite"
        actions={(
          <SelectField name="cfl-struttura" label="Struttura" value={struttura} options={opzioni}
            onChange={e => setStruttura(e.target.value)} className="cfl__struttura" />
        )}
      />

      <div className="cfl__box">
        {/* 1 · Liquidità effettiva */}
        <button type="button" className="cfl__card" onClick={() => setAperto('conti')}>
          <span className="cfl__card-tit"><i className="fa-solid fa-building-columns" aria-hidden="true" />Liquidità effettiva</span>
          <span className="cfl__card-val">{eur(d.liquidita)}</span>
          <span className="cfl__card-sub">al {dataLunga(oggiIso)} · {d.conti.length} conti collegati</span>
          <span className="cfl__card-banche" aria-hidden="true">
            {d.conti.map((c, i) => <span key={c.id} className={`cfl__dot cfl__dot--${i}`} />)}
          </span>
          <span className="cfl__card-cta">Dettaglio dei conti <i className="fa-solid fa-chevron-right" aria-hidden="true" /></span>
        </button>

        {/* 2 · Termometro */}
        <button type="button" className={`cfl__card cfl__card--${livello.chiave}`} onClick={() => setAperto('termometro')}>
          <span className="cfl__card-tit"><i className="fa-solid fa-temperature-half" aria-hidden="true" />Termometro delle aspettative</span>
          <span className="cfl__card-val cfl__livello">
            <i className={`fa-solid ${livello.icona}`} aria-hidden="true" />{livello.nome}
            {livello.chiave === 'ottimo' && <span className="cfl__stelle" aria-hidden="true">★★★</span>}
          </span>
          <Termometro scarto={livello.scarto} />
          <span className="cfl__card-sub">Stimata {eur(d.attesa)} · reale {eur(d.liquidita)} ({segnoPct(livello.scarto)})</span>
          <span className="cfl__card-cta">Perché <i className="fa-solid fa-chevron-right" aria-hidden="true" /></span>
        </button>

        {/* 3 · Stima degli incassi */}
        <button type="button" className="cfl__card" onClick={() => setAperto('incassi')}>
          <span className="cfl__card-tit"><i className="fa-solid fa-arrow-down-to-bracket" aria-hidden="true" />Stima degli incassi</span>
          <span className="cfl__card-val cfl__card-val--in">+{eur(incassi30.reduce((a, i) => a + i.importo, 0))}</span>
          <span className="cfl__card-sub">{incassi30.length} incassi attesi nei prossimi 30 giorni, dalle abitudini di pagamento dei clienti</span>
          {inRitardo.length > 0
            ? <span className="cfl__card-alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" />{inRitardo.length} in ritardo · {eur(inRitardo.reduce((a, i) => a + i.importo, 0))}</span>
            : <span className="cfl__card-sub">Nessun incasso in ritardo</span>}
          <span className="cfl__card-cta">Incassi e solleciti <i className="fa-solid fa-chevron-right" aria-hidden="true" /></span>
        </button>

        {/* 4 · Pianificazione uscite */}
        <button type="button" className="cfl__card" onClick={() => setAperto('uscite')}>
          <span className="cfl__card-tit"><i className="fa-solid fa-arrow-up-from-bracket" aria-hidden="true" />Pianificazione uscite</span>
          <span className="cfl__card-val cfl__card-val--out">−{eur(uscite30.reduce((a, u) => a + u.importo, 0))}</span>
          <span className="cfl__card-sub">{uscite30.length} pagamenti nei prossimi 30 giorni, {uscite30.filter(u => u.spostabile).length} da pianificare</span>
          <span className="cfl__card-sub">Picco: {eur(picco.uscite)} il {dataBreve(picco.data)}</span>
          <span className="cfl__card-cta">Pianifica i pagamenti <i className="fa-solid fa-chevron-right" aria-hidden="true" /></span>
        </button>
      </div>

      <div className="cfl__griglia">
        <ChartCard index={0} className="cfl__chart" bodyClassName="cfl__chart-body"
          title="Liquidità: reale, stimata e prevista"
          subtitle={`Ultimi 30 giorni a confronto con la stima del sistema; prossimi 60 con incassi stimati e uscite pianificate. Punto più basso: ${eur(minimo.saldo)} il ${dataBreve(minimo.data)}`}
          legend={[
            { key: 'reale', name: 'Reale', color: series(0) },
            { key: 'stimata', name: 'Stimata', color: CHART.ly, dashed: true },
            { key: 'prevista', name: 'Prevista', color: CHART.forecast, dashed: true },
            { key: 'mov', name: 'Incassi / uscite', color: CHART.good },
          ]}>
          <GraficoLiquidita d={d} proiezione={proiezione} />
        </ChartCard>
        <ChartCard index={1} className="cfl__chart" bodyClassName="cfl__mov-body" title="Prossimi movimenti" subtitle="Con il saldo previsto dopo ogni giorno">
          <ProssimiMovimenti d={d} piano={piano} proiezione={proiezione} />
        </ChartCard>
      </div>

      <p className="cfl__fonte">
        <i className="fa-solid fa-circle-info" aria-hidden="true" />
        Dati dimostrativi. In produzione saldi e movimenti arrivano dai conti bancari collegati a Business Central e le date
        di pagamento pianificate qui si registrano nello scadenzario di Business Central.
      </p>

      <ModaleConti d={d} open={aperto === 'conti'} onClose={() => setAperto(null)} />
      <ModaleTermometro d={d} open={aperto === 'termometro'} onClose={() => setAperto(null)} />
      <ModaleIncassi d={d} struttura={struttura} open={aperto === 'incassi'} onClose={() => setAperto(null)} />
      <ModaleUscite d={d} struttura={struttura} piano={piano} open={aperto === 'uscite'} onClose={() => setAperto(null)} />
    </div>
  )
}

const NESSUN_PIANO: Record<string, string> = {}

/** Tooltip standard dei grafici con la data per esteso come intestazione. */
function TipData(p: React.ComponentProps<typeof ChartTooltip>) {
  return <ChartTooltip {...p} title={p.label ? dataLunga(String(p.label)) : undefined} />
}
const segnoPct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`

// ── Termometro ───────────────────────────────────────────────────────────────
const FASCE = [
  { da: 0, a: 25, cls: 'scarso' }, { da: 25, a: 50, cls: 'mediocre' }, { da: 50, a: 62.5, cls: 'sufficiente' },
  { da: 62.5, a: 70, cls: 'buono' }, { da: 70, a: 80, cls: 'campione' }, { da: 80, a: 100, cls: 'ottimo' },
]
function Termometro({ scarto, grande }: { scarto: number; grande?: boolean }) {
  const x = posizioneTermometro(scarto)
  return (
    <svg className={`cfl__term ${grande ? 'cfl__term--grande' : ''}`} viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
      {FASCE.map(f => <rect key={f.cls} x={f.da} y={4} width={f.a - f.da} height={6} className={`cfl__term-fascia cfl__term-fascia--${f.cls}`} />)}
      <rect x={x - 0.6} y={0} width={1.2} height={14} rx={0.6} className="cfl__term-cursore" />
    </svg>
  )
}

// ── Grafico principale ───────────────────────────────────────────────────────
function GraficoLiquidita({ d, proiezione }: { d: DatiCassa; proiezione: ReturnType<typeof proietta> }) {
  const anim = !reducedMotion()
  const dati = useMemo(() => [
    ...d.storico.slice(0, -1).map(s => ({ data: s.data, reale: s.reale, stimata: s.stimata })),
    ...proiezione.map((p, i) => ({
      data: p.data,
      reale: i === 0 ? d.liquidita : undefined,
      stimata: i === 0 ? d.attesa : undefined,
      prevista: p.saldo,
      incassi: p.incassi || undefined,
      uscite: p.uscite ? -p.uscite : undefined,
    })),
  ], [d, proiezione])
  const oggiIso = iso(oggi())
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={dati} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="data" tickFormatter={dataBreve} tick={{ fontSize: 11, fill: CHART.inkMuted }} tickLine={false}
          axisLine={{ stroke: CHART.axis }} minTickGap={28} />
        <YAxis yAxisId="saldo" tickFormatter={fmtAxisNum} tick={{ fontSize: 11, fill: CHART.inkMuted }} tickLine={false} axisLine={false} width={48} />
        <YAxis yAxisId="mov" orientation="right" tickFormatter={fmtAxisNum} tick={{ fontSize: 10, fill: CHART.inkMuted }} tickLine={false} axisLine={false} width={42} />
        <RTooltip content={<TipData names={{ reale: 'Reale', stimata: 'Stimata', prevista: 'Prevista', incassi: 'Incassi', uscite: 'Uscite' }}
          format={v => eur(v)} />} />
        <ReferenceLine yAxisId="saldo" y={d.soglia} stroke={CHART.bad} strokeDasharray="4 4"
          label={{ value: `Soglia di sicurezza ${eur(d.soglia)}`, position: 'insideBottomLeft', fontSize: 10, fill: CHART.bad }} />
        <ReferenceLine yAxisId="saldo" x={oggiIso} stroke={CHART.axis} label={{ value: 'Oggi', position: 'insideTopRight', fontSize: 10, fill: CHART.inkMuted }} />
        <Bar yAxisId="mov" dataKey="incassi" fill={CHART.good} opacity={0.55} barSize={4} isAnimationActive={anim} />
        <Bar yAxisId="mov" dataKey="uscite" fill={CHART.bad} opacity={0.45} barSize={4} isAnimationActive={anim} />
        <Line yAxisId="saldo" dataKey="stimata" stroke={CHART.ly} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={anim} connectNulls />
        <Line yAxisId="saldo" dataKey="reale" stroke={series(0)} strokeWidth={2.5} dot={false} isAnimationActive={anim} connectNulls />
        <Line yAxisId="saldo" dataKey="prevista" stroke={CHART.forecast} strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive={anim} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function ProssimiMovimenti({ d, piano, proiezione }: { d: DatiCassa; piano: Record<string, string>; proiezione: ReturnType<typeof proietta> }) {
  const oggiIso = iso(oggi())
  const saldoDel = new Map(proiezione.map(p => [p.data, p.saldo]))
  const mov = [
    ...d.incassi.filter(i => i.stato !== 'incassato').map(i => ({ id: i.id, data: dataIncasso(i, oggiIso), nome: i.cliente, det: i.descrizione, importo: i.importo, ritardo: i.stato === 'in-ritardo' })),
    ...d.uscite.map(u => ({ id: u.id, data: piano[u.id] ?? u.scadenza, nome: u.fornitore, det: u.descrizione, importo: -u.importo, ritardo: false })),
  ].sort((a, b) => a.data.localeCompare(b.data) || b.importo - a.importo).slice(0, 9)
  return (
    <ul className="cfl__mov">
      {mov.map((m, i) => {
        const ultimoDelGiorno = mov[i + 1]?.data !== m.data
        return (
          <li key={m.id} className="cfl__mov-riga">
            <span className="cfl__mov-data">{dataBreve(m.data)}</span>
            <i className={`fa-solid ${m.importo > 0 ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} cfl__mov-ico ${m.importo > 0 ? 'cfl__in' : 'cfl__out'}`} aria-hidden="true" />
            <span className="cfl__mov-nome">
              <TruncatedText text={m.nome} />
              <TruncatedText text={m.ritardo ? 'In ritardo: atteso dopo il sollecito' : m.det} className={`cfl__mov-det ${m.ritardo ? 'cfl__out' : ''}`} />
            </span>
            <span className={`cfl__mov-imp ${m.importo > 0 ? 'cfl__in' : 'cfl__out'}`}>{m.importo > 0 ? '+' : '−'}{eur(Math.abs(m.importo))}</span>
            <span className="cfl__mov-saldo">{ultimoDelGiorno ? eur(saldoDel.get(m.data) ?? 0) : ''}</span>
          </li>
        )
      })}
    </ul>
  )
}

// ── 1 · Conti ────────────────────────────────────────────────────────────────
function ModaleConti({ d, open, onClose }: { d: DatiCassa; open: boolean; onClose: () => void }) {
  const dati = useMemo(() => d.storico.map((s, i) => {
    const r: Record<string, number | string> = { data: s.data }
    d.conti.forEach(c => { r[c.id] = c.storico[i] })
    return r
  }), [d])
  const max = Math.max(...d.conti.map(c => c.saldo))
  return (
    <Modal open={open} onClose={onClose} title="Liquidità effettiva per conto" size="lg" className="cfl-scuro">
      <div className="cfl-scuro__tot">
        <span className="cfl-scuro__tot-val">{eurPieno(d.liquidita)}</span>
        <span className="cfl-scuro__tot-sub">al {dataLunga(iso(oggi()))} · {d.conti.length} conti collegati</span>
      </div>
      <div className="cfl-scuro__grafico">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dati} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="data" tickFormatter={dataBreve} tick={{ fontSize: 10, fill: 'currentColor' }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tickFormatter={fmtAxisNum} tick={{ fontSize: 10, fill: 'currentColor' }} tickLine={false} axisLine={false} width={44} />
            <RTooltip content={<TipData names={Object.fromEntries(d.conti.map(c => [c.id, c.banca]))} format={v => eur(v)} />} />
            {d.conti.map((c, i) => (
              <Area key={c.id} dataKey={c.id} stackId="1" stroke={series(i)} fill={series(i)} fillOpacity={0.55} isAnimationActive={!reducedMotion()} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="cfl-scuro__conti">
        {d.conti.map((c, i) => (
          <li key={c.id} className="cfl-scuro__conto">
            <span className={`cfl__dot cfl__dot--${i}`} aria-hidden="true" />
            <span className="cfl-scuro__banca">
              <TruncatedText text={c.banca} />
              <span className="cfl-scuro__iban">{c.iban}</span>
            </span>
            <svg className="cfl-scuro__barra" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
              <rect x={0} y={0} width={100} height={6} rx={3} className="cfl-scuro__barra-fondo" />
              <rect x={0} y={0} width={(c.saldo / max) * 100} height={6} rx={3} className={`cfl-scuro__barra-val cfl-scuro__barra-val--${i}`} />
            </svg>
            <span className="cfl-scuro__saldo">{eurPieno(c.saldo)}</span>
            <span className="cfl-scuro__quota">{Math.round((c.saldo / d.liquidita) * 100)}%</span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

// ── 2 · Termometro ───────────────────────────────────────────────────────────
function ModaleTermometro({ d, open, onClose }: { d: DatiCassa; open: boolean; onClose: () => void }) {
  const l = livelloTermometro(d.liquidita, d.attesa)
  const ETICHETTE: Record<string, string> = {
    'incasso-mancato': 'Incasso mancato', 'incasso-extra': 'Incasso non previsto',
    'uscita-imprevista': 'Uscita imprevista', 'uscita-anticipata': 'Uscita anticipata',
  }
  return (
    <Modal open={open} onClose={onClose} title="Termometro delle aspettative" size="lg">
      <div className={`cfl-term cfl-term--${l.chiave}`}>
        <div className="cfl-term__testa">
          <span className="cfl-term__livello"><i className={`fa-solid ${l.icona}`} aria-hidden="true" />{l.nome}</span>
          <span className="cfl-term__frase">{l.frase}</span>
        </div>
        <Termometro scarto={l.scarto} grande />
        <div className="cfl-term__scala" aria-hidden="true">
          <span>Scarso</span><span>Mediocre</span><span>Sufficiente</span><span>Buono</span><span>In linea</span><span>Sopra</span>
        </div>
        <p className="cfl-term__spiega">
          Il sistema stimava per oggi <strong>{eurPieno(d.attesa)}</strong> in cassa, in base agli incassi attesi dalle
          abitudini dei clienti e alle uscite pianificate. Sui conti ci sono <strong>{eurPieno(d.liquidita)}</strong> ({segnoPct(l.scarto)}).
          Ecco cosa ha spostato la cassa rispetto alla stima:
        </p>
        <table className="sib-table cfl__tab">
          <colgroup><col className="cfl__t-data" /><col className="cfl__t-tipo" /><col /><col className="cfl__t-imp" /></colgroup>
          <thead><tr><th>Data</th><th>Tipo</th><th>Movimento</th><th className="cfl__num">Effetto</th></tr></thead>
          <tbody>
            <tr className="cfl__riga-tot"><td>—</td><td>Stima</td><td>Liquidità stimata per oggi</td><td className="cfl__num">{eurPieno(d.attesa)}</td></tr>
            {d.scostamenti.map(s => (
              <tr key={s.id}>
                <td>{dataBreve(s.data)}</td>
                <td><TruncatedText text={ETICHETTE[s.tipo]} /></td>
                <td><TruncatedText text={s.descrizione} /></td>
                <td className={`cfl__num ${s.effetto < 0 ? 'cfl__out' : 'cfl__in'}`}>{s.effetto > 0 ? '+' : '−'}{eurPieno(Math.abs(s.effetto))}</td>
              </tr>
            ))}
            <tr className="cfl__riga-tot"><td>Oggi</td><td>Reale</td><td>Liquidità sui conti</td><td className="cfl__num">{eurPieno(d.liquidita)}</td></tr>
          </tbody>
        </table>
        <p className="cfl-term__nota">
          Ogni scostamento affina le stime successive: il ritardo medio e la puntualità dei clienti si aggiornano con gli incassi reali.
        </p>
      </div>
    </Modal>
  )
}

// ── 3 · Incassi ──────────────────────────────────────────────────────────────
function ModaleIncassi({ d, struttura, open, onClose }: { d: DatiCassa; struttura: string; open: boolean; onClose: () => void }) {
  const [oriz, setOriz] = useState<Orizzonte>('30')
  const solleciti = useCashflowStore(s => s.solleciti)
  const sollecita = useCashflowStore(s => s.sollecita)
  const oggiIso = iso(oggi())
  const limite = iso(piuGiorni(oggi(), Number(oriz)))
  const righe = d.incassi
    .filter(i => i.stato === 'in-ritardo' || (i.stato === 'atteso' && dataIncasso(i, oggiIso) <= limite))
    .sort((a, b) => (a.stato === 'in-ritardo' ? -1 : 0) - (b.stato === 'in-ritardo' ? -1 : 0) || dataIncasso(a, oggiIso).localeCompare(dataIncasso(b, oggiIso)))
  const tot = righe.reduce((a, i) => a + i.importo, 0)

  const invia = (i: Incasso) => {
    sollecita({ incassoId: i.id, struttura, cliente: i.cliente, importo: i.importo, scadenza: i.scadenza })
    toast.success(`${i.cliente} riceverà la notifica del pagamento atteso su Platform.`, 'Sollecito inviato')
  }

  return (
    <Modal open={open} onClose={onClose} title="Stima degli incassi" size="xl">
      <div className="cfl-mod">
        <div className="cfl-mod__barra">
          <VistaSwitch value={oriz} options={ORIZZONTI} onChange={setOriz} ariaLabel="Orizzonte" />
          <span className="cfl-mod__tot">Attesi nel periodo: <strong className="cfl__in">+{eurPieno(tot)}</strong></span>
        </div>
        <table className="sib-table cfl__tab">
          <colgroup>
            <col className="cfl__i-nome" /><col className="cfl__i-data" /><col className="cfl__i-stima" />
            <col className="cfl__i-pct" /><col className="cfl__i-imp" /><col className="cfl__i-stato" /><col className="cfl__i-az" />
          </colgroup>
          <thead><tr>
            <th>Cliente</th>
            <th><TruncatedText text="Scad." full="Scadenza da contratto" /></th>
            <th><TruncatedText text="Stimato" full="Data di incasso stimata" /></th>
            <th className="cfl__num"><TruncatedText text="Puntual." full="Puntualità negli ultimi 12 mesi" /></th>
            <th className="cfl__num">Importo</th><th>Stato</th><th>Azione</th>
          </tr></thead>
          <tbody>
            {righe.map(i => {
              const s = solleciti.find(x => x.incassoId === i.id)
              const giorni = giorniTra(i.scadenza, oggiIso)
              return (
                <tr key={i.id}>
                  <td>
                    <span className="cfl__cella2">
                      <TruncatedText text={i.cliente} className="cfl__forte" />
                      <TruncatedText text={`${i.tipo} · ${i.descrizione.toLowerCase()} · ${i.ricorrenza}`} className="cfl__tenue" />
                    </span>
                  </td>
                  <td>{dataBreve(i.scadenza)}</td>
                  <td>
                    <span className="cfl__cella2">
                      <span>{dataBreve(dataIncasso(i, oggiIso))}</span>
                      <TruncatedText text={i.ritardoMedio ? `in media +${i.ritardoMedio} gg` : 'puntuale'} full={i.ritardoMedio ? `Paga in media ${i.ritardoMedio} giorni dopo la scadenza` : 'Paga alla scadenza'} className="cfl__tenue" />
                    </span>
                  </td>
                  <td className="cfl__num">{Math.round(i.puntualita * 100)}%</td>
                  <td className="cfl__num cfl__forte">{eurPieno(i.importo)}</td>
                  <td>
                    {i.stato === 'in-ritardo'
                      ? <span className="cfl__stato cfl__out"><span className="cfl__pallino cfl__pallino--out" />In ritardo di {giorni} gg</span>
                      : <span className="cfl__stato"><span className="cfl__pallino" />Atteso</span>}
                  </td>
                  <td>
                    {i.stato === 'in-ritardo' && (s
                      ? <Tooltip text={`Sollecito inviato il ${new Date(s.inviatoIl).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}`}>
                          <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm cfl__az" onClick={() => invia(i)}>
                            <i className="fa-solid fa-bell" aria-hidden="true" /> Di nuovo
                          </button>
                        </Tooltip>
                      : <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm cfl__az" onClick={() => invia(i)}>
                          <i className="fa-solid fa-bell" aria-hidden="true" /> Sollecita
                        </button>)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="cfl-mod__nota">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          La data stimata tiene conto del ritardo medio di ogni cliente negli ultimi 12 mesi. Il sollecito arriva al cliente come
          notifica su Platform e resta nel Centro notifiche.
        </p>
      </div>
    </Modal>
  )
}

// ── 4 · Uscite ───────────────────────────────────────────────────────────────
function ModaleUscite({ d, struttura, piano, open, onClose }: {
  d: DatiCassa; struttura: string; piano: Record<string, string>; open: boolean; onClose: () => void
}) {
  const [oriz, setOriz] = useState<Orizzonte>('30')
  const pianifica = useCashflowStore(s => s.pianifica)
  const applicaPiano = useCashflowStore(s => s.applicaPiano)
  const ripristina = useCashflowStore(s => s.ripristina)
  const oggiIso = iso(oggi())
  const giorni = Number(oriz)
  const limite = iso(piuGiorni(oggi(), giorni))
  const quando = (u: Uscita) => piano[u.id] ?? u.scadenza
  const righe = d.uscite.filter(u => quando(u) <= limite || u.scadenza <= limite).sort((a, b) => quando(a).localeCompare(quando(b)))
  const tot = righe.reduce((a, u) => a + u.importo, 0)

  // Uscite per giorno: alla scadenza vs con il piano
  const giornaliere = useMemo(() => Array.from({ length: giorni + 1 }, (_, g) => {
    const giorno = iso(piuGiorni(oggi(), g))
    return {
      data: giorno,
      scadenza: d.uscite.filter(u => u.scadenza === giorno).reduce((a, u) => a + u.importo, 0),
      piano: d.uscite.filter(u => quando(u) === giorno).reduce((a, u) => a + u.importo, 0),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [d, piano, giorni])
  const piccoPiano = Math.max(...giornaliere.map(g => g.piano))
  const piccoScad = Math.max(...giornaliere.map(g => g.scadenza))
  const minimo = proietta(d, piano, giorni).reduce((m, p) => Math.min(m, p.saldo), Infinity)
  const spostate = Object.keys(piano).length

  return (
    <Modal open={open} onClose={onClose} title="Pianificazione uscite" size="xl">
      <div className="cfl-mod">
        <div className="cfl-mod__barra">
          <VistaSwitch value={oriz} options={ORIZZONTI} onChange={setOriz} ariaLabel="Orizzonte" />
          <span className="cfl-mod__azioni">
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => {
              applicaPiano(struttura, distribuisci(d, giorni))
              toast.success('I pagamenti spostabili sono distribuiti fra oggi e la scadenza per abbassare i picchi.', 'Piano proposto')
            }}>
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Distribuisci in modo uniforme
            </button>
            <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" disabled={!spostate} onClick={() => ripristina(struttura)}>
              <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Tutto alla scadenza
            </button>
          </span>
        </div>

        <div className="cfl-mod__sintesi">
          <div className="cfl-mod__mini">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={giornaliere} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="data" tickFormatter={dataBreve} tick={{ fontSize: 10, fill: CHART.inkMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} minTickGap={24} />
                <YAxis tickFormatter={fmtAxisNum} tick={{ fontSize: 10, fill: CHART.inkMuted }} tickLine={false} axisLine={false} width={40} />
                <RTooltip content={<TipData names={{ scadenza: 'Alla scadenza', piano: 'Con il piano' }} format={v => eur(v)} />} />
                <Bar dataKey="scadenza" fill={CHART.ly} barSize={6} isAnimationActive={false} />
                <Bar dataKey="piano" fill={series(0)} barSize={6} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <dl className="cfl-mod__kpi">
            <div><dt>Uscite nel periodo</dt><dd className="cfl__out">−{eur(tot)}</dd></div>
            <div><dt>Picco giornaliero</dt><dd>{eur(piccoPiano)}{piccoPiano < piccoScad && <span className="cfl__in cfl-mod__meglio"> (era {eur(piccoScad)})</span>}</dd></div>
            <div><dt>Liquidità minima prevista</dt><dd className={minimo < d.soglia ? 'cfl__out' : ''}>{eur(minimo)}</dd></div>
            <div><dt>Pagamenti spostati</dt><dd>{spostate}</dd></div>
          </dl>
        </div>

        <table className="sib-table cfl__tab">
          <colgroup>
            <col className="cfl__c-nome" /><col className="cfl__c-fatt" /><col className="cfl__c-data" />
            <col className="cfl__c-imp" /><col className="cfl__c-quando" /><col className="cfl__c-az" />
          </colgroup>
          <thead><tr>
            <th>Fornitore</th><th>Fattura</th><th>Scadenza</th><th className="cfl__num">Importo</th><th>Data di uscita</th><th>Azione</th>
          </tr></thead>
          <tbody>
            {righe.map(u => {
              const q = quando(u)
              return (
                <tr key={u.id} className={q !== u.scadenza ? 'cfl__riga-spostata' : ''}>
                  <td>
                    <span className="cfl__cella2">
                      <TruncatedText text={u.fornitore} className="cfl__forte" />
                      <TruncatedText text={`${u.categoria} · ${u.descrizione}`} className="cfl__tenue" />
                    </span>
                  </td>
                  <td><TruncatedText text={u.fattura} /></td>
                  <td>{dataBreve(u.scadenza)}</td>
                  <td className="cfl__num cfl__forte">{eurPieno(u.importo)}</td>
                  <td>
                    {u.spostabile
                      ? <DatePickerField name={`cfl-${u.id}`} value={q} min={oggiIso} max={u.scadenza} className="cfl__data"
                          onChange={e => e.target.value && pianifica(struttura, u.id, e.target.value === u.scadenza ? null : e.target.value)} />
                      : <Tooltip text="Data obbligata: non si può spostare">
                          <span className="cfl__bloccata"><i className="fa-solid fa-lock" aria-hidden="true" />{dataBreve(u.scadenza)}</span>
                        </Tooltip>}
                  </td>
                  <td>
                    {u.spostabile && q !== oggiIso && (
                      <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm cfl__az" onClick={() => pianifica(struttura, u.id, oggiIso)}>
                        <i className="fa-solid fa-bolt" aria-hidden="true" /> Paga ora
                      </button>
                    )}
                    {u.spostabile && q !== u.scadenza && (
                      <Tooltip text="Riporta alla scadenza">
                        <button type="button" className="sib-btn sib-btn--icon cfl__az-ico" aria-label="Riporta alla scadenza" onClick={() => pianifica(struttura, u.id, null)}>
                          <i className="fa-solid fa-rotate-left" />
                        </button>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="cfl-mod__nota">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          Ogni pagamento si può anticipare fino a oggi o lasciare alla scadenza: la previsione della liquidità si aggiorna subito.
          In produzione le date pianificate si registrano nello scadenzario di Business Central.
        </p>
      </div>
    </Modal>
  )
}

