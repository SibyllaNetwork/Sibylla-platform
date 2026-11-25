# Portal · Decision tree: interprete delle domande con Claude

> **Come usare questo documento.** È la scheda per gli sviluppatori (o l'agente AI) del **Portal**
> (`SibyllaApi` + `SibyllaApiProxy`, .NET). È **autosufficiente**: dice cosa deve fare l'endpoint, con quale prompt, quale
> schema, quali limiti e quali test. Per un riferimento eseguibile c'è l'implementazione di prova in
> `sibylla-platform/api/decision-tree.mjs` (funzione serverless Node, stesso prompt e stesso schema).
> Ultimo aggiornamento: **25 novembre 2026**.
>
> **Il frontend è già pronto**: quando la build di Platform ha `REACT_APP_API_URL` (cioè parla col Portal), la pagina
> chiama `POST /Sibylla/finance/decisionTree/Interpreta`. Se l'endpoint non c'è o risponde con un errore, la pagina usa
> il suo interprete locale e continua a funzionare (§ 7).

---

## 0. La funzione in breve

La pagina **Finance › Controllo di gestione › Decision tree** è una pagina bianca con una barra di ricerca: l'utente
scrive una domanda sui dati ("qual è la camera che sta generando più margine?", "come stanno andando le vendite
corporate del Siracusa?") e la pagina costruisce una piccola BI: risposta, KPI, albero, grafico.

Al Portal si chiede **una sola cosa**: trasformare la domanda in un **piano di analisi** (JSON) chiamando Claude.

- **Claude non risponde alla domanda e non vede numeri.** Riceve la domanda e i nomi di strutture, tipologie di camera e
  segmenti; restituisce il piano (metrica, livelli dell'albero, filtri, anno, confronto).
- **I numeri li calcola Sibylla** dal piano (oggi la pagina, sul dataset di Margin waterfall; § 9 per i dati dal
  database).
- **La chiave Anthropic sta solo sul server del Portal**, come per la lettura delle bolle.

```
Pagina Decision tree ──POST /Sibylla/finance/decisionTree/Interpreta──► Proxy ──► SibyllaApi
                                                                                   │
                                     { domanda, strutture } ──► API Anthropic (Claude Haiku 5.5, output strutturato)
                                                                                   │
Pagina ◄────────────────────────────── { piano, modello } ◄────────────────────────┘
   └─► controlli sul piano (`sanifica`) ─► calcolo della BI sui dati di Sibylla
```

## Stato (25 novembre 2026)

| Cosa | Stato |
|---|---|
| Pagina Decision tree (search bar → BI) | ✅ in produzione sulla demo, con l'interprete locale |
| Prompt, schema e modello | ✅ provati su 20 domande (§ 6), scelto **Claude Haiku 5.5** |
| Funzione di prova `api/decision-tree.mjs` su Vercel | ✅ pubblicata, **senza chiave** per scelta (risponde `503`) |
| Frontend verso il Portal (`/Sibylla/finance/decisionTree/Interpreta`) | ✅ pronto, attivo quando c'è `REACT_APP_API_URL` |
| **Endpoint nel Portal** | 🆕 da realizzare (questa scheda) |
| Dati della BI dal database (al posto del dataset dimostrativo) | ⏳ fase 2 (§ 9) |

---

## 1. Contratto dell'endpoint

`POST /Sibylla/finance/decisionTree/Interpreta` sul Proxy → `POST finance/decisionTree/Interpreta` su SibyllaApi.
Autenticato come le altre rotte di dominio (`[Authorize]`, token dell'utente di Platform).

### Richiesta

```json
{
  "domanda": "Come stanno andando le vendite corporate del Siracusa?",
  "strutture": ["Hotel Noto", "Hotel Siracusa", "Hotel Catania", "Resort Taormina"]
}
```

| Campo | Regola |
|---|---|
| `domanda` | stringa, obbligatoria, da 1 a **300** caratteri dopo il `trim` |
| `strutture` | nomi delle strutture che l'utente vede nella pagina (da 1 a **30**, ognuno al massimo **80** caratteri). Il Portal **può** verificarle contro le strutture dell'azienda del token e scartare quelle estranee; se non ne resta nessuna → `400` |

### Risposta `200`

```json
{
  "piano": {
    "comprensibile": true,
    "metrica": "ricavi",
    "ordine": "desc",
    "dimensioni": ["camera"],
    "strutture": ["Hotel Siracusa"],
    "camere": [],
    "segmenti": ["corp"],
    "anno": 0,
    "confronto": true,
    "nota": "Andamento dei ricavi Corporate dell'Hotel Siracusa, per tipologia di camera."
  },
  "modello": "claude-haiku-5-5"
}
```

`piano` è **esattamente** il JSON restituito da Claude (validato dallo schema del § 3.2): il Portal non lo corregge. Le
correzioni le fa la pagina (§ 4).

### Errori

Corpo `{ "detail": "<messaggio in italiano>" }`, come le altre rotte del Portal. La pagina non mostra questi messaggi:
in caso di errore passa all'interprete locale. Servono per i log e per i test.

| Status | Quando | `detail` |
|---|---|---|
| `400` | domanda mancante/troppo lunga, elenco strutture non valido | «Domanda mancante o troppo lunga.» · «Elenco strutture mancante.» |
| `401` | token assente o scaduto | (standard) |
| `429` | oltre il limite di frequenza (§ 5) o `429` da Anthropic | «Troppe domande in poco tempo: riprova fra un minuto.» |
| `422` | `stop_reason` diverso da `end_turn` (rifiuto, `max_tokens`) | «Interpretazione non completata.» |
| `502` | timeout, errore di rete o 5xx di Anthropic, JSON non leggibile | «Servizio AI non disponibile.» |
| `503` | `Anthropic:ApiKey` non configurata o rifiutata (`401` da Anthropic) | «Interprete AI non configurato.» |

---

## 2. Il piano

| Campo | Tipo | Significato |
|---|---|---|
| `comprensibile` | bool | `false` se la domanda chiede dati non disponibili (mesi, personale, fornitori, meteo…) o non è una domanda sui dati |
| `metrica` | `ricavi` · `margine` · `utile` · `notti` · `adr` · `costi` | cosa misurare. `margine` = margine di contribuzione; `adr` = prezzo medio per notte; `costi` = variabili + fissi |
| `ordine` | `desc` · `asc` | `asc` se la domanda cerca il peggiore o il "meno" |
| `dimensioni` | array di `struttura` · `camera` · `segmento` (max 2) | livelli dell'albero, dal più generale al più specifico; l'ultimo è quello su cui verte la domanda |
| `strutture` | array di nomi (dall'elenco della richiesta) | filtro; vuoto = tutte |
| `camere` | array di `sgl` · `dbl` · `dsup` · `fam` · `jsu` · `su` | filtro; vuoto = tutte |
| `segmenti` | array di `b2b` · `b2c` · `dir` · `grp` · `corp` | filtro; vuoto = tutti |
| `anno` | intero | anno da analizzare (2024–2026); `0` = non indicato (la pagina usa l'anno in corso) |
| `confronto` | bool | la domanda chiede andamento, crescita o confronto con un altro anno |
| `nota` | stringa | una frase in italiano: come è stata capita la domanda, oppure (se `comprensibile` è `false`) cosa non è disponibile |

Catalogo fisso (lo stesso di `src/modules/finance/MarginWaterfall/mwfData.ts`):

| id camera | nome | id segmento | nome |
|---|---|---|---|
| `sgl` | Singola | `b2b` | B2B (tour operator, agenzie) |
| `dbl` | Doppia | `b2c` | B2C (OTA, online, Booking) |
| `dsup` | Doppia superior | `dir` | Dirette (sito, telefono, walk-in) |
| `fam` | Family | `grp` | Gruppi |
| `jsu` | Junior suite | `corp` | Corporate (aziende) |
| `su` | Suite | | |

> Se un domani il catalogo arriva dal database (tipologie e canali veri della struttura), si passano gli stessi elenchi
> nel prompt e negli `enum` dello schema: il resto non cambia.

---

## 3. La chiamata ad Anthropic

API Messages, dal server di SibyllaApi, con lo **stesso client** già usato per la lettura delle bolle
(`Services/LettoreBolle.cs`, § C1 della scheda `portal-magazzino-ristorazione.md`; il riferimento di Op è
`sibylla-op/backend/src/Op.Api/Services/LettoreBolle.cs`, con l'SDK C# ufficiale `Anthropic`).

| Parametro | Valore |
|---|---|
| `model` | da configurazione `Anthropic:ModelloDecisionTree`, oggi **`claude-haiku-5-5`** |
| `max_tokens` | `2000` (la risposta tipica è di ~150 token) |
| `output_config.effort` | `"low"` |
| `output_config.format` | `{ "type": "json_schema", "schema": <§ 3.2> }` (output strutturato: la risposta è JSON valido per lo schema) |
| `system` | il prompt del § 3.1, con l'elenco delle strutture della richiesta |
| `messages` | `[{ "role": "user", "content": "<domanda>" }]` |
| `thinking` | **non** impostarlo (Haiku 5.5 usa il ragionamento adattivo di default) |
| `temperature`, `top_p`, `top_k` | **non** inviarli |
| timeout / tentativi | **20 s**, al massimo **1** nuovo tentativo (solo su `429`, `5xx`, rete) |

Lettura della risposta:
1. se `stop_reason` ≠ `end_turn` → `422` (Haiku 5.5 non ha il ripiego automatico su un altro modello in caso di rifiuto);
2. si concatenano i blocchi `text` e si fa il parse del JSON → `piano`;
3. parse fallito → `502`.

Corpo della richiesta di esempio (forma dell'API, per chi preferisce l'HTTP diretto o per confrontare i log):

```json
{
  "model": "claude-haiku-5-5",
  "max_tokens": 2000,
  "system": "Sei l'interprete delle domande della pagina Decision tree di Sibylla, …",
  "output_config": {
    "effort": "low",
    "format": { "type": "json_schema", "schema": { "type": "object", "…": "§ 3.2" } }
  },
  "messages": [{ "role": "user", "content": "Qual è la camera che sta generando più margine?" }]
}
```

### 3.1 Prompt di sistema

Testo esatto (lo stesso di `api/decision-tree.mjs`). `{STRUTTURE}` = nomi della richiesta separati da `, `. Le righe di
camere e segmenti sono fisse.

```text
Sei l'interprete delle domande della pagina Decision tree di Sibylla, gestionale alberghiero.
Traduci la domanda dell'utente in un piano di analisi. NON rispondi alla domanda e NON inventi numeri: i dati li calcola Sibylla dal piano.

Dati disponibili (solo questi, su base annua, per gli anni 2024-2026):
- metriche: ricavi (vendite, fatturato, incassi), margine (margine di contribuzione), utile, notti (pernottamenti venduti), adr (prezzo medio per notte), costi (costi variabili + fissi)
- dimensioni: struttura, camera (tipologia), segmento (canale di vendita)
- strutture: {STRUTTURE}
- tipologie di camera (id: nome): sgl: Singola; dbl: Doppia; dsup: Doppia superior; fam: Family; jsu: Junior suite; su: Suite
- segmenti (id: nome): b2b: B2B (tour operator, agenzie); b2c: B2C (OTA, online, Booking); dir: Dirette (sito, telefono, walk-in); grp: Gruppi; corp: Corporate (aziende)

Regole:
- dimensioni: i livelli dell'albero, dal più generale al più specifico (massimo 2). Metti per ultima la dimensione su cui verte la domanda ("quale camera" → camera). Non usare come livello una dimensione già fissata da un solo filtro.
- filtri (strutture, camere, segmenti): solo i valori nominati nella domanda; vuoti = tutti. Abbina i nomi anche se scritti parzialmente ("il Siracusa" → Hotel Siracusa, "tour operator" → b2b).
- ordine: "asc" se la domanda cerca il peggiore/meno, altrimenti "desc".
- confronto: true se chiede andamento ("come sta andando"), crescita, miglioramento o un confronto con un altro anno.
- anno: l'anno da analizzare se la domanda lo cita come periodo dell'analisi; un anno citato solo come termine di paragone ("rispetto al 2025") NON è l'anno da analizzare: in quel caso anno = 0 e confronto = true. Senza anno: 0.
- comprensibile: false se la domanda chiede dati non disponibili (mesi o giorni, personale, acquisti, fornitori, meteo, altro) o non è una domanda sui dati; in quel caso spiega in nota, in italiano e in una frase, cosa non è disponibile.
- nota: altrimenti una frase breve in italiano che dice come hai interpretato la domanda.
```

> Il prompt è sotto la soglia minima del prompt caching (~1.600 token): non serve `cache_control`.

### 3.2 Schema dell'output

`{STRUTTURE}` = array JSON dei nomi della richiesta. Tutti i campi obbligatori, `additionalProperties: false`, nessun
campo facoltativo o con più tipi (l'API limita quei casi: vedi la nota sullo schema delle bolle).

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["comprensibile", "metrica", "ordine", "dimensioni", "strutture", "camere", "segmenti", "anno", "confronto", "nota"],
  "properties": {
    "comprensibile": { "type": "boolean" },
    "metrica": { "type": "string", "enum": ["ricavi", "margine", "utile", "notti", "adr", "costi"] },
    "ordine": { "type": "string", "enum": ["desc", "asc"] },
    "dimensioni": { "type": "array", "items": { "type": "string", "enum": ["struttura", "camera", "segmento"] } },
    "strutture": { "type": "array", "items": { "type": "string", "enum": {STRUTTURE} } },
    "camere": { "type": "array", "items": { "type": "string", "enum": ["sgl", "dbl", "dsup", "fam", "jsu", "su"] } },
    "segmenti": { "type": "array", "items": { "type": "string", "enum": ["b2b", "b2c", "dir", "grp", "corp"] } },
    "anno": { "type": "integer" },
    "confronto": { "type": "boolean" },
    "nota": { "type": "string" }
  }
}
```

Gli `enum` delle strutture sono il motivo per cui Claude non può inventare nomi: restituisce solo strutture dell'elenco.

---

## 4. Controlli sul piano (li fa la pagina, non il Portal)

Haiku sbaglia ogni tanto in modo meccanico (test § 6). La pagina corregge il piano prima di calcolare la BI
(`sanifica` in `src/modules/finance/DecisionTree/dtMotore.ts`). Il Portal **non** deve replicarli; sono qui perché chi
legge i log sappia che un piano "imperfetto" è atteso:

- valori fuori catalogo o strutture fuori elenco → scartati;
- una dimensione fissata da un solo filtro (es. "le suite" con `dimensioni: ["camera"]`) → tolta dai livelli;
- `dimensioni` vuoto → livello predefinito (`camera` per notti e ADR, altrimenti `segmento`);
- un solo livello → si aggiunge `struttura` davanti se le strutture sono più di una, altrimenti l'altra dimensione libera;
- `anno` 0 o fuori 2024–2026 → anno in corso;
- il confronto con l'anno precedente è **sempre** calcolato (KPI e grafico), `confronto` cambia solo il titolo.

---

## 5. Sicurezza, dati e costi

**Cosa esce verso Anthropic**: la domanda così come l'ha scritta l'utente e i nomi delle strutture. Nessun importo,
nessun dato di clienti o di ospiti. Nei testi per l'utente l'AI si chiama «AI di Sibylla».

**Log**: niente testo della domanda nei log applicativi (può contenere informazioni commerciali). Si registrano: utente,
azienda, esito (status), `usage.input_tokens`, `usage.output_tokens`, durata, modello.

**Limiti**:
- `[Authorize]` come le altre rotte di dominio;
- **20 domande al minuto per utente** (oltre → `429`);
- dimensioni della richiesta come al § 1 (corpo al massimo qualche KB: nessun limite speciale sul Proxy).

**Costi misurati** (test del 25/11/2026, 20 domande per modello, ~1.640 token in entrata e ~140 in uscita a domanda):

| Modello | Costo per domanda | 1.000 domande | Domande capite bene (prima dei controlli § 4) | Tempo (mediana) |
|---|---|---|---|---|
| **Claude Haiku 5.5** (scelto) | **~0,00024 $** | **~0,24 $** | 16 / 20 (≈ 19 / 20 con i controlli) | 1,4 s |
| Claude Opus 5.5 (alternativa) | ~0,0092 $ | ~9,20 $ | 20 / 20 | 1,7 s |

Per passare a Opus basta cambiare `Anthropic:ModelloDecisionTree` in `claude-opus-5-5`: prompt e schema sono gli stessi.

**Chiave**: si può usare la stessa `Anthropic:ApiKey` delle bolle. Consigliato: una chiave in un **workspace Anthropic
con un limite di spesa mensile**, così un uso anomalo non supera il tetto.

---

## 6. Test di accettazione

Le 20 domande del test del 25/11/2026 (strutture: Hotel Noto, Hotel Siracusa, Hotel Catania, Resort Taormina,
Hotel Archimede). Il piano atteso è quello che la pagina deve ricevere **dopo** i controlli del § 4; tra parentesi le
varianti accettabili che i controlli già correggono.

| # | Domanda | Piano atteso (campi principali) |
|---|---|---|
| 1 | Qual è la camera che sta generando più margine? | margine, desc, dim `camera` |
| 2 | Come stanno andando le vendite corporate del Siracusa? | ricavi, Siracusa, seg `corp`, confronto **true** (dim `camera`; `[]` o `segmento` accettati) |
| 3 | Ho ottimizzato le vendite quest'anno rispetto all'anno scorso? | ricavi, confronto true (dim qualsiasi) |
| 4 | Quale struttura fa più utile? | utile, desc, dim `struttura` |
| 5 | Quale segmento ha il prezzo medio più alto al Noto? | adr, desc, Noto, dim `segmento` |
| 6 | Dove perdo margine con i tour operator? | margine, **asc**, seg `b2b` |
| 7 | Quante notti abbiamo venduto in suite nel 2025? | notti, camera `su`, anno **2025** |
| 8 | Quale tipologia di camera rende meno all'Archimede? | ricavi o margine, **asc**, Archimede, dim `camera` |
| 9 | Confronta i ricavi B2B e B2C del Resort Taormina | ricavi, Taormina, seg `b2b`+`b2c`, dim `segmento` |
| 10 | Le doppie superior di Catania stanno crescendo? | ricavi, Catania, camera `dsup`, confronto true |
| 11 | Quale canale mi costa di più? | costi, desc, dim `segmento` |
| 12 | Come vanno i gruppi rispetto al 2025? | ricavi, seg `grp`, **anno 0**, confronto true |
| 13 | Quanto ho incassato a marzo? | **comprensibile false** (dati solo annuali) |
| 14 | Quanti dipendenti ho in cucina? | **comprensibile false** (personale) |
| 15 | Qual è il fornitore più caro? | **comprensibile false** (fornitori) |
| 16 | Che tempo fa domani a Noto? | **comprensibile false** (meteo) |
| 17 | dammi i numeri | **comprensibile false** (troppo generica) |
| 18 | Qual è l'hotel con l'ADR più alto per le family? | adr, desc, camera `fam`, dim `struttura` |
| 19 | vendite dirette vs OTA a Siracusa e Catania | ricavi, Siracusa+Catania, seg `dir`+`b2c` |
| 20 | tra singole e doppie quale fattura di più al Noto? | ricavi, desc, Noto, camere `sgl`+`dbl`, dim `camera` |

Test tecnici:
- domanda vuota o di 301 caratteri → `400`; nessuna chiamata ad Anthropic;
- senza `Anthropic:ApiKey` → `503`;
- 21ª domanda nello stesso minuto dallo stesso utente → `429`;
- risposta di Anthropic con `stop_reason: "max_tokens"` (simulata) → `422`;
- timeout simulato → `502`, nel log solo esito e durata.

---

## 7. Cosa fa già il frontend

`interpreta()` in `src/modules/finance/DecisionTree/dtMotore.ts`:

1. se la build ha `REACT_APP_API_URL` → `apiFetchSibylla('finance/decisionTree/Interpreta', { method: 'POST', body: { domanda, strutture } })`;
   altrimenti (demo su Vercel) → `POST /api/decision-tree` (funzione di prova, oggi senza chiave);
2. risposta con `piano` → `sanifica` (§ 4) → calcolo della BI; sotto la risposta compare «Interpretata dall'AI di Sibylla»;
3. qualunque errore, timeout (15 s) o endpoint assente → interprete locale a parole chiave; compare «Interpretata da Sibylla».

Per far funzionare il Portal **non serve toccare il frontend**.

---

## 8. File da creare nel Portal (nomi indicativi)

| Progetto | File | Contenuto |
|---|---|---|
| SibyllaApi | `Controllers/FinanceController.cs` (o `DecisionTreeController.cs`) | `POST finance/decisionTree/Interpreta`, `[Authorize]`, validazione (§ 1), limite per utente (§ 5) |
| SibyllaApi | `Services/InterpreteDecisionTree.cs` | Costruzione di prompt e schema con l'elenco delle strutture (§ 3.1–3.2), chiamata ad Anthropic con lo stesso client di `LettoreBolle`, lettura della risposta, mappatura degli errori (§ 1) |
| Models | `Models/DecisionTree/*.cs` | `InterpretaRichiesta { Domanda, Strutture }`, `PianoDecisionTree` (campi del § 2, JSON in minuscolo come il contratto), `InterpretaRisposta { Piano, Modello }` |
| SibyllaApiProxy | — | nessuna modifica se l'inoltro generico `/Sibylla/{**path}` è attivo |
| Test | `Sibylla.Test/DecisionTree/*` | Test tecnici del § 6 con il client Anthropic finto; le 20 domande come test di integrazione facoltativo (costo ~0,005 $ a giro) |

Configurazione (Key Vault o impostazioni dell'App Service, separatore `__`):

| Impostazione | Development | Staging | Production |
|---|---|---|---|
| `Anthropic__ApiKey` | chiave di sviluppo | chiave di staging | **segreta** (la stessa delle bolle o una dedicata con limite di spesa) |
| `Anthropic__ModelloDecisionTree` | `claude-haiku-5-5` | `claude-haiku-5-5` | `claude-haiku-5-5` |
| `DecisionTree__LimiteAlMinuto` | `20` | `20` | `20` |

---

## 9. Fase 2 (non in questa scheda): i dati dal database

Oggi la pagina calcola la BI su un dataset dimostrativo per struttura × tipologia di camera × segmento, su base annua
(lo stesso di Margin waterfall: notti, ricavi, costi di camera, commissioni, costi fissi ripartiti). Per i dati veri
servirà un endpoint che restituisca quelle celle per l'anno richiesto e il precedente, filtrate per le strutture
dell'azienda. Le domande oggi segnalate come non disponibili (mesi, personale, acquisti) richiedono di aggiungere quei
dati al catalogo: prompt e schema si estendono con nuove metriche e dimensioni.
