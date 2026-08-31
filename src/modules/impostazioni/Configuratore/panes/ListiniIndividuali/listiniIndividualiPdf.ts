// Genera lato client il PDF della configurazione dei listini individuali:
// intestazione col contesto (struttura + stagionalità), elenco Camere Hotel
// con la tariffa della stagione selezionata e riepilogo calendario per
// tipologia × stagionalità. Nessun dato passa dal server.
import { jsPDF } from 'jspdf'
import {
  LST_TIPOLOGIE,
  keyInd,
  fmtEuro,
  tipologiaNome,
  type LstCamera,
  type LstStagione,
} from '../_listini/listiniData'

export interface ListiniIndividualiPdfArgs {
  strutturaId: string
  strutturaNome: string
  stagioneSelezionata: LstStagione
  stagioni: LstStagione[]
  camere: LstCamera[]
  prezzi: Record<string, number>
}

export function exportListiniIndividualiPdf({
  strutturaId, strutturaNome, stagioneSelezionata, stagioni, camere, prezzi,
}: ListiniIndividualiPdfArgs) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pw = pdf.internal.pageSize.getWidth()
  const margin = 48
  let y = margin

  pdf.setFontSize(17)
  pdf.setTextColor(30)
  pdf.text('Listini individuali', margin, y)
  y += 18
  pdf.setFontSize(11)
  pdf.setTextColor(90)
  pdf.text(`${strutturaNome} · Stagionalità ${stagioneSelezionata.nome} (${stagioneSelezionata.periodo})`, margin, y)
  y += 8
  pdf.setDrawColor(200)
  pdf.line(margin, y, pw - margin, y)
  y += 26

  // ── Camere Hotel (nomi associati dalla struttura) ───────────────────────────
  pdf.setFontSize(13)
  pdf.setTextColor(30)
  pdf.text('Camere Hotel', margin, y)
  y += 16
  pdf.setFontSize(10)
  pdf.setTextColor(120)
  pdf.text('Camera', margin, y)
  pdf.text('Tipologia', margin + 210, y)
  pdf.text(`Tariffa ${stagioneSelezionata.nome}`, margin + 350, y)
  y += 6
  pdf.line(margin, y, pw - margin, y)
  y += 16

  pdf.setFontSize(11)
  for (const cam of camere) {
    const prezzo = prezzi[keyInd(strutturaId, stagioneSelezionata.id, cam.id)]
    pdf.setTextColor(30)
    pdf.text(cam.nomeLocale, margin, y)
    pdf.setTextColor(120)
    pdf.text(tipologiaNome(cam.tipologiaId), margin + 210, y)
    pdf.setTextColor(30)
    pdf.text(prezzo ? fmtEuro(prezzo) : '—', margin + 350, y)
    y += 20
  }
  y += 20

  // ── Riepilogo calendario: tipologia × stagionalità ──────────────────────────
  pdf.setFontSize(13)
  pdf.setTextColor(30)
  pdf.text('Riepilogo calendario (tipologia × stagionalità)', margin, y)
  y += 16

  const colW = (pw - margin * 2 - 140) / stagioni.length
  pdf.setFontSize(10)
  pdf.setTextColor(120)
  pdf.text('Tipologia', margin, y)
  stagioni.forEach((s, i) => {
    pdf.text(`${s.nome}`, margin + 140 + i * colW, y)
  })
  y += 12
  pdf.setFontSize(8)
  stagioni.forEach((s, i) => {
    pdf.text(s.periodo, margin + 140 + i * colW, y, { maxWidth: colW - 10 })
  })
  y += 14
  pdf.line(margin, y, pw - margin, y)
  y += 16

  const tipologiePresenti = LST_TIPOLOGIE.filter(t => camere.some(c => c.tipologiaId === t.id))
  pdf.setFontSize(11)
  for (const tip of tipologiePresenti) {
    pdf.setTextColor(30)
    pdf.text(tip.nome, margin, y)
    stagioni.forEach((s, i) => {
      const valori = camere
        .filter(c => c.tipologiaId === tip.id)
        .map(c => prezzi[keyInd(strutturaId, s.id, c.id)])
        .filter((v): v is number => v != null && v > 0)
      let testo = '—'
      if (valori.length > 0) {
        const min = Math.min(...valori)
        const max = Math.max(...valori)
        testo = min === max ? fmtEuro(min) : `${fmtEuro(min)} – ${fmtEuro(max)}`
      }
      pdf.text(testo, margin + 140 + i * colW, y)
    })
    y += 20
  }

  pdf.save(`listini-individuali-${strutturaId}.pdf`)
}
