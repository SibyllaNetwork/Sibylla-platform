import React from 'react'
import clsx from 'clsx'
import BtnBack from './BtnBack'
import PageHeader from './PageHeader'
import './PageHead.sass'

interface PageHeadProps {
  title: string
  subtitle?: string
  eyebrow?: string
  /** Mostra il pulsante "Indietro" sopra il titolo (default true). */
  back?: boolean
  backLabel?: string
  onBack?: () => void
  /** Contenuto opzionale allineato a destra del titolo (es. un pulsante azione). */
  actions?: React.ReactNode
  className?: string
}

// Header di pagina STANDARD (unico su tutta la piattaforma): BtnBack + titolo +
// sottotitolo con ingombri e dimensioni fissi (rif. Match Zone). Racchiudendo
// tutto in un blocco unico, la spaziatura interna resta identica anche quando la
// root di pagina usa flex+gap.
export default function PageHead({
  title, subtitle, eyebrow, back = true, backLabel, onBack, actions, className,
}: PageHeadProps) {
  return (
    <div className={clsx('page-head', className)}>
      {back && <BtnBack label={backLabel} onClick={onBack} />}
      {actions ? (
        <div className="page-head__row">
          <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} />
          <div className="page-head__actions">{actions}</div>
        </div>
      ) : (
        <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} />
      )}
    </div>
  )
}
