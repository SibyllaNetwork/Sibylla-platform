import React from 'react'
import T from '../tokens'

const AnalisiBadge = ({ type, text }: { type: 'warning' | 'success'; text: string }) => {
  const ok = type === 'success'
  return (
    <div className={`analisi-badge analisi-badge--${type}`}>
      {ok
        ? <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.success} strokeWidth="2" strokeLinecap="round">
            <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
            <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
          </svg>
        : <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.warning} strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
      }
      <span className="analisi-badge__text">{text}</span>
    </div>
  )
}

export default AnalisiBadge
