import { useEffect, useMemo, useState } from 'react'
import { useConfiguratoreStore, type CfgCompletion } from '../../../../../store/useConfiguratoreStore'
import type { ConfiguratoreId } from '../../registry'

// ─── Bozza dei pane «Risorse umane» ──────────────────────────────────────────
//  I pane modificano una copia locale dei dati di useHrConfigStore: il conteggio
//  delle modifiche alimenta la CfgSaveBar e la conferma di abbandono della
//  shell; «Salva» riscrive lo store (che Crea anagrafica e Archivio leggono).

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

  const dirty = useMemo(() => count(saved, draft), [saved, draft, count])
  useEffect(() => { markDirty(paneId, dirty) }, [paneId, dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])
  // Lo stato di completamento riflette i dati salvati anche senza un nuovo salvataggio
  useEffect(() => { setCompletion(paneId, completionOf(saved)) }, [paneId, saved, setCompletion, completionOf])

  const save = () => new Promise<void>((resolve) => {
    setTimeout(() => {
      commit(draft)
      resetDirty()
      resolve()
    }, 300)
  })
  const cancel = () => { setDraft(saved); resetDirty() }

  return { draft, setDraft, dirty, save, cancel }
}
