import React from 'react'
import clsx from 'clsx'
import { withAcronimi } from '../components/Acronimo'
import './CfgTable.sass'

// ─── CFG TABLE (tabella standard dei pane) ───────────────────────────────────
//  Wrapper su `.sib-table` / `.sib-table-wrap` (lo standard piattaforma) con:
//   • colgroup in % (`width` per colonna) + `table-layout: fixed`, così le
//     colonne non spingono mai la tabella in overflow orizzontale;
//   • sigle nelle intestazioni (B.A.R., PEC, SDI…) spiegate all'hover;
//   • empty state integrato quando non ci sono righe;
//   • nessuno scroll-x a nessuna larghezza (overflow-x: hidden sul wrap:
//     i testi lunghi nelle celle vanno troncati con TruncatedText).
//
//  Le righe si passano come children (`<tr>…</tr>`): il componente governa
//  solo colgroup, thead e lo stato vuoto.

export interface CfgColumn {
  key: string
  /** Titolo colonna: stringa o nodo (es. TruncatedText per abbreviazioni puntate + tooltip). */
  label: React.ReactNode
  /** Larghezza in % (es. '22%'). Con almeno una larghezza il layout è fixed. */
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface CfgTableProps {
  columns: CfgColumn[]
  /** Righe `<tr>` della tabella. */
  children?: React.ReactNode
  /** Mostrato al posto del body quando non ci sono righe. */
  empty?: React.ReactNode
  className?: string
}

export default function CfgTable({ columns, children, empty, className }: CfgTableProps) {
  const rowCount = React.Children.count(children)
  const hasWidths = columns.some(c => c.width)

  return (
    <div className={clsx('sib-table-wrap', 'cfg-table', className)}>
      <table className={clsx('sib-table', hasWidths && 'cfg-table__fixed')}>
        <colgroup>
          {columns.map(c => (
            /* --cfg-col-w: larghezza dinamica della colonna (custom property,
               letta dal .sass — l'inline style diretto è vietato) */
            <col key={c.key} style={{ ['--cfg-col-w' as any]: c.width ?? 'auto' }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={clsx(c.align && `cfg-table__th--${c.align}`)}>
                {withAcronimi(c.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowCount > 0 ? children : (
            <tr className="cfg-table__empty-row">
              <td colSpan={columns.length}>
                {empty ?? <span className="cfg-table__empty-text">Nessun elemento configurato</span>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
