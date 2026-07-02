---
name: sibylla-ui-migration
description: Linee guida e caratteristiche da seguire per migrare le pagine del progetto sibylla-platform su un'altra piattaforma mantenendo INALTERATE le caratteristiche grafiche di UI/UX (design system, token, componenti, regole tassative). Caricare quando si porta/riproduce una pagina Sibylla.
---

# Migrazione pagine Sibylla — linee guida UI/UX

Skill per un agente AI che deve **migrare/riprodurre pagine del progetto
`sibylla-platform`** su un'altra piattaforma **senza alterare l'aspetto e il
comportamento UI/UX**. L'obiettivo non è reinterpretare il design: è replicarlo
1:1, usando gli stessi token, componenti e convenzioni.

## Regola d'oro

> Riproduci l'identità visiva esattamente. Non introdurre nuovi colori, font,
> spaziature, componenti custom o layout "migliorativi". Ogni scelta grafica
> passa dai token e dai componenti condivisi descritti qui.

---

## 1. Stack di riferimento

| Layer | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript (strict, target es5) |
| Styling | Tailwind CSS (classi `sib-*`) + SASS (indented syntax) con token |
| State | Zustand (con `persist` per lo stato durevole) |
| Icone | Font Awesome (`fa-light` prevalente; `fa-solid`/`fa-duotone` dove serve) |
| Font | Poppins (heading) + Open Sans (body) — via CSS var `--font-heading`/`--font-body` |

---

## 2. Regole TASSATIVE (non negoziabili)

Queste regole definiscono l'identità del progetto. Violarle = migrazione non conforme.

1. **Zero stili inline.** Nessun attributo `style={…}` sui componenti applicativi.
   Ogni stile vive in un file `.sass` **omonimo del componente, nella stessa
   cartella**. Unica eccezione tollerata: CSS custom property dinamica passata via
   `style` per un colore runtime (es. `--day-color`), mai regole di layout.
2. **Un componente = una cartella omonima**: `Foo/Foo.tsx` + `Foo/Foo.sass`
   (import del sass in testa al `.tsx`).
3. **Usa SEMPRE i componenti condivisi** (vedi §5). Mai `<select>/<input>`/label
   custom nei form: usa `SelectField`/`InputField`/`RadioGroup`/ecc. (Deroga: nelle
   **celle di tabelle dense** si usano `<select>/<input>` grezzi con classe
   `.sib-input`, per densità — mantieni questa distinzione).
4. **Colori solo via token** `var(--color-*)` / variabili SASS (§4). Mai hex
   hardcoded. Per trasparenze usa la funzione SASS `alpha($token, 0.xx)`
   (NON `rgba(var(--color-*), …)`, che è CSS invalido).
5. **Nessun commento `//` inline su una CSS custom property** in `.sass` (rompe il
   valore della `--var`): i commenti vanno su riga separata sopra.
6. **Tabelle dati**: standard `.sib-table` / `.sib-table-wrap` — bordi 1px, header
   `muted` in **case normale (MAI uppercase)**, niente zebra.
7. **Niente scroll orizzontale su laptop**: a 1366px con sidebar aperta lo spazio
   utile è ~1056px; le tabelle devono entrarci (padding/font compatti). Testi di
   cella **sempre su una riga** con ellissi/abbreviazione puntata **+ tooltip** →
   usa il componente `TruncatedText`.
8. **Paginazione SEMPRE centrata** (wrapper `justify-content: center`), tramite il
   componente `Pagination`.
9. **Label dei form**: Poppins 12px, weight 600, colore **primary**, case normale
   (MAI uppercase). È già lo standard dei componenti form condivisi: usali e la
   regola si propaga.
10. **Ogni "Elimina"** passa da una **modale di conferma** (`useConfirmStore` +
    `<ConfirmDialog/>`), mai `window.confirm`.
11. **MAI una riga di box statistici/riepilogo come header di pagina.** Eventuali
    totali vanno integrati nel contenuto (riga sotto tabella, **badge inline**).
12. **BtnBack**: sempre allineato a sinistra, sopra il titolo, larghezza intrinseca,
    mai full-width.
13. **Selezione intervalli di date**: sempre col Date Range Picker standard
    (`DateRangeField`), mai due campi Da/A separati.
14. **Freccia delle select**: sempre la doppia-chevron standard di `.sib-select`.

---

## 3. Anatomia standard di una pagina

Sequenza tipica dall'alto:

```tsx
<div className="nome-pagina">
  <BtnBack />                                   {/* opzionale, per pagine di dettaglio */}
  <PageHeader title="Titolo" subtitle="…" />    {/* apertura standard */}

  <FilterToolbar> … </FilterToolbar>            {/* filtri: SelectField/SearchField/DateRangeField */}

  <div className="sib-table-wrap">
    <table className="sib-table"> … </table>
  </div>

  <Pagination page={page} totalPages={n} onPageChange={setPage} className="justify-center …" />

  {/* Modali: <Modal> per form/dettaglio; <ConfirmDialog> globale per le delete */}
</div>
```

- Form dentro modali/pagine: `FormGrid` per la griglia, `FormActions` per il footer
  (Annulla + Conferma), campi con i componenti `*Field`.
- Stati: `StatusBadge` per gli stati; `AlertBanner` per success/warning/error;
  `EmptyState` per "nessun risultato/in arrivo".

---

## 4. Design tokens e temi

Tutti i colori/spaziature sono **CSS custom properties** esposte per tema in
`src/styles/_themes.sass`. Il tema attivo è l'attributo `data-theme` sull'`<html>`
(gestito da `useThemeStore`, persistito). Cambiare tema = zero re-render React.

**Uso in SASS** (via `@use '…/styles/tokens' as *`):
- `$primary`, `$primary-50…900` → `var(--color-primary…)`
- `$bg`, `$border`, `$text-active`, `$text-inactive`, `$success`, `$error`,
  `$warning`, `$white`
- superfici: **`var(--color-surface)`** (fondamentale per dark mode)
- font: `$font-heading` (Poppins), `$font-body` (Open Sans)
- trasparenze: `alpha($primary, 0.08)` (funzione custom del progetto)

Temi runtime disponibili: `classic` (navy `#204769` + oro), `editorial`, `swiss`,
`terracotta`, `dark`. **Non hardcodare i valori**: usa i token, così i 5 temi e la
dark mode continuano a funzionare.

---

## 5. Componenti condivisi (riusare, non ricreare)

**UI** (`src/core/components`, barrel `index.ts`):
`Button, Input, Select, Modal, BtnBack, Accordion, ToggleSwitch, Tooltip,
AnalisiBadge, GaugeArc, PageHeader, Widget, AlertBanner, FormActions, Card,
FormGrid, FilterToolbar, StatusBadge, Tabs, Pagination, EmptyState, Skeleton`
(+ `TruncatedText`, `ConfirmDialog`).

**Form** (`src/core/components/form`):
`InputField, SelectField, TextareaField, CheckboxField, RadioGroup, ToggleSwitch,
DatePickerField, DateRangeField, SearchField`.

Props comuni utili: `InputField` supporta `label`, `required` (asterisco),
`iconLeft/iconRight`, `error`, `hint`, `disabled`; `SelectField` prende
`options: {value,label}[]` e mostra la doppia-chevron standard.

---

## 6. Classi `sib-*` (design system Tailwind)

In `src/tailwind.css`. Le principali:

- **Form**: `sib-input`, `sib-input--dense/--lg/--error`, `sib-select`,
  `sib-search-input`, `sib-checkbox`, `sib-radio`.
- **Bottoni**: `sib-btn` + modificatori `--primary/--secondary/--toolbar/--ghost/
  --danger/--danger-outline/--icon/--back/--lg/--sm`.
- **Tabelle**: `sib-table`, `sib-table-wrap`, celle semantiche
  `sib-cell--success/--warning/--error/--muted`.
- **Layout/stato**: `sib-stat-card`, `sib-stats-row`, `sib-section-title`,
  `sib-section-spacer`, `sib-empty`, `sib-empty-state`, `sib-progress`.

Preferisci queste classi (un cambio si propaga a tutto il progetto) al posto di CSS
ad hoc.

---

## 7. Layout / responsive / sidenav

Shell a flexbox: sidebar a larghezza animata + contenuto `flex:1`. Regole chiave:
- `min-width: 0` su ogni wrapper flex intermedio (evita overflow tabelle).
- Sidebar: anima `width/min-width` (`duration-[420ms] ease-sidebar`), mai margini.
- Breakpoint mobile `< 1024px` (drawer + overlay).
- Budget contenuto laptop ~1058px (1366 − sidebar aperta − padding).

Dettaglio completo: vedi `docs/layout-responsive.md`.

---

## 8. Pattern dati (fallback-first)

Le pagine NON assumono il backend. Pattern:
1. `const [data, setData] = useState(FALLBACK)` con dati mock realistici.
2. `useEffect` che chiama `apiFetchSibylla('area/Metodo', { method:'POST', body })`;
   su successo `setData`, su errore mantiene i mock (nessuna eccezione all'utente).
3. UI resiliente: se il backend manca, la pagina resta usabile con i mock.

In migrazione: preserva questo comportamento (mock + chiamata opzionale), adattando
solo l'endpoint alla piattaforma di destinazione.

---

## 9. Convenzioni di progetto

- **Routing**: state-based (no URL param) — una `pageId` mappata a un componente in
  un router centrale; passa dati fra pagine via store Zustand transitorio, non via
  props di navigazione.
- **Menu**: ogni pagina ha una voce con `{id,label,page}`; l'etichetta va
  replicata identica.
- **Testi editabili/multilingua** (se presente): usa l'helper `t('area.pagina.campo',
  'letterale IT')`; migrare a `t()` non cambia il rendering finché non tradotto.
- **Naming**: cartelle/componenti in PascalCase; classi CSS in
  `nome-pagina__elemento--modificatore` (BEM-like) col prefisso della pagina.

---

## 10. Checklist di migrazione (per pagina)

- [ ] Cartella omonima `Pagina/Pagina.tsx` + `Pagina.sass` (sass importato in testa).
- [ ] `PageHeader` (titolo/sottotitolo identici) e, se di dettaglio, `BtnBack`
      allineato a sinistra sopra il titolo.
- [ ] Filtri con `FilterToolbar` + `SelectField/SearchField/DateRangeField`.
- [ ] Tabelle con `.sib-table`/`.sib-table-wrap`; testi su una riga con
      `TruncatedText`; nessuno scroll-x a 1366px.
- [ ] Form con i componenti `*Field` (label Poppins 12/600/primary, case normale).
- [ ] Colori solo via token; trasparenze con `alpha()`; nessun hex/inline style.
- [ ] Delete → `useConfirmStore` + `ConfirmDialog`.
- [ ] Paginazione centrata con `Pagination`.
- [ ] Nessuna riga di stat-card come header; totali integrati (badge inline/riga).
- [ ] Stato via `StatusBadge`, feedback via `AlertBanner`, vuoti via `EmptyState`.
- [ ] Dati fallback-first (mock + chiamata opzionale).
- [ ] Voce di menu e rotta registrate con label identica.
- [ ] Verifica su tema `classic` **e** `dark` (superfici `var(--color-surface)`).
- [ ] `tsc --noEmit` pulito; nessun warning di stile inline.

---

## 11. Documenti di riferimento (nel repo)

- `ARCHITECTURE.md` — architettura front-end, design system, moduli, temi.
- `INTEGRATION.md` — contratto FE↔BE, `apiFetch`/`apiFetchSibylla`, auth.
- `docs/layout-responsive.md` — regole layout/sidenav responsive.
- `docs/guida-sviluppatori.md` — setup e riproduzione front/back.
- `src/tailwind.css` — classi `sib-*`; `src/styles/_themes.sass` — token/temi.

---

*Questa skill descrive COME riprodurre l'UI/UX Sibylla, non cosa fa ogni pagina:
per la logica della singola pagina, leggere il relativo componente e l'eventuale
scheda in `docs/` (es. `docs/nuova-prenotazione.md`).*
