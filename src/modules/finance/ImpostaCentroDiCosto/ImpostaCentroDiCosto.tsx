import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import AlertBanner from '../../../core/components/AlertBanner'
import FilterToolbar from '../../../core/components/FilterToolbar'
import StatusBadge from '../../../core/components/StatusBadge'
import Tabs from '../../../core/components/Tabs'
import Tooltip from '../../../core/components/Tooltip'
import Modal from '../../../core/components/Modal'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import { InputField, SelectField, ToggleSwitch } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import './ImpostaCentroDiCosto.sass'

/**
 * Imposta centro di costo — gestione dei centri di costo per strutture
 * ricettive (hotel / turismo). Classificazione su 4 livelli:
 *   L1 Macro (Fisso / Variabile) → L2 Macro-categoria →
 *   L3 Centro di costo (area operativa) → L4 Voci di costo (analitico).
 * CRUD locale (crea / modifica / elimina) + liste precompilate importabili.
 *
 * Liste precompilate = suggerimenti su TUTTI e 4 i livelli, in quattro colonne
 * collegate (L1 → L2 → L3 → L4): ogni lista si gestisce (aggiungi, rinomina,
 * elimina; L1 è fisso: costi fissi / variabili). Le stesse liste alimentano i
 * suggerimenti della modale del centro di costo. Le voci di costo (L4) sono
 * definite e gestite nel Configuratore › Mapping costi.
 */

type Tipo = 'fisso' | 'variabile'

interface CentroCosto {
  id: number
  codice: string
  denominazione: string      // L3 — nome del centro di costo
  area: string               // area operativa della struttura
  macroCategoria: string     // L2
  tipo: Tipo                 // L1
  voci: string[]             // L4 — voci di costo analitiche
  budget_mensile: number
  utilizzo_percentuale: number
  attivo: boolean
}

// Aree operative tipiche di una struttura ricettiva (L3)
const AREE = [
  'Camere / Housekeeping', 'Ristorante & Bar', 'Reception / Front Office', 'Cucina',
  'SPA & Wellness', 'Piscina', 'Manutenzione tecnica', 'Lavanderia',
  'Amministrazione', 'Direzione', 'Marketing & Vendite',
]

// Macro-categorie di costo (L2)
const MACRO_CATEGORIE = [
  'Costi del personale', 'Spese operative', 'Manutenzioni',
  'Utenze', 'Commerciale & Marketing', 'Amministrazione & generali',
]

const FALLBACK: CentroCosto[] = [
  { id: 1, codice: 'CC-0122', denominazione: 'Ristorante & Bar', area: 'Ristorante & Bar', macroCategoria: 'Spese operative', tipo: 'variabile', voci: ['Materie prime alimentari', 'Bevande', 'Stoviglie e monouso'], budget_mensile: 12000, utilizzo_percentuale: 64, attivo: true },
  { id: 2, codice: 'CC-0123', denominazione: 'Camere / Housekeeping', area: 'Camere / Housekeeping', macroCategoria: 'Spese operative', tipo: 'variabile', voci: ['Prodotti per la pulizia', 'Biancheria', 'Cortesia camera (amenities)'], budget_mensile: 6000, utilizzo_percentuale: 48, attivo: true },
  { id: 3, codice: 'CC-0124', denominazione: 'Reception / Front Office', area: 'Reception / Front Office', macroCategoria: 'Costi del personale', tipo: 'fisso', voci: ['Stipendi receptionist', 'Contributi', 'Formazione'], budget_mensile: 9000, utilizzo_percentuale: 90, attivo: true },
  { id: 4, codice: 'CC-0125', denominazione: 'Utenze struttura', area: 'Manutenzione tecnica', macroCategoria: 'Utenze', tipo: 'fisso', voci: ['Energia elettrica', 'Acqua', 'Gas / Riscaldamento', 'Connettività'], budget_mensile: 8000, utilizzo_percentuale: 72, attivo: true },
  { id: 5, codice: 'CC-0126', denominazione: 'SPA & Wellness', area: 'SPA & Wellness', macroCategoria: 'Spese operative', tipo: 'variabile', voci: ['Prodotti per trattamenti', 'Teli e accappatoi'], budget_mensile: 3000, utilizzo_percentuale: 35, attivo: false },
]

// ─── Liste precompilate: gerarchia a 4 livelli (suggerimenti hôtellerie) ──
type Livello = 1 | 2 | 3 | 4
interface Nodo {
  id: string
  nome: string
  livello: Livello
  tipo?: Tipo
  figli?: Nodo[]
}

const LIV_META: Record<Livello, { label: string; variant: 'neutral' | 'info' | 'success' | 'warning' }> = {
  1: { label: 'L1 · Macro',           variant: 'neutral' },
  2: { label: 'L2 · Categoria',       variant: 'info' },
  3: { label: 'L3 · Centro di costo', variant: 'success' },
  4: { label: 'L4 · Voce di costo',   variant: 'warning' },
}

const GERARCHIA: Nodo[] = [
  {
    id: 'l1-f', nome: 'Costi fissi', livello: 1, tipo: 'fisso',
    figli: [
      { id: 'l2-pers', nome: 'Costi del personale', livello: 2, figli: [
        { id: 'l3-rec', nome: 'Reception / Front Office', livello: 3, figli: [
          { id: 'l4-stip-rec', nome: 'Stipendi receptionist', livello: 4 },
          { id: 'l4-contr',    nome: 'Contributi e oneri',    livello: 4 },
          { id: 'l4-form',     nome: 'Formazione del personale', livello: 4 },
        ] },
        { id: 'l3-hk-f', nome: 'Housekeeping', livello: 3, figli: [
          { id: 'l4-stip-hk', nome: 'Stipendi cameriere ai piani', livello: 4 },
        ] },
      ] },
      { id: 'l2-ut', nome: 'Utenze', livello: 2, figli: [
        { id: 'l3-str', nome: 'Struttura', livello: 3, figli: [
          { id: 'l4-en',  nome: 'Energia elettrica',     livello: 4 },
          { id: 'l4-acq', nome: 'Acqua',                 livello: 4 },
          { id: 'l4-gas', nome: 'Gas / Riscaldamento',   livello: 4 },
          { id: 'l4-net', nome: 'Connettività / Internet', livello: 4 },
        ] },
      ] },
      { id: 'l2-mn', nome: 'Manutenzioni', livello: 2, figli: [
        { id: 'l3-cam', nome: 'Camere', livello: 3, figli: [
          { id: 'l4-mat',   nome: 'Materassi',  livello: 4 },
          { id: 'l4-lamp',  nome: 'Lampadine',  livello: 4 },
          { id: 'l4-tende', nome: 'Tende e arredi', livello: 4 },
        ] },
        { id: 'l3-aree', nome: 'Aree comuni', livello: 3, figli: [
          { id: 'l4-asc',   nome: 'Ascensore',                livello: 4 },
          { id: 'l4-clima', nome: 'Impianto di climatizzazione', livello: 4 },
          { id: 'l4-pisc',  nome: 'Piscina e giardino',       livello: 4 },
        ] },
      ] },
      { id: 'l2-amm', nome: 'Amministrazione & generali', livello: 2, figli: [
        { id: 'l3-amm', nome: 'Amministrazione', livello: 3, figli: [
          { id: 'l4-assic', nome: 'Assicurazioni',           livello: 4 },
          { id: 'l4-comm',  nome: 'Commercialista',          livello: 4 },
          { id: 'l4-pms',   nome: 'Software gestionale (PMS)', livello: 4 },
          { id: 'l4-lic',   nome: 'Licenze e canoni',        livello: 4 },
        ] },
      ] },
    ],
  },
  {
    id: 'l1-v', nome: 'Costi variabili', livello: 1, tipo: 'variabile',
    figli: [
      { id: 'l2-op', nome: 'Spese operative', livello: 2, figli: [
        { id: 'l3-rist', nome: 'Ristorante & Bar', livello: 3, figli: [
          { id: 'l4-mp',   nome: 'Materie prime alimentari', livello: 4 },
          { id: 'l4-bev',  nome: 'Bevande',                  livello: 4 },
          { id: 'l4-stov', nome: 'Stoviglie e monouso',      livello: 4 },
        ] },
        { id: 'l3-hk-v', nome: 'Housekeeping', livello: 3, figli: [
          { id: 'l4-pul',   nome: 'Prodotti per la pulizia',  livello: 4 },
          { id: 'l4-bianc', nome: 'Biancheria',               livello: 4 },
          { id: 'l4-amen',  nome: 'Cortesia camera (amenities)', livello: 4 },
        ] },
        { id: 'l3-spa', nome: 'SPA & Wellness', livello: 3, figli: [
          { id: 'l4-tratt', nome: 'Prodotti per trattamenti', livello: 4 },
          { id: 'l4-teli',  nome: 'Teli e accappatoi',        livello: 4 },
        ] },
      ] },
      { id: 'l2-comm', nome: 'Commerciale & Marketing', livello: 2, figli: [
        { id: 'l3-dist', nome: 'Distribuzione', livello: 3, figli: [
          { id: 'l4-ota', nome: 'Commissioni OTA',            livello: 4 },
          { id: 'l4-cc',  nome: 'Commissioni carte di credito', livello: 4 },
        ] },
        { id: 'l3-mkt', nome: 'Marketing', livello: 3, figli: [
          { id: 'l4-adv', nome: 'Advertising online',     livello: 4 },
          { id: 'l4-promo', nome: 'Materiale promozionale', livello: 4 },
        ] },
      ] },
      { id: 'l2-pers-v', nome: 'Costi del personale', livello: 2, figli: [
        { id: 'l3-stag', nome: 'Personale extra & stagionale', livello: 3, figli: [
          { id: 'l4-stag', nome: 'Personale stagionale', livello: 4 },
          { id: 'l4-extra', nome: 'Straordinari',        livello: 4 },
        ] },
      ] },
    ],
  },
]

function foglie(n: Nodo): string[] {
  if (!n.figli?.length) return [n.id]
  return n.figli.flatMap(foglie)
}

function filtraNodi(nodi: Nodo[], q: string): Nodo[] {
  if (!q) return nodi
  const ql = q.toLowerCase()
  const walk = (n: Nodo): Nodo | null => {
    const self = n.nome.toLowerCase().includes(ql)
    const figli = n.figli?.map(walk).filter(Boolean) as Nodo[] | undefined
    if (self || (figli && figli.length)) return { ...n, figli: self ? n.figli : figli }
    return null
  }
  return nodi.map(walk).filter(Boolean) as Nodo[]
}

// ── Operazioni sull'albero dei suggerimenti (immutabili) ─────────────────
function mappa(nodi: Nodo[], f: (n: Nodo) => Nodo | null): Nodo[] {
  return nodi.map(f).filter(Boolean).map(n => (n!.figli ? { ...n!, figli: mappa(n!.figli, f) } : n!)) as Nodo[]
}
const rinominaNodo = (nodi: Nodo[], id: string, nome: string) => mappa(nodi, n => (n.id === id ? { ...n, nome } : n))
const eliminaNodo = (nodi: Nodo[], id: string) => mappa(nodi, n => (n.id === id ? null : n))
const aggiungiFiglio = (nodi: Nodo[], parentId: string, figlio: Nodo) =>
  mappa(nodi, n => (n.id === parentId ? { ...n, figli: [...(n.figli ?? []), figlio] } : n))
/** Nodi di un livello, opzionalmente dentro un antenato. */
function diLivello(nodi: Nodo[], livello: Livello): Nodo[] {
  return nodi.flatMap(n => (n.livello === livello ? [n] : diLivello(n.figli ?? [], livello)))
}
const unici = (a: string[]) => Array.from(new Set(a))

function fmtEuro(v: number): string {
  return '€ ' + v.toLocaleString('it-IT')
}

export default function ImpostaCentroDiCosto({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<CentroCosto[]>(FALLBACK)
  const [tab, setTab] = useState<'centri' | 'liste'>('centri')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('Tutte le aree')
  const [infoOpen, setInfoOpen] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CentroCosto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CentroCosto | null>(null)

  // Liste precompilate (suggerimenti, modificabili) e percorso aperto nelle colonne
  const [albero, setAlbero] = useState<Nodo[]>(GERARCHIA)
  const [listSearch, setListSearch] = useState('')
  const [percorso, setPercorso] = useState<string[]>(['l1-f', 'l2-mn', 'l3-cam'])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importate, setImportate] = useState(0)
  const confirm = useConfirmStore(st => st.confirm)
  const [inModifica, setInModifica] = useState<{ id: string; nome: string } | null>(null)

  const nextCodice = useMemo(() => {
    const nums = items.map(c => Number(c.codice.replace(/\D/g, ''))).filter(n => !Number.isNaN(n))
    const max = nums.length ? Math.max(...nums) : 121
    return `CC-${String(max + 1).padStart(4, '0')}`
  }, [items])

  const filtered = items.filter((c) => {
    const matchSearch = !search || `${c.codice} ${c.denominazione} ${c.macroCategoria}`.toLowerCase().includes(search.toLowerCase())
    const matchArea = area === 'Tutte le aree' || c.area === area
    return matchSearch && matchArea
  })

  // Paginazione (10 per pagina) — standard piattaforma
  const PAGE_SIZE = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, area, items.length])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  function utilizzoTone(perc: number): 'success' | 'warning' | 'error' {
    if (perc >= 90) return 'error'
    if (perc >= 60) return 'warning'
    return 'success'
  }

  // ── CRUD ──────────────────────────────────────────────────────────
  function apriNuovo() { setEditTarget(null); setModalOpen(true) }
  function apriModifica(c: CentroCosto) { setEditTarget(c); setModalOpen(true) }
  function salvaCentro(c: Omit<CentroCosto, 'id'>) {
    setItems(prev =>
      editTarget
        ? prev.map(x => (x.id === editTarget.id ? { ...c, id: editTarget.id } : x))
        : [{ ...c, id: Date.now() }, ...prev],
    )
    setModalOpen(false)
  }
  function eliminaCentro() {
    if (!deleteTarget) return
    setItems(prev => prev.filter(x => x.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // ── Liste precompilate ────────────────────────────────────────────
  const alberoVisibile = useMemo(() => filtraNodi(albero, listSearch), [albero, listSearch])
  const toggleNodo = (nodo: Nodo) =>
    setSelected(prev => {
      const next = new Set(prev)
      const leaves = foglie(nodo)
      const allSel = leaves.every(id => next.has(id))
      leaves.forEach(id => (allSel ? next.delete(id) : next.add(id)))
      return next
    })

  // Colonne: L1 sempre; L2/L3/L4 sono i figli del nodo aperto nella colonna precedente
  const colonne: { livello: Livello; padre?: Nodo; nodi: Nodo[] }[] = []
  colonne.push({ livello: 1, nodi: alberoVisibile })
  for (let l = 0; l < 3; l++) {
    const padre = colonne[l].nodi.find(n => n.id === percorso[l]) ?? colonne[l].nodi[0]
    colonne.push({ livello: (l + 2) as Livello, padre, nodi: padre?.figli ?? [] })
  }
  const apri = (livello: Livello, id: string) => setPercorso(p => [...p.slice(0, livello - 1), id])

  function aggiungi(livello: Livello, padre?: Nodo) {
    if (!padre) return
    const id = `u${livello}-${Date.now()}`
    const nuovo: Nodo = { id, nome: livello === 4 ? 'Nuova voce di costo' : livello === 3 ? 'Nuovo centro di costo' : 'Nuova macro-categoria', livello, ...(livello < 4 ? { figli: [] } : {}) }
    setAlbero(a => aggiungiFiglio(a, padre.id, nuovo))
    setInModifica({ id, nome: nuovo.nome })
    if (livello < 4) apri(livello, id)
  }
  function confermaNome() {
    if (!inModifica) return
    const nome = inModifica.nome.trim()
    if (nome) setAlbero(a => rinominaNodo(a, inModifica.id, nome))
    setInModifica(null)
  }
  async function elimina(n: Nodo) {
    const sotto = foglie(n).length
    const ok = await confirm({
      title: 'Elimina suggerimento',
      message: <>Eliminare <strong>{n.nome}</strong> dalle liste precompilate{n.figli?.length ? <> e i suoi {sotto} elementi collegati</> : null}? I centri di costo già configurati non cambiano.</>,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setAlbero(a => eliminaNodo(a, n.id))
    setSelected(prev => { const x = new Set(prev); foglie(n).forEach(id => x.delete(id)); return x })
  }

  function importaSelezionati() {
    if (selected.size === 0) return
    const updated = [...items]
    let max = (() => {
      const nums = items.map(c => Number(c.codice.replace(/\D/g, ''))).filter(n => !Number.isNaN(n))
      return nums.length ? Math.max(...nums) : 121
    })()
    let importedVoci = 0
    // Un centro di costo (L3) per ogni nodo con voci L4 (o sé stesso, se senza voci) selezionate,
    // classificato con il suo L2 e L1.
    for (const l1 of albero) for (const l2 of l1.figli ?? []) for (const l3 of l2.figli ?? []) {
      const vociSel = (l3.figli ?? []).filter(l4 => selected.has(l4.id)).map(l4 => l4.nome)
      const l3Sel = !(l3.figli?.length) && selected.has(l3.id)
      if (!vociSel.length && !l3Sel) continue
      importedVoci += Math.max(vociSel.length, 1)
      const existing = updated.find(c => c.denominazione === l3.nome && c.macroCategoria === l2.nome && c.tipo === l1.tipo)
      if (existing) {
        const idx = updated.indexOf(existing)
        updated[idx] = { ...existing, voci: unici([...existing.voci, ...vociSel]) }
      } else {
        max += 1
        updated.unshift({
          id: Date.now() + max,
          codice: `CC-${String(max).padStart(4, '0')}`,
          denominazione: l3.nome,
          area: l3.nome,
          macroCategoria: l2.nome,
          tipo: l1.tipo as Tipo,
          voci: vociSel,
          budget_mensile: 0,
          utilizzo_percentuale: 0,
          attivo: true,
        })
      }
    }
    setItems(updated)
    setSelected(new Set())
    setImportate(importedVoci)
    setTab('centri')
  }

  const TITOLI: Record<Livello, { tit: string; sub: string; vuoto: string }> = {
    1: { tit: 'Macro', sub: 'Costi fissi o variabili', vuoto: '' },
    2: { tit: 'Macro-categorie', sub: 'Es. Spese operative, Manutenzioni', vuoto: 'Nessuna macro-categoria' },
    3: { tit: 'Centri di costo', sub: 'Area operativa: es. Ristorante, Camere', vuoto: 'Nessun centro di costo' },
    4: { tit: 'Voci di costo', sub: 'Dettaglio analitico: es. Lampadine, Materassi', vuoto: 'Nessuna voce di costo' },
  }

  const rigaNodo = (n: Nodo, livello: Livello) => {
    const leaves = foglie(n)
    const selCount = leaves.filter(id => selected.has(id)).length
    const checked = selCount > 0 && selCount === leaves.length
    const indeterminate = selCount > 0 && selCount < leaves.length
    const aperto = livello < 4 && (percorso[livello - 1] === n.id || (!colonne[livello - 1].nodi.some(x => x.id === percorso[livello - 1]) && colonne[livello - 1].nodi[0]?.id === n.id))
    const editing = inModifica?.id === n.id
    return (
      <li key={n.id} className={`icc-col__row ${aperto ? 'icc-col__row--open' : ''}`}>
        <input
          type="checkbox" className="sib-checkbox" checked={checked}
          ref={el => { if (el) el.indeterminate = indeterminate }}
          onChange={() => toggleNodo(n)} aria-label={`Seleziona ${n.nome}`}
        />
        {editing ? (
          <input
            className="sib-input icc-col__edit" autoFocus value={inModifica!.nome}
            onChange={e => setInModifica({ id: n.id, nome: e.target.value })}
            onBlur={confermaNome}
            onKeyDown={e => { if (e.key === 'Enter') confermaNome(); if (e.key === 'Escape') setInModifica(null) }}
            aria-label="Nome"
          />
        ) : (
          <button type="button" className="icc-col__name" onClick={() => livello < 4 && apri(livello, n.id)} disabled={livello === 4}>
            {n.tipo && <i className={`fa-solid ${n.tipo === 'fisso' ? 'fa-lock' : 'fa-wave-square'} icc-col__tipo icc-col__tipo--${n.tipo}`} aria-hidden="true" />}
            <span className="icc-col__txt">{n.nome}</span>
            {livello < 4 && <span className="icc-col__count">{n.figli?.length ?? 0}</span>}
            {livello < 4 && <i className="fa-solid fa-chevron-right icc-col__chev" aria-hidden="true" />}
          </button>
        )}
        {livello > 1 && !editing && (
          <span className="icc-col__acts">
            <Tooltip text="Rinomina">
              <button type="button" className="sib-btn sib-btn--icon" aria-label={`Rinomina ${n.nome}`} onClick={() => setInModifica({ id: n.id, nome: n.nome })}>
                <i className="fa-solid fa-pen" />
              </button>
            </Tooltip>
            <Tooltip text="Elimina">
              <button type="button" className="sib-btn sib-btn--icon icc-actions__del" aria-label={`Elimina ${n.nome}`} onClick={() => elimina(n)}>
                <i className="fa-solid fa-trash" />
              </button>
            </Tooltip>
          </span>
        )}
      </li>
    )
  }

  return (
    <div>
      <PageHead title="Imposta centro di costo" subtitle="Crea e gestisci i centri di costo della struttura ricettiva, su 4 livelli dal macro all'analitico" />

      {/* Box esplicativo */}
      <div className="icc-info">
        <button type="button" className="icc-info__head" onClick={() => setInfoOpen(o => !o)} aria-expanded={infoOpen}>
          <i className="fa-light fa-circle-info" />
          <span>Cos'è un centro di costo?</span>
          <i className={`fa-light fa-chevron-${infoOpen ? 'up' : 'down'} icc-info__arrow`} />
        </button>
        {infoOpen && (
          <div className="icc-info__body">
            <p>Un <strong>centro di costo</strong> è un'area o unità della struttura a cui attribuire le spese, per capire dove vengono generati i costi e tenerli sotto controllo. La classificazione è su 4 livelli:</p>
            <ul>
              <li><StatusBadge variant="neutral">L1 · Macro</StatusBadge> Costi <strong>fissi</strong> o <strong>variabili</strong>.</li>
              <li><StatusBadge variant="info">L2 · Categoria</StatusBadge> Macro-categoria (es. Spese operative, Manutenzioni, Personale, Utenze).</li>
              <li><StatusBadge variant="success">L3 · Centro di costo</StatusBadge> Area operativa (es. Camere/Housekeeping, Ristorante & Bar, Reception, SPA).</li>
              <li><StatusBadge variant="warning">L4 · Voce di costo</StatusBadge> Dettaglio analitico (es. Materie prime, Biancheria, Energia elettrica, Commissioni OTA).</li>
            </ul>
          </div>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'centri', label: 'Centri configurati' },
          { id: 'liste',  label: 'Liste precompilate' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {tab === 'centri' && (
        <>
          {importate > 0 && (
            <AlertBanner type="success">{importate} {importate === 1 ? 'voce importata' : 'voci importate'} dalle liste precompilate nei centri configurati.</AlertBanner>
          )}
          <FilterToolbar>
            <InputField name="search" label="Ricerca" placeholder="Codice, nome o categoria" value={search} onChange={(e) => setSearch(e.target.value)} />
            <SelectField name="area" label="Area" value={area} onChange={(e) => setArea(e.target.value)} options={['Tutte le aree', ...AREE].map((r) => ({ value: r, label: r }))} />
            <button className="sib-btn sib-btn--primary" onClick={apriNuovo}>
              <i className="fa-duotone fa-plus" /> Nuovo centro
            </button>
          </FilterToolbar>

          <div className="sib-table-wrap">
            <table className="sib-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Centro di costo</th>
                  <th>Macro-categoria</th>
                  <th>Tipo</th>
                  <th>Voci</th>
                  <th>Budget mensile</th>
                  <th>Utilizzo</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c.id}>
                    <td><code>{c.codice}</code></td>
                    <td>
                      <strong>{c.denominazione}</strong>
                      <span className="icc-cell__area">{c.area}</span>
                    </td>
                    <td>{c.macroCategoria}</td>
                    <td><span className={`icc-tag icc-tag--${c.tipo}`}>{c.tipo === 'fisso' ? 'Fisso' : 'Variabile'}</span></td>
                    <td>
                      <Tooltip content={<span>{c.voci.length ? c.voci.join(', ') : 'Nessuna voce'}</span>} variant="light">
                        <span className="icc-voci-count">{c.voci.length}</span>
                      </Tooltip>
                    </td>
                    <td>{fmtEuro(c.budget_mensile)}</td>
                    <td>
                      <div className="sib-progress">
                        <div className={`sib-progress__bar sib-progress__bar--${utilizzoTone(c.utilizzo_percentuale)} icc__bar`} style={{ '--bar-w': `${c.utilizzo_percentuale}%` } as React.CSSProperties} />
                      </div>
                      <span className="sib-cell--muted">{c.utilizzo_percentuale}% utilizzato</span>
                    </td>
                    <td>{c.attivo ? <StatusBadge variant="success">Attivo</StatusBadge> : <StatusBadge variant="neutral">Disattivo</StatusBadge>}</td>
                    <td>
                      <span className="icc-actions">
                        <Tooltip text="Modifica">
                          <button className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => apriModifica(c)}>
                            <i className="fa-solid fa-pen" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Elimina">
                          <button className="sib-btn sib-btn--icon icc-actions__del" aria-label="Elimina" onClick={() => setDeleteTarget(c)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </Tooltip>
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="sib-empty">Nessun centro di costo configurato.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination className="icc-pager" page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {tab === 'liste' && (
        <div className="icc-liste">
          <p className="icc-liste__intro">
            Suggerimenti di classificazione per le strutture ricettive su tutti e 4 i livelli del modello costi.
            Clicca un elemento per vederne i figli nella colonna accanto; seleziona con la casella ciò che vuoi importare nei centri configurati.
            Ogni lista si può arricchire, rinominare o ripulire.
          </p>

          <div className="icc-liste__bar">
            <InputField
              name="listSearch" label="Cerca nelle liste" placeholder="Es. Materassi, Ristorante…"
              value={listSearch} onChange={(e) => setListSearch(e.target.value)}
            />
            <span className="icc-liste__acts">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('configuratore:costi-mapping')}>
                <i className="fa-solid fa-sitemap" /> Mapping costi
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={selected.size === 0} onClick={importaSelezionati}>
                <i className="fa-duotone fa-file-import" /> Importa selezionati ({selected.size})
              </button>
            </span>
          </div>

          <div className="icc-cols">
            {colonne.map(col => {
              const t = TITOLI[col.livello]
              const meta = LIV_META[col.livello]
              return (
                <section key={col.livello} className={`icc-col icc-col--l${col.livello}`} aria-label={`Livello ${col.livello}: ${t.tit}`}>
                  <header className="icc-col__head">
                    <span className="icc-col__lv">L{col.livello}</span>
                    <span className="icc-col__tit">
                      <strong>{t.tit}</strong>
                      <span>{col.padre ? <>in <em>{col.padre.nome}</em></> : t.sub}</span>
                    </span>
                    {col.livello > 1 && (
                      <Tooltip text={`Aggiungi a ${col.padre?.nome ?? ''}`}>
                        <button type="button" className="sib-btn sib-btn--icon icc-col__add" aria-label={`Aggiungi ${meta.label}`}
                          disabled={!col.padre} onClick={() => aggiungi(col.livello, col.padre)}>
                          <i className="fa-solid fa-plus" />
                        </button>
                      </Tooltip>
                    )}
                  </header>
                  <ul className="icc-col__list">
                    {col.nodi.length
                      ? col.nodi.map(n => rigaNodo(n, col.livello))
                      : <li className="icc-col__empty">{listSearch ? 'Nessun risultato' : t.vuoto}</li>}
                  </ul>
                  {col.livello === 1 && <p className="icc-col__nota"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Livello fisso del modello: da qui derivano perimetri e sotto-perimetri.</p>}
                  {col.livello === 4 && <p className="icc-col__nota"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Le voci di costo sono definite e gestite nel Configuratore › Mapping costi.</p>}
                </section>
              )
            })}
          </div>
        </div>
      )}

      {modalOpen && (
        <CentroCostoModal
          albero={albero}
          navigate={navigate}
          iniziale={editTarget}
          defaultCodice={nextCodice}
          onClose={() => setModalOpen(false)}
          onSave={salvaCentro}
        />
      )}

      {deleteTarget && (
        <Modal open onClose={() => setDeleteTarget(null)} title="Elimina centro di costo" size="sm">
          <div className="icc-modal__form">
            <p className="icc-modal__confirm">
              Vuoi eliminare il centro di costo <strong>{deleteTarget.denominazione}</strong> ({deleteTarget.codice})?
              L'operazione non è reversibile.
            </p>
          </div>
          <div className="icc-modal__foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setDeleteTarget(null)}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--danger" onClick={eliminaCentro}>
              <i className="fa-light fa-trash" /> Elimina
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Modale: crea / modifica centro di costo ───────────────────────────
function CentroCostoModal({
  albero, navigate, iniziale, defaultCodice, onClose, onSave,
}: {
  albero: Nodo[]
  navigate: (p: string) => void
  iniziale?: CentroCosto | null
  defaultCodice: string
  onClose: () => void
  onSave: (c: Omit<CentroCosto, 'id'>) => void
}) {
  const isEdit = !!iniziale
  const [codice, setCodice]       = useState(iniziale?.codice ?? defaultCodice)
  const [denominazione, setDenom] = useState(iniziale?.denominazione ?? '')
  const [area, setArea]           = useState(iniziale?.area ?? AREE[0])
  const [macro, setMacro]         = useState(iniziale?.macroCategoria ?? MACRO_CATEGORIE[0])
  const [tipo, setTipo]           = useState<Tipo>(iniziale?.tipo ?? 'fisso')
  const [budget, setBudget]       = useState(iniziale?.budget_mensile ?? 0)
  const [attivo, setAttivo]       = useState(iniziale?.attivo ?? true)
  const [voci, setVoci]           = useState<string[]>(iniziale?.voci ?? [])
  const [voceDraft, setVoceDraft] = useState('')

  const canSave = denominazione.trim() !== ''

  // Suggerimenti dalle liste precompilate, livello per livello
  const l1 = albero.find(n => n.tipo === tipo)
  const l2Sugg = unici([...(l1?.figli ?? []).map(n => n.nome), macro])
  const l2 = (l1?.figli ?? []).find(n => n.nome === macro)
  const l3Sugg = unici((l2 ? l2.figli ?? [] : diLivello(albero, 3)).map(n => n.nome)).filter(n => n !== denominazione)
  const l3 = l2?.figli?.find(n => n.nome === denominazione) ?? diLivello(albero, 3).find(n => n.nome === denominazione)
  const l4Sugg = unici((l3?.figli ?? []).map(n => n.nome)).filter(v => !voci.includes(v))

  function addVoce() {
    const v = voceDraft.trim()
    if (!v || voci.includes(v)) { setVoceDraft(''); return }
    setVoci(prev => [...prev, v])
    setVoceDraft('')
  }
  function removeVoce(v: string) { setVoci(prev => prev.filter(x => x !== v)) }

  function handleSave() {
    if (!canSave) return
    onSave({
      codice: codice.trim() || defaultCodice,
      denominazione: denominazione.trim(),
      area,
      macroCategoria: macro,
      tipo,
      voci,
      budget_mensile: budget,
      utilizzo_percentuale: iniziale?.utilizzo_percentuale ?? 0,
      attivo,
    })
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Modifica centro di costo' : 'Nuovo centro di costo'} size="lg">
      <div className="icc-modal__form">
        <FormGrid cols={2}>
          <InputField name="codice" label="Codice" value={codice} onChange={e => setCodice(e.target.value)} />
          <SelectField
            name="tipo" label="L1 · Tipologia (Fisso / Variabile)" value={tipo}
            onChange={e => setTipo(e.target.value as Tipo)}
            options={[{ value: 'fisso', label: 'Costo fisso' }, { value: 'variabile', label: 'Costo variabile' }]}
          />
        </FormGrid>

        <FormGrid cols={2}>
          <SelectField
            name="macro" label="L2 · Macro-categoria" value={macro}
            onChange={e => setMacro(e.target.value)}
            options={unici([...l2Sugg, ...MACRO_CATEGORIE]).map(m => ({ value: m, label: m }))}
          />
          <SelectField
            name="area" label="Area operativa" value={area}
            onChange={e => setArea(e.target.value)}
            options={AREE.map(a => ({ value: a, label: a }))}
          />
        </FormGrid>

        <div className="icc-sugg-field">
          <InputField
            name="denominazione" label="L3 · Centro di costo (denominazione)" placeholder="Es. Ristorante & Bar"
            value={denominazione} onChange={e => setDenom(e.target.value)}
          />
          {l3Sugg.length > 0 && (
            <div className="icc-sugg">
              <span className="icc-sugg__lbl"><i className="fa-solid fa-lightbulb" aria-hidden="true" /> Suggeriti in {macro}:</span>
              {l3Sugg.map(n => (
                <button key={n} type="button" className="icc-sugg__item" onClick={() => setDenom(n)}>{n}</button>
              ))}
            </div>
          )}
        </div>

        {/* L4 — voci di costo analitiche */}
        <div className="icc-voci">
          <label className="icc-voci__label">L4 · Voci di costo</label>
          <div className="icc-voci__add">
            <input
              className="sib-input"
              placeholder="Aggiungi una voce (es. Materie prime)…"
              value={voceDraft}
              onChange={e => setVoceDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVoce() } }}
            />
            <button type="button" className="sib-btn sib-btn--secondary" onClick={addVoce}>
              <i className="fa-light fa-plus" /> Aggiungi
            </button>
          </div>
          {l4Sugg.length > 0 && (
            <div className="icc-sugg">
              <span className="icc-sugg__lbl"><i className="fa-solid fa-lightbulb" aria-hidden="true" /> Suggerite per {denominazione}:</span>
              {l4Sugg.map(v => (
                <button key={v} type="button" className="icc-sugg__item" onClick={() => setVoci(prev => [...prev, v])}>
                  <i className="fa-solid fa-plus" aria-hidden="true" /> {v}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="icc-sugg__link" onClick={() => navigate('configuratore:costi-mapping')}>
            Le voci di costo si definiscono nel Configuratore › Mapping costi <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
          {voci.length > 0
            ? (
              <div className="icc-voci__chips">
                {voci.map(v => (
                  <span key={v} className="icc-voci__chip">
                    {v}
                    <button type="button" onClick={() => removeVoce(v)} aria-label={`Rimuovi ${v}`}>
                      <i className="fa-light fa-xmark" />
                    </button>
                  </span>
                ))}
              </div>
            )
            : <p className="icc-voci__empty">Nessuna voce di costo. Aggiungile manualmente o importale dalle liste precompilate.</p>}
        </div>

        <FormGrid cols={2}>
          <InputField
            name="budget" label="Budget mensile" type="number" min={0} step={50}
            iconLeft="fa-light fa-euro-sign"
            value={budget} onChange={e => setBudget(Number(e.target.value) || 0)}
          />
          <div className="icc-modal__toggle">
            <ToggleSwitch label="Centro attivo" checked={attivo} onChange={setAttivo} />
          </div>
        </FormGrid>
      </div>

      <div className="icc-modal__foot">
        <FormActions
          onCancel={onClose}
          onConfirm={handleSave}
          confirmLabel={isEdit ? 'Salva modifiche' : 'Crea centro'}
          confirmIcon="fa-check"
          confirmDisabled={!canSave}
        />
      </div>
    </Modal>
  )
}
