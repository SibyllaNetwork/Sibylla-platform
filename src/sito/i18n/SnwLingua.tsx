import React, { useEffect, useRef, useState } from 'react'
import FlagCircle from '../../core/components/FlagCircle'
import { useSitoStore } from '../useSitoStore'
import { LINGUE } from './lingue'
import { t } from '.'
import './SnwLingua.sass'

/**
 * Selettore della lingua del sito: globo + lingua corrente ("Italiano (IT)",
 * come il piè di pagina di sibyllanetwork.com) che apre l'elenco delle
 * lingue con la bandiera tonda. `su` apre l'elenco verso l'alto (piè di pagina).
 */
export default function SnwLingua({ su, valuta }: { su?: boolean; valuta?: boolean }) {
  const lingua = useSitoStore(s => s.lingua)
  const setLingua = useSitoStore(s => s.setLingua)
  const [aperto, setAperto] = useState(false)
  const rif = useRef<HTMLSpanElement>(null)
  const cur = LINGUE.find(l => l.id === lingua) ?? LINGUE[0]

  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => { if (!rif.current?.contains(e.target as Node)) setAperto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(false) }
    document.addEventListener('mousedown', fuori); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [aperto])

  return (
    <span className={`snw-lng ${su ? 'snw-lng--su' : ''}`} ref={rif}>
      <button type="button" className="snw-lng__btn" aria-haspopup="listbox" aria-expanded={aperto} aria-label={t('Lingua')} onClick={() => setAperto(v => !v)}>
        <i className="fa-solid fa-globe" aria-hidden="true" /> {cur.nome} ({cur.sigla})
        {valuta && <span className="snw-lng__val">· € EUR</span>}
        <i className="fa-solid fa-chevron-down snw-lng__giu" aria-hidden="true" />
      </button>
      {aperto && (
        <ul className="snw-lng__menu" role="listbox" aria-label={t('Lingua')}>
          {LINGUE.map(l => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={l.id === lingua} className={l.id === lingua ? 'snw-lng__on' : ''}
                onClick={() => { setLingua(l.id); setAperto(false) }} lang={l.id}>
                <FlagCircle code={l.bandiera} size={20} /> {l.nome}
                {l.id === lingua && <i className="fa-solid fa-check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
