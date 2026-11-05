# 05 · Archivio del personale (`archivio-personale`, `archivio-personale:esterni`)

> Scheda di riproduzione. Componenti condivisi (PageHead, Tabs, Tooltip, TruncatedText, Modal, ConfirmDialog, Toast, SearchField, SelectField, `.sib-table`/`.sib-table-wrap`, `.sib-empty`, `.sib-btn*`) in `00-fondamenta.md`; entità (Anagrafica, Contratto, Collaboratore esterno, Abilitazione App Op!, Configurazione HR) in `01-modello-dati-e-api.md`. Le schede collegate sono `03-crea-anagrafica.md` e `04-crea-collaboratore-esterno.md`.

---

## 1. Scopo e utenti

Elenco di tutto il personale della struttura per l'**ufficio del personale**, su due schede:
- **Dipendenti**: tabella delle anagrafiche con reparto (dal contratto vigente), segnalazione del fascicolo incompleto, dettaglio, modifica, storico contratti con PDF, invito all'App Op!;
- **Collaboratori esterni**: addetti delle ditte in appalto con azienda, categoria, reparti App Op!, periodo e stato dell'autorizzazione, documenti mancanti, invito App Op!, stampa del badge ed eliminazione.

È anche il punto di partenza per creare nuovi profili.

## 2. Accesso

| Id pagina | Componente | Scheda iniziale |
|---|---|---|
| `archivio-personale` | `<ArchivioPersonale navigate vista="dipendenti" key={page}/>` | Dipendenti |
| `archivio-personale:esterni` | `<ArchivioPersonale navigate vista="esterni" key={page}/>` | Collaboratori esterni |

- **Menu**: Human Resources › Gestione delle anagrafiche › «Archivio del personale» (icona `fa-folder-open`); stessa voce nei menu Tour Operator e Ristoranti; nel Timone home «Archivio del personale» (icona `id-card`).
- Sottotitolo nel registro `pageSubtitles`: «Visualizza e gestisci tutte le anagrafiche dei dipendenti, con dettagli aggiornati e storico operativo» (la pagina usa il proprio, §4.1).
- **Breadcrumb**: standard (Human Resources › Gestione delle anagrafiche › Archivio del personale).
- Cambiare scheda **non** cambia l'id pagina (stato locale); il deep link `:esterni` serve solo ad aprire direttamente la seconda scheda.

**Da dove si arriva**: sidenav; Timone; HR Overview (pulsante icona con tooltip «Archivio personale»); ritorno da Crea/Modifica anagrafica (→ `archivio-personale`) e dalla scheda collaboratore esterno (→ `archivio-personale:esterni`).

**Verso dove si naviga**
- `crea-anagrafica` («Crea anagrafica profilo»);
- `modifica-anagrafica` (matita o triangolo del fascicolo, dopo aver impostato il dipendente in memoria — vedi `03-crea-anagrafica.md` §6.2);
- `crea-collaboratore-esterno` («Nuovo collaboratore esterno»);
- `modifica-collaboratore-esterno:<id>` (matita o triangolo di un esterno).

## 3. Layout

Root `.arch-pers`: `container-type: inline-size` (container query sulla larghezza della pagina).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [← Indietro]            Archivio del personale                             │ PageHead
│        Gestione dei dati anagrafici e contrattuali di tutto il personale…  │
├────────────────────────────────────────────────────────────────────────────┤
│ Dipendenti (11) │ Collaboratori esterni (3)          [🪪 Crea anagrafica…] │ .arch-pers__bar
│━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│ (bordo inferiore)
│ SCHEDA DIPENDENTI                                                          │
│ ┌──────┬──────┬───────┬───────┬──────┬──────┬──────┬──────┬────┬─────┬────┬─────────────┐
│ │Matr. │Nome ▼│Cognome│Reparto│Tel. ▼│Nato  │C.F. ▼│Indir.│Cap▼│Prov.│Naz.│ Azioni      │
│ ├──────┼──────┼───────┼───────┼──────┼──────┼──────┼──────┼────┼─────┼────┼─────────────┤
│ │⚠ 82  │mario │idraul…│ -     │+39 … │01/01…│token │via n…│000…│BA   │ITA │👁 ✎ 📄 📱 🗑 │
│ └──────┴──────┴───────┴───────┴──────┴──────┴──────┴──────┴────┴─────┴────┴─────────────┘
│                                                                            │
│ SCHEDA COLLABORATORI ESTERNI                                               │
│ [🔍 Cerca per nome o email        ] [Azienda ▾ Tutte…] [Autorizzazione ▾]  │ .arch-est__filters
│ ┌────────────────┬──────────┬─────────┬────────┬─────────────┬───────┬─────┐
│ │Nominativo      │Azienda   │Categoria│Reparti…│Autorizzazione│Stato  │Azioni│
│ ├────────────────┼──────────┼─────────┼────────┼─────────────┼───────┼─────┤
│ │⚠ Benali Karim [Esterno]│Movi…│Facchino│Non abil.│01/05/26 – 31/10/26│[Scaduto]│✎ 🪪 🗑│
│ └────────────────┴──────────┴─────────┴────────┴─────────────┴───────┴─────┘
└────────────────────────────────────────────────────────────────────────────┘
```

**Blocchi e misure**
- **PageHead**: standard, **senza** `onBack` → «Indietro» torna alla pagina precedente dello stack di navigazione.
- **Barra schede** `.arch-pers__bar`: flex, `align-items: flex-end`, `justify-content: space-between`, `gap: 12px`, `margin-bottom: 16px`, bordo inferiore `1px solid --color-border`. Le Tabs usano questo bordo (`.arch-pers__bar .arch-pers__tabs`: `margin-bottom: -1px`, `border-bottom: 0`). Il pulsante a destra ha `margin-bottom: 8px`.
- **Tabella dipendenti**: `.sib-table-wrap` > `table.sib-table.arch-pers__table` con `table-layout: fixed`, `width: 100%`, `colgroup` in percentuale (§8), celle `white-space: nowrap; overflow: hidden`.
- **Vista esterni** `.arch-est`: colonna, `gap: 14px`, a sua volta `container-type: inline-size`; filtri sopra, tabella sotto.
- Modali: «Dettaglio dipendente» (xl, max 780px), «Contratto — {nome}» (xl), «Invito per {nome}» (sm, 360px).

## 4. Elementi e testi

### 4.1 PageHead
- Titolo «Archivio del personale».
- Sottotitolo «Gestione dei dati anagrafici e contrattuali di tutto il personale, con accesso rapido agli archivi contrattuali e possibilità di creare nuovi profili».

### 4.2 Barra schede
- Tabs: «Dipendenti ({n})» (n = righe caricate, **non** filtrate) e «Collaboratori esterni ({n})» (n = collaboratori nello store). Stile Tabs condiviso: 13px, 600, Open Sans, `padding: 10px 16px`, bordo inferiore 2px; attiva `--color-primary` con bordo primary; inattiva `--color-text-inactive`, hover testo attivo e bordo `--color-primary-300`; transizione colori 150 ms.
- Pulsante a destra `.sib-btn--primary`:
  - scheda Dipendenti: `fa-light fa-id-card` + «Crea anagrafica profilo» → `crea-anagrafica`;
  - scheda Esterni: `fa-light fa-user-helmet-safety` + «Nuovo collaboratore esterno» → `crea-collaboratore-esterno`.

### 4.3 Tabella Dipendenti — colonne
| key | Intestazione visibile | Testo completo (tooltip) | Larghezza | Filtro |
|---|---|---|---|---|
| `matricola` | «Matr.» | «Matricola N°» | 7% | no |
| `nome` | «Nome» | — | 9% | sì |
| `cognome` | «Cognome» | — | 8% | sì |
| `reparto` | «Reparto» | — | 10% | sì |
| `telefono` | «Tel.» | «Contatto telefonico» | 9% | sì |
| `nato_il` | «Nato il» | — | 7% | no |
| `codice_fiscale` | «C.F.» | «Codice Fiscale» | 10% | sì |
| `indirizzo` | «Indirizzo» | — | 9% | no |
| `cap` | «Cap» | — | 5% | sì |
| `provincia` | «Prov.» | «Provincia» | 6% | sì |
| `nazione` | «Naz.» | «Nazione» | 5% | sì |
| azioni | «Azioni» | — | 15% | — |

- Le intestazioni abbreviate sono un `TruncatedText` con `full` = nome intero: tooltip con il testo completo all'hover; quelle intere mostrano il tooltip solo se troncate.
- Colonne filtrabili: accanto all'etichetta un pulsante `fa-solid fa-filter` (`title="Filtra"`, colore ereditato; l'icona è identica con o senza filtro attivo).
- **Popover filtro** (sotto l'intestazione, `absolute top-full left-0 mt-1`, `z-index: 10`, larghezza 192px, sfondo bianco, bordo 1px `--color-border`, radius 4px, ombra Tailwind `shadow-md`, padding 8px):
  - input `.sib-input` con autofocus, placeholder «Filtra {label in minuscolo}» (es. «Filtra contatto telefonico», «Filtra codice fiscale»);
  - riga `justify-between` `mt-2`: `.sib-btn--ghost` «Reset» e `.sib-btn--primary` «OK» (testo `text-xs`).

**Celle**: ogni valore in `TruncatedText` (ellissi + tooltip se troncato); valore vuoto/nullo → «-» (span `text-text-muted`).
- **Matricola**: `.arch-pers__matr` (inline-flex, gap 6px). Se il fascicolo è incompleto, prima del numero un pulsante trasparente con `fa-solid fa-triangle-exclamation` (arancio `--color-warning`, `animate-pulse`), `aria-label="Documentazione incompleta — inserisci documenti mancanti"`, avvolto da un Tooltip `variant="light"` `position="right"` con:
  - «Documentazione incompleta» (grassetto);
  - «{mancanti}/5 documenti mancanti — clicca per inserirli:» (11px, muted);
  - elenco puntato (12px) dei mancanti tra «Documento d'identità», «Codice fiscale / Tessera sanitaria», «Informativa privacy», «Formazione sicurezza», «Contratto di lavoro».
  - Clic → modifica del dipendente.
- **Reparto**: nome reparto del contratto vigente, «-» se nessuno.

**Azioni** `.arch-pers__acts` (flex a destra, gap 2px), pulsanti `.sib-btn.sib-btn--icon` con icone `fa-solid`:
1. `fa-eye` `title="Dettaglio dipendente"` → modale Dettaglio.
2. `fa-pen` `title="Modifica"` → modifica.
3. `fa-file-pdf` `title="Contratto (PDF)"` → modale Contratto; se il dipendente ha variazioni, contatore in alto a destra (`absolute -top-1 -right-1`, min 15×15px, `padding: 0 4px`, tondo, sfondo `--color-primary`, testo bianco 9px 700, `line-height: 15px`, centrato).
4. Solo se il modulo `app-op` è attivo **e** il dipendente è abilitato: `fa-mobile-screen` (durante l'invio `fa-spinner fa-spin`, pulsante disabilitato), `aria-label="Invita {nome} {cognome} all'App Op!"`, Tooltip (dark): con invito precedente «Invita Op! — ultimo invito a {email mascherata}, valido fino al {gg/mm/aaaa}», altrimenti «Invita Op! — invia il token di invito a {email aziendale}» o «… a email aziendale mancante».
5. `fa-trash-can` `title="Elimina"`: **oggi senza azione** (nessun handler).

**Stato vuoto** (nessuna riga dopo i filtri): riga unica su tutte le colonne, classe `.sib-empty`, testo «Nessun collaboratore trovato.»

### 4.4 Modale «Dettaglio dipendente» (size `xl`)
- In alto, flex `gap: 20px`:
  - avatar `<img>` 112×144 (`w-28 h-36`), radius 8px, `object-cover`, bordo 1px `--color-border`, sfondo `--color-bg`; sorgente `avatarUrl("{nome} {cognome}")` (o l'id se il nome è vuoto), `alt` = nome completo;
  - `<dl>` a 2 colonne (gap orizzontale 20px, verticale 12px, 13px): per ogni voce `dt` 11px muted, `dd` 600 con `break-words`, «-» se vuoto. Voci in ordine: «Matricola N°», «Nome», «Cognome», «Contatto telefonico», «E-mail», «Contatto di emergenza», «Nato il», «Codice fiscale», «Indirizzo», «CAP», «Provincia», «Nazione».
- **Inquadramento contrattuale** (solo se c'è un contratto): blocco con `margin-top: 20px`, `padding-top: 16px`, bordo superiore 1px; titolo `<h4>` 13px 600 «Inquadramento contrattuale»; `<dl>` a 3 colonne (gap 20px / 12px, 13px), valori in `TruncatedText`:
  | dt | dd |
  |---|---|
  | «Reparto» | reparto o «—» |
  | «Ruolo» | ruolo o «—» |
  | «CCNL» | nome CCNL o «—» |
  | «Livello» | codice o «—» |
  | «Tipologia» | tipologia + « · fino al {gg/mm/aaaa}» se c'è scadenza |
  | «Orario» | «{nome orario} ({ore} h)» o «—» |
  | «Turnazione» | nome schema o «—» |
  | «Part time» | «{perc}%» se < 100, altrimenti «Full time» |
  | «Ferie annue» | «{n} giorni» o «—» |
  | «Permessi annui» | «{rol} h ROL + {ex} h ex fest.» o «—» |
  | «Periodo di prova» | «{n} giorni» o «—» |
  | «RAL» | «€ {ral}» o «—» |
- **Documenti allegati** (blocco con stesso margine/bordo): titolo `<h4>` «Documenti allegati» e a destra:
  - incompleto: pillola `fa-solid fa-triangle-exclamation` «Documentazione incompleta — {n}/5 mancanti» (12px 600, testo `--color-warning`, sfondo `--color-warning-light` `#FFF3E0`, tonda, `padding: 4px 12px`, `animate-pulse`);
  - completo: `fa-solid fa-circle-check` «Documentazione completa» (12px 600 verde).
  - Lista (righe con bordo inferiore, l'ultima senza; `padding: 8px 0`): a sinistra `fa-light fa-file-lines` (muted) + etichetta + asterisco rosso `*` se obbligatorio; a destra, se c'è il file: nome (12px muted, max 200px, `title`) + tre pulsanti icona `fa-light fa-eye` «Visualizza documento», `fa-light fa-download` «Scarica documento», `fa-light fa-print` «Stampa documento» (disabilitati se non c'è un URL del PDF); se manca: `fa-solid fa-triangle-exclamation` (pulsante) «Mancante» (12px 600 arancio).
  - Righe in ordine: i 4 documenti obbligatori, «Contratto di lavoro» (dal PDF del contratto vigente, obbligatorio), poi «Altro documento 1», «Altro documento 2»… (non obbligatori).

### 4.5 Modale «Contratto — {Nome Cognome}» (size `xl`)
- Senza contratti: «Nessun contratto registrato per questo profilo. Aggiungilo dalla scheda anagrafica → sezione “Contratto”.» (13px muted).
- Con contratti: lista (gap 8px) di card (bordo 1px, radius 8px, padding 12px, flex `space-between`, wrap):
  - sinistra: pillola «Vigente» sulla prima (sfondo **`--color-success-mid` `#00CF86`**, testo bianco 11px 700, `padding: 2px 8px`), tipologia (13px 600), meta 12px muted con lo stesso formato dello storico della scheda («{ruolo} · {livello} livello · {ccnl} · {reparto} · RAL € {ral} · dal {data}[ al {data}]»);
  - destra: `fa-light fa-file-pdf` (primary) + nome PDF (max 200px, `title`) se presente; pulsante icona `fa-light fa-eye` «Apri PDF» se c'è il data URL, altrimenti testo corsivo 11px «PDF non disponibile».

### 4.6 Vista «Collaboratori esterni» (`EsterniTable`)
**Filtri** `.arch-est__filters` (flex, `align-items: flex-end`, gap 14px, wrap; il primo `flex: 1 1 260px`, gli altri `flex: 0 1 220px`):
- SearchField `name="est-q"` placeholder «Cerca per nome o email» (senza label);
- SelectField «Azienda»: «Tutte le aziende» + ditte in appalto;
- SelectField «Autorizzazione»: «Tutte», «Autorizzato», «In scadenza», «Scaduto», «Non ancora attivo».

**Colonne** (`table-layout: fixed`):
| Intestazione | Larghezza | Contenuto |
|---|---|---|
| «Nominativo» | 21% | triangolo documenti (se mancano) + «{Cognome} {Nome}» (TruncatedText) + tag «Esterno» |
| «Azienda» | 16% | nome della ditta o «—» |
| «Categoria» | 13% | nome categoria o «—» |
| «Reparti App Op!» (in TruncatedText) | 11% | se abilitato: nomi dei reparti separati da «, » (o «—» se nessuno); altrimenti «Non abilitato» |
| «Autorizzazione» | 15% | «gg/mm/aa – gg/mm/aa» (anno a 2 cifre); tooltip sempre presente «Dal gg/mm/aaaa al gg/mm/aaaa» |
| «Stato» | 11% | badge colorato con «Autorizzato» / «In scadenza» / «Scaduto» / «Non ancora attivo» (testo in TruncatedText) |
| «Azioni» (allineata a destra) | 13% | pulsanti icona |

- **Triangolo**: pulsante `.arch-est__warn` (trasparente, arancio) `fa-solid fa-triangle-exclamation`, `aria-label="Documentazione incompleta"`, Tooltip light a destra con «**Documentazione incompleta**» + elenco dei documenti mancanti o scaduti; clic → `modifica-collaboratore-esterno:{id}`. Non lampeggia.
- **Azioni** (`.arch-est__acts`, flex a destra, gap 2px; ogni pulsante con Tooltip dark):
  1. `fa-solid fa-pen` tooltip «Modifica», `aria-label="Modifica {nome} {cognome}"` → scheda.
  2. Solo con modulo `app-op` attivo e collaboratore abilitato: `fa-solid fa-mobile-screen` (`fa-spinner fa-spin` durante l'invio), `aria-label="Invita {nome} {cognome} all'App Op!"`; disabilitato se l'autorizzazione non è `attiva`/`in-scadenza` o durante l'invio; tooltip: non autorizzato «Invita Op! non disponibile: autorizzazione scaduta» oppure «… autorizzazione non ancora attiva»; con invito precedente «Invita Op! — ultimo invito a {email mascherata}, valido fino al {gg/mm/aaaa}»; altrimenti «Invita Op! — invia il token di invito a {email}» o «… a email mancante».
  3. `fa-solid fa-id-badge` tooltip «Stampa badge», `aria-label="Stampa badge di {nome} {cognome}"`.
  4. `fa-solid fa-trash-can` tooltip «Elimina», `aria-label="Elimina {nome} {cognome}"`.
- Stato vuoto: riga `colSpan=7` `.sib-empty` «Nessun collaboratore esterno.»

### 4.7 Modale invito
Comune alle due schede (`OpInvitoModal`, size `sm`): titolo «Invito per {nome cognome}», testi e pulsanti come in `03-crea-anagrafica.md` §4.8.

## 5. Stati e interazioni

### 5.1 Caricamento dati dipendenti
- Stato iniziale = elenco **FALLBACK** (11 righe, §6.4): la tabella è piena da subito, senza skeleton.
- Al montaggio: `POST /Sibylla/anagrafica-personale/GetAll` con corpo `{}`. Se risponde, sostituisce l'elenco; se fallisce, resta il FALLBACK in silenzio (nessun messaggio d'errore).

### 5.2 Schede
- Iniziale da `vista` (route). Clic su una scheda: cambia contenuto e pulsante a destra; i filtri di ciascuna scheda restano nello stato del componente finché la pagina è montata.

### 5.3 Filtri colonna (Dipendenti)
- Clic sull'imbuto: apre il popover di quella colonna (uno solo alla volta; ri-clic chiude). Il filtro si applica **mentre si digita**.
- Regola: per ogni filtro non vuoto la riga resta se `String(valore cella).toLowerCase()` **contiene** il testo in minuscolo; filtri in AND. Per «Reparto» si usa il reparto del contratto vigente.
- «Reset» rimuove il filtro della colonna e chiude; «OK» chiude e mantiene il filtro. Non c'è chiusura al clic esterno né con Esc.
- Nota di riproduzione: le `th` hanno `overflow: hidden` (regola della tabella) e il popover è posizionato in assoluto dentro la `th`; nella riproduzione il popover deve risultare **visibile sopra la tabella** (es. renderizzato in un portale o con `overflow: visible` sulle intestazioni), senza introdurre scroll orizzontale.
- Nessun ordinamento e nessuna paginazione: le righe sono nell'ordine ricevuto.

### 5.4 Azioni sui dipendenti
- **Dettaglio** → modale; Esc, ✕ o fondale chiudono. I pulsanti Visualizza/Scarica/Stampa sono attivi solo per il contratto con PDF caricato in questa sessione (data URL): Visualizza apre una nuova scheda; Scarica crea un `<a download>` col nome del file (default «contratto.pdf»); Stampa apre una finestra con titolo = nome file e un iframe a tutta altezza che chiama `print()` 300 ms dopo il caricamento.
- **Modifica** (matita o triangolo) → imposta l'anagrafica in modifica (id, nome, cognome, data di nascita convertita da gg/mm/aaaa a ISO, codice fiscale, indirizzo, cap, provincia, nazionalità «ITALIA», documenti) e naviga a `modifica-anagrafica`.
- **Contratto (PDF)** → modale storico (§4.5), dal più recente.
- **Invita Op!** → usa l'abilitazione salvata del dipendente (`invitaDipendenteOp`): successo → modale con il codice (nessun toast); errore → toast error titolo «Invita Op!» con il messaggio del servizio (es. «Inserisci un’email aziendale valida: è lì che arriva il token di invito.», «Scegli almeno un reparto dell’App Op!.») o «Invito non inviato.». Dopo l'invio il tooltip mostra l'ultimo invito.
- **Elimina** → nessuna azione oggi. Comportamento richiesto per la riproduzione con backend: ConfirmDialog (standard piattaforma: nessuna eliminazione senza conferma) e cancellazione via API; finché non esiste, il pulsante va riprodotto identico (presente, senza effetto).

### 5.5 Collaboratori esterni
- Filtri combinati in AND: azienda (uguaglianza su `fornitoreId`), stato autorizzazione (calcolato alla data odierna), ricerca testuale (contenuto case-insensitive in «{nome} {cognome} {email}»). Aggiornamento immediato.
- Ordinamento fisso: `localeCompare` su «{cognome}{nome}».
- **Invita Op!**: forza `emailAziendale` = email del collaboratore, `livello: impiegato`, `hr: false`, `responsabile: false`, reparti filtrati sulla categoria; se manca abilitazione o categoria non fa nulla; esito come per i dipendenti (modale o toast «Invita Op!»).
- **Stampa badge**: stessa stampa della scheda collaboratore (`04-crea-collaboratore-esterno.md` §5.8 e §8.3), con la struttura corrente o «Struttura»; errori in toast titolo «Badge» («Il browser ha bloccato la finestra di stampa: consenti i pop-up per questo sito.» o «Stampa non riuscita.»).
- **Elimina**: ConfirmDialog titolo «Elimina collaboratore esterno», messaggio «Eliminare la scheda di {Nome} {Cognome}? L’eventuale utenza nell’App Op! va bloccata da Utenti e ruoli.», pulsanti «Annulla» / «Elimina» (distruttivo). Confermato → la riga sparisce e il contatore della scheda scende. Nessun toast.

## 6. Dati e regole di business

### 6.1 Riga dipendente (risposta di `GetAll`)
```ts
interface PersonaleItem {
  id?: number; matricola?: number | string; nome?; cognome?; telefono?; email?; contatto_emergenza?;
  nato_il?: string /* gg/mm/aaaa */; codice_fiscale?; indirizzo?; cap?; provincia?; nazione?: string /* 'ITA' */;
  documenti?: { identita?; codiceFiscale?; contratto?; privacy?; sicurezza?; altri?: string[] } /* nomi file */;
  [k: string]: unknown;
}
```

### 6.2 Regole
- **Contratto vigente / reparto**: contratti con `anagraficaId === String(id)` ordinati per `decorrenza ?? createdAt` decrescente; il primo dà reparto e inquadramento.
- **Fascicolo** (5 elementi): i 4 documenti obbligatori (presenti se `documenti[key]` non è vuoto) + «Contratto di lavoro», presente se esiste **almeno un contratto** nello storico (non dal campo `documenti.contratto`). `mancanti = documenti assenti + (nessun contratto ? 1 : 0)`; il triangolo compare se `mancanti > 0`. Nel Dettaglio la presenza del contratto si valuta sul contratto vigente (stesso risultato).
- **Contatore PDF** = numero di contratti del dipendente.
- **Invita Op! visibile** = modulo `app-op` attivo (regola della sidenav: in assistenza i moduli del cliente, con profilo i suoi moduli, senza profilo tutto attivo, `full` li comprende) **e** `abilitazioni[String(id)].abilitato`.
- **Esterni**: stato autorizzazione, documenti mancanti e chiave App Op! `est-{id}` come in `04-crea-collaboratore-esterno.md` §6.2; invitabile solo con stato `attiva` o `in-scadenza`.
- **Formati data**: `fmtDate` ISO → gg/mm/aaaa («—» se vuoto); esterni `fmtBreve` ISO → gg/mm/aa; tooltip ISO → gg/mm/aaaa.
- **Avatar** del Dettaglio: `avatarUrl(s)`: se `s` è un'immagine (`data:`, `blob:`, `http(s):`, `/…`) la usa; se è un id `avatar-01…avatar-50` usa `/avatars/{id}.svg`; altrimenti `h = 0; per ogni carattere h = (h × 31 + charCode) >>> 0`; indice `h % 50` → `/avatars/avatar-{indice+1 a 2 cifre}.svg`. Gli SVG sono 50 asset statici.

### 6.3 Persistenza attuale
| Dato | Store | Chiave `localStorage` | Versione |
|---|---|---|---|
| Elenco dipendenti | nessuna (API o FALLBACK in memoria) | — | — |
| Contratti | `useContrattiPersonaleStore` | `sibylla.contratti-personale` | 2 |
| Abilitazioni App Op! | `useAnagraficaOpStore` | `sibylla.anagrafica-op` | 2 |
| Collaboratori esterni | `useCollaboratoriEsterniStore` | `sibylla.collaboratori-esterni` | 2 |
| Ditte in appalto | `useCatalogoStore` (solo `appalto`) | `sibylla.catalogo-appalto` | 2 |
| Configurazione HR (categorie, orari, schemi, badge) | `useHrConfigStore` | `sibylla.hr-config` | 7 |
| Copia di prova App Op! | `useAppOpProva` | `sibylla-app-op-prova` | — |

### 6.4 Dati demo (FALLBACK, 11 dipendenti) e risultato atteso
| Matr. | Nome Cognome | Reparto (contratto) | N. contratti | Fascicolo mancanti | App Op! |
|---|---|---|---|---|---|
| 66 | Piero Aragona | Direzione | 2 | 0 | abilitato |
| 67 | Ruggero Novi | Amministrazione | 1 | 0 | — |
| 69 | Andrea Grimaudo | F&B | 1 | 1 (Formazione sicurezza) | — |
| 82 | mario idraulico | - | 0 | 5 | — |
| 83 | Ali Aslan | - | 0 | 5 | — |
| 84 | dino 2 tacchini | - | 0 | 5 | — |
| 85 | Scontrino test | - | 0 | 5 | — |
| 86 | Scontrino test (telefono vuoto, nato 01/01/0001) | - | 0 | 5 | — |
| 88 | Andrea G Test | Housekeeping | 1 | 3 (Codice fiscale…, Informativa privacy, Formazione sicurezza) | — |
| 89 | Marco Campo | Front office | 1 | 0 | abilitato |
| 90 | Sicilia Andrea | - | 0 | 5 | — |

Altri campi del FALLBACK (telefono, nato il, codice fiscale, indirizzo, cap, provincia, nazione «ITA», email ed emergenza dove presenti) sono riportati in `src/modules/hr/ArchivioPersonale/ArchivioPersonale.tsx` e vanno copiati tali e quali (sono dati di prova, inclusi i valori "sporchi" come «token», «Vwertyuioi», cap «000000»). Esempio completo: `{ id: 66, matricola: 66, nome: 'Piero', cognome: 'Aragona', telefono: '+39 339 1234567', email: 'p.aragona@hotelnoto.it', contatto_emergenza: 'Maria Aragona +39 340 1112233', nato_il: '12/03/1959', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30', cap: '00199', provincia: 'to', nazione: 'ITA', documenti: { identita: 'carta_identita_aragona.pdf', codiceFiscale: 'tessera_sanitaria_aragona.pdf', contratto: 'contratto_lavoro_2026.pdf', privacy: 'informativa_privacy.pdf', sicurezza: 'formazione_sicurezza.pdf', altri: ['patto_riservatezza.pdf'] } }`.

Collaboratori esterni seed (oggi 05/11/2026), nell'ordine visualizzato: **Benali Karim** (Movi Facchinaggio, Facchino, «Non abilitato», 01/05/26 – 31/10/26, «Scaduto», manca DURC → triangolo, nessuna icona invito); **Lupo Davide** (Tecno Impianti Hotel, Manutentore, «Manutenzione», fino a oggi + 18 giorni, «In scadenza», icona invito attiva); **Morra Elena** (Splendor Servizi Integrati, Addetto pulizie, «Pulizie», 01/03/26 – 28/02/27, «Autorizzato», icona invito attiva).

## 7. Backend da realizzare

| Azione | Metodo e percorso | Stato |
|---|---|---|
| Elenco dipendenti | `POST /Sibylla/anagrafica-personale/GetAll` `{}` → `PersonaleItem[]` | esiste (catch-all del proxy, controller `AnagraficaPersonaleController.GetPersonale`) |
| Elenco arricchito (consigliato) | `GET /Sibylla/hr/anagrafiche?include=contrattoVigente,fascicolo,appOp` | da realizzare: restituisce per ogni dipendente `reparto`, `nContratti`, `fascicoloMancanti[]`, `appOp { abilitato, emailAziendale, ultimoInvito }`, evitando i calcoli lato client |
| Dettaglio | `GET /Sibylla/hr/anagrafiche/{id}` | da realizzare (vedi `03` §7) |
| Storico contratti | `GET /Sibylla/hr/anagrafiche/{id}/contratti` | da realizzare |
| PDF / documenti | `GET /Sibylla/hr/contratti/{idContratto}/pdf`, `GET /Sibylla/hr/anagrafiche/{id}/documenti/{slot}` | da realizzare: sostituiscono i data URL e abilitano Visualizza/Scarica/Stampa |
| Elimina dipendente | `DELETE /Sibylla/hr/anagrafiche/{id}` | da realizzare; `409` se ci sono presenze/cedolini che impediscono la cancellazione (proporre la cessazione) |
| Invita Op! | `OpApp/utenti/Salva` / `OpApp/inviti/Invia` | esistono lato Portal/Op.Api (`03` §7) |
| Elenco esterni | `GET /Sibylla/hr/collaboratori-esterni?fornitoreId=&stato=&q=` | da realizzare; ordinato per cognome, nome; `stato` calcolato dal server alla data corrente |
| Elimina esterno | `DELETE /Sibylla/hr/collaboratori-esterni/{id}` | da realizzare (`04` §7) |
| Badge | vedi `04` §7 | — |

Esempio elenco arricchito:
```json
[{ "id": 69, "matricola": 69, "nome": "Andrea", "cognome": "Grimaudo", "telefono": "+39 333 9988776", "nato_il": "10/10/1996",
   "codice_fiscale": "QSSFC90L23F205X", "indirizzo": "VIA DEI MILLE, 30", "cap": "00185", "provincia": "ROMA", "nazione": "ITA",
   "reparto": "F&B", "nContratti": 1, "fascicoloMancanti": ["sicurezza"],
   "appOp": { "abilitato": false } }]
```
Errori: `401` → login; `5xx` → oggi silenzioso (resta il FALLBACK); nella riproduzione con backend reale mostrare lo stato vuoto «Nessun collaboratore trovato.» in caso di elenco vuoto. L'invito App Op! invia l'email al destinatario; nessuna notifica nel Centro notifiche.

## 8. Stile

Token come in `03-crea-anagrafica.md` §8 (in più `--color-warning-light` `#FFF3E0` → scuro `#2A2012`; `--color-success-mid` `#00CF86` in entrambi i temi). Tabella standard `.sib-table` (bordi 1px, header muted case normale, nessuna zebra; vedi `00-fondamenta.md`); in tema scuro wrap e celle usano `--color-surface`/`--color-bg`/`--color-border` per le regole globali della skin.

Note sulle classi Tailwind usate nell'archivio: `text-text-muted` e `text-text` **non sono definite** nella configurazione Tailwind del progetto, quindi quei testi ereditano il colore del contenitore (nelle celle di tabella e nelle modali è `--color-text-active`); `border-line` = `--color-border`; `bg-canvas` = `--color-bg`; `bg-success` = `--color-success-mid`; `text-success` = `--color-success-mid`; `text-warning` = `--color-warning`; `bg-warning-light` = `--color-warning-light`; `bg-primary` = `--color-primary`; `text-error` = `--color-error`; `bg-white` in dark = `--color-surface`.

### 8.1 `ArchivioPersonale.sass`
| Classe | Valori |
|---|---|
| `.arch-pers` | `container-type: inline-size` |
| `.arch-pers__bar` | flex, `align-items: flex-end`, `space-between`, gap 12px, `margin-bottom: 16px`, `border-bottom: 1px solid --color-border`; `> .sib-btn` `margin-bottom: 8px` |
| `.arch-pers__bar .arch-pers__tabs` | `margin-bottom: -1px`, `border-bottom: 0` |
| `.arch-pers__table` | `table-layout: fixed`, `width: 100%`; `th, td` `white-space: nowrap`, `overflow: hidden` |
| colonne `.arch-pers__col--*` | matricola 7%, nome 9%, cognome 8%, reparto 10%, telefono 9%, nato_il 7%, codice_fiscale 10%, indirizzo 9%, cap 5%, provincia 6%, nazione 5%, azioni 15% (totale 100%) |
| `.arch-pers__th` | flex, centrato, gap 6px, `min-width: 0`; primo figlio `min-width: 0` |
| `.arch-pers__matr` | inline-flex, centrato, gap 6px |
| `.arch-pers__acts` | flex, centrato, `justify-content: flex-end`, gap 2px |

### 8.2 `EsterniTable.sass`
| Classe | Valori |
|---|---|
| `.arch-est` | colonna, gap 14px, `container-type: inline-size` |
| `.arch-est__filters` | flex, `align-items: flex-end`, gap 14px, wrap; `> :first-child` `flex: 1 1 260px`; altri `flex: 0 1 220px` |
| `.arch-est__table` | `table-layout: fixed`, 100%; `th, td` nowrap, overflow hidden |
| colonne | `__c-nome` 21%, `__c-az` 16%, `__c-cat` 13%, `__c-rep` 11%, `__c-aut` 15%, `__c-stato` 11%, `__c-act` 13% |
| `.arch-est__table .arch-est__th-act` | `text-align: right` |
| `.arch-est__nome` | flex, centrato, gap 6px, `min-width: 0`; il testo `min-width: 0` |
| `.arch-est__warn` | padding 0, senza bordo/sfondo, colore `--color-warning`, pointer |
| `.arch-est__tip` | testo a sinistra, 12px; `ul` `margin: 4px 0 0`, `padding-left: 16px` |
| `.arch-est__tag` | `flex-shrink: 0`, `padding: 0 6px`, radius 4px, 10px, 700, `letter-spacing: .3px`, `line-height: 18px`, testo `--color-primary`, sfondo `--color-primary-50` |
| `.arch-est__badge` | inline-flex, `max-width: 100%`, `min-width: 0`, `vertical-align: middle`, altezza e `line-height` 22px, `padding: 0 8px`, radius 11px, 11px, 600 |
| `--attiva` | `--color-success` su `alpha(success, .12)` |
| `--in-scadenza` | `--color-warning` su `alpha(warning, .13)` |
| `--scaduta` | `--color-error` su `alpha(error, .1)` |
| `--futura` | `--color-text-inactive` su `alpha(text-inactive, .1)` |
| `.arch-est__acts` | flex a destra, gap 2px |

### 8.3 Pulsanti icona
Standard `.sib-btn--icon` (vedi `00-fondamenta.md`): 36×36, padding 0, sfondo bianco/superficie, bordo 1px `--color-border`, icona `--color-text-inactive`; hover (se abilitato) bordo `--color-primary`, sfondo `--color-primary-50`, icona `--color-primary`. In container stretto vedi §9.

## 9. Responsività

Container query (non media query), così il comportamento segue la larghezza reale del contenuto anche con la sidebar aperta:

| Container | Soglia | Cambia |
|---|---|---|
| `.arch-pers` | `@container (max-width: 1100px)` | celle e intestazioni della tabella dipendenti: `padding-left/right: 6px`, `font-size: 12px`; pulsanti azione 22px di larghezza (`min-width: 22px`, `padding: 0`), icona 14px |
| `.arch-est` | `@container (max-width: 1000px)` | celle della tabella esterni: `padding-left/right: 6px`, `font-size: 12px`; pulsanti azione 22px (`min-width: 22px`, `padding: 0`) |

- **Nessuno scroll orizzontale** a nessuna larghezza: layout fisso con colonne in percentuale; ogni testo su una riga con ellissi e tooltip (`TruncatedText`); intestazioni abbreviate («Matr.», «Tel.», «C.F.», «Prov.», «Naz.») sempre con tooltip del nome intero.
- Laptop 1366 px con sidebar aperta: il contenuto scende sotto 1100 px → si attiva la compattazione della tabella dipendenti (e sotto 1000 px quella degli esterni). A 1920 px: padding e dimensioni standard.
- Filtri esterni: vanno a capo (wrap); la ricerca prende lo spazio rimasto (base 260px).
- Modali xl: `max-width: 780px`, con 16px di margine dal bordo dello schermo e scroll interno oltre `100vh − 32px`. Il Dettaglio usa `<dl>` a 2 e 3 colonne fisse.

## 10. Effetti e animazioni

- Triangolo del fascicolo (tabella dipendenti), pillola «Documentazione incompleta» e icona «Mancante» nel Dettaglio: `animate-pulse` di Tailwind (`pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`, opacità 0.5 a metà ciclo). Il triangolo della tabella esterni non lampeggia.
- Invio in corso: `fa-spinner fa-spin` al posto dell'icona.
- Tabs: transizione colori 150 ms.
- Tooltip: componente condiviso (dark per le azioni, light per l'elenco documenti).
- `prefers-reduced-motion: reduce`: regola globale (animazioni/transizioni a 0.01ms, una sola iterazione).
- Nessuno skeleton: il FALLBACK è visibile subito e viene sostituito dalla risposta.

## 11. Accessibilità

- Pulsanti icona dipendenti con `title` («Dettaglio dipendente», «Modifica», «Contratto (PDF)», «Elimina», «Filtra»); Invita Op! con `aria-label`; triangolo con `aria-label="Documentazione incompleta — inserisci documenti mancanti"`.
- Pulsanti esterni con `aria-label` completi («Modifica {nome} {cognome}», «Invita … all'App Op!», «Stampa badge di …», «Elimina …») e tooltip.
- Input del filtro con autofocus all'apertura.
- Modali: Esc, ✕ e fondale chiudono; ConfirmDialog con Esc = annulla.
- Pulsanti disabilitati (invio, documenti senza URL) con attributo `disabled`.

## 12. Criteri di accettazione

1. Da sidenav «Archivio del personale» si apre la scheda «Dipendenti (11)» con il titolo e il sottotitolo esatti di §4.1 e il pulsante «Crea anagrafica profilo»; l'altra scheda è «Collaboratori esterni (3)».
2. Aprendo `archivio-personale:esterni` la scheda attiva è «Collaboratori esterni» e il pulsante a destra è «Nuovo collaboratore esterno».
3. La tabella dipendenti ha 12 colonne con le larghezze di §8.1, nessuno scroll orizzontale a 1024, 1280, 1366 (sidebar aperta), 1440 e 1920 px, e ogni testo troppo lungo finisce con «…» mostrando il testo intero all'hover.
4. All'hover su «Matr.», «Tel.», «C.F.», «Prov.», «Naz.» compare il tooltip con «Matricola N°», «Contatto telefonico», «Codice Fiscale», «Provincia», «Nazione».
5. Le righe 82, 83, 84, 85, 86, 90 mostrano il triangolo arancio lampeggiante; il tooltip dice «5/5 documenti mancanti — clicca per inserirli:» con i 5 elementi; la riga 88 dice «3/5»; le righe 66, 67, 89 non hanno triangolo.
6. Il filtro «Nome» con «andrea» lascia Andrea Grimaudo, Andrea G Test (e non Sicilia Andrea, che ha «Andrea» nel cognome); «Reset» ripristina l'elenco; con un filtro senza risultati compare «Nessun collaboratore trovato.»
7. La colonna Reparto mostra «Direzione» per Aragona, «F&B» per Grimaudo, «-» per chi non ha contratti; filtrando Reparto con «house» resta solo Andrea G Test.
8. Il pulsante PDF di Aragona mostra il contatore «2»; la modale «Contratto — Piero Aragona» elenca due card, la prima con la pillola «Vigente» verde chiaro e «PDF non disponibile».
9. Il Dettaglio di Aragona mostra l'avatar 112×144, 12 voci anagrafiche, il blocco «Inquadramento contrattuale» con Orario «Full time 40 h · 5 giorni (40 h)», Part time «Full time», Permessi annui «72 h ROL + 32 h ex fest.», RAL «€ 52.000», e «Documentazione completa» in verde.
10. Il Dettaglio di «mario idraulico» mostra la pillola lampeggiante «Documentazione incompleta — 5/5 mancanti» e cinque righe «Mancante».
11. Con il modulo App Op! attivo l'icona telefono compare solo per Aragona e Campo; il tooltip di Campo è «Invita Op! — invia il token di invito a m.campo@hotelnoto.it»; cliccando, l'icona diventa uno spinner e poi si apre la modale «Invito per Marco Campo» con il codice.
12. La matita di un dipendente apre «Modifica anagrafica personale» con i dati precompilati; il triangolo fa lo stesso.
13. Nella scheda esterni l'ordine è Benali, Lupo, Morra; Benali ha il triangolo con «DURC» nel tooltip, stato «Scaduto» rosso, reparti «Non abilitato» e nessuna icona telefono; Lupo è «In scadenza» arancio; Morra «Autorizzato» verde; la colonna Autorizzazione mostra «01/03/26 – 28/02/27» con tooltip «Dal 01/03/2026 al 28/02/2027».
14. Filtrando Autorizzazione «Scaduto» resta solo Benali; con Azienda «Splendor Servizi Integrati» resta solo Morra; cercando «tecnoimpianti» resta solo Lupo.
15. Il cestino di un esterno apre la conferma con il testo esatto di §5.5; confermando la riga sparisce e la scheda diventa «Collaboratori esterni (2)».
16. L'icona badge di Morra apre la finestra di stampa con la tessera orizzontale (fronte e retro) su A4.
17. Con container < 1100 px le celle dei dipendenti passano a 12px con padding laterale 6px e i pulsanti azione a 22px; con container < 1000 px lo stesso vale per la tabella esterni.
18. In tema scuro tabella, popover filtro e modali usano le superfici scure (`#1A1E26`, header `#12151B`, bordi `#2B313D`), senza sfondi bianchi residui.

## 13. File sorgente

- `src/router/PageContent.tsx`
- `src/modules/hr/ArchivioPersonale/ArchivioPersonale.tsx`, `ArchivioPersonale.sass`
- `src/modules/hr/ArchivioPersonale/EsterniTable.tsx`, `EsterniTable.sass`
- `src/modules/hr/CreaAnagrafica/_state.ts`
- `src/modules/hr/_badge/badgeEsterno.ts`
- `src/store/useContrattiPersonaleStore.ts`, `useAnagraficaOpStore.ts`, `useCollaboratoriEsterniStore.ts`, `useHrConfigStore.ts`, `useCatalogoStore.ts`, `useConfirmStore.ts`
- `src/modules/appop/invitoAnagrafica.ts`, `OpInvitoModal.tsx`, `opApi.ts`, `opCatalogo.ts`, `appOpSibylla.ts`
- `src/hooks/useModuloAttivo.ts`, `src/hooks/useStrutturaCorrente.ts`
- `src/core/avatar.ts`
- `src/core/components/PageHead.tsx`, `BtnBack.tsx`, `Tabs.tsx`, `Tooltip.tsx`, `TruncatedText.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`
- `src/services/api.ts`
- `src/navigation/menu.ts`, `pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`, `src/modules/home/Timone/Timone.tsx`, `src/modules/hr/HrOverview/HrOverview.tsx`
- `src/styles/_themes.sass`, `_colors.sass`, `_components.sass`, `_skin-dark.sass`, `src/tailwind.css`, `tailwind.config.js`
