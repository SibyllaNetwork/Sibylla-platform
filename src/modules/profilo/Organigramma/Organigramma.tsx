import React, { useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { useRuoliStore } from '../../../store/useRuoliStore'
import { avatarUrl } from '../../../core/avatar'
import './Organigramma.sass'

// ── Modello dati ──────────────────────────────────────────────────────────────
interface Ruolo   { id: string; nome: string; sigla: string; colore: string }
interface Profilo { id: string; nome: string; initials: string; colore: string; seed?: string }
interface Nodo    { id: string; parentId: string | null; ruolo: Ruolo; profili: Profilo[] }

// Ruolo radice fisso: Amministratore — sempre presente, non eliminabile
const ADMIN: Ruolo = { id: 'r-admin', nome: 'Amministratore', sigla: 'AMM', colore: '#204769' }

// Palette assegnata ai ruoli importati da "Ruoli & funzioni"
const ROLE_PALETTE = ['#5C9CD4', '#5A8A3C', '#E07B39', '#9B59B6', '#C4A820', '#E74C3C', '#1ABC9C', '#204769']
const siglaDa = (nome: string) => {
  const w = nome.trim().split(/\s+/).filter(Boolean)
  return (w.length === 1 ? w[0].slice(0, 3) : w.map(x => x[0]).join('').slice(0, 3)).toUpperCase()
}

type DragPayload = { kind: 'ruolo' | 'profilo' | 'nodo'; id: string }

export default function Organigramma({ navigate }: { navigate: (p: string) => void }) {
  // Ruoli e profili importati dalla pagina "Ruoli & funzioni" (store condiviso)
  const ruoliCfg   = useRuoliStore(s => s.ruoli)
  const profiliCfg = useRuoliStore(s => s.profili)
  const RUOLI: Ruolo[]   = ruoliCfg.map((r, i)   => ({ id: `r-${i}`, nome: r.nome, sigla: siglaDa(r.nome), colore: ROLE_PALETTE[i % ROLE_PALETTE.length] }))
  const PROFILI: Profilo[] = profiliCfg.map((p, i) => ({ id: `p-${i}`, nome: p.nome, initials: p.initials, colore: p.color, seed: p.seed }))

  // Si parte dal ruolo Amministratore (radice non eliminabile)
  const [nodi, setNodi] = useState<Nodo[]>([
    { id: 'admin', parentId: null, ruolo: ADMIN, profili: [] },
  ])
  const seq = useRef(1)
  const newId = () => `n${seq.current++}`

  const [ruoloCollapsed,   setRuoloCollapsed]   = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saved,   setSaved]   = useState(false)
  const [logo,    setLogo]    = useState<string | null>(null)
  // menu "scegli ruolo" per aggiungere un pari livello / sotto-livello con un click
  const [addMenu, setAddMenu] = useState<{ nodoId: string; mode: 'sibling' | 'child' } | null>(null)

  // ── Helpers albero ──
  const figli = (id: string | null) => nodi.filter(n => n.parentId === id)
  const discendentiIds = (id: string): string[] => {
    const out: string[] = []
    const walk = (pid: string) => figli(pid).forEach(c => { out.push(c.id); walk(c.id) })
    walk(id)
    return out
  }

  // ── Drag & drop ──
  const dragStart = (e: React.DragEvent, kind: DragPayload['kind'], id: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind, id }))
    e.dataTransfer.effectAllowed = 'move'
  }
  const allowDrop = (e: React.DragEvent) => e.preventDefault()
  const parse = (e: React.DragEvent): DragPayload | null => {
    try { return JSON.parse(e.dataTransfer.getData('text/plain')) } catch { return null }
  }

  const aggiungiNodo = (ruoloId: string, parentId: string | null) => {
    const ruolo = RUOLI.find(r => r.id === ruoloId)
    if (!ruolo) return
    setNodi(p => [...p, { id: newId(), parentId, ruolo, profili: [] }])
  }
  const aggiungiProfilo = (nodoId: string, profiloId: string) => {
    const prof = PROFILI.find(p => p.id === profiloId)
    if (!prof) return
    setNodi(p => p.map(n =>
      n.id === nodoId && !n.profili.some(x => x.id === prof.id)
        ? { ...n, profili: [...n.profili, prof] }
        : n))
  }
  const sposta = (nodoId: string, nuovoParent: string | null) => {
    if (nodoId === nuovoParent) return
    if (nuovoParent && discendentiIds(nodoId).includes(nuovoParent)) return  // niente cicli
    setNodi(p => p.map(n => n.id === nodoId ? { ...n, parentId: nuovoParent } : n))
  }

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const d = parse(e); if (!d) return
    if (d.kind === 'ruolo')     aggiungiNodo(d.id, null)
    else if (d.kind === 'nodo') sposta(d.id, null)
    // 'profilo' sul canvas vuoto: ignorato (serve prima un box con ruolo)
  }
  const onNodoDrop = (e: React.DragEvent, nodoId: string) => {
    e.preventDefault(); e.stopPropagation()
    const d = parse(e); if (!d) return
    if (d.kind === 'ruolo')        aggiungiNodo(d.id, nodoId)   // nuovo livello (figlio)
    else if (d.kind === 'profilo') aggiungiProfilo(nodoId, d.id)
    else if (d.kind === 'nodo')    sposta(d.id, nodoId)
  }

  const rimuoviNodo = (id: string) => {
    if (id === 'admin') return  // il ruolo Amministratore non è eliminabile
    const toRemove = new Set([id, ...discendentiIds(id)])
    setNodi(p => p.filter(n => !toRemove.has(n.id)))
  }
  const rimuoviProfilo = (nodoId: string, profiloId: string) =>
    setNodi(p => p.map(n => n.id === nodoId ? { ...n, profili: n.profili.filter(x => x.id !== profiloId) } : n))

  const startEdit = (n: Nodo) => { setEditId(n.id); setEditVal(n.ruolo.nome) }
  const commitEdit = () => {
    if (editId) setNodi(p => p.map(n => n.id === editId ? { ...n, ruolo: { ...n.ruolo, nome: editVal.trim() || n.ruolo.nome } } : n))
    setEditId(null); setEditVal('')
  }

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  const handlePdf  = () => window.print()

  // ── Render ricorsivo nodo ──
  const renderNodo = (n: Nodo) => {
    const sub = figli(n.id)
    const editing = editId === n.id
    const isAdmin = n.id === 'admin'
    return (
      <li key={n.id}>
        <div
          className={`org__node ${isAdmin ? 'org__node--admin' : ''}`}
          style={{ '--node-color': n.ruolo.colore } as React.CSSProperties}
          draggable={!editing && !isAdmin}
          onDragStart={e => { e.stopPropagation(); dragStart(e, 'nodo', n.id) }}
          onDragOver={allowDrop}
          onDrop={e => onNodoDrop(e, n.id)}>
          <div className="org__node-head">
            {editing
              ? <input
                  className="org__node-edit" autoFocus value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditId(null); setEditVal('') } }}/>
              : <span className="org__node-role">{n.ruolo.nome}</span>}
            <div className="org__node-actions">
              <button type="button" title="Rinomina" onClick={() => startEdit(n)}><i className="fa-light fa-pen"/></button>
              {!isAdmin && <button type="button" title="Elimina" onClick={() => rimuoviNodo(n.id)}><i className="fa-light fa-trash"/></button>}
            </div>
          </div>
          <div className="org__node-profili">
            {n.profili.length === 0
              ? <span className="org__node-empty">Trascina qui un profilo</span>
              : n.profili.map(p => (
                  <span key={p.id} className="org__node-chip" style={{ '--c': p.colore } as React.CSSProperties}>
                    <span className="org__avatar" style={{ '--c': p.colore } as React.CSSProperties}>
                      <img src={avatarUrl(p.seed || p.nome)} alt={p.nome}/>
                    </span>
                    <span className="org__node-chip-name">{p.nome}</span>
                    <button type="button" className="org__node-chip-x" title="Rimuovi" onClick={() => rimuoviProfilo(n.id, p.id)}>
                      <i className="fa-light fa-xmark"/>
                    </button>
                  </span>
                ))}
          </div>

          {/* Aggiunta rapida pari livello / sotto-livello */}
          <div className="org__node-add">
            <button type="button"
              className={`org__node-add-btn ${addMenu?.nodoId === n.id && addMenu.mode === 'sibling' ? 'org__node-add-btn--on' : ''}`}
              onClick={e => { e.stopPropagation(); setAddMenu(m => m?.nodoId === n.id && m.mode === 'sibling' ? null : { nodoId: n.id, mode: 'sibling' }) }}>
              <i className="fa-light fa-plus"/> Pari livello
            </button>
            <button type="button"
              className={`org__node-add-btn ${addMenu?.nodoId === n.id && addMenu.mode === 'child' ? 'org__node-add-btn--on' : ''}`}
              onClick={e => { e.stopPropagation(); setAddMenu(m => m?.nodoId === n.id && m.mode === 'child' ? null : { nodoId: n.id, mode: 'child' }) }}>
              <i className="fa-light fa-plus"/> Sotto-livello
            </button>
          </div>

          {addMenu?.nodoId === n.id && (
            <div className="org__role-menu" onClick={e => e.stopPropagation()}>
              <div className="org__role-menu-title">
                {addMenu.mode === 'sibling' ? 'Pari livello — scegli il ruolo' : 'Sotto-livello — scegli il ruolo'}
              </div>
              {RUOLI.map(r => (
                <button key={r.id} type="button" className="org__role-menu-item"
                  onClick={() => { aggiungiNodo(r.id, addMenu.mode === 'child' ? n.id : n.parentId); setAddMenu(null) }}>
                  <span className="org__src-sigla" style={{ '--c': r.colore } as React.CSSProperties}>{r.sigla}</span>
                  {r.nome}
                </button>
              ))}
            </div>
          )}
        </div>
        {sub.length > 0 && <ul>{sub.map(renderNodo)}</ul>}
      </li>
    )
  }

  const radici = figli(null)

  return (
    <div className="org">
      <BtnBack onClick={() => navigate('home')}/>
      <PageHeader title="Organigramma" subtitle="Costruisci l'organigramma aziendale trascinando ruoli e profili nel diagramma"/>

      {saved && <AlertBanner type="success" className="org__saved">Organigramma salvato con successo</AlertBanner>}

      {/* ── Azioni in alto a destra ─────────────────────────────────── */}
      <div className="org__toolbar">
        <button type="button" className="sib-btn sib-btn--icon" title="Scarica PDF" aria-label="Scarica PDF" onClick={handlePdf}>
          <i className="fa-light fa-file-pdf"/>
        </button>
        <button type="button" className="sib-btn sib-btn--icon" title="Salva modifiche" aria-label="Salva modifiche" onClick={handleSave}>
          <i className="fa-light fa-floppy-disk"/>
        </button>
      </div>

      {/* ── Layout: colonne sorgente + canvas ───────────────────────── */}
      <div className="org__layout">

        {/* Sidebar sinistra */}
        <div className={`org__sidebar ${sidebarCollapsed ? 'org__sidebar--collapsed' : ''}`}>
          {sidebarCollapsed ? (
            <button type="button" className="org__expand-all" title="Espandi" onClick={() => setSidebarCollapsed(false)}>
              <i className="fa-light fa-angles-right"/>
            </button>
          ) : (
            <>
              {/* Colonna Ruolo */}
              <div className={`org__col ${ruoloCollapsed ? 'org__col--collapsed' : ''}`}>
                {ruoloCollapsed ? (
                  <button type="button" className="org__col-expand" title="Espandi ruoli" onClick={() => setRuoloCollapsed(false)}>
                    <i className="fa-light fa-angles-right"/><span>Ruolo</span>
                  </button>
                ) : (
                  <>
                    <div className="org__col-title">Ruolo</div>
                    <div className="org__col-list">
                      {RUOLI.map(r => (
                        <div key={r.id} className="org__src-ruolo" draggable
                          onDragStart={e => dragStart(e, 'ruolo', r.id)}
                          style={{ '--c': r.colore } as React.CSSProperties}>
                          <span className="org__src-sigla">{r.sigla}</span>
                          <span className="org__src-nome">{r.nome}</span>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="org__col-collapse" onClick={() => setRuoloCollapsed(true)}>
                      <i className="fa-light fa-angles-left"/> Riduci solo ruolo
                    </button>
                  </>
                )}
              </div>

              {/* Colonna Profilo */}
              <div className="org__col">
                <div className="org__col-title">Profilo</div>
                <div className="org__col-list">
                  {PROFILI.map(p => (
                    <div key={p.id} className="org__src-prof" draggable
                      onDragStart={e => dragStart(e, 'profilo', p.id)}>
                      <span className="org__avatar" style={{ '--c': p.colore } as React.CSSProperties}>
                        <img src={avatarUrl(p.seed || p.nome)} alt={p.nome}/>
                      </span>
                      <span className="org__src-nome">{p.nome}</span>
                    </div>
                  ))}
                </div>
                <button type="button" className="org__col-collapse" onClick={() => setSidebarCollapsed(true)}>
                  <i className="fa-light fa-angles-left"/> Riduci tutto
                </button>
              </div>
            </>
          )}
        </div>

        {/* Canvas organigramma (area stampabile per il PDF) */}
        <div className="org__main">
          <div className="org__print-area">
            <div className="org__logo-bar">
              <label className="org__logo" title="Carica il logo dell'impresa">
                {logo ? <img src={logo} alt="Logo impresa"/> : <span className="org__logo-ph">Logo impresa</span>}
                <input type="file" accept="image/*" hidden onChange={onLogo}/>
              </label>
              <span className="org__company">Organigramma</span>
            </div>

            <div className="org__canvas" onDragOver={allowDrop} onDrop={onCanvasDrop} onClick={() => setAddMenu(null)}>
              {radici.length === 0
                ? <div className="org__hint">Trascina un <strong>ruolo</strong> qui per creare il primo blocco</div>
                : <ul className="org__tree">{radici.map(renderNodo)}</ul>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
