import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import './DettaglioPrenotazioniModal.sass'

interface Prenotazione {
  id: string
  cliente: string
  arrivo: string
  partenza: string
  camere: number
  persone: number
  tipologie: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  data: Date | null
}

const MOCK_PRENOTAZIONI: Prenotazione[] = [
  { id: '5974',  cliente: 'Travco London',          arrivo: '22/maggio', partenza: '25/maggio', camere: 1, persone: 2, tipologie: ['Base doppia','Superior matrimoniale','Junior suite'] },
  { id: '5975',  cliente: 'Travco London',          arrivo: '22/maggio', partenza: '25/maggio', camere: 1, persone: 2, tipologie: ['Base doppia','Superior matrimoniale'] },
  { id: '9132',  cliente: 'Booking.Com',            arrivo: '23/maggio', partenza: '24/maggio', camere: 1, persone: 1, tipologie: ['Base singola','Standard'] },
  { id: '9243',  cliente: 'ORBE TRAVEL CLUB SPAIN S.L.U', arrivo: '22/maggio', partenza: '25/maggio', camere: 1, persone: 2, tipologie: ['Base doppia','Comfort doppia'] },
  { id: '9470',  cliente: 'Booking.Com',            arrivo: '23/maggio', partenza: '25/maggio', camere: 1, persone: 2, tipologie: ['Base doppia','Superior'] },
  { id: '9558',  cliente: 'Booking.Com',            arrivo: '23/maggio', partenza: '27/maggio', camere: 1, persone: 1, tipologie: ['Base singola','Singola Comfort'] },
  { id: '10194', cliente: 'Expedia Group Inc.',     arrivo: '23/maggio', partenza: '26/maggio', camere: 1, persone: 2, tipologie: ['Base doppia','Standard matrimoniale'] },
  { id: '10232', cliente: 'ORBE TRAVEL CLUB SPAIN S.L.U', arrivo: '22/maggio', partenza: '24/maggio', camere: 1, persone: 2, tipologie: ['Base doppia','Superior'] },
]

function formatHeaderDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function DettaglioPrenotazioniModal({ open, onClose, data }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selezioni, setSelezioni] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setExpandedId(null)
      setSelezioni({})
    }
  }, [open])

  const totali = useMemo(() => ({
    prenotazioni: MOCK_PRENOTAZIONI.length + 26,
    camere: 99,
    persone: 186,
  }), [])

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Dettaglio prenotazioni">
      <div className="det-pren">
        <div className="det-pren__meta">
          {data ? formatHeaderDate(data) : '—'} · {totali.prenotazioni} Prenotazioni · {totali.camere} Camere · {totali.persone} Persone
        </div>

        <span className="det-pren__chip">Ottimizzazione disponibilità di catena</span>

        <div className="det-pren__info">
          <div className="det-pren__info-icon">
            <i className="fa-light fa-hotel" aria-hidden="true" />
          </div>
          <p className="det-pren__info-text">
            Analizza le prenotazioni coinvolte e individua rapidamente come redistribuirle sugli altri hotel della catena per liberare capacità e ottimizzare gli spazi.
          </p>
        </div>

        <div className="det-pren__table-wrap">
          <table className="sib-table det-pren__table">
            <thead>
              <tr>
                <th>Identificativo</th>
                <th>Cliente</th>
                <th>Date</th>
                <th className="det-pren__num">Camere</th>
                <th className="det-pren__num">Persone</th>
                <th className="det-pren__action-col">Azione</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PRENOTAZIONI.map(p => {
                const isOpen = expandedId === p.id
                return (
                  <tr key={p.id} className="det-pren__tr">
                    <td className="det-pren__id">{p.id}</td>
                    <td className="det-pren__cliente">{p.cliente}</td>
                    <td className="det-pren__dates">
                      <span>{p.arrivo}</span>
                      <span>{p.partenza}</span>
                    </td>
                    <td className="det-pren__num">{p.camere}</td>
                    <td className="det-pren__num">{p.persone}</td>
                    <td className="det-pren__action">
                      {isOpen ? (
                        <div className="det-pren__suggest">
                          <label className="det-pren__suggest-label">Tipologia base</label>
                          <select
                            className="det-pren__select"
                            value={selezioni[p.id] ?? p.tipologie[0]}
                            onChange={e => setSelezioni(prev => ({ ...prev, [p.id]: e.target.value }))}
                          >
                            {p.tipologie.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="det-pren__confirm"
                            onClick={() => setExpandedId(null)}
                            title="Conferma spostamento"
                          >
                            <i className="fa-light fa-arrow-right" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="det-pren__suggest-btn"
                          onClick={() => setExpandedId(p.id)}
                        >
                          <i className="fa-light fa-shuffle" aria-hidden="true" />
                          <span>Suggerisci spostamento</span>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="det-pren__footer">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </Modal>
  )
}
