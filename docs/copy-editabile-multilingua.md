# Copy editabile e multilingua

Documento di design del sistema che rende i testi ("copy") della piattaforma
**editabili dall'assistenza Sibylla** e **pubblicabili in più lingue**, senza che
uno sviluppatore riscriva i componenti.

## 1. Obiettivo e vincoli

**Obiettivo.** L'assistenza modifica i testi della piattaforma da un'area dedicata
(un clone del sito nell'area admin), scegliendo la lingua di destinazione; i testi
vengono tradotti e pubblicati in multilingua.

**Vincoli architetturali (dati dal committente):**
- ❌ Nessun **database**.
- ❌ Nessuno **storage esterno** (no Blob/S3/object store).
- ❌ Nessun **backend di persistenza** dedicato.
- ✅ Testi **per cliente** (intestatario del contratto), non globali.
- ✅ La pubblicazione può passare da un **deploy** (JSON versionati nel repo).

Conseguenza logica: perché una modifica sia condivisa a tutti gli utenti serve *un*
punto comune. L'unico compatibile con i vincoli è un **artefatto versionato nel
repo** (`src/locales/copy.json`), pubblicato al deploy. L'editing a runtime resta
comodo (anteprima nel clone), ma la messa in produzione è un commit + deploy.

## 2. Architettura

```
                    EDITING (assistenza)                 PUBBLICAZIONE
  ┌───────────────────────────────────┐      ┌───────────────────────────────┐
  │  Clone nel Console (sessione assist)│      │  src/locales/copy.json         │
  │  • selettore lingua di destinazione │      │  (source of truth, per cliente)│
  │  • Modifica testi → BOZZE           │ ───► │  committato + deployato        │
  │    (useCopyStore → localStorage)    │export│  → live per tutti gli utenti   │
  └───────────────────────────────────┘      └───────────────────────────────┘
                    │                                        │
                    └──────────── runtime: t(key) ───────────┘
                       override(bozza) → repo(cliente) → repo(default) → fallback
```

Tre attori:
- **`src/locales/copy.json`** — source of truth condiviso, versionato. Struttura
  `{ [clientKey]: { [lang]: { [key]: text } } }`.
- **`useCopyStore`** (`localStorage`) — livello **bozza** dell'editor + lingua/UI
  attiva. Non è storage di record: sono le modifiche non ancora esportate.
- **`t(key, fallback)`** — helper runtime che risolve il testo con catena di
  fallback.

## 3. Struttura di `copy.json`

```json
{
  "default": {
    "it": { "op.anagraficheOspiti.title": "Anagrafiche Ospiti" },
    "en": { "op.anagraficheOspiti.title": "Guest Records" }
  },
  "int-gar": {
    "it": { "op.anagraficheOspiti.subtitle": "Anagrafiche del gruppo Gar" }
  }
}
```

- `default` = testi base condivisi da tutti i clienti. **È anche il registro**
  delle chiavi editabili: una stringa diventa gestibile dall'assistenza quando la
  sua chiave è presente qui.
- `int-*` = override per singolo intestatario/cliente.
- **Convenzione chiavi:** `area.pagina.campo` (es. `op.anagraficheOspiti.title`).

## 4. Runtime: l'helper `t()`

Nei componenti:
```tsx
import { useT } from '../../../core/i18n/copy'
const t = useT()
<PageHeader title={t('op.anagraficheOspiti.title', 'Anagrafiche Ospiti')} />
```

Il secondo argomento è il **letterale italiano di oggi**: è il fallback finale.
Migrare una stringa a `t(...)` **non** ne cambia il rendering finché non viene
tradotta → migrazione sicura e incrementale.

**Catena di fallback** (`resolveCopy` in `useCopyStore.ts`):
```
bozza[client][lang]  → bozza[client][it]
  → repo[client][lang] → repo[client][it]
  → repo[default][lang] → repo[default][it]
  → fallback (letterale) → key
```

**Cliente corrente** (`useCurrentClientKey` in `core/i18n/copy.ts`): in sessione di
assistenza è l'intestatario impersonato; con un profilo loggato è l'intestatario
che possiede la struttura del profilo; altrimenti `default`. Così ciò che
l'assistenza modifica impersonando un cliente coincide con ciò che quel cliente
vede da loggato.

## 5. Editor nel clone

Componente `layout/CopyEditor/` — visibile **solo in sessione di assistenza**.
Barra fissa in basso:
- **selettore lingua di destinazione** → `useCopyStore.setLang` → tutta l'app si
  ri-renderizza in quella lingua;
- **Modifica testi** → pannello con, per ogni chiave del cliente: testo IT
  sorgente (riferimento) + testo target editabile;
- **Esporta per il deploy** → `serializeForCommit()` fonde repo + bozze e scarica
  il `copy.json` aggiornato;
- **Scarta bozze** (con conferma standard).

Flusso di pubblicazione:
```
Edita nel clone → Esporta copy.json → commit → deploy → live per tutti
```

## 6. Traduzione automatica (in build, gratuita)

La traduzione è un passo **di build/dev**, non runtime (coerente con "un deploy per
pubblicare") e non richiede storage.

Script: `scripts/translate-copy.mjs` (`npm run i18n:translate`).
- Legge `copy.json`, trova le chiavi **mancanti** in ogni lingua target rispetto al
  sorgente IT, e le riempie traducendo.
- **Motore gratuito e pluggable:**
  - default: **MyMemory** (`api.mymemory.translated.net`) — gratuito, senza chiave;
  - override: endpoint **LibreTranslate** via `LIBRETRANSLATE_URL` (self-hosted).
- **Glossario** di termini da non tradurre (nomi prodotto: Sibylla, Agorà,
  Tableau, …): protetti con placeholder prima dell'invio e ripristinati dopo.
- Se il servizio non è raggiungibile, la chiave resta da compilare a mano nel clone
  (nessuna dipendenza dura).

L'assistenza parte così da una **bozza già tradotta** e la rifinisce nel clone.

## 7. Migrazione incrementale

Migrare una pagina = due passi:
1. Nel `.tsx`, sostituire i letterali con `t('area.pagina.campo', 'letterale IT')`.
2. In `copy.json` → `default.it`, aggiungere la chiave con il testo italiano
   (poi `npm run i18n:translate` riempie le altre lingue).

Le pagine non ancora migrate continuano a funzionare (i letterali restano il
fallback). Per le ~5.000 stringhe stimate conviene un **codemod** che estragga
`title=/label=/>testo<`, generi le chiavi dal path del file e sostituisca con
`t(...)`, rivisto a mano dove serve. Consigliato partire dai moduli ad alto valore.

## 8. Limiti noti (dovuti ai vincoli)

- **Pubblicazione solo via deploy.** L'assistenza prepara ed esporta, ma il live a
  tutti gli utenti passa da commit + deploy. È il prezzo di "niente DB / niente
  storage esterno".
- **Bozze per-browser.** Le bozze non esportate vivono nel `localStorage` del
  browser dell'operatore: non si propagano da sole. Per l'anteprima va bene; per
  pubblicare si esporta.
- Se un domani servisse pubblicazione a runtime senza deploy, l'unica leva è
  reintrodurre *un* punto condiviso scrivibile a runtime, senza rifare il layer
  `t()`.

## 9. File di riferimento

| Aspetto | File |
|---|---|
| Source of truth testi | `src/locales/copy.json` |
| Store lingua + bozze + risoluzione | `src/store/useCopyStore.ts` |
| Helper `t()` + chiave cliente | `src/core/i18n/copy.ts` |
| Editor nel clone | `src/layout/CopyEditor/CopyEditor.tsx` (+ `.sass`) |
| Mount nello shell | `src/sibylla_dashboard.tsx` |
| Traduzione in build | `scripts/translate-copy.mjs` (`npm run i18n:translate`) |
| Helper traduzione runtime (opzionale, stateless) | `src/services/copy.service.ts` |
| Pilota migrato | `src/modules/operation/Anagrafiche/Anagrafiche.tsx` |

## 10. Roadmap

| Priorità | Intervento |
|---|---|
| Alta | Codemod di estrazione stringhe → `t()` + popolamento `copy.json` (per modulo) |
| Alta | Lingue target definitive e glossario completo |
| Media | Editing **in-place** (click sul testo reale nel clone) oltre al pannello |
| Media | Automatizzare `i18n:translate` in CI pre-deploy |
| Bassa | Gestione variabili (`{nome}`) e plurali nelle chiavi |
