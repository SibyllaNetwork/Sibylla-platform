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
12. [Carrello e acquisti](#12-carrello-e-acquisti)
13. [Pagine BI e grafici](#13-pagine-bi-e-grafici)

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

---

## 12. Carrello e acquisti

- **Un solo carrello di piattaforma.** Lo stato del carrello vive nello store condiviso
  **`useCartStore`** (`src/store/useCartStore.ts`) ed è aperto dall'**icona carrello in
  Topbar** (rotta `catalogo-cart`, "Il Mio Carrello"). Il carrello mostra TUTTI i tipi
  di item: prodotti, soggiorni (`stay`), servizi.
- **Ogni pagina che prevede "aggiungi al carrello"** deve scrivere in `useCartStore`
  (`addProduct` / `addStay` / `addService`) e, per "vai al carrello", navigare a
  **`catalogo-cart`**. **MAI** creare carrelli locali/paralleli o mandare l'utente a un
  carrello diverso.
- **Pagamento**: dal carrello si passa alla pagina **`catalogo-pagamento`** (form carta di
  credito con anteprima, gestione **acconto**/saldo, indirizzo di spedizione e recapiti).
  Importo, acconto, metodo e articoli viaggiano nello store **`useCheckoutStore`**.
- **Eccezione nota:** la sotto-app **Agorà** ha un proprio `CartContext` interno (shell
  separata con Design System dedicato); dove possibile scrive anche nello store globale
  (es. `AccommodationsPage` fa dual-write). L'unificazione completa dell'Agorà è un
  refactor a parte.

---

## 13. Pagine BI e grafici

Le pagine di business intelligence (overview, analysis, trend, benchmark) seguono
tutte le regole precedenti **più** queste, e si costruiscono SOLO con il kit
condiviso **`src/core/bi`** (`BiPage`, `ChartCard`, `KpiTile`, `DeltaBadge`,
`Sparkline`, `BiLegend`, `ChartTooltip`, `BiVerticalTabs`, `BiGlossaryRail`,
`BiDataStamp`, `useFitRows`, `useCountUp`, parametri in `chartTheme`).
Riferimenti d'implementazione: **Monthly trend**, **Executive overview**.

### Tutto in una schermata, zero scroll (regola tassativa)
- Una pagina BI **non deve mai scrollare**, né in verticale né in orizzontale: tutto
  ciò che serve sta in **una schermata**.
- Impianto: `BiPage` (righe `[header · toolbar · corpo]`, corpo a griglia con
  `min-height: 0`, tracce in `minmax(0, …)`, `overflow: hidden`). La griglia della
  singola pagina si dichiara nel `.sass` di pagina via `gridClassName`.
- I grafici riempiono l'altezza disponibile (`ResponsiveContainer height="100%"`),
  non hanno altezze fisse in px.
- Le **tabelle di dettaglio** non stanno in fondo alla pagina (allungherebbe): vivono
  nella stessa card dietro i **tab verticali** (`BiVerticalTabs`, es. Trend/Dettaglio),
  con righe per pagina calcolate da **`useFitRows`** (misura lo spazio reale) e
  `Pagination` centrata. Mai scroll interno per mostrare le righe. I tab verticali
  portano **solo testo**, centrato nel rail: nessuna icona.
- Perché il conto di `useFitRows` regga, nelle tabelle di dettaglio le celle stanno su
  **una riga** (`white-space: nowrap` + ellipsis, larghezze in % con `colgroup`): un
  numero che va a capo alza la riga e fa sbordare la tabella.
- Unica eccezione allo scroll: il pannello della legenda acronimi, se le voci
  superano l'altezza disponibile.

### Fascia KPI in cima — deroga esplicita alla §5
- Nelle **sole pagine BI** è ammessa (e attesa) una fascia di indicatori in cima:
  `KpiTile` = etichetta + valore + variazione + micro-andamento. Non è la "riga di
  stat-card" vietata dalla §5, che sono box con un numero e nulla più.
- Fuori dalle pagine BI la §5 resta valida senza eccezioni.

### Legenda degli acronimi — obbligatoria
- Ogni pagina BI monta **`BiGlossaryRail`** (linguetta "Legenda" sul lato destro):
  apre acronimo · descrizione · modalità di calcolo.
- I testi stanno nel dizionario condiviso **`core/bi/biGlossary.ts`**: la pagina
  dichiara solo le chiavi che le servono. Una metrica si definisce **una volta** e
  vale su tutta la piattaforma; niente glossari copiati per pagina.

### Colore dei grafici
- **Solo i token `--chart-*`** (definiti per tema in `_themes.sass`, ri-gradinati per
  la dark mode): mai hex nei componenti, mai colori d'interfaccia usati come serie.
- Palette categoriale a **8 slot in ordine fisso** (`series(i)`): gli slot si
  assegnano **in sequenza** e non si riciclano mai — dalla nona serie si aggrega in
  **"Altro"**. L'ordine è il meccanismo di sicurezza per i deficit di visione colore
  (validato su banda di luminosità, chroma, separazione protanopia/deuteranopia e
  contrasto ≥ 3:1 su superficie chiara e scura), quindi **non si riordina a gusto**.
- Il colore segue **l'entità**, non la posizione in classifica: un filtro che cambia
  il numero di serie non deve ricolorare quelle che restano.
- **Barre nominali** (segmenti, agenzie, reparti): tutte con la **stessa tinta** —
  la lunghezza porta già il valore, il colore non deve ri-codificarlo.
- Ruoli riservati: `CHART.ly` (anno precedente, neutro), `CHART.forecast`
  (previsione, sempre **tratteggiata**), `CHART.good`/`CHART.bad` (stato: mai come
  "serie N", sempre con freccia + testo → `DeltaBadge`).
- Il **colore di stato si usa solo dove il segno ha un significato**: costi sopra il
  budget perché si è venduto di più non sono un errore, e dipingerli di rosso mese per
  mese non informa. Prima si neutralizza l'effetto volumi (budget riparametrato), poi
  si colora ciò che resta.
- Scale sequenziali (heatmap, mappe): **una sola tinta** chiaro→scuro
  (`CHART.seqFrom`/`seqTo`), mai arcobaleno.
- Nelle forme dove due marchi qualsiasi possono affiancarsi (scatter, bolle, small
  multiples) il tetto è **3 serie** (`ALL_PAIRS_SERIES_CAP`): oltre, aggregare o
  sfaccettare.

### Forma e leggibilità
- **Un solo asse dei valori per grafico**: mai due scale y. Due misure di scala
  diversa → due grafici, o indicizzate a base comune.
- Con **2 o più serie la legenda è sempre presente** (`BiLegend`); con una sola serie
  il titolo la nomina e la legenda non serve. L'identità non è mai affidata al solo
  colore: pallino colorato + etichetta in colore testo.
- Etichette d'asse **mai ruotate** (nel BI storico erano inclinate e illeggibili): se
  non entrano si riducono i tick o si accorcia il formato.
- Etichette di valore **selettive** (in testa alle barre, sull'ultimo punto), mai un
  numero su ogni punto. Cifre **tabulari** nei valori e nelle colonne.
- Nelle barre a segno variabile (scostamenti) l'etichetta va **all'estremità libera**
  della barra — a destra se positiva, a sinistra se negativa — e la scala è
  **simmetrica** intorno allo zero, con margine per le etichette.
- Tooltip dei grafici = `ChartTooltip` (fondo scuro, testo bianco), crosshair
  tratteggiato su linee e aree; mai il `title` nativo.
- A volte la risposta **non è un grafico**: un donut con una sola fetta al 100% o una
  barra sola in un riquadro vuoto sono numeri, non grafici → usare valori con
  variazione (vedi "Qualità del business" in Monthly trend).

### Animazioni
- Ingresso in cascata di card e serie (`ANIM`, ritardi via `--cc-i` / `--kpi-i`),
  valori KPI contati con `useCountUp`, aree con gradiente, punto attivo in evidenza,
  fetta del donut puntata con le altre attenuate.
- Il movimento va **giustificato da un dato nuovo**: cambiando vista o pagina i
  grafici non devono ri-animare (attenzione ai cambi di layout, che ridimensionano i
  grafici e ne fanno ripartire l'animazione).
- Tutto rispetta `prefers-reduced-motion: reduce` (`reducedMotion()`).
