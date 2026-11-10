# Portal · Magazzino della Ristorazione: l'azione `OpApp/magazzinoFb/Esegui`

> **Come usare questo documento.** È la scheda per gli sviluppatori (o l'agente AI) del **Portal**
> (`SibyllaApi` + `SibyllaApiProxy`, .NET). È **autosufficiente**: non serve il codice di Op né quello del frontend.
> Riprende la Parte A della scheda 17 di sibylla-op (`docs/integrazione-sibylla/17-magazzino-ristorazione.md`), che resta
> il contratto di riferimento, e aggiunge quello che serve per realizzarla nel Portal: le azioni da ammettere, la
> dimensione delle risposte, cosa si aspettano le pagine e i punti del Portal da toccare.
> Ultimo aggiornamento: **10 novembre 2026**.

---

## Stato (10 novembre 2026)

| Cosa | Stato |
|---|---|
| Op.Api: `POST /integrazione/platform/magazzino-ristorazione`, attivazione e disattivazione, tutte le azioni | ✅ in produzione su `https://api.sibyllaop.it` |
| Pagine Ristorazione › Magazzino di Sibylla Platform | ✅ in produzione (`sibylla-platform.vercel.app`) |
| **Portal: `POST OpApp/magazzinoFb/Esegui`** | 🆕 **da realizzare: è questa scheda** |
| **Portal: avviso a Op all'attivazione e disattivazione del modulo Ristorazione** | 🆕 **da realizzare: § 7** |

**Perché serve adesso.** Le pagine del Magazzino funzionano già sulle aziende demo di Op. Le aziende vere, collegate a
Platform, passano dal Portal: oggi vedono "Magazzino di Op non raggiungibile". Appena l'azione esiste, funzionano senza
toccare il frontend.

---

## 1. Il compito, in una frase

Aggiungere al Portal **una sola azione**, `POST OpApp/magazzinoFb/Esegui`. L'azione:
1. riceve `{ azione, dati }` dalle pagine del Magazzino;
2. controlla il permesso dell'utente;
3. aggiunge azienda, nome dell'utente e livello (gestore sì/no) **presi dal token**;
4. **firma** il corpo con HMAC-SHA256 e lo **inoltra** a Op.Api;
5. restituisce alla pagina la risposta di Op secondo il § 6.

Non contiene logica di dominio e non salva dati nel database di Sibylla. A questo si aggiunge la chiamata di
**attivazione** a Op quando un'azienda attiva il modulo Ristorazione (§ 7).

## 2. Quello che c'è già nel Portal (verificato sul codice)

Riferimento: il branch `feature/op-app-servizi-personale` (azioni `OpApp/*` dell'app Op).

| Cosa | Dove | Come usarlo |
|---|---|---|
| Azioni dell'app Op autenticate, utente e azienda dal token | `SibyllaApi/Controllers/OpAppController.cs` (`[Authorize]`, rotte `opapp/...`, helper `Io()` con `GetCurrentUserId` / `GetCurrentIdAzienda`) | Mettere qui `opapp/magazzinoFb/Esegui`: azienda e utente si leggono allo stesso modo. |
| Ruoli dell'utente | `BaseController.GetCurrentUserRoles` (claim `"Ruolo"`) | Base per `gestore` (§ 4.4): **da confermare quale ruolo** indica amministratore o responsabile F&B. |
| Inoltro dal Proxy | `SibyllaApiProxy/Controllers/OpAppController.cs`, metodo `Inoltra<T>` | ⚠️ **Non adatto così com'è**: deserializza la risposta in un tipo e trasforma gli errori in "Richiesta non riuscita.". Questa azione deve far passare il JSON **senza toccarlo**, con lo stato e il `detail` del § 6. |
| Client HTTP di "Sibylla OP" | `SibyllaApi/Services/APIClients/SibyllaOPApi.cs`, `ConnectionString:SibyllaOP` = `https://op.sibylla.cloud` | ⚠️ **Non è Op.Api.** Op.Api è `https://api.sibyllaop.it`: serve una configurazione separata (§ 5). Non riusare quell'URL. |
| Firma HMAC verso Op (`X-Op-Firma`) | **non trovata** nel codice guardato | Se BI (`OpApp/bi/Get`) o Piano ferie (`OpApp/pianiFerie/Esegui`) l'hanno già in un altro branch, riusarla; altrimenti crearla una volta sola come servizio condiviso (§ 4.5). |

**Indirizzo chiamato dalle pagine.** Il frontend chiama `POST {Proxy}/Sibylla/OpApp/magazzinoFb/Esegui` con il token
dell'utente (helper `apiFetchSibylla`, che antepone `/Sibylla/` per l'inoltro verso SibyllaApi). Va verificato che questo
percorso arrivi all'azione: inoltro generico `/Sibylla/{**path}` o un'azione esplicita nel Proxy che passi il corpo
**senza deserializzarlo**.

## 3. Regole da rispettare sempre

1. **Non inventare.** Se manca qualcosa che questa scheda dà per esistente (permesso della pagina, ruolo del
   responsabile F&B, configurazione segreta), **chiederlo allo sviluppatore**, non supporlo.
2. **Sicurezza:**
   - azienda, utente e `gestore` vengono **dal token**, **mai** dal corpo della pagina, anche se la pagina li mandasse;
   - nessun dettaglio tecnico (eccezioni, stack, URL, chiavi) nelle risposte;
   - la chiave condivisa sta **solo** nella configurazione segreta: mai in repository, log, risposte o frontend;
   - **non loggare i corpi**, né della richiesta né della risposta. Contengono foto di documenti (`leggi_bolla`,
     `bolla_telefono_stato`) e codici segreti (`bolla_telefono_*`).
3. **Database di Sibylla:** non va toccato. Niente tabelle, niente copie di articoli o movimenti.
4. **Anthropic:** il Portal non lo chiama. La bolla la legge Op, con la sua chiave.

## 4. L'azione `POST OpApp/magazzinoFb/Esegui`

### 4.1 Richiesta dalla pagina

| Campo | Tipo | Note |
|---|---|---|
| `azione` | string, obbligatorio | Una delle azioni del § 4.2, senza distinzione tra maiuscole e minuscole. |
| `dati` | object, facoltativo | Parametri dell'azione. Il Portal **non li legge**: li inoltra uguali. Mancanti o non oggetto → `{}`. |

### 4.2 Azioni ammesse (elenco chiuso)

```
contesto, giacenze, articoli, articolo, cerca_codice, salva_articolo, elimina_articolo,
salva_categoria, elimina_categoria, salva_punto, elimina_punto, salva_fornitore,
registra, movimenti, movimento, annulla_movimento,
leggi_bolla, bolla_telefono_apri, bolla_telefono_stato,
ricette, ricetta, salva_ricetta, elimina_ricetta,
inventari, inventario, inventario_apri, inventario_conta, inventario_chiudi, inventario_annulla
```

Ogni altro valore → `400 { "detail": "Azione non valida." }`, senza chiamare Op. Quando la scheda 17 aggiunge un'azione,
nel suo storico (§ 12) la colonna "Portal" dice di aggiungerla qui.

### 4.3 Passi, in quest'ordine

1. **Autenticazione**: come le altre azioni (`401` senza token valido).
2. **Permesso**: l'utente deve poter aprire **Ristorazione › Magazzino** della sua azienda. Altrimenti `403` e nessuna
   chiamata a Op. *Quale permesso o modulo lo indica nel Portal: da chiedere.*
3. **Validazione** di `azione` (§ 4.2).
4. **Corpo per Op**, serializzato **una sola volta** in UTF-8:
   ```json
   { "id_azienda": 123, "azione": "giacenze", "autore": "Mario Rossi", "gestore": true, "dati": { } }
   ```
5. **Firma** (§ 4.5) e `POST {OpPlatform:BaseUrl}/integrazione/platform/magazzino-ristorazione`, con
   `Content-Type: application/json; charset=utf-8` e header `X-Op-Firma`.
6. **Risposta** alla pagina secondo il § 6.

### 4.4 I campi presi dal token

| Campo | Origine |
|---|---|
| `id_azienda` (int) | azienda **di Platform** dell'utente (`GetCurrentIdAzienda`) |
| `azione` (string) | quella ricevuta, **in minuscolo** |
| `autore` (string) | nome e cognome dell'utente, al massimo 100 caratteri: Op lo scrive su ogni movimento |
| `gestore` (bool) | `true` se l'utente è **amministratore dell'azienda** o **responsabile del Food & Beverage**. Op rifiuta le azioni riservate (rettifica, annulla, anagrafiche, ricette, apri/chiudi inventario) quando è `false`. *Quale valore del claim `Ruolo` (o altro) corrisponde: da chiedere.* |
| `dati` (object) | quello della pagina, invariato |

### 4.5 Firma `X-Op-Firma` (la stessa di BI e Piano ferie)

```
X-Op-Firma: t=<secondi Unix>,v1=<hex minuscolo di HMAC-SHA256(chiave, t + "." + corpo)>
```

- Il `corpo` sono **esattamente i byte inviati**: serializzare una volta, firmare quella stringa, inviare quella stringa.
- Op accetta **5 minuti** di scarto sull'orologio: il server deve essere sincronizzato (NTP).
- Conviene un **servizio condiviso**, per esempio `OpPlatformClient`, con firma, invio e lettura dello stato. Lo
  useranno anche BI, Piano ferie e attivazione.
- **Vettore di prova** (test unitario):
  - chiave `chiave-di-esempio-per-i-test-non-usare-in-produzione`;
  - t `1730540000`;
  - corpo `{"id_azienda":123,"azione":"elenco","autore":"Mario Rossi","dati":{}}`;
  - firma attesa `48ac490057e856e77db72e7431f7340d7ca1f64843480783c9a660bff9cf1a93`.

### 4.6 Tempi e dimensioni

| Azione | Timeout verso Op | Corpo della richiesta | Corpo della risposta |
|---|---|---|---|
| `leggi_bolla` | **90 s** (l'AI legge le foto) | fino a **30 MB** (3 foto da 5 MB in base64) | piccolo |
| `bolla_telefono_stato` | 15 s | piccolo | fino a **~25 MB** quando arrivano le foto dal telefono (stato `inviata`, 3 foto in base64) |
| tutte le altre | 15 s | limite normale | piccolo |

I limiti vanno alzati **solo per questa azione**: request body limit sul Proxy e su SibyllaApi, e limiti di buffer del
client HTTP sulla risposta. Le pagine chiamano `bolla_telefono_stato` **ogni 2 secondi** mentre il QR è aperto: non
mettere limiti di frequenza che lo blocchino.

## 5. Configurazione

| Chiave (nome indicativo, seguire le convenzioni del Portal) | Valore |
|---|---|
| `OpPlatform:BaseUrl` | `https://api.sibyllaop.it` (sviluppo `http://localhost:5235`). **Diverso** da `ConnectionString:SibyllaOP`. |
| `OpPlatform:Chiave` | **la stessa chiave** di BI e Piano ferie, solo nella configurazione segreta (Key Vault o variabili dell'App Service). |

Chiave o URL mancanti: `503 { "detail": "Magazzino di Op non configurato." }` e log di errore, senza chiamare Op.

## 6. Risposte: cosa restituire alla pagina

Le pagine leggono **solo** questi formati, quindi vanno rispettati alla lettera.

| Op risponde | Il Portal restituisce |
|---|---|
| `200` + JSON (anche `{"success":false,"error_message":"…"}`) | `200` con **lo stesso corpo, byte per byte** |
| `403` con `detail` "Operazione riservata al responsabile del Food & Beverage." | `403 { "detail": <stesso testo> }` |
| `404` con `detail` che inizia per "Nessuna azienda di Op collegata" | se il modulo Ristorazione è attivo: **attivazione e una nuova prova** (§ 7.3); altrimenti, o se fallisce ancora, `404 { "collegata": false }` |
| `404` con `title` (es. "Articolo non trovato.", "Passaggio non trovato.") | `404 { "detail": <title> }` |
| `400`, `422`, `503` con `detail` (`422` e `503` solo da `leggi_bolla`) | stesso stato, `{ "detail": <stesso testo> }` |
| `401` (firma mancante, errata o scaduta) | `502 { "detail": "Op non raggiungibile." }` + log di errore |
| `404` **senza corpo** (in Op manca la chiave) | `502` come sopra + log di errore |
| timeout, errore di rete, altro | `502` (o `503`) `{ "detail": "Op non raggiungibile." }` + log |

Cosa ne fa la pagina:
- `200` → mostra i dati, o l'`error_message` così com'è;
- `404 { "collegata": false }` → riquadro "Il magazzino della ristorazione non è attivo per la tua azienda…";
- ogni altro errore → mostra `detail` con "Riprova".

Per questo il `detail` dev'essere sempre un testo per l'utente, in italiano: **mai** il "Not Found" o il "Bad Request"
generici di ASP.NET.

## 7. Attivazione automatica del collegamento con Op

Un'azienda che attiva il modulo **Ristorazione** deve trovare il Magazzino pronto, senza che un tecnico la colleghi a
mano a Op.

### 7.1 All'attivazione del modulo

Nel punto del Portal dove si **salva** l'attivazione del modulo (Sibylla-admin, Configuratore, contratto…), non nel
frontend: `POST {OpPlatform:BaseUrl}/integrazione/platform/attivazione`, firmato come il § 4.5, timeout 15 s.

```json
{
  "id_azienda": 123,
  "modulo": "ristorazione",
  "azienda": { "nome": "Trattoria del Porto S.r.l.", "partita_iva": "01234567890", "email": "info@trattoriadelporto.it" },
  "strutture": [ { "id": 45, "nome": "Trattoria del Porto", "tipo": "outlet", "indirizzo": "Via del Porto 3, Napoli" } ],
  "autore": "Mario Rossi"
}
```

- `strutture`: le strutture o gli outlet che usano la Ristorazione, con **id di Platform**, `tipo` (`outlet` senza
  camere, `ricettiva` = hotel) e indirizzo facoltativo. Almeno una.
- `autore`: chi attiva il modulo, oppure `"Sistema"` se l'attivazione è automatica.

Op è **idempotente**:
- se l'azienda è già collegata, riattiva il magazzino e aggiorna le strutture;
- altrimenti crea l'azienda in Op, la collega e crea i punti Magazzino, Cucina e Bar.

Risposta `200 { "success": true, "id_azienda_op": …, "creata": true, "strutture": [ { "id": 45, "id_struttura_op": 1 } ] }`.
Con `success: false` o errore di rete: solo log di errore, **l'attivazione in Platform non si annulla** e nessun messaggio
all'utente. Rimedia il recupero del § 7.3.

### 7.2 Alla disattivazione del modulo

`POST {OpPlatform:BaseUrl}/integrazione/platform/disattivazione`, firmato, con corpo
`{ "id_azienda": 123, "modulo": "ristorazione", "autore": "Mario Rossi" }`. Op sospende il magazzino: i dati restano e una
nuova attivazione li ritrova.

### 7.3 Recupero al primo accesso

Se `Esegui` riceve da Op il `404` "Nessuna azienda di Op collegata…" **e il modulo Ristorazione è attivo** per
l'azienda:
1. il Portal chiama `attivazione` con i dati dell'azienda;
2. ripete **una sola volta** la richiesta originale;
3. se anche così non riesce, restituisce `404 { "collegata": false }`. Niente cicli.

Copre le aziende che avevano già il modulo e le attivazioni fallite.

## 8. Casi di prova (con un `HttpMessageHandler` finto al posto di Op)

| # | Situazione | Atteso |
|---|---|---|
| 1 | Utente senza permesso Ristorazione › Magazzino | `403`, nessuna chiamata a Op |
| 2 | `azione` = `"svuota"` | `400 { "detail": "Azione non valida." }`, nessuna chiamata |
| 3 | `azione` = `"Giacenze"`, `dati` assente, utente responsabile F&B | a Op: `{"id_azienda":<token>,"azione":"giacenze","autore":"<nome>","gestore":true,"dati":{}}` con firma valida |
| 4 | Utente operatore | a Op arriva `"gestore":false` |
| 5 | La pagina mette `id_azienda: 999` o `gestore: true` nel corpo o in `dati` | a Op arrivano i valori del token; `dati` inoltrato invariato |
| 6 | Op `200 {"success":false,"error_message":"…","id":null}` | `200` con lo stesso corpo, byte per byte |
| 7 | Op `404` "Nessuna azienda di Op collegata…", modulo **non** attivo | `404 { "collegata": false }`, nessuna attivazione |
| 7b | Come 7, modulo attivo; `attivazione` ok; seconda prova `200` | `200`; a Op 3 chiamate (azione, attivazione, azione) |
| 7c | Come 7b, ma la seconda prova risponde ancora `404` | `404 { "collegata": false }`, una sola nuova prova |
| 8 | Op `403` con `detail` | `403` con lo stesso `detail` |
| 9 | `leggi_bolla` con 3 foto da 5 MB, Op risponde in 40 s | accettata (~20 MB), nessun timeout, `200` inoltrato |
| 10 | `bolla_telefono_stato` con risposta `inviata` da ~20 MB | `200` inoltrato intero, senza troncamenti |
| 11 | Op `401` | `502 { "detail": "Op non raggiungibile." }` + log |
| 12 | Chiave non configurata | `503 { "detail": "Magazzino di Op non configurato." }`, nessuna chiamata |
| 13 | Firma | il vettore del § 4.5 produce l'header atteso |
| 14 | Attivazione del modulo Ristorazione | una chiamata firmata ad `attivazione` con ragione sociale, strutture (id di Platform) e autore |
| 15 | Attivazione con Op non raggiungibile | modulo attivo in Platform, log di errore, nessun errore all'utente |
| 16 | Disattivazione del modulo | una chiamata firmata a `disattivazione` |
| 17 | Log | nei log non compaiono corpi, foto, codici `bolla_telefono` né la chiave |

**Criteri di accettazione:**
- l'azione è raggiungibile da `POST /Sibylla/OpApp/magazzinoFb/Esegui` con il token dell'utente;
- permesso controllato prima di chiamare Op;
- `id_azienda`, `autore` e `gestore` vengono dal token;
- firma sui byte esatti;
- timeout e limiti del § 4.6;
- risposte del § 6;
- attivazione, disattivazione e recupero del § 7;
- i 17 casi coperti da test automatici.

## 9. Da chiedere allo sviluppatore prima di iniziare

1. Quale permesso o modulo del Portal significa "può aprire Ristorazione › Magazzino".
2. Come si riconosce dal token l'**amministratore dell'azienda** e il **responsabile F&B** (`gestore`): quale valore del
   claim `Ruolo`, o altro.
3. Da quale claim si leggono **nome e cognome** dell'utente (`autore`).
4. Se BI o Piano ferie hanno già, in un altro branch, la firma `X-Op-Firma` e la configurazione della chiave: in quel caso
   si riusano.
5. Se il percorso `/Sibylla/{**path}` del Proxy inoltra già a SibyllaApi senza deserializzare, o se serve un'azione
   esplicita nel Proxy.
6. In quale punto si salva l'attivazione e la disattivazione dei moduli per un'azienda (§ 7).

## 10. Fuori da questa scheda

- **Lettura di un fornitore completo.** Nel contratto di Op manca un'azione che restituisca tutti i dati di un fornitore
  (indirizzo, contatti). Senza, le pagine non possono modificare un fornitore senza cancellare i dati che non conoscono:
  oggi i fornitori si creano ma non si modificano. Va aggiunta alla scheda 17 (lato Op). Per il Portal cambierà solo
  l'elenco del § 4.2.
