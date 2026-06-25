import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import './ArchivioContratti.sass'

type TipoContratto = 'vendita' | 'acquisto'

interface Contratto {
  id: string
  ragioneSociale: string
  tipo: TipoContratto
  hasDoc: boolean
  hasEmail: boolean
  dataInizio: string
  dataFine: string
  validato: boolean
  scaduto?: boolean
}

const TIPO_LABEL: Record<TipoContratto, string> = {
  vendita:  'Contratto di Vendita',
  acquisto: 'Contratto di Acquisto',
}

const PAGE_SIZE = 8

const CONTRATTI: Contratto[] = [
  { id: '1',  ragioneSociale: 'Tour Operator Test',     tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '01/11/2025', dataFine: '01/04/2026', validato: false, scaduto: true  },
  { id: '2',  ragioneSociale: 'Tour Operator Test',     tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '01/12/2025', dataFine: '01/06/2026', validato: true },
  { id: '3',  ragioneSociale: 'Tour Operator Test',     tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '01/11/2025', dataFine: '01/04/2026', validato: true },
  { id: '4',  ragioneSociale: 'Sibylla Network s.r.l.', tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '03/02/2026', dataFine: '31/12/2026', validato: false, scaduto: true },
  { id: '5',  ragioneSociale: 'Tour Operator Test',     tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '01/11/2025', dataFine: '01/04/2026', validato: true },
  { id: '6',  ragioneSociale: 'Tour Operator Test',     tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '01/11/2025', dataFine: '01/04/2026', validato: true },
  { id: '7',  ragioneSociale: 'Tour Operator Test',     tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '01/11/2025', dataFine: '01/04/2026', validato: false, scaduto: true },
  { id: '8',  ragioneSociale: 'Malatesta',               tipo: 'vendita', hasDoc: true,  hasEmail: true, dataInizio: '17/03/2026', dataFine: '17/03/2026', validato: false, scaduto: true },
  { id: '9',  ragioneSociale: 'Hotel Splendid Roma',     tipo: 'acquisto', hasDoc: true, hasEmail: true, dataInizio: '12/01/2026', dataFine: '31/12/2026', validato: true },
  { id: '10', ragioneSociale: 'Grand Hotel Firenze',     tipo: 'acquisto', hasDoc: true, hasEmail: false, dataInizio: '01/03/2026', dataFine: '01/09/2026', validato: true },
  { id: '11', ragioneSociale: 'Boutique Hotel Venezia',  tipo: 'vendita',  hasDoc: true, hasEmail: true, dataInizio: '15/01/2026', dataFine: '15/07/2026', validato: true },
  { id: '12', ragioneSociale: 'Resort Costa Smeralda',   tipo: 'acquisto', hasDoc: true, hasEmail: true, dataInizio: '20/02/2026', dataFine: '20/08/2026', validato: false },
]

export default function ArchivioContratti({ navigate }: { navigate: (p: string) => void }) {
  const [contratti, setContratti] = useState<Contratto[]>(CONTRATTI)
  const [page, setPage]           = useState(1)
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null)
  const [notes, setNotes]             = useState<Record<string, string>>({})
  const [noteDraft, setNoteDraft]     = useState('')

  const totalPages = Math.max(1, Math.ceil(contratti.length / PAGE_SIZE))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageItems = contratti.slice(pageStart, pageStart + PAGE_SIZE)

  function remove(id: string) {
    setContratti(prev => prev.filter(c => c.id !== id))
  }

  function toggleNotes(id: string) {
    if (notesOpenId === id) {
      setNotesOpenId(null)
    } else {
      setNotesOpenId(id)
      setNoteDraft(notes[id] ?? '')
    }
  }
  function saveNote() {
    if (!notesOpenId) return
    setNotes(prev => ({ ...prev, [notesOpenId]: noteDraft }))
    setNotesOpenId(null)
  }
  function cancelNote() {
    setNotesOpenId(null)
    setNoteDraft('')
  }

  function downloadPdf(c: Contratto) {
    const txt = [
      `${TIPO_LABEL[c.tipo].toUpperCase()}`,
      ``,
      `Ragione sociale: ${c.ragioneSociale}`,
      `Periodo: ${c.dataInizio} → ${c.dataFine}`,
      `Stato: ${c.scaduto ? 'Scaduto' : c.validato ? 'Validato' : 'In attesa'}`,
    ].join('\n')
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contratto-${c.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="archivio">
      <BtnBack />
      <PageHeader
        title="Archivio contratti"
        subtitle="Archivio di tutti i documenti contrattuali attivi e passivi, che consente un facile accesso, monitoraggio e gestione delle scadenze"
      />

      <div className="archivio__top">
        <button
          type="button"
          className="sib-btn sib-btn--secondary archivio__top-btn"
          onClick={() => navigate('inserisci-contratto-a')}
        >
          <i className="fa-light fa-circle-plus" /> Inserisci contratto di acquisto
        </button>
        <button
          type="button"
          className="sib-btn sib-btn--secondary archivio__top-btn"
          onClick={() => navigate('inserisci-contratto-v')}
        >
          <i className="fa-light fa-circle-plus" /> Inserisci contratto di vendita
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table archivio__table">
          <thead>
            <tr>
              <th>Ragione Sociale</th>
              <th>Tipo contratto</th>
              <th className="archivio__th-center">Contatti</th>
              <th>Data inizio</th>
              <th>Data fine</th>
              <th className="archivio__th-center">Azione</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="sib-empty">Nessun contratto in archivio.</td></tr>
            )}
            {pageItems.map(c => (
              <React.Fragment key={c.id}>
              <tr className={c.scaduto ? 'archivio__row--inactive' : ''}>
                <td><strong>{c.ragioneSociale}</strong></td>
                <td>{TIPO_LABEL[c.tipo]}</td>
                <td className="archivio__td-center">
                  <span className="archivio__contacts">
                    {c.hasDoc && (
                      <Tooltip text="Apri contratto">
                        <button type="button" className="archivio__contact-btn" aria-label="Apri contratto">
                          <i className="fa-light fa-file-contract" />
                        </button>
                      </Tooltip>
                    )}
                    {c.hasEmail && (
                      <Tooltip text="Invia email">
                        <button type="button" className="archivio__contact-btn" aria-label="Invia email">
                          <i className="fa-light fa-envelope" />
                        </button>
                      </Tooltip>
                    )}
                  </span>
                </td>
                <td>{c.dataInizio}</td>
                <td>{c.dataFine}</td>
                <td className="archivio__td-center">
                  <span className="archivio__row-actions">
                    <Tooltip text={c.validato ? 'Validato' : 'Valida contratto'}>
                      <button
                        type="button"
                        className={'sib-btn sib-btn--icon' + (c.validato ? ' archivio__btn-validated' : '')}
                        disabled={c.scaduto}
                        aria-label="Valida contratto"
                      >
                        <i className="fa-light fa-circle-check" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Visualizza">
                      <button type="button" className="sib-btn sib-btn--icon" disabled={c.scaduto} aria-label="Visualizza">
                        <i className="fa-light fa-eye" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Visualizza note">
                      <button
                        type="button"
                        className={'sib-btn sib-btn--icon' + (notes[c.id] ? ' archivio__btn-has-notes' : '')}
                        onClick={() => toggleNotes(c.id)}
                        aria-label="Visualizza note"
                      >
                        <i className={'fa-light ' + (notes[c.id] ? 'fa-note-sticky' : 'fa-clipboard')} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Scarica PDF">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        disabled={c.scaduto}
                        onClick={() => downloadPdf(c)}
                        aria-label="Scarica PDF"
                      >
                        <i className="fa-light fa-file-pdf" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        onClick={() => remove(c.id)}
                        aria-label="Elimina"
                      >
                        <i className="fa-light fa-trash" />
                      </button>
                    </Tooltip>
                  </span>
                </td>
              </tr>
              {notesOpenId === c.id && (
                <tr className="archivio__notes-row">
                  <td colSpan={6}>
                    <div className="archivio__notes">
                      <label className="archivio__notes-label">
                        Note:
                        <input
                          type="text"
                          className="archivio__notes-input"
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          autoFocus
                          placeholder="Inserisci una nota per questo contratto…"
                        />
                      </label>
                      <span className="archivio__notes-actions">
                        <button type="button" className="sib-btn sib-btn--secondary" onClick={cancelNote}>
                          Annulla
                        </button>
                        <button type="button" className="sib-btn sib-btn--primary" onClick={saveNote}>
                          Salva
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="archivio__pagination">
        <span className="archivio__pagination-info">
          {contratti.length > 0
            ? `Risultati ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, contratti.length)} di ${contratti.length}`
            : '0 risultati'}
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
