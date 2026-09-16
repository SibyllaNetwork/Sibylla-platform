// ─── Turni (Food & Beverage) ──────────────────────────────────────────────────
//  I turni sono la capacità vendibile del ristorante: fascia oraria, coperti
//  disponibili e sala di riferimento. La pagina li mostra due volte — sulla
//  giornata, per vedere buchi e sovrapposizioni, e in tabella per modificarli —
//  perché è guardandoli sulla linea del tempo che si capisce se il servizio sta
//  in piedi.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, SelectField, ToggleSwitch } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, SALE } from '../../../../store/useFbStore'
import type { Servizio, Turno } from '../fb.model'
import './FbTurni.sass'

const SERVIZI: Servizio[] = ['Colazione', 'Pranzo', 'Cena']
const SERVIZIO_ICO: Record<Servizio, string> = {
  Colazione: 'fa-mug-saucer', Pranzo: 'fa-sun', Cena: 'fa-moon',
}

/** Minuti dall'inizio della giornata, per posizionare il turno sulla fascia. */
const minuti = (ora: string) => {
  const [h, m] = ora.split(':').map(Number)
  return h * 60 + (m || 0)
}

const ORA_DA = 6 * 60   // la fascia mostrata parte dalle 06:00…
const ORA_A  = 26 * 60  // …e arriva alle 02:00 del giorno dopo

const pos = (ora: string, fine = false) => {
  let m = minuti(ora)
  if (fine && m < ORA_DA) m += 24 * 60 // servizio che scavalca la mezzanotte
  return ((m - ORA_DA) / (ORA_A - ORA_DA)) * 100
}

const vuoto = (outletId: number): Turno => ({
  id: 0, outletId, salaId: null, nome: '', servizio: 'Cena',
  oraInizio: '19:00', oraFine: '21:00', coperturaMax: 80, attivo: true,
})

export default function FbTurni({ navigate }: { navigate?: (p: string) => void }) {
  const outlets     = useFbStore(s => s.outlets)
  const turni       = useFbStore(s => s.turni)
  const prenotazioni = useFbStore(s => s.prenotazioni)
  const contesto    = useFbStore(s => s.contesto)
  const setContesto = useFbStore(s => s.setContesto)
  const salva       = useFbStore(s => s.salvaTurno)
  const elimina     = useFbStore(s => s.eliminaTurno)
  const confirm     = useConfirmStore(s => s.confirm)

  const { outletId } = contesto
  const [form, setForm] = useState<Turno | null>(null)

  const saleOutlet = useMemo(() => SALE.filter(s => s.outletId === outletId), [outletId])
  const righe = useMemo(
    () => turni.filter(t => t.outletId === outletId)
      .slice()
      .sort((a, b) => minuti(a.oraInizio) - minuti(b.oraInizio)),
    [turni, outletId],
  )

  /** Coperti già prenotati sul turno, nella giornata di servizio in corso. */
  const prenotatiDi = (t: Turno) => prenotazioni
    .filter(p => p.data === contesto.data && p.turnoId === t.id && p.stato !== 'annullata')
    .reduce((a, p) => a + p.pax, 0)

  const oreTacche = useMemo(() => {
    const out: Array<{ label: string; left: number }> = []
    for (let h = 6; h <= 26; h += 2) {
      out.push({ label: `${String(h % 24).padStart(2, '0')}`, left: ((h * 60 - ORA_DA) / (ORA_A - ORA_DA)) * 100 })
    }
    return out
  }, [])

  const chiediElimina = async (t: Turno) => {
    const pren = prenotatiDi(t)
    const ok = await confirm({
      message: pren
        ? `Eliminare il turno “${t.nome}”? Ci sono ${pren} coperti già prenotati.`
        : `Eliminare il turno “${t.nome}”?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(t.id); toast.info('Turno eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome del turno'); return }
    if (minuti(form.oraFine) <= minuti(form.oraInizio) && minuti(form.oraFine) > ORA_DA - 1) {
      toast.warning('L’orario di fine deve venire dopo quello di inizio')
      return
    }
    salva(form)
    toast.success(form.id ? 'Turno aggiornato' : `Turno “${form.nome}” creato`)
    setForm(null)
  }

  return (
    <div className="fbturni">
      <PageHead
        title="Turni"
        subtitle="Fasce di servizio, coperti disponibili e sale collegate"
        actions={
          <button type="button" className="fbturni__head-btn" onClick={() => setForm(vuoto(outletId))}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo turno
          </button>
        }
      />

      <FilterToolbar className="fbturni__bar">
        <SelectField
          name="outlet" label="Outlet" className="fbturni__f"
          value={outletId}
          options={outlets.map(o => ({ value: o.id, label: o.nome }))}
          onChange={e => setContesto({ outletId: +e.target.value })}
        />
      </FilterToolbar>

      {/* ── La giornata ───────────────────────────────────────────────────── */}
      <section className="fbturni__giorno">
        <header className="fbturni__giorno-head">
          <h3>La giornata di servizio</h3>
          <span>{righe.length} turni · {righe.reduce((a, t) => a + t.coperturaMax, 0)} coperti vendibili</span>
        </header>

        <div className="fbturni__fascia">
          <div className="fbturni__ore">
            {oreTacche.map(o => (
              <span key={o.label + o.left} className="fbturni__ora" style={{ '--left': o.left } as React.CSSProperties}>
                {o.label}
              </span>
            ))}
          </div>

          {SERVIZI.map(sv => {
            const diServizio = righe.filter(t => t.servizio === sv)
            return (
              <div key={sv} className="fbturni__corsia">
                <span className="fbturni__corsia-lab">
                  <i className={`fa-solid ${SERVIZIO_ICO[sv]}`} aria-hidden="true" /> {sv}
                </span>
                <div className="fbturni__corsia-pista">
                  {diServizio.map(t => {
                    const pieno = t.coperturaMax ? Math.round((prenotatiDi(t) / t.coperturaMax) * 100) : 0
                    return (
                      <Tooltip key={t.id} text={`${t.nome} · ${t.oraInizio}–${t.oraFine} · ${prenotatiDi(t)}/${t.coperturaMax} coperti`}>
                        <button
                          type="button"
                          className={`fbturni__blocco ${t.attivo ? '' : 'is-off'}`}
                          data-servizio={sv}
                          style={{
                            '--da': pos(t.oraInizio),
                            '--a': pos(t.oraFine, true),
                            '--pieno': Math.min(100, pieno),
                          } as React.CSSProperties}
                          onClick={() => setForm({ ...t })}
                        >
                          <span className="fbturni__blocco-fill" aria-hidden="true" />
                          <span className="fbturni__blocco-txt">
                            <TruncatedText text={`${t.nome} · ${t.oraInizio}`} />
                          </span>
                        </button>
                      </Tooltip>
                    )
                  })}
                  {!diServizio.length && <span className="fbturni__corsia-vuota">nessun turno</span>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Tabella ───────────────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table fbturni__table">
          <colgroup>
            <col className="fbturni__c-nome" /><col className="fbturni__c-serv" />
            <col className="fbturni__c-ora" /><col className="fbturni__c-ora" />
            <col className="fbturni__c-sala" /><col className="fbturni__c-cop" />
            <col className="fbturni__c-pren" /><col className="fbturni__c-stato" />
            <col className="fbturni__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Turno</th>
              <th>Servizio</th>
              <th>Inizio</th>
              <th>Fine</th>
              <th>Sala</th>
              <th>Coperti</th>
              <th>Prenotati</th>
              <th>Stato</th>
              <th className="fbturni__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(t => {
              const sala = t.salaId ? SALE.find(s => s.id === t.salaId) : undefined
              const pren = prenotatiDi(t)
              return (
                <tr key={t.id}>
                  <td><TruncatedText text={t.nome} /></td>
                  <td>
                    <span className="fbturni__serv" data-servizio={t.servizio}>
                      <i className={`fa-solid ${SERVIZIO_ICO[t.servizio]}`} aria-hidden="true" /> {t.servizio}
                    </span>
                  </td>
                  <td className="fbturni__ora-cel">{t.oraInizio}</td>
                  <td className="fbturni__ora-cel">{t.oraFine}</td>
                  <td><TruncatedText text={sala?.nome ?? 'Tutte'} /></td>
                  <td className="fbturni__num">{t.coperturaMax}</td>
                  <td className="fbturni__num">
                    {pren}
                    <span className="fbturni__barra" style={{ '--pct': Math.min(100, t.coperturaMax ? (pren / t.coperturaMax) * 100 : 0) } as React.CSSProperties}><span /></span>
                  </td>
                  <td>
                    <span className={`fbturni__stato ${t.attivo ? 'is-on' : ''}`}>{t.attivo ? 'Attivo' : 'Sospeso'}</span>
                  </td>
                  <td className="fbturni__act">
                    <button type="button" aria-label="Modifica il turno" onClick={() => setForm({ ...t })}>
                      <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Elimina il turno" onClick={() => chiediElimina(t)}>
                      <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!righe.length && (
              <tr><td colSpan={9} className="fbturni__vuoto">Nessun turno per questo outlet.</td></tr>
            )}
          </tbody>
          {!!righe.length && (
            <tfoot>
              <tr className="fbturni__tot">
                <td>{righe.length}</td>
                <td colSpan={4}>Totale turni dell’outlet</td>
                <td className="fbturni__num">{righe.reduce((a, t) => a + t.coperturaMax, 0)}</td>
                <td className="fbturni__num">{righe.reduce((a, t) => a + prenotatiDi(t), 0)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Scheda turno ──────────────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Turno — ${form.nome}` : 'Nuovo turno'}
        size="lg"
      >
        {form && (
          <div className="fbturni-form">
            <div className="fbturni-form__row">
              <InputField
                name="nome" label="Nome" className="fbturni-form__grow" value={form.nome}
                placeholder="es. Turno 1"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <SelectField
                name="servizio" label="Servizio" value={form.servizio}
                options={SERVIZI.map(s => ({ value: s, label: s }))}
                onChange={e => setForm(f => f && ({ ...f, servizio: e.target.value as Servizio }))}
              />
            </div>

            <div className="fbturni-form__row">
              <div className="fbturni-form__ora">
                <span className="fbturni-form__lab">Inizio</span>
                <input
                  type="time" className="sib-input" value={form.oraInizio} aria-label="Ora di inizio"
                  onChange={e => setForm(f => f && ({ ...f, oraInizio: e.target.value }))}
                />
              </div>
              <div className="fbturni-form__ora">
                <span className="fbturni-form__lab">Fine</span>
                <input
                  type="time" className="sib-input" value={form.oraFine} aria-label="Ora di fine"
                  onChange={e => setForm(f => f && ({ ...f, oraFine: e.target.value }))}
                />
              </div>
              <SelectField
                name="sala" label="Sala" value={form.salaId ?? ''}
                options={[{ value: '', label: 'Tutte le sale' }, ...saleOutlet.map(s => ({ value: s.id, label: s.nome }))]}
                onChange={e => setForm(f => f && ({ ...f, salaId: e.target.value ? +e.target.value : null }))}
              />
              <InputField
                name="coperti" label="Coperti vendibili" type="number" value={form.coperturaMax}
                onChange={e => setForm(f => f && ({ ...f, coperturaMax: +e.target.value || 0 }))}
              />
            </div>

            <ToggleSwitch
              label="Turno attivo"
              description="Un turno sospeso resta configurato ma non accetta prenotazioni"
              checked={form.attivo}
              onChange={v => setForm(f => f && ({ ...f, attivo: v }))}
            />

            <footer className="fbturni-form__foot">
              <button type="button" className="fbturni-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbturni-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Crea il turno'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
