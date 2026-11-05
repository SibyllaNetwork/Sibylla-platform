# 16 · HR Overview

Scheda di riproduzione della pagina **HR Overview**: il cruscotto BI del personale dell'impresa in una sola schermata. Contiene:

- organico, assunzioni, cessazioni, turnover, assenteismo e costo del personale;
- l'andamento dell'organico;
- la composizione per contratto e per genere;
- l'organico per reparto;
- le assenze per tipologia;
- lo stato degli obiettivi di performance e della documentazione.

È una **pagina BI** costruita col kit `src/core/bi`. Vale quindi il vincolo «una schermata, nessuno scroll». I componenti del kit (`BiPage`, `KpiTile`, `ChartCard`, `ChartTooltip`, `BiVerticalTabs`, `BiLegend`, `BiDataStamp`, `BiGlossaryRail`, `barEndLabel`, `chartTheme`) sono descritti con i valori esatti nell'**appendice A di `13-profile-analysis.md`**, che vale anche qui. Per `SelectField`, `Tooltip` e `.sib-btn--icon` → `00-fondamenta.md`.

---

## 1. Scopo e utenti

- **Scopo**: dare all'ufficio del personale e alla direzione la fotografia del personale della struttura selezionata, o di tutte le strutture del cliente. Dalla card dello stato si rimanda alle pagine operative:
  - Monitoraggio performance;
  - Archivio del personale.
- **Utenti**: il responsabile HR, l'ufficio del personale e la direzione. La pagina è in sola lettura.

## 2. Accesso

- **Id pagina / route**: `hr-overview`, senza parametri.
- **Sidenav**: Human Resources › **HR Overview**. È l'ultima voce della sezione. Icona di menu `fa-eye`. La stessa voce c'è nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: nessuno. Il pulsante Indietro standard sta nel `PageHead` di `BiPage` (`back` di default `true`).
- **Da dove si arriva**:
  - dalla sidenav;
  - dal Timone della Home, voce «HR Overview» con icona `trend-up`.
- **Verso dove si naviga**: freccia della card «Obiettivi / Documenti».
  - Con il tab «Obiettivi» la freccia porta a `monitoraggio-perf`.
  - Con il tab «Documenti» la freccia porta a `archivio-personale`.
- **Sottotitolo di catalogo** (`pageSubtitles.ts`): «Panoramica completa del personale, delle performance e dei trend HR». È identico al sottotitolo mostrato in pagina.

## 3. Layout

Il guscio è `BiPage`: alto il 100% dell'area contenuto, con `overflow: hidden`. Le righe sono, dall'alto, header, toolbar e corpo elastico. La griglia ha le classi `bi-page__grid hr-ov__grid`; il root ha solo `bi-page`, senza classe di pagina.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                    HR Overview                 [⟳ Dati BI 05/11/2026 10:42] │
│               Panoramica completa del personale, delle performance e dei trend HR     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Struttura▾ (220px)   Anno▾ (150px)                                                │ toolbar
├──────────────────────────────────────────────────────────────────────────────┬───┤
│ [Organico] [Nuove ass.] [Cessazioni] [Turnover] [Assenteismo] [Costo pers.]   │ L │  6 KPI
├──────────────────────────────────────────────────────┬───────────────────────┤ e │
│ MAIN: Andamento organico · 2026 (area TY + linea LY)  │ C│ COMP: Contratti/Genere│ g │
│                                                       │ │ (ciambella)          │ e │
├───────────────────────┬───────────────────────────────┼───────────────────────┤ n │
│ REP: Organico per     │ ASS: Assenze per tipologia    │ O│ STATO: Obiettivi/ │ d │
│ reparto (barre orizz.)│ (barre orizzontali)           │ D│ Documenti (ciamb.)│ a │
└───────────────────────┴───────────────────────────────┴───────────────────────┴───┘
   C/O/D = rail dei tab verticali a sinistra della card (30px)          rail Legenda 30px
```

**Griglia** (`.hr-ov__grid`; `display: grid` e `gap: 10px` vengono dal kit):

- `grid-template-columns: repeat(3, minmax(0, 1fr))`
- `grid-template-rows: auto minmax(0, 1.15fr) minmax(0, 1fr)`
- `grid-template-areas: 'kpi kpi kpi' 'main main comp' 'rep ass stato'`
- Aree:

| Classe | Area |
|---|---|
| `.hr-ov__kpis` | `kpi` |
| `.hr-ov__main` | `main` |
| `.hr-ov__comp` | `comp` |
| `.hr-ov__rep` | `rep` |
| `.hr-ov__ass` | `ass` |
| `.hr-ov__stato` | `stato` |

**Fascia KPI** (`.hr-ov__kpis`): `display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; min-width: 0`.

**Aree grafico**:

- `.hr-ov__chart` e `.hr-ov__bars`: `flex: 1; min-height: 0; min-width: 0`.
- `.hr-ov__donut`: `position: relative; flex: 1; min-height: 0; min-width: 0`, con il testo centrale sovrapposto in assoluto.

Nessuna modale. Gli unici overlay sono le tooltip e il pannello «Legenda» del kit.

## 4. Elementi e testi

### 4.1 Header

- Titolo: «HR Overview».
- Sottotitolo: «Panoramica completa del personale, delle performance e dei trend HR».
- Azioni:
  - timbro «Dati BI» con data e ora (`gg/mm/aaaa hh:mm`);
  - pulsante ⟳ con aria-label «Aggiorna i dati».

**Glossario** (rail «Legenda»), in quest'ordine:

| Acronimo | Descrizione | Modalità di calcolo |
|---|---|---|
| «Organico» | «Dipendenti in forza» | «Rapporti di lavoro attivi a fine periodo, qualunque sia il contratto (indeterminato, determinato, stagionale)» |
| «Turnover» | «Ricambio del personale» | «Cessazioni del periodo diviso l’organico medio del periodo» |
| «Assenteismo» | «Peso delle assenze non programmate» | «Ore di assenza non programmata (malattia, permessi non pianificati) diviso le ore lavorabili» |
| «Costo del personale» | «Peso del lavoro sui ricavi» | «Costo del personale (reparti e amministrazione) diviso i ricavi totali» |
| «TY» | «This Year» | «Valore della metrica nel periodo selezionato dell’anno corrente» |
| «LY» | «Last Year» | «Valore della metrica nello stesso periodo dell’anno precedente» |
| «Δ» | «Variazione» | «Differenza fra il valore dell’anno corrente e quello dell’anno precedente» |

### 4.2 Toolbar

**`SelectField name="struttura"`**

- Label: «Struttura».
- Classi: `hr-ov__filter hr-ov__filter--wide`, larghezza 220px.
- Opzioni: «Tutte le strutture», seguita dalle strutture del cliente corrente (`elenco`).
- Elenco nella demo senza profilo caricato: «Hotel Noto», «Hotel Siracusa», «Hotel Catania», «Resort Taormina».

**`SelectField name="anno"`**

- Label: «Anno».
- Classe: `hr-ov__filter`, larghezza 150px.
- Opzioni: «2026», «2025», «2024». Sono valori fissi, non calcolati dalla data.

### 4.3 Fascia KPI (6 × `KpiTile`)

| # | Label | Icona | Slot (colore) | Valore e formato | Delta e label | Spark | Info (tooltip) |
|---|---|---|---|---|---|---|---|
| 1 | «Organico totale» | `fa-users` | 0 (`--chart-1`) | organico, `fmtInt` | `(TY dic − LY dic)/LY dic × 100`, con la label di default del `DeltaBadge` («+9,1%») | organico TY dei 12 mesi | «Dipendenti in forza a fine periodo, confrontati con lo stesso mese dell'anno precedente.» |
| 2 | «Nuove assunzioni» | `fa-user-plus` | 1 (`--chart-2`) | assunzioni, `fmtInt` | differenza assoluta, label «{+/−}{n} vs LY» (es. «+3 vs LY») | — | «Contratti avviati nel periodo, confrontati con lo stesso periodo dell'anno precedente.» |
| 3 | «Cessazioni» | `fa-user-minus` | 2 (`--chart-3`) | cessazioni, `fmtInt` | differenza assoluta, **invertita**, label «{+/−}{n} vs LY» (es. «−1 vs LY», in verde) | — | «Rapporti di lavoro chiusi nel periodo (dimissioni, fine contratto, licenziamenti).» |
| 4 | «Turnover» | `fa-arrows-rotate` | 3 (`--chart-4`) | `fmtPct` → «6,3%» | `6,3 − 7,1`, **invertita**, label «−0,8 pt» | — | «Cessazioni del periodo sull'organico medio.» |
| 5 | «Assenteismo» | `fa-calendar-xmark` | 4 (`--chart-5`) | `fmtPct` → «4,1%» | `4,1 − 3,8`, **invertita**, label «+0,3 pt» (rosso) | assenteismo dei 12 mesi | «Ore di assenza non programmata (malattia, permessi non pianificati) sulle ore lavorabili.» |
| 6 | «Costo personale» | `fa-euro-sign` | 5 (`--chart-6`) | costo annuo, `fmtCosto` | — | costo dei 12 mesi | «Retribuzioni lorde, contributi e accantonamenti del periodo.» |

- Nelle label dei delta il segno è «+» quando la differenza è ≥ 0 e «−» (meno tipografico) quando è negativa. I decimali seguono l'it-IT, con al massimo 1 cifra.
- `fmtCosto(n)`:
  - se `n ≥ 1.000.000`: «{n/1e6 con 2 decimali it-IT} M€», per esempio «2,02 M€»;
  - altrimenti: «{fmtInt(n/1000)} k€», per esempio «829 k€».
- Le tile con la sparkline (1, 5, 6) mostrano anche la riga di posizione min–max. Le tile 2, 3 e 4 non hanno né sparkline né riga di posizione.

### 4.4 Card «Andamento organico» (`.hr-ov__main`, index 0)

- Titolo: «Andamento organico · {anno}».
- Sottotitolo: «Dipendenti in forza a fine mese, contro anno precedente».
- Badge: `fmtInt(organico)`.
- Legenda:
  - «{anno}», colore `--chart-1`;
  - «{anno−1}», colore `--chart-ly`.

Grafico `ComposedChart`, con `data = trend` (12 mesi `{mese, ty, ly}`):

- **Margini e sfumatura**:
  - `margin {top 6, right 8, left −12, bottom 0}`;
  - `defs`: `linearGradient#hr-ov-area` verticale, con stop 0% `--chart-1` a opacità 0,22 e stop 100% `--chart-1` a opacità 0.
- **Griglia e assi**:
  - `CartesianGrid` con `gridProps`: solo linee orizzontali `--chart-grid`, spessore 1;
  - `XAxis dataKey="mese"` («Gen» … «Dic») con `xAxisProps` e `interval={0}`;
  - `YAxis` con `yAxisProps` (larghezza 46), `tickFormatter fmtInt`, `domain ['dataMin - 10', 'dataMax + 5']`, `allowDecimals={false}`.
- **Tooltip**: `cursor = cursorProps`, cioè una linea verticale `--chart-axis` tratteggiata `3 3`. Il contenuto è `ChartTooltip` con `names {ty: '{anno}', ly: '{anno−1}'}` e formato «{n} dipendenti».
- **Serie**:
  - `Line ly`: `monotone`, `stroke --chart-ly`, `strokeWidth 1.8`, `dot false`, `animationBegin 90ms`, durata 900ms, `ease-out`. È disegnata **prima**, quindi sta sotto l'area;
  - `Area ty`: `monotone`, `stroke --chart-1`, `strokeWidth 2.4`, `fill url(#hr-ov-area)`, `animationBegin 0`, durata 900ms, `ease-out`.

### 4.5 Card «Contratti» / «Genere» (`.hr-ov__comp`, index 1)

- Rail `BiVerticalTabs` con i tab «Contratti» e «Genere». Le etichette sono ruotate e in MAIUSCOLO via CSS.
- Titolo: «Contratti» oppure «Genere», secondo il tab attivo.
- Sottotitolo: «Dipendenti in forza».
- Legenda: una voce per parte, con nome «{label} {n}» (es. «Indeterminato 65») e colore `series(i)`.
- Parti per tab:
  - «Contratti»: «Indeterminato», «Determinato», «Stagionale», con colori `--chart-1`, `--chart-2`, `--chart-3`;
  - «Genere»: «Donne», «Uomini», con colori `--chart-1`, `--chart-2`.

Ciambella `Pie`:

- `dataKey value`, `nameKey label`;
- `innerRadius "62%"`, `outerRadius "86%"`, `paddingAngle 2`;
- `stroke --chart-surface`, `strokeWidth 2`;
- angoli di recharts di default: si parte da ore 3 e si procede in senso antiorario;
- durata 900ms, `ease-out`;
- `Cell` i-esima con `fill series(i)`.

Tooltip: `ChartTooltip` con formato «{n} dipendenti». Il nome visualizzato è la label della parte.

Centro della ciambella:

- valore: la somma delle parti, che coincide con l'organico;
- etichetta: «dipendenti».

### 4.6 Card «Organico per reparto» (`.hr-ov__rep`, index 2)

- Titolo: «Organico per reparto».
- Sottotitolo: «Dipendenti in forza per reparto».
- Nessun badge e nessuna legenda: la serie è una sola.

Grafico `BarChart` orizzontale (`layout="vertical"`), con `data = reparti`:

- **Margini**: `margin {top 2, right 40, left 0, bottom 0}`, `barCategoryGap "22%"`.
- **Griglia**: `CartesianGrid` con `gridProps` più `horizontal={false} vertical`, cioè solo linee verticali.
- **Assi**:
  - `XAxis type="number" hide`;
  - `YAxis type="category" dataKey="label"` con `yAxisProps`, `width 116`, `interval 0`, `tick {fontSize 11, fill --chart-ink}`.
- **Tooltip**: `cursor {fill transparent}`, `names {value: 'Dipendenti'}`, formato `fmtInt`.
- **Serie**: `Bar value`, `fill --chart-1`, `radius [0,4,4,0]`, `maxBarSize 14`, durata 900ms, `ease-out`. Ha una `LabelList` con `barEndLabel(fmtInt)`: il numero sta 6px a destra della fine della barra, in 11px 600 `--chart-ink`.

Reparti, nell'ordine:

1. «Housekeeping»
2. «F&B»
3. «Front office»
4. «Cucina»
5. «Manutenzione»
6. «Amministrazione»
7. «Marketing»
8. «Direzione»

### 4.7 Card «Assenze per tipologia» (`.hr-ov__ass`, index 3)

- Titolo: «Assenze per tipologia».
- Sottotitolo: «Giorni di assenza dell'anno».
- Badge: «{somma} gg».

Grafico: come la card 4.6, con queste differenze:

- `margin.right` 48;
- `barCategoryGap "26%"`;
- larghezza dell'asse Y 70;
- `fill --chart-2`;
- tooltip con `names {value: 'Giorni'}` e formato «{n} gg»;
- etichetta in fondo alla barra «{n} gg».

Voci, nell'ordine:

1. «Ferie»
2. «Malattia»
3. «Permessi»
4. «Congedi»

### 4.8 Card «Obiettivi» / «Documenti» (`.hr-ov__stato`, index 4)

- Rail con i tab «Obiettivi» e «Documenti».
- Titolo: «Obiettivi» oppure «Documenti».
- Sottotitolo:
  - tab «Obiettivi»: «{n} a rischio»;
  - tab «Documenti»: «{n} incompleti».
- Legenda: «{label} {n}» per ogni parte.

Parti e colori di stato:

| Tab | Parte | Colore |
|---|---|---|
| Obiettivi | «Raggiunti» | `--chart-good` |
| Obiettivi | «In linea» | `--chart-1` |
| Obiettivi | «A rischio» | `--chart-bad` |
| Documenti | «Completa» | `--chart-good` |
| Documenti | «Incompleta» | `--chart-bad` |

Regola dei colori (`coloreStato`):

- «Raggiunti» e «Completa» → good;
- «A rischio» e «Incompleta» → bad;
- per le altre parti: `series(0)` se l'indice è 1, altrimenti `series(i)`.

Azione in alto a destra:

- pulsante `sib-btn sib-btn--icon hr-ov__link` con icona `fa-solid fa-arrow-right` (14px, `--color-primary`);
- Tooltip e `aria-label`: «Monitoraggio performance» oppure «Archivio personale», secondo il tab attivo.

Ciambella: stessa configurazione della card 4.5. Tooltip con formato `fmtInt`.

Centro della ciambella:

- tab «Obiettivi»: «{avanzamento}%» con l'etichetta «avanz. medio»;
- tab «Documenti»: `fmtPct(completa / organico × 100, 0)` (es. «83%») con l'etichetta «completa».

## 5. Stati e interazioni

### Stato iniziale

- Struttura: quella selezionata in alto nella sidenav (`useStrutturaCorrente`). Nella demo è «Hotel Noto».
- Anno: «2026».
- Tab «Contratti» e tab «Obiettivi».
- Timbro: l'ora di apertura della pagina.

### Filtri

- **Cambio struttura**: i numeri si riscalano sull'organico stimato della selezione (§6). Con «Tutte le strutture» si sommano tutte le strutture dell'elenco.
- **Struttura cambiata dalla sidenav**: se si cambia la struttura in alto mentre la pagina è aperta, la select locale la segue.
- **Cambio anno**: cambiano **solo i testi**, cioè il titolo «Andamento organico · {anno}», le voci di legenda e i nomi in tooltip «{anno}» e «{anno−1}». I dati restano gli stessi, perché nella demo sono indipendenti dall'anno. Nel backend reale l'anno dovrà filtrare i dati.

### Tab, hover e navigazione

- **Tab verticali**: cambiano titolo, legenda, ciambella e centro della card.
  - Nella card dello stato cambiano anche il sottotitolo e la destinazione della freccia.
  - Il grafico non si rimonta: recharts anima la transizione fra i due insiemi di dati con la durata di 900ms.
- **Hover**:
  - KPI: il bordo prende il colore dello slot e compaiono «min / max», sulle tile con sparkline;
  - card: il bordo si accende e compare l'ombra `--shadow-sm`;
  - grafici: tooltip scura standard.
- **Freccia della card stato**: naviga a `monitoraggio-perf` oppure ad `archivio-personale`.
- **Aggiorna** (⟳): aggiorna solo l'ora del timbro (`setDataAt(new Date())`); i dati non cambiano.
- **Legenda acronimi**: si apre e chiude dalla linguetta; si chiude anche con Esc, con un clic fuori o con la X.

### Assenze

Non ci sono stati vuoti, di caricamento o d'errore, né modali, conferme o toast.

## 6. Dati e regole di business

Oggi i dati sono **mock nel componente**: costanti riferite a un organico base di **142** dipendenti, riscalate sull'organico stimato della selezione.

### Dati base (organico 142)

**Serie mensili** (12 valori, da gennaio a dicembre):

| Serie | Valori |
|---|---|
| `ORGANICO_TY` | 120, 122, 125, 128, 130, 133, 136, 138, 139, 140, 141, 142 |
| `ORGANICO_LY` | 112, 113, 116, 118, 119, 121, 124, 126, 127, 128, 129, 130 |
| `ASSENTEISMO_MESI` (%) | 4.6, 4.9, 4.2, 3.8, 3.6, 3.9, 4.4, 4.8, 4.0, 3.7, 3.9, 4.1 |
| `COSTO_MESI` (migliaia di €) | 92, 93, 96, 99, 103, 108, 112, 114, 108, 102, 98, 101 |

**Indicatori annui**:

| Indicatore | TY | LY |
|---|---|---|
| Assunzioni | 18 | 14 |
| Cessazioni | 9 | 11 |
| Turnover (%) | 6.3 | 7.1 |
| Assenteismo (%) | 4.1 | 3.8 |

**Ripartizioni**:

| Ripartizione | Parti |
|---|---|
| Contratti | Indeterminato 96 · Determinato 28 · Stagionale 18 |
| Genere | Donne 78 · Uomini 64 |
| Reparti | Housekeeping 34 · F&B 30 · Front office 28 · Cucina 16 · Manutenzione 14 · Amministrazione 10 · Marketing 6 · Direzione 4 |
| Assenze (giorni) | Ferie 52 · Malattia 31 · Permessi 24 · Congedi 12 |
| Obiettivi | Raggiunti 38 · In linea 64 · A rischio 21 |
| Documentazione | Completa 118 · Incompleta 24 |

### Organico stimato della struttura

`organicoDi(scheda)`, calcolato sulla scheda demo della struttura:

| Tipo di struttura | Organico |
|---|---|
| `bnb` | 3 |
| `studentato` | `round(camere × 0,12) + 6` |
| senza camere (`camere === 0`) | `14 + (seme % 10)` |
| altri | `round(camere × k) + 8`, con `k = 1,1` per 5 stelle o più, `0,7` per 4 stelle, `0,45` altrimenti |

Come si ottiene la scheda demo (`schedaDemo(nome)`):

- Se il nome è fra i clienti dell'Admin (`CLIENTS_INIT`), i dati vengono da lì. Per esempio «Hotel Noto»: Resort 5★, 80 camere.
- Altrimenti si derivano da un hash FNV-1a del nome:
  - `seme = hash(nome)`;
  - stelle 5 se il nome contiene «resort», altrimenti `3 + (seme % 2)`;
  - `camere = 40 + (seme % 50)`.

  La funzione hash:

```ts
const hashNome = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return h }
```

### Riscalatura

- `organico = max(1, Σ organicoDi(strutture selezionate))`.
- Fattore di scala: `f = organico / 142`.
- `sc(n) = max(0, round(n × f))`, applicata a:
  - assunzioni e cessazioni, TY e LY;
  - ogni mese di `ORGANICO_TY` e di `ORGANICO_LY`;
  - ogni parte di ogni ripartizione.
- **Chiusura sull'organico**: per contratti, genere e documentazione l'ultima parte vale `max(0, organico − somma delle altre)`. Così le parti sommano sempre all'organico, senza scarti di arrotondamento.
  - Reparti, assenze e obiettivi **non** vengono chiusi.
- Costo: `costoMesi[i] = COSTO_MESI[i] × 1000 × f`, e `costo = Σ costoMesi`.
- **Non riscalati**: turnover, assenteismo e la serie dell'assenteismo restano costanti.

### Derivati

- Delta dell'organico: `pct(a, b) = b ? (a − b)/b × 100 : 0`, applicata a `pct(trend[11].ty, trend[11].ly)`.
- `avanzamento = round((raggiunti + inLinea × 0,6) / max(1, Σ obiettivi) × 100)`.
- `aRischio` = la terza parte degli obiettivi.
- `docIncompleta` = la seconda parte della documentazione.

### Valori attesi nella demo

| Indicatore | «Hotel Noto» (organico 96) | «Tutte le strutture» (organico 234) |
|---|---|---|
| Organico (Δ) | 96 (+9,1%) | 234 (+9,3%) |
| Andamento TY | 81, 82, 85, 87, 88, 90, 92, 93, 94, 95, 95, 96 | — |
| Andamento LY | 76, 76, 78, 80, 80, 82, 84, 85, 86, 87, 87, 88 | — |
| Assunzioni | 12 («+3 vs LY») | 30 («+7 vs LY») |
| Cessazioni | 6 («−1 vs LY») | 15 («−3 vs LY») |
| Costo | «829 k€» | «2,02 M€» |
| Contratti | 65 · 19 · 12 | 158 · 46 · 30 |
| Genere | 53 · 43 | 129 · 105 |
| Reparti | 23 · 20 · 19 · 11 · 9 · 7 · 4 · 3 | 56 · 49 · 46 · 26 · 23 · 16 · 10 · 7 |
| Assenze (badge) | 35 · 21 · 16 · 8 («80 gg») | 86 · 51 · 40 · 20 («197 gg») |
| Obiettivi | 26 · 43 · 14 («14 a rischio», centro «62%») | 63 · 105 · 35 («35 a rischio», «62%») |
| Documenti | 80 · 16 («16 incompleti», centro «83%») | 194 · 40 («40 incompleti», «83%») |

L'organico di «Tutte le strutture» si compone così:

| Struttura | Camere | Stelle | Organico |
|---|---|---|---|
| Hotel Noto | 80 | 5 | 96 |
| Hotel Siracusa | 84 | 3 | 46 |
| Hotel Catania | 40 | 3 | 26 |
| Resort Taormina | 53 | 5 | 66 |

Gli indicatori costanti valgono in tutti e due i casi: turnover «6,3%» con delta «−0,8 pt», assenteismo «4,1%» con delta «+0,3 pt».

**Formato dei numeri**: `fmtInt` e `fmtPct` usano `Intl it-IT` e non raggruppano le 4 cifre (vedi la scheda 13, §6.7).

**Persistenza**: la pagina non persiste nulla. La struttura attiva viene da `useOrgStore`, che persiste solo `activeStruttura`. Se è caricato un profilo, `elenco` si riduce alla struttura del profilo; in assistenza, alle strutture del cliente assistito (vedi `01-modello-dati-e-api.md`).

**Legame con le altre pagine HR**: oggi nessuno. La card «Obiettivi» **non** legge `useObiettiviStore` e i numeri dei reparti non vengono da `DIPENDENTI_HR`. Il backend reale deve invece calcolare tutto dai dati veri:

- personale e contratti;
- richieste di assenza;
- obiettivi;
- documenti dell'archivio.

## 7. Backend da realizzare

**`GET /Sibylla/hr/overview?struttura={nome|*}&anno=2026`**, dove `*` significa «Tutte le strutture».

Risposta 200:

```json
{
  "aggiornatoAl": "2026-11-05T10:42:00+01:00",
  "organico": 96,
  "trend": [ { "mese": "Gen", "ty": 81, "ly": 76 }, "… 12 mesi …" ],
  "assunzioni": 12, "assunzioniLY": 9,
  "cessazioni": 6,  "cessazioniLY": 7,
  "turnover": 6.3,  "turnoverLY": 7.1,
  "assenteismo": 4.1, "assenteismoLY": 3.8,
  "assenteismoMesi": [4.6, 4.9, 4.2, 3.8, 3.6, 3.9, 4.4, 4.8, 4.0, 3.7, 3.9, 4.1],
  "costoMesi": [62197, 62873, 64901, 66929, 69633, 73014, 75718, 77070, 73014, 68957, 66253, 68281],
  "contratti": [ { "label": "Indeterminato", "value": 65 }, { "label": "Determinato", "value": 19 }, { "label": "Stagionale", "value": 12 } ],
  "genere": [ { "label": "Donne", "value": 53 }, { "label": "Uomini", "value": 43 } ],
  "reparti": [ { "label": "Housekeeping", "value": 23 }, "…" ],
  "assenze": [ { "label": "Ferie", "value": 35 }, { "label": "Malattia", "value": 21 }, { "label": "Permessi", "value": 16 }, { "label": "Congedi", "value": 8 } ],
  "performance": [ { "label": "Raggiunti", "value": 26 }, { "label": "In linea", "value": 43 }, { "label": "A rischio", "value": 14 } ],
  "documentazione": [ { "label": "Completa", "value": 80 }, { "label": "Incompleta", "value": 16 } ]
}
```

I valori di `costoMesi` sono `COSTO_MESI × 1000 × 96/142` non arrotondati: il frontend li somma e li formatta.

### Regole di calcolo

- **Organico**: rapporti attivi a fine mese.
- **Assunzioni e cessazioni**: contratti avviati e chiusi nell'anno.
- **Turnover**: `cessazioni / organico medio × 100`.
- **Assenteismo**: `ore di assenza non programmata / ore lavorabili × 100`.
- **Costo**: retribuzioni lorde, contributi e accantonamenti per mese.
- **Assenze**: giorni approvati per tipo.
- **Performance**: conteggio degli obiettivi per stato sintetico, con la stessa regola della scheda 14:
  - ≥ 100% oppure concluso → «Raggiunti»;
  - ≥ 50% → «In linea»;
  - sotto → «A rischio».
- **Documentazione**: completa se il dipendente ha tutti i documenti obbligatori.

### Ordine e contratto con il frontend

- Le etichette e il loro ordine devono essere esattamente quelli della §4.
- Il frontend usa le posizioni fisse `performance[2]` (a rischio) e `documentazione[1]` (incompleta).

### Errori e comportamento generale

- 400 se l'anno non è fra quelli ammessi.
- 404 se la struttura non appartiene al cliente.
- In caso di errore il frontend può tenere i dati mock (fallback-first del kit BI).
- Sola lettura: nessuna transazione, nessuna notifica.

## 8. Stile

Tutta la cromatura (card, KPI, tooltip, tab, timbro, legenda) viene dal kit: valori nell'appendice A della scheda 13. Classi proprie della pagina:

| Classe | Proprietà |
|---|---|
| `.hr-ov__filter` | `width: 150px` |
| `.hr-ov__filter--wide` | `width: 220px` |
| `.hr-ov__link i` | `color: var(--color-primary); font-size: 14px`. Il colore e la dimensione stanno sull'icona perché `.sib-btn--icon` forza il grigio a 12px |
| `.hr-ov__chart`, `.hr-ov__bars` | `flex: 1; min-height: 0; min-width: 0` |
| `.hr-ov__donut` | `position: relative; flex: 1; min-height: 0; min-width: 0` |
| `.hr-ov__donut-center` | `position: absolute; top 50%; left 50%; transform translate(-50%, -50%); flex column; align center; text-align center; pointer-events none` |
| `.hr-ov__donut-val` | `font-family var(--font-heading)` (Poppins); `font-size 19px; font-weight 700; color var(--color-primary); tabular-nums; line-height 1.1` |
| `.hr-ov__donut-lbl` | `font-family var(--font-body)` (Open Sans); `font-size 11px; color var(--color-text-inactive)` |

### Colori del tema chiaro

| Token | Valore |
|---|---|
| `--chart-1` | `#2E6DA4` |
| `--chart-2` | `#C4661F` |
| `--chart-3` | `#A8407F` |
| `--chart-4` | `#A8862F` |
| `--chart-5` | `#1E9E95` |
| `--chart-6` | `#C43D34` |
| `--chart-ly` | `#A9B2BC` |
| `--chart-good` | `#007035` |
| `--chart-bad` | `#D10011` |
| `--chart-grid` | `#E6EBF0` |
| `--chart-axis` | `#C3C9D0` |
| `--chart-ink` | `#4A4D53` |
| `--chart-ink-muted` | `#6E7175` |
| `--chart-surface` | `#FFFFFF` |
| `--color-primary` | `#204769` |
| `--color-text-inactive` | `#6E7175` |

### Tema scuro

Non ci sono regole proprie: valgono i token scuri.

| Token | Valore |
|---|---|
| `--chart-1` | `#4A8BC9` |
| `--chart-2` | `#D9722F` |
| `--chart-3` | `#D0609F` |
| `--chart-4` | `#A8862F` |
| `--chart-5` | `#1E9E95` |
| `--chart-6` | `#E8635A` |
| `--chart-ly` | `#4A5462` |
| `--chart-good` | `#34D399` |
| `--chart-bad` | `#FF6B78` |
| `--chart-grid` | `#262C38` |
| `--chart-axis` | `#3A4453` |
| `--chart-ink` | `#E6E8EC` |
| `--chart-ink-muted` | `#9AA2AE` |
| `--chart-surface` | `#1A1E26` |
| `--color-primary` | `#6F9BCB` |
| `--color-surface` | `#1A1E26` |

## 9. Responsività

Le soglie di larghezza sono **container query** sul root `bi-page`, cioè sulla larghezza reale del contenuto, che varia con la sidenav aperta o chiusa. Non sono media query sul viewport.

**`@container bi-page (max-width: 1180px)`** (laptop da 1366 px con sidenav aperta):

- `.hr-ov__kpis`: gap 8px;
- `.hr-ov__filter`: 128px; `.hr-ov__filter--wide`: 180px;
- `.hr-ov__donut-val`: 17px;
- dal kit:
  - toolbar: gap 8px e mb 10px; body e grid: gap 8px;
  - card: padding `8px 10px 10px`, titolo 12px, sottotitolo 10px;
  - KPI: padding `8px 10px`, valore 18px, sparkline 68px.

**`@media (max-height: 820px)`**:

- `.hr-ov__kpis`: gap 8px;
- dal kit: header mb 8px, toolbar mb 8px, gap 8px.

**`@media (max-height: 760px)`** (per esempio 1280×720):

- `.hr-ov__grid`: righe `auto minmax(0, 1fr) minmax(0, 1.2fr)`. Le barre prendono altezza dall'andamento;
- `.hr-ov__donut-lbl`: nascosta. Resta il numero, perché il titolo dice già cosa rappresenta.

**Vincoli**:

- nessuno scroll né verticale né orizzontale a nessuna larghezza: le tracce sono `minmax(0, …)` e le celle hanno `min-width: 0` e `min-height: 0`;
- titoli e sottotitoli delle card e label delle KPI vanno su una riga, con ellipsis e tooltip (`TruncatedText`);
- con 6 KPI su 6 colonne, a 1366 px le label lunghe come «Nuove assunzioni» e «Costo personale» possono troncarsi con tooltip.

A 1920 px valgono le dimensioni piene.

## 10. Effetti e animazioni

| Elemento | Effetto |
|---|---|
| KPI | ingresso `kpi-tile-in` 420ms `cubic-bezier(0.32, 0.72, 0, 1)`, da `opacity 0; translateY(8px)`, con ritardo `i × 70ms` (0…350ms) |
| Valori KPI | contati da 0 in 900ms, easeOutCubic |
| Sparkline | disegno in 900ms `ease-out`, ritardo `i × 90ms` |
| Pallino min–max | transizione `left` 420ms |
| Card | ingresso `chart-card-in` 460ms con la stessa curva, ritardo `index × 80ms + 80ms` (80, 160, 240, 320, 400ms), da `opacity 0; translateY(10px) scale(0.995)` |
| Hover sulle card | bordo e ombra in 160ms `ease` |
| Grafici | ingresso in 900ms `ease-out`; nell'andamento la linea LY parte 90ms dopo l'area TY |
| Cambio tab | le ciambelle passano ai nuovi valori con l'animazione di recharts (900ms) |
| Tab verticali | sfondo e colore in 160ms `ease` |
| Timbro e linguetta Legenda | transizioni di 160ms |
| Pannello Legenda | ingresso in 180ms `ease`, da `translateX(6px)` |

**`prefers-reduced-motion`**:

- recharts con `isAnimationActive = false`, perché `reducedMotion()` è vero;
- nessun ingresso di card e KPI;
- valori KPI già finali;
- vale anche la regola globale della piattaforma, con durate a `.01ms`.

## 11. Accessibilità

- Freccia della card stato: `button` con `aria-label` «Monitoraggio performance» oppure «Archivio personale», e tooltip con lo stesso testo. L'icona ha `aria-hidden`.
- Tab verticali: `role="tablist"` con `aria-orientation="vertical"`; ogni tab ha `role="tab"` e `aria-selected`.
- Timbro: il pulsante ha `aria-label` «Aggiorna i dati»; l'ora è un `<time>` con `dateTime` ISO.
- Legenda acronimi:
  - linguetta con `aria-expanded` e `aria-controls`;
  - pannello `role="dialog"` con aria-label «Legenda degli acronimi»;
  - Esc chiude.
- Tooltip dei grafici: `role="tooltip"`. Le sparkline sono `aria-hidden`.
- Select con label associate.
- Il significato di stato non è affidato solo al colore: le legende riportano la label e il numero.

## 12. Criteri di accettazione

1. Titolo «HR Overview», sottotitolo «Panoramica completa del personale, delle performance e dei trend HR»; timbro «Dati BI gg/mm/aaaa hh:mm». Il clic su ⟳ aggiorna l'ora.
2. Toolbar: select «Struttura» (220px), con «Tutte le strutture» seguita dalle strutture del cliente; select «Anno» (150px) con «2026», «2025», «2024». Si apre su «Hotel Noto» e «2026».
3. La fascia ha 6 KPI su una riga, nell'ordine «Organico totale», «Nuove assunzioni», «Cessazioni», «Turnover», «Assenteismo», «Costo personale», con le icone e i colori della §4.3.
4. Con «Hotel Noto» le KPI mostrano:
   - Organico 96 con «+9,1%» in verde;
   - Nuove assunzioni 12 con «+3 vs LY» in verde;
   - Cessazioni 6 con «−1 vs LY» in verde;
   - Turnover «6,3%» con «−0,8 pt» in verde;
   - Assenteismo «4,1%» con «+0,3 pt» in rosso;
   - Costo «829 k€».
5. Con «Tutte le strutture» l'organico vale 234 e il costo «2,02 M€».
6. «Andamento organico · 2026»:
   - area blu sfumata per il 2026 e linea grigia per il 2025;
   - asse Y senza decimali, dal minimo −10 al massimo +5;
   - all'hover cursore tratteggiato e tooltip «81 dipendenti» / «76 dipendenti» su «Gen».
7. Con l'anno «2025» il titolo diventa «Andamento organico · 2025» e la legenda «2025 / 2024». I numeri non cambiano.
8. Il tab «Genere» della card composizione cambia titolo in «Genere», legenda in «Donne 53 · Uomini 43» e la ciambella; il centro resta «96 dipendenti».
9. «Organico per reparto» ha 8 barre orizzontali blu, ordinate come nella §4.6, con il numero a destra di ogni barra e solo linee di griglia verticali.
10. «Assenze per tipologia» ha il badge «80 gg» e 4 barre arancio con le etichette «35 gg», «21 gg», «16 gg», «8 gg».
11. La card «Obiettivi» ha il sottotitolo «14 a rischio», la ciambella verde/blu/rossa e il centro «62%» con «avanz. medio»; la freccia porta a Monitoraggio performance. Con il tab «Documenti» si legge «16 incompleti», la ciambella è verde/rossa, il centro «83%» con «completa» e la freccia porta ad Archivio del personale.
12. A 1366×768 con sidenav aperta, a 1440×900 e a 1920×1080 non compare nessuno scroll. Sotto i 1180 px di contenuto i filtri passano a 180 e 128px. Sotto i 760 px di altezza spariscono le etichette sotto i numeri delle ciambelle.
13. Card e KPI entrano in cascata (KPI ogni 70ms, card ogni 80ms dopo 80ms); i numeri contano in 0,9 s. Con «riduci movimento» tutto è statico.
14. In tema scuro i grafici usano la palette scura (`--chart-1 #4A8BC9`, griglia `#262C38`) su superficie `#1A1E26`.
15. Il rail «Legenda» elenca, nell'ordine, Organico, Turnover, Assenteismo, Costo del personale, TY, LY e Δ, con descrizione e modalità di calcolo esatte.

## 13. File sorgente

- `src/router/PageContent.tsx` (route `hr-overview`)
- `src/modules/hr/HrOverview/HrOverview.tsx`
- `src/modules/hr/HrOverview/HrOverview.sass`
- `src/hooks/useStrutturaCorrente.ts` (`useStrutturaPagina`, `useStruttureCliente`)
- `src/core/demo/struttureDemo.ts` (`schedaDemo`, `hashNome`)
- `src/store/useOrgStore.ts` (strutture demo), `src/admin/SibyllaAdminPanel/constants.ts` (`CLIENTS_INIT`)
- `src/core/bi/*` (vedi l'elenco nella scheda 13), `src/core/bi/biGlossary.ts`
- `src/styles/_themes.sass`
- `src/navigation/menu.ts`, `src/navigation/pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`, `src/modules/home/Timone/Timone.tsx`
- `docs/bi.md`
