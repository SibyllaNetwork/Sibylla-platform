# 03 · Crea anagrafica personale (`crea-anagrafica` / `modifica-anagrafica`)

> Scheda di riproduzione. Componenti condivisi (PageHead, InputField, SelectField, DatePickerField, ToggleSwitch, CheckboxField, AlertBanner, Modal, ConfirmDialog, Toast, TruncatedText, `.sib-btn*`) sono descritti in `00-fondamenta.md`; entità trasversali (Anagrafica, Contratto, Configurazione HR, Abilitazione App Op!) e convenzioni API in `01-modello-dati-e-api.md`. Qui c'è tutto ciò che è specifico della pagina.

---

## 1. Scopo e utenti

Scheda del singolo **dipendente** ("scheda personale" a sezioni impilate), usata dall'**ufficio del personale / responsabile HR** della struttura per:

- creare o modificare i dati anagrafici, i contatti e la residenza;
- assegnare l'inquadramento operativo (strutture, reparto, orario di lavoro, schema di turnazione) letto dalla **Configurazione HR**;
- registrare il **contratto** e le sue **variazioni** (storico), con CCNL, livello, tipologia, RAL, decorrenza, eventuale fine rapporto e periodo di prova, con le spettanze annue calcolate dal CCNL e il PDF del contratto;
- abilitare l'accesso all'**App Op!** e inviare il token di invito all'email aziendale (solo se il modulo `app-op` è attivo);
- acquisire i documenti del fascicolo (identità, codice fiscale/tessera sanitaria, privacy, formazione sicurezza) e altri allegati.

Il dipendente non usa questa pagina: le sue richieste arrivano dall'App Op!.

## 2. Accesso

| Voce | Valore |
|---|---|
| Id pagina (creazione) | `crea-anagrafica` → `<CreaAnagrafica navigate key="crea-anag"/>` |
| Id pagina (modifica) | `modifica-anagrafica` → `<CreaAnagrafica navigate editing key="mod-anag"/>` |
| Menu (sidenav) | **Human Resources** (colore sezione `#9B59B6`) › **Gestione delle anagrafiche** › «Crea anagrafica personale» |
| Icona voce di menu | `fa-user-plus` (mappa `MenuIco`) |
| Presente anche in | menu Tour Operator e menu Ristoranti (stessa voce, stessa label), Timone home: «Crea anagrafica personale» icona `user-plus` |
| Sottotitolo nel registro `pageSubtitles` | «Crea l’anagrafica di una nuova risorsa e aggiorna subito ruoli e dati contrattuali» (usato solo dalle pagine generiche; la pagina passa il proprio sottotitolo, vedi §4) |
| Breadcrumb | standard della shell: Human Resources › Gestione delle anagrafiche › Crea anagrafica personale |
| Deep link | nessun parametro. `modifica-anagrafica` non porta l'id nel percorso: il dipendente da modificare viene passato in memoria (vedi §6, `_state`) |

**Da dove si arriva**
- Sidenav (creazione).
- Archivio del personale (`archivio-personale`): pulsante «Crea anagrafica profilo» → `crea-anagrafica`; icona matita «Modifica» o triangolo «Documentazione incompleta» → `modifica-anagrafica` dopo aver impostato il dipendente in modifica.

**Verso dove si naviga**
- `archivio-personale`: «Indietro» del PageHead, «Annulla», e dopo un «Salva» riuscito (con errore si resta sulla scheda).
- `hr-configurazione`: pulsante «Configurazione HR» nell'header della sezione «Inquadramento e turni».
- `hr-configurazione:hr-ccnl`: link «Configuralo in Human Resources › Configurazione» quando nessun CCNL è selezionato.

## 3. Layout

Root `.crea-anag`: colonna flex, `align-items: stretch`. Nessuna larghezza massima propria (occupa il contenitore della pagina).

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [← Indietro]        Crea anagrafica personale                             │  PageHead
│                     Scheda del dipendente: dati anagrafici, …             │
├───────────────────────────────────────────────────────────────────────────┤
│ ⓘ Nome e cognome sono obbligatori            (solo se errore, rosso 13px) │
├───────────────────────────────────────────────────────────────────────────┤  .crea-anag__sheet (gap 16, mt 8)
│ ┌─[🪪 Dati anagrafici                           ⌄]──────────────────────┐ │
│ │ (◯ foto 96)   Nome        | Cognome     | Data di nascita            │ │
│ │ [📷][🖼]      Sesso       | Codice fisc.| Nazionalità                │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─[📇 Contatti                                  ⌄]──────────────────────┐ │
│ │ E-mail personale | E-mail aziendale | Telefono                       │ │
│ │ Contatto di emergenza                                                │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─[📍 Residenza                                 ⌄]──────────────────────┐ │
│ │ Indirizzo (2fr) | Indirizzo 2 (2fr) | CAP (1fr) | Provincia (1fr)    │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─[💼 Inquadramento e turni             ⌄]   [⚙ Configurazione HR]──────┐ │
│ │ Strutture abilitate | Reparto | Orario di lavoro                     │ │
│ │ Schema di turnazione                                                 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─[📄 Contratto                         ⌄]   [🕘 Storico (2)]───────────┐ │
│ │ (errore sezione)                                                     │ │
│ │ Nome impiegato | Ruolo / mansione | Tipologia del contratto          │ │
│ │ CCNL applicato | Livello          | RAL (€)                          │ │
│ │ Decorrenza     | [Fine rapporto]  | [Periodo di prova (giorni)]      │ │
│ │ ┌ ⚖ Inquadramento e spettanze annue ·········· Full time … · full ┐ │ │
│ │ │ Categoria | Ferie | Permessi ROL | Ex festività | Maturazione …  │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌ Contratto (PDF)  ⚠ Da caricare ···········  [📂 Carica PDF] ─────┐ │ │
│ │                                   [⊕ Aggiungi variazione contrattuale]│ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ (bordo dashed) ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │
│ │ 🕘 Storico contrattuale                                              │ │
│ │ ┌ [Vigente] Tempo indeterminato  Direttore… · Q.A livello · …  📄 👁 🗑┐│ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─[📱 App Op!                                   ⌄]──────────────────────┐ │  (solo modulo app-op)
│ │ (toggle) Abilita l’accesso all’App Op!                               │ │
│ │ E-mail aziendale | Grado nell’app | (toggle Resp.) (toggle HR)       │ │
│ │ Reparti dell’app: ☐ Pulizie ☐ Manutenzione …                         │ │
│ │ ─────────────────────────────────────────────────────────────────── │ │
│ │ ✉ Nessun invito inviato                    [✈ Invia token di invito] │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─[📂 Documenti e allegati                      ⌄]──────────────────────┐ │
│ │ ┌ Documento d'identità  ⚠ Mancante ······ [Scanner][File][Foto] ┐  │ │
│ │ ┌ Codice fiscale / Tessera sanitaria … ┐ (4 righe)                  │ │
│ │ Documentazione contrattuale / altri allegati                         │ │
│ │ [⊕ Aggiungi documenti]                                               │ │
│ │ ┌ 📄 file.pdf ······················· 👁 🖨 🗑 ┐                     │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────┤
│                                                       [Annulla] [Salva]  │  .crea-anag__actions (mt 20, gap 12)
└───────────────────────────────────────────────────────────────────────────┘
```

**Blocchi e misure**

- **PageHead**: standard (vedi `00-fondamenta.md`), con `onBack`.
- **Errore di pagina** `.crea-anag__error`: inline-flex, `gap: 8px`, margine `4px 0 0`, 13px, colore `--color-error`.
- **Foglio** `.crea-anag__sheet`: colonna flex, `gap: 16px`, `margin-top: 8px`.
- **Sezione** `.crea-anag__section`: bordo `1px solid --color-border`, `border-radius: 10px`, sfondo `--color-surface`, `overflow: hidden`.
  - Header `.crea-anag__section-head`: flex, `align-items: center`, `justify-content: space-between`, `gap: 12px`, `padding: 4px 12px 4px 6px`, sfondo `--color-bg`, bordo inferiore `1px solid --color-border` (rimosso quando la sezione è chiusa).
  - Pulsante toggle `.crea-anag__section-toggle`: `flex: 1`, `min-width: 0`, flex, `gap: 9px`, `padding: 8px 6px`, senza sfondo/bordo, `cursor: pointer`, testo a sinistra. Contiene icona sezione, `<h3>` e chevron.
  - Slot azioni `.crea-anag__section-actions`: inline-flex, `gap: 8px`, `flex: none` (a destra, non attiva il toggle).
  - Corpo `.crea-anag__section-body`: `padding: 18px`. Non è montato quando la sezione è chiusa.
- **Griglie campi** `.crea-anag__grid`: `display: grid`, `gap: 16px 18px`.
  - `--3`: `repeat(3, 1fr)`.
  - `--res`: `2fr 2fr 1fr 1fr`.
- **Dati anagrafici** `.crea-anag__identity`: flex, `gap: 22px`, `align-items: flex-start`; a sinistra la foto (`.crea-anag__photo`, colonna centrata, `gap: 8px`, `flex: none`), a destra la griglia a 3 colonne (`.crea-anag__identity-fields`: `flex: 1`, `min-width: 0`).
- **Barra azioni** `.crea-anag__actions`: flex, `justify-content: flex-end`, `gap: 12px`, `margin-top: 20px`.
- Tutti i `.sib-input` e `.sib-select` dentro `.crea-anag` hanno `width: 100%`.

## 4. Elementi e testi

### 4.1 PageHead
- Titolo: creazione «Crea anagrafica personale»; modifica «Modifica anagrafica personale».
- Sottotitolo: «Scheda del dipendente: dati anagrafici, contatti, residenza, inquadramento contrattuale e accesso all’App Op!» (apostrofo tipografico `’`).
- Pulsante Indietro: label standard «Indietro»; azione: azzera l'anagrafica in modifica e va a `archivio-personale`.

### 4.2 Struttura di ogni sezione (componente locale `Section`)
- Icona: `<i class="fa-duotone {icon}">` colore `--color-primary`, 15px, `aria-hidden`.
- Titolo `<h3>`.
- Chevron: `fa-solid fa-chevron-down`, classe `.crea-anag__section-chev`, ruotato di −90° quando chiusa.
- Tutte le sezioni partono **aperte** (`defaultOpen = true`).

| Sezione | Icona | Titolo | Azione nell'header |
|---|---|---|---|
| 1 | `fa-id-card` | «Dati anagrafici» | — |
| 2 | `fa-address-book` | «Contatti» | — |
| 3 | `fa-location-dot` | «Residenza» | — |
| 4 | `fa-briefcase` | «Inquadramento e turni» | pulsante «Configurazione HR» |
| 5 | `fa-file-contract` | «Contratto» | pulsante «Storico» |
| 6 | `fa-mobile-screen` | «App Op!» | — (sezione presente solo con il modulo `app-op` attivo) |
| 7 | `fa-folder-open` | «Documenti e allegati» | — |

### 4.3 Dati anagrafici
**Foto** (`.crea-anag__photo`) — la foto fa parte dell'anagrafica (campo `avatarUrl`, §6.1) e si vede poi nel «Dettaglio dipendente» dell'Archivio.
- Miniatura tonda 96×96: è un `<button type="button" aria-label="Scegli avatar o foto">` che apre l'**AvatarPicker** condiviso. Senza foto mostra `fa-duotone fa-user` (40px, `--color-text-inactive`); con foto mostra `<img alt="Foto di {nome cognome}">` (o «Foto di dipendente» se nome e cognome sono vuoti) con sorgente `avatarUrl(valore)`.
- Sotto, pulsanti `.sib-btn.sib-btn--icon` (gap 6px):
  - `fa-duotone fa-camera`, `title="Scatta foto"` → input file nascosto `accept="image/*" capture="user"` (fotocamera frontale su mobile, scelta file su desktop);
  - `fa-duotone fa-image`, `title="Scegli avatar o carica foto"` → AvatarPicker;
  - solo con una foto impostata: `fa-duotone fa-trash-can`, `title="Rimuovi foto"` → toglie la foto dalla scheda (senza conferma: diventa definitivo solo con «Salva», «Annulla» lo annulla).
- **AvatarPicker** (componente condiviso, con `allowUpload`): modale «Scegli avatar», testo «Seleziona un avatar oppure carica una tua foto. Viene salvato solo il riferimento.», pulsante «Carica una foto» / «Cambia foto» (immagini fino a 2 MB, errori «Seleziona un file immagine.» / «Immagine troppo grande (max 2MB).»), griglia dei 50 avatar `/avatars/avatar-01…50.svg`. Un clic su un avatar o il caricamento chiudono la modale.

**Campi** (griglia a 3 colonne, in quest'ordine)
| name | Label | Tipo | Opzioni / note |
|---|---|---|---|
| `nome` | «Nome» | InputField | — |
| `cognome` | «Cognome» | InputField | — |
| `data_nascita` | «Data di nascita» | DatePickerField | valore ISO `yyyy-mm-dd` |
| `sesso` | «Sesso» | SelectField | «Seleziona sesso» (`''`), «Maschio» (`M`), «Femmina» (`F`), «Altro» (`A`) |
| `codice_fiscale` | «Codice fiscale» | InputField | nessuna trasformazione |
| `nazionalita` | «Nazionalità» | SelectField | valori `ITALIA`, `FRANCIA`, `GERMANIA`, `SPAGNA`, `REGNO UNITO`, `STATI UNITI`, `ALBANIA`, `ROMANIA`, `MAROCCO`, `CINA`; label = bandiera emoji + spazio + nome (es. «🇮🇹 ITALIA»). Default `ITALIA` |

Nessun campo ha l'asterisco `required`: l'obbligatorietà di nome e cognome è verificata al salvataggio.

### 4.4 Contatti (griglia a 3 colonne)
| name | Label | Tipo |
|---|---|---|
| `email` | «E-mail personale» | `type="email"` |
| `email_aziendale` | «E-mail aziendale» | `type="email"`; valore iniziale = `emailAziendale` dell'abilitazione App Op! salvata per questo dipendente (stringa vuota se assente). È lo stesso valore del campo email della sezione App Op! (due campi, un solo dato). |
| `telefono` | «Telefono» | `type="tel"` |
| `contatto_emergenza` | «Contatto di emergenza» | testo |

### 4.5 Residenza (griglia `2fr 2fr 1fr 1fr`)
«Indirizzo» (`indirizzo`), «Indirizzo 2 (facoltativo)» (`indirizzo2`), «CAP» (`cap`), «Provincia» (`provincia`).

### 4.6 Inquadramento e turni
Azione header: `.sib-btn.sib-btn--ghost.sib-btn--sm` con `fa-light fa-sliders` + «Configurazione HR» → `hr-configurazione`.

Griglia a 3 colonne:
| name | Label | Opzioni | Hint (sotto il campo) |
|---|---|---|---|
| `strutture` | «Strutture abilitate» | «Seleziona» + strutture del cliente corrente (stringhe). **Select singola** nonostante il plurale. | — |
| `reparto` | «Reparto» | «Seleziona» + reparti HR **attivi** (più quello già selezionato anche se disattivato) | «Responsabile: {nome}» se il reparto ha un responsabile |
| `orario` | «Orario di lavoro» | «Seleziona» + tutti gli orari HR | «{ore} h su {giorni} giorni» e, se a turni, « · a turni» (es. «40 h su 5 giorni», «40 h su 6 giorni · a turni») |
| `schema_turni` | «Schema di turnazione» | «Nessuna (orario fisso)» (`''`) + tutti gli schemi | se c'è uno schema: sigle della sequenza unite da « · » (riposo = «R»), es. «M · M · P · P · N · N · R · R»; senza schema ma con orario a turni: «Orario a turni: scegli la rotazione»; altrimenti nessun hint |

### 4.7 Contratto (sotto-componente `ContrattiSection`)
**Azione header**: `.sib-btn.sib-btn--secondary.sib-btn--sm`, icona `fa-light fa-clock-rotate-left` (storico chiuso) o `fa-light fa-chevron-up` (storico aperto) + «Storico»; se esistono variazioni per questo dipendente, a destra il contatore `.crea-anag__ctr-count` con il numero.

**Errore di sezione** (prima della griglia): `<p class="crea-anag__error">` con `fa-light fa-circle-exclamation` + messaggio (stesso stile dell'errore di pagina).

**Griglia a 3 colonne "nuova variazione"** (in quest'ordine):
| name | Label | Tipo | Opzioni / placeholder / hint / errore |
|---|---|---|---|
| `ctr_nome` | «Nome impiegato» | InputField | placeholder = «{nome} {cognome}» del dipendente (trim) |
| `ctr_ruolo` | «Ruolo / mansione» | SelectField | «Seleziona» + nomi dei ruoli della pagina Ruoli & funzioni (deduplicati, senza vuoti; seed: «Operation», «Prova», «Ruoloooo») |
| `ctr_tipologia` | «Tipologia del contratto» | SelectField | «Seleziona» + tipologie **attive** della Configurazione HR |
| `ctr_ccnl` | «CCNL applicato» | SelectField | «Seleziona» + tutti i CCNL. Cambiandolo si azzerano livello e periodo di prova |
| `ctr_livello` | «Livello» | SelectField | disabilitato finché non c'è un CCNL; prima opzione «Seleziona» o, senza CCNL, «Scegli prima il CCNL»; poi «{codice} – {descrizione}» (trattino lungo `–`), es. «2° – Primo portiere, chef de rang, governante». Cambiandolo si azzera il periodo di prova |
| `ctr_ral` | «RAL (€)» | InputField con `iconLeft="fa-light fa-euro-sign"` | placeholder: RAL minima formattata (es. «25.060») o «es. 28.000»; hint «Minimo da CCNL: € {min}» + « (part time {perc}%)» se perc < 100; errore «Sotto il minimo del livello (€ {min})» |
| `ctr_decorrenza` | «Decorrenza» | DatePickerField | — |
| `ctr_scadenza` | «Fine rapporto» | DatePickerField, **solo se** la tipologia ha `conScadenza` | hint «Durata massima {n} mesi» se la tipologia ha `durataMaxMesi`; errore «Oltre la durata massima di {n} mesi» |
| `ctr_prova` | «Periodo di prova (giorni)» | InputField `type="number"` `min=0`, **nascosto solo se** la tipologia ha `periodoProva === false` | hint «Dal livello: {provaGiorni} giorni» se c'è un livello |

**Blocco spettanze** `.crea-anag__spett` (se c'è un CCNL selezionato):
- Testata: titolo `fa-light fa-scale-balanced` + «Inquadramento e spettanze annue»; a destra testo `.crea-anag__spett-perc`: con orario «{nome orario} · part time {perc}%» oppure «{nome orario} · full time»; senza orario «Nessun orario: calcolo su full time».
- Lista `<dl>` (dt/dd), in quest'ordine:
  | dt | dd |
  |---|---|
  | «Categoria» | categoria del livello o «—» |
  | «Ferie» | «{ferieGiorni} gg/anno» |
  | «Permessi ROL» | «{rolOre} h/anno» |
  | «Ex festività» | «{exFestivitaOre} h/anno» |
  | «Maturazione» | se mensile «{ferieMese} gg + {permessiMeseOre} h al mese» (numeri con il punto decimale, es. «2.17 gg + 8.67 h al mese»); altrimenti la label della maturazione: «Annuale, a inizio anno» o «Per ora lavorata» |
  | «Mensilità» | numero (es. «14») |
  | «Preavviso» | «{preavvisoGiorni} giorni» o «—» |
  | «Scatti di anzianità» | «{scattiNumero} ogni {scattiCadenzaAnni} anni» + « · € {importo scatto}» se c'è il livello (es. «6 ogni 4 anni · € 38») |
  | «Fondi» | fondo sanitario, previdenza complementare, ente bilaterale non vuoti uniti da « · » (es. «Fondo FAST · Fon.Te. · EBNT»), altrimenti «—»; in `TruncatedText` (ellissi + tooltip) |

Senza CCNL selezionato al suo posto: `<p class="crea-anag__hint">` «Nessun CCNL configurato. » + link-pulsante `.crea-anag__link` «Configuralo in Human Resources › Configurazione» → `hr-configurazione:hr-ccnl`. (Il testo compare anche quando i CCNL esistono ma l'utente ha scelto «Seleziona».)

**Riga PDF** `.crea-anag__ctr-pdf`:
- Sinistra: «Contratto (PDF)» + badge: `fa-solid fa-circle-check` «Caricato» (verde) oppure `fa-solid fa-triangle-exclamation` «Da caricare» (arancio, icona lampeggiante).
- Destra: se c'è un PDF, chip file `.crea-anag__doc-file` con `fa-light fa-file-pdf`, nome (ellissi, `title` = nome), pulsante icona `fa-light fa-eye` `title="Visualizza"` e `fa-light fa-trash-can` `title="Rimuovi"`; poi pulsante `.sib-btn--secondary.sib-btn--sm` `fa-light fa-folder-open` + «Carica PDF» / «Sostituisci PDF». Input nascosto `accept="application/pdf"`.

**Pulsante aggiunta** `.crea-anag__ctr-add` (allineato a destra, `margin-top: 16px`): `.sib-btn--primary` `fa-light fa-circle-plus` + «Aggiungi variazione contrattuale».

**Storico** (visibile solo con lo storico aperto) `.crea-anag__ctr-storico`:
- Titolo `<h4>` `fa-light fa-clock-rotate-left` + «Storico contrattuale».
- Vuoto: «Nessun contratto registrato per questo profilo.»
- Altrimenti lista, dalla più recente; per ogni riga:
  - solo sulla prima, lo stato «Vigente»: icona `fa-solid fa-circle-check` + testo «Vigente», verde `--color-success` (nessuno sfondo, nessuna pillola; stesso aspetto della modale Contratto dell'Archivio);
  - tipologia (grassetto);
  - meta: «{ruolo o —}» + « · {livello} livello» + « · {ccnl}» + « · {reparto}» + « · RAL € {ral o —}» + « · dal {gg/mm/aaaa o —}» + « al {gg/mm/aaaa}» se c'è la scadenza. Esempio: «Direttore di struttura · Q.A livello · CCNL Turismo – Aziende alberghiere · Direzione · RAL € 52.000 · dal 01/01/2026».
  - azioni: chip `fa-light fa-file-pdf` + nome PDF (`title` = nome, max 220px ellissi) se presente; pulsante icona `fa-light fa-eye` `title="Visualizza PDF"` solo se il PDF ha contenuto (data URL); pulsante icona `fa-light fa-trash-can` `title="Elimina variazione"`.

### 4.8 App Op! (componente condiviso `OpAccessoAnagrafica`, variante dipendente)
Props passate: `anagraficaId` = chiave del dipendente (vedi §6), `persona` = nome/cognome del form, `email` = `email_aziendale` del form (bidirezionale), `abil` = abilitazione locale, `repartiSuggeriti` = reparto App Op! associato al reparto HR scelto (`repartoOp`), nessun `repartiConsentiti`, `esterno = false`.

- ToggleSwitch «Abilita l’accesso all’App Op!», descrizione «Il dipendente riceve all’email aziendale il token di invito con cui attiva l’app come dipendente dell’azienda.»
- Con toggle acceso, corpo `.op-acc__body`:
  - se i dati arrivano dalla copia di prova: AlertBanner `warning` «Dati di prova salvati in questo browser: il Portal non espone ancora le API dell’App Op!, l’invito non parte davvero per email.»
  - eventuale errore `.op-acc__error` (`fa-light fa-circle-exclamation` + messaggio).
  - Griglia `.op-acc__grid` a 3 colonne:
    - InputField «E-mail aziendale» `type="email"` `required`, placeholder «nome.cognome@azienda.it», `iconLeft="fa-light fa-envelope"`, errore «Email non valida» se compilata e non valida.
    - SelectField «Grado nell’app»: «Impiegato» (`impiegato`), «Responsabile» (`responsabile`), «Amministratore» (`amministratore`).
    - Colonna `.op-acc__flags` con due ToggleSwitch: «Responsabile dei suoi reparti», «Accesso alle funzioni HR».
  - Reparti: label «Reparti dell’app»; checkbox (in quest'ordine) «Pulizie», «Manutenzione», «Magazzino», «Front Office», «Food & Beverage», «Risorse umane», «Purchasing» (Business Intelligence esclusa).
  - Barra `.op-acc__bar` (bordo superiore): testo di stato + pulsante.
    - Stato (il primo che si applica):
      1. utenza attiva: `fa-solid fa-circle-check` (verde) «Accesso attivo nell’App Op!» + « · ultimo accesso {gg/mm/aaaa}» se noto;
      2. utenza bloccata: `fa-solid fa-lock` (rosso) «Accesso bloccato in Utenti e ruoli»;
      3. invito già inviato: `fa-solid fa-paper-plane` (primary) «Invito inviato a {email mascherata} il {gg/mm/aaaa} · valido fino al {gg/mm/aaaa}»;
      4. altrimenti `fa-light fa-envelope` (primary) «Nessun invito inviato».
    - Pulsante `.sib-btn--primary` `fa-light fa-paper-plane` + «Invia token di invito» (prima volta) / «Invia nuovo token» (se esiste un invito o un'utenza) / «Invio in corso…» durante l'invio; `title="Il dipendente riceve il codice per email"`.
- Modale `OpInvitoModal` (size `sm`), titolo «Invito per {nome cognome}»:
  - «L’invito è partito per email a **{email mascherata}**. Il dipendente installa l’app Op!, sceglie «Accesso con invito» e inserisce il codice:»
  - codice grande (es. `ABCD-EFGH-JKLM-NPQR`);
  - «Valido fino al {gg/mm/aaaa}. Un nuovo invito annulla questo.»
  - pulsanti: secondario con icona `copy` «Copia il codice», primario «Fatto».

### 4.9 Documenti e allegati
**Quattro righe fisse** (`DocSlot`), in quest'ordine: «Documento d'identità», «Codice fiscale / Tessera sanitaria», «Informativa privacy», «Formazione sicurezza». (Il contratto di lavoro **non** è qui: vive nella sezione Contratto.)

Per ogni riga `.crea-anag__doc-row`:
- Sinistra: titolo + badge `fa-solid fa-circle-check` «Caricato» (verde) o `fa-solid fa-triangle-exclamation` «Mancante» (arancio, icona lampeggiante).
- Destra: se presente, chip file con miniatura immagine 40×30 (se il file è un'immagine) o `fa-light fa-file-lines`, nome (max 180px, ellissi, `title` = nome) e tre pulsanti icona: `fa-light fa-eye` «Visualizza», `fa-light fa-print` «Stampa», `fa-light fa-trash-can` «Elimina» (testi nel `title`). Sempre presenti tre pulsanti `.sib-btn--secondary.sib-btn--sm`:
  - `fa-light fa-scanner-image` «Scanner» (`title` «Scanner» / «Sostituisci da scanner»);
  - `fa-light fa-folder-open` «File» (`title` «File» / «Sostituisci da file»);
  - `fa-light fa-camera` «Foto» (`title` «Fotocamera» / «Sostituisci da fotocamera»).
  - «Scanner» e «File» aprono lo stesso input `accept="image/*,application/pdf"`; «Foto» apre un input `accept="image/*" capture="environment"` (fotocamera posteriore su mobile).

**Altri allegati** `.crea-anag__doc-altri` (`margin-top: 14px`):
- Label `.crea-anag__label` «Documentazione contrattuale / altri allegati».
- Pulsante `.sib-btn--secondary` `fa-light fa-circle-plus` + «Aggiungi documenti» (input `accept="application/pdf,image/*"` `multiple`).
- Lista: `fa-light fa-file-lines` + nome; pulsanti icona «Visualizza» (`fa-light fa-eye`), «Stampa» (`fa-light fa-print`), «Elimina» (`fa-light fa-trash-can`).

### 4.10 Barra azioni finale
- `.sib-btn--ghost` «Annulla».
- `.sib-btn--primary` «Salva» (durante il salvataggio «Salvataggio…» e disabilitato).

## 5. Stati e interazioni

### 5.1 Stato iniziale
- **Creazione**: tutti i campi vuoti tranne `nazionalita = ITALIA`; nessuna foto; `email_aziendale` = email dell'abilitazione App Op! (vuota); reparto/orario/schema = quelli del contratto vigente (nessuno). Chiave dipendente **provvisoria** `nuovo-{ms}`, sostituita dall'id definitivo al salvataggio (§6.3).
- **Modifica**: precompila da `getEditingAnagrafica()` tutti i campi che l'Archivio conosce: `nome`, `cognome`, `data_nascita`, `sesso`, `codice_fiscale`, `email`, `telefono`, `contatto_emergenza`, `indirizzo`, `indirizzo2`, `cap`, `provincia`, `nazionalita` (vedi §6.2), `strutture`, la **foto** (`avatarUrl`) e i **nomi** dei documenti (i quattro slot + altri). `email_aziendale` = email dell'abilitazione App Op! o, se manca, quella dell'anagrafica. Reparto/orario/schema vengono dal contratto vigente del dipendente. I dati di esempio non hanno sesso, indirizzo 2, strutture né foto: quei campi restano vuoti finché non si salvano. Se la pagina viene ricaricata in modifica, il dato in memoria è perso: la scheda è vuota (il titolo resta «Modifica anagrafica personale») e «Salva» la tratta come una **nuova** anagrafica (Insert), non come una modifica senza id.
- **Contratto**: `ccnlId` = CCNL del contratto vigente, altrimenti il **primo** CCNL configurato (quindi il blocco spettanze è visibile da subito); `ruolo`, `livelloId`, `tipologiaId` dal vigente; RAL, decorrenza, scadenza, prova, note vuoti; PDF assente; storico chiuso.
- **App Op!**: abilitazione salvata per la chiave dipendente, altrimenti `{ abilitato: false, emailAziendale: '', livello: 'impiegato', reparti: [], responsabile: false, hr: false }`.

### 5.2 Sezioni comprimibili
- Clic sull'header (icona + titolo + chevron) → apre/chiude; `aria-expanded` aggiornato; chevron ruota con transizione 0.15s. Il corpo chiuso non è nel DOM (i valori restano nello stato del componente).
- Clic sulle azioni a destra dell'header **non** apre/chiude la sezione.

### 5.3 Foto
- Scelto un **avatar** nell'AvatarPicker → la scheda tiene l'id (es. `avatar-05`).
- Caricata una **foto** (AvatarPicker o «Scatta foto») → l'immagine viene ridotta a un riquadro di **320 px** sul lato lungo e salvata come JPEG qualità 0,85 (data URL `data:image/jpeg;base64,…`), così resta leggera anche se arriva dalla fotocamera. «Scatta foto» con un file che non è un'immagine → toast error titolo «Foto», testo «Seleziona un file immagine.».
- La miniatura mostra subito la scelta. La foto entra nell'anagrafica **con «Salva»** (campo `avatarUrl` del corpo, §6.1); «Annulla» la scarta.

### 5.4 Contratto
- Cambio CCNL → azzera livello e periodo di prova. Cambio livello → azzera periodo di prova (che torna al valore suggerito dal livello).
- Il campo «Periodo di prova» mostra il valore digitato o, se vuoto, il valore calcolato `provaGiorni` (vuoto se 0).
- RAL: l'errore «Sotto il minimo…» compare in tempo reale quando RAL compilata < RAL minima.
- Fine rapporto: errore in tempo reale quando i mesi tra decorrenza e fine superano `durataMaxMesi`.
- **Carica PDF** → file letto come data URL; badge diventa «Caricato». «Rimuovi» lo toglie (senza conferma: è un file non ancora salvato).
- **Aggiungi variazione contrattuale** — validazioni in ordine, la prima che fallisce imposta l'errore di sezione:
  1. CCNL o livello mancanti → «Seleziona CCNL e livello di inquadramento.»
  2. Tipologia mancante → «Seleziona la tipologia del contratto.»
  3. Tipologia con scadenza e fine rapporto vuota → «Il contratto «{nome tipologia}» richiede la data di fine rapporto.»
  4. PDF mancante → «Carica il PDF del contratto.»
  - Nota: RAL sotto il minimo e durata oltre il massimo **non bloccano** l'aggiunta (sono solo errori visivi sul campo).
  - Esito: azzera l'errore, crea il record (vedi §6.3), reimposta i campi mantenendo CCNL, livello, tipologia e ruolo appena usati (RAL, decorrenza, scadenza, prova, note e nome impiegato tornano ai valori iniziali), svuota il PDF e **apre lo storico**. Nessun toast.
- **Storico**: pulsante a toggle. **Elimina variazione** → ConfirmDialog con titolo predefinito «Conferma eliminazione», messaggio «Eliminare questa variazione contrattuale dallo storico?», pulsanti «Annulla» / «Elimina» (stile distruttivo). Confermato → record rimosso; la riga successiva diventa «Vigente».
- «Visualizza PDF» apre il data URL in una nuova scheda.

### 5.5 App Op!
- Accendere il toggle: se i reparti selezionati sono vuoti e c'è un reparto suggerito (dal reparto HR) lo preseleziona.
- All'accensione e a ogni cambio di struttura o dopo un invito, legge lo stato dell'utenza (vedi §7) e aggiorna banner e testo di stato.
- Pulsante invio **disabilitato** se: invio in corso, email non valida, nessun reparto selezionato, utenza già attiva.
- Clic **Invia token** → validazioni del servizio, nell'ordine:
  - email non valida → «Inserisci un’email aziendale valida: è lì che arriva il token di invito.»
  - nome o cognome vuoti → «Nome e cognome del dipendente sono obbligatori.»
  - nessun reparto → «Scegli almeno un reparto dell’App Op!.»
  - nessun codice restituito → «L’App Op! non ha restituito il codice di invito.»
  - altro errore senza messaggio → «Invito non inviato.»
  - L'errore appare in `.op-acc__error`.
  - Successo: toast success titolo «App Op!», testo «Token di invito inviato a {email mascherata}»; apre la modale con il codice; l'abilitazione viene **salvata subito** (con `abilitato: true`, id utenza, ultimo invito) anche senza premere «Salva».
- Modale invito: «Copia il codice» → copia negli appunti; toast success «Codice copiato.» (titolo «Invito App Op!»), in caso di errore toast warning «Copia non riuscita: seleziona il codice a mano.» (titolo «Invito App Op!»). «Fatto», ✕ o Esc chiudono.

### 5.6 Documenti
- Scelto un file: le immagini vengono lette come data URL (miniatura, Visualizza e Stampa funzionanti); i PDF e gli altri file salvano **solo il nome** (Visualizza e Stampa non fanno nulla).
- Stampa: apre una finestra con `<img src=… style="max-width:100%">` e lancia `print()` al caricamento.
- Elimina documento: immediata, **senza conferma** (comportamento attuale; il file non è ancora salvato sul server). Per la riproduzione fedele mantenere; se il backend persiste i documenti, la cancellazione di un documento già salvato deve passare da ConfirmDialog (standard piattaforma).
- Al salvataggio viaggiano solo i **nomi** dei file (`documenti` del corpo, §6.1), che l'Archivio usa per il fascicolo; il contenuto dei file resta nella scheda aperta (upload: API di §7).

### 5.7 Salva
1. Se `nome` o `cognome` vuoti → errore di pagina «Nome e cognome sono obbligatori» (senza punto finale), nessuna navigazione.
2. Altrimenti `pending = true` (pulsante «Salvataggio…», disabilitato) e chiamata `POST /Sibylla/anagrafica-personale/Insert` (creazione) o `POST /Sibylla/anagrafica-personale/Update` (modifica, **con `id`**) con il corpo di §6.1.
3. Esito della chiamata:
   - **Backend non raggiungibile** (rete assente, Portal non configurato, risposta 404, 501, 502, 503, 504, oppure 401 senza alcun token di sessione, cioè la demo senza login) → si prosegue in **modalità demo**: la scheda si salva nella copia locale del browser (§6.5) e, in creazione, riceve il primo id numerico libero (dopo i dati di esempio, le schede locali e quelle eliminate: con i dati di esempio è **91**).
   - **Qualsiasi altro errore** (400, 409, 422, 500, 401 con sessione…) → `pending = false`, toast **error** titolo «Anagrafica non salvata», testo «Il salvataggio non è riuscito. {dettaglio}», dove il dettaglio è il campo `error` / `message` / `detail` / `title` del corpo della risposta o il testo semplice (se assente o più lungo di 300 caratteri: «Il salvataggio non è riuscito. (errore {status})»). Si **resta sulla scheda** con i dati inseriti; contratti e abilitazione non vengono toccati.
   - **Successo**: in modifica l'id è quello del dipendente; in creazione è l'`id` (o `Id`) restituito dall'Insert. Se l'Insert risponde senza id → toast error «Anagrafica non salvata», testo «Il server non ha restituito il codice del nuovo dipendente: contratti e accesso all’App Op! non sono stati collegati. Riprova o contatta l’assistenza.», si resta sulla scheda.
4. Se esiste un contratto vigente per la chiave della scheda, gli aggiorna `repartoId`, `reparto` (nome), `orarioId`, `schemaTurniId` con i valori della sezione Inquadramento (l'inquadramento operativo vive sul contratto vigente).
5. **Riassegnazione all'id definitivo**: tutti i contratti con `anagraficaId` = chiave provvisoria `nuovo-…` passano all'id definitivo (`riassegnaAnagrafica`), così l'Archivio li ritrova (contatore del PDF, reparto, fascicolo). L'abilitazione App Op! si salva sotto l'id definitivo = abilitazione già salvata per l'id ∪ quella salvata sotto la chiave provvisoria (es. dopo un invito) ∪ stato locale, con `emailAziendale` = campo «E-mail aziendale»; la voce sotto la chiave provvisoria viene tolta. L'invito **non** parte al salvataggio.
6. Solo in modalità demo: scrive la scheda nella copia locale (§6.5) con i campi del form, `nato_il` in gg/mm/aaaa, `nazione` «ITA» per Italia (altrimenti il nome del paese), foto e nomi dei documenti.
7. `pending = false`, toast **success** titolo «Anagrafica salvata», testo «{Nome Cognome} è nell’Archivio del personale.» oppure, in demo, «{Nome Cognome}: backend non raggiungibile, la scheda è salvata in questo browser (dati della demo).»; azzera l'anagrafica in modifica e naviga a `archivio-personale`.

### 5.8 Annulla / Indietro
Azzerano l'anagrafica in modifica e vanno a `archivio-personale`, senza conferma e senza salvare.

### 5.9 Caricamento, vuoti, errori
- Nessuno skeleton: la pagina è subito interattiva.
- Stato vuoto storico: «Nessun contratto registrato per questo profilo.»
- Errori del salvataggio: toast error «Anagrafica non salvata» e nessuna navigazione; backend non raggiungibile: salvataggio nella copia locale della demo con toast success che lo dichiara (vedi 5.7).

## 6. Dati e regole di business

### 6.1 Form anagrafica (corpo di Insert/Update)
```ts
{
  id?: number | string /* solo in Update: id del dipendente */;
  nome: string; cognome: string; data_nascita: string /* yyyy-mm-dd */; sesso: '' | 'M' | 'F' | 'A';
  codice_fiscale: string; email: string; email_aziendale: string; telefono: string; contatto_emergenza: string;
  indirizzo: string; indirizzo2: string; cap: string; provincia: string; nazionalita: string /* 'ITALIA'… */;
  strutture: string /* una struttura */;
  repartoId: string; orarioId: string; schemaTurniId: string;
  avatarUrl: string | null /* id avatar 'avatar-05' o foto 'data:image/jpeg;base64,…' (max 320 px), null se assente */;
  documenti: { identita?: string; codiceFiscale?: string; privacy?: string; sicurezza?: string; altri: string[] } /* nomi file */;
}
```
I file dei documenti non viaggiano in questo corpo (solo i nomi): l'upload è un'API a parte (§7).

### 6.2 Passaggio dell'anagrafica in modifica (`_state.ts`)
Variabile di modulo (non persistita, non context): `setEditingAnagrafica(a)`, `getEditingAnagrafica()`, `clearEditingAnagrafica()`.
```ts
interface EditingAnagrafica {
  id?: number | string; matricola?; nome?; cognome?; data_nascita? /* ISO */; sesso?; codice_fiscale?;
  email?; email_aziendale?; telefono?; contatto_emergenza?; indirizzo?; indirizzo2?; cap?; provincia?; nazionalita?;
  strutture?; avatarUrl? /* id avatar o data URL */;
  documenti?: { identita?; codiceFiscale?; contratto?; privacy?; sicurezza?; altri?: string[] } // nomi file
}
```
L'Archivio la imposta convertendo `nato_il` da `gg/mm/aaaa` a ISO; `nazionalita` = «ITALIA» se `nazione` è vuota, «IT» o «ITA» (maiuscole o minuscole), altrimenti `nazione` in maiuscolo (le schede salvate in demo portano già il nome del paese).

### 6.3 Chiave del dipendente e contratti
- `anagId` = `String(initial.id)` in modifica; in creazione `nuovo-{Math.round(performance.now())}` (chiave provvisoria). I contratti aggiunti e l'eventuale abilitazione App Op! creata da un invito prima del salvataggio usano questa chiave; al «Salva» riuscito vengono **ricollegati all'id definitivo** (§5.7 punto 5: `useContrattiPersonaleStore.riassegnaAnagrafica(da, a)`, `useAnagraficaOpStore.set(id)` + `rimuovi(chiave provvisoria)`). Uscendo con «Annulla» o «Indietro» restano sotto la chiave provvisoria e non compaiono nell'Archivio.
- **Record contratto** (`ContrattoPersonale`, store `useContrattiPersonaleStore`):
  ```ts
  { id: string /* 'ctr-{ms}-{rand}' */; anagraficaId: string; nomeImpiegato: string; ruolo: string; livello?: string /* codice, es. 'Q.A' */;
    tipologia: string /* nome */; ral: string /* testo '28.000' */; decorrenza?: string; scadenza?: string; note?: string;
    ccnlId?; ccnl? /* nome al momento della firma */; livelloId?; tipologiaId?; repartoId?; reparto?; orarioId?; schemaTurniId?;
    partTimePerc?: number; provaGiorni?: number; ferieGiorni?: number; rolOre?: number; exFestivitaOre?: number;
    pdfName?: string; pdfDataUrl?: string; createdAt: string /* ISO */ }
  ```
- Valori scritti da «Aggiungi variazione»: `nomeImpiegato` = campo o default «nome cognome»; `ral` = campo o, se vuoto, RAL minima formattata; `scadenza` solo per tipologie con scadenza; reparto/orario/schema dalla sezione Inquadramento al momento dell'aggiunta; `partTimePerc`, `provaGiorni`, spettanze calcolate (sotto).
- **Ordinamento storico**: decrescente per `decorrenza ?? createdAt` (confronto lessicografico di stringhe ISO). Il primo è il **vigente**.

### 6.4 Formule (Configurazione HR)
- `oreSettimanaliOrario(o)` = `o.aTurni ? o.oreSettimanali : round2(Σ giorni attivi (Σ durata fasce − pausaMin) / 60)`; durata fascia in minuti, con attraversamento della mezzanotte (`d<0 → d+1440`).
- `giorniLavorativiOrario(o)` = `o.aTurni ? o.giorniSettimana : numero di giorni attivi`.
- `perc` (part time) = `min(100, round(oreSettimanaliOrario / ccnl.oreSettimanaliPieno × 100))`; 100 se manca l'orario o il CCNL.
- `spettanzeAnnue(ccnl, perc)`: `k = ccnl.riproporzionaPartTime ? perc/100 : 1`; `ferie = round1(ccnl.ferieGiorni × k)`, `rol = round1(ccnl.rolOre × k)`, `ex = round1(ccnl.exFestivitaOre × k)`; `ferieMese = round2(ferie / 12)`; `permessiMeseOre = round2((rol + ex) / 12)`.
- `ralMinima = round(livello.minimoMensile × ccnl.mensilita × perc / 100)`; formattata con `toLocaleString('it-IT', { maximumFractionDigits: 0 })` (es. 25.060).
- `parseEuro(v)` = rimuove i punti, virgola → punto, `Number`, 0 se non numerico. `ralSotto = ralMin > 0 && ral ≠ '' && parseEuro(ral) < ralMin`.
- `provaGiorni` = campo se compilato; altrimenti 0 se `tipologia.periodoProva === false`; altrimenti `livello.provaGiorni` (0 senza livello).
- `mesiTra(da, a)` = `(anno2−anno1)×12 + (mese2−mese1) + (giorno2 ≥ giorno1 ? 0 : −1)`; `oltreDurata = durataMaxMesi && da && a && mesiTra > durataMaxMesi`.
- Esempi con i seed: CCNL Turismo, livello 2°, orario «Full time 40 h · 5 giorni» → perc 100, RAL minima 1.790×14 = **25.060**, ferie 26 gg, ROL 72 h, ex fest. 32 h, maturazione «2.17 gg + 8.67 h al mese». Con «Part time 30 h orizzontale» → perc **75**, ferie 19.5, ROL 54, ex fest. 24, RAL minima 18.795.
- Email valida: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` sul valore trim.

### 6.5 Dati demo/seed usati
- **Configurazione HR** (`sibylla.hr-config`, persist v7) — dettagli in `01-modello-dati-e-api.md`. Valori rilevanti qui:
  - Reparti (8): Front office (resp. Piero Aragona, App Op! frontOffice), F&B (Andrea Grimaudo, foodBeverage), Housekeeping (Marco Campo, pulizie), Manutenzione (—, manutenzione), Cucina (—, foodBeverage), Amministrazione (Ruggero Novi, risorseUmane), Direzione (Piero Aragona, nessuno), Marketing (disattivo).
  - Orari (6): «Full time 40 h · 5 giorni», «Full time 40 h · 6 giorni», «Full time 40 h · sabato mattina», «Turnista 40 h · 6 giorni» (a turni), «Part time 30 h orizzontale», «Part time 24 h verticale».
  - Turni: M Mattina, P Pomeriggio, N Notte, S Spezzato, C Centrale. Schemi: «Ciclo continuo 3 turni» (M M P P N N R R), «Rotazione 6+1 M/P», «Centrale 5+2» (C C C C C R R).
  - Tipologie (8, tutte attive): Tempo indeterminato; Tempo determinato (scadenza, max 24 mesi); Stagionale (scadenza, max 8); Apprendistato professionalizzante (max 36, senza scadenza); Intermittente (a chiamata) (senza prova); Somministrazione (scadenza, max 24, senza prova); Collaborazione (Co.co.co.) (scadenza, senza prova); Tirocinio / Stage (scadenza, max 6, senza prova).
  - CCNL (2): «CCNL Turismo – Aziende alberghiere» (40 h, 14 mensilità, ferie 26, ROL 72, ex fest. 32, mensile, scatti 6 ogni 4 anni, Fondo FAST / Fon.Te. / EBNT, 10 livelli da Q.A a 7°), «CCNL Pubblici esercizi» (6 livelli).
- **Contratti** (`sibylla.contratti-personale`, persist **v2**; la migrazione riallinea i record seed `ctr-seed-*` e conserva quelli dell'utente): 6 record — dipendente 66 Piero Aragona (2: Direttore di struttura Q.A 52.000 dal 2026-01-01; Vice direttore Q.B 44.000 dal 2023-03-01), 67 Ruggero Novi (Responsabile amministrativo 2°, 29.000), 69 Andrea Grimaudo (Maître 2°, 27.500, a turni sch-61), 88 Andrea G Test (Cameriera ai piani 6°S, Stagionale 2026-04-01→2026-10-31, part time 75%), 89 Marco Campo (Addetto ricevimento 4°, Stagionale 2026-04-15→2026-11-15). I seed hanno solo `pdfName` (nessun data URL).
- **Anagrafiche salvate in demo** (`sibylla.anagrafiche-personale`, store `useAnagrafichePersonaleStore`, persist **v1**): `{ anagrafiche: Record<id, AnagraficaLocale>, eliminati: string[] }`. Scritto solo quando il backend non è raggiungibile; `AnagraficaLocale` ha i campi di una riga dell'Archivio (`id`, `matricola`, `nome`, `cognome`, `sesso`, `telefono`, `email`, `email_aziendale`, `contatto_emergenza`, `nato_il` gg/mm/aaaa, `codice_fiscale`, `indirizzo`, `indirizzo2`, `cap`, `provincia`, `nazione`, `strutture`, `avatarUrl`, `documenti`) più `aggiornatoIl` (ISO). Salvare una scheda la toglie da `eliminati`. L'Archivio la sovrappone ai dati di esempio (vedi `05-archivio-personale.md` §5.1).
- **Abilitazioni App Op!** (`sibylla.anagrafica-op`, persist **v2**; azioni `set`, `patch`, `sposta`, `rimuovi`): `66` abilitato (p.aragona@hotelnoto.it, amministratore, Front Office + Risorse umane, responsabile, HR), `89` abilitato (m.campo@hotelnoto.it, impiegato, Front Office); più due collaboratori esterni (`est-ce-1`, `est-ce-2`).
- **Ruoli**: store non persistito `useRuoliStore` (seed «Operation», «Prova», «Prova», «Ruoloooo»).
- Copia di prova App Op! nel browser: chiave `sibylla-app-op-prova`.

## 7. Backend da realizzare

Convenzione: chiamate attraverso il proxy `/Sibylla/{path}` (vedi `01-modello-dati-e-api.md`). Le prime due esistono già lato frontend; le altre sostituiscono gli store mock.

| Azione FE | Metodo e percorso | Note |
|---|---|---|
| Crea anagrafica | `POST /Sibylla/anagrafica-personale/Insert` | già chiamato, corpo §6.1 (con `avatarUrl` e nomi dei documenti). **Deve** restituire `{ id }` (o `{ Id }`): senza id il FE mostra l'errore di §5.7 e non collega contratti e App Op! |
| Aggiorna anagrafica | `POST /Sibylla/anagrafica-personale/Update` | già chiamato, corpo §6.1 **con `id`** |
| Leggi anagrafica per la modifica | `GET /Sibylla/hr/anagrafiche/{id}` | da introdurre per sostituire `_state` (deep link `modifica-anagrafica:{id}` consigliato) |
| Elenco contratti di un dipendente | `GET /Sibylla/hr/anagrafiche/{id}/contratti` | ordinati per decorrenza desc |
| Aggiungi variazione | `POST /Sibylla/hr/anagrafiche/{id}/contratti` (multipart: JSON + PDF) | transazionale; calcola lato server perc, RAL minima, spettanze con le stesse formule §6.4 |
| Aggiorna inquadramento del vigente | `PATCH /Sibylla/hr/contratti/{idContratto}` | usato al Salva (reparto/orario/schema) |
| Elimina variazione | `DELETE /Sibylla/hr/contratti/{idContratto}` | dopo conferma |
| PDF contratto | `GET /Sibylla/hr/contratti/{idContratto}/pdf` | sostituisce il data URL |
| Documenti fascicolo | `PUT /Sibylla/hr/anagrafiche/{id}/documenti/{slot}` (multipart), `DELETE …/{slot}`; `POST …/documenti/altri`, `DELETE …/altri/{docId}` | slot: `identita`, `codiceFiscale`, `privacy`, `sicurezza` |
| Foto | campo `avatarUrl` di Insert/Update | id avatar o JPEG data URL ≤ 320 px (≈ 20–40 kB); va restituito da `GetAll` perché l'Archivio lo mostri. In alternativa `PUT /Sibylla/hr/anagrafiche/{id}/foto` che restituisce l'URL da salvare in `avatarUrl` |
| Abilitazione App Op! | `PUT /Sibylla/hr/anagrafiche/{id}/app-op` | corpo `AbilitazioneOp` (§6) |
| Stato utenza App Op! | `POST /Sibylla/OpApp/config/Get` | già usato (fonte `portal`); prima si tenta Op.Api `GET /admin/collegata?struttura={id}&nome={nome}` (fonte `op`); se nessuno risponde (404/≥500/rete) → copia di prova (fonte `prova`) |
| Crea utenza + invito | `POST /Sibylla/OpApp/utenti/Salva` | già usato; vedi sotto |
| Reinvia invito | `POST /Sibylla/OpApp/inviti/Invia` `{ id_utente }` | già usato |

Esempio **Aggiungi variazione**
```json
POST /Sibylla/hr/anagrafiche/88/contratti
{ "nomeImpiegato": "Andrea G Test", "ruolo": "Operation", "ccnlId": "ccnl-tur", "livelloId": "tur-6s",
  "tipologiaId": "tip-sta", "ral": "15.100", "decorrenza": "2026-04-01", "scadenza": "2026-10-31",
  "provaGiorni": 45, "repartoId": "rep-hk", "orarioId": "ora-pt30", "schemaTurniId": "sch-52", "note": "" }
+ file "pdf" (application/pdf)
→ 201 { "id": "ctr-…", "partTimePerc": 75, "ferieGiorni": 19.5, "rolOre": 54, "exFestivitaOre": 24, "ccnl": "CCNL Turismo – Aziende alberghiere",
        "livello": "6°S", "tipologia": "Stagionale", "reparto": "Housekeeping", "pdfName": "contratto.pdf", "createdAt": "2026-11-05T10:00:00Z" }
422 { "error": "Il contratto «Stagionale» richiede la data di fine rapporto." }
```
Errori 422 con gli stessi testi delle validazioni §5.4.

Errori di Insert/Update: restituire `4xx` con `{ "error": "<testo in italiano>" }` (es. `422 { "error": "Codice fiscale non valido." }`): il FE lo mostra nel toast «Anagrafica non salvata» come «Il salvataggio non è riuscito. Codice fiscale non valido.». Le risposte 404/501/502/503/504 vengono trattate come backend assente (salvataggio demo), quindi non vanno usate per errori di validazione.

**Utenza App Op!** (`OpApp/utenti/Salva`)
```json
{ "id_utente": null, "nome": "Marco", "cognome": "Campo", "email": "m.campo@hotelnoto.it", "livello": "impiegato",
  "id_reparti": [4], "responsabile_reparti": [], "hr": false, "invia_invito": true, "esclusi": [] }
→ { "success": true, "invito": { "codice": "ABCD-EFGH-JKLM-NPQR", "scade_il": "2026-11-20T10:00:00Z", "email_mascherata": "m•••••@hotelnoto.it" } }
```
Id reparti App Op!: Magazzino 1, Pulizie 2, Manutenzione 3, Front Office 4, Food & Beverage 5, Risorse umane 6, Business Intelligence 7, Purchasing 8. Se l'utenza esiste già (trovata per `opId` o per email, case insensitive) si chiama `OpApp/inviti/Invia`: un nuovo invito annulla il precedente. Codice di prova: 4 gruppi da 4 caratteri dell'alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` separati da «-», validità 15 giorni, email mascherata = prima lettera + «•••••» + dominio. L'invio genera l'**email al dipendente** (lato Op.Api/Portal); nessuna notifica nel Centro notifiche.

Transazionalità: Insert/Update anagrafica + aggiornamento inquadramento del contratto vigente + abilitazione App Op! vanno salvati nella stessa transazione. In creazione, i contratti aggiunti prima del primo salvataggio vanno creati dopo l'Insert con l'id restituito (il FE oggi li tiene in locale e li ricollega all'id definitivo, §6.3).

## 8. Stile

Token (tema chiaro → scuro): `--color-primary` `#204769` → `#6F9BCB`; `--color-primary-50` `#f2f5f6` → `#232C3A`; `--color-primary-200` `#ccd5dd` → `#8B95A3`; `--color-bg` `#F8FCFF` → `#12151B`; `--color-surface` `#FFFFFF` → `#1A1E26`; `--color-border` `#CFD4DA` → `#2B313D`; `--color-text-active` `#4A4D53` → `#E6E8EC`; `--color-text-inactive` `#6E7175` → `#9AA2AE`; `--color-success` `#007035` → `#34D399`; `--color-warning` `#F57D03` → `#F5A623`; `--color-error` `#FF616E` → `#FF6B78`; `--color-link` `#5C9CD4` → `#6BA6E0`; `--radius-md` 6px; `--font-heading` Poppins. Nessun override specifico della pagina per `[data-theme=dark]`: cambia solo il valore dei token (in dark gli `h3` primari diventano `--color-text-active` per la regola globale della skin).

| Classe | Valori |
|---|---|
| `.crea-anag__section-head i` | colore `--color-primary`, 15px |
| `.crea-anag__section-head h3` | margin 0, Poppins (`--font-heading`), 600, 14px, `--color-primary` |
| `.crea-anag__section-chev` | `margin-left: 6px`, `font-size: 12px !important`, `color: --color-text-inactive !important`, `transition: transform .15s ease`; `.is-collapsed` → `rotate(-90deg)` |
| `.crea-anag__photo-thumb` (`<button>`) | 96×96, `padding: 0`, `border-radius: 50%`, bordo 1px `--color-border`, sfondo `--color-primary-50`, flex centrato, overflow hidden, `cursor: pointer`; hover bordo `--color-primary`; `:focus-visible` outline 2px `--color-primary` con offset 2px; `img` 100% cover; `i` 40px `--color-text-inactive` |
| `.crea-anag__photo-btns` | flex, gap 6px |
| `.crea-anag__label` | Poppins, 12px, 600, `--color-primary` |
| `.crea-anag__doc-rows` | colonna, gap 8px |
| `.crea-anag__doc-row` / `.crea-anag__ctr-pdf` / `.crea-anag__ctr-item` | flex, centrati, `space-between`, gap 12px, `flex-wrap: wrap`, bordo 1px `--color-border`, radius 10px, `padding: 10px 12px`, sfondo `--color-surface` (`ctr-pdf` anche `margin-top: 16px`) |
| `.crea-anag__doc-row-label` | colonna, gap 2px, `min-width: 200px` (`.crea-anag__ctr-pdf-label`: `min-width: 160px`) |
| `.crea-anag__doc-row-title` | 600, `--color-text-active`, 13px |
| `.crea-anag__doc-badge` | inline-flex, gap 5px, 11px, 600; `--ok` `--color-success`; `--ko` `--color-warning`, icona con animazione `crea-anag-blink` |
| `.crea-anag__doc-row-main` / `__ctr-pdf-main` | flex, gap 10px, wrap |
| `.crea-anag__doc-file` | inline-flex, gap 8px, bordo 1px `--color-border`, radius 8px, `padding: 4px 8px`, sfondo `--color-bg` |
| `.crea-anag__doc-thumb` | 40×30, cover, radius 4px |
| `.crea-anag__doc-ico` | 16px, `--color-primary` |
| `.crea-anag__doc-name` | 12px, `--color-text-active`, `max-width: 180px`, ellissi, nowrap |
| `.crea-anag__doc-ins` | inline-flex, gap 6px, wrap |
| `.crea-anag__docs` | colonna, gap 8px, `align-items: flex-start` |
| `.crea-anag__doc-list` | lista senza punti, 100%, colonna, gap 6px |
| `.crea-anag__doc-item` | flex `space-between`, gap 10px, bordo 1px, radius 8px, `padding: 6px 10px`, 13px, `--color-text-active`; azioni `__doc-item-acts` gap 4px |
| `.crea-anag__ctr-count` | inline-flex centrato, `min-width: 18px`, `height: 18px`, `padding: 0 5px`, `margin-left: 6px`, radius 9px, sfondo `--color-primary`, testo `#fff`, 11px, 700, `line-height: 1` |
| `.crea-anag__ctr-add` | `margin-top: 16px`, flex `justify-content: flex-end` |
| `.crea-anag__ctr-storico` | `margin-top: 16px`, `padding-top: 14px`, `border-top: 1px dashed --color-border` |
| `.crea-anag__ctr-storico-title` | flex, gap 8px, margine `0 0 10px`, Poppins 600 13px `--color-primary` |
| `.crea-anag__ctr-empty` | margin 0, 13px, `--color-text-inactive` |
| `.crea-anag__ctr-list` | lista, colonna, gap 8px |
| `.crea-anag__ctr-item-main` | flex, gap 10px, wrap, `min-width: 0` |
| `.crea-anag__ctr-tag` («Vigente») | inline-flex, centrato, gap 5px, colore `--color-success` (chiaro `#007035`, scuro `#34D399`) per icona e testo, 12px, 600; **nessuno sfondo, bordo o raggio** (regola piattaforma: stati come icona + testo colorato, mai pillole) |
| `.crea-anag__ctr-item-tip` | 600, `--color-text-active`, 13px |
| `.crea-anag__ctr-item-meta` | 12px, `--color-text-inactive` |
| `.crea-anag__ctr-item-acts` | inline-flex, gap 6px, `flex: none` |
| `.crea-anag__ctr-item-pdf` | inline-flex, gap 6px, `max-width: 220px`, ellissi, 12px, `--color-text-inactive`; icona `--color-primary` |
| `.crea-anag__spett` | `margin-top: 16px`, `padding: 12px 14px`, bordo 1px `--color-primary-200`, radius `--radius-md` (6px), sfondo `--color-primary-50` |
| `.crea-anag__spett-head` | flex `space-between`, gap 12px, wrap, `margin-bottom: 10px` |
| `.crea-anag__spett-title` | inline-flex, gap 8px, Poppins 13px 600 `--color-primary` |
| `.crea-anag__spett-perc` | 12px, `--color-text-inactive` |
| `.crea-anag__spett-grid` | grid `repeat(auto-fill, minmax(170px, 1fr))`, gap `10px 18px`, margin 0; celle colonna `min-width: 0`; `dt` 11px `--color-text-inactive`; `dd` margin 0, 13px, 600, `--color-text-active` |
| `.crea-anag__hint` | margine `14px 0 0`, 12.5px, `--color-text-inactive` |
| `.crea-anag__link` | senza padding/bordo/sfondo, colore `--color-link`, `font: inherit`, sottolineato, `cursor: pointer` |

**Sezione App Op! (`OpAccessoAnagrafica.sass`)**: `.op-acc` colonna; `__body` colonna gap 14px `margin-top: 14px`; `__grid` `repeat(3, minmax(0, 1fr))` gap `16px 18px`; `__flags` colonna `justify-content: flex-end` gap 8px; `__error` inline-flex gap 8px margin 0 13px `--color-error`; `__label` Poppins 12px 600 `--color-primary`; `__muted` 12.5px `--color-text-inactive`; `__reparti` colonna gap 8px; `__reparti-list` flex wrap gap `8px 22px`; `__bar` flex `space-between` gap 12px wrap `padding-top: 12px` bordo superiore 1px `--color-border`; `__stato` inline-flex gap 8px 12.5px `--color-text-inactive`; `__ok` `--color-success`; `__ko` `--color-error`; `__wait` `--color-primary`.

**Modale invito (`OpInvitoModal.sass`)**: `.op-invito` colonna gap 12px, 13px; testo e scadenza margin 0 `--color-text-active`; scadenza 12px `--color-text-inactive`; `__codice` padding 12px, bordo `1px dashed --color-border`, radius 6px, centrato, 22px, 600, `font-variant-numeric: tabular-nums`, `--color-primary`, `user-select: all`; `__azioni` flex a destra gap 8px. Modale `sm` = `max-width: 360px` (base modale in `00-fondamenta.md`).

## 9. Responsività

Nessuna container query: la pagina usa media query sul viewport.

| Soglia | Cambia |
|---|---|
| `max-width: 900px` | griglie `--3` e `--res` → 2 colonne; griglia App Op! → 1 colonna |
| `max-width: 720px` | Dati anagrafici: foto sopra i campi (`flex-direction: column`, `align-items: center`) |
| `max-width: 560px` | griglie `--3` e `--res` → 1 colonna |

- Le righe documento, PDF, storico e la barra App Op! vanno a capo (`flex-wrap`) quando non c'è spazio.
- La griglia spettanze si adatta da sola (`auto-fill`, colonne min 170px).
- Non ci sono tabelle. I nomi file troncano con ellissi (`title` nativo con il nome intero); «Fondi» usa TruncatedText con tooltip.
- Su laptop 1366 px con sidebar aperta: 3 colonne (il contenuto supera i 900 px di viewport). A 1920 px: stesse 3 colonne, più larghe.

## 10. Effetti e animazioni

- Chevron sezione: `transform .15s ease` (rotazione −90° alla chiusura). Apertura/chiusura del corpo: istantanea (smontaggio, nessuna animazione di altezza).
- Badge «Mancante» / «Da caricare»: icona con `crea-anag-blink 1s ease-in-out infinite` (opacità 1 → 0.35 a metà → 1).
- Pulsanti, campi, toggle: transizioni standard dei componenti condivisi.
- Modale invito: comparsa standard della Modal.
- `prefers-reduced-motion: reduce`: regola globale che porta animazioni e transizioni a 0.01ms e una sola iterazione (il lampeggio si ferma).
- Nessuno skeleton né spinner (solo il testo «Salvataggio…» / «Invio in corso…»).

## 11. Accessibilità

- Header di sezione: `<button type="button" aria-expanded>`; icone `aria-hidden="true"`; titolo come `<h3>`.
- I pulsanti solo icona hanno il testo nel `title` (Scatta foto, Scegli avatar o carica foto, Rimuovi foto, Visualizza, Stampa, Elimina, Rimuovi, Visualizza PDF, Elimina variazione); la miniatura foto è un pulsante con `aria-label="Scegli avatar o foto"`; l'icona di «Vigente» è `aria-hidden` (il testo dice lo stato).
- Toast di esito (successo ed errore) dal componente Toast condiviso.
- Input file nascosti (`.hidden`) attivati dai pulsanti.
- Campi con label associate (componenti condivisi); errori e hint sotto il campo.
- Modale invito: Esc e clic sul fondale chiudono; il codice è selezionabile in un solo clic (`user-select: all`).
- ConfirmDialog: Esc = annulla.
- Nessuna scorciatoia da tastiera specifica; Invio nei campi non salva (non c'è un `<form>`).

## 12. Criteri di accettazione

1. Da sidenav Human Resources › Gestione delle anagrafiche › «Crea anagrafica personale» si apre la pagina con titolo «Crea anagrafica personale» e il sottotitolo esatto di §4.1.
2. Le sezioni sono, nell'ordine: Dati anagrafici, Contatti, Residenza, Inquadramento e turni, Contratto, (App Op!), Documenti e allegati; tutte aperte; cliccando l'header il corpo sparisce, il chevron ruota di −90° in 150 ms e il bordo inferiore dell'header scompare.
3. Con il modulo `app-op` non attivo la sezione «App Op!» non c'è.
4. Premendo «Salva» con nome o cognome vuoti compare sotto l'header «Nome e cognome sono obbligatori» in rosso e non si cambia pagina; con entrambi compilati e backend raggiungibile si torna all'Archivio del personale con il toast «Anagrafica salvata» / «{Nome Cognome} è nell’Archivio del personale.».
5. «Nazionalità» ha 10 opzioni con la bandiera davanti e parte da «🇮🇹 ITALIA».
6. Scegliendo il reparto «Front office» compare l'hint «Responsabile: Piero Aragona»; «Marketing» non è tra le opzioni.
7. Scegliendo l'orario «Full time 40 h · 5 giorni» l'hint è «40 h su 5 giorni»; con «Turnista 40 h · 6 giorni» è «40 h su 6 giorni · a turni» e lo schema vuoto mostra «Orario a turni: scegli la rotazione»; con lo schema «Ciclo continuo 3 turni» l'hint è «M · M · P · P · N · N · R · R».
8. Nella sezione Contratto, all'apertura il CCNL è «CCNL Turismo – Aziende alberghiere» e il blocco «Inquadramento e spettanze annue» mostra Ferie «26 gg/anno», Permessi ROL «72 h/anno», Ex festività «32 h/anno», Mensilità «14», Fondi «Fondo FAST · Fon.Te. · EBNT».
9. Il «Livello» è disabilitato con «Scegli prima il CCNL» se il CCNL è «Seleziona»; scegliendo livello 2° e orario full time, il placeholder RAL è «25.060» e l'hint «Minimo da CCNL: € 25.060»; con l'orario «Part time 30 h orizzontale» l'hint aggiunge « (part time 75%)» e le ferie diventano 19.5.
10. Inserendo una RAL «20.000» con livello 2° full time compare l'errore «Sotto il minimo del livello (€ 25.060)», ma l'aggiunta della variazione non viene bloccata da questo.
11. Con tipologia «Stagionale» compare «Fine rapporto» con hint «Durata massima 8 mesi»; decorrenza 01/01 e fine 30/11 dello stesso anno → errore «Oltre la durata massima di 8 mesi». Con «Intermittente (a chiamata)» il campo «Periodo di prova (giorni)» sparisce.
12. «Aggiungi variazione contrattuale» senza PDF mostra «Carica il PDF del contratto.»; con tutti i dati aggiunge la riga in cima allo storico con lo stato «Vigente» reso come icona `circle-check` + testo verde `--color-success`, **senza sfondo**, apre lo storico e il contatore del pulsante «Storico» aumenta di 1.
13. Il cestino di una variazione apre la conferma «Eliminare questa variazione contrattuale dallo storico?»; confermando la riga sparisce.
14. Nella sezione App Op!, con il toggle acceso e reparto HR «Housekeeping», è preselezionato «Pulizie»; con email «abc» compare «Email non valida» e il pulsante «Invia token di invito» è disabilitato.
15. Inviando il token con i dati di prova compare il toast «Token di invito inviato a m•••••@…» e la modale «Invito per …» con un codice in 4 gruppi da 4; dopo la chiusura lo stato dice «Invito inviato a … il … · valido fino al …» e il pulsante diventa «Invia nuovo token».
16. Ogni riga documento parte con «Mancante» arancio con icona lampeggiante (1 s); caricando un'immagine diventa «Caricato» verde con miniatura 40×30 e i pulsanti Visualizza/Stampa/Elimina.
17. Sotto 900 px le griglie diventano a 2 colonne, sotto 560 px a 1; sotto 720 px la foto va sopra i campi; la griglia App Op! è a 1 colonna sotto 900 px.
18. In tema scuro sfondi, bordi e testi seguono i token (superficie `#1A1E26`, bordo `#2B313D`, header di sezione `#12151B`) senza colori chiari residui.
19. Da Archivio › matita su «Piero Aragona» si apre «Modifica anagrafica personale» con nome, cognome, data di nascita (12/03/1959), codice fiscale, e-mail personale (p.aragona@hotelnoto.it), telefono, contatto di emergenza e indirizzo precompilati, reparto «Direzione» e orario «Full time 40 h · 5 giorni» presi dal contratto vigente, e lo storico (pulsante «Storico 2»).
20. **Contratti ricollegati** (demo, backend spento): nuova scheda «Giulia Verdi», si aggiunge una variazione con PDF e si salva → toast «Anagrafica salvata» / «Giulia Verdi: backend non raggiungibile, la scheda è salvata in questo browser (dati della demo).»; nell'Archivio compare la riga matricola **91** con il contatore «1» sul pulsante PDF e la modale «Contratto — Giulia Verdi» mostra la variazione; in `sibylla.contratti-personale` il contratto ha `anagraficaId: "91"` (nessun `nuovo-…` residuo). Con il backend attivo vale lo stesso con l'id restituito dall'Insert.
21. **Foto**: clic sulla miniatura → modale «Scegli avatar»; scelto un avatar la miniatura lo mostra; salvato, il «Dettaglio dipendente» dell'Archivio mostra quell'avatar. Caricando una foto di 4000×3000 px si salva una JPEG di 320×240 px; «Rimuovi foto» torna all'icona utente. Riaprendo la scheda in modifica la foto è precompilata.
22. **Errori**: con il backend che risponde `422 { "error": "Codice fiscale non valido." }` a Update, «Salva» mostra il toast error «Anagrafica non salvata» / «Il salvataggio non è riuscito. Codice fiscale non valido.», il pulsante torna «Salva» e si resta sulla scheda. Il corpo di Update contiene `"id": 66` per Piero Aragona.

## 13. File sorgente

- `src/router/PageContent.tsx`
- `src/modules/hr/CreaAnagrafica/CreaAnagrafica.tsx`
- `src/modules/hr/CreaAnagrafica/CreaAnagrafica.sass`
- `src/modules/hr/CreaAnagrafica/_state.ts`
- `src/store/useContrattiPersonaleStore.ts`
- `src/store/useAnagrafichePersonaleStore.ts` (copia locale della demo)
- `src/modules/hr/ArchivioPersonale/personaleDemo.ts` (tipo `PersonaleItem`, dati di esempio, regola «backend non raggiungibile», messaggi d'errore)
- `src/store/useHrConfigStore.ts`
- `src/store/useAnagraficaOpStore.ts`
- `src/store/useRuoliStore.ts`
- `src/store/useConfirmStore.ts`
- `src/modules/appop/OpAccessoAnagrafica.tsx`, `OpAccessoAnagrafica.sass`
- `src/modules/appop/OpInvitoModal.tsx`, `OpInvitoModal.sass`
- `src/modules/appop/invitoAnagrafica.ts`, `appOpSibylla.ts`, `opApi.ts`, `opCatalogo.ts`
- `src/hooks/useModuloAttivo.ts`, `src/hooks/useStrutturaCorrente.ts`
- `src/core/utils/countryFlags.ts`
- `src/core/components/PageHead.tsx`, `BtnBack.tsx`, `Modal.tsx`, `ConfirmDialog.tsx`, `TruncatedText.tsx`, `Toast/useToast.ts`
- `src/core/components/AvatarPicker.tsx`, `AvatarPicker.sass`, `src/core/avatar.ts` (vedi nota sotto)
- `src/navigation/menu.ts`, `menuTourOperator.ts`, `menuRistoranti.ts`, `pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`
- `src/services/api.ts`
- `src/styles/_themes.sass`, `_colors.sass`, `_spacing.sass`, `_components.sass`, `_skin-dark.sass`, `tailwind.config.js`

> **Nota su avatar e AvatarPicker.** La pagina usa lo stesso `AvatarPicker` di Modifica profilo e Ruoli & funzioni (modale «Scegli avatar», griglia 6 colonne dei 50 SVG `/avatars/avatar-01…50.svg`, caricamento foto max 2 MB) e `avatarUrl()` di `avatar.ts` per la miniatura. Il valore salvato in `avatarUrl` è l'id avatar o la foto ridotta (§5.3). L'**Archivio del personale** nel «Dettaglio dipendente» mostra `avatarUrl(avatarUrl dell'anagrafica || "nome cognome")`: un id `avatar-NN` va a `/avatars/avatar-NN.svg`, un'immagine (`data:`, `blob:`, `http`, `/…`) si usa così com'è, qualsiasi altra stringa sceglie un avatar stabile con l'hash `h = (h×31 + charCode) >>> 0`, indice `h % 50` (vedi `05-archivio-personale.md`).
