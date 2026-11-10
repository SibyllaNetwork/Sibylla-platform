# Integrazioni con il backend: indice per gli sviluppatori del Portal

> **Punto di partenza unico** per chi sviluppa e configura il backend di Sibylla Platform (Portal: `SibyllaApiProxy` +
> `SibyllaApi`, .NET, SQL Server, Azure App Service). Elenca **tutti** i documenti da leggere, in che ordine, cosa sblocca
> ognuno e cosa va sistemato prima del rilascio. Ultimo aggiornamento: **10 novembre 2026**.

## I tre repository

| Repository | Cosa contiene | Indirizzo |
|---|---|---|
| **Portal** | backend di Platform: `SibyllaApiProxy` (edge, CORS, JWT) e `SibyllaApi` (dominio, Dapper, DbUp) | `https://dev.azure.com/sibyllanetwork/Portal/_git/Portal` |
| **sibylla-platform** | frontend React di Platform (pubblicato su Vercel: `https://sibylla-platform.vercel.app`) e la sua documentazione (`docs/`) | `https://github.com/SibyllaNetwork/Sibylla-platform` |
| **sibylla-op** | app Op e il suo backend Op.Api (`https://api.sibyllaop.it`); le schede di integrazione con Platform in `docs/integrazione-sibylla/` | `https://github.com/SibyllaNetwork/sibylla-op` |

```
Pagine di Platform (Vercel) ──HTTPS + JWT──► SibyllaApiProxy ──► SibyllaApi ──► Azure SQL "Sibylla"
                                                 │  /Sibylla/{**path}   (inoltro generico)
                                                 │  /Hr/{**path}        (servizio Sibylla HR)
App Op ──► Op.Api ──firmato (X-Op-Firma)──► SibyllaApi       (magazzino della ristorazione, § 3)
SibyllaApi ──firmato──► Op.Api                                (BI, Piano ferie: dati in Op, § 2)
```

---

## 0. Da sistemare prima di tutto (bloccano il collegamento)

| # | Cosa | Dove | Note |
|---|---|---|---|
| 0.1 | **Committare e rilasciare l'inoltro `/Sibylla/{**path}`** | Portal, copia di lavoro su `release/staging`: `SibyllaApiProxy/Controllers/SibyllaController.cs`, `HrController.cs`, `Program.cs` (CORS), `appsettings.json` (`ApiUrlBase`) | Oggi **non è nel repository**. Tutte le pagine di Platform passano di lì. Correzioni prima del rilascio: [magazzino, § H4.1](portal-magazzino-ristorazione.md#h41-linoltro-esistente-sibyllapath) (rotte pubbliche, errori senza dettagli tecnici, timeout 120 s, corpo fino a 30 MB) |
| 0.2 | **CORS del Proxy con le origini di Platform** | `SibyllaApiProxy/Program.cs` | Aggiungere `https://sibylla-platform.vercel.app`, l'eventuale dominio definitivo e l'indirizzo di staging. Oggi ci sono i domini di Operation e, nella copia di lavoro, `localhost:3000` |
| 0.3 | **Frontend collegato al Proxy** | Vercel (lo fa il team frontend) | `REACT_APP_API_URL` = URL del Proxy e login vero: oggi la demo non ha il Portal e aggira il login, quindi senza token il Portal risponderebbe `401` |
| 0.4 | **Servizio comune di firma `X-Op-Firma`** | `SibyllaApi` | Una volta sola, con il test del vettore di prova: serve a BI, Piano ferie e magazzino. [sibylla-op 18, § 2](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/18-portal-integrazione-completa.md) |

---

## 1. Architettura e convenzioni del Portal

| Documento | Cosa c'è |
|---|---|
| [guida-sviluppatori.md](guida-sviluppatori.md) | Architettura (frontend → Proxy → SibyllaApi), avvio in locale, configurazione del Proxy (`ApiUrlBase`, chiavi, blob), CORS, flusso di autenticazione, contratto tra frontend e backend |
| [../INTEGRATION.md](../INTEGRATION.md) | Contratto e integrazione tra frontend e backend: proxy edge, autenticazione, service ed endpoint usati dalle pagine, pagine già cablate |
| Portal `copilot-instructions.md` | Convenzioni del repository: script DbUp sempre nuovi e numerati a sei cifre (`0 - Schema` / `1 - Data`), `CREATE OR ALTER`, controllo dell'ultimo script di una tabella prima di modificarla |

---

## 2. Pagine di Platform con i dati in Op (il Portal inoltra, firmato)

Priorità **P1**: le pagine sono già online e aspettano solo il Portal.

| Pagina di Platform | Azione del Portal | Documento | Stato |
|---|---|---|---|
| AppOp! › Business Intelligence | `POST OpApp/bi/Get` | [sibylla-op 15](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/15-bi-reparti-platform.md) | da fare |
| HR › Piano ferie | `POST OpApp/pianiFerie/Esegui` | [sibylla-op 16, Parte A](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/16-piano-ferie.md) | da fare |

Quadro d'insieme di tutto il lavoro del Portal verso Op, con priorità, firma, configurazione e checklist di rilascio:
[sibylla-op 18](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/18-portal-integrazione-completa.md).
⚠️ Le righe A3 e A4 della 18 (magazzino della ristorazione) sono **superate** dal § 3 qui sotto e sono in
aggiornamento.

---

## 3. Magazzino della Ristorazione (dati nel database di Sibylla)

| Documento | Cosa c'è |
|---|---|
| [portal-magazzino-ristorazione.md](portal-magazzino-ristorazione.md) | **Tutto il necessario**, documento autosufficiente: <br>• Parte A, azioni delle pagine sul database (schema `magfb`); <br>• Parte B, ingresso firmato per l'app Op; <br>• Parte C, lettura delle bolle con l'AI e "Fotografa col telefono"; <br>• § H, configurazione per ambiente, rotte del Proxy, CORS, limiti, ordine di rilascio, prove; <br>• Appendice 1, script SQL; <br>• Appendice 2, contratto completo |

Regola: un'azienda presente in Platform (Ristorazione stand alone o con più moduli) tiene il magazzino nel database di
Sibylla, anche quando usa l'app Op. Solo i clienti indipendenti di Op (senza Platform) restano in Op. La Parte A della
scheda 17 di sibylla-op è **sostituita** da questo documento; il § 8 della 17 resta il contratto ed è riportato
nell'appendice.

---

## 4. Op che usa i dati di Sibylla per le aziende collegate

Priorità **P2**: serve quando Op.Api passerà a `Sibylla:Modalita=Proxy`. Oggi in produzione Op usa il proprio archivio,
quindi non blocca le pagine di Platform. Regole generali in
[ISTRUZIONI-AGENTE.md](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/ISTRUZIONI-AGENTE.md)
e [README](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/README.md). Ogni scheda ha
in fondo l'elenco delle cose da fare nel Portal.

| Scheda sibylla-op | Area |
|---|---|
| [01-accesso](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/01-accesso.md) | Login, invito, profilo, eliminazione account (**prima di tutto il resto**) |
| [02-pulizie-manutenzione](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/02-pulizie-manutenzione.md) | Camere, compiti, interventi straordinari |
| [03-segnalazioni-timbratura](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/03-segnalazioni-timbratura.md) | Segnalazioni, notifiche e push, timbratura con QR |
| [04-turni-personale](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/04-turni-personale.md) | Turni, cambi turno, ferie e ROL, oggetti smarriti. Parte già sviluppata nel ramo del Portal `feature/op-app-servizi-personale`, **da rilasciare** |
| [05-magazzino-front-office](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/05-magazzino-front-office.md) | Magazzino **dell'hotel**, check-in, servizi, checkout, POS |
| [06-chat-e-dati-op](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/06-chat-e-dati-op.md) | Cosa resta in Op; campanella |
| [07-calendario-scadenzario](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/07-calendario-scadenzario.md) | Calendario e scadenzario |
| [08-moduli-e-ruoli](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/08-moduli-e-ruoli.md) | Reparti, moduli per reparto, grado dell'utente |
| [09-clienti-indipendenti](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/09-clienti-indipendenti.md) | Clienti senza Platform (solo per contesto: nessun lavoro nel Portal) |
| [10-responsabile-di-reparto](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/10-responsabile-di-reparto.md) | Presenze del reparto, avvisi |
| [11-risorse-umane](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/11-risorse-umane.md) | Turni, entrate e uscite, personale |
| [12-food-beverage](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/12-food-beverage.md) | Sala, comande, menu dell'app (dati in Op; facoltativo) |
| [13-configuratore-app-op](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/13-configuratore-app-op.md) | Configuratore "App Op!" di Platform: `OpApp/config/*`, `OpApp/utenti/Salva`, `OpApp/inviti/Invia` |
| [14-business-intelligence-purchasing](https://github.com/SibyllaNetwork/sibylla-op/blob/main/docs/integrazione-sibylla/14-business-intelligence-purchasing.md) | BI dell'app e Purchasing (P3) |

---

## 5. Sezioni di Platform con un backend proprio

| Documento | Cosa c'è | Note |
|---|---|---|
| [human-resources/README.md](human-resources/README.md) e [01-modello-dati-e-api.md](human-resources/01-modello-dati-e-api.md) | Human Resources: entità, regole di business, API da realizzare; ogni scheda pagina ha la sua sezione "backend" | Il servizio Sibylla HR passa dal Proxy con `/Hr/{**path}` (`HrController.cs`, da committare, § 0.1) |
| [integrazione paghe/README.md](integrazione%20paghe/README.md) e `Tracciato_RILPRE.pdf` | File presenze per TeamSystem (RILPRE) | Oggi lo genera il frontend; da portare sul server se l'esportazione dovrà essere lato backend |
| [food-beverage.md](food-beverage.md) | Food & Beverage di Platform = **Outlet Manager**, backend Flask separato (`outlet.sibyllanetwork.it`) | In produzione l'instradamento di `/api/*` verso Outlet Manager va configurato sul web server, con l'iniezione del token SSO |

---

## 6. Ordine consigliato

1. § 0: inoltro `/Sibylla/{**path}` committato e corretto, CORS, servizio di firma.
2. § 2: BI e Piano ferie (inoltri semplici, sbloccano pagine già online).
3. § 3: Magazzino della Ristorazione (Parte A, poi B, poi C).
4. § 4: integrazione dell'app Op con i dati di Sibylla, a partire dalla scheda 01.
5. § 5: secondo le priorità del prodotto.

Per ogni punto: rilascio in Staging, prove della scheda, poi Produzione. Aggiornare lo stato nelle schede (🆕 → ✅).
