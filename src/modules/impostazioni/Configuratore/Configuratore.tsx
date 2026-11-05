import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { CfgPane, CfgLocked, CfgEmpty, cfgPrefersReducedMotion } from '../../../core/cfg'
import {
  CFG_GROUPS,
  CONFIGURATORI,
  cfgGroupById,
  configuratoreById,
  isConfiguratoreId,
  type CfgGroupId,
  type ConfiguratoreDef,
  type ConfiguratoreId,
} from './registry'
import {
  useConfiguratoreStore,
  displayStatusOf,
  type CfgCompletion,
} from '../../../store/useConfiguratoreStore'
import { useAccessStore, allowedConfiguratoreIds, type AccessProfile } from '../../../store/useAccessStore'
import { useModuliStore } from '../../../store/useModuliStore'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useNavGuard } from '../../../store/useNavGuard'
import ConfiguratoreHub from './ConfiguratoreHub'
import ConfiguratoreSidebar, { type SidebarLane } from './ConfiguratoreSidebar'
import ConfiguratorePalette from './ConfiguratorePalette'
import ConfiguratoreSezione from './ConfiguratoreSezione'
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
import Gateway                from './panes/Gateway/Gateway'
import IntestazioniFiscali    from './panes/IntestazioniFiscali/IntestazioniFiscali'
import BusinessCentral        from './panes/BusinessCentral/BusinessCentral'
import CostiMapping           from './panes/CostiMapping/CostiMapping'
import AppOp from './panes/AppOp/AppOp'
import HrReparti             from './panes/HrReparti/HrReparti'
import HrOrari               from './panes/HrOrari/HrOrari'
import HrTurnistica          from './panes/HrTurnistica/HrTurnistica'
import HrTipologieContratto  from './panes/HrTipologieContratto/HrTipologieContratto'
import HrCcnl                from './panes/HrCcnl/HrCcnl'
import HrCollaboratoriEsterni from './panes/HrCollaboratoriEsterni/HrCollaboratoriEsterni'
import HrAziendeAppalto      from './panes/HrAziendeAppalto/HrAziendeAppalto'
import HrIntegrazionePaghe from './panes/HrIntegrazionePaghe/HrIntegrazionePaghe'
// Le voci F&B «Crea outlet» e «Sale e tavoli» sono LE STESSE pagine di
// Impostazioni → Il mio business: si montano qui in modalità embedded (senza il
// loro PageHead, che nel pane lo dà CfgPane), non si duplicano.

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
  /** Scheda interna da aprire (deep link `<voce>:<scheda>`, es. `hr-ccnl:tipologie`). */
  initialTab?: string
}

// ─── Deep link di voci assorbite da un'altra voce ────────────────────────────
//  Le Tipologie di contratto sono diventate una scheda interna di «Contratti
//  collettivi»: il vecchio link `hr-configurazione:hr-tipologie-contratto`
//  apre Contratti collettivi direttamente su quella scheda.
const ALIAS_VOCI: Partial<Record<string, { id: ConfiguratoreId; tab: string }>> = {
  'hr-tipologie-contratto': { id: 'hr-ccnl', tab: 'tipologie' },
}

/** `<voce>` o `<voce>:<scheda>` → voce e scheda interna (alias risolti). */
function risolviDeepLink(initialPane?: string): { id?: string; tab?: string } {
  if (!initialPane) return {}
  const [id, tab] = initialPane.split(':')
  const alias = ALIAS_VOCI[id]
  return alias ? { id: alias.id, tab: tab ?? alias.tab } : { id, tab }
}

/** Testo della conferma di abbandono, uguale per cambio voce e cambio pagina. */
function messaggioAbbandono(n: number, dove: 'voce' | 'pagina') {
  return n === 1
    ? `C'è 1 modifica non salvata: uscendo da questa ${dove} andrà persa.`
    : `Ci sono ${n} modifiche non salvate: uscendo da questa ${dove} andranno perse.`
}

// ─── Configurazioni F&B ──────────────────────────────────────────────────────
//  Da quando la sezione Food & Beverage ha le sue pagine native, queste voci
//  non ospitano più un secondo editor: rimandano alla pagina dove la cosa si
//  configura davvero, così non esistono due posti (e due stati) per lo stesso
//  dato. Chiave = voce del Configuratore, valore = pagina della sezione.
const RIMANDI_FB: Partial<Record<ConfiguratoreId, { page: string; label: string }>> = {
  'fb-outlet':           { page: 'fb-outlet',           label: 'Outlet' },
  'fb-sale-tavoli':      { page: 'fb-sale-tavoli',      label: 'Sale e tavoli' },
  'fb-turni':            { page: 'fb-turni',            label: 'Turni' },
  'fb-tipi-menu':        { page: 'fb-tipi-menu',        label: 'Tipi menu' },
  'fb-categorie':        { page: 'fb-categorie',        label: 'Categorie menu' },
  'fb-voci-menu':        { page: 'fb-voci-menu',        label: 'Voci menu' },
  'fb-crea-menu':        { page: 'fb-menu-giorno',      label: 'Menu del giorno' },
  'fb-menu-giorno':      { page: 'fb-menu-giorno',      label: 'Menu del giorno' },
  'fb-lista-menu':       { page: 'fb-web-menu',         label: 'Web menu' },
  'fb-web-menu':         { page: 'fb-web-menu',         label: 'Web menu' },
  'fb-allergeni':        { page: 'fb-allergeni',        label: 'Allergeni' },
  'fb-categoria-ospite': { page: 'fb-categoria-ospite', label: 'Categorie cliente' },
  'fb-stampanti':        { page: 'fb-stampanti',        label: 'Stampanti' },
  'fb-service-monitor':  { page: 'fb-service-monitor',  label: 'Service monitor' },
}

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
  'gateway':                  Gateway,
  'intestazioni-fiscali':     IntestazioniFiscali,
  'business-central':         BusinessCentral,
  'costi-mapping':            CostiMapping,
  'app-op':                   AppOp,
  'hr-reparti':               HrReparti,
  'hr-orari':                 HrOrari,
  'hr-turnistica':            HrTurnistica,
  'hr-tipologie-contratto':   HrTipologieContratto,
  'hr-ccnl':                  HrCcnl,
  'hr-collaboratori-esterni': HrCollaboratoriEsterni,
  'hr-aziende-appalto':       HrAziendeAppalto,
  'hr-integrazione-paghe':    HrIntegrazionePaghe,
}

export interface ConfiguratoreProps {
  navigate: (p: string) => void
  initialPane?: string
  /** Solo le voci di un gruppo (es. «Configurazione» di Human Resources → 'risorse-umane'). */
  group?: CfgGroupId
  title?: string
  subtitle?: string
}

export default function Configuratore({ navigate, initialPane, group, title, subtitle }: ConfiguratoreProps) {
  // ── Voci visibili in base ai moduli del cliente: in assistenza quelli della struttura assistita, altrimenti quelli
  //    del profilo caricato (es. modulo Ristoranti = solo F&B, App Op! = gruppo App Op!). Nessuno dei due = tutto.
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const assist           = useAccessStore(s => s.assist)
  const modules          = useModuliStore(s => s.moduli)
  const moduliProfilo = useMemo(() => {
    if (assist) return assist.moduli
    const profile = currentProfileId ? profiles.find(p => p.id === currentProfileId) : undefined
    return profile ? profile.moduli : null
  }, [assist, currentProfileId, profiles])
  const allowed = useMemo(
    () => (moduliProfilo ? allowedConfiguratoreIds({ moduli: moduliProfilo } as AccessProfile, modules) : null),
    [moduliProfilo, modules],
  )

  const visibleDefs = useMemo(
    // Configuratore di sezione (es. HR): le voci del gruppo, senza il filtro per moduli
    // — l'accesso lo dà già la voce di menu della sezione.
    () => group ? CONFIGURATORI.filter(d => d.group === group) : CONFIGURATORI
      .filter(d => !allowed || allowed.has(d.id) || (!!d.modulo && !!moduliProfilo?.includes(d.modulo)))
      .filter(d => !d.modulo || !moduliProfilo || moduliProfilo.includes(d.modulo) || moduliProfilo.includes('full')),
    [allowed, moduliProfilo, group],
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
  const deepLink = risolviDeepLink(initialPane)
  const validInitial = deepLink.id
    && isConfiguratoreId(deepLink.id)
    && visibleDefs.some(d => d.id === deepLink.id)
    ? (deepLink.id as ConfiguratoreId)
    : null
  // Scheda interna del deep link: vale solo per la voce aperta all'ingresso
  const initialTab = validInitial ? deepLink.tab : undefined
  // Configuratore di sezione: niente hub, si apre sulla prima voce del gruppo
  const [activeId, setActiveId] = useState<ConfiguratoreId | null>(validInitial ?? (group ? visibleDefs[0]?.id ?? null : null))
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [entering, setEntering] = useState(false)

  // Cambio voce con guardia sul dirty state (conferma di abbandono)
  const guardedGo = async (id: ConfiguratoreId | null) => {
    if (id === activeId) return
    if (dirtyCount > 0) {
      const ok = await confirm({
        title: 'Modifiche non salvate',
        message: messaggioAbbandono(dirtyCount, 'voce'),
        confirmLabel: 'Abbandona',
        cancelLabel: 'Resta',
        danger: true,
      })
      if (!ok) return
      resetDirty()
    }
    setActiveId(id)
  }

  // Uscita dalla pagina (sidenav, Indietro, tab, link interni) con modifiche
  // pendenti: il guard di navigazione blocca il cambio, chiede conferma con lo
  // stesso testo del cambio voce e, se confermato, riprende la navigazione.
  const setNavGuard = useNavGuard(s => s.setGuard)
  useEffect(() => {
    const guard = (_page: string, proceed?: () => void) => {
      const n = useConfiguratoreStore.getState().dirtyCount
      if (n === 0) return true
      void confirm({
        title: 'Modifiche non salvate',
        message: messaggioAbbandono(n, 'pagina'),
        confirmLabel: 'Abbandona',
        cancelLabel: 'Resta',
        danger: true,
      }).then(ok => {
        if (!ok) return
        resetDirty()
        proceed?.()
      })
      return false
    }
    setNavGuard(guard)
    // Smontando la pagina il guard si toglie, solo se è ancora il nostro
    return () => { if (useNavGuard.getState().guard === guard) setNavGuard(null) }
  }, [confirm, resetDirty, setNavGuard])

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

  // ── Configuratore di sezione (es. Human Resources › Configurazione): impaginato
  //    come una pagina della sezione, senza hub, sidebar né card di CfgPane.
  if (group) {
    const items = lanes.flatMap(l => l.items)
    return (
      <div className="configuratore">
        <PageHead title={title ?? 'Configuratore'} subtitle={subtitle} />
        {activeDef && (
          <ConfiguratoreSezione items={items} activeId={activeDef.id} onSelect={guardedGo}>
            <PaneSwitch def={activeDef} completion={completion} onGoTo={guardedGo} navigate={navigate}
              initialTab={activeDef.id === validInitial ? initialTab : undefined} />
          </ConfiguratoreSezione>
        )}
      </div>
    )
  }

  return (
    <div className="configuratore">
      <PageHead
        title={title ?? 'Configuratore'}
        subtitle={subtitle ?? 'Personalizza il sistema per una gestione efficiente e su misura'}
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
              trail={[title ?? 'Configuratore', activeGroup?.label ?? '']}
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
                initialTab={activeDef.id === validInitial ? initialTab : undefined}
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

function PaneSwitch({ def, completion, onGoTo, navigate, initialTab }: {
  def: ConfiguratoreDef
  /** Scheda interna richiesta dal deep link. */
  initialTab?: string
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

  const rimando = RIMANDI_FB[def.id]
  if (rimando) {
    return (
      <CfgEmpty
        icon="utensils"
        title={`${def.label} si configura in Food & Beverage`}
        subtitle="La sezione Food & Beverage è il posto unico dove questa configurazione vive: qui resta il rimando, per non tenerne due copie che divergono."
        action={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate(rimando.page)}>
            Vai a {rimando.label}
          </button>
        )}
      />
    )
  }

  const Pane = PANES[def.id]
  if (Pane) return <Pane onGoTo={onGoTo} navigate={navigate} initialTab={initialTab} />

  return (
    <CfgEmpty
      icon={def.icon}
      title={`${def.label} non è ancora disponibile`}
      subtitle={def.description}
    />
  )
}
