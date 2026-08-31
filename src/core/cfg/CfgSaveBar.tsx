import React, { useState } from 'react'
import clsx from 'clsx'
import { toast } from '../components/Toast/useToast'
import './CfgSaveBar.sass'

// ─── CFG SAVE BAR (modifiche pendenti) ───────────────────────────────────────
//  Barra sticky in fondo al pane, visibile SOLO con modifiche pendenti:
//  "N modifiche non salvate · Annulla · Salva". Gestisce lo stato di
//  salvataggio (spinner sul bottone) e dà SEMPRE un toast sull'esito —
//  mai un `catch {}` silenzioso.
//
//  Va passata a CfgPane tramite lo slot `saveBar`; il conteggio arriva dal
//  pane (tipicamente sincronizzato con useConfiguratoreStore.markDirty, così
//  la shell può chiedere conferma di abbandono al cambio voce).

export interface CfgSaveBarProps {
  /** Numero di modifiche non salvate: con 0 la barra non viene renderizzata. */
  count: number
  /** Salvataggio: se ritorna una Promise, la barra mostra lo stato e il toast sull'esito. */
  onSave: () => void | Promise<void>
  /** Annulla le modifiche pendenti (ripristino dello stato salvato). */
  onCancel: () => void
  /** Stato di salvataggio pilotato dall'esterno (in alternativa alla Promise). */
  saving?: boolean
  saveLabel?: string
  cancelLabel?: string
  /** Messaggi del toast di esito. */
  successMessage?: string
  errorMessage?: string
  className?: string
}

export default function CfgSaveBar({
  count, onSave, onCancel, saving,
  saveLabel = 'Salva', cancelLabel = 'Annulla',
  successMessage = 'Modifiche salvate',
  errorMessage = 'Salvataggio non riuscito. Riprova.',
  className,
}: CfgSaveBarProps) {
  const [busy, setBusy] = useState(false)
  const isSaving = saving ?? busy

  if (count <= 0 && !isSaving) return null

  const handleSave = async () => {
    const result = onSave()
    if (result instanceof Promise) {
      setBusy(true)
      try {
        await result
        toast.success(successMessage)
      } catch {
        toast.error(errorMessage)
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className={clsx('cfg-save-bar', className)} role="status">
      <span className="cfg-save-bar__dot" aria-hidden="true" />
      <span className="cfg-save-bar__count">
        {count === 1 ? '1 modifica non salvata' : `${count} modifiche non salvate`}
      </span>
      <div className="cfg-save-bar__actions">
        <button
          type="button"
          className="sib-btn sib-btn--ghost cfg-save-bar__cancel"
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={clsx('sib-btn sib-btn--primary', isSaving && 'sib-btn--loading')}
          onClick={handleSave}
          disabled={isSaving}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
