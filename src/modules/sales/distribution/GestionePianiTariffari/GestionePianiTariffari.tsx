import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import PageHead from '../../../../core/components/PageHead'
import FormActions from '../../../../core/components/FormActions'
import { InputField, SelectField, DatePickerField, CheckboxField } from '../../../../core/components/form'
import './GestionePianiTariffari.sass'

type Sezione = 'BAR' | 'FIT' | 'Gruppi'
type Piano = {
  id: number; nome: string; valore: string; scadenza: string
  arrangiamento: string; politica: string; children: Piano[]
}

const CATEGORIE: { id: Sezione; label: string; color: string; hasPct?: boolean }[] = [
  { id: 'BAR',    label: 'BAR',    color: T.blue },
  { id: 'FIT',    label: 'FIT',    color: '#5A8A3C', hasPct: true },
  { id: 'Gruppi', label: 'Gruppi', color: '#C4A820', hasPct: true },
]
const ARRANGIAMENTI = ['RO', 'BB', 'HB', 'FB', 'AI']
const POLITICHE = ['defaultNessunVincolo', 'NON Rimborsabile', 'Flessibile', 'Moderate', 'Strict']
const CAMERE = ['Nessuna selezione', 'Singola Classic', 'Doppia Classic', 'Tripla Classic', 'Matrimoniale Superior', 'Matrimoniale Convertibile']

const CatIco = ({ color = '#5C9CD4' }: { color?: string }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
)

let _uid = 1000
const nextId = () => ++_uid

// ── Operazioni ricorsive sull'albero ─────────────────────────────────────────
const updateNode = (nodes: Piano[], id: number, patch: Partial<Piano>): Piano[] =>
  nodes.map(n => n.id === id ? { ...n, ...patch } : { ...n, children: updateNode(n.children, id, patch) })
const addChild = (nodes: Piano[], parentId: number, child: Piano): Piano[] =>
  nodes.map(n => n.id === parentId ? { ...n, children: [...n.children, child] } : { ...n, children: addChild(n.children, parentId, child) })
const removeNode = (nodes: Piano[], id: number): Piano[] =>
  nodes.filter(n => n.id !== id).map(n => ({ ...n, children: removeNode(n.children, id) }))
const cloneTree = (n: Piano): Piano => ({ ...n, id: nextId(), nome: `${n.nome} (copia)`, children: n.children.map(cloneTree) })
const insertAfter = (nodes: Piano[], id: number, node: Piano): Piano[] =>
  nodes.flatMap(n => n.id === id ? [n, node] : [{ ...n, children: insertAfter(n.children, id, node) }])
const findNode = (nodes: Piano[], id: number): Piano | undefined => {
  for (const n of nodes) { if (n.id === id) return n; const f = findNode(n.children, id); if (f) return f }
  return undefined
}

const SEED: Record<Sezione, Piano[]> = {
  BAR: [{ id: 1, nome: 'test pippo', valore: '5,00 %', scadenza: '24/10/2025', arrangiamento: 'RO', politica: 'defaultNessunVincolo', children: [
    { id: 2, nome: 'asdasd', valore: '7,00 %', scadenza: '16/04/2026', arrangiamento: 'RO', politica: 'defaultNessunVincolo', children: [] },
    { id: 3, nome: 'sda',    valore: '5,00 %', scadenza: '16/04/2026', arrangiamento: 'RO', politica: 'defaultNessunVincolo', children: [] },
  ] }],
  FIT:    [{ id: 4, nome: 'pino',   valore: '8,00 %', scadenza: '31/03/2026', arrangiamento: 'BB', politica: 'NON Rimborsabile', children: [] }],
  Gruppi: [{ id: 5, nome: 'gruppo', valore: '6,00 %', scadenza: '23/03/2026', arrangiamento: 'BB', politica: 'NON Rimborsabile', children: [] }],
}

type EditCtx = { sezione: Sezione; parentId: number | null; parentName?: string; fromTop: boolean; editId: number | null }
const emptyForm = () => ({
  nome: '', sconto: '0.0', arrangiamento: 'RO',
  dataInizio: new Date().toISOString().split('T')[0], dataFine: new Date().toISOString().split('T')[0],
  giorni: '0', politica: '', adv: false, scontoCheck: true, dirette: true, b2c: true,
})

export default function GestionePianiTariffari({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura] = useState("Grim's Hotel")
  const [piani, setPiani] = useState<Record<Sezione, Piano[]>>(SEED)
  const [expanded, setExpanded] = useState<Set<Sezione>>(new Set<Sezione>(['BAR', 'FIT', 'Gruppi']))
  const [board, setBoard] = useState<Record<Sezione, string>>({ BAR: 'BB', FIT: 'BB', Gruppi: 'BB' })
  const [pct, setPct] = useState<Record<Sezione, string>>({ BAR: '0,00', FIT: '1,00', Gruppi: '4,00' })
  const [cameraRef, setCameraRef] = useState<Record<Sezione, string>>({ BAR: 'Doppia Classic', FIT: 'Nessuna selezione', Gruppi: 'Nessuna selezione' })

  const [showCamera, setShowCamera] = useState(false)
  const [ctx, setCtx] = useState<EditCtx | null>(null)
  const [form, setForm] = useState(emptyForm())

  const toggle = (id: Sezione) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Apri modale: dal pulsante in alto (con selettore sezione), dal + di un nodo, o in modifica.
  const openTop = () => { setCtx({ sezione: 'BAR', parentId: null, fromTop: true, editId: null }); setForm(emptyForm()) }
  const openChild = (sezione: Sezione, parent: Piano) => { setCtx({ sezione, parentId: parent.id, parentName: parent.nome, fromTop: false, editId: null }); setForm({ ...emptyForm(), arrangiamento: parent.arrangiamento }) }
  const openEdit = (sezione: Sezione, node: Piano) => {
    setCtx({ sezione, parentId: null, parentName: node.nome, fromTop: false, editId: node.id })
    setForm({ ...emptyForm(), nome: node.nome, sconto: node.valore.replace(' %', '').replace(',', '.'), arrangiamento: node.arrangiamento, politica: node.politica })
  }

  const save = () => {
    if (!ctx || !form.nome.trim()) return
    const valore = `${(parseFloat(form.sconto.replace(',', '.')) || 0).toFixed(2).replace('.', ',')} %`
    const scadenza = form.dataFine ? new Date(form.dataFine).toLocaleDateString('it-IT') : '--'
    const sez = ctx.sezione
    if (ctx.editId != null) {
      setPiani(p => ({ ...p, [sez]: updateNode(p[sez], ctx.editId!, { nome: form.nome, valore, scadenza, arrangiamento: form.arrangiamento, politica: form.politica }) }))
    } else {
      const node: Piano = { id: nextId(), nome: form.nome, valore, scadenza, arrangiamento: form.arrangiamento, politica: form.politica || 'defaultNessunVincolo', children: [] }
      setPiani(p => ({ ...p, [sez]: ctx.parentId != null ? addChild(p[sez], ctx.parentId, node) : [...p[sez], node] }))
      setExpanded(e => new Set<Sezione>([...Array.from(e), sez]))
    }
    setCtx(null)
  }
  const duplicate = (sez: Sezione, node: Piano) => setPiani(p => ({ ...p, [sez]: insertAfter(p[sez], node.id, cloneTree(node)) }))
  const del = (sez: Sezione, id: number) => setPiani(p => ({ ...p, [sez]: removeNode(p[sez], id) }))

  // ── Render ricorsivo dei nodi ──────────────────────────────────────────────
  const renderNodes = (sez: Sezione, nodes: Piano[], depth: number): React.ReactNode =>
    nodes.map(node => (
      <React.Fragment key={node.id}>
        <div className="piani__row">
          <div className="piani__tree" style={{ paddingLeft: 12 + depth * 30 }}>
            <Tooltip text="Aggiungi piano figlio">
              <button type="button" className="piani__add" onClick={() => openChild(sez, node)}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </Tooltip>
            <span className="piani__tree-line" aria-hidden="true" />
            <span className="piani__folder" aria-hidden="true">
              <i className="fa-solid fa-folder" />
              <span className="piani__folder-eur">€</span>
            </span>
          </div>
          <div className="piani__cell piani__cell--name">{node.nome}</div>
          <div className="piani__cell">{node.valore}</div>
          <div className="piani__cell">{node.scadenza}</div>
          <div className="piani__cell">{node.politica}</div>
          <div className="piani__cell piani__cell--actions">
            <button type="button" className="sib-btn sib-btn--icon w-7 h-7" title="Modifica" onClick={() => openEdit(sez, node)}><i className="fa-duotone fa-pen text-[13px]" aria-hidden="true" /></button>
            <button type="button" className="sib-btn sib-btn--icon w-7 h-7" title="Duplica" onClick={() => duplicate(sez, node)}><i className="fa-duotone fa-copy text-[13px]" aria-hidden="true" /></button>
            <button type="button" className="sib-btn sib-btn--icon w-7 h-7" title="Elimina" onClick={() => del(sez, node.id)}><i className="fa-duotone fa-trash text-[13px]" aria-hidden="true" /></button>
          </div>
        </div>
        {node.children.length > 0 && renderNodes(sez, node.children, depth + 1)}
      </React.Fragment>
    ))

  return (
    <div className="piani">
      <PageHead
        title="Gestione dei piani tariffari"
        subtitle={'Gestisci i piani tariffari in modo smart per offrire prezzi dinamici ottimizzati per ogni segmento di mercato ed evita "disparity rate" automatizzando i flussi distributivi'}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="piani__toolbar">
        <SelectField
          name="struttura" label="Strutture" value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={["Grim's Hotel", 'Hotel Noto', 'Grand Hotel Roma', 'Villa Bellini'].map(s => ({ value: s, label: s }))}
          className="piani__struttura"
        />
        <div className="piani__toolbar-spacer" aria-hidden="true" />
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setShowCamera(true)}>
          <i className="fa-light fa-bed" aria-hidden="true" /> Associa camera di riferimento
        </button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={openTop}>
          <i className="fa-light fa-circle-plus" aria-hidden="true" /> Aggiungi piano tariffario
        </button>
      </div>

      {/* ── Tabella ad albero ────────────────────────────────────────── */}
      <div className="piani__table">
        {CATEGORIE.map(cat => {
          const isExp = expanded.has(cat.id)
          return (
            <div className="piani__section" key={cat.id} style={{ ['--cat-color' as string]: cat.color }}>
              <div className="piani__section-head">
                <div className="piani__sec-id" onClick={() => toggle(cat.id)}>
                  <CatIco color={cat.color} />
                  <span className="piani__sec-label">{cat.label}</span>
                  <select className="sib-select sib-select--dense piani__sec-board" value={board[cat.id]} onClick={e => e.stopPropagation()} onChange={e => setBoard(b => ({ ...b, [cat.id]: e.target.value }))}>
                    {ARRANGIAMENTI.map(a => <option key={a}>{a}</option>)}
                  </select>
                  {cat.hasPct && (
                    <span className="piani__sec-pct" onClick={e => e.stopPropagation()}>
                      <input className="sib-input sib-input--dense" value={pct[cat.id]} onChange={e => setPct(p => ({ ...p, [cat.id]: e.target.value }))} />
                      <span className="piani__sec-pct-sign">%</span>
                    </span>
                  )}
                  <i className={`fa-solid fa-chevron-${isExp ? 'up' : 'down'} piani__sec-chevron`} aria-hidden="true" />
                </div>
                <div className="piani__th">Nome</div>
                <div className="piani__th">Valore</div>
                <div className="piani__th">Scadenza</div>
                <div className="piani__th">Politica</div>
                <div className="piani__th piani__th--center">Azioni</div>
              </div>
              {isExp && (
                (piani[cat.id].length > 0)
                  ? renderNodes(cat.id, piani[cat.id], 0)
                  : <div className="piani__empty">Nessun piano tariffario — usa “Aggiungi piano tariffario”.</div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modale Associa camera ────────────────────────────────────── */}
      <Modal open={showCamera} onClose={() => setShowCamera(false)} size="md" title="Seleziona la camera di riferimento">
        <p className="piani__camera-sub">Configurazione necessaria per la gestione del pricing</p>
        <div className="piani__camera-list">
          {CATEGORIE.map(cat => {
            const none = cameraRef[cat.id] === 'Nessuna selezione'
            return (
              <div className="piani__camera-row" key={cat.id}>
                <select className="sib-select" value={cameraRef[cat.id]} onChange={e => setCameraRef(c => ({ ...c, [cat.id]: e.target.value }))}>
                  {CAMERE.map(c => <option key={c}>{c}</option>)}
                </select>
                <i className={`fa-light ${none ? 'fa-link-slash' : 'fa-arrows-left-right'} piani__camera-link`} style={{ color: none ? '#9aa3ad' : cat.color }} aria-hidden="true" />
                <span className="piani__camera-tag" style={{ ['--cat-color' as string]: cat.color }}>
                  <CatIco color={cat.color} /> {cat.label}
                </span>
              </div>
            )
          })}
        </div>
        <FormActions onCancel={() => setShowCamera(false)} onConfirm={() => setShowCamera(false)} />
      </Modal>

      {/* ── Modale Aggiungi/Modifica piano ───────────────────────────── */}
      <Modal open={ctx !== null} onClose={() => setCtx(null)} size="md" title={ctx?.editId != null ? 'Modifica piano tariffario' : 'Aggiungi piano tariffario'}>
        {ctx && (
          <div className="piani__form">
            {!ctx.fromTop && ctx.parentName && <div className="piani__form-parent">{ctx.parentName}</div>}
            <div className="piani__form-grid">
              {ctx.fromTop && (
                <SelectField name="sezione" label="Piano Tariffario" value={ctx.sezione}
                  onChange={e => setCtx(c => c && ({ ...c, sezione: e.target.value as Sezione }))}
                  options={CATEGORIE.map(c => ({ value: c.id, label: c.label }))} />
              )}
              <InputField name="nome" label="Nome" required value={form.nome} placeholder="Name"
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <InputField name="sconto" label="Sconto Percentuale" value={form.sconto}
                onChange={e => setForm(f => ({ ...f, sconto: e.target.value }))} />
              <SelectField name="arrangiamento" label="Arrangiamento" value={form.arrangiamento}
                onChange={e => setForm(f => ({ ...f, arrangiamento: e.target.value }))}
                options={ARRANGIAMENTI.map(a => ({ value: a, label: a }))} />
              <DatePickerField name="dataInizio" label="Data inizio" value={form.dataInizio}
                onChange={e => setForm(f => ({ ...f, dataInizio: e.target.value }))} />
              <DatePickerField name="dataFine" label="Data fine" value={form.dataFine}
                onChange={e => setForm(f => ({ ...f, dataFine: e.target.value }))} />
              <InputField name="giorni" label="Giorni" type="number" value={form.giorni}
                onChange={e => setForm(f => ({ ...f, giorni: e.target.value }))} />
              <SelectField name="politica" label="Politica prenotazioni" value={form.politica}
                onChange={e => setForm(f => ({ ...f, politica: e.target.value }))}
                options={[{ value: '', label: 'Seleziona' }, ...POLITICHE.map(p => ({ value: p, label: p }))]} />
            </div>
            <div className="piani__form-checks">
              {([['adv', 'ADV'], ['scontoCheck', 'Sconto percentuale'], ['dirette', 'Dirette'], ['b2c', 'B2C']] as const).map(([k, l]) => (
                <CheckboxField key={k} name={k} label={l} className="piani__check" checked={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.checked }))} />
              ))}
            </div>
            <FormActions onCancel={() => setCtx(null)} onConfirm={save} confirmLabel="Salva" confirmDisabled={!form.nome.trim()} />
          </div>
        )}
      </Modal>
    </div>
  )
}
