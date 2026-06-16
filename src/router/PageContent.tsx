import React from 'react';
import { buildCrumbs } from '../navigation/menuHelpers';
import MENU from '../navigation/menu';
import HomePage                   from '../modules/home/HomePage/HomePage';
import ModificaProfilo             from '../modules/profilo/ModificaProfilo/ModificaProfilo';
import PortafoglioAziendale        from '../modules/profilo/PortafoglioAziendale/PortafoglioAziendale';
import PortafoglioPersonale        from '../modules/profilo/PortafoglioPersonale/PortafoglioPersonale';
import Scadenzario                 from '../modules/profilo/Scadenzario/Scadenzario';
import RuoliFunzioni               from '../modules/profilo/RuoliFunzioni/RuoliFunzioni';
import ResetProfili                from '../modules/profilo/ResetProfili/ResetProfili';
import Organigramma                from '../modules/profilo/Organigramma/Organigramma';
import IMieiBusinessPage           from '../modules/executive/IMieiBusinessPage/IMieiBusinessPage';
import IMieiRistorantiPage         from '../modules/executive/IMieiRistorantiPage/IMieiRistorantiPage';
import AcquistoServizi             from '../modules/operation/AcquistoServizi/AcquistoServizi';
import GiornaleImpresa             from '../modules/executive/GiornaleImpresa/GiornaleImpresa';
import SSPI                        from '../modules/executive/SSPI/SSPI';
import AnalisiDistribuzione        from '../modules/executive/AnalisiDistribuzione/AnalisiDistribuzione';
import ComparazioneMercato         from '../modules/executive/ComparazioneMercato/ComparazioneMercato';
import CreaStrategia               from '../modules/executive/strategie/CreaStrategia/CreaStrategia';
import ModificaStrategia           from '../modules/executive/strategie/ModificaStrategia/ModificaStrategia';
import CalendarioStrategie         from '../modules/executive/strategie/CalendarioStrategie/CalendarioStrategie';
import CalendarioMaster            from '../modules/executive/strategie/CalendarioMaster/CalendarioMaster';
import SuggerimentiDataDriven      from '../modules/sales/pricing/SuggerimentiDataDriven/SuggerimentiDataDriven';
import ScreeningOpenPrice          from '../modules/sales/pricing/ScreeningOpenPrice/ScreeningOpenPrice';
import PricingBenchmark            from '../modules/sales/pricing/PricingBenchmark/PricingBenchmark';
import TariffeDisponibilita        from '../modules/sales/distribution/TariffeDisponibilita/TariffeDisponibilita';
import GestionePianiTariffari      from '../modules/sales/distribution/GestionePianiTariffari/GestionePianiTariffari';
import MaggiorazioniPromozioni     from '../modules/sales/distribution/MaggiorazioniPromozioni/MaggiorazioniPromozioni';
import PrenotazioniIDS             from '../modules/sales/distribution/PrenotazioniIDS/PrenotazioniIDS';
import CalendarioTariffe           from '../modules/sales/distribution/CalendarioTariffe/CalendarioTariffe';
import ForesightRevenue            from '../modules/sales/distribution/ForesightRevenue/ForesightRevenue';
import MonthlyTrend                from '../modules/sales/distribution/MonthlyTrend/MonthlyTrend';
import ForecastAnalysis            from '../modules/sales/distribution/ForecastAnalysis/ForecastAnalysis';
import AllocazioneRisorse          from '../modules/sales/booking/AllocazioneRisorse/AllocazioneRisorse';
import VoipServiceHub              from '../modules/sales/booking/VoipServiceHub/VoipServiceHub';
import ImpostaDistribuzione        from '../modules/sales/ricavi/ImpostaDistribuzione/ImpostaDistribuzione';
import ComponiAnnunci              from '../modules/sales/ricavi/ComponiAnnunci/ComponiAnnunci';
import BudgetAnalysis              from '../modules/sales/ricavi/BudgetAnalysis/BudgetAnalysis';
import SegmentAnalysis             from '../modules/sales/ricavi/SegmentAnalysis/SegmentAnalysis';
import MieiContratti               from '../modules/sales/ricavi/MieiContratti/MieiContratti';
import InserisciContrattoVendita   from '../modules/sales/ricavi/InserisciContrattoVendita/InserisciContrattoVendita';
import VisualizzaContratto         from '../modules/sales/ricavi/VisualizzaContratto/VisualizzaContratto';
import SalesOverview               from '../modules/sales/SalesOverview/SalesOverview';
import OnTheBookAnalysis           from '../modules/operation/OnTheBookAnalysis/OnTheBookAnalysis';
import OperationOverview           from '../modules/operation/OperationOverview/OperationOverview';
import GuestRoomAnalysis           from '../modules/operation/GuestRoomAnalysis/GuestRoomAnalysis';
import OspitiInCasa                from '../modules/operation/OspitiInCasa/OspitiInCasa';
import ContiCamera                 from '../modules/operation/ContiCamera/ContiCamera';
import EmissioneDocumenti          from '../modules/operation/EmissioneDocumenti/EmissioneDocumenti';
import ContiAperti                 from '../modules/operation/ContiAperti/ContiAperti';
import MovimentiSoggiorno           from '../modules/operation/MovimentiSoggiorno/MovimentiSoggiorno';
import ContiChiusi                 from '../modules/operation/ContiChiusi/ContiChiusi';
import ContiPassanti               from '../modules/operation/ContiPassanti/ContiPassanti';
import NuovoContoPassante          from '../modules/operation/NuovoContoPassante/NuovoContoPassante';
import Segnalazioni                from '../modules/operation/Segnalazioni/Segnalazioni';
import AssegnazioniIncarichi       from '../modules/operation/AssegnazioniIncarichi/AssegnazioniIncarichi';
import MaintenanceAnalysis         from '../modules/operation/MaintenanceAnalysis/MaintenanceAnalysis';
import OrdineServizio              from '../modules/operation/OrdineServizio/OrdineServizio';
import AreaMerceologica            from '../modules/purchasing/AreaMerceologica/AreaMerceologica';
import DettaglioAreaMerceologica   from '../modules/purchasing/AreaMerceologica/DettaglioAreaMerceologica';
import ClasseProdotti              from '../modules/purchasing/AreaMerceologica/ClasseProdotti';
import ProdottoDettaglio           from '../modules/purchasing/AreaMerceologica/ProdottoDettaglio';
import CatalogoCart                from '../modules/purchasing/AreaMerceologica/CatalogoCart';
import CatalogoCheckout            from '../modules/purchasing/AreaMerceologica/CatalogoCheckout';
import Servizi                     from '../modules/purchasing/Servizi/Servizi';
import CreaProdotto                from '../modules/purchasing/CreaProdotto/CreaProdotto';
import ListaProdotti               from '../modules/purchasing/ListaProdotti/ListaProdotti';
import GestioneAnnunci             from '../modules/purchasing/GestioneAnnunci/GestioneAnnunci';
import Matchzone                   from '../modules/purchasing/Matchzone/Matchzone';
import TableauPage                 from '../modules/sales/booking/TableauPage/TableauPage';
import NuovaPrenotazione           from '../modules/sales/booking/NuovaPrenotazione/NuovaPrenotazione';
import AnalisiBooking              from '../modules/sales/booking/AnalisiBooking/AnalisiBooking';
import GrigliaDisponibilita        from '../modules/sales/booking/GrigliaDisponibilita/GrigliaDisponibilita';
import GrigliaDisponibilitaEstesa  from '../modules/sales/booking/GrigliaDisponibilitaEstesa/GrigliaDisponibilitaEstesa';
import Assegnazione                from '../modules/sales/booking/Assegnazione/Assegnazione';
import CentroNotifiche             from '../modules/notifiche/CentroNotifiche/CentroNotifiche';
import ConfiguraNotifiche          from '../modules/notifiche/ConfiguraNotifiche/ConfiguraNotifiche';
import Chat                        from '../modules/chat/Chat/Chat';
import SibyllaAdminPanel           from '../admin/SibyllaAdminPanel/SibyllaAdminPanel';
import Planner                     from '../modules/operation/planner';
// ── Food & Beverage (Outlet Manager — outlet.sibyllanetwork.it) ──
import OutletShell                 from '../modules/operation/Outlet/OutletShell';
import type { OutletSubPage }      from '../modules/operation/Outlet/OutletShell';
// ── Pagine portate da platform (Razor) → sibylla-platform ──
import Anagrafiche                 from '../modules/operation/Anagrafiche/Anagrafiche';
import ArriviPartenze              from '../modules/operation/ArriviPartenze/ArriviPartenze';
import SchedineAlloggiati          from '../modules/operation/SchedineAlloggiati/SchedineAlloggiati';
import RilevamentoPresenze         from '../modules/operation/RilevamentoPresenze/RilevamentoPresenze';
import RegistroPresenze            from '../modules/operation/RegistroPresenze/RegistroPresenze';
import Cassa                       from '../modules/operation/Cassa/Cassa';
import IMieiServizi                from '../modules/sales/servizi/IMieiServizi/IMieiServizi';
import CreaServizio                from '../modules/sales/servizi/CreaServizio/CreaServizio';
import IMieiPreventivi             from '../modules/sales/preventivi/IMieiPreventivi/IMieiPreventivi';
import CreaPreventivo              from '../modules/sales/preventivi/CreaPreventivo/CreaPreventivo';
import ImpostaCentroDiCosto        from '../modules/finance/ImpostaCentroDiCosto/ImpostaCentroDiCosto';
import ArchivioPersonale           from '../modules/hr/ArchivioPersonale/ArchivioPersonale';
import CreaAnagrafica              from '../modules/hr/CreaAnagrafica/CreaAnagrafica';
import AssegnaObiettivo            from '../modules/hr/AssegnaObiettivo/AssegnaObiettivo';
import CabinaControllo             from '../modules/finance/CabinaControllo/CabinaControllo';
import BudgetComplessivo           from '../modules/finance/BudgetComplessivo/BudgetComplessivo';
import SimulatoriScenari           from '../modules/finance/SimulatoriScenari/SimulatoriScenari';
import StatoCamere                 from '../modules/impostazioni/StatoCamere/StatoCamere';
import SchedaQuestura              from '../modules/impostazioni/SchedaQuestura/SchedaQuestura';
import LogDiSistema                from '../modules/impostazioni/LogDiSistema/LogDiSistema';
import InformazioniStruttura       from '../modules/impostazioni/InformazioniStruttura/InformazioniStruttura';
import Configuratore               from '../modules/impostazioni/Configuratore/Configuratore';
import CreaStruttura               from '../modules/impostazioni/CreaStruttura/CreaStruttura';
import MonitoraggioCanali          from '../modules/impostazioni/MonitoraggioCanali/MonitoraggioCanali';
import Interfacce                  from '../modules/impostazioni/Interfacce/Interfacce';
import Inventario                  from '../modules/stanze/Inventario/Inventario';
import InventarioCamere            from '../modules/impostazioni/InventarioCamere/InventarioCamere';
import RiepilogoBacheche           from '../modules/impostazioni/RiepilogoBacheche/RiepilogoBacheche';
import Forniture                   from '../modules/purchasing/Forniture/Forniture';
import Totem                       from '../modules/hardware/Totem/Totem';
import IMieiTotem                  from '../modules/hardware/IMieiTotem/IMieiTotem';
import GestioneAdvertising         from '../modules/hardware/GestioneAdvertising/GestioneAdvertising';
import NoleggiaSpazi               from '../modules/hardware/NoleggiaSpazi/NoleggiaSpazi';
import PianificaCampagna           from '../modules/hardware/PianificaCampagna/PianificaCampagna';
import RiepilogoCampagna           from '../modules/hardware/RiepilogoCampagna/RiepilogoCampagna';
import SysadminIndex               from '../modules/sysadmin/Index/SysadminIndex';
import GestioneAziende             from '../modules/sysadmin/GestioneAziende/GestioneAziende';
import GestioneUtenti              from '../modules/sysadmin/GestioneUtenti/GestioneUtenti';
import CreaMagazzino               from '../modules/magazzino/CreaMagazzino/CreaMagazzino';
import MovimentiBarcode            from '../modules/magazzino/MovimentiBarcode/MovimentiBarcode';
import ArchivioContratti           from '../modules/finance/ArchivioContratti/ArchivioContratti';
import InserisciContrattoAcquisto  from '../modules/purchasing/InserisciContrattoAcquisto/InserisciContrattoAcquisto';
import TurniPersonale              from '../modules/operation/TurniPersonale/TurniPersonale';
import AgoraShell                  from '../modules/purchasing/Agora/AgoraShell';
import { renderPortedPage }        from '../modules/_scaffold/portedPages';
import GenericPage                 from '../modules/GenericPage';

// ── Mappatura pageId Sibylla → percorso interno AgoraShell (MemoryRouter) ──
const AGORA_PAGEID_TO_PATH: Record<string, string> = {
  'agora-home':              '/',
  'agora-dashboard':         '/dashboard',
  'agora-accommodations':    '/accommodations',
  'agora-categories':        '/categories',
  'agora-suppliers':         '/suppliers',
  'agora-quotes':            '/quotes',
  'agora-quote-create':      '/quotes/create',
  'agora-academy':           '/academy',
  'agora-academy-personnel': '/academy/personnel',
  'agora-academy-courses':   '/academy/courses',
  'agora-dynamic-packages':  '/dynamic-packages',
  'agora-elearning':         '/elearning',
  'agora-announcements':     '/announcements',
  'agora-announcements-manage': '/announcements/manage',
  'agora-group-purchases':   '/group-purchases',
  'agora-cart':              '/cart',
  // Alias dei pageId Sibylla legacy che ora puntano alla pagina Agorà.
  'acquisti-rete':           '/group-purchases',
  'crea-acquisto':           '/group-purchases',
};

function getModuleColor(crumbs: any[]): string {
  const imp = crumbs?.find((c: any) => c.id === 'impresa');
  if (!imp) return '#5C9CD4';
  return crumbs[crumbs.indexOf(imp) + 1]?.color || '#5C9CD4';
}

interface Props {
  page: string;
  navigate: (p: string) => void;
}

export default function PageContent({ page, navigate }: Props) {
  if (page === 'home')                  return <HomePage navigate={navigate}/>;
  if (page === 'modifica-profilo')      return <ModificaProfilo navigate={navigate}/>;
  if (page === 'portafoglio-aziendale') return <PortafoglioAziendale navigate={navigate}/>;
  if (page === 'portafoglio-personale') return <PortafoglioPersonale navigate={navigate}/>;
  if (page === 'scadenzario')           return <Scadenzario navigate={navigate}/>;
  if (page === 'reset-profili')         return <ResetProfili navigate={navigate}/>;
  if (page === 'ruoli-funzioni')        return <RuoliFunzioni navigate={navigate}/>;
  if (page === 'organigramma')          return <Organigramma navigate={navigate}/>;
  if (page === 'i-miei-business')       return <IMieiBusinessPage navigate={navigate}/>;
  if (page === 'i-miei-ristoranti')     return <IMieiRistorantiPage navigate={navigate}/>;
  if (page === 'acquisti-servizi')      return <AcquistoServizi navigate={navigate}/>;
  if (page === 'giornale-impresa')      return <GiornaleImpresa navigate={navigate}/>;
  if (page === 'sspi')                  return <SSPI navigate={navigate}/>;
  if (page === 'analisi-dist-exec')     return <AnalisiDistribuzione navigate={navigate}/>;
  if (page === 'analisi-dist-sales')    return <AnalisiDistribuzione navigate={navigate}/>;
  if (page === 'crea-strategia')        return <CreaStrategia navigate={navigate}/>;
  if (page === 'modifica-strategia')    return <ModificaStrategia navigate={navigate}/>;
  if (page === 'calendario-strategie')  return <CalendarioStrategie navigate={navigate}/>;
  if (page === 'calendario-master')     return <CalendarioMaster navigate={navigate}/>;
  if (page === 'sugg-data-driven')      return <SuggerimentiDataDriven navigate={navigate}/>;
  if (page === 'screening-open')        return <ScreeningOpenPrice navigate={navigate}/>;
  if (page === 'pricing-benchmark')     return <PricingBenchmark navigate={navigate}/>;
  if (page === 'configura-notifiche')   return <ConfiguraNotifiche navigate={navigate}/>;
  if (page === 'centro-notifiche')      return <CentroNotifiche navigate={navigate}/>;
  if (page === 'chat')                  return <Chat navigate={navigate}/>;
  if (page === 'tariffe-disp')          return <TariffeDisponibilita navigate={navigate}/>;
  if (page === 'piani-tar')             return <GestionePianiTariffari navigate={navigate}/>;
  if (page === 'maggiorazioni')         return <MaggiorazioniPromozioni navigate={navigate}/>;
  if (page === 'prenotazioni-ids')      return <PrenotazioniIDS navigate={navigate}/>;
  if (page === 'tableau-book')          return <TableauPage navigate={navigate}/>;
  if (page === 'analisi-booking')       return <AnalisiBooking navigate={navigate}/>;
  if (page === 'griglia-disp')          return <GrigliaDisponibilita navigate={navigate}/>;
  if (page === 'griglia-disp-estesa')   return <GrigliaDisponibilitaEstesa navigate={navigate}/>;
  if (page === 'assegnazione-book')     return <Assegnazione navigate={navigate}/>;
  if (page === 'assegnazione-board')    return <Assegnazione navigate={navigate}/>;
  if (page === 'nuova-prenotazione')    return <NuovaPrenotazione navigate={navigate}/>;
  if (page === 'calendario-tariffe')    return <CalendarioTariffe navigate={navigate}/>;
  if (page === 'foresight-revenue')     return <ForesightRevenue navigate={navigate}/>;
  if (page === 'monthly-trend')         return <MonthlyTrend navigate={navigate}/>;
  if (page === 'forecast-analysis')     return <ForecastAnalysis navigate={navigate}/>;
  if (page === 'grand-total')           return <ForecastAnalysis navigate={navigate}/>;
  if (page === 'allocazione-risorse')   return <AllocazioneRisorse navigate={navigate}/>;
  if (page === 'voip')                  return <VoipServiceHub navigate={navigate}/>;
  if (page === 'imposta-dist')          return <ImpostaDistribuzione navigate={navigate}/>;
  if (page === 'comparazione-mercato')  return <ComparazioneMercato navigate={navigate}/>;
  if (page === 'componi-annunci')       return <ComponiAnnunci navigate={navigate}/>;
  if (page === 'budget-analysis')       return <BudgetAnalysis navigate={navigate}/>;
  if (page === 'segment-analysis')      return <SegmentAnalysis navigate={navigate}/>;
  if (page === 'miei-contratti-v')      return <MieiContratti navigate={navigate}/>;
  if (page === 'inserisci-contratto-v') return <InserisciContrattoVendita navigate={navigate} key="ins-contr-v"/>;
  if (page === 'modifica-contratto-v')  return <InserisciContrattoVendita navigate={navigate} editing key="mod-contr-v"/>;
  if (page === 'visualizza-contratto-v') return <VisualizzaContratto navigate={navigate}/>;
  if (page === 'sales-overview')        return <SalesOverview navigate={navigate}/>;
  if (page === 'on-the-book')           return <OnTheBookAnalysis navigate={navigate}/>;
  if (page === 'op-overview')           return <OperationOverview navigate={navigate}/>;
  if (page === 'guest-room')            return <GuestRoomAnalysis navigate={navigate}/>;
  if (page === 'planner')               return <Planner navigate={navigate}/>;
  if (page === 'sibylla-admin')         return <SibyllaAdminPanel navigate={navigate}/>;

  // ── Pagine portate da platform ──
  if (page === 'anagrafiche-op')        return <Anagrafiche navigate={navigate}/>;
  if (page === 'arrivi-partenze')       return <ArriviPartenze navigate={navigate}/>;
  if (page === 'ospiti-in-casa')        return <OspitiInCasa navigate={navigate}/>;
  if (page === 'conti-camera')          return <ContiCamera navigate={navigate}/>;
  if (page === 'emissione-documenti')   return <EmissioneDocumenti navigate={navigate}/>;
  if (page === 'conti-aperti')          return <ContiAperti navigate={navigate}/>;
  if (page === 'movimenti-soggiorno')   return <MovimentiSoggiorno navigate={navigate}/>;
  if (page === 'conti-chiusi')          return <ContiChiusi navigate={navigate}/>;
  if (page === 'conti-passanti')        return <ContiPassanti navigate={navigate}/>;
  if (page === 'nuovo-conto-passante')  return <NuovoContoPassante navigate={navigate}/>;
  if (page === 'segnalazioni')          return <Segnalazioni navigate={navigate}/>;
  if (page === 'assegnazioni-incarichi') return <AssegnazioniIncarichi navigate={navigate}/>;
  if (page === 'maintenance-analysis')  return <MaintenanceAnalysis navigate={navigate}/>;
  if (page === 'ordine-servizio')       return <OrdineServizio navigate={navigate}/>;
  if (page === 'area-merceologica')     return <AreaMerceologica navigate={navigate}/>;
  if (page.startsWith('dettaglio-area-merceologica:')) {
    const categoriaId = page.slice('dettaglio-area-merceologica:'.length);
    return <DettaglioAreaMerceologica navigate={navigate} categoriaId={categoriaId} key={page}/>;
  }
  if (page.startsWith('prodotti-classe:')) {
    const [categoriaId, classeSlug] = page.slice('prodotti-classe:'.length).split('__');
    return <ClasseProdotti navigate={navigate} categoriaId={categoriaId} classeSlug={classeSlug || ''} key={page}/>;
  }
  if (page.startsWith('prodotto:')) {
    const prodottoId = page.slice('prodotto:'.length);
    return <ProdottoDettaglio navigate={navigate} prodottoId={prodottoId} key={page}/>;
  }
  if (page === 'catalogo-cart')         return <CatalogoCart navigate={navigate}/>;
  if (page === 'catalogo-checkout')     return <CatalogoCheckout navigate={navigate}/>;
  if (page === 'servizi-acquisto')      return <Servizi navigate={navigate}/>;
  if (page === 'crea-prodotto')         return <CreaProdotto navigate={navigate}/>;
  if (page === 'lista-prodotti')        return <ListaProdotti navigate={navigate}/>;
  if (page === 'lista-fornitori')       return <Forniture navigate={navigate}/>;
  if (page === 'gestione-annunci')      return <GestioneAnnunci navigate={navigate}/>;
  if (page === 'matchzone')             return <Matchzone navigate={navigate}/>;
  if (page === 'schedine')              return <SchedineAlloggiati navigate={navigate}/>;
  if (page === 'rilevamento-presenze')  return <RilevamentoPresenze navigate={navigate}/>;
  if (page === 'registro-presenze')     return <RegistroPresenze navigate={navigate}/>;
  if (page === 'movimenti-scorte')      return <CreaMagazzino navigate={navigate} key="movimenti-scorte"/>;
  if (page === 'crea-magazzino')        return <CreaMagazzino navigate={navigate} autoOpen key="crea-magazzino"/>;
  if (page === 'movimenti-barcode')     return <MovimentiBarcode navigate={navigate}/>;
  if (page === 'turni-personale')       return <TurniPersonale navigate={navigate}/>;
  if (page === 'cassa')                 return <Cassa navigate={navigate}/>;
  if (page === 'monitoraggio-cassa')    return <Cassa navigate={navigate}/>;
  if (page === 'i-miei-servizi')        return <IMieiServizi navigate={navigate}/>;
  if (page === 'crea-servizio')         return <CreaServizio navigate={navigate}/>;
  if (page.startsWith('crea-servizio:')) return <CreaServizio navigate={navigate} servizioId={page.slice('crea-servizio:'.length)} key={page}/>;
  if (page === 'i-miei-preventivi')     return <IMieiPreventivi navigate={navigate}/>;
  if (page === 'crea-preventivo')       return <CreaPreventivo navigate={navigate}/>;
  if (page === 'centro-costo')          return <ImpostaCentroDiCosto navigate={navigate}/>;
  if (page === 'archivio-personale')    return <ArchivioPersonale navigate={navigate}/>;
  if (page === 'archivio-contratti')    return <ArchivioContratti navigate={navigate}/>;
  if (page === 'inserisci-contratto-a') return <InserisciContrattoAcquisto navigate={navigate}/>;
  if (page === 'crea-anagrafica')       return <CreaAnagrafica navigate={navigate}/>;
  if (page === 'assegna-obiettivo')     return <AssegnaObiettivo navigate={navigate}/>;
  if (page === 'cabina-controllo')      return <CabinaControllo navigate={navigate}/>;
  if (page === 'budget-cabina')         return <CabinaControllo navigate={navigate}/>;
  if (page === 'budget-complessivo')    return <BudgetComplessivo navigate={navigate}/>;
  if (page === 'simulatore')            return <SimulatoriScenari navigate={navigate}/>;
  if (page === 'simulatori-scenari')    return <SimulatoriScenari navigate={navigate}/>;
  if (page === 'stato-camere')          return <StatoCamere navigate={navigate}/>;
  if (page === 'scheda-questura')       return <SchedaQuestura navigate={navigate}/>;
  if (page === 'log-sistema')           return <LogDiSistema navigate={navigate}/>;
  if (page === 'informazioni-struttura')return <InformazioniStruttura navigate={navigate}/>;
  if (page === 'configuratore')         return <Configuratore navigate={navigate}/>;
  if (page === 'crea-struttura')        return <CreaStruttura navigate={navigate}/>;
  if (page === 'crea-outlet')           return <CreaStruttura navigate={navigate} autoOpenType="outlet"/>;
  if (page === 'monitoraggio-canali')   return <MonitoraggioCanali navigate={navigate}/>;
  if (page === 'interfacce')            return <Interfacce navigate={navigate}/>;
  if (page === 'inventario-camere')     return <InventarioCamere navigate={navigate}/>;
  if (page === 'riepilogo-bacheche')    return <RiepilogoBacheche navigate={navigate}/>;
  if (page === 'forniture')             return <Forniture navigate={navigate}/>;
  if (page === 'inventario-stanze')     return <Inventario navigate={navigate}/>;
  if (page === 'totem')                 return <Totem navigate={navigate}/>;
  if (page === 'i-miei-totem')          return <IMieiTotem navigate={navigate}/>;
  if (page === 'gest-advertising')      return <GestioneAdvertising navigate={navigate}/>;
  if (page === 'noleggia-spazi')        return <NoleggiaSpazi navigate={navigate}/>;
  if (page === 'pianifica-campagna')    return <PianificaCampagna navigate={navigate}/>;
  if (page === 'riepilogo-campagna')    return <RiepilogoCampagna navigate={navigate}/>;
  if (page === 'totem-adv')             return <Totem navigate={navigate}/>;
  // ── Food & Beverage → Outlet Manager (sub-app vendorizzata) ──
  // Una sola istanza per i 4 link (niente key): lo stato interno persiste.
  const FB_PAGES: Record<string, OutletSubPage> = {
    'gest-comanda': 'gestione',
    'sala-ristorante': 'sala',
    'libro-prenotazioni': 'prenotazioni',
    'ospiti-giorno': 'ospiti',
  };
  if (page in FB_PAGES) return <OutletShell initialPage={FB_PAGES[page]}/>;

  if (page === 'sysadmin')              return <SysadminIndex navigate={navigate}/>;
  if (page === 'gestione-aziende')      return <GestioneAziende navigate={navigate}/>;
  if (page === 'gestione-utenti')       return <GestioneUtenti navigate={navigate}/>;

  // ── Sub-app Agorà (pagine portate da Newagora) ──
  // Niente `key={page}` qui: vogliamo che AgoraShell PERSISTA fra le diverse
  // sub-rotte (la sua CartProvider tiene lo stato del carrello).
  // PathSync internamente reagisce al cambio di `initialPath` e naviga il
  // MemoryRouter alla nuova sub-rotta senza unmount.
  if (page in AGORA_PAGEID_TO_PATH) {
    return <AgoraShell initialPath={AGORA_PAGEID_TO_PATH[page]} navigate={navigate} />;
  }

  // ── Tutte le altre pagine portate da platform/Razor (~150) ──
  // Render uniforme con design system Sibylla + chiamata BE catch-all.
  const ported = renderPortedPage(page, navigate);
  if (ported) return ported;

  const crumbs = buildCrumbs(MENU, page) || [];
  const item   = crumbs[crumbs.length - 1];
  return <GenericPage item={item} page={page} modColor={getModuleColor(crumbs)} navigate={navigate}/>;
}
