import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import ConfirmDeleteModal from '../../../admin/SibyllaAdminPanel/modals/ConfirmDeleteModal/ConfirmDeleteModal'
import Modal from '../../../core/components/Modal'
import { TextareaField } from '../../../core/components/form'
import { useServiziStore } from '../../../store/useServiziStore'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import { useNotificheServiziStore } from '../../../store/useNotificheServiziStore'
import {
  STATO_SERVIZIO_META,
  type Servizio,
  type ServizioForm,
  type TipoServizio,
  type StatoServizio,
} from './servizi-types'
import ServizioModal from './ServizioModal'
import './GestioneServizi.sass'

const EMPTY_FORM: ServizioForm = {
  tipo: 'escursione',
  nome: '', descrizione: '',
  citta: '', paese: 'Italia',
  immagineUrl: '',
  disponibileDal: '', disponibileAl: '',
  adultiMax: '10', bambiniMax: '5',
  pricingMode: 'per-persona',
  prezzoAgora: '', prezzoB2B: '', prezzoB2C: '',
  durata: '',
  caratteristiche: '',
  fornitoreNome: '', sitoFornitore: '',
  attivo: true, pubblicato: true,
}

type SortKey = 'name-asc' | 'name-desc' | 'tipo-asc' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'tipo-asc',   label: 'Tipo' },
  { value: 'price-asc',  label: 'Prezzo Agorà crescente' },
  { value: 'price-desc', label: 'Prezzo Agorà decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

const formToServizio = (f: ServizioForm): Omit<Servizio, 'id'> => ({
  tipo: f.tipo,
  nome: f.nome.trim(),
  descrizione: f.descrizione.trim(),
  citta: f.citta.trim(),
  paese: f.paese.trim() || 'Italia',
  immagineUrl: f.immagineUrl.trim(),
  disponibileDal: f.disponibileDal,
  disponibileAl:  f.disponibileAl,
  adultiMax:  parseInt(f.adultiMax  || '0', 10) || 0,
  bambiniMax: parseInt(f.bambiniMax || '0', 10) || 0,
  pricingMode: f.pricingMode,
  prezzoAgora: parseFloat(f.prezzoAgora) || 0,
  prezzoB2B:   parseFloat(f.prezzoB2B)   || 0,
  prezzoB2C:   parseFloat(f.prezzoB2C)   || 0,
  durata: f.durata.trim(),
  caratteristiche: f.caratteristiche
    .split(',')
    .map(x => x.trim())
    .filter(Boolean),
  fornitoreNome: f.fornitoreNome.trim() || undefined,
  sitoFornitore: f.sitoFornitore.trim() || undefined,
  attivo: f.attivo,
  pubblicato: f.pubblicato,
})

const servizioToForm = (s: Servizio): ServizioForm => ({
  tipo: s.tipo,
  nome: s.nome,
  descrizione: s.descrizione,
  citta: s.citta,
  paese: s.paese,
  immagineUrl: s.immagineUrl,
  disponibileDal: s.disponibileDal,
  disponibileAl:  s.disponibileAl,
  adultiMax:  String(s.adultiMax),
  bambiniMax: String(s.bambiniMax),
  pricingMode: s.pricingMode,
  prezzoAgora: String(s.prezzoAgora),
  prezzoB2B:   String(s.prezzoB2B),
  prezzoB2C:   String(s.prezzoB2C),
  durata: s.durata,
  caratteristiche: s.caratteristiche.join(', '),
  fornitoreNome: s.fornitoreNome || '',
  sitoFornitore: s.sitoFornitore || '',
  attivo: s.attivo,
  pubblicato: s.pubblicato,
})

interface GestioneServiziProps {
  navigate?: (p: string) => void
  // Quando true il componente è renderizzato dentro un contenitore che fornisce
  // già un header (es. SibyllaAdminPanel) — saltiamo BtnBack e PageHeader.
  embedded?: boolean
}

export default function GestioneServizi({ navigate, embedded = false }: GestioneServiziProps) {
  const servizi          = useServiziStore(s => s.servizi)
  const tipi             = useTipiServizioStore(s => s.tipi)
  const tipoMeta         = useTipiServizioStore(s => s.meta)
  const addServizio      = useServiziStore(s => s.addServizio)
  const updateServizio   = useServiziStore(s => s.updateServizio)
  const removeServizio   = useServiziStore(s => s.removeServizio)
  const toggleAttivo     = useServiziStore(s => s.toggleAttivo)
  const togglePubblicato = useServiziStore(s => s.togglePubblicato)
  const approvaServizio  = useServiziStore(s => s.approvaServizio)
  const rifiutaServizio  = useServiziStore(s => s.rifiutaServizio)
  const pushNotifica     = useNotificheServiziStore(s => s.push)

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [tipoFilter, setTipoFilter] = useState<TipoServizio | ''>('')

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Servizio | null>(null)
  const [form, setForm] = useState<ServizioForm>(EMPTY_FORM)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statoFilter, setStatoFilter] = useState<'' | StatoServizio>('')
  const [rejectTarget, setRejectTarget] = useState<Servizio | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const statoOf = (s: Servizio): StatoServizio => s.stato ?? 'approvato'
  const pendingCount = servizi.filter(s => statoOf(s) === 'in-attesa').length

  const approva = (s: Servizio) => {
    approvaServizio(s.id)
    pushNotifica({ destinatario: 'cliente', tipo: 'approvato', servizioId: s.id, servizioNome: s.nome, ts: Date.now() })
  }
  const confirmReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return
    rifiutaServizio(rejectTarget.id, rejectReason.trim())
    pushNotifica({ destinatario: 'cliente', tipo: 'rifiutato', servizioId: rejectTarget.id, servizioNome: rejectTarget.nome, motivazione: rejectReason.trim(), ts: Date.now() })
    setRejectTarget(null)
    setRejectReason('')
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = servizi.filter(s => {
      if (tipoFilter && s.tipo !== tipoFilter) return false
      if (statoFilter && (s.stato ?? 'approvato') !== statoFilter) return false
      if (!q) return true
      return (
        s.nome.toLowerCase().includes(q) ||
        s.descrizione.toLowerCase().includes(q) ||
        s.citta.toLowerCase().includes(q) ||
        tipoMeta(s.tipo).label.toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.nome.localeCompare(b.nome)
        case 'name-desc':  return b.nome.localeCompare(a.nome)
        case 'tipo-asc':   return a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome)
        case 'price-asc':  return a.prezzoAgora - b.prezzoAgora
        case 'price-desc': return b.prezzoAgora - a.prezzoAgora
      }
    })
  }, [servizi, search, sortBy, tipoFilter, statoFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || tipoFilter !== '' || statoFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setTipoFilter(''); setStatoFilter('') }

  const openCreate = () => {
    setEditing(null)
    // Default sul primo tipo disponibile (può cambiare se l'admin ha
    // riconfigurato il set di tipi).
    setForm({ ...EMPTY_FORM, tipo: tipi[0]?.id ?? 'escursione' })
    setShowModal(true)
  }
  const openEdit = (s: Servizio) => {
    setEditing(s)
    setForm(servizioToForm(s))
    setShowModal(true)
  }
  const confirmEdit = () => {
    const data = formToServizio(form)
    if (!data.nome || !data.citta) return
    if (editing) updateServizio(editing.id, data)
    else addServizio(data)
    setShowModal(false)
  }
  const confirmDelete = () => {
    if (!deletingId) return
    removeServizio(deletingId)
    setDeletingId(null)
  }

  return (
    <div className={`gest-servizi${embedded ? ' gest-servizi--embedded' : ''}`}>
      {!embedded && (
        <>
          <BtnBack onClick={() => navigate && navigate('home')} />
          <PageHeader
            title="Gestione servizi"
            subtitle="Configura i servizi acquistabili (escursioni, noleggi, eventi…) con i tre listini Agorà / B2B / B2C"
          />
        </>
      )}

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca servizio, città, tipo…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={openCreate}>
            <Ico n="plus" s={12} c="#fff" />
            Crea servizio
          </button>
        }
        filterPanel={
          <>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ordina per</legend>
              <div className="page-toolbar__filter-options">
                {SORT_OPTIONS.map(opt => (
                  <label key={opt.value} className="page-toolbar__filter-option">
                    <input
                      type="radio"
                      name="gs-sortBy"
                      value={opt.value}
                      checked={sortBy === opt.value}
                      onChange={() => setSortBy(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Tipo servizio</legend>
              <select
                className="sib-select"
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value as TipoServizio | '')}
              >
                <option value="">Tutti i tipi</option>
                {tipi.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Stato approvazione</legend>
              <select className="sib-select" value={statoFilter} onChange={(e) => setStatoFilter(e.target.value as '' | StatoServizio)}>
                <option value="">Tutti gli stati</option>
                <option value="in-attesa">In attesa di approvazione</option>
                <option value="approvato">Approvato</option>
                <option value="rifiutato">Rifiutato</option>
              </select>
            </fieldset>
          </>
        }
      />

      <div className="gest-servizi__count">
        {displayed.length} servizi{displayed.length !== servizi.length && ` su ${servizi.length}`}
        {pendingCount > 0 && (
          <button type="button" className="gest-servizi__pending" onClick={() => setStatoFilter('in-attesa')}>
            <i className="fa-duotone fa-clock" /> {pendingCount} in attesa di approvazione
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="gest-servizi__empty">Nessun servizio trovato con i filtri selezionati.</div>
      ) : (
        <div className="sib-table-wrap">
          <table className="sib-table gest-servizi__table">
            <thead>
              <tr>
                <th className="gest-servizi__th-thumb"></th>
                <th>Servizio</th>
                <th>Tipo</th>
                <th>Città</th>
                <th>Disponibilità</th>
                <th>Agorà</th>
                <th>B2B</th>
                <th>B2C</th>
                <th>Attivo</th>
                <th>Pubblicato</th>
                <th>Stato</th>
                <th className="gest-servizi__th-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(s => {
                const meta = tipoMeta(s.tipo)
                return (
                  <tr key={s.id} className={s.attivo ? '' : 'gest-servizi__row--off'}>
                    <td>
                      <div className="gest-servizi__thumb">
                        {s.immagineUrl
                          ? <img src={s.immagineUrl} alt={s.nome} />
                          : <Ico n="image" s={16} c="var(--color-text-disabled)" />}
                      </div>
                    </td>
                    <td>
                      <div className="gest-servizi__name">{s.nome}</div>
                      <div className="gest-servizi__sub">{s.durata} · {s.pricingMode}</div>
                    </td>
                    <td>
                      <span
                        className="gest-servizi__type-badge"
                        style={{ '--type-color': meta.color } as React.CSSProperties}
                      >
                        <Icon family="light" name={meta.icon} />
                        {meta.label}
                      </span>
                    </td>
                    <td>{s.citta}</td>
                    <td className="gest-servizi__date-cell">
                      {s.disponibileDal}
                      <br />
                      <span className="gest-servizi__date-sep">→ {s.disponibileAl}</span>
                    </td>
                    <td>€ {s.prezzoAgora.toFixed(2)}</td>
                    <td>€ {s.prezzoB2B.toFixed(2)}</td>
                    <td>€ {s.prezzoB2C.toFixed(2)}</td>
                    <td>
                      <label className="gest-servizi__switch" title={s.attivo ? 'Disattiva' : 'Attiva'}>
                        <input type="checkbox" checked={s.attivo} onChange={() => toggleAttivo(s.id)} />
                        <span className="gest-servizi__switch-slider" />
                      </label>
                    </td>
                    <td>
                      <label className="gest-servizi__switch" title={s.pubblicato ? 'Nascondi' : 'Pubblica'}>
                        <input type="checkbox" checked={s.pubblicato} onChange={() => togglePubblicato(s.id)} />
                        <span className="gest-servizi__switch-slider" />
                      </label>
                    </td>
                    <td>
                      {(() => { const m = STATO_SERVIZIO_META[statoOf(s)]; return (
                        <span
                          className={`gest-servizi__stato gest-servizi__stato--${m.tone}`}
                          title={statoOf(s) === 'rifiutato' && s.motivazioneRifiuto ? s.motivazioneRifiuto : undefined}
                        >
                          <i className={`fa-duotone ${m.icon}`} /> {m.label}
                        </span>
                      ) })()}
                    </td>
                    <td className="gest-servizi__cell-actions">
                      {statoOf(s) === 'in-attesa' && (
                        <>
                          <button type="button" className="gest-servizi__icon-btn gest-servizi__icon-btn--ok" title="Approva" onClick={() => approva(s)}>
                            <Ico n="check" s={13} c="var(--color-success)" />
                          </button>
                          <button type="button" className="gest-servizi__icon-btn gest-servizi__icon-btn--danger" title="Rifiuta" onClick={() => { setRejectTarget(s); setRejectReason('') }}>
                            <Ico n="x" s={13} c="var(--color-error)" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="gest-servizi__icon-btn"
                        title="Modifica"
                        onClick={() => openEdit(s)}
                      >
                        <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                      </button>
                      <button
                        type="button"
                        className="gest-servizi__icon-btn gest-servizi__icon-btn--danger"
                        title="Elimina"
                        onClick={() => setDeletingId(s.id)}
                      >
                        <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ServizioModal
        open={showModal}
        editing={editing}
        form={form}
        setForm={setForm}
        onClose={() => setShowModal(false)}
        onConfirm={confirmEdit}
      />

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina servizio"
        itemName={servizi.find(s => s.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />

      <Modal open={rejectTarget !== null} onClose={() => setRejectTarget(null)} size="md">
        <div className="gest-servizi__reject">
          <h3 className="gest-servizi__reject-title">Rifiuta servizio</h3>
          <p className="gest-servizi__reject-sub">
            Servizio: <strong>{rejectTarget?.nome}</strong>. Indica la motivazione del rifiuto: verrà mostrata al cliente,
            che potrà correggere e ri-sottoporre il servizio.
          </p>
          <TextareaField
            name="rejectReason"
            className="gest-servizi__reject-text"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Es. Le foto non rispettano le linee guida: aggiorna l'immagine principale."
          />
          <div className="gest-servizi__reject-actions">
            <button className="sib-btn sib-btn--toolbar" onClick={() => setRejectTarget(null)}>Annulla</button>
            <button className="sib-btn sib-btn--primary" disabled={!rejectReason.trim()} onClick={confirmReject}>
              Rifiuta e notifica
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
