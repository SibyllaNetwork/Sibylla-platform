import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { PageToolbar, type ViewMode } from './PageToolbar';
import { useAcademy } from '../context/AcademyContext';
import type { PersonnelKind } from '../data/academy';
import './AcademyPersonnelPage.css';

type KindFilter = PersonnelKind | 'tutti';
type SortKey = 'date-desc' | 'date-asc' | 'title-asc' | 'experience-desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'date-desc',       label: 'Più recenti prima' },
  { value: 'date-asc',        label: 'Più vecchi prima' },
  { value: 'title-asc',       label: 'Titolo (A → Z)' },
  { value: 'experience-desc', label: 'Più esperienza prima' },
];

const DEFAULT_SORT: SortKey = 'date-desc';

const KIND_TABS: Array<{ id: KindFilter; label: string; icon: string }> = [
  { id: 'tutti',     label: 'Tutti gli annunci', icon: 'list' },
  { id: 'offerta',   label: 'Offerte di lavoro', icon: 'briefcase' },
  { id: 'richiesta', label: 'Cerco lavoro',      icon: 'user-tie' },
];

const CONTRACT_LABEL: Record<string, string> = {
  indeterminato: 'Indeterminato',
  determinato: 'Determinato',
  stage: 'Stage',
  freelance: 'Freelance / P.IVA',
  apprendistato: 'Apprendistato',
};

const WORK_MODE_LABEL: Record<string, string> = {
  'in-presenza': 'In presenza',
  ibrido: 'Ibrido',
  remoto: 'Remoto',
};

export function AcademyPersonnelPage() {
  const navigate = useNavigate();
  const { personnelListings } = useAcademy();
  const [kindFilter, setKindFilter] = useState<KindFilter>('tutti');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);

  const counts = useMemo(() => {
    return {
      tutti: personnelListings.length,
      offerta: personnelListings.filter((p) => p.kind === 'offerta').length,
      richiesta: personnelListings.filter((p) => p.kind === 'richiesta').length,
    };
  }, [personnelListings]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = personnelListings.filter((p) => {
      const matchesKind = kindFilter === 'tutti' || p.kind === kindFilter;
      const matchesSearch =
        q === '' ||
        p.title.toLowerCase().includes(q) ||
        p.organization.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q);
      return matchesKind && matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':       return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
        case 'date-asc':        return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
        case 'title-asc':       return a.title.localeCompare(b.title);
        case 'experience-desc': return (b.experienceYears ?? 0) - (a.experienceYears ?? 0);
      }
    });
  }, [personnelListings, kindFilter, search, sortBy]);

  const filtersDirty = sortBy !== DEFAULT_SORT;
  const resetFilters = () => setSortBy(DEFAULT_SORT);

  return (
    <Layout>
      <PageHeader
        title="Ricerca Personale"
        subtitle="Offerte di lavoro e candidati disponibili nel settore hospitality"
        onBack={() => navigate('/academy')}
        backLabel="Torna all'Accademia"
      />

      <div className="academy-personnel__tabs">
        {KIND_TABS.map((tab) => {
          const isActive = kindFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKindFilter(tab.id)}
              className={`academy-personnel__tab${isActive ? ' academy-personnel__tab--active' : ''}`}
            >
              <Icon family="regular" name={tab.icon} />
              <span>{tab.label}</span>
              <span className="academy-personnel__tab-count">{counts[tab.id]}</span>
            </button>
          );
        })}
      </div>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Cerca per ruolo, azienda o città…',
        }}
        view={view}
        onViewChange={setView}
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
        filterPanel={
          <fieldset className="page-toolbar__filter-section">
            <legend className="page-toolbar__filter-label">Ordina per</legend>
            <div className="page-toolbar__filter-options">
              {SORT_OPTIONS.map((opt) => (
                <label key={opt.value} className="page-toolbar__filter-option">
                  <input
                    type="radio"
                    name="personnel-sortBy"
                    value={opt.value}
                    checked={sortBy === opt.value}
                    onChange={() => setSortBy(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        }
      />

      {displayed.length === 0 ? (
        <div className="academy-personnel__empty">
          Nessun annuncio trovato con i filtri selezionati.
        </div>
      ) : (
        <div
          className={`academy-personnel__grid${view === 'list' ? ' academy-personnel__grid--list' : ''}`}
        >
          {displayed.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/academy/personnel/${p.id}`)}
              className="personnel-card"
            >
              <div className="personnel-card__head">
                <span
                  className={`personnel-card__badge personnel-card__badge--${p.kind}`}
                >
                  <Icon
                    family="regular"
                    name={p.kind === 'offerta' ? 'briefcase' : 'user-tie'}
                  />
                  {p.kind === 'offerta' ? 'Offerta di lavoro' : 'Cerco lavoro'}
                </span>
                <span className="personnel-card__date">
                  {new Date(p.publishedDate).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>

              <h3 className="personnel-card__title">{p.title}</h3>
              <p className="personnel-card__org">{p.organization}</p>
              <p className="personnel-card__desc">{p.description}</p>

              <div className="personnel-card__meta">
                <span className="personnel-card__meta-item">
                  <Icon family="regular" name="location-dot" />
                  {p.city}, {p.region}
                </span>
                <span className="personnel-card__meta-item">
                  <Icon family="regular" name="file-contract" />
                  {CONTRACT_LABEL[p.contractType]}
                </span>
                <span className="personnel-card__meta-item">
                  <Icon family="regular" name="building" />
                  {WORK_MODE_LABEL[p.workMode]}
                </span>
                {p.experienceYears !== undefined && (
                  <span className="personnel-card__meta-item">
                    <Icon family="regular" name="clock" />
                    {p.experienceYears} anni esperienza
                  </span>
                )}
              </div>

              <span className="personnel-card__link">
                Vedi dettagli
                <Icon family="regular" name="arrow-right" />
              </span>
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}
