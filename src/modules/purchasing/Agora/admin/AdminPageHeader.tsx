/*
 * AdminPageHeader — intestazione condivisa delle pagine admin.
 * Differente dal `PageHeader` lato utente: niente "back" (le pagine sono già
 * montate sotto AdminLayout che ha proprie breadcrumb in topbar). Il disegno è
 * quello STANDARD della piattaforma (PageHead: titolo centrato, azioni a destra).
 */

import type { ReactNode } from 'react';
import PageHead from '../../../../core/components/PageHead';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return <PageHead title={title} subtitle={subtitle} actions={actions} back={false} />;
}
