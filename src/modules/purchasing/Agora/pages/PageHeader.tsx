import { ReactNode } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { useNavBack } from '../../../../store/useNavBack';
import PageHead from '../../../../core/components/PageHead';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  hideBack?: boolean;
}

// Intestazione delle pagine Agorà: poggia sull'header STANDARD della piattaforma
// (PageHead: Indietro · titolo centrato · azioni). Qui resta solo la logica del
// tasto Indietro propria del MemoryRouter Agorà.
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
    <PageHead
      title={title}
      subtitle={subtitle}
      actions={actions}
      back={!hideBack}
      backLabel={backLabel}
      onBack={handleBack}
    />
  );
}
