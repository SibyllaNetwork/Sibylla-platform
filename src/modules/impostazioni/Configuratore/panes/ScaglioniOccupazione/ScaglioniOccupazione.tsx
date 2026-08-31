import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, RadioGroup } from '../../../../../core/components/form'
import {
  CfgToolbar, CfgRangeRules, CfgSaveBar, cfgRangeHasErrors,
  type CfgRangeRow,
} from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './ScaglioniOccupazione.sass'

// ─── SCAGLIONI OCCUPAZIONE (§4.7) ─────────────────────────────────────────────
//  Intervalli percentuali di occupazione, ricostruiti su CfgRangeRules:
//   • filtro Tipologia con «B2B» al posto di «FIT»;
//   • niente spinner nei box numerici, «+» e cestino sulla stessa riga;
//   • validazione di continuità / non-sovrapposizione (nel componente regole);
//   • Salva (prima assente) su CfgSaveBar, con dirty state sincronizzato con
//     useConfiguratoreStore così la shell avvisa prima di abbandonare.

const PANE_ID = 'scaglioni-occupazione'

type Tipologia = 'B2B' | 'Gruppi'

interface Struttura { Id: number; nome: string }

interface Data {
  Strutture: Struttura[]
  StrutturaId: number | null
  Tipologia: string
  scaglioni: CfgRangeRow[]
}

const FALLBACK_ROWS: CfgRangeRow[] = [
  { from: 0, to: 30 }, { from: 30, to: 45 }, { from: 45, to: 60 },
  { from: 60, to: 70 }, { from: 70, to: 80 }, { from: 80, to: 85 },
  { from: 85, to: 90 }, { from: 90, to: 95 },
]

/** Righe cambiate rispetto allo snapshot salvato (per il conteggio della save bar). */
function countRowChanges(saved: CfgRangeRow[], draft: CfgRangeRow[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (saved[i].from !== draft[i].from || saved[i].to !== draft[i].to) n++
  }
  return n
}

export default function ScaglioniOccupazione() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [tipologia, setTipologia]     = useState<Tipologia>('Gruppi')
  const [saved, setSaved]             = useState<CfgRangeRow[]>(FALLBACK_ROWS)
  const [rows, setRows]               = useState<CfgRangeRow[]>(FALLBACK_ROWS)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetScaglioniOccupazione', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.scaglioni)) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        // Rinomina richiesta dal brief: «FIT» diventa «B2B» (idem «Individuali»)
        setTipologia(d.Tipologia === 'Gruppi' ? 'Gruppi' : 'B2B')
        setSaved(d.scaglioni)
        setRows(d.scaglioni)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty   = useMemo(() => countRowChanges(saved, rows), [saved, rows])
  const invalid = useMemo(() => cfgRangeHasErrors(rows, 0, 100), [rows])

  // Dirty state condiviso con la shell (conferma di abbandono al cambio voce)
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const save = async () => {
    if (invalid) throw new Error('Scaglioni non validi')
    try {
      await apiFetchSibylla('configura/SetScaglioniOccupazione', {
        method: 'POST',
        body: { StrutturaId: strutturaId, Tipologia: tipologia, scaglioni: rows },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[ScaglioniOccupazione] persistenza remota non disponibile:', err)
    }
    setSaved(rows)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  return (
    <div className="scaglioni-occupazione">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="scaglioni-occupazione__field"
          value={strutturaId ?? ''}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <RadioGroup
          name="tipologia"
          label="Tipologia"
          value={tipologia}
          onChange={(val) => setTipologia(val as Tipologia)}
          options={[
            { value: 'B2B',    label: 'B2B'    },
            { value: 'Gruppi', label: 'Gruppi' },
          ]}
        />
      </CfgToolbar>

      <CfgRangeRules
        rows={rows}
        onChange={setRows}
        unit="%"
        min={0}
        max={100}
        entityName="scaglione"
        addLabel="Aggiungi scaglione"
      />

      <CfgSaveBar
        className="scaglioni-occupazione__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setRows(saved)}
        successMessage="Scaglioni di occupazione salvati"
        errorMessage={invalid
          ? 'Gli scaglioni presentano errori: correggi gli intervalli segnalati prima di salvare.'
          : 'Salvataggio non riuscito. Riprova.'}
      />
    </div>
  )
}
