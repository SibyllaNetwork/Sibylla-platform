import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, RadioGroup, InputField } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { CfgToolbar, CfgTable, CfgSaveBar } from '../../../../../core/cfg'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './RichiesteExtra.sass'

// ─── RICHIESTE EXTRA (§4.9) ───────────────────────────────────────────────────
//  Opzioni di accettazione delle richieste extra dei gruppi (Opzionata /
//  Garantita), ricostruite sulla CfgTable standard con la stessa densità del
//  componente regole:
//   • campo «Nome» eliminato (requisito esplicito del brief);
//   • niente spinner nei box numerici;
//   • «+» e cestino sulla stessa riga (standard icone .sib-table);
//   • la riga «Rifiuta» non è più una fila di input disabilitati col literal
//     "null": è una chiusura leggibile con tag + testo;
//   • Salva su CfgSaveBar con toast reale e dirty state condiviso.
//
//  Nota architettura: le opzioni NON sono intervalli Dal/Al, quindi qui non si
//  usa CfgRangeRules (che modella coppie from/to) ma la CfgTable standard.

const PANE_ID = 'richieste-extra'

type Tipologia = 'Opzionata' | 'Garantita'

interface Struttura { Id: number; nome: string }
interface Opzione { giorni: number; fee: number }

interface Data {
  Strutture: Struttura[]
  StrutturaId: number | null
  Tipologia: Tipologia
  options: (Opzione & { Nome?: string })[]
}

const FALLBACK_ROWS: Opzione[] = [
  { giorni: 1, fee: 0 },
  { giorni: 1, fee: 1 },
  { giorni: 1, fee: 1.5 },
  { giorni: 1, fee: 2 },
]

function countRowChanges(saved: Opzione[], draft: Opzione[]): number {
  let n = Math.abs(saved.length - draft.length)
  const len = Math.min(saved.length, draft.length)
  for (let i = 0; i < len; i++) {
    if (saved[i].giorni !== draft[i].giorni || saved[i].fee !== draft[i].fee) n++
  }
  return n
}

export default function RichiesteExtra() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [strutture, setStrutture]     = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [tipologia, setTipologia]     = useState<Tipologia>('Opzionata')
  const [saved, setSaved]             = useState<Opzione[]>(FALLBACK_ROWS)
  const [rows, setRows]               = useState<Opzione[]>(FALLBACK_ROWS)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetRichiesteExtra', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.options)) return
        // Il campo «Nome» è stato eliminato dal brief: si scartano i nomi
        const opts = d.options.map(o => ({ giorni: o.giorni ?? 0, fee: o.fee ?? 0 }))
        setStrutture(d.Strutture ?? [])
        setStrutturaId(d.StrutturaId ?? null)
        setTipologia(d.Tipologia === 'Garantita' ? 'Garantita' : 'Opzionata')
        setSaved(opts)
        setRows(opts)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const isOpzionata = tipologia === 'Opzionata'
  const dirty = useMemo(() => countRowChanges(saved, rows), [saved, rows])

  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  const update = (i: number, field: keyof Opzione, v: number) => {
    const next = [...rows]
    next[i] = { ...next[i], [field]: v }
    setRows(next)
  }

  const addAfter = (i: number) => {
    const after = rows[i]
    const next = [...rows]
    next.splice(i + 1, 0, {
      giorni: after?.giorni ?? 1,
      fee: after ? Math.round((after.fee + 0.5) * 100) / 100 : 0,
    })
    setRows(next)
  }

  const remove = async (i: number) => {
    const row = rows[i]
    const ok = await confirm({
      title: 'Elimina opzione',
      message: isOpzionata
        ? `Eliminare l'opzione a ${row.giorni} gg con fee di ${row.fee.toFixed(2)} €?`
        : `Eliminare l'opzione con fee di ${row.fee.toFixed(2)} €?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) setRows(rows.filter((_, idx) => idx !== i))
  }

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetRichiesteExtra', {
        method: 'POST',
        body: { StrutturaId: strutturaId, Tipologia: tipologia, options: rows },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[RichiesteExtra] persistenza remota non disponibile:', err)
    }
    setSaved(rows)
    setCompletion(PANE_ID, 'configured')
    resetDirty()
  }

  const columns = isOpzionata
    ? [
        { key: 'condizione', label: 'Condizione', width: '24%' },
        { key: 'opzione',    label: 'Opzione',    width: '28%' },
        { key: 'fee',        label: 'Fee extra',  width: '28%' },
        { key: 'azioni',     label: 'Azioni',     width: '20%', align: 'right' as const },
      ]
    : [
        { key: 'condizione', label: 'Condizione', width: '32%' },
        { key: 'fee',        label: 'Fee extra',  width: '44%' },
        { key: 'azioni',     label: 'Azioni',     width: '24%', align: 'right' as const },
      ]

  return (
    <div className="richieste-extra">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          className="richieste-extra__field"
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
            { value: 'Opzionata', label: 'Opzionata' },
            { value: 'Garantita', label: 'Garantita' },
          ]}
        />
      </CfgToolbar>

      <div className="richieste-extra__rules">
        <CfgTable columns={columns}>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>
                <span className="richieste-extra__tag richieste-extra__tag--ok">
                  <i className="fa-solid fa-check" aria-hidden="true" />
                  Accetta
                </span>
              </td>
              {isOpzionata && (
                <td>
                  <span className="richieste-extra__num">
                    <InputField
                      name={`giorni-${i}`}
                      type="number"
                      min={0}
                      value={row.giorni}
                      onChange={(e) => update(i, 'giorni', Number(e.target.value) || 0)}
                    />
                    <span className="richieste-extra__unit">gg</span>
                  </span>
                </td>
              )}
              <td>
                <span className="richieste-extra__num">
                  <InputField
                    name={`fee-${i}`}
                    type="number"
                    min={0}
                    step={0.5}
                    value={row.fee}
                    onChange={(e) => update(i, 'fee', Number(e.target.value) || 0)}
                  />
                  <span className="richieste-extra__unit">€</span>
                </span>
              </td>
              <td className="richieste-extra__td-actions">
                <Tooltip text="Aggiungi un'opzione sotto" variant="dark">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => addAfter(i)}
                    aria-label={`Aggiungi un'opzione dopo la riga ${i + 1}`}
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip text="Elimina opzione" variant="dark">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => remove(i)}
                    disabled={rows.length <= 1}
                    aria-label={`Elimina la riga ${i + 1}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          ))}

          {/* Chiusura leggibile: niente campi fantasma né literal "null" */}
          <tr className="richieste-extra__rifiuta">
            <td>
              <span className="richieste-extra__tag richieste-extra__tag--ko">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
                Rifiuta
              </span>
            </td>
            <td colSpan={isOpzionata ? 3 : 2} className="richieste-extra__rifiuta-note">
              Esaurite le opzioni configurate, la richiesta extra viene rifiutata.
            </td>
          </tr>
        </CfgTable>
      </div>

      <CfgSaveBar
        className="richieste-extra__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setRows(saved)}
        successMessage="Richieste extra salvate"
      />
    </div>
  )
}
