# Layout responsive Sibylla — sidenav aperto/chiuso

Guida per gli sviluppatori per riprodurre le regole di visualizzazione della
piattaforma (comportamento su laptop e dinamiche legate all'apertura/chiusura
del sidenav). I riferimenti puntano ai file reali del progetto.

## Principio di base

Il layout **non usa `margin-left` né larghezze calcolate a mano**. È un semplice
**flexbox a due colonne**: la sidebar ha una larghezza animata e il contenuto
occupa automaticamente lo spazio che resta (`flex: 1`). Quando la sidebar si
apre/chiude, il contenuto si ridimensiona da solo. Questa è la chiave da
replicare ovunque.

```
.app (display:flex)
├── <Sidebar>      → larghezza animata: 260px (aperta) ↔ 64px (chiusa)
└── .app__main     → flex:1  +  min-width:0   ← occupa il resto
    ├── <Topbar>
    └── .app__content → flex:1; overflow:auto; padding:24px
```

## 1. Struttura del contenitore (obbligatoria)

`src/styles/_dashboard.sass`:

```sass
.app
  display: flex
  height: 100vh
  overflow: hidden

.app__main
  flex: 1
  display: flex
  flex-direction: column
  min-width: 0        // ← CRITICO: senza questo i figli (tabelle) sfondano il viewport

.app__content
  flex: 1
  overflow: auto
  padding: 24px
  border-top-left-radius: 24px
```

> ⚠️ **`min-width: 0` su `.app__main` è la regola più importante e più facile da
> dimenticare.** Senza, un contenuto largo (tabella, riga di card) impedisce al
> flex di restringersi e compare lo scroll orizzontale di pagina. Ogni nuovo
> wrapper di livello intermedio che aggiungi deve mantenere `min-width: 0`.

## 2. Larghezze e animazione della sidebar

Le larghezze e la transizione stanno **sul componente Sidebar**
(`src/layout/Sidebar.tsx`), non su file CSS separati:

```tsx
// Desktop — apre/chiude animando la larghezza
'w-[260px] min-w-[260px]'   // aperta
'w-16 min-w-16'             // chiusa (rail, 64px)
'transition-[width,min-width] duration-[420ms] ease-sidebar'

// Mobile — drawer che scorre da sinistra
'w-[272px] transition-[left] duration-[450ms] ease-sidebar'
```

L'easing è definito una volta sola in `tailwind.config.js` e va **riusato
sempre** (non inventare curve nuove):

```js
transitionTimingFunction: {
  sidebar: 'cubic-bezier(0.32, 0.72, 0, 1)',
}
```

Regola: **animare `width`/`min-width` su desktop**, `left` su mobile (drawer).
Durata 420ms desktop / 450ms mobile.

## 3. Stato e breakpoint mobile

Lo stato è **locale allo shell** (`src/sibylla_dashboard.tsx`), non c'è uno store
dedicato:

```tsx
const [sideOpen, setSideOpen] = useState(true)
const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
```

Il breakpoint desktop/mobile è **1024px**, gestito via resize listener (non via
media query CSS). Al passaggio a mobile la sidebar si chiude automaticamente:

```tsx
const prevMobile = useRef(true)
useEffect(() => {
  const onResize = () => {
    const m = window.innerWidth < 1024
    setIsMobile(m)
    if (m && !prevMobile.current) setSideOpen(false) // torna mobile → chiudi
    prevMobile.current = m
  }
  window.addEventListener('resize', onResize)
  onResize()
  return () => window.removeEventListener('resize', onResize)
}, [])
```

Su mobile con sidebar aperta si mostra l'overlay che chiude al click:

```tsx
{isMobile && sideOpen && (
  <div className="app__mobile-overlay" onClick={() => setSideOpen(false)} />
)}
```

## 4. Il vincolo laptop 1366px (perché le tabelle devono entrare)

Il caso di riferimento è il laptop **1366px con sidebar aperta**. Lo spazio utile
reale è:

```
1366  − 260 (sidebar aperta) − 48 (padding 24px ×2) ≈ 1058px
```

Ogni pagina deve stare in **~1056–1058px senza scroll orizzontale interno**.
Questo è il budget di larghezza da rispettare quando progetti tabelle e griglie.

## 5. Come far entrare le tabelle in quel budget

Usa lo standard piattaforma, **non** contare sullo scroll come soluzione:

- Wrapper `.sib-table-wrap` (`overflow-x: auto` c'è come rete di sicurezza, ma non
  deve mai attivarsi a 1366px).
- `.sib-table`: padding compatto `px-3 py-2.5`, font `13px` celle / `12px`
  header, `whitespace-nowrap`.
- Testi lunghi **sempre su una riga** con ellipsis o abbreviazione puntata (es.
  `M. arrivo` → `Mancato arrivo`), **con tooltip** del testo completo. Usa il
  componente condiviso `TruncatedText` (`src/core/components/TruncatedText.tsx`):

```tsx
<th><TruncatedText text="M. arrivo" full="Mancato arrivo" /></th>
<td><TruncatedText text={p.Nome} className="col-name" /></td>
```

`TruncatedText` misura l'overflow con `ResizeObserver` e mostra il tooltip solo
se il testo è troncato o abbreviato — quindi si adatta da solo quando la sidebar
apre/chiude e cambia lo spazio.

## Checklist per riprodurre la dinamica su una nuova area

1. Contenitore `display: flex`; pannello laterale con larghezza animata,
   contenuto con `flex: 1`.
2. **`min-width: 0`** su ogni wrapper flex intermedio.
3. Anima `width`/`min-width` con `duration-[420ms] ease-sidebar` (mai margini).
4. Breakpoint mobile a `< 1024px` con resize listener; chiudi il pannello al
   rientro in mobile + overlay cliccabile.
5. Progetta i contenuti per **~1058px** utili (1366px − sidebar aperta −
   padding).
6. Tabelle con `.sib-table`/`.sib-table-wrap` + `TruncatedText`; niente scroll-x
   a 1366px.

## File di riferimento

| Aspetto | File |
| --- | --- |
| Shell, stato `sideOpen`/`isMobile`, resize listener | `src/sibylla_dashboard.tsx` |
| Sidebar (larghezze, transizioni) | `src/layout/Sidebar.tsx` |
| Layout `.app` / `.app__main` / `.app__content` / overlay | `src/styles/_dashboard.sass` |
| Easing `ease-sidebar`, breakpoint | `tailwind.config.js` |
| Standard tabelle `.sib-table` / `.sib-table-wrap` / `.sib-truncate` | `src/tailwind.css` |
| Componente troncamento + tooltip | `src/core/components/TruncatedText.tsx` |
