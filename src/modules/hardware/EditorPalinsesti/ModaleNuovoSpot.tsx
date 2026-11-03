import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import Modal from '../../../core/components/Modal'
import { InputField, RadioGroup } from '../../../core/components/form'
import SpotPlayer from '../_shared/SpotPlayer'
import { durataProgetto, type FormatoSpot, type Progetto } from '../../../store/useTotemStore'
import { MODELLI } from './editorModel'
import './ModaleNuovoSpot.sass'

/** Nuovo spot: nome, cartella, formato e un modello di partenza (con anteprima animata). */
interface Props {
  open: boolean
  cartella: string
  onClose: () => void
  onCrea: (nome: string, cartella: string, base: Pick<Progetto, 'slides' | 'formato'>) => void
}

export default function ModaleNuovoSpot({ open, cartella, onClose, onCrea }: Props) {
  const [nome, setNome] = useState('')
  const [cart, setCart] = useState(cartella)
  const [formato, setFormato] = useState<FormatoSpot>('verticale')
  const [modello, setModello] = useState(MODELLI[1].id)
  useEffect(() => { if (open) { setNome(''); setCart(cartella) } }, [open, cartella])

  // Un'anteprima per modello, rigenerata solo al cambio di formato.
  const anteprime = useMemo(() => MODELLI.map(m => ({ m, p: { id: `tpl-${m.id}-${formato}`, nome: m.nome, cartella: '', updatedAt: '', formato, slides: m.slides() } as Progetto })), [formato])
  const scelto = anteprime.find(a => a.m.id === modello) ?? anteprime[0]

  return (
    <Modal open={open} onClose={onClose} title="Nuovo spot" size="xl">
      <div className="mnspot">
        <div className="mnspot__form">
          <InputField name="np-nome" label="Nome dello spot" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Brunch della domenica" />
          <InputField name="np-cartella" label="Cartella" value={cart} onChange={e => setCart(e.target.value)} hint="Raggruppa gli spot per stagione o campagna" />
          <RadioGroup name="np-formato" label="Formato" value={formato} onChange={v => setFormato(v as FormatoSpot)}
            options={[{ value: 'verticale', label: 'Verticale 9:16 (totem)' }, { value: 'orizzontale', label: 'Orizzontale 16:9 (schermi)' }]} />
          <div className={clsx('mnspot__live', formato === 'orizzontale' && 'mnspot__live--oriz')}>
            <SpotPlayer progetto={scelto.p} />
          </div>
          <p className="mnspot__hint">{scelto.m.descrizione} · {scelto.p.slides.length} slide · {durataProgetto(scelto.p)} s</p>
        </div>
        <div className="mnspot__tpl">
          <span className="mnspot__lbl">Parti da un modello</span>
          <div className="mnspot__grid">
            {anteprime.map(({ m, p }) => (
              <button key={m.id} type="button" className={clsx('mnspot__card', m.id === modello && 'mnspot__card--on')} onClick={() => setModello(m.id)}>
                <span className={clsx('mnspot__thumb', formato === 'orizzontale' && 'mnspot__thumb--oriz')}><SpotPlayer progetto={p} play={false} progress={false} /></span>
                <span className="mnspot__card-txt"><i className={`fa-solid fa-${m.ico}`} aria-hidden="true" /> {m.nome}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mnspot__acts">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!nome.trim()} onClick={() => onCrea(nome.trim(), cart.trim() || 'Palinsesti', { slides: scelto.p.slides, formato })}>
          <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Crea spot
        </button>
      </div>
    </Modal>
  )
}
