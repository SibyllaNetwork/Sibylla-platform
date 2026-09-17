// ─── Cassa e chiusure (Food & Beverage) ───────────────────────────────────────
//  Il turno di cassa: si apre con un fondo, si chiude contando il cassetto. In
//  mezzo la pagina risponde alle tre domande di fine servizio:
//    • quanto è entrato, e per quali vie
//    • quanto c'è di imponibile per aliquota, che è ciò che serve al report
//    • cosa è stato stornato e perché — l'unico controllo che un direttore fa
//      davvero tutti i giorni
//
//  Lo scostamento fra contato e teorico non è un errore da nascondere: si
//  scrive grande, con il segno, perché è la ragione per cui si conta.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import { InputField, SelectField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleConto, totaleRiga, SALE } from '../../../../store/useFbStore'
import {
  ALIQUOTE_IVA, CAMERIERI, METODI_PAGAMENTO, type MetodoPagamento,
} from '../fb.model'
import './FbCassa.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

export default function FbCassa({ navigate }: { navigate?: (p: string) => void }) {
  const cassa     = useFbStore(s => s.cassa)
  const chiusure  = useFbStore(s => s.chiusure)
  const storni    = useFbStore(s => s.storni)
  const comande   = useFbStore(s => s.comande)
  const voci      = useFbStore(s => s.voci)
  const contesto  = useFbStore(s => s.contesto)
  const apriCassa = useFbStore(s => s.apriCassa)
  const chiudiCassa = useFbStore(s => s.chiudiCassa)
  const confirm   = useConfirmStore(s => s.confirm)

  const [apri, setApri] = useState(false)
  const [fondo, setFondo] = useState(150)
  const [operatore, setOperatore] = useState(CAMERIERI[0])
  const [chiudi, setChiudi] = useState(false)
  const [contato, setContato] = useState(0)
  const [storico, setStorico] = useState(false)

  const idSale = useMemo(
    () => SALE.filter(s => s.outletId === contesto.outletId).map(s => s.id),
    [contesto.outletId],
  )
  const chiuse = useMemo(
    () => comande.filter(c => c.stato === 'chiusa' && idSale.includes(c.salaId)),
    [comande, idSale],
  )
  const aperte = useMemo(
    () => comande.filter(c => c.stato === 'aperta' && idSale.includes(c.salaId)),
    [comande, idSale],
  )

  /** Incassato per metodo: è la prima riga di ogni chiusura. */
  const perMetodo = useMemo(() => {
    const m: Record<MetodoPagamento, number> = { contanti: 0, carta: 0, camera: 0, wallet: 0 }
    chiuse.forEach(c => { if (c.pagamento) m[c.pagamento] += totaleConto(c) })
    return m
  }, [chiuse])

  const incassato = Object.values(perMetodo).reduce((a, n) => a + n, 0)
  const daIncassare = aperte.reduce((a, c) => a + totaleConto(c), 0)
  const copertiServiti = chiuse.reduce((a, c) => a + c.coperti, 0)

  /** Imponibile e imposta per aliquota, dedotte dal reparto che prepara la voce. */
  const perAliquota = useMemo(() => ALIQUOTE_IVA.map(a => {
    const lordo = chiuse.reduce((tot, c) => tot + c.righe.reduce((t, r) => {
      const v = voci.find(x => x.id === r.voceId)
      return a.reparti.includes(v?.reparto ?? 'cucina') ? t + totaleRiga(r) : t
    }, 0), 0)
    const imponibile = lordo / (1 + a.aliquota / 100)
    return { ...a, lordo, imponibile, imposta: lordo - imponibile }
  }), [chiuse, voci])

  /** Quanto dovrebbe esserci nel cassetto: fondo più i contanti incassati. */
  const teorico = (cassa?.fondo ?? 0) + perMetodo.contanti
  const scostamento = contato - teorico

  const confermaApertura = () => {
    apriCassa(fondo, operatore)
    setApri(false)
    toast.success(`Cassa aperta con un fondo di ${euro(fondo)}`)
  }

  const confermaChiusura = async () => {
    const ok = await confirm({
      message: aperte.length
        ? `Ci sono ancora ${aperte.length} ${aperte.length === 1 ? 'conto aperto' : 'conti aperti'} in sala per ${euro(daIncassare)}. Chiudere comunque il turno di cassa?`
        : 'Chiudere il turno di cassa? Il riepilogo finisce nello storico e non si modifica più.',
      confirmLabel: 'Chiudi il turno',
    })
    if (!ok) return
    chiudiCassa(contato)
    setChiudi(false)
    toast.success('Turno di cassa chiuso')
  }

  return (
    <div className="fbcassa">
      <PageHead
        title="Cassa e chiusure"
        subtitle="Il turno di cassa: incassi per metodo, riepilogo IVA, storni e chiusura"
        actions={
          <>
            <button type="button" className="fbcassa__head-btn fbcassa__head-btn--ghost" onClick={() => setStorico(true)}>
              <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Chiusure precedenti
            </button>
            {cassa ? (
              <button
                type="button" className="fbcassa__head-btn"
                onClick={() => { setContato(teorico); setChiudi(true) }}
              >
                <i className="fa-solid fa-lock" aria-hidden="true" /> Chiudi il turno
              </button>
            ) : (
              <button type="button" className="fbcassa__head-btn" onClick={() => setApri(true)}>
                <i className="fa-solid fa-unlock" aria-hidden="true" /> Apri la cassa
              </button>
            )}
          </>
        }
      />

      {/* Stato del turno: una riga, non una fascia di riquadri */}
      <p className="fbcassa__turno">
        {cassa ? (
          <>
            <span className="fbcassa__pallino is-on" aria-hidden="true" />
            Cassa aperta alle <strong>{cassa.apertaAlle}</strong> da <strong>{cassa.operatore}</strong>
            {' · '}fondo {euro(cassa.fondo)}
            {' · '}incassato finora <strong>{euro(incassato)}</strong> su {chiuse.length} conti
          </>
        ) : (
          <>
            <span className="fbcassa__pallino" aria-hidden="true" />
            Cassa chiusa: apri il turno per registrare gli incassi del servizio.
          </>
        )}
      </p>

      <div className="fbcassa__corpo">
        {/* ── Incassi e IVA ────────────────────────────────────────────────── */}
        <section className="fbcassa__col">
          <h3 className="fbcassa__tit"><i className="fa-solid fa-cash-register" aria-hidden="true" /> Incassi del turno</h3>
          <div className="sib-table-wrap">
            <table className="sib-table fbcassa__table">
              <colgroup><col /><col className="fbcassa__c-num" /><col className="fbcassa__c-num" /></colgroup>
              <thead>
                <tr>
                  <th>Metodo</th>
                  <th className="fbcassa__amt">Conti</th>
                  <th className="fbcassa__amt">Incassato</th>
                </tr>
              </thead>
              <tbody>
                {METODI_PAGAMENTO.map(m => (
                  <tr key={m.id}>
                    <td>
                      <span className="fbcassa__met">
                        <i className={`fa-solid ${m.ico}`} aria-hidden="true" /> {m.label}
                      </span>
                    </td>
                    <td className="fbcassa__amt">{chiuse.filter(c => c.pagamento === m.id).length}</td>
                    <td className="fbcassa__amt">{euro(perMetodo[m.id])}</td>
                  </tr>
                ))}
                <tr className="fbcassa__tot-row">
                  <td>Totale incassato</td>
                  <td className="fbcassa__amt">{chiuse.length}</td>
                  <td className="fbcassa__amt">{euro(incassato)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="fbcassa__nota">
            {copertiServiti} coperti serviti · ancora in sala {euro(daIncassare)} su {aperte.length}{' '}
            {aperte.length === 1 ? 'conto aperto' : 'conti aperti'}
          </p>

          <h3 className="fbcassa__tit"><i className="fa-solid fa-percent" aria-hidden="true" /> Riepilogo IVA</h3>
          <div className="sib-table-wrap">
            <table className="sib-table fbcassa__table">
              <colgroup><col /><col className="fbcassa__c-num" /><col className="fbcassa__c-num" /><col className="fbcassa__c-num" /></colgroup>
              <thead>
                <tr>
                  <th>Aliquota</th>
                  <th className="fbcassa__amt">Imponibile</th>
                  <th className="fbcassa__amt">Imposta</th>
                  <th className="fbcassa__amt">Lordo</th>
                </tr>
              </thead>
              <tbody>
                {perAliquota.map(a => (
                  <tr key={a.aliquota}>
                    <td>
                      <Tooltip text={`Reparti: ${a.reparti.join(', ')}`}>
                        <span>{a.aliquota}% · {a.label}</span>
                      </Tooltip>
                    </td>
                    <td className="fbcassa__amt">{euro(a.imponibile)}</td>
                    <td className="fbcassa__amt">{euro(a.imposta)}</td>
                    <td className="fbcassa__amt">{euro(a.lordo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Storni ───────────────────────────────────────────────────────── */}
        <section className="fbcassa__col">
          <h3 className="fbcassa__tit"><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Storni del turno</h3>
          <p className="fbcassa__nota">
            Ogni riga tolta da un conto lascia traccia: chi, quando e perché.
          </p>
          <div className="sib-table-wrap">
            <table className="sib-table fbcassa__table">
              <colgroup>
                <col className="fbcassa__c-ora" /><col /><col className="fbcassa__c-mot" />
                <col className="fbcassa__c-num" /><col className="fbcassa__c-op" />
              </colgroup>
              <thead>
                <tr>
                  <th>Ora</th>
                  <th>Voce</th>
                  <th>Motivo</th>
                  <th className="fbcassa__amt">Valore</th>
                  <th>Operatore</th>
                </tr>
              </thead>
              <tbody>
                {storni.map(s => (
                  <tr key={s.id}>
                    <td>{s.ora}</td>
                    <td>
                      <span className="fbcassa__voce">
                        <TruncatedText text={`${s.qta}× ${s.voce}`} />
                        {s.giaInviata && (
                          <Tooltip text="Era già partita per la cucina: merce prodotta e persa">
                            <i className="fa-solid fa-fire-burner fbcassa__gia" aria-hidden="true" />
                          </Tooltip>
                        )}
                      </span>
                      <span className="fbcassa__tav">tav. {s.tavolo} · comanda {s.numero}</span>
                    </td>
                    <td><TruncatedText text={s.motivo} /></td>
                    <td className="fbcassa__amt">{euro(s.valore)}</td>
                    <td><TruncatedText text={s.operatore} /></td>
                  </tr>
                ))}
                {!storni.length && (
                  <tr><td colSpan={5} className="fbcassa__vuoto">Nessuno storno in questo turno.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="fbcassa__nota">
            {storni.length} {storni.length === 1 ? 'storno' : 'storni'} per {euro(storni.reduce((a, s) => a + s.valore, 0))}
            {' · '}di cui {storni.filter(s => s.giaInviata).length} dopo l’invio in cucina
          </p>
        </section>
      </div>

      {/* ── Apertura ─────────────────────────────────────────────────────── */}
      <Modal open={apri} onClose={() => setApri(false)} title="Apri la cassa" size="sm">
        <div className="fbcassa-form">
          <InputField
            name="fondo" label="Fondo cassa (€)" type="number" step={10} value={fondo}
            onChange={e => setFondo(+e.target.value)}
          />
          <SelectField
            name="operatore" label="Operatore" value={operatore}
            options={CAMERIERI.map(c => ({ value: c, label: c }))}
            onChange={e => setOperatore(e.target.value)}
          />
          <footer className="fbcassa-form__foot">
            <button type="button" className="fbcassa-form__annulla" onClick={() => setApri(false)}>Annulla</button>
            <button type="button" className="fbcassa-form__ok" onClick={confermaApertura}>
              <i className="fa-solid fa-check" aria-hidden="true" /> Apri
            </button>
          </footer>
        </div>
      </Modal>

      {/* ── Chiusura ─────────────────────────────────────────────────────── */}
      <Modal open={chiudi} onClose={() => setChiudi(false)} title="Chiudi il turno di cassa" size="md">
        <div className="fbcassa-form">
          <div className="fbcassa-form__righe">
            <span>Fondo iniziale</span><strong>{euro(cassa?.fondo ?? 0)}</strong>
            <span>Contanti incassati</span><strong>{euro(perMetodo.contanti)}</strong>
            <span>Teorico in cassetto</span><strong>{euro(teorico)}</strong>
          </div>
          <InputField
            name="contato" label="Contato nel cassetto (€)" type="number" step={5} value={contato}
            onChange={e => setContato(+e.target.value)}
          />
          <p className={`fbcassa-form__scarto ${scostamento === 0 ? 'is-ok' : scostamento > 0 ? 'is-piu' : 'is-meno'}`}>
            {scostamento === 0
              ? 'Cassetto in pari.'
              : `Scostamento ${scostamento > 0 ? '+' : ''}${euro(scostamento)} ${scostamento > 0 ? 'in eccesso' : 'in difetto'}.`}
          </p>
          <footer className="fbcassa-form__foot">
            <button type="button" className="fbcassa-form__annulla" onClick={() => setChiudi(false)}>Annulla</button>
            <button type="button" className="fbcassa-form__ok" onClick={confermaChiusura}>
              <i className="fa-solid fa-lock" aria-hidden="true" /> Chiudi il turno
            </button>
          </footer>
        </div>
      </Modal>

      {/* ── Chiusure precedenti ──────────────────────────────────────────── */}
      <Modal open={storico} onClose={() => setStorico(false)} title="Chiusure precedenti" size="xl">
        <div className="sib-table-wrap">
          <table className="sib-table fbcassa__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Turno</th>
                <th>Operatore</th>
                <th className="fbcassa__amt">Conti</th>
                <th className="fbcassa__amt">Coperti</th>
                <th className="fbcassa__amt">Incassato</th>
                <th className="fbcassa__amt">Scostamento</th>
              </tr>
            </thead>
            <tbody>
              {chiusure.map(c => {
                const tot = Object.values(c.incassi).reduce((a, n) => a + n, 0)
                const scarto = (c.contato ?? 0) - (c.fondo + c.incassi.contanti)
                return (
                  <tr key={c.id}>
                    <td>{new Date(c.data).toLocaleDateString('it-IT')}</td>
                    <td>{c.apertaAlle} – {c.chiusaAlle}</td>
                    <td>{c.operatore}</td>
                    <td className="fbcassa__amt">{c.conti}</td>
                    <td className="fbcassa__amt">{c.coperti}</td>
                    <td className="fbcassa__amt">{euro(tot)}</td>
                    <td className={`fbcassa__amt ${scarto ? 'fbcassa__scarto' : ''}`}>
                      {scarto ? `${scarto > 0 ? '+' : ''}${euro(scarto)}` : 'in pari'}
                    </td>
                  </tr>
                )
              })}
              {!chiusure.length && (
                <tr><td colSpan={7} className="fbcassa__vuoto">Nessuna chiusura archiviata.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}
