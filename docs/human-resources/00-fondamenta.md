# Human Resources — Fondamenta (design system, layout, componenti condivisi, regole UI)

Questo file raccoglie **tutto ciò che è condiviso** dalle pagine della sezione Human Resources di Sibylla Platform. Le schede delle singole pagine (`docs/human-resources/NN-*.md`) rimandano qui per token, layout, componenti, regole trasversali, effetti e formati. Chi legge non ha accesso al repository: i valori riportati sono quelli **effettivi del codice** alla data del 05/11/2026.

Stack di riferimento: React 19 + TypeScript (Create React App), SASS (sintassi indentata `.sass`, BEM), Tailwind CSS 3.4 per le classi condivise `sib-*` e alcune utility, zustand 5 (store, alcuni con `persist` su `localStorage`), Font Awesome Pro (kit JS), RSuite (solo per il `DateRangePicker`).

> Dove il codice **non coincide** con una regola dichiarata (es. tooltip di `TruncatedText` chiaro invece che scuro), lo segnalo con **⚠ Nota di fedeltà**: per riprodurre le pagine identiche vale il **comportamento del codice**, la regola indica la direzione per il codice nuovo.

## Indice

1. [Design token](#1-design-token)
   1.1 Come sono organizzati · 1.2 Colori `--color-*` (chiaro e scuro) · 1.3 Palette grafici `--chart-*` · 1.4 Tipografia · 1.5 Spaziature · 1.6 Radius · 1.7 Ombre · 1.8 Transizioni e motion · 1.9 Trasparenze: `alpha()` e `color-mix` · 1.10 Alias Tailwind · 1.11 Colori fissi non tematizzati
2. [Layout dell'app](#2-layout-dellapp)
   2.1 Shell · 2.2 Sidenav · 2.3 Topbar · 2.4 Area contenuto · 2.5 Mobile · 2.6 Budget laptop 1366 · 2.7 Tema per sezione · 2.8 Dark mode · 2.9 Altri temi
3. [Componenti condivisi](#3-componenti-condivisi)
   3.1 PageHead / PageHeader · 3.2 BtnBack · 3.3 Bottoni `.sib-btn` · 3.4 Modal · 3.5 ConfirmDialog + useConfirmStore · 3.6 Tooltip · 3.7 TruncatedText · 3.8 ThLabel · 3.9 Pagination · 3.10 ColFilters / useColFilters · 3.11 Toast · 3.12 VistaSwitch · 3.13 AlertBanner · 3.14 Badge, EmptyState, Skeleton, Spinner · 3.15 Campi form · 3.16 Kit Configuratore `src/core/cfg` · 3.17 ConfiguratoreSezione · 3.18 Componenti HR condivisi · 3.19 Ico (icone)
4. [Regole UI trasversali vincolanti](#4-regole-ui-trasversali-vincolanti)
5. [Effetti comuni](#5-effetti-comuni)
6. [Convenzioni di testo e formato](#6-convenzioni-di-testo-e-formato)
7. [Ricetta di una pagina HR tipo](#7-ricetta-di-una-pagina-hr-tipo)
8. [File letti](#8-file-letti)

---

## 1. Design token

### 1.1 Come sono organizzati

- I valori stanno in **CSS custom properties** definite per tema in `src/styles/_themes.sass`, selezionate dall'attributo `data-theme` su `<html>` (`classic` è il default ed è anche `:root`; `dark` è il tema scuro; `editorial`, `swiss`, `terracotta` sono temi alternativi non usati dalle pagine HR in demo).
- `src/styles/_colors.sass` e `_spacing.sass` espongono **alias SASS** (`$primary: var(--color-primary)` …) inoltrati da `_tokens.sass` (`@forward 'colors'`, `@forward 'spacing'`). Ogni `.sass` di componente fa `@use '<percorso>/styles/tokens' as *`.
- Ordine di caricamento globale (`src/index.tsx`): `styles/index.sass` (themes → tokens → mixins → typography → buttons → forms → feedback → components → layout → dashboard → skin-editorial → skin-dark) **poi** `tailwind.css` **poi** `catalyst-overrides.css`. I `.sass` dei moduli sono importati dai `.tsx` e finiscono **prima** di `tailwind.css` nel bundle: a parità di specificità **vince la classe `sib-*` di Tailwind** (vedi §4.13).
- Il tema attivo è nello store `useThemeStore` (persist, chiave `localStorage` **`sibylla.theme`**, default `'classic'`); `App.tsx` esegue `document.documentElement.setAttribute('data-theme', theme)`.

### 1.2 Colori `--color-*` (tema chiaro `classic` e tema scuro `dark`)

| Token | Alias SASS | Chiaro (`classic`, `:root`) | Scuro (`dark`) | Uso tipico |
|---|---|---|---|---|
| `--color-primary` | `$primary` | `#204769` | `#6F9BCB` | Blu Platform: titoli, label, icone tabella, bottoni pieni, accento |
| `--color-primary-900` | `$primary-900` | `#204769` | `#11151C` | |
| `--color-primary-800` | `$primary-800` | `#1a3a56` | `#161B24` | Hover `sib-btn--primary`; in dark: sfondo topbar e sidenav |
| `--color-primary-700` | `$primary-700` | `#43617c` | `#1F2733` | |
| `--color-primary-600` | `$primary-600` | `#58738b` | `#28303D` | |
| `--color-primary-500` | `$primary-500` | `#8399ab` | `#3A4453` | |
| `--color-primary-400` | `$primary-400` | `#9cacbb` | `#525D6E` | Bordo hover dei campi |
| `--color-primary-300` | `$primary-300` | `#b3c1cc` | `#6B7686` | |
| `--color-primary-200` | `$primary-200` | `#ccd5dd` | `#8B95A3` | Hover pulsanti paginazione |
| `--color-primary-100` | `$primary-100` | `#e6eaee` | `#AAB2BD` | Pulsanti paginazione, hover icone filtro |
| `--color-primary-50` | `$primary-50` | `#f2f5f6` | `#232C3A` | Sfondi tenui (hover bottoni icona, riga selezionata, barra selezione) |
| `--color-text-active` | `$text-active` | `#4A4D53` | `#E6E8EC` | Testo principale (`text-ink`) |
| `--color-text-inactive` | `$text-inactive` | `#6E7175` | `#9AA2AE` | Testo secondario, header tabella (`text-ink-muted`) |
| `--color-text-disabled` | `$text-disabled` | `#A9AAAD` | `#5E6675` | Placeholder, icone spente (`text-ink-subtle`) |
| `--color-text-negative` | `$text-negative` | `#FFFFFF` | `#FFFFFF` | Testo su fondo pieno |
| `--color-link` | `$link` / `$blue` | `#5C9CD4` | `#6BA6E0` | Link, bordo focus dei campi, toast info |
| `--color-link-light` | `$link-light` | `#EBF4FB` | `#1B2B3B` | Hover `sib-btn--ghost`, badge info |
| `--color-accent` | `$accent` | `#C9A84C` | `#D4B45E` | Oro (badge carrello, switch) |
| `--color-focus-ring` | `$focus-ring` | `rgba(92, 156, 212, 0.25)` | `rgba(107, 166, 224, 0.3)` | Anello di focus 3px |
| `--color-success` | `$success` | `#007035` | `#34D399` | Verde stato positivo (testo) |
| `--color-success-light` | `$success-light` | `#E4F8EE` | `#11271F` | Fondo tenue positivo |
| `--color-success-mid` | `$success-mid` | `#00CF86` | `#00CF86` | Verde brillante (bordo toast success, `bg-success`) |
| `--color-error` | `$error` | `#FF616E` | `#FF6B78` | Rosso errore, bottone danger |
| `--color-error-dark` | `$error-dark` | `#D10011` | `#FF8A93` | Hover danger, icona toast errore |
| `--color-error-light` | `$error-light` | `#FFEAEF` | `#2A1518` | Fondo tenue errore, ring focus in errore |
| `--color-warning` | `$warning` | `#F57D03` | `#F5A623` | Arancio attesa/avviso |
| `--color-warning-light` | `$warning-light` | `#FFF3E0` | `#2A2012` | Fondo tenue avviso |
| `--color-bg` | `$bg` | `#F8FCFF` | `#12151B` | Canvas off-white: header tabelle (`bg-canvas`), fondo VistaSwitch |
| `--color-content-bg` | — | `#FFFFFF` | `#0E1116` | Sfondo dell'area contenuto pagine |
| `--color-surface` | `$white` | `#FFFFFF` | `#1A1E26` | Superfici (card, modali, campi, tabelle) |
| `--color-border` | `$border` | `#CFD4DA` | `#2B313D` | Tutti i bordi 1px |

Attenzione: in SASS **`$white` è `var(--color-surface)`**, non `#fff`: in dark diventa `#1A1E26`.

### 1.3 Palette grafici `--chart-*`

8 slot categoriali in **ordine fisso** (serie 1 → `--chart-1`, mai riciclati; dalla nona serie si aggrega in «Altro»; nelle forme dove due marchi qualsiasi si affiancano — scatter, bolle, small multiples — massimo 3 serie).

| Token | Chiaro | Scuro |
|---|---|---|
| `--chart-1` | `#2E6DA4` | `#4A8BC9` |
| `--chart-2` | `#C4661F` | `#D9722F` |
| `--chart-3` | `#A8407F` | `#D0609F` |
| `--chart-4` | `#A8862F` | `#A8862F` |
| `--chart-5` | `#1E9E95` | `#1E9E95` |
| `--chart-6` | `#C43D34` | `#E8635A` |
| `--chart-7` | `#5B43A0` | `#9585E0` |
| `--chart-8` | `#2E7D3A` | `#3FA34D` |
| `--chart-ly` (anno precedente) | `#A9B2BC` | `#4A5462` |
| `--chart-forecast` (previsione, sempre tratteggiata) | `#A8862F` | `#C9A84C` |
| `--chart-seq-from` | `#D8E5F1` | `#223449` |
| `--chart-seq-to` | `#204769` | `#7FB0DE` |
| `--chart-grid` | `#E6EBF0` | `#262C38` |
| `--chart-axis` | `#C3C9D0` | `#3A4453` |
| `--chart-ink` | `#4A4D53` | `#E6E8EC` |
| `--chart-ink-muted` | `#6E7175` | `#9AA2AE` |
| `--chart-surface` | `#FFFFFF` | `#1A1E26` |
| `--chart-good` | `#007035` | `#34D399` |
| `--chart-bad` | `#D10011` | `#FF6B78` |
| `--chart-tip-bg` | `#1E293B` | `#0E1116` |
| `--chart-tip-ink` | `#FFFFFF` | `#FFFFFF` |

`--chart-good`/`--chart-bad` hanno significato riservato (stato) e non si usano mai come «serie N».

### 1.4 Tipografia

**Famiglie** (caricate da Google Fonts in `public/index.html`: Poppins 400/500/600/700/800, Open Sans 400/500/600/700, più Inter/Inter Tight/IBM Plex per temi alternativi):

| Token | Valore (classic e dark) | Dove |
|---|---|---|
| `--font-heading` (`$font-heading`, Tailwind `font-heading`) | `'Poppins', sans-serif` | Titoli pagina e modale, label dei form, titoli di sezione, etichette VistaSwitch, tab Configurazione, titoli toast |
| `--font-body` (`$font-body`, Tailwind `font-body`) | `'Open Sans', sans-serif` | Tutto il resto: celle, input, bottoni, testo |
| Tailwind `font-poppins` | `Poppins, sans-serif` | Label dei componenti form (fisse, non tematizzate) |
| Tailwind `font-opensans` | `Open Sans, sans-serif` | Input, select, bottoni `sib-btn`, tabelle |

Il font del corpo è impostato su `.app { font-family: $font-body }`.

**Scala tipografica** (`src/styles/_typography.sass`):

| Classe | Famiglia | Size | Weight | Colore | Line-height / margini |
|---|---|---|---|---|---|
| `h1`, `.h1` | heading | 28px | 700 | primary | 1.25, margin 0 |
| `h2`, `.h2` | heading | 22px | 700 | primary | 1.3 |
| `h3`, `.h3` | heading | 18px | 600 | primary | 1.35 |
| `h4`, `.h4` | heading | 15px | 600 | primary | 1.4 |
| `.page-header__title` (titolo pagina) | heading | **24px** | **600** | primary | margin `0 0 4px` |
| `.page-header__subtitle` | (body) | **13px** | 400 | text-inactive | margin 0 |
| `.page-header__eyebrow` | body | 11px | 700, uppercase, letter-spacing .6px | text-inactive | inline-block, margin `0 0 6px` |
| `.section-title` | heading | 14px | 700 | primary | |
| `.body-lg` / `.body-md` / `.body-sm` | body | 15 / 13 / 12px | 400 | active / active / inactive | 1.6 / 1.5 / 1.5 |
| `.form-label` | heading | 12px | 600 | primary | block, margin-bottom 4px |
| `.form-hint` | body | 11px | 400 | text-disabled | margin-top 3px |
| `.form-error-text` | body | 11px | 500 | error | margin-top 3px |
| `.meta` | body | 11px | 400 | text-disabled | |
| `.overline` | body | 10px | 700 uppercase, ls .5px | text-disabled | (legacy, NON usare negli header di tabella) |

Misure ricorrenti nelle pagine HR: testo base pagina **13px** (`+hr-root`), celle tabella **13px**, header tabella **12px**, testo secondario 11–12.5px, label 12px.

Scala Tailwind aggiuntiva (`tailwind.config.js`, usata da sotto-app): `h1` 32/35, `h2` 24/30, `h3` 18/21, `h4` 14/14, `h5` 16/19, `h6` 10/14, `p1` 14/20, `p3` 13/18, `p5` 16/20, `p6` 11/14, `l1` 14/22, `field` 14/20 (px).

Numeri: `font-variant-numeric: tabular-nums` è applicato globalmente a `table` e a ogni classe che finisce per `value` (`[class$="value"]`, `[class*="value "]`, `[class*="value--"]`) e a `.sib-table`.

### 1.5 Spaziature (`_spacing.sass`, non tematizzate, scala 4px)

| SASS | px |
|---|---|
| `$space-xs` | 4 |
| `$space-sm` | 8 |
| `$space-md` | 12 |
| `$space-lg` | 16 |
| `$space-xl` | 24 |
| `$space-2xl` | 32 |

Equivalenze Tailwind usate nei componenti: `gap-1`=4px, `gap-1.5`=6px, `gap-2`=8px, `gap-3`=12px, `gap-4`=16px, `px-3`=12px, `px-4`=16px, `py-2.5`=10px, `h-7`=28px, `h-8`=32px, `h-9`=36px, `h-10`=40px, `w-3.5`=14px, `mb-3.5`=14px, `mb-5`=20px, `text-xs`=12px (line-height 16px), `text-sm`=14px.

### 1.6 Radius

| Token | Classic / Dark | SASS |
|---|---|---|
| `--radius-sm` | 4px | `$radius-sm` |
| `--radius-md` | 6px | `$radius-md` |
| `--radius-lg` | 10px | `$radius-lg` |
| `--radius-xl` | 12px | `$radius-xl` |
| `--radius-page` | 15px | `$radius-page` |
| — | 50% | `$radius-full` |
| Tailwind `rounded-field` / `rounded-control` | 6px | |
| Tailwind `rounded-card` | 15px | |

Valori fissi ricorrenti: modale 16px, VistaSwitch 10px (thumb 7px), popup filtri 8px, pulsante export HR 8px, `cfg-pane` 8px, `cfg-msel__trigger` 7px.

### 1.7 Ombre

| Token | Classic | Dark |
|---|---|---|
| `--shadow-sm` | `0 1px 4px rgba(32, 71, 105, 0.08)` | `0 1px 3px rgba(0, 0, 0, 0.40)` |
| `--shadow-md` | `0 2px 8px rgba(32, 71, 105, 0.15)` | `0 2px 8px rgba(0, 0, 0, 0.50)` |
| `--shadow-lg` | `0 4px 16px rgba(32, 71, 105, 0.18)` | `0 8px 24px rgba(0, 0, 0, 0.55)` |

Ombre fisse: modale `0 20px 60px rgba(32, 71, 105, 0.2)`; tooltip scuro `0 4px 12px rgba(32,71,105,0.25)`; tooltip chiaro `0 8px 24px rgba(32,71,105,0.18)`; popup filtri colonna `0 8px 24px rgba(0, 0, 0, .14)`.

**Ombra automatica sulle card**: ogni elemento la cui classe finisce per `card`, `kpi`, `stat`, `panel` (o le contiene seguite da spazio o `--`) riceve `box-shadow: var(--shadow-sm)`. Se è un `<a>` o `<button>` "card", all'hover sale di 1px (`translateY(-1px)`) e passa a `--shadow-md` (transizione `transform` e `box-shadow` 200ms `cubic-bezier(0.4, 0, 0.2, 1)`; `:active` torna a 0 in 150ms). Attenzione quindi a nominare `*-panel` un contenitore che non deve avere ombra.

### 1.8 Transizioni e motion

```sass
// src/styles/_spacing.sass
$motion-fast:   150ms
$motion-base:   200ms
$motion-ease:   cubic-bezier(0.4, 0, 0.2, 1)
$transition-fast:   all $motion-fast $motion-ease     // = all 150ms cubic-bezier(0.4, 0, 0.2, 1)
$transition-normal: all $motion-base $motion-ease     // = all 200ms cubic-bezier(0.4, 0, 0.2, 1)
```

- `$motion-fast` per stati interattivi (hover/focus), `$motion-base` per spostamenti ed elevazioni.
- Easing sidenav (Tailwind `ease-sidebar`): `cubic-bezier(0.32, 0.72, 0, 1)`.
- Accordion: `grid-template-rows 0fr↔1fr` in `0.34s cubic-bezier(.22, 1, .36, 1)`; contenuto `opacity` 0→1 in `0.28s ease 0.06s` (in chiusura `0.2s ease`).
- Tutto è azzerato da `prefers-reduced-motion` (vedi §5.5).

### 1.9 Trasparenze: `alpha()` e `color-mix`

I token sono `var(--color-*)`, quindi `rgba($primary, .1)` o `rgba(var(--color-primary), .1)` producono **CSS invalido** (la regola viene scartata). Si usa la funzione SASS:

```sass
// src/styles/_colors.sass
@function alpha($color, $a)
  @return color-mix(in srgb, #{$color} #{$a * 100%}, transparent)

// uso
.cfg-badge--configured
  color: $success
  background: alpha($success, .12)   // → color-mix(in srgb, var(--color-success) 12%, transparent)
```

In CSS puro: `color-mix(in srgb, var(--color-primary) 8%, transparent)`. In alternativa un token dedicato (es. `--color-focus-ring`). Regola: **mai hex nei componenti**, solo token (eccezioni storiche documentate per tooltip `#1E293B` e chrome).

### 1.10 Alias Tailwind (`tailwind.config.js`)

| Classe Tailwind | Token |
|---|---|
| `primary`, `primary-50…900` | `--color-primary*` |
| `link`, `link-light` | `--color-link`, `--color-link-light` |
| `accent` | `--color-accent` |
| `success` (DEFAULT) | `--color-success-mid` (attenzione: è il verde brillante) |
| `success-dark` | `--color-success` |
| `success-light` | `--color-success-light` |
| `error`, `error-dark`, `error-light` | `--color-error*` |
| `warning`, `warning-light` | `--color-warning*` |
| `ink` / `ink-muted` / `ink-subtle` / `ink-inverse` | `--color-text-active` / `-inactive` / `-disabled` / `-negative` |
| `canvas` | `--color-bg` |
| `line` | `--color-border` |
| `h-field` | 34px |

Le palette `confirm-*`, `danger-*`, `alert-*`, `disabled`, `surface-subtle`, `border-soft`, `link-soft` esistono **solo** come colori Tailwind (hex fissi, es. `confirm-700 #007035`, `danger-900 #d10011`, `alert-700 #f57d03`, `disabled #e9eaed`): non esistono come `--color-*`.

Breakpoint extra: `3xl` = 1525px.

### 1.11 Colori fissi non tematizzati

- Tooltip scuro: `#1E293B` sfondo, `#FFFFFF` testo.
- Tooltip chiaro: sfondo `#fff`, testo `#1f2937`, bordo `1px solid #E2E8F0`.
- Colori istituzionali di sezione: Platform `#204769`, Tableau `#206953`, Agorà `#708090`.
- Modalità assistenza/admin: oro `#c9a84c`, testo `#2A2208`.
- Bottoni pieni in dark: primary `#2F6DB5` (hover `#3B7CC8`), danger `#C2333F` (hover `#D8404D`).

---

## 2. Layout dell'app

### 2.1 Shell

```
.app  (display:flex; height:100vh; overflow:hidden; background:$primary; font-family:$font-body)
├── <Sidebar>  .app__sidebar        larghezza animata 260px ↔ 64px
└── .app__main (flex:1; display:flex; flex-direction:column; min-width:0)
    ├── <Topbar> .topbar            height 64px
    ├── [TabsBar]                   solo in modalità "tabs" (preferenza utente)
    └── .app__content.content-scroll  (flex:1; overflow:auto; padding:24px; border-top-left-radius:24px)
        └── <pagina>
```

- `min-width: 0` su `.app__main` è indispensabile: senza, una tabella larga allarga il flex e appare lo scroll orizzontale di pagina. Ogni wrapper flex intermedio deve averlo.
- Lo sfondo di `.app` è `$primary`: l'angolo arrotondato a 24px in alto a sinistra di `.app__content` lascia intravedere il blu della sidebar/topbar.
- `.app__content` background: `var(--color-content-bg, $bg)` → `#FFFFFF` (chiaro) / `#0E1116` (scuro).
- `.app__content--mobile`: niente radius. `.app__content--with-tabs`: niente radius + `box-shadow: inset 1px 0 0 #C5CDD7`.
- `<ConfirmDialog/>` è montato una volta in fondo a `.app`; `<Toaster/>` una volta in `App.tsx` accanto alla dashboard.

### 2.2 Sidenav (`src/layout/Sidebar.tsx`, `NavItem.tsx`, classi Tailwind)

| Proprietà | Valore |
|---|---|
| Sfondo | `bg-primary` (`#204769`), testo bianco; in dark `$primary-800` = `#161B24` (via `_skin-dark.sass`) |
| Aperta (desktop) | `w-[260px] min-w-[260px]` |
| Chiusa (desktop, "rail") | `w-16 min-w-16` = **64px**, `cursor-pointer` (clic ovunque la riapre) |
| Transizione desktop | `transition-[width,min-width] duration-[420ms] ease-sidebar` (`cubic-bezier(0.32, 0.72, 0, 1)`) |
| Mobile (drawer) | `fixed top-0 h-screen w-[272px] z-50`, `transition-[left] duration-[450ms] ease-sidebar`; aperta `left-0` con `shadow-[12px_0_40px_rgba(0,0,0,0.95)]`, chiusa `-left-[300px]` |
| Header | `h-16` (64px), da aperta `px-3.5 gap-2.5`; hamburger `fa-bars` 18px (`aria-label` «Comprimi menu» / «Espandi menu»), opacità .7 → 1 all'hover in 150ms |
| Nome struttura | Poppins 14.5px 600, troncato; select struttura per multistruttura (popup bianco, voce attiva `#eef4fa` con `fa-check` link) |
| Utente | avatar 34×34 tondo + nome Poppins 13px 600 bianco; saluto «Buongiorno» (<13), «Buon pomeriggio» (<18), «Buonasera» |
| Scrollbar nav | 3px, thumb `bg-white/15` |
| Piede | pallino 6px `bg-success` + «v 2.4.1 · Sistema operativo» 10px `text-white/30` (solo da aperta) |

Voce di menu (`NavItem`):

- riga `flex items-center gap-2.5`, bordo sinistro 3px trasparente, `transition-colors duration-[130ms]`;
- padding verticale per profondità: d1 4px, d2 7px, d3 7px, d4–5 6px; padding sinistro d1 16px, d2 26px, d3 40px, d4 54px, d5 66px; destro 12px; da chiusa centrata senza padding orizzontale;
- font: d1 Poppins 13px 500; d2 Open Sans 12px 500; d3+ Open Sans 12px 400;
- d1 ha l'icona in un box 30×30 radius 8px (`bg-white/[0.06]`; attiva `color-mix` del colore modulo al 20%) con icona duotone 18px; d2 icona 14px, d3 13px, d4 12px; d5 pallino 5px;
- stato normale: testo `white/65`, hover `bg-white/[0.06]` e testo `white/90`;
- nel percorso attivo: bordo sinistro `white/15`, testo `white/85`, label 600 `white/90`;
- voce attiva: `bg-white/10` (hover `/12`), bordo sinistro e testo nel colore del modulo `--mod-color` (default `#5C9CD4`), label **700**;
- chevron `fa-chevron-down` 11px (d1) / 9px, ruota 180° in 200ms ease-in-out all'apertura; i sottomenu si aprono con l'Accordion (§1.8);
- tasto destro su una voce con pagina: menu contestuale preferiti.

### 2.3 Topbar (`.topbar`, `src/styles/_layout.sass`)

- `height: 64px; background: $primary; display:flex; align-items:center; padding: 0 16px; gap: 8px; flex-shrink: 0`. In dark `background: $primary-800`.
- Breadcrumb (`.topbar__crumbs`, `flex:1; min-width:0; overflow:hidden; gap:5px`): pulsanti 12px Open Sans, ultimo `rgba(255,255,255,0.9)` 500, precedenti `rgba(255,255,255,0.45)` 400, hover bianco.
- Bottoni icona `.topbar__icon-btn`: padding 6px, radius 8px, hover `rgba(255,255,255,0.1)`, attivo `0.15` (hover `0.2`), transizione `background 0.15s`. Badge (carrello oro `$accent`, chat rosso `$error`): 15px, radius 8px, bordo 1px `$primary`, 8px 700 bianco.
- Ricerca `.topbar__search`: box bianco `#fff`, bordo `1px solid rgba(0,0,0,0.12)` (focus `0.28`), radius 8px, padding `6px 12px`, testo `#1f2937`, placeholder `rgba(0,0,0,0.4)`.
- Divisore: 1×20px `rgba(255,255,255,0.15)`, margin `0 2px`.

### 2.4 Area contenuto

- Padding **24px** su tutti i lati. La pagina è il primo figlio; il root della pagina è un `div` con classe BEM della pagina (es. `.nsp`) che diventa **contenitore di query** (`container-type: inline-size`, vedi `+hr-root`).
- La pagina scorre verticalmente dentro `.app__content` (`overflow:auto`), mai orizzontalmente.
- Scrollbar globale WebKit: 3px, track trasparente, thumb `alpha($white, .15)` radius 4px; nel contenuto (`.content-scroll`) thumb `rgba(32, 71, 105, 0.12)` (in dark `alpha($text-inactive, .35)`).

### 2.5 Mobile

- Breakpoint **1024px** gestito in JS (`window.innerWidth < 1024`, listener `resize`), non in CSS. Passando da desktop a mobile la sidenav si chiude; al primo caricamento resta aperta.
- Con sidebar aperta su mobile compare `.app__mobile-overlay` (`position:fixed; inset:0; background: rgba(0,0,0,0.55); z-index:40; backdrop-filter: blur(2px)`), clic = chiude.
- Navigando da mobile la sidebar si chiude.

### 2.6 Budget laptop 1366 con sidebar aperta

```
1366 (viewport) − 260 (sidebar aperta) − 48 (padding 24 × 2) ≈ 1058px utili
```

Ogni pagina HR deve stare in **~1056–1058px** senza alcuno scroll orizzontale. Verifica obbligatoria a 1366 / 1440 / 1536 con sidebar aperta (overflow 0) e a 1920 (dimensioni standard). La compattazione si fa con **container query sul root della pagina** (§4.11), mai con `@media` sul viewport: un laptop 1440 o 1536 con sidebar aperta ha 1130/1230px di contenuto e una `@media (max-width:1366px)` non scatterebbe.

### 2.7 Tema per sezione (`useSectionThemeStore`, `[data-section]`)

- Tre prodotti con colore istituzionale fisso: `platform` `#204769`, `tableau` `#206953`, `agora` `#708090` (`SECTION_COLORS`).
- Store `useSectionThemeStore` (persist `localStorage` **`sibylla.section-theme`**, `version: 2`): `dissociato: boolean` (default `false` = modalità «Unificata»). Si sceglie in Modifica profilo › Preferenze: «Unificata» («Un unico colore (Platform) su tutta la piattaforma.») / «Dissociata» («Ogni prodotto col proprio colore istituzionale.»).
- `sectionForPage(page, moduli?)`: le pagine HR non sono in `TABLEAU_PAGES` né `agora*` → **sezione `platform`**, quindi in HR il primario resta `#204769`, **salvo** che il profilo sia Tour Operator (`isTourOperator`): allora tutta l'app è `tableau` verde `#206953`.
- Applicazione (shell): se `sectionOverride = isTourOperator || (dissociato && section !== 'platform')`, sul `div.app` si mettono `data-section="<sezione>"` e la custom property `--color-primary: <colore>`. `tailwind.css` ricostruisce la scala:

```css
[data-section] {
  --color-primary-900: var(--color-primary);
  --color-primary-800: color-mix(in srgb, var(--color-primary) 80%, #000);
  --color-primary-700: color-mix(in srgb, var(--color-primary) 78%, #fff);
  --color-primary-600: color-mix(in srgb, var(--color-primary) 62%, #fff);
  --color-primary-500: color-mix(in srgb, var(--color-primary) 50%, #fff);
  --color-primary-400: color-mix(in srgb, var(--color-primary) 40%, #fff);
  --color-primary-300: color-mix(in srgb, var(--color-primary) 28%, #fff);
  --color-primary-200: color-mix(in srgb, var(--color-primary) 18%, #fff);
  --color-primary-100: color-mix(in srgb, var(--color-primary) 10%, #fff);
  --color-primary-50:  color-mix(in srgb, var(--color-primary) 6%, #fff);
}
/* Solo tema chiaro: anche gli sfondi neutri seguono il prodotto */
html:not([data-theme="dark"]) [data-section] {
  --color-bg: color-mix(in srgb, var(--color-primary) 7%, #fff);
}
```

Conseguenza per la riproduzione: **ogni** colore "blu" delle pagine HR deve passare da `--color-primary*` (mai `#204769` scritto a mano), così il verde Tour Operator si propaga da solo.

### 2.8 Dark mode (`[data-theme=dark]`)

- Si attiva con `useThemeStore.setTheme('dark')` (Modifica profilo › Preferenze › Aspetto: «Standard» — «Tema chiaro Sibylla», icona `fa-light fa-sun`; «Dark» — «Tema scuro professionale», icona `fa-light fa-moon`). L'attributo va su `<html>`.
- Token: tabella §1.2 e §1.3. `--color-primary` in dark è un **accento chiaro** `#6F9BCB` (leggibile su fondo scuro); per questo il chrome viene ri-scurito.
- Override di `src/styles/_skin-dark.sass`:

```sass
[data-theme="dark"] .topbar,
[data-theme="dark"] .app__sidebar
  background: $primary-800                       // #161B24
[data-theme="dark"] h1, h2, h3, .h1, .h2, .h3, .page-header__title, .section-title
  color: $text-active                            // #E6E8EC (titoli non blu in dark)
[data-theme="dark"] .bg-white
  background-color: $white                       // #1A1E26
[data-theme="dark"] .sib-table-wrap
  background: $white
  border-color: $border
[data-theme="dark"] .sib-table thead tr, .sib-table th
  background: $bg                                // #12151B
  color: $text-inactive
[data-theme="dark"] .sib-table td
  color: $text-active
  border-color: $border
[data-theme="dark"] .sib-table tbody tr:hover
  background: $bg
[data-theme="dark"] .sib-input, .sib-select, .field, .select, .field-textarea, input, textarea, select
  background-color: $white
  color: $text-active
  border-color: $border
  &::placeholder
    color: $text-disabled
// freccia del select: stroke #9AA2AE invece di #6E7175
[data-theme="dark"] .sib-btn--primary   → background/border #2F6DB5, testo #FFFFFF, hover #3B7CC8
[data-theme="dark"] .sib-btn--danger    → background/border #C2333F, testo #FFFFFF, hover #D8404D
[data-theme="dark"] .content-scroll::-webkit-scrollbar-thumb → alpha($text-inactive, 0.35)
```

- Superfici sempre `var(--color-surface)` (mai `#fff` nei `.sass`), testi sempre token `--color-text-*`.
- Il calendario RSuite del `DateRangeField` usa il tema scuro nativo di RSuite (`CustomProvider theme="dark"`, classe `rs-theme-dark` sul body) con popup rimappato sui token (§3.15.6).
- Il tema per sezione in dark non tinge `--color-bg`.

### 2.9 Altri temi

`editorial` (look «Pro»), `swiss`, `terracotta` hanno palette e font propri (`_themes.sass`, `_skin-editorial.sass`). Non sono richiesti per le pagine HR: riprodurre `classic` + `dark`.

---

## 3. Componenti condivisi

Regola generale: le pagine HR **non creano mai** `<select>`, `<input>`, label, tooltip o modali propri; usano questi componenti. Le classi `sib-*` sono definite in `src/tailwind.css` (`@layer components`).

### 3.1 PageHead (`src/core/components/PageHead.tsx` + `PageHead.sass`) e PageHeader

Props:

| Prop | Tipo | Default | Note |
|---|---|---|---|
| `title` | string | — | obbligatorio |
| `subtitle` | string? | — | |
| `eyebrow` | string? | — | sopratitolo uppercase (HR non lo usa) |
| `back` | boolean | `true` | mostra BtnBack |
| `backLabel` | string? | «Indietro» | |
| `onBack` | () => void | torna alla pagina precedente (stack di navigazione) | le pagine HR passano spesso `() => navigate('home')` |
| `actions` | ReactNode | — | zona destra |
| `className` | string? | — | |

Markup:

```tsx
<div className="page-head {className}">
  <div className="page-head__side page-head__side--left">
    <button type="button" className="sib-btn sib-btn--back">…Indietro</button>
  </div>
  <div className="page-header">
    {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
    <h1 className="page-header__title">{title}</h1>
    {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
  </div>
  <div className="page-head__side page-head__side--right">{actions}</div>
</div>
```

Stile:

```sass
.page-head
  display: grid
  grid-template-columns: minmax(min-content, 1fr) auto minmax(min-content, 1fr)
  align-items: center
  gap: 16px
  margin-bottom: 20px          // titolo → contenuto
  .page-header
    min-width: 0
    text-align: center
    margin-bottom: 0
  &__side
    display: flex
    align-items: center
    min-width: 0
  &__side--left
    justify-content: flex-start
  &__side--right
    flex-wrap: wrap
    justify-content: flex-end
    gap: 8px
  .sib-btn--back
    flex: none
```

Titolo 24px/600 Poppins primary (`margin 0 0 4px`), sottotitolo 13px text-inactive. Il titolo è **centrato rispetto alla pagina** perché le due colonne laterali sono `1fr` uguali; in contenitore stretto le azioni vanno a capo e il titolo si spezza invece di sovrapporsi. In dark il titolo è `#E6E8EC`.

### 3.2 BtnBack (`src/core/components/BtnBack.tsx`)

```tsx
<button type="button" className="sib-btn sib-btn--back" onClick={handle}>
  <i className="fa-solid fa-arrow-left text-[12px]" aria-hidden="true" />
  {label /* default «Indietro» */}
</button>
```

Senza `onClick` chiama `goBack()` registrato dalla shell (pagina precedente, non la home). Stile `.sib-btn` + `.sib-btn--back` (§3.3): trasparente, senza bordo, testo `text-ink-muted` 12px 600, **altezza 32px** (`!h-8`), padding orizzontale 12px, `margin-bottom: 14px`, radius 6px, gap 6px; hover: sfondo `--color-primary`, testo bianco. Larghezza intrinseca, **mai full-width**, sempre a sinistra.

### 3.3 Bottoni `.sib-btn` (`src/tailwind.css`)

Base `.sib-btn`:

| Proprietà | Valore |
|---|---|
| display | `inline-flex`, `align-items:center`, `justify-content:center`, `position:relative` |
| gap | 6px |
| altezza / padding | **36px** (`h-9`) / `0 16px` |
| radius | 6px |
| font | Open Sans **13px 600** |
| altro | `cursor:pointer; white-space:nowrap; flex-shrink:0` |
| transizione | `background-color, border-color, box-shadow, transform, color` 150ms `ease-in-out` (cubic-bezier(0.4,0,0.2,1)) |
| focus | `outline:none`; `:focus-visible` → `box-shadow: 0 0 0 3px var(--color-focus-ring)` |
| active | `:active:not(:disabled)` → `transform: translateY(0.5px)` |
| disabled | `cursor:not-allowed; opacity:.5` |

Varianti:

| Classe | Normale | Hover (`enabled`) | Active |
|---|---|---|---|
| `--primary` | bg/bordo 1px `primary`, testo bianco, `box-shadow: var(--shadow-sm)` | bg `primary-800`, `--shadow-md` | bg `primary-800` |
| `--secondary` | trasparente, bordo 1px `primary`, testo `primary` | bg `primary-50` | bg `primary-100` |
| `--ghost` | trasparente, bordo trasparente, testo `link` | bg `link-light` | |
| `--toolbar` | bg bianco, bordo `line`, testo `ink` | bordo e testo `primary` | |
| `--danger` | bg/bordo `error`, testo bianco, `--shadow-sm` | bg `error-dark`, `--shadow-md` | |
| `--danger-outline` | trasparente, bordo `error`, testo `error` | bg `error-light` | |
| `--icon` | **36×36**, padding 0, bg bianco, bordo `line`, testo `ink-muted` | bordo `primary`, bg `primary-50`, testo `primary` | |
| `--back` | vedi §3.2 | bg `primary`, testo bianco | |
| `--lg` | altezza 40px, padding `0 20px`, 14px | | |
| `--sm` | altezza 28px, padding `0 12px`, 11px | | |
| `--loading` | testo trasparente, `pointer-events:none`, spinner `::after` 14×14, bordo 2px `rgba(255,255,255,0.9)` con top trasparente, `sib-btn-spin 0.6s linear infinite`; sui bottoni non pieni (secondary/toolbar/ghost/back/icon) il bordo dello spinner è `--color-primary` | | |

Dentro `.sib-table` il `.sib-btn--icon` perde il box (vedi §4.3).

Nota: i bottoni sono alti 36px mentre i campi form sono 34px; nelle toolbar HR il pulsante di export è un quadrato 34px dedicato (`+hr-icon-btn`, §3.18.3) proprio per allinearsi ai campi.

### 3.4 Modal (`src/core/components/Modal.tsx`, stile in `_components.sass`)

Props: `open: boolean`, `onClose: () => void`, `title?: string`, `children`, `size?: 'sm'|'md'|'lg'|'xl'` (default `'md'`), `className?` (aggiunta a `.modal__box`).

Markup:

```tsx
{open && (
  <div className="modal__overlay">
    <div className="modal__backdrop" onClick={onClose} />
    <div className={`modal__box modal__box--${size} ${className}`}>
      {title && (
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose}><i className="fa-duotone fa-xmark" /* 18px currentColor */ /></button>
        </div>
      )}
      {children}
    </div>
  </div>
)}
```

Comportamento: `Esc` chiude (listener `keydown` su `window` solo se aperta); clic sul backdrop chiude. Non c'è focus trap né footer predefinito: le azioni sono nel `children` (nelle pagine HR con `+hr-modal-actions`, §3.18.3).

Stile:

```sass
.modal__overlay
  position: fixed; inset: 0; z-index: 100
  display: flex; align-items: center; justify-content: center
  padding: 16px
.modal__backdrop
  position: absolute; inset: 0
  background: rgba(0, 0, 0, 0.35)
  backdrop-filter: blur(3px)
.modal__box
  position: relative; width: 100%
  background: $white                    // --color-surface
  border-radius: 16px
  box-shadow: 0 20px 60px rgba(32, 71, 105, 0.2)
  padding: 24px
  max-height: calc(100vh - 32px)
  overflow-y: auto
  &--sm  { max-width: 360px }
  &--md  { max-width: 480px }
  &--lg  { max-width: 600px }
  &--xl  { max-width: 780px }
.modal__header
  display: flex; align-items: center; justify-content: space-between
  margin-bottom: 20px
.modal__title
  font-family: $font-heading; font-size: 16px; font-weight: 600; color: $primary; margin: 0
.modal__close
  background: none; border: none; cursor: pointer; padding: 4px
  display: flex; align-items: center
  color: $text-disabled; border-radius: $radius-md
  transition: $transition-fast
  &:hover
    color: $text-active
    background: $primary-50
```

⚠ Nota di fedeltà: `Modal` **non ha animazione d'ingresso** (appare e scompare istantaneamente). Esiste un keyframe globale `scaleIn` (`opacity 0, scale(0.93) translateY(8px)` → `opacity 1, scale(1) translateY(0)`) in `_dashboard.sass` ma non è applicato a `.modal__box`. Le pagine che lo vogliono lo aggiungono via `className`.

### 3.5 ConfirmDialog + `useConfirmStore`

Store (`src/store/useConfirmStore.ts`, non persistito):

```ts
export interface ConfirmOptions {
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean          // true = pulsante di conferma distruttivo
}
// confirm(opts) => Promise<boolean>; se c'è una conferma pendente non risolta viene risolta a false.
const confirm = useConfirmStore(s => s.confirm)
if (await confirm({ title: 'Elimina spesa', message: '…', confirmLabel: 'Elimina' })) elimina()
```

Default del componente: titolo «Conferma eliminazione», messaggio «Vuoi davvero eliminare questo elemento? L’operazione non è reversibile.» (apostrofo tipografico ’), conferma «Elimina», annulla «Annulla», `danger = true`.

Markup (dentro `<Modal size="sm" title={title}>`, quindi larghezza max **360px**):

```tsx
<div className="confirm-dialog">
  <div className="confirm-dialog__icon confirm-dialog__icon--danger">
    <i className="fa-solid fa-triangle-exclamation" />
  </div>
  <div className="confirm-dialog__message">{message}</div>
</div>
<div className="confirm-dialog__foot">
  <button className="sib-btn sib-btn--secondary">{cancelLabel}</button>
  <button className="sib-btn sib-btn--danger" autoFocus>{confirmLabel}</button>  {/* sib-btn--primary se danger=false */}
</div>
```

```sass
.confirm-dialog
  display: flex; align-items: flex-start; gap: 14px
  &__icon
    flex: none; width: 40px; height: 40px; border-radius: 50%
    display: flex; align-items: center; justify-content: center
    background: $primary-50; color: $primary; font-size: 18px
    &--danger
      background: $error-light; color: $error
  &__message
    font-size: 14px; color: $text-active; line-height: 1.5; padding-top: 8px
  &__foot
    display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px
```

Esc, clic sul backdrop e «Annulla» risolvono `false`; il pulsante di conferma ha il focus all'apertura (Invio conferma). Mai `window.confirm`.

### 3.6 Tooltip (`src/core/components/Tooltip.tsx`)

Props: `text?: string`, `content?: ReactNode`, `children`, `position?: 'top'|'bottom'|'left'|'right'` (default `'top'`), `variant?: 'dark'|'light'` (default **`'dark'`**).

Funzionamento:

- Il wrapper è uno `<span style="display:inline-flex">` che ascolta `mouseenter`/`mouseleave` e `focus`/`blur` (quindi funziona anche da tastiera sugli elementi focusabili figli).
- La box è renderizzata in **portal nel `body`** con `position: fixed; z-index: 9999; pointer-events: none` (un antenato con `container-type`, `transform` o `filter` altrimenti sposterebbe la box).
- Coordinate dall'elemento: `top` → centro orizzontale, `top = rect.top − 8`, `transform: translateX(calc(-50% + shift)) translateY(-100%)`; `bottom` → `top = rect.bottom + 8`, `translateX(calc(-50% + shift))`; `left` → `left = rect.left − 8`, `translateX(calc(-100% + shift)) translateY(-50%)`; `right` → `left = rect.right + 8`, `translateX(shift) translateY(-50%)`. Distanza dall'elemento: **8px**. Nessuna freccia.
- **Rientro dal bordo**: dopo il render misura la box; se esce dal viewport a destra o a sinistra calcola uno `shift` orizzontale che la riporta a **8px** dal bordo (`M = 8`).
- Nessuna animazione: compare/scompare istantaneamente.

Stile (inline nel componente, da riprodurre identico):

| Proprietà | dark (standard) | light |
|---|---|---|
| background | `#1E293B` | `#fff` |
| color | `#fff` | `#1f2937` |
| border | none | `1px solid #E2E8F0` |
| border-radius | 6px | 10px |
| font | 11px, weight 500 (famiglia ereditata: Open Sans) | idem |
| line-height | 1.4 | 1.4 |
| padding testo corto (≤34 caratteri, `text`) | `5px 10px`, `white-space: nowrap` | idem |
| padding testo lungo (>34 caratteri) | `7px 11px`, `white-space: normal` | idem |
| padding con `content` | `8px 12px` | `12px 14px` |
| max-width | 260px (testo) / 320px (content) | idem |
| width | `max-content`, `overflow-wrap: anywhere` | idem |
| box-shadow | `0 4px 12px rgba(32,71,105,0.25)` | `0 8px 24px rgba(32,71,105,0.18)` |

Standard di piattaforma: tooltip **scuro**, mai l'attributo `title=` nativo (eccezione tollerata: alcuni campi form mettono `title` col valore corrente, §3.15).

### 3.7 TruncatedText (`src/core/components/TruncatedText.tsx`)

Props: `text: string` (testo mostrato, anche abbreviato), `full?: string` (testo completo per il tooltip, default `text`), `className?` (dà la `max-width` della colonna), `position?` (default `'top'`).

```tsx
<span ref={ref} className={clsx('sib-truncate', className)}>{text}</span>
// .sib-truncate { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
```

- Misura l'overflow (`scrollWidth > clientWidth + 1`) al montaggio e con un `ResizeObserver` (si riadatta quando la sidebar apre/chiude).
- Se il testo è troncato **oppure** `full` ≠ `text` (abbreviazione) avvolge lo span in `<Tooltip content={full ?? text} variant="light">`.

⚠ Nota di fedeltà: `TruncatedText` usa la variante **light** del Tooltip (sfondo bianco, bordo `#E2E8F0`, testo `#1f2937`, radius 10, padding `12px 14px`, max-width 320px, testo a capo). Tutti gli altri tooltip (icone, filtri, bottoni) sono **scuri**. Per una riproduzione identica mantenere questa differenza.

### 3.8 ThLabel (`src/core/components/ThLabel.tsx`)

Intestazione di colonna con etichetta intera e abbreviata:

```tsx
<ThLabel full="Dipendente" short="Dip." />
// →
<span className="sib-th-full"><TruncatedText text="Dipendente" /></span>
<span className="sib-th-short"><TruncatedText text="Dip." full="Dipendente" /></span>
```

Mixin (`_mixins.sass`):

```sass
=th-labels                  // a livello globale nel .sass di pagina
  .sib-th-full
    display: block
    min-width: 0
    overflow: hidden
  .sib-th-short
    display: none
    min-width: 0
    overflow: hidden

=th-compact                 // DENTRO la container query, annidato nella classe root della pagina
  .sib-th-full
    display: none
  .sib-th-short
    display: block
```

Sopra soglia si vede l'etichetta intera (con tooltip solo se troncata); sotto soglia l'abbreviazione puntata con tooltip «full» sempre presente.

### 3.9 Pagination (`src/core/components/Pagination.tsx`)

Props: `page`, `totalPages`, `onPageChange(page)`, `className?`; modalità «ricca» opzionale con `total`, `pageStart`, `pageEnd`, `pageSize`, `pageSizeOptions` (default `[10, 25, 50, 100]`), `onPageSizeChange`.

Numeri mostrati: se `totalPages ≤ 7` tutti; se `page ≤ 3` → `1 2 3 4 … N`; se `page ≥ N−2` → `1 … N−3 N−2 N−1 N`; altrimenti `1 … p−1 p p+1 … N`.

Markup modalità semplice (quella usata in HR) — **ritorna `null` se `totalPages ≤ 1`**:

```tsx
<div className={`flex items-center gap-1.5 ${className}`}>
  <button className="navBtn" disabled={page === 1}><i className="fa-duotone fa-chevron-left" /* 11px */ /> Indietro</button>
  <button className="w-8 h-8 …">1</button> … <span className="px-1 text-xs font-semibold text-ink-muted">...</span> …
  <button className="navBtn" disabled={page === totalPages}>Avanti <i className="fa-duotone fa-chevron-right" /* 11px */ /></button>
</div>
```

| Elemento | Stile |
|---|---|
| Contenitore | flex, gap 6px |
| «Indietro» / «Avanti» | `flex items-center gap-6px`, padding `0 12px`, altezza 32px, radius 6px, Open Sans 12px 600, bg `primary-100`, testo `ink`, hover bg `primary-200`, `transition-colors 150ms`; disabled `opacity .4`, `cursor:not-allowed`, nessun cambio all'hover |
| Numero | 32×32, radius 6px, 12px 600; normale bg `primary-100` testo `ink`, hover `primary-200`; **pagina corrente bg `primary` testo bianco** |
| Ellissi | `...` 12px 600 `ink-muted`, padding `0 4px` |

Modalità ricca: `justify-between`, a sinistra «Mostra **a**–**b** di **N**» (12px muted, numeri in `ink` grassetto), al centro i controlli, a destra «Righe per pagina» + `select.sib-select.sib-select--dense.w-auto`.

**Sempre centrata**: il contenitore della paginazione deve avere `justify-content: center` (nelle pagine HR `+hr-pag`: `display:flex; justify-content:center; margin-top:4px`).

### 3.10 ColFilters / `useColFilters` (`src/core/components/ColFilters.tsx` + `.sass`)

Icone di filtro nell'intestazione di colonna: imbuto (scelte multiple), lente (ricerca testo), ordinamento.

```tsx
const cf = useColFilters()
const filtered = rows.filter(r => cf.matchMulti(r.stato, 'stato') && cf.matchText(r.nome, 'nome'))
const sorted = cf.sortRows(filtered)
<th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'stato', { options: STATI, sort: true })}</span></th>
```

API restituita: `text`, `multi`, `sort`, `matchText(val,k)` (contiene, case-insensitive), `matchMulti(val,k)` (nessuna scelta = tutte), `sortRows(rows)` (numeri per differenza, il resto `localeCompare`; date ISO `aaaa-mm-gg` per ordine lessicografico), `th(colKey, label, cfg)`, `hasActive`, `reset()`, `setText`, `toggleMulti`, `setMultiFor(k, vals)`.

Ordinamento a 3 stati per clic: nessuno → crescente → decrescente → nessuno.

Testi (con `label` = secondo argomento di `th`, di solito in minuscolo):

| Elemento | Icona | Tooltip (scuro) / aria-label |
|---|---|---|
| Imbuto | `fa-solid fa-filter` | «Filtra per {label}» |
| Lente | `fa-solid fa-magnifying-glass` | «Cerca in {label}» |
| Ordina (inattivo) | `fa-solid fa-arrow-down-arrow-up` | «Ordina per {label}» |
| Ordina crescente | `fa-solid fa-arrow-up-short-wide` | «Ordine crescente — clicca per decrescente» |
| Ordina decrescente | `fa-solid fa-arrow-down-wide-short` | «Ordine decrescente — clicca per rimuovere» |
| Titolo popup imbuto | — | «scelte multiple» (minuscolo, così nel codice) |
| Placeholder ricerca | — | «Cerca {label in minuscolo}…» |

Popup: `position: fixed`, `top = rect.bottom + 6`, `left = clamp(12, rect.left, innerWidth − 200 − 12)`; si chiude con clic sull'overlay trasparente (`position:fixed; inset:0; z-index:30`), su scroll (qualsiasi, in capture) e su resize. Un solo popup aperto per volta.

```sass
.sib-colf-head
  display: inline-flex; align-items: center; gap: 6px
.sib-colf
  position: relative; display: inline-flex; align-items: center; gap: 2px
.sib-colf__btn
  display: inline-flex; align-items: center; justify-content: center
  width: 20px; height: 20px; border: 0; border-radius: 4px
  background: none; color: $text-inactive; cursor: pointer
  i
    font-size: 11px
  &:hover
    background: var(--color-primary-100)
    color: var(--color-primary)
  &--on                                  // filtro/ordinamento attivo
    color: var(--color-primary)
.sib-colf__pop
  position: fixed; z-index: 31
  width: 200px; max-height: 260px; overflow-y: auto
  padding: 8px
  background: var(--color-surface)
  border: 1px solid $border; border-radius: 8px
  box-shadow: 0 8px 24px rgba(0, 0, 0, .14)
.sib-colf__pop-title
  font-size: 11px; font-weight: 600; color: $text-inactive; margin-bottom: 6px
.sib-colf__opt                           // <label><input type=checkbox/><span/></label>
  display: flex; align-items: center; gap: 8px
  padding: 4px 2px; font-size: 12.5px; font-weight: 400
  color: $text-active; white-space: nowrap; cursor: pointer
  &:hover
    color: var(--color-primary)
.sib-colf__input
  width: 100%; height: 30px
  border: 1px solid $border; border-radius: 6px; padding: 0 8px
  font-size: 12px; color: $text-active; background: var(--color-surface); outline: none
  &:focus
    border-color: var(--color-primary-300)
```

Nelle tabelle a larghezza fissa (`+table-fit`) la `.sib-colf-head` diventa `display:flex; min-width:0` e il cluster `.sib-colf` `flex: 0 0 auto` (l'etichetta si stringe ed ellissa, le icone no). Per colonne allineate a destra/centro le pagine aggiungono `justify-content: flex-end/center` sulla `.sib-colf-head`.

### 3.11 Toast (`src/core/components/Toast/`)

API imperativa — **attenzione all'ordine: prima il messaggio, poi il titolo**:

```ts
import { toast } from '…/core/components/Toast/useToast'
toast.success('Rimborso di 120,00 € registrato.', 'Spesa rimborsata')   // (message, title?)
toast.error(message, title?)
toast.warning(message, title?)
toast.info(message, title?)
```

- Durata **4000ms** (default di `push`), poi rimozione automatica; chiusura manuale con la ✕. Più toast si impilano.
- Store `useToastStore` non persistito.

Markup:

```tsx
<div className="toaster" role="region" aria-live="polite" aria-label="Notifiche">
  <div className="toast toast--success" role="status">
    <i className="fa-light fa-circle-check toast__icon" />      {/* error: fa-circle-xmark · warning: fa-triangle-exclamation · info: fa-circle-info */}
    <div className="toast__body">
      <div className="toast__title">{title}</div>                {/* solo se presente */}
      <div className="toast__msg">{message}</div>
    </div>
    <button className="toast__close" aria-label="Chiudi"><i className="fa-light fa-xmark" /></button>
  </div>
</div>
```

```sass
.toaster
  position: fixed; bottom: 24px; right: 24px; z-index: 9999
  display: flex; flex-direction: column; gap: 10px
  max-width: min(380px, calc(100vw - 48px))
  pointer-events: none
.toast
  pointer-events: auto
  display: flex; align-items: flex-start; gap: 10px
  padding: 12px 14px
  background: $white
  border: 1px solid $border
  border-left: 3px solid $border
  border-radius: $radius-md                 // 6px
  box-shadow: $shadow-lg
  animation: toast-in 200ms cubic-bezier(0.4, 0, 0.2, 1)
  &__icon   { font-size: 16px; line-height: 1.4; flex-shrink: 0 }
  &__body   { flex: 1; min-width: 0 }
  &__title  { font-family: $font-heading; font-size: 13px; font-weight: 600; color: $text-active; margin-bottom: 2px }
  &__msg    { font-size: 12.5px; color: $text-inactive; line-height: 1.45; word-break: break-word }
  &__close
    flex-shrink: 0; background: transparent; border: none
    color: $text-disabled; cursor: pointer; font-size: 13px; padding: 2px 4px; line-height: 1
    transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1)
    &:hover { color: $text-active }
  &--success { border-left-color: $success-mid;  .toast__icon { color: $success } }
  &--error   { border-left-color: $error;        .toast__icon { color: $error-dark } }
  &--warning { border-left-color: $warning;      .toast__icon { color: $warning } }
  &--info    { border-left-color: $link;         .toast__icon { color: $link } }
@keyframes toast-in
  from { opacity: 0; transform: translateY(8px) }
  to   { opacity: 1; transform: translateY(0) }
```

Nessuna animazione d'uscita (il toast sparisce).

### 3.12 VistaSwitch (`src/core/components/VistaSwitch.tsx` + `.sass`)

Selettore di vista a segmenti, da mettere nelle `actions` di PageHead.

Props: `value`, `options: { value, label, icon /* es. 'fa-calendar-days' */, hint? }[]`, `onChange(v)`, `ariaLabel?` (default «Vista»).

```tsx
<div className="vsw" role="radiogroup" aria-label="Vista" style="--vsw-n:2; --vsw-i:0">
  <span className="vsw__thumb" aria-hidden="true" />
  <button type="button" role="radio" aria-checked="true" className="vsw__opt vsw__opt--on">
    <span className="vsw__ico"><i className="fa-solid fa-calendar-days" /></span>
    <span className="vsw__txt"><span className="vsw__label">Giornaliera</span><span className="vsw__hint">…</span></span>
  </button>
  …
</div>
```

```sass
.vsw
  --vsw-pad: 3px
  position: relative; flex: none
  display: inline-grid; grid-auto-columns: 1fr; grid-auto-flow: column
  width: max-content
  padding: var(--vsw-pad)
  border: 1px solid $border; border-radius: 10px
  background: $bg                           // --color-bg #F8FCFF
  isolation: isolate
  &__thumb
    position: absolute; z-index: 0
    top: var(--vsw-pad); bottom: var(--vsw-pad); left: var(--vsw-pad)
    width: calc((100% - 2 * var(--vsw-pad)) / var(--vsw-n))
    border-radius: 7px
    background: $white
    box-shadow: 0 1px 2px rgba(15, 23, 42, .08), 0 4px 12px rgba(32, 71, 105, .12)
    transform: translateX(calc(100% * var(--vsw-i)))
    transition: transform .32s cubic-bezier(.34, 1.36, .64, 1)      // leggero rimbalzo
  &__opt
    position: relative; z-index: 1
    display: flex; align-items: center; justify-content: center; gap: 7px; min-width: 0
    padding: 2px 11px 2px 3px
    border: none; border-radius: 7px; background: transparent
    color: $text-inactive; text-align: left; cursor: pointer
    transition: color .2s
    &:hover:not(.vsw__opt--on)
      color: $text-active
      .vsw__ico { background: $primary-50 }
    &:focus-visible { outline: 2px solid $primary; outline-offset: -2px }
    &--on { color: $primary; cursor: default }
  &__ico
    flex: none; width: 22px; height: 22px; border-radius: 6px
    display: inline-flex; align-items: center; justify-content: center
    background: transparent; font-size: 11px
    transition: background .2s, color .2s, transform .32s cubic-bezier(.34, 1.36, .64, 1)
  &__opt--on &__ico
    background: $primary; color: var(--color-surface); transform: scale(1.04)
  &__txt   { min-width: 0; display: flex; flex-direction: column; line-height: 1.2 }
  &__label { font-family: $font-heading; font-size: 12px; font-weight: 700; white-space: nowrap }
  &__hint  { font-size: 11px; color: $text-inactive; white-space: nowrap }
@media (prefers-reduced-motion: reduce)
  .vsw__thumb, .vsw__ico
    transition: none
```

`--vsw-n` (numero opzioni) e `--vsw-i` (indice attivo) sono le uniche custom property passate in linea.

### 3.13 AlertBanner (`src/core/components/AlertBanner.tsx`, stile `_feedback.sass`)

Props: `type?: 'success'|'error'|'warning'|'info'` (default `'success'`), `children`, `className?`.

```tsx
<div className="alert-banner alert-banner--{type}">
  <i className="fa-duotone fa-check" /* 16px */ />   {/* error: fa-circle-exclamation · warning: fa-triangle-exclamation · info: fa-circle-info */}
  {children}
</div>
```

```sass
.alert-banner
  display: flex; align-items: center; gap: 8px
  border-radius: $radius-lg            // 10px
  padding: 10px 16px
  margin-bottom: 16px
  font-family: $font-body; font-size: 13px; font-weight: 600
  &--success { background: $success-light; border: 1px solid alpha($success, 0.2); color: $success }
  &--error   { background: $error-light;   border: 1px solid alpha($error, 0.2);   color: $error }
  &--warning { background: $warning-light; border: 1px solid alpha($warning, 0.2); color: $warning }
  &--info    { background: $link-light;    border: 1px solid alpha($link, 0.2);    color: $link }
```

### 3.14 Badge, EmptyState, Skeleton, Spinner

- **`.badge`** (`_feedback.sass`): `inline-flex; gap 4px; radius 4px; padding 2px 8px; 10px 600; nowrap; line-height 1.4`; varianti `--success/--error/--warning/--info/--neutral/--disabled` (fondo `-light` + testo pieno), `--md` 11px `3px 10px`. Per le pagine HR **non** si usano badge con fondo per gli stati: si usa testo colorato (`+hr-stato`, §4.6).
- **`.sib-empty`**: `text-align:center; padding: 32px 0; 12px; ink-muted`. **`.sib-empty-state`**: card bianca bordata radius 6px, padding `40px 24px`, 13px muted.
- **EmptyState** (`EmptyState.tsx`, `.empty-state`): colonna centrata, gap 10px, padding `48px 24px`; icona `fa-light fa-{icon}` (default `inbox`) 32px `text-disabled` (mb 4px); titolo Poppins 15px 600 `text-active`; sottotitolo 13px `text-inactive` max-width 360px line-height 1.5; azione mt 8px.
- **Skeleton** (`Skeleton.tsx`, `.skeleton`): blocco con sfondo `alpha($primary, .08)`, radius 4px, shimmer `::after` con gradiente `transparent → alpha($white, .65) → transparent` che scorre `skeleton-shimmer 1.4s ease-in-out infinite`; varianti `--text` (altezza .8em, margin .2em 0), `--rect`, `--circle`; width/height inline (unica eccezione ammessa).
- **Spinner** `.spinner`: 20×20, bordo 2.5px `primary-200` con top `primary`, `spin .75s linear infinite`; `--sm` 14px/2px, `--lg` 32px/3px, `--white`.

### 3.15 Campi form (`src/core/components/form/`)

Regole comuni a tutti i campi con label:

- Wrapper `div.flex.flex-col.gap-1` (gap **4px** label → campo → messaggio).
- **Label**: `<label class="text-[12px] font-semibold font-poppins text-primary">` → Poppins **12px 600**, colore `--color-primary`, case normale (MAI uppercase, MAI letter-spacing). Se `required` aggiunge `<span class="text-error ml-0.5">*</span>` (asterisco rosso `#FF616E`, margine 2px). Le sigle note nella label sono sottolineate a puntini con tooltip (`withAcronimi`: `text-decoration: underline dotted 1px`, offset 3px, colore `alpha($primary,.45)` → `$primary` all'hover, `cursor: help`).
- **Errore**: `<span class="text-[11px] font-opensans text-error"><i class="fa-light fa-circle-exclamation mr-1"/>{error}</span>` (11px, `--color-error`, icona con margine 4px). TextareaField, CheckboxField e RadioGroup mostrano l'errore **senza** icona.
- **Hint** (solo se non c'è errore): `text-[11px] font-opensans text-ink-muted` (11px, `--color-text-inactive`).
- `aria-invalid` = presenza di errore; `aria-describedby` punta all'errore o all'hint.
- **Altezza standard 34px** per input e select.

#### 3.15.1 `.sib-input` (base di InputField, DatePickerField, SearchField, TextareaField)

```css
.sib-input {
  width: 100%; height: 34px; padding: 0 12px;
  border: 1px solid var(--color-border); border-radius: 6px;
  font: 13px 'Open Sans', sans-serif; color: var(--color-text-active);
  background: #fff;                                  /* bg-white; in dark → var(--color-surface) */
  outline: none; box-sizing: border-box;
  text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
  transition: border-color 150ms, box-shadow 150ms;
}
.sib-input:hover          { border-color: var(--color-primary-400); }
.sib-input:focus-visible  { border-color: var(--color-link); box-shadow: 0 0 0 3px var(--color-focus-ring); }
.sib-input--lg            { height: 40px; }
.sib-input--dense         { height: 34px; font-size: 12px; }
.sib-input--error         { border-color: var(--color-error); }
.sib-input--error:focus-visible { border-color: var(--color-error); box-shadow: 0 0 0 3px var(--color-error-light); }
```

Placeholder: colore browser di default in chiaro; in dark `--color-text-disabled`. Disabled: comportamento nativo (nessuna regola dedicata su `.sib-input`).

#### 3.15.2 InputField

Props: `label?`, `name`, `type?` (`text|email|password|number|tel|url`, default `text`), `value?`, `defaultValue?`, `placeholder?`, `hint?`, `error?`, `disabled?`, `readOnly?`, `required?`, `iconLeft?` / `iconRight?` (classi FA complete, es. `'fa-light fa-envelope'`), `maxLength?`, `min?`, `max?`, `step?`, `autoComplete?`, `ariaLabel?` (campo senza label, es. in cella), `dense?`, `onChange?`, `onBlur?`, `onFocus?`, `className?` (sul wrapper).

- Icone: posizionate `absolute left-3` / `right-3` (12px dal bordo), 13px, `text-ink-subtle` (`#A9AAAD`), `pointer-events:none`; con icona il padding diventa 36px (`pl-9` / `pr-9`).
- `type="password"`: pulsante occhio a destra (`fa-light fa-eye` / `fa-eye-slash`, 13px, `tabIndex -1`) che mostra/nasconde.
- `title` = valore corrente (per leggere valori troncati).

#### 3.15.3 SelectField (doppia chevron)

Props: `label?`, `name`, `options: { value, label, disabled? }[]`, `value?`, `defaultValue?`, `placeholder?` (diventa `<option value="" disabled>`), `hint?`, `error?`, `disabled?`, `required?`, `ariaLabel?`, `onChange?`, `onBlur?`, `className?`. `title` = label dell'opzione selezionata. Con `value` controllato non passa `defaultValue`.

```css
.sib-select {
  width: 100%; height: 34px; padding: 0 32px 0 12px;
  border: 1px solid var(--color-border); border-radius: 6px;
  font: 13px 'Open Sans', sans-serif; color: var(--color-text-active); background-color: #fff;
  outline: none; box-sizing: border-box;
  text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
  appearance: none; background-repeat: no-repeat;
  transition: border-color 150ms, box-shadow 150ms;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%236E7175' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5.75 10.75L8 13L10.25 10.75'/%3E%3Cpath d='M10.25 5.25L8 3L5.75 5.25'/%3E%3C/svg%3E");
  background-position: right 8px center;
}
.sib-select:hover         { border-color: var(--color-primary-400); }
.sib-select:focus-visible { border-color: var(--color-link); box-shadow: 0 0 0 3px var(--color-focus-ring); }
.sib-select--dense        { height: 34px; font-size: 12px; }
/* errore: SelectField aggiunge .sib-input--error (bordo error) */
/* dark: stroke della freccia %239AA2AE */
```

La freccia è **sempre** questa doppia chevron su/giù 16×16 (stroke `#6E7175` 1.5px) a 8px dal bordo destro. Un `<select>` stilizzato con `.sib-input` mostrerebbe la freccia nativa: va evitato (usare SelectField).

#### 3.15.4 TextareaField

Props: `label?`, `name`, `value?`, `defaultValue?`, `placeholder?`, `hint?`, `error?`, `disabled?`, `required?`, `rows?` (default **4**), `onChange?`, `onBlur?`, `className?`. Classi `sib-input h-auto py-2 resize-y min-h-[80px]` → altezza automatica, padding verticale 8px, ridimensionabile in verticale, minimo 80px. (Eredita `white-space: nowrap` da `.sib-input`: il testo lungo va comunque a capo nella textarea in quanto controllo nativo.)

#### 3.15.5 DatePickerField

Props come InputField più `type?: 'date'|'datetime-local'|'time'|'month'|'week'` (default `'date'`), `min?`, `max?` (stringhe ISO). È un `<input type="date">` nativo con classe `.sib-input` (34px). Il formato mostrato dipende dal browser in locale italiano (gg/mm/aaaa); il valore è ISO `aaaa-mm-gg`. Label senza `withAcronimi`.

#### 3.15.6 DateRangeField (due calendari affiancati)

Standard per **ogni** selezione di intervallo: mai due campi «Da»/«A» separati.

⚠ Nota di fedeltà: il componente oggi usa **RSuite `DateRangePicker`** (non `react-day-picker` come indicato in documenti più vecchi). L'effetto è lo stesso: popup con **due mesi affiancati**, selezione con anteprima dell'intervallo, settimana da lunedì.

Props: `label?`, `nameFrom`, `nameTo`, `valueFrom?`, `valueTo?` (ISO `aaaa-mm-gg`), `defaultFrom?`, `defaultTo?`, `hint?`, `error?`, `disabled?`, `required?`, `min?`, `max?` (ISO), `isDateDisabled?(d)`, `onChangeFrom?`, `onChangeTo?` (ricevono un evento sintetico `{ target: { value: 'aaaa-mm-gg' | '', name } }`), `onChange?(from: Date|null, to: Date|null)`, `className?`.

Configurazione RSuite: `locale = it_IT`, `format="dd/MM/yyyy"`, separatore `character=" – "` (spazio, trattino lungo, spazio), icona `fa-regular fa-calendar` a destra, `isoWeek` (lunedì primo giorno), `ranges={[]}` (nessuna scorciatoia), `cleanable={false}` (non svuotabile), `placeholder="Seleziona periodo"`, `placement="bottomStart"`, giorni disabilitati fuori da `min`/`max` o da `isDateDisabled`. Il valore viene mostrato solo se entrambe le date sono valide.

```sass
// rimappa il "primary" di RSuite sul blu Platform
:root
  --rs-primary-50:  var(--color-primary-50, #f2f5f7)
  --rs-primary-100: var(--color-primary-100, #dfe7ee)
  --rs-primary-200: var(--color-primary-200, #c0cfdd)
  --rs-primary-300: var(--color-primary-300, #93aac2)
  --rs-primary-400: var(--color-primary-400, #5e7f9f)
  --rs-primary-500: var(--color-primary, #204769)
  --rs-primary-600: var(--color-primary-700, #1b3d5c)
  --rs-primary-700: var(--color-primary-800, #16324c)
  --rs-primary-800: var(--color-primary-900, #11273b)
  --rs-primary-900: var(--color-primary-900, #0c1c2b)

.sib-daterange.rs-picker
  font-family: $font-body
  .rs-input-group.rs-input-group-inside
    height: 34px
    width: 204px                         // larghezza fissa del trigger
    border: 1px solid var(--color-border)
    border-radius: var(--radius-field, 6px)
    background: var(--color-surface)
    &:hover        { border-color: var(--color-border) }     // nessun effetto hover
    &:focus-within { border-color: var(--color-primary) }    // focus: bordo primary, senza ring
  .rs-input
    height: 32px; padding-top: 0; padding-bottom: 0
    font-size: 13px; color: var(--color-text-active); background: transparent
  .rs-picker-caret-icon
    color: var(--color-text-inactive)

.rs-theme-dark .rs-picker-popup
  --rs-bg-overlay: var(--color-surface)
  --rs-text-primary: var(--color-text-active)
  --rs-text-secondary: var(--color-text-inactive)
  --rs-border-primary: var(--color-border)
  border: 1px solid var(--color-border)

.rs-picker-popup
  z-index: 1050                          // sopra le modali (overlay z-index 100)
```

Il resto dell'aspetto del calendario (celle, giorni selezionati, intervallo, header mese) è quello predefinito di RSuite 5 con la palette primary rimappata. Le pagine HR allargano spesso il wrapper del campo periodo a 250px (`.xxx__field--periodo`), ma il trigger resta 204px.

#### 3.15.7 CheckboxField (con `indeterminate`)

Props: `label?`, `name`, `checked?`, `defaultChecked?`, `hint?`, `error?`, `disabled?`, `onChange?`, `className?`, `ariaLabel?` (per caselle senza label, es. selezione righe), `indeterminate?` (impostato via `ref.current.indeterminate`).

```tsx
<div className="flex items-start gap-2">
  <input type="checkbox" className="sib-checkbox mt-0.5" />
  <div className="flex flex-col gap-0.5">
    <label className="text-[13px] font-opensans text-ink cursor-pointer">{label}</label>
    {error / hint 11px}
  </div>
</div>
```

`.sib-checkbox`: checkbox **nativa** 14×14 (`w-3.5 h-3.5`), `accent-color: var(--color-primary)`, `cursor:pointer`; margine superiore 2px. `.sib-checkbox--sm` 12×12. Label 13px Open Sans `ink`. Lo stato «parziale» è il trattino nativo del browser in colore primary.

#### 3.15.8 ToggleSwitch (form)

`src/core/components/form/ToggleSwitch.tsx`. Props: `label?`, `description?`, `checked?` (default false), `disabled?`, `onChange?(checked)`, `className?`.

```tsx
<label className="flex items-center gap-3 cursor-pointer {disabled: opacity-50 cursor-not-allowed}">
  <button type="button" role="switch" aria-checked={checked}
    className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 {checked ? bg-primary : bg-ink-subtle}">
    <span className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 {checked ? translate-x-4 : translate-x-0}" />
  </button>
  <div className="flex flex-col">
    <span className="text-[13px] font-opensans text-ink font-medium">{label}</span>
    <span className="text-[11px] font-opensans text-ink-muted">{description}</span>
  </div>
</label>
```

Traccia 36×20 (bordo trasparente 2px), spento `#A9AAAD` (`--color-text-disabled`), acceso `--color-primary`; pomello bianco 16×16 con ombra `shadow-sm` Tailwind, sposta di 16px; transizioni 200ms. Gap 12px tra switch e testo.

Esiste anche un ToggleSwitch legacy (`src/core/components/ToggleSwitch.tsx`, classe `.toggle-switch`, `size` default 18 → 36×18, pomello `size−4`, `--on` primary / `--off` border, transizione `background .2s` e `left .2s`): usare quello di `form/`.

#### 3.15.9 RadioGroup

Props: `label?`, `name`, `options: { value, label, disabled?, tooltip? }[]`, `value?`, `hint?`, `error?`, `disabled?`, `onChange?(value)`, `className?`.

- Label del gruppo: `<span>` Poppins 12px 600 primary.
- Riga opzioni: `flex items-center gap-4 h-9` → gap **16px**, altezza **36px**.
- Opzione: `<label class="flex items-center gap-1.5 text-[13px] font-opensans">` + `input.sib-radio` (radio nativo, `accent-color: primary`); disabilitata: `cursor-not-allowed text-ink-muted opacity-60`.
- `tooltip` sull'opzione → avvolta nel Tooltip scuro (utile per spiegare un'opzione disabilitata).

#### 3.15.10 SearchField

Props: `name?` (default `'search'`, usato anche come `id`), `value?`, `defaultValue?`, `placeholder?` (default «Cerca...»), `disabled?`, `loading?`, `onSearch?(value)` (su Invio), `onChange?`, `onClear?`, `className?`.

- `input type="search"` con `.sib-input pl-9 pr-9` (padding 36px a sinistra e a destra), `autoComplete="off"`, `title` = valore.
- Icona a sinistra a 12px: `fa-light fa-magnifying-glass` 13px `ink-subtle`; con `loading` → `fa-light fa-spinner-third animate-spin`.
- Con valore non vuoto e non disabilitato: pulsante `fa-light fa-xmark` a destra (12px) che chiama `onClear` e rimette il focus.
- Nessuna label propria.

#### 3.15.11 Classi form legacy (`_forms.sass`)

`.field`, `.select` (freccia singola `polyline 6 9 12 15 18 9`), `.checkbox`, `.radio-group`, `.toggle-switch__track`, `.date-range`, `.form-grid--2/3/4/auto`, `.form-actions` esistono ma **non** vanno usate nelle pagine HR (la `.select` legacy ha la freccia singola, non conforme). Utili solo: `.form-grid` (`display:grid; gap:16px`, `--2` = `1fr 1fr`) e `.form-actions` (`flex; justify-content:flex-end; gap:8px; margin-top:16px`).

### 3.16 Kit Configuratore (`src/core/cfg/`)

Usato dalle voci della Configurazione HR (Reparti, Orari di lavoro, Turnistica, Contratti collettivi, Aziende in appalto, Collaboratori esterni, Integrazione paghe). Animazioni del kit solo sotto `@media (prefers-reduced-motion: no-preference)`; `cfgPrefersReducedMotion()` azzera i timing JS.

#### 3.16.1 CfgPane

Props: `trail: string[]` (breadcrumb prima della voce, es. `['Configuratore', 'Risorse umane']`), `onTrail?(index)`, `title`, `description?`, `icon?` (nome FA senza prefisso, reso `fa-light fa-{icon}`), `actions?`, `saveBar?`, `loading?` (corpo in skeleton), `children`, `className?`.

```tsx
<section className="cfg-pane">
  <header className="cfg-pane__head">
    <nav className="cfg-pane__crumbs" aria-label="Percorso">
      <button className="cfg-pane__crumb">Configuratore</button>      {/* <span … --static> se manca onTrail */}
      <i className="fa-light fa-chevron-right cfg-pane__crumb-sep" />
      …
      <span className="cfg-pane__crumb cfg-pane__crumb--current" aria-current="page">{title}</span>
    </nav>
    <div className="cfg-pane__title-row">
      <span className="cfg-pane__icon"><i className="fa-light fa-{icon}" /></span>
      <div className="cfg-pane__titles"><h2 className="cfg-pane__title">{title}</h2><p className="cfg-pane__desc">{description}</p></div>
      <div className="cfg-pane__actions">{actions}</div>
    </div>
  </header>
  <div className="cfg-pane__body">{loading ? skeleton : children}</div>
  {saveBar}
</section>
```

```sass
.cfg-pane
  display: flex; flex-direction: column; min-height: 0; height: 100%
  background: $white; border: 1px solid $border; border-radius: 8px; overflow: hidden
  &__head      { padding: 14px 22px 12px; border-bottom: 1px solid $border; background: $white; flex-shrink: 0 }
  &__crumbs    { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; min-width: 0 }
  &__crumb     { background: none; border: none; padding: 0; font-family: var(--font-body); font-size: 11.5px; font-weight: 500; color: $text-inactive; white-space: nowrap }
  &__crumb:is(button) { cursor: pointer }  &:hover → color: $primary; text-decoration: underline
  &__crumb--current { color: $primary; font-weight: 600; overflow: hidden; text-overflow: ellipsis }
  &__crumb-sep { font-size: 9px; color: $text-disabled; flex-shrink: 0 }
  &__title-row { display: flex; align-items: center; gap: 12px; min-width: 0 }
  &__icon      { 38×38; border-radius: 9px; background: $primary-50; color: $primary; font-size: 16px; inline-flex centrato; flex-shrink: 0 }
  &__titles    { min-width: 0; flex: 1 }
  &__title     { margin: 0; font-family: var(--font-heading); font-size: 17px; font-weight: 600; color: $primary; line-height: 1.25; nowrap + ellipsis }
  &__desc      { margin: 2px 0 0; font-size: 12px; line-height: 1.4; color: $text-inactive; nowrap + ellipsis }
  &__actions   { display: flex; align-items: center; gap: 8px; flex-shrink: 0 }
  &__body      { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 18px 22px }   // scrollbar 6px, thumb $border radius 3px
  &__skeleton  { flex column gap 16px }  — riga con due Skeleton rect 180×34, poi Skeleton rect 100%×200
```

Nota: dentro la `ConfiguratoreSezione` della pagina HR il pane può essere reso senza header (la scheda pagina specifica cosa è visibile).

#### 3.16.2 CfgTable

Props: `columns: { key, label: ReactNode, width?: '22%', align?: 'left'|'center'|'right' }[]`, `children` (righe `<tr>`), `empty?`, `className?`.

```tsx
<div className="sib-table-wrap cfg-table">
  <table className="sib-table cfg-table__fixed">      {/* __fixed se almeno una colonna ha width */}
    <colgroup>{columns.map(c => <col style="--cfg-col-w: {c.width ?? 'auto'}" />)}</colgroup>
    <thead><tr>{columns.map(c => <th className="cfg-table__th--{align}">{withAcronimi(c.label)}</th>)}</tr></thead>
    <tbody>{children || <tr className="cfg-table__empty-row"><td colSpan={n}>{empty ?? <span className="cfg-table__empty-text">Nessun elemento configurato</span>}</td></tr>}</tbody>
  </table>
</div>
```

```sass
.cfg-table
  overflow-x: hidden; margin-bottom: 0
  col { width: var(--cfg-col-w, auto) }
  &__fixed { table-layout: fixed }
  &__th--center { text-align: center }
  &__th--right  { text-align: right }
  &__empty-row td { padding: 0; border-bottom: none }
  &__empty-text   { display: block; padding: 28px 16px; text-align: center; font-size: 12.5px; color: $text-inactive }
.sib-table-wrap.cfg-table
  overflow-x: hidden          // due classi: batte overflow-x:auto di .sib-table-wrap
```

#### 3.16.3 CfgToolbar

Props: `children` (campi filtro), `actions?`, `className?`.

```sass
.cfg-toolbar
  display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 16px
  &__filters
    display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; flex: 1; min-width: 0
    > * { min-width: 170px }
  &__actions
    display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: auto
```

#### 3.16.4 CfgSaveBar

Props: `count` (con 0 e non in salvataggio non si renderizza), `onSave` (se ritorna Promise: spinner e toast d'esito), `onCancel`, `saving?`, `saveLabel?` («Salva»), `cancelLabel?` («Annulla»), `successMessage?` («Modifiche salvate»), `errorMessage?` («Salvataggio non riuscito. Riprova.»), `className?`.

Testo conteggio: «1 modifica non salvata» / «{n} modifiche non salvate». Pulsanti: «Annulla» `sib-btn--ghost` con colore `text-inactive`; «Salva» `sib-btn--primary` (+ `--loading` durante il salvataggio, entrambi disabilitati). Toast: `toast.success('Modifiche salvate')` / `toast.error('Salvataggio non riuscito. Riprova.')` (senza titolo).

```sass
.cfg-save-bar
  position: sticky; bottom: 0; z-index: 5
  display: flex; align-items: center; gap: 10px
  padding: 10px 22px
  background: $white; border-top: 1px solid $border; box-shadow: var(--shadow-md); flex-shrink: 0
  animation: cfg-save-bar-in .22s ease-out                 // translateY(100%), opacity 0 → 0, 1
  &__dot   { 8×8; radius 50%; background: $warning; animation: cfg-save-bar-pulse 1.6s ease-in-out infinite }   // opacity 1 → .35 → 1
  &__count { font-size: 12.5px; font-weight: 600; color: $text-active }
  &__actions { display: flex; align-items: center; gap: 8px; margin-left: auto }
  &__cancel  { color: $text-inactive }
```

`role="status"` sulla barra.

#### 3.16.5 CfgEmpty

Props: `icon?` (default `'inbox'`, reso `fa-light`), `title`, `subtitle?`, `action?`, `soon?` (mostra CfgBadge «In arrivo»), `className?`.

```sass
.cfg-empty
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px
  padding: 48px 24px; text-align: center
  border: 1px dashed $border; border-radius: 8px
  background: alpha($primary, .02)
  &__icon-ring { 52×52; radius 50%; background: $primary-50; color: $primary-600; font-size: 22px; margin-bottom: 4px }
  &__title     { font-family: var(--font-heading); font-size: 14px; font-weight: 600; color: $primary }
  &__subtitle  { margin: 0; max-width: 440px; font-size: 12.5px; line-height: 1.5; color: $text-inactive }
  &__soon      { margin-top: 4px }
  &__action    { margin-top: 10px }
```

#### 3.16.6 CfgBadge

Props: `status: 'configured'|'partial'|'empty'|'locked'|'soon'`, `compact?`, `className?`. `role="status"`, `aria-label` = etichetta.

| Stato | Etichetta | Indicatore | Colore testo | Fondo | Significato (tooltip nei contesti compatti) |
|---|---|---|---|---|---|
| `configured` | «Configurato» | `fa-solid fa-check` | `$success` | `alpha($success, .12)` | «Tutte le impostazioni obbligatorie di questa voce sono salvate.» |
| `partial` | «Da completare» | pallino 7px | `$warning` | `alpha($warning, .13)` | «Configurazione avviata: mancano ancora impostazioni obbligatorie.» |
| `empty` | «Da configurare» | pallino 7px | `$text-inactive` | `alpha($text-inactive, .1)` | «Nessuna impostazione salvata: la voce è ancora ai valori predefiniti.» |
| `locked` | «Bloccato» | `fa-solid fa-lock` | `$text-disabled` | `alpha($text-disabled, .12)` | «Si sblocca completando prima il configuratore richiesto.» |
| `soon` | «In arrivo» | `fa-solid fa-hourglass-half` | `$primary-600` | `$primary-50` + bordo `1px dashed $primary-300` | «Pane in costruzione: sarà disponibile in un prossimo rilascio.» |

Base: `inline-flex; gap 5px; height 20px; padding 0 8px; border-radius 10px; 11px 600; nowrap`; icona 9px; pallino 7px `currentColor`. **`compact`**: `height:auto; padding:0; background:none !important; border:none !important` → solo indicatore colorato, senza etichetta (forma usata nelle tab di ConfiguratoreSezione, conforme alla regola «niente pillole»).

⚠ Nota di fedeltà: la forma estesa di CfgBadge è una pillola (radius 10px con fondo): in HR compare solo in forma `compact` (tab) o dentro `CfgEmpty` con `soon`.

#### 3.16.7 CfgMultiSelect

Props: `label`, `options: string[]`, `value: string[]`, `onChange(next)`, `placeholder?` («Seleziona»), `nomePlurale?` («voci»), `sogliaRicerca?` (7), `disabled?`, `className?`.

- Trigger: mostra il placeholder (colore `text-inactive`), oppure il valore unico, oppure «{n} {nomePlurale} selezionate»; chevron `fa-solid fa-chevron-down` 10px che ruota 180° all'apertura (`.15s`).
- Pannello: si apre in basso o **in alto** se sotto ci sono meno di 300px e sopra c'è più spazio; chiusura con clic fuori o `Esc`; alla chiusura si azzera la ricerca.
- Ricerca (solo se le opzioni sono più di `sogliaRicerca`): icona `fa-light fa-magnifying-glass` 11px, placeholder «Cerca tra {n} {nomePlurale}…», `aria-label` «Cerca in {label}», autofocus.
- Lista: `role="listbox"` `aria-multiselectable`, opzioni con `input.sib-checkbox`; vuoto: «Nessun risultato».
- Piede: «Tutte» (o «Seleziona i risultati» se c'è una ricerca), «Nessuna», contatore «{sel}/{tot}».

```sass
.cfg-msel            { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0 }
.cfg-msel__label     { font-family: $font-heading; font-size: 12px; font-weight: 600; color: $primary }
.cfg-msel__trigger
  display: flex; align-items: center; justify-content: space-between; gap: 8px
  width: 100%; height: 34px; padding: 0 12px
  border: 1px solid $border; border-radius: 7px; background: $white
  font-family: $font-body; font-size: 13px; color: $text-active; cursor: pointer
  transition: border-color .15s
  &:hover, &.is-open  { border-color: $primary }
  &:focus-visible     { outline: none; border-color: $primary; box-shadow: 0 0 0 3px var(--color-focus-ring) }
  &:disabled          { background: $bg; color: $text-disabled; cursor: not-allowed }
.cfg-msel__pop
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20
  display: flex; flex-direction: column; min-width: 220px; padding: 6px
  border: 1px solid $border; border-radius: 8px; background: $white; box-shadow: var(--shadow-md)
.cfg-msel__pop--su   { top: auto; bottom: calc(100% + 4px) }
.cfg-msel__search    { display: flex; align-items: center; gap: 7px; padding: 4px 8px 8px; border-bottom: 1px solid $border }   // input 12.5px senza bordo
.cfg-msel__list      { display: flex; flex-direction: column; max-height: 240px; overflow-y: auto; padding: 4px 0 }
.cfg-msel__option    { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 5px; font-size: 12.5px; color: $text-active; cursor: pointer }  &:hover → background: $bg
.cfg-msel__empty     { margin: 0; padding: 12px 8px; text-align: center; font-size: 12px; color: $text-inactive }
.cfg-msel__quick     { display: flex; align-items: center; gap: 6px; margin-top: 4px; padding: 6px 8px 2px; border-top: 1px solid $border }
  button             { background: none; border: none; padding: 0; font: 600 11.5px $font-body; color: $primary; cursor: pointer }  &:hover → underline
.cfg-msel__count     { margin-left: auto; font-size: 11px; color: $text-inactive; tabular-nums }
```

Altri pezzi del kit (`CfgRangeRules`, `CfgLocked`, `CfgOpzioneErrore`) sono descritti nelle schede delle pagine che li usano.

### 3.17 ConfiguratoreSezione (`src/modules/impostazioni/Configuratore/ConfiguratoreSezione.tsx`)

Shell della pagina «Configurazione» di Human Resources: le voci del gruppo `risorse-umane` del registry impaginate come pagina normale (niente hub/sidebar del Configuratore di Impostazioni). In testa ci sono le **schede**, sotto la descrizione della voce, poi il pane.

Props: `items: { def: ConfiguratoreDef; status }[]`, `activeId`, `onSelect(id)`, `children`.

Voci HR (ordine, id, etichetta, icona `fa-light fa-*`, descrizione esatta):

| # | id | Etichetta | Icona | Descrizione |
|---|---|---|---|---|
| 1 | `hr-reparti` | «Reparti» | `sitemap` | «Reparti della struttura con codice, responsabile, centro di costo e reparto App Op! collegato.» |
| 2 | `hr-orari` | «Orari di lavoro» | `business-time` | «Orari contrattuali: full time e part time, fasce giornaliere, pause e monte ore settimanale.» |
| 3 | `hr-turnistica` | «Turnistica» | `arrows-rotate` | «Turni di servizio (mattina, pomeriggio, notte, spezzato) e schemi di rotazione con i riposi.» |
| 4 | `hr-ccnl` | «Contratti collettivi» | `file-contract` | «CCNL applicati con tipologie di contratto, livelli e minimi, ferie e permessi annui, maturazione, maggiorazioni, enti e fondi.» |
| 5 | `hr-aziende-appalto` | «Aziende in appalto» | `building-user` | «Imprese esterne (fornitori di Purchasing) con i dati identificativi, il contratto d’appalto, il DURC e i collaboratori che lavorano per loro.» |
| 6 | `hr-collaboratori-esterni` | «Collaboratori esterni» | `user-helmet-safety` | «Categorie degli addetti di ditte in appalto (reparti App Op!, documenti, durata dell’autorizzazione) e badge di riconoscimento.» |
| 7 | `hr-integrazione-paghe` | «Integrazione paghe» | `money-check-dollar` | «Collegamento con il software paghe (Zucchetti, TeamSystem, Inaz, Sistemi, Ranocchi, ADP): canale, credenziali, tracciato, codici voce e invio del consuntivo.» |

(Esiste anche l'id `hr-tipologie-contratto` nel tipo, gestito dentro «Contratti collettivi».)

Markup:

```tsx
<div className="cfg-sezione">
  <nav className="cfg-sezione__tabs" role="tablist" aria-label="Voci di configurazione">
    <button type="button" role="tab" aria-selected className="cfg-sezione__tab is-active">
      <i className="fa-light fa-sitemap" /><span>Reparti</span>
      {status !== 'configured' && <CfgBadge status={status} compact />}
    </button>
    …
  </nav>
  <p className="cfg-sezione__desc">{withAcronimi(active.description)}</p>
  <div className="cfg-sezione__body" key={activeId}>{children}</div>   {/* key → rimonta e ri-anima a ogni cambio scheda */}
</div>
```

```sass
.cfg-sezione
  display: flex; flex-direction: column; gap: 12px; min-width: 0
  container: cfg-sezione / inline-size
  &__tabs
    display: flex; flex-wrap: wrap; gap: 2px
    border-bottom: 1px solid $border
  &__tab
    display: inline-flex; align-items: center; gap: 8px
    padding: 10px 14px; margin-bottom: -1px
    border: 0; border-bottom: 2px solid transparent; background: transparent
    font-family: $font-heading; font-size: 13px; font-weight: 600
    color: $text-inactive; cursor: pointer
    transition: color 150ms cubic-bezier(0.4,0,0.2,1), border-color 150ms cubic-bezier(0.4,0,0.2,1)
    i { font-size: 14px }
    &:hover     { color: $text-active; border-bottom-color: $primary-300 }
    &.is-active { color: $primary; border-bottom-color: $primary }
  &__desc { margin: 0; font-size: 12.5px; color: $text-inactive }
  &__body
    display: flex; flex-direction: column; min-width: 0
    @media (prefers-reduced-motion: no-preference)
      animation: cfg-sezione-in .22s ease-out        // opacity 0, translateY(4px) → 1, none
@container cfg-sezione (max-width: 1180px)           // laptop con sidebar aperta: tab su una riga
  .cfg-sezione__tabs { flex-wrap: nowrap }
  .cfg-sezione__tab  { gap: 6px; padding: 10px 9px; font-size: 12.5px; white-space: nowrap }
```

### 3.18 Componenti HR condivisi (`src/modules/hr/`)

#### 3.18.1 StoricoHr (`_storico/StoricoHr.tsx` + `.sass`)

Timeline verticale di una richiesta o di una spesa: primo passo l'invio dall'App Op!, poi ogni intervento dell'ufficio del personale.

Props: `origine?: { at?: string /* ISO */; autore: string }`, `storico?: EventoHr[]`, `titolo?` (default «Storico»).

```ts
interface EventoHr {
  at: string            // ISO datetime
  autore: string        // nome dell'utenza collegata, altrimenti «Ufficio del personale»
  azione: string
  modifiche?: string[]  // es. "Periodo: 09/11 → 15/11/2026 diventa 10/11 → 14/11/2026"
  messaggio?: string    // messaggio al dipendente (motivo di rifiuto/modifica)
}
```

Icone per azione (`fa-solid`), testo dell'evento e tono:

| `azione` | Icona | Testo mostrato | Tono |
|---|---|---|---|
| «Inviata» | `fa-mobile-screen` | «Inviata dall'App Op!» | base |
| «Approvata» | `fa-circle-check` | «Approvata» | ok |
| «Rifiutata» | `fa-circle-xmark` | «Rifiutata» | ko |
| «Rimborsata» | `fa-money-bill` | «Rimborsata» | ok |
| «Modificata» | `fa-pen` | «Modificata» | mod |
| «Rimessa in attesa» | `fa-rotate-left` | idem | base |
| «Approvata dal responsabile» | `fa-user-check` | idem | ok |
| «Rifiutata dal responsabile» | `fa-user-xmark` | idem | ko |
| «Sollecito al responsabile» | `fa-bell` | idem | base |
| «Inserita dall'ufficio del personale» | `fa-user-pen` | idem | base |
| altro | `fa-circle` | azione | base |

Tono: `ok` se l'azione inizia per «Approvata» o è «Rimborsata»; `ko` se inizia per «Rifiutata»; `mod` se «Modificata»; altrimenti `base`.

Riga: icona + `<strong>{testo}</strong>` + meta «{autore} · {gg/mm/aaaa, hh:mm}» (`toLocaleString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })`, che produce «05/11/2026, 14:30»); sotto eventuale elenco puntato delle modifiche e il messaggio con icona `fa-solid fa-comment`. Se non ci sono eventi dell'ufficio: «Nessun intervento dell'ufficio del personale finora.»

```sass
.hrsto        { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid $border }
.hrsto__title { margin: 0; font-size: 12px; font-weight: 600; color: var(--color-primary) }
.hrsto__list  { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; max-height: 220px; overflow-y: auto }
.hrsto__item  { position: relative; display: flex; gap: 10px }
  &:not(:last-child)::after { content: ''; position: absolute; left: 11px; top: 24px; bottom: -10px; width: 1px; background: $border }   // linea di collegamento
.hrsto__ico   { flex: 0 0 auto; 22×22; border-radius: 50%; inline-flex centrato; font-size: 10px; background: $primary-50; color: var(--color-primary) }
.hrsto__item--ok  .hrsto__ico { background: $success-light; color: $success }
.hrsto__item--ko  .hrsto__ico { background: $error-light;   color: $error }
.hrsto__item--mod .hrsto__ico { background: $warning-light; color: $warning }
.hrsto__body  { min-width: 0; display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: $text-active }
.hrsto__head  { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px }
.hrsto__meta  { color: $text-inactive; font-size: 11px }
.hrsto__mods  { margin: 0; padding-left: 14px }
.hrsto__msg   { margin: 0; padding: 6px 8px; border-radius: $radius-md; background: $primary-50 }   i → color primary, margin-right 4px
.hrsto__empty { margin: 0; font-size: 12px; color: $text-inactive }
```

#### 3.18.2 Selezione multipla: `useSelezione` + `BarraSelezione` (`_selezione/`)

`useSelezione(visibili: string[], reset: unknown[])`: `visibili` = id delle righe della **pagina corrente**; `reset` = dipendenze che, cambiando (filtri, vista, pagina), azzerano la selezione. Restituisce `sel` (Set), `n`, `has(id)`, `toggle(id)`, `svuota()`, `tieni(esistenti)` (rimuove id non più esistenti), `tutteVisibili`, `parziale` (qualcuna ma non tutte → checkbox `indeterminate`), `toggleVisibili()` (seleziona/deseleziona tutte quelle della pagina).

`BarraSelezione` — props: `n`, `nome: [singolare, plurale]` (es. `['spesa','spese']`), `azioni: { label, icona /* 'fa-circle-check' */, quante, onClick, pericolo? }[]`, `onSvuota`. Non si renderizza con `n = 0`.

```tsx
<div className="hrsel" role="region" aria-label="Azioni sulle righe selezionate">
  <span className="hrsel__count"><strong>3</strong> spese selezionate</span>     {/* «1 spesa selezionata» */}
  <button type="button" className="hrsel__clear">Deseleziona</button>
  <div className="hrsel__acts">
    <button className="sib-btn sib-btn--secondary hrsel__btn" disabled={!quante}>
      <i className="fa-solid fa-circle-check" /> Approva (2)                     {/* «(n)» solo se quante > 0 */}
    </button>
    <button className="sib-btn sib-btn--danger hrsel__btn">…</button>           {/* pericolo: true */}
  </div>
</div>
```

```sass
.hrsel        { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 8px 12px; border: 1px solid $border; border-radius: $radius-md; background: $primary-50 }
.hrsel__count { font-size: 13px; color: $text-active }  strong → color: var(--color-primary)
.hrsel__clear { padding: 0; border: 0; background: none; font-size: 12px; color: var(--color-primary); text-decoration: underline; cursor: pointer }
.hrsel__acts  { margin-left: auto; display: flex; flex-wrap: wrap; gap: 8px }
.hrsel__btn   { white-space: nowrap }
```

La riga selezionata della tabella prende `background: $primary-50` su tutte le `td` (es. `.nsp .nsp__row--sel td`).

#### 3.18.3 Mixin di pagina `_hrGestione.sass`

Usati da Nota spese, Cedolini, Richieste, Piano ferie e altre pagine HR (`@use '../hrGestione' as *`).

```sass
=hr-root($name)                    // root della pagina = contenitore di query con nome
  display: flex
  flex-direction: column
  align-items: stretch
  gap: 12px
  font-size: 13px
  container-type: inline-size
  container-name: $name

=hr-toolbar                        // riga filtri sopra la tabella, allineata in basso (label di altezze diverse)
  display: flex
  align-items: flex-end
  gap: 10px
  flex-wrap: wrap
  > *
    min-width: 0

=hr-field($w: 200px)               // contenitore di un campo filtro a larghezza fissa
  width: $w
  display: flex
  flex-direction: column
  gap: 6px

=hr-push                           // gruppo spinto a destra (export, azioni)
  margin-left: auto
  display: flex
  align-items: center
  gap: 8px

=hr-icon-btn                       // pulsante quadrato export Excel, alto come i campi
  width: 34px
  height: 34px
  border: 0
  border-radius: 8px
  background: var(--color-primary)
  color: #fff
  cursor: pointer
  display: inline-flex
  align-items: center
  justify-content: center
  &:hover
    filter: brightness(.92)

=hr-wrap                           // aggiunto a .sib-table-wrap
  border: 1px solid $border
  overflow-x: hidden

=hr-act                            // bottone-icona azione in tabella: senza box, blu
  border: 0
  background: none
  padding: 0
  cursor: pointer
  display: inline-flex
  align-items: center
  justify-content: center
  line-height: 1
  color: var(--color-primary)
  &:disabled
    cursor: default
    opacity: .35

=hr-stato                          // stato in testo colorato (mai pillola)
  font-weight: 600
  &--attesa { color: $warning }        // #F57D03
  &--ok     { color: $success }        // #007035
  &--ko     { color: $error }          // #FF616E
  &--neutro { color: $text-inactive }  // #6E7175
  &--info   { color: $link }           // #5C9CD4

=hr-empty                          // cella "nessun risultato"
  text-align: center
  color: $text-inactive
  padding: 28px 0 !important

=hr-pag                            // paginazione centrata
  display: flex
  justify-content: center
  margin-top: 4px

=hr-foot                           // riga riepilogativa sotto la tabella (al posto delle stat-card)
  display: flex
  justify-content: flex-end
  gap: 18px
  flex-wrap: wrap
  font-size: 12px
  color: $text-inactive
  strong
    color: $text-active

=hr-modal-body
  display: flex
  flex-direction: column
  gap: 14px
  padding: 4px 2px

=hr-modal-grid
  display: grid
  grid-template-columns: 1fr 1fr
  gap: 12px

=hr-modal-actions                  // piede delle modali HR: Annulla (secondary) + conferma (primary/danger)
  display: flex
  justify-content: flex-end
  gap: 8px
  padding-top: 4px

=hr-table-compact                  // dentro la container query di pagina
  font-size: 12px
  thead th
    font-size: 11px
  th, td
    padding-left: 6px
    padding-right: 6px
```

Il pulsante export Excel nelle toolbar HR:

```tsx
<div className="nsp__push">
  <Tooltip text="Esporta in Excel">
    <button type="button" className="nsp__icon-btn" onClick={esporta} aria-label="Esporta in Excel">
      <i className="fa-regular fa-file-xls" style="font-size:16px; color:#fff" />   {/* <Ico n="excel" w="regular" s={16} c="#fff" /> */}
    </button>
  </Tooltip>
</div>
```

#### 3.18.4 Export Excel `hrExport.ts`

```ts
exportXls(fileName: string, cols: string[], rows: (string | number)[][])
```

- Genera una **tabella HTML** (`<table border="1" cellspacing="0" cellpadding="4">` con `<thead>` e `<tbody>`, `<meta charset="utf-8">`), con escape di `&`, `<`, `>`; Blob `application/vnd.ms-excel`; download con estensione `.xls` aggiunta se manca.
- Al termine toast: `toast.success('{n} righe esportate in Excel.', 'Esportazione completata')`.
- I valori sono già formattati come in pagina (date `gg/mm/aaaa`, importi `1.234,50 €`).
- Backend: nessuno (generazione lato client). Un'implementazione server equivalente deve restituire lo stesso file con le stesse colonne.

### 3.19 Ico (`src/core/icons/Ico.tsx`)

Wrapper Font Awesome Pro (kit JS caricato in `public/index.html`). Props: `n` (nome logico), `s` (px, default 20), `c` (colore, default `#fff`), `c2` (secondario duotone), `w` (`'duotone'|'light'|'regular'|'solid'|'thin'`, default **`'duotone'`**). Rende `<i class="fa-{w} {classe}" style="font-size:{s}px; color:{c}; flex-shrink:0">`. Nome sconosciuto → `fa-circle-dot` (e warning in sviluppo). `n="op"` rende il wordmark «Op!» (Poppins 700, opacità .7, font-size `s × 0.68`). Opacità secondaria duotone globale `--fa-secondary-opacity: 0.20`.

Mappa nomi → classi FA:

| n | classe | n | classe | n | classe |
|---|---|---|---|---|---|
| home | fa-house | back | fa-chevron-left | chevd | fa-chevron-down |
| chevr | fa-chevron-right | chevu | fa-chevron-up | menu | fa-bars |
| search | fa-magnifying-glass | edit | fa-pen-to-square | trash | fa-trash |
| plus | fa-circle-plus | check | fa-check | circle-check | fa-circle-check |
| thumbs-up | fa-thumbs-up | **excel** | **fa-file-xls** | play | fa-play |
| pause | fa-pause | stop | fa-stop | x | fa-xmark |
| upload | fa-arrow-up-from-bracket | refresh | fa-rotate-right | save | fa-floppy-disk |
| user | fa-user | profile | fa-circle-user | logout | fa-arrow-right-from-bracket |
| org | fa-sitemap | bell | fa-bell | alert | fa-triangle-exclamation |
| gear | fa-gear | wheel | fa-compass | bar | fa-chart-column |
| cart | fa-cart-shopping | camera | fa-camera | image | fa-image |
| lock | fa-lock | unlock | fa-lock-open | eye | fa-eye |
| eye-off | fa-eye-slash | copy | fa-copy | link | fa-link |
| download | fa-download | filter | fa-filter | sort | fa-sort |
| star | fa-star | flag | fa-flag | print | fa-print |
| share | fa-share-nodes | share-nodes | fa-share-nodes | info | fa-circle-info |
| question | fa-circle-question | expand | fa-expand | dots | fa-ellipsis |
| dots-v | fa-ellipsis-vertical | eraser | fa-eraser | send | fa-paper-plane |
| tag | fa-tag | calendar | fa-calendar-days | calendar-clock | fa-calendar-clock |
| clock | fa-clock | hourglass | fa-hourglass-half | infinity | fa-infinity |
| landmark | fa-landmark | minus-circle | fa-circle-minus | battery-empty | fa-battery-empty |
| battery-low | fa-battery-quarter | battery-mid | fa-battery-half | battery-high | fa-battery-three-quarters |
| battery-full | fa-battery-full | cloud-sun | fa-cloud-sun | phone | fa-phone |
| email | fa-envelope | globe | fa-globe | headset | fa-headset |
| database | fa-database | layers | fa-layer-group | power | fa-power-off |
| dollar | fa-dollar-sign | minus | fa-minus | chart-line | fa-chart-line |
| heartbeat | fa-wave-square | file | fa-file-lines | book | fa-book-open |
| archive | fa-box-archive | briefcase | fa-briefcase | arrow-right | fa-arrow-right |
| arrow-left | fa-arrow-left | sliders / sliders-alt | fa-sliders | medal | fa-trophy |
| mobile | fa-mobile-screen | grid | fa-table-cells-large | map-pin | fa-location-dot |
| server | fa-server | hotel | fa-hotel | bed | fa-bed-front |
| building | fa-building | store | fa-store | utensils | fa-utensils |
| apartment | fa-building-user | qrcode | fa-qrcode | house-pen | fa-house |
| building-circle | fa-building-circle-check | arrows-rotate | fa-arrows-rotate | concierge-bell | fa-bell-concierge |
| list-check | fa-list-check | leaf | fa-leaf | recycle | fa-recycle |
| trend-up | fa-arrow-trend-up | trend-down | fa-arrow-trend-down | gauge | fa-gauge-high |
| bullseye | fa-bullseye | crown | fa-crown | search-dollar | fa-magnifying-glass-dollar |
| chart-area | fa-chart-area | chart-pie | fa-chart-pie | money-bill | fa-money-bill-wave |
| file-x | fa-file-circle-xmark | file-check | fa-file-circle-check | receipt | fa-receipt |
| paperclip | fa-paperclip | circle-xmark | fa-circle-xmark | file-pdf | fa-file-pdf |
| umbrella | fa-umbrella-beach | cash-register | fa-cash-register | users | fa-users |
| id-card | fa-id-card | credit-card | fa-credit-card | user-plus | fa-user-plus |
| scale | fa-scale-balanced | | | | |

Nelle pagine HR la maggior parte delle icone è scritta direttamente come `<i className="fa-solid fa-…">`: le schede pagina riportano la classe esatta.

---

## 4. Regole UI trasversali vincolanti

### 4.1 Tabelle `.sib-table` / `.sib-table-wrap`

Stile canonico (`src/tailwind.css`):

```css
.sib-table-wrap { background: #fff; border: 1px solid var(--color-border); border-radius: 6px; overflow-x: auto; margin-bottom: 20px; }
.sib-truncate   { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sib-table      { width: 100%; font-size: 13px; font-family: 'Open Sans', sans-serif; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.sib-table thead tr { background: var(--color-bg); }
.sib-table th {
  text-align: left; padding: 10px 12px;
  font-size: 12px; font-weight: 600; color: var(--color-text-inactive);     /* header muted, case normale */
  border-bottom: 1px solid var(--color-border); white-space: nowrap;
  position: sticky; top: 0; z-index: 2; background: var(--color-bg);
}
.sib-table td   { padding: 10px 12px; vertical-align: middle; color: var(--color-text-active); border-bottom: 1px solid var(--color-border); }
.sib-table tbody tr:hover { background: var(--color-bg); }
.sib-table tbody tr:last-child td { border-bottom: 0; }
```

Regole:

1. **Bordi tutti 1px** (mai 1.5px). Wrapper bordato radius 6px; ultima riga senza bordo.
2. **Header**: 12px 600 colore muted (`--color-text-inactive`), sfondo `--color-bg`, **case normale con iniziale maiuscola** («Dipendente», «Reparto»): **MAI `text-transform: uppercase`, MAI letter-spacing**.
3. **Niente zebra**: righe su `--color-surface`.
   ⚠ Nota di fedeltà: la regola dichiara «nessun hover background», ma `.sib-table tbody tr:hover` oggi applica `background: var(--color-bg)` (`#F8FCFF`, quasi impercettibile). Riprodurre il comportamento del codice.
4. **Larghezze fisse**: `table-layout: fixed` + `<colgroup>` con larghezze in **%** che sommano 100 (classi `col` nel `.sass`, o `--cfg-col-w` in CfgTable). Mixin:

```sass
// src/styles/_mixins.sass — usare con DUE classi (es. `.nsp .nsp__table`), altrimenti vince .sib-table
=table-fit
  table-layout: fixed
  width: 100%
  th, td
    vertical-align: middle
    white-space: nowrap
    overflow: hidden
  thead .sib-colf-head
    display: flex
    min-width: 0
  thead .sib-colf
    flex: 0 0 auto
```

5. **Nessuno scroll orizzontale a nessuna larghezza**, nemmeno come rete di sicurezza: il wrapper standard ha `overflow-x: auto`, le pagine HR lo chiudono con `+hr-wrap` (`overflow-x: hidden`, selettore a due classi `sib-table-wrap xxx__wrap`). Deroga solo per griglie/matrici/calendari e tabelle di confronto in modale.
6. **Testo sempre su una riga** (header e celle): se non entra → ellipsis con `TruncatedText` (tooltip col testo completo) oppure **abbreviazione puntata** («Dipendente» → «Dip.», «Giustificativo» → «Giust.», «Categoria» → «Cat.») sempre con tooltip del testo completo (`ThLabel` / `TruncatedText full=`). Mai `white-space: normal` nelle tabelle.
7. Celle numeriche e importi allineati a destra (`.xxx .xxx__r { text-align: right }`), colonne icona/checkbox centrate (`.xxx .xxx__c { text-align: center }`) — sempre con due classi.
8. Righe vuote: una riga con `colSpan` e cella `+hr-empty` (centrata, `text-inactive`, padding 28px 0).
9. Totali: in una riga `+hr-foot` sotto la tabella («Netto del mese: **1.234,50 €**»), mai in card in cima.

Esempio completo (da Nota spese):

```sass
.nsp
  +hr-root(notespese)
.nsp__wrap
  +hr-wrap
.nsp .nsp__table
  +table-fit
+th-labels
.nsp__col-sel     { width: 3% }
.nsp__col-data    { width: 9% }
/* … colonne in % che sommano 100 … */
.nsp .nsp__c { text-align: center }
.nsp .nsp__r { text-align: right }
@container notespese (max-width: 1360px)
  .nsp .nsp__table
    +hr-table-compact
```

```tsx
<div className="sib-table-wrap nsp__wrap">
  <table className="sib-table nsp__table">
    <colgroup><col className="nsp__col-sel" /><col className="nsp__col-data" />…</colgroup>
    <thead><tr>
      <th className="nsp__c"><CheckboxField name="sel-all" ariaLabel="Seleziona le spese della pagina" checked={sel.tutteVisibili} indeterminate={sel.parziale} onChange={sel.toggleVisibili} /></th>
      <th><span className="sib-colf-head"><ThLabel full="Dipendente" short="Dip." />{cf.th('dipendente', 'dipendente', { search: true, sort: true })}</span></th>
    </tr></thead>
    <tbody>…<td><TruncatedText text={row.descrizione} /></td>…</tbody>
  </table>
</div>
```

### 4.2 Celle semantiche

`.sib-cell--muted` (ink-muted), `--success` (`--color-success` 600), `--error` (`--color-error-dark` 600), `--warning` (warning 600).

### 4.3 Icone in tabella

- **Dentro la tabella** (icone informative e bottoni-azione): **`fa-solid`**, **senza bordo né box** (sfondo trasparente), colore **`var(--color-primary)`** (`#204769`), **16px**.
- Su `.sib-btn--icon` dentro `.sib-table` lo standard è già applicato:

```css
.sib-table .sib-btn--icon { width: auto; height: auto; border: 0; background: transparent; padding: 4px 5px; }
.sib-table .sib-btn--icon i { color: var(--color-primary); font-size: 16px; }
.sib-table .sib-btn--icon:hover:not(:disabled) { background: var(--color-primary-50); }
.sib-table .sib-btn--icon:disabled i { color: var(--color-text-disabled); }
```

- Nelle pagine HR i bottoni azione usano `+hr-act` (nessun padding, nessun hover di sfondo, disabled opacità .35) con l'icona a 16px; gap tra icone d'azione dettato dalla pagina (es. 14px in Nota spese).
- Le icone a colore semantico (stato, avviso) mantengono il proprio colore con una classe più specifica (es. icona `warning`).
- **Fuori dalla tabella** (toolbar, accanto a un form): `fa-regular`, con box `sib-btn--icon`, colore primary 16px — oppure, nelle toolbar HR, il quadrato pieno `+hr-icon-btn` (fondo primary, icona bianca).
- Ogni bottone solo-icona ha `aria-label` e Tooltip scuro col nome dell'azione.

### 4.4 Icone di export

- Excel: **sempre `fa-regular fa-file-xls`** (mai `fa-file-excel`). Tooltip «Esporta in Excel».
- PDF: `fa-file-pdf` (peso come da contesto: `fa-regular` fuori tabella, `fa-solid` in tabella).

### 4.5 Eliminazioni sempre confermate

Ogni «Elimina» (singola o massiva) apre la modale `ConfirmDialog` via `await confirm({...})`; si elimina solo su conferma. Nessuna eliminazione immediata, mai `window.confirm`. Dopo l'eliminazione un toast (es. `toast.success('Spesa eliminata.', 'Eliminata')`). Le azioni non distruttive che chiedono conferma usano `danger: false` (pulsante primary), es. «Segna come rimborsata» / «Conferma rimborso».

### 4.6 Niente pillole per stati ed etichette

**MAI** sfondi a pillola o ellittici per badge/stati/etichette. Si usa:

- **testo colorato** in grassetto (`+hr-stato`: attesa arancio, ok verde, ko rosso, neutro grigio, info azzurro link), eventualmente con **icona** davanti (`inline-flex; gap: 5px`);
- oppure **punto colorato + testo**.

### 4.7 Niente stat-card in cima

**MAI** una riga di box riepilogativi («Totale / In attesa / Approvate…») come header di pagina. I totali stanno in una riga sotto la tabella (`+hr-foot`) o come conteggi inline (es. nei filtri). Eccezione: le pagine BI (es. «HR overview», «Profile analysis») con la fascia `KpiTile` del kit BI.

### 4.8 Tooltip

Sempre il componente `Tooltip` (scuro `#1E293B`, testo bianco, 11px 500, radius 6); mai `title=` nativo. Unica variante chiara: quella interna di `TruncatedText` (§3.7).

### 4.9 Nessuno stile inline

Nessun `style={{…}}` nei componenti di pagina: ogni stile nel `.sass` omonimo del componente, nella stessa cartella. Valori dinamici solo come **CSS custom property** passata per variabile e letta dal `.sass`:

```tsx
<div className="bar" style={{ '--w': `${pct}%` } as React.CSSProperties} />
```
```sass
.bar__fill
  width: var(--w)
```

Eccezioni esistenti nei componenti di base: coordinate calcolate a runtime (Tooltip, popup ColFilters), dimensioni di Skeleton e Ico. Nei `.sass` mai un commento `//` sulla stessa riga di una custom property (finirebbe nel valore): commento sempre sulla riga sopra.

### 4.10 Prefissi BEM unici

Il CSS è globale: ogni pagina ha un prefisso **unico** (es. `.nsp` Nota spese, `.ced` Cedolini, `.pfe` Piano ferie, `.hrsto`, `.hrsel`), verificato con una ricerca nel codice prima di usarlo (un prefisso duplicato ha già rotto una pagina). Gli elementi sono `prefisso__elemento`, i modificatori `--modificatore`.

### 4.11 Container query, mai media query sul viewport

Il root della pagina è il contenitore (`+hr-root(nome)` → `container-type: inline-size; container-name: nome`). La compattazione scatta **solo** sotto la soglia del contenuto, con `@container nome (max-width: …)`. Soglia tipica tabelle HR: **1360px** (container). Si compattano **solo dimensioni** (font 13→12 celle, 12→11 header, padding orizzontale celle 12→6px con `+hr-table-compact`, icone e campi); mai eliminare informazione, mai abbreviare le intestazioni per primo né aggiungere menu «…» non richiesti; se non basta: ellipsis/abbreviazione puntata + tooltip (`+th-compact` dentro la query, annidato nel root). Sopra soglia tutto torna standard.

```sass
.miapagina
  +hr-root(miapagina)
@container miapagina (max-width: 1360px)
  .miapagina .miapagina__table
    +hr-table-compact
  .miapagina
    +th-compact
```

Toolbar che devono stare su una riga: `flex-wrap: nowrap`, il campo cerca elastico (`flex: 1 1 …; min-width`), e sotto soglia si stringono select e date. Le scelte di contenuto che la CSS non può fare (testo → icona) si fanno con un `ResizeObserver` sullo stesso root, con la **stessa soglia**.

### 4.12 Date range

Selezione di un intervallo sempre con `DateRangeField` (due calendari affiancati); mai due campi data separati «Da» / «A».

### 4.13 Specificità contro Tailwind

`&__cell` in un `.sass` di pagina compila in **una** classe e pareggia con `.sib-input`/`.sib-table th`: vince il design system (caricato dopo). Per sovrascrivere una classe `sib-*` servono **almeno due classi** nel selettore (`.nsp .nsp__table`, `.sib-table-wrap.cfg-table`).

### 4.14 Campi e label

Usare sempre i componenti condivisi (§3.15); campi 34px; label Poppins 12px 600 primary in case normale; select sempre con la doppia chevron.

### 4.15 Bandiere

Se compaiono bandiere (nazionalità): sempre tonde, da SVG (`FlagCircle`, file `public/flags/<iso>.svg`), mai emoji.

---

## 5. Effetti comuni

### 5.1 Hover

| Elemento | Effetto | Durata / easing |
|---|---|---|
| Campi `.sib-input`/`.sib-select` | bordo → `primary-400` | 150ms (border-color, box-shadow) |
| `.sib-btn--primary` | bg `primary-800`, ombra sm → md | 150ms ease-in-out |
| `.sib-btn--secondary` | bg `primary-50` | 150ms |
| `.sib-btn--icon` | bordo `primary`, bg `primary-50`, testo `primary` | 150ms |
| `.sib-btn--back` | bg `primary`, testo bianco | 150ms |
| Riga tabella | bg `--color-bg` | nessuna transizione |
| Icona filtro colonna | bg `primary-100`, colore `primary` | nessuna transizione |
| Pulsante export HR | `filter: brightness(.92)` | nessuna transizione |
| Card cliccabile (`a`/`button` *card*) | `translateY(-1px)` + `--shadow-md` | 200ms `cubic-bezier(0.4,0,0.2,1)` |
| Tab ConfiguratoreSezione | testo `text-active`, sottolineatura `primary-300` | 150ms |
| Voce sidenav | bg `white/6%`, testo `white/90%` | 130ms |
| Chiudi modale / toast | colore → `text-active` (modale anche bg `primary-50`) | 150ms |

### 5.2 Focus

- Campi: `:focus-visible` → bordo `--color-link` + `box-shadow: 0 0 0 3px var(--color-focus-ring)`; in errore bordo `error` + ring `--color-error-light`.
- Bottoni `sib-btn`: solo da tastiera (`:focus-visible`) `box-shadow: 0 0 0 3px var(--color-focus-ring)`.
- VistaSwitch: `outline: 2px solid primary; outline-offset: -2px`.
- DateRangeField: bordo `primary` senza ring.
- CfgMultiSelect: bordo `primary` + ring 3px.

### 5.3 Pressione

`.sib-btn:active:not(:disabled)` → `transform: translateY(0.5px)`.

### 5.4 Animazioni

| Cosa | Keyframe | Durata / easing |
|---|---|---|
| Toast in ingresso | `toast-in`: opacity 0, translateY(8px) → 1, 0 | 200ms `cubic-bezier(0.4,0,0.2,1)` |
| Modale | nessuna (apparizione istantanea); keyframe `scaleIn` disponibile: opacity 0, `scale(0.93) translateY(8px)` → 1, `scale(1) translateY(0)` | — |
| Cambio scheda Configurazione | `cfg-sezione-in`: opacity 0, translateY(4px) → 1 | .22s ease-out |
| Save bar | `cfg-save-bar-in`: translateY(100%), opacity 0 → 0, 1; pallino `cfg-save-bar-pulse` 1 → .35 → 1 | .22s ease-out; 1.6s ease-in-out infinito |
| VistaSwitch | thumb `translateX` e icona `scale(1.04)` | .32s `cubic-bezier(.34, 1.36, .64, 1)` |
| Accordion (sidenav) | grid-rows 0fr↔1fr + opacità | .34s `cubic-bezier(.22,1,.36,1)` |
| Sidenav apri/chiudi | width/min-width (desktop), left (mobile) | 420ms / 450ms `cubic-bezier(0.32, 0.72, 0, 1)` |
| Spinner bottone | `sib-btn-spin` rotate 360° | 0.6s linear infinito |
| Spinner generico | `spin` | .75s (`.spinner`) / .8s (caricamento app) linear infinito |
| Skeleton | `skeleton-shimmer` translateX(-100%) → 100% | 1.4s ease-in-out infinito |
| `.sib-progress__bar` | `transition-all` | 300ms |

### 5.5 `prefers-reduced-motion`

Regola globale (`_components.sass`), vale per tutta l'app:

```sass
@media (prefers-reduced-motion: reduce)
  *, *::before, *::after
    animation-duration: 0.01ms !important
    animation-iteration-count: 1 !important
    transition-duration: 0.01ms !important
    scroll-behavior: auto !important
```

In più: le animazioni del kit cfg e della ConfiguratoreSezione sono dichiarate **solo** sotto `@media (prefers-reduced-motion: no-preference)`; VistaSwitch toglie le transizioni con `transition: none`; `cfgPrefersReducedMotion()` azzera i timing JS.

---

## 6. Convenzioni di testo e formato

### 6.1 Date e ore

| Cosa | Formato | Implementazione |
|---|---|---|
| Data | **gg/mm/aaaa** («05/11/2026») | da ISO: `iso.split('-').reverse().join('/')` (`fmtDataHr`); oppure `toLocaleDateString('it-IT')` |
| Data breve (tabelle strette) | gg/mm/aa («05/11/26») | `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(2,4)}` |
| Data mancante | «—» (trattino lungo) | in alcune tabelle «-» (specificato nella scheda) |
| Data e ora (storico) | «05/11/2026, 14:30» | `toLocaleString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })` |
| «quando» compatto | «05/11 alle 14:30» | `toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'})` + « alle » + ora `hh:mm` |
| Mese | «Novembre 2026» (mese con iniziale maiuscola) | `fmtMeseHr('2026-11')`, mesi «Gennaio … Dicembre» |
| Data estesa (Timbrature) | «giovedì 5 novembre» | `toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })` |
| Valori nei campi data e nei payload | ISO `aaaa-mm-gg` | |
| Settimana | inizia di **lunedì** | |

### 6.2 Durate

| Cosa | Formato | Funzione |
|---|---|---|
| Ore lavorate (registro presenze) | «7h 30m», «8h» (minuti a due cifre: «7h 05m») | `fmtOre(min)` in `_presenze/presenze.model.ts` |
| Ore decimali | «8,0h» (una cifra decimale, virgola) | `oreDecimali(min)` = `(min/60).toFixed(1).replace('.', ',') + 'h'` |
| Ore extra | «45'» sotto l'ora; «1h 15'»; «2h» | `fmtExtra(min)` |
| Ore di ROL/permessi (richieste) | «7,5 h» (spazio prima di h, max 1 decimale) | `fmtOre(h)` in `GestioneRichieste.tsx` = `h.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' h'` |
| Giorni | «1 g», «5 gg» | `fmtGg` |

### 6.3 Importi

- Formato HR: **«1.234,50 €»** — migliaia sempre raggruppate col punto (anche sotto le 5 cifre, a differenza di `it-IT` nativo), due decimali con virgola, simbolo **dopo** con spazio, segno «-» davanti per i negativi:

```ts
export const eurHr = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`
}
```

- Pagine obiettivi/performance: «€ 1.234» (simbolo prima, arrotondato all'unità: `'€ ' + Math.round(n).toLocaleString('it-IT')`); compatto «€1.234».
- Overview: milioni «1,23 M€».
- Percentuali: `Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })` + «%» («12,5%»); variazioni in punti «+1,2 pt» / «−0,8 pt» (segno meno tipografico «−»).
- Numeri in tabella con cifre tabulari.

### 6.4 Nomi e testi

- Persone: «Nome Cognome» con iniziali maiuscole («Andrea Grimaudo»); reparti con sola iniziale maiuscola («Front office», «Housekeeping», «Cucina», «Manutenzione»).
- Autore delle azioni: nome dell'utenza collegata; se nessuna, «Ufficio del personale».
- Interfaccia **in italiano**, frasi brevi in case normale (mai tutto maiuscolo), iniziale maiuscola solo sulla prima parola («Esporta in Excel», «Nota spese mensile»).
- Tono: diretto, al «tu» implicito o impersonale, senza punti esclamativi. Messaggi dei toast: **frase completa con punto finale** nel messaggio, titolo breve senza punto (es. messaggio «Spesa di Andrea Grimaudo approvata: 120,00 € da rimborsare.», titolo «Spesa approvata»).
- Conferme: titolo = azione («Elimina spesa», «Segna come rimborsata»); messaggio = domanda con l'oggetto specifico tra virgolette «"…"» e le conseguenze («L'operazione non si può annullare.»); pulsante = verbo dell'azione («Elimina», «Conferma rimborso»), secondario «Annulla».
- Puntini di sospensione: carattere singolo «…» nei placeholder («Cerca dipendente…»); fa eccezione il default di SearchField «Cerca...» (tre punti).
- Apostrofi: nel codice si trovano sia «'» sia «’»; riportare quello indicato nella scheda di pagina.
- Sigle note (CCNL, ROL, DURC, PEC, SDI…) sottolineate a puntini con spiegazione al passaggio del mouse (`withAcronimi`) nelle label dei form, nei titoli dei pane e nelle intestazioni di CfgTable.

---

## 7. Ricetta di una pagina HR tipo

Dall'alto in basso (gap verticale 12px dal `+hr-root`):

```
┌ .xxx (root: flex column, gap 12px, font 13px, container "xxx") ───────────────────────────┐
│ PageHead: [← Indietro]        Titolo 24px / sottotitolo 13px        [azioni a destra]     │  margin-bottom 20px
│ Toolbar (+hr-toolbar, align-end, gap 10px):                                               │
│   [Label 12px / Select 34px]  [Label / Select]  [Label / Periodo 204px]   … [XLS 34×34]   │
│ [BarraSelezione] (solo con righe selezionate)                                             │
│ ┌ .sib-table-wrap + +hr-wrap (bordo 1px, radius 6px, overflow-x hidden) ───────────────┐ │
│ │ header 12px 600 muted su --color-bg, filtri a icona 20×20                             │ │
│ │ righe 13px, padding 10px 12px, bordo 1px, testo su una riga + ellipsis/tooltip        │ │
│ └───────────────────────────────────────────────────────────────────────────────────────┘ │
│ Riga totali +hr-foot (destra, 12px, gap 18px)                                             │
│ Paginazione centrata (+hr-pag)                                                            │
└───────────────────────────────────────────────────────────────────────────────────────────┘
Modali: <Modal size="sm|md|lg|xl" title="…"> + corpo +hr-modal-body (gap 14px) + griglia +hr-modal-grid (2 colonne, gap 12px) + piede +hr-modal-actions
Conferme: ConfirmDialog (360px). Esiti: toast in basso a destra, 4 s.
```

Persistenza demo: i dati HR sono mock in store zustand (in parte persistiti in `localStorage`); chiavi, versioni e contratto backend sono descritti in `01-modello-dati-e-api.md` e nelle schede di pagina.

---

## 8. File letti

Documentazione:
- `docs/human-resources/_SCHEMA.md`
- `docs/regole_ui.md`
- `docs/guida-sviluppatori.md`
- `docs/responsive-laptop-sidenav.md`
- `docs/layout-responsive.md`

Stili globali e configurazione:
- `src/styles/index.sass`
- `src/styles/_themes.sass`
- `src/styles/_colors.sass`
- `src/styles/_spacing.sass`
- `src/styles/_tokens.sass`
- `src/styles/_typography.sass`
- `src/styles/_mixins.sass`
- `src/styles/_buttons.sass`
- `src/styles/_forms.sass`
- `src/styles/_feedback.sass`
- `src/styles/_components.sass`
- `src/styles/_layout.sass`
- `src/styles/_dashboard.sass`
- `src/styles/_skin-dark.sass`
- `src/styles/_skin-editorial.sass` (solo intestazione)
- `src/styles/catalyst-overrides.css` (intestazione)
- `src/tailwind.css`
- `tailwind.config.js`
- `public/index.html` (font e kit Font Awesome)
- `src/index.tsx`, `src/App.tsx`, `src/sibylla_dashboard.tsx`

Layout e store:
- `src/layout/Sidebar.tsx`, `src/layout/NavItem.tsx`, `src/layout/Topbar.sass`
- `src/store/useThemeStore.ts`, `src/store/useSectionThemeStore.ts`, `src/store/useConfirmStore.ts`
- `src/store/useHrGestioneStore.ts` (EventoHr, autoreHr, fmtDataHr, fmtMeseHr, eurHr)
- `src/modules/profilo/ModificaProfilo/ModificaProfilo.tsx` (preferenze tema)

Componenti condivisi:
- `src/core/components/PageHead.tsx`, `PageHead.sass`, `PageHeader.tsx`, `BtnBack.tsx`
- `src/core/components/Modal.tsx`, `ConfirmDialog.tsx`, `ConfirmDialog.sass`
- `src/core/components/Tooltip.tsx`, `TruncatedText.tsx`, `ThLabel.tsx`, `Pagination.tsx`
- `src/core/components/ColFilters.tsx`, `ColFilters.sass`
- `src/core/components/Toast/Toaster.tsx`, `Toast/useToast.ts`, `Toast/Toast.sass`
- `src/core/components/VistaSwitch.tsx`, `VistaSwitch.sass`, `AlertBanner.tsx`
- `src/core/components/ToggleSwitch.tsx` (legacy), `Skeleton.tsx`, `EmptyState.tsx`, `Acronimo.tsx`, `Acronimo.sass`
- `src/core/components/form/index.ts`, `InputField.tsx`, `SelectField.tsx`, `TextareaField.tsx`, `CheckboxField.tsx`, `ToggleSwitch.tsx`, `RadioGroup.tsx`, `SearchField.tsx`, `DatePickerField.tsx`, `DateRangeField.tsx`, `DateRangeField.sass`
- `src/core/cfg/index.ts`, `cfgMotion.ts`, `CfgPane.tsx/.sass`, `CfgTable.tsx/.sass`, `CfgToolbar.tsx/.sass`, `CfgSaveBar.tsx/.sass`, `CfgEmpty.tsx/.sass`, `CfgBadge.tsx/.sass`, `CfgMultiSelect.tsx/.sass`
- `src/modules/impostazioni/Configuratore/ConfiguratoreSezione.tsx`, `ConfiguratoreSezione.sass`, `registry.ts` (voci HR)
- `src/core/icons/Ico.tsx`, `Ico.sass`

Modulo HR:
- `src/modules/hr/_hrGestione.sass`, `src/modules/hr/hrExport.ts`
- `src/modules/hr/_storico/StoricoHr.tsx`, `StoricoHr.sass`
- `src/modules/hr/_selezione/BarraSelezione.tsx`, `BarraSelezione.sass`, `useSelezione.ts`
- `src/modules/hr/_presenze/presenze.model.ts` (fmtOre, oreDecimali, fmtExtra)
- `src/modules/hr/RichiesteFerie/GestioneRichieste.tsx`, `RichiesteFerie.tsx` (formati ore/giorni)
- `src/modules/hr/NoteSpese/NoteSpese.tsx`, `NoteSpese.sass` (esempio di applicazione dei mixin)
- Ricerche puntuali di formati in `ArchivioPersonale`, `EsterniTable`, `TurniPersonale`, `MonitoraggioPerformance`, `AssegnaObiettivo`, `HrOverview`, `ProfileAnalysis`, `PianoFerie`, `Timbrature`, `Cedolini`
