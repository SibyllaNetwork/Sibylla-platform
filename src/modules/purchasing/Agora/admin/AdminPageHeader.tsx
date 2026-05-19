/*
 * AdminPageHeader — intestazione condivisa delle pagine admin.
 * Differente dal `PageHeader` lato utente: niente "back" automatico e niente
 * dipendenza da react-router (le pagine sono già montate sotto AdminLayout
 * che ha proprie breadcrumb in topbar).
 */

import type { ReactNode } from 'react';
import './AdminPageHeader.css';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="admin-page-header__actions">{actions}</div>}
    </header>
  );
}
