import React from 'react'
import Ico from '../icons/Ico'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  // ── Modalità "ricca" (opzionale): info + selettore righe per pagina ──
  total?: number
  pageStart?: number               // indice 0-based del primo elemento mostrato
  pageEnd?: number                 // indice (esclusivo) dell'ultimo mostrato
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
}

const Pagination: React.FC<PaginationProps> = ({
  page, totalPages, onPageChange, className = '',
  total, pageStart, pageEnd, pageSize, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange,
}) => {
  const rich = !!onPageSizeChange

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages]
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }

  const controlsInner = (
    <>
      <button
        className="sib-btn sib-btn--secondary sib-btn--sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <Ico n="back" s={11} c="currentColor" /> Indietro
      </button>
      {getPages().map((n, i) =>
        n === '...' ? (
          <span key={`e${i}`} className="px-1 text-xs text-ink-subtle">...</span>
        ) : (
          <button
            key={n}
            onClick={() => onPageChange(n)}
            className={`w-7 h-7 rounded-field text-xs font-semibold font-opensans cursor-pointer transition-colors duration-150 ${
              page === n
                ? 'bg-primary text-white'
                : 'bg-white border border-line text-ink hover:border-primary hover:text-primary'
            }`}
          >
            {n}
          </button>
        )
      )}
      <button
        className="sib-btn sib-btn--secondary sib-btn--sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Avanti <Ico n="chevr" s={11} c="currentColor" />
      </button>
    </>
  )

  const controls = <div className="flex items-center gap-1.5">{controlsInner}</div>

  // ── Modalità semplice: solo i controlli (comportamento storico) ──
  if (!rich) {
    if (totalPages <= 1) return null
    return <div className={`flex items-center gap-1.5 ${className}`}>{controlsInner}</div>
  }

  // ── Modalità ricca: info · controlli · righe per pagina ──
  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap ${className}`}>
      <div className="text-xs text-ink-muted">
        {total != null && pageStart != null && pageEnd != null && (
          <>Mostra <strong className="text-ink">{Math.min(pageStart + 1, total)}</strong>–<strong className="text-ink">{pageEnd}</strong> di <strong className="text-ink">{total}</strong></>
        )}
      </div>
      {controls}
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        Righe per pagina
        <select
          className="sib-select sib-select--dense w-auto"
          value={pageSize}
          onChange={(e) => onPageSizeChange!(Number(e.target.value))}
        >
          {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </div>
  )
}

export default Pagination
