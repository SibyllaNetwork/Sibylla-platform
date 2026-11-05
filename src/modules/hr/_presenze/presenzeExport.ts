// ─── REGISTRO PRESENZE — Excel e PDF riepilogativi del mese ────────────────────
//  - Excel (.xlsx vero, con stili): foglio "Riepilogo" con le ore per voce di
//    ogni dipendente, poi un foglio per dipendente con le ore giorno per giorno
//    (Ordinarie, Straordinario, Festive, Permessi, Infortunio, Malattia, Ferie,
//    Trasferta e TOTALE), come il tracciato per il consulente del lavoro.
//  - PDF (A4 orizzontale, tre dipendenti per pagina): il calendario presenze con
//    tipo di giornata, ingresso, uscita, ore extra e straordinario approvato,
//    legenda e spazio per data e firma del datore di lavoro.
//  Tutto generato nel browser, con i colori Platform.
import { strToU8, zipSync } from 'fflate'
import { jsPDF } from 'jspdf'
import { logoPng } from '../../notifiche/CentroNotifiche/reportPickupPdf'
import { toast } from '../../../core/components/Toast/useToast'
import {
  chiaveGiorno, fmtExtra, giorniDelMese, GSETT, LEGENDA, MESI_LUNGHI, minToHHMM, oreDecimali, oreGiorno, SIGLA, totaliMese, VOCI_ORE,
  type CodiceGiorno, type GiornataRegistro, type GiornoMese, type TotaliMese,
} from './presenze.model'

export interface DipendenteExport { id: number; nome: string; cognome: string; reparto: string }

export interface OpzioniExport {
  dipendenti: DipendenteExport[]
  anno: number
  /** Mese 0-based. */
  mese: number
  giornata: (dipId: number, iso: string) => GiornataRegistro
  struttura?: string
  /** Straordinario approvato (minuti) per giornata: se manca, la riga resta da compilare a mano. */
  straordinarioApprovato?: Record<string, number>
  /** Titolo del documento (default "Calendario presenze"). */
  titolo?: string
}

const nomeFile = (o: OpzioniExport, base: string) => `${base}_${MESI_LUNGHI[o.mese]}_${o.anno}`
const generatoIl = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} alle ${p(d.getHours())}:${p(d.getMinutes())}`
}

function scarica(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface MeseDip { dip: DipendenteExport; giorni: GiornoMese[]; tot: TotaliMese }
const mesiDi = (o: OpzioniExport): MeseDip[] => o.dipendenti.map((dip) => {
  const giorni = giorniDelMese(o.anno, o.mese, (iso) => o.giornata(dip.id, iso))
  return { dip, giorni, tot: totaliMese(giorni) }
})

// ═══ EXCEL ═══════════════════════════════════════════════════════════════════

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Lettera di colonna Excel (1 → A, 27 → AA). */
function col(n: number) {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

// Stili (indice di cellXfs)
const S = {
  brand: 1, titolo: 2, meta: 3, nome: 4, giorno: 5, giornoWe: 6, gsett: 7, gsettWe: 8,
  label: 9, valore: 10, valoreWe: 11, totCol: 12, totLabel: 13, totValore: 14, testata: 15, nota: 16, labelTesto: 17,
} as const

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="11">
<font><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
<font><b/><sz val="9"/><color rgb="FFA2864C"/><name val="Calibri"/></font>
<font><b/><sz val="15"/><color rgb="FF204769"/><name val="Calibri"/></font>
<font><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF204769"/><name val="Calibri"/></font>
<font><sz val="9"/><color rgb="FF64748B"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF334155"/><name val="Calibri"/></font>
<font><b/><sz val="10"/><color rgb="FF204769"/><name val="Calibri"/></font>
<font><b/><sz val="9"/><color rgb="FFC43D34"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF204769"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF4"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD5E1EE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD8E2EC"/></left><right style="thin"><color rgb="FFD8E2EC"/></right><top style="thin"><color rgb="FFD8E2EC"/></top><bottom style="thin"><color rgb="FFD8E2EC"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="18">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="10" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="7" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="8" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="9" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="9" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="9" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="0"/></xf>
<xf numFmtId="0" fontId="8" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

type Cella = string | number | null | undefined
interface Riga { r: number; ht?: number; celle: { c: number; v: Cella; s: number }[] }

function cellaXml(r: number, c: number, v: Cella, s: number) {
  const ref = `${col(c)}${r}`
  if (v == null || v === '') return `<c r="${ref}" s="${s}"/>`
  if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${v}</v></c>`
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`
}

function foglioXml(righe: Riga[], larghezze: number[], merge: string[], freeze?: { col: number; row: number }) {
  const cols = larghezze.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const rows = righe.map((r) => `<row r="${r.r}"${r.ht ? ` ht="${r.ht}" customHeight="1"` : ''}>${r.celle.map((c) => cellaXml(r.r, c.c, c.v, c.s)).join('')}</row>`).join('')
  const pane = freeze
    ? `<pane xSplit="${freeze.col}" ySplit="${freeze.row}" topLeftCell="${col(freeze.col + 1)}${freeze.row + 1}" activePane="bottomRight" state="frozen"/>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rows}</sheetData>
${merge.length ? `<mergeCells count="${merge.length}">${merge.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Intestazione comune ai fogli (righe 1–3). */
function testata(o: OpzioniExport, titolo: string): Riga[] {
  return [
    { r: 1, ht: 14, celle: [{ c: 2, v: 'SIBYLLA · REGISTRO PRESENZE', s: S.brand }] },
    { r: 2, ht: 22, celle: [{ c: 2, v: `${titolo} — ${MESI_LUNGHI[o.mese]} ${o.anno}`, s: S.titolo }] },
    { r: 3, ht: 14, celle: [{ c: 2, v: `${o.struttura ? `${o.struttura} · ` : ''}Generato il ${generatoIl()}`, s: S.meta }] },
  ]
}

function foglioDipendente(o: OpzioniExport, m: MeseDip) {
  const n = m.giorni.length
  const cOre = 3 + n
  const cGg = cOre + 1
  const righe: Riga[] = [...testata(o, `${m.dip.nome} ${m.dip.cognome}`)]
  righe.push({ r: 5, ht: 20, celle: [
    { c: 2, v: `${m.dip.nome} ${m.dip.cognome}`, s: S.nome },
    ...m.giorni.map((g, i) => ({ c: 3 + i, v: g.n, s: g.festivo || g.dow === 6 ? S.giornoWe : S.giorno })),
    { c: cOre, v: 'TOTALE', s: S.testata }, { c: cGg, v: null, s: S.testata },
  ] })
  righe.push({ r: 6, ht: 15, celle: [
    { c: 2, v: null, s: S.nome },
    ...m.giorni.map((g, i) => ({ c: 3 + i, v: GSETT[g.dow], s: g.festivo ? S.gsettWe : S.gsett })),
    { c: cOre, v: 'Ore', s: S.testata }, { c: cGg, v: 'Gg', s: S.testata },
  ] })
  const perGiorno = m.giorni.map(oreGiorno)
  VOCI_ORE.forEach((voce, j) => {
    const t = m.tot.ore[voce]
    righe.push({ r: 7 + j, ht: 16, celle: [
      { c: 2, v: voce, s: S.label },
      ...m.giorni.map((g, i) => ({ c: 3 + i, v: perGiorno[i][voce] ? r1(perGiorno[i][voce]) : null, s: g.festivo || g.dow === 6 ? S.valoreWe : S.valore })),
      // Festive: i giorni sono quelli festivi del mese, come nel tracciato del consulente.
      { c: cOre, v: r1(t.ore), s: S.totCol }, { c: cGg, v: voce === 'Festive' ? m.giorni.filter((g) => g.festivo).length : t.gg, s: S.totCol },
    ] })
  })
  const rTot = 7 + VOCI_ORE.length + 1
  const totGiorno = perGiorno.map((x) => r1(VOCI_ORE.reduce((s, v) => s + x[v], 0)))
  const giorniConOre = totGiorno.filter((x) => x > 0).length
  righe.push({ r: rTot, ht: 18, celle: [
    { c: 2, v: 'TOTALE', s: S.totLabel },
    ...totGiorno.map((v, i) => ({ c: 3 + i, v, s: S.totValore })),
    { c: cOre, v: r1(totGiorno.reduce((s, v) => s + v, 0)), s: S.totValore }, { c: cGg, v: giorniConOre, s: S.totValore },
  ] })
  const extra = m.giorni.reduce((s, x) => s + x.g.straordinari, 0)
  righe.push({ r: rTot + 2, celle: [{ c: 2, v: `Ore extra timbrate nel mese: ${fmtExtra(extra)} · Ore in decimali (8 = otto ore). Ferie e malattia valgono 8 ore per giornata.`, s: S.nota }] })
  const larghezze = [2, 22, ...Array(n).fill(5.4), 8, 6]
  const merge = [`B5:B6`, `${col(cOre)}5:${col(cGg)}5`]
  return foglioXml(righe, larghezze, merge, { col: 2, row: 6 })
}

const extraDi = (m: MeseDip) => m.giorni.reduce((s, x) => s + x.g.straordinari, 0)

function foglioRiepilogo(o: OpzioniExport, mesi: MeseDip[]) {
  const righe: Riga[] = [...testata(o, o.titolo ?? 'Registro presenze')]
  const intest = ['Dipendente', 'Reparto', ...VOCI_ORE.map((v) => `${v} (h)`), 'Totale ore', 'Ore extra', 'Giorni lavorati']
  righe.push({ r: 5, ht: 20, celle: intest.map((v, i) => ({ c: 2 + i, v, s: i < 2 ? S.nome : S.testata })) })
  mesi.forEach((m, j) => {
    const ore = VOCI_ORE.map((v) => r1(m.tot.ore[v].ore))
    righe.push({ r: 6 + j, ht: 16, celle: [
      { c: 2, v: `${m.dip.cognome} ${m.dip.nome}`, s: S.label },
      { c: 3, v: m.dip.reparto, s: S.labelTesto },
      ...ore.map((v, i) => ({ c: 4 + i, v: v || null, s: S.valore })),
      { c: 4 + VOCI_ORE.length, v: r1(ore.reduce((s, v) => s + v, 0)), s: S.totCol },
      { c: 5 + VOCI_ORE.length, v: extraDi(m) ? fmtExtra(extraDi(m)) : null, s: S.valore },
      { c: 6 + VOCI_ORE.length, v: m.giorni.filter((x) => x.g.lavorati > 0).length, s: S.valore },
    ] })
  })
  const rTot = 6 + mesi.length
  const somme = VOCI_ORE.map((v) => r1(mesi.reduce((s, m) => s + m.tot.ore[v].ore, 0)))
  righe.push({ r: rTot, ht: 18, celle: [
    { c: 2, v: 'TOTALE', s: S.totLabel }, { c: 3, v: `${mesi.length} dipendenti`, s: S.totLabel },
    ...somme.map((v, i) => ({ c: 4 + i, v, s: S.totValore })),
    { c: 4 + VOCI_ORE.length, v: r1(somme.reduce((s, v) => s + v, 0)), s: S.totValore },
    { c: 5 + VOCI_ORE.length, v: fmtExtra(mesi.reduce((s, m) => s + m.giorni.reduce((t, x) => t + x.g.straordinari, 0), 0)), s: S.totValore },
    { c: 6 + VOCI_ORE.length, v: mesi.reduce((s, m) => s + m.giorni.filter((x) => x.g.lavorati > 0).length, 0), s: S.totValore },
  ] })
  return foglioXml(righe, [2, 26, 18, ...Array(VOCI_ORE.length).fill(12), 11, 10, 13], [], { col: 2, row: 5 })
}

/** Nome di foglio valido e univoco (max 31 caratteri, niente caratteri riservati). */
function nomeFoglio(base: string, usati: Set<string>) {
  const pulito = base.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Foglio'
  let nome = pulito
  for (let i = 2; usati.has(nome.toLowerCase()); i++) nome = `${pulito.slice(0, 27)} (${i})`
  usati.add(nome.toLowerCase())
  return nome
}

export function esportaRegistroXlsx(o: OpzioniExport) {
  const mesi = mesiDi(o)
  const usati = new Set<string>()
  const fogli = [
    { nome: nomeFoglio('Riepilogo', usati), xml: foglioRiepilogo(o, mesi) },
    ...mesi.map((m) => ({ nome: nomeFoglio(`${m.dip.nome} ${m.dip.cognome}`, usati), xml: foglioDipendente(o, m) })),
  ]
  const file: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${fogli.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${fogli.map((f, i) => `<sheet name="${esc(f.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fogli.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${fogli.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(STYLES),
  }
  fogli.forEach((f, i) => { file[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(f.xml) })
  const zip = zipSync(file, { level: 6 })
  scarica(new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nomeFile(o, 'Registro')}.xlsx`)
  toast.success(`${mesi.length} dipendenti, un foglio ciascuno più il riepilogo.`, 'Registro Excel scaricato')
}

// ═══ PDF ═════════════════════════════════════════════════════════════════════

const NAVY = '#204769'
const GOLD = '#A2864C'
const INK = '#1E293B'
const MUTED = '#64748B'
const BORDER = '#D8E2EC'
const HEAD = '#E8EEF4'
const WE = '#F1F5F9'
const IN = '#2E7D3A'
const OUT = '#C43D34'
const EXTRA = '#5B43A0'

const COLORE: Record<CodiceGiorno, string> = {
  ORD: '#2E6DA4', STR: '#5B43A0', 'O+P': '#A8862F', RIP: '#64748B', FER: '#2E7D3A', ROL: '#1E9E95',
  PER: '#A8862F', MAL: '#A8407F', ASS: '#C43D34', ANO: '#C4661F', VUO: '#64748B',
}

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
/** Tinta chiara di un colore (mescolato col bianco). */
const tinta = (hex: string, a = 0.16): [number, number, number] => rgb(hex).map((c) => Math.round(c * a + 255 * (1 - a))) as [number, number, number]

export async function esportaPresenzePdf(o: OpzioniExport) {
  const mesi = mesiDi(o)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210, M = 10
  const logo = await logoPng()
  const titolo = o.titolo ?? 'Calendario presenze'
  const generato = generatoIl()
  const perPagina = 3
  const pagine = Math.max(1, Math.ceil(mesi.length / perPagina))

  const fill = (hex: string | [number, number, number]) => doc.setFillColor(...(typeof hex === 'string' ? rgb(hex) : hex))
  const draw = (hex: string) => doc.setDrawColor(...rgb(hex))
  const ink = (hex: string | [number, number, number]) => doc.setTextColor(...(typeof hex === 'string' ? rgb(hex) : hex))
  const font = (size: number, stile: 'normal' | 'bold' = 'normal') => { doc.setFont('helvetica', stile); doc.setFontSize(size) }

  function intestazione() {
    if (logo) doc.addImage(logo.data, "PNG", M, 7.8, 3.4 * logo.ratio, 3.4, "sibylla-logo", "FAST")
    font(7, 'bold'); ink(GOLD)
    doc.text('REGISTRO PRESENZE', M + (logo ? 3.4 * logo.ratio + 3 : 0), 10.6)
    font(15, 'bold'); ink(NAVY)
    doc.text(`${titolo} — ${MESI_LUNGHI[o.mese]} ${o.anno}`, M, 18.5)
    font(7.5); ink(MUTED)
    doc.text(`${o.struttura ? `${o.struttura} · ` : ''}Generato il ${generato}`, W - M, 18.5, { align: 'right' })
    draw(BORDER); doc.setLineWidth(0.3); doc.line(M, 21.5, W - M, 21.5)
  }

  function piede(pagina: number) {
    // Legenda
    let x = M
    const y = H - 27
    font(6.5)
    LEGENDA.forEach((v) => {
      const sigla = SIGLA[v.codice]
      const wChip = doc.getTextWidth(sigla) + 3
      fill(tinta(COLORE[v.codice])); doc.roundedRect(x, y - 2.6, wChip, 3.6, 0.8, 0.8, 'F')
      font(6.5, 'bold'); ink(COLORE[v.codice]); doc.text(sigla, x + 1.5, y)
      font(6.5); ink(MUTED); doc.text(v.label, x + wChip + 1.2, y)
      x += wChip + doc.getTextWidth(v.label) + 6
    })
    font(6.5); ink(MUTED)
    doc.text("Ore extra: tempo lavorato oltre le 8 ore ordinarie della giornata (' = minuti). Straordinario approvato: a cura del datore di lavoro, giorno per giorno.", M, y + 5)
    // Data e firma
    const yF = H - 10
    font(8); ink(INK)
    doc.text('Data', M, yF)
    draw(MUTED); doc.setLineWidth(0.2); doc.line(M + 8, yF + 0.5, M + 50, yF + 0.5)
    doc.text('Firma del datore di lavoro', M + 62, yF)
    doc.line(M + 100, yF + 0.5, M + 170, yF + 0.5)
    font(7.5); ink(MUTED)
    doc.text(`Pagina ${pagina} di ${pagine}`, W - M, yF, { align: 'right' })
  }

  function blocco(m: MeseDip, y0: number) {
    const n = m.giorni.length
    const wLab = 27, wTot = 13
    const wG = (W - 2 * M - wLab - wTot) / n
    // Nome e reparto
    font(10, 'bold'); ink(INK)
    const nome = `${m.dip.nome} ${m.dip.cognome}`
    doc.text(nome, M, y0 + 3.5)
    const xR = M + doc.getTextWidth(nome) + 3
    font(7.5); ink(MUTED)
    doc.text(m.dip.reparto, xR, y0 + 3.5)

    const righe: { label: string; h: number; tipo: 'giorno' | 'gsett' | 'tipo' | 'in' | 'out' | 'extra' | 'appr' }[] = [
      { label: 'Giorno', h: 4.4, tipo: 'giorno' },
      { label: 'G. sett.', h: 3.6, tipo: 'gsett' },
      { label: 'Tipo', h: 4.8, tipo: 'tipo' },
      { label: 'Ingresso', h: 4.3, tipo: 'in' },
      { label: 'Uscita', h: 4.3, tipo: 'out' },
      { label: 'Ore extra', h: 4.3, tipo: 'extra' },
      { label: 'Straordinario approvato', h: 6.4, tipo: 'appr' },
    ]
    let y = y0 + 6
    const xTot = W - M - wTot
    const totExtra = m.giorni.reduce((s, x) => s + x.g.straordinari, 0)
    const totAppr = o.straordinarioApprovato
      ? m.giorni.reduce((s, x) => s + (o.straordinarioApprovato![chiaveGiorno(m.dip.id, x.iso)] ?? 0), 0) : 0
    doc.setLineWidth(0.15); draw(BORDER)
    righe.forEach((r) => {
      const testa = r.tipo === 'giorno' || r.tipo === 'gsett'
      // Etichetta
      fill(testa ? HEAD : '#FFFFFF'); doc.rect(M, y, wLab, r.h, 'FD')
      font(r.tipo === 'appr' ? 6 : 6.8, testa || r.tipo === 'tipo' ? 'bold' : 'normal')
      ink(r.tipo === 'extra' || r.tipo === 'appr' ? EXTRA : testa ? NAVY : INK)
      if (r.tipo === 'appr') doc.text(['Straordinario', 'approvato'], M + 1.5, y + 2.6)
      else doc.text(r.label, M + 1.5, y + r.h / 2 + 1.1)
      // Giorni
      m.giorni.forEach((x, i) => {
        const cx = M + wLab + i * wG
        const we = x.festivo || x.dow === 6
        fill(testa ? (we ? WE : HEAD) : we ? WE : '#FFFFFF'); doc.rect(cx, y, wG, r.h, 'FD')
        const mid = cx + wG / 2
        const by = y + r.h / 2 + 1.1
        const g = x.g
        if (r.tipo === 'giorno') {
          font(7, 'bold'); ink(x.oggi ? NAVY : x.festivo ? OUT : we ? MUTED : INK); doc.text(String(x.n), mid, by, { align: 'center' })
        } else if (r.tipo === 'gsett') {
          font(5.8); ink(x.festivo ? OUT : MUTED); doc.text(GSETT[x.dow], mid, by - 0.2, { align: 'center' })
        } else if (r.tipo === 'tipo' && g.codice !== 'VUO') {
          const c = COLORE[g.codice]
          fill(tinta(c)); doc.roundedRect(cx + 0.7, y + 0.8, wG - 1.4, r.h - 1.6, 0.7, 0.7, 'F')
          font(5.4, 'bold'); ink(c); doc.text(SIGLA[g.codice], mid, by - 0.1, { align: 'center' })
        } else if (r.tipo === 'in' && g.ingresso != null) {
          font(6.2); ink(IN); doc.text(minToHHMM(g.ingresso), mid, by, { align: 'center' })
        } else if (r.tipo === 'out' && g.uscita != null) {
          font(6.2); ink(OUT); doc.text(minToHHMM(g.uscita), mid, by, { align: 'center' })
        } else if (r.tipo === 'extra' && g.straordinari > 0) {
          font(6.2, 'bold'); ink(EXTRA); doc.text(fmtExtra(g.straordinari), mid, by, { align: 'center' })
        } else if (r.tipo === 'appr' && o.straordinarioApprovato) {
          const v = o.straordinarioApprovato[chiaveGiorno(m.dip.id, x.iso)]
          if (v != null) { font(6.2, 'bold'); ink(EXTRA); doc.text(fmtExtra(v), mid, by, { align: 'center' }) }
        }
      })
      // Totale
      fill(testa ? HEAD : '#FFFFFF'); doc.rect(xTot, y, wTot, r.h, 'FD')
      if (r.tipo === 'giorno') { font(6.8, 'bold'); ink(NAVY); doc.text('Totale', xTot + wTot / 2, y + r.h / 2 + 1.1, { align: 'center' }) }
      if (r.tipo === 'extra' && totExtra) { font(6.5, 'bold'); ink(EXTRA); doc.text(fmtExtra(totExtra), xTot + wTot / 2, y + r.h / 2 + 1.1, { align: 'center' }) }
      if (r.tipo === 'appr' && totAppr) { font(6.5, 'bold'); ink(EXTRA); doc.text(fmtExtra(totAppr), xTot + wTot / 2, y + r.h / 2 + 1.1, { align: 'center' }) }
      y += r.h
    })
    // Totali del mese
    const t = m.tot
    const voci: [string, string, string][] = [[oreDecimali(t.ordinari).replace('h', ' h'), 'Ordinarie', '#2E6DA4']]
    if (t.ferie) voci.push([`${t.ferie} gg`, 'Ferie', COLORE.FER])
    if (t.rol + t.permessi) voci.push([(r1((t.rol + t.permessi) / 60)).toFixed(1).replace('.', ','), 'Permessi / ROL', COLORE.PER])
    if (t.malattia) voci.push([`${t.malattia} gg`, 'Malattia', COLORE.MAL])
    if (t.assenze) voci.push([`${t.assenze} gg`, 'Assenze', COLORE.ASS])
    if (t.anomalie) voci.push([String(t.anomalie), t.anomalie === 1 ? 'Timbratura anomala' : 'Timbrature anomale', COLORE.ANO])
    if (totExtra) voci.push([fmtExtra(totExtra), 'Ore extra', EXTRA])
    if (totAppr) voci.push([fmtExtra(totAppr), 'Straordinario approvato', EXTRA])
    let x = M
    voci.forEach(([v, l, c]) => {
      font(7.5, 'bold'); ink(c); doc.text(v, x, y + 4)
      const wv = doc.getTextWidth(v)
      font(7.5); ink(MUTED); doc.text(l, x + wv + 1.2, y + 4)
      x += wv + doc.getTextWidth(l) + 7
    })
  }

  for (let p = 0; p < pagine; p++) {
    if (p > 0) doc.addPage()
    intestazione()
    mesi.slice(p * perPagina, p * perPagina + perPagina).forEach((m, i) => blocco(m, 25 + i * 48.5))
    piede(p + 1)
  }
  if (!mesi.length) { font(10); ink(MUTED); doc.text('Nessun dipendente per i filtri selezionati.', M, 32) }

  doc.save(`${nomeFile(o, titolo.replace(/\s+/g, '_'))}.pdf`)
  toast.success(`${mesi.length} dipendenti su ${pagine} ${pagine === 1 ? 'pagina' : 'pagine'}.`, 'PDF scaricato')
}
