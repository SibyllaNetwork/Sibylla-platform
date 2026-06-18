import React, { useMemo, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import { useAziendaEditStore } from './aziendaEditStore'
import './GestioneAziende.sass'

// Mappa il "tipo" mostrato in tabella sulle opzioni del form Crea/Modifica azienda.
const TIPO_FORM: Record<string, string> = { Hotel: 'Struttura ricettiva', Ristorante: 'Ristorante', Bar: 'Bar' }

interface Props {
  navigate: (p: string) => void
}

interface Az { nome: string; citta: string; tipo: string; tel: string; email: string; prerolling: boolean }

const BASE: Az[] = [
  { nome: 'GAR S.R.L.', citta: 'Roma', tipo: 'Hotel', tel: '0666666666', email: 'dev@sibyllanetwork.com', prerolling: false },
  { nome: 'Sibylla', citta: 'Milano', tipo: 'Hotel', tel: '123213', email: 'test@gmail.com', prerolling: false },
  { nome: 'Tour Operator Test', citta: 'Roma', tipo: 'Tour Operator', tel: '456456', email: 'dev@sibyllanetwork.com', prerolling: false },
  { nome: 'Reservation Hotel Italy', citta: 'Roma', tipo: 'Tour Operator', tel: '0686200036', email: 'dev@sibyllanetwork.com', prerolling: true },
  { nome: 'Ferservizi', citta: 'Roma', tipo: 'Tour Operator', tel: '', email: '', prerolling: false },
  { nome: 'Food Hub S.R.L.', citta: 'Milano', tipo: 'Fornitore', tel: '1111', email: 'dev@sibyllanetwork.com', prerolling: false },
  { nome: 'Deposito S.R.L.', citta: '', tipo: 'Fornitore', tel: '', email: 'dev@sibyllanetwork.com', prerolling: false },
  { nome: 'Facchini S.R.L.', citta: '', tipo: 'Fornitore', tel: '', email: 'dev@sibyllanetwork.com', prerolling: false },
  { nome: 'Transfer S.R.L.', citta: '', tipo: 'Fornitore', tel: '', email: 'dev@sibyllanetwork.com', prerolling: false },
  { nome: 'm.pieri@sibyllanetwork.com', citta: '', tipo: 'Fornitore', tel: '', email: 'dev@sibyllanetwork.com', prerolling: false },
]
const AZIENDE: Az[] = [
  ...BASE,
  ...Array.from({ length: 36 }, (_, i) => ({ nome: `Azienda Demo ${i + 1}`, citta: 'Roma', tipo: 'Fornitore', tel: '', email: 'dev@sibyllanetwork.com', prerolling: false })),
]
const PAGE_SIZE = 10

export default function GestioneAziende({ navigate }: Props) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(AZIENDE.length / PAGE_SIZE))
  const rows = useMemo(() => AZIENDE.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE), [page])

  const editAzienda = (a: Az) => {
    useAziendaEditStore.getState().startEdit({
      ragioneSociale: a.nome,
      nomeDitta: a.nome,
      tipoAzienda: TIPO_FORM[a.tipo] || 'Altro',
      citta: a.citta,
      emailAzienda: a.email,
      telefono: a.tel,
      prerolling: a.prerolling,
    })
    navigate('pa-crea-azienda')
  }

  return (
    <div className="gaz">
      <button type="button" className="gaz__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="gaz__head">
        <h1 className="gaz__title">Gestione delle aziende</h1>
        <p className="gaz__sub">Consulta e gestisci le aziende clienti registrate sulla piattaforma.</p>
      </div>

      <div className="gaz__toolbar">
        <button type="button" className="gaz__btn" onClick={() => navigate('pa-crea-azienda')}>
          <Ico n="plus" s={13} c="#fff" /> Crea azienda
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table gaz__table">
          <thead>
            <tr>
              <th>Azienda</th><th>Città</th><th>Tipo azienda</th><th>Telefono</th><th>Email</th>
              <th>Logo</th><th>Stato</th><th>Prerolling status</th>
              <th className="gaz__th-actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i}>
                <td className="gaz__name">{a.nome}</td>
                <td>{a.citta || '—'}</td>
                <td>{a.tipo}</td>
                <td>{a.tel || '—'}</td>
                <td>{a.email || '—'}</td>
                <td><span className="gaz__logo">{a.nome.slice(0, 2).toUpperCase()}</span></td>
                <td><span className="gaz__stato">Attiva</span></td>
                <td>
                  <span className={`gaz__pre${a.prerolling ? ' gaz__pre--on' : ''}`}>
                    {a.prerolling ? 'Prerolling è attivato' : 'Prerolling non è attivato'}
                  </span>
                </td>
                <td className="gaz__actions">
                  <Tooltip text="Modifica azienda">
                    <button type="button" className="gaz__icon" onClick={() => editAzienda(a)}><Ico n="edit" s={14} c="var(--color-text-inactive)" /></button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="gaz__pag"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>
    </div>
  )
}
