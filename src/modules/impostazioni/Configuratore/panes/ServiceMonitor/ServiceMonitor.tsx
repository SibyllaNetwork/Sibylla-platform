import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgEmpty } from '../../../../../core/cfg'
import { SelectField, InputField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useVociMenuStore, OUTLET_FB } from '../../../../../store/useVociMenuStore'
import {
  useServiceMonitorStore,
  monitorOrdinati,
  repartoMonitorMeta,
  monitorUrl,
  slugDaNome,
  REPARTI_MONITOR,
  REFRESH_MONITOR,
  type Monitor,
  type RepartoMonitor,
} from '../../../../../store/useServiceMonitorStore'
import type { CfgPaneComponentProps } from '../../Configuratore'
import './ServiceMonitor.sass'

// ─── SERVICE MONITOR (F&B) ────────────────────────────────────────────────────
//  I display KDS di reparto: ogni monitor è un URL da aprire sul tablet in
//  cucina o al bar. Rispetto alla pagina precedente:
//   • ogni card dice quante voci di menu sono instradate su quel monitor: un
//     monitor senza voci resterebbe vuoto in servizio, e ora si vede prima;
//   • l'intervallo di aggiornamento è un campo, non un numero fisso nel codice;
//   • il reparto è un dato scelto da un elenco e dà il colore della card, così
//     in una parete di display si riconosce a colpo d'occhio quale è quale.

const PANE_ID = 'fb-service-monitor'
const TUTTI = 'tutti'

interface Form {
  nome: string
  reparto: RepartoMonitor
  outletId: number
  refreshSec: number
}

const FORM_VUOTO: Form = {
  nome: '', reparto: 'cucina', outletId: OUTLET_FB[0].id, refreshSec: 15,
}

export default function ServiceMonitor({ onGoTo }: CfgPaneComponentProps) {
  const monitor       = useServiceMonitorStore(s => s.monitor)
  const addMonitor    = useServiceMonitorStore(s => s.addMonitor)
  const updateMonitor = useServiceMonitorStore(s => s.updateMonitor)
  const removeMonitor = useServiceMonitorStore(s => s.removeMonitor)
  const toggleMonitor = useServiceMonitorStore(s => s.toggleMonitor)
  const voci    = useVociMenuStore(s => s.voci)
  const confirm = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [outlet, setOutlet] = useState<number | typeof TUTTI>(TUTTI)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(FORM_VUOTO)

  const lista = useMemo(
    () => monitorOrdinati(monitor, outlet === TUTTI ? 'tutti' : outlet),
    [monitor, outlet],
  )

  /** Quante voci di menu sono instradate su ciascun monitor. */
  const conteggi = useMemo(() => {
    const m = new Map<string, number>()
    voci.forEach(v => new Set(v.monitor.map(r => r.monitorId))
      .forEach(id => m.set(id, (m.get(id) ?? 0) + 1)))
    return m
  }, [voci])

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const apriNuovo = () => {
    setEditId(null)
    setForm({ ...FORM_VUOTO, outletId: outlet === TUTTI ? OUTLET_FB[0].id : outlet })
    setModalOpen(true)
  }

  const apriModifica = (m: Monitor) => {
    setEditId(m.id)
    setForm({ nome: m.nome, reparto: m.reparto, outletId: m.outletId, refreshSec: m.refreshSec })
    setModalOpen(true)
  }

  const nomeDuplicato = monitor.some(m =>
    m.id !== editId && m.nome.trim().toLowerCase() === form.nome.trim().toLowerCase())
  const salvabile = !!form.nome.trim() && !nomeDuplicato

  const salva = () => {
    if (!salvabile) return
    const dati = {
      nome: form.nome.trim(),
      reparto: form.reparto,
      outletId: form.outletId,
      refreshSec: form.refreshSec,
    }
    if (editId) {
      updateMonitor(editId, dati)
      toast.success(`Monitor «${dati.nome}» aggiornato`)
    } else {
      // Lo slug si genera al primo salvataggio e non cambia più: è l'indirizzo
      // già impostato sul display in reparto.
      addMonitor({
        ...dati,
        slug: slugDaNome(dati.nome, repartoMonitorMeta(dati.reparto).label),
        attivo: true,
      })
      toast.success(`Monitor «${dati.nome}» creato`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (m: Monitor) => {
    const usato = conteggi.get(m.id) ?? 0
    const ok = await confirm({
      title: 'Elimina monitor',
      message: usato > 0
        ? `Su «${m.nome}» sono instradate ${usato} voci di menu: eliminandolo quei piatti non compariranno più su nessun display. Procedere?`
        : `Eliminare il monitor «${m.nome}»? L'URL già impostato sul display non funzionerà più.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeMonitor(m.id)
    toast.success('Monitor eliminato')
  }

  const copiaUrl = async (m: Monitor) => {
    try {
      if (!navigator.clipboard) throw new Error('appunti non disponibili')
      await navigator.clipboard.writeText(monitorUrl(m))
      toast.success('URL copiato')
    } catch {
      toast.error("Copia non riuscita: seleziona l'URL e copialo a mano")
    }
  }

  return (
    <div className="srv-monitor">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuovo monitor
          </button>
        )}
      >
        <SelectField
          name="outlet"
          label="Outlet"
          value={outlet}
          onChange={(e) => setOutlet(e.target.value === TUTTI ? TUTTI : Number(e.target.value))}
          options={[
            { value: TUTTI, label: 'Tutti gli outlet' },
            ...OUTLET_FB.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` })),
          ]}
        />
      </CfgToolbar>

      {lista.length === 0 ? (
        <CfgEmpty
          icon="display"
          title="Nessun monitor configurato"
          subtitle="Crea un monitor per ogni display di reparto: cucina, bar, pasticceria."
          action={(
            <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Nuovo monitor
            </button>
          )}
        />
      ) : (
        <div className="srv-monitor__list">
          {lista.map(m => {
            const meta = repartoMonitorMeta(m.reparto)
            const usato = conteggi.get(m.id) ?? 0
            const url = monitorUrl(m)
            return (
              <article
                key={m.id}
                className={clsx('srv-monitor__card', !m.attivo && 'srv-monitor__card--off')}
                style={{ ['--mon-c' as any]: meta.colore }}
              >
                <header className="srv-monitor__head">
                  <div className="srv-monitor__head-titles">
                    <h3 className="srv-monitor__title">{m.nome}</h3>
                    <p className="srv-monitor__sub">
                      {meta.label} · {m.outletId} - {OUTLET_FB.find(o => o.id === m.outletId)?.nome}
                    </p>
                  </div>
                  <i className="fa-solid fa-display srv-monitor__head-ico" aria-hidden="true" />
                </header>

                <div className="srv-monitor__body">
                  <div className="srv-monitor__row">
                    <ToggleSwitch
                      checked={m.attivo}
                      label={m.attivo ? 'Attivo' : 'Disattivo'}
                      onChange={() => toggleMonitor(m.id)}
                    />
                    <span className="srv-monitor__refresh">
                      <i className="fa-light fa-rotate" aria-hidden="true" />
                      ogni {m.refreshSec} s
                    </span>
                  </div>

                  <p className={clsx('srv-monitor__voci', usato === 0 && 'srv-monitor__voci--vuoto')}>
                    <i
                      className={usato === 0
                        ? 'fa-solid fa-triangle-exclamation'
                        : 'fa-light fa-utensils'}
                      aria-hidden="true"
                    />
                    {usato === 0
                      ? 'Nessuna voce instradata: in servizio resterebbe vuoto'
                      : usato === 1
                        ? '1 voce di menu instradata qui'
                        : `${usato} voci di menu instradate qui`}
                  </p>

                  <div className="srv-monitor__url-box">
                    <span className="srv-monitor__url-label">URL del monitor</span>
                    <code className="srv-monitor__url">{url}</code>
                    <div className="srv-monitor__url-actions">
                      <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => copiaUrl(m)}>
                        <i className="fa-solid fa-copy" aria-hidden="true" />
                        Copia
                      </button>
                      <button
                        type="button"
                        className="sib-btn sib-btn--secondary sib-btn--sm"
                        onClick={() => window.open(url, '_blank', 'noopener')}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                        Apri
                      </button>
                    </div>
                  </div>

                  <div className="srv-monitor__actions">
                    <Tooltip content="Modifica il monitor">
                      <button
                        type="button" className="sib-btn sib-btn--icon"
                        onClick={() => apriModifica(m)}
                        aria-label={`Modifica ${m.nome}`}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Elimina il monitor">
                      <button
                        type="button" className="sib-btn sib-btn--icon"
                        onClick={() => elimina(m)}
                        aria-label={`Elimina ${m.nome}`}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <p className="srv-monitor__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Ogni monitor genera un URL univoco da impostare sul display del reparto: la pagina
        mostra le comande attive dell'outlet e si aggiorna da sé nell'intervallo indicato.
        I piatti si instradano voce per voce
        {onGoTo ? (
          <> in{' '}
            <button type="button" className="srv-monitor__link" onClick={() => onGoTo('fb-voci-menu')}>
              Voci menu
            </button>.
          </>
        ) : ' in «Voci menu».'}
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica monitor' : 'Nuovo monitor'}
          size="md"
        >
          <div className="srv-monitor__form">
            <div className="srv-monitor__form-grid">
              <InputField
                className="srv-monitor__form-full"
                name="nome"
                label="Nome del monitor"
                required
                value={form.nome}
                placeholder="es. KDS Cucina - Primi"
                error={nomeDuplicato ? 'Esiste già un monitor con questo nome.' : undefined}
                onChange={(e) => upd('nome', e.target.value)}
              />
              <SelectField
                name="reparto"
                label="Reparto"
                value={form.reparto}
                onChange={(e) => upd('reparto', e.target.value as RepartoMonitor)}
                options={REPARTI_MONITOR.map(r => ({ value: r.id, label: r.label }))}
              />
              <SelectField
                name="outlet"
                label="Outlet"
                value={form.outletId}
                onChange={(e) => upd('outletId', Number(e.target.value))}
                options={OUTLET_FB.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` }))}
              />
              <SelectField
                name="refresh"
                label="Aggiornamento"
                value={form.refreshSec}
                onChange={(e) => upd('refreshSec', Number(e.target.value))}
                options={REFRESH_MONITOR.map(s => ({ value: s, label: `ogni ${s} secondi` }))}
              />
            </div>
            {editId && (
              <p className="srv-monitor__avviso">
                <i className="fa-solid fa-link" aria-hidden="true" />
                L'URL del monitor non cambia: il display già impostato in reparto continua a funzionare.
              </p>
            )}
            <div className="srv-monitor__form-foot">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModalOpen(false)}>
                Annulla
              </button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
                Salva
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
