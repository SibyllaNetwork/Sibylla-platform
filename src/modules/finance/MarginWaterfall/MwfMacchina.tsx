import React from 'react'
import { Conto, fmtCompatto, fmtPct } from './mwfData'
import { Passi, useRacconto } from './MwfRacconto'
import type { Sorgente } from './MwfFlusso'

/**
 * Filiera del margine: una sola macchina, lo stesso racconto in 5 tempi del Flusso.
 *   1. i ricavi (una mazzetta per voce) entrano nella tramoggia;
 *   2. a sinistra escono i costi variabili → contenitore;
 *   3. il quadrante mostra il margine di contribuzione (% sui ricavi);
 *   4. in basso escono i costi fissi → contenitore;
 *   5. a destra esce l'utile (o la perdita) → contenitore.
 * I tre contenitori sono identici: il livello è la quota sui ricavi, così si
 * confrontano a colpo d'occhio. Coordinate fisse nel viewBox 1000×440.
 */

const PASSO_MS = 2000
const COL = {
  ricavi: 'var(--chart-1)',
  cv: 'var(--chart-6)',
  mdc: 'var(--chart-5)',
  cf: 'var(--chart-4)',
  utile: 'var(--color-success)',
  perdita: 'var(--color-error)',
}
const colSorgente = (i: number) => `var(--chart-${(i % 8) + 1})`

// Geometria
const CX = 500
const USCITA_Y = 226
const C_TOP = 330
const C_BOT = 432
const C_W = 180
const C_RASTREMA = 10
const CASSONI = { cv: 170, cf: CX, ut: 830 }
// Quadrante del margine
const G = { cx: 452, cy: 240, r: 58 }

const largoM = (s: number) => s * 1.35
const altoM = (s: number) => s * 0.7

function Mazzetta({ cx, top, s, colore, titolo, perdita }: { cx: number; top: number; s: number; colore: string; titolo: string; perdita?: boolean }) {
  const w = largoM(s)
  const h = altoM(s)
  const x = cx - w / 2
  const fascia = Math.max(6, w * 0.22)
  return (
    <g className="mwf-mac__pacco">
      <title>{titolo}</title>
      <rect x={x} y={top} width={w} height={h} rx={1.5} fill={colore} />
      <rect x={cx - fascia / 2} y={top} width={fascia} height={h} className="mwf-mac__pacco-nastro" />
      {h >= 12 && (
        <text x={cx} y={top + h / 2 + h * 0.19} textAnchor="middle" fill={colore} fontSize={Math.min(16, h * 0.55)} className="mwf-mac__pacco-euro">
          {perdita ? '!' : '€'}
        </text>
      )}
    </g>
  )
}

/** Contenitore a tronco di piramide; il livello è la quota sui ricavi. */
function Contenitore({ cx, colore, nome, valore, quota, pieno, ora, segno = '−' }: {
  cx: number; colore: string; nome: string; valore: string; quota: number; pieno: boolean; ora: boolean; segno?: string
}) {
  const x = cx - C_W / 2
  const lato = (y: number) => C_RASTREMA * (y - C_TOP) / (C_BOT - C_TOP)
  const fondo = C_BOT - 4
  const altezza = (C_BOT - C_TOP - 8) * Math.min(1, Math.max(0.04, quota))
  const cima = fondo - altezza
  return (
    <g>
      <path d={`M${x},${C_TOP} L${x + C_W},${C_TOP} L${x + C_W - C_RASTREMA},${C_BOT} L${x + C_RASTREMA},${C_BOT} Z`} className="mwf-mac__cassone" />
      {pieno && (
        <>
          <path d={`M${x + 4 + lato(cima)},${cima} L${x + C_W - 4 - lato(cima)},${cima} L${x + C_W - 4 - lato(fondo)},${fondo} L${x + 4 + lato(fondo)},${fondo} Z`}
            fill={colore} className={`mwf-mac__livello ${ora ? 'mwf-mac__riempi mwf-mac__rit-cassone' : ''}`} />
          <g className={ora ? 'mwf-flx__appare mwf-mac__rit-cassone' : ''}>
            <text x={cx} y={C_TOP + 22} textAnchor="middle" className="mwf-mac__cassone-nome">{nome}</text>
            <text x={cx} y={C_TOP + 39} textAnchor="middle" className="mwf-mac__cassone-val">{segno}{valore} · {fmtPct(quota, 0)}</text>
          </g>
        </>
      )}
    </g>
  )
}

/** Condotto: contorno + anima; quando passa il flusso l'anima scorre nel colore della voce. */
function Condotto({ d, colore, attivo }: { d: string; colore: string; attivo: boolean }) {
  return (
    <g>
      <path d={d} className="mwf-mac__tubo" />
      <path d={d} className="mwf-mac__tubo-anima" />
      {attivo && <path d={d} stroke={colore} className="mwf-mac__tubo-flusso" />}
    </g>
  )
}

const punto = (q: number, r = G.r) => {
  const a = Math.PI * (1 - q)
  return { x: G.cx + r * Math.cos(a), y: G.cy - r * Math.sin(a) }
}

export default function MwfMacchina({ sorgenti, totale, riproduci, ultimo }: {
  sorgenti: Sorgente[]; totale: Conto; riproduci: string
  /** Ultima mazzetta caricata a mano: cade solo lei, le altre sono già nella tramoggia. */
  ultimo?: string | null
}) {
  const racconto = useRacconto(riproduci, PASSO_MS)
  const { still, vaiA, ricomincia } = racconto
  const attive = sorgenti.filter(s => s.conto.ricavi > 0)
  // Tramoggia vuota: la macchina resta ferma in attesa della prima mazzetta
  const vuoto = !attive.length
  const fase = vuoto ? 0 : racconto.fase

  const t = totale
  const R = t.ricavi || 1
  const quota = (v: number) => Math.abs(v) / R
  const lato = (v: number, max = 76) => Math.max(16, max * Math.sqrt(Math.abs(v) / R))
  const cento = (v: number) => Math.round((Math.abs(v) / R) * 100)
  const ora = (f: number) => fase === f && !still
  const perdita = t.utile < 0
  const qMdc = Math.min(1, Math.max(0, t.mdc / R))

  // Mazzette dei ricavi sopra la tramoggia, centrate su CX
  const lati = attive.map(s => Math.min(32, lato(s.conto.ricavi, 40)))
  const gap = 6
  const largo = lati.reduce((a, b) => a + largoM(b), 0) + gap * (lati.length - 1)
  let cursore = CX - largo / 2
  const tutti = attive.map((s, i) => {
    const x = cursore + largoM(lati[i]) / 2
    cursore += largoM(lati[i]) + gap
    return { s, x, l: lati[i], idx: sorgenti.indexOf(s) }
  })
  const nuovo = tutti.find(p => p.s.id === ultimo)
  const pacchi = nuovo ? [{ ...nuovo, x: CX, l: Math.max(30, Math.min(44, lato(nuovo.s.conto.ricavi, 80))) }] : tutti

  const lavora = fase >= 1 && !still && fase < 5
  const fineArco = punto(qMdc)
  const angolo = -90 + 180 * qMdc

  const didascalie = [
    'La macchina è pronta: i ricavi stanno per entrare nella tramoggia…',
    nuovo
      ? `Nella tramoggia entra ${nuovo.s.nome} (${fmtCompatto(nuovo.s.conto.ricavi)}): ${attive.length === 1 ? 'è la prima voce' : `ora le voci sono ${attive.length}`}, ${fmtCompatto(t.ricavi)} in tutto.`
      : `Nella tramoggia entrano ${attive.length === 1 ? 'una voce' : `${attive.length} voci`} di ricavo: ${fmtCompatto(t.ricavi)} in tutto.`,
    `A sinistra escono i costi variabili: ${fmtCompatto(t.costiCamera)} di costi di camera e ${fmtCompatto(t.commissioni)} di commissioni (${cento(t.costiVariabili)} € ogni 100 €).`,
    `Il quadrante segna il margine di contribuzione: ${fmtCompatto(t.mdc)}, cioè ${cento(t.mdc)} € ogni 100 € di ricavi.`,
    `In basso escono i costi fissi della struttura: ${fmtCompatto(t.costiFissi)} (${cento(t.costiFissi)} € ogni 100 €).`,
    perdita
      ? `Il margine non copre i costi fissi: a destra esce una perdita di ${fmtCompatto(-t.utile)}.`
      : `A destra esce l'utile: ${fmtCompatto(t.utile)}, cioè ${cento(t.utile)} € ogni 100 € di ricavi.`,
  ]

  const tubo = {
    cv: `M360,${USCITA_Y} H${CASSONI.cv} V${C_TOP - 2}`,
    cf: `M${CX},290 V${C_TOP - 2}`,
    ut: `M640,${USCITA_Y} H${CASSONI.ut} V${C_TOP - 2}`,
  }

  return (
    <div className="mwf-flx-wrap">
      {vuoto ? (
        <p className="mwf-flx__didascalia mwf-mac__invito">
          <i className="fa-solid fa-hand-pointer" aria-hidden="true" /> La tramoggia è vuota: trascina qui un ricavo dall'elenco o fai doppio clic su un mattoncino per caricarlo.
        </p>
      ) : (
        <Passi totale={t} nSorgenti={attive.length} fase={fase} vaiA={vaiA} ricomincia={ricomincia} didascalie={didascalie} />
      )}

      <div className="mwf-mac" role="img"
        aria-label={`Filiera del margine: entrano ricavi per ${fmtCompatto(t.ricavi)}, escono costi variabili ${fmtCompatto(t.costiVariabili)}, margine ${fmtCompatto(t.mdc)}, costi fissi ${fmtCompatto(t.costiFissi)}, ${perdita ? 'perdita' : 'utile'} ${fmtCompatto(t.utile)}`}>
        <svg viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" className="mwf-mac__svg">
          <line x1={20} y1={C_BOT + 1} x2={980} y2={C_BOT + 1} className="mwf-mac__pavimento" />

          {/* ── Condotti (sotto la macchina) ─────────────────────────── */}
          <Condotto d={tubo.cv} colore={COL.cv} attivo={ora(2)} />
          <Condotto d={tubo.cf} colore={COL.cf} attivo={ora(4)} />
          <Condotto d={tubo.ut} colore={perdita ? COL.perdita : COL.utile} attivo={ora(5)} />

          {/* ── 1. Ricavi nella tramoggia ────────────────────────────── */}
          {ora(1) && pacchi.map(p => (
            <g key={p.s.id} className={`mwf-mac__cade mwf-flx__rit${Math.min(p.idx, 7)}`}>
              <Mazzetta cx={p.x} top={40 - altoM(p.l)} s={p.l} colore={colSorgente(p.idx)} titolo={`${p.s.nome}: ${fmtCompatto(p.s.conto.ricavi)}`} />
            </g>
          ))}
          <path d={`M${CX - 120},40 L${CX + 120},40 L${CX + 30},120 L${CX - 30},120 Z`} className="mwf-mac__corpo" />
          {fase >= 1 && (
            <path d={`M${CX - 104},48 L${CX + 104},48 L${CX + 26},114 L${CX - 26},114 Z`} fill={COL.ricavi}
              className={`mwf-mac__livello ${ora(1) ? 'mwf-mac__riempi mwf-mac__rit-tramoggia' : ''}`} />
          )}
          <line x1={CX - 128} y1={40} x2={CX + 128} y2={40} className="mwf-mac__bordo" />
          {fase >= 1 && (
            <g className={ora(1) ? 'mwf-flx__appare mwf-mac__rit-tramoggia' : ''}>
              <text x={CX + 136} y={62} className="mwf-flx__nome mwf-flx__nome--ricavi">Ricavi</text>
              <text x={CX + 136} y={79} className="mwf-flx__val">{fmtCompatto(t.ricavi)} · 100%</text>
            </g>
          )}
          {fase === 0 && (
            <g className={vuoto ? 'mwf-mac__chiama' : ''}>
              <text x={CX} y={22} textAnchor="middle" className="mwf-mac__attesa">{vuoto ? 'trascina qui i ricavi' : 'ricavi'}</text>
              {vuoto && <path d={`M${CX - 6},26 L${CX + 6},26 L${CX},34 Z`} className="mwf-mac__freccia" />}
            </g>
          )}
          {fase > 1 && !vuoto && ultimo && (
            <text x={CX} y={22} textAnchor="middle" className="mwf-mac__attesa">{attive.length} voc{attive.length === 1 ? 'e' : 'i'} caricat{attive.length === 1 ? 'a' : 'e'}</text>
          )}

          {/* ── Corpo macchina ───────────────────────────────────────── */}
          <rect x={CX - 30} y={120} width={60} height={16} className="mwf-mac__corpo" />
          <rect x={360} y={136} width={280} height={154} rx={4} className="mwf-mac__corpo" />
          <rect x={374} y={150} width={252} height={112} rx={2} className="mwf-mac__pannello" />

          {/* Quadrante: margine di contribuzione in % sui ricavi */}
          <path d={`M${G.cx - G.r},${G.cy} A${G.r},${G.r} 0 0 1 ${G.cx + G.r},${G.cy}`} className="mwf-mac__arco" />
          {fase >= 3 && qMdc > 0 && (
            <path d={`M${G.cx - G.r},${G.cy} A${G.r},${G.r} 0 0 1 ${fineArco.x},${fineArco.y}`} stroke={COL.mdc}
              className={`mwf-mac__arco-val ${ora(3) ? 'mwf-flx__appare' : ''}`} />
          )}
          {[0, 0.25, 0.5, 0.75, 1].map(q => {
            const a = punto(q, G.r - 8)
            const b = punto(q, G.r + 5)
            return <line key={q} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="mwf-mac__tacca" />
          })}
          <text x={G.cx - G.r} y={G.cy + 14} textAnchor="middle" className="mwf-mac__scala">0%</text>
          <text x={G.cx + G.r} y={G.cy + 14} textAnchor="middle" className="mwf-mac__scala">100%</text>
          <line x1={G.cx} y1={G.cy} x2={G.cx} y2={G.cy - G.r + 12} className="mwf-mac__lancetta"
            transform={`rotate(${fase >= 3 ? angolo : -90} ${G.cx} ${G.cy})`}>
            {ora(3) && (
              <animateTransform attributeName="transform" type="rotate" from={`-90 ${G.cx} ${G.cy}`} to={`${angolo} ${G.cx} ${G.cy}`}
                dur="1s" begin="0.2s" fill="freeze" calcMode="spline" keySplines=".3 1.3 .5 1" keyTimes="0;1" />
            )}
          </line>
          <circle cx={G.cx} cy={G.cy} r={4} className="mwf-mac__mozzo" />

          {/* Display */}
          <rect x={530} y={176} width={84} height={56} rx={3} className="mwf-mac__display" />
          <text x={572} y={196} textAnchor="middle" className="mwf-mac__display-lbl">MARGINE</text>
          <text x={572} y={220} textAnchor="middle" className="mwf-mac__display-txt">
            {fase >= 3 ? fmtPct(t.mdc / R, 0) : '—'}
          </text>
          {fase >= 3 && (
            <text x={572} y={252} textAnchor="middle" className={`mwf-mac__display-sub ${ora(3) ? 'mwf-flx__appare' : ''}`}>{fmtCompatto(t.mdc)}</text>
          )}

          <circle cx={378} cy={276} r={4} className={`mwf-mac__spia ${lavora ? 'mwf-mac__spia--on' : ''}`} />
          <text x={CX} y={280} textAnchor="middle" className="mwf-mac__targa">CONTO ECONOMICO</text>

          {/* Bocche di uscita */}
          <rect x={352} y={USCITA_Y - 12} width={8} height={24} className="mwf-mac__bocca" />
          <rect x={640} y={USCITA_Y - 12} width={8} height={24} className="mwf-mac__bocca" />
          <rect x={CX - 12} y={290} width={24} height={6} className="mwf-mac__bocca" />

          {/* ── Uscite: mazzette che cadono nei contenitori ─────────── */}
          {ora(2) && (
            <g className="mwf-mac__scende">
              <Mazzetta cx={CASSONI.cv} top={C_TOP - 30} s={Math.min(40, lato(t.costiVariabili, 56))} colore={COL.cv} titolo={`Costi variabili: ${fmtCompatto(t.costiVariabili)}`} />
            </g>
          )}
          {ora(4) && (
            <g className="mwf-mac__scende">
              <Mazzetta cx={CASSONI.cf} top={C_TOP - 30} s={Math.min(40, lato(t.costiFissi, 56))} colore={COL.cf} titolo={`Costi fissi: ${fmtCompatto(t.costiFissi)}`} />
            </g>
          )}
          {ora(5) && (
            <g className="mwf-mac__scende">
              <Mazzetta cx={CASSONI.ut} top={C_TOP - 30} s={Math.min(40, lato(t.utile, 56))} colore={perdita ? COL.perdita : COL.utile}
                titolo={`${perdita ? 'Perdita' : 'Utile'}: ${fmtCompatto(t.utile)}`} perdita={perdita} />
            </g>
          )}

          {/* ── Contenitori ──────────────────────────────────────────── */}
          <Contenitore cx={CASSONI.cv} colore={COL.cv} nome="Costi variabili" valore={fmtCompatto(t.costiVariabili)}
            quota={quota(t.costiVariabili)} pieno={fase >= 2} ora={ora(2)} />
          <Contenitore cx={CASSONI.cf} colore={COL.cf} nome="Costi fissi" valore={fmtCompatto(t.costiFissi)}
            quota={quota(t.costiFissi)} pieno={fase >= 4} ora={ora(4)} />
          <Contenitore cx={CASSONI.ut} colore={perdita ? COL.perdita : COL.utile} nome={perdita ? 'Perdita' : 'Utile'}
            valore={fmtCompatto(Math.abs(t.utile))} segno={perdita ? '−' : ''} quota={quota(t.utile)} pieno={fase >= 5} ora={ora(5)} />

          {fase === 0 && (
            <>
              <text x={CASSONI.cv} y={C_TOP + 22} textAnchor="middle" className="mwf-mac__attesa">costi variabili</text>
              <text x={CASSONI.cf} y={C_TOP + 22} textAnchor="middle" className="mwf-mac__attesa">costi fissi</text>
              <text x={CASSONI.ut} y={C_TOP + 22} textAnchor="middle" className="mwf-mac__attesa">utile</text>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
