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

interface Movimento {
  id: string
  utente: string
  dataDoc: string
  numeroDoc?: string
  voceIncasso?: string
  riferimento: string
  importo: number
  movimento: 'Entrata' | 'Uscita'
  dettagli?: string
}

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
  { id: '1', utente: 'Mario Rossi', dataDoc: '04/05/2026 11:54:00',                                                              riferimento: 'Front Office', importo: 10, movimento: 'Entrata' },
  { id: '2', utente: 'Mario Rossi', dataDoc: '04/05/2026 11:52:16',                                                              riferimento: 'Front Office', importo: 10, movimento: 'Entrata' },
  { id: '3', utente: 'Mario Rossi', dataDoc: '04/05/2026 11:50:26', numeroDoc: 'F 63', voceIncasso: 'Sospeso',                   riferimento: 'Front Office', importo: 55, movimento: 'Entrata' },
]

function fmt(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

export default function Cassa({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState('tutorial')
  const [search, setSearch]           = useState('')
  const [dateFrom, setDateFrom]       = useState('2026-05-01')
  const [dateTo, setDateTo]           = useState('2026-05-31')
  const [movimenti, setMovimenti]     = useState<Movimento[]>(MOVIMENTI)

  const [chiudiOpen, setChiudiOpen]   = useState(false)
  const [creaOpen, setCreaOpen]       = useState(false)

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
    setMovimenti([])
    setChiudiOpen(false)
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

      <FilterToolbar
        actions={
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
              className="sib-btn sib-btn--primary"
              onClick={() => setCreaOpen(true)}
            >
              <i className="fa-light fa-circle-plus" /> Crea movimento
            </button>
          </span>
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

      <section className="cassa__section">
        <h3 className="cassa__section-title">
          <i className="fa-light fa-cash-register" /> Chiusure cassa
        </h3>
        <div className="cassa__empty">
          Nessuna chiusura cassa da poter verificare
        </div>
      </section>

      <section className="cassa__section">
        <header className="cassa__section-head">
          <h3 className="cassa__section-title">
            <i className="fa-light fa-arrows-rotate" /> Movimenti da chiudere
          </h3>
          <span className="cassa__exports">
            <Tooltip text="Esporta in XLS (CSV compatibile Excel)">
              <button
                type="button"
                className="cassa__export-btn"
                onClick={exportXls}
                disabled={filtered.length === 0}
              >
                <i className="fa-light fa-file-excel" />
                <span>XLS</span>
              </button>
            </Tooltip>
            <Tooltip text="Esporta in PDF (apre stampa)">
              <button
                type="button"
                className="cassa__export-btn"
                onClick={exportPdf}
                disabled={filtered.length === 0}
              >
                <i className="fa-light fa-file-pdf" />
                <span>PDF</span>
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
                <th>Dettagli</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="sib-empty">Nessun movimento da chiudere.</td></tr>
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
                  <td className="sib-cell--muted">{m.dettagli ?? '-'}</td>
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
    'Riferimento', 'Importo', 'Movimento', 'Dettagli',
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
