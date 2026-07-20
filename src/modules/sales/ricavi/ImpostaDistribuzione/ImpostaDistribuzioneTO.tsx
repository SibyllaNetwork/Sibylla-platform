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

const TABS: { key: Tipo; label: string; short?: string; icon: string }[] = [
  { key: 'hotel',        label: 'Hotel',        icon: 'fa-hotel' },
  { key: 'bb',           label: 'B&B',          icon: 'fa-bed' },
  { key: 'appartamento', label: 'Appartamento', short: 'Appart.', icon: 'fa-building' },
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

const DESTINAZIONI = ['Tutte', ...Array.from(new Set(STRUTTURE.map(s => s.destinazione)))]
const CATEGORIE = ['Tutte', '3 stelle', '4 stelle', '5 stelle']

// Città → Regione (le strutture demo sono tutte in Italia)
const REGIONI: Record<string, string> = { Roma: 'Lazio', Firenze: 'Toscana', Milano: 'Lombardia', Napoli: 'Campania' }

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

// Dimensione struttura: 3 livelli derivati dal numero di camere
const dimensioneOf = (camere: number): { level: 1 | 2 | 3; label: string } =>
  camere < 40 ? { level: 1, label: 'Piccola' }
    : camere <= 120 ? { level: 2, label: 'Media' }
      : { level: 3, label: 'Grande' }

function Dimensione({ camere }: { camere: number }) {
  const { level, label } = dimensioneOf(camere)
  return (
    <span className={`impdto__dim impdto__dim--l${level}`} title={`Dimensione: ${label}`}>
      <span className="impdto__dim-ico"><i className="fa-solid fa-hotel" aria-hidden="true" /></span>
      <span className="impdto__dim-label">{label}</span>
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
  const [tipo,         setTipo]         = useState<Tipo>('hotel')
  const [selected,     setSelected]     = useState<Set<number>>(new Set([1, 2, 8]))
  const [clusters,     setClusters]     = useState<Cluster[]>([{ id: 1, nome: 'Centro Storico Roma', strutture: [1, 3] }])
  const [nuovoCluster, setNuovoCluster] = useState('')
  const [attenzione,   setAttenzione]   = useState(true)

  // ── Filtri sulle colonne: lente (ricerca nome) + imbuto (filtro a valori) ────
  const [nomeQuery, setNomeQuery] = useState('')
  const [colSel,    setColSel]    = useState<Record<string, Set<string>>>({})
  const [pop,       setPop]       = useState<{ key: string; x: number; y: number } | null>(null)

  const catNum = (label: string) => (label === 'Tutte' ? 0 : parseInt(label, 10))
  const countByTipo = (t: Tipo) => STRUTTURE.filter(s => s.tipo === t).length

  // Valore testuale di ogni struttura per le colonne filtrabili "a valori"
  const colVal: Record<string, (s: Struttura) => string> = {
    categoria:  s => `${s.stelle} stelle`,
    dimensione: s => dimensioneOf(s.camere).label,
    nazione:    () => 'Italia',
    regione:    s => REGIONI[s.destinazione] ?? '—',
    citta:      s => s.destinazione,
    spesa:      s => ({ 1: 'Bassa', 2: 'Media', 3: 'Alta' } as Record<number, string>)[s.spesa] ?? '—',
  }
  const distinctFor = (key: string): string[] => {
    const base = STRUTTURE.filter(s => s.tipo === tipo)
    if (key === 'mercato') return Array.from(new Set(base.flatMap(s => s.mercati)))
    return Array.from(new Set(base.map(s => colVal[key](s))))
  }
  const colActive = (key: string) => (colSel[key]?.size ?? 0) > 0
  const toggleColVal = (key: string, val: string) => setColSel(prev => {
    const set = new Set(prev[key] ?? [])
    set.has(val) ? set.delete(val) : set.add(val)
    return { ...prev, [key]: set }
  })
  const clearCol = (key: string) => setColSel(prev => { const n = { ...prev }; delete n[key]; return n })
  const openPop = (key: string, e: React.MouseEvent) => {
    if (pop?.key === key) { setPop(null); return }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPop({ key, x: r.left, y: r.bottom + 6 })
  }

  const rows = useMemo(() => STRUTTURE.filter(s => {
    if (s.tipo !== tipo) return false
    if (destinazione !== 'Tutte' && s.destinazione !== destinazione) return false
    if (categoria !== 'Tutte' && s.stelle !== catNum(categoria)) return false
    if (nomeQuery.trim() && !s.nome.toLowerCase().includes(nomeQuery.trim().toLowerCase())) return false
    for (const key of Object.keys(colSel)) {
      const sel = colSel[key]
      if (!sel || sel.size === 0) continue
      if (key === 'mercato') { if (!s.mercati.some(m => sel.has(m))) return false }
      else if (!sel.has(colVal[key](s))) return false
    }
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [tipo, destinazione, categoria, nomeQuery, colSel])

  // Header: etichetta + icona (lente per la ricerca nome, imbuto per i valori)
  const headIco = (key: string, kind: 'search' | 'filter', active: boolean) => (
    <button
      type="button"
      className={`impdto__th-ico ${active ? 'is-active' : ''}`}
      onClick={e => openPop(key, e)}
      aria-label={kind === 'search' ? 'Cerca per nome' : 'Filtra colonna'}
    >
      <i className={`fa-solid ${kind === 'search' ? 'fa-magnifying-glass' : 'fa-filter'}`} aria-hidden="true" />
    </button>
  )

  const toggleRow = (id: number) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
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
      </div>

      {/* ── Linguette laterali + pannello ───────────────────────────────────────── */}
      <div className="impdto__layout">
        <div className="impdto__tabs" role="tablist" aria-label="Tipo struttura">
          {TABS.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={tipo === t.key}
              className={`impdto__tab ${tipo === t.key ? 'is-active' : ''}`}
              onClick={() => setTipo(t.key)} title={t.short ? t.label : undefined}>
              <i className={`fa-light ${t.icon}`} aria-hidden="true" />
              <span>{t.short ?? t.label}</span>
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
            <div className="sib-table-wrap">
            <table className="sib-table impdto__table">
              <thead>
                <tr>
                  <th className="impdto__th-struct"><span className="impdto__th-f">Nome struttura {headIco('nome', 'search', nomeQuery.trim().length > 0)}</span></th>
                  <th className="impdto__th-c"><span className="impdto__th-f">Categoria {headIco('categoria', 'filter', colActive('categoria'))}</span></th>
                  <th className="impdto__th-c"><span className="impdto__th-f">Dimensione {headIco('dimensione', 'filter', colActive('dimensione'))}</span></th>
                  <th><span className="impdto__th-f">Nazione {headIco('nazione', 'filter', colActive('nazione'))}</span></th>
                  <th><span className="impdto__th-f">Regione {headIco('regione', 'filter', colActive('regione'))}</span></th>
                  <th><span className="impdto__th-f">Città {headIco('citta', 'filter', colActive('citta'))}</span></th>
                  <th className="impdto__th-c"><span className="impdto__th-f">Capacità di spesa {headIco('spesa', 'filter', colActive('spesa'))}</span></th>
                  <th><span className="impdto__th-f">Mercato {headIco('mercato', 'filter', colActive('mercato'))}</span></th>
                  <th className="impdto__th-sw">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className={selected.has(r.id) ? 'is-selected' : ''}>
                    <td>
                      <span className="impdto__struct">
                        <span className="impdto__struct-ico"><i className={`fa-solid ${TIPO_ICON[r.tipo]}`} aria-hidden="true" /></span>
                        <span className="impdto__struct-txt">
                          <span className="impdto__struct-name">{r.nome}</span>
                          <span className="impdto__struct-dest"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {r.destinazione}</span>
                        </span>
                      </span>
                    </td>
                    <td className="impdto__td-c"><Stars n={r.stelle} /></td>
                    <td className="impdto__td-c"><Dimensione camere={r.camere} /></td>
                    <td>Italia</td>
                    <td>{REGIONI[r.destinazione] ?? '—'}</td>
                    <td>{r.destinazione}</td>
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
                  <tr><td colSpan={9} className="impdto__empty">Nessuna struttura per i filtri selezionati</td></tr>
                )}
              </tbody>
            </table>
            </div>
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

      {/* ── Popover filtro colonna (lente: ricerca nome / imbuto: valori) ─────────── */}
      {pop && (
        <>
          <div className="impdto__pop-overlay" onClick={() => setPop(null)} />
          <div className="impdto__pop" style={{ left: pop.x, top: pop.y }} onClick={e => e.stopPropagation()}>
            {pop.key === 'nome' ? (
              <input
                className="sib-input"
                autoFocus
                value={nomeQuery}
                placeholder="Nome struttura…"
                onChange={e => setNomeQuery(e.target.value)}
              />
            ) : (
              <>
                {distinctFor(pop.key).map(v => (
                  <label key={v} className="impdto__pop-item">
                    <input type="checkbox" checked={colSel[pop.key]?.has(v) ?? false} onChange={() => toggleColVal(pop.key, v)} />
                    <span>{pop.key === 'mercato' ? v.toUpperCase() : v}</span>
                  </label>
                ))}
                {colActive(pop.key) && (
                  <button type="button" className="impdto__pop-clear" onClick={() => { clearCol(pop.key); setPop(null) }}>
                    Azzera filtro
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
