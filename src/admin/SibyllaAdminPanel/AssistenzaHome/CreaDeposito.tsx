import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Modal from '../../../core/components/Modal'
import { toast } from '../../../core/components/Toast/useToast'
import './CreaDeposito.sass'

interface Props {
  navigate: (p: string) => void
}

interface Dep { ragione: string; partner: string; sales: string }

const BASE_ROWS: Dep[] = [
  { ragione: 'ITALCAMEL', partner: '', sales: '' },
  { ragione: 'Tui Poland', partner: '', sales: '' },
  { ragione: 'test58', partner: 'test58', sales: '' },
  { ragione: 'Hassab srl', partner: '', sales: '' },
  { ragione: 'Tui Italia', partner: '', sales: '' },
  { ragione: 'Ovest Destination Italy', partner: 'Ovest Destination Italy', sales: '' },
  { ragione: 'Debus snc', partner: '', sales: '' },
  { ragione: 'Hassab srl', partner: '', sales: '' },
  { ragione: 'Imperatore Travel', partner: '', sales: '' },
]
const ROWS: Dep[] = [
  ...BASE_ROWS,
  ...Array.from({ length: 33 }, (_, i) => ({ ragione: `Azienda Demo ${i + 1}`, partner: '', sales: '' })),
]
const PAGE_SIZE = 10

const ROLLING_PARTNERS = [
  { partner: '-', deposito: '0,00€', stato: 'Ongoing' },
  { partner: 'Ovest Destination Italy', deposito: '0,00€', stato: 'Ongoing' },
  { partner: 'test58', deposito: '0,00€', stato: 'Ongoing' },
]

// Campi della modale "Modifica Agenzia" (span 2 = campo a doppia larghezza).
const AG_FIELDS: { k: string; label: string; span?: 2; ph?: string }[] = [
  { k: 'ragioneSociale', label: 'Ragione sociale' },
  { k: 'indirizzo',      label: 'Indirizzo', span: 2 },
  { k: 'email',          label: 'E-mail' },
  { k: 'telefono',       label: 'Telefono' },
  { k: 'piva',           label: 'P. Iva' },
  { k: 'cf',             label: 'Cod. Fiscale' },
  { k: 'sdi',            label: 'Codice Destinatario (SDI)' },
  { k: 'pec',            label: 'PEC' },
  { k: 'salesManager',   label: 'Sales Manager',       ph: 'Inserisci sales manager' },
  { k: 'emailFinance',   label: 'Email Finance',       ph: 'Inserisci email finance' },
  { k: 'emailSales',     label: 'Email Sales Manager',  ph: 'Inserisci email sales manager' },
  { k: 'partner',        label: 'Partner',             ph: 'Inserisci nome partner' },
  { k: 'commissione',    label: 'Commissione' },
  { k: 'stopSales',      label: 'Stop Sales' },
]

type AgForm = Record<string, string>
const EMPTY_AG: AgForm = {
  ragioneSociale: '', indirizzo: '', email: '', telefono: '', piva: '', cf: '', sdi: '', pec: '',
  salesManager: '', emailFinance: '', emailSales: '', partner: '', commissione: '0,00', stopSales: '0,00',
  primoSollecito: '0,00', secondoSollecito: '0,00',
}

export default function CreaDeposito({ navigate }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return q ? ROWS.filter(r => r.ragione.toLowerCase().includes(q)) : ROWS
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search])
  const rows = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  // Modali azioni
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [noteRow, setNoteRow] = useState<{ key: string; ragione: string } | null>(null)
  const [noteText, setNoteText] = useState('')
  const [detailRow, setDetailRow] = useState<Dep | null>(null)
  const [depRow, setDepRow] = useState<Dep | null>(null)
  const [depImporto, setDepImporto] = useState('')
  const [depData, setDepData] = useState('')
  const [rollingOpen, setRollingOpen] = useState(false)
  const [txRow, setTxRow] = useState<Dep | null>(null)   // Dettaglio transazioni
  const [txFrom, setTxFrom] = useState('')
  const [txTo, setTxTo] = useState('')
  const [histRow, setHistRow] = useState<Dep | null>(null) // Storico deposito
  const [agRow, setAgRow] = useState<Dep | null>(null)     // Modifica agenzia
  const [agForm, setAgForm] = useState<AgForm>(EMPTY_AG)
  const setAg = (k: string, v: string) => setAgForm(p => ({ ...p, [k]: v }))

  const openNote = (key: string, ragione: string) => { setNoteRow({ key, ragione }); setNoteText(notes[key] || '') }
  const saveNote = () => {
    if (!noteRow) return
    setNotes(n => ({ ...n, [noteRow.key]: noteText }))
    toast.success(`Note aggiornate per ${noteRow.ragione}.`, 'Note salvate')
    setNoteRow(null)
  }
  const openDeposito = (r: Dep) => { setDepRow(r); setDepImporto(''); setDepData(new Date().toISOString().slice(0, 10)) }
  const saveDeposito = () => {
    if (!depRow || !depImporto.trim() || !depData.trim()) return
    toast.success(`Deposito di € ${depImporto} registrato per ${depRow.ragione}.`, 'Deposito inserito')
    setDepRow(null)
  }
  const openAgenzia = (r: Dep) => {
    setAgRow(r)
    setAgForm({ ...EMPTY_AG, ragioneSociale: r.ragione, partner: r.partner, salesManager: r.sales })
  }
  const saveAgenzia = () => {
    if (!agRow) return
    toast.success(`Agenzia «${agForm.ragioneSociale || agRow.ragione}» aggiornata con successo.`, 'Modifiche salvate')
    setAgRow(null)
  }

  return (
    <div className="cdp">
      <button type="button" className="cdp__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="cdp__head">
        <h1 className="cdp__title">Crea deposito azienda</h1>
        <p className="cdp__sub">Imposta depositi, solleciti e commissioni per ogni azienda.</p>
      </div>

      <div className="cdp__toolbar">
        <button type="button" className="cdp__btn" onClick={() => navigate('pa-crea-azienda')}>Crea Anagrafica Azienda</button>
        <button type="button" className="cdp__btn">Aggiorna Depositi</button>
        <div className="cdp__search">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per ragione…" />
          <Ico n="search" s={14} c="var(--color-text-disabled)" />
        </div>
        <button type="button" className="cdp__btn" onClick={() => setRollingOpen(true)}>Partner Rolling Deposit</button>
      </div>

      <div className="sib-table-wrap cdp__wrap">
        <table className="sib-table cdp__table">
          {/* Larghezze in percentuale + table-layout fixed: nessuno scroll orizzontale. */}
          <colgroup>
            <col className="cdp__col-ragione" />
            <col className="cdp__col-partner" />
            <col className="cdp__col-sales" />
            <col className="cdp__col-deposito" />
            <col className="cdp__col-sollecito" />
            <col className="cdp__col-sollecito" />
            <col className="cdp__col-stop" />
            <col className="cdp__col-comm" />
            <col className="cdp__col-mail" />
            <col className="cdp__col-mail" />
            <col className="cdp__col-note" />
            <col className="cdp__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><ThLabel full="Ragione sociale" short="Rag. sociale" /></th>
              <th><ThLabel full="Partner" /></th>
              <th><ThLabel full="Sales manager" short="Sales mgr." /></th>
              <th><ThLabel full="Deposito" /></th>
              <th><ThLabel full="Primo Sollecito" short="1° sollecito" /></th>
              <th><ThLabel full="Secondo Sollecito" short="2° sollecito" /></th>
              <th><ThLabel full="Stop sales" /></th>
              <th><ThLabel full="Commissione" short="Comm." /></th>
              <th><ThLabel full="Indirizzo mail finance" short="Mail fin." /></th>
              <th><ThLabel full="Indirizzo mail Sales manager" short="Mail sales" /></th>
              <th className="cdp__th-c"><ThLabel full="Note" /></th>
              <th className="cdp__th-c"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="cdp__rag"><TruncatedText text={r.ragione} /></td>
                <td><TruncatedText text={r.partner || ''} /></td>
                <td><TruncatedText text={r.sales || ''} /></td>
                <td className="cdp__nowrap">
                  <span className="cdp__val">0,00€</span>
                  <Tooltip text="Deposito">
                    <button type="button" className="cdp__mini" onClick={() => setHistRow(r)}><Ico n="clock" s={13} c="var(--color-text-inactive)" /></button>
                  </Tooltip>
                  <Tooltip text="Dettaglio transazioni">
                    <button type="button" className="cdp__mini" onClick={() => { setTxRow(r); setTxFrom(''); setTxTo('') }}><Ico n="eye" s={13} c="var(--color-text-inactive)" /></button>
                  </Tooltip>
                </td>
                <td className="cdp__nowrap"><span className="cdp__val">0,00%</span><button type="button" className="cdp__mini" title="Invia"><Ico n="email" s={13} c="var(--color-text-inactive)" /></button></td>
                <td className="cdp__nowrap"><span className="cdp__val">0,00%</span><button type="button" className="cdp__mini" title="Invia"><Ico n="email" s={13} c="var(--color-text-inactive)" /></button></td>
                <td className="cdp__nowrap"><span className="cdp__val">0,00%</span><button type="button" className="cdp__mini" title="Invia"><Ico n="email" s={13} c="var(--color-text-inactive)" /></button></td>
                <td><span className="cdp__val">0,00%</span></td>
                <td />
                <td />
                <td className="cdp__c"><Ico n="info" s={15} c="var(--color-text-disabled)" /></td>
                <td className="cdp__c">
                  <div className="cdp__actions">
                    <Tooltip text="Inserisci note">
                      <button type="button" className="cdp__mini" onClick={() => openNote(`${r.ragione}#${(page - 1) * PAGE_SIZE + i}`, r.ragione)}>
                        <Ico n="file" s={13} c={notes[`${r.ragione}#${(page - 1) * PAGE_SIZE + i}`] ? '#8a6d1f' : 'var(--color-text-inactive)'} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Dettaglio anagrafica">
                      <button type="button" className="cdp__mini" onClick={() => setDetailRow(r)}><Ico n="eye" s={13} c="var(--color-text-inactive)" /></button>
                    </Tooltip>
                    <Tooltip text="Modifica">
                      <button type="button" className="cdp__mini" onClick={() => openAgenzia(r)}><Ico n="edit" s={13} c="var(--color-text-inactive)" /></button>
                    </Tooltip>
                    <Tooltip text="Inserisci deposito">
                      <button type="button" className="cdp__mini" onClick={() => openDeposito(r)}><Ico n="layers" s={13} c="var(--color-text-inactive)" /></button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cdp__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>

      <Modal open={noteRow !== null} onClose={() => setNoteRow(null)} title="Modifica note" size="md">
        <div className="cdp-modal">
          <label className="cdp-modal__label">Note</label>
          <textarea
            className="cdp-modal__textarea"
            rows={5}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Inserire note"
          />
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setNoteRow(null)}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={saveNote}>Salva</button>
          </div>
        </div>
      </Modal>

      <Modal open={detailRow !== null} onClose={() => setDetailRow(null)} title="Dettaglio anagrafica" size="md">
        <div className="cdp-modal">
          <div className="cdp-modal__grid">
            <div className="cdp-modal__detail"><span>Ragione sociale</span><b>{detailRow?.ragione}</b></div>
            <div className="cdp-modal__detail"><span>Partner</span><b>{detailRow?.partner || '—'}</b></div>
            <div className="cdp-modal__detail"><span>Sales manager</span><b>{detailRow?.sales || '—'}</b></div>
            <div className="cdp-modal__detail"><span>Deposito</span><b>0,00€</b></div>
            <div className="cdp-modal__detail"><span>Commissione</span><b>0,00%</b></div>
            <div className="cdp-modal__detail"><span>Stato</span><b>Attivo</b></div>
          </div>
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setDetailRow(null)}>Chiudi</button>
          </div>
        </div>
      </Modal>

      <Modal open={depRow !== null} onClose={() => setDepRow(null)} title="Inserisci deposito" size="md">
        <div className="cdp-modal">
          <div className="cdp-modal__row">
            <div className="cdp-modal__field">
              <label>Importo *</label>
              <input type="number" value={depImporto} onChange={e => setDepImporto(e.target.value)} placeholder="0,00" />
            </div>
            <div className="cdp-modal__field">
              <label>Data *</label>
              <input type="date" value={depData} onChange={e => setDepData(e.target.value)} />
            </div>
          </div>
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setDepRow(null)}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--primary" disabled={!depImporto.trim() || !depData.trim()} onClick={saveDeposito}>Salva</button>
          </div>
        </div>
      </Modal>

      <Modal open={rollingOpen} onClose={() => setRollingOpen(false)} title="Rolling Deposit Partner" size="lg">
        <div className="cdp-modal">
          <table className="cdp-modal__table">
            <thead>
              <tr><th>Partner</th><th>Deposito</th><th>Stato</th></tr>
            </thead>
            <tbody>
              {ROLLING_PARTNERS.map((p, i) => (
                <tr key={i}><td>{p.partner}</td><td>{p.deposito}</td><td>{p.stato}</td></tr>
              ))}
              <tr className="cdp-modal__tot"><td>Totale</td><td>0,00€</td><td /></tr>
            </tbody>
          </table>
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setRollingOpen(false)}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => { toast.success('Esportazione avviata.', 'Rolling Deposit'); setRollingOpen(false) }}>Scarica</button>
          </div>
        </div>
      </Modal>

      <Modal open={txRow !== null} onClose={() => setTxRow(null)} title="Dettaglio transazioni" size="lg">
        <div className="cdp-modal">
          <div className="cdp-modal__filters">
            <div className="cdp-modal__field">
              <label>Data Inizio</label>
              <input type="date" value={txFrom} onChange={e => setTxFrom(e.target.value)} />
            </div>
            <div className="cdp-modal__field">
              <label>Data Fine</label>
              <input type="date" value={txTo} onChange={e => setTxTo(e.target.value)} />
            </div>
            <button type="button" className="cdp-modal__dl" title="Esporta" onClick={() => toast.success('Esportazione avviata.', 'Transazioni')}>
              <Ico n="file" s={16} c="#fff" />
            </button>
          </div>
          <table className="cdp-modal__table">
            <thead>
              <tr><th>Cod. Prenotazione</th><th>Importo</th><th>Data transazione</th><th>Tipo transazione</th></tr>
            </thead>
            <tbody>
              <tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal open={histRow !== null} onClose={() => setHistRow(null)} title="Deposito" size="lg">
        <div className="cdp-modal">
          <table className="cdp-modal__table">
            <thead>
              <tr><th>Importo</th><th>Data transazione</th><th>Tipo transazione</th><th>Modifica</th></tr>
            </thead>
            <tbody>
              <tr><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal open={agRow !== null} onClose={() => setAgRow(null)} title="Modifica Agenzia" size="lg">
        <div className="cdp-modal">
          <div className="cdp-ag">
            {AG_FIELDS.map(f => (
              <div key={f.k} className={`cdp-ag__f${f.span === 2 ? ' cdp-ag__f--2' : ''}`}>
                <label>{f.label} *</label>
                <input value={agForm[f.k] || ''} placeholder={f.ph} onChange={e => setAg(f.k, e.target.value)} />
              </div>
            ))}
            <div className="cdp-ag__pair">
              <div className="cdp-ag__f">
                <label>Primo Sollecito *</label>
                <input value={agForm.primoSollecito} onChange={e => setAg('primoSollecito', e.target.value)} />
              </div>
              <div className="cdp-ag__f">
                <label>Secondo Sollecito *</label>
                <input value={agForm.secondoSollecito} onChange={e => setAg('secondoSollecito', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="cdp-modal__actions">
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={() => setAgRow(null)}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={saveAgenzia}>Salva</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
