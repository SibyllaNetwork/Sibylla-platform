# 02 · Configurazione HR

> Scheda di riproduzione della pagina **Human Resources › Configurazione** (`hr-configurazione`) e delle sue sette schede: Reparti, Orari di lavoro, Turnistica, Contratti collettivi (con la scheda interna «Tipologie di contratto»), Aziende in appalto, Collaboratori esterni, Integrazione paghe.
>
> Riferimento: `sibylla-platform`, commit `5e895d1` (5 novembre 2026). I componenti condivisi (PageHead, InputField, SelectField, ToggleSwitch, RadioGroup, DatePickerField, TextareaField, CheckboxField, SearchField, Tooltip, TruncatedText, Modal, ConfirmDialog, Toast, Tabs, classi `.sib-btn`, `.sib-table`) sono descritti in `00-fondamenta.md`; le entità e le regole trasversali in `01-modello-dati-e-api.md`. Qui si descrive tutto ciò che è specifico di questa pagina.
>
> La scheda è divisa in due parti:
> - **Parte A**: la pagina come contenitore (shell a schede, kit comune dei pannelli, bozza e barra delle modifiche non salvate), con le 13 sezioni dello schema;
> - **Parte B**: una sezione completa per ciascuna scheda, nell'ordine in cui compaiono, ognuna con le 13 sezioni dello schema.
>
> Convenzione dei colori: alla prima occorrenza si indica il token e il valore esadecimale del tema chiaro (`classic`, il default). `alpha(X, a)` indica il colore `color-mix(in srgb, X a·100%, transparent)`: per esempio `alpha(--color-success, .12)` = `color-mix(in srgb, var(--color-success) 12%, transparent)`.

---

# PARTE A — La pagina «Configurazione HR»

## A.1 Scopo e utenti

La pagina raccoglie in un unico posto i **dati di inquadramento** del personale e i collegamenti esterni dell'ufficio del personale:

- **Reparti**: l'organigramma operativo, con codice, responsabile, centro di costo, colore e reparto dell'App Op! collegato;
- **Orari di lavoro**: gli orari contrattuali (full time e part time) giorno per giorno, oppure il monte ore per chi lavora a turni;
- **Turnistica**: i turni di servizio e gli schemi di rotazione;
- **Contratti collettivi**: i CCNL applicati con livelli, minimi, ferie, permessi, maturazione, retribuzione, enti e fondi, più le tipologie di contratto (comuni a tutti i CCNL);
- **Aziende in appalto**: le imprese esterne (anagrafica condivisa con i fornitori di Purchasing), con contratto, DURC, sicurezza, fisco, privacy e i loro collaboratori;
- **Collaboratori esterni**: le categorie degli addetti delle ditte in appalto e il badge di riconoscimento;
- **Integrazione paghe**: il collegamento con il software paghe (6 software), i codici voce, i codici dipendente e le regole d'invio del consuntivo.

Questi dati sono la **fonte unica** letta dalle altre pagine HR:

- **Crea anagrafica personale** legge le opzioni di reparto, orario, schema di turni, tipologia di contratto, CCNL e livello, e da lì propone spettanze e RAL minima;
- **Archivio del personale** mostra il reparto e l'inquadramento;
- **Registro presenze › Trasmetti consuntivo** usa il software paghe «in uso».

**Utenti**: l'ufficio del personale (responsabile o addetto HR) della struttura. Non è una pagina per i dipendenti, che usano l'App Op!.

## A.2 Accesso

| Voce | Valore |
| --- | --- |
| Id pagina | `hr-configurazione` |
| Deep link | `hr-configurazione:<id-scheda>` oppure `hr-configurazione:<id-scheda>:<scheda-interna>`. Id validi, nell'ordine delle schede: `hr-reparti`, `hr-orari`, `hr-turnistica`, `hr-ccnl`, `hr-aziende-appalto`, `hr-collaboratori-esterni`, `hr-integrazione-paghe`. Alias: `hr-tipologie-contratto` = `hr-ccnl:tipologie` |
| Sidenav | Impresa › **Human Resources** › **Configurazione**: prima voce del gruppo, icona `fa-sliders`, colore del gruppo `#9B59B6`. La stessa voce c'è anche nei menu dedicati Tour Operator e Ristoranti |
| Breadcrumb | Nessuno dentro la pagina. In questa modalità la shell non usa `CfgPane`, quindi non c'è il «trail» del Configuratore |
| Titolo (PageHead) | «Configurazione HR» |
| Sottotitolo | «Reparti, orari, turnistica, contratti, collaboratori esterni e integrazione con il software paghe» (uguale in `pageSubtitles.ts`) |

**Come si risolve la route.** `page === 'hr-configurazione'` oppure `page.startsWith('hr-configurazione:')` monta il Configuratore ristretto al gruppo `risorse-umane`.

- L'id dopo i due punti diventa la scheda iniziale. Il componente è montato con `key={page}`: cambiare deep link rimonta la pagina.
- Se l'id non è valido o non appartiene al gruppo, si apre la **prima** scheda (Reparti).
- **Scheda interna.** Il segmento dopo un secondo «:» sceglie la scheda interna del pannello, se il pannello ne ha (oggi solo Contratti collettivi: `generale`, `tipologie`, `livelli`, `ferie`, `retribuzione`, `enti`). Un valore sconosciuto si ignora e si apre la scheda interna di default. La scheda interna vale solo all'ingresso: cambiando scheda e tornando, il pannello riparte da «Generale».
- **Alias `hr-tipologie-contratto`.** Le tipologie di contratto non sono più una voce autonoma ma una scheda interna di Contratti collettivi: il deep link `hr-configurazione:hr-tipologie-contratto` apre **Contratti collettivi** direttamente sulla scheda interna **«Tipologie di contratto»** (equivale a `hr-configurazione:hr-ccnl:tipologie`).
- Cliccare una scheda **non cambia** l'id di pagina: la scheda attiva è stato locale.

**Da dove si arriva:**

| Pagina di partenza | Link |
| --- | --- |
| Registro presenze (azione «Configura» della trasmissione al software paghe) | `hr-configurazione:hr-integrazione-paghe` |
| Crea collaboratore esterno / Modifica collaboratore esterno (apri l'azienda) | `hr-configurazione:hr-aziende-appalto` |
| Crea anagrafica personale, link «Configuralo in Human Resources › Configurazione» | `hr-configurazione:hr-ccnl` |
| Crea anagrafica personale, pulsante ghost piccolo | `hr-configurazione` |

**Dove si va:**

| Da | Verso |
| --- | --- |
| Aziende in appalto, «Lista fornitori (Purchasing)» | `lista-fornitori` |
| Aziende in appalto, «Nuovo collaboratore» | `nuovo-collaboratore-esterno:<idAzienda>` |
| Aziende in appalto, matita del collaboratore | `modifica-collaboratore-esterno:<idCollaboratore>` |

**Visibilità.** Le schede non sono filtrate per moduli o profilo: l'accesso lo dà già la voce di menu. Tema di sezione: la pagina è «Platform» (`--color-primary` blu `#204769`). Con il profilo Tour Operator tutta l'app diventa verde `#206953`: vedi `00-fondamenta.md`.

## A.3 Layout

```
.configuratore  (flex column · gap 12px · padding 0 · width 100% · container "configuratore")
┌──────────────────────────────────────────────────────────────────────────────┐
│ PageHead   [‹ Indietro]          Configurazione HR                           │
│                Reparti, orari, turnistica, contratti, collaboratori…         │
├──────────────────────────────────────────────────────────────────────────────┤
│ .cfg-sezione  (flex column · gap 12px · min-width 0 · container "cfg-sezione")│
│ ┌ nav.cfg-sezione__tabs (flex · wrap · gap 2px · border-bottom 1px) ───────┐ │
│ │ ⊞ Reparti │ ◷ Orari di lavoro │ ⟳ Turnistica │ ▤ Contratti collettivi │…│ │
│ │ ▔▔▔▔▔▔▔▔▔ (2px primary sotto la scheda attiva)                            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│  p.cfg-sezione__desc — descrizione della voce attiva (12.5px)                │
│ ┌ .cfg-sezione__body (flex column · min-width 0 · key = scheda) ───────────┐ │
│ │   contenuto del pannello (Parte B)                                       │ │
│ │                                                                          │ │
│ │ ┌ CfgSaveBar (sticky bottom 0, solo con modifiche) ───────────────────┐  │ │
│ │ │ ● 3 modifiche non salvate                     [Annulla] [Salva]     │  │ │
│ │ └─────────────────────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **PageHead**: componente condiviso con il pulsante Indietro a sinistra, il titolo centrato e nessuna azione a destra (vedi `00-fondamenta.md`). Tra PageHead e `.cfg-sezione` c'è il gap di 12px del contenitore.
- **Barra delle schede** (`nav.cfg-sezione__tabs`): `display:flex; flex-wrap:wrap; gap:2px; border-bottom:1px solid var(--color-border)` (`#CFD4DA`).
- **Descrizione** (`p.cfg-sezione__desc`): una riga sotto le schede. È la descrizione del registry, con le sigle del glossario (CCNL, ROL, RAL, QR, IVA, CNEL…) sottolineate a puntini e spiegate dal tooltip: è `withAcronimi`, in `00-fondamenta.md`.
- **Corpo** (`.cfg-sezione__body`): ospita il pannello. A ogni cambio scheda il corpo si rimonta e riparte l'animazione d'ingresso.
- **Niente hub, niente sidebar e niente card**: la modalità «di sezione» del Configuratore non mostra né la home a corsie né la sidebar dei gruppi né la cornice `CfgPane`. Non c'è nemmeno lo skeleton di transizione (lo stato `entering` resta interno ma non si vede). La palette ⌘K non è montata, anche se la scorciatoia ⌘K/Ctrl+K continua a intercettare il tasto (`preventDefault`) senza effetti visibili.

## A.4 Elementi e testi

### Schede (nell'ordine)

| # | Id | Etichetta | Icona | Descrizione mostrata sotto le schede |
| --- | --- | --- | --- | --- |
| 1 | `hr-reparti` | «Reparti» | `fa-light fa-sitemap` | «Reparti della struttura con codice, responsabile, centro di costo e reparto App Op! collegato.» |
| 2 | `hr-orari` | «Orari di lavoro» | `fa-light fa-business-time` | «Orari contrattuali: full time e part time, fasce giornaliere, pause e monte ore settimanale.» |
| 3 | `hr-turnistica` | «Turnistica» | `fa-light fa-arrows-rotate` | «Turni di servizio (mattina, pomeriggio, notte, spezzato) e schemi di rotazione con i riposi.» |
| 4 | `hr-ccnl` | «Contratti collettivi» | `fa-light fa-file-contract` | «CCNL applicati con tipologie di contratto, livelli e minimi, ferie e permessi annui, maturazione, maggiorazioni, enti e fondi.» |
| 5 | `hr-aziende-appalto` | «Aziende in appalto» | `fa-light fa-building-user` | «Imprese esterne (fornitori di Purchasing) con i dati identificativi, il contratto d’appalto, il DURC e i collaboratori che lavorano per loro.» |
| 6 | `hr-collaboratori-esterni` | «Collaboratori esterni» | `fa-light fa-user-helmet-safety` | «Categorie degli addetti di ditte in appalto (reparti App Op!, documenti, durata dell’autorizzazione) e badge di riconoscimento.» |
| 7 | `hr-integrazione-paghe` | «Integrazione paghe» | `fa-light fa-money-check-dollar` | «Collegamento con il software paghe (Zucchetti, TeamSystem, Inaz, Sistemi, Ranocchi, ADP): canale, credenziali, tracciato, codici voce e invio del consuntivo.» |

Gli apostrofi tipografici (’) sono parte del testo: vanno riprodotti così.

Ogni voce del registry ha anche delle **parole chiave**, che oggi servono solo alla palette ⌘K del Configuratore classico, assente in questa pagina. Si riportano per completezza:

- Reparti: `reparti, organigramma, centro di costo, responsabile, front office, housekeeping, cucina`;
- Orari: `orario, full time, part time, orizzontale, verticale, ore settimanali, pausa, flessibilità`;
- Turnistica: `turni, rotazione, ciclo continuo, notte, spezzato, riposo, 6+1, 5+2`;
- Contratti collettivi: `ccnl, tipologie di contratto, tempo indeterminato, determinato, stagionale, apprendistato, intermittente, unilav, livelli, ferie, permessi, rol, ex festività, maturazione, ratei, scatti, minimi tabellari, mensilità`;
- Aziende in appalto: `appalto, imprese esterne, ditte, fornitori, partita iva, durc, inail, inps, subappalto, badge`;
- Collaboratori esterni: `esterni, appalto, fornitori, pulizie, manutentori, facchini, durc, duvri, app op, autorizzazione`;
- Integrazione paghe: `paghe, cedolini, consuntivo, zucchetti, teamsystem, inaz, job, sistemi, ranocchi, adp, consulente del lavoro, tracciato, sftp, api`.

### Indicatore di stato sulla scheda

Dopo l'etichetta, **solo se** lo stato della voce è diverso da `configured`, compare il badge di stato compatto (`CfgBadge compact`): un pallino o un'icona, senza testo.

| Stato | Indicatore | Colore | aria-label |
| --- | --- | --- | --- |
| `partial` | pallino 7×7px | `--color-warning` `#F57D03` | «Da completare» |
| `empty` | pallino 7×7px | `--color-text-inactive` `#6E7175` | «Da configurare» |
| `locked` | `fa-solid fa-lock` 9px | `--color-text-disabled` `#A9AAAD` | «Bloccato» |
| `soon` | `fa-solid fa-hourglass-half` 9px | `--color-primary-600` `#58738b` | «In arrivo» |

Nel gruppo HR non ci sono prerequisiti né voci «in arrivo»: in pratica compaiono solo `partial` ed `empty`. Le regole di completamento di ogni scheda sono in Parte B.

### Barra delle modifiche non salvate (CfgSaveBar)

- Testo: «1 modifica non salvata» oppure «N modifiche non salvate».
- Pulsanti: «Annulla» (`sib-btn sib-btn--ghost`, colore testo `--color-text-inactive`) e «Salva» (`sib-btn sib-btn--primary`).
- Toast di successo: il messaggio è specifico della scheda (vedi la tabella in A.5) ed è **senza titolo**.
- Toast d'errore: «Salvataggio non riuscito. Riprova.». Oggi non può comparire, perché il salvataggio mock non fallisce mai.

### Modale di abbandono (modifiche pendenti)

Compare in due casi, con lo stesso titolo e gli stessi pulsanti; cambia solo la parola «voce» o «pagina» del messaggio.

| Elemento | Cambio scheda | Uscita dalla pagina |
| --- | --- | --- |
| Titolo | «Modifiche non salvate» | «Modifiche non salvate» |
| Messaggio con 1 modifica | «C'è 1 modifica non salvata: uscendo da questa voce andrà persa.» | «C'è 1 modifica non salvata: uscendo da questa pagina andrà persa.» |
| Messaggio con N modifiche | «Ci sono N modifiche non salvate: uscendo da questa voce andranno perse.» | «Ci sono N modifiche non salvate: uscendo da questa pagina andranno perse.» |
| Pulsanti | «Resta» (annulla) e «Abbandona» (conferma, variante danger) | uguali |

## A.5 Stati e interazioni

### Stato iniziale

- Senza deep link è attiva **Reparti**, con deep link valido la scheda indicata.
- Ogni pannello parte dai dati **salvati** (store) e ne fa una **bozza** locale.

### Cambio scheda

1. Clic su una scheda.
2. Se è già quella attiva, non succede nulla.
3. Se `dirtyCount > 0`, si apre la ConfirmDialog «Modifiche non salvate».
   - «Resta»: si rimane sulla scheda e la bozza è intatta.
   - «Abbandona»: il contatore delle modifiche si azzera, si cambia scheda e la bozza è persa, perché il pannello si smonta.
4. Senza modifiche pendenti il cambio è immediato.

### Uscita dalla pagina

Vale per ogni navigazione della piattaforma: voce della sidenav, «Indietro» del PageHead, schede della barra delle pagine (modalità a schede), preferiti, link interni dei pannelli (per esempio «Nuovo collaboratore», «Lista fornitori (Purchasing)»).

1. Se `dirtyCount = 0` la navigazione è immediata.
2. Se si naviga verso la **stessa** pagina già aperta (stesso id, deep link compreso) non succede nulla e non si chiede conferma: la pagina non si smonta.
3. Altrimenti la navigazione si blocca e si apre la ConfirmDialog «Modifiche non salvate» con il messaggio «… uscendo da questa pagina …».
   - «Resta»: si rimane sulla pagina, la bozza e la barra sono intatte.
   - «Abbandona»: il contatore si azzera e la navigazione riprende esattamente com'era stata chiesta (verso la pagina scelta, oppure all'indietro nella cronologia con «Indietro»). La bozza è persa.

**Come funziona.** La shell del Configuratore registra un guard nello store `useNavGuard` (`src/store/useNavGuard.ts`) finché è montata, e lo toglie allo smontaggio. Il guard ha la firma `(paginaDestinazione, proceed) => boolean`: `navigate` e `goBack` della piattaforma (`src/sibylla_dashboard.tsx`) lo interrogano prima di cambiare pagina; se restituisce `false` la pagina mostra la conferma e, se l'utente conferma, chiama `proceed()`, che completa la navigazione senza interrogare di nuovo il guard. Il guard è unico per la shell, quindi la stessa conferma vale anche per il Configuratore di Impostazioni (`configuratore`, `configuratore:<id>`) e per il pannello App Op!. Le pagine senza guard navigano come prima. Il cambio di profilo e la chiusura o il ricaricamento del browser non passano dal guard.

### Modello «bozza → Salva» (hook `useHrDraft`, comune a tutte le schede)

1. `draft` parte come copia di `saved`, i dati dello store.
2. Ogni modifica, anche quelle confermate dentro una modale (per esempio «Crea reparto»), cambia **solo la bozza**.
3. Contatore: `dirty = count(saved, draft)`. A ogni variazione viene pubblicato nello store del Configuratore (`markDirty(paneId, dirty)`): da lì lo leggono la barra e la guardia di abbandono.
4. Conteggio standard per gli elenchi con `id` (`diffCount`): +1 per ogni elemento della bozza assente in `saved` o con contenuto diverso (confronto `JSON.stringify`), +1 per ogni elemento di `saved` assente nella bozza. Quindi aggiungere, modificare o eliminare un elemento vale 1 ciascuno; modificare due volte lo stesso elemento vale sempre 1.
5. **Salva**:
   - simula una chiamata di **300 ms**, poi scrive la bozza nello store (`commit`) e azzera il contatore;
   - subito dopo la **bozza si riallinea ai dati salvati**: lo store (o il `commit` del pannello) può normalizzarli, per esempio Orari di lavoro toglie gli spazi al nome, scarta le fasce non valide e ricalcola il monte ore. Senza il riallineamento la barra ricomparirebbe con modifiche fantasma; con il riallineamento, dopo un salvataggio riuscito la barra resta nascosta finché l'utente non modifica di nuovo qualcosa. Vale per tutte le schede;
   - se i dati salvati cambiano per altre ragioni (un'altra pagina scrive lo stesso store) e la bozza non ha modifiche, la bozza si allinea; se ha modifiche, resta com'è;
   - durante l'attesa il pulsante «Salva» mostra lo spinner (`sib-btn--loading`: testo trasparente, spinner bianco 14px) e i due pulsanti sono disabilitati;
   - al termine compare il toast di successo e la barra sparisce.
6. **Annulla**: la bozza torna uguale ai dati salvati, subito, **senza conferma**, e il contatore si azzera.
7. **Completamento**: a ogni montaggio del pannello e a ogni salvataggio, lo stato della voce (`configured | partial | empty`) si ricalcola dai dati **salvati** con la regola della scheda e si scrive nello store del Configuratore. È ciò che accende il pallino sulla scheda. Una scheda mai aperta mostra lo stato del seed, che per tutte e sette è `configured`.

**Toast di successo per scheda:**

| Scheda | Toast |
| --- | --- |
| Reparti | «Reparti salvati» |
| Orari di lavoro | «Orari di lavoro salvati» |
| Turnistica | «Turnistica salvata» |
| Contratti collettivi (e tipologie) | «Contratti collettivi salvati» |
| Aziende in appalto | «Aziende in appalto salvate (anche in Purchasing)» |
| Collaboratori esterni | «Collaboratori esterni salvati» |
| Integrazione paghe | «Integrazione paghe salvata» |
| Pannello autonomo Tipologie (non raggiungibile da questa pagina: il suo deep link apre Contratti collettivi › Tipologie) | «Tipologie di contratto salvate» |

### Conferme di eliminazione

Ogni eliminazione («Elimina», e anche «Rimuovi» di un allegato o di un F24 in Aziende in appalto) passa dalla ConfirmDialog condivisa (`useConfirmStore`), sempre con `danger: true`. Il pulsante di annullamento ha l'etichetta di default «Annulla», quello di conferma l'etichetta indicata nella scheda. L'eliminazione confermata agisce sulla **bozza**: diventa definitiva solo con «Salva». I testi esatti sono nelle sezioni della Parte B.

### Caricamento ed errore

- Non ci sono skeleton né spinner di caricamento, perché i dati sono sincroni dallo store locale.
- Con il backend (A.7), alla prima apertura serve uno stato di caricamento. Proposta: riusare lo skeleton di `CfgPane`, vedi `00-fondamenta.md`.

## A.6 Dati e regole di business (comuni)

### Store e persistenza attuale (mock nel browser)

| Store | Chiave `localStorage` | Versione | Contenuto | Schede |
| --- | --- | --- | --- | --- |
| `useHrConfigStore` | `sibylla.hr-config` | 7 | `reparti`, `orari`, `turni`, `schemi`, `tipologie`, `ccnl`, `categorieEsterni`, `badge`, `integrazionePaghe` | tutte tranne Aziende in appalto |
| `useCatalogoStore` (solo i fornitori con `appalto: true` vengono persistiti) | `sibylla.catalogo-appalto` | 2 | `fornitori[]` con `datiAppalto` | Aziende in appalto |
| `useCollaboratoriEsterniStore` | `sibylla.collaboratori-esterni` | 2 | `collaboratori[]` (sola lettura qui) | Aziende in appalto, Collaboratori esterni |
| `useConfiguratoreStore` | `sibylla.configuratore` | 4 | solo `completion` (il contatore delle modifiche **non** è persistito) | shell |

**Migrazioni del persist di `sibylla.hr-config`:**

- v2: categorie dei collaboratori esterni;
- v3: badge;
- v4: orari con più fasce al giorno; le vecchie giornate `{attivo, entrata, uscita, pausaMin}` si convertono con `normalizzaGiorno`;
- v5: il documento «DUVRI» viene tolto dai documenti delle categorie, perché è dell'appalto e non del singolo addetto;
- v6–7: integrazione paghe con un profilo per software. Un valore salvato senza `profili` viene sostituito dal default.

La migrazione parte dal seed e ci sovrappone i dati salvati.

**Merge del catalogo appalto.** Le ditte salvate prevalgono sul seed, ma i campi di `datiAppalto` aggiunti dopo (per esempio il DUVRI) arrivano dal seed, con un merge superficiale `{...seed.datiAppalto, ...salvato.datiAppalto}`. Le ditte nuove salvate si aggiungono in coda.

### Identificativi

`nuovoId(prefix)` = `` `${prefix}-${Date.now().toString(36)}-${random 0..9999}` ``. Prefissi usati:

| Prefisso | Entità |
| --- | --- |
| `rep` | reparto |
| `ora` | orario |
| `tur` | turno |
| `sch` | schema di rotazione |
| `ccnl` | contratto collettivo |
| `lv` | livello |
| `tip` | tipologia di contratto |
| `cest` | categoria di collaboratori esterni |
| `forn-app-<base36>` | azienda in appalto (senza parte casuale) |
| `pag-<base36>` | pagamento |

### Palette colori di reparti, turni, categorie e banda del badge

Ogni colore è un indice da 1 a 8 che punta ai token `--chart-1…8`:

| Indice | Token | Chiaro | Scuro |
| --- | --- | --- | --- |
| 1 | `--chart-1` | `#2E6DA4` | `#4A8BC9` |
| 2 | `--chart-2` | `#C4661F` | `#D9722F` |
| 3 | `--chart-3` | `#A8407F` | `#D0609F` |
| 4 | `--chart-4` | `#A8862F` | `#A8862F` |
| 5 | `--chart-5` | `#1E9E95` | `#1E9E95` |
| 6 | `--chart-6` | `#C43D34` | `#E8635A` |
| 7 | `--chart-7` | `#5B43A0` | `#9585E0` |
| 8 | `--chart-8` | `#2E7D3A` | `#3FA34D` |

Il dato salvato è l'indice, non il colore.

### Chi legge questi dati (effetti a valle)

- **Crea anagrafica personale**:
  - reparti attivi;
  - orari, da cui la percentuale di part time: `min(100, round(oreSettimanaliOrario / ccnl.oreSettimanaliPieno × 100))`;
  - schemi di turni;
  - tipologie (con scadenza → data di fine obbligatoria; con prova → durata proposta dal livello);
  - CCNL e livelli, con `ralMinima = round(minimoMensile × mensilità × percentuale/100)` e `spettanzeAnnue` (vedi la scheda Contratti collettivi).
- **Archivio del personale**: reparto e inquadramento.
- **Registro presenze**: il software paghe `inUso` e i suoi parametri.
- **App Op!**: reparto Op! di default del reparto HR; reparti consentiti alle categorie di esterni.

## A.7 Backend da realizzare (comune)

Oggi **tutto è mock** nel browser: store `zustand` persistiti in `localStorage`, con il salvataggio simulato da un `setTimeout` di 300 ms. L'unica chiamata reale collegata alla pagina è il contratto d'invio del consuntivo, `POST /Sibylla/hr/paghe/trasmetti` (vedi la scheda Integrazione paghe), che però parte dal Registro presenze, non da qui.

Il backend deve rispettare la semantica del frontend: **una sola scrittura per scheda al «Salva»**, con l'intero insieme della scheda **sostituito in modo transazionale**. Non ci sono salvataggi per singola riga.

Base URL coerente con quella esistente: `/Sibylla/` (via `apiFetchSibylla`). Endpoint proposti:

| Metodo | Percorso | Corpo | Risposta | Scheda |
| --- | --- | --- | --- | --- |
| GET | `/Sibylla/hr/config` | — | `HrConfigData` completo (vedi 01-modello-dati-e-api) + `version` | caricamento iniziale |
| PUT | `/Sibylla/hr/config/reparti` | `{ version, reparti: RepartoHr[] }` | `{ version, reparti }` | Reparti |
| PUT | `/Sibylla/hr/config/orari` | `{ version, orari: OrarioHr[] }` | `{ version, orari }` normalizzati | Orari di lavoro |
| PUT | `/Sibylla/hr/config/turnistica` | `{ version, turni: TurnoHr[], schemi: SchemaTurniHr[] }` | idem | Turnistica |
| PUT | `/Sibylla/hr/config/contratti` | `{ version, ccnl: CcnlHr[], tipologie: TipologiaContrattoHr[] }` | idem | Contratti collettivi |
| PUT | `/Sibylla/hr/config/collaboratori-esterni` | `{ version, categorie: CategoriaEsterniHr[], badge: BadgeConfigHr }` | idem | Collaboratori esterni |
| PUT | `/Sibylla/hr/config/integrazione-paghe` | `IntegrazionePagheHr` (segreti solo se cambiati) | `IntegrazionePagheHr` con segreti mascherati | Integrazione paghe |
| POST | `/Sibylla/hr/paghe/prova-collegamento` | `{ software, canale, valori }` | `{ ok, messaggio, at }` | Integrazione paghe |
| GET / PUT | `/Sibylla/purchasing/fornitori/appalto` | `{ version, fornitori: Fornitore[] }` | idem | Aziende in appalto |
| POST | `/Sibylla/hr/allegati` (multipart) | `file` (PDF o immagine, ≤ 2 MB) | `{ id, nome, url }` | Aziende in appalto |
| GET | `/Sibylla/hr/collaboratori-esterni` | — | `CollaboratoreEsterno[]` | lettura |

**Regole comuni del backend:**

- **Concorrenza**: `version` (oppure `ETag` / `If-Match`) per evitare di sovrascrivere modifiche di un altro utente. In caso di conflitto risponde `409 { error: 'conflict', message: 'I dati sono stati modificati da un altro utente: ricarica la pagina.' }`. Il frontend mostra il toast d'errore della barra («Salvataggio non riuscito. Riprova.») e tiene la bozza.
- **Validazione**: la stessa del frontend, descritta per scheda; in caso di errore `400 { error: 'validation', fields: { '<path>': '<messaggio>' } }`.
- **Completamento**: lo calcola il frontend dai dati salvati, quindi non serve un endpoint dedicato. Se lo si vuole lato server, va applicata la stessa regola e restituito in `GET /Sibylla/hr/config` come `completamento: Record<id, 'configured'|'partial'|'empty'>`.
- **Notifiche**: nessun salvataggio di questa pagina genera notifiche (Centro notifiche o App Op!). Le notifiche legate all'integrazione paghe nascono all'invio del consuntivo (`notificaEsito`), non qui.
- **Audit (consigliato)**: registrare autore, data e scheda di ogni PUT.

## A.8 Stile (shell e kit comune)

### Shell

| Selettore | Valori |
| --- | --- |
| `.configuratore` | `padding:0; width:100%; display:flex; flex-direction:column; gap:12px; align-items:stretch; container-type:inline-size; container-name:configuratore` |
| `.cfg-sezione` | `display:flex; flex-direction:column; gap:12px; min-width:0; container: cfg-sezione / inline-size` |
| `.cfg-sezione__tabs` | `display:flex; flex-wrap:wrap; gap:2px; border-bottom:1px solid var(--color-border)` |
| `.cfg-sezione__tab` | `display:inline-flex; align-items:center; gap:8px; padding:10px 14px; margin-bottom:-1px; border:0; border-bottom:2px solid transparent; background:transparent; font-family:var(--font-heading)` (Poppins)`; font-size:13px; font-weight:600; color:var(--color-text-inactive); cursor:pointer; transition: color 150ms cubic-bezier(0.4,0,0.2,1), border-color 150ms cubic-bezier(0.4,0,0.2,1)` |
| `.cfg-sezione__tab i` | `font-size:14px` |
| `.cfg-sezione__tab:hover` | `color:var(--color-text-active)` (`#4A4D53`)`; border-bottom-color:var(--color-primary-300)` (`#b3c1cc`) |
| `.cfg-sezione__tab.is-active` | `color:var(--color-primary)` (`#204769`)`; border-bottom-color:var(--color-primary)` |
| `.cfg-sezione__desc` | `margin:0; font-size:12.5px; color:var(--color-text-inactive)` |
| `.cfg-sezione__body` | `display:flex; flex-direction:column; min-width:0` + animazione d'ingresso (A.10) |

### CfgBadge (compatto, sulle schede)

| Selettore | Valori |
| --- | --- |
| `.cfg-badge` | `display:inline-flex; align-items:center; gap:5px; height:20px; padding:0 8px; border-radius:10px; font-family:var(--font-body); font-size:11px; font-weight:600; white-space:nowrap; flex-shrink:0` |
| `.cfg-badge--compact` | `height:auto; padding:0; background:none !important; border:none !important` |
| `.cfg-badge__dot` | `7×7px; border-radius:50%; background:currentColor` |
| `.cfg-badge__icon` | `font-size:9px` |

Colori per stato:

| Stato | Testo | Sfondo |
| --- | --- | --- |
| `configured` | `--color-success` `#007035` | `alpha(success,.12)` |
| `partial` | `--color-warning` | `alpha(warning,.13)` |
| `empty` | `--color-text-inactive` | `alpha(text-inactive,.1)` |
| `locked` | `--color-text-disabled` | `alpha(text-disabled,.12)` |
| `soon` | `--color-primary-600` | `--color-primary-50` `#f2f5f6`, con bordo `1px dashed --color-primary-300` |

Nella versione compatta sfondo e bordo sono spenti: resta solo il colore dell'indicatore.

### CfgSaveBar

| Selettore | Valori |
| --- | --- |
| `.cfg-save-bar` | `position:sticky; bottom:0; z-index:5; display:flex; align-items:center; gap:10px; padding:10px 22px; background:var(--color-surface)` (`#FFFFFF`)`; border-top:1px solid var(--color-border); box-shadow:var(--shadow-md)` (`0 2px 8px rgba(32,71,105,.15)`)`; flex-shrink:0` |
| `.cfg-save-bar__dot` | `8×8px; border-radius:50%; background:var(--color-warning)` |
| `.cfg-save-bar__count` | `font-size:12.5px; font-weight:600; color:var(--color-text-active)` |
| `.cfg-save-bar__actions` | `display:flex; align-items:center; gap:8px; margin-left:auto` |
| `.cfg-save-bar__cancel` | `color:var(--color-text-inactive)` |

La barra è `role="status"`. Nella pagina HR è l'ultimo figlio del pannello, quindi resta incollata al fondo dell'area visibile mentre si scorre il pannello.

### CfgToolbar (riga sopra le tabelle)

| Selettore | Valori |
| --- | --- |
| `.cfg-toolbar` | `display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:16px` |
| `__filters` | `display:flex; align-items:flex-end; gap:16px; flex-wrap:wrap; flex:1; min-width:0`; ogni figlio diretto ha `min-width:170px` |
| `__actions` | `display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:auto` |

### CfgTable (tabella standard dei pannelli)

- È un wrapper di `.sib-table-wrap` + `.sib-table`, lo standard della piattaforma descritto in `00-fondamenta.md`:
  - header con sfondo `--color-bg` `#F8FCFF`, 12px, peso 600, `--color-text-inactive`, case normale, padding 10px 12px;
  - celle 13px, padding 10px 12px, bordo inferiore `1px --color-border`;
  - hover della riga `--color-bg`, niente zebra.
- Larghezze delle colonne in % su `<col>` tramite la custom property `--cfg-col-w`. Con almeno una larghezza, `table-layout:fixed`.
- `.sib-table-wrap.cfg-table { overflow-x:hidden }`: **nessuno scroll orizzontale**. La regola ha 2 classi apposta, per battere `.sib-table-wrap` di Tailwind (`overflow-x:auto`).
- `.cfg-table { margin-bottom:0 }`, `.cfg-table__th--center { text-align:center }`, `.cfg-table__th--right { text-align:right }`.
- Le intestazioni passano da `withAcronimi`: per esempio «RAL minima» mostra la sigla RAL con il tooltip del glossario.
- Riga vuota: `.cfg-table__empty-row td { padding:0; border-bottom:none }`; testo `.cfg-table__empty-text { display:block; padding:28px 16px; text-align:center; font-size:12.5px; color:var(--color-text-inactive) }`. Testo di default: «Nessun elemento configurato».
- **Pulsanti icona dentro le tabelle** (standard piattaforma): `.sib-table .sib-btn--icon` senza box (`border:0; background:transparent; padding:4px 5px; width/height:auto`), con icona `color:var(--color-primary); font-size:16px`; hover `background:var(--color-primary-50)`; icona disabilitata `--color-text-disabled`.
- Fuori dalle tabelle `.sib-btn--icon` è il quadrato 36×36 bianco con bordo `--color-border` e icona `--color-text-inactive`; in hover bordo `--color-primary`, sfondo `--color-primary-50` e icona `--color-primary`.

### CfgMultiSelect (in Turnistica e in Collaboratori esterni)

**Struttura:**

| Selettore | Valori |
| --- | --- |
| `.cfg-msel` | `position:relative; display:flex; flex-direction:column; gap:4px; min-width:0` |
| `__label` | Poppins 12px, peso 600, `--color-primary` |

**Trigger:**

| Selettore | Valori |
| --- | --- |
| `__trigger` | `height:34px; padding:0 12px; border:1px solid --color-border; border-radius:7px; background:--color-surface; font: Open Sans 13px; color:--color-text-active; transition:border-color .15s` |
| `__trigger:hover`, `__trigger.is-open` | bordo `--color-primary` |
| `__trigger:focus-visible` | `outline:none; border-color:--color-primary; box-shadow:0 0 0 3px var(--color-focus-ring)` (`rgba(92,156,212,.25)`) |
| `__trigger:disabled` | sfondo `--color-bg`, testo `--color-text-disabled`, `cursor:not-allowed` |
| `__ph` | placeholder, colore `--color-text-inactive` |
| `__summary` | riepilogo con ellipsis |
| `__chev` | `fa-solid fa-chevron-down` 10px, colore `--color-text-inactive`; ruota di 180° a pannello aperto (transizione `.15s`) |

**Pannello:**

| Selettore | Valori |
| --- | --- |
| `__pop` | `position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:20; min-width:220px; padding:6px; border:1px solid --color-border; border-radius:8px; background:--color-surface; box-shadow:--shadow-md` |
| `__pop--su` | `top:auto; bottom:calc(100% + 4px)` |
| `__list` | `max-height:240px; overflow-y:auto; padding:4px 0`; scrollbar 6px con thumb `--color-border` e radius 3px |
| `__option` | `gap:8px; padding:6px 8px; border-radius:5px; font-size:12.5px`; hover sfondo `--color-bg` |
| `__quick` | `gap:6px; margin-top:4px; padding:6px 8px 2px; border-top:1px solid --color-border` |
| `__quick button` | 11.5px, peso 600, `--color-primary`; hover con sottolineatura |
| `__count` | `margin-left:auto; 11px; --color-text-inactive; tabular-nums` |

**Comportamento:**

- **Apertura**: si apre verso l'alto (`__pop--su`) quando lo spazio sotto il trigger è minore di 300px e lo spazio sopra è maggiore di quello sotto.
- **Chiusura**: con clic fuori o con Esc. Chiudendo si azzera la ricerca.
- **Riepilogo nel trigger**:
  - nessuna voce scelta: il placeholder;
  - una voce: il suo nome;
  - più voci: `"N <nomePlurale> selezionati"` se la prop `genere` è `'m'`, altrimenti `"N <nomePlurale> selezionate"` (default `'f'`, così gli usi esistenti non cambiano). In questa pagina «reparti» e «documenti» passano `genere="m"`: «2 reparti selezionati», «3 documenti selezionati». Fuori pagina «sale» (Configura outlet) e «aggregazioni» (Contratto di vendita) restano al femminile.
- **Campo di ricerca**: compare solo se le opzioni sono più di 7 (`sogliaRicerca`). Placeholder «Cerca tra N <nomePlurale>…», `aria-label` «Cerca in <label>», autofocus. Senza risultati: «Nessun risultato».
- **Riga rapida** in fondo al pannello: «Tutte» (con una ricerca attiva diventa «Seleziona i risultati»), «Nessuna» e il contatore «k/N».
- **Checkbox**: classe `.sib-checkbox`.
- **Accessibilità**: trigger `aria-haspopup="listbox"` e `aria-expanded`; elenco `role="listbox"`, `aria-multiselectable="true"`; opzioni `role="option"` con `aria-selected`.

### Kit HR comune (`panes/_hr`)

**Radice di ogni pannello.**

- `.cfg-hr-pane { container-type: inline-size }`: crea un contenitore anonimo, su cui si basano tutte le container query dei pannelli.
- Badge di stato nelle celle: `td [class*="__badge"] { display:inline-block; line-height:22px; vertical-align:middle; max-width:100%; overflow:hidden; text-overflow:ellipsis }`.
- Compattazione delle tabelle: vedi A.9.

**Azioni di riga (`HrRowActions`).**

- Contenitore `.cfg-hr-actions { display:inline-flex; align-items:center; justify-content:flex-end; gap:4px }`.
- Pulsanti `sib-btn sib-btn--icon`, ciascuno dentro un Tooltip (scuro, standard):

| Tooltip | Icona | aria-label |
| --- | --- | --- |
| «Modifica» | `fa-solid fa-pen` | «Modifica <nome>» |
| «Duplica» (solo se previsto dalla scheda) | `fa-solid fa-copy` | «Duplica <nome>» |
| «Elimina» | `fa-solid fa-trash-can` | «Elimina <nome>» |

**Pallino colore (`HrDot`, `.hrcfg-dot`).** `display:inline-block; flex-shrink:0; 10×10px; border-radius:50%`; sfondo `var(--chart-N)` secondo l'attributo `data-col="N"`. È `aria-hidden`.

**Selettore colore (`HrColorPicker`, `.hrcfg-colors`).**

- Contenitore: `flex column; gap:6px`.
- Etichetta di default «Colore»: Poppins 12px, peso 600, `--color-primary`.
- Elenco: `display:flex; gap:8px; flex-wrap:wrap`, `role="radiogroup"` con `aria-label` = etichetta.
- 8 campioni `button role="radio"`, `aria-checked`, `aria-label` «Colore N»:
  - `24×24px; border-radius:50%; border:2px solid transparent; box-shadow:0 0 0 1px var(--color-border); cursor:pointer; transition: transform 150ms cubic-bezier(0.4,0,0.2,1)`;
  - hover: `transform:scale(1.1)`;
  - attivo (`.is-active`): `border-color:var(--color-surface); box-shadow:0 0 0 2px var(--color-primary)`, cioè l'anello blu staccato da un filo bianco.

**Modale dei moduli (`HrFormModal`).**

- Usa il `Modal` condiviso con due misure:
  - `size md` → `.modal__box.hrcfg-modal--md { width:min(600px, calc(100vw - 48px)) }`;
  - `size lg` → Modal `xl` + `.modal__box.hrcfg-modal--lg { width:min(860px, calc(100vw - 48px)) }`.
- Corpo `.hrcfg-modal__body`: `display:flex; flex-direction:column; gap:14px; padding:4px 2px 2px; max-height:calc(100vh - 220px); overflow-y:auto`.
- Righe:
  - `.hrcfg-modal__row`: `display:grid; grid-template-columns:1fr 1fr; gap:14px`;
  - `.hrcfg-modal__row--3`: `repeat(3, 1fr)`.
- Etichetta libera `.hrcfg-modal__label`: Poppins 12px, peso 600, `--color-primary`.
- Nota `.hrcfg-modal__hint`: `margin:0; font-size:12px; color:--color-text-inactive`.
- Piede `.hrcfg-modal__footer`: `display:flex; justify-content:flex-end; gap:8px; margin-top:18px; padding-top:14px; border-top:1px solid --color-border`. Contiene «Annulla» (`sib-btn--ghost`) e il pulsante di conferma (`sib-btn--primary`, disabilitato se `canSubmit` è falso).
- Chiusura con ×, clic sul fondo o **Esc**, senza conferma: la modale scarta le sue modifiche locali.

### Tema scuro

- Nessuna regola `[data-theme=dark]` è specifica di questa pagina: tutto passa dai token, che cambiano valore.
- Valori scuri principali:

| Token | Scuro |
| --- | --- |
| `--color-primary` | `#6F9BCB` |
| `--color-primary-50` | `#232C3A` |
| `--color-primary-200` | `#8B95A3` |
| `--color-primary-300` | `#6B7686` |
| `--color-surface` | `#1A1E26` |
| `--color-bg` | `#12151B` |
| `--color-border` | `#2B313D` |
| `--color-text-active` | `#E6E8EC` |
| `--color-text-inactive` | `#9AA2AE` |
| `--color-text-disabled` | `#5E6675` |
| `--color-success` | `#34D399` |
| `--color-warning` | `#F5A623` |
| `--color-error` | `#FF6B78` |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,.5)` |

- I colori `--chart-N` scuri sono nella tabella di A.6.

## A.9 Responsività (comune)

**Schede della shell.** Container query `@container cfg-sezione (max-width: 1180px)`:

- `.cfg-sezione__tabs { flex-wrap:nowrap }`;
- `.cfg-sezione__tab { gap:6px; padding:10px 9px; font-size:12.5px; white-space:nowrap }`.

Le sette schede restano su una riga anche su un laptop da 1366px con la sidenav aperta.

**Tabelle di tutti i pannelli HR.** Container query sul pannello (`.cfg-hr-pane`):

- `@container (max-width: 760px)`:
  - celle e intestazioni `padding-left/right:6px; font-size:12px`;
  - `.cfg-hr-actions { gap:0 }`;
  - pulsanti icona `width:24px; min-width:24px; padding:0`, con icona 14px;
  - badge in cella `padding:0 6px`.
- `@container (max-width: 520px)`: celle `padding-left/right:4px`.

**Modali.** `@media (max-width: 640px)`: `.hrcfg-modal__row` e `--3` diventano una colonna (`1fr`).

**Vincoli:**

- nessuna tabella scorre in orizzontale, a nessuna larghezza;
- i testi lunghi in cella vanno su una riga con ellipsis e tooltip (`TruncatedText`);
- le intestazioni non si abbreviano mai sopra soglia, salvo le abbreviazioni puntate già previste dalle schede («Ord.», «Min. mensile»…), sempre con il tooltip del testo completo.

Su 1920px non cambia nulla rispetto ai valori standard. Le soglie specifiche di ogni pannello sono nelle sezioni della Parte B.

## A.10 Effetti e animazioni (comuni)

| Elemento | Effetto | Durata ed easing | Con `prefers-reduced-motion: reduce` |
| --- | --- | --- | --- |
| Corpo della scheda (`.cfg-sezione__body`) a ogni cambio scheda | `cfg-sezione-in`: da `opacity:0; transform:translateY(4px)` a `opacity:1; transform:none` | `.22s ease-out` | spenta (la regola sta sotto `@media (prefers-reduced-motion: no-preference)`) |
| Schede | transizione di `color` e `border-color` | `150ms cubic-bezier(0.4,0,0.2,1)` | — |
| CfgSaveBar alla comparsa | `cfg-save-bar-in`: da `translateY(100%); opacity:0` a `translateY(0); opacity:1` | `.22s ease-out` | spenta |
| Pallino della CfgSaveBar | `cfg-save-bar-pulse`: opacità `1 → .35 → 1` | `1.6s ease-in-out infinite` | spenta |
| «Salva» in corso | spinner `sib-btn-spin` | `0.6s linear infinite` | — |
| Campioni colore | `scale(1.1)` in hover | `150ms cubic-bezier(0.4,0,0.2,1)` | — |

## A.11 Accessibilità (comune)

- **Schede**: `nav role="tablist"` con `aria-label` «Voci di configurazione»; ogni scheda è un `button role="tab"` con `aria-selected`. Non c'è la navigazione con le frecce tra le schede, si usano Tab e Invio o Spazio. Le icone sono `aria-hidden`.
- **Badge di stato**: `role="status"` con `aria-label` («Da completare»…).
- **Barra delle modifiche**: `role="status"`.
- **Modali**: Esc chiude, il titolo è un `h2.modal__title`.
- **ConfirmDialog**: vedi `00-fondamenta.md`.
- **Pulsanti icona**: hanno sempre l'`aria-label` e il Tooltip scuro (`#1E293B`, testo bianco).
- **Campi form**: sono i componenti condivisi, con label associata e asterisco per gli obbligatori (vedi `00-fondamenta.md`).

## A.12 Criteri di accettazione (shell)

1. `hr-configurazione` apre la pagina con il titolo «Configurazione HR», il sottotitolo esatto di A.2 e la scheda **Reparti** attiva.
2. `hr-configurazione:hr-integrazione-paghe` apre direttamente la scheda «Integrazione paghe»; `hr-configurazione:pippo` apre «Reparti»; `hr-configurazione:hr-tipologie-contratto` (e `hr-configurazione:hr-ccnl:tipologie`) apre «Contratti collettivi» con la scheda interna «Tipologie di contratto (8)» attiva.
3. Le schede sono sette, nell'ordine e con le icone `fa-light` di A.4. Sotto compare la descrizione della voce attiva in 12.5px, con le sigle del glossario (CCNL, ROL…) sottolineate e il tooltip.
4. La scheda attiva ha testo e sottolineatura di 2px in `--color-primary`; in hover una scheda inattiva prende la sottolineatura `--color-primary-300`.
5. Con il pannello largo meno di 1180px le schede restano su **una riga**, con padding 10px 9px e font 12.5px.
6. Una modifica qualsiasi mostra la barra sticky «1 modifica non salvata», con il pallino arancione pulsante e i pulsanti «Annulla» / «Salva».
7. Cambiando scheda con modifiche pendenti compare «Modifiche non salvate» con il testo al singolare o al plurale corretto («… uscendo da questa voce …»). «Resta» non cambia nulla; «Abbandona» cambia scheda e la bozza è persa.
8. Con modifiche pendenti, un clic su una voce della sidenav (anche «Configurazione» stessa, se la pagina era aperta con un deep link) o su «Indietro» apre «Modifiche non salvate» con «C'è 1 modifica non salvata: uscendo da questa pagina andrà persa.». «Resta» lascia pagina, bozza e barra intatte; «Abbandona» porta alla pagina scelta (o alla precedente con Indietro). Senza modifiche nessuna conferma. Lo stesso vale nel Configuratore di Impostazioni.
9. Dopo «Salva» la barra non ricompare, anche se il salvataggio ha normalizzato i dati (per esempio un nome d'orario con spazi finali).
10. «Salva» mostra lo spinner per circa 300 ms, poi il toast della scheda (per esempio «Reparti salvati») e la barra sparisce; ricaricando il browser i dati restano.
11. «Annulla» ripristina subito i dati salvati, senza conferma.
12. Dopo aver aperto «Aziende in appalto» con i dati demo al 5 novembre 2026, la scheda mostra il pallino arancione «Da completare», perché la ditta Movi ha contratto e DURC scaduti.
13. Ogni eliminazione apre la ConfirmDialog col testo della scheda, e nulla viene eliminato senza conferma.
14. Con `prefers-reduced-motion: reduce` il cambio scheda e la comparsa della barra non hanno animazioni e il pallino non pulsa.
15. In tema scuro superfici, bordi e testi usano i valori scuri dei token e non resta nessun bianco puro.
16. Nessuna tabella della pagina scorre in orizzontale a 1366px con la sidenav aperta, né a 1440 o 1920px.

## A.13 File sorgente (shell e kit)

- `src/router/PageContent.tsx` (route `hr-configurazione`)
- `src/sibylla_dashboard.tsx` (`navigate` e `goBack` che interrogano il guard) e `src/store/useNavGuard.ts` (guard di navigazione con `proceed`)
- `src/modules/impostazioni/Configuratore/Configuratore.tsx`, `Configuratore.sass`
- `src/modules/impostazioni/Configuratore/ConfiguratoreSezione.tsx`, `ConfiguratoreSezione.sass`
- `src/modules/impostazioni/Configuratore/registry.ts`
- `src/store/useConfiguratoreStore.ts`
- `src/core/cfg/index.ts`, `cfgMotion.ts`, `CfgBadge.tsx/.sass`, `CfgSaveBar.tsx/.sass`, `CfgTable.tsx/.sass`, `CfgToolbar.tsx/.sass`, `CfgEmpty.tsx/.sass`, `CfgMultiSelect.tsx/.sass` (letti anche `CfgPane`, `CfgLocked`, `CfgOpzioneErrore`, `CfgRangeRules`, non usati in questa modalità)
- `src/modules/impostazioni/Configuratore/panes/_hr/useHrDraft.ts`, `HrFormModal.tsx/.sass`, `HrRowActions.tsx/.sass`, `HrColore.tsx/.sass`
- `src/store/useHrConfigStore.ts`
- `src/core/components/Tabs.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`, `PageHead.tsx`, `acronimi.ts`, `Toast/useToast.ts`
- `src/styles/_themes.sass`, `_colors.sass`, `_spacing.sass`, `src/tailwind.css` (`.sib-btn`, `.sib-table`)
- `src/navigation/menu.ts`, `pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`

---

# PARTE B — Le schede

## B.1 · Reparti (`hr-reparti`)

### B.1.1 Scopo e utenti

È l'elenco dei reparti in cui si inquadra il personale. Ogni reparto ha:

- codice;
- responsabile;
- centro di costo;
- colore;
- reparto dell'App Op! in cui entra di default chi ne fa parte;
- stato attivo o non attivo.

I reparti attivi sono le opzioni del campo «Reparto» di Crea anagrafica personale e la colonna reparto dell'Archivio. Si usano anche in Turnistica, per limitare i turni a certi reparti. Lo usa l'ufficio del personale.

### B.1.2 Accesso

- Scheda 1. Deep link `hr-configurazione:hr-reparti`, ed è anche la scheda di default.
- Non ci sono navigazioni in uscita.

### B.1.3 Layout

```
.cfg-hrrep.cfg-hr-pane (flex column · gap 12px · font-size 13px)
┌ CfgToolbar ─────────────────────────────────────────────────────────────────┐
│ [🔍 Cerca reparto, responsabile, centro di costo        ]   [⊕ Nuovo reparto]│
└─────────────────────────────────────────────────────────────────────────────┘
┌ CfgTable ───────────────────────────────────────────────────────────────────┐
│ Reparto 22% │Codice 9%│Responsabile 18%│Centro di costo 16%│Reparto App Op! 14%│Stato 9%│Azioni 12%│
│ ● Front office │ FO │ Piero Aragona │ CDC-01 Ricevimento │ Front Office │(Attivo)│ ✎ 🗑 │
│ …                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
ⓘ 7 reparti attivi su 8. Solo i reparti attivi sono selezionabili in Crea anagrafica personale.
[CfgSaveBar]
```

**Modale (md, 600px):**

```
Nuovo reparto                                              ×
[Nome reparto*            ] [Codice              ]
[Responsabile             ] [Centro di costo     ]
[Reparto App Op! collegato ▾ ]   hint
[Descrizione (facoltativa)  textarea 2 righe     ]
Colore  ● ● ● ● ● ● ● ●
[toggle] Reparto attivo — descrizione
────────────────────────────────────────────
                                 [Annulla] [Crea reparto]
```

### B.1.4 Elementi e testi

**Toolbar:**

- campo di ricerca `SearchField`, placeholder «Cerca reparto, responsabile, centro di costo»;
- pulsante `sib-btn sib-btn--primary` con icona `fa-light fa-circle-plus` e testo «Nuovo reparto».

**Colonne della tabella:**

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Reparto» | 22% | `HrDot` del colore + nome (`TruncatedText`), in `.cfg-hrrep__name` |
| «Codice» | 9% | codice oppure «—» |
| «Responsabile» | 18% | testo oppure «—» (`TruncatedText`) |
| «Centro di costo» | 16% | testo oppure «—» |
| «Reparto App Op!» | 14% | nome del reparto Op! oppure «—» |
| «Stato» | 9% | badge «Attivo» o «Non attivo» |
| «Azioni» | 12%, a destra | `HrRowActions` con Modifica ed Elimina (niente Duplica) |

**Altri testi:**

- Tabella vuota: «Nessun reparto: crea il primo con «Nuovo reparto».». Compare anche quando la ricerca non trova nulla: non esiste uno stato «nessun risultato» dedicato.
- Nota sotto la tabella, con icona `fa-light fa-circle-info` in `--color-primary`: «{attivi} reparti attivi su {totale}. Solo i reparti attivi sono selezionabili in Crea anagrafica personale.». Il conteggio si fa sulla bozza.

**Nomi dei reparti App Op!** (catalogo App Op!, chiavi fisse):

| Chiave | Nome |
| --- | --- |
| `pulizie` | «Pulizie» |
| `manutenzione` | «Manutenzione» |
| `magazzino` | «Magazzino» |
| `frontOffice` | «Front Office» |
| `foodBeverage` | «Food & Beverage» |
| `risorseUmane` | «Risorse umane» |
| `businessIntelligence` | «Business Intelligence» |
| `purchasing` | «Purchasing» |

**Modale.**

- Titolo «Nuovo reparto», oppure «Modifica reparto» se il reparto esiste già.
- Pulsante di conferma «Crea reparto», oppure «Salva modifiche».

| Campo | Componente | Label | Placeholder / opzioni | Regole |
| --- | --- | --- | --- | --- |
| Nome | InputField `rep-nome` | «Nome reparto» (obbligatorio) | «Es. Front office» | obbligatorio |
| Codice | InputField `rep-codice` | «Codice» | «Es. FO» | `maxLength 6`, convertito in maiuscolo mentre si scrive; errore «Codice già usato da un altro reparto» |
| Responsabile | InputField `rep-resp` | «Responsabile» | «Nome e cognome» | libero |
| Centro di costo | InputField `rep-cdc` | «Centro di costo» | «Es. CDC-01 Ricevimento» | libero |
| Reparto Op! | SelectField `rep-op` | «Reparto App Op! collegato» | «Nessuno» + gli 8 reparti Op! nell'ordine del catalogo (Pulizie, Manutenzione, Magazzino, Front Office, Food & Beverage, Risorse umane, Business Intelligence, Purchasing) | hint «Proposto nella sezione App Op! della scheda del dipendente.» |
| Descrizione | TextareaField `rep-desc`, 2 righe | «Descrizione (facoltativa)» | — | libero |
| Colore | HrColorPicker | «Colore» | 8 campioni | default 1 |
| Attivo | ToggleSwitch | «Reparto attivo» | descrizione «I reparti non attivi restano nello storico ma non si assegnano ai nuovi contratti.» | default acceso |

### B.1.5 Stati e interazioni

- **Ricerca**: filtro immediato, senza distinzione tra maiuscole e minuscole, sulla concatenazione `nome codice responsabile centroCosto`. Non è persistito.
- **Ordine**: quello dell'array, cioè le aggiunte in coda. Non c'è un ordinamento per colonna e non c'è paginazione.
- **Riga non attiva**: tutte le celle in `--color-text-inactive` (`.cfg-hrrep__row--off td`) e il badge «Non attivo».
- **«Nuovo reparto»**: apre la modale vuota. Default: colore 1, attivo, tutti i testi vuoti.
- **Matita**: apre la modale con una copia del reparto.
- **Conferma della modale** (abilitata solo se il nome, dopo `trim`, non è vuoto **e** il codice non è duplicato):
  - nome con `trim()`, codice con `trim().toUpperCase()`;
  - un reparto nuovo prende l'id `nuovoId('rep')` e va in coda;
  - un reparto esistente viene sostituito nella stessa posizione;
  - la modale si chiude e la barra conta +1.
- **Codice duplicato**: errore se esiste un altro reparto (id diverso) con lo stesso codice in maiuscolo e il codice non è vuoto. Il messaggio compare sotto il campo e il pulsante di conferma resta disabilitato. Il codice vuoto è ammesso, anche su più reparti.
- **Elimina** → ConfirmDialog:
  - titolo «Elimina reparto»;
  - messaggio «Eliminare il reparto «{nome}»? I dipendenti già inquadrati lo mantengono nel contratto vigente finché non lo cambi.»;
  - conferma «Elimina» (danger). Il reparto esce dalla bozza.
  - Non c'è un controllo d'uso: si può eliminare anche un reparto referenziato da turni o dipendenti. Nei turni il riferimento resta come id e nella colonna Reparti di Turnistica appare l'id grezzo (`nomeReparto` fa fallback all'id).

### B.1.6 Dati e regole di business

**Entità `RepartoHr`:**

| Campo | Tipo | Note |
| --- | --- | --- |
| `id` | string | |
| `nome` | string | |
| `codice` | string | |
| `responsabile` | string | |
| `centroCosto` | string | |
| `colore` | 1..8 | |
| `repartoOp?` | RepartoOp | |
| `attivo` | boolean | |
| `descrizione?` | string | |

**Completamento**: `configured` se almeno un reparto è attivo, altrimenti `empty`.

**Seed (8 reparti, in quest'ordine):**

| id | Nome | Codice | Responsabile | Centro di costo | Colore | Reparto Op! | Attivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| rep-fo | Front office | FO | Piero Aragona | CDC-01 Ricevimento | 1 | frontOffice | sì |
| rep-fb | F&B | FB | Andrea Grimaudo | CDC-02 Ristorazione | 2 | foodBeverage | sì |
| rep-hk | Housekeeping | HK | Marco Campo | CDC-03 Piani | 3 | pulizie | sì |
| rep-man | Manutenzione | MAN | — | CDC-04 Manutenzione | 4 | manutenzione | sì |
| rep-cuc | Cucina | CUC | — | CDC-02 Ristorazione | 5 | foodBeverage | sì |
| rep-amm | Amministrazione | AMM | Ruggero Novi | CDC-05 Sede | 6 | risorseUmane | sì |
| rep-dir | Direzione | DIR | Piero Aragona | CDC-05 Sede | 7 | — | sì |
| rep-mkt | Marketing | MKT | — | CDC-05 Sede | 8 | — | **no** |

«—» = stringa vuota. Persistenza: `sibylla.hr-config` → `reparti`.

### B.1.7 Backend da realizzare

`PUT /Sibylla/hr/config/reparti`, con sostituzione dell'intero elenco in una transazione.

```json
{ "version": 12, "reparti": [
  { "id": "rep-fo", "nome": "Front office", "codice": "FO", "responsabile": "Piero Aragona",
    "centroCosto": "CDC-01 Ricevimento", "colore": 1, "repartoOp": "frontOffice", "attivo": true, "descrizione": "" }
] }
→ 200 { "version": 13, "reparti": [ … ] }
```

**Validazione (400):**

- `nome` obbligatorio;
- `codice` univoco tra i reparti, senza distinzione tra maiuscole e minuscole, se valorizzato, e lungo al massimo 6 caratteri: altrimenti `{ "fields": { "reparti[3].codice": "Codice già usato da un altro reparto" } }`;
- `colore` compreso tra 1 e 8;
- `repartoOp` dentro l'enumerazione del catalogo Op!.

**Consigliato**: rifiutare l'eliminazione di un reparto assegnato a contratti vigenti, oppure eliminarlo in modo logico. Oggi il frontend non lo impedisce: per restare identici, l'eliminazione va accettata e i contratti esistenti tengono il riferimento storico, come dice il testo della conferma.

### B.1.8 Stile

| Selettore | Valori |
| --- | --- |
| `.cfg-hrrep` | `display:flex; flex-direction:column; gap:12px; font-size:13px` |
| `__name` | `display:flex; align-items:center; gap:8px; min-width:0; font-weight:600; color:--color-text-active` |
| `__code` | `font-size:11.5px; font-weight:600; letter-spacing:.4px; color:--color-text-inactive` |
| `__row--off td` | `color:--color-text-inactive` |
| `__badge` | `display:inline-flex; align-items:center; height:22px; padding:0 9px; border-radius:11px; font-size:11px; font-weight:600; white-space:nowrap` (in cella diventa `inline-block`, `line-height:22px`, per la regola del kit) |
| `__badge--on` | testo `--color-success`, sfondo `alpha(success,.12)` |
| `__badge--off` | testo `--color-text-inactive`, sfondo `alpha(text-inactive,.1)` |
| `__actions` | `text-align:right; white-space:nowrap` |
| `__note` | `display:flex; align-items:center; gap:6px; margin:0; font-size:12px; color:--color-text-inactive`; icona `--color-primary` |

### B.1.9 Responsività

- Compattazione comune delle tabelle HR sotto i 760px e i 520px di larghezza del pannello (A.9).
- Le colonne sono in % fisse: nessuno scroll orizzontale, i testi vanno con ellipsis e tooltip.
- La toolbar va a capo se manca spazio: il campo di ricerca ha minimo 170px.
- La modale passa a una colonna sotto i 640px di viewport.

### B.1.10 Effetti e animazioni

- Hover della riga con sfondo `--color-bg` (standard della tabella).
- Campioni colore con `scale(1.1)` in hover.
- Le altre animazioni sono quelle comuni di A.10.

### B.1.11 Accessibilità

- Le azioni di riga hanno l'aria-label con il nome del reparto («Modifica Front office»).
- Il selettore colore è un `radiogroup` con 8 `radio` («Colore 1»…).
- Il pallino del colore è decorativo (`aria-hidden`).

### B.1.12 Criteri di accettazione

1. Con il seed la tabella mostra 8 righe nell'ordine di B.1.6; Marketing è in grigio con il badge «Non attivo».
2. La nota dice «7 reparti attivi su 8. Solo i reparti attivi sono selezionabili in Crea anagrafica personale.».
3. Scrivendo «cdc-05» nella ricerca restano Amministrazione, Direzione e Marketing.
4. Una ricerca senza risultati mostra «Nessun reparto: crea il primo con «Nuovo reparto».».
5. In «Nuovo reparto» il pulsante «Crea reparto» è disabilitato finché il nome è vuoto.
6. Scrivendo «fo» nel codice compare «FO» e l'errore «Codice già usato da un altro reparto», e il pulsante resta disabilitato.
7. Il codice accetta al massimo 6 caratteri.
8. Creando un reparto, la riga compare in coda e la barra dice «1 modifica non salvata»; salvando compare il toast «Reparti salvati».
9. Elimina mostra «Elimina reparto» con il testo esatto, e «Elimina» toglie la riga dalla bozza.
10. La colonna «Reparto App Op!» di Front office dice «Front Office», con la O maiuscola.
11. A una larghezza del pannello sotto i 760px le celle hanno padding di 6px e font di 12px, e le icone d'azione sono di 14px su 24px, senza scroll orizzontale.
12. Disattivando tutti i reparti e salvando, la scheda mostra il pallino grigio «Da configurare».

### B.1.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrReparti/HrReparti.tsx`, `HrReparti.sass`
- `src/modules/appop/opCatalogo.ts` (`REPARTI_OP`, `nomeReparto`)
- `src/store/useHrConfigStore.ts` (`RepartoHr`, `SEED_REPARTI`)

---

## B.2 · Orari di lavoro (`hr-orari`)

### B.2.1 Scopo e utenti

Definisce gli orari contrattuali da assegnare ai dipendenti: full time, part time orizzontale, verticale o misto.

- Un orario a **griglia settimanale** ha una o più fasce «dalle/alle» per ogni giorno (la giornata spezzata), una pausa non retribuita e un margine di flessibilità.
- Un orario **a turni** fissa solo il monte ore e i giorni di servizio: la distribuzione la fa la Turnistica.

Crea anagrafica ricava dalle ore settimanali la percentuale di part time rispetto all'orario pieno del CCNL.

### B.2.2 Accesso

- Scheda 2. Deep link `hr-configurazione:hr-orari`.
- Non ci sono navigazioni in uscita.

### B.2.3 Layout

Master-detail: a sinistra l'elenco, a destra il dettaglio dell'orario selezionato, sempre aperto in modifica. Non ci sono modali, salvo le conferme.

```
.cfg-hrora.cfg-hr-pane (flex column · gap 12px · 13px)
.cfg-hrora__layout (grid 270px | minmax(0,1fr) · gap 18px · align-items start)
┌ aside.__list (flex col · gap 8) ┐ ┌ section.__detail (card · padding 16 18 18 · gap 14) ──────────────┐
│┌ __item ──────────────────────┐│ │ header: Full time 40 h · 5 giorni            [✎][⧉][🗑]          │
││Full time 40 h · 5 giorni ▁▁▁▁▁ ││ │         40 ore settimanali su 5 giorni                           │
││40 h · 5 giorni  L M M G V S D ││ │ grid 4 col: [Nome orario* ············ (span 2)] [Regime ▾] [Flessibilità]│
│└───────────────────────────────┘│ │ [toggle] Orario a turni — descrizione                            │
│ … (6 orari)                     │ │ ┌ SettimanaOrario (editor settimanale) ──────────────────────┐   │
│ [⊕ Nuovo orario] (secondary)    │ │ │ Modelli rapidi (Lun–Ven 9–13 · 14–18) (…) (…) (Svuota)    │   │
└─────────────────────────────────┘ │ │ ┌ griglia ───────────────────────────────────────────────┐ │   │
                                    │ │ │Giorno│Fasce di lavoro (dalle – alle)│Pausa│ Ore│        │ │   │
                                    │ │ │[Lun] │[09:00]–[13:00]× [14:00]–[18:00]× (+ fascia)│[  ]min│8 h│⧉│ │
                                    │ │ │      │▕06 08 10 ██████ 14 ██████ 18 20 22 ▏ barra del giorno │ │
                                    │ │ │ …  Sab: Riposo [⊕ Imposta orario]                      │ │   │
                                    │ │ └────────────────────────────────────────────────────────┘ │   │
                                    │ │ ⌨ Scrivi gli orari…           Totale settimanale 40 h su 5 giorni│
                                    │ └────────────────────────────────────────────────────────────┘   │
                                    └────────────────────────────────────────────────────────────────────┘
[CfgSaveBar]
```

Con «Orario a turni» acceso, al posto dell'editor settimanale c'è una griglia di due campi: «Ore settimanali» e «Giorni di servizio a settimana».

### B.2.4 Elementi e testi

**Elemento dell'elenco** (`button.cfg-hrora__item`, uno per orario):

- nome dell'orario (`TruncatedText`);
- riga meta: «{ore} h · {giorni} giorni», più « · a turni» se l'orario è a turni;
- a destra la **mini-settimana**: 7 barrette verticali con la lettera del giorno sotto (L M M G V S D).

In fondo all'elenco c'è il pulsante «Nuovo orario» (`sib-btn sib-btn--secondary`, icona `fa-light fa-circle-plus`, centrato).

**Testa del dettaglio:**

- nome (oppure «Orario senza nome» se vuoto), con la meta «{ore} ore settimanali su {giorni} giorni»;
- a destra `HrRowActions`:
  - Modifica: porta il focus sul campo «Nome orario»;
  - Duplica;
  - Elimina.

**Campi del dettaglio:**

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| Nome | InputField `ora-nome`, `span 2` | «Nome orario» (obbligatorio) | placeholder «Es. Full time 40 h · 5 giorni» |
| Regime | SelectField `ora-regime` | «Regime» | opzioni «Full time», «Part time orizzontale», «Part time verticale», «Part time misto» |
| Flessibilità | InputField number `ora-flex`, min 0 | «Flessibilità (minuti)» | `Number(...) \|\| 0` |
| A turni | ToggleSwitch | «Orario a turni» | descrizione «Le fasce dei singoli giorni le assegna la Turnistica: qui si fissa solo il monte ore.» |
| Ore settimanali (solo a turni) | InputField number `ora-ore`, min 1, max 48 | «Ore settimanali» | |
| Giorni (solo a turni) | InputField number `ora-gg`, min 1, max 7 | «Giorni di servizio a settimana» | valore limitato a 7 mentre si scrive |

**Stato vuoto** (nessun orario): `CfgEmpty` con icona `business-time`, titolo «Nessun orario» e sottotitolo «Crea il primo orario di lavoro da assegnare ai dipendenti.».

**Editor settimanale (`SettimanaOrario`).**

Barra dei modelli: etichetta «Modelli rapidi», poi 4 chip:

| Chip | Effetto |
| --- | --- |
| «Lun–Ven 9–13 · 14–18» | Lun–Ven 09:00–13:00 e 14:00–18:00; Sab e Dom riposo |
| «Lun–Ven 8–16 continuato» | Lun–Ven 08:00–16:00; Sab e Dom riposo |
| «Lun–Sab 8–14:40» | Lun–Sab 08:00–14:40; Dom riposo |
| «Svuota» | tutti i giorni a riposo, senza fasce |

Ogni modello ha pausa 0.

Intestazione della griglia (`aria-hidden`): «Giorno» | «Fasce di lavoro (dalle – alle)» | «Pausa» | «Ore» (allineata a destra) | colonna vuota.

**Riga di un giorno** (Lun, Mar, Mer, Gio, Ven, Sab, Dom):

- **Pulsante del giorno**, con il nome abbreviato, `aria-pressed` e l'aria-label uguale al tooltip. Pieno blu se lavorativo, grigio se di riposo. Il pulsante sta dentro il componente `Tooltip` scuro (che lo avvolge in uno `span` inline-flex: il pulsante ha `flex:1 1 auto; width:100%` per riempire la colonna di 52px). Testo del tooltip:
  - giorno lavorativo: «Segna {Lun} come riposo»;
  - giorno di riposo: «Imposta l’orario di {Lun}».
- **Fasce**:
  - giorno di riposo: «Riposo», in corsivo, più il pulsante «Imposta orario» (`sib-btn--ghost sib-btn--sm`, icona `fa-light fa-circle-plus`);
  - giorno lavorativo: per ogni fascia un campo ora «dalle» (`DatePickerField type="time"`), il trattino «–», un campo ora «alle» e il pulsante × (`fa-solid fa-xmark`) con il Tooltip «Togli questa fascia» e l'aria-label «Togli la fascia {inizio}–{fine} di {Lun}»;
  - se le fasce sono meno di 4, il pulsante tratteggiato con icona `fa-light fa-plus` e testo «fascia».
- **Pausa** (solo nei giorni lavorativi): campo numerico denso, `min 0`, `step 5`, placeholder «0» (il valore 0 si mostra vuoto), aria-label «Pausa non retribuita di {Lun} in minuti», seguito dall'unità «min».
- **Ore**: le ore nette del giorno nel formato «8 h» oppure «7 h 30′» (con il carattere ′); «—» se il giorno è di riposo o le ore sono 0.
- **Azione**: pulsante icona `fa-solid fa-copy`, Tooltip «Copia {Lun} su altri giorni», aria-label «Copia {Lun}».
- **Barra grafica del giorno**, sotto, dalla seconda colonna in poi:
  - ore indicate ogni 2 ore («06», «08», …, «24»);
  - fasce notturne ombreggiate;
  - un blocco blu per ogni fascia, con il testo «09:00–13:00» se la fascia dura almeno 180 minuti, solo «09:00» tra 75 e 179 minuti, nessun testo sotto i 75;
  - aria-label del blocco «{Lun} dalle {inizio} alle {fine}».
- **Pannello «Copia su…»** (aperto dal pulsante copia):
  - testo «Copia {Lun} su»;
  - una casella per ciascuno degli altri 6 giorni, con il nome;
  - chip «Lun–Ven» e «Tutti»;
  - pulsante «Applica» (`sib-btn--primary sib-btn--sm`, disabilitato senza giorni scelti).

**Piede dell'editor:**

- a sinistra, con icona `fa-light fa-keyboard`: «Scrivi gli orari di ogni fascia, oppure trascina sulla barra del giorno: si disegna una fascia, si sposta, se ne allungano i bordi. Clic sul giorno = lavorativo / riposo.»;
- a destra: «Totale settimanale **{40 h}** su {5} giorni». I giorni contati sono quelli attivi con minuti maggiori di 0.

**Errori di una fascia**: bordo rosso sulla fascia e, prima del pulsante ×, un'icona `fa-solid fa-circle-exclamation` (13px, `--color-error`, `padding:0 2px`, cursore `help`, `role="img"` con l'aria-label uguale al messaggio) avvolta dal `Tooltip` scuro con il messaggio:

- «L’orario di fine deve essere dopo l’inizio»: inizio o fine vuoti, oppure fine ≤ inizio;
- «Si sovrappone a un’altra fascia».

### B.2.5 Stati e interazioni

**Selezione.**

- All'apertura è selezionato il primo orario salvato.
- Clic su un elemento dell'elenco: lo seleziona, con bordo `--color-primary` e anello di 1px.
- Se l'id selezionato non esiste più nella bozza si mostra il primo.

**Nuovo orario.**

- Aggiunge in coda un orario con id `nuovoId('ora')`, nome «Nuovo orario», regime «Full time», non a turni, 40 ore, 5 giorni, flessibilità 10, giorni del modello «Lun–Ven 9–13 · 14–18», e lo seleziona.
- Vale +1 nel contatore. Non c'è una modale: si modifica direttamente nel dettaglio.

**Duplica.** Copia profonda con id nuovo e nome «{nome} (copia)», in coda e selezionata.

**Elimina** → ConfirmDialog:

- titolo «Elimina orario»;
- messaggio «Eliminare l'orario «{nome}»?» (qui l'apostrofo è dritto, `'`);
- conferma «Elimina». La selezione passa al primo orario rimasto.

**Modifiche ai campi.** Ogni modifica cambia la bozza dell'orario selezionato, in tempo reale.

**«Orario a turni».** Commuta tra l'editor settimanale e i due campi del monte ore. Le fasce restano memorizzate anche se nascoste.

**Editor settimanale** (tutte le modifiche passano da `onChange` alla bozza):

- **Clic sul giorno**:
  - un giorno di riposo diventa lavorativo; se non ha fasce riceve 09:00–13:00 e 14:00–18:00;
  - un giorno lavorativo diventa di riposo, ma le fasce restano memorizzate: la barra del giorno va a opacità 0.45 e i blocchi diventano grigi.
- **«Imposta orario»**: equivale a riattivare il giorno.
- **Campi ora**: modificano inizio o fine della fascia. La validazione è visiva (bordo rosso e icona d'errore con il Tooltip) e non blocca il salvataggio.
- **×**: toglie la fascia. Se era l'ultima, il giorno diventa di riposo.
- **«+ fascia»**:
  - senza fasce: aggiunge 09:00–13:00;
  - con fasce: aggiunge una fascia di 4 ore che inizia 60 minuti dopo la fine più tarda, con inizio limitato a 23:00 e fine a 24:00;
  - se non c'è spazio: 23:00–24:00.
  - Il giorno diventa lavorativo.
- **Trascinamento sulla barra** (pointer events, cursore `crosshair`, `touch-action:none`), con scatti di **15 minuti**:
  - premere su uno spazio vuoto e trascinare disegna una nuova fascia, mostrata come «fantasma» semitrasparente con il testo «HH:MM–HH:MM», limitata tra la fascia precedente e la successiva;
  - un clic senza trascinare (spostamento ≤ 4 minuti di scala) crea una fascia di **1 ora** dal punto cliccato, compressa nello spazio libero;
  - se lo spazio libero è meno di 15 minuti non si crea nulla;
  - le fasce create vengono ordinate per inizio e la nuova resta selezionata.
- **Trascinare un blocco**: lo sposta (cursore `grab`) senza sovrapporlo alle fasce vicine.
- **Trascinare le maniglie** (8px ai due bordi, cursore `ew-resize`): cambia l'inizio o la fine, con una durata minima di 15 minuti.
- **Tastiera su un blocco a fuoco** (il blocco ha `tabIndex 0`):
  - **←/→**: sposta la fascia di 15 minuti;
  - **Maiusc + ←/→**: cambia la fine di ±15 minuti (minimo 15 minuti di durata);
  - **Canc o Backspace**: la elimina;
  - prendere il fuoco seleziona il blocco.
- **Finestra visibile della barra**:
  - di default dalle 06:00 alle 24:00;
  - se una fascia inizia prima delle 6, la finestra parte dall'ora pari arrotondata per difetto (`floor(inizio/120)·120`), fino alle 00:00.
  - Le linee verticali sono una ogni ora; i numeri ogni 2 ore.
- **Copia su…**:
  - il pulsante copia apre il pannello del giorno; ripremerlo lo chiude;
  - le caselle scelgono i giorni di destinazione, il chip «Lun–Ven» sceglie Lun–Ven escluso il giorno di origine, «Tutti» sceglie tutti tranne l'origine;
  - «Applica» copia stato attivo, pausa e fasce sui giorni scelti e chiude il pannello.
- **Modelli rapidi**: sostituiscono l'intera settimana e tolgono la selezione.

**Salva.** Prima di scrivere nello store ogni orario viene **normalizzato** (funzione `normalizza`):

- le fasce con `fine ≤ inizio` vengono scartate (confronto di stringhe HH:MM);
- un nome vuoto diventa «Orario senza nome»;
- se l'orario non è a turni, `oreSettimanali` e `giorniSettimana` si ricalcolano dalle fasce.

Dopo il salvataggio la bozza si **riallinea** ai dati normalizzati (A.5): le fasce scartate spariscono anche dall'editor, il nome appare ripulito e la barra non ricompare.

### B.2.6 Dati e regole di business

**Entità `OrarioHr`:**

| Campo | Tipo | Note |
| --- | --- | --- |
| `id` | string | |
| `nome` | string | |
| `regime` | `'full-time' \| 'part-time-orizzontale' \| 'part-time-verticale' \| 'part-time-misto'` | |
| `aTurni` | boolean | |
| `oreSettimanali` | number | |
| `giorniSettimana` | number | |
| `giorni` | `FasciaGiorno[7]` | da Lun a Dom |
| `flessibilitaMin` | number | |

`FasciaGiorno = { attivo: boolean; fasce: {inizio:'HH:MM', fine:'HH:MM'}[]; pausaMin: number }`.

**Formule:**

- `durataMin(inizio, fine)` = minuti di `fine − inizio`; se il risultato è negativo si somma 1440 (attraversamento della mezzanotte). Con un valore vuoto vale 0.
- `minutiGiorno(f)` = `f.attivo ? max(0, Σ durataMin(fasce) − pausaMin) : 0`.
- `oreSettimanaliOrario(o)` = `o.aTurni ? o.oreSettimanali : round(Σ minutiGiorno/60 × 100)/100`.
- `giorniLavorativiOrario(o)` = `o.aTurni ? o.giorniSettimana : numero di giorni con attivo = true`. Nell'elenco e nella testa conta anche un giorno attivo senza ore; nel totale del piede contano solo i giorni con minuti maggiori di 0.
- Formato delle ore nell'elenco e nella testa (`fmtOre`): gli interi così come sono («40»); altrimenti 2 decimali con la virgola e lo zero finale tolto («37,5»).
- **Mini-settimana**, altezza della barretta del giorno i = `min(100, ore/10 × 100)%`, dove:
  - per un orario a turni `ore = i < giorniSettimana ? oreSettimanali / max(1, giorniSettimana) : 0`, con colore `--color-primary-300`;
  - altrimenti `ore = minutiGiorno(giorni[i]) / 60`, con colore `--color-primary`.
- **Completamento**: `configured` se c'è almeno un orario, altrimenti `empty`.

**Seed (6 orari):**

| id | Nome | Regime | A turni | Giorni (Lun→Dom) | Pausa | Flessibilità | Meta nell'elenco |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ora-ft5 | «Full time 40 h · 5 giorni» | full-time | no | Lun–Ven 09:00–13:00 + 14:00–18:00; Sab e Dom riposo | 0 | 15 | 40 h · 5 giorni |
| ora-ft6 | «Full time 40 h · 6 giorni» | full-time | no | Lun–Sab 08:00–15:10; Dom riposo | 30 | 10 | 40 h · 6 giorni |
| ora-ftsab | «Full time 40 h · sabato mattina» | full-time | no | Lun–Ven 08:30–12:30 + 13:30–17:00; Sab 08:30–11:00; Dom riposo | 0 | 10 | 40 h · 6 giorni |
| ora-tur | «Turnista 40 h · 6 giorni» | full-time | **sì** (40 ore, 6 giorni) | tutti riposo | 0 | 0 | 40 h · 6 giorni · a turni |
| ora-pt30 | «Part time 30 h orizzontale» | part-time-orizzontale | no | Lun–Ven 09:00–15:00 | 0 | 10 | 30 h · 5 giorni |
| ora-pt24 | «Part time 24 h verticale» | part-time-verticale | no | Lun–Mer 08:00–16:30; Gio–Dom riposo | 30 | 10 | 24 h · 3 giorni |

Persistenza: `sibylla.hr-config` → `orari`. Dalla versione 4 la migrazione converte le giornate del vecchio formato con `normalizzaGiorno`.

### B.2.7 Backend da realizzare

`PUT /Sibylla/hr/config/orari` con l'intero elenco.

- Il server applica la **stessa normalizzazione** del frontend: scarta le fasce con fine ≤ inizio, sostituisce un nome vuoto con «Orario senza nome», ricalcola ore e giorni quando `aTurni = false`. Restituisce gli orari normalizzati, che il frontend deve rimettere nella bozza.

```json
{ "version": 4, "orari": [ { "id": "ora-ft5", "nome": "Full time 40 h · 5 giorni", "regime": "full-time",
  "aTurni": false, "oreSettimanali": 40, "giorniSettimana": 5, "flessibilitaMin": 15,
  "giorni": [ { "attivo": true, "pausaMin": 0, "fasce": [ {"inizio":"09:00","fine":"13:00"}, {"inizio":"14:00","fine":"18:00"} ] }, … ] } ] }
```

**Validazione (400):**

- `giorni` lungo esattamente 7;
- al massimo 4 fasce per giorno;
- fasce dello stesso giorno non sovrapposte;
- `oreSettimanali` tra 1 e 48 e `giorniSettimana` tra 1 e 7 quando `aTurni`;
- `pausaMin` ≥ 0 e `flessibilitaMin` ≥ 0.

Messaggi coerenti con il frontend: «L’orario di fine deve essere dopo l’inizio», «Si sovrappone a un’altra fascia».

**Consigliato**: impedire l'eliminazione di orari assegnati a contratti vigenti, oppure eliminarli in modo logico. Oggi non è impedita.

### B.2.8 Stile

**Elenco:**

| Selettore | Valori |
| --- | --- |
| `.cfg-hrora` | `flex column; gap:12px; font-size:13px` |
| `__layout` | `display:grid; grid-template-columns:270px minmax(0,1fr); gap:18px; align-items:start` |
| `__list` | `flex column; gap:8px` |
| `__item` | `display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; text-align:left; background:--color-surface; border:1px solid --color-border; border-radius:--radius-md (6px); cursor:pointer; transition: border-color 150ms, box-shadow 150ms (cubic-bezier(0.4,0,0.2,1))` |
| `__item:hover` | `border-color:--color-primary-300` |
| `__item.is-active` | `border-color:--color-primary; box-shadow:0 0 0 1px --color-primary` |
| `__item-text` | `flex column; flex:1; min-width:0; gap:2px` |
| `__item-name` | peso 600, `--color-text-active` |
| `__item-meta` | 11px, `--color-text-inactive` |
| `__list .cfg-hrora__add` | `justify-content:center` |

**Mini-settimana:**

| Selettore | Valori |
| --- | --- |
| `__mini` | `flex; align-items:flex-end; gap:3px; flex-shrink:0` |
| `__mini-day` | `flex column; align-items:center; gap:2px` |
| `__mini-bar` | `position:relative; width:7px; height:24px; border-radius:2px; background:--color-bg; overflow:hidden` |
| `__mini-bar::after` | riempimento dal basso `height:var(--h)`, `background:--color-primary`, `border-radius:2px` |
| `__mini-bar.is-turni::after` | `background:--color-primary-300` |
| `__mini-lbl` | `font-size:9px; line-height:1; --color-text-inactive` |

**Dettaglio:**

| Selettore | Valori |
| --- | --- |
| `__detail` | `flex column; gap:14px; min-width:0; padding:16px 18px 18px; background:--color-surface; border:1px solid --color-border; border-radius:6px` |
| `__head` | `flex; align-items:center; justify-content:space-between; gap:12px` |
| `__head-name` | Poppins 15px, peso 600, `--color-text-active` |
| `__head-meta` | 12px, `--color-text-inactive` |
| `__grid` | `display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:14px` |
| `__span2` | `grid-column:span 2` |

**Editor settimanale (`.sett-ora`).** Le posizioni dei blocchi arrivano come custom properties `--a` (inizio in %) e `--w` (durata in %).

Barra dei modelli:

| Selettore | Valori |
| --- | --- |
| `.sett-ora` | `flex column; gap:12px; user-select:none` |
| `__toolbar` | `flex; align-items:center; flex-wrap:wrap; gap:6px` |
| `__label` | `margin-right:4px`, Poppins 12px, peso 600, `--color-primary` |
| `__chip` | `height:28px; padding:0 12px; border:1px solid --color-border; border-radius:14px; background:--color-surface; font-size:12px; color:--color-text-active`; hover `border-color:--color-primary-300; background:--color-primary-50`; transizione di bordo e sfondo 150ms |

Griglia dei giorni:

| Selettore | Valori |
| --- | --- |
| `__grid` | `flex column; padding:4px 14px 8px; border:1px solid --color-border; border-radius:6px; background:--color-surface` |
| `__head`, `__row` | `display:grid; grid-template-columns:52px minmax(0,1fr) 84px 56px 32px; column-gap:10px; align-items:center` |
| `__head` | `padding:8px 0; border-bottom:1px solid --color-border`, Poppins 12px, peso 600, `--color-primary`; 4ª colonna allineata a destra |
| `__row` | `position:relative; row-gap:6px; padding:10px 0; border-bottom:1px solid alpha(border,.7)`; l'ultima senza bordo; `.is-off .sett-ora__track { opacity:.45 }` |
| `__day` | `height:34px; border:1px solid --color-border; border-radius:6px; background:--color-bg`, Poppins 12.5px, peso 600, `--color-text-inactive`, `transition: all 150ms` |
| `__day.is-on` | `color:--color-surface (bianco); background:--color-primary; border-color:--color-primary` |

Fasce scritte a mano:

| Selettore | Valori |
| --- | --- |
| `__fasce` | `flex; align-items:center; flex-wrap:wrap; gap:6px; min-width:0` |
| `__fascia` | `inline-flex; gap:3px; padding:2px; border:1px solid --color-border; border-radius:6px; background:--color-bg`; `.is-sel` bordo `--color-primary-300`; `.is-err` bordo `--color-error` `#FF616E` con sfondo `alpha(error,.05)` |
| `__fascia .sett-ora__time` | `width:92px`; nel suo `.sib-input`: `padding-left:8px; padding-right:4px` |
| `__dash` | `--color-text-inactive` |
| `__x` | `22×22px; border:0; border-radius:50%; transparent; --color-text-inactive`; hover `color:--color-error; background:alpha(error,.08)` |
| `__add` | `inline-flex; gap:5px; height:30px; padding:0 10px; border:1px dashed --color-primary-300; border-radius:6px; transparent; 12px; peso 600; --color-primary`; hover `--color-primary-50` |
| `__riposo` | `inline-flex; gap:10px; 12.5px; italic; --color-text-inactive` |
| `__pausa` | `flex; align-items:center; gap:4px`; il primo figlio `flex:1; min-width:0` |
| `__unit` | 11.5px, `--color-text-inactive` |
| `__ore` | 12.5px, peso 600, `--color-text-active`, a destra, `tabular-nums`, `nowrap` |

Barra grafica del giorno:

| Selettore | Valori |
| --- | --- |
| `__track` | `grid-column:2 / -1; position:relative; height:30px; border-radius:6px; background-color:--color-bg; border:1px solid --color-border; cursor:crosshair; touch-action:none; overflow:hidden`; linee orarie `background-image: repeating-linear-gradient(to right, transparent 0, transparent calc(100%/var(--ore) - 1px), alpha(border,.9) calc(100%/var(--ore) - 1px), alpha(border,.9) calc(100%/var(--ore)))`, dove `--ore` = ore visibili |
| `__tick` | `position:absolute; top:1px; left:var(--x); transform:translateX(3px); 9px; line-height:1; --color-text-inactive; pointer-events:none` |
| `__notte` | `position:absolute; top:0; bottom:0; background:alpha(primary,.05)`; `--a` a sinistra con larghezza `--notte-a` (dall'inizio della finestra alle 06); `--b` a destra con larghezza `--notte-b` (22–24) |
| `__block` | `position:absolute; top:11px; bottom:3px; left:var(--a); width:var(--w); min-width:6px; flex center; border-radius:6px; background:--color-primary; color:--color-surface; 11px; peso 600; cursor:grab; box-shadow:0 1px 2px alpha(primary-900,.25); transition: box-shadow 150ms, background 150ms` |
| `__block:hover` | `background:--color-primary-700` (`#43617c`) |
| `__block:focus-visible`, `__block.is-sel` | `outline:none; box-shadow:0 0 0 2px --color-surface, 0 0 0 4px --color-primary-300` |
| `__block.is-muted` | `background:--color-text-disabled` |
| `__block.is-ghost` | `background:alpha(primary,.35); border:1px dashed --color-primary; pointer-events:none` |
| `__block-txt` | `padding:0 8px; nowrap; ellipsis; tabular-nums; pointer-events:none` |
| `__handle` | `absolute; top:0; bottom:0; width:8px; cursor:ew-resize`; `--a` a sinistra, `--b` a destra; `::after` = tacca `top:30%; bottom:30%; left:3px; width:2px; border-radius:1px; background:alpha(surface,.7)` |

Copia su… e piede:

| Selettore | Valori |
| --- | --- |
| `__copy` | `grid-column:1 / -1; flex; wrap; gap:6px; padding:8px 10px; border:1px dashed --color-primary-300; border-radius:6px; background:--color-primary-50; 12px; --color-text-active` |
| `__copy-day` | `inline-flex; gap:4px; height:26px; padding:0 10px; border:1px solid --color-border; border-radius:13px; background:--color-surface; cursor:pointer`; checkbox `accent-color:--color-primary`; `.is-on` bordo e testo `--color-primary`, peso 600 |
| `__foot` | `flex; justify-content:space-between; gap:12px; wrap` |
| `__hint` | `flex; gap:8px; 12px; --color-text-inactive`; icona `--color-primary` |
| `__total` | 12.5px, `--color-text-inactive`, a destra, `nowrap`; `strong` in `--color-text-active` |

### B.2.9 Responsività

- `@container (max-width: 980px)`, misurato sul pannello `.cfg-hrora`:
  - il layout diventa una colonna;
  - l'elenco diventa una riga che va a capo (`flex-direction:row; flex-wrap:wrap`), con elementi `width:auto; flex:1 1 240px`;
  - la griglia dei campi passa a 2 colonne.
- `@container (max-width: 560px)`: la griglia dei campi passa a 1 colonna e `__span2` torna a `grid-column:auto`.
- Editor settimanale, `@media (max-width: 760px)` sul **viewport**:
  - l'intestazione della griglia si nasconde;
  - le righe diventano `48px minmax(0,1fr) 56px 28px`;
  - la colonna della pausa si sposta in `grid-column:2 / 3`.

### B.2.10 Effetti e animazioni

- Transizioni di bordo e ombra degli elementi dell'elenco (150ms).
- Blocchi della barra: transizioni di ombra e sfondo (150ms); il blocco fantasma durante il disegno.
- Il pulsante del giorno ha `transition: all 150ms`.
- Nessuna animazione d'ingresso specifica: vale quella comune della scheda (A.10).

### B.2.11 Accessibilità

- La griglia ha `role="group"` e `aria-label` «Orario settimanale».
- Il pulsante del giorno ha `aria-pressed`.
- I blocchi sono `role="button"` con `tabIndex 0`, l'aria-label «{giorno} dalle {inizio} alle {fine}» e la tastiera descritta in B.2.5.
- La mini-settimana è decorativa (`aria-hidden`).
- Il campo della pausa ha un aria-label esplicito.
- Il pulsante del giorno e l'icona d'errore della fascia usano il `Tooltip` scuro standard (sfondo #1E293B, testo bianco), che compare anche al fuoco da tastiera sul pulsante; l'aria-label ripete il testo.

### B.2.12 Criteri di accettazione

1. L'elenco mostra 6 orari con le meta di B.2.6; «Turnista 40 h · 6 giorni» mostra « · a turni» e le barrette chiare sui primi 6 giorni.
2. Il primo orario è selezionato e la testa dice «40 ore settimanali su 5 giorni».
3. Le barre dei giorni vanno dalle 06 alle 24, con i numeri «06 08 … 24» e le zone 22–24 e prima delle 06 ombreggiate.
4. Trascinando su Sab dalle 09:00 alle 12:00 compare il fantasma «09:00–12:00»; al rilascio Sab diventa lavorativo con la fascia 09:00–12:00 e le ore «3 h».
5. Un clic singolo su uno spazio vuoto crea una fascia di 1 ora.
6. Con il fuoco su un blocco, → lo sposta di 15 minuti, Maiusc+→ allunga la fine di 15 minuti, Canc lo elimina.
7. Scrivendo una fine uguale all'inizio la fascia ha il bordo rosso e l'icona d'errore; al passaggio del mouse sull'icona il Tooltip scuro dice «L’orario di fine deve essere dopo l’inizio». Passando sul pulsante «Lun» il Tooltip scuro dice «Segna Lun come riposo». Nessun pulsante o fascia della scheda usa `title`.
8. «Copia» su Lun → «Lun–Ven» → «Applica» copia le fasce del lunedì da Mar a Ven.
9. «Nuovo orario» aggiunge «Nuovo orario» con il modello 9–13 · 14–18 e la barra conta +1.
10. Accendendo «Orario a turni» l'editor è sostituito da «Ore settimanali» e «Giorni di servizio a settimana»; scrivendo 9 nei giorni il valore diventa 7.
11. Elimina chiede «Elimina orario» / «Eliminare l'orario «…»?».
12. Sotto i 980px di larghezza del pannello l'elenco va sopra il dettaglio, in schede affiancate da almeno 240px.
13. Sotto i 760px di viewport l'intestazione della griglia sparisce.
14. Salvando compare il toast «Orari di lavoro salvati».
15. Aggiungendo due spazi in coda al nome la barra dice «1 modifica non salvata»; dopo «Salva» la barra sparisce e **non** ricompare, e il nome è senza spazi.

### B.2.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrOrari/HrOrari.tsx`, `HrOrari.sass`
- `src/modules/impostazioni/Configuratore/panes/HrOrari/SettimanaOrario.tsx`, `SettimanaOrario.sass`
- `src/store/useHrConfigStore.ts` (`OrarioHr`, `FasciaGiorno`, `SEED_ORARI`, `durataMin`, `minutiGiorno`, `oreSettimanaliOrario`, `giorniLavorativiOrario`, `normalizzaGiorno`, `REGIMI_ORARIO`, `GIORNI_SETTIMANA`)

---

## B.3 · Turnistica (`hr-turnistica`)

### B.3.1 Scopo e utenti

La scheda ha due parti:

1. i **turni di servizio**: sigla, nome, fascia (anche spezzata), pausa, colore e reparti in cui il turno si può usare. Il turno notturno è riconosciuto in automatico;
2. gli **schemi di rotazione**: sequenze cicliche di turni e riposi (per esempio M‑M‑P‑P‑N‑N‑R‑R), che si assegnano al dipendente nella sua scheda (Crea anagrafica) e servono a Turni del personale.

Lo usa l'ufficio del personale.

### B.3.2 Accesso

- Scheda 3. Deep link `hr-configurazione:hr-turnistica`.
- Non ci sono navigazioni in uscita.
- Legge i reparti di `useHrConfigStore`, quelli **salvati**, non la bozza della scheda Reparti.

### B.3.3 Layout

```
.cfg-hrtur.cfg-hr-pane (flex column · gap 22px · 13px)
section.__section (flex col · gap 10)
┌ CfgToolbar ─────────────────────────────────────────────────────────────────┐
│ Turni di servizio (h3 14px)                                  [⊕ Nuovo turno]│
│ Le fasce orarie con cui si compongono…  (12.5px)                            │
└─────────────────────────────────────────────────────────────────────────────┘
┌ CfgTable ───────────────────────────────────────────────────────────────────┐
│Sigla 8%│Turno 18%│Fasce orarie 22%│Ore nette 10%▸│Tipo 11%│Reparti 19%│Azioni 12%▸│
│ [M]    │ Mattina │ 07:00–15:00    │      7,5 h │(Diurno)│Tutti i reparti│ ✎ 🗑 │
│ [N]    │ Notte   │ 23:00–07:00    │      7,5 h │(☾ Notturno)│Front office│ ✎ 🗑 │
└─────────────────────────────────────────────────────────────────────────────┘
section.__section
┌ CfgToolbar ─────────────────────────────────────────────────────────────────┐
│ Schemi di rotazione                                         [⊕ Nuovo schema]│
│ Cicli di turni e riposi che si ripetono…                                    │
└─────────────────────────────────────────────────────────────────────────────┘
.__schemi (grid auto-fill minmax(320px,1fr) · gap 14)
┌ article.__schema ────────────────┐ ┌──────────────────────────┐ ┌─────────┐
│ Ciclo continuo 3 turni     ✎ 🗑  │ │ Rotazione 6+1 M/P   ✎ 🗑 │ │ …       │
│ Due mattine, due pomeriggi…      │ │ …                        │ │         │
│ [M][M][P][P][N][N][R][R]          │ │ [M]×6 [R] [P]×6 [R]      │ │         │
│ ──────────────────────────────── │ │ ──────────────────────── │ │         │
│ Ciclo di 8 giorni · 6 lavorati,… │ │ …                        │ │         │
└──────────────────────────────────┘ └──────────────────────────┘ └─────────┘
[CfgSaveBar]
```

**Modale del turno (md, 600px):**

```
[Sigla*] [Nome turno*]
[Inizio] [Fine] [Pausa (minuti)]
[toggle] Turno spezzato
  [Inizio seconda fascia] [Fine seconda fascia]   (solo se spezzato)
[Reparti in cui si usa  ▾ multiselect]
Colore ● ● ● ● ● ● ● ●
Ore nette: 7,5 h · turno notturno (…)
```

**Modale dello schema (lg, 860px):**

```
[Nome schema*]
[Descrizione (textarea 2)]
Componi il ciclo
 ([M] Mattina) ([P] Pomeriggio) ([N] Notte) ([S] Spezzato) ([C] Centrale) ([R] Riposo)
┌ sequenza (tratteggiata) ─────────────────────────────────┐
│ [M][M][P][P][N][N][R][R]   (clic su un chip = lo toglie) │
└──────────────────────────────────────────────────────────┘
[⌫ Svuota ciclo]
```

### B.3.4 Elementi e testi

**Sezione dei turni.**

- Titolo h3 «Turni di servizio».
- Descrizione «Le fasce orarie con cui si compongono gli schemi e i turni settimanali del personale.».
- Pulsante «Nuovo turno» (`sib-btn--primary`, icona `fa-light fa-circle-plus`).

**Colonne della tabella dei turni:**

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Sigla» | 8% | chip della sigla, nel colore del turno; «?» se la sigla è vuota |
| «Turno» | 18% | nome in grassetto (`TruncatedText`) |
| «Fasce orarie» | 22% | «07:00–15:00», oppure per lo spezzato «10:00–14:00 / 18:00–22:00» |
| «Ore nette» | 10%, a destra | «7,5 h», «8 h» |
| «Tipo» | 11% | badge «Notturno» (con icona `fa-solid fa-moon`), oppure «Spezzato» se c'è la seconda fascia, oppure «Diurno» |
| «Reparti» | 19% | nomi separati da «, », oppure «Tutti i reparti» |
| «Azioni» | 12%, a destra | Modifica ed Elimina |

La tabella vuota ha il testo di default «Nessun elemento configurato».

**Sezione degli schemi.**

- Titolo «Schemi di rotazione».
- Descrizione «Cicli di turni e riposi che si ripetono: si assegnano al dipendente nella sua scheda.».
- Pulsante «Nuovo schema» (`sib-btn--secondary`, stessa icona), **disabilitato se non esistono turni**.
- Senza schemi: paragrafo «Nessuno schema di rotazione.».
- Scheda di uno schema:
  - testa con nome e azioni Modifica/Elimina;
  - descrizione, se presente;
  - la sequenza di chip piccoli;
  - il piede: «Ciclo di {n} giorni · {lavorati} lavorati, {riposi} di riposo · ≈ {ore} h/sett.».

Il chip del **riposo** mostra «R», in grigio tratteggiato.

**Modale del turno.**

- Titolo «Nuovo turno» oppure «Modifica turno».
- Conferma «Crea turno» oppure «Salva modifiche».

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| Sigla | InputField `tur-sigla` | «Sigla» (obbligatorio) | `maxLength 3`, convertita in maiuscolo mentre si scrive; placeholder «Es. M»; errore «Sigla già usata» |
| Nome | InputField `tur-nome` | «Nome turno» (obbligatorio) | placeholder «Es. Mattina» |
| Inizio | DatePickerField time `tur-in` | «Inizio» | default 08:00 |
| Fine | DatePickerField time `tur-out` | «Fine» | default 16:00 |
| Pausa | InputField number `tur-pausa`, min 0, step 5 | «Pausa (minuti)» | default 30 |
| Spezzato | ToggleSwitch | «Turno spezzato» | descrizione «Aggiunge una seconda fascia nella stessa giornata.»; all'accensione la seconda fascia, se assente, vale 18:00–22:00 |
| Seconda fascia | 2 × DatePickerField time `tur-in2`/`tur-out2` | «Inizio seconda fascia», «Fine seconda fascia» | solo se spezzato |
| Reparti | CfgMultiSelect | «Reparti in cui si usa» | placeholder «Tutti i reparti», `nomePlurale` «reparti»; opzioni = nomi dei reparti **attivi** salvati |
| Colore | HrColorPicker | «Colore» | default 1 |
| Riepilogo | `p.hrcfg-modal__hint` | «Ore nette: **{x} h**» | se notturno si aggiunge « · turno notturno (almeno 3 ore tra le 22 e le 6): si applica la maggiorazione del CCNL» |

**Modale dello schema.**

- Titolo «Nuovo schema di rotazione» oppure «Modifica schema di rotazione».
- Conferma «Crea schema» oppure «Salva modifiche».

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| Nome | InputField `sch-nome` | «Nome schema» (obbligatorio) | placeholder «Es. Ciclo continuo 3 turni» |
| Descrizione | TextareaField `sch-desc`, 2 righe | «Descrizione» | |
| Ciclo | builder | etichetta «Componi il ciclo» | una tavolozza di pulsanti, uno per turno (chip della sigla + nome) più «Riposo» con il chip R |

Sotto la tavolozza c'è la **sequenza**:

- vuota: «Aggiungi turni e riposi nell’ordine del ciclo.»;
- ogni chip è un pulsante con il Tooltip «Giorno {i} — clic per togliere».

Se la sequenza non è vuota compare il pulsante «Svuota ciclo» (`sib-btn--ghost sib-btn--sm`, icona `fa-light fa-eraser`).

### B.3.5 Stati e interazioni

**Nuovo turno.** Modale con sigla vuota, nome vuoto, 08:00–16:00, pausa 30, colore 1, tutti i reparti, non spezzato.

**Modifica.** Copia del turno; lo stato «spezzato» vale vero se c'è `inizio2`.

**Conferma del turno** (abilitata se nome e sigla, dopo `trim`, non sono vuoti e la sigla non è doppia):

- la sigla passa da `trim` e diventa maiuscola, il nome passa da `trim`;
- se il turno non è spezzato, `inizio2` e `fine2` vengono tolti;
- un turno nuovo prende l'id `nuovoId('tur')` e va in coda.

**Sigla doppia**: un altro turno (id diverso) con la stessa sigla in maiuscolo.

**Reparti.** La multiselect lavora sui **nomi**; alla scelta i nomi vengono convertiti negli id dei reparti salvati. Nessun reparto scelto significa «tutti».

**Elimina turno** → ConfirmDialog «Elimina turno»:

- se il turno è usato in uno o più schemi: «Il turno «{nome}» è usato in {n} schemi di rotazione ({nomi separati da «, »}): eliminandolo verrà tolto anche dalle loro sequenze.»;
- altrimenti: «Eliminare il turno «{nome}»?».

Con la conferma «Elimina» il turno esce dalla bozza e il suo id viene tolto da tutte le sequenze. Il conteggio della barra somma turni e schemi cambiati.

**Nuovo schema.** Modale con nome, descrizione e sequenza vuoti.

- Clic su un pulsante della tavolozza: aggiunge l'id del turno, oppure `'R'`, in fondo alla sequenza.
- Clic su un chip della sequenza: lo toglie da quella posizione.
- «Svuota ciclo» svuota la sequenza.
- La conferma è abilitata se il nome non è vuoto e la sequenza ha almeno un elemento.

**Elimina schema** → «Elimina schema» / «Eliminare lo schema di rotazione «{nome}»?» / «Elimina».

**Ordine.** Quello di inserimento. Non ci sono filtri né paginazione.

### B.3.6 Dati e regole di business

**Entità:**

- `TurnoHr { id, sigla, nome, inizio, fine, inizio2?, fine2?, pausaMin, colore 1..8, reparti: string[] /* id reparti; vuoto = tutti */ }`;
- `SchemaTurniHr { id, nome, descrizione, sequenza: string[] /* id turno oppure 'R' */ }`.

**Formule:**

- `oreTurno(t)` = `max(0, durataMin(inizio, fine) + durataMin(inizio2, fine2) − pausaMin) / 60`. `durataMin` gestisce la mezzanotte: per esempio 23:00–07:00 = 480 minuti.
- `turnoNotturno(t)`: si scorrono **entrambe le fasce** (la seconda solo se il turno è spezzato) a passi di 15 minuti e si contano i minuti in cui l'ora (modulo 24) è ≥ 22 oppure < 6. Il turno è notturno se la **somma** è ≥ **180** minuti, cioè almeno 3 ore: è la soglia del lavoratore notturno (D.Lgs. 66/2003), la stessa del testo della modale. Codice e commento dicono la stessa cosa.
  - Esempio: spezzato 18:00–20:00 / 22:00–01:00 → 0 + 180 minuti = notturno. Con il seed nessun turno cambia tipo: lo Spezzato 10:00–14:00 / 18:00–22:00 ha 0 minuti notturni.
- Tipo mostrato in tabella: Notturno se `turnoNotturno`, altrimenti Spezzato se c'è `inizio2`, altrimenti Diurno.
- Formato delle ore (`fmtOre`): gli interi così come sono, altrimenti 1 decimale con la virgola («7,5»).
- Piede dello schema:
  - `lavorati` = elementi diversi da 'R';
  - `ore` = Σ `oreTurno` dei turni (un id inesistente vale come il turno vuoto 08:00–16:00 con pausa 30, cioè 7,5 h);
  - `oreSett = (ore / lunghezza) × 7`, formattate con `fmtOre`.
- **Completamento**: `configured` se ci sono almeno un turno **e** uno schema; `partial` se ci sono solo turni; `empty` se non ci sono turni.

**Seed dei turni (5):**

| id | Sigla | Nome | Fasce | Pausa | Colore | Reparti | Ore nette | Tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tur-m | M | Mattina | 07:00–15:00 | 30 | 1 | tutti | 7,5 h | Diurno |
| tur-p | P | Pomeriggio | 15:00–23:00 | 30 | 3 | tutti | 7,5 h | Diurno (solo 1 ora notturna) |
| tur-n | N | Notte | 23:00–07:00 | 30 | 6 | rep-fo (Front office) | 7,5 h | Notturno |
| tur-s | S | Spezzato | 10:00–14:00 / 18:00–22:00 | 0 | 5 | rep-fb, rep-cuc (F&B, Cucina) | 8 h | Spezzato |
| tur-c | C | Centrale | 09:00–17:00 | 60 | 2 | rep-hk, rep-amm (Housekeeping, Amministrazione) | 7 h | Diurno |

**Seed degli schemi (3):**

| id | Nome | Descrizione | Sequenza | Piede |
| --- | --- | --- | --- | --- |
| sch-cc | Ciclo continuo 3 turni | «Due mattine, due pomeriggi, due notti, due riposi: copre le 24 ore del ricevimento.» | M M P P N N R R | Ciclo di 8 giorni · 6 lavorati, 2 di riposo · ≈ 39,4 h/sett. |
| sch-61 | Rotazione 6+1 M/P | «Settimana di mattine e settimana di pomeriggi alternate, un riposo a settimana.» | M×6 R P×6 R | Ciclo di 14 giorni · 12 lavorati, 2 di riposo · ≈ 45 h/sett. |
| sch-52 | Centrale 5+2 | «Cinque giorni sul turno centrale, sabato e domenica di riposo.» | C×5 R R | Ciclo di 7 giorni · 5 lavorati, 2 di riposo · ≈ 35 h/sett. |

Persistenza: `sibylla.hr-config` → `turni` e `schemi` (scritti insieme da `setTurnistica`).

### B.3.7 Backend da realizzare

`PUT /Sibylla/hr/config/turnistica` con `{ version, turni, schemi }`, in una sola transazione: l'eliminazione di un turno tocca anche gli schemi.

**Validazione (400):**

- `sigla` obbligatoria, univoca senza distinzione tra maiuscole e minuscole, lunga al massimo 3 caratteri: altrimenti `{ "fields": { "turni[2].sigla": "Sigla già usata" } }`;
- `nome` obbligatorio;
- orari nel formato HH:MM;
- `pausaMin` ≥ 0;
- `reparti` composto da id di reparti esistenti;
- ogni schema con `nome` e una `sequenza` non vuota fatta di id di turni esistenti oppure di `'R'`.

Il server deve rifiutare uno schema che referenzia un turno inesistente, oppure ripulirlo come fa il frontend all'eliminazione.

**Consigliato**: segnalare (409) l'eliminazione di un turno o di uno schema in uso in Turni del personale o assegnato a dipendenti. Oggi il frontend non lo controlla.

### B.3.8 Stile

**Sezioni e tabella:**

| Selettore | Valori |
| --- | --- |
| `.cfg-hrtur` | `flex column; gap:22px; font-size:13px` |
| `__section` | `flex column; gap:10px` |
| `__title` | `margin:0`, Poppins 14px, peso 600, `--color-text-active` |
| `__desc` | `margin:2px 0 0; 12.5px; --color-text-inactive` |
| `__empty` | `margin:0; 12.5px; --color-text-inactive` |
| `__name` | peso 600, `--color-text-active` |
| `__num` | a destra, `tabular-nums` |
| `__actions` | a destra, `nowrap` |

**Chip e badge:**

| Selettore | Valori |
| --- | --- |
| `__chip` | `inline-flex; center; min-width:28px; height:24px; padding:0 6px; border-radius:--radius-sm (4px); 12px; peso 700; color:--color-surface (bianco)`; sfondo `var(--chart-N)` secondo `data-col` |
| `__chip--sm` | `min-width:22px; height:20px; 11px` |
| `__chip--riposo` | `color:--color-text-inactive; background:--color-bg; border:1px dashed --color-border` |
| `__badge` | `inline-flex; gap:5px; height:22px; padding:0 9px; border-radius:11px; 11px; peso 600; color:--color-text-inactive; background:alpha(text-inactive,.1); nowrap` |
| `__badge--notte` | `color:--color-primary; background:--color-primary-50` |

**Schede degli schemi:**

| Selettore | Valori |
| --- | --- |
| `__schemi` | `display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px` |
| `__schema` | `flex column; gap:8px; padding:14px 16px; background:--color-surface; border:1px solid --color-border; border-radius:6px; box-shadow:--shadow-sm (0 1px 4px rgba(32,71,105,.08))` |
| `__schema-head` | `flex; space-between; gap:10px; min-width:0` |
| `__schema-foot` | `padding-top:8px; border-top:1px solid --color-border; 11.5px; --color-text-inactive` |
| `__seq` | `flex; wrap; gap:4px` |
| `__seq--edit` | `min-height:44px; padding:10px; border:1px dashed --color-border; border-radius:6px; align-items:center` |
| `__seq-btn` | `padding:0; border:0; transparent; cursor:pointer; transition: transform 150ms`; hover `translateY(-2px)` |

**Builder dello schema:**

| Selettore | Valori |
| --- | --- |
| `__builder` | `flex column; gap:8px`; `.cfg-hrtur__clear { align-self:flex-start }` |
| `__palette` | `flex; wrap; gap:6px` |
| `__add` | `inline-flex; gap:6px; height:30px; padding:0 10px 0 5px; border:1px solid --color-border; border-radius:6px; background:--color-surface; 12px; --color-text-active`; hover `border-color:--color-primary-300; background:--color-primary-50` |

### B.3.9 Responsività

- La griglia degli schemi si adatta da sola (`auto-fill`, minimo 320px).
- La tabella dei turni segue la compattazione comune delle tabelle HR (760px e 520px) ed è in % fisse, senza scroll orizzontale.
- La modale passa a una colonna sotto i 640px.

### B.3.10 Effetti e animazioni

- I chip della sequenza nel builder si alzano di 2px in hover (150ms).
- Transizioni di 150ms sui pulsanti della tavolozza (cambio di colore in hover, senza transizione dichiarata).

### B.3.11 Accessibilità

- Il chip del turno è testo visibile (la sigla); il colore non è l'unico veicolo d'informazione.
- I chip della sequenza sono pulsanti con il Tooltip «Giorno i — clic per togliere».
- L'icona della luna è decorativa: il badge ha il testo «Notturno».
- Le azioni di riga e di scheda hanno l'aria-label con il nome.

### B.3.12 Criteri di accettazione

1. La tabella mostra i 5 turni del seed con le ore e i tipi di B.3.6; Notte ha il badge blu con la luna, Spezzato il badge «Spezzato».
2. La colonna Reparti di Mattina dice «Tutti i reparti», quella di Spezzato «F&B, Cucina».
3. Le tre schede degli schemi mostrano i piedi esatti, per esempio «Ciclo di 8 giorni · 6 lavorati, 2 di riposo · ≈ 39,4 h/sett.».
4. In «Nuovo turno», la sigla «m» diventa «M» e mostra «Sigla già usata»; il pulsante resta disabilitato.
5. Impostando 22:00–06:00 il riepilogo dice «Ore nette: **7,5 h** · turno notturno (almeno 3 ore tra le 22 e le 6): si applica la maggiorazione del CCNL». Con un turno spezzato 18:00–20:00 / 22:00–01:00 compare la stessa frase; con 18:00–20:00 / 22:00–23:00 no.
6. Accendendo «Turno spezzato» compaiono 18:00–22:00 come seconda fascia.
7. La multiselect dei reparti elenca solo i reparti attivi: Marketing non c'è. Scegliendone due il trigger dice «2 reparti selezionati».
8. Eliminando «Mattina», la conferma cita «2 schemi di rotazione (Ciclo continuo 3 turni, Rotazione 6+1 M/P)»; dopo la conferma le M spariscono dalle sequenze.
9. Senza turni, «Nuovo schema» è disabilitato.
10. Nel builder, cliccando «Mattina», «Riposo» e poi il primo chip, la sequenza resta [R].
11. Salvando con turni ma senza schemi, la scheda mostra il pallino arancione «Da completare».
12. Il toast di salvataggio è «Turnistica salvata».

### B.3.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrTurnistica/HrTurnistica.tsx`, `HrTurnistica.sass`
- `src/store/useHrConfigStore.ts` (`TurnoHr`, `SchemaTurniHr`, `RIPOSO`, `SEED_TURNI`, `SEED_SCHEMI`, `oreTurno`, `turnoNotturno`, `durataMin`)
- `src/core/cfg/CfgMultiSelect.tsx`, `CfgMultiSelect.sass`

---

## B.4 · Contratti collettivi (`hr-ccnl`), con la scheda interna «Tipologie di contratto»

### B.4.1 Scopo e utenti

Elenca i CCNL applicati in azienda. Per ciascuno si definiscono:

- dati generali: denominazione, codice CNEL, settore, validità, orario pieno;
- livelli: codice, mansioni, categoria, minimo tabellare, scatto, prova, preavviso;
- ferie e permessi annui con le regole di maturazione e fruizione, con l'anteprima sul part time;
- retribuzione: mensilità, scatti, maggiorazioni, comporto;
- enti e fondi.

Dentro la stessa scheda c'è anche l'elenco delle **tipologie di contratto** (indeterminato, determinato, stagionale…). Sono comuni a tutti i CCNL e si salvano con la stessa bozza.

Crea anagrafica legge da qui livelli, RAL minima, spettanze proposte e tipologie. Lo usa l'ufficio del personale.

### B.4.2 Accesso

- Scheda 4. Deep link `hr-configurazione:hr-ccnl`; Crea anagrafica ci porta con il link «Configuralo in Human Resources › Configurazione».
- Scheda interna da deep link: `hr-configurazione:hr-ccnl:<scheda>` con `generale`, `tipologie`, `livelli`, `ferie`, `retribuzione`, `enti`. Senza segmento, o con un valore sconosciuto, si apre «Generale».
- `hr-configurazione:hr-tipologie-contratto` apre questa scheda direttamente su «Tipologie di contratto» (vedi A.2). Il pannello autonomo `hr-tipologie-contratto` resta nel codice (il suo editor è riusato qui) ma non si monta più da solo.

### B.4.3 Layout

```
.cfg-hrccnl.cfg-hr-pane (flex column · gap 12px · 13px · container inline-size)
.__layout (grid 260px | minmax(0,1fr) · gap 18 · align start)
┌ aside.__list ─────────────────┐ ┌ section.__detail (card · padding 14 18 18) ───────────────────────┐
│┌ __item ─────────────────────┐│ │ CCNL Turismo – Aziende alberghiere                   [✎][⧉][🗑]   │
││[▤] CCNL Turismo – Aziende… ││ │ CNEL H052 · Turismo e ospitalità                                 │
││    10 livelli · 26 gg ferie · 104 h permessi                    │ │ ┌ Tabs ──────────────────────────────────────────────────────┐  │
│└────────────────────────────┘│ │ │Generale│Tipologie di contratto (8)│Livelli (10)│Ferie e permessi│Retribuzione│Enti e fondi│
│ [▤] CCNL Pubblici esercizi    │ │ └────────────────────────────────────────────────────────────┘  │
│ [⊕ Nuovo CCNL]                │ │  contenuto della scheda interna                                  │
└───────────────────────────────┘ └──────────────────────────────────────────────────────────────────┘
[CfgSaveBar]
```

**Schede interne:**

- **Generale**: griglia di 2 colonne.

  ```
  [Denominazione ····························· (span 2)]
  [Codice CNEL]                [Settore]
  [In vigore dal 📅]            [Scadenza 📅]
  [Orario pieno (ore/settimana)]  hint
  ```

- **Tipologie di contratto**: `TipologieContrattoEditor`, con toolbar, tabella e modale (vedi B.4.4).
- **Livelli**: una barra con la frase introduttiva e il pulsante «Nuovo livello», la tabella di 9 colonne e la nota.
- **Ferie e permessi**: griglia `minmax(0,1fr) | 280px` (gap 18).

  ```
  ┌ form ─────────────────────────────────────┐ ┌ aside anteprima (280px, sfondo primary-50) ┐
  │ Spettanze annue (full time)               │ │ Anteprima spettanze                         │
  │ [Ferie gg/anno] [Giorni su settimana di ▾]│ │        │Full time│Part time 75%             │
  │ [ROL ore/anno]  [Ex festività ore/anno]   │ │ Ferie / anno   26 gg   19,5 gg              │
  │ Maturazione e fruizione                   │ │ Ferie / mese   2,17 gg 1,63 gg              │
  │ Maturazione ( ) Ratei mensili (1/12) …    │ │ ROL / anno     72 h    54 h                 │
  │ [Frazione di mese…] [Ferie da godere…]    │ │ Ex festività   32 h    24 h                 │
  │ [Ferie residue: entro] [Permessi … entro] │ │ Permessi / mese 8,67 h 6,5 h                │
  │ [toggle] Riproporziona al part time       │ │ [Percentuale di prova  75 ]                 │
  │ [toggle] Maturano anche nelle assenze…    │ └─────────────────────────────────────────────┘
  └───────────────────────────────────────────┘
  ```

- **Retribuzione**: griglia di 2 colonne con 7 campi.
- **Enti e fondi**: griglia di 2 colonne con 3 campi.

### B.4.4 Elementi e testi

**Elemento dell'elenco:**

- icona `fa-light fa-file-contract` in un riquadro 32×32;
- nome (`TruncatedText`);
- meta «{n} livelli · {ferieGiorni} gg ferie · {rolOre + exFestivitaOre} h permessi».

In fondo all'elenco il pulsante «Nuovo CCNL» (`sib-btn--secondary`, icona `fa-light fa-circle-plus`, centrato).

**Testa del dettaglio:**

- nome (`TruncatedText`);
- meta: «CNEL {codice}» e il settore uniti da « · »; se mancano entrambi, «Completa i dati generali»;
- azioni `HrRowActions`:
  - Modifica: porta sulla scheda interna «Generale»;
  - Duplica;
  - Elimina.

**Stato vuoto** (nessun CCNL): `CfgEmpty` con icona `file-contract`, titolo «Nessun contratto collettivo» e sottotitolo «Aggiungi il CCNL applicato in azienda per inquadrare il personale.».

**Schede interne** (componente `Tabs` condiviso):

1. «Generale»
2. «Tipologie di contratto ({n})»
3. «Livelli ({n})»
4. «Ferie e permessi»
5. «Retribuzione»
6. «Enti e fondi»

#### Scheda «Generale»

| Campo | Componente | Label | Placeholder / hint | Note |
| --- | --- | --- | --- | --- |
| `nome` | InputField `cc-nome`, span 2 | «Denominazione» | — | non obbligatorio |
| `codiceCnel` | InputField `cc-cnel` | «Codice CNEL» | «Es. H052» | convertito in maiuscolo |
| `settore` | InputField `cc-sett` | «Settore» | «Es. Turismo e ospitalità» | |
| `validoDal` | DatePickerField `cc-dal` | «In vigore dal» | — | ISO `yyyy-mm-dd` |
| `validoAl` | DatePickerField `cc-al` | «Scadenza» | — | |
| `oreSettimanaliPieno` | InputField number `cc-ore`, min 1 | «Orario pieno (ore/settimana)» | hint «Base per calcolare la percentuale di part time.» | |

#### Scheda «Tipologie di contratto»

Toolbar:

- a sinistra il testo «Il part time non è una tipologia: si ricava dall’orario di lavoro assegnato al dipendente.»;
- a destra il pulsante «Nuova tipologia» (`sib-btn--primary`, icona `fa-light fa-circle-plus`).

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Tipologia» | 27% | nome in grassetto |
| «Codice UniLav» | 13% | codice oppure «—» |
| «Con scadenza» | 12%, al centro | ✓ `fa-solid fa-check` in `--color-success` 14px, oppure – `fa-solid fa-minus` in `--color-text-disabled` 12px; aria-label «Sì» / «No» |
| «Durata max» | 11%, a destra | «24 mesi» oppure «—» |
| «Prova» (abbreviazione con il tooltip «Periodo di prova») | 9%, al centro | ✓ oppure – |
| «Stato» | 15% | «Attiva» con `fa-solid fa-circle-check` in verde, oppure «Non attiva» con `fa-solid fa-circle-minus` in grigio |
| «Azioni» | 13%, a destra | Modifica ed Elimina |


Modale della tipologia:

- titolo «Nuova tipologia di contratto» oppure «Modifica tipologia»;
- conferma «Crea tipologia» oppure «Salva modifiche».

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| `nome` | InputField `tip-nome` | «Tipologia» (obbligatorio) | placeholder «Es. Tempo determinato» |
| `codice` | InputField `tip-cod` | «Codice UniLav» | placeholder «Es. A.02.00», convertito in maiuscolo |
| `conScadenza` | ToggleSwitch | «Contratto con scadenza» | descrizione «In Crea anagrafica diventa obbligatoria la data di fine rapporto.» |
| `durataMaxMesi` | InputField number `tip-durata`, min 0 | «Durata massima (mesi)» | hint «Lascia vuoto se non c'è un limite.»; 0 o vuoto significano nessun limite |
| `periodoProva` | ToggleSwitch | «Prevede il periodo di prova» | descrizione «La durata si propone dal livello del CCNL.» |
| `attiva` | ToggleSwitch | «Tipologia attiva» | |

Default di una nuova tipologia: senza scadenza, con prova, attiva.

#### Scheda «Livelli»

- Frase introduttiva: «Livelli di inquadramento dal più alto al più basso: il minimo × {mensilità} mensilità dà la RAL minima proposta in anagrafica.».
- Pulsante «Nuovo livello» (`sib-btn--primary`, icona `fa-light fa-circle-plus`).

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Ord.» (tooltip «Ordine dei livelli») | 6% | due pulsanti icona `fa-solid fa-chevron-up` / `fa-chevron-down`, aria-label «Sposta su» / «Sposta giù»; il primo è disabilitato sul primo livello, il secondo sull'ultimo |
| «Livello» | 8% | codice in grassetto 700, `--color-primary` |
| «Profili / mansioni» | 21% | descrizione oppure «—» |
| «Categoria» | 11% | Dirigente, Quadro, Impiegato, Operaio, Apprendista |
| «Min. mensile» (tooltip «Minimo tabellare mensile») | 12%, a destra | «€ 1.590» |
| «RAL minima» | 11%, a destra | «€ 22.260» = minimo × mensilità |
| «Prova» | 8%, a destra | «60 gg» |
| «Preavviso» | 9%, a destra | «30 gg» |
| «Azioni» | 14%, a destra | Modifica ed Elimina (il nome per l'aria-label è «livello {codice}») |

- Tabella vuota: «Nessun livello: aggiungi i livelli del contratto.».
- Nota sotto la tabella, con icona `fa-light fa-circle-info`: «Valori indicativi: allineali alle tabelle retributive in vigore.».

Modale del livello:

- titolo «Nuovo livello» oppure «Modifica livello {codice}»;
- conferma «Aggiungi livello» oppure «Salva modifiche».

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| `codice` | InputField `lv-cod` | «Livello» (obbligatorio) | placeholder «Es. 4°» |
| `categoria` | SelectField `lv-cat` | «Categoria» | Dirigente, Quadro, Impiegato, Operaio, Apprendista; default Impiegato |
| `descrizione` | InputField `lv-desc` | «Profili / mansioni» | placeholder «Es. Addetto ricevimento, cameriere» |
| `minimoMensile` | InputField number `lv-min`, min 0, icona sinistra `fa-light fa-euro-sign` | «Minimo tabellare mensile (€)» | default 0 |
| `scattoImporto` | InputField number `lv-scatto`, min 0, icona `fa-light fa-euro-sign` | «Importo scatto di anzianità (€)» | default 0 |
| `provaGiorni` | InputField number `lv-prova`, min 0 | «Periodo di prova (giorni)» | default 60 |
| `preavvisoGiorni` | InputField number `lv-pre`, min 0 | «Preavviso (giorni)» | default 30 |
| Riepilogo | hint | «RAL minima: **€ {minimo × mensilità}** ({mensilità} mensilità).» | |

#### Scheda «Ferie e permessi»

**Sottotitolo h4 «Spettanze annue (full time)».**

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| `ferieGiorni` | InputField number `cc-ferie`, min 0 | «Ferie (giorni/anno)» | |
| `ferieSettimanaGiorni` | SelectField `cc-fset` | «Giorni contati su settimana di» | opzioni «6 giorni lavorativi» (6) e «5 giorni lavorativi» (5) |
| `rolOre` | InputField number `cc-rol`, min 0 | «Permessi ROL (ore/anno)» | |
| `exFestivitaOre` | InputField number `cc-exf`, min 0 | «Ex festività (ore/anno)» | |

**Sottotitolo h4 «Maturazione e fruizione».**

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| `maturazione` | RadioGroup `cc-mat` | «Maturazione» | opzioni «Ratei mensili (1/12)» (mensile), «Annuale, a inizio anno» (annuale), «Per ora lavorata» (oraria) |
| `frazioneMeseGiorni` | InputField number `cc-fraz`, min 1, max 31 | «Frazione di mese che vale un mese (giorni)» | hint «Es. 15: dal 15° giorno di servizio matura il rateo intero.» |
| `ferieMinimeAnnoSettimane` | InputField number `cc-fmin`, min 0 | «Ferie da godere nell'anno (settimane)» | |
| `ferieScadenzaMesi` | InputField number `cc-fscad`, min 0 | «Ferie residue: entro (mesi)» | hint «Dalla fine dell'anno di maturazione.» |
| `permessiScadenzaMesi` | InputField number `cc-pscad`, min 0 | «Permessi non goduti liquidati entro (mesi)» | |
| `riproporzionaPartTime` | ToggleSwitch | «Riproporziona al part time» | descrizione «Ferie e permessi in proporzione alla percentuale dell'orario.» |
| `maturaInAssenzeRetribuite` | ToggleSwitch | «Maturano anche nelle assenze retribuite» | descrizione «Malattia, infortunio, maternità obbligatoria.» |

**Anteprima** (aside con `aria-label` «Anteprima spettanze»):

- sottotitolo «Anteprima spettanze»;
- tabella con le intestazioni vuota | «Full time» | «Part time {p}%»;
- righe «Ferie / anno» (gg), «Ferie / mese» (gg), «ROL / anno» (h), «Ex festività» (h), «Permessi / mese» (h);
- campo `cc-prev` «Percentuale di prova», number, min 10, max 100, step 5, default **75**, con il valore limitato tra 10 e 100.

I numeri si mostrano in formato italiano (`toLocaleString('it-IT', { maximumFractionDigits: 2 })`), quindi con la **virgola decimale** e senza zeri finali: «2,17 gg», «19,5 gg», «26 gg».

#### Scheda «Retribuzione»

| Campo | Label | Vincoli e hint |
| --- | --- | --- |
| `mensilita` | «Mensilità» | min 12, max 16; hint «Es. 14: tredicesima e quattordicesima.» |
| `scattiNumero` | «Scatti di anzianità (numero max)» | min 0 |
| `scattiCadenzaAnni` | «Cadenza scatti (anni)» | min 1; hint «L'importo dello scatto è per livello.» |
| `maggStraordinario` | «Maggiorazione straordinario (%)» | min 0 |
| `maggNotturno` | «Maggiorazione notturno (%)» | min 0 |
| `maggFestivo` | «Maggiorazione festivo (%)» | min 0 |
| `comportoGiorni` | «Periodo di comporto malattia (giorni)» | min 0 |

#### Scheda «Enti e fondi»

| Campo | Label | Placeholder |
| --- | --- | --- |
| `fondoSanitario` | «Fondo di assistenza sanitaria integrativa» | «Es. Fondo FAST» |
| `previdenzaComplementare` | «Fondo di previdenza complementare» | «Es. Fon.Te.» |
| `enteBilaterale` | «Ente bilaterale» | «Es. EBNT» |

### B.4.5 Stati e interazioni

**Selezione.**

- All'apertura è selezionato il primo CCNL salvato, sulla scheda «Generale» (oppure su quella chiesta dal deep link, vedi B.4.2).
- Cambiando CCNL la scheda interna **resta** quella corrente.

**«Nuovo CCNL».** Aggiunge in coda un CCNL con i default di B.4.6, nome «Nuovo CCNL», senza livelli; lo seleziona e porta su «Generale». Vale +1.

**Duplica.** Copia profonda con nome «{nome} (copia)», id nuovo e **id nuovi per tutti i livelli**; viene selezionata.

**Elimina CCNL** → ConfirmDialog:

- titolo «Elimina CCNL»;
- messaggio «Eliminare «{nome}» con i suoi {n} livelli? I contratti già registrati mantengono i dati nello storico.»;
- conferma «Elimina». La selezione passa al primo CCNL rimasto.

**Campi numerici.** Si convertono con `n(v)`: stringa vuota → 0, la virgola diventa punto, un valore non valido → 0. I limiti min e max sono solo attributi HTML e non vengono imposti via codice, tranne la percentuale di prova.

**Livelli.**

- Le frecce scambiano il livello con quello adiacente.
- La conferma della modale è abilitata se il codice, dopo `trim`, non è vuoto. Un livello nuovo prende l'id `nuovoId('lv')` e va in coda. Non c'è un controllo di unicità del codice.
- **Elimina livello** → «Elimina livello» / «Eliminare il livello {codice} – {descrizione}?» / «Elimina».

**Tipologie.**

- La conferma è abilitata se il nome non è vuoto. Si applicano `trim` al nome e la conversione `durataMaxMesi || undefined`.
- **Elimina tipologia** → «Elimina tipologia» / «Eliminare la tipologia «{nome}»? I contratti già registrati la mantengono nello storico.» / «Elimina».

**Bozza unica.** CCNL e tipologie stanno nella stessa bozza `{ccnl, tipologie}`. Il contatore della barra somma `diffCount(ccnl) + diffCount(tipologie)` e «Salva» scrive entrambi.

**Anteprima.** Si ricalcola in tempo reale dalla bozza del CCNL selezionato e dalla percentuale di prova. La percentuale non è persistita: torna a 75 a ogni apertura.

### B.4.6 Dati e regole di business

**`CcnlHr`:**

| Gruppo | Campi |
| --- | --- |
| Identità | `id`, `nome`, `codiceCnel`, `settore` |
| Validità e orario | `validoDal` (ISO), `validoAl` (ISO), `oreSettimanaliPieno`, `mensilita` |
| Ferie | `ferieGiorni`, `ferieSettimanaGiorni: 5\|6`, `ferieMinimeAnnoSettimane`, `ferieScadenzaMesi` |
| Permessi | `rolOre`, `exFestivitaOre`, `permessiScadenzaMesi` |
| Maturazione | `maturazione: 'mensile'\|'annuale'\|'oraria'`, `frazioneMeseGiorni`, `riproporzionaPartTime`, `maturaInAssenzeRetribuite` |
| Retribuzione | `scattiNumero`, `scattiCadenzaAnni`, `maggStraordinario`, `maggNotturno`, `maggFestivo` (%), `comportoGiorni` |
| Enti e fondi | `fondoSanitario`, `previdenzaComplementare`, `enteBilaterale` |
| Livelli | `livelli: LivelloCcnl[]` |

**`LivelloCcnl`:** `{ id, codice, descrizione, categoria, minimoMensile €, scattoImporto €, provaGiorni (giorni di lavoro effettivo), preavvisoGiorni (giorni di calendario) }`.

**`TipologiaContrattoHr`:** `{ id, nome, codice (UniLav), conScadenza, durataMaxMesi?, periodoProva, attiva }`.

**Default di un nuovo CCNL:**

| Gruppo | Valori |
| --- | --- |
| Testi | `codiceCnel`, `settore`, `validoDal`, `validoAl`, enti e fondi vuoti |
| Orario | 40 ore, 14 mensilità |
| Ferie | 26 giorni, settimana di 6, 2 settimane minime, scadenza 18 mesi |
| Permessi | ROL 72, ex festività 32, scadenza 6 mesi |
| Maturazione | mensile, frazione 15, riproporziona sì, matura nelle assenze sì |
| Retribuzione | 6 scatti ogni 4 anni, maggiorazioni 30/25/20 %, comporto 180 |

**Formule:**

- `spettanzeAnnue(ccnl, perc)`:
  - `k = riproporzionaPartTime ? perc/100 : 1`;
  - `r1(x) = round(x·10)/10`;
  - `ferie = r1(ferieGiorni·k)`, `rol = r1(rolOre·k)`, `ex = r1(exFestivitaOre·k)`;
  - `ferieMese = round(ferie/12·100)/100`;
  - `permessiMeseOre = round((rol+ex)/12·100)/100`.
- `ralMinima(ccnl, livello, perc=100) = round(minimoMensile × mensilita × perc/100)`. In tabella e nella modale si usa `minimoMensile × mensilita` (100%).
- `fmtEuro(n)` = `n.toLocaleString('it-IT', { maximumFractionDigits: 0 })`, preceduto da «€ ».
- **Completamento**: `configured` se almeno un CCNL ha livelli; `partial` se esistono CCNL ma nessuno ha livelli; `empty` se non ci sono CCNL. Le tipologie non contano. Nel pannello autonomo delle tipologie la regola è `configured` se almeno una tipologia è attiva.

**Seed CCNL «CCNL Turismo – Aziende alberghiere»** (`ccnl-tur`):

- CNEL H052, settore «Turismo e ospitalità», dal 2024-06-01 al 2027-12-31;
- 40 ore, 14 mensilità;
- ferie 26 giorni su settimana di 6, minimo 2 settimane, scadenza 18 mesi;
- ROL 72, ex festività 32, scadenza 6 mesi;
- maturazione mensile, frazione 15, riproporziona sì, matura sì;
- 6 scatti ogni 4 anni; maggiorazioni 30/25/20; comporto 180;
- Fondo FAST, Fon.Te., EBNT.

| id | Livello | Profili / mansioni | Categoria | Minimo | Scatto | Prova | Preavviso |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tur-qa | Q.A | Quadro A – direttore di struttura | Quadro | 2390 | 41 | 180 | 120 |
| tur-qb | Q.B | Quadro B – vice direttore | Quadro | 2170 | 40 | 180 | 120 |
| tur-1 | 1° | Capo servizio, capo ricevimento | Impiegato | 1990 | 39 | 180 | 90 |
| tur-2 | 2° | Primo portiere, chef de rang, governante | Impiegato | 1790 | 38 | 90 | 60 |
| tur-3 | 3° | Portiere, cuoco capo partita | Impiegato | 1680 | 37 | 90 | 60 |
| tur-4 | 4° | Addetto ricevimento, cameriere | Impiegato | 1590 | 36 | 60 | 30 |
| tur-5 | 5° | Commis, aiuto cuoco, manutentore | Operaio | 1490 | 35 | 60 | 30 |
| tur-6s | 6°S | Cameriera ai piani, facchino | Operaio | 1440 | 34 | 45 | 20 |
| tur-6 | 6° | Addetto pulizie, lavapiatti | Operaio | 1420 | 34 | 45 | 20 |
| tur-7 | 7° | Personale di fatica | Operaio | 1330 | 33 | 30 | 15 |

**Seed CCNL «CCNL Pubblici esercizi»** (`ccnl-pe`): CNEL H05Y, settore «Ristorazione e bar», tutti gli altri valori uguali al Turismo.

| id | Livello | Profili / mansioni | Categoria | Minimo | Scatto | Prova | Preavviso |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pe-q | Q | Quadro – responsabile di locale | Quadro | 2300 | 40 | 180 | 120 |
| pe-1 | 1° | Direttore di sala, chef | Impiegato | 1960 | 39 | 180 | 90 |
| pe-3 | 3° | Barman, cuoco | Impiegato | 1660 | 37 | 90 | 60 |
| pe-4 | 4° | Cameriere, banconiere | Impiegato | 1580 | 36 | 60 | 30 |
| pe-5 | 5° | Commis di sala e cucina | Operaio | 1480 | 35 | 60 | 30 |
| pe-6 | 6° | Addetto pulizie, lavapiatti | Operaio | 1410 | 34 | 45 | 20 |

Meta nell'elenco: «10 livelli · 26 gg ferie · 104 h permessi» e «6 livelli · 26 gg ferie · 104 h permessi».

Anteprima con il seed Turismo:

| Riga | Full time | Part time 75% |
| --- | --- | --- |
| Ferie / anno | 26 gg | 19,5 gg |
| Ferie / mese | 2,17 gg | 1,63 gg |
| ROL / anno | 72 h | 54 h |
| Ex festività | 32 h | 24 h |
| Permessi / mese | 8,67 h | 6,5 h |

**Seed delle tipologie (8):**

| id | Tipologia | Codice UniLav | Con scadenza | Durata max | Prova | Attiva |
| --- | --- | --- | --- | --- | --- | --- |
| tip-ind | Tempo indeterminato | A.01.00 | no | — | sì | sì |
| tip-det | Tempo determinato | A.02.00 | sì | 24 mesi | sì | sì |
| tip-sta | Stagionale | A.02.01 | sì | 8 mesi | sì | sì |
| tip-app | Apprendistato professionalizzante | A.03.02 | no | 36 mesi | sì | sì |
| tip-int | Intermittente (a chiamata) | A.05.00 | no | — | no | sì |
| tip-som | Somministrazione | A.07.00 | sì | 24 mesi | no | sì |
| tip-coco | Collaborazione (Co.co.co.) | A.09.00 | sì | — | no | sì |
| tip-tir | Tirocinio / Stage | C.01.00 | sì | 6 mesi | no | sì |

Persistenza: `sibylla.hr-config` → `ccnl` e `tipologie`. I valori economici sono **indicativi**, come dice la nota.

### B.4.7 Backend da realizzare

`PUT /Sibylla/hr/config/contratti` con `{ version, ccnl: CcnlHr[], tipologie: TipologiaContrattoHr[] }`, in **una sola transazione**: è un unico «Salva» per i due insiemi.

**Validazione (400):**

- tipologie: `nome` obbligatorio;
- livelli: `codice` obbligatorio;
- `ferieSettimanaGiorni` ∈ {5, 6};
- `maturazione` ∈ {mensile, annuale, oraria};
- `categoria` ∈ {Dirigente, Quadro, Impiegato, Operaio, Apprendista};
- campi numerici ≥ 0;
- `mensilita` tra 12 e 16;
- `frazioneMeseGiorni` tra 1 e 31;
- date ISO.

**Consigliato**:

- rifiutare con 409 l'eliminazione di CCNL, livelli o tipologie referenziati da contratti vigenti, oppure eliminarli in modo logico;
- in alternativa, conservare nei contratti registrati una **copia dei valori** (inquadramento storicizzato), come promette il testo della conferma.

Il calcolo delle spettanze e della RAL minima può restare sul frontend, ma va replicato identico sul server per Crea anagrafica e cedolini.

### B.4.8 Stile

**Elenco:**

| Selettore | Valori |
| --- | --- |
| `.cfg-hrccnl` | `flex column; gap:12px; 13px; container-type:inline-size` |
| `__layout` | `grid 260px minmax(0,1fr); gap:18px; align-items:start` |
| `__list`, `__item`, `__item-text`, `__item-name`, `__item-meta`, `.__add` | come in Orari: card 10px 12px, bordo `--color-border`, radius 6px, hover `--color-primary-300`, attivo bordo `--color-primary` + anello di 1px, nome peso 600, meta 11px |
| `__item-ico` | `inline-flex center; 32×32; flex-shrink:0; border-radius:6px; background:--color-primary-50; color:--color-primary; font-size:15px` |

**Dettaglio:**

| Selettore | Valori |
| --- | --- |
| `__detail` | `flex column; min-width:0; padding:14px 18px 18px; background:--color-surface; border:1px solid --color-border; border-radius:6px` (senza gap: le spaziature vengono da `__head` e da Tabs) |
| `__head` | `flex; space-between; center; gap:12px; margin-bottom:10px` |
| `__head-name` | Poppins 15px, peso 600 |
| `__head-meta` | 12px, inattivo |
| `__grid` | `grid repeat(2, minmax(0,1fr)); gap:14px` |
| `__span2` | `span 2` |
| `__section` | `flex column; gap:12px; min-width:0` |
| `__bar` | `flex; center; space-between; gap:12px` |
| `__lead`, `__note` | `margin:0; 12.5px; inattivo`; `__note` è `flex; gap:6px`, con icona primary |
| `__sub` | `margin:6px 0 0`, Poppins 13px, peso 600, `--color-text-active` |
| `__lv` | peso 700, `--color-primary` |
| `__num` | a destra, `tabular-nums`, `nowrap` |
| `__ord`, `__actions` | `nowrap` (`__actions` anche a destra) |

**Ferie e anteprima:**

| Selettore | Valori |
| --- | --- |
| `__ferie` | `grid minmax(0,1fr) 280px; gap:18px; align-items:start` |
| `__preview` | `flex column; gap:10px; padding:12px 14px; border:1px solid --color-primary-200 (#ccd5dd); border-radius:6px; background:--color-primary-50` |
| `__ptable` | `width:100%; border-collapse:collapse; 12px` |
| `__ptable th`, `__ptable td` | `padding:5px 4px; border-bottom:1px solid --color-border; text-align:right; tabular-nums` |
| `__ptable thead th` | peso 600, inattivo |
| `__ptable tbody th` | a sinistra, peso 600, `--color-text-active` |
| `__ptable` ultima riga | senza bordo |

**Tipologie (`.cfg-hrtip`):**

| Selettore | Valori |
| --- | --- |
| `.cfg-hrtip` | `flex column; gap:12px; 13px` |
| `__lead` | 12.5px, inattivo |
| `__name` | peso 600 |
| `__code` | 11.5px, peso 600, `letter-spacing:.4px`, inattivo |
| `__center` | centrato |
| `__num` | a destra, `tabular-nums` |
| `__yes` | 14px, `--color-success` |
| `__no` | 12px, `--color-text-disabled` |
| `__badge` | `inline-flex; gap:6px; 12px; peso 600; nowrap`; icona 12px |
| `__badge--on` | success |
| `__badge--off` | inattivo |

**Tabs condivise** (vedi `00-fondamenta.md`):

- contenitore `flex; border-bottom:1px solid --color-border; margin-bottom:16px`;
- tab `padding:10px 16px; 13px; peso 600; Open Sans; border-bottom:2px`, attiva in `--color-primary`, inattiva in `--color-text-inactive`; hover testo `--color-text-active` e bordo `--color-primary-300`; transizione dei colori 150ms.

### B.4.9 Responsività

- `@container (max-width: 900px)`, sul pannello:
  - layout e griglia delle ferie diventano una colonna: l'anteprima va sotto il form;
  - l'elenco diventa una riga che va a capo, con elementi `flex:1 1 220px`.
- `@container (max-width: 560px)`: la griglia dei campi passa a 1 colonna e `span2` torna `auto`.
- La tabella dei livelli (9 colonne in %) usa le abbreviazioni «Ord.» e «Min. mensile» con il tooltip e la compattazione comune sotto i 760px: nessuno scroll orizzontale.
- Le schede interne (Tabs) non vanno a capo: a larghezze molto strette il loro testo dovrebbe restare su una riga. Oggi non è prevista una compattazione specifica.

### B.4.10 Effetti e animazioni

- Transizioni degli elementi dell'elenco (150ms).
- Transizione dei colori delle schede interne (150ms).
- Cambiando scheda interna il contenuto si sostituisce senza animazione.

### B.4.11 Accessibilità

- Pulsanti d'ordine con aria-label «Sposta su» / «Sposta giù» e stato disabilitato.
- Le icone sì/no hanno l'aria-label «Sì» / «No».
- L'anteprima è un `aside` con l'aria-label.
- Le abbreviazioni in intestazione hanno il tooltip con il testo completo.
- Le schede interne sono pulsanti semplici, senza `role="tab"`.

### B.4.12 Criteri di accettazione

1. L'elenco mostra due CCNL con le meta esatte; il primo è selezionato e la testa dice «CNEL H052 · Turismo e ospitalità».
2. Le schede interne sono 6, con i conteggi «Tipologie di contratto (8)» e «Livelli (10)».
3. In «Livelli», la riga 4° mostra «€ 1.590», «€ 22.260», «60 gg» e «30 gg»; la freccia su della prima riga e quella giù dell'ultima sono disabilitate.
4. Cambiando «Mensilità» in 13 la frase dice «il minimo × 13 mensilità» e la RAL del 4° diventa «€ 20.670».
5. In «Ferie e permessi» l'anteprima dice, al full time, «26 gg», «2,17 gg», «72 h», «32 h», «8,67 h» e, al 75%, «19,5 gg», «1,63 gg», «54 h», «24 h» e «6,5 h»: mai il punto decimale.
6. Spegnendo «Riproporziona al part time» le due colonne dell'anteprima diventano uguali.
7. «Nuovo CCNL» crea «Nuovo CCNL» con la meta «Completa i dati generali», «0 livelli · 26 gg ferie · 104 h permessi», e apre «Generale».
8. Duplica crea «CCNL Turismo – Aziende alberghiere (copia)», con 10 livelli dagli id nuovi.
9. Elimina mostra «Eliminare «CCNL Turismo – Aziende alberghiere» con i suoi 10 livelli? …».
10. «Nuova tipologia» resta disabilitata finché la tipologia è vuota; il codice «a.02.00» diventa «A.02.00».
11. Modificando una tipologia e un CCNL la barra dice «2 modifiche non salvate» e un solo «Salva» li scrive entrambi, con il toast «Contratti collettivi salvati».
12. Sotto i 900px di pannello l'anteprima delle spettanze va sotto il form.
13. Salvando senza livelli in nessun CCNL la scheda mostra «Da completare».
14. `hr-configurazione:hr-tipologie-contratto` apre questa scheda con «Tipologie di contratto (8)» attiva e l'elenco delle tipologie visibile.

### B.4.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrCcnl/HrCcnl.tsx`, `HrCcnl.sass`
- `src/modules/impostazioni/Configuratore/panes/HrTipologieContratto/HrTipologieContratto.tsx`, `HrTipologieContratto.sass`
- `src/store/useHrConfigStore.ts` (`CcnlHr`, `LivelloCcnl`, `TipologiaContrattoHr`, `SEED_CCNL`, `SEED_TIPOLOGIE`, `spettanzeAnnue`, `ralMinima`, `fmtEuro`, `CATEGORIE_LIVELLO`, `MATURAZIONI`)
- `src/core/components/Tabs.tsx`

---

## B.5 · Aziende in appalto (`hr-aziende-appalto`)

### B.5.1 Scopo e utenti

Le imprese esterne i cui addetti lavorano in struttura (pulizie, manutenzione, facchinaggio). L'**anagrafica è unica con Purchasing**: sono i fornitori con `appalto: true` della Lista fornitori. Qui si completano con i dati richiesti dalla normativa:

- **Anagrafica e contratto**: ragione sociale, P. IVA, sede, oggetto, estremi del contratto d'appalto, DURC, matricola INPS e codice INAIL, subappalto autorizzato, referente;
- **Sicurezza**: DUVRI o esenzione, idoneità tecnico-professionale, informativa sui rischi;
- **Pagamenti e fisco**: responsabilità solidale, art. 17-bis, pagamenti con DURC e F24;
- **Privacy**: informativa agli addetti, accordo ex art. 28;
- l'elenco dei **collaboratori** di ciascuna azienda, da cui si stampano i badge.

Lo usa l'ufficio del personale (con l'amministrazione).

### B.5.2 Accesso

- Scheda 5. Deep link `hr-configurazione:hr-aziende-appalto`, aperto anche dalla scheda del collaboratore esterno.
- Navigazioni in uscita:

| Pulsante | Destinazione |
| --- | --- |
| «Lista fornitori (Purchasing)» | `lista-fornitori` |
| «Nuovo collaboratore» | `nuovo-collaboratore-esterno:<idAzienda>` |
| Matita della riga collaboratore | `modifica-collaboratore-esterno:<idCollaboratore>` |

- La stampa del badge apre una finestra del browser.

### B.5.3 Layout

```
.cfg-hrapp.cfg-hr-pane (flex column · gap 12px · 13px)
.__layout (grid 270px | minmax(0,1fr) · gap 18 · align start)
┌ aside.__list ───────────────────┐ ┌ section.__detail (card · padding 16 18 18 · gap 12) ──────────────┐
│┌[🏢] Splendor Servizi Integra…┐ │ │ Movi Facchinaggio Soc. Coop. (15px)                               │
││    1 collaboratori · P. IVA …  │ │ │ Facchinaggio, movimentazione bagagli e allestimenti sale.         │
│└────────────────────────────────┘ │ │ (⚠ Contratto scaduto il 31/10/2026) (⚠ DURC scaduto il 30/09/2026) …│
│ [🏢] Tecno Impianti Hotel …  ⚠    │ │ ┌ Tabs ──────────────────────────────────────────────────────┐    │
│ [🏢] Movi Facchinaggio …     ⚠    │ │ │Anagrafica e contratto│Sicurezza│Pagamenti e fisco│Privacy│Collaboratori (1)│
│ [⊕ Nuova azienda] (secondary)    │ │ └────────────────────────────────────────────────────────────┘    │
│ [↗ Lista fornitori (Purchasing)] │ │  contenuto della scheda interna                                   │
└──────────────────────────────────┘ └───────────────────────────────────────────────────────────────────┘
[CfgSaveBar]
```

**Blocco allegato** (`AllegatoField`, ricorrente in Sicurezza, Fisco e Privacy):

```
┌ .__doc (bordo 1px · radius 6 · padding 10 14 · flex space-between · wrap) ───────────────┐
│ DUVRI firmato (PDF)        [📄 DUVRI_Splendor_rev2.pdf 👁 🗑] [Rilasciata il 📅] [📂 Sostituisci]│
│ (✓ Allegato)                                                                              │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### B.5.4 Elementi e testi

**Elemento dell'elenco:**

- icona `fa-light fa-building` in un riquadro 32×32 `--color-primary-50`;
- ragione sociale, oppure il nome del fornitore (`TruncatedText`);
- meta «{n} collaboratori», più « · P. IVA {piva}» se presente. È sempre «collaboratori», anche con 1;
- a destra, se ci sono avvisi, `fa-solid fa-triangle-exclamation`: rossa (`--color-error`) se c'è almeno un avviso grave (`ko`), arancione (`--color-warning`) altrimenti. L'`aria-label` è la lista degli avvisi separati da «, ». Non c'è un tooltip visivo.

Sotto l'elenco:

- «Nuova azienda» (`sib-btn--secondary`, icona `fa-light fa-circle-plus`);
- «Lista fornitori (Purchasing)» (`sib-btn--ghost`, icona `fa-light fa-arrow-up-right-from-square`).

**Testa del dettaglio:**

- ragione sociale (oppure il nome) in 15px;
- l'oggetto dell'appalto, oppure «Fornitore di servizi in appalto»;
- **pillole degli avvisi** (`ul.__avvisi`), ognuna con l'icona `fa-solid fa-triangle-exclamation` e il testo: rosse per `ko`, arancioni per `warn`.

Non c'è un pulsante Elimina azienda: in questa scheda le aziende non si eliminano.

**Stato vuoto** (nessuna azienda): `CfgEmpty` con icona `building`, titolo «Nessuna azienda in appalto» e sottotitolo «Aggiungi la prima ditta di servizi: comparirà anche tra i fornitori di Purchasing.».

**Schede interne** (Tabs condivise, con classe `cfg-hrapp__tabs` e margine inferiore di 4px):

1. «Anagrafica e contratto»
2. «Sicurezza»
3. «Pagamenti e fisco»
4. «Privacy»
5. «Collaboratori ({n})»

#### Anagrafica e contratto

**h4 «Dati identificativi dell’impresa»**, griglia di 2 colonne:

| Campo | Label | Regole |
| --- | --- | --- |
| `ragioneSociale` | «Ragione sociale» (obbligatorio), span 2 | aggiorna anche il `nome` del fornitore |
| `partitaIva` | «Partita IVA» (obbligatorio) | `maxLength 11`; i caratteri non numerici vengono tolti |
| `codiceFiscale` | «Codice fiscale» | convertito in maiuscolo |
| `sedeLegale` | «Sede legale», span 2 | |
| `oggetto` | «Oggetto dell’appalto», span 2 | placeholder «Es. pulizia camere e aree comuni» |

**h4 «Contratto e regolarità»**:

| Campo | Componente | Label |
| --- | --- | --- |
| `contrattoNumero` | InputField | «N. contratto d’appalto» |
| `contrattoData` | DatePickerField | «Data contratto» |
| `contrattoScadenza` | DatePickerField | «Scadenza contratto» |
| `durcScadenza` | DatePickerField | «Scadenza DURC» |
| `posizioneInps` | InputField | «Matricola INPS» |
| `posizioneInail` | InputField | «Codice ditta INAIL» |

Subappalto:

- ToggleSwitch «L’impresa lavora in subappalto», descrizione «Sul badge dei suoi addetti compare l’autorizzazione al subappalto (L. 136/2010).»;
- se acceso, InputField «Estremi dell’autorizzazione al subappalto» (obbligatorio), placeholder «Es. Autorizzazione n. 7/2026 del 22/04/2026».

**h4 «Referente»**:

| Campo | Componente | Label |
| --- | --- | --- |
| `referente` | InputField | «Nome e cognome» |
| `referenteTelefono` | InputField type tel | «Telefono» |
| `referenteEmail` | InputField type email, span 2 | «E-mail» |

#### Sicurezza

**h4 «Sicurezza e DUVRI».** ToggleSwitch «DUVRI dovuto per questo appalto», descrizione «Documento unico di valutazione dei rischi da interferenze (art. 26 c. 3 D.Lgs. 81/2008): lo redige la struttura, lo sottoscrive l’impresa, va allegato al contratto.».

Se il DUVRI è dovuto:

- AllegatoField «DUVRI firmato (PDF)», senza data;
- griglia di 2 colonne:

| Campo | Label | Note |
| --- | --- | --- |
| `dataRedazione` | «Redatto il» | data |
| `dataSottoscrizione` | «Sottoscritto dall’impresa il» | data |
| `revisione` | «Revisione» | placeholder «Es. 2» |
| `prossimoAggiornamento` | «Prossimo aggiornamento» | data; hint «Va aggiornato anche prima se cambiano attività, luoghi o rischi.» |
| `costiSicurezza` | «Costi della sicurezza da interferenze (€)» | number, min 0, icona `fa-light fa-euro-sign`; hint «Da indicare nel contratto, non soggetti a ribasso.» |

Se non è dovuto, griglia di 2 colonne:

- SelectField «Motivo dell’esenzione» con le opzioni:
  - «Seleziona il motivo» (`''`);
  - «Servizi di natura intellettuale» (`intellettuale`);
  - «Mere forniture di materiali o attrezzature» (`forniture`);
  - «Lavori o servizi entro 5 uomini-giorno, senza rischi particolari» (`cinque-uomini-giorno`);
- InputField «Incaricato per cooperazione e coordinamento», placeholder «Nome e cognome».

**h4 «Idoneità tecnico-professionale».**

- Nota: «Verifica prima dell’affidamento (art. 26 c. 1 D.Lgs. 81/2008): visura camerale e autocertificazione dell’impresa.».
- Due AllegatoField:
  - «Visura camerale», con la data «Rilasciata il»;
  - «Autocertificazione dei requisiti», con la data «Firmata il».

**h4 «Rischi specifici e misure di emergenza».**

- Nota: «Informazioni da dare all’impresa sui rischi dei luoghi in cui opererà e sulle misure di prevenzione ed emergenza (art. 26 c. 1 lett. b D.Lgs. 81/2008).».
- AllegatoField «Informativa rischi ed emergenze», con la data «Consegnata il».
- Griglia: DatePickerField «Presa visione il» e InputField «Firmata da (per l’impresa)», placeholder «Nome e cognome».

#### Pagamenti e fisco

**h4 «Responsabilità solidale».** Nota: «Per 2 anni dalla fine dell’appalto la struttura risponde in solido dei trattamenti retributivi, contributivi e assicurativi dei lavoratori dell’impresa (art. 29 c. 2 D.Lgs. 276/2003): conserva contratto, DURC e prove di pagamento». Se c'è la scadenza del contratto si aggiunge « almeno fino al **{scadenza + 2 anni}**», poi il punto finale.

ToggleSwitch «Appalto soggetto alle verifiche sulle ritenute (art. 17-bis D.Lgs. 241/1997)», descrizione «Oltre 200.000 € l’anno, con prevalente manodopera presso le sedi della struttura: servono gli F24 delle ritenute o, in alternativa, il DURF.». Se acceso compare l'AllegatoField «DURF — certificato di affidabilità fiscale», con la data «Valido fino al».

**Barra dei pagamenti**: h4 «Pagamenti ({n})» e il pulsante «Registra pagamento» (`sib-btn--primary sib-btn--sm`, icona `fa-light fa-circle-plus`).

**Tabella dei pagamenti** (righe modificabili in linea; classe `cfg-hrapp__pagamenti`):

| Colonna | Larghezza | Campo |
| --- | --- | --- |
| «Competenza» | 19% | DatePickerField `type="month"` (aaaa-mm) |
| «Fattura» | 15% | InputField denso, aria-label «Numero fattura» |
| «Importo (€)» | 12% | InputField number, min 0, aria-label «Importo»; lo 0 si mostra vuoto |
| «Pagata il» | 19% | DatePickerField |
| «DURC ok» (tooltip «DURC regolare verificato prima del pagamento») | 9%, al centro | CheckboxField |
| «F24 ritenute» (tooltip «F24 delle ritenute dei lavoratori (art. 17-bis)») | 16% | cella F24 |
| «Azioni» | 10%, a destra | pulsante `fa-solid fa-trash-can`, Tooltip e aria-label «Elimina pagamento» |

Cella F24:

- con l'allegato: il nome del file (`TruncatedText`) e il pulsante `fa-solid fa-xmark` con Tooltip e aria-label «Rimuovi F24», che chiede conferma (B.5.5);
- senza: il pulsante graffetta `fa-solid fa-paperclip`, aria-label «Allega F24», Tooltip «Allega l’F24 delle ritenute (richiesto)» con l'icona **rossa** se richiesto, altrimenti «Allega l’F24».
- L'F24 è richiesto quando `art17bis` è attivo **e** manca il DURF.

Altri testi:

- tabella vuota: «Nessun pagamento registrato.»;
- sotto la tabella, se ci sono pagamenti: «Totale registrato: **€ {somma}**», con `toLocaleString('it-IT')`.

#### Privacy

- **h4 «Dati degli addetti»**, nota «La struttura tratta dati degli addetti esterni (anagrafica, foto del badge, accessi, timbrature nell’App Op!): serve un’informativa con finalità e tempi di conservazione (art. 13 GDPR).». AllegatoField «Informativa privacy agli addetti», con la data «Consegnata il».
- **h4 «Dati della struttura trattati dall’impresa»**: ToggleSwitch «L’impresa tratta dati della struttura (es. ospiti, camere, documenti)», descrizione «In questo caso va nominata responsabile del trattamento con un accordo scritto (art. 28 GDPR).». Se acceso: AllegatoField «Accordo di nomina a responsabile (art. 28)», con la data «Firmato il».

#### Collaboratori

Barra: h4 «Collaboratori ({n})» e due pulsanti:

- «Stampa badge degli autorizzati ({k})» (`sib-btn--secondary sib-btn--sm`, icona `fa-light fa-print`), disabilitato con k = 0;
- «Nuovo collaboratore» (`sib-btn--primary sib-btn--sm cfg-hrapp__coll-new`, icona `fa-light fa-user-plus`), disabilitato finché l'azienda non è **salvata**. È avvolto dal `Tooltip` scuro, che solo da disabilitato dice «Salva prima la nuova azienda» (abilitato non ha tooltip). Da disabilitato il pulsante ha `pointer-events:none`, così l'hover arriva al Tooltip.

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Nominativo» | 24% | «{Cognome} {Nome}»; se mancano documenti, prima del nome un'icona arancione `fa-solid fa-triangle-exclamation` con il Tooltip «Documenti mancanti: {elenco}» |
| «Categoria» | 17% | nome della categoria oppure «—» |
| «N. badge» | 12% | «EST-0001» oppure «—» |
| «Autorizzazione» | 19% | «01/03/26 – 28/02/27» (date con l'anno a 2 cifre), tooltip «Dal 01/03/2026 al 28/02/2027» |
| «Stato» | 13% | badge «Autorizzato» (verde), «In scadenza» (arancione), «Scaduto» (rosso), «Non ancora attivo» (grigio) |
| «Azioni» | 15%, a destra | `fa-solid fa-pen` con Tooltip «Apri la scheda» e aria-label «Apri {Nome} {Cognome}»; `fa-solid fa-id-badge` con Tooltip «Stampa badge» e aria-label «Stampa badge di {Nome} {Cognome}» |

Tabella vuota: «Nessun collaboratore registrato per questa azienda.».

#### AllegatoField

- Etichetta in grassetto 13px.
- Badge: «Allegato» (verde, icona `fa-solid fa-circle-check`) oppure «Mancante» (rosso, icona `fa-solid fa-triangle-exclamation`).
- Con il file:
  - icona `fa-light fa-file-pdf` in primary e il nome del file (`TruncatedText`, larghezza massima 280px);
  - pulsante «Visualizza» (`fa-solid fa-eye`, aria-label «Visualizza {label}»), solo se il file ha un `dataUrl`: lo apre in una nuova scheda;
  - pulsante «Rimuovi» (`fa-solid fa-trash-can`, Tooltip «Rimuovi», aria-label «Rimuovi {label}»), che chiede conferma (B.5.5).
- Campo data opzionale, largo 170px, con la sua label.
- Pulsante `sib-btn--secondary sib-btn--sm` con icona `fa-light fa-folder-open` e testo «Carica», oppure «Sostituisci» se c'è già un file.
- Input file nascosto, con `accept="application/pdf,image/*"`.

### B.5.5 Stati e interazioni

**Selezione.** All'apertura è selezionata la prima azienda salvata, sulla scheda «Anagrafica e contratto». Cambiando azienda la scheda interna resta quella corrente.

**«Nuova azienda».** Aggiunge in coda un fornitore:

- `id forn-app-<base36>`, nome «Nuova azienda», descrizione «Ditta di servizi in appalto.»;
- `macroArea 'servizi'`, `pubblicato: true`, `appalto: true`, anno di fondazione uguale all'anno corrente, gli altri campi vuoti;
- `datiAppalto` iniziali: ragione sociale «Nuova azienda», oggetto «Ditta di servizi in appalto.», tutto il resto vuoto o falso.

La nuova azienda viene selezionata e vale +1.

**Modifiche ai campi.** Cambiano la bozza dell'azienda. Un'azienda senza `datiAppalto` li riceve al primo cambio, dai default ricavati dal fornitore: sede = «indirizzo, città», oggetto = descrizione, email del referente = email del fornitore.

**Avvisi.** Si ricalcolano a ogni modifica (B.5.6). Le pillole e l'icona nell'elenco seguono la bozza.

**Allegati** (`AllegatoField` e F24):

- **Carica / Sostituisci**: apre la scelta del file.
- Oltre **2 MB**: toast d'errore con messaggio «Il file supera i 2 MB.» e titolo uguale alla label del campo, oppure «F24» per la cella F24.
- Altrimenti il file viene letto come Data URL e salvato nella bozza come `{nome, dataUrl}`. Viene registrato anche se il tipo non corrisponde a `accept`.
- **Rimuovi** → ConfirmDialog (danger, annullamento «Annulla»):
  - allegato: titolo «Rimuovi allegato», messaggio «Rimuovere «{nome file}» da «{label}»? Il file si toglie dalla bozza e la rimozione diventa definitiva con «Salva».», conferma «Rimuovi»;
  - F24: titolo «Rimuovi F24», messaggio «Rimuovere l’F24 «{nome file}» da questo pagamento? Il file si toglie dalla bozza e la rimozione diventa definitiva con «Salva».», conferma «Rimuovi»;
  - confermando, l'allegato esce dalla bozza (+1 nella barra se l'azienda era salvata così); «Annulla» lascia tutto com'è.

**Pagamenti.**

- «Registra pagamento» aggiunge una riga con id `pag-<base36>`, competenza uguale al mese corrente, fattura vuota, importo 0, data vuota e DURC non verificato.
- Le celle modificano la riga in linea.
- **Elimina pagamento** → ConfirmDialog «Elimina pagamento» / «Eliminare questa registrazione di pagamento?» / «Elimina».

**Stampa del badge.**

- Apre una finestra con il documento HTML dei badge (vedi la scheda Collaboratori esterni, B.6) e lancia `print()` dopo 400 ms.
- Se il browser blocca la finestra: toast d'errore con titolo «Badge» e messaggio «Il browser ha bloccato la finestra di stampa: consenti i pop-up per questo sito.». Per altri errori il messaggio è «Stampa non riuscita.».
- La struttura sul badge è quella corrente (`useStrutturaCorrente`), oppure «Struttura».
- «Stampa badge degli autorizzati» stampa i collaboratori con lo stato `attiva` o `in-scadenza`.

**«Nuovo collaboratore».** Abilitato solo se l'azienda selezionata esiste tra quelle **salvate**. Naviga a `nuovo-collaboratore-esterno:<id>` senza salvare: con modifiche non salvate compare prima la conferma di uscita dalla pagina (A.5), e con «Abbandona» le modifiche vanno perse.

**Ordine dei collaboratori.** Per cognome (`localeCompare`).

**Salva.** Riscrive nello store del catalogo i fornitori **non** in appalto così com'erano, più l'intero elenco delle ditte in appalto della bozza. Il toast è «Aziende in appalto salvate (anche in Purchasing)».

### B.5.6 Dati e regole di business

**Entità.** `Fornitore` (catalogo Purchasing) con `appalto?: boolean` e `datiAppalto?: DatiAppalto`.

`DatiAppalto`:

| Gruppo | Campi |
| --- | --- |
| Identità | `ragioneSociale`, `partitaIva`, `codiceFiscale`, `sedeLegale`, `oggetto` |
| Referente | `referente`, `referenteTelefono`, `referenteEmail` |
| Contratto e regolarità | `contrattoNumero`, `contrattoData`, `contrattoScadenza`, `durcScadenza`, `posizioneInps`, `posizioneInail` |
| Subappalto | `subappalto`, `subappaltoAutorizzazione` |
| DUVRI | `duvri?: { dovuto, allegato?, dataRedazione, dataSottoscrizione, revisione, prossimoAggiornamento, costiSicurezza, esenzione: ''\|'intellettuale'\|'forniture'\|'cinque-uomini-giorno', incaricatoCoordinamento }` |
| Idoneità | `idoneita?: { visura?, visuraData, autocertificazione?, autocertificazioneData }` |
| Informativa rischi | `informativaRischi?: { allegato?, dataConsegna, presaVisioneData, presaVisioneFirmatario }` |
| Fisco | `fisco?: { art17bis, durf?, durfScadenza, pagamenti: { id, periodo 'aaaa-mm', fattura, importo, dataPagamento, durcVerificato, f24? }[] }` |
| Privacy | `privacy?: { informativa?, informativaData, responsabileNecessario, accordo?, accordoData }` |

Ogni allegato è `{ nome, dataUrl? }`.

**Avvisi** (funzione `avvisi(d)`, nell'ordine). `oggi` è la data ISO di oggi, `tra30` = oggi + 30 giorni, le date si formattano `gg/mm/aaaa`:

| # | Condizione | Livello | Testo |
| --- | --- | --- | --- |
| 0 | nessun `datiAppalto` | ko | «Dati identificativi da compilare» (unico avviso) |
| 1 | P. IVA vuota | ko | «P. IVA mancante» |
| 2 | n. contratto vuoto | warn | «Contratto d’appalto non indicato» |
| 3 | scadenza del contratto < oggi | ko | «Contratto scaduto il {gg/mm/aaaa}» |
| 4 | scadenza DURC vuota | warn | «Scadenza DURC non indicata» |
| 4b | DURC < oggi | ko | «DURC scaduto il {data}» |
| 4c | DURC ≤ oggi+30 | warn | «DURC in scadenza il {data}» |
| 5 | subappalto senza autorizzazione | ko | «Subappalto senza autorizzazione» |
| 6 | nessun oggetto `duvri` | ko | «DUVRI da compilare» |
| 6a | DUVRI dovuto senza allegato | ko | «DUVRI non allegato» |
| 6b | dovuto, allegato ma senza data di sottoscrizione | warn | «DUVRI non sottoscritto dall’impresa» |
| 6c | dovuto, prossimo aggiornamento < oggi | ko | «DUVRI da aggiornare dal {data}» |
| 6d | dovuto, prossimo aggiornamento ≤ oggi+30 | warn | «DUVRI da aggiornare entro il {data}» |
| 6e | non dovuto e manca il motivo o l'incaricato | warn | «Esenzione DUVRI: indica motivo e incaricato» |
| 7 | manca l'allegato o la data di consegna dell'informativa rischi | warn | «Informativa rischi ed emergenze non consegnata» |
| 7b | altrimenti, manca la data di presa visione | warn | «Manca la presa visione dell’informativa rischi» |
| 8 | art. 17-bis con DURF e scadenza DURF < oggi | ko | «DURF scaduto il {data}» |
| 8b | art. 17-bis e (nessun DURF, oppure DURF scaduto): pagamenti con data ma senza F24 | ko | «{n} pagamenti senza F24 delle ritenute» |
| 9 | pagamenti con data e DURC non verificato | warn | «{n} pagamenti senza verifica del DURC» |
| 10 | manca l'informativa privacy | warn | «Informativa privacy agli addetti mancante» |
| 11 | responsabile del trattamento necessario ma manca l'accordo | ko | «Manca l’accordo art. 28 GDPR» |
| 12 | manca la visura o l'autocertificazione | warn | «Idoneità tecnico-professionale incompleta» |
| 12b | altrimenti, data della visura < oggi − 6 mesi | warn | «Visura camerale più vecchia di 6 mesi» |

**Completamento**: `empty` senza aziende; `configured` se **nessuna** azienda ha avvisi `ko`; altrimenti `partial`.

**Dipendenze.**

- `statoAutorizzazione(c)`:
  - `futura` se `autorizzatoDal > oggi`;
  - `scaduta` se `autorizzatoAl < oggi`;
  - `in-scadenza` se `autorizzatoAl ≤ oggi+30`;
  - altrimenti `attiva`.
  - Etichette: «Autorizzato», «In scadenza», «Scaduto», «Non ancora attivo».
- `documentiMancanti(c, categoria)`: i documenti richiesti dalla categoria senza file o con una scadenza passata.

**Seed (3 ditte).** Gli avvisi sono calcolati al 5/11/2026.

1. **Splendor Servizi Integrati S.r.l.** (`forn-app-splendor`):
   - Roma, sede «Via dell’Industria 12, Roma», oggetto «Pulizie camere, aree comuni e lavanderia in appalto.»;
   - P. IVA e CF 09876543210, referente Laura Fabbri, +39 06 5550101, l.fabbri@splendorservizi.it;
   - contratto APP-2026/014 del 2026-02-15, scadenza 2027-02-28; DURC 2027-01-15; INPS 7012345678; INAIL 12345678/90;
   - DUVRI dovuto, allegato `DUVRI_Splendor_rev2.pdf`, redatto il 2026-02-10, sottoscritto il 2026-02-15, revisione 2, aggiornamento 2027-02-15, costi 1850;
   - visura `visura_splendor.pdf` del 2026-10-01; autocertificazione `autocert_art26_splendor.pdf` del 2026-02-12;
   - informativa rischi `informativa_rischi_emergenze_2026.pdf`, consegnata il 2026-02-15, presa visione il 2026-02-16 da Laura Fabbri;
   - fisco: art. 17-bis sì, DURF `durf_splendor_2026.pdf` valido fino al 2027-01-31;
   - pagamenti:

     | id | Competenza | Fattura | Importo | Pagata il | DURC ok |
     | --- | --- | --- | --- | --- | --- |
     | pag-s1 | 2026-08 | FT 2026/412 | 18450 | 2026-09-30 | sì |
     | pag-s2 | 2026-09 | FT 2026/468 | 17980 | 2026-10-31 | sì |
     | pag-s3 | 2026-10 | FT 2026/521 | 18200 | — | no |

     Totale «€ 54.630».
   - privacy: informativa `informativa_privacy_esterni.pdf` del 2026-02-20, responsabile necessario, accordo `accordo_art28_splendor.pdf` del 2026-02-15;
   - **nessun avviso**. La nota della responsabilità solidale dice «almeno fino al **28/02/2029**».
2. **Tecno Impianti Hotel S.p.A.** (`forn-app-tecnoimpianti`):
   - P. IVA 01234567890, referente Marco Serra, +39 06 5550202, m.serra@tecnoimpiantihotel.it;
   - contratto APP-2025/031 del 2025-12-10, scadenza 2026-12-31; DURC 2026-11-22; INPS 7023456789; INAIL 23456789/01;
   - DUVRI dovuto, allegato `DUVRI_TecnoImpianti_rev1.pdf`, redatto il 2025-12-01, **non sottoscritto**, revisione 1, aggiornamento 2026-11-20, costi 2400;
   - visura `visura_tecnoimpianti.pdf` del 2025-11-28, senza autocertificazione; nessuna informativa, fisco o privacy;
   - avvisi (tutti warn): «DURC in scadenza il 22/11/2026», «DUVRI non sottoscritto dall’impresa», «DUVRI da aggiornare entro il 20/11/2026», «Informativa rischi ed emergenze non consegnata», «Informativa privacy agli addetti mancante», «Idoneità tecnico-professionale incompleta». Icona arancione.
3. **Movi Facchinaggio Soc. Coop.** (`forn-app-movi`):
   - Fiumicino, P. IVA 05554443332, referente Paolo Rinaldi, +39 06 5550303, senza email;
   - contratto APP-2026/022 del 2026-04-20, scadenza 2026-10-31; DURC 2026-09-30;
   - subappalto con «Autorizzazione al subappalto n. 7/2026 del 22/04/2026 (appaltatore principale: Splendor Servizi Integrati)»;
   - DUVRI dovuto ma vuoto, idoneità vuota;
   - avvisi: «Contratto scaduto il 31/10/2026» (ko), «DURC scaduto il 30/09/2026» (ko), «DUVRI non allegato» (ko), «Informativa rischi ed emergenze non consegnata», «Informativa privacy agli addetti mancante», «Idoneità tecnico-professionale incompleta». Icona rossa.

**Collaboratori del seed.** Il fornitore è indicato tra parentesi, la scadenza dell'autorizzazione dopo la freccia.

| id | Nome | Azienda | Categoria | N. badge | Autorizzazione | Stato | Documenti mancanti |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ce-1 | Morra Elena | Splendor | Addetto pulizie | EST-0001 | 2026-03-01 → 2027-02-28 | Autorizzato | — |
| ce-2 | Lupo Davide | Tecno Impianti | Manutentore | EST-0002 | 2026-01-01 → oggi + 18 giorni | In scadenza | — |
| ce-3 | Benali Karim | Movi | Facchino | EST-0003 | 2026-05-01 → 2026-10-31 | Scaduto | DURC |

Le date relative (oggi + 18) si calcolano al caricamento dello store.

**Persistenza:**

- `sibylla.catalogo-appalto` v2: solo i fornitori con `appalto: true`, con il merge sul seed di A.6;
- `sibylla.collaboratori-esterni` v2.

Gli allegati sono salvati come **Data URL dentro `localStorage`**, con il rischio di superare la quota: il backend li deve sostituire con gli upload.

Tutti gli avvisi e gli stati dipendono dalla **data odierna**.

### B.5.7 Backend da realizzare

**Endpoint:**

| Operazione | Endpoint | Note |
| --- | --- | --- |
| Lettura | `GET /Sibylla/purchasing/fornitori/appalto` | risponde con `Fornitore[]` con `appalto: true`, `datiAppalto` e gli allegati come `{ id, nome, url }`, senza `dataUrl` |
| Salvataggio | `PUT /Sibylla/purchasing/fornitori/appalto` | `{ version, fornitori }`: sostituisce le ditte in appalto, crea quelle nuove (id assegnato dal server oppure accettato `forn-app-*`) e non tocca gli altri fornitori; transazionale; aggiorna anche l'anagrafica fornitori di Purchasing (`nome` = `ragioneSociale`) |
| Upload | `POST /Sibylla/hr/allegati` (multipart) | `{ file, contesto: 'appalto', fornitoreId, tipo: 'duvri'\|'visura'\|'autocertificazione'\|'informativaRischi'\|'durf'\|'f24'\|'informativaPrivacy'\|'accordo28' }` → `201 { id, nome, url, mime, size }`; `413 { message: 'Il file supera i 2 MB.' }`; `415` se il tipo non è PDF né immagine |
| Visualizza | `GET` sull'`url` dell'allegato | con autorizzazione |
| Avvisi (consigliato) | calcolati anche lato server per le notifiche di scadenza | per esempio un job giornaliero «DURC in scadenza» verso il Centro notifiche dell'ufficio del personale. Oggi **non esistono** notifiche: è solo una proposta |
| Badge | — | la stampa resta sul client (HTML con il QR). Non serve un endpoint |

**Validazione:**

- `partitaIva` di 11 cifre se valorizzata;
- `ragioneSociale` obbligatoria;
- `subappaltoAutorizzazione` obbligatoria se `subappalto`;
- `esenzione` dentro l'enumerazione;
- `pagamenti[].periodo` nel formato `aaaa-mm`;
- `importo` ≥ 0.

Oggi l'interfaccia segnala i problemi come avvisi ma **non blocca il salvataggio**. Per restare identici, il server deve accettare dati incompleti e rifiutare solo i formati non validi.

### B.5.8 Stile

**Elenco:**

| Selettore | Valori |
| --- | --- |
| `.cfg-hrapp` | `flex column; gap:12px; 13px` |
| `__layout` | `grid 270px minmax(0,1fr); gap:18px; align-items:start` |
| `__list`, `__item` | come in CCNL: card con hover `--color-primary-300` e attivo con anello primary |
| `__item-ico` | 32×32 `--color-primary-50` / `--color-primary`, 15px |
| `__item-text` | `flex:1; min-width:0; gap:2px` |
| `__item-name` | peso 600 |
| `__item-meta` | 11px, inattivo, `nowrap`, ellipsis |
| `__item-warn` | `flex-shrink:0`; `--ko` `--color-error`, `--warn` `--color-warning` |

**Dettaglio e avvisi:**

| Selettore | Valori |
| --- | --- |
| `__detail` | `flex column; gap:12px; min-width:0; padding:16px 18px 18px; card` |
| `__head-name` | Poppins 15px, peso 600 |
| `__head-meta` | 12px, inattivo |
| `__avvisi` | `flex; wrap; gap:6px; list-style:none; margin:0; padding:0` |
| `__avviso` | `inline-flex; gap:6px; height:24px; padding:0 10px; border-radius:12px; 11.5px; peso 600` |
| `__avviso--ko` | `color:--color-error; background:alpha(error,.1)` |
| `__avviso--warn` | `color:--color-warning; background:alpha(warning,.13)` |
| `__sub` | `margin:8px 0 0`, Poppins 13px, peso 600, `--color-text-active` |
| `__grid` | `grid 2×minmax(0,1fr); gap:14px` |
| `__span2` | `span 2` |
| `__detail .cfg-hrapp__tabs` | `margin-bottom:4px` |
| `__hint` | `margin:-4px 0 0; 12px; inattivo` |

**Pagamenti:**

| Selettore | Valori |
| --- | --- |
| `__pagamenti .sib-table td` | `padding-left/right:6px` |
| `__pagamenti .sib-table td .sib-input` | `padding-left:8px; padding-right:4px; font-size:12px` |
| `__center` | centrato |
| `__f24` | `flex; center; gap:4px; min-width:0; 12px` |
| `__f24 .cfg-hrapp__f24-req i` | `--color-error` |

**Allegati:**

| Selettore | Valori |
| --- | --- |
| `__docs` | `flex column; gap:8px` |
| `__doc` | `flex; align-items:flex-end; space-between; gap:14px; wrap; padding:10px 14px; border:1px solid --color-border; border-radius:6px` |
| `__doc-label` | `flex column; flex-start; align-self:center; gap:4px` |
| `__doc-name` | 13px, peso 600, `--color-text-active` |
| `__doc-main` | `flex; flex-end; gap:10px; wrap; min-width:0` |
| `__doc-file` | `inline-flex; gap:6px; max-width:280px; min-width:0; align-self:center; 12px; inattivo`; icona primary |
| `__doc-date` | `width:170px` |

**Collaboratori e badge:**

| Selettore | Valori |
| --- | --- |
| `__coll-bar` | `flex; flex-end; space-between; gap:12px; wrap; margin-top:6px; padding-top:14px; border-top:1px solid --color-border` |
| `__coll-acts` | `flex; gap:8px; wrap` |
| `__nome` | `flex; gap:6px; min-width:0; peso 600` |
| `__code` | 11.5px, peso 600, `letter-spacing:.4px`, inattivo |
| `__badge` | `inline-block; height:22px; line-height:22px; padding:0 8px; border-radius:11px; 11px; peso 600; nowrap` |
| `__badge--attiva` | success, sfondo `alpha(success,.12)` |
| `__badge--in-scadenza` | warning, `alpha(warning,.13)` |
| `__badge--scaduta` | error, `alpha(error,.1)` |
| `__badge--futura` | inattivo, `alpha(text-inactive,.1)` |
| `__actions` | a destra, `nowrap` |

### B.5.9 Responsività

- `@container (max-width: 900px)`: layout a una colonna; elenco in riga che va a capo, con elementi `flex:1 1 220px`.
- `@container (max-width: 560px)`: griglie a 1 colonna e `span2` su `auto`.
- Le tabelle Pagamenti e Collaboratori sono in % fisse, con la compattazione comune: nessuno scroll orizzontale. Nella tabella dei pagamenti i campi in cella sono compattati (padding 6px, input 12px), così date e mesi si leggono per intero a 1366px.
- I blocchi allegato vanno a capo (`flex-wrap`).

### B.5.10 Effetti e animazioni

Solo le transizioni degli elementi dell'elenco (150ms) e quelle comuni. Il cambio di scheda interna non ha animazione.

### B.5.11 Accessibilità

- L'icona d'avviso nell'elenco ha l'`aria-label` con l'elenco degli avvisi: non c'è un tooltip, quindi chi vede può leggere gli avvisi solo nella testa del dettaglio.
- Tutti i pulsanti icona hanno l'aria-label e il Tooltip.
- I campi in tabella hanno l'`ariaLabel`.
- Il disabilitato di «Nuovo collaboratore» è spiegato dal `Tooltip` scuro «Salva prima la nuova azienda».

### B.5.12 Criteri di accettazione

1. L'elenco mostra 3 ditte: Splendor senza icona, Tecno Impianti con il triangolo arancione, Movi con il triangolo rosso, al 5/11/2026.
2. Le meta mostrano «1 collaboratori · P. IVA 09876543210».
3. Selezionando Movi compaiono le pillole rosse «Contratto scaduto il 31/10/2026», «DURC scaduto il 30/09/2026», «DUVRI non allegato» e tre pillole arancioni.
4. Le schede interne sono 5, con «Collaboratori (1)».
5. Scrivendo lettere nella Partita IVA vengono scartate; il campo accetta al massimo 11 cifre.
6. Accendendo il subappalto compare il campo obbligatorio degli estremi; lasciandolo vuoto compare la pillola rossa «Subappalto senza autorizzazione».
7. Spegnendo «DUVRI dovuto» compaiono «Motivo dell’esenzione» e «Incaricato…», con l'avviso «Esenzione DUVRI: indica motivo e incaricato».
8. Caricando un file da 3 MB compare il toast «Il file supera i 2 MB.»; con un PDF da 1 MB il badge diventa «Allegato», con il nome del file e l'occhio.
9. In Pagamenti di Splendor ci sono 3 righe e il totale «€ 54.630»; «Registra pagamento» aggiunge una riga con il mese corrente.
10. Con art. 17-bis attivo e senza DURF, la graffetta F24 è rossa con il tooltip «Allega l’F24 delle ritenute (richiesto)».
11. In Collaboratori di Movi, Benali Karim ha il triangolo con il tooltip «Documenti mancanti: DURC» e il badge «Scaduto»; «Stampa badge degli autorizzati (0)» è disabilitato.
12. «Nuova azienda» crea «Nuova azienda» con «P. IVA mancante» e «DUVRI da compilare»; «Nuovo collaboratore» è disabilitato e al passaggio del mouse il Tooltip scuro dice «Salva prima la nuova azienda».
13. Salvando compare il toast «Aziende in appalto salvate (anche in Purchasing)» e la ditta appare in Lista fornitori.
14. La scheda mostra «Da completare» finché almeno una ditta ha un avviso rosso.
15. In «Sicurezza» di Splendor, «Rimuovi» sul DUVRI apre «Rimuovi allegato» con «Rimuovere «DUVRI_Splendor_rev2.pdf» da «DUVRI firmato (PDF)»? …»; «Annulla» lascia il file, «Rimuovi» lo toglie e la barra conta +1. Lo stesso per la × dell'F24 in «Pagamenti e fisco».

### B.5.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrAziendeAppalto/HrAziendeAppalto.tsx`, `HrAziendeAppalto.sass`
- `src/admin/SibyllaAdminPanel/catalogo/types.ts` (`Fornitore`, `DatiAppalto` e sotto-tipi)
- `src/admin/SibyllaAdminPanel/catalogo/mockData.ts` (`FORNITORI_APPALTO_INIT`)
- `src/store/useCatalogoStore.ts` (persist `sibylla.catalogo-appalto`)
- `src/store/useCollaboratoriEsterniStore.ts` (`statoAutorizzazione`, `documentiMancanti`, `STATO_AUT_LABEL`, seed)
- `src/modules/hr/_badge/badgeEsterno.ts` (`stampaBadge`)

---

## B.6 · Collaboratori esterni (`hr-collaboratori-esterni`)

### B.6.1 Scopo e utenti

Configura due cose:

1. le **categorie** degli addetti delle ditte in appalto, che non sono dipendenti: niente CCNL, ferie o cedolini. Ogni categoria fissa i reparti dell'App Op! a cui l'addetto può accedere, i documenti da raccogliere e la durata massima dell'autorizzazione: alla scadenza l'accesso all'app si spegne;
2. il **badge di riconoscimento** (tessera art. 26 c. 8 D.Lgs. 81/2008): campi, colore della banda, orientamento, formato di stampa e retro, con l'anteprima dal vivo.

Le aziende stanno nella scheda «Aziende in appalto»; gli addetti si registrano da Crea collaboratore esterno o dall'Archivio › Collaboratori esterni. Lo usa l'ufficio del personale.

### B.6.2 Accesso

- Scheda 6. Deep link `hr-configurazione:hr-collaboratori-esterni`.
- Non ci sono navigazioni in uscita.
- Il badge configurato qui si stampa dalla scheda del collaboratore, dall'Archivio e da Aziende in appalto.

### B.6.3 Layout

```
.cfg-hrest.cfg-hr-pane (flex column · gap 22px · 13px)
section.__section (flex col · gap 10)
┌ CfgToolbar ─────────────────────────────────────────────────────────────────┐
│ Categorie di collaboratori                               [⊕ Nuova categoria]│
│ Per ogni categoria: reparti dell’App Op! …                                  │
└─────────────────────────────────────────────────────────────────────────────┘
┌ CfgTable ───────────────────────────────────────────────────────────────────┐
│Categoria 20%│Reparti App Op! 20%│Documenti richiesti 28%│Durata max 10%▸│Addetti 9%▸│Azioni 13%▸│
│● Addetto pulizie│Pulizie│Contratto d’appalto, DURC, …│12 mesi│1│ ✎ 🗑 │
└─────────────────────────────────────────────────────────────────────────────┘
section.__section
 Badge di riconoscimento (h3) + descrizione
┌ .__badge (grid minmax(0,1fr) | auto · gap 22) ──────────────────────────────────────┐
│ ┌ __badge-form (flex col · gap 14) ─────────────┐  ┌ __badge-prev (tratteggiato) ─┐ │
│ │ [Intestazione (committente)       ] hint      │  │ Anteprima                    │ │
│ │ Orientamento (•)Orizz ( )Vert | Formato (•)A4 │  │ ┌ iframe badge fronte ─────┐ │ │
│ │ Colore della banda ● ● ● ● ● ● ● ●            │  │ │ banda colore …           │ │ │
│ │ [t] Data di nascita     [t] Mansione (cat.)   │  │ └──────────────────────────┘ │ │
│ │ [t] Periodo di validità [t] Partita IVA …     │  │ ┌ retro ───────────────────┐ │ │
│ │ [t] QR code di verifica [t] Stampa il retro   │  │ └──────────────────────────┘ │ │
│ │ [Dicitura in calce                       ]    │  └──────────────────────────────┘ │
│ │ [Testo del retro (textarea 3)            ]    │                                   │
│ │ Foto, nome e cognome… obbligatori per legge.  │                                   │
│ └───────────────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
[CfgSaveBar]
```

**Modale della categoria (md, 600px):**

```
[Categoria*] [Durata massima autorizzazione (mesi)]
[Reparti App Op! consentiti ▾ multiselect]
[Documenti richiesti        ▾ multiselect]
Gli addetti esterni entrano nell’app sempre con grado Impiegato e senza funzioni HR.
Colore ● ● ● ● ● ● ● ●
[toggle] Categoria attiva
```

### B.6.4 Elementi e testi

**Sezione delle categorie.**

- Titolo «Categorie di collaboratori».
- Descrizione «Per ogni categoria: reparti dell’App Op! a cui l’addetto può accedere, documenti da raccogliere e durata massima dell’autorizzazione.».
- Pulsante «Nuova categoria» (`sib-btn--primary`, icona `fa-light fa-circle-plus`).

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Categoria» | 20% | `HrDot` + nome |
| «Reparti App Op!» | 20% | nomi Op! separati da «, », oppure «—» |
| «Documenti richiesti» | 28% | elenco separato da «, », oppure «—» |
| «Durata max» | 10%, a destra | «12 mesi» |
| «Addetti» | 9%, a destra | numero di collaboratori con quella categoria |
| «Azioni» | 13%, a destra | Modifica ed Elimina |

Una riga non attiva ha tutte le celle in `--color-text-inactive`. La tabella vuota ha il testo di default «Nessun elemento configurato».

**Sezione del badge.**

- Titolo «Badge di riconoscimento».
- Descrizione «Tessera degli addetti delle imprese in appalto: foto, generalità, impresa, data di assunzione e, in subappalto, l’autorizzazione. Si stampa dalla scheda del collaboratore, dall’Archivio e da Aziende in appalto.».

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| `intestazione` | InputField `bdg-int` | «Intestazione (committente)» | placeholder = nome della struttura corrente, oppure «Nome della struttura»; hint «Vuoto = nome della struttura corrente.» |
| `orientamento` | RadioGroup `bdg-or` | «Orientamento» | «Orizzontale» / «Verticale» |
| `formatoStampa` | RadioGroup `bdg-fmt` | «Formato di stampa» | «Foglio A4 da ritagliare» (`a4`) / «Tessera CR80 (stampante di card)» (`cr80`) |
| `colore` | HrColorPicker | «Colore della banda» | 8 colori `--chart-*` |
| `mostraNascita` | ToggleSwitch | «Data di nascita» | |
| `mostraCategoria` | ToggleSwitch | «Mansione (categoria)» | |
| `mostraValidita` | ToggleSwitch | «Periodo di validità» | |
| `mostraPartitaIva` | ToggleSwitch | «Partita IVA dell’impresa» | |
| `mostraQr` | ToggleSwitch | «QR code di verifica» | |
| `retro` | ToggleSwitch | «Stampa anche il retro» | |
| `dicitura` | InputField `bdg-dic` | «Dicitura in calce» | |
| `testoRetro` | TextareaField `bdg-retro`, 3 righe | «Testo del retro» | solo se `retro` |

- I due RadioGroup sono affiancati in una riga `hrcfg-modal__row` di 2 colonne; i 6 toggle in una griglia di 2 colonne.
- Nota finale: «Foto, nome e cognome, impresa e data di assunzione compaiono sempre: sono obbligatori per legge.».
- Riquadro dell'anteprima: etichetta «Anteprima» e l'iframe del badge con il **primo collaboratore registrato**. Senza collaboratori: «Registra un collaboratore esterno per vedere l’anteprima.».

**Modale della categoria.**

- Titolo «Nuova categoria di collaboratori» oppure «Modifica categoria».
- Conferma «Crea categoria» oppure «Salva modifiche».

| Campo | Componente | Label | Note |
| --- | --- | --- | --- |
| `nome` | InputField `cest-nome` | «Categoria» (obbligatorio) | placeholder «Es. Manutentore» |
| `durataMaxMesi` | InputField number `cest-dur`, min 1, max 36 | «Durata massima autorizzazione (mesi)» | `Number(v) \|\| 1`; default 12 |
| `repartiOp` | CfgMultiSelect | «Reparti App Op! consentiti» | placeholder «Scegli i reparti», `nomePlurale` «reparti»; opzioni nell'ordine: Pulizie, Manutenzione, Magazzino, Front Office, Food & Beverage, Purchasing (sono **esclusi** Risorse umane e Business Intelligence); **almeno 1** |
| `documenti` | CfgMultiSelect | «Documenti richiesti» | placeholder «Nessun documento», `nomePlurale` «documenti»; opzioni: «Contratto d’appalto», «DURC», «Formazione sicurezza», «Documento d’identità», «Attestato HACCP», «Idoneità sanitaria»; default «Contratto d’appalto» e «Documento d’identità» |
| Nota | hint | «Gli addetti esterni entrano nell’app sempre con grado Impiegato e senza funzioni HR.» | |
| `colore` | HrColorPicker | «Colore» | default 1 |
| `attiva` | ToggleSwitch | «Categoria attiva» | default acceso |

Il DUVRI **non** è tra i documenti dell'addetto: è un documento dell'appalto (vedi B.5).

### B.6.5 Stati e interazioni

**Categorie.**

- La conferma è abilitata se il nome non è vuoto **e** c'è almeno un reparto Op!. Il nome passa da `trim`; una categoria nuova prende l'id `nuovoId('cest')` e va in coda.
- **Elimina categoria** → ConfirmDialog:
  - titolo «Elimina categoria»;
  - se la categoria è assegnata a n collaboratori: «La categoria «{nome}» è assegnata a {n} collaboratori: resteranno senza categoria finché non ne scegli un'altra.»;
  - altrimenti: «Eliminare la categoria «{nome}»?»;
  - conferma «Elimina».

**Badge.**

- Ogni controllo cambia la bozza `badge`, e l'anteprima si aggiorna subito perché legge la bozza, non il salvato.
- Spegnendo «Stampa anche il retro» sparisce il campo «Testo del retro» e il retro dall'anteprima.

**Conteggio delle modifiche.** `diffCount(categorie)` + **1** se il badge differisce in qualsiasi campo: tutte le modifiche al badge contano una sola modifica.

**Anteprima.**

- Usa la bozza delle categorie per la mansione.
- Il QR si rigenera solo quando cambia il suo contenuto: `SIBYLLA-EST|{numeroBadge o id}|{Cognome} {Nome}|{autorizzatoAl}`.

### B.6.6 Dati e regole di business

**Entità:**

- `CategoriaEsterniHr { id, nome, repartiOp: RepartoOp[], documenti: string[], durataMaxMesi, colore 1..8, attiva }`;
- `BadgeConfigHr { intestazione, colore, orientamento: 'orizzontale'|'verticale', formatoStampa: 'cr80'|'a4', mostraNascita, mostraCategoria, mostraValidita, mostraPartitaIva, mostraQr, retro, dicitura, testoRetro }`.

**Completamento**: `configured` se almeno una categoria è attiva, altrimenti `empty`.

**Seed delle categorie (3):**

| id | Nome | Reparti Op! | Documenti | Durata | Colore | Addetti |
| --- | --- | --- | --- | --- | --- | --- |
| cest-pul | Addetto pulizie | Pulizie | Contratto d’appalto, DURC, Formazione sicurezza, Documento d’identità | 12 mesi | 3 | 1 |
| cest-man | Manutentore | Manutenzione | idem | 12 mesi | 4 | 1 |
| cest-fac | Facchino | Front Office, Magazzino | Contratto d’appalto, DURC, Documento d’identità | 6 mesi | 1 | 1 |

**Badge di default:**

| Campo | Valore |
| --- | --- |
| `intestazione` | `''` |
| `colore` | 1 |
| `orientamento` | orizzontale |
| `formatoStampa` | **a4** |
| `mostraNascita`, `mostraCategoria`, `mostraValidita`, `mostraPartitaIva`, `mostraQr`, `retro` | tutti `true` |
| `dicitura` | «Tessera di riconoscimento — art. 26 c. 8 D.Lgs. 81/2008 e art. 5 L. 136/2010» |
| `testoRetro` | «Il titolare è autorizzato ad accedere alla struttura solo nel periodo indicato. In caso di smarrimento avvisare il ricevimento. La tessera va esposta in modo visibile durante il servizio.» |

**Documento del badge** (stesso HTML per l'anteprima nell'iframe e per la stampa; dimensioni in mm). Tessera CR80: 85,6 × 54 mm in orizzontale, 54 × 85,6 mm in verticale.

Fronte (`.card.front`):

- **Banda** nel colore `--chart-N`, letto dal tema corrente con `getComputedStyle`; fallback `#204769`:
  - a sinistra l'intestazione, oppure il nome della struttura;
  - a destra «Collaboratore esterno», in maiuscolo.
- **Foto**:
  - orizzontale 22 × 28 mm, verticale 24 × 30 mm;
  - senza foto, le iniziali su sfondo `#E2E8F0`.
- **Nome** «{Cognome} {Nome}», 3,9 mm, grassetto.
- **Righe dt/dd**, nell'ordine:
  - «Impresa»;
  - «P. IVA», se attivo e presente;
  - «Nato/a il», se attivo;
  - «Assunto/a il», sempre;
  - «Mansione», se attivo e con una categoria;
  - «Valido» «gg/mm/aaaa – gg/mm/aaaa», se attivo.
- **QR**, se attivo: 14 mm in orizzontale, 15 mm in verticale, con il numero del badge sotto.
- **Riga di subappalto**, se presente: «Subappalto · {autorizzazione}» in `#B45309`.
- **Piede** con la dicitura; se il QR è spento si aggiunge « · N. {numero}».

Retro (`.card.back`):

- banda sottile con l'intestazione e «N. {numero}»;
- testo del retro;
- «Impresa» (ragione sociale · sede), «Contratto» (numero «del» data), «Referente» (nome · telefono);
- riga «Firma del titolare».

Altri valori fissi del documento:

- carattere Open Sans, testo `#1E293B`;
- bordo della card 0,3 mm `#CBD5E1`, radius 3 mm.

Dimensioni dell'iframe dell'anteprima:

| Caso | Dimensioni |
| --- | --- |
| Orizzontale | `calc(85.6mm + 12mm)` × `calc(54mm + 12mm)` |
| Verticale | `calc(54mm + 12mm)` × `calc(85.6mm + 12mm)` |
| Orizzontale con retro (le due facce impilate) | altezza `calc(54mm*2 + 18mm)` |
| Verticale con retro | altezza `calc(85.6mm*2 + 18mm)` |

In tutti i casi `max-width:100%` e nessun bordo.

Stampa:

- A4: `@page{size:A4;margin:10mm}`, card affiancate con gap di 4 mm;
- CR80: `@page{size:<w>mm <h>mm;margin:0}`, una tessera per pagina.

Persistenza: `sibylla.hr-config` → `categorieEsterni` e `badge`.

### B.6.7 Backend da realizzare

`PUT /Sibylla/hr/config/collaboratori-esterni` con `{ version, categorie, badge }`, in una transazione.

**Validazione (400):**

- `nome` obbligatorio;
- `repartiOp` non vuoto, dentro l'enumerazione Op! ed escludendo `risorseUmane` e `businessIntelligence`;
- `documenti` dentro l'elenco ammesso;
- `durataMaxMesi` tra 1 e 36;
- `colore` tra 1 e 8;
- `orientamento` e `formatoStampa` dentro le enumerazioni.

**Effetti lato server (da realizzare):**

- alla scadenza dell'autorizzazione (`autorizzatoAl`) l'accesso all'App Op! dell'addetto va disattivato;
- un addetto può entrare solo nei reparti della sua categoria, sempre con il grado «Impiegato» e senza funzioni HR;
- quando si elimina una categoria, i collaboratori che la usavano restano senza categoria (`categoriaId` vuoto).

Non sono previste notifiche.

### B.6.8 Stile

| Selettore | Valori |
| --- | --- |
| `.cfg-hrest` | `flex column; gap:22px; 13px` |
| `__section` | `flex column; gap:10px` |
| `__title` | Poppins 14px, peso 600, `--color-text-active`, `margin:0` |
| `__desc` | `margin:2px 0 0; 12.5px; inattivo` |
| `__name` | `flex; gap:8px; min-width:0; peso 600` |
| `__row--off td` | inattivo |
| `__num` | a destra, `tabular-nums` |
| `__actions` | a destra, `nowrap` |
| `__badge` | `grid minmax(0,1fr) auto; gap:22px; align-items:start` |
| `__badge-form` | `flex column; gap:14px; min-width:0` |
| `__toggles` | `grid repeat(2, minmax(0,1fr)); gap:10px 18px` |
| `__badge-prev` | `flex column; gap:8px; padding:12px; border:1px dashed --color-border; border-radius:6px; background:--color-bg` |
| `.badge-prev` | `display:block; border:0; max-width:100%; background:transparent` + le dimensioni in mm di B.6.6 |

### B.6.9 Responsività

- `@container (max-width: 980px)`: `.cfg-hrest__badge` diventa una colonna e l'anteprima va sotto il form.
- Tabella delle categorie in % fisse con la compattazione comune: nessuno scroll orizzontale; documenti e reparti lunghi con ellipsis e tooltip.
- L'iframe non supera mai la larghezza del contenitore (`max-width:100%`).

### B.6.10 Effetti e animazioni

- Il QR si genera in modo asincrono: finché non è pronto l'anteprima non lo mostra.
- Le modifiche al badge si riflettono subito nell'iframe, senza transizione.
- Valgono le animazioni comuni.

### B.6.11 Accessibilità

- L'iframe ha il `title` «Anteprima badge di {Nome} {Cognome}».
- I RadioGroup e i ToggleSwitch sono i componenti condivisi.
- Le multiselect sono accessibili come in A.8.

### B.6.12 Criteri di accettazione

1. La tabella mostra 3 categorie con i reparti «Pulizie», «Manutenzione» e «Front Office, Magazzino», le durate 12/12/6 mesi e 1 addetto ciascuna.
2. In «Nuova categoria» il pulsante «Crea categoria» resta disabilitato finché non si scelgono il nome **e** almeno un reparto.
3. La multiselect dei reparti ha 6 opzioni, senza Risorse umane né Business Intelligence; scegliendone 2 il trigger dice «2 reparti selezionati» (e «2 documenti selezionati» per i documenti).
4. I documenti di default di una nuova categoria sono «Contratto d’appalto» e «Documento d’identità»; «DUVRI» non è tra le opzioni.
5. Eliminando «Facchino» la conferma dice «…è assegnata a 1 collaboratori: resteranno senza categoria…».
6. L'anteprima mostra il badge di Morra Elena (Splendor), con la banda `--chart-1`, il QR e il retro sotto.
7. Scegliendo «Verticale» l'iframe passa a 54 mm di larghezza; spegnendo «QR code di verifica» il piede mostra « · N. EST-0001».
8. Modificando tre campi del badge la barra dice «1 modifica non salvata».
9. Svuotando l'intestazione la banda mostra il nome della struttura corrente.
10. Sotto i 980px di pannello l'anteprima va sotto il form.
11. Il toast di salvataggio è «Collaboratori esterni salvati».

### B.6.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrCollaboratoriEsterni/HrCollaboratoriEsterni.tsx`, `HrCollaboratoriEsterni.sass`
- `src/modules/hr/_badge/BadgeAnteprima.tsx`, `BadgeAnteprima.sass`, `badgeEsterno.ts`
- `src/store/useHrConfigStore.ts` (`CategoriaEsterniHr`, `BadgeConfigHr`, `BADGE_DEFAULT`, `DOCUMENTI_ESTERNI`, `SEED_CATEGORIE_ESTERNI`)
- `src/store/useCollaboratoriEsterniStore.ts`, `src/store/useCatalogoStore.ts`, `src/hooks/useStrutturaCorrente`

---

## B.7 · Integrazione paghe (`hr-integrazione-paghe`)

### B.7.1 Scopo e utenti

È il collegamento con il **software paghe** che elabora i cedolini (dello studio del consulente del lavoro o interno). Per ciascuno dei 6 software supportati si configura un profilo:

- canale: API, SFTP o email al consulente;
- campi del collegamento;
- prova del collegamento;
- formato del tracciato presenze;
- chiave con cui il software riconosce il dipendente;
- codici voce;
- codici dei dipendenti.

**Un solo software è «in uso»**: è quello che usa Registro presenze › Trasmetti consuntivo. Le **regole d'invio** valgono per tutti i software. Lo usano l'ufficio del personale e l'amministrazione.

### B.7.2 Accesso

- Scheda 7. Deep link `hr-configurazione:hr-integrazione-paghe`, aperto anche dall'azione «Configura» del Registro presenze.
- Non ci sono navigazioni in uscita.

### B.7.3 Layout

```
.cfg-hrpag.cfg-hr-pane (flex column · gap 12px · 13px · container inline-size)
.__layout (grid 260px | minmax(0,1fr) · gap 18 · align start)
┌ aside.__list (aria-label «Software paghe») ┐ ┌ section.__detail (card senza padding) ──────────────────────┐
│┌[ZU] Zucchetti                        ✓ ┐│ │ header (padding 14 18 · border-bottom)                      │
││     Paghe Project / Infinity HR        ││ │ [ZU] Zucchetti Paghe Project / Infinity HR   [In uso per il consuntivo] [🗑]│
│└────────────────────────────────────────┘│ │      Rilevazione presenze verso Paghe Project…               │
│ [TS] TeamSystem  · Paghe / HR Lynfa…   ○ │ ├ block «Collegamento» (padding 16 18) ───────────────────────┤
│ [IN] Inaz        · Paghe Inaz / HRM    ○ │ │ ┌ API ───────────┐┌ SFTP ──────────┐┌ Email ─────────┐       │
│ [SI] Sistemi     · Job Paghe           ○ │ │ └────────────────┘└────────────────┘└────────────────┘       │
│ [RA] Ranocchi    · Paghe Web           ○ │ │ grid 3 col: [Codice ditta*][Codice azienda][URL tenant*]…    │
│ [AD] ADP         · Workforce Now /…    ○ │ │ [⚡ Prova collegamento]  ✓ Collegamento riuscito… 02/11/2026 alle 10:00│
└──────────────────────────────────────────┘ ├ block «Tracciato presenze» ───────────────────────────────────┤
                                             │ [Formato del file ▾] [Dipendente riconosciuto da ▾]          │
                                             │ Codici voce                       [↺ Ripristina i codici …]  │
                                             │ CfgTable Voce│Descrizione│Codice (│Somma all'ordinario)       │
                                             ├ block «Codici dei dipendenti  Matricola Zucchetti» ───────────┤
                                             │ CfgTable Dipendente 40%│Reparto 30%│Codice in Zucchetti 30%   │
                                             ├ block «Invio del consuntivo  vale per tutti i software» ──────┤
                                             │ [t] Invio automatico a fine mese                             │
                                             │     [Giorno del mese successivo ▾][Alle]                     │
                                             │ [t] Trasmetti solo lo straordinario approvato                │
                                             │ [t] Blocca l'invio con timbrature anomale                    │
                                             │ [t] Avvisa l'ufficio del personale dell'esito                │
                                             └──────────────────────────────────────────────────────────────┘
[CfgSaveBar]
```

I blocchi sono separati da un bordo superiore di 1px (`& + &`).

### B.7.4 Elementi e testi

**Elemento dell'elenco**, uno per software nell'ordine del catalogo:

- riquadro con la **sigla**, perché non si usano loghi di terzi;
- nome del produttore (peso 700);
- nome del prodotto (meta con ellipsis);
- icona di stato con il Tooltip:

| Stato | Condizione | Icona | Colore |
| --- | --- | --- | --- |
| «In uso» | è il software `inUso` | `fa-solid fa-circle-check` | `--color-primary` |
| «Collegato» | profilo con ultimo test riuscito | `fa-solid fa-plug-circle-check` | `--color-success` |
| «Da verificare» | profilo presente ma non verificato | `fa-solid fa-circle-half-stroke` | `--color-warning` |
| «Non configurato» | nessun profilo | `fa-solid fa-circle` | `--color-border` |

**Testa del dettaglio:**

- sigla grande 44×44;
- «{produttore} {nome}» (15px, peso 700) e la descrizione del software;
- azioni:
  - se è in uso, l'etichetta «In uso per il consuntivo» con `fa-solid fa-circle-check` in primary;
  - altrimenti il pulsante «Usa per il consuntivo» (`sib-btn--secondary`);
  - se il profilo esiste, il pulsante icona `fa-solid fa-trash` (in `--color-primary`, 16px) con Tooltip e aria-label «Rimuovi configurazione».

**Blocco «Collegamento».**

Le schede dei **canali** disponibili per il software (`role="radiogroup"`, aria-label «Canale di invio»; ogni scheda `role="radio"` con `aria-checked`):

| Canale | Icona | Etichetta | Descrizione |
| --- | --- | --- | --- |
| `api` | `fa-solid fa-plug` | «Collegamento diretto (API)» | «Il consuntivo arriva nel software paghe senza passaggi manuali.» |
| `sftp` | `fa-solid fa-server` | «File su SFTP» | «Sibylla deposita il tracciato nella cartella del consulente.» |
| `email` | `fa-solid fa-envelope` | «Email al consulente» | «Il tracciato parte in allegato all’indirizzo del consulente.» |

I **campi** del canale scelto stanno in una griglia di 3 colonne. Ogni campo è un `InputField`, con `type` password, url, email o text, oppure un `SelectField` se il tipo è `select`. Gli obbligatori hanno l'asterisco. Placeholder e hint vengono dal catalogo (B.7.6).

**Riga di prova:**

- pulsante «Prova collegamento» (`sib-btn--secondary`, icona `fa-solid fa-plug-circle-bolt`); durante la verifica diventa «Verifica in corso…» con l'icona `fa-solid fa-spinner fa-spin` ed è disabilitato;
- accanto, l'esito:
  - dopo un test: icona `fa-circle-check` (verde) o `fa-circle-xmark` (rosso), il messaggio e la data «gg/mm/aaaa alle hh:mm» in grigio;
  - senza test: «Compila: {label dei campi obbligatori mancanti, separate da «, »}.» se mancano dati, altrimenti «Collegamento non ancora verificato.».

**Blocco «Tracciato presenze».**

| Campo | Componente | Label | Opzioni | Note |
| --- | --- | --- | --- | --- |
| `formato` | SelectField `pg-formato` | «Formato del file» | formati del software | **nascosto se il canale è API** |
| `chiaveDipendente` | SelectField `pg-chiave` | «Dipendente riconosciuto da» | chiavi del software | hint «Il codice si imposta nella scheda di ogni dipendente (Crea anagrafica).» |

Sottotitolo «Codici voce», con a destra il pulsante ghost «Ripristina i codici {produttore}» (icona `fa-solid fa-rotate-left`).

Solo per TeamSystem, nota con `fa-solid fa-circle-info`: «Le ore ordinarie vanno nel campo «Ore ordinario» di ogni giorno; le altre voci diventano giustificativi (fino a 6 al giorno), con codici di {4 caratteri al massimo | 2 caratteri (tabella TB1103)}.». La seconda variante vale con il formato RP.

**Tabella dei codici voce:**

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Voce del registro» | 26% (22% con RP) | nome della voce, peso 600 |
| «Descrizione» | 50% (38% con RP) | testo grigio |
| «Codice voce {produttore}», per TeamSystem «Codice giustificativo» | 24% | InputField denso, aria-label «Codice voce {voce}». Per TeamSystem la riga «Ordinarie» non ha il campo ma il testo «Ore ordinario (pos. 96)» |
| «Somma all'ordinario» (solo TeamSystem con formato RP) | 16%, al centro | CheckboxField, aria-label «Somma {voce} all'ordinario»; non c'è sulla riga Ordinarie |

Voci (sempre 9, nell'ordine):

| Voce | Descrizione |
| --- | --- |
| Ordinarie | «Ore ordinarie lavorate» |
| Straordinario | «Straordinario oltre l'orario» |
| Festive | «Ore lavorate di domenica e nei festivi» |
| Permessi | «Permessi e ROL a ore» |
| Ferie | «Giornate di ferie» |
| Malattia | «Giornate di malattia (con PUC)» |
| Infortunio | «Giornate di infortunio» |
| Trasferta | «Giornate in trasferta» |
| Assenza | «Assenza non giustificata» |

**Blocco «Codici dei dipendenti».**

- Titolo h3 «Codici dei dipendenti», seguito dalla nota (11px, grigio) `{chiaveDipendente}`; per TeamSystem si aggiunge « · 9 cifre al massimo» (6 con RP).

| Colonna | Larghezza | Contenuto |
| --- | --- | --- |
| «Dipendente» | 40% | «{Cognome} {Nome}», peso 600 |
| «Reparto» | 30% | reparto, in grigio |
| «Codice in {produttore}» | 30% | InputField denso, aria-label «Codice di {Nome} {Cognome}» |

Righe: i 12 dipendenti demo (vedi B.7.6).

**Blocco «Invio del consuntivo».** Titolo h3 con la nota «vale per tutti i software».

| Campo | Componente | Label | Descrizione / opzioni |
| --- | --- | --- | --- |
| `invioAutomatico` | ToggleSwitch | «Invio automatico a fine mese» | «Sibylla trasmette da sola il consuntivo del mese chiuso.» |
| `giornoInvio` (solo con l'invio automatico) | SelectField `pg-giorno` | «Giorno del mese successivo» | «Il 1» … «Il 10» |
| `oraInvio` (solo con l'invio automatico) | InputField `pg-ora` | «Alle» | placeholder «09:00»; testo libero, non validato |
| `soloStraordinarioApprovato` | ToggleSwitch | «Trasmetti solo lo straordinario approvato» | «Lo straordinario non approvato in Cedolini resta fuori dal consuntivo.» |
| `bloccaConAnomalie` | ToggleSwitch | «Blocca l'invio con timbrature anomale» | «Il consuntivo parte solo quando tutte le anomalie del mese sono corrette.» |
| `notificaEsito` | ToggleSwitch | «Avvisa l'ufficio del personale dell'esito» | «Notifica nel Centro notifiche a invio riuscito o fallito.» |

Giorno e ora stanno in una griglia di 3 colonne larghe al massimo 200px.

### B.7.5 Stati e interazioni

**Selezione.**

- All'apertura è selezionato il software `inUso`, oppure il primo del catalogo (Zucchetti).
- Clic su un software: lo seleziona. Il suo profilo è quello della bozza, oppure un **profilo vuoto virtuale** con i default del catalogo:
  - primo canale, primo formato, prima chiave;
  - codici voce di default;
  - nessun valore.
- Il profilo virtuale entra nella bozza alla prima modifica.

**«Usa per il consuntivo».** Crea il profilo, se manca, e imposta `inUso` su questo software. La barra conta +2 per un software mai configurato (il profilo e `inUso`), +1 se il profilo esisteva già.

**Canale.** Clic su una scheda canale: cambia canale e **azzera l'ultimo test**. I campi visibili diventano quelli del nuovo canale; i valori già scritti negli altri campi restano memorizzati.

**Campi.** Ogni modifica scrive `valori[chiave]` e **azzera l'ultimo test**.

**Prova collegamento.**

1. Il pulsante passa a «Verifica in corso…» per **900 ms**.
2. Esito riuscito se **nessun campo obbligatorio del canale** è vuoto, con `trim`.
3. Messaggi:
   - API: «Collegamento riuscito con {produttore}: credenziali valide.»;
   - SFTP: «Cartella raggiungibile su {sftpHost}: file di prova scritto e rimosso.»;
   - email: «Email di prova inviata a {emailConsulente}.»;
   - esito negativo: «Mancano: {label separate da «, »}.».
4. L'esito, con data e ora ISO, viene scritto nel profilo **della bozza**: è una modifica (+1) da salvare.
5. Toast:
   - successo: titolo «Collegamento verificato», con il messaggio;
   - errore: titolo «Collegamento non verificato», con il messaggio.

Oggi è **simulata**: non si contatta nessun servizio.

**Rimuovi configurazione** → ConfirmDialog:

- titolo «Rimuovi configurazione»;
- messaggio «Rimuovere la configurazione di {produttore} {nome}?»; se è il software in uso si aggiunge « È il software in uso: il consuntivo non potrà essere trasmesso finché non ne scegli un altro.»;
- conferma «Rimuovi» (danger).

Elimina il profilo dalla bozza; se era in uso, `inUso` diventa `null`.

**Formato.** Per TeamSystem il formato «RILPRE – procedura RP / Teamtime (record fisso 1707)» attiva la modalità **RP**:

- codici voce di massimo 2 caratteri;
- codici dipendente di massimo 6 cifre;
- colonna «Somma all'ordinario».

Il select del formato è nascosto con il canale API: in quel caso vale il formato già memorizzato.

**Codici voce.**

- Convertiti in maiuscolo e troncati: TeamSystem 4 caratteri (2 con RP), gli altri 10.
- «Ripristina i codici {produttore}» rimette i codici di default del catalogo, senza conferma.

**Somma all'ordinario.** Le caselle aggiungono o tolgono la voce dall'elenco `sommaOrdinario`.

**Codici dei dipendenti.**

- Valore mostrato = codice salvato, oppure `String(1000 + id)`, quindi da «1001» a «1012».
- TeamSystem: solo cifre, al massimo 9 (6 con RP).
- Altri software: testo libero.

**Regole d'invio.** Si modificano in linea; spegnendo l'invio automatico si nascondono giorno e ora.

**Conteggio delle modifiche** (`conta`): +1 per ogni chiave di primo livello diversa (`inUso`, `invioAutomatico`, `giornoInvio`, `oraInvio`, `soloStraordinarioApprovato`, `bloccaConAnomalie`, `notificaEsito`), più +1 per ogni software il cui profilo è diverso.

### B.7.6 Dati e regole di business

**Entità:**

- `IntegrazionePagheHr { inUso: SoftwarePagheId|null, profili: Partial<Record<SoftwarePagheId, ProfiloPaghe>>, invioAutomatico, giornoInvio (1–10), oraInvio 'HH:MM', soloStraordinarioApprovato, bloccaConAnomalie, notificaEsito }`;
- `ProfiloPaghe { canale: 'api'|'sftp'|'email', valori: Record<string,string>, formato, chiaveDipendente, voci: Record<voce, codice>, ultimoTest?: {at ISO, ok, messaggio}, codiciDipendente?: Record<idDipendente:number, string>, sommaOrdinario?: string[] }`.

**Completamento**: `configured` se c'è un software in uso **e** il suo profilo salvato ha `ultimoTest.ok`; `partial` se c'è un software in uso ma non verificato; `empty` se non c'è nessun software in uso.

**Default salvato** (`INTEGRAZIONE_PAGHE_DEFAULT`):

- `inUso: 'zucchetti'`;
- profilo Zucchetti:
  - canale API, formato «Tracciato presenze Zucchetti (TXT a campi fissi)», chiave «Matricola Zucchetti», codici voce di default;
  - valori `codiceDitta 000123`, `codiceAzienda 0001`, `tenant https://hotelnoto.infinity.zucchetti.it`, `clientId sibylla-presenze`, `clientSecret ••••••••`;
  - `ultimoTest { at: '2026-11-02T09:00:00.000Z', ok: true, messaggio: 'Collegamento riuscito, ditta 000123 trovata.' }`. In ora italiana (UTC+1) si mostra «02/11/2026 alle 10:00»: la data si formatta nel fuso del browser;
- regole: invio automatico sì, giorno 2, ore 09:00, solo straordinario approvato sì, blocca con anomalie no, notifica esito sì.

Il valore salvato si legge sempre con `integrazioneValida`: se manca `profili` si usa il default, altrimenti `{...DEFAULT, ...salvato}`.

**Campi comuni riutilizzati nel catalogo:**

SFTP (solo per il canale `sftp`):

| Chiave | Label | Tipo | Placeholder | Obbligatorio |
| --- | --- | --- | --- | --- |
| `sftpHost` | «Host SFTP» | text | «sftp.studio.it» | sì |
| `sftpPorta` | «Porta» | text | «22» | no |
| `sftpUtente` | «Utente SFTP» | text | — | sì |
| `sftpPassword` | «Password o chiave» | password | — | sì |
| `sftpCartella` | «Cartella di destinazione» | text | «/in/presenze» | no |

EMAIL (solo per il canale `email`):

| Chiave | Label | Tipo | Placeholder | Obbligatorio |
| --- | --- | --- | --- | --- |
| `studio` | «Studio del consulente» | text | «Studio Rossi consulenti del lavoro» | no |
| `emailConsulente` | «Email del consulente» | email | «paghe@studio.it» | sì |
| `emailCc` | «In copia» | email | «amministrazione@hotel.it» | no |

**Catalogo dei 6 software** (sigla, produttore, nome, descrizione, canali, formati, campi specifici, codici voce, chiavi del dipendente). Nei campi, «canali» indica quando il campo compare; senza indicazione compare per tutti i canali.

**1. Zucchetti** — sigla «ZU», nome «Paghe Project / Infinity HR».

- Descrizione: «Rilevazione presenze verso Paghe Project o Infinity HR: tracciato a campi fissi o servizio web di Infinity.»
- Canali: api, sftp, email.
- Formati: «Tracciato presenze Zucchetti (TXT a campi fissi)», «Infinity HR – import giustificativi (CSV)».
- Campi specifici:

| Chiave | Label | Tipo | Placeholder | Hint | Canali | Obbligatorio |
| --- | --- | --- | --- | --- | --- | --- |
| `codiceDitta` | «Codice ditta» | text | «000123» | «Codice della ditta in Paghe Project.» | tutti | sì |
| `codiceAzienda` | «Codice azienda» | text | «0001» | — | tutti | no |
| `tenant` | «URL del tenant Infinity» | url | «https://hotelnoto.infinity.zucchetti.it» | — | api | sì |
| `clientId` | «Client ID» | text | — | — | api | sì |
| `clientSecret` | «Client secret» | password | — | — | api | sì |

  Poi i campi SFTP ed EMAIL.
- Codici voce: Ordinarie 0001, Straordinario 0101, Festive 0110, Permessi 0310, Ferie 0300, Malattia 0400, Infortunio 0410, Trasferta 0500, Assenza 0900.
- Chiavi del dipendente: «Matricola Zucchetti», «Codice fiscale».

**2. TeamSystem** — sigla «TS», nome «Paghe / HR Lynfa Studio».

- Descrizione: «Presenze del mese nel tracciato RILPRE (record fisso da 1707 caratteri per dipendente), importato dalla procedura paghe TeamSystem.»
- Canali: api, sftp, email.
- Formati: «RILPRE – tracciato standard (record fisso 1707)», «RILPRE – procedura RP / Teamtime (record fisso 1707)».
- Campi specifici:

| Chiave | Label | Tipo | Placeholder | Hint | Canali | Obbligatorio |
| --- | --- | --- | --- | --- | --- | --- |
| `codiceAzienda` | «Codice azienda» | text | «0042» | «Fino a 4 cifre: posizioni 1–4 del RILPRE.» | tutti | sì |
| `codiceFiliale` | «Codice filiale» | text | «01» | «Fino a 3 cifre: con 3 cifre va negli ultimi caratteri del nome (pos. 81).» | tutti | no |
| `codiceStudio` | «Codice studio» | text | «ST0042» | «Lo studio che elabora le paghe.» | tutti | no |
| `ambiente` | «Ambiente» | select | — | opzioni «Produzione», «Test»; vuoto = la prima | api | no |
| `apiKey` | «API key Digital Hub» | password | — | — | api | sì |

  Poi i campi SFTP ed EMAIL.
- Codici voce: Ordinarie (vuoto, va nelle «Ore ordinario»), Straordinario ST, Festive LF, Permessi PR, Ferie FE, Malattia MA, Infortunio IN, Trasferta TR, Assenza AI.
- Chiave del dipendente: «Codice dipendente TeamSystem».

**3. Inaz** — sigla «IN», nome «Paghe Inaz / HRM».

- Descrizione: «Giustificativi e ore verso le paghe Inaz tramite web service o tracciato XML.»
- Canali: api, sftp.
- Formati: «Inaz presenze (XML)», «Inaz giustificativi (CSV)».
- Campi specifici:

| Chiave | Label | Tipo | Placeholder | Canali | Obbligatorio |
| --- | --- | --- | --- | --- | --- |
| `codiceAzienda` | «Codice azienda» | text | «A001» | tutti | sì |
| `codiceFiliale` | «Codice filiale» | text | «01» | tutti | no |
| `wsUrl` | «URL del web service» | url | «https://ws.inaz.it/presenze» | api | sì |
| `wsUtente` | «Utente web service» | text | — | api | sì |
| `wsPassword` | «Password web service» | password | — | api | sì |

  Poi i campi SFTP.
- Codici voce: HO, S1, FE, PR, FR, MA, IN, TR, AI (nell'ordine delle voci).
- Chiavi del dipendente: «Matricola Inaz», «Codice fiscale».

**4. Sistemi** — sigla «SI», nome «Job Paghe».

- Descrizione: «Tracciato presenze per Job Paghe depositato su SFTP o inviato allo studio.»
- Canali: sftp, email.
- Formati: «Tracciato presenze Job (TXT)», «Import presenze Job (CSV)».
- Campi specifici:

| Chiave | Label | Placeholder | Obbligatorio |
| --- | --- | --- | --- |
| `codiceAzienda` | «Codice azienda Job» | «00042» | sì |
| `codiceStudio` | «Codice studio» | «S12» | no |

  Poi i campi SFTP ed EMAIL.
- Codici voce: 01, 20, 30, 41, 40, 50, 55, 60, 90.
- Chiavi del dipendente: «Matricola Job», «Codice fiscale».

**5. Ranocchi** — sigla «RA», nome «Paghe Web».

- Descrizione: «Presenze verso Paghe Web via API o file per lo studio.»
- Canali: api, email.
- Formato: «Paghe Web – import presenze (CSV)».
- Campi specifici:

| Chiave | Label | Tipo | Canali | Obbligatorio |
| --- | --- | --- | --- | --- |
| `codiceStudio` | «Codice studio» | text | tutti | sì |
| `codiceDitta` | «Codice ditta» | text | tutti | sì |
| `apiToken` | «Token API» | password | api | sì |

  Poi i campi EMAIL.
- Codici voce: OR, ST, FS, PE, FE, MA, IF, TR, AN.
- Chiavi del dipendente: «Codice dipendente Paghe Web», «Codice fiscale».

**6. ADP** — sigla «AD», nome «Workforce Now / GlobalView».

- Descrizione: «Time & Attendance verso ADP con API OAuth e certificato client, oppure file su SFTP.»
- Canali: api, sftp.
- Formati: «ADP Time & Attendance (CSV)», «ADP pay data input (XML)».
- Campi specifici:

| Chiave | Label | Tipo | Placeholder | Hint | Canali | Obbligatorio |
| --- | --- | --- | --- | --- | --- | --- |
| `companyCode` | «Company code» | text | «HN01» | — | tutti | sì |
| `clientId` | «Client ID OAuth» | text | — | — | api | sì |
| `clientSecret` | «Client secret» | password | — | — | api | sì |
| `certificato` | «Certificato client (alias)» | text | «adp-hotelnoto-2026» | «Il certificato si carica dal portale ADP e resta sul server di Sibylla.» | api | no |

  Poi i campi SFTP.
- Codici voce: REG, OT1, HOL, PTO, VAC, SCK, INJ, TRV, UNA.
- Chiavi del dipendente: «Associate ID ADP», «Codice fiscale».

**Dipendenti demo** (12 righe, codice proposto `1000+id`):

| id | Dipendente | Reparto | Codice proposto |
| --- | --- | --- | --- |
| 1 | Grimaudo Andrea | Front office | 1001 |
| 2 | Conti Giulia | Front office | 1002 |
| 3 | Esposito Marco | Cucina | 1003 |
| 4 | Romano Sara | Housekeeping | 1004 |
| 5 | Marini Davide | Front office | 1005 |
| 6 | Benvenuti Sergio | Manutenzione | 1006 |
| 7 | Fantoni Manuel | Manutenzione | 1007 |
| 8 | Pettinari Oscar | Housekeeping | 1008 |
| 9 | Hambelli Luca | Amministrazione | 1009 |
| 10 | Bianchi Elena | F&B | 1010 |
| 11 | Ferri Chiara | F&B | 1011 |
| 12 | Greco Paolo | Cucina | 1012 |

**Persistenza.** `sibylla.hr-config` → `integrazionePaghe`. Oggi i **segreti** (password, secret, token, API key) restano in `localStorage` in chiaro: è accettabile solo per la demo.

**Uso a valle.** Registro presenze › Trasmetti consuntivo legge `inUso` e il profilo, genera il tracciato (per TeamSystem il file RILPRE, vedi `../integrazione paghe/README.md`) e chiama il connettore con i **soli parametri non segreti**. Il filtro dei segreti è la regex `/password|secret|token|apikey|chiave/i` applicata alle chiavi.

### B.7.7 Backend da realizzare

**`GET /Sibylla/hr/config/integrazione-paghe`**: risponde con `IntegrazionePagheHr`, con i **segreti mascherati** (`"••••••••"`).

**`PUT /Sibylla/hr/config/integrazione-paghe`**: riceve l'oggetto completo.

- Un segreto uguale alla maschera significa «invariato».
- Il server cifra i segreti a riposo e non li restituisce mai in chiaro.
- Validazione:
  - `inUso` nell'enumerazione o `null`;
  - `canale` dentro i canali del software;
  - `formato` e `chiaveDipendente` dentro gli elenchi del software;
  - `giornoInvio` tra 1 e 10;
  - `oraInvio` nel formato HH:MM;
  - per TeamSystem i codici voce lunghi al massimo 4 caratteri (2 con RP) e i codici dipendente fatti di sole cifre, al massimo 9 (6 con RP).

**`POST /Sibylla/hr/paghe/prova-collegamento`**: esegue la prova vera sul canale (autenticazione API, scrittura e rimozione di un file su SFTP, email di prova) e la registra nel profilo.

```json
{ "software": "zucchetti", "canale": "api",
  "valori": { "codiceDitta": "000123", "tenant": "https://…", "clientId": "sibylla-presenze", "clientSecret": "••••••••" } }
→ 200 { "ok": true, "messaggio": "Collegamento riuscito con Zucchetti: credenziali valide.", "at": "2026-11-05T09:12:00Z" }
→ 200 { "ok": false, "messaggio": "Mancano: Client ID.", "at": "…" }
```

Messaggi identici a quelli del frontend (B.7.5). Un segreto mascherato significa «usa quello memorizzato».

**`POST /Sibylla/hr/paghe/trasmetti`** (già definito e chiamato dal Registro presenze):

```json
{ "software": "teamsystem", "canale": "sftp", "mese": "2026-10", "formato": "RILPRE – tracciato standard (record fisso 1707)",
  "parametri": { "codiceAzienda": "0042", "sftpHost": "sftp.studio.it", "sftpCartella": "/in/presenze" },
  "file": { "nome": "RILPRE", "base64": "…", "record": 12, "lunghezzaRecord": 1707 },
  "riepilogo": { "dipendenti": 12, "oreOrdinarie": 1840, "oreStraordinario": 22, "giorniFerie": 9, "orePermessi": 14, "giorniMalattia": 3, "anomalie": 0 },
  "note": "" }
→ 200 { "esito": "inviato", "protocollo": "…", "messaggio": "…" }
```

Con 404, 501, 503 o il backend assente, il frontend considera l'invio **simulato**.

**Effetti lato server da realizzare:**

- con `invioAutomatico`, un job il giorno `giornoInvio` del mese successivo alle `oraInvio`;
- `soloStraordinarioApprovato` filtra lo straordinario non approvato in Cedolini;
- `bloccaConAnomalie` blocca l'invio se ci sono timbrature anomale nel mese;
- con `notificaEsito`, una notifica nel **Centro notifiche** dell'ufficio del personale a invio riuscito o fallito.

Le operazioni sui segreti vanno tracciate (audit).

### B.7.8 Stile

**Elenco dei software:**

| Selettore | Valori |
| --- | --- |
| `.cfg-hrpag` | `flex column; gap:12px; 13px; container-type:inline-size` |
| `__layout` | `grid 260px minmax(0,1fr); gap:18px; align-items:start` |
| `__list`, `__item` | come gli altri elenchi: card 10px 12px, radius 6px, hover `--color-primary-300`, attivo bordo `--color-primary` + anello di 1px |
| `__sigla` | `flex:none; 34×34px; inline-flex center; border-radius:8px; background:--color-primary-50; color:--color-primary; Poppins 12px; peso 700; letter-spacing:.04em` |
| `__sigla--lg` | `44×44px; 14px` |
| `__item-text`, `__head-text` | `min-width:0; flex:1; flex column; gap:2px` |
| `__item-name` | peso 700, `--color-text-active` |
| `__item-meta` | 11.5px, inattivo, ellipsis, `nowrap` |
| `__st` | 13px; `--uso` primary, `--ok` success, `--parz` warning, `--off` `--color-border` |

**Dettaglio e blocchi:**

| Selettore | Valori |
| --- | --- |
| `__detail` | `min-width:0; flex column; border:1px solid --color-border; border-radius:6px; background:--color-surface` |
| `__head` | `flex; center; gap:14px; padding:14px 18px; border-bottom:1px solid --color-border` |
| `__head-name` | Poppins 15px, peso 700 |
| `__head-desc` | 12px, inattivo |
| `__head-actions` | `flex:none; flex; gap:8px` |
| `__inuso` | `inline-flex; gap:6px; 12.5px; peso 600; --color-primary` |
| `__ico.sib-btn--icon i` | `--color-primary; 16px` |
| `__block` | `flex column; gap:12px; padding:16px 18px`; `& + &` con `border-top:1px solid --color-border` |
| `__title` | `margin:0`, Poppins 13px, peso 700, `--color-primary` |
| `__title-note` | `margin-left:8px`, Open Sans 11px, peso 400, inattivo |
| `__sub` | 12px, peso 600, primary |

**Canali e campi:**

| Selettore | Valori |
| --- | --- |
| `__canali` | `grid repeat(3, minmax(0,1fr)); gap:10px` |
| `__canale` | `flex; flex-start; gap:10px; padding:10px 12px; border:1px solid --color-border; border-radius:6px; background:--color-surface; text-align:left; cursor:pointer`; icona `margin-top:2px`, inattivo, 14px; hover bordo `--color-primary-300`; `.is-active` bordo primary + `box-shadow:0 0 0 1px primary`, icona primary |
| `__canale-text` | `min-width:0; flex column; gap:2px` |
| `__canale-label` | peso 700 |
| `__canale-desc` | 11.5px, inattivo |
| `__grid` | `grid repeat(3, minmax(0,1fr)); gap:12px 14px` |
| `__grid--sm` | `repeat(3, minmax(0,200px))` |

**Prova, voci e regole:**

| Selettore | Valori |
| --- | --- |
| `__test` | `flex; center; gap:14px`; icona del pulsante `margin-right:7px` |
| `__esito` | `inline-flex; gap:7px; min-width:0; 12px; inattivo`; `--ok` success; `--ko` `--color-error` |
| `__esito-at` | inattivo |
| `__voci-head` | `flex; center; space-between`; icona del pulsante `margin-right:6px` |
| `__voce` | peso 600, `--color-text-active` |
| `__muted` | inattivo |
| `__center.cfg-hrpag__center` | centrato |
| `__nota` | `flex; flex-start; gap:8px; margin:0; 12px; inattivo`; icona `margin-top:2px`, primary |
| `__regole` | `flex column; gap:12px` |

### B.7.9 Responsività

- `@container (max-width: 980px)`, sul pannello:
  - layout `220px minmax(0,1fr)`, quindi l'elenco resta a sinistra ma più stretto;
  - canali e griglia dei campi passano a **2 colonne**.
- Non c'è una soglia per una sola colonna: sotto la larghezza di un laptop con sidebar il dettaglio resta comunque leggibile, perché le colonne sono `minmax(0,1fr)`.
- Le tabelle (codici voce, codici dipendente) sono in % fisse, con la compattazione comune: nessuno scroll orizzontale.

### B.7.10 Effetti e animazioni

- Spinner `fa-spin` sull'icona durante la prova (900 ms).
- Le schede canale non hanno una transizione dichiarata: il cambio è istantaneo.
- Toast all'esito della prova.

### B.7.11 Accessibilità

- L'elenco è un `aside` con l'aria-label «Software paghe».
- Le icone di stato hanno l'aria-label e il Tooltip.
- I canali sono un `radiogroup` con `radio` e `aria-checked`.
- I campi delle tabelle hanno l'aria-label.
- La sigla è decorativa (`aria-hidden`).
- Il pulsante di prova è disabilitato durante la verifica.

### B.7.12 Criteri di accettazione

1. L'elenco mostra 6 software con le sigle ZU, TS, IN, SI, RA, AD; Zucchetti ha l'icona blu «In uso», gli altri il cerchio grigio «Non configurato».
2. All'apertura è selezionato Zucchetti, con «In uso per il consuntivo», il cestino, il canale API attivo e i campi Codice ditta, Codice azienda, URL del tenant Infinity, Client ID e Client secret valorizzati.
3. L'esito mostra «Collegamento riuscito, ditta 000123 trovata. 02/11/2026 alle 10:00», in ora italiana.
4. Modificando il Client ID l'esito torna «Collegamento non ancora verificato.» e la barra conta 1 modifica.
5. Svuotando il Client ID, «Prova collegamento» mostra per circa 0,9 s «Verifica in corso…», poi il toast d'errore «Collegamento non verificato» con «Mancano: Client ID.».
6. Con il canale API il select «Formato del file» non c'è; con SFTP compare, insieme ai campi Host SFTP, Porta, Utente SFTP, Password o chiave e Cartella di destinazione.
7. Selezionando TeamSystem lo stato è «Non configurato», il pulsante dice «Usa per il consuntivo», la riga Ordinarie dice «Ore ordinario (pos. 96)» e la colonna si intitola «Codice giustificativo».
8. Con TeamSystem su SFTP e formato «RILPRE – procedura RP / Teamtime (record fisso 1707)» compare la colonna «Somma all'ordinario», i codici voce accettano 2 caratteri e i codici dipendente 6 cifre.
9. «Usa per il consuntivo» su TeamSystem conta 2 modifiche; dopo il salvataggio TeamSystem è «In uso» e la scheda mostra «Da completare» finché il collegamento non è verificato e salvato.
10. «Rimuovi configurazione» sul software in uso mostra il messaggio con « È il software in uso: …».
11. La tabella dei dipendenti ha 12 righe con i codici da 1001 a 1012.
12. Spegnendo «Invio automatico a fine mese» spariscono «Giorno del mese successivo» e «Alle»; il giorno offre «Il 1» … «Il 10».
13. Sotto i 980px di pannello l'elenco è largo 220px e canali e campi stanno su 2 colonne.
14. Il toast di salvataggio è «Integrazione paghe salvata».

### B.7.13 File sorgente

- `src/modules/impostazioni/Configuratore/panes/HrIntegrazionePaghe/HrIntegrazionePaghe.tsx`, `HrIntegrazionePaghe.sass`
- `src/store/pagheCatalogo.ts`
- `src/store/useHrConfigStore.ts` (`IntegrazionePagheHr`, `ProfiloPaghe`, `INTEGRAZIONE_PAGHE_DEFAULT`, `profiloPagheVuoto`, `integrazioneValida`, `codiceDipendentePaghe`)
- `src/store/useHrGestioneStore.ts` (`DIPENDENTI_HR`)
- `src/services/pagheConnettore.ts` (contratto `POST /Sibylla/hr/paghe/trasmetti`, filtro dei segreti)
- `docs/integrazione paghe/README.md`

---

## Appendice · Comportamenti attuali da conoscere

Comportamenti attuali discutibili: per avere l'identità con la demo vanno riprodotti; se si correggono, va segnalato.

1. **Integrazione paghe, prova del collegamento**: il risultato va salvato con «Salva», altrimenti non conta per il completamento.
2. **Eliminazioni senza controllo d'uso**: reparti, orari, turni, CCNL, livelli, tipologie e categorie si eliminano anche se usati altrove.
3. **Chiusura o ricaricamento del browser** con modifiche pendenti: nessuna conferma, la bozza va persa (la conferma copre solo la navigazione interna, A.5).
