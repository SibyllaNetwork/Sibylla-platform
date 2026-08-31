import React from 'react'
import { CfgLocked } from '../../../../../core/cfg'
import './ListiniOpzioneErrore.sass'

// ─── OPZIONE ERRORE (Listini) ────────────────────────────────────────────────
//  Il funzionale (§4.17 / §4.18) prevede che i Listini non siano attivabili
//  finché la Stagionalità del segmento non è completata. La pagina però si apre
//  sempre sui contenuti reali: lo stato di blocco resta consultabile qui, in
//  fondo, dentro un box marcato come OPZIONE — così si vede come apparirebbe
//  senza dover svuotare la configurazione delle stagionalità.

export interface ListiniOpzioneErroreProps {
  /** Nome della pagina (es. "Listini individuali"). */
  paneLabel: string
  /** Prerequisito previsto dal funzionale (es. "Stagionalità B2B"). */
  requirementLabel: string
  /** Motivo del blocco, con le stesse parole dello stato reale. */
  reason: string
  /** Porta al configuratore da completare: è la via d'uscita dal blocco. */
  onGoToRequirement?: () => void
}

export default function ListiniOpzioneErrore({
  paneLabel, requirementLabel, reason, onGoToRequirement,
}: ListiniOpzioneErroreProps) {
  return (
    <section className="lst-opz" aria-label={`Opzione errore — ${paneLabel}`}>
      <header className="lst-opz__head">
        <span className="lst-opz__tag">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          Opzione errore
        </span>
        <p className="lst-opz__hint">
          Stato mostrato dalla pagina quando <strong>{requirementLabel}</strong> non è
          completata: il funzionale prevede che i listini non siano attivabili prima di quel
          passaggio.
        </p>
      </header>

      <div className="lst-opz__box">
        <CfgLocked
          title={paneLabel}
          requirementLabel={requirementLabel}
          reason={reason}
          onGoToRequirement={onGoToRequirement}
        />
      </div>
    </section>
  )
}
