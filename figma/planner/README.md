# Planner — ricostruzione Figma

Ricostruzione pixel-perfect della pagina **Planner** (Operation › Front office › Board › Planner)
e dei suoi stati/modali, realizzata in Figma a partire dall'app reale.

## File Figma (condivisibile, editabile)

- **URL:** https://www.figma.com/design/9nGxvXLpCH2XM6PvwqCnvv
- Team: *Sibylla s.r.l*
- Contiene i frame **vettoriali ed editabili** (componenti, variabili colore, testo Poppins).
  È la versione da girare al collega: apri il link e usa *Share* in Figma per dargli accesso.

> Il file è nei *Drafts*: per condividerlo imposta la visibilità da Figma
> (Share → *Anyone with the link* / invito diretto).

## Contenuto della cartella `svg/`

Tutti i file sono **SVG self-contained** (testo vettorializzato): si vedono identici in
qualsiasi browser/editor **senza dover installare il font Poppins**.

| File | Cosa |
|------|------|
| `02-planner.svg` | **Pagina Planner completa** (topbar, sidebar, filtri, mappa struttura, timeline camere×giorni con barre, pannello Info, footer Riepilogo) |
| `01-planner-modale-legenda.svg` | Modale **Legenda** (stati camera/prenotazione) |
| `03-planner-pannello-info-selezionata.svg` | Pannello **Info** con prenotazione selezionata |
| `04-planner-menu-contestuale.svg` | Menu contestuale (tasto destro) su una prenotazione |
| `05-planner-modale-richieste-operative.svg` | Modale **Richieste operative** (TO → Hotel) |
| `06-planner-parcheggio.svg` | Pannello **Parcheggio** (prenotazioni sospese) |

`reference/planner-full.jpg` — screenshot dell'app reale usato come riferimento.

> Nota: gli SVG hanno il testo convertito in tracciati (per l'indipendenza dai font).
> Per una versione con **testo editabile** ri-esporta da Figma (Export → SVG, deselezionando
> "Outline text"), oppure lavora direttamente sui frame nel file Figma qui sopra.

## Token e specifiche (dal codice)

- Colori: primary `#204769`, scala p50–p800, text `#4A4D53/#6E7175/#A9AAAD`, link `#5C9CD4`,
  ok `#00CF86`, error `#FF616E`, alert `#F57D03`.
- Stati prenotazione (barre): confermata `#7A1515`, opzione `#C69520`, no-show `#7B5EA7`,
  check-in `#1A6B3C`/`#2E9959`, check-out `#CFCFCF`, manutenzione `#B8B8B8`, pulizia `#9DD7E8`.
- Layout timeline: colonna camera 186px, colonna giorno 88px, riga 46px, barra 26px.
- Font: **Poppins**.
