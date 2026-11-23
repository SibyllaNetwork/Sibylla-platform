import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, Sankey } from 'recharts'
import { Conto, fmtCompatto, fmtPct } from './mwfData'
import { Passi, useRacconto } from './MwfRacconto'

/**
 * Flusso del denaro raccontato in 5 tempi (Sankey):
 *   1. entrano i ricavi, un segmento alla volta, e riempiono la colonna Ricavi;
 *   2. escono i costi variabili (costi di camera e commissioni);
 *   3. resta il margine di contribuzione;
 *   4. si pagano i costi fissi;
 *   5. resta l'utile (o la perdita).
 * Ogni tempo disegna le sue correnti e accende la sua tappa nella barra dei
 * passaggi, con il contatore dell'importo. "Riproduci" ricomincia il racconto;
 * cliccando una tappa ci si ferma lì.
 */
export interface Sorgente { id: string; nome: string; conto: Conto }

type Tipo = 'sorgente' | 'ricavi' | 'cv' | 'costo' | 'mdc' | 'cf' | 'utile' | 'perdita'
interface Nodo { name: string; tipo: Tipo; valore: number; idx?: number }

const COLORE: Record<Tipo, string> = {
  sorgente: 'var(--chart-1)',
  ricavi: 'var(--chart-1)',
  cv: 'var(--chart-6)',
  costo: 'var(--chart-6)',
  mdc: 'var(--chart-5)',
  cf: 'var(--chart-4)',
  utile: 'var(--color-success)',
  perdita: 'var(--color-error)',
}
const coloreNodo = (n: Nodo) => (n.tipo === 'sorgente' ? `var(--chart-${((n.idx ?? 0) % 8) + 1})` : COLORE[n.tipo])

// Tempo del racconto in cui compare ogni nodo / corrente
const FASE_NODO: Record<Tipo, number> = { sorgente: 1, ricavi: 1, cv: 2, costo: 2, mdc: 3, cf: 4, utile: 5, perdita: 5 }
const faseCorrente = (s: Nodo, t: Nodo) =>
  s.tipo === 'sorgente' ? 1
  : t.tipo === 'cv' || s.tipo === 'cv' ? 2
  : t.tipo === 'mdc' ? 3
  : t.tipo === 'cf' && s.tipo === 'mdc' ? 4
  : 5

const PASSO_MS = 1700

export default function MwfFlusso({ sorgenti, totale, riproduci }: { sorgenti: Sorgente[]; totale: Conto; riproduci: string }) {
  const [hover, setHover] = useState<string | null>(null)
  const { fase, still, vaiA, ricomincia } = useRacconto(riproduci, PASSO_MS)

  const dati = useMemo(() => {
    const attive = sorgenti.filter(s => s.conto.ricavi > 0)
    const nodes: Nodo[] = attive.map(s => ({ name: s.nome, tipo: 'sorgente', valore: s.conto.ricavi, idx: sorgenti.indexOf(s) }))
    const I = (name: string) => nodes.findIndex(n => n.name === name)
    const add = (n: Nodo) => { nodes.push(n); return nodes.length - 1 }
    const t = totale
    const iRic = add({ name: 'Ricavi', tipo: 'ricavi', valore: t.ricavi })
    const iCv = add({ name: 'Costi variabili', tipo: 'cv', valore: t.costiVariabili })
    const iMdc = add({ name: 'Margine di contribuzione', tipo: 'mdc', valore: t.mdc })
    const iCam = add({ name: 'Costi di camera', tipo: 'costo', valore: t.costiCamera })
    const iCom = add({ name: 'Commissioni', tipo: 'costo', valore: t.commissioni })
    const iCf = add({ name: 'Costi fissi', tipo: 'cf', valore: t.costiFissi })
    const links: { source: number; target: number; value: number }[] = attive.map(s => ({ source: I(s.nome), target: iRic, value: s.conto.ricavi }))
    links.push({ source: iRic, target: iCv, value: t.costiVariabili })
    links.push({ source: iCv, target: iCam, value: t.costiCamera })
    links.push({ source: iCv, target: iCom, value: t.commissioni })
    if (t.mdc > 0) {
      links.push({ source: iRic, target: iMdc, value: t.mdc })
      if (t.utile >= 0) {
        links.push({ source: iMdc, target: iCf, value: t.costiFissi })
        const iUt = add({ name: 'Utile', tipo: 'utile', valore: t.utile })
        if (t.utile > 0) links.push({ source: iMdc, target: iUt, value: t.utile })
      } else {
        links.push({ source: iMdc, target: iCf, value: t.mdc })
        const iPe = add({ name: 'Perdita', tipo: 'perdita', valore: t.utile })
        links.push({ source: iPe, target: iCf, value: -t.utile })
      }
    }
    return { nodes, links: links.filter(l => l.value > 0) }
  }, [sorgenti, totale])

  const r = totale.ricavi || 1
  const ordine = (n: Nodo) => Math.max(0, dati.nodes.filter(x => x.tipo === 'sorgente').findIndex(x => x.name === n.name))

  // ── Nodo: compare nel suo tempo, la barra cresce ─────────────────────────
  const NodoSvg = (p: any) => {
    const n: Nodo = p.payload
    const f = FASE_NODO[n.tipo]
    if (f > fase) return <g />
    const ora = f === fase && !still
    const sinistra = n.tipo === 'sorgente'
    const spento = hover && hover !== n.name
    const x = sinistra ? p.x - 8 : p.x + p.width + 8
    const cy = p.y + p.height / 2
    const ritardo = n.tipo === 'ricavi' ? 'mwf-flx__rit-r' : n.tipo === 'costo' ? 'mwf-flx__rit-cv' : sinistra ? `mwf-flx__rit${Math.min(ordine(n), 7)}` : ''
    return (
      <g className={`mwf-flx__nodo ${spento ? 'mwf-flx__spento' : ''}`}
        onMouseEnter={() => setHover(n.name)} onMouseLeave={() => setHover(null)}>
        <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 2)} fill={coloreNodo(n)}
          className={ora ? `mwf-flx__cresce ${ritardo}` : ''} />
        <g className={ora ? `mwf-flx__appare ${ritardo}` : ''}>
          <text x={x} y={cy - 3} textAnchor={sinistra ? 'end' : 'start'} className={`mwf-flx__nome mwf-flx__nome--${n.tipo}`}>{n.name}</text>
          <text x={x} y={cy + 13} textAnchor={sinistra ? 'end' : 'start'} className="mwf-flx__val">
            {n.tipo === 'cv' || n.tipo === 'costo' || n.tipo === 'cf' ? '−' : ''}{fmtCompatto(n.valore)}{n.tipo !== 'ricavi' && ` · ${fmtPct(Math.abs(n.valore) / r, 0)}`}
          </text>
        </g>
      </g>
    )
  }

  // ── Corrente: si disegna nel suo tempo (i segmenti uno dopo l'altro) ─────
  const Corrente = (p: any) => {
    const sorg: Nodo = p.payload.source
    const dest: Nodo = p.payload.target
    const f = faseCorrente(sorg, dest)
    if (f > fase) return <g />
    const ora = f === fase && !still
    const d = `M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`
    const acceso = !hover || hover === sorg.name || hover === dest.name
    const gid = `mwf-flx-g-${p.index}`
    const ritardo = sorg.tipo === 'sorgente' ? `mwf-flx__rit${Math.min(ordine(sorg), 7)}` : sorg.tipo === 'cv' ? 'mwf-flx__rit-cv' : ''
    return (
      <g className={`${acceso ? '' : 'mwf-flx__spento'} ${hover && acceso ? 'mwf-flx__corrente--on' : ''}`}>
        <defs>
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={p.sourceX} x2={p.targetX} y1={0} y2={0}>
            <stop offset="0%" stopColor={coloreNodo(sorg)} />
            <stop offset="100%" stopColor={coloreNodo(dest)} />
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

  const nSorgenti = dati.nodes.filter(n => n.tipo === 'sorgente').length

  return (
    <div className="mwf-flx-wrap">
      <Passi totale={totale} nSorgenti={nSorgenti} fase={fase} vaiA={vaiA} ricomincia={ricomincia} />

      <div className="mwf-flx" role="img"
        aria-label={`Flusso: ricavi ${fmtCompatto(totale.ricavi)} → costi variabili ${fmtCompatto(totale.costiVariabili)}, margine ${fmtCompatto(totale.mdc)} → costi fissi ${fmtCompatto(totale.costiFissi)}, utile ${fmtCompatto(totale.utile)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={dati}
            node={NodoSvg as any}
            link={Corrente as any}
            nodeWidth={14}
            nodePadding={26}
            iterations={64}
            sort={false}
            margin={{ top: 16, right: 170, bottom: 16, left: 120 }}
          />
        </ResponsiveContainer>
      </div>
    </div>
  )
}
