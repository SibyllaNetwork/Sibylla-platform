# Adattamento responsive su laptop (sidenav aperta/chiusa)

**Pagina di riferimento:** _Suggerimenti data driven_ (`SuggerimentiDataDriven`) — dashboard a tre
pannelli (Pricing · Disponibilità · Richieste per gruppi).

Questo documento descrive **la tecnica e il codice** che rendono la pagina utilizzabile su schermi
laptop sia con la sidenav **aperta** sia **chiusa**, senza mai generare scroll orizzontale.
Serve a riprodurre lo stesso comportamento su un'altra piattaforma.

---

## 1. Il problema (e perché le `@media` non bastano)

Su un laptop la larghezza del **viewport** resta la stessa, ma lo **spazio realmente disponibile
per il contenuto cambia** a seconda che la sidenav sia aperta o chiusa (tipicamente ~240–260px in
meno quando è aperta).

Conseguenza:

> Una `@media (max-width: 1360px)` sul viewport **fallisce** su un laptop con viewport > 1366px
> quando la sidenav è aperta: il viewport è "largo", ma il contenuto è stretto → le tabelle
> vengono tagliate / compaiono scrollbar orizzontali.

**Regola d'oro:** le decisioni di layout vanno prese sulla **larghezza reale del contenitore della
pagina**, non sul viewport. Due strumenti misurano quella larghezza:

| Leva | Strumento | A cosa serve qui |
|------|-----------|------------------|
| **A** | **CSS Container Query** (`container-type: inline-size` + `@container`) | Layout dei pannelli: incolonnati (default) ↔ riga unica |
| **B** | **`ResizeObserver`** in JS | Scelte di *contenuto* che la CSS non può fare: pulsanti testuali → icone; intestazioni/celle per esteso → abbreviate |

Entrambe usano la **stessa soglia (1520px)**, così restano sincronizzate.

---

## 2. Leva A — Container query CSS (layout dei pannelli)

Il root della pagina diventa un **contenitore di query**. Il layout **default** (mobile-first) è
quello _stretto_ (pannelli in colonna, piena larghezza): è lo stato sicuro per il laptop, anche con
sidenav aperta. Solo **quando c'è spazio reale** per tutte e tre le tabelle affiancate si passa alla
riga unica.

```sass
// SuggerimentiDataDriven.sass
@use '../../../../styles/tokens' as *

.sdd
  // ⚠️ Abilita le container query: le @container più sotto misurano
  //    la larghezza di QUESTO elemento (non del viewport).
  container-type: inline-size

  // ── Pannelli ──────────────────────────────────────────────────────────────
  // DEFAULT (laptop / larghezza ridotta): incolonnati a piena larghezza.
  &__panels
    display: flex
    flex-direction: column
    align-items: stretch
    gap: 18px

  &__panel
    display: flex
    flex-direction: column
    border: 1px solid var(--color-border)
    border-radius: 8px
    background: var(--color-surface)
    overflow: hidden            // niente scroll-x: la tabella rientra sempre

// Risoluzioni superiori: le tre tabelle DEVONO stare su un'unica riga.
// Sotto soglia (laptop) restano incolonnate (default). In modalità riga le
// tabelle vengono compattate (padding ridotto) per stare affiancate senza taglio.
@container (min-width: 1520px)
  .sdd__panels
    flex-direction: row
  .sdd__panel
    flex: 1 1 0
    min-width: 0                // indispensabile: permette alle colonne flex di restringersi
  .sdd__tbl th,
  .sdd__tbl td
    padding: 8px 4px            // compattazione per far stare 3 tabelle affiancate
  .sdd__col-check
    width: 24px
```

Punti da non dimenticare:

- **`container-type: inline-size`** sul root, altrimenti `@container` non ha un contenitore su cui
  misurare.
- **`min-width: 0`** sui figli flex in modalità riga: senza, il contenuto (tabella) impedisce alla
  colonna di restringersi e riappare lo scroll-x.
- **`overflow: hidden`** sul pannello + **testo che va a capo** nelle celle "larghe" (vedi sotto):
  è così che si garantisce _zero scroll orizzontale_.

### Niente scroll-x: header e celle

Le intestazioni stanno su una riga (abbreviate se serve), mentre le celle con valori lunghi possono
andare a capo per non forzare la larghezza:

```sass
.sdd
  &__tbl th
    white-space: nowrap          // intestazioni sempre su una riga (+ tooltip se abbreviate)
  &__hl                          // celle valore evidenziate
    white-space: normal          // il valore può andare a capo → la colonna non forza lo scroll-x
```

---

## 3. Leva B — `ResizeObserver` (toolbar e abbreviazioni)

Alcune scelte non sono di puro layout ma di **contenuto** e vanno fatte in JS misurando la stessa
larghezza reale:

- **`narrow`** → la toolbar in alto non ha spazio per i pulsanti testuali: diventano **icone**
  (con tooltip) così stanno su un'unica riga.
- **`stacked`** → quando i pannelli sono incolonnati (sotto soglia) la tabella Disponibilità ha
  spazio e mostra intestazioni e "tipo camera" **per esteso**; in riga unica usa le **abbreviazioni**
  per stare stretta.

```tsx
// SuggerimentiDataDriven.tsx
import React, { useEffect, useRef, useState } from 'react'

const rootRef = useRef<HTMLDivElement>(null)
const [narrow, setNarrow]   = useState(false)  // toolbar: pulsanti testo → icone
const [stacked, setStacked] = useState(false)  // pannelli incolonnati → label per esteso

useEffect(() => {
  const el = rootRef.current
  if (!el) return
  // Misura la larghezza REALE del root (cambia con la sidenav aperta/chiusa),
  // NON quella del viewport.
  const ro = new ResizeObserver(([e]) => {
    const w = e.contentRect.width
    // stessa soglia della container query (1520): sotto → laptop stretto
    setNarrow(w < 1520)
    setStacked(w < 1520)
  })
  ro.observe(el)
  return () => ro.disconnect()
}, [])
```

Il `ref` va sul root che ha anche `container-type` (così CSS e JS misurano lo **stesso** elemento):

```tsx
return (
  <div className="sdd" ref={rootRef}>
    <PageHead title="Suggerimenti data driven" subtitle="…" />

    {/* Toolbar: in narrow i link diventano icone con tooltip */}
    <div className="sdd__toolbar">
      {/* …filtri… */}
      <div className="sdd__links">
        {LINKS.map((l) => narrow ? (
          <Tooltip key={l.page} text={l.label}>
            <button className="sib-btn sib-btn--icon" onClick={() => navigate(l.page)} aria-label={l.label}>
              <i className={`fa-regular ${l.icon}`} aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <button key={l.page} className="sib-btn sib-btn--secondary" onClick={() => navigate(l.page)}>
            <i className={`fa-regular ${l.icon}`} aria-hidden="true" /> {l.label}
          </button>
        ))}
      </div>
    </div>

    {/* Pannelli: il layout riga/colonna è gestito dalla container query (Leva A).
        `stacked` serve solo a scegliere label estese vs abbreviate dentro le celle. */}
    <div className="sdd__panels">
      <section className="sdd__panel">…Pricing…</section>
      <section className="sdd__panel">…Disponibilità (label: stacked ? estese : abbreviate)…</section>
      <section className="sdd__panel">…Gruppi…</section>
    </div>
  </div>
)
```

---

## 4. La soglia (1520px) e la sincronizzazione

- Il valore **1520px** è la larghezza minima del **contenitore** (non del viewport) a cui le tre
  tabelle stanno affiancate senza taglio, una volta compattate.
- **Deve essere identico** nella `@container (min-width: 1520px)` (CSS) e nel confronto
  `w < 1520` (JS). Se cambi la soglia, cambiala in **entrambi i punti**.
- Sotto soglia = stato "laptop" (sidenav aperta o chiusa, non importa): colonna + pulsanti a icona +
  label estese. Sopra soglia = riga unica + pulsanti testuali + label abbreviate.

Come tarare la soglia su un'altra piattaforma: apri la pagina con la sidenav **aperta** su un laptop
tipico (es. 1366–1440px di viewport) e riduci finché le tre tabelle non stanno più affiancate senza
scroll: quella è la tua soglia.

---

## 5. Checklist per riprodurre su un'altra piattaforma

1. **Metti `container-type: inline-size`** sul contenitore radice della pagina (quello che si
   restringe quando la sidenav si apre).
2. **Parti dal layout stretto come default** (pannelli in colonna, piena larghezza) — mobile-first.
3. **Aggiungi una sola `@container (min-width: SOGLIA)`** per passare alla riga unica; nei figli
   flex metti **`min-width: 0`** e compatta il padding delle celle.
4. **Zero scroll-x:** `overflow: hidden` sul pannello, `white-space: nowrap` sulle **intestazioni**
   (+ tooltip se abbreviate), `white-space: normal` sulle **celle valore** lunghe.
5. **`ResizeObserver`** sullo stesso root per le scelte di contenuto (pulsanti testo↔icone,
   label estese↔abbreviate), con la **stessa soglia** della container query.
6. **Non usare `@media` sul viewport** per queste decisioni: fallisce con la sidenav aperta.
7. Verifica nei 4 stati: **laptop sidenav chiusa / aperta** e **desktop sidenav chiusa / aperta**.

---

## 6. Note di portabilità

- I `var(--color-*)` sono i token del design system: sostituiscili con quelli della piattaforma di
  destinazione.
- I prefissi di classe `sdd__*` sono arbitrari (BEM): rinominali liberamente.
- `sib-btn--icon` / `sib-btn--secondary` sono i bottoni condivisi della piattaforma; usa gli
  equivalenti locali.
- Compatibilità: le CSS Container Query sono supportate da tutti i browser evergreen (Chrome/Edge
  106+, Firefox 110+, Safari 16+). `ResizeObserver` è supportato ovunque. Per browser molto vecchi,
  la Leva B (JS) da sola copre già i casi critici.
