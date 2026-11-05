import { useEffect, useMemo, useRef, useState } from 'react'
import { useConfiguratoreStore, type CfgCompletion } from '../../../../../store/useConfiguratoreStore'
import type { ConfiguratoreId } from '../../registry'

// ─── Bozza dei pane «Risorse umane» ──────────────────────────────────────────
//  I pane modificano una copia locale dei dati di useHrConfigStore: il conteggio
//  delle modifiche alimenta la CfgSaveBar e la conferma di abbandono della
//  shell; «Salva» riscrive lo store (che Crea anagrafica e Archivio leggono).
//  Dopo il salvataggio la bozza si riallinea ai dati salvati: lo store (o il
//  `commit` del pane) può normalizzarli — fasce ordinate, valori ripuliti — e
//  senza riallineamento la barra ricomparirebbe con modifiche «fantasma».

/** Elementi aggiunti, rimossi o cambiati tra due elenchi con `id`. */
export function diffCount<T extends { id: string }>(saved: T[], draft: T[]): number {
  const byId = new Map(saved.map(x => [x.id, JSON.stringify(x)]))
  let n = 0
  for (const d of draft) {
    const s = byId.get(d.id)
    if (s == null || s !== JSON.stringify(d)) n += 1
    byId.delete(d.id)
  }
  return n + byId.size
}

export function useHrDraft<T>(
  paneId: ConfiguratoreId,
  saved: T,
  count: (saved: T, draft: T) => number,
  commit: (v: T) => void,
  completionOf: (v: T) => CfgCompletion,
) {
  const [draft, setDraft] = useState<T>(saved)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  // Riallineamento bozza ↔ dati salvati. Al cambio di `saved` la bozza si
  // aggiorna se (a) il cambio è l'esito di «Salva» oppure (b) la bozza non aveva
  // modifiche rispetto ai dati precedenti (aggiornamento esterno dello store).
  // Con modifiche in corso non dovute al salvataggio la bozza resta intatta.
  const syncAfterSave = useRef(false)
  const prevSaved = useRef(saved)
  useEffect(() => {
    if (prevSaved.current === saved) return
    const before = prevSaved.current
    prevSaved.current = saved
    if (syncAfterSave.current) {
      syncAfterSave.current = false
      setDraft(saved)
      return
    }
    setDraft(d => (count(before, d) === 0 ? saved : d))
  }, [saved, count])

  const dirty = useMemo(() => count(saved, draft), [saved, draft, count])
  useEffect(() => { markDirty(paneId, dirty) }, [paneId, dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])
  // Lo stato di completamento riflette i dati salvati anche senza un nuovo salvataggio
  useEffect(() => { setCompletion(paneId, completionOf(saved)) }, [paneId, saved, setCompletion, completionOf])

  const save = () => new Promise<void>((resolve) => {
    setTimeout(() => {
      syncAfterSave.current = true
      commit(draft)
      resetDirty()
      resolve()
    }, 300)
  })
  const cancel = () => { setDraft(saved); resetDirty() }
  // Una modifica dell'utente annulla un riallineamento rimasto in sospeso
  // (salvataggio che non ha cambiato i dati salvati).
  const editDraft: typeof setDraft = (v) => { syncAfterSave.current = false; setDraft(v) }

  return { draft, setDraft: editDraft, dirty, save, cancel }
}
