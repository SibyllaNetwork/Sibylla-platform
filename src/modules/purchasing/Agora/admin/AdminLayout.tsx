/*
 * AdminLayout — shell del pannello di controllo Agorà.
 *
 * Versione integrata in Sibylla: non disegna una sidebar/topbar propria
 * (il SibyllaAdminPanel le fornisce già). Renderizza solo una sub-tab bar
 * orizzontale stile Sibylla e l'<Outlet /> della sezione corrente.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { Icon } from '../ds/icon';
import './AdminLayout.css';

interface AdminSection {
  to: string;
  label: string;
  icon: string;
  /** True se la sezione non è ancora attiva (badge "presto"). */
  comingSoon?: boolean;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { to: '/admin',               label: 'Panoramica',     icon: 'gauge-high'                  },
  { to: '/admin/videos',        label: 'E-learning',     icon: 'circle-play'                 },
  { to: '/admin/announcements', label: 'Annunci',        icon: 'bullhorn',   comingSoon: true },
  { to: '/admin/packages',      label: 'Pacchetti',      icon: 'box'                         },
  { to: '/admin/accommodations',label: 'Strutture',      icon: 'bed'                         },
  { to: '/admin/users',         label: 'Utenti',         icon: 'users-gear', comingSoon: true },
  { to: '/admin/settings',      label: 'Impostazioni',   icon: 'gear'                        },
];

export function AdminLayout() {
  return (
    <div className="aac">
      <nav className="aac__tabs" aria-label="Sezioni Console Agorà">
        {ADMIN_SECTIONS.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.to === '/admin'}
            className={({ isActive }) =>
              `aac__tab${isActive ? ' aac__tab--active' : ''}${
                s.comingSoon ? ' aac__tab--soon' : ''
              }`
            }
          >
            <span className="aac__tab-icon" aria-hidden="true">
              <Icon family="light" name={s.icon} />
            </span>
            <span className="aac__tab-label">{s.label}</span>
            {s.comingSoon && <span className="aac__tab-badge">presto</span>}
          </NavLink>
        ))}
      </nav>

      <div className="aac__body">
        <Outlet />
      </div>
    </div>
  );
}
