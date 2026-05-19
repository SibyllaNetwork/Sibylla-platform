# Sibylla Platform — Briefing per Claude (Desktop)

> File di onboarding da incollare/allegare a un nuovo agente Claude.
> Contiene **stack tecnico**, **struttura del progetto**, **design system completo**
> (token, temi, tipografia, componenti) e **regole di stile tassative**.
>
> Versione: 3.0.0 — Maggio 2026
> Path repo: `/Users/alfredogregori/sibylla-platform`

---

## 0. Regole tassative (leggere PRIMA di scrivere codice)

1. **MAI usare `style={...}` inline** nei componenti `.tsx` applicativi.
   Ogni stile vive in un **file `.sass` omonimo del componente**, nella stessa cartella, importato in testa al `.tsx`.
   - Esempio: `ModificaProfilo.tsx` → `ModificaProfilo.sass` nella stessa cartella.
   - Vale anche per tweak minimali (`marginTop:8`, `display:"none"`, placeholder, stub).
   - Per stili dinamici runtime: prima provare CSS custom property o `data-attribute` + selettori SASS; `style={}` ammesso solo se davvero inevitabile, con commento che spieghi il motivo.
2. **Convenzione interna del file `.sass`**:
   - Header di commento descrittivo
   - `@use '../../../styles/tokens' as *` (path relativo alla profondità della cartella)
   - Classi **BEM** con prefisso modulo (es. `.reset-profili__stub-badge`)
3. **Un componente = una cartella omonima**, con `Foo.tsx` + `Foo.sass` accoppiati 1:1.
4. **Niente classi Tailwind arbitrarie** per stili specifici di pagina: usare i token e le classi `sib-*` del design system; gli stili custom vanno nel `.sass` omonimo.
5. **Nessun re-render React per cambi tema**: i colori sono CSS custom properties — usare i token, non hex hard-coded.

---

## 1. Stack

| Layer | Tecnologia | Versione |
|-------|------------|----------|
| Framework | React | 19.2.4 |
| Linguaggio | TypeScript | 4.9.5 (strict) |
| Styling | Tailwind CSS + SASS | 3.4.19 / 1.99.0 |
| State | Zustand (con `persist`) | 5.0.12 |
| Build | Create React App | 5.0.1 |
| Routing applicativo | Custom state-based (`PageContent`) | — |
| Routing (installato, non ancora attivo) | React Router DOM | 7.14.0 |
| Icons | Font Awesome Duotone (via `Ico`/`MenuIco`) | — |
| Fonts | Poppins, Open Sans, Inter, Instrument Serif, IBM Plex | Google Fonts |
| Backend proxy | `SibyllaApiProxy` (catch-all `/Sibylla/...`) | — |

---

## 2. Struttura directory

```
src/
├── core/                          # Design system + componenti riutilizzabili
│   ├── components/                # 19 UI + cartella form/ con 9 form components
│   │   ├── Button/                # Button.tsx + Button.sass
│   │   ├── Input/                 # Input.tsx  + Input.sass
│   │   ├── Select/                # Select.tsx + Select.sass
│   │   ├── form/                  # InputField, SelectField, DatePickerField, ...
│   │   ├── ThemeSwitcher.tsx/.sass
│   │   └── index.ts               # Barrel export
│   ├── icons/                     # Ico, MenuIco (Font Awesome Duotone)
│   ├── tokens.ts                  # Alias TS dei CSS vars (per casi runtime)
│   └── utils/
│
├── modules/                       # Pagine raggruppate per area funzionale
│   ├── _scaffold/                 # Wrapper render pagine portate da Razor
│   │   ├── portedPages.tsx        # Registry 220+ pageId → endpoint BE
│   │   └── RazorScaffold.tsx
│   ├── auth/ executive/ finance/ hardware/ home/ hr/ impostazioni/
│   ├── magazzino/ notifiche/ operation/ profilo/ purchasing/ sales/
│   ├── stanze/ sysadmin/
│   └── GenericPage.tsx            # Fallback pageId senza componente
│
├── admin/SibyllaAdminPanel/       # Pannello super-admin (22 .tsx)
│
├── layout/                        # Shell applicazione
│   ├── Sidebar.tsx                # Navigazione laterale responsive
│   ├── Topbar.tsx                 # Breadcrumb, ricerca, preferiti, view-mode
│   ├── TabsBar.tsx                # Barra tab (modalità tabs)
│   ├── NavItem.tsx                # Voce menu ricorsiva (accordion)
│   ├── FavoritesPanel.tsx
│   ├── AvatarMenu / NotifMenu / PreferencesMenu / ContextMenu
│   └── Logo.tsx
│
├── navigation/
│   ├── menu.ts                    # 179 voci menu gerarchiche
│   └── menuHelpers.ts             # Breadcrumb, ricerca, parent mapping
│
├── router/
│   └── PageContent.tsx            # State-based router: 124 rotte + fallback
│
├── services/                      # 17 client API verso SibyllaApiProxy
│   └── api.ts                     # apiFetch (Bearer auto, 401 → redirect login)
│
├── store/                         # Zustand (5 store)
│   ├── useOrgStore.ts             # Org + struttura attiva
│   ├── useThemeStore.ts           # Tema corrente (persist su localStorage)
│   ├── useViewModeStore.ts        # single ↔ tabs
│   ├── useCartStore.ts            # Carrello Agora
│   └── useCatalogoStore.ts        # Catalogo Agora
│
├── hooks/
│   ├── useAuth.ts
│   └── useLoadStrutture.ts
│
├── styles/                        # Design tokens globali SASS (12 file)
│   ├── _tokens.sass               # Entry point (@forward colors + spacing)
│   ├── _themes.sass               # 4 temi via CSS custom properties
│   ├── _colors.sass               # Alias SASS dei CSS vars
│   ├── _spacing.sass              # Font, spacing, radii, shadow, transition
│   ├── _typography.sass           # h1..h4, body-*, form-label, ecc.
│   ├── _mixins.sass
│   ├── _buttons.sass _forms.sass _feedback.sass _components.sass
│   ├── _layout.sass _dashboard.sass
│   └── index.sass
│
├── types/                         # Tipi TS condivisi
├── tailwind.css                   # 35 classi sib-* del design system
├── sibylla_dashboard.tsx          # App shell (~234 righe)
└── App.tsx                        # Entry point
```

**Metriche correnti**: 159 `.tsx` di pagina, 122 `.sass` omonimi, 28 componenti core (19 UI + 9 form), 35 classi `sib-*`, 124 rotte esplicite + 220 ported pages, 17 service client, 5 store Zustand, 4 temi runtime.

---

## 3. Design System — Token

### 3.1 Architettura token

Tutti i token sono **CSS custom properties** definite in `src/styles/_themes.sass`, una palette per ogni tema. Il tema attivo è scelto dall'attributo `data-theme` sull'elemento `<html>` (gestito da `useThemeStore` con `persist`). **Cambiare tema = cambiare un attributo HTML, zero re-render React, zero ricompilazione.**

`_colors.sass` espone alias **SASS** dei CSS vars (`$primary`, `$text-active`, ecc.) per i `.sass` dei componenti.
`tokens.ts` espone alias **TypeScript** degli stessi CSS vars (`T.primary`, `T.bg`, ...) per i (rari) casi runtime in TS.

Import standard nei `.sass` di componente:

```sass
@use '../../../styles/tokens' as *
```

### 3.2 Palette primaria (esempi tema `classic`)

| Token | CSS var | Esempio classic |
|---|---|---|
| Primary | `--color-primary` | `#204769` (navy) |
| Primary 900..50 | `--color-primary-900` … `--color-primary-50` | scala 11 step |
| Link | `--color-link` | `#5C9CD4` |
| Link light | `--color-link-light` | `#EBF4FB` |
| Accent | `--color-accent` | `#C9A84C` (oro) |

### 3.3 Testo

| Token | CSS var | classic |
|---|---|---|
| Active | `--color-text-active` | `#4A4D53` |
| Inactive | `--color-text-inactive` | `#6E7175` |
| Disabled | `--color-text-disabled` | `#A9AAAD` |
| Negative (su sfondi scuri) | `--color-text-negative` | `#FFFFFF` |

### 3.4 Feedback / stato

| Token | CSS var | classic |
|---|---|---|
| Success / -mid / -light | `--color-success` `--color-success-mid` `--color-success-light` | `#007035` `#00CF86` `#E4F8EE` |
| Error / -dark / -light | `--color-error` `--color-error-dark` `--color-error-light` | `#FF616E` `#D10011` `#FFEAEF` |
| Warning / -light | `--color-warning` `--color-warning-light` | `#F57D03` `#FFF3E0` |

### 3.5 Superfici

| Token | CSS var | classic |
|---|---|---|
| Background pagina | `--color-bg` | `#F8FCFF` |
| Surface (card, modal) | `--color-surface` | `#FFFFFF` |
| Border | `--color-border` | `#DBDBDB` |

### 3.6 Stati prenotazione / camera (semantici, NON tematizzati)

`_colors.sass` espone codici colore fissi per Planner/Tableau e inventario camere:

- Prenotazione: `$stato-confermata` `$stato-opzione` `$stato-noshow` `$stato-checkin` `$stato-checkin-p` `$stato-checkout` `$stato-manutenzione` `$stato-pulizia`
- Camera: `$cam-libera` `$cam-occupata` `$cam-checkout` `$cam-manutenzione` `$cam-pulizia` `$cam-prenotata`

### 3.7 Spacing (scala 4px, non tematizzata)

```
$space-xs  4px
$space-sm  8px
$space-md  12px
$space-lg  16px
$space-xl  24px
$space-2xl 32px
```

### 3.8 Border radius (tematizzati)

```
--radius-sm   (es. classic: 4px,  swiss: 0,  editorial: 2px,  terracotta: 3px)
--radius-md   (6 / 2 / 3 / 4)
--radius-lg   (10 / 2 / 4 / 6)
--radius-xl   (12 / 2 / 6 / 8)
--radius-page (15 / 0 / 8 / 10)
--radius-full 50% (fisso)
```

### 3.9 Shadow (tematizzate)

`--shadow-sm` `--shadow-md` `--shadow-lg` — variano per tema (per `swiss` sono tutte `none`).

### 3.10 Transizioni

```
$transition-fast   all 0.12s ease
$transition-normal all 0.2s  ease
```

### 3.11 Tipografia — font family (tematizzata)

```
--font-heading
--font-body
```

| Tema | Heading | Body |
|---|---|---|
| classic | Poppins | Open Sans |
| editorial | Instrument Serif / Fraunces / Georgia | Inter |
| swiss | Inter Tight / Inter | Inter |
| terracotta | IBM Plex Serif | IBM Plex Mono / Plex Sans |

---

## 4. Design System — Tipografia (classi globali da `_typography.sass`)

| Classe | Size / Weight / Color | Uso |
|---|---|---|
| `.h1` / `h1` | 28/700, primary | Titolo principale pagina |
| `.h2` / `h2` | 22/700, primary | Sotto-titolo |
| `.h3` / `h3` | 18/600, primary | Sezione |
| `.h4` / `h4` | 15/600, primary | Sotto-sezione |
| `.page-header__title` | 24/600, primary | Titolo pagina (pattern PageHeader) |
| `.page-header__subtitle` | 13, text-inactive | Sottotitolo pagina |
| `.section-title` | 14/700, primary | Titolo card / pannello |
| `.body-lg` | 15/400, text-active, lh 1.6 | Paragrafo grande |
| `.body-md` | 13/400, text-active, lh 1.5 | Paragrafo standard |
| `.body-sm` | 12/400, text-inactive, lh 1.5 | Caption |
| `.form-label` | 11/600 uppercase-ish, text-active | Label sopra campo |
| `.form-hint` | 11/400, text-disabled | Hint sotto campo |
| `.form-error-text` | 11/500, error | Errore sotto campo |
| `.meta` | 11/400, text-disabled | Date / orari / ref |
| `.overline` | 10/700 uppercase, letter-spacing 0.5px | Intestazioni tabella |

Utility: `.text-primary` `.text-active` `.text-inactive` `.text-disabled` `.text-error` `.text-success` `.text-warning` `.text-link` `.font-heading` `.font-body` `.fw-400…700` `.text-center` `.text-right` `.truncate`.

---

## 5. Design System — Bottoni (`_buttons.sass`)

Tutti i bottoni applicano il mixin `+btn-reset` (display inline-flex, gap `$space-sm`, border-radius `$radius-md`, font-family body, font-weight 600, transition fast, disabled → opacity .55).

| Classe | Look | Altezza default | Modificatori dimensione |
|---|---|---|---|
| `.btn-primary` | Sfondo `$primary`, testo negative; hover `$primary-700`; active `$primary-800` | 40 | `--md` 36, `--sm` 28 |
| `.btn-secondary` | Outline `$primary` 1.5px su trasparente; hover bg `$primary-50` | 40 | `--md`, `--sm` |
| `.btn-ghost` | Testo `$link` su trasparente; hover bg `$link-light` | 40 | `--md`, `--sm` |
| `.btn-danger` | Sfondo `$error`; hover `$error-dark`. Var. `--outline` | 34 | — |
| `.btn-icon` | Quadrato 36×36, bordo `$border`, hover → `$primary` | 36 | `--sm` 28 |
| `.btn-back` | Outline 1px `$border`, radius 7px, font 12 | 32 | — |
| `.toolbar-btn` | White + bordo `$border`, hover bordo+testo `$primary` | 36 | — |

In più, le classi Tailwind `sib-*` (vedi §8): `sib-btn`, `sib-btn--primary/secondary/toolbar/ghost/danger/danger-outline/icon/back/lg/sm`.

---

## 6. Design System — Form (`_forms.sass`)

Tutti gli input applicano il mixin `+field-base` (height 34, padding `0 $space-md`, border 1.5px `$border`, radius `$radius-md`, font-body 13, color text-active, bg white). Stati: `:hover` → bordo `$primary-400`; `:focus` → bordo `$primary` + box-shadow `rgba($primary, 0.08)`; `&--error` → bordo `$error`; `:disabled` → bg `$primary-50` text-disabled.

| Classe | Note |
|---|---|
| `.field` | Input testo. Mods: `--dense` (34/12), `--sm` (28/11), `--error`, `--disabled` |
| `.field-textarea` | Min-height 80, resize vertical |
| `.select` | Freccia SVG custom via background-image (chevron) |
| `.checkbox` | Wrapper inline-flex + `.checkbox__box` 16×16 (mod `--checked`, `--error`) + `.checkbox__label` |
| `.radio-group` / `.radio-item` | accent-color: `$primary` |
| `.toggle-switch` | `__track` 36×20 radius 999 (`--on` bg primary, `--off` bg border) + `__knob` 16×16 |
| `.date-range` | Wrapper per 2 date picker affiancati con `__input` 110px e `__sep` |
| `.form-grid` | Grid layout: `--2`, `--3`, `--4`, `--auto` (minmax 160px) |
| `.form-actions` | Flex justify-end, gap sm, mt lg |

---

## 7. Design System — Componenti React (`core/components/`)

Export barrel da `src/core/components/index.ts`. **Tutti i componenti applicativi DEVONO consumare questi prima di reinventarli.**

### 7.1 UI primitivi (19)

| Componente | Scopo |
|---|---|
| `PageHeader` | Titolo + sottotitolo (pattern apertura pagina) |
| `AlertBanner` | Notifiche success/error/warning/info |
| `Card` | Container con header opzionale |
| `FormGrid` | Griglia 2/3/4 colonne per form |
| `FormActions` | Footer form (Annulla + Conferma) |
| `FilterToolbar` | Barra filtri con slot azioni |
| `StatusBadge` | Badge colorato per stati |
| `AnalisiBadge` | Badge KPI analisi |
| `Tabs` | Navigazione a tab |
| `Pagination` | Navigazione pagine |
| `BtnBack` | Pulsante navigazione indietro (pattern pagina) |
| `Modal` | Dialogo modale generico |
| `Tooltip` | Tooltip su hover |
| `Accordion` | Espandi/comprimi |
| `ToggleSwitch` | Interruttore on/off |
| `GaugeArc` | Indicatore gauge circolare |
| `Button` | Bottone base (variant + size, con `.sass`) |
| `Input` | Input base (size, con `.sass`) |
| `Select` | Select base (size, con `.sass`) |
| `ThemeSwitcher` | Selettore tema (`classic/editorial/swiss/terracotta`) |

### 7.2 Form components (9, in `core/components/form/`)

| Componente | Elemento | Caratteristiche |
|---|---|---|
| `InputField` | `<input>` | Label, errore, hint, icone, password toggle |
| `SelectField` | `<select>` | Label, errore, hint, tooltip automatico su troncamento |
| `DatePickerField` | `<input type="date">` | Label, min/max |
| `DateRangeField` | 2× date | Campo unico compatto con icona calendario |
| `SearchField` | `<input type="search">` | Icona ricerca, clear, loading |
| `TextareaField` | `<textarea>` | Resize, min-height |
| `CheckboxField` | `<input type="checkbox">` | Label, hint, errore |
| `RadioGroup` | N× radio | Allineamento h-9 |
| `ToggleSwitch` | `<button role="switch">` | Label, descrizione |

Tutti i form components esportano `aria-invalid`, `aria-describedby`, `aria-hidden` corretti.

---

## 8. Classi Tailwind `sib-*` (35, in `src/tailwind.css`)

Componenti applicativi possono comporre con queste classi. **Modificare `tailwind.css` impatta l'intero progetto** (single source of truth).

**Form & input:** `sib-input`, `sib-input--dense`, `sib-input--lg`, `sib-input--error`, `sib-select`, `sib-select--dense`, `sib-search-input`, `sib-date-range-inner`, `sib-checkbox`, `sib-checkbox--sm`, `sib-radio`

**Buttons:** `sib-btn`, `sib-btn--primary`, `sib-btn--secondary`, `sib-btn--toolbar`, `sib-btn--ghost`, `sib-btn--danger`, `sib-btn--danger-outline`, `sib-btn--icon`, `sib-btn--back`, `sib-btn--lg`, `sib-btn--sm`

**Tabelle & celle:** `sib-table`, `sib-table-wrap`, `sib-cell--success`, `sib-cell--warning`, `sib-cell--error`, `sib-cell--muted`

**Stats & layout helpers:** `sib-stat-card`, `sib-stats-row`, `sib-section-title`, `sib-section-spacer`, `sib-empty`, `sib-empty-state`, `sib-progress`

Sul lato Tailwind, `tailwind.config.js` espone i token come classi:
- Colori: `bg-primary-900`, `text-link`, `text-ink-muted`, `bg-canvas`, `border-line`, `bg-success`, `text-error-dark`, `bg-accent`, ...
- Font: `font-poppins`, `font-opensans`, `font-heading`, `font-body`
- Radius: `rounded-field` (6px), `rounded-card` (15px)
- Height: `h-field` (34px). Font-size: `text-field` (14/20)
- Breakpoint extra: `3xl` 1525px
- Easing: `ease-sidebar` cubic-bezier(0.4, 0, 0.2, 1)

---

## 9. 4 Temi runtime

Selettore: `[data-theme="..."]` su `<html>`. Default: `classic`. Store: `useThemeStore` (Zustand `persist`, localStorage key `sibylla.theme`).

| Tema | Identità | Heading | Body | Palette dominante | Border |
|---|---|---|---|---|---|
| **classic** | Look storico Sibylla | Poppins | Open Sans | navy `#204769` + oro `#C9A84C` | grigio `#DBDBDB`, radius medi, shadow morbide |
| **editorial** | Hospitality italiana / rivista | Instrument Serif | Inter | neutro scuro `#2C2A26` + oro `#A7894A`, fondo avorio `#FAF7F2` | radius minimali, shadow nette |
| **swiss** | Minimal svizzero / Linear-like | Inter Tight | Inter | nero `#0A0A0A` su bianco puro, accent arancio `#FF4D00` | bordi neri, **zero shadow**, radius ≈ 0 |
| **terracotta** | Mediterraneo caldo | IBM Plex Serif | IBM Plex Mono | terra `#8B3A1F` + oliva `#5A6B2D`, fondo sabbia `#FBF4EB` | bordi `#D9C8B4`, ombre calde |

**Implicazione operativa**: niente hex hard-coded; ogni nuovo componente DEVE consumare i token (`$primary`, `$text-active`, ecc.) altrimenti rompe i temi non-classic.

---

## 10. State management (Zustand)

| Store | Responsabilità | Persist |
|---|---|---|
| `useOrgStore` | Organizzazione + struttura attiva, propagata ai filtri pagina | sì |
| `useThemeStore` | Tema corrente (`classic/editorial/swiss/terracotta`) → scrive `data-theme` su `<html>` | sì |
| `useViewModeStore` | Modalità single ↔ tabs | sì |
| `useCartStore` | Carrello Marketplace Agora | sì |
| `useCatalogoStore` | Catalogo prodotti Agora | — |

---

## 11. Routing

- **Stato attuale**: routing **state-based** custom in `src/router/PageContent.tsx`. 124 rotte esplicite + fallback su `PORTED_PAGES` (220+ pagine Razor registrate in `src/modules/_scaffold/portedPages.tsx`) + ultima fallback `GenericPage`.
- **React Router DOM 7** è installato ma **non ancora attivo** — migrazione prevista per ottenere URL-based routing, history, deep-link e back/forward del browser.
- Sidebar e ricerca globale si appoggiano a `src/navigation/menu.ts` (179 voci gerarchiche) + `menuHelpers.ts` (breadcrumb, ricerca, parent mapping).

---

## 12. Integrazione backend

- 17 service client in `src/services/` verso `SibyllaApiProxy/...`.
- `services/api.ts`: `apiFetch` / `apiFetchSibylla` — iniettano `Authorization: Bearer <token>` automaticamente; su 401 rimuovono il token e ricaricano (login flow).
- `BASE_URL` configurabile via `REACT_APP_API_URL` (default `http://localhost:5289`).
- Service: `auth`, `booking`, `bookings`, `clients`, `common`, `frontoffice`, `notifiche`, `operation`, `pages`, `pianitariffari`, `portafoglio`, `revenue`, `scadenze`, `strategie`, `suggerimenti`, `user`.

---

## 13. Pattern di creazione pagina (checklist operativa)

Per aggiungere una nuova pagina nativa:

1. **Crea cartella** in `src/modules/<area>/<NomePagina>/` con `NomePagina.tsx` + `NomePagina.sass` omonimo.
2. **In `NomePagina.sass`**: header commento + `@use '../../../styles/tokens' as *` + classi BEM con prefisso `.<nome-pagina>__...`.
3. **In `NomePagina.tsx`**: import del sass (`import './NomePagina.sass'`), apertura con `<PageHeader title=... subtitle=... />`, usa `Card`, `FormGrid`, `FormActions`, `Tabs`, `FilterToolbar`, `StatusBadge` dal barrel `core/components`.
4. **Aggiungi 1 rotta** in `src/router/PageContent.tsx`.
5. **Aggiungi 1 voce** in `src/navigation/menu.ts` (con `pageId`, label, icona, parent).
6. **Se la pagina è una migrazione Razor**: rimuovi l'entry da `_scaffold/portedPages.tsx` quando il nativo è pronto.
7. **Zero `style={...}` inline. Zero hex hard-coded.** Solo token, classi `sib-*` e classi BEM nel `.sass` omonimo.

---

## 14. Punti distintivi del prodotto (utili per dare contesto al modello)

- **Home animata**: timone con animazioni WebM precaricate + onde SVG a 3 livelli interattive.
- **Multi-tema runtime**: 4 identità visive senza re-render React.
- **Modalità tabs**: la pagina corrente è sempre presente fra i tab quando si commuta a tabs.
- **Componentizzazione profonda**: 1:1 `.tsx` ↔ `.sass`. Un cambio in `tailwind.css` propaga su tutto il prodotto.
- **Migrazione progressiva**: 220+ pagine Razor già navigabili tramite scaffold uniforme, promosse a native incrementalmente.
- **Marketplace Agora**: e-commerce B2B integrato (catalogo, carrello, checkout) che riusa il design system.
- **Pannello Sibylla Admin** super-admin in `src/admin/` (22 file) — separato dall'app utente.

---

## 15. Cosa NON fare (anti-pattern)

- ❌ Inserire `style={{...}}` in un `.tsx` applicativo, anche per un singolo pixel.
- ❌ Hex hard-coded nei `.sass` di componente (es. `color: #204769`) — usare `$primary` o equivalenti.
- ❌ Creare un nuovo componente UI quando esiste già in `core/components` (controllare il barrel `index.ts`).
- ❌ Reinventare classi bottone/input — usare `sib-btn--*`, `sib-input`, ecc.
- ❌ Importare un singolo file di token: importare sempre `@use '../../../styles/tokens' as *` (che a sua volta `@forward` colors + spacing).
- ❌ Usare `react-router` per nuove rotte finché non viene attivato come router di app (oggi è solo installato).
- ❌ Modificare colori/spacing in un singolo `.sass` di pagina invece che in `_themes.sass` / `_spacing.sass` per cambi globali.

---

## 16. Riferimenti file (per chi legge il codice)

| Cosa cerchi? | Apri |
|---|---|
| Definizione colori per tema | `src/styles/_themes.sass` |
| Alias SASS colori | `src/styles/_colors.sass` |
| Alias TS colori (runtime) | `src/core/tokens.ts` |
| Spacing / radii / shadow | `src/styles/_spacing.sass` |
| Tipografia globale | `src/styles/_typography.sass` |
| Bottoni globali | `src/styles/_buttons.sass` |
| Form globali | `src/styles/_forms.sass` |
| Classi Tailwind `sib-*` | `src/tailwind.css` |
| Token Tailwind | `tailwind.config.js` |
| Barrel componenti core | `src/core/components/index.ts` |
| Shell app | `src/sibylla_dashboard.tsx` |
| Router state-based | `src/router/PageContent.tsx` |
| Menu | `src/navigation/menu.ts` + `menuHelpers.ts` |
| Store tema | `src/store/useThemeStore.ts` |
| API client base | `src/services/api.ts` |
| Documento architetturale completo | `ARCHITECTURE.md` |
| Documento integrazione BE | `INTEGRATION.md` |

---

*Briefing generato da Claude Code per onboarding rapido di un nuovo agente.*
*Fonte: lettura diretta del repo `sibylla-platform` — Maggio 2026.*
