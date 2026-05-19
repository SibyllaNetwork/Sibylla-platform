import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { Icon } from '../ds/icon';
import { useAcademy } from '../context/AcademyContext';
import { AcademyContactModal } from './AcademyContactModal';
import './AcademyCourseDetailPage.css';

const MODE_LABEL: Record<string, string> = {
  online: 'Online',
  'in-presenza': 'In presenza',
  ibrido: 'Ibrido',
};

const LEVEL_LABEL: Record<string, string> = {
  base: 'Base',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
};

export function AcademyCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses } = useAcademy();
  const [contactOpen, setContactOpen] = useState(false);

  const course = useMemo(() => courses.find((c) => c.id === id), [courses, id]);

  if (!course) {
    return (
      <Layout>
        <div className="academy-course-detail__not-found">
          <p>Corso non trovato.</p>
          <button
            type="button"
            onClick={() => navigate('/academy/courses')}
            className="academy-course-detail__back"
          >
            Torna ai corsi
          </button>
        </div>
      </Layout>
    );
  }

  const seatsPercent = Math.round((course.seatsAvailable / course.totalSeats) * 100);
  const dateRange = `${new Date(course.startDate).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
  })} – ${new Date(course.endDate).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  return (
    <Layout>
      <PageHeader
        title={course.title}
        subtitle={course.category}
        onBack={() => navigate('/academy/courses')}
        backLabel="Torna ai corsi"
      />

      <div className="academy-course-detail">
        <div className="academy-course-detail__main">
          <div className="academy-course-detail__header-card">
            <div className="academy-course-detail__badges">
              <span className={`course-card__mode course-card__mode--${course.mode}`}>
                {MODE_LABEL[course.mode]}
              </span>
              <span className="academy-course-detail__level">
                Livello {LEVEL_LABEL[course.level]}
              </span>
            </div>

            <div className="academy-course-detail__meta-grid">
              <div className="academy-course-detail__meta">
                <Icon family="regular" name="user" />
                <div>
                  <span className="academy-course-detail__meta-label">Docente</span>
                  <span className="academy-course-detail__meta-value">{course.instructor}</span>
                </div>
              </div>
              <div className="academy-course-detail__meta">
                <Icon family="regular" name="calendar" />
                <div>
                  <span className="academy-course-detail__meta-label">Date</span>
                  <span className="academy-course-detail__meta-value">{dateRange}</span>
                </div>
              </div>
              <div className="academy-course-detail__meta">
                <Icon family="regular" name="clock" />
                <div>
                  <span className="academy-course-detail__meta-label">Durata</span>
                  <span className="academy-course-detail__meta-value">
                    {course.durationHours} ore
                  </span>
                </div>
              </div>
              {course.city && (
                <div className="academy-course-detail__meta">
                  <Icon family="regular" name="location-dot" />
                  <div>
                    <span className="academy-course-detail__meta-label">Sede</span>
                    <span className="academy-course-detail__meta-value">{course.city}</span>
                  </div>
                </div>
              )}
              <div className="academy-course-detail__meta">
                <Icon family="regular" name="users" />
                <div>
                  <span className="academy-course-detail__meta-label">Posti</span>
                  <span className="academy-course-detail__meta-value">
                    {course.seatsAvailable} disponibili / {course.totalSeats}
                  </span>
                </div>
              </div>
              <div className="academy-course-detail__meta">
                <Icon family="regular" name="signal-bars" />
                <div>
                  <span className="academy-course-detail__meta-label">Livello</span>
                  <span className="academy-course-detail__meta-value">
                    {LEVEL_LABEL[course.level]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <section className="academy-course-detail__section">
            <h2 className="academy-course-detail__section-title">Descrizione</h2>
            <p className="academy-course-detail__text">{course.description}</p>
          </section>

          <section className="academy-course-detail__section">
            <h2 className="academy-course-detail__section-title">Programma del corso</h2>
            <ol className="academy-course-detail__syllabus">
              {course.syllabus.map((s, idx) => (
                <li key={idx} className="academy-course-detail__syllabus-item">
                  <span className="academy-course-detail__syllabus-num">{idx + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="academy-course-detail__aside">
          <div className="academy-course-detail__cta-card">
            <p className="academy-course-detail__cta-eyebrow">Investimento</p>
            <p className="academy-course-detail__cta-price">
              {course.price === 0 ? 'Gratuito' : `€ ${course.price}`}
            </p>

            <div className="academy-course-detail__seats">
              <div className="academy-course-detail__seats-row">
                <span className="academy-course-detail__seats-label">
                  {course.seatsAvailable} posti su {course.totalSeats}
                </span>
                <span className="academy-course-detail__seats-percent">{seatsPercent}%</span>
              </div>
              <div className="academy-course-detail__seats-bar">
                <div
                  className="academy-course-detail__seats-fill"
                  style={{ width: `${seatsPercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="academy-course-detail__cta-btn"
              disabled={course.seatsAvailable === 0}
            >
              <Icon family="regular" name="envelope" />
              Richiedi informazioni
            </button>
            {course.seatsAvailable === 0 && (
              <p className="academy-course-detail__cta-hint">Posti esauriti</p>
            )}
          </div>
        </aside>
      </div>

      <AcademyContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        variant="richiedi-info"
        itemTitle={course.title}
        itemSubtitle={`${course.category} · ${course.instructor}`}
        itemDetails={
          <dl>
            <dt>Modalità</dt>
            <dd>{MODE_LABEL[course.mode]}{course.city ? ` · ${course.city}` : ''}</dd>
            <dt>Date</dt>
            <dd>{dateRange}</dd>
            <dt>Durata</dt>
            <dd>{course.durationHours} ore</dd>
            <dt>Prezzo</dt>
            <dd>{course.price === 0 ? 'Gratuito' : `€ ${course.price}`}</dd>
          </dl>
        }
      />
    </Layout>
  );
}
