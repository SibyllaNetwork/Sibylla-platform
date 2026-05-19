import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { H1, P3 } from '../ds/typography';
import './PageHeader.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  hideBack?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  backLabel = 'Indietro',
  onBack,
  hideBack = false,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <header className="page-header">
      {!hideBack && (
        <button
          type="button"
          className="sib-btn sib-btn--back page-header__back-btn"
          onClick={handleBack}
        >
          <i className="fa-duotone fa-arrow-left text-[12px]" aria-hidden="true" />
          {backLabel}
        </button>
      )}

      <div className="page-header__row">
        <div className="page-header__titles">
          <H1>{title}</H1>
          {subtitle && <P3 className="page-header__subtitle">{subtitle}</P3>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
