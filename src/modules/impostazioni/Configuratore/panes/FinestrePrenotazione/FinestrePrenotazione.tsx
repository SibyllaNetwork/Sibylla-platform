import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, RadioGroup } from '../../../../../core/components/form'
import {
  CfgToolbar, CfgRangeRules, CfgSaveBar, cfgRangeHasErrors,
  type CfgRangeRow,
} from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './FinestrePrenotazione.sass'

// ─── FINESTRE PRENOTAZIONE (§4.8) ─────────────────────────────────────────────
//  Intervalli di booking window (giorni di anticipo) su CfgRangeRules:
//   • «B2B» al posto di «FIT» nel filtro Tipologia;
//   • niente spinner, «+» e cestino in linea, layout denso;
//   • il Salva esce dalla finta riga «In Poi» e vive in CfgSaveBar;
//   • l'«in poi» diventa una chiusura leggibile della scala (riga di testo,
//     niente input disabilitati).

const PANE_ID = 'finestre-prenotazione'

type Tipologia = 'B2B' | 'Gruppi'

interface Struttura { Id: number; nome: string }

interface Data {
  Strutture: Struttura[]
  StrutturaId: number | null
  Tipologia: string
  windows: CfgRangeRow[]
}

const FALLBACK_ROWS: CfgRangeRow[] = [
  { from: 0, to: 9 }, { from: 9, to: 19 }, { from: 19, to: 50 },
  { from: 50, to: 65 }, { from: 65, to: 365 },
]

function countRowChanges(saved: CfgRangeRow[], draft: CfgRangeRow[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (saved[i].from !== draft[i].from || saved[i].to !== draft[i].to) n++
  }
  return n
}

export default function FinestrePrenotazione() {
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
    apiFetchSibylla<Data>('configura/GetFinestrePrenotazione', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.windows)) return
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        // Rinomina richiesta dal brief: «FIT» diventa «B2B»
        setTipologia(d.Tipologia === 'Gruppi' ? 'Gruppi' : 'B2B')
        setSaved(d.windows)
        setRows(d.windows)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty   = useMemo(() => countRowChanges(saved, rows), [saved, rows])
  const invalid = useMemo(() => cfgRangeHasErrors(rows, 0), [rows])
  const lastTo  = rows[rows.length - 1]?.to ?? 0

  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const save = async () => {
    if (invalid) throw new Error('Finestre non valide')
    try {
      await apiFetchSibylla('configura/SetFinestrePrenotazione', {
        method: 'POST',
        body: { StrutturaId: strutturaId, Tipologia: tipologia, windows: rows },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[FinestrePrenotazione] persistenza remota non disponibile:', err)
    }
    setSaved(rows)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  return (
    <div className="finestre-prenotazione">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="finestre-prenotazione__field"
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

      <div className="finestre-prenotazione__scale">
        <CfgRangeRules
          rows={rows}
          onChange={setRows}
          unit="gg"
          min={0}
          entityName="finestra"
          addLabel="Aggiungi finestra"
          makeRow={(after) => ({ from: after?.to ?? 0, to: (after?.to ?? 0) + 10 })}
        />

        {/* Chiusura leggibile della scala: l'ultima finestra è aperta («in poi») */}
        <div className="finestre-prenotazione__inpoi" role="note">
          <span className="finestre-prenotazione__inpoi-tag">In poi</span>
          <span className="finestre-prenotazione__inpoi-text">
            Le prenotazioni con anticipo superiore a <strong>{lastTo} gg</strong> ricadono
            nell&rsquo;ultima finestra, aperta verso l&rsquo;alto.
          </span>
        </div>
      </div>

      <CfgSaveBar
        className="finestre-prenotazione__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setRows(saved)}
        successMessage="Finestre di prenotazione salvate"
        errorMessage={invalid
          ? 'Le finestre presentano errori: correggi gli intervalli segnalati prima di salvare.'
          : 'Salvataggio non riuscito. Riprova.'}
      />
    </div>
  )
}
