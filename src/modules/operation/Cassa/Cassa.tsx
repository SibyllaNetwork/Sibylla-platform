import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FilterToolbar from '../../../core/components/FilterToolbar'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import Tooltip from '../../../core/components/Tooltip'
import StatusBadge from '../../../core/components/StatusBadge'
import {
  InputField,
  SelectField,
  TextareaField,
  RadioGroup,
  SearchField,
  DateRangeField,
} from '../../../core/components/form'
import './Cassa.sass'

type StatoMovimento = 'In coda' | 'Emesso' | 'Da inviare'

interface Soggiorno {
  camera: string
  prenotazione: string
  ospite: string
  arrivo: string
  partenza: string
}

interface Movimento {
  id: string
  utente: string
  dataDoc: string
  numeroDoc?: string
  voceIncasso?: string
  riferimento: string
  importo: number
  movimento: 'Entrata' | 'Uscita'
  stato: StatoMovimento
  soggiorno?: Soggiorno
  dettagli?: string
}

const STATO_VARIANT: Record<StatoMovimento, 'info' | 'success' | 'warning'> = {
  'In coda':    'info',
  'Emesso':     'success',
  'Da inviare': 'warning',
}

interface Chiusura {
  id: string
  utente: string
  dataChiusura: string
  numMovimenti: number
  saldo: number
}

type Tab = 'movimenti' | 'chiusure'

const STRUTTURE = [
  { value: 'tutorial', label: 'Hotel Tutorial' },
  { value: 'azzurro',  label: 'Hotel Azzurro Mare' },
  { value: 'lux',      label: 'Hotel Lux' },
]

const REPARTI = [
  { value: '',          label: 'Seleziona' },
  { value: 'reception', label: 'Reception' },
  { value: 'ristorante', label: 'Ristorante' },
  { value: 'bar',       label: 'Bar' },
  { value: 'spa',       label: 'Spa' },
]

const VOCI_MOVIMENTO = [
  { value: '',          label: 'Seleziona' },
  { value: 'fondocassa', label: 'Fondo cassa' },
  { value: 'mancia',    label: 'Mancia' },
  { value: 'rimborso',  label: 'Rimborso' },
  { value: 'spesa',     label: 'Spesa di gestione' },
  { value: 'altro',     label: 'Altro' },
]

const TIPO_MOVIMENTO_OPTS = [
  { value: 'entrata', label: 'In entrata' },
  { value: 'uscita',  label: 'In uscita' },
]

const MOVIMENTI: Movimento[] = [
  { id: '1', utente: 'Mario Rossi', dataDoc: '04/05/2026 11:54:00',                                                              riferimento: 'Front Office', importo: 10, movimento: 'Entrata', stato: 'In coda',    soggiorno: { camera: '410', prenotazione: '15398', ospite: 'Luca Bianchi',   arrivo: '24/06/2026', partenza: '25/06/2026' } },
  { id: '2', utente: 'Mario Rossi', dataDoc: '04/05/2026 11:52:16',                                                              riferimento: 'Front Office', importo: 10, movimento: 'Entrata', stato: 'Da inviare', soggiorno: { camera: '307', prenotazione: '15401', ospite: 'Sara Conti',     arrivo: '23/06/2026', partenza: '26/06/2026' } },
  { id: '3', utente: 'Mario Rossi', dataDoc: '04/05/2026 11:50:26', numeroDoc: 'F 63', voceIncasso: 'Sospeso',                   riferimento: 'Front Office', importo: 55, movimento: 'Entrata', stato: 'Emesso',     soggiorno: { camera: '308', prenotazione: '15398', ospite: 'Luca Bianchi',   arrivo: '24/06/2026', partenza: '25/06/2026' } },
]

interface MovCassa {
  id: string
  data: string
  documento: string
  voce: string
  importo: number
  stato: StatoMovimento
  errore?: string
  bloccato?: boolean
}

const MOVIMENTI_CASSA: MovCassa[] = [
  { id: 'sc-81', data: '24/06/2026 16:50:51', documento: 'S 81', voce: 'Contanti', importo: 100.0,  stato: 'In coda' },
  { id: 'sc-80', data: '24/06/2026 11:39:29', documento: 'S 80', voce: 'Contanti', importo: 112.23, stato: 'In coda' },
  { id: 'sc-79', data: '24/06/2026 11:17:50', documento: 'S 79', voce: 'Contanti', importo: 200.0,  stato: 'In coda' },
  { id: 'sc-78', data: '23/06/2026 16:36:51', documento: 'S 78', voce: 'Contanti', importo: 20.0,   stato: 'In coda' },
  { id: 'sc-77', data: '23/06/2026 15:59:39', documento: 'S 77', voce: 'Contanti', importo: 10.0,   stato: 'In coda' },
  { id: 'sc-76', data: '08/06/2026 10:41:47', documento: 'S 76', voce: 'Contanti', importo: 10.0,   stato: 'In coda' },
  { id: 'sc-75', data: '01/06/2026 10:15:54', documento: 'S 75', voce: 'Contanti', importo: 759.35, stato: 'In coda' },
]

const CHIUSURE: Chiusura[] = [
  { id: 'c-1', utente: 'Mario Rossi', dataChiusura: '03/05/2026 23:10', numMovimenti: 14, saldo: 1240.5 },
  { id: 'c-2', utente: 'Anna Verdi',  dataChiusura: '02/05/2026 23:05', numMovimenti:  9, saldo:  870.0 },
]

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

export default function Cassa({ navigate }: { navigate: (p: string) => void }) {
  const [tab, setTab]                 = useState<Tab>('movimenti')
  const [strutturaId, setStrutturaId] = useState('tutorial')
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('2026-05-01')
  const [dateTo, setDateTo]           = useState('2026-05-31')
  const [movimenti, setMovimenti]     = useState<Movimento[]>(MOVIMENTI)
  const [chiusure, setChiusure]       = useState<Chiusura[]>(CHIUSURE)

  const [chiudiOpen, setChiudiOpen]   = useState(false)
  const [creaOpen, setCreaOpen]       = useState(false)
  const [movCassaOpen, setMovCassaOpen] = useState(false)
  const [docMov, setDocMov]           = useState<Movimento | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return movimenti
    return movimenti.filter(m =>
      m.utente.toLowerCase().includes(q) ||
      (m.numeroDoc ?? '').toLowerCase().includes(q) ||
      m.riferimento.toLowerCase().includes(q) ||
      String(m.importo).includes(q)
    )
  }, [movimenti, search])

  const totaleSaldo = useMemo(
    () => filtered.reduce((s, m) => s + (m.movimento === 'Entrata' ? m.importo : -m.importo), 0),
    [filtered]
  )

  const groupVoci = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of filtered) {
      const key = m.voceIncasso || '-'
      map.set(key, (map.get(key) ?? 0) + m.importo)
    }
    return Array.from(map.entries())
  }, [filtered])

  const groupGruppi = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of filtered) {
      const key = m.voceIncasso ? 'Sospesi' : '-'
      map.set(key, (map.get(key) ?? 0) + m.importo)
    }
    return Array.from(map.entries())
  }, [filtered])

  function addMovimento(m: Movimento) {
    setMovimenti(prev => [m, ...prev])
    setCreaOpen(false)
  }
  function confermaChiusura() {
    const now = new Date()
    const nuova: Chiusura = {
      id: `c-${Date.now()}`,
      utente: 'Mario Rossi',
      dataChiusura: `${now.toLocaleDateString('it-IT')} ${now.toTimeString().slice(0, 5)}`,
      numMovimenti: filtered.length,
      saldo: totaleSaldo,
    }
    setChiusure(prev => [nuova, ...prev])
    setMovimenti([])
    setChiudiOpen(false)
    setTab('chiusure')
  }

  const strutturaName = STRUTTURE.find(s => s.value === strutturaId)?.label ?? ''
  const dateRangeStr = `${formatDateIt(dateFrom)} – ${formatDateIt(dateTo)}`

  function exportXls() {
    downloadCsv('movimenti-cassa', filtered, strutturaName, dateRangeStr, totaleSaldo, groupGruppi, groupVoci)
  }
  function exportPdf() {
    printPdf('Movimenti di cassa', filtered, strutturaName, dateRangeStr, totaleSaldo, groupGruppi, groupVoci)
  }

  return (
    <div className="cassa">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Monitoraggio cassa"
        subtitle="Gestione e controllo del flusso di cassa in tempo reale per analizzare le transazioni, controllare il saldo della cassa e prevenire anomalie"
      />

      <div className="cassa__tabs" role="tablist" aria-label="Movimenti / Chiusure">
        <button
          type="button" role="tab" aria-selected={tab === 'movimenti'}
          className={`cassa__tab ${tab === 'movimenti' ? 'is-active' : ''}`}
          onClick={() => setTab('movimenti')}
        >
          <i className="fa-light fa-arrows-rotate" aria-hidden="true" /> Movimenti da chiudere
          <em className="cassa__tab-count">{filtered.length}</em>
        </button>
        <button
          type="button" role="tab" aria-selected={tab === 'chiusure'}
          className={`cassa__tab ${tab === 'chiusure' ? 'is-active' : ''}`}
          onClick={() => setTab('chiusure')}
        >
          <i className="fa-light fa-cash-register" aria-hidden="true" /> Chiusure cassa
          <em className="cassa__tab-count">{chiusure.length}</em>
        </button>
      </div>

      <FilterToolbar
        actions={
          tab === 'movimenti' ? (
            <span className="cassa__top-actions">
              <button
                type="button"
                className="sib-btn sib-btn--secondary"
                onClick={() => setChiudiOpen(true)}
                disabled={filtered.length === 0}
              >
                <i className="fa-light fa-cash-register" /> Chiudi cassa
              </button>
              <button
                type="button"
                className="sib-btn sib-btn--secondary"
                onClick={() => setMovCassaOpen(true)}
              >
                <i className="fa-light fa-rectangle-list" /> Movimenti cassa
              </button>
              <button
                type="button"
                className="sib-btn sib-btn--primary"
                onClick={() => setCreaOpen(true)}
              >
                <i className="fa-light fa-circle-plus" /> Crea movimento
              </button>
            </span>
          ) : undefined
        }
      >
        <DateRangeField
          label="Date"
          nameFrom="from" nameTo="to"
          valueFrom={dateFrom} valueTo={dateTo}
          onChangeFrom={e => setDateFrom(e.target.value)}
          onChangeTo={e => setDateTo(e.target.value)}
        />
        <SelectField
          name="struttura" label="Struttura"
          value={strutturaId}
          onChange={e => setStrutturaId(e.target.value)}
          options={STRUTTURE}
        />
        <div className="cassa__search">
          <span className="cassa__search-label">Cerca</span>
          <SearchField
            placeholder="Utente, numero documento o movimento"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
      </FilterToolbar>

      {tab === 'movimenti' && (
      <section className="cassa__section">
        <header className="cassa__section-head">
          <h3 className="cassa__section-title">
            <i className="fa-light fa-arrows-rotate" /> Movimenti da chiudere
          </h3>
          <span className="cassa__exports">
            <Tooltip text="Esporta in PDF">
              <button
                type="button"
                className="sib-btn sib-btn--icon"
                aria-label="Esporta in PDF"
                onClick={exportPdf}
                disabled={filtered.length === 0}
              >
                <i className="fa-light fa-file-pdf" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta in Excel">
              <button
                type="button"
                className="sib-btn sib-btn--icon"
                aria-label="Esporta in Excel"
                onClick={exportXls}
                disabled={filtered.length === 0}
              >
                <i className="fa-light fa-file-excel" aria-hidden="true" />
              </button>
            </Tooltip>
          </span>
        </header>

        <div className="sib-table-wrap">
          <table className="sib-table cassa__table">
            <thead>
              <tr>
                <th>Utente</th>
                <th>Data Documento</th>
                <th>Numero documento</th>
                <th>Voce incasso</th>
                <th>Riferimento</th>
                <th className="cassa__th-num">Importo</th>
                <th>Movimento</th>
                <th>Stato</th>
                <th>Dettagli</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="sib-empty">Nessun movimento da chiudere.</td></tr>
              )}
              {filtered.map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="cassa__user">
                      <span className="cassa__avatar"><i className="fa-light fa-user" /></span>
                      {m.utente}
                    </span>
                  </td>
                  <td>{m.dataDoc}</td>
                  <td className={m.numeroDoc ? '' : 'sib-cell--muted'}>{m.numeroDoc ?? '-'}</td>
                  <td className={m.voceIncasso ? '' : 'sib-cell--muted'}>{m.voceIncasso ?? '-'}</td>
                  <td>{m.riferimento}</td>
                  <td className="cassa__td-num">{fmt(m.importo)}</td>
                  <td>
                    <StatusBadge variant={m.movimento === 'Entrata' ? 'success' : 'warning'}>
                      {m.movimento}
                    </StatusBadge>
                  </td>
                  <td>
                    <StatusBadge variant={STATO_VARIANT[m.stato]}>
                      {m.stato}
                    </StatusBadge>
                  </td>
                  <td>
                    {m.soggiorno ? (
                      <Tooltip position="left" variant="light" content={<SoggiornoCard s={m.soggiorno} />}>
                        <span className="cassa__info" aria-label="Dettagli soggiorno" tabIndex={0}>
                          <i className="fa-light fa-circle-info" />
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="sib-cell--muted">-</span>
                    )}
                  </td>
                  <td>
                    <Tooltip text="Visualizza documento fiscale">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza documento fiscale" onClick={() => setDocMov(m)}>
                        <i className="fa-light fa-eye" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="cassa__totals">
            <div className="cassa__totals-card">
              <h4 className="cassa__totals-title">Raggruppamento per gruppi incasso</h4>
              <table className="cassa__totals-table">
                <tbody>
                  {groupGruppi.map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td className="cassa__td-num">{fmt(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cassa__totals-card">
              <h4 className="cassa__totals-title">Raggruppamento per voci incasso</h4>
              <table className="cassa__totals-table">
                <tbody>
                  {groupVoci.map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td className="cassa__td-num">{fmt(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      )}

      {tab === 'chiusure' && (
      <section className="cassa__section">
        <h3 className="cassa__section-title">
          <i className="fa-light fa-cash-register" /> Chiusure cassa
        </h3>
        {chiusure.length === 0 ? (
          <div className="cassa__empty">
            Nessuna chiusura cassa da poter verificare
          </div>
        ) : (
          <div className="sib-table-wrap">
            <table className="sib-table cassa__table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Data chiusura</th>
                  <th className="cassa__th-num">N° movimenti</th>
                  <th className="cassa__th-num">Saldo chiusura</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {chiusure.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className="cassa__user">
                        <span className="cassa__avatar"><i className="fa-light fa-user" /></span>
                        {c.utente}
                      </span>
                    </td>
                    <td>{c.dataChiusura}</td>
                    <td className="cassa__td-num">{c.numMovimenti}</td>
                    <td className="cassa__td-num">{fmt(c.saldo)}</td>
                    <td>
                      <Tooltip text="Visualizza">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza">
                          <i className="fa-light fa-eye" />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {chiudiOpen && (
        <div className="cassa__backdrop" onClick={() => setChiudiOpen(false)}>
          <div className="cassa__modal" onClick={e => e.stopPropagation()}>
            <header className="cassa__modal-head">
              <h3 className="cassa__modal-title">Anteprima chiusura cassa</h3>
              <Tooltip text="Chiudi">
                <button type="button" className="sib-btn sib-btn--icon" onClick={() => setChiudiOpen(false)} aria-label="Chiudi">
                  <i className="fa-light fa-xmark" />
                </button>
              </Tooltip>
            </header>
            <div className="cassa__modal-body">
              <table className="cassa__modal-table">
                <thead>
                  <tr>
                    <th>Utente</th>
                    <th>Data chiusura</th>
                    <th className="cassa__th-num">Saldo chiusura</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="cassa__user">
                        <span className="cassa__avatar"><i className="fa-light fa-user" /></span>
                        Mario Rossi
                      </span>
                    </td>
                    <td>{new Date().toLocaleDateString('it-IT')}</td>
                    <td className="cassa__td-num">{fmt(totaleSaldo)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="cassa__modal-text">
                Se confermi verrà generata la chiusura di cassa per <strong>{filtered.length}</strong>{' '}
                {filtered.length === 1 ? 'movimento' : 'movimenti'} con i totali sopra riportati
              </p>
            </div>
            <footer className="cassa__modal-foot">
              <button type="button" className="sib-btn sib-btn--primary" onClick={confermaChiusura}>
                Conferma
              </button>
            </footer>
          </div>
        </div>
      )}

      {creaOpen && <CreaMovimentoModal onClose={() => setCreaOpen(false)} onSave={addMovimento} />}

      {movCassaOpen && <MovimentiCassaModal struttura={strutturaName} onClose={() => setMovCassaOpen(false)} />}

      {docMov && (
        <DocumentoFiscaleModal
          movimento={docMov}
          struttura={strutturaName}
          onClose={() => setDocMov(null)}
        />
      )}
    </div>
  )
}

function CreaMovimentoModal({
  onClose, onSave,
}: {
  onClose: () => void
  onSave: (m: Movimento) => void
}) {
  const [tipo, setTipo]       = useState<'entrata' | 'uscita'>('entrata')
  const [voce, setVoce]       = useState('')
  const [data, setData]       = useState(new Date().toISOString().slice(0, 10))
  const [importo, setImporto] = useState(1)
  const [reparto, setReparto] = useState('')
  const [note, setNote]       = useState('')

  const canSave = voce !== '' && reparto !== '' && importo > 0

  function handleSave() {
    if (!canSave) return
    onSave({
      id: `m-${Date.now()}`,
      utente: 'Mario Rossi',
      dataDoc: new Date(data).toLocaleDateString('it-IT') + ' ' + new Date().toTimeString().slice(0, 8),
      voceIncasso: VOCI_MOVIMENTO.find(v => v.value === voce)?.label,
      riferimento: REPARTI.find(r => r.value === reparto)?.label ?? '—',
      importo,
      movimento: tipo === 'entrata' ? 'Entrata' : 'Uscita',
      stato: 'In coda',
      dettagli: note || undefined,
    })
  }

  return (
    <div className="cassa__backdrop" onClick={onClose}>
      <div className="cassa__modal" onClick={e => e.stopPropagation()}>
        <header className="cassa__modal-head">
          <h3 className="cassa__modal-title">Movimento di cassa</h3>
          <Tooltip text="Chiudi">
            <button type="button" className="sib-btn sib-btn--icon" onClick={onClose} aria-label="Chiudi">
              <i className="fa-light fa-xmark" />
            </button>
          </Tooltip>
        </header>

        <div className="cassa__modal-body">
          <FormGrid cols={2}>
            <RadioGroup
              name="tipo" label="Tipo movimento"
              options={TIPO_MOVIMENTO_OPTS}
              value={tipo}
              onChange={v => setTipo(v as 'entrata' | 'uscita')}
            />
            <SelectField
              name="voce" label="Movimento"
              value={voce}
              onChange={e => setVoce(e.target.value)}
              options={VOCI_MOVIMENTO}
            />
          </FormGrid>

          <FormGrid cols={2}>
            <InputField
              name="data" label="Data" type="text"
              iconLeft="fa-light fa-calendar"
              value={formatDateIt(data)}
              onChange={e => setData(parseDateIt(e.target.value))}
            />
            <InputField
              name="importo" label="Importo" type="number" min={0} step={0.01}
              iconLeft="fa-light fa-euro-sign"
              value={importo}
              onChange={e => setImporto(Number(e.target.value) || 0)}
            />
          </FormGrid>

          <FormGrid cols={2}>
            <SelectField
              name="reparto" label="Reparto"
              value={reparto}
              onChange={e => setReparto(e.target.value)}
              options={REPARTI}
            />
            <div>
              <label className="cassa__field-label">Autorizzazione</label>
              <span className="cassa__user">
                <span className="cassa__avatar"><i className="fa-light fa-user" /></span>
                <strong>Mario Rossi</strong>
              </span>
            </div>
          </FormGrid>

          <TextareaField
            name="note" label="Note" rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <footer className="cassa__modal-foot">
          <FormActions
            onCancel={onClose}
            onConfirm={handleSave}
            confirmLabel="Conferma"
            confirmIcon="fa-check"
            confirmDisabled={!canSave}
          />
        </footer>
      </div>
    </div>
  )
}

// ─── Movimenti cassa (lista scontrini) ────────────────────────────────
function MovimentiCassaModal({ struttura, onClose }: { struttura: string; onClose: () => void }) {
  const [rows, setRows] = useState<MovCassa[]>(MOVIMENTI_CASSA)

  const totali = useMemo(() => {
    const map = new Map<string, { count: number; tot: number }>()
    for (const r of rows) {
      const e = map.get(r.voce) ?? { count: 0, tot: 0 }
      e.count += 1
      e.tot += r.importo
      map.set(r.voce, e)
    }
    return Array.from(map.entries())
  }, [rows])

  const ristampa = (r: MovCassa) => { if (!r.bloccato) printScontrino(r, struttura) }
  const toggleBlocco = (id: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, bloccato: !r.bloccato } : r))

  return (
    <div className="cassa__backdrop" onClick={onClose}>
      <div className="movcassa" onClick={e => e.stopPropagation()}>
        <header className="movcassa__bar">
          <h3 className="movcassa__bar-title">Movimenti cassa</h3>
          <Tooltip text="Chiudi">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Chiudi" onClick={onClose}>
              <i className="fa-light fa-xmark" />
            </button>
          </Tooltip>
        </header>

        <div className="movcassa__body">
          <div className="sib-table-wrap">
            <table className="sib-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Documento</th>
                  <th>Voce incasso</th>
                  <th className="movcassa__num">Importo</th>
                  <th>Stato</th>
                  <th>Errore</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="sib-empty">Nessun movimento di cassa.</td></tr>
                )}
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>{r.data}</td>
                    <td>{r.documento}</td>
                    <td>{r.voce}</td>
                    <td className="movcassa__num">{fmt(r.importo)}</td>
                    <td>
                      <StatusBadge variant={STATO_VARIANT[r.stato]}>{r.stato}</StatusBadge>
                    </td>
                    <td className={r.errore ? 'sib-cell--error' : 'sib-cell--muted'}>{r.errore ?? '-'}</td>
                    <td>
                      <span className="movcassa__actions">
                        <Tooltip text={r.bloccato ? 'Ristampa bloccata' : 'Ristampa'}>
                          <button
                            type="button"
                            className="sib-btn sib-btn--icon"
                            aria-label="Ristampa"
                            onClick={() => ristampa(r)}
                            disabled={r.bloccato}
                          >
                            <i className="fa-light fa-print" />
                          </button>
                        </Tooltip>
                        <Tooltip text={r.bloccato ? 'Sblocca ristampa' : 'Blocca ristampa'}>
                          <button
                            type="button"
                            className={`sib-btn sib-btn--icon${r.bloccato ? ' movcassa__act--on' : ''}`}
                            aria-label={r.bloccato ? 'Sblocca ristampa' : 'Blocca ristampa'}
                            aria-pressed={!!r.bloccato}
                            onClick={() => toggleBlocco(r.id)}
                          >
                            <i className="fa-light fa-ban" />
                          </button>
                        </Tooltip>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="cassa__totals-card movcassa__totals">
              <h4 className="cassa__totals-title">Totale scontrini per voce incasso</h4>
              <table className="cassa__totals-table">
                <tbody>
                  {totali.map(([voce, { count, tot }]) => (
                    <tr key={voce}>
                      <td>{voce} ({count})</td>
                      <td className="cassa__td-num">{fmt(tot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Card dettagli soggiorno (tooltip rollover) ───────────────────────
function SoggiornoCard({ s }: { s: Soggiorno }) {
  return (
    <div className="cassa-sgt">
      <div className="cassa-sgt__head">
        <i className="fa-light fa-bed" aria-hidden="true" />
        <span>N. {s.camera}</span>
      </div>
      <dl className="cassa-sgt__list">
        <div><dt>Pren. N.</dt><dd>{s.prenotazione}</dd></div>
        <div><dt>Ospite</dt><dd>{s.ospite || '—'}</dd></div>
        <div><dt>Arrivo</dt><dd>{s.arrivo}</dd></div>
        <div><dt>Partenza</dt><dd>{s.partenza}</dd></div>
      </dl>
    </div>
  )
}

// ─── Documento fiscale (anteprima stile fattura) ──────────────────────
interface DocLine {
  camera: string
  data: string
  riferimento: string
  descrizione: string
  imponibile: number
  ivaPct: number
  totale: number
}
interface DocPayment {
  data: string
  metodo: string
  voce: string
  importo: number
}
interface FiscalDoc {
  tipo: string
  numero: string
  data: string
  prenotazione: string
  pIva: string
  lines: DocLine[]
  payments: DocPayment[]
}

const EMITTENTE = {
  nome: 'Sibylla',
  indirizzo: 'Viale Elvezia, 18',
  citta: '20154, Milano, Italy',
  pIva: 'P.Iva 80979970466',
}

function splitAmount(total: number, n: number): number[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / n)
  const arr = Array(n).fill(base)
  let rem = cents - base * n
  for (let i = n - 1; rem > 0; i--, rem--) arr[i] += 1
  return arr.map(c => c / 100)
}

function buildDoc(m: Movimento): FiscalDoc {
  const ivaPct = 10
  const giorno = m.dataDoc.slice(0, 10)
  const rooms = ['410', '307', '308']
  const parts = splitAmount(m.importo, 3)
  const lines: DocLine[] = parts.map((tot, i) => ({
    camera: rooms[i],
    data: giorno,
    riferimento: 'Anticipo',
    descrizione: 'Anticipo per servizi',
    imponibile: Math.round((tot / (1 + ivaPct / 100)) * 100) / 100,
    ivaPct,
    totale: tot,
  }))
  return {
    tipo: 'Scontrino',
    numero: m.numeroDoc ?? `S-${m.id.padStart(4, '0')}/FG 2026`,
    data: giorno,
    prenotazione: '15398',
    pIva: '',
    lines,
    payments: [{
      data: giorno,
      metodo: 'Conto camera',
      voce: m.voceIncasso ?? 'Contanti',
      importo: m.importo,
    }],
  }
}

function DocumentoFiscaleModal({
  movimento, struttura, onClose,
}: {
  movimento: Movimento
  struttura: string
  onClose: () => void
}) {
  const doc = useMemo(() => buildDoc(movimento), [movimento])
  const totale = doc.lines.reduce((s, l) => s + l.totale, 0)
  const totImponibile = doc.lines.reduce((s, l) => s + l.imponibile, 0)
  const totIva = totale - totImponibile

  return (
    <div className="cassa__backdrop" onClick={onClose}>
      <div className="docfisc" onClick={e => e.stopPropagation()}>
        <header className="docfisc__bar">
          <h3 className="docfisc__bar-title">Documento fiscale</h3>
          <span className="docfisc__bar-actions">
            <Tooltip text="Invia via email">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Invia via email">
                <i className="fa-light fa-envelope" />
              </button>
            </Tooltip>
            <Tooltip text="Scarica PDF">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Scarica PDF" onClick={() => printInvoice(doc, struttura)}>
                <i className="fa-light fa-file-pdf" />
              </button>
            </Tooltip>
            <Tooltip text="Stampa">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Stampa" onClick={() => printInvoice(doc, struttura)}>
                <i className="fa-light fa-print" />
              </button>
            </Tooltip>
            <Tooltip text="Chiudi">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Chiudi" onClick={onClose}>
                <i className="fa-light fa-xmark" />
              </button>
            </Tooltip>
          </span>
        </header>

        <div className="docfisc__sheet">
          {/* Intestazione: cliente/doc a sx, emittente a dx */}
          <div className="docfisc__head">
            <div className="docfisc__head-left">
              <span className="docfisc__doc-type">{doc.tipo} fiscale</span>
              <h4 className="docfisc__doc-num">N. {doc.numero}</h4>
              <dl className="docfisc__meta">
                <div><dt>Data</dt><dd>{doc.data}</dd></div>
                <div><dt>Prenotazione</dt><dd>{doc.prenotazione}</dd></div>
                <div><dt>Struttura</dt><dd>{struttura}</dd></div>
                <div><dt>P.Iva cliente</dt><dd>{doc.pIva || '—'}</dd></div>
              </dl>
            </div>
            <div className="docfisc__head-right">
              <span className="docfisc__brand">
                <svg className="docfisc__brand-key" viewBox="88 80 62 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fill="#a2864c" d="M135.1,88.8c-3.4-3.4-4.8-4.3-8.1-5.9-6.4-3.1-15.2-3.3-21.7-.4-5.4,2.4-10.2,6.9-13,13.1-2.8,8.3-1.6,15.6-1.6,15.6h42.9s-1.3,6.3-6.7,9.6c-6.2,3.9-14.4,4.5-21.4.4-5.9-3.4-7.8-7.1-7.8-7.1h-6.7c0,0,3.4,8.6,12.8,12.8,5.2,2.3,12.3,4,19.8,1.8,7.4-2.1,14.8-9.7,16.7-17.1.7-2.6.7-6.3.7-6.3h-43.5s0-2.5.3-3.8c.9-4.6,3.8-8.8,7.2-11.2,3.7-2.5,9.9-3.6,13.7-2.9,6.7,1.2,12.6,6.2,14.6,12.2.5,1.5,1,2.8,1,2.8h6.8s-.1-1.8-.4-3.3c-.3-1.3-.7-2.6-1.2-3.9-.3-.8-2.1-4.3-4.2-6.4"/>
                </svg>
                <span className="docfisc__brand-name">{EMITTENTE.nome}</span>
              </span>
              <address className="docfisc__emit">
                {EMITTENTE.indirizzo}<br />
                {EMITTENTE.citta}<br />
                {EMITTENTE.pIva}
              </address>
            </div>
          </div>

          {/* Righe documento */}
          <table className="docfisc__table">
            <thead>
              <tr>
                <th>Camera</th>
                <th>Data</th>
                <th>Riferimento</th>
                <th>Descrizione</th>
                <th className="docfisc__num">Imponibile</th>
                <th className="docfisc__num">IVA</th>
                <th className="docfisc__num">Totale</th>
              </tr>
            </thead>
            <tbody>
              <tr className="docfisc__group">
                <td colSpan={7}>Prenotazione {doc.prenotazione} · Totale {fmt(totale)}</td>
              </tr>
              {doc.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.camera}</td>
                  <td>{l.data}</td>
                  <td>{l.riferimento}</td>
                  <td>{l.descrizione}</td>
                  <td className="docfisc__num">{fmt(l.imponibile)}</td>
                  <td className="docfisc__num">{l.ivaPct.toFixed(2).replace('.', ',')} %</td>
                  <td className="docfisc__num">{fmt(l.totale)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} />
                <td className="docfisc__num">{fmt(totImponibile)}</td>
                <td className="docfisc__num">{fmt(totIva)}</td>
                <td className="docfisc__num docfisc__grand">{fmt(totale)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Pagamenti */}
          <h5 className="docfisc__sub">Pagamenti</h5>
          <table className="docfisc__table docfisc__table--pay">
            <thead>
              <tr>
                <th>Data</th>
                <th>Metodo</th>
                <th>Voce incasso</th>
                <th className="docfisc__num">Importo</th>
              </tr>
            </thead>
            <tbody>
              {doc.payments.map((p, i) => (
                <tr key={i}>
                  <td>{p.data}</td>
                  <td>{p.metodo}</td>
                  <td>{p.voce}</td>
                  <td className="docfisc__num">{fmt(p.importo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function printInvoice(doc: FiscalDoc, struttura: string) {
  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) return
  const fmtCur = (n: number) => n.toFixed(2).replace('.', ',') + ' €'
  const totale = doc.lines.reduce((s, l) => s + l.totale, 0)
  const totImp = doc.lines.reduce((s, l) => s + l.imponibile, 0)
  const totIva = totale - totImp
  const html = `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8" /><title>${escapeHtml(doc.tipo)} ${escapeHtml(doc.numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; padding: 32px 40px; max-width: 820px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #204769; padding-bottom: 18px; margin-bottom: 22px; }
  .doc-type { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; font-weight: 700; }
  .doc-num { font-size: 22px; color: #204769; margin: 2px 0 12px; font-weight: 800; }
  .meta { font-size: 12px; color: #4b5563; line-height: 1.7; }
  .meta b { color: #1f2937; }
  .brand { text-align: right; }
  .brand-name { font-size: 22px; font-weight: 800; color: #204769; letter-spacing: -0.3px; }
  .emit { font-size: 12px; color: #4b5563; line-height: 1.6; margin-top: 6px; font-style: normal; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
  th { text-align: left; padding: 9px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  td { padding: 9px 10px; border-bottom: 1px solid #eef2f6; }
  .num { text-align: right; white-space: nowrap; }
  .group td { background: #f3f8fb; font-weight: 700; color: #204769; font-size: 11px; }
  tfoot td { border-top: 2px solid #204769; border-bottom: none; font-weight: 700; padding-top: 12px; }
  .grand { color: #204769; font-size: 14px; }
  h5 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #204769; margin: 26px 0 8px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="doc-type">${escapeHtml(doc.tipo)} fiscale</div>
      <div class="doc-num">N. ${escapeHtml(doc.numero)}</div>
      <div class="meta">
        <div><b>Data:</b> ${escapeHtml(doc.data)}</div>
        <div><b>Prenotazione:</b> ${escapeHtml(doc.prenotazione)}</div>
        <div><b>Struttura:</b> ${escapeHtml(struttura)}</div>
      </div>
    </div>
    <div class="brand">
      <div class="brand-name">${escapeHtml(EMITTENTE.nome)}</div>
      <address class="emit">${escapeHtml(EMITTENTE.indirizzo)}<br/>${escapeHtml(EMITTENTE.citta)}<br/>${escapeHtml(EMITTENTE.pIva)}</address>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Camera</th><th>Data</th><th>Riferimento</th><th>Descrizione</th>
      <th class="num">Imponibile</th><th class="num">IVA</th><th class="num">Totale</th>
    </tr></thead>
    <tbody>
      <tr class="group"><td colspan="7">Prenotazione ${escapeHtml(doc.prenotazione)} · Totale ${fmtCur(totale)}</td></tr>
      ${doc.lines.map(l => `<tr>
        <td>${escapeHtml(l.camera)}</td><td>${escapeHtml(l.data)}</td>
        <td>${escapeHtml(l.riferimento)}</td><td>${escapeHtml(l.descrizione)}</td>
        <td class="num">${fmtCur(l.imponibile)}</td>
        <td class="num">${l.ivaPct.toFixed(2).replace('.', ',')} %</td>
        <td class="num">${fmtCur(l.totale)}</td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr>
      <td colspan="4"></td>
      <td class="num">${fmtCur(totImp)}</td>
      <td class="num">${fmtCur(totIva)}</td>
      <td class="num grand">${fmtCur(totale)}</td>
    </tr></tfoot>
  </table>

  <h5>Pagamenti</h5>
  <table>
    <thead><tr><th>Data</th><th>Metodo</th><th>Voce incasso</th><th class="num">Importo</th></tr></thead>
    <tbody>
      ${doc.payments.map(p => `<tr>
        <td>${escapeHtml(p.data)}</td><td>${escapeHtml(p.metodo)}</td>
        <td>${escapeHtml(p.voce)}</td><td class="num">${fmtCur(p.importo)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <script>window.addEventListener('load', () => { setTimeout(() => window.print(), 250); });</script>
</body></html>`
  win.document.open()
  win.document.write(html)
  win.document.close()
}

function printScontrino(r: MovCassa, struttura: string) {
  const giorno = r.data.slice(0, 10)
  const ivaPct = 10
  const doc: FiscalDoc = {
    tipo: 'Scontrino',
    numero: r.documento,
    data: giorno,
    prenotazione: '—',
    pIva: '',
    lines: [{
      camera: '—',
      data: giorno,
      riferimento: '—',
      descrizione: 'Scontrino di cassa',
      imponibile: Math.round((r.importo / (1 + ivaPct / 100)) * 100) / 100,
      ivaPct,
      totale: r.importo,
    }],
    payments: [{ data: giorno, metodo: r.voce, voce: r.voce, importo: r.importo }],
  }
  printInvoice(doc, struttura)
}

function formatDateIt(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function parseDateIt(it: string): string {
  const m = it.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return it
  return `${m[3]}-${m[2]}-${m[1]}`
}

// ─── Export helpers ───────────────────────────────────────────────────
function csvEscape(v: string | number | undefined | null): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv(
  filename: string,
  rows: Movimento[],
  struttura: string,
  dateRange: string,
  saldo: number,
  groupGruppi: Array<[string, number]>,
  groupVoci: Array<[string, number]>,
) {
  const sep = ';'
  const lines: string[] = []
  lines.push(`Movimenti di cassa`)
  lines.push(`Struttura;${csvEscape(struttura)}`)
  lines.push(`Periodo;${csvEscape(dateRange)}`)
  lines.push('')
  lines.push([
    'Utente', 'Data Documento', 'Numero documento', 'Voce incasso',
    'Riferimento', 'Importo', 'Movimento', 'Stato', 'Dettagli',
  ].join(sep))
  for (const r of rows) {
    lines.push([
      csvEscape(r.utente),
      csvEscape(r.dataDoc),
      csvEscape(r.numeroDoc ?? ''),
      csvEscape(r.voceIncasso ?? ''),
      csvEscape(r.riferimento),
      csvEscape(r.importo.toFixed(2).replace('.', ',')),
      csvEscape(r.movimento),
      csvEscape(r.stato),
      csvEscape(r.dettagli ?? ''),
    ].join(sep))
  }
  lines.push('')
  lines.push(`Saldo totale;${csvEscape(saldo.toFixed(2).replace('.', ','))}`)
  lines.push('')
  lines.push('Raggruppamento per gruppi incasso')
  for (const [k, v] of groupGruppi) {
    lines.push([csvEscape(k), csvEscape(v.toFixed(2).replace('.', ','))].join(sep))
  }
  lines.push('')
  lines.push('Raggruppamento per voci incasso')
  for (const [k, v] of groupVoci) {
    lines.push([csvEscape(k), csvEscape(v.toFixed(2).replace('.', ','))].join(sep))
  }

  const csv = lines.join('\r\n')
  const bom = '﻿'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `${filename}-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function printPdf(
  title: string,
  rows: Movimento[],
  struttura: string,
  dateRange: string,
  saldo: number,
  groupGruppi: Array<[string, number]>,
  groupVoci: Array<[string, number]>,
) {
  const win = window.open('', '_blank', 'width=1024,height=768')
  if (!win) return
  const fmtCur = (n: number) => n.toFixed(2).replace('.', ',') + ' €'
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; padding: 24px; }
  h1 { font-size: 22px; color: #204769; margin: 0 0 4px; }
  h2 { font-size: 14px; color: #204769; margin: 18px 0 6px; }
  .meta { color: #4b5563; font-size: 12px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #204769; color: white; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
  .num { text-align: right; white-space: nowrap; }
  .totals { display: flex; gap: 24px; margin-top: 12px; }
  .totals > div { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .totals h3 { margin: 0; padding: 8px 12px; background: #f3f8fb; color: #204769; font-size: 12px; }
  .totals table td { font-size: 11px; }
  .saldo { margin-top: 16px; padding: 10px 14px; background: #f8fcff; border: 1px solid #e5e7eb; border-radius: 8px; font-weight: 700; color: #204769; display: flex; justify-content: space-between; }
  @media print {
    body { padding: 12mm; }
    button { display: none; }
  }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta"><strong>Struttura:</strong> ${escapeHtml(struttura)} &nbsp;·&nbsp; <strong>Periodo:</strong> ${escapeHtml(dateRange)} &nbsp;·&nbsp; <strong>Generato:</strong> ${new Date().toLocaleString('it-IT')}</p>

  <table>
    <thead>
      <tr>
        <th>Utente</th>
        <th>Data documento</th>
        <th>Numero doc.</th>
        <th>Voce incasso</th>
        <th>Riferimento</th>
        <th class="num">Importo</th>
        <th>Movimento</th>
        <th>Stato</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td>${escapeHtml(r.utente)}</td>
        <td>${escapeHtml(r.dataDoc)}</td>
        <td>${escapeHtml(r.numeroDoc ?? '-')}</td>
        <td>${escapeHtml(r.voceIncasso ?? '-')}</td>
        <td>${escapeHtml(r.riferimento)}</td>
        <td class="num">${fmtCur(r.importo)}</td>
        <td>${escapeHtml(r.movimento)}</td>
        <td>${escapeHtml(r.stato)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="saldo"><span>Saldo totale</span><span>${fmtCur(saldo)}</span></div>

  <div class="totals">
    <div>
      <h3>Raggruppamento per gruppi incasso</h3>
      <table><tbody>
        ${groupGruppi.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${fmtCur(v)}</td></tr>`).join('')}
      </tbody></table>
    </div>
    <div>
      <h3>Raggruppamento per voci incasso</h3>
      <table><tbody>
        ${groupVoci.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${fmtCur(v)}</td></tr>`).join('')}
      </tbody></table>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => { setTimeout(() => window.print(), 250); });
  </script>
</body>
</html>`
  win.document.open()
  win.document.write(html)
  win.document.close()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
