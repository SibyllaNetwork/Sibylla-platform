# 11 — Turni del personale (`turni-personale`)

Scheda di riproduzione della pagina **Turni del personale** di Human Resources. Segue `_SCHEMA.md`. Componenti condivisi (PageHead, SelectField, SearchField, Tooltip, TruncatedText, Modal, ConfirmDialog/useConfirmStore, toast, `.sib-btn`, `.sib-table`) e token sono descritti in `00-fondamenta.md`; entità trasversali (dipendenti, reparti, richieste di assenza) in `01-modello-dati-e-api.md`. Qui c'è tutto ciò che è specifico della pagina.

---

## 1. Scopo e utenti

Pianificazione **settimanale** dei turni di servizio del personale di una struttura. Per ogni giorno della settimana (lunedì → domenica) si decide quali dipendenti sono in servizio.

- **Utenti**: l'ufficio del personale (HR) e i responsabili di reparto.
- **Come si compila**:
  - a mano, trascinando un nome dall'elenco del personale su un giorno;
  - oppure selezionando un dipendente nell'elenco e cliccando i giorni;
  - oppure facendosi proporre il turno da **Sibylla**, che considera ferie, permessi e malattie (richieste HR) e il carico di lavoro (occupazione prevista della struttura).
- Accanto a ogni nome un **cerchietto** conta i giorni ancora assegnabili nella settimana secondo il contratto del dipendente e scala a ogni assegnazione.
- **«Pubblica turno»** invia il turno ai dipendenti: arriva nel Centro notifiche (e, a regime, nell'App Op!) con i pulsanti «Scarica PDF» e «Visualizza turno».
- Impostazione visiva ripresa da "Calendario strategie": filtri + barra di stato + (elenco personale | settimana su 7 righe).

## 2. Accesso

- **Id pagina / route**: `turni-personale`. Nessun deep link con parametro (non esiste `turni-personale:<x>`).
- **Sidenav**: Human Resources › Gestione delle presenze › **Turni del personale** (voce presente anche nelle sidenav dedicate Tour Operator e Ristoranti, stesso percorso). Icona della voce: `fa-calendar-clock` (da `MenuIco`). Colore della sezione nel menu `#9B59B6`.
- **Sottotitolo di navigazione** (registro `pageSubtitles`): «Pianificazione e visualizzazione dei turni di lavoro» (usato da menu/ricerca; il PageHead della pagina ha un suo sottotitolo, vedi §4).
- **Breadcrumb**: quello standard della shell (vedi `00-fondamenta.md`), derivato dal percorso nella sidenav.
- **Ci si arriva da**:
  - sidenav;
  - Home (Timone), riquadro Human Resources: voce «Turni del personale» con icona `list-check`;
  - Profile analysis: pulsante «Turni» (`fa-solid fa-calendar-week`);
  - Centro notifiche, notifica «Suggerimento turni del personale»: pulsanti «Apri Turni del personale» e «Applica suggerimento». Prima di navigare impostano `focusLunedi` nello store, così la pagina si apre **sulla settimana della notifica** (poi il focus si azzera, vedi §5).
- **Da qui si naviga verso**: «Piano ferie» (`hr-piano-ferie`) con il pulsante nell'header.

## 3. Layout

Root `.tpe`: colonna flex, `gap: 12px`, `font-size: 13px`, **container** `turni` (`container-type: inline-size`).

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ PageHead: «Turni del personale»                              [📅 Piano ferie] │
│ «Trascina i nomi del personale sui giorni della settimana, oppure fatti …»    │
├───────────────────────────────────────────────────────────────────────────────┤
│ Struttura▾(220) Reparto▾(190)  Settimana                     [✨ Suggerimento │
│                                [<] 9 – 15 nov 2026 [>] [Questa settimana]      │
│                                                     Sibylla] [✈ Pubblica turno]│
├───────────────────────────────────────────────────────────────────────────────┤
│ 👆 Trascina un dipendente su un giorno, oppure …        Pubblicato il 06/11 … │  ← status bar
├──────────────────────┬────────────────────────────────────────────────────────┤
│ Personale        (12)│ Giorno  Occupazione  Personale in turno       Copertura│
│ [🔍 Cerca dipend…]   │ ┌────┐ 62%          [A. Grimaudo ×][G. Conti ×]   4/5 │
│ ▌⋮ Andrea Grimaudo ☂(3)│ │LUN │ ▬▬▬▬▬░░░     [S. Romano · Malattia]          │
│ ▌⋮ Giulia Conti     (5)│ │9 nov│                                             │
│   …                  │ └────┘                                                 │
│                      │ … 7 righe (LUN…DOM) …                                  │
│──────────────────────│ ● Front office ● F&B ● Housekeeping … ▨ Assente        │
│ [🗑 Svuota settimana] │ ⬚ Richiesta da approvare                               │
│ [💾 Salva]           │                                                        │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

Blocchi, dall'alto:

1. **PageHead** con titolo, sottotitolo e un'azione a destra (pulsante secondario «Piano ferie»).
2. **Filtri e azioni** `.tpe__filters`: flex, `align-items: flex-end`, `gap: 12px`, `flex-wrap: wrap`.
   - SelectField «Struttura» larghezza `220px`.
   - SelectField «Reparto» larghezza `190px`.
   - Blocco «Settimana» `.tpe__week` (colonna, `gap: 6px`): label, poi riga di navigazione alta `34px` (`gap: 8px`) con freccia ←, etichetta della settimana (min `150px`, centrata), freccia →, eventuale «Questa settimana».
   - Spaziatore elastico `.tpe__spacer` (`flex: 1 1 auto`) che spinge a destra i due pulsanti.
   - «Suggerimento Sibylla» (secondario) e «Pubblica turno» (primario), alti `34px`.
3. **Barra di stato** `.tpe__statusbar` (`role="status"`): riga flex, `gap: 8px`, `padding: 8px 14px`. A sinistra il messaggio contestuale, a destra (`margin-left: auto`) lo stato della settimana.
4. **Layout principale** `.tpe__layout`: grid `270px minmax(0, 1fr)`, `gap: 14px`, `align-items: start`.
   - **Colonna sinistra** `aside.tpe__sidebar`: sticky (`top: 12px`), `max-height: calc(100vh - 140px)`, colonna flex con header (titolo + contatore), ricerca, lista scorrevole, footer con «Svuota settimana» e «Salva» (impilati, grid 1 colonna, `gap: 6px`).
   - **Colonna destra** `.tpe__week-grid`: `padding: 14px`, colonna flex `gap: 6px`. Riga d'intestazione + **7 righe giorno** + legenda. Ogni riga usa la grid `--tpe-cols: 70px 120px minmax(0, 1fr) 76px` con `gap: 12px` (badge giorno | occupazione | chip del personale | copertura).
5. **Modale «Suggerimento di Sibylla»** (Modal `size="lg"`, max-width `600px`).
6. **Modali di conferma** (ConfirmDialog condiviso): «Svuota settimana», «Pubblica turno».

## 4. Elementi e testi

### Header (PageHead)
- Titolo: «Turni del personale».
- Sottotitolo: «Trascina i nomi del personale sui giorni della settimana, oppure fatti proporre il turno da Sibylla».
- Azione: pulsante `sib-btn sib-btn--secondary` con icona `fa-solid fa-calendar-days` e testo «Piano ferie».

### Filtri
| Controllo | Tipo | Label | Opzioni / testo |
|---|---|---|---|
| Struttura | SelectField `name="struttura"`, classe `tpe__field tpe__field--struttura` | «Struttura» | strutture del cliente corrente (`value = label = nome struttura`); default = struttura corrente della topbar |
| Reparto | SelectField `name="reparto"`, classe `tpe__field` | «Reparto» | «Tutti i reparti» (valore `''`), poi «Front office», «F&B», «Housekeeping», «Manutenzione», «Cucina», «Amministrazione» |
| Settimana | label `.tpe__week-label` | «Settimana» | — |
| Freccia indietro | `button.tpe__nav-btn`, icona `fa-solid fa-chevron-left` | aria-label «Settimana precedente» | Tooltip «Settimana precedente» |
| Etichetta | `span.tpe__week-txt` | — | formato `etichettaSettimana`: «9 – 15 nov 2026» se lunedì e domenica sono nello stesso mese, altrimenti «30 nov – 6 dic 2026» (mesi abbreviati: gen, feb, mar, apr, mag, giu, lug, ago, set, ott, nov, dic; separatore «–» en dash con spazi) |
| Freccia avanti | `button.tpe__nav-btn`, icona `fa-solid fa-chevron-right` | aria-label «Settimana successiva» | Tooltip «Settimana successiva» |
| Torna a oggi | `sib-btn sib-btn--ghost tpe__today` | «Questa settimana» | visibile **solo** se la settimana mostrata non è quella corrente |
| Suggerimento | `sib-btn sib-btn--secondary tpe__btn`, icona `fa-solid fa-wand-magic-sparkles` | «Suggerimento Sibylla» | apre la modale |
| Pubblica | `sib-btn sib-btn--primary tpe__btn`, icona `fa-solid fa-paper-plane` | «Pubblica turno» | — |

### Barra di stato
- **Senza dipendente selezionato**: icona `fa-solid fa-hand-pointer` (`.tpe__statusbar-ico`) + «Trascina un dipendente su un giorno, oppure selezionalo dall'elenco e clicca i giorni».
- **Con dipendente selezionato**: pallino del reparto (`.tpe__dot`) + «Assegnerai **{Nome} {Cognome}** ai giorni che cliccherai» + separatore «•» + «{residui} giorni su {giorniContratto} ancora da assegnare» (in `.tpe__meta`) + link-pulsante «Annulla selezione».
- **Stato della settimana** (a destra, `.tpe__statusbar-stato`), in quest'ordine di precedenza:
  - se pubblicata: «Pubblicato il {gg/mm} alle {hh:mm}»;
  - altrimenti se salvata: «Bozza salvata il {gg/mm} alle {hh:mm}, non pubblicata»;
  - altrimenti: «Bozza non pubblicata».
  - Se l'origine è Sibylla si accoda « · generato da Sibylla» e, se poi è stata ritoccata, «, modificato a mano». Esempio: «Pubblicato il 06/11 alle 17:30 · generato da Sibylla, modificato a mano».
  - Data/ora: `toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'})` + « alle » + `toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})`.

### Colonna «Personale»
- Header: titolo «Personale» + badge contatore con il numero di dipendenti filtrati.
- Ricerca: SearchField `name="cercaDipendente"`, placeholder «Cerca dipendente…» (con «…» carattere unico), pulsante di cancellazione che svuota.
- Lista `role="listbox"` aria-label «Dipendenti». Stato vuoto: «Nessun dipendente trovato.».
- **Riga dipendente** `.tpe__emp` (`role="option"`, `tabIndex=0`, `draggable`, `data-rep` = indice reparto):
  - barra verticale sinistra di 3px col colore del reparto (`::before`);
  - icona maniglia `fa-solid fa-grip-dots-vertical` (`.tpe__grip`);
  - nome «{Nome} {Cognome}» (TruncatedText, `.tpe__emp-name`);
  - riga secondaria «{Reparto} · {tipo contratto}» (TruncatedText, `.tpe__emp-sub`), es. «Front office · Full time»;
  - **icona assenze** `fa-solid fa-umbrella-beach` (`.tpe__emp-abs`, aria-label «Assenze nella settimana») solo se il dipendente ha almeno un'assenza nella settimana. Tooltip: elenco «{GIORNO_BREVE} {g mese}: {Tipo}» con suffisso « (da approvare)» per le richieste non ancora approvate, separati da « · ». Es.: «LUN 9 nov: Ferie · MAR 10 nov: Ferie (da approvare)». Variante grigia `--attesa` se **tutte** le assenze della settimana sono in attesa;
  - **cerchietto** `.tpe__count` con il numero di giorni residui. Tooltip: se residui > 0 «{n} giorno|giorni ancora da assegnare su {giorni} ({tipo})» (singolare «giorno» se n = 1), altrimenti «Tutti i {giorni} giorni del contratto sono assegnati ({tipo})». Varianti: `--done` se residui = 0, `--over` (rosso) se residui < 0.
- Footer:
  - `button.tpe__tool` icona `fa-solid fa-trash-can` «Svuota settimana», disabilitato se la settimana non ha turni;
  - `sib-btn sib-btn--primary tpe__save` icona `fa-solid fa-floppy-disk` «Salva».

### Griglia settimana
- Intestazione `.tpe__head`: «Giorno», «Occupazione», «Personale in turno», «Copertura» (l'ultima allineata a destra).
- **Riga giorno** `.tpe__day`:
  - **Badge** `.tpe__badge`: giorno breve in maiuscolo («LUN», «MAR», «MER», «GIO», «VEN», «SAB», «DOM») e sotto «{g} {mese}» (es. «9 nov»). SAB e DOM hanno la variante `--we`.
  - **Occupazione**: valore «{occ}%» con Tooltip «Occupazione prevista {occ}%: carico {basso|medio|alto}» + barra orizzontale riempita all'occupazione arrotondata ai 5 punti, colorata per livello.
  - **Chip** `.tpe__chips`:
    - se non c'è nessuno in turno e nessun assente: suggerimento «Trascina qui il personale» oppure, con un dipendente selezionato, «Clicca per assegnare»;
    - per ogni dipendente in turno: chip `.tpe__chip` (bordo sinistro col colore del reparto) con nome breve «{Iniziale}. {Cognome}» (es. «A. Grimaudo»); TruncatedText con testo completo nel tooltip «{Nome} {Cognome} · {Reparto}» e, se ha una richiesta in attesa quel giorno, « · {tipo minuscolo} da approvare». Pulsante `.tpe__chip-x` icona `fa-solid fa-xmark`, aria-label «Togli {Nome} {Cognome} dal turno», Tooltip «Togli dal turno». Variante `--attesa` (bordo tratteggiato) se il dipendente ha una richiesta in attesa quel giorno;
    - per ogni dipendente **non in turno con un'assenza** quel giorno: chip `.tpe__chip--assente` (rigato, non trascinabile, senza ×) con testo «{Iniziale}. {Cognome} · {Tipo}» (es. «S. Romano · Malattia») e tooltip «{Nome} {Cognome}: {tipo minuscolo}» + « (richiesta da approvare)» se in attesa. Variante `--assente-attesa` (tratteggiata) se in attesa.
  - **Copertura** `.tpe__cop`: «{inTurno}/{fabbisogno}» (es. «4/5»). Se sotto il fabbisogno: icona `fa-solid fa-triangle-exclamation` davanti e colore warning; altrimenti colore success. Tooltip «Fabbisogno sull'occupazione — {Reparto}: {assegnati}/{necessari} · …» (tutti i reparti, o solo quello filtrato).
- **Legenda** `.tpe__legend`: un pallino colorato per ciascun reparto con il nome, poi campione rigato «Assente» e campione tratteggiato «Richiesta da approvare».

### Colori dei reparti (`data-rep`)
`data-rep` = posizione del reparto in `REPARTI_HR` + 1; il colore va nella custom property `--rep` (default `--color-primary`):

| data-rep | Reparto | Token | Chiaro | Scuro |
|---|---|---|---|---|
| 1 | Front office | `--chart-1` | `#2E6DA4` | `#4A8BC9` |
| 2 | F&B | `--chart-2` | `#C4661F` | `#D9722F` |
| 3 | Housekeeping | `--chart-5` | `#1E9E95` | `#1E9E95` |
| 4 | Manutenzione | `--chart-4` | `#A8862F` | `#A8862F` |
| 5 | Cucina | `--chart-7` | `#5B43A0` | `#9585E0` |
| 6 | Amministrazione | `--chart-3` | `#A8407F` | `#D0609F` |

### Modale «Suggerimento di Sibylla»
- Titolo: «Suggerimento di Sibylla».
- Paragrafo: «Turno proposto per la settimana **{etichetta}**, calcolato su occupazione della struttura, contratti e richieste di ferie, permessi e malattia.»
- KPI (`dl`, 4 riquadri):
  - «Occupazione media» → «{n}%»;
  - «Picco» → «{GIORNO_BREVE} {g mese} · {occ}%» (es. «SAB 14 nov · 97%»);
  - «Turni proposti» → «{turni} su {fabbisognoTot} necessari»;
  - «Assenze considerate» → numero.
- Striscia di 7 riquadri giorno: giorno breve, numero di persone proposte (grande), «{occ}%».
- Elenco puntato delle **note** generate dall'algoritmo (testi in §6).
- Avviso (solo se la settimana ha già turni): icona `fa-solid fa-circle-info` + «Applicando il suggerimento sostituisci i {n} turni già inseriti in questa settimana.»
- Pulsanti a destra: «Annulla» (`sib-btn--secondary`), «Applica suggerimento» (`sib-btn--primary`, icona `fa-solid fa-wand-magic-sparkles`).

### Conferme (ConfirmDialog)
- **Svuota**: titolo «Svuota settimana», messaggio «Vuoi togliere tutti i turni della settimana **{etichetta}**?», pulsante «Svuota», stile pericoloso (`danger: true`).
- **Pubblica**: titolo «Pubblica turno», messaggio «Il turno della settimana **{etichetta}** arriverà ai dipendenti nel Centro notifiche, con i pulsanti **Scarica PDF** e **Visualizza turno**.», pulsante «Pubblica», stile non pericoloso.

### Toast (titolo sempre «Turni del personale»)
| Caso | Tipo | Testo |
|---|---|---|
| Assegnazione su un giorno di assenza bloccante | warning | «{Nome Cognome} è in {tipo minuscolo} {giorno lungo minuscolo} {g mese}.» es. «Sara Romano è in malattia lunedì 9 nov.» |
| Contratto esaurito | warning | «{Nome Cognome} ha già tutti i {giorni} giorni previsti dal contratto ({tipo}).» |
| Assegnato con richiesta in attesa | info | «{Nome Cognome} ha una richiesta di {tipo minuscolo} da approvare per {giorno lungo minuscolo} {g mese}.» |
| Suggerimento applicato | success | «Turno della settimana {etichetta} generato da Sibylla: puoi rifinirlo trascinando i nomi.» |
| Salva | success | «Turno salvato.» |
| Pubblica senza turni | warning | «La settimana non ha turni da pubblicare.» |
| Pubblicato | success | «Turno inviato a {destinatari} dipendenti nel Centro notifiche.» |

## 5. Stati e interazioni

**Stato iniziale**
- Settimana: quella di `focusLunedi` se impostato (arrivo da notifica), altrimenti il lunedì della settimana di oggi. Appena montata, se `focusLunedi` era valorizzato la pagina lo usa e lo azzera (`setFocus(null)`).
- Reparto «Tutti i reparti», ricerca vuota, nessun dipendente selezionato, modale chiusa.
- Struttura: quella corrente della topbar (stato locale della pagina; cambiandola **non** cambiano i dati, che oggi sono unici per tutte le strutture — mock).

**Filtri**
- **Reparto**: filtra l'elenco del personale, i chip in turno e assenti di ogni giorno, il fabbisogno (e quindi la copertura) e il dettaglio nel tooltip della copertura. Cambiarlo **annulla la selezione** del dipendente. Il conteggio dei turni della settimana (per Svuota/Pubblica/avviso del suggerimento) e la pubblicazione restano su **tutti** i reparti.
- **Ricerca**: confronto case-insensitive, testo rifilato, su «{nome} {cognome}» oppure sul nome del reparto.
- Nessun ordinamento: l'elenco segue l'ordine dei dipendenti (id 1 → 12). Nessuna paginazione.

**Navigazione settimana**: ← / → spostano di 7 giorni; «Questa settimana» torna al lunedì corrente.

**Selezione dipendente**
- Clic sulla riga (o Invio / Spazio con il focus) seleziona; un secondo clic deseleziona. La riga selezionata prende la variante `--active`.
- Con un dipendente selezionato le righe giorno diventano cliccabili (cursore `copy`, bordo al passaggio) e un clic su un giorno tenta l'assegnazione. «Annulla selezione» nella barra di stato deseleziona.

**Trascinamento** (HTML5 drag & drop, tipo dati `application/x-sibylla-turno`, payload JSON `{ id, da? }`, `effectAllowed = 'move'`)
- Da una riga dell'elenco: `{ id }` → assegnazione nuova.
- Da un chip in turno: `{ id, da: <giorno origine> }` → spostamento (l'evento non risale alla riga giorno).
- Sopra un giorno: `dropEffect = 'move'` e la riga prende la variante `--over`; lasciando la riga (senza entrare in un suo figlio) la variante si toglie. Al rilascio la variante si toglie e parte la prova di assegnazione. Payload non pertinente: ignorato in silenzio.
- Clic su un chip non propaga (non assegna il dipendente selezionato).

**Prova di assegnazione** `prova(giorno, id, da?)`, in quest'ordine:
1. Se il dipendente ha un'assenza **bloccante** quel giorno (vedi §6 `bloccaTurno`) → toast warning, nessuna modifica.
2. Se è già in turno quel giorno → nessuna modifica, nessun messaggio.
3. Se è uno spostamento (`da`) → sposta dal giorno origine al giorno destinazione (nessun controllo del contratto: il numero di giorni non cambia; nessun toast informativo).
4. Se i giorni residui del contratto sono ≤ 0 → toast warning «… ha già tutti i …», nessuna modifica.
5. Altrimenti assegna; se quel giorno ha una richiesta di assenza **in attesa** → toast info.

**Rimozione**: × sul chip → toglie subito il dipendente da quel giorno (nessuna conferma: non è un'eliminazione di dati, è la modifica di una bozza).

**Svuota settimana**: abilitato solo con almeno un turno nella settimana → conferma → tutti i 7 giorni svuotati e lo stato della settimana riportato a `{ origine: 'manuale' }` (spariscono anche le date di salvataggio e pubblicazione: la barra mostra «Bozza non pubblicata»).

**Salva**: registra `salvataAt = adesso` sulla settimana → toast «Turno salvato.». Se la settimana era già pubblicata la barra continua a mostrare «Pubblicato il …» (la pubblicazione ha precedenza).

**Suggerimento Sibylla**: calcola il suggerimento per la settimana visualizzata e apre la modale. «Annulla» o chiusura della modale → nessuna modifica. «Applica suggerimento» → le assegnazioni dei 7 giorni sono **sostituite** da quelle proposte, origine `sibylla`, `modificata = false` (le date di salvataggio/pubblicazione esistenti restano) → modale chiusa → toast success.

**Pubblica turno**: se la settimana non ha turni → toast warning e stop. Altrimenti conferma → crea una **pubblicazione** (fotografia dei 7 giorni, destinatari = numero di dipendenti distinti in turno), imposta `salvataAt = pubblicataAt = adesso` → toast success. La pubblicazione genera la notifica per i dipendenti (vedi sotto).

**Marcatura "modificato a mano"**: ogni assegnazione, rimozione o spostamento sulla settimana (per lo spostamento conta la settimana del giorno di destinazione), se la settimana ha origine `sibylla`, imposta `modificata = true`. Se non esiste ancora uno stato per la settimana ne crea uno con origine `manuale`.

**Notifiche collegate** (fuori dalla pagina, ma alimentate dal suo store):
- **Centro notifiche**, gruppo dei suggerimenti all'HR (attivi se in Configura notifiche la riga «Turni del personale» ha il Centro notifiche spuntato; cadenza dalla select della stessa riga: «Ogni giorno», «Ogni settimana» (default), «Ogni due settimane», «Ogni mese»). Titolo «Suggerimento turni del personale», severità warning se il suggerimento ha scoperture, altrimenti info, ora «08:00». Testo: «Settimana {etichetta}: occupazione media {n}%, picco {giorno lungo minuscolo} {g mese} ({occ}%). Il turno proposto tiene conto di {n} assenze tra ferie, permessi e malattia.». Dettaglio: Settimana / Occupazione media / Picco («{Giorno lungo} {g mese} · {occ}%») / Turni proposti / Assenze considerate, note, pulsanti «Apri Turni del personale» (`fa-light fa-calendar-week`) e «Applica suggerimento» (`fa-light fa-wand-magic-sparkles`). «Applica» chiede conferma se la settimana ha già turni (titolo «Applica suggerimento», messaggio «La settimana **{etichetta}** ha già {n} turni: il suggerimento di Sibylla li sostituisce.», pulsante «Applica»), applica, mostra il toast «Turno della settimana {etichetta} generato da Sibylla.» e apre la pagina su quella settimana. Settimana suggerita = la **prossima**; giorni di arrivo secondo la cadenza: giornaliera → oggi, ieri, l'altro ieri; settimanale → lunedì di questa settimana e quello precedente; bisettimanale → lunedì di questa settimana; mensile → il primo del mese.
- **Turno pubblicato** (una notifica per ogni pubblicazione, la più recente non letta): titolo «Turno settimanale pubblicato», testo «È disponibile il turno della settimana {etichetta}: scaricalo in PDF o visualizzalo online.». Dettaglio: Settimana / Pubblicato il («{gg/mm/aaaa} · {hh:mm}») / Dipendenti in turno; pulsanti «Scarica PDF» (`fa-light fa-file-pdf`; toast «Download del turno avviato.» oppure errore «Impossibile generare il PDF del turno.») e «Visualizza turno» (`fa-light fa-eye`) che apre una Modal `xl` (max-width `780px`) titolata «Turno della settimana {etichetta}» con la vista in sola lettura (sotto).
- **Campanella topbar**: l'ultimo suggerimento («Sibylla ha preparato il turno della settimana {etichetta} su occupazione e richieste di assenza.», data «Oggi 08:00» o «{n} gg fa») e l'ultima pubblicazione («È disponibile il turno della settimana {etichetta}.»), entrambi con link «Apri nel Centro notifiche».

**Vista in sola lettura del turno pubblicato** (`TurnoSettimanale`, classe `.tsv`): tabella `.sib-table` con colonne «Dipendente», i 7 giorni (giorno breve + «g mese» sotto), «Giorni». Righe raggruppate per reparto (riga di gruppo con il nome del reparto su 9 colonne), poi i dipendenti. Cella giorno: in turno → icona `fa-solid fa-check` (aria-label «In turno»); assente approvato → il tipo («Ferie», «Malattia»…); altrimenti «Riposo». Ultima colonna: numero di giorni in turno.

**PDF del turno** (`turno_{lunedi}.pdf`, A4 orizzontale, generato lato client con jsPDF, margini 40pt): titolo «Turno del personale» (Helvetica bold 20, `#204769`), a destra «Settimana {etichetta}» (11, oro `#A2864C`), sotto «{struttura · }Pubblicato il {gg/mm/aaaa} alle {hh:mm}» (10, `#64748B`), filetto oro 1.2pt. Tabella: intestazione piena `#204769` testo bianco bold 9 («Dipendente», «{GIORNO} {g mese}» ×7, «Giorni»), colonna dipendente 170pt, totale 60pt, giorni a larghezza uguale, righe 20pt; riga di reparto su fondo `#E8EEF4` testo `#204769`; righe separate da linea `#D8E2EC` 0.6pt; celle «In turno» (bold `#204769`), tipo assenza (bold `#B7791F`), «Riposo» (`#64748B`); totale bold `#1E293B`. Nuova pagina (con intestazione ripetuta) se il reparto non sta nella pagina. Logo Sibylla 80pt in basso a destra.

**Caricamento/errore**: nessuno stato di caricamento (dati locali sincroni). Con un backend reale: vedi §7.

## 6. Dati e regole di business

### Entità
```ts
// Contratto ai fini dei turni
ContrattoTurno { tipo: string; giorni: number }   // giorni di servizio a settimana

// Assegnazioni: per data ISO (aaaa-mm-gg) l'elenco degli id dipendente in servizio
Assegnazioni = Record<string, number[]>

SettimanaTurni {           // chiave = ISO del lunedì
  origine: 'manuale' | 'sibylla'
  modificata?: boolean     // ritoccata a mano dopo il suggerimento
  salvataAt?: string       // ISO datetime
  pubblicataAt?: string    // ISO datetime
}

PubblicazioneTurno {
  id: string               // "pt-<base36 time>-<4 random>"
  lunedi: string
  at: string               // ISO datetime
  assegnazioni: Assegnazioni   // fotografia dei 7 giorni
  destinatari: number      // dipendenti distinti in turno
}

AssenzaGiorno { tipo: 'Ferie'|'Permesso'|'ROL'|'Malattia'; inAttesa: boolean; ore?: number }

SuggerimentoTurni {
  lunedi; assegnazioni; occupazioneMedia: number; picco: { iso; occ };
  turni: number; fabbisognoTot: number;
  assenzeConsiderate: { id; tipo; inAttesa; giorni }[];
  scoperture: { iso; reparto; mancano }[];
  note: string[]
}
```
Dipendenti (12, id 1–12) e reparti: `01-modello-dati-e-api.md` (`DIPENDENTI_HR`, `REPARTI_HR`). Richieste di assenza: store HR condiviso con Richieste/Piano ferie.

### Contratti (mock, `CONTRATTI_TURNO`)
| id | Dipendente | Reparto | Tipo | Giorni/sett. |
|---|---|---|---|---|
| 1 | Andrea Grimaudo | Front office | Full time | 5 |
| 2 | Giulia Conti | Front office | Full time | 5 |
| 3 | Marco Esposito | Cucina | Full time su 6 giorni | 6 |
| 4 | Sara Romano | Housekeeping | Part time 60% | 3 |
| 5 | Davide Marini | Front office | Part time 80% | 4 |
| 6 | Sergio Benvenuti | Manutenzione | Full time | 5 |
| 7 | Manuel Fantoni | Manutenzione | Part time 40% | 2 |
| 8 | Oscar Pettinari | Housekeeping | Full time | 5 |
| 9 | Luca Hambelli | Amministrazione | Full time | 5 |
| 10 | Elena Bianchi | F&B | Full time su 6 giorni | 6 |
| 11 | Chiara Ferri | F&B | A chiamata (3 giorni) | 3 |
| 12 | Paolo Greco | Cucina | Full time | 5 |

Dipendente senza contratto definito → `{ tipo: 'Full time', giorni: 5 }`. A regime il dato viene dalla scheda contratto dell'anagrafica.

### Formule
- **Lunedì della settimana**: `lunedi = data − ((giornoSettimana JS + 6) mod 7)` giorni (domenica = 0). Le date si costruiscono a mezzogiorno locale per evitare salti dell'ora legale.
- **Giorni residui** del dipendente nella settimana: `residui = contratto.giorni − (n. giorni della settimana in cui è assegnato)`.
- **Occupazione prevista** (mock deterministico per data): con `wd` = indice da lunedì (0) a domenica (6), `BASE_OCC = [62, 58, 61, 67, 83, 94, 76]`,
  `seed = (anno·372 + meseIndice0·31 + giorno)·9301 + 49297`, `rumore = ((seed mod 233280) / 233280)·12 − 6`,
  `occ = clamp(round(BASE_OCC[wd] + rumore), 35, 99)`.
- **Livello di carico**: `alto` se occ ≥ 85, `medio` se occ ≥ 65, altrimenti `basso`.
- **Fabbisogno per reparto** (persone necessarie nel giorno):
  - Front office: 3 se occ ≥ 85, 2 se occ ≥ 60, altrimenti 1;
  - Cucina: 2 se occ ≥ 80, altrimenti 1;
  - Housekeeping: 2 se occ ≥ 85, altrimenti 1;
  - Manutenzione: 0 la domenica, altrimenti 1;
  - Amministrazione: 0 sabato e domenica, altrimenti 1;
  - F&B: 2 se occ ≥ 80, altrimenti 1.
  - Fabbisogno del giorno = somma sui reparti (o solo il reparto filtrato).
- **Copertura** = `inTurno − fabbisogno`; < 0 = sotto (warning), ≥ 0 = ok.
- **Assenza del giorno** `assenzaDi`: fra le richieste del dipendente con `dal ≤ giorno ≤ al` e stato «Approvata», «Da approvare» o «Al responsabile», prevale l'approvata, altrimenti la prima. `inAttesa = stato ≠ 'Approvata'`. `ore` valorizzato solo se la richiesta è di un solo giorno (`dal = al`). Le rifiutate non contano.
- **Assenza bloccante** `bloccaTurno`: vero se esiste un'assenza **approvata** che non è un «Permesso» e non è un «ROL» di meno di 8 ore. Quindi: ferie, malattia e ROL a giornata intera approvati bloccano; permessi e ROL a ore restano assegnabili; le richieste in attesa non bloccano (ma generano il toast info e il chip tratteggiato).
- **Turni della settimana** = somma delle lunghezze delle 7 liste (tutti i reparti).

### Algoritmo di Sibylla `suggerisciTurni(lunedi, richieste)`
1. Giorni della settimana ordinati per occupazione decrescente («prima i giorni più carichi»).
2. Per ciascun reparto (ordine `REPARTI_HR`), con contatore residui = giorni di contratto di ciascun dipendente del reparto; un dipendente è **libero** in un giorno se non ha **nessuna** assenza (né approvata né in attesa: le richieste in attesa sono evitate per prudenza).
   - **1° giro**: per ogni giorno (dal più carico) assegna, finché serve, il candidato libero non ancora assegnato quel giorno con più residui (a parità vince l'ordine dei dipendenti). Se non bastano, registra una scopertura `{giorno, reparto, mancano}`.
   - **2° giro**: per ogni dipendente, i giorni di contratto rimasti vanno sui giorni più carichi dove è libero e il reparto ha fabbisogno > 0.
3. Assenze considerate: per ogni giorno e dipendente con assenza, raggruppate per (dipendente, tipo, inAttesa) contando i giorni.
4. `occupazioneMedia = round(somma occ / 7)`; picco = primo giorno con occupazione massima; `turni` = totale assegnazioni proposte; `fabbisognoTot` = somma dei fabbisogni di tutti i reparti nei 7 giorni.
5. Note, in quest'ordine:
   - «Picco di occupazione {giorno lungo minuscolo} {g mese} ({occ}%): più personale su Front office, Cucina e Housekeeping.»
   - per ogni assenza considerata: se in attesa «{Nome Cognome}: richiesta di {tipo minuscolo} ancora da approvare ({n} gg), lasciata libera per prudenza.», altrimenti «{Nome Cognome} assente per {tipo minuscolo} ({n} gg): turni coperti dai colleghi del reparto.»
   - per ogni reparto con scoperture (giorni in ordine di data): «{Reparto}: manca 1 turno|mancano {tot} turni ({elenco}). Valuta un extra o lo spostamento di un riposo.» dove l'elenco è il giorno breve minuscolo («lun», «sab»…) seguito da « ({mancano})» se ne mancano più di 1, separati da «, ».
6. Ogni lista giornaliera è ordinata per id crescente.

### Seed demo
Al primo avvio (e a ogni cambio di versione del persist) lo store genera:
- per la **settimana scorsa** e la **settimana corrente**: assegnazioni = suggerimento di Sibylla calcolato sulle richieste HR seed;
- stato: settimana scorsa `{ origine: 'sibylla', salvataAt: <venerdì precedente>T17:20:00, pubblicataAt: <venerdì precedente>T17:30:00 }`; settimana corrente uguale ma con `modificata: true` (la barra mostra «… · generato da Sibylla, modificato a mano»). "Venerdì precedente" = lunedì − 3 giorni;
- due pubblicazioni (`id = pt-seed-<lunedi>`, `at = <lunedi−3>T17:30:00`), la più recente (settimana corrente) per prima;
- `focusLunedi = null`. Le altre settimane partono vuote («Bozza non pubblicata»).

### Persistenza attuale (mock)
- Store zustand `useTurniPersonaleStore`, `localStorage` chiave **`sibylla.turni-personale`**, `version: 1`; la `migrate` rigenera il seed. Tutto lo stato è persistito (assegnazioni, settimane, pubblicazioni, focusLunedi). Ogni assegnazione/rimozione è salvata subito in locale: «Salva» registra solo la data di salvataggio.
- Le assenze vengono dallo store HR `sibylla.hr-gestione` (vedi `01-modello-dati-e-api.md`).
- Preferenze notifiche: `sibylla.notif-prefs` (`turniPersonale: true`, `turniCadenza: 'settimanale'` di default).

## 7. Backend da realizzare

Oggi tutto è mock (store persistito, occupazione, contratti e algoritmo nel frontend). Il backend deve fornire gli stessi dati e la stessa semantica. Prefisso coerente con le altre API HR: `/Sibylla/hr`. Tutte le richieste portano la struttura (`struttura` = id struttura selezionata). La rotta esistente `/FrontOffice/GetTurni` del servizio front office **non** è usata da questa pagina.

**Lettura settimana**
```
GET /Sibylla/hr/turni?struttura=12&lunedi=2026-11-09
200 {
  "lunedi": "2026-11-09",
  "stato": { "origine": "sibylla", "modificata": true,
             "salvataAt": "2026-11-06T17:20:00Z", "pubblicataAt": "2026-11-06T17:30:00Z" },   // null se mai toccata
  "assegnazioni": { "2026-11-09": [1,2,3], "2026-11-10": [1,5], ... },   // 7 chiavi sempre presenti
  "giorni": [ { "iso": "2026-11-09", "occupazione": 62,
                "fabbisogno": { "Front office": 2, "F&B": 1, "Housekeeping": 1, "Manutenzione": 1, "Cucina": 1, "Amministrazione": 1 } }, ... ],
  "contratti": { "1": { "tipo": "Full time", "giorni": 5 }, ... },
  "assenze": [ { "dipendenteId": 4, "iso": "2026-11-09", "tipo": "Malattia", "inAttesa": false, "ore": null }, ... ]
}
```
`occupazione` dal PMS (occupazione prevista), `fabbisogno` con le regole di §6 (a regime configurabili nella Turnistica di Configurazione HR), `contratti` dall'anagrafica, `assenze` con la regola `assenzaDi`.

**Modifiche puntuali** (stessa semantica delle azioni dello store; ognuna aggiorna `stato.modificata` se origine `sibylla` e crea lo stato `manuale` se assente)
```
POST   /Sibylla/hr/turni/2026-11-09/assegnazioni      { "iso": "2026-11-11", "dipendenteId": 5 }
DELETE /Sibylla/hr/turni/2026-11-09/assegnazioni/2026-11-11/5
POST   /Sibylla/hr/turni/2026-11-09/spostamenti       { "da": "2026-11-11", "a": "2026-11-12", "dipendenteId": 5 }
→ 200 { settimana aggiornata come in GET }
```
Errori (stessi controlli del frontend, che resta il primo filtro):
- `409 ASSENZA_BLOCCANTE` `{ "tipo": "Malattia" }` → il FE mostra il toast «… è in malattia …»;
- `422 CONTRATTO_ESAURITO` `{ "giorni": 5, "tipo": "Full time" }` (solo per nuove assegnazioni, non per spostamenti);
- `200` invariato se già assegnato quel giorno (idempotente).

**Svuota** `DELETE /Sibylla/hr/turni/2026-11-09` → 7 giorni vuoti, stato `{ "origine": "manuale" }` (senza date). Transazionale.

**Salva** `POST /Sibylla/hr/turni/2026-11-09/salva` → `{ "salvataAt": "…" }`.

**Suggerimento**
```
POST /Sibylla/hr/turni/2026-11-09/suggerimento        (calcolo, nessuna scrittura)
200 { "lunedi": "2026-11-09", "assegnazioni": {...}, "occupazioneMedia": 74,
      "picco": { "iso": "2026-11-14", "occ": 97 }, "turni": 46, "fabbisognoTot": 52,
      "assenzeConsiderate": [ { "id": 4, "tipo": "Malattia", "inAttesa": false, "giorni": 1 } ],
      "scoperture": [ { "iso": "2026-11-14", "reparto": "Front office", "mancano": 1 } ],
      "note": [ "Picco di occupazione sabato 14 nov (97%): …" ] }
POST /Sibylla/hr/turni/2026-11-09/applica-suggerimento   { "assegnazioni": {...} }
→ sostituisce i 7 giorni, origine "sibylla", modificata false, mantiene salvataAt/pubblicataAt. Transazionale.
```
Le note vanno restituite già formattate con i testi esatti di §6.

**Pubblica**
```
POST /Sibylla/hr/turni/2026-11-09/pubblica
200 { "id": "pt-…", "lunedi": "2026-11-09", "at": "2026-11-05T15:02:00Z",
      "assegnazioni": {...}, "destinatari": 11 }
422 SETTIMANA_VUOTA   → toast «La settimana non ha turni da pubblicare.»
```
Transazionale: crea la fotografia immutabile, imposta `salvataAt = pubblicataAt = at`, e **genera le notifiche** «Turno settimanale pubblicato» ai dipendenti in turno (Centro notifiche e App Op!). Ripubblicare crea una nuova pubblicazione (storico).

**Pubblicazioni e PDF**
```
GET /Sibylla/hr/turni/pubblicazioni?struttura=12          → [PubblicazioneTurno], più recente prima
GET /Sibylla/hr/turni/pubblicazioni/{id}                  → PubblicazioneTurno (per «Visualizza turno»)
GET /Sibylla/hr/turni/pubblicazioni/{id}/pdf              → application/pdf (facoltativo: oggi il PDF è generato nel client con il layout di §5)
```

**Notifiche di suggerimento all'HR**: job schedulato alle 08:00 secondo la cadenza scelta in Configura notifiche (giornaliera/settimanale/bisettimanale/mensile) che calcola il suggerimento della settimana successiva e crea la notifica «Suggerimento turni del personale» (severità warning se ci sono scoperture). Preferenze: `GET/PUT /Sibylla/notifiche/preferenze` con `{ "turniPersonale": true, "turniCadenza": "settimanale" }`.

## 8. Stile

Token (valore tema chiaro classic / scuro `[data-theme="dark"]`):
`--color-primary` `#204769` / `#6F9BCB`; `--color-primary-700` `#43617c` / `#1F2733`; `--color-primary-300` `#b3c1cc` / `#6B7686`; `--color-primary-200` `#ccd5dd` / `#8B95A3`; `--color-primary-50` `#f2f5f6` / `#232C3A`; `--color-text-active` `#4A4D53` / `#E6E8EC`; `--color-text-inactive` `#6E7175` / `#9AA2AE`; `--color-text-disabled` `#A9AAAD` / `#5E6675`; `--color-link` `#5C9CD4` / `#6BA6E0`; `--color-success` `#007035` / `#34D399`; `--color-warning` `#F57D03` / `#F5A623`; `--color-warning-light` `#FFF3E0` / `#2A2012`; `--color-error` `#FF616E` / `#FF6B78`; `--color-bg` `#F8FCFF` / `#12151B`; `--color-surface` `#FFFFFF` / `#1A1E26`; `--color-border` `#CFD4DA` / `#2B313D`; `--radius-xl` `12px`; `--font-heading` Poppins; `--font-body` Open Sans. Non ci sono regole specifiche della pagina in `_skin-dark.sass`: il tema scuro si ottiene solo dai token.

`$transition-fast` = `all 150ms cubic-bezier(0.4, 0, 0.2, 1)`.

| Classe | Valori |
|---|---|
| `.tpe` | flex column, gap 12px, font-size 13px, container `turni` inline-size; `[data-rep]{--rep: var(--color-primary)}`, `[data-rep="1..6"]{--rep: …}` come da tabella reparti |
| `.tpe__field` / `--struttura` | width 190px / 220px |
| `.tpe__week-label` | Poppins 12px 600, `--color-primary` |
| `.tpe__week-nav` | flex, align center, gap 8px, height 34px |
| `.tpe__nav-btn` | 34×34, border 1px `--color-border`, radius 8px, bg `--color-surface`, colore `--color-primary`, inline-flex centrato; hover: border-color `--color-primary` |
| `.tpe__week-txt` | min-width 150px, centrato, Poppins 14px 700, `--color-text-active`, nowrap |
| `.tpe__today` | height 34px (ghost: sfondo trasparente, testo link) |
| `.tpe__btn` | height 34px, inline-flex, gap 6px, nowrap |
| `.tpe__statusbar` | flex, gap 8px, padding 8px 14px, border 1px `--color-primary-200`, radius 8px, bg `--color-primary-50`, 12px, `--color-text-active`; `strong` `--color-primary` 700 |
| `.tpe__statusbar-ico` | `--color-primary`, 14px |
| `.tpe__sep` | margin 0 8px, `--color-text-disabled` |
| `.tpe__meta` | `--color-text-inactive` |
| `.tpe__statusbar-link` | senza bordo/sfondo, padding 0, 12px 600, `--color-link`; hover underline |
| `.tpe__statusbar-stato` | margin-left auto, 11px 600, `--color-text-inactive`, nowrap |
| `.tpe__dot` | 12×12, cerchio, bg `var(--rep)`, flex-shrink 0 |
| `.tpe__layout` | grid `270px minmax(0,1fr)`, gap 14px, align-items start |
| `.tpe__sidebar` | sticky top 12px, flex column, max-height `calc(100vh - 140px)`, overflow hidden, border 1px `--color-border`, radius 12px, bg surface |
| `.tpe__sidebar-head` | flex space-between, padding 12px 14px, border-bottom 1px border |
| `.tpe__sidebar-title` | Poppins 13px 700 `--color-primary` |
| `.tpe__sidebar-count` | min-width 24px, h 20px, padding 0 7px, border 1px border, radius 10px, bg `--color-bg`, 11px 700 `--color-text-inactive` |
| `.tpe__sidebar-search` | padding 10px 12px, border-bottom 1px border |
| `.tpe__list` | flex 1, overflow-y auto, padding 6px, column gap 2px; scrollbar custom: 4px, track `--color-primary-50`, thumb `--color-primary-300` radius 2px |
| `.tpe__list-empty` | padding 18px 14px, centrato, 12px `--color-text-disabled` |
| `.tpe__emp` | relative, flex, gap 8px, padding 8px 10px 8px 8px, border 1px transparent, radius 8px, cursor grab, user-select none, transition fast. `::before`: left 0, top/bottom 8px, w 3px, radius 0 3px 3px 0, bg `var(--rep)`. hover (non attivo): bg `--color-bg`. active: cursor grabbing. focus-visible: outline 2px `--color-link`, offset 1px. `--active`: border `--color-primary-200`, bg `--color-primary-50` |
| `.tpe__grip` | `--color-text-disabled`, 12px |
| `.tpe__emp-body` | flex 1, min-width 0, column gap 1px |
| `.tpe__emp-name` | block, 12px 600 `--color-text-active`; dentro `--active`: `--color-primary` 700 |
| `.tpe__emp-sub` | block, 10.5px `--color-text-inactive` |
| `.tpe__emp-abs` | 13px `--color-warning`, cursor help; `--attesa` `--color-text-disabled` |
| `.tpe__count` | 26×26 cerchio, bg `--color-primary`, testo `#fff` 12px 700, cursor help; `--done` bg `--color-bg` + border 1px border + testo disabled; `--over` bg `--color-error` |
| `.tpe__sidebar-foot` | grid 1 colonna, gap 6px, padding 10px 12px, border-top 1px border, bg `--color-bg` |
| `.tpe__tool` | h 32px, inline-flex centrato gap 6px, border 1px border, radius 6px, bg surface, `--color-text-inactive`, Open Sans 12px 600; hover (abilitato): border e testo `--color-primary`; disabled: opacity .5, not-allowed |
| `.tpe__save` | h 36px, inline-flex centrato, gap 6px |
| `.tpe__week-grid` | `--tpe-cols: 70px 120px minmax(0,1fr) 76px`; min-width 0; column gap 6px; padding 14px; border 1px border; radius 12px; bg surface |
| `.tpe__head` | grid `var(--tpe-cols)`, gap 12px, padding 0 10px 4px, 12px 600 `--color-text-inactive`; `.tpe__head-r` text-align right |
| `.tpe__day` | grid `var(--tpe-cols)`, align center, gap 12px, min-height 64px, padding 8px 10px, border 1px dashed transparent, radius 10px, bg `--color-bg`, transition fast. `--today`: `box-shadow: inset 0 0 0 1px var(--color-link)`. `--clickable`: cursor copy, hover border-color `--color-primary-300`. `--over`: border-color `--color-primary`, bg `--color-primary-50` |
| `.tpe__badge` | align-self stretch, min-height 46px, column centrata, radius 10px, bg `--color-primary`, testo `#fff`; `--we` bg `--color-primary-700` |
| `.tpe__badge-wd` | Poppins 13px 800, line-height 1.1 |
| `.tpe__badge-dm` | 10px 600, opacity .85 |
| `.tpe__occ` | min-width 0, column, stretch, gap 5px |
| `.tpe__occ-val` | 700 `--color-text-active`, cursor help |
| `.tpe__occ-bar` | w 100%, h 6px, radius 3px, bg `--color-border`, overflow hidden |
| `.tpe__occ-fill` | block, h 100%, radius 3px; `--basso` `--color-success`, `--medio` `--color-warning`, `--alto` `--color-error`; `[data-occ="0".."100"]` a passi di 5 → width 0%…100% |
| `.tpe__chips` | min-width 0, flex wrap, align center, gap 6px |
| `.tpe__drop-hint` | 12px `--color-text-disabled` |
| `.tpe__chip` | max-width 170px, min-width 0, h 28px, inline-flex, gap 6px, padding 0 6px 0 10px, border 1px border, border-left 3px solid `var(--rep)`, radius 6px, bg surface, cursor grab, 12px 600 `--color-text-active`. `--attesa`: border-style dashed (sinistro solid). `--assente`: border-left-color `--color-text-disabled`, bg `repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(15,17,23,.05) 4px, rgba(15,17,23,.05) 8px)`, testo `--color-text-inactive` 500, cursor default, padding-right 10px. `--assente-attesa`: dashed (sinistro solid) |
| `.tpe__chip-name` | block, min-width 0 (ellipsis dal TruncatedText) |
| `.tpe__chip-x` | senza bordo/sfondo, padding 2px, inline-flex, `--color-primary` 12px; hover `--color-error` |
| `.tpe__cop` | justify-self end, inline-flex gap 5px, 700, cursor help; `--ok` `--color-success`, `--sotto` `--color-warning` |
| `.tpe__legend` | senza puntini, margin 6px 0 0, flex wrap, gap 6px 14px, 12px `--color-text-inactive`; `li` inline-flex gap 6px |
| `.tpe__sw` | 16×12, border 1px border, radius 3px; `--assente` rigato `repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(15,17,23,.12) 2px, rgba(15,17,23,.12) 4px)`; `--attesa` border dashed `--color-text-inactive` |
| `.tpe-modal` | column gap 14px, padding 4px 0 0 |
| `.tpe-modal__lead` | margin 0, 13px `--color-text-active` |
| `.tpe-modal__kpi` | grid `repeat(4, minmax(0,1fr))`, gap 10px; `div` padding 10px 12px, border 1px border, radius 8px; `dt` 11px inactive; `dd` margin 2px 0 0, 700 active |
| `.tpe-modal__days` | grid `repeat(7, minmax(0,1fr))`, gap 6px |
| `.tpe-modal__day` | column centrata, gap 2px, padding 8px 4px, radius 8px, bg `--color-bg` |
| `.tpe-modal__day-wd` | 11px 700 `--color-primary` |
| `.tpe-modal__day-n` | Poppins 18px 700 active |
| `.tpe-modal__day-occ` | 11px inactive |
| `.tpe-modal__notes` | margin 0, padding-left 18px, column gap 5px, 12px active |
| `.tpe-modal__warn` | flex gap 6px, padding 8px 12px, radius 8px, bg `--color-warning-light`, 12px active; `i` `--color-warning` |
| `.tpe-modal__actions` | flex end, gap 8px |

Vista in sola lettura `.tsv` (modale del Centro notifiche): contenitore con border 1px border, `overflow-x: hidden`, `max-height: 62vh`, `overflow-y: auto`; tabella `.sib-table` con `table-layout: fixed; width: 100%`, celle `nowrap`/`overflow: hidden`/`vertical-align: middle`; colgroup Dipendente 23%, ciascun giorno 10%, Giorni 7%; celle giorno/totale centrate; `.tsv__wd` block 700; `.tsv__dm` block 11px 400 inactive; riga di gruppo bg `--color-bg`, Poppins 12px 700 `--color-primary`; in turno `--color-primary` 16px; assente `--color-warning` 12px 600; «Riposo» 12px disabled; totale 700 active.

## 9. Responsività

Container query sul root della pagina (`container-name: turni`), non sul viewport:

- **`@container turni (max-width: 1180px)`** (tipico laptop con sidebar aperta):
  - layout `230px minmax(0, 1fr)`;
  - `--tpe-cols: 60px 90px minmax(0, 1fr) 64px`;
  - chip max-width `140px`.
- **`@container turni (max-width: 900px)`**:
  - layout a una colonna (`1fr`): l'elenco del personale va sopra la settimana;
  - la sidebar non è più sticky (`position: static`) e la lista si limita a `max-height: 340px`.
- Sopra 1180 px (es. 1920 px) valgono i valori standard; la colonna chip si allarga (`minmax(0,1fr)`) e i chip vanno a capo.
- **Nessuno scroll orizzontale**: le colonne flessibili hanno `minmax(0, …)` e `min-width: 0`; i chip vanno a capo (`flex-wrap`); nomi e righe secondarie dei dipendenti e nomi nei chip sono in ellipsis con tooltip del testo completo (TruncatedText). La barra filtri va a capo (`flex-wrap`). Nella vista `.tsv` la tabella è a layout fisso in percentuale con `overflow-x: hidden`.
- Lo scroll verticale è interno alla lista del personale (sidebar alta al massimo `100vh − 140px`).

## 10. Effetti e animazioni

- `.tpe__emp` e `.tpe__day`: `transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1)` su sfondo/bordo (hover, selezione, trascinamento sopra).
- Cursori: `grab` / `grabbing` su righe e chip trascinabili, `copy` sui giorni cliccabili, `help` su occupazione, cerchietto, assenze e copertura, `not-allowed` su «Svuota settimana» disabilitato.
- Durante il trascinamento: anteprima nativa del browser; la riga giorno di destinazione si evidenzia (bordo tratteggiato primary + sfondo primary-50).
- Nessuna animazione d'ingresso, skeleton o spinner. Le modali usano l'apertura del componente Modal condiviso (backdrop sfocato 3px, vedi `00-fondamenta.md`).
- `prefers-reduced-motion: reduce`: regola globale che porta durate di transizioni e animazioni a `0.01ms`.

## 11. Accessibilità

- Barra di stato `role="status"` (annuncia la selezione e lo stato della settimana).
- Elenco: `aside` con `aria-label="Personale"`; lista `role="listbox"` `aria-label="Dipendenti"`; righe `role="option"` con `aria-selected`, focusabili (`tabIndex=0`); **Invio** o **Spazio** selezionano/deselezionano (default impedito); focus visibile con outline 2px link.
- Frecce settimana: `aria-label` «Settimana precedente» / «Settimana successiva» + Tooltip.
- × dei chip: `aria-label` «Togli {Nome} {Cognome} dal turno».
- Icona assenze: `aria-label` «Assenze nella settimana». Icone decorative `aria-hidden="true"`; i pallini della legenda e lo spaziatore sono decorativi.
- Modali: Esc / clic sul backdrop chiudono (comportamento del Modal condiviso); le conferme usano ConfirmDialog.
- Limite: assegnazione e spostamento via tastiera avvengono solo con selezione + clic sul giorno (le righe giorno non sono focusabili); il trascinamento è solo con mouse.

## 12. Criteri di accettazione

1. La pagina si apre sulla settimana corrente; l'etichetta segue il formato «9 – 15 nov 2026» o «30 nov – 6 dic 2026»; ← e → spostano di 7 giorni e compare «Questa settimana» solo fuori dalla settimana corrente.
2. Al primo avvio la settimana corrente e quella precedente sono compilate; la barra di stato della corrente mostra «Pubblicato il {gg/mm} alle 17:30 · generato da Sibylla, modificato a mano», la precedente «… · generato da Sibylla»; la successiva «Bozza non pubblicata».
3. Ci sono 7 righe LUN…DOM; SAB e DOM hanno il badge più scuro (`--color-primary-700`); la riga di oggi ha il filetto interno color link.
4. Il cerchietto di ogni dipendente vale `giorni contratto − giorni assegnati` nella settimana, è grigio a 0 e rosso se negativo, con i tooltip esatti di §4.
5. Trascinando un dipendente con ferie/malattia/ROL a giornata approvati su quel giorno compare il toast warning «{Nome} è in {tipo} {giorno} {g mese}.» e non viene assegnato; con un permesso o ROL a ore viene assegnato.
6. Assegnando un dipendente con contratto esaurito compare «{Nome} ha già tutti i {n} giorni previsti dal contratto ({tipo}).»; spostando un suo chip su un altro giorno invece funziona.
7. Un dipendente assegnato in un giorno con richiesta in attesa genera il toast info e il suo chip ha il bordo tratteggiato; i dipendenti non in turno con assenza compaiono come chip rigati «{I}. {Cognome} · {Tipo}».
8. La copertura «n/m» usa il fabbisogno di §6; sotto il fabbisogno è arancione con l'icona triangolo, altrimenti verde; il tooltip elenca i reparti «Reparto: a/b» separati da « · ».
9. La barra occupazione è verde sotto 65%, arancione da 65% a 84%, rossa da 85%, con larghezza arrotondata ai 5 punti; il tooltip dice «Occupazione prevista {n}%: carico {livello}».
10. Filtrando per reparto l'elenco, i chip e la copertura si limitano al reparto e la selezione si annulla; la ricerca trova per nome, cognome o reparto; senza risultati compare «Nessun dipendente trovato.».
11. Selezionato un dipendente, la barra di stato mostra «Assegnerai … ai giorni che cliccherai • {r} giorni su {g} ancora da assegnare» e cliccare un giorno lo assegna; «Annulla selezione» ripristina il messaggio iniziale.
12. «Suggerimento Sibylla» apre la modale con i 4 KPI, i 7 giorni, le note e (se la settimana ha turni) l'avviso di sostituzione; «Applica suggerimento» sostituisce i turni e mostra il toast; un successivo ritocco aggiunge «, modificato a mano».
13. «Svuota settimana» è disabilitato a settimana vuota; con turni chiede conferma «Svuota settimana» e, confermando, svuota e riporta a «Bozza non pubblicata».
14. «Pubblica turno» su settimana vuota mostra «La settimana non ha turni da pubblicare.»; altrimenti conferma, toast «Turno inviato a {n} dipendenti nel Centro notifiche.» e compare nel Centro notifiche «Turno settimanale pubblicato» con «Scarica PDF» e «Visualizza turno».
15. Da una notifica «Suggerimento turni del personale», «Apri Turni del personale» apre la pagina sulla settimana della notifica.
16. Con il contenitore della pagina ≤ 1180 px la colonna del personale è 230 px e le colonne della settimana 60/90/1fr/64; ≤ 900 px l'elenco va sopra la settimana (alto max 340 px); a nessuna larghezza compare uno scroll orizzontale e i nomi troncati mostrano il tooltip completo.
17. In tema scuro tutti i colori seguono i token (badge `#6F9BCB`, sfondo righe `#12151B`, card `#1A1E26`) e i colori dei reparti usano le varianti scure dei `--chart-*`.
18. Ricaricando la pagina le modifiche restano (oggi `localStorage` `sibylla.turni-personale`; a regime dal backend).

## 13. File sorgente

- `src/modules/hr/TurniPersonale/TurniPersonale.tsx`
- `src/modules/hr/TurniPersonale/TurniPersonale.sass`
- `src/modules/hr/TurniPersonale/TurnoSettimanale.tsx`
- `src/modules/hr/TurniPersonale/TurnoSettimanale.sass`
- `src/modules/hr/TurniPersonale/turnoPdf.ts`
- `src/store/useTurniPersonaleStore.ts`
- `src/store/useHrGestioneStore.ts` (dipendenti, reparti, richieste di assenza)
- `src/store/useNotifPrefsStore.ts`
- `src/hooks/useStrutturaCorrente.ts` (`useStrutturaPagina`)
- `src/modules/notifiche/CentroNotifiche/CentroNotifiche.tsx` (notifiche suggerimento/pubblicazione)
- `src/modules/notifiche/ConfiguraNotifiche/ConfiguraNotifiche.tsx` (riga «Turni del personale» + cadenza)
- `src/layout/NotifMenu.tsx` (campanella)
- `src/navigation/menu.ts`, `src/navigation/menuTourOperator.ts`, `src/navigation/menuRistoranti.ts`, `src/navigation/pageSubtitles.ts`, `src/core/icons/MenuIco.tsx`
- `src/router/PageContent.tsx`
- `src/modules/home/Timone/Timone.tsx`, `src/modules/hr/ProfileAnalysis/ProfileAnalysis.tsx` (link in ingresso)
- `src/core/components/Modal.tsx`, `src/styles/_components.sass` (dimensioni modale, reduced motion)
- `src/styles/_themes.sass`, `src/styles/_colors.sass`, `src/styles/_spacing.sass`, `src/styles/_mixins.sass`, `src/styles/_tokens.sass`
