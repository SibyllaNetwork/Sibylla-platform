import React from 'react'
import { FOTO, PARTNER } from '../sitoData'
import { PAGINE_INFO, PRODOTTI_ECOSISTEMA } from '../sitoContenuti'
import { PaginaInfo, useSitoStore } from '../useSitoStore'
import { t } from '../i18n'
import { SnwFoto } from '../SnwUi'
import SnwTestata from './SnwTestata'
import './SnwRete.sass'

/**
 * La rete: indice delle pagine istituzionali (Chi siamo, Partner, I.M.T.,
 * Lavora con noi, Contatti, Dati societari) più i tre prodotti
 * dell'ecosistema per le imprese.
 */
const VOCI: PaginaInfo[] = ['chi-siamo', 'partner', 'imt', 'lavora', 'contatti', 'societa']

export default function SnwRete({ ancora }: { ancora?: string }) {
  const vai = useSitoStore(s => s.vai)
  // Compatibilità con i vecchi link alle sezioni (#contatti, #partner…)
  React.useEffect(() => {
    if (ancora && (VOCI as string[]).includes(ancora)) vai({ nome: 'info', id: ancora as PaginaInfo })
  }, [ancora, vai])
  const aziende = Object.values(PARTNER).reduce((a, l) => a + l.length, 0)

  return (
    <div className="snw-rete">
      <SnwTestata kicker="Sibylla Network" titolo={t('La rete che fa')} enfasi={t('turismo')} foto={FOTO.sanPietro} icona="fa-circle-nodes"
        sotto={t("Strutture, tour operator e fornitori che lavorano insieme per offrire ai viaggiatori un'Italia autentica e alle imprese più valore.")}
        briciole={[{ nome: t('La rete') }]}
        extra={<span className="snw-rete__aziende"><b>{aziende}</b> {t('aziende associate in 3 categorie')}</span>} />

      <div className="snw__wrap">
        <section className="snw-rete__griglia snw-reveal">
          {VOCI.map((k, i) => {
            const p = PAGINE_INFO[k]
            return (
              <button key={k} type="button" className={`snw-rete__voce snw-rete__voce--${i}`} onClick={() => vai({ nome: 'info', id: k })}>
                {i < 2 && <span className="snw-rete__foto"><SnwFoto id={p.foto} w={900} h={600} alt="" /></span>}
                <span className="snw-rete__txt">
                  <i className={`fa-light ${p.icona}`} aria-hidden="true" />
                  <small>{t(p.kicker)}</small>
                  <b>{t(p.titolo)} {t(p.enfasi ?? '')}</b>
                  <span>{t(p.sotto)}</span>
                  <em>{t('Apri')} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></em>
                </span>
              </button>
            )
          })}
        </section>

        <section className="snw-rete__eco snw-reveal">
          <h2>{t("L'ecosistema per le imprese")}</h2>
          <div>
            {PRODOTTI_ECOSISTEMA.map(e => (
              <a key={e.nome} href={e.url} target="_blank" rel="noreferrer">
                <i className={`fa-light ${e.icona}`} aria-hidden="true" />
                <span><small>{t('Per ' + e.per.toLowerCase())}</small><b>{e.nome}</b></span>
                <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
