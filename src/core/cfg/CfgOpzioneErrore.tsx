import React from 'react'
import CfgLocked from './CfgLocked'
import './CfgOpzioneErrore.sass'

// ─── OPZIONE ERRORE (kit Configuratore) ──────────────────────────────────────
//  Alcuni configuratori, da funzionale, non sono attivabili finché un altro non
//  è completo (Listini → Stagionalità del segmento, Overbooking limit →
//  Stagionalità applicata). Le pagine però si aprono sempre sui contenuti reali:
//  lo stato di blocco resta consultabile in fondo alla pagina, dentro un box
//  marcato come OPZIONE, con il link al configuratore da completare — così si
//  vede come apparirebbe senza dover svuotare la configurazione.

export interface CfgOpzioneErroreProps {
  /** Nome della pagina (es. "Listini individuali"). */
  paneLabel: string
  /** Prerequisito previsto dal funzionale (es. "Stagionalità B2B"). */
  requirementLabel: string
  /** Motivo del blocco, con le stesse parole dello stato reale. */
  reason: string
  /** Porta al configuratore da completare: è la via d'uscita dal blocco. */
  onGoToRequirement?: () => void
}

export default function CfgOpzioneErrore({
  paneLabel, requirementLabel, reason, onGoToRequirement,
}: CfgOpzioneErroreProps) {
  return (
    <section className="cfg-opz" aria-label={`Opzione errore — ${paneLabel}`}>
      <header className="cfg-opz__head">
        <span className="cfg-opz__tag">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          Opzione errore
        </span>
        <p className="cfg-opz__hint">
          Stato mostrato dalla pagina quando <strong>{requirementLabel}</strong> non è
          completata: il funzionale prevede che questo configuratore non sia attivabile
          prima di quel passaggio.
        </p>
      </header>

      <div className="cfg-opz__box">
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
