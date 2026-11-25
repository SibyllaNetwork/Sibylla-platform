# Portal · Cashflow con i dati di Business Central

> **Come usare questo documento.** È la scheda per gli sviluppatori (o l'agente AI) del **Portal**
> (`SibyllaApi` + `SibyllaApiProxy`, .NET). Descrive cosa serve alla pagina **Finance › Controllo di gestione ›
> Cashflow** perché lavori sui dati veri: conti bancari, incassi e pagamenti presi da **Business Central** (BC), e le
> date di pagamento pianificate nella pagina riportate in BC.
> Ultimo aggiornamento: **25 novembre 2026**.
>
> Il modello dati della pagina è in `src/modules/finance/Cashflow/cfData.ts` (oggi generato a scopo dimostrativo):
> i JSON di questa scheda hanno **gli stessi campi**, così il frontend cambia solo la sorgente dei dati.

---

## 0. La pagina in breve

La pagina è **operativa e predittiva**: dice quanta liquidità c'è oggi, quanta il sistema prevedeva, quali incassi
arriveranno e quando conviene far uscire i pagamenti.

| Box | Cosa mostra | Dati che servono |
|---|---|---|
| 1. **Liquidità effettiva** | saldo di oggi su tutti i conti bancari collegati; al clic il dettaglio per banca e l'andamento a 30 giorni | conti bancari e saldi giornalieri (§ 2.1) |
| 2. **Termometro delle aspettative** | liquidità prevista per oggi vs liquidità reale, con gli scostamenti che spiegano la differenza | previsioni salvate ogni giorno + movimenti reali (§ 2.4) |
| 3. **Stima degli incassi** | incassi attesi da ogni cliente, con la data stimata in base alle sue abitudini di pagamento; **Sollecita** per chi è in ritardo | partite aperte dei clienti + statistiche di pagamento (§ 2.2) |
| 4. **Pianificazione uscite** | scadenzario dei pagamenti; per ognuno si sceglie la data di uscita fra oggi e la scadenza | partite aperte dei fornitori + scrittura della data pianificata in BC (§ 2.3, § 3) |

Sotto i box: grafico della liquidità (reale e stimata degli ultimi 30 giorni, prevista per i prossimi 60) e i prossimi
movimenti. Li calcola la pagina dai dati dei §§ 2.1–2.3.

```
Business Central ──(API)──► Portal ──► /Sibylla/finance/cashflow/* ──► pagina Cashflow
        ▲                                                               │
        └──── pagamenti pianificati (giornale pagamenti) ◄──────────────┘ (Pianifica)
Portal ──► Centro notifiche del partner su Platform  (Sollecita)
```

## Stato (25 novembre 2026)

| Cosa | Stato |
|---|---|
| Pagina Cashflow con i 4 box e le modali | ✅ in produzione sulla demo, con dati dimostrativi (`cfData.ts`) |
| Piano dei pagamenti e solleciti | ✅ nel browser (`useCashflowStore`, localStorage) |
| **Endpoint del Portal (§ 2) e collegamento a BC** | 🆕 da realizzare (questa scheda) |
| Scrittura delle date pianificate in BC (§ 3) | 🆕 da realizzare; **da validare con chi amministra BC** |

---

## 1. Da dove vengono i dati in Business Central

Nomi delle tabelle standard di BC (in inglese, come nel prodotto). L'accesso si fa con le **API di Business Central**
(API standard v2.0 dove l'entità esiste, altrimenti una **pagina API personalizzata** pubblicata sulle tabelle sotto):
la scelta va fatta con chi amministra l'ambiente BC.

| Serve per | Tabella BC | Campi usati |
|---|---|---|
| Conti e saldi | `Bank Account` | `No.`, `Name`, `IBAN`, `Bank Account No.`, `Currency Code`, saldo (`Balance` / `Balance at Date` con filtro data) |
| Andamento dei saldi (30 gg) | `Bank Account Ledger Entry` | `Bank Account No.`, `Posting Date`, `Amount (LCY)` |
| Incassi attesi | `Cust. Ledger Entry` (aperte: `Open = true`) | `Entry No.`, `Customer No.`, `Customer Name`, `Document Type`, `Document No.`, `Description`, `Due Date`, `Remaining Amt. (LCY)` |
| Statistiche di pagamento dei clienti | `Cust. Ledger Entry` chiuse degli ultimi 12 mesi + `Detailed Cust. Ledg. Entry` (applicazioni) | data di scadenza vs data di chiusura (`Closed at Date`) → puntualità e ritardo medio |
| Pagamenti da fare | `Vendor Ledger Entry` (aperte) | `Entry No.`, `Vendor No.`, `Vendor Name`, `Document No.`, `External Document No.`, `Document Date`, `Due Date`, `Remaining Amt. (LCY)` |
| Categoria del pagamento | `Vendor` → `Vendor Posting Group` / `Gen. Bus. Posting Group` | per distinguere fornitori, utenze, lavori, personale, fisco, finanziamenti (§ 2.3) |

> Gli importi in BC hanno il segno contabile (le partite fornitore aperte sono **negative**). Le API del Portal li
> restituiscono **positivi**, come la pagina si aspetta.

---

## 2. Endpoint del Portal

Tutti `POST`, autenticati (`[Authorize]`), sul Proxy come `/Sibylla/finance/cashflow/<azione>`. Corpo comune:

```json
{ "struttura": "Hotel Noto", "data": "2026-11-25" }
```

`struttura` = struttura scelta nella pagina (il Portal la risolve nella società/dimensione BC corrispondente);
`data` = oggi (la pagina la manda per evitare differenze di fuso). Date in formato `AAAA-MM-GG`, importi in euro.

### 2.1 `Conti`

```json
{
  "conti": [
    { "id": "ISP", "banca": "Intesa Sanpaolo", "sigla": "ISP", "iban": "IT•• •••• •••• 2541", "saldo": 1001300,
      "storico": [ 1180000, 1176500, "… 30 valori, l'ultimo è oggi" ] }
  ],
  "liquidita": 2552000,
  "aggiornatoAl": "2026-11-25T08:15:00Z"
}
```

- `iban`: **mascherato** dal Portal (solo le ultime 4 cifre in chiaro).
- `storico`: saldo di fine giornata degli ultimi 30 giorni (dai movimenti del conto).
- `liquidita` = somma dei saldi.

### 2.2 `Incassi`

```json
{
  "incassi": [
    { "id": "CLE-48211", "cliente": "Stop in Italy", "tipo": "Tour operator", "descrizione": "Saldo allotment",
      "scadenza": "2026-11-10", "stimata": "2026-11-16", "importo": 68600, "ricorrenza": "mensile",
      "puntualita": 0.78, "ritardoMedio": 6, "stato": "in-ritardo" }
  ]
}
```

| Campo | Regola |
|---|---|
| `id` | `Entry No.` della partita cliente |
| `tipo` | dal gruppo del cliente: `Tour operator`, `OTA`, `Agenzia`, `Corporate` (mappatura da concordare) |
| `scadenza` | `Due Date` |
| `ritardoMedio` | media dei giorni fra scadenza e incasso sulle partite chiuse del cliente negli ultimi 12 mesi (0 se paga in anticipo o puntuale) |
| `puntualita` | quota delle partite chiuse entro la scadenza negli ultimi 12 mesi (0–1) |
| `stimata` | `scadenza + ritardoMedio` |
| `ricorrenza` | `mensile` / `quindicinale`, dedotta dalla frequenza delle fatture (solo testo informativo) |
| `stato` | `in-ritardo` se `stimata` è passata e la partita è ancora aperta; altrimenti `atteso` |

Si restituiscono le partite aperte con `stimata` fino a **oggi + 60 giorni** e tutte quelle in ritardo.

### 2.3 `Uscite`

```json
{
  "uscite": [
    { "id": "VLE-30981", "fornitore": "Celestino Forniture", "categoria": "Fornitori",
      "descrizione": "Generi alimentari ristorante", "fattura": "FT 867/2026",
      "ricevuta": "2026-10-31", "scadenza": "2026-11-30", "importo": 19900, "spostabile": true,
      "pianificata": "2026-11-26" }
  ]
}
```

| Campo | Regola |
|---|---|
| `id` | `Entry No.` della partita fornitore |
| `categoria` | `Fornitori`, `Utenze`, `Manutenzione`, `Lavori`, `Personale`, `Fiscale`, `Finanziamenti` (mappatura dal gruppo del fornitore) |
| `fattura` | `External Document No.` (numero del fornitore), altrimenti `Document No.` |
| `ricevuta` | `Document Date` |
| `scadenza` | `Due Date` |
| `spostabile` | `false` per `Personale`, `Fiscale`, `Finanziamenti` (stipendi, F24, rate: data obbligata); `true` per gli altri |
| `pianificata` | data di pagamento già pianificata (§ 3), assente se non pianificata |

Partite aperte con scadenza fino a **oggi + 60 giorni**. Le partite **scadute e non pagate** si restituiscono con
`scadenza` nel passato: la pagina le mostra come da pagare subito.

### 2.4 `Termometro`

```json
{
  "attesa": 2701200,
  "scostamenti": [
    { "id": "s-1", "tipo": "uscita-imprevista", "descrizione": "Riparazione urgente impianto idraulico", "data": "2026-11-22", "effetto": -52200 },
    { "id": "s-2", "tipo": "incasso-mancato", "descrizione": "Stop in Italy: saldo allotment non incassato", "data": "2026-11-16", "effetto": -68600 }
  ],
  "storico": [ { "data": "2026-10-27", "reale": 3180000, "stimata": 3180000 } ]
}
```

Per confrontare "quanto pensavamo" con "quanto c'è" il Portal deve **salvare ogni giorno la previsione**:

1. ogni notte calcola la liquidità prevista per i prossimi 60 giorni (stessa formula della pagina: saldo di oggi +
   incassi alla data `stimata` − uscite alla data `pianificata` o alla scadenza) e la salva con le voci che la
   compongono (tabella indicativa `finance.CashflowPrevisione`: `Struttura`, `CalcolataIl`, `Data`, `SaldoPrevisto`, e
   `finance.CashflowPrevisioneVoce`: `Tipo`, `Riferimento` (Entry No.), `Data`, `Importo`);
2. `attesa` = saldo previsto **per oggi** nella previsione calcolata **30 giorni fa** (parametro
   `Cashflow:GiorniConfronto`, default 30);
3. `scostamenti` = differenze fra le voci di quella previsione e i movimenti reali da allora:
   - `incasso-mancato`: incasso previsto non arrivato (effetto negativo);
   - `incasso-extra`: incasso arrivato e non previsto (positivo);
   - `uscita-imprevista`: uscita non presente nella previsione (negativo);
   - `uscita-anticipata`: uscita prevista dopo oggi ma già pagata (negativo);
   - la somma degli `effetto` = liquidità reale − `attesa` (eventuali arrotondamenti in una voce `Altro`);
4. `storico`: per gli ultimi 30 giorni, saldo reale e saldo che la previsione di riferimento indicava per quel giorno.

Livelli del termometro (li calcola la pagina, `livelloTermometro` in `cfData.ts`), scarto = (reale − attesa) / attesa:
entro ±2% **In linea**; sopra +2% **Sopra le attese**; fino a −5% **Buono**; fino a −10% **Sufficiente**; fino a −20%
**Mediocre**; oltre **Scarso**.

### 2.5 `Sollecita`

```json
{ "struttura": "Hotel Noto", "incassoId": "CLE-48211" }
```

- Se il cliente è un'azienda che usa Sibylla Platform (es. un tour operator partner), il Portal crea per lui una
  notifica nel suo Centro notifiche: «Pagamento atteso da Hotel Noto: 68.600 € scaduto il 10/11/2026».
- In ogni caso registra il sollecito (chi, quando, partita) e lo restituisce: `{ "inviatoIl": "2026-11-25T13:10:00Z" }`.
- Più solleciti sulla stessa partita sono ammessi (la pagina mostra «Di nuovo»); al massimo **uno al giorno** per
  partita, altrimenti `429 { "detail": "Sollecito già inviato oggi." }`.

### Errori comuni

| Status | Quando | `detail` |
|---|---|---|
| `400` | struttura sconosciuta, data non valida | «Struttura non trovata.» · «Data non valida.» |
| `502` | BC non raggiungibile o errore delle API | «Business Central non raggiungibile: riprova fra poco.» |
| `503` | collegamento a BC non configurato per l'azienda | «Business Central non è collegato per questa azienda.» |

Con `502`/`503` la pagina continuerà a mostrare un avviso; i dati dimostrativi si usano solo nella demo.

---

## 3. Pianifica: le date di pagamento in Business Central

```json
{ "struttura": "Hotel Noto", "pianificazioni": [ { "uscitaId": "VLE-30981", "data": "2026-11-26" }, { "uscitaId": "VLE-30990", "data": null } ] }
```

`data: null` = riportare alla scadenza (togliere la pianificazione). Regole: `data` fra oggi e la `Due Date`; partite
non `spostabile` → `400 { "detail": "Questo pagamento ha una data obbligata." }`.

**Come registrarle in BC** (proposta, **da validare con chi amministra BC**). Due strade, in ordine di preferenza:

1. **Giornale pagamenti dedicato** (consigliata, non modifica le partite registrate): per ogni pianificazione il Portal
   crea o aggiorna una riga in un batch dedicato del `Payment Journal` (es. batch `SIBYLLA-CF`) con `Posting Date` =
   data pianificata, `Account Type` = Vendor, `Account No.`, `Applies-to Doc. Type` = Invoice, `Applies-to Doc. No.` =
   la fattura, `Amount` = importo residuo. La contabilità esporta e registra i pagamenti da lì come oggi.
   `data: null` → la riga si elimina.
2. **Data di pagamento sulla partita**: se in BC si usa un campo dedicato (es. un campo personalizzato «Data pagamento
   pianificata» su `Vendor Ledger Entry`) si scrive lì. **Non** cambiare la `Due Date` contrattuale.

Risposta: `{ "uscite": [ … ] }` aggiornate (§ 2.3). Il frontend oggi salva il piano in `useCashflowStore`: quando
l'endpoint esiste, `pianifica` / `applicaPiano` / `ripristina` chiameranno `Pianifica` e lo store diventerà una cache.

---

## 4. Configurazione

| Impostazione | Contenuto |
|---|---|
| `BusinessCentral__*` | credenziali e ambiente BC (tenant, ambiente, società): **solo** in Key Vault / impostazioni dell'App Service |
| `Cashflow__GiorniConfronto` | giorni fra la previsione di riferimento e oggi per il termometro (default `30`) |
| `Cashflow__Orizzonte` | giorni della previsione (default `60`) |
| `Cashflow__BatchGiornale` | nome del batch del giornale pagamenti (default `SIBYLLA-CF`) |

Mappature da concordare e mettere in configurazione (o in una tabella): struttura → società/dimensione BC; gruppo
cliente → `tipo` (§ 2.2); gruppo fornitore → `categoria` (§ 2.3).

---

## 5. Test di accettazione

- `Conti`: la somma dei saldi coincide con il totale dei conti bancari in BC alla data; IBAN mascherati.
- `Incassi`: una partita cliente aperta con `Due Date` passata da più del ritardo medio del cliente → `in-ritardo`;
  un cliente che negli ultimi 12 mesi ha pagato sempre 5 giorni dopo → `ritardoMedio = 5`, `stimata = scadenza + 5`.
- `Uscite`: stipendi, F24 e rate → `spostabile: false`; importi positivi.
- `Pianifica`: data fuori intervallo → `400`; data valida → riga nel batch del giornale pagamenti; `null` → riga
  eliminata; una seconda chiamata con la stessa data non crea doppioni.
- `Termometro`: la somma degli `effetto` = liquidità reale − `attesa`.
- `Sollecita`: notifica creata per il partner su Platform; secondo sollecito nello stesso giorno → `429`.

## 6. File da creare nel Portal (nomi indicativi)

| Progetto | File | Contenuto |
|---|---|---|
| SibyllaApi | `Controllers/CashflowController.cs` | `POST finance/cashflow/{Conti,Incassi,Uscite,Termometro,Pianifica,Sollecita}` |
| SibyllaApi | `Services/BusinessCentralCashflow.cs` | lettura di conti, partite e statistiche da BC; scrittura del giornale pagamenti |
| SibyllaApi | `Jobs/PrevisioneCassaNotturna.cs` | calcolo e salvataggio della previsione giornaliera (§ 2.4) |
| Infrastructure | `DbUp/Scripts/…_Cashflow.sql` | tabelle `finance.CashflowPrevisione`, `finance.CashflowPrevisioneVoce`, `finance.CashflowSollecito` |
| Test | `Sibylla.Test/Cashflow/*` | i casi del § 5 con un client BC finto |
