import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Ico from '../../../core/icons/Ico'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import ProdottoModal from '../../../admin/SibyllaAdminPanel/modals/ProdottoModal/ProdottoModal'
import ConfirmDeleteModal from '../../../admin/SibyllaAdminPanel/modals/ConfirmDeleteModal/ConfirmDeleteModal'
import ProdottoPreviewModal from './ProdottoPreviewModal'
import { UNITA_MISURA_OPTIONS } from '../../../admin/SibyllaAdminPanel/catalogo/mockData'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import type {
  Prodotto, ProdottoForm,
} from '../../../admin/SibyllaAdminPanel/catalogo/types'
import './ListaProdotti.css'

const EMPTY_FORM: ProdottoForm = {
  barcode: '', nome: '', descrizione: '', categoriaId: '', fornitoreId: '',
  prezzoBase: '', unita: 'pz', quantitaUnita: '1', immagineUrl: '', scortaMinima: '0', attivo: true,
  agoraAbilitato: false, agoraPrezzo: '',
  networkAbilitato: true, networkPrezzo: '',
}

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'cat-asc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'cat-asc',    label: 'Categoria (A → Z)' },
  { value: 'price-asc',  label: 'Prezzo crescente' },
  { value: 'price-desc', label: 'Prezzo decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25

export default function ListaProdotti({ navigate }: { navigate: (p: string) => void }) {
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const categorie = useCatalogoStore(s => s.categorie)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const addProdotto    = useCatalogoStore(s => s.addProdotto)
  const updateProdotto = useCatalogoStore(s => s.updateProdotto)
  const removeProdotto = useCatalogoStore(s => s.removeProdotto)
  const toggleProdottoAttivo = useCatalogoStore(s => s.toggleProdottoAttivo)
  const isBarcodeUsed = useCatalogoStore(s => s.isBarcodeUsed)

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [categoriaFilter, setCategoriaFilter] = useState<string>('')
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState<number>(1)

  const [editing, setEditing] = useState<Prodotto | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ProdottoForm>(EMPTY_FORM)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<Prodotto | null>(null)

  const categoriaById  = (id: string) => categorie.find(c => c.id === id)
  const fornitoreById  = (id: string) => fornitori.find(f => f.id === id)
  const unitaLabel     = (u: string) => UNITA_MISURA_OPTIONS.find(o => o.value === u)?.label || u

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = prodotti.filter(p => {
      if (categoriaFilter && p.categoriaId !== categoriaFilter) return false
      if (!q) return true
      const cn = categoriaById(p.categoriaId)?.nome.toLowerCase() ?? ''
      const fn = fornitoreById(p.fornitoreId)?.nome.toLowerCase() ?? ''
      return (
        p.nome.toLowerCase().includes(q) ||
        p.descrizione.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        cn.includes(q) || fn.includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.nome.localeCompare(b.nome)
        case 'name-desc':  return b.nome.localeCompare(a.nome)
        case 'price-asc':  return a.prezzoBase - b.prezzoBase
        case 'price-desc': return b.prezzoBase - a.prezzoBase
        case 'cat-asc': {
          const an = categoriaById(a.categoriaId)?.nome ?? ''
          const bn = categoriaById(b.categoriaId)?.nome ?? ''
          return an.localeCompare(bn) || a.nome.localeCompare(b.nome)
        }
      }
    })
    // categoriaById e fornitoreById sono pure (derivati da prodotti/categorie/fornitori)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prodotti, categorie, fornitori, search, sortBy, categoriaFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || categoriaFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setCategoriaFilter('') }

  // Paginazione: reset alla pagina 1 quando i dati derivati cambiano per non
  // restare bloccati su una pagina vuota dopo filtri/ricerca/ordinamento.
  const total = displayed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, categoriaFilter, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageStart = (page - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, total)
  const paged = displayed.slice(pageStart, pageEnd)

  const openCreate = () => navigate('crea-prodotto')

  const openEdit = (p: Prodotto) => {
    setEditing(p)
    setForm({
      barcode: p.barcode,
      nome: p.nome,
      descrizione: p.descrizione,
      categoriaId: p.categoriaId,
      fornitoreId: p.fornitoreId,
      prezzoBase: String(p.prezzoBase),
      unita: p.unita,
      quantitaUnita: String(p.quantitaUnita),
      immagineUrl: p.immagineUrl,
      scortaMinima: String(p.scortaMinima),
      attivo: p.attivo,
      agoraAbilitato: p.mercati.agora.abilitato,
      agoraPrezzo: p.mercati.agora.prezzoVendita ? String(p.mercati.agora.prezzoVendita) : '',
      networkAbilitato: p.mercati.network.abilitato,
      networkPrezzo: p.mercati.network.prezzoVendita ? String(p.mercati.network.prezzoVendita) : '',
    })
    setShowModal(true)
  }

  const confirmEdit = () => {
    const code = form.barcode.trim()
    const prezzoBase = parseFloat(form.prezzoBase)
    if (!form.nome.trim() || !form.categoriaId || !form.fornitoreId) return
    if (!code || isNaN(prezzoBase)) return
    if (isBarcodeUsed(code, editing?.id)) return
    if (!form.agoraAbilitato && !form.networkAbilitato) return

    const agoraPr = parseFloat(form.agoraPrezzo)
    const networkPr = parseFloat(form.networkPrezzo)
    if (form.agoraAbilitato && (isNaN(agoraPr) || agoraPr <= 0)) return
    if (form.networkAbilitato && (isNaN(networkPr) || networkPr <= 0)) return

    const data: Omit<Prodotto, 'id'> = {
      barcode: code,
      nome: form.nome,
      descrizione: form.descrizione,
      categoriaId: form.categoriaId,
      fornitoreId: form.fornitoreId,
      prezzoBase,
      unita: form.unita,
      quantitaUnita: parseFloat(form.quantitaUnita) || 1,
      immagineUrl: form.immagineUrl,
      scortaMinima: parseInt(form.scortaMinima) || 0,
      attivo: form.attivo,
      pubblicato: editing?.pubblicato ?? false,
      mercati: {
        agora:   { abilitato: form.agoraAbilitato,   prezzoVendita: form.agoraAbilitato ? agoraPr : 0 },
        network: { abilitato: form.networkAbilitato, prezzoVendita: form.networkAbilitato ? networkPr : 0 },
      },
    }
    if (editing) updateProdotto(editing.id, data)
    else addProdotto(data)
    setShowModal(false)
  }

  const confirmDelete = () => {
    if (!deletingId) return
    removeProdotto(deletingId)
    setDeletingId(null)
  }

  return (
    <div className="lista-prodotti">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Lista prodotti"
        subtitle="Tutti i prodotti del catalogo merceologico, con modifica e gestione dei prezzi"
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca prodotto, fornitore, barcode…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={openCreate}>
            <Ico n="plus" s={12} c="#fff" />
            Crea prodotto
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
                      name="prodotti-sortBy"
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
              <legend className="page-toolbar__filter-label">Categoria</legend>
              <select
                className="sib-select"
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
              >
                <option value="">Tutte le categorie</option>
                {categorie.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </fieldset>
          </>
        }
      />

      <div className="lista-prodotti__count">
        {total} prodotti{total !== prodotti.length && ` su ${prodotti.length}`}
      </div>

      {total === 0 ? (
        <div className="lista-prodotti__empty">Nessun prodotto trovato con i filtri selezionati.</div>
      ) : (
        <div className="sib-table-wrap">
          <table className="sib-table lista-prodotti__table">
            <thead>
              <tr>
                <th style={{ width: 56 }}></th>
                <th>Prodotto</th>
                <th>Categoria</th>
                <th>Fornitore</th>
                <th>Prezzo base</th>
                <th>Agorà</th>
                <th>Network</th>
                <th>Stato</th>
                <th className="lista-prodotti__th-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(p => {
                const cat = categoriaById(p.categoriaId)
                const forn = fornitoreById(p.fornitoreId)
                return (
                  <tr key={p.id} className={p.attivo ? '' : 'lista-prodotti__row--off'}>
                    <td>
                      <div className="lista-prodotti__thumb">
                        {p.immagineUrl
                          ? <img src={p.immagineUrl} alt={p.nome} />
                          : <Ico n="image" s={16} c="var(--color-text-disabled)" />}
                      </div>
                    </td>
                    <td>
                      <div className="lista-prodotti__name">{p.nome}</div>
                      <div className="lista-prodotti__sub">
                        <code>{p.barcode || '—'}</code> · {p.quantitaUnita} {unitaLabel(p.unita).split(' ')[0].toLowerCase()}
                      </div>
                    </td>
                    <td>{cat?.nome ?? '—'}</td>
                    <td>{forn?.nome ?? '—'}</td>
                    <td>€ {p.prezzoBase.toFixed(2)}</td>
                    <td>
                      {p.mercati.agora.abilitato
                        ? <span className="lista-prodotti__price">€ {p.mercati.agora.prezzoVendita.toFixed(2)}</span>
                        : <span className="lista-prodotti__price lista-prodotti__price--off">—</span>}
                    </td>
                    <td>
                      {p.mercati.network.abilitato
                        ? <span className="lista-prodotti__price">€ {p.mercati.network.prezzoVendita.toFixed(2)}</span>
                        : <span className="lista-prodotti__price lista-prodotti__price--off">—</span>}
                    </td>
                    <td>
                      <label className="lista-prodotti__switch" title={p.attivo ? 'Disattiva' : 'Attiva'}>
                        <input
                          type="checkbox"
                          checked={p.attivo}
                          onChange={() => toggleProdottoAttivo(p.id)}
                        />
                        <span className="lista-prodotti__switch-slider" />
                      </label>
                    </td>
                    <td className="lista-prodotti__cell-actions">
                      <button
                        type="button"
                        className="lista-prodotti__icon-btn"
                        title="Anteprima"
                        aria-label="Anteprima prodotto"
                        onClick={() => setPreviewing(p)}
                      >
                        <Ico n="eye" s={13} c="var(--color-text-inactive)" />
                      </button>
                      <button
                        type="button"
                        className="lista-prodotti__icon-btn"
                        title="Modifica"
                        onClick={() => openEdit(p)}
                      >
                        <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                      </button>
                      <button
                        type="button"
                        className="lista-prodotti__icon-btn lista-prodotti__icon-btn--danger"
                        title="Elimina"
                        onClick={() => setDeletingId(p.id)}
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

      <ProdottoModal
        open={showModal}
        editing={editing}
        form={form}
        setForm={setForm}
        categorie={categorie}
        fornitori={fornitori}
        onClose={() => setShowModal(false)}
        onConfirm={confirmEdit}
        isBarcodeUsed={isBarcodeUsed}
      />

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina prodotto"
        itemName={prodotti.find(p => p.id === deletingId)?.nome || ''}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />

      <ProdottoPreviewModal
        open={previewing !== null}
        prodotto={previewing}
        categorie={categorie}
        fornitori={fornitori}
        onClose={() => setPreviewing(null)}
      />
    </div>
  )
}
