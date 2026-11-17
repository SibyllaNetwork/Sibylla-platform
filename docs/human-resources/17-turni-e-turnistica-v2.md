# 17 — Turni del personale e Turnistica, versione 2 (17 novembre 2026)

> **Per l'agente AI che implementa (team di Lorenzo).** Questo documento descrive la **seconda versione** di tre pagine
> collegate di Human Resources, il **backend** che le deve servire e la **configurazione precompilata** di una struttura
> ricettiva:
>
> 1. **Configurazione HR › Orari di lavoro** (`hr-configurazione:hr-orari`): ogni orario mostra il collegamento con
>    Turnistica e Turni (turni e schemi compatibili, chi lo usa, avvisi di legge);
> 2. **Configurazione HR › Turnistica** (`hr-configurazione:hr-turnistica`): oltre a turni e schemi di rotazione, le
>    **Regole di pianificazione** (fasce di copertura, fabbisogno per reparto, riposo minimo, tolleranza) e la
>    **coerenza con gli orari di lavoro**;
> 3. **Turni del personale** (`turni-personale`): ogni assegnazione è **persona + giorno + turno**; ore e giorni attesi
>    vengono dall'**orario del contratto**, chi ha un orario fisso è già pianificato, lo **schema di rotazione** è la
>    base dei suggerimenti; ore, riposi, copertura per reparto e per fascia, stato di pubblicazione, giorni passati
>    bloccati.
>
> In più: **Crea anagrafica** segnala se lo schema scelto non è in linea con l'orario, e le **timbrature** usano il turno
> assegnato e la flessibilità dell'orario per i ritardi. Il § 6 contiene la **configurazione tipo di una struttura
> ricettiva** (13 reparti, 10 orari, 16 turni, 10 schemi, regole) da caricare in ogni nuova struttura, con lo script SQL
> di riferimento `seed/hr-struttura-ricettiva.sql`.
>
> Dove questo documento contraddice `11-turni-personale.md` o la sezione **B.3** di `02-configurazione-hr.md`,
> **vale questo documento**. Tutto quello che non è citato qui (design system, componenti condivisi, convenzioni dei
> pane del Configuratore, modello «bozza → Salva») resta come descritto in `00-fondamenta.md`, `01-modello-dati-e-api.md`
> e `02-configurazione-hr.md`.
>
> Riferimento: repository `sibylla-platform`, ramo `docs/portal-proxy-riferimento`, commit del 17/11/2026
> («Turni del personale v2 …»). Demo su https://sibylla-platform.vercel.app (Human Resources).

---

## 0. Come usare questo documento

**Ordine di lavoro consigliato**

1. **Backend, configurazione**: tabelle e API di reparti, orari e Turnistica con le Regole di pianificazione (§ 2.6,
   § 2.7, § 6.6) e **caricamento della configurazione tipo** in ogni struttura (§ 6). La pagina Turni non funziona senza.
2. **Frontend, Turnistica e Orari**: «Regole di pianificazione», «Coerenza con gli orari di lavoro», riquadro di
   collegamento negli Orari, avviso in Crea anagrafica (§ 2.1–2.5, § 2.8, § 2B, § 2C).
3. **Backend, turni**: tabelle, API di lettura/scrittura, stato di pubblicazione, notifiche, algoritmo (§ 3.8–3.11).
4. **Frontend, Turni del personale**: le due viste, chip con turno, menu turno, ore e riposi, copertura, stato (§ 3.1–3.7).
5. **Collegamento con le timbrature**: orario atteso dal turno pubblicato (§ 4).
6. Verifica con i **criteri di accettazione** (§ 5) a 1366, 1440 e 1920 px, sidenav aperta, tema chiaro e scuro.

**Architettura** (vedi `../integrazioni-backend.md`): pagine su Vercel → `SibyllaApiProxy` (JWT) → `SibyllaApi` (.NET,
Dapper, DbUp, Azure SQL). Prefisso API coerente con le altre pagine HR: **`/Sibylla/hr/...`**. Ogni richiesta porta la
struttura (`struttura` = id della struttura selezionata nel filtro «Struttura» o nella topbar). Script DbUp sempre nuovi,
numerati a sei cifre, `CREATE OR ALTER` (convenzioni del Portal).

**Oggi nel frontend tutto è mock**: `useHrConfigStore` (persist `sibylla.hr-config`, **versione 11**, precompilato da
`src/store/data/hr-struttura-ricettiva.json`) e
`useTurniPersonaleStore` (persist `sibylla.turni-personale`, **versione 2**) in `localStorage`. Le funzioni di calcolo
del frontend sono il riferimento di comportamento: il backend deve dare **gli stessi risultati** con gli stessi input.

### Perché è cambiata (feedback ricevuto → soluzione)

| Problema segnalato | Soluzione implementata |
|---|---|
| Si assegnavano persone ai giorni, non ai turni: niente ore, niente controllo delle 11 h, niente copertura per fascia, niente orario atteso per la timbratura | L'assegnazione è **(giorno, dipendente, turno)**. Sigla colorata nel chip («[M] F. Poliziani»); al rilascio del trascinamento si apre il **menu dei turni validi per il reparto**; clic sul chip per cambiarlo; Sibylla propone **coppie persona + turno** |
| Copertura sommata su tutti i reparti, fabbisogno da occupazione anche per magazzino e manutenzione | Copertura **per reparto e per fascia** («M 2/2 · P 1/2»); con «Tutti i reparti» una griglia di codici reparto (FO, FB, HK…) cliccabili che portano al dettaglio. Ogni reparto ha **calcolo «Segue l'occupazione» o «Minimo fisso»**, configurabile in Turnistica |
| Contatore del pannello personale incomprensibile | Sostituito da **ore assegnate / ore attese** (es. «32/40 h»), colorato (verde ok, arancio sotto, rosso oltre), più **giorni di riposo** e assenze |
| «Contratto non indicato» poco evidente | Riga arancio con icona e link all'**Archivio del personale**; il controllo ore è disattivato e lo si dice nel tooltip |
| Tre concetti sovrapposti: Salva, Pubblica, «Pubblicato il… generato da Sibylla» | Niente più «Salva» (le modifiche si salvano da sole). Stato unico **Bozza → Pubblicato → Modificato dopo la pubblicazione (da ripubblicare)**; la ripubblicazione notifica **solo i dipendenti coinvolti** |
| I giorni passati si modificavano liberamente | Giorni prima di oggi con **lucchetto**: modificabili solo dopo una **modale di conferma** (hanno timbrature collegate); il suggerimento di Sibylla e «Svuota» non li toccano |
| Chip Ferie | Arriva dal modulo ferie (richieste approvate), non è trascinabile né rimovibile e **non conta nella copertura**: verificato anche nel calcolo (chi è in turno ma ha un'assenza bloccante è escluso e il suo chip è segnalato) |
| Barra di occupazione rossa all'85% | Scala di **blu** (carico di lavoro basso/medio/alto) con legenda e tooltip: «un'occupazione alta è positiva, ma richiede più personale» |
| Con 20–30 dipendenti la settimana del singolo non si legge | Selettore di vista **Per giorno / Per dipendente**: la seconda è la griglia classica dipendenti × giorni |
| Orari di lavoro, Turnistica e Turni erano tre elenchi scollegati | Catena **dipendente → contratto → orario → turni** (§ 0.1): ore attese dall'orario, orari fissi già pianificati, schema di rotazione come base, flessibilità sui ritardi, controlli di coerenza in tutte e tre le pagine |

### 0.1 Flusso di lavoro fra le pagine

```
 CONFIGURAZIONE (una volta, poi ritocchi)                PER OGNI DIPENDENTE        OGNI SETTIMANA            OGNI GIORNO
 ┌──────────────────────┐   ┌─────────────────────────┐   ┌────────────────────┐   ┌─────────────────────┐   ┌───────────────────┐
 │ Orari di lavoro      │   │ Turnistica              │   │ Crea anagrafica    │   │ Turni del personale │   │ Timbrature /      │
 │ QUANTO si lavora:    │──►│ COME è fatta la         │──►│ reparto + orario + │──►│ CHI lavora QUANDO:  │──►│ presenze          │
 │ ore, giorni, regime, │   │ giornata: turni, schemi,│   │ schema (contratto  │   │ ore vs orario, 11 h,│   │ orario atteso =   │
 │ flessibilità; fisso  │   │ fasce, fabbisogno per   │   │ vigente)           │   │ copertura, pubblica │   │ turno assegnato;  │
 │ o «a turni»          │   │ reparto, riposo minimo  │   └────────────────────┘   └─────────────────────┘   │ ritardo oltre la  │
 └──────────────────────┘   └─────────────────────────┘                                                      │ flessibilità      │
        ▲  coerenza: turni e schemi compatibili con gli orari (avvisi in entrambe le pagine)                 └───────────────────┘
```

1. **Orari di lavoro** — l'ufficio del personale definisce i «pacchetti» di lavoro. *Fisso* (es. «Full time 40 h · 5
   giorni», uffici): giorni e orari sono scritti nell'orario. *A turni* (es. «Turnista 40 h · 5 giorni»): fissa solo
   ore e giorni, la giornata la dà la Turnistica. La **flessibilità** è la tolleranza sulle timbrature.
2. **Turnistica** — si definiscono i turni (M, P, N, S, HK…) e in quali reparti si usano, gli **schemi di rotazione** e
   le **regole di copertura**. La pagina avvisa se un orario a turni non ha turni o schemi compatibili.
3. **Crea anagrafica** — nel contratto si sceglie reparto, orario e (per gli orari a turni) lo schema. Il campo schema è
   disabilitato con un orario fisso e segnala gli schemi non in linea con l'orario.
4. **Turni del personale** — ogni settimana: chi ha l'orario fisso compare già pianificato e bloccato (turno «F»); gli
   altri si assegnano trascinando o con Sibylla, che parte dallo schema di rotazione. Ore attese = ore dell'orario meno
   le assenze. Si pubblica; le modifiche dopo la pubblicazione si ripubblicano ai soli coinvolti.
5. **Timbrature** — il turno assegnato è l'orario atteso; il ritardo scatta oltre la flessibilità dell'orario.

**Sintesi:** l'Orario dice *quanto*, la Turnistica *come*, i Turni *chi e quando*, le Timbrature verificano.

---

## 1. Glossario e modello comune

| Termine | Significato |
|---|---|
| **Orario di lavoro** (`OrarioHr`) | Ore e giorni a settimana, regime, flessibilità. **Fisso** (`aTurni = false`): griglia Lun→Dom con le fasce di ogni giorno. **A turni** (`aTurni = true`): solo monte ore e giorni, le giornate le dà la Turnistica |
| **Contratto vigente** | Ultimo contratto dell'anagrafica (per decorrenza) con `orarioId` e `schemaTurniId`: collega la persona alle pagine di configurazione |
| **Schema di rotazione** (`SchemaTurniHr`) | Ciclo di turni e riposi (es. M M I P P R R) che si ripete dalla decorrenza del contratto |
| **Turno** (`TurnoHr`) | Fascia di lavoro definita in Turnistica: sigla, nome, una o due fasce orarie (spezzato), pausa, colore, reparti in cui si può usare |
| **Fascia di copertura** (`FasciaCoperturaHr`) | Parte della giornata su cui si misura la copertura: **M** Mattina, **P** Pomeriggio, **N** Notte |
| **Fabbisogno** (`FabbisognoRepartoHr`) | Quante persone servono in ogni fascia a un reparto, in base a occupazione e giorno della settimana |
| **Assegnazione** | (giorno, dipendente, turno) in una settimana |
| **Settimana** | Da lunedì a domenica, identificata dal lunedì `aaaa-mm-gg` |
| **Pubblicazione** | Fotografia immutabile della settimana inviata ai dipendenti |
| **Assenza bloccante** | Richiesta **approvata** di Ferie, Malattia o ROL di giornata intera (≥ 8 h). Permesso e ROL di poche ore **non** bloccano. Le richieste in attesa («Da approvare», «Al responsabile») non bloccano ma vengono segnalate |

Il reparto del dipendente oggi è un **nome** (`DipendenteHr.reparto`, es. «Front office») e si collega alla
configurazione cercando `RepartoHr.nome`. **Nel backend usare l'id del reparto** (`repartoId`) ovunque.

---

## 2. Configurazione HR › Turnistica

Scheda 3 di Configurazione HR (deep link `hr-configurazione:hr-turnistica`), stesso pane anche nel Configuratore. Resta
il modello «bozza → Salva» comune ai pane HR (`useHrDraft` + `CfgSaveBar`, toast «Turnistica salvata»): **un solo PUT al
Salva**, che ora comprende anche le regole di pianificazione.

### 2.1 Layout (dall'alto)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Turni di servizio                                              [⊕ Nuovo turno]│
│ «Le fasce orarie con cui si compongono gli schemi e i turni settimanali…»    │
│ Sigla | Turno | Fasce orarie | Ore nette | Tipo | Reparti | Azioni            │  (invariata)
├──────────────────────────────────────────────────────────────────────────────┤
│ Regole di pianificazione                                         (NUOVA)      │
│ «Le usa Turni del personale per misurare la copertura per fascia, …»         │
│ [Riposo minimo fra due turni (ore)] [Ore minime per coprire…] [Tolleranza…]   │
│ Fasce di copertura                                                            │
│ Sigla | Fascia | Inizio | Fine | Turni che la coprono | Attiva               │
│ Fabbisogno per reparto                                                        │
│ Reparto | Calcolo | Turno proposto | Persone per fascia | Rinforzo |          │
│         Senza fabbisogno | Azioni(✎)                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Schemi di rotazione                                           [⊕ Nuovo schema]│  (invariata, + 3 schemi standard)
└──────────────────────────────────────────────────────────────────────────────┘
                                                          CfgSaveBar (Salva / Annulla)
```

### 2.2 Turni standard di un hotel (seed)

I **16 turni** precompilati sono nella tabella di § 6.3 (Mattina, Pomeriggio, Notte, Intermedio check-in, Mattina e
Pomeriggio da 6 giorni, Colazioni, Spezzato pranzo e cena, Cena, Bar sera, Centrale, Rifacimento camere, Couverture
serale, Spa mattina, Spa pomeriggio, Ufficio). Ore nette = durata delle fasce − pausa. Colore = indice della palette
`--chart-1…8`. «Fine» `00:00` = mezzanotte (una fine ≤ inizio passa al giorno dopo). Notturno = almeno 3 ore tra le 22 e
le 6 sommando le fasce (`turnoNotturno`). La sigla `R` è riservata al riposo negli schemi.

### 2.3 Schemi di rotazione standard (seed)

I **10 schemi** precompilati sono nella tabella di § 6.4.

**Migrazione** (dati già salvati di una struttura): aggiungere reparti, orari, turni, schemi e fabbisogni della
configurazione tipo il cui `id` non esiste già (reparti con lo stesso nome e turni con la stessa sigla non si
aggiungono). Non toccare quelli dell'utente.

### 2.4 Regole di pianificazione: campi, testi e valori di default

Titolo «Regole di pianificazione», descrizione «Le usa Turni del personale per misurare la copertura per fascia,
controllare ore e riposi e proporre il turno con Sibylla.» (nessun pulsante nella toolbar).

**Parametri** (griglia di 3 `InputField` numerici, `grid-template-columns: repeat(3, minmax(0, 1fr))`, gap 14 px;
sotto 900 px di container una colonna):

| Campo (label esatta) | name | Default | min/max/step | Hint (esatto) |
|---|---|---|---|---|
| «Riposo minimo fra due turni (ore)» | `pian-riposo` | 11 | 0 / 24 / 0,5 | «11 h per legge (D.Lgs. 66/2003): sotto la soglia il turno viene segnalato.» |
| «Ore minime per coprire una fascia» | `pian-copertura` | 3 | 1 / 8 / 0,5 (minimo effettivo 0,5) | «Un turno conta nella fascia se ci lavora almeno queste ore (lo spezzato può coprirne due).» |
| «Tolleranza sul monte ore (ore)» | `pian-tolleranza` | 4 | 0 / 20 / 0,5 | «Sotto le ore da contratto meno la tolleranza, il dipendente risulta da completare.» |

**Fasce di copertura** (etichetta «Fasce di copertura», `CfgTable`, editing in riga):

| Colonna | Larghezza | Contenuto |
|---|---|---|
| «Sigla» | 8% | M / P / N in un riquadro 28×24 px, bordo 1 px `--color-border`, testo `--color-primary` 12 px bold (`.cfg-hrtur__fascia`) |
| «Fascia» | 22% | `InputField` del nome (aria-label «Nome fascia M») |
| «Inizio» | 17% | `DatePickerField type="time"` |
| «Fine» | 17% | `DatePickerField type="time"` (fine ≤ inizio = giorno dopo) |
| «Turni che la coprono» | 24% | Sigle colorate dei turni che lavorano almeno «Ore minime per coprire una fascia» dentro la fascia, tooltip «‹nome› ‹fasce›»; se nessuno «Nessun turno» |
| «Attiva» | 12%, a destra | `ToggleSwitch`. Fascia spenta: riga con opacità .55; non si misura né si chiede copertura |

Default: M «Mattina» 07:00–15:00, P «Pomeriggio» 15:00–23:00, N «Notte» 23:00–07:00, tutte attive.
Con i turni standard: M ← M, I, M6, CO, S, C, HK, SM, U; P ← P, I, P6, S, CE, BS, CV, SP, U; N ← N, BS (Bar sera
18:00–02:00 lavora 3 h nella fascia N).

**Fabbisogno per reparto** (etichetta «Fabbisogno per reparto», `CfgTable`, una riga per **reparto attivo**):

| Colonna | Larghezza | Contenuto |
|---|---|---|
| «Reparto» | 17% | nome, bold |
| «Calcolo» | 15% | `fa-solid fa-chart-line` + «Segue l'occupazione» (colore primary) oppure `fa-solid fa-equals` + «Minimo fisso» (text-inactive). Icona + testo, **nessuna pillola** |
| «Turno proposto» | 13% | sigla + nome del turno predefinito (tooltip «‹nome› ‹fasce›»); se non impostato o non più valido per il reparto: «Primo turno valido» (text-inactive) |
| «Persone per fascia» | 16% | «M 1 · P 1 · N 0» (solo fasce attive) |
| «Rinforzo» | 18% | con calcolo da occupazione e almeno un rinforzo: «da 85%: +1 M» (più fasce separate da virgola); altrimenti «—» |
| «Senza fabbisogno» | 13% | giorni di chiusura «Sab, Dom» oppure «Nessuno» |
| «Azioni» | 8%, a destra | solo **Modifica**: `fa-solid fa-pen` 16 px `--color-primary`, tooltip «Modifica il fabbisogno», aria-label «Modifica il fabbisogno di ‹reparto›». Non c'è Elimina: un reparto senza regole ha fabbisogno zero |

Default (seed `PIANIFICAZIONE_DEFAULT`): tabella di § 6.5. Un reparto senza regole: «Minimo fisso», «Primo turno valido», «M 0 · P 0 · N 0».

### 2.5 Modale «Fabbisogno · ‹reparto›»

`HrFormModal` size `lg`, pulsante «Applica» (sempre abilitato), «Annulla». Applica modifica la **bozza** (il PUT avviene
con «Salva» della barra). Campi nell'ordine:

1. `RadioGroup` «Come si calcola» (name `reg-modalita`):
   - `occupazione` «Segue l’occupazione (housekeeping, ricevimento, ristorazione)»;
   - `fisso` «Minimo fisso (manutenzione, amministrazione, magazzino)».
2. `SelectField` «Turno proposto quando si trascina un dipendente del reparto» (name `reg-predef`): prima opzione vuota
   «Primo valido (‹nome del primo turno valido›)» oppure «Nessun turno valido per il reparto»; poi i turni validi per il
   reparto come «‹sigla› · ‹nome› ‹fasce›».
3. «Persone sempre necessarie per fascia»: un `InputField` numerico per fascia attiva, label «M · Mattina»… (0–20),
   griglia `repeat(4, minmax(0, 1fr))`, gap 10 px.
4. Solo con «Segue l’occupazione»: «Rinforzo quando l'occupazione è alta»: «Da occupazione (%)» (0–100, step 5) e
   «+ persone M/P/N» (0–20).
5. «Giorni senza fabbisogno (reparto chiuso)»: sette pulsanti Lun…Dom (min-width 46 px, h 30 px, bordo 1 px,
   radius `--radius-md`); attivo = bordo `--color-warning`, sfondo `--color-warning-light`, `aria-pressed`. Tooltip
   «Lunedì: chiuso, nessuna copertura richiesta» / «Lunedì: aperto».
6. Anteprima (hint): «Copertura richiesta nei giorni aperti: **M 1 · P 1 · N 0**» e, con occupazione,
   « · con occupazione da 85%: **M 2 · P 1 · N 0**».

Interazione collegata: **eliminando un turno** che è «Turno proposto» di un reparto, il riferimento si azzera (in
bozza, insieme alla rimozione dagli schemi). La modale di conferma dell'eliminazione resta quella esistente.

### 2.6 Modello dati (backend)

```ts
type FasciaId = 'M' | 'P' | 'N'
type PersonePerFascia = Record<FasciaId, number>

interface FasciaCoperturaHr { id: FasciaId; nome: string; inizio: 'HH:MM'; fine: 'HH:MM'; attiva: boolean }

interface FabbisognoRepartoHr {
  id: string                    // = RepartoHr.id
  modalita: 'occupazione' | 'fisso'
  turnoPredefinito?: string     // TurnoHr.id
  base: PersonePerFascia
  rinforzo: PersonePerFascia    // usato solo con 'occupazione'
  sogliaOccupazione: number     // 0..100
  giorniChiusura: number[]      // 0 = lunedì … 6 = domenica
}

interface PianificazioneTurniHr {
  fasce: FasciaCoperturaHr[]    // sempre le tre M, P, N in quest'ordine
  coperturaMinOre: number
  riposoMinOre: number
  tolleranzaSottoOre: number
  fabbisogni: FabbisognoRepartoHr[]
}
// HrConfigData acquisisce: pianificazione: PianificazioneTurniHr
```

Tabelle proposte (SQL Server, per struttura):

```sql
-- già esistenti o da creare con la Turnistica v1
HrTurno(StrutturaId, Id, Sigla, Nome, Inizio, Fine, Inizio2 NULL, Fine2 NULL, PausaMin, Colore)
HrTurnoReparto(StrutturaId, TurnoId, RepartoId)                   -- vuoto = tutti i reparti
HrSchemaTurni(StrutturaId, Id, Nome, Descrizione)
HrSchemaTurniPasso(StrutturaId, SchemaId, Ordine, TurnoId NULL)   -- NULL = riposo 'R'

-- nuove
HrPianificazione(StrutturaId PK, CoperturaMinOre DECIMAL(4,1), RiposoMinOre DECIMAL(4,1),
                 TolleranzaSottoOre DECIMAL(4,1), Version INT)
HrFasciaCopertura(StrutturaId, Id CHAR(1) /* M,P,N */, Nome, Inizio TIME, Fine TIME, Attiva BIT)
HrFabbisognoReparto(StrutturaId, RepartoId, Modalita VARCHAR(12), TurnoPredefinitoId NULL,
                    BaseM, BaseP, BaseN, RinforzoM, RinforzoP, RinforzoN,
                    SogliaOccupazione TINYINT, GiorniChiusura VARCHAR(13) /* es. '5,6' */)
```

### 2.7 API

`GET /Sibylla/hr/config` restituisce anche `pianificazione`. Il salvataggio della scheda diventa:

```
PUT /Sibylla/hr/config/turnistica
{ "version": 7,
  "turni":  [ { "id": "tur-m", "sigla": "M", "nome": "Mattina", "inizio": "07:00", "fine": "15:00",
               "pausaMin": 30, "colore": 1, "reparti": [] }, … ],
  "schemi": [ { "id": "sch-fo52", "nome": "Ricevimento 5+2 M/I/P", "descrizione": "…",
               "sequenza": ["tur-m","tur-m","tur-i","tur-p","tur-p","R","R"] }, … ],
  "pianificazione": {
    "fasce": [ { "id": "M", "nome": "Mattina", "inizio": "07:00", "fine": "15:00", "attiva": true }, … ],
    "coperturaMinOre": 3, "riposoMinOre": 11, "tolleranzaSottoOre": 4,
    "fabbisogni": [ { "id": "rep-fo", "modalita": "occupazione", "turnoPredefinito": "tur-m",
                      "base": { "M": 1, "P": 1, "N": 0 }, "rinforzo": { "M": 1, "P": 0, "N": 0 },
                      "sogliaOccupazione": 85, "giorniChiusura": [] }, … ] } }
→ 200 { "version": 8, "turni": […], "schemi": […], "pianificazione": {…} }
```

- **Una sola transazione**: turni, schemi e pianificazione si sostituiscono insieme (l'eliminazione di un turno
  tocca schemi e `turnoPredefinito`).
- Validazioni esistenti dei turni (sigla obbligatoria, univoca senza distinzione di maiuscole, max 3 caratteri; nome
  obbligatorio; orari HH:MM; pausa ≥ 0). Nuove, `400 { "fields": { … } }`:
  - `pianificazione.fasce` esattamente M, P, N; orari HH:MM; nome obbligatorio;
  - `riposoMinOre` 0–24, `coperturaMinOre` 0,5–8, `tolleranzaSottoOre` 0–20;
  - `fabbisogni[i].id` deve essere un reparto esistente; `base`/`rinforzo` interi 0–20; `sogliaOccupazione` 0–100;
    `giorniChiusura` valori distinti 0–6; `turnoPredefinito` se presente deve esistere ed essere **valido per il
    reparto** (altrimenti salvarlo `NULL`, non errore: il frontend mostra «Primo turno valido»).
- Concorrenza: `409` come le altre schede (`version`).
- Il servizio dei turni (§ 3.10) legge queste regole **al momento del calcolo**: cambiare la configurazione cambia la
  copertura e i suggerimenti, non le assegnazioni già fatte.

### 2.8 «Coerenza con gli orari di lavoro» (in fondo alle Regole di pianificazione)

Etichetta «Coerenza con gli orari di lavoro», descrizione «Gli orari «a turni» (Configurazione HR › Orari di lavoro)
fissano ore e giorni: qui si vede se turni e schemi bastano a comporli. Calcolato sulla bozza di questa scheda.»
`CfgTable`, una riga per **orario a turni**:

| Colonna | Larghezza | Contenuto |
|---|---|---|
| «Orario a turni» | 24% | nome dell'orario, bold |
| «Ore al giorno» | 11%, a destra | ore ÷ giorni, es. «8 h», «6,7 h» |
| «Turni compatibili» | 20% | sigle colorate (tooltip «‹nome› · ‹ore› h»); se nessuno: `fa-triangle-exclamation` + «Nessuno» in arancio, tooltip «Nessun turno da circa 6,7 h: con 6 giorni il monte di 40 h non si raggiunge con i turni esistenti. Crea un turno di questa durata o cambia l'orario.» |
| «Schemi compatibili» | 25% | nomi separati da virgola (ellipsis + tooltip) oppure «—» |
| «Dipendenti» | 20% | «G. Conti, S. Benvenuti…» (ellipsis, tooltip con i nomi completi) oppure «Nessuno» |

Regole (in `useHrConfigStore.ts`):

```
oreMedieGiorno(o)        = oreSettimanali(o) / giorniLavorativi(o)
turniCompatibili(o)      = turni t con  ore(o) − tolleranzaSottoOre ≤ oreTurno(t) · giorni(o) ≤ ore(o)
                           (stessa soglia «da completare» di Turni del personale; mai oltre il monte ore)
oreSettimanaliSchema(s)  = Σ oreTurno dei passi / lunghezza ciclo · 7        (R = 0)
giorniSettimanaliSchema  = passi lavorati / lunghezza ciclo · 7
schemiCompatibili(o)     = schemi con |oreSett(s) − ore(o)| ≤ 2,5  e  |giorniSett(s) − giorni(o)| ≤ 0,5
avvisiOrario(o)          = «Supera le 48 ore settimanali consentite (D.Lgs. 66/2003).»          se ore > 48
                           «Nessun giorno di riposo: serve almeno un riposo settimanale di 24 ore consecutive.»  se giorni ≥ 7
                           «In Turnistica non c'è un turno adatto (circa 6,7 h al giorno): con i turni esistenti in 6
                            giorni il monte di 40 h si supera o non si raggiunge.»              se a turni e nessun turno compatibile
```

Con la configurazione tipo: «Turnista 40 h · 5 giorni» → turni da 7,5–8 h (M, P, N, I, CO, S, CE, HK, U…) e schemi
«Ciclo continuo 3 turni», «Ricevimento 5+2 M/I/P», «Sala colazioni e cena», «Bar giorno e sera», «Spa 5+2»,
«Ufficio 5+2»;
«Turnista 40 h · 6 giorni» → M6, P6 e lo schema «Turnista 6+1 a turni corti».

Nelle **card degli schemi**, sotto «Ciclo di … h/sett.», una riga «Adatto a: ‹orari›» oppure «Nessun orario a turni con
questo monte ore».

---

## 2B. Configurazione HR › Orari di lavoro (collegamento)

Nel dettaglio dell'orario selezionato, fra il `ToggleSwitch` «Orario a turni» e i campi sotto, un riquadro
`.cfg-hrora__link` (padding 10/12 px, bordo 1 px `--color-border`, radius `--radius-md`, sfondo `--color-bg`, 12 px):

- riga 1, icona `fa-solid fa-link` primary:
  - a turni: «In **Turni del personale** le giornate si compongono con i turni della Turnistica: media di **8 h** al
    giorno. La flessibilità vale per i ritardi delle timbrature.»
  - fisso: «Orario fisso: in **Turni del personale** chi lo ha compare già pianificato nei suoi giorni (non usa la
    Turnistica). La flessibilità vale per i ritardi delle timbrature.»
- solo a turni: «Turni compatibili» + sigle colorate (oppure «nessuno» arancio) e «Schemi compatibili» + nomi (o
  «nessuno»);
- «Usato da» + nomi dei dipendenti il cui contratto vigente ha questo orario (o «nessun dipendente»);
- gli avvisi di `avvisiOrario`, in arancio con `fa-triangle-exclamation`.

Il riquadro legge **turni e schemi salvati** (non la bozza della Turnistica). Nessuna nuova API: dati da
`GET /Sibylla/hr/config` più i contratti vigenti. Il backend applica la stessa validazione **non bloccante** al
salvataggio degli orari (gli avvisi tornano in `"avvisi"`).

## 2C. Crea anagrafica (schema di turnazione)

Nel campo «Schema di turnazione»:
- con un **orario fisso** il campo è disabilitato e l'hint è «Orario fisso: i giorni vengono dall’orario, lo schema non
  serve»;
- le opzioni compatibili con l'orario scelto hanno il suffisso « (in linea con l’orario)»;
- se lo schema scelto non è compatibile l'hint diventa, per esempio, «M · M · I · P · P · R · R · ≈ 37,5 h/sett., non in
  linea con l’orario (40 h su 6 giorni)»; altrimenti resta la sequenza delle sigle.

---

## 3. Turni del personale

### 3.1 Layout

Root `.tpe` (colonna, gap 12 px, font 13 px, container `turni`).

```
PageHead «Turni del personale» (senza azioni)
«Assegna a ogni dipendente il turno di ogni giorno, oppure fatti proporre la settimana da Sibylla»
Struttura▾  Reparto▾  Settimana [<] 16 – 22 nov 2026 [>] [Questa settimana]  (Dipendente🔍 solo vista per dipendente)
                    →  [📅 Piano ferie] │ [✨ Suggerimento Sibylla] [✈ Pubblica turno | ⟳ Ripubblica turno | ✓ Pubblicato]
[Per giorno | Per dipendente]  [Barra di stato: istruzioni o turno da assegnare   ·   stato della settimana]

VISTA PER GIORNO
┌ Personale         Ore · riposi ┐ ┌ Giorno  Occupazione  Personale in turno          Copertura per reparto ┐
│ 🔍 Cerca dipendente…           │ │ LUN🔒 62% ▬▬▬░      [M] G. Conti ×  [P] D. Marini ×   ✓FO ✓FB ✓HK     │
│ ⋮ Giulia Conti      37,5/40 h  │ │ 16 nov               [A. Grimaudo · Ferie]              ✓MAN ✓CUC ✓AMM  │
│   Front office · Full time      │ │ …7 righe…                                                               │
│               2 riposi          │ │ Legenda: turni · reparti · assente · da approvare · giorno passato ·    │
│ ⋮ Paolo Greco         40 h      │ │          carico di lavoro basso/medio/alto                              │
│   ⚠ Contratto non indicato     │ └─────────────────────────────────────────────────────────────────────────┘
│ [🗑 Svuota i giorni a venire]  │
└────────────────────────────────┘

VISTA PER DIPENDENTE (tabella .sib-table, senza scroll orizzontale)
Dipendente | 🔒LUN 16 nov 62% | MAR 17 nov 59% | … | DOM 22 nov 79% | Ore · riposi
● Front office  Fabbisogno sull'occupazione
Giulia Conti / Full time | [M 07–15] | [R] | [I 11–19] | … | 37,5/40 h · 2 riposi
…
Copertura per fascia/reparto | M 1/1 P 0/1 | … |
```

Rispetto alla v1: **tolto il pulsante «Salva»** e il cerchietto dei giorni; il pulsante del footer ora è
«Svuota i giorni a venire»; la colonna «Copertura» è larga 176 px (150 px sotto 1180 px di container); l'occupazione
110 px (80 px).

### 3.2 Elementi e testi (nuovi o cambiati)

**Header e barra azioni**: il PageHead non ha azioni. I pulsanti stanno a destra sulla riga dei filtri
(`.tpe__actions`, `margin-left: auto`, gap 8 px): «Piano ferie» (`fa-solid fa-calendar-days`, secondario, tooltip «Apri
il Piano ferie»), separatore verticale 1×24 px `--color-border`, «Suggerimento Sibylla», pulsante di pubblicazione.
Sotto 1240 px di container «Piano ferie» diventa solo icona (34×34) e i campi Struttura/Reparto passano a 190/170 px,
così la riga non va a capo a 1366 px con la sidenav. Il `VistaSwitch` (aria-label «Vista dei turni», «Per giorno»
`fa-calendar-week`, «Per dipendente» `fa-table-cells`, senza hint) sta a sinistra della barra di stato sulla stessa
riga (`.tpe__bar`, flex, gap 12 px; la barra occupa il resto; sotto 900 px vanno in colonna).

**Pulsante di pubblicazione** (a destra dei filtri), per stato:

| Stato | Pulsante |
|---|---|
| bozza | primario `fa-solid fa-paper-plane` «Pubblica turno» |
| da-ripubblicare | primario `fa-solid fa-arrows-rotate` «Ripubblica turno» |
| pubblicato | primario **disabilitato** `fa-solid fa-circle-check` «Pubblicato», tooltip «Nessuna modifica dall'ultima pubblicazione» |

**Stato della settimana** (a destra nella barra, icona + testo, tooltip «Le modifiche si salvano da sole; i dipendenti
le ricevono solo quando pubblichi (o ripubblichi) il turno.»):

| Stato | Icona e colore | Testo |
|---|---|---|
| bozza | `fa-pen-ruler`, text-inactive | «Bozza · non ancora inviata ai dipendenti» |
| pubblicato | `fa-circle-check`, success | «Pubblicato il 13/11 alle 17:30» |
| da-ripubblicare | `fa-triangle-exclamation`, warning; la barra prende bordo warning e sfondo warning-light | «Modificato dopo la pubblicazione del 13/11 alle 17:30 · da ripubblicare (2 dipendenti coinvolti)» |
| + se origine Sibylla | text-inactive | « · proposto da Sibylla» e, se ritoccato, «, ritoccato a mano» |

**Barra di stato, parte sinistra**: senza selezione «Trascina un dipendente su un giorno e scegli il turno; clicca un
chip per cambiarlo» (vista per giorno) o «Clicca una casella per assegnare, cambiare o togliere il turno» (vista per
dipendente). Con un dipendente selezionato (solo vista per giorno): pallino reparto + «Clicca i giorni per assegnare
**Nome Cognome** con il turno» + un pulsante per ogni turno valido del reparto (sigla + nome, tooltip «Mattina
07:00–15:00 · 7,5 h», `role="radio"`; preselezionato il turno proposto del reparto) + link «Annulla selezione».

**Elenco del personale** (riga): grip, nome, sotto «‹reparto› · ‹tipo contratto›» oppure, senza contratto, pulsante
arancio `fa-solid fa-file-circle-exclamation` «Contratto non indicato» (tooltip «Senza contratto in anagrafica le ore
non si possono controllare. Apri l'Archivio del personale per indicarlo.», naviga a `archivio-personale`); icona
ombrellone se ha assenze nella settimana (invariata); a destra il blocco **ore**:

- riga 1: «32/40 h» (ore assegnate / ore attese), Poppins 12 px bold, colore **verde** se ok, **arancio** se sotto,
  **rosso** se oltre, grigio senza contratto («40 h»); triangolo rosso davanti se mancano riposi o c'è un riposo < 11 h;
- riga 2 (10,5 px, text-inactive): «2 riposi» e, se ci sono assenze, « · 4 ass.»; rosso bold se 0 riposi;
- tooltip su più righe: «32 h assegnate su 40 h attese (Full time, 40 h meno 1 giornata di assenza)», «8 h ancora da
  assegnare» / «2 h oltre il contratto (straordinario)», «5 giorni in turno · 2 riposi · 1 di assenza», «Nessun giorno
  di riposo nella settimana», «Meno di 11 h di riposo prima di martedì 17 nov».
- Intestazione colonna: «Personale» e a destra «Ore · riposi» (tooltip «Ore assegnate nella settimana / ore da
  contratto, e giorni di riposo»).

**Chip in turno** (vista per giorno): `[sigla] I. Cognome ×`. La sigla è un quadratino 20 px colorato col colore del
turno (`--chart-N`), testo bianco 11 px extra-bold. Bordo sinistro 3 px nel colore del reparto. Tooltip completo:
«Giulia Conti · Front office · Mattina 07:00–15:00 (7,5 h) · clic per cambiare turno», con eventuali « · ferie da
approvare», « · in ferie: non conta nella copertura, toglilo dal turno», « · solo 8 h di riposo dal turno precedente».
Triangolo rosso nel chip se riposo breve o assenza bloccante (chip a righe diagonali). Clic o Invio → menu turno; × →
toglie (tooltip «Togli dal turno»). Chip ordinati per reparto e poi per ora d'inizio.

**Orario fisso**: nell'elenco del personale il dipendente ha un lucchetto al posto del grip (tooltip «Orario fisso: già
pianificato dal contratto») e non è trascinabile; il suo chip è [F] grigio su sfondo `--color-bg`, senza × e con
`fa-lock`; nella vista per dipendente le sue celle sono grigie e non cliccabili (tooltip «… · orario fisso dal
contratto» o «Riposo (orario fisso dal contratto)»). Ogni tentativo di modifica mostra il toast info «Luca Hambelli ha
un orario fisso (Full time 40 h · 5 giorni): i suoi giorni vengono dal contratto. Per cambiarli modifica l'orario di
lavoro nell'Archivio del personale.» Legenda: «[F] Orario fisso (dal contratto)».

**Schema di rotazione**: sottotitolo del dipendente «Front office · Turnista 40 h · 5 giorni · Ricevimento 5+2 M/I/P»;
nel menu turno il turno previsto dallo schema per quel giorno sta **in cima**, con la riga primary `fa-arrows-rotate`
«Previsto dallo schema «Ricevimento 5+2 M/I/P»»; nella vista per dipendente una cella vuota mostra la sigla prevista
con il punto di domanda («P?», colore `--color-primary-300`) e il tooltip «Riposo · lo schema prevede Pomeriggio · clic
per assegnare» oppure «… · riposo previsto dallo schema». Il tooltip del blocco ore aggiunge «Orario fisso: …»,
«Schema di rotazione: ‹nome›» e «Flessibilità sulle timbrature: 5 minuti».

**Chip assente**: invariato (a righe, non trascinabile, senza ×), tooltip «‹Nome›: ferie (richiesta da approvare), dal
modulo Gestione ferie e permessi».

**Menu turno** (`.tpe__menu`, popover 280 px sotto il chip/cella o all'inizio dei chip del giorno, z-index 40, ombra
`0 10px 28px rgba(15,23,42,.18)`, radius 10 px): titolo «Turno di Manuel Fantoni · giovedì 19 nov» oppure «Cambia turno
di …». Una voce per turno valido: sigla, nome, «07:00–15:00 · 7,5 h» e avvisi in arancio con triangolo:
«Solo 8 h di riposo dal turno del giorno prima», «Solo 9 h di riposo prima del turno del giorno dopo», «Porta la
settimana a 45 h su 40 attese». Voce corrente con spunta. In modifica, in fondo (rosso) `fa-xmark` «Togli dal turno
(riposo)». Si chiude con Esc o clic fuori. Se il reparto non ha turni: «Nessun turno valido per il reparto in
Configuratore › Turnistica.»

**Copertura** (ultima colonna; nella vista per dipendente nel piede della tabella, riga «Copertura per fascia» /
«Copertura per reparto»):

- con un reparto filtrato: «M 2/2  P 1/2» per le fasce con fabbisogno o persone; verde se coperta, arancio con
  triangolo se scoperta; «Nessun fabbisogno» se il reparto è chiuso quel giorno. Tooltip «Front office: M 1/1 · P 1/1
  (segue l'occupazione). M = mattina 07:00–15:00, P = pomeriggio 15:00–23:00, N = notte 23:00–07:00.» (fasce dalla
  configurazione);
- con «Tutti i reparti»: griglia 3 colonne di **codici reparto** (`RepartoHr.codice`: FO, FB, HK, MAN, CUC, AMM) con
  `fa-check` verde, `fa-triangle-exclamation` arancio o `fa-minus` grigio (nessun fabbisogno). Tooltip
  «‹testo reparto›. Clicca per il dettaglio del reparto.»; clic → imposta il filtro Reparto.

**Occupazione**: barra in scala di blu (`--color-primary-200` basso <65%, `-400` medio 65–84%, `-700` alto ≥85%).
Tooltip «Occupazione prevista 94%: carico di lavoro alto, servono più persone nei reparti che seguono l'occupazione».
Intestazione «Occupazione» sottolineata a puntini con tooltip «Occupazione prevista della struttura e carico di lavoro
che comporta».

**Legenda**: sigle dei turni (validi per il reparto filtrato, o tutti) con nome e orario · separatore · reparti ·
separatore · «Assente (non conta in copertura)» · «Richiesta da approvare» · lucchetto «Giorno passato» · «Carico di
lavoro ▬ basso ▬ medio ▬ alto» (tooltip «La barra indica il carico di lavoro che l'occupazione prevista porta ai
reparti, non un giudizio sull'occupazione: un'occupazione alta è positiva, ma richiede più personale.»).

**Giorno passato**: badge del giorno **identico** agli altri (stesso colore e dimensione); sull'angolo in alto a destra
un cerchietto 18 px (`top/right: -6px`, sfondo `--color-text-inactive`, bordo 2 px `--color-surface`, `fa-solid fa-lock`
8 px bianco) con tooltip «Giorno passato: ha timbrature collegate, si modifica solo dopo conferma». La riga ha sfondo
surface e bordo 1 px invece dello sfondo `--color-bg`.

**Vista per dipendente** (`.sib-table`, `table-layout: fixed`, colgroup 19% / 7×9,5% / 14,5%; sotto 1180 px
17% / 7×9,75% / 14,75% e si nasconde l'orario nelle celle):
- intestazione giorno «🔒 LUN 16 nov» + occupazione «62%» (tooltip); oggi in colore link; passati grigi;
- riga di gruppo per reparto: pallino + nome + «Fabbisogno sull'occupazione» / «Minimo fisso»;
- cella: pulsante 28 px con sigla + orario breve («07–15», «10–14/18–22»), oppure «R» tratteggiato (riposo, clic per
  assegnare), oppure testo arancio dell'assenza bloccante («Ferie»), con tooltip; bordo rosso + triangolo se riposo
  breve o in assenza; clic → menu turno nella cella; colonna di oggi con sfondo `--color-primary-50`, passati `--color-bg`;
- ultima colonna: blocco ore/riposi come nell'elenco.

**Modale «Suggerimento di Sibylla»** (ora `size="xl"`): testo «Turno proposto per la settimana **16 – 22 nov 2026**:
per ogni persona il giorno e il turno, calcolati su occupazione, fabbisogno per fascia di ciascun reparto, ore da
contratto, riposo di 11 ore e richieste di ferie, permessi e malattia.»; KPI «Occupazione media», «Picco», **«Fasce
coperte» «48 su 59»**, «Assenze considerate»; 7 colonne con «🔒 LUN 16 nov», «62% · 6 in turno» e l'elenco
«[sigla] Cognome» (bordo sinistro colore reparto, tooltip nome completo, reparto, turno e orario; filtrato sul reparto
selezionato); giorni passati al 60% di opacità; note; avviso «Applicando il suggerimento sostituisci i 38 turni già
inseriti nei giorni a venire: il turno andrà ripubblicato.» (la parte dopo i due punti solo se già pubblicato).

### 3.3 Interazioni

| Trigger | Risultato |
|---|---|
| Trascino un dipendente dall'elenco su un giorno | Se ha un'assenza bloccante → toast warning «‹Nome› è in ferie lunedì 16 nov.»; se è già in turno quel giorno → niente; se il giorno è passato → conferma (sotto); se il reparto ha **un solo** turno valido → assegnato subito; altrimenti **menu turno** nel giorno |
| Scelgo un turno nel menu | Assegnato. Se ci sono avvisi → toast warning «‹Nome›, giovedì 19 nov (P): solo 8 h di riposo dal turno del giorno prima.»; se ha una richiesta in attesa → toast info «‹Nome› ha una richiesta di ferie da approvare per giovedì 19 nov.» |
| Trascino un chip su un altro giorno | Sposta mantenendo il turno (conferma se uno dei due giorni è passato); avvisi via toast |
| Seleziono un dipendente e clicco un giorno | Assegna con il turno scelto nella barra di stato (default: turno proposto del reparto) |
| Clic sul chip / sulla cella | Menu «Cambia turno di …» (o «Turno di …» su una cella vuota); «Togli dal turno (riposo)» rimuove |
| × sul chip | Rimuove (conferma se passato) |
| Qualsiasi modifica | Salvata subito. Se la settimana era pubblicata → stato **da-ripubblicare** |
| Azione su un giorno passato | `ConfirmDialog` «Giorno già passato»: «**lunedì 16 nov** è già passato e ha timbrature collegate al turno: cambiandolo, presenze e ritardi di quel giorno verranno ricalcolati. Vuoi modificarlo comunque?» — «Modifica» / «Annulla». Una volta confermato, quel giorno resta sbloccato per la sessione |
| «Svuota i giorni a venire» | Conferma «Svuota settimana» (danger): «Vuoi togliere i ‹n› turni dei giorni a venire della settimana **‹sett›**? I giorni già passati restano come sono.» Disabilitato se non ci sono turni futuri |
| «Suggerimento Sibylla» | Se la settimana è tutta passata → toast info «La settimana è già passata: il suggerimento vale per i giorni a venire.»; altrimenti modale. «Applica suggerimento» sostituisce **solo i giorni da oggi in poi**; toast success «Turno della settimana ‹sett› proposto da Sibylla: puoi rifinirlo trascinando i nomi o cambiando i turni.» |
| «Pubblica turno» | Conferma «Pubblica turno»: «Il turno della settimana **‹sett›** arriverà ai dipendenti nel Centro notifiche, con i pulsanti **Scarica PDF** e **Visualizza turno**. Le modifiche successive andranno ripubblicate.» → toast «Turno inviato a ‹n› dipendenti nel Centro notifiche.» Settimana vuota → toast warning «La settimana non ha turni da pubblicare.» |
| «Ripubblica turno» | Conferma «Ripubblica turno»: «Il turno aggiornato della settimana **‹sett›** arriverà nel Centro notifiche ai **‹n› dipendenti coinvolti** dalle modifiche: ‹nomi›.» (se nessuno: «Le modifiche hanno riportato il turno com'era alla pubblicazione: nessun dipendente riceverà notifiche.») → toast «Turno aggiornato: notificato a ‹n› dipendenti coinvolti.» / «Turno ripubblicato senza variazioni per i dipendenti.» |
| Clic su un codice reparto della copertura | Filtro Reparto = quel reparto |
| Cambio vista / settimana / reparto | Chiude il menu turno aperto |

### 3.4 Regole di calcolo (riferimento: `src/store/useTurniPersonaleStore.ts`)

```
intervalli(turno)   = [inizio, fine] (+ [inizio2, fine2]) in minuti; se fine ≤ inizio → fine + 1440
oreTurno(turno)     = (Σ durate − pausaMin) / 60
fasce(turno)        = fasce attive F per cui Σ sovrapposizione(intervalli, F) ≥ coperturaMinOre·60
                      (F della notte: 23:00→07:00 = [1380, 1860]; si confronta anche con F ± 1440)
turnoDel(g, d)      = turno assegnato; se l'assegnazione non ha turno → turno proposto del reparto
turniValidi(rep)    = turni con reparti vuoti oppure che contengono repartoId
turnoProposto(rep)  = fabbisogno.turnoPredefinito se valido, altrimenti il primo valido

fabbisogno(rep, g)[F] = 0 se giorno ∈ giorniChiusura o F non attiva
                      = base[F] + (modalita = occupazione e occupazione(g) ≥ soglia ? rinforzo[F] : 0)
inServizio(g)       = assegnati di g senza assenza bloccante
copertura(rep, g)[F] = |{ d ∈ inServizio(g), reparto(d) = rep, F ∈ fasce(turnoDel(g, d)) }|
fascia ok           ⇔ copertura ≥ fabbisogno;   reparto ok ⇔ tutte le fasce ok;   «chiuso» se nessuna fascia ha fabbisogno o persone

riposoPrima(g, d)   = (1440 + inizio(turno di g) − fine(turno di g−1)) / 60      (null se uno dei due manca)
riposoDopo(g, d)    = (1440 + inizio(turno di g+1) − fine(turno di g)) / 60
riposo breve        ⇔ < riposoMinOre   (anche a cavallo tra due settimane: la domenica precedente conta)

ore(d)              = Σ oreTurno dei 7 giorni
assenze(d)          = giorni con assenza bloccante
oreAttese(d)        = max(0, contratto.ore − assenze · contratto.ore / contratto.giorni)   (arrotondato a 0,1)
stato ore           = senza-contratto | sopra (ore > attese) | sotto (ore < attese − tolleranzaSottoOre) | ok
riposi(d)           = max(0, 7 − giorni in turno − assenze)
```

**Contratto → orario** (`contrattoDi`): contratto vigente del dipendente (ultimo per decorrenza con `orarioId`) →
`OrarioHr` → `{ tipo: orario.nome, ore: oreSettimanali, giorni: giorniLavorativi, aTurni, flessibilitaMin, schemaId,
ancoraSchema: decorrenza }`. Senza contratto o orario → «Contratto non indicato» (pianificato su 40 h / 5 g standard).
Nella demo i dipendenti 1–12 non hanno contratti nello storico: il contratto si cerca per **nome** (Andrea Grimaudo ne
ha uno reale → «Turnista 40 h · 6 giorni») e in mancanza vale un inquadramento d'esempio: 1, 6 Turnista 40 h · 5 g;
2 idem + schema «Ricevimento 5+2 M/I/P»; 8 idem + schema «Piani 5+2 con couverture»; 3, 10 Turnista 40 h · 6 g; 4, 5
Turnista part time 32 h · 4 g; 7 Turnista part time 16 h · 2 g; 11 A chiamata 24 h · 3 g; **9 Luca Hambelli Full time
40 h · 5 giorni (orario fisso)**; **12 Paolo Greco senza contratto**. Nel backend: sempre dal contratto vigente.

**Orario fisso** (`haOrarioFisso`, `turnoFisso`, `assegnazioniEffettive`):

```
turnoFisso(d, g)  = la giornata dell'orario per il giorno della settimana di g, come turno sintetico
                    { id: 'fisso-<orarioId>-<giorno>', sigla: 'F', nome: 'Orario fisso · <nome orario>',
                      fasce = prima e ultima fascia della giornata, pausa della giornata, colore 0 (grigio) }
                    null se il giorno non è lavorato
assegnazioniEffettive(salvate, giorni) = salvate senza i dipendenti a orario fisso
                    + i dipendenti a orario fisso nei loro giorni lavorati, tolti i giorni con assenza bloccante
```

Viste, copertura, riepilogo ore, pubblicazione (fotografia), PDF e orario atteso delle timbrature usano le assegnazioni
effettive. I dipendenti a orario fisso **non si salvano** fra le assegnazioni: si ricalcolano sempre dall'orario.

**Schema di rotazione** (`passoSchema`): `passo(d, g) = sequenza[(giorni da ancoraSchema a g) mod lunghezza]`;
l'ancora è la decorrenza del contratto (demo: lunedì 5 gennaio 2026). Restituisce l'id del turno, `R` o niente.

### 3.5 Stato della settimana e pubblicazione

```
SettimanaTurni { origine: 'manuale' | 'sibylla', modificata?: bool, pubblicataAt?: ISO, daRipubblicare?: bool }
stato = pubblicataAt == null ? 'bozza' : daRipubblicare ? 'da-ripubblicare' : 'pubblicato'
```

- Ogni modifica (assegna, cambia turno, togli, sposta, svuota, applica suggerimento) imposta `daRipubblicare = true` se
  la settimana era pubblicata, e `modificata = true` se l'origine è Sibylla.
- **Pubblicare** crea una `PubblicazioneTurno` immutabile `{ id, lunedi, at, assegnazioni, turni (giorno|dip → turnoId),
  destinatari, aggiornamento, coinvolti }`, imposta `pubblicataAt = at` e `daRipubblicare = false`.
- Se esiste già una pubblicazione della stessa settimana è un **aggiornamento**: `coinvolti` = dipendenti per cui, in
  almeno un giorno, cambia la presenza o il turno rispetto all'ultima pubblicazione; `destinatari = |coinvolti|`.
  Notifica «Turno settimanale aggiornato» solo a loro: «Il turno della settimana ‹sett› è cambiato per ‹n› dipendenti
  (‹nomi›): scaricalo in PDF o visualizzalo online.» Prima pubblicazione: «Turno settimanale pubblicato» a tutti i
  dipendenti in turno (testo invariato).
- Il dettaglio della notifica mostra «Dipendenti coinvolti» (nomi) invece di «Dipendenti in turno» per gli aggiornamenti.
- «Visualizza turno» e PDF ora mostrano **sigla colorata + orario** per cella e la colonna **«Ore»** (ore della
  settimana, es. «37,5 h») al posto di «Giorni».

### 3.6 Algoritmo di Sibylla (coppie persona + turno)

Input: lunedì, richieste di assenza, configurazione (turni, regole), contratti, occupazione; opzionale: turno esistente
e `daGiorno` (= oggi). Output: assegnazioni + turno per assegnazione, KPI, scoperture, note.

```
giorni bloccati = giorni < daGiorno (copiati com'erano, contano per ore e riposi); la domenica precedente serve per il riposo
chi ha l'orario fisso è già in tutti i suoi giorni (assegnazioniEffettive) e non viene mai spostato
per ogni reparto (ordine REPARTI_HR):
  limiti(d) = { giorni: orario.giorni − assenze bloccanti, ore: oreAttese }   (senza contratto: 5 g / 40 h)
  può(d, g, t) = non a orario fisso ∧ nessuna assenza (neanche in attesa) ∧ non già in turno ∧ giorni < limite
                 ∧ ore + oreTurno(t) ≤ limite ∧ riposoPrima ≥ riposoMin ∧ riposoDopo ≥ riposoMin
  giro 0: chi ha uno schema riceve, nei giorni liberi in ordine di data, il turno del passo se è valido nel reparto e può(…)
  nei giri successivi un giorno in cui lo schema prevede R non si assegna; fra i candidati vince chi ha nello schema
  proprio quel turno, poi chi ha più ore residue; nel 2° giro il turno dello schema si prova per primo
  1° giro, due passate (cap = 1, poi illimitato), giorni liberi in ordine di occupazione decrescente:
     finché ci sono fasce con copertura < min(fabbisogno, cap):
        turni validi ordinati per n. di fasce scoperte coperte (desc), a pari merito il turno proposto;
        per il primo turno che ha un candidato: candidato = chi ha più ore residue; assegna
  2° giro: per ogni dipendente, giorni liberi per occupazione decrescente (escluso il reparto chiuso):
        turni validi che coprono una fascia con fabbisogno, ordinati per margine minimo (copertura − fabbisogno) crescente,
        poi turno proposto; assegna il primo possibile
  scoperture = per giorno libero e fascia: fabbisogno − copertura > 0
KPI: occupazioneMedia, picco, fasceCoperte = Σ min(copertura, fabbisogno), fasceTot = Σ fabbisogno, assenzeConsiderate
```

Le assegnazioni restituite **non contengono** i dipendenti a orario fisso (il conteggio «turni» sì); la modale li
mostra applicando `assegnazioniEffettive`.

Note restituite (testi esatti, nell'ordine):
1. (se ci sono giorni bloccati) «Il giorno passato resta com'è: hanno già timbrature collegate.» / «I 2 giorni passati
   restano com'erano: hanno già timbrature collegate.»
2. «Picco di occupazione sabato 21 nov (97%): più personale su Front office, F&B, Housekeeping, Cucina. Manutenzione,
   Amministrazione: minimo fisso.» (reparti dalle regole)
3. «Ogni turno rispetta il monte ore del contratto e le 11 ore di riposo fra un turno e l'altro.»
4. «Seguono il loro schema di rotazione: Giulia Conti (Ricevimento 5+2 M/I/P), Oscar Pettinari (Piani 5+2 con
   couverture).» e «Con orario fisso, già pianificati dal contratto: Luca Hambelli.»
5. per chi non ha contratto: «Paolo Greco: contratto non indicato in anagrafica, pianificato su 40 h standard.»
6. per assenza: «‹Nome›: richiesta di ferie ancora da approvare (2 gg), lasciata libera per prudenza.» /
   «‹Nome› assente per malattia (3 gg): turni coperti dai colleghi del reparto.»
7. per reparto con scoperture: «Front office: restano scoperte 5 fasce (mar M, mar P, mer M, mer P, ven M). Valuta un
   extra o lo spostamento di un riposo.» (singolare «resta scoperta 1 fascia»; « (2)» dopo la fascia se ne mancano 2)

La notifica «Suggerimento turni del personale» del Centro notifiche mostra «Turni proposti: 38 · fasce coperte 48 su 59».

### 3.7 Persistenza attuale (mock) e dati demo

`sibylla.turni-personale` v2: `{ assegnazioni: Record<iso, number[]>, turni: Record<'iso|idDip', turnoId>, settimane,
pubblicazioni, focusLunedi }`. Seed: settimana scorsa e corrente generate dall'algoritmo e pubblicate il giovedì
precedente alle 17:30. Un'assegnazione senza voce in `turni` usa il turno proposto del reparto.

### 3.8 Modello dati backend

```sql
HrTurnoSettimana(StrutturaId, Lunedi DATE, Origine VARCHAR(8), Modificata BIT, PubblicataAt DATETIME2 NULL,
                 DaRipubblicare BIT, Version INT,  PK(StrutturaId, Lunedi))
HrTurnoAssegnazione(StrutturaId, Giorno DATE, DipendenteId INT, TurnoId VARCHAR(40) NOT NULL,
                    ModificatoDa, ModificatoAt,  PK(StrutturaId, Giorno, DipendenteId))
HrTurnoPubblicazione(Id, StrutturaId, Lunedi, At, Aggiornamento BIT, Destinatari INT, Fotografia NVARCHAR(MAX) /* JSON */)
HrTurnoPubblicazioneCoinvolto(PubblicazioneId, DipendenteId)
```

`TurnoId` sull'assegnazione è **obbligatorio** nel backend (il frontend manda sempre il turno; per i dati migrati dalla
v1 si usa il turno proposto del reparto).

### 3.9 API

Tutte con `?struttura=` e JWT. Gli errori riportano gli stessi controlli del frontend, che resta il primo filtro.

**Lettura settimana**
```
GET /Sibylla/hr/turni?struttura=12&lunedi=2026-11-16
200 {
  "lunedi": "2026-11-16",
  "stato": { "origine": "sibylla", "modificata": true, "pubblicataAt": "2026-11-13T16:30:00Z",
             "daRipubblicare": true, "stato": "da-ripubblicare", "coinvolti": [5, 7] },
  "assegnazioni": [ { "giorno": "2026-11-16", "dipendenteId": 2, "turnoId": "tur-m" }, … ],
  "domenicaPrecedente": [ { "giorno": "2026-11-15", "dipendenteId": 2, "turnoId": "tur-p" } ],   // per il riposo di 11 h
  "giorni": [ { "iso": "2026-11-16", "occupazione": 62, "passato": true }, … ],
  "contratti": { "2": { "orarioId": "ora-tur5", "tipo": "Turnista 40 h · 5 giorni", "ore": 40, "giorni": 5,
                         "aTurni": true, "flessibilitaMin": 5, "schemaId": "sch-fo52", "ancoraSchema": "2026-01-05" },
                  "9": { "orarioId": "ora-ft5", "aTurni": false, … }, "12": null, … },
  "orariFissi": [ { "giorno": "2026-11-16", "dipendenteId": 9, "inizio": "09:00", "fine": "13:00",
                    "inizio2": "14:00", "fine2": "18:00", "pausaMin": 0 }, … ],   // calcolati dall'orario, non salvati
  "assenze": [ { "dipendenteId": 1, "iso": "2026-11-16", "tipo": "Ferie", "inAttesa": false, "ore": null }, … ]
}
```
`occupazione` dal PMS (occupazione prevista). Copertura, ore e riposi si calcolano nel frontend con le formule di § 3.4
e la configurazione di § 2 (oppure il backend può restituirli già calcolati in `riepiloghi` e `coperture`: stessi
valori).

**Modifiche puntuali** (rispondono con la settimana aggiornata come in GET)
```
PUT    /Sibylla/hr/turni/2026-11-16/assegnazioni      { "giorno": "2026-11-19", "dipendenteId": 7, "turnoId": "tur-p",
                                                        "confermaPassato": false }
DELETE /Sibylla/hr/turni/2026-11-16/assegnazioni/2026-11-19/7?confermaPassato=false
POST   /Sibylla/hr/turni/2026-11-16/spostamenti       { "da": "2026-11-19", "a": "2026-11-20", "dipendenteId": 7,
                                                        "confermaPassato": false }
POST   /Sibylla/hr/turni/2026-11-16/svuota            { "giorni": ["2026-11-17", …] }        (solo giorni ≥ oggi)
```
- `PUT` assegnazioni è un upsert: crea o cambia il turno del giorno.
- `409 ASSENZA_BLOCCANTE { "tipo": "Ferie" }` se il dipendente ha un'assenza bloccante quel giorno.
- `422 TURNO_NON_VALIDO` se il turno non è valido per il reparto del dipendente.
- `422 ORARIO_FISSO` se il dipendente ha un orario fisso (i suoi giorni non si assegnano).
- `423 GIORNO_PASSATO` se il giorno è < oggi (fuso della struttura) e `confermaPassato` non è `true`. Le modifiche ai
  giorni passati vanno registrate (audit: chi, quando, prima/dopo) e fanno **ricalcolare presenze e ritardi** di quel
  giorno.
- Avvisi **non bloccanti** (riposo < minimo, ore oltre il contratto) tornano in `"avvisi": ["…"]` con gli stessi
  testi del menu; non impediscono il salvataggio.
- Ogni modifica aggiorna `Modificata` (se origine Sibylla) e `DaRipubblicare` (se pubblicata).

**Suggerimento**
```
POST /Sibylla/hr/turni/2026-11-16/suggerimento           (calcolo, nessuna scrittura; usa oggi come daGiorno)
200 { "lunedi": "2026-11-16",
      "assegnazioni": [ { "giorno": "2026-11-17", "dipendenteId": 2, "turnoId": "tur-i" }, … ],
      "occupazioneMedia": 73, "picco": { "iso": "2026-11-21", "occ": 97 }, "turni": 38,
      "fasceCoperte": 48, "fasceTot": 59, "giorniBloccati": ["2026-11-16"],
      "assenzeConsiderate": [ { "id": 1, "tipo": "Ferie", "inAttesa": false, "giorni": 4 } ],
      "scoperture": [ { "iso": "2026-11-17", "reparto": "Front office", "fascia": "P", "mancano": 1 } ],
      "note": [ "…" ] }
POST /Sibylla/hr/turni/2026-11-16/applica-suggerimento   { "assegnazioni": [ … ], "giorniBloccati": [ … ] }
→ sostituisce solo i giorni non bloccati; origine "sibylla", modificata false, daRipubblicare se era pubblicata. Transazionale.
```

**Pubblica / ripubblica**
```
POST /Sibylla/hr/turni/2026-11-16/pubblica
200 { "id": "pt-…", "lunedi": "2026-11-16", "at": "…", "aggiornamento": true, "destinatari": 2, "coinvolti": [5, 7],
      "assegnazioni": […] }
422 SETTIMANA_VUOTA
```
Transazionale: fotografia + stato + **notifiche** (Centro notifiche e App Op!) ai destinatari (§ 3.5). Il backend
calcola i coinvolti confrontando con l'ultima pubblicazione della settimana. Endpoint per l'anteprima del messaggio di
conferma: `GET /Sibylla/hr/turni/2026-11-16/coinvolti` → `[5, 7]`.

**Pubblicazioni e PDF** (invariati, ora con i turni): `GET /Sibylla/hr/turni/pubblicazioni?struttura=12`,
`GET /Sibylla/hr/turni/pubblicazioni/{id}`, `GET /Sibylla/hr/turni/pubblicazioni/{id}/pdf` (facoltativo).

**Job dei suggerimenti all'HR**: invariato (08:00, cadenza da Configura notifiche), ora con «fasce coperte».

### 3.10 Ordine delle dipendenze lato backend

Turni ← Configurazione HR (turni, regole, reparti, orari, schemi) · Anagrafica/contratti vigenti (orario, schema,
decorrenza) · Richieste di assenza
(approvate e in attesa) · PMS (occupazione prevista) · Notifiche · Presenze/timbrature (§ 4).

---

## 4. Collegamento con timbrature e presenze

Il turno pubblicato (meglio: il turno in vigore) dà l'**orario atteso** del dipendente.

```
turnoPianificato(dip, giorno):
  undefined  → la settimana non ha assegnazioni: si usa il calcolo precedente (mock turnoPrevisto)
  null       → settimana pianificata ma il dipendente quel giorno non è in turno: riposo
  { inizio, fine, stacco? }  in minuti; stacco = pausa fra le due fasce dello spezzato
  (turni a cavallo della mezzanotte, es. N e CE: oggi restano al calcolo precedente → da gestire nel backend
   attribuendo la timbratura al giorno d'inizio del turno)
```

Nel frontend è in `src/modules/hr/_presenze/presenze.model.ts` (`turnoPrevisto`), da cui leggono Registro presenze,
Timbrature e gli avvisi di ritardo (`avvisiRitardo.ts`). Nel backend: **ritardo = prima entrata − inizio del turno
assegnato**, e conta solo se **supera la flessibilità** dell'orario del contratto (`flessibilitaDi`: nel frontend gli
avvisi di ritardo entro la flessibilità non si generano); uscita anticipata e straordinario rispetto alla fine;
spezzato con due entrate/uscite attese (lo stacco fra le fasce è la pausa). Per chi ha l'**orario fisso** vale
l'orario anche nelle settimane non pianificate.

---

## 5. Criteri di accettazione

**Turnistica**
1. La tabella «Turni di servizio» di una struttura nuova contiene gli 11 turni di § 2.2 con ore nette e tipo esatti
   (Spezzato per S e U, Notturno solo per N).
2. Gli schemi includono «Ricevimento 5+2 M/I/P», «Sala colazioni e cena», «Piani 5+2 con couverture» con ≈ 37,5 h, 38 h
   e 35 h a settimana.
3. Una struttura con turni già salvati riceve i turni standard mancanti senza perdere né duplicare i propri (stessa sigla
   = non aggiunto).
4. La sezione «Regole di pianificazione» mostra i tre parametri con default 11 / 3 / 4 e gli hint esatti.
5. In «Fasce di copertura» la colonna «Turni che la coprono» si aggiorna cambiando orari della fascia o «Ore minime per
   coprire una fascia» (con 6 ore la Couverture CV, 5 h, non copre più P).
6. Spegnendo la fascia N la riga si attenua e in Turni del personale scompare N da copertura e fabbisogno.
7. «Fabbisogno per reparto» elenca tutti i reparti attivi, «Direzione» con «Minimo fisso», «Primo turno valido»,
   «M 0 · P 0 · N 0».
8. Nella modale, con «Minimo fisso» la sezione Rinforzo scompare; l'anteprima mostra il fabbisogno con e senza soglia.
9. Eliminando il turno HK, Housekeeping mostra «Primo turno valido» e lo schema «Piani 5+2» perde le HK.
10. «Applica» non salva sul server: compare la barra con il conteggio; «Salva» invia un solo PUT con turni, schemi e
    pianificazione; «Annulla» ripristina.

**Turni del personale**
11. Ogni chip ha la sigla colorata del turno; trascinando un dipendente di F&B su un giorno compare il menu con CO, S,
    CE, M, P (e non N, I, HK…); scegliendo «Cena» il chip diventa [CE].
12. Con «Tutti i reparti» la copertura mostra i codici FO, FB, HK, MAN, CUC, AMM; cliccando FO il filtro diventa Front
    office e la colonna mostra «M x/y  P x/y».
13. Domenica Manutenzione e sabato/domenica Amministrazione risultano «Nessun fabbisogno» / `fa-minus`.
14. Un dipendente in ferie approvate non conta in copertura neanche se è assegnato (chip a righe con triangolo).
15. Il blocco ore mostra «ore/ore attese h»; con 4 giorni di ferie su un Full time 5 g le ore attese sono 8.
16. Paolo Greco (senza contratto) mostra «Contratto non indicato» in arancio, cliccabile verso l'Archivio, ore senza
    denominatore.
17. Assegnando P il lunedì e M il martedì allo stesso dipendente compaiono il toast d'avviso e il triangolo rosso
    (8 h < 11 h).
18. Cambiare un turno in una settimana pubblicata porta lo stato a «Modificato dopo la pubblicazione … da ripubblicare
    (1 dipendente coinvolto)» e il pulsante a «Ripubblica turno»; dopo la ripubblicazione la notifica «Turno
    settimanale aggiornato» va solo ai coinvolti e il pulsante torna «Pubblicato» disabilitato.
19. Ogni azione su un giorno passato chiede la conferma «Giorno già passato»; «Annulla» non cambia nulla.
20. Il suggerimento non modifica i giorni passati, rispetta 11 h di riposo e monte ore, e propone turni diversi
    (es. I per il ricevimento, HK per i piani, S per la cucina).
21. La vista «Per dipendente» non ha scroll orizzontale a 1366 px con la sidenav aperta; sotto 1180 px di container
    l'orario nelle celle si nasconde e resta la sigla.
22. La barra di occupazione è blu in tre intensità e la legenda spiega «Carico di lavoro».
23. PDF e «Visualizza turno» mostrano sigla e orario per cella e il totale «Ore».
24. Con turni pubblicati, Registro presenze e avvisi di ritardo usano l'inizio del turno assegnato come orario atteso.

**Collegamento orari ↔ Turnistica ↔ Turni**
25. Una struttura nuova ha i 13 reparti, 10 orari, 16 turni, 10 schemi e 13 fabbisogni di § 6, identici.
26. Negli Orari di lavoro «Turnista 40 h · 5 giorni» mostra «media di 8 h», turni e schemi compatibili e «Usato da»;
    «Full time 40 h · 5 giorni» mostra il testo dell'orario fisso.
27. Portando un orario a 49 h su 7 giorni compaiono i due avvisi di legge.
28. In Turnistica, «Coerenza con gli orari di lavoro»: eliminando M6 e P6 (in bozza) «Turnista 40 h · 6 giorni» passa
    a «Nessuno» con il triangolo; «Annulla» li ripristina.
29. In Crea anagrafica, scegliendo «Full time 40 h · 5 giorni» il campo schema si disabilita; con «Turnista 40 h · 6
    giorni» e lo schema «Ricevimento 5+2 M/I/P» l'hint dice «non in linea con l’orario».
30. In Turni del personale Luca Hambelli (orario fisso) è già in turno lun–ven [F] 09–13/14–18, non si trascina, non
    ha × e Sibylla non lo tocca; conta nella copertura di Amministrazione.
31. Giulia Conti (schema Ricevimento 5+2) riceve da Sibylla M M I P P R R allineato alla decorrenza; nel menu il turno
    dello schema è in cima con «Previsto dallo schema».
32. Cambiando l'orario nel contratto di un dipendente (es. da 40 h · 5 g a 32 h · 4 g) cambiano le sue ore attese.
33. Un ritardo entro la flessibilità dell'orario non genera l'avviso di ritardo.

---

## 6. Configurazione precompilata: struttura ricettiva tipo

Configurazione HR con cui **nasce ogni nuova struttura** (hotel 3–4 stelle con ristorante, bar e spa). È la stessa che
la demo carica (`src/store/data/hr-struttura-ricettiva.json`, versione 2026-11-17). L'utente poi la adatta in
Configurazione HR (disattivando reparti, cambiando orari, turni e regole).

**Come caricarla nel backend.** Lo script di riferimento `docs/human-resources/seed/hr-struttura-ricettiva.sql` inserisce
tutto per una `@StrutturaId`, in una transazione e **solo ciò che manca** (per id): si può rieseguire senza duplicare e
senza toccare le personalizzazioni. Uso consigliato:
1. adattare nomi di tabelle e colonne al Portal (convenzioni DbUp: nuovo script numerato a sei cifre in `1 - Data`,
   oppure una stored procedure `HrConfig_PrecompilaStrutturaRicettiva @StrutturaId` richiamata alla **creazione della
   struttura**);
2. eseguirlo una volta per ogni struttura esistente (migrazione);
3. le strutture già configurate ricevono solo gli elementi mancanti, come fa la migrazione v11 del frontend.

I `responsabile` dei reparti sono vuoti (nella demo sono valorizzati a parte). I colori sono indici 1–8 della palette
`--chart-*`.

### 6.1 Reparti (13)

| id | Nome | Codice | Centro di costo | Colore | Reparto App Op! | Descrizione |
|---|---|---|---|---|---|---|
| `rep-dir` | Direzione | DIR | CDC-05 Sede | 7 | — | Direzione della struttura e qualità. |
| `rep-fo` | Front office | FO | CDC-01 Ricevimento | 1 | frontOffice | Ricevimento, check-in e check-out, portiere di notte e night audit. |
| `rep-port` | Portineria e facchinaggio | PORT | CDC-01 Ricevimento | 8 | frontOffice | Concierge, bagagli, navette e parcheggio. |
| `rep-hk` | Housekeeping | HK | CDC-03 Piani | 3 | pulizie | Pulizia e rifacimento delle camere, aree comuni, couverture. |
| `rep-lav` | Lavanderia e guardaroba | LAV | CDC-03 Piani | 6 | pulizie | Biancheria, divise e lavanderia ospiti. |
| `rep-fb` | F&B | FB | CDC-02 Ristorazione | 2 | foodBeverage | Sala ristorante: colazioni, pranzo e cena. |
| `rep-bar` | Bar | BAR | CDC-02 Ristorazione | 4 | foodBeverage | Bar, lounge e servizio in camera serale. |
| `rep-cuc` | Cucina | CUC | CDC-02 Ristorazione | 5 | foodBeverage | Brigata di cucina e pasticceria. |
| `rep-spa` | Spa e benessere | SPA | CDC-06 Servizi | 7 | — | Centro benessere, piscina e palestra. |
| `rep-man` | Manutenzione | MAN | CDC-04 Manutenzione | 4 | manutenzione | Manutenzione ordinaria, impianti e reperibilità. |
| `rep-mag` | Magazzino | MAG | CDC-04 Manutenzione | 6 | magazzino | Ricevimento merci, scorte e inventari. |
| `rep-amm` | Amministrazione | AMM | CDC-05 Sede | 6 | risorseUmane | Contabilità, personale e acquisti. |
| `rep-com` | Commerciale e booking | COM | CDC-05 Sede | 8 | — | Vendite, revenue, gruppi ed eventi. |

### 6.2 Orari di lavoro (10)

| id | Nome | Regime | A turni | Ore/sett. | Giorni | Flessibilità | Giornate |
|---|---|---|---|---|---|---|---|
| `ora-ft5` | Full time 40 h · 5 giorni | Full time | no | 40 | 5 | 15′ | Lun 09:00–13:00 + 14:00–18:00; Mar 09:00–13:00 + 14:00–18:00; Mer 09:00–13:00 + 14:00–18:00; Gio 09:00–13:00 + 14:00–18:00; Ven 09:00–13:00 + 14:00–18:00 |
| `ora-ft6` | Full time 40 h · 6 giorni | Full time | no | 40 | 6 | 10′ | Lun 08:00–15:10 (pausa 30′); Mar 08:00–15:10 (pausa 30′); Mer 08:00–15:10 (pausa 30′); Gio 08:00–15:10 (pausa 30′); Ven 08:00–15:10 (pausa 30′); Sab 08:00–15:10 (pausa 30′) |
| `ora-ftsab` | Full time 40 h · sabato mattina | Full time | no | 40 | 6 | 10′ | Lun 08:30–12:30 + 13:30–17:00; Mar 08:30–12:30 + 13:30–17:00; Mer 08:30–12:30 + 13:30–17:00; Gio 08:30–12:30 + 13:30–17:00; Ven 08:30–12:30 + 13:30–17:00; Sab 08:30–11:00 |
| `ora-tur` | Turnista 40 h · 6 giorni | Full time | sì | 40 | 6 | 0′ | a turni (giornate dalla Turnistica) |
| `ora-tur5` | Turnista 40 h · 5 giorni | Full time | sì | 40 | 5 | 5′ | a turni (giornate dalla Turnistica) |
| `ora-tur32` | Turnista part time 32 h · 4 giorni | Part time verticale | sì | 32 | 4 | 5′ | a turni (giornate dalla Turnistica) |
| `ora-tur16` | Turnista part time 16 h · 2 giorni | Part time verticale | sì | 16 | 2 | 5′ | a turni (giornate dalla Turnistica) |
| `ora-chi24` | A chiamata fino a 24 h · 3 giorni | Part time misto | sì | 24 | 3 | 5′ | a turni (giornate dalla Turnistica) |
| `ora-pt30` | Part time 30 h orizzontale | Part time orizzontale | no | 30 | 5 | 10′ | Lun 09:00–15:00; Mar 09:00–15:00; Mer 09:00–15:00; Gio 09:00–15:00; Ven 09:00–15:00 |
| `ora-pt24` | Part time 24 h verticale | Part time verticale | no | 24 | 3 | 10′ | Lun 08:00–16:30 (pausa 30′); Mar 08:00–16:30 (pausa 30′); Mer 08:00–16:30 (pausa 30′) |

### 6.3 Turni di servizio (16)

Reparti indicati per codice (vedi 6.1); «tutti» = utilizzabile in ogni reparto.

| id | Sigla | Nome | Fasce | Pausa | Ore nette | Colore | Reparti | Tipo |
|---|---|---|---|---|---|---|---|---|
| `tur-m` | M | Mattina | 07:00–15:00 | 30′ | 7,5 | 1 | tutti | Diurno |
| `tur-p` | P | Pomeriggio | 15:00–23:00 | 30′ | 7,5 | 3 | tutti | Diurno |
| `tur-n` | N | Notte | 23:00–07:00 | 30′ | 7,5 | 6 | FO | Notturno |
| `tur-i` | I | Intermedio check-in | 11:00–19:00 | 30′ | 7,5 | 7 | FO, PORT | Diurno |
| `tur-m6` | M6 | Mattina 6 giorni | 07:00–14:00 | 20′ | 6,67 | 1 | tutti | Diurno |
| `tur-p6` | P6 | Pomeriggio 6 giorni | 15:00–22:00 | 20′ | 6,67 | 3 | tutti | Diurno |
| `tur-co` | CO | Colazioni | 06:00–14:00 | 30′ | 7,5 | 4 | FB, CUC, BAR | Diurno |
| `tur-s` | S | Spezzato pranzo e cena | 10:00–14:00 / 18:00–22:00 | 0′ | 8 | 5 | FB, CUC, BAR | Spezzato |
| `tur-ce` | CE | Cena | 16:00–00:00 | 30′ | 7,5 | 8 | FB, CUC | Diurno |
| `tur-bs` | BS | Bar sera | 18:00–02:00 | 30′ | 7,5 | 8 | BAR | Notturno |
| `tur-c` | C | Centrale | 09:00–17:00 | 60′ | 7 | 2 | HK, LAV, MAG, AMM, MAN | Diurno |
| `tur-hk` | HK | Rifacimento camere | 08:00–16:00 | 30′ | 7,5 | 2 | HK | Diurno |
| `tur-cv` | CV | Couverture serale | 17:00–22:00 | 0′ | 5 | 6 | HK | Diurno |
| `tur-sm` | SM | Spa mattina | 09:00–17:00 | 30′ | 7,5 | 5 | SPA | Diurno |
| `tur-sp` | SP | Spa pomeriggio | 13:00–21:00 | 30′ | 7,5 | 7 | SPA | Diurno |
| `tur-u` | U | Ufficio | 09:00–13:00 / 14:00–18:00 | 0′ | 8 | 1 | AMM, DIR, COM | Spezzato |

### 6.4 Schemi di rotazione (10)

| id | Nome | Descrizione (testo esatto) | Sequenza | ≈ h/sett. |
|---|---|---|---|---|
| `sch-cc` | Ciclo continuo 3 turni | «Due mattine, due pomeriggi, due notti, due riposi: copre le 24 ore del ricevimento.» | M M P P N N R R | 39,4 |
| `sch-61` | Rotazione 6+1 M/P | «Settimana di mattine e settimana di pomeriggi alternate, un riposo a settimana.» | M M M M M M R P P P P P P R | 45 |
| `sch-52` | Centrale 5+2 | «Cinque giorni sul turno centrale, sabato e domenica di riposo.» | C C C C C R R | 35 |
| `sch-fo52` | Ricevimento 5+2 M/I/P | «Ricevimento senza notte: mattine, intermedio sui check-in e pomeriggi, due riposi consecutivi.» | M M I P P R R | 37,5 |
| `sch-sala` | Sala colazioni e cena | «Due colazioni, uno spezzato, due cene, due riposi: alterna apertura e chiusura del ristorante.» | CO CO S CE CE R R | 38 |
| `sch-piani` | Piani 5+2 con couverture | «Quattro giorni di rifacimento camere e una couverture serale, due riposi.» | HK HK HK HK CV R R | 35 |
| `sch-6c` | Turnista 6+1 a turni corti | «Tre mattine e tre pomeriggi da 6 h 40, un riposo: 40 ore su 6 giorni.» | M6 M6 M6 P6 P6 P6 R | 40 |
| `sch-bar` | Bar giorno e sera | «Due colazioni, uno spezzato, due serate, due riposi.» | CO CO S BS BS R R | 38 |
| `sch-spa` | Spa 5+2 | «Mattine e pomeriggi alternati sulla Spa, due riposi.» | SM SM SP SP SM R R | 37,5 |
| `sch-uff` | Ufficio 5+2 | «Cinque giorni d'ufficio, sabato e domenica di riposo.» | U U U U U R R | 40 |

### 6.5 Regole di pianificazione

Fasce: M «Mattina» 07:00–15:00, P «Pomeriggio» 15:00–23:00, N «Notte» 23:00–07:00, tutte attive. Ore minime per
coprire una fascia **3**, riposo minimo **11 h**, tolleranza sul monte ore **4 h**.

| Reparto | Calcolo | Turno proposto | Base M·P·N | Rinforzo | Soglia | Senza fabbisogno |
|---|---|---|---|---|---|---|
| Direzione | fisso | U | 1·0·0 | — | — | Sab, Dom |
| Front office | occupazione | M | 1·1·0 | +1 M | 85% | — |
| Portineria e facchinaggio | occupazione | M | 1·1·0 | +1 M | 85% | — |
| Housekeeping | occupazione | HK | 1·0·0 | +1 M | 85% | — |
| Lavanderia e guardaroba | occupazione | C | 1·0·0 | +1 M | 90% | Dom |
| F&B | occupazione | S | 1·1·0 | +1 P | 80% | — |
| Bar | occupazione | S | 1·1·0 | +1 P | 80% | — |
| Cucina | occupazione | S | 1·1·0 | +1 P | 80% | — |
| Spa e benessere | fisso | SM | 1·1·0 | — | — | — |
| Manutenzione | fisso | M | 1·0·0 | — | — | Dom |
| Magazzino | fisso | C | 1·0·0 | — | — | Sab, Dom |
| Amministrazione | fisso | C | 1·0·0 | — | — | Sab, Dom |
| Commerciale e booking | fisso | U | 1·0·0 | — | — | Sab, Dom |

### 6.6 Tabelle (oltre a quelle di § 2.6)

```sql
HrReparto(StrutturaId, Id, Nome, Codice, Responsabile, CentroCosto, Colore TINYINT, RepartoOp NULL, Attivo BIT,
          Descrizione NULL, PK(StrutturaId, Id))
HrOrario(StrutturaId, Id, Nome, Regime VARCHAR(30), ATurni BIT, OreSettimanali DECIMAL(4,1), GiorniSettimana TINYINT,
         FlessibilitaMin SMALLINT, Giorni NVARCHAR(MAX) /* JSON: 7 × { attivo, fasce:[{inizio,fine}], pausaMin } */,
         PK(StrutturaId, Id))
```

---

## 7. Punti aperti

- **Contratti**: nella demo il collegamento dipendente → contratto è per nome (gli id dei dipendenti HR 1–12 non
  coincidono con gli id anagrafica). Nel backend: chiave anagrafica.
- **Reparti in Turni del personale**: la pagina elenca ancora i 6 reparti della demo (`REPARTI_HR`); con la
  configurazione tipo deve elencare i **reparti attivi della configurazione** che hanno dipendenti (Portineria, Bar,
  Spa, Lavanderia, Magazzino, Commerciale, Direzione inclusi).
- **Turni a cavallo della mezzanotte** nelle timbrature (§ 4).
- **Ruoli**: chi può modificare i giorni passati e chi può pubblicare (oggi nessun controllo nella demo).
- **Occupazione**: oggi mock deterministico (`occupazione(iso)`), va presa dal PMS.

---

## 8. File sorgente

- `src/store/data/hr-struttura-ricettiva.json` — configurazione tipo della struttura ricettiva (fonte del § 6)
- `src/store/useHrConfigStore.ts` — tipi `OrarioHr`, `TurnoHr`, `SchemaTurniHr`, `PianificazioneTurniHr`,
  `FabbisognoRepartoHr`; seed dalla configurazione tipo; coerenza (`turniCompatibili`, `schemiCompatibili`,
  `avvisiOrario`); migrazioni v8–v11
- `src/modules/impostazioni/Configuratore/panes/HrOrari/HrOrari.tsx` / `.sass` — riquadro di collegamento
- `src/modules/hr/CreaAnagrafica/CreaAnagrafica.tsx` — campo «Schema di turnazione»
- `src/modules/hr/_presenze/avvisiRitardo.ts` — flessibilità sui ritardi
- `docs/human-resources/seed/hr-struttura-ricettiva.sql` — script di riferimento per precompilare una struttura
- `src/modules/impostazioni/Configuratore/panes/HrTurnistica/HrTurnistica.tsx` / `.sass`
- `src/store/useTurniPersonaleStore.ts` — contratto → orario, orario fisso, schema, modello, formule, algoritmo,
  stato, `turnoPianificato`, `flessibilitaDi`
- `src/modules/hr/TurniPersonale/TurniPersonale.tsx` / `.sass`
- `src/modules/hr/TurniPersonale/TurnoSettimanale.tsx` / `.sass`, `turnoPdf.ts`
- `src/modules/hr/_presenze/presenze.model.ts` — `turnoPrevisto` legge il turno pianificato
- `src/modules/notifiche/CentroNotifiche/CentroNotifiche.tsx`, `src/layout/NotifMenu.tsx` — notifiche pubblicazione/aggiornamento
