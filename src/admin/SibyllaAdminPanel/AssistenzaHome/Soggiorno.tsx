import React, { useMemo, useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import { toast } from '../../../core/components/Toast/useToast'
import './Soggiorno.sass'

interface Props { navigate: (p: string) => void }

interface Comune { codice: string; citta: string }

const COLS = [
  '3 stelle', '4 stelle', '5 stelle', '5 stelle plus',
  'Appartamento 1', 'Appartamento 2', 'Appartamento 3', 'Appartamento 4', 'Appartamento 5',
  'BnB 1', 'BnB 2', 'BnB 3', 'BnB 4', 'BnB 5',
]

const NOMI = [
  "AGLIE'", 'AIRASCA', 'ALA DI STURA', "ALBIANO D'IVREA", 'ALICE SUPERIORE', 'ALMESE', 'ALPETTE',
  'ALPIGNANO', 'ANDEZENO', 'ANDRATE', 'ANGROGNA', 'ARIGNANO', 'AVIGLIANA', 'AZEGLIO', 'BAIRO',
  'BALANGERO', 'BALDISSERO CANAVESE', 'BALDISSERO TORINESE', 'BALME', 'BANCHETTE', 'BARBANIA',
  'BARDONECCHIA', 'BARONE CANAVESE', 'BEINASCO', 'BIBIANA', 'BOBBIO PELLICE', 'BOLLENGO',
  'BORGARO TORINESE', 'BORGIALLO', 'BORGOFRANCO', 'BORGOMASINO', 'BOSCONERO', 'BROSSO', 'BRUINO',
]
const COMUNI: Comune[] = NOMI.map((citta, i) => ({ codice: `4010010${String(i + 1).padStart(2, '0')}`, citta }))

const INITIAL: Record<string, string> = {
  '4010010001|0': '3,00', '4010010001|1': '5,00', '4010010001|2': '6,00',
  '4010010001|3': '7,00', '4010010001|4': '2,00', '4010010001|5': '2,00',
}
const PAGE_SIZE = 10

export default function Soggiorno({ navigate }: Props) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [vals, setVals] = useState<Record<string, string>>(INITIAL)
  const [colF, setColF] = useState<{ codice: string; citta: string }>({ codice: '', citta: '' })

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return COMUNI.filter(c => {
      if (q && !(c.citta.toLowerCase().includes(q) || c.codice.includes(q))) return false
      if (colF.codice && !c.codice.includes(colF.codice)) return false
      if (colF.citta && !c.citta.toLowerCase().includes(colF.citta.toLowerCase())) return false
      return true
    })
  }, [query, colF])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [query, colF])
  const rows = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)

  const key = (codice: string, ci: number) => `${codice}|${ci}`
  const setVal = (codice: string, ci: number, v: string) => setVals(p => ({ ...p, [key(codice, ci)]: v }))
  const salva = (c: Comune) => toast.success(`Tariffe di soggiorno salvate per ${c.citta}.`, 'Tariffe salvate')

  return (
    <div className="sgn">
      <button type="button" className="sgn__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="sgn__head">
        <h1 className="sgn__title">Tasse di soggiorno per comune</h1>
        <p className="sgn__sub">Imposta le tariffe della tassa di soggiorno per tipologia di struttura, comune per comune.</p>
      </div>

      <div className="sgn__toolbar">
        <div className="sgn__search">
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setQuery(search) }} placeholder="Cerca per città" />
        </div>
        <button type="button" className="sgn__btn" onClick={() => setQuery(search)}>Cerca</button>
      </div>

      <div className="sib-table-wrap sgn__wrap">
        <table className="sib-table sgn__table">
          <thead>
            <tr>
              <th>Codice</th><th>Città</th>
              {COLS.map(c => <th key={c} className="sgn__th-c">{c}</th>)}
              <th className="sgn__th-c" />
            </tr>
            <tr className="sgn__filter-row">
              <th><input className="sgn__cf" value={colF.codice} onChange={e => setColF(p => ({ ...p, codice: e.target.value }))} placeholder="Filtra" /></th>
              <th><input className="sgn__cf" value={colF.citta} onChange={e => setColF(p => ({ ...p, citta: e.target.value }))} placeholder="Filtra" /></th>
              {COLS.map((_, i) => <th key={i} />)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.codice}>
                <td className="sgn__cod">{c.codice}</td>
                <td className="sgn__citta">{c.citta}</td>
                {COLS.map((_, ci) => (
                  <td key={ci} className="sgn__cell">
                    <input
                      className="sgn__inp"
                      inputMode="decimal"
                      value={vals[key(c.codice, ci)] || ''}
                      onChange={e => setVal(c.codice, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="sgn__cell">
                  <button type="button" className="sgn__save" onClick={() => salva(c)}>Salva</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sgn__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>
    </div>
  )
}
