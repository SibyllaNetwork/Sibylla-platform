// ─────────────────────────────────────────────────────────────────────────────
//  CODICE DI RIFERIMENTO per il Portal (SibyllaApiProxy/Controllers/SibyllaController.cs).
//  Non è compilato in questo repository: lo integrano gli sviluppatori del backend.
//  Vedi docs/portal-proxy/README.md.
//
//  Rispetto alla versione trovata nella copia di lavoro del Portal (ramo release/staging, non committata)
//  contiene le quattro correzioni del § H4.1 di docs/portal-magazzino-ristorazione.md:
//   1. rotte pubbliche /Sibylla/bolla-telefono/{codice} con [AllowAnonymous] (tutto il resto resta [Authorize]);
//   2. negli errori 502 niente ex.Message (resta solo nel log);
//   3. timeout di 120 s (la lettura delle bolle arriva a 90 s);
//   4. corpo fino a 30 MB ([RequestSizeLimit]).
// ─────────────────────────────────────────────────────────────────────────────
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SibyllaApiProxy.Controllers
{
    /// <summary>
    /// Inoltro generico verso il backend di dominio (<c>SibyllaApi</c>).
    ///
    /// Il client (sibylla-platform) chiama <c>{verb} /Sibylla/{**path}</c> e questo controller inoltra la stessa
    /// richiesta a <c>{verb} {ApiUrlBase}{path}</c>, con corpo, query string e header <c>Authorization</c>.
    /// Stato e corpo della risposta di SibyllaApi arrivano al client senza modifiche: le pagine leggono il
    /// <c>detail</c> degli errori così com'è.
    /// </summary>
    [ApiController]
    [Route("Sibylla")]
    [Tags("Sibylla")]
    [Authorize]
    public class SibyllaController : ControllerBase
    {
        /// <summary>Corpo massimo: 30 MB (foto delle bolle in base64, Magazzino della Ristorazione).</summary>
        private const long CorpoMassimo = 31_457_280;

        private readonly IConfiguration _configuration;
        private readonly ILogger<SibyllaController> _logger;

        // Un solo HttpClient per tutto il processo; 120 s perché leggi_bolla arriva a 90 s.
        // In alternativa: IHttpClientFactory con un client nominato e lo stesso timeout.
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };

        public SibyllaController(IConfiguration configuration, ILogger<SibyllaController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>Inoltro autenticato: tutte le azioni di SibyllaApi usate dalle pagine di Platform.</summary>
        [HttpGet("{**path}")]
        [HttpPost("{**path}")]
        [HttpPut("{**path}")]
        [HttpDelete("{**path}")]
        [HttpPatch("{**path}")]
        [RequestSizeLimit(CorpoMassimo)]
        public Task<IActionResult> Forward(string path) => Inoltra(path);

        /// <summary>
        /// "Fotografa col telefono" (Magazzino della Ristorazione, § C2): la pagina del telefono non ha un token,
        /// il codice del passaggio è la chiave. Solo queste due rotte sono pubbliche.
        /// </summary>
        [AllowAnonymous]
        [HttpGet("bolla-telefono/{codice}")]
        [HttpPost("bolla-telefono/{codice}")]
        [RequestSizeLimit(CorpoMassimo)]
        public Task<IActionResult> BollaTelefono(string codice) => Inoltra($"bolla-telefono/{Uri.EscapeDataString(codice)}");

        private async Task<IActionResult> Inoltra(string path)
        {
            string baseUrl = _configuration.GetValue<string>("ApiUrlBase") ?? string.Empty;
            if (string.IsNullOrEmpty(baseUrl))
            {
                _logger.LogError("ApiUrlBase non configurato");
                return Problem(statusCode: 503, detail: "Servizio non configurato.");
            }

            string targetUrl = $"{baseUrl.TrimEnd('/')}/{path}{Request.QueryString}";
            using var upstream = new HttpRequestMessage(new HttpMethod(Request.Method), targetUrl);

            // Corpo così com'è (anche JSON grandi): nessuna deserializzazione.
            if (Request.ContentLength > 0 || Request.Headers.TransferEncoding.Count > 0)
            {
                using var ms = new MemoryStream();
                await Request.Body.CopyToAsync(ms);
                upstream.Content = new ByteArrayContent(ms.ToArray());
                if (!string.IsNullOrEmpty(Request.ContentType))
                {
                    upstream.Content.Headers.TryAddWithoutValidation("Content-Type", Request.ContentType);
                }
            }

            if (Request.Headers.TryGetValue("Authorization", out var authHeader) &&
                AuthenticationHeaderValue.TryParse(authHeader.ToString(), out var parsed))
            {
                upstream.Headers.Authorization = parsed;
            }

            HttpResponseMessage upstreamResponse;
            try
            {
                upstreamResponse = await _httpClient.SendAsync(upstream, HttpCompletionOption.ResponseHeadersRead);
            }
            catch (Exception ex)
            {
                // Il dettaglio tecnico (indirizzi interni, eccezione) va solo nel log, mai al client.
                // Non loggare il percorso completo delle rotte bolla-telefono: contiene il codice segreto.
                _logger.LogError(ex, "Inoltro a SibyllaApi non riuscito ({Metodo} {Area})", Request.Method,
                    path.StartsWith("bolla-telefono/", StringComparison.Ordinal) ? "bolla-telefono" : path);
                return Problem(statusCode: 502, detail: "Servizio non raggiungibile.");
            }

            using (upstreamResponse)
            {
                byte[] payload = await upstreamResponse.Content.ReadAsByteArrayAsync();
                Response.StatusCode = (int)upstreamResponse.StatusCode;
                if (payload.Length == 0)
                {
                    return new EmptyResult();
                }

                string contentType = upstreamResponse.Content.Headers.ContentType?.ToString() ?? "application/json";
                return File(payload, contentType);
            }
        }
    }
}
