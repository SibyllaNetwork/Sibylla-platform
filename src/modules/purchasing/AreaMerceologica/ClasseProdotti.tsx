import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { Icon } from '../_shared/Icon'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import { Breadcrumb } from '../_shared/Breadcrumb'
import { getClasse } from '../../../admin/SibyllaAdminPanel/catalogo/classificazione'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import { useCartStore } from '../../../store/useCartStore'
import type { Prodotto } from '../../../admin/SibyllaAdminPanel/catalogo/types'
import './ClasseProdotti.sass'

interface Props {
  navigate: (p: string) => void
  categoriaId: string
  classeSlug: string
}

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',  label: 'Nome (A → Z)' },
  { value: 'name-desc', label: 'Nome (Z → A)' },
  { value: 'price-asc', label: 'Prezzo crescente' },
  { value: 'price-desc', label: 'Prezzo decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

export default function ClasseProdotti({ navigate, categoriaId, classeSlug }: Props) {
  const found = getClasse(categoriaId, classeSlug)
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const addProduct  = useCartStore(s => s.addProduct)
  const totaleItems = useCartStore(s => s.totaleItems())

  const [view, setView]   = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [tipologia, setTipologia] = useState<string>('')
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const fornitoreNome = (id: string) => fornitori.find(f => f.id === id)?.nome ?? '—'

  const base = useMemo(() => {
    if (!found) return []
    return prodotti.filter(p =>
      p.categoriaId === categoriaId &&
      p.classe === found.classe.nome &&
      p.attivo && p.mercati.agora.abilitato,
    )
  }, [prodotti, categoriaId, found])

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = base.filter(p => {
      if (tipologia && p.tipologia !== tipologia) return false
      if (!q) return true
      return p.nome.toLowerCase().includes(q) || p.descrizione.toLowerCase().includes(q) || p.barcode.includes(q)
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.nome.localeCompare(b.nome)
        case 'name-desc':  return b.nome.localeCompare(a.nome)
        case 'price-asc':  return a.mercati.agora.prezzoVendita - b.mercati.agora.prezzoVendita
        case 'price-desc': return b.mercati.agora.prezzoVendita - a.mercati.agora.prezzoVendita
      }
    })
  }, [base, search, sortBy, tipologia])

  const filtersDirty = sortBy !== DEFAULT_SORT || tipologia !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setTipologia('') }

  const handleAdd = (p: Prodotto) => {
    addProduct({
      id: p.id,
      prodottoId: p.id,
      barcode: p.barcode,
      categoriaId: p.categoriaId,
      fornitoreId: p.fornitoreId,
      fornitoreNome: fornitoreNome(p.fornitoreId),
      nome: p.nome,
      descrizione: p.descrizione,
      immagineUrl: p.immagineUrl,
      unita: p.unita,
      quantitaUnita: p.quantitaUnita,
      prezzoUnitario: p.mercati.agora.prezzoVendita,
      mercato: 'agora',
    }, 1)
    setJustAdded(p.id)
    window.setTimeout(() => setJustAdded(curr => (curr === p.id ? null : curr)), 1600)
  }

  if (!found) {
    return (
      <div className="classe-prodotti">
        <BtnBack onClick={() => navigate('area-merceologica')} />
        <PageHeader title="Classe non trovata" subtitle="La classe richiesta non è disponibile." />
      </div>
    )
  }

  const { categoria, classe } = found
  const tipologie = classe.tipologie

  return (
    <div className="classe-prodotti">
      <BtnBack onClick={() => navigate(`dettaglio-area-merceologica:${categoriaId}`)} />
      <Breadcrumb
        navigate={navigate}
        items={[
          { label: 'Area merceologica', page: 'area-merceologica' },
          { label: categoria.nome, page: `dettaglio-area-merceologica:${categoriaId}` },
          { label: classe.nome },
        ]}
      />
      <PageHeader
        eyebrow={`Classe · ${classe.area}`}
        title={classe.nome}
        subtitle={`${categoria.nome} · prodotti acquistabili su Agorà`}
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca prodotto…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button
            type="button"
            className="sib-btn sib-btn--ghost cp__cart-btn"
            onClick={() => navigate('catalogo-cart')}
            aria-label="Vai al carrello"
          >
            <Icon family="regular" name="cart-shopping" />
            Carrello
            {totaleItems > 0 && <span className="cp__cart-count">{totaleItems}</span>}
          </button>
        }
        filterPanel={
          <>
            <fieldset className="page-toolbar__filter-section">
              <legend className="page-toolbar__filter-label">Ordina per</legend>
              <div className="page-toolbar__filter-options">
                {SORT_OPTIONS.map(opt => (
                  <label key={opt.value} className="page-toolbar__filter-option">
                    <input type="radio" name="cp-sort" value={opt.value} checked={sortBy === opt.value} onChange={() => setSortBy(opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {tipologie.length > 0 && (
              <fieldset className="page-toolbar__filter-section">
                <legend className="page-toolbar__filter-label">Tipologia</legend>
                <div className="page-toolbar__filter-options">
                  <label className="page-toolbar__filter-option">
                    <input type="radio" name="cp-tip" value="" checked={tipologia === ''} onChange={() => setTipologia('')} />
                    <span>Tutte</span>
                  </label>
                  {tipologie.map(t => (
                    <label key={t} className="page-toolbar__filter-option">
                      <input type="radio" name="cp-tip" value={t} checked={tipologia === t} onChange={() => setTipologia(t)} />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        }
      />

      <div className="cp__count">
        {displayed.length} {displayed.length === 1 ? 'prodotto' : 'prodotti'}
        {displayed.length !== base.length && ` su ${base.length}`}
      </div>

      {displayed.length === 0 ? (
        <div className="cp__empty">Nessun prodotto disponibile per questa classe.</div>
      ) : (
        <div className={`cp__grid${view === 'list' ? ' cp__grid--list' : ''}`}>
          {displayed.map(p => {
            const isAdded = justAdded === p.id
            return (
              <article key={p.id} className="cp-card">
                <button type="button" className="cp-card__main" onClick={() => navigate(`prodotto:${p.id}`)}>
                  <div className="cp-card__image">
                    {p.immagineUrl
                      ? <img src={p.immagineUrl} alt={p.nome} />
                      : <span className="cp-card__image-ph"><Icon family="light" name="image" /></span>}
                  </div>
                  <div className="cp-card__body">
                    {p.tipologia && <span className="cp-card__tip">{p.tipologia}</span>}
                    <h3 className="cp-card__title">{p.nome}</h3>
                    <p className="cp-card__desc">{p.descrizione}</p>
                    <p className="cp-card__supplier">{fornitoreNome(p.fornitoreId)}</p>
                  </div>
                </button>
                <div className="cp-card__buy">
                  <span className="cp-card__price">€ {p.mercati.agora.prezzoVendita.toFixed(2)}</span>
                  <button
                    type="button"
                    className={`sib-btn sib-btn--primary cp-card__add${isAdded ? ' cp-card__add--ok' : ''}`}
                    onClick={() => handleAdd(p)}
                  >
                    {isAdded
                      ? <><Icon family="regular" name="check" /> Aggiunto</>
                      : <><Icon family="regular" name="cart-plus" /> Aggiungi</>}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
