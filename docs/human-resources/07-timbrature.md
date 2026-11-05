# 07 · Timbrature

> Scheda di riproduzione della pagina `hr-timbrature`. Componenti condivisi (PageHead, Modal, Tooltip, TruncatedText, Pagination, Toast, ConfirmDialog, campi form, `sib-btn`, `sib-table`) e regole UI globali: vedi `00-fondamenta.md`. Entità e store trasversali: vedi `01-modello-dati-e-api.md`. Il **modello delle presenze e delle timbrature** (giornata, derivazione delle timbrature dai segmenti, ricalcolo della presenza, timbrature anomale, postazioni, store `sibylla.registro-presenze`) è descritto in `06-registro-presenze.md` §6: questa pagina legge e scrive **le stesse timbrature**.

---

## 1. Scopo e utenti

Pagina dell'**ufficio del personale** per gestire come entra ed esce il personale:

- **QR code di timbratura** del kiosk all'ingresso: si rinnova ogni minuto; il dipendente lo inquadra con l'App Op! e Sibylla capisce se è un'entrata o un'uscita;
- **kiosk a schermo intero** da aprire su un tablet o monitor all'ingresso;
- **App dipendenti**: QR e link di installazione dell'App Op!, quanti l'hanno attivata, chi manca (con invito), finestra in cui è consentita la timbratura con nome e cognome;
- **avvisi di ritardo** di oggi arrivati dall'App Op!;
- **storico** di tutte le timbrature con filtri, export, nuova / modifica / elimina.

Ogni modifica ricalcola la presenza della giornata nel Registro presenze (06) e in Cedolini (08). I dipendenti non usano questa pagina.

## 2. Accesso

- **id pagina / route**: `hr-timbrature` (router: `if (page === 'hr-timbrature') return <Timbrature navigate={navigate}/>`).
- **Sidenav**: «Human Resources» › «Gestione delle presenze» › «Timbrature» (seconda voce, dopo «Registro presenze»). Icona menu: `fa-fingerprint`. Presente anche nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: Human Resources › Gestione delle presenze › Timbrature.
- **Indietro**: PageHead con `onBack={() => navigate('home')}` → Home.
- **Indirizzo kiosk** copiabile: `{origin}/kiosk?p=principale`. Nota: in questo repository **non esiste** una route `/kiosk` autonoma; il kiosk è oggi l'overlay a schermo intero della pagina (§5.3). Chi riproduce deve prevedere la pagina kiosk pubblica (vedi §7).
- Nessun deep link in ingresso; nessuna navigazione verso altre pagine.

## 3. Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                 Timbrature                [▭ Apri kiosk] [+ Nuova timbratura] │
│        Entrate e uscite del personale: QR di timbratura, avvisi di ritardo, …         │
├──────────────────────────────────────────┬───────────────────────────────────────────┤
│ ▦ QR code timbratura                     │ ▯ App dipendenti                           │
├──────────────────────────────────────────┼───────────────────────────────────────────┤
│ ┌────────┐  Come funziona                │ ┌──────┐  10 di 12 dipendenti hanno …     │
│ │  QR    │  1. Apri il kiosk …           │ │ QR   │  Ultimi 7 giorni: 84 timbrature … │
│ │ 176px  │  2. Il dipendente apre …      │ │136px │  Da attivare: Oscar P. · Chiara F.│
│ └────────┘  3. Inquadra il QR …          │ └──────┘  [✈ Invia invito]                 │
│ Si rinnova  Il codice cambia ogni minuto…│ Inquadralo Link d'installazione app.sib… ⎘│
│ tra 42s     Indirizzo del kiosk /kiosk… ⎘│ per …     1. 2. 3. (istruzioni grigie)    │
│                                          │           [Timbratura con nome … fino al] │
├──────────────────────────────────────────┴───────────────────────────────────────────┤
│ ⏰ Avvisi di ritardo di oggi (2)                                                       │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Dipendente | Turno | Arrivo previsto | Motivo | Avvisato alle | Entrata               │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ↺ Storico timbrature                                                        [xls]    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Periodo [dal – al]  Reparto [190]  Tipo [170]                  [🔍 Cerca dipendente…]│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Dipendente | Tipo | Orario | Postazione | Note | Azioni                               │
│ …10 righe per pagina                                                                  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 37 timbrature                         ‹ 1 2 3 4 ›                                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Root `.tmb`: `container: tmb / inline-size; display:flex; flex-direction:column; gap:16px`.
- Riga superiore `.tmb__top`: griglia `repeat(2, minmax(0, 1fr))`, gap 16px (due card affiancate).
- Card `.tmb__card`: bordo 1px `--color-border` (#CFD4DA), radius `--radius-md` 6px, sfondo `--color-surface` (#FFFFFF), `min-width:0`. Header card: flex, gap 10px, padding 12px 16px, bordo inferiore 1px. Corpo QR `.tmb__qr-body`: flex, gap 20px, padding 16px (QR a sinistra, testo a destra).
- Card «Avvisi di ritardo» e «Storico» a tutta larghezza; le tabelle dentro le card non hanno bordo proprio (`.tmb__table.sib-table-wrap { border:none; border-radius:0 }`).
- Modale «Nuova / Modifica timbratura»: `Modal size="md"`.
- Kiosk: overlay `position:fixed; inset:0; z-index:1000`, montato con portal su `document.body`.

## 4. Elementi e testi

### 4.1 PageHead
- Titolo «Timbrature»; sottotitolo «Entrate e uscite del personale: QR di timbratura, avvisi di ritardo, app dipendenti e storico».
- Azioni (`.tmb__head-actions`, flex gap 10px; icone margin-right 7px):
  - `sib-btn sib-btn--secondary`: `fa-solid fa-display` «Apri kiosk»;
  - `sib-btn sib-btn--primary`: `fa-solid fa-plus` «Nuova timbratura».

### 4.2 Card «QR code timbratura»
- Titolo `h2`: `fa-solid fa-qrcode` + «QR code timbratura».
- QR (`img alt="QR code di timbratura del kiosk"`, 176×176 a video); finché il QR non è pronto un riquadro vuoto delle stesse misure.
- Sotto: «Si rinnova tra {s}s» (secondi rimanenti, 60→1), rosso quando ≤ 10.
- Colonna testo:
  - `h3` «Come funziona»;
  - elenco numerato: «Apri il **kiosk** su un tablet o un monitor all'ingresso del personale.» / «Il dipendente apre l'**App Op!** sul telefono.» / «Inquadra il QR: Sibylla riconosce da sola se è un'entrata o un'uscita.»;
  - hint: «Il codice cambia ogni minuto: una foto del QR non basta per timbrare da casa.»;
  - riga indirizzo (in fondo alla colonna, `margin-top:auto`): «Indirizzo del kiosk» + `code` «/kiosk?p=principale» + pulsante icona `fa-solid fa-copy` (Tooltip «Copia l'indirizzo», aria «Copia l'indirizzo del kiosk»).

### 4.3 Card «App dipendenti»
- Titolo: `fa-solid fa-mobile-screen` + «App dipendenti».
- QR più piccolo (136×136, `alt="QR code per installare l'App Op!"`) che codifica `https://app.sibyllaop.it/`; sotto «Inquadralo per installare l'app».
- Testi:
  - «**{attivi}** di {totale} dipendenti hanno attivato l'App Op!» (demo: «10 di 12»);
  - «Ultimi 7 giorni: **{n}** timbrature dall'app.»;
  - se qualcuno non l'ha attivata: «Da attivare:» + nomi «{nome} {cognome}» separati da «·» (demo: Oscar Pettinari · Chiara Ferri) + `sib-btn sib-btn--ghost` `fa-solid fa-paper-plane` «Invia invito»;
  - riga link: «Link d'installazione» + `code` «app.sibyllaop.it/» + pulsante `fa-solid fa-copy` (Tooltip «Copia il link», aria «Copia il link d'installazione dell'App Op!»);
  - elenco numerato grigio: «Il dipendente inquadra questo QR (o apre il link d'installazione) dal telefono.» / «Su iPhone: Condividi → *Aggiungi alla schermata Home*. Su Android: *Installa app*.» / «Accede con email aziendale o cellulare e il codice ricevuto via email.»;
  - `DatePickerField` name `con-nome`, label «Timbratura con nome e cognome consentita fino al» (max 340px) e sotto l'hint: se la data è ≥ oggi «Fino a questa data chi non riesce a inquadrare il QR può timbrare scrivendo nome e cognome nell'app.», se è passata (rosso) «Scaduta: ora si timbra solo inquadrando il QR del kiosk.».

### 4.4 Card «Avvisi di ritardo di oggi»
- Titolo: `fa-solid fa-alarm-clock` + «Avvisi di ritardo di oggi ({n})».
- Tabella `.sib-table` (table-layout fixed), colgroup: Dipendente 26%, Turno auto, Arrivo previsto auto, Motivo 24%, Avvisato alle auto, Entrata auto. Intestazioni: «Dipendente», «Turno», «Arrivo previsto», «Motivo», «Avvisato alle», «Entrata».
  - Dipendente: componente Persona (avatar 30px con iniziali, nome con ellipsis, sotto reparto con icona reparto 10px blu);
  - Turno: «HH:MM» inizio turno;
  - Arrivo previsto: «HH:MM» + «+{min}'» (11px bold arancio `--color-warning`);
  - Motivo: TruncatedText, «—» se vuoto;
  - Avvisato alle: «HH:MM» grigio;
  - Entrata: «HH:MM» in rosso bold se oltre l'arrivo previsto, verde bold altrimenti; «Non ancora entrato» grigio se non ha timbrato.
- Vuoto: «Nessun avviso di ritardo oggi.» (al posto della tabella).

### 4.5 Card «Storico timbrature»
- Header con titolo `fa-solid fa-clock-rotate-left` «Storico timbrature» a sinistra e a destra pulsante icona `fa-regular fa-file-xls` (Tooltip/aria «Esporta in Excel»), disabilitato se non ci sono righe.
- Filtri (`.tmb__filters`): `DateRangeField` (range picker standard) label «Periodo» (`dal`/`al`); `SelectField` «Reparto» (190px) opzioni «Tutti i reparti», «Front office», «F&B», «Housekeeping», «Manutenzione», «Cucina», «Amministrazione»; `SelectField` «Tipo» (170px) opzioni «Entrate e uscite», «Entrate», «Uscite»; `SearchField` (240px, a destra) placeholder «Cerca dipendente…» con pulsante di pulizia.
- Tabella, colgroup: Dipendente 26%, Tipo 13%, Orario 17%, Postazione 18%, Note resto, Azioni 10% (centrata). Intestazioni «Dipendente», «Tipo», «Orario», «Postazione», «Note», «Azioni».
  - Tipo: `fa-solid fa-right-to-bracket` «Entrata» (verde `--color-success` #007035) / `fa-solid fa-right-from-bracket` «Uscita» (`--color-primary` #204769), 12px 600;
  - Orario: **«gg/mm/aaaa HH:MM»** in grassetto, cifre tabellari;
  - Postazione: TruncatedText («kiosk ingresso personale», «App Op!», «principale», «inserita dall'HR»);
  - Note: se la giornata è stata corretta a mano, icona `fa-solid fa-pen` 11px blu con Tooltip «Inserita o corretta dall'ufficio del personale» (aria «Modificata dall'ufficio del personale») seguita dalla nota; senza nota «—» (vuoto se corretta);
  - Azioni: `fa-solid fa-pen` (Tooltip «Modifica», aria «Modifica timbratura»), `fa-solid fa-trash` (Tooltip «Elimina», aria «Elimina timbratura»), icone 16px `--color-primary`.
  - Vuoto: «Nessuna timbratura per i filtri impostati.»
- Piede: a sinistra «{n} timbratura|timbrature», al centro `Pagination` (10 righe per pagina).

### 4.6 Modale «Nuova timbratura» / «Modifica timbratura»
- `SelectField` name `dipendente`, label «Dipendente», obbligatorio, placeholder «Scegli il dipendente», opzioni «{cognome} {nome} · {reparto}» nell'ordine dell'anagrafica (id).
- Griglia 3 colonne: `DatePickerField` «Data»; `DatePickerField type="time"` «Ora»; `SelectField` «Tipo» («Entrata», «Uscita»).
- `SelectField` «Postazione»: le 4 postazioni standard più, se diversa, quella attuale della timbratura.
- `InputField` «Note (opzionale)», placeholder «Es. recupero, timbratura dimenticata…».
- Se la data è futura: hint rosso «La data è nel futuro: la timbratura comparirà nello storico da quel giorno.»
- Azioni: «Annulla» (secondary), primario «Aggiungi timbratura» / «Salva modifiche» (disabilitato se manca dipendente, data o ora).

### 4.7 Kiosk a schermo intero
- `role="dialog"`, `aria-label="Kiosk di timbratura"`. Sfondo `#204769`, testo bianco.
- Pulsante chiudi in alto a destra `fa-solid fa-xmark` (aria «Chiudi il kiosk»).
- Orologio «HH:MM»; data `it-IT` estesa (giorno della settimana, giorno, mese) con iniziale maiuscola, es. «Giovedì 5 novembre».
- QR grande su riquadro bianco (`alt="QR code di timbratura"`).
- «Inquadra il codice con l'**App Op!** per timbrare l'entrata o l'uscita».
- Barra di avanzamento oro che si svuota con i secondi rimanenti.
- «Il codice si rinnova tra {s}s · Esc per uscire».

## 5. Stati e interazioni

### 5.1 Stato iniziale
- Periodo dello storico: dal = al = oggi. Reparto, Tipo, Cerca vuoti; pagina 1.
- Orologio interno aggiornato **ogni secondo** (countdown QR, kiosk, avvisi, oggi).

### 5.2 QR del kiosk
- Finestra = `floor(epochSecondi / 60)`; scade tra = `60 − (epochSecondi mod 60)`.
- Token = `((finestra × 2654435761) >>> 0).toString(36).toUpperCase()` (mock deterministico).
- Testo codificato: `https://app.sibyllaop.it/timbra?p=principale&k={token}`.
- Generazione con la libreria `qrcode` (`toDataURL`): correzione errore **M**, margine 1, colori scuro `#1E293B` / chiaro `#FFFFFF`; larghezza 480px per il kiosk (mostrato a 176px in pagina), 240px per il QR app (mostrato a 136px). Rigenerato a ogni cambio di testo (ogni minuto).

### 5.3 Kiosk
- «Apri kiosk» → overlay a schermo intero. Chiusura con il pulsante X o con **Esc** (listener su `window`).
- Il QR e il countdown sono gli stessi della pagina; la barra ha larghezza `scadeTra / 60 × 100%`.

### 5.4 Copia e invito
- Copia indirizzo kiosk (`{origin}/kiosk?p=principale`) → toast success titolo «Copiato» testo «Indirizzo del kiosk copiato.»; copia link app (`https://app.sibyllaop.it/`) → «Link d'installazione copiato.»; errore clipboard → toast error titolo «Errore» testo «Copia non riuscita.».
- «Invia invito» → toast success titolo «Invito inviato», testo «Invito all'App Op! inviato a {nomi separati da " e "}.» (demo: «Invito all'App Op! inviato a Oscar e Chiara.»). Oggi nessun invio reale.

### 5.5 Timbratura con nome e cognome
- Cambiando la data si salva subito nello store (valori vuoti ignorati). `fuoriTermine = data < oggi` → hint rosso «Scaduta…».

### 5.6 Filtri, ordinamento e paginazione dello storico
- Righe = per ogni giorno dal `dal` al `min(al, oggi)` (al massimo 93 giorni), per ogni dipendente, ogni timbratura della giornata (le timbrature future non esistono ancora).
- Ordinamento: **più recenti prima** (data + ora decrescente).
- Filtri in AND: reparto uguale; verso uguale; testo contenuto in «{nome} {cognome}» (trim, case-insensitive).
- Ogni cambio di filtro riporta alla pagina 1. Pagine = max(1, ceil(n / 10)).
- Il DateRangeField ignora valori vuoti.

### 5.7 Nuova timbratura
1. «Nuova timbratura» → form: dipendente vuoto, data oggi, ora = ora attuale (HH:MM), tipo «Entrata», postazione «inserita dall'HR», note vuote.
2. «Aggiungi timbratura» → `{ id: 't'+timestamp, min, verso, postazione, note? }` aggiunta alle timbrature della giornata (dipendente, data). Da quel momento la giornata ha timbrature manuali e la presenza si ricalcola da esse.
3. Toast success titolo «Timbratura aggiunta», testo «{Entrata|Uscita} delle {HH:MM} di {nome} {cognome} registrata.». Modale chiusa.

### 5.8 Modifica
1. Matita → form precompilato (dipendente, data, ora, tipo, postazione, note), titolo «Modifica timbratura».
2. «Salva modifiche»:
   - stesso dipendente e stesso giorno: sostituisce la timbratura (stesso id);
   - dipendente o giorno cambiati: la toglie dalla giornata d'origine (che diventa manuale con la lista restante) e la aggiunge alla nuova giornata.
3. Toast success titolo «Timbratura modificata», testo «{Entrata|Uscita} delle {HH:MM} di {nome} {cognome} aggiornata.».

### 5.9 Eliminazione
- Cestino → ConfirmDialog: titolo «Elimina timbratura», messaggio «Eliminare l'{entrata|uscita} delle {HH:MM} del {gg/mm/aaaa} di {nome} {cognome}? La presenza della giornata verrà ricalcolata.», pulsante «Elimina» (danger), «Annulla».
- Confermato → rimossa dalla giornata (che diventa manuale), toast success titolo «Eliminata», testo «Timbratura eliminata.». Se rimane una timbratura spaiata la giornata diventa anomala nel Registro presenze.

### 5.10 Export
- File `timbrature_{dal}_{al}.xls` (tabella HTML apribile in Excel, vedi 00/`hrExport`), righe filtrate (tutte le pagine), colonne «Dipendente», «Reparto», «Tipo», «Data» (gg/mm/aaaa), «Ora», «Postazione», «Note». Toast success «{n} righe esportate in Excel.» titolo «Esportazione completata».

### 5.11 Caricamento ed errore
- Tutto calcolato localmente: nessuno stato di caricamento. Il QR mostra un riquadro vuoto finché `toDataURL` non risolve; se fallisce resta vuoto.

## 6. Dati e regole di business

### 6.1 Entità
- `Timbratura { id, min (minuti dalla mezzanotte), verso: 'entrata'|'uscita', postazione, note? }` per giornata `dipId|aaaa-mm-gg` (vedi 06 §6.1).
- `RigaTimbratura { key: '{dipId}|{iso}|{id}', dip, iso, t, manuale }` dove `manuale` = la giornata ha timbrature corrette a mano.
- Postazioni: «kiosk ingresso personale», «App Op!», «principale», «inserita dall'HR».

### 6.2 Dipendenti e app (demo)
- 12 dipendenti (`DIPENDENTI_PRESENZE`, vedi 06 §6.12 e 01).
- Senza App Op!: id **8** (Oscar Pettinari) e **11** (Chiara Ferri) → timbrano dal kiosk. Postazione di default: senza app → «kiosk ingresso personale»; id multiplo di 3 → «App Op!»; altri → «kiosk ingresso personale».
- `attivi` = dipendenti non in SENZA_APP; `daAttivare` = gli altri.
- `dallApp7gg` = numero di timbrature con postazione «App Op!» nelle giornate da oggi a 6 giorni fa, per tutti i dipendenti.

### 6.3 Avvisi di ritardo di oggi (mock)
Per ogni dipendente:
1. turno di oggi (`turnoPrevisto`: domenica nessuno; altrimenti 07:00 o 13:00 di inizio, vedi 06 §6.2) e ritardo (`(id·3 + giorno) mod 11 = 0` → `12 + (id mod 4)·6` minuti). Nessun turno o ritardo 0 → nessun avviso.
2. Escluso se oggi non ha presenza né timbrature e l'ora attuale è oltre l'inizio turno (è in ferie o assente).
3. `avvisatoAlle = inizioTurno − 12 − (id mod 4)·7` minuti; l'avviso compare solo da quell'ora in poi.
4. `previsto = inizioTurno + ritardo`; motivo = `["Traffico sulla statale", "Visita medica", "Sciopero dei mezzi", "Accompagno i figli a scuola", ""][id mod 5]`; entrata = prima timbratura di entrata di oggi, se c'è.
5. Classe Entrata: `entrata > previsto` → rosso, altrimenti verde.

### 6.4 Persistenza attuale
- Timbrature corrette e `timbraturaConNomeFino` (default oggi + 30 giorni) nello store `useRegistroPresenzeStore`, `localStorage['sibylla.registro-presenze']`, version 1 (06 §6.12).
- Avvisi, attivazioni app, QR e inviti sono **mock** calcolati nel browser.

## 7. Backend da realizzare

| Metodo e percorso | Uso | Esempio |
|---|---|---|
| `GET /Sibylla/hr/timbrature?dal=2026-11-01&al=2026-11-05&reparto=Cucina&verso=entrata&q=marco&page=1&pageSize=10` | storico | → `{ "totale": 37, "righe": [{ "id": "t1", "dipendenteId": 3, "data": "2026-11-05", "min": 422, "verso": "entrata", "postazione": "App Op!", "note": null, "manuale": false }] }` ordinate data+ora decrescente; mai timbrature future |
| `POST /Sibylla/hr/timbrature` | nuova (HR) | `{ "dipendenteId": 3, "data": "2026-11-05", "min": 425, "verso": "entrata", "postazione": "inserita dall'HR", "note": "timbratura dimenticata" }` → 201 timbratura; ricalcola la presenza del giorno |
| `PUT /Sibylla/hr/timbrature/{id}` | modifica, anche cambio giorno/dipendente | stesso body; **transazionale** (toglie dall'origine e aggiunge alla destinazione) |
| `DELETE /Sibylla/hr/timbrature/{id}` | elimina | 204; ricalcola la presenza |
| `GET /Sibylla/hr/timbrature/export.xls?…filtri` | export (opzionale) | stesse colonne del §5.10 |
| `GET /Sibylla/hr/kiosk/token?postazione=principale` | QR del kiosk | → `{ "token": "…", "scade": "2026-11-05T09:01:00Z", "url": "https://app.sibyllaop.it/timbra?p=principale&k=…" }`; token firmato dal server, valido 60 s |
| `POST /Sibylla/app/timbra` | timbratura dall'App Op! | `{ "token": "…", "postazione": "principale" }` (dipendente dall'autenticazione dell'app) → `{ "verso": "entrata", "min": 422 }`; il verso lo decide il server (opposto dell'ultima della giornata); 410 token scaduto |
| `POST /Sibylla/app/timbra-con-nome` | timbratura con nome e cognome | ammessa solo se oggi ≤ `timbraturaConNomeFino`, altrimenti 403 |
| `GET/PUT /Sibylla/hr/timbrature/impostazioni` | data «con nome e cognome fino al» | `{ "timbraturaConNomeFino": "2026-12-05" }` |
| `GET /Sibylla/hr/timbrature/avvisi-ritardo?data=2026-11-05` | avvisi di oggi | → `[{ "dipendenteId": 7, "turno": 420, "previsto": 450, "motivo": "Visita medica", "avvisatoAlle": 401, "entrata": 455 }]` (inviati dal dipendente dall'App Op!) |
| `GET /Sibylla/hr/app/stato` | stato attivazioni | → `{ "attivi": [1,2,…], "daAttivare": [8,11], "timbratureApp7gg": 84 }` |
| `POST /Sibylla/hr/app/inviti` | «Invia invito» | `{ "dipendenti": [8, 11] }` → invia email/SMS d'invito all'App Op! |
| pagina pubblica `/kiosk?p=principale` | kiosk su tablet | mostra orologio, QR a rotazione e countdown come §4.7 |

Le correzioni manuali vanno storicizzate (autore, prima/dopo). L'avviso di ritardo nasce in App Op! e può generare una notifica nel Centro notifiche per l'HR (oggi non implementato).

## 8. Stile

Token tema chiaro: `--color-primary` #204769, `--color-primary-100` #e6eaee, `--color-text-active` #4A4D53, `--color-text-inactive` #6E7175, `--color-border` #CFD4DA, `--color-bg` #F8FCFF, `--color-surface` #FFFFFF, `--color-success` #007035, `--color-error` #FF616E, `--color-warning` #F57D03, `--radius-md` 6px, `--font-heading` Poppins.

- `.tmb__card-title`: flex gap 9px, margin 0, heading 14px 700 text-active; icona primary 15px.
- `.tmb__card-head--tools`: `justify-content: space-between`.
- `.tmb__qr`: colonna centrata gap 8px; `img` e placeholder 176×176, padding 8px, bordo 1px border, radius 6px, sfondo **#FFFFFF fisso** (anche in dark); `--sm` 136×136.
- `.tmb__qr-scade`: 12px 700 primary tabular; `--warn` error. `.tmb__qr-note`: 11px text-inactive.
- `.tmb__how`: colonna gap 8px, min-width 0. `.tmb__how-title`: heading 13px 700 text-active.
- `.tmb__steps`: padding-left 18px, decimal, colonna gap 5px, 12.5px text-active; `--muted` 11.5px text-inactive.
- `.tmb__hint`: 11.5px text-inactive; `--warn` error.
- `.tmb__url`: flex centrato gap 8px; l'ultimo `.tmb__url` della colonna ha `margin-top:auto`. Label 11px text-inactive. `.tmb__code`: padding 2px 8px, radius 4px, sfondo `--color-bg`, 11.5px text-active.
- `.tmb__app-stat`: 13px text-active, `b` primary.
- `.tmb__attivare`: flex wrap gap 6px 12px text-inactive. `.tmb__pill`: 12px 600 text-active; dal secondo in poi prefisso `·` (margin-right 6px, text-inactive). `.tmb__invita` icona mr 6px.
- `.tmb__nome`: colonna gap 4px, max-width 340px.
- Icone pulsante `.tmb__ico.sib-btn--icon i`: primary 16px.
- Tabelle: `table-layout:fixed; width:100%`. Larghezze: `c-dip` 26%, `c-motivo` 24%, `c-tipo` 13%, `c-ora` 17%, `c-post` 18%, `c-az` 10%. `.tmb__az` centrato nowrap.
- `.tmb__num` tabular-nums; `.tmb__muted` text-inactive; `.tmb__ritardo` ml 4px 11px 700 warning; `.tmb__late` 700 error; `.tmb__ok` 700 success; `.tmb__mod` mr 6px 11px primary.
- Persona: flex gap 10px; avatar 30×30 tondo, sfondo primary-100, testo primary 11px 700; nome 600 text-active (ellipsis); reparto 11px text-inactive gap 5px, icona 10px primary.
- `.tmb__verso` inline-flex gap 7px 12px 600; entrata success, uscita primary.
- Vuoti (`.tmb__empty`, `.tmb__empty-card`): padding 22px 16px, centrato, 13px text-inactive.
- `.tmb__filters`: flex wrap, align end, gap 12px, padding 12px 16px, bordo inferiore. `.tmb__field` 190px, `--sm` 170px. `.tmb__search` margin-left auto, 240px.
- `.tmb__pager`: relative, flex centrato, padding 10px 16px, bordo superiore. `.tmb__count`: absolute left 16px, centrato verticalmente, 12px text-inactive.
- Modale `.tmb-form`: colonna gap 14px; griglia 3 colonne gap 12px; azioni end gap 10px padding-top 14px bordo superiore.
- Kiosk `.tmb-kiosk`: fixed inset 0, z 1000, colonna centrata gap 14px, sfondo `#204769`, testo `#FFFFFF` (fissi, non a token).
  - `__close`: absolute top 20px right 24px, 42×42 tondo, bordo 1px rgba(255,255,255,.35), trasparente, bianco 18px; hover sfondo rgba(255,255,255,.12).
  - `__clock`: heading 64px 700 line-height 1 tabular. `__date`: 18px opacity .8, first-letter maiuscola.
  - `__qr`: margin-top 12px, padding 18px, radius 18px, sfondo bianco; img `min(46vh, 420px)` quadrata.
  - `__msg`: margin-top 6px, 20px.
  - `__bar`: larghezza `min(46vh, 420px)`, alt. 6px, radius 3px, sfondo rgba(255,255,255,.2), overflow hidden; `__bar-fill` larghezza `--p`, sfondo `#A2864C` (oro).
  - `__scade`: 13px opacity .7.
- Tema scuro: card, testi, bordi e badge seguono i token; restano fissi il fondo bianco dei QR e i colori del kiosk.

## 9. Responsività

- **Container query `tmb` (max-width: 1080px)**: le due card superiori vanno una sotto l'altra (`grid-template-columns: minmax(0, 1fr)`); la ricerca dello storico perde `margin-left:auto` e va a capo con gli altri filtri.
- Filtri dello storico sempre `flex-wrap: wrap`.
- Tabelle a colonne percentuali, `table-layout:fixed`, testi lunghi con `TruncatedText` (ellipsis + tooltip): nessuno scroll orizzontale a nessuna larghezza.
- Laptop 1366 px con sidebar aperta: card superiori impilate se il contenuto è sotto 1080 px; 1920 px: affiancate.
- Kiosk: QR e barra dimensionati su `min(46vh, 420px)`, quindi si adattano all'altezza dello schermo.

## 10. Effetti e animazioni

- Countdown aggiornato ogni secondo; QR rigenerato ogni 60 s (sostituzione istantanea).
- Barra del kiosk: `transition: width 1s linear` (si svuota in modo continuo; al rinnovo torna piena con la stessa transizione).
- Countdown in pagina diventa rosso negli ultimi 10 secondi.
- Hover del pulsante chiudi kiosk: sfondo bianco al 12%.
- Nessuna animazione d'ingresso; nessuna regola `prefers-reduced-motion` specifica.

## 11. Accessibilità

- Pulsanti a sola icona con `aria-label` (copia indirizzo, copia link, esporta, modifica, elimina, chiudi kiosk) e Tooltip scuro.
- Immagini QR con `alt` descrittivo.
- Kiosk `role="dialog"` con `aria-label="Kiosk di timbratura"`; Esc chiude.
- Icona «modificata» con `aria-label`; icone decorative `aria-hidden`.
- Il campo Dipendente della modale è `required`.

## 12. Criteri di accettazione

1. La pagina mostra in alto due card affiancate «QR code timbratura» e «App dipendenti» e, sotto, «Avvisi di ritardo di oggi (n)» e «Storico timbrature».
2. Il QR del kiosk cambia allo scoccare di ogni minuto e il testo «Si rinnova tra {s}s» scende di un secondo alla volta; negli ultimi 10 secondi è rosso.
3. Il QR codifica `https://app.sibyllaop.it/timbra?p=principale&k={token}` con token diverso per ogni minuto.
4. «Apri kiosk» apre la schermata blu a tutto schermo con orologio, data con iniziale maiuscola, QR, barra oro e «Il codice si rinnova tra {s}s · Esc per uscire»; Esc o X la chiudono.
5. Il pulsante copia accanto a «/kiosk?p=principale» copia `{origin}/kiosk?p=principale` e mostra il toast «Copiato» / «Indirizzo del kiosk copiato.».
6. La card App dipendenti dice «10 di 12 dipendenti hanno attivato l'App Op!», elenca «Oscar Pettinari · Chiara Ferri» e «Invia invito» mostra «Invito all'App Op! inviato a Oscar e Chiara.».
7. Impostando «Timbratura con nome e cognome consentita fino al» a ieri, l'hint diventa rosso «Scaduta: ora si timbra solo inquadrando il QR del kiosk.»; il valore resta dopo il ricaricamento.
8. Lo storico, all'apertura, contiene solo le timbrature di oggi fino all'ora attuale, dalla più recente; il contatore in basso a sinistra riporta il totale e la paginazione centrata ha 10 righe per pagina.
9. Filtrando Tipo «Uscite» e Reparto «Cucina» restano solo uscite di dipendenti di Cucina e la pagina torna alla 1.
10. Con un periodo che include giorni futuri non compaiono timbrature dopo oggi.
11. «Nuova timbratura» con dipendente, data e ora aggiunge la riga, mostra «Timbratura aggiunta» / «Entrata delle HH:MM di Nome Cognome registrata.» e nella colonna Note compare la matita «Inserita o corretta dall'ufficio del personale».
12. Il pulsante «Aggiungi timbratura» è disabilitato finché non si sceglie il dipendente.
13. Modificando una timbratura e spostandola su un altro giorno, sparisce dal giorno d'origine e compare nel nuovo; il toast dice «Timbratura modificata».
14. L'eliminazione chiede conferma con il testo esatto del §5.9; confermata, il toast dice «Eliminata» / «Timbratura eliminata.» e nel Registro presenze la giornata si ricalcola (anomala se resta un'entrata spaiata).
15. «Esporta in Excel» scarica `timbrature_{dal}_{al}.xls` con tutte le righe filtrate e le 7 colonne indicate; è disabilitato con zero righe.
16. Sotto 1080 px di larghezza della pagina le due card superiori si impilano e la ricerca va a capo; nessuna tabella scorre in orizzontale.
17. Gli avvisi di ritardo mostrano «+{min}'» arancio accanto all'arrivo previsto e l'entrata in rosso se oltre l'arrivo previsto, in verde altrimenti, «Non ancora entrato» se manca.

## 13. File sorgente

- `src/modules/hr/Timbrature/Timbrature.tsx`
- `src/modules/hr/Timbrature/Timbrature.sass`
- `src/modules/hr/_presenze/ModaleTimbrature.tsx` (`POSTAZIONI`)
- `src/modules/hr/_presenze/presenze.model.ts`
- `src/modules/hr/hrExport.ts`
- `src/store/useRegistroPresenzeStore.ts`
- `src/store/useHrGestioneStore.ts` (`REPARTI_HR`, `DIPENDENTI_HR`)
- `src/core/components/PageHead.tsx`
- `src/styles/_themes.sass`, `src/styles/_colors.sass`, `src/styles/_spacing.sass`
- `src/navigation/menu.ts`, `src/core/icons/MenuIco.tsx`, `src/router/PageContent.tsx`, `src/navigation/pageSubtitles.ts`
