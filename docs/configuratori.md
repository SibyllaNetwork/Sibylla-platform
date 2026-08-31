# Configuratori — rifacimento completo (brief)

Fonte requisiti: `docs/Sibylla_Platform_Configuratori_HOTEL.pdf` (34 pagine, 28 configuratori,
descrizione funzionale + screenshot + sezione "Nuove Logiche e/o UX-UI" + schizzi a mano).
Questo documento è la traduzione operativa del PDF: **è la fonte di verità per l'implementazione**.

Codice: `src/modules/impostazioni/Configuratore/`, pagina `configuratore` (deep link
`configuratore:<id>`), montata da `src/router/PageContent.tsx`.

---

## 1. Stato di partenza (audit del codice attuale)

Shell `Configuratore.tsx` (sidebar cercabile + pane) con 23 voci main + 15 F&B.

Problemi strutturali rilevati:

- **Triplo titolo**: `PageHead` "Configuratore" + `__pane-title` + breadcrumb interno
  "Configuratore › X" ripetuto in ognuno dei 28 pane.
- **0 usi di `.sib-table`**: 22 tabelle su mixin locale `pane-table-base`, 5 pseudo-tabelle
  in `div`/grid (Scaglioni, Finestre, Richieste extra, Listini ×2). Header colonna in
  UPPERCASE in 4 pane. Conseguenza: lo standard icone-tabella (blu 16px senza box, che vive
  in `.sib-table .sib-btn--icon`) non si applica → icone grigie 12px in box.
- **40+ `<input>`/`<select>` raw** con classi `sib-*` invece di `InputField`/`SelectField`/
  `CheckboxField`/`ToggleSwitch`; 4 toggle switch riscritti a mano.
- **Elimina senza conferma**: solo `PolitichePrenotazione` usa `useConfirmStore`; altrove
  delete immediata o cestini **inerti senza `onClick`**.
- **Nessun feedback**: 16 "Salva" con `catch {}` vuoti, nessun toast, nessuno stato dirty
  (cambiando voce nella sidebar le modifiche si perdono in silenzio).
- **Tabelle tagliate**: `PolitichePrenotazione` a 10 colonne perde "Stato" e "Azioni" fuori
  dal pane, irraggiungibili.
- **Colori fuori token**: hex hardcoded nella shell (5) e in 5 pane (24 solo in
  `MappingSegmentoMercato`); nessun override in `_skin-dark.sass` → la sezione non ha dark mode.
- **Duplicazione**: `ListiniIndividuali` e `ListiniGruppi` identici al 100%;
  `ScaglioniOccupazione`/`FinestrePrenotazione`/`RichiesteExtra` sono la stessa tabella-regole
  scritta tre volte.
- **Codice morto**: 6 pane `Fb*` (`FbVociMenu`, `FbCreaMenu`, `FbListaMenu`, `FbAllergeni`,
  `FbGestioneCosti`, `FbImpostazioni`, ≈780 righe) non importati da nessuna parte.
- **F&B**: 14 voci renderizzate da `OutletConfig` → `Outlet/app/pages/ConfigPages.jsx`
  (2753 righe con UI kit proprio: `C`, `Btn`, `DataTable`, `Modal`, `PageHeader`, `Badge`,
  `useToast`, `useConfirm`, inline style). Dentro il pane compare un **secondo page-head**.

---

## 2. Inventario nuovo — 26 configuratori + F&B

Ordine e denominazioni dal PDF. **`Contratti` va rimosso** (§1.14: "Il configuratore
attualmente presente dovrà essere rimosso"); **`Tipologie basi` non esiste nel documento** →
va rimosso dal menu. Quattro configuratori sono **nuovi**.

| # | id | Voce | Stato |
|---|---|---|---|
| 1 | `camere-mapping` | Mapping camere | rifare |
| 2 | `mapping-segmento-mercato` | Mapping segmenti | rifare |
| 3 | `bar-fit` | B.A.R. / F.I.T. | rifare (master-detail) |
| 4 | `bottom-rate` | Bottom rate | rifare |
| 5 | `fasce-eta` | Fasce d'età | rifare |
| 6 | `stagionalita` | Stagionalità | **rifare da zero** (calendario + 7 stagioni) |
| 7 | `scaglioni-occupazione` | Scaglioni occupazione | rifare (componente regole) |
| 8 | `finestre-prenotazione` | Finestre prenotazione | rifare (componente regole) |
| 9 | `richieste-extra` | Richieste extra | rifare (componente regole) |
| 10 | `buffer-presenze` | Buffer presenze | solo restyle (contenuti corretti) |
| 11 | `overbooking-limit` | Overbooking limit | rifare + gating stagionalità |
| 12 | `vincolo-matriosca` | Vincolo matriosca | rifare (copy + 2 box) |
| 13 | `arrangiamenti` | Arrangiamenti | rifare (+ mezza pensione diurna/serale) |
| 14 | `lotti-mapping` | Lotti mapping | **rifare da zero** (Gruppi/B2B + campanella) |
| 15 | `market-specifics` | Market specifics | rifare (ricerca + Promozione) |
| 16 | `listini-individuali` | Listini individuali | **rifare da zero** (+ calendario, PDF) |
| 17 | `listini-gruppi` | Listini gruppi | **rifare da zero** (+ calendario, PDF) |
| 18 | `politiche-prenotazione` | Politiche di prenotazione | estendere (3 sezioni) |
| 19 | `voci-incasso` | Voci incasso | rifare (+ Gateway, toggle, azioni) |
| 20 | `gateway` | Gateway | **NUOVO** |
| 21 | `configura-outlet` | Configura Outlet | rifare + gating outlet |
| 22 | `intestazioni-fiscali` | Intestazioni fiscali | **NUOVO** |
| 23 | `business-central` | Business Central | **NUOVO** (Documenti/Conti/Journal Batch) |
| 24 | `personalizza-struttura` | Personalizza struttura | rifare (+ sovrapprezzo orari) |
| 25 | `costi-mapping` | Costi mapping | **NUOVO** |
| 26 | *(sotto-lista)* | Food & Beverage | 14 voci, sub-app Outlet |

### Gruppi tematici (nuova navigazione)

1. **Camere e inventario** — Mapping camere, Vincolo matriosca, Lotti mapping, Buffer presenze,
   Overbooking limit
2. **Mercati e segmenti** — Mapping segmenti, Market specifics
3. **Tariffe e listini** — B.A.R./F.I.T., Bottom rate, Stagionalità, Listini individuali,
   Listini gruppi, Fasce d'età, Arrangiamenti
4. **Regole di vendita** — Scaglioni occupazione, Finestre prenotazione, Richieste extra,
   Politiche di prenotazione
5. **Amministrazione e fiscale** — Voci incasso, Gateway, Intestazioni fiscali,
   Business Central, Costi mapping
6. **Struttura** — Personalizza struttura, Configura Outlet
7. **Food & Beverage** — 14 voci (sub-app Outlet Manager)

### Prerequisiti / gating (dal PDF)

| Configuratore | Sbloccato da |
|---|---|
| Overbooking limit | Stagionalità configurata **e applicata** |
| Listini individuali | Stagionalità **B2B** completata |
| Listini gruppi | Stagionalità **Gruppi** completata |
| Configura Outlet | esiste almeno un Outlet creato |

Un configuratore bloccato **non è un grigio muto**: mostra il motivo e la CTA che porta al
prerequisito ("Per sbloccare: completa Stagionalità B2B →").

---

## 3. Direzione di design — "Configuratore come percorso guidato"

Obiettivo dato dal committente: sezione **smart e intuitiva**, navigazione **bella, chiara,
moderna**, con effetti di navigazione/visualizzazione attuali, nel pieno rispetto dello
standard Sibylla (in particolare i **colori**).

### 3.1 Hub d'ingresso
La pagina `configuratore` apre su un **hub**: le 7 corsie tematiche come card, ognuna con
- anello/barra di completamento (n configurati / n totali),
- le voci come pill con stato: `configurato` (check, verde success), `da completare`
  (dot, warning), `bloccato` (lucchetto, disabled + motivo nel tooltip),
- CTA "Riprendi da…" sul prossimo passo suggerito.

### 3.2 Navigazione dentro il configuratore
- Sidebar contestuale con **gruppi collassabili** (il gruppo attivo aperto), indicatore
  attivo che **scorre** tra le voci (animazione di layout, non un semplice cambio di sfondo).
- **Command palette** interna (⌘K / clic sulla search): ricerca fuzzy su nome, descrizione e
  sinonimi (es. "no-show" → Politiche di prenotazione), con stato di ogni risultato.
- **Un solo titolo**: il breadcrumb vive nell'header del pane (`Configuratore › Gruppo › Voce`);
  i breadcrumb interni ai pane vanno **eliminati tutti**.
- Transizione tra pane in crossfade + slide corto, `prefers-reduced-motion` rispettato;
  skeleton durante il fetch.

### 3.3 Save bar e stato dirty
Barra sticky in fondo al pane che appare solo con modifiche pendenti:
"N modifiche non salvate · Annulla · Salva". Cambiando voce con modifiche pendenti →
conferma di abbandono. Ogni salvataggio dà un **toast** (successo/errore reale, mai `catch {}`).

### 3.4 Vincoli non negoziabili (standard Sibylla)
- **Colori**: solo token. `var(--color-*)` o alias SASS (`$primary`, `$border`, `$text-active`,
  `$bg`, `$white`, `$success`, `$warning`, `$error`). **Zero hex** nei `.sass`.
  Trasparenze con `alpha($primary, .1)` (`rgba()` su una CSS var è invalido).
  `confirm/alert/disabled/surface-subtle` esistono **solo** come utility Tailwind (`@apply`),
  non come `--color-*`.
- **Tabelle**: `.sib-table` + `.sib-table-wrap`. Header muted, **case normale, mai uppercase**,
  bordi 1px, niente zebra. Nessuno scroll orizzontale a nessuna larghezza: colonne compatte →
  ellipsis/abbreviazione + tooltip (`TruncatedText`) → `table-layout: fixed` + `colgroup` in %.
  Compattazione via **container query** sul root del pane, non `@media` sul viewport.
- **Form**: sempre i componenti condivisi (`InputField`, `SelectField`, `RadioGroup`,
  `CheckboxField`, `ToggleSwitch`, `TextareaField`, `SearchField`, `DateRangeField`).
  Altezza campi 34px. Label: Poppins 12px, weight 600, colore **primary**, case normale.
  Freccetta select = doppia chevron di `.sib-select`.
- **Date**: intervalli sempre col range picker a due calendari affiancati (mai campi Da/A
  separati, mai testo libero).
- **Elimina**: sempre `useConfirmStore` + `<ConfirmDialog/>`; nessun `window.confirm`;
  nessun cestino inerte.
- **Tooltip**: componente `Tooltip` variant dark (#1E293B, testo bianco), mai `title` nativo.
- **Paginazione**: componente `Pagination`, wrapper **centrato**.
- **Icone tabella**: fa-solid, senza box, blu Platform 16px (arriva gratis con `.sib-table`).
- **Export**: Excel `fa-regular fa-file-xls`, PDF `fa-file-pdf`.
- **Niente inline style**: ogni stile nel `.sass` omonimo, stessa cartella. Mai commento `//`
  in linea su una custom property in `.sass`.
- **Niente riga di stat-card come header di pagina.**
- Header di pagina = `PageHead` (una sola volta, nella shell).
- Dark mode: la sezione deve funzionare in `[data-theme=dark]` (superfici
  `var(--color-surface)`, chrome ri-scurito nello skin, `--color-primary` come accento chiaro).

---

## 4. Requisiti per configuratore (dal PDF)

### 4.1 Mapping camere (§1.1)
Riconduce le tipologie camera locali a uno standard di piattaforma.
Colonne: Camera hotel · Standard Sibylla (select) · Camera di riferimento (radio) · Mapping.
Flusso: struttura → associazione di ogni camera locale allo standard → camera di riferimento → salva.
**Nuove logiche**
- Nella colonna Mapping sostituire la parola "Associato" con un'**icona a spunta**.
- **PMS esterno**: mostrare i nomi delle tipologie camera come definiti nel sistema di
  provenienza; resta possibile associarle a uno standard.
- **PMS Sibylla**: i nomi camera sono attribuiti dall'utente; comando per associarle allo
  standard. Nella pagina "Inventario camere → Allestisci camera" il campo **Nome è read-only**
  (deriva esclusivamente da questo configuratore).

### 4.2 Mapping segmenti (§1.2)
Associa i segmenti commerciali locali ai segmenti standard della piattaforma.
**Nuove logiche** — distinguere PMS Sibylla e PMS esterno:
- **PMS esterno**: mostra i segmenti del PMS; è possibile uniformarli agli standard, ma in
  **Operation i segmenti restano visualizzati col nome originale** (continuità/riconoscibilità).
- **PMS Sibylla**: la lista non deriva da un sistema esterno; viene generata con un comando
  **"+ Nuovo segmento"** che crea segmenti personalizzati con mapping agli standard.
- Mantenere l'indicazione "Parametro associato".

### 4.3 B.A.R. / F.I.T. (§1.3)
Elenco dei livelli/regole B.A.R. e F.I.T. della struttura; fornisce al sistema la somma delle
tipologie camera che compongono la BAR per il calendario tariffario annuale.
**Nuove logiche**
- Nella tabella **solo l'icona occhio**; l'eliminazione resta disponibile **solo tramite il
  cestino** (che compare sulla riga, non in colonna fissa).
- La riga BAR è sempre **illuminata**; al tap va ulteriormente evidenziata (**bold**).
- L'occhio apre il **dettaglio della BAR nella parte destra della schermata** (master-detail,
  **non** una modale).
- A DB esiste la **griglia completa di 450 BAR** definita dalla consulenza. L'eliminazione di
  una BAR da parte dell'utente **non modifica la griglia a DB**: ha effetto solo sul profilo.
  Il totale delle BAR disponibili si aggiorna automaticamente e lo scroll naviga solo le BAR
  presenti nel profilo, **mantenendo coerente la progressione numerica**.
- Il consulente può aggiungere altre BAR a DB dal pannello di controllo; le nuove entrano nella
  griglia di riferimento e diventano disponibili per i profili.

### 4.4 Bottom rate (§1.4)
Soglia tariffaria minima per tipologia camera, per struttura e piano tariffario. Impedisce che
il pricing automatico scenda sotto la soglia. *La logica è già sviluppata.*
**Nuove logiche**
- **Eliminare la colonna "Camera di riferimento"** (già definita in Mapping camere).
- I box dei **piani tariffari (BAR / FIT / Gruppi) vanno spostati dentro la tabella**: il piano
  configurato e attivo evidenziato in **blu**, i non configurati/non attivi in **grigio**.
- **Notifica sotto-soglia**: se entra una prenotazione a valore inferiore al configurato, il
  sistema genera subito una notifica che identifica configurazione/piano tariffario e
  scostamento, associata a **canale + segmento**. Copy di esempio: *"Prenotazione n. XXX
  effettuata dal TO XXX al prezzo di 50 €, a fronte di una BAR configurata di 60 €. A seguito
  del rilevamento dello scostamento, Sibylla provvede automaticamente alla chiusura immediata
  del canale per il segmento interessato, al fine di evitare ulteriori prenotazioni a una
  tariffa inferiore a quella configurata."*
  In fondo alla notifica: **"Riapri canale"** (per utenti autorizzati) e **"Scarica PDF"**.
- Il PDF riporta numero prenotazione, TO/canale, segmento, tariffa applicata, BAR configurata,
  differenza, data e ora, azione effettuata da Sibylla e la dicitura sulla chiusura automatica.

### 4.5 Fasce d'età (§1.5)
Fasce anagrafiche (infanti/bambini/ragazzi + adulti) usate da listini, supplementi, riduzioni.
Gli intervalli devono essere coerenti e non ambigui.
**Nuove logiche**
- **Rimuovere il campo "Posto letto"** → sostituirlo con un **toggle**, con l'**icona di un
  letto** accanto. Allineamento orizzontale coerente tra toggle, icona e contenuti; box
  allineati tra loro sia a livello di struttura sia di contenuti.
- **Rimuovere le "X"** associate a Infanti / Ragazzi / Bambini (nessuna chiusura/rimozione).
- **"Adulti extra" diventa un toggle**, coerente con "Posto letto". La percentuale di riduzione
  è **interattiva all'hover**, con tooltip: **"% rispetto alla tariffa base"**.

### 4.6 Stagionalità (§1.6)
Suddivide il calendario in periodi stagionali collegati a logiche commerciali e tariffarie.
**Nuove logiche**
- Rinominare **"FIT" → "B2B"**.
- **Rimuovere il tasto "Modifica"**.
- Le stagionalità disponibili sono **7**, caricate dal Pannello di Controllo e salvate a DB:
  `LOW SEASON 1`, `LOW SEASON 2`, `MID SEASON 1`, `MID SEASON 2`, `HIGH SEASON 1`,
  `HIGH SEASON 2`, `PEAK SEASON`. L'elenco in interfaccia è **dinamico da DB**.
- **Configurazione periodi**: calendario con selezione **"Da – A"** per definire il periodo di
  validità; poi una **select con le 7 stagionalità** da associare al periodo selezionato.
  Il sistema **impedisce** di selezionare periodi già configurati: nessuna sovrapposizione né
  duplicazione di intervalli; un intervallo già associato non è riselezionabile.
- In basso: **riepilogo read-only** delle stagionalità configurate, che mostri chiaramente la
  relazione periodo ↔ stagionalità.

### 4.7 Scaglioni occupazione (§1.7)
Intervalli percentuali di occupazione usati come driver delle strategie. Gli intervalli non
devono sovrapporsi e vanno gestiti in modo coerente su tutta la scala.
**Nuove logiche**
- **FIT → B2B**.
- **Rimuovere le frecce** (spinner) dentro i box; ridurre dimensioni e spazi interni mantenendo
  leggibilità, per ottimizzare lo spazio verticale.
- Dentro ciascun box, **sulla stessa riga**, solo: **+** per aggiungere una configurazione e
  **cestino** per eliminarla.
- Ridurre lo spazio verticale complessivo, **eliminare la fascia bianca in basso**, minimizzare
  lo scroll verticale.

### 4.8 Finestre prenotazione (§1.8)
Intervalli di booking window (giorni di anticipo). Stessi quattro punti di §4.7
(FIT→B2B, niente frecce, `+`/cestino in linea, meno spazio verticale).

### 4.9 Richieste extra (§1.9)
Richieste extra applicabili alle prenotazioni di gruppo. Tipologia Opzionata / Garantita.
**Nuove logiche**
- **Eliminare il campo "Nome"**.
- **Eliminare le frecce nei box**.

### 4.10 Buffer presenze (§1.10)
Margine di sicurezza su presenze/disponibilità per struttura.
Colonne: Struttura · Licenza ospiti · Maggiorazione licenza · Buffer capienza (toggle ON/OFF).
**Nuove logiche** — struttura e contenuti sono **corretti**: intervenire **solo su grafica e
usabilità** (spaziature, allineamenti, gerarchie visive, dimensionamento, consistenza dei
componenti).

### 4.11 Overbooking limit (§1.11)
Fino a quale livello il sistema può accettare vendite oltre la disponibilità fisica.
Righe per tipologia camera espandibili ("Mostra dettagli"); modale di creazione con
Tipologia camera · Periodo · OverBooking limit (%) · Protection (%).
**Nuove logiche**
- Il configuratore è **bloccato di default** e diventa accessibile **solo dopo** aver
  completato la configurazione e l'applicazione delle **stagionalità** (il limite le richiede).
- Migliorare il frontend.

### 4.12 Vincolo matriosca (§1.12)
Relazioni gerarchiche tra tipologie di camera (upgrade/downgrade/ottimizzazione).
**Nuove logiche**
- Titolo del pop-up: da "Modifica" a **"Configura corrispondenze"**.
- Box **sinistro**: le tipologie di camera **configurate**.
  Box **destro**: le **corrispondenze** tra le camere configurate.
- **"Tipo camera sostitutiva" → "Corrispondenza matriosca"**.

### 4.13 Arrangiamenti (§1.13)
Filtri in alto: **Struttura** e **Segmento** (es. B&B, Gruppi).
Tabella dei trattamenti configurabili con il relativo valore economico: **Room Only,
Colazione, Pranzo, Cena**.
**Nuove logiche**
- Deve essere possibile configurare una **mezza pensione diurna** (colazione + pranzo) e una
  **serale** (colazione + cena).
- Il pulsante **"+"** aggiunge una nuova configurazione, definendo la combinazione tra
  trattamento e pasti associati.

### 4.14 Contratti (§1.14)
**Il configuratore attuale va rimosso.** I template saranno caricati dal **Pannello di
Controllo**, che diventa il punto di gestione dei template disponibili. Il template caricato
sarà poi disponibile nella pagina **"Composizione annunci"** come base per comporre il contratto.
→ Rimuovere la voce dal menu e il pane; verificare i deep link `configuratore:contratti`.

### 4.15 Lotti mapping (§1.15)
Lotti/contingenti: a ciascuna tipologia camera la relativa quantità disponibile.
Schermata organizzata in **due aree distinte: Gruppi** e **B2B**.
Per ogni tipologia camera:
- **Numero di camere**;
- **Stato**: switch **attivo di default** → la campanella è **grigia e non cliccabile**.
  Quando il toggle viene **disattivato**, la campanella diventa **blu e interattiva**; al tap
  l'**animazione blu in movimento** si ferma e il sistema chiede conferma dell'invio della
  richiesta di consulenza via e-mail;
- **Richiesta di consulenza**: icona campanella → e-mail al commerciale Sibylla
  (`commerciale@sibyllanetwork.com`).

**Area Gruppi** — configurazione **per aggregazione**; tabella con:
- **Nome camera** (denominazione), **Tipologia** (tipologia a cui la camera è associata),
  es. `Base doppia | Superior`, `Base doppia | Classic`.
  La tabella è **editabile**: si possono modificare le associazioni e aggiornare la tipologia.

**Area B2B** — di default **attivazione delle tipologie camera**; il campo **"Tipologia camere"
è un multiselect** (una o più tipologie contemporaneamente).

Prevedere un **recap** laterale (come da schizzo).

### 4.16 Market specifics (§1.16)
Specificità/pesi per mercato geografico: elenco nazionalità, campo di ricerca, valore per
mercato, paginazione.
**Nuove logiche**
- Accanto alla voce "Market specific" indicare che la configurazione è **riferita al segmento
  Gruppi**.
- **Rimuovere le frecce** nei box e **ridurne le dimensioni**.
- **Rimuovere il bold** dalle denominazioni delle nazioni.
- Ottimizzare lo stile della tabella (più chiara, ordinata, gradevole).
- Rinominare **"Scontistica" → "Promozione"**.

### 4.17 Listini individuali (§1.17)
Listini per la clientela individuale.
**Non attivabile (grigio) finché non è completata la configurazione delle stagionalità B2B.**
**Nuove logiche**
- In alto due campi: **Struttura** e **Stagionalità**; la loro selezione determina il contesto
  della configurazione.
- Sezione **"Camere Hotel"**: elenco delle camere della struttura — il nome è quello
  **individuato e associato dalla struttura** (non lo standard Sibylla).
- Per ciascuna camera un **campo editabile** che collega la tariffa alla camera.
- Nella parte **laterale** una tabella di **riepilogo calendario**, organizzata per **tipologia
  di camera × stagionalità**: si legge il prezzo della stessa tipologia nelle diverse stagioni.
- Funzione **"Scarica PDF"** della configurazione.

### 4.18 Listini gruppi (§1.18)
Listini per i gruppi. **Non attivabile finché non è completata la configurazione delle
stagionalità gruppi.**
Colonne di riferimento: Lotti · Tariffa adulti · Suppl. adulti · Tariffa studenti · Suppl. studenti.
**Nuove logiche**
- Selezione **alternativa** tra **Struttura** e **Categoria**: se si seleziona Struttura, il
  campo Categoria è **disabilitato e grigio**; e viceversa.
- Parametro **"Distribuzione"**: **Per camera** (tariffa in funzione della camera) oppure
  **Per persona** (in funzione del numero di persone).
- Nel **calendario** vengono mostrate le tariffe alle relative stagionalità.

### 4.19 Politiche di prenotazione (§1.19)
*Segnalato in giallo nel PDF: rivedere copy e front.* La pagina si articola in **tre sezioni**:
1. **Politiche di prenotazione** — tabella: Nome · **Ambito** · Descrizione · Pagamenti ·
   Cancellazione · Mancato arrivo · Termini · Azioni; pulsante "Crea nuova regola".
2. **Termini e condizioni** — testi globali multilingua da associare alle politiche; tabella
   Nome · Descrizione · **Versione** · Stato · Azioni; pulsante **"Crea termini"**.
3. **Gratuità e concessioni** — "Le regole si applicano esclusivamente alle tariffe **per
   persona** e non alle tariffe per camera."

L'attuale pane è il più moderno della sezione (Modal, toast, confirm, TruncatedText,
generazione del documento HTML): **conservare la logica del documento**, ricostruire il layout
(la tabella oggi perde "Stato" e "Azioni") e aggiungere le sezioni 2 e 3.

### 4.20 Voci incasso (§1.20)
Form: Codice incasso · Descrizione · Gruppo · Commissioni (%) · Cod. Fel · Cod. Scel ·
**Gateway** · "+ Aggiungi".
Tabella: **toggle attivo** · Codice incasso · Descrizione · Gruppo · Commissioni · **Gateway** ·
Cod. Fel · Cod. Scel · Azioni (modifica, elimina).
Sezione **Scadenze Sospesi**: Descrizione sospensione · Valore giorni · Fine Mese (toggle) ·
"+ Aggiungi Scadenza", con tabella **"Scadenze Sospesi configurate"** (Descrizione · Giorni ·
Fine Mese · Azioni).

### 4.21 Gateway (§1.21) — NUOVO
Selettore **Struttura**, poi una **card per gateway** (es. **Nexy**, sottotitolo `NEXY`) con:
- badge di stato **"Da configurare"** (arancione) / configurato,
- campo **"API key struttura"** di tipo password con **icona occhio** (mostra/nascondi),
- azione di **salvataggio**.

### 4.22 Configura Outlet (§1.22)
Sale (Nome · Tavoli · Pax · toggle attivo · azioni) e Turni (toggle di sezione; Nome turno ·
Servizio · Dalle · Alle · Sale · azioni).
**Nuove logiche**
- Se **l'outlet non è stato creato, il configuratore è grigio** (bloccato).
- **"Crea outlet" e il configuratore sono da collegare.**
- Attenzione alla sovrapposizione funzionale con le voci F&B Outlet / Sale e tavoli / Turni:
  questa pagina e la sub-app non devono duplicare la stessa configurazione.

### 4.23 Intestazioni fiscali (§1.23) — NUOVO
Intestazioni fiscali della struttura e mapping con i sistemi/hotel collegati.
- Tabella **intestazioni**: Stato (badge **Attivo** / **Predefinito**) · Ragione sociale ·
  Partita IVA · SDI/PEC · **REA** ("Non emessi") · Azioni (modifica, **imposta predefinita**
  (stella), elimina); pulsante **"Nuova intestazione"**.
- Sezione **"Mapping strutture"**: Struttura · Intestazione (select, es. "Predefinito
  aziendale") · Stato · Azioni.
Deve garantire che documenti fiscali e flussi amministrativi usino l'intestazione corretta in
base alla struttura/contesto operativo.
**Nuove logiche**: standardizzare la pagina, migliorare il front.

### 4.24 Business Central (§1.24–1.26) — NUOVO
Selettore **Struttura**, poi tre sezioni (tab o sezioni in sequenza):
1. **Documenti** — tabella Documento · **PostDocument** (toggle) · **Invio automatico**
   (toggle) · Azioni. Righe: Fattura, Nota di credito, Quietanza, Scontrino, Annullamento
   scontrino, Caparra, Reso caparra (con iniziale-badge F/N/Q/S/A/C/R).
2. **Conti Business Central** — tre blocchi, ognuno form + tabella (Tipologia · Numero conto ·
   Azioni), con **Salva** e **Pulisci**:
   - **Conto camera**: Tipologia conto camera (select) + Numero conto;
   - **Anticipo**: Tipologia anticipo (select) + Numero conto;
   - **Conto passante**: Numero conto.
   Empty state: "Nessun conto configurato".
3. **Journal Batch** — tabella Codice incasso · Voce incasso · Cod. SCEL · Cod. FEL ·
   **Stato** (badge **Attivo** / **Da configurare**) · **JournalBatch** (input) · Azioni.

**"RIVEDERE COPY E FRONT"**: copy e front vanno riscritti, non ricopiati.

### 4.25 Personalizza struttura (§1.27)
Riepilogo assegnazioni della struttura: Struttura · **Indirizzo** · Descrizione · Sezionale ·
Check in · Check out · Azioni.
**Nuove logiche**
- **"Località" → "Indirizzo"**.
- Il configuratore **popola automaticamente il Riepilogo Bacheca**: la descrizione mostrata in
  Riepilogo Bacheca è quella inserita qui e lì è **read-only**.
- Si collega a **Network** e al **Planner**, in particolare per gli **orari di check-in e
  check-out**.
- Tramite **pop-up** va segnalata la possibilità di applicare un **sovrapprezzo**, ad esempio
  per **Early check-in** e **Late check-out**. Va verificato l'orologio impostato nel sistema e
  vanno definite le **fasce orarie di riferimento** oltre le quali si applica il sovrapprezzo.

### 4.26 Costi mapping (§1.28) — NUOVO
Mappa le tipologie di costo e attribuisce valori economici alle componenti.
- Selettore **Anno**, azione **"Copia centro di costo"** (era "Copia costi anno"),
  **"+ Aggiungi costo"**.
- Tabella: **Tipologie di costo** · **Impostazione %** con **Costo Variabile %** e **Costo
  Fisso %** · Azioni (modifica, elimina, **conferma/valida** (check)). Paginazione + **Salva**.
- **Modale "Copia costi"**: **Anno da copiare** ↔ (icona scambio) **Seleziona anno**, con
  **Annulla** / **Copia**.
**Nuove logiche**
- Migliorare il front.
- "Copia costi anno" **si rinomina "Copia centro di costo"**.
- Nella select degli anni includere **anche gli anni passati**; **non** includere l'anno attuale.

### 4.27 Food & Beverage (14 voci)
Outlet · Sale e tavoli · Turni di servizio · Categorie · Voci menu · Crea menu · Lista menu ·
Tipi menu · Web menu · Menu del giorno · Allergeni · Arrangiamenti · Categoria ospite ·
Stampanti · Service monitor.
Renderizzate dalla sub-app Outlet Manager (`ConfigPages.jsx`). Da allineare almeno su:
- **nessun secondo page-head** dentro il pane (il titolo lo dà la shell);
- bottoni, tabelle, badge, empty state e modali coerenti col design Platform;
- `fb-arrangiamenti` non ha pagina (placeholder), `fb-crea-menu`/`fb-menu-giorno` e
  `fb-lista-menu`/`fb-web-menu` puntano alla stessa pagina: da risolvere.

---

## 5. Piano di lavoro

1. **Fondazione** — registry dei configuratori (id, label, gruppo, icona, descrizione,
   sinonimi per la ricerca, prerequisiti), kit `src/core/cfg` (`CfgPane`, `CfgToolbar`,
   `CfgTable`, `CfgRangeRules`, `CfgSaveBar`, `CfgLocked`, `CfgEmpty`, `CfgBadge`), shell
   nuova (hub + sidebar a gruppi + command palette + transizioni), store dello stato di
   configurazione e del dirty state.
2. **Pane wave 1 — regole e tariffe**: Scaglioni, Finestre, Richieste extra, Fasce d'età,
   Arrangiamenti, Bottom rate, B.A.R./F.I.T.
3. **Pane wave 2 — stagionalità e listini**: Stagionalità, Listini individuali, Listini gruppi,
   Overbooking limit, Lotti mapping.
4. **Pane wave 3 — mapping e struttura**: Mapping camere, Mapping segmenti, Vincolo matriosca,
   Buffer presenze, Market specifics, Personalizza struttura, Configura Outlet.
5. **Pane wave 4 — amministrazione**: Voci incasso, Gateway, Intestazioni fiscali,
   Business Central, Costi mapping, Politiche di prenotazione.
6. **Pulizia** — rimozione di Contratti, Tipologie basi e dei 6 pane `Fb*` morti; allineamento
   F&B; dark mode; sweep finale sugli standard (token, tabelle, tooltip, conferme).

---

## 6. Stato di consegna (31/08/2026)

Sezione rifatta: **fondazione + 25 configuratori + F&B**, con `tsc --noEmit` pulito, zero
`pageerror` e **nessuno scroll orizzontale a 1600 / 1366 / 1280px** (verificato a schermo,
pane per pane, con harness puppeteer).

### Fondazione
- `registry.ts` — 25 voci main (senza `contratti` e `tipologie-basi`, con i 4 nuovi) + 15 F&B,
  ognuna con gruppo, descrizione, `keywords` per la ricerca e `requires` per il gating.
- `src/core/cfg/` — `CfgPane`, `CfgToolbar`, `CfgTable`, `CfgRangeRules`, `CfgSaveBar`,
  `CfgLocked`, `CfgEmpty`, `CfgBadge` (+ `cfgMotion`).
- `useConfiguratoreStore` — completamento per voce, `isUnlocked`, dirty state.
- Shell: **hub** con le 7 corsie e la progressione, **sidebar a gruppi** con indicatore che
  scorre, **command palette ⌘K** con ricerca per sinonimi, transizioni, un solo titolo.

### Rimosso
`configuratoriList.ts`, `panes/Contratti/` (§1.14), i 6 pane `Fb*` mai importati, i breadcrumb
interni di tutti i pane, il secondo page-head della sub-app F&B, tutti gli hex dai `.sass`.

### Decisioni prese durante il lavoro
- **Listini ↔ Stagionalità**: i due pane Listini non hanno un elenco stagioni proprio. Le
  colonne sono le stagionalità **effettivamente configurate** per il segmento
  (`stagioniDaPeriodi`), quindi Listini e Stagionalità restano allineati per costruzione.
  Con più di 3 stagionalità il calendario di riepilogo passa a larghezza piena, così le
  intestazioni restano su una riga senza troncature.
- **Gating dei Listini reso come «Opzione errore»**: i due pane si aprono sempre sui
  contenuti reali; lo stato di blocco previsto da §4.17/§4.18 vive in un box marcato in
  fondo alla pagina (`_listini/ListiniOpzioneErrore`), con la stessa copy dello stato reale
  e il link **«Completa Stagionalità …»** che porta al prerequisito. Per questo le due voci
  non hanno `requires` nel registry: ce l'avessero, la shell mostrerebbe `CfgLocked` al
  posto della pagina. Il seed della Stagionalità copre entrambi i segmenti (persist v2), così
  i Listini hanno stagionalità a calendario su cui lavorare.
  I pane possono navigare verso un altro configuratore tramite la prop opzionale
  `onGoTo` (`CfgPaneComponentProps`), passata dalla shell a tutti i pane.
- **`InputField` esteso** con `ariaLabel` e `dense` (additivo, nessun impatto sulle pagine
  esistenti): serviva perché i campi dentro le celle non potevano essere né senza label
  accessibile né alti 34px — ed è la ragione per cui erano rimasti `<input>` grezzi.
- **B.A.R./F.I.T.**: il pane è il proprio container query; la soglia di impilamento del
  master-detail è 860px **di pane** (non di viewport). Sopra resta affiancato, sotto scende.
- **Vincolo matriosca**: in riga il bottone dice "Modifica"/"Configura"; "Configura
  corrispondenze" è il titolo del pop-up, come da §4.12.
- Le custom property passate via `style` (`--cfg-*`, `--split`, `--stag-c`, `--fill`) sono
  vettori di dato, non stile: la resa vive nei `.sass`. È il pattern già usato nel repo.

### Aperto
- **Eccezioni volute ai componenti condivisi**: due controlli restano `<input>` con le classi
  standard, perché il componente condiviso non li esprime — il radio "camera di riferimento"
  di Mapping camere (un unico gruppo radio che attraversa tutte le righe) e la checkbox dentro
  il listbox custom del multiselect di Lotti mapping.
- **`InputField` mette `title={value}` sull'input**: è un tooltip nativo, contro lo standard
  (tooltip dark). È pre-esistente e vale per tutta la piattaforma: va corretto nel design
  system, non qui.
- **F&B**: le 14 voci restano servite dalla sub-app Outlet Manager. Allineato solo il doppio
  page-head; `fb-crea-menu`/`fb-menu-giorno` e `fb-lista-menu`/`fb-web-menu` puntano ancora
  alla stessa pagina e `fb-arrangiamenti` non ha pagina (`status: 'soon'`).
- Persistenza: i pane salvano su store persistiti e mock `apiFetchSibylla`, senza backend.
- Da §4.1, fuori da questa sezione: in "Inventario camere → Allestisci camera" il campo
  **Nome** deve diventare read-only, perché deriva da Mapping camere.
