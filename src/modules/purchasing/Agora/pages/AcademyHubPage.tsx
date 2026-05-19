import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { useAcademy } from '../context/AcademyContext';
import { AcademyNewAdModal } from './AcademyNewAdModal';
import './AcademyHubPage.css';

export function AcademyHubPage() {
  const navigate = useNavigate();
  const { personnelListings, courses } = useAcademy();
  const [newAdOpen, setNewAdOpen] = useState(false);

  const personnelStats = useMemo(() => {
    const offerte = personnelListings.filter((p) => p.kind === 'offerta').length;
    const richieste = personnelListings.filter((p) => p.kind === 'richiesta').length;
    return { offerte, richieste, totale: personnelListings.length };
  }, [personnelListings]);

  const coursesStats = useMemo(() => {
    const totalSeats = courses.reduce((sum, c) => sum + c.totalSeats, 0);
    const availableSeats = courses.reduce((sum, c) => sum + c.seatsAvailable, 0);
    return { totale: courses.length, availableSeats, totalSeats };
  }, [courses]);

  return (
    <Layout>
      <PageHeader
        title="Nuove risorse"
        subtitle="Cerca o offri lavoro nel settore hospitality e accedi alla formazione professionale"
        actions={
          <button
            type="button"
            onClick={() => setNewAdOpen(true)}
            className="academy-hub__cta"
          >
            <Icon family="regular" name="plus" />
            Pubblica annuncio
          </button>
        }
      />

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

      <AcademyNewAdModal isOpen={newAdOpen} onClose={() => setNewAdOpen(false)} />
    </Layout>
  );
}
