import type { KeyboardEvent, ReactNode } from 'react';
import { PieMenu, type PieMenuItem } from './PieMenu';
import './MenuCircle.css';

interface MenuCircleProps {
  consId: string;
  title: string;
  icon: ReactNode;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onActivate: () => void;
  subItems?: PieMenuItem[];
  disabled?: boolean;
}

export function MenuCircle({
  consId,
  title,
  icon,
  isActive,
  onEnter,
  onLeave,
  onActivate,
  subItems,
  disabled,
}: MenuCircleProps) {
  const handleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) onActivate();
    }
  };

  return (
    <div
      className="menu-circle-wrap"
      data-cons={consId}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        className={`menu-circle${isActive ? ' active' : ''}${disabled ? ' is-disabled' : ''}`}
        data-cons={consId}
        aria-label={title}
        aria-disabled={disabled || undefined}
        aria-expanded={subItems ? isActive : undefined}
        aria-haspopup={subItems ? 'menu' : undefined}
        onFocus={onEnter}
        onBlur={onLeave}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onActivate();
        }}
        onKeyDown={handleKey}
      >
        <svg className="mc-frame" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="ring-outer" cx="50" cy="50" r="48" />
        </svg>
        <div className="mc-bg" />
        <span className="mc-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="mc-label">{title}</span>
      </button>

      {subItems && <PieMenu items={subItems} isOpen={isActive} />}
    </div>
  );
}
