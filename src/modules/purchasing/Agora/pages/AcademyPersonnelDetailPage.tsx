import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { useAcademy } from '../context/AcademyContext';
import { AcademyContactModal } from './AcademyContactModal';
import './AcademyPersonnelDetailPage.css';

const CONTRACT_LABEL: Record<string, string> = {
  indeterminato: 'Tempo indeterminato',
  determinato: 'Tempo determinato',
  stage: 'Stage / tirocinio',
  freelance: 'Freelance / P.IVA',
  apprendistato: 'Apprendistato',
};

const WORK_MODE_LABEL: Record<string, string> = {
  'in-presenza': 'In presenza',
  ibrido: 'Ibrido',
  remoto: 'Remoto',
};

export function AcademyPersonnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { personnelListings } = useAcademy();
  const [contactOpen, setContactOpen] = useState(false);

  const listing = useMemo(
    () => personnelListings.find((p) => p.id === id),
    [personnelListings, id],
  );

  if (!listing) {
    return (
      <Layout>
        <div className="academy-personnel-detail__not-found">
          <p>Annuncio non trovato.</p>
          <button
            type="button"
            onClick={() => navigate('/academy/personnel')}
            className="academy-personnel-detail__back"
          >
            Torna alla lista
          </button>
        </div>
      </Layout>
    );
  }

  /* offerta → l'utente invia il proprio CV
     richiesta → l'utente richiede colloquio (può allegare proprio CV/profilo) */
  const isOfferta = listing.kind === 'offerta';
  const ctaLabel = isOfferta ? 'Invia CV' : 'Richiedi colloquio';
  const ctaIcon = isOfferta ? 'paper-plane' : 'comments';
  const variant = isOfferta ? 'invia-cv' : 'richiedi-colloquio';

  return (
    <Layout>
      <PageHeader
        title={listing.title}
        subtitle={listing.organization}
        onBack={() => navigate('/academy/personnel')}
        backLabel="Torna agli annunci"
      />

      <div className="academy-personnel-detail">
        <div className="academy-personnel-detail__main">
          <div className="academy-personnel-detail__header-card">
            <div className="academy-personnel-detail__badges">
              <span
                className={`personnel-card__badge personnel-card__badge--${listing.kind}`}
              >
                <Icon
                  family="regular"
                  name={listing.kind === 'offerta' ? 'briefcase' : 'user-tie'}
                />
                {listing.kind === 'offerta' ? 'Offerta di lavoro' : 'Cerco lavoro'}
              </span>
              <span
                className={`academy-personnel-detail__status academy-personnel-detail__status--${listing.status}`}
              >
                {listing.status === 'aperto' ? 'Aperto' : 'Chiuso'}
              </span>
            </div>

            <div className="academy-personnel-detail__meta-grid">
              <div className="academy-personnel-detail__meta">
                <Icon family="regular" name="location-dot" />
                <div>
                  <span className="academy-personnel-detail__meta-label">Sede</span>
                  <span className="academy-personnel-detail__meta-value">
                    {listing.city}, {listing.region}
                  </span>
                </div>
              </div>
              <div className="academy-personnel-detail__meta">
                <Icon family="regular" name="file-contract" />
                <div>
                  <span className="academy-personnel-detail__meta-label">Contratto</span>
                  <span className="academy-personnel-detail__meta-value">
                    {CONTRACT_LABEL[listing.contractType]}
                  </span>
                </div>
              </div>
              <div className="academy-personnel-detail__meta">
                <Icon family="regular" name="building" />
                <div>
                  <span className="academy-personnel-detail__meta-label">Modalità</span>
                  <span className="academy-personnel-detail__meta-value">
                    {WORK_MODE_LABEL[listing.workMode]}
                  </span>
                </div>
              </div>
              {listing.experienceYears !== undefined && (
                <div className="academy-personnel-detail__meta">
                  <Icon family="regular" name="clock" />
                  <div>
                    <span className="academy-personnel-detail__meta-label">Esperienza</span>
                    <span className="academy-personnel-detail__meta-value">
                      {listing.experienceYears} anni
                    </span>
                  </div>
                </div>
              )}
              {listing.salaryRange && (
                <div className="academy-personnel-detail__meta">
                  <Icon family="regular" name="euro-sign" />
                  <div>
                    <span className="academy-personnel-detail__meta-label">Compenso</span>
                    <span className="academy-personnel-detail__meta-value">
                      {listing.salaryRange}
                    </span>
                  </div>
                </div>
              )}
              <div className="academy-personnel-detail__meta">
                <Icon family="regular" name="calendar" />
                <div>
                  <span className="academy-personnel-detail__meta-label">Pubblicato</span>
                  <span className="academy-personnel-detail__meta-value">
                    {new Date(listing.publishedDate).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <section className="academy-personnel-detail__section">
            <h2 className="academy-personnel-detail__section-title">Descrizione</h2>
            <p className="academy-personnel-detail__text">{listing.description}</p>
          </section>

          <section className="academy-personnel-detail__section">
            <h2 className="academy-personnel-detail__section-title">
              {isOfferta ? 'Requisiti richiesti' : 'Competenze offerte'}
            </h2>
            <ul className="academy-personnel-detail__list">
              {listing.requirements.map((r, idx) => (
                <li key={idx} className="academy-personnel-detail__list-item">
                  <Icon family="regular" name="check" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="academy-personnel-detail__aside">
          <div className="academy-personnel-detail__cta-card">
            <p className="academy-personnel-detail__cta-eyebrow">
              {isOfferta ? 'Sei interessato?' : 'Vuoi parlarci?'}
            </p>
            <h3 className="academy-personnel-detail__cta-title">{ctaLabel}</h3>
            <p className="academy-personnel-detail__cta-text">
              {isOfferta
                ? 'Compila il modulo per inviare la tua candidatura. Il referente la riceverà direttamente.'
                : 'Compila il modulo per richiedere un colloquio con questo professionista.'}
            </p>

            <div className="academy-personnel-detail__contact">
              <p className="academy-personnel-detail__contact-label">Referente</p>
              <p className="academy-personnel-detail__contact-name">{listing.contactName}</p>
              <p className="academy-personnel-detail__contact-email">{listing.contactEmail}</p>
            </div>

            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="academy-personnel-detail__cta-btn"
              disabled={listing.status === 'chiuso'}
            >
              <Icon family="regular" name={ctaIcon} />
              {ctaLabel}
            </button>
            {listing.status === 'chiuso' && (
              <p className="academy-personnel-detail__cta-hint">
                Annuncio chiuso, non più disponibile per nuove candidature.
              </p>
            )}
          </div>
        </aside>
      </div>

      <AcademyContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        variant={variant}
        itemTitle={listing.title}
        itemSubtitle={listing.organization}
        itemDetails={
          <dl>
            <dt>Sede</dt>
            <dd>{listing.city}, {listing.region}</dd>
            <dt>Contratto</dt>
            <dd>{CONTRACT_LABEL[listing.contractType]}</dd>
            <dt>Modalità</dt>
            <dd>{WORK_MODE_LABEL[listing.workMode]}</dd>
            {listing.salaryRange && (
              <>
                <dt>Compenso</dt>
                <dd>{listing.salaryRange}</dd>
              </>
            )}
          </dl>
        }
      />
    </Layout>
  );
}
