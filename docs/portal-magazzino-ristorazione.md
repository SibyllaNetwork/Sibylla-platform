# Portal · Magazzino della Ristorazione nel database di Sibylla Platform

> **Come usare questo documento.** È la scheda per gli sviluppatori (o l'agente AI) del **Portal**
> (`SibyllaApi` + `SibyllaApiProxy`, .NET, SQL Server con Dapper e DbUp). È **autosufficiente**: non serve il codice di Op
> né quello del frontend. Il **contratto delle azioni** (nomi, campi, risposte, messaggi d'errore) resta quello del § 8
> della scheda 17 di sibylla-op (`docs/integrazione-sibylla/17-magazzino-ristorazione.md`): questa scheda dice **dove
> stanno i dati e chi fa cosa**, e rimanda al § 8 per i JSON.
> Ultimo aggiornamento: **10 novembre 2026**. **Sostituisce** la versione precedente di questa scheda, che chiedeva al
> Portal un semplice inoltro firmato a Op.Api.
>
> **Per chi fa il backend.** Il Portal si configura e si pubblica su un progetto separato (Azure App Service), non su
> Vercel. Tutto quello che serve per farlo è qui:
> - le azioni (Parti A, B, C);
> - **configurazione e rilascio, passo per passo** (§ H);
> - **lo script del database** (Appendice 1);
> - **il contratto completo** con tutti i JSON (Appendice 2).
>
> Il frontend non va toccato per far funzionare il backend: cosa resta da fare lato Platform è nel § H8.

---

## 0. La decisione

**Per ogni azienda presente in Sibylla Platform, i dati del Magazzino della Ristorazione stanno nel database di Sibylla
Platform.** Vale per la Ristorazione **stand alone** e per le aziende con **più moduli** (Struttura ricettiva +
Ristorazione…), e vale **sia per le pagine di Platform sia per l'app Op**.

| Chi | Dove stanno i dati del magazzino | Chi li scrive |
|---|---|---|
| Azienda di Sibylla Platform (stand alone o con più moduli) | **database di Sibylla** | Portal: pagine di Platform (Parte A) e app Op tramite Op.Api (Parte B) |
| Cliente **indipendente** di Op (usa solo l'app Op, senza Platform) | database di Op.Api | Op.Api, come oggi: nessun lavoro nel Portal |

In una riga: **l'app Op stand alone è indipendente** (dati, lettura delle bolle e scarichi in Op); **l'app Op usata con
Sibylla Platform usa Platform** (tutto passa dal Portal e sta nel database di Sibylla).

Conseguenze:
- **Op.Api non conserva il magazzino** delle aziende di Platform. Per loro inoltra al Portal le richieste dell'app Op
  (Parte B). Gli **scarichi automatici dalle comande** dell'app Op sono **rimandati** (§ B3).
- Anche la **lettura delle bolle con l'AI** e **"Fotografa col telefono"** seguono la stessa regola: per le aziende di
  Platform le fa il **Portal**, con la sua chiave Anthropic. La pagina per il telefono la serve Sibylla Platform (Parte C).
  Op legge le bolle solo per i suoi clienti indipendenti.
- Le **pagine di Platform non cambiano**: chiamano già `POST /Sibylla/OpApp/magazzinoFb/Esegui` con il contratto del § 8.
  Il nome della rotta resta quello anche se ora i dati sono di Sibylla.

```
Pagine di Platform ──POST OpApp/magazzinoFb/Esegui──►┐
                                                     │   PORTAL  ──► database di Sibylla (schema magfb)
App Op ──► Op.Api ──POST integrazione/op/magazzino──►┘
(scarichi dalle comande di Op: rimandati, § B3)
                                                     │
                       Portal ──► API Anthropic: lettura della bolla (chiave solo sul server del Portal)
Telefono ──► pagina pubblica di Platform /bolla-telefono/{codice} ──► Portal (foto del passaggio)
```

## Stato (10 novembre 2026)

| Cosa | Stato |
|---|---|
| Pagine Ristorazione › Magazzino di Platform | ✅ in produzione, sul contratto del § 8 (oggi leggono la rotta demo di Op) |
| **Parte A**: azioni delle pagine sul database di Sibylla | 🆕 da realizzare |
| **Parte B**: ingresso firmato per Op.Api (app Op) | 🆕 da realizzare; **lato Op** l'archivio del magazzino a due implementazioni è in corso |
| Scarichi automatici dalle comande per le aziende di Platform | ⏸ rimandati: partono quando sala, comande e menu di quelle aziende staranno in Sibylla (§ B3) |
| **Parte C**: lettura delle bolle con l'AI e "telefono" nel Portal | 🆕 da realizzare (la pagina del telefono la fa sibylla-platform) |
| Magazzino in Op.Api per le aziende di Platform (rotta demo, attivazione) | restano attivi finché A e B non sono pronte, poi si dismettono |

---

# PARTE A — Le azioni delle pagine sul database di Sibylla

## A1. Il compito

Realizzare in **SibyllaApi** l'azione `POST opapp/magazzinoFb/Esegui`, raggiungibile dal frontend come
`POST /Sibylla/OpApp/magazzinoFb/Esegui`. Riceve `{ "azione", "dati" }` ed **esegue l'azione sul database di Sibylla**
secondo il § 8 della scheda 17. Il corpo e la risposta di ogni azione sono **identici** a quelli del § 8.

Il Proxy deve far passare il JSON **senza deserializzarlo**: l'`Inoltra<T>` esistente in
`SibyllaApiProxy/Controllers/OpAppController.cs` non va bene, perché trasforma gli errori in "Richiesta non riuscita.".
L'inoltro generico `/Sibylla/{**path}` è quello giusto: passa corpo e stato senza toccarli. Il codice di riferimento, con
le correzioni del § H4.1 già fatte, è in [portal-proxy/SibyllaController.cs](portal-proxy/SibyllaController.cs), da
portare nella vostra copia del Portal ([istruzioni](portal-proxy/README.md)).

## A2. Cosa c'è già nel Portal e cosa si riusa

| Cosa | Dove | Uso |
|---|---|---|
| Utente e azienda dal token | `SibyllaApi/Controllers/OpAppController.cs` (`[Authorize]`, `Io()` con `GetCurrentUserId` / `GetCurrentIdAzienda`) | Mettere qui l'azione. |
| Ruoli | `BaseController.GetCurrentUserRoles` (claim `Ruolo`), tabella `sib.UserRole` | Calcolare `gestore` (§ A4). |
| Accesso ai dati | Dapper + `SqlConnection`, repository in `SibyllaApi/Repository/` | Nuovo `MagazzinoFbRepository`. |
| Migrazioni | `Infrastructure/DbUp/Scripts/0 - Schema/` | Script dello schema `magfb` (§ A5). |
| Strutture e outlet | `config.strutture` (outlet con `id_parent` = struttura), `config.vw_strutture_no_outlet` | `id_struttura` del contratto = **id di `config.strutture`** dell'azienda. |
| Voci del menu F&B | `fb.menu_items` (`id_azienda`), nomi in `fb.menu_items_i18n`, categorie con `fb.menu_items_gruppi` / `fb.gruppi_menu`, outlet in `fb.menu_items_outlets`, prezzi in `fb.menu_items_prices` / `PrezzoDefault` (vedi `VociMenuRepository`) | Fonte di `ricette` (`id_voce` = `fb.menu_items.id`). |
| Magazzino esistente `agora.magazzino_*` / `agora.prodotti` | Agorà / Purchasing | **Non riusare**: quantità intere, un articolo per movimento, niente punti, tipi o ricette. Resta com'è. |
| ⚠️ `ConnectionString:SibyllaOP` (`op.sibylla.cloud`) | `SibyllaOPApi.cs` | **Non è Op.Api** (`api.sibyllaop.it`). Per la Parte B serve una configurazione separata (§ D). |

## A3. Azioni (elenco chiuso)

Le stesse del § 8.1 della scheda 17, ognuna come descritta nel § 8 (corpo, risposta, errori):

```
contesto, giacenze, articoli, articolo, cerca_codice, salva_articolo, elimina_articolo,
salva_categoria, elimina_categoria, salva_punto, elimina_punto, salva_fornitore, fornitore (nuova, § A7),
registra, movimenti, movimento, annulla_movimento,
leggi_bolla, bolla_telefono_apri, bolla_telefono_stato           (Parte C)
ricette, ricetta, salva_ricetta, elimina_ricetta,
inventari, inventario, inventario_apri, inventario_conta, inventario_chiudi, inventario_annulla
```

Ogni altro valore → `400 { "detail": "Azione non valida." }`.

## A4. Permessi e campi dal token

- **Permesso** per aprire Ristorazione › Magazzino dell'azienda (*quale, da chiedere*). Senza → `403`.
- **Modulo Ristorazione non attivo** per l'azienda → `404 { "collegata": false }`: la pagina mostra "Il magazzino della
  ristorazione non è attivo per la tua azienda…".
- `id_azienda` e utente **sempre dal token**, mai dal corpo.
- **Gestore** = amministratore dell'azienda o responsabile del Food & Beverage (*quale ruolo, da chiedere*). Le azioni
  riservate (rettifica, `annulla_movimento`, `elimina_*`, `salva_categoria`, `salva_punto`, modifica di articoli e
  fornitori, `salva_ricetta` / `elimina_ricetta`, `inventario_apri` / `_chiudi` / `_annulla`) con un non gestore →
  `403 { "detail": "Operazione riservata al responsabile del Food & Beverage." }`.
- **Autore** di ogni movimento: nome e cognome dell'utente (al massimo 100 caratteri).
- `contesto.permessi.gestore` restituisce il valore calcolato qui: la pagina lo usa per nascondere i comandi.

## A5. Modello dei dati (schema `magfb`, nomi indicativi)

Tutte le tabelle hanno `id_azienda` (azienda di Platform) e ogni lettura e scrittura filtra per l'azienda del token.

| Tabella | Contenuto | Note |
|---|---|---|
| `magfb.punti` | `id`, `id_azienda`, `id_struttura` (→ `config.strutture`), `nome`, `tipo` (`magazzino`/`cucina`/`bar`), `attivo` | Alla **prima** chiamata `contesto`, per ogni struttura dell'azienda che non ne ha, creare **Magazzino**, **Cucina** e **Bar**. Nome unico per struttura. |
| `magfb.categorie` | `id`, `id_azienda`, `nome` | Nome unico per azienda. |
| `magfb.fornitori` | `id`, `id_azienda`, `nome`, `partita_iva`, `codice_fiscale`, `indirizzo`, `cap`, `comune`, `provincia`, `telefono`, `email`, `pec` | Niente doppioni per partita IVA o per nome (anche con un'altra forma societaria): `salva_fornitore` restituisce quello esistente. |
| `magfb.articoli` | `id`, `id_azienda`, `codice` (`ART-000037`, assegnato alla creazione), `nome`, `id_categoria`, `unita` (`kg`/`l`/`pz`), `scorta_minima` `decimal(18,3)`, `id_punto_predefinito`, `costo_medio` `decimal(18,4)`, `attivo`, `note` | Nome unico per azienda; unità non modificabile con movimenti. |
| `magfb.articoli_codici` | `id_articolo`, `ean` (unico per azienda), `quantita` `decimal(18,3)`, `descrizione` | Quante unità vale il codice (cartone da 10). |
| `magfb.articoli_fornitori` | `id_articolo`, `id_fornitore`, `codice_fornitore`, `prezzo` `decimal(18,4)` | `prezzo` = ultimo prezzo pagato, aggiornato dai carichi. |
| `magfb.movimenti` | `id`, `id_azienda`, `id_struttura`, `tipo`, `origine` (`manuale`/`codice_a_barre`/`bolla`/`comanda`/`inventario`), `data`, `registrato_il`, `autore`, `id_punto`, `id_punto_destinazione`, `id_fornitore`, `documento`, `motivo`, `note`, `id_annulla`, `id_annullato_da`, comanda (`id_comanda`, `tavolo`, `voce`, `porzioni`) | **Solo inserimento**: nessun UPDATE o DELETE dei dati, salvo il collegamento `id_annullato_da`. |
| `magfb.movimenti_righe` | `id_movimento`, `id_articolo`, `id_punto`, `quantita` `decimal(18,3)` **con segno**, `prezzo_unitario`, `lotto`, `scadenza`, `giacenza_dopo` | Il trasferimento ha due righe per articolo (uscita e ingresso). |
| `magfb.giacenze` | `id_articolo`, `id_punto`, `quantita` `decimal(18,3)` | Aggiornata **nella stessa transazione** del movimento; ricostruibile dalla somma delle righe. |
| `magfb.operazioni` | `id_azienda`, `id_operazione` (UUID, **unico**), `azione`, `id_risultato`, `registrata_il` | Chiave anti-doppioni del § 8.0. |
| `magfb.ricette` / `magfb.ricette_righe` | `id_voce` (→ `fb.menu_items.id`), `reparto` (`cucina`/`bar`), `aggiornata_il`, `aggiornata_da` / `id_articolo`, `quantita` per porzione | Da 1 a 50 ingredienti, ognuno una volta. |
| `magfb.inventari` / `magfb.inventari_righe` | `id`, `id_punto`, `stato` (`aperto`/`chiuso`/`annullato`), aperto e chiuso il/da, `id_movimento` / `id_articolo`, `contata`, `contata_da`, `contata_il` | Un solo inventario aperto per punto. |

Indici almeno su `(id_azienda, data)` dei movimenti, `(id_azienda, ean)` dei codici e `(id_articolo, id_punto)` delle
giacenze.

## A6. Regole di dominio (riassunto del § 8; in caso di dubbio vale il § 8)

- **Chiave `id_operazione`.** Le azioni che creano la ricevono. Se esiste già per l'azienda, rispondere
  `success: true, duplicato: true` con l'`id` di allora, **senza** creare nulla. Va scritta nella **stessa transazione**
  di ciò che crea.
- **`registra`** (§ 8.6):
  - **Tutto o niente**, da 1 a 200 righe, ogni articolo una volta, quantità > 0 con al massimo 3 decimali (con segno per
    `rettifica`).
  - `data` non nel futuro (tolleranza 5 minuti) e non più di 7 giorni indietro.
  - **Mai sotto zero** per scarico, trasferimento, reso, scarto e rettifica: «Giacenza insufficiente: Farina 00 ne ha
    2,500 kg in Cucina.».
  - **`vendita` non si blocca mai**: le voci diventano righe con le ricette, scaricate dal primo punto **attivo** del tipo
    del `reparto`. Una voce senza ricetta → «… non ha una ricetta: aggiungila per scaricare le vendite.».
  - **Costo medio** a ogni carico con prezzo: `(giacenza × costo_medio + quantità × prezzo) / (giacenza + quantità)` sul
    totale dell'articolo; con giacenza ≤ 0 riparte dal prezzo. Aggiorna anche il prezzo del fornitore.
  - `avvisi` per gli articoli finiti **sotto la scorta minima**.
  - Bloccare le giacenze toccate per la durata della transazione (es. `UPDLOCK`), per non scendere sotto zero in
    concorrenza.
- **`annulla_movimento`**: movimento opposto collegato; uno storno non si annulla; gli scarichi delle comande si
  correggono con una rettifica.
- **`movimenti`**: periodo di al massimo 366 giorni, filtri del § 8.7, `automatici: false` esclude `origine = comanda`,
  ordinamento dal più recente, paginazione da 50 (massimo 200).
- **`giacenze`**: righe anche a zero se l'articolo è attivo, `negativa` se un punto è sotto zero,
  `valore = totale × costo_medio`.
- **`ricette`**: `food_cost = costo_porzione / prezzo × 100` (1 decimale; `null` con prezzo 0), `articoli_mancanti`
  calcolati nel punto di scarico della struttura `id_struttura` (facoltativo, predefinita la prima).
- **`inventario_chiudi`**: un solo movimento `rettifica` con `origine: inventario` e le differenze `contata − teorica`
  **al momento della chiusura**; `non_contati: "azzera"` le conta a zero. Conservare la teorica di chiusura nelle righe,
  così l'inventario chiuso mostra le differenze registrate.
- **Messaggi d'errore**: quelli del § 8, in italiano, perché la pagina li mostra così come sono.

## A7. Azione nuova: `fornitore`

Manca nel § 8 e serve alle pagine per **modificare** un fornitore senza cancellare i dati che non conoscono.

`dati`: `{ "id": 8 }`. Risposta: tutti i campi di `magfb.fornitori` (gli stessi di `salva_fornitore`) più
`"articoli": <numero di articoli collegati>`. Se inesistente o di un'altra azienda → `404 { "detail": "Fornitore non trovato." }`.

Va aggiunta anche alla scheda 17 (§ 8.9).

## A8. Risposte alla pagina

| Caso | Risposta |
|---|---|
| Lettura riuscita | `200` con il JSON del § 8 |
| Azione che modifica | **sempre `200`** con l'esito `{ success, error_message, id, duplicato, avvisi }` |
| Elemento inesistente in una lettura | `404 { "detail": "Articolo non trovato." }` (o «Movimento…», «Voce del menu…», «Inventario…») |
| Modulo Ristorazione non attivo | `404 { "collegata": false }` |
| Non gestore su azione riservata | `403 { "detail": "Operazione riservata al responsabile del Food & Beverage." }` |
| Corpo non valido | `400 { "detail": "…" }` |
| Errore imprevisto | `500 { "detail": "Operazione non riuscita: riprova." }` + log, senza dettagli tecnici |

Il `detail` è sempre un testo per l'utente: mai "Not Found" o "Bad Request" generici.

---

# PARTE B — Ingresso firmato per Op.Api: app Op

## B1. Perché

L'app Op deve **continuare a fare magazzino** (carico, codice a barre, bolla, trasferimenti, scarti, conta). Per le
aziende di Platform i dati stanno nel database di Sibylla, quindi Op.Api, che riceve le richieste dell'app, le passa al
Portal.

## B2. L'ingresso

`POST integrazione/op/magazzino-ristorazione` su SibyllaApi, **senza token utente**, autenticato con la firma
`X-Op-Firma` calcolata **da Op** con la chiave condivisa (stessa formula del § D2, verificata dal Portal: finestra di 5
minuti, confronto a tempo costante). Corpo:

```json
{ "id_azienda": 123, "azione": "registra", "autore": "Anna Bianchi", "gestore": false, "strutture": [45, 46], "dati": { } }
```

- `id_azienda`: azienda **di Platform**, perché Op conosce il collegamento della sua azienda.
- `autore`, `gestore`: dall'utente dell'app (gestore = responsabile F&B o amministratore in Op).
- `strutture`: le strutture di Platform abilitate per quell'utente. Il Portal rifiuta le azioni su strutture fuori elenco
  («Struttura non valida.»).
- `dati` e risposte: **identici alla Parte A**, con le stesse azioni del § A3, compresa `leggi_bolla`: anche la bolla
  fotografata dall'app la legge il Portal (Parte C). `bolla_telefono_*` non serve all'app, che ha già la fotocamera.
- Timeout lato Op: 15 s, **90 s** per `leggi_bolla`; corpo fino a **30 MB** per `leggi_bolla`.
- Firma assente, errata o scaduta → `401` senza dettagli.

## B3. Scarichi dalle comande: rimandati

**Decisione (10 novembre 2026):** per le aziende di Platform, per ora, **nessuno scarico automatico** dalle comande
dell'app Op verso il Portal.

Il motivo: le comande dell'app Op usano il menu salvato in Op (`fb_voci`, scheda 12 di sibylla-op), non le voci del menu
di Sibylla (`fb.menu_items`), quindi le ricette del Portal non si possono applicare alle righe di comanda di Op. Lo
scarico partirà quando anche **sala, comande e menu** di quelle aziende staranno in Sibylla, con la stessa regola.

Fino ad allora:
- il Portal accetta `origine: "comanda"` e il campo `comanda` **solo** dall'ingresso della Parte B, e Op **non li
  manda**;
- le pagine non possono crearli (caso di prova 19);
- le vendite si registrano a mano con il tipo `vendita` (§ 8.6), voce del menu e porzioni.

Lo schema dei dati (colonne `id_comanda`, `tavolo`, `voce`, `porzioni` di `magfb.movimenti`) è già pronto per quando
partirà.

## B4. Lato Op (da fare in sibylla-op, non nel Portal)

- L'archivio del magazzino diventa un'interfaccia con due implementazioni: **Op** per i clienti indipendenti e
  **Sibylla** per le aziende collegate a Platform. Quest'ultima chiama questo ingresso firmato.
- Per le aziende di Platform **nessuno scarico dalle comande** verso il Portal, finché il F&B non è in Sibylla (§ B3).
- Gli avvisi di sotto scorta nell'app partono dagli `avvisi` dell'esito restituito dal Portal.
- Per le aziende di Platform la bolla dell'app va al Portal (`leggi_bolla` in questo ingresso), non al lettore di Op.

---

# PARTE C — Lettura delle bolle con l'AI e "Fotografa col telefono", nel Portal

Stessa regola dei dati: per le aziende di Platform la bolla (foto, PDF, testo letto) passa solo dal Portal e la legge il
Portal con la **sua** chiave Anthropic. Op non la vede.

## C1. `leggi_bolla` (§ 8.8)

1. **File in ingresso**: da 1 a 3, JPEG, PNG o PDF, al massimo **5 MB** l'uno dopo la decodifica. Il tipo si riconosce dai
   primi byte, non dal campo `tipo`. Errori: `400` «File non valido: servono immagini JPEG o PNG, oppure un PDF.» ·
   «File troppo pesante (massimo 5 MB).» · «Al massimo 3 pagine per bolla.».
2. **Lettura con Claude** (API Messages di Anthropic, chiamata dal server del Portal):
   - immagini come blocchi `image`, PDF come blocco `document`, tutte le pagine in un'unica richiesta;
   - **output strutturato** (JSON schema) con quello che è scritto sulla bolla:
     - fornitore: nome, partita IVA, codice fiscale, indirizzo, CAP, comune, provincia, telefono, email, PEC;
     - numero, data;
     - righe: codice, EAN, descrizione, quantità, unità, lotto, scadenza, prezzo;
     - `leggibile`, `avvisi`;
   - **attenzione allo schema**: l'API limita i campi facoltativi o con più tipi (Op ha avuto il rifiuto oltre 16 campi
     "string o null"). Tutti i campi obbligatori, stringhe vuote per i dati assenti, `additionalProperties: false`;
   - modello configurabile (oggi Op usa `claude-haiku-5-5`), timeout **90 s**;
   - riferimento da riprendere: il lettore di Op, `ILettoreBolle` / `LettoreBolle` in
     `sibylla-op/backend/src/Op.Api/Services/LettoreBolle.cs` (prompt, schema, normalizzazione dei campi).
3. **Abbinamento sul database di Sibylla** e risposta nel formato del § 8.8:
   - fornitore per partita IVA, poi per nome → `id_fornitore` (o `null` = da creare);
   - ogni riga, nell'ordine: EAN tra i codici a barre → `codice` tra i `codice_fornitore` del fornitore abbinato → nome.
     `quantita = quantita_letta × quantita del codice`, `prezzo_unitario` per unità dell'articolo;
   - righe non abbinate: `id_articolo: null` e `proposta` con nome, unità, quantità e categoria (`id_categoria` se
     esiste).
4. **Non si salva nulla**: niente bolla, foto o testo nel database. Si registra solo il carico che l'utente conferma
   dopo (`registra`, `origine: "bolla"`).
5. **Errori**:
   - API non configurata → `503 { "detail": "La lettura delle bolle non è attiva su questo server." }`;
   - foto illeggibile o rifiutata dall'API → `422 { "detail": "La foto non si può leggere: riprova con più luce e il
     foglio intero nell'inquadratura." }`;
   - timeout o errore dell'API → `502 { "detail": "Lettura non riuscita: riprova." }` + log, senza il corpo.
6. **Limiti**: corpo della richiesta fino a **30 MB**, solo per questa azione, sul Proxy e su SibyllaApi.

## C2. "Fotografa col telefono" (§ 8.13)

Dal computer senza fotocamera la pagina mostra un QR. Il telefono apre una **pagina pubblica di Sibylla Platform**,
scatta fino a 3 foto e le invia al Portal; il computer le riceve e le usa come se le avesse caricate.

| Azione / rotta | Chi la chiama | Cosa fa |
|---|---|---|
| `bolla_telefono_apri` `{ id_struttura }` (in `Esegui`) | pagina del computer, con token | Crea un passaggio: `codice` casuale di **128 bit** (base64url), scadenza a **15 minuti**. Risponde `{ codice, url, scade_il }`, con `url` = `{Platform:PublicUrl}/bolla-telefono/{codice}`. |
| `bolla_telefono_stato` `{ codice }` (in `Esegui`) | pagina del computer, ogni 2 s | `attesa` · `inviata` (con `file`, **consegnati una sola volta**, poi cancellati → `ritirata`) · `scaduta`. Codice di un'altra azienda o inesistente → `404 { "detail": "Passaggio non trovato." }`. |
| `GET bolla-telefono/{codice}` (pubblica, senza token) | pagina del telefono | `{ "struttura": "Trattoria del Porto", "scade_il": "…", "stato": "attesa" }`, oppure `410` se scaduto o già usato. |
| `POST bolla-telefono/{codice}` (pubblica, senza token) | pagina del telefono | Corpo `{ "file": [ { "tipo", "dati" } ] }`, da 1 a 3, 5 MB l'uno. Lo stato passa a `inviata`. **Una sola consegna** per codice. |

- **Il codice è la chiave**: mai nei log, mai mostrato come testo. Rotte pubbliche con limite di frequenza e di
  dimensione.
- Le foto si tengono **solo** fino alla consegna o alla scadenza (tabella temporanea o cache), poi si cancellano. Una
  pulizia periodica toglie i passaggi scaduti.
- La risposta `inviata` può arrivare a **~25 MB**: niente limiti di buffer troppo bassi. Le pagine chiamano lo stato
  **ogni 2 secondi**: niente limiti di frequenza che lo blocchino.
- La **pagina del telefono** (`/bolla-telefono/{codice}`) la realizza **sibylla-platform**: scatto con la fotocamera
  posteriore o dalla galleria, riduzione delle foto a lato lungo 2400 px in JPEG, invio.

# D. Configurazione e firma

## D1. Configurazione

| Chiave (nome indicativo) | Valore |
|---|---|
| `OpPlatform:Chiave` | la chiave condivisa con Op (la stessa di BI e Piano ferie), **solo** nella configurazione segreta: serve a verificare l'ingresso della Parte B |
| `Anthropic:ApiKey` | chiave dell'API di Anthropic per la lettura delle bolle, **solo** nella configurazione segreta (Key Vault o variabili dell'App Service), mai nel frontend |
| `Anthropic:ModelloBolle` | modello per la lettura delle bolle, es. `claude-haiku-5-5` |
| `Platform:PublicUrl` | indirizzo pubblico di Sibylla Platform per il QR del telefono, es. `https://sibylla-platform.vercel.app` |

Senza `OpPlatform:Chiave` l'ingresso della Parte B risponde `503`. Senza `Anthropic:ApiKey` `leggi_bolla` risponde `503`
(§ C1); il resto della Parte A funziona.

## D2. Firma `X-Op-Firma` (nei due sensi)

```
X-Op-Firma: t=<secondi Unix>,v1=<hex minuscolo di HMAC-SHA256(chiave, t + "." + corpo)>
```

- Il Portal **verifica** le chiamate da Op (Parte B). Se in futuro chiamerà Op, firmerà allo stesso modo.
- Firma sui **byte esatti** del corpo, finestra di **5 minuti**, confronto a tempo costante.
- **Vettore di prova** (test unitario):
  - chiave `chiave-di-esempio-per-i-test-non-usare-in-produzione`;
  - t `1730540000`;
  - corpo `{"id_azienda":123,"azione":"elenco","autore":"Mario Rossi","dati":{}}`;
  - firma attesa `48ac490057e856e77db72e7431f7340d7ca1f64843480783c9a660bff9cf1a93`.

## D3. Log

Mai nei log: i corpi delle richieste e delle risposte (foto dei documenti, testo letto dalle bolle, codici del
telefono), le chiavi (Op e Anthropic), i dati dei fornitori.

---

# E. Casi di prova

| # | Situazione | Atteso |
|---|---|---|
| 1 | Pagina, utente senza permesso | `403`, nessuna scrittura |
| 2 | `azione` = `"svuota"` | `400 { "detail": "Azione non valida." }` |
| 3 | Primo `contesto` di un'azienda con 2 strutture | 6 punti creati (Magazzino, Cucina, Bar per struttura); `permessi.gestore` dal ruolo |
| 4 | Modulo Ristorazione non attivo | `404 { "collegata": false }` |
| 5 | `id_azienda` o `gestore` nel corpo della pagina | ignorati: valgono quelli del token |
| 6 | `registra` scarico oltre la giacenza | `success: false` «Giacenza insufficiente: …», niente scritto |
| 7 | Stesso `registra` due volte con la stessa `id_operazione` | un solo movimento; la seconda risposta `duplicato: true` |
| 8 | Carico con prezzo | costo medio come da formula; prezzo del fornitore aggiornato |
| 9 | Trasferimento Magazzino → Cucina | due righe, giacenze dei due punti aggiornate nella stessa transazione |
| 10 | Due scarichi concorrenti sull'ultima unità | uno riesce, l'altro «Giacenza insufficiente» (mai sotto zero) |
| 11 | `vendita` di una voce con ricetta, giacenza a zero | registrata, giacenza negativa, `giacenze.negativa: true` |
| 12 | `annulla_movimento` da non gestore | `403` |
| 13 | `inventario_chiudi` con `azzera` | una `rettifica` con le differenze alla chiusura; l'inventario chiuso le mostra ancora |
| 14 | `ricette` | voci da `fb.menu_items` dell'azienda; food cost e mancanti corretti |
| 15 | `leggi_bolla` con un DDT d'esempio (API finta) | risposta del § 8.8 con abbinamenti per EAN, codice fornitore e nome; nulla salvato nel database |
| 15b | `leggi_bolla` con un file di testo | `400` «File non valido…», nessuna chiamata all'API |
| 15c | Passaggio telefono: apri, invio dalla rotta pubblica, stato | `inviata` con i file la prima volta, poi `ritirata`; un secondo invio allo stesso codice → `410` |
| 16 | Ingresso Op con firma errata o scaduta | `401`, niente scritto |
| 17 | Ingresso Op: `registra` dall'app ripetuto con la stessa `id_operazione` | un solo movimento; la seconda risposta `duplicato: true` |
| 18 | Ingresso Op con struttura non abilitata | `success: false` «Struttura non valida.» |
| 19 | La pagina invia `origine: "comanda"` | rifiutato (`success: false`) |
| 20 | Log | nessun corpo, foto, codice del telefono o chiave |

**Criteri di accettazione:**
- le pagine di Platform funzionano **senza modifiche** su `POST /Sibylla/OpApp/magazzinoFb/Esegui`;
- tutte le azioni del § A3 rispettano il § 8 e le regole del § A6;
- dati solo nel database di Sibylla, schema `magfb`, con migrazioni DbUp;
- l'ingresso firmato della Parte B è pronto per Op;
- la lettura della bolla e il passaggio dal telefono avvengono nel Portal, senza Op e senza salvare la bolla;
- i 20 casi sono coperti da test automatici.

# F. Da chiedere prima di iniziare

1. Il permesso o modulo che significa "può aprire Ristorazione › Magazzino", e come si legge dal token che il modulo
   **Ristorazione** è attivo per l'azienda.
2. Il valore del claim `Ruolo` (o altro) per **amministratore dell'azienda** e **responsabile F&B**.
3. Il claim con **nome e cognome** dell'utente.
4. Per la Ristorazione stand alone, se `id_struttura` deve essere l'**outlet** o la struttura padre di `config.strutture`.
5. Se BI o Piano ferie hanno già, in un altro branch, la firma `X-Op-Firma` e la configurazione della chiave: in quel
   caso si riusano.
6. Per ogni ambiente, i valori di `ApiUrlBase` e `HrApiUrlBase` del Proxy ([portal-proxy/README.md](portal-proxy/README.md)).

# G. Cosa cambia fuori dal Portal

- **sibylla-op**:
  - archivio del magazzino verso il Portal per le aziende di Platform (§ B4), compresa la bolla letta dall'app (in corso);
  - scarichi delle comande: rimandati finché sala, comande e menu non sono in Sibylla (§ B3);
  - aggiornare i §§ 0, 8.9 (azione `fornitore`) e 9 della scheda 17;
  - dismettere il magazzino in Op.Api per le aziende di Platform (rotta demo, attivazione) quando A e B sono pronte;
    fino ad allora restano attivi.
- **sibylla-platform**:
  - il client delle pagine smette di provare la rotta demo di Op e chiama solo il Portal;
  - nuova pagina pubblica `/bolla-telefono/{codice}` per lo scatto dal telefono (§ C2);
  - con l'azione `fornitore` le pagine potranno modificare i fornitori.

---

# H. Configurazione e rilascio (per il team backend)

Il Portal è su **Azure App Service** (per esempio `app-apiproxy-staging-italynorth-01-…` e `sibyllaapi.azurewebsites.net`),
con gli ambienti `Development`, `Testing`, `Staging` e `Production` (`appsettings.{Ambiente}.json`). Le pagine di Platform
sono su Vercel (`https://sibylla-platform.vercel.app`) e chiamano il **Proxy**.

## H1. Convenzioni del repository da rispettare

Da `copilot-instructions.md` del Portal:
- **Script del database**: sempre un **file nuovo**, mai modificare uno script esistente. Numerazione a **sei cifre**,
  struttura in `Infrastructure/DbUp/Scripts/0 - Schema`, dati in `Infrastructure/DbUp/Scripts/1 - Data`. Per viste e
  procedure `CREATE OR ALTER`.
- **Accesso ai dati**: Dapper + `SqlConnection`, come gli altri repository di `SibyllaApi/Repository`.
- **Prima di toccare una tabella** esistente, controllare l'ultima versione del suo script in `0 - Schema`.

## H2. File da creare o modificare

| Progetto | File | Contenuto |
|---|---|---|
| SibyllaApi | `Controllers/MagazzinoFbController.cs` (o dentro `OpAppController`) | `POST opapp/magazzinoFb/Esegui` (Parte A, `[Authorize]`), `POST integrazione/op/magazzino-ristorazione` (Parte B, `[AllowAnonymous]` + verifica della firma), `GET`/`POST bolla-telefono/{codice}` (Parte C2, `[AllowAnonymous]`) |
| SibyllaApi | `Repository/MagazzinoFbRepository.cs` | Tutte le azioni del § A3 sul database (transazioni, chiavi, giacenze) |
| SibyllaApi | `Services/LettoreBolle.cs` | Chiamata all'API di Anthropic e abbinamento (§ C1) |
| SibyllaApi | `Services/FirmaOp.cs` | Calcolo e verifica di `X-Op-Firma` (§ D2), con il test del vettore di prova |
| Models | `Models/MagazzinoFb/*.cs` | DTO in `snake_case` come il contratto (Appendice 2) |
| SibyllaApiProxy | `Controllers/SibyllaController.cs`, da [portal-proxy/](portal-proxy/README.md) | Inoltro generico `/Sibylla/{**path}`, correzioni del § H4.1 già fatte |
| SibyllaApiProxy | `Program.cs` | CORS con le origini di Platform (§ H5) |
| Infrastructure | `DbUp/Scripts/0 - Schema/0002xx_MagazzinoFb_Schema.sql` | Schema `magfb` (Appendice 1), con il primo numero libero |
| Test | `Sibylla.Test/MagazzinoFb/*` | I casi del § E |

## H3. Configurazione per ambiente

Le chiavi segrete **solo** in Key Vault o nelle impostazioni dell'App Service, mai negli `appsettings` versionati. Su App
Service il separatore è il doppio trattino basso (`OpPlatform__Chiave`).

| Impostazione | Dove | Development | Staging / Testing | Production |
|---|---|---|---|---|
| `OpPlatform__Chiave` | SibyllaApi | chiave di sviluppo concordata con Op | chiave di staging (da chiedere a Op) | **segreta**, la stessa di BI e Piano ferie |
| `Anthropic__ApiKey` | SibyllaApi | chiave di sviluppo | chiave di staging | **segreta** |
| `Anthropic__ModelloBolle` | SibyllaApi | `claude-haiku-5-5` | `claude-haiku-5-5` | `claude-haiku-5-5` |
| `Platform__PublicUrl` | SibyllaApi | `http://localhost:3000` | indirizzo della Platform di staging | `https://sibylla-platform.vercel.app` (o il dominio definitivo) |
| `MagazzinoFb__LimiteBollaMb` | SibyllaApi, Proxy | `30` | `30` | `30` |

Senza `OpPlatform__Chiave` la Parte B risponde `503`. Senza `Anthropic__ApiKey` solo `leggi_bolla` risponde `503`. Il
resto funziona.

## H4. La rotta nel Proxy

Il frontend chiama:

| Metodo e percorso sul Proxy | Inoltra a SibyllaApi | Autenticazione |
|---|---|---|
| `POST /Sibylla/OpApp/magazzinoFb/Esegui` | `POST opapp/magazzinoFb/Esegui` | token Bearer dell'utente di Platform |
| `GET /Sibylla/bolla-telefono/{codice}` | `GET bolla-telefono/{codice}` | nessuna (il codice è la chiave) |
| `POST /Sibylla/bolla-telefono/{codice}` | `POST bolla-telefono/{codice}` | nessuna |

L'ingresso della Parte B (`integrazione/op/magazzino-ristorazione`) lo chiama Op **direttamente su SibyllaApi**, non dal
Proxy. Va reso raggiungibile da `api.sibyllaop.it` (regole di accesso dell'App Service, se presenti).

### H4.1 L'inoltro `/Sibylla/{**path}`: codice di riferimento

Esisteva solo come modifica **mai committata** in una copia di lavoro del Portal. Il codice da usare, con le correzioni
necessarie per il magazzino già fatte, è pubblicato in questo repository:
[portal-proxy/SibyllaController.cs](portal-proxy/SibyllaController.cs). Le istruzioni per portarlo nel Portal (CORS,
`ApiUrlBase`, `web.config`, prove) sono in [portal-proxy/README.md](portal-proxy/README.md).

Correzioni rispetto alla copia di lavoro:
1. rotte pubbliche `GET`/`POST /Sibylla/bolla-telefono/{codice}` con `[AllowAnonymous]`; tutto il resto resta
   `[Authorize]`;
2. negli errori `502` niente `ex.Message`: resta solo nel log, senza il codice del telefono;
3. timeout di **120 s**;
4. `[RequestSizeLimit]` a **30 MB**.

Lo stato e il corpo di SibyllaApi arrivano alla pagina **identici**: è quello che serve al magazzino.

## H5. CORS

Il CORS del Proxy (`SibyllaApiProxy/Program.cs`) oggi ammette solo i domini di Operation. Va aggiunto:
- `https://sibylla-platform.vercel.app` e l'eventuale dominio definitivo di Platform;
- in Staging, l'indirizzo della Platform di staging;
- in Development, `http://localhost:3000`.

Metodi `POST`, `GET`, `OPTIONS`; header `Authorization` e `Content-Type`.

## H6. Limiti del server

- **Dimensione del corpo**: `[RequestSizeLimit(31_457_280)]` (30 MB) **solo** sulle azioni `Esegui`, `bolla-telefono` e
  sull'ingresso della Parte B, sia nel Proxy sia in SibyllaApi. Su App Service con IIS (Windows) serve anche
  `maxAllowedContentLength` in `web.config`. Lo stesso vale per i form (`MultipartBodyLengthLimit`) se si usano.
- **Risposte grandi**: `bolla_telefono_stato` arriva a ~25 MB; nessun buffer del client HTTP sotto i 30 MB.
- **Timeout**: chiamata all'API di Anthropic 90 s; Proxy → SibyllaApi almeno 120 s. Il limite delle richieste di App
  Service (230 s) basta.
- **Frequenza**: `bolla_telefono_stato` ogni 2 s per pagina aperta; le rotte pubbliche `bolla-telefono/{codice}` con un
  limite per IP (per esempio 30 richieste al minuto).

## H7. Ordine di rilascio e verifiche

1. **Database**: eseguire lo script dell'Appendice 1 con DbUp in Staging, poi verificare che lo schema `magfb` e le
   tabelle esistano.
2. **SibyllaApi + Proxy in Staging**, con le impostazioni del § H3.
3. **Prove in Staging** (i comandi `curl` qui sotto).
4. **Op in Staging**: Op punta all'ingresso della Parte B di Staging e prova un carico, una bolla e una conta dall'app.
5. **Frontend** di staging puntato al Proxy di Staging (§ H8), prova delle pagine con un'utenza vera.
6. **Produzione**, nello stesso ordine.

Prove minime (Staging):

```bash
# 1. Contesto con il token di un utente con il modulo Ristorazione (crea i punti predefiniti alla prima chiamata)
curl -s -X POST "$PROXY/Sibylla/OpApp/magazzinoFb/Esegui" -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" -d '{"azione":"contesto","dati":{}}'

# 2. Azione non valida → 400 { "detail": "Azione non valida." }
curl -s -X POST "$PROXY/Sibylla/OpApp/magazzinoFb/Esegui" -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" -d '{"azione":"svuota"}'

# 3. Ingresso di Op senza firma → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/integrazione/op/magazzino-ristorazione" \
     -H "Content-Type: application/json" -d '{"id_azienda":1,"azione":"contesto","dati":{}}'
```

**Ritorno indietro**: le tabelle `magfb` sono nuove e non toccano quelle esistenti. Per tornare indietro basta
ripubblicare la versione precedente di SibyllaApi e del Proxy; lo schema può restare.

## H8. Cosa fa il frontend (sibylla-platform) dopo il backend

Non serve al backend per funzionare, ma senza queste cose le pagine pubblicate non usano il Portal:
1. Su Vercel, impostare `REACT_APP_API_URL` = URL del Proxy dell'ambiente. Oggi non c'è e la build pubblicata risponde
   subito "non raggiungibile".
2. Il login vero di Platform: su Vercel oggi è aggirato con un utente di sviluppo, quindi senza token il Portal risponde
   `401`.
3. Il client del Magazzino smette di provare la rotta demo di Op e chiama solo il Portal.
4. La pagina pubblica `/bolla-telefono/{codice}` (§ C2).
5. La modifica dei fornitori con l'azione `fornitore` (§ A7).

---

# Appendice 1 — Script del database (SQL Server)

File: `Infrastructure/DbUp/Scripts/0 - Schema/0002xx_MagazzinoFb_Schema.sql`, con il primo numero libero a sei cifre.
Nomi e tipi sono una proposta coerente col contratto: adattarli alle convenzioni del database se servono (per esempio
`id_azienda` come in `sib.Users.Id_azienda`, chiavi esterne verso `config.strutture` e `fb.menu_items`).

```sql
begin transaction;

IF SCHEMA_ID('magfb') IS NULL EXEC('CREATE SCHEMA magfb');

IF OBJECT_ID('magfb.punti') IS NULL
CREATE TABLE magfb.punti (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    id_azienda    INT           NOT NULL,
    id_struttura  INT           NOT NULL,             -- config.strutture.id
    nome          NVARCHAR(80)  NOT NULL,
    tipo          VARCHAR(10)   NOT NULL CHECK (tipo IN ('magazzino','cucina','bar')),
    attivo        BIT           NOT NULL DEFAULT 1,
    CONSTRAINT UQ_magfb_punti_nome UNIQUE (id_struttura, nome)
);

IF OBJECT_ID('magfb.categorie') IS NULL
CREATE TABLE magfb.categorie (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    id_azienda  INT           NOT NULL,
    nome        NVARCHAR(80)  NOT NULL,
    CONSTRAINT UQ_magfb_categorie_nome UNIQUE (id_azienda, nome)
);

IF OBJECT_ID('magfb.fornitori') IS NULL
CREATE TABLE magfb.fornitori (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    id_azienda      INT            NOT NULL,
    nome            NVARCHAR(150)  NOT NULL,
    partita_iva     VARCHAR(11)    NULL,
    codice_fiscale  VARCHAR(16)    NULL,
    indirizzo       NVARCHAR(200)  NULL,
    cap             VARCHAR(5)     NULL,
    comune          NVARCHAR(100)  NULL,
    provincia       VARCHAR(2)     NULL,
    telefono        VARCHAR(30)    NULL,
    email           NVARCHAR(150)  NULL,
    pec             NVARCHAR(150)  NULL
);
CREATE INDEX IX_magfb_fornitori_piva ON magfb.fornitori (id_azienda, partita_iva);

IF OBJECT_ID('magfb.articoli') IS NULL
CREATE TABLE magfb.articoli (
    id                    INT IDENTITY(1,1) PRIMARY KEY,
    id_azienda            INT            NOT NULL,
    codice                VARCHAR(20)    NOT NULL,       -- ART-000037, assegnato alla creazione
    nome                  NVARCHAR(120)  NOT NULL,
    id_categoria          INT            NULL REFERENCES magfb.categorie(id),
    unita                 VARCHAR(2)     NOT NULL CHECK (unita IN ('kg','l','pz')),
    scorta_minima         DECIMAL(18,3)  NOT NULL DEFAULT 0,
    id_punto_predefinito  INT            NULL REFERENCES magfb.punti(id),
    costo_medio           DECIMAL(18,4)  NULL,
    attivo                BIT            NOT NULL DEFAULT 1,
    note                  NVARCHAR(500)  NULL,
    CONSTRAINT UQ_magfb_articoli_nome UNIQUE (id_azienda, nome),
    CONSTRAINT UQ_magfb_articoli_codice UNIQUE (id_azienda, codice)
);

IF OBJECT_ID('magfb.articoli_codici') IS NULL
CREATE TABLE magfb.articoli_codici (
    id_azienda   INT            NOT NULL,
    ean          VARCHAR(14)    NOT NULL,
    id_articolo  INT            NOT NULL REFERENCES magfb.articoli(id),
    quantita     DECIMAL(18,3)  NOT NULL CHECK (quantita > 0),
    descrizione  NVARCHAR(100)  NULL,
    CONSTRAINT PK_magfb_articoli_codici PRIMARY KEY (id_azienda, ean)
);

IF OBJECT_ID('magfb.articoli_fornitori') IS NULL
CREATE TABLE magfb.articoli_fornitori (
    id_articolo       INT            NOT NULL REFERENCES magfb.articoli(id),
    id_fornitore      INT            NOT NULL REFERENCES magfb.fornitori(id),
    codice_fornitore  NVARCHAR(50)   NULL,
    prezzo            DECIMAL(18,4)  NULL,
    CONSTRAINT PK_magfb_articoli_fornitori PRIMARY KEY (id_articolo, id_fornitore)
);

IF OBJECT_ID('magfb.movimenti') IS NULL
CREATE TABLE magfb.movimenti (
    id                     BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_azienda             INT             NOT NULL,
    id_struttura           INT             NOT NULL,
    tipo                   VARCHAR(15)     NOT NULL CHECK (tipo IN ('carico','scarico','trasferimento','reso','scarto','vendita','rettifica')),
    origine                VARCHAR(15)     NOT NULL CHECK (origine IN ('manuale','codice_a_barre','bolla','comanda','inventario')),
    data                   DATETIMEOFFSET  NOT NULL,
    registrato_il          DATETIMEOFFSET  NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    autore                 NVARCHAR(100)   NOT NULL,
    id_punto               INT             NULL REFERENCES magfb.punti(id),
    id_punto_destinazione  INT             NULL REFERENCES magfb.punti(id),
    id_fornitore           INT             NULL REFERENCES magfb.fornitori(id),
    documento              NVARCHAR(150)   NULL,
    motivo                 NVARCHAR(200)   NULL,
    note                   NVARCHAR(500)   NULL,
    id_annulla             BIGINT          NULL REFERENCES magfb.movimenti(id),
    id_annullato_da        BIGINT          NULL,
    id_comanda             INT             NULL,
    tavolo                 NVARCHAR(20)    NULL,
    voce                   NVARCHAR(150)   NULL,
    porzioni               DECIMAL(18,3)   NULL
);
CREATE INDEX IX_magfb_movimenti_data ON magfb.movimenti (id_azienda, id_struttura, data DESC);

IF OBJECT_ID('magfb.movimenti_righe') IS NULL
CREATE TABLE magfb.movimenti_righe (
    id               BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_movimento     BIGINT          NOT NULL REFERENCES magfb.movimenti(id),
    id_articolo      INT             NOT NULL REFERENCES magfb.articoli(id),
    id_punto         INT             NOT NULL REFERENCES magfb.punti(id),
    quantita         DECIMAL(18,3)   NOT NULL,          -- con segno: negativa per le uscite
    prezzo_unitario  DECIMAL(18,4)   NULL,
    lotto            NVARCHAR(50)    NULL,
    scadenza         DATE            NULL,
    giacenza_dopo    DECIMAL(18,3)   NOT NULL
);
CREATE INDEX IX_magfb_righe_articolo ON magfb.movimenti_righe (id_articolo, id_punto);

IF OBJECT_ID('magfb.giacenze') IS NULL
CREATE TABLE magfb.giacenze (
    id_articolo  INT            NOT NULL REFERENCES magfb.articoli(id),
    id_punto     INT            NOT NULL REFERENCES magfb.punti(id),
    quantita     DECIMAL(18,3)  NOT NULL DEFAULT 0,
    CONSTRAINT PK_magfb_giacenze PRIMARY KEY (id_articolo, id_punto)
);

IF OBJECT_ID('magfb.operazioni') IS NULL
CREATE TABLE magfb.operazioni (
    id_azienda     INT               NOT NULL,
    id_operazione  VARCHAR(64)       NOT NULL,       -- UUID dalle pagine, o "comanda-…" da Op
    azione         VARCHAR(30)       NOT NULL,
    id_risultato   BIGINT            NULL,
    registrata_il  DATETIMEOFFSET    NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT PK_magfb_operazioni PRIMARY KEY (id_azienda, id_operazione)
);

IF OBJECT_ID('magfb.ricette') IS NULL
CREATE TABLE magfb.ricette (
    id_azienda     INT             NOT NULL,
    id_voce        INT             NOT NULL,         -- fb.menu_items.id
    reparto        VARCHAR(6)      NOT NULL CHECK (reparto IN ('cucina','bar')),
    aggiornata_il  DATETIMEOFFSET  NOT NULL,
    aggiornata_da  NVARCHAR(100)   NOT NULL,
    CONSTRAINT PK_magfb_ricette PRIMARY KEY (id_azienda, id_voce)
);

IF OBJECT_ID('magfb.ricette_righe') IS NULL
CREATE TABLE magfb.ricette_righe (
    id_azienda   INT            NOT NULL,
    id_voce      INT            NOT NULL,
    id_articolo  INT            NOT NULL REFERENCES magfb.articoli(id),
    quantita     DECIMAL(18,3)  NOT NULL CHECK (quantita > 0),
    CONSTRAINT PK_magfb_ricette_righe PRIMARY KEY (id_azienda, id_voce, id_articolo),
    CONSTRAINT FK_magfb_ricette_righe FOREIGN KEY (id_azienda, id_voce) REFERENCES magfb.ricette(id_azienda, id_voce)
);

IF OBJECT_ID('magfb.inventari') IS NULL
CREATE TABLE magfb.inventari (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    id_azienda    INT             NOT NULL,
    id_struttura  INT             NOT NULL,
    id_punto      INT             NOT NULL REFERENCES magfb.punti(id),
    stato         VARCHAR(10)     NOT NULL CHECK (stato IN ('aperto','chiuso','annullato')),
    aperto_il     DATETIMEOFFSET  NOT NULL,
    aperto_da     NVARCHAR(100)   NOT NULL,
    chiuso_il     DATETIMEOFFSET  NULL,
    chiuso_da     NVARCHAR(100)   NULL,
    id_movimento  BIGINT          NULL REFERENCES magfb.movimenti(id)
);
-- un solo inventario aperto per punto
CREATE UNIQUE INDEX UX_magfb_inventari_aperto ON magfb.inventari (id_punto) WHERE stato = 'aperto';

IF OBJECT_ID('magfb.inventari_righe') IS NULL
CREATE TABLE magfb.inventari_righe (
    id_inventario     INT             NOT NULL REFERENCES magfb.inventari(id),
    id_articolo       INT             NOT NULL REFERENCES magfb.articoli(id),
    contata           DECIMAL(18,3)   NULL,
    contata_da        NVARCHAR(100)   NULL,
    contata_il        DATETIMEOFFSET  NULL,
    teorica_chiusura  DECIMAL(18,3)   NULL,          -- scritta alla chiusura: le differenze restano quelle registrate
    CONSTRAINT PK_magfb_inventari_righe PRIMARY KEY (id_inventario, id_articolo)
);

IF OBJECT_ID('magfb.passaggi_telefono') IS NULL
CREATE TABLE magfb.passaggi_telefono (
    codice        VARCHAR(32)      NOT NULL PRIMARY KEY,   -- 128 bit casuali in base64url
    id_azienda    INT              NOT NULL,
    id_struttura  INT              NOT NULL,
    scade_il      DATETIMEOFFSET   NOT NULL,
    stato         VARCHAR(10)      NOT NULL CHECK (stato IN ('attesa','inviata','ritirata','scaduta')),
    file_json     NVARCHAR(MAX)    NULL                    -- foto in base64; svuotato alla consegna
);

commit transaction;
```

Pulizia periodica (job o `BackgroundService`): cancellare le righe di `magfb.passaggi_telefono` scadute da più di un'ora.

---

# Appendice 2 — Il contratto completo delle azioni

Copia del § 8 della scheda 17 di sibylla-op, versione del 10 novembre 2026. Per il Portal valgono queste letture:
- dove il testo dice **"Op"** o **"in Op"**, leggere **"il Portal"** / **"nel database di Sibylla"**;
- `id_struttura` è l'**id di `config.strutture`** dell'azienda; in `contesto.strutture` `id` e `id_struttura_platform`
  coincidono;
- `id_voce` è `fb.menu_items.id`;
- il § 8.12 della scheda ("Cosa fa Op da solo") non è riportato: per le aziende di Platform valgono il § A6 e il § B3
  (scarichi dalle comande rimandati);
- l'azione nuova `fornitore` è descritta nel § A7;
- nel § 8.13 la pagina del telefono e le sue rotte pubbliche sono quelle del § C2 (servite da Sibylla Platform e dal
  Portal), non di Op; la riduzione delle foto a 2400 px la fa la pagina del telefono;
- nel § 8.8 la lettura la fa il Portal con la sua chiave Anthropic (§ C1); nei testi per l'utente l'AI si chiama
  sempre "AI di Sibylla".

### 8.0 Convenzioni

- **Nomi dei campi** in `snake_case`, come qui.
- **Date** `"aaaa-mm-gg"` (giorno in ora italiana); **istanti** ISO 8601 con fuso (`"2026-11-10T09:30:00+01:00"`).
- **Quantità**: numeri JSON con al massimo **3 decimali** (`0.250` kg), sempre nell'unità dell'articolo. Mai stringhe.
- **Importi** in euro: al massimo **4 decimali** per i prezzi unitari (`0.0125` €/g è possibile), 2 per i totali.
- **Azioni di lettura**: `200` con il JSON descritto.
- **Azioni che modificano**: **sempre `200`** con l'esito:
  ```json
  { "success": true,  "error_message": null, "id": 812, "duplicato": false, "avvisi": [] }
  { "success": false, "error_message": "Giacenza insufficiente: Farina 00 ne ha 2,500 kg in Cucina.", "id": null, "duplicato": false, "avvisi": [] }
  ```
  - `error_message` è scritto per l'utente, in italiano: la pagina lo mostra così com'è.
  - `id`: l'id di ciò che è stato creato o modificato (articolo, movimento, ricetta…).
  - `duplicato`: `true` se la stessa `id_operazione` era già stata registrata: **non** è un errore, la pagina lo tratta come
    un successo (era un "Riprova").
  - `avvisi`: frasi da mostrare anche se è andata bene (es. «Pomodori pelati è sotto la scorta minima.»).
- **Chiave anti-doppioni `id_operazione`** (UUID): obbligatoria in ogni azione che **crea** qualcosa (§ 8.1, colonna
  "Chiave"). La pagina la genera **al primo tentativo** e la riusa identica se l'utente preme "Riprova": Op non crea un
  secondo movimento, articolo o fornitore.
- **Struttura**: ogni azione che riguarda giacenze e movimenti chiede `id_struttura` (id di Op, da `contesto`). Una struttura
  che non è dell'azienda → `success: false` «Struttura non valida.» (o `404` per le letture).
- **Elenchi paginati**: `pagina` (da 1) e `per_pagina` (predefinita 50, massimo 200); risposta con `totale`.

### 8.1 Elenco delle azioni

| Azione | Tipo | Gestore | Chiave | Cosa fa |
|---|---|---|---|---|
| `contesto` | lettura | | | Tutto ciò che serve per aprire le pagine: strutture, punti, categorie, fornitori, unità, permessi (§ 8.3) |
| `giacenze` | lettura | | | Giacenze per articolo e punto (§ 8.4) |
| `articoli` | lettura | | | Anagrafica articoli, con ricerca (§ 8.5) |
| `articolo` | lettura | | | Un articolo con giacenze e ultimi movimenti (§ 8.5) |
| `cerca_codice` | lettura | | | Articolo da codice a barre (§ 8.5) |
| `salva_articolo` | modifica | per modificare | per creare | Crea (tutti) o modifica (gestore) un articolo (§ 8.5) |
| `elimina_articolo` | modifica | ✔ | | Solo se non ha movimenti; altrimenti si disattiva (§ 8.5) |
| `salva_categoria`, `elimina_categoria` | modifica | ✔ | per creare | Categorie degli articoli (§ 8.9) |
| `salva_punto`, `elimina_punto` | modifica | ✔ | per creare | Punti di stoccaggio (§ 8.9) |
| `salva_fornitore` | modifica | per modificare | per creare | Crea (tutti) o modifica (gestore) un fornitore (§ 8.9) |
| `registra` | modifica | solo `rettifica` | ✔ | Registra un movimento con le sue righe (§ 8.6) |
| `movimenti` | lettura | | | Registro dei movimenti, filtrabile e paginato (§ 8.7) |
| `movimento` | lettura | | | Un movimento con tutte le righe (§ 8.7) |
| `annulla_movimento` | modifica | ✔ | ✔ | Storno: movimento opposto collegato all'originale (§ 8.7) |
| `leggi_bolla` | lettura (costosa) | | | Legge foto/PDF del DDT con Claude e abbina fornitore e righe (§ 8.8) |
| `bolla_telefono_apri` | lettura | | | Apre il passaggio "Fotografa col telefono": codice e indirizzo per il QR (§ 8.13) |
| `bolla_telefono_stato` | lettura | | | Stato del passaggio; quando arrivano, consegna le foto una volta sola (§ 8.13) |
| `ricette` | lettura | | | Voci del menu con la loro ricetta e il costo per porzione (§ 8.10) |
| `ricetta` | lettura | | | Una ricetta (§ 8.10) |
| `salva_ricetta`, `elimina_ricetta` | modifica | ✔ | | Ricetta di una voce del menu (§ 8.10) |
| `inventari` | lettura | | | Inventari della struttura (§ 8.11) |
| `inventario` | lettura | | | Un inventario con le righe da contare (§ 8.11) |
| `inventario_apri` | modifica | ✔ | ✔ | Apre la conta di un punto (§ 8.11) |
| `inventario_conta` | modifica | | | Salva le quantità contate (anche in più volte) (§ 8.11) |
| `inventario_chiudi` | modifica | ✔ | | Chiude e registra le rettifiche (§ 8.11) |
| `inventario_annulla` | modifica | ✔ | | Annulla un inventario aperto senza rettifiche (§ 8.11) |

"Gestore ✔" = con `gestore: false` Op risponde `403` «Operazione riservata al responsabile del Food & Beverage.».

### 8.2 Oggetti ricorrenti

**Riferimento breve** (usato dentro altri oggetti):
```json
{ "id": 4, "nome": "Cucina" }
```

**Articolo** ("oggetto articolo"):
```json
{
  "id": 37,
  "codice": "ART-000037",
  "nome": "Farina 00",
  "id_categoria": 3,
  "categoria": "Farine e cereali",
  "unita": "kg",
  "codici_a_barre": [
    { "ean": "8001234567890", "quantita": 1,  "descrizione": "Pacco 1 kg" },
    { "ean": "8001234567906", "quantita": 10, "descrizione": "Cartone 10 pacchi" }
  ],
  "fornitori": [
    { "id_fornitore": 8, "nome": "Ingrosso Sud", "codice_fornitore": "FA00-1", "prezzo": 0.9500 }
  ],
  "scorta_minima": 5,
  "id_punto_predefinito": 1,
  "costo_medio": 0.9312,
  "giacenza_totale": 23.5,
  "sotto_scorta": false,
  "attivo": true,
  "note": null
}
```
- `codice`: codice interno, assegnato da Op alla creazione (non modificabile).
- `codici_a_barre[].quantita`: quante unità dell'articolo vale quel codice. Scansionare il cartone carica 10 kg.
- `fornitori[].codice_fornitore`: codice dell'articolo sul listino/DDT di quel fornitore (aiuta la lettura delle bolle);
  `prezzo`: ultimo prezzo unitario pagato (aggiornato da ogni carico), per unità dell'articolo.
- `id_punto_predefinito`: dove va la merce nei carichi, se la pagina non dice altro (`null` = il primo punto di tipo
  `magazzino` della struttura).
- `costo_medio`: costo medio ponderato per unità, ricalcolato a ogni carico con prezzo (sola lettura).
- `giacenza_totale`: somma di tutti i punti di tutte le strutture (sola lettura); `sotto_scorta`: `giacenza_totale <
  scorta_minima`.

### 8.3 `contesto`

`dati`: `{}`. Risposta:
```json
{
  "strutture": [ { "id": 1, "id_struttura_platform": 45, "nome": "Trattoria del Porto" } ],
  "punti": [
    { "id": 1, "id_struttura": 1, "nome": "Magazzino", "tipo": "magazzino", "attivo": true },
    { "id": 2, "id_struttura": 1, "nome": "Cucina",    "tipo": "cucina",    "attivo": true },
    { "id": 3, "id_struttura": 1, "nome": "Bar",       "tipo": "bar",       "attivo": true }
  ],
  "categorie": [ { "id": 3, "nome": "Farine e cereali" } ],
  "fornitori": [ { "id": 8, "nome": "Ingrosso Sud", "partita_iva": "01234567890" } ],
  "unita": [ { "key": "kg", "nome": "Chilogrammi" }, { "key": "l", "nome": "Litri" }, { "key": "pz", "nome": "Pezzi" } ],
  "motivi_scarto": [ { "key": "scaduto", "nome": "Scaduto" }, { "key": "deteriorato", "nome": "Deteriorato" },
                     { "key": "rotto", "nome": "Rotto o versato" }, { "key": "errore_preparazione", "nome": "Errore di preparazione" },
                     { "key": "altro", "nome": "Altro" } ],
  "bolla_attiva": true,
  "permessi": { "gestore": true }
}
```
- `id_struttura_platform`: l'id della struttura in Platform (dall'attivazione, § 3.4), per preselezionare la struttura
  corrente della pagina; `null` per le strutture create in Op senza corrispondenza.
- Op crea, per ogni struttura che non ne ha, i tre punti predefiniti **Magazzino**, **Cucina**, **Bar**.
- `bolla_attiva`: `false` se in Op la lettura delle bolle non è configurata: la pagina nasconde "Da bolla".
- `permessi.gestore`: quello passato dal Portal; la pagina lo usa solo per **mostrare o nascondere** i comandi (la verifica
  vera la fa Op).

### 8.4 `giacenze`

`dati`:
```json
{ "id_struttura": 1, "id_punto": null, "id_categoria": null, "cerca": "farina", "solo_sotto_scorta": false, "inattivi": false }
```
Tutti i filtri sono facoltativi tranne `id_struttura`. `cerca` cerca in nome, codice interno ed EAN. Risposta (articoli
in ordine di nome; un articolo compare anche con giacenza zero, se attivo):
```json
{
  "aggiornato_il": "2026-11-10T09:30:00+01:00",
  "righe": [
    {
      "id_articolo": 37, "nome": "Farina 00", "categoria": "Farine e cereali", "unita": "kg",
      "per_punto": [ { "id_punto": 1, "quantita": 20 }, { "id_punto": 2, "quantita": 3.5 } ],
      "totale": 23.5,
      "scorta_minima": 5,
      "sotto_scorta": false,
      "negativa": false,
      "costo_medio": 0.9312,
      "valore": 21.88,
      "ultimo_movimento": "2026-11-09T18:02:00+01:00"
    }
  ],
  "valore_totale": 4821.37
}
```
- `per_punto`: solo i punti della struttura; `totale` è la somma di questi (non di tutte le strutture).
- `negativa`: `true` se un punto è sotto zero. Può succedere solo con gli **scarichi automatici dalle comande** (§ 8.12), che
  non si bloccano mai: la pagina lo evidenzia e invita a fare un carico mancante o una rettifica.
- `valore` = `totale × costo_medio` (arrotondato a 2 decimali).

### 8.5 Articoli

### `articoli`
`dati`: `{ "cerca": null, "id_categoria": null, "inattivi": false, "pagina": 1, "per_pagina": 50 }`.
Risposta: `{ "totale": 128, "righe": [ <oggetto articolo>, … ] }` in ordine di nome.

### `articolo`
`dati`: `{ "id": 37, "id_struttura": 1 }`. Risposta: oggetto articolo con in più
```json
{ "giacenze": [ { "id_punto": 1, "quantita": 20 } ], "ultimi_movimenti": [ <riga del registro, § 8.7>, … ], "usato_in_ricette": [ { "id": 12, "nome": "Spaghetti alle vongole" } ] }
```
`ultimi_movimenti`: gli ultimi 20 della struttura. Inesistente → `404` `"title": "Articolo non trovato."`.

### `cerca_codice` — lettore di codici a barre
`dati`: `{ "codice": "8001234567906" }`. Cerca tra gli EAN e i codici interni. Risposta:
```json
{ "trovato": true, "articolo": <oggetto articolo>, "quantita": 10, "descrizione": "Cartone 10 pacchi" }
{ "trovato": false, "articolo": null, "quantita": 1, "descrizione": null }
```
`quantita` è il valore del codice letto (1 per il codice interno). Se non è trovato la pagina propone "Nuovo articolo" con
l'EAN già compilato.

### `salva_articolo`
`dati`:
```json
{
  "id": null,
  "id_operazione": "6f1c…",
  "nome": "Farina 00",
  "id_categoria": 3,
  "unita": "kg",
  "codici_a_barre": [ { "ean": "8001234567890", "quantita": 1, "descrizione": "Pacco 1 kg" } ],
  "fornitori": [ { "id_fornitore": 8, "codice_fornitore": "FA00-1" } ],
  "scorta_minima": 5,
  "id_punto_predefinito": null,
  "attivo": true,
  "note": null
}
```
- `id` `null` = nuovo (chiunque, con `id_operazione`); un numero = modifica (solo gestore).
- In modifica le liste `codici_a_barre` e `fornitori` **sostituiscono** quelle esistenti. Il `prezzo` dei fornitori non si
  manda: lo aggiorna Op dai carichi.
- **L'unità non si può cambiare** se l'articolo ha movimenti.
- Risposta: esito con `id` dell'articolo.
- `error_message` possibili: «Indica il nome dell'articolo.» · «Il nome può avere al massimo 120 caratteri.» · «Esiste già
  un articolo «Farina 00».» · «Unità di misura non valida.» · «Il codice a barre 8001234567890 è già di «Farina 0».» ·
  «Codice a barre non valido.» · «Quantità del codice a barre non valida.» · «Categoria non valida.» · «Fornitore non
  valido.» · «Scorta minima non valida.» · «L'articolo ha già dei movimenti: l'unità di misura non si può cambiare.» ·
  «Articolo non trovato.»

### `elimina_articolo`
`dati`: `{ "id": 37 }`. Errori: ««Farina 00» ha dei movimenti: non si può eliminare, ma puoi disattivarlo.» · ««Farina 00» è
in 3 ricette: toglilo prima dalle ricette.» · «Articolo non trovato.»

### 8.6 `registra` — tutti i movimenti

Un solo formato per tutti i tipi. `dati`:
```json
{
  "id_operazione": "1b9e…",
  "tipo": "carico",
  "id_struttura": 1,
  "id_punto": 1,
  "id_punto_destinazione": null,
  "data": "2026-11-10T09:12:00+01:00",
  "id_fornitore": 8,
  "documento": "DDT 1234 del 10/11/2026",
  "motivo": null,
  "note": null,
  "origine": "manuale",
  "righe": [
    { "id_articolo": 37, "quantita": 10, "prezzo_unitario": 0.95, "lotto": "L2311", "scadenza": "2027-05-31" },
    { "id_voce": null, "porzioni": null }
  ]
}
```

| `tipo` | Effetto sulla giacenza | Campi obbligatori | Note |
|---|---|---|---|
| `carico` | + in `id_punto` | `id_fornitore`, righe con `id_articolo` e `quantita` | `prezzo_unitario` facoltativo: se c'è, aggiorna costo medio e prezzo del fornitore. `documento`, `lotto`, `scadenza` facoltativi |
| `scarico` | − da `id_punto` | `motivo` libero (es. "Uso interno", "Pasto personale") | consumo manuale |
| `trasferimento` | − da `id_punto`, + in `id_punto_destinazione` | `id_punto_destinazione` (stessa struttura, diverso) | es. Magazzino → Cucina |
| `reso` | − da `id_punto` | `id_fornitore` | merce restituita al fornitore; `documento` facoltativo |
| `scarto` | − da `id_punto` | `motivo` = una key di `motivi_scarto` | spreco, merce scaduta o rotta |
| `vendita` | − dai punti delle ricette | righe con `id_voce` e `porzioni` (non `id_articolo`) | piatti venduti **fuori** dalle comande di Op (es. cassa esterna): Op li trasforma in righe di articoli con le ricette (§ 8.12). `id_punto` non si manda |
| `rettifica` | ± in `id_punto` | righe con `quantita` **con segno**, `motivo` | **solo gestore**; correzione puntuale fuori inventario |

Regole comuni:
- `data`: quando è avvenuto (predefinito: adesso); non nel futuro (tolleranza 5 minuti) e non più di **7 giorni** indietro.
- `righe`: da 1 a 200; `quantita` > 0 (tranne `rettifica`) con al massimo 3 decimali; lo stesso articolo può comparire una
  volta sola per movimento.
- **Mai sotto zero** per `scarico`, `trasferimento`, `reso`, `scarto` e `rettifica`: se una riga porterebbe la giacenza del
  punto sotto zero, **l'intero movimento** è rifiutato. `vendita` invece non si blocca mai (come le comande, § 8.12).
- Tutto o niente: o si registrano tutte le righe o nessuna.
- `origine` (facoltativa, per le statistiche): `manuale` · `codice_a_barre` · `bolla`. La pagina la imposta secondo il modo
  in cui l'utente ha inserito il movimento.
- Risposta: esito con `id` del movimento, `duplicato`, e `avvisi` per gli articoli finiti **sotto la scorta minima**.
- `error_message` possibili: «Tipo di movimento non valido.» · «Struttura non valida.» · «Punto di stoccaggio non valido.» ·
  «Scegli un punto di destinazione diverso da quello di partenza.» · «Indica il fornitore.» · «Indica il motivo dello
  scarto.» · «Aggiungi almeno un articolo.» · «Al massimo 200 righe per movimento.» · «Riga 3: quantità non valida.» ·
  «Riga 3: articolo non valido.» · ««Farina 00» compare due volte.» · «Giacenza insufficiente: Farina 00 ne ha 2,500 kg in
  Cucina.» · «La data non può essere nel futuro.» · «Si possono registrare movimenti fino a 7 giorni indietro.» ·
  ««Spaghetti alle vongole» non ha una ricetta: aggiungila per scaricare le vendite.» · «Prezzo non valido.» · «La data di
  scadenza non è valida.»

### 8.7 Registro dei movimenti

### `movimenti`
`dati`:
```json
{ "id_struttura": 1, "dal": "2026-11-01", "al": "2026-11-10", "tipo": null, "id_articolo": null, "id_punto": null,
  "origine": null, "automatici": true, "pagina": 1, "per_pagina": 50 }
```
- `dal`/`al` obbligatori, al massimo 366 giorni. `tipo` può essere anche un array (`["carico","reso"]`).
- `origine`: `manuale`, `codice_a_barre`, `bolla`, `comanda`, `inventario`.
- `automatici` (predefinito `true`): con `false` esclude gli scarichi automatici dalle comande (sono molti).

Risposta, dal più recente:
```json
{
  "totale": 312,
  "righe": [
    {
      "id": 812,
      "tipo": "carico",
      "origine": "bolla",
      "data": "2026-11-10T09:12:00+01:00",
      "registrato_il": "2026-11-10T09:13:05+01:00",
      "autore": "Mario Rossi",
      "punto": { "id": 1, "nome": "Magazzino" },
      "punto_destinazione": null,
      "fornitore": { "id": 8, "nome": "Ingrosso Sud" },
      "documento": "DDT 1234 del 10/11/2026",
      "motivo": null,
      "comanda": null,
      "annulla": null,
      "annullato_da": null,
      "righe_count": 12,
      "valore": 214.60,
      "anteprima": "Farina 00 10 kg, Pomodori pelati 24 pz e altri 10"
    }
  ]
}
```
- `comanda`: per gli scarichi automatici `{ "id": 551, "tavolo": "12", "voce": "Spaghetti alle vongole", "porzioni": 2 }`.
- `annulla`: id del movimento che questo storna; `annullato_da`: id dello storno che annulla questo.
- `valore`: somma di quantità × prezzo (carichi) o × costo medio del momento (uscite).
- `autore` degli scarichi automatici: chi ha fatto avanzare o chiuso la comanda.

### `movimento`
`dati`: `{ "id": 812 }`. Risposta: la riga del registro con `"righe"` complete:
```json
{ "righe": [ { "id_articolo": 37, "nome": "Farina 00", "unita": "kg", "quantita": 10, "prezzo_unitario": 0.95,
               "lotto": "L2311", "scadenza": "2027-05-31", "id_punto": 1, "giacenza_dopo": 20 } ] }
```
`quantita` è con segno (negativa per le uscite). Inesistente → `404` `"title": "Movimento non trovato."`.

### `annulla_movimento` (gestore)
`dati`: `{ "id": 812, "id_operazione": "c3d1…", "motivo": "Bolla registrata due volte" }`. Op registra un movimento
**opposto** (stesse righe, segno inverso) collegato all'originale; il registro non si cancella mai. Risposta: esito con
`id` dello storno. Errori: «Indica il motivo dell'annullamento.» · «Il movimento è già stato annullato.» · «Uno storno non si
annulla: registra un nuovo movimento.» · «Annullarlo porterebbe Farina 00 sotto zero in Cucina.» · «Gli scarichi delle
comande si correggono con una rettifica.» · «Movimento non trovato.»

### 8.8 `leggi_bolla` — carico da bolla con Claude

`dati`:
```json
{ "id_struttura": 1, "file": [ { "tipo": "image/jpeg", "dati": "<base64>" } ] }
```
- Da **1 a 3 file** (pagine del DDT): `image/jpeg`, `image/png` o `application/pdf`; ognuno al massimo **5 MB** dopo la
  decodifica. Op riconosce il tipo dai primi byte, non da `tipo`.
- **Niente viene registrato**: Op restituisce una proposta da controllare.

Risposta `200`:
```json
{
  "leggibile": true,
  "fornitore": {
    "nome": "Ingrosso Sud S.r.l.", "partita_iva": "01234567890", "codice_fiscale": null, "indirizzo": "Via Roma 1",
    "cap": "80100", "comune": "Napoli", "provincia": "NA", "telefono": null, "email": null, "pec": null,
    "id_fornitore": 8
  },
  "numero": "1234",
  "data": "2026-11-10",
  "documento": "DDT 1234 del 10/11/2026",
  "righe": [
    {
      "codice": "FA00-1", "ean": "8001234567906", "descrizione": "FARINA 00 KG 1 X 10",
      "quantita_letta": 2, "unita_letta": "CT", "lotto": "L2311", "scadenza": "2027-05-31", "prezzo_letto": 9.50,
      "id_articolo": 37,
      "quantita": 20,
      "prezzo_unitario": 0.95,
      "proposta": null
    },
    {
      "codice": null, "ean": null, "descrizione": "OLIO EVO LT 5", "quantita_letta": 4, "unita_letta": "PZ",
      "lotto": null, "scadenza": null, "prezzo_letto": 38.00,
      "id_articolo": null,
      "quantita": null,
      "prezzo_unitario": null,
      "proposta": { "nome": "Olio extravergine di oliva", "unita": "l", "quantita": 20, "categoria": "Oli e condimenti", "id_categoria": 5 }
    }
  ],
  "avvisi": [ "La seconda pagina è sfocata: controlla le quantità." ]
}
```
- `fornitore.id_fornitore`: fornitore dell'azienda abbinato (prima per partita IVA, poi per nome); `null` = da creare con
  `salva_fornitore` usando i dati letti.
- Abbinamento delle righe, in ordine: EAN tra i `codici_a_barre` → `codice` tra i `codice_fornitore` del fornitore abbinato
  → nome. `quantita` = `quantita_letta` × `quantita` del codice a barre (cartoni → unità); `prezzo_unitario` = prezzo per
  unità dell'articolo.
- Riga **non abbinata**: `id_articolo` `null` e `proposta` con nome, unità, quantità e categoria suggerite (`id_categoria`
  `null` se la categoria non esiste). L'utente sceglie un articolo esistente o lo crea con `salva_articolo` (e, se serve,
  `salva_categoria`).
- `leggibile: false`: non è un DDT o non si legge; `righe` vuoto e `avvisi` spiega il perché.
- Errori: `503` «La lettura delle bolle non è attiva su questo server.» · `400` «File non valido: servono immagini JPEG o PNG,
  oppure un PDF.» · `400` «File troppo pesante (massimo 5 MB).» · `400` «Al massimo 3 pagine per bolla.» · `422` «La foto non
  si può leggere: riprova con più luce e il foglio intero nell'inquadratura.»

**Dopo la conferma dell'utente** la pagina fa, in quest'ordine:
1. `salva_fornitore` se `id_fornitore` è `null` (con una sua `id_operazione`);
2. `salva_articolo` per ogni riga da creare (una `id_operazione` per riga);
3. **un solo** `registra` di tipo `carico`, con `origine: "bolla"`, `documento` della bolla e tutte le righe confermate.

Ogni passo si può ripetere con "Riprova" usando le stesse chiavi. Le chiavi vanno generate **una volta per bolla letta** e
tenute finché il carico non è registrato.

### 8.9 Anagrafiche

### `salva_categoria` / `elimina_categoria` (gestore)
`dati`: `{ "id": null, "id_operazione": "…", "nome": "Oli e condimenti" }` · `{ "id": 5 }`.
Errori: «Indica il nome della categoria.» · «Esiste già la categoria «Oli e condimenti».» · «La categoria ha 12 articoli:
spostali prima di eliminarla.»

### `salva_punto` / `elimina_punto` (gestore)
`dati`: `{ "id": null, "id_operazione": "…", "id_struttura": 1, "nome": "Cella frigo", "tipo": "magazzino", "attivo": true }` ·
`{ "id": 4 }`. Il `tipo` dice da dove scaricano le ricette (§ 8.12). Errori: «Indica il nome del punto.» · «Esiste già un
punto «Cella frigo» in questa struttura.» · «Tipo non valido.» · «Il punto ha ancora merce: trasferiscila prima di
eliminarlo o disattivarlo.» · «Il punto ha dei movimenti: non si può eliminare, ma puoi disattivarlo.» · «Serve almeno un
punto attivo di tipo cucina per scaricare le ricette.»

### `salva_fornitore`
`dati`:
```json
{ "id": null, "id_operazione": "…", "nome": "Ingrosso Sud S.r.l.", "partita_iva": "01234567890", "codice_fiscale": null,
  "indirizzo": "Via Roma 1", "cap": "80100", "comune": "Napoli", "provincia": "NA", "telefono": null, "email": null, "pec": null }
```
Nuovo: chiunque. Modifica: gestore. Se esiste già un fornitore con la stessa partita IVA o lo stesso nome (anche con un'altra
forma societaria), Op **non crea un doppione**: risponde `success: true` con l'`id` di quello esistente. Sono i fornitori
del magazzino della ristorazione dell'azienda (gli stessi nell'app e in Platform), distinti da quelli del magazzino
dell'hotel. Errori: «Indica il nome del fornitore.» · «Partita IVA non
valida.» · «Email non valida.»

### 8.10 Ricette

### `ricette`
`dati`: `{ "cerca": null, "id_categoria_menu": null, "senza_ricetta": false, "id_struttura": null }`. `id_struttura`
(facoltativo, predefinita la prima) serve solo per `articoli_mancanti`. Risposta: tutte le voci del menu F&B di Op,
raggruppate per categoria del menu:
```json
[
  {
    "id_categoria_menu": 2, "categoria_menu": "Primi",
    "voci": [
      { "id_voce": 14, "nome": "Spaghetti alle vongole", "prezzo": 16.00, "disponibile": true,
        "ricetta": true, "reparto": "cucina", "ingredienti": 5, "costo_porzione": 3.42, "food_cost": 21.4,
        "articoli_mancanti": 0 }
    ]
  }
]
```
- `food_cost` = `costo_porzione / prezzo × 100` (percentuale, 1 decimale; `null` se il prezzo è 0).
- `costo_porzione`: dai `costo_medio` attuali degli articoli.
- `articoli_mancanti`: ingredienti con giacenza zero o negativa nel punto di scarico (utile per segnare il piatto non
  disponibile).
- Le voci del menu si creano e si modificano dove si gestisce il menu F&B (app Op o, in futuro, Platform): qui solo la
  ricetta.

### `ricetta`
`dati`: `{ "id_voce": 14 }`. Risposta:
```json
{ "id_voce": 14, "nome": "Spaghetti alle vongole", "prezzo": 16.00, "reparto": "cucina",
  "ingredienti": [ { "id_articolo": 52, "nome": "Spaghetti", "unita": "kg", "quantita": 0.12, "costo": 0.22 },
                   { "id_articolo": 61, "nome": "Vongole veraci", "unita": "kg", "quantita": 0.25, "costo": 2.75 } ],
  "costo_porzione": 3.42, "food_cost": 21.4, "aggiornata_il": "2026-11-08T17:00:00+01:00", "aggiornata_da": "Mario Rossi" }
```
Voce senza ricetta: `200` con `"ingredienti": []` e `"reparto": null`. Voce inesistente → `404` `"title": "Voce del menu non
trovata."`.

### `salva_ricetta` / `elimina_ricetta` (gestore)
`dati`:
```json
{ "id_voce": 14, "reparto": "cucina", "ingredienti": [ { "id_articolo": 52, "quantita": 0.12 }, { "id_articolo": 61, "quantita": 0.25 } ] }
```
- `reparto`: `cucina` o `bar` → da quale tipo di punto scaricare (§ 8.12).
- Quantità **per una porzione**, nell'unità dell'articolo, > 0, al massimo 3 decimali; da 1 a 50 ingredienti, ognuno una
  volta.
- Una bevanda venduta così com'è (bottiglia d'acqua) è una ricetta con un solo ingrediente: `1 pz`.
- Le modifiche valgono **dagli scarichi successivi**: quelli già fatti non cambiano.
- Risposta: esito con `id` = `id_voce`. Errori: «Aggiungi almeno un ingrediente.» · «Riga 2: quantità non valida.» · «Riga 2:
  articolo non valido o disattivato.» · ««Spaghetti» compare due volte.» · «Reparto non valido: cucina o bar.» · «Voce del
  menu non trovata.»
- `elimina_ricetta` `{ "id_voce": 14 }`: la voce non scarica più nulla.

### 8.11 Inventario

Flusso: il gestore **apre** un inventario per un punto; chiunque **conta** (anche in più volte, da Platform o dall'app); il
gestore **chiude** e Op registra le differenze come movimenti `rettifica` con `origine: "inventario"`.

### `inventari`
`dati`: `{ "id_struttura": 1, "stato": null }`. Risposta, dal più recente:
```json
[ { "id": 9, "punto": { "id": 2, "nome": "Cucina" }, "stato": "aperto", "aperto_il": "2026-11-10T08:00:00+01:00",
    "aperto_da": "Mario Rossi", "chiuso_il": null, "chiuso_da": null, "articoli": 64, "contati": 40, "differenze": 7,
    "valore_differenze": -38.20, "id_movimento": null } ]
```
`stato`: `aperto`, `chiuso`, `annullato`. `id_movimento`: la rettifica registrata alla chiusura.

### `inventario`
`dati`: `{ "id": 9 }`. Risposta: l'elemento di `inventari` con
```json
{ "righe": [ { "id_articolo": 37, "nome": "Farina 00", "categoria": "Farine e cereali", "unita": "kg",
               "teorica": 3.5, "contata": 3.2, "differenza": -0.3, "valore_differenza": -0.28,
               "contata_da": "Anna Bianchi", "contata_il": "2026-11-10T08:40:00+01:00" } ] }
```
- Le righe sono gli articoli attivi con giacenza ≠ 0 nel punto **più** quelli aggiunti durante la conta.
- `teorica`: giacenza **attuale** del punto (si aggiorna con i movimenti fatti durante la conta); `contata` `null` = non
  ancora contata.

### `inventario_apri` (gestore)
`dati`: `{ "id_operazione": "…", "id_struttura": 1, "id_punto": 2 }`. Esito con `id` dell'inventario. Errore: «C'è già un
inventario aperto per Cucina.»

### `inventario_conta`
`dati`: `{ "id": 9, "righe": [ { "id_articolo": 37, "contata": 3.2 }, { "id_articolo": 90, "contata": 1 } ] }`.
Sovrascrive le quantità contate di quelle righe; un articolo non in elenco viene aggiunto. `contata: null` toglie il conteggio.
Esito con `id` dell'inventario. Errori: «L'inventario è chiuso.» · «Riga 2: quantità non valida (zero o più).»

### `inventario_chiudi` (gestore)
`dati`: `{ "id": 9, "non_contati": "ignora" }`. `non_contati`: `ignora` (le righe non contate restano come sono) oppure
`azzera` (si considerano contate a zero). Op registra **un** movimento `rettifica` con le differenze `contata − teorica`
calcolate **al momento della chiusura**. Esito con `id` del movimento (`null` se non ci sono differenze). Errori:
«L'inventario è già chiuso.» · «Nessun articolo contato.»

### `inventario_annulla` (gestore)
`dati`: `{ "id": 9 }`. Solo inventari aperti; nessuna rettifica.

### 8.13 "Fotografa col telefono" (bolla dal computer senza fotocamera)

Dal computer la pagina Ricevi merce › Da bolla può far fotografare la bolla al telefono di chi è lì: mostra un QR, il
telefono apre una pagina di Op, scatta fino a 3 foto e le invia; il computer le riceve e le usa come se fossero state
caricate.

### `bolla_telefono_apri`
`dati`: `{ "id_struttura": 1 }`. Risposta:
```json
{ "codice": "q3V0bG8tZGktcHJvdmE", "url": "https://api.sibyllaop.it/bolla-telefono/q3V0bG8tZGktcHJvdmE", "scade_il": "2026-11-10T11:15:00+01:00" }
```
- La pagina mostra `url` come **QR** (grande, con sotto "Inquadra il QR con la fotocamera del telefono") e il tempo che
  manca a `scade_il` (15 minuti). Allo scadere offre "Nuovo QR" (una nuova chiamata).
- `codice` è segreto (128 bit casuali): non va registrato nei log né mostrato come testo.

### `bolla_telefono_stato`
`dati`: `{ "codice": "q3V0bG8tZGktcHJvdmE" }`. La pagina lo chiama **ogni 2 secondi** finché il QR è visibile. Risposta:
```json
{ "stato": "attesa",   "scade_il": "…", "file": [] }
{ "stato": "inviata",  "scade_il": "…", "file": [ { "tipo": "image/jpeg", "dati": "<base64>" } ] }
{ "stato": "ritirata", "scade_il": "…", "file": [] }
{ "stato": "scaduta",  "scade_il": "…", "file": [] }
```
- `inviata`: le foto sono arrivate e vengono **consegnate solo in questa risposta** (poi Op le cancella e lo stato diventa
  `ritirata`). La pagina le aggiunge alle pagine della bolla (massimo 3), chiude il QR con un'animazione di conferma
  ("Foto arrivate dal telefono") e l'utente prosegue con "Leggi la bolla" (`leggi_bolla` con quei `file`).
- `scaduta`: il telefono non ha inviato in tempo. Codice di un'altra azienda o inesistente: `404` `"title": "Passaggio non
  trovato."`.

### Sul telefono (fa tutto Op, nessun lavoro in Platform)
Pagina `GET /bolla-telefono/{codice}`: nome della struttura, "Scatta la foto" (fotocamera posteriore) o "Scegli dalla
galleria", anteprime con "togli", "Invia al computer". Le foto si rimpiccioliscono sul telefono (lato lungo 2400 px, JPEG)
prima dell'invio. Una sola consegna per codice; QR scaduto o già usato: pagina "QR scaduto". Nessun accesso richiesto: il
codice è la chiave.

