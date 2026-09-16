// ─── Allergeni (Food & Beverage) ──────────────────────────────────────────────
//  I 14 allergeni del regolamento UE 1169/2011: l'elenco è per legge, quindi la
//  pagina serve soprattutto a leggerne le descrizioni e a vedere, per ciascuno,
//  quante voci di carta lo contengono — che è il dato che serve davvero quando
//  un ospite dichiara un'intolleranza.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, TextareaField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import type { Allergene } from '../fb.model'
import './FbAllergeni.sass'

const vuoto = (): Allergene => ({ codice: '', nome: '', descrizione: '', attivo: true })

export default function FbAllergeni({ navigate }: { navigate?: (p: string) => void }) {
  const allergeni = useFbStore(s => s.allergeni)
  const voci      = useFbStore(s => s.voci)
  const salva     = useFbStore(s => s.salvaAllergene)
  const elimina   = useFbStore(s => s.eliminaAllergene)
  const confirm   = useConfirmStore(s => s.confirm)

  const [form, setForm] = useState<Allergene | null>(null)
  const [nuovo, setNuovo] = useState(false)

  const righe = useMemo(() => allergeni.map(a => ({
    ...a,
    voci: voci.filter(v => v.allergeni.includes(a.codice)).length,
  })), [allergeni, voci])

  const chiediElimina = async (a: Allergene) => {
    const n = voci.filter(v => v.allergeni.includes(a.codice)).length
    const ok = await confirm({
      message: n
        ? `Eliminare “${a.nome}”? È dichiarato su ${n} ${n === 1 ? 'voce' : 'voci'} di menu.`
        : `Eliminare l’allergene “${a.nome}”? I 14 allergeni UE sono obbligatori per legge.`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(a.codice); toast.info('Allergene eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.codice.trim() || !form.nome.trim()) { toast.warning('Servono codice e nome'); return }
    if (nuovo && allergeni.some(a => a.codice === form.codice.toUpperCase())) {
      toast.warning(`Il codice ${form.codice.toUpperCase()} è già usato`)
      return
    }
    salva({ ...form, codice: form.codice.toUpperCase() })
    toast.success(nuovo ? `Allergene ${form.codice.toUpperCase()} creato` : 'Allergene aggiornato')
    setForm(null)
  }

  return (
    <div className="fball">
      <PageHead
        title="Allergeni"
        subtitle="I 14 allergeni del regolamento UE, obbligatori in carta"
        actions={
          <button
            type="button" className="fball__head-btn"
            onClick={() => { setForm(vuoto()); setNuovo(true) }}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo allergene
          </button>
        }
      />

      <div className="sib-table-wrap">
        <table className="sib-table fball__table">
          <colgroup>
            <col className="fball__c-cod" /><col className="fball__c-nome" />
            <col className="fball__c-desc" /><col className="fball__c-voci" />
            <col className="fball__c-stato" /><col className="fball__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Codice</th>
              <th>Allergene</th>
              <th>Descrizione</th>
              <th>Voci in carta</th>
              <th>Stato</th>
              <th className="fball__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(a => (
              <tr key={a.codice} className={a.attivo ? '' : 'is-off'}>
                <td><span className="fball__cod">{a.codice}</span></td>
                <td><TruncatedText text={a.nome} /></td>
                <td><TruncatedText text={a.descrizione} /></td>
                <td className="fball__num">
                  {a.voci ? (
                    <Tooltip text={voci.filter(v => v.allergeni.includes(a.codice)).map(v => v.nome).join(', ')}>
                      <span className="fball__voci">{a.voci}</span>
                    </Tooltip>
                  ) : <span className="fball__zero">0</span>}
                </td>
                <td>
                  <button
                    type="button"
                    className={`fball__stato ${a.attivo ? 'is-on' : ''}`}
                    aria-pressed={a.attivo}
                    onClick={() => salva({ ...a, attivo: !a.attivo })}
                  >
                    {a.attivo ? 'Attivo' : 'Sospeso'}
                  </button>
                </td>
                <td className="fball__act">
                  <button type="button" aria-label="Modifica l’allergene" onClick={() => { setForm({ ...a }); setNuovo(false) }}>
                    <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                  </button>
                  <button type="button" aria-label="Elimina l’allergene" onClick={() => chiediElimina(a)}>
                    <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fball__tot">
              <td colSpan={3}>{righe.length} allergeni dichiarabili</td>
              <td className="fball__num">{righe.reduce((a, x) => a + x.voci, 0)}</td>
              <td colSpan={2} className="fball__tot-nota">dichiarazioni sulle voci di carta</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={nuovo ? 'Nuovo allergene' : `Allergene — ${form?.nome ?? ''}`}
        size="md"
      >
        {form && (
          <div className="fball-form">
            <div className="fball-form__row">
              <InputField
                name="codice" label="Codice" value={form.codice}
                disabled={!nuovo}
                placeholder="es. O"
                onChange={e => setForm(f => f && ({ ...f, codice: e.target.value.toUpperCase().slice(0, 2) }))}
              />
              <InputField
                name="nome" label="Nome" className="fball-form__grow" value={form.nome}
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
            </div>

            <TextareaField
              name="descrizione" label="Descrizione" rows={3} value={form.descrizione}
              placeholder="Cosa comprende, come compare in carta"
              onChange={e => setForm(f => f && ({ ...f, descrizione: e.target.value }))}
            />

            <label className="fball-form__flag">
              <input
                type="checkbox" className="sib-checkbox" checked={form.attivo}
                onChange={e => setForm(f => f && ({ ...f, attivo: e.target.checked }))}
              />
              Dichiarabile sulle voci di menu
            </label>

            <footer className="fball-form__foot">
              <button type="button" className="fball-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fball-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Salva
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
