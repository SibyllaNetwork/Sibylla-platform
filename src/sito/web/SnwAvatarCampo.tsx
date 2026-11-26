import React, { useRef } from 'react'
import Tooltip from '../../core/components/Tooltip'
import { t } from '../i18n'
import './SnwAvatarCampo.sass'

/**
 * Immagine del profilo dei moduli dell'area riservata (come su
 * sibyllanetwork.com): anteprima tonda e «+» per caricarla. L'immagine viene
 * ritagliata quadrata e ridotta a 256px prima di salvarla.
 */
export default function SnwAvatarCampo({ valore, onChange, compatto }: { valore?: string; onChange: (v: string) => void; compatto?: boolean }) {
  const file = useRef<HTMLInputElement>(null)

  function carica(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const img = new Image()
    img.onload = () => {
      const lato = Math.min(img.width, img.height)
      const cv = document.createElement('canvas')
      cv.width = cv.height = 256
      cv.getContext('2d')!.drawImage(img, (img.width - lato) / 2, (img.height - lato) / 2, lato, lato, 0, 0, 256, 256)
      onChange(cv.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(f)
    e.target.value = ''
  }

  return (
    <div className={compatto ? 'snw-avc snw-avc--compatto' : 'snw-avc'}>
      <span className="snw-avc__tondo">
        {valore ? <img src={valore} alt={t('Immagine del profilo')} /> : <i className="fa-light fa-user" aria-hidden="true" />}
        <Tooltip text={valore ? t('Cambia immagine') : t('Carica immagine')}>
          <button type="button" className="snw-avc__piu" aria-label={valore ? t('Cambia immagine del profilo') : t('Carica immagine del profilo')} onClick={() => file.current?.click()}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
          </button>
        </Tooltip>
      </span>
      <span className="snw-avc__txt">
        <b>{t('Immagine del profilo')}</b>
        <small>{t('Ricordati che l\'immagine sarà tagliata e visualizzata tonda.')}</small>
      </span>
      <input ref={file} type="file" accept="image/*" hidden onChange={carica} />
    </div>
  )
}
