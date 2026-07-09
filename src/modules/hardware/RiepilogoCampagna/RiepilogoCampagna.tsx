import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import FormActions from '../../../core/components/FormActions'
import TotemAgoraCta from '../_shared/TotemAgoraCta'
import TotemDettaglioModal from '../_shared/TotemDettaglioModal'
import './RiepilogoCampagna.sass'

type RowStatus = 'ok' | 'pending' | 'blocked'

interface Spot {
  id: string
  date: string
  periodo: string
  frequenza: string
  fileName: string
  fileUrl?: string
  status: RowStatus
}

const SPOTS: Spot[] = [
  { id: '1',  date: '12/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '1 passaggio da 30 secondi',  fileName: 'spot_estate_30s.mp4', status: 'pending' },
  { id: '2',  date: '13/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '5 passaggi da 30 secondi',   fileName: 'spot_estate_30s.mp4', status: 'pending' },
  { id: '3',  date: '14/08/2024', periodo: 'Pomeriggio 14:00 - 21:00',  frequenza: '3 passaggi da 5 secondi',    fileName: 'spot_promo_5s.mp4',   status: 'ok' },
  { id: '4',  date: '15/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '5 passaggi da 30 secondi',   fileName: 'spot_estate_30s.mp4', status: 'pending' },
  { id: '5',  date: '16/08/2024', periodo: '—',                          frequenza: '0 passaggi da 5 secondi',    fileName: '—',                   status: 'blocked' },
  { id: '6',  date: '17/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '5 passaggi da 30 secondi',   fileName: 'spot_estate_30s.mp4', status: 'pending' },
  { id: '7',  date: '18/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '1 passaggio da 30 secondi',  fileName: 'spot_estate_30s.mp4', status: 'pending' },
  { id: '8',  date: '19/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '2 passaggi da 30 secondi',   fileName: 'spot_estate_30s.mp4', status: 'pending' },
  { id: '9',  date: '20/08/2024', periodo: 'Mattino 07:30 - 11:30',     frequenza: '3 passaggi da 15 secondi',   fileName: 'spot_promo_15s.mp4',  status: 'pending' },
]

export default function RiepilogoCampagna({ navigate }: { navigate: (p: string) => void }) {
  const [previewSpot, setPreviewSpot] = useState<Spot | null>(null)
  const [spots, setSpots] = useState<Spot[]>(SPOTS)
  const [dettaglioOpen, setDettaglioOpen] = useState(false)

  function remove(id: string) {
    setSpots(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="riep-camp">
      <PageHead title="Totem & Gestione Advertising" onBack={() => navigate('pianifica-campagna')} />

      <div className="riep-camp__layout">
        {/* ── Sinistra: riepilogo ─────────────────────────── */}
        <section className="riep-camp__panel">
          <h3 className="riep-camp__title">Servizio così impostato</h3>

          <div className="riep-camp__date-range">
            <div className="riep-camp__date-cell">
              <label>Data inizio</label>
              <span>12/08/2024</span>
            </div>
            <div className="riep-camp__date-cell">
              <label>Data fine</label>
              <span>23/08/2024</span>
            </div>
          </div>

          <div className="sib-table-wrap">
          <table className="sib-table riep-camp__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Periodo</th>
                <th>Frequenze passaggi</th>
                <th className="riep-camp__th-center">File</th>
                <th className="riep-camp__th-center">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {spots.map(s => (
                <tr key={s.id} className={'riep-camp__row riep-camp__row--' + s.status}>
                  <td className="riep-camp__td-date">{s.date}</td>
                  <td className={s.periodo === '—' ? 'sib-cell--muted' : ''}>{s.periodo}</td>
                  <td>{s.frequenza}</td>
                  <td className="riep-camp__td-center">
                    {s.status !== 'blocked' && s.fileName !== '—' ? (
                      <Tooltip text={`Anteprima ${s.fileName}`}>
                        <button
                          type="button"
                          className="riep-camp__file-btn"
                          aria-label="Anteprima video"
                          onClick={() => setPreviewSpot(s)}
                        >
                          <i className="fa-light fa-folder-image" />
                        </button>
                      </Tooltip>
                    ) : (
                      <span className="sib-cell--muted">—</span>
                    )}
                  </td>
                  <td className="riep-camp__td-center">
                    <StatusIcon status={s.status} />
                  </td>
                  <td>
                    <span className="riep-camp__row-actions">
                      <Tooltip text="Modifica">
                        <button type="button" className="riep-camp__action" aria-label="Modifica">
                          <i className="fa-light fa-pen-to-square" />
                        </button>
                      </Tooltip>
                      <Tooltip text="Elimina">
                        <button type="button" className="riep-camp__action" aria-label="Elimina" onClick={() => remove(s.id)}>
                          <i className="fa-light fa-trash" />
                        </button>
                      </Tooltip>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="riep-camp__panel-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('pianifica-campagna')}>
              <i className="fa-light fa-arrow-left" /> Indietro
            </button>
            <button type="button" className="sib-btn sib-btn--primary">
              <i className="fa-light fa-circle-check" /> Conferma campagna
            </button>
          </div>
        </section>

        {/* ── Centro: posizione scelta ────────────────────── */}
        <section className="riep-camp__pos-section">
          <h3 className="riep-camp__pos-title">Posizione scelta</h3>
          <button
            type="button"
            className="riep-camp__pos-name-btn"
            onClick={() => setDettaglioOpen(true)}
            aria-label="Dettaglio totem Hotel Archimede"
          >
            <strong>Hotel Archimede</strong>
          </button>
          <p className="riep-camp__pos-addr">Via dei Mille 19 Roma</p>
          <div className="riep-camp__pos-photo">
            <img
              src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800"
              alt="Reception Hotel Archimede"
              loading="lazy"
            />
          </div>
        </section>

        {/* ── Destra: anteprima totem ─────────────────────── */}
        <div className="riep-camp__totem-col">
          <TotemAgoraCta showTitle={false} showBanner={false} />
        </div>
      </div>

      <TotemDettaglioModal
        open={dettaglioOpen}
        strutturaName="Hotel Archimede"
        onClose={() => setDettaglioOpen(false)}
      />

      {/* ── Modale anteprima video ────────────────────────── */}
      {previewSpot && (
        <div className="riep-camp__modal-backdrop" onClick={() => setPreviewSpot(null)}>
          <div className="riep-camp__modal" onClick={e => e.stopPropagation()}>
            <header className="riep-camp__modal-head">
              <div>
                <h3 className="riep-camp__modal-title">Anteprima creatività</h3>
                <p className="riep-camp__modal-sub">{previewSpot.fileName}</p>
              </div>
              <Tooltip text="Chiudi">
                <button type="button" className="sib-btn sib-btn--icon" onClick={() => setPreviewSpot(null)} aria-label="Chiudi">
                  <i className="fa-light fa-xmark" />
                </button>
              </Tooltip>
            </header>

            <div className="riep-camp__player">
              <div className="riep-camp__player-frame">
                <span className="riep-camp__player-icon" aria-hidden="true">
                  <i className="fa-light fa-circle-play" />
                </span>
                <span className="riep-camp__player-label">Anteprima video</span>
              </div>
            </div>

            <dl className="riep-camp__modal-meta">
              <div>
                <dt>Data</dt>
                <dd>{previewSpot.date}</dd>
              </div>
              <div>
                <dt>Periodo</dt>
                <dd>{previewSpot.periodo}</dd>
              </div>
              <div>
                <dt>Frequenza</dt>
                <dd>{previewSpot.frequenza}</dd>
              </div>
              <div>
                <dt>File</dt>
                <dd className="riep-camp__mono">{previewSpot.fileName}</dd>
              </div>
            </dl>

            <FormActions
              onCancel={() => setPreviewSpot(null)}
              onConfirm={() => setPreviewSpot(null)}
              cancelLabel="Chiudi"
              confirmLabel="Sostituisci file"
              confirmIcon="fa-arrows-rotate"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === 'ok')      return <i className="fa-solid fa-circle-check riep-camp__status riep-camp__status--ok" aria-label="OK" />
  if (status === 'blocked') return <i className="fa-solid fa-ban riep-camp__status riep-camp__status--blocked" aria-label="Bloccato" />
  return <i className="fa-solid fa-clock riep-camp__status riep-camp__status--pending" aria-label="In attesa" />
}
