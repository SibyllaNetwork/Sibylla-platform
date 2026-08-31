import React, { useMemo } from 'react'
import clsx from 'clsx'
import InputField from '../components/form/InputField'
import Tooltip from '../components/Tooltip'
import { useConfirmStore } from '../../store/useConfirmStore'
import './CfgRangeRules.sass'

// ─── CFG RANGE RULES (tabella-regole a intervalli) ───────────────────────────
//  Componente UNICO per le regole a intervalli `Dal / Al` che prima erano
//  scritte tre volte (Scaglioni occupazione, Finestre prenotazione, Richieste
//  extra). Requisiti espliciti del brief (§4.7/4.8):
//   • unità configurabile (%, gg, €) accanto ai valori;
//   • niente spinner nei number input (frecce nascoste dal .sass);
//   • «+» e cestino SULLA STESSA RIGA della regola;
//   • layout compatto e verticalmente denso (niente fasce bianche);
//   • validazione di continuità / non-sovrapposizione con messaggio inline.
//  L'eliminazione di una riga passa SEMPRE da useConfirmStore.

export interface CfgRangeRow {
  from: number
  to: number
}

export interface CfgRangeExtraColumn {
  key: string
  label: string
  /** Cella extra della riga i (es. una SelectField di tipologia). */
  render: (rowIndex: number) => React.ReactNode
  /** Larghezza CSS della colonna nella griglia (default 'minmax(120px, 1fr)'). */
  width?: string
}

export interface CfgRangeRulesProps {
  rows: CfgRangeRow[]
  onChange: (rows: CfgRangeRow[]) => void
  /** Unità mostrata accanto ai valori: '%', 'gg', '€', … */
  unit: string
  fromLabel?: string
  toLabel?: string
  /** Estremi ammessi della scala (es. 0/100 per le percentuali). */
  min?: number
  max?: number
  /** Colonne aggiuntive per riga (es. tipologia della richiesta extra). */
  extraColumns?: CfgRangeExtraColumn[]
  /** Costruisce la riga inserita dal «+» (default: intervallo contiguo di 5 unità). */
  makeRow?: (after: CfgRangeRow | null) => CfgRangeRow
  /** Etichetta del bottone di coda (default 'Aggiungi intervallo'). */
  addLabel?: string
  /** Nome dell'entità nella conferma di eliminazione (default 'intervallo'). */
  entityName?: string
  /** Il «Dal» della prima riga è fissato (default true: la scala parte da `min`). */
  lockFirstFrom?: boolean
  disabled?: boolean
  className?: string
}

interface Validation {
  /** Indici delle righe in errore (sovrapposizione o intervallo invertito). */
  errorRows: Set<number>
  /** Messaggio inline: primo problema trovato. */
  message: string | null
  kind: 'error' | 'warning' | null
}

function validate(rows: CfgRangeRow[], unit: string, min?: number, max?: number): Validation {
  const errorRows = new Set<number>()
  let message: string | null = null
  let kind: Validation['kind'] = null

  const fail = (i: number, msg: string) => {
    errorRows.add(i)
    if (!message || kind !== 'error') { message = msg; kind = 'error' }
  }
  const warn = (msg: string) => {
    if (!message) { message = msg; kind = 'warning' }
  }

  rows.forEach((r, i) => {
    if (r.to <= r.from) fail(i, `Intervallo ${i + 1}: «Al» (${r.to}${unit}) deve essere maggiore di «Dal» (${r.from}${unit}).`)
    if (min != null && r.from < min) fail(i, `Intervallo ${i + 1}: «Dal» non può scendere sotto ${min}${unit}.`)
    if (max != null && r.to > max) fail(i, `Intervallo ${i + 1}: «Al» non può superare ${max}${unit}.`)
    if (i > 0) {
      const prev = rows[i - 1]
      if (r.from < prev.to) {
        fail(i, `Gli intervalli ${i} e ${i + 1} si sovrappongono: «Dal» (${r.from}${unit}) è minore dell'«Al» precedente (${prev.to}${unit}).`)
      } else if (r.from > prev.to) {
        warn(`Scala non continua: tra ${prev.to}${unit} e ${r.from}${unit} resta un intervallo scoperto.`)
      }
    }
  })

  return { errorRows, message, kind }
}

/**
 * True se le righe presentano errori BLOCCANTI (intervalli invertiti,
 * sovrapposizioni, estremi fuori scala). I pane la usano per il gating del
 * «Salva»: la CfgRangeRules mostra già il messaggio inline, questa espone lo
 * stesso verdetto senza duplicare la logica di validazione.
 */
export function cfgRangeHasErrors(rows: CfgRangeRow[], min?: number, max?: number): boolean {
  return validate(rows, '', min, max).errorRows.size > 0
}

export default function CfgRangeRules({
  rows, onChange, unit,
  fromLabel = 'Dal', toLabel = 'Al',
  min, max,
  extraColumns = [],
  makeRow,
  addLabel = 'Aggiungi intervallo',
  entityName = 'intervallo',
  lockFirstFrom = true,
  disabled = false,
  className,
}: CfgRangeRulesProps) {
  const confirm = useConfirmStore(s => s.confirm)
  const validation = useMemo(() => validate(rows, unit, min, max), [rows, unit, min, max])

  const update = (i: number, field: 'from' | 'to', value: number) => {
    const next = [...rows]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  const addAfter = (i: number) => {
    const after = rows[i] ?? null
    const created = makeRow
      ? makeRow(after)
      : { from: after?.to ?? min ?? 0, to: (after?.to ?? min ?? 0) + 5 }
    const next = [...rows]
    next.splice(i + 1, 0, created)
    onChange(next)
  }

  const remove = async (i: number) => {
    const row = rows[i]
    const ok = await confirm({
      title: 'Elimina intervallo',
      message: `Eliminare l'${entityName} ${row.from}${unit} – ${row.to}${unit}?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) onChange(rows.filter((_, idx) => idx !== i))
  }

  /* --cfg-rr-extra: template delle colonne extra della griglia (custom property
     dinamica letta dal .sass — l'inline style diretto è vietato) */
  const extraTemplate = extraColumns.map(c => c.width ?? 'minmax(120px, 1fr)').join(' ')

  return (
    <div
      className={clsx(
        'cfg-range-rules',
        extraColumns.length > 0 && 'cfg-range-rules--has-extra',
        disabled && 'cfg-range-rules--disabled',
        className,
      )}
      style={{ ['--cfg-rr-extra' as any]: extraTemplate || undefined }}
      role="table"
      aria-label="Regole a intervalli"
    >
      <div className="cfg-range-rules__head" role="row">
        <span role="columnheader">{fromLabel}</span>
        <span role="columnheader">{toLabel}</span>
        {extraColumns.map(c => <span key={c.key} role="columnheader">{c.label}</span>)}
        <span role="columnheader" className="cfg-range-rules__head-actions">Azioni</span>
      </div>

      {rows.map((row, i) => (
        <div
          key={i}
          className={clsx('cfg-range-rules__row', validation.errorRows.has(i) && 'cfg-range-rules__row--error')}
          role="row"
        >
          <div className="cfg-range-rules__cell" role="cell">
            <InputField
              name={`range-from-${i}`}
              type="number"
              value={row.from}
              min={min}
              max={max}
              disabled={disabled || (lockFirstFrom && i === 0)}
              onChange={e => update(i, 'from', Number(e.target.value) || 0)}
              className="cfg-range-rules__input"
            />
            <span className="cfg-range-rules__unit">{unit}</span>
          </div>
          <div className="cfg-range-rules__cell" role="cell">
            <InputField
              name={`range-to-${i}`}
              type="number"
              value={row.to}
              min={min}
              max={max}
              disabled={disabled}
              onChange={e => update(i, 'to', Number(e.target.value) || 0)}
              className="cfg-range-rules__input"
            />
            <span className="cfg-range-rules__unit">{unit}</span>
          </div>
          {extraColumns.map(c => (
            <div key={c.key} className="cfg-range-rules__cell cfg-range-rules__cell--extra" role="cell">
              {c.render(i)}
            </div>
          ))}
          <div className="cfg-range-rules__actions" role="cell">
            <Tooltip text="Aggiungi un intervallo sotto" variant="dark">
              <button
                type="button"
                className="cfg-range-rules__act"
                onClick={() => addAfter(i)}
                disabled={disabled}
                aria-label={`Aggiungi un intervallo dopo la riga ${i + 1}`}
              >
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Elimina intervallo" variant="dark">
              <button
                type="button"
                className="cfg-range-rules__act"
                onClick={() => remove(i)}
                disabled={disabled || rows.length <= 1}
                aria-label={`Elimina la riga ${i + 1}`}
              >
                <i className="fa-solid fa-trash" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      ))}

      {validation.message && (
        <div
          className={clsx('cfg-range-rules__msg', `cfg-range-rules__msg--${validation.kind}`)}
          role="alert"
        >
          <i
            className={validation.kind === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-triangle-exclamation'}
            aria-hidden="true"
          />
          <span>{validation.message}</span>
        </div>
      )}

      <button
        type="button"
        className="cfg-range-rules__add"
        onClick={() => addAfter(rows.length - 1)}
        disabled={disabled}
      >
        <i className="fa-solid fa-plus" aria-hidden="true" />
        <span>{addLabel}</span>
      </button>
    </div>
  )
}
