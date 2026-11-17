# 17 — Turni del personale e Turnistica, versione 2 (17 novembre 2026)

> **Per l'agente AI che implementa (team di Lorenzo).** Questo documento descrive la **seconda versione** di due pagine
> collegate di Human Resources e il **backend** che le deve servire:
>
> 1. **Configurazione HR › Turnistica** (`hr-configurazione:hr-turnistica`): ora contiene, oltre a turni e schemi di
>    rotazione, le **Regole di pianificazione** (fasce di copertura, fabbisogno per reparto, riposo minimo, tolleranza);
> 2. **Turni del personale** (`turni-personale`): ora ogni assegnazione è **persona + giorno + turno**, con ore,
>    riposi, copertura per reparto e per fascia, stato di pubblicazione e giorni passati bloccati.
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

1. **Backend, configurazione**: tabelle e API della Turnistica con le Regole di pianificazione (§ 2.6, § 2.7). La pagina
   Turni non funziona senza.
2. **Frontend, Turnistica**: nuova sezione «Regole di pianificazione», turni e schemi standard (§ 2.1–2.5).
3. **Backend, turni**: tabelle, API di lettura/scrittura, stato di pubblicazione, notifiche, algoritmo (§ 3.8–3.11).
4. **Frontend, Turni del personale**: le due viste, chip con turno, menu turno, ore e riposi, copertura, stato (§ 3.1–3.7).
5. **Collegamento con le timbrature**: orario atteso dal turno pubblicato (§ 4).
6. Verifica con i **criteri di accettazione** (§ 5) a 1366, 1440 e 1920 px, sidenav aperta, tema chiaro e scuro.

**Architettura** (vedi `../integrazioni-backend.md`): pagine su Vercel → `SibyllaApiProxy` (JWT) → `SibyllaApi` (.NET,
Dapper, DbUp, Azure SQL). Prefisso API coerente con le altre pagine HR: **`/Sibylla/hr/...`**. Ogni richiesta porta la
struttura (`struttura` = id della struttura selezionata nel filtro «Struttura» o nella topbar). Script DbUp sempre nuovi,
numerati a sei cifre, `CREATE OR ALTER` (convenzioni del Portal).

**Oggi nel frontend tutto è mock**: `useHrConfigStore` (persist `sibylla.hr-config`, **versione 9**) e
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

---

## 1. Glossario e modello comune

| Termine | Significato |
|---|---|
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

CCNL Turismo, 40 h su 5 giorni. Ore nette = durata delle fasce − pausa. Colore = indice della palette `--chart-1…8`.
Reparti: `rep-fo` Front office, `rep-fb` F&B, `rep-hk` Housekeeping, `rep-man` Manutenzione, `rep-cuc` Cucina,
`rep-amm` Amministrazione (vuoto = tutti i reparti).

| id | Sigla | Nome | Fasce | Pausa | Ore nette | Colore | Reparti | Tipo |
|---|---|---|---|---|---|---|---|---|
| `tur-m` | M | Mattina | 07:00–15:00 | 30′ | 7,5 | 1 | tutti | Diurno |
| `tur-p` | P | Pomeriggio | 15:00–23:00 | 30′ | 7,5 | 3 | tutti | Diurno |
| `tur-n` | N | Notte | 23:00–07:00 | 30′ | 7,5 | 6 | rep-fo | Notturno |
| `tur-i` | I | Intermedio check-in | 11:00–19:00 | 30′ | 7,5 | 7 | rep-fo | Diurno |
| `tur-co` | CO | Colazioni | 06:00–14:00 | 30′ | 7,5 | 4 | rep-fb, rep-cuc | Diurno |
| `tur-s` | S | Spezzato pranzo e cena | 10:00–14:00 / 18:00–22:00 | 0′ | 8 | 5 | rep-fb, rep-cuc | Spezzato |
| `tur-ce` | CE | Cena | 16:00–00:00 | 30′ | 7,5 | 8 | rep-fb, rep-cuc | Diurno |
| `tur-c` | C | Centrale | 09:00–17:00 | 60′ | 7 | 2 | rep-hk, rep-amm | Diurno |
| `tur-hk` | HK | Rifacimento camere | 08:00–16:00 | 30′ | 7,5 | 2 | rep-hk | Diurno |
| `tur-cv` | CV | Couverture serale | 17:00–22:00 | 0′ | 5 | 6 | rep-hk | Diurno |
| `tur-u` | U | Ufficio | 09:00–13:00 / 14:00–18:00 | 0′ | 8 | 1 | rep-amm | Spezzato |

Note: «Fine» `00:00` vuol dire mezzanotte (una fine ≤ inizio passa al giorno dopo). Notturno = almeno 3 ore lavorate
tra le 22 e le 6 sommando le fasce (regola invariata, `turnoNotturno`). La sigla `R` è riservata al riposo negli schemi.

### 2.3 Schemi di rotazione standard (seed)

Ai tre esistenti (`sch-cc` Ciclo continuo 3 turni, `sch-61` Rotazione 6+1 M/P, `sch-52` Centrale 5+2) si aggiungono:

| id | Nome | Descrizione (testo esatto) | Sequenza |
|---|---|---|---|
| `sch-fo52` | Ricevimento 5+2 M/I/P | «Ricevimento senza notte: mattine, intermedio sui check-in e pomeriggi, due riposi consecutivi.» | M M I P P R R |
| `sch-sala` | Sala colazioni e cena | «Due colazioni, uno spezzato, due cene, due riposi: alterna apertura e chiusura del ristorante.» | CO CO S CE CE R R |
| `sch-piani` | Piani 5+2 con couverture | «Quattro giorni di rifacimento camere e una couverture serale, due riposi.» | HK HK HK HK CV R R |

**Migrazione** (dati già salvati di una struttura): aggiungere i turni standard il cui `id` **e** la cui `sigla` non
esistono già, e gli schemi standard il cui `id` non esiste. Non toccare quelli dell'utente.

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
Con i turni standard: M ← M, I, CO, S, C, HK, U; P ← P, I, S, CE, CV, U; N ← N.

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

Default (seed `PIANIFICAZIONE_DEFAULT`):

| Reparto | Calcolo | Turno proposto | Base M·P·N | Rinforzo | Soglia | Senza fabbisogno |
|---|---|---|---|---|---|---|
| Front office | occupazione | M | 1·1·0 | +1 M | 85% | — |
| F&B | occupazione | S | 1·1·0 | +1 P | 80% | — |
| Housekeeping | occupazione | HK | 1·0·0 | +1 M | 85% | — |
| Manutenzione | fisso | M | 1·0·0 | — | — | Dom |
| Cucina | occupazione | S | 1·1·0 | +1 P | 80% | — |
| Amministrazione | fisso | C | 1·0·0 | — | — | Sab, Dom |
| altri reparti (es. Direzione) | fisso | primo valido | 0·0·0 | — | — | — |

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

Contratti oggi mock (`CONTRATTI_TURNO`): id 1, 2, 6, 8, 9 Full time 5 g / 40 h; 3, 10 Full time su 6 giorni / 40 h;
4, 5 Part time 80% 4 g / 32 h; 7 Part time 40% 2 g / 16 h; 11 A chiamata 3 g / 24 h; **12 (Paolo Greco) senza
contratto**. Nel backend: dal **contratto vigente** dell'anagrafica (`ContrattoPersonale` → orario `oreSettimanali`
e `giorniSettimana`).

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
per ogni reparto (ordine REPARTI_HR):
  limiti(d) = { giorni: contratto.giorni − assenze bloccanti, ore: oreAttese }   (senza contratto: 5 g / 40 h)
  può(d, g, t) = nessuna assenza (neanche in attesa) ∧ non già in turno ∧ giorni < limite ∧ ore + oreTurno(t) ≤ limite
                 ∧ riposoPrima ≥ riposoMin ∧ riposoDopo ≥ riposoMin
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

Note restituite (testi esatti, nell'ordine):
1. (se ci sono giorni bloccati) «Il giorno passato resta com'è: hanno già timbrature collegate.» / «I 2 giorni passati
   restano com'erano: hanno già timbrature collegate.»
2. «Picco di occupazione sabato 21 nov (97%): più personale su Front office, F&B, Housekeeping, Cucina. Manutenzione,
   Amministrazione: minimo fisso.» (reparti dalle regole)
3. «Ogni turno rispetta il monte ore del contratto e le 11 ore di riposo fra un turno e l'altro.»
4. per chi non ha contratto: «Paolo Greco: contratto non indicato in anagrafica, pianificato su 40 h standard.»
5. per assenza: «‹Nome›: richiesta di ferie ancora da approvare (2 gg), lasciata libera per prudenza.» /
   «‹Nome› assente per malattia (3 gg): turni coperti dai colleghi del reparto.»
6. per reparto con scoperture: «Front office: restano scoperte 5 fasce (mar M, mar P, mer M, mer P, ven M). Valuta un
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
  "contratti": { "1": { "tipo": "Full time", "giorni": 5, "ore": 40 }, "12": null, … },
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

Turni ← Configurazione HR (turni, regole, reparti) · Anagrafica/contratti (ore e giorni) · Richieste di assenza
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
assegnato**, con la flessibilità dell'orario del contratto; uscita anticipata e straordinario rispetto alla fine;
spezzato con due entrate/uscite attese.

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

---

## 6. Punti aperti

- **Contratti**: oggi mock per id dipendente; va letto il contratto vigente dell'anagrafica (ore e giorni settimanali
  dall'orario di lavoro collegato). Gli id dei dipendenti HR demo (1–12) non coincidono con gli id anagrafica.
- **Schemi di rotazione**: si definiscono e si assegnano in anagrafica, ma l'algoritmo dei turni non li usa ancora.
  Evoluzione proposta: se il dipendente ha uno schema, Sibylla parte dal passo dello schema per quel giorno.
- **Turni a cavallo della mezzanotte** nelle timbrature (§ 4).
- **Ruoli**: chi può modificare i giorni passati e chi può pubblicare (oggi nessun controllo nella demo).
- **Occupazione**: oggi mock deterministico (`occupazione(iso)`), va presa dal PMS.

---

## 7. File sorgente

- `src/store/useHrConfigStore.ts` — tipi `TurnoHr`, `SchemaTurniHr`, `PianificazioneTurniHr`, `FabbisognoRepartoHr`;
  seed `SEED_TURNI`, `SEED_SCHEMI`, `PIANIFICAZIONE_DEFAULT`; migrazione v8–v9
- `src/modules/impostazioni/Configuratore/panes/HrTurnistica/HrTurnistica.tsx` / `.sass`
- `src/store/useTurniPersonaleStore.ts` — modello, formule, algoritmo, stato, `turnoPianificato`
- `src/modules/hr/TurniPersonale/TurniPersonale.tsx` / `.sass`
- `src/modules/hr/TurniPersonale/TurnoSettimanale.tsx` / `.sass`, `turnoPdf.ts`
- `src/modules/hr/_presenze/presenze.model.ts` — `turnoPrevisto` legge il turno pianificato
- `src/modules/notifiche/CentroNotifiche/CentroNotifiche.tsx`, `src/layout/NotifMenu.tsx` — notifiche pubblicazione/aggiornamento
