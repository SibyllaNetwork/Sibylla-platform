import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Ico from '../../../../core/icons/Ico'
import { PageToolbar, type ViewMode } from '../../../purchasing/_shared/PageToolbar'
import ConfirmDeleteModal from '../../../../admin/SibyllaAdminPanel/modals/ConfirmDeleteModal/ConfirmDeleteModal'
import { apiFetchSibylla } from '../../../../services/api'
import './IMieiServizi.css'

/**
 * I miei servizi — replica `Views/Servizi/Servizi.cshtml` con look-and-feel
 * allineato a Lista prodotti (PageToolbar, tabella, toggle, paginazione).
 */

interface Servizio {
  id: number
  nome: string
  descrizione: string
  prezzo_b2b: number
  prezzo_b2c: number
  classe: string
  area: string
  attivo: boolean
}

const FALLBACK: Servizio[] = [
  { id: 1, nome: 'Colazione',          descrizione: 'Buffet incluso',     prezzo_b2c: 15, prezzo_b2b: 12, classe: 'F&B',         area: 'Ristorazione e Cibo',                  attivo: true  },
  { id: 2, nome: 'Spa - Massaggio 60', descrizione: 'Massaggio relax',     prezzo_b2c: 80, prezzo_b2b: 65, classe: 'Fitness',     area: 'Servizi per il Benessere e la Salute', attivo: true  },
  { id: 3, nome: 'Transfer aeroporto', descrizione: 'A/R berlina',         prezzo_b2c: 60, prezzo_b2b: 50, classe: 'NCC',         area: 'Trasferimenti',                        attivo: true  },
  { id: 4, nome: 'Tour cantina',       descrizione: 'Visita+degustazione', prezzo_b2c: 45, prezzo_b2b: 38, classe: 'Tours',       area: 'Intrattenimento e Ricreazione',        attivo: false },
  { id: 5, nome: 'Babysitter sera',    descrizione: 'Servizio 4h',         prezzo_b2c: 50, prezzo_b2b: 40, classe: 'Servizio di babysitter', area: 'Servizi per Famiglie e Bambini',   attivo: true  },
  { id: 6, nome: 'Facchinaggio',       descrizione: 'Trasporto bagagli',   prezzo_b2c: 12, prezzo_b2b: 9,  classe: 'Facchinaggio', area: 'Facchinaggio',                         attivo: true  },
]

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'classe-asc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',    label: 'Nome (A → Z)' },
  { value: 'name-desc',   label: 'Nome (Z → A)' },
  { value: 'classe-asc',  label: 'Classe (A → Z)' },
  { value: 'price-asc',   label: 'Prezzo B2C crescente' },
  { value: 'price-desc',  label: 'Prezzo B2C decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25

export default function IMieiServizi({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Servizio[]>(FALLBACK)
  const [, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [classeFilter, setClasseFilter] = useState<string>('')
  const [areaFilter, setAreaFilter] = useState<string>('')

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState<number>(1)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Servizio[]>('servizi/GetServizi', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled) return
        // Normalizzazione campi mancanti (BE legacy senza area)
        const norm = (d || []).map((s, i) => ({
          id: s.id ?? i + 1,
          nome: s.nome ?? '',
          descrizione: s.descrizione ?? '',
          prezzo_b2b: Number(s.prezzo_b2b) || 0,
          prezzo_b2c: Number(s.prezzo_b2c) || 0,
          classe: s.classe ?? '',
          area: s.area ?? '',
          attivo: s.attivo ?? true,
        }))
        if (norm.length > 0) setItems(norm)
        setLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? 'Errore')
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  const classi = useMemo(
    () => Array.from(new Set(items.map((s) => s.classe).filter(Boolean))).sort(),
    [items],
  )
  const aree = useMemo(
    () => Array.from(new Set(items.map((s) => s.area).filter(Boolean))).sort(),
    [items],
  )

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = items.filter((s) => {
      if (classeFilter && s.classe !== classeFilter) return false
      if (areaFilter && s.area !== areaFilter) return false
      if (!q) return true
      return (
        s.nome.toLowerCase().includes(q) ||
        s.descrizione.toLowerCase().includes(q) ||
        s.classe.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':    return a.nome.localeCompare(b.nome)
        case 'name-desc':   return b.nome.localeCompare(a.nome)
        case 'classe-asc':  return a.classe.localeCompare(b.classe) || a.nome.localeCompare(b.nome)
        case 'price-asc':   return a.prezzo_b2c - b.prezzo_b2c
        case 'price-desc':  return b.prezzo_b2c - a.prezzo_b2c
      }
    })
  }, [items, search, sortBy, classeFilter, areaFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || classeFilter !== '' || areaFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setClasseFilter(''); setAreaFilter('') }

  // Paginazione
  const total = displayed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => { setPage(1) }, [search, sortBy, classeFilter, areaFilter, pageSize])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const pageStart = (page - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, total)
  const paged = displayed.slice(pageStart, pageEnd)

  const toggleAttivo = (id: number) =>
    setItems(items.map((s) => (s.id === id ? { ...s, attivo: !s.attivo } : s)))

  const confirmDelete = () => {
    if (deletingId == null) return
    setItems(items.filter((s) => s.id !== deletingId))
    setDeletingId(null)
  }

  return (
    <div className="miei-servizi">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="I miei servizi"
        subtitle="Catalogo dei servizi della tua struttura, con modifica e gestione dei prezzi"
      />

      {error && (
        <div className="miei-servizi__warn">
          Backend non raggiungibile — mostro dati di esempio. ({error})
        </div>
      )}

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca servizio, classe, area…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={() => navigate('crea-servizio')}
          >
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
                    <input
                      type="radio"
                      name="servizi-sortBy"
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
              <legend className="page-toolbar__filter-label">Area</legend>
              <select
                className="sib-select"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
              >
                <option value="">Tutte le aree</option>
                {aree.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </fieldset>

            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Classe</legend>
              <select
                className="sib-select"
                value={classeFilter}
                onChange={(e) => setClasseFilter(e.target.value)}
              >
                <option value="">Tutte le classi</option>
                {classi.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </fieldset>
          </>
        }
      />

      <div className="miei-servizi__count">
        {total} servizi{total !== items.length && ` su ${items.length}`}
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
                <th>Stato</th>
                <th className="miei-servizi__th-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => (
                <tr key={s.id} className={s.attivo ? '' : 'miei-servizi__row--off'}>
                  <td>
                    <div className="miei-servizi__name">{s.nome}</div>
                    {s.descrizione && (
                      <div className="miei-servizi__sub">{s.descrizione}</div>
                    )}
                  </td>
                  <td>{s.area || '—'}</td>
                  <td>{s.classe || '—'}</td>
                  <td>
                    {s.prezzo_b2c > 0
                      ? <span className="miei-servizi__price">€ {s.prezzo_b2c.toFixed(2)}</span>
                      : <span className="miei-servizi__price miei-servizi__price--off">—</span>}
                  </td>
                  <td>
                    {s.prezzo_b2b > 0
                      ? <span className="miei-servizi__price">€ {s.prezzo_b2b.toFixed(2)}</span>
                      : <span className="miei-servizi__price miei-servizi__price--off">—</span>}
                  </td>
                  <td>
                    <label className="miei-servizi__switch" title={s.attivo ? 'Disattiva' : 'Attiva'}>
                      <input
                        type="checkbox"
                        checked={s.attivo}
                        onChange={() => toggleAttivo(s.id)}
                      />
                      <span className="miei-servizi__switch-slider" />
                    </label>
                  </td>
                  <td className="miei-servizi__cell-actions">
                    <button
                      type="button"
                      className="miei-servizi__icon-btn"
                      title="Modifica"
                      onClick={() => navigate('crea-servizio')}
                    >
                      <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                    </button>
                    <button
                      type="button"
                      className="miei-servizi__icon-btn miei-servizi__icon-btn--danger"
                      title="Elimina"
                      onClick={() => setDeletingId(s.id)}
                    >
                      <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          pageStart={pageStart}
          pageEnd={pageEnd}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina servizio"
        itemName={items.find((s) => s.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

/* ============================================================
   Pagination — stesso pattern di Lista prodotti
   ============================================================ */

interface PaginationProps {
  page: number
  totalPages: number
  pageStart: number
  pageEnd: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}

function Pagination({
  page, totalPages, pageStart, pageEnd, total, pageSize, onPageChange, onPageSizeChange,
}: PaginationProps) {
  const pages: Array<number | 'ellipsis'> = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const out: Array<number | 'ellipsis'> = []
    out.push(1)
    const winStart = Math.max(2, page - 1)
    const winEnd = Math.min(totalPages - 1, page + 1)
    if (winStart > 2) out.push('ellipsis')
    for (let i = winStart; i <= winEnd; i++) out.push(i)
    if (winEnd < totalPages - 1) out.push('ellipsis')
    out.push(totalPages)
    return out
  }, [page, totalPages])

  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), totalPages))

  return (
    <nav className="miei-servizi__pagination" aria-label="Paginazione servizi">
      <div className="miei-servizi__pagination-info">
        Mostra <strong>{pageStart + 1}</strong>–<strong>{pageEnd}</strong> di <strong>{total}</strong>
      </div>

      <div className="miei-servizi__pagination-controls">
        <button
          type="button"
          className="miei-servizi__pagination-btn"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Pagina precedente"
        >
          <i className="fa-duotone fa-chevron-left text-[11px]" aria-hidden="true" />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="miei-servizi__pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`miei-servizi__pagination-btn miei-servizi__pagination-btn--num${p === page ? ' miei-servizi__pagination-btn--active' : ''}`}
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          className="miei-servizi__pagination-btn"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label="Pagina successiva"
        >
          <i className="fa-duotone fa-chevron-right text-[11px]" aria-hidden="true" />
        </button>
      </div>

      <label className="miei-servizi__pagination-size">
        Righe per pagina
        <select
          className="sib-select sib-select--dense"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </nav>
  )
}
