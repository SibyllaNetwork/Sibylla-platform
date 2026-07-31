# Food & Beverage (Outlet Manager) — briefing per lo sviluppo

Documento di consegna per chi prende in carico la sezione **Food & Beverage**.
Serve a capire in mezz'ora *cos'è già in piattaforma*, *cosa è ancora del progetto
originale* e *da dove cominciare* senza rompere niente.

Prerequisiti di lettura: `./guida-sviluppatori.md` (avvio FE/BE) e le regole UI in
`../regole_ui.md`.

---

## 0. In due righe

La sezione F&B **non è un mock**: è l'applicazione reale *Outlet Manager*
(`outlet.sibyllanetwork.it` — React/Vite + **Python Flask** + SQLite) portata dentro
la platform. Le pagine sono state **ricreate in React dentro il repo** come sub-app
montata (pattern `AgoraShell`), mentre il **back-end Python è rimasto separato** nella
propria cartella (`outlet-full/backend`), versionata in questo stesso repo.

Quindi: front-end React dentro `src/`, back-end Flask/SQLite in `outlet-full/backend`,
uniti a runtime dal proxy `/api`. Con un `git clone` si ha tutto. L'allineamento agli
standard UI Sibylla e al modello dati multi-struttura è **il lavoro da fare**.

---

## 1. Cos'è già in piattaforma

Integrato con i commit `4e8d045` (integrazione) e `aa63c0c` (Configuratore F&B).

### Operativo — menu «Food & Beverage»

`src/navigation/menu.ts` → gruppo `food-beverage`, 4 voci:

| Voce di menu | `page` | Pagina Outlet |
|---|---|---|
| Gestione comanda | `gest-comanda` | `GestioneSala.jsx` (POS: categorie → voci → comanda → chiusura) |
| Sala ristorante | `sala-ristorante` | `SalaRistorante.jsx` (griglia tavoli, stati, statistiche) |
| Libro prenotazioni | `libro-prenotazioni` | `LibroPrenotazioni.jsx` (calendario, form, timeline turno) |
| Ospiti del giorno | `ospiti-giorno` | `OspitiGiorno.jsx` |

Le 4 voci montano **una sola istanza** di `OutletShell` (nessun `key={page}` in
`PageContent.tsx`): lo stato interno della sub-app persiste passando da una voce
all'altra, ed è così di proposito — serve alla navigazione incrociata
(sala → gestione comanda, sala ↔ prenotazioni).

### Configurazione — Configuratore → sezione «Food & Beverage»

`configuratoriList.ts` definisce 15 voci `fb-*`; `OutletConfig.tsx` ne mappa 14 sulle
pagine di configurazione reali (`ConfigPages.jsx`): Outlet, Sale e tavoli, Turni,
Categorie, Voci menu, Tipi menu, Menu del giorno, Web menu, Lista menu, Allergeni,
Categoria ospite, Stampanti, Service monitor.

Due dettagli da sapere:

- `fb-arrangiamenti` **non** ha pagina Outlet → cade su `PlaceholderPane`.
- I pane nativi `Configuratore/panes/Fb*` (`FbAllergeni`, `FbCreaMenu`, `FbVociMenu`,
  `FbListaMenu`, `FbImpostazioni`, `FbGestioneCosti`) **non sono importati da nessuna
  parte**: sono resti pre-integrazione. Prima di lavorarci, decidere se cancellarli o
  recuperarne il markup già a standard come base per la riscrittura delle pagine Outlet.

### Mappa dei file (front-end)

| File | Ruolo | Righe |
|---|---|---|
| `src/modules/operation/Outlet/OutletShell.tsx` | entry point operativo: menu → pagina, routing a stato, callback di navigazione incrociata | 88 |
| `src/modules/operation/Outlet/OutletConfig.tsx` | entry point configurazione: id `fb-*` → pagina di config | 42 |
| `.../Outlet/app/pages/*.jsx` | le 5 pagine (4 operative + `ConfigPages` con 12 pagine di config) | ~8 700 |
| `.../Outlet/app/components/UI.jsx` | design system **locale** della sub-app (`PageHeader`, bottoni, tabelle, modali) | 310 |
| `.../Outlet/app/services/api.js` | client HTTP: ~110 metodi su `/api/*` | 144 |
| `.../Outlet/app/services/authApi.js` | login/logout/me + ruoli/utenti; token in `localStorage.outlet_token` | 51 |
| `.../Outlet/app/services/pdfUtils.js` | stampa conto/comanda | 67 |
| `.../Outlet/app/outlet-app.css` | scoping degli stili sotto `.outletmgr` | 77 |
| `src/setupProxy.js` | proxy dev: `/api/*` → backend Outlet | 23 |

Le pagine sono `.jsx` (JavaScript, non TS): il progetto compila grazie ad `allowJs`.
Sono state montate **senza riscritture**, con la sola correzione di due bug latenti
del sorgente originale (`selTurno`/`dateStr` non definiti in `SalaRistorante`).

---

## 2. Il back-end: dov'è e com'è fatto

Cartella `outlet-full/` nella root del repo: **è versionata, arriva col clone**.
Fuori dal versionamento restano solo pesi e roba locale — `venv/`, `node_modules/`,
`dist/`, `.env` e `*.db`.

```
outlet-full/
├─ README.md                     ← leggere il box in testa: ruolo della cartella + avvio
├─ backend/                      ← quello che conta: è il BE della sezione F&B
│  ├─ app/main.py                3 347 righe, 131 endpoint
│  ├─ app/models.py                708 righe, 27 tabelle
│  ├─ app/auth.py                  token di sessione su tabella + ruoli/permessi
│  ├─ app/database.py              SQLAlchemy → SQLite
│  ├─ Script Migrazione/           18 script di migrazione ad-hoc
│  ├─ requirements.txt             flask 3.0.3, flask-cors, sqlalchemy 2.0, openpyxl
│  ├─ .env.example                → copiare in .env (non versionato)
│  └─ [outlet_manager.db]          NON versionato: si rigenera vuoto al primo avvio
├─ frontend/                     ← originale Vite: superato, resta come riferimento
│  └─ src/                          utile per SSO: LoginPage/AuthPages/useAuth, mai
│                                   portate nella platform
├─ docker-compose.yml
└─ outlet_manager_relazione_tecnica.docx   ← documentazione funzionale originale
```

**Il database non è nel repo** ed è una scelta: contiene dati di lavoro e la password
SMTP in chiaro (`config_email.smtp_password`). Al primo avvio `create_tables()` +
`_seed()` + `_seed_auth()` ricreano schema e minimo indispensabile: 14 allergeni EU,
3 tipi menu (Food/Beverage/Cantina) e l'utente `admin` / `admin123`. Outlet, sale,
tavoli e menu **no**: per lavorare su dati realistici farsi passare a mano una copia
del `.db`, oppure crearli dal Configuratore → Food & Beverage.

### Avvio in locale

```bash
# 1. back-end Outlet (Python 3.11 o 3.12 — NON 3.14)
cd outlet-full/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m flask --app app.main run --port 8000 --debug

# 2. front-end platform, con /api verso il backend locale
cd ../..
OUTLET_PROXY_TARGET=http://localhost:8000 npm start
```

Senza `OUTLET_PROXY_TARGET` il proxy punta a **produzione**
(`https://outlet.sibyllanetwork.it`): comodo per guardare le pagine con dati veri,
pericoloso appena si scrive. Esportare sempre la variabile quando si sviluppa.

Perché serve il proxy: la sub-app chiama `/api/*` in **relativo** (`BASE = ""`), mentre
la platform usa un backend **assoluto** (`REACT_APP_API_URL` → `localhost:5289`).
Non c'è conflitto oggi, ma il namespace `/api` è occupato dall'Outlet: tenerlo presente.

### Modello dati (27 tabelle)

- **Struttura fisica**: `outlets` → `sale` → `tavoli` (+ `ranghi`), `turni`
- **Menu**: `tipi_menu` → `categorie_menu` → `voci_menu` (multilingua IT/EN/DE/FR),
  `prezzi_speciali`, `voce_menu_outlets`, `allergeni`, `menu_del_giorno`, `web_menu`
- **Operativo**: `prenotazioni`, `comande` → `righe_comanda`
- **Clienti**: `clienti`, `categorie_cliente`, `wallets`, `wallet_transazioni`
- **Periferiche**: `stampanti`, `monitor` (KDS) + tabelle ponte per voce
- **Config/sistema**: `config_email`, `config_mobile_wallet`, `utenti`, `ruoli`,
  `permessi_ruolo`, `sessioni`

---

## 3. Debito noto — misurato, non a sensazione

Da sapere prima di stimare qualsiasi cosa.

**Front-end**

1. **~1 170 `style={{...}}` inline** nelle pagine (`ConfigPages` 422, `GestioneSala` 365,
   `SalaRistorante` 185, `LibroPrenotazioni` 102, `OspitiGiorno` 60, `UI.jsx` 40).
   Violano la regola «nessuno stile inline, tutto nel `.sass` omonimo».
2. **Design system parallelo**: `UI.jsx` reimplementa `PageHeader`, bottoni, tabelle e
   modali invece di usare `PageHead`, `SelectField`/`InputField`, `.sib-table`,
   `ConfirmDialog`, `Tooltip`, `Pagination`. Alcune classi `sib-*` sono usate a spot,
   quindi il risultato è ibrido.
3. **Nessun supporto dark mode** né container query per il laptop: le pagine non
   partecipano allo skin `[data-theme=dark]` né al budget larghezza con sidenav aperta.
4. **JS non tipizzato**: nessun contratto TS sulle risposte API.
5. **Titolo doppio evitato con una toppa**: `Configuratore.tsx` sopprime il proprio
   header quando `hasOutletConfig(activeId)`, perché le pagine Outlet hanno un
   `PageHeader` proprio. Sparisce quando si passa a `PageHead`.

**Back-end**

6. **API praticamente aperta**: su 131 endpoint, solo **12** hanno `@require_auth`/
   `@require_admin`. Tutto il resto (outlet, sale, tavoli, menu, comande, prenotazioni,
   wallet) risponde **senza token**. È il punto più serio: da chiudere prima di
   qualunque esposizione.
7. **Nessuna multi-tenancy**: `Outlet.struttura` è una `String(100)` libera, non una FK.
   Non esiste `azienda_id`/`struttura_id`, quindi un solo DB = un solo cliente. La
   platform è multi-azienda e multi-struttura (`useAccessStore`, Intestatario →
   strutture): è un disallineamento di modello, non un dettaglio.
8. **SQLite + 18 script di migrazione ad-hoc**, nessuna migrazione versionata
   (né Alembic né equivalente).
9. **Due autenticazioni separate**: la platform usa JWT Bearer verso
   `SibyllaApiProxy`, l'Outlet un token di sessione su tabella in
   `localStorage.outlet_token`. Oggi l'utente ha due sessioni indipendenti.

---

## 4. Regole UI non negoziabili

Valgono su tutto ciò che si tocca in F&B, anche solo per una riga. Fonte: `../regole_ui.md`.

- **Zero stili inline**: ogni stile nel `.sass` omonimo del componente, stessa cartella.
- **Componenti condivisi sempre**: mai `<select>`/`<input>`/label custom → `SelectField`,
  `InputField`, `RadioGroup`, `Pagination`, `Tooltip`, `ConfirmDialog`.
- **Header di pagina** = componente `PageHead` (BtnBack + titolo + sottotitolo + azioni).
- **Tabelle**: `.sib-table` / `.sib-table-wrap`, header in *case normale* (mai uppercase),
  bordi 1px, niente zebra.
- **Nessuno scroll orizzontale**, a nessuna larghezza: compattare con **container query**
  sul root di pagina (non `@media` sul viewport), poi ellipsis/abbreviazione + tooltip
  (`TruncatedText`), poi `table-layout: fixed` + `colgroup` in %.
- **Testi tabella su una riga**, con tooltip completo se troncati.
- **Icone in tabella**: `fa-solid`, senza box, `var(--color-primary)`, 16px.
- **Ogni «Elimina» passa da una modale di conferma** (`useConfirmStore`, mai `window.confirm`).
- **Niente box riepilogativi/stat come header di pagina**.
- **Campi form 34px**; label Poppins 12px/600 colore primary, case normale.
- **Tooltip**: sfondo `#1E293B`, testo bianco, via componente `Tooltip`.

Nota sulla specificità: un `&__cell` nel `.sass` di pagina compila in **una** classe e
*pareggia* con `.sib-input` — il design system, caricato dopo, vince. Per sovrascrivere
una classe `.sib-*` serve un selettore con almeno due classi.

---

## 5. Tre decisioni da prendere prima di scrivere codice

Sono forcelle vere: la roadmap cambia forma a seconda della risposta. Vanno chiuse con
Alfredo, non decise dallo sviluppatore.

**Decisione 1 — che fine fa il back-end Python.**
Tre strade: (a) **porting** su `SibyllaApi` (.NET + Azure SQL) come gli altri moduli;
(b) **microservizio Flask mantenuto**, dietro `SibyllaApiProxy`, con un `azienda_id`
aggiunto al modello; (c) **status quo** (Flask standalone + proxy) come soluzione
temporanea. La (a) è coerente con il resto della piattaforma, la (b) è la più rapida a
dare qualcosa di multi-cliente. Da questa scelta dipende tutto il § 6, fase 3.

**Decisione 2 — riscrittura UI incrementale o pagina intera.**
Le pagine sono grandi (`GestioneSala` 2 707 righe, `ConfigPages` 2 753). Consiglio:
**pagina intera, una per volta**, perché estirpare 400 stili inline a pezzi lascia
mesi di stato ibrido. Va concordato però che una pagina «in lavorazione» resta chiusa
al resto del team fino al merge.

**Decisione 3 — chi possiede l'anagrafica.**
Outlet/sale/tavoli esistono anche nella platform (`crea-outlet` → `CreaStruttura`,
pagina `sale-tavoli` con `useSaleStore`, planimetrie del Planner). Oggi ci sono **due**
anagrafiche parallele. Decidere quale è la sorgente di verità prima di costruirci sopra.

---

## 6. Roadmap suggerita

**Fase 0 — ambiente e rete di sicurezza** *(giorni, non settimane)*
1. Avviare BE locale + FE con `OUTLET_PROXY_TARGET` (istruzioni in `outlet-full/README.md`).
2. Leggere `outlet_manager_relazione_tecnica.docx`: è la specifica funzionale originale.
3. Chiedere una copia del `.db` di lavoro, se serve lavorare su dati realistici
   (il database non è versionato: vedi § 2).
4. Congelare il contratto API: da `api.js` + `main.py` generare i tipi TS delle risposte.
   È la base per tutto il resto e non richiede decisioni aperte.

**Fase 1 — sicurezza e tenancy** *(il vero blocco alla messa in produzione)*
5. `@require_auth` su tutti gli endpoint, con eccezioni esplicite e motivate (web menu
   pubblico).
6. SSO: un solo token. La platform inietta il proprio Bearer, l'Outlet lo valida; via
   `outlet_token` da `localStorage`, e con esso il `window.location.reload()` su 401
   in `authApi.js` (in una SPA montata non è accettabile).
7. `azienda_id`/`struttura_id` sul modello e filtro su ogni query.
8. In produzione: replicare l'instradamento `/api` → backend Outlet a livello di web
   server, con iniezione del token. Oggi esiste **solo** in dev (`setupProxy.js`).

**Fase 2 — normalizzazione UI, una pagina per volta**
Ordine consigliato, dal più semplice al più complesso (si impara sul piccolo):
`OspitiGiorno` (593) → `LibroPrenotazioni` (996) → `SalaRistorante` (1 681) →
`GestioneSala` (2 707) → `ConfigPages` (2 753, scomponibile in 12 file).
Per ognuna: `.jsx` → `.tsx`, stili inline → `.sass` omonimo, `UI.jsx` → componenti
condivisi, `PageHeader` → `PageHead`, tabelle → `.sib-table`, dark mode + container
query, checklist del § 4. Quando `UI.jsx` non serve più a nessuno, si cancella.

**Fase 3 — back-end secondo la decisione 1**
Se porting: partire dal dominio menu (statico, poco traffico, nessuna concorrenza),
lasciare `comande` per ultimo (è la parte con stato e conflitti).

**Fase 4 — completamenti funzionali**
`fb-arrangiamenti` senza pagina; stampanti/reparti e Service monitor (KDS) mai
verificati end-to-end nella platform; wallet + mobile wallet (Apple/Google) e invio
email hanno endpoint pronti ma nessuna UI integrata; e va chiusa l'integrazione con le
`richieste-operative` (TO → hotel) e con la pagina `sale-tavoli` nativa.

---

## 7. Trappole già trovate — evitarle

- **Non aggiungere `key={page}`** a `OutletShell` in `PageContent.tsx`: azzererebbe lo
  stato e romperebbe la navigazione incrociata.
- **Non sviluppare col proxy verso produzione** (il default): esportare sempre
  `OUTLET_PROXY_TARGET`.
- **Python 3.13/3.14 non vanno**: servono 3.11 o 3.12.
- **Non lanciare `outlet-full/start.sh`**: avvia anche il frontend Vite originale sulla
  porta 3000, in conflitto con la platform. Del progetto originale serve **solo** il
  back-end.
- **`.env` e `*.db` non sono versionati** (per scelta: password SMTP in chiaro nel DB).
  Copiare `.env.example` → `.env` al primo avvio.
- **`Script Migrazione/`**: sono script one-shot già applicati. Non rilanciarli alla
  cieca su un database esistente.
- Le pagine Outlet montano **il proprio** `PageHeader`: chi passa a `PageHead` deve
  togliere anche la soppressione condizionale in `Configuratore.tsx` (riga ~157).

---

## 8. File da aprire, nell'ordine

1. `src/router/PageContent.tsx` (righe ~415-423) — come entrano le 4 pagine
2. `src/modules/operation/Outlet/OutletShell.tsx` — routing e navigazione incrociata
3. `src/modules/operation/Outlet/OutletConfig.tsx` — mappa `fb-*` → pagine config
4. `src/modules/operation/Outlet/app/services/api.js` — la superficie API completa
5. `src/setupProxy.js` — come `/api` arriva al Flask
6. `outlet-full/backend/app/models.py` — il dominio
7. `outlet-full/backend/app/main.py` — i 131 endpoint
8. `../regole_ui.md` + `./layout-responsive.md` — gli standard da applicare
