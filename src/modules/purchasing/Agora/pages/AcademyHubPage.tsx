import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { useAcademy } from '../context/AcademyContext';
import { AcademyNewAdModal } from './AcademyNewAdModal';
import {
  STATO_MODERAZIONE_META,
  submissionTitle,
  useNuoveRisorseStore,
  type ResourceSubmission,
} from '../../../../store/useNuoveRisorseStore';
import { useNotificheRisorseStore } from '../../../../store/useNotificheRisorseStore';
import './AcademyHubPage.css';

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AcademyHubPage() {
  const navigate = useNavigate();
  const { personnelListings, courses } = useAcademy();
  const [newAdOpen, setNewAdOpen] = useState(false);
  const [editSub, setEditSub] = useState<ResourceSubmission | null>(null);
  const [bellOpen, setBellOpen] = useState(false);

  const submissions = useNuoveRisorseStore((s) => s.submissions);
  const removeSubmission = useNuoveRisorseStore((s) => s.remove);
  const notifiche = useNotificheRisorseStore((s) => s.notifiche);
  const markAllRead = useNotificheRisorseStore((s) => s.markAllRead);
  const removeNotifica = useNotificheRisorseStore((s) => s.remove);

  const unread = useMemo(() => notifiche.filter((n) => !n.letta).length, [notifiche]);
  const mySubmissions = useMemo(
    () => [...submissions].sort((a, b) => b.updatedAt - a.updatedAt),
    [submissions],
  );

  const personnelStats = useMemo(() => {
    const offerte = personnelListings.filter((p) => p.kind === 'offerta').length;
    const richieste = personnelListings.filter((p) => p.kind === 'richiesta').length;
    return { offerte, richieste, totale: personnelListings.length };
  }, [personnelListings]);

  const coursesStats = useMemo(() => {
    const availableSeats = courses.reduce((sum, c) => sum + c.seatsAvailable, 0);
    return { totale: courses.length, availableSeats };
  }, [courses]);

  const toggleBell = () => {
    setBellOpen((open) => {
      if (!open && unread > 0) markAllRead();
      return !open;
    });
  };

  const closeModal = () => {
    setNewAdOpen(false);
    setEditSub(null);
  };

  return (
    <Layout>
      <PageHeader
        title="Nuove risorse"
        subtitle="Cerca o offri lavoro nel settore hospitality e accedi alla formazione professionale"
        actions={
          <div className="academy-hub__actions">
            <div className="academy-hub__bell-wrap">
              <button
                type="button"
                className="academy-hub__bell"
                onClick={toggleBell}
                aria-label={`Notifiche${unread > 0 ? ` (${unread} non lette)` : ''}`}
                aria-expanded={bellOpen}
              >
                <Icon family="regular" name="bell" />
                {unread > 0 && <span className="academy-hub__bell-dot">{unread}</span>}
              </button>
              {bellOpen && (
                <>
                  <div className="academy-hub__bell-overlay" onClick={() => setBellOpen(false)} aria-hidden="true" />
                  <div className="academy-hub__bell-panel" role="dialog" aria-label="Notifiche">
                    <header className="academy-hub__bell-head">
                      <span>Notifiche</span>
                    </header>
                    {notifiche.length === 0 ? (
                      <p className="academy-hub__bell-empty">Nessuna notifica.</p>
                    ) : (
                      <ul className="academy-hub__bell-list">
                        {notifiche.map((n) => (
                          <li key={n.id} className={`academy-hub__notif academy-hub__notif--${n.tipo}`}>
                            <span className="academy-hub__notif-icon">
                              <Icon family="solid" name={n.tipo === 'approvato' ? 'circle-check' : 'circle-xmark'} />
                            </span>
                            <div className="academy-hub__notif-body">
                              <p className="academy-hub__notif-text">
                                {n.tipo === 'approvato' ? (
                                  <>«{n.titolo}» è stato approvato e pubblicato.</>
                                ) : (
                                  <>«{n.titolo}» è stato rigettato.</>
                                )}
                              </p>
                              {n.tipo === 'rifiutato' && n.motivazione && (
                                <p className="academy-hub__notif-reason">{n.motivazione}</p>
                              )}
                              <span className="academy-hub__notif-date">{fmtDate(n.ts)}</span>
                            </div>
                            <button
                              type="button"
                              className="academy-hub__notif-del"
                              onClick={() => removeNotifica(n.id)}
                              aria-label="Rimuovi notifica"
                            >
                              <Icon family="light" name="xmark" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={() => setNewAdOpen(true)} className="academy-hub__cta">
              <Icon family="regular" name="plus" />
              Pubblica annuncio
            </button>
          </div>
        }
      />

      <button
        type="button"
        className="academy-hub__policy"
        onClick={() => navigate('/academy/policy')}
      >
        <Icon family="light" name="shield-check" />
        <span>
          Prima di pubblicare un annuncio, leggi le{' '}
          <strong>Policy di Sibylla per l'inserimento annunci</strong> (regole e privacy GDPR).
        </span>
        <Icon family="regular" name="arrow-right" />
      </button>

      <div className="academy-hub__sections">
        <button
          type="button"
          className="academy-hub-card academy-hub-card--personnel"
          onClick={() => navigate('/academy/personnel')}
        >
          <div className="academy-hub-card__icon">
            <Icon family="light" name="briefcase" />
          </div>
          <h2 className="academy-hub-card__title">Ricerca Personale</h2>
          <p className="academy-hub-card__desc">
            Annunci di lavoro pubblicati da aziende del settore e candidature di
            professionisti che si propongono per nuove opportunità.
          </p>
          <div className="academy-hub-card__metrics">
            <div className="academy-hub-card__metric">
              <span className="academy-hub-card__metric-value">{personnelStats.offerte}</span>
              <span className="academy-hub-card__metric-label">Offerte di lavoro</span>
            </div>
            <div className="academy-hub-card__metric">
              <span className="academy-hub-card__metric-value">{personnelStats.richieste}</span>
              <span className="academy-hub-card__metric-label">Candidati disponibili</span>
            </div>
          </div>
          <span className="academy-hub-card__link">
            Esplora la sezione
            <Icon family="regular" name="arrow-right" />
          </span>
        </button>

        <button
          type="button"
          className="academy-hub-card academy-hub-card--courses"
          onClick={() => navigate('/academy/courses')}
        >
          <div className="academy-hub-card__icon">
            <Icon family="light" name="graduation-cap" />
          </div>
          <h2 className="academy-hub-card__title">Corsi di Formazione</h2>
          <p className="academy-hub-card__desc">
            Catalogo di corsi specialistici per il settore hospitality: revenue
            management, lingue, F&B operations, marketing e compliance.
          </p>
          <div className="academy-hub-card__metrics">
            <div className="academy-hub-card__metric">
              <span className="academy-hub-card__metric-value">{coursesStats.totale}</span>
              <span className="academy-hub-card__metric-label">Corsi disponibili</span>
            </div>
            <div className="academy-hub-card__metric">
              <span className="academy-hub-card__metric-value">{coursesStats.availableSeats}</span>
              <span className="academy-hub-card__metric-label">Posti liberi</span>
            </div>
          </div>
          <span className="academy-hub-card__link">
            Vedi i corsi
            <Icon family="regular" name="arrow-right" />
          </span>
        </button>
      </div>

      {mySubmissions.length > 0 && (
        <section className="academy-myads">
          <h2 className="academy-myads__title">
            <Icon family="light" name="rectangle-list" />
            I miei annunci
          </h2>
          <p className="academy-myads__hint">
            Gli annunci che pubblichi vengono moderati dal supporto Sibylla prima di
            comparire nelle sezioni. Qui ne segui lo stato.
          </p>
          <ul className="academy-myads__list">
            {mySubmissions.map((s) => {
              const meta = STATO_MODERAZIONE_META[s.stato];
              return (
                <li key={s.id} className="academy-myads__item">
                  <span className={`academy-myads__kind academy-myads__kind--${s.kind}`}>
                    <Icon family="solid" name={s.kind === 'course' ? 'graduation-cap' : 'briefcase'} />
                  </span>
                  <div className="academy-myads__main">
                    <span className="academy-myads__name">{submissionTitle(s)}</span>
                    <span className="academy-myads__date">Aggiornato il {fmtDate(s.updatedAt)}</span>
                    {s.stato === 'rifiutato' && s.motivazione && (
                      <span className="academy-myads__reason">
                        <Icon family="solid" name="comment" /> {s.motivazione}
                      </span>
                    )}
                  </div>
                  <span className={`academy-myads__status academy-myads__status--${meta.tone}`}>
                    <Icon family="solid" name={meta.icon} /> {meta.label}
                  </span>
                  <div className="academy-myads__actions">
                    {s.stato === 'approvato' && (
                      <button
                        type="button"
                        className="academy-myads__btn"
                        onClick={() => navigate(s.kind === 'course' ? '/academy/courses' : '/academy/personnel')}
                      >
                        Vedi
                      </button>
                    )}
                    {s.stato === 'rifiutato' && (
                      <button
                        type="button"
                        className="academy-myads__btn academy-myads__btn--primary"
                        onClick={() => setEditSub(s)}
                      >
                        <Icon family="solid" name="pen-to-square" /> Modifica e ri-invia
                      </button>
                    )}
                    {s.stato !== 'approvato' && (
                      <button
                        type="button"
                        className="academy-myads__btn academy-myads__btn--ghost"
                        onClick={() => removeSubmission(s.id)}
                        aria-label="Ritira annuncio"
                        title="Ritira annuncio"
                      >
                        <Icon family="light" name="trash" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button
        type="button"
        className="academy-hub__match-banner"
        onClick={() => navigate('/match-zone')}
      >
        <div className="academy-hub__match-banner-icon">
          <Icon family="light" name="circle-nodes" />
        </div>
        <div className="academy-hub__match-banner-text">
          <p className="academy-hub__match-banner-eyebrow">Novità</p>
          <h3 className="academy-hub__match-banner-title">Match Zone</h3>
          <p className="academy-hub__match-banner-desc">
            Lascia che il sistema metta in contatto chi cerca con chi offre. Annunci di
            domanda e offerta abbinati automaticamente.
          </p>
        </div>
        <span className="academy-hub__match-banner-cta">
          Apri Match Zone
          <Icon family="regular" name="arrow-right" />
        </span>
      </button>

      <AcademyNewAdModal
        isOpen={newAdOpen || editSub !== null}
        onClose={closeModal}
        editSubmission={editSub}
      />
    </Layout>
  );
}
