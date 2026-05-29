import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import { CategoryCard } from '../_shared/CategoryCard'
import { PageToolbar, type ViewMode } from '../_shared/PageToolbar'
import { useCatalogoStore } from '../../../store/useCatalogoStore'
import './AreaMerceologica.css'

interface CategoryEntry {
  id: number
  catId: string                 // id del store: 'newa-cat-N'
  name: string
  icon: string
  count: number
  description: string
}

const CATEGORIES_META: Array<Omit<CategoryEntry, 'count'>> = [
  { id: 1,  catId: 'newa-cat-1',  name: 'Alimenti, Ristorazione e Buoni Pasto',     icon: 'utensils',           description: 'Fornitori di prodotti alimentari e servizi di ristorazione' },
  { id: 2,  catId: 'newa-cat-2',  name: 'Energia, Carburanti e Lubrificanti',       icon: 'bolt',               description: 'Servizi energetici, carburanti e lubrificanti industriali' },
  { id: 3,  catId: 'newa-cat-3',  name: 'Cancelleria, Carta e Consumabili',         icon: 'file-lines',         description: 'Materiale da ufficio, carta e prodotti consumabili' },
  { id: 4,  catId: 'newa-cat-4',  name: 'Informatica, Elettronica e Macchinari',    icon: 'display',            description: 'Hardware, software e attrezzature tecnologiche' },
  { id: 5,  catId: 'newa-cat-5',  name: 'Editoria, Eventi e Comunicazione',         icon: 'shirt',              description: 'Servizi editoriali, organizzazione eventi e comunicazione' },
  { id: 6,  catId: 'newa-cat-6',  name: 'Lavori di Manutenzione',                   icon: 'wrench',             description: 'Servizi di manutenzione ordinaria e straordinaria' },
  { id: 7,  catId: 'newa-cat-7',  name: 'Idraulica, Edilizia e Materiale Elettrico',icon: 'bed',                description: 'Materiali edili, idraulici ed elettrici' },
  { id: 8,  catId: 'newa-cat-8',  name: 'Attrezzature e Impianti',                  icon: 'gear',               description: 'Attrezzature tecniche e impiantistica industriale' },
  { id: 9,  catId: 'newa-cat-9',  name: 'Monouso, Pulizie e Igiene',                icon: 'spray-can-sparkles', description: 'Prodotti monouso, detergenti e igiene professionale' },
  { id: 10, catId: 'newa-cat-10', name: 'Rifiuti e Riciclo',                        icon: 'boxes-stacked',      description: 'Gestione rifiuti e servizi di riciclaggio' },
  { id: 11, catId: 'newa-cat-11', name: 'Ricerca, Welfare e Benefit',               icon: 'briefcase',          description: 'Servizi di welfare aziendale e benefit per dipendenti' },
  { id: 12, catId: 'newa-cat-12', name: 'Arredi, Complementi ed Elettrodomestici',  icon: 'truck',              description: "Arredamento, complementi d'arredo ed elettrodomestici" },
]

const STATS: Array<{ icon: string; value: string; label: string; hint: string }> = [
  { icon: 'layer-group',       value: '12',  label: 'Categorie',        hint: '100% attive' },
  { icon: 'building',          value: '319', label: 'Fornitori Totali', hint: '+12 questo mese' },
  { icon: 'file-circle-check', value: '156', label: 'Contratti Attivi', hint: '48,9% del totale' },
  { icon: 'arrow-trend-up',    value: '89%', label: 'Soddisfazione',    hint: '+5% vs. anno scorso' },
]

type SortKey = 'name-asc' | 'name-desc' | 'count-desc' | 'count-asc'

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name-asc',   label: 'Nome (A → Z)' },
  { value: 'name-desc',  label: 'Nome (Z → A)' },
  { value: 'count-desc', label: 'Più fornitori prima' },
  { value: 'count-asc',  label: 'Meno fornitori prima' },
]

const DEFAULT_SORT: SortKey = 'name-asc'
const DEFAULT_MIN_COUNT = 0
const MIN_COUNT_MAX = 50

export default function AreaMerceologica({ navigate }: { navigate: (p: string) => void }) {
  const prodotti  = useCatalogoStore(s => s.prodotti)
  const fornitori = useCatalogoStore(s => s.fornitori)

  const [view, setView] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT)
  const [minCount, setMinCount] = useState<number>(DEFAULT_MIN_COUNT)

  const CATEGORIES: CategoryEntry[] = useMemo(() => {
    return CATEGORIES_META.map((meta) => {
      const prodCount = prodotti.filter(p => p.categoriaId === meta.catId && p.mercati.agora.abilitato).length
      const fornCount = fornitori.filter(f => f.categoriaId === meta.catId).length
      // Conteggio mostrato in badge: prodotti se ce ne sono, altrimenti fornitori
      const count = prodCount > 0 ? prodCount : fornCount
      return { ...meta, count }
    })
  }, [prodotti, fornitori])

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = CATEGORIES
      .filter((c) => c.count >= minCount)
      .filter((c) => q === '' || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.name.localeCompare(b.name)
        case 'name-desc':  return b.name.localeCompare(a.name)
        case 'count-asc':  return a.count - b.count
        case 'count-desc': return b.count - a.count
      }
    })
  }, [CATEGORIES, search, sortBy, minCount])

  const filtersDirty = sortBy !== DEFAULT_SORT || minCount !== DEFAULT_MIN_COUNT
  const resetFilters = () => { setSortBy(DEFAULT_SORT); setMinCount(DEFAULT_MIN_COUNT) }

  return (
    <div className="area-merceologica">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Area merceologica"
        subtitle="Seleziona la categoria di prodotti e servizi che ti interessa"
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Cerca categoria…' }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        extraActions={
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={() => navigate('crea-prodotto')}
          >
            <Ico n="plus" s={12} c="#fff" />
            Crea prodotto
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
                      name="categories-sortBy"
                      value={opt.value}
                      checked={sortBy === opt.value}
                      onChange={() => setSortBy(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="page-toolbar__filter-section">
              <label htmlFor="filter-min-count" className="page-toolbar__filter-label">
                Minimo fornitori: <strong>{minCount}</strong>
              </label>
              <input
                id="filter-min-count"
                type="range"
                min={0}
                max={MIN_COUNT_MAX}
                step={5}
                value={minCount}
                onChange={(e) => setMinCount(parseInt(e.target.value, 10))}
                className="page-toolbar__filter-range"
              />
              <div className="page-toolbar__filter-range-ticks">
                <span>0</span>
                <span>{MIN_COUNT_MAX}</span>
              </div>
            </div>
          </>
        }
      />

      <div className="categories-page__stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-card__head">
              <p className="stat-card__label">{stat.label}</p>
              <Icon family="duotone" name={stat.icon} className="stat-card__icon" />
            </div>
            <p className="stat-card__value">{stat.value}</p>
            <p className="stat-card__hint">{stat.hint}</p>
          </div>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="categories-page__empty">
          Nessuna categoria trovata con i filtri selezionati.
        </div>
      ) : (
        <div className={`categories-page__grid${view === 'list' ? ' categories-page__grid--list' : ''}`}>
          {displayed.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              name={category.name}
              icon={category.icon}
              count={category.count}
              description={category.description}
              onClick={() => navigate(`dettaglio-area-merceologica:${category.catId}`)}
            />
          ))}
        </div>
      )}

    </div>
  )
}
