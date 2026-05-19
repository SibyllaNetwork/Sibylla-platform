# Sibylla Platform — Documento Tecnico/Architetturale

**Versione:** 3.0.0
**Data:** Maggio 2026
**Stack:** React 19 + TypeScript + Tailwind CSS + SASS

---

## 1. Panoramica

Sibylla Platform è una piattaforma gestionale modulare per il settore hospitality, progettata per centralizzare revenue management, booking, distribuzione, operations, HR, purchasing, finance, magazzino e hardware in un'unica interfaccia coerente e altamente personalizzabile.

La piattaforma adotta un'architettura **component-driven** con un design system proprietario, **multi-tema** (4 temi runtime via CSS custom properties) e un livello di **migrazione progressiva** dalle pagine Razor legacy della platform storica.

---

## 2. Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|------------|----------|
| **Framework** | React | 19.2.4 |
| **Linguaggio** | TypeScript | 4.9.5 (strict mode) |
| **Styling** | Tailwind CSS + SASS | 3.4.19 / 1.99.0 |
| **State Management** | Zustand (con `persist`) | 5.0.12 |
| **Build** | Create React App | 5.0.1 |
| **Routing** | Custom state-based (`PageContent`) | — |
| **Routing (installato)** | React Router DOM | 7.14.0 |
| **Icons** | Font Awesome Duotone (via `Ico`/`MenuIco`) | — |
| **Fonts** | Poppins + Open Sans + Inter (Swiss) | Google Fonts |
| **Backend proxy** | `SibyllaApiProxy` (catch-all `/Sibylla/...`) | — |

---

## 3. Architettura del Progetto

### 3.1 Struttura Directory

```
src/
├── core/                    # Design system e componenti riutilizzabili
│   ├── components/          # 19 componenti UI + 9 componenti form
│   │   ├── Button/          # Button.tsx + Button.sass
│   │   ├── Input/           # Input.tsx + Input.sass
│   │   ├── Select/          # Select.tsx + Select.sass
│   │   ├── form/            # 9 form components (InputField, SelectField, …)
│   │   ├── ThemeSwitcher.tsx/.sass
│   │   └── index.ts         # Barrel export
│   ├── icons/               # Sistema icone (Ico, MenuIco)
│   ├── tokens.ts            # Token colori runtime (TS)
│   ├── bookingStore.ts      # Store prenotazioni (state condiviso planner/tableau)
│   └── utils/               # Utility condivise
│
├── modules/                 # Pagine organizzate per area funzionale
│   ├── _scaffold/           # Scaffold render uniforme pagine portate da Razor
│   │   ├── portedPages.tsx  # Registry 220+ pagine Razor → pageId + endpoint BE
│   │   └── RazorScaffold.tsx# Wrapper StubPage con design system Sibylla
│   ├── auth/                # LoginPage
│   ├── executive/           # I miei Business, Giornale, Analisi, Strategie
│   ├── finance/             # CabinaControllo, Budget, Contratti, Scenari, CdC
│   ├── hardware/            # Totem, Advertising, NoleggiaSpazi, Campagne
│   ├── home/                # Home con animazione timone
│   ├── hr/                  # Anagrafiche, Obiettivi, Turnazione, Personale
│   ├── impostazioni/        # Configuratore (20+ pane), Strutture, Camere, Log
│   ├── magazzino/           # CreaMagazzino, MovimentiBarcode
│   ├── notifiche/           # Centro + Configurazione
│   ├── operation/           # Planner, Tableau, Conti, Cassa, Schedine, Turni
│   ├── profilo/             # Profilo, Portafogli, Scadenzario, Ruoli, Org.
│   ├── purchasing/          # Marketplace Agora, Annunci, Forniture, Contratti
│   ├── sales/               # Pricing, Distribution, Booking, Ricavi, Servizi
│   ├── stanze/              # Inventario, ModificaCamera
│   ├── sysadmin/            # Index, GestioneAziende, GestioneUtenti
│   ├── GenericPage.tsx      # Fallback per pageId senza componente
│   └── …                    # 159 file .tsx + 122 .sass omonimi
│
├── admin/                   # Pannello Sibylla Admin (super-admin)
│   └── SibyllaAdminPanel/   # 22 .tsx — tabs, modals, catalogo, sidebar clienti
│
├── layout/                  # Shell applicazione
│   ├── Sidebar.tsx          # Navigazione laterale responsive
│   ├── Topbar.tsx           # Breadcrumb, ricerca, preferiti, view-mode
│   ├── TabsBar.tsx          # Barra tab (modalità tabs)
│   ├── NavItem.tsx          # Voce menu ricorsiva con accordion
│   ├── FavoritesPanel.tsx   # Pannello preferiti
│   ├── AvatarMenu / NotifMenu / PreferencesMenu / ContextMenu
│   └── Logo.tsx
│
├── navigation/
│   ├── menu.ts              # 179 voci menu gerarchiche
│   └── menuHelpers.ts       # Breadcrumb, ricerca, parent mapping
│
├── router/
│   └── PageContent.tsx      # Router state-based: 124 rotte esplicite
│                            # + fallback PORTED_PAGES (220+) → StubPage
│
├── services/                # 17 client API verso SibyllaApiProxy
│   ├── api.ts               # apiFetch / apiFetchSibylla (Bearer, 401 redirect)
│   ├── auth.service.ts      # token, login, app-code
│   ├── booking, bookings, clients, common, frontoffice, notifiche,
│   ├── operation, pages, pianitariffari, portafoglio, revenue,
│   └── scadenze, strategie, suggerimenti, user
│
├── store/                   # State globale (Zustand)
│   ├── useOrgStore.ts       # Organizzazione / struttura attiva
│   ├── useThemeStore.ts     # Tema corrente (persist)
│   ├── useViewModeStore.ts  # Modalità tabs vs singola
│   ├── useCartStore.ts      # Carrello Marketplace Agora
│   └── useCatalogoStore.ts  # Catalogo prodotti Agora
│
├── hooks/
│   ├── useAuth.ts           # Login flow, token, user
│   └── useLoadStrutture.ts  # Caricamento strutture utente
│
├── styles/                  # Design tokens SASS globali (12 file)
│   ├── _tokens.sass         # Entry point token
│   ├── _themes.sass         # 4 temi via CSS custom properties
│   ├── _colors.sass         # Variabili colore
│   ├── _spacing.sass        # Spacing, radius, shadow
│   ├── _typography.sass     # Tipografia globale
│   ├── _mixins.sass         # Mixin condivisi
│   ├── _buttons.sass        # Classi bottoni legacy
│   ├── _forms.sass          # Classi form legacy
│   ├── _feedback.sass       # Alert, badge, spinner
│   ├── _components.sass     # Card, panel, ecc.
│   ├── _layout.sass         # Grid, shell helpers
│   ├── _dashboard.sass      # Layout shell app
│   └── index.sass           # Aggregatore @use
│
├── types/                   # Tipi TS condivisi
│
├── tailwind.css             # 35 classi sib-* (design system Tailwind)
├── sibylla_dashboard.tsx    # App shell (234 righe)
└── App.tsx                  # Entry point
```

### 3.2 Convenzione cartelle componente

Ogni componente segue la regola **un componente = una cartella omonima**:

```
ModificaProfilo/
├── ModificaProfilo.tsx
└── ModificaProfilo.sass     ← stessi nome del .tsx, stessa cartella
```

**Vincolo tassativo**: nessuno stile inline (`style={…}`) sui componenti applicativi. Tutti gli stili vivono nel `.sass` omonimo del componente, importato in testa al `.tsx`. La regola vale anche per placeholder, stub e tweak minimali. *(Stato attuale: alcune residue eccezioni in `sibylla_dashboard.tsx` per i menu top-level — in via di estrazione.)*

### 3.3 Flusso Dati

```
App (shell 234 righe)
 ├── useAuth()                  → autenticazione (token, user)
 ├── useLoadStrutture()         → idratazione strutture utente
 ├── useThemeStore (persist)    → [data-theme="…"] sull'HTML root
 ├── useViewModeStore           → modalità singola vs tabs
 ├── Sidebar                    → navigazione (MENU 179 voci → NavItem ricorsivo)
 ├── Topbar                     → breadcrumb, ricerca globale, preferiti
 ├── TabsBar (opt)              → tab aperti in modalità tabs
 └── PageContent                → routing 124 rotte + 220+ ported pages
      └── [ModulePage]          → componenti core + form + layout
            └── services/*      → apiFetch verso SibyllaApiProxy
```

---

## 4. Design System

### 4.1 Componenti UI

| Componente | Descrizione |
|------------|-------------|
| **PageHeader** | Titolo + sottotitolo pagina (pattern standard di apertura) |
| **AlertBanner** | Notifiche success/error/warning/info |
| **FormActions** | Footer form (Annulla + Conferma) |
| **Card** | Container con header opzionale |
| **FormGrid** | Griglia 2/3/4 colonne per form |
| **FilterToolbar** | Barra filtri con slot azioni |
| **StatusBadge** | Badge colorato per stati |
| **Tabs** | Navigazione a tab |
| **Pagination** | Navigazione pagine |
| **BtnBack** | Pulsante navigazione indietro |
| **Modal** | Dialogo modale generico |
| **Tooltip** | Tooltip su hover |
| **Accordion** | Espandi/comprimi |
| **ToggleSwitch** | Interruttore on/off |
| **GaugeArc** | Indicatore gauge circolare |
| **AnalisiBadge** | Badge analisi KPI |
| **Button** | Bottone base (variant + size + sass) |
| **Input** | Input base (size + sass) |
| **Select** | Select base (size + sass) |
| **ThemeSwitcher** | Selettore tema (classic / editorial / swiss / terracotta) |

### 4.2 Componenti Form (9)

| Componente | Elemento HTML | Caratteristiche |
|------------|---------------|-----------------|
| **InputField** | `<input>` | Label, errore, hint, icone, password toggle |
| **SelectField** | `<select>` | Label, errore, hint, tooltip automatico |
| **DatePickerField** | `<input type="date">` | Label, min/max |
| **DateRangeField** | 2× `<input type="date">` | Campo unico compatto con icona calendario |
| **SearchField** | `<input type="search">` | Icona ricerca, clear button, loading |
| **TextareaField** | `<textarea>` | Resize, min-height |
| **CheckboxField** | `<input type="checkbox">` | Label, hint, errore |
| **RadioGroup** | N× `<input type="radio">` | Opzioni, allineamento h-9 |
| **ToggleSwitch** | `<button role="switch">` | Label, descrizione |

### 4.3 Classi Tailwind (35 classi `sib-*`)

**Form & input:**
`sib-input`, `sib-input--dense`, `sib-input--lg`, `sib-input--error`,
`sib-select`, `sib-select--dense`,
`sib-search-input`, `sib-date-range-inner`,
`sib-checkbox`, `sib-checkbox--sm`, `sib-radio`

**Buttons:**
`sib-btn`, `sib-btn--primary`, `sib-btn--secondary`, `sib-btn--toolbar`,
`sib-btn--ghost`, `sib-btn--danger`, `sib-btn--danger-outline`,
`sib-btn--icon`, `sib-btn--back`, `sib-btn--lg`, `sib-btn--sm`

**Tabelle & celle:**
`sib-table`, `sib-table-wrap`,
`sib-cell--success`, `sib-cell--warning`, `sib-cell--error`, `sib-cell--muted`

**Stats & layout helpers:**
`sib-stat-card`, `sib-stats-row`, `sib-section-title`, `sib-section-spacer`,
`sib-empty`, `sib-empty-state`, `sib-progress`

### 4.4 Design Tokens & Temi

Tutti i token sono esposti come **CSS custom properties** in `src/styles/_themes.sass`, una palette per ogni tema. Cambiare tema = cambiare l'attributo `data-theme` sull'`<html>` (gestito da `useThemeStore` con `persist`). Nessun re-render React necessario.

**4 temi disponibili:**

| Tema | Identità | Font | Palette |
|------|----------|------|---------|
| **classic** | Look storico Sibylla | Poppins + Open Sans | `#204769` navy + oro |
| **editorial** | Hospitality italiana | Serif + avorio | Avorio + oro caldo |
| **swiss** | Minimal svizzero | Inter | Bianco + bordi neri |
| **terracotta** | Mediterraneo caldo | — | Terra + oliva |

**Token chiave (tema classic):**

| Categoria | CSS var | Valore |
|-----------|---------|--------|
| Primario | `--color-primary` | `#204769` (+ 11 sfumature 50–900) |
| Testo attivo | `--color-text-active` | `#4A4D53` |
| Link | `--color-link` | `#5C9CD4` |
| Success | `--color-success` | `#007035` |
| Errore | `--color-error` | `#FF616E` |
| Warning | `--color-warning` | `#F57D03` |
| Background | `--color-bg` | `#F8FCFF` |
| Bordo | `--color-border` | `#DBDBDB` |
| Font heading | `--font-heading` | `Poppins, sans-serif` |
| Font body | `--font-body` | `Open Sans, sans-serif` |

---

## 5. Moduli Funzionali

| Area | Pagine native (componenti dedicati) | Esempi |
|------|--------------------------------------|--------|
| **Auth** | 1 | LoginPage |
| **Executive** | 8 | IMieiBusiness, GiornaleImpresa, AnalisiDistribuzione, CreaStrategia, ModificaStrategia, CalendarioStrategie, CalendarioMaster |
| **Sales / Pricing** | 3 | SuggerimentiDataDriven, ScreeningOpenPrice, PricingBenchmark |
| **Sales / Distribution** | 8 | TariffeDisponibilita, GestionePianiTariffari, MaggiorazioniPromozioni, PrenotazioniIDS, CalendarioTariffe, ForesightRevenue, MonthlyTrend, ForecastAnalysis |
| **Sales / Booking** | 8 | TableauPage, NuovaPrenotazione, AnalisiBooking, GrigliaDisponibilita (+Estesa), Assegnazione, AllocazioneRisorse, VoipServiceHub |
| **Sales / Ricavi** | 7 | ImpostaDistribuzione, ComponiAnnunci, BudgetAnalysis, SegmentAnalysis, MieiContratti, InserisciContrattoVendita, VisualizzaContratto |
| **Sales / Servizi & Preventivi** | 4 | IMieiServizi, CreaServizio, IMieiPreventivi, CreaPreventivo |
| **Operation** | 23 | Planner, OperationOverview, OspitiInCasa, ContiCamera/Aperti/Chiusi/Passanti, EmissioneDocumenti, Cassa, Schedine, ArriviPartenze, RegistroPresenze, RilevamentoPresenze, Anagrafiche, Segnalazioni, OrdineServizio, TurniPersonale, AssegnazioniIncarichi, MaintenanceAnalysis, GuestRoomAnalysis, OnTheBookAnalysis |
| **Profilo** | 7 | ModificaProfilo, PortafoglioAziendale, PortafoglioPersonale, Scadenzario, RuoliFunzioni, ResetProfili, Organigramma |
| **Notifiche** | 2 | CentroNotifiche, ConfiguraNotifiche |
| **Finance** | 5 | CabinaControllo, BudgetComplessivo, SimulatoriScenari, ImpostaCentroDiCosto, ArchivioContratti |
| **HR** | 4 | ArchivioPersonale, CreaAnagrafica, AssegnaObiettivo, Turnazione |
| **Purchasing** | 9 | AreaMerceologica, Forniture, Annunci, GestioneAnnunci, Matchzone, Marketplace (Agora/Network), CarrelloAgora, CheckoutAgora, AcquistiRete, InserisciContrattoAcquisto |
| **Hardware** | 6 | Totem, IMieiTotem, GestioneAdvertising, NoleggiaSpazi, PianificaCampagna, RiepilogoCampagna |
| **Impostazioni** | 11 | Configuratore (20+ pane), CreaStruttura, InformazioniStruttura, Interfacce, InventarioCamere, StatoCamere, MonitoraggioCanali, RiepilogoBacheche, SchedaQuestura, LogDiSistema, Locker/VendingMachine |
| **Magazzino** | 2 | CreaMagazzino, MovimentiBarcode |
| **Stanze** | 2 | Inventario, ModificaCamera |
| **Sysadmin** | 3 | SysadminIndex, GestioneAziende, GestioneUtenti |
| **Admin (super)** | 22 file | SibyllaAdminPanel (tabs Catalogo, Moduli, Pagine, Funzioni, Ruoli, Utenti, Struttura + modali) |

**Configuratore** (cuore dell'onboarding struttura): 20+ pane modulari — Arrangiamenti, BarFit, BottomRate, BufferPresenze, CamereMapping, Contratti, FasceEta, Fb*, FinestrePrenotazione, ListiniGruppi/Individuali, LottiMapping, MappingSegmentoMercato, MarketSpecifics, OverbookingLimit, PersonalizzaStruttura, PolitichePrenotazione, RichiesteExtra, ScaglioniOccupazione, Stagionalita, VincoloMatriosca, VociIncasso.

### 5.1 Pagine portate da Razor

`src/modules/_scaffold/portedPages.tsx` mantiene un registry di **220 pagine** ereditate dalla platform storica Razor. Ognuna è dichiarata con `{ pageId, title, razorPath, apiPath }` e renderizzata da `RazorScaffold` con il design system Sibylla, in attesa della migrazione a componente nativo. Il router applica il fallback in cascata: rotta esplicita → ported page → `GenericPage`.

---

## 6. Caratteristiche Distintive

### 6.1 Home Page Animata
- **Timone navigante** — animazioni WebM precaricate per combinazione di moduli attivi
- **Onde interattive** — SVG a 3 livelli con animazione al click
- Selezione automatica dell'animazione in base alla configurazione utente

### 6.2 Multi-Tema Runtime
- 4 temi (`classic`, `editorial`, `swiss`, `terracotta`) selezionabili a runtime
- CSS custom properties — zero re-render React al cambio tema
- Preferenza persistita via Zustand `persist` (`localStorage` key `sibylla.theme`)
- Tutti i componenti consumano automaticamente le variabili tematiche

### 6.3 Modalità Tabs
- View-mode commutabile (`single` ↔ `tabs`) gestita da `useViewModeStore`
- `TabsBar` mostra le pagine aperte, con add/close/select
- La pagina corrente è sempre presente fra i tab quando si entra in modalità tabs

### 6.4 Design System Unificato
- **Zero inline styles sui componenti applicativi** — solo classi Tailwind `sib-*` e SASS omonimo
- **Tooltip automatico** su input/select con testo troncato (ellipsis + `title` nativo)
- **Doppia freccia** ↑↓ su tutte le select (SVG consistente via `background-image`)
- **Altezze uniformi** — 36px standard, 34px dense, 40px large

### 6.5 Componentizzazione Profonda
- 159 file `.tsx` di pagina + 122 `.sass` omonimi (convenzione 1:1)
- 35 classi Tailwind `sib-*` — un cambio in `tailwind.css` aggiorna l'intero progetto
- Sezione `core/components` esportata da un unico barrel `index.ts`

### 6.6 Shell Minimalista
- `sibylla_dashboard.tsx` — 234 righe per Sidebar + Topbar + TabsBar + content + login flow
- `PageContent.tsx` — 266 righe, 124 rotte esplicite + fallback ported-pages

### 6.7 Navigazione Intelligente
- **179 voci menu** gerarchiche con accordion ricorsivo
- **Ricerca globale** con risultati filtrati e breadcrumb
- **Preferiti** con pannello dedicato + context menu (click destro)
- **Parent mapping** — link interni evidenziano la pagina madre nella sidebar
- **Responsive** — sidebar collassabile con overlay mobile sotto 1600px

### 6.8 Multi-Struttura
- Switcher struttura integrato nella sidebar (`useOrgStore`)
- Caricamento strutture utente al login (`useLoadStrutture`)
- Propagazione automatica ai filtri di ogni pagina

### 6.9 Marketplace Agora
- E-commerce B2B integrato: Marketplace (rete + agora), Carrello, Checkout
- Store dedicati `useCartStore` + `useCatalogoStore`
- Riusa il design system Sibylla (Card, ProductDetailModal, CartDrawer)

### 6.10 Pannello Sibylla Admin
- Super-admin separato (`src/admin/`) — 22 file `.tsx`
- Tabs: Catalogo (Categorie, Fornitori, Prodotti), Moduli, Pagine, Funzioni, Ruoli, Utenti, Struttura
- 6 modali condivise (CategoriaModal, FornitoreModal, ProdottoModal, ModuloModal, RuoloModal, NewClientModal, ConfirmDelete, MasterUserModal)

### 6.11 Integrazione Backend
- **17 service client** (`src/services/`) verso `SibyllaApiProxy/`
- `apiFetch` injecta automaticamente `Authorization: Bearer <token>`
- Su 401 → rimuove token e ricarica (login flow)
- `BASE_URL` configurabile via `REACT_APP_API_URL` (default `http://localhost:5289`)

---

## 7. Metriche di Quality

| Metrica | Valore |
|---------|--------|
| File `.tsx` di pagina (`src/modules`) | 159 |
| File `.sass` di pagina | 122 |
| File `.tsx` totali (`src/`) | 226 |
| Componenti core riutilizzabili | 28 (19 UI + 9 form) |
| Classi design system | 35 `sib-*` |
| Rotte esplicite (`PageContent.tsx`) | 124 |
| Pagine portate da Razor (registry) | 220 |
| Voci menu | 179 |
| Service client API | 17 |
| Store Zustand | 5 |
| Temi runtime | 4 |
| File SASS globali (`src/styles/`) | 12 |
| Shell app (righe) | 234 |
| Cast `as any` residui | ~35 (rilevati, in via di tipizzazione) |
| TypeScript strict | Attivo |
| Zero errori compilazione | Verificato |

---

## 8. Punti di Forza Architetturali

1. **Modularità** — Ogni pagina è un componente autonomo con SASS companion omonimo, importabile e testabile indipendentemente.

2. **Design System coerente** — Un unico set di classi Tailwind (`sib-*`) garantisce identità visiva su tutta la piattaforma; nessuno stile inline nei componenti applicativi (regola tassativa).

3. **Multi-tema senza compromessi** — 4 identità visive selezionabili a runtime grazie a CSS custom properties: zero re-render React, zero ricompilazione, persistenza utente.

4. **Manutenibilità** — Modificare l'altezza di tutte le select = un cambio in `tailwind.css`. Modificare il colore primario = un cambio per tema in `_themes.sass`.

5. **Scalabilità** — Aggiungere una nuova pagina richiede: cartella omonima con `Foo.tsx` + `Foo.sass`, 1 riga in `PageContent.tsx`, 1 voce in `menu.ts`. I componenti standard sono già disponibili.

6. **Migrazione progressiva** — Le 220+ pagine ereditate da Razor sono già navigabili tramite registry + scaffold uniforme, e vengono promosse a componenti nativi pagina per pagina senza interrompere il prodotto.

7. **Integrazione backend pulita** — Tutti gli accessi REST passano da `services/*` con auth Bearer, gestione 401 centralizzata e tipizzazione delle risposte.

8. **Accessibilità** — `aria-invalid`, `aria-describedby`, `aria-hidden` su tutti i form elements. Tooltip nativi con attributo `title` automatico sui campi troncati.

---

## 9. Roadmap Tecnica

| Priorità | Intervento | Impatto |
|----------|-----------|---------|
| Alta | Attivare React Router DOM (già v7 in dipendenze) | URL-based routing, history, deep-link, back/forward browser |
| Alta | Promuovere le 220 pagine `PORTED_PAGES` a componenti nativi | Eliminare scaffold Razor, UX coerente, BE integrato |
| Media | Estrarre i menu top-level di `sibylla_dashboard.tsx` in `layout/` | Rispetto della regola "zero inline styles" sulla shell |
| Media | Ridurre i ~35 cast `as any` residui | Tipizzazione completa, DX migliore |
| Media | Aggiornare TypeScript a 5.x | Performance compilatore, nuove feature linguistiche |
| Media | Migrare i moduli SASS legacy a Tailwind dove possibile | Eliminare dualismo CSS, ridurre superficie |
| Bassa | Aggiungere test unitari (Jest + RTL) | Copertura componenti core e service layer |
| Bassa | Migrare da CRA a Vite | Build & dev server più veloci |

---

*Documento generato dall'analisi diretta del codebase Sibylla Platform — Maggio 2026.*
