# 10 · Piano ferie

> Scheda di riproduzione della pagina `hr-piano-ferie`. Segue `_SCHEMA.md`. Componenti condivisi e regole UI: `00-fondamenta.md`. Entità e store condivisi (`RichiestaAssenza`, `useHrGestioneStore`, saldi): `01-modello-dati-e-api.md`.
>
> Il calendario dipendenti × giorni, con dettaglio, modifica, spostamento, nuova richiesta, approvazione/rifiuto/sollecito/eliminazione e storico, è il componente **`GestioneRichieste` + `RichiesteCalendario`** descritto per intero in **`09-richieste.md`** (§3, §4.5–4.13, §5.3–5.12, §8.2, §8.3). Qui si descrivono la pagina, i piani, le regole e le **opzioni** con cui il calendario è usato (limiti del periodo, allerta giorno, segnalazione regole, colonna Residue, sola lettura).

---

## 1. Scopo e utenti

Pagina dell'**ufficio del personale** per organizzare le ferie dei **periodi festivi** (Natale, Pasqua, estate, Ferragosto…).

- L'HR apre un **piano** per periodo: nome, date, **termine** entro cui i dipendenti chiedono le ferie dall'App Op!, **regole** (giorni consecutivi massimi, presenza minima per reparto, ferie entro i residui con un eventuale saldo negativo concedibile solo dall'HR) e un **avviso ai dipendenti** mostrato nell'App Op!.
- Nel piano contano solo le richieste di **Ferie** che cadono nel periodo. Il calendario mostra solo i mesi del piano, vela i giorni fuori periodo, segnala i giorni in cui un reparto scende sotto la presenza minima e i dipendenti che violano le regole, e riporta in fondo a ogni riga le ferie **Residue**.
- Sulle richieste del piano l'HR fa tutto ciò che fa in Richieste (dettaglio, approva con autorizzazione del negativo, rifiuta, sposta, inserisce, elimina).
- A periodo gestito il piano si **chiude e archivia**: resta nello **storico dei piani** con la **fotografia** delle ferie a quella data (sola lettura), anche se poi le richieste cambiano. Si può riaprire.
- Senza piano, il **Calendario generale** mostra tutte le assenze (tutti i tipi) mese per mese.

## 2. Accesso

- **Id pagina / route**: `hr-piano-ferie` (router: `<PianoFerie navigate={navigate}/>`, unica prop `navigate`).
- **Voce di menu**: `Impresa › Human Resources › Gestione delle presenze › Gestione ferie e permessi › Piano ferie` (`{id:"hr-piano-ferie",label:"Piano ferie",page:"hr-piano-ferie"}`), identica nei menu standard, Tour Operator e Ristoranti. Icona di menu `fa-calendar-days`.
- **Breadcrumb** (topbar): «Human Resources» › «Gestione delle presenze» › «Gestione ferie e permessi» › «Piano ferie».
- **Sottotitolo di menu** (`pageSubtitles.ts`): «Le assenze del personale nel mese, reparto per reparto».
- **Deep link**: nessuno. Il piano scelto non è nell'URL.
- **Ci si arriva da**: sidenav; Richieste (pulsante «Piano ferie»); Turni del personale (pulsante che naviga a `hr-piano-ferie`).
- **Si naviga verso**: `home` (Indietro), `hr-richieste-ferie` (pulsante «Richieste»).

## 3. Layout

Root `.pfe`: colonna flex, `align-items: stretch`, `gap: 12px`, `font-size: 13px`, container `pianoferie` (`container-type: inline-size`). Nessuna stat-card in cima: i conteggi stanno nella striscia del piano.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                 Piano ferie                [⊕ Nuovo piano ferie] │ PageHead
│          Natale 2026: le ferie chieste per il periodo, reparto per reparto    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Piano [Natale 2026 · aperto ▾]  Reparto [Tutti i reparti ▾]  ☑ Anche da approvare
│                                   [⟲ Storico piani] [☰ Richieste (7)] [■xls]  │ toolbar
├─┬────────────────────────────────────────────────────────────────────┬───────┤
│▌│ ☂ Natale 2026   ✔ Aperto   01/12/2026 → 07/01/2027 · richieste entro │ [✎]   │ striscia
│▌│ il 20/11/2026 (tra 15 giorni)                                       │ [🗄][🗑]│ piano
│▌│ 9 richieste: 3 approvate (14 gg, 3 dipendenti) · 5 da approvare ·   │       │
│▌│ 1 al responsabile · 1 rifiutate   ⚖ Regole del piano  💬 Avviso ai… │       │
├─┴────────────────────────────────────────────────────────────────────┴───────┤
│ [‹] Dicembre 2026 [›]  9 richieste nel mese                                   │ calendario
│ ● Ferie ● ROL ● Permesso ● Malattia │ ▭ Approvata ┅ In attesa ▬ Rifiutata ▨ Fuori dal periodo
├──────────────┬──┬──┬ … ┬──┬─────────┤
│ Dipendente   │ 1│ 2│   │31│ Residue │  (giorni con reparto sotto soglia: fondo rosso tenue)
│              │ M│ M│   │ G│         │
├──────────────┼──┴──┴ … ┴──┼─────────┤
│ Andrea G. ⚠  │ [☂ Ferie ]  │  23 gg  │
└──────────────┴─────────────┴─────────┘
```

Blocchi:
1. **PageHead** con un'azione a destra (pulsante primario «Nuovo piano ferie»).
2. **Toolbar** `.pfe__toolbar` (flex, `align-items: flex-end`, `gap: 10px`, wrap; figli `min-width: 0`): Select «Piano» (260px), Select «Reparto» (190px), Checkbox «Anche da approvare» (contenitore alto 34px, centrato), gruppo a destra `.pfe__push` (`margin-left: auto`, flex, centrato, **`gap: 14px`**): «Storico piani», «Richieste», icona Excel 34×34.
3. **Striscia del piano** `.pfe-piano` (solo se è selezionato un piano): flex, `align-items: center`, `gap: 16px`, `padding: 8px 14px`; a sinistra il blocco info (2 righe), a destra le azioni a icona.
4. **Calendario** (`GestioneRichieste`, vedi scheda 09) con le opzioni di §5.4.
5. **Modali**: Nuovo/Modifica piano ferie (md, 480px), Storico piani ferie (xl, 780px), più tutte le modali del calendario (Dettaglio, Modifica/Nuova richiesta, Rifiuta) e le conferme.

## 4. Elementi e testi

### 4.1 PageHead
- Titolo: «Piano ferie».
- Sottotitolo: con un piano selezionato «{nome piano}: le ferie chieste per il periodo, reparto per reparto» (es. «Natale 2026: le ferie chieste per il periodo, reparto per reparto»); con il Calendario generale «Le assenze del personale nel mese, reparto per reparto».
- Azione: `sib-btn sib-btn--primary` con icona `fa-duotone fa-circle-plus` 14px (currentColor) e testo «Nuovo piano ferie».
- Indietro → `navigate('home')`.

### 4.2 Toolbar
- SelectField `name="piano"`, label «Piano», classe `.pfe__field.pfe__field--piano`. Opzioni, in quest'ordine:
  1. piani **aperti** ordinati per data di inizio crescente: «{nome} · aperto»;
  2. piani **archiviati** ordinati per data di inizio decrescente: «{nome} · archiviato»;
  3. «Calendario generale (tutte le assenze)» (valore `generale`).
- SelectField `name="reparto"`, label «Reparto», opzioni «Tutti i reparti», «Front office», «F&B», «Housekeeping», «Manutenzione», «Cucina», «Amministrazione».
- CheckboxField `name="con-attesa"`, label «Anche da approvare» (default spuntato).
- Pulsante `sib-btn--secondary` con `fa-solid fa-clock-rotate-left` «Storico piani».
- Pulsante `sib-btn--secondary` con `fa-duotone fa-list-check` 13px, testo «Richieste» oppure «Richieste ({N})» se N > 0, dove N = richieste in attesa (Al responsabile + Da approvare) di qualsiasi tipo e periodo. Tooltip: «{N} richieste da decidere» se N > 0, altrimenti «Vai alle richieste».
- Pulsante icona `.pfe__icon-btn` (34×34, primary) con `fa-regular fa-file-xls` 16px bianco, `aria-label` e Tooltip «Esporta in Excel».

### 4.3 Striscia del piano (`.pfe-piano`, variante `--arch` se archiviato)
Riga 1 (`.pfe-piano__riga`):
- Nome `.pfe-piano__nome`: icona `fa-solid fa-umbrella-beach` (aperto) o `fa-solid fa-box-archive` (archiviato) + nome del piano.
- Stato `.pfe-piano__stato--open|--arch`: icona `fa-solid fa-circle-check` + «Aperto» oppure `fa-solid fa-lock` + «Archiviato» (icona e testo, niente pillola).
- Meta `.pfe-piano__meta`: «gg/mm/aaaa → gg/mm/aaaa» seguito da:
  - se c'è il termine e il piano è archiviato: « · richieste entro il gg/mm/aaaa»;
  - se aperto e il termine non è passato: « · richieste entro il gg/mm/aaaa (oggi)» / «(domani)» / «(tra {n} giorni)»;
  - se aperto e il termine è passato: « · termine scaduto il gg/mm/aaaa»;
  - se archiviato: « · archiviato il gg/mm/aaaa da {autore}».

Riga 2 (`.pfe-piano__riga--sub`):
- Conteggi `.pfe-piano__conta`: «**{tot}** richiesta|richieste: **{approvate}** approvate ({giorni} gg, {d} dipendente|dipendenti)» + « · {n} da approvare» (in arancio, `.pfe-piano__attesa`) se n > 0 + « · {n} al responsabile» se n > 0 + « · {n} rifiutate» se n > 0.
- «Regole del piano» `.pfe-piano__regole` con icona `fa-solid fa-scale-balanced`; Tooltip con le regole in parole separate da « · » (§6.4).
- Solo se il piano ha un avviso: «Avviso ai dipendenti» con icona `fa-solid fa-comment`; Tooltip con il testo dell'avviso.

Azioni `.pfe-piano__acts` (pulsanti icona `.pfe-piano__ico`, ognuno con Tooltip uguale all'`aria-label`):
- aperto: `fa-solid fa-pen` «Modifica il piano», `fa-solid fa-box-archive` «Chiudi e archivia»;
- archiviato: `fa-solid fa-box-open` «Riapri il piano»;
- sempre: `fa-solid fa-trash` «Elimina piano».

### 4.4 Calendario (opzioni specifiche)
Tutti gli elementi di `09-richieste.md` §4.5–4.8, con queste differenze:
- **Niente pulsante «Oggi»**; ‹/› disabilitati ai bordi del periodo (solo con un piano).
- Legenda con in più il campione «Fuori dal periodo» (solo con un piano).
- Colonna finale (64px) con intestazione «Residue» e Tooltip «Giorni di ferie ancora disponibili nell'anno»; valore per dipendente «{n} gg», in arancio (`.pfe__res--low`) se n ≤ 3.
- Intestazione del giorno con allerta (fondo rosso tenue, numero rosso) e Tooltip:
  - con un piano: «{Reparto}[, {Reparto}…] sotto il {pct}% di presenza»;
  - con il Calendario generale: «{n} assenti: controlla la copertura dei turni».
  Se il giorno è anche festivo il Tooltip unisce i due testi con « · » (es. «Natale · Front office sotto il 50% di presenza»).
- Accanto al nome del dipendente, se viola le regole del piano: `fa-solid fa-triangle-exclamation` arancio (warn) o rosso (ko), Tooltip con i testi delle violazioni uniti da uno spazio, `aria-label="Regole del piano non rispettate"`.

### 4.5 Modale «Nuovo piano ferie» / «Modifica piano ferie» (size `md`)
Root `.pfm`. Campi in ordine:
1. Solo per il nuovo piano: «Modelli rapidi» (etichetta `.pfm__label`) e 4 chip `.pfm__chip` con icona `fa-solid fa-umbrella-beach` e il nome del prossimo periodo non ancora finito: «Natale {anno}», «Pasqua {anno}», «Estate {anno}», «Ferragosto {anno}» (§6.5).
2. InputField «Nome del piano» (`pf-nome`, obbligatorio, placeholder «Natale 2026»).
3. DateRangeField «Periodo» (`pf-dal`/`pf-al`, obbligatorio).
4. Nota `.pfm__hint` con `fa-solid fa-circle-info`: «Nel piano contano solo le ferie che i dipendenti chiedono per questo periodo; i giorni che escono dal periodo non vengono registrati.»
5. Se il periodo si sovrappone ad altri piani aperti: `.pfm__hint--warn` con `fa-solid fa-triangle-exclamation`: «Si sovrappone a «{nome}» (gg/mm/aaaa → gg/mm/aaaa)[, …]: le stesse ferie compariranno in entrambi.»
6. DatePickerField «Richieste entro il» (`pf-scad`, `max` = data di inizio, larghezza max 260px), hint «Facoltativo: termine mostrato ai dipendenti nell'App Op!».
7. Fieldset «Regole del piano» (`.pfm__regole`, legenda in stile `.pfm__label`):
   - griglia 2 colonne: InputField «Giorni consecutivi massimi» (`pf-consec`, number, min 1, step 1, placeholder «Nessun limite», hint «Giorni di calendario di fila per persona, richieste attaccate comprese») e InputField «Presenza minima (%)» (`pf-presenza`, number, min 0, max 100, step 5, placeholder «Nessun limite», hint «Quota di ogni reparto che deve restare in servizio ogni giorno»);
   - CheckboxField «Le ferie restano entro i giorni residui della persona» (`pf-residui`);
   - solo se spuntata: InputField «Saldo negativo concedibile (giorni)» (`pf-negativo`, number, min 0, step 1, larghezza max 260px), hint «Oltre i residui si va in negativo solo con l'approvazione dell'ufficio del personale; 0 = mai».
8. TextareaField «Avviso ai dipendenti» (`pf-note`, 2 righe), hint «Lo vedono nell'App Op! quando chiedono le ferie del periodo».
9. Azioni: «Annulla» (secondary) e «Crea piano» (nuovo) / «Salva modifiche» (modifica), primary.

Messaggi di validazione:
- nome vuoto: «Dai un nome al piano, ad esempio "Natale 2026"»;
- periodo incompleto: «Indica il periodo del piano»; fine prima dell'inizio: «La data di fine precede quella di inizio»;
- termine successivo all'inizio: «Il termine per le richieste deve cadere prima dell'inizio del piano» (uguale all'inizio è ammesso);
- giorni consecutivi non intero o < 1: «Un numero intero di giorni, almeno 1»;
- presenza non intera o fuori 0–100: «Una percentuale da 0 a 100»;
- negativo (solo se entro i residui) non intero o < 0: «Un numero intero di giorni, 0 se mai».

### 4.6 Modale «Storico piani ferie» (size `xl`)
Tabella `.sib-table.pfe-sto__table` (`table-layout: fixed`), colgroup: Piano 16%, Periodo 27%, Stato 12%, Approvate 11%, Giorni 11%, Archiviato 13%, Azioni 10%.
- Intestazioni: «Piano», «Periodo», «Stato» (ThLabel), «Approvate» (destra, Tooltip «Ferie approvate nel piano»), «Giorni» (destra, Tooltip «Giorni lavorativi di ferie approvati»), «Archiviato», «Azioni» (centro).
- Righe: prima gli aperti (per inizio crescente), poi gli archiviati (per inizio decrescente). Celle: nome (grassetto, TruncatedText), «gg/mm/aaaa → gg/mm/aaaa» (TruncatedText), stato «Aperto» (verde) / «Archiviato» (grigio), n. ferie approvate, «{n} gg», data di archiviazione gg/mm/aaaa oppure «-» grigio.
- Azioni (icone 16px primary, gap 12px): `fa-solid fa-eye` Tooltip «Apri il piano» (`aria-label` «Apri {nome}») → seleziona il piano e chiude la modale; `fa-regular fa-file-xls` Tooltip «Esporta in Excel» (`aria-label` «Esporta {nome}») → export del piano.
- Nessun piano: riga unica (colspan 7) «Nessun piano ferie: creane uno con «Nuovo piano ferie».»
- Piede: «Chiudi» (primary, a destra).

## 5. Stati e interazioni

### 5.1 Stato iniziale
- Piano selezionato: tra i piani **aperti** ordinati per inizio, il primo che non è ancora finito (`al ≥ oggi`), altrimenti il primo aperto; se non ce ne sono, «Calendario generale». Se il piano selezionato viene eliminato o non esiste più si torna al Calendario generale.
- Reparto «Tutti i reparti»; «Anche da approvare» spuntato; nessuna modale.
- Mese iniziale del calendario: con un piano, il mese di oggi se è dentro il periodo del piano, altrimenti il **primo mese del piano**; cambiando piano si riparte dal suo mese. Con il Calendario generale, il mese di oggi.

### 5.2 Cosa disegna il calendario
Le **rifiutate non compaiono mai** (né nel piano né nel generale). Una richiesta è visibile se `stato = Approvata` oppure (checkbox spuntata e stato in attesa: Al responsabile o Da approvare).
- **Piano aperto**: richieste di **Ferie** che si sovrappongono al periodo (`dal ≤ piano.al && al ≥ piano.dal`), dal vivo, con le loro date intere; i giorni fuori periodo sono velati.
- **Piano archiviato**: le righe della **fotografia** (già tagliate ai confini del piano) filtrate per stato, disegnate come Ferie con le note prese dalla richiesta viva (se esiste ancora). Calendario in **sola lettura**: clic, trascinamento e tasto destro sulle caselle non fanno nulla (sulle caselle vuote compare il menu nativo del browser; sulle barre il menu nativo è soppresso senza azione).
- **Calendario generale**: tutte le richieste di ogni tipo (Ferie, ROL, Permesso, Malattia), mese per mese.

### 5.3 Toolbar
- Cambio piano → striscia, sottotitolo, calendario, export e mese iniziale si aggiornano.
- Cambio reparto → calendario limitato al reparto; anche l'allerta del giorno considera solo i reparti visibili.
- Checkbox → mostra/nasconde le richieste in attesa (le allerte contano comunque solo le approvate).
- «Storico piani» apre la modale §4.6. «Richieste» naviga a `hr-richieste-ferie`.

### 5.4 Opzioni del calendario passate dalla pagina
- `limiti = { dal: piano.dal, al: piano.al }` (solo con un piano): mesi navigabili dal mese di inizio al mese di fine; giorni fuori velati (`.rfc__fuori`).
- `allertaGiorno(iso)`:
  - con un piano: `null` se il giorno è fuori periodo o il piano non ha presenza minima; altrimenti i reparti visibili per cui `assenti approvati del giorno > assentiConsentiti(n. dipendenti del reparto, pct)`; testo «{reparti separati da ", "} sotto il {pct}% di presenza»;
  - con il Calendario generale: `n` = dipendenti visibili assenti quel giorno con richieste approvate; se `n ≥ 3` testo «{n} assenti: controlla la copertura dei turni».
- `segnalaDipendente(id)`: solo con un piano **aperto**; per ogni richiesta di Ferie del dipendente non rifiutata e sovrapposta al periodo, `verificaRegole` (§6.3) **senza** la presenza minima (che sta sui giorni); esiti deduplicati per testo; livello `ko` se almeno uno è ko, altrimenti `warn`.
- `colonnaFinale`: «Residue» = `ferieAnnue − ferieGodute(dipendente, anno del mese visualizzato)` in giorni.
- `solaLettura = piano archiviato`.

Interazioni sul calendario (piano aperto o generale): identiche a `09-richieste.md` §5.4–5.12 (dettaglio al clic, modifica col tasto destro su una barra, spostamento per trascinamento con anteprima e conferma, nuova richiesta già decisa dal tasto destro su una casella vuota, approva con autorizzazione del saldo negativo e controllo ROL, rifiuta con motivo, sollecita il responsabile, elimina con conferma). Nella conferma del saldo negativo il piano di riferimento è quello aperto che contiene la richiesta (testo «oltre il negativo consentito da «{piano}» ({n} gg)» oppure «entro il limite di «{piano}»»).

### 5.5 Nuovo piano
1. «Nuovo piano ferie» → modale vuota con le regole di default: giorni consecutivi **10**, presenza minima **50**, entro i residui **sì**, negativo **2**. Nessun piano selezionato per la modifica.
2. Clic su un modello rapido → compila nome, periodo e termine (le regole restano) e azzera gli errori.
3. «Crea piano» → validazioni (§4.5). Campi numerici vuoti = nessun limite. Se «entro i residui» non è spuntata il negativo salvato è 0.
4. Creato con stato Aperto, `creatoDa` = utente, e **selezionato** subito. Toast successo «Piano creato»: ««{nome}» è aperto: i dipendenti possono chiedere le ferie del periodo dall'App Op![ entro il gg/mm/aaaa].»

### 5.6 Modifica piano
Icona matita (solo aperto) → modale precompilata (senza modelli rapidi). «Salva modifiche» → toast successo «Piano modificato»: «Piano «{nome}» aggiornato.» L'avviso di sovrapposizione considera gli altri piani aperti escluso quello in modifica.

### 5.7 Chiudi e archivia
Conferma: titolo «Chiudi e archivia», testo «Chiudi «{nome}» e lo salvi nello storico? Resta la fotografia di oggi: **{n} ferie approvate ({g} gg)**.[ Attenzione, una richiesta è ancora da decidere. | Attenzione, {N} richieste sono ancora da decidere.]» (N = da approvare + al responsabile), pulsante «Archivia» (non distruttivo). Confermato → stato Archiviato, data e autore dell'archiviazione, fotografia di tutte le ferie del piano (§6.2). Toast successo «Piano archiviato»: ««{nome}» è nello storico dei piani.» Il piano resta selezionato, ora in sola lettura.

### 5.8 Riapri
Conferma: titolo «Riapri il piano», testo «Riapri «{nome}»? Torna a mostrare le ferie dal vivo e la fotografia dell'archiviazione viene sostituita alla prossima chiusura.», pulsante «Riapri» (non distruttivo). Confermato → stato Aperto, fotografia/data/autore dell'archiviazione rimossi. Toast info «Piano riaperto»: ««{nome}» è di nuovo aperto.»

### 5.9 Elimina piano
Conferma: titolo «Elimina piano», testo «Eliminare il piano «{nome}»? Le richieste di ferie dei dipendenti restano in Richieste, si perde solo il piano[ e la sua fotografia nello storico]. L'operazione non si può annullare.», pulsante «Elimina» **rosso**. Confermato → piano rimosso, selezione al Calendario generale. Toast info «Piano eliminato»: «Piano «{nome}» eliminato.»

### 5.10 Export Excel
- Con un piano: file `piano-ferie_{nome in minuscolo con gli spazi sostituiti da "-"}.xls` (es. `piano-ferie_natale-2026.xls`), colonne «Dipendente», «Reparto», «Dal», «Al», «Giorni lavorativi», «Stato»; righe = ferie del piano (dal vivo o fotografia, **tutti gli stati, rifiutate comprese**, tagliate ai confini), ordinate per inizio. Lo stesso export dalla riga dello Storico piani.
- Calendario generale: `calendario-assenze.xls`, colonne «Dipendente», «Reparto», «Tipo», «Dal», «Al», «Stato»; righe = richieste visibili sul calendario (stati secondo la checkbox) dei dipendenti del reparto filtrato, tutti i mesi, ordinate per inizio.
- Toast «Esportazione completata»: «{N} righe esportate in Excel.»

### 5.11 Stati vuoti, caricamento, errore
- Nessun piano: la select ha solo «Calendario generale (tutte le assenze)», la striscia non compare, lo Storico mostra la riga vuota.
- Piano senza ferie: striscia «0 richieste: 0 approvate (0 gg, 0 dipendenti)», calendario con caselle vuote.
- Caricamento/errore: oggi non esistono (dati locali); con il backend usare skeleton/spinner e toast di errore standard (fondamenta).

## 6. Dati e regole di business

### 6.1 Entità `PianoFerie`
| Campo | Tipo | Note |
|---|---|---|
| `id` | string | `pf-…` |
| `nome` | string | es. «Natale 2026» |
| `dal`, `al` | `aaaa-mm-gg` | periodo |
| `scadenzaRichieste?` | `aaaa-mm-gg` | termine per chiedere dall'App Op!, ≤ `dal` |
| `regole` | `RegolePiano` | §6.3 |
| `note?` | string | avviso ai dipendenti (App Op!) |
| `stato` | `'Aperto' \| 'Archiviato'` | |
| `createdAt`, `creatoDa` | ISO, string | |
| `archiviatoAt?`, `archiviatoDa?` | ISO, string | solo se archiviato |
| `archivio?` | `FerieArchiviate[]` | fotografia alla chiusura |

`RegolePiano`: `maxGiorniConsecutivi?: number` (giorni di calendario di fila per persona, richieste attaccate comprese), `presenzaMinimaReparto?: number` (% del reparto che resta in servizio ogni giorno), `entroResidui: boolean`, `negativoMax: number` (giorni oltre il residuo concedibili con l'ok HR; 0 = mai). Default `{ 10, 50, true, 2 }`.

`FerieArchiviate`: `{ richiestaId, dipendenteId, dal, al (tagliate ai confini), stato, giorni (lavorativi lun-sab) }`.

### 6.2 Ferie del piano e riepilogo
- `feriePiano(richieste, p)` = richieste di tipo **Ferie** con `r.dal ≤ p.al && r.al ≥ p.dal`, tagliate: `dal = max(r.dal, p.dal)`, `al = min(r.al, p.al)`, `giorni = giorniLavorativi(dal, al)`; tutti gli stati.
- `feriePianoCorrenti` = la fotografia se archiviato, altrimenti `feriePiano` dal vivo.
- Riepilogo (striscia, conferma di archiviazione, storico): `tot` = n. righe; `approvate` = n. Approvate; `giorniOk` = Σ giorni delle Approvate; `daApprovare`, `alResp`, `rifiutate` = conteggi per stato; `dipendenti` = dipendenti distinti con ferie approvate.
- Termine: `traGiorni = giorni di calendario tra oggi e scadenza` (0 «oggi», 1 «domani», n «tra n giorni», negativo → «termine scaduto»).

### 6.3 Regole (condivise con la valutazione di Sibylla in Richieste)
- `assentiConsentiti(n, pct) = pct == null ? n : max(0, n − ceil(n × pct / 100))`. Esempi: reparto di 3 al 50% → 1 assente consentito; reparto di 2 al 50% → 1.
- `pianoDi(r)` = primo piano **Aperto** sovrapposto a una richiesta di Ferie.
- `bloccoConsecutivo(r)`: parte dal periodo della richiesta e lo estende finché esistono altre Ferie **non rifiutate** dello stesso dipendente che si sovrappongono o sono **attaccate** (iniziano il giorno dopo la fine o finiscono il giorno prima dell'inizio); `giorni` = giorni di calendario del blocco.
- `saldoDopo(r) = saldoFerie(dip, anno di r.dal).residue − (r.stato = Approvata ? 0 : giorniLavorativi(r))`.
- `giorniSottoPresenza(r)`: per ogni giorno della richiesta (limitato al periodo del piano), dipendenti distinti del reparto con richieste **Approvate** (esclusa questa) + il richiedente; se il numero supera `assentiConsentiti` il giorno è sotto soglia.
- `verificaRegole(r, piano)` (in ordine):
  1. se `maxGiorniConsecutivi` e blocco > max → (ko) «{giorni} giorni consecutivi (gg/mm/aaaa → gg/mm/aaaa): il piano «{nome}» ne consente al massimo {max}.»
  2. se `presenzaMinimaReparto` e ci sono giorni sotto soglia → (ko) «{reparto} sotto il {pct}% di presenza il gg/mm/aaaa.» (un giorno) oppure «… in {n} giorni (dal gg/mm/aaaa).»
  3. se `entroResidui` e `saldoDopo < 0`: se `−saldoDopo > negativoMax` → (ko) «Saldo a {saldo} gg: oltre il negativo consentito dal piano (massimo {negativoMax} gg).» oppure, con negativoMax 0, «… (nessuno).»; altrimenti (warn) «Saldo a {saldo} gg: il negativo è consentito solo con l'autorizzazione dell'ufficio del personale.»
- `descriviRegole` (Tooltip «Regole del piano»): «max {n} giorni consecutivi» (se impostato), «presenza minima {pct}% per reparto» (se impostata), e una fra «entro i residui (negativo fino a {n} gg con ok HR)» (entro i residui con negativo > 0), «entro i giorni residui» (negativo 0), «anche oltre i residui» (non entro i residui); unite da « · ».

### 6.4 Allerte
- Piano: giorno in periodo, reparto con `assenti approvati > assentiConsentiti`.
- Generale: soglia fissa `SOGLIA_ASSENTI = 3` assenti approvati fra i dipendenti visibili.
- Residue ≤ 3 gg → arancio.

### 6.5 Modelli rapidi
Per ogni festa si prende l'anno corrente se il periodo non è ancora finito (`al ≥ oggi`), altrimenti l'anno successivo; il nome è «{Festa} {anno}».
- Natale: dal `{y}-12-01` al `{y+1}-01-07`, termine `{y}-11-20`.
- Pasqua: da Pasqua −7 giorni a Pasqua +2, termine Pasqua −30 (Pasqua con l'algoritmo gregoriano anonimo).
- Estate: `{y}-06-01` → `{y}-09-30`, termine `{y}-04-30`.
- Ferragosto: `{y}-08-01` → `{y}-08-31`, termine `{y}-06-30`.

### 6.6 Dati demo (seed)
«Anno delle feste» `an` = anno corrente da febbraio, l'anno precedente a gennaio.
- «Natale {an}» (`pf-natale`): Aperto, `{an}-12-01` → `{an+1}-01-07`, termine `{an}-11-20`, regole `{ maxGiorniConsecutivi: 7, presenzaMinimaReparto: 50, entroResidui: true, negativoMax: 2 }`, avviso «Chiedete le ferie di Natale e Capodanno entro il 20 novembre: oltre quella data valutiamo solo i casi urgenti.», creato `{an}-10-15T09:00:00` da «Ufficio del personale». Lo alimentano le 10 ferie di Natale del seed delle richieste (scheda 09 §6.9).
- «Estate {an}» (`pf-estate`): Archiviato, `{an}-06-01` → `{an}-09-30`, termine `{an}-04-30`, regole `{ 15, 50, true, 0 }`, avviso «Due settimane a testa a rotazione, una in luglio o agosto e una a scelta.», creato `{an}-03-02T09:00:00`, archiviato `{an}-10-01T10:00:00` da «Ufficio del personale». Fotografia di 13 righe (`ra-est-1…13`, dipendente dal→al mm-gg): 1 07-06→07-17, 2 08-10→08-21, 3 08-17→08-28, 4 07-20→07-31, 5 08-03→08-14, 6 06-22→07-03, 7 08-24→09-04, 8 09-07→09-18, 9 08-10→08-14 **Rifiutata**, 9 08-31→09-11, 10 07-27→08-07, 11 06-15→06-26, 12 08-17→08-21; tutte le altre Approvate.
- **Persistenza attuale**: `zustand` persist in `localStorage`, chiave **`sibylla.hr-piani-ferie`**, **versione 3** (alla migrazione si rigenera il seed). Le richieste stanno in `sibylla.hr-gestione` v8.

## 7. Backend da realizzare

Oggi mock frontend. Contratto proposto:

| Metodo | Percorso | Uso |
|---|---|---|
| GET | `/Sibylla/hr/piani-ferie` | elenco piani (con riepilogo calcolato) |
| GET | `/Sibylla/hr/piani-ferie/{id}/ferie` | ferie del piano: dal vivo se aperto, fotografia se archiviato |
| POST | `/Sibylla/hr/piani-ferie` | crea |
| PUT | `/Sibylla/hr/piani-ferie/{id}` | modifica (solo se Aperto) |
| POST | `/Sibylla/hr/piani-ferie/{id}/archivia` | chiude e salva la fotografia |
| POST | `/Sibylla/hr/piani-ferie/{id}/riapri` | riapre e cancella la fotografia |
| DELETE | `/Sibylla/hr/piani-ferie/{id}` | elimina il piano (non le richieste) |
| GET | `/Sibylla/hr/piani-ferie/{id}/allerte?mese=2026-12` | facoltativo: `{ giorni: { "2026-12-24": ["Front office"] }, dipendenti: { "6": { livello: "ko", testi: [...] } } }` |

Esempi:

```http
POST /Sibylla/hr/piani-ferie
{ "nome": "Natale 2026", "dal": "2026-12-01", "al": "2027-01-07", "scadenzaRichieste": "2026-11-20",
  "regole": { "maxGiorniConsecutivi": 7, "presenzaMinimaReparto": 50, "entroResidui": true, "negativoMax": 2 },
  "note": "Chiedete le ferie di Natale e Capodanno entro il 20 novembre: …" }
→ 201 { "id": "pf-…", "stato": "Aperto", "createdAt": "…", "creatoDa": "Ufficio del personale", … }
→ 400 { "errore": "validazione", "campi": { "scad": "Il termine per le richieste deve cadere prima dell'inizio del piano" } }
```

```http
POST /Sibylla/hr/piani-ferie/pf-natale/archivia
→ 200 { "id": "pf-natale", "stato": "Archiviato", "archiviatoAt": "…", "archiviatoDa": "…",
        "archivio": [ { "richiestaId": "ra-24", "dipendenteId": 2, "dal": "2026-12-22", "al": "2026-12-27", "stato": "Approvata", "giorni": 5 } ] }
→ 409 { "errore": "gia_archiviato" }
```

- Validazioni lato server uguali a §4.5; regole numeriche `null` = nessun limite; `negativoMax` forzato a 0 se `entroResidui` è falso.
- `archivia` è **transazionale**: stato + fotografia (copia immutabile delle ferie del piano, tagliate, tutti gli stati) nello stesso commit; la fotografia non cambia più se le richieste cambiano. `riapri` la elimina.
- Le richieste sul calendario usano gli endpoint di `09-richieste.md` §7; il server applica le regole del piano nella valutazione e nel controllo del negativo (409 `saldo_negativo` con `piano.oltre`).
- **App Op!**: alla creazione/modifica di un piano aperto, i dipendenti vedono il piano nella richiesta ferie con termine e avviso (`GET /Sibylla/hr/app/piani-ferie-aperti`); facoltativa una notifica App Op! «nuovo piano ferie» a tutto il personale e un promemoria prima del termine. Chiusura/eliminazione: il piano sparisce dall'App Op!.

## 8. Stile

Token come in `09-richieste.md` §8 (valori chiaro → scuro). Il calendario usa `RichiesteCalendario.sass` (scheda 09 §8.2), le modali delle richieste `RichiesteFerie.sass` (§8.1), lo storico `StoricoHr.sass` (§8.3).

### 8.1 Pagina (`PianoFerie.sass`)
- `.pfe`: mixin `hr-root(pianoferie)` → flex colonna, `align-items: stretch`, `gap: 12px`, `font-size: 13px`, `container-type: inline-size`, `container-name: pianoferie`.
- `.pfe__toolbar`: flex, `align-items: flex-end`, `gap: 10px`, wrap, figli `min-width: 0`.
- `.pfe__field`: `width: 190px`, colonna, `gap: 6px`. `.pfe__field--piano`: `width: 260px`.
- `.pfe__check`: `height: 34px`, flex, `align-items: center`.
- `.pfe__push`: `margin-left: auto`, flex, centrato, `gap: 14px`.
- `.pfe__icon-btn`: 34×34, `border: 0`, `border-radius: 8px`, sfondo `--color-primary` (#204769 / scuro #6F9BCB), `color: #fff`, centrato, pointer; hover `filter: brightness(.92)`.
- `.pfe__res--low`: colore `--color-warning` (#F57D03 / #F5A623). (Il valore normale della colonna Residue eredita lo stile `.rfc__fin`: 600, text-active.)
- **Striscia** `.pfe-piano`: flex, centrato, `gap: 16px`, `padding: 8px 14px`, `border: 1px solid --color-border`, **`border-left: 3px solid --color-primary`**, `border-radius: --radius-md` (6px), sfondo `--color-surface`. `--arch`: bordo sinistro `--color-text-inactive`, sfondo `--color-bg` (#F8FCFF / #12151B).
  - `__info`: `flex: 1 1 auto`, `min-width: 0`, colonna, `gap: 3px`, 12px, text-active.
  - `__riga`: flex, wrap, centrato, `gap: 4px 14px`, `min-width: 0`; `--sub` 12px.
  - `__nome`: inline-flex, centrato, `gap: 8px`, `--font-heading` (Poppins) 14px 700, primary.
  - `__stato`: inline-flex, centrato, `gap: 5px`, 12px, 600; `--open` success (#007035 / #34D399); `--arch` text-inactive.
  - `__meta`: text-inactive. `__attesa`: warning, 600.
  - `__regole`: text-inactive, `cursor: help`; icona `margin-right: 5px`, primary.
  - `__acts`: `flex: 0 0 auto`, flex, centrato, `gap: 8px`.
  - `__ico`: 30×30, inline-flex centrato, `border: 0`, `border-radius: 6px`, nessuno sfondo, colore primary, **`font-size: 15px`**, pointer; hover sfondo `--color-primary-50` (#f2f5f6 / #232C3A).
- **Storico** `.pfe-sto`: colonna, `gap: 14px`, `padding: 4px 2px`. `.pfe-sto .pfe-sto__table`: `table-fit` (fixed, 100%, celle nowrap/overflow hidden/middle). Colonne `__col-nome` 16%, `__col-per` 27%, `__col-stato` 12%, `__col-n` 11%, `__col-chiuso` 13%, `__col-az` 10%. `__r` destra, `__c` centro (con antenato `.pfe-sto`). `__strong` 600 text-active. `__stato` 600; `--open` success, `--arch` text-inactive. `__dash` text-inactive. `__acts` inline-flex `gap: 12px`. `__act`: `padding: 0`, senza bordo/sfondo, primary, 16px, pointer. `__empty`: centro, text-inactive, `padding: 28px 0 !important`. `__foot`: flex, fine, `gap: 8px`, `padding-top: 4px`.
- Nel file ci sono altre classi (`.pfe__nav*`, `.pfe__mese`, `.pfe__legend*`, `.pfe__sw*`, `.pfe__table*`, `.pfe__bar*`, `.pfe__dom`, `.pfe__today`, `.pfe__group`, `.pfe__tot*`, `.pfe__fuori`, `.pfe__regola*`, `.pfe__nome*`, `.pfe-piano__note`, `.pfe-piano__del`, `.pfe__wrap`) residue della vecchia griglia: il JSX attuale **non le usa** e non vanno riprodotte.

### 8.2 Modale piano (`ModalePiano.sass`)
- `.pfm`: colonna, `gap: 14px`, `padding: 4px 2px`. `.pfm__grid`: grid `1fr 1fr`, `gap: 12px`. `.pfm__actions`: flex, fine, `gap: 8px`, `padding-top: 4px`.
- `.pfm__regole` (fieldset): `margin: 0`, `padding: 12px 14px`, bordo 1px border, radius 6px, colonna, `gap: 12px`; `legend` `padding: 0 6px`.
- `.pfm__scad`, `.pfm__neg`: `max-width: 260px`.
- `.pfm__modelli`: colonna, `gap: 6px`. `.pfm__label`: `--font-heading` 12px 600, primary (stesso stile delle label dei form).
- `.pfm__chips`: flex wrap, `gap: 8px`. `.pfm__chip`: `height: 30px`, `padding: 0 12px`, bordo 1px border, `border-radius: 999px`, sfondo surface, 12px, primary, pointer, inline-flex centrato, `gap: 6px`; hover sfondo primary-50.
- `.pfm__hint`: `margin: 0`, flex, `gap: 8px`, `padding: 8px 12px`, radius 6px, sfondo primary-50, 12px, text-active; icona `margin-top: 2px` primary. `--warn`: sfondo warning-light (#FFF3E0 / #2A2012), icona warning.

### 8.3 Tema scuro
Nessuna regola dedicata in `_skin-dark.sass`: tutto passa dai token (`[data-theme="dark"]`).

## 9. Responsività

- Container `pianoferie` `≤ 1360px`: Select «Piano» a **220px** (le altre regole della query riguardano classi non usate).
- Calendario: container `rfc` `≤ 1180px` → colonna Dipendente 136px, matrice 10px, barre compatte, stato sulle barre nascosto (scheda 09 §9). La colonna Residue resta 64px.
- Toolbar e striscia del piano vanno a capo (wrap) se lo spazio non basta; le azioni della striscia restano a destra (`flex: 0 0 auto`).
- Nessuno scroll orizzontale: matrice `table-layout: fixed` a `width: 100%`; tabella Storico con colonne in % e celle con ellipsis + Tooltip (TruncatedText).
- Laptop 1366px con sidebar aperta: calendario compatto; 1920px: layout standard.
- Modali: md 480px, xl 780px, `max-height: calc(100vh − 32px)` con scroll interno.

## 10. Effetti e animazioni

- Pulsanti icona della striscia e chip dei modelli: cambio di sfondo all'hover (senza transizione).
- Pulsante Excel: hover `brightness(.92)`.
- Calendario: effetti della scheda 09 §10 (sollevamento barre 150ms, trascinamento, menu); in sola lettura le barre non hanno cursore «grab».
- Nessuno skeleton/spinner. `prefers-reduced-motion: reduce` azzera le transizioni (regola globale).

## 11. Accessibilità

- Pulsanti a sola icona con `aria-label` e Tooltip identici («Modifica il piano», «Chiudi e archivia», «Riapri il piano», «Elimina piano», «Esporta in Excel», «Apri {nome}», «Esporta {nome}»).
- Fieldset con `legend` «Regole del piano» nella modale.
- Icona di violazione delle regole con `aria-label="Regole del piano non rispettate"`.
- Calendario: ruoli, tastiera e focus della scheda 09 §11; in sola lettura Invio/Spazio sulla barra non aprono nulla.
- Modali chiudibili con Esc; nella ConfirmDialog il pulsante di conferma ha il focus.

## 12. Criteri di accettazione

1. Con il seed e oggi a novembre, la pagina si apre su «Natale {anno} · aperto», sottotitolo «Natale {anno}: le ferie chieste per il periodo, reparto per reparto», calendario su **Dicembre** (primo mese del piano) senza pulsante «Oggi».
2. Con un piano, il pulsante ‹ è disabilitato sul primo mese e › sull'ultimo; i giorni fuori dal periodo sono velati a righe e la legenda mostra «Fuori dal periodo».
3. La striscia mostra nome con ombrellone, «Aperto» verde con spunta, periodo, «richieste entro il 20/11/{anno} (tra {n} giorni)» e i conteggi; il Tooltip di «Regole del piano» è «max 7 giorni consecutivi · presenza minima 50% per reparto · entro i residui (negativo fino a 2 gg con ok HR)».
4. Il calendario del piano mostra solo ferie (niente ROL/permessi/malattie), mai le rifiutate; togliendo «Anche da approvare» spariscono le richieste in attesa.
5. Un giorno in cui un reparto ha più assenti approvati di quelli consentiti ha l'intestazione rossa e il Tooltip «{Reparto} sotto il 50% di presenza».
6. Un dipendente con ferie oltre 7 giorni consecutivi nel piano ha l'icona di avviso rossa accanto al nome, con il testo «{n} giorni consecutivi (… → …): il piano «Natale {anno}» ne consente al massimo 7.»
7. La colonna «Residue» mostra «{n} gg» per ogni dipendente, in arancio se ≤ 3.
8. «Nuovo piano ferie» apre la modale con i 4 modelli rapidi e le regole 10 / 50 / spuntata / 2; cliccando «Estate» si compilano nome, periodo 01/06–30/09 e termine 30/04; con un termine dopo l'inizio compare «Il termine per le richieste deve cadere prima dell'inizio del piano».
9. Un periodo che si sovrappone a un piano aperto mostra l'avviso arancio «Si sovrappone a «…» (…): le stesse ferie compariranno in entrambi.»
10. Creando il piano compare il toast «Piano creato» e il piano diventa quello selezionato.
11. «Chiudi e archivia» chiede conferma con i numeri della fotografia e l'avviso sulle richieste ancora da decidere; dopo l'archiviazione la striscia è grigia con «Archiviato» e lucchetto, e il calendario è in sola lettura (clic e trascinamento non fanno nulla).
12. Il piano archiviato «Estate {anno}» mostra le 12 ferie approvate della fotografia anche se nel frattempo le richieste cambiano; «Riapri il piano» lo riporta dal vivo.
13. «Elimina piano» chiede conferma con pulsante rosso; dopo, la select torna a «Calendario generale (tutte le assenze)» e il toast è «Piano eliminato».
14. Nel Calendario generale compaiono tutti i tipi di assenza, c'è il pulsante «Oggi» e un giorno con almeno 3 assenti approvati ha il Tooltip «{n} assenti: controlla la copertura dei turni».
15. «Storico piani» elenca prima gli aperti poi gli archiviati con colonne 16/27/12/11/11/13/10%; l'occhio apre il piano e chiude la modale; l'icona xls esporta `piano-ferie_{nome}.xls`.
16. Il pulsante «Richieste ({N})» mostra le richieste in attesa e naviga alla pagina Richieste.
17. Su container ≤ 1360px la select Piano è larga 220px; su container calendario ≤ 1180px la colonna Dipendente è 136px; a nessuna larghezza compare lo scroll orizzontale.
18. Clic su una barra in un piano aperto apre «Dettaglio richiesta»; approvando ferie che vanno sotto zero oltre il negativo del piano, la conferma «Autorizza il saldo negativo» ha il pulsante rosso e cita «oltre il negativo consentito da «{piano}»».

## 13. File sorgente

- `src/modules/hr/PianoFerie/PianoFerie.tsx`, `PianoFerie.sass`
- `src/modules/hr/PianoFerie/ModalePiano.tsx`, `ModalePiano.sass`
- `src/modules/hr/PianoFerie/regolePiano.ts`
- `src/modules/hr/RichiesteFerie/GestioneRichieste.tsx`, `RichiesteCalendario.tsx`, `RichiesteCalendario.sass`, `RichiesteFerie.sass`
- `src/modules/hr/_storico/StoricoHr.tsx`, `StoricoHr.sass`
- `src/modules/hr/_hrGestione.sass`, `src/modules/hr/hrExport.ts`, `src/modules/hr/_presenze/presenze.model.ts`
- `src/store/usePianiFerieStore.ts`, `src/store/useHrGestioneStore.ts`, `src/store/useConfirmStore.ts`
- `src/core/components/ConfirmDialog.tsx`, `Modal.tsx`, `Tooltip.tsx`, `ThLabel.tsx`, `PageHead.tsx`, `src/core/icons/Ico.tsx`
- `src/styles/_themes.sass`, `_colors.sass`, `_spacing.sass`, `_mixins.sass`, `_components.sass`
- `src/navigation/menu.ts`, `menuTourOperator.ts`, `menuRistoranti.ts`, `pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`, `src/router/PageContent.tsx`
