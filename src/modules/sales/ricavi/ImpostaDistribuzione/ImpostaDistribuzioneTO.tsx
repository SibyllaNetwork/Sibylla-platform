import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { SelectField } from '../../../../core/components/form'
import './ImpostaDistribuzioneTO.sass'

// ─── Imposta distribuzione — versione Tour Operator ───────────────────────────
// Stessa logica della versione Platform: filtri Destinazione/Categoria, linguette
// laterali per tipo struttura (Hotel / B&B / Appartamento / Cluster) — che sono
// anche il filtro della colonna "Strutture" — e una griglia con N. camere,
// Categoria (stelle), Capacità di spesa (€) e Mercato (bandiere nazionalità).

type Tipo = 'hotel' | 'bb' | 'appartamento' | 'cluster'

interface Struttura {
  id: number
  nome: string
  tipo: Exclude<Tipo, 'cluster'>
  destinazione: string
  camere: number
  stelle: number
  spesa: 1 | 2 | 3
  mercati: string[]   // ISO 3166-1 alpha-2
}

interface Cluster {
  id: number
  nome: string
  strutture: number[]
}

const TABS: { key: Tipo; label: string; icon: string }[] = [
  { key: 'hotel',        label: 'Hotel',        icon: 'fa-hotel' },
  { key: 'bb',           label: 'B&B',          icon: 'fa-bed' },
  { key: 'appartamento', label: 'Appartamento', icon: 'fa-building' },
  { key: 'cluster',      label: 'Cluster',      icon: 'fa-diagram-project' },
]
const TIPO_ICON: Record<string, string> = { hotel: 'fa-hotel', bb: 'fa-bed', appartamento: 'fa-building' }

const STRUTTURE: Struttura[] = [
  { id: 1,  nome: 'Hotel Domus Aurelia',  tipo: 'hotel',        destinazione: 'Roma',    camere: 120, stelle: 4, spesa: 2, mercati: ['it', 'de', 'es'] },
  { id: 2,  nome: 'Grand Hotel Colonna',  tipo: 'hotel',        destinazione: 'Roma',    camere: 210, stelle: 5, spesa: 3, mercati: ['it', 'us', 'gb'] },
  { id: 3,  nome: 'Trastevere B&B',       tipo: 'bb',           destinazione: 'Roma',    camere: 14,  stelle: 3, spesa: 1, mercati: ['it', 'fr'] },
  { id: 4,  nome: 'Aventino Suites',      tipo: 'appartamento', destinazione: 'Roma',    camere: 22,  stelle: 4, spesa: 2, mercati: ['it', 'de'] },
  { id: 5,  nome: 'Hotel Arno Palace',    tipo: 'hotel',        destinazione: 'Firenze', camere: 95,  stelle: 4, spesa: 2, mercati: ['it', 'jp', 'us'] },
  { id: 6,  nome: 'Oltrarno B&B',         tipo: 'bb',           destinazione: 'Firenze', camere: 10,  stelle: 3, spesa: 1, mercati: ['it', 'gb'] },
  { id: 7,  nome: 'Duomo Apartments',     tipo: 'appartamento', destinazione: 'Firenze', camere: 18,  stelle: 4, spesa: 2, mercati: ['it', 'de', 'ch'] },
  { id: 8,  nome: 'Hotel Brera Centrale', tipo: 'hotel',        destinazione: 'Milano',  camere: 140, stelle: 4, spesa: 3, mercati: ['it', 'cn', 'us'] },
  { id: 9,  nome: 'Navigli B&B',          tipo: 'bb',           destinazione: 'Milano',  camere: 12,  stelle: 3, spesa: 1, mercati: ['it', 'fr', 'es'] },
  { id: 10, nome: 'Porta Nuova Lofts',    tipo: 'appartamento', destinazione: 'Milano',  camere: 30,  stelle: 5, spesa: 3, mercati: ['it', 'ae', 'us'] },
  { id: 11, nome: 'Hotel Vesuvio Royal',  tipo: 'hotel',        destinazione: 'Napoli',  camere: 110, stelle: 5, spesa: 3, mercati: ['it', 'de', 'gb'] },
  { id: 12, nome: 'Mergellina B&B',       tipo: 'bb',           destinazione: 'Napoli',  camere: 9,   stelle: 3, spesa: 1, mercati: ['it', 'fr'] },
]
const MAX_CAMERE = Math.max(...STRUTTURE.map(s => s.camere))

const DESTINAZIONI = ['Tutte', ...Array.from(new Set(STRUTTURE.map(s => s.destinazione)))]
const CATEGORIE = ['Tutte', '3 stelle', '4 stelle', '5 stelle']

function Stars({ n }: { n: number }) {
  return (
    <span className="impdto__stars">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={`fa-solid fa-star impdto__star${i < n ? ' impdto__star--on' : ''}`} aria-hidden="true" />
      ))}
    </span>
  )
}

function Spesa({ n }: { n: number }) {
  return (
    <span className="impdto__spesa" title={`Capacità di spesa ${n}/3`}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className={`impdto__euro${i < n ? ' impdto__euro--on' : ''}`}>€</span>
      ))}
    </span>
  )
}

function Flags({ codes }: { codes: string[] }) {
  return (
    <span className="impdto__flags">
      {codes.map((c, i) => (
        <img key={i} className="impdto__flag"
          src={`https://flagcdn.com/w40/${c}.png`} srcSet={`https://flagcdn.com/w80/${c}.png 2x`}
          alt={c.toUpperCase()} title={c.toUpperCase()} loading="lazy" />
      ))}
    </span>
  )
}

export default function ImpostaDistribuzioneTO({ navigate }: { navigate: (p: string) => void }) {
  const [destinazione, setDestinazione] = useState('Tutte')
  const [categoria,    setCategoria]    = useState('Tutte')
  const [search,       setSearch]       = useState('')
  const [tipo,         setTipo]         = useState<Tipo>('hotel')
  const [selected,     setSelected]     = useState<Set<number>>(new Set([1, 2, 8]))
  const [clusters,     setClusters]     = useState<Cluster[]>([{ id: 1, nome: 'Centro Storico Roma', strutture: [1, 3] }])
  const [nuovoCluster, setNuovoCluster] = useState('')
  const [attenzione,   setAttenzione]   = useState(true)

  const catNum = (label: string) => (label === 'Tutte' ? 0 : parseInt(label, 10))
  const countByTipo = (t: Tipo) => STRUTTURE.filter(s => s.tipo === t).length

  const rows = useMemo(() => STRUTTURE.filter(s =>
    s.tipo === tipo &&
    (destinazione === 'Tutte' || s.destinazione === destinazione) &&
    (categoria === 'Tutte' || s.stelle === catNum(categoria)) &&
    (!search.trim() || s.nome.toLowerCase().includes(search.toLowerCase()))
  ), [tipo, destinazione, categoria, search])

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id))
  const toggleRow = (id: number) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev)
    if (allSelected) rows.forEach(r => n.delete(r.id))
    else rows.forEach(r => n.add(r.id))
    return n
  })

  const creaCluster = () => {
    if (!nuovoCluster.trim() || selected.size === 0) return
    setClusters(prev => [...prev, { id: Date.now(), nome: nuovoCluster.trim(), strutture: Array.from(selected) }])
    setNuovoCluster('')
  }
  const rimuoviCluster = (id: number) => setClusters(prev => prev.filter(c => c.id !== id))

  // KPI di copertura (reattivi alla selezione)
  const selStrutture = STRUTTURE.filter(s => selected.has(s.id))
  const totCamereSel = selStrutture.reduce((a, s) => a + s.camere, 0)
  const mercatiCoperti = new Set(selStrutture.flatMap(s => s.mercati)).size
  const coveragePct = Math.round((selected.size / STRUTTURE.length) * 100)

  return (
    <div className="impdto">
      <PageHead
        title="Imposta distribuzione"
        subtitle="Distribuisci l'inventario in contratto su destinazioni, strutture e mercati di riferimento"
      />

      {attenzione && (
        <div className="impdto__alert">
          <span><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Per un risultato ottimale è necessario configurare il budget dei ricavi.</span>
          <button type="button" className="impdto__alert-close" onClick={() => setAttenzione(false)} aria-label="Chiudi avviso">
            <i className="fa-light fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── Filtri ──────────────────────────────────────────────────────────────── */}
      <div className="impdto__filters">
        <SelectField
          label="Destinazione" name="destinazione" className="w-[180px]"
          value={destinazione} onChange={e => setDestinazione(e.target.value)}
          options={DESTINAZIONI.map(d => ({ value: d, label: d }))}
        />
        <SelectField
          label="Categoria" name="categoria" className="w-[150px]"
          value={categoria} onChange={e => setCategoria(e.target.value)}
          options={CATEGORIE.map(c => ({ value: c, label: c }))}
        />
        <div className="impdto__search">
          <label className="impdto__search-label">Cerca struttura</label>
          <div className="impdto__search-wrap">
            <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
            <input className="sib-input" placeholder="Nome struttura…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Linguette laterali + pannello ───────────────────────────────────────── */}
      <div className="impdto__layout">
        <div className="impdto__tabs" role="tablist" aria-label="Tipo struttura">
          {TABS.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={tipo === t.key}
              className={`impdto__tab ${tipo === t.key ? 'is-active' : ''}`}
              onClick={() => setTipo(t.key)}>
              <i className={`fa-light ${t.icon}`} aria-hidden="true" />
              <span>{t.label}</span>
              <em className="impdto__tab-count">{t.key === 'cluster' ? clusters.length : countByTipo(t.key)}</em>
            </button>
          ))}
        </div>

        <div className="impdto__panel">
          {tipo === 'cluster' ? (
            // ── Vista Cluster ──────────────────────────────────────────────
            <div className="impdto__cluster-view">
              <div className="impdto__cluster-form">
                <span className="impdto__cluster-hint">
                  <i className="fa-light fa-circle-info" aria-hidden="true" />
                  Seleziona le strutture nelle altre linguette, poi assegna un nome e crea il cluster.
                </span>
                <div className="impdto__cluster-row">
                  <input type="text" className="sib-input" placeholder="Nome cluster"
                    value={nuovoCluster} onChange={e => setNuovoCluster(e.target.value)} />
                  <button type="button" className="sib-btn sib-btn--primary" onClick={creaCluster} disabled={!nuovoCluster.trim() || selected.size === 0}>
                    <i className="fa-light fa-plus" aria-hidden="true" /> Crea cluster ({selected.size})
                  </button>
                </div>
              </div>
              <div className="impdto__cluster-grid">
                {clusters.map(c => {
                  const membri = STRUTTURE.filter(s => c.strutture.includes(s.id))
                  const cam = membri.reduce((a, s) => a + s.camere, 0)
                  return (
                    <div key={c.id} className="impdto__cluster-card">
                      <div className="impdto__cluster-card-head">
                        <i className="fa-light fa-diagram-project" aria-hidden="true" />
                        <span className="impdto__cluster-name">{c.nome}</span>
                        <button type="button" className="impdto__cluster-del" onClick={() => rimuoviCluster(c.id)} aria-label="Rimuovi cluster">
                          <i className="fa-light fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="impdto__cluster-members">
                        {membri.map(m => <span key={m.id} className="impdto__cluster-chip"><i className={`fa-light ${TIPO_ICON[m.tipo]}`} aria-hidden="true" /> {m.nome}</span>)}
                      </div>
                      <div className="impdto__cluster-foot">
                        <span><i className="fa-light fa-hotel" aria-hidden="true" /> {membri.length} strutture</span>
                        <span><i className="fa-light fa-door-open" aria-hidden="true" /> {cam} camere</span>
                      </div>
                    </div>
                  )
                })}
                {clusters.length === 0 && <div className="impdto__empty">Nessun cluster creato</div>}
              </div>
            </div>
          ) : (
            // ── Tabella strutture ──────────────────────────────────────────
            <table className="sib-table impdto__table">
              <thead>
                <tr>
                  <th className="impdto__th-struct">
                    <span className="impdto__th-struct-row">
                      Strutture
                      <select className="sib-select impdto__filter" value={tipo} onChange={e => setTipo(e.target.value as Tipo)} aria-label="Filtro tipo struttura">
                        {TABS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </span>
                  </th>
                  <th className="impdto__th-c">N. camere</th>
                  <th className="impdto__th-c">Categoria</th>
                  <th className="impdto__th-c">Capacità di spesa</th>
                  <th>Mercato</th>
                  <th className="impdto__th-sw">
                    <button type="button" className="impdto__all-btn" onClick={toggleAll}>
                      {allSelected ? 'Deseleziona' : 'Tutte'}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={selected.has(r.id) ? 'is-selected' : ''}>
                    <td>
                      <span className="impdto__struct">
                        <span className="impdto__struct-ico"><i className={`fa-light ${TIPO_ICON[r.tipo]}`} aria-hidden="true" /></span>
                        <span className="impdto__struct-txt">
                          <span className="impdto__struct-name">{r.nome}</span>
                          <span className="impdto__struct-dest"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {r.destinazione}</span>
                        </span>
                      </span>
                    </td>
                    <td className="impdto__td-c">
                      <span className="impdto__camere">{r.camere}</span>
                      <span className="impdto__camere-bar"><span className="impdto__camere-fill" style={{ '--w': `${(r.camere / MAX_CAMERE) * 100}%` } as React.CSSProperties} /></span>
                    </td>
                    <td className="impdto__td-c"><Stars n={r.stelle} /></td>
                    <td className="impdto__td-c"><Spesa n={r.spesa} /></td>
                    <td><Flags codes={r.mercati} /></td>
                    <td className="impdto__td-sw">
                      <button type="button" role="switch" aria-checked={selected.has(r.id)}
                        className={`impdto__switch ${selected.has(r.id) ? 'is-on' : ''}`}
                        onClick={() => toggleRow(r.id)} title={selected.has(r.id) ? 'In distribuzione' : 'Attiva distribuzione'}>
                        <span className="impdto__switch-thumb" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="impdto__empty">Nessuna struttura per i filtri selezionati</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Footer: copertura + azioni ──────────────────────────────────────────── */}
      <div className="impdto__footer">
        <div className="impdto__coverage">
          <div className="impdto__coverage-top">
            <span><strong>{selected.size}</strong> / {STRUTTURE.length} strutture distribuite</span>
            <span className="impdto__coverage-pct">{coveragePct}%</span>
          </div>
          <div className="impdto__coverage-bar"><span className="impdto__coverage-fill" style={{ '--w': `${coveragePct}%` } as React.CSSProperties} /></div>
          <span className="impdto__coverage-sub"><i className="fa-light fa-door-open" aria-hidden="true" /> {totCamereSel} camere · <i className="fa-light fa-earth-europe" aria-hidden="true" /> {mercatiCoperti} mercati</span>
        </div>
        <div className="impdto__footer-actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setSelected(new Set())}>
            <i className="fa-light fa-rotate-left" aria-hidden="true" /> Reset
          </button>
          <button type="button" className="sib-btn sib-btn--primary">
            <i className="fa-light fa-check" aria-hidden="true" /> Salva distribuzione
          </button>
        </div>
      </div>
    </div>
  )
}
