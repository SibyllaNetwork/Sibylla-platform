# Sibylla Platform — Integrazione FE ↔ BE

**Versione:** 1.0
**Data:** 2026-04-29
**Scope:** integrazione del frontend `sibylla-platform` (React 19) con il backend `platform/Portal/` (ASP.NET Core 10).

---

## 1. Architettura

```
┌───────────────────────────────────────────────────────────────┐
│  FRONT-END                                                    │
│  /Users/alfredogregori/sibylla-platform/                      │
│  React 19 + TypeScript + Tailwind + Zustand (CRA dev server)  │
│  → http://localhost:3000                                      │
└──────────────────────────┬────────────────────────────────────┘
                           │ HTTP + JWT Bearer (CORS allow-listed)
                           ▼
┌───────────────────────────────────────────────────────────────┐
│  PROXY EDGE                                                   │
│  /Users/alfredogregori/platform/Portal/SibyllaApiProxy/       │
│  ASP.NET Core 10 — CORS, JWT validation, controller wrapper   │
│  → http://localhost:5289   (Swagger su /swagger)              │
│                                                               │
│  Endpoint:                                                    │
│    /Auth/*           login, registrazione                     │
│    /User/*           profilo utente, notifiche                │
│    /Common/*         lookup, strutture, reparti               │
│    /FrontOffice/*    arrivi, in casa, check-in, servizi       │
│    /Operation/*      timbrature, segnalazioni, turni          │
│    /Magazzino/*      magazzino                                │
│    /Sibylla/{**path} ← CATCH-ALL: inoltra a SibyllaApi        │
└──────────────────────────┬────────────────────────────────────┘
                           │ HTTPS + Bearer
                           ▼
┌───────────────────────────────────────────────────────────────┐
│  BE DI DOMINIO (vero "BE")                                    │
│  /Users/alfredogregori/platform/Portal/SibyllaApi/            │
│  56 controller — Booking, Strategie, Suggerimenti, Tariffe,   │
│  Portafoglio, Scadenze, Notifiche, Carrello, …                │
│                                                               │
│  Pubblicato su Azure:                                         │
│  https://sibyllaapi-prod-fxdjfrhvb3bpeuab.italynorth-01       │
│         .azurewebsites.net/                                   │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
                   Azure SQL "Sibylla"  (DB)
```

**Cardine:** il proxy ha un **catch-all `Sibylla/{**path}`** che inoltra qualunque verbo HTTP al backend di dominio preservando body, query string e header `Authorization`. Questo evita di dover scrivere un wrapper per ognuno dei 56 controller di `SibyllaApi`.

I 5 controller dedicati del proxy (`Auth`, `User`, `Common`, `FrontOffice`, `Operation`) restano per i casi in cui il proxy fa **trasformazioni specifiche** (hashing password lato server, blob upload immagini, ecc.) — non sono semplici pass-through.

---

## 2. Path dei progetti

| Repo | Path | Ruolo |
|---|---|---|
| Frontend | `/Users/alfredogregori/sibylla-platform/` | React 19, design system, 42 pagine, 122 voci menu |
| Proxy edge | `/Users/alfredogregori/platform/Portal/SibyllaApiProxy/` | Controller wrapper + catch-all `Sibylla/*` + CORS + JWT |
| BE dominio | `/Users/alfredogregori/platform/Portal/SibyllaApi/` | 56 controller, Dapper, JWT issuance, accesso DB |
| Monolite Razor (legacy) | `/Users/alfredogregori/platform/Portal/sibylla/` | Pannello in produzione attuale, da pensionare quando il FE React copre tutte le pagine |

I due progetti (FE e BE) **restano in repo separati**. L'integrazione è di runtime (HTTP), non di build.

---

## 3. Setup operativo

### 3.1 Prerequisiti

| Tool | Versione testata |
|---|---|
| Node.js | ≥ 18 (testato 25.8.2) |
| npm | bundle CRA 5.0.1 |
| .NET SDK | 10.0.x (testato 10.0.201) |

### 3.2 Avviare il backend (proxy)

```bash
cd /Users/alfredogregori/platform/Portal/SibyllaApiProxy
dotnet build                                # 0 errori, ~370 warning XML doc (innocui)
ASPNETCORE_URLS=http://localhost:5289 dotnet run --no-launch-profile
```

Health check:

```bash
curl http://localhost:5289/swagger/index.html      # → 200
```

### 3.3 Avviare il frontend

```bash
cd /Users/alfredogregori/sibylla-platform
npm install                                 # solo prima volta
npm start                                   # → http://localhost:3000
```

Il dev server CRA fa hot reload sui file changes.

### 3.4 Stoppare i processi

```bash
kill -9 $(lsof -ti :5289)                   # backend
pkill -9 -f "react-scripts start"           # frontend
```

---

## 4. Variabili d'ambiente

### 4.1 Frontend — `.env.development`

| Variabile | Default | Significato |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:5289` | Base URL del proxy |
| `REACT_APP_APP_CODE` | `sibylla-platform` | Codice app inviato al `/Auth/signin` |
| `REACT_APP_BYPASS_AUTH` | (vuoto) | Se `1` salta il login e usa l'utente fittizio `Luca H.` |

`.env.example` documenta gli stessi campi per ambienti di staging/produzione.

### 4.2 Backend — `appsettings.json`

| Variabile | Valore corrente | Significato |
|---|---|---|
| `ApiUrlBase` | `https://sibyllaapi-prod-fxdjfrhvb3bpeuab.italynorth-01.azurewebsites.net/` | URL del backend di dominio. Modificare per puntare a un altro ambiente. |
| `crypt.publickey` | (in chiaro) | Chiave AES per encrypt/decrypt utility. **Sostituire prima del deploy.** |
| `AzureBlobConfig` | container `media` | Connessione blob storage per upload immagini. |

⚠️ Il vecchio endpoint `https://sibyllaapi.azurewebsites.net/` è **spento** (Site Disabled). Non usarlo.

---

## 5. CORS

In `Portal/SibyllaApiProxy/Program.cs:75-90` il policy default include:

```
http://localhost:3000          ← dev sibylla-platform
https://localhost:3000
https://localhost:7265         ← dev monolite Razor (legacy)
https://sibylla-operation-dev.azurewebsites.net/
https://sibylla-operation.azurewebsites.net
https://app-operation-staging-italynorth-01-...azurewebsites.net
```

Per aggiungere un origin, edita `Program.cs` e ricompila il proxy.

---

## 6. Authentication flow

### 6.1 Login

```
sibylla-platform LoginPage
  └── auth.service.login(email, password)
       └── POST {API_URL}/Auth/signin   { email, pw, app_code }
            └── proxy → SibyllaApi /auth/signinForApp
                 └── SQL: sib.Users WHERE email=… AND password=SHA256(pw)
                      ↓ if match
                 ← JWT firmato con HS256 (segreto in Program.cs:56)
       ← token salvato in localStorage["sibylla_token"]
```

L'hashing SHA-256 della password avviene **lato proxy** (`Criptografy.HashPassword` in `Portal/SibyllaApiProxy/Utility/Criptografy.cs`). Il client manda la password **in chiaro** (su HTTPS in prod, HTTP locale in dev).

### 6.2 Token storage

- Chiave: `localStorage.sibylla_token`
- Decodifica: helper `decodeToken()` in `services/auth.service.ts` (legge il JSON del payload base64-url)
- Inviato automaticamente da `apiFetch()` come `Authorization: Bearer <token>` se `authRequired ≠ false`

### 6.3 401 handling

`apiFetch` su 401 rimuove il token e fa `window.location.reload()` per forzare il re-login. Disabilitabile con `redirectOn401: false`.

### 6.4 DEV bypass

Con `REACT_APP_BYPASS_AUTH=1` il frontend salta del tutto la `LoginPage` e setta a mano:

```ts
{ id_azienda: 1, nome: 'Luca', cognome: 'H.', email: 'dev@sibylla.it' }
```

In bypass non c'è alcun token reale → tutte le `apiFetch` ricevono 401/403 dal backend (giustamente). Il fallback dei singoli componenti (vedi §9) gestisce graziosamente.

---

## 7. Client API (`src/services/api.ts`)

### 7.1 `apiFetch<T>(endpoint, options)`

Wrapper su `fetch` con:
- Auto Bearer da `getToken()` (disattivabile via `authRequired: false`)
- Body JSON automatico (anche FormData supportato)
- `Accept: application/json`
- `ApiError(status, body, message)` su risposta non-OK
- Decodifica JSON o text in base al `Content-Type` della risposta
- 401 → reload (per refresh login)

### 7.2 `apiFetchSibylla<T>(path, options)`

Helper specifico per il **catch-all proxy**:

```ts
apiFetchSibylla<ScadenzaDto[]>('scadenze/GetScadenze', {
  method: 'POST',
  body: { data_da, data_a }
})

// equivale a:
apiFetch<ScadenzaDto[]>('/Sibylla/scadenze/GetScadenze', { … })
```

Da usare per qualunque endpoint del backend di dominio non già wrappato dai 5 controller dedicati del proxy.

---

## 8. Service typed disponibili

Tutti in `sibylla-platform/src/services/`. Ogni service:
- importa `apiFetch` o `apiFetchSibylla` dal client centrale
- definisce le interface DTO allineate ai modelli C# corrispondenti (path indicato in cima al file)
- esporta funzioni async tipate

| File | Endpoint coperti | Backend C# |
|---|---|---|
| `auth.service.ts` | `POST /Auth/signin`, logout | `Portal/SibyllaApiProxy/Controllers/AuthController.cs` |
| `notifiche.service.ts` | `/User/GetNotifiche`, `GetNotificaById`, `CheckNotificheNonLette` | `Portal/Models/Operation/DTO/NotificaDto.cs` |
| `user.service.ts` | `/User/GetInfo`, `GetQuickInfo`, `ModificaPassword`, `ModificaEmail`, `ModificaNomeUtente`, `UploadImg` | `Portal/Models/Operation/UserInfo.cs` |
| `common.service.ts` | `/Common/GetStrutture`, `GetStruttureForUser`, `GetReparti`, `GetTipiPagamento`, `GetOpzioniDiAccesso`, `GetGeneriIntervento`, `SubscribeToNotifications`, `DeleteSubscribeNotifications` | `Portal/Models/DTO/Struttura.cs` + Operation lookups |
| `frontoffice.service.ts` | `/FrontOffice/GetArrivi`, `GetInCasa`, `GetNazionalita`, `GetTipiDocumento`, `CheckInOspite`, `CheckOut`, `GetCheckInList`, `GetServizi`, `GetDettaglioServizio`, `InsertServizioCamera`, `GetTurni` | DTO operation/backoffice |
| `operation.service.ts` | `/Operation/calendario/GetScadenze`, `segnalazioni/Get|Insert|UpdateStato|PresaInCarico`, `MieiIncarichi`, `ChiudiIncarico`, `turni/MieiTurni`, `GetTeams` | Operation DTO |
| **`scadenze.service.ts`** | `/Sibylla/scadenze/GetTipiScadenze`, `GetCategorieScadenze`, `GetScadenze`, `GetSintesiScadenze`, `SaveEvento`, `ShareEvento` | `Portal/SibyllaApi/Controllers/ScadenzeController.cs` |
| **`strategie.service.ts`** | `/Sibylla/strategie/GetStrategiaPricing`, `SetStrategiaPricing`, `editStrategiaPricing`, `DeleteStrategia`, `GetStrategiaDispo`, `SetStrategiaDispo`, `GetStrategieByStruttura`, `GetBarInfoSuggerimenti`, `DuplicaStrategie` | `Portal/SibyllaApi/Controllers/StrategieController.cs` |
| **`suggerimenti.service.ts`** | `/Sibylla/suggerimenti/ScreeningOpenPrice`, `AggiornaPrezzi` | `Portal/SibyllaApi/Controllers/SuggerimentiController.cs` |
| **`booking.service.ts`** | `/Sibylla/booking/GetPrenotazioni`, `GetPrenotazione`, `GetPrenotazioniTableau`, `GetTipiCameraSibylla`, `SetPrenotazioneNota`, `AddPrenotazioneSibylla`, `EliminaPrenotazioneSibylla`, `StopSales` | `Portal/SibyllaApi/Controllers/BookingController.cs` |
| **`pianitariffari.service.ts`** | `/Sibylla/PianiTariffari/GetPianiTariffari`, `GetPianiTariffariWithPartners`, `GetTipologiePianiTariffari`, `InsertPianoTariffario`, `UpdatePianoTariffario`, `DeletePianoTariffaro`, `GetTipiCameraDto`, `UpdateArrangiamentoPiano` | `Portal/SibyllaApi/Controllers/PianiTariffariController .cs` |
| **`portafoglio.service.ts`** | `/Sibylla/Portafoglio/GetTransazioni`, `GetTransazioniPersonale`, `GetDettaglioTransazione`, `GetSaldo`, `GetSaldoAziendale`, `StartRicarica`, `StartRicaricaPersonale`, `RicaricaBonifico` | `Portal/SibyllaApi/Controllers/PortafoglioController.cs` |
| `pages.service.ts` | `/Admin/GetPageList` (graceful fail su 404/405) | (endpoint non ancora esposto dal proxy) |

I **service in grassetto** usano il catch-all `apiFetchSibylla(...)`. Gli altri usano i controller wrapper del proxy.

---

## 9. Pagine cablate

### 9.1 Pagine già esistenti in sibylla-platform, ora cablate al BE

| Pagina | File | Service usato | Cosa fa |
|---|---|---|---|
| `LoginPage` | `modules/auth/LoginPage/` | `auth.service.login()` | Login reale verso `/Auth/signin`. Salva token in localStorage. |
| `CentroNotifiche` | `modules/notifiche/CentroNotifiche/` | `getNotifiche()` | On mount carica notifiche reali, mappa il DTO server al formato UI, fallback ai dati di esempio se backend KO. |
| `ModificaProfilo` | `modules/profilo/ModificaProfilo/` | `getInfo()`, `modificaNomeUtente()`, `modificaEmail()`, `modificaPassword()` | On mount popola nome/cognome/email da `/User/GetInfo`. Save persiste via API. Banner warning se backend KO. |
| Sidebar struttura switcher | `useLoadStrutture` hook | `getStruttureForUser()` | Carica le strutture dell'utente al login e popola `useOrgStore`. |

### 9.2 Pagine nuove portate da `platform/Portal/sibylla/Views/` → `sibylla-platform`

Tutte create con il design system Sibylla (`PageHeader` + `BtnBack` + `FilterToolbar` + `sib-table` + `StatusBadge` + `FormGrid` + `FormActions`), con chiamata API tramite `apiFetchSibylla` e fallback ai mock se il backend non risponde.

| pageId menu | Pagina React | View Razor originale | Endpoint dominio |
|---|---|---|---|
| `anagrafiche-op` | `modules/operation/Anagrafiche/Anagrafiche.tsx` | `Views/Anagrafiche/Anagrafiche.cshtml` | `POST /Sibylla/operation/GetAnagrafichePerStruttura` |
| `arrivi-partenze`, `ospiti-in-casa` | `modules/operation/ArriviPartenze/ArriviPartenze.tsx` | `Views/Operation/Arrivi.cshtml`, `LibroPrenotazioni.cshtml` | `POST /FrontOffice/GetArrivi`, `/FrontOffice/GetInCasa` |
| `schedine` | `modules/operation/SchedineAlloggiati/SchedineAlloggiati.tsx` | `Views/Impostazioni/SchedaQuestura.cshtml` (lista invii) | `POST /Sibylla/backoffice/GetSchedineAlloggiati`, `InviaSchedinaQuestura` |
| `rilevamento-presenze` | `modules/operation/RilevamentoPresenze/RilevamentoPresenze.tsx` | `Views/Impostazioni/Presenze.cshtml` | `POST /Operation/turni/MieiTurni` |
| `cassa` | `modules/operation/Cassa/Cassa.tsx` | `Views/Operation/MonitoraggioCassa.cshtml` | `POST /Sibylla/operation/GetMovimentiCassa` |
| `i-miei-servizi` | `modules/sales/servizi/IMieiServizi/IMieiServizi.tsx` | `Views/Servizi/Servizi.cshtml` | `POST /Sibylla/servizi/GetServizi` |
| `crea-servizio` | `modules/sales/servizi/CreaServizio/CreaServizio.tsx` | `Views/Servizi/NuovoServizio.cshtml` | `POST /Sibylla/servizi/InsertServizio` |
| `i-miei-preventivi` | `modules/sales/preventivi/IMieiPreventivi/IMieiPreventivi.tsx` | `Views/Preventivi/IMieiPreventivi.cshtml` | `POST /Sibylla/preventivi/GetPreventivi` |
| `crea-preventivo` | `modules/sales/preventivi/CreaPreventivo/CreaPreventivo.tsx` | `Views/Preventivi/GestioneDeiPreventivi.cshtml` | `POST /Sibylla/preventivi/InsertPreventivo` |
| `centro-costo` | `modules/finance/ImpostaCentroDiCosto/ImpostaCentroDiCosto.tsx` | `Views/Finance/ImpostaCentroDiCosto.cshtml` | `POST /Sibylla/finance/GetCentriDiCosto`, `SaveCentroCosto` |
| `archivio-personale` | `modules/hr/ArchivioPersonale/ArchivioPersonale.tsx` | `Views/HumanResource/AnagraficaPersonale.cshtml` | `POST /Sibylla/anagrafica-personale/GetAll` |
| `crea-anagrafica` | `modules/hr/CreaAnagrafica/CreaAnagrafica.tsx` | `Views/HumanResource/CreateAnagraficaPersonale.cshtml` | `POST /Sibylla/anagrafica-personale/Insert` |
| `stato-camere` | `modules/impostazioni/StatoCamere/StatoCamere.tsx` | `Views/Impostazioni/StatoCamere.cshtml` | `POST /Sibylla/operation/GetStatoCamere` |
| `scheda-questura` | `modules/impostazioni/SchedaQuestura/SchedaQuestura.tsx` | `Views/Impostazioni/SchedaQuestura.cshtml` (config) | `POST /Sibylla/backoffice/GetConfigSchedaQuestura`, `SetConfigSchedaQuestura` |
| `log-sistema` | `modules/impostazioni/LogDiSistema/LogDiSistema.tsx` | `Views/Impostazioni/LogDiSistema.cshtml` | `POST /Sibylla/log-sistema/GetLogs` |
| `informazioni-struttura` | `modules/impostazioni/InformazioniStruttura/InformazioniStruttura.tsx` | `Views/Impostazioni/InformazioniStruttura.cshtml` | `POST /Sibylla/azienda/GetInfoStruttura`, `SetInfoStruttura` |
| `inventario-camere`, `inventario-stanze` | `modules/stanze/Inventario/Inventario.tsx` | `Views/Camere/AllestisciCamereIndex.cshtml`, `Views/Stanze/Index.cshtml` | `POST /Sibylla/camere/GetCamere` |
| `totem`, `totem-adv` | `modules/hardware/Totem/Totem.tsx` | `Views/Hardware/Totem.cshtml` | `POST /Sibylla/hardware/GetTotems` |
| `sysadmin` | `modules/sysadmin/Index/SysadminIndex.tsx` | `Views/SYSADMIN/index.cshtml` | (no API: dashboard di tile) |
| `gestione-aziende` | `modules/sysadmin/GestioneAziende/GestioneAziende.tsx` | `Views/SYSADMIN/GestioneAziende.cshtml` | `POST /Sibylla/aziende/GetAziende` |
| `gestione-utenti` | `modules/sysadmin/GestioneUtenti/GestioneUtenti.tsx` | `Views/Utente/GestioneUtenti.cshtml` | `POST /Sibylla/utente/GetUtenti` |

In ogni file il commento JSDoc in cima riporta sia il path Razor originale sia l'endpoint dominio invocato — utile per chi farà il fine-tuning sull'allineamento DTO ↔ ViewModel.

---

## 10. Pagine NON ancora cablate

Le 35+ pagine restanti del FE Sibylla Platform hanno **service typed pronti** (vedi §8) ma il componente UI continua a usare i mock embedded. Per cablarle basta seguire il pattern di `CentroNotifiche` o `ModificaProfilo`:

```tsx
import { useEffect, useState } from 'react'
import { getXxx, type XxxDto } from '../../../services/xxx.service'

const FALLBACK: XxxDto[] = [/* dati hardcoded esistenti */]

export default function Pagina() {
  const [items, setItems] = useState<XxxDto[]>(FALLBACK)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getXxx({ /* filter */ })
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err?.message ?? 'Errore'))
    return () => { cancelled = true }
  }, [])

  return (
    <>
      {error && <AlertBanner type="warning">{error}</AlertBanner>}
      {/* render items */}
    </>
  )
}
```

**Pagine con service pronto da agganciare:**

| Pagina | Service | Endpoint principale |
|---|---|---|
| Scadenzario | `scadenze.service.ts` | `getScadenze()` |
| CalendarioStrategie / CreaStrategia / ModificaStrategia | `strategie.service.ts` | `getStrategieByStruttura()`, `setStrategiaPricing()` |
| SuggerimentiDataDriven / ScreeningOpenPrice | `suggerimenti.service.ts` | `screeningOpenPrice()` |
| TableauPage / NuovaPrenotazione / GrigliaDisponibilita | `booking.service.ts` | `getPrenotazioniTableau()`, `getPrenotazioni()` |
| TariffeDisponibilita / GestionePianiTariffari / CalendarioTariffe | `pianitariffari.service.ts` | `getPianiTariffari()` |
| PortafoglioAziendale | `portafoglio.service.ts` | `getTransazioni()`, `getSaldoAziendale()` |
| PortafoglioPersonale | `portafoglio.service.ts` | `getTransazioniPersonale()`, `getSaldo()` |
| AnalisiBooking | `booking.service.ts` | `getPrenotazioni()` (con filtri analitici) |

**Pagine senza endpoint proxy diretto** (richiedono nuovo controller wrapper):
- ConfiguraNotifiche (preferenze granulari)
- Planner (timeline camere drag&drop — endpoint dedicato necessario)
- IMieiBusinessPage (dashboard KPI — non ancora chiaro quale controller dominio chiamare)
- GiornaleImpresa, AnalisiDistribuzione (probabilmente Bacheca o Monitoraggi controller)
- ForesightRevenue, MaggiorazioniPromozioni, PrenotazioniIDS (Distribution controller esiste ma da indagare)

### Classi Tailwind aggiunte per le nuove pagine

`src/tailwind.css` è stato esteso con un secondo blocco di classi `sib-*` per supportare le nuove pagine senza dover scrivere SASS dedicato:

| Classe | Uso |
|---|---|
| `.sib-table-wrap` + `.sib-table` | Wrapper + tabella standard con bordo, intestazione canvas, hover row |
| `.sib-empty` | Riga "nessun risultato" inside table |
| `.sib-empty-state` | Card "in arrivo" o stato vuoto a tutta sezione |
| `.sib-cell--muted/success/error/warning` | Modificatori semantici per `<td>` |
| `.sib-stats-row` + `.sib-stat-card` (`__label`, `__value`, `__value--success/error/warning`) | Riga di KPI cards |
| `.sib-progress` + `.sib-progress__bar--success/warning/error` | Barra di progresso (es. utilizzo budget) |
| `.sib-section-title` + `.sib-section-spacer` | Layout helper per form lunghi |

---

## 11. Estendere l'integrazione

### 11.1 Aggiungere un endpoint dal backend di dominio

1. **Trovare il controller** in `Portal/SibyllaApi/Controllers/` (56 disponibili, vedi `ls`).
2. **Annotare il path** dall'attributo `[Route("xxx")]` o `[HttpPost("xxx")]`. Esempio: `[HttpPost("monitoraggi/GetTariffe")]`.
3. **Creare il service** in `sibylla-platform/src/services/<area>.service.ts`:

```ts
import { apiFetchSibylla } from './api'

export interface MonitorTariffaDto { /* … */ }

export function getTariffe(filter: { /* … */ }): Promise<MonitorTariffaDto[]> {
  return apiFetchSibylla<MonitorTariffaDto[]>('monitoraggi/GetTariffe', {
    method: 'POST',
    body: filter,
  })
}
```

Nessun cambiamento al proxy: il catch-all inoltra automaticamente.

### 11.2 Aggiungere un wrapper specifico nel proxy

Necessario solo se serve **trasformazione lato server** (hashing, blob upload, aggregazione). In quel caso:

1. Crea un nuovo controller in `Portal/SibyllaApiProxy/Controllers/`
2. Eredita da `BaseController` (utilities `GetCurrentUserId`, ecc.)
3. Inoltra a SibyllaApi tramite `Api.CallMethodAsync<T>(Request.Headers, "endpoint/del/dominio", payload)`
4. Aggiungi il service `.ts` con `apiFetch('/TuoController/Method', …)` (non `apiFetchSibylla`).

### 11.3 Aggiungere un origin CORS

Edita `Portal/SibyllaApiProxy/Program.cs:75-90`, aggiungi l'origin nella `WithOrigins()`, ricompila il proxy.

---

## 12. Smoke test

Una volta avviati FE e BE:

```bash
# 1. backend up?
curl -s -o /dev/null -w "BE: %{http_code}\n" http://localhost:5289/swagger/index.html
# atteso: BE: 200

# 2. CORS preflight
curl -s -o /dev/null -w "CORS: %{http_code}\n" -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  http://localhost:5289/Auth/signin
# atteso: CORS: 204

# 3. signin con credenziali finte (deve rispondere 200 + body con statusCode 400)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"smoketest@nonexistent.local","pw":"x","app_code":"sibylla-platform"}' \
  http://localhost:5289/Auth/signin
# atteso body: {"content":"Username o Password Errati","statusCode":400}

# 4. catch-all proxy senza Bearer (atteso 401)
curl -s -o /dev/null -w "CATCH-ALL no auth: %{http_code}\n" \
  -X POST -H "Content-Type: application/json" -d '{}' \
  http://localhost:5289/Sibylla/scadenze/GetScadenze
# atteso: CATCH-ALL no auth: 401

# 5. frontend up?
curl -s -o /dev/null -w "FE: %{http_code}\n" http://localhost:3000/
# atteso: FE: 200

# 6. typecheck FE
cd /Users/alfredogregori/sibylla-platform && npx tsc --noEmit
# atteso: 0 errori
```

---

## 13. Troubleshooting

### "Credenziali non valide — 500 Forbidden"

Il backend Azure è spento. Verifica con:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://sibyllaapi-prod-fxdjfrhvb3bpeuab.italynorth-01.azurewebsites.net/
# se 200 → l'API è up
# se 403 "Site Disabled" → l'App Service è stoppato sul portale Azure
```

Se è spento, riaccendilo dal portale Azure o aggiorna `appsettings.json` del proxy a un altro endpoint Sibylla operativo.

### CORS error in browser

Apri DevTools → Network → tab "Headers" della chiamata fallita. Se manca `Access-Control-Allow-Origin: http://localhost:3000`:

1. Verifica che il proxy stia girando (`curl http://localhost:5289/swagger/index.html`)
2. Verifica che l'origin sia nella whitelist (vedi §5)
3. Se hai aggiunto l'origin dopo aver avviato il proxy, riavvialo (`kill 5289 + dotnet run`)

### "Token non presente nella risposta"

Il proxy ritorna `ContentResult` come oggetto JSON `{ content, contentType, statusCode }`. `auth.service.ts:extractToken()` lo gestisce. Se vedi questo errore, probabilmente il backend non ha ritornato 200 — guarda il body completo nella console del browser.

### Pagina cablata che non mostra dati reali

1. DevTools → Network → guarda lo status della chiamata `/Sibylla/...`.
2. Se 401 → token non presente o scaduto → ri-login (`localStorage.removeItem('sibylla_token')` + reload).
3. Se 403 → utente loggato ma non autorizzato a quella risorsa.
4. Se 502 → il proxy non riesce a raggiungere il backend di dominio (vedi §13.1).
5. Se 500 → eccezione lato `SibyllaApi`. Controlla il log del proxy: `tail -f` sull'output del `dotnet run`.

### Hot reload CRA non vede i cambi al .env

CRA rilegge `.env*` solo all'avvio. Se modifichi `.env.development`:

```bash
pkill -9 -f "react-scripts start"
kill -9 $(lsof -ti :3000)
cd /Users/alfredogregori/sibylla-platform && npm start
```

---

## 14. File modificati / creati nell'integrazione

### Backend (`Portal/SibyllaApiProxy/`)

| File | Tipo | Modifica |
|---|---|---|
| `Program.cs` | mod | aggiunto `http://localhost:3000` a CORS |
| `appsettings.json` | mod | `ApiUrlBase` aggiornato all'endpoint Azure prod attivo |
| `Controllers/SibyllaController.cs` | new | catch-all proxy `/Sibylla/{**path}` |

### Frontend (`sibylla-platform/`)

| File | Tipo | Ruolo |
|---|---|---|
| `.env.development` | new | env vars locali |
| `.env.example` | new | template per altri ambienti |
| `src/services/api.ts` | rewrite | `apiFetch<T>` con Bearer + 401 + `apiFetchSibylla` |
| `src/services/auth.service.ts` | rewrite | login contro `/Auth/signin` del proxy |
| `src/services/pages.service.ts` | rewrite | usa `apiFetch`, fallback su 404/405 |
| `src/services/notifiche.service.ts` | new | wrapper notifiche utente |
| `src/services/user.service.ts` | new | profilo utente |
| `src/services/common.service.ts` | new | strutture, lookup, push subs |
| `src/services/frontoffice.service.ts` | new | front office (arrivi, in casa, check-in) |
| `src/services/operation.service.ts` | new | operation (segnalazioni, incarichi, turni) |
| `src/services/scadenze.service.ts` | new | calendario scadenze (via catch-all) |
| `src/services/strategie.service.ts` | new | strategie revenue (via catch-all) |
| `src/services/suggerimenti.service.ts` | new | screening open price + suggerimenti (via catch-all) |
| `src/services/booking.service.ts` | new | tableau / prenotazioni (via catch-all) |
| `src/services/pianitariffari.service.ts` | new | tariffe e piani (via catch-all) |
| `src/services/portafoglio.service.ts` | new | portafoglio aziendale + personale (via catch-all) |
| `src/hooks/useAuth.ts` | rewrite | DEV bypass dietro flag, decode JWT al boot |
| `src/hooks/useLoadStrutture.ts` | new | popola `useOrgStore` da `/Common/GetStruttureForUser` |
| `src/sibylla_dashboard.tsx` | mod | invoca `useLoadStrutture(!!user)` |
| `src/modules/notifiche/CentroNotifiche/CentroNotifiche.tsx` | mod | cablata a `getNotifiche()` con fallback |
| `src/modules/notifiche/CentroNotifiche/CentroNotifiche.sass` | mod | stile banner errore |
| `src/modules/profilo/ModificaProfilo/ModificaProfilo.tsx` | mod | cablata a `/User/*` |

---

## 15. Roadmap

| Priorità | Intervento | Effort |
|---|---|---|
| **Alta** | Cablare le 8 pagine in §10 con i service già pronti (Scadenzario, Strategie, Tableau, Tariffe, Portafoglio, Suggerimenti) | 1-2 ore/pagina |
| **Alta** | Indagare e mappare gli endpoint backend per le 5 pagine "senza endpoint": IMieiBusinessPage, Planner, GiornaleImpresa, AnalisiDistribuzione, ConfiguraNotifiche | 1 giornata |
| **Media** | Sostituire DEV bypass con un account demo registrato sul backend | 30 min + creazione utente test |
| **Media** | Spostare CORS da hardcoded in `Program.cs` a `appsettings.json` come array | 15 min |
| **Media** | Setup environment "Mock" del proxy per testare il FE senza dipendere da Azure | 2 ore (vedi MSW alternative §B in `INTEGRATION_HISTORY.md` se presente) |
| **Bassa** | Sostituire CRA con Vite (la roadmap di sibylla-platform lo elenca) | 1 giornata |
| **Bassa** | React Router DOM al posto del routing state-based custom | 2 giornate |

---

*Documento generato a integrazione completata. Aggiornare quando si aggiungono nuovi service, endpoint o pagine cablate.*
