# Portal · Magazzino della Ristorazione: riordino e ordini ai fornitori

> **Per gli sviluppatori del backend.** Estende [portal-magazzino-ristorazione.md](portal-magazzino-ristorazione.md)
> (stessa azione `OpApp/magazzinoFb/Esegui`, stesse convenzioni del § 8 del contratto, stesso schema `magfb`): da leggere
> dopo quella. Le pagine **Riordino** e **Ordini ai fornitori** di Sibylla Platform sono pronte e funzionano sulla demo
> con dati dimostrativi; con il Portal useranno queste azioni. Ultimo aggiornamento: **10 novembre 2026**.

## 0. Cosa fa, in breve

1. **Riordino.** Per ogni articolo si definiscono un **punto di riordino** e una **scorta obiettivo**. Quando giacenza
   più merce già ordinata scende al punto di riordino, l'articolo compare nella pagina Riordino con una quantità
   proposta (fino alla scorta obiettivo, arrotondata alla confezione del fornitore). L'utente corregge e crea le bozze
   d'ordine, una per fornitore.
2. **Ordine.** La bozza si completa (consegna richiesta, note, righe) e si **invia per email** al fornitore con il PDF
   dell'ordine allegato. Il PDF lo genera la pagina; il Portal manda l'email.
3. **Arrivo.** In Ricevi merce il carico (manuale, codice a barre o bolla) si **collega all'ordine**: le quantità
   arrivate si sommano alle righe e l'ordine diventa "arrivato in parte" o "arrivato". La merce ordinata e non arrivata
   conta come "in arrivo" e non viene riproposta dal Riordino.

Decisioni (10 novembre 2026):
- calcolo **solo con la scorta di riordino**, senza previsioni da prenotazioni o ricette;
- invio **solo per email** con PDF allegato;
- creano, inviano, annullano e chiudono gli ordini il **gestore** (amministratore o responsabile F&B); gli altri li
  vedono.

## 1. Dati

### 1.1 Campi nuovi su tabelle esistenti

| Tabella | Campo | Tipo | Significato |
|---|---|---|---|
| `magfb.articoli` | `punto_riordino` | `DECIMAL(18,3) NULL` | Quando giacenza + in arrivo scende a questo valore, l'articolo va riordinato. `NULL` = si usa `scorta_minima`. |
| `magfb.articoli` | `scorta_obiettivo` | `DECIMAL(18,3) NULL` | Livello fino a cui riempire. `NULL` = il doppio del punto di riordino. Se presente, deve essere maggiore del punto di riordino. |
| `magfb.articoli_fornitori` | `confezione` | `DECIMAL(18,3) NULL` | Multiplo d'ordine presso quel fornitore, nell'unità dell'articolo (cartone da 10 kg → `10`). `NULL` = qualsiasi quantità. |
| `magfb.movimenti` | `id_ordine` | `INT NULL` → `magfb.ordini.id` | Il carico che evade l'ordine. |

### 1.2 Tabelle nuove

| Tabella | Campi |
|---|---|
| `magfb.ordini` | `id`, `id_azienda`, `id_struttura`, `numero` (`ORD-aaaa-nnnn`, progressivo per azienda e anno, unico), `id_fornitore`, `stato`, `creato_il`, `creato_da`, `inviato_il`, `inviato_da`, `inviato_a` (indirizzi separati da virgola), `consegna_richiesta` (data), `note`, `motivo_chiusura` |
| `magfb.ordini_righe` | `id_ordine`, `id_articolo`, `quantita`, `prezzo_atteso`, `ricevuta` (somma dei carichi collegati); chiave `(id_ordine, id_articolo)` |
| `magfb.ordini_invii` | `id`, `id_ordine`, `inviato_il`, `inviato_da`, `a`, `cc`, `oggetto`, `esito` (`inviata` / `errore`) — storico degli invii, **senza** corpo né allegato |

Script completo nel § 6.

### 1.3 Stati dell'ordine

| Stato | Significato | Si passa a |
|---|---|---|
| `bozza` | creato, modificabile | `inviato` (invio), `annullato` |
| `inviato` | email partita; niente ancora arrivato | `parziale` / `ricevuto` (carichi), `chiuso`, `annullato` (solo se non è arrivato nulla), `inviato` (reinvio) |
| `parziale` | arrivata una parte | `ricevuto` (carichi), `chiuso` |
| `ricevuto` | arrivato tutto (ogni riga `ricevuta ≥ quantita`) | — |
| `chiuso` | chiuso a mano: il resto non arriverà | — |
| `annullato` | non vale più | — |

Lo stato `parziale` / `ricevuto` lo calcola il Portal **nella stessa transazione del carico** (§ 3.8).

## 2. Regole di calcolo (le fa il Portal)

- **In arrivo** di un articolo in una struttura = somma di `max(0, quantita − ricevuta)` sulle righe degli ordini di
  quella struttura in stato `inviato` o `parziale`. Le bozze **non** contano.
- **Giacenza** = somma delle giacenze dei punti della struttura (come in `giacenze`).
- **Da riordinare** se l'articolo è attivo, `punto = punto_riordino ?? scorta_minima` è maggiore di zero e
  `giacenza + in_arrivo ≤ punto`.
- **Quantità proposta** = `max(0, obiettivo − giacenza − in_arrivo)`, con `obiettivo = scorta_obiettivo ?? punto × 2`,
  arrotondata **per eccesso** al multiplo della `confezione` del fornitore proposto (se c'è), con 3 decimali.
- **Fornitore proposto** = quello dell'ultimo acquisto con prezzo (in pratica il primo con `prezzo` valorizzato),
  altrimenti il primo collegato all'articolo; `null` se l'articolo non ha fornitori.
- **Totale indicativo** dell'ordine = somma di `quantita × prezzo_atteso` (2 decimali). È solo indicativo: fanno fede i
  prezzi della bolla.

## 3. Azioni (dentro `OpApp/magazzinoFb/Esegui`)

Si aggiungono all'elenco chiuso del § A3 di `portal-magazzino-ristorazione.md`. Convenzioni del § 8.0: `snake_case`,
esito `{ success, error_message, id, duplicato, avvisi }` per le azioni che modificano, `id_operazione` per quelle che
creano, messaggi per l'utente in italiano.

| Azione | Tipo | Gestore | Chiave |
|---|---|---|---|
| `riordino` | lettura | | |
| `ordini` | lettura | | |
| `ordine` | lettura | | |
| `salva_ordine` | modifica | ✔ | per creare |
| `invia_ordine` | modifica | ✔ | ✔ |
| `annulla_ordine` | modifica | ✔ | |
| `chiudi_ordine` | modifica | ✔ | |
| `fornitore` | lettura | | (già nel § A7) |

### 3.1 Cambi ad azioni esistenti

- **`articoli`, `articolo`, `cerca_codice`**: l'oggetto articolo ha in più `punto_riordino`, `scorta_obiettivo` (numeri o
  `null`) e, in ogni elemento di `fornitori`, `confezione` (numero o `null`).
- **`salva_articolo`**: accetta `punto_riordino`, `scorta_obiettivo` e `fornitori[].confezione` (facoltativi; assenti =
  `null`). Errori in più: «Punto di riordino non valido.» · «La scorta obiettivo deve essere maggiore del punto di
  riordino.» · «Confezione non valida.».
- **`registra`** con `tipo: "carico"`: accetta `id_ordine` (§ 3.8).

### 3.2 `riordino`

`dati`: `{ "id_struttura": 1 }`. Risposta, articoli in ordine di nome:

```json
{
  "aggiornato_il": "2026-11-10T15:43:00+01:00",
  "righe": [
    {
      "id_articolo": 37, "nome": "Farina 00", "categoria": "Farine e cereali", "unita": "kg",
      "giacenza": 23.5, "in_arrivo": 0, "punto_riordino": 25, "scorta_obiettivo": 50, "quantita_proposta": 30,
      "fornitori": [ { "id_fornitore": 8, "nome": "Ingrosso Sud", "codice_fornitore": "FA00-1", "prezzo": 0.9312, "confezione": 10 } ],
      "id_fornitore_proposto": 8
    }
  ]
}
```

`punto_riordino` e `scorta_obiettivo` sono i valori **effettivi** (già con i predefiniti del § 2).

### 3.3 `ordini`

`dati`: `{ "id_struttura": 1, "stato": null, "id_fornitore": null }` (filtri facoltativi). Risposta, dal più recente:

```json
[
  { "id": 12, "numero": "ORD-2026-0003", "id_struttura": 1,
    "fornitore": { "id": 8, "nome": "Ingrosso Sud", "email": "ordini@fornitore.example" },
    "stato": "inviato", "creato_il": "2026-11-10T15:43:00+01:00", "creato_da": "Mario Rossi",
    "inviato_il": "2026-11-10T15:45:00+01:00", "consegna_richiesta": "2026-11-12",
    "righe_count": 6, "totale_atteso": 159.64 }
]
```

### 3.4 `ordine`

`dati`: `{ "id": 12 }`. Risposta: l'elemento di `ordini` con in più:

```json
{ "inviato_da": "Mario Rossi", "inviato_a": ["ordini@fornitore.example"], "note": "Consegna entro le 10:00.",
  "motivo_chiusura": null,
  "righe": [ { "id_articolo": 37, "nome": "Farina 00", "unita": "kg", "codice_fornitore": "FA00-1",
               "quantita": 30, "prezzo_atteso": 0.9312, "ricevuta": 0 } ] }
```

Inesistente o di un'altra azienda → `404 { "detail": "Ordine non trovato." }`.

### 3.5 `salva_ordine` (gestore)

```json
{ "id": null, "id_operazione": "6f1c…", "id_struttura": 1, "id_fornitore": 8, "consegna_richiesta": "2026-11-12",
  "note": null, "righe": [ { "id_articolo": 37, "quantita": 30, "prezzo_atteso": 0.9312 } ] }
```

- `id: null` crea una **bozza** (numero assegnato dal Portal); un `id` modifica una bozza e **sostituisce** le righe.
- Righe da 1 a 200, ogni articolo una volta, quantità > 0 con al massimo 3 decimali, `prezzo_atteso` facoltativo ≥ 0.
- Errori: «Struttura non valida.» · «Indica il fornitore.» · «Aggiungi almeno un articolo.» · «Al massimo 200 righe per
  ordine.» · «Riga 2: articolo non valido.» · «Riga 2: quantità non valida.» · ««Farina 00» compare due volte.» ·
  «Prezzo non valido.» · «La data di consegna non è valida.» · «Si modificano solo gli ordini in bozza: questo è già
  stato inviato.» · «Ordine non trovato.».
- Esito con `id` dell'ordine.

### 3.6 `invia_ordine` (gestore)

```json
{ "id": 12, "id_operazione": "c3d1…", "a": ["ordini@fornitore.example"], "cc": [],
  "oggetto": "Ordine ORD-2026-0003 — Osteria della Mole",
  "messaggio": "Buongiorno,\n\nin allegato l'ordine ORD-2026-0003 …",
  "pdf": { "nome_file": "ORD-2026-0003.pdf", "dati": "<base64>" } }
```

- Solo ordini `bozza` o `inviato` (reinvio).
- Il Portal manda l'email **con il servizio email che usa già** (destinatari `a` e `cc`, oggetto, testo, allegato
  PDF). Mittente: l'indirizzo di sistema del Portal; **Rispondi a**: l'email della struttura o dell'utente che invia, così
  le risposte del fornitore arrivano al ristorante.
- Se l'email parte: stato `inviato`, `inviato_il` / `inviato_da` / `inviato_a`, una riga in `magfb.ordini_invii` con
  `esito = 'inviata'`. Se non parte: `success: false` «Email non inviata: riprova.», stato invariato, riga con
  `esito = 'errore'` e log (senza corpo né allegato).
- La chiave `id_operazione` evita il doppio invio se l'utente preme "Riprova" dopo un errore di rete.
- Controlli: almeno un destinatario, indirizzi validi, oggetto non vuoto, PDF presente (al massimo 5 MB, deve iniziare
  con `%PDF`). Errori: «Indica l'email del fornitore.» · «Email non valida.» · «Indica l'oggetto dell'email.» · «Manca il
  PDF dell'ordine.» · «L'ordine ORD-… non si può più inviare.».
- `avvisi`: per esempio «Email inviata a ordini@fornitore.example.».

### 3.7 `annulla_ordine` e `chiudi_ordine` (gestore)

`dati`: `{ "id": 12, "motivo": "…" }`, motivo obbligatorio (salvato in `motivo_chiusura`).
- `annulla_ordine`: solo `bozza`, o `inviato` senza merce arrivata → `annullato`. Errore: «Si annullano solo gli ordini
  in bozza o inviati e non ancora arrivati.».
- `chiudi_ordine`: solo `inviato` o `parziale` → `chiuso`; il residuo smette di contare come "in arrivo". Errore: «Si
  chiudono solo gli ordini inviati o arrivati in parte.».

### 3.8 `registra` collegato a un ordine

`registra` con `tipo: "carico"` e `"id_ordine": 12`:
- l'ordine deve essere della stessa struttura e dello stesso fornitore del carico e in stato `inviato` o `parziale`;
  altrimenti `success: false` («Ordine non trovato.» · «L'ordine è di un altro fornitore.» · «L'ordine ORD-… non è
  aperto.» · «Solo un carico può evadere un ordine.»);
- **nella stessa transazione** del movimento: per ogni riga del carico che corrisponde a un articolo dell'ordine,
  `ricevuta += quantita`; gli articoli non ordinati si caricano normalmente ma non toccano l'ordine; poi stato
  `ricevuto` se ogni riga ha `ricevuta ≥ quantita`, altrimenti `parziale`;
- `magfb.movimenti.id_ordine` = l'ordine.

Le pagine mostrano prima della conferma le differenze bolla ↔ ordine (mancanti, in più, non ordinati): è solo un
riepilogo, il Portal non deve fare nulla in più.

## 4. Permessi

Come nel § A4 della scheda principale. Le azioni ✔ del § 3 con un utente non gestore →
`403 { "detail": "Operazione riservata al responsabile del Food & Beverage." }`. `riordino`, `ordini` e `ordine` sono per
tutti gli utenti del magazzino.

## 5. Casi di prova

| # | Situazione | Atteso |
|---|---|---|
| 1 | Articolo con `punto_riordino` 25, `scorta_obiettivo` 50, giacenza 23,5, confezione 10 | in `riordino` con `quantita_proposta` 30 |
| 2 | Stesso articolo con un ordine `inviato` di 30 non arrivato | non compare (23,5 + 30 > 25) |
| 3 | Articolo senza `punto_riordino`, `scorta_minima` 3, giacenza 2,2 | compare con punto 3 e obiettivo 6 |
| 4 | `salva_ordine` nuovo, stessa `id_operazione` due volte | una sola bozza; la seconda risposta `duplicato: true` |
| 5 | `salva_ordine` su un ordine `inviato` | `success: false` «Si modificano solo gli ordini in bozza…» |
| 6 | `invia_ordine` con PDF valido | email inviata con allegato; stato `inviato`; riga in `ordini_invii` |
| 7 | `invia_ordine` con servizio email non disponibile | `success: false`, stato invariato, log senza corpo |
| 8 | `invia_ordine` ripetuto con la stessa `id_operazione` | una sola email; `duplicato: true` |
| 9 | Carico collegato con metà delle quantità | ordine `parziale`, `ricevuta` aggiornate |
| 10 | Secondo carico con il resto | ordine `ricevuto` |
| 11 | Carico collegato a un ordine di un altro fornitore | `success: false`, niente registrato |
| 12 | `chiudi_ordine` su `parziale` | `chiuso`; il residuo non è più "in arrivo" |
| 13 | Non gestore su `salva_ordine` / `invia_ordine` | `403` |
| 14 | Log | nessun corpo, allegato o indirizzo email nei log applicativi oltre allo storico `ordini_invii` |

## 6. Script del database (SQL Server)

File nuovo in `Infrastructure/DbUp/Scripts/0 - Schema/`, con il primo numero libero a sei cifre, **dopo** lo script dello
schema `magfb` della scheda principale.

```sql
begin transaction;

IF COL_LENGTH('magfb.articoli', 'punto_riordino') IS NULL
    ALTER TABLE magfb.articoli ADD punto_riordino DECIMAL(18,3) NULL;
IF COL_LENGTH('magfb.articoli', 'scorta_obiettivo') IS NULL
    ALTER TABLE magfb.articoli ADD scorta_obiettivo DECIMAL(18,3) NULL;
IF COL_LENGTH('magfb.articoli_fornitori', 'confezione') IS NULL
    ALTER TABLE magfb.articoli_fornitori ADD confezione DECIMAL(18,3) NULL;

IF OBJECT_ID('magfb.ordini') IS NULL
CREATE TABLE magfb.ordini (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    id_azienda          INT             NOT NULL,
    id_struttura        INT             NOT NULL,
    numero              VARCHAR(20)     NOT NULL,
    id_fornitore        INT             NOT NULL REFERENCES magfb.fornitori(id),
    stato               VARCHAR(10)     NOT NULL CHECK (stato IN ('bozza','inviato','parziale','ricevuto','chiuso','annullato')),
    creato_il           DATETIMEOFFSET  NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    creato_da           NVARCHAR(100)   NOT NULL,
    inviato_il          DATETIMEOFFSET  NULL,
    inviato_da          NVARCHAR(100)   NULL,
    inviato_a           NVARCHAR(500)   NULL,
    consegna_richiesta  DATE            NULL,
    note                NVARCHAR(1000)  NULL,
    motivo_chiusura     NVARCHAR(300)   NULL,
    CONSTRAINT UQ_magfb_ordini_numero UNIQUE (id_azienda, numero)
);
CREATE INDEX IX_magfb_ordini_stato ON magfb.ordini (id_azienda, id_struttura, stato);

IF OBJECT_ID('magfb.ordini_righe') IS NULL
CREATE TABLE magfb.ordini_righe (
    id_ordine      INT             NOT NULL REFERENCES magfb.ordini(id),
    id_articolo    INT             NOT NULL REFERENCES magfb.articoli(id),
    quantita       DECIMAL(18,3)   NOT NULL CHECK (quantita > 0),
    prezzo_atteso  DECIMAL(18,4)   NULL,
    ricevuta       DECIMAL(18,3)   NOT NULL DEFAULT 0,
    CONSTRAINT PK_magfb_ordini_righe PRIMARY KEY (id_ordine, id_articolo)
);

IF OBJECT_ID('magfb.ordini_invii') IS NULL
CREATE TABLE magfb.ordini_invii (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    id_ordine   INT             NOT NULL REFERENCES magfb.ordini(id),
    inviato_il  DATETIMEOFFSET  NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    inviato_da  NVARCHAR(100)   NOT NULL,
    a           NVARCHAR(500)   NOT NULL,
    cc          NVARCHAR(500)   NULL,
    oggetto     NVARCHAR(200)   NOT NULL,
    esito       VARCHAR(10)     NOT NULL CHECK (esito IN ('inviata','errore'))
);

IF COL_LENGTH('magfb.movimenti', 'id_ordine') IS NULL
    ALTER TABLE magfb.movimenti ADD id_ordine INT NULL REFERENCES magfb.ordini(id);

commit transaction;
```

## 7. Cosa c'è già lato Platform

- Pagina **Riordino** (`fb-mag-riordino`): proposta per fornitore, quantità e fornitore modificabili, articoli già in una
  bozza segnalati, creazione delle bozze.
- Pagina **Ordini ai fornitori** (`fb-mag-ordini`): elenco con filtri, bozza modificabile, PDF (scarica e anteprima),
  invio per email, annulla / chiudi, "Registra l'arrivo".
- **Ricevi merce**: "Collega a un ordine" nei tre modi (manuale e codice a barre con le righe precompilate dal residuo;
  bolla con le differenze bolla ↔ ordine).
- **Articoli**: punto di riordino, scorta obiettivo, confezione per fornitore.
