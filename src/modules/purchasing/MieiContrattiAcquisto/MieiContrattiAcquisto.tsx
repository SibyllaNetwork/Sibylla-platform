import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { SearchField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { setEditingContrattoAcquisto } from '../InserisciContrattoAcquisto/_state'
import './MieiContrattiAcquisto.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Voce { nome: string; prezzo: number }
interface Contratto {
  id: number
  ragioneSociale: string
  email: string
  telefono: string
  referente: string
  prodotti: Voce[]
  servizi: Voce[]
}

const fmtEUR = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK: Contratto[] = [
  { id: 1, ragioneSociale: 'Sibylla',   email: 'info@sibylla.it',   telefono: '+39 06 1234567',  referente: 'Mario Rossi',  prodotti: [{ nome: 'Computer', prezzo: 1000 }], servizi: [] },
  { id: 2, ragioneSociale: 'test',      email: 'test@acme.it',      telefono: '+39 02 9876543',  referente: 'Luca Bianchi', prodotti: [{ nome: 'Acqua', prezzo: 50 }],      servizi: [] },
  { id: 3, ragioneSociale: 'test',      email: 'test2@acme.it',     telefono: '',                referente: '',             prodotti: [{ nome: 'Lavagna', prezzo: 40 }],   servizi: [] },
  { id: 4, ragioneSociale: 'TEST2',     email: '',                  telefono: '',                referente: '',             prodotti: [], servizi: [] },
  { id: 5, ragioneSociale: 'ciao',      email: 'ciao@fornitore.it', telefono: '',                referente: '',             prodotti: [], servizi: [] },
  { id: 6, ragioneSociale: 'test hass', email: '',                  telefono: '+39 333 1112233', referente: 'Anna Verdi',   prodotti: [], servizi: [] },
  { id: 7, ragioneSociale: 'dwfwf',     email: 'dwfwf@mail.it',     telefono: '',                referente: '',             prodotti: [{ nome: 'khkhhkhk', prezzo: 25 }], servizi: [] },
  { id: 8, ragioneSociale: 'dino',      email: '',                  telefono: '',                referente: '',             prodotti: [], servizi: [] },
  { id: 9, ragioneSociale: 'alfredo',   email: 'alfredo@mail.it',   telefono: '',                referente: '',             prodotti: [], servizi: [] },
]

type ColFilterKey = 'ragioneSociale' | 'prodotti' | 'servizi'

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function MieiContrattiAcquisto({ navigate }: { navigate?: (p: string) => void } = {}) {
  const [rows, setRows] = useState<Contratto[]>(MOCK)
  const [contatti, setContatti] = useState<Contratto | null>(null)
  const [search, setSearch] = useState('')
  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({ ragioneSociale: [], prodotti: [], servizi: [] })
  const confirm = useConfirmStore((s) => s.confirm)

  const toggleColFilter = (key: ColFilterKey, value: string) => setColFilters((p) => {
    const cur = p[key]; const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]; return { ...p, [key]: next }
  })
  const setAllColFilter = (key: ColFilterKey, all: string[], select: boolean) => setColFilters((p) => ({ ...p, [key]: select ? [...all] : [] }))

  const rsDistinct = useMemo(() => Array.from(new Set(rows.map((r) => r.ragioneSociale).filter(Boolean))).sort(), [rows])
  const prodDistinct = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.prodotti.map((p) => p.nome)))).sort(), [rows])
  const servDistinct = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.servizi.map((s) => s.nome)))).sort(), [rows])

  const filtered = useMemo(() => {
    let out = rows
    const q = search.toLowerCase().trim()
    if (q) out = out.filter((r) =>
      r.ragioneSociale.toLowerCase().includes(q) ||
      r.referente.toLowerCase().includes(q) ||
      r.prodotti.some((p) => p.nome.toLowerCase().includes(q)) ||
      r.servizi.some((s) => s.nome.toLowerCase().includes(q)),
    )
    if (colFilters.ragioneSociale.length) out = out.filter((r) => colFilters.ragioneSociale.includes(r.ragioneSociale))
    if (colFilters.prodotti.length)       out = out.filter((r) => r.prodotti.some((p) => colFilters.prodotti.includes(p.nome)))
    if (colFilters.servizi.length)        out = out.filter((r) => r.servizi.some((s) => colFilters.servizi.includes(s.nome)))
    return out
  }, [rows, search, colFilters])

  const vociLabel = (voci: Voce[]) => voci.map((v) => `${v.nome} - ${fmtEUR(v.prezzo)}`)

  const inserisci = () => navigate?.('inserisci-contratto-a')
  const modifica = (r: Contratto) => {
    setEditingContrattoAcquisto({ id: r.id, ragioneSociale: r.ragioneSociale, email: r.email, telefono: r.telefono, referente: r.referente, prodotti: r.prodotti, servizi: r.servizi })
    navigate?.('modifica-contratto-a')
  }
  const deleteContratto = async (c: Contratto) => {
    const ok = await confirm({ title: 'Elimina contratto', message: <>Vuoi eliminare il contratto di <strong>{c.ragioneSociale || '—'}</strong>? L’operazione non è reversibile.</> })
    if (ok) setRows((prev) => prev.filter((r) => r.id !== c.id))
  }

  return (
    <div className="mca">
      <BtnBack />
      <PageHeader title="I miei contratti" subtitle="Gestisci e consulta tutti i contratti di acquisto in un unico spazio" />

      <div className="mca__toolbar">
        <div className="mca__field">
          <label>Cerca</label>
          <SearchField className="mca__search" name="search" placeholder="Cerca per ragione sociale, prodotto, servizio…" value={search}
            onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
        </div>
        <button type="button" className="sib-btn sib-btn--secondary mca__add" onClick={inserisci}>
          <i className="fa-light fa-circle-plus" /> Inserisci contratto
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table mca__table">
          <thead>
            <tr>
              <th>
                <ColFilterHeader label="Ragione sociale" options={rsDistinct} selected={colFilters.ragioneSociale} open={openFilter === 'ragioneSociale'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'ragioneSociale' ? null : 'ragioneSociale')}
                  onToggle={(v) => toggleColFilter('ragioneSociale', v)} onSelectAll={(s) => setAllColFilter('ragioneSociale', rsDistinct, s)} />
              </th>
              <th className="mca__th-center">Contatti</th>
              <th>
                <ColFilterHeader label="Prodotti" options={prodDistinct} selected={colFilters.prodotti} open={openFilter === 'prodotti'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'prodotti' ? null : 'prodotti')}
                  onToggle={(v) => toggleColFilter('prodotti', v)} onSelectAll={(s) => setAllColFilter('prodotti', prodDistinct, s)} />
              </th>
              <th>
                <ColFilterHeader label="Servizi" options={servDistinct} selected={colFilters.servizi} open={openFilter === 'servizi'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'servizi' ? null : 'servizi')}
                  onToggle={(v) => toggleColFilter('servizi', v)} onSelectAll={(s) => setAllColFilter('servizi', servDistinct, s)} />
              </th>
              <th className="mca__th-center">Azione</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="sib-empty">Nessun contratto trovato.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id}>
                <td className="mca__rs">{r.ragioneSociale}</td>
                <td className="mca__td-center">
                  <div className="mca__contacts">
                    <Tooltip text="Email / contatti"><button type="button" className="sib-btn sib-btn--icon" aria-label="Email" onClick={() => setContatti(r)}><i className="fa-light fa-envelope" /></button></Tooltip>
                    <Tooltip text="Rubrica contatti"><button type="button" className="sib-btn sib-btn--icon" aria-label="Contatti" onClick={() => setContatti(r)}><i className="fa-light fa-address-card" /></button></Tooltip>
                  </div>
                </td>
                <td>{r.prodotti.length === 0 ? <span className="sib-cell--muted">-</span> : <div className="mca__voci">{vociLabel(r.prodotti).map((v, i) => <span key={i}>{v}</span>)}</div>}</td>
                <td>{r.servizi.length === 0 ? <span className="sib-cell--muted">-</span> : <div className="mca__voci">{vociLabel(r.servizi).map((v, i) => <span key={i}>{v}</span>)}</div>}</td>
                <td className="mca__td-center">
                  <div className="mca__actions">
                    <Tooltip text="Scarica PDF"><button type="button" className="sib-btn sib-btn--icon" aria-label="PDF"><i className="fa-light fa-file-pdf" /></button></Tooltip>
                    <Tooltip text="Modifica contratto"><button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => modifica(r)}><i className="fa-light fa-pen" /></button></Tooltip>
                    <Tooltip text="Elimina contratto"><button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => deleteContratto(r)}><i className="fa-light fa-trash-can" /></button></Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ContattiModal contratto={contatti} onClose={() => setContatti(null)} />
    </div>
  )
}

// ─── COL FILTER HEADER ────────────────────────────────────────────────────────

function ColFilterHeader({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll }: {
  label: string; options: string[]; selected: string[]; open: boolean
  onToggleOpen: () => void; onToggle: (v: string) => void; onSelectAll: (s: boolean) => void
}) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="mca-colfilter">
      <span>{label}</span>
      <button type="button" className={'mca-colfilter__btn' + (hasFilter ? ' mca-colfilter__btn--active' : '')} onClick={onToggleOpen} aria-label={`Filtra per ${label}`} disabled={options.length === 0}><i className="fa-solid fa-filter" /></button>
      {open && (
        <>
          <div className="mca-colfilter__overlay" onClick={onToggleOpen} />
          <div className="mca-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="mca-colfilter__title">scelte multiple</div>
            <label className="mca-colfilter__option"><input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} /><span>Tutti</span></label>
            {options.map((opt) => (
              <label key={opt} className="mca-colfilter__option"><input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} /><span>{opt}</span></label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── MODAL: Contatti ──────────────────────────────────────────────────────────

function ContattiModal({ contratto, onClose }: { contratto: Contratto | null; onClose: () => void }) {
  return (
    <Modal open={!!contratto} onClose={onClose} title={`Contatti · ${contratto?.ragioneSociale ?? ''}`} size="sm">
      {contratto && (
        <>
          <dl className="mca__contatti">
            <div className="mca__contatti-row"><dt><i className="fa-light fa-user" /> Referente</dt><dd>{contratto.referente || '-'}</dd></div>
            <div className="mca__contatti-row"><dt><i className="fa-light fa-envelope" /> Email</dt><dd>{contratto.email ? <a href={`mailto:${contratto.email}`}>{contratto.email}</a> : '-'}</dd></div>
            <div className="mca__contatti-row"><dt><i className="fa-light fa-phone" /> Telefono</dt><dd>{contratto.telefono ? <a href={`tel:${contratto.telefono}`}>{contratto.telefono}</a> : '-'}</dd></div>
          </dl>
          <div className="mca__modal-foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
            {contratto.email && <a className="sib-btn sib-btn--primary" href={`mailto:${contratto.email}`}><i className="fa-light fa-paper-plane" /> Invia email</a>}
          </div>
        </>
      )}
    </Modal>
  )
}
