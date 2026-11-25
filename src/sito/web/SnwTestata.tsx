import React from 'react'
import { PaginaSito, useSitoStore, versioneWeb } from '../useSitoStore'
import { SnwFoto } from '../SnwUi'
import './SnwTestata.sass'

/**
 * Intestazione delle pagine interne, nei tre formati della home:
 *  - Impatto: banda fotografica scura a tutta larghezza, titolo enorme;
 *  - Editoriale: testata da rivista (sezione, titolo con parola in corsivo,
 *    filetto, foto laterale);
 *  - Mosaico: riquadri (titolo, foto, riquadro informativo colorato).
 */
export interface Briciola { nome: string; vai?: PaginaSito }

interface Props {
  kicker: string
  titolo: string
  /** Parola finale messa in risalto (colore/corsivo secondo il formato). */
  enfasi?: string
  sotto?: string
  foto: string
  icona?: string
  briciole?: Briciola[]
  /** Contenuto extra a destra (Editoriale/Mosaico) o sotto il titolo (Impatto). */
  extra?: React.ReactNode
}

export default function SnwTestata({ kicker, titolo, enfasi, sotto, foto, icona, briciole, extra }: Props) {
  const versione = versioneWeb(useSitoStore(s => s.versione))
  const vai = useSitoStore(s => s.vai)

  const percorso = briciole && briciole.length > 0 && (
    <nav className="snw-tst__briciole" aria-label="Percorso">
      <button type="button" onClick={() => vai({ nome: 'home' })}>Home</button>
      {briciole.map(b => (
        <React.Fragment key={b.nome}>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          {b.vai ? <button type="button" onClick={() => vai(b.vai!)}>{b.nome}</button> : <span>{b.nome}</span>}
        </React.Fragment>
      ))}
    </nav>
  )
  const h1 = <h1>{titolo}{enfasi && <> <em>{enfasi}</em></>}</h1>

  if (versione === 'impatto') {
    return (
      <header className="snw-tst snw-tst--impatto">
        <SnwFoto id={foto} w={2000} h={900} alt="" className="snw-tst__foto" />
        <span className="snw-tst__velo" />
        <div className="snw__wrap snw-tst__in">
          {percorso}
          <span className="snw-tst__kicker">{icona && <i className={`fa-solid ${icona}`} aria-hidden="true" />}{kicker}</span>
          {h1}
          {sotto && <p>{sotto}</p>}
          {extra && <div className="snw-tst__extra">{extra}</div>}
        </div>
      </header>
    )
  }

  if (versione === 'editoriale') {
    return (
      <header className="snw__wrap snw-tst snw-tst--editoriale">
        {percorso}
        <div className="snw-tst__griglia">
          <div>
            <span className="snw-tst__kicker">{kicker}</span>
            {h1}
            {sotto && <p>{sotto}</p>}
            {extra && <div className="snw-tst__extra">{extra}</div>}
          </div>
          <div className="snw-tst__ritratto"><SnwFoto id={foto} w={800} h={1000} alt="" /></div>
        </div>
      </header>
    )
  }

  return (
    <header className="snw__wrap snw-tst snw-tst--mosaico">
      {percorso}
      <div className="snw-tst__tessere">
        <div className="snw-tst__t snw-tst__t--tit">
          <span className="snw-tst__kicker">{icona && <i className={`fa-solid ${icona}`} aria-hidden="true" />}{kicker}</span>
          {h1}
          {sotto && <p>{sotto}</p>}
        </div>
        <div className="snw-tst__t snw-tst__t--foto"><SnwFoto id={foto} w={900} h={700} alt="" /></div>
        {extra && <div className="snw-tst__t snw-tst__t--extra">{extra}</div>}
      </div>
    </header>
  )
}
