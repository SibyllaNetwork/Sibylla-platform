// ─── MENU TOUR OPERATOR ───────────────────────────────────────────────────────
// Sidenav dedicata al modulo "Menu Tour Operator" (profilo Giulia Neri).
// Struttura ricavata da menu_To.xlsx. Dove la voce coincide con il MENU
// principale si riusa lo stesso id (eredita icona MenuIco + pagina/handler);
// per le voci specifiche TO si usano id nuovi con page = id (fallback GenericPage)
// e l'icona è aggiunta in MenuIco (MENU_MAP).

const MENU_TO:any[]=[
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
      {id:"ruoli-funzioni",label:"Ruoli & Funzioni",page:"ruoli-funzioni"},
      {id:"organigramma",label:"Organigramma",page:"organigramma"},
    ]},
  ]},
  {id:"impresa",label:"Impresa",icon:"wheel",children:[
    {id:"executive",label:"Executive",color:"#5C9CD4",children:[
      {id:"le-mie-destinazioni",label:"Le mie destinazioni",page:"le-mie-destinazioni"},
      {id:"executive-overview",label:"Executive overview",page:"executive-overview"},
      {id:"giornale-impresa",label:"Giornale impresa",page:"giornale-impresa"},
      {id:"live-display",label:"Live display",page:"live-display"},
    ]},
    {id:"sales",label:"Sales & Marketing",color:"#E07B39",children:[
      {id:"analisi-dist-sales",label:"Analisi della distribuzione",page:"analisi-dist-sales"},
      {id:"pricing-intelligence",label:"Pricing Intelligence",children:[
        {id:"action-centre",label:"Action centre",page:"action-centre"},
        {id:"market-lens",label:"Market lens",page:"market-lens"},
        {id:"value-analysis",label:"Value analysis",page:"value-analysis"},
      ]},
      {id:"e-distribution",label:"E-distribution",children:[
        {id:"open-board",label:"Open board",page:"open-board"},
        {id:"forecast-trends",label:"Forecast trends",children:[
          {id:"monthly-trend",label:"Monthly trend",page:"monthly-trend"},
          {id:"grand-total",label:"Grand total",page:"grand-total"},
        ]},
        {id:"base-rate-builder",label:"Base Rate Builder",children:[
          {id:"cal-annuale",label:"Pianificazione annuale",page:"cal-annuale"},
          {id:"piani-tar",label:"Gestione dei piani tariffari",page:"piani-tar"},
          {id:"maggiorazioni",label:"Maggiorazioni e promozioni",page:"maggiorazioni"},
        ]},
      ]},
      {id:"gest-booking",label:"Gestione del booking",children:[
        {id:"tableau-book",label:"Tableau",page:"tableau-book"},
        {id:"analisi-booking",label:"Analisi booking",page:"analisi-booking"},
        {id:"magic-tableau",label:"Magic Tableau",page:"magic-tableau"},
        {id:"efficienza-operativa",label:"Efficienza operativa",page:"efficienza-operativa"},
        {id:"gest-chiamate",label:"Gestione chiamate",page:"gest-chiamate"},
      ]},
      {id:"gest-servizi",label:"Gestione dei servizi",children:[
        {id:"crea-servizio",label:"Crea servizio",page:"crea-servizio"},
        {id:"i-miei-servizi",label:"I miei servizi",page:"i-miei-servizi"},
        {id:"servizi-di-rete",label:"Servizi di rete",page:"servizi-di-rete"},
      ]},
      {id:"gest-ricavi",label:"Gestione dei ricavi",children:[
        {id:"budget-ricavi",label:"Budget dei ricavi",page:"budget-ricavi"},
        {id:"imposta-dist",label:"Imposta distribuzione",page:"imposta-dist"},
        {id:"componi-annunci",label:"Componi annunci",page:"componi-annunci"},
        {id:"contratti-vendita",label:"Contratti di vendita",children:[
          {id:"miei-contratti-v",label:"I miei contratti",page:"miei-contratti-v"},
          {id:"inserisci-contratto-v",label:"Inserisci contratto",page:"inserisci-contratto-v"},
          {id:"crea-azienda-v",label:"Crea nuova azienda",page:"crea-struttura"},
        ]},
      ]},
      {id:"sales-overview",label:"Sales overview",page:"sales-overview"},
    ]},
    {id:"operation",label:"Operation",color:"#5A8A3C",children:[
      {id:"gest-pratiche",label:"Gestione delle pratiche",children:[
        {id:"crea-pratica",label:"Crea pratica",page:"crea-pratica"},
        {id:"monitoraggio-pratiche",label:"Monitoraggio pratiche",page:"monitoraggio-pratiche"},
        {id:"gestione-preventivi",label:"Gestione dei preventivi",page:"gestione-preventivi"},
      ]},
      {id:"acquisti-servizi",label:"Acquisti servizi",page:"acquisti-servizi"},
      {id:"gest-clienti",label:"Gestione clienti",children:[
        {id:"anagrafiche-op",label:"Anagrafiche",page:"anagrafiche-op"},
        {id:"arrivi-partenze",label:"Arrivi e partenze",page:"arrivi-partenze"},
        {id:"ospiti-in-casa",label:"Ospiti in casa",page:"ospiti-in-casa"},
      ]},
      {id:"gest-conti",label:"Gestione conti",children:[
        {id:"conti-aperti",label:"Conti aperti",page:"conti-aperti"},
        {id:"conti-chiusi",label:"Conti chiusi",page:"conti-chiusi"},
      ]},
      {id:"gest-movimenti",label:"Gestione Movimenti",children:[
        {id:"cassa",label:"Cassa",page:"cassa"},
        {id:"movimenti-attesa",label:"Movimenti in attesa",page:"movimenti-attesa"},
      ]},
      {id:"gest-documenti",label:"Gestione documenti",page:"gest-documenti"},
      {id:"richieste-operative",label:"Richieste operative",page:"richieste-operative"},
    ]},
    {id:"purchasing",label:"Purchasing",color:"#C4A820",children:[
      {id:"gest-acquisti",label:"Gestione centro acquisti",children:[
        {id:"forniture",label:"Forniture",children:[
          {id:"area-merceologica",label:"Area merceologica",page:"area-merceologica"},
          {id:"lista-fornitori",label:"Lista fornitori",page:"lista-fornitori"},
        ]},
        {id:"contratti-acquisto",label:"Contratti di acquisto",children:[
          {id:"miei-contratti-a",label:"I miei contratti",page:"miei-contratti-a"},
          {id:"inserisci-contratto-a",label:"Inserisci contratto",page:"inserisci-contratto-a"},
          {id:"crea-azienda-a",label:"Crea nuova azienda",page:"crea-struttura"},
        ]},
      ]},
      {id:"agora-purch",label:"Agorà",page:"agora-dashboard",children:[
        {id:"agora-announcements-manage",label:"Componi annunci",page:"agora-announcements-manage"},
        {id:"crea-acquisto",label:"Crea acquisto condiviso",page:"crea-acquisto"},
      ]},
      {id:"gest-magazzino",label:"Gestione del magazzino",children:[
        {id:"crea-magazzino",label:"Crea magazzino",page:"crea-magazzino"},
        {id:"movimenti-scorte",label:"Movimenti scorte",page:"movimenti-scorte"},
        {id:"chiusure",label:"Chiusure",children:[
          {id:"preliminare",label:"Preliminare chiusura",page:"preliminare"},
          {id:"registro-chiusure",label:"Registro chiusure",page:"registro-chiusure"},
        ]},
        {id:"registro-prodotti",label:"Registro Prodotti",children:[
          {id:"crea-prodotto",label:"Crea prodotto",page:"crea-prodotto"},
          {id:"lista-prodotti",label:"Lista prodotti",page:"lista-prodotti"},
        ]},
      ]},
      {id:"analisi-acquisti",label:"Analisi acquisti",children:[
        {id:"panoramica-acquisti",label:"Panoramica acquisti",page:"panoramica-acquisti"},
        {id:"fatturazione-passiva",label:"Fatturazione passiva",page:"fatturazione-passiva"},
      ]},
    ]},
    {id:"hr",label:"Human resource",color:"#9B59B6",children:[
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
        {id:"analisi-scenari-mensili",label:"Analisi scenari mensili",page:"analisi-scenari-mensili"},
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
    {id:"gest-notifiche",label:"Gestione delle notifiche",page:"configura-notifiche"},
    {id:"registro-sistema",label:"Registro di sistema",children:[
      {id:"log-sistema",label:"Log di sistema",page:"log-sistema"},
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

export default MENU_TO;
