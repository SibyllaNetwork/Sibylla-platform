import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { GROUPS, type ConfiguratoreId } from './configuratoriList'
import './Configuratore.sass'

import ScaglioniOccupazione   from './panes/ScaglioniOccupazione/ScaglioniOccupazione'
import FinestrePrenotazione   from './panes/FinestrePrenotazione/FinestrePrenotazione'
import RichiesteExtra         from './panes/RichiesteExtra/RichiesteExtra'
import Stagionalita           from './panes/Stagionalita/Stagionalita'
import PersonalizzaStruttura  from './panes/PersonalizzaStruttura/PersonalizzaStruttura'
import CamereMapping          from './panes/CamereMapping/CamereMapping'
import OverbookingLimit       from './panes/OverbookingLimit/OverbookingLimit'
import BufferPresenze         from './panes/BufferPresenze/BufferPresenze'
import MappingSegmentoMercato from './panes/MappingSegmentoMercato/MappingSegmentoMercato'
import LottiMapping           from './panes/LottiMapping/LottiMapping'
import ListiniIndividuali     from './panes/ListiniIndividuali/ListiniIndividuali'
import ListiniGruppi          from './panes/ListiniGruppi/ListiniGruppi'
import PolitichePrenotazione  from './panes/PolitichePrenotazione/PolitichePrenotazione'
import Contratti              from './panes/Contratti/Contratti'
import MarketSpecifics        from './panes/MarketSpecifics/MarketSpecifics'
import BarFit                 from './panes/BarFit/BarFit'
import Arrangiamenti          from './panes/Arrangiamenti/Arrangiamenti'
import BottomRate             from './panes/BottomRate/BottomRate'
import VincoloMatriosca       from './panes/VincoloMatriosca/VincoloMatriosca'
import FasceEta               from './panes/FasceEta/FasceEta'
import VociIncasso            from './panes/VociIncasso/VociIncasso'
import ConfiguraOutlet        from './panes/ConfiguraOutlet/ConfiguraOutlet'
import FbImpostazioni         from './panes/FbImpostazioni/FbImpostazioni'
import FbVociMenu             from './panes/FbVociMenu/FbVociMenu'
import FbCreaMenu             from './panes/FbCreaMenu/FbCreaMenu'
import FbListaMenu            from './panes/FbListaMenu/FbListaMenu'
import FbAllergeni            from './panes/FbAllergeni/FbAllergeni'
import FbGestioneCosti        from './panes/FbGestioneCosti/FbGestioneCosti'

/**
 * Pagina Configuratore — sidebar interna raggruppata in macro-aree
 * collassabili (Occupazione, Tariffe, Booking, Struttura, Contabilità, F&B).
 */
export default function Configuratore({ navigate }: { navigate: (p: string) => void }) {
  const [activeId, setActiveId] = useState<ConfiguratoreId | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of GROUPS) init[g.id] = !!g.defaultOpen
    return init
  })

  const toggleGroup = (id: string) => setOpenGroups((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div className="configuratore">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Configuratore" subtitle="Personalizza il sistema per una gestione efficiente e su misura" />

      <div className="configuratore__layout">
        <aside className="configuratore__sidebar">
          <div className="configuratore__sidebar-title">Lista configuratori</div>

          <ul className="configuratore__list">
            {GROUPS.map((group) => {
              const open = openGroups[group.id]
              return (
                <li key={group.id} className="configuratore__group">
                  <button
                    type="button"
                    className={'configuratore__group-header' + (open ? ' configuratore__group-header--open' : '')}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <i className={`fa-light fa-${group.icon} configuratore__group-icon`} />
                    <span>{group.label}</span>
                    <i className={'fa-light fa-chevron-down configuratore__chevron' + (open ? ' configuratore__chevron--open' : '')} />
                  </button>

                  {open && (
                    <ul className="configuratore__group-items">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className={'configuratore__item' + (activeId === item.id ? ' configuratore__item--active' : '')}
                          onClick={() => setActiveId(item.id)}
                        >
                          <i className={`fa-light fa-${item.icon} configuratore__icon`} />
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="configuratore__pane">
          <PaneSwitch id={activeId} />
        </section>
      </div>
    </div>
  )
}

function PaneSwitch({ id }: { id: ConfiguratoreId | null }) {
  if (!id) return <div className="configuratore__empty">Seleziona un configuratore dalla lista a sinistra.</div>

  switch (id) {
    case 'scaglioni-occupazione':    return <ScaglioniOccupazione />
    case 'finestre-prenotazione':    return <FinestrePrenotazione />
    case 'richieste-extra':          return <RichiesteExtra />
    case 'stagionalita':             return <Stagionalita />
    case 'personalizza-struttura':   return <PersonalizzaStruttura />
    case 'camere-mapping':           return <CamereMapping />
    case 'overbooking-limit':        return <OverbookingLimit />
    case 'buffer-presenze':          return <BufferPresenze />
    case 'mapping-segmento-mercato': return <MappingSegmentoMercato />
    case 'lotti-mapping':            return <LottiMapping />
    case 'listini-individuali':      return <ListiniIndividuali />
    case 'listini-gruppi':           return <ListiniGruppi />
    case 'politiche-prenotazione':   return <PolitichePrenotazione />
    case 'contratti':                return <Contratti />
    case 'market-specifics':         return <MarketSpecifics />
    case 'bar-fit':                  return <BarFit />
    case 'arrangiamenti':            return <Arrangiamenti />
    case 'bottom-rate':              return <BottomRate />
    case 'vincolo-matriosca':        return <VincoloMatriosca />
    case 'fasce-eta':                return <FasceEta />
    case 'voci-incasso':             return <VociIncasso />
    case 'configura-outlet':         return <ConfiguraOutlet />
    case 'fb-impostazioni':          return <FbImpostazioni />
    case 'fb-voci-menu':             return <FbVociMenu />
    case 'fb-crea-menu':             return <FbCreaMenu />
    case 'fb-lista-menu':            return <FbListaMenu />
    case 'fb-allergeni':             return <FbAllergeni />
    case 'fb-gestione-costi':        return <FbGestioneCosti />
  }
}
