# 09 · Richieste (ferie, ROL, permessi, malattia)

> Scheda di riproduzione della pagina `hr-richieste-ferie`. Segue `_SCHEMA.md`. Componenti condivisi (PageHead, Modal, Tooltip, TruncatedText, ThLabel, SelectField, TextareaField, InputField, DateRangeField, ConfirmDialog/useConfirmStore, toast, `.sib-btn`, `.sib-table`) e regole UI generali: vedi `00-fondamenta.md`. Entità condivise (`RichiestaAssenza`, `DipendenteHr`, `EventoHr`, store `useHrGestioneStore`, saldi ferie/ROL, iter del responsabile): vedi `01-modello-dati-e-api.md`. Qui è descritto tutto ciò che è specifico della pagina.
>
> Il calendario con le sue azioni (`GestioneRichieste` + `RichiesteCalendario`) è **condiviso** con la pagina Piano ferie (`10-piano-ferie.md`), che lo usa con opzioni aggiuntive (limiti del periodo, allerta giorno, segnalazione regole, colonna Residue, sola lettura). Questa scheda descrive il componente in modo completo; la scheda 10 descrive solo le opzioni.

---

## 1. Scopo e utenti

Pagina dell'**ufficio del personale** (responsabile/reparto HR della struttura) per gestire le richieste di assenza del personale: **Ferie**, **ROL** (riduzione orario di lavoro), **Permesso**, **Malattia**.

- Le richieste nascono dal dipendente nell'**App Op!**. Per **Ferie e ROL** c'è un iter a due livelli: prima decide il **responsabile di reparto** (sempre dall'App Op!), poi l'ufficio del personale dà l'approvazione definitiva. Permessi, malattia e richieste di reparti senza responsabile arrivano direttamente all'HR (stato «Da approvare»).
- L'HR vede tutto su un **calendario dipendenti × giorni del mese**; per ogni richiesta vede le ferie/ROL che resterebbero, i colleghi dello stesso reparto già assenti, la **valutazione di Sibylla**; approva, rifiuta (con motivo), sollecita il responsabile, modifica ogni valore, sposta per trascinamento, inserisce una richiesta già decisa (tasto destro su casella vuota), elimina.
- Le richieste approvate compaiono nel **Piano ferie**.
- Ogni intervento resta nello **storico** della richiesta (chi, quando, cosa, messaggio al dipendente).

Commento d'intestazione del componente (riassume la filosofia): «l'HR non ne crea di nuove, le gestisce», ma dal calendario può inserirne una già decisa (es. registrazione di una malattia telefonata).

## 2. Accesso

- **Id pagina / route**: `hr-richieste-ferie` (router: `if (page === 'hr-richieste-ferie') return <RichiesteFerie navigate={navigate}/>`). La pagina riceve solo la prop `navigate(pageId)`.
- **Voce di menu** (sidenav, menu standard `menu.ts`, e identica in `menuTourOperator.ts` e `menuRistoranti.ts`): `Impresa › Human Resources › Gestione delle presenze › Gestione ferie e permessi › Richieste` (`{id:"hr-richieste-ferie",label:"Richieste",page:"hr-richieste-ferie"}`). Icona di menu: `fa-inbox`. Colore del modulo Human Resources: `#9B59B6`.
- **Breadcrumb** (topbar, primo livello «Impresa» omesso): «Human Resources» › «Gestione delle presenze» › «Gestione ferie e permessi» › «Richieste» (ultimo elemento in stile `--last`).
- **Sottotitolo di menu** (`pageSubtitles.ts`, usato fuori dalla pagina): «Approva o rifiuta ferie, permessi e assenze del personale». Il sottotitolo reale mostrato nel PageHead è un altro (vedi §4).
- **Deep link**: nessuno (nessun parametro `hr-richieste-ferie:<x>`).
- **Ci si arriva da**: sidenav; Piano ferie (pulsante «Richieste»); Profile analysis (pulsante che naviga a `hr-richieste-ferie`).
- **Si naviga verso**: `home` (pulsante Indietro del PageHead), `hr-piano-ferie` (pulsante «Piano ferie»).

## 3. Layout

Root `.rfe`: colonna flex, `gap: 12px`, `font-size: 13px`, container `richiesteferie` (`container-type: inline-size`). Nessuna stat-card in cima.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                 Richieste                                        │  PageHead
│        Ferie e ROL arrivano qui dopo l'approvazione del responsabile ...      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Da approvare 4|Al responsabile 3|Approvate 18|Rifiutate 4|Tutte 33]          │  toolbar (flex, wrap,
│ Reparto [Tutti i reparti ▾]   [✨Approva consigliate (2)] [Saldo ferie]       │  align-items:flex-end)
│                               [Saldo ROL] [Piano ferie] [■xls]                │
├──────────────────────────────────────────────────────────────────────────────┤
│ [‹] Novembre 2026 [›] [Oggi]  12 richieste nel mese                           │  .rfc__bar-top
│ ● Ferie ● ROL ● Permesso ● Malattia │ ▭ Approvata ┅ In attesa ▬ Rifiutata     │  (legenda)
├──────────────┬──┬──┬──┬──┬──┬── … ──┬──┤                                      │
│ Dipendente   │ 1│ 2│ 3│ 4│ 5│      │30│  ← riga numeri (24px)                  │
│              │ D│ L│ M│ M│ G│      │ L│  ← riga giorni settimana (20px)        │
├──────────────┼──┴──┴──┼──┴──┴── … ──┴──┤                                      │
│ Andrea G.  ⚠ │[☂ Ferie   ]│           │  ← una o più corsie per dipendente     │
│ 🛎 Front off. │                         │    (altezza riga 30px)               │
│ …            │                         │                                      │
└──────────────┴─────────────────────────┘                                      │
```

Blocchi, dall'alto:

1. **PageHead** (componente condiviso): riga a 3 zone [Indietro · titolo centrato · azioni]; nessuna azione a destra.
2. **Toolbar** `.rfe__toolbar` (`display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap`; ogni figlio `min-width:0`):
   - schede di stato `.rfe__tabs` (segmented control, altezza 34px);
   - SelectField «Reparto» `.rfe__field` (larghezza 200px, colonna flex con `gap:6px`);
   - gruppo a destra `.rfe__push` (`margin-left:auto; display:flex; align-items:center; gap:8px`): [Approva consigliate (n)] (solo se n>0), [Saldo ferie], [Saldo ROL], [Piano ferie], [icona Excel 34×34].
3. **Calendario** `.rfc` (colonna flex, `gap:10px`, container `rfc`):
   - barra del mese `.rfc__bar-top` (colonna flex, `gap:8px`): riga navigazione `.rfc__nav` (flex, `align-items:center`, `gap:6px`) e riga legenda `.rfc__legend` (flex wrap, `gap: 6px 16px`);
   - matrice `.rfc__wrap > table.rfc__grid` (bordo 1px, radius `--radius-md` 6px, sfondo surface, `overflow:hidden`; tabella `width:100%`, `table-layout:fixed`, `border-collapse:collapse`, font 11px). Colonna Dipendente 168px, una colonna per giorno del mese (larghezza uguale, ripartisce il resto), nessuno scroll orizzontale.
4. **Menu del tasto destro** (popover `position: fixed`, 270px).
5. **Modali**: Dettaglio richiesta (md, 480px), Modifica/Nuova richiesta (md), Rifiuta richiesta (sm, 360px), Saldo ferie/ROL (lg, 600px), più le conferme (ConfirmDialog, sm).

## 4. Elementi e testi

### 4.1 PageHead
- Titolo: «Richieste».
- Sottotitolo: «Ferie e ROL arrivano qui dopo l'approvazione del responsabile di reparto: l'ufficio del personale dà quella definitiva».
- Indietro → `navigate('home')`.

### 4.2 Schede di stato (`role="tablist"`, `aria-label="Vista"`)
Cinque pulsanti `role="tab"`, `aria-selected`, ognuno con etichetta + contatore `.rfe__tab-n`:

| Valore interno | Etichetta | Contatore (su TUTTE le richieste, senza filtro reparto) |
|---|---|---|
| `attesa` | «Da approvare» | n. richieste con stato `Da approvare` |
| `Al responsabile` | «Al responsabile» | n. con stato `Al responsabile` |
| `Approvata` | «Approvate» | n. con stato `Approvata` |
| `Rifiutata` | «Rifiutate» | n. con stato `Rifiutata` |
| `tutte` | «Tutte» | totale richieste |

Il contatore di «Da approvare» diventa **caldo** (`.rfe__tab-n--hot`, fondo warning, testo bianco) quando è > 0.

### 4.3 Filtro reparto
SelectField `name="reparto"`, label «Reparto», opzioni: «Tutti i reparti» (valore vuoto), poi i reparti in quest'ordine: «Front office», «F&B», «Housekeeping», «Manutenzione», «Cucina», «Amministrazione».

### 4.4 Pulsanti a destra
| Pulsante | Classe | Icona | Testo | Tooltip |
|---|---|---|---|---|
| Approva consigliate (solo se ≥1) | `sib-btn sib-btn--secondary rfe__smart` | `fa-solid fa-wand-magic-sparkles` (colore primary) | «Approva consigliate (N)» | «Approva in un colpo le richieste senza conflitti nel reparto e con saldo sufficiente» |
| Saldo ferie | `sib-btn sib-btn--secondary` | `fa-solid fa-umbrella-beach` | «Saldo ferie» | — |
| Saldo ROL | `sib-btn sib-btn--secondary` | `fa-solid fa-hourglass-half` | «Saldo ROL» | — |
| Piano ferie | `sib-btn sib-btn--secondary` | `fa-duotone fa-calendar-days` 13px, currentColor | «Piano ferie» | — |
| Excel | `.rfe__icon-btn` (34×34 quadrato primary) | `fa-regular fa-file-xls` 16px bianco | — (`aria-label="Esporta in Excel"`) | «Esporta in Excel» |

### 4.5 Barra del mese
- Pulsante `sib-btn sib-btn--icon rfc__nav-btn` con `fa-solid fa-chevron-left` (13px, primary), tooltip e `aria-label` «Mese precedente».
- Etichetta mese `.rfc__mese`: «{Mese} {anno}» con il nome intero (`Gennaio` … `Dicembre`), es. «Novembre 2026».
- Pulsante `fa-solid fa-chevron-right`, tooltip/`aria-label` «Mese successivo».
- Pulsante `sib-btn sib-btn--ghost rfc__oggi` «Oggi» (solo senza `limiti`, cioè sempre in questa pagina).
- Contatore `.rfc__count`: «1 richiesta nel mese» / «{N} richieste nel mese» (N = richieste dei dipendenti visibili che toccano il mese, dopo i filtri).
- Durante un trascinamento il contatore è sostituito da `.rfc__count--drop` con icona `fa-solid fa-arrows-up-down-left-right` e il testo «Rilascia per spostare {tipo in minuscolo} [a {Nome} ]{al gg/mm/aaaa | dal gg/mm/aaaa al gg/mm/aaaa}» (il «a {Nome}» compare solo se si cambia dipendente e usa solo il **nome**, es. «Rilascia per spostare ferie a Giulia dal 10/11/2026 al 14/11/2026»).

### 4.6 Legenda (`aria-label="Legenda"`)
Pallini tipo (`.rfc__leg-dot`, 8×8 con alone): «Ferie» (`--chart-1`), «ROL» (`--chart-5`), «Permesso» (`--chart-4`), «Malattia» (`--chart-3`); separatore verticale 1×14px; campioni stato (`.rfc__sw`, 18×10): «Approvata», «In attesa», «Rifiutata»; solo con `limiti` (Piano ferie) anche «Fuori dal periodo». In fondo, se passato, lo slot `azioni` (`.rfc__azioni`, `margin-left:auto`) — non usato da questa pagina.

### 4.7 Matrice
- Intestazione colonna 1 (`th.rfc__dip-h`, `scope="col"`): «Dipendente».
- Prima riga di intestazione: numero del giorno (1…28/29/30/31) con `data-iso="aaaa-mm-gg"`. Se il giorno è festività nazionale il numero è in rosso (`.rfc__fest`) con Tooltip del nome della festa. Festività riconosciute: «Capodanno» (1/1), «Epifania» (6/1), «Festa della Liberazione» (25/4), «Festa dei lavoratori» (1/5), «Festa della Repubblica» (2/6), «Ferragosto» (15/8), «Ognissanti» (1/11), «Immacolata» (8/12), «Natale» (25/12), «Santo Stefano» (26/12), «Pasqua» e «Lunedì dell'Angelo» (calcolo di Meeus/Jones/Butcher).
- Seconda riga (`tr.rfc__r-gsett`): iniziale del giorno della settimana: «D», «L», «M», «M», «G», «V», «S» (da domenica a sabato).
- Cella dipendente (`th.rfc__dip`, `scope="row"`, `rowSpan` = numero di corsie): riga 1 «{Nome} {Cognome}» (ellipsis); riga 2 icona reparto + nome reparto. Icone reparto: Front office `fa-bell-concierge`, F&B `fa-martini-glass`, Cucina `fa-kitchen-set`, Housekeeping `fa-broom`, Manutenzione `fa-wrench`, Amministrazione `fa-briefcase` (altro: `fa-user`). Accanto al nome, solo se l'opzione `segnalaDipendente` lo restituisce (Piano ferie), l'icona `fa-solid fa-triangle-exclamation` `.rfc__segnala--warn|--ko` con Tooltip e `aria-label="Regole del piano non rispettate"`.
- Righe: **tutti** i dipendenti (del reparto filtrato), anche senza richieste, nell'ordine dell'anagrafica (id 1→12). Ogni dipendente ha una o più **corsie** (righe) per le richieste che si sovrappongono.
- **Barra della richiesta** (`button.rfc__bar` dentro `td.rfc__bar-cell` con `colSpan` = giorni visibili nel mese):
  - icona tipo: Ferie `fa-solid fa-umbrella-beach`, Permesso `fa-solid fa-clock`, ROL `fa-solid fa-hourglass-half`, Malattia `fa-solid fa-notes-medical`;
  - testo: se la barra copre 1 giorno solo l'icona (centrata); 2 giorni sigla «FER» / «ROL» / «PER» / «MAL»; ≥3 giorni il tipo intero («Ferie», «ROL», «Permesso», «Malattia»);
  - con ≥4 giorni e stato non approvato, a destra lo stato in minuscolo `.rfc__bar-stato`: «al resp.» (Al responsabile), «da approvare», «rifiutata»;
  - `aria-label`: «{tipo} {stato lungo} dal gg/mm/aaaa al gg/mm/aaaa», dove lo stato lungo di `Al responsabile` è «Al responsabile di reparto»;
  - Tooltip (contenuto ricco, variante scura): riga 1 in grassetto «{tipo} · {stato lungo}»; riga 2 «gg/mm/aaaa» (un giorno) o «dal gg/mm/aaaa al gg/mm/aaaa», seguita da « · {ore} h» se la richiesta ha ore; riga 3 le note (se presenti); riga 4 attenuata «Clic: dettaglio e azioni · trascina: sposta · tasto destro: modifica».
- Colonna finale (`th/td.rfc__fin`, 64px): solo se passata l'opzione `colonnaFinale` (Piano ferie). Non presente qui.

### 4.8 Menu del tasto destro (casella vuota)
`div.rfc__menu` `role="menu"`:
- Titolo `.rfc__menu-title` (maiuscoletto via CSS): «{Nome} {Cognome} · {g} {prime 3 lettere del mese in minuscolo} {anno}», es. «Andrea Grimaudo · 5 nov 2026» (mostrato «ANDREA GRIMAUDO · 5 NOV 2026»).
- Gruppo `.rfc__menu-group` con sottotitolo «Nuova richiesta» e 4 voci `role="menuitem"`: pallino colorato + «Ferie», «ROL», «Permesso», «Malattia».

### 4.9 Modale «Dettaglio richiesta» (size `md`)
Struttura `.rfe-modal.rfe-det`:
1. Testata `.rfe-det__head`: avatar tondo 26px con le iniziali (prime lettere di nome e cognome, es. «AG»), colorato per reparto; nome (Poppins 15px 700) e reparto (12px); a destra il tipo `.rfe__tipo--{tipo}` con icona del tipo e testo.
2. Elenco `dl.rfe-det__facts` (griglia 3 colonne):
   - «Periodo»: «gg/mm/aaaa» se un giorno, altrimenti «dal gg/mm/aaaa al gg/mm/aaaa».
   - «Durata»: «{x} h» se la richiesta ha ore (formato it-IT con max 1 decimale, es. «3 h», «2,5 h»), altrimenti «1 giorno» / «{n} giorni» (giorni lavorativi lun-sab, minimo 1).
   - «Residuo se approvata» (se lo stato è Al responsabile o Da approvare) oppure «Residuo»: Ferie «{n} gg», ROL «{x} h», Permesso/Malattia «-». In rosso se negativo.
   - «Richiesta il»: data di creazione gg/mm/aaaa.
   - «Stato»: testo dello stato colorato (`.rfe__stato--info|attesa|ok|ko`) + icona iter del responsabile (se c'è) + icona `fa-solid fa-pen` warning se modificata dall'HR (Tooltip «Modificata da {autore dell'ultima modifica}», `aria-label="Modificata dall'HR"`).
   - «Note del dipendente»: le note, oppure «—».
3. Se c'è un responsabile: riquadro `.rfe-modal__iter--ok|ko|attesa` con icona `fa-user-check` / `fa-user-xmark` / `fa-user-clock` e il testo dell'iter:
   - nessun responsabile (solo tooltip): «Nessun responsabile di reparto: la richiesta è arrivata direttamente all'ufficio del personale.»;
   - in attesa: «In attesa di {nome}, responsabile {reparto}, nell'App Op!» + « · sollecitato il gg/mm/aaaa» se già sollecitato;
   - deciso: «Approvata da {nome}, responsabile {reparto}, il gg/mm/aaaa» oppure «Rifiutata da …», + «: {motivo}» se il responsabile ha dato un motivo.
4. Se Rifiutata con motivo: `.rfe-det__motivo` con `fa-solid fa-circle-xmark` (rosso) «Motivo del rifiuto: {motivo}».
5. Se lo stato è Da approvare: blocco valutazione `.rfe-det__val`: pillola `.rfe__val--ok|warn|ko` con icona `fa-circle-check` / `fa-triangle-exclamation` / `fa-circle-xmark` e testo «Valutazione di Sibylla: Approvabile» / «… Da valutare» / «… Sconsigliata»; sotto, elenco dei motivi (`li.rfe-tip__row--ok|warn|ko|info`, con pallino colorato).
6. Se NON c'è valutazione e ci sono colleghi assenti: `.rfe-det__motivo--warn` con `fa-solid fa-triangle-exclamation` (warning) «Assenti nello stesso reparto: {Nome Cognome} (gg/mm/aaaa → gg/mm/aaaa), …».
7. **Storico** (componente `StoricoHr`, §4.13).
8. Azioni `.rfe-modal__actions.rfe-det__actions` (a destra, gap 8px; icone con `margin-right:7px`):
   - sempre: «Elimina» `sib-btn sib-btn--ghost rfe-det__del` (testo rosso, `margin-right:auto` → spinto a sinistra), icona `fa-solid fa-trash`;
   - sempre: «Modifica» `sib-btn--secondary`, icona `fa-solid fa-pen`;
   - se stato = Al responsabile: solo «Sollecita {nome responsabile}» (o «Sollecita il responsabile» se senza nome) `sib-btn--primary`, icona `fa-solid fa-bell`;
   - altrimenti: «Rifiuta» `sib-btn--secondary` icona `fa-solid fa-circle-xmark` (se stato ≠ Rifiutata) e «Approva» `sib-btn--primary` icona `fa-solid fa-circle-check` (se stato ≠ Approvata).

### 4.10 Modale «Modifica richiesta» / «Nuova richiesta» (size `md`)
Titolo «Nuova richiesta» se inserita dal tasto destro su casella vuota, altrimenti «Modifica richiesta». Campi in ordine:
1. Griglia 2 colonne (`.rfe-modal__grid`, `1fr 1fr`, gap 12px): SelectField «Dipendente» (`name="rf-dip"`, obbligatorio; opzioni «Seleziona…» + «{Nome} {Cognome}» dei 12 dipendenti) e SelectField «Tipo» (`rf-tipo`; «Ferie», «Permesso», «ROL», «Malattia»).
2. DateRangeField «Periodo» (`rf-dal`/`rf-al`, obbligatorio; range picker standard, vedi fondamenta).
3. Solo se Tipo è ROL o Permesso **e** dal = al: InputField «Ore» (`rf-ore`, `type="number"`, obbligatorio, larghezza 160px) con hint «Su una giornata di 8 h: con 8 vale la giornata intera».
4. Anteprima `.rfe-modal__info` (solo se dipendente e periodo validi): icona `fa-solid fa-circle-info` (normale) o `fa-solid fa-triangle-exclamation` (variante `--warn`), testo composto:
   - a ore: «{x} h il gg/mm/aaaa»; altrimenti «1 giorno lavorativo» / «{n} giorni lavorativi»;
   - se ROL: « · ROL residui {x} h, dopo la richiesta {y} h»;
   - se ci sono colleghi assenti (approvati, stesso reparto): « · già assenti nel reparto: {Nome Cognome}, …».
   - Variante warn se ci sono colleghi assenti o il ROL dopo la richiesta è < 0.
5. TextareaField «Note» (`rf-note`, 2 righe).
6. Se la richiesta esiste e ha un responsabile: riquadro iter (come §4.9 punto 3).
7. SelectField «Stato» (`rf-stato`): opzioni «Da approvare», «Approvata», «Rifiutata»; se la richiesta è ferma «Al responsabile» il campo è **disabilitato**, mostra anche l'opzione «Al responsabile» e l'hint «Decide prima {nome responsabile} dall'App Op!: poi la richiesta passa a te».
8. Solo se Stato = Rifiutata: TextareaField «Motivo del rifiuto» (`rf-motivo-mod`, obbligatorio, 2 righe), hint «Il dipendente lo vedrà nella sua richiesta».
9. TextareaField «Messaggio al dipendente» (`rf-messaggio`, 2 righe), hint «Facoltativo: spiega la correzione. Il dipendente riceve la notifica nell'App Op! con le modifiche».
10. Storico (solo richiesta esistente).
11. Azioni: «Annulla» (secondary), «Salva modifiche» (primary) — stesso testo anche in «Nuova richiesta».

Messaggi di validazione (sotto il campo, via prop `error`):
- Dipendente vuoto: «Scegli il dipendente».
- Periodo incompleto: «Indica il periodo»; fine prima dell'inizio: «La data di fine precede quella di inizio».
- Ore non valide (≤0, vuote o >8): «Indica le ore (da 0,5 a 8)».
- Rifiutata senza motivo: «Indica il motivo del rifiuto».

### 4.11 Modale «Rifiuta richiesta» (size `sm`)
- Testo `.rfe-modal__text`: «{Nome Cognome} · {tipo} dal gg/mm/aaaa al gg/mm/aaaa».
- TextareaField «Motivo del rifiuto» (`rf-motivo`, obbligatorio, 3 righe), hint «Il dipendente lo vedrà nella sua richiesta».
- «Annulla» (secondary) e «Rifiuta» (`sib-btn--danger`, disabilitato finché il motivo, senza spazi, è vuoto).
- Il componente supporta anche il rifiuto multiplo (titolo «Rifiuta {N} richieste», elenco `.rfe-modal__lista` «{nome} · {tipo} · {periodo}», hint «Lo stesso motivo va a tutti i dipendenti selezionati», toast «{N} richieste rifiutate.» / «Richieste rifiutate»), ma dal calendario si apre sempre su una sola richiesta: oggi non è raggiungibile.

### 4.12 Modale «Saldo ferie {anno}» / «Saldo ROL {anno}» (size `lg`)
- Titolo: «Saldo ferie 2026» oppure «Saldo ROL 2026» (anno corrente).
- Testo introduttivo:
  - ferie: «Giorni lavorativi di ferie maturati nell'anno secondo il contratto, goduti con le richieste approvate e ancora da approvare.»
  - ROL: «Ore di riduzione orario maturate nell'anno secondo il contratto, godute con le richieste approvate e ancora da approvare.»
- Tabella `.sib-table.rfe__table.rfe__saldo` con colgroup in %: Dipendente 28%, Reparto 24%, quattro colonne numeriche 12% ciascuna. Intestazioni (ThLabel): «Dipendente», «Reparto», «Maturate», «Godute», «In attesa», «Residue» (le ultime 4 allineate a destra).
- Una riga per ognuno dei 12 dipendenti: nome (grassetto 600, TruncatedText), reparto (TruncatedText), valori formattati: ferie «1 g» / «{n} gg», ROL «{x} h». «In attesa» = 0 → «-» grigio. «Residue» in grassetto, rosso se < 0; se ci sono richieste in attesa e `residue − inAttesa < 0` il valore è in warning con icona `fa-solid fa-triangle-exclamation` 12px e Tooltip «Se approvi quelle in attesa restano {valore}».
- Azioni: «Esporta in Excel» (secondary, icona `fa-regular fa-file-xls`) e «Chiudi» (primary).

### 4.13 Storico (`StoricoHr`)
Sezione `section.hrsto` (`aria-label` = titolo) con titolo «Storico» e una timeline `ol`:
- Primo evento (solo se la richiesta NON è stata inserita dall'HR): «Inviata dall'App Op!» con autore = nome del dipendente e data di creazione.
- Poi ogni `EventoHr` in ordine: titolo = azione, meta «{autore} · gg/mm/aaaa, hh:mm», elenco dei campi cambiati, messaggio al dipendente con `fa-solid fa-comment`.
- Icone per azione: Inviata `fa-mobile-screen`, Approvata `fa-circle-check`, Rifiutata `fa-circle-xmark`, Modificata `fa-pen`, «Approvata dal responsabile» `fa-user-check`, «Rifiutata dal responsabile» `fa-user-xmark`, «Sollecito al responsabile» `fa-bell`, «Inserita dall'ufficio del personale» `fa-user-pen`, altro `fa-circle`. (Rimborsata `fa-money-bill` e «Rimessa in attesa» `fa-rotate-left` valgono per le note spese.)
- Tono: azioni che iniziano con «Approvata» (o Rimborsata) → ok (verde); che iniziano con «Rifiutata» → ko (rosso); «Modificata» → mod (arancio); altro → base (primary).
- Se non ci sono eventi HR: «Nessun intervento dell'ufficio del personale finora.»

## 5. Stati e interazioni

### 5.1 Stato iniziale
- Scheda attiva: **«Tutte»**. Reparto: «Tutti i reparti». Mese mostrato: quello di oggi. Nessuna modale aperta.
- Filtro: `rows = richieste` arricchite (§6.3) filtrate per scheda (`attesa` → stato Da approvare; `tutte` → nessun filtro; altrimenti stato = valore) e per reparto; poi ordinate per `dal` crescente (l'ordine serve all'export). Il calendario disegna solo le richieste che toccano il mese visibile.

### 5.2 Schede e filtro
Clic su una scheda → cambia il filtro di stato del calendario e dell'export; i contatori non cambiano. Cambio reparto → il calendario mostra solo i dipendenti di quel reparto, «Approva consigliate» conta solo quel reparto, i contatori delle schede no.

### 5.3 Navigazione del mese
‹ / › spostano di un mese (mai disabilitati in questa pagina). «Oggi» riporta al mese corrente.

### 5.4 Clic su una barra → Dettaglio
`pointerdown` (solo tasto sinistro) avvia un possibile trascinamento; se al `pointerup` il puntatore si è mosso **meno di 5 px** (distanza euclidea) è un clic → apre «Dettaglio richiesta». Da tastiera: Invio o Spazio sulla barra (focus) apre il dettaglio.

### 5.5 Trascinamento → Sposta
1. Al `pointerdown` si memorizza il giorno della barra sotto il puntatore (`offset` = giorni tra l'inizio della richiesta e quel giorno) e le coordinate di tutte le colonne-giorno (le `th[data-iso]` della prima riga di intestazione). Al `body` si aggiunge la classe `rfc-dragging` (nessuna selezione di testo, cursore «grabbing»).
2. Oltre 5 px di movimento: la colonna sotto il puntatore (se fuori a sinistra, la prima; a destra, l'ultima) determina il nuovo inizio `dal = colonna − offset`; la riga `tr[data-dip]` sotto il puntatore determina il dipendente (se non c'è, si tiene l'ultimo). `al = dal + (durata in giorni di calendario − 1)`.
3. Anteprima: la barra originale si attenua (opacità .35); sulle celle del dipendente bersaglio comprese tra `dal` e `al` compare l'evidenziazione `.rfc__cell--drop`; il contatore diventa «Rilascia per spostare …» (§4.5).
4. Al rilascio, se è cambiato l'inizio o il dipendente, parte la conferma:
   - Titolo «Sposta richiesta», pulsante «Sposta» (non distruttivo), annulla «Annulla».
   - Testo: «Sposti {tipo minuscolo} di **{Nome Cognome}**[ a **{nuovo Nome Cognome}**] {al **gg/mm/aaaa** | dal **gg/mm/aaaa** al **gg/mm/aaaa**}?» + se approvata « Resta approvata e si aggiorna anche nel Piano ferie.» + se nel nuovo periodo ci sono colleghi dello stesso reparto (del dipendente bersaglio) già assenti con richieste approvate « Attenzione: in quei giorni nel reparto sono già assenti {nomi}.» + « Il dipendente riceve la notifica nell'App Op!.»
   - Se le differenze calcolate (§6.5) sono vuote, nessuna conferma.
5. Confermato: la richiesta prende il nuovo dipendente e periodo, **stato invariato**, ore mantenute solo se resta di un giorno (altrimenti rimosse). Nello storico: evento «Modificata» con le differenze + «Spostata dal calendario». Toast successo, titolo «Richiesta spostata», testo «{tipo} di {Nome Cognome destinatario} spostata {al gg/mm/aaaa | dal gg/mm/aaaa al gg/mm/aaaa}.»

### 5.6 Tasto destro su una barra → Modifica
`contextmenu` sulla cella della barra: il menu nativo è soppresso e si apre direttamente «Modifica richiesta» precompilata (ore precompilate col valore della richiesta o 8, con la virgola decimale).

### 5.7 Tasto destro su una casella vuota → Nuova richiesta
1. Si apre il menu (§4.8) alla posizione del puntatore; la casella cliccata si evidenzia (`.rfc__cell--on`). Il menu è inizialmente invisibile, misurato e poi posizionato: x tra 8px e `larghezza finestra − larghezza menu − 8px`; se sborderebbe in basso si apre sopra il puntatore (minimo 8px dal bordo).
2. Si chiude con: mousedown fuori dal menu, Esc, qualsiasi scroll (anche interno, in cattura).
3. Scelta del tipo → modale «Nuova richiesta» precompilata: dipendente e giorno della casella (dal = al), tipo scelto, **Stato «Approvata»**, ore 2 per ROL/Permesso (8 per gli altri tipi, campo nascosto), note e messaggio vuoti.
4. «Salva modifiche» → validazioni (§4.10); se lo stato è Approvata passa dalla verifica del saldo negativo (§5.9): la richiesta nuova non è ancora nell'elenco, quindi `saldoDopo` **sottrae i suoi giorni** come per una richiesta in attesa (§6.4) e la conferma «Autorizza il saldo negativo» compare appena queste ferie portano il saldo sotto zero. Annulla → la modale resta aperta e nulla viene inserito. Poi inserisce la richiesta (nessun iter del responsabile; storico con evento «Inserita dall'ufficio del personale», campi «Stato: {stato}» e, se autorizzato, «Saldo negativo autorizzato: {n} gg»; messaggio se scritto). Toast successo «Richiesta inserita»: «{tipo} di {Nome Cognome} {del gg/mm/aaaa | dal gg/mm/aaaa al gg/mm/aaaa} inserita ({stato minuscolo}).»

### 5.8 Modifica (salvataggio)
- Validazioni → errori sotto i campi, la modale resta aperta.
- Calcolo `dopo` = {dipendente, tipo, dal, al, note (trim, vuote → assenti), ore (solo se a ore e < 8; 8 h = giornata intera → nessuna ora), stato, motivo (solo se Rifiutata)}.
- Nessuna differenza → toast info, titolo «Nessuna modifica», testo «Non hai cambiato nessun valore.» (la modale resta aperta).
- Se lo stato passa ad Approvata da un altro stato → verifica saldo negativo (§5.9, calcolata con lo stato precedente); se autorizzata, la nota «Saldo negativo autorizzato: {n} gg» si aggiunge alle differenze.
- Salva: evento «Modificata» con le differenze e messaggio = «Messaggio al dipendente» oppure, se vuoto, il motivo del rifiuto. Toast successo «Richiesta modificata»: «Richiesta di {Nome Cognome} aggiornata.»
- In modifica NON c'è il controllo «ROL insufficienti» (c'è solo nell'Approva).

### 5.9 Approva (dal dettaglio)
1. **Saldo negativo ferie**: se tipo Ferie e `saldoDopo < 0` (§6.4) conferma:
   - Titolo «Autorizza il saldo negativo» (con più richieste: «Autorizza {N} saldi negativi»).
   - Per ogni richiesta una riga: «**{Nome Cognome}**: con queste ferie il saldo va a **{n} gg**» + se la richiesta cade in un piano aperto « · oltre il negativo consentito da «{piano}» ({negativoMax} gg)» (se il piano ha `entroResidui` e `−saldo > negativoMax`) oppure « · entro il limite di «{piano}»» + «.».
   - Riga finale: «Il negativo richiede la tua autorizzazione: verrà recuperato con le ferie che maturano e resta nello storico della richiesta.»
   - Pulsante «Autorizza e approva»; **distruttivo (rosso)** se almeno una richiesta è oltre il negativo del piano, altrimenti primary. Annulla → nessuna azione.
2. **ROL insufficienti**: se tipo ROL e ore richieste > residuo ROL dell'anno della richiesta, conferma titolo «ROL insufficienti», testo «{Nome Cognome} ha **{max(0,residuo)} h** di ROL residui e ne chiede **{ore} h**. Le ore mancanti andranno recuperate o tolte dalle ferie. Approvi comunque?», pulsante «Approva comunque» (non distruttivo).
3. Stato → Approvata, motivo azzerato, evento «Approvata» con l'eventuale nota «Saldo negativo autorizzato: {n} gg». Toast successo «Richiesta approvata»: «{tipo} di {Nome Cognome} dal gg/mm/aaaa al gg/mm/aaaa approvata: è nel Piano ferie.»

### 5.10 Rifiuta
Apre «Rifiuta richiesta» (il dettaglio si chiude). «Rifiuta» → stato Rifiutata con motivo (trim), evento «Rifiutata» con messaggio = motivo. Toast info «Richiesta rifiutata»: «Richiesta di {Nome Cognome} rifiutata.» Una richiesta Approvata si può rifiutare (revoca); una Rifiutata si può approvare.

### 5.11 Sollecita il responsabile
Solo con stato Al responsabile. Registra l'evento «Sollecito al responsabile» con messaggio «Promemoria inviato a {nome} nell'App Op!» e la data del sollecito (compare nel testo dell'iter). Toast successo «Responsabile sollecitato»: «Promemoria inviato nell'App Op! a {nome}.»

### 5.12 Elimina
Conferma: titolo «Elimina richiesta», testo «Elimini la richiesta di **{tipo minuscolo}** di **{Nome Cognome}** {del gg/mm/aaaa | dal gg/mm/aaaa al gg/mm/aaaa}?[ È già approvata: sparirà anche dal Piano ferie.] L'operazione non si può annullare.», pulsante «Elimina» rosso, «Annulla». Confermato → richiesta rimossa; toast info «Richiesta eliminata»: «Richiesta di {Nome Cognome} eliminata.»

Tutte le azioni del dettaglio chiudono prima il dettaglio e poi eseguono l'azione.

### 5.13 Approva consigliate
Visibile se tra le richieste filtrate ce n'è almeno una con valutazione «ok» (solo le Da approvare hanno valutazione). Conferma: titolo «Approva le richieste consigliate», testo «Sibylla non vede conflitti in **{1 richiesta | N richieste}**: {Nome Cognome} ({tipo minuscolo}), …. Le approvi tutte?», pulsante «Approva» (primary). Confermato → tutte Approvate (senza le verifiche di §5.9). Toast successo «Richieste approvate»: «{1 richiesta approvata | N richieste approvate}: sono nel Piano ferie.»

### 5.14 Export Excel
- Pulsante icona: file `richieste-assenze.xls` (tabella HTML apribile da Excel), colonne «Richiesta il», «Dipendente», «Reparto», «Tipo», «Dal», «Al», «Durata», «Residuo», «Stato», «Note», «Motivo rifiuto»; righe = richieste filtrate da scheda e reparto (tutti i mesi), ordinate per `dal`; Residuo «{n} gg» per Ferie, «{x} h» per ROL, vuoto altrimenti.
- Saldo: `saldo-ferie.xls` / `saldo-rol.xls`, colonne «Dipendente», «Reparto», «Maturate (gg)» o «Maturate (h)», «Godute», «In attesa», «Residue» (valori numerici).
- Dopo ogni export: toast successo «Esportazione completata»: «{N} righe esportate in Excel.»

### 5.15 Stati vuoti, caricamento, errore
- Mese senza richieste: la matrice mostra comunque tutti i dipendenti con caselle vuote; contatore «0 richieste nel mese». Nessun messaggio dedicato.
- Caricamento/errore: oggi non esistono (dati locali). Con il backend: mostrare il calendario vuoto con skeleton/spinner standard di piattaforma e, in errore, toast di errore standard (vedi fondamenta); le azioni devono restare in attesa della risposta prima del toast di successo.

## 6. Dati e regole di business

### 6.1 Entità
`RichiestaAssenza` (vedi 01): `id: string`, `dipendenteId: number`, `tipo: 'Ferie'|'Permesso'|'ROL'|'Malattia'`, `dal`, `al` (`aaaa-mm-gg`), `note?`, `stato: 'Al responsabile'|'Da approvare'|'Approvata'|'Rifiutata'`, `motivo?` (solo se Rifiutata), `ore?` (ROL/Permesso di un giorno; assente = giornata intera), `createdAt` (ISO), `storico?: EventoHr[]`, `responsabile?: { nome, esito: 'In attesa'|'Approvata'|'Rifiutata', at?, motivo?, sollecitatoAt? }`.

`EventoHr`: `{ at (ISO), autore, azione, modifiche?: string[], messaggio? }`. Autore = nome del profilo collegato, altrimenti «Ufficio del personale».

`DipendenteHr`: `{ id, nome, cognome, reparto, ferieAnnue (giorni), rolAnnui (ore) }`.

### 6.2 Costanti e formule
- `ORE_GIORNO = 8`.
- `giorniLavorativi(dal, al)` = giorni da lunedì a **sabato** compresi (la domenica non conta).
- `oreRichiesta(r) = r.ore ?? max(1, giorniLavorativi) × 8`.
- `inAttesa(stato)` = stato ∈ {Al responsabile, Da approvare}.
- `annoRichiesta(r)` = anno di `r.dal`: una richiesta si attribuisce **per intero** all'anno in cui iniziano le ferie, anche se finisce l'anno dopo. Tutti i calcoli legati a una richiesta (residuo del dettaglio, `saldoDopo`, valutazione, saldo ROL) usano quest'anno.
- `saldoFerie(dip, anno)`: maturate = `ferieAnnue`; godute = Σ giorni Ferie approvate con `dal` nell'anno; inAttesa = Σ giorni Ferie in attesa; **residue = maturate − godute** (le in attesa non scalano il residuo).
- `ferieGodute(dip, anno)` = `saldoFerie(dip, anno).godute` (anno obbligatorio).
- `saldoRol(dip, anno)`: maturate = `rolAnnui`; godute = Σ `oreRichiesta` dei ROL approvati con `dal` nell'anno; inAttesa = Σ ore dei ROL in attesa; **residue = maturate − godute**.
- `sovrapposizioni(r)` = richieste **Approvate** di altri dipendenti dello **stesso reparto** con `x.dal ≤ r.al && x.al ≥ r.dal` (esclusa la richiesta stessa).
- `durata(r)` = `fmtOre(r.ore)` se ha ore, altrimenti «1 giorno»/«{n} giorni» con n = max(1, giorniLavorativi).
- `periodo(dal, al)` (usato nelle differenze): un giorno «gg/mm/aaaa»; altrimenti «gg/mm → gg/mm/aaaa» se stesso anno, «gg/mm/aaaa → gg/mm/aaaa» se anni diversi.
- `fmtOre(h)` = numero it-IT con massimo 1 decimale + « h».

### 6.3 Arricchimento di una richiesta (per calendario e dettaglio)
- `giorni = giorniLavorativi(dal, al)`.
- **Residuo**:
  - ROL: `saldoRol(dip, anno di dal).residue − (in attesa ? oreRichiesta(r) : 0)` (ore);
  - altri tipi: `saldoFerie(dip, anno di dal).residue − (tipo Ferie e in attesa ? giorni : 0)` (giorni). Mostrato solo per Ferie e ROL.
  - Per una Ferie in attesa il residuo coincide con `saldoDopo` (§6.4), quindi dettaglio («Residuo se approvata»), valutazione di Sibylla e conferma del negativo riportano lo stesso numero; per una Ferie approvata coincide con la colonna «Residue» del Piano ferie e con «Saldo ferie {anno}» dello stesso anno.
- `conflitti` = `[]` se Rifiutata, altrimenti `sovrapposizioni(r)`.
- `valutazione` = solo se stato Da approvare (§6.6).
- `urgente` = Da approvare e inizia entro 3 giorni (calcolato ma oggi non mostrato sul calendario).

### 6.4 Saldo dopo l'approvazione (autorizzazione del negativo)
`saldoDopo(r) = saldoFerie(dip, anno di dal).residue − (giàGoduta ? 0 : giorniLavorativi(r.dal, r.al))`, con `giàGoduta` = `r.stato === 'Approvata'` **e** la richiesta è nell'elenco già approvata (i suoi giorni sono fra le godute). Una richiesta nuova non ancora salvata, anche se inserita «Approvata», sottrae quindi i propri giorni. Se < 0 per una richiesta di Ferie da approvare, serve l'autorizzazione esplicita (§5.9). «Oltre il limite» del piano: `piano.regole.entroResidui && −saldoDopo > piano.regole.negativoMax`. Piano di riferimento: il primo piano **Aperto** il cui periodo si sovrappone alla richiesta di Ferie (`r.dal ≤ p.al && r.al ≥ p.dal`).

### 6.5 Differenze (storico e notifica al dipendente)
Elenco di stringhe, nell'ordine:
- dipendente cambiato: «Dipendente: {vecchio} → {nuovo}»;
- tipo: «Tipo: {vecchio} → {nuovo}»;
- periodo: «Periodo: {periodo vecchio} → {periodo nuovo}»;
- ore (confronto `ore ?? null`): «Durata: {durata vecchia} → {durata nuova}»;
- note: «Note: «{nuove note}»» oppure «Note rimosse»;
- stato: «Stato: {vecchio} → {nuovo}»; se lo stato resta Rifiutata e cambia il motivo: «Motivo del rifiuto aggiornato».

### 6.6 Valutazione di Sibylla (richieste Da approvare)
Motivi in ordine (livello tra parentesi):
1. Malattia → sempre `ok` con il solo motivo «Malattia: va registrata con il certificato.» (fine).
2. Colleghi = dipendenti dello stesso reparto escluso il richiedente; assenti = dipendenti distinti nei `conflitti`.
   - assenti > 0 e assenti ≥ colleghi → (ko) «{reparto} resterebbe scoperto: tutti i colleghi sono già assenti.»
   - assenti > 0 → (warn) «Nel reparto è già assente {nomi separati da virgola}.»
3. Se la richiesta (Ferie) cade in un piano aperto: si aggiungono le verifiche delle regole del piano (vedi `10-piano-ferie.md` §6.3: giorni consecutivi, presenza minima, residui/negativo).
   Altrimenti, se Ferie con residuo < 0 → (warn) «Saldo a {residuo} gg: il negativo è consentito solo con l'autorizzazione dell'ufficio del personale.»
4. ROL con residuo < 0 → (ko) «ROL insufficienti: mancano {−residuo} h.»
5. Occupazione media prevista della struttura nel periodo (max 60 giorni): `occ ≥ 85` → (warn) «Periodo di alta occupazione ({occ}% in media).»; altrimenti (ok) «Occupazione prevista nel periodo: {occ}%.»
6. Giorni all'inizio `tra` (0…3): (info) «Inizia oggi: decidi subito.» oppure «Inizia tra 1 giorno: decidi presto.» / «Inizia tra {n} giorni: decidi presto.»
7. Livello = ko se c'è un ko, altrimenti warn se c'è un warn, altrimenti ok. Se ok e nessun motivo info, si antepone (ok) «Nessun conflitto nel reparto e saldo sufficiente.»

Etichette livello: ok «Approvabile», warn «Da valutare», ko «Sconsigliata».

**Occupazione prevista (mock)**: `occupazione(iso)` deterministica: base per giorno della settimana lun→dom `[62, 58, 61, 67, 83, 94, 76]` + rumore pseudo-casuale tra −6 e +6 (seme `(anno×372 + mese×31 + giorno)×9301 + 49297`, `rumore = ((seme mod 233280)/233280)×12 − 6`), arrotondata e limitata a 35…99. Va sostituita dall'occupazione prevista reale (PMS/forecast) fornita dal backend.

### 6.7 Corsie del calendario
Per ogni dipendente: richieste del mese ordinate per `dal`; ogni barra va nella prima corsia in cui non si sovrappone (per giorni del mese) ad altre barre, altrimenti apre una nuova corsia. Barra: inizio = 1 se la richiesta inizia nel mese precedente, altrimenti il giorno di `dal`; fine = ultimo giorno del mese se continua dopo, altrimenti il giorno di `al`. Continuazione prima/dopo → angoli squadrati sul lato corrispondente.

### 6.8 Iter del responsabile
`iterIniziale(dipendente, tipo)`: se il tipo è Ferie o ROL e il reparto del dipendente ha un responsabile attivo (Configurazione HR › Reparti) diverso dal richiedente → stato «Al responsabile» con `responsabile = { nome, esito: 'In attesa' }`; altrimenti stato «Da approvare» senza responsabile. Il responsabile decide dall'App Op! (approva → «Da approvare»; rifiuta → «Rifiutata» con motivo e evento «Rifiutata dal responsabile»).

Responsabili seed (Configurazione HR): Front office «Piero Aragona», F&B «Andrea Grimaudo», Housekeeping «Marco Campo», Amministrazione «Ruggero Novi»; Manutenzione e Cucina senza responsabile.

### 6.9 Dati demo (seed)
- **12 dipendenti**: 1 Andrea Grimaudo (Front office, 26 gg, 72 h ROL), 2 Giulia Conti (Front office, 26, 72), 3 Marco Esposito (Cucina, 26, 72), 4 Sara Romano (Housekeeping, 22, 43), 5 Davide Marini (Front office, 26, 58), 6 Sergio Benvenuti (Manutenzione, 26, 72), 7 Manuel Fantoni (Manutenzione, 22, 29), 8 Oscar Pettinari (Housekeeping, 22, 72), 9 Luca Hambelli (Amministrazione, 26, 72), 10 Elena Bianchi (F&B, 26, 72), 11 Chiara Ferri (F&B, 22, 22), 12 Paolo Greco (Cucina, 26, 72).
- **33 richieste** relative a oggi (offset in giorni da oggi `dal..al`, stato, creata a −n giorni):
  - 2 Ferie +6..+12 Da approvare «Matrimonio di mia sorella»; 5 Ferie +8..+10 Da approvare (→ **Al responsabile**); 12 Permesso +20 Da approvare «Visita medica, solo mattina»; 8 ROL +14..+15 Da approvare; 11 Ferie +20..+27 Da approvare «Viaggio programmato da tempo» (→ **Al responsabile**); 1 Ferie −3..+2 Approvata; 4 Malattia −2..+1 Approvata «Certificato INPS n. 2026/118843»; 6 Ferie +9..+16 Approvata; 10 ROL +4 Approvata; 3 Ferie +18..+24 Approvata; 9 Permesso −6 Approvata; 7 Ferie +7..+11 Rifiutata, motivo «Nello stesso periodo è già assente Sergio Benvenuti: la manutenzione resterebbe scoperta.»; 2 Ferie −25..−19 Approvata; 5 Malattia −14..−12 Approvata; 9 ROL +3 Da approvare 3 h «Uscita anticipata per pratiche in comune»; 4 ROL +11 Da approvare 4 h; 6 ROL −40..−38 Approvata; 1 ROL −12 Approvata 4 h; 12 ROL −30 Approvata; 7 ROL −20..−19 Approvata; 5 ROL −50 Rifiutata 6 h, motivo «Giornata di picco: il front office resterebbe con una sola persona.»; 4 Ferie +30..+34 Rifiutata **dal responsabile** «Weekend lungo», motivo «Fine mese c'è il gruppo congressuale: servono tutte le cameriere ai piani.»; 7 Ferie −120..−100 Approvata «Ferie estive in un'unica soluzione».
  - 10 ferie di Natale dell'«anno delle feste» (`an` = anno corrente da febbraio, l'anno precedente a gennaio): 2 22–27/12 Approvata «Natale con la famiglia in Puglia»; 6 26/12–4/1 Da approvare «Vorrei unire Natale e Capodanno»; 7 23–28/12 Da approvare; 9 24–31/12 Approvata; 11 20–26/12 Da approvare «Pranzo di Natale dai nonni»; 8 29/12–4/1 Al responsabile; 3 23–26/12 Da approvare; 12 2–6/1 Approvata «Settimana bianca»; 1 24–26/12 Rifiutata «Front office al completo per il cenone: anticipa al 20-22 dicembre.»; 4 8–10/12 Da approvare «Ponte dell'Immacolata».
  - Iter: per Ferie/ROL di reparti con responsabile, le richieste chiuse o già all'HR hanno `responsabile.esito = 'Approvata'` (decisa alle 17:30 del giorno di creazione, evento «Approvata dal responsabile»); quelle «Al responsabile» hanno esito «In attesa». Le due rifiutate dall'HR dopo l'ok del responsabile (`ra-21` ROL di Davide Marini, `ra-32` ferie di Natale di Andrea Grimaudo) hanno in coda il secondo evento `{ at: <giorno dopo la creazione>T10:00:00, autore: 'Ufficio del personale', azione: 'Rifiutata', messaggio: <motivo> }`, come un rifiuto fatto dalla pagina. Id `ra-1` … `ra-33`. Orari di creazione `T09:mm` (mm = dipendente×7 mod 60) o `T10:mm` per Natale (dipendente×11 mod 60).
- **Persistenza attuale**: store `zustand` persistito in `localStorage` con chiave **`sibylla.hr-gestione`**, **versione 9** (alla migrazione da qualsiasi versione precedente si rigenera tutto il seed; v9 aggiunge l'evento di rifiuto HR a ra-21 e ra-32). Lo stesso store contiene note spese, buoni pasto e cedolini. I piani ferie stanno in `sibylla.hr-piani-ferie` (v3).

## 7. Backend da realizzare

Oggi tutto è mock nel frontend. Contratto proposto (prefisso coerente con gli endpoint HR esistenti, es. `POST /Sibylla/hr/paghe/trasmetti`). Tutte le risposte di scrittura restituiscono la richiesta aggiornata con `storico` completo; l'autore degli eventi è l'utente autenticato. Errori: `400` validazione (`{ "errore": "validazione", "campi": { "ore": "Indica le ore (da 0,5 a 8)" } }`), `404` richiesta inesistente, `409` stato non compatibile (es. approvare una richiesta «Al responsabile»), `403` permessi.

| Metodo | Percorso | Uso |
|---|---|---|
| GET | `/Sibylla/hr/dipendenti?struttura=…` | anagrafica minima con `ferieAnnue`, `rolAnnui`, reparto |
| GET | `/Sibylla/hr/richieste?dal=2026-11-01&al=2026-11-30&reparto=&stato=` | richieste che toccano l'intervallo (per il mese e l'export: senza intervallo = tutte) |
| GET | `/Sibylla/hr/richieste/contatori` | `{ "Da approvare": 4, "Al responsabile": 3, "Approvata": 18, "Rifiutata": 4, "tutte": 33 }` |
| GET | `/Sibylla/hr/saldi?tipo=ferie|rol&anno=2026` | righe `{ dipendenteId, maturate, godute, inAttesa, residue }` |
| GET | `/Sibylla/hr/richieste/{id}/valutazione` | `{ livello, motivi: [{ livello, testo }] }` (o calcolata nel FE con occupazione da `/Sibylla/hr/occupazione?dal&al`) |
| POST | `/Sibylla/hr/richieste` | inserimento da HR (già deciso) |
| PATCH | `/Sibylla/hr/richieste/{id}` | modifica / spostamento |
| POST | `/Sibylla/hr/richieste/{id}/approva` | approvazione definitiva |
| POST | `/Sibylla/hr/richieste/{id}/rifiuta` | rifiuto con motivo |
| POST | `/Sibylla/hr/richieste/approva-consigliate` | approvazione multipla |
| POST | `/Sibylla/hr/richieste/{id}/sollecita` | promemoria al responsabile |
| DELETE | `/Sibylla/hr/richieste/{id}` | eliminazione |

Esempi:

```http
POST /Sibylla/hr/richieste
{ "dipendenteId": 3, "tipo": "Malattia", "dal": "2026-11-12", "al": "2026-11-12",
  "stato": "Approvata", "note": null, "ore": null, "motivo": null,
  "messaggio": "Registrata dopo la telefonata", "autorizzaNegativo": false }
→ 201 { "id": "ra-…", "createdAt": "2026-11-05T10:12:00Z", "stato": "Approvata",
        "storico": [{ "at": "…", "autore": "Ufficio del personale",
                      "azione": "Inserita dall'ufficio del personale",
                      "modifiche": ["Stato: Approvata"], "messaggio": "Registrata dopo la telefonata" }], … }
```
Inserendo Ferie «Approvata» il server calcola `saldoDopo` **sottraendo i giorni della nuova richiesta** (§6.4); se < 0 e `autorizzaNegativo` non è vero risponde `409 { "errore": "saldo_negativo", "saldoDopo": -1, … }`; con l'autorizzazione aggiunge «Saldo negativo autorizzato: {n} gg» alle `modifiche` dell'evento di inserimento.

```http
PATCH /Sibylla/hr/richieste/ra-1
{ "patch": { "dipendenteId": 2, "dal": "2026-11-10", "al": "2026-11-14", "ore": null },
  "modifiche": ["Dipendente: Giulia Conti → Andrea Grimaudo", "Periodo: 11/11 → 17/11/2026 → 10/11 → 14/11/2026", "Spostata dal calendario"],
  "messaggio": null, "autorizzaNegativo": false }
→ 200 { …richiesta aggiornata, evento "Modificata" in coda allo storico }
```
Il server deve ricalcolare le differenze (non fidarsi del testo del client), tenere lo **stato invariato** negli spostamenti, azzerare `motivo` se lo stato non è Rifiutata.

```http
POST /Sibylla/hr/richieste/ra-7/approva
{ "autorizzaNegativo": true, "approvaRolInsufficienti": false }
→ 200 { …, "stato": "Approvata", "storico": [ …, { "azione": "Approvata", "modifiche": ["Saldo negativo autorizzato: -2 gg"] } ] }
→ 409 { "errore": "saldo_negativo", "saldoDopo": -2, "piano": { "nome": "Natale 2026", "negativoMax": 2, "oltre": false } }   // se manca l'autorizzazione
→ 409 { "errore": "rol_insufficienti", "residue": 3, "richieste": 8 }
→ 409 { "errore": "al_responsabile" }   // non si approva una richiesta ferma al primo livello
```

```http
POST /Sibylla/hr/richieste/ra-12/rifiuta   { "motivo": "Reparto scoperto" }   → 200 (stato Rifiutata, evento "Rifiutata" con messaggio)
POST /Sibylla/hr/richieste/approva-consigliate   { "ids": ["ra-1","ra-9"] }   → 200 { "approvate": 2 }   (transazionale: tutte o nessuna; il server ricontrolla che la valutazione sia ancora "ok")
POST /Sibylla/hr/richieste/ra-2/sollecita   → 200 { …, "responsabile": { …, "sollecitatoAt": "…" } }   (409 se non è "Al responsabile")
DELETE /Sibylla/hr/richieste/ra-5   → 204
```

**Transazionalità e notifiche**
- Ogni scrittura aggiorna richiesta + storico nella stessa transazione.
- `approva-consigliate` è transazionale (tutto o niente).
- Notifiche **App Op!** al dipendente: approvazione, rifiuto (con motivo), modifica/spostamento (con elenco differenze e messaggio), inserimento da HR, eliminazione di una richiesta approvata. Notifica App Op! al **responsabile** per il sollecito.
- Le richieste approvate alimentano il **Piano ferie** e il **Registro presenze**/turni (assenza nel giorno); eliminare o spostare un'approvata li aggiorna.
- L'iter di primo livello (`decidiResponsabile`) è un endpoint dell'App Op! (`POST /Sibylla/hr/richieste/{id}/decisione-responsabile { esito, motivo }`), non usato da questa pagina.

## 8. Stile

Token (valori tema chiaro → scuro `[data-theme="dark"]`): `--color-primary` #204769 → #6F9BCB; `--color-primary-50` #f2f5f6 → #232C3A; `--color-text-active` #4A4D53 → #E6E8EC; `--color-text-inactive` #6E7175 → #9AA2AE; `--color-text-disabled` #A9AAAD → #5E6675; `--color-link` #5C9CD4 → #6BA6E0; `--color-success` #007035 → #34D399; `--color-success-light` #E4F8EE → #11271F; `--color-error` #FF616E → #FF6B78; `--color-error-light` #FFEAEF → #2A1518; `--color-warning` #F57D03 → #F5A623; `--color-warning-light` #FFF3E0 → #2A2012; `--color-bg` #F8FCFF → #12151B; `--color-surface` #FFFFFF → #1A1E26; `--color-border` #CFD4DA → #2B313D; `--chart-1` #2E6DA4 → #4A8BC9; `--chart-2` #C4661F → #D9722F; `--chart-3` #A8407F → #D0609F; `--chart-4` #A8862F (uguale); `--chart-5` #1E9E95 (uguale); `--chart-7` #5B43A0 → #9585E0; `--radius-md` 6px; `--shadow-lg` `0 4px 16px rgba(32,71,105,.18)` → `0 8px 24px rgba(0,0,0,.55)`; `--font-heading` Poppins; `--font-body` Open Sans. Nessuna regola dedicata a queste classi in `_skin-dark.sass`: il tema scuro passa solo dai token (eccetto i colori fissi indicati).

### 8.1 Pagina (`RichiesteFerie.sass`)
- `.rfe`: flex colonna, `align-items: stretch`, `gap: 12px`, `font-size: 13px`, `container: richiesteferie / inline-size`.
- `.rfe__toolbar`: flex, `align-items: flex-end`, `gap: 10px`, wrap; figli `min-width: 0`.
- `.rfe__field`: `width: 200px`, flex colonna, `gap: 6px`.
- `.rfe__push`: `margin-left: auto`, flex, `align-items: center`, `gap: 8px`.
- `.rfe__icon-btn`: 34×34, `border: 0`, `border-radius: 8px`, sfondo `--color-primary`, colore `#fff`, centrato; hover `filter: brightness(.92)`.
- `.rfe__smart i`: colore `--color-primary`.
- **Schede** `.rfe__tabs`: `height: 34px`, inline-flex, `padding: 3px`, `gap: 0`, bordo 1px `--color-border`, `border-radius: 9px`, sfondo `--color-bg`.
  - `.rfe__tab`: inline-flex centrato, `gap: 5px`, `padding: 0 8px`, `border: 0`, `border-radius: 6px`, trasparente, `font-family: --font-body`, `font-size: 11.5px`, `font-weight: 600`, colore text-inactive, `white-space: nowrap`, `transition: all 150ms cubic-bezier(0.4,0,0.2,1)`. Hover (non attiva): colore primary. Attiva `--on`: sfondo `--color-surface`, colore primary, `box-shadow: 0 1px 3px rgba(15,17,23,.12)`.
  - `.rfe__tab-n`: `min-width: 18px`, `height: 16px`, `padding: 0 5px`, centrato, `border-radius: 9px`, sfondo `--color-border`, `font-size: 10.5px`, colore text-inactive. In scheda attiva: sfondo primary-50, colore primary. `--hot` (anche in scheda attiva): sfondo `--color-warning`, colore `#fff`.
- Stati (`.rfe .rfe__stato`, `.rfe-det .rfe__stato`): `font-weight: 600`, `display: block`, `min-width: 0`; `--attesa` warning, `--ok` success, `--ko` error, `--info` link (Al responsabile), `--neutro` text-inactive.
- `.rfe__stato-cell`: flex, `align-items: center`, `gap: 6px`, `min-width: 0`.
- `.rfe__iter`: `flex: 0 0 auto`, `font-size: 12px`, `cursor: help`; `--ok` success, `--ko` error, `--attesa` link.
- `.rfe__mod`: `font-size: 11px`, warning, `cursor: help`.
- Tipo (`.rfe .rfe__tipo`, `.rfe-det .rfe__tipo`): inline-flex, `gap: 6px`, `font-weight: 600`, icona 12px; colori: `--ferie` primary, `--permesso` link, `--rol` success, `--malattia` error.
- `.rfe__neg`: error, 600. `.rfe__dash`: text-inactive. `.rfe__strong`: 600, text-active. `.rfe__saldo-warn`: inline-flex, `gap: 4px`, warning, `cursor: help`.
- `.rfe .rfe__c` center, `.rfe .rfe__r` right (due classi per battere `.sib-table`).
- Tabella saldo `.rfe .rfe__table`: mixin `table-fit` (`table-layout: fixed`, `width: 100%`; th/td `vertical-align: middle`, `white-space: nowrap`, `overflow: hidden`); `.rfe__wrap`: bordo 1px border, `overflow-x: hidden`. Colonne `.rfe__scol-dip` 28%, `.rfe__scol-rep` 24%, `.rfe__scol-n` 12%.
- **Avatar** `.rfe__avatar`: 26×26, tondo, inline-flex centrato, sfondo primary, testo `#fff`, `font-size: 10px`, `font-weight: 700`, `letter-spacing: .3px`. Colore per reparto `data-rep` (indice 1-based in REPARTI_HR): 1 Front office `--chart-1`, 2 F&B `--chart-2`, 3 Housekeeping `--chart-5`, 4 Manutenzione `--chart-4`, 5 Cucina `--chart-7`, 6 Amministrazione `--chart-3`.
- **Valutazione** `.rfe__val`: inline-flex, `gap: 6px`, `padding: 3px 10px`, `border-radius: 999px`, `font-size: 12px`, 600, `cursor: help`, icona 12px; `--ok` sfondo success-light/testo success; `--warn` warning-light/warning; `--ko` error-light/error.
- Motivi `.rfe-tip__row`: `position: relative`, `padding-left: 14px`; `::before` pallino 7×7 a `left:0; top:6px`, tondo, colori **fissi** (non tokenizzati): base `#94A3B8`, `--ok` `#34D399`, `--warn` `#FBBF24`, `--ko` `#F87171`; il colore `info` usa il base.
- **Modali** `.rfe-modal`: flex colonna, `gap: 14px`, `padding: 4px 2px`. `.rfe-modal__grid`: grid `1fr 1fr`, `gap: 12px`. `.rfe-modal__actions`: flex, `justify-content: flex-end`, `gap: 8px`, `padding-top: 4px`. `.rfe-modal__text`: `margin: 0`, 13px, text-active. `.rfe-modal__lista`: `padding-left: 18px`, `max-height: 160px`, `overflow-y: auto`, 13px. `.rfe-modal__ore`: `width: 160px`.
- `.rfe-modal__info`: flex, `align-items: center`, `gap: 6px`, `padding: 8px 12px`, radius 6px, sfondo primary-50, 12px, text-active; `--warn`: sfondo warning-light, icona warning.
- `.rfe-modal__iter`: flex, `align-items: flex-start`, `gap: 8px`, `padding: 8px 12px`, radius 6px, sfondo primary-50, 12px; icona `margin-top: 2px`, colore per esito (ok success, ko error, attesa link).
- `.rfe-neg__riga`: `display: block`; tra due righe `margin-top: 6px`.
- **Dettaglio** `.rfe-det__head`: flex, centrato, `gap: 12px`. `__who`: colonna, `flex: 1`, `min-width: 0`. `__nome`: `--font-heading` 15px 700 text-active. `__rep`: 12px text-inactive. `__tipo.rfe__tipo`: `gap: 7px`, 13px, 700. `__facts`: grid `repeat(3, minmax(0,1fr))`, `gap: 12px 16px`, `padding: 12px 0`, bordo superiore e inferiore 1px border; `dt` 11px text-inactive; `dd` `margin: 3px 0 0`, 13px, 600, text-active. `__motivo`: flex, `align-items: flex-start`, `gap: 8px`, 12.5px text-active; icona `margin-top: 2px` error (`--warn`: warning). `__val`: colonna `gap: 6px`. `__motivi`: `padding-left: 18px`, colonna, `gap: 3px`, 12px (lo `ul` non azzera `list-style`: restano anche i marcatori dell'elenco). `__actions .sib-btn i`: `margin-right: 7px`. `__del.sib-btn`: `margin-right: auto`, colore error.

I colori di `.rfe__tipo--*` e `.rfe__stato--*` valgono sia sotto il root della pagina `.rfe` sia sotto `.rfe-det` (il contenuto della modale «Dettaglio richiesta»): la stessa modale aperta dal Piano ferie (root `.pfe`) mostra tipo e stato con gli stessi colori di Richieste. Sempre due classi nel selettore, per battere il design system a pari specificità.

### 8.2 Calendario (`RichiesteCalendario.sass`)
- `.rfc`: `container: rfc / inline-size`, flex colonna, `gap: 10px`.
- `.rfc__bar-top`: colonna, `gap: 8px`. `.rfc__nav`: flex, centrato, `gap: 6px`. `.rfc__nav-btn.sib-btn--icon i`: primary, 13px.
- `.rfc__mese`: `min-width: 150px`, centrato, `--font-heading` 15px 700 primary.
- `.rfc__count`: `margin-left: 10px`, 12px, text-inactive. `--drop`: inline-flex, `gap: 7px`, 600, primary.
- Legenda `.rfc__legend`: flex wrap, centrato, `gap: 6px 16px`. `.rfc__leg`: inline-flex, `gap: 7px`, 12px, text-inactive, nowrap. `.rfc__leg-dot`: 8×8 tondo, sfondo `var(--c)`, `box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 16%, transparent)`; `--c` per tipo: ferie chart-1, rol chart-5, permesso chart-4, malattia chart-3. `.rfc__leg-sep`: 1×14px, sfondo border.
- Campioni `.rfc__sw` 18×10, radius 3px: `--ok` sfondo `color-mix(text-inactive 22%)` + `box-shadow: inset 3px 0 0 text-inactive`; `--attesa` `border: 1.5px dashed text-inactive`; `--ko` sfondo `color-mix(text-inactive 10%)` + `linear-gradient(to bottom, transparent 45%, text-inactive 45%, text-inactive 58%, transparent 58%)` (riga barrata); `--fuori` bordo 1px border + `repeating-linear-gradient(-45deg, transparent 0 3px, color-mix(text-inactive 25%) 3px 4px)`.
- Matrice `.rfc__wrap`: bordo 1px border, radius 6px, sfondo surface, `overflow: hidden`. `.rfc__grid`: `width: 100%`, `table-layout: fixed`, `border-collapse: collapse`, `font-size: 11px`; th/td `height: 30px`, `padding: 0`, `border-left: 1px solid border`, centrati, nowrap, `overflow: hidden`. `thead th`: `height: 24px`, sfondo `--color-bg`, 700, text-active.
- `.rfc__c-dip` (col): `width: 168px`. `.rfc__dip-h`: `padding: 0 12px`, nessun bordo sinistro, a sinistra, text-inactive.
- `.rfc__r-gsett th`: `height: 20px`, bordo inferiore 1px, 10px, 600, text-inactive.
- `.rfc__row-end td/th`: bordo inferiore 1px (ultima corsia del dipendente); ultima riga del tbody senza bordo inferiore.
- `.rfc__dip`: `padding: 4px 12px`, senza bordo sinistro, bordo inferiore 1px, a sinistra, `vertical-align: middle`. `__dip-nome`: flex, centrato, `min-width: 0`, 12.5px, 600, text-active; `__dip-txt` ellipsis. `__dip-rep`: inline-flex, `gap: 5px`, 10.5px, text-inactive; icona 9px primary.
- `.rfc__segnala`: `flex: none`, `margin-left: 6px`, 11px; `--warn` warning, `--ko` error.
- Weekend/festivi `.rfc__we`: sfondo `color-mix(in srgb, var(--color-bg) 75%, transparent)`; in thead testo text-inactive. Festività `.rfc__fest`: error.
- Oggi `.rfc__oggi-col`: `box-shadow: inset 1px 0 0 primary, inset -1px 0 0 primary`; in thead sfondo primary, testo `--color-surface`.
- Fuori periodo `.rfc__fuori`: `repeating-linear-gradient(-45deg, transparent 0 4px, color-mix(text-inactive 12%) 4px 5px)`, testo text-disabled.
- Allerta giorno (thead) `.rfc__allerta`: sfondo `color-mix(in srgb, var(--color-error) 16%, transparent)`, testo error.
- Colonna finale `.rfc__c-fin` 64px; `.rfc__fin`: `padding: 0 8px`, `border-left: 2px solid border`, 600, text-active.
- **Barre**: `.rfc__bar-cell`: `padding: 3px 2px`; lo span del Tooltip figlio `display: block; width: 100%`. `.rfc__bar`: `--c` per tipo (ferie chart-1, rol chart-5, permesso chart-4, malattia chart-3), flex, centrato verticalmente, `gap: 5px`, `width: 100%`, `height: 22px`, `padding: 0 6px`, `overflow: hidden`, `border: none`, `border-radius: 5px`, colore `var(--c)`, 11px, 700, a sinistra, `cursor: pointer`, `transition: transform .15s, box-shadow .15s`. Hover: `box-shadow: 0 2px 8px color-mix(var(--c) 30%)`, `transform: translateY(-1px)`. Focus visibile: `outline: 2px solid primary`, `outline-offset: 1px`. Icona `flex: none`, 10px.
  - `--ok` (Approvata): sfondo `color-mix(var(--c) 18%)`, `box-shadow: inset 3px 0 0 var(--c)` (filetto a sinistra).
  - `--attesa` (Al responsabile e Da approvare): sfondo `color-mix(var(--c) 6%)`, `border: 1.5px dashed var(--c)`.
  - `--ko` (Rifiutata): sfondo `color-mix(text-inactive 10%)`, colore text-inactive; testo `.rfc__bar-txt` barrato (`line-through`).
  - `--uno`: `justify-content: center`, `padding: 0`.
  - `--prima`: angoli sinistri a 0; `--dopo`: angoli destri a 0.
  - `.rfc__bar-txt`: ellipsis. `.rfc__bar-stato`: `margin-left: auto`, 10px, 600, `opacity: .8`.
  - Tooltip `.rfc__tip`: colonna, `gap: 2px`, 11px; `__tip-t` 700; `__tip-hint` `opacity: .7`.
- **Trascinamento**: `body.rfc-dragging` `user-select: none`, `cursor: grabbing` (anche sulle barre). `.rfc__bar--mobile` `cursor: grab`, `touch-action: none` (barre trascinabili). `.rfc__bar--drag` `opacity: .35`. `.rfc__cell--drop` sfondo `color-mix(primary 14%)`, `box-shadow: inset 0 1px 0 primary, inset 0 -1px 0 primary`.
- **Menu**: `.rfc__cell--on` sfondo primary-50 + `inset 0 0 0 1px primary`. `.rfc__menu`: `position: fixed`, `left: var(--mx)`, `top: var(--my)`, `z-index: 300`, `width: 270px`, `padding: 4px 0`, bordo 1px, radius 6px, sfondo surface, `box-shadow: --shadow-lg`, `visibility: hidden` finché non è posizionato (`--ready` → visible). `__menu-title`: `padding: 9px 14px 7px`, `--font-heading` 11px 700, `letter-spacing: .03em`, `text-transform: uppercase`, text-inactive. `__menu-group`: `padding: 3px 0`, bordo superiore 1px. `__menu-sub`: `padding: 6px 14px 3px`, 11px, text-inactive. `__menu-item`: flex, centrato, `gap: 10px`, `width: 100%`, `padding: 7px 14px`, senza bordo/sfondo, text-active, 13px, a sinistra, pointer; hover sfondo primary-50.

### 8.3 Storico (`StoricoHr.sass`)
`.hrsto`: colonna, `gap: 8px`, `padding-top: 12px`, bordo superiore 1px. `__title`: 12px, 600, primary. `__list`: senza stile elenco, colonna, `gap: 10px`, `max-height: 220px`, `overflow-y: auto`. `__item`: flex, `gap: 10px`, `position: relative`; linea verticale `::after` (non sull'ultimo) a `left: 11px; top: 24px; bottom: -10px; width: 1px`, sfondo border. `__ico`: 22×22 tondo, 10px, sfondo primary-50, colore primary; ok success-light/success; ko error-light/error; mod warning-light/warning. `__body`: colonna, `gap: 3px`, 12px, text-active. `__head`: flex wrap, baseline, `gap: 2px 8px`. `__meta`: text-inactive 11px. `__mods`: `padding-left: 14px`. `__msg`: `padding: 6px 8px`, radius 6px, sfondo primary-50; icona primary `margin-right: 4px`. `__empty`: 12px text-inactive.

## 9. Responsività

- **Container `richiesteferie`** (root pagina):
  - `≤ 1360px`: tabella del saldo compatta (`font-size: 12px`, `thead th` 11px, padding orizzontale celle 6px) e scambio ThLabel intera→abbreviata (qui le abbreviazioni coincidono con le etichette intere).
  - `≤ 1000px`: filtro Reparto largo 160px.
- **Container `rfc`** (calendario) `≤ 1180px`: colonna Dipendente 136px; matrice 10px; barre `gap: 3px`, `padding: 0 4px`, 10px; stato in minuscolo sulla barra nascosto (`.rfc__bar-stato { display: none }`).
- La toolbar va a capo (wrap) quando non ci sta; il gruppo di pulsanti resta allineato a destra.
- **Nessuno scroll orizzontale**: la matrice è `table-layout: fixed` a `width: 100%` con `overflow: hidden`; le colonne-giorno si restringono. Nome dipendente con ellipsis (l'avviso regole resta sempre visibile). Le barre troncano il testo (ellipsis) e passano a sigla/icona in base ai giorni coperti; il testo completo è sempre nel Tooltip.
- Laptop 1366px con sidebar aperta: si attiva la compattazione del calendario (container ≤1180px) — 30/31 colonne-giorno restano leggibili con il numero e l'iniziale del giorno. 1920px: layout standard, colonna Dipendente 168px.
- Modali: larghezza massima per size (sm 360px, md 480px, lg 600px), `max-height: calc(100vh − 32px)` con scroll interno; la griglia dei fatti del dettaglio resta a 3 colonne.

## 10. Effetti e animazioni

- Schede: transizione `all 150ms cubic-bezier(0.4, 0, 0.2, 1)` su colore/sfondo/ombra.
- Barre: `transition: transform .15s, box-shadow .15s` (easing di default `ease`); hover sollevamento di 1px con ombra colorata del tipo.
- Trascinamento: barra originale a opacità .35, celle di destinazione evidenziate, cursore grab/grabbing, nessuna selezione di testo.
- Menu contestuale: nessuna animazione; compare solo dopo il posizionamento (niente salto visivo).
- Pulsante Excel: hover `brightness(.92)` (senza transizione).
- Nessuno skeleton/spinner oggi.
- `prefers-reduced-motion: reduce` (regola globale): durate di animazioni/transizioni portate a 0.01ms.

## 11. Accessibilità

- Schede: `role="tablist"` con `aria-label="Vista"`, ogni scheda `role="tab"` e `aria-selected`.
- Legenda `aria-label="Legenda"`. Intestazioni di tabella con `scope="col"`/`scope="row"`.
- Barre: elementi `button` focalizzabili con `aria-label` descrittivo; Invio/Spazio aprono il dettaglio; focus visibile con outline 2px primary.
- Navigazione mese: pulsanti con `aria-label` «Mese precedente» / «Mese successivo».
- Menu: `role="menu"` e voci `role="menuitem"`; Esc chiude; clic fuori e scroll chiudono.
- Icone decorative `aria-hidden="true"`; icone informative con `aria-label` (iter, «Modificata dall'HR», «Regole del piano non rispettate»).
- Modali: Esc chiude (componente Modal); nella ConfirmDialog il pulsante di conferma ha `autoFocus`.
- Excel: `aria-label="Esporta in Excel"`.
- Limite noto: lo spostamento è solo con puntatore (nessuna alternativa da tastiera oltre alla modifica del periodo nella modale).

## 12. Criteri di accettazione

1. Aprendo la pagina il titolo è «Richieste», il sottotitolo è quello di §4.1, la scheda attiva è «Tutte» e il mese mostrato è quello corrente.
2. I contatori delle schede contano tutte le richieste per stato e non cambiano scegliendo un reparto; il contatore «Da approvare» ha fondo arancio e testo bianco quando è > 0.
3. Scegliendo «Housekeeping» nel filtro Reparto il calendario mostra solo Sara Romano e Oscar Pettinari, anche se senza richieste nel mese.
4. Una richiesta approvata di 5 giorni appare come barra piena con filetto di 3px a sinistra, icona e testo del tipo; una in attesa è tratteggiata 1.5px; una rifiutata è grigia con il testo barrato; con ≥4 giorni e non approvata compare a destra «da approvare» / «al resp.» / «rifiutata».
5. Una barra di un solo giorno mostra solo l'icona centrata; di due giorni la sigla (FER/ROL/PER/MAL); il Tooltip riporta tipo · stato, periodo, ore, note e la riga «Clic: dettaglio e azioni · trascina: sposta · tasto destro: modifica».
6. Una richiesta che inizia nel mese precedente ha gli angoli sinistri squadrati; navigando con ‹/› e «Oggi» il mese cambia di conseguenza; i festivi hanno il numero rosso con il nome nel tooltip, oggi ha l'intestazione piena primary.
7. Cliccando una barra (movimento < 5 px) si apre «Dettaglio richiesta» con Periodo, Durata, Residuo / «Residuo se approvata», Richiesta il, Stato, Note del dipendente, storico e le azioni corrette per lo stato (Al responsabile → solo «Sollecita {nome}»; Approvata → senza «Approva»; Rifiutata → senza «Rifiuta»).
8. Trascinando una barra su altri giorni compare «Rilascia per spostare …», le celle di destinazione si evidenziano; al rilascio la conferma «Sposta richiesta» descrive il nuovo periodo e, se approvata, «Resta approvata e si aggiorna anche nel Piano ferie.»; confermando, il toast «Richiesta spostata» compare e lo storico contiene «Modificata» con «Spostata dal calendario».
9. Il tasto destro su una barra apre direttamente «Modifica richiesta»; il tasto destro su una casella vuota apre il menu «NOME COGNOME · G MES AAAA» con «Nuova richiesta» e i 4 tipi; scegliendo «ROL» la modale «Nuova richiesta» ha stato «Approvata», ore 2 e il campo Ore visibile.
10. Salvando la modifica senza cambiare nulla compare il toast «Nessuna modifica» / «Non hai cambiato nessun valore.»; con «Al» prima di «Dal» compare «La data di fine precede quella di inizio»; con Stato «Rifiutata» e motivo vuoto compare «Indica il motivo del rifiuto».
11. Approvando ferie che portano il saldo sotto zero compare «Autorizza il saldo negativo» con pulsante «Autorizza e approva» (rosso se oltre il negativo del piano); approvando, lo storico mostra «Approvata» con «Saldo negativo autorizzato: {n} gg».
   - (11a) Con un dipendente a residuo 0 gg nell'anno, inserendo dal tasto destro una nuova Ferie di 1 giorno con stato «Approvata», «Salva modifiche» apre «Autorizza il saldo negativo» con «il saldo va a **-1 gg**»; autorizzando, lo storico della nuova richiesta ha «Inserita dall'ufficio del personale» con «Stato: Approvata» e «Saldo negativo autorizzato: -1 gg».
   - (11b) Per una Ferie in attesa il «Residuo se approvata» del dettaglio, il saldo citato dalla valutazione e quello della conferma del negativo sono lo stesso numero, calcolato sull'anno di `dal` (es. ferie di gennaio dell'anno prossimo: residuo dell'anno prossimo, non di quello corrente).
   - (11c) Il dettaglio di una richiesta mostra il tipo (es. «Ferie» primary) e lo stato (es. «Approvata» verde) negli stessi colori sia in Richieste sia in Piano ferie.
   - (11d) Nel dettaglio di ra-32 (Andrea Grimaudo, Natale, rifiutata) lo storico mostra «Approvata dal responsabile» (Piero Aragona) e poi «Rifiutata» (Ufficio del personale, il giorno dopo) col motivo «Front office al completo per il cenone: anticipa al 20-22 dicembre.»; lo stesso per ra-21 (ROL di Davide Marini) col suo motivo.
12. Approvando un ROL con ore oltre il residuo compare «ROL insufficienti» con «Approva comunque».
13. «Rifiuta» resta disabilitato finché il motivo è vuoto; dopo il rifiuto il dettaglio mostra «Motivo del rifiuto: …» e il toast è «Richiesta rifiutata».
14. «Elimina» chiede sempre conferma (pulsante rosso «Elimina»), con la frase aggiuntiva per le approvate; dopo, la barra sparisce e il toast è «Richiesta eliminata».
15. «Approva consigliate (N)» compare solo se ci sono richieste Da approvare con valutazione «Approvabile» nel filtro corrente; confermando, tutte diventano approvate e il toast dice «N richieste approvate: sono nel Piano ferie.»
16. «Saldo ferie» apre «Saldo ferie {anno}» con 12 righe e colonne 28/24/12/12/12/12%; un residuo negativo è rosso, un residuo che andrebbe sotto zero con le in attesa è arancio con icona e tooltip «Se approvi quelle in attesa restano …».
17. L'export crea `richieste-assenze.xls` con le 11 colonne di §5.14 e il toast «Esportazione completata».
18. A container calendario ≤ 1180px la colonna Dipendente passa a 136px, il testo a 10px e lo stato sulle barre sparisce; a nessuna larghezza la matrice scorre in orizzontale.
19. Con `prefers-reduced-motion: reduce` il sollevamento delle barre e le transizioni delle schede sono istantanei.
20. In tema scuro barre, legenda e pillole usano i token scuri (es. ferie `#4A8BC9`), il fondo della matrice è `#1A1E26`.

## 13. File sorgente

- `src/modules/hr/RichiesteFerie/RichiesteFerie.tsx`
- `src/modules/hr/RichiesteFerie/GestioneRichieste.tsx`
- `src/modules/hr/RichiesteFerie/RichiesteCalendario.tsx`
- `src/modules/hr/RichiesteFerie/RichiesteFerie.sass`
- `src/modules/hr/RichiesteFerie/RichiesteCalendario.sass`
- `src/modules/hr/_storico/StoricoHr.tsx`, `src/modules/hr/_storico/StoricoHr.sass`
- `src/modules/hr/_hrGestione.sass` (mixin `hr-*`)
- `src/modules/hr/PianoFerie/regolePiano.ts` (regole del piano nella valutazione)
- `src/modules/hr/_presenze/presenze.model.ts` (`festivitaNazionale`, `GSETT`, `MESI_LUNGHI`, `repartoIcon`, `isoDi`, `dataDa`)
- `src/modules/hr/hrExport.ts`
- `src/store/useHrGestioneStore.ts`, `src/store/usePianiFerieStore.ts`, `src/store/useHrConfigStore.ts` (responsabili di reparto), `src/store/useTurniPersonaleStore.ts` (`occupazione`, `addGiorni`), `src/store/useConfirmStore.ts`
- `src/core/components/ConfirmDialog.tsx`, `Modal.tsx`, `Tooltip.tsx`, `ThLabel.tsx`, `PageHead.tsx`, `src/core/icons/Ico.tsx`
- `src/styles/_themes.sass`, `_colors.sass`, `_spacing.sass`, `_mixins.sass`, `_components.sass`
- `src/navigation/menu.ts`, `menuTourOperator.ts`, `menuRistoranti.ts`, `pageSubtitles.ts`, `menuHelpers.ts`, `src/core/icons/MenuIco.tsx`, `src/router/PageContent.tsx`, `src/layout/Topbar.tsx`
