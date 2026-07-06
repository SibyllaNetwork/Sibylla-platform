# Regole UI — pagine Sibylla platform

## 1. Tabelle responsive (NIENTE scroll orizzontale fino al laptop)

**Obiettivo:** a 1366px con sidebar aperta (area contenuto ~1056px) la tabella
deve stare senza scroll-x. Sopra questa soglia, dimensioni STANDARD.

**Regola d'oro:** usare una **container query** sul root della pagina, MAI una
`@media` sul viewport. Il viewport ignora la sidebar: un laptop 1440/1536 con
sidebar aperta ha ~1130/1230px di contenuto → la tabella standard va in overflow,
ma `@media (max-width:1366px)` NON scatta → scroll. La container query misura la
larghezza reale del contenuto e funziona a ogni risoluzione.

```sass
// Root della pagina
.mia-pagina
  container-type: inline-size
  container-name: mia-pagina

  // Compatta SOLO sotto soglia (≈ min-content della tabella a dim. standard).
  // Scoped alla pagina: lo standard globale .sib-table resta invariato.
  @container mia-pagina (max-width: 1360px)
    .sib-table
      font-size: 12px            // standard 13px
      thead th
        font-size: 11px          // standard 12px
      th, td
        padding-left: 4px        // standard ~12px
        padding-right: 4px
      .sib-btn--icon             // colonne con molte icone (azioni) = voce più pesante
        width: 24px              // standard 36px
        height: 24px
        font-size: 12px
      td .flex                   // gap tra icone d'azione
        gap: 1px
```

**Vincoli tassativi:**
- Compattare **SOLO con le dimensioni** (font, padding, dimensione icone/bottoni).
- **NON** abbreviare le intestazioni di colonna, **NON** aggiungere menu "…"/overflow,
  se non esplicitamente richiesto: le etichette restano complete.
- Sopra la soglia: tutto torna alle dimensioni standard.
- Verificare a 1366 / 1440 / 1536 con sidebar aperta (overflow 0) e a 1920 (standard).

## 2. Colori & token
- I colori sono **CSS custom properties** `--color-*` / token SASS (`$primary`, `$border`…).
  MAI hex hardcoded, MAI `rgba($tokenVar, …)` (i token sono `var(...)`, non colori SASS).
- MAI inline style: ogni stile nel file `.sass` con lo stesso nome del componente.

## 3. Componenti condivisi
- MAI `<select>/<input>`/label custom: usare i componenti condivisi
  (SelectField, InputField, RadioGroup, SearchField, Modal, Pagination…).
- **Label form:** Poppins 12px, weight 600, `color: primary`, case normale (MAI uppercase).

## 4. Tabelle (standard)
- Classe `.sib-table` / `.sib-table-wrap`. Bordi 1px, header muted **case normale**
  (MAI uppercase), niente zebra.
- Testo celle/intestazioni **su una riga**: ellipsis o abbreviazione + **tooltip**
  col testo completo (componente `TruncatedText` / `Tooltip` variant dark).

## 5. Paginazione
- Componente `Pagination` sempre **centrato** (`justify-content: center`).

## 6. Conferme / eliminazioni
- Ogni "Elimina" richiede una **modale di conferma** (mai delete immediata, mai `window.confirm`).
- Tooltip standard: sfondo scuro `#1E293B`, testo bianco (componente `Tooltip`, non il `title` nativo).

## 7. Layout pagina
- MAI righe di stat-card/box riepilogativi come header di pagina: eventuali totali
  vanno integrati nel contenuto (riga sotto tabella, badge inline).
- Bottone "Indietro" (`BtnBack`) allineato a sinistra sopra il titolo, larghezza
  intrinseca, MAI full-width.
- Selezione di intervalli di date: sempre col range picker a due calendari affiancati
  (react-day-picker, mode=range), mai campi Da/A separati.
