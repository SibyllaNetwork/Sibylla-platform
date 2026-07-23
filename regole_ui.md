# Regole UI & Standard — Sibylla platform

> **Queste regole sono TASSATIVE e vanno SEMPRE applicate, in OGNI intervento**
> (pagine nuove, modifiche, refactor, bugfix). Valgono per tutte le pagine —
> presenti, passate e future — e vanno applicate proattivamente, non solo quando
> si tocca la pagina interessata. In caso di dubbio, prevalgono su qualsiasi
> abitudine o scorciatoia.

> ## ⛔️ MAI CSS INLINE
> **Il CSS NON deve MAI essere scritto inline.** Nessun attributo `style={{…}}` /
> `style="…"` sui componenti — nessuna eccezione, nemmeno per tweak minimi. **OGNI
> stile va in un file `.css` dedicato. Dettagli in §3.

Indice:
1. [Principi fondamentali](#1-principi-fondamentali)
2. [Componenti condivisi](#2-componenti-condivisi)
3. [Stili, CSS e token colore](#3-stili-css-e-token-colore)
4. [Header di pagina e bottone Indietro](#4-header-di-pagina-e-bottone-indietro)
5. [Layout di pagina](#5-layout-di-pagina)
6. [Campi form](#6-campi-form)
7. [Tabelle](#7-tabelle)
8. [Responsività su laptop — niente scroll orizzontale](#8-responsività-su-laptop--niente-scroll-orizzontale)
9. [Icone nelle tabelle](#9-icone-nelle-tabelle)
10. [Paginazione](#10-paginazione)
11. [Conferme, eliminazioni e tooltip](#11-conferme-eliminazioni-e-tooltip)

---

## 1. Principi fondamentali

Tre regole non negoziabili che stanno alla base di tutto:

1. **Componenti condivisi SEMPRE.** Ogni elemento della UI deve usare il componente
   condiviso. Se non esiste, NON improvvisare: si crea il componente condiviso
   (condividendo la scelta con l'utente). → §2
2. **MAI CSS inline.** Nessun `style={{…}}` / `style="…"`. Ogni stile vive in un file
   `.css` dedicato. → §3
3. **Solo token colore.** Mai hex hardcoded, mai `rgba()` di una CSS var. → §3

---

## 2. Componenti condivisi

- **Per OGNI elemento della UI vanno SEMPRE usati i componenti condivisi** di
  `src/core/components` (e `core/components/form`): `SelectField`, `InputField`,
  `RadioGroup`, `CheckboxField`, `ToggleSwitch`, `TextareaField`, `SearchField`,
  `DateRangeField`, `Modal`, `Pagination`, `Tooltip`, `TruncatedText`, `PageHead`,
  `BtnBack`, `StatusBadge`, `ConfirmDialog`, ecc.
- **MAI** ricreare a mano `<select>`, `<input>`, label o altri controlli custom.
- **Se il componente condiviso NON esiste: NON improvvisare** — va CREATO come
  componente condiviso, **condividendo la scelta con l'utente** prima di procedere.
- Se manca una funzione a un componente esistente, si **estende il componente
  condiviso**, non si fa un workaround locale.
- Se un componente non rispetta lo standard, si corregge il **componente** (così
  cambia ovunque), non la singola pagina.

**Perché:** lo standard vive *dentro* il componente. Usando i componenti, un cambio
di standard si fa una volta sola e si propaga a tutte le pagine.

---

## 3. Stili, CSS e token colore

### CSS inline — VIETATO (regola tassativa, nessuna eccezione)
- Vietato l'attributo `style={{…}}` / `style="…"` sui componenti.
- OGNI stile va in un file `.css` dedicato, importato in testa al `.tsx`. Anche i
  tweak minimi (`display:none`, `marginTop:8`) vanno in classi `.css`.
- Convenzione file `.css`: header di commento + classi BEM con prefisso modulo
  (es. `.reset-profili__stub-badge`).
- Per uno stile dinamico runtime (es. colore derivato da dati): usare CSS custom
  property o `data-attribute` + selettori CSS; l'inline resta l'ultima spiaggia e va
  motivato in commento.

### Colori & token
- I colori sono **CSS custom properties** `--color-*` (es. `--color-primary`,
  `--color-border`, `--color-error`). **MAI hex hardcoded.**
- Per un colore **semitrasparente** tematizzabile da un token NON scrivere
  `rgba(var(--color-primary), .08)`: è **CSS invalido** (`rgba()` non accetta una
  `var()` come primo argomento → la regola viene scartata). Usare invece
  **`color-mix(in srgb, var(--color-primary) 8%, transparent)`** oppure definire un
  token dedicato (es. `--color-focus-ring`).
- Per un colore ricorrente come *valore* (box-shadow, gradiente, custom property)
  usare sempre i token reali `--color-*`, mai un letterale hex.
- I commenti nei file `.css` sono solo `/* … */` (mai `//`).
- **Tutti i bordi sono 1px**, mai 1.5px (regola globale piattaforma).

---

## 4. Header di pagina e bottone Indietro

- **Usare SEMPRE il componente condiviso `PageHead`** (`src/core/components/PageHead.tsx`),
  MAI `<BtnBack/> + <PageHeader/>` sciolti. Titolo, sottotitolo e ingombri devono essere
  IDENTICI su tutte le pagine (riferimento: **Match Zone**).
- Layout `PageHead`: griglia a 3 zone `1fr auto 1fr` su **una sola riga** →
  **Indietro a sinistra**, **titolo+sottotitolo centrati** rispetto alla pagina,
  **azioni a destra**.
- Valori standard: **titolo 24px**, **sottotitolo 13px**, gap header→contenuto **20px**.
- Props: `title`, `subtitle?`, `eyebrow?`, `back?` (default true), `backLabel?`,
  `onBack?`, `actions?`, `className?`.
- **Bottone Indietro (`BtnBack`)**: allineato a **sinistra**, larghezza **intrinseca**
  (inline-flex), **MAI full-width** né stirato. Stile: senza bordo, freccia Solid
  (`fa-solid fa-arrow-left`); all'hover sfondo blu Platform + testo bianco (definito
  una volta sulla classe condivisa `.sib-btn--back`).
- **Eccezioni volute** (header custom, non migrare): microsite **Agorà**, **Planner**,
  **GiornaleImpresa**, **FatturaDocumento**, area **Catalogo** (Cart/Pagamento/
  ProdottoDettaglio).

---

## 5. Layout di pagina

- **MAI righe di stat-card / box riepilogativi come header di pagina** (tipo
  "Saldo / Entrate / Uscite / N° movimenti"): sono rumore visivo. Eventuali totali
  vanno integrati nel contenuto (riga totali sotto la tabella, badge inline).
  Eccezione solo se richiesto esplicitamente per quella pagina.
- **Selezione di intervalli di date**: SEMPRE col **range picker a due calendari
  affiancati** — componente condiviso **`DateRangeField`**
  (`src/core/components/form/DateRangeField.tsx`, react-day-picker `mode="range"`,
  `numberOfMonths={2}`, `weekStartsOn={1}`, `locale={it}`). **MAI** campi Da/A separati.

---

## 6. Campi form

- **Altezza standard input/select = 34px** su tutte le pagine.
  - Eccezione consapevole: **Nuova prenotazione** usa campi cella a **28px** (pagina densa).
- **Label form**: font **Poppins, 12px, weight 600, `color: var(--color-primary)`** (navy), case
  normale (es. "Struttura", "Anno"). **MAI uppercase, MAI letter-spacing.** Lo stile
  vive nei componenti `SelectField`/`RadioGroup`: usarli direttamente quando possibile.
- **Freccetta dei `<select>`**: SEMPRE la **doppia-chevron su/giù** di `.sib-select`.
  I select stilizzati con `.sib-input` (celle tabella) mostrano la freccia nativa del
  browser e vanno uniformati aggiungendo il chevron SVG standard (stessa SVG/posizione
  di `.sib-select`). Dove possibile preferire direttamente `SelectField`.

---

## 7. Tabelle

Stile canonico implementato nella classe condivisa **`.sib-table` / `.sib-table-wrap`**
— LO standard piattaforma. Per una tabella nuova o da uniformare:
`className="sib-table"` (+ `.sib-table-wrap` se non già dentro una card bordata).

- **Bordi (tutti 1px):** wrapper `1px solid var(--color-border)`, radius 6px, overflow
  hidden; header→body border-bottom 1px; divisori tra righe `#eef0f3`; ultima riga
  senza border; footer "+ Aggiungi" `border-top: 1px dashed`.
- **Header di colonna:** case normale con **iniziale maiuscola** (es. "Nome",
  "Reparto"), **MAI uppercase, MAI letter-spacing**. `12px`, `font-semibold`,
  colore muted (`text-ink-muted`).
- **Niente zebra striping.** Righe body sempre **bianche** / `var(--color-surface)`,
  **nessun hover background**. Eventuali righe "speciali" restano bianche (al massimo
  separate con un border).
- **Testo SEMPRE su UNA riga (regola tassativa) — MAI andare a capo.** In tutte le
  tabelle, sia i titoli di colonna sia le celle non possono mai occupare più di una
  riga (`white-space: nowrap`).
  - Se il testo supera lo spazio della riga, va **troncato poco prima della fine**,
    con i **puntini di sospensione** (ellipsis) e SEMPRE una **tooltip standard**
    (§11) che all'hover mostra il **testo completo**.
  - In alternativa all'ellipsis è ammessa l'**abbreviazione puntata** (es. "Mancato
    arrivo" → "M. arrivo", "Non Rimborsabile" → "Non Rimb."): anche in questo caso è
    obbligatoria la tooltip col testo completo.
  - Usare il componente condiviso **`TruncatedText`** (`src/core/components/TruncatedText.tsx`):
    `text` = testo mostrato (eventualmente abbreviato), `full` = testo completo per la
    tooltip, `className` per la `max-width` della colonna. Mostra la tooltip in
    automatico quando il testo va in overflow OPPURE quando `full` ≠ `text`.
- **Struttura:** preferire CSS Grid a `<table>` per layout semplici.
- Deroghe consapevoli allo standard tabella solo per griglie/matrici/calendari e
  tabelle di confronto in modale.

---

## 8. Responsività su laptop — niente scroll orizzontale

**Regola tassativa e universale:** **nessun contenuto della pagina deve avere scroll
orizzontale fino alle dimensioni di un laptop** (tabelle, toolbar, card, griglie,
pannelli affiancati…). Vale ovunque, su tutte le pagine — presenti, passate e future —
e va applicata proattivamente, non solo quando si tocca la pagina.

**Soglia di riferimento:** a **1366px con sidebar aperta** l'area contenuto è ~**1056px**
(sidebar ≈ 260px + padding contenuto). Fino a lì tutto deve rientrare senza scroll-x.
**Sopra la soglia** icone, font, padding e ingombri **restano quelli standard** (mai
rimpicciolire ovunque): la compattazione scatta SOLO quando serve.

**Regola d'oro: usare una CONTAINER QUERY sul root della pagina, MAI una `@media`
sul viewport.** Il viewport ignora la sidebar: un laptop 1440/1536 con sidebar aperta
ha ~1130/1230px di contenuto → il contenuto a dimensioni standard va in overflow, ma
`@media (max-width:1366px)` NON scatta → scroll. La container query misura la larghezza
reale del contenuto e funziona a ogni risoluzione. Sul root pagina:
`container-type: inline-size` + `container-name: <pagina>`; compattazione dentro
`@container <pagina> (max-width: ~1360px)` (soglia = min-content del contenuto a
dimensioni standard).

```css
/* Root della pagina */
.mia-pagina {
  container-type: inline-size;
  container-name: mia-pagina;
}

/* Compatta SOLO sotto soglia (≈ min-content della tabella a dim. standard).
   Scoped alla pagina: lo standard globale .sib-table resta invariato. */
@container mia-pagina (max-width: 1360px) {
  .sib-table { font-size: 12px; }             /* standard 13px */
  .sib-table thead th { font-size: 11px; }    /* standard 12px */
  .sib-table th,
  .sib-table td { padding-inline: 4px; }      /* standard ~12px */
  .sib-table .sib-btn--icon {                 /* colonne con molte icone (azioni) = voce più pesante */
    width: 24px;                              /* standard 36px */
    height: 24px;
    font-size: 12px;
  }
  .sib-table td .flex { gap: 1px; }           /* gap tra icone d'azione */
}
```

**Vincoli tassativi:**
- Risolvere **SOLO con le dimensioni** (font, padding, dimensione icone/bottoni, larghezza
  dei campi). Mai eliminare informazione.
- **NON abbreviare le intestazioni di colonna**, **NON** aggiungere menu "…"/overflow
  se non esplicitamente richiesto: le etichette restano complete.
- Sopra la soglia: tutto torna alle dimensioni standard.
- Nelle **tabelle**: il testo **non deve mai andare a capo** (`white-space: normal` non
  ammesso). Ordine di intervento se la sola compattazione non basta: 1) container query;
  2) ellipsis (troncamento + puntini) o abbreviazione puntata **+ tooltip** col testo
  completo (§7).
- Nelle **toolbar/filtri** che devono stare su una riga: `flex-wrap: nowrap`, il campo
  Cerca come elastico (`flex: 1 1 …; min-width`), e sotto soglia comprimere anche
  badge/select/date.
- Verificare a **1366 / 1440 / 1536** con sidebar aperta (overflow 0) e a **1920**
  (dimensioni standard). Riferimenti d'implementazione: **OspitiInCasa**, **AnnunciTable**.

---

## 9. Icone nelle tabelle

- **Dentro la tabella** (icone informative di cella E bottoni-azione): stile **Solid**
  (`fa-solid`), **senza bordo/box** (sfondo trasparente), colore **blu Platform =
  `var(--color-primary)` = #204769**, **16px**.
- Per i bottoni-azione: la classe `sib-btn--icon` forza grigio 12px e box; va tolto il
  box e impostato colore/size **direttamente sull'`i`** (`color: var(--color-primary);
  font-size: 16px`) tramite una classe scoped (es. `ospiti-casa__act-btn`).
- **Fuori dalla tabella** (toolbar / accanto al form: export PDF/XLS, avvisi): stile
  **Regular** (`fa-regular`), **box/bordo mantenuto** (`sib-btn--icon`), colore blu
  Platform #204769, 16px (colore e size sull'`i`).
- Riferimento: pagina **Ospiti in casa**. Eccezioni note: **Planner** (resa propria) e
  colonna Ospiti di **Arrivi e partenze**.

---

## 10. Paginazione

- Componente condiviso **`Pagination`** (`core/components/Pagination`), il wrapper
  SEMPRE **centrato** (`justify-content: center`). Mai a destra/sinistra.

---

## 11. Conferme, eliminazioni e tooltip

- **Ogni azione "Elimina" richiede una modale di conferma.** Il click NON elimina
  subito: apre sempre un alert di conferma; si procede solo dopo conferma esplicita
  ("doppia conferma"). **Mai `window.confirm` nativo.**
  - Meccanismo condiviso: store `useConfirmStore` →
    `if (await confirm({ title, message })) { /* elimina */ }`; componente
    `<ConfirmDialog/>` (montato una volta in `sibylla_dashboard.tsx`; pulsante
    distruttivo `sib-btn--danger`, label "Elimina"/"Annulla").
  - Nei mount separati (es. AgoraShell) che non condividono l'albero React va montato
    un `<ConfirmDialog/>` anche lì (lo store zustand è già globale).
- **Tooltip standard**: usare il componente condiviso **`Tooltip`**, MAI il `title=`
  nativo (OS-styled, non conforme).
