import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { Icon } from '../_shared/Icon'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import { Breadcrumb } from '../_shared/Breadcrumb'
import { getCategoria, areeOf, classeSlug, type Area } from '../../../admin/SibyllaAdminPanel/catalogo/classificazione'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import './DettaglioAreaMerceologica.sass'

interface Props {
  navigate: (p: string) => void
  categoriaId: string
}

type AreaFilter = 'tutte' | Area
type SortKey = 'name-asc' | 'name-desc' | 'tip-desc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',  label: 'Nome (A → Z)' },
  { value: 'name-desc', label: 'Nome (Z → A)' },
  { value: 'tip-desc',  label: 'Più tipologie prima' },
]

const DEFAULT_SORT: SortKey = 'name-asc'

export default function DettaglioAreaMerceologica({ navigate, categoriaId }: Props) {
  const categoria = getCategoria(categoriaId)
  const prodotti = useCatalogoStore(s => s.prodotti)
  const countClasse = (classeNome: string) =>
    prodotti.filter(p => p.categoriaId === categoriaId && p.classe === classeNome && p.attivo && p.mercati.agora.abilitato).length

  const [view, setView]     = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [area, setArea]     = useState<AreaFilter>('tutte')

  const aree = categoria ? areeOf(categoria) : []
  const hasBothAree = aree.length > 1

  const displayed = useMemo(() => {
    if (!categoria) return []
    const q = search.trim().toLowerCase()
    const filtered = categoria.classi.filter(cl => {
      if (area !== 'tutte' && cl.area !== area) return false
      if (q === '') return true
      return (
        cl.nome.toLowerCase().includes(q) ||
        cl.tipologie.some(t => t.toLowerCase().includes(q))
      )
    })
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':  return a.nome.localeCompare(b.nome)
        case 'name-desc': return b.nome.localeCompare(a.nome)
        case 'tip-desc':  return b.tipologie.length - a.tipologie.length
      }
    })
  }, [categoria, search, sortBy, area])

  const filtersDirty = sortBy !== DEFAULT_SORT || area !== 'tutte'
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setArea('tutte') }

  if (!categoria) {
    return (
      <div className="dettaglio-area-merceologica">
        <BtnBack onClick={() => navigate('area-merceologica')} />
        <PageHeader title="Categoria non trovata" subtitle="La categoria richiesta non è disponibile." />
      </div>
    )
  }

  return (
    <div className="dettaglio-area-merceologica">
      <BtnBack onClick={() => navigate('area-merceologica')} />
      <Breadcrumb
        navigate={navigate}
        items={[
          { label: 'Area merceologica', page: 'area-merceologica' },
          { label: categoria.nome },
        ]}
      />
      <PageHeader
        eyebrow={`Categoria · ${categoria.classi.length} ${categoria.classi.length === 1 ? 'classe' : 'classi'}`}
        title={categoria.nome}
        subtitle="Seleziona una classe per vederne le tipologie e i prodotti acquistabili"
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca classe o tipologia…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
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

            {hasBothAree && (
              <fieldset className="page-toolbar__filter-section">
                <legend className="page-toolbar__filter-label">Area</legend>
                <div className="page-toolbar__filter-options">
                  {(['tutte', 'Prodotti', 'Servizi'] as AreaFilter[]).map(a => (
                    <label key={a} className="page-toolbar__filter-option">
                      <input
                        type="radio"
                        name="dam-area"
                        value={a}
                        checked={area === a}
                        onChange={() => setArea(a)}
                      />
                      <span>{a === 'tutte' ? 'Tutte' : a}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        }
      />

      <div className="dam__count">
        {displayed.length} {displayed.length === 1 ? 'classe' : 'classi'}
        {displayed.length !== categoria.classi.length && ` su ${categoria.classi.length}`}
      </div>

      {displayed.length === 0 ? (
        <div className="dam__empty">
          Nessuna classe disponibile per i filtri selezionati.
        </div>
      ) : (
        <div className={`dam__grid${view === 'list' ? ' dam__grid--list' : ''}`}>
          {displayed.map((cl) => {
            const n = countClasse(cl.nome)
            return (
              <button
                key={cl.nome}
                type="button"
                className="dam-classe-card"
                onClick={() => navigate(`prodotti-classe:${categoriaId}__${classeSlug(cl.nome)}`)}
              >
                <div className="dam-classe-card__head">
                  <h3 className="dam-classe-card__title">{cl.nome}</h3>
                  <span className={`am-area-tag am-area-tag--${cl.area === 'Prodotti' ? 'prodotti' : 'servizi'}`}>
                    {cl.area}
                  </span>
                </div>

                {cl.tipologie.length > 0 ? (
                  <ul className="dam-classe-card__tipologie">
                    {cl.tipologie.map(t => (
                      <li key={t} className="dam-classe-card__tip">{t}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="dam-classe-card__empty">Nessuna tipologia specificata</p>
                )}

                <div className="dam-classe-card__foot">
                  <span className="dam-classe-card__count">{n} {n === 1 ? 'prodotto' : 'prodotti'}</span>
                  <span className="dam-classe-card__link">
                    Vedi prodotti
                    <Icon family="regular" name="arrow-right" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
