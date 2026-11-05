import React, { useMemo, useState } from 'react'
import { CheckboxField, InputField, SelectField, ToggleSwitch } from '../../../../../core/components/form'
import Tooltip from '../../../../../core/components/Tooltip'
import { CfgSaveBar, CfgTable } from '../../../../../core/cfg'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import {
  codiceDipendentePaghe, integrazioneValida, profiloPagheVuoto, useHrConfigStore, type IntegrazionePagheHr, type ProfiloPaghe,
} from '../../../../../store/useHrConfigStore'
import { DIPENDENTI_HR } from '../../../../../store/useHrGestioneStore'
import {
  CANALI_PAGHE, FORMATO_RILPRE_RP, SOFTWARE_PAGHE, VOCI_CONSUNTIVO, softwarePaghe, type CanalePaghe, type CampoPaghe, type SoftwarePagheId,
} from '../../../../../store/pagheCatalogo'
import { useHrDraft } from '../_hr/useHrDraft'
import './HrIntegrazionePaghe.sass'

// ─── RISORSE UMANE › INTEGRAZIONE PAGHE ──────────────────────────────────────
//  Il collegamento con il software paghe che elabora i cedolini. A sinistra i
//  software più diffusi, a destra la configurazione di quello scelto:
//  canale (API, SFTP o email al consulente) con i suoi campi, prova del
//  collegamento, formato del tracciato, chiave del dipendente e codici voce.
//  Sotto, le regole d'invio comuni (invio automatico, straordinario approvato,
//  blocco con timbrature anomale). Registro presenze › Trasmetti consuntivo
//  invia al software «in uso».

const conta = (a: IntegrazionePagheHr, b: IntegrazionePagheHr) => {
  const ka = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof IntegrazionePagheHr>
  let n = 0
  ka.forEach((k) => {
    if (k === 'profili') {
      const ids = new Set([...Object.keys(a.profili), ...Object.keys(b.profili)]) as Set<SoftwarePagheId>
      ids.forEach((id) => { if (JSON.stringify(a.profili[id]) !== JSON.stringify(b.profili[id])) n++ })
    } else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) n++
  })
  return n
}
const completion = (v: IntegrazionePagheHr) => (v.inUso && v.profili[v.inUso]?.ultimoTest?.ok ? 'configured' as const : v.inUso ? 'partial' as const : 'empty' as const)

const fmtAt = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} alle ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Campi del canale scelto. */
const campiDi = (campi: CampoPaghe[], canale: CanalePaghe) => campi.filter((c) => !c.canali || c.canali.includes(canale))

export default function HrIntegrazionePaghe() {
  const salvata = useHrConfigStore((s) => s.integrazionePaghe)
  const saved = useMemo(() => integrazioneValida(salvata), [salvata])
  const setIntegrazione = useHrConfigStore((s) => s.setIntegrazionePaghe)
  const confirm = useConfirmStore((s) => s.confirm)
  const { draft, setDraft, dirty, save, cancel } = useHrDraft('hr-integrazione-paghe', saved, conta, setIntegrazione, completion)
  const [selId, setSelId] = useState<SoftwarePagheId>(saved.inUso ?? SOFTWARE_PAGHE[0].id)
  const [test, setTest] = useState(false)

  const sw = softwarePaghe(selId)
  const profilo: ProfiloPaghe = draft.profili[selId] ?? profiloPagheVuoto(selId)
  const configurato = !!draft.profili[selId]
  const campi = campiDi(sw.campi, profilo.canale)
  const mancanti = campi.filter((c) => c.obbligatorio && !profilo.valori[c.key]?.trim())
  const rp = selId === 'teamsystem' && profilo.formato === FORMATO_RILPRE_RP

  const setProfilo = (p: Partial<ProfiloPaghe>) => setDraft((d) => ({ ...d, profili: { ...d.profili, [selId]: { ...(d.profili[selId] ?? profiloPagheVuoto(selId)), ...p } } }))
  const setValore = (k: string, v: string) => setProfilo({ valori: { ...profilo.valori, [k]: v }, ultimoTest: undefined })
  const setRegola = <K extends keyof IntegrazionePagheHr>(k: K, v: IntegrazionePagheHr[K]) => setDraft((d) => ({ ...d, [k]: v }))

  async function provaCollegamento() {
    setTest(true)
    await new Promise((r) => setTimeout(r, 900))
    const ok = mancanti.length === 0
    const messaggio = ok
      ? profilo.canale === 'api' ? `Collegamento riuscito con ${sw.produttore}: credenziali valide.`
        : profilo.canale === 'sftp' ? `Cartella raggiungibile su ${profilo.valori.sftpHost}: file di prova scritto e rimosso.`
          : `Email di prova inviata a ${profilo.valori.emailConsulente}.`
      : `Mancano: ${mancanti.map((c) => c.label).join(', ')}.`
    setProfilo({ ultimoTest: { at: new Date().toISOString(), ok, messaggio } })
    setTest(false)
    if (ok) toast.success(messaggio, 'Collegamento verificato')
    else toast.error(messaggio, 'Collegamento non verificato')
  }

  async function rimuovi() {
    const ok = await confirm({
      title: 'Rimuovi configurazione',
      message: `Rimuovere la configurazione di ${sw.produttore} ${sw.nome}?${draft.inUso === selId ? ' È il software in uso: il consuntivo non potrà essere trasmesso finché non ne scegli un altro.' : ''}`,
      confirmLabel: 'Rimuovi',
      danger: true,
    })
    if (!ok) return
    setDraft((d) => {
      const profili = { ...d.profili }
      delete profili[selId]
      return { ...d, profili, inUso: d.inUso === selId ? null : d.inUso }
    })
  }

  const stato = (id: SoftwarePagheId) => {
    const p = draft.profili[id]
    if (draft.inUso === id) return { cls: 'uso', icon: 'fa-circle-check', label: 'In uso' }
    if (p?.ultimoTest?.ok) return { cls: 'ok', icon: 'fa-plug-circle-check', label: 'Collegato' }
    if (p) return { cls: 'parz', icon: 'fa-circle-half-stroke', label: 'Da verificare' }
    return { cls: 'off', icon: 'fa-circle', label: 'Non configurato' }
  }

  return (
    <div className="cfg-hrpag cfg-hr-pane">
      <div className="cfg-hrpag__layout">
        {/* ── Software paghe ─────────────────────────────────────────────── */}
        <aside className="cfg-hrpag__list" aria-label="Software paghe">
          {SOFTWARE_PAGHE.map((s) => {
            const st = stato(s.id)
            return (
              <button key={s.id} type="button" className={`cfg-hrpag__item${selId === s.id ? ' is-active' : ''}`} onClick={() => setSelId(s.id)}>
                <span className="cfg-hrpag__sigla" aria-hidden="true">{s.sigla}</span>
                <span className="cfg-hrpag__item-text">
                  <span className="cfg-hrpag__item-name">{s.produttore}</span>
                  <span className="cfg-hrpag__item-meta">{s.nome}</span>
                </span>
                <Tooltip text={st.label}>
                  <i className={`fa-solid ${st.icon} cfg-hrpag__st cfg-hrpag__st--${st.cls}`} aria-label={st.label} />
                </Tooltip>
              </button>
            )
          })}
        </aside>

        {/* ── Configurazione del software scelto ─────────────────────────── */}
        <section className="cfg-hrpag__detail">
          <header className="cfg-hrpag__head">
            <span className="cfg-hrpag__sigla cfg-hrpag__sigla--lg" aria-hidden="true">{sw.sigla}</span>
            <div className="cfg-hrpag__head-text">
              <span className="cfg-hrpag__head-name">{sw.produttore} {sw.nome}</span>
              <span className="cfg-hrpag__head-desc">{sw.descrizione}</span>
            </div>
            <div className="cfg-hrpag__head-actions">
              {draft.inUso === selId ? (
                <span className="cfg-hrpag__inuso"><i className="fa-solid fa-circle-check" aria-hidden="true" />In uso per il consuntivo</span>
              ) : (
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { setProfilo({}); setRegola('inUso', selId) }}>
                  Usa per il consuntivo
                </button>
              )}
              {configurato && (
                <Tooltip text="Rimuovi configurazione">
                  <button type="button" className="sib-btn sib-btn--icon cfg-hrpag__ico" aria-label="Rimuovi configurazione" onClick={rimuovi}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </Tooltip>
              )}
            </div>
          </header>

          {/* Collegamento */}
          <div className="cfg-hrpag__block">
            <h3 className="cfg-hrpag__title">Collegamento</h3>
            <div className="cfg-hrpag__canali" role="radiogroup" aria-label="Canale di invio">
              {sw.canali.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={profilo.canale === c}
                  className={`cfg-hrpag__canale${profilo.canale === c ? ' is-active' : ''}`}
                  onClick={() => setProfilo({ canale: c, ultimoTest: undefined })}>
                  <i className={`fa-solid ${CANALI_PAGHE[c].icon}`} aria-hidden="true" />
                  <span className="cfg-hrpag__canale-text">
                    <span className="cfg-hrpag__canale-label">{CANALI_PAGHE[c].label}</span>
                    <span className="cfg-hrpag__canale-desc">{CANALI_PAGHE[c].descrizione}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="cfg-hrpag__grid">
              {campi.map((c) => c.tipo === 'select' ? (
                <SelectField key={c.key} name={`pg-${c.key}`} label={c.label} required={c.obbligatorio} value={profilo.valori[c.key] ?? c.options?.[0] ?? ''}
                  onChange={(e) => setValore(c.key, e.target.value)} options={(c.options ?? []).map((o) => ({ value: o, label: o }))} hint={c.hint} />
              ) : (
                <InputField key={c.key} name={`pg-${c.key}`} label={c.label} required={c.obbligatorio}
                  type={c.tipo === 'password' ? 'password' : c.tipo === 'url' ? 'url' : c.tipo === 'email' ? 'email' : 'text'}
                  value={profilo.valori[c.key] ?? ''} placeholder={c.placeholder} hint={c.hint}
                  onChange={(e) => setValore(c.key, e.target.value)} />
              ))}
            </div>
            <div className="cfg-hrpag__test">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={provaCollegamento} disabled={test}>
                <i className={`fa-solid ${test ? 'fa-spinner fa-spin' : 'fa-plug-circle-bolt'}`} aria-hidden="true" />
                {test ? 'Verifica in corso…' : 'Prova collegamento'}
              </button>
              {profilo.ultimoTest ? (
                <span className={`cfg-hrpag__esito cfg-hrpag__esito--${profilo.ultimoTest.ok ? 'ok' : 'ko'}`}>
                  <i className={`fa-solid ${profilo.ultimoTest.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} aria-hidden="true" />
                  {profilo.ultimoTest.messaggio} <span className="cfg-hrpag__esito-at">{fmtAt(profilo.ultimoTest.at)}</span>
                </span>
              ) : (
                <span className="cfg-hrpag__esito">{mancanti.length ? `Compila: ${mancanti.map((c) => c.label).join(', ')}.` : 'Collegamento non ancora verificato.'}</span>
              )}
            </div>
          </div>

          {/* Tracciato */}
          <div className="cfg-hrpag__block">
            <h3 className="cfg-hrpag__title">Tracciato presenze</h3>
            <div className="cfg-hrpag__grid">
              {profilo.canale !== 'api' && (
                <SelectField name="pg-formato" label="Formato del file" value={profilo.formato} onChange={(e) => setProfilo({ formato: e.target.value })}
                  options={sw.formati.map((f) => ({ value: f, label: f }))} />
              )}
              <SelectField name="pg-chiave" label="Dipendente riconosciuto da" value={profilo.chiaveDipendente} onChange={(e) => setProfilo({ chiaveDipendente: e.target.value })}
                options={sw.chiaveDipendente.map((c) => ({ value: c, label: c }))}
                hint="Il codice si imposta nella scheda di ogni dipendente (Crea anagrafica)." />
            </div>
            <div className="cfg-hrpag__voci-head">
              <span className="cfg-hrpag__sub">Codici voce</span>
              <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setProfilo({ voci: { ...sw.voci } })}>
                <i className="fa-solid fa-rotate-left" aria-hidden="true" />Ripristina i codici {sw.produttore}
              </button>
            </div>
            {selId === 'teamsystem' && (
              <p className="cfg-hrpag__nota">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                Le ore ordinarie vanno nel campo «Ore ordinario» di ogni giorno; le altre voci diventano giustificativi (fino a 6 al giorno),
                con codici di {rp ? '2 caratteri (tabella TB1103)' : '4 caratteri al massimo'}.
              </p>
            )}
            <CfgTable columns={[
              { key: 'voce', label: 'Voce del registro', width: rp ? '22%' : '26%' },
              { key: 'desc', label: 'Descrizione', width: rp ? '38%' : '50%' },
              { key: 'cod', label: selId === 'teamsystem' ? 'Codice giustificativo' : `Codice voce ${sw.produttore}`, width: '24%' },
              ...(rp ? [{ key: 'somma', label: "Somma all'ordinario", width: '16%', align: 'center' as const }] : []),
            ]}>
              {VOCI_CONSUNTIVO.map((v) => (
                <tr key={v.voce}>
                  <td className="cfg-hrpag__voce">{v.voce}</td>
                  <td className="cfg-hrpag__muted">{v.descrizione}</td>
                  <td>
                    {selId === 'teamsystem' && v.voce === 'Ordinarie'
                      ? <span className="cfg-hrpag__muted">Ore ordinario (pos. 96)</span>
                      : <InputField name={`voce-${v.voce}`} ariaLabel={`Codice voce ${v.voce}`} dense value={profilo.voci[v.voce] ?? ''}
                          onChange={(e) => setProfilo({ voci: { ...profilo.voci, [v.voce]: e.target.value.toUpperCase().slice(0, selId === 'teamsystem' ? (rp ? 2 : 4) : 10) } })} />}
                  </td>
                  {rp && (
                    <td className="cfg-hrpag__center">
                      {v.voce !== 'Ordinarie' && (
                        <CheckboxField name={`somma-${v.voce}`} ariaLabel={`Somma ${v.voce} all'ordinario`}
                          checked={!!profilo.sommaOrdinario?.includes(v.voce)}
                          onChange={(e) => setProfilo({ sommaOrdinario: e.target.checked ? [...(profilo.sommaOrdinario ?? []), v.voce] : (profilo.sommaOrdinario ?? []).filter((x) => x !== v.voce) })} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </CfgTable>
          </div>

          {/* Codici dei dipendenti nel software paghe */}
          <div className="cfg-hrpag__block">
            <h3 className="cfg-hrpag__title">Codici dei dipendenti <span className="cfg-hrpag__title-note">{profilo.chiaveDipendente}{selId === 'teamsystem' ? ` · ${rp ? '6' : '9'} cifre al massimo` : ''}</span></h3>
            <CfgTable columns={[
              { key: 'dip', label: 'Dipendente', width: '40%' },
              { key: 'rep', label: 'Reparto', width: '30%' },
              { key: 'cod', label: `Codice in ${sw.produttore}`, width: '30%' },
            ]}>
              {DIPENDENTI_HR.map((d) => (
                <tr key={d.id}>
                  <td className="cfg-hrpag__voce">{d.cognome} {d.nome}</td>
                  <td className="cfg-hrpag__muted">{d.reparto}</td>
                  <td>
                    <InputField name={`dip-${d.id}`} ariaLabel={`Codice di ${d.nome} ${d.cognome}`} dense value={codiceDipendentePaghe(profilo, d.id)}
                      onChange={(e) => setProfilo({ codiciDipendente: { ...(profilo.codiciDipendente ?? {}), [d.id]: selId === 'teamsystem' ? e.target.value.replace(/\D/g, '').slice(0, rp ? 6 : 9) : e.target.value } })} />
                  </td>
                </tr>
              ))}
            </CfgTable>
          </div>

          {/* Regole d'invio, comuni a tutti i software */}
          <div className="cfg-hrpag__block">
            <h3 className="cfg-hrpag__title">Invio del consuntivo <span className="cfg-hrpag__title-note">vale per tutti i software</span></h3>
            <div className="cfg-hrpag__regole">
              <ToggleSwitch label="Invio automatico a fine mese" description="Sibylla trasmette da sola il consuntivo del mese chiuso."
                checked={draft.invioAutomatico} onChange={(v) => setRegola('invioAutomatico', v)} />
              {draft.invioAutomatico && (
                <div className="cfg-hrpag__grid cfg-hrpag__grid--sm">
                  <SelectField name="pg-giorno" label="Giorno del mese successivo" value={String(draft.giornoInvio)} onChange={(e) => setRegola('giornoInvio', Number(e.target.value))}
                    options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `Il ${i + 1}` }))} />
                  <InputField name="pg-ora" label="Alle" value={draft.oraInvio} onChange={(e) => setRegola('oraInvio', e.target.value)} placeholder="09:00" />
                </div>
              )}
              <ToggleSwitch label="Trasmetti solo lo straordinario approvato" description="Lo straordinario non approvato in Cedolini resta fuori dal consuntivo."
                checked={draft.soloStraordinarioApprovato} onChange={(v) => setRegola('soloStraordinarioApprovato', v)} />
              <ToggleSwitch label="Blocca l'invio con timbrature anomale" description="Il consuntivo parte solo quando tutte le anomalie del mese sono corrette."
                checked={draft.bloccaConAnomalie} onChange={(v) => setRegola('bloccaConAnomalie', v)} />
              <ToggleSwitch label="Avvisa l'ufficio del personale dell'esito" description="Notifica nel Centro notifiche a invio riuscito o fallito."
                checked={draft.notificaEsito} onChange={(v) => setRegola('notificaEsito', v)} />
            </div>
          </div>
        </section>
      </div>

      <CfgSaveBar count={dirty} onSave={save} onCancel={cancel} successMessage="Integrazione paghe salvata" />
    </div>
  )
}
