# Schema obbligatorio di ogni scheda pagina (Human Resources)

Queste schede servono a un altro team, e al suo agente AI, per **riprodurre identiche** le pagine HR di Sibylla Platform: frontend e backend. "Identiche" significa: stessi testi, stessa disposizione, stesse misure, stessi colori, stessi stati, stessi effetti, stesse regole, stessa responsività. Chi legge **non ha accesso a questo repository**: tutto quello che serve va scritto qui.

## Regole di scrittura

- Italiano. Testi dell'interfaccia riportati **esattamente** come nel codice, tra virgolette «…»: titoli, sottotitoli, label, placeholder, opzioni delle select, intestazioni di colonna, tooltip, stati vuoti, toast (titolo + testo), testi delle modali di conferma, messaggi di validazione.
- Numeri esatti presi dai `.sass` e dal JSX: px, %, colonne di griglia, larghezze di colgroup, font-size, font-weight, radius, ombre, durate ed easing delle transizioni, soglie delle container query.
- Colori come **token** (`--color-primary`, `--chart-1`…) e, la prima volta che compaiono, anche come valore esadecimale del tema chiaro. I valori stanno in `src/styles/_themes.sass`, che va letto.
- Niente invenzioni. Se un comportamento oggi è simulato lato frontend (dati mock, store `zustand` persistito in `localStorage`), scrivilo esplicitamente e descrivi il **contratto backend** che lo deve sostituire.
- Ogni regola di business con la formula o la condizione precisa, ad esempio: «residuo = ferieAnnue − godute − (giorni se in attesa)».
- Per ogni interazione: trigger (clic, hover, tasto destro, trascinamento, tastiera), risultato, eventuale conferma con il testo esatto, toast e aggiornamento dei dati.
- Elenca in fondo i **file sorgente** letti, con percorso relativo.

## Sezioni (in quest'ordine, tutte presenti; se una non si applica scrivi «Non applicabile» e perché)

1. **Scopo e utenti**: a cosa serve la pagina e chi la usa (ufficio del personale, responsabile HR…).
2. **Accesso**: id della pagina/route, voce di menu e percorso nella sidenav, breadcrumb, deep link (es. `hr-configurazione:hr-ccnl`), da quali altre pagine ci si arriva e verso quali si naviga.
3. **Layout**: struttura dall'alto in basso con wireframe ASCII. Header (PageHead), toolbar, contenuto, modali e popover. Per ogni blocco: dimensioni, griglia, allineamenti, gap e padding.
4. **Elementi e testi**: elenco completo di controlli, colonne, celle, badge e icone (classe Font Awesome esatta, es. `fa-solid fa-paper-plane`), con i testi esatti.
5. **Stati e interazioni**: stato iniziale e default, filtri, ordinamenti, paginazione, selezioni, menu contestuali, trascinamento, modali passo passo (campi, validazioni con messaggio, pulsanti), conferme, toast, stati vuoti, caricamento ed errore.
6. **Dati e regole di business**: entità e campi con tipo, calcoli e formule, condizioni, ordinamenti; dati demo/seed se la pagina li usa (quanti e quali); persistenza attuale (chiave `localStorage`, versione del persist).
7. **Backend da realizzare**: endpoint REST proposti (metodo, percorso, request e response JSON d'esempio, errori), con la stessa semantica delle azioni del frontend. Indica quali operazioni sono transazionali o generano notifiche (App Op!, Centro notifiche).
8. **Stile**: per ogni classe BEM rilevante, i valori CSS effettivi (colori/token, font, dimensioni, bordi, radius, ombre, stati hover/active/disabled/focus). Includi le varianti del tema scuro se esistono (`[data-theme=dark]`).
9. **Responsività**: container query o media query con soglie esatte e cosa cambia; vincoli: nessuno scroll orizzontale nelle tabelle, ellipsis con tooltip, cosa si compatta su laptop (1366 px con sidebar aperta) e su schermi larghi (1920 px).
10. **Effetti e animazioni**: transizioni (proprietà, durata, easing), animazioni d'ingresso, hover, focus, skeleton e spinner, `prefers-reduced-motion`.
11. **Accessibilità**: ruoli ARIA, aria-label, gestione da tastiera (Esc, Invio, frecce), focus.
12. **Criteri di accettazione**: checklist numerata e verificabile («1. Con il filtro X compare Y…»), almeno 10 punti per pagina, che coprano testi, regole, responsività ed effetti.
13. **File sorgente**: elenco dei file letti.

## Convenzioni globali da non ripetere in ogni scheda

Stanno in `00-fondamenta.md` (design system, componenti condivisi, regole UI) e in `01-modello-dati-e-api.md` (entità, store, regole trasversali, API). Nelle schede **rimanda** a quei file per i componenti condivisi, ma descrivi tutto quello che è specifico della pagina: props usate, varianti, testi.
