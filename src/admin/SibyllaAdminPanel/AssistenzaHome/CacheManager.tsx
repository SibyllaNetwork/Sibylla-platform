import React from 'react'
import Ico from '../../../core/icons/Ico'
import { toast } from '../../../core/components/Toast/useToast'
import './CacheManager.sass'

interface Props { navigate: (p: string) => void }

export default function CacheManager({ navigate }: Props) {
  const clearCache = () => toast.success('Cache dei report svuotata correttamente.', 'Cache Manager')

  return (
    <div className="cmg">
      <button type="button" className="cmg__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="cmg__head">
        <h1 className="cmg__title">Cache Manager</h1>
        <p className="cmg__sub">Svuota la cache dei report per forzare il ricalcolo dei dati.</p>
      </div>

      <button type="button" className="cmg__clear" onClick={clearCache}>
        <Ico n="refresh" s={14} c="#fff" /> Clear Report Cache
      </button>
    </div>
  )
}
