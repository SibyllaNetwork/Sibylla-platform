import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import { useCartStore } from '../../../store/useCartStore'
import { UNITA_MISURA_OPTIONS } from '../../../admin/SibyllaAdminPanel/catalogo/mockData'
import './DettaglioAreaMerceologica.sass'

interface Props {
  navigate: (p: string) => void
  categoriaId: string
}

type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'price-asc',  label: 'Prezzo crescente' },
  { value: 'price-desc', label: 'Prezzo decrescente' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

export default function DettaglioAreaMerceologica({ navigate, categoriaId }: Props) {
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const fornitori = useCatalogoStore(s => s.fornitori)
  const categorie = useCatalogoStore(s => s.categorie)
  const addProduct  = useCartStore(s => s.addProduct)
  const totaleItems = useCartStore(s => s.totaleItems())

  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [fornitoreFilter, setFornitoreFilter] = useState<string>('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const categoria = categorie.find(c => c.id === categoriaId)
  const fornitoreById = (id: string) => fornitori.find(f => f.id === id)
  const unitaLabel    = (u: string) => UNITA_MISURA_OPTIONS.find(o => o.value === u)?.label || u

  const prodottiCategoria = useMemo(() => {
    return prodotti.filter(p => p.categoriaId === categoriaId && p.attivo && p.mercati.agora.abilitato)
  }, [prodotti, categoriaId])

  const fornitoriCategoria = useMemo(() => {
    const ids = new Set(prodottiCategoria.map(p => p.fornitoreId))
    return fornitori.filter(f => ids.has(f.id))
  }, [prodottiCategoria, fornitori])

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = prodottiCategoria.filter(p => {
      if (fornitoreFilter && p.fornitoreId !== fornitoreFilter) return false
      if (!q) return true
      const fn = fornitoreById(p.fornitoreId)?.nome.toLowerCase() ?? ''
      return (
        p.nome.toLowerCase().includes(q) ||
        p.descrizione.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        fn.includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.nome.localeCompare(b.nome)
        case 'name-desc':  return b.nome.localeCompare(a.nome)
        case 'price-asc':  return a.mercati.agora.prezzoVendita - b.mercati.agora.prezzoVendita
        case 'price-desc': return b.mercati.agora.prezzoVendita - a.mercati.agora.prezzoVendita
      }
    })
  }, [prodottiCategoria, fornitori, search, sortBy, fornitoreFilter])

  const filtersDirty = sortBy !== DEFAULT_SORT || fornitoreFilter !== ''
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setFornitoreFilter('') }

  const updateQty = (id: string, delta: number) => {
    setQty(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }))
  }

  const handleAddToCart = (prodottoId: string) => {
    const p = prodotti.find(x => x.id === prodottoId)
    if (!p) return
    const quantita = qty[prodottoId] || 1
    if (quantita <= 0) return
    const forn = fornitoreById(p.fornitoreId)
    addProduct({
      id: p.id,
      prodottoId: p.id,
      barcode: p.barcode,
      categoriaId: p.categoriaId,
      fornitoreId: p.fornitoreId,
      fornitoreNome: forn?.nome ?? '—',
      nome: p.nome,
      descrizione: p.descrizione,
      immagineUrl: p.immagineUrl,
      unita: p.unita,
      quantitaUnita: p.quantitaUnita,
      prezzoUnitario: p.mercati.agora.prezzoVendita,
      mercato: 'agora',
    }, quantita)
    setQty(prev => ({ ...prev, [prodottoId]: 0 }))
    setJustAdded(prodottoId)
    window.setTimeout(() => setJustAdded(curr => (curr === prodottoId ? null : curr)), 1800)
  }

  return (
    <div className="dettaglio-area-merceologica">
      <BtnBack onClick={() => navigate('area-merceologica')} />
      <PageHeader
        title={categoria?.nome ?? 'Area merceologica'}
        subtitle={categoria?.descrizione ?? 'Dettaglio dei prodotti acquistabili su Agorà'}
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca prodotto, fornitore, barcode…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button
            type="button"
            className="sib-btn sib-btn--ghost dam__cart-btn"
            onClick={() => navigate('agora-cart')}
            aria-label="Vai al carrello"
          >
            <Icon family="regular" name="cart-shopping" />
            Carrello
            {totaleItems > 0 && <span className="dam__cart-count">{totaleItems}</span>}
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
                      name="dam-sortBy"
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
              <legend className="page-toolbar__filter-label">Fornitore</legend>
              <select
                className="sib-select"
                value={fornitoreFilter}
                onChange={(e) => setFornitoreFilter(e.target.value)}
              >
                <option value="">Tutti i fornitori</option>
                {fornitoriCategoria.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </fieldset>
          </>
        }
      />

      <div className="dam__count">
        {displayed.length} prodotti{displayed.length !== prodottiCategoria.length && ` su ${prodottiCategoria.length}`}
      </div>

      {displayed.length === 0 ? (
        <div className="dam__empty">
          Nessun prodotto disponibile per i filtri selezionati.
        </div>
      ) : (
        <div className={`dam__grid${view === 'list' ? ' dam__grid--list' : ''}`}>
          {displayed.map(p => {
            const forn = fornitoreById(p.fornitoreId)
            const currentQty = qty[p.id] || 0
            const isAdded = justAdded === p.id
            const prezzo = p.mercati.agora.prezzoVendita
            return (
              <article key={p.id} className="dam-card">
                <div className="dam-card__image-wrap">
                  {p.immagineUrl
                    ? <img src={p.immagineUrl} alt={p.nome} className="dam-card__image" />
                    : <div className="dam-card__image dam-card__image--placeholder">
                        <Ico n="image" s={28} c="var(--color-text-disabled)" />
                      </div>}
                </div>

                <div className="dam-card__body">
                  <h3 className="dam-card__title">{p.nome}</h3>
                  <p className="dam-card__desc">{p.descrizione || '—'}</p>

                  <dl className="dam-card__meta">
                    <div className="dam-card__meta-row">
                      <dt>Formato</dt>
                      <dd>{p.quantitaUnita} {unitaLabel(p.unita).toLowerCase()}</dd>
                    </div>
                    <div className="dam-card__meta-row">
                      <dt>Barcode</dt>
                      <dd><code>{p.barcode || '—'}</code></dd>
                    </div>
                    <div className="dam-card__meta-row">
                      <dt>Produttore</dt>
                      <dd>
                        {forn
                          ? <button
                              type="button"
                              className="dam-card__supplier-link"
                              onClick={() => navigate('lista-fornitori')}
                              title="Vai alla scheda fornitore"
                            >
                              {forn.nome}
                              <Icon family="regular" name="arrow-up-right-from-square" />
                            </button>
                          : '—'}
                        {forn?.sito && (
                          <a
                            className="dam-card__supplier-site"
                            href={forn.sito.startsWith('http') ? forn.sito : `https://${forn.sito}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            sito web
                          </a>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="dam-card__buy">
                  <div className="dam-card__price-block">
                    <span className="dam-card__price-label">Prezzo Agorà</span>
                    <span className="dam-card__price">€ {prezzo.toFixed(2)}</span>
                    <span className="dam-card__price-note">configurato nel pannello Agorà</span>
                  </div>

                  <div className="dam-card__qty">
                    <button
                      type="button"
                      className="dam-card__qty-btn"
                      onClick={() => updateQty(p.id, -1)}
                      aria-label="Diminuisci quantità"
                      disabled={currentQty <= 0}
                    >
                      <Icon family="regular" name="minus" />
                    </button>
                    <span className="dam-card__qty-value">{currentQty}</span>
                    <button
                      type="button"
                      className="dam-card__qty-btn"
                      onClick={() => updateQty(p.id, 1)}
                      aria-label="Aumenta quantità"
                    >
                      <Icon family="regular" name="plus" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`sib-btn sib-btn--primary dam-card__add${isAdded ? ' dam-card__add--ok' : ''}`}
                    onClick={() => handleAddToCart(p.id)}
                    disabled={currentQty <= 0}
                  >
                    {isAdded
                      ? <>
                          <Ico n="check" s={12} c="#fff" />
                          Aggiunto
                        </>
                      : <>
                          <Icon family="regular" name="cart-plus" />
                          Aggiungi al carrello
                        </>}
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
