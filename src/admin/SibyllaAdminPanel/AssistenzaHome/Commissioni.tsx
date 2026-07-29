import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import { SelectField, DatePickerField } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import './Commissioni.sass'

interface Props { navigate: (p: string) => void }

interface Row {
  to: string; struttura: string; cod: string; nome: string
  dataPren: string; checkin: string; persone: number
  prezzo: string; commissione: string; totale: string; vcc: string
}

const NAMES = ['Rossi Mario', 'Bianchi Anna', 'Verdi Luca', 'Esposito Sara', 'Romano Ivan', 'Greco Elsa']
const TOS = ['ITALCAMEL', 'Tui Italia', 'Hassab srl', 'Imperatore Travel', 'Debus snc']
const STRUTT = ['Hotel Roma', 'Resort Mare', 'Grand Hotel', 'Borgo Antico']
const AZIENDE = ['Sibylla', 'GAR S.R.L.', 'Reservation Hotel Italy']

const ROWS: Row[] = Array.from({ length: 24 }, (_, i) => ({
  to: TOS[i % TOS.length],
  struttura: STRUTT[i % STRUTT.length],
  cod: `PRN-${1000 + i}`,
  nome: NAMES[i % NAMES.length],
  dataPren: `2026-06-${String((i % 27) + 1).padStart(2, '0')}`,
  checkin: `2026-07-${String((i % 27) + 1).padStart(2, '0')}`,
  persone: (i % 4) + 1,
  prezzo: `${(i + 1) * 50},00`,
  commissione: `${(i + 1) * 5},00`,
  totale: `${(i + 1) * 55},00`,
  vcc: i % 3 === 0 ? 'Attiva' : '—',
}))
const PAGE_SIZE = 10
const PERSONE_ALL = ['1', '2', '3', '4']
const VCC_ALL = ['Attiva', '—']

export default function Commissioni({ navigate }: Props) {
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [visione, setVisione] = useState<Record<string, boolean>>({})
  // Filtri per colonna: imbuto (scelte multiple), lente (testo), ordinamento.
  const cf = useColFilters()

  const filtered = useMemo(() => ROWS.filter(r =>
    cf.matchMulti(r.to, 'to') &&
    cf.matchMulti(r.struttura, 'struttura') &&
    cf.matchMulti(String(r.persone), 'persone') &&
    cf.matchMulti(r.vcc, 'vcc') &&
    cf.matchText(r.cod, 'cod') &&
    cf.matchText(r.nome, 'nome') &&
    cf.matchText(r.prezzo, 'prezzo') &&
    cf.matchText(r.commissione, 'commissione') &&
    cf.matchText(r.totale, 'totale')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [cf.text, cf.multi])

  const sorted = useMemo(() => cf.sortRows(filtered),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, cf.sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [cf.text, cf.multi])
  const rows = sorted.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  const allOnPage = rows.length > 0 && rows.every(r => sel.has(r.cod))
  const toggleAll = () => setSel(prev => {
    const n = new Set(prev)
    if (allOnPage) rows.forEach(r => n.delete(r.cod))
    else rows.forEach(r => n.add(r.cod))
    return n
  })
  const toggleOne = (cod: string) => setSel(prev => {
    const n = new Set(prev); n.has(cod) ? n.delete(cod) : n.add(cod); return n
  })

  // Esporta TUTTE le righe del documento in un file .xls (apribile da Excel).
  const exportExcel = () => {
    const cols = ['Tour operator', 'Struttura', 'Cod. Prenotazione', 'Nome e Cognome', 'Data prenotazione', 'Data check-in', 'N. Persone', 'Prezzo di vendita', 'Commissione', 'Totale', 'VCC']
    const head = cols.map(c => `<th>${c}</th>`).join('')
    const body = sorted.map(r =>
      `<tr><td>${r.to}</td><td>${r.struttura}</td><td>${r.cod}</td><td>${r.nome}</td><td>${r.dataPren}</td><td>${r.checkin}</td><td>${r.persone}</td><td>${r.prezzo} €</td><td>${r.commissione} €</td><td>${r.totale} €</td><td>${r.vcc}</td></tr>`
    ).join('')
    const html = `<html><head><meta charset="utf-8"></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'commissioni.xls'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${sorted.length} righe esportate in Excel.`, 'Esportazione completata')
  }

  return (
    <div className="cms">
      <button type="button" className="cms__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="cms__head">
        <h1 className="cms__title">Commissioni</h1>
        <p className="cms__sub">Consulta le commissioni delle prenotazioni e gestisci i VCC.</p>
      </div>

      <div className="cms__toolbar">
        <SelectField
          name="azienda"
          label="Azienda"
          className="cms__field"
          options={[{ value: 'Tutte le aziende', label: 'Tutte le aziende' }, ...AZIENDE.map(a => ({ value: a, label: a }))]}
        />
        <SelectField
          name="struttura"
          label="Struttura"
          className="cms__field"
          disabled
          placeholder="Tutte le strutture"
          options={[]}
        />
        <DatePickerField
          name="data-prenotazione"
          label="Data prenotazione"
          className="cms__field"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <DatePickerField
          name="data-checkin"
          label="Data check-in"
          className="cms__field"
        />
        <button type="button" className="cms__btn cms__btn--apply" onClick={() => toast.info('Filtri applicati.', 'Commissioni')}>Applica</button>
        <button type="button" className="cms__btn cms__btn--ghost cms__push" disabled={sel.size === 0} onClick={() => toast.success(`${sel.size} VCC attivati.`, 'VCC')}>Attiva VCC selezionate</button>
        <select className="sib-select cms__vcc"><option>VCC check-in 24H</option><option>VCC check-in 48H</option><option>VCC immediato</option></select>
        <button type="button" className="cms__icon-btn" title="Esporta in Excel" onClick={exportExcel}><Ico n="excel" s={16} c="#fff" /></button>
      </div>

      <div className="sib-table-wrap cms__wrap">
        <table className="sib-table cms__table">
          <thead>
            <tr>
              <th className="cms__c"><input type="checkbox" checked={allOnPage} onChange={toggleAll} /></th>
              <th><span className="sib-colf-head">Tour operator{cf.th('to', 'tour operator', { options: TOS })}</span></th>
              <th><span className="sib-colf-head">Struttura{cf.th('struttura', 'struttura', { options: STRUTT })}</span></th>
              <th><span className="sib-colf-head">Cod. Prenotazione{cf.th('cod', 'codice prenotazione', { search: true })}</span></th>
              <th><span className="sib-colf-head">Nome e Cognome{cf.th('nome', 'nome e cognome', { search: true })}</span></th>
              <th><span className="sib-colf-head">Data prenotazione{cf.th('dataPren', 'data prenotazione', { sort: true })}</span></th>
              <th><span className="sib-colf-head">Data check-in{cf.th('checkin', 'data check-in', { sort: true })}</span></th>
              <th className="cms__c"><span className="sib-colf-head">N. Persone{cf.th('persone', 'n. persone', { options: PERSONE_ALL })}</span></th>
              <th><span className="sib-colf-head">Prezzo di vendita{cf.th('prezzo', 'prezzo di vendita', { search: true })}</span></th>
              <th><span className="sib-colf-head">Commissione{cf.th('commissione', 'commissione', { search: true })}</span></th>
              <th><span className="sib-colf-head">Totale{cf.th('totale', 'totale', { search: true })}</span></th>
              <th className="cms__c"><span className="sib-colf-head">VCC{cf.th('vcc', 'VCC', { options: VCC_ALL, right: true })}</span></th>
              <th className="cms__c">Abilita visione</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.cod}>
                <td className="cms__c"><input type="checkbox" checked={sel.has(r.cod)} onChange={() => toggleOne(r.cod)} /></td>
                <td className="cms__strong">{r.to}</td>
                <td>{r.struttura}</td>
                <td>{r.cod}</td>
                <td>{r.nome}</td>
                <td>{r.dataPren}</td>
                <td>{r.checkin}</td>
                <td className="cms__c">{r.persone}</td>
                <td>{r.prezzo} €</td>
                <td>{r.commissione} €</td>
                <td>{r.totale} €</td>
                <td className="cms__c">
                  <span className={`cms__vcc-tag${r.vcc === 'Attiva' ? ' cms__vcc-tag--on' : ''}`}>{r.vcc}</span>
                </td>
                <td className="cms__c">
                  <input type="checkbox" checked={!!visione[r.cod]} onChange={e => setVisione(v => ({ ...v, [r.cod]: e.target.checked }))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cms__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>
    </div>
  )
}
