// Genera lato client la pagina "documento" impaginata di una politica di
// prenotazione (Termini & Condizioni) — usabile come anteprima, link o allegato
// alle richieste di sottoscrizione dei prodotti Sibylla.
// NB: gli stili qui sono inline PER SCELTA: è un documento HTML autonomo
// (standalone), non un componente React → non ricade nella regola dei .sass.

export interface DocumentoData {
  Nome: string
  Descrizione: string
  TerminiNome: string
  PagamentiAbilitati: boolean
  RichiediCartaGaranzia: boolean
  CancellazioneAbilitata: boolean
  MancatoArrivoAbilitato: boolean
  MancatoArrivoPercentuale: number
  TestoIt: string
  TestoEn: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const pct = (n: number) => `${n.toFixed(2).replace('.', ',')}%`

/** Restituisce l'intero documento HTML impaginato (stringa autonoma). */
export function buildDocumentoHtml(p: DocumentoData, generatoIl?: string): string {
  const badge = (on: boolean, testo: string) =>
    `<span class="badge ${on ? 'on' : 'off'}">${testo}</span>`

  const condizioni = [
    ['Programmazione pagamenti', badge(p.PagamentiAbilitati, p.PagamentiAbilitati ? 'Prevista' : 'Non prevista')],
    ['Carta di credito a garanzia', badge(p.RichiediCartaGaranzia, p.RichiediCartaGaranzia ? 'Richiesta' : 'Non richiesta')],
    ['Penali di cancellazione', badge(p.CancellazioneAbilitata, p.CancellazioneAbilitata ? 'Previste' : 'Non previste')],
    ['Penale di mancato arrivo (no-show)', p.MancatoArrivoAbilitato ? badge(true, pct(p.MancatoArrivoPercentuale)) : badge(false, 'Nessuna')],
  ]
    .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
    .join('')

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Termini &amp; Condizioni — ${esc(p.Nome)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef2f6; color: #1f2d3d;
         font-family: 'Segoe UI', system-ui, -apple-system, Arial, sans-serif; line-height: 1.6; }
  .sheet { max-width: 820px; margin: 32px auto; background: #fff; border-radius: 14px;
           box-shadow: 0 10px 40px rgba(32,71,105,.12); overflow: hidden; }
  .head { background: linear-gradient(135deg, #204769 0%, #2f6a9c 100%); color: #fff; padding: 32px 40px; }
  .head .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 12px; opacity: .8; margin: 0 0 6px; }
  .head h1 { margin: 0; font-size: 26px; font-weight: 700; }
  .head p { margin: 8px 0 0; font-size: 14px; opacity: .9; }
  .body { padding: 32px 40px 40px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 13px; color: #5b6b7c; margin-bottom: 24px; }
  .meta b { color: #1f2d3d; }
  table.cond { width: 100%; border-collapse: collapse; margin: 0 0 28px; font-size: 14px; }
  table.cond th { text-align: left; width: 42%; padding: 10px 12px; color: #5b6b7c; font-weight: 600;
                  border-bottom: 1px solid #e6ebf1; }
  table.cond td { padding: 10px 12px; border-bottom: 1px solid #e6ebf1; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.on { background: #e3f4ea; color: #1f8a4c; }
  .badge.off { background: #eef2f6; color: #7a8794; }
  .lang { margin-top: 24px; }
  .lang h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #204769;
             border-bottom: 2px solid #204769; padding-bottom: 6px; margin: 0 0 10px; }
  .lang p { margin: 0; white-space: pre-wrap; }
  .foot { padding: 20px 40px; border-top: 1px solid #e6ebf1; font-size: 12px; color: #90a0b0;
          display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; border-radius: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <p class="eyebrow">Sibylla · Politiche di prenotazione</p>
      <h1>${esc(p.Nome) || 'Termini &amp; Condizioni'}</h1>
      ${p.Descrizione ? `<p>${esc(p.Descrizione)}</p>` : ''}
    </div>
    <div class="body">
      <div class="meta">
        ${p.TerminiNome ? `<span>Modello: <b>${esc(p.TerminiNome)}</b></span>` : ''}
        <span>Documento generato: <b>${esc(generatoIl || '—')}</b></span>
      </div>

      <table class="cond">${condizioni}</table>

      <div class="lang">
        <h2>Testo italiano</h2>
        <p>${esc(p.TestoIt) || '<em>Nessun testo generato.</em>'}</p>
      </div>
      <div class="lang">
        <h2>English text</h2>
        <p>${esc(p.TestoEn) || '<em>No text generated.</em>'}</p>
      </div>
    </div>
    <div class="foot">
      <span>Documento generato automaticamente dalla piattaforma Sibylla.</span>
      <span>Termini &amp; Condizioni</span>
    </div>
  </div>
</body>
</html>`
}
