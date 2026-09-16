// ─── Tipi menu (Food & Beverage) ──────────────────────────────────────────────
//  Il primo livello del catalogo: Ristorante, Bar, Lounge, Cantina. È il filtro
//  che il cameriere tocca per primo in comanda, quindi qui si vede subito quante
//  categorie e quante voci porta con sé ciascun tipo, e che colore lo identifica.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { InputField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore } from '../../../../store/useFbStore'
import type { TipoMenu } from '../fb.model'
import './FbTipiMenu.sass'

/** Tavolozza dei tipi: tinte distinguibili anche a monitor spento di colore. */
const COLORI = ['#B5522F', '#3E7FC1', '#7C4D9E', '#8E44AD', '#2E9E5B', '#C69520', '#C0392B', '#17A2B8']

const vuoto = (ordine: number): TipoMenu => ({ id: 0, nome: '', colore: COLORI[0], ordine })

export default function FbTipiMenu({ navigate }: { navigate?: (p: string) => void }) {
  const tipi      = useFbStore(s => s.tipiMenu)
  const categorie = useFbStore(s => s.categorie)
  const voci      = useFbStore(s => s.voci)
  const salva     = useFbStore(s => s.salvaTipoMenu)
  const elimina   = useFbStore(s => s.eliminaTipoMenu)
  const confirm   = useConfirmStore(s => s.confirm)

  const [form, setForm] = useState<TipoMenu | null>(null)

  const righe = useMemo(() => tipi.slice().sort((a, b) => a.ordine - b.ordine).map(t => {
    const cat = categorie.filter(c => c.tipoId === t.id)
    const idCat = cat.map(c => c.id)
    const dentro = voci.filter(v => idCat.includes(v.categoriaId))
    return {
      ...t,
      categorie: cat.length,
      voci: dentro.length,
      prezzoMedio: dentro.length ? dentro.reduce((a, v) => a + v.prezzo, 0) / dentro.length : 0,
    }
  }), [tipi, categorie, voci])

  const chiediElimina = async (t: TipoMenu) => {
    const cat = categorie.filter(c => c.tipoId === t.id).length
    const ok = await confirm({
      message: cat
        ? `Eliminare il tipo “${t.nome}”? Restano senza tipo ${cat} ${cat === 1 ? 'categoria' : 'categorie'}.`
        : `Eliminare il tipo di menu “${t.nome}”?`,
      confirmLabel: 'Elimina',
    })
    if (ok) { elimina(t.id); toast.info('Tipo di menu eliminato') }
  }

  const conferma = () => {
    if (!form) return
    if (!form.nome.trim()) { toast.warning('Manca il nome del tipo'); return }
    salva(form)
    toast.success(form.id ? 'Tipo di menu aggiornato' : `Tipo “${form.nome}” creato`)
    setForm(null)
  }

  return (
    <div className="fbtipi">
      <PageHead
        title="Tipi menu"
        subtitle="Il primo livello del catalogo: quello che si tocca per primo in comanda"
        actions={
          <button
            type="button" className="fbtipi__head-btn"
            onClick={() => setForm(vuoto(Math.max(0, ...tipi.map(t => t.ordine)) + 1))}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo tipo
          </button>
        }
      />

      <div className="sib-table-wrap">
        <table className="sib-table fbtipi__table">
          <colgroup>
            <col className="fbtipi__c-ord" /><col className="fbtipi__c-nome" />
            <col className="fbtipi__c-col" /><col className="fbtipi__c-num" />
            <col className="fbtipi__c-num" /><col className="fbtipi__c-prezzo" />
            <col className="fbtipi__c-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Tipo</th>
              <th>Colore</th>
              <th>Categorie</th>
              <th>Voci</th>
              <th className="fbtipi__amt">Prezzo medio</th>
              <th className="fbtipi__c-act" aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.map(t => (
              <tr key={t.id}>
                <td className="fbtipi__num">{t.ordine}</td>
                <td>
                  <span className="fbtipi__nome" style={{ '--tipo': t.colore } as React.CSSProperties}>
                    <i className="fbtipi__pallino" aria-hidden="true" />
                    <TruncatedText text={t.nome} />
                  </span>
                </td>
                <td className="fbtipi__col">{t.colore.toUpperCase()}</td>
                <td className="fbtipi__num">{t.categorie}</td>
                <td className="fbtipi__num">{t.voci}</td>
                <td className="fbtipi__amt">
                  {t.prezzoMedio.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </td>
                <td className="fbtipi__act">
                  <button type="button" aria-label="Vai alle categorie del tipo" onClick={() => navigate?.('fb-categorie')}>
                    <Tooltip text="Categorie"><i className="fa-solid fa-tags" /></Tooltip>
                  </button>
                  <button type="button" aria-label="Modifica il tipo" onClick={() => setForm({ ...t })}>
                    <Tooltip text="Modifica"><i className="fa-solid fa-pen" /></Tooltip>
                  </button>
                  <button type="button" aria-label="Elimina il tipo" onClick={() => chiediElimina(t)}>
                    <Tooltip text="Elimina"><i className="fa-solid fa-trash" /></Tooltip>
                  </button>
                </td>
              </tr>
            ))}
            {!righe.length && (
              <tr><td colSpan={7} className="fbtipi__vuoto">Nessun tipo di menu configurato.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? `Tipo menu — ${form.nome}` : 'Nuovo tipo di menu'}
        size="md"
      >
        {form && (
          <div className="fbtipi-form">
            <div className="fbtipi-form__row">
              <InputField
                name="nome" label="Nome" className="fbtipi-form__grow" value={form.nome}
                placeholder="es. Cantina"
                onChange={e => setForm(f => f && ({ ...f, nome: e.target.value }))}
              />
              <InputField
                name="ordine" label="Ordine" type="number" value={form.ordine}
                onChange={e => setForm(f => f && ({ ...f, ordine: +e.target.value || 0 }))}
              />
            </div>

            <div className="fbtipi-form__blk">
              <span className="fbtipi-form__lab">Colore</span>
              <div className="fbtipi-form__colori">
                {COLORI.map(c => (
                  <button
                    key={c} type="button"
                    className={`fbtipi-form__colore ${c === form.colore ? 'is-on' : ''}`}
                    style={{ '--c': c } as React.CSSProperties}
                    aria-label={`Colore ${c}`}
                    onClick={() => setForm(f => f && ({ ...f, colore: c }))}
                  />
                ))}
              </div>
            </div>

            <footer className="fbtipi-form__foot">
              <button type="button" className="fbtipi-form__annulla" onClick={() => setForm(null)}>Annulla</button>
              <button type="button" className="fbtipi-form__ok" onClick={conferma}>
                <i className="fa-solid fa-check" aria-hidden="true" /> {form.id ? 'Salva' : 'Crea il tipo'}
              </button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
