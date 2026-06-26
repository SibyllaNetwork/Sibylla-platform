const MENU:any[]=[
  {id:"home",label:"Home",icon:"home",page:"home"},
  {id:"profilo",label:"Profilo",icon:"profile",children:[
    {id:"modifica-profilo",label:"Modifica profilo",page:"modifica-profilo"},
    {id:"portafoglio",label:"Portafoglio",children:[
      {id:"portafoglio-personale",label:"Personale",page:"portafoglio-personale"},
      {id:"portafoglio-aziendale",label:"Aziendale",page:"portafoglio-aziendale"},
    ]},
    {id:"scadenzario",label:"Scadenzario",page:"scadenzario"},
    {id:"gestisci-org",label:"Gestisci organizzazione",children:[
      {id:"reset-profili",label:"Reset profili",page:"reset-profili"},
      {id:"ruoli-funzioni",label:"Ruoli & funzioni",page:"ruoli-funzioni"},
      {id:"organigramma",label:"Organigramma",page:"organigramma"},
    ]},
  ]},
  {id:"impresa",label:"Impresa",icon:"wheel",children:[
    {id:"executive",label:"Executive",color:"#5C9CD4",children:[
      {id:"i-miei-business",label:"I miei business",page:"i-miei-business",children:[
        {id:"i-miei-ristoranti",label:"I miei ristoranti",page:"i-miei-ristoranti"},
      ]},
      {id:"executive-overview",label:"Executive overview",page:"executive-overview"},
      {id:"live-display",label:"Live display",page:"live-display"},
      {id:"giornale-impresa",label:"Giornale impresa",page:"giornale-impresa"},
      {id:"business-centre",label:"Business centre",page:"business-centre"},
    ]},
    {id:"sales",label:"Sales & Marketing",color:"#E07B39",children:[
      {id:"analisi-dist-sales",label:"Analisi della distribuzione",page:"analisi-dist-sales"},
      {id:"gest-strategie",label:"Gestione delle strategie",children:[
        {id:"pianifica-strat",label:"Pianifica strategie",children:[
          {id:"crea-strategia",label:"Crea strategia",page:"crea-strategia"},
          {id:"modifica-strategia",label:"Modifica strategia",page:"modifica-strategia"},
          {id:"calendario-strategie",label:"Calendario strategie",page:"calendario-strategie"},
        ]},
        {id:"calendario-master",label:"Calendario master",page:"calendario-master"},
      ]},
      {id:"pricing-intelligence",label:"Pricing Intelligence",children:[
        {id:"sugg-data-driven",label:"Suggerimenti Data driven",page:"sugg-data-driven"},
        {id:"screening-open",label:"Screening open price",page:"screening-open"},
        {id:"pricing-benchmark",label:"Pricing Benchmark",page:"pricing-benchmark"},
        {id:"pick-up",label:"Pick up",page:"pick-up"},
        {id:"occ-analysis",label:"Occupancy Analysis",page:"occ-analysis"},
        {id:"adr-analysis",label:"ADR Analysis",page:"adr-analysis"},
      ]},
      {id:"e-distribution",label:"E-distribution",children:[
        {id:"tariffe-disp",label:"Tariffe e disponibilità",page:"tariffe-disp"},
        {id:"forecast-trends",label:"Forecast trends",children:[
          {id:"monthly-trend",label:"Monthly trend",page:"monthly-trend"},
          {id:"grand-total",label:"Grand total",page:"grand-total"},
        ]},
        {id:"base-rate-builder",label:"Base Rate Builder",children:[
          {id:"cal-annuale",label:"Calendario annuale",page:"cal-annuale"},
          {id:"piani-tar",label:"Gestione dei piani tariffari",page:"piani-tar"},
          {id:"maggiorazioni",label:"Maggiorazioni e promozioni",page:"maggiorazioni"},
        ]},
        {id:"prenotazioni-ids",label:"Prenotazioni IDS",page:"prenotazioni-ids"},
      ]},
      {id:"gest-booking",label:"Gestione del booking",children:[
        {id:"tableau-book",label:"Tableau",page:"tableau-book"},
        {id:"analisi-booking",label:"Analisi booking",page:"analisi-booking"},
        {id:"allocazione-risorse",label:"Allocazione risorse",page:"allocazione-risorse"},
        {id:"griglia-disp",label:"Griglia disponibilità",page:"griglia-disp"},
        {id:"griglia-disp-estesa",label:"Griglia disponibilità estesa",page:"griglia-disp-estesa"},
        {id:"assegnazione-book",label:"Assegnazione",page:"assegnazione-book"},
        {id:"voip",label:"Voip service HUB",page:"voip"},
        {id:"gest-chiamate",label:"Gestione chiamate",page:"gest-chiamate"},
      ]},
      {id:"gest-servizi",label:"Gestione dei servizi",children:[
        {id:"crea-servizio",label:"Crea servizio",page:"crea-servizio"},
        {id:"i-miei-servizi",label:"I miei servizi",page:"i-miei-servizi"},
        {id:"gest-preventivi",label:"Gestione dei preventivi",children:[
          {id:"crea-preventivo",label:"Crea preventivo",page:"crea-preventivo"},
          {id:"i-miei-preventivi",label:"I miei preventivi",page:"i-miei-preventivi"},
        ]},
      ]},
      {id:"gest-ricavi",label:"Gestione dei ricavi",children:[
        {id:"budget-ricavi",label:"Budget dei ricavi",page:"budget-ricavi"},
        {id:"imposta-dist",label:"Imposta distribuzione",page:"imposta-dist"},
        {id:"componi-annunci",label:"Componi annunci",page:"componi-annunci"},
        {id:"budget-trends",label:"Budget trends",children:[
          {id:"budget-analysis",label:"Budget Analisis",page:"budget-analysis"},
          {id:"segment-analysis",label:"Segment Analisis",page:"segment-analysis"},
        ]},
        {id:"contratti-vendita",label:"Contratti di vendita",children:[
          {id:"miei-contratti-v",label:"I miei contratti",page:"miei-contratti-v"},
          {id:"inserisci-contratto-v",label:"Inserisci contratto",page:"inserisci-contratto-v"},
          {id:"crea-azienda-v",label:"Crea nuova azienda",page:"crea-azienda-v"},
        ]},
      ]},
      {id:"sales-overview",label:"Sales overview",page:"sales-overview"},
    ]},
    {id:"operation",label:"Operation",color:"#5A8A3C",children:[
      {id:"front-office",label:"Front office",children:[
        {id:"board",label:"Board",children:[
          {id:"planner",label:"Planner",page:"planner"},
          {id:"assegnazione-board",label:"Assegnazione",page:"assegnazione-board"},
          {id:"on-the-book",label:"On the book analysis",page:"on-the-book"},
          {id:"op-overview",label:"Operation overview",page:"op-overview"},
          {id:"guest-room",label:"Guest & Room Analysis",page:"guest-room"},
        ]},
        {id:"acquisti-servizi",label:"Acquisto Servizi",page:"acquisti-servizi"},
        {id:"gest-ospiti",label:"Gestione Ospiti",children:[
          {id:"arrivi-partenze",label:"Arrivi e partenze",page:"arrivi-partenze"},
          {id:"ospiti-in-casa",label:"Ospiti in casa",page:"ospiti-in-casa"},
          {id:"anagrafiche-op",label:"Anagrafiche",page:"anagrafiche-op"},
          {id:"schedine",label:"Schedine alloggiati",page:"schedine"},
          {id:"rilevamento-presenze",label:"Rilevamento presenze",page:"rilevamento-presenze"},
          {id:"analisi-occ",label:"Analisi dell'occupazione",page:"analisi-occ"},
        ]},
      ]},
      {id:"food-beverage",label:"Food & Beverage",children:[
        {id:"gest-comanda",label:"Gestione comanda",page:"gest-comanda"},
        {id:"sala-ristorante",label:"Sala ristorante",page:"sala-ristorante"},
        {id:"libro-prenotazioni",label:"Libro prenotazioni",page:"libro-prenotazioni"},
        {id:"ospiti-giorno",label:"Ospiti del giorno",page:"ospiti-giorno"},
      ]},
      {id:"gest-conti",label:"Gestione Conti",children:[
        {id:"conti-aperti",label:"Conti aperti",page:"conti-aperti"},
        {id:"conti-passanti",label:"Conti passanti",page:"conti-passanti"},
        {id:"conti-chiusi",label:"Conti chiusi",page:"conti-chiusi"},
      ]},
      {id:"scadenze-incassi",label:"Scadenze incassi",page:"scadenze-incassi"},
      {id:"gest-movimenti",label:"Gestione Movimenti",children:[
        {id:"cassa",label:"Cassa",page:"cassa"},
        {id:"movimenti-attesa",label:"Movimenti in attesa",page:"movimenti-attesa"},
        {id:"movimenti-soggiorno",label:"Movimenti soggiorno",page:"movimenti-soggiorno"},
      ]},
      {id:"gest-documenti",label:"Gestione documenti",page:"gest-documenti"},
      {id:"appop",label:"AppOp!",children:[
        {id:"stato-camere",label:"Stato Camere",page:"stato-camere"},
        {id:"segnalazioni",label:"Segnalazioni",page:"segnalazioni"},
        {id:"assegnazioni-incarichi",label:"Assegnazioni incarichi",page:"assegnazioni-incarichi"},
        {id:"maintenance-analysis",label:"Maintenance Analysis",page:"maintenance-analysis"},
      ]},
      {id:"ordine-servizio",label:"Ordine di servizio",page:"ordine-servizio"},
    ]},
    {id:"purchasing",label:"Purchasing",color:"#C4A820",children:[
      {id:"gest-acquisti",label:"Gestione centro acquisti",children:[
        {id:"forniture",label:"Forniture",children:[
          {id:"area-merceologica",label:"Area merceologica",page:"area-merceologica"},
          {id:"lista-fornitori",label:"Lista fornitori",page:"lista-fornitori"},
        ]},
        {id:"servizi",label:"Servizi",icon:"fa-concierge-bell",page:"servizi-acquisto"},
        {id:"contratti-acquisto",label:"Contratti di acquisto",children:[
          {id:"miei-contratti-a",label:"I miei contratti",page:"miei-contratti-a"},
          {id:"inserisci-contratto-a",label:"Inserisci contratto",page:"inserisci-contratto-a"},
          {id:"crea-azienda-a",label:"Crea nuova azienda",page:"crea-azienda-v"},
        ]},
      ]},
      {id:"agora-purch",label:"Agorà",page:"agora-dashboard",children:[
        {id:"gestione-annunci",label:"Annunci",page:"gestione-annunci"},
        {id:"matchzone",label:"Matchzone",page:"matchzone"},
        {id:"agora-announcements-manage",label:"Componi annuncio",page:"agora-announcements-manage"},
        {id:"crea-acquisto",label:"Crea acquisto condiviso",page:"crea-acquisto"},
        {id:"agora-accommodations",label:"Strutture ricettive",page:"agora-accommodations"},
        {id:"agora-home",label:"Landing Agorà",page:"agora-home"},
      ]},
      {id:"gest-magazzino",label:"Gestione del magazzino",children:[
        {id:"crea-magazzino",label:"Crea magazzino",page:"crea-magazzino"},
        {id:"movimenti-scorte",label:"Movimenti scorte",page:"movimenti-scorte"},
        {id:"chiusure",label:"Chiusure",children:[
          {id:"preliminare",label:"Preliminare chiusura",page:"preliminare"},
          {id:"registro-chiusure",label:"Registro chiusure",page:"registro-chiusure"},
        ]},
        {id:"registro-prodotti",label:"Registro prodotti",children:[
          {id:"crea-prodotto",label:"Crea prodotto",page:"crea-prodotto"},
          {id:"lista-prodotti",label:"Lista prodotti",page:"lista-prodotti"},
        ]},
      ]},
      {id:"analisi-acquisti",label:"Analisi acquisti",children:[
        {id:"panoramica-acquisti",label:"Panoramica acquisti",page:"panoramica-acquisti"},
        {id:"fatturazione-passiva",label:"Fatturazione passiva",page:"fatturazione-passiva"},
      ]},
    ]},
    {id:"hr",label:"Human Resources",color:"#9B59B6",children:[
      {id:"registro-presenze",label:"Registro presenze",page:"registro-presenze"},
      {id:"turni-personale",label:"Turni del personale",page:"turni-personale"},
      {id:"gest-anagrafiche",label:"Gestione delle anagrafiche",children:[
        {id:"crea-anagrafica",label:"Crea anagrafica personale",page:"crea-anagrafica"},
        {id:"archivio-personale",label:"Archivio del personale",page:"archivio-personale"},
        {id:"profile-analysis",label:"Profile analysis",page:"profile-analysis"},
      ]},
      {id:"premio-performance",label:"Gestione premio performance",children:[
        {id:"assegna-obiettivo",label:"Assegna obiettivo",page:"assegna-obiettivo"},
        {id:"monitoraggio-perf",label:"Monitoraggio performance",page:"monitoraggio-perf"},
      ]},
      {id:"agora-academy",label:"Nuove risorse",page:"agora-academy"},
      {id:"hr-overview",label:"HR Overview",page:"hr-overview"},
    ]},
    {id:"finance",label:"Finance",color:"#5C9CD4",children:[
      {id:"gest-costi",label:"Gestione dei costi",children:[
        {id:"budget-costi",label:"Budget dei costi",page:"budget-costi"},
        {id:"centro-costo",label:"Imposta centro di costo",page:"centro-costo"},
        {id:"cost-analysis",label:"Cost analysis",page:"cost-analysis"},
      ]},
      {id:"controllo-gestione",label:"Controllo di gestione",children:[
        {id:"finance-overview",label:"Finance overview",page:"finance-overview"},
        {id:"verifiche-analitiche",label:"Verifiche analitiche",children:[
          {id:"decision-tree",label:"Decision Tree",page:"decision-tree"},
          {id:"incoming-analysis",label:"Incoming analysis",page:"incoming-analysis"},
          {id:"ledger-analysis",label:"Ledger analysis",page:"ledger-analysis"},
        ]},
        {id:"break-even",label:"Break even point analysis",page:"break-even"},
        {id:"profit-analysis",label:"Profit analysis",children:[
          {id:"cashflow",label:"Cashflow",page:"cashflow"},
          {id:"profit-trend",label:"Profit trend",page:"profit-trend"},
        ]},
      ]},
      {id:"cabina-controllo",label:"Cabina di controllo",page:"cabina-controllo"},
      {id:"budget-complessivo",label:"Budget complessivo",page:"budget-complessivo"},
      {id:"revisione-budget",label:"Revisione budget",children:[
        {id:"simulatore",label:"Simulatore di scenari",page:"simulatore"},
        {id:"wif-analysis",label:"WIF analysis",page:"wif-analysis"},
      ]},
      {id:"benchmark-fin",label:"Benchmark finanziario",page:"benchmark-fin"},
      {id:"flusso-cassa",label:"Flusso di cassa",children:[
        {id:"monitoraggio-cassa",label:"Monitoraggio cassa",page:"monitoraggio-cassa"},
      ]},
      {id:"archivio-contratti",label:"Archivio contratti",page:"archivio-contratti"},
    ]},
  ]},
  {id:"impostazioni",label:"Impostazioni",icon:"gear",children:[
    {id:"configuratore",label:"Configuratore",page:"configuratore"},
    {id:"il-mio-business",label:"Il mio business",children:[
      {id:"crea-struttura",label:"Crea struttura",page:"crea-struttura"},
      {id:"inventario-camere",label:"Inventario camere",page:"inventario-camere"},
      {id:"riepilogo-bacheche",label:"Riepilogo bacheche",page:"riepilogo-bacheche"},
      {id:"crea-outlet",label:"Crea outlet",page:"crea-outlet"},
      {id:"sale-tavoli",label:"Sale e tavoli",page:"sale-tavoli"},
    ]},
    {id:"gest-notifiche",label:"Gestione delle notifiche",page:"configura-notifiche"},
    {id:"registro-sistema",label:"Registro di sistema",children:[
      {id:"log-sistema",label:"Log di sistema",page:"log-sistema"},
      {id:"monitoraggio-canali",label:"Monitoraggio canali",page:"monitoraggio-canali"},
      {id:"interfacce",label:"Interfacce",page:"interfacce"},
    ]},
    {id:"dispositivi",label:"Dispositivi",children:[
      {id:"totem",label:"Totem",children:[
        {id:"i-miei-totem",label:"I miei totem",page:"i-miei-totem"},
        {id:"gest-advertising",label:"Gestione dell'advertising",page:"gest-advertising"},
      ]},
    ]},
  ]},
];

export default MENU;
