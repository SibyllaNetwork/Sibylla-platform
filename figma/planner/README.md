# Planner — ricostruzione Figma

Ricostruzione pixel-perfect della pagina **Planner** (Operation › Front office › Board › Planner)
e dei suoi stati/modali, realizzata in Figma a partire dall'app reale.

## File Figma (condivisibile)

- **URL:** https://www.figma.com/design/9nGxvXLpCH2XM6PvwqCnvv
- Team: *Sibylla s.r.l*
- Il file contiene i frame **vettoriali ed editabili** (componenti, variabili colore, testo Poppins).
  È la versione da girare al collega: apri il link e usa *Share* in Figma per dargli accesso.

> Nota: il file è nato nei *Drafts*. Per condividerlo imposta la visibilità da Figma
> (Share → *Anyone with the link* / invito diretto).

## Contenuto della cartella `svg/`

| File | Cosa | Formato |
|------|------|---------|
| `02-planner.png` | Pagina Planner completa (topbar, sidebar, filtri, mappa struttura, timeline, pannello Info) | PNG 1600×1000 |
| `01-planner-modale-legenda.svg` | Modale **Legenda** (stati camera/prenotazione) | SVG |
| `03-planner-pannello-info-selezionata.svg` | Pannello **Info** con prenotazione selezionata | SVG |
| `04-planner-menu-contestuale.svg` | Menu contestuale (tasto destro) su una prenotazione | SVG |
| `05-planner-modale-richieste-operative.svg` | Modale **Richieste operative** (TO → Hotel) | SVG |
| `06-planner-parcheggio.svg` | Pannello **Parcheggio** (prenotazioni sospese) | SVG |

`reference/planner-full.jpg` — screenshot dell'app reale usato come riferimento.

## Perché la pagina Planner è PNG e non SVG

Gli stati/modali sono esportati come **SVG editabile** (testo + vettori). La schermata
completa del Planner è invece fornita come **PNG ad alta risoluzione**: la sua esportazione
SVG (~78 KB) non era trasferibile su file in modo affidabile tramite questo canale.
La versione **vettoriale e modificabile** della pagina intera resta comunque nel file Figma
qui sopra (frame *Planner — Full Screen*), da cui è possibile ri-esportare l'SVG con
*Export → SVG* direttamente da Figma.

## Token e specifiche (dal codice)

- Colori: primary `#204769`, scala p50–p800, text `#4A4D53/#6E7175/#A9AAAD`, link `#5C9CD4`,
  ok `#00CF86`, error `#FF616E`, alert `#F57D03`.
- Stati prenotazione (barre): confermata `#7A1515`, opzione `#C69520`, no-show `#7B5EA7`,
  check-in `#1A6B3C`/`#2E9959`, check-out `#CFCFCF`, manutenzione `#B8B8B8`, pulizia `#9DD7E8`.
- Layout timeline: colonna camera 186px, colonna giorno 88px, riga 46px, barra 26px.
- Font: **Poppins**.
