// Genera e apre un PDF stampabile con i grafici di Guest & Room Analysis
// (Donut Camere occupate + Donut Ospiti + RevPar/RevGuest + Trend camera + Trend ospiti).
// Pattern: window.open + window.print (coerente con printPdf di Cassa).

interface SeriePoint { date: string; ty: number; forecast: number | null; ly: number }

// ─── Mock data builder (rispecchia il layout della pagina) ────────────────────
function genTrend(scale: number, options: { peakStart: number; peakEnd: number; peakVal: number; forecastVal: number }): SeriePoint[] {
  const out: SeriePoint[] = []
  const start = new Date('2026-05-01')
  for (let i = 0; i < 31; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    const date = `${String(d.getDate()).padStart(2, '0')}.05.2026`
    let ty = 0
    if (i >= 3 && i <= 8) {
      ty = Math.round(scale * 0.18 * (1 - Math.abs(i - 5) / 4))
    }
    let forecast: number | null = null
    if (i >= options.peakStart && i <= options.peakEnd) {
      const t = (i - options.peakStart) / Math.max(1, options.peakEnd - options.peakStart)
      forecast = Math.round(options.peakVal * (0.55 + 0.45 * Math.sin(t * Math.PI)))
    }
    if (i >= options.peakEnd - 1) {
      forecast = options.forecastVal
    }
    out.push({ date, ty, forecast, ly: 0 })
  }
  return out
}

function buildTrendSvg(points: SeriePoint[], maxY: number): string {
  const W = 880, H = 280
  const PAD_L = 56, PAD_R = 16, PAD_T = 18, PAD_B = 36
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const ticks = 4
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH
  const xPos = (i: number) => PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)

  // TY series (solid area)
  const tyPts: number[] = points.map(p => p.ty)
  const tyLine = tyPts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(v)}`).join(' ')
  const tyArea = `${tyLine} L ${xPos(points.length - 1)} ${PAD_T + innerH} L ${xPos(0)} ${PAD_T + innerH} Z`

  // Forecast series (dashed area)
  let fLine = ''
  let fArea = ''
  let fFirst = -1, fLast = -1
  points.forEach((p, i) => {
    if (p.forecast !== null) {
      if (fFirst === -1) fFirst = i
      fLast = i
      fLine += `${fLine ? 'L' : 'M'} ${xPos(i)} ${yPos(p.forecast!)} `
    }
  })
  if (fFirst >= 0 && fLast >= 0) {
    fArea = `${fLine} L ${xPos(fLast)} ${PAD_T + innerH} L ${xPos(fFirst)} ${PAD_T + innerH} Z`
  }

  // Grid
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (maxY / ticks) * i
    const y = yPos(v)
    return `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="#E0E7EE" stroke-width="1" />
            <text x="${PAD_L - 10}" y="${y + 4}" text-anchor="end" font-size="11" fill="#94a3b8">${Math.round(v)}</text>`
  }).join('')

  // X labels (ogni 7 giorni)
  const xLabels = points.map((p, i) => {
    if (i % 7 !== 3) return ''
    return `<text x="${xPos(i)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#94a3b8">${p.date}</text>`
  }).join('')

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block; max-height:300px;">
      ${gridLines}
      <path d="${tyArea}" fill="rgba(31, 78, 95, 0.25)" />
      <path d="${tyLine}" fill="none" stroke="#1F4E5F" stroke-width="2" />
      ${fArea ? `<path d="${fArea}" fill="rgba(245, 158, 11, 0.16)" />` : ''}
      ${fLine ? `<path d="${fLine}" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="5 3" />` : ''}
      ${xLabels}
    </svg>
  `
}

// Donut SVG (2 slices)
function buildDonutSvg(opts: {
  label1: string; val1: number; color1: string
  label2: string; val2: number; color2: string
  centerValue: string
  centerSub: string
  centerIcon: string  // ↦ glifo come testo (es. "🛏" non funziona in print; usiamo SVG path)
}): string {
  const size = 260
  const cx = size / 2, cy = size / 2
  const rOuter = 110
  const rInner = 78
  const total = opts.val1 + opts.val2
  const a1 = (opts.val1 / total) * Math.PI * 2

  function arcPath(start: number, end: number): string {
    const large = end - start > Math.PI ? 1 : 0
    const x0 = cx + rOuter * Math.sin(start)
    const y0 = cy - rOuter * Math.cos(start)
    const x1 = cx + rOuter * Math.sin(end)
    const y1 = cy - rOuter * Math.cos(end)
    const xi1 = cx + rInner * Math.sin(end)
    const yi1 = cy - rInner * Math.cos(end)
    const xi0 = cx + rInner * Math.sin(start)
    const yi0 = cy - rInner * Math.cos(start)
    return `M ${x0} ${y0}
            A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1}
            L ${xi1} ${yi1}
            A ${rInner} ${rInner} 0 ${large} 0 ${xi0} ${yi0} Z`
  }

  return `
    <svg viewBox="0 0 ${size} ${size}" width="220" height="220" style="display:block;">
      <path d="${arcPath(0, a1)}" fill="${opts.color1}" />
      <path d="${arcPath(a1, Math.PI * 2)}" fill="${opts.color2}" />
      <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="22" fill="#1F4E5F">${opts.centerIcon}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a">${opts.centerValue}</text>
      <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="11" fill="#64748b">${opts.centerSub}</text>
    </svg>
  `
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function openGuestRoomChartPdf(params: {
  strutturaLabel?: string
  periodoLabel?: string
} = {}) {
  const win = window.open('', '_blank', 'width=1100,height=820')
  if (!win) return

  const struttura = escapeHtml(params.strutturaLabel ?? 'Tutte le strutture')
  const periodo   = escapeHtml(params.periodoLabel   ?? '01/05/2026 — 31/05/2026')

  // Dati mock coerenti con lo screenshot della pagina
  const trendCamera = genTrend(15, { peakStart: 22, peakEnd: 30, peakVal: 14, forecastVal: 8 })
  const trendOspiti = genTrend(100, { peakStart: 22, peakEnd: 30, peakVal: 95, forecastVal: 96 })

  const donutCamere = buildDonutSvg({
    label1: 'Gruppi',  val1: 45.57, color1: '#F59E0B',
    label2: 'Dirette', val2: 54.43, color2: '#3FA34D',
    centerValue: '79,00',
    centerSub: 'Camere occupate',
    centerIcon: '\u{1F6CF}',
  })
  const donutOspiti = buildDonutSvg({
    label1: 'Gruppi',  val1: 78.79, color1: '#F59E0B',
    label2: 'Dirette', val2: 21.21, color2: '#3FA34D',
    centerValue: '396,00',
    centerSub: 'Ospiti',
    centerIcon: '\u{1F465}',
  })

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>Guests & rooms analysis</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; padding: 24px; margin: 0; }
  h1 { font-size: 22px; color: #204769; margin: 0 0 4px; }
  h2 { font-size: 14px; color: #204769; margin: 0 0 8px; font-weight: 700; }
  .meta { color: #4b5563; font-size: 12px; margin: 0 0 18px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px 18px; margin-bottom: 16px; background: #fff; }

  .top { display: flex; gap: 16px; align-items: stretch; }
  .donuts { flex: 0 0 320px; display: flex; flex-direction: column; gap: 14px; }
  .donut-wrap { display: flex; flex-direction: column; align-items: center; padding: 8px; }
  .donut-label { font-size: 11px; color: #4b5563; margin: 4px 0; }
  .kpis { display: flex; gap: 12px; justify-content: center; }
  .kpi { flex: 1; text-align: center; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f8fafc; }
  .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.4px; }
  .kpi-value { font-size: 18px; color: #204769; font-weight: 700; margin-top: 2px; }

  .trends { flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 11px; color: #4b5563; margin: 4px 0 8px; }
  .legend .sw { display: inline-block; width: 14px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .legend .sw--dash { background: repeating-linear-gradient(90deg, #F59E0B 0 5px, transparent 5px 8px); }

  .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: right; }

  @media print {
    body { padding: 12mm; }
    .card { break-inside: avoid; }
    .top { break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>Guests &amp; rooms analysis</h1>
  <p class="meta">
    <strong>Struttura:</strong> ${struttura}
    &nbsp;·&nbsp; <strong>Periodo:</strong> ${periodo}
    &nbsp;·&nbsp; <strong>Generato:</strong> ${escapeHtml(new Date().toLocaleString('it-IT'))}
  </p>

  <div class="top">
    <div class="donuts card">
      <div class="donut-wrap">
        <div class="donut-label">Gruppi: 45,57%</div>
        ${donutCamere}
        <div class="donut-label">Dirette: 54,43%</div>
      </div>
      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">RevPar</div>
          <div class="kpi-value">0,29€</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">RevGuest</div>
          <div class="kpi-value">5,13€</div>
        </div>
      </div>
      <div class="donut-wrap">
        <div class="donut-label">Gruppi: 78,79%</div>
        ${donutOspiti}
        <div class="donut-label">Dirette: 21,21%</div>
      </div>
    </div>

    <div class="trends">
      <div class="card">
        <h2>Trend camera</h2>
        <div class="legend">
          <span><span class="sw" style="background:#1F4E5F"></span>Camere occupate</span>
          <span><span class="sw sw--dash"></span>Camere occupate (forecast)</span>
          <span><span class="sw" style="background:#A0A4AA"></span>Camere occupate LY</span>
        </div>
        ${buildTrendSvg(trendCamera, 20)}
      </div>
      <div class="card">
        <h2>Trend ospiti</h2>
        <div class="legend">
          <span><span class="sw" style="background:#1F4E5F"></span>Numero ospiti</span>
          <span><span class="sw sw--dash"></span>Numero ospiti (forecast)</span>
          <span><span class="sw" style="background:#A0A4AA"></span>Numero ospiti LY</span>
        </div>
        ${buildTrendSvg(trendOspiti, 100)}
      </div>
    </div>
  </div>

  <p class="footer">Sibylla Platform — Esportazione automatica</p>

  <script>
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });
  </script>
</body>
</html>`

  win.document.open()
  win.document.write(html)
  win.document.close()
}
