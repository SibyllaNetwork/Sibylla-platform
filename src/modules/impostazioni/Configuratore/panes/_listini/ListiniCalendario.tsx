import React from 'react'
import clsx from 'clsx'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import type { LstStagione } from './listiniData'
import './ListiniCalendario.sass'

// ─── CALENDARIO DI RIEPILOGO DEI LISTINI ─────────────────────────────────────
//  Tabella-matrice condivisa dai pane Listini individuali e Listini gruppi:
//  righe = entità (tipologie camera / lotti), colonne = stagionalità. Ogni
//  intestazione di stagione porta il periodo nel tooltip dark; la stagione
//  attiva nel pane è evidenziata. Matrice di confronto: layout fisso in %,
//  nessuno scroll orizzontale.

export interface CalendarioCell {
  text: string
  /** Testo esteso mostrato all'hover (tooltip dark). */
  tooltip?: string
}

export interface CalendarioRow {
  id: string
  label: string
}

export interface ListiniCalendarioProps {
  /** Etichetta della prima colonna ("Tipologia", "Lotto", …). */
  firstColLabel: string
  seasons: LstStagione[]
  rows: CalendarioRow[]
  /** Valore di cella; null → em dash. */
  value: (rowId: string, seasonId: string) => CalendarioCell | null
  /** Stagione selezionata nel pane: colonna evidenziata. */
  activeSeasonId?: string
  /** Riga di legenda sotto la tabella (es. "Adulti / Studenti"). */
  legend?: string
  className?: string
}

export default function ListiniCalendario({
  firstColLabel, seasons, rows, value, activeSeasonId, legend, className,
}: ListiniCalendarioProps) {
  const seasonWidth = `${Math.round(70 / Math.max(seasons.length, 1))}%`

  return (
    <div className={clsx('lst-cal', className)}>
      <div className="sib-table-wrap lst-cal__wrap">
        <table className="sib-table lst-cal__table">
          <colgroup>
            <col className="lst-cal__col-first" />
            {seasons.map(s => (
              /* --lst-col-w: larghezza dinamica della colonna stagione
                 (custom property letta dal .sass, mai inline style diretto) */
              <col key={s.id} style={{ ['--lst-col-w' as any]: seasonWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>{firstColLabel}</th>
              {seasons.map(s => (
                <th
                  key={s.id}
                  className={clsx('lst-cal__season', s.id === activeSeasonId && 'lst-cal__season--active')}
                >
                  <Tooltip text={s.periodo}>
                    <span className="lst-cal__season-name">
                      {s.nome}
                      <i className="fa-solid fa-calendar-days lst-cal__season-icon" aria-hidden="true" />
                    </span>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>
                  <TruncatedText text={row.label} className="lst-cal__row-label" />
                </td>
                {seasons.map(s => {
                  const cell = value(row.id, s.id)
                  const content = cell
                    ? <span className="lst-cal__value">{cell.text}</span>
                    : <span className="lst-cal__missing">—</span>
                  return (
                    <td
                      key={s.id}
                      className={clsx('lst-cal__cell', s.id === activeSeasonId && 'lst-cal__cell--active')}
                    >
                      {cell?.tooltip
                        ? <Tooltip text={cell.tooltip}>{content}</Tooltip>
                        : content}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {legend && <p className="lst-cal__legend">{legend}</p>}
    </div>
  )
}
