# 04 · Collaboratore esterno (`crea-collaboratore-esterno`, `nuovo-collaboratore-esterno:<fornitoreId>`, `modifica-collaboratore-esterno:<id>`)

> Scheda di riproduzione. Componenti condivisi (PageHead, InputField, SelectField, DatePickerField, CheckboxField, TextareaField, ToggleSwitch, AlertBanner, Modal, ConfirmDialog, Toast, `.sib-btn*`) in `00-fondamenta.md`; entità trasversali (Collaboratore esterno, Fornitore/Azienda in appalto, Categoria esterni, Badge, Abilitazione App Op!) in `01-modello-dati-e-api.md`. La sezione App Op! riusa lo stesso componente della scheda dipendente: qui sono descritte solo le differenze della variante «esterno» (la variante base è in `03-crea-anagrafica.md` §4.8 e §5.5).

---

## 1. Scopo e utenti

Scheda leggera dell'**addetto di una ditta in appalto** (pulizie, manutenzione, facchinaggio…), usata dall'**ufficio del personale** per:

- registrarne i dati personali e il numero di badge;
- collegarlo all'**azienda in appalto** (un fornitore di Purchasing con il flag `appalto`) e alla **categoria** di Configurazione HR › Collaboratori esterni, che decide reparti App Op! consentiti, documenti richiesti e durata massima dell'autorizzazione;
- indicare le strutture in cui opera e il **periodo di autorizzazione** (alla scadenza l'accesso all'App Op! si spegne);
- caricare i documenti richiesti dalla categoria (con scadenza) e vedere lo stato del **DUVRI** dell'appalto;
- abilitarlo all'**App Op!** (grado fisso Impiegato, solo reparti della categoria) e inviargli il token;
- generare e stampare il **badge di riconoscimento** (art. 26 c. 8 D.Lgs. 81/2008, art. 5 L. 136/2010).

Non è un dipendente: nessun contratto di lavoro, ferie o cedolino.

## 2. Accesso

| Id pagina | Componente | Significato |
|---|---|---|
| `crea-collaboratore-esterno` | `<CollaboratoreEsterno navigate key={page}/>` | nuova scheda vuota |
| `nuovo-collaboratore-esterno:<fornitoreId>` | `<CollaboratoreEsterno navigate fornitoreId=… />` | nuova scheda con l'azienda in appalto preselezionata |
| `modifica-collaboratore-esterno:<id>` | `<CollaboratoreEsterno navigate id=… />` | scheda esistente (se l'id non esiste si comporta come una nuova scheda vuota) |

- **Menu**: Human Resources › Gestione delle anagrafiche › «Crea collaboratore esterno» (icona `fa-user-helmet-safety`). Stessa voce nei menu Tour Operator e Ristoranti.
- Sottotitolo nel registro `pageSubtitles`: «Registra l’addetto di una ditta in appalto e abilitalo all’App Op! nei reparti consentiti» (la pagina usa però il proprio sottotitolo, §4.1).
- **Breadcrumb**: standard della shell (Human Resources › Gestione delle anagrafiche › Crea collaboratore esterno).

**Da dove si arriva**
- Archivio del personale, scheda «Collaboratori esterni»: pulsante «Nuovo collaboratore esterno» → `crea-collaboratore-esterno`; matita «Modifica» o triangolo «Documentazione incompleta» → `modifica-collaboratore-esterno:<id>`.
- Configuratore › Human Resources › Aziende in appalto: «Nuovo collaboratore» → `nuovo-collaboratore-esterno:<idAzienda>`; apri un addetto → `modifica-collaboratore-esterno:<id>`.
- Configuratore › App Op!, modale «invita esterno»: azione «nuovo» → `crea-collaboratore-esterno`.

**Verso dove si naviga**
- `archivio-personale:esterni`: Indietro, Annulla, dopo Elimina.
- `modifica-collaboratore-esterno:<nuovoId>`: subito dopo la prima registrazione.
- `hr-configurazione:hr-aziende-appalto`: pulsante «Gestisci in Aziende in appalto» del riquadro DUVRI.

## 3. Layout

Root `.colest`: colonna flex, `align-items: stretch`.

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [← Indietro]      Nuovo collaboratore esterno                             │ PageHead
│                   Addetto di una ditta in appalto (pulizie, …)            │
├───────────────────────────────────────────────────────────────────────────┤
│ ⓘ errore di validazione (rosso 13px)                                      │
├── .colest__sheet (gap 16, mt 8) ──────────────────────────────────────────┤
│ ┌[🪪 Dati personali]────────────────────────────────────────────────────┐ │
│ │ ┌─────┐  Nome*          | Cognome*        | Codice fiscale            │ │
│ │ │ 96× │  E-mail         | Telefono        | Data di nascita           │ │
│ │ │ 120 │  Assunto dall’… | N. badge (r/o)  |                           │ │
│ │ └─────┘ Foto per il badge [Rimuovi]                                   │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌[🏢 Azienda e categoria]───────────────────────────────────────────────┐ │
│ │ Azienda in appalto* | Categoria* |                                    │ │
│ │ Strutture in cui opera (nessuna selezione = tutte)  ☐ A  ☐ B          │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌[📅 Autorizzazione]────────────────────────────────────────────────────┐ │
│ │ Autorizzato dal* | Autorizzato fino al* | Stato [Autorizzato]         │ │
│ │ Alla scadenza l’accesso all’App Op! non è più consentito: …           │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌[📂 Documenti]─────────────────────────────────────────────────────────┐ │
│ │ ⚠ Documentazione incompleta: DURC.                                    │ │
│ │ ┌ DURC  [⚠ Mancante] ········ [📄 file 👁] [gg/mm/aaaa] [📂 Carica] ┐ │ │
│ │ ┌ 🛡 Splendor Servizi Integrati · DUVRI rev. 2 sottoscritto … [Gestisci…]┐│ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌[📱 App Op!]───────────────────────────────── (solo modulo app-op) ────┐ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌[🪪 Badge di riconoscimento]──────────────────────────────────────────┐ │
│ │ ┌──────────── iframe ────────────┐  Foto del badge                   │ │
│ │ │ [banda colore]  Collab. esterno│  ┌──┐ [Carica foto][Scatta foto]  │ │
│ │ │ (foto) COGNOME Nome      [QR]  │  └──┘ JPG o PNG, ritagliata …     │ │
│ │ │ Impresa … Valido …             │  ⚠ Manca la foto: …               │ │
│ │ └────────────────────────────────┘  ⚠ Indica la data di assunzione…  │ │
│ │ (retro sotto, se attivo)            Campi, colore e formato …        │ │
│ │                                     [🖨 Stampa badge]                 │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌[🗒 Note]──────────────────────────────────────────────────────────────┐ │
│ │ (textarea 2 righe)                                                    │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────┤
│ [🗑 Elimina]                                   [Annulla] [Registra coll.] │ .colest__actions
└───────────────────────────────────────────────────────────────────────────┘
```

**Blocchi e misure**
- **Errore** `.colest__error`: inline-flex, gap 8px, margine `4px 0 0`, 13px, `--color-error`, icona `fa-light fa-circle-exclamation`.
- **Foglio** `.colest__sheet`: colonna, `gap: 16px`, `margin-top: 8px`.
- **Sezione** `.colest__section` (NON comprimibile, a differenza della scheda dipendente): `flex-shrink: 0`, bordo 1px `--color-border`, radius 10px, sfondo `--color-surface`, `overflow: hidden`.
  - Header `.colest__section-head`: flex, `gap: 9px`, `padding: 12px 18px`, sfondo `--color-bg`, bordo inferiore 1px. Icona `fa-duotone` 15px `--color-primary`; `<h3>` Poppins 600 14px `--color-primary`.
  - Corpo `.colest__section-body`: colonna, `gap: 14px`, `padding: 18px`.
- **Griglia** `.colest__grid`: `repeat(3, minmax(0, 1fr))`, gap `16px 18px`.
- **Identità** `.colest__identity`: flex, gap 22px, `align-items: flex-start`; foto `.colest__photo` (colonna centrata, gap 6px, `flex-shrink: 0`) + griglia (`flex: 1`, `min-width: 0`).
- **Tessera** `.colest__tessera`: flex, gap 22px, `align-items: flex-start`, `flex-wrap: wrap`; a sinistra l'iframe di anteprima, a destra `.colest__tessera-side` (colonna, gap 10px, `flex: 1 1 260px`, `min-width: 0`; il pulsante Stampa è `align-self: flex-start`).
- **Azioni** `.colest__actions`: flex a destra, gap 12px, `margin-top: 20px`; «Elimina» spinto a sinistra (`margin-right: auto`).

## 4. Elementi e testi

### 4.1 PageHead
- Titolo: «Nuovo collaboratore esterno» oppure, con scheda esistente, «Modifica collaboratore esterno».
- Sottotitolo: «Addetto di una ditta in appalto (pulizie, manutenzione…): non è un dipendente, ma può usare l’App Op! nei reparti autorizzati».
- Indietro → `archivio-personale:esterni`.

### 4.2 Sezioni (icona `fa-duotone …`, titolo)
1. `fa-id-card` «Dati personali»
2. `fa-building` «Azienda e categoria»
3. `fa-calendar-check` «Autorizzazione»
4. `fa-folder-open` «Documenti»
5. `fa-mobile-screen` «App Op!» (solo con modulo `app-op` attivo)
6. `fa-id-badge` «Badge di riconoscimento»
7. `fa-note-sticky` «Note»

### 4.3 Dati personali
**Foto** (a sinistra):
- `<button class="colest__photo-thumb" aria-label="Carica la foto del badge">` 96×120 tratteggiato; vuoto `fa-duotone fa-user`, pieno `<img alt="Foto del collaboratore">`. Apre l'input file `accept="image/*"`.
- Testo `.colest__muted` «Foto per il badge».
- Con foto: `.sib-btn--ghost.sib-btn--sm` «Rimuovi».
- Due input nascosti: file (`accept="image/*"`) e fotocamera (`accept="image/*" capture="user"`, frontale).

**Campi** (griglia 3 colonne, in ordine):
| name | Label | Note |
|---|---|---|
| `ce_nome` | «Nome» | `required` (asterisco) |
| `ce_cognome` | «Cognome» | `required` |
| `ce_cf` | «Codice fiscale» | il valore viene convertito in **maiuscolo** a ogni battitura |
| `ce_email` | «E-mail» | `type="email"`, hint «A questo indirizzo arriva il token di invito dell’App Op!» |
| `ce_tel` | «Telefono» | `type="tel"` |
| `ce_nascita` | «Data di nascita» | DatePickerField |
| `ce_assunzione` | «Assunto dall’impresa il» | DatePickerField, hint «Obbligatoria sul badge (L. 136/2010)» |
| `ce_badge` | «N. badge» | `readOnly`; valore = numero badge (es. «EST-0001») o «Assegnato al salvataggio» |

### 4.4 Azienda e categoria
| name | Label | Opzioni | Hint |
|---|---|---|---|
| `ce_azienda` | «Azienda in appalto» `required` | «Seleziona» (`''`), fornitori con `appalto = true` (seed: «Splendor Servizi Integrati», «Tecno Impianti Hotel», «Movi Facchinaggio»), ultima «+ Nuova azienda in appalto…» (valore sentinella `__nuova`, apre la modale) | «Dai fornitori di Purchasing › Servizi in appalto» |
| `ce_categoria` | «Categoria» `required` | «Seleziona» + categorie **attive** (più quella già scelta): seed «Addetto pulizie», «Manutentore», «Facchino» | con categoria: «App Op!: {reparti}» (es. «App Op!: Front Office, Magazzino») |

**Strutture** (solo se il cliente corrente ha più di una struttura): label `.colest__label` «Strutture in cui opera » + `.colest__muted` «(nessuna selezione = tutte)»; una CheckboxField per struttura (`name="ce_str_{struttura}"`).

### 4.5 Autorizzazione
| name | Label | Hint / errore |
|---|---|---|
| `ce_dal` | «Autorizzato dal» `required` | — |
| `ce_al` | «Autorizzato fino al» `required` | hint «Massimo {n} mesi: entro il {gg/mm/aaaa}» se c'è categoria e data inizio; errore «Oltre la durata massima della categoria» |
| (terza colonna) | label «Stato» + badge `.colest__badge--{stato}` | testo da `STATO_AUT_LABEL`: «Autorizzato» (`attiva`), «In scadenza» (`in-scadenza`), «Scaduto» (`scaduta`), «Non ancora attivo» (`futura`) |

Sotto: `.colest__hint` «Alla scadenza l’accesso all’App Op! non è più consentito: per proseguire va rinnovata l’autorizzazione.»

### 4.6 Documenti
- Senza categoria: `.colest__hint` «Scegli la categoria: i documenti richiesti dipendono da lì.»
- Con categoria:
  - se mancano documenti: AlertBanner `warning` «Documentazione incompleta: {elenco separato da ", "}.»
  - una riga `DocRow` per ogni documento della categoria (`.colest__doc`):
    - sinistra: nome (`.colest__doc-name`) + badge: senza file `fa-solid fa-triangle-exclamation` «Mancante» (rosso, stile `--scaduta`); con file scaduto `fa-solid fa-triangle-exclamation` «Scaduto» (rosso); altrimenti `fa-solid fa-circle-check` «Caricato» (verde, stile `--attiva`);
    - destra: chip file `.colest__doc-file` (`title` = nome) `fa-light fa-file-pdf` + nome + pulsante icona `fa-light fa-eye` `aria-label="Visualizza"` (solo se c'è un data URL); DatePickerField senza label (`name="doc_scad_{nome}"`, classe `.colest__doc-date`, 170px) = **scadenza del documento**; pulsante `.sib-btn--secondary.sib-btn--sm` `fa-light fa-folder-open` «Carica» / «Sostituisci»; input nascosto `accept="application/pdf,image/*"`.
  - riquadro **DUVRI dell'appalto** (solo se è scelta un'azienda), sola lettura: icona `fa-solid fa-shield-check` (stato ok) o `fa-solid fa-triangle-exclamation` (warn/ko), testo «**{azienda}** · {testo}», pulsante `.sib-btn--ghost.sib-btn--sm` «Gestisci in Aziende in appalto».

  Testo e stato DUVRI (primo caso che si applica; `fmt` = gg/mm/aaaa):
  | Condizione | Stato | Testo |
  |---|---|---|
  | nessun DUVRI | ko | «DUVRI dell’appalto non compilato» |
  | `dovuto = false` | ok se c'è `esenzione`, altrimenti warn | «DUVRI non dovuto» + « · coordinamento: {incaricato}» se presente |
  | nessun allegato | ko | «DUVRI dell’appalto non allegato» |
  | `prossimoAggiornamento` < oggi | ko | «DUVRI da aggiornare dal {data}» |
  | nessuna data di sottoscrizione | warn | «DUVRI» + « rev. {revisione}» + « non ancora sottoscritto dall’impresa» |
  | altrimenti | ok | «DUVRI» + « rev. {revisione}» + « sottoscritto il {data}» + « · da riesaminare entro il {data}» se c'è il prossimo aggiornamento |

### 4.7 App Op! (variante `esterno`)
Componente `OpAccessoAnagrafica` con: `anagraficaId` = `est-{id}` (o `est-nuovo` per una scheda non ancora salvata), `email` = campo «E-mail» (bidirezionale), `repartiSuggeriti` e `repartiConsentiti` = reparti App Op! della categoria (`[]` senza categoria), `esterno`, `bloccoInvito` (sotto). Differenze rispetto al dipendente:
- descrizione del toggle «Abilita l’accesso all’App Op!»: «Il collaboratore riceve per email il token di invito ed entra nell’app solo nei reparti della sua categoria, per il periodo autorizzato.»
- campo email: label «E-mail del collaboratore»;
- grado: InputField readOnly «Grado nell’app» = «Impiegato · collaboratore esterno»; **niente** toggle «Responsabile…» e «Accesso alle funzioni HR»;
- reparti: label «Reparti dell’app (consentiti dalla categoria)»; si vedono solo i reparti della categoria; senza categoria «Scegli prima la categoria del collaboratore.»;
- `title` del pulsante: il motivo del blocco se c'è, altrimenti «Il collaboratore riceve il codice per email»;
- AlertBanner `info` con il motivo del blocco (`bloccoInvito`), che disabilita anche il pulsante:
  1. scheda non salvata: «Salva la scheda per poter inviare il token di invito.»
  2. autorizzazione scaduta: «Autorizzazione scaduta il {fine}: rinnovala per invitare il collaboratore.»
  3. autorizzazione futura: «L’autorizzazione decorre dal {inizio}: l’invito si potrà inviare da quel giorno.»
  4. nessuna categoria: «Scegli la categoria del collaboratore.»
- L'invito usa sempre `livello: 'impiegato'`, `hr: false`, `responsabile: false` e solo i reparti ancora consentiti dalla categoria.
- Messaggi d'errore, toast, modale «Invito per …» e testi di stato come nella variante dipendente (`03-crea-anagrafica.md` §4.8 e §5.5). Nota: il messaggio di errore per nome/cognome vuoti dice comunque «Nome e cognome del dipendente sono obbligatori.» e la modale dice «Il dipendente installa l’app Op!…».

### 4.8 Badge di riconoscimento
**Anteprima** (`BadgeAnteprima`): `<iframe title="Anteprima badge di {nome} {cognome}">` con `srcDoc` = lo stesso HTML della stampa (sezione §8.3). Dati usati: la scheda in corso di modifica (anche non salvata), `id` = id o «nuovo», numero badge = esistente o «EST-····», azienda = fornitore scelto, categoria, struttura = struttura corrente o «Struttura».

**Colonna destra**:
- `.colest__foto`: label «Foto del badge»; riga con la miniatura `.colest__foto-thumb` 72×90 (`aria-label` «Allega la foto» / «Sostituisci la foto», `<img alt="Foto del badge">` o `fa-duotone fa-user` `aria-hidden`) e i pulsanti:
  - `.sib-btn--secondary.sib-btn--sm` `fa-light fa-folder-open` «Carica foto» / «Sostituisci foto» (input file);
  - `.sib-btn--secondary.sib-btn--sm` `fa-light fa-camera` «Scatta foto» (input fotocamera frontale);
  - con foto: `.sib-btn--ghost.sib-btn--sm.colest__foto-del` `fa-light fa-trash-can` «Rimuovi» (rosso);
  - testo `.colest__muted` a riga intera «JPG o PNG, ritagliata in formato tessera 4:5.»
- senza foto: AlertBanner `warning` «Manca la foto: sul badge comparirebbero le iniziali, ma per legge la tessera deve avere la fotografia.»
- senza data di assunzione: AlertBanner `warning` «Indica la data di assunzione presso l’impresa: è obbligatoria sul badge.»
- `.colest__hint` «Campi, colore e formato si impostano in Human Resources › Configurazione › Collaboratori esterni.»
- `.sib-btn--primary` `fa-light fa-print` «Stampa badge»: disabilitato finché la scheda non è salvata, con `title` «Salva la scheda per stampare il badge».

### 4.9 Note
TextareaField `name="ce_note"`, `rows=2`, senza label, placeholder «Reperibilità, accessi particolari…».

### 4.10 Barra azioni
- Solo con scheda esistente: `.sib-btn--ghost.colest__delete` `fa-light fa-trash-can` «Elimina» (rosso, a sinistra).
- `.sib-btn--ghost` «Annulla».
- `.sib-btn--primary` «Registra collaboratore» (nuova) / «Salva» (esistente).

### 4.11 Modale «Nuova azienda in appalto»
`Modal` titolo «Nuova azienda in appalto», `size="md"`, classe `colest-modal`.
- `.colest__hint` «La ditta viene aggiunta ai fornitori di Purchasing (Servizi in appalto), dove potrai completarne l’anagrafica.»
- InputField `na_nome` «Ragione sociale» `required`.
- Griglia 3 colonne: `na_citta` «Città», `na_tel` «Telefono», `na_email` «E-mail» (`type="email"`).
- Footer (bordo superiore): `.sib-btn--ghost` «Annulla», `.sib-btn--primary` «Aggiungi azienda» (disabilitato con ragione sociale vuota).

## 5. Stati e interazioni

### 5.1 Stato iniziale
- **Nuova**: `{ nome:'', cognome:'', email:'', telefono:'', codiceFiscale:'', fornitoreId: fornitoreId ?? '', categoriaId:'', strutture:[], autorizzatoDal: oggi, autorizzatoAl:'', documenti:{}, note:'' }` (oggi = data UTC `toISOString().slice(0,10)`). Stato autorizzazione calcolato: «Autorizzato». Abilitazione App Op! vuota.
- **Esistente**: copia del record; abilitazione da `abilitazioni['est-{id}']`.

### 5.2 Scelta della categoria
- Imposta `categoriaId`; se «Autorizzato fino al» è vuoto lo propone = `piuMesi(autorizzatoDal, durataMaxMesi)` (inizio + N mesi − 1 giorno).
- Reparti App Op!: tiene solo quelli consentiti dalla nuova categoria; se non ne resta nessuno li imposta tutti a quelli della categoria.
- I documenti visibili diventano quelli della categoria (i documenti già caricati con altri nomi restano nel record ma non si vedono).

### 5.3 Azienda
- Scelta normale → `fornitoreId`.
- «+ Nuova azienda in appalto…» → apre la modale (il valore della select non cambia). «Aggiungi azienda» crea un fornitore con: `nome` e `citta`, `telefono`, `email` (trim), `descrizione: 'Ditta di servizi in appalto.'`, `annoFondazione` = anno corrente, `macroArea: 'servizi'`, `pubblicato: true`, `appalto: true`, gli altri campi vuoti; lo seleziona, chiude la modale e mostra il toast success titolo «Servizi in appalto», testo «{nome} aggiunta ai fornitori di Purchasing». Annulla, ✕, Esc o clic sul fondale chiudono senza creare.

### 5.4 Foto (da miniatura, «Carica foto» o «Scatta foto»)
Elaborata da `leggiFotoTessera` (§6.4): successo → foto nel form + toast success titolo «Badge», testo «Foto allegata al badge: salva la scheda per conservarla.»; errore → toast error titolo «Badge» con il messaggio. «Rimuovi» (in entrambe le posizioni) toglie la foto senza conferma.

### 5.5 Documenti
- «Carica/Sostituisci» → file letto come data URL (`file` = nome, `dataUrl`). Data di scadenza modificabile in qualunque momento (anche prima del file). Nessun pulsante per eliminare un singolo documento.
- Badge: «Mancante» senza file; «Scaduto» se `scadenza < oggi`; altrimenti «Caricato».
- Il banner «Documentazione incompleta» elenca i documenti della categoria mancanti o scaduti e si aggiorna in tempo reale.

### 5.6 Salva / Registra collaboratore
Validazioni in ordine (prima che fallisce → errore in alto, nessun salvataggio):
1. nome o cognome vuoti (trim) → «Nome e cognome sono obbligatori.»
2. nessuna azienda → «Scegli l’azienda in appalto da cui dipende il collaboratore.»
3. nessuna categoria → «Scegli la categoria del collaboratore.»
4. inizio o fine autorizzazione vuoti → «Indica il periodo di autorizzazione.»
5. fine < inizio → «La fine dell’autorizzazione è precedente all’inizio.»
6. fine oltre il limite della categoria → «Per la categoria «{nome}» l’autorizzazione dura al massimo {n} mesi (fino al {gg/mm/aaaa}).»
7. email compilata e non valida → «Email non valida.»

Esito:
- dati puliti (nome, cognome, email con trim);
- **nuova**: `add` (assegna `numeroBadge` = `EST-` + (massimo numerico esistente + 1) su 4 cifre, `id = ce-{base36 ms}-{rand}`, `createdAt`); toast success titolo «Human Resources», testo «{Nome} {Cognome} registrato tra i collaboratori esterni»; naviga a `modifica-collaboratore-esterno:{id}`;
- **esistente**: `update`; toast success «Scheda del collaboratore aggiornata» (titolo «Human Resources»); resta sulla pagina;
- in entrambi i casi salva l'abilitazione App Op! con chiave `est-{id}`: stato salvato ∪ locale, `emailAziendale` = email, `livello: 'impiegato'`, `hr: false`, `responsabile: false`, reparti filtrati sulla categoria.

### 5.7 Elimina
ConfirmDialog: titolo «Elimina collaboratore esterno», messaggio «Eliminare la scheda di {Nome} {Cognome}? L’eventuale utenza nell’App Op! va bloccata da Utenti e ruoli.», pulsante «Elimina» (distruttivo) e «Annulla». Confermato → rimozione e navigazione a `archivio-personale:esterni`. L'abilitazione App Op! salvata non viene cancellata.

### 5.8 Stampa badge
Solo per schede salvate. Apre una nuova finestra con l'HTML del badge (modo stampa, §8.3), genera i QR se previsti, attende 400 ms e chiama `print()`. Se il browser blocca il pop-up: toast error titolo «Badge», testo «Il browser ha bloccato la finestra di stampa: consenti i pop-up per questo sito.»; altro errore «Stampa non riuscita.».

### 5.9 Annulla / Indietro
Vanno a `archivio-personale:esterni` senza conferma e senza salvare.

### 5.10 Caricamento, vuoti, errori
Nessuno skeleton. Stati vuoti testuali: documenti senza categoria, reparti senza categoria (§4.6, §4.7).

## 6. Dati e regole di business

### 6.1 Collaboratore esterno (`useCollaboratoriEsterniStore`, persist `sibylla.collaboratori-esterni` **v2**)
```ts
interface DocumentoEsterno { file?: string; dataUrl?: string; scadenza?: string /* yyyy-mm-dd */ }
interface CollaboratoreEsterno {
  id: string; nome: string; cognome: string; email: string; telefono: string; codiceFiscale: string;
  dataNascita?: string; dataAssunzione?: string; foto?: string /* data URL JPEG 480×600 */;
  numeroBadge?: string /* 'EST-0001' */; fornitoreId: string; categoriaId: string;
  strutture: string[] /* vuoto = tutte */; autorizzatoDal: string; autorizzatoAl: string;
  documenti: Record<string /* nome documento */, DocumentoEsterno>; note: string; createdAt: string;
}
```
La migrazione v2 completa i record seed con numero badge, nascita e assunzione.

### 6.2 Regole
- **Stato autorizzazione** (`statoAutorizzazione`, oggi = data ISO): `futura` se `autorizzatoDal > oggi`; `scaduta` se `autorizzatoAl < oggi`; `in-scadenza` se `autorizzatoAl ≤ oggi + 30 giorni`; altrimenti `attiva`.
- **Limite**: `limiteAl = piuMesi(autorizzatoDal, categoria.durataMaxMesi)` dove `piuMesi(d, m)` = data + m mesi − 1 giorno (calcolato con `Date`, poi `toISOString`, quindi in UTC). `oltreLimite = limiteAl && autorizzatoAl && autorizzatoAl > limiteAl` (confronto di stringhe ISO). Esempio: dal 2026-11-05, categoria 12 mesi → entro il 2027-11-04.
- **Documenti mancanti** (`documentiMancanti`): documenti della categoria senza `file` o con `scadenza` non vuota < oggi.
- **Chiave App Op!** = `est-{id}`.
- **Email**: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` su trim.
- **Numero badge**: progressivo `EST-NNNN` = max delle cifre dei numeri esistenti + 1.

### 6.3 Configurazione usata (da `useHrConfigStore`, `sibylla.hr-config` v7)
- **Categorie esterni** (seed): «Addetto pulizie» (App Op! Pulizie; documenti Contratto d’appalto, DURC, Formazione sicurezza, Documento d’identità; max 12 mesi; colore 3), «Manutentore» (Manutenzione; stessi 4 documenti; 12 mesi; colore 4), «Facchino» (Front Office + Magazzino; Contratto d’appalto, DURC, Documento d’identità; 6 mesi; colore 1). Il DUVRI non è mai un documento dell'addetto (è dell'appalto).
- **Badge** (`BADGE_DEFAULT`): intestazione vuota (= nome struttura), colore 1 (`--chart-1`, `#2E6DA4` chiaro / `#4A8BC9` scuro), orientamento orizzontale, formato stampa `a4`, mostra nascita/categoria/validità/partita IVA/QR, retro attivo, dicitura «Tessera di riconoscimento — art. 26 c. 8 D.Lgs. 81/2008 e art. 5 L. 136/2010», testo retro «Il titolare è autorizzato ad accedere alla struttura solo nel periodo indicato. In caso di smarrimento avvisare il ricevimento. La tessera va esposta in modo visibile durante il servizio.»

### 6.4 Foto tessera (`leggiFotoTessera`)
- Rifiuta file non immagine: «Il file scelto non è un’immagine (JPG, PNG, HEIC…).»; oltre 10 MB: «L’immagine supera i 10 MB.»
- Ritaglio centrale 4:5, con offset verticale `max(0, (altezza − altezzaRitaglio) × 0.35)` (volto nella metà superiore), su canvas 480×600 con fondo bianco, esportato JPEG qualità 0.85.
- Errori: «Impossibile elaborare l’immagine.» (no contesto canvas), «Immagine non leggibile: prova con un JPG o un PNG.».

### 6.5 Aziende in appalto (`useCatalogoStore.fornitori` con `appalto: true`)
Persist `sibylla.catalogo-appalto` **v2**, solo i fornitori in appalto (il resto del catalogo resta demo in memoria); al caricamento le ditte salvate prevalgono sui seed, ma i campi nuovi di `datiAppalto` arrivano dai seed. Seed:
| id | Nome | Città | DUVRI (stato con oggi 05/11/2026) |
|---|---|---|---|
| `forn-app-splendor` | Splendor Servizi Integrati (S.r.l.) | Roma | dovuto, allegato rev. 2, sottoscritto 15/02/2026, riesame 15/02/2027 → ok |
| `forn-app-tecnoimpianti` | Tecno Impianti Hotel (S.p.A.) | Roma | allegato rev. 1, non sottoscritto, riesame 20/11/2026 → warn «non ancora sottoscritto dall’impresa» |
| `forn-app-movi` | Movi Facchinaggio (Soc. Coop.) | Fiumicino | dovuto, non allegato → ko; in subappalto (autorizzazione n. 7/2026) |

Campi di `datiAppalto` usati qui e sul badge: `ragioneSociale`, `partitaIva`, `sedeLegale`, `contrattoNumero`, `contrattoData`, `referente`, `referenteTelefono`, `subappalto`, `subappaltoAutorizzazione`, `duvri { dovuto, allegato, dataSottoscrizione, revisione, prossimoAggiornamento, esenzione, incaricatoCoordinamento }`.

### 6.6 Seed collaboratori (3)
| id | Badge | Nominativo | Azienda | Categoria | Autorizzazione | Note |
|---|---|---|---|---|---|---|
| `ce-1` | EST-0001 | Elena Morra (n. 05/04/1988, ass. 01/09/2021) | Splendor | Addetto pulizie | 01/03/2026 → 28/02/2027 | 4 documenti, DURC scade 15/01/2027; App Op! abilitata (Pulizie) |
| `ce-2` | EST-0002 | Davide Lupo (n. 01/01/1980, ass. 16/03/2015) | Tecno Impianti | Manutentore | 01/01/2026 → **oggi + 18 giorni** (calcolato al caricamento) | DURC scade oggi + 18; note «Reperibile per pronto intervento notturno.»; App Op! abilitata (Manutenzione) |
| `ce-3` | EST-0003 | Karim Benali (n. 10/08/1992, ass. 01/05/2024) | Movi | Facchino | 01/05/2026 → 31/10/2026 | manca il DURC; App Op! non abilitata |

## 7. Backend da realizzare

Oggi tutto è mock (store persistiti nel browser). Contratto proposto, via proxy `/Sibylla/`:

| Azione | Metodo e percorso | Request | Response / errori |
|---|---|---|---|
| Leggi scheda | `GET /Sibylla/hr/collaboratori-esterni/{id}` | — | `CollaboratoreEsterno` + `abilitazioneOp`; 404 |
| Crea | `POST /Sibylla/hr/collaboratori-esterni` | corpo §6.1 senza `id`, `createdAt`, `numeroBadge` | `201 { id, numeroBadge, createdAt }`; `422 { error }` con i testi di §5.6 |
| Aggiorna | `PUT /Sibylla/hr/collaboratori-esterni/{id}` | corpo completo | `200`; 422 come sopra |
| Elimina | `DELETE /Sibylla/hr/collaboratori-esterni/{id}` | — | `204`; deve **bloccare** l'eventuale utenza App Op! o restituire un avviso |
| Documento | `PUT /Sibylla/hr/collaboratori-esterni/{id}/documenti/{nome}` (multipart `file` + `scadenza`) | — | `{ file, url, scadenza }` |
| Foto | `PUT /Sibylla/hr/collaboratori-esterni/{id}/foto` (JPEG 480×600) | — | `{ url }` |
| Abilitazione App Op! | `PUT /Sibylla/hr/collaboratori-esterni/{id}/app-op` | `{ abilitato, emailAziendale, reparti }` (livello/hr/responsabile forzati lato server) | `200` |
| Invito App Op! | come dipendenti: `POST /Sibylla/OpApp/utenti/Salva` / `OpApp/inviti/Invia` | vedi `03-crea-anagrafica.md` §7 | il server rifiuta (`409`) se autorizzazione non attiva/in scadenza o reparti fuori categoria |
| Nuova azienda in appalto | `POST /Sibylla/purchasing/fornitori` | `{ nome, citta, telefono, email, appalto: true, macroArea: "servizi", pubblicato: true, descrizione: "Ditta di servizi in appalto." }` | `201 Fornitore` |
| Badge (opzionale) | `GET /Sibylla/hr/collaboratori-esterni/{id}/badge.pdf?formato=cr80|a4` | — | PDF; oggi il badge è generato in HTML lato client |

Esempio creazione:
```json
POST /Sibylla/hr/collaboratori-esterni
{ "nome": "Karim", "cognome": "Benali", "email": "k.benali@movifacchinaggio.it", "telefono": "+39 320 5656565",
  "codiceFiscale": "BNLKRM92M10Z330P", "dataNascita": "1992-08-10", "dataAssunzione": "2024-05-01",
  "fornitoreId": "forn-app-movi", "categoriaId": "cest-fac", "strutture": [],
  "autorizzatoDal": "2026-05-01", "autorizzatoAl": "2026-10-31", "documenti": {}, "note": "" }
→ 201 { "id": "ce-…", "numeroBadge": "EST-0004", "createdAt": "2026-11-05T10:00:00Z" }
422 { "error": "Per la categoria «Facchino» l’autorizzazione dura al massimo 6 mesi (fino al 31/10/2026)." }
```

Regole lato server: assegnazione atomica del numero badge (sequenza per cliente), calcolo dello stato autorizzazione alla data del server, job giornaliero che **disattiva l'accesso App Op!** alla scadenza dell'autorizzazione. L'invito genera l'email al collaboratore; nessuna notifica nel Centro notifiche.

## 8. Stile

Token come in `03-crea-anagrafica.md` §8; in più `--color-text-disabled` `#A9AAAD` (scuro `#5E6675`), `--color-primary-300` `#b3c1cc` (scuro `#6B7686`). `alpha(token, a)` = `color-mix(in srgb, token a×100%, transparent)`. Nessun override dark specifico: valgono i token.

### 8.1 Pagina
| Classe | Valori |
|---|---|
| `.colest .sib-input, .sib-select` | `width: 100%` |
| `.colest__photo-thumb` | 96×120, padding 0, bordo `1px dashed --color-border`, radius 6px, sfondo `--color-bg`, overflow hidden, pointer, flex centrato; `img` cover; `i` 36px `--color-text-disabled` |
| `.colest__foto` | colonna, gap 8px |
| `.colest__foto-row` | flex, gap 14px, `align-items: flex-start` |
| `.colest__foto-thumb` | `flex-shrink: 0`, 72×90, bordo dashed 1px, radius 6px, sfondo `--color-bg`; `i` 28px `--color-text-disabled`; `:hover` bordo `--color-primary-300` |
| `.colest__foto-btns` | flex wrap, centrati, gap 6px; `.colest__muted` a riga intera (`flex-basis: 100%`) 11.5px |
| `.colest__foto-del` | colore `--color-error` |
| `.colest__label` | Poppins 12px 600 `--color-primary` |
| `.colest__muted` | 400, `--color-text-inactive` |
| `.colest__hint` | margin 0, 12.5px, `--color-text-inactive` |
| `.colest__strutture` | colonna, gap 8px; `.colest__checks` flex wrap gap `8px 22px` |
| `.colest__stato` | colonna, gap 10px |
| `.colest__badge` | inline-flex, `align-self: flex-start`, gap 5px, altezza 22px, `padding: 0 9px`, radius 11px, 11px, 600, nowrap |
| `--attiva` | testo `--color-success`, sfondo `alpha(success, .12)` |
| `--in-scadenza` | testo `--color-warning`, sfondo `alpha(warning, .13)` |
| `--scaduta` | testo `--color-error`, sfondo `alpha(error, .1)` |
| `--futura` | testo `--color-text-inactive`, sfondo `alpha(text-inactive, .1)` |
| `.colest__docs` | colonna, gap 8px |
| `.colest__doc` | flex `space-between`, centrati, gap 14px, wrap, `padding: 10px 14px`, bordo 1px `--color-border`, radius 6px |
| `.colest__doc-label` | colonna, gap 4px; `.colest__doc-name` 13px 600 `--color-text-active` |
| `.colest__doc-main` | flex, gap 10px, wrap |
| `.colest__doc-file` | inline-flex, gap 6px, `max-width: 260px`, ellissi, nowrap, 12px, `--color-text-inactive`; icona `--color-primary` |
| `.colest__doc-date` | `width: 170px` |
| `.colest__duvri` | flex, gap 10px, wrap, `padding: 10px 14px`, radius 6px, 12.5px, `--color-text-active`; testo `flex: 1` `min-width: 200px`; `--ok` sfondo `alpha(success, .08)` icona success; `--warn` `alpha(warning, .1)` icona warning; `--ko` `alpha(error, .07)` icona error |
| `.colest__actions .colest__delete` | `margin-right: auto`, `--color-error` (due classi per battere `.sib-btn`) |

### 8.2 Modale nuova azienda
- `.modal__box.colest-modal`: `width: min(600px, calc(100vw - 48px))`; resta valido il `max-width: 480px` della taglia `md`, quindi la larghezza effettiva è al massimo 480px.
- `.colest-modal__body`: colonna, gap 14px. `.colest-modal__footer`: flex a destra, gap 8px, `margin-top: 18px`, `padding-top: 14px`, bordo superiore 1px `--color-border`.

### 8.3 Badge (documento HTML autonomo, `badgeEsterno.ts`)
Unica sorgente per anteprima e stampa: un documento `<!doctype html>` con `<title>Badge collaboratori esterni</title>` e stili inline in mm (formato CR80 85,6×54 mm). Il colore della banda è letto a runtime da `--chart-{colore}` del tema corrente (fallback `#204769`). I colori interni del badge sono fissi (non tematizzati).

Anteprima nella pagina (`BadgeAnteprima.sass`): `.badge-prev` block, senza bordo, `max-width: 100%`, sfondo trasparente; orizzontale `--h` = `calc(85.6mm + 12mm)` × `calc(54mm + 12mm)`; verticale `--v` = `calc(54mm + 12mm)` × `calc(85.6mm + 12mm)`; con retro, altezza `--h` = `calc(54mm * 2 + 18mm)`, `--v` = `calc(85.6mm * 2 + 18mm)` (fronte sopra, retro sotto). Il QR si rigenera solo quando cambia il suo contenuto.

Pagina del documento:
- anteprima: `body{margin:0;padding:6mm;display:flex;flex-direction:column;gap:6mm;background:transparent}`, `.card{box-shadow:0 1px 3px rgba(15,23,42,.12)}`;
- stampa `cr80`: `@page{size:{w}mm {h}mm;margin:0}`, una tessera per pagina (`page-break-after:always`, senza bordo né radius);
- stampa `a4`: `@page{size:A4;margin:10mm}`, tessere affiancate a capo con gap 4mm (`break-inside:avoid`).

Regole comuni: `*{box-sizing:border-box;print-color-adjust:exact}`; `body` font `'Open Sans', Arial, sans-serif`, colore `#1E293B`.
| Elemento | Stile |
|---|---|
| `.card` | w×h (orizzontale 85.6×54mm, verticale 54×85.6mm), bordo `0.3mm solid #CBD5E1`, radius 3mm, overflow hidden, colonna, sfondo `#fff` |
| `.band` | sfondo colore banda, testo `#fff`, flex `space-between`, gap 2mm, `padding: 1.6mm 3mm`, 2.3mm, 700; `.thin` padding `1.2mm 3mm`; `.cmt` ellissi; `.kind` maiuscolo, `letter-spacing: .2mm`, 1.9mm |
| `.main` | `flex:1`, gap 2.5mm, `padding: 2.5mm 3mm 1mm`; verticale: colonna centrata, testo centrato |
| `.photo` | 22×28mm (verticale 24×30mm), radius 1.5mm, sfondo `#E2E8F0`; `img` cover; iniziali 7mm 700 `#64748B` |
| `.name` | 3.9mm, 700, `line-height: 1.15`, `margin-bottom: 1.2mm` |
| `dl` | grid `auto 1fr`, gap `.4mm 1.5mm`, 2.3mm, `line-height: 1.3` (verticale: testo a sinistra); `dt` `#64748B`; `dd` 600, max 2 righe (`-webkit-line-clamp: 2`), `overflow-wrap: anywhere` |
| `.qr` | colonna centrata gap .6mm (verticale `margin-top:auto`); `img` 14×14mm (verticale 15×15mm); numero 1.8mm 700 |
| `.sub` | `padding: 0 3mm`, 1.7mm, `#B45309`, ellissi |
| `.foot` | `padding: 1mm 3mm 1.6mm`, 1.6mm, `#64748B`, bordo superiore `0.2mm solid #E2E8F0`, ellissi |
| `.back .txt` | `margin: 2.5mm 3mm 1.5mm`, 2.2mm, `line-height: 1.4` |
| `.back .contacts` | `margin: 0 3mm` |
| `.sign` | `margin: auto 3mm 2.5mm`, bordo superiore `0.2mm solid #94A3B8`, `padding-top: .6mm`, 1.6mm, `#64748B` |

Contenuto **fronte**:
- banda: a sinistra intestazione (o nome struttura), a destra «Collaboratore esterno»;
- foto o iniziali (prima lettera di nome + cognome, maiuscole);
- nome: «{COGNOME} {Nome}» (cognome per primo, come digitato);
- righe `dt`/`dd`, in ordine: «Impresa» (ragione sociale o nome azienda o «—»); «P. IVA» (se `mostraPartitaIva` e presente); «Nato/a il» (se `mostraNascita`); «Assunto/a il» (sempre); «Mansione» = nome categoria (se `mostraCategoria`); «Valido» = «{dal} – {al}» (se `mostraValidita`); date gg/mm/aaaa o «—»;
- QR (se `mostraQr`): immagine 220 px senza margine con payload `SIBYLLA-EST|{numeroBadge o id}|{cognome} {nome}|{autorizzatoAl}` e sotto il numero badge;
- in subappalto: riga «Subappalto · {autorizzazione}»;
- piede: dicitura + « · N. {numero}» se il QR è nascosto.

Contenuto **retro** (se `retro`): banda sottile (intestazione + «N. {numero}»); testo retro; `dl` «Impresa» (ragione sociale + « · {sede legale}»), «Contratto» «{numero} del {data}» (se presente), «Referente» «{nome} · {telefono}» (se presente); riga firma «Firma del titolare».

Tutti i valori sono sottoposti a escape HTML.

## 9. Responsività

| Soglia | Cambia |
|---|---|
| `@media (max-width: 900px)` | `.colest__grid` → 1 colonna (anche nella modale); `.colest__identity` → colonna (foto sopra i campi); griglia App Op! → 1 colonna |

- Le righe documento, il riquadro DUVRI, i pulsanti foto e la tessera vanno a capo con `flex-wrap`; la colonna destra della tessera ha base 260px.
- L'iframe del badge ha `max-width: 100%`.
- Nessuna tabella: niente scroll orizzontale. I nomi file vanno in ellissi (`title` nativo).
- Laptop 1366 px con sidebar: 3 colonne; 1920 px: 3 colonne più larghe, tessera e colonna foto affiancate.

## 10. Effetti e animazioni

- Hover sulla miniatura foto del badge: cambia il colore del bordo (`--color-primary-300`), senza transizione dedicata.
- Pulsanti, campi, toggle, modali, toast: transizioni dei componenti condivisi.
- Stampa: ritardo fisso di 400 ms prima di `print()` per far caricare foto e QR.
- `prefers-reduced-motion`: regola globale (animazioni/transizioni a 0.01ms).
- Nessuno skeleton/spinner (lo spinner c'è solo nell'archivio).

## 11. Accessibilità

- Miniature foto: `<button>` con `aria-label` («Carica la foto del badge», «Allega la foto» / «Sostituisci la foto»); `img` con `alt` («Foto del collaboratore», «Foto del badge»).
- Icone decorative `aria-hidden="true"`; il pulsante occhio del documento ha `aria-label="Visualizza"`.
- Iframe del badge con `title` «Anteprima badge di {nome} {cognome}».
- Campi obbligatori marcati `required` (asterisco dei componenti condivisi).
- Modali: Esc e fondale chiudono; ConfirmDialog con Esc = annulla.
- «Stampa badge» disabilitato con motivo nel `title`.

## 12. Criteri di accettazione

1. Da sidenav «Crea collaboratore esterno» si apre «Nuovo collaboratore esterno» con il sottotitolo esatto di §4.1; «Autorizzato dal» vale oggi e lo stato è «Autorizzato».
2. Il campo «N. badge» mostra «Assegnato al salvataggio» e non è modificabile; digitando il codice fiscale in minuscolo appare in maiuscolo.
3. La select «Azienda in appalto» elenca le 3 ditte seed e in fondo «+ Nuova azienda in appalto…», che apre la modale «Nuova azienda in appalto» con «Aggiungi azienda» disabilitato finché la ragione sociale è vuota.
4. Aggiungendo «Pulizie Rapide» la ditta risulta selezionata, compare il toast «Pulizie Rapide aggiunta ai fornitori di Purchasing» (titolo «Servizi in appalto») e la ditta è disponibile nel filtro Azienda dell'Archivio.
5. Scegliendo la categoria «Facchino» l'hint dice «App Op!: Front Office, Magazzino», «Autorizzato fino al» si compila a inizio + 6 mesi − 1 giorno e l'hint dice «Massimo 6 mesi: entro il …».
6. Con fine oltre il limite compare l'errore sul campo «Oltre la durata massima della categoria» e il salvataggio mostra «Per la categoria «Facchino» l’autorizzazione dura al massimo 6 mesi (fino al …).»
7. Con la categoria «Addetto pulizie» la sezione Documenti mostra 4 righe «Mancante» e il banner «Documentazione incompleta: Contratto d’appalto, DURC, Formazione sicurezza, Documento d’identità.»; caricando il DURC con scadenza ieri la riga mostra «Scaduto» e il DURC resta nel banner.
8. Con l'azienda «Tecno Impianti Hotel» il riquadro DUVRI è arancio con «DUVRI rev. 1 non ancora sottoscritto dall’impresa»; con «Movi Facchinaggio» è rosso «DUVRI dell’appalto non allegato»; con «Splendor Servizi Integrati» è verde con l'icona scudo.
9. In una scheda nuova, nella sezione App Op! (modulo attivo) compare il banner info «Salva la scheda per poter inviare il token di invito.» e il pulsante di invio è disabilitato; il grado è «Impiegato · collaboratore esterno» e non ci sono i toggle Responsabile/HR.
10. Senza foto compaiono i due avvisi del badge (foto e data di assunzione) e il badge mostra le iniziali; caricando un'immagine 16:9 il badge mostra una foto 4:5 e compare il toast «Foto allegata al badge: salva la scheda per conservarla.»
11. «Registra collaboratore» senza nome mostra «Nome e cognome sono obbligatori.»; con dati validi compare «{Nome} {Cognome} registrato tra i collaboratori esterni», la pagina diventa «Modifica collaboratore esterno» con N. badge «EST-0004» (con i 3 seed) e «Stampa badge» abilitato.
12. Aprendo Karim Benali (autorizzazione al 31/10/2026, oggi 05/11/2026) lo stato è «Scaduto» (rosso) e il blocco App Op! dice «Autorizzazione scaduta il 31/10/2026: rinnovala per invitare il collaboratore.»
13. «Elimina» apre la conferma «Elimina collaboratore esterno» con il testo esatto di §5.7; confermando si torna all'Archivio sulla scheda «Collaboratori esterni» e la riga non c'è più.
14. «Stampa badge» apre una finestra con la tessera 85,6×54 mm (fronte e retro) disposte su A4 e lancia la stampa; con i pop-up bloccati compare il toast d'errore di §5.8.
15. Sotto 900 px di viewport la griglia è a una colonna e la foto sta sopra i campi; la tessera e la colonna destra vanno una sotto l'altra quando lo spazio non basta.
16. In tema scuro le sezioni usano superficie `#1A1E26` e header `#12151B`; la banda del badge usa `--chart-1` scuro `#4A8BC9`.

## 13. File sorgente

- `src/router/PageContent.tsx`
- `src/modules/hr/CollaboratoreEsterno/CollaboratoreEsterno.tsx`, `CollaboratoreEsterno.sass`
- `src/modules/hr/_badge/BadgeAnteprima.tsx`, `BadgeAnteprima.sass`, `badgeEsterno.ts`, `fotoTessera.ts`
- `src/store/useCollaboratoriEsterniStore.ts`
- `src/store/useHrConfigStore.ts` (categorie esterni, badge, `DOCUMENTI_ESTERNI`)
- `src/store/useCatalogoStore.ts`, `src/admin/SibyllaAdminPanel/catalogo/types.ts`, `src/admin/SibyllaAdminPanel/catalogo/mockData.ts`
- `src/store/useAnagraficaOpStore.ts`, `src/store/useConfirmStore.ts`
- `src/modules/appop/OpAccessoAnagrafica.tsx`, `OpAccessoAnagrafica.sass`, `OpInvitoModal.tsx`, `invitoAnagrafica.ts`, `appOpSibylla.ts`, `opApi.ts`, `opCatalogo.ts`
- `src/hooks/useModuloAttivo.ts`, `src/hooks/useStrutturaCorrente.ts`
- `src/modules/impostazioni/Configuratore/panes/HrAziendeAppalto/HrAziendeAppalto.tsx`, `src/modules/impostazioni/Configuratore/panes/AppOp/AppOp.tsx` (punti d'ingresso)
- `src/core/components/Modal.tsx`, `ConfirmDialog.tsx`, `PageHead.tsx`
- `src/navigation/menu.ts`, `pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`
- `src/styles/_themes.sass`, `_colors.sass`, `_spacing.sass`, `_components.sass`
