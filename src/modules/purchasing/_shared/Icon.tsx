import React from 'react'

interface IconProps {
  family?: 'light' | 'solid' | 'regular' | 'duotone'
  name: string
  className?: string
}

export function Icon({ family = 'light', name, className = '' }: IconProps) {
  const fam = family === 'duotone' ? 'duotone' : family === 'solid' ? 'solid' : family === 'regular' ? 'regular' : 'light'
  return <i className={`fa-${fam} fa-${name} ${className}`.trim()} />
}
