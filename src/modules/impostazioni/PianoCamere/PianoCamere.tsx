import React, { useMemo, useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import Modal from '../../../core/components/Modal'
import { DatePickerField, SelectField, SearchField, RadioGroup, InputField, TextareaField } from '../../../core/components/form'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import './PianoCamere.sass'

// Piano camere giornaliero — vista operativa giornaliera per camera (occupazione,
// assegnatario, pulizia, manutenzione, VIP). Da Stato camere → "Piano camere giornaliero".

interface Riga {
  id: number
  data: string
  camera: string
  statoOcc: string
  assegnatario: string
  cliente: string
  inData: string
  outData: string
  progrRN: string
  gruppo: boolean
  note: string
  pulizia: boolean
  manutenzione: boolean
  vip: boolean
}

const STRUTTURE = ['Hotel Tutorial', 'Hotel Archimede', 'Hotel Azzurro Mare']
const PAGE_SIZE = 10
const D = '26/06/2026'

const MOCK: Riga[] = [
  { id: 1,  data: D, camera: '1',   statoOcc: 'Arrivata',       assegnatario: 'dino tacchini', cliente: 'Virgy novi',   inData: '26/06/2026', outData: '27/06/2026', progrRN: '0', gruppo: false, note: '', pulizia: true,  manutenzione: true, vip: false },
  { id: 2,  data: D, camera: '101', statoOcc: 'In manutenzione', assegnatario: 'Ruggero AppOp', cliente: 'Emy Nasa',     inData: '19/06/2026', outData: '26/06/2026', progrRN: '-', gruppo: false, note: '', pulizia: false, manutenzione: true, vip: false },
  { id: 3,  data: D, camera: '102', statoOcc: 'In manutenzione', assegnatario: 'dino tacchini', cliente: 'paolo pili',   inData: '26/06/2026', outData: '27/06/2026', progrRN: '0', gruppo: false, note: '', pulizia: false, manutenzione: true, vip: false },
  { id: 4,  data: D, camera: '103', statoOcc: 'In manutenzione', assegnatario: 'dino tacchini', cliente: 'ilenia dibi',  inData: '26/06/2026', outData: '27/06/2026', progrRN: '0', gruppo: false, note: '', pulizia: false, manutenzione: true, vip: false },
  { id: 5,  data: D, camera: '104', statoOcc: 'In manutenzione', assegnatario: 'dino tacchini', cliente: 'miranda rossi', inData: '26/06/2026', outData: '27/06/2026', progrRN: '0', gruppo: false, note: '', pulizia: true,  manutenzione: true, vip: false },
  { id: 6,  data: D, camera: '105', statoOcc: '-',              assegnatario: 'dino tacchini', cliente: '',            inData: '', outData: '', progrRN: '-', gruppo: false, note: '', pulizia: true,  manutenzione: true, vip: false },
  { id: 7,  data: D, camera: '106', statoOcc: 'In arrivo',       assegnatario: 'Ruggero AppOp', cliente: 'test df nasa', inData: '26/06/2026', outData: '27/06/2026', progrRN: '0', gruppo: false, note: '', pulizia: false, manutenzione: true, vip: false },
  { id: 8,  data: D, camera: '107', statoOcc: '-',              assegnatario: 'Ruggero AppOp', cliente: '',            inData: '', outData: '', progrRN: '-', gruppo: false, note: '', pulizia: true,  manutenzione: true, vip: false },
  { id: 9,  data: D, camera: '108', statoOcc: 'In arrivo',       assegnatario: 'Sibylla System', cliente: 'paolo pili', inData: '26/06/2026', outData: '27/06/2026', progrRN: '0', gruppo: false, note: '', pulizia: false, manutenzione: true, vip: true  },
  { id: 10, data: D, camera: '109', statoOcc: '-',              assegnatario: 'Ruggero AppOp', cliente: '',            inData: '', outData: '', progrRN: '-', gruppo: false, note: '', pulizia: true,  manutenzione: true, vip: false },
  { id: 11, data: D, camera: '110', statoOcc: 'Arrivata',       assegnatario: 'dino tacchini', cliente: 'luca verdi',  inData: '26/06/2026', outData: '28/06/2026', progrRN: '0', gruppo: true,  note: 'Gruppo Robintur', pulizia: false, manutenzione: true, vip: false },
  { id: 12, data: D, camera: '201', statoOcc: '-',              assegnatario: 'Ruggero AppOp', cliente: '',            inData: '', outData: '', progrRN: '-', gruppo: false, note: '', pulizia: true,  manutenzione: false, vip: false },
]

export default function PianoCamere({ navigate }: { navigate: (p: string) => void }) {
  const [giorno, setGiorno] = useState('2026-06-26')
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('tutte')
  const [page, setPage] = useState(1)
  const [creaOpen, setCreaOpen] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)

  const filtered = useMemo(() => {
    let rows = MOCK
    if (status === 'libere')  rows = rows.filter((r) => r.statoOcc === '-')
    if (status === 'occupate') rows = rows.filter((r) => r.statoOcc !== '-')
    const q = search.toLowerCase().trim()
    if (q) rows = rows.filter((r) => `${r.camera} ${r.assegnatario} ${r.cliente}`.toLowerCase().includes(q))
    return rows
  }, [status, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const esportaXls = () => {
    const header = ['Data', 'Camera', 'Stato Occupazione', 'Assegnatario', 'Cliente', 'In/Out', 'Progr. RN', 'Tipo', 'Note', 'Pulizia', 'Manutenzione', 'VIP']
    const body = filtered.map((r) => [r.data, r.camera, r.statoOcc, r.assegnatario, r.cliente || '-', r.inData ? `${r.inData} - ${r.outData}` : '-', r.progrRN, r.gruppo ? 'Gruppo' : 'Individuale', r.note || '-', r.pulizia ? 'Sì' : 'No', r.manutenzione ? 'Sì' : 'No', r.vip ? 'Sì' : 'No'])
    exportTableToXls('piano-camere.xls', header, body, 'Piano camere giornaliero')
  }
  const esportaPdf = () => exportElementToPdf(tableRef.current, 'piano-camere.pdf', 'Piano camere giornaliero')

  return (
    <div className="piano-cam">
      <BtnBack onClick={() => navigate('stato-camere')} />
      <PageHeader title="Piano camere giornaliero" subtitle="Vista operativa giornaliera per camera" />

      <div className="piano-cam__bar">
        <DatePickerField name="giorno" label="Giorno" className="w-44" value={giorno} onChange={(e) => setGiorno(e.target.value)} />
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-[12px] font-semibold font-poppins text-primary">Ricerca</label>
          <SearchField name="cerca" placeholder="Cerca…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <button type="button" className="sib-btn sib-btn--icon" aria-label="Aggiorna" title="Aggiorna"><i className="fa-light fa-arrows-rotate" /></button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('previsione-movimenti')}><i className="fa-light fa-chart-line" /> Previsione movimenti camere</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('stato-camere')}><i className="fa-light fa-bed-front" /> Stato camere</button>
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setCreaOpen(true)}><i className="fa-light fa-circle-plus" /> Crea Incarico</button>

        <div className="piano-cam__status">
          <RadioGroup name="status" label="Status" value={status} onChange={setStatus}
            options={[{ value: 'libere', label: 'Libere' }, { value: 'occupate', label: 'Occupate' }, { value: 'tutte', label: 'Tutte' }]} />
        </div>

        <div className="piano-cam__exports">
          <Tooltip text="Esporta in PDF"><button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in PDF" onClick={esportaPdf}><i className="fa-light fa-file-pdf" /></button></Tooltip>
          <Tooltip text="Esporta in Excel"><button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel" onClick={esportaXls}><i className="fa-light fa-file-excel" /></button></Tooltip>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table ref={tableRef} className="sib-table piano-cam__table">
          <thead>
            <tr>
              <th className="piano-cam__col-check" />
              <th>Data</th>
              <th>Camera</th>
              <th>Stato Occupazione</th>
              <th>Assegnatario</th>
              <th>Cliente</th>
              <th>In/Out</th>
              <th className="piano-cam__td-center">Progr. RN</th>
              <th className="piano-cam__td-center">Gruppi/Individuali</th>
              <th className="piano-cam__td-center">Note</th>
              <th className="piano-cam__td-center">Pulizia</th>
              <th className="piano-cam__td-center">Manutenzione</th>
              <th className="piano-cam__td-center">Vip</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={13} className="sib-empty">Nessuna camera per i criteri selezionati.</td></tr>
            ) : pageRows.map((r) => (
              <tr key={r.id}>
                <td className="piano-cam__col-check"><input type="checkbox" className="sib-checkbox" aria-label={`Seleziona ${r.camera}`} /></td>
                <td>{r.data}</td>
                <td>{r.camera}</td>
                <td className={r.statoOcc === '-' ? 'sib-cell--muted' : ''}>{r.statoOcc}</td>
                <td>{r.assegnatario}</td>
                <td className={r.cliente ? '' : 'sib-cell--muted'}>{r.cliente || '-'}</td>
                <td className="piano-cam__nowrap">{r.inData ? `${r.inData.slice(0, 5)} → ${r.outData.slice(0, 5)}` : '-'}</td>
                <td className="piano-cam__td-center">{r.progrRN}</td>
                <td className="piano-cam__td-center">
                  <Tooltip text={r.gruppo ? 'Gruppo' : 'Individuale'}><i className={`fa-light fa-${r.gruppo ? 'users' : 'user'}`} aria-hidden="true" /></Tooltip>
                </td>
                <td className="piano-cam__td-center">
                  {r.note
                    ? <Tooltip content={r.note}><i className="fa-light fa-note-sticky piano-cam__note" aria-hidden="true" /></Tooltip>
                    : <span className="sib-cell--muted">-</span>}
                </td>
                <td className="piano-cam__td-center">
                  {r.pulizia
                    ? <Tooltip text="Pulizia effettuata"><i className="fa-solid fa-broom piano-cam__ico-ok" aria-hidden="true" /></Tooltip>
                    : <span className="sib-cell--muted">-</span>}
                </td>
                <td className="piano-cam__td-center">
                  {r.manutenzione
                    ? <Tooltip text="Manutenzione in corso"><i className="fa-solid fa-screwdriver-wrench piano-cam__ico-warn" aria-hidden="true" /></Tooltip>
                    : <span className="sib-cell--muted">-</span>}
                </td>
                <td className="piano-cam__td-center">
                  <Tooltip text={r.vip ? 'VIP' : 'Standard'}>
                    <i className={`fa-${r.vip ? 'solid' : 'regular'} fa-star piano-cam__vip ${r.vip ? 'piano-cam__vip--on' : ''}`} aria-hidden="true" />
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination className="piano-cam__pager" page={page} totalPages={totalPages} onPageChange={setPage} />

      {creaOpen && <CreaIncaricoModal struttura={struttura} onClose={() => setCreaOpen(false)} onAdd={() => setCreaOpen(false)} />}
    </div>
  )
}

// ─── CREA INCARICO MODAL ────────────────────────────────────────────────────────
const GENERI   = ['Pulizia ordinaria', 'Pulizia profonda', 'Manutenzione', 'Riparazione', 'Controllo']
const REPARTI  = ['Pulizie', 'Manutenzione', 'Reception']
const ASSEGNATARI = ['dino tacchini', 'Ruggero AppOp', 'Sibylla System']
const PRIORITA = ['Bassa', 'Normale', 'Alta', 'Urgente']

function CreaIncaricoModal({ struttura, onClose, onAdd }: { struttura: string; onClose: () => void; onAdd: () => void }) {
  const [form, setForm] = useState({
    struttura, camere: '', genere: GENERI[0], reparto: REPARTI[0],
    assegnatario: ASSEGNATARI[0], priorita: 'Normale', descrizione: '',
  })
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <Modal open onClose={onClose} title="Aggiungi incarico" size="lg">
      <div className="flex flex-col gap-4">
        <SelectField name="struttura" label="Struttura" value={form.struttura} onChange={(e) => set('struttura', e.target.value)}
          options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        <InputField name="camere" label="Camere" placeholder="es. 101, 102, 103" value={form.camere} onChange={(e) => set('camere', e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField name="genere" label="Genere Intervento" value={form.genere} onChange={(e) => set('genere', e.target.value)}
            options={GENERI.map((g) => ({ value: g, label: g }))} />
          <SelectField name="reparto" label="Reparto" value={form.reparto} onChange={(e) => set('reparto', e.target.value)}
            options={REPARTI.map((r) => ({ value: r, label: r }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField name="assegnatario" label="Assegnatario" required value={form.assegnatario} onChange={(e) => set('assegnatario', e.target.value)}
            options={ASSEGNATARI.map((a) => ({ value: a, label: a }))} />
          <SelectField name="priorita" label="Priorità" value={form.priorita} onChange={(e) => set('priorita', e.target.value)}
            options={PRIORITA.map((p) => ({ value: p, label: p }))} />
        </div>
        <TextareaField name="descrizione" label="Descrizione" rows={3} value={form.descrizione} onChange={(e) => set('descrizione', e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!form.assegnatario} onClick={onAdd}>Aggiungi</button>
      </div>
    </Modal>
  )
}
