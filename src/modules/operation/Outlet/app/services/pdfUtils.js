// Utility per generare estratto conto PDF (file .js puro, non JSX)

export function generateEstrattoConto(data) {
  const righeHTML = data.righe.map(r =>
    "<tr>" +
    "<td>" + r.nome + "</td>" +
    "<td style='text-align:center'>" + r.qty + "</td>" +
    "<td style='text-align:right'>€ " + r.prezzo.toFixed(2) + "</td>" +
    "<td style='text-align:right'><strong>€ " + r.subtot.toFixed(2) + "</strong></td>" +
    "</tr>"
  ).join("");

  const noteHTML = data.note
    ? "<div style='background:#fffbeb;border:1px solid #F57D03;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#b45309'>📋 Note: " + data.note + "</div>"
    : "";

  const pagatoHTML = data.status === "chiusa"
    ? "<div style='text-align:center;margin:12px 0'><span style='display:inline-block;border:3px solid #00CF86;border-radius:8px;padding:6px 20px;color:#007035;font-weight:800;font-size:18px;transform:rotate(-8deg)'>✓ PAGATO</span></div>"
    : "";

  const tipoMap = { scontrino:"Scontrino", fattura:"Fattura", conto_camera:"Camera" };
  const tipoLabel = tipoMap[data.tipo_chiusura] || data.tipo_chiusura || "—";

  return "<!DOCTYPE html><html lang='it'><head>" +
    "<meta charset='UTF-8'/>" +
    "<title>Estratto Conto – Tavolo " + data.tavolo + "</title>" +
    "<style>" +
    "body{font-family:'Open Sans',Arial,sans-serif;margin:0;padding:24px;color:#204769;font-size:13px}" +
    ".header{text-align:center;border-bottom:2px solid #204769;padding-bottom:12px;margin-bottom:16px}" +
    ".header h1{font-family:'Poppins',sans-serif;font-size:22px;margin:0 0 4px;color:#204769}" +
    ".header p{margin:2px 0;color:#6E7175;font-size:12px}" +
    ".info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}" +
    ".info-box{background:#f2f5f6;border-radius:8px;padding:8px 12px}" +
    ".info-box label{font-size:10px;font-weight:700;text-transform:uppercase;color:#A9AAAD;letter-spacing:.5px;display:block;margin-bottom:2px}" +
    ".info-box span{font-size:13px;font-weight:700;color:#204769}" +
    "table{width:100%;border-collapse:collapse;margin-bottom:16px}" +
    "thead{background:#204769;color:white}" +
    "th,td{padding:8px 10px;text-align:left;font-size:12px}" +
    "tbody tr:nth-child(even){background:#f8fcff}" +
    "tbody tr:last-child{border-bottom:2px solid #204769}" +
    ".total-row{font-size:15px;font-weight:800;background:#E4F8EE!important;color:#007035}" +
    ".footer{text-align:center;font-size:10px;color:#A9AAAD;margin-top:20px;padding-top:10px;border-top:1px solid #DBDBDB}" +
    "@media print{button{display:none}}" +
    "</style></head><body>" +
    "<div class='header'><h1>" + data.outlet + "</h1><p>" + data.sala + " · " + data.turno + " · " + data.data + "</p></div>" +
    "<div class='info-grid'>" +
    "<div class='info-box'><label>Tavolo</label><span>" + data.tavolo + "</span></div>" +
    "<div class='info-box'><label>Comanda n°</label><span>" + data.comanda_numero + "</span></div>" +
    "<div class='info-box'><label>Coperti</label><span>" + data.coperti + "</span></div>" +
    "<div class='info-box'><label>Pagamento</label><span>" + tipoLabel + "</span></div>" +
    "</div>" +
    noteHTML +
    "<table><thead><tr><th>Voce</th><th style='text-align:center'>Q.tà</th><th style='text-align:right'>Prezzo</th><th style='text-align:right'>Subtotale</th></tr></thead>" +
    "<tbody>" + righeHTML +
    "<tr class='total-row'><td colspan='3'><strong>TOTALE</strong></td><td style='text-align:right'><strong>€ " + data.totale.toFixed(2) + "</strong></td></tr>" +
    "</tbody></table>" +
    pagatoHTML +
    "<div class='footer'>Generato il " + new Date().toLocaleString("it-IT") + " · Outlet Manager</div>" +
    "<script>window.onload=function(){window.print();}<\/script>" +
    "</body></html>";
}

export function printEstrattoConto(data) {
  const html = generateEstrattoConto(data);
  const w = window.open("", "_blank", "width=700,height=900");
  if (w) { w.document.write(html); w.document.close(); }
}
