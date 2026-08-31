import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { CfgPane, CfgLocked, CfgEmpty, cfgPrefersReducedMotion } from '../../../core/cfg'
import {
  CFG_GROUPS,
  CONFIGURATORI,
  cfgGroupById,
  configuratoreById,
  isConfiguratoreId,
  type ConfiguratoreDef,
  type ConfiguratoreId,
} from './registry'
import {
  useConfiguratoreStore,
  displayStatusOf,
  type CfgCompletion,
} from '../../../store/useConfiguratoreStore'
import { useAccessStore, allowedConfiguratoreIds } from '../../../store/useAccessStore'
import { useModuliStore } from '../../../store/useModuliStore'
import { useConfirmStore } from '../../../store/useConfirmStore'
import ConfiguratoreHub from './ConfiguratoreHub'
import ConfiguratoreSidebar, { type SidebarLane } from './ConfiguratoreSidebar'
import ConfiguratorePalette from './ConfiguratorePalette'
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
import MarketSpecifics        from './panes/MarketSpecifics/MarketSpecifics'
import BarFit                 from './panes/BarFit/BarFit'
import Arrangiamenti          from './panes/Arrangiamenti/Arrangiamenti'
import BottomRate             from './panes/BottomRate/BottomRate'
import VincoloMatriosca       from './panes/VincoloMatriosca/VincoloMatriosca'
import FasceEta               from './panes/FasceEta/FasceEta'
import VociIncasso            from './panes/VociIncasso/VociIncasso'
import ConfiguraOutlet        from './panes/ConfiguraOutlet/ConfiguraOutlet'
import TurniServizio          from './panes/TurniServizio/TurniServizio'
import CategorieMenu          from './panes/CategorieMenu/CategorieMenu'
import VociMenu               from './panes/VociMenu/VociMenu'
import CreaMenu               from './panes/CreaMenu/CreaMenu'
import ListaMenu              from './panes/ListaMenu/ListaMenu'
import MenuGiorno             from './panes/MenuGiorno/MenuGiorno'
import WebMenu                from './panes/WebMenu/WebMenu'
import Gateway                from './panes/Gateway/Gateway'
import IntestazioniFiscali    from './panes/IntestazioniFiscali/IntestazioniFiscali'
import BusinessCentral        from './panes/BusinessCentral/BusinessCentral'
import CostiMapping           from './panes/CostiMapping/CostiMapping'
import OutletConfig, { hasOutletConfig } from '../../operation/Outlet/OutletConfig'
// Le voci F&B «Crea outlet» e «Sale e tavoli» sono LE STESSE pagine di
// Impostazioni → Il mio business: si montano qui in modalità embedded (senza il
// loro PageHead, che nel pane lo dà CfgPane), non si duplicano.
import SaleTavoli from '../../operation/SaleTavoli/SaleTavoli'
import CreaStruttura from '../CreaStruttura/CreaStruttura'

// ─── SHELL DEL CONFIGURATORE ─────────────────────────────────────────────────
//  "Configuratore come percorso guidato": hub d'ingresso con le 7 corsie
//  tematiche, sidebar a gruppi collassabili con indicatore che scorre,
//  command palette (⌘K) e transizioni tra i pane. Il titolo di pagina è UNO
//  (PageHead); breadcrumb e titolo della voce vivono in CfgPane.
//
//  Preservati: filtro voci per profilo (allowedConfiguratoreIds), caso
//  "solo F&B", deep link `configuratore:<id>` (id spariti come `contratti` →
//  fallback pulito sull'hub), conferma di abbandono con modifiche pendenti.

/** Props opzionali dei pane: navigazione verso un altro configuratore (es. il
 *  prerequisito citato dentro la pagina). I pane che non navigano la ignorano. */
export interface CfgPaneComponentProps {
  onGoTo?: (id: ConfiguratoreId) => void
  /** Navigazione di piattaforma: serve ai pane che montano pagine intere. */
  navigate?: (page: string) => void
}

/**
 * F&B → Sale e tavoli: stessa pagina di Il mio business, ma qui è il posto dove
 * le sale si DEFINISCONO (crea, rinomina, elimina, composizione della
 * planimetria). Là la stessa pagina è di sola consultazione.
 */
const FbSaleTavoli = ({ navigate }: CfgPaneComponentProps) => (
  <SaleTavoli embedded editable navigate={navigate} />
)

/** F&B → Crea outlet: identica a Il mio business → Crea outlet (picker su Outlet). */
const FbCreaOutlet = ({ navigate }: CfgPaneComponentProps) => (
  <CreaStruttura embedded autoOpenType="outlet" navigate={navigate ?? (() => {})} />
)

const PANES: Partial<Record<ConfiguratoreId, React.ComponentType<CfgPaneComponentProps>>> = {
  'scaglioni-occupazione':    ScaglioniOccupazione,
  'finestre-prenotazione':    FinestrePrenotazione,
  'richieste-extra':          RichiesteExtra,
  'stagionalita':             Stagionalita,
  'personalizza-struttura':   PersonalizzaStruttura,
  'camere-mapping':           CamereMapping,
  'overbooking-limit':        OverbookingLimit,
  'buffer-presenze':          BufferPresenze,
  'mapping-segmento-mercato': MappingSegmentoMercato,
  'lotti-mapping':            LottiMapping,
  'listini-individuali':      ListiniIndividuali,
  'listini-gruppi':           ListiniGruppi,
  'politiche-prenotazione':   PolitichePrenotazione,
  'market-specifics':         MarketSpecifics,
  'bar-fit':                  BarFit,
  'arrangiamenti':            Arrangiamenti,
  'bottom-rate':              BottomRate,
  'vincolo-matriosca':        VincoloMatriosca,
  'fasce-eta':                FasceEta,
  'voci-incasso':             VociIncasso,
  'configura-outlet':         ConfiguraOutlet,
  // Voci F&B servite dalle pagine native, non dalla sub-app Outlet Manager
  'fb-sale-tavoli':           FbSaleTavoli,
  'fb-outlet':                FbCreaOutlet,
  'fb-turni':                 TurniServizio,
  'fb-categorie':             CategorieMenu,
  'fb-voci-menu':             VociMenu,
  'fb-crea-menu':             CreaMenu,
  'fb-lista-menu':            ListaMenu,
  'fb-menu-giorno':           MenuGiorno,
  'fb-web-menu':              WebMenu,
  'gateway':                  Gateway,
  'intestazioni-fiscali':     IntestazioniFiscali,
  'business-central':         BusinessCentral,
  'costi-mapping':            CostiMapping,
}

export default function Configuratore({ navigate, initialPane }: { navigate: (p: string) => void; initialPane?: string }) {
  // ── Voci visibili in base al profilo loggato (es. modulo Ristoranti = solo F&B)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const modules          = useModuliStore(s => s.moduli)
  const allowed = useMemo(() => {
    if (!currentProfileId) return null
    const profile = profiles.find(p => p.id === currentProfileId)
    return profile ? allowedConfiguratoreIds(profile, modules) : null
  }, [currentProfileId, profiles, modules])

  const visibleDefs = useMemo(
    () => (allowed ? CONFIGURATORI.filter(d => allowed.has(d.id)) : CONFIGURATORI),
    [allowed],
  )

  // ── Stato di completamento + dirty state (store della sezione)
  const completion = useConfiguratoreStore(s => s.completion)
  const dirtyCount = useConfiguratoreStore(s => s.dirtyCount)
  const resetDirty = useConfiguratoreStore(s => s.resetDirty)
  const confirm    = useConfirmStore(s => s.confirm)

  const lanes: SidebarLane[] = useMemo(() =>
    CFG_GROUPS
      .map(group => {
        const items = visibleDefs
          .filter(d => d.group === group.id)
          .map(def => ({ def, status: displayStatusOf(completion, def.id) }))
        return {
          group,
          items,
          configured: items.filter(i => i.status === 'configured').length,
          total: items.length,
        }
      })
      .filter(lane => lane.items.length > 0),
  [visibleDefs, completion])

  // ── Vista corrente: null = hub; deep link non valido (es. `contratti`) → hub
  const validInitial = initialPane
    && isConfiguratoreId(initialPane)
    && visibleDefs.some(d => d.id === initialPane)
    ? (initialPane as ConfiguratoreId)
    : null
  const [activeId, setActiveId] = useState<ConfiguratoreId | null>(validInitial)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [entering, setEntering] = useState(false)

  // Cambio voce con guardia sul dirty state (conferma di abbandono)
  const guardedGo = async (id: ConfiguratoreId | null) => {
    if (id === activeId) return
    if (dirtyCount > 0) {
      const ok = await confirm({
        title: 'Modifiche non salvate',
        message: dirtyCount === 1
          ? "C'è 1 modifica non salvata: uscendo da questa voce andrà persa."
          : `Ci sono ${dirtyCount} modifiche non salvate: uscendo da questa voce andranno perse.`,
        confirmLabel: 'Abbandona',
        cancelLabel: 'Resta',
        danger: true,
      })
      if (!ok) return
      resetDirty()
    }
    setActiveId(id)
  }

  // Skeleton breve alla transizione tra le voci (disattivato con reduced motion)
  useEffect(() => {
    if (!activeId || cfgPrefersReducedMotion()) {
      setEntering(false)
      return
    }
    setEntering(true)
    const t = setTimeout(() => setEntering(false), 260)
    return () => clearTimeout(t)
  }, [activeId])

  // ⌘K / Ctrl+K → command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const activeDef = activeId ? configuratoreById(activeId) : undefined
  const activeGroup = activeDef ? cfgGroupById(activeDef.group) : undefined

  return (
    <div className="configuratore">
      <PageHead
        title="Configuratore"
        subtitle="Personalizza il sistema per una gestione efficiente e su misura"
      />

      {activeDef == null ? (
        <ConfiguratoreHub
          lanes={lanes}
          completion={completion}
          onOpen={guardedGo}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      ) : (
        <div className="configuratore__layout">
          <ConfiguratoreSidebar
            lanes={lanes}
            activeId={activeDef.id}
            onSelect={guardedGo}
            onHub={() => guardedGo(null)}
            onOpenPalette={() => setPaletteOpen(true)}
          />

          {/* key = voce attiva: ogni cambio rimonta la vista e fa ripartire la
              transizione (crossfade + slide corto, vedi .sass) */}
          <div className="configuratore__paneview" key={activeDef.id}>
            <CfgPane
              trail={['Configuratore', activeGroup?.label ?? '']}
              onTrail={() => { void guardedGo(null) }}
              title={activeDef.label}
              description={activeDef.description}
              icon={activeDef.icon}
              loading={entering}
            >
              <PaneSwitch
                def={activeDef}
                completion={completion}
                onGoTo={guardedGo}
                navigate={navigate}
              />
            </CfgPane>
          </div>
        </div>
      )}

      <ConfiguratorePalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        entries={lanes.flatMap(l => l.items)}
        onSelect={(id) => { setPaletteOpen(false); void guardedGo(id) }}
      />
    </div>
  )
}

// ─── Contenuto del pane attivo ───────────────────────────────────────────────
//  Ordine: pane in arrivo → voce bloccata (gating) → pane esistente →
//  sub-app Outlet (F&B) → empty di riserva.

function PaneSwitch({ def, completion, onGoTo, navigate }: {
  def: ConfiguratoreDef
  completion: Record<string, CfgCompletion>
  onGoTo: (id: ConfiguratoreId) => void
  /** Navigazione di piattaforma, per i pane che montano pagine intere. */
  navigate: (page: string) => void
}) {
  if (def.status === 'soon') {
    return (
      <CfgEmpty
        icon={def.icon}
        title={`${def.label} è in arrivo`}
        subtitle={`${def.description} Questo configuratore è previsto dal piano di rifacimento della sezione ma non è ancora stato costruito.`}
        soon
      />
    )
  }

  if (def.requires && displayStatusOf(completion, def.id) === 'locked') {
    const requirement = configuratoreById(def.requires.id)
    return (
      <CfgLocked
        title={def.label}
        requirementLabel={requirement?.label ?? def.requires.id}
        reason={def.requires.reason}
        onGoToRequirement={() => onGoTo(def.requires!.id)}
      />
    )
  }

  const Pane = PANES[def.id]
  if (Pane) return <Pane onGoTo={onGoTo} navigate={navigate} />

  if (hasOutletConfig(def.id)) return <OutletConfig id={def.id} />

  return (
    <CfgEmpty
      icon={def.icon}
      title={`${def.label} non è ancora disponibile`}
      subtitle={def.description}
    />
  )
}
