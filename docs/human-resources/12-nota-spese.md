# 12 · Nota spese (`hr-note-spese`) e Nota spese mensile (`hr-note-spese-mese`)

Scheda di riproduzione della pagina **Nota spese** e della sua pagina figlia **Nota spese mensile** (il foglio rimborsi di un dipendente). Le due pagine condividono store, modale «Modifica nota», storico e regole; la seconda si raggiunge solo dalla prima. Componenti condivisi (PageHead, Modal, Tooltip scuro, TruncatedText, ThLabel, Pagination, SelectField, DateRangeField, TextareaField, CheckboxField, InputField, DatePickerField, ColFilters, ConfirmDialog, Toast, `.sib-table`, `.sib-btn`): vedi `00-fondamenta.md`. Entità `NotaSpesa`, `EventoHr`, dipendenti HR e store `useHrGestioneStore`: vedi `01-modello-dati-e-api.md`; qui sotto sono ripetuti solo i campi e le regole che servono a queste pagine.

---

## 1. Scopo e utenti

- **Utenti**: ufficio del personale / responsabile HR della struttura (non il dipendente).
- **Nota spese**: elenco di tutte le spese anticipate dal personale. Le spese le **inserisce il dipendente dall'App Op!** con la ricevuta; da qui l'HR le corregge in ogni valore, le approva, le rifiuta (con motivo), le segna come rimborsate quando passano in busta paga, le elimina. Ogni intervento resta nello storico della nota. Non c'è un pulsante «Nuova spesa»: l'HR non crea spese al posto del dipendente.
- **Nota spese mensile**: il foglio di un dipendente per un mese, una riga per giorno e una colonna per voce (come il modulo cartaceo del rimborso), con buoni pasto, totali, approvazione/rimborso del mese, e il **report di fine mese** per la busta paga (PDF, distinta ricevute, Excel riepilogo, Total view di tutti i dipendenti).

## 2. Accesso

| Voce | Valore |
|---|---|
| Id pagina | `hr-note-spese` |
| Pagina figlia | `hr-note-spese-mese` oppure deep link `hr-note-spese-mese:<dipendenteId>:<aaaa-mm>` (es. `hr-note-spese-mese:3:2026-11`) |
| Sidenav | «Human Resources» › «Gestione delle presenze» › «Nota spese» (icona menu `fa-receipt`). La stessa voce esiste anche nei menu Tour Operator e Ristoranti. |
| Voce attiva per la figlia | `hr-note-spese-mese` evidenzia nella sidenav la voce «Nota spese» (mappa pagina-figlia → pagina-menu). |
| Sottotitolo di registro | «Approva, rifiuta e rimborsa le spese anticipate dal personale» |

Parsing del deep link: `page.split(':')` → `[, id, ym]`; `dipendenteId = Number(id)` se presente; `mese = ym`. La pagina è rimontata a ogni cambio di `page` (key = page).
- Se `dipendenteId` non esiste fra i dipendenti HR → primo dipendente (id 1). Se `mese` non rispetta `^\d{4}-\d{2}$` → mese corrente.

Navigazioni:
- Nota spese → BtnBack del PageHead → `home`.
- Nota spese → pulsante «Nota spese mensile» → `hr-note-spese-mese` (dipendente 1, mese corrente).
- Nota spese → clic sul nome del dipendente in tabella → `hr-note-spese-mese:<dipendenteId>:<aaaa-mm della data della spesa>`.
- Nota spese mensile → BtnBack → `hr-note-spese`.

---

## 3. Layout

### 3.1 Nota spese

Root `.nsp`: flex colonna, `gap: 12px`, `font-size: 13px`, `container-type: inline-size`, `container-name: notespese`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                                                                 │
│ Nota spese                                         [▤ Nota spese mensile]    │
│ Approva, rifiuta e rimborsa le spese anticipate dal personale                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Stato          Reparto          Periodo                              [XLS]   │
│ [Tutti gli st▾] [Tutti i rep▾]  [ gg/mm/aaaa → gg/mm/aaaa ]                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ (solo con righe selezionate) 3 spese selezionate  Deseleziona                │
│              [✓ Approva (2)] [✕ Rifiuta (3)] [₪ Segna rimborsate (1)] [🗑 Elimina (3)] │
├──┬──────┬────────────┬─────────┬───────┬──────────────┬──────┬───────┬──────────┬────────┤
│☐ │Data ⇅│Dipendente🔍⇅│Reparto  │Cat. ⏷ │Descrizione 🔍│Giust.│Imp. ⇅ │Stato ⏷   │Azioni  │
├──┼──────┼────────────┼─────────┼───────┼──────────────┼──────┼───────┼──────────┼────────┤
│☐ │05/11/2026│Marco Esposito│Cucina│Taxi │Taxi dalla sta…│ 📎 │ 32,40 €│Da approvare│✎ ✓ ✕ 🗑│
│…  10 righe per pagina                                                        │
└──┴──────┴────────────┴─────────┴───────┴──────────────┴──────┴───────┴──────────┴────────┘
                         Da approvare: 41 (1.920,30 €)   Approvate da rimborsare: 812,40 €
                                   ‹ 1 2 3 … ›   (paginazione centrata)
```

Blocchi:
1. **PageHead** (standard, vedi fondamenta) con `title`, `subtitle`, `onBack`, `actions` = un pulsante secondario.
2. **Toolbar** `.nsp__toolbar`: flex, `align-items: flex-end`, `gap: 10px`, `flex-wrap: wrap`, figli `min-width: 0`. Contiene 3 campi (`.nsp__field`: larghezza 190px, flex colonna, gap 6px; il periodo `.nsp__field--periodo` 250px) e a destra `.nsp__push` (`margin-left: auto`, flex, gap 8px) con il pulsante Excel quadrato.
3. **Barra selezione** (componente HR `BarraSelezione`, visibile solo se ≥1 riga selezionata).
4. **Tabella** in `.sib-table-wrap.nsp__wrap` (bordo 1px `--color-border`, `overflow-x: hidden`), `table.sib-table.nsp__table` con `table-layout: fixed`, `width: 100%`, colgroup in percentuale (somma 100):

| Colonna | Classe col | Larghezza |
|---|---|---|
| Selezione | `nsp__col-sel` | 3% |
| Data | `nsp__col-data` | 9% |
| Dipendente | `nsp__col-dip` | 13% |
| Reparto | `nsp__col-rep` | 11% |
| Categoria | `nsp__col-cat` | 9% |
| Descrizione | `nsp__col-desc` | 15% |
| Giustificativo | `nsp__col-giust` | 8% |
| Importo | `nsp__col-imp` | 9% |
| Stato | `nsp__col-stato` | 12% |
| Azioni | `nsp__col-azioni` | 11% |

5. **Riga riepilogo** `.nsp__foot` sotto la tabella (niente stat-card in cima): flex, `justify-content: flex-end`, `gap: 18px`, wrap, 12px, `--color-text-inactive`; `strong` in `--color-text-active`.
6. **Paginazione** `.nsp__pag`: flex, `justify-content: center`, `margin-top: 4px`.
7. **Modali**: «Modifica nota» (sm), «Rifiuta spesa» / «Rifiuta N spese» (sm), «Giustificativo» (sm), ConfirmDialog globale.

### 3.2 Nota spese mensile

Root `.nsm`: flex colonna, `gap: 12px`, `font-size: 13px`, `container-type: inline-size`, `container-name: nsm`. Variabili di gruppo dichiarate sul root:
- `--g-tr: var(--chart-5)` (Trasporti, teal `#1E9E95`)
- `--g-vi: var(--chart-4)` (Vitto e altro, oro `#A8862F`)
- `--g-bu: var(--chart-7)` (Buoni, viola `#5B43A0`)
- `--g-to: var(--color-primary)` (Totali, blu Platform `#204769`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                                                                 │
│ Nota spese mensile                                                           │
│ Il foglio rimborsi di Andrea Grimaudo · Front office                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ [‹ Prec] [Oggi] [Succ ›]  Novembre 2026                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│▌Report di fine mese                     [Tutti i dipendenti con note (12)▾]  │
│▌Per l'inserimento dei rimborsi in busta  [PDF] [⤓ Download ricevute]        │
│▌paga · Novembre 2026                     [XLS Excel riepilogo] [▤ Total view]│
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌ foglio ─────────────────────────────────────────────────────────────────┐ │
│ │ SIBYLLA · RIMBORSO SPESE                      Nominativo     Mese / anno │ │
│ │ Nota spese mensile                            [Andrea G… ▾] [Novembre…▾] │ │
│ │ (3 da approvare)                                                         │ │
│ │ (●Da approvare 120,00 €)(●Approvate 80,00 €)(●Rimborsate 0,00 €)         │ │
│ │                                   [✓ Approva il mese] [₪ Segna rimborsate]│ │
│ │ ┌───────────┬──────────── TRASPORTI ────────────┬ VITTO E ALTRO ┬BUONI┬TOTALI┐│
│ │ │Data │N° trasf.│Treno│Bus│Aereo│Parcheggio│Taxi│Pasti│Varie   │Pasto│Tot. spese││
│ │ │01 Dom│      │     │   │     │          │    │     │        │ ☐   │        ││
│ │ │02 Lun│ 1    │●45,20│  │     │          │    │●18,00│       │ ☑   │ 63,20  ││
│ │ │ …  una riga per giorno del mese                                         ││
│ │ │Totali mese│ 3 │45,20│ – │ – │ … (fascia scura)                 │ 7 │ 210,40 ││
│ │ └──────────────────────────────────────────────────────────────────────────┘│
│ │ ●Da approvare ●Approvata ●Rimborsata ●Rifiutata (esclusa dai totali)       │ │
│ │                    Spese 210,40 € · Buoni pasto 7 × 8 € = 56,00 €         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

Blocchi:
1. **PageHead** con titolo, sottotitolo dinamico e `onBack` (nessuna azione).
2. **Navigazione mese** `.nsm__nav`: flex, `align-items: center`, `gap: 8px`. Tre `.sib-btn--secondary.nsm__navbtn` (altezza 30px, `padding-inline: 10px`, gap 6px, icona 10px) + etichetta `.nsm__mese`.
3. **Report di fine mese** `section.nsm__report`: flex, `align-items: center`, `gap: 14px`, `padding: 10px 14px`, bordo 1px `--color-border` con `border-left: 3px solid var(--color-primary)`, radius 10px, sfondo `--color-surface`. A sinistra testo (`.nsm__report-txt`, colonna, `min-width: 0`), a destra `.nsm__report-acts` (flex, gap 8px, `margin-left: auto`, `flex: none`; i `.sib-btn` hanno gap 6px e `white-space: nowrap`); select report larga 250px.
4. **Foglio** `section.nsm__sheet`: flex colonna, `gap: 12px`, `padding: 16px 18px 14px`, bordo 1px `--color-border`, radius 12px, sfondo `--color-surface`.
   - `header.nsm__sheet-head`: flex, `align-items: flex-end`, `justify-content: space-between`, gap 16px. Sinistra titolo (colonna, gap 2px); destra `.nsm__sheet-fields` (flex, gap 10px, `flex: none`) con select Nominativo 220px e Mese/anno 170px.
   - `.nsm__summary`: flex, `align-items: center`, wrap, gap 8px; chip a sinistra, pulsanti a destra in `.nsm__summary-push` (`margin-left: auto`, gap 8px).
   - Tabella in `.sib-table-wrap.nsm__wrap` (bordo 1px, radius 10px, `overflow: hidden`). Colgroup: Data 9%, N° trasf. 7%, 7 voci × 9% (= 63%), Pasto 8%, Tot. spese 13% (totale 100%).
   - Legenda `.nsm__legend`: flex, `align-items: center`, `justify-content: space-between`, gap 12px, 11.5px, `--color-text-inactive`.
5. **Modali**: «Modifica nota» (sm, condivisa), «Note del giorno» (md), «Rifiuta spesa» (sm), «Total view · <Mese anno>» (xl), ConfirmDialog.

Larghezze modali (componente Modal): sm 360px, md 480px, xl 780px max; radius 16px, padding 24px, `max-height: calc(100vh - 32px)` con scroll interno; titolo Poppins 16px/600 `--color-primary`.

---

## 4. Elementi e testi

### 4.1 Nota spese — header e toolbar

- Titolo «Nota spese»; sottotitolo «Approva, rifiuta e rimborsa le spese anticipate dal personale».
- Azione header: `sib-btn sib-btn--secondary` con `<i class="fa-solid fa-table-list">` + «Nota spese mensile».
- SelectField `name="stato"`, label «Stato», opzioni: «Tutti gli stati» (valore vuoto), «Da approvare», «Approvata», «Rifiutata», «Rimborsata».
- SelectField `name="reparto"`, label «Reparto», opzioni: «Tutti i reparti» (vuoto), «Front office», «F&B», «Housekeeping», «Manutenzione», «Cucina», «Amministrazione».
- DateRangeField label «Periodo», `nameFrom="ns-dal"`, `nameTo="ns-al"` (range picker standard a due calendari; vedi fondamenta).
- Pulsante Excel `.nsp__icon-btn`, icona `fa-regular fa-file-xls` 16px bianca, `aria-label` e tooltip «Esporta in Excel».

### 4.2 Nota spese — barra selezione (`BarraSelezione`)

Visibile solo con `n ≥ 1`. Testo: «**N** spesa selezionata» (n = 1) / «**N** spese selezionate»; link-pulsante «Deseleziona». Pulsanti (`sib-btn sib-btn--secondary hrsel__btn`, l'ultimo `sib-btn--danger`), icona `fa-solid …` + label + « (quante)» se quante > 0; disabilitato se quante = 0:

| Label | Icona | `quante` |
|---|---|---|
| «Approva» | `fa-solid fa-circle-check` | selezionate in stato Da approvare o Rifiutata **con** giustificativo |
| «Rifiuta» | `fa-solid fa-circle-xmark` | selezionate in stato Da approvare o Approvata |
| «Segna rimborsate» | `fa-solid fa-money-bill` | selezionate in stato Approvata |
| «Elimina» (danger) | `fa-solid fa-trash` | tutte le selezionate |

Contenitore: `role="region"`, `aria-label="Azioni sulle righe selezionate"`.

### 4.3 Nota spese — tabella

Intestazioni (componente ThLabel full/short; short usato sotto soglia container):

| Colonna | Full | Short | Controlli ColFilters | Allineamento |
|---|---|---|---|---|
| Selezione | CheckboxField `ns-sel-all`, aria «Seleziona le spese della pagina», indeterminato se selezione parziale, disabilitato se la pagina è vuota | — | — | centro |
| Data | «Data» | — | ordinamento (label `data`) | sinistra |
| Dipendente | «Dipendente» | «Dip.» | ricerca + ordinamento (label `dipendente`) | sinistra |
| Reparto | «Reparto» | — | nessuno | sinistra |
| Categoria | «Categoria» | «Cat.» | filtro multiplo (opzioni Treno, Bus, Aereo, Parcheggio, Taxi, Pasti, Varie) | sinistra |
| Descrizione | «Descrizione» | — | ricerca | sinistra |
| Giustificativo | «Giustificativo» | «Giust.» | nessuno | centro |
| Importo | «Importo» | «Imp.» | ordinamento | destra (anche l'header flex `justify-content: flex-end`) |
| Stato | «Stato» | — | filtro multiplo (4 stati) | sinistra |
| Azioni | «Azioni» | — | — | centro |

Testi generati da ColFilters con le label sopra (minuscole, come passate): tooltip/aria «Ordina per data», «Ordina per dipendente», «Ordina per importo»; «Cerca in dipendente», «Cerca in descrizione» con placeholder «Cerca dipendente…», «Cerca descrizione…»; «Filtra per categoria», «Filtra per stato» con titolo popover «scelte multiple». Tooltip ordinamento attivo: «Ordine crescente — clicca per decrescente» / «Ordine decrescente — clicca per rimuovere». Icone `fa-solid fa-arrow-down-arrow-up` / `fa-arrow-up-short-wide` / `fa-arrow-down-wide-short`, `fa-solid fa-filter`, `fa-solid fa-magnifying-glass`.

Celle (tutte su una riga; testi in TruncatedText con tooltip se troncati):
- Selezione: CheckboxField `ns-sel-<id>`, aria «Seleziona la spesa di <Nome Cognome>».
- Data: `gg/mm/aaaa`.
- Dipendente: pulsante-link `.nsp__link` con il nome (peso 600, `--color-text-active`), tooltip «Apri la nota spese mensile».
- Reparto, Categoria, Descrizione: testo.
- Giustificativo: se presente, bottone azione con icona `fa-solid fa-paperclip` 16px, tooltip/aria «Visualizza <nomefile>»; se assente, icona `fa-solid fa-triangle-exclamation` 14px in `--color-warning` (`#F57D03`) con tooltip «Nessun giustificativo allegato».
- Importo: `eurHr` (es. «1.234,50 €», migliaia sempre col punto), peso 600, a destra.
- Stato: testo colorato peso 600 (Da approvare → warning; Approvata → `--color-link` `#5C9CD4`; Rimborsata → `--color-success` `#007035`; Rifiutata → `--color-error` `#FF616E`). Se Rifiutata e ha motivo: «Rifiutata» + icona `fa-solid fa-circle-info` 12px, tooltip = testo del motivo, cursore `help`. Se la nota ha un evento «Modificata» nello storico: a destra icona `fa-solid fa-pen` 11px warning (`aria-label="Modificata dall'HR"`, cursore help) con tooltip «Modificata da <autore> il <gg/mm/aaaa>: <modifica1>; <modifica2>» (ultima modifica).
- Azioni (`.nsp__acts`, gap 14px; icone `fa-solid` 16px `--color-primary`, senza box), in quest'ordine e con queste condizioni:
  - «Modifica» `fa-solid fa-pen-to-square` — sempre.
  - «Approva» `fa-solid fa-circle-check` — se Da approvare o Rifiutata. Se la spesa **non ha ricevuta** l'icona resta al suo posto ma è **disabilitata** (opacità .35, cursore default, nessun clic) e tooltip = aria-label = «Manca la ricevuta: allegala da Modifica per poter approvare la spesa».
  - «Rifiuta» `fa-solid fa-circle-xmark` — se Da approvare o Approvata.
  - «Segna come rimborsata» `fa-solid fa-money-bill-wave` — se Approvata.
  - «Elimina» `fa-solid fa-trash` — sempre.
  Ogni azione: tooltip = aria-label = testo indicato.
- Riga vuota: `colSpan=10`, «Nessuna spesa corrisponde ai filtri impostati.»

Riga riepilogo: «Da approvare: **N** (X €)» e «Approvate da rimborsare: **X €**» (calcolati su **tutte** le spese, non sui filtri).

### 4.4 Modale «Rifiuta spesa» (Nota spese)

- Titolo «Rifiuta spesa» (1 riga) o «Rifiuta N spese» (più righe).
- Una riga: paragrafo «<Nome Cognome> · <descrizione> · **<importo>**». Più righe: elenco puntato `<li>` «<Nome Cognome> · <descrizione> · <importo>» (lista max-height 160px, scroll verticale, 13px).
- TextareaField `ns-motivo`, label «Motivo del rifiuto», obbligatorio, 3 righe; hint «Il dipendente lo vedrà accanto alla spesa» (1 riga) oppure «Lo stesso motivo va a tutti i dipendenti selezionati» (più righe).
- Pulsanti a destra: «Annulla» (secondary), «Rifiuta» (`sib-btn--danger`, disabilitato finché il motivo trimmato è vuoto).

### 4.5 Modale «Giustificativo»

- Riquadro `.nsp-modal__doc` con icona 34px `--color-primary`: `fa-solid fa-file-pdf` se il nome finisce in `.pdf`, altrimenti `fa-solid fa-image`; sotto il nome file (troncato).
- Lista descrittiva a due colonne: «Dipendente», «Data», «Categoria», «Importo», «Stato» con i valori (valori a destra, peso 600). Nessun pulsante: si chiude con la X, il backdrop o Esc. Oggi non mostra l'anteprima reale del file (solo il nome).

### 4.6 Modale «Modifica nota» (condivisa fra le due pagine)

Titolo «Modifica nota», size sm. Campi in colonna (gap 14px):
1. SelectField `mn-dip` «Dipendente» (obbligatorio): «Seleziona…» + «Nome Cognome» dei 12 dipendenti.
2. DatePickerField `mn-data` «Data della spesa» (obbligatorio), `max = oggi`.
3. SelectField `mn-causale` «Voce di spesa» (obbligatorio): «Seleziona la voce…», «Trasporti · Treno», «Trasporti · Bus», «Trasporti · Aereo», «Trasporti · Parcheggio», «Trasporti · Taxi», «Vitto e altro · Pasti», «Vitto e altro · Varie».
4. InputField `mn-importo` «Totale rimborso (€)» (obbligatorio), `type=number`, min 0, step 0.01, placeholder «0,00».
5. TextareaField `mn-descr` «Descrizione», 2 righe.
6. Blocco ricevuta: label «Ricevuta (PDF)» (Poppins 12px/600 `--color-primary`); pulsante-label secondario con `fa-regular fa-file-pdf` + «Carica ricevuta» (o «Sostituisci» se c'è già) che apre un input file `accept="application/pdf,.pdf"`; se c'è ricevuta, pulsante secondario «Rimuovi»; a destra nome file o «Nessuna ricevuta allegata». Sotto: errore oppure hint «La carica il dipendente dall'App Op!: sostituiscila solo se ti ha consegnato quella giusta. PDF, massimo 3 MB.»
7. SelectField `mn-stato` «Stato»: i 4 stati.
8. Solo se Stato = Rifiutata: TextareaField `mn-motivo` «Motivo del rifiuto» (obbligatorio, 2 righe), hint «Il dipendente lo vedrà accanto alla spesa».
9. TextareaField `mn-messaggio` «Messaggio al dipendente» (2 righe), hint «Facoltativo: spiega la correzione. Il dipendente riceve la notifica nell'App Op! con le modifiche».
10. **Storico** (componente `StoricoHr`): titolo «Storico»; primo evento sempre «Inviata dall'App Op!» con autore = nome del dipendente (senza data); poi gli eventi `storico` con icona (`fa-mobile-screen` Inviata, `fa-circle-check` Approvata, `fa-circle-xmark` Rifiutata, `fa-money-bill` Rimborsata, `fa-pen` Modificata, `fa-rotate-left` Rimessa in attesa; altri `fa-circle`), titolo azione, «autore · gg/mm/aaaa, hh:mm», elenco modifiche, messaggio con `fa-solid fa-comment`. Senza eventi: «Nessun intervento dell'ufficio del personale finora.»
11. Pulsanti a destra: «Annulla» (secondary), «Salva modifiche» (primary).

Messaggi di validazione (sotto il campo):
- Dipendente vuoto: «Scegli il dipendente»
- Data vuota: «Indica la data»
- Voce vuota: «Scegli la voce di spesa»
- Importo non > 0 (accetta la virgola come separatore): «Importo non valido»
- Stato Rifiutata senza motivo: «Indica il motivo del rifiuto»
- Stato Approvata o Rimborsata senza ricevuta: «Senza ricevuta la spesa non si può approvare né rimborsare» (mostrato nel blocco ricevuta)
- File non PDF: «La ricevuta deve essere un PDF»
- File > 3 MB: «Il file supera 3 MB: comprimilo o scansionalo a risoluzione più bassa»

### 4.7 Nota spese mensile — testi

- Titolo «Nota spese mensile»; sottotitolo «Il foglio rimborsi di <Nome Cognome> · <Reparto>».
- Navigazione: «Prec» con `fa-solid fa-chevron-left` prima; «Oggi»; «Succ» con `fa-solid fa-chevron-right` dopo; etichetta mese «Novembre 2026» (mesi: Gennaio … Dicembre, iniziale maiuscola).
- Report: titolo «Report di fine mese»; sottotitolo «Per l'inserimento dei rimborsi in busta paga · <Mese anno>».
  - SelectField `nsm-report` (senza label, `ariaLabel="Dipendenti del report"`): «Tutti i dipendenti con note (N)» (valore `con-note`, default) + i 12 «Nome Cognome».
  - «PDF» con `fa-regular fa-file-pdf`.
  - «Download ricevute» con `fa-solid fa-download`, tooltip «Distinta in PDF delle ricevute del mese, con quelle mancanti in evidenza».
  - «Excel riepilogo» con `fa-regular fa-file-xls`.
  - «Total view» (primary) con `fa-solid fa-table-list`.
- Foglio: eyebrow «Sibylla · Rimborso spese»; h2 «Nota spese mensile»; pill di stato del mese: «Nessuna nota» / «N da approvare» / «Pronta per la busta paga» / «Rimborsata».
  - SelectField `nsm-dip` «Nominativo» (12 dipendenti); SelectField `nsm-mese` «Mese / anno» (ultimi 12 mesi dal corrente a ritroso, più il mese visualizzato in testa se è fuori elenco).
- Chip: «Da approvare **X €**», «Approvate **X €**», «Rimborsate **X €**», e solo se > 0 «Rifiutate **X €**», ognuno con pallino di stato.
- Pulsanti mese: «Approva il mese» (`fa-solid fa-circle-check`, solo se ci sono note Da approvare), «Segna rimborsate» (`fa-solid fa-money-bill`, solo se ci sono Approvate).
- Tabella: riga gruppi «Trasporti» (colspan 5), «Vitto e altro» (colspan 2), «Buoni», «Totali» (prime 2 colonne vuote). Riga intestazioni: «Data», «N° trasf.», «Treno», «Bus», «Aereo», «Parcheggio», «Taxi», «Pasti», «Varie», «Pasto», «Tot. spese».
  - Cella Data: pulsante con numero a 2 cifre («01») e giorno della settimana abbreviato («Dom», «Lun», «Mar», «Mer», «Gio», «Ven», «Sab»).
  - Cella N° trasf.: numero o vuoto se 0.
  - Cella voce: vuota se nessuna nota; altrimenti pulsante con pallino colorato per stato + importo `cifra` (es. «89,90», senza simbolo €) + contatore tondo se più note; tooltip multilinea, una riga per nota: «<descrizione> · <importo €> · <stato>».
  - Cella Pasto: checkbox nativa, aria «Buono pasto del gg/mm/aaaa», disabilitata nei giorni futuri.
  - Cella Tot. spese: `cifra` o vuoto.
  - Piede «Totali mese»: trasferte (vuoto se 0), totale per voce (`cifra` o «–» se 0), numero buoni, totale spese.
- Legenda: «Da approvare», «Approvata», «Rimborsata», «Rifiutata (esclusa dai totali)» con pallino; a destra «Spese **X €** · Buoni pasto N × 8 € = **X €**».

### 4.8 Modale «Note del giorno»

- Titolo «gg/mm/aaaa» oppure «gg/mm/aaaa · <Voce>» se aperta da una cella voce (filtra le note di quella voce).
- Ogni nota (griglia `86px minmax(0,1fr) auto 96px auto`): pill voce (teal per trasporti, oro per vitto/varie); descrizione (peso 600) e sotto il file (`fa-solid fa-file-pdf` + nome) oppure «Ricevuta mancante» in rosso con `fa-solid fa-triangle-exclamation`; se Rifiutata con motivo, il motivo in rosso 11px; importo `eurHr`; stato colorato; azioni icona 16px `--color-primary`:
  - «Modifica» `fa-solid fa-pen` (chiude questa modale e apre «Modifica nota») — sempre;
  - «Approva» `fa-solid fa-circle-check` — Da approvare o Rifiutata; senza ricevuta disabilitata (opacità .35) con tooltip = aria-label = «Manca la ricevuta: allegala da Modifica per poter approvare la spesa»;
  - «Rifiuta» `fa-solid fa-circle-xmark` — Da approvare o Approvata;
  - «Segna come rimborsata» `fa-solid fa-money-bill` — Approvata;
  - «Elimina» `fa-solid fa-trash-can` — sempre.
- Vuota: «Nessuna nota in questo giorno.»

### 4.9 Modale «Rifiuta spesa» (mensile)

Paragrafo «<Voce> del gg/mm/aaaa · **<importo>**», TextareaField `nsm-motivo` «Motivo del rifiuto» (obbligatorio, 3 righe, hint «Il dipendente lo vedrà accanto alla spesa»), «Annulla» / «Rifiuta» (danger, disabilitato senza motivo).

### 4.10 Modale «Total view · <Mese anno>»

Tabella `table-layout: fixed`; colonne (ThLabel full/short) e larghezze: «Dipendente» 20%; «Trasferte»/«Trasf.» 7%; «Trasporti»/«Trasp.» 12%; «Vitto e altro»/«Vitto» 12%; «Buoni pasto»/«Buoni» 7%; «Tot. spese» 12%; «Da approvare»/«Da appr.» 12%; «Stato» 18%. Una riga per **ognuno dei 12 dipendenti** (anche senza note). Nome in blu peso 600 con tooltip «Nome Cognome · Reparto»; importi `cifra`; Da approvare `cifra` o «–»; Stato = etichetta `statoMese`. Piede «Totale struttura» con le somme (cella stato vuota). Sotto: «Clicca un dipendente per aprire il suo foglio.»

---

## 5. Stati e interazioni

### 5.1 Nota spese

- **Stato iniziale**: filtri vuoti (tutti gli stati, tutti i reparti, nessun periodo), nessun filtro di colonna, ordinamento predefinito per **data decrescente**, pagina 1, nessuna selezione.
- **Filtri** (in AND): stato uguale; reparto del dipendente uguale; `data ≥ dal` se dal, `data ≤ al` se al (confronto stringhe ISO); filtri colonna: testo parziale case-insensitive su nome dipendente e descrizione; scelte multiple su categoria e stato (nessuna scelta = tutte).
- **Ordinamento colonna** (Data, Dipendente, Importo): ciclo crescente → decrescente → nessuno (torna a data decrescente). Data per stringa ISO, Dipendente con `localeCompare`, Importo numerico.
- **Paginazione**: 10 righe per pagina; `totalPages = max(1, ceil(n/10))`; torna a pagina 1 quando cambia un filtro (toolbar o colonna). Cambiare l'ordinamento non riporta a pagina 1.
- **Selezione**: si azzera al cambio di qualunque filtro; **sopravvive** al cambio pagina (si possono accumulare righe di pagine diverse). Il checkbox d'intestazione seleziona/deseleziona solo le righe della pagina corrente (indeterminato se solo alcune). Dopo un'eliminazione gli id non più esistenti escono dalla selezione. Riga selezionata: sfondo `--color-primary-50` (`#f2f5f6`).
- **Clic nome dipendente** → foglio mensile di quel dipendente per il mese della spesa.
- **Approva (riga)**: solo se la spesa ha la ricevuta (stessa regola dell'approvazione in blocco e della modale «Modifica nota»). Con ricevuta: immediato, senza conferma → stato Approvata, evento storico «Approvata»; toast success titolo «Spesa approvata», testo «Spesa di <Nome Cognome> approvata: <importo> da rimborsare.» Senza ricevuta il pulsante è disabilitato e il tooltip spiega il motivo («Manca la ricevuta: allegala da Modifica per poter approvare la spesa»); per allegarla si passa da «Modifica». Se l'azione arrivasse comunque (difesa in profondità) la spesa non cambia stato e compare il toast error titolo «Spesa non approvata», testo «Manca la ricevuta: allegala da Modifica per poter approvare la spesa.»
- **Rifiuta (riga)** → modale rifiuto con quella riga; «Rifiuta» → stato Rifiutata con motivo trimmato, evento «Rifiutata» con messaggio = motivo; toast info «Spesa rifiutata» / «Spesa di <Nome Cognome> rifiutata.»
- **Segna come rimborsata (riga)** → conferma: titolo «Segna come rimborsata», testo «Confermi il rimborso di <importo> a <Nome Cognome>?», pulsante «Conferma rimborso» (non distruttivo) → stato Rimborsata, evento «Rimborsata»; toast success «Spesa rimborsata» / «Rimborso di <importo> registrato.»
- **Elimina (riga)** → conferma distruttiva: titolo «Elimina spesa», testo «Eliminare la spesa "<descrizione>" di <Nome Cognome> (<importo>)?» + se Rimborsata « È già stata rimborsata: il rimborso resta in busta paga, ma la spesa sparirà dalla nota.» + « L'operazione non si può annullare.», pulsante «Elimina» → rimozione definitiva; toast success «Eliminata» / «Spesa eliminata.»
- **Modifica (riga)** → modale «Modifica nota» precompilata (vedi 5.3).
- **Giustificativo** (graffetta) → modale «Giustificativo».
- **Azioni multiple**:
  - «Approva (n)»: conferma titolo «Approva la spesa» (1) / «Approva N spese»; testo «Approvi la spesa selezionata per <totale>?» / «Approvi N spese per <totale>?» + se ci sono selezionate approvabili ma senza ricevuta « Una spesa senza ricevuta resta da controllare.» / « K spese senza ricevuta restano da controllare.»; pulsante «Approva» (non distruttivo). Approva solo quelle con ricevuta; toast success «Spese approvate» / «1 spesa approvata: <totale> da rimborsare.» o «N spese approvate: <totale> da rimborsare.»; svuota la selezione.
  - «Rifiuta (n)»: modale rifiuto con tutte le selezionate Da approvare/Approvata, un solo motivo per tutte; toast info «Spese rifiutate» / «N spese rifiutate.» (se 1: come la singola); svuota la selezione se > 1.
  - «Segna rimborsate (n)»: conferma «Segna come rimborsate», «Confermi il rimborso di 1 spesa per <totale>?» / «… di N spese per <totale>?», «Conferma rimborso»; toast success «Spese rimborsate» / «Rimborso di <totale> registrato.»; svuota.
  - «Elimina (n)»: conferma distruttiva titolo «Elimina spesa» / «Elimina N spese», testo «Elimini la spesa selezionata (<totale>)?» / «Elimini N spese (<totale>)?» + se ci sono rimborsate « Una è già rimborsata: il rimborso resta in busta paga.» / « K sono già rimborsate: il rimborso resta in busta paga.» + « L'operazione non si può annullare.», «Elimina»; toast info «Spese eliminate» / «Spesa eliminata.» o «N spese eliminate.»; svuota.
  - «Deseleziona»: svuota la selezione.
- **Esporta in Excel**: scarica `nota-spese.xls` con le righe **filtrate e ordinate (tutte le pagine)**, colonne «Data», «Dipendente», «Reparto», «Categoria», «Descrizione», «Giustificativo», «Importo», «Stato», «Motivo rifiuto»; toast success «Esportazione completata» / «N righe esportate in Excel.»
- **Stato vuoto**: riga «Nessuna spesa corrisponde ai filtri impostati.». Nessuno stato di caricamento/errore oggi (dati locali); col backend aggiungere caricamento ed errore come da fondamenta.

### 5.2 Nota spese mensile

- **Stato iniziale**: dipendente e mese dal deep link (o default), report = «Tutti i dipendenti con note».
- **Prec / Succ**: mese −1 / +1, senza limiti (anche mesi futuri). **Oggi**: mese corrente. Select «Mese / anno» e «Nominativo» cambiano foglio senza cambiare l'URL.
- **Righe**: una per giorno; weekend (sab e dom) in tinta leggera; oggi evidenziato; giorni futuri in grigio con opacità .55.
- **Clic sulla data**: abilitato solo se nel giorno esiste almeno una nota (anche rifiutata) → modale «Note del giorno» con tutte le note del giorno.
- **Clic su una cella voce** → modale con le note di quel giorno e quella voce.
- **Checkbox Pasto**: commuta immediatamente il buono pasto del dipendente in quel giorno (nessuna conferma, nessun toast); disabilitata per i giorni futuri.
- **Azioni nella modale del giorno**: Approva (solo con ricevuta: immediato, toast success «Spesa approvata» / «<Voce> di <importo> approvata.»; senza ricevuta pulsante disabilitato con tooltip «Manca la ricevuta: allegala da Modifica per poter approvare la spesa», e lo stesso toast error «Spesa non approvata» della riga se l'azione arrivasse comunque), Rifiuta (modale, toast info «Spesa rifiutata» / «<Voce> di <importo> rifiutata.»), Segna come rimborsata (stessa conferma e toast di 5.1), Elimina (conferma titolo «Elimina nota», testo «Eliminare la nota "<descrizione>" del gg/mm/aaaa (<importo>)?» + eventuale frase su rimborso + « L'operazione non si può annullare.», «Elimina»; toast success «Eliminata» / «Nota eliminata.»), Modifica.
- **Approva il mese**: conferma titolo «Approva il mese», testo «Approvare le N note in attesa di <Nome Cognome> (<importo>)? Quelle senza ricevuta restano da controllare.», «Approva» → approva le Da approvare con ricevuta; toast success «Mese approvato» / «K note approvate.» oppure «K note approvate, M senza ricevuta da controllare.»
- **Segna rimborsate (mese)**: conferma titolo «Inserisci in busta paga», testo «Segnare come rimborsate le note approvate di <Nome Cognome> (<importo>)?», pulsante «Segna rimborsate» → tutte le Approvate del mese diventano Rimborsate; toast success «Rimborso registrato» / «<importo> inseriti nel rimborso di <mese anno in minuscolo>.» (es. «novembre 2026»).
- **PDF**: selezione = dipendenti con note o buoni nel mese (opzione `con-note`) oppure il dipendente scelto. Se vuota → toast info «Niente da stampare» / «Nessun dipendente ha note in questo mese.». Altrimenti scarica (vedi 6.6).
- **Download ricevute**: se selezione vuota → toast info «Niente da scaricare» / «Nessuna ricevuta in questo mese.». Altrimenti scarica la distinta.
- **Excel riepilogo**: `riepilogo-nota-spese_<aaaa-mm>.xls`, una riga per dipendente della selezione; colonne «Dipendente», «Reparto», «Trasferte», «Treno», «Bus», «Aereo», «Parcheggio», «Taxi», «Pasti», «Varie», «Buoni pasto», «Valore buoni», «Totale spese», «Da approvare», «Approvato», «Rimborsato», «Stato» (importi con `cifra`); toast di export standard.
- **Total view**: modale; clic su una riga → seleziona quel dipendente nel foglio e chiude. Riga del dipendente corrente evidenziata.

### 5.3 Modale «Modifica nota» (passo passo)

1. Apertura: precompila dipendente, data, voce, importo, descrizione, ricevuta, stato, motivo; messaggio vuoto; errori azzerati.
2. Caricamento ricevuta: accetta solo PDF (MIME `application/pdf` o estensione `.pdf`), massimo 3 MB; oggi si salva **solo il nome del file** (nessun upload reale). L'input file viene azzerato dopo ogni scelta.
3. «Salva modifiche»: valida (messaggi in 4.6). Fra le validazioni c'è la stessa regola dell'Approva di riga: se lo Stato scelto è «Approvata» (o «Rimborsata») e non c'è ricevuta, il salvataggio è bloccato e sotto il blocco ricevuta compare «Senza ricevuta la spesa non si può approvare né rimborsare»; caricando la ricevuta il salvataggio passa. Se valido costruisce il nuovo valore (importo arrotondato al centesimo; descrizione vuota → uguale alla voce; motivo solo se Rifiutata) e calcola le differenze:
   - «Dipendente: <vecchio> → <nuovo>», «Data: gg/mm/aaaa → gg/mm/aaaa», «Voce: <v> → <v>», «Importo: <€> → <€>», «Descrizione: «<nuova>»», «Ricevuta sostituita: <file>» o «Ricevuta rimossa», «Stato: <s> → <s>» oppure, se lo stato resta Rifiutata e cambia il motivo, «Motivo del rifiuto aggiornato».
   - Nessuna differenza → toast info «Nessuna modifica» / «Non hai cambiato nessun valore.» (la modale resta aperta).
   - Altrimenti salva con evento «Modificata» (modifiche + messaggio = messaggio al dipendente, o in mancanza il motivo del rifiuto); toast success «Nota modificata» / «Nota di <Nome Cognome> aggiornata.»; chiude.
4. «Annulla», X, backdrop o Esc chiudono senza salvare.

---

## 6. Dati e regole di business

### 6.1 Entità `NotaSpesa`

| Campo | Tipo | Note |
|---|---|---|
| `id` | string | seed `ns-<n>`, nuove `ns-<base36>` |
| `dipendenteId` | number | id dipendente HR |
| `data` | string `aaaa-mm-gg` | giorno della spesa |
| `categoria` | `'Treno'｜'Bus'｜'Aereo'｜'Parcheggio'｜'Taxi'｜'Pasti'｜'Varie'` | Trasporti = prime 5; Vitto e altro = Pasti, Varie |
| `descrizione` | string | |
| `importo` | number (€) | 2 decimali |
| `giustificativo?` | string | nome del file della ricevuta |
| `stato` | `'Da approvare'｜'Approvata'｜'Rifiutata'｜'Rimborsata'` | |
| `motivo?` | string | presente solo se Rifiutata |
| `storico?` | `EventoHr[]` | `{ at: ISO, autore, azione, modifiche?: string[], messaggio? }` |

Buoni pasto: insieme di chiavi `"<dipendenteId>|<aaaa-mm-gg>"`; valore unitario `VALORE_BUONO = 8` €.
Autore degli eventi: nome del profilo collegato, altrimenti «Ufficio del personale».

### 6.2 Transizioni di stato ed eventi

| Azione | Da | A | Evento `azione` |
|---|---|---|---|
| Approva | Da approvare, Rifiutata | Approvata | «Approvata» |
| Rifiuta | Da approvare, Approvata | Rifiutata (+motivo) | «Rifiutata», messaggio = motivo |
| Rimborsa | Approvata | Rimborsata | «Rimborsata» |
| Modifica (qualsiasi stato, anche cambio stato) | * | * | «Modificata» con `modifiche[]` |
| (stato riportato a Da approvare via setStato) | * | Da approvare | «Rimessa in attesa» |
| Elimina | * | — (rimossa) | nessuno |

Uscendo da Rifiutata il motivo viene cancellato.

Vincolo unico (regola `approvabile(n) = !!n.giustificativo` in `notaSpeseModel.ts`): **senza ricevuta una spesa non si approva in nessun modo**. L'approvazione in blocco e «Approva il mese» saltano le spese senza ricevuta; l'Approva della singola riga (tabella e modale del giorno) è disabilitato con tooltip; la modale Modifica impedisce di salvare Approvata/Rimborsata senza ricevuta. Il backend applica lo stesso vincolo su `POST /hr/note-spese/{id}/approva` (422 `ricevuta-obbligatoria`).

### 6.3 Calcoli — Nota spese

- `Da approvare: N (X)` = conteggio e somma importi delle spese in stato Da approvare (tutte, senza filtri).
- `Approvate da rimborsare` = somma importi delle spese Approvata.
- Formato euro `eurHr(n)`: valore assoluto con 2 decimali, migliaia col punto sempre (anche a 4 cifre), virgola decimale, « €» finale, «-» davanti se negativo.

### 6.4 Calcoli — foglio mensile (`foglio(dipendenteId, aaaa-mm)`)

- Note del foglio = note del dipendente con `data` che inizia per `aaaa-mm`.
- `valida(n) = stato ≠ Rifiutata`: le rifiutate si vedono ma **non contano nei totali**.
- Per ogni giorno e voce: `importo cella = Σ importi note valide`; `stato cella` = stato comune se tutte uguali, altrimenti `misto` (pallino oro). Se la cella ha solo note rifiutate mostra la somma delle rifiutate, barrata e grigia.
- `trasferte giorno` = numero di note valide di voci Trasporti nel giorno; `totale giorno` = Σ note valide del giorno (**i buoni non entrano**).
- `festivo` = sabato o domenica; `futuro` = giorno > oggi; `oggi`.
- Totali mese: `perVoce[v]` = Σ celle; `trasferte`; `trasporti` = Σ voci trasporti; `vitto` = Pasti + Varie; `spese` = Σ totali giorno; `nBuoni`; `buoniEur = nBuoni × 8`.
- Somme per stato (su tutte le note del mese, comprese rifiutate): `eurDaApprovare`, `eurApprovate`, `eurRimborsate`, `eurRifiutate`.
- `statoMese`: nessuna nota e nessun buono → «Nessuna nota» (vuoto); se ci sono Da approvare → «N da approvare» (attesa); altrimenti se ci sono Approvate → «Pronta per la busta paga» (info); altrimenti «Rimborsata» (ok).
- «Tutti i dipendenti con note (N)»: N = dipendenti con almeno una nota o un buono nel mese.
- `cifra(n)`: 2 decimali, punto per le migliaia, virgola decimale, senza simbolo.

### 6.5 Dati demo (seed)

- 12 dipendenti: 1 Andrea Grimaudo (Front office), 2 Giulia Conti (Front office), 3 Marco Esposito (Cucina), 4 Sara Romano (Housekeeping), 5 Davide Marini (Front office), 6 Sergio Benvenuti (Manutenzione), 7 Manuel Fantoni (Manutenzione), 8 Oscar Pettinari (Housekeeping), 9 Luca Hambelli (Amministrazione), 10 Elena Bianchi (F&B), 11 Chiara Ferri (F&B), 12 Paolo Greco (Cucina).
- Spese: per ogni dipendente, mese scorso e mese corrente, da 4 a 10 spese per mese (generatore pseudo-casuale con seme `id × 9301 + 49297`, passo `(s × 9301 + 49297) mod 233280`). Giorno casuale fino a fine mese (mese scorso) o fino a oggi (mese corrente). Voce fra tutte e 7 per Amministrazione e Front office, solo fra le prime 5 (trasporti) per gli altri reparti. Importi per voce (min–max, arrotondati a 0,1): Treno 24–95, Bus 2–12, Aereo 80–240, Parcheggio 4–22, Taxi 15–48, Pasti 14–62, Varie 9–140.
- Descrizioni per voce: Treno «Treno A/R per fiera», «Treno per corso di formazione», «Treno per visita fornitore»; Bus «Bus navetta aeroporto», «Biglietti bus urbano»; Aereo «Volo per workshop commerciale», «Volo per fiera di settore»; Parcheggio «Parcheggio in fiera», «Parcheggio stazione», «Sosta presso fornitore»; Taxi «Taxi per transfer ospite», «Taxi dalla stazione»; Pasti «Pranzo con agenzia partner», «Cena in trasferta», «Pranzo durante il corso»; Varie «Cancelleria reception», «Ricambi urgenti», «Prodotti per allestimento».
- Stati: mese scorso 8% Rifiutata, resto Rimborsata; mese corrente <50% Da approvare, <85% Approvata, <93% Rimborsata, resto Rifiutata. Le rifiutate non hanno ricevuta e hanno motivo «Manca la ricevuta: senza giustificativo la spesa non è rimborsabile.»; le altre hanno ricevuta `ricevuta_<voce minuscola>_<aaaa-mm-gg>.pdf`.
- Buoni pasto: ultimi 46 giorni (oggi −45 … oggi), escluse le domeniche, un giorno quando `(giornoDelMese + id × 2) mod 3 = 0`.

### 6.6 PDF generati lato client (jsPDF)

Colori: NAVY `#204769`, TEAL `#2F6F73`, BROWN `#8A5A2B`, PURPLE `#5B4B8A`, INK `#1E293B`, MUTED `#64748B`, BORDER `#D8E2EC`, WEEKEND `#F4F6F9`. Margine 32pt; logo Sibylla PNG in alto a destra largo 96pt (se disponibile). Intestazione: «SIBYLLA · RIMBORSO SPESE» (helvetica bold 8, teal), titolo (17, navy), sottotitolo (normal 9.5, muted).

- **Nota spese** (A4 orizzontale, una pagina per dipendente): titolo «Nota spese mensile», sottotitolo «<Nome Cognome> · <Reparto> · <Mese anno>». Colonne con larghezze relative: Data .09, N° trasf. .07, 7 voci × .095, Buono .07, Tot. spese .105. Header fascia navy alta 18pt, testo bianco bold 7.5. Righe alte 13.2pt, weekend su fondo WEEKEND, linea inferiore BORDER 0.4; Buono = «Sì» viola; totale in bold navy. Fascia «Totali mese» INK alta 18pt testo bianco bold 8. Riga finale: «Spese X €  ·  Buoni pasto N × 8 € = X €  ·  Da approvare X €  ·  Le spese rifiutate (X €) non sono incluse.» File: `nota-spese_<aaaa-mm>_<nome-cognome>.pdf` (un dipendente) o `nota-spese_<aaaa-mm>.pdf`.
- **Distinta delle ricevute** (A4 verticale): titolo «Distinta delle ricevute», sottotitolo «<Mese anno> · N ricevute · M mancanti». Righe: note del mese dei dipendenti selezionati, escluse le rifiutate, ordinate per nome dipendente e data. Colonne «Data» .12, «Dipendente» .22, «Voce» .12, «Ricevuta» .38, «Importo» .16 (a destra, «X €»); ricevuta mancante scritta «Ricevuta mancante» in rosso rgb(185,28,28). Header ripetuto a ogni nuova pagina. File `ricevute_<aaaa-mm>.pdf`.

### 6.7 Persistenza attuale (mock)

Store zustand persistito in `localStorage` chiave **`sibylla.hr-gestione`**, `version: 8`; la migrazione rigenera seed di note spese, buoni, cedolini e richieste. Stato locale di pagina (filtri, pagina, selezione, modali) non persistito.

---

## 7. Backend da realizzare

Tutto oggi è mock (store + seed). Contratto proposto (prefisso come il resto dell'HR, vedi `01-modello-dati-e-api.md`):

| Metodo | Percorso | Uso |
|---|---|---|
| GET | `/hr/note-spese?stato=&reparto=&dal=&al=&dipendenteId=&mese=` | elenco (filtri lato server facoltativi; il FE filtra e pagina anche in locale) |
| GET | `/hr/note-spese/{id}` | dettaglio con storico |
| PATCH | `/hr/note-spese/{id}` | modifica HR (campi + messaggio) |
| POST | `/hr/note-spese/{id}/approva` | approva |
| POST | `/hr/note-spese/{id}/rifiuta` | rifiuta con motivo |
| POST | `/hr/note-spese/{id}/rimborsa` | segna rimborsata |
| DELETE | `/hr/note-spese/{id}` | elimina |
| POST | `/hr/note-spese/azioni-massive` | approva/rifiuta/rimborsa/elimina su più id |
| PUT | `/hr/note-spese/{id}/ricevuta` (multipart, PDF ≤ 3 MB) | sostituisce la ricevuta |
| DELETE | `/hr/note-spese/{id}/ricevuta` | rimuove la ricevuta |
| GET | `/hr/note-spese/{id}/ricevuta` | scarica/visualizza il file |
| GET | `/hr/buoni-pasto?mese=aaaa-mm[&dipendenteId=]` | giorni con buono |
| PUT / DELETE | `/hr/buoni-pasto/{dipendenteId}/{aaaa-mm-gg}` | attiva / toglie il buono |
| POST | `/hr/note-spese/mese/{dipendenteId}/{aaaa-mm}/approva` | Approva il mese |
| POST | `/hr/note-spese/mese/{dipendenteId}/{aaaa-mm}/rimborsa` | Segna rimborsate il mese |
| GET | `/hr/note-spese/riepilogo?mese=aaaa-mm` | Total view / Excel riepilogo (facoltativo: il FE può calcolarlo) |

Esempi:

```json
// GET /hr/note-spese  → 200
[{ "id": "ns-17", "dipendenteId": 3, "data": "2026-11-04", "categoria": "Taxi",
   "descrizione": "Taxi dalla stazione", "importo": 32.4,
   "giustificativo": "ricevuta_taxi_2026-11-04.pdf", "stato": "Da approvare",
   "motivo": null, "storico": [] }]

// POST /hr/note-spese/ns-17/rifiuta
{ "motivo": "Manca la ricevuta: senza giustificativo la spesa non è rimborsabile." }
// → 200 nota aggiornata, storico += { "at": "...", "autore": "Ufficio del personale", "azione": "Rifiutata", "messaggio": "..." }

// PATCH /hr/note-spese/ns-17
{ "dipendenteId": 3, "data": "2026-11-04", "categoria": "Taxi", "importo": 30,
  "descrizione": "Taxi dalla stazione", "stato": "Approvata", "motivo": null,
  "modifiche": ["Importo: 32,40 € → 30,00 €", "Stato: Da approvare → Approvata"],
  "messaggio": "Corretto l'importo come da ricevuta" }
// → 200 nota con storico += evento "Modificata"

// POST /hr/note-spese/azioni-massive
{ "azione": "approva", "ids": ["ns-17", "ns-18"] }
// → 200 { "aggiornate": ["ns-17"], "saltate": [{ "id": "ns-18", "motivo": "senza-ricevuta" }] }

// POST /hr/note-spese/mese/3/2026-11/approva → 200 { "approvate": 4, "senzaRicevuta": 1 }
```

Errori: 400 `{ "error": "motivo-obbligatorio" }` (rifiuto senza motivo), 409 `{ "error": "transizione-non-ammessa" }` (es. rimborsare una Da approvare), 422 `{ "error": "ricevuta-obbligatoria" }` (Approvata/Rimborsata senza ricevuta via PATCH, o approva di una spesa senza ricevuta), 413/415 sul file (oltre 3 MB / non PDF), 404 id inesistente.

Semantica: ogni azione genera l'evento di storico lato server (autore = utente autenticato, `at` = ora server). Le azioni massive e quelle sul mese sono **transazionali** per singola nota e restituiscono l'esito per id. **Notifiche App Op!** al dipendente: su rifiuto (con motivo), modifica (con elenco modifiche e messaggio), approvazione e rimborso. L'eliminazione di una spesa rimborsata non storna il rimborso in busta paga. PDF ed Excel restano generati lato client.

---

## 8. Stile

Token (tema chiaro): `--color-primary` `#204769`, `--color-primary-50` `#f2f5f6`, `--color-text-active` `#4A4D53`, `--color-text-inactive` `#6E7175`, `--color-link` `#5C9CD4`, `--color-success` `#007035`, `--color-success-light` `#E4F8EE`, `--color-error` `#FF616E`, `--color-error-light` `#FFEAEF`, `--color-warning` `#F57D03`, `--color-warning-light` `#FFF3E0`, `--color-bg` `#F8FCFF`, `--color-surface` `#FFFFFF`, `--color-border` `#CFD4DA`, `--chart-4` `#A8862F`, `--chart-5` `#1E9E95`, `--chart-7` `#5B43A0`, `--radius-md` 6px, `--font-heading` Poppins.

### 8.1 Nota spese (`.nsp`)

| Classe | Valori |
|---|---|
| `.nsp__icon-btn` | 34×34px, bordo 0, radius 8px, sfondo `--color-primary`, colore `#fff`, inline-flex centrato; hover `filter: brightness(.92)` |
| `.nsp__wrap` | `border: 1px solid --color-border`, `overflow-x: hidden` |
| `.nsp .nsp__table` | `table-layout: fixed`, `width: 100%`; th/td `vertical-align: middle`, `white-space: nowrap`, `overflow: hidden`; `thead .sib-colf-head` flex `min-width: 0`; icone filtro `flex: 0 0 auto`. Base `.sib-table` (bordi 1px, header case normale, niente zebra): fondamenta |
| `.nsp .nsp__c` / `.nsp .nsp__r` | `text-align: center` / `right` (due classi per battere `.sib-table`) |
| `.nsp__strong` | peso 600, `--color-text-active` |
| `.nsp__act` | bordo 0, sfondo none, padding 0, inline-flex centrato, `line-height: 1`, colore `--color-primary`; disabled `opacity: .35`, cursore default; `.nsp .nsp__act i` 16px `--color-primary` |
| `.nsp__acts` | inline-flex, gap 14px |
| `.nsp__missing` | inline-flex, `--color-warning` |
| `.nsp__check` | `justify-content: center` |
| `.nsp .nsp__row--sel td` | sfondo `--color-primary-50` |
| `.nsp__stato-cell` | flex, center, gap 6px, `min-width: 0` |
| `.nsp .nsp__stato` | peso 600, `display: block`, `min-width: 0`; `--attesa` warning, `--info` link, `--ok` success, `--ko` error |
| `.nsp__stato-txt` | inline-flex, gap 5px, cursore help |
| `.nsp__mod` | `flex: 0 0 auto`, 11px, warning, cursore help |
| `.nsp__empty` | centrato, `--color-text-inactive`, `padding: 28px 0 !important` |
| `.nsp .nsp__link` | `max-width: 100%`, padding 0, bordo 0, sfondo none, colore/font ereditati, `text-align: left`, cursore pointer; hover colore `--color-primary` + sottolineato |
| `.nsp-modal` | flex colonna, gap 14px, `padding: 4px 2px` |
| `.nsp-modal__actions` | flex, `justify-content: flex-end`, gap 8px, `padding-top: 4px` |
| `.nsp-modal__text` | margin 0, 13px, text-active |
| `.nsp-modal__lista` | margin 0, `padding-left: 18px`, `max-height: 160px`, `overflow-y: auto`, 13px, text-active |
| `.nsp-modal__doc` | flex colonna centrata, gap 8px, padding 18px, `border: 1px dashed --color-border`, radius `--radius-md`, sfondo `--color-bg` |
| `.nsp-modal__filename` | `max-width: 100%`, 12px, text-inactive |
| `.nsp-modal__meta` | grid `auto 1fr`, gap `6px 14px`, 13px; `dt` text-inactive; `dd` margin 0, peso 600, text-active, a destra |

Barra selezione `.hrsel`: flex wrap, center, gap `8px 14px`, `padding: 8px 12px`, bordo 1px, radius `--radius-md`, sfondo `--color-primary-50`; `.hrsel__count` 13px text-active, `strong` primary; `.hrsel__clear` 12px primary sottolineato, senza bordo/sfondo; `.hrsel__acts` `margin-left: auto`, flex wrap gap 8px; `.hrsel__btn` nowrap.

Modale Modifica `.mnota`: colonna gap 14px; `.mnota__file` colonna gap 6px; `.mnota__label` Poppins 12px/600 primary; `.mnota__file-row` flex center gap 10px; `.mnota__upload` `flex: none`, pointer; `.mnota__filename` 12px text-inactive; `.mnota__hint` 11px, `line-height: 1.4`, text-inactive; `.mnota__err` 11px error; `.mnota__actions` flex end gap 8px `padding-top: 4px`.

Storico `.hrsto`: colonna gap 8px, `padding-top: 12px`, `border-top: 1px solid --color-border`; titolo 12px/600 primary; lista gap 10px, `max-height: 220px` con scroll; linea verticale fra eventi (`::after` left 11px, top 24px, bottom −10px, 1px border); icona cerchio 22×22px, 10px, sfondo primary-50 / primary; varianti ok (success-light/success), ko (error-light/error), mod (warning-light/warning); corpo 12px text-active; meta 11px text-inactive; messaggio `padding: 6px 8px`, radius md, sfondo primary-50, icona primary con `margin-right: 4px`; vuoto 12px text-inactive.

### 8.2 Nota spese mensile (`.nsm`)

| Classe | Valori |
|---|---|
| `.nsm__mese` | `margin-left: 6px`, Poppins 15px/700, primary |
| `.nsm__report-tit` | Poppins 13px/700 primary |
| `.nsm__report-sub` | 11.5px text-inactive, una riga con ellipsis |
| `.nsm__eyebrow` | Poppins 10.5px/700, `letter-spacing: .12em`, colore `--g-tr` |
| `.nsm__h2` | margin 0, Poppins 22px/700 primary |
| `.nsm__stato` | `align-self: flex-start`, `margin-top: 4px`, `padding: 1px 9px`, radius 999px, 11px/600 nowrap; `--attesa` sfondo `color-mix(warning 14%, transparent)` testo warning; `--info` `color-mix(primary 12%)` testo primary; `--ok` `color-mix(success 14%)` testo success; `--vuoto` `color-mix(border 60%)` testo text-inactive |
| `.nsm__chip` | inline-flex, gap 6px, `padding: 3px 10px`, bordo 1px, radius 999px, 12px text-active, `strong` primary |
| `.nsm__dot` | 7×7px tondo, sfondo `var(--st, --color-text-inactive)`; `--st` = warning (attesa), primary (info), success (ok), error (ko), `--g-vi` (misto) per chip, celle e legenda |
| `.nsm .nsm__table` | fixed, 100%, 12px; th/td `padding: 0 8px`, altezza 26px, nowrap, ellipsis; `thead th` altezza 28px, 11.5px |
| `.nsm .nsm__num` | destra, `font-variant-numeric: tabular-nums` |
| `.nsm .nsm__c` | centro |
| `.nsm .nsm__sep` | `border-left: 1px solid --color-border` |
| `.nsm .nsm__groups th` | altezza 24px, `padding-top: 6px`, `border-bottom: 0`, Poppins 10px/700, `letter-spacing: .1em`, **uppercase** (deroga voluta: è la riga di gruppo, non l'header di colonna), a sinistra |
| `.nsm .nsm__g` | `border-left: 1px solid border`, `box-shadow: inset 0 3px 0 var(--g)` (barretta 3px in alto col colore del gruppo), testo nel colore del gruppo (`--tr`, `--vi`, `--bu`, `--to`) |
| `.nsm .nsm__row--we td` | `color-mix(in srgb, primary 4%, surface)` |
| `.nsm .nsm__row--oggi td` | `color-mix(primary 10%, surface)`; numero giorno primary 700 |
| `.nsm .nsm__row--fut td` | text-inactive, `opacity: .55` |
| `.nsm__day` | inline-flex baseline, gap 6px, senza bordo/sfondo; disabled cursore default; hover (abilitato) numero primary sottolineato |
| `.nsm__day-n` | tabular-nums, text-active |
| `.nsm__day-w` | 10.5px text-inactive |
| `.nsm__val` | inline-flex center, gap 5px, `max-width: 100%`, `padding: 1px 6px`, radius 6px, sfondo none, peso 600, primary, tabular-nums; hover sfondo `color-mix(var(--st) 12%, transparent)`; `--ko` text-inactive barrato |
| `.nsm__count` | min 15px × 15px, `padding: 0 4px`, radius 999px, sfondo primary, `#fff`, 9.5px, `line-height: 15px` |
| `.nsm__check` | 15×15px, `accent-color: var(--g-bu)`, pointer (default se disabled) |
| `.nsm .nsm__tot` | 700 primary, sfondo `color-mix(--g-to 4%, transparent)` |
| `.nsm .nsm__foot td` | altezza 34px, `border-top: 0`, sfondo `#1E293B`, `#fff`, Poppins 700; `--tr` `color-mix(--g-tr 78%, #0f172a)`, `--vi` `color-mix(--g-vi 70%, #0f172a)`, `--bu` `color-mix(--g-bu 72%, #0f172a)`, `--to` `#0f172a` |
| `.nsm__legend-st` | flex wrap gap 14px; `.nsm__key` inline-flex gap 6px con `::before` pallino 7px `var(--st)` |
| `.nsm__legend-tot strong` | primary |
| `.nsm-day__item` | grid `86px minmax(0,1fr) auto 96px auto`, center, gap 10px, `padding: 9px 0`, bordo inferiore 1px |
| `.nsm-day__voce` | `justify-self: start`, `padding: 1px 8px`, radius 999px, 11px/600; `--tr` sfondo `color-mix(chart-5 14%)` testo chart-5; `--vi` `color-mix(chart-4 16%)` testo chart-4 |
| `.nsm-day__descr` | 600 text-active; `.nsm-day__file` 11px text-inactive, icona primary, gap 5px; `.nsm-day__missing` e icona error; `.nsm-day__motivo` 11px error |
| `.nsm-day__imp` | Poppins 700 primary tabular-nums nowrap |
| `.nsm-day__stato` | 12px/600 nowrap; attesa warning, info primary, ok success, ko error |
| `.nsm-day__acts` / `__act` | gap 10px / senza bordo, primary, 16px |
| `.nsm-day__empty` | `padding: 14px 0`, text-inactive |
| `.nsm-tv .nsm-tv__table` | fixed, 100%, 12.5px, celle nowrap ellipsis; td altezza 36px, padding verticale 0 |
| `.nsm-tv__row` | pointer; hover td `color-mix(primary 5%, transparent)`; `--on` `color-mix(primary 9%, transparent)` |
| `.nsm-tv__name` | block ellipsis, 600 primary |
| `.nsm-tv__foot td` | 700 primary, `border-top: 2px solid primary` |
| `.nsm-tv__st` | 600; attesa warning, info primary, ok success, vuoto text-inactive peso 400 |
| `.nsm-tv__hint` | 11.5px text-inactive |

**Tema scuro** (`[data-theme=dark]`): nessuna regola specifica per queste classi; tutti i colori sono token e seguono lo skin scuro (vedi fondamenta). Restano fissi: bianco del pulsante Excel e del contatore, fascia totali `#1E293B` / `#0f172a` (già scura).

---

## 9. Responsività

Container query sul root di pagina (mai `@media`):

**Nota spese** (`container-name: notespese`)
- `≤ 1360px`: tabella 12px, `thead th` 11px, th/td `padding-left/right: 6px`; intestazioni passano alle abbreviazioni («Dip.», «Cat.», «Giust.», «Imp.») con tooltip del testo completo; gap azioni da 14px a 10px.
- `≤ 1000px`: campi toolbar 150px, periodo 210px.
- La toolbar va a capo (`flex-wrap`); la barra selezione va a capo; la tabella non scrolla mai in orizzontale (`overflow-x: hidden`, colgroup in %, ellipsis + tooltip).
- 1920px: valori standard, intestazioni intere.

**Nota spese mensile** (`container-name: nsm`)
- `≤ 1100px`: il riquadro report va a capo (`flex-wrap: wrap`), azioni senza `margin-left: auto` e a capo; tabella 11.5px con padding `0 5px`; nascosta l'abbreviazione del giorno (`.nsm__day-w` `display: none`).
- Total view: modale max 780px, colonne in %, intestazioni ThLabel; le short si attivano solo se la pagina le scambia (oggi la Total view non ha `+th-compact`, quindi mostra le etichette intere troncate con tooltip).

## 10. Effetti e animazioni

- Nessuna animazione specifica della pagina. Effetti: hover pulsante Excel `brightness(.92)`; hover link dipendente (colore + sottolineatura); hover numero del giorno; hover cella importo (sfondo tinta stato 12%); hover riga Total view. Nessuna transizione dichiarata nei `.sass` (le eventuali transizioni di `.sib-btn`, Modal, Tooltip e Toast sono quelle dei componenti condivisi).
- Nessuno skeleton/spinner oggi. Nessuna regola `prefers-reduced-motion` necessaria.

## 11. Accessibilità

- Checkbox con `aria-label`: «Seleziona le spese della pagina», «Seleziona la spesa di <Nome>», «Buono pasto del gg/mm/aaaa»; header in stato indeterminato.
- Pulsanti icona con `aria-label` uguale al tooltip («Modifica», «Approva», «Rifiuta», «Segna come rimborsata», «Elimina», «Visualizza <file>», «Esporta in Excel»; «Approva» di una spesa senza ricevuta: «Manca la ricevuta: allegala da Modifica per poter approvare la spesa», pulsante `disabled`); icone decorative `aria-hidden="true"`. Il pulsante disabilitato ha `pointer-events: none`, così il passaggio del mouse arriva al contenitore del Tooltip e la spiegazione resta leggibile.
- Icona modifica HR `aria-label="Modificata dall'HR"`. Barra selezione `role="region"` `aria-label="Azioni sulle righe selezionate"`. Select report `aria-label` «Dipendenti del report». Storico `section aria-label="Storico"`.
- Modali: Esc chiude; clic sul backdrop chiude. ColFilters: la ricerca prende il fuoco all'apertura (`autoFocus`). Tutti i controlli sono `<button>` nativi, quindi raggiungibili con Tab e attivabili con Invio/Spazio; i giorni senza note sono `disabled`.

## 12. Criteri di accettazione

1. Aprendo «Human Resources › Gestione delle presenze › Nota spese» compaiono titolo «Nota spese», sottotitolo «Approva, rifiuta e rimborsa le spese anticipate dal personale» e il pulsante «Nota spese mensile».
2. Senza filtri la tabella mostra 10 righe per pagina, ordinate per data decrescente, paginazione centrata; la riga sotto la tabella riporta «Da approvare: N (X €)» e «Approvate da rimborsare: X €» calcolati su tutte le spese.
3. Con Stato = «Rifiutata» compaiono solo spese rifiutate; il loro stato mostra l'icona info e il tooltip con il motivo.
4. Impostando un filtro (toolbar o colonna) si torna a pagina 1 e la selezione si azzera; cambiando pagina la selezione resta.
5. Una spesa senza ricevuta mostra il triangolo arancione con tooltip «Nessun giustificativo allegato»; selezionata insieme a una con ricevuta, «Approva» riporta (1) e la conferma dice «Una spesa senza ricevuta resta da controllare.»
6. Nella stessa riga (Da approvare o Rifiutata, senza ricevuta) l'icona «Approva» è visibile ma disabilitata e al passaggio del mouse mostra il tooltip scuro «Manca la ricevuta: allegala da Modifica per poter approvare la spesa»; il clic non cambia lo stato. Lo stesso vale per «Approva» nella modale del giorno del foglio mensile. Caricata la ricevuta da «Modifica nota», l'icona torna attiva con tooltip «Approva».
7. «Rifiuta» resta disabilitato finché il motivo è vuoto; dopo il rifiuto lo storico della nota contiene l'evento «Rifiutata» col messaggio.
8. «Elimina» apre sempre una conferma con «L'operazione non si può annullare.»; per una spesa rimborsata il testo aggiunge la frase sul rimborso in busta paga.
9. In «Modifica nota», impostando Stato «Approvata» dopo aver rimosso la ricevuta, il salvataggio è bloccato con «Senza ricevuta la spesa non si può approvare né rimborsare»; caricando un file non PDF compare «La ricevuta deve essere un PDF»; salvando senza cambi compare il toast «Nessuna modifica».
10. Dopo una modifica, accanto allo stato compare la matita arancione con tooltip «Modificata da <autore> il <data>: <modifiche>».
11. «Esporta in Excel» scarica `nota-spese.xls` con le 9 colonne indicate e tutte le righe filtrate; toast «N righe esportate in Excel.»
12. Il clic sul nome di un dipendente apre il foglio mensile di quel dipendente nel mese della spesa e la sidenav resta su «Nota spese».
13. Nel foglio mensile ogni giorno del mese ha una riga; sabati e domeniche in tinta leggera, oggi evidenziato, giorni futuri al 55% di opacità e checkbox Pasto disabilitata.
14. Le spese rifiutate appaiono barrate e grigie e non entrano in «Tot. spese», «Totali mese» e «Spese X €»; la legenda dice «Rifiutata (esclusa dai totali)».
15. La legenda calcola «Buoni pasto N × 8 € = X €» e cambia subito spuntando/despuntando un Pasto.
16. «Approva il mese» approva solo le note con ricevuta e il toast segnala quante restano «senza ricevuta da controllare»; «Segna rimborsate» porta la pill di stato a «Rimborsata».
17. «PDF» con «Tutti i dipendenti con note» genera un PDF A4 orizzontale con una pagina per dipendente; «Download ricevute» genera `ricevute_<aaaa-mm>.pdf` con «Ricevuta mancante» in rosso.
18. «Total view» elenca 12 dipendenti con riga «Totale struttura»; cliccando una riga il foglio passa a quel dipendente e la modale si chiude.
19. A container ≤ 1360px la tabella Nota spese passa a 12px e a intestazioni abbreviate con tooltip, senza scroll orizzontale; a ≤ 1100px nel foglio mensile spariscono le abbreviazioni dei giorni e il riquadro report va a capo.
20. Esc chiude qualunque modale della pagina.

## 13. File sorgente

- `src/modules/hr/NoteSpese/NoteSpese.tsx`
- `src/modules/hr/NoteSpese/NoteSpese.sass`
- `src/modules/hr/NoteSpese/NotaSpeseMensile.tsx`
- `src/modules/hr/NoteSpese/NotaSpeseMensile.sass`
- `src/modules/hr/NoteSpese/ModaleNota.tsx`
- `src/modules/hr/NoteSpese/ModaleNota.sass`
- `src/modules/hr/NoteSpese/notaSpeseModel.ts`
- `src/modules/hr/NoteSpese/notaSpesePdf.ts`
- `src/modules/hr/_hrGestione.sass`
- `src/modules/hr/_selezione/BarraSelezione.tsx`, `BarraSelezione.sass`, `useSelezione.ts`
- `src/modules/hr/_storico/StoricoHr.tsx`, `StoricoHr.sass`
- `src/modules/hr/hrExport.ts`
- `src/store/useHrGestioneStore.ts`
- `src/store/useConfirmStore.ts`
- `src/core/components/Modal.tsx`, `ColFilters.tsx`, `ThLabel.tsx`
- `src/core/icons/Ico.tsx`, `src/core/icons/MenuIco.tsx`
- `src/styles/_themes.sass`, `_colors.sass`, `_mixins.sass`, `_components.sass`
- `src/navigation/menu.ts`, `menuHelpers.ts`, `pageSubtitles.ts`, `menuTourOperator.ts`, `menuRistoranti.ts`
- `src/router/PageContent.tsx`
