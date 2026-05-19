import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './PolitichePrenotazione.sass'

interface Politica {
  Id: number; Nome: string; Descrizione: string;
  PagamentoAllaPrenotazione: boolean;
  PoliticaCancellazioneAbilitata: boolean;
  PenaleMancatoArrivoAbilitata: boolean;
  PenaleMancatoArrivoPercentuale: number;
}
interface Data { Politiche: Politica[] }

const FALLBACK: Data = {
  Politiche: [
    { Id: 1, Nome: 'Rimborsabile', Descrizione: 'Per prenotazioni rimborsabili', PagamentoAllaPrenotazione: true, PoliticaCancellazioneAbilitata: false, PenaleMancatoArrivoAbilitata: false, PenaleMancatoArrivoPercentuale: 0 },
    { Id: 2, Nome: 'test',         Descrizione: 'testttttt',                    PagamentoAllaPrenotazione: true, PoliticaCancellazioneAbilitata: false, PenaleMancatoArrivoAbilitata: true,  PenaleMancatoArrivoPercentuale: 20 },
    { Id: 3, Nome: 'testets',      Descrizione: 'testets',                      PagamentoAllaPrenotazione: false, PoliticaCancellazioneAbilitata: false, PenaleMancatoArrivoAbilitata: false, PenaleMancatoArrivoPercentuale: 0 },
    { Id: 4, Nome: 'ciao',         Descrizione: 'ciaociao',                     PagamentoAllaPrenotazione: true, PoliticaCancellazioneAbilitata: false, PenaleMancatoArrivoAbilitata: true,  PenaleMancatoArrivoPercentuale: 90 },
  ],
}

const EMPTY: Politica = { Id: 0, Nome: '', Descrizione: '', PagamentoAllaPrenotazione: false, PoliticaCancellazioneAbilitata: false, PenaleMancatoArrivoAbilitata: false, PenaleMancatoArrivoPercentuale: 0 }

export default function PolitichePrenotazione() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [editing, setEditing] = useState<Politica | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetPolitichePrenotazione', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const save = async () => {
    if (!editing) return
    try { await apiFetchSibylla('configura/SetPolitichePrenotazione', { method: 'POST', body: editing }) } catch {}
    if (editing.Id) {
      setData({ Politiche: data.Politiche.map((p) => p.Id === editing.Id ? editing : p) })
    } else {
      setData({ Politiche: [...data.Politiche, { ...editing, Id: Date.now() }] })
    }
    setEditing(null)
  }

  return (
    <div className="politiche-prenotazione">
      <div className="politiche-prenotazione__breadcrumb">
        <span>Configuratore <i className="fa-light fa-chevron-right" /> <strong>Politiche di prenotazione</strong></span>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setEditing({ ...EMPTY })}>
          <i className="fa-light fa-circle-plus" /> Crea nuova regola
        </button>
      </div>

      <table className="politiche-prenotazione__table">
        <thead><tr><th>Nome</th><th>Descrizione</th><th>Prenotazione</th><th>Cancellazione</th><th>Mancato arrivo</th><th>Azioni</th></tr></thead>
        <tbody>
          {data.Politiche.map((p) => (
            <tr key={p.Id}>
              <td>{p.Nome}</td><td>{p.Descrizione}</td>
              <td>{p.PagamentoAllaPrenotazione ? 'Sì' : 'No'}</td>
              <td>{p.PoliticaCancellazioneAbilitata ? 'Sì' : 'No'}</td>
              <td>{p.PenaleMancatoArrivoAbilitata ? `${p.PenaleMancatoArrivoPercentuale.toFixed(2).replace('.', ',')}%` : 'Nessuna'}</td>
              <td className="politiche-prenotazione__actions-cell">
                <button type="button" className="sib-btn sib-btn--icon" onClick={() => setEditing({ ...p })}><i className="fa-light fa-pen" /></button>
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="politiche-prenotazione__modal-backdrop" onClick={() => setEditing(null)}>
          <div className="politiche-prenotazione__modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.Id ? 'Modifica regola' : 'Nuova regola'}</h3>
            <div className="politiche-prenotazione__field"><label>Nome</label>
              <input type="text" className="sib-input" value={editing.Nome} onChange={(e) => setEditing({ ...editing, Nome: e.target.value })} />
            </div>
            <div className="politiche-prenotazione__field"><label>Descrizione</label>
              <textarea className="sib-input" rows={3} value={editing.Descrizione} onChange={(e) => setEditing({ ...editing, Descrizione: e.target.value })} />
            </div>
            <label className="politiche-prenotazione__check">
              <input type="checkbox" className="sib-checkbox" checked={editing.PagamentoAllaPrenotazione} onChange={(e) => setEditing({ ...editing, PagamentoAllaPrenotazione: e.target.checked })} />
              <span>Pagamento alla prenotazione</span>
            </label>
            <label className="politiche-prenotazione__check">
              <input type="checkbox" className="sib-checkbox" checked={editing.PoliticaCancellazioneAbilitata} onChange={(e) => setEditing({ ...editing, PoliticaCancellazioneAbilitata: e.target.checked })} />
              <span>Politica di cancellazione abilitata</span>
            </label>
            <label className="politiche-prenotazione__check">
              <input type="checkbox" className="sib-checkbox" checked={editing.PenaleMancatoArrivoAbilitata} onChange={(e) => setEditing({ ...editing, PenaleMancatoArrivoAbilitata: e.target.checked })} />
              <span>Penale mancato arrivo abilitata</span>
            </label>
            {editing.PenaleMancatoArrivoAbilitata && (
              <div className="politiche-prenotazione__field"><label>Percentuale penale</label>
                <div className="politiche-prenotazione__cell">
                  <input type="number" min={0} max={100} step={0.01} className="sib-input" value={editing.PenaleMancatoArrivoPercentuale} onChange={(e) => setEditing({ ...editing, PenaleMancatoArrivoPercentuale: Number(e.target.value) || 0 })} />
                  <span>%</span>
                </div>
              </div>
            )}
            <div className="politiche-prenotazione__modal-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setEditing(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={save}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
