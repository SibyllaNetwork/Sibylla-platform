# Business Intelligence — kit condiviso e piano delle pagine

Documento di riferimento della sezione BI: **come si costruisce** una pagina BI
(kit `src/core/bi`) e **cosa ci va dentro** (contenuti per pagina, con le metriche
del settore hospitality: hotel, food & beverage, B&B).

Le regole tassative sono in **`../regole_ui.md` §13**; qui c'è il "come" operativo.
Riferimenti d'implementazione già a standard: **Monthly trend**, **Executive overview**.

---

## 1. I due vincoli che decidono l'impianto

1. **Tutto in una schermata, zero scroll** (verticale e orizzontale). Da qui viene
   tutto il resto: griglia ad altezza fissa, grafici elastici, tabelle di dettaglio
   dietro i tab verticali con righe calcolate sullo spazio disponibile.
2. **Un solo sistema visivo.** Nessuna pagina disegna i propri assi, colori o
   tooltip: quello che serve sta nel kit. Cambiare il kit cambia tutte le pagine.

Lo strato grafico (oggi **recharts**) è incapsulato nel kit: se un domani si passa
ad altra libreria si riscrive il kit, non le pagine.

---

## 2. Anatomia di una pagina BI

```tsx
<BiPage
  title="Titolo pagina"
  subtitle="Che domanda risponde questa pagina"
  glossary={['TY', 'LY', 'ADR', 'RevPAR', …]}   // rail "Legenda" a destra
  dataAt={data.aggiornatoAl}                     // timbro "Dati BI · gg/mm/aaaa hh:mm"
  onRefresh={…}
  toolbar={<>…SelectField / DateRangeField…</>}   // una riga sola, mai a capo
  gridClassName="xx__grid"                        // la griglia la definisce la pagina
>
  <div className="xx__kpis">…KpiTile…</div>       {/* fascia indicatori */}
  <ChartCard title="…" subtitle="…" legend={…}>…grafico…</ChartCard>
  <ChartCard title="…" rail={<BiVerticalTabs …/>}>…grafico o tabella…</ChartCard>
</BiPage>
```

Nel `.sass` di pagina si dichiara **solo la griglia**:

```sass
.xx
  &__grid
    grid-template-columns: repeat(3, minmax(0, 1fr))
    grid-template-rows: auto minmax(0, 1.28fr) minmax(0, 0.95fr)
    grid-template-areas: 'kpi kpi kpi' 'trend trend mix' 'seg age qual'
```

Le tracce vanno **sempre** in `minmax(0, …)`: è ciò che impedisce a un grafico o a
una tabella di "spingere" e far comparire lo scroll.

### Pezzi del kit

| Componente | A cosa serve |
|---|---|
| `BiPage` | guscio: header + toolbar + griglia elastica + rail legenda; garantisce lo zero-scroll |
| `KpiTile` | indicatore della fascia: etichetta, valore contato, variazione, micro-andamento e riga di base con la posizione del valore nel proprio minimo-massimo di periodo (min e max compaiono all'hover) |
| `ChartCard` | card di un grafico: titolo/sottotitolo troncati con tooltip, badge, legenda, azioni, rail, piede |
| `BiVerticalTabs` | tab verticali sul fianco della card (Trend / Dettaglio) |
| `BiLegend` | legenda in riga o in colonna, voci cliccabili per accendere/spegnere serie |
| `ChartTooltip` | tooltip standard dei grafici (fondo scuro, testo bianco) |
| `DeltaBadge` | variazione con freccia e colore di stato (con `invert` per costi e cancellazioni) |
| `Sparkline` | micro-andamento senza assi per le KPI |
| `BiGlossaryRail` | legenda acronimi laterale, alimentata da `biGlossary.ts` |
| `BiDataStamp` | orario dell'ultimo carico dati BI + ricarica |
| `useFitRows` | quante righe di tabella entrano davvero (paginazione al posto dello scroll) |
| `useCountUp` | conteggio animato dei valori KPI |
| `RangeField` (in `core/components/form`) | cursore condiviso per le simulazioni: etichetta, valore corrente, azzeramento, riga di contesto |
| `chartTheme` | palette, cromature, props di assi e griglia, formattatori, tempi d'animazione |

### Dati
Pattern **fallback-first** come nel resto della piattaforma: mock deterministici
(nessun `Math.random`: stessi filtri → stessi numeri) in un file
`<pagina>.data.ts` accanto al componente, sovrascritti dal DTO del backend quando
risponde (anche parziale). Le formule di dominio (ADR, RevPAR, occupazione,
forecast) vivono nel file dati, non nel JSX.

---

## 3. Metriche di riferimento (hospitality)

Il glossario condiviso (`core/bi/biGlossary.ts`) è la fonte unica delle definizioni.
Le metriche portanti, per area:

- **Camere / revenue**: occupazione = vendute / disponibili · ADR = ricavi camere /
  vendute · RevPAR = ricavi camere / disponibili (= ADR × occupazione) · TRevPAR
  (ricavi totali / disponibili) · OTB · pickup · ALOS · lead time · cancellazioni ·
  no show · complimentary · forecast garantito vs opzionato.
- **Distribuzione**: mix canali (diretto, OTA, tour operator, corporate, gruppi),
  commissioni riconosciute, ricavo netto per canale, parità tariffaria.
- **F&B**: coperti, scontrino medio, **RevPASH** (ricavo per posto-ora disponibile),
  food cost % e beverage cost %, mix categorie, margine per piatto, rotazione tavolo.
- **Finance (impostazione USALI)**: ricavi per reparto, costi diretti, margine di
  reparto, costi indistribuiti, **GOP** e **GOPPAR** (GOP / camere disponibili),
  EBITDA, break even, cashflow, DSO/DPO, incidenza costo del personale sui ricavi.
- **HR**: FTE, costo del personale su ricavi, costo per camera occupata / per
  coperto, ore straordinario, turnover, assenteismo.
- **B&B e piccole strutture**: stesse metriche camere, ma il peso sta su diretto vs
  OTA, commissioni e costo per soggiorno; segmenti MICE/gruppi non pertinenti.

---

## 4. Piano dei contenuti per pagina

Contenuto proposto: **fascia KPI** (4-5 indicatori) + **card**. Tutto in una
schermata. Stato: ✅ fatta · ⏳ da rifare sul kit · 🆕 da costruire (oggi placeholder).

### Sales & Revenue

| Pagina | Stato | Fascia KPI | Card |
|---|---|---|---|
| Monthly trend | ✅ | Ricavi camere · ADR · Occupazione · RevPAR · Forecast garantito vs budget | Andamento giornaliero (consuntivo + previsione + LY) con Dettaglio · Mix canali · Ranking segmenti · Top intermediari · Qualità del business |
| Sales overview | ⏳ | Ricavi totali · RevPAR · ADR · Occupazione · Pickup 7gg | Ricavi vs budget vs LY per mese · Mix canali nel tempo · Produzione per segmento · Booking curve (OTB per data soggiorno vs LY) · Top tipologie camera |
| Analisi booking | ⏳ | Prenotazioni · Valore medio · Lead time · ALOS · Cancellazioni | Prenotazioni per data di creazione · Distribuzione LOS · Finestra di prenotazione a fasce · Conversione preventivi · Provenienze |
| Pickup analysis | ✅ | Camere acquisite · Ricavo acquisito · ADR del pickup · On the book (pace vs LY) · Occupazione a libro | Pickup per data di soggiorno (+ Dettaglio) · On the book vs LY · Pickup per canale · Date da presidiare |
| Occupancy analysis | ✅ | Occupazione · Camere vendute · Scostamento budget · RevPAR · Fuori servizio | Occupazione giornaliera vs budget e LY (+ Calendario del mese a una tinta) · Per tipologia · Per giorno della settimana · Estremi del mese |
| ADR analysis | ✅ | ADR · ADR netto · Scostamento budget · Sconto medio · RevPAR | ADR giornaliero vs budget e LY (+ Dettaglio) · ADR per tipologia · ADR per canale lordo/netto · Prezzo e occupazione (elasticità) |
| Value analysis | ⏳ | Valore cliente · Marginalità · Ricavi accessori · Repeat rate | Valore per segmento · Contributo servizi extra · Anzianità cliente · Ranking clienti |
| Pricing benchmark | ⏳ | Indice prezzo vs compset · Posizione · Gap medio · Parità | Prezzo proprio vs compset per data · Gap per canale · Eventi e stagionalità · Suggerimenti |
| Forecast analysis / Grand total | ⏳ | Forecast garantito · Opzionato · Budget · Gap · Affidabilità | Forecast per mese · Contributo per segmento · Scostamento vs budget · Previsto vs consuntivato |
| Segment analysis | ⏳ | Ricavo per segmento · ADR · Occupazione · Quota mix | Quota mix nel tempo · ADR per segmento · Contribuzione · Dettaglio |
| Budget analysis | ⏳ | Ricavi vs budget · Scostamento · % raggiungimento · Forecast fine anno | Budget vs consuntivo per mese · Per reparto · Composizione dello scostamento · Dettaglio |
| Analisi distribuzione · Comparazione mercato · SSPI · Market lens | ⏳ | già ricche di contenuto | allineare al kit (palette, impianto, legenda acronimi) senza cambiare l'impostazione |

### Operation

| Pagina | Stato | Fascia KPI | Card |
|---|---|---|---|
| Operation overview | ⏳ | Camere occupate · Arrivi · Partenze · Fuori servizio · Housekeeping da fare | Movimenti del giorno · Stato camere · Carico housekeeping per piano · Segnalazioni aperte |
| On the book analysis | ⏳ | OTB ricavo · Camere · ADR · Occupazione prevista · Pace vs LY | OTB per data soggiorno vs LY · Per segmento · Per canale · Pickup ultimi 7 gg |
| Guest & room analysis | ⏳ | Ospiti · ALOS · Ospiti ripetenti · Upsell · Recensioni | Provenienze (top + Altro) · Tipologie più vendute · Composizione dell'ospite · Upgrade e upsell |
| Maintenance analysis | ⏳ | Interventi aperti · Tempo medio di chiusura · Camere fuori servizio · Costo interventi · Ricavo perso | Interventi per tipologia · Camere fuori servizio nel tempo · Rispetto SLA · Costi per reparto |
| Analisi dell'occupazione | ⏳ | variante operativa di Occupancy analysis | idem, in chiave giornaliera e per piano |

### Food & Beverage

| Pagina | Stato | Fascia KPI | Card |
|---|---|---|---|
| F&B overview | 🆕 | Ricavo F&B · Coperti · Scontrino medio · RevPASH · Food cost % | Ricavo per outlet e turno · Coperti per fascia orario (calendario a una tinta) · Mix categorie di menu · Top voci per margine · Incidenza costo materie prime |

### Finance

| Pagina | Stato | Fascia KPI | Card |
|---|---|---|---|
| Finance overview | ✅ | Ricavi totali · Costi totali · GOP · Marginalità · GOPPAR | Ricavi, costi e margine per mese (+ Dettaglio) · Margine per reparto (USALI) · Costi per natura · Struttura fissa/variabile dei costi · collegamenti a pareggio, cassa, simulazioni |
| Cost analysis | 🆕 | Costi totali · Costo personale % · Food cost · Energia · Fissi/variabili | Costi per natura · Per centro di costo · Costo per camera occupata · Scostamento vs budget |
| Break even point analysis | ✅ | Camere di pareggio · Ricavi di pareggio · Occupazione minima · Margine di sicurezza · Leva operativa | Curva di pareggio (+ Dettaglio per mese) · Cammino verso il pareggio (camere cumulate vs soglia) · Sensibilità a prezzo e costi fissi · Composizione del pareggio |
| Cashflow | 🆕 | Saldo · Incassi · Pagamenti · DSO · DPO | Flussi mensili in/out · Previsione a 90 giorni · Scadenzario · Dettaglio |
| Profit trend | ✅ | GOP · Marginalità · GOPPAR · TRevPAR · Margine per camera | Margine per mese vs LY (+ Dettaglio) · Marginalità per mese con media dell'anno · Ponte dal ricavo al margine · Rendimento per camera |
| Incoming analysis | 🆕 | Incassi · Crediti aperti · Insoluti · Tempo medio incasso | Incassi per metodo · Per canale · Anzianità dei crediti · Dettaglio |
| Ledger analysis | 🆕 | Registrazioni · Partite aperte · Sospesi · Quadratura | Partite per conto · Anomalie · Dettaglio |
| WIF analysis (what-if) | ✅ | Ricavi · GOP · Marginalità · Occupazione · Ricavo per camera, tutti simulati vs base | Base vs simulato per mese (margine o ricavi) · Quattro leve con cursori (prezzo, camere occupate, costi fissi, costi variabili) e scenari pronti · Impatto isolato per leva · Sintesi base/simulato/differenza |
| Decision tree | 🆕 | — | Albero delle leve (pricing, costi, canali) con esito atteso e probabilità |
| Analisi scenari mensili | ✅ | Margine pessimistico · base · ottimistico · Ampiezza fra estremi · Mesi in perdita | Margine per mese nei tre scenari (+ Dettaglio) · Ipotesi in chiaro (le quattro leve per scenario) · Banda di oscillazione dei ricavi · Sintesi d'anno |

### HR e Purchasing

| Pagina | Stato | Fascia KPI | Card |
|---|---|---|---|
| HR overview | ⏳ | FTE · Costo personale · Incidenza su ricavi · Straordinari · Turnover | Organico per reparto · Costo per camera occupata e per coperto · Produttività · Assenze |
| Profile analysis | ⏳ | Organico · Contratti · Seniority · Età media | Composizione per reparto · Tipologia contratto · Anzianità · Formazione |
| Panoramica acquisti | ⏳ | Spesa · Ordini · Risparmio da gruppi d'acquisto · Lead time fornitori | Spesa per area merceologica · Top fornitori · Andamento prezzi · Incidenza su ricavi |
| Fatturazione passiva | ⏳ | Fatture · Importo · In scadenza · Insoluti | Fatture per fornitore · Scadenze · Stato · Dettaglio |

---

## 5. Ordine di lavoro suggerito

1. ✅ Kit + Monthly trend (pilota).
2. ✅ Ciclo revenue: Pickup, Occupancy, ADR analysis (primitive dati condivise in
   `sales/_data/revenueMock.ts`).
3. Blocco finance: ✅ Finance overview e Break even point (modello condiviso in
   `finance/_data/financeMock.ts`: conto economico per reparto, classificazione
   fissa/variabile dei costi, cassa con DSO/DPO, pareggio e simulazione scenari).
   ✅ Cash flow, WIF analysis, Analisi scenari mensili e Profit trend.
   Restano: Cost analysis → Incoming analysis → Ledger analysis → Decision tree.
4. Grand total (gemella di Monthly trend), Purchasing overview, HR overview.
5. Le altre overview (Sales, Operation) e On the book analysis.
6. Allineamento delle pagine già ricche (Analisi distribuzione, Comparazione mercato,
   SSPI, Value analysis, Market lens): impianto e palette, contenuto invariato.

---

## 6. Cose da chiudere

- **amCharts**: il BI storico è in amCharts, qui si usa recharts (MIT, già in
  dipendenze). Se serve parità visiva col legacy e c'è la licenza, si sostituisce lo
  strato grafico dentro il kit.
- **Export**: i grafici non hanno ancora export Excel/PDF; l'icona standard sarebbe
  `fa-regular fa-file-xls` (§ regole_ui).
- **Backend**: le pagine restano fallback-first; gli endpoint BI reali vanno mappati
  come da `INTEGRATION.md` (`apiFetchSibylla`).
- **Glossario**: nel BI storico la definizione di TY riportava la formula del RevPAR;
  in `biGlossary.ts` è corretta. Le altre voci vanno riviste con chi le usa.
