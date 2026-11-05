import React, { useMemo, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { TextareaField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useRegistroPresenzeStore, type TrasmissioneConsuntivo } from '../../../store/useRegistroPresenzeStore'
import { codiceDipendentePaghe, integrazioneValida, useHrConfigStore } from '../../../store/useHrConfigStore'
import { CANALI_PAGHE, FORMATO_RILPRE_RP, nomeSoftwarePaghe } from '../../../store/pagheCatalogo'
import { generaRilpre, LUNGHEZZA_RECORD, NOME_FILE_RILPRE, rilpreBase64, scaricaRilpre } from '../../hr/_presenze/rilpre'
import { inviaConsuntivoPaghe, parametriPubblici } from '../../../services/pagheConnettore'
import { chiaveGiorno, fmtExtra, giorniDelMese, MESI_LUNGHI, oreDecimali, totaliMese, type GiornataRegistro } from '../../hr/_presenze/presenze.model'
import './TrasmettiConsuntivo.sass'

/**
 * Trasmetti consuntivo — invia al software paghe il consuntivo del mese di
 * tutto il personale: ore ordinarie, straordinario, ferie, permessi e ROL,
 * malattia e assenze, giorno per giorno (tracciato presenze). Prima dell'invio
 * mostra il riepilogo e avvisa se ci sono timbrature anomale ancora da
 * correggere; ogni trasmissione resta nello storico del mese.
 * L'invio vero al software paghe è a carico del backend (connettore paghe).
 */

interface Dip { id: number; nome: string; cognome: string; reparto: string }

interface Props {
  open: boolean
  onClose: () => void
  dipendenti: Dip[]
  anno: number
  /** Mese 0-based. */
  mese: number
  giornata: (dipId: number, iso: string) => GiornataRegistro
  /** Apre la vista dettagliata del mese per correggere le anomalie. */
  onCorreggi: () => void
  /** Apre Configurazione HR › Integrazione paghe. */
  onConfigura: () => void
}

const fmtAt = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} alle ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function TrasmettiConsuntivo({ open, onClose, dipendenti, anno, mese, giornata, onCorreggi, onConfigura }: Props) {
  const salvata = useHrConfigStore((s) => s.integrazionePaghe)
  const integrazione = useMemo(() => integrazioneValida(salvata), [salvata])
  const approvato = useRegistroPresenzeStore((s) => s.straordinarioApprovato)
  const trasmissioni = useRegistroPresenzeStore((s) => s.trasmissioni)
  const registra = useRegistroPresenzeStore((s) => s.registraTrasmissione)
  const inUso = integrazione.inUso
  const profilo = inUso ? integrazione.profili[inUso] : undefined
  const software = inUso ? nomeSoftwarePaghe(inUso) : ''
  const destinazione = !profilo ? '' : profilo.canale === 'email'
    ? `email a ${profilo.valori.emailConsulente || 'consulente'}`
    : profilo.canale === 'sftp' ? `file su ${profilo.valori.sftpHost || 'SFTP'}` : 'collegamento diretto'
  const [note, setNote] = useState('')
  const [invio, setInvio] = useState(false)

  const chiaveMese = `${anno}-${String(mese + 1).padStart(2, '0')}`
  const nomeMese = `${MESI_LUNGHI[mese]} ${anno}`
  const precedenti = trasmissioni.filter((t) => t.mese === chiaveMese)

  // Riepilogo di tutto il personale (non solo dei filtri a video).
  const riepilogo = useMemo(() => {
    if (!open) return null
    const righe = dipendenti.map((d) => {
      const giorni = giorniDelMese(anno, mese, (iso) => giornata(d.id, iso))
      return { d, t: totaliMese(giorni) }
    })
    const somma = (f: (x: typeof righe[number]) => number) => righe.reduce((s, x) => s + f(x), 0)
    return {
      righe,
      oreOrdinarie: somma((x) => x.t.ore.Ordinarie.ore),
      // Con «solo straordinario approvato» contano i minuti approvati in Cedolini.
      oreStraordinario: integrazione.soloStraordinarioApprovato
        ? righe.reduce((s, x) => s + Object.entries(approvato).filter(([k]) => k.startsWith(`${x.d.id}|${chiaveMese}`)).reduce((t, [, m]) => t + m, 0), 0) / 60
        : somma((x) => x.t.ore.Straordinario.ore),
      giorniFerie: somma((x) => x.t.ferie),
      orePermessi: somma((x) => x.t.ore.Permessi.ore),
      giorniMalattia: somma((x) => x.t.malattia),
      assenze: somma((x) => x.t.assenze),
      anomalie: somma((x) => x.t.anomalie),
      conAnomalie: righe.filter((x) => x.t.anomalie > 0),
      // Minuti oltre l'orario rimasti sotto la soglia dello straordinario.
      extra: Math.max(0, Math.round(somma((x) => x.t.straordinari - x.t.ore.Straordinario.ore * 60))),
    }
  }, [open, dipendenti, anno, mese, giornata, integrazione.soloStraordinarioApprovato, approvato, chiaveMese])

  // TeamSystem: il consuntivo viaggia nel tracciato RILPRE (record fisso da 1707 caratteri per dipendente).
  const rilpre = useMemo(() => {
    if (!open || inUso !== 'teamsystem' || !profilo) return null
    return generaRilpre({
      anno, mese, dipendenti, giornata,
      codiceAzienda: profilo.valori.codiceAzienda ?? '', codiceFiliale: profilo.valori.codiceFiliale ?? '',
      codiceDipendente: (id) => codiceDipendentePaghe(profilo, id),
      codici: profilo.voci, variante: profilo.formato === FORMATO_RILPRE_RP ? 'rp' : 'standard', sommaOrdinario: profilo.sommaOrdinario,
    })
  }, [open, inUso, profilo, anno, mese, dipendenti, giornata])
  const nomeFile = `${NOME_FILE_RILPRE}`
  const bloccato = (!!riepilogo && integrazione.bloccaConAnomalie && riepilogo.anomalie > 0) || !!rilpre?.errori.length
  const meseInCorso = (() => { const o = new Date(); return o.getFullYear() === anno && o.getMonth() === mese })()

  async function trasmetti() {
    if (!riepilogo || !inUso || bloccato) return
    if (!profilo) return
    setInvio(true)
    const r1 = (n: number) => Math.round(n * 10) / 10
    let esito
    try {
      esito = await inviaConsuntivoPaghe({
        software: inUso, canale: profilo.canale, mese: chiaveMese, formato: profilo.formato,
        parametri: parametriPubblici(profilo.valori),
        file: rilpre ? { nome: nomeFile, base64: rilpreBase64(rilpre.testo), record: rilpre.record, lunghezzaRecord: LUNGHEZZA_RECORD } : undefined,
        riepilogo: {
          dipendenti: riepilogo.righe.length, oreOrdinarie: r1(riepilogo.oreOrdinarie), oreStraordinario: r1(riepilogo.oreStraordinario),
          giorniFerie: riepilogo.giorniFerie, orePermessi: r1(riepilogo.orePermessi), giorniMalattia: riepilogo.giorniMalattia, anomalie: riepilogo.anomalie,
        },
        note: note.trim() || undefined,
      })
    } catch {
      setInvio(false)
      toast.error(`${software} ha rifiutato il consuntivo: controlla il collegamento in Configurazione HR › Integrazione paghe e riprova.`, 'Invio non riuscito')
      return
    }
    const voce: Omit<TrasmissioneConsuntivo, 'id' | 'at' | 'autore'> = {
      mese: chiaveMese, software, dipendenti: riepilogo.righe.length,
      oreOrdinarie: r1(riepilogo.oreOrdinarie), oreStraordinario: r1(riepilogo.oreStraordinario),
      giorniFerie: riepilogo.giorniFerie, orePermessi: r1(riepilogo.orePermessi), giorniMalattia: riepilogo.giorniMalattia,
      anomalie: riepilogo.anomalie, note: note.trim() || undefined,
      esito: esito.esito, protocollo: esito.protocollo,
      file: rilpre ? { nome: nomeFile, record: rilpre.record } : undefined,
    }
    registra(voce)
    setInvio(false)
    setNote('')
    if (esito.esito === 'inviato') {
      toast.success(`Consuntivo di ${nomeMese} di ${voce.dipendenti} dipendenti inviato a ${software}${esito.protocollo ? ` (protocollo ${esito.protocollo})` : ''}.`, precedenti.length ? 'Consuntivo ritrasmesso' : 'Consuntivo trasmesso')
    } else {
      toast.info(`${esito.messaggio}${rilpre ? ' Usa «Scarica RILPRE» per consegnarlo a mano.' : ''}`, 'Invio simulato')
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={() => !invio && onClose()} title={`Trasmetti consuntivo — ${nomeMese}`} size="lg">
      {riepilogo && (
        <div className="tcs">
          <p className="tcs__lead">
            Il consuntivo del mese di tutto il personale arriva al software paghe per l'elaborazione dei cedolini, giorno per giorno:
            presenze, straordinario, ferie, permessi e ROL, malattia e assenze.
          </p>

          {inUso && profilo ? (
            <div className="tcs__dest">
              <i className={`fa-solid ${CANALI_PAGHE[profilo.canale].icon}`} aria-hidden="true" />
              <span>Destinazione: <b>{software}</b> · {destinazione}{profilo.canale !== 'api' ? ` · ${profilo.formato}` : ''}</span>
              <button type="button" className="tcs__link" onClick={() => { onClose(); onConfigura() }}>Cambia</button>
            </div>
          ) : (
            <div className="tcs__warn tcs__warn--ko">
              <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />
              <div>Nessun software paghe collegato.<button type="button" className="tcs__link" onClick={() => { onClose(); onConfigura() }}>Configura l'integrazione paghe</button></div>
            </div>
          )}

          {rilpre && (
            <div className={`tcs__file${rilpre.errori.length ? ' tcs__file--ko' : ''}`}>
              <i className="fa-solid fa-file-code" aria-hidden="true" />
              <div className="tcs__file-txt">
                <span>File <b>{nomeFile}</b> · tracciato {profilo?.formato === FORMATO_RILPRE_RP ? 'RP / Teamtime' : 'standard'} · {rilpre.record} record da {LUNGHEZZA_RECORD} caratteri</span>
                {rilpre.errori.length > 0 && (
                  <ul className="tcs__file-err">{rilpre.errori.slice(0, 4).map((e) => <li key={e}>{e}</li>)}{rilpre.errori.length > 4 && <li>…e altri {rilpre.errori.length - 4}</li>}</ul>
                )}
                {rilpre.avvisi.length > 0 && <span className="tcs__file-avv">{rilpre.avvisi[0]}</span>}
              </div>
              <button type="button" className="sib-btn sib-btn--secondary tcs__file-btn" onClick={() => scaricaRilpre(rilpre.testo)} disabled={!!rilpre.errori.length}>
                <i className="fa-solid fa-download" aria-hidden="true" />Scarica RILPRE
              </button>
            </div>
          )}

          <dl className="tcs__sum">
            <div><dt>Dipendenti</dt><dd>{riepilogo.righe.length}</dd></div>
            <div><dt>Ore ordinarie</dt><dd>{oreDecimali(riepilogo.oreOrdinarie * 60)}</dd></div>
            <div><dt>{integrazione.soloStraordinarioApprovato ? 'Straord. approvato' : 'Straordinario'}</dt><dd>{oreDecimali(riepilogo.oreStraordinario * 60)}</dd></div>
            <div><dt>Ferie</dt><dd>{riepilogo.giorniFerie} gg</dd></div>
            <div><dt>Permessi e ROL</dt><dd>{oreDecimali(riepilogo.orePermessi * 60)}</dd></div>
            <div><dt>Malattia</dt><dd>{riepilogo.giorniMalattia} gg</dd></div>
          </dl>
          {riepilogo.assenze > 0 && (
            <p className="tcs__note"><i className="fa-solid fa-circle-info" aria-hidden="true" />{riepilogo.assenze} {riepilogo.assenze === 1 ? 'giornata di assenza' : 'giornate di assenza'} senza giustifica: arriveranno al software paghe come assenze ingiustificate.</p>
          )}
          {riepilogo.extra > 0 && (
            <p className="tcs__note"><i className="fa-solid fa-circle-info" aria-hidden="true" />Ore extra sotto la mezz'ora ({fmtExtra(riepilogo.extra)} timbrate in tutto) non entrano nello straordinario.</p>
          )}

          {meseInCorso && (
            <p className="tcs__warn"><i className="fa-solid fa-calendar-xmark" aria-hidden="true" />Il mese non è ancora chiuso: verranno trasmesse le presenze fino a oggi. A fine mese ritrasmetti il consuntivo completo.</p>
          )}
          {riepilogo.anomalie > 0 && (
            <div className="tcs__warn tcs__warn--ko">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <div>
                <b>{riepilogo.anomalie} {riepilogo.anomalie === 1 ? 'timbratura anomala' : 'timbrature anomale'}</b> da correggere
                ({riepilogo.conAnomalie.map((x) => `${x.d.nome} ${x.d.cognome}`).join(', ')}): {bloccato ? "l'invio è bloccato finché non le correggi (regola dell'integrazione paghe)." : 'quelle giornate verranno trasmesse senza le ore lavorate.'}
                <button type="button" className="tcs__link" onClick={() => { onClose(); onCorreggi() }}>Correggi nel registro</button>
              </div>
            </div>
          )}

          <TextareaField name="note" label="Note per il consulente (opzionale)" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Es. anticipo TFR, variazione IBAN da comunicare…" />

          {precedenti.length > 0 && (
            <div className="tcs__storico">
              <span className="tcs__storico-title">Già trasmesso</span>
              {precedenti.slice(0, 3).map((t) => (
                <span key={t.id} className="tcs__storico-row">
                  <i className={`fa-solid ${t.esito === 'simulato' ? 'fa-flask' : 'fa-circle-check'}`} aria-hidden="true" />
                  {fmtAt(t.at)} a {t.software} da {t.autore} · {t.dipendenti} dipendenti{t.file ? ` · ${t.file.nome} (${t.file.record} record)` : ''}{t.anomalie ? ` · ${t.anomalie} anomalie` : ''}{t.esito === 'simulato' ? ' · simulato' : t.protocollo ? ` · prot. ${t.protocollo}` : ''}
                </span>
              ))}
            </div>
          )}

          <div className="tcs__actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose} disabled={invio}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={trasmetti} disabled={invio || !riepilogo.righe.length || !inUso || bloccato}>
              <i className={`fa-solid ${invio ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} aria-hidden="true" />
              {invio ? 'Trasmissione in corso…' : precedenti.length ? 'Ritrasmetti consuntivo' : 'Trasmetti consuntivo'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
