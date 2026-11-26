import { FOTO, Offerta, Categoria, oggiIso } from './sitoData'
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
  termini: { titolo: 'Termini e', enfasi: 'condizioni', kicker: 'Documenti legali', icona: 'fa-file-contract', foto: FOTO.mappa,
    sotto: "Come si acquista sul sito: prezzi, pagamenti, voucher, cancellazioni, rimborsi e spedizioni dei prodotti." },
  mission: { titolo: 'La nostra', enfasi: 'mission', kicker: 'Mission', icona: 'fa-compass', foto: FOTO.sanPietro,
    sotto: "Una piattaforma tecnologica per governare l'impresa a colpo d'occhio, ovunque: Sibylla Platform e l'ecosistema che le cresce intorno." },
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
export const LEGALE: Record<'privacy' | 'cookie' | 'termini', string[]> = {
  privacy: ['Titolare del trattamento', 'Dati raccolti', 'Finalità e base giuridica', 'Conservazione', 'Destinatari dei dati', 'Diritti dell’interessato', 'Contatti'],
  cookie: ['Cosa sono i cookie', 'Cookie tecnici', 'Cookie di analisi', 'Cookie di terze parti', 'Gestione delle preferenze', 'Aggiornamenti'],
  termini: ['Oggetto e parti del contratto', 'Prezzi e tassa di soggiorno', 'Pagamenti', 'Conferma e voucher', 'Cancellazioni e rimborsi', 'Diritto di recesso (prodotti)', 'Spedizioni e consegne', 'Reclami e assistenza', 'Legge applicabile e foro competente'],
}

/**
 * Partner della rete per il nastro scorrevole (home Impatto 2): marchio
 * disegnato in CSS (forma + icona o monogramma, tinta per partner), nome e
 * tipo di attività. I nomi sono quelli delle offerte del catalogo.
 */
export type FormaMarchio = 'tondo' | 'quadro' | 'scudo' | 'esagono' | 'foglia' | 'rombo'
export interface PartnerNastro {
  nome: string
  tipo: string
  forma: FormaMarchio
  /** Tinta 0-5 (palette del marchio in SnwHome.sass). */
  tinta: number
  icona?: string
  /** Monogramma al posto dell'icona. */
  sigla?: string
  /** Stile del nome: classico (Poppins), corsivo serif, maiuscolo spaziato. */
  scrittura: 'sans' | 'serif' | 'caps'
}
export const PARTNER_NASTRO: PartnerNastro[] = [
  { nome: 'Hotel Archimede', tipo: 'Hotel · Roma', forma: 'scudo', tinta: 0, sigla: 'A', scrittura: 'serif' },
  { nome: 'Leaving Room Italia', tipo: 'Esperienze', forma: 'tondo', tinta: 1, icona: 'fa-house-chimney-window', scrittura: 'sans' },
  { nome: 'Cantine del Piglio', tipo: 'Cantina · Lazio', forma: 'foglia', tinta: 2, icona: 'fa-wine-glass', scrittura: 'serif' },
  { nome: 'Roma Incoming', tipo: 'Tour operator', forma: 'esagono', tinta: 3, sigla: 'RI', scrittura: 'caps' },
  { nome: 'Frantoio Sabino', tipo: 'Olio EVO · Sabina', forma: 'tondo', tinta: 4, icona: 'fa-leaf', scrittura: 'serif' },
  { nome: 'La Torre', tipo: 'Hotel & resort', forma: 'quadro', tinta: 5, icona: 'fa-chess-rook', scrittura: 'caps' },
  { nome: 'Osteria della Mole', tipo: 'Ristorante · Torino', forma: 'rombo', tinta: 2, icona: 'fa-utensils', scrittura: 'serif' },
  { nome: 'Italia Autentica', tipo: 'Tour operator', forma: 'foglia', tinta: 1, sigla: 'IA', scrittura: 'sans' },
  { nome: 'Gar Ghost', tipo: 'Tour e transfer', forma: 'esagono', tinta: 0, icona: 'fa-van-shuttle', scrittura: 'caps' },
  { nome: 'GAR', tipo: 'Servizi turistici', forma: 'quadro', tinta: 3, sigla: 'G', scrittura: 'sans' },
]

/**
 * Centro assistenza: domande frequenti per tema. Le risposte riprendono le
 * regole del sito (voucher, cancellazione gratuita, tassa in struttura,
 * spedizioni, totem); i testi definitivi li conferma il booking Sibylla.
 */
export const TEMI_FAQ = [
  { id: 'prenotazioni', nome: 'Prenotazioni', icona: 'fa-calendar-check' },
  { id: 'pagamenti', nome: 'Pagamenti', icona: 'fa-credit-card' },
  { id: 'cancellazioni', nome: 'Cancellazioni e rimborsi', icona: 'fa-rotate-left' },
  { id: 'spedizioni', nome: 'Prodotti e spedizioni', icona: 'fa-truck-fast' },
  { id: 'account', nome: 'Account', icona: 'fa-user' },
  { id: 'totem', nome: 'Totem nelle strutture', icona: 'fa-tablet-screen' },
] as const
export type TemaFaq = typeof TEMI_FAQ[number]['id']

export const FAQ: { tema: TemaFaq; d: string; r: string }[] = [
  { tema: 'prenotazioni', d: 'Come ricevo la conferma della prenotazione?', r: "Subito dopo il pagamento ti arriva un'e-mail con il numero d'ordine e i voucher. Li trovi anche nell'area riservata, in Prenotazioni e ordini, pronti da mostrare dal telefono." },
  { tema: 'prenotazioni', d: 'Posso modificare data od orario di un\'esperienza?', r: "Sì, fino a 24 ore prima dell'inizio, se c'è disponibilità. Scrivi al booking dall'ordine (pulsante «Assistenza su questo ordine») e ti proponiamo le alternative." },
  { tema: 'prenotazioni', d: 'Il soggiorno include la tassa di soggiorno?', r: 'No: la tassa di soggiorno la decide il Comune e si paga direttamente in struttura al check-in. Nel carrello la trovi indicata come «in struttura».' },
  { tema: 'prenotazioni', d: 'Devo stampare il voucher?', r: "Non serve: basta il QR del voucher sul telefono. Se preferisci la carta, puoi stamparlo dall'area riservata." },
  { tema: 'pagamenti', d: 'Quali metodi di pagamento accettate?', r: 'Carte Visa, Mastercard e American Express, PayPal e Apple Pay. Tutti i pagamenti sono protetti con 3-D Secure.' },
  { tema: 'pagamenti', d: 'Quando viene addebitato l\'importo?', r: "Al momento dell'ordine. Per i soggiorni con «paga in struttura» l'addebito lo fa l'hotel secondo le sue condizioni, indicate nella scheda." },
  { tema: 'pagamenti', d: 'Posso usare un codice sconto?', r: 'Sì, inseriscilo nel carrello nel campo «Codice sconto» prima di procedere al pagamento. Un solo codice per ordine.' },
  { tema: 'pagamenti', d: 'Come ricevo la fattura?', r: "Chiedila al booking indicando il numero d'ordine e i dati di fatturazione (ragione sociale, P.IVA, codice SDI o PEC): la emettiamo entro 48 ore." },
  { tema: 'cancellazioni', d: 'Come annullo una prenotazione?', r: "Dall'area riservata: apri l'ordine e usa «Annulla» sulla voce. Se l'offerta prevede la cancellazione gratuita e sei nei termini, il rimborso parte in automatico." },
  { tema: 'cancellazioni', d: 'Entro quando ricevo il rimborso?', r: 'Il rimborso torna sullo stesso metodo di pagamento entro 5-10 giorni lavorativi, secondo i tempi della tua banca.' },
  { tema: 'cancellazioni', d: 'Le offerte «Solo su Network» sono rimborsabili?', r: 'Dipende dall\'offerta: nella scheda trovi sempre se la cancellazione è gratuita. Quando non lo è, il booking prova comunque a spostare la data.' },
  { tema: 'spedizioni', d: 'Dove spedite i prodotti?', r: 'In tutta Italia, con corriere espresso. Isole e località remote possono richiedere un giorno in più.' },
  { tema: 'spedizioni', d: 'Quanto costa la spedizione?', r: 'È gratuita sopra i 49 €; sotto, il costo è indicato prima del pagamento.' },
  { tema: 'spedizioni', d: 'Posso restituire un prodotto?', r: 'Hai 14 giorni dalla consegna per il recesso, esclusi i prodotti alimentari deperibili o aperti. Scrivici dall\'ordine e ti mandiamo l\'etichetta di reso.' },
  { tema: 'account', d: 'Serve un account per comprare?', r: "No, puoi acquistare come ospite. Con l'account però ritrovi ordini, voucher e preferiti su ogni dispositivo, e gli ordini fatti come ospite con la stessa e-mail compaiono da soli." },
  { tema: 'account', d: 'Ho dimenticato la password', r: 'Nella pagina di accesso usa «Password dimenticata?»: ti inviamo un link per sceglierne una nuova.' },
  { tema: 'account', d: 'Come cancello il mio account?', r: "Dall'area riservata, in Privacy e notifiche, con «Elimina account». Cancelliamo i dati personali; restano solo quelli che la legge ci obbliga a conservare (es. fatture)." },
  { tema: 'totem', d: 'Cosa sono i totem Sibylla Network?', r: "Schermi interattivi nelle hall degli hotel della rete: mostrano esperienze, sapori e servizi della città, prenotabili in un minuto, con pagamento al telefono o addebito in camera." },
  { tema: 'totem', d: 'Posso ritrovare sul sito ciò che ho prenotato dal totem?', r: "Sì, se al totem hai lasciato la tua e-mail: accedi con quella e trovi l'ordine nell'area riservata." },
]

/** Mission (come su sibyllanetwork.com/mission): testo e i tre prodotti dell'ecosistema. */
export const MISSION = [
  "L'ecosistema Sibylla è incentrato su una sofisticata piattaforma tecnologica che prende il nome di Sibylla Platform. La piattaforma si interfaccia con fonti e dati interni ed esterni all'azienda e, grazie a un potente algoritmo proprietario, è in grado di massimizzare il profitto delle imprese che la adottano.",
  "È composta da diversi portali e moduli perfettamente integrati fra loro per fornire un'ampia gamma di servizi e funzionalità. Creata per voi, per governare l'impresa a colpo d'occhio, ovunque.",
  "Proiettata a innovare e a creare soluzioni che cambieranno in meglio il modo in cui le persone interagiscono, lavorano, creano imprese e si connettono: tecnologie avanzate, nuove opportunità per gli imprenditori, un ecosistema che ne favorisce la crescita.",
]
export const PRODOTTI_ECOSISTEMA = [
  { nome: 'Sibylla Platform', per: 'Hotel e strutture', icona: 'fa-hotel', url: 'https://www.sibyllaecosystem.it/soluzioni/platform/' },
  { nome: 'Sibylla Tableau', per: 'Tour operator', icona: 'fa-route', url: 'https://www.sibyllaecosystem.it/soluzioni/tableau/' },
  { nome: 'Sibylla Agorà', per: 'Fornitori', icona: 'fa-store', url: 'https://www.sibyllaecosystem.it/soluzioni/agora/' },
]

// ═══ Area riservata operatori (B2B) ═══════════════════════════════════════

/** Sconto della tariffa operatore (netta) sul prezzo pubblico, per categoria. */
export const SCONTO_OPERATORE: Record<Categoria, number> = { soggiorni: 22, esperienze: 18, prodotti: 25, servizi: 15 }
export const prezzoOperatore = (o: Offerta, extra = 0) =>
  Math.round(o.prezzo * (100 - SCONTO_OPERATORE[o.cat]) * (100 - extra) / 100) / 100

export interface PromoB2B {
  id: string
  tit: string
  txt: string
  icona: string
  /** Sconto aggiuntivo sulla tariffa operatore, in %. */
  extra: number
  codice: string
  scadenza: string
  offerte: string[]
  condizioni: string[]
}
export const PROMO_B2B: PromoB2B[] = [
  { id: 'early', tit: 'Early booking primavera 2027', icona: 'fa-seedling', extra: 10, codice: 'EARLY27', scadenza: oggiIso(66),
    txt: 'Soggiorni a Roma con arrivo da marzo a maggio: un ulteriore 10% sulla tariffa netta prenotando entro la scadenza.',
    offerte: ['palazzo-esquilino', 'trevi-suites', 'hotel-navona', 'prati-loft'], condizioni: ['Arrivi 1 marzo – 31 maggio 2027', 'Non rimborsabile dopo 30 giorni dall\'arrivo', 'Cumulabile con la tariffa gruppi'] },
  { id: 'gruppi', tit: 'Gruppi da 10 camere', icona: 'fa-people-group', extra: 8, codice: 'GRUPPI10', scadenza: oggiIso(120),
    txt: 'Tariffa gruppo per allotment da 10 camere in su e una gratuità ogni 15 paganti, con rooming list gestita dal booking Sibylla.',
    offerte: ['villa-ardea', 'hotel-san-marco', 'vernazza-terrazze', 'agriturismo-piglio'], condizioni: ['Minimo 10 camere per notte', '1 gratuità ogni 15 paganti', 'Rooming list entro 21 giorni dall\'arrivo'] },
  { id: 'dolce-vita-to', tit: 'Dolce Vita Tour per tour operator', icona: 'fa-car-side', extra: 6, codice: 'DOLCEVITA-TO', scadenza: oggiIso(90),
    txt: 'Le esperienze più vendute della rete con voucher a marchio della tua agenzia e assistenza dedicata per i gruppi.',
    offerte: ['dolce-vita', 'dolce-vita-notte', 'golf-cart', 'colosseo-prioritario'], condizioni: ['Voucher con il logo dell\'agenzia', 'Conferma entro 2 ore lavorative', 'Cancellazione gratuita fino a 48 ore prima'] },
  { id: 'welcome', tit: 'Welcome kit per eventi', icona: 'fa-gift', extra: 12, codice: 'WELCOME20', scadenza: oggiIso(45),
    txt: 'Box Sapori di Roma, olio e vino della rete per welcome kit e omaggi di congressi ed eventi aziendali.',
    offerte: ['box-sapori', 'olio-sabina', 'cesanese'], condizioni: ['Da 20 pezzi', 'Biglietto personalizzato incluso', 'Consegna in struttura in 5 giorni lavorativi'] },
]

export interface SoggiornoRiservato {
  id: string
  /** Offerta del catalogo collegata (foto e voce di carrello). */
  offerta: string
  tit: string
  tipo: string
  luogo: string
  dal: string
  al: string
  posti: number
  prezzo: number
  txt: string
  include: string[]
}
export const SOGGIORNI_RISERVATI: SoggiornoRiservato[] = [
  { id: 'fam-cinque-terre', offerta: 'vernazza-terrazze', tit: 'Fam trip Cinque Terre', tipo: 'Fam trip', luogo: 'Vernazza · Liguria', dal: oggiIso(41), al: oggiIso(43), posti: 6, prezzo: 149,
    txt: 'Due notti per conoscere le strutture e le esperienze della rete in Liguria, insieme ai partner locali.',
    include: ['2 notti all\'Hotel Le Terrazze', 'Cinque Terre al tramonto in barca', 'Incontro con gli operatori locali'] },
  { id: 'edu-roma', offerta: 'palazzo-esquilino', tit: 'Educational Roma Dolce Vita', tipo: 'Educational', luogo: 'Roma · Lazio', dal: oggiIso(27), al: oggiIso(28), posti: 9, prezzo: 99,
    txt: 'Una notte a Palazzo Esquilino, il Dolce Vita Tour e un workshop su come vendere la rete con Sibylla Tableau.',
    include: ['1 notte a Palazzo Esquilino', 'Dolce Vita Tour in Fiat 500', 'Workshop Sibylla Tableau'] },
  { id: 'site-ardea', offerta: 'villa-ardea', tit: 'Site inspection Villa Ardea', tipo: 'Site inspection', luogo: 'Ardea · Lazio', dal: oggiIso(15), al: oggiIso(16), posti: 3, prezzo: 0,
    txt: 'Una notte gratuita per gli operatori con contratto attivo, per vedere spa, sale e camere prima di proporle ai clienti.',
    include: ['1 notte con colazione', 'Visita delle sale meeting', 'Percorso spa'] },
]
