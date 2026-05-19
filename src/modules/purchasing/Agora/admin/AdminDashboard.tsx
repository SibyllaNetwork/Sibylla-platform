/*
 * AdminDashboard — overview di sistema con KPI e link rapidi alle sezioni.
 * I numeri derivano dagli store già presenti (VideosContext, AnnouncementsContext,
 * AcademyContext): nessuna chiamata di rete.
 */

import { Link } from 'react-router-dom';
import { Icon } from '../ds/icon';
import { useVideos } from '../context/VideosContext';
import { useAnnouncements } from '../context/AnnouncementsContext';
import { useAcademy } from '../context/AcademyContext';
import './AdminDashboard.css';

export function AdminDashboard() {
  const { videos } = useVideos();
  const { managementAnnouncements } = useAnnouncements();
  const { personnelListings, courses } = useAcademy();

  const videosPublished = videos.filter((v) => v.published).length;
  const videosDraft = videos.length - videosPublished;
  const videosMissingSource = videos.filter((v) => !v.source).length;
  const annPublished = managementAnnouncements.filter((a) => a.published).length;
  const annDraft = managementAnnouncements.length - annPublished;
  const academyTotal = personnelListings.length + courses.length;

  return (
    <div className="admin-dash">
      <header className="admin-dash__head">
        <h1>Panoramica</h1>
        <p>Stato di salute dei contenuti gestiti dalla console amministrativa.</p>
      </header>

      <section className="admin-dash__kpis">
        <KpiCard
          icon="circle-play"
          tone="primary"
          value={videos.length}
          label="Video totali"
          hint={
            [
              `${videosPublished} pubblicati`,
              videosDraft > 0 ? `${videosDraft} bozze` : null,
              videosMissingSource > 0 ? `${videosMissingSource} senza sorgente` : null,
            ]
              .filter(Boolean)
              .join(' • ')
          }
        />
        <KpiCard
          icon="bullhorn"
          tone="warning"
          value={managementAnnouncements.length}
          label="Annunci gestiti"
          hint={`${annPublished} pubblicati • ${annDraft} bozze`}
        />
        <KpiCard
          icon="briefcase"
          tone="success"
          value={academyTotal}
          label="Voci accademia"
          hint={`${personnelListings.length} personale • ${courses.length} corsi`}
        />
        <KpiCard
          icon="user-shield"
          tone="muted"
          value={1}
          label="Account admin"
          hint="Passcode condiviso"
        />
      </section>

      <section className="admin-dash__sections">
        <h2>Sezioni amministrative</h2>
        <div className="admin-dash__grid">
          <SectionCard
            to="/admin/videos"
            icon="circle-play"
            title="E-learning"
            desc="Aggiungi, modifica ed elimina i video della pagina E-learning."
            cta="Apri"
          />
          <SectionCard
            to="/admin/announcements"
            icon="bullhorn"
            title="Annunci"
            desc="Gestione centralizzata degli annunci pubblicati nella bacheca."
            cta="In arrivo"
            disabled
          />
          <SectionCard
            to="/admin/packages"
            icon="box"
            title="Pacchetti dinamici"
            desc="Categorie/servizi, temi pacchetto e parametri di selezione."
            cta="Apri"
          />
          <SectionCard
            to="/admin/accommodations"
            icon="bed"
            title="Strutture"
            desc="Anagrafica strutture ricettive abilitate al network."
            cta="In arrivo"
            disabled
          />
          <SectionCard
            to="/admin/users"
            icon="users-gear"
            title="Utenti & permessi"
            desc="Gestione utenti, ruoli e accessi alla piattaforma."
            cta="In arrivo"
            disabled
          />
          <SectionCard
            to="/admin/settings"
            icon="gear"
            title="Impostazioni"
            desc="Configurazione del pannello e parametri tecnici."
            cta="Configura"
          />
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────── */

interface KpiCardProps {
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
  value: number;
  label: string;
  hint?: string;
}

function KpiCard({ icon, tone, value, label, hint }: KpiCardProps) {
  return (
    <div className={`admin-kpi admin-kpi--${tone}`}>
      <span className="admin-kpi__icon">
        <Icon family="duotone" name={icon} />
      </span>
      <div className="admin-kpi__body">
        <span className="admin-kpi__value">{value}</span>
        <span className="admin-kpi__label">{label}</span>
        {hint && <span className="admin-kpi__hint">{hint}</span>}
      </div>
    </div>
  );
}

interface SectionCardProps {
  to: string;
  icon: string;
  title: string;
  desc: string;
  cta: string;
  disabled?: boolean;
}

function SectionCard({ to, icon, title, desc, cta, disabled }: SectionCardProps) {
  if (disabled) {
    return (
      <div className="admin-section-card admin-section-card--disabled" aria-disabled="true">
        <span className="admin-section-card__icon">
          <Icon family="light" name={icon} />
        </span>
        <h3>{title}</h3>
        <p>{desc}</p>
        <span className="admin-section-card__cta admin-section-card__cta--disabled">
          {cta}
          <Icon family="light" name="clock" />
        </span>
      </div>
    );
  }
  return (
    <Link to={to} className="admin-section-card">
      <span className="admin-section-card__icon">
        <Icon family="light" name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{desc}</p>
      <span className="admin-section-card__cta">
        {cta}
        <Icon family="solid" name="arrow-right" />
      </span>
    </Link>
  );
}
