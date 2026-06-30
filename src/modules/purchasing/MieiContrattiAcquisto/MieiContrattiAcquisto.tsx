import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { InputField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import './MieiContrattiAcquisto.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Voce {
  nome: string
  prezzo: number
}
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
  { id: 1, ragioneSociale: 'Sibylla',   email: 'info@sibylla.it',  telefono: '+39 06 1234567', referente: 'Mario Rossi',  prodotti: [{ nome: 'Computer', prezzo: 1000 }], servizi: [] },
  { id: 2, ragioneSociale: 'test',      email: 'test@acme.it',     telefono: '+39 02 9876543', referente: 'Luca Bianchi', prodotti: [{ nome: 'Acqua', prezzo: 50 }],      servizi: [] },
  { id: 3, ragioneSociale: 'test',      email: 'test2@acme.it',    telefono: '',               referente: '',             prodotti: [{ nome: 'Lavagna', prezzo: 40 }],   servizi: [] },
  { id: 4, ragioneSociale: 'TEST2',     email: '',                 telefono: '',               referente: '',             prodotti: [], servizi: [] },
  { id: 5, ragioneSociale: 'ciao',      email: 'ciao@fornitore.it',telefono: '',               referente: '',             prodotti: [], servizi: [] },
  { id: 6, ragioneSociale: 'test hass', email: '',                 telefono: '+39 333 1112233', referente: 'Anna Verdi',  prodotti: [], servizi: [] },
  { id: 7, ragioneSociale: 'dwfwf',     email: 'dwfwf@mail.it',    telefono: '',               referente: '',             prodotti: [{ nome: 'khkhhkhk', prezzo: 25 }], servizi: [] },
  { id: 8, ragioneSociale: 'dino',      email: '',                 telefono: '',               referente: '',             prodotti: [], servizi: [] },
  { id: 9, ragioneSociale: 'alfredo',   email: 'alfredo@mail.it',  telefono: '',               referente: '',             prodotti: [], servizi: [] },
]

const emptyContratto = (): Contratto => ({ id: 0, ragioneSociale: '', email: '', telefono: '', referente: '', prodotti: [], servizi: [] })

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function MieiContrattiAcquisto(_props: { navigate?: (p: string) => void } = {}) {
  const [rows, setRows] = useState<Contratto[]>(MOCK)
  const [editRow, setEditRow] = useState<Contratto | null>(null)
  const [creaOpen, setCreaOpen] = useState(false)
  const [contatti, setContatti] = useState<Contratto | null>(null)
  const confirm = useConfirmStore((s) => s.confirm)

  const vociLabel = (voci: Voce[]) => voci.map((v) => `${v.nome} - ${fmtEUR(v.prezzo)}`)

  const saveContratto = (c: Contratto, isNew: boolean) => {
    if (isNew) {
      const newId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
      setRows((prev) => [...prev, { ...c, id: newId }])
    } else {
      setRows((prev) => prev.map((r) => (r.id === c.id ? c : r)))
    }
    setCreaOpen(false)
    setEditRow(null)
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
        <button type="button" className="sib-btn sib-btn--secondary mca__add" onClick={() => setCreaOpen(true)}>
          <i className="fa-light fa-circle-plus" /> Inserisci contratto
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table mca__table">
          <thead>
            <tr>
              <th>Ragione sociale</th>
              <th className="mca__th-center">Contatti</th>
              <th>Prodotti</th>
              <th>Servizi</th>
              <th className="mca__th-center">Azione</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="sib-empty">Nessun contratto presente.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="mca__rs">{r.ragioneSociale}</td>
                <td className="mca__td-center">
                  <div className="mca__contacts">
                    <Tooltip text="Email / contatti">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Email" onClick={() => setContatti(r)}><i className="fa-light fa-envelope" /></button>
                    </Tooltip>
                    <Tooltip text="Rubrica contatti">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Contatti" onClick={() => setContatti(r)}><i className="fa-light fa-address-card" /></button>
                    </Tooltip>
                  </div>
                </td>
                <td>
                  {r.prodotti.length === 0 ? <span className="sib-cell--muted">-</span>
                    : <div className="mca__voci">{vociLabel(r.prodotti).map((v, i) => <span key={i}>{v}</span>)}</div>}
                </td>
                <td>
                  {r.servizi.length === 0 ? <span className="sib-cell--muted">-</span>
                    : <div className="mca__voci">{vociLabel(r.servizi).map((v, i) => <span key={i}>{v}</span>)}</div>}
                </td>
                <td className="mca__td-center">
                  <div className="mca__actions">
                    <Tooltip text="Scarica PDF"><button type="button" className="sib-btn sib-btn--icon" aria-label="PDF"><i className="fa-light fa-file-pdf" /></button></Tooltip>
                    <Tooltip text="Modifica contratto"><button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => setEditRow(r)}><i className="fa-light fa-pen" /></button></Tooltip>
                    <Tooltip text="Elimina contratto"><button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => deleteContratto(r)}><i className="fa-light fa-trash-can" /></button></Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ContrattoModal open={creaOpen || !!editRow} row={editRow} onClose={() => { setCreaOpen(false); setEditRow(null) }} onSave={saveContratto} />
      <ContattiModal contratto={contatti} onClose={() => setContatti(null)} />
    </div>
  )
}

// ─── MODAL: Crea / Modifica contratto ─────────────────────────────────────────

function ContrattoModal({ open, row, onClose, onSave }: {
  open: boolean
  row: Contratto | null
  onClose: () => void
  onSave: (c: Contratto, isNew: boolean) => void
}) {
  const [c, setC] = useState<Contratto>(emptyContratto())

  React.useEffect(() => {
    if (!open) return
    setC(row ? { ...row, prodotti: [...row.prodotti], servizi: [...row.servizi] } : emptyContratto())
  }, [open, row])

  const setVoce = (key: 'prodotti' | 'servizi', i: number, field: keyof Voce, val: string) =>
    setC((p) => ({ ...p, [key]: p[key].map((v, idx) => (idx === i ? { ...v, [field]: field === 'prezzo' ? Number(val.replace(',', '.')) || 0 : val } : v)) }))
  const addVoce = (key: 'prodotti' | 'servizi') => setC((p) => ({ ...p, [key]: [...p[key], { nome: '', prezzo: 0 }] }))
  const removeVoce = (key: 'prodotti' | 'servizi', i: number) => setC((p) => ({ ...p, [key]: p[key].filter((_, idx) => idx !== i) }))

  const renderVoci = (key: 'prodotti' | 'servizi', label: string) => (
    <div className="mca__voci-editor">
      <div className="mca__voci-editor-head">
        <span>{label}</span>
        <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => addVoce(key)}><i className="fa-light fa-plus" /> Aggiungi</button>
      </div>
      {c[key].length === 0 ? (
        <div className="mca__voci-empty">Nessun{key === 'servizi' ? ' servizio' : ' prodotto'} inserito</div>
      ) : c[key].map((v, i) => (
        <div key={i} className="mca__voce-row">
          <InputField name={`${key}-nome-${i}`} value={v.nome} placeholder="Descrizione" onChange={(e) => setVoce(key, i, 'nome', e.target.value)} />
          <InputField name={`${key}-prezzo-${i}`} value={String(v.prezzo)} placeholder="Prezzo" onChange={(e) => setVoce(key, i, 'prezzo', e.target.value)} />
          <button type="button" className="sib-btn sib-btn--icon" aria-label="Rimuovi" onClick={() => removeVoce(key, i)}><i className="fa-light fa-xmark" /></button>
        </div>
      ))}
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={row ? 'Modifica contratto' : 'Inserisci contratto'} size="lg">
      <div className="mca__modal-body">
        <div className="mca__modal-grid">
          <InputField name="ragioneSociale" label="Ragione sociale" value={c.ragioneSociale} onChange={(e) => setC((p) => ({ ...p, ragioneSociale: e.target.value }))} />
          <InputField name="referente" label="Referente" value={c.referente} onChange={(e) => setC((p) => ({ ...p, referente: e.target.value }))} />
          <InputField name="email" label="Email" value={c.email} onChange={(e) => setC((p) => ({ ...p, email: e.target.value }))} />
          <InputField name="telefono" label="Telefono" value={c.telefono} onChange={(e) => setC((p) => ({ ...p, telefono: e.target.value }))} />
        </div>
        {renderVoci('prodotti', 'Prodotti')}
        {renderVoci('servizi', 'Servizi')}
      </div>
      <div className="mca__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!c.ragioneSociale.trim()} onClick={() => onSave(c, !row)}>{row ? 'Salva' : 'Inserisci'}</button>
      </div>
    </Modal>
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
            <div className="mca__contatti-row">
              <dt><i className="fa-light fa-envelope" /> Email</dt>
              <dd>{contratto.email ? <a href={`mailto:${contratto.email}`}>{contratto.email}</a> : '-'}</dd>
            </div>
            <div className="mca__contatti-row">
              <dt><i className="fa-light fa-phone" /> Telefono</dt>
              <dd>{contratto.telefono ? <a href={`tel:${contratto.telefono}`}>{contratto.telefono}</a> : '-'}</dd>
            </div>
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
