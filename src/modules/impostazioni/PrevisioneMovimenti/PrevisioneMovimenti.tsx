import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { DateRangeField, SelectField, SearchField } from '../../../core/components/form'
import './PrevisioneMovimenti.sass'

// Previsione movimenti camere — riepilogo giornaliero arrivi/presenze/partenze/libere.
// Raggiungibile da Stato camere → "Previsione movimenti camere".

interface Movimento { data: string; arrivi: number; presenze: number; partenze: number; libere: number }

const STRUTTURE = ['Hotel Tutorial', 'Hotel Archimede', 'Hotel Azzurro Mare']

const MOCK: Movimento[] = [
  { data: '26/06/2026', arrivi: 7,  presenze: 5,  partenze: 0, libere: 54 },
  { data: '27/06/2026', arrivi: 4,  presenze: 9,  partenze: 7, libere: 51 },
  { data: '28/06/2026', arrivi: 6,  presenze: 12, partenze: 3, libere: 48 },
  { data: '29/06/2026', arrivi: 2,  presenze: 11, partenze: 5, libere: 49 },
  { data: '30/06/2026', arrivi: 8,  presenze: 14, partenze: 6, libere: 46 },
]

export default function PrevisioneMovimenti({ navigate }: { navigate: (p: string) => void }) {
  const [da, setDa] = useState('2026-06-26')
  const [a, setA]   = useState('2026-06-26')
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.trim()
    return q ? MOCK.filter((m) => m.data.includes(q)) : MOCK
  }, [search])

  return (
    <div className="previsione-mov">
      <PageHead back onBack={() => navigate('stato-camere')} title="Previsione movimenti camere" subtitle="Riepilogo giornaliero di arrivi, presenze, partenze e camere libere" />

      <div className="previsione-mov__bar flex items-end gap-3 mb-5 flex-wrap">
        <DateRangeField label="Da" nameFrom="da" nameTo="a" valueFrom={da} valueTo={a} onChangeFrom={(e) => setDa(e.target.value)} onChangeTo={(e) => setA(e.target.value)} />
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-[12px] font-semibold font-poppins text-primary">Ricerca</label>
          <SearchField name="cerca" placeholder="Cerca data…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="button" className="sib-btn sib-btn--icon" aria-label="Aggiorna" title="Aggiorna"><i className="fa-regular fa-arrows-rotate" /></button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('stato-camere')}><i className="fa-light fa-bed-front" /> Stato camere</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('piano-camere')}><i className="fa-light fa-calendar-days" /> Piano camere giornaliero</button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr><th>Data</th><th>Arrivi</th><th>Presenze</th><th>Partenze</th><th>Libere</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="sib-empty">Nessun movimento per i criteri selezionati.</td></tr>
            ) : rows.map((m) => (
              <tr key={m.data}>
                <td>{m.data}</td>
                <td>{m.arrivi}</td>
                <td>{m.presenze}</td>
                <td>{m.partenze}</td>
                <td>{m.libere}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
