// ─── Dashboard F&B ────────────────────────────────────────────────────────────
//  Il servizio letto come business, non come elenco di comande:
//    • fascia indicatori: coperti serviti, incasso, scontrino medio, occupazione
//      dei coperti e RevPASH del servizio
//    • andamento del servizio ora per ora: coperti serviti e incasso maturato
//    • riempimento dei turni: quanto del venduto disponibile è stato prenotato
//    • incasso per sala e voci che pesano di più sul conto
//
//  I numeri arrivano dallo stato operativo della sezione (comande, prenotazioni,
//  tavoli): è la stessa giornata che si vede in Sala ristorante, riletta.
import React, { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import TruncatedText from '../../../../core/components/TruncatedText'
import {
  ANIM, BiPage, ChartCard, ChartTooltip, KpiTile, cursorProps,
  fmtEur, fmtEurK, fmtInt, fmtPct, gridProps, series, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { useFbStore, totaleConto, totaleRiga, SALE } from '../../../../store/useFbStore'
import { CATEGORIE_MENU, VOCI_MENU } from '../fb.model'
import './DashboardFb.sass'

const ORE = ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']

export default function DashboardFb({ navigate }: { navigate?: (p: string) => void }) {
  const OUTLETS = useFbStore(s => s.outlets)
  const TURNI   = useFbStore(s => s.turni)
  const contesto     = useFbStore(s => s.contesto)
  const setContesto  = useFbStore(s => s.setContesto)
  const comande      = useFbStore(s => s.comande)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const tavoli       = useFbStore(s => s.tavoli)
  const [dataAt, setDataAt] = useState(() => new Date())

  const { outletId, data } = contesto
  const saleOutlet = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId])
  const turniOutlet = useMemo(() => TURNI.filter(t => t.outletId === outletId), [outletId, TURNI])
  const idSale = useMemo(() => saleOutlet.map(s => s.id), [saleOutlet])

  const delGiorno = useMemo(
    () => comande.filter(c => idSale.includes(c.salaId)),
    [comande, idSale],
  )
  const tavoliOutlet = useMemo(() => tavoli.filter(t => idSale.includes(t.salaId)), [tavoli, idSale])
  const prenGiorno = useMemo(
    () => prenotazioni.filter(p => p.data === data && p.outletId === outletId && p.stato !== 'annullata'),
    [prenotazioni, data, outletId],
  )

  // ── Indicatori ─────────────────────────────────────────────────────────────
  const incasso  = delGiorno.reduce((a, c) => a + totaleConto(c), 0)
  const coperti  = delGiorno.reduce((a, c) => a + c.coperti, 0)
  const scontrino = coperti ? incasso / coperti : 0
  const postiSala = saleOutlet.reduce((a, s) => a + s.capienzaMax, 0)
  const occupazione = postiSala ? (coperti / postiSala) * 100 : 0
  /** Ore di apertura dell'outlet, dalla prima all'ultima fascia dei turni. */
  const oreServizio = useMemo(() => {
    if (!turniOutlet.length) return 1
    const min = Math.min(...turniOutlet.map(t => +t.oraInizio.slice(0, 2)))
    const max = Math.max(...turniOutlet.map(t => +t.oraFine.slice(0, 2)))
    return Math.max(1, max - min)
  }, [turniOutlet])
  const revpash = postiSala ? incasso / (postiSala * oreServizio) : 0

  // ── Andamento del servizio ora per ora ─────────────────────────────────────
  //  I coperti seguono l'orario delle prenotazioni, l'incasso l'ora di apertura
  //  della comanda: sono le due curve che il direttore confronta.
  const perOra = useMemo(() => {
    const m = new Map<string, { ora: string; coperti: number; incasso: number }>()
    ORE.forEach(o => m.set(o, { ora: `${o}:00`, coperti: 0, incasso: 0 }))
    prenGiorno.forEach(p => {
      const k = p.ora.slice(0, 2)
      const v = m.get(k); if (v) v.coperti += p.pax
    })
    delGiorno.forEach(c => {
      const k = c.apertaAlle.slice(0, 2)
      const v = m.get(k); if (v) v.incasso += totaleConto(c)
    })
    const righe = Array.from(m.values())
    // Si mostra solo la finestra che ha davvero servizio
    const primo = righe.findIndex(r => r.coperti || r.incasso)
    const ultimo = righe.length - 1 - [...righe].reverse().findIndex(r => r.coperti || r.incasso)
    return primo < 0 ? righe.slice(5, 16) : righe.slice(Math.max(0, primo - 1), Math.min(righe.length, ultimo + 2))
  }, [prenGiorno, delGiorno])

  // ── Riempimento dei turni ──────────────────────────────────────────────────
  const perTurno = useMemo(() => turniOutlet.map(t => {
    const pax = prenGiorno.filter(p => p.turnoId === t.id).reduce((a, p) => a + p.pax, 0)
    return {
      nome: `${t.servizio} · ${t.nome}`,
      prenotati: pax,
      liberi: Math.max(0, t.coperturaMax - pax),
      pieno: t.coperturaMax ? Math.round((pax / t.coperturaMax) * 100) : 0,
    }
  }), [turniOutlet, prenGiorno])

  // ── Incasso per sala ───────────────────────────────────────────────────────
  const perSala = useMemo(() => saleOutlet.map(s => ({
    nome: s.nome,
    incasso: delGiorno.filter(c => c.salaId === s.id).reduce((a, c) => a + totaleConto(c), 0),
    coperti: delGiorno.filter(c => c.salaId === s.id).reduce((a, c) => a + c.coperti, 0),
  })), [saleOutlet, delGiorno])

  // ── Voci che pesano di più ─────────────────────────────────────────────────
  const topVoci = useMemo(() => {
    const m = new Map<number, { nome: string; valore: number; qta: number; categoria: string }>()
    delGiorno.forEach(c => c.righe.forEach(r => {
      const voce = VOCI_MENU.find(v => v.id === r.voceId)
      const cat = CATEGORIE_MENU.find(x => x.id === voce?.categoriaId)
      const v = m.get(r.voceId) ?? { nome: r.nome, valore: 0, qta: 0, categoria: cat?.nome ?? '' }
      v.valore += totaleRiga(r)
      v.qta += r.qta
      m.set(r.voceId, v)
    }))
    return Array.from(m.values()).sort((a, b) => b.valore - a.valore).slice(0, 7)
  }, [delGiorno])

  const occupati = tavoliOutlet.filter(t => ['occupato', 'ordinato', 'conto'].includes(t.stato)).length

  return (
    <BiPage
      title="Dashboard F&B"
      subtitle="Il servizio della giornata: coperti, incasso e riempimento dei turni"
      glossary={['RevPASH', 'scontrinoMedio', 'occupazioneCoperti', 'rotazione', 'noShow']}
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
          label="Coperti serviti" value={coperti} format={fmtInt} slot={0} index={0}
          icon="fa-user-group" info="Somma dei coperti delle comande aperte e chiuse della giornata."
        />
        <KpiTile
          label="Incasso" value={incasso} format={fmtEur} slot={1} index={1}
          icon="fa-euro-sign" info="Totale dei conti al netto degli sconti di categoria cliente."
        />
        <KpiTile
          label="Scontrino medio" value={scontrino} format={fmtEur} slot={2} index={2}
          icon="fa-receipt" info="Incasso diviso i coperti serviti."
        />
        <KpiTile
          label="Occupazione coperti" value={occupazione} format={fmtPct} slot={3} index={3}
          icon="fa-chair" info="Coperti serviti sui posti a sedere dell'outlet."
        />
        <KpiTile
          label="RevPASH" value={revpash} format={fmtEur} slot={4} index={4}
          icon="fa-gauge-high" info="Ricavo per posto a sedere e per ora di apertura."
        />
      </div>

      <ChartCard
        className="fbdash__main"
        title="Andamento del servizio"
        subtitle="Coperti attesi e incasso maturato, ora per ora"
        badge={`${occupati}/${tavoliOutlet.length} tavoli occupati`}
        legend={[
          { key: 'coperti', name: 'Coperti', color: series(0) },
          { key: 'incasso', name: 'Incasso', color: series(1) },
        ]}
        index={0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={perOra} margin={{ top: 6, right: 8, left: -10, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="ora" {...xAxisProps} />
            <YAxis yAxisId="l" {...yAxisProps} tickFormatter={fmtInt} />
            <YAxis yAxisId="r" orientation="right" {...yAxisProps} tickFormatter={fmtEurK} />
            <RTooltip content={<ChartTooltip />} cursor={cursorProps} />
            <Bar
              yAxisId="l" dataKey="coperti" name="Coperti" fill={series(0)}
              radius={[3, 3, 0, 0]} maxBarSize={22}
              animationDuration={ANIM.duration} animationEasing={ANIM.easing}
            />
            <Line
              yAxisId="r" dataKey="incasso" name="Incasso" stroke={series(1)} strokeWidth={2} dot={false}
              animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="fbdash__turni"
        title="Riempimento dei turni"
        subtitle="Prenotato sul venduto disponibile"
        index={1}
      >
        <ul className="fbdash__turni-list">
          {perTurno.map(t => (
            <li key={t.nome}>
              <span className="fbdash__turni-nome"><TruncatedText text={t.nome} /></span>
              <span className="fbdash__turni-barra" style={{ '--pct': Math.min(100, t.pieno) } as React.CSSProperties}>
                <span />
              </span>
              <span className="fbdash__turni-n">{t.prenotati}<em>/{t.prenotati + t.liberi}</em></span>
            </li>
          ))}
          {!perTurno.length && <li className="fbdash__vuoto">Nessun turno configurato.</li>}
        </ul>
      </ChartCard>

      <ChartCard
        className="fbdash__sale"
        title="Incasso per sala"
        subtitle="Dove si è prodotto il valore"
        index={2}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={perSala} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} horizontal={false} />
            <XAxis type="number" {...xAxisProps} tickFormatter={fmtEurK} />
            <YAxis type="category" dataKey="nome" {...yAxisProps} width={110} />
            <RTooltip content={<ChartTooltip />} cursor={cursorProps} />
            <Bar
              dataKey="incasso" name="Incasso" fill={series(1)} radius={[0, 3, 3, 0]} maxBarSize={22}
              animationDuration={ANIM.duration} animationEasing={ANIM.easing}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        className="fbdash__top"
        title="Voci che pesano di più"
        subtitle="Contributo al conto della giornata"
        index={3}
      >
        <ul className="fbdash__top-list">
          {topVoci.map((v, i) => (
            <li key={v.nome}>
              <span className="fbdash__top-pos">{i + 1}</span>
              <span className="fbdash__top-nome">
                <TruncatedText text={v.nome} />
                <em>{v.categoria}</em>
              </span>
              <span className="fbdash__top-qta">{v.qta}×</span>
              <span className="fbdash__top-val">{fmtEur(v.valore)}</span>
            </li>
          ))}
          {!topVoci.length && <li className="fbdash__vuoto">Nessuna consumazione registrata.</li>}
        </ul>
      </ChartCard>
    </BiPage>
  )
}
