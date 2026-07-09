import React from 'react'
import clsx from 'clsx'
import BtnBack from './BtnBack'
import PageHeader from './PageHeader'
import './PageHead.sass'

interface PageHeadProps {
  title: string
  subtitle?: string
  eyebrow?: string
  /** Mostra il pulsante "Indietro" a sinistra del titolo (default true). */
  back?: boolean
  backLabel?: string
  onBack?: () => void
  /** Contenuto opzionale allineato a destra del titolo (es. un pulsante azione). */
  actions?: React.ReactNode
  className?: string
}

// Header di pagina STANDARD (unico su tutta la piattaforma): riga unica a 3 zone
// [Indietro · titolo centrato · azioni]. Il titolo è centrato rispetto alla pagina
// (colonne laterali 1fr uguali) e allineato in verticale al tasto Indietro, così si
// recupera lo spazio della vecchia riga separata. Riferimento: Match Zone.
export default function PageHead({
  title, subtitle, eyebrow, back = true, backLabel, onBack, actions, className,
}: PageHeadProps) {
  return (
    <div className={clsx('page-head', className)}>
      <div className="page-head__side page-head__side--left">
        {back && <BtnBack label={backLabel} onClick={onBack} />}
      </div>
      <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} />
      <div className="page-head__side page-head__side--right">
        {actions}
      </div>
    </div>
  )
}
