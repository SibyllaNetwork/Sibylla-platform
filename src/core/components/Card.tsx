import React from 'react'

interface CardProps {
  title?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

const Card: React.FC<CardProps> = ({ title, headerRight, children, className = '', noPadding = false }) => (
  <div className={`bg-white rounded-card border border-line overflow-hidden ${className}`}>
    {(title || headerRight) && (
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        {title && <h3 className="text-[13px] font-bold font-poppins text-primary">{title}</h3>}
        {headerRight}
      </div>
    )}
    <div className={noPadding ? '' : 'p-4'}>
      {children}
    </div>
  </div>
)

export default Card
