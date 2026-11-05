# 08 · Cedolini

> Scheda di riproduzione della pagina `hr-cedolini`. Componenti condivisi (PageHead, Modal, Tooltip, TruncatedText, ThLabel, filtri di colonna `useColFilters`, Pagination, Toast, ConfirmDialog, campi form, `Ico`, `sib-btn`, `sib-table`) e mixin HR comuni: vedi `00-fondamenta.md`. Entità trasversali (anagrafica `DIPENDENTI_HR`, store `useHrGestioneStore`): vedi `01-modello-dati-e-api.md`. La **vista dettagliata** riusa il componente mensile del Registro presenze (`RegistroMensile`), il modello delle presenze e gli export Excel/PDF descritti in `06-registro-presenze.md` (§4.5, §6, §6.10, §6.11): qui si descrivono solo le differenze della variante «cedolino».

---

## 1. Scopo e utenti

Pagina dell'**ufficio del personale** per le buste paga del mese:

- **caricare** i cedolini del mese (entrano in **bozza**), **controllarli** e **pubblicarli**: da quel momento il dipendente li trova nella sua area dell'App Op! e la colonna «Visto» dice se li ha aperti;
- **vista Dettagliata**: le presenze del mese di ogni dipendente (dal Registro presenze) per controllare la busta paga e **approvare lo straordinario** giorno per giorno o tutto il mese; da qui il PDF del calendario presenze con lo straordinario approvato, da firmare, e il registro Excel per il consulente del lavoro.

Lo straordinario approvato qui è quello che Trasmetti consuntivo (06 §6.8) invia al software paghe quando è attiva la regola «solo straordinario approvato».

## 2. Accesso

- **id pagina / route**: `hr-cedolini` (router: `if (page === 'hr-cedolini') return <Cedolini navigate={navigate}/>`).
- **Sidenav**: «Human Resources» › «Gestione delle presenze» › «Cedolini» (dopo «Nota spese»). Icona menu: `fa-file-invoice-dollar`. Presente anche nei menu Tour Operator e Ristoranti.
- **Breadcrumb**: Human Resources › Gestione delle presenze › Cedolini.
- **Indietro**: PageHead con `onBack={() => navigate('home')}`.
- Nessun deep link; nessuna navigazione verso altre pagine.

## 3. Layout

### 3.1 Vista Tabella

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [‹ Indietro]                    Cedolini          [✈ Pubblica bozze (6)] [⇪ Carica cedolini] │
│                  Carica, controlla e pubblica le buste paga del personale               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Mese [180]  Reparto [180]  Stato [140]  [🔍 Cerca dipendente… 220]      [xls] [Tabella|Dettagliata] │
├────────────┬────────┬───────┬──────┬──────┬──────┬──────────┬─────┬────────┤
│ Dipendente▾│Reparto▾│ Mese  │Lordo▾│Netto▾│Stato▾│Pubblicato│Visto│ Azioni │  ← colgroup in %
├────────────┼────────┼───────┼──────┼──────┼──────┼──────────┼─────┼────────┤
│ Andrea Gr… │Front o…│Ottobre│2.150,│1.591,│Pubbl.│04/11/2026│ 👁  │ 📄     │
│ Giulia Co… │Front o…│Ottobre│1.980,│1.465,│Bozza │    -     │  -  │ 📄 ✈ 🗑 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  Ottobre 2026: 6 pubblicati, 6 in bozza   2 non ancora aperti …   Netto del mese: … €    │ ← riga riepilogo a destra
│                                   ‹ 1 2 ›                                               │ ← paginazione centrata
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

- Root `.ced` (mixin `hr-root(cedolini)`): `display:flex; flex-direction:column; align-items:stretch; gap:12px; font-size:13px; container-type:inline-size; container-name:cedolini`.
- Toolbar `.ced__toolbar` (mixin `hr-toolbar`): `display:flex; align-items:flex-end; gap:10px`, figli `min-width:0`, **senza wrap** (`flex-wrap:nowrap`), `margin-bottom:14px`. A destra `.ced__push` (`margin-left:auto; display:flex; align-items:center; gap:8px; flex:none`).
- Tabella in `.sib-table-wrap.ced__wrap` (bordo 1px `--color-border`, `overflow-x:hidden`).
- Riga riepilogo `.ced__foot` sotto la tabella, poi paginazione `.ced__pag` centrata.

### 3.2 Vista Dettagliata

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHead (come sopra)                                                                   │
│ Mese  Reparto  Stato  [Cerca]                               [xls] [pdf] [Tabella|Dettagliata] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ ● Ordinarie ● Straordinario ● Riposo ● Ferie ● ROL ● Permesso ● Malattia ● Assente ● Anomalia │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ (SB) Sergio Benvenuti  🔧 Manutenzione   [✓✓ Approva straordinario del mese (2h 15')] ✔ Cedolino pubblicato 👁 │
│ Giorno │1│2│…│Totale                                                                    │
│ G. sett.                                                                                 │
│ Tipo / Ingresso / Uscita / Ore extra                                                     │
│ Str. approvato │ │○│1h 15'│…│ 1h 15'   ← riga cliccabile, alt. 26px                      │
│ 160,0h Ordinarie · 2h 15' Ore extra · 1h 15' Straordinario approvato   Clic su una cella … │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

- Sostituisce tabella, riepilogo e paginazione. Il selettore di vista resta nella toolbar (non nella legenda).

### 3.3 Modali e popover

| Elemento | Tipo |
|---|---|
| Carica cedolini | Modal `size="md"`, corpo `.ced-modal` |
| Anteprima «Cedolino» | Modal `size="sm"`, corpo `.ced-modal` > `.ced-slip` |
| Pubblica / Elimina | ConfirmDialog |
| Straordinario approvato | popover `role="dialog"` fixed, 260px (in RegistroMensile) |

## 4. Elementi e testi

### 4.1 PageHead
- Titolo «Cedolini»; sottotitolo «Carica, controlla e pubblica le buste paga del personale».
- Azioni (`.ced__head-actions`, flex gap 10px):
  - solo se nel mese ci sono bozze: `sib-btn sib-btn--secondary` con icona `fa-duotone fa-paper-plane` 13px + « Pubblica bozze ({n})»;
  - sempre: `sib-btn sib-btn--primary` con icona `fa-duotone fa-arrow-up-from-bracket` 14px + « Carica cedolini».

### 4.2 Toolbar

| Controllo | Props / testi | Larghezza |
|---|---|---|
| `SelectField` «Mese» (name `mese`) | opzioni = mese corrente + mesi con cedolini, dal più recente; etichetta «{Mese} {aaaa}» | 180px → 150px |
| `SelectField` «Reparto» | «Tutti i reparti», «Front office», «F&B», «Housekeeping», «Manutenzione», «Cucina», «Amministrazione» | 180px → 150px |
| `SelectField` «Stato» | «Tutti», «Bozza», «Pubblicato» | 140px → 120px |
| `SearchField` | placeholder «Cerca dipendente…», pulsante di pulizia | 220px → 170px |
| Vista Tabella: Excel | `button.ced__icon-btn`, icona `fa-regular fa-file-xls` 16px bianca, Tooltip/aria «Esporta in Excel» | 34×34 |
| Vista Dettagliata: Excel | icona `fa-regular fa-file-xls`, Tooltip/aria «Registro presenze in Excel», disabilitato senza dipendenti | 34×34 |
| Vista Dettagliata: PDF | icona `fa-regular fa-file-pdf` (in generazione `fa-regular fa-spinner fa-spin`), Tooltip «PDF delle presenze con lo straordinario approvato», aria «PDF delle presenze», disabilitato senza dipendenti o durante l'export | 34×34 |
| VistaSwitch | `aria-label="Vista dei cedolini"`; opzioni «Tabella» (`fa-solid fa-table-list`) e «Dettagliata» (`fa-solid fa-calendar-days`) | auto |

### 4.3 Tabella (vista Tabella)

Colgroup (somma 100%): Dipendente 17%, Reparto 13%, Mese 11%, Lordo 10%, Netto 10%, Stato 10%, Pubblicato il 10%, Visto 9%, Azioni 10%.

| Intestazione (ThLabel: intera / abbreviata) | Filtro di colonna | Cella |
|---|---|---|
| «Dipendente» / «Dip.» | ricerca testo + ordinamento | «{nome} {cognome}», 600 `--color-text-active`, ellipsis |
| «Reparto» / «Rep.» | multiselezione (i 6 reparti) + ordinamento | reparto, ellipsis |
| «Mese» | — | «{Mese} {aaaa}» |
| «Lordo» (destra) | ordinamento | `eurHr`, es. «2.150,00 €» |
| «Netto» (destra) | ordinamento | `eurHr`, 600 text-active |
| «Stato» | multiselezione «Bozza», «Pubblicato» | testo colorato: «Bozza» `--color-warning` (#F57D03), «Pubblicato» `--color-success` (#007035), 600 |
| «Pubblicato il» / «Pubbl. il» | ordinamento | «gg/mm/aaaa» oppure «-» |
| «Visto» (centro) | multiselezione «Aperto», «Non aperto», «Non pubblicato» | bozza: «-» grigio; aperto: `fa-solid fa-eye` 16px `--color-primary` con Tooltip «Aperto dal dipendente»; non aperto: `fa-solid fa-eye-slash` 16px `--color-text-disabled` (#A9AAAD) con Tooltip «Non ancora aperto dal dipendente» |
| «Azioni» (centro) | — | icone `fa-solid` 16px `--color-primary` senza box (gap 14px): `fa-file-pdf` «Visualizza cedolino» (sempre), `fa-paper-plane` «Pubblica» (solo bozza), `fa-trash` «Elimina» (solo bozza); Tooltip e aria-label = testo |

Stato vuoto (una riga, colspan 9): «Nessun cedolino caricato per {Mese} {aaaa}.» se il mese non ha cedolini, altrimenti «Nessun cedolino corrisponde ai filtri impostati.».

Riga riepilogo (`.ced__foot`, allineata a destra, gap 18px, 12px `--color-text-inactive`, valori `strong` text-active):
- «{Mese} {aaaa}: **{n}** pubblicati, **{n}** in bozza»
- solo se > 0: «**{n}** non ancora aperti dal dipendente»
- solo se > 0: «Mancano **{n}** dipendenti»
- «Netto del mese: **{€}**»

### 4.4 Vista Dettagliata (`RegistroMensile` variante `cedolino`)
Uguale alla variante registro (06 §4.5) con queste differenze:
- Legenda senza «Modificato dall'HR» e senza selettore di vista.
- Nei chip Tipo **nessun** bollino matita; celle in sola lettura (cursore normale): nessun menu contestuale personalizzato (il tasto destro apre il menu del browser), nessun doppio clic.
- Header del riquadro, a destra:
  - se ci sono giorni STR non ancora approvati: `sib-btn sib-btn--ghost` `fa-solid fa-check-double` «Approva straordinario del mese ({fmtExtra della somma})», es. «Approva straordinario del mese (2h 15')»;
  - stato del cedolino del mese: `fa-regular fa-file-circle-xmark` «Cedolino non caricato» (`--color-text-inactive`), oppure `fa-solid fa-file-pen` «Cedolino in bozza» (`--color-warning`), oppure `fa-solid fa-circle-check` «Cedolino pubblicato» (`--color-success`); 12px 600;
  - se il cedolino esiste: pulsante `fa-solid fa-eye` 16px primary, Tooltip/aria «Anteprima del cedolino».
- Riga aggiuntiva in fondo alla matrice: etichetta «Str. approvato» (viola `--chart-7` #5B43A0, Tooltip «Straordinario approvato»), alt. 26px:
  - giorno approvato: minuti approvati in `fmtExtra` (viola, 700);
  - giorno STR non approvato: pallino vuoto 7×7 (bordo 1.5px `--chart-7`) con Tooltip «Straordinario da approvare: clic per decidere», aria «Da approvare»;
  - colonna Totale: somma approvata del mese.
- Footer: in più «{fmtExtra} Straordinario approvato» (se > 0); niente «giorni modificati»; hint «Clic su una cella di Straord. approvato per approvarlo o correggerlo».

Popover «Straordinario approvato» (`role="dialog"`, `aria-label="Straordinario approvato"`, larghezza 260px):
- titolo maiuscolo «{nome} {cognome} · {g} {mese breve} {aaaa}»;
- «Ore extra timbrate: **{fmtExtra}**» (bold viola);
- `InputField type="number"` name `str-min`, label «Straordinario approvato (minuti)», valore iniziale = minuti già approvati oppure i minuti di straordinario della giornata;
- azioni: «Rimuovi» (`sib-btn--ghost`, solo se già approvato) e «Approva» (`sib-btn--primary`, disabilitato se il campo è vuoto o il numero non è ≥ 0).

### 4.5 Modale «Carica cedolini»
- `SelectField` name `up-mese`, label «Mese di competenza», opzioni come il filtro Mese.
- Se tutti hanno il cedolino del mese: «Tutto il personale ha già il cedolino di {Mese} {aaaa}.»
- Altrimenti: riga con «Dipendenti senza cedolino ({n})» (Poppins 12px 600 primary) e link «Seleziona tutti» / «Deseleziona tutti»; elenco di `CheckboxField` in 2 colonne, label «{nome} {cognome} · {reparto}»; hint «I cedolini vengono caricati in bozza: li pubblichi dopo averli controllati.».
- Azioni: «Annulla» (secondary) e «Carica ({n})» (primary; «Carica » senza numero e disabilitato con 0 selezionati).

### 4.6 Modale «Cedolino» (anteprima)
Riquadro `.ced-slip`: in alto nome «{nome} {cognome}» (heading 15px 700) e a destra «{Mese} {aaaa}» (12px); righe `dl`:
- «Retribuzione lorda» → lordo;
- «Contributi e ritenute» → «-{lordo − netto}»;
- «Netto in busta» → netto (riga in grassetto con bordo superiore);
- in fondo `fa-solid fa-file-pdf` 13px + nome file (ellipsis), es. «cedolino_2026-10_grimaudo.pdf».
Nessun pulsante (si chiude dalla X del Modal).

## 5. Stati e interazioni

### 5.1 Stato iniziale
- Vista: `localStorage['sibylla.cedolini.vista'] === 'dettagliata'` → Dettagliata, altrimenti Tabella. Ogni cambio salva `'dettagliata'` o `'tabella'` (try/catch).
- Mese: il **mese precedente** se ha cedolini, altrimenti il più recente dell'elenco. Reparto, Stato, Cerca vuoti; pagina 1.

### 5.2 Filtri, ordinamento, paginazione (Tabella)
- Righe = cedolini del mese, filtrati in AND per reparto, stato, testo (contenuto in «{nome} {cognome}», trim, case-insensitive) e per i filtri di colonna (testo su Dipendente; multiselezione su Reparto, Stato, Visto).
- Ordinamento di base per Dipendente (A→Z, `localeCompare`), poi l'eventuale ordinamento di colonna scelto dall'utente (Dipendente, Reparto, Lordo, Netto, Pubblicato il).
- 12 righe per pagina; ogni cambio di mese o filtro riporta a pagina 1.
- Valore «Visto» per il filtro: «Non pubblicato» se bozza, «Aperto» se visto, «Non aperto» altrimenti.

### 5.3 Pubblicazione
- Icona «Pubblica» di una riga: pubblica subito (nessuna conferma) → toast success titolo «Pubblicato», testo «Cedolino di {nome} {cognome} pubblicato.».
- «Pubblica bozze ({n})»: ConfirmDialog titolo «Pubblica cedolini», messaggio «Pubblicare il cedolino in bozza di {Mese aaaa}? I dipendenti riceveranno la notifica nella loro area.» (1 bozza) oppure «Pubblicare i {n} cedolini in bozza di {Mese aaaa}? I dipendenti riceveranno la notifica nella loro area.», pulsante «Pubblica» (non danger, primario), «Annulla». Confermato → tutte le bozze del mese pubblicate; toast success titolo «Pubblicati», testo «{n} cedolini di {Mese aaaa} pubblicati.».
- Pubblicare imposta `stato = 'Pubblicato'` e `pubblicatoAt = oggi` (solo sulle bozze).

### 5.4 Eliminazione (solo bozze)
ConfirmDialog titolo «Elimina cedolino», messaggio «Eliminare il cedolino di {Mese aaaa} di {nome} {cognome}?», pulsante «Elimina» (danger), «Annulla». Confermato → rimosso; toast success titolo «Eliminato», testo «Cedolino eliminato.».

### 5.5 Caricamento
1. «Carica cedolini» → modale con il mese selezionato nella pagina e già spuntati tutti i dipendenti senza cedolino in quel mese.
2. Cambiando «Mese di competenza» la selezione si ricalcola: tutti i mancanti di quel mese.
3. «Seleziona tutti» / «Deseleziona tutti» alterna la selezione completa; le checkbox aggiungono/tolgono il singolo.
4. «Carica ({n})» → crea un cedolino in bozza per ciascuno (saltando chi l'ha già), imposta il filtro Mese sul mese caricato, chiude la modale, toast success titolo «Caricamento completato», testo «1 cedolino caricato in bozza.» oppure «{n} cedolini caricati in bozza.».
5. Oggi non si carica alcun file: importi e nome file sono generati (§6.2).

### 5.6 Anteprima
Icona «Visualizza cedolino» (tabella) o occhio «Anteprima del cedolino» (dettagliata) → modale «Cedolino».

### 5.7 Export
- Tabella: file `cedolini-{aaaa-mm}.xls` (tabella HTML), righe filtrate (non paginate), colonne «Dipendente», «Reparto», «Mese», «Lordo», «Netto», «Stato», «Pubblicato il», «Visto dal dipendente» (valori: importi `eurHr`, data gg/mm/aaaa o vuoto, «Sì»/«No» per i pubblicati, vuoto per le bozze). Toast success «{n} righe esportate in Excel.» titolo «Esportazione completata».
- Dettagliata, Excel: `esportaRegistroXlsx` (06 §6.10) con i dipendenti della vista, titolo «Calendario presenze» → il foglio «Riepilogo» ha titolo «Calendario presenze — {Mese} {aaaa}»; nessuna struttura nella riga meta; file `Registro_{Mese}_{aaaa}.xlsx`.
- Dettagliata, PDF: `esportaPresenzePdf` (06 §6.11) con lo straordinario approvato → la riga «Straordinario approvato» e il totale sono compilati; file `Calendario_presenze_{Mese}_{aaaa}.pdf`.

### 5.8 Approvazione dello straordinario (Dettagliata)
- Clic su una cella della riga «Str. approvato» di un giorno STR o già approvato → popover nel punto del clic (stesso posizionamento entro la finestra con margine 8px e chiusura con clic fuori / Esc / scroll del menu di 06 §5.5); la colonna si evidenzia (`--color-primary-50`).
- «Approva» → salva `round(valore)` minuti per quel giorno; «Rimuovi» → cancella l'approvazione. Nessun toast.
- «Approva straordinario del mese (…)» → per ogni giorno STR non ancora approvato salva i minuti di straordinario della giornata. Il pulsante sparisce quando non resta nulla da approvare.
- Si approva solo lo straordinario vero (codice STR, ≥ 30 minuti oltre le 8 h): i pochi minuti sotto soglia restano «ore extra» non approvabili.

### 5.9 Caricamento ed errore
Tutto locale (store persistito): nessuno stato di caricamento o errore.

## 6. Dati e regole di business

### 6.1 Entità

```ts
type StatoCedolino = 'Bozza' | 'Pubblicato'
interface Cedolino {
  id: string            // `ced-{aaaa-mm}-{dipendenteId}`
  dipendenteId: number
  mese: string          // aaaa-mm
  lordo: number
  netto: number
  file: string          // `cedolino_{aaaa-mm}_{cognome minuscolo}.pdf`
  stato: StatoCedolino
  visto: boolean        // aperto dal dipendente nella sua area
  pubblicatoAt?: string // aaaa-mm-gg
}
// Straordinario approvato: Record<`${dipId}|${aaaa-mm-gg}`, minuti>
```

### 6.2 Seed demo e generazione
- 12 dipendenti (`DIPENDENTI_HR`), 3 mesi: −3, −2, −1 rispetto al mese corrente → 36 cedolini.
- Lordo base per id: 1 → 2150, 2 → 1980, 3 → 2420, 4 → 1720, 5 → 1890, 6 → 2080, 7 → 1760, 8 → 1700, 9 → 2650, 10 → 2010, 11 → 1830, 12 → 2290; nei mesi −3 e −2 si aggiunge `(id mod 3) × 15`.
- `netto = round(lordo × 0,74, 2 decimali)`.
- Mesi −3 e −2: tutti pubblicati il giorno 5 del mese successivo, tutti visti.
- Mese −1: **bozza** per gli id pari (2, 4, 6, 8, 10, 12); pubblicati gli id dispari con data = ieri; visti tutti i pubblicati tranne gli id multipli di 3 (3 e 9 → «Non aperto»).
- Mese corrente: nessun cedolino (tutti «mancanti»).
- Carica (mock): `lordo = 1700 + (id × 137 mod 950)`, netto come sopra, stato Bozza, non visto.
- Formato importi `eurHr`: migliaia sempre col punto, 2 decimali con la virgola, « €» finale, segno «-» davanti per i negativi (es. «1.591,00 €»).
- Contatori: `bozze`, `pubblicati`, `nonVisti` (pubblicati non visti), `mancanti` (dipendenti senza cedolino nel mese) e «Netto del mese» = somma dei netti del mese (non filtrati).

### 6.3 Dipendenti della vista Dettagliata
`DIPENDENTI_HR` filtrati per reparto, per stato (stato del cedolino del mese uguale al filtro: con un filtro di stato chi non ha cedolino è escluso) e per testo; ordinati per «{cognome} {nome}». Mese e anno dal filtro Mese.

### 6.4 Persistenza attuale
- Cedolini: store `useHrGestioneStore`, `localStorage['sibylla.hr-gestione']`, **version 8** (la migrazione rigenera i seed).
- Straordinario approvato: store `useRegistroPresenzeStore`, `localStorage['sibylla.registro-presenze']`, version 1, campo `straordinarioApprovato`.
- Preferenza vista: `localStorage['sibylla.cedolini.vista']`.
- `visto` oggi non cambia mai lato demo (lo imposterebbe l'app del dipendente).

## 7. Backend da realizzare

| Metodo e percorso | Uso | Esempio |
|---|---|---|
| `GET /Sibylla/hr/cedolini?mese=2026-10` | elenco del mese | → `[{ "id": "ced-2026-10-1", "dipendenteId": 1, "mese": "2026-10", "lordo": 2150, "netto": 1591, "file": "cedolino_2026-10_grimaudo.pdf", "stato": "Pubblicato", "visto": true, "pubblicatoAt": "2026-11-04" }]` |
| `GET /Sibylla/hr/cedolini/mesi` | opzioni del filtro Mese | → `["2026-11", "2026-10", "2026-09", "2026-08"]` (mese corrente sempre incluso) |
| `POST /Sibylla/hr/cedolini/carica` (multipart) | Carica cedolini | campi `mese`, `dipendenteIds[]`, file PDF (uno per dipendente o un PDF unico da dividere); il server legge lordo/netto dal cedolino o dal software paghe; → `{ "caricati": 6 }`; 409 se un dipendente ha già il cedolino del mese (va saltato, non duplicato) |
| `POST /Sibylla/hr/cedolini/pubblica` | Pubblica (singolo o bozze) | `{ "ids": ["ced-2026-10-2", "ced-2026-10-4"] }` → aggiorna solo le bozze con `pubblicatoAt = oggi`; **genera la notifica App Op!** a ciascun dipendente («nella sua area»); transazionale |
| `DELETE /Sibylla/hr/cedolini/{id}` | Elimina | solo se in bozza, altrimenti 409 |
| `GET /Sibylla/hr/cedolini/{id}/file` | Anteprima / download del PDF | `application/pdf` |
| `POST /Sibylla/app/cedolini/{id}/visto` | dall'App Op! all'apertura | imposta `visto = true` |
| `GET /Sibylla/hr/presenze?mese=2026-10` | vista Dettagliata | vedi 06 §7 |
| `PUT /Sibylla/hr/presenze/{dipId}/{data}/straordinario-approvato` | Approva | `{ "minuti": 75 }` |
| `DELETE /Sibylla/hr/presenze/{dipId}/{data}/straordinario-approvato` | Rimuovi | 204 |
| `POST /Sibylla/hr/presenze/straordinario-approvato/mese` | Approva tutto il mese | `{ "dipendenteId": 6, "mese": "2026-10" }` → approva i giorni STR non approvati con i minuti timbrati; transazionale |

L'approvazione dello straordinario va storicizzata (chi, quando, minuti). Gli importi dei cedolini sono dati personali: accesso riservato all'ufficio del personale.

## 8. Stile

Token tema chiaro: `--color-primary` #204769, `--color-primary-50` #f2f5f6, `--color-text-active` #4A4D53, `--color-text-inactive` #6E7175, `--color-text-disabled` #A9AAAD, `--color-border` #CFD4DA, `--color-bg` #F8FCFF, `--color-link` #5C9CD4, `--color-success` #007035, `--color-warning` #F57D03, `--color-error` #FF616E, `--chart-7` #5B43A0, `--radius-md` 6px, `--font-heading` Poppins.

- Campi toolbar (mixin `hr-field`): colonna gap 6px, larghezze del §4.2.
- `.ced__icon-btn` (mixin `hr-icon-btn`): 34×34, senza bordo, radius 8px, sfondo `--color-primary`, icona bianca `#fff`, inline-flex centrato; hover `filter: brightness(.92)`; disabled opacity .45, cursor not-allowed.
- Tabella `.ced .ced__table` (mixin `table-fit`): `table-layout:fixed; width:100%`; th/td `vertical-align:middle; white-space:nowrap; overflow:hidden`; nelle intestazioni `.sib-colf-head` flex min-width 0 (le icone filtro non si stringono). Intestazioni a destra (Lordo, Netto) `justify-content:flex-end`; centrate (Visto, Azioni) `center`. Celle `.ced__r` a destra, `.ced__c` centrate (selettori a 2 classi per battere `.sib-table`).
- `.ced__strong`: 600 text-active. `.ced__dash`: text-inactive.
- `.ced__act` (mixin `hr-act`): senza bordo/sfondo/padding, inline-flex, line-height 1, `--color-primary`; disabled opacity .35. `.ced__acts`: inline-flex gap 14px.
- `.ced__visto`: primary; `.ced__nonvisto`: text-disabled.
- `.ced .ced__stato` (mixin `hr-stato`): 600, `--attesa` warning, `--ok` success; `display:block; min-width:0`.
- `.ced__empty`: centrato, text-inactive, padding 28px 0.
- `.ced__foot` (mixin `hr-foot`): flex end gap 18px wrap 12px text-inactive, `strong` text-active.
- `.ced__pag`: flex centrato, margin-top 4px.
- Modali `.ced-modal` (mixin `hr-modal-body`): colonna gap 14px, padding 4px 2px; azioni flex end gap 8px padding-top 4px.
- `.ced-modal__text`, `__hint`: margin 0, 12px text-inactive. `__head`: flex space-between. `__label`: Poppins 12px 600 primary. `__link`: senza bordo/sfondo, 12px 600 `--color-link`, hover sottolineato.
- `.ced-modal__list`: griglia 1fr 1fr, gap 8px 16px, `max-height:260px; overflow-y:auto`, padding 10px 12px, bordo 1px, radius 6px.
- `.ced-slip`: colonna gap 12px, padding 16px, bordo 1px, radius 6px, sfondo `--color-bg`. `__head`: flex baseline space-between gap 10px. `__name`: heading 15px 700 text-active. `__mese`: 12px text-inactive. `__rows`: griglia `1fr auto`, gap 8px 14px, 13px; `dt` text-inactive; `dd` a destra text-active; `.ced-slip__tot` padding-top 8px, bordo superiore 1px, 700 text-active. `__file`: inline-flex gap 6px 12px text-inactive.
- Vista Dettagliata: `.ced__det-stato` inline-flex gap 6px 12px 600 (icona 12px); `--pub` `--color-success`, `--bozza` `--color-warning`, `--manca` `--color-text-inactive`.
- Stili della matrice e del popover: `06-registro-presenze.md` §8 (RegistroMensile). Specifici della variante cedolino: celle `--ro` cursor default; riga «Str. approvato» td alt. 26px cursor default; celle attive `--appr` cursor pointer, hover `--color-primary-50`; valore approvato `--chart-7` 700; pallino da approvare 7×7 bordo 1.5px `--chart-7` tondo; popover 260px con corpo `.rpm__str` (colonna gap 10px padding 10px 14px 12px bordo superiore), info 12px text-inactive (b `--chart-7`), azioni flex end gap 8px; `.rpm__approva` icona mr 6px.
- Tema scuro: tutto a token (vedi 06 §8); le icone dei pulsanti export restano bianche su `--color-primary`.

## 9. Responsività

Container query sul root `.ced` (`container-name: cedolini`):
- **max-width: 1360px**: tabella compatta (`font-size:12px`, intestazioni 11px, padding laterale celle 6px), intestazioni abbreviate (`ThLabel`: «Dip.», «Rep.», «Pubbl. il», con tooltip del testo completo), gap azioni 10px.
- **max-width: 1100px**: Mese e Reparto 150px, Stato 120px, ricerca 170px. La toolbar resta su una riga.
- Nessuno scroll orizzontale: colonne in percentuale, `table-layout:fixed`, celle con `TruncatedText` (ellipsis + tooltip) e `overflow-x:hidden` sul wrap.
- Vista Dettagliata: compattazione della matrice con la container query `rpm` a 1180px (06 §9).
- Laptop 1366 px con sidebar aperta: attiva la soglia 1360 (ed eventualmente 1100); 1920 px: etichette intere e spaziature standard.

## 10. Effetti e animazioni

- VistaSwitch: cursore con `transform .32s cubic-bezier(.34, 1.36, .64, 1)`, disattivato con `prefers-reduced-motion` (06 §10).
- `.ced__icon-btn` hover: `brightness(.92)` (senza transizione).
- Spinner `fa-spin` sull'icona PDF durante la generazione.
- Nessun'altra animazione specifica.

## 11. Accessibilità

- Icone azione e pulsanti export con `aria-label` e Tooltip scuro.
- Intestazioni abbreviate con tooltip del testo completo.
- VistaSwitch `role="radiogroup"` / `role="radio"`.
- Popover straordinario `role="dialog"` con `aria-label`, chiusura con Esc; pallino «Da approvare» con `aria-label`.
- Matrice con `th scope="row"`.

## 12. Criteri di accettazione

1. All'apertura (vista Tabella) il filtro Mese è sul mese precedente e la tabella mostra 12 cedolini in ordine alfabetico, 6 in bozza e 6 pubblicati.
2. Il PageHead mostra «Pubblica bozze (6)»; dopo la conferma con il messaggio esatto del §5.3 tutte risultano «Pubblicato» con data di oggi e il pulsante sparisce.
3. Per una bozza le azioni sono «Visualizza cedolino», «Pubblica», «Elimina»; per un pubblicato solo «Visualizza cedolino».
4. La colonna Visto mostra «-» per le bozze, occhio blu per gli aperti, occhio barrato grigio per i non aperti (id 3 e 9 nel mese precedente).
5. «Elimina» chiede «Eliminare il cedolino di {Mese aaaa} di {nome cognome}?» e, confermato, toglie la riga con il toast «Eliminato».
6. Filtrando Stato «Bozza» e Reparto «Cucina» resta solo Paolo Greco; senza risultati compare «Nessun cedolino corrisponde ai filtri impostati.».
7. Scegliendo il mese corrente la tabella dice «Nessun cedolino caricato per {Mese aaaa}.» e il riepilogo «Mancano 12 dipendenti».
8. «Carica cedolini» sul mese corrente propone i 12 dipendenti già spuntati; «Carica (12)» li crea in bozza, porta il filtro su quel mese e mostra «12 cedolini caricati in bozza.».
9. L'anteprima mostra lordo, «Contributi e ritenute» come differenza negativa e «Netto in busta» in grassetto, con il nome del file PDF.
10. La riga riepilogo sotto la tabella è allineata a destra e il «Netto del mese» somma tutti i cedolini del mese, indipendentemente dai filtri; la paginazione è centrata con 12 righe per pagina.
11. «Esporta in Excel» scarica `cedolini-{aaaa-mm}.xls` con 8 colonne e «Sì»/«No» solo per i pubblicati.
12. Passando a «Dettagliata» (preferenza ricordata) compaiono i riquadri mensili ordinati per cognome con lo stato del cedolino e l'occhio di anteprima nell'header; il tasto destro non apre il menu del registro.
13. Su un giorno con «O+S» la riga «Str. approvato» mostra il pallino vuoto; cliccandolo, il popover propone i minuti timbrati; «Approva» scrive il valore in viola e il totale del mese si aggiorna; «Rimuovi» lo cancella.
14. «Approva straordinario del mese (…)» approva tutti i giorni O+S non approvati e poi scompare; il footer mostra «… Straordinario approvato».
15. Il PDF della vista Dettagliata riporta nella riga «Straordinario approvato» i minuti approvati e il totale; l'Excel ha il foglio «Riepilogo» intitolato «Calendario presenze — {Mese aaaa}».
16. Sotto 1360 px di larghezza della pagina le intestazioni diventano «Dip.», «Rep.», «Pubbl. il» e la tabella passa a 12 px, senza scroll orizzontale; sotto 1100 px i campi si stringono e la toolbar resta su una riga.

## 13. File sorgente

- `src/modules/hr/Cedolini/Cedolini.tsx`
- `src/modules/hr/Cedolini/Cedolini.sass`
- `src/modules/hr/_hrGestione.sass` (mixin `hr-*`)
- `src/styles/_mixins.sass` (`table-fit`, `th-labels`, `th-compact`)
- `src/modules/hr/_presenze/RegistroMensile.tsx`, `src/modules/hr/_presenze/RegistroMensile.sass`
- `src/modules/hr/_presenze/presenze.model.ts`
- `src/modules/hr/_presenze/presenzeExport.ts`
- `src/modules/hr/hrExport.ts`
- `src/store/useHrGestioneStore.ts` (cedolini, seed, `fmtMeseHr`, `fmtDataHr`, `eurHr`, `DIPENDENTI_HR`, `REPARTI_HR`)
- `src/store/useRegistroPresenzeStore.ts`
- `src/core/components/VistaSwitch.tsx`, `src/core/components/ThLabel.tsx`, `src/core/components/PageHead.tsx`, `src/core/components/ConfirmDialog.tsx`
- `src/core/icons/Ico.tsx`
- `src/styles/_themes.sass`, `src/styles/_colors.sass`, `src/styles/_spacing.sass`
- `src/navigation/menu.ts`, `src/core/icons/MenuIco.tsx`, `src/router/PageContent.tsx`, `src/navigation/pageSubtitles.ts`
