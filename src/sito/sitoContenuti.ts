import { FOTO } from './sitoData'
import type { PaginaInfo } from './useSitoStore'

/**
 * Testi delle pagine istituzionali, ripresi dal sito attuale
 * (www.sibyllanetwork.com) e riordinati. Privacy e cookie sono solo struttura:
 * il testo legale va fornito dall'ufficio legale.
 */

export const PAGINE_INFO: Record<PaginaInfo, { titolo: string; enfasi?: string; kicker: string; sotto: string; foto: string; icona: string }> = {
  'chi-siamo': { titolo: 'Il nuovo modo di vivere il', enfasi: 'turismo', kicker: 'Chi siamo', icona: 'fa-key', foto: FOTO.sanPietro,
    sotto: "Il volto accessibile dell'ecosistema Sibylla: un portale che connette viaggiatori, territori e imprese locali in un'esperienza digitale fluida, sostenibile e autentica." },
  partner: { titolo: 'I partner di', enfasi: 'Sibylla', kicker: 'La rete', icona: 'fa-handshake', foto: FOTO.ristorante,
    sotto: 'Imprese, enti, consorzi e professionisti del turismo che costruiscono con noi un ecosistema dinamico, sostenibile e condiviso.' },
  imt: { titolo: 'Programma di rete', enfasi: 'I.M.T.', kicker: 'Innovation meets travel', icona: 'fa-diagram-project', foto: FOTO.tevere,
    sotto: 'Collaborazione, innovazione e sostenibilità per le imprese aderenti: meno costi, più vendite, economie di scala.' },
  lavora: { titolo: 'Lavora', enfasi: 'con noi', kicker: 'Carriere', icona: 'fa-briefcase', foto: FOTO.assistenza,
    sotto: "Vuoi contribuire all'evoluzione del turismo in un ecosistema innovativo, collaborativo e umano? Il tuo posto potrebbe essere qui." },
  contatti: { titolo: 'Siamo qui', enfasi: 'per te', kicker: 'Contattaci', icona: 'fa-comments', foto: FOTO.mappa,
    sotto: 'Domande, curiosità o un progetto da costruire insieme: scrivici e ti rispondiamo entro un giorno lavorativo.' },
  societa: { titolo: 'Dati', enfasi: 'societari', kicker: 'Sibylla S.r.l.', icona: 'fa-building', foto: FOTO.colosseoArchi,
    sotto: 'Le informazioni legali della società che gestisce Sibylla Network.' },
  privacy: { titolo: 'Informativa', enfasi: 'privacy', kicker: 'Documenti legali', icona: 'fa-shield-halved', foto: FOTO.mappa,
    sotto: 'Come trattiamo i dati personali di chi visita il sito e acquista sulla rete.' },
  cookie: { titolo: 'Cookie', enfasi: 'policy', kicker: 'Documenti legali', icona: 'fa-cookie-bite', foto: FOTO.mappa,
    sotto: 'Quali cookie usa il sito, a cosa servono e come gestire le preferenze.' },
}

export const VALORI = [
  { icona: 'fa-water', tit: 'Immersione', txt: 'Soggiorni, sapori ed emozioni pensati per farti sentire parte del luogo, non solo un visitatore.' },
  { icona: 'fa-circle-nodes', tit: 'Ecosistema', txt: 'Ogni struttura e fornitore è parte attiva di una rete autentica e sostenibile. Qui nulla è lasciato al caso.' },
  { icona: 'fa-brain-circuit', tit: 'Intelligenza', txt: "Dietro ogni scelta c'è una strategia: i dati migliorano la tua esperienza e aiutano le imprese a crescere." },
  { icona: 'fa-tablet-screen', tit: 'Connessione', txt: "Totem e accessi digitali ti connettono all'offerta locale in ogni momento del viaggio." },
]

export const FASI_IMT: { fase: number; stato: string; obiettivi: { tit: string; txt: string }[] }[] = [
  { fase: 1, stato: 'In corso', obiettivi: [
    { tit: 'Collaborazione e innovazione', txt: 'Una rete che favorisce sicurezza, sostenibilità e risparmi sugli acquisti, una gestione più efficiente del personale e camere più redditizie.' },
    { tit: 'Più profitto per le imprese', txt: 'Riduzione dei costi, ottimizzazione delle vendite e nuove opportunità commerciali generate da Sibylla Platform.' },
    { tit: 'Economie di scala', txt: 'Risorse condivise e acquisti collettivi di beni e servizi per abbattere i costi complessivi.' },
  ] },
  { fase: 2, stato: 'In programma', obiettivi: [] },
  { fase: 3, stato: 'In programma', obiettivi: [] },
]

export const POSIZIONI = [
  { id: 'sales', tit: 'Sales agent', luogo: 'Roma · ibrido', txt: 'Passione per le relazioni e fiuto per le opportunità: fai crescere un network di valore.' },
  { id: 'dev', tit: 'Senior developer', luogo: 'Roma · remoto', txt: 'Piattaforme modulari, intelligenti e interconnesse, con un impatto reale.' },
  { id: 'ops', tit: 'Operation manager', luogo: 'Roma', txt: 'Mente organizzativa e pensiero sistemico per coordinare processi, team e progetti.' },
]

export const SOCIETA = [
  { k: 'Ragione sociale', v: 'Sibylla S.r.l.' },
  { k: 'Capitale sociale', v: '50.000,00 €' },
  { k: 'Sede legale', v: 'Via Vicenza 5/A, 00185 Roma' },
  { k: 'Codice fiscale e REA', v: '15953321005 · REA 1625640' },
  { k: 'PEC', v: 'sibylla.srl@legalmail.it' },
  { k: 'Codice SDI', v: 'M5UXCR1' },
]

/** Indici dei documenti legali (il testo arriva dall'ufficio legale). */
export const LEGALE: Record<'privacy' | 'cookie', string[]> = {
  privacy: ['Titolare del trattamento', 'Dati raccolti', 'Finalità e base giuridica', 'Conservazione', 'Destinatari dei dati', 'Diritti dell’interessato', 'Contatti'],
  cookie: ['Cosa sono i cookie', 'Cookie tecnici', 'Cookie di analisi', 'Cookie di terze parti', 'Gestione delle preferenze', 'Aggiornamenti'],
}
