import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, Sankey } from 'recharts'
import { Conto, fmtCompatto, fmtPct } from './mwfData'
import { Passi, TappaDef, useRacconto } from './MwfRacconto'

/**
 * Flusso del denaro (Sankey) ridotto a tre soli parametri: Ricavi, Costi, Utile.
 * Le barre possono restare separate (una per voce di ricavo, costi variabili e
 * fissi distinti) ma ognuna appartiene sempre a uno dei tre: stesso colore,
 * stessa etichetta principale, il dettaglio va nella riga sotto.
 * Flusso sequenziale su tre livelli, da sinistra: Ricavi (le voci confluiscono
 * nel totale) → Costi → Utile; la banda dell'utile attraversa la colonna dei
 * costi con un "ponte" senza etichetta.
 * Racconto in 3 tempi: 1. entrano i ricavi · 2. escono i costi · 3. resta l'utile
 * (o la perdita, che copre la parte di costi non pagata dai ricavi).
 */
export interface Sorgente { id: string; nome: string; conto: Conto }

type Parametro = 'ricavi' | 'costi' | 'utile'
type Tipo = 'voce' | 'ricavi' | 'costi' | 'ponte' | 'utile' | 'perdita'
interface Nodo { id: string; tipo: Tipo; dettaglio: string; valore: number; idx?: number }

const PARAMETRO: Record<Tipo, Parametro> = { voce: 'ricavi', ricavi: 'ricavi', costi: 'costi', ponte: 'utile', utile: 'utile', perdita: 'utile' }
const NOME: Record<Parametro, string> = { ricavi: 'Ricavi', costi: 'Costi', utile: 'Utile' }
const COLORE: Record<Tipo, string> = {
  voce: 'var(--chart-1)',
  ricavi: 'var(--chart-1)',
  costi: 'var(--chart-6)',
  ponte: 'var(--color-success)',
  utile: 'var(--color-success)',
  perdita: 'var(--color-error)',
}
// Tempo del racconto in cui compare ogni barra
const FASE_NODO: Record<Tipo, number> = { voce: 1, ricavi: 1, costi: 2, ponte: 3, utile: 3, perdita: 3 }
const faseCorrente = (s: Nodo, t: Nodo) =>
  t.tipo === 'ponte' || t.tipo === 'utile' || t.tipo === 'perdita' ? 3 : t.tipo === 'costi' ? 2 : 1
// Voci di ricavo (prima colonna): etichetta a sinistra
const aSinistra = (n: Nodo) => n.tipo === 'voce' || (n.tipo === 'ricavi' && n.dettaglio !== 'totale')
// Il ponte è parte della banda dell'utile: in hover vale come Utile
const chiave = (n: Nodo) => (n.tipo === 'ponte' ? 'utile' : n.id)

const PASSO_MS = 2000
const ULTIMA = 3

export default function MwfFlusso({ sorgenti, totale, riproduci }: { sorgenti: Sorgente[]; totale: Conto; riproduci: string }) {
  const [hover, setHover] = useState<string | null>(null)
  const { fase, still, vaiA, ricomincia } = useRacconto(riproduci, PASSO_MS, ULTIMA)

  const t = totale
  const costi = t.costiVariabili + t.costiFissi
  const perdita = t.utile < 0

  const dati = useMemo(() => {
    const attive = sorgenti.filter(s => s.conto.ricavi > 0)
    const nodes: Nodo[] = []
    const links: { source: number; target: number; value: number }[] = []
    const add = (n: Nodo) => { nodes.push(n); return nodes.length - 1 }
    if (!attive.length) return { nodes, links }

    // Ricavi: le voci entrano una dopo l'altra nella barra Ricavi (con una sola voce è già lei)
    let iRic: number
    if (attive.length === 1) {
      iRic = add({ id: 'ricavi', tipo: 'ricavi', dettaglio: attive[0].nome, valore: t.ricavi })
    } else {
      const voci = attive.map(s => add({ id: `voce-${s.id}`, tipo: 'voce', dettaglio: s.nome, valore: s.conto.ricavi, idx: sorgenti.indexOf(s) }))
      iRic = add({ id: 'ricavi', tipo: 'ricavi', dettaglio: 'totale', valore: t.ricavi })
      attive.forEach((s, i) => links.push({ source: voci[i], target: iRic, value: s.conto.ricavi }))
    }

    // Costi: variabili e fissi separati, entrambi "Costi"
    const iCv = add({ id: 'cv', tipo: 'costi', dettaglio: 'variabili', valore: t.costiVariabili })
    const iCf = add({ id: 'cf', tipo: 'costi', dettaglio: 'fissi', valore: t.costiFissi })

    if (!perdita) {
      links.push({ source: iRic, target: iCv, value: t.costiVariabili })
      links.push({ source: iRic, target: iCf, value: t.costiFissi })
      // La banda dell'utile attraversa la colonna dei costi (ponte) e arriva alla successiva
      const iPonte = add({ id: 'ponte', tipo: 'ponte', dettaglio: '', valore: t.utile })
      links.push({ source: iRic, target: iPonte, value: t.utile })
      const iUt = add({ id: 'utile', tipo: 'utile', dettaglio: '', valore: t.utile })
      links.push({ source: iPonte, target: iUt, value: t.utile })
    } else {
      // Perdita: i ricavi pagano prima i variabili poi i fissi; la parte non coperta
      // dei costi scorre nella colonna Utile come perdita
      const aCv = Math.min(t.costiVariabili, t.ricavi)
      const aCf = Math.max(0, t.ricavi - aCv)
      links.push({ source: iRic, target: iCv, value: aCv })
      links.push({ source: iRic, target: iCf, value: aCf })
      const iPe = add({ id: 'perdita', tipo: 'perdita', dettaglio: 'perdita', valore: t.utile })
      links.push({ source: iCv, target: iPe, value: t.costiVariabili - aCv })
      links.push({ source: iCf, target: iPe, value: t.costiFissi - aCf })
    }
    return { nodes, links: links.filter(l => l.value > 0) }
  }, [sorgenti, t, perdita])

  const r = t.ricavi || 1
  const ordine = (n: Nodo) => Math.max(0, dati.nodes.filter(x => x.tipo === 'voce').findIndex(x => x.id === n.id))

  // ── Barra: compare nel suo tempo e cresce ─────────────────────────────────
  const NodoSvg = (p: any) => {
    const n: Nodo = p.payload
    const f = FASE_NODO[n.tipo]
    if (f > fase) return <g />
    const ora = f === fase && !still
    const spento = hover && hover !== chiave(n)
    // Ponte: solo il tratto della banda dell'utile che attraversa la colonna dei costi
    if (n.tipo === 'ponte') {
      return (
        <g className={`${spento ? 'mwf-flx__spento' : ''} ${ora ? 'mwf-flx__appare' : ''}`}
          onMouseEnter={() => setHover('utile')} onMouseLeave={() => setHover(null)}>
          <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 1)} fill={COLORE.ponte} className="mwf-flx__ponte" />
        </g>
      )
    }
    const sinistra = aSinistra(n)
    const x = sinistra ? p.x - 8 : p.x + p.width + 8
    const cy = p.y + p.height / 2
    const ritardo = n.tipo === 'ricavi' ? 'mwf-flx__rit-r' : n.id === 'cf' ? 'mwf-flx__rit-cv' : n.tipo === 'voce' ? `mwf-flx__rit${Math.min(ordine(n), 7)}` : ''
    const param = PARAMETRO[n.tipo]
    const segno = n.tipo === 'costi' || n.tipo === 'perdita' ? '−' : ''
    return (
      <g className={`mwf-flx__nodo ${spento ? 'mwf-flx__spento' : ''}`}
        onMouseEnter={() => setHover(chiave(n))} onMouseLeave={() => setHover(null)}>
        <title>{`${NOME[param]}${n.dettaglio ? ` · ${n.dettaglio}` : ''}: ${segno}${fmtCompatto(Math.abs(n.valore))}`}</title>
        <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 2)} fill={COLORE[n.tipo]}
          className={ora ? `mwf-flx__cresce ${ritardo}` : ''} />
        <g className={ora ? `mwf-flx__appare ${ritardo}` : ''}>
          <text x={x} y={cy - 3} textAnchor={sinistra ? 'end' : 'start'} className={`mwf-flx__nome mwf-flx__nome--${n.tipo === 'perdita' ? 'perdita' : param}`}>{NOME[param]}</text>
          <text x={x} y={cy + 13} textAnchor={sinistra ? 'end' : 'start'} className="mwf-flx__val">
            {n.dettaglio && `${n.dettaglio} · `}{segno}{fmtCompatto(Math.abs(n.valore))} · {fmtPct(Math.abs(n.valore) / r, 0)}
          </text>
        </g>
      </g>
    )
  }

  // ── Corrente: si disegna nel suo tempo ────────────────────────────────────
  const Corrente = (p: any) => {
    const sorg: Nodo = p.payload.source
    const dest: Nodo = p.payload.target
    const f = faseCorrente(sorg, dest)
    if (f > fase) return <g />
    const ora = f === fase && !still
    const d = `M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`
    const acceso = !hover || hover === chiave(sorg) || hover === chiave(dest)
    const gid = `mwf-flx-g-${p.index}`
    const ritardo = sorg.tipo === 'voce' && f === 1 ? `mwf-flx__rit${Math.min(ordine(sorg), 7)}` : dest.id === 'cf' ? 'mwf-flx__rit-cv' : dest.tipo === 'utile' ? 'mwf-flx__rit-cv' : ''
    return (
      <g className={`${acceso ? '' : 'mwf-flx__spento'} ${hover && acceso ? 'mwf-flx__corrente--on' : ''}`}>
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={p.sourceX} x2={p.targetX} y1={0} y2={0}>
            <stop offset="0%" stopColor={COLORE[sorg.tipo]} />
            <stop offset="100%" stopColor={COLORE[dest.tipo]} />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth={Math.max(p.linkWidth, 1)} pathLength={100}
          className={`mwf-flx__nastro ${ora ? `mwf-flx__nastro--entra ${ritardo}` : ''}`} />
      </g>
    )
  }

  if (!dati.links.length) {
    return <div className="mwf-flx mwf-flx--vuoto"><i className="fa-solid fa-water" aria-hidden="true" /> Nessun ricavo nel flusso: aggiungi un mattoncino dall'elenco.</div>
  }

  const nVoci = sorgenti.filter(s => s.conto.ricavi > 0).length
  const cento = (v: number) => Math.round((Math.abs(v) / r) * 100)
  const tappe: TappaDef[] = [
    { titolo: 'Entrano i ricavi', valore: t.ricavi, segno: '', tono: 'ric' },
    { titolo: 'Escono i costi', valore: costi, segno: '−', tono: 'cv' },
    { titolo: perdita ? 'Resta una perdita' : "Resta l'utile", valore: t.utile, segno: perdita ? '−' : '', tono: perdita ? 'perdita' : 'utile' },
  ]
  const didascalie = [
    'Il denaro sta per entrare…',
    `Entrano i ricavi di ${nVoci === 1 ? 'una voce' : `${nVoci} voci`}: ${fmtCompatto(t.ricavi)} in tutto.`,
    `Escono i costi: ${fmtCompatto(t.costiVariabili)} variabili e ${fmtCompatto(t.costiFissi)} fissi, ${cento(costi)} € ogni 100 € di ricavi.`,
    perdita
      ? `I ricavi non coprono i costi: perdita di ${fmtCompatto(-t.utile)}.`
      : `Resta l'utile: ${fmtCompatto(t.utile)}, cioè ${cento(t.utile)} € ogni 100 € di ricavi.`,
  ]

  return (
    <div className="mwf-flx-wrap">
      <Passi totale={t} nSorgenti={nVoci} fase={fase} vaiA={vaiA} ricomincia={ricomincia} tappe={tappe} didascalie={didascalie} />

      <div className="mwf-flx" role="img"
        aria-label={`Flusso: ricavi ${fmtCompatto(t.ricavi)} → costi ${fmtCompatto(costi)} (variabili ${fmtCompatto(t.costiVariabili)}, fissi ${fmtCompatto(t.costiFissi)}) → ${perdita ? 'perdita' : 'utile'} ${fmtCompatto(t.utile)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={dati}
            node={NodoSvg as any}
            link={Corrente as any}
            nodeWidth={14}
            nodePadding={26}
            iterations={64}
            sort={false}
            align="left"
            margin={{ top: 16, right: 190, bottom: 16, left: 190 }}
          />
        </ResponsiveContainer>
      </div>
    </div>
  )
}
