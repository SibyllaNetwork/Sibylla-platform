// ─── Lingue della mail del preventivo di soggiorno ───────────────────────────
//  Tre livelli:
//   1. MESSAGGI: le parole fisse della mail (Totale, notti, Servizi inclusi…)
//      e della pagina di conferma del cliente;
//   2. FRASI: frasario dei testi standard in italiano (testi dei template
//      pronti, tipologie di camera, trattamenti, servizi, termini e condizioni)
//      → tradotti in automatico in ogni lingua;
//   3. le traduzioni scritte dal cliente nell'editor (template.traduzioni,
//      termini.traduzioni) per i testi suoi, che il frasario non conosce.
//  L'italiano è la lingua di base: ciò che non è tradotto resta in italiano.

export type Lingua = 'it' | 'en' | 'fr' | 'de' | 'es' | 'zh'

export const LINGUE: Record<Lingua, { label: string; nativo: string; locale: string; bandiera: string }> = {
  it: { label: 'Italiano', nativo: 'Italiano', locale: 'it-IT', bandiera: 'it' },
  en: { label: 'Inglese', nativo: 'English', locale: 'en-GB', bandiera: 'gb' },
  fr: { label: 'Francese', nativo: 'Français', locale: 'fr-FR', bandiera: 'fr' },
  de: { label: 'Tedesco', nativo: 'Deutsch', locale: 'de-DE', bandiera: 'de' },
  es: { label: 'Spagnolo', nativo: 'Español', locale: 'es-ES', bandiera: 'es' },
  zh: { label: 'Cinese', nativo: '中文', locale: 'zh-CN', bandiera: 'cn' },
}
export const ELENCO_LINGUE = Object.keys(LINGUE) as Lingua[]

/** Font di ripiego per il cinese, aggiunti in coda alle famiglie del template. */
export const FONT_CJK = "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans SC',sans-serif"

const plur = (n: number, uno: string, molti: string) => (n === 1 ? uno : molti)

export interface Messaggi {
  totale: string
  notti: (n: number) => string
  adulti: (n: number) => string
  bambini: (n: number) => string
  camere: (n: number) => string
  /** "Camera 204" / "Camere 204, 205". */
  numeriCamera: (n: number) => string
  perNotti: (n: number, camere: number) => string
  proposta: string
  soluzione: string
  trattamento: string
  serviziInclusi: string
  vociCamere: string
  supplemento: (t: string) => string
  sconto: (pct: number) => string
  tassa: string
  tassaRegola: (importo: string, max: number, esenti: boolean) => string
  tassaInclusa: (importo: string) => string
  extraTitolo: string
  extraScelti: string
  extraFacoltativi: string
  totaleConExtra: string
  accettata: (il: string) => string
  grazie: (lettera: string, struttura: string) => string
  confermaTermini: (titolo: string) => string
  terminiAggiornati: (data: string) => string
  terminiSintesi: string
  cliente: string
  soluzioni: (n: number) => string
  unita: Record<'soggiorno' | 'persona' | 'notte' | 'persona-notte', string>
  fiscale: { piva: string; cf: string; rea: string; capitale: string; pec: string }
  titoloMail: string
  // Mail di conferma della prenotazione
  titoloConferma: string
  confermata: string
  terminiAccettati: (titolo: string, il: string) => string
  extraPrenotati: string
  // Mail di pagamento non riuscito
  rifiutoTitolo: string
  rifiutoTesto: (importo: string, motivo: string) => string
  rifiutoPulsante: string
  pagato: (carta: string) => string
  saldo: string
  // Pagina di conferma del cliente
  confTitolo: (cliente: string) => string
  confSottotitolo: (lettera: string, titolo: string) => string
  confNessunExtra: string
  confSoggiorno: string
  confLeggi: (titolo: string) => string
  confAccetto: (titolo: string) => string
  confPulsante: (lettera: string) => string
  confIndietro: string
}

export const MESSAGGI: Record<Lingua, Messaggi> = {
  it: {
    totale: 'Totale', notti: (n) => `${n} ${plur(n, 'notte', 'notti')}`, adulti: (n) => `${n} ${plur(n, 'adulto', 'adulti')}`,
    bambini: (n) => `${n} ${plur(n, 'bambino', 'bambini')}`, camere: (n) => `${n} camere`, numeriCamera: (n) => plur(n, 'Camera', 'Camere'),
    perNotti: (n, c) => `per ${n} ${plur(n, 'notte', 'notti')}${c > 1 ? `, ${c} camere` : ''}`,
    proposta: 'Proposta', soluzione: 'Soluzione', trattamento: 'Trattamento', serviziInclusi: 'Servizi inclusi', vociCamere: 'Camere',
    supplemento: (t) => `Supplemento ${t.toLowerCase()}`, sconto: (p) => `Sconto ${p}%`, tassa: 'Tassa di soggiorno',
    tassaRegola: (i, m, e) => `${i} a persona per notte, max ${m} notti${e ? ', minori esenti' : ''}`,
    tassaInclusa: (i) => `Tassa di soggiorno inclusa (${i})`,
    extraTitolo: 'Servizi aggiuntivi a pagamento', extraScelti: 'Quelli con ✓ sono stati aggiunti alla prenotazione',
    extraFacoltativi: 'Facoltativi: puoi aggiungerli uno per uno quando accetti la proposta', totaleConExtra: 'Totale con i servizi aggiuntivi',
    accettata: (il) => `✓ Proposta accettata${il ? ` il ${il}` : ''}`,
    grazie: (l, s) => `<strong>Grazie!</strong> Hai scelto la proposta ${l}. ${s} ti contatterà a breve per confermare la prenotazione.`,
    confermaTermini: (t) => `Accettando la proposta confermi di aver letto: ${t}`,
    terminiAggiornati: (d) => `Aggiornati al ${d}`, terminiSintesi: 'in sintesi: il testo completo è nella pagina di conferma',
    cliente: 'cliente', soluzioni: (n) => `${n} ${plur(n, 'soluzione', 'soluzioni')}`,
    unita: { soggiorno: 'a soggiorno', persona: 'a persona', notte: 'a notte', 'persona-notte': 'a persona per notte' },
    fiscale: { piva: 'P.IVA', cf: 'C.F.', rea: 'REA', capitale: 'Cap. soc.', pec: 'PEC' }, titoloMail: 'Preventivo',
    titoloConferma: 'Conferma prenotazione', confermata: '✓ Prenotazione confermata',
    terminiAccettati: (t, il) => `Hai accettato: ${t}${il ? ` il ${il}` : ''}.`, extraPrenotati: 'Servizi aggiuntivi prenotati',
    rifiutoTitolo: 'Pagamento non riuscito', rifiutoTesto: (i, m) => `il pagamento di ${i} per la tua prenotazione non è andato a buon fine (${m}). La proposta resta valida: puoi riprovare con la stessa carta o con un'altra.`, rifiutoPulsante: 'Riprova il pagamento', pagato: (c) => `Pagato con ${c}`, saldo: 'Da saldare in struttura',
    confTitolo: (c) => `Ottima scelta, ${c}!`, confSottotitolo: (l, t) => `Stai accettando la proposta ${l}${t ? ` · ${t}` : ''}. Vuoi aggiungere qualcosa al tuo soggiorno?`,
    confNessunExtra: 'Questa proposta non prevede servizi aggiuntivi.', confSoggiorno: 'Soggiorno (tassa inclusa)',
    confLeggi: (t) => `Leggi: ${t}`, confAccetto: (t) => `Ho letto e accetto: ${t}`, confPulsante: (l) => `Conferma la proposta ${l}`, confIndietro: 'Torna alla mail',
  },
  en: {
    totale: 'Total', notti: (n) => `${n} ${plur(n, 'night', 'nights')}`, adulti: (n) => `${n} ${plur(n, 'adult', 'adults')}`,
    bambini: (n) => `${n} ${plur(n, 'child', 'children')}`, camere: (n) => `${n} rooms`, numeriCamera: (n) => plur(n, 'Room', 'Rooms'),
    perNotti: (n, c) => `for ${n} ${plur(n, 'night', 'nights')}${c > 1 ? `, ${c} rooms` : ''}`,
    proposta: 'Offer', soluzione: 'Option', trattamento: 'Board', serviziInclusi: 'Included services', vociCamere: 'Rooms',
    supplemento: (t) => `${t} supplement`, sconto: (p) => `${p}% discount`, tassa: 'City tax',
    tassaRegola: (i, m, e) => `${i} per person per night, max ${m} nights${e ? ', children exempt' : ''}`,
    tassaInclusa: (i) => `City tax included (${i})`,
    extraTitolo: 'Optional extras', extraScelti: 'Items marked ✓ have been added to your booking',
    extraFacoltativi: 'Optional: you can add them one by one when you accept the offer', totaleConExtra: 'Total with extras',
    accettata: (il) => `✓ Offer accepted${il ? ` on ${il}` : ''}`,
    grazie: (l, s) => `<strong>Thank you!</strong> You chose offer ${l}. ${s} will contact you shortly to confirm your booking.`,
    confermaTermini: (t) => `By accepting the offer you confirm you have read: ${t}`,
    terminiAggiornati: (d) => `Last updated ${d}`, terminiSintesi: 'summary: the full text is on the confirmation page',
    cliente: 'guest', soluzioni: (n) => `${n} ${plur(n, 'option', 'options')}`,
    unita: { soggiorno: 'per stay', persona: 'per person', notte: 'per night', 'persona-notte': 'per person per night' },
    fiscale: { piva: 'VAT no.', cf: 'Tax code', rea: 'REA', capitale: 'Share capital', pec: 'Certified email' }, titoloMail: 'Quote',
    titoloConferma: 'Booking confirmation', confermata: '✓ Booking confirmed',
    terminiAccettati: (t, il) => `You accepted: ${t}${il ? ` on ${il}` : ''}.`, extraPrenotati: 'Extras booked',
    rifiutoTitolo: 'Payment failed', rifiutoTesto: (i, m) => `the payment of ${i} for your booking was not successful (${m}). The offer is still valid: you can try again with the same card or another one.`, rifiutoPulsante: 'Retry the payment', pagato: (c) => `Paid by ${c}`, saldo: 'Balance due at the property',
    confTitolo: (c) => `Great choice, ${c}!`, confSottotitolo: (l, t) => `You are accepting offer ${l}${t ? ` · ${t}` : ''}. Would you like to add anything to your stay?`,
    confNessunExtra: 'This offer has no optional extras.', confSoggiorno: 'Stay (city tax included)',
    confLeggi: (t) => `Read: ${t}`, confAccetto: (t) => `I have read and accept: ${t}`, confPulsante: (l) => `Confirm offer ${l}`, confIndietro: 'Back to the email',
  },
  fr: {
    totale: 'Total', notti: (n) => `${n} ${plur(n, 'nuit', 'nuits')}`, adulti: (n) => `${n} ${plur(n, 'adulte', 'adultes')}`,
    bambini: (n) => `${n} ${plur(n, 'enfant', 'enfants')}`, camere: (n) => `${n} chambres`, numeriCamera: (n) => plur(n, 'Chambre', 'Chambres'),
    perNotti: (n, c) => `pour ${n} ${plur(n, 'nuit', 'nuits')}${c > 1 ? `, ${c} chambres` : ''}`,
    proposta: 'Offre', soluzione: 'Solution', trattamento: 'Pension', serviziInclusi: 'Services inclus', vociCamere: 'Chambres',
    supplemento: (t) => `Supplément ${t.toLowerCase()}`, sconto: (p) => `Remise ${p} %`, tassa: 'Taxe de séjour',
    tassaRegola: (i, m, e) => `${i} par personne et par nuit, max ${m} nuits${e ? ', mineurs exonérés' : ''}`,
    tassaInclusa: (i) => `Taxe de séjour incluse (${i})`,
    extraTitolo: 'Services supplémentaires payants', extraScelti: 'Les services cochés ✓ ont été ajoutés à la réservation',
    extraFacoltativi: 'Facultatifs : vous pouvez les ajouter un par un en acceptant l\'offre', totaleConExtra: 'Total avec les services supplémentaires',
    accettata: (il) => `✓ Offre acceptée${il ? ` le ${il}` : ''}`,
    grazie: (l, s) => `<strong>Merci !</strong> Vous avez choisi l'offre ${l}. ${s} vous contactera rapidement pour confirmer la réservation.`,
    confermaTermini: (t) => `En acceptant l'offre, vous confirmez avoir lu : ${t}`,
    terminiAggiornati: (d) => `Mis à jour le ${d}`, terminiSintesi: 'en résumé : le texte complet figure sur la page de confirmation',
    cliente: 'client', soluzioni: (n) => `${n} ${plur(n, 'solution', 'solutions')}`,
    unita: { soggiorno: 'par séjour', persona: 'par personne', notte: 'par nuit', 'persona-notte': 'par personne et par nuit' },
    fiscale: { piva: 'N° TVA', cf: 'Code fiscal', rea: 'REA', capitale: 'Capital social', pec: 'PEC' }, titoloMail: 'Devis',
    titoloConferma: 'Confirmation de réservation', confermata: '✓ Réservation confirmée',
    terminiAccettati: (t, il) => `Vous avez accepté : ${t}${il ? ` le ${il}` : ''}.`, extraPrenotati: 'Services supplémentaires réservés',
    rifiutoTitolo: 'Paiement refusé', rifiutoTesto: (i, m) => `le paiement de ${i} pour votre réservation n'a pas abouti (${m}). L'offre reste valable : vous pouvez réessayer avec la même carte ou une autre.`, rifiutoPulsante: 'Réessayer le paiement', pagato: (c) => `Payé par ${c}`, saldo: 'Solde à régler sur place',
    confTitolo: (c) => `Excellent choix, ${c} !`, confSottotitolo: (l, t) => `Vous acceptez l'offre ${l}${t ? ` · ${t}` : ''}. Souhaitez-vous ajouter quelque chose à votre séjour ?`,
    confNessunExtra: 'Cette offre ne prévoit pas de services supplémentaires.', confSoggiorno: 'Séjour (taxe incluse)',
    confLeggi: (t) => `Lire : ${t}`, confAccetto: (t) => `J'ai lu et j'accepte : ${t}`, confPulsante: (l) => `Confirmer l'offre ${l}`, confIndietro: 'Retour à l\'e-mail',
  },
  de: {
    totale: 'Gesamt', notti: (n) => `${n} ${plur(n, 'Nacht', 'Nächte')}`, adulti: (n) => `${n} ${plur(n, 'Erwachsener', 'Erwachsene')}`,
    bambini: (n) => `${n} ${plur(n, 'Kind', 'Kinder')}`, camere: (n) => `${n} Zimmer`, numeriCamera: () => 'Zimmer',
    perNotti: (n, c) => `für ${n} ${plur(n, 'Nacht', 'Nächte')}${c > 1 ? `, ${c} Zimmer` : ''}`,
    proposta: 'Angebot', soluzione: 'Option', trattamento: 'Verpflegung', serviziInclusi: 'Inklusivleistungen', vociCamere: 'Zimmer',
    supplemento: (t) => `Zuschlag ${t}`, sconto: (p) => `Rabatt ${p} %`, tassa: 'Kurtaxe',
    tassaRegola: (i, m, e) => `${i} pro Person und Nacht, max. ${m} Nächte${e ? ', Minderjährige befreit' : ''}`,
    tassaInclusa: (i) => `Kurtaxe inklusive (${i})`,
    extraTitolo: 'Kostenpflichtige Zusatzleistungen', extraScelti: 'Die mit ✓ markierten Leistungen wurden der Buchung hinzugefügt',
    extraFacoltativi: 'Optional: Sie können sie beim Annehmen des Angebots einzeln hinzufügen', totaleConExtra: 'Gesamt mit Zusatzleistungen',
    accettata: (il) => `✓ Angebot angenommen${il ? ` am ${il}` : ''}`,
    grazie: (l, s) => `<strong>Vielen Dank!</strong> Sie haben Angebot ${l} gewählt. ${s} meldet sich in Kürze, um die Buchung zu bestätigen.`,
    confermaTermini: (t) => `Mit der Annahme des Angebots bestätigen Sie, Folgendes gelesen zu haben: ${t}`,
    terminiAggiornati: (d) => `Stand: ${d}`, terminiSintesi: 'Zusammenfassung: den vollständigen Text finden Sie auf der Bestätigungsseite',
    cliente: 'Gast', soluzioni: (n) => `${n} ${plur(n, 'Option', 'Optionen')}`,
    unita: { soggiorno: 'pro Aufenthalt', persona: 'pro Person', notte: 'pro Nacht', 'persona-notte': 'pro Person und Nacht' },
    fiscale: { piva: 'USt-IdNr.', cf: 'Steuernummer', rea: 'REA', capitale: 'Stammkapital', pec: 'PEC' }, titoloMail: 'Angebot',
    titoloConferma: 'Buchungsbestätigung', confermata: '✓ Buchung bestätigt',
    terminiAccettati: (t, il) => `Sie haben akzeptiert: ${t}${il ? ` am ${il}` : ''}.`, extraPrenotati: 'Gebuchte Zusatzleistungen',
    rifiutoTitolo: 'Zahlung fehlgeschlagen', rifiutoTesto: (i, m) => `die Zahlung von ${i} für Ihre Buchung ist nicht erfolgt (${m}). Das Angebot bleibt gültig: Sie können es mit derselben oder einer anderen Karte erneut versuchen.`, rifiutoPulsante: 'Zahlung wiederholen', pagato: (c) => `Bezahlt mit ${c}`, saldo: 'Restbetrag vor Ort',
    confTitolo: (c) => `Gute Wahl, ${c}!`, confSottotitolo: (l, t) => `Sie nehmen Angebot ${l}${t ? ` · ${t}` : ''} an. Möchten Sie Ihrem Aufenthalt etwas hinzufügen?`,
    confNessunExtra: 'Dieses Angebot sieht keine Zusatzleistungen vor.', confSoggiorno: 'Aufenthalt (inkl. Kurtaxe)',
    confLeggi: (t) => `Lesen: ${t}`, confAccetto: (t) => `Ich habe gelesen und akzeptiere: ${t}`, confPulsante: (l) => `Angebot ${l} bestätigen`, confIndietro: 'Zurück zur E-Mail',
  },
  es: {
    totale: 'Total', notti: (n) => `${n} ${plur(n, 'noche', 'noches')}`, adulti: (n) => `${n} ${plur(n, 'adulto', 'adultos')}`,
    bambini: (n) => `${n} ${plur(n, 'niño', 'niños')}`, camere: (n) => `${n} habitaciones`, numeriCamera: (n) => plur(n, 'Habitación', 'Habitaciones'),
    perNotti: (n, c) => `por ${n} ${plur(n, 'noche', 'noches')}${c > 1 ? `, ${c} habitaciones` : ''}`,
    proposta: 'Propuesta', soluzione: 'Opción', trattamento: 'Régimen', serviziInclusi: 'Servicios incluidos', vociCamere: 'Habitaciones',
    supplemento: (t) => `Suplemento ${t.toLowerCase()}`, sconto: (p) => `Descuento ${p} %`, tassa: 'Tasa turística',
    tassaRegola: (i, m, e) => `${i} por persona y noche, máx. ${m} noches${e ? ', menores exentos' : ''}`,
    tassaInclusa: (i) => `Tasa turística incluida (${i})`,
    extraTitolo: 'Servicios adicionales de pago', extraScelti: 'Los marcados con ✓ se han añadido a la reserva',
    extraFacoltativi: 'Opcionales: puedes añadirlos uno a uno al aceptar la propuesta', totaleConExtra: 'Total con servicios adicionales',
    accettata: (il) => `✓ Propuesta aceptada${il ? ` el ${il}` : ''}`,
    grazie: (l, s) => `<strong>¡Gracias!</strong> Has elegido la propuesta ${l}. ${s} se pondrá en contacto contigo en breve para confirmar la reserva.`,
    confermaTermini: (t) => `Al aceptar la propuesta confirmas haber leído: ${t}`,
    terminiAggiornati: (d) => `Actualizados el ${d}`, terminiSintesi: 'resumen: el texto completo está en la página de confirmación',
    cliente: 'cliente', soluzioni: (n) => `${n} ${plur(n, 'opción', 'opciones')}`,
    unita: { soggiorno: 'por estancia', persona: 'por persona', notte: 'por noche', 'persona-notte': 'por persona y noche' },
    fiscale: { piva: 'CIF/NIF', cf: 'Código fiscal', rea: 'REA', capitale: 'Capital social', pec: 'PEC' }, titoloMail: 'Presupuesto',
    titoloConferma: 'Confirmación de reserva', confermata: '✓ Reserva confirmada',
    terminiAccettati: (t, il) => `Has aceptado: ${t}${il ? ` el ${il}` : ''}.`, extraPrenotati: 'Servicios adicionales reservados',
    rifiutoTitolo: 'Pago no realizado', rifiutoTesto: (i, m) => `el pago de ${i} de tu reserva no se ha completado (${m}). La propuesta sigue siendo válida: puedes reintentarlo con la misma tarjeta o con otra.`, rifiutoPulsante: 'Reintentar el pago', pagato: (c) => `Pagado con ${c}`, saldo: 'Saldo a pagar en el establecimiento',
    confTitolo: (c) => `¡Buena elección, ${c}!`, confSottotitolo: (l, t) => `Estás aceptando la propuesta ${l}${t ? ` · ${t}` : ''}. ¿Quieres añadir algo a tu estancia?`,
    confNessunExtra: 'Esta propuesta no incluye servicios adicionales.', confSoggiorno: 'Estancia (tasa incluida)',
    confLeggi: (t) => `Leer: ${t}`, confAccetto: (t) => `He leído y acepto: ${t}`, confPulsante: (l) => `Confirmar la propuesta ${l}`, confIndietro: 'Volver al correo',
  },
  zh: {
    totale: '总计', notti: (n) => `${n}晚`, adulti: (n) => `${n}位成人`, bambini: (n) => `${n}位儿童`, camere: (n) => `${n}间客房`,
    numeriCamera: () => '房间', perNotti: (n, c) => `共${n}晚${c > 1 ? `，${c}间客房` : ''}`,
    proposta: '方案', soluzione: '方案', trattamento: '餐食', serviziInclusi: '包含服务', vociCamere: '客房',
    supplemento: (t) => `${t}附加费`, sconto: (p) => `折扣 ${p}%`, tassa: '城市旅游税',
    tassaRegola: (i, m, e) => `每人每晚${i}，最多${m}晚${e ? '，未成年人免税' : ''}`,
    tassaInclusa: (i) => `含城市旅游税（${i}）`,
    extraTitolo: '付费增值服务', extraScelti: '带 ✓ 的服务已加入预订',
    extraFacoltativi: '可选：接受方案时可逐项添加', totaleConExtra: '含增值服务总计',
    accettata: (il) => `✓ 方案已接受${il ? `（${il}）` : ''}`,
    grazie: (l, s) => `<strong>感谢您！</strong>您选择了方案 ${l}。${s}将尽快与您联系以确认预订。`,
    confermaTermini: (t) => `接受方案即表示您已阅读：${t}`,
    terminiAggiornati: (d) => `更新于 ${d}`, terminiSintesi: '摘要：完整条款见确认页面',
    cliente: '贵宾', soluzioni: (n) => `${n}个方案`,
    unita: { soggiorno: '每次入住', persona: '每人', notte: '每晚', 'persona-notte': '每人每晚' },
    fiscale: { piva: '增值税号', cf: '税号', rea: 'REA', capitale: '注册资本', pec: '认证邮箱' }, titoloMail: '报价',
    titoloConferma: '预订确认', confermata: '✓ 预订已确认',
    terminiAccettati: (t, il) => `您已接受：${t}${il ? `（${il}）` : ''}。`, extraPrenotati: '已预订的增值服务',
    rifiutoTitolo: '支付失败', rifiutoTesto: (i, m) => `您预订的${i}付款未成功（${m}）。方案仍然有效：您可以使用同一张卡或其他卡重试。`, rifiutoPulsante: '重新支付', pagato: (c) => `已通过${c}支付`, saldo: '酒店现场待付余额',
    confTitolo: (c) => `${c}，您的选择非常好！`, confSottotitolo: (l, t) => `您正在接受方案 ${l}${t ? ` · ${t}` : ''}。需要为您的住宿添加其他服务吗？`,
    confNessunExtra: '此方案不含增值服务。', confSoggiorno: '住宿（含旅游税）',
    confLeggi: (t) => `阅读：${t}`, confAccetto: (t) => `我已阅读并接受：${t}`, confPulsante: (l) => `确认方案 ${l}`, confIndietro: '返回邮件',
  },
}

type Tr = Partial<Record<Exclude<Lingua, 'it'>, string>>
const t = (en: string, fr: string, de: string, es: string, zh: string): Tr => ({ en, fr, de, es, zh })

/** Frasario: testo standard in italiano → traduzioni. */
export const FRASI: Record<string, Tr> = {
  // Testi dei template pronti
  'Preventivo {codice}': t('Quote {codice}', 'Devis {codice}', 'Angebot {codice}', 'Presupuesto {codice}', '报价 {codice}'),
  'Proposte di soggiorno pensate per te': t('Stay options designed for you', 'Des séjours pensés pour vous', 'Aufenthaltsangebote für Sie', 'Propuestas de estancia pensadas para ti', '为您量身定制的住宿方案'),
  'Gentile {cliente},': t('Dear {cliente},', 'Cher/Chère {cliente},', 'Liebe/r {cliente},', 'Estimado/a {cliente}:', '尊敬的{cliente}：'),
  'grazie per averci contattato. Abbiamo preparato per te le soluzioni qui sotto: scegli quella che preferisci con il pulsante "Accetta" e ti confermeremo la prenotazione.': t(
    'thank you for contacting us. We have prepared the options below for you: choose the one you prefer with the "Accept" button and we will confirm your booking.',
    'merci de nous avoir contactés. Nous avons préparé pour vous les solutions ci-dessous : choisissez celle que vous préférez avec le bouton « Accepter » et nous confirmerons votre réservation.',
    'vielen Dank für Ihre Anfrage. Wir haben die folgenden Angebote für Sie vorbereitet: Wählen Sie Ihr bevorzugtes mit der Schaltfläche „Annehmen“ und wir bestätigen Ihre Buchung.',
    'gracias por contactarnos. Hemos preparado para ti las opciones que verás a continuación: elige la que prefieras con el botón «Aceptar» y te confirmaremos la reserva.',
    '感谢您的垂询。我们为您准备了以下方案：请点击“接受”按钮选择您喜欢的方案，我们将为您确认预订。'),
  'Restiamo a disposizione per qualsiasi richiesta.': t('We remain at your disposal for any request.', 'Nous restons à votre disposition pour toute demande.', 'Für Fragen stehen wir Ihnen gerne zur Verfügung.', 'Quedamos a tu disposición para cualquier consulta.', '如有任何需要，请随时与我们联系。'),
  'Lo staff di {struttura}': t('The {struttura} team', 'L\'équipe de {struttura}', 'Ihr Team von {struttura}', 'El equipo de {struttura}', '{struttura}团队'),
  'Offerta valida {validita} giorni dalla data di invio, salvo disponibilità al momento della conferma.\nLa tassa di soggiorno è dovuta per legge e si paga in struttura.': t(
    'Offer valid for {validita} days from the date of sending, subject to availability at the time of confirmation.\nThe city tax is required by law and is paid at the property.',
    'Offre valable {validita} jours à compter de la date d\'envoi, sous réserve de disponibilité au moment de la confirmation.\nLa taxe de séjour est due selon la loi et se règle sur place.',
    'Angebot gültig {validita} Tage ab Versanddatum, vorbehaltlich Verfügbarkeit zum Zeitpunkt der Bestätigung.\nDie Kurtaxe ist gesetzlich vorgeschrieben und wird vor Ort bezahlt.',
    'Oferta válida durante {validita} días desde la fecha de envío, sujeta a disponibilidad en el momento de la confirmación.\nLa tasa turística es obligatoria por ley y se abona en el establecimiento.',
    '本报价自发送之日起{validita}天内有效，以确认时的房态为准。\n城市旅游税为法定税费，于酒店现场支付。'),
  'Accetta la proposta {lettera}': t('Accept offer {lettera}', 'Accepter l\'offre {lettera}', 'Angebot {lettera} annehmen', 'Aceptar la propuesta {lettera}', '接受方案 {lettera}'),
  'Un soggiorno pensato per te': t('A stay designed for you', 'Un séjour pensé pour vous', 'Ein Aufenthalt nur für Sie', 'Una estancia pensada para ti', '为您打造的住宿体验'),
  'Con i migliori saluti,\nla Direzione di {struttura}': t('Kind regards,\nthe Management of {struttura}', 'Bien cordialement,\nla Direction de {struttura}', 'Mit freundlichen Grüßen\nIhre Direktion von {struttura}', 'Un cordial saludo,\nla Dirección de {struttura}', '此致敬礼\n{struttura}管理层'),
  'Le tue vacanze al mare iniziano qui': t('Your seaside holiday starts here', 'Vos vacances à la mer commencent ici', 'Ihr Urlaub am Meer beginnt hier', 'Tus vacaciones en el mar empiezan aquí', '您的海滨假期从这里开始'),
  'che bello sentirti! Ecco le proposte che abbiamo preparato per le tue vacanze: scegli quella che ti piace di più e pensiamo noi al resto.': t(
    'how lovely to hear from you! Here are the offers we have prepared for your holiday: pick your favourite and we will take care of the rest.',
    'quel plaisir d\'avoir de vos nouvelles ! Voici les offres que nous avons préparées pour vos vacances : choisissez celle qui vous plaît le plus, nous nous occupons du reste.',
    'wie schön, von Ihnen zu hören! Hier sind unsere Angebote für Ihren Urlaub: Wählen Sie Ihren Favoriten, um den Rest kümmern wir uns.',
    '¡qué alegría saber de ti! Aquí tienes las propuestas que hemos preparado para tus vacaciones: elige la que más te guste y nosotros nos ocupamos del resto.',
    '很高兴收到您的消息！以下是我们为您的假期准备的方案：选择您最喜欢的一个，其余的交给我们。'),
  'Preventivo di soggiorno': t('Stay quote', 'Devis de séjour', 'Aufenthaltsangebot', 'Presupuesto de estancia', '住宿报价'),
  'Spett.le {cliente},': t('Dear {cliente},', 'À l\'attention de {cliente},', 'Sehr geehrte Damen und Herren ({cliente}),', 'Estimados señores de {cliente}:', '尊敬的{cliente}：'),
  'facendo seguito alla Vostra richiesta, siamo lieti di sottoporVi le seguenti soluzioni di soggiorno. Per confermare è sufficiente il pulsante "Accetta" della proposta scelta.': t(
    'following your request, we are pleased to submit the following stay options. To confirm, simply use the "Accept" button of the chosen offer.',
    'suite à votre demande, nous avons le plaisir de vous soumettre les solutions de séjour suivantes. Pour confirmer, il suffit d\'utiliser le bouton « Accepter » de l\'offre choisie.',
    'bezugnehmend auf Ihre Anfrage unterbreiten wir Ihnen gerne die folgenden Aufenthaltsangebote. Zur Bestätigung genügt die Schaltfläche „Annehmen“ beim gewählten Angebot.',
    'en respuesta a su solicitud, nos complace presentarles las siguientes opciones de estancia. Para confirmar basta con el botón «Aceptar» de la propuesta elegida.',
    '根据贵方的需求，我们很高兴为您提供以下住宿方案。如需确认，只需点击所选方案的“接受”按钮。'),
  'Offerta commerciale · {soluzioni}': t('Commercial offer · {soluzioni}', 'Offre commerciale · {soluzioni}', 'Geschäftsangebot · {soluzioni}', 'Oferta comercial · {soluzioni}', '商务报价 · {soluzioni}'),
  'Hai ricevuto questa mail perché hai chiesto un preventivo a {struttura}. I tuoi dati sono trattati secondo l\'informativa privacy (Reg. UE 2016/679).': t(
    'You received this email because you requested a quote from {struttura}. Your data is processed according to our privacy policy (EU Reg. 2016/679).',
    'Vous recevez cet e-mail car vous avez demandé un devis à {struttura}. Vos données sont traitées conformément à notre politique de confidentialité (Règl. UE 2016/679).',
    'Sie erhalten diese E-Mail, weil Sie ein Angebot bei {struttura} angefragt haben. Ihre Daten werden gemäß unserer Datenschutzerklärung verarbeitet (EU-VO 2016/679).',
    'Has recibido este correo porque solicitaste un presupuesto a {struttura}. Tus datos se tratan según nuestra política de privacidad (Reg. UE 2016/679).',
    '您收到此邮件是因为您向{struttura}索取了报价。您的数据将依据我们的隐私政策处理（欧盟第2016/679号条例）。'),

  // Mail di conferma
  'Prenotazione confermata': t('Booking confirmed', 'Réservation confirmée', 'Buchung bestätigt', 'Reserva confirmada', '预订已确认'),
  'Conferma prenotazione': t('Booking confirmation', 'Confirmation de réservation', 'Buchungsbestätigung', 'Confirmación de reserva', '预订确认'),
  'siamo felici di confermare la tua prenotazione. Qui sotto trovi il riepilogo del soggiorno: conservalo, ti servirà all\'arrivo.': t(
    'we are happy to confirm your booking. Below you will find a summary of your stay: please keep it, you will need it on arrival.',
    'nous avons le plaisir de confirmer votre réservation. Vous trouverez ci-dessous le récapitulatif de votre séjour : conservez-le, il vous sera utile à l\'arrivée.',
    'wir freuen uns, Ihre Buchung zu bestätigen. Unten finden Sie die Übersicht Ihres Aufenthalts: Bitte bewahren Sie sie für die Anreise auf.',
    'nos alegra confirmar tu reserva. A continuación encontrarás el resumen de tu estancia: consérvalo, lo necesitarás a la llegada.',
    '我们很高兴确认您的预订。以下是您的住宿摘要，请妥善保存，入住时可能需要。'),
  'Il check-in è dalle ore 14:00, il check-out entro le ore 11:00.\nPer qualsiasi esigenza rispondi pure a questa mail.': t(
    'Check-in is from 2 pm, check-out by 11 am.\nFor any need, simply reply to this email.',
    'L\'arrivée se fait à partir de 14 h, le départ avant 11 h.\nPour toute demande, répondez simplement à cet e-mail.',
    'Check-in ab 14:00 Uhr, Check-out bis 11:00 Uhr.\nBei Fragen antworten Sie einfach auf diese E-Mail.',
    'El check-in es a partir de las 14:00 y el check-out antes de las 11:00.\nPara cualquier necesidad, responde a este correo.',
    '入住时间为14:00起，退房时间为11:00前。\n如有任何需要，请直接回复此邮件。'),
  'Ti aspettiamo!': t('We look forward to welcoming you!', 'Nous avons hâte de vous accueillir !', 'Wir freuen uns auf Sie!', '¡Te esperamos!', '期待您的光临！'),

  // Tipologie di camera
  'Singola Classic': t('Classic Single', 'Single Classique', 'Einzelzimmer Classic', 'Individual Classic', '经典单人房'),
  'DUS': t('Double for single use', 'Double à usage individuel', 'Doppelzimmer zur Einzelnutzung', 'Doble de uso individual', '双人房单人入住'),
  'Doppia Classic': t('Classic Double', 'Double Classique', 'Doppelzimmer Classic', 'Doble Classic', '经典双人房'),
  'Twin Classic': t('Classic Twin', 'Twin Classique', 'Zweibettzimmer Classic', 'Twin Classic', '经典双床房'),
  'Matrimoniale Deluxe': t('Deluxe Double', 'Double Deluxe', 'Doppelzimmer Deluxe', 'Matrimonial Deluxe', '豪华大床房'),
  'Camera accessibile': t('Accessible room', 'Chambre accessible', 'Barrierefreies Zimmer', 'Habitación accesible', '无障碍客房'),
  'Tripla Classic': t('Classic Triple', 'Triple Classique', 'Dreibettzimmer Classic', 'Triple Classic', '经典三人房'),
  'Tripla con letto aggiunto': t('Triple with extra bed', 'Triple avec lit d\'appoint', 'Dreibettzimmer mit Zustellbett', 'Triple con cama supletoria', '三人房加床'),
  'Quadrupla': t('Quadruple', 'Quadruple', 'Vierbettzimmer', 'Cuádruple', '四人房'),
  'Family': t('Family room', 'Chambre familiale', 'Familienzimmer', 'Familiar', '家庭房'),
  'Suite': t('Suite', 'Suite', 'Suite', 'Suite', '套房'),
  'Letto singolo, scrivania e bagno privato con doccia: essenziale e silenziosa.': t('Single bed, desk and private bathroom with shower: simple and quiet.', 'Lit simple, bureau et salle de bain privée avec douche : essentielle et calme.', 'Einzelbett, Schreibtisch und eigenes Bad mit Dusche: schlicht und ruhig.', 'Cama individual, escritorio y baño privado con ducha: sencilla y tranquila.', '单人床、书桌及带淋浴的独立卫浴：简约安静。'),
  'Camera doppia a uso singola: letto matrimoniale e tutto lo spazio per te.': t('Double room for single use: double bed and all the space to yourself.', 'Chambre double à usage individuel : lit double et tout l\'espace pour vous.', 'Doppelzimmer zur Einzelnutzung: Doppelbett und viel Platz für Sie allein.', 'Habitación doble de uso individual: cama de matrimonio y todo el espacio para ti.', '双人房单人入住：大床，空间尽享。'),
  'Letto matrimoniale, spaziosa e accogliente: perfetta per le coppie.': t('Double bed, spacious and welcoming: perfect for couples.', 'Lit double, spacieuse et accueillante : parfaite pour les couples.', 'Doppelbett, geräumig und gemütlich: ideal für Paare.', 'Cama de matrimonio, amplia y acogedora: perfecta para parejas.', '大床，宽敞舒适：情侣首选。'),
  'Due letti singoli separati, ideale per amici o colleghi.': t('Two separate single beds, ideal for friends or colleagues.', 'Deux lits simples séparés, idéale entre amis ou collègues.', 'Zwei getrennte Einzelbetten, ideal für Freunde oder Kollegen.', 'Dos camas individuales separadas, ideal para amigos o compañeros.', '两张独立单人床，适合朋友或同事。'),
  'Letto king size, area relax e set di cortesia premium.': t('King-size bed, lounge area and premium toiletries.', 'Lit king size, coin détente et produits d\'accueil premium.', 'Kingsize-Bett, Sitzecke und Premium-Pflegeprodukte.', 'Cama king size, zona de descanso y amenities premium.', '特大床、休闲区及高级洗浴用品。'),
  'Spazi di manovra, maniglioni di sostegno e bagno senza barriere.': t('Wide manoeuvring space, grab bars and step-free bathroom.', 'Espaces de manœuvre, barres d\'appui et salle de bain sans obstacles.', 'Bewegungsflächen, Haltegriffe und barrierefreies Bad.', 'Espacio de maniobra, barras de apoyo y baño sin barreras.', '宽敞通道、扶手及无障碍卫浴。'),
  'Letto matrimoniale più un singolo, ideale per tre ospiti.': t('A double plus a single bed, ideal for three guests.', 'Un lit double et un lit simple, idéale pour trois personnes.', 'Doppelbett plus Einzelbett, ideal für drei Gäste.', 'Cama de matrimonio más una individual, ideal para tres huéspedes.', '一张大床加一张单人床，适合三位宾客。'),
  'Tre posti letto più una brandina: per gruppi e famiglie numerose.': t('Three beds plus a folding bed: for groups and large families.', 'Trois couchages plus un lit d\'appoint : pour groupes et familles nombreuses.', 'Drei Schlafplätze plus Klappbett: für Gruppen und große Familien.', 'Tres camas más una supletoria: para grupos y familias numerosas.', '三张床位加一张折叠床：适合团体和大家庭。'),
  'Due letti matrimoniali, fino a quattro ospiti.': t('Two double beds, up to four guests.', 'Deux lits doubles, jusqu\'à quatre personnes.', 'Zwei Doppelbetten, bis zu vier Gäste.', 'Dos camas de matrimonio, hasta cuatro huéspedes.', '两张大床，最多入住四人。'),
  'Matrimoniale e letto a castello: spaziosa e versatile per le famiglie.': t('Double bed and bunk bed: spacious and versatile for families.', 'Lit double et lits superposés : spacieuse et polyvalente pour les familles.', 'Doppelbett und Etagenbett: geräumig und vielseitig für Familien.', 'Cama de matrimonio y litera: amplia y versátil para familias.', '大床加上下铺：宽敞灵活，适合家庭。'),
  'Camera da letto e soggiorno separati, vista panoramica e servizio dedicato.': t('Separate bedroom and living room, panoramic view and dedicated service.', 'Chambre et salon séparés, vue panoramique et service dédié.', 'Getrenntes Schlaf- und Wohnzimmer, Panoramablick und persönlicher Service.', 'Dormitorio y salón separados, vistas panorámicas y servicio dedicado.', '独立卧室与客厅，全景视野及专属服务。'),

  // Trattamenti
  'Solo pernottamento': t('Room only', 'Logement seul', 'Nur Übernachtung', 'Solo alojamiento', '仅住宿'),
  'Pernottamento e colazione': t('Bed & breakfast', 'Chambre et petit-déjeuner', 'Übernachtung mit Frühstück', 'Alojamiento y desayuno', '含早餐'),
  'Mezza pensione': t('Half board', 'Demi-pension', 'Halbpension', 'Media pensión', '半膳（早晚餐）'),
  'Pensione completa': t('Full board', 'Pension complète', 'Vollpension', 'Pensión completa', '全膳（三餐）'),

  // Servizi inclusi
  'Wi-Fi': t('Wi-Fi', 'Wi-Fi', 'WLAN', 'Wi-Fi', '无线网络'),
  'Parcheggio': t('Parking', 'Parking', 'Parkplatz', 'Aparcamiento', '停车'),
  'Accesso spa': t('Spa access', 'Accès au spa', 'Spa-Zugang', 'Acceso al spa', '水疗中心使用'),
  'Transfer aeroporto': t('Airport transfer', 'Transfert aéroport', 'Flughafentransfer', 'Traslado al aeropuerto', '机场接送'),
  'Late check-out': t('Late check-out', 'Départ tardif', 'Später Check-out', 'Salida tardía', '延迟退房'),
  'Welcome drink': t('Welcome drink', 'Cocktail de bienvenue', 'Begrüßungsgetränk', 'Bebida de bienvenida', '欢迎饮品'),
  'Culla': t('Baby cot', 'Lit bébé', 'Babybett', 'Cuna', '婴儿床'),
  'Animali ammessi': t('Pets allowed', 'Animaux admis', 'Haustiere erlaubt', 'Se admiten mascotas', '可携带宠物'),
  'Palestra': t('Gym', 'Salle de sport', 'Fitnessraum', 'Gimnasio', '健身房'),

  // Servizi aggiuntivi della struttura
  'Transfer aeroporto (a/r)': t('Airport transfer (return)', 'Transfert aéroport (aller-retour)', 'Flughafentransfer (hin und zurück)', 'Traslado al aeropuerto (ida y vuelta)', '机场往返接送'),
  'Parcheggio custodito': t('Supervised parking', 'Parking surveillé', 'Bewachter Parkplatz', 'Aparcamiento vigilado', '有人看管停车场'),
  'Percorso spa': t('Spa circuit', 'Parcours spa', 'Spa-Rundgang', 'Circuito spa', '水疗套餐'),
  'Massaggio rilassante 50 min': t('Relaxing massage 50 min', 'Massage relaxant 50 min', 'Entspannungsmassage 50 Min.', 'Masaje relajante 50 min', '50分钟放松按摩'),
  'Cena romantica': t('Romantic dinner', 'Dîner romantique', 'Romantisches Abendessen', 'Cena romántica', '浪漫晚餐'),
  'Colazione in camera': t('Breakfast in the room', 'Petit-déjeuner en chambre', 'Frühstück auf dem Zimmer', 'Desayuno en la habitación', '客房早餐'),
  'Late check-out (ore 16)': t('Late check-out (4 pm)', 'Départ tardif (16 h)', 'Später Check-out (16 Uhr)', 'Salida tardía (16:00)', '延迟退房（16:00）'),
  'Escursione guidata': t('Guided excursion', 'Excursion guidée', 'Geführter Ausflug', 'Excursión guiada', '导览游'),
  'Bottiglia di prosecco in camera': t('Bottle of prosecco in the room', 'Bouteille de prosecco en chambre', 'Flasche Prosecco auf dem Zimmer', 'Botella de prosecco en la habitación', '客房普罗塞克起泡酒一瓶'),
  'Noleggio biciclette': t('Bike hire', 'Location de vélos', 'Fahrradverleih', 'Alquiler de bicicletas', '自行车租赁'),
  'Ombrellone e lettini in spiaggia': t('Beach umbrella and sunbeds', 'Parasol et transats à la plage', 'Sonnenschirm und Liegen am Strand', 'Sombrilla y tumbonas en la playa', '海滩遮阳伞及躺椅'),
  'Cenone di Capodanno': t('New Year\'s Eve dinner', 'Réveillon du Nouvel An', 'Silvester-Gala-Dinner', 'Cena de Nochevieja', '跨年晚宴'),

  // Titoli d'esempio delle proposte
  'Weekend per due': t('Weekend for two', 'Week-end à deux', 'Wochenende zu zweit', 'Fin de semana para dos', '双人周末'),
  'Famiglia': t('Family', 'Famille', 'Familie', 'Familia', '家庭'),

  // Termini e condizioni pronti
  'Condizioni generali di soggiorno': t('General terms of stay', 'Conditions générales de séjour', 'Allgemeine Aufenthaltsbedingungen', 'Condiciones generales de estancia', '住宿一般条款'),
  'Condizioni per gruppi e aziende': t('Terms for groups and companies', 'Conditions pour groupes et entreprises', 'Bedingungen für Gruppen und Firmen', 'Condiciones para grupos y empresas', '团体及企业条款'),
  'Prenotazione e caparra': t('Booking and deposit', 'Réservation et acompte', 'Buchung und Anzahlung', 'Reserva y depósito', '预订与订金'),
  'La prenotazione è confermata al ricevimento della caparra del 30% del totale del soggiorno, da versare entro 3 giorni dall\'accettazione della proposta. Il saldo si paga all\'arrivo o alla partenza.': t(
    'The booking is confirmed on receipt of a 30% deposit of the total stay, to be paid within 3 days of accepting the offer. The balance is paid on arrival or departure.',
    'La réservation est confirmée à réception d\'un acompte de 30 % du total du séjour, à verser dans les 3 jours suivant l\'acceptation de l\'offre. Le solde se règle à l\'arrivée ou au départ.',
    'Die Buchung ist mit Eingang einer Anzahlung von 30 % des Gesamtbetrags bestätigt, zahlbar innerhalb von 3 Tagen nach Annahme des Angebots. Der Restbetrag wird bei Anreise oder Abreise bezahlt.',
    'La reserva se confirma al recibir un depósito del 30 % del total de la estancia, a abonar en los 3 días siguientes a la aceptación de la propuesta. El resto se paga a la llegada o a la salida.',
    '收到住宿总价30%的订金后预订即确认，订金须在接受方案后3天内支付。余款于入住或退房时支付。'),
  'Cancellazione': t('Cancellation', 'Annulation', 'Stornierung', 'Cancelación', '取消政策'),
  'Cancellazione gratuita fino a 14 giorni prima dell\'arrivo. Da 13 a 3 giorni prima viene trattenuta la caparra; nei 2 giorni precedenti l\'arrivo o in caso di mancato arrivo è dovuto l\'intero importo del soggiorno.': t(
    'Free cancellation up to 14 days before arrival. From 13 to 3 days before, the deposit is retained; within 2 days of arrival or in case of no-show, the full amount of the stay is due.',
    'Annulation gratuite jusqu\'à 14 jours avant l\'arrivée. De 13 à 3 jours avant, l\'acompte est conservé ; dans les 2 jours précédant l\'arrivée ou en cas de non-présentation, la totalité du séjour est due.',
    'Kostenlose Stornierung bis 14 Tage vor Anreise. Von 13 bis 3 Tagen vorher wird die Anzahlung einbehalten; in den 2 Tagen vor Anreise oder bei Nichterscheinen ist der volle Betrag fällig.',
    'Cancelación gratuita hasta 14 días antes de la llegada. De 13 a 3 días antes se retiene el depósito; en los 2 días previos a la llegada o en caso de no presentarse se cobra el importe total de la estancia.',
    '抵达前14天可免费取消。抵达前13至3天取消将扣除订金；抵达前2天内取消或未入住，须支付全部住宿费用。'),
  'Arrivo e partenza': t('Arrival and departure', 'Arrivée et départ', 'An- und Abreise', 'Llegada y salida', '入住与退房'),
  'Le camere sono disponibili dalle ore 14:00 del giorno di arrivo e vanno lasciate entro le ore 11:00 del giorno di partenza. La partenza anticipata non dà diritto a rimborsi.': t(
    'Rooms are available from 2 pm on the day of arrival and must be vacated by 11 am on the day of departure. Early departure does not entitle you to a refund.',
    'Les chambres sont disponibles à partir de 14 h le jour de l\'arrivée et doivent être libérées avant 11 h le jour du départ. Un départ anticipé ne donne droit à aucun remboursement.',
    'Die Zimmer stehen ab 14:00 Uhr am Anreisetag zur Verfügung und sind am Abreisetag bis 11:00 Uhr zu räumen. Eine vorzeitige Abreise berechtigt nicht zur Erstattung.',
    'Las habitaciones están disponibles desde las 14:00 del día de llegada y deben dejarse antes de las 11:00 del día de salida. La salida anticipada no da derecho a reembolso.',
    '客房于入住当天14:00起可用，退房当天须于11:00前离开。提前离店不予退款。'),
  'Tassa di soggiorno': t('City tax', 'Taxe de séjour', 'Kurtaxe', 'Tasa turística', '城市旅游税'),
  'La tassa di soggiorno è dovuta per legge secondo il regolamento comunale e si paga in struttura; non è compresa nella caparra.': t(
    'The city tax is required by law under municipal regulations and is paid at the property; it is not included in the deposit.',
    'La taxe de séjour est due selon le règlement municipal et se règle sur place ; elle n\'est pas comprise dans l\'acompte.',
    'Die Kurtaxe ist nach kommunaler Satzung gesetzlich vorgeschrieben und wird vor Ort bezahlt; sie ist nicht in der Anzahlung enthalten.',
    'La tasa turística es obligatoria según la normativa municipal y se abona en el establecimiento; no está incluida en el depósito.',
    '城市旅游税依市政法规征收，于酒店现场支付，不包含在订金内。'),
  'Dati personali': t('Personal data', 'Données personnelles', 'Personenbezogene Daten', 'Datos personales', '个人数据'),
  'I dati forniti sono trattati per gestire la prenotazione e gli obblighi di legge (comunicazione alloggiati), secondo il Regolamento UE 2016/679.': t(
    'The data provided is processed to manage the booking and legal obligations (guest registration), in accordance with EU Regulation 2016/679.',
    'Les données fournies sont traitées pour gérer la réservation et les obligations légales (déclaration des hébergés), conformément au Règlement UE 2016/679.',
    'Die angegebenen Daten werden zur Abwicklung der Buchung und gesetzlicher Pflichten (Gästemeldung) gemäß EU-Verordnung 2016/679 verarbeitet.',
    'Los datos facilitados se tratan para gestionar la reserva y las obligaciones legales (registro de huéspedes), conforme al Reglamento UE 2016/679.',
    '所提供的数据将依据欧盟第2016/679号条例，用于处理预订及履行法定义务（住客登记）。'),
  'Conferma e rooming list': t('Confirmation and rooming list', 'Confirmation et rooming list', 'Bestätigung und Rooming-Liste', 'Confirmación y rooming list', '确认与分房名单'),
  'La conferma è vincolante alla firma della proposta e al versamento dell\'acconto del 40%. La rooming list definitiva va inviata almeno 10 giorni prima dell\'arrivo.': t(
    'Confirmation is binding upon signing the offer and paying a 40% advance. The final rooming list must be sent at least 10 days before arrival.',
    'La confirmation devient ferme à la signature de l\'offre et au versement d\'un acompte de 40 %. La rooming list définitive doit être envoyée au moins 10 jours avant l\'arrivée.',
    'Die Bestätigung ist mit Unterzeichnung des Angebots und Zahlung einer Anzahlung von 40 % verbindlich. Die endgültige Rooming-Liste ist spätestens 10 Tage vor Anreise zu senden.',
    'La confirmación es vinculante con la firma de la propuesta y el pago de un anticipo del 40 %. La rooming list definitiva debe enviarse al menos 10 días antes de la llegada.',
    '签署方案并支付40%预付款后确认即具约束力。最终分房名单须在抵达前至少10天发送。'),
  'Riduzioni e release': t('Reductions and release', 'Réductions et release', 'Reduzierungen und Release', 'Reducciones y release', '减房与释放'),
  'Fino a 30 giorni prima dell\'arrivo si può ridurre il numero di camere del 10% senza penali; oltre, le camere non utilizzate sono addebitate per intero.': t(
    'Up to 30 days before arrival the number of rooms can be reduced by 10% without penalty; after that, unused rooms are charged in full.',
    'Jusqu\'à 30 jours avant l\'arrivée, le nombre de chambres peut être réduit de 10 % sans pénalité ; au-delà, les chambres non utilisées sont facturées en totalité.',
    'Bis 30 Tage vor Anreise kann die Zimmerzahl um 10 % ohne Gebühren reduziert werden; danach werden nicht genutzte Zimmer voll berechnet.',
    'Hasta 30 días antes de la llegada se puede reducir el número de habitaciones un 10 % sin penalización; después, las habitaciones no utilizadas se cobran íntegramente.',
    '抵达前30天内可免费减少10%的房间；此后未使用的房间将全额收费。'),
  'Pagamento': t('Payment', 'Paiement', 'Zahlung', 'Pago', '付款'),
  'Il saldo avviene con bonifico bancario entro la data di arrivo oppure secondo gli accordi di fatturazione indicati nel contratto.': t(
    'The balance is paid by bank transfer by the arrival date or according to the billing terms set out in the contract.',
    'Le solde est réglé par virement bancaire avant la date d\'arrivée ou selon les conditions de facturation prévues au contrat.',
    'Der Restbetrag wird per Banküberweisung bis zum Anreisetag oder gemäß den vertraglichen Abrechnungsvereinbarungen bezahlt.',
    'El saldo se abona mediante transferencia bancaria antes de la fecha de llegada o según las condiciones de facturación del contrato.',
    '余款须于抵达日前以银行转账支付，或按合同约定的结算方式支付。'),
  'Responsabilità': t('Liability', 'Responsabilité', 'Haftung', 'Responsabilidad', '责任'),
  'Il gruppo risponde di eventuali danni arrecati alle camere e agli spazi comuni durante il soggiorno.': t(
    'The group is liable for any damage caused to rooms and common areas during the stay.',
    'Le groupe est responsable des éventuels dommages causés aux chambres et aux parties communes pendant le séjour.',
    'Die Gruppe haftet für Schäden an Zimmern und Gemeinschaftsflächen während des Aufenthalts.',
    'El grupo responde de los posibles daños causados a las habitaciones y zonas comunes durante la estancia.',
    '团体须对住宿期间客房及公共区域的任何损坏负责。'),
}

/** Testo italiano nella lingua: dal frasario, altrimenti resta com'è. */
export function tr(lingua: Lingua, s: string): string {
  if (lingua === 'it' || !s) return s
  return FRASI[s.trim()]?.[lingua] ?? s
}

/** Il frasario conosce il testo (quindi è tradotto in automatico)? */
export const traducibile = (s: string) => !s.trim() || s.trim() in FRASI
