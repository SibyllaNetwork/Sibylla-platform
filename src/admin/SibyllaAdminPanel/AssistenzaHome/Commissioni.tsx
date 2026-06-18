import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
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

export default function Commissioni({ navigate }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [visione, setVisione] = useState<Record<string, boolean>>({})
  const [colF, setColF] = useState<Record<string, string>>({})
  const setCol = (k: string, v: string) => setColF(p => ({ ...p, [k]: v }))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const has = (val: string, f?: string) => !f || val.toLowerCase().includes(f.toLowerCase())
    return ROWS.filter(r => {
      if (q && !`${r.to} ${r.struttura} ${r.cod} ${r.nome}`.toLowerCase().includes(q)) return false
      if (colF.to && r.to !== colF.to) return false
      if (!has(r.struttura, colF.struttura)) return false
      if (!has(r.cod, colF.cod)) return false
      if (!has(r.nome, colF.nome)) return false
      if (!has(r.dataPren, colF.dataPren)) return false
      if (!has(r.checkin, colF.checkin)) return false
      if (colF.persone && String(r.persone) !== colF.persone) return false
      if (!has(r.prezzo, colF.prezzo)) return false
      if (!has(r.commissione, colF.commissione)) return false
      if (!has(r.totale, colF.totale)) return false
      if (colF.vcc && r.vcc !== colF.vcc) return false
      return true
    })
  }, [search, colF])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, colF])
  const rows = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

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
    const body = filtered.map(r =>
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
    toast.success(`${filtered.length} righe esportate in Excel.`, 'Esportazione completata')
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
        <label className="cms__field">
          <span>Azienda</span>
          <select className="sib-select"><option>Tutte le aziende</option>{AZIENDE.map(a => <option key={a}>{a}</option>)}</select>
        </label>
        <label className="cms__field">
          <span>Struttura</span>
          <select className="sib-select" disabled><option>Tutte le strutture</option></select>
        </label>
        <label className="cms__field">
          <span>Data prenotazione</span>
          <input className="sib-input" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="cms__field">
          <span>Data check-in</span>
          <input className="sib-input" type="date" />
        </label>
        <button type="button" className="cms__btn cms__btn--apply" onClick={() => toast.info('Filtri applicati.', 'Commissioni')}>Applica</button>
        <button type="button" className="cms__btn cms__btn--ghost cms__push" disabled={sel.size === 0} onClick={() => toast.success(`${sel.size} VCC attivati.`, 'VCC')}>Attiva VCC selezionate</button>
        <select className="sib-select cms__vcc"><option>VCC check-in 24H</option><option>VCC check-in 48H</option><option>VCC immediato</option></select>
        <button type="button" className="cms__icon-btn" title="Esporta in Excel" onClick={exportExcel}><Ico n="excel" s={16} c="#fff" /></button>
        <div className="cms__search">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca" />
          <Ico n="search" s={14} c="var(--color-text-disabled)" />
        </div>
      </div>

      <div className="sib-table-wrap cms__wrap">
        <table className="sib-table cms__table">
          <thead>
            <tr>
              <th className="cms__c"><input type="checkbox" checked={allOnPage} onChange={toggleAll} /></th>
              <th>Tour operator <Ico n="filter" s={11} c="var(--color-text-inactive)" /></th>
              <th>Struttura</th><th>Cod. Prenotazione</th><th>Nome e Cognome</th>
              <th>Data prenotazione</th><th>Data check-in</th><th className="cms__c">N. Persone</th>
              <th>Prezzo di vendita</th><th>Commissione</th><th>Totale</th>
              <th className="cms__c">VCC</th><th className="cms__c">Abilita visione</th>
            </tr>
            <tr className="cms__filter-row">
              <th />
              <th><select className="cms__cf" value={colF.to || ''} onChange={e => setCol('to', e.target.value)}><option value="">Tutti</option>{TOS.map(t => <option key={t} value={t}>{t}</option>)}</select></th>
              <th><input className="cms__cf" value={colF.struttura || ''} onChange={e => setCol('struttura', e.target.value)} placeholder="Filtra" /></th>
              <th><input className="cms__cf" value={colF.cod || ''} onChange={e => setCol('cod', e.target.value)} placeholder="Filtra" /></th>
              <th><input className="cms__cf" value={colF.nome || ''} onChange={e => setCol('nome', e.target.value)} placeholder="Filtra" /></th>
              <th><input className="cms__cf" value={colF.dataPren || ''} onChange={e => setCol('dataPren', e.target.value)} placeholder="aaaa-mm" /></th>
              <th><input className="cms__cf" value={colF.checkin || ''} onChange={e => setCol('checkin', e.target.value)} placeholder="aaaa-mm" /></th>
              <th><input className="cms__cf cms__cf--xs" value={colF.persone || ''} onChange={e => setCol('persone', e.target.value)} placeholder="N." /></th>
              <th><input className="cms__cf" value={colF.prezzo || ''} onChange={e => setCol('prezzo', e.target.value)} placeholder="Filtra" /></th>
              <th><input className="cms__cf" value={colF.commissione || ''} onChange={e => setCol('commissione', e.target.value)} placeholder="Filtra" /></th>
              <th><input className="cms__cf" value={colF.totale || ''} onChange={e => setCol('totale', e.target.value)} placeholder="Filtra" /></th>
              <th><select className="cms__cf" value={colF.vcc || ''} onChange={e => setCol('vcc', e.target.value)}><option value="">Tutti</option><option value="Attiva">Attiva</option><option value="—">—</option></select></th>
              <th />
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
