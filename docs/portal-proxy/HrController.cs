// ─────────────────────────────────────────────────────────────────────────────
//  CODICE DI RIFERIMENTO per il Portal (SibyllaApiProxy/Controllers/HrController.cs).
//  Non è compilato in questo repository: lo integrano gli sviluppatori del backend.
//  Vedi docs/portal-proxy/README.md.
//
//  È la versione trovata nella copia di lavoro del Portal (ramo release/staging, non committata), con una sola
//  correzione: negli errori 502 niente ex.Message (resta solo nel log).
//  Configurazione obbligatoria per ambiente: HrApiUrlBase (non è in appsettings.json).
// ─────────────────────────────────────────────────────────────────────────────
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace SibyllaApiProxy.Controllers
{
    /// <summary>
    /// Proxy verso il servizio Sibylla HR (repo HR-Manager, <c>backend/</c>).
    ///
    /// Il client (sibylla-platform) chiama
    ///   <c>{verb} /Hr/{**path}</c>
    /// e questo controller inoltra la stessa richiesta a
    ///   <c>{verb} {HrApiUrlBase}{path}</c>
    /// con body (anche multipart, per l'import da Excel), query string e header <c>Authorization</c>.
    ///
    /// Il servizio HR valida a sua volta il JWT della platform e lo collega al cliente HR
    /// (IdAzienda → PlatformCompanyId, Id_utente → ExternalUserId).
    ///
    /// Configurazione: <c>HrApiUrlBase</c>, es. <c>https://sibylla-hr-api.azurewebsites.net/api/v1/</c>;
    /// in Development, se manca, <c>http://localhost:5041/api/v1/</c>.
    /// </summary>
    [ApiController]
    [Route("Hr")]
    [Tags("Hr")]
    [Authorize]
    [HrController.KeepRequestBody]
    public class HrController : ControllerBase
    {
        /// <summary>
        /// Senza questo filtro, con [ApiController] il form multipart viene letto dal model binding prima
        /// dell'azione e il body da inoltrare arriva vuoto: togliendo i value provider del form il body resta intatto.
        /// </summary>
        [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
        public sealed class KeepRequestBodyAttribute : Attribute, IResourceFilter
        {
            public void OnResourceExecuting(ResourceExecutingContext context)
            {
                var factories = context.ValueProviderFactories;
                factories.RemoveType<FormValueProviderFactory>();
                factories.RemoveType<FormFileValueProviderFactory>();
                factories.RemoveType<JQueryFormValueProviderFactory>();
            }

            public void OnResourceExecuted(ResourceExecutedContext context) { }
        }

        private const string DevelopmentBaseUrl = "http://localhost:5041/api/v1/";

        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<HrController> _logger;
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };

        /// <summary>Configurazione, ambiente e log per l'inoltro verso il servizio HR.</summary>
        public HrController(IConfiguration configuration, IWebHostEnvironment environment, ILogger<HrController> logger)
        {
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }

        /// <summary>Inoltra la richiesta a <c>{HrApiUrlBase}{path}</c> e restituisce la risposta del servizio HR.</summary>
        [HttpGet("{**path}")]
        [HttpPost("{**path}")]
        [HttpPut("{**path}")]
        [HttpDelete("{**path}")]
        [HttpPatch("{**path}")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> Forward(string path)
        {
            string baseUrl = _configuration.GetValue<string>("HrApiUrlBase")
                ?? (_environment.IsDevelopment() ? DevelopmentBaseUrl : string.Empty);
            if (string.IsNullOrEmpty(baseUrl))
            {
                return Problem(statusCode: 500, detail: "HrApiUrlBase non configurato");
            }

            string targetUrl = $"{baseUrl.TrimEnd('/')}/{path}{Request.QueryString}";
            using var upstream = new HttpRequestMessage(new HttpMethod(Request.Method), targetUrl);

            if (Request.ContentLength > 0 || Request.Headers.TransferEncoding.Count > 0)
            {
                using var ms = new MemoryStream();
                await Request.Body.CopyToAsync(ms);
                upstream.Content = new ByteArrayContent(ms.ToArray());
                // Il Content-Type intero (con il boundary del multipart) va inoltrato così com'è
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
                // Il dettaglio tecnico va solo nel log, mai al client.
                _logger.LogError(ex, "Hr proxy forward error for {path}", path);
                return Problem(statusCode: 502, detail: "Servizio HR non raggiungibile.");
            }

            using (upstreamResponse)
            {
                byte[] payload = await upstreamResponse.Content.ReadAsByteArrayAsync();
                Response.StatusCode = (int)upstreamResponse.StatusCode;
                if (payload.Length == 0)
                {
                    return new EmptyResult();
                }

                string contentType = upstreamResponse.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
                string? fileName = upstreamResponse.Content.Headers.ContentDisposition?.FileNameStar
                    ?? upstreamResponse.Content.Headers.ContentDisposition?.FileName?.Trim('"');
                return fileName is null ? File(payload, contentType) : File(payload, contentType, fileName);
            }
        }
    }
}
