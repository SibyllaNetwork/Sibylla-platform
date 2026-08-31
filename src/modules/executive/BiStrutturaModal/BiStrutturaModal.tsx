import React, { useMemo } from 'react'
import clsx from 'clsx'
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import Modal from '../../../core/components/Modal'
import {
  ANIM, BiDataStamp, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDec, fmtEur, fmtEurK, fmtInt, fmtPct,
  gridProps, reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { buildBiStruttura, type BiStrutturaInput } from './biStruttura.data'
import './BiStrutturaModal.sass'

// ─── MODALE BI DELLA STRUTTURA ──────────────────────────────────────────────────
//  Si apre dall'icona BI di ogni riga in "I miei business" e "I miei ristoranti".
//  La tabella dà UN numero per struttura e per giorno: qui quel numero viene
//  messo in contesto — com'è andata nelle due settimane precedenti, com'è fatto
//  il fatturato, e come sta l'anno contro il precedente.
//  Costruita sul kit BI (KpiTile / ChartCard / ChartTooltip / palette --chart-*):
//  la fascia di indicatori in cima è ammessa perché questo è un contesto BI.

export interface BiStrutturaModalProps extends BiStrutturaInput {
  open: boolean
  onClose: () => void
  nome: string
  tipo: string
  /** Contesto aggiuntivo mostrato accanto alla data (es. il servizio scelto). */
  contesto?: string
}

export default function BiStrutturaModal({
  open, onClose, nome, tipo, contesto, ...input
}: BiStrutturaModalProps) {
  const { variante, data, isForecast, ricavi, costi, profitto, perc, coperti = 0, scontrino = 0 } = input

  // La modale è montata solo da aperta: le serie si ricostruiscono al cambio di
  // struttura, data o servizio, non a ogni render della pagina sotto.
  const bi = useMemo(
    () => buildBiStruttura(input),
    [input.variante, input.seed, input.data.getTime(), input.isForecast, input.ricavi, input.costi, input.coperti],
  )

  const still = reducedMotion()
  const isRist = variante === 'ristorante'

  const dataStr = data.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dataStrCap = dataStr.charAt(0).toUpperCase() + dataStr.slice(1)

  const totComposizione = bi.composizione.reduce((s, v) => s + v.valore, 0)
  const tyAnno = bi.mesi.reduce((s, m) => s + m.ty, 0)

  return (
    <Modal open={open} onClose={onClose} title={`Business intelligence · ${nome}`} size="xl" className="bi-struct">
      <div className="bi-struct__body">

        {/* ── Intestazione: di che struttura, di che giorno, con che certezza ── */}
        <div className="bi-struct__meta">
          <span className="bi-struct__tipo">{tipo}</span>
          <span className="bi-struct__data">
            <i className="fa-solid fa-calendar-day" aria-hidden="true" />
            {dataStrCap}
            {contesto && <span className="bi-struct__contesto">· {contesto}</span>}
          </span>
          <span className={clsx('bi-struct__mode', isForecast ? 'bi-struct__mode--forecast' : 'bi-struct__mode--production')}>
            <i className={clsx('fa-solid', isForecast ? 'fa-arrow-trend-up' : 'fa-circle-check')} aria-hidden="true" />
            {isForecast ? 'Forecast' : 'Production'}
          </span>
          <BiDataStamp at={bi.aggiornatoAl} className="bi-struct__stamp" />
        </div>

        {/* ── Indicatori del giorno ──────────────────────────────────────────── */}
        <div className="bi-struct__kpis">
          {isRist && (
            <KpiTile
              label="Coperti" icon="fa-chair" slot={6} index={0}
              value={coperti} format={fmtInt}
              delta={bi.deltaCoperti} deltaLabel={`${fmtPct(bi.deltaCoperti)} su 7 gg prec.`}
              spark={bi.sparkCoperti}
              info="Coperti serviti nella giornata e nel servizio selezionati, confrontati con la media dei sette giorni precedenti."
            />
          )}
          <KpiTile
            label="Ricavi" icon="fa-euro-sign" slot={0} index={isRist ? 1 : 0}
            value={ricavi} format={(n) => fmtEurK(n)}
            delta={bi.deltaRicavi} deltaLabel={`${fmtPct(bi.deltaRicavi)} su 7 gg prec.`}
            spark={bi.sparkRicavi}
            info={`Ricavi ${isForecast ? 'attesi' : 'a consuntivo'} della giornata. La variazione confronta gli ultimi sette giorni con i sette precedenti.`}
          />
          {isRist ? (
            <KpiTile
              label="Scontrino medio" icon="fa-receipt" slot={3} index={2}
              value={scontrino} format={(n) => fmtEur(n)}
              delta={bi.deltaScontrino} deltaLabel={`${fmtPct(bi.deltaScontrino)} su 7 gg prec.`}
              spark={bi.sparkScontrino}
              info="Ricavi divisi per i coperti: quanto vale mediamente ogni ospite servito."
            />
          ) : (
            <KpiTile
              label="Costi" icon="fa-arrow-trend-down" slot={3} index={1}
              value={costi} format={(n) => fmtEurK(n)}
              delta={bi.deltaCosti} deltaLabel={`${fmtPct(bi.deltaCosti)} su 7 gg prec.`}
              invertDelta
              spark={bi.sparkCosti}
              info="Costi diretti attribuiti alla giornata: su questa metrica salire è un peggioramento, e il badge lo legge al contrario."
            />
          )}
          <KpiTile
            label="Profitto" icon="fa-sack-dollar" slot={4} index={isRist ? 3 : 2}
            value={profitto} format={(n) => fmtEurK(n)}
            delta={bi.deltaProfitto} deltaLabel={`${fmtPct(bi.deltaProfitto)} su 7 gg prec.`}
            spark={bi.sparkProfitto}
            info="Ricavi meno costi diretti della giornata."
          />
          <KpiTile
            label="Margine" icon="fa-percent" slot={1} index={isRist ? 4 : 3}
            value={perc} format={(n) => fmtPct(n)}
            delta={bi.deltaMargine} deltaLabel={`${fmtDec(bi.deltaMargine)} pt su 7 gg prec.`}
            spark={bi.sparkMargine}
            info="Quota di ricavo che resta come profitto. La variazione è in punti percentuali, non in percentuale sul valore."
          />
        </div>

        {/* ── Griglia dei grafici ────────────────────────────────────────────── */}
        <div className="bi-struct__grid">

          {/* Ricavi e costi degli ultimi 14 giorni: un solo asse dei valori */}
          <ChartCard
            title="Ricavi e costi · ultimi 14 giorni"
            subtitle="Barre: ricavi del giorno. Linea: costi diretti."
            index={0}
            className="bi-struct__card bi-struct__card--trend"
            legend={[
              { key: 'ricavi', name: 'Ricavi', color: series(0) },
              { key: 'costi', name: 'Costi', color: series(3) },
            ]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={bi.giorni} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ ricavi: 'Ricavi', costi: 'Costi' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="ricavi" name="Ricavi" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={22}
                  isAnimationActive={!still} animationDuration={ANIM.duration}
                />
                <Line
                  type="monotone" dataKey="costi" name="Costi" stroke={series(3)} strokeWidth={2} dot={false}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationBegin={ANIM.begin(1)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Di che cosa è fatto il fatturato del giorno */}
          <ChartCard
            title="Composizione dei ricavi"
            subtitle={`${fmtEurK(totComposizione)} del ${data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}
            index={1}
            className="bi-struct__card bi-struct__card--mix"
            legend={bi.composizione.map((v, i) => ({
              key: v.label, name: v.label, color: series(i), value: fmtPct(v.quota, 0),
            }))}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bi.composizione} dataKey="valore" nameKey="label"
                  innerRadius="58%" outerRadius="86%" paddingAngle={2} stroke="none"
                  isAnimationActive={!still} animationDuration={ANIM.duration}
                >
                  {bi.composizione.map((v, i) => <Cell key={v.label} fill={series(i)} />)}
                </Pie>
                <RTooltip content={<ChartTooltip format={(v) => fmtEur(v, 0)} />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* L'anno contro il precedente: il giorno da solo non dice la direzione */}
          <ChartCard
            title="Ricavi · 12 mesi contro anno precedente"
            subtitle="Andamento mensile della struttura"
            badge={<DeltaBadge value={bi.deltaAnno} label={`${fmtPct(bi.deltaAnno)} vs LY`} size="sm" />}
            index={2}
            className="bi-struct__card bi-struct__card--anno"
            legend={[
              { key: 'ty', name: 'Anno corrente', color: series(0) },
              { key: 'ly', name: 'Anno precedente', color: CHART.ly },
            ]}

            footer={<span className="bi-struct__foot">Totale 12 mesi: <strong>{fmtEurK(tyAnno)}</strong></span>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={bi.mesi} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ ty: 'Anno corrente', ly: 'Anno precedente' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="ty" name="Anno corrente" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={26}
                  isAnimationActive={!still} animationDuration={ANIM.duration}
                />
                <Line
                  type="monotone" dataKey="ly" name="Anno precedente" stroke={CHART.ly} strokeWidth={2} dot={false}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationBegin={ANIM.begin(1)}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </Modal>
  )
}
