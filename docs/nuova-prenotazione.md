# Pagina "Nuova prenotazione" — documentazione per lo sviluppatore

Specifica funzionale e tecnica della pagina **Nuova prenotazione**, pensata per lo
sviluppatore che deve **portarla / cablarla al backend**. Descrive struttura, campi,
stato, comportamenti, dipendenze e i punti da agganciare al BE.

- **Componente:** `src/modules/sales/booking/NuovaPrenotazione/NuovaPrenotazione.tsx` (+ `.sass`)
- **pageId / rotta:** `nuova-prenotazione` (`src/router/PageContent.tsx`)
- **Voce menu:** area Sales → Booking.

---

## 1. Scopo e modalità

Form per inserire (o modificare) una prenotazione. Due **tab** in cima:

| Tab | Scopo |
|---|---|
| **Individuale** | prenotazione singola (una o più camere, un cliente) |
| **Gruppo** | prenotazione di gruppo (allotment camere, capo gruppo, tipologia ospiti) |

La pagina opera in **3 modalità**, distinte a runtime tramite `bookingStore`:

| Modalità | Innesco | Effetto |
|---|---|---|
| **Nuova** | apertura diretta | form vuoto con default |
| **Modifica** | `bookingStore.editing` valorizzato (dal Tableau) | precompila i campi dalla prenotazione; titolo "Modifica Prenotazione N. {id}" |
| **Precompilata** | `bookingStore.prefill = {dal, al}` (selezione periodo dal Tableau) | imposta solo le date del soggiorno |

`bookingStore.editing`/`prefill` vengono **letti una sola volta** (in `useState` initializer) e azzerati con un `setTimeout(0)` per sopravvivere al doppio mount di React StrictMode.

---

## 2. Layout a card riordinabili (widget)

Il corpo è composto da **card** (`Widget`) organizzate in colonne, **trascinabili e collassabili**, con layout **persistito** via hook `useWidgetLayout`:

- Individuale → chiave persist `nuova-prenotazione.individuale.v2`, default `LAYOUT_IND`.
- Gruppo → chiave `nuova-prenotazione.gruppo.v2`, default `LAYOUT_GR`.

Sotto le colonne ci sono **2 card full-width** riordinabili verticalmente con drag&drop nativo (stato locale `fullOrder`, default `['ospiti','segmenti']`): **Anagrafica ospiti** e **Gestione segmenti**.

> Nota: cambiando l'ordine di default delle card, **bumpare la versione** nella chiave (`.v2` → `.v3`) per invalidare i layout salvati in localStorage.

---

## 3. Sezioni (card) e campi

### 3.1 Tab Individuale

| Card (id) | Campi |
|---|---|
| **Soggiorno** (`soggiorno`) | Date (range `dal`/`al`), Camere (num), Persone (num), + tabella camere: Tipologia (`TIPI_CAMERA`), Adulti, Ragazzi, Bambini, Infanti, N. Camera (`CAMERE`). Bottone "Aggiungi camera". |
| **Stato & classificazione** (`stato`) | Stato radio Confermata/Opzione (se Opzione → campo Scadenza), Arrangiamento (`ARRANGIAMENTI`), Credit (`CREDIT`), Segmento di mercato (radio **mutuamente esclusivo**: b2b/dirette/b2c/corporate) |
| **Agenzia & cliente** (`agenzia`) | Agenzia, Rif. esterno, Cliente, E-mail |
| **Anticipi** (`anticipi`) | Tipo (caparra/acconto), Metodo pagamento, Importo totale, "Ripartizione per camera" (toggle) → quote per camera + "Ripartisci in parti uguali" |
| **Extra inclusi** (`extra`) | Select servizio (da `useServiziStore`, solo attivi) → popup (Quando, Quantità, Intestatario, Camera, Importo, Descrizione) → lista extra aggiunti + totale servizi |
| **Altre informazioni** (`altre`) | Nazionalità (`NAZIONALITA`), Note prenotazione |
| **Note di reparto** (`note-reparto`) | Reparto (`REPARTI`), Nota |
| **Dettaglio prezzi** (`prezzi`) | Tabella: Giorno, Camera, Arrangiamento, Piani, Promozioni, Totale (sola lettura; l'edit avviene nella modale, §5) |

### 3.2 Tab Gruppo

| Card (id) | Campi |
|---|---|
| **Soggiorno gruppo** (`soggiorno-gr`) | Date, Camere, Persone, Tipologia ospiti (adulti/studenti), bottoni Alloca/Assegna, tab Hotel (`HOTELS`), tabella camere (Tipologia, Persone, N. Camera), "Aggiungi camera" |
| **Dati gruppo** (`dati-gr`) | Agenzia, Nome gruppo, Nome capo gruppo, E-mail capo gruppo |
| **Stato & opzioni** (`stato-gr`) | Confermata/Opzione (checkbox), Scadenza, Persone conf., Arrangiamento |
| **Anticipi / Extra / Altre info / Note reparto** | condivise con Individuale (stessi renderer) |

### 3.3 Card full-width (entrambi i tab)

- **Anagrafica ospiti** (`ospiti`): tabella Nome, Cognome, Data nascita, Paese, Sesso, N. Camera, Data arrivo; azioni riga (modifica/elimina); toolbar "Scarica Excel / Scarica PDF / Aggiungi ospite".
- **Gestione segmenti** (`segmenti`): suddivisione del soggiorno in intervalli di date; riga di sintesi + lista segmenti editabili (Date, Tipologia, Camera, Persone); "Aggiungi segmento" e "Segmento unico" (ricompatta tutto in un intervallo).

---

## 4. Strutture dati (interfacce)

```ts
SegmentoRow    { id, dal, al, tipo, nCamera, persone, stato }
CameraRow      { tipo, adulti, ragazzi, bambini, infanti, nCamera }   // individuale
CameraGruppoRow{ tipo, persone, nCamera }                              // gruppo
OspiteRow      { nome, cognome, dataNascita, paese, sesso, nCamera, dataArrivo }
ExtraAggiunto  { id, servizio, quando, quantita, intestatario, camera, importo, descrizione }
PrezzoRow      { giorno, camera, arrangiamento, piani, promozioni, totale, listino }
```

Gli oggetti `form` (individuale) e `grForm` (gruppo) raccolgono i campi scalari (date, camere, persone, stato, arrangiamento, segmento, agenzia/cliente, anticipi, note…). Vedi lo `useState` iniziale nel componente per la lista completa e i default.

---

## 5. Modale "Modifica importo globale"

Sovrascrive gli importi di **Dettaglio prezzi**:
- toggle "Applica modifica globale";
- modalità **Importo libero** (valore fisso su tutte le righe) o **Percentuale** (variazione dal `listino`);
- "Ripristina listino" riporta ogni riga a `listino`;
- edit **inline** per singola riga (con Invio/Esc);
- barra totale soggiorno.

---

## 6. Totali

```
totaleSoggiorno = Σ prezzi[].totale
totaleServizi   = Σ extra[].importo × quantità
totale          = totaleSoggiorno + totaleServizi
```

Mostrati nel footer (Soggiorno / Servizi / Totale).

---

## 7. Salvataggio, navigazione, export (comportamento attuale)

- **Salva e chiudi / Salva e prosegui** → `handleSalva()` scrive `bookingStore.pending` (oggetto prenotazione per il Tableau: id, nome, giorni/mese/anno, colore per stato, camere, persone, importo) e naviga a `tableau-book`. **Non c'è ancora persistenza backend.**
- **Annulla** → torna a `tableau-book`.
- **Scarica PDF** (toolbar) → `scaricaPdfPrenotazione` genera un riepilogo con `jspdf` (import dinamico).
- **Anagrafica ospiti**: "Scarica Excel" (blob HTML `.xls`) e "Scarica PDF" (jsPDF) della rooming list.

---

## 8. Dipendenze interne

| Dipendenza | Uso |
|---|---|
| `core/bookingStore` | `editing` (modifica), `prefill` (periodo dal Tableau), `pending` (output verso Tableau) |
| `store/useServiziStore` | elenco servizi selezionabili come Extra (filtrati `attivo`) |
| `operation/planner/planner.data` (`PIANI_DATA`) | deriva la lista camere `CAMERE` |
| `core/hooks/useWidgetLayout` | layout drag&drop + collapse persistito |
| `core/components/Widget` | card con header, collapse, drag |
| `core/utils/countryFlags` (`withFlag`) | bandiere nazionalità |
| `core/components/form/*`, `Tabs`, `Modal`, `ToggleSwitch`, `FormActions`, `Button` | UI |
| `jspdf` (dinamico) | export PDF |

---

## 9. Dati mock / costanti da sostituire in fase di porting

Attualmente **hardcoded** nel file (da alimentare dal BE quando disponibile):

- `TIPI_CAMERA`, `TIPOLOGIE_CAMERA`, `ARRANGIAMENTI`, `CREDIT`, `REPARTI`, `HOTELS`, `NAZIONALITA`.
- `CAMERE` — derivate da `PIANI_DATA` del planner (mock).
- `prezzi` iniziali e `segmenti` iniziali — dati di esempio hardcoded.
- Camere di gruppo iniziali (`initGr` ×4), ospiti iniziali (4 righe vuote).

---

## 10. Cosa cablare al backend (task di porting)

Seguire il pattern **fallback-first** e i service tipati descritti in `INTEGRATION.md`
(`apiFetchSibylla` verso i controller di dominio). Endpoint da individuare/creare:

1. **Lookup**: tipologie camera, camere disponibili per struttura/periodo, arrangiamenti, credit, reparti, nazionalità, hotel del gruppo.
2. **Servizi/Extra**: già disponibili via `useServiziStore` → verificare la sorgente reale (o service `servizi`).
3. **Calcolo prezzi**: `PrezzoRow[]` per giorno/camera/arrangiamento con `listino` (dal motore tariffe / piani tariffari — vedi `pianitariffari.service.ts`).
4. **Disponibilità**: validare camere/date (overbooking, stop-sales).
5. **Salvataggio prenotazione**: `handleSalva` deve chiamare un endpoint (es. `booking/AddPrenotazioneSibylla`, vedi `booking.service.ts`) con il payload completo (soggiorno, camere, ospiti, segmenti, extra, anticipi, prezzi, stato/opzione+scadenza). In modifica → update per `editId`.
6. **Caricamento in modifica**: sostituire `bookingStore.editing` con un fetch della prenotazione per id (o mantenere lo store come veicolo di navigazione e caricare i dettagli dal BE).
7. **Anticipi/segmenti/ospiti**: persistenza delle rispettive collezioni.

Suggerimento: creare `src/services/booking.service.ts` (o estenderlo) con funzioni tipate `getLookupPrenotazione()`, `calcolaPrezzi(...)`, `salvaPrenotazione(payload)`, `getPrenotazione(id)`, mappando i DTO ai modelli C#.

---

## 11. Regole di business da preservare

- **Segmento di mercato**: selezione **singola** (radio) — impostare uno azzera gli altri.
- **Opzione**: se lo stato è "Opzione", compare il campo **Scadenza** (obbligatorio per il BE).
- **Ripartizione anticipi**: il toggle/azione ripartisce l'importo totale in parti uguali fra le camere; le quote sono comunque editabili manualmente.
- **Colore prenotazione** verso il Tableau: confermata = verde, altrimenti error (individuale) / blu (gruppo).
- **Segmento unico**: comprime i segmenti nell'intervallo min(dal)–max(al).

---

## 12. Note su standard UI

Le tabelle dense (camere, ospiti, segmenti, prezzi) usano `<select>/<input>` grezzi con classe `.sib-input` **per densità**, deroga consapevole alla regola "usa sempre i componenti condivisi" (che resta valida per i form fuori tabella, dove infatti si usano `InputField/SelectField/DateRangeField/…`). Mantenere questa distinzione in fase di porting.

---

*Documento basato sull'analisi diretta del componente. Aggiornare quando la pagina
viene cablata al backend (endpoint, DTO, validazioni).*
