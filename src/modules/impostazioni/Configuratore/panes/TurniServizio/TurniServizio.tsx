import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CfgToolbar, CfgTable } from '../../../../../core/cfg'
import { SelectField, InputField, ToggleSwitch } from '../../../../../core/components/form'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import { useSaleStore } from '../../../../../store/useSaleStore'
import {
  useTurniServizioStore,
  turniOrdinati,
  turnoInConflitto,
  servizioMeta,
  minuti,
  SERVIZI_TURNO,
  type ServizioTurno,
  type Turno,
} from '../../../../../store/useTurniServizioStore'
import './TurniServizio.sass'

// ─── TURNI DI SERVIZIO (F&B) ──────────────────────────────────────────────────
//  Orari e copertura per Colazione, Pranzo e Cena: un servizio può avere più
//  turni e ogni turno vale per tutte le sale o per una sola. Le sale sono
//  quelle definite in Configuratore → F&B → Sale e tavoli (useSaleStore), non
//  un elenco proprio. Creazione e modifica passano dalla stessa modale.

const PANE_ID = 'fb-turni'

const OUTLET = [{ id: 1, nome: 'Sibylla Restaurant' }]

// Orari a passo di 15 minuti: i turni di servizio si spostano a quarti d'ora
const ORARI: string[] = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0')
  const m = String((i % 4) * 15).padStart(2, '0')
  return `${h}:${m}`
})

interface TurnoForm {
  servizio: ServizioTurno
  nome: string
  sala: string
  inizio: string
  fine: string
  maxPax: string
}

const FORM_VUOTO: TurnoForm = {
  servizio: 'pranzo', nome: '', sala: '', inizio: '12:00', fine: '15:00', maxPax: '0',
}

export default function TurniServizio() {
  const turni       = useTurniServizioStore(s => s.turni)
  const addTurno    = useTurniServizioStore(s => s.addTurno)
  const updateTurno = useTurniServizioStore(s => s.updateTurno)
  const removeTurno = useTurniServizioStore(s => s.removeTurno)
  const toggleTurno = useTurniServizioStore(s => s.toggleTurno)
  const sale        = useSaleStore(s => s.sale)
  const confirm     = useConfirmStore(s => s.confirm)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [outletId, setOutletId] = useState(OUTLET[0].id)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<TurnoForm>(FORM_VUOTO)

  const righe = useMemo(() => turniOrdinati(turni, outletId), [turni, outletId])

  const saleOptions = useMemo(
    () => [{ value: '', label: '— Tutte le sale —' }, ...sale.map(s => ({ value: s.nome, label: s.nome }))],
    [sale],
  )

  const upd = <K extends keyof TurnoForm>(k: K, v: TurnoForm[K]) => setForm(f => ({ ...f, [k]: v }))

  const apriNuovo = () => {
    setEditId(null)
    setForm(FORM_VUOTO)
    setModalOpen(true)
  }

  const apriModifica = (t: Turno) => {
    setEditId(t.id)
    setForm({
      servizio: t.servizio, nome: t.nome, sala: t.sala,
      inizio: t.inizio, fine: t.fine, maxPax: String(t.maxPax),
    })
    setModalOpen(true)
  }

  // Validazione: nome, orari coerenti e nessuna sovrapposizione nello stesso
  // servizio e nella stessa sala
  const oreCoerenti = minuti(form.fine) > minuti(form.inizio)
  const candidato: Turno = {
    id: editId ?? '__nuovo',
    outletId,
    servizio: form.servizio,
    nome: form.nome.trim(),
    sala: form.sala,
    inizio: form.inizio,
    fine: form.fine,
    maxPax: parseInt(form.maxPax, 10) || 0,
    attivo: true,
  }
  const conflitto = oreCoerenti ? turnoInConflitto(turni, candidato) : null
  const salvabile = !!form.nome.trim() && oreCoerenti && !conflitto

  const salva = () => {
    if (!salvabile) return
    if (editId) {
      updateTurno(editId, { ...candidato, id: editId })
      toast.success(`Turno «${candidato.nome}» aggiornato`)
    } else {
      addTurno({ ...candidato, attivo: true })
      toast.success(`Turno «${candidato.nome}» creato`)
    }
    setCompletion(PANE_ID, 'configured')
    setModalOpen(false)
  }

  const elimina = async (t: Turno) => {
    const ok = await confirm({
      title: 'Elimina turno',
      message: `Eliminare il turno «${t.nome}» di ${servizioMeta(t.servizio).label} (${t.inizio}–${t.fine})?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (!ok) return
    removeTurno(t.id)
    toast.success('Turno eliminato')
  }

  return (
    <div className="turni-serv">
      <CfgToolbar
        actions={(
          <button type="button" className="sib-btn sib-btn--primary" onClick={apriNuovo}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Nuovo turno
          </button>
        )}
      >
        <SelectField
          name="outlet"
          label="Outlet"
          value={outletId}
          onChange={(e) => setOutletId(Number(e.target.value))}
          options={OUTLET.map(o => ({ value: o.id, label: `${o.id} - ${o.nome}` }))}
        />
      </CfgToolbar>

      <CfgTable
        columns={[
          { key: 'servizio', label: 'Servizio', width: '15%' },
          { key: 'nome',     label: 'Nome',     width: '19%' },
          { key: 'sala',     label: 'Sala',     width: '17%' },
          { key: 'inizio',   label: 'Inizio',   width: '9%', align: 'right' },
          { key: 'fine',     label: 'Fine',     width: '9%', align: 'right' },
          { key: 'maxpax',   label: 'Max pax',  width: '10%', align: 'right' },
          { key: 'stato',    label: 'Stato',    width: '11%' },
          { key: 'azioni',   label: 'Azioni',   width: '10%', align: 'right' },
        ]}
        empty={<span>Nessun turno configurato per questo outlet: creane uno con «Nuovo turno».</span>}
      >
        {righe.map(t => {
          const meta = servizioMeta(t.servizio)
          return (
            <tr key={t.id} className={clsx(!t.attivo && 'turni-serv__row--off')}>
              <td>
                <span
                  className="turni-serv__servizio"
                  style={{ ['--srv-c' as any]: meta.colore }}
                >
                  <span className="turni-serv__servizio-dot" aria-hidden="true" />
                  {meta.label}
                </span>
              </td>
              <td className="turni-serv__td-nome">{t.nome}</td>
              <td className="turni-serv__td-sala">{t.sala || 'Tutte'}</td>
              <td className="turni-serv__td-num">{t.inizio}</td>
              <td className="turni-serv__td-num">{t.fine}</td>
              <td className="turni-serv__td-num">{t.maxPax > 0 ? t.maxPax : '—'}</td>
              <td>
                <ToggleSwitch
                  checked={t.attivo}
                  label={t.attivo ? 'Attivo' : 'Disattivo'}
                  onChange={() => toggleTurno(t.id)}
                />
              </td>
              <td className="turni-serv__td-azioni">
                <Tooltip content="Modifica turno">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => apriModifica(t)}
                    aria-label={`Modifica il turno ${t.nome} di ${meta.label}`}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                </Tooltip>
                <Tooltip content="Elimina turno">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => elimina(t)}
                    aria-label={`Elimina il turno ${t.nome} di ${meta.label}`}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          )
        })}
      </CfgTable>

      <p className="turni-serv__nota">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Le sale sono quelle definite in «Sale e tavoli»; un turno senza sala vale per tutte.
        Copertura 0 = illimitata.
      </p>

      {modalOpen && (
        <Modal
          open
          onClose={() => setModalOpen(false)}
          title={editId ? 'Modifica turno' : 'Nuovo turno'}
          size="md"
        >
          <div className="turni-serv__form">
            <div className="turni-serv__form-grid">
              <SelectField
                name="servizio"
                label="Servizio"
                value={form.servizio}
                onChange={(e) => upd('servizio', e.target.value as ServizioTurno)}
                options={SERVIZI_TURNO.map(s => ({ value: s.id, label: s.label }))}
              />
              <InputField
                name="nome"
                label="Nome turno"
                required
                value={form.nome}
                placeholder="es. Turno 1"
                onChange={(e) => upd('nome', e.target.value)}
              />
              <SelectField
                className="turni-serv__form-full"
                name="sala"
                label="Sala (vuoto = tutte)"
                value={form.sala}
                onChange={(e) => upd('sala', e.target.value)}
                options={saleOptions}
              />
              <SelectField
                name="inizio"
                label="Ora inizio"
                value={form.inizio}
                onChange={(e) => upd('inizio', e.target.value)}
                options={ORARI.map(o => ({ value: o, label: o }))}
              />
              <SelectField
                name="fine"
                label="Ora fine"
                value={form.fine}
                onChange={(e) => upd('fine', e.target.value)}
                options={ORARI.map(o => ({ value: o, label: o }))}
              />
              <InputField
                className="turni-serv__form-full"
                name="maxPax"
                label="Copertura max (0 = illimitata)"
                type="number"
                min={0}
                value={form.maxPax}
                onChange={(e) => upd('maxPax', e.target.value)}
              />
            </div>

            {!oreCoerenti && (
              <p className="turni-serv__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                L'ora di fine deve essere successiva a quella di inizio.
              </p>
            )}
            {conflitto && (
              <p className="turni-serv__errore">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                Si accavalla con «{conflitto.nome}» ({conflitto.inizio}–{conflitto.fine})
                {conflitto.sala ? ` nella sala ${conflitto.sala}` : ' su tutte le sale'}.
              </p>
            )}

            <div className="turni-serv__form-foot">
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
