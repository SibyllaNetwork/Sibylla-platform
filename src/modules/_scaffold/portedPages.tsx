/**
 * portedPages — registry centralizzato delle pagine portate da
 * `platform/Portal/sibylla/Views/` a `sibylla-platform`.
 *
 * Ogni voce mappa: pageId menu → componente React + path Razor + endpoint
 * BE (catch-all `/Sibylla/...`). Le pagine già esistenti come componenti
 * dedicati (Anagrafiche, ArriviPartenze, StatoCamere, ecc.) NON sono qui:
 * sono importate dal router direttamente.
 */

import React from 'react'
import { StubPage } from './RazorScaffold'
import { subtitleForPage } from '../../navigation/pageSubtitles'

interface NavProps { navigate: (p: string) => void }

export interface PortedPageDef {
  pageId: string
  title: string
  subtitle?: string
  razorPath: string
  apiPath?: string
}

export const PORTED_PAGES: PortedPageDef[] = [
  // ── Acquisti di rete ───────────────────────────────────────────────
  { pageId: 'acq-rete',                 title: 'Acquisti di rete',                 razorPath: 'Views/AcquistiDiRete/AcqRete.cshtml',                  apiPath: 'acquistiDiRete/Get' },
  { pageId: 'imp-acq-rete',             title: 'Impostazioni Acquisti di rete',     razorPath: 'Views/AcquistiDiRete/ImpAcqRete.cshtml',               apiPath: 'acquistiDiRete/GetImpostazioni' },

  // ── Allocazione ────────────────────────────────────────────────────
  { pageId: 'allocazione',              title: 'Allocazione',                       razorPath: 'Views/Allocazione/Allocazione.cshtml',                 apiPath: 'allocazione/Get' },
  { pageId: 'allocazione-tableau',      title: 'Allocazione Tableau DDL',           razorPath: 'Views/Allocazione/TableauDDL.cshtml',                  apiPath: 'allocazione/GetTableauDDL' },

  // ── Anagrafica & Contratti ─────────────────────────────────────────
  { pageId: 'archivio-contratti',       title: 'Archivio contratti',                razorPath: 'Views/ArchivioContratti/ArchivioContratti.cshtml',     apiPath: 'contratti/GetArchivio' },
  { pageId: 'inserisci-contratto-a',    title: 'Inserisci contratto di acquisto',   razorPath: 'Views/ContrattoAcquisto/ContrattoAcquisto.cshtml',     apiPath: 'contratti/InsertAcquisto' },
  { pageId: 'inserisci-contratto-v',    title: 'Inserisci contratto di vendita',    razorPath: 'Views/ContrattoVendita/ContrattoVendita.cshtml',       apiPath: 'contratti/InsertVendita' },
  { pageId: 'miei-contratti-a',         title: 'I miei contratti di acquisto',      razorPath: 'Views/ListaContrattiAcquisto/ListaContratti.cshtml',   apiPath: 'contratti/GetAcquisti' },
  { pageId: 'miei-contratti-v',         title: 'I miei contratti di vendita',       razorPath: 'Views/ListaContrattiVendita/ListaContratti.cshtml',    apiPath: 'contratti/GetVendite' },

  // ── Area merceologica & Fornitori ──────────────────────────────────
  { pageId: 'area-merceologica',        title: 'Area merceologica',                 razorPath: 'Views/AreaMerceologica/AreaM.cshtml',                  apiPath: 'classi-prodotto/Get' },
  { pageId: 'lista-fornitori',          title: 'Lista fornitori',                   razorPath: 'Views/AreaMerceologica/AreaM.cshtml',                  apiPath: 'fornitori/Get' },

  // ── Assegnazione ───────────────────────────────────────────────────
  { pageId: 'vista-hotel',              title: 'Vista hotel',                       razorPath: 'Views/Assegnazione/VistaHotel.cshtml',                 apiPath: 'assegnazione/GetVistaHotel' },

  // ── Bacheca / Marketing ────────────────────────────────────────────
  { pageId: 'bacheca-index',            title: 'Bacheca',                           razorPath: 'Views/Bacheca/Index.cshtml',                           apiPath: 'bacheca/GetTimone' },
  { pageId: 'tableau-to',               title: 'Tableau Tour Operator',             razorPath: 'Views/Bacheca/TableauTO.cshtml',                       apiPath: 'bacheca/GetTableauTO' },
  { pageId: 'bacheca-contratti',        title: 'Contratti (bacheca)',               razorPath: 'Views/Bacheca/Contratti.cshtml',                       apiPath: 'bacheca/GetContratti' },
  { pageId: 'bacheca-contratti-f2',     title: 'Contratti F2',                      razorPath: 'Views/Bacheca/ContrattiF2.cshtml',                     apiPath: 'bacheca/GetContrattiF2' },
  { pageId: 'bacheca-camere-fit',       title: 'Camere F.I.T.',                     razorPath: 'Views/Bacheca/CamereF.I.T..cshtml',                    apiPath: 'bacheca/GetCamereFIT' },
  { pageId: 'bacheca-cprenotazione',    title: 'Conferma prenotazione',             razorPath: 'Views/Bacheca/CPrenotazione.cshtml',                   apiPath: 'bacheca/GetCPrenotazione' },
  { pageId: 'bacheca-i-contratti',      title: 'I miei contratti',                  razorPath: 'Views/Bacheca/IContratti.cshtml',                      apiPath: 'bacheca/GetIContratti' },
  { pageId: 'bacheca-imt',              title: 'Indice Mercato Turistico (IMT)',    razorPath: 'Views/Bacheca/IMT.cshtml',                             apiPath: 'bacheca/GetIMT' },
  { pageId: 'bacheca-modifica-strat',   title: 'Modifica strategia',                razorPath: 'Views/Bacheca/ModificaStrat.cshtml',                   apiPath: 'strategie/GetStrategiaPricing' },
  { pageId: 'bacheca-sspi',             title: 'SSPI',                              razorPath: 'Views/Bacheca/SSPI.cshtml',                            apiPath: 'bacheca/GetSSPI' },
  { pageId: 'web-marketing',            title: 'Web Marketing',                     razorPath: 'Views/Bacheca/WebMarketing.cshtml',                    apiPath: 'bacheca/GetWebMarketing' },

  // ── Budget ─────────────────────────────────────────────────────────
  { pageId: 'budget-cabina',            title: 'Cabina di controllo budget',        razorPath: 'Views/Budget/Budget.cshtml',                           apiPath: 'budget/GetCabinaControllo' },
  { pageId: 'budget-costi',             title: 'Budget dei costi',                  razorPath: 'Views/Budget/BudgetC.cshtml',                          apiPath: 'budget/GetCosti' },
  { pageId: 'budget-ricavi',            title: 'Budget dei ricavi',                 razorPath: 'Views/Budget/BudgetR.cshtml',                          apiPath: 'budget/GetRicavi' },
  { pageId: 'budget-complessivo',       title: 'Budget complessivo',                razorPath: 'Views/Budget/BudgetComplessivo.cshtml',                apiPath: 'budget/GetComplessivo' },
  { pageId: 'budget-ricavi-corrente',   title: 'Budget ricavi anno corrente',       razorPath: 'Views/Budget/BudgetRecaviCurrentYear.cshtml',          apiPath: 'budget/GetRicaviCurrentYear' },
  { pageId: 'budget-ricavi-scorso',     title: 'Budget ricavi anno scorso',         razorPath: 'Views/Budget/BudgetRecaviLastYear.cshtml',             apiPath: 'budget/GetRicaviLastYear' },

  // ── Camere & Stanze ────────────────────────────────────────────────
  { pageId: 'allestisci-camere',        title: 'Allestisci camere',                 razorPath: 'Views/Camere/allestisciCamereIndex.cshtml',            apiPath: 'camere/GetAllestimento' },
  { pageId: 'crea-camera',              title: 'Crea camera',                       razorPath: 'Views/Camere/Create.cshtml',                           apiPath: 'camere/Insert' },
  { pageId: 'modifica-camera',          title: 'Modifica camera',                   razorPath: 'Views/Camere/modificaCamera.cshtml',                   apiPath: 'camere/Update' },
  { pageId: 'allestisci-stanze',        title: 'Allestisci stanza',                 razorPath: 'Views/Stanze/AllestisciCamera.cshtml',                 apiPath: 'stanze/GetAllestimento' },
  { pageId: 'disp-camere',              title: 'Disponibilità camere',              razorPath: 'Views/Stanze/Disponibilita.cshtml',                    apiPath: 'stanze/GetDisponibilita' },
  { pageId: 'crea-stanza',              title: 'Crea stanza',                       razorPath: 'Views/Stanze/create.cshtml',                           apiPath: 'stanze/Insert' },
  { pageId: 'modifica-stanza',          title: 'Modifica stanza',                   razorPath: 'Views/Stanze/ModificaStanza.cshtml',                   apiPath: 'stanze/Update' },

  // ── Check-in / Check-out ───────────────────────────────────────────
  { pageId: 'checkin',                  title: 'Check-in ospite',                   razorPath: 'Views/CheckIn/CheckIn.cshtml',                         apiPath: 'backoffice/GetCheckInList' },
  { pageId: 'checkout',                 title: 'Check-out',                         razorPath: 'Views/CheckOut/CheckOut.cshtml',                       apiPath: 'backoffice/GetCheckOut' },
  { pageId: 'checkout-doc',             title: 'Documento di check-out',            razorPath: 'Views/CheckOut/CheckOutDoc.cshtml',                    apiPath: 'backoffice/GetCheckOutDoc' },
  { pageId: 'checkout-individuale',     title: 'Check-out individuale',             razorPath: 'Views/CheckOut/CheckOutIndividuale.cshtml',            apiPath: 'backoffice/GetCheckOutIndividuale' },
  { pageId: 'emissione-documento',      title: 'Emissione documento fiscale',       razorPath: 'Views/CheckOut/EmissioneDocumento.cshtml',             apiPath: 'backoffice/EmissioneDocumento' },

  // ── Configura ──────────────────────────────────────────────────────
  { pageId: 'configura',                title: 'Configuratori',                     razorPath: 'Views/Configura/Configura.cshtml',                     apiPath: 'configura/GetConfiguratori' },

  // ── Executive ──────────────────────────────────────────────────────
  { pageId: 'executive-index',          title: 'Executive',                         razorPath: 'Views/Executive/Index.cshtml',                         apiPath: 'executive/GetIndex' },
  { pageId: 'business-centre',          title: 'Business centre',                   razorPath: 'Views/Bacheca/Index.cshtml',                           apiPath: 'bacheca/GetBusinessCentre' },

  // ── Finance ────────────────────────────────────────────────────────
  { pageId: 'monitoraggio-finanziario', title: 'Monitoraggio finanziario',          razorPath: 'Views/Finance/MonitoraggioFinanziario.cshtml',         apiPath: 'finance/GetMonitoraggio' },

  // ── Gestione Annunci ───────────────────────────────────────────────
  { pageId: 'crea-annuncio',            title: 'Crea annuncio',                     razorPath: 'Views/GestioneDegliAnnunci/Step1.cshtml',              apiPath: 'gestioneDegliAnnunci/Insert' },
  { pageId: 'acquisto-annuncio',        title: 'Acquisto annuncio',                 razorPath: 'Views/GestioneDegliAnnunci/Acquisto.cshtml',           apiPath: 'gestioneDegliAnnunci/Acquista' },
  { pageId: 'gestione-content',         title: 'Gestione contenuti',                razorPath: 'Views/GestioneDegliAnnunci/GestioneContent.cshtml',    apiPath: 'gestioneDegliAnnunci/GetContent' },

  // ── Gestione Scorte ────────────────────────────────────────────────
  { pageId: 'gestisci-scorte',          title: 'Gestisci scorte',                   razorPath: 'Views/GestioneScorte/GestisciScorte.cshtml',           apiPath: 'magazzino/GetScorte' },
  { pageId: 'chi-mens',                 title: 'Chiusure mensili',                  razorPath: 'Views/GestioneScorte/ChiMens.cshtml',                  apiPath: 'magazzino/GetChiusureMensili' },

  // ── Governance Data Drive ──────────────────────────────────────────
  { pageId: 'governance',               title: 'Governance data drive',             razorPath: 'Views/GovernanceDataDrive/GovernanceDataDrive.cshtml', apiPath: 'governance/GetIndex' },
  { pageId: 'booking-ids',              title: 'Booking IDs',                       razorPath: 'Views/GovernanceDataDrive/BookingIds.cshtml',          apiPath: 'governance/GetBookingIds' },
  { pageId: 'pickup',                   title: 'Pickup',                            razorPath: 'Views/GovernanceDataDrive/PickUP.cshtml',              apiPath: 'governance/GetPickup' },
  { pageId: 'revenue-gov',              title: 'Revenue (Governance)',              razorPath: 'Views/GovernanceDataDrive/Revenue.cshtml',             apiPath: 'governance/GetRevenue' },
  { pageId: 'vendite-segmenti',         title: 'Vendite per segmenti',              razorPath: 'Views/GovernanceDataDrive/VenditePerSegmenti.cshtml',  apiPath: 'governance/GetVenditeSegmenti' },

  // ── Griglia ────────────────────────────────────────────────────────
  { pageId: 'griglia',                  title: 'Griglia',                           razorPath: 'Views/Griglia/Griglia.cshtml',                         apiPath: 'griglia/Get' },
  { pageId: 'griglia-estesa-old',       title: 'Griglia estesa (legacy)',           razorPath: 'Views/Griglia/GrigliaEstesa.cshtml',                   apiPath: 'griglia/GetEstesa' },
  { pageId: 'report-disp-camere',       title: 'Report disponibilità camere',       razorPath: 'Views/Griglia/ReportDisponibilitaCamere.cshtml',       apiPath: 'griglia/GetReportDispCamere' },

  // ── Hardware ───────────────────────────────────────────────────────
  { pageId: 'totem-acquisti-spazi',     title: 'Totem — Acquisti spazi',            razorPath: 'Views/Hardware/TotemGestioneAcquistiSpazi.cshtml',     apiPath: 'hardware/GetTotemSpaziAcquisti' },
  { pageId: 'totem-advertising',        title: 'Totem — Advertising',               razorPath: 'Views/Hardware/TotemGestioneAdvertising.cshtml',       apiPath: 'hardware/GetTotemAdvertising' },
  { pageId: 'totem-advertising-stato',  title: 'Totem — Stato advertising',         razorPath: 'Views/Hardware/TotemGestioneAdvertisingStato.cshtml',  apiPath: 'hardware/GetTotemAdvertisingStato' },
  { pageId: 'totem-noleggia-spazi',     title: 'Totem — Noleggia spazi',            razorPath: 'Views/Hardware/TotemNoleggiaSpazi.cshtml',             apiPath: 'hardware/GetTotemNoleggiaSpazi' },

  // ── HR ──────────────────────────────────────────────────────────────
  { pageId: 'turnazione',               title: 'Turnazione personale',              razorPath: 'Views/HumanResource/Turnazione.cshtml',                apiPath: 'hr/GetTurnazione' },
  { pageId: 'turnazione-mese',          title: 'Turnazione mensile',                razorPath: 'Views/HumanResource/TurnazioneMese.cshtml',            apiPath: 'hr/GetTurnazioneMese' },
  { pageId: 'archivio-contratti-pers',  title: 'Archivio contratti personale',      razorPath: 'Views/HumanResource/ArchivioContrattiPersonale.cshtml',apiPath: 'hr/GetArchivioContratti' },
  { pageId: 'configura-premio',         title: 'Configura premio performance',      razorPath: 'Views/HumanResource/ConfiguraPremioPerformance.cshtml',apiPath: 'hr/GetConfigPremio' },
  { pageId: 'modifica-anagrafica-pers', title: 'Modifica anagrafica personale',     razorPath: 'Views/HumanResource/ModificaAnagraficaPersonale.cshtml',apiPath: 'anagrafica-personale/Update' },

  // ── Impostazione distribuzione ─────────────────────────────────────
  { pageId: 'imposta-dist',             title: 'Impostazione distribuzione',        razorPath: 'Views/ImpostazioneDistribuzione/ImpDistribuzione.cshtml', apiPath: 'distribuzione/GetImpostazione' },
  { pageId: 'check-partnership',        title: 'Check partnership',                 razorPath: 'Views/ImpostazioneDistribuzione/CheckPartnership.cshtml', apiPath: 'distribuzione/CheckPartnership' },
  { pageId: 'distribuzione-gruppi',     title: 'Distribuzione gruppi organizzati',  razorPath: 'Views/ImpostazioneDistribuzione/DistribuzioneGruppiOrganizzati.cshtml', apiPath: 'distribuzione/GetGruppiOrg' },
  { pageId: 'distribuzione-individuali',title: 'Distribuzione individuali',         razorPath: 'Views/ImpostazioneDistribuzione/DistribuzioneIndividuali.cshtml',     apiPath: 'distribuzione/GetIndividuali' },
  { pageId: 'strutture-alberghiere',    title: 'Strutture alberghiere (rete)',      razorPath: 'Views/ImpostazioneDistribuzione/StruttureAlberghiere.cshtml',         apiPath: 'distribuzione/GetStrutture' },

  // ── Impostazioni (varie) ───────────────────────────────────────────
  { pageId: 'assegnazioni-incarichi',   title: 'Assegnazione incarichi',            razorPath: 'Views/Impostazioni/AssegnazioneIncarichi.cshtml',      apiPath: 'operation/GetAssegnazioneIncarichi' },
  { pageId: 'gestione-preventivi',      title: 'Gestione preventivi',               razorPath: 'Views/Impostazioni/gestioneDeiPreventivi.cshtml',      apiPath: 'preventivi/GetPreventivi' },
  { pageId: 'interfacce-imp',           title: 'Interfacce',                        razorPath: 'Views/Impostazioni/Interfacce.cshtml',                 apiPath: 'interfacce/Get' },
  { pageId: 'locker-imp',               title: 'Locker',                            razorPath: 'Views/Impostazioni/Locker.cshtml',                     apiPath: 'locker/GetConfig' },
  { pageId: 'modifica-struttura',       title: 'Modifica struttura',                razorPath: 'Views/Impostazioni/ModificaStruttura.cshtml',          apiPath: 'azienda/GetStrutture' },
  { pageId: 'ordine-servizio',          title: 'Ordine di servizio',                razorPath: 'Views/Impostazioni/OrdineServizio.cshtml',             apiPath: 'operation/GetOrdineServizio' },
  { pageId: 'piano-camere',             title: 'Piano camere giornaliero',          razorPath: 'Views/Impostazioni/PianoCamereGiornaliero.cshtml',     apiPath: 'operation/GetPianoCamere' },
  { pageId: 'premio-performance',       title: 'Premio performance',                razorPath: 'Views/Impostazioni/PremioPerformance.cshtml',          apiPath: 'hr/GetPremioPerformance' },
  { pageId: 'previsione-movimenti',     title: 'Previsione movimenti camere',       razorPath: 'Views/Impostazioni/PrevisioneMovimentiCamere.cshtml',  apiPath: 'operation/GetPrevisioneMovimenti' },
  { pageId: 'radar',                    title: 'Radar',                             razorPath: 'Views/Impostazioni/Radar.cshtml',                      apiPath: 'radar/Get' },
  { pageId: 'riepilogo-bacheca',        title: 'Riepilogo bacheca',                 razorPath: 'Views/Impostazioni/RiepilogoBacheca.cshtml',           apiPath: 'bacheca/GetRiepilogo' },
  { pageId: 'segnalazioni-imp',         title: 'Segnalazioni',                      razorPath: 'Views/Impostazioni/Segnalazioni.cshtml',               apiPath: 'operation/segnalazioni/Get' },
  { pageId: 'totem-adv-imp',            title: 'Totem advertising (impostazioni)',  razorPath: 'Views/Impostazioni/TotemAdv.cshtml',                   apiPath: 'hardware/GetTotemAdvertising' },
  { pageId: 'vending-machine',          title: 'Vending machine',                   razorPath: 'Views/Impostazioni/vendingMachine.cshtml',             apiPath: 'hardware/GetVendingMachine' },

  // ── Interfacce, Locker, Mixer, Monitoraggi, Tariffe ────────────────
  { pageId: 'interfacce',               title: 'Interfacce',                        razorPath: 'Views/Interfacce/Index.cshtml',                        apiPath: 'interfacce/Get' },
  { pageId: 'locker',                   title: 'Locker',                            razorPath: 'Views/Locker/Index.cshtml',                            apiPath: 'locker/Get' },
  { pageId: 'mixer',                    title: 'Mixer',                             razorPath: 'Views/Mixer/Mixer.cshtml',                             apiPath: 'mixer/Get' },
  { pageId: 'monitoraggio-tariffe',     title: 'Monitoraggio tariffe',              razorPath: 'Views/Monitoraggi/MonitoraggioTariff.cshtml',          apiPath: 'monitoraggi/GetTariffe' },
  { pageId: 'tariffe',                  title: 'Tariffe',                           razorPath: 'Views/Tariffe/Tariffe.cshtml',                         apiPath: 'tariffe/Get' },

  // ── Notifiche annunci ──────────────────────────────────────────────
  { pageId: 'notifica-annuncio',        title: 'Annuncio',                          razorPath: 'Views/Notifiche/annuncio.cshtml',                      apiPath: 'notifiche/GetAnnuncio' },
  { pageId: 'notifica-annuncio-prev',   title: 'Anteprima annuncio',                razorPath: 'Views/Notifiche/annuncioPrev.cshtml',                  apiPath: 'notifiche/GetAnnuncioPrev' },

  // ── Operation (varie) ──────────────────────────────────────────────
  { pageId: 'libro-prenotazioni',       title: 'Libro prenotazioni',                razorPath: 'Views/Operation/LibroPrenotazioni.cshtml',             apiPath: 'operation/GetLibroPrenotazioni' },
  { pageId: 'chiusura-cassa',           title: 'Chiusura cassa',                    razorPath: 'Views/Operation/ChiusuraCassa.cshtml',                 apiPath: 'operation/GetChiusuraCassa' },
  { pageId: 'preliminare',              title: 'Chiusura preliminare',              razorPath: 'Views/Operation/ChiusuraCassa.cshtml (preliminare)',   apiPath: 'operation/GetChiusuraPreliminare' },
  { pageId: 'registro-chiusure',        title: 'Registro chiusure',                 razorPath: 'Views/Operation/ChiusuraCassa.cshtml (registro)',      apiPath: 'operation/GetRegistroChiusure' },
  { pageId: 'ricevute-ospiti',          title: 'Ricevute ospiti',                   razorPath: 'Views/Operation/RicevuteOspiti.cshtml',                apiPath: 'operation/GetRicevuteOspiti' },
  { pageId: 'conti-passanti',           title: 'Conti passanti',                    razorPath: 'Views/Operation/ContiPassanti.cshtml',                 apiPath: 'operation/GetContiPassanti' },
  { pageId: 'conti-aperti',             title: 'Conti aperti',                      razorPath: 'Views/Operation/ContiPassanti.cshtml (aperti)',        apiPath: 'operation/GetContiAperti' },
  { pageId: 'conti-chiusi',             title: 'Conti chiusi',                      razorPath: 'Views/Operation/Conti_Chiusi.cshtml',                  apiPath: 'operation/GetContiChiusi' },
  { pageId: 'conti-parcheggiati',       title: 'Conti parcheggiati',                razorPath: 'Views/Operation/Conti_parcheggiati.cshtml',            apiPath: 'operation/GetContiParcheggiati' },
  { pageId: 'dettaglio-struttura',      title: 'Dettaglio struttura',               razorPath: 'Views/Operation/DettaglioStruttura.cshtml',            apiPath: 'azienda/GetDettaglioStruttura' },
  { pageId: 'in-casa-op',               title: 'Ospiti in casa (legacy)',           razorPath: 'Views/Operation/InCasa.cshtml',                        apiPath: 'backoffice/GetInCasa' },
  { pageId: 'manutenzioni',             title: 'Manutenzioni',                      razorPath: 'Views/Operation/Manutenzioni.cshtml',                  apiPath: 'operation/GetManutenzioni' },
  { pageId: 'monitoraggio-cassa-op',    title: 'Monitoraggio cassa',                razorPath: 'Views/Operation/MonitoraggioCassa.cshtml',             apiPath: 'operation/GetMovimentiCassa' },
  { pageId: 'planner2',                 title: 'Planner v2',                        razorPath: 'Views/Operation/Planner2.cshtml',                      apiPath: 'planner/GetV2' },
  { pageId: 'planner3',                 title: 'Planner v3',                        razorPath: 'Views/Operation/Planner3.cshtml',                      apiPath: 'planner/GetV3' },
  { pageId: 'pulizie',                  title: 'Pulizie',                           razorPath: 'Views/Operation/Pulizie.cshtml',                       apiPath: 'operation/GetPulizie' },
  { pageId: 'sala-ristorante',          title: 'Sala ristorante',                   razorPath: 'Views/Operation/SalaRistorante.cshtml',                apiPath: 'operation/GetSalaRistorante' },
  { pageId: 'gestione-sala',            title: 'Gestione sala',                     razorPath: 'Views/Operation/SalaRistorante.cshtml',                apiPath: 'operation/GetGestioneSala' },
  { pageId: 'ospiti-del-giorno',        title: 'Ospiti del giorno',                 razorPath: 'Views/Operation/InCasa.cshtml',                        apiPath: 'backoffice/GetOspitiDelGiorno' },
  { pageId: 'nuovo-conto-passante',     title: 'Nuovo conto passante',              razorPath: 'Views/Operation/ContiPassanti.cshtml (nuovo)',         apiPath: 'operation/InsertContoPassante' },
  { pageId: 'elenco-documenti',         title: 'Elenco documenti',                  razorPath: 'Views/Operation/RicevuteOspiti.cshtml',                apiPath: 'operation/GetElencoDocumenti' },

  // ── PMS ────────────────────────────────────────────────────────────
  { pageId: 'pms-commissioni',          title: 'PMS — Commissioni',                 razorPath: 'Views/PMS/Commissioni.cshtml',                         apiPath: 'pms/GetCommissioni' },
  { pageId: 'gestione-commissioni',     title: 'Gestione commissioni',              razorPath: 'Views/PMS/GestioneCommissioni.cshtml',                 apiPath: 'pms/GetGestioneCommissioni' },
  { pageId: 'pms-import',               title: 'Import summary',                    razorPath: 'Views/PMS/ImportSummary.cshtml',                       apiPath: 'pms/GetImportSummary' },
  { pageId: 'pms-prenotazioni',         title: 'PMS — Prenotazioni',                razorPath: 'Views/PMS/Prenotazioni.cshtml',                        apiPath: 'pms/GetPrenotazioni' },
  { pageId: 'pms-visualizza-pren',      title: 'Visualizza prenotazioni PMS',       razorPath: 'Views/PMS/VisualizzaPrenotazioni.cshtml',              apiPath: 'pms/GetVisualizzaPrenotazioni' },

  // ── Prenotazioni (link) ────────────────────────────────────────────
  { pageId: 'conferma-prenotazione',    title: 'Conferma prenotazione',             razorPath: 'Views/Prenotazioni/ConfermaPrenotazione.cshtml',       apiPath: 'prenotazioni/GetConferma' },
  { pageId: 'qr-checkin',               title: 'QR check-in',                       razorPath: 'Views/Prenotazioni/qr.cshtml',                         apiPath: 'prenotazioni/GetQR' },

  // ── Prodotti (Agora B2B) ───────────────────────────────────────────
  { pageId: 'lista-prodotti',           title: 'Lista prodotti',                    razorPath: 'Views/Prodotti/ListaProdotti.cshtml',                  apiPath: 'prodotti/Get' },
  { pageId: 'inserisci-prodotti',       title: 'Inserisci prodotti',                razorPath: 'Views/Prodotti/InserisciProdotti.cshtml',              apiPath: 'prodotti/Insert' },

  // ── Report — sub-pagine ────────────────────────────────────────────
  { pageId: 'report-index',             title: 'Report',                            razorPath: 'Views/Report/Index.cshtml',                            apiPath: 'report/GetIndex' },
  { pageId: 'adr-analysis',             title: 'ADR Analysis',                      razorPath: 'Views/Report/AdrAnalysis2.cshtml',                     apiPath: 'report/GetAdrAnalysis' },
  { pageId: 'occ-analysis',             title: 'OCC Analysis',                      razorPath: 'Views/Report/OccupancyAnalysis2.cshtml',               apiPath: 'report/GetOccupancy' },
  { pageId: 'incoming-analysis',        title: 'Incoming analysis',                 razorPath: 'Views/Report/IncomingAnalysis2.cshtml',                apiPath: 'report/GetIncoming' },
  { pageId: 'on-the-book',              title: 'On the book analysis',              razorPath: 'Views/Report/BookAnalysis2.cshtml',                    apiPath: 'report/GetOnTheBook' },
  { pageId: 'budget-analysis',          title: 'Budget analysis',                   razorPath: 'Views/Report/BudgetAnalysis2.cshtml',                  apiPath: 'report/GetBudget' },
  { pageId: 'segment-analysis',         title: 'Segment analysis',                  razorPath: 'Views/Report/SegmentAnalysis2.cshtml',                 apiPath: 'report/GetSegment' },
  { pageId: 'guest-room',               title: 'Guest & Room analysis',             razorPath: 'Views/Report/GuestRoomAnalysis2.cshtml',               apiPath: 'report/GetGuestRoom' },
  { pageId: 'op-overview',              title: 'Operation overview',                razorPath: 'Views/Report/OperationOverview.cshtml',                apiPath: 'report/GetOperationOverview' },
  { pageId: 'monthly-trend',            title: 'Monthly trend',                     razorPath: 'Views/Report/MonthlyAnalysis2.cshtml',                 apiPath: 'report/GetMonthly' },
  { pageId: 'grand-total',              title: 'Grand total',                       razorPath: 'Views/Report/PanoramicaImpresa2.cshtml',                apiPath: 'report/GetGrandTotal' },
  { pageId: 'cashflow',                 title: 'Cashflow',                          razorPath: 'Views/Report/CashFlowAnalysis2.cshtml',                apiPath: 'report/GetCashflow' },
  { pageId: 'profit-trend',             title: 'Profit trend',                      razorPath: 'Views/Report/ForecastAnalysis2.cshtml',                apiPath: 'report/GetForecast' },
  { pageId: 'cost-analysis',            title: 'Cost analysis',                     razorPath: 'Views/Report/CostsAnalysis2.cshtml',                   apiPath: 'report/GetCosts' },
  { pageId: 'cost-decision-tree',       title: 'Cost decision tree',                razorPath: 'Views/Report/CostDecisionTree2.cshtml',                apiPath: 'report/GetCostDecisionTree' },
  { pageId: 'decision-tree',            title: 'Decision tree',                     razorPath: 'Views/Report/DecisionTree2.cshtml',                    apiPath: 'report/GetDecisionTree' },
  { pageId: 'break-even',               title: 'Break even',                        razorPath: 'Views/Report/BreakEventPointAnalysis2.cshtml',         apiPath: 'report/GetBreakEven' },
  { pageId: 'analisi-acquisti',         title: 'Analisi acquisti',                  razorPath: 'Views/Report/AnalisiAcquisti2.cshtml',                 apiPath: 'report/GetAnalisiAcquisti' },
  { pageId: 'analisi-vendite',          title: 'Analisi vendite',                   razorPath: 'Views/Report/AnalisiVendite2.cshtml',                  apiPath: 'report/GetAnalisiVendite' },
  { pageId: 'analisi-scenari',          title: 'Analisi scenari',                   razorPath: 'Views/Report/AnalisiScenari2.cshtml',                  apiPath: 'report/GetAnalisiScenari' },
  { pageId: 'analisi-scenari-mensili',  title: 'Analisi scenari mensili',           razorPath: 'Views/Report/AnalisiScenariMensili.cshtml',            apiPath: 'report/GetAnalisiScenariMensili' },
  { pageId: 'fatturazione-passiva',     title: 'Fatturazione passiva',              razorPath: 'Views/Report/FatturazionePassiva2.cshtml',             apiPath: 'report/GetFatturazionePassiva' },
  { pageId: 'controllo-gestione',       title: 'Controllo di gestione',             razorPath: 'Views/Report/ControlloGestione2.cshtml',               apiPath: 'report/GetControlloGestione' },
  { pageId: 'ledger-analysis',          title: 'Ledger analysis',                   razorPath: 'Views/Report/LedgerAnalysis2.cshtml',                  apiPath: 'report/GetLedger' },
  { pageId: 'revenue-analysis',         title: 'Revenue analysis',                  razorPath: 'Views/Report/RevenueAnalysis2.cshtml',                 apiPath: 'report/GetRevenue' },
  { pageId: 'maintenance-analysis',     title: 'Maintenance analysis',              razorPath: 'Views/Report/MaintenanceAnalysis.cshtml',              apiPath: 'report/GetMaintenance' },
  { pageId: 'profile-analysis',         title: 'Profile analysis',                  razorPath: 'Views/Report/ProfileAnalysis.cshtml',                  apiPath: 'report/GetProfile' },
  { pageId: 'panoramica-giornaliera',   title: 'Panoramica giornaliera',            razorPath: 'Views/Report/PanoramicaGiornaliera.cshtml',            apiPath: 'report/GetPanoramicaGiornaliera' },
  { pageId: 'panoramica-impresa',       title: 'Panoramica impresa',                razorPath: 'Views/Report/PanoramicaImpresa2.cshtml',               apiPath: 'report/GetPanoramicaImpresa' },
  { pageId: 'simulatori-scenari',       title: 'Simulatori scenari',                razorPath: 'Views/Report/SimulatoriScenari.cshtml',                apiPath: 'report/GetSimulatoriScenari' },
  { pageId: 'hr-analysis',              title: 'HR analysis',                       razorPath: 'Views/Report/HrAnalysis.cshtml',                       apiPath: 'report/GetHrAnalysis' },
  { pageId: 'report-tableau',           title: 'Report Tableau',                    razorPath: 'Views/Report/ReportTableau2.cshtml',                   apiPath: 'report/GetReportTableau' },
  { pageId: 'embed-aa',                 title: 'Embed Report — Analisi Avanzata',   razorPath: 'Views/Report/EmbedReportAA.cshtml',                    apiPath: 'report/GetEmbedAA' },
  { pageId: 'embed-cg',                 title: 'Embed — Controllo gestione',        razorPath: 'Views/Report/EmbedReportCg.cshtml',                    apiPath: 'report/GetEmbedCG' },
  { pageId: 'embed-ex',                 title: 'Embed — Executive',                 razorPath: 'Views/Report/EmbedReportEx.cshtml',                    apiPath: 'report/GetEmbedEX' },
  { pageId: 'embed-sm',                 title: 'Embed — Sales & Marketing',         razorPath: 'Views/Report/EmbedReportSm.cshtml',                    apiPath: 'report/GetEmbedSM' },
  { pageId: 'embed-st',                 title: 'Embed — Strategie',                 razorPath: 'Views/Report/EmbedReportSt.cshtml',                    apiPath: 'report/GetEmbedST' },
  { pageId: 'embed-tb',                 title: 'Embed — Tableau',                   razorPath: 'Views/Report/EmbedReportTb.cshtml',                    apiPath: 'report/GetEmbedTB' },
  { pageId: 'embed-dashboard',          title: 'Embed dashboard',                   razorPath: 'Views/Report/EmbedDashboard.cshtml',                   apiPath: 'report/GetEmbedDashboard' },
  { pageId: 'embed-tile',               title: 'Embed tile',                        razorPath: 'Views/Report/EmbedTile.cshtml',                        apiPath: 'report/GetEmbedTile' },

  // ── Ricevimento, RoomFit, ScontiPromozioni ─────────────────────────
  { pageId: 'ricevimento',              title: 'Ricevimento',                       razorPath: 'Views/Ricevimento/Ricevimento.cshtml',                 apiPath: 'ricevimento/GetIndex' },
  { pageId: 'room-fit',                 title: 'Room FIT',                          razorPath: 'Views/RoomFit/RoomFIT.cshtml',                         apiPath: 'roomfit/Get' },
  { pageId: 'room-fit-network',         title: 'Room FIT Network',                  razorPath: 'Views/RoomFit/RoomFITForNetwork.cshtml',               apiPath: 'roomfit/GetNetwork' },
  { pageId: 'sconti-promozioni',        title: 'Sconti & Promozioni',               razorPath: 'Views/ScontiPromozioni/ScontiPromozioni.cshtml',       apiPath: 'sconti/Get' },

  // ── Servizi (varie) ────────────────────────────────────────────────
  { pageId: 'servizi-index',            title: 'Servizi',                           razorPath: 'Views/Servizi/ServiziIndex.cshtml',                    apiPath: 'servizi/GetServizi' },
  { pageId: 'configura-orari-servizi',  title: 'Configura orari servizi',           razorPath: 'Views/Servizi/ConfiguraOrariServizi.cshtml',           apiPath: 'servizi/GetOrari' },
  { pageId: 'inserisci-servizi',        title: 'Inserisci servizi',                 razorPath: 'Views/Servizi/InserisciServizi.cshtml',                apiPath: 'servizi/InsertServizio' },
  { pageId: 'modifica-servizio',        title: 'Modifica servizio',                 razorPath: 'Views/Servizi/ModificaServizio.cshtml',                apiPath: 'servizi/UpdateServizio' },
  { pageId: 'nuovo-servizio',           title: 'Nuovo servizio',                    razorPath: 'Views/Servizi/NuovoServizio.cshtml',                   apiPath: 'servizi/InsertServizio' },
  { pageId: 'riepilogo-servizi',        title: 'Riepilogo servizi',                 razorPath: 'Views/Servizi/RiepilogoServizi.cshtml',                apiPath: 'servizi/GetRiepilogo' },
  { pageId: 'varianti-servizio',        title: 'Varianti servizio',                 razorPath: 'Views/Servizi/VariantiServizio.cshtml',                apiPath: 'servizi/GetVarianti' },
  { pageId: 'acquisti-servizi',         title: 'Acquisti servizi',                  razorPath: 'Views/Servizi/Servizi.cshtml',                         apiPath: 'servizi/GetAcquisti' },

  // ── SSPI Survey ────────────────────────────────────────────────────
  { pageId: 'sspi-survey',              title: 'SSPI Survey',                       razorPath: 'Views/SspiSurvey/Index.cshtml',                        apiPath: 'sspi/GetSurvey' },
  { pageId: 'sspi-registra-risposta',   title: 'Registra risposta SSPI',            razorPath: 'Views/SspiSurvey/RegistraRisposta.cshtml',             apiPath: 'sspi/RegistraRisposta' },

  // ── Suggerimenti (varie) ───────────────────────────────────────────
  { pageId: 'cal-bar',                  title: 'Calendario BAR',                    razorPath: 'Views/Suggerimenti/CalendarioBAR.cshtml',              apiPath: 'suggerimenti/GetCalendarioBAR' },
  { pageId: 'gest-canali',              title: 'Gestione canali',                   razorPath: 'Views/Suggerimenti/GestioneCanali.cshtml',             apiPath: 'suggerimenti/GetCanali' },
  { pageId: 'info-bars',                title: 'Info BARS',                         razorPath: 'Views/Suggerimenti/InfoBarsModal.cshtml',              apiPath: 'suggerimenti/GetBars' },
  { pageId: 'strategie-sugg',           title: 'Strategie',                         razorPath: 'Views/Suggerimenti/Strategie.cshtml',                  apiPath: 'strategie/GetStrategieByStruttura' },
  { pageId: 'sug-approv',               title: 'Suggerimenti approvvigionamenti',   razorPath: 'Views/Suggerimenti/SuggApprovigionamenti.cshtml',     apiPath: 'suggerimenti/GetApprov' },
  { pageId: 'sug-strat',                title: 'Suggerimenti strategie',            razorPath: 'Views/Suggerimenti/SugStrat.cshtml',                   apiPath: 'suggerimenti/GetSugStrat' },
  { pageId: 'sug-strat-table',          title: 'Tabella suggerimenti strategie',    razorPath: 'Views/Suggerimenti/SugStratTable.cshtml',              apiPath: 'suggerimenti/GetSugStratTable' },

  // ── Sysadmin (varie) ───────────────────────────────────────────────
  { pageId: 'aziende-mapping',          title: 'Aziende mapping',                   razorPath: 'Views/SYSADMIN/AziendeMapping.cshtml',                 apiPath: 'aziende/GetMapping' },
  { pageId: 'cache-manager',            title: 'Cache manager',                     razorPath: 'Views/SYSADMIN/CacheManager.cshtml',                   apiPath: 'sysadmin/GetCache' },
  { pageId: 'codici-sconto',            title: 'Codici sconto',                     razorPath: 'Views/SYSADMIN/CodiceSconti.cshtml',                   apiPath: 'sconti/GetCodici' },
  { pageId: 'crea-codice-sconto',       title: 'Crea codice sconto',                razorPath: 'Views/SYSADMIN/CreateCodiceSconto.cshtml',             apiPath: 'sconti/InsertCodice' },
  { pageId: 'comissioni-aziende',       title: 'Commissioni aziende',               razorPath: 'Views/SYSADMIN/ComissioniAziende.cshtml',              apiPath: 'commissioni/GetAziende' },
  { pageId: 'commissioni-pannello',     title: 'Commissioni — pannello',            razorPath: 'Views/SYSADMIN/CommissioniPannello.cshtml',            apiPath: 'commissioni/GetPannello' },
  { pageId: 'crea-commissioni',         title: 'Crea commissioni',                  razorPath: 'Views/SYSADMIN/CreateComissioni.cshtml',               apiPath: 'commissioni/Insert' },
  { pageId: 'crea-azienda',             title: 'Crea azienda',                      razorPath: 'Views/SYSADMIN/CreateAzienda.cshtml',                  apiPath: 'aziende/Insert' },
  { pageId: 'crea-azienda-a',           title: 'Crea azienda (acquisti)',           razorPath: 'Views/SYSADMIN/CreateAzienda.cshtml',                  apiPath: 'aziende/Insert' },
  { pageId: 'crea-struttura',           title: 'Crea struttura',                    razorPath: 'Views/SYSADMIN/CreateAzienda.cshtml',                  apiPath: 'azienda/Insert' },
  { pageId: 'processi-automatici',      title: 'Processi automatici',               razorPath: 'Views/SYSADMIN/GestioneProcessiAutomatici.cshtml',     apiPath: 'sysadmin/GetProcessi' },
  { pageId: 'imposta-pagine',           title: 'Imposta pagine',                    razorPath: 'Views/SYSADMIN/ImpostaPagine.cshtml',                  apiPath: 'admin/GetPageList' },
  { pageId: 'payment-management',       title: 'Payment management',                razorPath: 'Views/SYSADMIN/PaymentManagement.cshtml',              apiPath: 'sysadmin/GetPaymentManagement' },
  { pageId: 'sysadmin-soggiorno',       title: 'Soggiorno (sysadmin)',              razorPath: 'Views/SYSADMIN/Soggiorno.cshtml',                      apiPath: 'sysadmin/GetSoggiorno' },

  // ── Tableau (sub-flussi) ───────────────────────────────────────────
  { pageId: 'tableau-home',             title: 'Tableau — Home',                    razorPath: 'Views/Tableau/Home.cshtml',                            apiPath: 'tableau/GetHome' },
  { pageId: 'tableau-carrello',         title: 'Tableau — Carrello',                razorPath: 'Views/Tableau/Carrello.cshtml',                        apiPath: 'carrello/GetCarrello' },
  { pageId: 'tab-conferma-est',         title: 'Conferma / rifiuta estensione',     razorPath: 'Views/Tableau/ConfermaRifiutaEstensione.cshtml',       apiPath: 'tableau/ConfermaRifiutaEstensione' },
  { pageId: 'tab-conferma-extra',       title: 'Conferma / rifiuta extra',          razorPath: 'Views/Tableau/ConfermaRifiutaExtra.cshtml',            apiPath: 'tableau/ConfermaRifiutaExtra' },
  { pageId: 'tab-contratti-agora',      title: 'Contratti Agora',                   razorPath: 'Views/Tableau/ContrattiAgora.cshtml',                  apiPath: 'agora/GetContratti' },
  { pageId: 'tab-gestione-prev',        title: 'Tableau — Gestione preventivi',     razorPath: 'Views/Tableau/gestioneDeiPreventivi.cshtml',           apiPath: 'preventivi/GetPreventivi' },
  { pageId: 'tab-gestione-prev2',       title: 'Tableau — Gestione preventivo',     razorPath: 'Views/Tableau/GestionePreventivo.cshtml',              apiPath: 'preventivi/GetPreventivo' },
  { pageId: 'inserisci-gruppo',         title: 'Inserisci gruppo',                  razorPath: 'Views/Tableau/InserisciGruppo.cshtml',                 apiPath: 'tableau/InsertGruppo' },
  { pageId: 'invito-hotel',             title: 'Invito hotel',                      razorPath: 'Views/Tableau/InvitoHotel.cshtml',                     apiPath: 'tableau/InvitoHotel' },
  { pageId: 'reservhotel',              title: 'Reserv hotel',                      razorPath: 'Views/Tableau/ReservHotel.cshtml',                     apiPath: 'tableau/ReservHotel' },
  { pageId: 'rooming-list',             title: 'Rooming list',                      razorPath: 'Views/Tableau/RoomingList.cshtml',                     apiPath: 'tableau/GetRoomingList' },

  // ── Utente (varie) ─────────────────────────────────────────────────
  { pageId: 'g-profilo',                title: 'Gestione profilo',                  razorPath: 'Views/Utente/GProfilo.cshtml',                         apiPath: 'utente/GetProfilo' },
  { pageId: 'utente-notifiche',         title: 'Notifiche utente',                  razorPath: 'Views/Utente/Notifiche.cshtml',                        apiPath: 'utente/GetNotifiche' },
  { pageId: 'gestione-organizzazione',  title: 'Gestione organizzazione',           razorPath: 'Views/Utente/GestioneOrganizzazione.cshtml',           apiPath: 'utente/GetOrganizzazione' },
  { pageId: 'nuovo-invito',             title: 'Nuovo invito',                      razorPath: 'Views/Utente/NuovoInvito.cshtml',                      apiPath: 'utente/Invita' },
  { pageId: 'registrazione-completata', title: 'Registrazione completata',          razorPath: 'Views/Utente/RegistrazioneCompletata.cshtml' },
  { pageId: 'valida-email',             title: 'Valida email',                      razorPath: 'Views/Utente/ValidaEmail.cshtml',                      apiPath: 'utente/ValidaEmail' },

  // ── VoIP / 3CX ─────────────────────────────────────────────────────
  { pageId: 'voip',                     title: 'VoIP Service Hub',                  razorPath: 'Views/VoipServiceHUB/VoipServiceHUB.cshtml',           apiPath: 'voip/Get' },
  { pageId: 'gest-chiamate',            title: 'Gestione chiamate',                 razorPath: 'Views/VoipServiceHUB/VoipServiceHUB.cshtml',           apiPath: 'voip/GetChiamate' },
]

const PORTED_INDEX: Record<string, PortedPageDef> = Object.fromEntries(
  PORTED_PAGES.map((p) => [p.pageId, p])
)

/**
 * Rendering di una pagina portata: ritorna `null` se il `pageId` non è
 * in `PORTED_PAGES`. In quel caso il router proseguirà col fallback
 * `GenericPage`.
 */
export function renderPortedPage(pageId: string, navigate: (p: string) => void): React.ReactElement | null {
  const def = PORTED_INDEX[pageId]
  if (!def) return null
  return (
    <StubPage
      pageId={def.pageId}
      razorPath={def.razorPath}
      title={def.title}
      subtitle={def.subtitle ?? subtitleForPage(def.pageId)}
      apiPath={def.apiPath}
      onBack={() => navigate('home')}
    />
  )
}

export function PortedPage({ pageId, navigate }: { pageId: string } & NavProps) {
  return renderPortedPage(pageId, navigate)
}
