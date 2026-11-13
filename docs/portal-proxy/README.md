# Portal · SibyllaApiProxy: inoltri `/Sibylla` e `/Hr` (codice di riferimento)

> **Per gli sviluppatori del backend.** Questi file vanno portati nella **vostra copia locale del Portal** (Azure DevOps).
> Questo repository non compila il Portal: li conserva e li versiona perché arrivino a voi. Ultimo aggiornamento:
> **10 novembre 2026**. Indice di tutte le integrazioni: [../integrazioni-backend.md](../integrazioni-backend.md).

## Perché servono

Tutte le pagine di Sibylla Platform chiamano il backend attraverso il Proxy:
- `{verb} /Sibylla/{**path}` → SibyllaApi (helper `apiFetchSibylla` del frontend);
- `{verb} /Hr/{**path}` → servizio Sibylla HR.

Questi due inoltri esistevano solo in una copia di lavoro del Portal, **mai committati**. Senza di loro le pagine di
Platform non raggiungono il backend.

## File

| File di questo repository | Dove va nel Portal | Cosa fa |
|---|---|---|
| [SibyllaController.cs](SibyllaController.cs) | `SibyllaApiProxy/Controllers/SibyllaController.cs` (nuovo) | `{verb} /Sibylla/{**path}` → `{verb} {ApiUrlBase}{path}`. Corpo, query e `Authorization` inoltrati; stato e corpo della risposta restituiti **senza modifiche**. Solo `GET`/`POST /Sibylla/bolla-telefono/{codice}` sono pubbliche (§ C2 del magazzino). |
| [HrController.cs](HrController.cs) | `SibyllaApiProxy/Controllers/HrController.cs` (nuovo) | `{verb} /Hr/{**path}` → `{verb} {HrApiUrlBase}{path}`, anche multipart (import da Excel), corpo fino a 6 MB, timeout 60 s. |

Correzioni già applicate rispetto alla copia di lavoro trovata:

| # | Correzione | File |
|---|---|---|
| 1 | Rotte pubbliche `bolla-telefono/{codice}` con `[AllowAnonymous]`; tutto il resto resta `[Authorize]` | SibyllaController |
| 2 | Negli errori `502` niente `ex.Message` (indirizzi interni): solo nel log | entrambi |
| 3 | Timeout 120 s (la lettura delle bolle arriva a 90 s) | SibyllaController |
| 4 | `[RequestSizeLimit]` a 30 MB (foto delle bolle in base64) | SibyllaController |
| 5 | Il codice segreto delle rotte `bolla-telefono` non finisce nel log | SibyllaController |
| 6 | `ApiUrlBase` mancante → `503 { "detail": "Servizio non configurato." }` invece di un messaggio tecnico | SibyllaController |

## Passi nella vostra copia del Portal

1. **Copiare i due controller** in `SibyllaApiProxy/Controllers/`. Servono solo `Microsoft.AspNetCore.Authorization` e
   `Microsoft.AspNetCore.Mvc`, già usati dagli altri controller.
2. **CORS** in `SibyllaApiProxy/Program.cs` (`AddDefaultPolicy` → `WithOrigins(...)`): aggiungere le origini del
   frontend, senza togliere quelle esistenti di Operation.
   ```csharp
   builder.WithOrigins(
       "http://localhost:3000",              // frontend in sviluppo
       "https://localhost:3000",
       "https://sibylla-platform.vercel.app",  // demo e produzione su Vercel (aggiungere il dominio definitivo)
       "https://localhost:7265",
       "https://sibylla-operation-dev.azurewebsites.net/",
       "https://sibylla-operation.azurewebsites.net",
       "https://app-operation-staging-italynorth-01-gbekhde9h0fmgshb.italynorth-01.azurewebsites.net")
   ```
3. **Configurazione** (`appsettings.{Ambiente}.json` o impostazioni dell'App Service; su App Service il separatore è
   `__`):

   | Chiave | Valore | Note |
   |---|---|---|
   | `ApiUrlBase` | URL di SibyllaApi dell'ambiente, con `/` finale | Nella copia di lavoro c'era la produzione su italynorth: `https://sibyllaapi-prod-fxdjfrhvb3bpeuab.italynorth-01.azurewebsites.net/` (al posto di `https://sibyllaapi.azurewebsites.net/`). Verificare quale vale per ogni ambiente. |
   | `HrApiUrlBase` | URL del servizio Sibylla HR, es. `https://sibylla-hr-api.azurewebsites.net/api/v1/` | **Non è in nessun `appsettings`**: va impostata per ambiente. Senza, `/Hr/...` risponde `500` (in Development c'è il predefinito `http://localhost:5041/api/v1/`). |

4. **App Service su Windows (IIS)**: per i corpi oltre i 28,6 MB serve anche, in `web.config`,
   `<requestLimits maxAllowedContentLength="31457280" />` sotto `system.webServer/security/requestFiltering`.
5. **Prove in Staging**:
   ```bash
   # inoltro autenticato (qualunque azione esistente di SibyllaApi)
   curl -s -X POST "$PROXY/Sibylla/scadenze/Get" -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" -d '{}'
   # senza token → 401
   curl -s -o /dev/null -w "%{http_code}\n" -X POST "$PROXY/Sibylla/scadenze/Get"
   # rotta pubblica del telefono: niente 401; 404 finché SibyllaApi non la implementa (magazzino, Parte C)
   curl -s -o /dev/null -w "%{http_code}\n" "$PROXY/Sibylla/bolla-telefono/prova"
   # CORS dal frontend
   curl -s -i -X OPTIONS "$PROXY/Sibylla/scadenze/Get" -H "Origin: https://sibylla-platform.vercel.app" \
        -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
   ```

## Dopo il rilascio (lato frontend, lo facciamo noi)

- Su Vercel: `REACT_APP_API_URL` = URL del Proxy dell'ambiente.
- Login vero di Platform al posto dell'utente di sviluppo, perché il Proxy chiede il token.
