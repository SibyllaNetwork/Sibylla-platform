import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField, ToggleSwitch } from '../../../../../core/components/form'
import { CfgToolbar, CfgTable, CfgSaveBar, CfgMultiSelect } from '../../../../../core/cfg'
import Tooltip from '../../../../../core/components/Tooltip'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useConfiguratoreStore } from '../../../../../store/useConfiguratoreStore'
import './ConfiguraOutlet.sass'

// ─── CONFIGURA OUTLET (§4.22) ─────────────────────────────────────────────────
//  Sale e turni di servizio degli outlet. Il gating «outlet non creato →
//  configuratore bloccato» vive nel registry (requires: fb-outlet) e viene
//  reso dalla shell con CfgLocked + CTA verso la creazione dell'outlet.
//  Qui rispetto al pane precedente:
//   • toggle riscritti a mano → ToggleSwitch condiviso;
//   • tabelle su CfgTable, azioni collegate (modifica, duplica, elimina con
//     conferma) al posto dei cestini inerti;
//   • form «Aggiungi turno» davvero cablato allo stato (prima non lo era);
//   • salvataggio su CfgSaveBar con dirty state.

const PANE_ID = 'configura-outlet'

interface Sala { id: number; nome: string; tavoli: number; pax: number; attivo: boolean }
interface Turno { id: number; nome: string; servizio: string; dalle: string; alle: string; sale: string[]; attivo: boolean }

interface Data {
  Outlet: { Id: number; nome: string }[]
  OutletId: number | null
  sale: Sala[]
  turniEnabled: boolean
  turni: Turno[]
}

const SERVIZI = ['Colazione', 'Pranzo', 'Cena']

// Orari selezionabili con intervalli di 30 minuti
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

const FALLBACK: Data = {
  Outlet: [{ Id: 1, nome: 'Ristorante Hotel Cristallo' }],
  OutletId: 1,
  // Un outlet può avere molte sale: il seed ne porta abbastanza per verificare
  // che l'elenco nel form dei turni regga (multiselect con pannello a scroll).
  sale: [
    { id: 1, nome: 'Melissa',          tavoli: 50, pax: 200, attivo: true  },
    { id: 2, nome: 'Marcella',         tavoli: 24, pax: 90,  attivo: true  },
    { id: 3, nome: 'Eleonora',         tavoli: 12, pax: 40,  attivo: false },
    { id: 4, nome: 'Veranda',          tavoli: 18, pax: 72,  attivo: true  },
    { id: 5, nome: 'Terrazza Mare',    tavoli: 22, pax: 88,  attivo: true  },
    { id: 6, nome: 'Sala Camino',      tavoli: 10, pax: 36,  attivo: true  },
    { id: 7, nome: 'Giardino d\'inverno', tavoli: 16, pax: 60, attivo: true },
    { id: 8, nome: 'Bistrot',          tavoli: 14, pax: 48,  attivo: true  },
    { id: 9, nome: 'Sala Privé',       tavoli: 4,  pax: 16,  attivo: true  },
    { id: 10, nome: 'Bordo Piscina',   tavoli: 20, pax: 80,  attivo: false },
  ],
  turniEnabled: true,
  turni: [
    { id: 1, nome: '1 Feriali Estivo', servizio: 'Pranzo', dalle: '13:00', alle: '14:00', sale: ['Melissa', 'Marcella'], attivo: true },
  ],
}

interface Snapshot { sale: Sala[]; turniEnabled: boolean; turni: Turno[] }

function countChanges(saved: Snapshot, draft: Snapshot): number {
  let n = (saved.turniEnabled !== draft.turniEnabled ? 1 : 0)
    + Math.abs(saved.sale.length - draft.sale.length)
    + Math.abs(saved.turni.length - draft.turni.length)
  const ls = Math.min(saved.sale.length, draft.sale.length)
  for (let i = 0; i < ls; i++) {
    if (JSON.stringify(saved.sale[i]) !== JSON.stringify(draft.sale[i])) n++
  }
  const lt = Math.min(saved.turni.length, draft.turni.length)
  for (let i = 0; i < lt; i++) {
    if (JSON.stringify(saved.turni[i]) !== JSON.stringify(draft.turni[i])) n++
  }
  return n
}

const EMPTY_SALA_FORM  = { nome: '', tavoli: '', pax: '' }
const EMPTY_TURNO_FORM = { nome: '', servizio: 'Pranzo', dalle: '12:30', alle: '14:00', sale: [] as string[] }

export default function ConfiguraOutlet() {
  const confirm       = useConfirmStore(s => s.confirm)
  const markDirty     = useConfiguratoreStore(s => s.markDirty)
  const resetDirty    = useConfiguratoreStore(s => s.resetDirty)
  const setCompletion = useConfiguratoreStore(s => s.setCompletion)

  const [outlet, setOutlet]     = useState(FALLBACK.Outlet)
  const [outletId, setOutletId] = useState<number | null>(FALLBACK.OutletId)

  const initialSnap: Snapshot = { sale: FALLBACK.sale, turniEnabled: FALLBACK.turniEnabled, turni: FALLBACK.turni }
  const [saved, setSaved] = useState<Snapshot>(initialSnap)
  const [draft, setDraft] = useState<Snapshot>(initialSnap)

  // Form Sala (aggiunta / modifica)
  const [salaFormOpen, setSalaFormOpen] = useState(false)
  const [salaEditId, setSalaEditId]     = useState<number | null>(null)
  const [salaForm, setSalaForm]         = useState(EMPTY_SALA_FORM)

  // Form Turno (aggiunta / modifica) — cablato allo stato
  const [turnoEditId, setTurnoEditId] = useState<number | null>(null)
  const [turnoForm, setTurnoForm]     = useState(EMPTY_TURNO_FORM)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetConfiguraOutlet', { method: 'POST', body: {} })
      .then((d) => {
        if (cancelled || !Array.isArray(d?.sale)) return
        setOutlet(d.Outlet ?? [])
        setOutletId(d.OutletId ?? null)
        const snap: Snapshot = { sale: d.sale, turniEnabled: !!d.turniEnabled, turni: d.turni ?? [] }
        setSaved(snap)
        setDraft(snap)
      })
      .catch(() => { /* backend assente in demo: restano i dati di fallback */ })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => countChanges(saved, draft), [saved, draft])
  useEffect(() => { markDirty(PANE_ID, dirty) }, [dirty, markDirty])
  useEffect(() => () => { resetDirty() }, [resetDirty])

  // ── Sale ─────────────────────────────────────────────────────────────────────
  const openSalaForm = (sala?: Sala) => {
    setSalaEditId(sala?.id ?? null)
    setSalaForm(sala
      ? { nome: sala.nome, tavoli: String(sala.tavoli), pax: String(sala.pax) }
      : EMPTY_SALA_FORM)
    setSalaFormOpen(true)
  }

  const confirmSala = () => {
    const nome = salaForm.nome.trim()
    if (!nome) return
    setDraft(d => {
      if (salaEditId != null) {
        const prevNome = d.sale.find(s => s.id === salaEditId)?.nome
        return {
          ...d,
          sale: d.sale.map(s => s.id === salaEditId
            ? { ...s, nome, tavoli: Number(salaForm.tavoli) || 0, pax: Number(salaForm.pax) || 0 }
            : s),
          // I turni che citavano la sala rinominata seguono il nuovo nome
          turni: prevNome && prevNome !== nome
            ? d.turni.map(t => ({ ...t, sale: t.sale.map(n => n === prevNome ? nome : n) }))
            : d.turni,
        }
      }
      const nextId = d.sale.reduce((max, s) => Math.max(max, s.id), 0) + 1
      return {
        ...d,
        sale: [...d.sale, { id: nextId, nome, tavoli: Number(salaForm.tavoli) || 0, pax: Number(salaForm.pax) || 0, attivo: true }],
      }
    })
    setSalaFormOpen(false)
    setSalaEditId(null)
    setSalaForm(EMPTY_SALA_FORM)
  }

  const removeSala = async (sala: Sala) => {
    const ok = await confirm({
      title: 'Elimina sala',
      message: `Eliminare la sala «${sala.nome}»? Verrà rimossa anche dai turni che la utilizzano.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) {
      setDraft(d => ({
        ...d,
        sale: d.sale.filter(s => s.id !== sala.id),
        turni: d.turni.map(t => ({ ...t, sale: t.sale.filter(n => n !== sala.nome) })),
      }))
    }
  }

  // ── Turni ────────────────────────────────────────────────────────────────────
  const openTurnoForm = (turno?: Turno) => {
    setTurnoEditId(turno?.id ?? null)
    setTurnoForm(turno
      ? { nome: turno.nome, servizio: turno.servizio, dalle: turno.dalle, alle: turno.alle, sale: [...turno.sale] }
      : EMPTY_TURNO_FORM)
  }

  const turnoValid = turnoForm.nome.trim().length > 0 && turnoForm.sale.length > 0

  const confirmTurno = () => {
    if (!turnoValid) return
    const payload = {
      nome: turnoForm.nome.trim(),
      servizio: turnoForm.servizio,
      dalle: turnoForm.dalle,
      alle: turnoForm.alle,
      sale: turnoForm.sale,
    }
    setDraft(d => {
      if (turnoEditId != null) {
        return { ...d, turni: d.turni.map(t => t.id === turnoEditId ? { ...t, ...payload } : t) }
      }
      const nextId = d.turni.reduce((max, t) => Math.max(max, t.id), 0) + 1
      return { ...d, turni: [...d.turni, { id: nextId, attivo: true, ...payload }] }
    })
    setTurnoEditId(null)
    setTurnoForm(EMPTY_TURNO_FORM)
  }

  const duplicateTurno = (turno: Turno) =>
    setDraft(d => {
      const nextId = d.turni.reduce((max, t) => Math.max(max, t.id), 0) + 1
      return { ...d, turni: [...d.turni, { ...turno, id: nextId, nome: `${turno.nome} (copia)` }] }
    })

  const removeTurno = async (turno: Turno) => {
    const ok = await confirm({
      title: 'Elimina turno',
      message: `Eliminare il turno «${turno.nome}»?`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (ok) setDraft(d => ({ ...d, turni: d.turni.filter(t => t.id !== turno.id) }))
  }

  // Opzioni del multiselect: solo le sale attive dell'outlet
  const saleAttive = useMemo(
    () => draft.sale.filter(s => s.attivo).map(s => s.nome),
    [draft.sale],
  )

  const save = async () => {
    try {
      await apiFetchSibylla('configura/SetConfiguraOutlet', {
        method: 'POST',
        body: { OutletId: outletId, ...draft },
      })
    } catch (err) {
      // Demo senza backend: la configurazione resta salvata in locale
      console.warn('[ConfiguraOutlet] persistenza remota non disponibile:', err)
    }
    setSaved(draft)
    setCompletion(PANE_ID, draft.sale.length > 0 ? 'configured' : 'empty')
    resetDirty()
  }

  return (
    <div className="configura-outlet">
      <CfgToolbar>
        <SelectField
          name="miei-outlet"
          label="I miei outlet"
          className="configura-outlet__field"
          value={outletId ?? ''}
          onChange={(e) => setOutletId(e.target.value ? Number(e.target.value) : null)}
          options={outlet.map((o) => ({ value: o.Id, label: o.nome }))}
        />
      </CfgToolbar>

      {/* ── Sale ─────────────────────────────────────────────────────────────── */}
      <section className="configura-outlet__section" aria-labelledby="outlet-sale-title">
        <header className="configura-outlet__section-head">
          <h3 id="outlet-sale-title" className="configura-outlet__section-title">
            <i className="fa-light fa-table-picnic" aria-hidden="true" /> Sale
          </h3>
          <button
            type="button"
            className="sib-btn sib-btn--secondary sib-btn--sm"
            onClick={() => (salaFormOpen && salaEditId == null ? setSalaFormOpen(false) : openSalaForm())}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi sala
          </button>
        </header>

        {salaFormOpen && (
          <div className="configura-outlet__form">
            <InputField
              name="sala-nome"
              label="Nome sala"
              value={salaForm.nome}
              onChange={(e) => setSalaForm({ ...salaForm, nome: e.target.value })}
              className="configura-outlet__form-field"
            />
            <InputField
              name="sala-tavoli"
              label="Tavoli"
              type="number"
              min={0}
              value={salaForm.tavoli}
              onChange={(e) => setSalaForm({ ...salaForm, tavoli: e.target.value })}
              className="configura-outlet__form-field configura-outlet__form-field--num"
            />
            <InputField
              name="sala-pax"
              label="Pax"
              type="number"
              min={0}
              value={salaForm.pax}
              onChange={(e) => setSalaForm({ ...salaForm, pax: e.target.value })}
              className="configura-outlet__form-field configura-outlet__form-field--num"
            />
            <div className="configura-outlet__form-actions">
              <button
                type="button"
                className="sib-btn sib-btn--ghost"
                onClick={() => { setSalaFormOpen(false); setSalaEditId(null); setSalaForm(EMPTY_SALA_FORM) }}
              >
                Annulla
              </button>
              <button
                type="button"
                className="sib-btn sib-btn--primary"
                onClick={confirmSala}
                disabled={!salaForm.nome.trim()}
              >
                {salaEditId != null ? 'Salva modifiche' : 'Conferma'}
              </button>
            </div>
          </div>
        )}

        <CfgTable
          columns={[
            { key: 'stato',  label: 'Stato',  width: '16%' },
            { key: 'nome',   label: 'Nome',   width: '38%' },
            { key: 'tavoli', label: 'Tavoli', width: '14%', align: 'right' },
            { key: 'pax',    label: 'Pax',    width: '14%', align: 'right' },
            { key: 'azioni', label: 'Azioni', width: '18%', align: 'right' },
          ]}
          empty={<span>Nessuna sala configurata: aggiungine una con «+ Aggiungi sala»</span>}
        >
          {draft.sale.map((s) => (
            <tr key={s.id} className={clsx(!s.attivo && 'configura-outlet__row--off')}>
              <td>
                <ToggleSwitch
                  checked={s.attivo}
                  label={s.attivo ? 'Attiva' : 'Disattiva'}
                  onChange={(checked) => setDraft(d => ({ ...d, sale: d.sale.map(x => x.id === s.id ? { ...x, attivo: checked } : x) }))}
                  className="configura-outlet__toggle"
                />
              </td>
              <td className="configura-outlet__td-name">{s.nome}</td>
              <td className="configura-outlet__td-num">{s.tavoli}</td>
              <td className="configura-outlet__td-num">{s.pax}</td>
              <td className="configura-outlet__td-actions">
                <Tooltip text="Modifica sala" variant="dark">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => openSalaForm(s)}
                    aria-label={`Modifica la sala ${s.nome}`}
                  >
                    <i className="fa-solid fa-pen" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip text="Elimina sala" variant="dark">
                  <button
                    type="button"
                    className="sib-btn sib-btn--icon"
                    onClick={() => removeSala(s)}
                    aria-label={`Elimina la sala ${s.nome}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </Tooltip>
              </td>
            </tr>
          ))}
        </CfgTable>
      </section>

      {/* ── Turni ────────────────────────────────────────────────────────────── */}
      <section className="configura-outlet__section" aria-labelledby="outlet-turni-title">
        <header className="configura-outlet__section-head">
          <h3 id="outlet-turni-title" className="configura-outlet__section-title">
            <i className="fa-light fa-clock" aria-hidden="true" /> Turni
          </h3>
          <ToggleSwitch
            checked={draft.turniEnabled}
            label={draft.turniEnabled ? 'Gestione turni attiva' : 'Gestione turni disattivata'}
            onChange={(checked) => setDraft(d => ({ ...d, turniEnabled: checked }))}
            className="configura-outlet__toggle"
          />
        </header>

        {draft.turniEnabled && (
          <>
            <div className="configura-outlet__form">
              <InputField
                name="turno-nome"
                label="Nome turno"
                value={turnoForm.nome}
                onChange={(e) => setTurnoForm({ ...turnoForm, nome: e.target.value })}
                className="configura-outlet__form-field"
              />
              <SelectField
                name="turno-servizio"
                label="Servizio"
                value={turnoForm.servizio}
                onChange={(e) => setTurnoForm({ ...turnoForm, servizio: e.target.value })}
                options={SERVIZI.map((s) => ({ value: s, label: s }))}
                className="configura-outlet__form-field configura-outlet__form-field--num"
              />
              <SelectField
                name="turno-dalle"
                label="Dalle ore"
                value={turnoForm.dalle}
                onChange={(e) => setTurnoForm({ ...turnoForm, dalle: e.target.value })}
                options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                className="configura-outlet__form-field configura-outlet__form-field--time"
              />
              <SelectField
                name="turno-alle"
                label="Alle ore"
                value={turnoForm.alle}
                onChange={(e) => setTurnoForm({ ...turnoForm, alle: e.target.value })}
                options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                className="configura-outlet__form-field configura-outlet__form-field--time"
              />
              {/* Le sale possono essere molte: multiselect con pannello a scroll
                  proprio, così il form non si deforma al crescere dell'elenco. */}
              <CfgMultiSelect
                className="configura-outlet__form-sale"
                label="Sale"
                placeholder="Seleziona le sale del turno"
                nomePlurale="sale"
                options={saleAttive}
                value={turnoForm.sale}
                onChange={(next) => setTurnoForm({ ...turnoForm, sale: next })}
              />
              <div className="configura-outlet__form-actions">
                {turnoEditId != null && (
                  <button
                    type="button"
                    className="sib-btn sib-btn--ghost"
                    onClick={() => { setTurnoEditId(null); setTurnoForm(EMPTY_TURNO_FORM) }}
                  >
                    Annulla
                  </button>
                )}
                <button
                  type="button"
                  className="sib-btn sib-btn--primary"
                  onClick={confirmTurno}
                  disabled={!turnoValid}
                >
                  {turnoEditId != null ? 'Salva modifiche' : 'Aggiungi turno'}
                </button>
              </div>
            </div>

            <CfgTable
              columns={[
                { key: 'stato',    label: 'Stato',    width: '13%' },
                { key: 'nome',     label: 'Nome',     width: '22%' },
                { key: 'servizio', label: 'Servizio', width: '13%' },
                { key: 'dalle',    label: 'Dalle',    width: '9%' },
                { key: 'alle',     label: 'Alle',     width: '9%' },
                { key: 'sale',     label: 'Sale',     width: '18%' },
                { key: 'azioni',   label: 'Azioni',   width: '16%', align: 'right' },
              ]}
              empty={<span>Nessun turno configurato</span>}
            >
              {draft.turni.map((t) => (
                <tr key={t.id} className={clsx(!t.attivo && 'configura-outlet__row--off')}>
                  <td>
                    <ToggleSwitch
                      checked={t.attivo}
                      label={t.attivo ? 'Attivo' : 'Disattivo'}
                      onChange={(checked) => setDraft(d => ({ ...d, turni: d.turni.map(x => x.id === t.id ? { ...x, attivo: checked } : x) }))}
                      className="configura-outlet__toggle"
                    />
                  </td>
                  <td className="configura-outlet__td-name">{t.nome}</td>
                  <td>{t.servizio}</td>
                  <td>{t.dalle}</td>
                  <td>{t.alle}</td>
                  <td>{t.sale.join(', ') || '—'}</td>
                  <td className="configura-outlet__td-actions">
                    <Tooltip text="Modifica turno" variant="dark">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        onClick={() => openTurnoForm(t)}
                        aria-label={`Modifica il turno ${t.nome}`}
                      >
                        <i className="fa-solid fa-pen" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Duplica turno" variant="dark">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        onClick={() => duplicateTurno(t)}
                        aria-label={`Duplica il turno ${t.nome}`}
                      >
                        <i className="fa-solid fa-copy" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina turno" variant="dark">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        onClick={() => removeTurno(t)}
                        aria-label={`Elimina il turno ${t.nome}`}
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </CfgTable>
          </>
        )}
      </section>

      <p className="configura-outlet__note">
        <i className="fa-light fa-circle-info" aria-hidden="true" />
        Sale e turni definiti qui sono condivisi con le voci Food &amp; Beverage
        (Outlet, Sale e tavoli, Turni): la configurazione non va duplicata.
      </p>

      <CfgSaveBar
        className="configura-outlet__savebar"
        count={dirty}
        onSave={save}
        onCancel={() => setDraft(saved)}
        successMessage="Configurazione outlet salvata"
      />
    </div>
  )
}
