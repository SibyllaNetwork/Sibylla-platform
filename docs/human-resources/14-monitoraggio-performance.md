# 14 · Monitoraggio performance

Scheda di riproduzione della pagina **Monitoraggio performance**. È la vista di controllo degli obiettivi del Premio performance: ogni obiettivo è una **pista** con un omino che corre verso i traguardi. I traguardi sono i sottoperiodi, ciascuno con un premio in €. Una modalità **Live** fa avanzare il venduto in tempo reale.

È anche la **vista real-time** degli obiettivi avviati da «Assegna obiettivo» (scheda 15). La pagina Assegna obiettivo non ha più una vista "In corso" propria: il suo pulsante «In corso» e l'avvio di un obiettivo portano qui.

Rimandi:
- `PageHead`, `SelectField`, `SearchField`, `Modal`, `Tooltip`, `ConfirmDialog` / `useConfirmStore`, `.sib-btn`, avatar → `00-fondamenta.md`;
- entità `Obiettivo` e store `useObiettiviStore` → `01-modello-dati-e-api.md`, riassunti qui in §6.

---

## 1. Scopo e utenti

- **Scopo**: controllare a che punto sono gli obiettivi di vendita assegnati a reparti o a singole persone. Per ogni obiettivo si vedono:
  - quanto è stato venduto sul target;
  - quali traguardi (sottoperiodi) sono stati raggiunti;
  - quanto premio è maturato su quello in palio;
  - lo stato sintetico: Raggiunto, In linea o A rischio.
- Dal dettaglio si legge ogni traguardo e si può **eliminare** l'obiettivo: è l'unico punto della piattaforma dove si elimina un obiettivo.
- **Utenti**: l'ufficio del personale, il responsabile HR e la direzione.

## 2. Accesso

- **Id pagina / route**: `monitoraggio-perf`, senza parametri.
- **Sidenav**: Human Resources › Gestione dei premi › **Monitoraggio performance**. Icona di menu `fa-chart-line`. La stessa voce c'è nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: nessuno. In alto a sinistra c'è il pulsante Indietro standard del `PageHead` (`back` di default `true`). Il CSS lo allinea a sinistra: `.mon-perf > .sib-btn--back { align-self: flex-start }`.
- **Da dove si arriva**:
  - dalla sidenav;
  - da «Assegna obiettivo»: pulsante «In corso» nell'header e pulsante «Avvia obiettivo» a fine wizard;
  - da «Profile analysis»: icona ↗ nella card Premio di risultato;
  - da «HR Overview»: freccia nella card Obiettivi.
- **Verso dove si naviga**: nessuna navigazione in uscita. Il componente riceve `navigate` ma non lo usa.
- **Sottotitolo di catalogo** (`pageSubtitles.ts`): «Controllo e analisi dei risultati e delle performance del personale». In pagina il sottotitolo è più lungo (§4).

## 3. Layout

Il root `.mon-perf` è `container: mon-perf / inline-size; display: flex; flex-direction: column; align-items: stretch; gap: 14px; font-size: 13px` (la container query compatta il board, §9). La pagina scorre normalmente in verticale: non è una pagina BI a schermo fisso.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]          Monitoraggio performance          [● Live · in aggiornamento ⏸] │ PageHead
│        Controllo e analisi dei risultati … in tempo reale                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Stato▾ 170   Tipologia▾ 170   Reparto▾ 170   Cerca [🔍 ……… 220]              │ toolbar (gap 12, wrap)
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌ board (border 1px, radius 12, padding 8 18 18, nessuno scroll orizzontale) ─┐ │
│ │ Obiettivo            Reparto   Percorso premi                Premio maturato │ │ riga intestazione
│ │ ─────────────────────────────────────────────────────────────────────────── │ │
│ │ (◯) Upselling recep.   [ico]   €250      €350           €400   ⚠ A rischio   │ │
│ │     A. Grimaudo · Front off.   ══🏆════🏃───○──────────────○   € 250 / € 1000 │ │ riga = button
│ │                                                                1/3 traguardi · 43% │ │
│ │ ─────────────────────────────────────────────────────────────────────────── │ │
│ │ (◎) Spinta comm. est.  [ico]   …                                            │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│     2 obiettivi monitorati · avanzamento medio 34% · premi maturati € 650 su € 4000 │ riepilogo centrato
└──────────────────────────────────────────────────────────────────────────────┘
```

**Toolbar** (`.mon-perf__bar`):
- `display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-top: 4px`;
- ogni campo è un `.mon-perf__field`: `flex column; gap 6px`.

**Board** (`.mon-perf__board`):
- un contenitore con dentro `.mon-perf__board-scroll` (`min-width: 0`): **il board non scorre mai in orizzontale**;
- **ogni riga è una griglia** `grid-template-columns: minmax(0, 1.3fr) 64px minmax(0, 2fr) 170px; grid-template-areas: "name rep track maturato"; align-items: center; gap: 12px`;
- le quattro colonne sono Obiettivo, Reparto, Percorso premi, Premio maturato; sotto le soglie del §9 la Reparto sparisce e poi la pista va sotto nome e premio.

**Riepilogo** (`.mon-perf__summary`): sotto il board, testo centrato.

**Modale «Dettaglio obiettivo»**: `Modal` `size="lg"` (`max-width: 600px`, padding 24px, radius 16px). Il contenuto `.mon-perf__detail` è `flex column; gap 14px` e contiene, nell'ordine:
- intestazione;
- barra di avanzamento;
- elenco dei traguardi per periodo;
- azioni.

## 4. Elementi e testi

### 4.1 Header

- Titolo: «Monitoraggio performance».
- Sottotitolo: «Controllo e analisi dei risultati e delle performance del personale, con premi maturati in tempo reale».
- **Pulsante Live** (`button.mon-perf__live`, classe `is-live` quando attivo). Contiene un pallino, un testo e un'icona:

| Stato | Testo | Icona | Aspetto |
|---|---|---|---|
| attivo | «Live · in aggiornamento» | `fa-solid fa-pause` | pallino verde che pulsa |
| in pausa | «In pausa» | `fa-solid fa-play` | pallino grigio |

### 4.2 Toolbar

| Campo | Componente | Opzioni (valore → testo) | Default |
|---|---|---|---|
| «Stato» | `SelectField name="stato"`, classe `mon-perf__select` (170px) | `in-corso` → «In corso» · `concluso` → «Conclusi» · `tutti` → «Tutti» | «In corso» |
| «Tipologia» | `SelectField name="tipologia"` (170px) | `tutte` → «Tutte» · `reparto` → «Di reparto» · `individuale` → «Individuale» | «Tutte» |
| «Reparto» | `SelectField name="reparto"` (170px) | «Tutti», poi i reparti distinti presenti negli obiettivi in ordine alfabetico. Con i dati seed: «F&B», «Front office» | «Tutti» |
| «Cerca» | label HTML semplice più `SearchField name="search"`, classe `mon-perf__search` (220px) | placeholder «Obiettivo, persona o reparto»; la X di cancellazione svuota il campo | vuoto |

### 4.3 Board: intestazione

Celle `.mon-perf__row--head`, in **case normale** (mai maiuscolo), su una riga con ellipsis:
- «Obiettivo»
- «Reparto»
- «Percorso premi»
- «Premio maturato»

### 4.4 Board: riga obiettivo

Ogni riga è `button.mon-perf__row.mon-perf__row--emp`.

**Colonna «Obiettivo»**:
- obiettivo individuale: avatar tondo 30px `img.mon-perf__avatar`, con `src = avatarUrl(assegnatario)`. L'avatar è uno dei 50 SVG `/avatars/avatar-NN.svg`, scelto con un hash stabile del nome;
- obiettivo di reparto: cerchio 30px `.mon-perf__icon-circle` con l'icona del reparto, `fa-light {icona}` (tabella sotto). Se il reparto non è in tabella si usa `fa-users`;
- accanto, due righe con ellipsis:
  - riga 1: nome dell'obiettivo;
  - riga 2: per un individuale «{assegnatario} · {reparto}» (es. «Andrea Grimaudo · Front office»); per un obiettivo di reparto, «Reparto {reparto}».
  - entrambe con `TruncatedText`: se il testo è troncato, all'hover il Tooltip scuro mostra il testo intero.

**Colonna «Reparto»**: icona `fa-light {icona del reparto}` (fallback `fa-user`), 18px, color primary. Tooltip con il nome del reparto.

**Icone per reparto (`REPARTO_ICON`, stile `fa-light`)**:

| Reparto | Icona |
|---|---|
| Commerciale | `fa-hand-holding-dollar` |
| Front office | `fa-bell-concierge` |
| F&B | `fa-martini-glass` |
| Housekeeping | `fa-broom` |
| Manutenzione | `fa-screwdriver-wrench` |
| Amministrazione | `fa-calculator` |
| Cucina | `fa-hat-chef` |
| Marketing | `fa-bullhorn` |
| Direzione | `fa-user-tie` |

Le icone `fa-light` richiedono Font Awesome Pro, già in uso nella piattaforma (vedi `00-fondamenta.md`).

**Colonna «Percorso premi»**: due fasce sovrapposte.

1. **Premi** (`.mon-perf__premi`, alta 26px): per ogni traguardo c'è un'etichetta di testo `.mon-perf__premio-eur` (senza sfondo né bordo), posizionata a `left: pos%` e centrata con `translateX(-50%)`.
   - Il testo è `eurShort(premio)`, senza spazio dopo il simbolo: «€400».
   - Il traguardo raggiunto ha la classe `is-on` (oro).
   - Tooltip: «{nome sottoperiodo} — premio {eur(premio)}», con trattino lungo. Esempio: «1ª quindicina — premio € 400».
2. **Pista** (`.mon-perf__track`, alta 26px), composta da:
   - una linea di fondo;
   - la barra di avanzamento, larga `pct%` dell'obiettivo;
   - un nodo tondo 22px per traguardo a `left: pos%`: il nodo raggiunto (`is-on`, oro) contiene `fa-solid fa-trophy`, quello non raggiunto è vuoto. Ogni nodo ha il Tooltip scuro «{nome sottoperiodo} — premio {eur(premio)}», con « · raggiunto» in coda se raggiunto (serve soprattutto sotto 640 px, dove le etichette dei premi spariscono);
   - l'omino `fa-solid fa-person-running` a `left: pct%`, sopra la linea, con Tooltip scuro «{pct}% · {raggiunti}/{totale} traguardi», per esempio «43% · 1/3 traguardi» (`aria-label` «Avanzamento {pct}%»).
   - La posizione di ogni traguardo è il **target cumulato**: `pos = min(100, round(cumTarget / targetTotale × 100))`.

**Colonna «Premio maturato»**, allineata a destra, in colonna:
- stato in testo colorato con icona, senza sfondo (`.mon-perf__stato--{stato}`, case normale): `fa-circle-check` «Raggiunto» (verde), `fa-circle-half-stroke` «In linea» (azzurro link), `fa-triangle-exclamation` «A rischio» (arancio);
- importo «{eur(premio sbloccato)} / {eur(premio totale)}». La parte «/ …» è un `<em>` più piccolo e grigio. Esempio: «€ 250 / € 1000»;
- riga «{raggiunti}/{totale} traguardi · {pct}%», per esempio «1/3 traguardi · 43%».

**Stato vuoto**: se nessun obiettivo corrisponde ai filtri, al posto delle righe compare `.mon-perf__empty` con il testo «Nessun obiettivo per i filtri selezionati.».

### 4.5 Riepilogo

Il testo è «**{n}** obiettivi monitorati · avanzamento medio **{media}%** · premi maturati **{eur}** su **{eur}**». I valori tra asterischi sono in `<strong>`.
- È calcolato sugli obiettivi filtrati.
- Il plurale «obiettivi» è fisso, anche con n = 1 o 0.
- Con 0 obiettivi la media vale 0.

### 4.6 Modale «Dettaglio obiettivo»

- **Titolo** della modale: «Dettaglio obiettivo». Ha una X di chiusura in alto a destra.
- **Intestazione** (`.mon-perf__detail-head`, flex con gap 14px):
  - avatar tondo 52px (individuale) oppure cerchio 52px con l'icona del reparto a 22px;
  - nome (16px, 700);
  - riga «{assegnatario} · Reparto {reparto} · {report}». La parte «{assegnatario} · » c'è solo per gli individuali. Esempio: «Andrea Grimaudo · Reparto Front office · Report upselling»;
  - riga con l'icona `fa-solid fa-tags` e i segmenti uniti da « · », **con le chiavi grezze in minuscolo**: «prodotti · servizi»;
  - a destra (`margin-left: auto`), lo stato in testo colorato con la stessa icona della riga: «Raggiunto», «In linea» oppure «A rischio».
- **Avanzamento**:
  - testo «Venduto **{eur(venduto)}** su {eur(target)} — **{pct}%** · premio maturato **{eur(sbloccato)}** / {eur(totale)}»;
  - sotto, una barra alta 10px riempita al `pct%`.
- **«Traguardi e premi»** (etichetta): per ogni periodo compare il nome del periodo (12px 700 primary). Segue l'elenco dei sottoperiodi, ognuno in un riquadro con bordo:
  - nodo tondo 22px: se raggiunto `fa-solid fa-trophy` su **oro `#C9A227`** con alone `0 0 0 3px rgba(201,162,39,.18)`, lo stesso colore del traguardo raggiunto sulla pista; altrimenti `fa-solid fa-hourglass-half` su grigio (`--color-border`);
  - nome del sottoperiodo in grassetto;
  - riga meta «{eur(venduto)} / {eur(target)} · {spct}%», seguita da « · scad. gg/mm/aaaa» se c'è la data `al`;
  - a destra l'importo del premio `eur(premio)`;
  - se raggiunto, la dicitura verde «Sbloccato» con l'icona `fa-solid fa-lock-open` (testo, senza sfondo).
- **Azioni** (in fondo a destra, sopra un bordo superiore): pulsante `sib-btn sib-btn--danger sib-btn--sm` con l'icona `fa-solid fa-trash` e il testo «Elimina obiettivo».
- **Conferma eliminazione** (`ConfirmDialog` della piattaforma, `danger: true`):
  - titolo «Conferma eliminazione»;
  - messaggio «Eliminare l'obiettivo «{nome}»?», con le virgolette caporali attorno al nome come nel codice;
  - pulsanti «Annulla» e «Elimina».

## 5. Stati e interazioni

- **Stato iniziale**:
  - Live attivo: ogni ingresso nella pagina riparte attivo;
  - Stato «In corso», Tipologia «Tutte», Reparto «Tutti», ricerca vuota;
  - nessuna modale aperta.
- **Live**:
  - Con Live attivo, ogni **1800 ms** (`setInterval`) viene chiamata `avanzaProgresso()` sullo store (§6.3). La pausa ferma il timer.
  - Le barre e l'omino si spostano con una transizione di 0,8 s.
  - Quando un sottoperiodo raggiunge il target, il nodo diventa oro con il trofeo e l'etichetta del premio diventa oro scuro.
  - L'ordine delle righe si aggiorna: sono ordinate per avanzamento decrescente.
- **Filtri**: si combinano in AND, nell'ordine:
  1. stato: `tutti`, oppure `o.stato === stato`;
  2. reparto;
  3. tipologia;
  4. ricerca: testo minuscolo e senza spazi ai bordi, contenuto nel nome **oppure** nell'assegnatario **oppure** nel reparto.
- **Ordinamento**: per `avanzamentoPct` decrescente. Non c'è un ordinamento modificabile dall'utente.
- **Paginazione**: assente.
- **Hover su una riga**: sfondo `--color-primary-50`.
- **Clic su una riga**: apre la modale di dettaglio con **una copia dell'obiettivo presa al momento del clic**. Con Live attivo la modale non si aggiorna mentre è aperta; per vedere i valori nuovi la si riapre.
- **Chiusura della modale**: X, clic sullo sfondo o tasto Esc.
- **Eliminazione**:
  1. clic su «Elimina obiettivo»;
  2. si apre la conferma;
  3. «Elimina» rimuove l'obiettivo dallo store (persistito) e chiude la modale; «Annulla» oppure Esc lasciano tutto com'è.
  - Nessun toast.
- **Tooltip**: sempre il componente `Tooltip` scuro (nessun `title` nativo): etichette dei premi, nodi dei traguardi, omino, icona del reparto, nome e sottotitolo troncati.
- Nessuno stato di caricamento o d'errore: i dati sono locali.

## 6. Dati e regole di business

### 6.1 Entità (`useObiettiviStore`, persist `localStorage` chiave `sibylla.obiettivi`, versione 3)

La versione 3 porta i due obiettivi di esempio sui reparti reali dell'HR: `migrate` cambia «Commerciale» → «F&B» su `ob-commerciale-q2` e «Marketing» → «Front office» su `ob-esperienze-inverno`; gli obiettivi creati dall'utente restano invariati.

```ts
type Segmento = 'prodotti' | 'servizi' | 'esperienze'
type TipologiaObiettivo = 'reparto' | 'individuale'
type StatoObiettivo = 'bozza' | 'in-corso' | 'concluso'
interface SottoPeriodo { id: string; nome: string; dal?: string /*yyyy-mm-dd*/; al?: string; target: number /*€*/; premio: number /*€*/; venduto: number /*€*/ }
interface Periodo { id: string; nome: string; sottoperiodi: SottoPeriodo[] }
interface Obiettivo {
  id: string; nome: string; tipologia: TipologiaObiettivo; reparto?: string; assegnatario?: string
  report: string; segmenti: Segmento[]; budgetLordo: number; marginePct: number
  dataAvvio: string /*yyyy-mm-ddThh:mm*/; stato: StatoObiettivo; periodi: Periodo[]; createdAt: string
}
```

### 6.2 Formule (funzioni pure dello store)

- `tuttiSotto(o)` = i sottoperiodi di tutti i periodi, in ordine.
- `targetTotale(o) = Σ target`.
- `vendutoTotale(o) = Σ min(venduto, target)`.
- `premioTotale(o) = Σ premio`.
- `premioSbloccato(o) = Σ premio` dei soli sottoperiodi con `target > 0` **e** `venduto ≥ target`.
- `avanzamentoPct(o) = targetTotale > 0 ? min(100, round(vendutoTotale / targetTotale × 100)) : 0`.

Regole proprie della pagina:

- **Stato sintetico** (`statoAvanzamento` dello store, con `STATO_AVANZAMENTO_LABEL`; lo usa anche HR Overview):
  - `o.stato === 'concluso'` → «Raggiunto»;
  - altrimenti `pct ≥ 100` → «Raggiunto»;
  - `pct ≥ 50` → «In linea»;
  - sotto → «A rischio».
- **Traguardo raggiunto**: `target > 0 && venduto ≥ target`.
- **Avanzamento di un sottoperiodo** (nella modale): `spct = target > 0 ? min(100, round(venduto / target × 100)) : 0`.
- **Riepilogo**:
  - `media = round(Σ pct / n)`;
  - premi maturati = `Σ premioSbloccato`;
  - premi totali = `Σ premioTotale`.

Formati:

- `eur(n) = '€ ' + round(n).toLocaleString('it-IT')`. Con l'it-IT dei browser **le cifre sotto le 5 non vengono raggruppate**: «€ 4000», «€ 15.000», «€ 120.000».
- `eurShort(n)` = stesso formato senza lo spazio: «€400», «€1200».
- Date `yyyy-mm-dd` → «gg/mm/aaaa»; un valore mancante → «—».

### 6.3 Avanzamento in tempo reale (`avanzaProgresso`, simulazione)

Per ogni obiettivo con `stato === 'in-corso'`, solo il **primo** sottoperiodo non ancora completo (nell'ordine periodi → sottoperiodi) avanza:

```
delta = max(1, round(target × (0.08 + Math.random() × 0.14)))   // dall'8% al 22% del target
venduto = min(target, venduto + delta)
```

- Gli obiettivi `concluso` e `bozza` non si muovono.
- Lo stato non passa mai automaticamente a `concluso`, nemmeno al 100%.
- Ogni avanzamento viene **salvato** in `localStorage`: alla visita successiva i valori sono quelli raggiunti.
- È l'unica parte non deterministica della demo.

### 6.4 Dati seed (3 obiettivi)

| id | Nome | Tipologia | Reparto / assegnatario | Report | Segmenti | Budget · M.U. | Avvio | Stato |
|---|---|---|---|---|---|---|---|---|
| `ob-commerciale-q2` | «Spinta commerciale estate» | reparto | F&B | Report vendite reparto | servizi, esperienze | 120.000 € · 35% | 2026-08-01T09:00 | in-corso |
| `ob-upsell-front` | «Upselling reception» | individuale | Front office · Andrea Grimaudo | Report upselling | prodotti, servizi | 24.000 € · 40% | 2026-08-01T09:00 | in-corso |
| `ob-esperienze-inverno` | «Esperienze inverno» | reparto | Front office | Report esperienze / attività | esperienze | 40.000 € · 30% | 2026-01-07T09:00 | concluso |

Sottoperiodi (nome · dal–al · target · premio · venduto iniziale):

- **Spinta commerciale estate** (`createdAt` 2026-07-20T09:00:00.000Z)
  - Agosto:
    - «1ª quindicina» · 01–15/08/2026 · 15.000 · 400 · 15.000
    - «2ª quindicina» · 16–31/08 · 15.000 · 400 · 11.200
  - Settembre:
    - «1ª quindicina» · 01–15/09 · 18.000 · 500 · 0
    - «2ª quindicina» · 16–30/09 · 18.000 · 500 · 0
  - Ottobre:
    - «Mese pieno» · 01–31/10 · 40.000 · 1.200 · 0
- **Upselling reception** (`createdAt` 2026-07-22T09:00:00.000Z)
  - Agosto: «Mese pieno» 01–31/08 · 6.000 · 250 · 6.000
  - Settembre: «Mese pieno» 01–30/09 · 9.000 · 350 · 4.300
  - Ottobre: «Mese pieno» 01–31/10 · 9.000 · 400 · 0
- **Esperienze inverno** (`createdAt` 2025-12-20T09:00:00.000Z)
  - Gennaio: «Mese pieno» 07–31/01/2026 · 12.000 · 500 · 12.000
  - Febbraio: «Mese pieno» 01–28/02 · 12.000 · 500 · 12.000

Valori attesi con i dati seed, **prima** di qualunque avanzamento Live:

| Obiettivo | pct | Stato | Premio | Traguardi | Posizioni (%) |
|---|---|---|---|---|---|
| Upselling reception | 43% | «A rischio» | «€ 250 / € 1000» | 1/3 | 25, 63, 100 |
| Spinta commerciale estate | 25% | «A rischio» | «€ 400 / € 3000» | 1/5 | 14, 28, 45, 62, 100 |
| Esperienze inverno (con filtro «Conclusi» o «Tutti») | 100% | «Raggiunto» | «€ 1000 / € 1000» | 2/2 | — |

Riepilogo con il filtro «In corso»: «2 obiettivi monitorati · avanzamento medio 34% · premi maturati € 650 su € 4000».

Gli obiettivi creati con «Assegna obiettivo» compaiono **in cima allo store**, perché vengono anteposti. Qui però l'ordine visualizzato è sempre per avanzamento.

## 7. Backend da realizzare

Oggi è tutto in `useObiettiviStore`, persistito in `localStorage`, con l'avanzamento simulato da `Math.random`. Il contratto proposto, condiviso con la scheda 15 e da allineare a `01-modello-dati-e-api.md`, è questo.

**`GET /Sibylla/hr/obiettivi?stato=in-corso|concluso|tutti&reparto=&tipologia=reparto|individuale&q=`**

Risposta 200: un array di `Obiettivo` (§6.1) con il `venduto` aggiornato di ogni sottoperiodo. I derivati (`pct`, `premioSbloccato`, …) restano calcolati dal frontend con le formule della §6.2. Il filtro e l'ordinamento possono restare lato client.

```json
[{
  "id": "ob-upsell-front", "nome": "Upselling reception", "tipologia": "individuale",
  "reparto": "Front office", "assegnatario": "Andrea Grimaudo", "assegnatarioId": 1,
  "report": "Report upselling", "segmenti": ["prodotti", "servizi"],
  "budgetLordo": 24000, "marginePct": 40, "dataAvvio": "2026-08-01T09:00", "stato": "in-corso",
  "createdAt": "2026-07-22T09:00:00.000Z",
  "periodi": [{ "id": "pu-ago", "nome": "Agosto", "sottoperiodi": [
    { "id": "su-ago", "nome": "Mese pieno", "dal": "2026-08-01", "al": "2026-08-31", "target": 6000, "premio": 250, "venduto": 6000 }
  ]}]
}]
```

**Aggiornamento in tempo reale**: il venduto deve arrivare dal report indicato in `report` (vendite, upselling, F&B…). Due possibilità:
- SSE su `GET /Sibylla/hr/obiettivi/stream`, che emette eventi `{ "obiettivoId": "…", "sottoperiodoId": "…", "venduto": 7300 }`;
- polling della lista ogni 1800 ms mentre Live è attivo, lo stesso ritmo della demo.

La pausa Live sospende stream o polling. Il server deve anche:
- passare a `concluso` gli obiettivi la cui ultima data `al` è passata;
- **mai** far diminuire il `venduto` dopo uno sblocco già notificato.

**`DELETE /Sibylla/hr/obiettivi/{id}`** → 204. Errori:
- 404 `{ "errore": "Obiettivo non trovato" }`;
- 409 se l'obiettivo ha premi già liquidati in busta. Messaggio proposto: «L'obiettivo ha premi già liquidati: non può essere eliminato.»

**Notifiche** (proposta, oggi assenti):
- quando un sottoperiodo passa a «Sbloccato», notifica App Op! all'assegnatario o ai dipendenti del reparto e voce nel Centro notifiche dell'HR;
- la scrittura di `venduto` e l'emissione della notifica devono essere idempotenti per sottoperiodo.

## 8. Stile

Token SASS → CSS: `$primary = var(--color-primary)`, `$border = var(--color-border)` e così via. Valori del tema chiaro alla prima comparsa:

| Token | Valore |
|---|---|
| `--color-primary` | `#204769` |
| `--color-primary-400` | `#9cacbb` |
| `--color-primary-50` | `#f2f5f6` |
| `--color-border` | `#CFD4DA` |
| `--color-bg` | `#F8FCFF` |
| `--color-surface` | `#FFFFFF` |
| `--color-text-active` | `#4A4D53` |
| `--color-text-inactive` | `#6E7175` |
| `--color-success` | `#007035` |
| `--color-success-light` | `#E4F8EE` |
| `--color-link` | `#5C9CD4` |
| `--color-link-light` | `#EBF4FB` |
| `--color-warning` | `#F57D03` |
| `--color-warning-light` | `#FFF3E0` |

Font: `$font-heading` = Poppins.

### Toolbar e pulsante Live

| Classe | Proprietà |
|---|---|
| `.mon-perf__field label` | `font-family Poppins; 12px; color --color-primary; 600` |
| `.mon-perf__field .sib-input, .sib-select` | `width: 100%` |
| `.mon-perf__select` | `width 170px` |
| `.mon-perf__search` | `width 220px` |
| `.mon-perf__live` | `inline-flex; align center; gap 9px; border 1px solid --color-border; background --color-surface; color --color-text-inactive; 12px 700; padding 7px 14px; radius --radius-md (6px); nowrap; cursor pointer` |
| `.mon-perf__live.is-live` | `border-color --color-success; color --color-success` |
| `.mon-perf__live-dot` | 9×9 tondo, `background --color-text-inactive`; attivo: `background --color-success; animation mon-perf-pulse 1.4s ease-in-out infinite` |

### Board e righe

| Classe | Proprietà |
|---|---|
| `.mon-perf__board` | `border 1px solid --color-border; radius 12px; background --color-surface; padding 8px 18px 18px` (nessun `overflow-x`) |
| `.mon-perf__board-scroll` | `min-width 0` |
| `.mon-perf__row` | `grid minmax(0,1.3fr) 64px minmax(0,2fr) 170px; areas "name rep track maturato"; align center; gap 12px` |
| `.mon-perf__row--head` | `padding 8px 0 6px; border-bottom 1px solid --color-border; 12px 600; case normale; --color-text-inactive`; ogni cella `overflow hidden; ellipsis; nowrap` |
| `.mon-perf__row--emp` | `width 100%; transparent; border none; border-bottom 1px solid --color-border; padding 14px 0; cursor pointer; text-align left; font inherit 13px`; l'ultima riga senza bordo |
| `.mon-perf__row--emp:hover` | `background --color-primary-50` |
| `.mon-perf__c-name` | `inline-flex; align center; gap 10px; min-width 0` |
| `.mon-perf__avatar` | 30×30, tondo, `object-fit cover`; `--lg` 52×52 |
| `.mon-perf__icon-circle` | 30×30 tondo; `background --color-primary-50; color --color-primary; 14px`; `--lg` 52×52 e 22px |
| `.mon-perf__user-wrap` | `flex column; min-width 0`; figli (anche il wrapper del Tooltip) `min-width 0; max-width 100%` |
| `.mon-perf__user-name` | `TruncatedText` (`.sib-truncate`: block, ellipsis, nowrap); `600; --color-text-active` |
| `.mon-perf__user-chall` | `TruncatedText`; `11px; --color-text-inactive` |
| `.mon-perf__c-rep` | `text-align center` |
| `.mon-perf__rep-ico` | `18px; --color-primary` |

### Percorso premi

| Classe | Proprietà |
|---|---|
| `.mon-perf__premi` | `relative; height 26px; margin 2px 12px 0` |
| `.mon-perf__premio` | `absolute; top 0; left calc(var(--pos)*1%); translateX(-50%); flex centrato` |
| `.mon-perf__premio-eur` | `11px 700; --color-text-inactive; nowrap` (niente sfondo, bordo o forma a pillola) |
| `.mon-perf__premio-eur.is-on` | `color #8a6d0f` |
| `.mon-perf__track` | `relative; height 26px; margin 8px 12px 0; flex; align center` |
| `.mon-perf__track-line` | `absolute; left 0; right 0; height 6px; radius 999px; background --color-bg; border 1px solid --color-border` |
| `.mon-perf__track-prog` | `absolute; left 0; height 6px; width calc(var(--pct)*1%); radius 999px; background linear-gradient(90deg, --color-primary-400, --color-primary); transition width .8s cubic-bezier(.22,1,.36,1)` |
| `.mon-perf__node` | `absolute; left calc(var(--pos)*1%); translateX(-50%); 22×22 tondo; flex centrato; 10px 700; background --color-surface; border 2px solid --color-border; color --color-text-inactive; z-index 1; transition all .3s ease` |
| `.mon-perf__node.is-on` | `background #C9A227; border-color #C9A227; color #fff; box-shadow 0 0 0 3px rgba(201,162,39,.18)` |
| `.mon-perf__node-hit` | `inline-flex; centrato; 18×18` (area di hover del Tooltip del nodo) |
| `.mon-perf__runner` | `absolute; left calc(var(--pos)*1%); translateX(-50%); top -16px; --color-primary; 15px; z-index 2; transition left .8s cubic-bezier(.22,1,.36,1)` |

### Colonna «Premio maturato», stato vuoto e riepilogo

| Classe | Proprietà |
|---|---|
| `.mon-perf__c-maturato` | `grid-area maturato; min-width 0; flex column; align flex-end; gap 3px; text-align right`. Il nome non finisce in «kpi»: il selettore globale `[class$="kpi"]` aggiungerebbe un'ombra da card |
| `.mon-perf__stato` (riga e dettaglio) | `inline-flex; align center; gap 5px; 12px 600; nowrap`, senza sfondo; `--raggiunto` `--color-success`, `--in-linea` `--color-link`, `--a-rischio` `--color-warning` |
| `.mon-perf__kpi-prize` | `Poppins 800 15px; color #8a6d0f`; `em`: `normal; 500; 12px; --color-text-inactive` |
| `.mon-perf__kpi-sub` | `11px; --color-text-inactive; nowrap` |
| `.mon-perf__empty` | `center; --color-text-inactive; padding 40px 0` |
| `.mon-perf__summary` | `center; 13px; --color-text-inactive`; `strong` in `--color-text-active` |

### Modale di dettaglio

| Classe | Proprietà |
|---|---|
| `.mon-perf__detail` | `flex column; gap 14px` |
| `.mon-perf__detail-head` | `flex; align center; gap 14px` |
| `.mon-perf__detail-name` | `700 16px; --color-text-active` |
| `.mon-perf__detail-sub` | `12px; --color-text-inactive` |
| `.mon-perf__detail-chall` | `margin-top 4px; inline-flex; gap 6px; 12px 600; --color-primary` |
| `.mon-perf__detail-stato` | `margin-left auto` |
| `.mon-perf__detail-obj` | `flex column; gap 2px` |
| `.mon-perf__detail-objname` | `600; --color-text-active` |
| `.mon-perf__bar-lg` | `relative; height 10px; radius 999px; background --color-primary-50; overflow hidden; margin-top 8px` |
| `.mon-perf__bar-lg-fill` | `absolute inset 0 auto 0 0; width calc(var(--pct)*1%); radius 999px; gradiente 90deg --color-primary-400 → --color-primary; transition width .8s cubic-bezier(.22,1,.36,1)` |
| `.mon-perf__detail-label` | `12px 600; --color-primary; margin-bottom 6px` |
| `.mon-perf__det-per` | `margin-top 12px` |
| `.mon-perf__det-per-name` | `12px 700; --color-primary; margin-bottom 6px` |
| `.mon-perf__tr-full` | `list none; flex column; gap 8px` |
| `.mon-perf__tr-full li` | `flex; align center; gap 10px; 13px; --color-text-inactive; border 1px solid --color-border; radius 8px; padding 8px 10px`; `li.is-ok` → `--color-text-active` |
| `.mon-perf__tr-node` | 22×22 tondo; `11px 700; background --color-border; color #fff`. In `li.is-ok`: `background #C9A227; box-shadow 0 0 0 3px rgba(201,162,39,.18)` (oro come `.mon-perf__node.is-on`) |
| `.mon-perf__tr-premio` | `flex 1; flex column; gap 1px` |
| `.mon-perf__tr-meta` | `11px; --color-text-inactive; 400` |
| `.mon-perf__tr-eur` | `Poppins 800; --color-primary; nowrap` |
| `.mon-perf__tr-badge` | `inline-flex; gap 5px; 12px 600; --color-success; nowrap`, senza sfondo |
| `.mon-perf__detail-actions` | `flex; justify flex-end; padding-top 12px; border-top 1px solid --color-border` |

**Tema scuro**: non ci sono regole dedicate. I token seguono il tema scuro (`--color-surface #1A1E26`, `--color-border #2B313D`, `--color-primary #6F9BCB`, `--color-success #34D399`, `--color-success-light #11271F`, `--color-link #6BA6E0`, `--color-link-light #1B2B3B`, `--color-warning #F5A623`, `--color-warning-light #2A2012`, `--color-bg #12151B`, `--color-primary-50 #232C3A`). Restano invariati i colori fissi dell'oro: `#C9A227`, `#8a6d0f`, `rgba(201,162,39,…)` e `#fff`.

## 9. Responsività

Regola: **nessuno scroll orizzontale a nessuna larghezza**. Le colonne della griglia partono da `minmax(0, …)` e la **container query `mon-perf`** (larghezza utile della pagina, quindi giusta anche con la sidenav aperta) ricompone la riga:

| Larghezza utile | Riga del board |
|---|---|
| oltre 900 px | 4 colonne `minmax(0,1.3fr) 64px minmax(0,2fr) 170px` |
| ≤ 900 px | 3 colonne `minmax(0,1.2fr) minmax(0,2fr) 136px` (areas `"name track maturato"`), gap 10px; la colonna Reparto sparisce (il reparto resta nel sottotitolo e nel Tooltip); board con padding `6px 14px 14px`; importo 14px |
| ≤ 640 px | 2 righe: `minmax(0,1fr) auto` con areas `"name maturato" "track track"`; nell'intestazione sparisce «Percorso premi»; le etichette dei premi sopra la pista si nascondono (i premi restano nei Tooltip dei nodi) e la pista ha `margin-top 18px`; la ricerca va al 100%; nella modale l'intestazione e i riquadri dei traguardi vanno a capo |
| ≤ 420 px | i filtri vanno uno per riga a tutta larghezza; importo 13px |

- La toolbar va a capo (`flex-wrap: wrap`).
- Nome obiettivo e sottotitolo su una riga con ellipsis e Tooltip col testo intero (`TruncatedText`); intestazioni su una riga con ellipsis.
- Verifica: a 1440, 1200, 1024 (sidenav aperta, ~716 px utili), 900, 760, 600 e 390 px di finestra `scrollWidth` del board = `clientWidth`.
- La modale è larga al massimo 600 px, al 100% sotto. Ha uno scroll interno solo se supera `100vh − 32px`.

## 10. Effetti e animazioni

| Elemento | Effetto |
|---|---|
| Pallino Live | `mon-perf-pulse` 1.4s ease-in-out infinite: `box-shadow 0 0 0 0 rgba(0,207,134,.5)` a 0% e 100%, `0 0 0 6px rgba(0,207,134,0)` al 70%. È un alone che si espande e svanisce |
| Barra di avanzamento della pista, barra grande del dettaglio | `width .8s cubic-bezier(.22, 1, .36, 1)` |
| Omino | `left .8s cubic-bezier(.22, 1, .36, 1)` |
| Nodi dei traguardi | `transition: all .3s ease`: il cambio a oro sfuma in 0,3 s |
| Righe | hover con sfondo istantaneo, senza transizione |
| Riordino delle righe | istantaneo, senza animazione di spostamento |
| Modale | apertura e chiusura del `Modal` condiviso (`00-fondamenta.md`) |

**`prefers-reduced-motion`**: non ci sono regole proprie. Vale la regola globale della piattaforma: `animation-duration: .01ms`, `animation-iteration-count: 1`, `transition-duration: .01ms`. Il polling Live continua; cambiano soltanto le transizioni, che diventano istantanee.

## 11. Accessibilità

- Ogni riga è un `<button type="button">`: si raggiunge con Tab e si apre con Invio o Spazio.
- Il pulsante Live è un `<button>` con il testo dello stato. Non c'è `aria-pressed`.
- La label «Cerca» non è associata all'input: non ha `htmlFor`. L'input ha `id="search"`.
- Gli avatar hanno `alt=""` (decorativi). Le icone di stato, dei nodi e del dettaglio hanno `aria-hidden`; l'omino ha `aria-label` «Avanzamento {pct}%».
- Modale: Esc chiude, il clic sullo sfondo chiude, la X chiude. La conferma di eliminazione è una modale `sm` con «Annulla» ed «Elimina»; Esc equivale ad Annulla.
- I valori di stato sono testo («Raggiunto»…), non solo colore.

## 12. Criteri di accettazione

1. Titolo «Monitoraggio performance» e sottotitolo «Controllo e analisi dei risultati e delle performance del personale, con premi maturati in tempo reale».
2. All'apertura il pulsante (angoli 6px, su una riga) mostra «Live · in aggiornamento» in verde, con il pallino pulsante e l'icona pausa. Il clic passa a «In pausa» in grigio, con l'icona play, e ferma l'avanzamento.
3. Con i dati seed e il filtro «In corso» compaiono 2 righe: «Upselling reception» (avatar, «Andrea Grimaudo») prima di «Spinta commerciale estate» (icona `fa-martini-glass`, «Reparto F&B»). Il sottotitolo di «Upselling reception» è «Andrea Grimaudo · Front office».
4. Prima di ogni avanzamento il riepilogo dice «2 obiettivi monitorati · avanzamento medio 34% · premi maturati € 650 su € 4000».
5. In «Upselling reception» le etichette «€250», «€350» e «€400» (testo senza sfondo) stanno al 25%, al 63% e al 100% della pista. La prima è oro scuro e il primo nodo ha il trofeo. L'omino è al 43%, lo stato dice «A rischio» in arancio con l'icona del triangolo e sotto compaiono «€ 250 / € 1000» e «1/3 traguardi · 43%».
6. Con Live attivo, circa ogni 1,8 s barra e omino avanzano con una transizione di 0,8 s. Al raggiungimento di un target il nodo diventa oro e l'etichetta del premio oro scuro. Le righe si riordinano per avanzamento.
7. Con il filtro «Conclusi» compare solo «Esperienze inverno», al 100%, con lo stato «Raggiunto» verde (icona `fa-circle-check`) e «€ 1000 / € 1000».
8. Il filtro «Reparto» elenca «Tutti», «F&B» e «Front office» (dati seed v3).
9. La ricerca «grim» trova «Upselling reception» (cerca nell'assegnatario); «zzz» mostra «Nessun obiettivo per i filtri selezionati.».
10. Il clic su una riga apre «Dettaglio obiettivo» con nome, sottotitolo «… · Reparto … · {report}», segmenti in minuscolo, stato colorato, la riga «Venduto … su … — …% · premio maturato … / …», la barra e i traguardi per periodo: sui raggiunti il pallino è oro con il trofeo, come il nodo della pista, e a destra compare «Sbloccato» verde con il lucchetto aperto; sugli altri il pallino è grigio con la clessidra; « · scad. gg/mm/aaaa».
11. «Elimina obiettivo» apre la conferma «Conferma eliminazione» con il messaggio «Eliminare l'obiettivo «Upselling reception»?». «Elimina» chiude tutto e la riga sparisce, anche dopo una ricarica; «Annulla» non cambia nulla.
12. Un obiettivo creato con «Assegna obiettivo» compare qui con il filtro «In corso».
13. Hover su un'etichetta o su un nodo del premio: tooltip scura «{sottoperiodo} — premio € N» (sul nodo raggiunto con « · raggiunto»). Hover sull'omino: «{pct}% · {r}/{n} traguardi». Hover sull'icona del reparto: il nome del reparto. Nessun `title` nativo.
14. Il board non scorre in orizzontale a nessuna larghezza (1920, 1366 con sidenav, 1024 con sidenav, 760, 600, 390 px): sotto 900 px utili sparisce la colonna Reparto, sotto 640 px la pista va a tutta larghezza sotto nome e premio.
14a. L'intestazione del board è in case normale («Obiettivo», «Reparto», «Percorso premi», «Premio maturato»), mai in maiuscolo; nessuno stato o premio ha sfondo a pillola.
15. In tema scuro le superfici sono `#1A1E26`; oro e importi restano `#C9A227` e `#8a6d0f`.

## 13. File sorgente

- `src/router/PageContent.tsx` (route `monitoraggio-perf`)
- `src/modules/hr/MonitoraggioPerformance/MonitoraggioPerformance.tsx`
- `src/modules/hr/MonitoraggioPerformance/MonitoraggioPerformance.sass`
- `src/store/useObiettiviStore.ts`
- `src/store/useConfirmStore.ts`, `src/core/components/ConfirmDialog.tsx`
- `src/core/components/Modal.tsx`, `src/styles/_components.sass` (modal, riduzione movimento globale)
- `src/core/components/PageHead.tsx`, `src/core/components/Tooltip.tsx`, `src/core/components/form/SelectField.tsx`, `src/core/components/form/SearchField.tsx`
- `src/core/avatar.ts`
- `src/styles/_colors.sass`, `src/styles/_spacing.sass`, `src/styles/_themes.sass`
- `src/navigation/menu.ts`, `src/navigation/pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`
