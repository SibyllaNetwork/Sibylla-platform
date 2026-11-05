# Human Resources — specifica di riproduzione

Documentazione per riprodurre **identica**, frontend e backend, la sezione **Human Resources** di Sibylla Platform in un'altra codebase.

Identica vuol dire con gli stessi testi, la stessa disposizione, le stesse misure e gli stessi colori, gli stessi stati e regole, gli stessi effetti e la stessa resa a ogni larghezza.

Riferimento: repository `sibylla-platform`, ramo `main`, versione del 5 novembre 2026 con le correzioni dei difetti (vedi «Punti aperti per il backend»). La demo è pubblicata su https://sibylla-platform.vercel.app (Human Resources nella sidenav).

## Come usarla (per l'agente AI che implementa)

1. Leggi prima **`00-fondamenta.md`**: design system, token, componenti condivisi e regole UI vincolanti. Senza questi le pagine non verranno uguali.
2. Leggi poi **`01-modello-dati-e-api.md`**: entità, regole di business trasversali, dati demo e API da realizzare.
3. Implementa una pagina alla volta seguendo la sua scheda. Ogni scheda segue lo schema di `_SCHEMA.md`:
   - scopo;
   - accesso;
   - layout;
   - testi;
   - interazioni;
   - dati;
   - backend;
   - stile;
   - responsività;
   - effetti;
   - accessibilità;
   - criteri di accettazione;
   - file sorgente.
4. Una pagina è finita solo quando **tutti i criteri di accettazione** della scheda sono verificati a **1366, 1440 e 1920 px** di larghezza, con la sidenav aperta, in tema chiaro e scuro, confrontandola fianco a fianco con la demo.
5. In caso di dubbio vince il comportamento della demo online. Segnala la differenza invece di inventare.

Le pagine condividono dati e logica, quindi rispetta l'ordine consigliato:

1. Configurazione HR;
2. anagrafiche;
3. presenze;
4. richieste e piano ferie;
5. le altre.

Ad esempio Registro presenze, Timbrature e Cedolini leggono le stesse giornate. Richieste e Piano ferie usano lo stesso calendario e le stesse azioni. Le ferie approvate compaiono nel registro presenze.

## Pagine

| # | Scheda | Pagina | Route (id pagina) | Percorso nella sidenav |
| --- | --- | --- | --- | --- |
| 00 | [00-fondamenta.md](00-fondamenta.md) | Design system e componenti condivisi | — | — |
| 01 | [01-modello-dati-e-api.md](01-modello-dati-e-api.md) | Entità, regole e API | — | — |
| 02 | [02-configurazione-hr.md](02-configurazione-hr.md) | Configurazione HR (Reparti, Orari di lavoro, Turnistica, Contratti collettivi con Tipologie di contratto, Aziende in appalto, Collaboratori esterni, Integrazione paghe) | `hr-configurazione`, `hr-configurazione:<tab>` | Human Resources › Configurazione |
| 03 | [03-crea-anagrafica.md](03-crea-anagrafica.md) | Crea anagrafica personale | `crea-anagrafica` | Human Resources › Gestione delle anagrafiche › Crea anagrafica personale |
| 04 | [04-crea-collaboratore-esterno.md](04-crea-collaboratore-esterno.md) | Crea collaboratore esterno | `crea-collaboratore-esterno` | … › Gestione delle anagrafiche › Crea collaboratore esterno |
| 05 | [05-archivio-personale.md](05-archivio-personale.md) | Archivio del personale | `archivio-personale`, `archivio-personale:esterni` | … › Gestione delle anagrafiche › Archivio del personale |
| 13 | [13-profile-analysis.md](13-profile-analysis.md) | Profile analysis | `profile-analysis`, `profile-analysis:<id>` | … › Gestione delle anagrafiche › Profile analysis |
| 06 | [06-registro-presenze.md](06-registro-presenze.md) | Registro presenze | `registro-presenze` | Human Resources › Gestione delle presenze › Registro presenze |
| 07 | [07-timbrature.md](07-timbrature.md) | Timbrature | `hr-timbrature` | … › Gestione delle presenze › Timbrature |
| 11 | [11-turni-personale.md](11-turni-personale.md) | Turni del personale | `turni-personale` | … › Gestione delle presenze › Turni del personale |
| 12 | [12-nota-spese.md](12-nota-spese.md) | Nota spese | `hr-note-spese` | … › Gestione delle presenze › Nota spese |
| 08 | [08-cedolini.md](08-cedolini.md) | Cedolini | `hr-cedolini` | … › Gestione delle presenze › Cedolini |
| 09 | [09-richieste.md](09-richieste.md) | Richieste | `hr-richieste-ferie` | … › Gestione delle presenze › Gestione ferie e permessi › Richieste |
| 10 | [10-piano-ferie.md](10-piano-ferie.md) | Piano ferie | `hr-piano-ferie` | … › Gestione ferie e permessi › Piano ferie |
| 14 | [14-monitoraggio-performance.md](14-monitoraggio-performance.md) | Monitoraggio performance | `monitoraggio-perf` | Human Resources › Gestione dei premi › Monitoraggio performance |
| 15 | [15-assegna-obiettivo.md](15-assegna-obiettivo.md) | Assegna obiettivo | `assegna-obiettivo` | … › Gestione dei premi › Assegna obiettivo |
| 16 | [16-hr-overview.md](16-hr-overview.md) | HR Overview | `hr-overview` | Human Resources › HR Overview |

Documenti collegati:
- `../integrazione paghe/README.md` e `../integrazione paghe/Tracciato_RILPRE.pdf`: tracciato presenze TeamSystem e contratto d'invio al connettore paghe.
- `../bi.md`: kit delle pagine BI, usato da Profile analysis.
- Pagina pubblica del kiosk: `/kiosk?p=<postazione>` (scheda 07), servita a tutto schermo senza sidenav.

## Sidenav della sezione

```
Human Resources
├─ Configurazione
├─ Gestione delle anagrafiche
│  ├─ Crea anagrafica personale
│  ├─ Crea collaboratore esterno
│  ├─ Archivio del personale
│  └─ Profile analysis
├─ Gestione delle presenze
│  ├─ Registro presenze
│  ├─ Timbrature
│  ├─ Turni del personale
│  ├─ Nota spese
│  ├─ Cedolini
│  └─ Gestione ferie e permessi
│     ├─ Richieste
│     └─ Piano ferie
├─ Gestione dei premi
│  ├─ Monitoraggio performance
│  └─ Assegna obiettivo
└─ HR Overview
```

Icone delle voci in `src/core/icons/MenuIco.tsx`, riportate in `00-fondamenta.md`. Il colore della sezione nel menu è `#9B59B6`.

## Principi di prodotto da rispettare

- **Human Resources è lo strumento dell'ufficio del personale** di una struttura ricettiva. Le richieste nascono dai dipendenti e dai collaboratori nell'**App Op!**, mentre l'HR le gestisce: le modifica in ogni valore, le approva, le rifiuta, le sposta e le elimina. Ogni intervento resta nello **storico**, con autore, data, campi cambiati e messaggio al dipendente.
- **Iter di ferie e ROL**: prima decide il responsabile di reparto dall'App Op!, poi l'ufficio del personale. Permessi, malattia, reparti senza responsabile e richieste del responsabile stesso vanno direttamente all'HR.
- **Il saldo ferie va in negativo solo con un'autorizzazione esplicita** dell'HR, che resta nello storico.
- **Ogni eliminazione passa da una modale di conferma.**
- **Nessuna tabella scorre in orizzontale**, a nessuna larghezza.
- **Una schermata, zero scroll** nelle pagine BI (Profile analysis).

## Stato del backend nella codebase di riferimento

Nella codebase di riferimento quasi tutti i dati HR sono **mock lato frontend**: store `zustand` persistiti in `localStorage`, deterministici, così la demo mostra sempre gli stessi casi. L'unica chiamata reale già presente è `operation/GetPresenzeGiornaliere`; per l'invio del consuntivo paghe è definito il contratto `POST /Sibylla/hr/paghe/trasmetti`.

La specifica del backend da realizzare (entità, endpoint, effetti, notifiche) è in `01-modello-dati-e-api.md` e nella sezione «Backend da realizzare» di ogni scheda. I dati demo vanno ricreati identici, così le due demo coincidono.

## Regole di precedenza tra le schede

- **API:** gli endpoint proposti nelle singole schede sono coerenti con `01-modello-dati-e-api.md`. Se una scheda propone un percorso diverso, vale `01-modello-dati-e-api.md`, che spiega anche come adattarli alla convenzione `POST controller/Azione` già usata dal Portal (§ 5.1).
- **Design system:** per i valori di componenti condivisi (Tabs, `sib-btn`, campi) vale `00-fondamenta.md`.
- **«⚠ Nota di fedeltà»:** dove una scheda la riporta, il codice di riferimento si discosta da una regola generale. Va riprodotto il **comportamento del codice**, salvo diversa indicazione della lista seguente.

## Punti aperti per il backend

I difetti emersi durante la scrittura delle schede sono stati **corretti nella codebase di riferimento** il 5 novembre 2026, e le schede descrivono il comportamento corretto:
- approvazione senza ricevuta;
- saldo negativo delle nuove richieste;
- colori del dettaglio in Piano ferie;
- anno del residuo ferie;
- contratti e foto in Crea anagrafica;
- Elimina nell'Archivio;
- filtro di colonna tagliato;
- Orari;
- uscita dalla Configurazione con modifiche non salvate;
- link diretto alle Tipologie;
- conferme di rimozione;
- pagina kiosk;
- scroll orizzontale in Monitoraggio performance;
- assegnatari reali;
- HR Overview collegata agli obiettivi;
- tooltip scuro del testo troncato;
- stati senza pillola.

Restano questi punti, che dipendono dal backend o da una scelta di prodotto:

| Area | Punto aperto | Scheda |
| --- | --- | --- |
| Identità del personale | Nella demo i 12 dipendenti HR (id 1–12) e le anagrafiche/contratti (id 66, 67, 69, 88, 89…) usano due insiemi di identificativi: il backend deve avere **un'unica persona** | 01 |
| Reparti | Responsabile e reparto si collegano per **nome**: usare `responsabileId` e `repartoId` | 01 |
| App Op! | Decisione del responsabile, nuova richiesta e nuova spesa del dipendente esistono come azioni ma nessuna pagina HR le usa: le espone il backend all'App Op! | 01 |
| Notifiche e permessi | Nessuna notifica parte davvero (salvo quelle dei turni) e i permessi per ruolo non sono applicati nel frontend: li deve imporre il backend (§ 7 di 01) | 01 |
| Configurazione | Chiudendo o ricaricando il browser con modifiche non salvate non c'è conferma (c'è uscendo dalla pagina e cambiando scheda) | 02 |
| Aziende in appalto | Le aziende non si possono eliminare dalla Configurazione | 02 |
| Archivio del personale | Senza backend l'eliminazione resta nel browser; l'endpoint `POST anagrafica-personale/Delete` è da realizzare | 05 |
| Paghe | L'invio reale del consuntivo richiede il connettore `POST /Sibylla/hr/paghe/trasmetti`; senza, l'invio è registrato come simulato | 06, `../integrazione paghe/README.md` |
| HR Overview | I numeri sono dimostrativi (deterministici per struttura e anno): vanno calcolati dal backend | 16 |

## Contenuto della cartella

```
docs/human-resources/
├─ README.md                        questo indice
├─ _SCHEMA.md                       schema e regole di scrittura delle schede
├─ 00-fondamenta.md                 design system, componenti condivisi, regole UI
├─ 01-modello-dati-e-api.md         entità, regole di business, dati demo, API, permessi
├─ 02-configurazione-hr.md          Configurazione HR e le sue 7 tab
├─ 03 … 16                          una scheda per pagina
docs/integrazione paghe/
├─ README.md                        tracciato RILPRE TeamSystem e contratto d'invio
└─ Tracciato_RILPRE.pdf             specifica TeamSystem
```
