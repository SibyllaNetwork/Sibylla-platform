import React, { useEffect, useMemo, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { useColFilters } from '../../../core/components/ColFilters'
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

// Etichette usate sia in cella sia come scelte dell'imbuto, così il filtro
// combacia con quello che si legge in tabella.
const cittaLabel = (c: string) => c || '—'
const preLabel = (p: boolean) => (p ? 'Attivato' : 'Non attivato')

const CITTA = Array.from(new Set(AZIENDE.map(a => cittaLabel(a.citta)))).sort()
const TIPI = Array.from(new Set(AZIENDE.map(a => a.tipo))).sort()
const PREROLLING = ['Attivato', 'Non attivato']

export default function GestioneAziende({ navigate }: Props) {
  const [page, setPage] = useState(1)
  // Filtri per colonna: imbuto (scelte multiple) e lente (ricerca testo).
  const cf = useColFilters()

  const filtered = useMemo(() => AZIENDE.filter(a =>
    cf.matchMulti(cittaLabel(a.citta), 'citta') &&
    cf.matchMulti(a.tipo, 'tipo') &&
    cf.matchMulti(preLabel(a.prerolling), 'prerolling') &&
    cf.matchText(a.nome, 'nome') &&
    cf.matchText(a.tel, 'tel') &&
    cf.matchText(a.email, 'email')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [cf.text, cf.multi])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [cf.text, cf.multi])
  const rows = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE), [filtered, page])

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
          {/* Larghezze in percentuale + table-layout fixed: nessuno scroll orizzontale. */}
          <colgroup>
            <col className="gaz__col-azienda" />
            <col className="gaz__col-citta" />
            <col className="gaz__col-tipo" />
            <col className="gaz__col-tel" />
            <col className="gaz__col-email" />
            <col className="gaz__col-logo" />
            <col className="gaz__col-stato" />
            <col className="gaz__col-prerolling" />
            <col className="gaz__col-azioni" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Azienda" />{cf.th('nome', 'azienda', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Città" />{cf.th('citta', 'città', { options: CITTA })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Tipo azienda" short="Tipo az." />{cf.th('tipo', 'tipo azienda', { options: TIPI })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Telefono" short="Tel." />{cf.th('tel', 'telefono', { search: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Email" />{cf.th('email', 'email', { search: true })}</span></th>
              <th><ThLabel full="Logo" /></th><th><ThLabel full="Stato" /></th>
              <th><span className="sib-colf-head"><ThLabel full="Prerolling status" short="Prerolling" />{cf.th('prerolling', 'prerolling', { options: PREROLLING })}</span></th>
              <th className="gaz__th-actions"><ThLabel full="Azioni" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={9} className="gaz__empty">Nessuna azienda con i filtri selezionati.</td></tr>
            )}
            {rows.map((a, i) => (
              <tr key={i}>
                <td className="gaz__name"><TruncatedText text={a.nome} /></td>
                <td><TruncatedText text={a.citta || '—'} /></td>
                <td><TruncatedText text={a.tipo} /></td>
                <td><TruncatedText text={a.tel || '—'} /></td>
                <td><TruncatedText text={a.email || '—'} /></td>
                <td><span className="gaz__logo">{a.nome.slice(0, 2).toUpperCase()}</span></td>
                <td><span className="gaz__stato">Attiva</span></td>
                <td>
                  <TruncatedText
                    className={`gaz__pre${a.prerolling ? ' gaz__pre--on' : ''}`}
                    text={a.prerolling ? 'Prerolling è attivato' : 'Prerolling non è attivato'}
                  />
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
