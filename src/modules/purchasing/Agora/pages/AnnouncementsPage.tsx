import { useState } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { Icon } from '../ds/icon';
import { Input } from '../ds/input';
import { Select } from '../ds/select';
import { Label } from '../ds/label';
import { Field } from '../ds/field';
import { PageToolbar, type ViewMode } from './PageToolbar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  CATEGORY_LABELS,
  MOCK_ANNOUNCEMENTS,
  STATUS_LABELS,
  convertManagementToAnnouncement,
  type Announcement,
  type AnnouncementCategory,
  type AnnouncementStatus,
  type AnnouncementType,
} from '../data/announcements';
import './AnnouncementsPage.css';

export function AnnouncementsPage() {
  const navigate = useNavigate();
  const { managementAnnouncements } = useAnnouncements();
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'tutti'>('tutti');
  const [selectedStatus, setSelectedStatus] = useState<AnnouncementStatus | 'tutti'>('tutti');
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'tutti'>('tutti');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState<ViewMode>('list');
  const itemsPerPage = 5;

  const convertedAnnouncements: Announcement[] = useMemo(() => {
    return managementAnnouncements
      .filter((ma) => ma.published)
      .map(convertManagementToAnnouncement);
  }, [managementAnnouncements]);

  /* Set degli id che appartengono all'utente corrente, per render del bottone "Match" */
  const myAnnouncementIds = useMemo(
    () => new Set(managementAnnouncements.map((ma) => ma.id)),
    [managementAnnouncements],
  );

  const allAnnouncements = useMemo(
    () => [...convertedAnnouncements, ...MOCK_ANNOUNCEMENTS],
    [convertedAnnouncements],
  );

  const filteredAnnouncements = allAnnouncements.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchesType = selectedType === 'tutti' || a.type === selectedType;
    const matchesStatus = selectedStatus === 'tutti' || a.status === selectedStatus;
    const matchesCategory = selectedCategory === 'tutti' || a.category === selectedCategory;
    const matchesSearch =
      a.title.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.hotel.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q);
    return matchesType && matchesStatus && matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);

  const handleFilterChange = () => setCurrentPage(1);
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: Array<number | string> = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i += 1) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i += 1) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i += 1) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const formatDate = (dateString: string) =>
    format(new Date(dateString), 'dd MMM yyyy', { locale: it });

  return (
    <Layout>
      <PageHeader
        title="Annunci"
        subtitle={`${filteredAnnouncements.length} ${filteredAnnouncements.length === 1 ? 'annuncio trovato' : 'annunci trovati'}`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/announcements/manage')}
            className="announcements__new"
          >
            <Icon family="regular" name="plus"  />
            Nuovo Annuncio
          </button>
        }
      />

      <PageToolbar view={view} onViewChange={setView} />

      <section aria-label="Filtri di ricerca" className="announcements__filters">
        <div className="announcements__filters-grid">
          <Field>
            <Label>Cerca Annuncio</Label>
            <Input
              type="text"
              placeholder="Titolo, località, hotel o descrizione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Field>

          <Field>
            <Label>Tipo</Label>
            <Select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as AnnouncementType | 'tutti');
                handleFilterChange();
              }}
            >
              <option value="tutti">Tutti i tipi</option>
              <option value="vendita">Vendita</option>
              <option value="acquisto">Acquisto</option>
            </Select>
          </Field>

          <Field>
            <Label>Categoria</Label>
            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as AnnouncementCategory | 'tutti');
                handleFilterChange();
              }}
            >
              <option value="tutti">Tutte le categorie</option>
              <option value="mare">Mare</option>
              <option value="montagna">Montagna</option>
              <option value="citta_arte">Città d'Arte</option>
              <option value="business">Business</option>
              <option value="wellness">Wellness</option>
              <option value="eventi">Eventi</option>
            </Select>
          </Field>

          <Field>
            <Label>Stato</Label>
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as AnnouncementStatus | 'tutti');
                handleFilterChange();
              }}
            >
              <option value="tutti">Tutti gli stati</option>
              <option value="attivo">Attivo</option>
              <option value="in_trattativa">In Trattativa</option>
              <option value="concluso">Concluso</option>
            </Select>
          </Field>
        </div>
      </section>

      <div
        className={`announcements__list${view === 'grid' ? ' announcements__list--grid' : ''}`}
      >
        {currentAnnouncements.map((announcement) => (
          <article key={announcement.id} className="announcement-card">
            <div className="announcement-card__head">
              <div className="announcement-card__badges">
                <span
                  className={`announcement-card__badge announcement-card__badge--bold announcement-card__badge--${announcement.type}`}
                >
                  <Icon
                    family="regular"
                    name={announcement.type === 'vendita' ? 'arrow-trend-up' : 'arrow-trend-down'}
                  />
                  {announcement.type === 'vendita' ? 'VENDITA' : 'ACQUISTO'}
                </span>
                <span
                  className={`announcement-card__badge announcement-card__badge--status-${announcement.status}`}
                >
                  {STATUS_LABELS[announcement.status]}
                </span>
                <span
                  className={`announcement-card__badge announcement-card__badge--cat-${announcement.category}`}
                >
                  <Icon family="regular" name="tag"  />
                  {CATEGORY_LABELS[announcement.category]}
                </span>
              </div>

              <div className="announcement-card__actions">
                {myAnnouncementIds.has(announcement.id) && (
                  <button
                    type="button"
                    className="announcement-card__match"
                    onClick={() =>
                      navigate(`/match-zone?id=${announcement.id}&autostart=1`)
                    }
                  >
                    <Icon family="regular" name="bolt" />
                    Match
                  </button>
                )}
                <button type="button" className="announcement-card__contact">
                  Contatta
                </button>
              </div>
            </div>

            <h3 className="announcement-card__title">{announcement.title}</h3>
            <p className="announcement-card__desc">{announcement.description}</p>

            <div className="announcement-card__grid">
              <div className="announcement-card__meta">
                <span className="announcement-card__meta-icon">
                  <Icon family="regular" name="boxes-stacked"  />
                </span>
                <div>
                  <p className="announcement-card__meta-label">Lotti</p>
                  <p className="announcement-card__meta-primary">{announcement.lots}</p>
                  <p className="announcement-card__meta-secondary">
                    {announcement.roomsPerLot} camere/lotto
                  </p>
                </div>
              </div>

              <div className="announcement-card__meta">
                <span className="announcement-card__meta-icon">
                  <Icon family="regular" name="bed"  />
                </span>
                <div>
                  <p className="announcement-card__meta-label">Tipologia</p>
                  <p className="announcement-card__meta-primary">{announcement.roomType}</p>
                </div>
              </div>

              <div className="announcement-card__meta">
                <span className="announcement-card__meta-icon">
                  <Icon family="regular" name="calendar"  />
                </span>
                <div>
                  <p className="announcement-card__meta-label">Periodo</p>
                  <p className="announcement-card__meta-primary">
                    {formatDate(announcement.checkInDate)} - {formatDate(announcement.checkOutDate)}
                  </p>
                  <p className="announcement-card__meta-secondary">
                    {announcement.nights} {announcement.nights === 1 ? 'notte' : 'notti'}
                  </p>
                </div>
              </div>

              <div className="announcement-card__meta">
                <span className="announcement-card__meta-icon">
                  <Icon family="regular" name="location-dot"  />
                </span>
                <div>
                  <p className="announcement-card__meta-label">Località</p>
                  <p className="announcement-card__meta-primary">{announcement.location}</p>
                  <p className="announcement-card__meta-secondary">{announcement.hotel}</p>
                </div>
              </div>

              <div className="announcement-card__meta">
                <span className="announcement-card__meta-icon">
                  <Icon family="regular" name="users"  />
                </span>
                <div>
                  <p className="announcement-card__meta-label">Pubblicato da</p>
                  <p className="announcement-card__meta-primary">{announcement.publisher}</p>
                </div>
              </div>

              <div className="announcement-card__meta">
                <span className="announcement-card__meta-icon">
                  <Icon family="regular" name={announcement.showRecipient ? 'eye' : 'eye-slash'} />
                </span>
                <div>
                  <p className="announcement-card__meta-label">Destinatario</p>
                  {announcement.showRecipient ? (
                    <p className="announcement-card__meta-primary">Riservato</p>
                  ) : (
                    <p className="announcement-card__meta-muted">Riservato</p>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="announcements__empty">
          <div className="announcements__empty-icon">
            <Icon family="regular" name="search"  />
          </div>
          <h3 className="announcements__empty-title">Nessun annuncio trovato</h3>
          <p className="announcements__empty-text">Prova a modificare i filtri di ricerca</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="announcements__pagination">
          <div className="announcements__pagination-row">
            <p className="announcements__pagination-info">
              Pagina {currentPage} di {totalPages} • Mostra {startIndex + 1}-
              {Math.min(endIndex, filteredAnnouncements.length)} di {filteredAnnouncements.length}{' '}
              annunci
            </p>

            <div className="announcements__pagination-controls">
              <button
                type="button"
                className="page-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Icon family="regular" name="chevron-left"  />
                Precedente
              </button>

              <div className="page-nums">
                {getPageNumbers().map((page, index) => {
                  const isNum = typeof page === 'number';
                  const isActive = page === currentPage;
                  return (
                    <button
                      key={`${page}-${index}`}
                      type="button"
                      className={`page-num${isActive ? ' page-num--active' : ''}${!isNum ? ' page-num--ellipsis' : ''}`}
                      onClick={() => isNum && goToPage(page as number)}
                      disabled={!isNum}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="page-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Successiva
                <Icon family="regular" name="chevron-right"  />
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
