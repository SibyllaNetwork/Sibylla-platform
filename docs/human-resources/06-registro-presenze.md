# 06 · Registro presenze

> Scheda di riproduzione della pagina `registro-presenze`. Componenti condivisi (PageHead, Modal, Tooltip, AlertBanner, Toast, ConfirmDialog, campi form, `sib-btn`, `sib-table`) e regole UI globali: vedi `00-fondamenta.md`. Entità e store trasversali (anagrafica `DIPENDENTI_HR`, richieste di assenza, configurazione HR): vedi `01-modello-dati-e-api.md`. Qui è descritto tutto ciò che è specifico della pagina e dei suoi pezzi condivisi con Timbrature (07) e Cedolini (08): modello delle presenze, vista mensile `RegistroMensile`, modale timbrature, export Excel/PDF, tracciato RILPRE.

---

## 1. Scopo e utenti

Pagina dell'**ufficio del personale** (responsabile HR della struttura) per controllare e correggere le presenze del personale:

- **vista Giornaliera**: per un giorno, una riga per dipendente con la timeline 24 h (presente, pausa, permesso, ferie, assenza);
- **vista Dettagliata**: per un mese, un riquadro per dipendente con tipo di giornata, ingresso, uscita, ore extra e totali; tasto destro su un giorno per cambiarne il tipo, gestire le timbrature o eliminarne l'assegnazione;
- export del mese in **Excel (.xlsx vero, con stili)** e **PDF** (calendario presenze da firmare);
- **Trasmetti consuntivo**: invio del consuntivo del mese al software paghe (per TeamSystem genera il file **RILPRE**).

Presenze e timbrature sono **le stesse** lette da Timbrature (07) e Cedolini (08) e sono incrociate con le richieste **approvate** in Human resources › Richieste (ferie, malattia, ROL, permessi compaiono da sole). I dipendenti non usano questa pagina: timbrano dall'App Op! o dal kiosk.

## 2. Accesso

- **id pagina / route**: `registro-presenze` (router: `if (page === 'registro-presenze') return <RegistroPresenze navigate={navigate}/>`).
- **Sidenav**: «Human Resources» (colore sezione `#9B59B6`) › «Gestione delle presenze» › «Registro presenze». Icona menu: `fa-clock`. La stessa voce esiste identica nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: Human Resources › Gestione delle presenze › Registro presenze.
- **Altre entrate**: Home (timone) › scorciatoia «Registro presenze» (icona `clock`).
- **Uscite**:
  - link «Cambia» / «Configura l'integrazione paghe» nella modale Trasmetti consuntivo → `navigate('hr-configurazione:hr-integrazione-paghe')` (deep link al pannello «Integrazione paghe» del Configuratore HR);
  - link «Correggi nel registro» → chiude la modale e passa alla vista Dettagliata (stessa pagina).
- PageHead **senza** `onBack` esplicito: il pulsante Indietro ha il comportamento di default del componente (vedi 00).

## 3. Layout

### 3.1 Vista Giornaliera

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]              Registro presenze                                           │
│              Gestione delle presenze del personale in tempo reale. Con …              │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ [AlertBanner success — solo per 3 s dopo un salvataggio]                              │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ Data      Struttura   Reparto          Cerca                 ┌‹ Giovedì 5 novembre 2026 ›┐ Oggi (i) [✈ Trasmetti consuntivo] │
│ [150px]   [150px]     [170px]          [200px]               └──────── 34px ──────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                   [ ▦ Giornaliera | ▦ Dettagliata ]   │ ← riga selettore, allineata a destra
├──────────────┬──────┬─────────────────────────────────────────────────────────────────┤
│ Nome         │Reparto│00:00 01:00 02:00 … 23:00 (24 colonne uguali)                    │ ← header 12px, bg canvas
├──────────────┼──────┼─────────────────────────────────────────────────────────────────┤
│ (AG) Andrea… ⎘│  🛎  │ ░░░░░░▌Presente▐▌Pausa▐▌Presente ░░░░░░░░░░░░ (36px, 96 tacche) │ ← riga ≥ 64px
│           ✎  │      │                                                                 │
├──────────────┼──────┼─────────────────────────────────────────────────────────────────┤
│ …            │      │                                                                 │
└──────────────┴──────┴─────────────────────────────────────────────────────────────────┘
```

- Root pagina: un `<div>` senza classe (nessun padding proprio; padding del contenitore app, vedi 00).
- **Toolbar** `.reg-presenze__toolbar`: `display:flex; align-items:flex-end; gap:10px; margin-bottom:14px`, nessun wrap (riga unica); ogni figlio `min-width:0`; è un container `reg-toolbar` (inline-size). A sinistra i campi (larghezze fisse), a destra il gruppo `.reg-presenze__tools` (`flex:none; display:flex; align-items:center; gap:8px; margin-left:auto`).
- **Riga selettore vista** `.reg-presenze__vista-row`: `display:flex; justify-content:flex-end; margin-bottom:10px`.
- **Tabella timeline**: contenitore `bg-white border border-line rounded-field overflow-hidden` (sfondo `--color-surface` #FFFFFF, bordo 1px `--color-border` #CFD4DA, radius 6px).
  - Header: `display:grid; grid-template-columns: 220px 72px 1fr; align-items:center`, font 12px, weight 600, colore `--color-text-inactive` (#6E7175), sfondo `--color-bg` (#F8FCFF), padding 10px 16px. La terza colonna è a sua volta una griglia `repeat(24, 1fr)` con le etichette ore (11px, centrate).
  - Riga dipendente: stessa griglia `220px 72px 1fr`, `min-height:64px`, padding 12px 16px, `border-top:1px solid --color-border`.

### 3.2 Vista Dettagliata

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ PageHead                                                                              │
│ Struttura  Reparto   Cerca              ┌‹ Novembre 2026 ›┐ Oggi [xls] [pdf] [✈ Trasmetti consuntivo] │
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ● Ordinarie ● Straordinario ● Riposo ● Ferie ● ROL ● Permesso ● Malattia ● Assente     │
│ ● Anomalia                      ✎ Modificato dall'HR   [ Giornaliera | Dettagliata ]  │ ← legenda + selettore a destra
├───────────────────────────────────────────────────────────────────────────────────────┤
│ ┌ riquadro dipendente ────────────────────────────────────────────────────────────┐   │
│ │ (AG) Andrea Grimaudo   🛎 Front office                                          │   │ ← header 10px 14px
│ ├─────────┬──┬──┬──┬── … ──┬──┬────────┤                                          │   │
│ │ Giorno  │ 1│ 2│ 3│  …    │30│ Totale │  ← thead, bg canvas (oggi: cella piena primary)│
│ │ G. sett.│ D│ L│ M│  …    │ L│        │                                          │   │
│ │ Tipo    │RIP│ORD│O+S│ … │  │        │  ← chip colorati (26px)                  │   │
│ │ Ingresso│  │07:02│ …     │  │        │  ← verde                                 │   │
│ │ Uscita  │  │16:03│ …     │  │        │  ← rosso                                 │   │
│ │ Ore extra│ │  │1h 15'│   │  │ 2h 30' │  ← viola                                 │   │
│ ├─────────┴──┴──┴──┴── … ──┴──┴────────┤                                          │   │
│ │ 160,0h Ordinarie  2h 30' Ore extra  2 gg Ferie …      Tasto destro su un giorno … │ ← footer bg canvas
│ └─────────────────────────────────────────────────────────────────────────────────┘   │
│ ┌ riquadro dipendente … ┐                                                            │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

- In Dettagliata il campo **Data** sparisce; restano Struttura, Reparto, Cerca.
- Il selettore di vista non ha più una riga propria: è passato come `legendaExtra` a `RegistroMensile` e sta in fondo a destra della legenda.
- `RegistroMensile` (`.rpm`): `container: rpm / inline-size; display:flex; flex-direction:column; gap:14px`. Un `<section class="rpm__card">` per dipendente.

### 3.3 Modali e popover

| Elemento | Tipo | Dimensione |
|---|---|---|
| Modifica presenza | Modal `size="md"` | contenuto `.presenza-edit` (colonna, gap 16px) |
| Timbrature del giorno | Modal `size="lg"` (`ModaleTimbrature`) | `.rpt` (colonna, gap 14px) |
| Trasmetti consuntivo | Modal `size="lg"` | `.tcs` (colonna, gap 14px) |
| Conferma eliminazione | ConfirmDialog (useConfirmStore) | standard |
| Menu contestuale giorno | `position:fixed`, `role="menu"` | larghezza 290px |
| Legenda (Giornaliera) | popover hover/focus | min-width 200px |
| Contatti dipendente | tooltip `position:fixed` | 240–340px |

## 4. Elementi e testi

### 4.1 PageHead
- Titolo: «Registro presenze»
- Sottotitolo: «Gestione delle presenze del personale in tempo reale. Con tracciamento di ingressi, uscite, assenze, permessi e ferie»
- Nessuna azione nel PageHead.

### 4.2 Toolbar

| Controllo | Componente | Props / testi | Larghezza |
|---|---|---|---|
| Data (solo Giornaliera) | `DatePickerField` | name `data`, label «Data», valore `aaaa-mm-gg` | 150px (`.reg-presenze__f-data`) |
| Struttura | `SelectField` | name `struttura`, label «Struttura», opzioni = strutture del cliente corrente (`useStrutturaPagina`, default la struttura selezionata in topbar) | 150px → 128px |
| Reparto | `SelectField` | name `reparto`, label «Reparto»; prima opzione «Tutti i reparti», poi i reparti distinti dei dipendenti caricati, nell'ordine in cui compaiono | 170px → 140px |
| Cerca | `InputField` | name `ricerca`, label «Cerca», placeholder «Cerca dipendente» | 200px → 150px |
| Periodo | `.reg-presenze__periodo` | `‹` / etichetta / `›` | auto |
| ‹ | `button.reg-presenze__per-btn` | icona `fa-solid fa-chevron-left`; Tooltip + aria-label «Giorno precedente» (Giornaliera) / «Mese precedente» (Dettagliata) | 32×32 |
| etichetta | `span.reg-presenze__per-label` | Giornaliera: `«{giorno settimana} {g} {mese} {aaaa}»` tutto minuscolo con prima lettera maiuscola via CSS, es. «Giovedì 5 novembre 2026»; Dettagliata: «Novembre 2026» | min 128px → 110px |
| › | idem | `fa-solid fa-chevron-right`; «Giorno successivo» / «Mese successivo» | 32×32 |
| Oggi | `button.sib-btn.sib-btn--ghost.reg-presenze__oggi` | «Oggi» | padding-inline 8px |
| Excel (solo Dettagliata) | `button.reg-presenze__icon-btn` | icona `fa-regular fa-file-xls`; Tooltip + aria-label «Registro Excel del mese»; disabilitato se nessun dipendente filtrato | 34×34 |
| PDF (solo Dettagliata) | `button.reg-presenze__icon-btn` | icona `fa-regular fa-file-pdf` (durante la generazione `fa-regular fa-spinner fa-spin`); Tooltip + aria-label «PDF del calendario presenze»; disabilitato se nessun dipendente o export in corso | 34×34 |
| Legenda (solo Giornaliera) | `button.sib-btn.sib-btn--icon` aria-label «Legenda» | icona `fa-regular fa-circle-info` (16px, `--color-primary`); popover con titolo «Legenda» e 5 voci: «Presente», «Pausa», «Permesso», «Ferie», «Assenza» | — |
| Trasmetti consuntivo | `button.sib-btn.sib-btn--primary.reg-presenze__export` | icona `fa-solid fa-paper-plane` (margin-right 6px) + «Trasmetti consuntivo» | auto |

Giorni settimana usati: «domenica, lunedì, martedì, mercoledì, giovedì, venerdì, sabato»; mesi: «Gennaio … Dicembre» (`MESI_LUNGHI`, minuscoli nell'intestazione del giorno).

### 4.3 Selettore di vista (`VistaSwitch`, componente condiviso `src/core/components/VistaSwitch`)
- `role="radiogroup"`, `aria-label="Vista del registro"`.
- Opzioni: «Giornaliera» (icona `fa-solid fa-chart-gantt`), «Dettagliata» (icona `fa-solid fa-calendar-days`). Nessun `hint`.
- Ogni opzione è `button role="radio" aria-checked`. Struttura: `span.vsw__ico > i` + `span.vsw__txt > span.vsw__label` (+ `span.vsw__hint` se c'è hint).

### 4.4 Timeline giornaliera — celle

| Colonna | Contenuto |
|---|---|
| Nome | Avatar 32×32 tondo (immagine se `avatar`, altrimenti iniziali `{nome[0]}{cognome[0]}` 11px bold `--color-primary` su `--color-primary-100` #e6eaee); nome «{nome} {cognome}» 13px semibold `--color-text-active` (#4A4D53), ellipsis. A destra, impilate in colonna (gap 6px), due icone azione: `fa-solid fa-file-xls` (title/aria «Esporta XLS») e `fa-solid fa-pen` (title/aria «Modifica»). Hover sul blocco avatar+nome → tooltip contatti. |
| Reparto | Solo icona del reparto 20px `--color-primary`, `title`/`aria-label` = nome reparto. Mappa: Front office/Front Office → `fa-bell-concierge`; F&B → `fa-martini-glass`; Cucina → `fa-kitchen-set`; Housekeeping/Pulizie → `fa-broom`; Manutenzione → `fa-wrench`; Amministrazione → `fa-briefcase`; altro → `fa-user`. |
| Timeline | Barra 36px su `--color-bg`, radius 4px, 96 tacche (quarti d'ora) e i segmenti della giornata. |

Ogni riga ha `title="Tasto destro per modificare la presenza"` (tooltip nativo).

Segmenti (`COLORI_TIPO`, colori fissi non a token):

| tipo | etichetta | sfondo (hex + alpha 26 ≈ 15%) | bordo sinistro 3px e testo |
|---|---|---|---|
| presente | «Presente» | `#5A8A3C26` | `#5A8A3C` |
| pausa | «Pausa» | `#F5C40026` | `#F5C400` |
| permesso | «Permesso» | `#5C9CD426` | `#5C9CD4` |
| ferie | «Ferie» | `#9B59B626` | `#9B59B6` |
| assenza | «Assenza» | `#FF616E26` | `#FF616E` |

Posizione: `left = start_min / 1440 × 100%`, `width = (end_min − start_min) / 1440 × 100%`, `top/bottom: 6px`, radius 2px. Etichetta interna 10px semibold, padding 2px 6px, ellipsis. Tooltip nativo `title`: «{etichetta}» oppure «{etichetta} — {note}».

Tooltip contatti (`role="tooltip"`, posizionato in `fixed` sotto il blocco nome: `left = rect.left`, `top = rect.bottom + 8px`):
- titolo «{nome} {cognome}»;
- righe con icona `fa-light fa-envelope` / `fa-light fa-phone` / `fa-light fa-location-dot` e valore (email, telefono, indirizzo) o «—» se assente.

Stato vuoto: «Nessun dipendente per i filtri selezionati.» (padding 40px 16px, centrato, 13px, `--color-text-inactive`).

### 4.5 Vista Dettagliata (`RegistroMensile`, variante `registro`)

**Legenda** (`.rpm__legend`, `aria-label="Legenda"`): pallino 8px + testo per ogni voce di `LEGENDA` nell'ordine: «Ordinarie», «Straordinario», «Riposo», «Ferie», «ROL», «Permesso», «Malattia», «Assente», poi «Anomalia» (con Tooltip «Timbratura anomala»). In fondo a destra (`.rpm__legend-end`): `fa-solid fa-pen` + «Modificato dall'HR» e il VistaSwitch.

**Riquadro dipendente** (`section.rpm__card`):
- header: avatar 30px (iniziali come sopra), nome «{nome} {cognome}» (font heading 14px 700), reparto con icona (`fa-solid {icona reparto}` + nome reparto, 12px).
- matrice `table.rpm__grid` (`table-layout:fixed`), colgroup: etichette 92px, un `col` per ogni giorno del mese (28–31, larghezza uguale), Totale 48px.
  - `thead` riga 1: `th scope=row` «Giorno», numeri del giorno (festività con Tooltip col nome della festa e numero in `--color-error`), «Totale».
  - `thead` riga 2 (`.rpm__r-gsett`): «G. sett.», lettere `D L M M G V S`.
  - `tbody` righe: «Tipo», «Ingresso», «Uscita», «Ore extra» (etichetta Ore extra in `--chart-7`).
  - cella **Tipo**: chip con la sigla (vedi tabella codici) e, se la giornata è stata modificata dall'HR, un bollino `fa-solid fa-pen` nell'angolo (`aria-label="modificato dall'ufficio del personale"`). Hover → Tooltip ricco: riga 1 in grassetto la descrizione della giornata; poi nome festività se c'è; poi «{HH:MM} – {HH:MM} · {Xh YYm} lavorate» se ingresso e uscita esistono; poi «Modificato dall'ufficio del personale» (opacity .8) se modificata.
  - cella **Ingresso**: «HH:MM» in `--color-success` (#007035); **Uscita**: «HH:MM» in `--color-error` (#FF616E); **Ore extra**: minuti oltre le 8 h in formato `fmtExtra` («45'», «1h», «1h 15'»), viola `--chart-7`, bold; colonna Totale della riga Ore extra = somma del mese.
- footer (`.rpm__foot`): totali (vedi §6.6) a sinistra, hint a destra: «Tasto destro su un giorno per modificarlo · doppio clic per le timbrature».

Stato vuoto: riquadro «Nessun dipendente per i filtri selezionati.».

**Menu contestuale** (tasto destro su una cella di giorno nel `tbody`):
- titolo (maiuscolo via CSS): «{nome} {cognome} · {g} {mese breve} {aaaa}» con mese breve `gen feb mar apr mag giu lug ago set ott nov dic`;
- gruppo 1 (tipo di giornata, ciascuno con pallino colorato, etichetta, nota grigia, e `fa-solid fa-check` a destra se è il tipo attuale; etichetta in bold se attivo):

| azione | etichetta | nota | attivo se codice ∈ | pallino |
|---|---|---|---|---|
| presente | «Presente» | se attivo e con ingresso/uscita «HH:MM – HH:MM», altrimenti «09:00 – 18:00» | ORD, STR, O+P, ANO | `--chart-1` |
| ferie | «Ferie» | — | FER | `--chart-8` |
| rol | «ROL» | «a ore» | ROL | `--chart-5` |
| permesso | «Permesso» | «a ore» | PER | `--chart-4` |
| malattia | «Malattia» | «con codice PUC» | MAL | `--chart-3` |
| assente | «Assente» | «nessuna giustifica» | ASS | `--chart-6` |

- gruppo 2: `fa-regular fa-clock` «Gestisci timbrature del giorno»; `fa-regular fa-pen-to-square` «Modifica presenza…» (colore `--color-primary`);
- gruppo 3: `fa-regular fa-trash` «Elimina assegnazione» (colore `--color-error`), disabilitato se la giornata è vuota (VUO).

### 4.6 Modale «Modifica presenza»
- Titolo: «Modifica presenza — {nome} {cognome}».
- Sottotitolo `.presenza-edit__giorno`: data estesa con iniziale maiuscola, es. «Giovedì 5 novembre 2026».
- Sezione orario (visibile se tipo vuoto, ROL, Permesso o Straordinario):
  - label: «Orario» (vuoto/Straordinario), «Permesso ROL — finestra di assenza» (ROL), «Permesso — finestra di assenza» (Permesso);
  - due `DatePickerField type="time"` affiancati (griglia 1fr 1fr gap 12px): «Entrata» / «Uscita», oppure «Dalle» / «Alle» per ROL e Permesso;
  - per ROL/Permesso, hint con `fa-light fa-circle-info`: «Il ROL si inserisce nella giornata di presenza: il dipendente resta presente e risulta assente solo nella finestra indicata.» (con «Il permesso» al posto di «Il ROL» per Permesso).
- Sezione «Permesso / assenza»: 6 card-pulsante in griglia 3 colonne (icona `fa-light`, titolo, sottotitolo):

| valore | icona | titolo | sottotitolo |
|---|---|---|---|
| ferie | `fa-sun` | «Ferie» | «Uno o più giorni» |
| rol | `fa-clock` | «ROL» | «Permesso retribuito a ore» |
| permesso | `fa-hourglass-half` | «Permesso» | «Assenza a ore» |
| malattia | `fa-circle-exclamation` (rossa) | «Assenza per malattia» | «Uno o più giorni» |
| assente | `fa-user-slash` | «Assente» | «Nessuna giustifica» |
| straordinario | `fa-triangle-exclamation` | «Straordinario» | «Orario oltre il turno» |

- Se Ferie / Malattia / Assente: `DateRangeField` (range picker standard, vedi 00) label «Periodo», nomi `dal`/`al`.
- Se Malattia: `InputField` name `puc`, label «Codice PUC — Protocollo Univoco del Certificato (9–10 cifre)», placeholder «Es. 1234567890»; hint `fa-light fa-circle-info` «Il codice PUC verrà comunicato direttamente all'HR e non sarà visibile ai colleghi.»; errore «Il codice PUC deve avere 9–10 cifre».
- Sempre: `InputField` name `note`, label «Note (opzionale)», placeholder «Aggiungi una nota…».
- Azioni: «Annulla» (`sib-btn--secondary`), «Salva modifiche» (`sib-btn--primary`).

### 4.7 Modale «Timbrature del giorno» (`ModaleTimbrature`, condivisa)
- Titolo: «Timbrature di {nome} {cognome}»; sottotitolo (`.rpt__sub`): data estesa in minuscolo, es. «giovedì 5 novembre 2026».
- Riquadro form (`.rpt__form`, sfondo `--color-bg`): titolo «Aggiungi timbratura» / «Modifica timbratura»; griglia 3 colonne:
  - `DatePickerField type="time"` name `ora` label «Ora»;
  - `SelectField` name `verso` label «Tipo», opzioni «Entrata» / «Uscita»;
  - `SelectField` name `postazione` label «Postazione», opzioni: «kiosk ingresso personale», «App Op!», «principale», «inserita dall'HR»;
  - sotto: `InputField` name `note` label «Note (opzionale)» placeholder «Es. recupero, timbratura dimenticata…»;
  - azioni: «Annulla modifica» (`sib-btn--ghost`, solo in modifica) e primario `fa-solid fa-plus` «Aggiungi» oppure `fa-solid fa-check` «Salva timbratura» (disabilitato se l'ora è vuota).
- Avviso anomalia (`role="status"`, icona `fa-solid fa-triangle-exclamation`): «Le timbrature non sono accoppiate: manca un'entrata o un'uscita. La giornata resta segnata come anomala finché non la correggi.»
- Tabella `.sib-table` (table-layout fixed): colonne «Ora» (14%), «Tipo» (20%), «Postazione» (24%), «Note» (resto), «Azioni» (16%, centrata).
  - Ora bold tabular; Tipo: `fa-solid fa-right-to-bracket` «Entrata» (verde `--color-success`) o `fa-solid fa-right-from-bracket` «Uscita» (`--color-primary`), 12px 600; Postazione e Note con `TruncatedText` (note vuote → «—»); azioni `fa-solid fa-pen` (Tooltip «Modifica», aria «Modifica timbratura»), `fa-solid fa-trash` (Tooltip «Elimina», aria «Elimina timbratura»).
  - Riga in modifica evidenziata (`--color-primary-50`).
  - Vuoto: «Nessuna timbratura per questa giornata.»
- Footer: «Chiudi» (`sib-btn--secondary`).

### 4.8 Modale «Trasmetti consuntivo»
- Titolo: «Trasmetti consuntivo — {Mese} {aaaa}» (mese della data mostrata dalla pagina, anche in vista Giornaliera).
- Lead: «Il consuntivo del mese di tutto il personale arriva al software paghe per l'elaborazione dei cedolini, giorno per giorno: presenze, straordinario, ferie, permessi e ROL, malattia e assenze.»
- Destinazione (se c'è un software in uso): icona del canale (`fa-solid fa-plug` API, `fa-solid fa-server` SFTP, `fa-solid fa-envelope` email) + «Destinazione: **{software}** · {destinazione}» + « · {formato}» se il canale non è API + link «Cambia».
  - `{software}` = «{produttore} {nome}» (es. «Zucchetti Paghe Project / Infinity HR», «TeamSystem Paghe / HR Lynfa Studio»).
  - `{destinazione}`: email → «email a {emailConsulente || 'consulente'}»; sftp → «file su {sftpHost || 'SFTP'}»; api → «collegamento diretto».
- Senza software: avviso rosso `fa-solid fa-plug-circle-xmark` «Nessun software paghe collegato.» + link «Configura l'integrazione paghe».
- Riquadro file (solo TeamSystem): `fa-solid fa-file-code` «File **RILPRE** · tracciato {standard | RP / Teamtime} · {N} record da 1707 caratteri»; elenco errori (max 4, poi «…e altri {n}»); primo avviso in grigio; pulsante `sib-btn--secondary` `fa-solid fa-download` «Scarica RILPRE» (disabilitato se ci sono errori). Con errori il riquadro ha bordo e icona `--color-error`.
- Riepilogo `dl.tcs__sum` 3×2: «Dipendenti» (n), «Ore ordinarie» (`oreDecimali`, senza separatore delle migliaia, es. «1520,0h»), «Straord. approvato» oppure «Straordinario» (vedi §6.8), «Ferie» («{n} gg»), «Permessi e ROL» (ore), «Malattia» («{n} gg»).
- Note informative (`fa-solid fa-circle-info`):
  - se assenze > 0: «{n} giornata di assenza / giornate di assenza senza giustifica: arriveranno al software paghe come assenze ingiustificate.»
  - se extra > 0: «Ore extra sotto la mezz'ora ({fmtExtra} timbrate in tutto) non entrano nello straordinario.»
- Avvisi:
  - mese in corso (`fa-solid fa-calendar-xmark`, arancio): «Il mese non è ancora chiuso: verranno trasmesse le presenze fino a oggi. A fine mese ritrasmetti il consuntivo completo.»
  - anomalie (`fa-solid fa-triangle-exclamation`, rosso): «**{n} timbratura anomala / timbrature anomale** da correggere ({Nome Cognome, …}): » + se bloccato «l'invio è bloccato finché non le correggi (regola dell'integrazione paghe).» altrimenti «quelle giornate verranno trasmesse senza le ore lavorate.» + link «Correggi nel registro».
- `TextareaField` name `note`, rows 2, label «Note per il consulente (opzionale)», placeholder «Es. anticipo TFR, variazione IBAN da comunicare…».
- Storico «Già trasmesso» (ultime 3 trasmissioni del mese): icona `fa-solid fa-circle-check` (verde) o `fa-solid fa-flask` se simulato; testo «{gg/mm/aaaa} alle {HH:MM} a {software} da {autore} · {n} dipendenti[ · RILPRE ({r} record)][ · {n} anomalie][ · simulato | · prot. {protocollo}]».
- Azioni: «Annulla» (secondary, disabilitato durante l'invio) e primario con icona `fa-solid fa-paper-plane` (in invio `fa-solid fa-spinner fa-spin`): «Trasmetti consuntivo» / «Ritrasmetti consuntivo» (se già trasmesso nel mese) / «Trasmissione in corso…».

## 5. Stati e interazioni

### 5.1 Stato iniziale
- Vista: letta da `localStorage['sibylla.registro-presenze.vista']` (`'dettagliata'` → Dettagliata, altrimenti Giornaliera). Ogni cambio di vista la salva. Lettura/scrittura in try/catch.
- Data: oggi. Struttura: quella corrente. Reparto: «Tutti i reparti». Cerca: vuoto.
- Dipendenti: chiamata `POST operation/GetPresenzeGiornaliere` (vedi §7); se fallisce o torna vuota → elenco demo di 12 dipendenti (`DIPENDENTI_PRESENZE`). Ripetuta a ogni cambio di data, struttura o reparto (con annullamento della risposta precedente).

### 5.2 Filtri
- `filtered = items` filtrati per: testo (contenuto, case-insensitive, in «{nome} {cognome} {reparto}») E reparto (uguale, salvo «Tutti i reparti»). Valgono in entrambe le viste e per gli export. Nessun ordinamento: ordine dell'elenco dipendenti (id).
- Trasmetti consuntivo usa **tutti** i dipendenti caricati (`items`), non i filtrati.

### 5.3 Navigazione nel periodo
- Giornaliera: ‹/› = ±1 giorno. Dettagliata: ‹/› = ±1 mese; il nuovo giorno è il 1° del mese, **tranne** quando si torna al mese corrente: allora è oggi.
- «Oggi»: data = oggi (in entrambe le viste).
- Il DatePicker «Data» imposta il giorno (ignora valori vuoti).

### 5.4 Timeline (Giornaliera)
- **Tasto destro su una riga** → preventDefault e apre «Modifica presenza» per quel dipendente e il giorno mostrato.
- Icona matita → stessa modale. Icona XLS → export .xls della giornata del dipendente.
- Hover su avatar+nome → tooltip contatti; mouseleave lo chiude.
- Popover Legenda: si apre su hover o focus-within del pulsante «i».

### 5.5 Vista Dettagliata — menu e doppio clic
- **Tasto destro** su qualunque cella giorno del `tbody` (righe Tipo, Ingresso, Uscita, Ore extra) → menu contestuale nel punto del mouse; la colonna di quel giorno si evidenzia (`--color-primary-50`) nelle 4 righe.
- Posizionamento: dopo il primo render il menu (inizialmente `visibility:hidden`) si misura e si riposiziona: `x = max(8, min(clientX, innerWidth − larghezza − 8))`; `y = clientY`, ma se `clientY + altezza > innerHeight − 8` allora `y = max(8, clientY − altezza)`. Poi diventa visibile.
- Chiusura: mousedown fuori dal menu, tasto **Esc**, scroll di qualsiasi contenitore (listener in capture) fuori dal menu.
- **Doppio clic** su una cella giorno → modale Timbrature di quel giorno.
- Voci del menu:
  - «Presente» → giornata standard 09:00–13:00 presente, 13:00–14:00 pausa, 14:00–18:00 presente. Banner «Giornata impostata come presente, 09:00–18:00».
  - «Ferie» → segmento ferie 00:00–24:00 nota «Ferie». Banner «Giornata impostata come ferie».
  - «Assente» → segmento assenza 00:00–24:00 senza nota. Banner «Giornata impostata come assenza ingiustificata».
  - «ROL», «Permesso», «Malattia» → apre «Modifica presenza» con la card corrispondente già selezionata.
  - «Gestisci timbrature del giorno» → modale Timbrature.
  - «Modifica presenza…» → modale senza tipo selezionato.
  - «Elimina assegnazione» → ConfirmDialog: titolo «Elimina assegnazione», messaggio «Eliminare presenze, assenze e timbrature di {nome} {cognome} del {g} {mese minuscolo} {aaaa}? La giornata resterà vuota.», pulsante «Elimina» (danger), annulla «Annulla». Se confermato: giornata vuota + banner «Assegnazione eliminata».
- Ogni conferma mostra un `AlertBanner type="success"` sotto il PageHead per **3000 ms**.

### 5.6 Modale Modifica presenza — passo passo
1. Apertura: `entrata`/`uscita` precompilate: per ROL/Permesso «16:00»/«18:00»; altrimenti inizio minimo e fine massima dei tratti di presenza della giornata, o «09:00»/«18:00» se non ce ne sono. `dal = al = giorno`; PUC e note vuoti.
2. Clic su una card: la seleziona; un secondo clic sulla stessa la deseleziona (tipo vuoto). Cambiando card cambiano le sezioni visibili (§4.6).
3. «Salva modifiche»:
   - Malattia: se il PUC (trim) non è `^\d{9,10}$` → errore sotto il campo «Il codice PUC deve avere 9–10 cifre», nessun salvataggio. Digitando nel campo l'errore sparisce.
   - Ferie / Malattia / Assente: per **ogni giorno** dell'intervallo `dal…al` (estremi compresi; se `al < dal` vale solo `dal`; massimo 62 giorni) **escluse le domeniche** si scrive un solo segmento 00:00–24:00:
     - Ferie: `ferie`, nota = note o «Ferie»;
     - Malattia: `assenza`, nota «Malattia — PUC {puc}»;
     - Assente: `assenza`, nota = note.
     Banner: «Presenza aggiornata su {n} giorni» se n > 1, altrimenti «Presenza aggiornata con successo».
   - ROL / Permesso: base = segmenti attuali se contengono presenza, altrimenti il turno generato del giorno senza assenze; se anche questo è vuoto, la giornata standard. Si inserisce il permesso nella finestra `entrata–uscita` (default 16:00–18:00) spezzando i tratti di presenza attorno ad essa; nota «ROL» / «Permesso», oppure «ROL — {note}» / «Permesso — {note}».
   - Straordinario: un solo segmento presente `entrata–uscita` (fallback 09:00–20:00) nota «Straordinario».
   - Nessun tipo, con entrata e uscita: un solo segmento presente `entrata–uscita` (la pausa sparisce).
   - Banner «Presenza aggiornata con successo». La modale si chiude.
4. «Annulla» o chiusura modale: nessuna modifica.

Salvare i segmenti di una giornata **cancella** le timbrature corrette a mano di quella giornata (le timbrature tornano a derivare dai segmenti).

### 5.7 Modale Timbrature — passo passo
1. A ogni apertura il form si azzera: verso = opposto dell'ultima timbratura in ordine di ora (nessuna o ultima uscita → «Entrata»), ora «09:00» se entrata, «18:00» se uscita; postazione «inserita dall'HR»; note vuote.
2. «Aggiungi»: crea `{ id: 't'+timestamp, min, verso, postazione, note? }`, la aggiunge alla giornata, salva subito e ricalcola la presenza; il form si riazzera.
3. Matita su una riga: carica la timbratura nel form (titolo «Modifica timbratura»), riga evidenziata; «Salva timbratura» la sostituisce; «Annulla modifica» torna al form vuoto.
4. Cestino: ConfirmDialog titolo «Elimina timbratura», messaggio «Eliminare l'{entrata|uscita} delle {HH:MM}? La presenza della giornata verrà ricalcolata.», «Elimina» danger. Se confermato rimuove e ricalcola.
5. Righe sempre ordinate per ora crescente. Avviso anomalia se le timbrature non sono accoppiate (§6.3).
6. «Chiudi» chiude. Nessun toast: ogni modifica è già applicata.

### 5.8 Trasmetti consuntivo — passo passo
1. Apertura dal pulsante della toolbar. Il riepilogo si calcola solo a modale aperta, su tutto il personale caricato, per il mese della data mostrata.
2. Se il software in uso è TeamSystem si genera il RILPRE (§6.9) e si mostrano record, errori e avvisi.
3. **Bloccato** se `bloccaConAnomalie && anomalie > 0` oppure il RILPRE ha errori.
4. Pulsante principale disabilitato se: invio in corso, nessun dipendente, nessun software in uso, bloccato.
5. Clic → invio (`POST hr/paghe/trasmetti`), spinner. Esiti:
   - risposta OK → trasmissione registrata con esito «inviato»; toast success titolo «Consuntivo trasmesso» (o «Consuntivo ritrasmesso» se il mese aveva già trasmissioni), testo «Consuntivo di {Mese aaaa} di {n} dipendenti inviato a {software}.» oppure «… inviato a {software} (protocollo {p}).»;
   - backend assente / 404 / 501 / 503 / errore di rete → esito «simulato»; trasmissione registrata; toast info titolo «Invio simulato», testo «Connettore paghe non attivo su questo ambiente: invio simulato, il file è pronto da scaricare.» + (se RILPRE) « Usa «Scarica RILPRE» per consegnarlo a mano.»;
   - altri errori HTTP → nessuna registrazione; toast error titolo «Invio non riuscito», testo «{software} ha rifiutato il consuntivo: controlla il collegamento in Configurazione HR › Integrazione paghe e riprova.»; la modale resta aperta.
6. Dopo un invio (inviato o simulato) le note si svuotano e la modale si chiude.
7. Durante l'invio la modale non si chiude (né con X né con overlay) e «Annulla» è disabilitato.
8. «Cambia» / «Configura l'integrazione paghe»: chiude la modale e naviga a `hr-configurazione:hr-integrazione-paghe`. «Correggi nel registro»: chiude e passa alla vista Dettagliata (salvandola come preferenza).
9. «Scarica RILPRE»: scarica il file binario `RILPRE` (senza estensione).

### 5.9 Export
- **Excel della giornata** (icona XLS di riga, Giornaliera): file `presenze_{cognome}_{aaaa-mm-gg}.xls` (tabella HTML apribile in Excel), colonne «Stato», «Dalle», «Alle», «Note»; toast success «{n} righe esportate in Excel.» titolo «Esportazione completata».
- **Registro Excel del mese** e **PDF del calendario** (Dettagliata): §6.10 e §6.11.

### 5.10 Caricamento ed errore
- Nessuno skeleton: si vedono subito i dipendenti demo; la risposta del backend li sostituisce. Errore → si resta sul demo, nessun messaggio.

## 6. Dati e regole di business

### 6.1 Entità

```ts
type SegmentoTipo = 'presente' | 'assenza' | 'permesso' | 'ferie' | 'pausa'
interface SegmentoPresenza { tipo: SegmentoTipo; start_min: number; end_min: number; note?: string } // minuti 0–1440
type VersoTimbratura = 'entrata' | 'uscita'
interface Timbratura { id: string; min: number; verso: VersoTimbratura; postazione: string; note?: string }
interface GiornataRegistro { segmenti: SegmentoPresenza[]; timbrature: Timbratura[]; modificato: boolean; inServizio?: boolean }
// chiave giornata: `${dipId}|${aaaa-mm-gg}`
interface DipendenteRow { id: number; nome: string; cognome: string; reparto: string; avatar?: string; email?: string; telefono?: string; indirizzo?: string }
interface TrasmissioneConsuntivo {
  id: string; mese: string /* aaaa-mm */; software: string; at: string /* ISO */; autore: string
  dipendenti: number; oreOrdinarie: number; oreStraordinario: number; giorniFerie: number; orePermessi: number; giorniMalattia: number
  anomalie: number; note?: string; esito?: 'inviato' | 'simulato'; protocollo?: string; file?: { nome: string; record: number }
}
```

`autore` = nome del profilo collegato, altrimenti «Ufficio del personale».

### 6.2 Come si ottiene la giornata di un dipendente (`giornataPresenze`)
Ordine di precedenza, per chiave `dipId|iso`:
1. **Segmenti base** = correzione manuale dell'HR (`segmenti[k]`) se esiste, altrimenti giornata generata:
   - turno previsto (mock): domenica → nessun turno; altrimenti `seed = (dipId·7 + giorno·3 + mese0) mod 14`; pari → mattina 07:00–16:00, dispari → pomeriggio 13:00–22:00;
   - giornata generata senza turno (domenica): un segmento `assenza` 00:00–24:00 nota «Riposo»;
   - con turno: ingresso = inizio + scarto(±6 min) + ritardo; uscita = fine + scarto(±5 min) + 75 min se `seed = 9`; pausa di 60 min che parte a inizio turno + 5 h; segmenti: presente(ingresso→pausa), pausa, presente(pausa+60→uscita). Lo scarto è deterministico: `x = sin(seed·12.9898)·43758.5453; round((x − floor(x))·2a − a)` con `seed = dipId·31 + giorno·5 + mese0` (uscita: seed+1);
   - ritardo (mock): `(dipId·3 + giorno) mod 11 = 0` → `12 + (dipId mod 4)·6` minuti, altrimenti 0;
   - **richiesta approvata** che copre il giorno (stato «Approvata», `dal ≤ iso ≤ al`), solo nei giorni con turno: Ferie → `ferie` 00–24 nota = note o «Ferie»; Malattia → `assenza` 00–24 nota «Malattia»; ROL/Permesso: ore = `r.ore` se la richiesta è di un solo giorno e ha ore, altrimenti 8; se ore ≥ 8 → segmento `permesso` dall'inizio turno per 8 h con nota = tipo; altrimenti permesso a fine turno: finestra `[fine − ore·60, fine]` inserita nella presenza (il dipendente esce prima).
2. **Timbrature** = correzione manuale (`timbrature[k]`) se esiste; altrimenti derivate dai segmenti: per ogni tratto `presente` in ordine un'entrata all'inizio e un'uscita alla fine, postazione = `postazioneDi(dipId)`: dipendenti senza app (id 8 e 11) → «kiosk ingresso personale»; id multiplo di 3 → «App Op!»; altrimenti «kiosk ingresso personale».
3. **Segmenti finali**: se ci sono timbrature manuali, ricalcolati da esse (`segmentiDaTimbrature`): ogni entrata seguita da un'uscita = tratto presente; buco tra due tratti = pausa; i segmenti `permesso` della base restano. Altrimenti i segmenti base.
4. **Uscita dimenticata** (mock): giorni passati (non oggi), senza correzioni, se `(dipId·5 + giorno·2 + mese0) mod 37 = 0` si toglie l'ultima timbratura → giornata anomala.
5. **Oggi** senza timbrature manuali: si tengono solo le timbrature con `min ≤ adesso`; i segmenti presente/pausa che iniziano dopo adesso spariscono, quelli in corso si troncano ad adesso.
6. `modificato = esiste segmenti[k] o timbrature[k]`; `inServizio = oggi && ultima timbratura è un'entrata`.

### 6.3 Timbrature anomale
`anomale = n dispari` oppure, ordinate per ora, la i-esima non è `entrata` per i pari / `uscita` per i dispari.

### 6.4 Classificazione della giornata (`classificaGiorno`)
- `lavorati` = somma tratti presente; `permesso` = somma tratti permesso; `tipoPermesso` = «ROL» se la nota del primo permesso contiene «rol» (case-insensitive), altrimenti «Permesso».
- `ordinari = min(lavorati, 480)`; `straordinari = max(0, lavorati − 480)` (ORE_ORDINARIE = 8).
- `ingresso` = minima timbratura di entrata; `uscita` = ultima timbratura solo se è un'uscita.
- Codice, in quest'ordine:
  1. in servizio (oggi, ultima = entrata e le precedenti accoppiate) → `ORD`, «In servizio dalle {HH:MM}»;
  2. timbrature anomale → `ANO`, «Timbratura anomala: entrata o uscita mancante»;
  3. c'è presenza: con permesso → `O+P`, «Presente con {ROL|Permesso} di {fmtOre}»; straordinari ≥ 30 min (SOGLIA_STRAORDINARIO) → `STR`, «Presente con {fmtOre} di straordinario»; altrimenti `ORD`, «Presente, orario ordinario»;
  4. nessun segmento → `VUO`, «Nessuna assegnazione»;
  5. primo segmento ferie → `FER`, «Ferie» oppure «Ferie — {nota}» se nota ≠ «Ferie»;
  6. permesso → `ROL` o `PER`, «{tipo} di {fmtOre}»;
  7. assenza: nota con «riposo» → `RIP` «Riposo»; con «malattia» → `MAL` (descrizione = nota); altrimenti `ASS`, «Assente — {nota}» o «Assente, nessuna giustifica».
- `fmtOre(min)` = «{h}h» o «{h}h {mm}m»; `fmtExtra(min)` = «{m}'» sotto l'ora, poi «{h}h» o «{h}h {m}'»; `oreDecimali(min)` = «{x,x}h» (1 decimale, virgola).

Sigle mostrate (`SIGLA`): ORD «ORD», STR «O+S», O+P «O+P», RIP «RIP», FER «FER», ROL «ROL», PER «PER», MAL «MAL», ASS «ASS», ANO «ANO», VUO nessuna.

Colori dei codici (chip, pallini, totali): ORD `--chart-1` #2E6DA4; STR `--chart-7` #5B43A0; O+P `--chart-4` #A8862F; RIP `--color-text-inactive`; FER `--chart-8` #2E7D3A; ROL `--chart-5` #1E9E95; PER `--chart-4`; MAL `--chart-3` #A8407F; ASS `--chart-6` #C43D34; ANO `--chart-2` #C4661F.

### 6.5 Giorni del mese (`giorniDelMese`)
Per ogni giorno: `oggi`, `futuro` (iso > oggi), `festivo` = domenica o festività nazionale, `festivita` (nome). Giorni **futuri** con codice di presenza (ORD/STR/O+P/ANO) non modificati a mano diventano `VUO` «Giornata non ancora lavorata» senza orari (restano ferie, riposi e assenze pianificate).
Festività: «Capodanno» 1/1, «Epifania» 6/1, «Festa della Liberazione» 25/4, «Festa dei lavoratori» 1/5, «Festa della Repubblica» 2/6, «Ferragosto» 15/8, «Ognissanti» 1/11, «Immacolata» 8/12, «Natale» 25/12, «Santo Stefano» 26/12, «Pasqua» e «Lunedì dell'Angelo» (algoritmo di Meeus/Jones/Butcher).
Colonne «weekend» velate = festivo **o sabato**.

### 6.6 Totali del mese (`totaliMese`) e footer del riquadro
Somme: `ordinari`, `straordinari` (minuti), `rol` / `permessi` (minuti per tipo), giorni `ferie` (FER), `malattia` (MAL), `assenze` (ASS), `anomalie` (ANO), `modificati`.
Footer, voci mostrate solo se > 0 (Ordinarie sempre): «{oreDecimali} Ordinarie», «{fmtExtra} Ore extra», «{n} gg Ferie», «{ore} ROL», «{ore} Permessi», «{n} gg Malattia», «{n} gg Assenze», «{n} Timbratura anomala / Timbrature anomale», `fa-solid fa-pen` «{n} giorno modificato / giorni modificati». Valori in bold colorati col colore del codice (Ore extra `--chart-7`, Modificati `--color-primary`).

### 6.7 Voci orarie (Excel, consuntivo, RILPRE) — `oreGiorno`
Voci: Ordinarie, Straordinario, Festive, Permessi, Infortunio, Malattia, Ferie, Trasferta. Ore decimali arrotondate a 0,1:
- Ordinarie = ordinari/60, **0 nei giorni festivi**;
- Straordinario = straordinari/60 solo se codice STR, 0 nei festivi;
- Festive = lavorati/60 nei giorni festivi;
- Permessi = permesso/60;
- Malattia = 8 se MAL; Ferie = 8 se FER; Infortunio = Trasferta = 0.
Per ogni voce: ore del mese (somma) e giorni in cui la voce è > 0.

### 6.8 Riepilogo del consuntivo
Su tutti i dipendenti: ore ordinarie = Σ Ordinarie; **straordinario** = se `soloStraordinarioApprovato` (default `true`) Σ minuti approvati in Cedolini con chiave che inizia per `{dipId}|{aaaa-mm}` / 60, altrimenti Σ voce Straordinario; ferie = Σ giorni FER; permessi = Σ voce Permessi; malattia = Σ giorni MAL; assenze = Σ ASS; anomalie = Σ ANO; `extra = max(0, round(Σ(straordinari − oreStraordinario·60)))` (minuti oltre l'orario rimasti sotto soglia). Valori inviati arrotondati a 1 decimale.
Configurazione letta da Integrazione paghe (store `sibylla.hr-config`, campo `integrazionePaghe`): `inUso` (default `'zucchetti'`, canale API), `profili[software]` (`canale`, `valori`, `formato`, `voci`, `codiciDipendente`, `sommaOrdinario`), `soloStraordinarioApprovato` (true), `bloccaConAnomalie` (false).

### 6.9 Tracciato RILPRE (TeamSystem)
Generato solo se il software in uso è `teamsystem`. File **binario senza fine riga**, nome `RILPRE`, un record di **1707 caratteri** per dipendente, concatenati. Solo ASCII stampabile: accenti rimossi (NFD), altri caratteri → spazio. Alfanumerici allineati a sinistra con spazi (troncati), numerici solo cifre allineati a destra con zeri (tenute le ultime n cifre).

Testata (95 caratteri):

| pos. | lungh. | contenuto |
|---|---|---|
| 1 | 4 | codice azienda (num) |
| 5 | 2 | codice filiale (num); se la filiale ha 3 cifre qui «00» |
| 7 | 9 | standard: codice dipendente (num 9). RP: «RP » (3) + codice dipendente num 6 dalla pos. 10 |
| 16 | 34 | cognome MAIUSCOLO (alfa) |
| 50 | 34 | nome MAIUSCOLO (alfa); con filiale di 3 cifre: nome su 31 + filiale nelle pos. 81–83 |
| 84 | 6 | data inizio mese GGMMAA |
| 90 | 6 | data fine mese GGMMAA |

Corpo: 31 blocchi giornalieri da 52 caratteri dalla pos. 96: ore ordinarie (hhcc, 4) + 6 giustificativi. Standard: codice 4 + ore hhcc 4. RP: sigla 2 + flag «somma all'ordinario» (`S` se la voce è in `sommaOrdinario`, altrimenti spazio) + flag «stampa descrizione» sempre `S` + ore hhcc 4. Slot vuoto: «    0000». Giorni oltre la fine del mese: «0000» + 6 × «    0000».
- `hhcc(ore)` = `min(9999, round(max(0, ore)·100))` su 4 cifre (7,5 h → «0750»).
- Giustificativi del giorno, nell'ordine: Straordinario, Festive, Permessi, Ferie, Malattia, Infortunio, Trasferta, Assenza (Assenza = 8 h se codice ASS), solo quelli con ore > 0; oltre 6 → avviso «Il {g} ci sono più di 6 giustificativi: trasmessi i primi 6.».
- Codice giustificativo = `profilo.voci[voce]` (trim, maiuscolo). Default TeamSystem: Straordinario «ST», Festive «LF», Permessi «PR», Ferie «FE», Malattia «MA», Infortunio «IN», Trasferta «TR», Assenza «AI».
- Codice dipendente = `codiciDipendente[id]` o default `1000 + id`.
- Variante: «RP / Teamtime» se il formato è «RILPRE – procedura RP / Teamtime (record fisso 1707)», altrimenti «standard» («RILPRE – tracciato standard (record fisso 1707)»).

Errori (bloccano l'invio e lo scarico), testi esatti:
- «Codice azienda: servono da 1 a 4 cifre.» (se non `^\d{1,4}$`)
- «Codice filiale: al massimo 3 cifre.» (se non `^\d{0,3}$`)
- «Manca il codice giustificativo di «{voce}».»
- «Il codice di «{voce}» ({c}) supera i {2|4} caratteri della variante {RP / Teamtime|standard}.»
- «{Nome Cognome}: il codice dipendente «{cod | vuoto}» deve essere di {6|9} cifre al massimo.»
- «{Nome Cognome}: record di {n} caratteri invece di 1707.»
Errori deduplicati. Base64 per l'invio: `btoa(testo)` (latin1, un carattere = un byte).

### 6.10 Registro Excel del mese (`esportaRegistroXlsx`)
File **.xlsx vero** (OOXML zippato nel browser, compressione livello 6), nome `Registro_{Mese}_{aaaa}.xlsx` (es. `Registro_Novembre_2026.xlsx`). Toast success «{n} dipendenti, un foglio ciascuno più il riepilogo.» titolo «Registro Excel scaricato». Fogli: «Riepilogo» + uno per dipendente con nome «{nome} {cognome}» (caratteri `[ ] : * ? / \` → spazio, max 31 caratteri, univoco case-insensitive aggiungendo « (2)», « (3)»… su 27 caratteri).

Tutti i fogli: griglia nascosta, A4 orizzontale (`paperSize=9`), adatta in larghezza a 1 pagina (`fitToWidth=1, fitToHeight=0`), margini sx/dx 0,4", alto/basso 0,5", header/footer 0,3"; altezza riga di default 15; colonna A di spaziatura (larghezza 2).

Stili (font Calibri; bordo sottile `#D8E2EC` sui quattro lati dove indicato):

| stile | font | riempimento | bordo | allineamento |
|---|---|---|---|---|
| brand | bold 9 `#A2864C` | — | no | — |
| titolo | bold 15 `#204769` | — | no | — |
| meta | 9 `#64748B` | — | no | — |
| nome | bold 11 `#FFFFFF` | `#204769` | sì | sinistra, rientro 1, centro verticale |
| giorno | bold 10 `#204769` | `#E8EEF4` | sì | centro |
| giornoWe | 9 `#64748B` | `#F1F5F9` | sì | centro |
| gsett | 9 `#64748B` | `#E8EEF4` | sì | centro |
| gsettWe | bold 9 `#C43D34` | `#F1F5F9` | sì | centro |
| label | 10 `#1E293B` | `#FFFFFF` | sì | sinistra, rientro 1 |
| valore | 10 `#334155` | `#FFFFFF` | sì | centro |
| valoreWe | 10 `#334155` | `#F1F5F9` | sì | centro |
| totCol | bold 10 `#204769` | `#E8EEF4` | sì | centro |
| totLabel | bold 10 `#204769` | `#D5E1EE` | sì | sinistra, rientro 1 |
| totValore | bold 10 `#204769` | `#D5E1EE` | sì | centro |
| testata | bold 11 `#FFFFFF` | `#204769` | sì | centro |
| nota | 9 `#64748B` | — | no | sinistra, senza a capo |
| labelTesto | 10 `#334155` | `#FFFFFF` | sì | sinistra, rientro 1 |

Intestazione comune (colonna B): riga 1 (alt. 14) «SIBYLLA · REGISTRO PRESENZE» (brand); riga 2 (alt. 22) «{titolo} — {Mese} {aaaa}» (titolo); riga 3 (alt. 14) «{struttura} · Generato il {gg/mm/aaaa} alle {HH:MM}» (meta; senza struttura solo «Generato il …»). Riga 4 vuota.

**Foglio «Riepilogo»** — titolo = «Registro presenze» (o il titolo passato, in Cedolini «Calendario presenze»). Larghezze: A 2, B 26, C 18, 8 colonne voce da 12, poi 11, 10, 13. Riquadro bloccato a colonna B / riga 5 (prima cella scorrevole C6).
- Riga 5 (alt. 20): «Dipendente», «Reparto» (stile nome), «Ordinarie (h)», «Straordinario (h)», «Festive (h)», «Permessi (h)», «Infortunio (h)», «Malattia (h)», «Ferie (h)», «Trasferta (h)», «Totale ore», «Ore extra», «Giorni lavorati» (stile testata).
- Una riga per dipendente (alt. 16): «{cognome} {nome}» (label), reparto (labelTesto), ore per voce (valore, vuote se 0), Totale ore (totCol), Ore extra in `fmtExtra` (valore, vuota se 0), Giorni lavorati = giorni con lavorati > 0 (valore).
- Riga totale (alt. 18): «TOTALE», «{n} dipendenti» (totLabel), somme per voce, totale ore, ore extra (`fmtExtra`, anche «0'»), giorni lavorati (totValore).

**Foglio per dipendente** — titolo = «{nome} {cognome}». Larghezze: A 2, B 22, giorni 5,4, TOTALE Ore 8, Gg 6. Riquadro bloccato a colonna B / riga 6 (prima cella scorrevole C7). Unioni: `B5:B6` e le due celle TOTALE della riga 5.
- Riga 5 (alt. 20): B «{nome} {cognome}» (nome); numeri dei giorni (giorno, o giornoWe se festivo o sabato); «TOTALE» (testata, unita su Ore+Gg).
- Riga 6 (alt. 15): lettere `D L M M G V S` (gsett, o gsettWe **solo** se festivo); «Ore», «Gg» (testata).
- Righe 7–14 (alt. 16), una per voce nell'ordine Ordinarie, Straordinario, Festive, Permessi, Infortunio, Malattia, Ferie, Trasferta: B nome voce (label); ore del giorno arrotondate a 0,1 (valore / valoreWe per festivo o sabato; vuote se 0); Ore = totale voce (totCol); Gg = giorni con la voce, **per Festive il numero di giorni festivi del mese** (totCol).
- Riga 15 vuota. Riga 16 (alt. 18): «TOTALE» (totLabel); totale ore del giorno per ogni giorno, anche 0 (totValore); somma; giorni con ore > 0.
- Riga 18: «Ore extra timbrate nel mese: {fmtExtra} · Ore in decimali (8 = otto ore). Ferie e malattia valgono 8 ore per giornata.» (nota).

### 6.11 PDF del calendario presenze (`esportaPresenzePdf`)
jsPDF, A4 **orizzontale**, unità mm (297 × 210), margine M = 10, font Helvetica. Titolo = «Calendario presenze» (default). File `{titolo con _}_{Mese}_{aaaa}.pdf` (es. `Calendario_presenze_Novembre_2026.pdf`). Toast success «{n} dipendenti su {p} pagina|pagine.» titolo «PDF scaricato». **3 dipendenti per pagina**, pagine = max(1, ceil(n/3)).

Colori: NAVY `#204769`, GOLD `#A2864C`, INK `#1E293B`, MUTED `#64748B`, BORDER `#D8E2EC`, HEAD `#E8EEF4`, WE `#F1F5F9`, IN `#2E7D3A`, OUT `#C43D34`, EXTRA `#5B43A0`. Colore per codice: ORD `#2E6DA4`, STR `#5B43A0`, O+P `#A8862F`, RIP `#64748B`, FER `#2E7D3A`, ROL `#1E9E95`, PER `#A8862F`, MAL `#A8407F`, ASS `#C43D34`, ANO `#C4661F`, VUO `#64748B`. «Tinta» = colore mescolato col bianco al 16% (`c·0.16 + 255·0.84`).

Intestazione (ogni pagina): logo Sibylla PNG (rasterizzato dal SVG del brand, rapporto 1106,5/350,1) in (10; 7,8) alto 3,4 mm; «REGISTRO PRESENZE» bold 7 GOLD a x = 10 + larghezza logo + 3, y 10,6; «{titolo} — {Mese} {aaaa}» bold 15 NAVY in (10; 18,5); a destra (allineato a 287; 18,5) 7,5 MUTED «{struttura} · Generato il {gg/mm/aaaa} alle {HH:MM}»; linea BORDER spessore 0,3 a y 21,5 da 10 a 287.

Blocco dipendente (y0 = 25 + i·48,5): nome «{nome} {cognome}» bold 10 INK in (10; y0+3,5); reparto 7,5 MUTED 3 mm dopo il nome. Tabella da y0+6, colonna etichette 27 mm, colonna Totale 13 mm, giorni `(297 − 20 − 27 − 13)/n` mm. Linee 0,15 BORDER, ogni cella riempita e bordata.

| riga | etichetta | alt. mm | etichetta: font / colore / sfondo | contenuto cella giorno |
|---|---|---|---|---|
| Giorno | «Giorno» | 4,4 | bold 6,8 NAVY su HEAD | numero bold 7: NAVY se oggi, OUT se festivo, MUTED se sabato, INK altrimenti; sfondo HEAD (WE se festivo/sabato) |
| G. sett. | «G. sett.» | 3,6 | bold 6,8 NAVY su HEAD | lettera 5,8: OUT se festivo, altrimenti MUTED |
| Tipo | «Tipo» | 4,8 | bold 6,8 INK su bianco | rettangolo arrotondato (r 0,7) con margini 0,7/0,8 mm riempito con la tinta del codice + sigla bold 5,4 nel colore del codice (niente se VUO) |
| Ingresso | «Ingresso» | 4,3 | 6,8 INK | «HH:MM» 6,2 IN |
| Uscita | «Uscita» | 4,3 | 6,8 INK | «HH:MM» 6,2 OUT |
| Ore extra | «Ore extra» | 4,3 | 6,8 EXTRA | `fmtExtra` bold 6,2 EXTRA se > 0 |
| Straordinario approvato | «Straordinario» / «approvato» su due righe | 6,4 | 6 EXTRA | minuti approvati `fmtExtra` bold 6,2 EXTRA (solo se l'export riceve gli approvati, cioè da Cedolini; dal Registro resta vuota da compilare a mano) |

Colonne non intestazione: bianco, WE se festivo o sabato. Colonna Totale: «Totale» bold 6,8 NAVY nella riga Giorno; totale ore extra e totale approvato bold 6,5 EXTRA nelle rispettive righe.
Sotto la tabella (y + 4): coppie valore (bold 7,5, colorato) + etichetta (7,5 MUTED), distanziate 7 mm: «{x,x h} Ordinarie» (`#2E6DA4`, es. «160,0 h»), «{n} gg Ferie», «{x,x} Permessi / ROL» (ore ROL+permessi, senza unità), «{n} gg Malattia», «{n} gg Assenze», «{n} Timbratura anomala|Timbrature anomale», «{fmtExtra} Ore extra», «{fmtExtra} Straordinario approvato» (ciascuna solo se > 0, Ordinarie sempre).

Piede (ogni pagina), y = 183: legenda con un chip per voce di LEGENDA (larghezza testo + 3, alto 3,6, raggio 0,8, tinta del colore) con la sigla bold 6,5 colorata e l'etichetta 6,5 MUTED, voci distanziate 6 mm (sigle: ORD, O+S, RIP, FER, ROL, PER, MAL, ASS, ANO); a y 188 nota 6,5 MUTED: «Ore extra: tempo lavorato oltre le 8 ore ordinarie della giornata (' = minuti). Straordinario approvato: a cura del datore di lavoro, giorno per giorno.»; a y 200: «Data» 8 INK con linea 0,2 MUTED da x 18 a 60; «Firma del datore di lavoro» a x 72 con linea da 110 a 180; a destra «Pagina {p} di {N}» 7,5 MUTED.
Senza dipendenti: «Nessun dipendente per i filtri selezionati.» 10 MUTED in (10; 32).

### 6.12 Persistenza attuale (demo)
- Store zustand `useRegistroPresenzeStore`, persist `localStorage['sibylla.registro-presenze']`, **version 1**: `segmenti` (correzioni per chiave), `timbrature` (correzioni per chiave), `straordinarioApprovato` (minuti per chiave, da Cedolini), `timbraturaConNomeFino` (default oggi + 30 gg, usato da Timbrature), `trasmissioni` (più recente prima).
- Azioni: `impostaSegmenti(k, seg)` (scrive e **cancella** `timbrature[k]`), `impostaTimbrature(k, lista)`, `eliminaGiornata(k)` (segmenti `[]` e cancella timbrature), `approvaStraordinario(k, minuti|null)`, `setTimbraturaConNomeFino(iso)`, `registraTrasmissione(t)`.
- Preferenza vista: `localStorage['sibylla.registro-presenze.vista']`.
- Dipendenti demo: i 12 di `DIPENDENTI_HR` (vedi 01) con email `{nome}.{cognome}@hoteltutorial.it` (minuscolo, senza accenti né caratteri non alfabetici) e telefono `+39 3{30 + id·3} {prime 7 cifre di 1000000 + id·739211}` (es. id 1 → «+39 333 1739211»); nessun indirizzo.

## 7. Backend da realizzare

Oggi l'unica chiamata reale è `POST /Sibylla/operation/GetPresenzeGiornaliere` (con fallback demo) e `POST /Sibylla/hr/paghe/trasmetti` (con fallback «simulato»). Tutto il resto vive nello store. Contratto proposto (stessa semantica delle azioni):

| Metodo e percorso | Uso | Note |
|---|---|---|
| `POST /Sibylla/operation/GetPresenzeGiornaliere` | elenco dipendenti del giorno | body `{ "data": "2026-11-05", "struttura": "Hotel Noto", "reparto": null }` → `[{ "id": 1, "nome": "Andrea", "cognome": "Grimaudo", "reparto": "Front office", "avatar": null, "email": "…", "telefono": "…", "indirizzo": "…" }]` |
| `GET /Sibylla/hr/presenze?mese=2026-11&struttura=…&reparto=…` | giornate del mese per dipendente | → `[{ "dipendenteId": 1, "giorni": { "2026-11-05": { "segmenti": [{ "tipo": "presente", "start_min": 422, "end_min": 720 }], "timbrature": [{ "id": "t1", "min": 422, "verso": "entrata", "postazione": "App Op!" }], "modificato": false, "inServizio": true } } }]`. Il server applica la stessa precedenza del §6.2 (correzioni HR > richieste approvate > timbrature reali/turno). |
| `GET /Sibylla/hr/presenze/giorno?data=2026-11-05` | vista Giornaliera | stessa forma, un solo giorno |
| `PUT /Sibylla/hr/presenze/{dipId}/{data}/segmenti` | Modifica presenza, voci menu | body `{ "segmenti": [...] }`; azzera le timbrature corrette di quel giorno; 200 → giornata ricalcolata |
| `POST /Sibylla/hr/presenze/{dipId}/periodo` | ferie / malattia / assente su più giorni | body `{ "dal": "2026-11-10", "al": "2026-11-14", "tipo": "malattia", "puc": "1234567890", "note": "" }`; esclude le domeniche; 422 `{ "campo": "puc", "messaggio": "Il codice PUC deve avere 9–10 cifre" }`. **Transazionale** su tutti i giorni. Il PUC è visibile solo all'HR. |
| `PUT /Sibylla/hr/presenze/{dipId}/{data}/timbrature` | modale Timbrature | body `{ "timbrature": [...] }`; ricalcola la presenza |
| `DELETE /Sibylla/hr/presenze/{dipId}/{data}` | Elimina assegnazione | giornata vuota (né presenza né assenza) |
| `GET /Sibylla/hr/presenze/export.xlsx?mese=…&dipendenti=…` / `export.pdf` | opzionale | oggi generati nel browser; un backend può produrli identici al §6.10–6.11 |
| `POST /Sibylla/hr/paghe/trasmetti` | Trasmetti consuntivo | body `{ "software": "teamsystem", "canale": "sftp", "mese": "2026-11", "formato": "RILPRE – tracciato standard (record fisso 1707)", "parametri": { "codiceAzienda": "0042", "codiceFiliale": "01", "sftpHost": "sftp.studio.it" }, "file": { "nome": "RILPRE", "base64": "…", "record": 12, "lunghezzaRecord": 1707 }, "riepilogo": { "dipendenti": 12, "oreOrdinarie": 1520.5, "oreStraordinario": 12.5, "giorniFerie": 4, "orePermessi": 6, "giorniMalattia": 2, "anomalie": 0 }, "note": "…" }` → `{ "esito": "inviato", "protocollo": "TS-2026-1182", "messaggio": "…" }`. I parametri **non** contengono segreti (chiavi che contengono password/secret/token/apikey/chiave sono scartate dal browser): credenziali (API key Digital Hub, password SFTP) solo sul server. 404/501/503 = connettore non attivo (il frontend registra «simulato»); 4xx/5xx diversi = rifiuto (toast «Invio non riuscito»). Deve registrare la trasmissione lato server e, se `notificaEsito`, avvisare l'ufficio del personale nel Centro notifiche. |
| `GET /Sibylla/hr/paghe/trasmissioni?mese=2026-11` | storico «Già trasmesso» | → `[{ "id": "tc…", "mese": "2026-11", "software": "…", "at": "ISO", "autore": "…", "dipendenti": 12, …, "esito": "inviato", "protocollo": "…", "file": { "nome": "RILPRE", "record": 12 } }]` |

Le correzioni dell'HR vanno storicizzate (chi, quando, valore prima/dopo). Le modifiche non generano oggi notifiche App Op!.

## 8. Stile

Token (tema chiaro): `--color-primary` #204769, `--color-primary-50` #f2f5f6, `--color-primary-100` #e6eaee, `--color-primary-400` #9cacbb, `--color-text-active` #4A4D53, `--color-text-inactive` #6E7175, `--color-border` #CFD4DA, `--color-bg` #F8FCFF, `--color-surface` #FFFFFF, `--color-success` #007035, `--color-error` #FF616E, `--color-error-light` #FFEAEF, `--color-warning` #F57D03, `--color-warning-light` #FFF3E0, `--radius-md` 6px, `--shadow-lg` 0 4px 16px rgba(32,71,105,.18), `--font-heading` Poppins; `$transition-fast` = `all 150ms cubic-bezier(0.4, 0, 0.2, 1)`.

**Toolbar**
- `.reg-presenze__periodo`: inline-flex, alt. 34px, bordo 1px `--color-border`, radius 8px, sfondo `--color-surface`.
- `.reg-presenze__per-btn`: 32×32, senza bordo/sfondo, `--color-primary`, 12px; hover sfondo `--color-primary-50`.
- `.reg-presenze__per-label`: min-width 128px, padding 0 6px, centrato, heading 13px 700 `--color-primary`, nowrap, `::first-letter` maiuscola.
- `.reg-presenze__icon-btn`: 34×34, bordo 1px `--color-border`, radius 8px, sfondo surface, `--color-primary`, 16px; hover (non disabled) bordo `--color-primary`; disabled opacity .45, cursor not-allowed.
- Icona «i» Legenda: 16px `--color-primary` (`.reg-presenze__legend-pop-wrap .sib-btn--icon i`); `.reg-presenze__toolbar-ico` 13px `--color-text-active` (sovrascritta dalla regola precedente).

**Timeline**
- `.reg-presenze__name-action`: 22×20, 15px, `--color-text-inactive`, transition-fast; hover `--color-primary`.
- `.reg-presenze__reparto`: alt. 100%, flex centrato, `border-left:1px solid --color-border`, `--color-primary`; icona 20px.
- tacche `.reg-presenze__tl-tick`: `border-left` 1px `#F0F0F0`; `--major` (ogni ora) `#DBDBDB`.
- `.reg-presenze__segment`: `left/width` da variabili, sfondo `--seg-bg`, `border-left: 3px solid --seg-border`; etichetta colore `--seg-border`.

**Popover Legenda** `.reg-presenze__legend-pop`: absolute `top: calc(100% + 8px); right:0; z-index:60`, min-width 200px, padding 12px 14px, surface, bordo, radius 6px, shadow-lg; chiuso `opacity:0; visibility:hidden; transform: translateY(-4px)`; aperto (hover / focus-within del wrapper) `opacity:1; visibility:visible; translateY(0)`. Titolo heading 12px 700 primary, mb 8px; lista colonna gap 10px; voce 13px text-active gap 10px; quadratino 16×16 radius 4px, sfondo `--leg-bg`, bordo sinistro 3px `--leg-border`.

**Tooltip contatti** `.reg-presenze__contact`: fixed in (`--cx`, `--cy`), z 200, 240–340px, colonna gap 6px, padding 12px 14px, surface, bordo, radius 6px, shadow-lg, `pointer-events:none`. Nome heading 13px 700 primary mb 2px; righe 12px text-active gap 9px, icona larga 14px centrata `--color-text-inactive`.

**Modale Modifica presenza** `.presenza-edit`
- sezioni colonna gap 6px; label Poppins 12px 600 `--color-primary`; `__row2` griglia 1fr 1fr gap 12px.
- `__cards` griglia `repeat(3, minmax(0, 1fr))` gap 10px. `__card`: colonna, align start, gap 1px, padding 11px 13px, bordo 1px `--color-border`, radius 6px, surface, testo a sinistra, transition-fast; hover bordo `--color-primary-400`; `--on` bordo `--color-primary` sfondo `--color-primary-50`; card malattia: icona `--color-error`, selezionata bordo `--color-error` sfondo `--color-error-light`. Icona 16px primary mb 3px; titolo 13px 700 text-active; sottotitolo 11px text-inactive.
- `__hint`: flex gap 6px, margin-top 2px, 11.5px text-inactive.
- `__giorno`: margin-top −6px, 12px text-inactive, first-letter maiuscola.
- `__actions`: flex end gap 10px, margin-top 4px, padding-top 16px, bordo superiore 1px.

**RegistroMensile** `.rpm`
- legenda: flex wrap, gap 6px 16px, padding 2px 2px 0; voce 12px text-inactive nowrap gap 7px (icona 10px primary); `__legend-end` gap 16px margin-left auto. Pallino 8×8 tondo, sfondo `--chip`, alone `box-shadow: 0 0 0 3px color-mix(in srgb, var(--chip) 16%, transparent)`.
- chip: `--chip` default text-inactive; inline-flex centrato, padding 2px 10px, radius 4px, sfondo `color-mix(in srgb, var(--chip) 14%, transparent)`, testo `--chip`, 11px 600 nowrap. `--sm` (celle): padding 1px 3px, 9px 700, letter-spacing .02em, max-width 100%.
- bollino modificato `__mod`: absolute top/right −5px, 11×11 tondo, sfondo primary, colore surface, 6px.
- card: bordo 1px, radius 6px, surface, overflow hidden. Header flex gap 10px padding 10px 14px; avatar 30px; nome heading 14px 700 text-active; reparto 12px text-inactive gap 6px (icona primary); azioni a destra gap 8px (icone `sib-btn--icon` 16px primary).
- matrice: `width:100%; table-layout:fixed; border-collapse:collapse; font-size:11px`; th/td alt. 22px, padding 0 1px, bordi superiore e sinistro 1px `--color-border`, centrati, overflow hidden, nowrap. `th[scope=row]`: padding 0 10px, senza bordo sinistro, a sinistra, 11px 600 text-inactive. `thead th`: sfondo `--color-bg`, 700 text-active. td `cursor: context-menu`. Riga Tipo alt. 26px; riga G. sett. 10px 600 text-inactive. Colonna Totale bordo sinistro 2px, 700.
- weekend/festivi: sfondo `color-mix(in srgb, var(--color-bg) 70%, transparent)`, in thead testo text-inactive. Oggi: `box-shadow: inset 0 0 0 1px --color-primary`; in thead sfondo primary e testo surface. Colonna del menu aperto: sfondo `--color-primary-50`.
- ingresso `--color-success`, uscita `--color-error` (tabular-nums); extra `--chart-7` 700.
- footer: flex gap 14px, padding 8px 14px, bordo superiore, sfondo `--color-bg`; totali flex wrap gap 4px 16px 12px text-inactive (b margin-right 3px 700); hint 11px text-inactive nowrap margin-left auto.
- vuoto: padding 40px 16px, bordo, radius 6px, surface, 13px text-inactive.
- tooltip cella: colonna gap 2px 11px; titolo 700.
- menu: fixed (`--mx`, `--my`), z 300, 290px, padding 4px 0, bordo, radius 6px, surface, shadow-lg, `visibility:hidden` finché non è misurato (`--ready` visible). Titolo padding 9px 14px 8px, heading 11px 700, letter-spacing .03em, text-inactive, **uppercase**. Gruppi padding 3px 0 con bordo superiore. Voce: flex gap 9px, larghezza 100%, padding 7px 14px, 13px text-active; hover `--color-primary-50`; disabled opacity .45 not-allowed; icona larga 14px; `--act` primary; `--danger` error; nota 11px text-inactive; check a destra primary. Pallino 9×9.

**ModaleTimbrature** `.rpt`: sottotitolo margin-top −6px 12px text-inactive; form colonna gap 10px padding 14px 16px bordo radius 6px sfondo `--color-bg`; titolo heading 12px 700 primary; griglia 3 colonne gap 12px; azioni end gap 8px (icone mr 6px). Avviso: flex gap 8px padding 9px 12px radius 6px sfondo `--color-warning-light` testo text-active 12px, icona `--color-warning`. Ora 700 tabular; verso inline-flex gap 7px 12px 600. Icone azione 16px primary. Riga in modifica `--color-primary-50`. Vuoto padding 18px centrato. Footer end, padding-top 14px, bordo superiore.

**TrasmettiConsuntivo** `.tcs`: colonna gap 14px. Destinazione flex gap 9px 13px text-active (icona e bold primary). File: flex start gap 10px padding 10px 12px bordo radius 6px 12.5px (icona mt 2px primary); `--ko` bordo e icona error; errori elenco padding-left 16px error 12px; avviso 12px text-inactive; pulsante flex none (icona mr 6px). Lead 13px text-inactive. Riepilogo: griglia 3 colonne gap 1px, bordo, radius 6px, sfondo `--color-border` (le linee sono il gap), celle padding 10px 14px sfondo surface; `dt` 11px text-inactive; `dd` mt 2px heading 16px 700 primary tabular. Note/avvisi flex start gap 8px 12px text-inactive (icona mt 2px primary); avvisi testo text-active icona `--color-warning`, `--ko` icona error. Link: ml 6px, senza bordo/sfondo, primary 600 sottolineato. Storico colonna gap 4px 12px text-inactive, titolo 700 text-active, icona mr 6px `--color-success`. Azioni end gap 10px padding-top 14px bordo superiore (icone mr 7px).

**VistaSwitch** `.vsw`: `--vsw-pad:3px`; inline-grid a colonne uguali (`grid-auto-columns:1fr; grid-auto-flow:column`), larghezza max-content, padding 3px, bordo 1px, radius 10px, sfondo `--color-bg`, `isolation:isolate`. Thumb: absolute top/bottom/left 3px, larghezza `(100% − 6px)/n`, radius 7px, sfondo surface, ombra `0 1px 2px rgba(15,23,42,.08), 0 4px 12px rgba(32,71,105,.12)`, `transform: translateX(100% · indice)`. Opzione: flex gap 7px centrata, padding 2px 11px 2px 3px, radius 7px, trasparente, text-inactive; hover (non attiva) text-active e icona sfondo primary-50; focus-visible outline 2px primary offset −2px; attiva primary, cursor default. Icona box 22×22 radius 6px 11px; attiva sfondo primary, colore surface, `scale(1.04)`. Label heading 12px 700 nowrap; hint 11px.

**Tema scuro** (`[data-theme=dark]`): tutto ciò che usa token cambia da solo (es. primary #6F9BCB, surface #1A1E26, bg #12151B, border #2B313D, text-active #E6E8EC, chart ri-gradati: chart-1 #4A8BC9, chart-2 #D9722F, chart-3 #D0609F, chart-6 #E8635A, chart-7 #9585E0, chart-8 #3FA34D); `.bg-white` diventa surface. **Restano fissi** (non a token): colori dei segmenti della timeline, tacche `#F0F0F0`/`#DBDBDB`, e ovviamente Excel/PDF.

## 9. Responsività

- Nessuno scroll orizzontale: la timeline ha la terza colonna `1fr`; la matrice mensile è `table-layout:fixed` con 28–31 colonne uguali (deroga consapevole allo standard tabella: è un calendario).
- **Container query `reg-toolbar` (max-width: 1100px)**: Struttura 128px, Reparto 140px, Cerca 150px, etichetta periodo min-width 110px. La toolbar resta su una riga.
- **Container query `rpm` (max-width: 1180px)**: legenda column-gap 11px, voci gap 6px 11.5px, `legend-end` gap 12px; colonna etichette 76px, Totale 40px; matrice 10px, `th[scope=row]` padding 0 6px 10px; chip celle 8px padding 1px 2px; **hint del footer nascosto**.
- Laptop 1366 px con sidebar aperta: si attivano entrambe le compattazioni; a 1920 px valori standard.
- Ellipsis: nome dipendente nella timeline; etichette dei segmenti; celle matrice `overflow:hidden; nowrap`.

## 10. Effetti e animazioni

- VistaSwitch: thumb `transform .32s cubic-bezier(.34, 1.36, .64, 1)` (leggero rimbalzo); colore opzione `.2s`; icona `background .2s, color .2s, transform .32s` stesso easing. Con `prefers-reduced-motion: reduce` thumb e icona senza transizione.
- Popover Legenda: `opacity .15s, transform .15s, visibility .15s` (slide di 4px verso il basso).
- Icone azione e card della modale: `all 150ms cubic-bezier(0.4, 0, 0.2, 1)`.
- Menu contestuale: nessuna animazione; nascosto (`visibility`) finché non è posizionato, per evitare il salto.
- Spinner `fa-spin` su PDF in generazione e su «Trasmissione in corso…».
- AlertBanner: compare e sparisce dopo 3 s (nessuna transizione specifica della pagina).

## 11. Accessibilità

- Pulsanti a sola icona con `aria-label` (frecce periodo, Excel, PDF, Legenda, azioni riga, azioni timbrature).
- VistaSwitch `role="radiogroup"` + `role="radio"` / `aria-checked`.
- Popover Legenda e tooltip contatti `role="tooltip"`; il popover si apre anche col focus (focus-within).
- Menu contestuale `role="menu"`, voci `role="menuitem"`; Esc chiude; voce Elimina `disabled` sulle giornate vuote.
- Matrice: intestazioni di riga `th scope="row"`. Bollino modificato con `aria-label`. Icone decorative `aria-hidden`.
- Avviso anomalie nella modale timbrature `role="status"`.
- Limite noto: il tasto destro è l'unico accesso al menu dalla matrice (nessuna scorciatoia da tastiera); «Modifica presenza» è raggiungibile dalla matita solo in vista Giornaliera.

## 12. Criteri di accettazione

1. All'apertura senza preferenza salvata si vede la vista Giornaliera di oggi con l'etichetta periodo «{Giorno} {g} {mese} {aaaa}» (iniziale maiuscola) e 12 dipendenti demo.
2. Scegliendo «Dettagliata» il campo Data sparisce, l'etichetta diventa «{Mese} {aaaa}», compaiono le icone Excel e PDF al posto della «i», e ricaricando la pagina la vista resta Dettagliata.
3. In Giornaliera, ‹ e › spostano di un giorno; in Dettagliata di un mese, partendo dal 1°; tornando al mese corrente il giorno è oggi. «Oggi» riporta a oggi.
4. Filtrando il reparto «Cucina» restano solo i dipendenti di Cucina sia nella timeline sia nei riquadri mensili; cercando un nome inesistente compare «Nessun dipendente per i filtri selezionati.».
5. Ogni segmento della timeline è posizionato a `start/1440` e largo `(end−start)/1440` della barra, con bordo sinistro di 3 px e i colori della tabella §4.4; l'hover mostra «{etichetta} — {nota}».
6. Tasto destro su una riga della timeline apre «Modifica presenza — {nome} {cognome}» con Entrata/Uscita pari a primo ingresso e ultima uscita della giornata.
7. Con la card «Assenza per malattia» e PUC «12345» il salvataggio mostra «Il codice PUC deve avere 9–10 cifre»; con «1234567890» e periodo lun–dom si aggiornano 6 giorni (domenica esclusa) e il banner dice «Presenza aggiornata su 6 giorni»; le celle diventano «MAL».
8. Un ROL 16:00–18:00 su una giornata 07:00–16:00 non cambia la presenza fuori finestra; su una giornata 13:00–22:00 la spezza in 13:00–16:00 e 18:00–22:00 e la cella diventa «O+P».
9. In Dettagliata il tasto destro su un giorno apre il menu vicino al mouse, sempre dentro la finestra (8 px di margine), con il tipo attuale in grassetto e spuntato; Esc, clic fuori o scroll lo chiudono.
10. «Elimina assegnazione» chiede conferma col testo esatto §5.5 e, confermato, lascia la giornata senza chip, ingresso e uscita; sulle giornate vuote la voce è disabilitata.
11. Doppio clic su un giorno apre «Timbrature di …»; eliminando l'uscita (con conferma) compare l'avviso di timbrature non accoppiate e la cella Tipo diventa «ANO»; nel footer compare «1 Timbratura anomala».
12. Le giornate modificate dall'HR mostrano il bollino matita sul chip e il conteggio «{n} giorni modificati» nel footer.
13. Una giornata con 8 h 20' lavorate è «ORD» con «20'» in Ore extra; con 8 h 45' è «O+S».
14. I giorni futuri del mese non mostrano presenze (solo ferie/riposi/assenze pianificate); oggi, con il dipendente ancora dentro, la cella dice «ORD» e il tooltip «In servizio dalle HH:MM».
15. Domeniche, festività e sabati hanno le colonne velate; il numero di una festività è rosso e il tooltip ne riporta il nome; la colonna di oggi ha il bordo interno blu e l'intestazione piena.
16. «Registro Excel del mese» scarica `Registro_{Mese}_{aaaa}.xlsx` con il foglio «Riepilogo» e un foglio per dipendente con righe, stili, unioni e riquadri bloccati del §6.10.
17. «PDF del calendario presenze» scarica un A4 orizzontale con 3 dipendenti per pagina, legenda, spazio «Data» e «Firma del datore di lavoro» e «Pagina p di N».
18. Con TeamSystem in uso, Trasmetti consuntivo mostra «File RILPRE · tracciato standard · 12 record da 1707 caratteri»; il file scaricato è lungo 12 × 1707 byte, senza fine riga.
19. Con un codice azienda «ABC» compare l'errore «Codice azienda: servono da 1 a 4 cifre.» e sia «Scarica RILPRE» sia «Trasmetti consuntivo» sono disabilitati.
20. Senza backend l'invio produce il toast «Invio simulato» e lo storico «Già trasmesso» con icona fiaschetta e « · simulato»; il pulsante successivo dice «Ritrasmetti consuntivo».
21. Nel mese in corso la modale mostra l'avviso «Il mese non è ancora chiuso…».
22. Sotto 1100 px di larghezza della toolbar i campi si stringono a 128/140/150 px e la toolbar resta su una riga; sotto 1180 px della vista mensile scompare l'hint del footer e la matrice passa a 10 px, senza scroll orizzontale.
23. Il selettore di vista anima il cursore con rimbalzo in 0,32 s; con `prefers-reduced-motion` il cambio è istantaneo.

## 13. File sorgente

- `src/modules/operation/RegistroPresenze/RegistroPresenze.tsx`
- `src/modules/operation/RegistroPresenze/RegistroPresenze.sass`
- `src/modules/operation/RegistroPresenze/TrasmettiConsuntivo.tsx`
- `src/modules/operation/RegistroPresenze/TrasmettiConsuntivo.sass`
- `src/modules/hr/_presenze/RegistroMensile.tsx`
- `src/modules/hr/_presenze/RegistroMensile.sass`
- `src/modules/hr/_presenze/ModaleTimbrature.tsx`
- `src/modules/hr/_presenze/ModaleTimbrature.sass`
- `src/modules/hr/_presenze/presenze.model.ts`
- `src/modules/hr/_presenze/presenzeExport.ts`
- `src/modules/hr/_presenze/rilpre.ts`
- `src/modules/hr/hrExport.ts`
- `src/store/useRegistroPresenzeStore.ts`
- `src/store/useHrGestioneStore.ts` (richieste, `DIPENDENTI_HR`, `autoreHr`)
- `src/store/useHrConfigStore.ts` (integrazione paghe)
- `src/store/pagheCatalogo.ts`
- `src/services/pagheConnettore.ts`
- `src/core/components/VistaSwitch.tsx`, `src/core/components/VistaSwitch.sass`
- `src/core/components/PageHead.tsx`, `src/core/components/AlertBanner.tsx`
- `src/hooks/useStrutturaCorrente.ts`
- `src/modules/notifiche/CentroNotifiche/reportPickupPdf.ts` (`logoPng`)
- `src/styles/_themes.sass`, `src/styles/_colors.sass`, `src/styles/_spacing.sass`, `src/styles/_skin-dark.sass`, `tailwind.config.js`
- `src/navigation/menu.ts`, `src/core/icons/MenuIco.tsx`, `src/router/PageContent.tsx`, `src/navigation/pageSubtitles.ts`
- `docs/integrazione paghe/README.md`
