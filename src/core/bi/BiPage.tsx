import React from 'react'
import clsx from 'clsx'
import PageHead from '../components/PageHead'
import BiDataStamp from './BiDataStamp'
import BiGlossaryRail from './BiGlossaryRail'
import './BiPage.sass'

// ─── BI PAGE (guscio delle pagine BI) ───────────────────────────────────────────
//  Impianto unico di tutte le pagine BI, che garantisce le due regole della
//  sezione: TUTTO IN UNA SCHERMATA e NESSUNO SCROLL (né verticale né orizzontale).
//
//  Come lo ottiene:
//   • il guscio è alto quanto l'area contenuto (`height: 100%`) e non scrolla mai;
//   • le righe sono [header · toolbar · corpo elastico]: solo il corpo si dilata;
//   • il corpo è una griglia con `min-height: 0` e celle `minmax(0, …)`, così i
//     grafici si adattano all'altezza disponibile invece di spingere la pagina;
//   • il root è un container query (`bi-page`): sotto le larghezze da laptop si
//     compattano SOLO le dimensioni, senza togliere informazione;
//   • la legenda degli acronimi vive in un rail sovrapposto, quindi non consuma
//     spazio della griglia.
//
//  La griglia vera e propria la definisce la pagina nel suo `.sass` (aree e
//  proporzioni cambiano da pagina a pagina) passando `gridClassName`.

export interface BiPageProps {
  title: string
  subtitle?: string
  /** Chiavi del glossario presenti nella pagina (rail "Legenda" a destra). */
  glossary: string[]
  /** Momento dell'ultimo carico dati BI. */
  dataAt: Date
  onRefresh?: () => void
  loading?: boolean
  /** Filtri della pagina: una sola riga, mai a capo. */
  toolbar?: React.ReactNode
  /** Azioni aggiuntive nell'header, a sinistra del timbro dati. */
  actions?: React.ReactNode
  back?: boolean
  onBack?: () => void
  className?: string
  gridClassName?: string
  children: React.ReactNode
}

export default function BiPage({
  title, subtitle, glossary, dataAt, onRefresh, loading,
  toolbar, actions, back = true, onBack, className, gridClassName, children,
}: BiPageProps) {
  return (
    <div className={clsx('bi-page', className)}>
      <PageHead
        title={title}
        subtitle={subtitle}
        back={back}
        onBack={onBack}
        className="bi-page__head"
        actions={(
          <>
            {actions}
            <BiDataStamp at={dataAt} onRefresh={onRefresh} loading={loading} />
          </>
        )}
      />

      {toolbar && <div className="bi-page__toolbar">{toolbar}</div>}

      <div className="bi-page__body">
        <div className={clsx('bi-page__grid', gridClassName)}>{children}</div>
        <BiGlossaryRail keys={glossary} />
      </div>
    </div>
  )
}
