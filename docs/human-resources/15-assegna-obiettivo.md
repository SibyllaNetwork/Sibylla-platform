# 15 · Assegna obiettivo (Premio performance)

Scheda di riproduzione della pagina **Assegna obiettivo**, con titolo in pagina «Premio performance». La pagina è un **wizard a 4 fasi animate** che crea un obiettivo di vendita e lo salva in `useObiettiviStore`. Le scelte del wizard sono:

- destinatario: un reparto oppure una persona;
- segmenti: prodotti, servizi o esperienze;
- budget lordo e margine (M.U.);
- frammentazione in periodi e sottoperiodi, ciascuno con target e premio in valore assoluto (€).

> **Vista real-time**: la pagina aveva una seconda vista «In corso» con anelli SVG di avanzamento, barre, countdown e interruttore LIVE (`ObiettiviLive`, `ObiettivoCard`, `ProgressRing`, `Countdown`). È stata **rimossa il 31/07/2026** (commit `cad851d`) perché duplicava Monitoraggio performance. Al commit di riferimento `5e895d1` **non esiste più e non va riprodotta**.
>
> Oggi la parte real-time vive in **`monitoraggio-perf`** (scheda `14-monitoraggio-performance.md`): pista con traguardi, barre animate, interruttore LIVE con pallino pulsante, avanzamento ogni 1800 ms. Questa pagina vi rimanda con il pulsante «In corso» e alla fine del wizard.

Rimandi:

- `PageHead`, `InputField`, `SelectField`, `.sib-btn` (`--primary`, `--ghost`) → `00-fondamenta.md`;
- entità `Obiettivo` e store → `01-modello-dati-e-api.md` e §6 qui sotto.

---

## 1. Scopo e utenti

- **Scopo**: definire un obiettivo commerciale e i premi legati al suo raggiungimento, poi avviarlo.
- **Destinatario**: un reparto oppure un singolo dipendente.
- **Premi**: un importo in € per ogni sottoperiodo; si sblocca quando il venduto di quel sottoperiodo raggiunge il target.
- **Utenti**: l'ufficio del personale, il responsabile HR e la direzione.

## 2. Accesso

- **Id pagina / route**: `assegna-obiettivo`, senza parametri.
- **Sidenav**: Human Resources › Gestione dei premi › **Assegna obiettivo**. Icona di menu `fa-bullseye`. Presente anche nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: nessuno. Pulsante Indietro standard del `PageHead` a sinistra (`back` di default `true`).
- **Da dove si arriva**: sidenav; Timone della Home (voce «Assegna obiettivo», icona `medal`).
- **Verso dove si naviga**:
  - pulsante «In corso» nell'header → `monitoraggio-perf`;
  - pulsante «Avvia obiettivo» → salva l'obiettivo e va a `monitoraggio-perf`.
- **Sottotitolo di catalogo** (`pageSubtitles.ts`): «Definisci obiettivi chiari e incentiva il team al loro raggiungimento». Il sottotitolo mostrato in pagina è diverso (§4).

## 3. Layout

- Root `.ao2`: `display: flex; flex-direction: column`.
- La pagina scorre in verticale: non è una pagina a schermo fisso.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]              Premio performance                [📈 In corso (2) →] │ PageHead
│     Assegna obiettivi di vendita a reparti o singole persone, …                 │
├──────────────────────────────────────────────────────────────────────────────┤
│   (🏁)────────────(🪙)────────────(▤)────────────(🚀)                           │ stepper (mb 18)
│ Dati obiettivo   Vendita & budget  Periodi & premi  Riepilogo & avvio          │
│ ⓘ messaggio di errore (se presente)                                            │
│ ┌ pannello fase (radius 14, padding 22) ────────────────────────────────────┐ │
│ │  contenuto della fase (griglia 2 colonne, gap 16/18)                       │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ [← Indietro]                                                    [Avanti →]     │ nav (mt 18, space-between)
└──────────────────────────────────────────────────────────────────────────────┘
```

**Contenitore del wizard**:

- `.ao2-wiz`: `margin-top: 6px`.
- Pannello `.ao2-wiz__panel`: `background --color-surface; border 1px solid --color-border; border-radius 14px; padding 22px`.

**Stepper**:

- `.ao2-steps`: `display: flex; margin: 0 0 18px; list-style: none`.
- 4 voci a `flex: 1`, ciascuna in colonna centrata con `gap 8px`.
- La linea di collegamento parte dal centro di una voce e arriva al centro della successiva.

**Fase 1 e fase 2**:

- Griglia `.ao2-grid.ao2-grid--2`: `grid-template-columns: repeat(2, 1fr); gap: 16px 18px`.
- `.ao2-span-2` occupa le due colonne (`grid-column: 1 / -1`).

**Fase 3**:

- `.ao2-frag` in colonna con `gap 14px`, nell'ordine:
  1. introduzione;
  2. un riquadro per periodo;
  3. pulsante «Aggiungi periodo»;
  4. fascia di riepilogo.

**Fase 4**:

- `.ao2-riep` in colonna con `gap 18px`, nell'ordine:
  1. hero;
  2. 4 riquadri di sintesi;
  3. «Sequenza premi»;
  4. anteprima della notifica.

**Navigazione**:

- `.ao2-wiz__nav`: `display flex; justify-content space-between; gap 12px; margin-top 18px`.

Nessuna modale.

## 4. Elementi e testi

### 4.1 Header

- **Titolo**: «Premio performance».
- **Sottotitolo**: «Assegna obiettivi di vendita a reparti o singole persone, frammentali in periodi e premia il raggiungimento con un valore in €».
- **Azione** (`button.ao2__golive`), composta da:
  - icona `fa-solid fa-chart-line`;
  - testo «In corso»;
  - badge numerico `.ao2__golive-badge` con il numero di obiettivi in stato `in-corso`: compare solo se è maggiore di 0 (con i dati seed vale «2»);
  - freccia `fa-solid fa-arrow-right` (`.ao2__golive-go`).

### 4.2 Stepper

| # | Icona (`fa-solid`) | Titolo |
|---|---|---|
| 1 | `fa-flag` | «Dati obiettivo» |
| 2 | `fa-coins` | «Vendita & budget» |
| 3 | `fa-layer-group` | «Periodi & premi» |
| 4 | `fa-rocket-launch` | «Riepilogo & avvio» |

- Ogni pallino è un `button` con `aria-label` uguale al titolo della fase.
- Le fasi già superate mostrano `fa-solid fa-check` al posto dell'icona.
- `fa-rocket-launch` e i pesi `fa-light` sono icone di Font Awesome Pro.

### 4.3 Fase 1 · «Dati obiettivo»

I campi seguono l'ordine della griglia, sinistra → destra e alto → basso.

1. **`InputField name="nome"`**
   - Label «Nome obiettivo», placeholder «es. Spinta commerciale primavera».
   - Valore iniziale vuoto.
2. **«Tipologia»**
   - Label `.ao2-lbl` e controllo segmentato `.ao2-seg` con due opzioni:
     - «Di reparto», icona `fa-solid fa-users`; è il default;
     - «Individuale», icona `fa-solid fa-user`.
3. **`SelectField name="reparto"`**
   - Label «Reparto».
   - Opzioni: «Commerciale», «Front office», «F&B», «Housekeeping», «Manutenzione», «Amministrazione», «Marketing», «Direzione».
   - Default «Commerciale».
4. Quarto campo, dipende dalla tipologia:
   - **Tipologia «Di reparto»**: `SelectField name="report"`, label «Fonte dati / KPI (report)».
     - Opzioni: «Report vendite reparto», «Report upselling», «Report esperienze / attività», «Report F&B», «Report camere / RevPAR», «CRM · conversioni».
     - Default «Report vendite reparto».
   - **Tipologia «Individuale»**: `SelectField name="assegnatario"`, label «Assegnatario».
     - Opzioni: «Andrea Grimaudo», «Piero Aragona», «Marco Campo», «Giulia Neri», «Ali Aslan».
     - Default «Andrea Grimaudo».
5. Solo con tipologia «Individuale», un quinto campo nella riga successiva, colonna sinistra: lo stesso `SelectField` «Fonte dati / KPI (report)».

> L'elenco degli assegnatari è **fisso nel codice** e diverso dal personale HR (`DIPENDENTI_HR`). Solo «Andrea Grimaudo» coincide con un dipendente dell'archivio, e solo per lui Profile analysis aggancia il premio all'obiettivo (scheda 13). Va riprodotto così.

### 4.4 Fase 2 · «Vendita & budget»

1. **«Tipologia di vendita»** (span 2 colonne)
   - Accanto alla label il suggerimento «(focus commerciale)», più chiaro.
   - Tre chip, selezionabili insieme:
     - «Prodotti», icona `fa-bag-shopping`;
     - «Servizi», icona `fa-concierge-bell`;
     - «Esperienze», icona `fa-mountain-sun`.
   - Un chip attivo mostra in fondo `fa-solid fa-check` (`.ao2-chip__check`, 11px).
   - Default: solo «Servizi».
2. **`InputField name="budget"`**
   - Label «Budget lordo obiettivo (€)».
   - `type="number"`, icona a sinistra `fa-solid fa-euro-sign`.
   - Default `120000`.
3. **`InputField name="margine"`**
   - Label «Margine % sul budget (M.U.)».
   - `type="number"`, icona `fa-solid fa-percent`.
   - Default `35`.
4. **Riquadro di calcolo** `.ao2-calc` (span 2), da sinistra a destra:
   - «Budget lordo» con il valore `eur(budget)`, per esempio «€ 120.000»;
   - freccia `fa-solid fa-arrow-right`;
   - «Margine atteso ({margine}%)» con il valore in verde `eur(margineAtteso)`, per esempio «Margine atteso (35%)» → «€ 42.000».

### 4.5 Fase 3 · «Periodi & premi»

**Introduzione**, con le parti in grassetto (`<strong>`) segnate da `**`:

«Frammenta il budget in **periodi** e **sottoperiodi**. Ogni sottoperiodo ha un **target di vendita** e un **premio a valore assoluto (€)** che si sblocca al raggiungimento.»

**Intestazione del periodo** (`.ao2-per__head`), da sinistra a destra:

- cerchietto numerato 24px con l'indice (1, 2…);
- nome del periodo modificabile in linea:
  - `input.ao2-per__name`, `aria-label` «Nome periodo»;
  - default «Periodo {n}»;
- totali «Target {eur} · Premio {eur}», per esempio «Target € 0 · Premio € 0»;
- pulsante `fa-solid fa-plus`, con `title` nativo «Aggiungi sottoperiodo»;
- pulsante `fa-solid fa-trash` (variante danger), con `title` «Rimuovi periodo». Compare solo se i periodi sono più di uno.

**Tabella dei sottoperiodi** (`.ao2-sub`, una griglia):

- Intestazione: «Sottoperiodo», «Dal», «Al», «Target €», «Premio €», più una cella vuota.
- Ogni riga ha 5 input `.ao2-in` e un pulsante:

| Colonna | Tipo | `aria-label` | Default / note |
|---|---|---|---|
| Sottoperiodo | testo | «Nome sottoperiodo» | «Sottoperiodo {n}» |
| Dal | `date` | «Dal» | vuoto |
| Al | `date` | «Al» | vuoto |
| Target € | `number`, allineato a destra | «Target» | 0 |
| Premio € | `number`, allineato a destra | «Premio» | 0 |

- Pulsante `fa-solid fa-xmark` (danger), con `title` «Rimuovi sottoperiodo». È **disabilitato** quando il periodo ha un solo sottoperiodo.

**Pulsante** `.ao2-add-per`: «Aggiungi periodo», con icona `fa-solid fa-circle-plus`.

**Fascia di riepilogo** `.ao2-frag__summary`:

- «Sottoperiodi» → n;
- «Target totale» → `eur`;
- «Premio totale (v.a.)» → `eur`, in colore primary;
- «Copertura del budget» → «{copertura}%», con sotto una barra `.ao2-track` riempita a quella percentuale.

### 4.6 Fase 4 · «Riepilogo & avvio»

**Hero**, un banner blu a gradiente con testo bianco:

- A sinistra:
  - riga con `fa-solid fa-bullseye` e il nome dell'obiettivo; se il nome manca, «Nuovo obiettivo»;
  - destinatario: «Reparto {reparto}» per un obiettivo di reparto, il nome dell'assegnatario per uno individuale;
  - un tag per ogni segmento: «Prodotti», «Servizi», «Esperienze».
- A destra:
  - etichetta «Premio in palio», resa in MAIUSCOLO via CSS;
  - sotto, il premio totale `eur` in 32px.

**4 riquadri di sintesi** `.ao2-riep__stats`:

| Etichetta | Valore |
|---|---|
| «Budget lordo» | `eur(budget)` |
| «Margine ({m}%)» | `eur(margine atteso)` |
| «Target totale» | `eur(target totale)` |
| «Sottoperiodi» | n |

**«Sequenza premi»** (intestazione con `fa-solid fa-timeline`):

- per ogni periodo: il nome del periodo, con un filetto verticale a sinistra;
- per ogni sottoperiodo, una riga con:
  - `fa-solid fa-trophy` color warning;
  - il nome;
  - «target {eur}»;
  - a destra il premio `eur`.

**«Anteprima notifica»** (intestazione con `fa-solid fa-bell` e «Anteprima notifica» in grassetto). Il testo esatto, con le parti in `<strong>` segnate da `**`:

«🎯 Nuovo obiettivo «{nome o —}» per {destinatario}. In palio **{eur(premio totale)}** su {n} traguardi. La notifica verrà inviata all'avvio del **{gg/mm/aaaa hh:mm}**. In bocca al lupo!»

- Data e ora vengono da `dataAvvio`. Il default è `2026-05-01T09:00`, quindi la notifica mostra «01/05/2026 09:00».
- Nel wizard **non c'è nessun campo per modificare `dataAvvio`**: resta sempre il default.

### 4.7 Navigazione del wizard

- **Sinistra**: `sib-btn sib-btn--ghost`, icona `fa-solid fa-arrow-left` e testo «Indietro». È disabilitato nella fase 1.
- **Destra**, fasi 1–3: `sib-btn sib-btn--primary`, testo «Avanti» seguito da `fa-solid fa-arrow-right`.
- **Destra**, fase 4: `sib-btn sib-btn--primary ao2-btn-avvia`, icona `fa-solid fa-rocket-launch` e testo «Avvia obiettivo». Il pulsante pulsa in continuo.

### 4.8 Messaggi di validazione

Compaiono in `p.ao2-wiz__err` sopra il pannello, con l'icona `fa-solid fa-circle-exclamation`. Il testo è esatto, con l'apostrofo tipografico «’»:

| Fase | Condizione per proseguire | Messaggio se non soddisfatta |
|---|---|---|
| 1 | nome non vuoto, dopo `trim` | «Inserisci il nome dell’obiettivo.» |
| 2 | almeno un segmento **e** budget > 0 | «Seleziona almeno un tipo di vendita e un budget.» |
| 3 | almeno un sottoperiodo **e** target totale > 0 | «Aggiungi almeno un sottoperiodo con un target.» |

## 5. Stati e interazioni

### Stato iniziale

- Fase 1.
- Nome vuoto, tipologia «Di reparto», reparto «Commerciale», assegnatario «Andrea Grimaudo», report «Report vendite reparto».
- Segmenti: solo «Servizi». Budget 120000, margine 35, `dataAvvio` `2026-05-01T09:00`.
- Un periodo «Periodo 1» con un sottoperiodo «Sottoperiodo 1»: date vuote, target 0, premio 0.
- Nessun errore.

### Navigazione fra le fasi

- **«Avanti»**:
  - se la condizione della fase è soddisfatta, cancella l'errore e passa alla fase successiva;
  - altrimenti mostra il messaggio e resta ferma.
  - L'errore resta visibile anche quando l'utente corregge il campo: sparisce solo al successivo «Avanti» riuscito o con «Indietro».
- **«Indietro»**: cancella l'errore e torna alla fase precedente. I dati inseriti restano.
- **Clic su un pallino dello stepper**: funziona solo sulle fasi già superate (`i < step`) e ci torna. Sulla fase corrente e su quelle future non fa nulla, senza nessun segnale visivo.
- Il pannello ha `key = step`: a ogni cambio di fase si rimonta e rifà l'animazione d'ingresso.

### Fase 1

- **Tipologia**:
  - il clic su «Individuale» sostituisce il campo report in quarta posizione con «Assegnatario» e sposta il report in una nuova riga;
  - il clic su «Di reparto» ripristina la disposizione iniziale.
  - Il reparto resta comunque selezionabile e viene salvato anche per un obiettivo individuale.

### Fase 2

- Il clic su un chip lo aggiunge o lo toglie dai segmenti.
- I campi numerici convertono con `Number(valore || 0)`: un campo vuoto vale 0.
- Il margine atteso si aggiorna mentre si digita.

### Fase 3: modifica di periodi e sottoperiodi

Tutto lo stato è locale finché non si preme «Avvia».

- **«Aggiungi periodo»**: aggiunge in fondo un periodo «Periodo {n+1}», con un sottoperiodo «Sottoperiodo 1». Il nuovo riquadro entra con l'animazione `ao2-in`.
- **Pulsante + di un periodo**: aggiunge in fondo a quel periodo un sottoperiodo «Sottoperiodo {k+1}», dove k è il numero attuale di sottoperiodi.
- **Cestino del periodo**: rimuove il periodo **subito, senza conferma**.
- **X del sottoperiodo**: rimuove il sottoperiodo subito, senza conferma; è disabilitata sull'ultimo rimasto.
- **Numerazione**: dopo una rimozione i nomi esistenti restano invariati, quindi possono ripetersi. Nell'intestazione l'indice del cerchietto si ricalcola invece dalla posizione.
- **Date**: non c'è nessuna validazione, né sulla presenza né su «Dal ≤ Al».

> Scostamento dalla regola generale «Ogni eliminazione passa da una modale di conferma»: qui periodi e sottoperiodi di una **bozza** non ancora salvata si rimuovono senza conferma. Va riprodotto così, segnalato come difformità.

### Fase 4: avvio dell'obiettivo

Il clic su «Avvia obiettivo»:

1. chiama `addObiettivo` con tutti i campi, `stato: 'in-corso'` e `assegnatario` valorizzato solo se la tipologia è individuale;
2. lo store assegna l'`id` (`ob-{round(performance.now())}-{0..9999}`) e `createdAt = new Date().toISOString()`, e mette l'obiettivo **in testa** all'elenco;
3. la pagina naviga a `monitoraggio-perf`.

Cosa non succede all'avvio:

- nessun toast e nessuna conferma;
- lo stato del wizard non viene conservato: tornando sulla pagina si riparte dalla fase 1 con i default;
- la notifica mostrata in anteprima **non viene inviata**: è solo testo.

### Altro

- **Pulsante «In corso»**: naviga a `monitoraggio-perf` in qualunque fase, senza conferma. I dati del wizard vanno persi.
- La pagina non ha stati vuoti, di caricamento o d'errore propri.

## 6. Dati e regole di business

### Entità e persistenza

Entità `Obiettivo`, `Periodo` e `SottoPeriodo`: vedi la scheda 14, §6.1, oppure `01-modello-dati-e-api.md`.

Persistenza: `useObiettiviStore`, salvato in `localStorage` con chiave `sibylla.obiettivi`, persist **versione 2**. Il seed contiene 3 obiettivi (dettaglio nella scheda 14, §6.4). Il badge «In corso» ne conta 2 all'inizio.

### Formule

- `targetTotale = Σ target` di tutti i sottoperiodi.
- `premioTotale = Σ premio`.
- `nSotto` = numero totale di sottoperiodi.
- `margineAtteso = round(budgetLordo × marginePct / 100)`.
- `copertura = budgetLordo > 0 ? min(100, round(targetTotale / budgetLordo × 100)) : 0`.
- Totali del singolo periodo: `Σ target` e `Σ premio` dei suoi sottoperiodi.

### Bozza e destinatario

- Bozza (`draft`): un `Obiettivo` con `id 'draft'`, `createdAt ''` e `stato 'in-corso'`. Serve solo ai calcoli e al riepilogo; non viene salvata.
- Destinatario: «Reparto {reparto}» per un obiettivo di reparto, `assegnatario` per uno individuale.

### Formattazione

- `eur(n) = '€ ' + round(n || 0).toLocaleString('it-IT')`.
  - Con l'it-IT dei browser i numeri **sotto le 5 cifre non vengono raggruppati**: «€ 6000», ma «€ 15.000».
- `fmtDT('2026-05-01T09:00')` restituisce «01/05/2026 09:00»; un valore vuoto restituisce «—».

### Uso dell'obiettivo nelle altre pagine

Da qui in poi l'obiettivo vive nelle altre pagine:

- **Monitoraggio performance**: avanzamento live, dettaglio ed eliminazione;
- **Profile analysis**: premio di risultato, se l'obiettivo è individuale e l'assegnatario coincide con «Nome Cognome» di un dipendente;
- **HR Overview**: oggi usa dati propri e non legge lo store.

## 7. Backend da realizzare

Oggi la pagina scrive soltanto nello store locale persistito. Il contratto proposto è condiviso con la scheda 14.

### `POST /Sibylla/hr/obiettivi`

**Richiesta**: i campi del wizard. `venduto` parte da 0 in ogni sottoperiodo.

```json
{
  "nome": "Spinta commerciale primavera",
  "tipologia": "individuale",
  "reparto": "Front office",
  "assegnatario": "Andrea Grimaudo",
  "assegnatarioId": 1,
  "report": "Report upselling",
  "segmenti": ["prodotti", "servizi"],
  "budgetLordo": 120000,
  "marginePct": 35,
  "dataAvvio": "2026-05-01T09:00",
  "stato": "in-corso",
  "periodi": [
    { "nome": "Periodo 1", "sottoperiodi": [
      { "nome": "Sottoperiodo 1", "dal": "2026-05-01", "al": "2026-05-31", "target": 20000, "premio": 300, "venduto": 0 }
    ]}
  ]
}
```

**Risposta 201**: l'obiettivo completo, con `id` e `createdAt` e gli `id` di periodi e sottoperiodi generati dal server.

```json
{ "id": "ob-8f3c…", "createdAt": "2026-11-05T10:12:00.000Z", "…": "stessi campi della richiesta con gli id dei periodi/sottoperiodi" }
```

**Errori 422**, con gli stessi testi del frontend:

- `{ "campo": "nome", "errore": "Inserisci il nome dell’obiettivo." }`
- `{ "campo": "segmenti|budgetLordo", "errore": "Seleziona almeno un tipo di vendita e un budget." }`
- `{ "campo": "periodi", "errore": "Aggiungi almeno un sottoperiodo con un target." }`

Il server può aggiungere altre validazioni, ma il frontend di riferimento non le applica:

- `assegnatario` obbligatorio se la tipologia è individuale;
- `dal ≤ al`.

### Altri endpoint

- **Elenchi del wizard**: oggi le liste di reparti, assegnatari e report sono fisse nel codice (§4.3). Endpoint proposti:
  - `GET /Sibylla/hr/reparti`;
  - `GET /Sibylla/hr/dipendenti` (personale condiviso, `01-modello-dati-e-api.md`);
  - `GET /Sibylla/hr/obiettivi/report`, che restituisce le fonti KPI disponibili.

  Per la demo identica vanno restituiti esattamente i valori della §4.3.
- **Badge «In corso»**: `GET /Sibylla/hr/obiettivi?stato=in-corso`, contando gli elementi restituiti.

### Notifiche

Proposta: oggi esiste soltanto l'anteprima testuale.

- All'orario di `dataAvvio` il server invia una notifica **App Op!** con il testo dell'anteprima, senza l'emoji iniziale se il canale non la supporta.
- Destinatari: l'assegnatario, oppure tutti i dipendenti del reparto.
- La stessa notifica va anche nel **Centro notifiche** dell'HR.
- La creazione dell'obiettivo e la pianificazione della notifica vanno fatte in **un'unica transazione**.

## 8. Stile

### Token

Token SASS → CSS: `$primary = var(--color-primary)`, `$bg = var(--color-bg)`, `$border = var(--color-border)` e così via.

Valori del tema chiaro:

| Token | Valore |
|---|---|
| `--color-primary` | `#204769` |
| `--color-primary-700` | `#43617c` |
| `--color-primary-400` | `#9cacbb` |
| `--color-primary-300` | `#b3c1cc` |
| `--color-primary-200` | `#ccd5dd` |
| `--color-primary-100` | `#e6eaee` |
| `--color-primary-50` | `#f2f5f6` |
| `--color-border` | `#CFD4DA` |
| `--color-bg` | `#F8FCFF` |
| `--color-surface` | `#FFFFFF` |
| `--color-text-active` | `#4A4D53` |
| `--color-text-inactive` | `#6E7175` |
| `--color-success` | `#007035` |
| `--color-success-mid` | `#00CF86` |
| `--color-warning` | `#F57D03` |
| `--color-error` | `#FF616E` |

Font: `$font-heading` = Poppins.

### Header e messaggi

| Classe | Proprietà |
|---|---|
| `.ao2__golive` | `inline-flex; align center; gap 8px; background --color-surface; border 1px solid --color-border; radius 999px; color --color-primary; Poppins 600 13px; padding 7px 14px; cursor pointer; transition background .18s ease, border-color .18s ease` |
| `.ao2__golive:hover` | `background --color-bg; border-color --color-primary` |
| `.ao2__golive:focus-visible` | `outline 2px solid --color-primary; outline-offset 2px` |
| `.ao2__golive-badge` | `min-width 18px; height 18px; padding 0 5px; radius 9px; background --color-warning; color #fff; 11px 700; line-height 18px; center` |
| `.ao2__golive-go` | `11px; --color-text-inactive; transition transform .18s ease`; con hover sul pulsante: `translateX(2px)` e colore `--color-primary` |
| `.ao2-wiz__err` | `inline-flex; gap 8px; color --color-error; 13px; margin 10px 0` |

### Stepper

| Classe | Proprietà |
|---|---|
| `.ao2-steps__dot` | `relative; z-index 1; 42×42; tondo; border 2px solid --color-border; background --color-surface; color --color-text-inactive; 16px; flex centrato; cursor default; transition all .25s ease` |
| `.ao2-steps__label` | `12px 600; --color-text-inactive; center; transition color .2s ease` |
| `.ao2-steps__bar` | `absolute; top 21px; left 50%; width 100%; height 2px; background --color-border; z-index 0; transition background .3s ease` |
| fase attiva, pallino | `border-color --color-primary; color --color-primary; box-shadow 0 0 0 5px --color-primary-50; transform scale(1.06)` |
| fase attiva, label | `--color-primary` |
| fase completata, pallino | `border-color --color-success; background --color-success; color #fff; cursor pointer` |
| fase completata, label | `--color-text-active` |
| fase completata, barra | `--color-success` |

### Campi della fase 1

| Classe | Proprietà |
|---|---|
| `.ao2-field` | `flex column; gap 6px` |
| `.ao2-lbl` | `Poppins 12px 600; --color-primary` |
| `.ao2-lbl__hint` | `400; --color-text-inactive` |
| `.ao2-seg` | `inline-flex; background --color-bg; border 1px solid --color-border; radius 10px; padding 3px; height 34px` |
| `.ao2-seg__opt` | `inline-flex; gap 7px; border 0; transparent; --color-text-inactive; 13px 600; padding 0 14px; radius 8px; transition all .18s ease`; hover `--color-primary` |
| `.ao2-seg__opt.is-active` | `background --color-surface; --color-primary; box-shadow 0 1px 4px rgba(0,0,0,.12)` |

### Chip e calcolo della fase 2

| Classe | Proprietà |
|---|---|
| `.ao2-chips` | `flex; gap 10px; wrap` |
| `.ao2-chip` | `inline-flex; gap 8px; border 1px solid --color-border; background --color-surface; --color-text-active; 13px 600; padding 9px 14px; radius 999px; transition all .18s ease`; icona `--color-text-inactive` con `transition color .18s ease` |
| `.ao2-chip:hover` | `border-color --color-primary-300` |
| `.ao2-chip.is-active` | `border-color --color-primary; background --color-primary-50; --color-primary`; icona `--color-primary` |
| `.ao2-calc` | `flex; align center; gap 18px; wrap; background --color-bg; border 1px dashed --color-border; radius 12px; padding 14px 18px` |
| `.ao2-calc__item` | `flex column; gap 3px` |
| `.ao2-calc__k` | `12px; --color-text-inactive` |
| `.ao2-calc__v` | `Poppins 20px 800; --color-text-active` |
| `.ao2-calc__v--accent` | `--color-success` |
| `.ao2-calc__arrow` | `--color-text-inactive; 15px` |

### Fase 3: introduzione e riepilogo

| Classe | Proprietà |
|---|---|
| `.ao2-frag__intro p` | `margin 0; 13px; --color-text-inactive; line-height 1.5` |
| `.ao2-frag__summary` | `grid repeat(3, auto) 1fr; align center; gap 20px; background --color-primary-50; radius 12px; padding 14px 18px` |
| `.ao2-frag__sum-item` | `flex column; gap 2px` |
| `.ao2-frag__sum-item span` | `11px; --color-text-inactive` |
| `.ao2-frag__sum-item strong` | `Poppins 18px 800; --color-text-active` |
| `.ao2-frag__sum-item--accent strong` | `--color-primary` |
| `.ao2-frag__cover` | `flex column; gap 6px; min-width 180px` |
| `.ao2-frag__cover-head` | `flex space-between; 12px; --color-text-inactive`; `strong` `--color-primary 700` |

### Fase 3: periodi e sottoperiodi

| Classe | Proprietà |
|---|---|
| `.ao2-per` | `border 1px solid --color-border; radius 12px; overflow hidden` |
| `.ao2-per__head` | `flex; align center; gap 10px; background --color-bg; padding 8px 12px; border-bottom 1px solid --color-border` |
| `.ao2-per__idx` | `24×24 tondo; background --color-primary; #fff; 12px 700; flex centrato` |
| `.ao2-per__name` | `flex 1; min-width 0; border 1px solid transparent; transparent; Poppins 700 14px; --color-text-active; padding 4px 8px; radius 6px` |
| `.ao2-per__name:hover` | `border-color --color-border` |
| `.ao2-per__name:focus` | `outline none; border-color --color-primary; background --color-surface` |
| `.ao2-per__tot` | `12px; --color-text-inactive; nowrap` |
| `.ao2-sub` | `padding 8px 12px 12px; flex column; gap 6px` |
| `.ao2-sub__row` | `grid 1.4fr 1fr 1fr .9fr .9fr 32px; gap 8px; align center` |
| `.ao2-sub__row--head` | `11px 600; --color-text-inactive; padding 0 2px` |
| `.ao2-in` | `height 34px; border 1px solid --color-border; radius 8px; background --color-surface; --color-text-active; 13px; padding 0 10px; width 100%` |
| `.ao2-in:focus` | `outline none; border-color --color-primary; box-shadow 0 0 0 3px --color-primary-50` |
| `.ao2-in--num` | `text-align right` |
| `.ao2-add-per` | `align-self flex-start; inline-flex; gap 8px; border 1px dashed --color-primary-300; background --color-primary-50; --color-primary; 600 13px; padding 8px 14px; radius 10px; transition all .18s ease`; hover `background --color-primary-100` |
| `.ao2-icon-btn` | `30×30; radius 8px; border 1px solid --color-border; background --color-surface; --color-text-inactive; 13px; flex centrato; transition all .16s ease` |
| `.ao2-icon-btn:hover:not(:disabled)` | `border-color --color-primary; --color-primary` |
| `.ao2-icon-btn:disabled` | `opacity .4; cursor not-allowed` |
| `.ao2-icon-btn--danger:hover:not(:disabled)` | `border-color --color-error; --color-error` |
| `.ao2-track` | `relative; height 8px; radius 999px; background --color-primary-50; overflow hidden` |
| `.ao2-track__fill` | `absolute inset 0 auto 0 0; width calc(var(--pct)*1%); background linear-gradient(90deg, --color-primary-400, --color-primary); radius 999px; transition width .9s cubic-bezier(.22,1,.36,1)` |

La variante `.is-done` della barra (gradiente da `--color-success-mid` a `--color-success`) è definita nel CSS ma non viene mai usata.

### Fase 4: riepilogo

| Classe | Proprietà |
|---|---|
| `.ao2-riep__hero` | `flex; align center; space-between; gap 20px; wrap; background linear-gradient(120deg, --color-primary, --color-primary-700); radius 14px; padding 20px 22px; color #fff` |
| `.ao2-riep__eyebrow` | `inline-flex; gap 8px; Poppins 800 20px` |
| `.ao2-riep__dest` | `margin-top 4px; 13px; opacity .9` |
| `.ao2-riep__segs` | `margin-top 10px; flex; gap 6px; wrap` |
| `.ao2-tag` | `inline-flex; padding 3px 10px; radius 999px; background rgba(255,255,255,.18); 12px 600` |
| `.ao2-riep__prize` | `flex column; align flex-end; gap 2px` |
| `.ao2-riep__prize-k` | `12px; opacity .9; uppercase; letter-spacing .04em` |
| `.ao2-riep__prize-v` | `Poppins 800 32px; line-height 1` |
| `.ao2-riep__stats` | `grid repeat(4, 1fr); gap 12px` |
| `.ao2-riep__stats > div` | `flex column; gap 3px; background --color-bg; border 1px solid --color-border; radius 10px; padding 12px 14px` |
| `.ao2-riep__stats span` | `11px; --color-text-inactive` |
| `.ao2-riep__stats strong` | `Poppins 17px 800; --color-text-active` |
| `.ao2-riep__timeline-head` | `flex; gap 8px; Poppins 700 14px; --color-primary` |
| `.ao2-riep__timeline` | `list none; flex column; gap 12px` |
| `.ao2-riep__tl-per` | `border-left 2px solid --color-primary-200; padding-left 14px` |
| `.ao2-riep__tl-pname` | `700; --color-text-active; 13px` |
| `.ao2-riep__tl-subs` | `margin-top 6px; flex column; gap 6px` |
| `.ao2-riep__tl-sub` | `flex; align center; gap 10px; background --color-surface; border 1px solid --color-border; radius 10px; padding 8px 12px; 13px`; icona `--color-warning` |
| `.ao2-riep__tl-sname` | `600; --color-text-active` |
| `.ao2-riep__tl-target` | `--color-text-inactive; 12px` |
| `.ao2-riep__tl-prize` | `margin-left auto; Poppins 800; --color-primary` |
| `.ao2-riep__notif` | `border 1px solid --color-border; radius 12px; background --color-bg; padding 12px 14px` |
| `.ao2-riep__notif-head` | `flex; gap 8px; --color-primary; 13px` |
| `.ao2-riep__notif-body` | `margin-top 6px; 13px; --color-text-active; line-height 1.55` |
| `.ao2-btn-avvia` | `box-shadow 0 6px 18px rgba(0,0,0,.18); animation ao2-pulse 2.2s ease-in-out infinite` (sopra `.sib-btn--primary`) |

### Tema scuro

Non ci sono regole dedicate: i colori seguono i token del tema scuro.

| Token | Valore scuro |
|---|---|
| `--color-primary` | `#6F9BCB` |
| `--color-primary-700` | `#1F2733` |
| `--color-primary-50` | `#232C3A` |
| `--color-surface` | `#1A1E26` |
| `--color-border` | `#2B313D` |
| `--color-bg` | `#12151B` |
| `--color-success` | `#34D399` |
| `--color-warning` | `#F5A623` |
| `--color-error` | `#FF6B78` |

Effetti visibili:

- l'hero passa a un gradiente da `#6F9BCB` a `#1F2733`;
- il testo bianco dell'hero resta bianco.

## 9. Responsività

Solo **media query sul viewport**: nessuna container query.

| Soglia | Cosa cambia |
|---|---|
| `max-width: 720px` | `.ao2-grid--2` → 1 colonna; `.ao2-frag__summary` → `1fr 1fr` con gap 14px; `.ao2-riep__stats` → `repeat(2, 1fr)` |
| `max-width: 860px` | `.ao2-sub__row` → `1fr 1fr` e la riga d'intestazione `--head` nascosta |

Comportamento alle larghezze di riferimento:

- A 1366 px con sidenav aperta e a 1920 px vale il layout pieno a 2 colonne.
- Il pannello si allarga con il contenuto della pagina: non c'è una larghezza massima.

Elementi che vanno a capo:

- stepper: le etichette sono testi corti e restano su una riga;
- `.ao2-calc`, chip e hero: vanno a capo (`flex-wrap`);
- totali del periodo: restano su una riga (`nowrap`).

Non ci sono tabelle con scroll orizzontale: la griglia dei sottoperiodi si comprime con le frazioni `fr`.

## 10. Effetti e animazioni

| Elemento | Effetto |
|---|---|
| Pannello della fase | `.ao2-anim` → `ao2-in .35s ease both`: da `opacity 0; translateY(10px)` a `opacity 1; translateY(0)`. Si ripete a ogni cambio di fase (key = step) |
| Riquadro di un periodo | `.ao2-anim`, la stessa animazione al primo montaggio: entra quando lo si aggiunge e insieme alla fase 3 |
| Pallini dello stepper | `transition all .25s ease`. Quello attivo cresce a `scale(1.06)` con l'alone di 5px `--color-primary-50`; quello completato diventa verde pieno con il segno di spunta |
| Linea dello stepper | `background .3s ease`: diventa verde dopo la fase |
| Label dello stepper | `color .2s ease` |
| Barra «Copertura del budget» | `width .9s cubic-bezier(.22, 1, .36, 1)` |
| «Avvia obiettivo» | `ao2-pulse 2.2s ease-in-out infinite`: `translateY(0 → −2px → 0)`, a metà ciclo, con ombra `0 6px 18px rgba(0,0,0,.18)` |
| Pulsante «In corso» | sfondo e bordo `.18s ease`; la freccia si sposta di 2px a destra in `.18s ease` |
| Chip, segmentato, «Aggiungi periodo» | `all .18s ease` |
| Pulsanti icona | `all .16s ease` |

È definito anche il keyframe `ao2-glow` (`scale 1 → 1.4 → 1`), che oggi nessun elemento usa.

**`prefers-reduced-motion`**: nessuna regola propria. Vale la regola globale della piattaforma: durate di animazioni e transizioni a `.01ms` e una sola iterazione. Il pulsante «Avvia» smette di pulsare e i passaggi di fase diventano istantanei.

## 11. Accessibilità

- Pallini dello stepper: `button type="button"` con `aria-label` uguale al titolo della fase. Restano focalizzabili anche quando sono inattivi.
- Gli input di periodi e sottoperiodi hanno `aria-label`:
  - «Nome periodo»;
  - «Nome sottoperiodo»;
  - «Dal»;
  - «Al»;
  - «Target»;
  - «Premio».
- I pulsanti icona hanno `title` nativo: «Aggiungi sottoperiodo», «Rimuovi periodo», «Rimuovi sottoperiodo». Non hanno `aria-label`.
- Label personalizzate:
  - le label «Tipologia» e «Tipologia di vendita» (`label.ao2-lbl`) non sono associate a un controllo;
  - le opzioni del segmentato e i chip sono `button` senza `aria-pressed`.
- `InputField` e `SelectField` hanno la label associata (componenti condivisi).
- Focus:
  - il pulsante «In corso» ha `:focus-visible` con outline di 2px;
  - gli input `.ao2-in` hanno un anello di focus di 3px `--color-primary-50`.
- Tastiera: non ci sono scorciatoie. Invio dentro un input non fa avanzare il wizard, perché il wizard non è un `form`.

## 12. Criteri di accettazione

1. Il titolo è «Premio performance» e il sottotitolo è esatto. Il pulsante «In corso» mostra il badge arancio «2» con i dati seed e porta a Monitoraggio performance.
2. Lo stepper mostra 4 pallini da 42px con le etichette «Dati obiettivo», «Vendita & budget», «Periodi & premi» e «Riepilogo & avvio». Quello attivo ha l'alone ed è leggermente ingrandito.
3. «Avanti» con il nome vuoto mostra «Inserisci il nome dell’obiettivo.» in rosso e non avanza.
4. Con «Individuale» il quarto campo diventa «Assegnatario» (Andrea Grimaudo, Piero Aragona, Marco Campo, Giulia Neri, Ali Aslan) e «Fonte dati / KPI (report)» passa nella riga sotto.
5. Nella fase 2 «Servizi» è preselezionato con la spunta. Togliendo tutti i chip, «Avanti» mostra «Seleziona almeno un tipo di vendita e un budget.».
6. Con budget 120000 e margine 35 il riquadro mostra «€ 120.000 → Margine atteso (35%) € 42.000», con il margine in verde.
7. Nella fase 3 «Avanti» con il target a 0 mostra «Aggiungi almeno un sottoperiodo con un target.». Con un target di 20000 e il budget di 120000, «Copertura del budget» indica «17%» e la barra si riempie in 0,9 s.
8. «Aggiungi periodo» aggiunge «Periodo 2» con «Sottoperiodo 1», che entra con un'animazione di 0,35 s. Il cestino del periodo compare solo con almeno 2 periodi. La X dell'ultimo sottoperiodo è disabilitata, con opacità 0,4.
9. I totali del periodo «Target € … · Premio € …» e la fascia «Sottoperiodi / Target totale / Premio totale (v.a.)» si aggiornano mentre si digita.
10. Nella fase 4 ci sono, nell'ordine:
    - l'hero blu con il nome, «Reparto Commerciale» oppure il nome della persona, i tag dei segmenti, «PREMIO IN PALIO» e l'importo in 32px;
    - 4 riquadri;
    - «Sequenza premi» con un trofeo arancio per ogni sottoperiodo;
    - l'anteprima con il testo esatto, che termina con «…all'avvio del 01/05/2026 09:00. In bocca al lupo!».
11. Il pulsante «Avvia obiettivo» oscilla di 2px ogni 2,2 s. Il clic salva l'obiettivo e apre Monitoraggio performance, dove il nuovo obiettivo compare con il filtro «In corso». Il badge «In corso», tornando qui, sale a «3».
12. Il clic sul pallino di una fase già superata riporta a quella fase con i dati inseriti; il clic su una fase futura non fa nulla.
13. Sotto i 720 px di viewport i campi vanno su una colonna. Sotto gli 860 px le righe dei sottoperiodi passano a 2 colonne senza intestazione.
14. In tema scuro le superfici sono `#1A1E26` e l'hero va da `#6F9BCB` a `#1F2733`, con il testo bianco.
15. Non esiste nessuna vista «In corso» con anelli o countdown dentro questa pagina.

## 13. File sorgente

- `src/router/PageContent.tsx` (route `assegna-obiettivo`)
- `src/modules/hr/AssegnaObiettivo/AssegnaObiettivo.tsx`
- `src/modules/hr/AssegnaObiettivo/AssegnaObiettivo.sass`
- `src/store/useObiettiviStore.ts`
- `src/core/components/PageHead.tsx`, `src/core/components/form/InputField.tsx`, `src/core/components/form/SelectField.tsx`
- `src/styles/_colors.sass`, `src/styles/_spacing.sass`, `src/styles/_themes.sass`, `src/styles/_components.sass` (riduzione del movimento globale)
- `src/navigation/menu.ts`, `src/navigation/pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`, `src/modules/home/Timone/Timone.tsx`
- Storico: commit `cad851d` (rimozione della vista real-time) e `a9bff05` (redesign del wizard)
