import React from 'react'

interface FormGridProps {
  cols?: 2 | 3 | 4
  children: React.ReactNode
  className?: string
}

const colsClass: Record<number, string> = {
  2: 'grid grid-cols-2 gap-3',
  3: 'grid grid-cols-3 gap-3',
  4: 'grid grid-cols-4 gap-3',
}

const FormGrid: React.FC<FormGridProps> = ({ cols = 2, children, className = '' }) => (
  <div className={`${colsClass[cols]} ${className}`}>
    {children}
  </div>
)

export default FormGrid
