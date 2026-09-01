import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgTable, CfgToolbar, CfgSaveBar } from '../../../../../core/cfg'
import { SelectField, CheckboxField, ToggleSwitch, InputField } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { ACRONIMI } from '../../../../../core/components/acronimi'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { useConfiguratoreStore, type CfgCompletion } from '../../../../../store/useConfiguratoreStore'
import { toast } from '../../../../../core/components/Toast/useToast'
import { scaricaSottoSogliaPdf } from './sottoSogliaPdf'
import {
  PIANI,
  CANALI,
  SEGMENTI_NOTIFICA,
  useBottomRateStore,
  type RigaBottomRate,
  type NotificaSottoSoglia,
  type PianoTariffario,
} from './bottomRateData'
import './BottomRate.sass'

// ─── BOTTOM RATE ─────────────────────────────────────────────────────────────
//  Soglia minima per tipologia camera: la colonna "Camera di riferimento" è
//  stata eliminata (vive in Mapping camere) e i piani tariffari BAR / FIT /
//  Gruppi sono DENTRO la tabella — il piano configurato e attivo è blu, i non
//  configurati grigi. Sotto, la configurazione della notifica sotto-soglia
//  (canale + segmento) con l'anteprima di ciò che l'utente riceverà e la
//  generazione del PDF.

const PANE_ID = 'bottom-rate'

const fmtEur = (v: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(v)

function completionOf(righe: RigaBottomRate[]): CfgCompletion {
  const configurate = righe.filter(r => (r.valori[r.attivo] ?? 0) > 0).length
  if (configurate === righe.length) return 'configured'
  if (configurate > 0) return 'partial'
  return 'empty'
}

export default function BottomRate() {
  const saved         = useBottomRateStore(s => s.righe)
  const savedNotifica = useBottomRateStore(s => s.notifica)
  const persistiSalva = useBottomRateStore(s => s.salva)

  const [righe, setRighe] = useState<RigaBottomRate[]>(
    () => saved.map(r => ({ ...r, valori: { ...r.valori } })),
  )
  const [notifica, setNotifica] = useState<NotificaSottoSoglia>(() => ({ ...savedNotifica }))

  const setAttivo = (id: number, piano: PianoTariffario) =>
    setRighe(rs => rs.map(r => r.id === id ? { ...r, attivo: piano } : r))

  const setValore = (id: number, piano: PianoTariffario, v: number | null) =>
    setRighe(rs => rs.map(r => r.id === id ? { ...r, valori: { ...r.valori, [piano]: v } } : r))

  // ── Dirty state + save bar
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const dirtyCount = useMemo(() => {
    let count = 0
    for (const r of righe) {
      const s = saved.find(x => x.id === r.id)
      if (!s) { count += 1; continue }
      const cambiata = s.attivo !== r.attivo
        || PIANI.some(p => (s.valori[p.id] ?? null) !== (r.valori[p.id] ?? null))
      if (cambiata) count += 1
    }
    if (JSON.stringify(notifica) !== JSON.stringify(savedNotifica)) count += 1
    return count
  }, [righe, saved, notifica, savedNotifica])

  useEffect(() => { markDirty(PANE_ID, dirtyCount) }, [dirtyCount, markDirty])

  const salva = async () => {
    // Persistenza mock (demo senza backend): latenza simulata + store persistito.
    await new Promise(resolve => setTimeout(resolve, 450))
    persistiSalva(righe, notifica)
    setCompletion(PANE_ID, completionOf(righe))
    resetDirty()
  }

  const annulla = () => {
    setRighe(saved.map(r => ({ ...r, valori: { ...r.valori } })))
    setNotifica({ ...savedNotifica })
    resetDirty()
  }

  // ── Esempio per l'anteprima notifica: la Doppia Classic sul suo piano attivo
  const riferimento = righe.find(r => r.nome === 'Doppia Classic') ?? righe[0]
  const barConfigurata = riferimento ? (riferimento.valori[riferimento.attivo] ?? 60) : 60
  const tariffaApplicata = Math.max(0, barConfigurata - 10)
  const pianoLabel = riferimento
    ? PIANI.find(p => p.id === riferimento.attivo)?.label ?? riferimento.attivo
    : 'BAR'
  const numeroPrenotazione = '2027/00412'

  const riapriCanale = () => {
    toast.success(`Canale ${notifica.canale} riaperto per il segmento ${notifica.segmento}`)
  }

  const scaricaPdf = () => {
    scaricaSottoSogliaPdf({
      numeroPrenotazione,
      canale: notifica.canale,
      segmento: notifica.segmento,
      tariffaApplicata,
      barConfigurata,
      pianoTariffario: pianoLabel,
      dataOra: new Date(),
    })
    toast.success('PDF della notifica scaricato')
  }

  return (
    <div className="bottom-rate">
      <CfgToolbar>
        <SelectField
          name="struttura"
          label="Struttura"
          value=""
          onChange={() => { /* struttura unica nel profilo demo */ }}
          options={[{ value: '', label: 'Hotel Tutorial' }]}
        />
      </CfgToolbar>

      {/* ── Soglie per tipologia: piani tariffari dentro la tabella ── */}
      <CfgTable
        className="bottom-rate__table"
        columns={[
          { key: 'camera', label: 'Tipologia camera',                     width: '34%' },
          { key: 'piani',  label: 'Piano tariffario',                     width: '38%' },
          { key: 'soglia', label: 'Bottom rate (piano attivo)',           width: '28%', align: 'right' },
        ]}
      >
        {righe.map(r => (
          <tr key={r.id}>
            <td><TruncatedText text={r.nome} className="bottom-rate__nome" /></td>
            <td>
              <div className="bottom-rate__piani" role="group" aria-label={`Piani tariffari ${r.nome}`}>
                {PIANI.map(p => {
                  const configurato = (r.valori[p.id] ?? 0) > 0
                  const attivo = r.attivo === p.id
                  const stato = attivo
                    ? (configurato ? 'Configurato · attivo' : 'Attivo · da configurare')
                    : (configurato ? `Configurato (${fmtEur(r.valori[p.id]!)}) · non attivo` : 'Non configurato')
                  // La chip è una sigla (BAR, FIT): il tooltip la scioglie prima
                  // di dare lo stato, così il piano tariffario resta leggibile.
                  const sigla = ACRONIMI[p.label]
                  return (
                    <Tooltip key={p.id} text={sigla ? `${p.label} · ${sigla.esteso} — ${stato}` : stato}>
                      <button
                        type="button"
                        className={clsx(
                          'bottom-rate__chip',
                          attivo && configurato && 'bottom-rate__chip--attivo',
                          !attivo && configurato && 'bottom-rate__chip--configurato',
                          attivo && !configurato && 'bottom-rate__chip--attivo-vuoto',
                        )}
                        aria-pressed={attivo}
                        onClick={() => setAttivo(r.id, p.id)}
                      >
                        {p.label}
                      </button>
                    </Tooltip>
                  )
                })}
              </div>
            </td>
            <td className="bottom-rate__td-soglia">
              <span className="bottom-rate__soglia-cell">
                <InputField
                  name={`soglia-${r.id}`}
                  type="number"
                  dense
                  min={0}
                  step={0.01}
                  className="bottom-rate__soglia-input"
                  value={r.valori[r.attivo] ?? ''}
                  placeholder="—"
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value)
                    setValore(r.id, r.attivo, v != null && Number.isFinite(v) ? v : null)
                  }}
                  ariaLabel={`Bottom rate ${r.nome} — piano ${r.attivo}`}
                />
                <span className="bottom-rate__unit">€</span>
              </span>
            </td>
          </tr>
        ))}
      </CfgTable>
      <p className="bottom-rate__totale">
        {righe.filter(r => (r.valori[r.attivo] ?? 0) > 0).length} tipologie su {righe.length} con soglia configurata sul piano attivo.
      </p>

      {/* ── Notifica sotto-soglia: configurazione + anteprima ── */}
      <section className="bottom-rate__notifica" aria-label="Notifica sotto-soglia">
        <header className="bottom-rate__notifica-head">
          <div className="bottom-rate__notifica-titles">
            <h3 className="bottom-rate__notifica-title">Notifica sotto-soglia</h3>
            <p className="bottom-rate__notifica-sub">
              Quando entra una prenotazione a un valore inferiore alla soglia, Sibylla genera la notifica associata a canale e segmento e chiude automaticamente il canale.
            </p>
          </div>
          <ToggleSwitch
            label={notifica.attiva ? 'Attiva' : 'Disattivata'}
            checked={notifica.attiva}
            onChange={(v) => setNotifica(n => ({ ...n, attiva: v }))}
          />
        </header>

        <div className="bottom-rate__notifica-fields">
          <SelectField
            name="canale"
            label="Canale"
            value={notifica.canale}
            disabled={!notifica.attiva}
            onChange={(e) => setNotifica(n => ({ ...n, canale: e.target.value }))}
            options={CANALI.map(c => ({ value: c, label: c }))}
          />
          <SelectField
            name="segmento-notifica"
            label="Segmento"
            value={notifica.segmento}
            disabled={!notifica.attiva}
            onChange={(e) => setNotifica(n => ({ ...n, segmento: e.target.value }))}
            options={SEGMENTI_NOTIFICA.map(s => ({ value: s, label: s }))}
          />
          <CheckboxField
            name="autorizzato"
            label="Utente autorizzato alla riapertura del canale"
            hint="Abilita il pulsante «Riapri canale» in fondo alla notifica."
            checked={notifica.autorizzato}
            disabled={!notifica.attiva}
            onChange={(e) => setNotifica(n => ({ ...n, autorizzato: e.target.checked }))}
            className="bottom-rate__autorizzato"
          />
        </div>

        {notifica.attiva && (
          <div className="bottom-rate__anteprima" aria-label="Anteprima della notifica">
            <div className="bottom-rate__anteprima-tag">Anteprima — così arriverà nel Centro notifiche</div>
            <article className="bottom-rate__card">
              <header className="bottom-rate__card-head">
                <span className="bottom-rate__card-icon" aria-hidden="true">
                  <i className="fa-light fa-triangle-exclamation" />
                </span>
                <div className="bottom-rate__card-titles">
                  <h4 className="bottom-rate__card-title">Prenotazione sotto soglia — chiusura automatica del canale</h4>
                  <p className="bottom-rate__card-meta">
                    Canale {notifica.canale} · segmento {notifica.segmento} · piano {pianoLabel}
                  </p>
                </div>
              </header>
              <p className="bottom-rate__card-body">
                Prenotazione n. {numeroPrenotazione} effettuata da {notifica.canale} al prezzo di {fmtEur(tariffaApplicata)}, a fronte di una BAR configurata di {fmtEur(barConfigurata)}. A seguito del rilevamento dello scostamento, Sibylla provvede automaticamente alla chiusura immediata del canale per il segmento interessato, al fine di evitare ulteriori prenotazioni a una tariffa inferiore a quella configurata.
              </p>
              <footer className="bottom-rate__card-foot">
                <span className="bottom-rate__scostamento">
                  Scostamento − {fmtEur(barConfigurata - tariffaApplicata)}
                </span>
                <div className="bottom-rate__card-actions">
                  {notifica.autorizzato ? (
                    <button type="button" className="sib-btn sib-btn--secondary" onClick={riapriCanale}>
                      <i className="fa-light fa-rotate-left" aria-hidden="true" />
                      Riapri canale
                    </button>
                  ) : (
                    <Tooltip text="Riservato agli utenti autorizzati dal profilo di accesso">
                      <button type="button" className="sib-btn sib-btn--secondary" disabled>
                        <i className="fa-light fa-rotate-left" aria-hidden="true" />
                        Riapri canale
                      </button>
                    </Tooltip>
                  )}
                  <button type="button" className="sib-btn sib-btn--primary" onClick={scaricaPdf}>
                    <i className="fa-regular fa-file-pdf" aria-hidden="true" />
                    Scarica PDF
                  </button>
                </div>
              </footer>
            </article>
          </div>
        )}
      </section>

      <CfgSaveBar
        count={dirtyCount}
        onSave={salva}
        onCancel={annulla}
        successMessage="Bottom rate salvato"
      />
    </div>
  )
}
