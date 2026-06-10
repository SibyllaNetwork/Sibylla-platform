import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  className?: string
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, eyebrow, className = '' }) => (
  <div className={`page-header ${className}`}>
    {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
    <h1 className="page-header__title">{title}</h1>
    {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
  </div>
)

export default PageHeader
