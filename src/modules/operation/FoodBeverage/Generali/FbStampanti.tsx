// ─── Stampanti (Food & Beverage) ──────────────────────────────────────────────
//  Dove esce la carta: le stampanti di reparto ricevono la comanda appena il
//  cameriere la invia, quelle di preconto e fiscali il conto. La pagina è divisa
//  per tipo, perché è così che si ragiona quando qualcosa non stampa.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, SelectField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import { TIPO_STAMPANTE, type Stampante, type TipoStampante } from '../fb.model'
import './FbStampanti.sass'

const PROTOCOLLI: Array<{ id: Stampante['protocollo']; label: string }> = [
  { id: 'epson',  label: 'Epson (ESC/POS)' },
  { id: 'star',   label: 'Star (StarPRNT)' },
  { id: 'custom', label: 'Custom / RCH' },
]

const TIPI = Object.keys(TIPO_STAMPANTE) as TipoStampante[]

const vuota = (): Stampante => ({
  id: 0, nome: '', tipo: 'reparto', protocollo: 'epson', ip: '', outletId: null, attiva: true,
})

export default function FbStampanti({ navigate }: { navigate?: (p: string) => void }) {
  const stampanti = useFbStore(s => s.stampanti)
  const outlets   = useFbStore(s => s.outlets)
  const salva     = useFbStore(s => s.salvaStampante)
  const elimina   = useFbStore(s => s.eliminaStampante)
  const confirm   = useConfirmStore(s => s.confirm)

  const [tipo, setTipo] = useState<TipoStampante | 'tutte'>('tutte')
  const [form, setForm] = useState<Stampante | null>(null)

  const righe = useMemo(
    () => stampanti.filter(s => tipo === 'tutte' || s.tipo === tipo),
    [stampanti, tipo],
  )

  const chiediElimina = async (s: Stampante) => {
    const ok = await confirm({
      message: `Eliminare la stampante “${s.nome}”? Le voci instradate su di lei non stamperanno più.`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(s.id); toast.info('Stampante eliminata') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome della stampante'); return }
    salva(form)
    toast.success(form.id ? 'Stampante aggiornata' : `Stampante “${form.nome}” creata`)
    setForm(null)
  }

  return (
    <div className="fbstamp">
      <PageHead
        title="Stampanti"
        subtitle="Stampanti di reparto, preconto e fiscali"
        actions={
          <button type="button" className="fbstamp__head-btn" onClick={() => setForm(vuota())}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova stampante
          </button>
        }
      />

      <div className="fbstamp__tipi">
        <button
          type="button" className={`fbstamp__tipo ${tipo === 'tutte' ? 'is-on' : ''}`}
          onClick={() => setTipo('tutte')}
        >
          Tutte <em>{stampanti.length}</em>
        </button>
        {TIPI.map(t => (
          <button
            key={t} type="button"
            className={`fbstamp__tipo ${tipo === t ? 'is-on' : ''}`}
            onClick={() => setTipo(t)}
          >
            <i className={`fa-solid ${TIPO_STAMPANTE[t].ico}`} aria-hidden="true" />
            {TIPO_STAMPANTE[t].label}
            <em>{stampanti.filter(s => s.tipo === t).length}</em>
          </button>
        ))}
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table fbstamp__table">
          <colgroup>
            <col className="fbstamp__c-nome" /><col className="fbstamp__c-tipo" />
            <col className="fbstamp__c-ip" /><col className="fbstamp__c-prot" />
            <col className="fbstamp__c-outlet" /><col className="fbstamp__c-stato" />
            <col className="fbstamp__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Stampante</th>
              <th>Tipo</th>
              <th>Indirizzo IP</th>
              <th>Protocollo</th>
              <th>Outlet</th>
              <th>Stato</th>
              <th className="fbstamp__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(s => {
              const o = s.outletId ? outlets.find(x => x.id === s.outletId) : null
              return (
                <tr key={s.id} className={s.attiva ? '' : 'is-off'}>
                  <td>
                    <span className="fbstamp__nome">
                      <i className="fa-solid fa-print" aria-hidden="true" />
                      <TruncatedText text={s.nome} />
                    </span>
                  </td>
                  <td>
                    <span className="fbstamp__badge" data-tipo={s.tipo}>
                      <TruncatedText text={TIPO_STAMPANTE[s.tipo].label} />
                    </span>
                  </td>
                  <td className="fbstamp__ip">{s.ip || '—'}</td>
                  <td>{PROTOCOLLI.find(p => p.id === s.protocollo)?.label ?? s.protocollo}</td>
                  <td><TruncatedText text={o?.nome ?? 'Tutti'} /></td>
                  <td>
                    <button
                      type="button"
                      className={`fbstamp__stato ${s.attiva ? 'is-on' : ''}`}
                      aria-pressed={s.attiva}
                      onClick={() => salva({ ...s, attiva: !s.attiva })}
                    >
                      {s.attiva ? 'Attiva' : 'Spenta'}
                    </button>
                  </td>
                  <td className="fbstamp__act">
                    <button
                      type="button" aria-label="Stampa di prova"
                      onClick={() => toast.success(`Stampa di prova inviata a ${s.nome}`)}
                    >
                      <Tooltip text="Stampa di prova"><i className="fa-solid fa-file-lines" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Modifica la stampante" onClick={() => setForm({ ...s })}>
                      <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                    </button>
                    <button type="button" aria-label="Elimina la stampante" onClick={() => chiediElimina(s)}>
                      <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                    </button>
                  </td>
                </tr>
              )
            })}
            {!righe.length && (
              <tr><td colSpan={7} className="fbstamp__vuoto">Nessuna stampante di questo tipo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Stampante — ${form.nome}` : 'Nuova stampante'}
        size="md"
      >
        {form && (
          <div className="fbstamp-form">
            <InputField
              name="nome" label="Nome" value={form.nome}
              placeholder="es. Stampa reparto cucina"
              onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
            />

            <SelectField
              name="tipo" label="Tipo" value={form.tipo}
              options={TIPI.map(t => ({ value: t, label: TIPO_STAMPANTE[t].label }))}
              onChange={e => setForm(f => f && ({ ...f, tipo: e.target.value as TipoStampante }))}
            />

            <div className="fbstamp-form__row">
              <SelectField
                name="protocollo" label="Protocollo" value={form.protocollo}
                options={PROTOCOLLI.map(p => ({ value: p.id, label: p.label }))}
                onChange={e => setForm(f => f && ({ ...f, protocollo: e.target.value as Stampante['protocollo'] }))}
              />
              <InputField
                name="ip" label="Indirizzo IP" value={form.ip}
                placeholder="192.168.1.70"
                onChange={e => setForm(f => f && ({ ...f, ip: e.target.value }))}
              />
            </div>

            <SelectField
              name="outlet" label="Outlet associato" value={form.outletId ?? ''}
              options={[{ value: '', label: 'Tutti gli outlet' }, ...outlets.map(o => ({ value: o.id, label: o.nome }))]}
              onChange={e => setForm(f => f && ({ ...f, outletId: e.target.value ? +e.target.value : null }))}
            />

            <label className="fbstamp-form__flag">
              <input
                type="checkbox" className="sib-checkbox" checked={form.attiva}
                onChange={e => setForm(f => f && ({ ...f, attiva: e.target.checked }))}
              />
              Stampante attiva
            </label>

            <footer className="fbstamp-form__foot">
              <button type="button" className="fbstamp-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbstamp-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Salva
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
