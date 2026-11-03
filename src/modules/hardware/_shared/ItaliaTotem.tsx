import React from 'react'
import clsx from 'clsx'
import Tooltip from '../../../core/components/Tooltip'
import { ITALY_VIEWBOX, REGIONS } from '../../purchasing/Agora/data/italyMap'
import { proietta, type StatoTotem } from '../../../store/useTotemStore'
import './ItaliaTotem.sass'

export interface PuntoTotem {
  id: string
  lat: number
  lng: number
  stato: StatoTotem
  label: string
  /** Numero di totem nello stesso punto (raggruppati per città). */
  n?: number
}

interface Props {
  punti: PuntoTotem[]
  selezionato?: string | null
  /** Regione evidenziata (filtro). */
  regione?: string
  onPick?: (id: string) => void
  onRegione?: (regione: string) => void
  className?: string
}

/**
 * Mappa d'Italia (regioni) con i totem della rete: i segnaposto sono pulsanti
 * HTML sopra l'SVG, così hanno il tooltip standard e sono raggiungibili da tastiera.
 */
export default function ItaliaTotem({ punti, selezionato, regione, onPick, onRegione, className }: Props) {
  return (
    <div className={clsx('itm', className)}>
      <svg className="itm__svg" viewBox={`0 0 ${ITALY_VIEWBOX.w} ${ITALY_VIEWBOX.h}`} aria-hidden="true">
        {REGIONS.map(r => (
          <path key={r.c} d={r.d}
            className={clsx('itm__reg', regione && r.n.startsWith(regione) && 'itm__reg--on', onRegione && 'itm__reg--click')}
            onClick={() => onRegione?.(r.n.split('/')[0])} />
        ))}
      </svg>
      {punti.map(p => {
        const { x, y } = proietta(p.lat, p.lng)
        return (
          <span key={p.id} className="itm__pin-wrap"
            style={{ '--px': `${(x / ITALY_VIEWBOX.w) * 100}%`, '--py': `${(y / ITALY_VIEWBOX.h) * 100}%` } as React.CSSProperties}>
            <Tooltip text={p.label}>
              <button type="button" aria-label={p.label}
                className={clsx('itm__pin', `itm__pin--${p.stato}`, selezionato === p.id && 'itm__pin--sel')}
                onClick={() => onPick?.(p.id)}>
                {p.n && p.n > 1 ? <span className="itm__pin-n">{p.n}</span> : <i className="fa-solid fa-display" aria-hidden="true" />}
              </button>
            </Tooltip>
          </span>
        )
      })}
    </div>
  )
}
