import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { PageToolbar, type ViewMode } from './PageToolbar';
import { useAcademy } from '../context/AcademyContext';
import type { CourseMode } from '../data/academy';
import './AcademyCoursesPage.css';

type ModeFilter = CourseMode | 'tutti';
type SortKey = 'start-asc' | 'start-desc' | 'price-asc' | 'duration-asc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'start-asc',    label: 'Data inizio (più vicina)' },
  { value: 'start-desc',   label: 'Data inizio (più lontana)' },
  { value: 'price-asc',    label: 'Prezzo crescente' },
  { value: 'duration-asc', label: 'Durata crescente' },
];

const DEFAULT_SORT: SortKey = 'start-asc';

const MODE_TABS: Array<{ id: ModeFilter; label: string }> = [
  { id: 'tutti',       label: 'Tutti' },
  { id: 'online',      label: 'Online' },
  { id: 'in-presenza', label: 'In presenza' },
  { id: 'ibrido',      label: 'Ibrido' },
];

const MODE_LABEL: Record<CourseMode, string> = {
  online: 'Online',
  'in-presenza': 'In presenza',
  ibrido: 'Ibrido',
};

const LEVEL_LABEL: Record<string, string> = {
  base: 'Base',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
};

export function AcademyCoursesPage() {
  const navigate = useNavigate();
  const { courses } = useAcademy();
  const [modeFilter, setModeFilter] = useState<ModeFilter>('tutti');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);

  const counts = useMemo(() => {
    return {
      tutti: courses.length,
      online: courses.filter((c) => c.mode === 'online').length,
      'in-presenza': courses.filter((c) => c.mode === 'in-presenza').length,
      ibrido: courses.filter((c) => c.mode === 'ibrido').length,
    };
  }, [courses]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = courses.filter((c) => {
      const matchesMode = modeFilter === 'tutti' || c.mode === modeFilter;
      const matchesSearch =
        q === '' ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q);
      return matchesMode && matchesSearch;
    });
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'start-asc':    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'start-desc':   return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'price-asc':    return a.price - b.price;
        case 'duration-asc': return a.durationHours - b.durationHours;
      }
    });
  }, [courses, modeFilter, search, sortBy]);

  const filtersDirty = sortBy !== DEFAULT_SORT;
  const resetFilters = () => setSortBy(DEFAULT_SORT);

  return (
    <Layout>
      <PageHeader
        title="Corsi di Formazione"
        subtitle="Catalogo dei corsi specialistici per il settore hospitality"
        onBack={() => navigate('/academy')}
        backLabel="Torna all'Accademia"
      />

      <div className="academy-courses__tabs">
        {MODE_TABS.map((tab) => {
          const isActive = modeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setModeFilter(tab.id)}
              className={`academy-courses__tab${isActive ? ' academy-courses__tab--active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="academy-courses__tab-count">{counts[tab.id]}</span>
            </button>
          );
        })}
      </div>

      <PageToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Cerca corso, categoria o docente…',
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
                    name="courses-sortBy"
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
        <div className="academy-courses__empty">
          Nessun corso trovato con i filtri selezionati.
        </div>
      ) : (
        <div
          className={`academy-courses__grid${view === 'list' ? ' academy-courses__grid--list' : ''}`}
        >
          {displayed.map((c) => {
            const seatsPercent = Math.round((c.seatsAvailable / c.totalSeats) * 100);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/academy/courses/${c.id}`)}
                className="course-card"
              >
                <div className="course-card__head">
                  <span className="course-card__category">{c.category}</span>
                  <span className={`course-card__mode course-card__mode--${c.mode}`}>
                    {MODE_LABEL[c.mode]}
                  </span>
                </div>

                <h3 className="course-card__title">{c.title}</h3>
                <p className="course-card__instructor">
                  <Icon family="regular" name="user" /> {c.instructor}
                </p>

                <div className="course-card__meta">
                  <span className="course-card__meta-item">
                    <Icon family="regular" name="calendar" />
                    {new Date(c.startDate).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </span>
                  <span className="course-card__meta-item">
                    <Icon family="regular" name="clock" />
                    {c.durationHours} ore
                  </span>
                  <span className="course-card__meta-item">
                    <Icon family="regular" name="signal-bars" />
                    {LEVEL_LABEL[c.level]}
                  </span>
                </div>

                <div className="course-card__footer">
                  <div className="course-card__seats">
                    <span className="course-card__seats-label">
                      {c.seatsAvailable} posti su {c.totalSeats}
                    </span>
                    <div className="course-card__seats-bar">
                      <div
                        className="course-card__seats-fill"
                        style={{ '--bar-w': `${seatsPercent}%` } as CSSProperties}
                      />
                    </div>
                  </div>
                  <span className="course-card__price">
                    {c.price === 0 ? 'Gratuito' : `€ ${c.price}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
