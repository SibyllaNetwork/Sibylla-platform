# Guida sviluppatori — riprodurre front-end e back-end

Punto d'ingresso per uno sviluppatore che deve **installare, avviare e ricostruire
da zero** l'ambiente Sibylla Platform (front-end React + back-end .NET). Questa
guida è operativa e autosufficiente; per il dettaglio architetturale rimanda ai
documenti autorevoli già presenti nel repo:

- **`../ARCHITECTURE.md`** — architettura del front-end (design system, moduli, temi, routing).
- **`../INTEGRATION.md`** — contratto e integrazione FE ↔ BE (proxy, auth, service, endpoint).
- **`./layout-responsive.md`** — regole di layout responsive e dinamiche del sidenav.

---

## 1. Architettura a colpo d'occhio

Tre livelli a runtime, in **repo separati**; l'integrazione è HTTP, non di build.

```
┌─ FRONT-END ──────────────────────────────────────────────┐
│  sibylla-platform/           React 19 + TS + Tailwind +   │
│  http://localhost:3000       SASS + Zustand (CRA)         │
└───────────────┬───────────────────────────────────────────┘
                │  HTTP + JWT Bearer (CORS allow-listed)
                ▼
┌─ PROXY EDGE ─────────────────────────────────────────────┐
│  platform/Portal/SibyllaApiProxy/   ASP.NET Core 10       │
│  http://localhost:5289              CORS · JWT · wrapper  │
│  • 5 controller dedicati: /Auth /User /Common             │
│    /FrontOffice /Operation  (con trasformazioni server)   │
│  • catch-all  /Sibylla/{**path}  → inoltra al BE dominio  │
└───────────────┬───────────────────────────────────────────┘
                │  HTTPS + Bearer
                ▼
┌─ BE DI DOMINIO ──────────────────────────────────────────┐
│  platform/Portal/SibyllaApi/   56 controller (Dapper)     │
│  Azure App Service  →  Azure SQL "Sibylla"                │
└───────────────────────────────────────────────────────────┘
```

**Perché un proxy davanti al BE.** Il proxy espone un catch-all `/Sibylla/{**path}`
che inoltra qualunque verbo HTTP al backend di dominio preservando body, query e
header `Authorization`: così non serve un wrapper per ognuno dei 56 controller.
I 5 controller dedicati restano solo dove serve **trasformazione lato server**
(hashing password, upload blob immagini, ecc.), non semplice pass-through.

> Sub-app integrata: **Outlet Manager** (`outlet-full/`, backend Flask). In dev il
> CRA proxy (`src/setupProxy.js`) instrada `/api/*` → `https://outlet.sibyllanetwork.it`
> (override con env `OUTLET_PROXY_TARGET`). In produzione va replicato a livello di
> web server con iniezione del token SSO.

---

## 2. Stack

| Layer | Tecnologia | Versione |
|---|---|---|
| Framework FE | React | 19.2 |
| Linguaggio | TypeScript | 4.9 (strict) |
| Styling | Tailwind CSS + SASS | 3.4 / 1.99 |
| State | Zustand (`persist`) | 5.0 |
| Build/dev FE | Create React App | 5.0.1 |
| Grafici / date / PDF | recharts · react-day-picker · date-fns · jsPDF | — |
| Proxy edge | ASP.NET Core | 10 |
| BE dominio | ASP.NET Core + Dapper | 10 |
| DB | Azure SQL | — |

Routing FE: **state-based custom** (`src/router/PageContent.tsx`), non URL-based.
React Router DOM è installato ma non ancora attivo (vedi roadmap in ARCHITECTURE.md).

---

## 3. Prerequisiti

| Tool | Versione testata |
|---|---|
| Node.js | ≥ 18 (verificato su 25.8.2) |
| npm | bundle con CRA 5.0.1 |
| .NET SDK | 10.0.x (per il back-end) |

---

## 4. Riprodurre il FRONT-END

```bash
cd /Users/alfredogregori/sibylla-platform
npm install                # solo la prima volta
npm start                  # → http://localhost:3000  (hot reload)
```

### 4.1 Variabili d'ambiente (file `.env*` in root)

| Variabile | Default dev | Significato |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:5289` | Base URL del proxy edge |
| `REACT_APP_APP_CODE` | `sibylla-platform` | Codice app inviato a `/Auth/signin` |
| `REACT_APP_BYPASS_AUTH` | `1` (in `.env.development`) | `1` = salta la login, usa l'utente fittizio `Luca H.` |

- `.env.development` è la config di sviluppo locale (bypass attivo → **il FE parte
  senza back-end**, con dati mock/fallback nei componenti).
- `.env.example` è il template per staging/produzione (bypass vuoto).
- ⚠️ CRA legge i `.env*` **solo all'avvio**: dopo una modifica, riavvia `npm start`.

### 4.2 Altri comandi

```bash
npm run build              # build di produzione in build/
npx tsc --noEmit           # type-check (atteso: 0 errori)
npm test                   # test runner CRA (Jest + RTL)
```

### 4.3 Convenzioni da rispettare (regole tassative del progetto)

Queste regole sono ciò che rende il codebase riproducibile in modo coerente:

- **Un componente = una cartella omonima**: `Foo/Foo.tsx` + `Foo/Foo.sass`.
- **Zero stili inline** sui componenti applicativi: ogni stile nel `.sass` omonimo.
- **Usare sempre i componenti condivisi** (`core/components`): mai `<select>/<input>`
  grezzi — usa `SelectField`/`InputField`/`RadioGroup`/ecc.
- **Tabelle** con lo standard `.sib-table` / `.sib-table-wrap`; niente scroll
  orizzontale su laptop (vedi `layout-responsive.md`); testi su una riga con
  `TruncatedText` (ellipsis/abbreviazione + tooltip).
- **Colori** via token CSS (`var(--color-*)`), mai hex hardcoded.
- **Ogni "Elimina"** passa da un modale di conferma (`useConfirmStore` + `ConfirmDialog`),
  mai `window.confirm`.

### 4.4 Aggiungere una pagina FE

1. Crea `src/modules/<area>/<Pagina>/<Pagina>.tsx` + `<Pagina>.sass`.
2. Registra la rotta in `src/router/PageContent.tsx` (`pageId` → componente).
3. Aggiungi la voce in `src/navigation/menu.ts`.
4. Costruisci la UI con i componenti standard (`PageHeader`, `BtnBack`,
   `FilterToolbar`, `sib-table`, `FormGrid`, `FormActions`, `StatusBadge`).

---

## 5. Riprodurre il BACK-END

Repo separato: `/Users/alfredogregori/platform/Portal/`.

### 5.1 Avviare il proxy edge

```bash
cd /Users/alfredogregori/platform/Portal/SibyllaApiProxy
dotnet build
ASPNETCORE_URLS=http://localhost:5289 dotnet run --no-launch-profile
```

Health check:

```bash
curl http://localhost:5289/swagger/index.html      # → 200
```

### 5.2 Configurazione proxy (`appsettings.json`)

| Chiave | Significato |
|---|---|
| `ApiUrlBase` | URL del BE di dominio (default: App Service Azure prod). Cambiala per puntare a un altro ambiente. |
| `crypt.publickey` | Chiave AES per encrypt/decrypt. **Sostituire prima del deploy.** |
| `AzureBlobConfig` | Connessione blob storage (container `media`) per upload immagini. |

### 5.3 CORS

La whitelist è in `SibyllaApiProxy/Program.cs` (`WithOrigins(...)`) e include
`http://localhost:3000`. Per aggiungere un origin: edita `Program.cs` e **ricompila**
il proxy.

### 5.4 Backend di dominio

`platform/Portal/SibyllaApi/` (56 controller, Dapper, emissione JWT, accesso DB).
In locale non serve avviarlo: il proxy può puntare direttamente all'App Service
Azure via `ApiUrlBase`. Avvialo solo per lavorare sui controller di dominio.

### 5.5 Stop dei processi

```bash
kill -9 $(lsof -ti :5289)                   # proxy
pkill -9 -f "react-scripts start"           # frontend
```

---

## 6. Autenticazione (flusso)

```
LoginPage → auth.service.login(email, pw)
  → POST {API_URL}/Auth/signin  { email, pw, app_code }
     → proxy: hash SHA-256 password (lato server) → SibyllaApi /auth/signinForApp
        → JWT HS256  ← salvato in localStorage["sibylla_token"]
```

- Il client manda la password **in chiaro** (HTTPS in prod, HTTP in locale);
  l'hashing è lato proxy.
- `apiFetch` inietta `Authorization: Bearer <token>` automaticamente.
- **401**: se c'era un token (sessione scaduta) → rimuove token + reload per
  ri-login; in DEV bypass / mai loggato → lascia gestire l'errore al componente
  (niente reload loop). Vedi `src/services/api.ts`.
- **DEV bypass** (`REACT_APP_BYPASS_AUTH=1`): salta la LoginPage e usa un utente
  fittizio senza token reale → le `apiFetch` prendono 401/403 e i componenti
  mostrano i dati di fallback.

---

## 7. Il livello service (contratto FE ↔ BE)

Tutti i client stanno in `src/services/` e usano il client centrale `api.ts`:

- **`apiFetch<T>(endpoint, options)`** — per i 5 controller dedicati del proxy
  (`/Auth`, `/User`, `/Common`, `/FrontOffice`, `/Operation`). Auto-Bearer, body
  JSON o FormData, `ApiError(status, body, msg)` su risposta non-OK.
- **`apiFetchSibylla<T>(path, options)`** — per il catch-all: `apiFetchSibylla('scadenze/Get', …)`
  equivale a `apiFetch('/Sibylla/scadenze/Get', …)`. Da usare per qualunque
  endpoint del BE di dominio non wrappato.

Ogni service definisce le interface DTO allineate ai modelli C# (path indicato nel
JSDoc in cima al file). Elenco completo dei service e degli endpoint coperti in
`INTEGRATION.md §8`.

### 7.1 Pattern di cablaggio pagina (fallback-first)

Il pattern standard: prova l'API, se fallisce mostra i mock e un banner warning.

```tsx
import { useEffect, useState } from 'react'
import { getXxx, type XxxDto } from '../../../services/xxx.service'

const FALLBACK: XxxDto[] = [/* dati hardcoded */]

export default function Pagina() {
  const [items, setItems] = useState<XxxDto[]>(FALLBACK)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getXxx({ /* filtro */ })
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

### 7.2 Aggiungere un endpoint di dominio (senza toccare il proxy)

1. Trova il controller in `SibyllaApi/Controllers/` e annota il path (`[HttpPost("area/Metodo")]`).
2. Crea/estendi `src/services/<area>.service.ts`:

```ts
import { apiFetchSibylla } from './api'

export interface XxxDto { /* … allineato al modello C# … */ }

export function getXxx(filter: { /* … */ }): Promise<XxxDto[]> {
  return apiFetchSibylla<XxxDto[]>('area/Metodo', { method: 'POST', body: filter })
}
```

Il catch-all inoltra automaticamente: nessuna modifica al proxy.

### 7.3 Aggiungere un wrapper nel proxy (solo se serve logica server)

Necessario solo per hashing / upload blob / aggregazioni. Crea un controller in
`SibyllaApiProxy/Controllers/` che eredita da `BaseController`, inoltra con
`Api.CallMethodAsync<T>(...)` e cabla il service FE con `apiFetch('/TuoController/Metodo', …)`.

---

## 8. Smoke test end-to-end

Con FE e BE avviati:

```bash
# 1. proxy up
curl -s -o /dev/null -w "BE: %{http_code}\n" http://localhost:5289/swagger/index.html   # 200

# 2. CORS preflight
curl -s -o /dev/null -w "CORS: %{http_code}\n" -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  http://localhost:5289/Auth/signin                                                       # 204

# 3. signin con credenziali finte (200 + body statusCode 400)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"x@x.local","pw":"x","app_code":"sibylla-platform"}' \
  http://localhost:5289/Auth/signin

# 4. catch-all senza Bearer → 401
curl -s -o /dev/null -w "CATCH-ALL: %{http_code}\n" \
  -X POST -H "Content-Type: application/json" -d '{}' \
  http://localhost:5289/Sibylla/scadenze/GetScadenze                                      # 401

# 5. frontend up
curl -s -o /dev/null -w "FE: %{http_code}\n" http://localhost:3000/                       # 200

# 6. type-check FE
cd /Users/alfredogregori/sibylla-platform && npx tsc --noEmit                             # 0 errori
```

---

## 9. Troubleshooting rapido

| Sintomo | Causa / rimedio |
|---|---|
| "Credenziali non valide — 500/403" | BE Azure spento. `curl` l'`ApiUrlBase`; se "Site Disabled" riaccendi l'App Service o cambia `appsettings.json`. |
| Errore CORS nel browser | Proxy giù o origin non in whitelist; se hai appena aggiunto l'origin, **riavvia** il proxy. |
| Pagina cablata senza dati reali | DevTools → Network: 401 (ri-login), 403 (non autorizzato), 502 (proxy non raggiunge il dominio), 500 (eccezione: guarda il log del `dotnet run`). |
| Cambi al `.env` non visti | CRA rilegge i `.env*` solo all'avvio: `pkill -f "react-scripts start"` + `npm start`. |

Dettaglio completo in `INTEGRATION.md §13`.

---

## 10. Mappa dei file di riferimento

| Aspetto | File |
|---|---|
| Shell app (Sidebar/Topbar/Tabs/content/login) | `src/sibylla_dashboard.tsx` |
| Entry point React | `src/App.tsx` |
| Routing state-based | `src/router/PageContent.tsx` |
| Menu (voci gerarchiche) | `src/navigation/menu.ts` |
| Client API centrale | `src/services/api.ts` |
| Auth (token, decode, login) | `src/services/auth.service.ts` |
| Design system (classi `sib-*`) | `src/tailwind.css` |
| Token/temi | `src/styles/_themes.sass`, `src/core/tokens.ts` |
| Proxy CRA per Outlet | `src/setupProxy.js` |
| Proxy edge (.NET) | `platform/Portal/SibyllaApiProxy/` |
| BE di dominio (.NET) | `platform/Portal/SibyllaApi/` |

---

*Guida basata sull'analisi diretta del codebase. Aggiornare quando cambiano stack,
setup, env o contratto di integrazione. Per l'architettura di dettaglio vedi
`ARCHITECTURE.md` e `INTEGRATION.md`.*
