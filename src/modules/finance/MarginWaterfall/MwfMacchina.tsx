import React from 'react'
import { Conto, fmtCompatto, fmtPct } from './mwfData'
import { Passi, useRacconto } from './MwfRacconto'
import type { Sorgente } from './MwfFlusso'

/**
 * Macchina del margine: lo stesso racconto in 5 tempi del Flusso, visto come
 * una linea di produzione.
 *   1. le mazzette dei ricavi (una per voce) cadono nella tramoggia;
 *   2. il reparto Contribuzione separa i costi variabili, che scendono nei cassoni
 *      (costi di camera, commissioni);
 *   3. sul nastro esce il pacco del margine di contribuzione;
 *   4. il reparto Costi di struttura trattiene i costi fissi (cassone sotto);
 *   5. al Risultato d'esercizio arriva l'utile (o una perdita).
 * Ogni mazzetta di banconote ha l'area proporzionale all'importo.
 * Coordinate fisse nel viewBox 1000×440: le animazioni CSS (translate) usano
 * le stesse distanze in unità utente.
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

const BELT_Y = 318
const RULLI_1 = [312, 348, 384, 420, 456, 492, 528, 552]
const RULLI_2 = [742, 778, 814, 840]

// Mazzetta di banconote: larga 1,35·s, alta 0,7·s (area ∝ importo), fascetta con €
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
      <rect x={x} y={top} width={w} height={h} fill={colore} />
      <rect x={x + 2.5} y={top + 2.5} width={w - 5} height={h - 5} className="mwf-mac__pacco-bordo" />
      {h > 16 && <line x1={x} y1={top + h - 4} x2={x + w} y2={top + h - 4} className="mwf-mac__pacco-pila" />}
      <rect x={cx - fascia / 2} y={top} width={fascia} height={h} className="mwf-mac__pacco-nastro" />
      {h >= 12 && (
        <text x={cx} y={top + h / 2 + h * 0.19} textAnchor="middle" fill={colore} fontSize={Math.min(16, h * 0.55)} className="mwf-mac__pacco-euro">
          {perdita ? '!' : '€'}
        </text>
      )}
    </g>
  )
}

function Cassone({ x, w, colore, nome, valore, pct, pieno, ora }: {
  x: number; w: number; colore: string; nome: string; valore: string; pct: string; pieno: boolean; ora: boolean
}) {
  return (
    <g>
      <path d={`M${x},350 L${x + w},350 L${x + w - 6},432 L${x + 6},432 Z`} className="mwf-mac__cassone" />
      {pieno && (
        <>
          <path d={`M${x + 4},372 L${x + w - 4},372 L${x + w - 9},428 L${x + 9},428 Z`} fill={colore}
            className={`mwf-mac__livello ${ora ? 'mwf-mac__riempi mwf-mac__rit-cassone' : ''}`} />
          <g className={ora ? 'mwf-flx__appare mwf-mac__rit-cassone' : ''}>
            <text x={x + w / 2} y={396} textAnchor="middle" className="mwf-mac__cassone-nome">{nome}</text>
            <text x={x + w / 2} y={414} textAnchor="middle" className="mwf-mac__cassone-val">−{valore} · {pct}</text>
          </g>
        </>
      )}
    </g>
  )
}

function Ingranaggio({ cx, cy, r, gira, inverso }: { cx: number; cy: number; r: number; gira: boolean; inverso?: boolean }) {
  return (
    <g className={gira ? `mwf-mac__gira ${inverso ? 'mwf-mac__gira--inv' : ''}` : ''}>
      <circle cx={cx} cy={cy} r={r} className="mwf-mac__denti" />
      <circle cx={cx} cy={cy} r={r * 0.72} className="mwf-mac__ruota" />
      <circle cx={cx} cy={cy} r={r * 0.22} className="mwf-mac__mozzo" />
      <line x1={cx - r * 0.6} y1={cy} x2={cx + r * 0.6} y2={cy} className="mwf-mac__raggio" />
    </g>
  )
}

function Rullo({ cx, gira }: { cx: number; gira: boolean }) {
  return (
    <g className={gira ? 'mwf-mac__gira mwf-mac__gira--rullo' : ''}>
      <circle cx={cx} cy={BELT_Y + 7} r={5} className="mwf-mac__rullo" />
      <line x1={cx - 4} y1={BELT_Y + 7} x2={cx + 4} y2={BELT_Y + 7} className="mwf-mac__raggio" />
    </g>
  )
}

export default function MwfMacchina({ sorgenti, totale, riproduci, ultimo }: {
  sorgenti: Sorgente[]; totale: Conto; riproduci: string
  /** Ultima mazzetta caricata a mano: cade solo lui, gli altri sono già nella tramoggia. */
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
  const lato = (v: number, max = 76) => Math.max(16, max * Math.sqrt(Math.abs(v) / R))
  const pct = (v: number) => fmtPct(Math.abs(v) / R, 0)
  const cento = (v: number) => Math.round((Math.abs(v) / R) * 100)
  const ora = (f: number) => fase === f && !still
  const perdita = t.utile < 0

  // Pacchetti dei ricavi sul bordo della tramoggia, centrati su x=180
  const lati = attive.map(s => Math.min(32, lato(s.conto.ricavi, 40)))
  const gap = 6
  const largo = lati.reduce((a, b) => a + largoM(b), 0) + gap * (lati.length - 1)
  let cursore = 180 - largo / 2
  const tutti = attive.map((s, i) => {
    const x = cursore + largoM(lati[i]) / 2
    cursore += largoM(lati[i]) + gap
    return { s, x, l: lati[i], idx: sorgenti.indexOf(s) }
  })
  const nuovo = tutti.find(p => p.s.id === ultimo)
  // Caricata a mano: una sola mazzetta, ben visibile, al centro della tramoggia
  const pacchi = nuovo ? [{ ...nuovo, x: 180, l: Math.max(30, Math.min(44, lato(nuovo.s.conto.ricavi, 80))) }] : tutti

  const sMdc = lato(t.mdc)
  const sCf = lato(t.costiFissi)
  const sUt = lato(t.utile)
  const sCam = Math.min(44, lato(t.costiCamera, 60))
  const sCom = Math.min(44, lato(t.commissioni, 60))

  const lavora1 = fase >= 1 && fase <= 3 && !still
  const nastro1 = fase === 3 && !still
  const nastro2 = fase === 5 && !still

  const didascalie = [
    'La linea è pronta: le mazzette dei ricavi stanno per entrare nella tramoggia…',
    nuovo
      ? `Nella tramoggia cade la mazzetta ${nuovo.s.nome} (${fmtCompatto(nuovo.s.conto.ricavi)}): ${attive.length === 1 ? 'è la prima' : `ora ci sono ${attive.length} mazzette`}, ${fmtCompatto(t.ricavi)} in tutto.`
      : `Nella tramoggia cadono ${attive.length === 1 ? 'una mazzetta' : `${attive.length} mazzette`} di ricavi: insieme fanno ${fmtCompatto(t.ricavi)}.`,
    `Il reparto Contribuzione separa i costi variabili: ${fmtCompatto(t.costiCamera)} di costi di camera e ${fmtCompatto(t.commissioni)} di commissioni finiscono nei cassoni (${cento(t.costiVariabili)} € ogni 100 €).`,
    `Sul nastro esce il margine di contribuzione: ${fmtCompatto(t.mdc)}, cioè ${cento(t.mdc)} € ogni 100 € entrati.`,
    `Il reparto Costi di struttura trattiene i costi fissi: ${fmtCompatto(t.costiFissi)}.`,
    perdita
      ? `Il margine non basta a coprire i costi fissi: al Risultato d'esercizio arriva una perdita di ${fmtCompatto(-t.utile)}.`
      : `Al Risultato d'esercizio arriva l'utile: ${fmtCompatto(t.utile)}, cioè ${cento(t.utile)} € ogni 100 € entrati.`,
  ]

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
        aria-label={`Macchina del margine: entrano ricavi per ${fmtCompatto(t.ricavi)}, escono costi variabili ${fmtCompatto(t.costiVariabili)}, margine ${fmtCompatto(t.mdc)}, costi fissi ${fmtCompatto(t.costiFissi)}, ${perdita ? 'perdita' : 'utile'} ${fmtCompatto(t.utile)}`}>
        <svg viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet" className="mwf-mac__svg">
          {/* Pavimento */}
          <line x1={20} y1={433} x2={980} y2={433} className="mwf-mac__pavimento" />

          {/* ── 1. Pacchetti che cadono nella tramoggia ─────────────── */}
          {ora(1) && pacchi.map(p => (
            <g key={p.s.id} className={`mwf-mac__cade mwf-flx__rit${Math.min(p.idx, 7)}`}>
              <Mazzetta cx={p.x} top={62 - altoM(p.l)} s={p.l} colore={colSorgente(p.idx)} titolo={`${p.s.nome}: ${fmtCompatto(p.s.conto.ricavi)}`} />
            </g>
          ))}

          {/* Tramoggia */}
          <path d="M70,62 L290,62 L210,140 L150,140 Z" className="mwf-mac__corpo" />
          {fase >= 1 && (
            <path d="M84,70 L276,70 L206,134 L154,134 Z" fill={COL.ricavi}
              className={`mwf-mac__livello ${ora(1) ? 'mwf-mac__riempi mwf-mac__rit-tramoggia' : ''}`} />
          )}
          <line x1={64} y1={62} x2={296} y2={62} className="mwf-mac__bordo" />
          {fase >= 1 && (
            <g className={ora(1) ? 'mwf-flx__appare mwf-mac__rit-tramoggia' : ''}>
              <text x={302} y={84} className="mwf-flx__nome mwf-flx__nome--ricavi">Ricavi</text>
              <text x={302} y={101} className="mwf-flx__val">{fmtCompatto(t.ricavi)}</text>
            </g>
          )}
          {fase === 0 && (
            <g className={vuoto ? 'mwf-mac__chiama' : ''}>
              <text x={180} y={44} textAnchor="middle" className="mwf-mac__attesa">{vuoto ? 'trascina qui i ricavi' : 'tramoggia dei ricavi'}</text>
              {vuoto && <path d="M174,48 L186,48 L180,56 Z" className="mwf-mac__freccia" />}
            </g>
          )}
          {fase > 1 && !vuoto && ultimo && (
            <text x={180} y={44} textAnchor="middle" className="mwf-mac__attesa">{attive.length} mazzett{attive.length === 1 ? 'a' : 'e'} caricat{attive.length === 1 ? 'a' : 'e'}</text>
          )}

          {/* ── Reparto Contribuzione ───────────────────────────────────────────── */}
          <rect x={150} y={140} width={60} height={16} className="mwf-mac__corpo" />
          <rect x={60} y={156} width={240} height={144} rx={4} className="mwf-mac__corpo" />
          <rect x={72} y={168} width={216} height={100} className="mwf-mac__pannello" />
          <Ingranaggio cx={112} cy={208} r={24} gira={lavora1} />
          <Ingranaggio cx={154} cy={236} r={16} gira={lavora1} inverso />
          <circle cx={244} cy={204} r={22} className="mwf-mac__manometro" />
          <line x1={244} y1={204} x2={244} y2={188} className={`mwf-mac__lancetta ${lavora1 ? 'mwf-mac__lancetta--su' : ''}`} />
          <circle cx={244} cy={204} r={3} className="mwf-mac__mozzo" />
          <circle cx={84} cy={290} r={5} className={`mwf-mac__spia ${lavora1 ? 'mwf-mac__spia--on' : ''}`} />
          <text x={186} y={292} textAnchor="middle" className="mwf-mac__targa">CONTRIBUZIONE</text>
          <rect x={296} y={282} width={8} height={36} className="mwf-mac__bocca" />

          {/* Scivoli e cassoni dei costi variabili */}
          <path d="M98,300 L150,300 L140,350 L108,350 Z" className="mwf-mac__scivolo" />
          <path d="M218,300 L270,300 L262,350 L230,350 Z" className="mwf-mac__scivolo" />
          {ora(2) && (
            <>
              <g className="mwf-mac__scende"><Mazzetta cx={124} top={300} s={sCam} colore={COL.cv} titolo="Costi di camera" /></g>
              <g className="mwf-mac__scende mwf-mac__rit-secondo"><Mazzetta cx={246} top={300} s={sCom} colore={COL.cv} titolo="Commissioni" /></g>
            </>
          )}
          <Cassone x={64} w={120} colore={COL.cv} nome="Costi di camera" valore={fmtCompatto(t.costiCamera)} pct={pct(t.costiCamera)} pieno={fase >= 2} ora={ora(2)} />
          <Cassone x={188} w={120} colore={COL.cv} nome="Commissioni" valore={fmtCompatto(t.commissioni)} pct={pct(t.commissioni)} pieno={fase >= 2} ora={ora(2)} />

          {/* ── Nastro 1: Contribuzione → Costi di struttura ────────────────────────── */}
          <line x1={330} y1={BELT_Y + 14} x2={330} y2={433} className="mwf-mac__gamba" />
          <line x1={540} y1={BELT_Y + 14} x2={540} y2={433} className="mwf-mac__gamba" />
          <rect x={304} y={BELT_Y} width={262} height={14} className="mwf-mac__nastro" />
          <line x1={304} y1={BELT_Y} x2={566} y2={BELT_Y} className={`mwf-mac__tappeto ${nastro1 ? 'mwf-mac__tappeto--corre' : ''}`} />
          {RULLI_1.map(x => <Rullo key={x} cx={x} gira={nastro1} />)}

          {/* 3. La mazzetta del margine esce sul nastro; 4. entra in Costi di struttura */}
          {(fase === 3 || ora(4)) && (
            <g className={ora(3) ? 'mwf-mac__esce1' : ora(4) ? 'mwf-mac__entra2' : ''}>
              <Mazzetta cx={470} top={BELT_Y - altoM(sMdc)} s={sMdc} colore={t.mdc < 0 ? COL.perdita : COL.mdc} titolo={`Margine di contribuzione: ${fmtCompatto(t.mdc)}`} />
            </g>
          )}
          {fase === 3 && (
            <g className={ora(3) ? 'mwf-flx__appare mwf-mac__rit-etichetta' : ''}>
              <text x={470} y={BELT_Y - altoM(sMdc) - 26} textAnchor="middle" className="mwf-flx__nome mwf-flx__nome--mdc">Margine di contribuzione</text>
              <text x={470} y={BELT_Y - altoM(sMdc) - 10} textAnchor="middle" className="mwf-flx__val">{fmtCompatto(t.mdc)} · {pct(t.mdc)}</text>
            </g>
          )}

          {/* ── Reparto Costi di struttura ──────────────────────────────── */}
          {fase >= 3 && (
            <g className={ora(3) ? 'mwf-flx__appare mwf-mac__rit-etichetta' : ''}>
              <rect x={590} y={104} width={120} height={28} className="mwf-mac__display" />
              <text x={650} y={123} textAnchor="middle" className="mwf-mac__display-txt">MdC {fmtCompatto(t.mdc)}</text>
            </g>
          )}
          <rect x={576} y={150} width={16} height={168} className="mwf-mac__corpo" />
          <rect x={708} y={150} width={16} height={168} className="mwf-mac__corpo" />
          <rect x={570} y={136} width={160} height={28} className="mwf-mac__traversa" />
          <text x={650} y={155} textAnchor="middle" className="mwf-mac__targa mwf-mac__targa--chiara mwf-mac__targa--stretta">COSTI DI STRUTTURA</text>
          <g className={ora(4) ? 'mwf-mac__pressa' : ''}>
            <rect x={643} y={164} width={14} height={40} className="mwf-mac__stelo" />
            <rect x={608} y={204} width={84} height={18} className="mwf-mac__mazza" />
          </g>
          <rect x={592} y={300} width={116} height={18} className="mwf-mac__base" />
          <path d="M620,318 L680,318 L672,350 L628,350 Z" className="mwf-mac__scivolo" />
          {ora(4) && (
            <g className="mwf-mac__scende mwf-mac__rit-pressa"><Mazzetta cx={650} top={300} s={Math.min(44, sCf)} colore={COL.cf} titolo="Costi fissi" /></g>
          )}
          <Cassone x={590} w={120} colore={COL.cf} nome="Costi fissi" valore={fmtCompatto(t.costiFissi)} pct={pct(t.costiFissi)} pieno={fase >= 4} ora={ora(4)} />

          {/* ── Nastro 2: Costi di struttura → Risultato d'esercizio ──────────────────────────── */}
          <line x1={790} y1={BELT_Y + 14} x2={790} y2={433} className="mwf-mac__gamba" />
          <rect x={724} y={BELT_Y} width={126} height={14} className="mwf-mac__nastro" />
          <line x1={724} y1={BELT_Y} x2={850} y2={BELT_Y} className={`mwf-mac__tappeto ${nastro2 ? 'mwf-mac__tappeto--corre' : ''}`} />
          {RULLI_2.map(x => <Rullo key={x} cx={x} gira={nastro2} />)}

          {/* Risultato d'esercizio (bancale) */}
          <rect x={860} y={BELT_Y + 2} width={120} height={8} className="mwf-mac__bancale" />
          <rect x={866} y={BELT_Y + 10} width={14} height={8} className="mwf-mac__bancale" />
          <rect x={913} y={BELT_Y + 10} width={14} height={8} className="mwf-mac__bancale" />
          <rect x={960} y={BELT_Y + 10} width={14} height={8} className="mwf-mac__bancale" />
          <line x1={870} y1={BELT_Y + 18} x2={870} y2={433} className="mwf-mac__gamba" />
          <line x1={970} y1={BELT_Y + 18} x2={970} y2={433} className="mwf-mac__gamba" />
          {fase === 0 && <text x={920} y={BELT_Y - 12} textAnchor="middle" className="mwf-mac__attesa">risultato d'esercizio</text>}

          {/* 5. Utile (o perdita) al Risultato d'esercizio */}
          {fase >= 5 && (
            <>
              <g className={ora(5) ? 'mwf-mac__esce2' : ''}>
                <Mazzetta cx={920} top={BELT_Y + 2 - altoM(sUt)} s={sUt} colore={perdita ? COL.perdita : COL.utile}
                  titolo={`${perdita ? 'Perdita' : 'Utile'}: ${fmtCompatto(t.utile)}`} perdita={perdita} />
              </g>
              <g className={ora(5) ? 'mwf-flx__appare mwf-mac__rit-etichetta' : ''}>
                <text x={920} y={BELT_Y - altoM(sUt) - 26} textAnchor="middle" className={`mwf-flx__nome mwf-flx__nome--${perdita ? 'perdita' : 'utile'}`}>{perdita ? 'Perdita' : 'Utile'}</text>
                <text x={920} y={BELT_Y - altoM(sUt) - 10} textAnchor="middle" className="mwf-flx__val">{perdita ? '−' : ''}{fmtCompatto(Math.abs(t.utile))} · {pct(t.utile)}</text>
              </g>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
