import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { DatePickerField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './SchedineAlloggiati.sass'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { pmsAttivo, usePmsStore } from '../_data/pmsDemo'

/**
 * Schedine alloggiati — replica `Views/FrontOffice/SchedineAlloggiati.cshtml`.
 * BE: `BackOfficeController.GetSchedineAlloggiati` → catch-all
 * `/Sibylla/backoffice/GetSchedineAlloggiati`.
 */

interface Schedina {
  id_schedina?: number
  prenotazione?: number | string
  camera?: string
  nominativo?: string
  nazionalita?: string
  data_check_in?: string
  stato?: 'da-inviare' | 'inviata' | 'errore' | string
  [key: string]: unknown
}


// Dati demo: gli ospiti arrivati nel giorno nel gestionale demo della struttura
// selezionata (una schedina per ospite; quelle dei giorni passati già inviate).
const NAZIONALITA: Array<[string, string]> = [
  ['Müller', 'GERMANIA'], ['Schneider', 'GERMANIA'], ['Smith', 'REGNO UNITO'], ['Johnson', 'STATI UNITI'],
  ['Dubois', 'FRANCIA'], ['Martin', 'FRANCIA'], ['García', 'SPAGNA'], ['Fernández', 'SPAGNA'], ['Tanaka', 'GIAPPONE'], ['O’Brien', 'IRLANDA'],
]
const isoDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function schedineDemo(dataIso: string): Schedina[] {
  const oggi = isoDi(new Date())
  let id = 1
  return pmsAttivo().prenotazioni
    .filter((x) => x.checkIn === dataIso && x.stato !== 'noshow' && (dataIso < oggi || x.checkin !== 'da-fare'))
    .flatMap((x) => x.ospiti.map((o) => ({
      id_schedina: id++, prenotazione: x.booking, camera: x.camera, nominativo: o.nome,
      nazionalita: NAZIONALITA.find(([c]) => o.nome.startsWith(c + ' '))?.[1] ?? 'ITALIA',
      data_check_in: dataIso.split('-').reverse().join('/'),
      stato: dataIso < oggi ? 'inviata' : 'da-inviare',
    })))
}

const STATO_LABEL: Record<string, { label: string; color: string }> = {
  'da-inviare': { label: 'DA INVIARE', color: '#1B7F4F' },
  'inviata':    { label: 'INVIATA',    color: '#0F2C4A' },
  'errore':     { label: 'ERRORE',     color: '#B23A3A' },
}

export default function SchedineAlloggiati({ navigate }: { navigate: (p: string) => void }) {
  const today = isoDi(new Date())
  const versionePms = usePmsStore((st) => st.versione)
  const [items, setItems] = useState<Schedina[]>(() => schedineDemo(today))
  const [data, setData] = useState(today)
  // Struttura selezionata in alto (strutture del cliente).
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Schedina[]>('backoffice/GetSchedineAlloggiati', {
      method: 'POST',
      body: { data_riferimento: data, struttura },
    })
      .then((d) => { if (!cancelled) setItems(d) })
      .catch(() => { if (!cancelled) setItems(schedineDemo(data)) })
    return () => { cancelled = true }
  }, [data, struttura, versionePms])

  const tuttiInviati = items.length > 0 && items.every((s) => s.stato !== 'da-inviare')

  async function inviaQuestura() {
    try {
      await apiFetchSibylla('backoffice/InviaQuestura', { method: 'POST', body: { data_riferimento: data, struttura } })
    } catch { /* demo: prosegue comunque */ }
    setItems((prev) => prev.map((s) => s.stato === 'da-inviare' ? { ...s, stato: 'inviata' } : s))
  }

  return (
    <div>
      <PageHead title="Schedine alloggiati" subtitle="Archivio automatico e centralizzato delle presenze" />

      <div className="flex items-end gap-4 mb-5 flex-wrap">
        <div className="w-44">
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="w-56">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={opzioniStrutture} />
        </div>
        <div className="flex items-end gap-3 ml-4 flex-wrap">
          <button className="sib-btn sib-btn--primary">
            <i className="fa-duotone fa-shuffle" /> Scarica tracciato
          </button>
          <button className="sib-btn sib-btn--primary">
            <i className="fa-duotone fa-image-portrait" /> Verifica validità
          </button>
          <button className="sib-btn sib-btn--primary">
            <i className="fa-duotone fa-file-lines" /> Scarica ricevute
          </button>
          <button className="sib-btn sib-btn--primary" onClick={inviaQuestura} disabled={tuttiInviati}>
            <i className="fa-duotone fa-paper-plane" /> Invia questura
          </button>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Prenotazione</th>
              <th>Camera</th>
              <th>Nominativo</th>
              <th>Nazionalità</th>
              <th>Data Check In</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const meta = STATO_LABEL[s.stato as string] ?? { label: String(s.stato ?? '').toUpperCase(), color: '#6E7175' }
              return (
                <tr key={s.id_schedina}>
                  <td>{s.prenotazione}</td>
                  <td>{s.camera}</td>
                  <td>{s.nominativo}</td>
                  <td>{s.nazionalita}</td>
                  <td>{s.data_check_in}</td>
                  <td>
                    <span className="font-bold text-[12px] uppercase tracking-wide schedine__stato" style={{ '--stato-color': meta.color } as React.CSSProperties}>
                      {meta.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={6} className="sib-empty">Nessuna schedina per la data selezionata.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
