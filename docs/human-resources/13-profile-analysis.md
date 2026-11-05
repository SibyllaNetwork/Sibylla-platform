# 13 · Profile analysis

Scheda di riproduzione della pagina **Profile analysis**, la scheda BI del singolo dipendente: carriera e retribuzione, presenze, cedolini, premio di risultato, distribuzione del tempo, competenze e formazione obbligatoria.

È una **pagina BI**: segue il kit `src/core/bi` (descritto in `docs/bi.md` e riassunto nell'appendice A di questa scheda, perché chi riproduce non ha il repository). Vincolo tassativo del kit: **tutto in una schermata, nessuno scroll né verticale né orizzontale**.

Rimandi: design system, token, `PageHead`, `SelectField`, `Tooltip`, `TruncatedText`, pulsanti `.sib-btn` → `00-fondamenta.md`. Personale `DIPENDENTI_HR`, richieste di assenza (`useHrGestioneStore`), obiettivi (`useObiettiviStore`) → `01-modello-dati-e-api.md` (e `15-assegna-obiettivo.md` per gli obiettivi).

---

## 1. Scopo e utenti

- **Scopo**: leggere un dipendente come in un cruscotto. In una sola schermata si vedono:
  - chi è (ruolo, livello CCNL, contratto, orario, anzianità, età, costo azienda, posizione rispetto al reparto);
  - la lettura sintetica di Sibylla, cioè fino a 4 punti di attenzione;
  - 4 indicatori: RAL, ore lavorate, assenteismo, straordinari;
  - la carriera (RAL per anno contro la media di reparto e il livello), con le viste alternative Presenze mese per mese e Cedolini;
  - il premio di risultato a tachimetro, con i driver;
  - dove va il tempo dell'anno (ciambella);
  - le competenze contro la media del reparto (radar);
  - la formazione obbligatoria con le scadenze.
- **Utenti**: l'ufficio del personale e il responsabile HR della struttura. La pagina è in sola lettura: non modifica nessun dato.

## 2. Accesso

- **Id pagina / route**:
  - `profile-analysis` apre il dipendente con id 1;
  - `profile-analysis:<id>` apre il dipendente con quell'id numerico, per esempio `profile-analysis:3`.
- **Parsing nel router**: `id = Number(page.split(':')[1])`. Se `id` è un numero finito viene passato come `dipendenteId`, altrimenti `undefined`. Il componente riceve `key={page}`: cambiando id la pagina si rimonta da zero.
- **Id inesistente**: se `dipendenteId` non è fra gli id di `DIPENDENTI_HR`, si apre il dipendente 1.
- **Evidenziazione nel menu**: la route parametrica evidenzia nella sidenav la voce `profile-analysis`. La regola: se la base prima dei `:` è una voce di menu, vale quella voce.
- **Sidenav**: Human Resources › Gestione delle anagrafiche › **Profile analysis**. Icona di menu `fa-id-card`. La stessa voce c'è nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: nessuno. In alto a sinistra c'è il pulsante Indietro standard del `PageHead` (`back` di default `true`).
- **Da dove si arriva**:
  - dalla sidenav;
  - dal Timone della Home, voce «Profile analysis» con icona `bar`.
  - Nessuna pagina oggi naviga al deep link `profile-analysis:<id>`: il router lo supporta già, ed è il punto d'aggancio previsto, per esempio da Archivio del personale.
- **Verso dove si naviga**:
  - pulsante «Turni» → `turni-personale`;
  - pulsante «Ferie» → `hr-richieste-ferie`;
  - icona nella card Premio, solo se il premio viene da un obiettivo assegnato → `monitoraggio-perf`.
- **Sottotitolo di catalogo** (`pageSubtitles.ts`, usato fuori dalla pagina, per esempio nelle ricerche): «Analizza i profili dei dipendenti per monitorare ruoli, performance e competenze». Nella pagina il sottotitolo è un altro (vedi §4).

## 3. Layout

Il guscio è `BiPage` (appendice A.1), alto il 100% dell'area contenuto, con `overflow: hidden`. Ha tre righe: header, toolbar e corpo elastico. Il root ha le classi `bi-page pa`, la griglia `bi-page__grid pa__grid`.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]              Profile analysis                         [⟳ Dati BI 05/11/2026 10:42] │  PageHead (margin-bottom 12px)
│                La scheda analitica del dipendente: …                                       │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ Dipendente▾ (260px)   Anno▾ (120px)                    ⚖ Confronto con i 3 colleghi di Front office │  toolbar (gap 10, mb 12)
├──────────────┬───────────────────────────────────────────────────────────────────────┬───┤
│ PROF         │ KPI: [RAL] [Ore lavorate] [Assenteismo] [Straordinari]  (4 col, gap 10) │ L │
│ (hero blu,   ├──────────────────────────────────────────────┬────────────────────────┤ e │
│  avatar,     │ MAIN: Carriera e retribuzione  (rail tab      │ BONUS: Premio di       │ g │
│  nome, ruolo,│       Carriera/Presenze/Cedolini)  2 colonne  │ risultato (tachimetro  │ e │
│  chip)       │                                                │ + driver)              │ n │
│ facts (6)    ├────────────────────┬──────────────────────────┼────────────────────────┤ d │
│ insight      │ TEMPO: Dove va il  │ COMP: Competenze (radar) │ FORM: Formazione       │ a │
│ [Turni][Ferie│ tempo (ciambella)  │                          │ obbligatoria           │   │
└──────────────┴────────────────────┴──────────────────────────┴────────────────────────┴───┘
                                                                                rail Legenda 30px
```

**Griglia di pagina** (`.pa__grid`; `display: grid` e `gap: 10px` vengono da `.bi-page__grid`):

- `grid-template-columns: minmax(230px, 0.82fr) repeat(3, minmax(0, 1fr))`
- `grid-template-rows: auto minmax(0, 1.18fr) minmax(0, 1fr)`
- `grid-template-areas: 'prof kpi kpi kpi' 'prof main main bonus' 'prof tempo comp form'`
- Aree: `.pa__prof` → `prof`, `.pa__kpis` → `kpi`, `.pa__main` → `main`, `.pa__bonus` → `bonus`, `.pa__tempo` → `tempo`, `.pa__comp` → `comp`, `.pa__form` → `form`.
- A destra della griglia (`.bi-page__body`, flex con gap 10px) c'è il rail «Legenda», largo 30px (appendice A.7).

**Fascia KPI** (`.pa__kpis`): `display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; min-width: 0`.

**Colonna profilo** (`.pa__prof`), una sezione a tutta altezza (tre righe), flex in colonna. Dall'alto:

1. **Hero** (`.pa__hero`), con questo contenuto:
   - una riga di navigazione: ‹ «n di N» ›;
   - l'avatar, un cerchio di 84px con l'anello dell'anzianità;
   - il nome;
   - il ruolo;
   - i chip reparto e livello.
2. **Facts** (`dl.pa__facts`): 6 righe etichetta/valore.
3. **Insight** (`.pa__insight`): box «La lettura di Sibylla», `flex: 1`. Prende tutto lo spazio che resta.
4. **Links** (`.pa__links`): griglia `1fr 1fr` gap 8px con i pulsanti «Turni» e «Ferie».

**Card** (`ChartCard`, appendice A.3): ogni card ha l'intestazione con titolo, badge, sottotitolo, legenda e azioni, un corpo elastico e un piede facoltativo. La card «Carriera e retribuzione» ha a sinistra il rail con 3 tab verticali larghi 30px.

**Formazione**: il corpo della card è ridefinito in riga (`.pa__form .chart-card__body { flex-direction: row; align-items: center; gap: 12px }`). A sinistra c'è l'anello compliance da 86px, a destra l'elenco dei corsi.

**Dove va il tempo**: il corpo `.pa__tempo-body` è una griglia `minmax(0, 1.1fr) minmax(0, 1fr)` con `align-items: center`, gap 10px e `flex: 1`. A sinistra la ciambella, a destra l'elenco delle voci.

Nessuna modale e nessun popover propri della pagina. Gli unici overlay sono le tooltip e il pannello «Legenda» del kit.

## 4. Elementi e testi

### 4.1 Header (`BiPage` → `PageHead`)

- Titolo: «Profile analysis».
- Sottotitolo: «La scheda analitica del dipendente: carriera, retribuzione, presenze, competenze e premio».
- Azioni a destra: timbro dati `BiDataStamp`, così composto:
  - pulsante circolare `fa-solid fa-arrows-rotate` con `aria-label` «Aggiorna i dati»;
  - testo «Dati BI»;
  - data e ora `gg/mm/aaaa hh:mm` dell'ultimo calcolo.
- Glossario (rail Legenda), in quest'ordine:

| Acronimo | Descrizione | Modalità di calcolo |
|---|---|---|
| «RAL» | «Retribuzione annua lorda» | «Somma delle mensilità lorde dell’anno (tredicesima e quattordicesima comprese), prima di tasse e contributi a carico del dipendente» |
| «CCNL» | «Contratto collettivo nazionale di lavoro» | «Per il turismo fissa livelli, minimi retributivi, scatti di anzianità e orario: il livello del dipendente ne determina la paga base» |
| «Assenteismo» | «Peso delle assenze non programmate» | «Ore di assenza non programmata (malattia, permessi non pianificati) diviso le ore lavorabili» |
| «Straordinari» | «Ore lavorate oltre l’orario del contratto» | «Ore registrate in presenza oltre quelle contrattuali; la quota si calcola sulle ore da contratto del periodo» |
| «Premio di risultato» | «Bonus legato agli obiettivi» | «Raggiungimento ponderato degli obiettivi (risultato, soddisfazione ospiti, presenza) applicato al premio massimo; sotto il 50% non matura» |
| «Compliance» | «Formazione obbligatoria in regola» | «Corsi obbligatori validi o in scadenza diviso i corsi richiesti dal ruolo (sicurezza, antincendio, primo soccorso, privacy e specifici di reparto)» |

### 4.2 Toolbar

| Controllo | Props | Opzioni / testo |
|---|---|---|
| `SelectField` `name="dipendente"` label «Dipendente», classi `pa__filter pa__filter--wide` (260px) | `value = dipId` | una voce per dipendente di `DIPENDENTI_HR`, nell'ordine dell'array: «`Nome Cognome · Reparto`», per esempio «Andrea Grimaudo · Front office» |
| `SelectField` `name="anno"` label «Anno», classe `pa__filter` (120px) | `value = anno` | anno corrente, anno −1, anno −2 (oggi «2026», «2025», «2024») |
| Nota `.pa__note` (allineata a destra con `margin-left: auto`) | — | icona `fa-solid fa-scale-balanced` e testo «Confronto con i {N} colleghi di {Reparto}». N = numero di dipendenti del reparto, **compreso il dipendente stesso**: per Front office «Confronto con i 3 colleghi di Front office» |

### 4.3 Colonna profilo

**Navigazione (hero)**:

- Pulsante sinistro `fa-solid fa-chevron-left`, con `aria-label` e Tooltip «Dipendente precedente».
- Al centro «{posizione} di {totale}», per esempio «1 di 12».
- Pulsante destro `fa-solid fa-chevron-right`, con `aria-label` e Tooltip «Dipendente successivo».
- La navigazione è circolare: dal 12 si torna all'1 e viceversa.

**Avatar**: iniziali del nome e del cognome (es. «AG») in un cerchio. L'anello attorno è l'**anzianità**: un giro intero corrisponde a 10 anni. `--anz = min(100, anzianitaMesi / 120 × 100)%`.

**Nome** (`h2.pa__name`): «Nome Cognome», in `TruncatedText`.

**Ruolo** (`p.pa__role`): il ruolo dell'ultimo anno di carriera, per esempio «Capo ricevimento», in `TruncatedText`.

**Chip**: reparto, per esempio «Front office», e livello, per esempio «4° livello». Il chip del livello è giallo (`.pa__chip--lv`).

**Facts** (`dl`): ogni riga è `dt` con icona più etichetta e `dd` con il valore.

| Icona | Etichetta | Valore |
|---|---|---|
| `fa-solid fa-file-signature` | «Contratto» | tipologia (`TruncatedText`): «Tempo indeterminato» · «Tempo determinato» · «Apprendistato» · «Stagionale» |
| `fa-solid fa-clock` | «Orario» | se `orarioPct ≥ 1`: «Tempo pieno · 40 h»; altrimenti «Part-time {pct}% · {ore} h», con pct = `fmtPct(orarioPct×100, 0)` e ore = `round(40 × orarioPct)`. Esempio: «Part-time 60% · 24 h» |
| `fa-solid fa-calendar-check` | «In azienda» | anzianità `fmtAnzianita`: «8 anni e 4 mesi», «1 anno», «5 mesi», «1 mese». Tooltip: «Assunzione del gg/mm/aaaa» |
| `fa-solid fa-cake-candles` | «Età» | «{eta} anni» |
| `fa-solid fa-building-columns` | «Costo azienda» | `fmtEurK(RAL × 1,36)`, per esempio «38,2k €». Tooltip: «RAL più contributi, TFR e oneri a carico dell'azienda (circa +36%)» |
| `fa-solid fa-users` | «Vs reparto» | `DeltaBadge` `size="sm"` con `value = vsReparto` e label «{fmtDelta(vsReparto)} RAL», per esempio «+4,2% RAL». Verde se positivo, rosso se negativo, grigio se zero |

**Insight**:

- Titolo «La lettura di Sibylla», con icona `fa-solid fa-wand-magic-sparkles`.
- Elenco: fino a 4 voci (vedi §6.6). Ogni voce ha un'icona a pastiglia e un testo.
- Se non ci sono voci compare una sola voce «Nessun punto di attenzione», con icona `fa-solid fa-circle-check` e tono good.

**Links** (`sib-btn sib-btn--secondary pa__link`, contenuto centrato):

- «Turni», con icona `fa-solid fa-calendar-week`;
- «Ferie», con icona `fa-solid fa-umbrella-beach`.

### 4.4 Fascia KPI (4 × `KpiTile`)

Ordine, label, icona, slot colore, valore, delta, sparkline, info:

1. **«RAL»**
   - Icona `fa-sack-dollar`, slot 0 (`--chart-1`).
   - Valore: RAL dell'ultimo anno di carriera, formattata `eur(round(n/10)×10)`, per esempio «32.450 €».
   - Delta: `ralDelta` = variazione % sull'anno prima. Label «{fmtDelta} vs {anno−1}», per esempio «+3,1% vs 2025». Assente se non c'è l'anno prima.
   - Spark: RAL per anno (gli anni di carriera mostrati, al massimo 8).
   - Info: «Retribuzione annua lorda dell'anno selezionato, confrontata con quella dell'anno prima. La linea è l'andamento della RAL negli anni.»
2. **«Ore lavorate»**
   - Icona `fa-briefcase`, slot 4 (`--chart-5`).
   - Valore: ordinarie + straordinari dei mesi dell'anno, in `fmtOre`, per esempio «1.512 h».
   - Delta: % sullo stesso periodo dell'anno prima. Label «{fmtDelta} LY». Assente se l'anno prima vale 0.
   - Spark: ore per mese.
   - Info: «Ore ordinarie più straordinari, {mesiLabel}, confrontate con lo stesso periodo dell'anno prima.»
3. **«Assenteismo»**
   - Icona `fa-heart-pulse`, slot 5 (`--chart-6`).
   - Valore: `fmtPct(n)` con 1 decimale, per esempio «1,8%».
   - Delta: differenza in punti, con `invertDelta` (salire è peggio). Label «{fmtDelta(diff, ' pt')} LY», per esempio «+0,3 pt LY».
   - Spark: % di malattia per mese.
   - Info: «Ore di malattia diviso le ore da contratto. Ferie e ROL non contano: sono assenze programmate.»
4. **«Straordinari»**
   - Icona `fa-business-time`, slot 1 (`--chart-2`).
   - Valore: ore `fmtOre`.
   - Delta: % sull'anno prima, con `invertDelta`. Label «{fmtDelta} LY».
   - Spark: straordinari per mese.
   - Info: «Ore oltre l'orario del contratto: {fmtPct(quotaStrao)} delle ore contrattuali. In hotel si concentrano in alta stagione.»

`mesiLabel` vale «{anno}» se i mesi sono 12, altrimenti «gen-{ultimo mese in minuscolo} {anno}». Per l'anno corrente a novembre: «gen-nov 2026».

### 4.5 Card «Carriera e retribuzione» (`.pa__main`, index 0)

Rail con `BiVerticalTabs`: «Carriera», «Presenze», «Cedolini». Le etichette sono ruotate e rese in MAIUSCOLO via CSS.

| Vista | Titolo | Sottotitolo | Badge | Legenda | Piede |
|---|---|---|---|---|---|
| carriera | «Carriera e retribuzione» | «RAL per anno contro la media del reparto, con il livello del CCNL» | «{fmtDelta(crescitaCarriera, '%', 0)} dall'ingresso», per esempio «+46% dall'ingresso» | RAL (`--chart-1`) · Media reparto (`--chart-ly`) · Livello (`--chart-2`) | «{n} passaggi di livello» oppure «1 passaggio di livello» oppure «Nessun passaggio di livello», seguito da « negli anni mostrati · oggi {LIVELLO} come {ruolo in minuscolo}.» Esempio: «2 passaggi di livello negli anni mostrati · oggi 4° livello come capo ricevimento.» |
| presenze | «Presenze mese per mese · {anno}» | «Come si compongono le ore di ogni mese rispetto al contratto» | `fmtOre(lavorate)`, per esempio «1.512 h» | Ordinarie (`--chart-1`) · Straordinari (`--chart-2`) · Ferie (`--chart-5`) · ROL (`--chart-4`) · Malattia (`--chart-6`) | «Ore da contratto {fmtOre(somma contratto)} · ferie godute {round(ferieGiorni)} giorni su {round(ferieMaturate)} maturati.» |
| cedolini | «Cedolini · {anno}» | «Lordo e netto in busta: a giugno la quattordicesima, a dicembre la tredicesima» | «{fmtEurK(lordoTot)} lordi», per esempio «31,9k € lordi» | Lordo (`--chart-1`) · Netto (`--chart-5`) | «Netto in busta {eur(nettoTot)} su {eur(lordoTot)} lordi ({mesiLabel}): il {fmtPct(netto/lordo×100, 0)} arriva al dipendente.» |

Configurazione esatta dei grafici (recharts; `ResponsiveContainer` 100%×100% dentro `.pa__chart`, che è `flex: 1; min-height: 0; min-width: 0`):

**Carriera**, `ComposedChart`:

- Contenitore: `data = carriera` (al massimo gli ultimi 8 anni), `margin {top 18, right 4, left −4, bottom 0}`, `barCategoryGap="24%"`.
- `defs`: `linearGradient#pa-ral` verticale (x1 0, y1 0, x2 0, y2 1), stop 0% `--chart-1` opacità 1, stop 100% `--chart-1` opacità 0,55.
- Griglia: `CartesianGrid` con `gridProps`.
- Asse X: `XAxis dataKey="label"` (anno) con `xAxisProps` e `interval={0}`.
- Asse Y `ral` (sinistra): `yAxisProps`, `tickFormatter = fmtAxisNum` («32k»), `width 44`.
- Asse Y `liv` (destra): `orientation="right"`, `yAxisProps`, `width 28`, `domain [0, 8]`, `ticks [2, 4, 6, 8]`, `tickFormatter = livelloBreve`. Mappa dei tick: 2→«6°», 4→«4°», 6→«2°», 8→«Q».
- Tooltip: `cursor={{ fill: 'transparent' }}`, `ChartTooltip` con `names {ral: 'RAL', mediaReparto: 'Media reparto', livello: 'Livello'}`. Formato: per `livello` → nome del livello («4° livello»), altrimenti `eur` («32.450 €»).
- `Bar` `yAxisId ral`, `dataKey ral`:
  - `fill url(#pa-ral)`, `radius [5,5,0,0]`, `maxBarSize 46`;
  - animazione: `ANIM.duration` 900ms, easing `ease-out`;
  - `LabelList` con `barTopLabel(fmtEurK)`: testo sopra la barra, «32,5k €».
- `Line` `yAxisId ral`, `type monotone`, `dataKey mediaReparto`:
  - `stroke --chart-ly`, `strokeWidth 2`, `strokeDasharray "5 4"`;
  - `dot false`, `connectNulls`;
  - animazione: `animationBegin 90ms`, durata 900ms.
- `Line` `yAxisId liv`, `type stepAfter`, `dataKey livello`:
  - `stroke --chart-2`, `strokeWidth 2.4`;
  - `dot {r 3, strokeWidth 0, fill --chart-2}`;
  - `activeDot {r 5, strokeWidth 2, stroke --chart-surface}`;
  - animazione: `animationBegin 180ms`, durata 900ms.

**Presenze**, `ComposedChart`:

- Contenitore: `data = mesi`, `margin {6, 6, 0, −10}` (top, right, bottom, left), `barCategoryGap="22%"`.
- Asse X: `XAxis label` (mese «Gen»…) con `interval 0`.
- Asse Y: `tickFormatter fmtAxisNum`, `width 40`.
- Tooltip: `ChartTooltip` con `names` = {ordinarie «Ore ordinarie», straordinari «Straordinari», ferie «Ferie», rol «ROL e permessi», malattia «Malattia», formazione «Formazione», contratto «Ore da contratto»}. Formato `fmtOre` («142 h»).
- 5 `Bar` impilate, `stackId "ore"`, `maxBarSize 30`, nell'ordine dal basso:
  - ordinarie → `--chart-1`;
  - straordinari → `--chart-2`;
  - ferie → `--chart-5`;
  - rol → `--chart-4`;
  - malattia → `--chart-6`, con `radius [4,4,0,0]`, unica barra arrotondata.
- Animazione delle barre: `animationBegin = i × 90ms` (0, 90, 180, 270, 360), durata 900ms, `ease-out`.
- `Line` `type stepAfter`, `dataKey contratto`: `stroke --chart-ink`, `strokeWidth 1.4`, `strokeDasharray "4 4"`, `dot false`, **senza animazione**. Rappresenta l'orario contrattuale: dove le barre lo superano, sono straordinari.
- La formazione non è fra le barre: compare solo nella tooltip se presente nel payload. Di fatto non compare, perché la tooltip mostra le sole serie disegnate.

**Cedolini**, `BarChart`:

- Contenitore: `data = mesi`, `margin {6, 6, 0, −6}`, `barCategoryGap "20%"`, `barGap 2`.
- Asse Y: `fmtAxisNum`, `width 44`.
- Tooltip: `names {lordo 'Lordo', netto 'Netto'}`, formato `eur`.
- `Bar lordo`: `--chart-1`, `radius [3,3,0,0]`, `maxBarSize 18`, durata 900ms.
- `Bar netto`: `--chart-5`, stessi parametri, `animationBegin 90ms`.

Ogni vista ha `key` = `car-{dip}-{anno}` / `pres-…` / `ced-…`: al cambio di dipendente, di anno o di vista il grafico si rimonta e rifà l'animazione d'ingresso.

### 4.6 Card «Premio di risultato» (`.pa__bonus`, index 1)

- Titolo: «Premio di risultato».
- Sottotitolo:
  - se il premio viene da un obiettivo assegnato: «Obiettivo "{nome obiettivo}"», con virgolette dritte `"`, per esempio «Obiettivo "Upselling reception"»;
  - altrimenti: «Stima sugli obiettivi di reparto {anno}».
- Badge: `fmtPct(pct, 0)`, per esempio «78%».
- Azione, solo con fonte obiettivo: pulsante icona `.pa__icobtn` con `fa-solid fa-arrow-up-right-from-square`, `aria-label` e Tooltip «Apri il monitoraggio degli obiettivi», → `monitoraggio-perf`.
- **Tachimetro** (componente interno, SVG `viewBox="0 0 200 112"`, `role="img"`, `aria-label` «Obiettivi raggiunti al {round(pct)}%»):
  - `defs`: `linearGradient#pa-tach` orizzontale, stop 0% `--chart-6`, 50% `--chart-4`, 100% `--chart-good`.
  - Traccia: `path d="M 20 100 A 80 80 0 0 1 180 100"` con `pathLength=100`, classe `.pa__tach-track`.
  - Valore: stesso path, `stroke=url(#pa-tach)`, classe `.pa__tach-val`, `stroke-dasharray: calc(var(--g) * 1px) 100px`, dove `--g` = valore 0–100.
  - Soglia del 50%: `line x1 100 y1 20 x2 100 y2 30`, classe `.pa__tach-soglia`.
  - Lancetta: `g.pa__tach-needle` con `line 100,100 → 100,34` e `circle cx 100 cy 100 r 6`. È ruotata di `--ang = (valore × 1,8 − 90)deg`.
  - Tick: «0» in (18,111), «50» in (100,15) in grassetto (`--mid`), «100» in (182,111).
  - Sotto il grafico (`.pa__tach-fig`):
    - valore `eur(maturato)`, per esempio «1.200 €», con Tooltip «Premio maturato su un massimo di {eur(massimo)}»;
    - riga «maturati su {eur(massimo)}».
- **Driver** (`ul.pa__drivers`), 3 righe. Ogni riga è una griglia `minmax(0,1.25fr) minmax(40px,1fr) 34px`:
  - etichetta «{nome} · {peso}%» (`TruncatedText`), per esempio «Vendite · 60%»;
  - barra, con riempimento `--w = min(100, pct)%`; rosso (`--low`) se `pct < 50`;
  - percentuale `fmtPct(pct, 0)`.
  - Driver con fonte obiettivo: «Vendite» 60 · «Soddisfazione ospiti» 25 · «Presenza» 15.
  - Driver con fonte stima: «Risultato di reparto» 50 · «Soddisfazione ospiti» 30 · «Presenza» 20.

### 4.7 Card «Dove va il tempo» (`.pa__tempo`, index 2)

- Titolo «Dove va il tempo», sottotitolo «Ore dell'anno per voce · {mesiLabel}». Né badge né legenda: la legenda è l'elenco a destra.
- **Ciambella** (`PieChart` → `Pie`):
  - `data = tempo` (6 voci), `dataKey ore`, `nameKey label`;
  - `innerRadius "62%"`, `outerRadius "92%"`, `paddingAngle 2`, `cornerRadius 3`;
  - `stroke --chart-surface`, `strokeWidth 2`;
  - `startAngle 90`, `endAngle −270`: parte dall'alto e va in senso orario;
  - durata 900ms, `ease-out`;
  - `Cell` i-esima con `fill = series(i)`: `--chart-1` … `--chart-6`, e `fillOpacity` 1 se nessuna fetta è attiva o se è quella attiva, altrimenti 0,25.
  - Nessuna tooltip recharts.
- **Centro** (`aria-live="polite"`):
  - di default: `fmtPct(lavorate / totTempo × 100, 0)` e sotto «al lavoro»;
  - con una fetta attiva: `fmtPct(ore voce / totTempo × 100, 1)` e sotto il nome della voce.
- **Elenco voci** (`ul.pa__tempo-list`). Ogni riga ha un quadratino di colore, l'etichetta (`TruncatedText`) e le ore (`fmtOre`). Voci nell'ordine:
  1. «Ore ordinarie»
  2. «Straordinari»
  3. «Ferie»
  4. «ROL e permessi»
  5. «Malattia»
  6. «Formazione»

### 4.8 Card «Competenze» (`.pa__comp`, index 3)

- Titolo «Competenze», sottotitolo «Valutazione del responsabile contro la media del reparto».
- Badge «{round(media)}/100», per esempio «71/100».
- Piede:
  - se la competenza più debole è sotto la media: «Da sviluppare: {competenza in minuscolo} ({dip} contro {reparto} del reparto).»;
  - altrimenti: «Sopra la media del reparto in tutte le competenze.»
- Legenda propria sopra il radar (`.pa__radar-leg`, `aria-hidden`):
  - «{Nome di battesimo}», con linea piena `--chart-1`;
  - «Media reparto», con linea tratteggiata `--chart-ly`.
- **Radar** (`RadarChart`, `data = competenze`, 6 assi):
  - contenitore: `outerRadius "74%"`, `margin {top 10, right 26, bottom 10, left 26}`;
  - griglia: `PolarGrid stroke --chart-grid`;
  - asse angolare: `PolarAngleAxis dataKey nome` con tick personalizzato `EtichettaRadar` (§10);
  - asse radiale: `PolarRadiusAxis domain [0,100]`, `tick false`, `axisLine false`;
  - Tooltip: `ChartTooltip` con `names {dip: nome di battesimo, reparto: 'Media reparto'}`, formato «{n}/100»;
  - `Radar reparto`: `stroke --chart-ly`, `strokeWidth 1.6`, `strokeDasharray "4 3"`, `fill transparent`, durata 900ms;
  - `Radar dip`: `stroke --chart-1`, `strokeWidth 2.2`, `fill --chart-1`, `fillOpacity 0.22`, `dot {r 2.5, fill --chart-1, strokeWidth 0}`, `animationBegin 90ms`, durata 900ms.

### 4.9 Card «Formazione obbligatoria» (`.pa__form`, index 4)

- Titolo «Formazione obbligatoria», sottotitolo «Corsi richiesti dal ruolo, dalla scadenza più vicina».
- Badge «{inRegola}/{totale} in regola», per esempio «4/5 in regola».
- **Anello compliance** (`.pa__comp-ring`): `fmtPct(compliance, 0)` (es. «80%») e sotto «compliance».
- **Elenco corsi**, ordinati per giorni alla scadenza crescenti, quindi prima gli scaduti. Ogni riga ha:
  - un'icona: `fa-circle-check` se valido, `fa-hourglass-half` se in scadenza, `fa-circle-exclamation` se scaduto;
  - il nome del corso (`TruncatedText`);
  - la scadenza, con Tooltip «Fatto il gg/mm/aaaa · scade il gg/mm/aaaa». Il testo dipende dallo stato:
    - scaduto: «scaduto da {n} gg»;
    - in scadenza: «fra {n} gg»;
    - valido: la data di scadenza «gg/mm/aaaa».

## 5. Stati e interazioni

- **Stato iniziale**:
  - dipendente: l'id della route se valido, altrimenti 1;
  - anno: quello corrente;
  - vista: «Carriera»;
  - nessuna fetta attiva.
- **Cambio dipendente**, con la select o le frecce ‹ ›:
  - si ricalcola tutto;
  - la colonna profilo (`key prof-{id}`), la fascia KPI (`key kpi-{id}-{anno}`), i grafici e il tachimetro si rimontano e rifanno l'animazione d'ingresso;
  - i numeri KPI ripartono da 0;
  - la fetta attiva si azzera.
- **Le frecce ‹ ›** spostano nell'ordine di `DIPENDENTI_HR` (id 1…12), in modo circolare. Non cambiano l'URL: la route resta quella d'ingresso.
- **Cambio anno**:
  - ricalcola carriera (fino a quell'anno), mesi, competenze e premio;
  - per un anno passato i mesi sono 12, per l'anno corrente fino al mese corrente compreso;
  - se il dipendente non era ancora assunto in quell'anno i mesi sono vuoti: grafici vuoti, KPI a 0;
  - i corsi restano calcolati su oggi, indipendentemente dall'anno.
- **Tab verticali** «Carriera / Presenze / Cedolini»: cambiano titolo, sottotitolo, badge, legenda, piede e grafico della card principale. Il tab attivo è pieno blu.
- **Hover sulla ciambella o su una riga dell'elenco tempo**:
  - la voce diventa attiva: le altre fette scendono a opacità 0,25 e le altre righe a 0,4;
  - il centro mostra la quota con 1 decimale e il nome;
  - all'uscita dal mouse torna lo stato di default.
- **Hover sulle barre e sui punti dei grafici**: tooltip scura standard (appendice A.5).
- **Hover su una KPI**: il bordo prende il colore dello slot e compaiono «min …» e «max …» sotto la riga di posizione.
- **Ricarica** (pulsante ⟳ del timbro): rifà il calcolo con `new Date()`. Il timbro mostra l'ora nuova, i dati ricalcolati sono identici perché deterministici e le animazioni non si ripetono. Non c'è stato di caricamento.
- **Pulsanti** «Turni» e «Ferie», e icona del Premio: navigano (§2).
- **Legenda** (rail destro): clic sulla linguetta apre o chiude il pannello. Si chiude anche con Esc, clic fuori o X (appendice A.7).
- **Stati vuoti**:
  - nessuna voce di insight: «Nessun punto di attenzione»;
  - nessun passaggio di livello: piede «Nessun passaggio di livello…».
  - Non ci sono altri stati vuoti, di caricamento o d'errore: i dati sono sempre calcolati localmente.
- Nessuna conferma, nessun toast, nessuna scrittura di dati.

## 6. Dati e regole di business

Tutto è generato in `profileMock.ts`. È deterministico: stesso dipendente e stesso anno danno gli stessi numeri a ogni apertura, nessun `Math.random`. Ci sono due eccezioni che leggono dati reali degli store:

- le **assenze**: le richieste `Approvata` di `useHrGestioneStore.richieste` (chiave `localStorage` `sibylla.hr-gestione`, persist v8);
- il **premio**: l'obiettivo individuale di `useObiettiviStore.obiettivi` (chiave `sibylla.obiettivi`, persist v2).

La pagina non persiste nulla di proprio.

### 6.1 Personale di partenza

`DIPENDENTI_HR`, 12 dipendenti. Dettaglio in `01-modello-dati-e-api.md`.

| id | Nome | Reparto | ferieAnnue | rolAnnui |
|---|---|---|---|---|
| 1 | Andrea Grimaudo | Front office | 26 | 72 |
| 2 | Giulia Conti | Front office | 26 | 72 |
| 3 | Marco Esposito | Cucina | 26 | 72 |
| 4 | Sara Romano | Housekeeping | 22 | 43 |
| 5 | Davide Marini | Front office | 26 | 58 |
| 6 | Sergio Benvenuti | Manutenzione | 26 | 72 |
| 7 | Manuel Fantoni | Manutenzione | 22 | 29 |
| 8 | Oscar Pettinari | Housekeeping | 22 | 72 |
| 9 | Luca Hambelli | Amministrazione | 26 | 72 |
| 10 | Elena Bianchi | F&B | 26 | 72 |
| 11 | Chiara Ferri | F&B | 22 | 22 |
| 12 | Paolo Greco | Cucina | 26 | 72 |

Costanti: `ORE_GIORNO = 8`, `ORE_MESE = 173`. `giorniLavorativi(dal, al)` conta i giorni da lunedì a sabato compresi nell'intervallo (la domenica no). `oreRichiesta(r) = r.ore ?? max(1, giorniLavorativi) × 8`.

### 6.2 Generatore pseudo-casuale

Per avere numeri identici va riprodotto **esattamente** (mulberry32):

```ts
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const r1 = (n) => Math.round(n * 10) / 10
```

Ogni funzione crea il proprio generatore con un seme e consuma i valori **nell'ordine indicato**: l'ordine delle chiamate `r()` fa parte della specifica.

### 6.3 Tabelle di dominio

- `LIVELLI` (indice 0 = livello 1, il più basso): «7° livello», «6° livello», «5° livello», «4° livello», «3° livello», «2° livello», «1° livello», «Quadro».
- `livelloBreve(n)`: «Q» se `n ≥ 8`, altrimenti `{8−n}°`.
- `RAL_LIVELLO` (migliaia di €, tempo pieno): `[19.6, 21.0, 22.6, 24.6, 27.2, 31.0, 37.0, 46.0]`.
- `MESI_BREVI`: Gen Feb Mar Apr Mag Giu Lug Ago Set Ott Nov Dic.
- `TIPOLOGIA` per id: 7 → «Tempo determinato», 8 → «Stagionale», 11 → «Apprendistato». Tutti gli altri «Tempo indeterminato».
- Nomi femminili (sesso F): Giulia, Sara, Elena, Chiara.
- Corsi comuni a tutti i reparti (validità in anni): «Sicurezza generale» 5, «Antincendio» 5, «Primo soccorso» 3, «Privacy e GDPR» 2.
- Profili di reparto (ruoli per fascia di livello, competenze, corsi aggiuntivi, livello massimo):

| Reparto | Ruoli (liv. ≤3 · ≤5 · oltre) | Competenze (6, in ordine) | Corsi aggiuntivi | livMax |
|---|---|---|---|---|
| Front office | Addetto ricevimento · Capo ricevimento · Front office manager | Accoglienza, Lingue straniere, Upselling, Problem solving, Uso del PMS, Lavoro in squadra | Antiriciclaggio e pagamenti (3) | 7 |
| F&B | Cameriere di sala · Chef de rang · Maître | Servizio al tavolo, Conoscenza vini, Upselling, Velocità, Cura del cliente, Lavoro in squadra | HACCP (2) | 6 |
| Cucina | Commis di cucina · Chef de partie · Sous chef | Tecnica, Igiene e HACCP, Velocità, Food cost, Creatività, Lavoro in squadra | HACCP (2), Allergeni (3) | 7 |
| Housekeeping | Cameriera ai piani · Governante di piano · Governante generale | Standard di pulizia, Velocità, Cura dei dettagli, Uso dei prodotti, Puntualità, Lavoro in squadra | Rischio chimico (3) | 6 |
| Manutenzione | Manutentore · Tecnico specializzato · Capo manutenzione | Impianti elettrici, Idraulica, Tempestività, Prevenzione, Sicurezza, Lavoro in squadra | Lavori elettrici (PES/PAV) (5), Lavori in quota (5) | 6 |
| Amministrazione | Impiegato amministrativo · Contabile · Responsabile amministrativo | Contabilità, Precisione, Gestionali, Rispetto scadenze, Analisi dei dati, Lavoro in squadra | Videoterminali (5) | 8 |

### 6.4 Formule di generazione

**Orario**: `orarioPct = min(1, round((rolAnnui / 72) × 20) / 20)`. È il part-time dedotto dal monte ROL a passi del 5%. Esempi: 43 ROL → 0,6; 58 → 0,8; 29 → 0,4; 22 → 0,3.

**Anagrafica**, con `r = rng(id × 7919)` e quest'ordine di estrazione:

- `annoAss = 2013 + ((id × 3) % 11)`;
- `meseAss = 1 + floor(r()×12)`;
- `annoNascita = annoAss − 22 − floor(r()×18)`;
- `giornoNascita = 1 + floor(r()×27)`;
- `meseNascita = 1 + floor(r()×12)`;
- `assunzione = annoAss-meseAss-01`;
- `eta` = anni compiuti a oggi;
- `anzianitaMesi = max(0, (annoOggi − annoAss)×12 + (meseOggi(1-12) − meseAss))`;
- `iniziali` = prima lettera del nome + prima lettera del cognome;
- ruolo e livello = quelli dell'ultimo anno di carriera.

**Carriera base**, con `r = rng(id × 104729)`, per ogni anno da `annoAss` all'anno richiesto:

- `stagionale = TIPOLOGIA[id] === 'Stagionale'`;
- `quota = orarioPct × (stagionale ? 7/12 : 1)`;
- livello iniziale `1 + (id % 3)`;
- prima promozione nell'anno `prossima = annoAss + 2 + floor(r()×2)`;
- evento «Assunzione» nel primo anno;
- se `anno ≥ prossima` e `livello < livMax`: `livello++`, `prossima = anno + 2 + floor(r()×3)`, evento «Passaggio al {LIVELLI[livello−1]}»;
- `ccnl = anno ≥ 2024 ? 1.03 : 1`;
- `merito = 1 + r()×0.025`: va estratto **dopo** l'eventuale promozione;
- `RAL = round(RAL_LIVELLO[liv−1]×1000 × (1 + anni×0.012) × ccnl × merito × quota / 50) × 50`, con `anni = anno − annoAss`;
- se non c'è altro evento e `anno === 2024`, evento «Rinnovo del CCNL»;
- ruolo = `ruoli[liv ≤ 3 ? 0 : liv ≤ 5 ? 1 : 2]`.

**Media del reparto** per anno: è la media delle RAL dei colleghi dello stesso reparto **più la propria**, considerando solo i colleghi presenti in quell'anno, arrotondata a 50 €. Vale `null` se nessun collega era presente. La card mostra al massimo gli ultimi 8 anni (`slice(−8)`).

**Ore del mese**, con `r = rng(id × 31337 + anno × 17)` e `stabile = rng(id × 15485863)()`:

- Pesi mensili:
  - `PESO_FERIE = [3, 2, .6, .5, .3, .2, .1, .1, .3, .8, 2.5, 1.6]`;
  - `PESO_STRAO = [.2, .2, .5, .9, 1.2, 1.8, 2.4, 2.6, 1.6, .8, .3, .6]`;
  - `PESO_MAL = [2, 1.8, 1.2, .8, .5, .4, .4, .3, .5, .9, 1.4, 1.8]`.
- Mesi attivi: tutti, oppure per gli stagionali solo da aprile a ottobre (indici 3–9).
- Totali annui:
  - `totFerie = ferieAnnue × 8 × pct × (stag ? 7/12 : 1) × (0.78 + r()×0.22)`;
  - `totStrao = (60 + stabile×120) × (0.85 + r()×0.3) × pct`;
  - `totRol = rolAnnui × (0.55 + r()×0.4)`.
- Malattia: `episodi = floor(r()×3.6)`, quindi da 0 a 3. Per ciascun episodio:
  - si estrae un mese pesato con `PESO_MAL`;
  - se il mese è attivo, si aggiungono `(1 + floor(r()×5)) × 8 × pct` ore.
- Mesi di formazione: due estrazioni `floor(r()×12)`.
- Le richieste reali **approvate** del dipendente nell'anno, raggruppate per il mese della data d'inizio:
  - Ferie e Malattia → `max(1, giorniLavorativi) × 8 × pct` ore;
  - gli altri tipi (ROL, permessi) → `oreRichiesta`, nella categoria `rol`.
  - Dove ci sono, **sostituiscono** il valore generato.
- Per ogni mese fino a `fino` (12, oppure il mese corrente compreso per l'anno corrente):
  - un mese non attivo ha tutti i valori a 0;
  - `contratto = round(173 × pct)`;
  - `ferie = reale ?? totFerie × PESO_FERIE[m] / ΣPESO_FERIE(attivi)`;
  - `rol = reale ?? (totRol / nAttivi) × (0.4 + r()×1.2)`;
  - `malattia = reale ?? malattiaMese[m]`;
  - `formazione = m ∈ mesiFormazione ? 4 + floor(r()×3)×4 : 0`;
  - `assenze = min(contratto, ferie + rol + malattia + formazione)`;
  - `straordinari = totStrao × PESO_STRAO[m] / ΣPESO_STRAO(attivi) × (0.7 + r()×0.6)`;
  - `mensile = RAL / (stag ? 7 : 14)`;
  - `extra = mensile` a giugno e a dicembre (non per gli stagionali), cioè quattordicesima e tredicesima;
  - `lordo = round(mensile + extra + straordinari × (RAL/14/173/max(pct, 0.5)) × 1.25)`;
  - `netto = round(lordo × 0.735)`;
  - `ordinarie = r1(contratto − assenze)`; gli altri valori orari sono arrotondati con `r1`.
- L'anno precedente (`mesiLy`) usa lo stesso numero di mesi `fino` dell'anno selezionato, così il confronto è sullo stesso periodo.

**Competenze**: `punteggi(d, anno)` con `r = rng(id × 2654435 + anno)`. Per ogni competenza: `round(min(98, 48 + r()×34 + min(anni, 10)×1.6))`, con `anni = max(0, anno − annoAss)`. La media del reparto per competenza si calcola su tutti i dipendenti del reparto, lui compreso, arrotondata.

**Corsi**, con `r = rng(id × 486187)`, per ogni corso del reparto:

- `mesiFa = 2 + floor(r()×(anni×12 + 2))`;
- `fatto = data(annoOggi, meseOggi − mesiFa, 1 + floor(r()×27))`;
- `scade = fatto + anni`;
- `giorni = round((scade − oggi)/86400000)`;
- stato: «scaduto» se `giorni < 0`, «scadenza» se `≤ 90`, altrimenti «valido»;
- ordinamento per `giorni` crescente.

**Premio di risultato**:

- `presenza = round(clamp(100 − assenteismo×12, 0, 100))`.
- **Fonte obiettivo**: esiste in `useObiettiviStore` un obiettivo con `tipologia === 'individuale'`, `assegnatario === 'Nome Cognome'` e `stato !== 'bozza'`. Nei dati seed vale solo per Andrea Grimaudo, con l'obiettivo «Upselling reception».
  - Driver: Vendite = `avanzamentoPct(ob)`, peso 60; Soddisfazione ospiti = `round(70 + rng(id×9176+anno)()×25)`, peso 25; Presenza, peso 15.
  - `massimo = premioTotale(ob)`, `maturato = premioSbloccato(ob)`.
  - `chiusura` = la data `al` dell'ultimo sottoperiodo.
- **Fonte stima**, con `r = rng(id × 7727 + anno)`:
  - Driver: Risultato di reparto `round(55 + r()×45)`, peso 50; Soddisfazione ospiti `round(60 + r()×38)`, peso 30; Presenza, peso 20.
  - `massimo = round(RAL × 0.07 / 50) × 50`.
  - `maturato = pct < 50 ? 0 : round(massimo × pct / 100 / 10) × 10`.
  - Nome «Premio di risultato {anno}», chiusura `{anno}-12-31`.
- In entrambi i casi `pct = round(Σ(driver.pct × peso) / 100)`.

### 6.5 Indicatori derivati (`computeProfilo`)

Indicatori principali:

- `lavorate = Σ ordinarie + Σ straordinari`, e lo stesso per l'anno prima;
- `assenteismo = Σ malattia / Σ contratto × 100`, e lo stesso per l'anno prima;
- `quotaStrao = straordinari / contratto × 100`.

Ferie:

- `ferieGiorni = Σ ferie(ore) / 8 / max(orarioPct, 0.1)`;
- `ferieMaturate = ferieAnnue × (mesi / 12)`.

RAL e carriera:

- `ralDelta = (RAL ultimo − RAL penultimo) / penultimo × 100`; non definito se manca il penultimo;
- `vsReparto = (RAL − mediaReparto) / mediaReparto × 100`; vale 0 se la media è nulla;
- `crescitaCarriera = (RAL ultimo − RAL primo anno mostrato) / RAL primo × 100`.

Formazione:

- `compliance = corsi non scaduti / corsi × 100`; vale 100 se non ci sono corsi;
- `inRegola` = numero di corsi non scaduti.

Tempo, competenze e costi:

- `tempo` = 6 voci (ordinarie, straordinari, ferie, rol, malattia, formazione) in ore;
- `totTempo` = somma delle 6 voci, oppure 1 se la somma è zero;
- `forte` = competenza con il massimo di (dip − reparto);
- `debole` = competenza con il minimo di (dip − reparto);
- `costoAzienda = RAL × 1.36`.

Sparkline:

- RAL per anno;
- ore per mese (ordinarie + straordinari);
- straordinari per mese;
- assenteismo per mese (malattia / contratto × 100, oppure 0).

### 6.6 «La lettura di Sibylla»: regole

Le regole si valutano in quest'ordine e si tengono **le prime 4**. `fmtP` = numero it-IT con al massimo 1 decimale, seguito da «%».

1. Se `|vsReparto| ≥ 3`:
   - positivo → good, icona `fa-arrow-trend-up`, «RAL del {fmtP(vsReparto)} sopra la media del reparto»;
   - negativo → warn, icona `fa-arrow-trend-down`, «RAL del {fmtP(−vsReparto)} sotto la media del reparto: rischio di uscita».
2. Se ci sono corsi scaduti → bad, icona `fa-triangle-exclamation`:
   - un solo corso: «"{nome}" scaduto: va programmato l'aggiornamento»;
   - più corsi: «{n} corsi obbligatori scaduti: va programmato l'aggiornamento».
   - Altrimenti, se ci sono corsi in scadenza → warn, icona `fa-hourglass-half`, «"{nome del primo}" scade fra {giorni} giorni».
3. Se `quotaStrao ≥ 6` → warn, icona `fa-business-time`, «Straordinari al {fmtP(quotaStrao)} dell'orario: valuta un recupero con ROL».
4. Se `ferieMaturate − ferieGiorni ≥ 6` e i mesi sono almeno 9 → warn, icona `fa-umbrella-beach`, «{round(residuo)} giorni di ferie maturate ancora da godere».
5. Se `forte.dip − forte.reparto ≥ 5` → good, icona `fa-star`, «Punto di forza: {competenza in minuscolo} (+{diff} sulla media)».
6. Se `assenteismo < 1.5` e il contratto è maggiore di 0 → good, icona `fa-heart-pulse`, «Assenteismo basso ({fmtP(assenteismo)}): nessun episodio critico».

### 6.7 Formattazione dei numeri

- `migliaia(n)`: separatore delle migliaia «.» **sempre**, anche a 4 cifre («1.890», non «1890»). Arrotonda all'intero e usa il segno meno tipografico «−».
  - `eur(n) = migliaia(n) + " €"`;
  - `fmtOre(n) = migliaia(n) + " h"`.
- Kit (`Intl it-IT`):
  - `fmtPct(n, d=1)` → «78,4%»;
  - `fmtInt` → «1234». Con le impostazioni it-IT dei browser i numeri a 4 cifre **non** vengono raggruppati;
  - `fmtEurK` → «12,3k €», «1,2M €», oppure «850 €» sotto mille;
  - `fmtAxisNum` → «32k»;
  - `fmtDelta(n, suffix='%', d=1)` → «+8,2%» o «−3,0%», con il meno tipografico; a zero, nessun segno.
- Date: `fmtDataIt('2026-03-05')` → «05/03/2026».

## 7. Backend da realizzare

Oggi è tutto calcolato lato frontend (mock deterministico più due store persistiti). Da sostituire con un endpoint di sola lettura. La pagina legacy da cui deriva usava `report/GetProfile` (`Views/Report/ProfileAnalysis.cshtml`).

**`GET /Sibylla/hr/profile-analysis/{dipendenteId}?anno=2026`**

Risposta 200: il `ProfiloData` grezzo. Gli indicatori derivati (§6.5) e le regole degli insight (§6.6) possono restare lato client, oppure arrivare già calcolati in `kpi` e `insight`. Se arrivano, il frontend li usa così come sono.

```json
{
  "anno": 2026,
  "aggiornatoAl": "2026-11-05T10:42:00+01:00",
  "anagrafica": {
    "dipendenteId": 1, "nome": "Andrea", "cognome": "Grimaudo", "reparto": "Front office",
    "sesso": "M", "ruolo": "Capo ricevimento", "livello": 4, "tipologia": "Tempo indeterminato",
    "orarioPct": 1, "assunzione": "2016-05-01", "nascita": "1989-03-14", "eta": 37, "anzianitaMesi": 126,
    "ferieAnnue": 26, "rolAnnui": 72
  },
  "carriera": [
    { "anno": 2019, "label": "2019", "ral": 25850, "livello": 3, "ruolo": "Addetto ricevimento", "mediaReparto": 25400, "evento": "Passaggio al 5° livello" }
  ],
  "mesi":   [ { "label": "Gen", "mese": 0, "contratto": 173, "ordinarie": 140.2, "straordinari": 3.1, "ferie": 24, "rol": 6.2, "malattia": 0, "formazione": 0, "lordo": 2410, "netto": 1771 } ],
  "mesiLy": [ "… stessi campi, stesso numero di mesi dell'anno selezionato …" ],
  "competenze": [ { "nome": "Accoglienza", "dip": 74, "reparto": 70 } ],
  "corsi": [ { "nome": "Privacy e GDPR", "fatto": "2024-09-12", "scade": "2026-09-12", "stato": "scaduto", "giorni": -54 } ],
  "premio": {
    "fonte": "obiettivo", "nome": "Upselling reception", "massimo": 1000, "maturato": 250, "pct": 63,
    "driver": [ { "nome": "Vendite", "peso": 60, "pct": 51 }, { "nome": "Soddisfazione ospiti", "peso": 25, "pct": 83 }, { "nome": "Presenza", "peso": 15, "pct": 100 } ],
    "chiusura": "2026-10-31"
  }
}
```

Regole di costruzione lato server:

- carriera dai contratti e dalle variazioni del personale; la media di reparto è sui colleghi in forza nell'anno, il dipendente compreso;
- mesi dalle presenze consolidate (registro presenze) e dalle richieste approvate;
- `lordo` e `netto` dai cedolini;
- competenze dalle valutazioni del responsabile;
- corsi dal registro della formazione con la validità per corso;
- premio dall'obiettivo individuale attivo (vedi scheda 15), altrimenti dalla stima di reparto con le stesse formule.

Errori:

- 404 `{ "errore": "Dipendente non trovato" }`: il frontend ripiega sul dipendente 1, come oggi;
- 400 se l'anno è fuori dai tre anni ammessi.

Elenco dei dipendenti per la select: l'endpoint del personale condiviso in `01-modello-dati-e-api.md`.

Nessuna operazione transazionale, nessuna notifica. «Aggiorna i dati» ripete la GET.

## 8. Stile

Token del tema chiaro alla prima comparsa:

| Token | Valore |
|---|---|
| `--color-primary` | `#204769` |
| `--color-border` | `#CFD4DA` |
| `--color-surface` | `#FFFFFF` |
| `--color-bg` | `#F8FCFF` |
| `--color-text-active` | `#4A4D53` |
| `--color-text-inactive` | `#6E7175` |
| `--color-text-disabled` | `#A9AAAD` |
| `--color-primary-100` | `#e6eaee` |
| `--chart-1` | `#2E6DA4` |
| `--chart-2` | `#C4661F` |
| `--chart-4` | `#A8862F` |
| `--chart-5` | `#1E9E95` |
| `--chart-6` | `#C43D34` |
| `--chart-ly` | `#A9B2BC` |
| `--chart-forecast` | `#A8862F` |
| `--chart-grid` | `#E6EBF0` |
| `--chart-axis` | `#C3C9D0` |
| `--chart-ink` | `#4A4D53` |
| `--chart-ink-muted` | `#6E7175` |
| `--chart-surface` | `#FFFFFF` |
| `--chart-good` | `#007035` |
| `--chart-bad` | `#D10011` |
| `--chart-tip-bg` | `#1E293B` |
| `--chart-tip-ink` | `#FFFFFF` |

Font: `--font-heading` Poppins e `--font-body` Open Sans.

### Toolbar

| Classe | Proprietà |
|---|---|
| `.pa__filter` | `width: 120px` |
| `.pa__filter--wide` | `width: 260px` |
| `.pa__note` | `inline-flex; align-items center; gap 6px; margin-left auto; padding-bottom 8px; font-body 11px; color --color-text-inactive; nowrap`. Icona `--color-primary` 12px |

### Colonna profilo: contenitore e hero

| Classe | Proprietà |
|---|---|
| `.pa__prof` | `flex column; min-height 0; overflow hidden; border 1px solid --color-border; border-radius 12px; background --color-surface; animation pa-in 520ms cubic-bezier(0.32, 0.72, 0, 1) both` |
| `.pa__hero` | `relative; flex column; align-items center; flex none; padding 12px 14px 14px; color #fff; text-align center; overflow hidden` |
| `.pa__hero`, sfondo | `radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--color-primary) 70%, #5fa8d3) 0%, var(--color-primary) 55%, color-mix(in srgb, var(--color-primary) 75%, #000) 100%)` |
| `.pa__hero::before` / `::after` | cerchi sfumati `radial-gradient(circle, rgba(255,255,255,.18), transparent 70%)`, `pointer-events none` |
| `::before` | 180×180, `top −70px; left −50px`, `pa-float 9s ease-in-out infinite alternate` |
| `::after` | 140×140, `bottom −60px; right −40px`, `pa-float 11s ease-in-out infinite alternate-reverse` |
| `.pa__nav` | `relative; z-index 1; flex; space-between; align-self stretch; margin-bottom 4px` |
| `.pa__nav-btn` | 26×26 tondo; `border 1px solid rgba(255,255,255,.28); background rgba(255,255,255,.1); color #fff; font-size 11px; transition background 160ms ease, transform 160ms ease` |
| `.pa__nav-btn:hover` | `background rgba(255,255,255,.22); transform scale(1.06)` |
| `.pa__nav-pos` | `font-body 11px; opacity .8` |

### Colonna profilo: avatar, nome, chip

| Classe | Proprietà |
|---|---|
| `.pa__avatar` | 84×84; `padding 4px`; tondo; `background conic-gradient(#ffd166 var(--anz, 0%), rgba(255,255,255,.2) 0)`; `animation pa-pop 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both` |
| `.pa__avatar-in` | 100%; flex centrato; `border 3px solid --color-primary`; tondo; `background linear-gradient(135deg, #fff, #dfe9f3); color --color-primary; font-heading 26px 700; letter-spacing .5px` |
| `.pa__name` | `max-width 100%; color #fff; margin 8px 0 0; font-heading 17px 700; line-height 1.2` |
| `.pa__role` | `max-width 100%; margin 2px 0 0; font-body 12px; opacity .85` |
| `.pa__name`, `.pa__role` | i figli (`TruncatedText`) ereditano il colore: `.pa__name.pa__name * { color: inherit }` |
| `.pa__chips` | `flex wrap; justify center; gap 6px; margin-top 8px` |
| `.pa__chip` | `padding 2px 9px; radius 999px; background rgba(255,255,255,.16); font-body 11px 600; nowrap` |
| `.pa__chip--lv` | `background #ffd166; color #3b2a00` |

### Colonna profilo: facts e insight

| Classe | Proprietà |
|---|---|
| `.pa__facts` | `flex column; flex none; margin 0; padding 6px 14px` |
| `.pa__fact` | `flex; align center; space-between; gap 8px; padding 5px 0; border-bottom 1px solid --color-border`; l'ultima riga senza bordo |
| `.pa__fact dt` | `inline-flex; gap 7px; flex none; font-body 12px; color --color-text-inactive`. Icona larga 14px, `--color-primary`, 12px, centrata |
| `.pa__fact dd` | `margin 0; font-heading 12px 600; color --color-primary; text-align right; nowrap; ellipsis` |
| `.pa__insight` | `flex column; flex 1; min-height 0; margin 4px 10px 0; padding 10px 10px 8px; radius 10px; overflow hidden` |
| `.pa__insight`, sfondo | `linear-gradient(160deg, color-mix(in srgb, var(--chart-forecast) 14%, var(--color-surface)), var(--color-surface) 75%)` |
| `.pa__insight`, bordo | `1px solid color-mix(in srgb, var(--chart-forecast) 35%, var(--color-border))` |
| `.pa__insight-tit` | `inline-flex; gap 6px; font-heading 12px 700; color --color-primary`. Icona `--chart-forecast` |
| `.pa__insight-list` | `flex column; gap 6px; margin 8px 0 0; padding 0; list-style none` |
| `.pa__ins` | `grid 20px 1fr; align start; gap 6px; font-body 11.5px; line-height 1.35; color --color-text-active`; `animation pa-in 480ms cubic-bezier(0.32,0.72,0,1) both`; `animation-delay calc(240ms + var(--i) * 110ms)` |
| `.pa__ins i` | pastiglia 20×20, radius 6px, font 10px |
| `--good` | sfondo `color-mix(--chart-good 16%, transparent)`, icona `--chart-good` |
| `--warn` | sfondo `color-mix(--chart-4 18%, transparent)`, icona `--chart-4` |
| `--bad` | sfondo `color-mix(--chart-bad 16%, transparent)`, icona `--chart-bad` |
| `.pa__links` | `grid 1fr 1fr; gap 8px; flex none; padding 10px` |
| `.pa__link` | `justify-content center` (sopra `.sib-btn--secondary`) |

### Card: aree grafico e pulsante icona

| Classe | Proprietà |
|---|---|
| `.pa__chart` | `flex 1; min-height 0; min-width 0` |
| `.pa__icobtn` | 26×26; `border 0; radius 6px; transparent; color --color-primary; 13px` |
| `.pa__icobtn:hover` | `background color-mix(--color-primary 10%, transparent)` |

### Tachimetro e driver

| Classe | Proprietà |
|---|---|
| `.pa__tach` | `relative; flex column; align center; flex 1; min-height 0` |
| `.pa__tach-svg` | `width 100%; max-width 230px; flex 1; min-height 64px; overflow visible` |
| `.pa__tach-track` | `fill none; stroke color-mix(--color-border 70%, transparent); stroke-width 16; linecap round` |
| `.pa__tach-val` | `fill none; stroke-width 16; linecap round; stroke-dasharray calc(var(--g)*1px) 100px; transition stroke-dasharray 1100ms cubic-bezier(0.32, 0.72, 0, 1)` |
| `.pa__tach-soglia` | `stroke --chart-ink; width 2; opacity .45` |
| `.pa__tach-needle` | `transform-origin 100px 100px; transform rotate(var(--ang, -90deg)); transition transform 1100ms cubic-bezier(0.34, 1.3, 0.64, 1)` |
| lancetta, linea | `stroke --chart-ink; width 3; round` |
| lancetta, cerchio | `fill --chart-ink; stroke --chart-surface; width 3` |
| `.pa__tach-tick` | `fill --chart-ink-muted; font-body 9px; anchor middle`; `--mid` 600 |
| `.pa__tach-fig` | `flex column; align center; flex none; margin-top 2px` |
| `.pa__tach-val-txt` | `font-heading 20px 700; --color-primary; tabular-nums; line-height 1.1` |
| `.pa__tach-sub` | `font-body 11px; --color-text-inactive` |
| `.pa__drivers` | `flex column; gap 6px; flex none; margin 8px 0 0; list none` |
| `.pa__driver` | `grid minmax(0,1.25fr) minmax(40px,1fr) 34px; align center; gap 8px` |
| `.pa__driver-lbl` | `font-heading 11.5px 600; --color-primary` |
| `.pa__driver-pct` | `right; font-heading 12px 700; --color-primary; tabular-nums` |
| `.pa__bar` | `block; height 6px; radius 999px; background color-mix(--color-border 60%, transparent); overflow hidden` |
| `.pa__bar-fill` | `width var(--w); height 100%; radius 999px; background linear-gradient(90deg, var(--chart-1), var(--chart-5)); transform-origin left`; `animation pa-grow 900ms cubic-bezier(0.32,0.72,0,1) both`; `delay calc(300ms + var(--i) * 120ms)` |
| `.pa__bar-fill--low` | `background --chart-bad` |

### Legenda del radar e ciambella del tempo

| Classe | Proprietà |
|---|---|
| `.pa__radar-leg` | `flex; justify center; gap 14px; flex none` |
| `.pa__radar-key` | `inline-flex; gap 6px; font-body 11px; --color-text-inactive` |
| `.pa__radar-key::before` | tratto largo 14px, `border-top 2.5px solid --chart-1` |
| `.pa__radar-key--rep::before` | `border-top 2px dashed --chart-ly` |
| `.pa__donut` | `relative; height 100%; min-height 0` |
| `.pa__donut-center` | `absolute inset 0; flex column centrato; pointer-events none` |
| `.pa__donut-val` | `font-heading 18px 700; --color-primary; tabular-nums; lh 1.1` |
| `.pa__donut-lbl` | `max-width 70%; font-body 10px; --color-text-inactive; nowrap; ellipsis` |
| `.pa__tempo-list` | `flex column; gap 2px; list none` |
| `.pa__tempo-row` | `grid 10px minmax(0,1fr) auto; align center; gap 6px; padding 3px 4px; radius 6px; cursor default; transition opacity 160ms ease, background 160ms ease` |
| `.pa__tempo-row:hover` | `background color-mix(var(--c) 10%, transparent)` |
| `.pa__tempo-row--off` | `opacity .4` |
| `.pa__tempo-dot` | 10×10, radius 3px, `background var(--c)` |
| `.pa__tempo-lbl` | `font-body 11.5px; --color-text-active` |
| `.pa__tempo-ore` | `font-heading 11.5px 600; --color-primary; tabular-nums; nowrap` |

### Formazione obbligatoria

| Classe | Proprietà |
|---|---|
| `.pa__comp-ring` | 86×86 tondo; `flex column centrato`; `background conic-gradient(var(--chart-good) var(--pct), color-mix(in srgb, var(--chart-bad) 70%, transparent) 0)`; `animation pa-pop 620ms cubic-bezier(0.34,1.56,0.64,1) both` |
| `.pa__comp-ring::before` | foro: `inset 8px`, tondo, `background --color-surface` |
| `.pa__comp-ring-val` | `font-heading 17px 700; --color-primary; lh 1.1` |
| `.pa__comp-ring-lbl` | `font-body 9.5px; --color-text-inactive` |
| `.pa__corsi` | `flex column; justify center; gap 3px; flex 1; min 0; overflow hidden; list none` |
| `.pa__corso` | `grid 14px minmax(0,1fr) auto; align center; gap 6px; padding 3px 6px; radius 6px`; icona 12px |
| `--valido` | icona `--chart-good` |
| `--scadenza` | sfondo `color-mix(--chart-4 12%, transparent)`, icona `--chart-4` |
| `--scaduto` | sfondo `color-mix(--chart-bad 10%, transparent)`, icona `--chart-bad` |
| `.pa__corso-nome` | `font-body 11.5px; --color-text-active` |
| `.pa__corso-scad` | `font-heading 10.5px 600; --color-primary; tabular-nums; nowrap`; con stato scaduto `--chart-bad` |

### Tema scuro (`[data-theme=dark]`)

- `.pa__hero.pa__hero` → `background: radial-gradient(120% 90% at 50% 0%, #2c5a85 0%, #1a3753 55%, #10233a 100%)`. In scuro `--color-primary` è l'accento chiaro `#6F9BCB`: il banner resta un blu profondo, così il testo bianco ha contrasto.
- `.pa__avatar-in.pa__avatar-in` → `border-color: #1a3753; color: #1a3753`.
- Tutto il resto segue i token del tema scuro:
  - superfici: `--color-surface #1A1E26`, `--color-border #2B313D`;
  - grafici: `--chart-1 #4A8BC9`, `--chart-2 #D9722F`, `--chart-4 #A8862F`, `--chart-5 #1E9E95`, `--chart-6 #E8635A`, `--chart-ly #4A5462`, `--chart-grid #262C38`, `--chart-axis #3A4453`, `--chart-ink #E6E8EC`, `--chart-ink-muted #9AA2AE`, `--chart-surface #1A1E26`, `--chart-good #34D399`, `--chart-bad #FF6B78`, `--chart-tip-bg #0E1116`, `--chart-forecast #C9A84C`.

## 9. Responsività

Il root `.bi-page` è un container query con `container-type: inline-size` e `container-name: bi-page`. Le soglie di larghezza misurano **la larghezza reale del contenuto**, non il viewport: cambia con la sidenav aperta o chiusa.

**`@container bi-page (max-width: 1180px)`**, cioè laptop 1366 px con sidenav aperta:

- `.pa__grid`: prima colonna `minmax(200px, 0.75fr)`, le altre invariate;
- `.pa__kpis`: gap 8px;
- `.pa__filter--wide`: 220px;
- `.pa__note`: nascosta;
- `.pa__comp-ring`: nascosto; la quota resta nel badge «x/y in regola»;
- badge della card principale (`.pa__main .chart-card__badge`): nascosto;
- `.pa__tempo-body`: colonne `minmax(0, 0.9fr) minmax(0, 1.1fr)`, gap 6px;
- dal kit: toolbar gap 8px e mb 10px; body e grid gap 8px; `chart-card__inner` padding `8px 10px 10px`; titolo card 12px; sottotitolo 10px; KPI padding `8px 10px`, valore 18px, sparkline larga 68px.

**`@media (max-height: 900px)`**:

- piede della card Competenze nascosto: il radar ha bisogno d'altezza;
- insight dal 4° in poi nascosti (`:nth-child(n+4)`);
- avatar 68×68, iniziali 21px;
- `.pa__fact` padding `3px 0`;
- `.pa__drivers` gap 4px.

**`@media (max-height: 820px)`**:

- `.pa__grid`: righe `auto minmax(0, 1fr) minmax(0, 1.08fr)`;
- insight dal 3° in poi nascosti;
- `.pa__tempo-row` padding `1px 4px`;
- `.pa__drivers` margin-top 4px;
- `.pa__tach-val-txt` 17px, `.pa__tach-svg` min-height 46px;
- `.pa__tach-sub` nascosta: il massimo resta nella tooltip;
- `.pa__hero` padding `8px 12px 10px`, `.pa__chips` margin-top 5px;
- 4° fact nascosto («Età»);
- `.pa__corso` padding `1px 6px`;
- dal kit: header mb 8px, toolbar mb 8px, gap 8px.

Vincoli:

- nessuno scroll a nessuna larghezza: le tracce della griglia sono `minmax(0, …)` e le celle hanno `min-width: 0; min-height: 0`;
- i testi lunghi (nome, ruolo, etichette driver, voci del tempo, nomi corsi, titoli e sottotitoli delle card, label KPI) vanno su una riga con ellipsis e tooltip del testo completo (`TruncatedText`).

A 1920 px valgono le dimensioni piene della §8.

## 10. Effetti e animazioni

| Elemento | Effetto |
|---|---|
| Colonna profilo | `pa-in` 520ms `cubic-bezier(0.32, 0.72, 0, 1)` both: da `opacity 0; translateY(8px)` a pieno. Si ripete a ogni cambio di dipendente (key) |
| Avatar, anello compliance | `pa-pop` 620ms `cubic-bezier(0.34, 1.56, 0.64, 1)` both: da `opacity 0; scale(.7)` a pieno, con rimbalzo |
| Cerchi luminosi dell'hero | `pa-float`: da `translate(0,0)` a `translate(30px, 18px)`. `::before` 9s, `::after` 11s, `ease-in-out infinite`, alternate e alternate-reverse |
| Voci insight | `pa-in` 480ms, stessa curva, ritardo `240ms + i × 110ms` |
| Barre dei driver | `pa-grow` 900ms `cubic-bezier(0.32,0.72,0,1)`: `scaleX(0 → 1)` da sinistra, ritardo `300ms + i × 120ms` |
| Tachimetro | parte da 0; dopo **120ms** (`setTimeout`) prende il valore. L'arco anima `stroke-dasharray` in 1100ms `cubic-bezier(0.32,0.72,0,1)`, la lancetta ruota in 1100ms `cubic-bezier(0.34, 1.3, 0.64, 1)` con leggero overshoot. Con riduzione del movimento il valore è subito quello finale |
| Card | `chart-card-in` 460ms `cubic-bezier(0.32,0.72,0,1)` both, ritardo `index × 80ms + 80ms` (80, 160, 240, 320, 400ms): da `opacity 0; translateY(10px) scale(0.995)`. Hover: bordo `color-mix(--color-primary 30%, --color-border)` e `--shadow-sm`, transizione 160ms ease |
| KPI | `kpi-tile-in` 420ms, stessa curva, ritardo `i × 70ms`, da `translateY(8px)`. Numero contato da 0 in 900ms easeOutCubic (`1 − (1−t)³`, via `requestAnimationFrame`). Sparkline: area con disegno in 900ms ease-out, ritardo `i × 90ms`. Pallino di posizione: `left` 420ms |
| Grafici recharts | ingresso 900ms `ease-out`; serie successive sfasate di 90ms (`ANIM.begin(i) = i × 90`) |
| Pulsanti ‹ › | hover background e `scale(1.06)` in 160ms ease |
| Righe del tempo | opacità e sfondo 160ms ease |
| Tab verticali, timbro, legenda | vedi appendice A |

**`prefers-reduced-motion: reduce`**:

- nessuna animazione su `.pa__prof`, `.pa__avatar`, `.pa__ins`, `.pa__bar-fill`, `.pa__comp-ring`, `.pa__hero::before/::after`;
- nessuna transizione su `.pa__tach-val` e `.pa__tach-needle`;
- recharts con `isAnimationActive = false`;
- conteggio KPI immediato, card e KPI senza ingresso.
- C'è inoltre la regola globale della piattaforma: `*, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important }`.

**Etichette del radar** (`EtichettaRadar`), un `<text>` SVG:

- va a capo sulle parole, unendo parole finché la riga resta di **11 caratteri** o meno;
- `fontSize 10`, `fill --chart-ink-muted`;
- interlinea 11 (`dy` 3 alla prima riga, 11 alle successive);
- `textAnchor`: `middle` se `|x − cx| < 6`, `start` se a destra del centro, `end` se a sinistra;
- sopra il centro il blocco si alza di `(righe − 1) × 11`.

## 11. Accessibilità

- Frecce di navigazione: `button` con `aria-label` «Dipendente precedente» e «Dipendente successivo».
- Icona Premio: `aria-label` «Apri il monitoraggio degli obiettivi».
- Tachimetro: `role="img"` con `aria-label` «Obiettivi raggiunti al {n}%».
- Centro della ciambella: `aria-live="polite"`, così annuncia la voce attiva.
- Tab verticali: `role="tablist"` con `aria-orientation="vertical"`; ogni tab è `role="tab"` con `aria-selected`.
- Legenda acronimi:
  - la linguetta ha `aria-expanded` e `aria-controls="bi-gloss-panel"`;
  - il pannello è `role="dialog"` con `aria-label` «Legenda degli acronimi»;
  - la chiusura ha `aria-label` «Chiudi la legenda»;
  - Esc chiude.
- Timbro: `aria-label` «Aggiorna i dati».
- Tutte le icone decorative hanno `aria-hidden="true"`; le sparkline sono `aria-hidden`.
- Tooltip dei grafici: `role="tooltip"`.
- La legenda del radar è `aria-hidden`: l'informazione è nella tooltip.
- Select con label associate (`SelectField`).
- L'evidenziazione delle voci del tempo è solo al passaggio del mouse: non c'è equivalente da tastiera.

## 12. Criteri di accettazione

1. `profile-analysis` apre Andrea Grimaudo: «1 di 12» e le iniziali «AG». `profile-analysis:4` apre Sara Romano («4 di 12»), con il fact «Orario» «Part-time 60% · 24 h». `profile-analysis:99` apre il dipendente 1.
2. Titolo «Profile analysis» e sottotitolo esatti. Il timbro mostra «Dati BI» e data/ora; il clic su ⟳ aggiorna l'ora senza cambiare i numeri.
3. La select «Dipendente» elenca 12 voci «Nome Cognome · Reparto». La select «Anno» mostra le opzioni anno corrente, −1 e −2.
4. La nota della toolbar per Front office dice «Confronto con i 3 colleghi di Front office» e sparisce quando il contenuto è più stretto di 1180 px.
5. Le frecce ‹ › scorrono i dipendenti in modo circolare (dal 12 si va all'1); la colonna profilo e le KPI rifanno l'animazione d'ingresso e i numeri ricontano da 0.
6. L'anello dell'avatar è pieno in proporzione all'anzianità (10 anni = giro intero) ed è giallo `#ffd166`. Il chip del livello è giallo con testo `#3b2a00`.
7. I 4 KPI sono, in ordine, «RAL», «Ore lavorate», «Assenteismo» e «Straordinari», con i colori degli slot 1, 5, 6 e 2. Assenteismo e Straordinari hanno il delta invertito: un aumento è rosso. All'hover compaiono «min …» e «max …».
8. La card principale cambia titolo, sottotitolo, badge, legenda, piede e grafico con i tab «Carriera», «Presenze» e «Cedolini». In Carriera ci sono le barre a gradiente con l'etichetta «xx,xk €» sopra, la linea tratteggiata grigia della media e la linea a gradini del livello con l'asse destro «6° 4° 2° Q». In Presenze le barre impilate hanno la linea tratteggiata del contratto.
9. Per Andrea Grimaudo il premio ha il sottotitolo «Obiettivo "Upselling reception"» e l'icona ↗ che porta a Monitoraggio performance; i driver sono «Vendite · 60%», «Soddisfazione ospiti · 25%» e «Presenza · 15%». Per gli altri dipendenti il sottotitolo è «Stima sugli obiettivi di reparto {anno}» e l'icona manca.
10. Il tachimetro parte da 0 e in circa 1,1 s porta arco e lancetta al valore. Un driver sotto il 50% ha la barra rossa.
11. Con il mouse su una fetta della ciambella o su una riga dell'elenco, le altre fette passano a opacità 0,25 e le altre righe a 0,4; il centro mostra la quota con 1 decimale e il nome della voce. All'uscita torna «xx% al lavoro».
12. Il radar ha 6 assi con etichette su più righe (al massimo 11 caratteri per riga), il poligono pieno blu del dipendente e il contorno tratteggiato grigio della media. Il piede dice «Da sviluppare: …» oppure «Sopra la media del reparto in tutte le competenze.».
13. Nella formazione i corsi sono ordinati dalla scadenza più vicina. Gli scaduti hanno lo sfondo rosato e il testo «scaduto da N gg»; quelli in scadenza entro 90 giorni hanno lo sfondo ocra e «fra N gg». La tooltip dice «Fatto il … · scade il …».
14. «La lettura di Sibylla» mostra al massimo 4 voci, 3 sotto i 900 px di altezza e 2 sotto gli 820 px; le voci entrano in cascata (240ms + 110ms ciascuna).
15. A 1366×768 con sidenav aperta, a 1440×900 e a 1920×1080 non compare nessuna barra di scorrimento della pagina né delle card. Sotto i 1180 px di contenuto spariscono l'anello compliance e il badge della card principale.
16. In tema scuro il banner del profilo resta blu profondo (`#2c5a85 → #1a3753 → #10233a`) e le iniziali sono `#1a3753`.
17. Con «riduci movimento» attivo nessun elemento si anima: il tachimetro e i numeri sono già al valore finale.
18. Un ROL approvato in Richieste per il dipendente (data d'inizio nell'anno) sostituisce le ore ROL generate di quel mese nel grafico Presenze.

## 13. File sorgente

- `src/router/PageContent.tsx` (route `profile-analysis` e `profile-analysis:<id>`)
- `src/modules/hr/ProfileAnalysis/ProfileAnalysis.tsx`
- `src/modules/hr/ProfileAnalysis/ProfileAnalysis.sass`
- `src/modules/hr/ProfileAnalysis/profileMock.ts`
- `src/store/useHrGestioneStore.ts` (`DIPENDENTI_HR`, `ORE_GIORNO`, `giorniLavorativi`, `oreRichiesta`, `richieste`)
- `src/store/useObiettiviStore.ts` (`premioSbloccato`, `premioTotale`, `avanzamentoPct`, `tuttiSotto`)
- `src/core/bi/index.ts`, `BiPage.tsx/.sass`, `ChartCard.tsx/.sass`, `KpiTile.tsx/.sass`, `DeltaBadge.tsx/.sass`, `Sparkline.tsx`, `useCountUp.ts`, `ChartTooltip.tsx/.sass`, `BiLegend.tsx/.sass`, `BiVerticalTabs.tsx/.sass`, `BiBarLabel.tsx/.sass`, `BiDataStamp.tsx/.sass`, `BiGlossaryRail.tsx/.sass`, `biGlossary.ts`, `chartTheme.ts`
- `docs/bi.md`
- `src/styles/_themes.sass`, `src/styles/_components.sass` (riduzione movimento globale)
- `src/core/components/PageHead.tsx`, `src/core/components/form/SelectField.tsx`
- `src/navigation/menu.ts`, `src/navigation/menuHelpers.ts`, `src/navigation/pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`, `src/modules/_scaffold/portedPages.tsx`

---

## Appendice A · Kit BI usato (valori esatti)

Questa appendice vale anche per la scheda `16-hr-overview.md`.

### A.1 `BiPage`

Struttura: `div.bi-page` › `PageHead` (`className="bi-page__head"`, azioni = `actions` più `BiDataStamp`) › `div.bi-page__toolbar` › `div.bi-page__body` › [`div.bi-page__grid` + `BiGlossaryRail`].

| Classe | Proprietà |
|---|---|
| `.bi-page` | `height 100%; min-height 0; min-width 0; display grid; grid-template-rows auto auto minmax(0, 1fr); gap 0; overflow hidden; container-type inline-size; container-name bi-page` |
| `__head` | `margin-bottom 12px` |
| `__toolbar` | `flex row nowrap; align-items flex-end; gap 10px; min-width 0; margin-bottom 12px`; figli `flex none; min-width 0` |
| `__body` | `flex; align stretch; gap 10px; min 0` |
| `__grid` | `flex 1; display grid; gap 10px; min 0`; figli `min-width 0; min-height 0` |

Compattazioni:

- `@container bi-page (max-width: 1180px)`: toolbar gap 8px, mb 10px; body e grid gap 8px.
- `@media (max-height: 820px)`: head mb 8px, toolbar mb 8px, gap 8px.

### A.2 `KpiTile`

Struttura:

- intestazione: icona a pastiglia, label (`TruncatedText`), icona info `fa-solid fa-circle-info` con Tooltip;
- corpo: valore contato con `DeltaBadge sm` sotto, sparkline alta 38px a destra;
- riga di posizione: compare solo se la serie ha almeno 3 valori e il massimo è diverso dal minimo.

| Classe | Proprietà |
|---|---|
| `.kpi-tile` | `relative; flex column; gap 6px; padding 10px 12px; border 1px --color-border; radius --radius-lg (10px); background --color-surface; overflow hidden` |
| `:hover` | bordo `color-mix(var(--kpi-c) 45%, --color-border)`; mostra la legenda min/max |
| `__ico` | 20×20, radius `--radius-sm` 4px, sfondo `color-mix(var(--kpi-c) 14%, transparent)`, colore `--kpi-c`, 11px |
| `__label` | `font-heading 12px 600; --color-text-inactive` |
| `__info` | 12px, `--color-primary`, `cursor help` |
| `__body` | `flex; align flex-end; space-between; gap 10px` |
| `__figures` | `flex column; gap 2px` |
| `__val` | `font-heading 21px 700; lh 1.1; --color-primary; tabular-nums; nowrap` |
| `__spark` | `width 92px` |
| `__range` | `margin-top 2px` |
| `__range-track` | `height 3px; radius 999px; background repeating-linear-gradient(90deg, var(--color-border) 0 2px, transparent 2px 5px)` |
| `__range-mark` | 9×9 tondo; `left var(--kpi-pos)`; `margin-left −4.5px`; colore `--kpi-c`; `box-shadow 0 0 0 2px --color-surface`; `translateY(−50%)`; `transition left 420ms cubic-bezier(0.32,0.72,0,1)` |
| `__range-legend` | `flex space-between; gap 8px; margin-top 3px; font-body 9px; --color-text-disabled; tabular-nums; opacity 0; transition opacity 160ms ease`; testi «min {valore}» e «max {valore}» |

- Sotto i 1180 px di contenuto: padding `8px 10px`, valore 18px, sparkline 68px.
- Sparkline: `AreaChart` con `margin {4, 2, 0, 2}`; area `monotone`, `stroke` colore dello slot, `strokeWidth 2`; gradiente verticale da opacità 0,28 a 0; nessun punto.

### A.3 `ChartCard`

Struttura:

- `section.chart-card` (più `--railed` se c'è un rail), con `--cc-i = index`;
- dentro: [`div.chart-card__rail`] e `div.chart-card__inner`;
- l'intestazione contiene titoli (titolo `TruncatedText` + badge, sottotitolo `TruncatedText`), legenda (solo se ha 2 o più voci) e azioni;
- seguono il corpo e il piede facoltativo.

| Classe | Proprietà |
|---|---|
| `.chart-card` | `flex; border 1px --color-border; radius --radius-lg; background --color-surface; overflow hidden; transition border-color 160ms ease, box-shadow 160ms ease` |
| `__inner` | `flex column; flex 1; padding 10px 12px 12px` |
| `__head` | `flex; align flex-start; gap 10px; flex none; margin-bottom 8px` |
| `__title` | `flex; align center; gap 8px; margin 0; font-heading 13px 600; --color-primary` |
| `__badge` | `padding 1px 7px; radius 999px; background color-mix(--color-primary 10%, transparent); --color-primary; 11px 700; tabular-nums` |
| `__sub` | `margin 2px 0 0; font-body 11px; --color-text-inactive` |
| `__legend` | `margin-left auto; justify-content flex-end; max-width 58%` |
| `__actions` | `flex; gap 4px; margin-left auto`; dopo la legenda `margin-left 8px` |
| `__body` | `flex 1; min 0; flex column` |
| `__footer` | `margin-top 8px; padding-top 8px; border-top 1px --color-border; font-body 11px; --color-text-inactive` |
| `__rail` | `flex; border-right 1px --color-border` |

- Sotto i 1180 px di contenuto: inner padding `8px 10px 10px`, titolo 12px, sottotitolo 10px.

### A.4 `DeltaBadge`

- Freccia `fa-solid fa-arrow-up`, `fa-arrow-down` oppure `fa-minus` (a zero), seguita dal testo.
- Colore di stato: verde se migliora, rosso se peggiora; con `invert` il senso si ribalta.
- Base: `inline-flex; gap 4px; padding 2px 7px; radius 999px; font-body 12px 600; tabular-nums`; icona 10px.
- `--sm`: padding `1px 6px`, 11px, icona 9px.
- `--good`: colore `--chart-good` su `color-mix(--chart-good 12%, transparent)`.
- `--bad`: colore `--chart-bad` su `color-mix(--chart-bad 12%, transparent)`.
- `--flat`: colore `--chart-ink-muted` su `color-mix(--chart-ink-muted 12%, transparent)`.

### A.5 `ChartTooltip` (tooltip dei grafici)

- Struttura:
  - intestazione: la label dell'asse x;
  - una riga per serie (escluse quelle senza valore): pallino 8px del colore della serie (`stroke`, `fill` oppure `color`), nome, valore formattato.
- `.chart-tip`: `flex column; gap 4px; min-width 168px; padding 8px 10px; radius 8px; background --chart-tip-bg (#1E293B); color --chart-tip-ink (#fff); box-shadow 0 6px 20px rgba(0,0,0,.28); font-body 12px; lh 1.35; pointer-events none`.
- `__label`: heading 11px 600, `letter-spacing .02em`, opacità .75.
- `__row`: `grid 8px 1fr auto; gap 8px; nowrap`.
- `__val`: 600, tabular-nums.

### A.6 `BiLegend` e `BiVerticalTabs`

**`BiLegend`**:

- `ul.bi-legend--row`: `flex row wrap; gap 4px 12px`.
- Ogni voce: pallino 9×9 tondo (`margin-right 6px`) e nome `font-body 12px; --color-text-inactive; nowrap; ellipsis`.
- Le voci non sono cliccabili in queste pagine.

**`BiVerticalTabs`**:

- Rail largo 30px.
- Tab `flex 1`; `padding 10px 0`; `background --color-bg`; `color --color-text-inactive`; `font-heading 10px 600`; `letter-spacing .08em`; `text-transform uppercase`; `transition background 160ms ease, color 160ms ease`.
- Separatore fra tab: `border-top 1px --color-border`.
- Hover (tab non attivo): `background --color-primary-100; color --color-primary`.
- Tab attivo: `background --color-primary; color --color-text-negative (#fff)`.
- Testo `writing-mode: vertical-rl; transform: rotate(180deg)`: si legge dal basso verso l'alto.

### A.7 `BiDataStamp` e `BiGlossaryRail`

**`BiDataStamp`**:

- `.bi-stamp`: `inline-flex; gap 6px; padding 3px 9px; border 1px --color-border; radius 999px; background --color-surface; font-body 11px; nowrap`.
- Pulsante: 18×18 tondo, `--color-primary`, 11px; hover `--color-primary-100`; disabilitato con opacità .7. In caricamento l'icona gira (`bi-stamp-spin` 900ms linear infinite).
- «Dati BI»: heading 600, `--color-primary`.
- Data e ora: `--color-text-inactive`, tabular-nums.

**`BiGlossaryRail`**:

- Linguetta: larga 30px; `flex column; gap 8px; padding 10px 0; border 1px --color-border; radius --radius-md (6px); background --color-surface; --color-primary; font-heading 11px 600`. Contiene l'icona `fa-solid fa-circle-info` (13px) e il testo «Legenda» (`writing-mode vertical-rl; letter-spacing .06em`).
- Linguetta in hover o con pannello aperto: sfondo e bordo `--color-primary`, testo bianco; transizioni 160ms ease.
- Pannello:
  - `absolute; top 0; right 36px; z-index 40; width min(720px, 62vw); max-height 100%; padding 12px 14px; border; radius --radius-lg; --shadow-lg`;
  - animazione d'ingresso `bi-gloss-in` 180ms ease: da `opacity 0; translateX(6px)`;
  - titolo «Legenda degli acronimi» (heading 13px 600 primary) e pulsante X 24×24;
  - tabella con le colonne «Acronimo», «Descrizione», «Modalità di calcolo»: celle `6px 10px`, 12px, bordo inferiore; intestazione sticky con sfondo `--color-bg`; la prima colonna in heading 600 primary.
  - È l'unico punto dove è ammesso uno scroll interno.
- Chiusura con Esc, con il clic fuori e con la X.
