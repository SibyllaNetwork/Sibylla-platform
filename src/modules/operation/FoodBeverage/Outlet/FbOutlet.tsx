// ─── Outlet (Food & Beverage) ─────────────────────────────────────────────────
//  I punti di somministrazione della struttura: ristorante, bar, roof, lounge.
//  Sono la radice della sezione — da un outlet discendono le sue sale, i turni e
//  il menu — quindi la pagina dice anche quanto ciascuno pesa: sale, coperti,
//  turni configurati e incasso della giornata.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, SelectField, ToggleSwitch } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleConto, SALE } from '../../../../store/useFbStore'
import type { Outlet, TipoOutlet } from '../fb.model'
import './FbOutlet.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

const TIPI: Array<{ id: TipoOutlet; label: string; ico: string }> = [
  { id: 'ristorante', label: 'Ristorante', ico: 'fa-utensils' },
  { id: 'bar',        label: 'Bar',        ico: 'fa-mug-saucer' },
  { id: 'lounge',     label: 'Lounge',     ico: 'fa-martini-glass' },
  { id: 'roof',       label: 'Roof top',   ico: 'fa-umbrella-beach' },
]

const vuoto = (): Outlet => ({
  id: 0, nome: '', tipo: 'ristorante', indirizzo: '', email: '', telefono: '', attivo: true,
})

export default function FbOutlet({ navigate }: { navigate?: (p: string) => void }) {
  const outlets  = useFbStore(s => s.outlets)
  const turni    = useFbStore(s => s.turni)
  const comande  = useFbStore(s => s.comande)
  const salva    = useFbStore(s => s.salvaOutlet)
  const elimina  = useFbStore(s => s.eliminaOutlet)
  const setContesto = useFbStore(s => s.setContesto)
  const confirm  = useConfirmStore(s => s.confirm)

  const [form, setForm] = useState<Outlet | null>(null)

  const righe = useMemo(() => outlets.map(o => {
    const sale = SALE.filter(s => s.outletId === o.id)
    const idSale = sale.map(s => s.id)
    return {
      ...o,
      sale: sale.length,
      coperti: sale.reduce((a, s) => a + s.capienzaMax, 0),
      turni: turni.filter(t => t.outletId === o.id).length,
      incasso: comande.filter(c => idSale.includes(c.salaId)).reduce((a, c) => a + totaleConto(c), 0),
    }
  }), [outlets, turni, comande])

  const chiediElimina = async (o: Outlet) => {
    const sale = SALE.filter(s => s.outletId === o.id).length
    const ok = await confirm({
      message: sale
        ? `Eliminare “${o.nome}”? Restano senza outlet ${sale} ${sale === 1 ? 'sala' : 'sale'}.`
        : `Eliminare l’outlet “${o.nome}”?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(o.id); toast.info('Outlet eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome dell’outlet'); return }
    salva(form)
    toast.success(form.id ? 'Outlet aggiornato' : `Outlet “${form.nome}” creato`)
    setForm(null)
  }

  return (
    <div className="fbout">
      <PageHead
        title="Outlet"
        subtitle="I punti di somministrazione della struttura e quanto pesa ciascuno"
        actions={
          <button type="button" className="fbout__head-btn" onClick={() => setForm(vuoto())}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo outlet
          </button>
        }
      />

      <div className="sib-table-wrap">
        <table className="sib-table fbout__table">
          <colgroup>
            <col className="fbout__c-nome" /><col className="fbout__c-tipo" />
            <col className="fbout__c-num" /><col className="fbout__c-num" /><col className="fbout__c-num" />
            <col className="fbout__c-ind" /><col className="fbout__c-cont" />
            <col className="fbout__c-inc" /><col className="fbout__c-stato" /><col className="fbout__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Outlet</th>
              <th>Tipo</th>
              <th>Sale</th>
              <th>Coperti</th>
              <th>Turni</th>
              <th>Indirizzo</th>
              <th>Contatti</th>
              <th className="fbout__amt">Incasso</th>
              <th>Stato</th>
              <th className="fbout__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(o => {
              const tipo = TIPI.find(t => t.id === o.tipo)
              return (
                <tr key={o.id}>
                  <td>
                    <span className="fbout__nome">
                      <i className={`fa-solid ${tipo?.ico}`} aria-hidden="true" />
                      <TruncatedText text={o.nome} />
                    </span>
                  </td>
                  <td>{tipo?.label ?? o.tipo}</td>
                  <td className="fbout__num">{o.sale}</td>
                  <td className="fbout__num">{o.coperti}</td>
                  <td className="fbout__num">{o.turni}</td>
                  <td><TruncatedText text={o.indirizzo || '—'} /></td>
                  <td>
                    <span className="fbout__cont">
                      {o.telefono && <TruncatedText text={o.telefono} />}
                      {o.email && <TruncatedText className="fbout__mail" text={o.email} />}
                      {!o.telefono && !o.email && '—'}
                    </span>
                  </td>
                  <td className="fbout__amt">{euro(o.incasso)}</td>
                  <td>
                    <span className={`fbout__stato ${o.attivo ? 'is-on' : ''}`}>
                      {o.attivo ? 'Attivo' : 'Sospeso'}
                    </span>
                  </td>
                  <td className="fbout__act">
                    <button
                      type="button" aria-label="Vai alle sale dell’outlet"
                      onClick={() => { setContesto({ outletId: o.id }); navigate?.('fb-sale-tavoli') }}
                    >
                      <Tooltip text="Sale e tavoli"><i className="fa-solid fa-chair" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Modifica l’outlet" onClick={() => setForm({ ...o })}>
                      <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Elimina l’outlet" onClick={() => chiediElimina(o)}>
                      <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!righe.length && (
              <tr><td colSpan={10} className="fbout__vuoto">Nessun outlet configurato.</td></tr>
            )}
          </tbody>
          {!!righe.length && (
            <tfoot>
              <tr className="fbout__tot">
                <td colSpan={2}>{righe.length} outlet in totale</td>
                <td className="fbout__num">{righe.reduce((a, o) => a + o.sale, 0)}</td>
                <td className="fbout__num">{righe.reduce((a, o) => a + o.coperti, 0)}</td>
                <td className="fbout__num">{righe.reduce((a, o) => a + o.turni, 0)}</td>
                <td colSpan={2} />
                <td className="fbout__amt">{euro(righe.reduce((a, o) => a + o.incasso, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Scheda outlet ─────────────────────────────────────────────────── */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Outlet — ${form.nome}` : 'Nuovo outlet'}
        size="lg"
      >
        {form && (
          <div className="fbout-form">
            <div className="fbout-form__row">
              <InputField
                name="nome" label="Nome" className="fbout-form__grow" value={form.nome}
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <SelectField
                name="tipo" label="Tipo" value={form.tipo}
                options={TIPI.map(t => ({ value: t.id, label: t.label }))}
                onChange={e => setForm(f => f && ({ ...f, tipo: e.target.value as TipoOutlet }))}
              />
            </div>

            <InputField
              name="indirizzo" label="Indirizzo" value={form.indirizzo}
              onChange={e => setForm(f => f && ({ ...f, indirizzo: e.target.value }))}
            />

            <div className="fbout-form__row">
              <InputField
                name="telefono" label="Telefono" value={form.telefono}
                onChange={e => setForm(f => f && ({ ...f, telefono: e.target.value }))}
              />
              <InputField
                name="email" label="E-mail" type="email" className="fbout-form__grow" value={form.email}
                onChange={e => setForm(f => f && ({ ...f, email: e.target.value }))}
              />
            </div>

            <ToggleSwitch
              label="Outlet attivo"
              description="Un outlet sospeso non compare nelle pagine operative"
              checked={form.attivo}
              onChange={v => setForm(f => f && ({ ...f, attivo: v }))}
            />

            <footer className="fbout-form__foot">
              <button type="button" className="fbout-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbout-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Crea l’outlet'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
