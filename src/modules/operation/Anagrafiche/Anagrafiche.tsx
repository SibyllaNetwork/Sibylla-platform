import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Tooltip from '../../../core/components/Tooltip'
import Modal from '../../../core/components/Modal'
import { SelectField, DatePickerField, SearchField, InputField, TextareaField, CheckboxField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './Anagrafiche.sass'

// Anagrafiche dei clienti che fruiscono della struttura.
// BE: `operation/GetAnagrafichePerStruttura` (proxy). In assenza di BE si usano
// i dati di esempio sottostanti.

interface Anagrafica {
  id: number
  nomeCognome: string
  sesso: string
  dataNascita: string      // dd/mm/yyyy
  email: string
  telefono: string
  paeseNascita: string
  paeseResidenza: string
  nDocumento: string
  tipoDocumento: string
  scadeIl: string
  emessoDa: string
  struttura: string
  checkIn: string
  vip: boolean
  esenzione: boolean
  tipoEsenzione: string
  note: string
}

const mk = (o: Partial<Anagrafica> & Pick<Anagrafica, 'id' | 'nomeCognome'>): Anagrafica => ({
  sesso: '', dataNascita: '', email: '', telefono: '', paeseNascita: '', paeseResidenza: '',
  nDocumento: '', tipoDocumento: 'Carta Identità', scadeIl: '', emessoDa: '', struttura: 'Hotel Tutorial',
  checkIn: '-', vip: false, esenzione: false, tipoEsenzione: '', note: '', ...o,
})

const FALLBACK: Anagrafica[] = [
  mk({ id: 1,  nomeCognome: 'vx fvb',          sesso: 'Maschio', dataNascita: '17/06/2026', paeseNascita: 'ANDORRA', paeseResidenza: 'ALBANIA',    nDocumento: 'b',          tipoDocumento: 'Carta Identità',       scadeIl: '17/06/2026', emessoDa: 'bvcz' }),
  mk({ id: 2,  nomeCognome: 'fs f',            sesso: 'Femmina', dataNascita: '17/06/2026', paeseNascita: 'ALBANIA', paeseResidenza: 'ANDORRA',    nDocumento: 'gfhb',       tipoDocumento: 'Libretto di pensione', scadeIl: '17/06/2026', emessoDa: 'comune', note: 'Allergie segnalate' }),
  mk({ id: 3,  nomeCognome: 'christiana cici',                   dataNascita: '15/08/1958', paeseNascita: 'ALBANIA', paeseResidenza: 'ALBANIA',    nDocumento: 'as44467643', tipoDocumento: 'Carta Identità',       scadeIl: '15/09/2030', emessoDa: 'Comune' }),
  mk({ id: 4,  nomeCognome: 'sonia sissi',     sesso: 'Femmina', dataNascita: '25/05/1977', paeseNascita: 'BAHAMAS', paeseResidenza: 'BANGLADESH', nDocumento: 'ar12345op',  tipoDocumento: 'Carta Identità',       scadeIl: '06/06/2031', emessoDa: 'Comune', struttura: 'Hotel Torino' }),
  mk({ id: 5,  nomeCognome: 'moreno mimo',     sesso: 'Maschio', dataNascita: '25/05/1977', paeseNascita: 'BAHAMAS', paeseResidenza: 'BAHREIN',    nDocumento: 'ar12345op',  tipoDocumento: 'Carta Identità',       scadeIl: '06/06/2031', emessoDa: 'comune', struttura: 'Hotel Torino' }),
  mk({ id: 6,  nomeCognome: 'lorena mango',    sesso: 'Femmina', dataNascita: '25/05/1977', paeseNascita: 'BAHREIN', paeseResidenza: 'BANGLADESH', nDocumento: 'ar12345op',  tipoDocumento: 'Carta Identità',       scadeIl: '06/06/2031', emessoDa: 'comune', struttura: 'Hotel Catania' }),
  mk({ id: 7,  nomeCognome: 'pina pin',        sesso: 'Femmina', dataNascita: '15/08/1958', paeseNascita: 'ALBANIA', paeseResidenza: 'BELGIO',     nDocumento: 'ar12345op',  tipoDocumento: 'Carta Identità',       scadeIl: '15/09/2030', emessoDa: 'Comune', struttura: 'Hotel Catania' }),
  mk({ id: 8,  nomeCognome: 'paolo pili',      sesso: 'Maschio', dataNascita: '25/05/1977', paeseNascita: 'BAHAMAS', paeseResidenza: 'BAHREIN',    nDocumento: 'ar12345op',  tipoDocumento: 'Carta Identità',       scadeIl: '19/12/2026', emessoDa: 'comune', vip: true, note: 'Cliente VIP' }),
  mk({ id: 9,  nomeCognome: 'amedeo Balli',    sesso: 'Maschio', dataNascita: '09/04/2010', paeseNascita: 'ITALIA',  paeseResidenza: 'ITALIA',     nDocumento: 'gt5456546',  tipoDocumento: 'Carta Identità',       scadeIl: '18/06/2026', emessoDa: 'ft' }),
  mk({ id: 10, nomeCognome: 'giulia conti',    sesso: 'Femmina', dataNascita: '03/11/1990', paeseNascita: 'ITALIA',  paeseResidenza: 'ITALIA',     nDocumento: 'ca998877',   tipoDocumento: 'Passaporto',           scadeIl: '01/03/2029', emessoDa: 'Questura', struttura: 'Hotel Torino', email: 'g.conti@mail.it', telefono: '+39 333 1122334' }),
  mk({ id: 11, nomeCognome: 'marco bruno',     sesso: 'Maschio', dataNascita: '22/07/1985', paeseNascita: 'FRANCIA', paeseResidenza: 'FRANCIA',    nDocumento: 'fr551133',   tipoDocumento: 'Carta Identità',       scadeIl: '12/10/2027', emessoDa: 'Mairie', struttura: 'Hotel Catania' }),
  mk({ id: 12, nomeCognome: 'elena rossi',     sesso: 'Femmina', dataNascita: '14/02/1972', paeseNascita: 'ITALIA',  paeseResidenza: 'SVIZZERA',   nDocumento: 'ch224466',   tipoDocumento: 'Permesso di soggiorno', scadeIl: '30/06/2028', emessoDa: 'Comune', esenzione: true, tipoEsenzione: 'Soggiorno per motivi di lavoro documentati oltre il 10° pernottamento consecutivo' }),
]

interface Azienda {
  id: number
  ragioneSociale: string
  indirizzo: string
  email: string
  telefono: string
  pIva: string
  codFiscale: string
  note: string
}

const AZIENDE: Azienda[] = [
  { id: 1, ragioneSociale: 'ITALCAMEL',              indirizzo: 'Via Roma, 31, 20098 San Giuliano Milanese MI, Italia',   email: 'ditta@ditta.ditta', telefono: '32433233443', pIva: '86334519757', codFiscale: '12345678901', note: '' },
  { id: 2, ragioneSociale: 'Tui Poland',             indirizzo: '',                                                        email: '',                  telefono: '',            pIva: '',            codFiscale: '',            note: '' },
  { id: 3, ragioneSociale: 'test58',                 indirizzo: 'Via Termini, 12, 92023 Campobello di Licata AG, Italia',  email: 'test@gmai.com',     telefono: '321321',      pIva: '79879797915', codFiscale: 'gh67889',     note: '' },
  { id: 4, ragioneSociale: 'Hassab srl',             indirizzo: '',                                                        email: '',                  telefono: '',            pIva: '',            codFiscale: '',            note: '' },
  { id: 5, ragioneSociale: 'Tui Italia',             indirizzo: '',                                                        email: '',                  telefono: '',            pIva: '',            codFiscale: '',            note: '' },
  { id: 6, ragioneSociale: 'Ovest Destination Italy', indirizzo: 'Via dei Mille 30,00185,Roma RM,Italia',                  email: 'ovest@destiny.com', telefono: '024685',      pIva: '46450380624', codFiscale: '123456789456', note: '' },
  { id: 7, ragioneSociale: 'Debus snc',              indirizzo: '',                                                        email: '',                  telefono: '',            pIva: '',            codFiscale: '',            note: '' },
  { id: 8, ragioneSociale: 'Hassab srl',             indirizzo: "Via Ponza, 12, 09045 Quartu Sant'Elena CA, Italia",       email: '',                  telefono: '',            pIva: '',            codFiscale: '',            note: '' },
  { id: 9, ragioneSociale: 'Imperatore Travel',      indirizzo: '',                                                        email: '',                  telefono: '',            pIva: '',            codFiscale: '',            note: '' },
]

type FilterKey = 'sesso' | 'paeseNascita' | 'paeseResidenza' | 'tipoDocumento'

const PAGE_SIZE = 10
const TIPI_ANAGRAFICA = ['Persona fisica', 'Azienda']
const STRUTTURE = ['Tutte', 'Hotel Tutorial', 'Hotel Torino', 'Hotel Catania']
const SESSI = ['Maschio', 'Femmina']
const TIPI_DOCUMENTO = ['Carta Identità', 'Passaporto', 'Patente di guida', 'Permesso di soggiorno', 'Libretto di pensione']

// dd/mm/yyyy ↔ yyyy-mm-dd (per i campi <input type=date>)
const toISO = (d: string) => { const [g, m, a] = (d || '').split('/'); return a && m && g ? `${a}-${m}-${g}` : '' }
const toIt  = (iso: string) => { const [a, m, g] = (iso || '').split('-'); return g && m && a ? `${g}/${m}/${a}` : '' }

export default function Anagrafiche({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Anagrafica[]>(FALLBACK)
  const [aziende, setAziende] = useState<Azienda[]>(AZIENDE)
  const [tipo, setTipo] = useState(TIPI_ANAGRAFICA[0])
  const isAzienda = tipo === 'Azienda'
  const [struttura, setStruttura] = useState('Tutte')
  const [soggiorno, setSoggiorno] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Azioni di riga (note: generiche persona/azienda)
  const [noteEdit, setNoteEdit] = useState<{ id: number; kind: 'p' | 'a'; name: string } | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteView, setNoteView] = useState<{ name: string; note: string } | null>(null)
  const [editRow, setEditRow] = useState<Anagrafica | null>(null)
  const [detailRow, setDetailRow] = useState<Anagrafica | null>(null)
  const [editAz, setEditAz] = useState<Azienda | null>(null)
  const [detailAz, setDetailAz] = useState<Azienda | null>(null)
  const [storicoName, setStoricoName] = useState<string | null>(null)

  // Filtri per colonna (multi-scelta)
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<FilterKey, string[]>>({ sesso: [], paeseNascita: [], paeseResidenza: [], tipoDocumento: [] })
  const toggleCol = (k: FilterKey, v: string) =>
    setColFilters((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))
  const setAllCol = (k: FilterKey, all: string[], sel: boolean) =>
    setColFilters((p) => ({ ...p, [k]: sel ? [...all] : [] }))
  const distinct = (key: FilterKey) => Array.from(new Set(items.map((a) => a[key]).filter(Boolean))).sort()

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Anagrafica[]>('operation/GetAnagrafichePerStruttura', { method: 'POST', body: {} })
      .then((data) => { if (!cancelled && Array.isArray(data) && data.length && data[0]?.nomeCognome) setItems(data) })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let rows = items
    if (struttura !== 'Tutte') rows = rows.filter((a) => a.struttura === struttura)
    const q = search.toLowerCase().trim()
    if (q) rows = rows.filter((a) =>
      a.nomeCognome.toLowerCase().includes(q) ||
      a.nDocumento.toLowerCase().includes(q) ||
      a.paeseResidenza.toLowerCase().includes(q),
    )
    if (colFilters.sesso.length)          rows = rows.filter((a) => colFilters.sesso.includes(a.sesso))
    if (colFilters.paeseNascita.length)   rows = rows.filter((a) => colFilters.paeseNascita.includes(a.paeseNascita))
    if (colFilters.paeseResidenza.length) rows = rows.filter((a) => colFilters.paeseResidenza.includes(a.paeseResidenza))
    if (colFilters.tipoDocumento.length)  rows = rows.filter((a) => colFilters.tipoDocumento.includes(a.tipoDocumento))
    return rows
  }, [items, struttura, search, colFilters])

  useEffect(() => { setPage(1) }, [tipo, struttura, soggiorno, search, colFilters])

  const aziendeFiltered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return aziende
    return aziende.filter((a) =>
      a.ragioneSociale.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) ||
      a.pIva.includes(q) || a.codFiscale.toLowerCase().includes(q),
    )
  }, [aziende, search])

  const [creaAzOpen, setCreaAzOpen] = useState(false)

  const activeLen = isAzienda ? aziendeFiltered.length : filtered.length
  const totalPages = Math.max(1, Math.ceil(activeLen / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)
  const pageAziende = aziendeFiltered.slice(start, start + PAGE_SIZE)

  const salvaNota = () => {
    if (!noteEdit) return
    if (noteEdit.kind === 'p') setItems((prev) => prev.map((a) => (a.id === noteEdit.id ? { ...a, note: noteDraft } : a)))
    else setAziende((prev) => prev.map((a) => (a.id === noteEdit.id ? { ...a, note: noteDraft } : a)))
    setNoteEdit(null)
  }
  const salvaAnagrafica = (upd: Anagrafica) => {
    setItems((prev) => prev.map((a) => (a.id === upd.id ? upd : a)))
    setEditRow(null)
  }
  const salvaAzienda = (upd: Azienda) => {
    setAziende((prev) => prev.map((a) => (a.id === upd.id ? upd : a)))
    setEditAz(null)
  }
  const creaAzienda = (a: Omit<Azienda, 'id'>) => {
    setAziende((prev) => [{ ...a, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }, ...prev])
    setCreaAzOpen(false)
  }

  return (
    <div>
      <BtnBack />
      <PageHeader title="Anagrafiche" subtitle="Organizza, aggiorna e controlla le anagrafiche dei clienti della struttura" />

      <FilterToolbar>
        <SelectField name="tipo" label="Tipo anagrafica" value={tipo} onChange={(e) => setTipo(e.target.value)}
          options={TIPI_ANAGRAFICA.map((t) => ({ value: t, label: t }))} />
        {!isAzienda && (
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        )}
        {!isAzienda && (
          <DatePickerField name="soggiorno" label="Soggiorno" placeholder="Seleziona soggiorno" value={soggiorno} onChange={(e) => setSoggiorno(e.target.value)} />
        )}
        <div className="flex flex-col gap-1 min-w-[240px]">
          <label className="text-[12px] font-semibold font-poppins text-primary">Cerca</label>
          <SearchField name="cerca" placeholder={isAzienda ? 'Ragione sociale, P. IVA…' : 'Nome, documento o paese…'} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button" className="sib-btn sib-btn--primary"
          onClick={() => (isAzienda ? setCreaAzOpen(true) : navigate('crea-anagrafica'))}>
          <i className="fa-light fa-circle-plus" /> Aggiungi Anagrafica
        </button>
      </FilterToolbar>

      {!isAzienda ? (
      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Nome e Cognome</th>
              <th>
                <ColFilterHeader label="Sesso" options={distinct('sesso')} selected={colFilters.sesso}
                  open={openFilter === 'sesso'} onToggleOpen={() => setOpenFilter(openFilter === 'sesso' ? null : 'sesso')}
                  onToggle={(v) => toggleCol('sesso', v)} onSelectAll={(s) => setAllCol('sesso', distinct('sesso'), s)} />
              </th>
              <th>Data di nascita</th>
              <th>
                <ColFilterHeader label="Paese di nascita" options={distinct('paeseNascita')} selected={colFilters.paeseNascita}
                  open={openFilter === 'paeseNascita'} onToggleOpen={() => setOpenFilter(openFilter === 'paeseNascita' ? null : 'paeseNascita')}
                  onToggle={(v) => toggleCol('paeseNascita', v)} onSelectAll={(s) => setAllCol('paeseNascita', distinct('paeseNascita'), s)} />
              </th>
              <th>
                <ColFilterHeader label="Paese di residenza" options={distinct('paeseResidenza')} selected={colFilters.paeseResidenza}
                  open={openFilter === 'paeseResidenza'} onToggleOpen={() => setOpenFilter(openFilter === 'paeseResidenza' ? null : 'paeseResidenza')}
                  onToggle={(v) => toggleCol('paeseResidenza', v)} onSelectAll={(s) => setAllCol('paeseResidenza', distinct('paeseResidenza'), s)} />
              </th>
              <th>N° Documento</th>
              <th>
                <ColFilterHeader label="Tipo" options={distinct('tipoDocumento')} selected={colFilters.tipoDocumento}
                  open={openFilter === 'tipoDocumento'} onToggleOpen={() => setOpenFilter(openFilter === 'tipoDocumento' ? null : 'tipoDocumento')}
                  onToggle={(v) => toggleCol('tipoDocumento', v)} onSelectAll={(s) => setAllCol('tipoDocumento', distinct('tipoDocumento'), s)} />
              </th>
              <th>Scade il</th>
              <th>Emesso da</th>
              <th>Struttura</th>
              <th>Check-in</th>
              <th className="text-center">Note</th>
              <th className="text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={13} className="sib-empty">Nessuna anagrafica trovata.</td></tr>
            ) : pageRows.map((a) => (
              <tr key={a.id}>
                <td>{a.nomeCognome}</td>
                <td>{a.sesso || '-'}</td>
                <td>{a.dataNascita}</td>
                <td>{a.paeseNascita}</td>
                <td>{a.paeseResidenza}</td>
                <td>{a.nDocumento}</td>
                <td>{a.tipoDocumento}</td>
                <td>{a.scadeIl}</td>
                <td>{a.emessoDa || '-'}</td>
                <td>{a.struttura}</td>
                <td>{a.checkIn}</td>
                <td className="text-center">
                  <Tooltip text={a.note ? 'Vedi nota' : 'Nessuna nota'}>
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Vedi nota" onClick={() => setNoteView({ name: a.nomeCognome, note: a.note })}>
                      <i className={`fa-light fa-circle-info ${a.note ? 'text-primary' : ''}`} />
                    </button>
                  </Tooltip>
                </td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Tooltip text="Inserisci note">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Inserisci note" onClick={() => { setNoteEdit({ id: a.id, kind: 'p', name: a.nomeCognome }); setNoteDraft(a.note) }}>
                        <i className="fa-light fa-file-lines" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Modifica anagrafica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica anagrafica" onClick={() => setEditRow(a)}>
                        <i className="fa-light fa-pen-to-square" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Dettaglio anagrafica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Dettaglio anagrafica" onClick={() => setDetailRow(a)}>
                        <i className="fa-light fa-eye" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Storico prenotazioni">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Storico prenotazioni" onClick={() => setStoricoName(a.nomeCognome)}>
                        <i className="fa-light fa-clock-rotate-left" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Ragione sociale</th>
              <th>Indirizzo</th>
              <th>E-mail</th>
              <th>Telefono</th>
              <th>P. IVA</th>
              <th>Cod. Fiscale</th>
              <th>Tipo anagrafica</th>
              <th className="text-center">Note</th>
              <th className="text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageAziende.length === 0 ? (
              <tr><td colSpan={9} className="sib-empty">Nessuna azienda trovata.</td></tr>
            ) : pageAziende.map((a) => (
              <tr key={a.id}>
                <td>{a.ragioneSociale}</td>
                <td className={a.indirizzo ? '' : 'sib-cell--muted'}>{a.indirizzo || '-'}</td>
                <td>{a.email || '-'}</td>
                <td>{a.telefono || '-'}</td>
                <td>{a.pIva || '-'}</td>
                <td>{a.codFiscale || '-'}</td>
                <td>Azienda</td>
                <td className="text-center">
                  <Tooltip text={a.note ? 'Vedi nota' : 'Nessuna nota'}>
                    <button type="button" className="sib-btn sib-btn--icon" aria-label="Vedi nota" onClick={() => setNoteView({ name: a.ragioneSociale, note: a.note })}>
                      <i className={`fa-light fa-circle-info ${a.note ? 'text-primary' : ''}`} />
                    </button>
                  </Tooltip>
                </td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Tooltip text="Inserisci note">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Inserisci note" onClick={() => { setNoteEdit({ id: a.id, kind: 'a', name: a.ragioneSociale }); setNoteDraft(a.note) }}>
                        <i className="fa-light fa-file-lines" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Dettaglio anagrafica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Dettaglio anagrafica" onClick={() => setDetailAz(a)}>
                        <i className="fa-light fa-eye" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Storico prenotazioni">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Storico prenotazioni" onClick={() => setStoricoName(a.ragioneSociale)}>
                        <i className="fa-light fa-clock-rotate-left" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Modifica anagrafica">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica anagrafica" onClick={() => setEditAz(a)}>
                        <i className="fa-light fa-pen-to-square" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="justify-center mt-3" />

      {/* ─── Inserisci note ─────────────────────────────────────────────────── */}
      {noteEdit && (
        <Modal open onClose={() => setNoteEdit(null)} title="Inserisci nota" size="md">
          <TextareaField name="nota" label={`Nota — ${noteEdit.name}`} rows={4}
            placeholder="Inserire una nota" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setNoteEdit(null)}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={salvaNota}>Salva</button>
          </div>
        </Modal>
      )}

      {/* ─── Vista nota (click sulla "i") ───────────────────────────────────── */}
      {noteView && (
        <Modal open onClose={() => setNoteView(null)} title="Nota" size="sm">
          <p className="text-[14px] leading-relaxed text-ink">
            {noteView.note || <span className="sib-cell--muted">Nessuna nota inserita.</span>}
          </p>
          <div className="flex justify-end mt-5">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setNoteView(null)}>Chiudi</button>
          </div>
        </Modal>
      )}

      {/* ─── Modifica / Dettaglio (persona) ─────────────────────────────────── */}
      {editRow && <ModificaAnagraficaModal row={editRow} onClose={() => setEditRow(null)} onSave={salvaAnagrafica} />}
      {detailRow && <DettaglioAnagraficaModal row={detailRow} onClose={() => setDetailRow(null)} />}

      {/* ─── Modifica / Dettaglio / Creazione (azienda) ─────────────────────── */}
      {editAz && <ModificaAziendaModal az={editAz} onClose={() => setEditAz(null)} onSave={salvaAzienda} />}
      {detailAz && <DettaglioAziendaModal az={detailAz} onClose={() => setDetailAz(null)} />}
      {creaAzOpen && <CreaAziendaModal onClose={() => setCreaAzOpen(false)} onSave={creaAzienda} />}

      {/* ─── Storico soggiorni ──────────────────────────────────────────────── */}
      {storicoName && <StoricoSoggiorniModal name={storicoName} onClose={() => setStoricoName(null)} />}
    </div>
  )
}

// ─── COL FILTER HEADER (multi-scelta, standard) ─────────────────────────────────
function ColFilterHeader({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll }: {
  label: string; options: string[]; selected: string[]; open: boolean
  onToggleOpen: () => void; onToggle: (value: string) => void; onSelectAll: (select: boolean) => void
}) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="anag-colfilter">
      <span>{label}</span>
      <button type="button" className={'anag-colfilter__btn' + (hasFilter ? ' anag-colfilter__btn--active' : '')} onClick={onToggleOpen} aria-label={`Filtra per ${label}`}>
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="anag-colfilter__overlay" onClick={onToggleOpen} />
          <div className="anag-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="anag-colfilter__title">Filtra</div>
            <label className="anag-colfilter__option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="anag-colfilter__option">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── STORICO SOGGIORNI ──────────────────────────────────────────────────────────
interface Soggiorno {
  id: number; nPren: string; camera: string; intestatario: string
  dataIn: string; dataOut: string; dataAddebito: string; azienda: string
  trattamento: string; persone: number; importo: string; stato: string
}

function StoricoSoggiorniModal({ name, onClose }: { name: string; onClose: () => void }) {
  const stays: Soggiorno[] = [
    { id: 1, nPren: '15379', camera: '105', intestatario: name, dataIn: '19/06/2026', dataOut: '22/06/2026', dataAddebito: '17/06/2026', azienda: '-',          trattamento: 'Bed & Breakfast', persone: 2, importo: '224,46 €', stato: 'Confermata' },
    { id: 2, nPren: '14902', camera: '203', intestatario: name, dataIn: '02/03/2026', dataOut: '05/03/2026', dataAddebito: '28/02/2026', azienda: 'GAR S.R.L',  trattamento: 'Mezza pensione',  persone: 1, importo: '310,00 €', stato: 'Chiusa' },
    { id: 3, nPren: '14710', camera: '101', intestatario: name, dataIn: '10/12/2025', dataOut: '14/12/2025', dataAddebito: '05/12/2025', azienda: '-',          trattamento: 'Room only',       persone: 2, importo: '180,00 €', stato: 'Chiusa' },
  ]
  const [openId, setOpenId] = useState<number | null>(stays[0]?.id ?? null)

  return (
    <Modal open onClose={onClose} title="Storico soggiorni" size="xl">
      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th style={{ width: 36 }} />
              <th>N. prenotazione</th>
              <th>Camera n.</th>
              <th>Intestatario</th>
              <th>Data in</th>
              <th>Data Out</th>
              <th>Data addebito</th>
              <th>Azienda</th>
            </tr>
          </thead>
          <tbody>
            {stays.map((s) => (
              <React.Fragment key={s.id}>
                <tr>
                  <td className="text-center">
                    <button type="button" className="sib-btn sib-btn--icon" aria-label={openId === s.id ? 'Comprimi' : 'Espandi'} onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                      <i className={`fa-light ${openId === s.id ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
                    </button>
                  </td>
                  <td>{s.nPren}</td>
                  <td>{s.camera}</td>
                  <td>{s.intestatario}</td>
                  <td>{s.dataIn}</td>
                  <td>{s.dataOut}</td>
                  <td>{s.dataAddebito}</td>
                  <td className={s.azienda === '-' ? 'sib-cell--muted' : ''}>{s.azienda}</td>
                </tr>
                {openId === s.id && (
                  <tr>
                    <td colSpan={8} className="bg-bg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2 px-1">
                        <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Trattamento</span><span className="text-[13px] text-ink">{s.trattamento}</span></div>
                        <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">N° persone</span><span className="text-[13px] text-ink">{s.persone}</span></div>
                        <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Importo</span><span className="text-[13px] text-ink">{s.importo}</span></div>
                        <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Stato</span><span className="text-[13px] text-ink">{s.stato}</span></div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-5">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  )
}

// ─── MODIFICA ANAGRAFICA ────────────────────────────────────────────────────────
function ModificaAnagraficaModal({ row, onClose, onSave }: { row: Anagrafica; onClose: () => void; onSave: (a: Anagrafica) => void }) {
  const [nome, ...restNome] = row.nomeCognome.split(' ')
  const [form, setForm] = useState({
    nome: nome || '',
    cognome: restNome.join(' ') || '',
    sesso: row.sesso,
    dataNascita: toISO(row.dataNascita),
    email: row.email,
    telefono: row.telefono,
    paeseNascita: row.paeseNascita,
    paeseResidenza: row.paeseResidenza,
    tipoDocumento: row.tipoDocumento,
    nDocumento: row.nDocumento,
    scadeIl: toISO(row.scadeIl),
    emessoDa: row.emessoDa,
    vip: row.vip,
    note: row.note,
    esenzione: row.esenzione,
    tipoEsenzione: row.tipoEsenzione,
  })
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }))

  const salva = () => {
    onSave({
      ...row,
      nomeCognome: `${form.nome} ${form.cognome}`.trim(),
      sesso: form.sesso, dataNascita: toIt(form.dataNascita), email: form.email, telefono: form.telefono,
      paeseNascita: form.paeseNascita, paeseResidenza: form.paeseResidenza, tipoDocumento: form.tipoDocumento,
      nDocumento: form.nDocumento, scadeIl: toIt(form.scadeIl), emessoDa: form.emessoDa,
      vip: form.vip, note: form.note, esenzione: form.esenzione, tipoEsenzione: form.tipoEsenzione,
    })
  }

  return (
    <Modal open onClose={onClose} title="Modifica anagrafica" size="xl">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <InputField name="nome" label="Nome" required value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          <InputField name="cognome" label="Cognome" required value={form.cognome} onChange={(e) => set('cognome', e.target.value)} />
          <SelectField name="sesso" label="Sesso" placeholder="Seleziona" value={form.sesso} onChange={(e) => set('sesso', e.target.value)}
            options={SESSI.map((s) => ({ value: s, label: s }))} />
          <DatePickerField name="dataNascita" label="Data di Nascita" value={form.dataNascita} onChange={(e) => set('dataNascita', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField name="email" label="Email" type="email" placeholder="Inserire email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField name="telefono" label="Telefono" placeholder="Inserire telefono" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField name="paeseNascita" label="Paese di nascita" value={form.paeseNascita} onChange={(e) => set('paeseNascita', e.target.value)} />
          <InputField name="paeseResidenza" label="Paese di residenza" value={form.paeseResidenza} onChange={(e) => set('paeseResidenza', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SelectField name="tipoDocumento" label="Documento identità" value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)}
            options={TIPI_DOCUMENTO.map((t) => ({ value: t, label: t }))} />
          <InputField name="nDocumento" label="Numero documento" value={form.nDocumento} onChange={(e) => set('nDocumento', e.target.value)} />
          <DatePickerField name="scadeIl" label="Scade il" value={form.scadeIl} onChange={(e) => set('scadeIl', e.target.value)} />
          <InputField name="emessoDa" label="Emesso da" value={form.emessoDa} onChange={(e) => set('emessoDa', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold font-poppins text-primary">Carica documento</label>
            <label className="sib-input flex items-center cursor-pointer text-ink-muted">
              <input type="file" hidden />
              <span>Scegli il file</span>
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold font-poppins text-primary">Acquisisci documento</label>
            <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-light fa-camera" /> Acquisisci</button>
          </div>
          <div className="pb-2"><CheckboxField name="vip" label="VIP" checked={form.vip} onChange={(e) => set('vip', e.target.checked)} /></div>
        </div>
        <TextareaField name="note" label="Note" rows={3} placeholder="Inserire note aggiuntive" value={form.note} onChange={(e) => set('note', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
          <CheckboxField name="esenzione" label="Esenzione tassa di sogg." checked={form.esenzione} onChange={(e) => set('esenzione', e.target.checked)} />
          <InputField name="tipoEsenzione" label="Tipo esenzione" disabled={!form.esenzione} value={form.tipoEsenzione} onChange={(e) => set('tipoEsenzione', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>Salva</button>
      </div>
    </Modal>
  )
}

// ─── DETTAGLIO ANAGRAFICA (read-only) ───────────────────────────────────────────
function DettaglioAnagraficaModal({ row, onClose }: { row: Anagrafica; onClose: () => void }) {
  const F = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-[14px] text-ink">{value || '-'}</span>
    </div>
  )
  return (
    <Modal open onClose={onClose} title="Dettaglio anagrafica" size="lg">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <F label="Nome e cognome" value={row.nomeCognome} />
        <F label="Sesso" value={row.sesso} />
        <F label="Data di nascita" value={row.dataNascita} />
        <F label="Email" value={row.email} />
        <F label="Telefono" value={row.telefono} />
        <F label="VIP" value={row.vip ? 'Sì' : 'No'} />
        <F label="Paese di nascita" value={row.paeseNascita} />
        <F label="Paese di residenza" value={row.paeseResidenza} />
        <F label="Struttura" value={row.struttura} />
        <F label="Documento" value={row.tipoDocumento} />
        <F label="N° documento" value={row.nDocumento} />
        <F label="Scade il" value={row.scadeIl} />
        <F label="Emesso da" value={row.emessoDa} />
        <F label="Check-in" value={row.checkIn} />
        <F label="Esenzione tassa" value={row.esenzione ? 'Sì' : 'No'} />
        <div className="col-span-2 md:col-span-3"><F label="Tipo esenzione" value={row.tipoEsenzione} /></div>
        <div className="col-span-2 md:col-span-3"><F label="Note" value={row.note} /></div>
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  )
}

// ─── MODIFICA AZIENDA ───────────────────────────────────────────────────────────
function ModificaAziendaModal({ az, onClose, onSave }: { az: Azienda; onClose: () => void; onSave: (a: Azienda) => void }) {
  const [form, setForm] = useState({ ...az })
  const set = <K extends keyof Azienda>(k: K, v: Azienda[K]) => setForm((p) => ({ ...p, [k]: v }))
  return (
    <Modal open onClose={onClose} title="Modifica anagrafica Ditta/Agenzia" size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
          <InputField name="ragioneSociale" label="Ragione sociale" required value={form.ragioneSociale} onChange={(e) => set('ragioneSociale', e.target.value)} />
          <InputField name="indirizzo" label="Indirizzo" placeholder="Clicca per cercare indirizzo" value={form.indirizzo} onChange={(e) => set('indirizzo', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField name="email" label="E-mail" type="email" placeholder="Inserisci email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField name="telefono" label="Telefono" placeholder="Inserisci telefono" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          <InputField name="pIva" label="P. Iva" placeholder="Inserisci Partita iva" value={form.pIva} onChange={(e) => set('pIva', e.target.value)} />
        </div>
        <InputField name="codFiscale" label="Cod. Fiscale" placeholder="Inserisci codice fiscale" value={form.codFiscale} onChange={(e) => set('codFiscale', e.target.value)} className="md:w-1/3" />
        <TextareaField name="note" label="Note" rows={3} placeholder="Inserire note aggiuntive" value={form.note} onChange={(e) => set('note', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => onSave(form)}>Salva</button>
      </div>
    </Modal>
  )
}

// ─── DETTAGLIO AZIENDA (read-only) ──────────────────────────────────────────────
function DettaglioAziendaModal({ az, onClose }: { az: Azienda; onClose: () => void }) {
  const F = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-[14px] text-ink">{value || '-'}</span>
    </div>
  )
  return (
    <Modal open onClose={onClose} title="Dettaglio anagrafica" size="lg">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2 md:col-span-3"><F label="Ragione sociale" value={az.ragioneSociale} /></div>
        <div className="col-span-2 md:col-span-3"><F label="Indirizzo" value={az.indirizzo} /></div>
        <F label="E-mail" value={az.email} />
        <F label="Telefono" value={az.telefono} />
        <F label="Tipo anagrafica" value="Azienda" />
        <F label="P. IVA" value={az.pIva} />
        <F label="Cod. Fiscale" value={az.codFiscale} />
        <div className="col-span-2 md:col-span-3"><F label="Note" value={az.note} /></div>
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  )
}

// ─── CREAZIONE ANAGRAFICA DITTA/AGENZIA ─────────────────────────────────────────
function CreaAziendaModal({ onClose, onSave }: { onClose: () => void; onSave: (a: Omit<Azienda, 'id'>) => void }) {
  const [form, setForm] = useState({
    ragioneSociale: '', indirizzo: '', email: '', telefono: '', pIva: '',
    codFiscale: '', codiceDestinatario: '', pec: '', nomeDitta: '',
  })
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const salva = () => onSave({
    ragioneSociale: form.ragioneSociale || form.nomeDitta || 'Nuova azienda',
    indirizzo: form.indirizzo, email: form.email, telefono: form.telefono,
    pIva: form.pIva, codFiscale: form.codFiscale, note: '',
  })
  return (
    <Modal open onClose={onClose} title="Crea anagrafica azienda" size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
          <InputField name="ragioneSociale" label="Ragione sociale" required placeholder="Inserisci nome azienda" value={form.ragioneSociale} onChange={(e) => set('ragioneSociale', e.target.value)} />
          <InputField name="indirizzo" label="Indirizzo" placeholder="Clicca per cercare indirizzo" value={form.indirizzo} onChange={(e) => set('indirizzo', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField name="email" label="E-mail" type="email" placeholder="Inserisci email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField name="telefono" label="Telefono" placeholder="Inserisci telefono" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          <InputField name="pIva" label="P. Iva" placeholder="Inserisci Partita iva" value={form.pIva} onChange={(e) => set('pIva', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField name="codFiscale" label="Cod. Fiscale" placeholder="Inserisci codice fiscale" value={form.codFiscale} onChange={(e) => set('codFiscale', e.target.value)} />
          <InputField name="codiceDestinatario" label="Codice Destinatario (ISD)" placeholder="Inserisci il codice destinatario" value={form.codiceDestinatario} onChange={(e) => set('codiceDestinatario', e.target.value)} />
          <InputField name="pec" label="PEC" placeholder="Inserisci Pec" value={form.pec} onChange={(e) => set('pec', e.target.value)} />
        </div>
        <InputField name="nomeDitta" label="Nome ditta" placeholder="Inserisci nome ditta" value={form.nomeDitta} onChange={(e) => set('nomeDitta', e.target.value)} className="md:w-1/3" />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={salva}>Salva</button>
      </div>
    </Modal>
  )
}
