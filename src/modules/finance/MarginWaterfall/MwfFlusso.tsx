import React, { useMemo, useState } from 'react'
import { ResponsiveContainer, Sankey } from 'recharts'
import { reducedMotion } from '../../../core/bi'
import { Conto, fmtCompatto, fmtPct } from './mwfData'

/**
 * Flusso del denaro (Sankey): i ricavi di ogni segmento (o tipologia) entrano
 * da sinistra e confluiscono nei Ricavi; da lì il denaro si divide fra costi
 * variabili (che defluiscono in costi di camera e commissioni) e margine di
 * contribuzione, che a sua volta si divide fra costi fissi e utile. Lo spessore
 * di ogni corrente è l'importo; le particelle che scorrono rendono visibile il
 * flusso. Passando su un nodo o una corrente si legge il dettaglio.
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

export default function MwfFlusso({ sorgenti, totale }: { sorgenti: Sorgente[]; totale: Conto }) {
  const still = reducedMotion()
  const [hover, setHover] = useState<string | null>(null)

  const dati = useMemo(() => {
    const attive = sorgenti.filter(s => s.conto.ricavi > 0)
    const nodes: Nodo[] = attive.map((s, i) => ({ name: s.nome, tipo: 'sorgente', valore: s.conto.ricavi, idx: sorgenti.indexOf(s) }))
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
        // Il margine non basta: la perdita copre il resto dei costi fissi
        links.push({ source: iMdc, target: iCf, value: t.mdc })
        const iPe = add({ name: 'Perdita', tipo: 'perdita', valore: t.utile })
        links.push({ source: iPe, target: iCf, value: -t.utile })
      }
    }
    return { nodes, links: links.filter(l => l.value > 0) }
  }, [sorgenti, totale])

  const r = totale.ricavi || 1

  // ── Nodo: barra + etichetta (nome, importo, % dei ricavi) ────────────────
  const Nodo = (p: any) => {
    const n: Nodo = p.payload
    const sinistra = n.tipo === 'sorgente'
    const spento = hover && hover !== n.name
    const x = sinistra ? p.x - 8 : p.x + p.width + 8
    const anchor = sinistra ? 'end' : 'start'
    const cy = p.y + p.height / 2
    return (
      <g className={`mwf-flx__nodo ${spento ? 'mwf-flx__spento' : ''}`}
        onMouseEnter={() => setHover(n.name)} onMouseLeave={() => setHover(null)}>
        <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 2)} rx={3} fill={coloreNodo(n)} />
        <text x={x} y={cy - 3} textAnchor={anchor} className={`mwf-flx__nome mwf-flx__nome--${n.tipo}`}>{n.name}</text>
        <text x={x} y={cy + 13} textAnchor={anchor} className="mwf-flx__val">
          {n.tipo === 'perdita' ? '' : ''}{fmtCompatto(n.valore)}{n.tipo !== 'ricavi' && ` · ${fmtPct(n.valore / r, 0)}`}
        </text>
      </g>
    )
  }

  // ── Corrente: nastro + particelle che scorrono ───────────────────────────
  const Corrente = (p: any) => {
    const d = `M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`
    const sorg: Nodo = p.payload.source
    const dest: Nodo = p.payload.target
    const colore = sorg.tipo === 'sorgente' ? coloreNodo(sorg) : coloreNodo(dest)
    const acceso = !hover || hover === sorg.name || hover === dest.name
    const n = Math.max(1, Math.min(7, Math.round(p.linkWidth / 9)))
    const dur = 3.2
    return (
      <g className={acceso ? '' : 'mwf-flx__spento'}>
        <path d={d} fill="none" stroke={colore} strokeWidth={Math.max(p.linkWidth, 1)} className="mwf-flx__nastro" />
        {!still && Array.from({ length: n }, (_, i) => (
          <circle key={i} r={Math.max(1.5, Math.min(3.5, p.linkWidth / 6))} className="mwf-flx__goccia"
            cy={((i % 3) - 1) * Math.min(p.linkWidth / 3, 8)}>
            <animateMotion dur={`${dur}s`} begin={`${(i * dur) / n}s`} repeatCount="indefinite" path={d} />
          </circle>
        ))}
      </g>
    )
  }

  if (!dati.links.length) {
    return <div className="mwf-flx mwf-flx--vuoto"><i className="fa-solid fa-water" aria-hidden="true" /> Nessun ricavo nel flusso: aggiungi un mattoncino dall'elenco.</div>
  }

  return (
    <div className="mwf-flx" role="img"
      aria-label={`Flusso: ricavi ${fmtCompatto(totale.ricavi)} → costi variabili ${fmtCompatto(totale.costiVariabili)}, margine ${fmtCompatto(totale.mdc)} → costi fissi ${fmtCompatto(totale.costiFissi)}, utile ${fmtCompatto(totale.utile)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={dati}
          node={Nodo as any}
          link={Corrente as any}
          nodeWidth={14}
          nodePadding={26}
          iterations={64}
          sort={false}
          margin={{ top: 16, right: 170, bottom: 16, left: 120 }}
        />
      </ResponsiveContainer>
    </div>
  )
}
