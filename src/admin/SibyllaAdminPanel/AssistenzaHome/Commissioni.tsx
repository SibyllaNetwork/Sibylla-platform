import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import { SelectField, DatePickerField } from '../../../core/components/form'
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [visione, setVisione] = useState<Record<string, boolean>>({})
  // Filtri per colonna: testo (lente), scelte multiple (imbuto), ordinamento.
  const [colF, setColF] = useState<Record<string, string>>({})
  const [colM, setColM] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<{ k: string; dir: 'asc' | 'desc' } | null>(null)
  const [openTool, setOpenTool] = useState<string | null>(null)
  const setCol = (k: string, v: string) => setColF(p => ({ ...p, [k]: v }))
  const toggleMulti = (k: string, v: string) => setColM(p => {
    const cur = p[k] ?? []
    return { ...p, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
  })
  const toggleSort = (k: string) => setSort(p =>
    p?.k !== k ? { k, dir: 'asc' } : p.dir === 'asc' ? { k, dir: 'desc' } : null
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const has = (val: string, f?: string) => !f || val.toLowerCase().includes(f.toLowerCase())
    const inSet = (val: string, k: string) => {
      const f = colM[k]
      return !f || f.length === 0 || f.includes(val)
    }
    return ROWS.filter(r => {
      if (q && !`${r.to} ${r.struttura} ${r.cod} ${r.nome}`.toLowerCase().includes(q)) return false
      if (!inSet(r.to, 'to')) return false
      if (!inSet(r.struttura, 'struttura')) return false
      if (!inSet(String(r.persone), 'persone')) return false
      if (!inSet(r.vcc, 'vcc')) return false
      if (!has(r.cod, colF.cod)) return false
      if (!has(r.nome, colF.nome)) return false
      if (!has(r.prezzo, colF.prezzo)) return false
      if (!has(r.commissione, colF.commissione)) return false
      if (!has(r.totale, colF.totale)) return false
      return true
    })
  }, [search, colF, colM])

  // Ordinamento solo sulle due colonne data: formato aaaa-mm-gg, confronto
  // lessicografico = confronto cronologico.
  const sorted = useMemo(() => {
    if (!sort) return filtered
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = (a as unknown as Record<string, string>)[sort.k]
      const bv = (b as unknown as Record<string, string>)[sort.k]
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [filtered, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, colF, colM])
  const rows = sorted.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  // Cluster di icone-filtro accanto al titolo di colonna.
  const thTools = (k: string, label: string, cfg: { options?: string[]; search?: boolean; sort?: boolean; right?: boolean }) => {
    const fKey = `${k}:f`, sKey = `${k}:s`
    const popCls = 'cms__th-pop' + (cfg.right ? ' cms__th-pop--right' : '')
    const sortIco = sort?.k !== k ? 'fa-arrow-down-arrow-up'
      : sort.dir === 'asc' ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'
    return (
      <span className="cms__th-tools">
        {cfg.options && (
          <>
            <button
              type="button"
              className={'cms__th-btn' + (colM[k]?.length ? ' cms__th-btn--on' : '')}
              aria-label={`Filtra per ${label}`}
              onClick={() => setOpenTool(o => (o === fKey ? null : fKey))}
            >
              <i className="fa-solid fa-filter" />
            </button>
            {openTool === fKey && (
              <>
                <div className="cms__th-overlay" onClick={() => setOpenTool(null)} />
                <div className={popCls} onClick={e => e.stopPropagation()}>
                  <div className="cms__th-pop-title">scelte multiple</div>
                  {cfg.options.map(o => (
                    <label key={o} className="cms__th-opt">
                      <input type="checkbox" checked={(colM[k] ?? []).includes(o)} onChange={() => toggleMulti(k, o)} />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {cfg.search && (
          <>
            <button
              type="button"
              className={'cms__th-btn' + (colF[k] ? ' cms__th-btn--on' : '')}
              aria-label={`Cerca in ${label}`}
              onClick={() => setOpenTool(o => (o === sKey ? null : sKey))}
            >
              <i className="fa-solid fa-magnifying-glass" />
            </button>
            {openTool === sKey && (
              <>
                <div className="cms__th-overlay" onClick={() => setOpenTool(null)} />
                <div className={popCls} onClick={e => e.stopPropagation()}>
                  <input
                    className="cms__cf"
                    autoFocus
                    value={colF[k] || ''}
                    onChange={e => setCol(k, e.target.value)}
                    placeholder={`Cerca ${label.toLowerCase()}…`}
                  />
                </div>
              </>
            )}
          </>
        )}
        {cfg.sort && (
          <button
            type="button"
            className={'cms__th-btn' + (sort?.k === k ? ' cms__th-btn--on' : '')}
            aria-label={`Ordina per ${label}`}
            onClick={() => toggleSort(k)}
          >
            <i className={`fa-solid ${sortIco}`} />
          </button>
        )}
      </span>
    )
  }

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
              <th><span className="cms__th-head">Tour operator{thTools('to', 'tour operator', { options: TOS })}</span></th>
              <th><span className="cms__th-head">Struttura{thTools('struttura', 'struttura', { options: STRUTT })}</span></th>
              <th><span className="cms__th-head">Cod. Prenotazione{thTools('cod', 'codice prenotazione', { search: true })}</span></th>
              <th><span className="cms__th-head">Nome e Cognome{thTools('nome', 'nome e cognome', { search: true })}</span></th>
              <th><span className="cms__th-head">Data prenotazione{thTools('dataPren', 'data prenotazione', { sort: true })}</span></th>
              <th><span className="cms__th-head">Data check-in{thTools('checkin', 'data check-in', { sort: true })}</span></th>
              <th className="cms__c"><span className="cms__th-head">N. Persone{thTools('persone', 'n. persone', { options: PERSONE_ALL })}</span></th>
              <th><span className="cms__th-head">Prezzo di vendita{thTools('prezzo', 'prezzo di vendita', { search: true })}</span></th>
              <th><span className="cms__th-head">Commissione{thTools('commissione', 'commissione', { search: true })}</span></th>
              <th><span className="cms__th-head">Totale{thTools('totale', 'totale', { search: true })}</span></th>
              <th className="cms__c"><span className="cms__th-head">VCC{thTools('vcc', 'VCC', { options: VCC_ALL, right: true })}</span></th>
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
