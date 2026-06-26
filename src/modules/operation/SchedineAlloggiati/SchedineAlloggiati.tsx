import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { DatePickerField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './SchedineAlloggiati.sass'

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

const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']

const FALLBACK: Schedina[] = [
  { id_schedina: 1, prenotazione: 15178, camera: '103', nominativo: 'Ruggero novi',     nazionalita: 'ALBANIA', data_check_in: '29/04/2026', stato: 'da-inviare' },
  { id_schedina: 2, prenotazione: 15184, camera: '109', nominativo: 'Virgy Novo',       nazionalita: 'ANDORRA', data_check_in: '29/04/2026', stato: 'da-inviare' },
  { id_schedina: 3, prenotazione: 15179, camera: '101', nominativo: 'Ruggero Poliziani', nazionalita: 'Austria', data_check_in: '29/04/2026', stato: 'da-inviare' },
  { id_schedina: 4, prenotazione: 15182, camera: '105', nominativo: 'Ruggero Aslan',     nazionalita: 'ALBANIA', data_check_in: '29/04/2026', stato: 'da-inviare' },
]

const STATO_LABEL: Record<string, { label: string; color: string }> = {
  'da-inviare': { label: 'DA INVIARE', color: '#1B7F4F' },
  'inviata':    { label: 'INVIATA',    color: '#0F2C4A' },
  'errore':     { label: 'ERRORE',     color: '#B23A3A' },
}

export default function SchedineAlloggiati({ navigate }: { navigate: (p: string) => void }) {
  const today = '2026-04-29'
  const [items, setItems] = useState<Schedina[]>(FALLBACK)
  const [data, setData] = useState(today)
  const [struttura, setStruttura] = useState('Hotel Tutorial')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Schedina[]>('backoffice/GetSchedineAlloggiati', {
      method: 'POST',
      body: { data_riferimento: data, struttura },
    })
      .then((d) => { if (!cancelled) setItems(d) })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [data, struttura])

  const tuttiInviati = items.length > 0 && items.every((s) => s.stato !== 'da-inviare')

  async function inviaQuestura() {
    try {
      await apiFetchSibylla('backoffice/InviaQuestura', { method: 'POST', body: { data_riferimento: data, struttura } })
    } catch { /* demo: prosegue comunque */ }
    setItems((prev) => prev.map((s) => s.stato === 'da-inviare' ? { ...s, stato: 'inviata' } : s))
  }

  return (
    <div>
      <BtnBack />
      <PageHeader title="Schedine alloggiati" subtitle="Archivio automatico e centralizzato delle presenze" />

      <div className="flex items-end gap-4 mb-5 flex-wrap">
        <div className="w-44">
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="w-56">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
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
