import { ReactNode } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { useNavBack } from '../../../../store/useNavBack';
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
  const navType = useNavigationType();
  const goBackSibylla = useNavBack((st) => st.goBack);
  // Il MemoryRouter Agorà entra su ogni pagina con un `replace` (PathSync): senza
  // una navigazione interna alle spalle `navigate(-1)` non farebbe nulla, quindi
  // in quel caso si torna alla pagina Sibylla precedente.
  const handleBack = onBack ?? (() => {
    if (navType === 'PUSH') navigate(-1);
    else goBackSibylla?.();
  });

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
