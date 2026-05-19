/*
 * AdminStubPage — placeholder generico per sezioni admin non ancora attive.
 * Una sola implementazione riutilizzata per Annunci/Pacchetti/Strutture/Utenti
 * finché le rispettive UI non vengono sviluppate.
 */

import { Link } from 'react-router-dom';
import { Icon } from '../ds/icon';
import { AdminPageHeader } from './AdminPageHeader';
import './AdminStubPage.css';

interface AdminStubPageProps {
  title: string;
  subtitle?: string;
  icon: string;
  description: string;
  /** Voci di funzionalità promesse (bullet-list informativa). */
  bullets?: string[];
}

export function AdminStubPage({ title, subtitle, icon, description, bullets }: AdminStubPageProps) {
  return (
    <div className="admin-stub">
      <AdminPageHeader title={title} subtitle={subtitle} />

      <div className="admin-stub__card">
        <span className="admin-stub__icon">
          <Icon family="duotone" name={icon} />
        </span>
        <h2>Sezione in arrivo</h2>
        <p>{description}</p>

        {bullets && bullets.length > 0 && (
          <ul>
            {bullets.map((b) => (
              <li key={b}>
                <Icon family="solid" name="check" /> {b}
              </li>
            ))}
          </ul>
        )}

        <Link to="/admin" className="admin-stub__back">
          <Icon family="solid" name="arrow-left" />
          Torna alla panoramica
        </Link>
      </div>
    </div>
  );
}
