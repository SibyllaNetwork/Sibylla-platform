import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgTable, CfgToolbar, CfgSaveBar, CfgOpzioneErrore } from '../../../../../core/cfg'
import { SelectField, InputField } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { fetchStagioniCatalogo, type StagioneDef } from '../Stagionalita/stagionalitaData'
import { useOverbookingStore, TIPOLOGIE_CAMERA_OVB, type RegolaOverbooking } from './overbookingData'
import type { CfgPaneComponentProps } from '../../Configuratore'
import './OverbookingLimit.sass'

// ─── OVERBOOKING LIMIT ───────────────────────────────────────────────────────
//  Il funzionale (§4.11) vuole il configuratore bloccato fino a Stagionalità
//  configurata e applicata: la pagina si apre sempre sui contenuti e quello
//  stato resta consultabile nel box «Opzione errore» in fondo. Righe per tipologia camera
//  espandibili ("Mostra dettagli"): dentro, le regole per periodo stagionale
//  con limit/protection editabili e cestino con conferma. La creazione passa
//  dal Modal condiviso; il salvataggio dalla CfgSaveBar.

const PANE_ID = 'overbooking-limit'

export default function OverbookingLimit({ onGoTo }: CfgPaneComponentProps) {
  // Periodi = stagionalità dal Pannello di Controllo (elenco dinamico)
  const [catalogo, setCatalogo] = useState<StagioneDef[]>([])
  useEffect(() => {
    let cancelled = false
    fetchStagioniCatalogo().then(list => { if (!cancelled) setCatalogo(list) })
    return () => { cancelled = true }
  }, [])
  const stagioneById = useMemo(() => new Map(catalogo.map(s => [s.id, s])), [catalogo])

  const saved   = useOverbookingStore(s => s.regole)
  const persist = useOverbookingStore(s => s.salva)
  const [regole, setRegole] = useState<RegolaOverbooking[]>(() => saved.map(r => ({ ...r })))

  const [aperte, setAperte] = useState<Set<string>>(() => new Set())
  const [modalOpen, setModalOpen] = useState(false)

  // ── Gruppi per tipologia camera (righe espandibili)
  const gruppi = useMemo(() => {
    const byTipo = new Map<string, RegolaOverbooking[]>()
    for (const r of regole) {
      const list = byTipo.get(r.tipologia) ?? []
      list.push(r)
      byTipo.set(r.tipologia, list)
    }
    return Array.from(byTipo.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tipologia, rs]) => ({
        tipologia,
        regole: rs.sort((a, b) => (stagioneById.get(a.stagioneId)?.ordine ?? 99) - (stagioneById.get(b.stagioneId)?.ordine ?? 99)),
        maxLimit: Math.max(...rs.map(r => r.limit)),
        maxProtection: Math.max(...rs.map(r => r.protection)),
      }))
  }, [regole, stagioneById])

  const toggleGruppo = (tipologia: string) =>
    setAperte(prev => {
      const next = new Set(prev)
      if (next.has(tipologia)) next.delete(tipologia)
      else next.add(tipologia)
      return next
    })

  const aggiorna = (id: string, campo: 'limit' | 'protection', v: number) =>
    setRegole(rs => rs.map(r => r.id === id ? { ...r, [campo]: v } : r))

  const confirm = useConfirmStore(s => s.confirm)
  const elimina = async (r: RegolaOverbooking) => {
    const stagione = stagioneById.get(r.stagioneId)?.nome ?? r.stagioneId
    const ok = await confirm({
      title: 'Elimina regola',
      message: `Eliminare la regola di overbooking per ${r.tipologia} — ${stagione}?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setRegole(rs => rs.filter(x => x.id !== r.id))
  }

  const aggiungi = (nuova: Omit<RegolaOverbooking, 'id'>) => {
    setRegole(rs => [...rs, { ...nuova, id: `ovb-${Date.now()}` }])
    setAperte(prev => new Set(prev).add(nuova.tipologia))
    setModalOpen(false)
  }

  // ── Dirty state + save bar
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const dirtyCount = useMemo(() => {
    const savedById = new Map(saved.map(r => [r.id, r]))
    let count = 0
    for (const r of regole) {
      const s = savedById.get(r.id)
      if (!s) { count += 1; continue }
      if (s.limit !== r.limit || s.protection !== r.protection) count += 1
    }
    const draftIds = new Set(regole.map(r => r.id))
    count += saved.filter(r => !draftIds.has(r.id)).length
    return count
  }, [regole, saved])

  useEffect(() => { markDirty(PANE_ID, dirtyCount) }, [dirtyCount, markDirty])

  const salva = async () => {
    // Persistenza mock (demo senza backend): latenza simulata + store persistito.
    await new Promise(resolve => setTimeout(resolve, 450))
    persist(regole)
    setCompletion(PANE_ID, regole.length > 0 ? 'configured' : 'empty')
    resetDirty()
  }

  const annulla = () => {
    setRegole(saved.map(r => ({ ...r })))
    resetDirty()
  }

  return (
    <div className="ovb-limit">
      <CfgToolbar
        actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setModalOpen(true)}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" />
            Aggiungi regola
          </button>
        }
      >
        <SelectField
          name="struttura"
          label="Struttura"
          value=""
          onChange={() => { /* struttura unica nel profilo demo */ }}
          options={[{ value: '', label: 'Hotel Tutorial' }]}
        />
      </CfgToolbar>

      <CfgTable
        className="ovb-limit__table"
        columns={[
          { key: 'tipologia',  label: 'Tipologia camera',   width: '34%' },
          { key: 'periodi',    label: 'Periodi',            width: '16%', align: 'center' },
          { key: 'limit',      label: 'OverBooking limit',  width: '17%', align: 'right' },
          { key: 'protection', label: 'Protection',         width: '15%', align: 'right' },
          { key: 'azioni',     label: '',                   width: '18%', align: 'right' },
        ]}
        empty={<span>Nessuna regola configurata: aggiungi la prima regola per tipologia camera e periodo stagionale.</span>}
      >
        {gruppi.flatMap(g => {
          const aperta = aperte.has(g.tipologia)
          const main = (
            <tr
              key={g.tipologia}
              className={clsx('ovb-limit__row', aperta && 'ovb-limit__row--aperta')}
              onClick={() => toggleGruppo(g.tipologia)}
            >
              <td className="ovb-limit__td-tipo">
                <TruncatedText text={g.tipologia} className="ovb-limit__tipo-testo" />
              </td>
              <td className="ovb-limit__td-center">{g.regole.length}</td>
              <td className="ovb-limit__td-num">fino al {g.maxLimit}%</td>
              <td className="ovb-limit__td-num">fino al {g.maxProtection}%</td>
              <td className="ovb-limit__td-azioni">
                <button
                  type="button"
                  className="ovb-limit__toggle"
                  aria-expanded={aperta}
                  onClick={(e) => { e.stopPropagation(); toggleGruppo(g.tipologia) }}
                >
                  {aperta ? 'Nascondi dettagli' : 'Mostra dettagli'}
                  <i className={clsx('fa-light', aperta ? 'fa-chevron-up' : 'fa-chevron-down')} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )
          if (!aperta) return [main]
          const dettaglio = (
            <tr key={`${g.tipologia}-dettaglio`} className="ovb-limit__dettaglio-row">
              <td colSpan={5}>
                <div className="ovb-limit__dettaglio">
                  {g.regole.map(r => {
                    const stagione = stagioneById.get(r.stagioneId)
                    return (
                      <div key={r.id} className="ovb-limit__regola">
                        <span
                          className="ovb-limit__periodo"
                          /* --stag-c: colore della stagione */
                          style={{ ['--stag-c' as any]: stagione?.colore ?? 'var(--color-border)' }}
                        >
                          <span className="ovb-limit__periodo-dot" aria-hidden="true" />
                          {stagione?.nome ?? r.stagioneId}
                        </span>
                        <label className="ovb-limit__campo">
                          <span className="ovb-limit__campo-label">OverBooking limit</span>
                          <span className="ovb-limit__campo-cell">
                            <InputField
                              name={`ovb-limit-${r.id}`}
                              type="number"
                              dense
                              min={0}
                              max={100}
                              className="ovb-limit__campo-input"
                              value={r.limit}
                              onChange={(e) => aggiorna(r.id, 'limit', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                              ariaLabel={`OverBooking limit ${g.tipologia} ${stagione?.nome ?? ''}`}
                            />
                            <span className="ovb-limit__unit">%</span>
                          </span>
                        </label>
                        <label className="ovb-limit__campo">
                          <span className="ovb-limit__campo-label">Protection</span>
                          <span className="ovb-limit__campo-cell">
                            <InputField
                              name={`ovb-protection-${r.id}`}
                              type="number"
                              dense
                              min={0}
                              max={100}
                              className="ovb-limit__campo-input"
                              value={r.protection}
                              onChange={(e) => aggiorna(r.id, 'protection', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                              ariaLabel={`Protection ${g.tipologia} ${stagione?.nome ?? ''}`}
                            />
                            <span className="ovb-limit__unit">%</span>
                          </span>
                        </label>
                        <button
                          type="button"
                          className="sib-btn sib-btn--icon ovb-limit__del"
                          aria-label={`Elimina regola ${g.tipologia} ${stagione?.nome ?? ''}`}
                          onClick={() => { void elimina(r) }}
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </td>
            </tr>
          )
          return [main, dettaglio]
        })}
      </CfgTable>
      <p className="ovb-limit__totale">
        {regole.length === 1 ? '1 regola' : `${regole.length} regole`} su {gruppi.length} tipologie camera · i periodi sono le stagionalità applicate.
      </p>

      {modalOpen && (
        <CreaRegolaModal
          catalogo={catalogo}
          regole={regole}
          onClose={() => setModalOpen(false)}
          onSave={aggiungi}
        />
      )}

      <CfgOpzioneErrore
        paneLabel="Overbooking limit"
        requirementLabel="Stagionalità"
        reason="Richiede la Stagionalità configurata e applicata: il limite di overbooking si definisce sui periodi stagionali."
        onGoToRequirement={onGoTo ? () => onGoTo('stagionalita') : undefined}
      />

      <CfgSaveBar
        count={dirtyCount}
        onSave={salva}
        onCancel={annulla}
        successMessage="Overbooking limit salvato"
      />
    </div>
  )
}

// ─── Modale di creazione (Modal condiviso) ────────────────────────────────────

function CreaRegolaModal({ catalogo, regole, onClose, onSave }: {
  catalogo: StagioneDef[]
  regole: RegolaOverbooking[]
  onClose: () => void
  onSave: (r: Omit<RegolaOverbooking, 'id'>) => void
}) {
  const [tipologia, setTipologia] = useState(TIPOLOGIE_CAMERA_OVB[0])
  const [stagioneId, setStagioneId] = useState('')
  const [limit, setLimit] = useState(5)
  const [protection, setProtection] = useState(2)

  const duplicata = stagioneId !== ''
    && regole.some(r => r.tipologia === tipologia && r.stagioneId === stagioneId)

  return (
    <Modal open onClose={onClose} title="Crea overbooking limit" size="lg" className="ovb-limit-modal">
      <div className="ovb-limit-modal__grid">
        <SelectField
          name="tipologia"
          label="Tipologia camera"
          value={tipologia}
          onChange={(e) => setTipologia(e.target.value)}
          options={TIPOLOGIE_CAMERA_OVB.map(t => ({ value: t, label: t }))}
        />
        <SelectField
          name="periodo"
          label="Periodo (stagionalità)"
          value={stagioneId}
          placeholder={catalogo.length > 0 ? 'Seleziona periodo' : 'Caricamento…'}
          disabled={catalogo.length === 0}
          error={duplicata ? 'Regola già presente per questa tipologia e periodo.' : undefined}
          onChange={(e) => setStagioneId(e.target.value)}
          options={catalogo.map(s => ({ value: s.id, label: s.nome }))}
        />
        <InputField
          name="limit"
          label="OverBooking limit (%)"
          type="number"
          min={0}
          max={100}
          value={limit}
          onChange={(e) => setLimit(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        />
        <InputField
          name="protection"
          label="Protection (%)"
          type="number"
          min={0}
          max={100}
          value={protection}
          onChange={(e) => setProtection(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        />
      </div>
      <footer className="ovb-limit-modal__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          disabled={!stagioneId || duplicata}
          onClick={() => onSave({ tipologia, stagioneId, limit, protection })}
        >
          Aggiungi
        </button>
      </footer>
    </Modal>
  )
}
