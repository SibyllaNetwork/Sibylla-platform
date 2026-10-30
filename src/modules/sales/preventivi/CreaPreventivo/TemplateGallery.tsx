import React, { useMemo, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { useTemplatePreventivoStore } from '../../../../store/useTemplatePreventivoStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { TEMPLATE_PRONTI, normalizza, type TemplateSoggiorno } from './templateSoggiorno'
import { mailHtml } from './soggiorno'
import { preventivoEsempio } from './esempio'
import { useStruttureSoggiorno } from './PreventivoSoggiorno'
import './TemplateGallery.sass'

/**
 * Primo passo del preventivo di soggiorno: si sceglie la mail da mandare al
 * cliente fra i template pronti (impaginazione standard) e quelli creati dal
 * cliente, oppure si apre l'editor per crearne uno nuovo.
 */
export default function TemplateGallery({ navigate, onScegli }: {
  navigate: (p: string) => void
  onScegli: (templateId: string) => void
}) {
  const personali = useTemplatePreventivoStore((s) => s.personali)
  const salva = useTemplatePreventivoStore((s) => s.salva)
  const elimina = useTemplatePreventivoStore((s) => s.elimina)
  const confirm = useConfirmStore((s) => s.confirm)
  const { iniziale } = useStruttureSoggiorno()
  const esempio = useMemo(() => preventivoEsempio(iniziale, undefined, { foto: true }), [iniziale])
  const [anteprima, setAnteprima] = useState<TemplateSoggiorno | null>(null)

  const duplica = (t: TemplateSoggiorno) => {
    salva({ ...normalizza(t), id: `tpl-${Date.now().toString(36)}`, nome: `${t.nome} (copia)` })
    toast.success(`Template "${t.nome}" duplicato`)
  }
  const rimuovi = async (t: TemplateSoggiorno) => {
    const ok = await confirm({
      title: 'Elimina template',
      message: `Eliminare il template "${t.nome}"? I preventivi già inviati restano come sono; quelli in bozza useranno il template Classico.`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (ok) { elimina(t.id); toast.success(`Template "${t.nome}" eliminato`) }
  }

  const scheda = (t: TemplateSoggiorno) => (
    <article key={t.id} className="tplg__card">
      <button type="button" className="tplg__thumb" onClick={() => setAnteprima(t)} aria-label={`Anteprima del template ${t.nome}`}>
        <Miniatura html={mailHtml({ ...esempio, messaggio: normalizza(t).testi.lettera }, { template: normalizza(t), stampa: true })} titolo={t.nome} />
        <span className="tplg__thumb-hover"><i className="fa-regular fa-eye" aria-hidden="true" /> Anteprima</span>
      </button>
      <div className="tplg__info">
        <div className="tplg__name">
          <strong>{t.nome}</strong>
          {t.pronto ? <span className="tplg__tag">Pronto</span> : <span className="tplg__tag tplg__tag--mio">Mio</span>}
        </div>
        <p className="tplg__desc">{t.descrizione || (t.aggiornato ? `Modificato il ${t.aggiornato}` : 'Template personalizzato')}</p>
        <div className="tplg__acts">
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => onScegli(t.id)}>
            <i className="fa-solid fa-check" aria-hidden="true" /> Usa
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate(`editor-template-soggiorno:${t.id}`)}>
            <i className="fa-regular fa-pen-ruler" aria-hidden="true" /> {t.pronto ? 'Personalizza' : 'Modifica'}
          </button>
          {!t.pronto && (
            <>
              <Tooltip text="Duplica template">
                <button type="button" className="sib-btn sib-btn--icon tplg__ico" aria-label="Duplica template" onClick={() => duplica(t)}>
                  <i className="fa-solid fa-clone" aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip text="Elimina template">
                <button type="button" className="sib-btn sib-btn--icon tplg__ico" aria-label="Elimina template" onClick={() => rimuovi(t)}>
                  <i className="fa-solid fa-trash-can" aria-hidden="true" />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </article>
  )

  return (
    <div className="tplg">
      <section className="tplg__sec">
        <header className="tplg__sec-head">
          <h3>Scegli il template della mail</h3>
          <span>Un'impaginazione pronta da usare subito, oppure il tuo template personalizzato</span>
        </header>
        <div className="tplg__grid">
          <button type="button" className="tplg__new" onClick={() => navigate('editor-template-soggiorno')}>
            <span className="tplg__new-ico"><i className="fa-regular fa-plus" aria-hidden="true" /></span>
            <strong>Crea il tuo template</strong>
            <small>Impaginazione, lettera, font, colori, dimensioni, bordi e angoli: personalizzi tutto e lo salvi per i prossimi preventivi</small>
          </button>
          {personali.map(scheda)}
          {TEMPLATE_PRONTI.map(scheda)}
        </div>
      </section>

      {anteprima && (
        <Modal open onClose={() => setAnteprima(null)} size="xl" title={`Anteprima · ${anteprima.nome}`} className="tplg-prev">
          <div className="tplg-prev__body">
            <iframe className="tplg-prev__frame" title={`Anteprima ${anteprima.nome}`}
              srcDoc={mailHtml({ ...esempio, messaggio: normalizza(anteprima).testi.lettera }, { template: normalizza(anteprima), stampa: true })} />
          </div>
          <div className="tplg-prev__foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setAnteprima(null)}>Chiudi</button>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate(`editor-template-soggiorno:${anteprima.id}`)}>
              <i className="fa-regular fa-pen-ruler" aria-hidden="true" /> {anteprima.pronto ? 'Personalizza' : 'Modifica'}
            </button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => onScegli(anteprima.id)}>
              <i className="fa-solid fa-check" aria-hidden="true" /> Usa questo template
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Mail ridotta in scala, non interattiva. */
export function Miniatura({ html, titolo }: { html: string; titolo: string }) {
  return (
    <span className="tplg-mini">
      <iframe className="tplg-mini__frame" title={`Miniatura ${titolo}`} srcDoc={html} tabIndex={-1} loading="lazy" />
    </span>
  )
}
