import React from 'react'
import Ico from '../icons/Ico'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, className = '' }) => {
  if (totalPages <= 1) return null

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages]
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
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
    </div>
  )
}

export default Pagination
