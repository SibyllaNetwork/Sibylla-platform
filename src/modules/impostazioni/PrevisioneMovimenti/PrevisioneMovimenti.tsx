import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { DateRangeField, SelectField, SearchField } from '../../../core/components/form'
import './PrevisioneMovimenti.sass'
import { useStrutturaPagina, useStruttureCliente } from '../../../hooks/useStrutturaCorrente'
import { generaPms, isoIt } from '../../operation/_data/pmsDemo'

// Previsione movimenti camere — riepilogo giornaliero arrivi/presenze/partenze/libere.
// Raggiungibile da Stato camere → "Previsione movimenti camere".

interface Movimento { data: string; arrivi: number; presenze: number; partenze: number; libere: number }

const oggiIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const piuGiorni = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Movimenti giorno per giorno dal gestionale demo della struttura scelta (le
// stesse prenotazioni di Planner, Arrivi e partenze e Ospiti in casa).
function movimenti(scheda: { nome: string; categoria: string; camere: number } | undefined, da: string, a: string): Movimento[] {
  if (!scheda || scheda.camere === 0) return []
  const pms = generaPms({ nome: scheda.nome, categoria: scheda.categoria, camere: scheda.camere })
  const out: Movimento[] = []
  for (let g = da; g <= (a || da) && out.length < 62; g = piuGiorni(g, 1)) {
    const valide = pms.prenotazioni.filter((p) => p.stato !== 'noshow')
    const presenze = valide.filter((p) => p.checkIn <= g && g < p.checkOut).length
    out.push({
      data: isoIt(g),
      arrivi: valide.filter((p) => p.checkIn === g).length,
      presenze,
      partenze: valide.filter((p) => p.checkOut === g).length,
      libere: Math.max(0, pms.camere.length - presenze),
    })
  }
  return out
}

export default function PrevisioneMovimenti({ navigate }: { navigate: (p: string) => void }) {
  // La settimana da oggi, per la struttura selezionata in alto (o un'altra del cliente).
  const [da, setDa] = useState(oggiIso)
  const [a, setA]   = useState(() => piuGiorni(oggiIso(), 6))
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const schede = useStruttureCliente()
  const MOCK = useMemo(() => movimenti(schede.find((x) => x.nome === struttura), da, a), [schede, struttura, da, a])
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const q = search.trim()
    return q ? MOCK.filter((m) => m.data.includes(q)) : MOCK
  }, [search, MOCK])

  return (
    <div className="previsione-mov">
      <PageHead back onBack={() => navigate('stato-camere')} title="Previsione movimenti camere" subtitle="Riepilogo giornaliero di arrivi, presenze, partenze e camere libere" />

      <div className="previsione-mov__bar flex items-end gap-3 mb-5 flex-wrap">
        <DateRangeField label="Da" nameFrom="da" nameTo="a" valueFrom={da} valueTo={a} onChangeFrom={(e) => setDa(e.target.value)} onChangeTo={(e) => setA(e.target.value)} />
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={opzioniStrutture} />
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
