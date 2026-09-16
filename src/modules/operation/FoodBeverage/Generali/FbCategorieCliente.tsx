// ─── Categorie cliente (Food & Beverage) ──────────────────────────────────────
//  Chi siede al tavolo determina il prezzo: cliente hotel, all inclusive,
//  personale, direzione. Qui si definiscono le categorie e lo sconto che
//  applicano, e si vede quanto valgono sul servizio in corso.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField, TextareaField, NumCell } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, totaleComanda, scontoComanda } from '../../../../store/useFbStore'
import type { CategoriaCliente } from '../fb.model'
import './FbCategorieCliente.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })

const vuota = (): CategoriaCliente => ({ id: 0, nome: '', scontoPerc: 0, descrizione: '' })

export default function FbCategorieCliente({ navigate }: { navigate?: (p: string) => void }) {
  const categorie = useFbStore(s => s.categorieCliente)
  const comande   = useFbStore(s => s.comande)
  const voci      = useFbStore(s => s.voci)
  const salva     = useFbStore(s => s.salvaCategoriaCliente)
  const elimina   = useFbStore(s => s.eliminaCategoriaCliente)
  const confirm   = useConfirmStore(s => s.confirm)

  const [form, setForm] = useState<CategoriaCliente | null>(null)

  const righe = useMemo(() => categorie.map(c => {
    const dentro = comande.filter(x => x.categoriaClienteId === c.id)
    return {
      ...c,
      comande: dentro.length,
      imponibile: dentro.reduce((a, x) => a + totaleComanda(x), 0),
      sconto: dentro.reduce((a, x) => a + scontoComanda(x), 0),
      prezziSpeciali: voci.filter(v => v.prezziSpeciali.some(p => p.categoriaClienteId === c.id)).length,
    }
  }), [categorie, comande, voci])

  const chiediElimina = async (c: CategoriaCliente) => {
    const usata = comande.filter(x => x.categoriaClienteId === c.id).length
    const ok = await confirm({
      message: usata
        ? `Eliminare “${c.nome}”? È usata su ${usata} ${usata === 1 ? 'comanda' : 'comande'} della giornata.`
        : `Eliminare la categoria cliente “${c.nome}”?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(c.id); toast.info('Categoria eliminata') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome della categoria'); return }
    salva(form)
    toast.success(form.id ? 'Categoria aggiornata' : `Categoria “${form.nome}” creata`)
    setForm(null)
  }

  return (
    <div className="fbcc">
      <PageHead
        title="Categorie cliente"
        subtitle="Chi siede al tavolo e quanto sconto porta con sé"
        actions={
          <button type="button" className="fbcc__head-btn" onClick={() => setForm(vuota())}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova categoria
          </button>
        }
      />

      <div className="sib-table-wrap">
        <table className="sib-table fbcc__table">
          <colgroup>
            <col className="fbcc__c-nome" /><col className="fbcc__c-desc" />
            <col className="fbcc__c-sconto" /><col className="fbcc__c-num" />
            <col className="fbcc__c-imp" /><col className="fbcc__c-imp" />
            <col className="fbcc__c-num" /><col className="fbcc__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Descrizione</th>
              <th>Sconto</th>
              <th>Comande</th>
              <th className="fbcc__amt">Imponibile</th>
              <th className="fbcc__amt">Sconto applicato</th>
              <th>Prezzi speciali</th>
              <th className="fbcc__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(c => (
              <tr key={c.id}>
                <td><TruncatedText text={c.nome} /></td>
                <td><TruncatedText text={c.descrizione || '—'} /></td>
                <td>
                  <span className={`fbcc__sconto ${c.scontoPerc >= 100 ? 'is-pieno' : c.scontoPerc ? 'is-parz' : ''}`}>
                    {c.scontoPerc ? `−${c.scontoPerc}%` : 'nessuno'}
                  </span>
                </td>
                <td className="fbcc__num">{c.comande}</td>
                <td className="fbcc__amt">{euro(c.imponibile)}</td>
                <td className="fbcc__amt fbcc__amt--sconto">{c.sconto ? `−${euro(c.sconto)}` : '—'}</td>
                <td className="fbcc__num">
                  {c.prezziSpeciali ? (
                    <Tooltip text="Voci di menu con un prezzo dedicato a questa categoria">
                      <span className="fbcc__ps">{c.prezziSpeciali}</span>
                    </Tooltip>
                  ) : '—'}
                </td>
                <td className="fbcc__act">
                  <button type="button" aria-label="Modifica la categoria" onClick={() => setForm({ ...c })}>
                    <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                  </button>
                  <button type="button" aria-label="Elimina la categoria" onClick={() => chiediElimina(c)}>
                    <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                  </button>
                </td>
              </tr>
            ))}
            {!righe.length && (
              <tr><td colSpan={8} className="fbcc__vuoto">Nessuna categoria cliente configurata.</td></tr>
            )}
          </tbody>
          {!!righe.length && (
            <tfoot>
              <tr className="fbcc__tot">
                <td colSpan={3}>{righe.length} categorie</td>
                <td className="fbcc__num">{righe.reduce((a, c) => a + c.comande, 0)}</td>
                <td className="fbcc__amt">{euro(righe.reduce((a, c) => a + c.imponibile, 0))}</td>
                <td className="fbcc__amt fbcc__amt--sconto">−{euro(righe.reduce((a, c) => a + c.sconto, 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Categoria cliente — ${form.nome}` : 'Nuova categoria cliente'}
        size="md"
      >
        {form && (
          <div className="fbcc-form">
            <div className="fbcc-form__row">
              <InputField
                name="nome" label="Nome" className="fbcc-form__grow" value={form.nome}
                placeholder="es. Cliente hotel"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <div className="fbcc-form__sconto">
                <span className="fbcc-form__lab">Sconto (%)</span>
                <NumCell
                  className="sib-input fbcc-form__sconto-in"
                  min={0} max={100} value={form.scontoPerc}
                  aria-label="Percentuale di sconto"
                  onChange={n => setForm(f => f && ({ ...f, scontoPerc: n }))}
                />
              </div>
            </div>

            <TextareaField
              name="descrizione" label="Descrizione" rows={2} value={form.descrizione}
              placeholder="Quando si applica questa categoria"
              onChange={e => setForm(f => f && ({ ...f, descrizione: e.target.value }))}
            />

            {form.scontoPerc >= 100 && (
              <p className="fbcc-form__avviso">
                <i className="fa-solid fa-circle-info" aria-hidden="true" />
                Con il 100% la comanda si chiude a zero: è il caso di direzione e all inclusive.
              </p>
            )}

            <footer className="fbcc-form__foot">
              <button type="button" className="fbcc-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbcc-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> Salva
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
