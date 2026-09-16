# Food & Beverage — briefing per lo sviluppo

Documento di consegna per chi prende in carico la sezione **Food & Beverage**.

Prerequisiti di lettura: `./guida-sviluppatori.md` (avvio FE) e le regole UI in
`../regole_ui.md`.

---

## 0. In due righe

La sezione F&B è la riscrittura nativa dell'applicazione *Outlet Manager*
(`outlet.sibyllanetwork.it`): stesse funzioni, tutte ricostruite in TypeScript
dentro `src/modules/operation/FoodBeverage/` col design system Platform e su
**dati mock** in uno store dedicato. Il front-end vendorizzato dell'app
originale (`src/modules/operation/Outlet`, JSX con ~1.170 stili inline) è stato
**rimosso**: nessuna voce di menu lo monta più.

Il back-end Flask/SQLite originale resta versionato in `outlet-full/backend`
come riferimento funzionale, ma non è più chiamato da nessuna pagina.

---

## 1. Le pagine

Menu `Operation → Food & Beverage`, 21 voci in 5 gruppi (`src/navigation/menu.ts`).
Tutte native, tutte instradate in `src/router/PageContent.tsx`.

| Gruppo | Voci | Cartella |
|---|---|---|
| — | Dashboard F&B | `FoodBeverage/DashboardFb` (kit `src/core/bi`) |
| Operativo | Sala ristorante, Libro prenotazioni, Ospiti del giorno, Gestione comanda | `FoodBeverage/{SalaRistorante,LibroPrenotazioni,OspitiGiorno,GestioneComanda}` |
| Struttura | Outlet, Sale e tavoli, Turni | `FoodBeverage/{Outlet,Turni}` + `operation/SaleTavoli` (nativa preesistente, montata `editable`) |
| Menu | Tipi menu, Categorie, Voci menu, Menu del giorno, Web menu | `FoodBeverage/Menu` |
| Generali | Allergeni, Categorie cliente, Stampanti, Service monitor, Configurazione e-mail, Mobile wallet | `FoodBeverage/Generali` |
| Amministrazione | Utenti, Wallet clienti, Ruoli e permessi | `FoodBeverage/Amministrazione` |

**Sala ristorante** e **Gestione comanda** sono touch-first (tablet o monitor in
sala): bersagli ≥ 44px, nessuno stato legato all'hover, azioni in barra o
pannello. La Sala ha due viste: card dei tavoli e planimetria con le sedie, su
cui si opera anche posto per posto.

---

## 2. I dati

Tutto in `src/store/useFbStore.ts` (persist `sibylla.fb`): outlet, sale, tavoli,
turni, catalogo (tipi → categorie → voci), menu del giorno, web menu,
prenotazioni, comande e righe, posti a sedere, allergeni, categorie cliente,
stampanti, monitor KDS, configurazione e-mail e wallet, utenti, ruoli, wallet
dei clienti, più il `contesto` di servizio condiviso fra le pagine.

Il modello e i dati di seed stanno in `FoodBeverage/fb.model.ts`: sono quelli
dell'installazione reale (outlet, turni, 14 categorie, voci con prezzi,
allergeni UE, categorie cliente).

**Quando si cambia la forma dei dati va alzata la `version` del persist**,
altrimenti i browser che hanno già lo stato salvato restano sul vecchio schema.

`useSaleStore` (planimetrie) è seedato dal modello F&B: la pagina *Sale e tavoli*
disegna le stesse sale che *Sala ristorante* poi serve, con gli stessi numeri di
tavolo. È il ponte fra configurazione e servizio.

---

## 3. Il Configuratore

Le 14 voci `fb-*` del Configuratore non ospitano più un editor proprio:
**rimandano** alla pagina della sezione dove quella cosa si configura
(`RIMANDI_FB` in `Configuratore.tsx`). Così non esistono due posti — e due
stati — per lo stesso dato. I pane F&B nativi che c'erano prima, e i loro
store, sono stati rimossi.

---

## 4. Regole UI non negoziabili

Valgono su tutto ciò che si tocca in F&B. Fonte: `../regole_ui.md`.

- **Zero stili inline**: ogni stile nel `.sass` omonimo del componente. Le
  coordinate dinamiche passano da custom property (`--x`, `--pct`), non da
  `style={{ width }}`.
- **Componenti condivisi sempre**: `SelectField`, `InputField`, `NumCell`,
  `SearchField`, `DatePickerField`, `TextareaField`, `Tooltip`, `TruncatedText`,
  `Modal`, `FilterToolbar`, `ConfirmDialog`.
- **Header di pagina** = `PageHead`.
- **Tabelle**: `.sib-table` / `.sib-table-wrap`, header in *case normale*,
  colonne in percentuale con `table-layout: fixed`; nessuna intestazione
  troncata, nessuno scroll orizzontale a nessuna larghezza.
- **Totali in fondo alla tabella**, mai come riga di stat-card in testa alla
  pagina (deroga solo per i KPI delle pagine BI).
- **Ogni «Elimina» passa da una modale di conferma** (`useConfirmStore`).
- Attenzione alle **griglie ad altezza definita**: con `grid-auto-rows: auto` e
  figli con `overflow: hidden` le righe vengono compresse e le card risultano
  tagliate. Usare `grid-auto-rows: max-content`.

---

## 5. Cosa resta aperto

1. **Backend.** Oggi la sezione gira su dati mock. Quando si collegherà a un
   back-end, il punto di innesto è `useFbStore`: le pagine non conoscono la
   sorgente. Le tre strade restano quelle di sempre — porting su `SibyllaApi`,
   microservizio Flask dietro proxy, o status quo.
2. **Multi-tenancy.** Il modello non ha `azienda_id`/`struttura_id`: va aggiunto
   insieme al back-end.
3. **Stampanti e monitor** sono configurabili ma non producono stampe né
   aggiornano un display reale: manca il lato macchina.
4. `fb-arrangiamenti` nel Configuratore non ha una pagina di destinazione.
