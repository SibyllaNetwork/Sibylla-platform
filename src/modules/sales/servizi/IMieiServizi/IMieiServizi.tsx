import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Ico from '../../../../core/icons/Ico'
import Pagination from '../../../../core/components/Pagination'
import { PageToolbar, type ViewMode } from '../../../purchasing/_shared/PageToolbar'
import ConfirmDeleteModal from '../../../../admin/SibyllaAdminPanel/modals/ConfirmDeleteModal/ConfirmDeleteModal'
import { useServiziStore } from '../../../../store/useServiziStore'
import { STATO_SERVIZIO_META, type StatoServizio } from '../../../purchasing/Servizi/servizi-types'
import './IMieiServizi.css'

/**
 * I miei servizi — catalogo servizi della struttura (da useServiziStore), con
 * stato del workflow di approvazione, modifica/ri-sottomissione ed eliminazione.
 */

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'classe-asc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',    label: 'Nome (A → Z)' },
  { value: 'name-desc',   label: 'Nome (Z → A)' },
  { value: 'classe-asc',  label: 'Classe (A → Z)' },
  { value: 'price-asc',   label: 'Prezzo B2C crescente' },
  { value: 'price-desc',  label: 'Prezzo B2C decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'
const DEFAULT_PAGE_SIZE = 25

const statoOf = (s: { stato?: StatoServizio }): StatoServizio => s.stato ?? 'approvato'

export default function IMieiServizi({ navigate }: { navigate: (p: string) => void }) {
  const servizi      = useServiziStore(s => s.servizi)
  const toggleAttivo = useServiziStore(s => s.toggleAttivo)
  const removeServizio = useServiziStore(s => s.removeServizio)

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [classeFilter, setClasseFilter] = useState<string>('')
  const [areaFilter, setAreaFilter] = useState<string>('')
  const [statoFilter, setStatoFilter] = useState<'' | StatoServizio>('')

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState<number>(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const aree = useMemo(() => Array.from(new Set(servizi.map(s => s.area).filter(Boolean) as string[])).sort(), [servizi])
  const classi = useMemo(() => Array.from(new Set(servizi.map(s => s.classe).filter(Boolean) as string[])).sort(), [servizi])

  const inAttesa = servizi.filter(s => statoOf(s) === 'in-attesa').length
  const rifiutati = servizi.filter(s => statoOf(s) === 'rifiutato').length

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = servizi.filter((s) => {
      if (classeFilter && s.classe !== classeFilter) return false
      if (areaFilter && s.area !== areaFilter) return false
      if (statoFilter && statoOf(s) !== statoFilter) return false
      if (!q) return true
      return (
        s.nome.toLowerCase().includes(q) ||
        (s.descrizione ?? '').toLowerCase().includes(q) ||
        (s.classe ?? '').toLowerCase().includes(q) ||
        (s.area ?? '').toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':    return a.nome.localeCompare(b.nome)
        case 'name-desc':   return b.nome.localeCompare(a.nome)
        case 'classe-asc':  return (a.classe ?? '').localeCompare(b.classe ?? '') || a.nome.localeCompare(b.nome)
        case 'price-asc':   return a.prezzoB2C - b.prezzoB2C
        case 'price-desc':  return b.prezzoB2C - a.prezzoB2C
      }
    })
  }, [servizi, search, sortBy, classeFilter, areaFilter, statoFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || classeFilter !== '' || areaFilter !== '' || statoFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setClasseFilter(''); setAreaFilter(''); setStatoFilter('') }

  const total = displayed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => { setPage(1) }, [search, sortBy, classeFilter, areaFilter, statoFilter, pageSize])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, total)
  const paged = displayed.slice(pageStart, pageEnd)

  const confirmDelete = () => {
    if (deletingId == null) return
    removeServizio(deletingId)
    setDeletingId(null)
  }

  return (
    <div className="miei-servizi">
      <BtnBack />
      <PageHeader
        title="I miei servizi"
        subtitle="Catalogo dei servizi della tua struttura, con stato di approvazione e gestione dei prezzi"
      />

      {(inAttesa > 0 || rifiutati > 0) && (
        <div className="miei-servizi__banner">
          {inAttesa > 0 && <span><i className="fa-duotone fa-clock" /> {inAttesa} in attesa di approvazione</span>}
          {rifiutati > 0 && <span className="miei-servizi__banner--ko"><i className="fa-duotone fa-circle-xmark" /> {rifiutati} rifiutati — leggi la motivazione e ri-sottoponi</span>}
        </div>
      )}

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca servizio, classe, area…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('crea-servizio')}>
            <Ico n="plus" s={12} c="#fff" />
            Crea servizio
          </button>
        }
        filterPanel={
          <>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ordina per</legend>
              <div className="page-toolbar__filter-options">
                {SORT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="page-toolbar__filter-option">
                    <input type="radio" name="servizi-sortBy" value={opt.value} checked={sortBy === opt.value} onChange={() => setSortBy(opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Stato</legend>
              <select className="sib-select" value={statoFilter} onChange={(e) => setStatoFilter(e.target.value as '' | StatoServizio)}>
                <option value="">Tutti gli stati</option>
                <option value="in-attesa">In attesa di approvazione</option>
                <option value="approvato">Approvato</option>
                <option value="rifiutato">Rifiutato</option>
              </select>
            </fieldset>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Area</legend>
              <select className="sib-select" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                <option value="">Tutte le aree</option>
                {aree.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </fieldset>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Classe</legend>
              <select className="sib-select" value={classeFilter} onChange={(e) => setClasseFilter(e.target.value)}>
                <option value="">Tutte le classi</option>
                {classi.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </fieldset>
          </>
        }
      />

      <div className="miei-servizi__count">
        {total} servizi{total !== servizi.length && ` su ${servizi.length}`}
      </div>

      {total === 0 ? (
        <div className="miei-servizi__empty">Nessun servizio trovato con i filtri selezionati.</div>
      ) : (
        <div className="sib-table-wrap">
          <table className="sib-table miei-servizi__table">
            <thead>
              <tr>
                <th>Servizio</th>
                <th>Area</th>
                <th>Classe</th>
                <th>Prezzo B2C</th>
                <th>Prezzo B2B</th>
                <th>Approvazione</th>
                <th>Attivo</th>
                <th className="miei-servizi__th-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => {
                const st = statoOf(s)
                const meta = STATO_SERVIZIO_META[st]
                return (
                  <tr key={s.id} className={s.attivo ? '' : 'miei-servizi__row--off'}>
                    <td>
                      <div className="miei-servizi__name">{s.nome}</div>
                      {s.descrizione && <div className="miei-servizi__sub">{s.descrizione}</div>}
                      {st === 'rifiutato' && s.motivazioneRifiuto && (
                        <div className="miei-servizi__motivo"><i className="fa-duotone fa-comment-dots" /> {s.motivazioneRifiuto}</div>
                      )}
                    </td>
                    <td>{s.area || '—'}</td>
                    <td>{s.classe || '—'}</td>
                    <td>{s.prezzoB2C > 0 ? <span className="miei-servizi__price">€ {s.prezzoB2C.toFixed(2)}</span> : <span className="miei-servizi__price miei-servizi__price--off">—</span>}</td>
                    <td>{s.prezzoB2B > 0 ? <span className="miei-servizi__price">€ {s.prezzoB2B.toFixed(2)}</span> : <span className="miei-servizi__price miei-servizi__price--off">—</span>}</td>
                    <td>
                      <span className={`miei-servizi__stato miei-servizi__stato--${meta.tone}`}>
                        <i className={`fa-duotone ${meta.icon}`} /> {meta.label}
                      </span>
                    </td>
                    <td>
                      <label className="miei-servizi__switch" title={s.attivo ? 'Disattiva' : 'Attiva'}>
                        <input type="checkbox" checked={s.attivo} onChange={() => toggleAttivo(s.id)} />
                        <span className="miei-servizi__switch-slider" />
                      </label>
                    </td>
                    <td className="miei-servizi__cell-actions">
                      <button type="button" className="miei-servizi__icon-btn" title={st === 'rifiutato' ? 'Modifica e ri-sottometti' : 'Modifica'} onClick={() => navigate(`crea-servizio:${s.id}`)}>
                        <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                      </button>
                      <button type="button" className="miei-servizi__icon-btn miei-servizi__icon-btn--danger" title="Elimina" onClick={() => setDeletingId(s.id)}>
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

      {total > 0 && (
        <Pagination
          page={page} totalPages={totalPages} pageStart={pageStart} pageEnd={pageEnd}
          total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize}
        />
      )}

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina servizio"
        itemName={servizi.find((s) => s.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
