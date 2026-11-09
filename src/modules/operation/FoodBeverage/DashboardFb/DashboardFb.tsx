// ─── Dashboard F&B ────────────────────────────────────────────────────────────
//  Il servizio letto come business, con il margine al centro:
//    • fascia indicatori: incasso, margine lordo e la sua incidenza, margine per
//      coperto, RevPASH
//    • "Tavolo d'oro": il tavolo che ha marginato di più, in primo piano
//    • mappa dei margini: la planimetria delle sale con ogni tavolo colorato per
//      il margine che ha prodotto (scala sequenziale, un solo colore)
//    • classifica dei tavoli (margine + materia prima = incasso del tavolo)
//    • andamento cumulato di incasso e margine durante il servizio (un solo asse)
//    • piatti che lasciano più margine
//
//  Margine = conti dei tavoli meno il food cost delle schede tecniche dei piatti.
//  I numeri arrivano dallo stato operativo della sezione: è la stessa giornata
//  di Sala ristorante, riletta in chiave di redditività.
import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import {
  ANIM, BiPage, ChartCard, ChartTooltip, KpiTile, CHART, cursorProps, reducedMotion, useCountUp,
  fmtEur, fmtEurK, fmtInt, fmtPct, gridProps, series, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { useFbStore, totaleConto, totaleRiga, SALE } from '../../../../store/useFbStore'
import { CATEGORIE_MENU, VOCI_MENU, type Comanda } from '../fb.model'
import './DashboardFb.sass'
import TabletShell from '../tablet/TabletShell'
import { useIsTablet } from '../GestioneComanda/useIsTablet'

const ORE = ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '00']


interface MargineTavolo {
  id: number
  numero: string
  salaId: number
  sala: string
  ricavo: number
  costo: number
  margine: number
  /** Margine sul ricavo del tavolo, in %. */
  perc: number
  coperti: number
  conti: number
  cameriere: string
  piattoTop: string
}

/** Su tablet la pagina va a tutto schermo nella cornice tablet; su desktop resta com'è. */
export default function DashboardFb({ navigate }: { navigate?: (p: string) => void }) {
  const tablet = useIsTablet()
  return tablet
    ? <TabletShell pagina="fb-dashboard" titolo="Dashboard F&B" navigate={navigate}><DashboardFbDesktop navigate={navigate} /></TabletShell>
    : <DashboardFbDesktop navigate={navigate} />
}

function DashboardFbDesktop({ navigate }: { navigate?: (p: string) => void }) {
  const OUTLETS = useFbStore(s => s.outlets)
  const TURNI   = useFbStore(s => s.turni)
  const contesto     = useFbStore(s => s.contesto)
  const setContesto  = useFbStore(s => s.setContesto)
  const comande      = useFbStore(s => s.comande)
  const tavoli       = useFbStore(s => s.tavoli)
  const ricette      = useFbStore(s => s.ricette)
  const ingredienti  = useFbStore(s => s.ingredienti)
  const [dataAt, setDataAt] = useState(() => new Date())

  const { outletId, data } = contesto
  const saleOutlet = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId, OUTLETS])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId, TURNI])
  const idSale = useMemo(() => saleOutlet.map(s => s.id), [saleOutlet])

  // Food cost dalle stesse schede tecniche di "Food cost e margini" (anche quelle corrette a mano).
  const foodCostDi = useMemo(() => {
    const costi = new Map(ingredienti.map(i => [i.id, i.costo]))
    const cache = new Map<number, number>()
    return (voceId: number) => {
      if (!cache.has(voceId)) cache.set(voceId, (ricette[voceId] ?? []).reduce((a, r) => a + (costi.get(r.ingredienteId) ?? 0) * r.qta, 0))
      return cache.get(voceId)!
    }
  }, [ricette, ingredienti])
  /** Materia prima di un conto: food cost delle schede tecniche × quantità servite. */
  const costoConto = useMemo(() => (c: Comanda) => c.righe.reduce((a, r) => a + foodCostDi(r.voceId) * r.qta, 0), [foodCostDi])

  const delGiorno = useMemo(() => comande.filter(c => idSale.includes(c.salaId)), [comande, idSale])
  const tavoliOutlet = useMemo(() => tavoli.filter(t => idSale.includes(t.salaId)), [tavoli, idSale])

  // ── Indicatori ─────────────────────────────────────────────────────────────
  const incasso = delGiorno.reduce((a, c) => a + totaleConto(c), 0)
  const costo   = delGiorno.reduce((a, c) => a + costoConto(c), 0)
  const margine = incasso - costo
  const marginePerc = incasso ? (margine / incasso) * 100 : 0
  const coperti = delGiorno.reduce((a, c) => a + c.coperti, 0)
  const margineCoperto = coperti ? margine / coperti : 0
  const postiSala = saleOutlet.reduce((a, s) => a + s.capienzaMax, 0)
  const oreServizio = useMemo(() => {
    if (!turniOutlet.length) return 1
    const min = Math.min(...turniOutlet.map(t => +t.oraInizio.slice(0, 2)))
    const max = Math.max(...turniOutlet.map(t => +t.oraFine.slice(0, 2) || 24))
    return Math.max(1, max - min)
  }, [turniOutlet])
  const revpash = postiSala ? incasso / (postiSala * oreServizio) : 0

  // ── Margine per tavolo ─────────────────────────────────────────────────────
  const perTavolo = useMemo<MargineTavolo[]>(() => tavoliOutlet.map(t => {
    const conti = delGiorno.filter(c => c.tavoloId === t.id)
    const ricavo = conti.reduce((a, c) => a + totaleConto(c), 0)
    const cst = conti.reduce((a, c) => a + costoConto(c), 0)
    const piatti = new Map<string, number>()
    conti.forEach(c => c.righe.forEach(r => {
      const v = VOCI_MENU.find(x => x.id === r.voceId)
      if (v && v.reparto !== 'cantina') piatti.set(r.nome, (piatti.get(r.nome) ?? 0) + totaleRiga(r))
    }))
    const piattoTop = Array.from(piatti.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    return {
      id: t.id, numero: t.numero, salaId: t.salaId,
      sala: SALE.find(s => s.id === t.salaId)?.nome ?? '',
      ricavo, costo: cst, margine: ricavo - cst, perc: ricavo ? ((ricavo - cst) / ricavo) * 100 : 0,
      coperti: conti.reduce((a, c) => a + c.coperti, 0), conti: conti.length,
      cameriere: conti[0]?.cameriere ?? t.cameriere ?? '—', piattoTop,
    }
  }), [tavoliOutlet, delGiorno, costoConto])

  const classifica = useMemo(() => perTavolo.filter(t => t.conti > 0).sort((a, b) => b.margine - a.margine), [perTavolo])
  const oro = classifica[0]
  const maxMargine = oro?.margine ?? 0

  // ── Andamento cumulato: incasso e margine maturati ora per ora ─────────────
  const perOra = useMemo(() => {
    const m = new Map<string, { incasso: number; margine: number }>()
    ORE.forEach(o => m.set(o, { incasso: 0, margine: 0 }))
    delGiorno.forEach(c => {
      const v = m.get(c.apertaAlle.slice(0, 2))
      if (v) { const tot = totaleConto(c); v.incasso += tot; v.margine += tot - costoConto(c) }
    })
    const righe = ORE.map(o => ({ ora: `${o}:00`, ...m.get(o)! }))
    const primo = righe.findIndex(r => r.incasso)
    const ultimo = righe.length - 1 - [...righe].reverse().findIndex(r => r.incasso)
    const finestra = primo < 0 ? righe.slice(5, 16) : righe.slice(Math.max(0, primo - 1), Math.min(righe.length, ultimo + 2))
    let inc = 0, mar = 0
    return finestra.map(r => { inc += r.incasso; mar += r.margine; return { ora: r.ora, Incasso: inc, Margine: mar } })
  }, [delGiorno, costoConto])

  // ── Piatti che lasciano più margine ────────────────────────────────────────
  const topPiatti = useMemo(() => {
    const m = new Map<number, { nome: string; margine: number; ricavo: number; qta: number; categoria: string }>()
    delGiorno.forEach(c => c.righe.forEach(r => {
      const voce = VOCI_MENU.find(v => v.id === r.voceId)
      const cat = CATEGORIE_MENU.find(x => x.id === voce?.categoriaId)
      const v = m.get(r.voceId) ?? { nome: r.nome, margine: 0, ricavo: 0, qta: 0, categoria: cat?.nome ?? '' }
      const ric = totaleRiga(r)
      v.ricavo += ric
      v.margine += ric - foodCostDi(r.voceId) * r.qta
      v.qta += r.qta
      m.set(r.voceId, v)
    }))
    return Array.from(m.values()).sort((a, b) => b.margine - a.margine).slice(0, 5)
  }, [delGiorno, foodCostDi])

  const datiClassifica = useMemo(
    () => classifica.slice(0, 8).map(t => ({ tavolo: t.numero, Margine: t.margine, 'Materia prima': t.costo })),
    [classifica],
  )

  return (
    <BiPage
      title="Dashboard F&B"
      subtitle="Il servizio della giornata letto in margine: chi rende di più, dove e con cosa"
      glossary={['margineLordo', 'foodCost', 'marginePerCoperto', 'RevPASH', 'scontrinoMedio']}
      dataAt={dataAt}
      onRefresh={() => setDataAt(new Date())}
      gridClassName="fbdash__grid"
      className="fbdash"
      toolbar={
        <>
          <SelectField
            name="outlet" label="Outlet" className="fbdash__filter fbdash__filter--wide"
            value={outletId}
            options={OUTLETS.map(o => ({ value: o.id, label: o.nome }))}
            onChange={e => {
              const id = +e.target.value
              setContesto({ outletId: id, salaId: SALE.find(s => s.outletId === id)?.id ?? contesto.salaId })
            }}
          />
          <SelectField
            name="data" label="Giornata" className="fbdash__filter"
            value={data}
            options={[{ value: data, label: new Date(data + 'T12:00:00').toLocaleDateString('it-IT') }]}
            onChange={() => undefined}
          />
          <button type="button" className="fbdash__link" onClick={() => navigate?.('sala-ristorante')}>
            <i className="fa-solid fa-utensils" aria-hidden="true" /> Vai in sala
          </button>
        </>
      }
    >
      <div className="fbdash__kpis">
        <KpiTile
          label="Margine lordo" value={margine} format={fmtEur} slot={0} index={0}
          icon="fa-sack-dollar" info="Incasso dei conti meno il food cost dei piatti serviti."
        />
        <KpiTile
          label="Margine sul ricavo" value={marginePerc} format={fmtPct} slot={4} index={1}
          icon="fa-percent" info="Quota dell'incasso che resta dopo la materia prima (100% − food cost)."
        />
        <KpiTile
          label="Incasso" value={incasso} format={fmtEur} slot={1} index={2}
          icon="fa-euro-sign" info="Totale dei conti al netto degli sconti di categoria cliente."
        />
        <KpiTile
          label="Margine per coperto" value={margineCoperto} format={fmtEur} slot={3} index={3}
          icon="fa-user-group" info={`${fmtInt(coperti)} coperti serviti nella giornata.`}
        />
        <KpiTile
          label="RevPASH" value={revpash} format={fmtEur} slot={6} index={4}
          icon="fa-gauge-high" info="Ricavo per posto a sedere e per ora di apertura."
        />
      </div>

      <TavoloOro t={oro} quota={margine ? (maxMargine / margine) * 100 : 0} />

      <ChartCard
        className="fbdash__mappa"
        title="Mappa dei margini"
        subtitle="Ogni tavolo colorato per il margine prodotto nella giornata"
        badge={`${classifica.length}/${tavoliOutlet.length} tavoli con conti`}
        index={1}
        footer={
          <div className="fbdash__scala">
            <span>0 €</span>
            <span className="fbdash__scala-barra" aria-hidden="true" />
            <span>{fmtEur(maxMargine)}</span>
            <span className="fbdash__scala-vuoto"><i aria-hidden="true" /> Senza conti</span>
          </div>
        }
      >
        <div className="fbdash__sale">
          {saleOutlet.map(s => (
            <MappaSala
              key={s.id} nome={s.nome}
              tavoli={tavoliOutlet.filter(t => t.salaId === s.id)}
              margini={perTavolo} max={maxMargine} oroId={oro?.id}
              rank={new Map(classifica.map((t, i) => [t.id, i]))}
            />
          ))}
        </div>
      </ChartCard>

      <ChartCard
        className="fbdash__classifica"
        title="Classifica dei tavoli"
        subtitle="Margine + materia prima = incasso"
        legend={[
          { key: 'Margine', name: 'Margine', color: series(0) },
          { key: 'Materia prima', name: 'Materia prima', color: CHART.ly },
        ]}
        index={2}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datiClassifica} layout="vertical" margin={{ top: 2, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid {...gridProps} horizontal={false} />
            <XAxis type="number" {...xAxisProps} tickFormatter={fmtEurK} />
            <YAxis type="category" dataKey="tavolo" {...yAxisProps} width={44} interval={0} />
            <RTooltip content={<ChartTooltip />} cursor={cursorProps} />
            <Bar
              dataKey="Margine" stackId="t" fill={series(0)} maxBarSize={16}
              animationDuration={ANIM.duration} animationEasing={ANIM.easing}
            />
            <Bar
              dataKey="Materia prima" stackId="t" fill={CHART.ly} radius={[0, 4, 4, 0]} maxBarSize={16}
              animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="fbdash__andamento"
        title="Come matura il margine"
        subtitle="Incasso e margine cumulati"
        legend={[
          { key: 'Incasso', name: 'Incasso', color: series(1) },
          { key: 'Margine', name: 'Margine', color: series(0) },
        ]}
        index={3}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={perOra} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
            <defs>
              <linearGradient id="fbdash-inc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series(1)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={series(1)} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fbdash-mar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series(0)} stopOpacity={0.42} />
                <stop offset="100%" stopColor={series(0)} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="ora" {...xAxisProps} />
            <YAxis {...yAxisProps} tickFormatter={fmtEurK} />
            <RTooltip content={<ChartTooltip />} cursor={cursorProps} />
            <Area
              type="monotone" dataKey="Incasso" stroke={series(1)} strokeWidth={2} fill="url(#fbdash-inc)"
              animationDuration={ANIM.duration * 1.4} animationEasing={ANIM.easing}
            />
            <Area
              type="monotone" dataKey="Margine" stroke={series(0)} strokeWidth={2} fill="url(#fbdash-mar)"
              animationBegin={ANIM.begin(2)} animationDuration={ANIM.duration * 1.4} animationEasing={ANIM.easing}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="fbdash__piatti"
        title="Piatti che marginano di più"
        subtitle="Margine portato a casa nella giornata"
        index={4}
      >
        <ul className="fbdash__piatti-list">
          {topPiatti.map((v, i) => (
            <li key={v.nome} style={{ '--w': topPiatti[0].margine ? v.margine / topPiatti[0].margine : 0, '--i': i } as React.CSSProperties}>
              <span className="fbdash__piatti-pos">{i + 1}</span>
              <span className="fbdash__piatti-nome">
                <TruncatedText text={v.nome} />
                <span className="fbdash__piatti-barra" aria-hidden="true"><span /></span>
              </span>
              <span className="fbdash__piatti-perc">{fmtPct(v.ricavo ? (v.margine / v.ricavo) * 100 : 0)}</span>
              <span className="fbdash__piatti-val">{fmtEur(v.margine)}</span>
            </li>
          ))}
          {!topPiatti.length && <li className="fbdash__vuoto">Nessuna consumazione registrata.</li>}
        </ul>
      </ChartCard>
    </BiPage>
  )
}

// ─── Tavolo d'oro ─────────────────────────────────────────────────────────────
//  Il tavolo che ha marginato di più: numero animato, anello del margine sul
//  ricavo del tavolo e il racconto in tre righe (chi l'ha servito, quanti ospiti,
//  cosa ha fatto la differenza).
function TavoloOro({ t, quota }: { t?: MargineTavolo; quota: number }) {
  const valore = useCountUp(t?.margine ?? 0, 1600)
  const perc = useCountUp(t?.perc ?? 0, 1600)
  // L'anello si disegna dopo l'ingresso della card.
  const [pronto, setPronto] = useState(reducedMotion())
  useEffect(() => {
    if (reducedMotion()) return
    const id = window.setTimeout(() => setPronto(true), 350)
    return () => window.clearTimeout(id)
  }, [])

  if (!t) {
    return (
      <section className="fbdash__oro fbdash__oro--vuoto">
        <i className="fa-solid fa-crown" aria-hidden="true" />
        <p>Ancora nessun conto: il tavolo d'oro appare con il primo incasso.</p>
      </section>
    )
  }
  const R = 46
  const circ = 2 * Math.PI * R
  return (
    <section className="fbdash__oro" aria-label={`Tavolo d'oro: tavolo ${t.numero}, margine ${fmtEur(t.margine)}`}>
      <span className="fbdash__oro-luce" aria-hidden="true" />
      <span className="fbdash__oro-scintille" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}
      </span>

      <header className="fbdash__oro-head">
        <span className="fbdash__oro-badge"><i className="fa-solid fa-crown" aria-hidden="true" /> Tavolo d'oro</span>
        <span className="fbdash__oro-quota">{fmtPct(quota)} del margine di giornata</span>
      </header>

      <div className="fbdash__oro-corpo">
        <div className="fbdash__oro-anello">
          <svg viewBox="0 0 110 110" aria-hidden="true">
            <circle className="fbdash__oro-anello-fondo" cx="55" cy="55" r={R} />
            <circle
              className="fbdash__oro-anello-arco" cx="55" cy="55" r={R}
              strokeDasharray={circ}
              strokeDashoffset={pronto ? circ * (1 - Math.min(100, t.perc) / 100) : circ}
            />
          </svg>
          <span className="fbdash__oro-numero">
            <em>Tavolo</em>
            {t.numero}
          </span>
        </div>

        <div className="fbdash__oro-valori">
          <span className="fbdash__oro-lab">Margine lordo</span>
          <strong className="fbdash__oro-valore">{fmtEur(valore)}</strong>
          <span className="fbdash__oro-perc">{fmtPct(perc)} del conto resta al ristorante</span>
        </div>
      </div>

      <dl className="fbdash__oro-dett">
        <div><dt>Sala</dt><dd><TruncatedText text={t.sala} /></dd></div>
        <div><dt>Coperti</dt><dd>{t.coperti} · {fmtEur(t.coperti ? t.margine / t.coperti : 0)} a testa</dd></div>
        <div><dt>Servito da</dt><dd><TruncatedText text={t.cameriere} /></dd></div>
        <div><dt>Ha fatto la differenza</dt><dd><TruncatedText text={t.piattoTop} /></dd></div>
      </dl>
    </section>
  )
}

// ─── Mappa di una sala ────────────────────────────────────────────────────────
//  La stessa geometria di "Sale e tavoli", ridotta: il colore va dal chiaro allo
//  scuro con il margine (scala sequenziale a una tinta); il tavolo d'oro ha la
//  corona. I tavoli entrano in ordine di classifica.
function MappaSala({ nome, tavoli, margini, max, oroId, rank }: {
  nome: string
  tavoli: { id: number; numero: string; gx: number; gy: number; w: number; h: number; forma: string }[]
  margini: MargineTavolo[]
  max: number
  oroId?: number
  rank: Map<number, number>
}) {
  if (!tavoli.length) return null
  const x0 = Math.min(...tavoli.map(t => t.gx)), y0 = Math.min(...tavoli.map(t => t.gy))
  const x1 = Math.max(...tavoli.map(t => t.gx + t.w)), y1 = Math.max(...tavoli.map(t => t.gy + t.h))
  const W = Math.max(1, x1 - x0 + 1), H = Math.max(1, y1 - y0 + 1)
  return (
    <figure className="fbdash__sala">
      <figcaption>{nome}</figcaption>
      <div className="fbdash__sala-pianta" style={{ '--ar': `${W} / ${H}` } as React.CSSProperties}>
        {tavoli.map(t => {
          const m = margini.find(x => x.id === t.id)
          const vuoto = !m || m.conti === 0
          const k = vuoto || !max ? 0 : Math.max(0.08, m!.margine / max)
          const oro = t.id === oroId
          return (
            <Tooltip
              key={t.id}
              content={vuoto
                ? <span>Tavolo {t.numero} · nessun conto</span>
                : (
                  <span className="fbdash__tip">
                    <b>Tavolo {t.numero}{oro ? ' · tavolo d’oro' : ''}</b>
                    <span>Margine {fmtEur(m!.margine)} ({fmtPct(m!.perc)})</span>
                    <span>Incasso {fmtEur(m!.ricavo)} · {m!.coperti} coperti</span>
                  </span>
                )}
            >
              <span
                className={`fbdash__tav fbdash__tav--${t.forma} ${vuoto ? 'is-vuoto' : ''} ${oro ? 'is-oro' : ''} ${k > 0.55 ? 'is-scuro' : ''}`}
                style={{
                  '--x': (t.gx - x0 + 0.5) / W, '--y': (t.gy - y0 + 0.5) / H, '--w': t.w / W, '--h': t.h / H,
                  '--k': k, '--r': rank.get(t.id) ?? 20,
                } as React.CSSProperties}
              >
                {oro && <i className="fa-solid fa-crown fbdash__tav-corona" aria-hidden="true" />}
                <b>{t.numero}</b>
                {!vuoto && <em>{fmtEurK(m!.margine)}</em>}
              </span>
            </Tooltip>
          )
        })}
      </div>
    </figure>
  )
}
