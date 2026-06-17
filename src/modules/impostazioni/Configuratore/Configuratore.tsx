import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import {
  MAIN_ITEMS,
  FNB_ITEMS,
  type ConfiguratoreId,
  type ConfiguratoreItem,
} from './configuratoriList'
import { useAccessStore, allowedConfiguratoreIds } from '../../../store/useAccessStore'
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
import OutletConfig, { hasOutletConfig } from '../../operation/Outlet/OutletConfig'

const DEFAULT_ID: ConfiguratoreId = 'scaglioni-occupazione'

export default function Configuratore({ navigate }: { navigate: (p: string) => void }) {
  // Voci visibili in base al profilo loggato: il modulo Ristoranti mostra solo le
  // voci Food & Beverage (allowed = null → nessun limite, es. Full Suite/Admin).
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const modules          = useAccessStore(s => s.modules)
  const allowed = useMemo(() => {
    if (!currentProfileId) return null
    const profile = profiles.find(p => p.id === currentProfileId)
    return profile ? allowedConfiguratoreIds(profile, modules) : null
  }, [currentProfileId, profiles, modules])
  const mainItems = useMemo(() => allowed ? MAIN_ITEMS.filter(i => allowed.has(i.id)) : MAIN_ITEMS, [allowed])
  const fnbItems  = useMemo(() => allowed ? FNB_ITEMS.filter(i => allowed.has(i.id)) : FNB_ITEMS, [allowed])
  const onlyFnb = mainItems.length === 0 && fnbItems.length > 0

  const [activeId, setActiveId] = useState<ConfiguratoreId>(onlyFnb ? (fnbItems[0]?.id ?? DEFAULT_ID) : DEFAULT_ID)
  const [subpage, setSubpage]   = useState(onlyFnb)
  const [query, setQuery]       = useState('')

  const sourceItems = subpage ? fnbItems : mainItems

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sourceItems
    return sourceItems.filter(it => it.label.toLowerCase().includes(q))
  }, [sourceItems, query])

  const activeLabel = useMemo(() => {
    const all: ConfiguratoreItem[] = [...MAIN_ITEMS, ...FNB_ITEMS]
    return all.find(it => it.id === activeId)?.label ?? ''
  }, [activeId])

  const openFnb = () => {
    setSubpage(true)
    setQuery('')
  }
  const backToMain = () => {
    setSubpage(false)
    setQuery('')
  }

  return (
    <div className="configuratore">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Configuratore"
        subtitle="Personalizza il sistema per una gestione efficiente e su misura"
      />

      <div className="configuratore__layout">
        <aside className={'configuratore__sidebar' + (subpage ? ' configuratore__sidebar--subpage' : '')}>
          <div className="configuratore__sidebar-head">
            {subpage && mainItems.length > 0 && (
              <button
                type="button"
                className="configuratore__crumb"
                onClick={backToMain}
                aria-label="Torna alla lista configuratori"
              >
                <i className="fa-light fa-arrow-left configuratore__crumb-arrow" />
                <span>Tutti i configuratori</span>
                <span className="configuratore__crumb-sep">/</span>
                <span className="configuratore__crumb-current">F&amp;B</span>
              </button>
            )}

            <div className="configuratore__search">
              <i className="fa-light fa-magnifying-glass configuratore__search-icon" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={subpage ? 'Cerca in F&B...' : 'Cerca...'}
                className="configuratore__search-input"
                aria-label="Cerca configuratore"
              />
            </div>
          </div>

          <div className="configuratore__list">
            {filtered.length === 0 ? (
              <div className="configuratore__empty-list">Nessun risultato</div>
            ) : (
              <>
                {filtered.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={'configuratore__item' + (activeId === item.id ? ' configuratore__item--active' : '')}
                    onClick={() => setActiveId(item.id)}
                  >
                    <i className={`fa-light fa-${item.icon} configuratore__item-icon`} aria-hidden="true" />
                    <span className="configuratore__item-label">{item.label}</span>
                  </button>
                ))}

                {!subpage && !query.trim() && fnbItems.length > 0 && (
                  <button
                    type="button"
                    className="configuratore__item configuratore__item--category"
                    onClick={openFnb}
                  >
                    <i className="fa-light fa-utensils configuratore__item-icon" aria-hidden="true" />
                    <span className="configuratore__item-label">Food &amp; Beverage</span>
                    <span className="configuratore__badge">{fnbItems.length}</span>
                    <i className="fa-light fa-chevron-right configuratore__item-chev" aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>
        </aside>

        <section className="configuratore__pane">
          {/* Le pagine Outlet hanno già il proprio PageHeader: evita il titolo doppio */}
          {!hasOutletConfig(activeId) && (
            <div className="configuratore__pane-head">
              <h2 className="configuratore__pane-title">{activeLabel}</h2>
            </div>
          )}
          <PaneSwitch id={activeId} label={activeLabel} />
        </section>
      </div>
    </div>
  )
}

function PaneSwitch({ id, label }: { id: ConfiguratoreId; label: string }) {
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
    // Pagine di configurazione Food & Beverage → Outlet Manager (sub-app reale)
    default:
      return hasOutletConfig(id)
        ? <OutletConfig id={id} />
        : <PlaceholderPane label={label} />
  }
}

function PlaceholderPane({ label }: { label: string }) {
  return (
    <div className="configuratore__placeholder">
      <p className="configuratore__placeholder-desc">
        Configurazione di {label.toLowerCase()}.
      </p>
    </div>
  )
}
