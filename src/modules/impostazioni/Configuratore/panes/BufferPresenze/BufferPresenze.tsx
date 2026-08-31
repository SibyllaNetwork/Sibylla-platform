import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { InputField, ToggleSwitch } from '../../../../../core/components/form'
import { CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './BufferPresenze.sass'

// ─── BUFFER PRESENZE (§4.10) ──────────────────────────────────────────────────
//  Struttura e contenuti sono CORRETTI (parola del committente): qui si
//  interviene solo su grafica e usabilità — tabella su CfgTable, toggle e
//  campi condivisi al posto di quelli riscritti a mano, colonne numeriche
//  allineate, salvataggio su CfgSaveBar. La logica non cambia.

const PANE_ID = 'buffer-presenze'

interface Riga {
  id: number
  struttura: string
  /** Licenza ospiti: capienza autorizzata della struttura. */
  capienzaTotale: number
  /** Maggiorazione licenza: capienza estesa quando il buffer è attivo. */
  capienzaMaggiorata: number
  bufferOn: boolean
}
interface Data { rows: Riga[] }

const FALLBACK_ROWS: Riga[] = [
  { id: 2, struttura: "Grim's Hotel",   capienzaTotale: 59,  capienzaMaggiorata: 59,  bufferOn: true },
  { id: 4, struttura: 'Hotel Tutorial', capienzaTotale: 120, capienzaMaggiorata: 125, bufferOn: true },
]

function countChanges(saved: Riga[], draft: Riga[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (saved[i].capienzaMaggiorata !== draft[i].capienzaMaggiorata
      || saved[i].bufferOn !== draft[i].bufferOn) n++
  }
  return n
}

export default function BufferPresenze() {
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [saved, setSaved] = useState<Riga[]>(FALLBACK_ROWS)
  const [rows, setRows]   = useState<Riga[]>(FALLBACK_ROWS)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBufferPresenze', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.rows) || d.rows.length === 0) return
        setSaved(d.rows)
        setRows(d.rows)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, rows), [saved, rows])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const update = <K extends keyof Riga>(id: number, field: K, v: Riga[K]) =>
    setRows(rs => rs.map((r) => r.id === id ? { ...r, [field]: v } : r))

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetBufferPresenze', { method: 'POST', body: { rows } })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[BufferPresenze] persistenza remota non disponibile:', err)
    }
    setSaved(rows)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  return (
    <div className="buffer-presenze">
      <CfgTable
        columns={[
          { key: 'struttura',     label: 'Struttura',             width: '40%' },
          { key: 'licenza',       label: 'Licenza ospiti',        width: '18%', align: 'right' },
          { key: 'maggiorazione', label: 'Maggiorazione licenza', width: '22%', align: 'right' },
          { key: 'buffer',        label: 'Buffer capienza',       width: '20%' },
        ]}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="buffer-presenze__td-name">{r.struttura}</td>
            <td className="buffer-presenze__td-num">{r.capienzaTotale}</td>
            <td className="buffer-presenze__td-num">
              <InputField
                name={`maggiorazione-${r.id}`}
                type="number"
                min={r.capienzaTotale}
                value={r.capienzaMaggiorata || ''}
                placeholder="0"
                disabled={!r.bufferOn}
                onChange={(e) => update(r.id, 'capienzaMaggiorata', Number(e.target.value) || 0)}
                className="buffer-presenze__input"
              />
            </td>
            <td>
              <ToggleSwitch
                checked={r.bufferOn}
                label={r.bufferOn ? 'Attivo' : 'Disattivo'}
                onChange={(checked) => update(r.id, 'bufferOn', checked)}
                className="buffer-presenze__toggle"
              />
            </td>
          </tr>
        ))}
      </CfgTable>

      <p className="buffer-presenze__note">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Con il buffer attivo la disponibilità si calcola sulla maggiorazione di licenza;
        disattivandolo vale la licenza ospiti.
      </p>

      <CfgSaveBar
        className="buffer-presenze__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setRows(saved)}
        successMessage="Buffer presenze salvato"
      />
    </div>
  )
}
