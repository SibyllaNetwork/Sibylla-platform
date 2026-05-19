import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ds/icon';
import './PieMenu.css';

export interface PieMenuItem {
  id: string;
  label: string;
  icon: string;
  to: string;
}

interface PieMenuProps {
  items: PieMenuItem[];
  isOpen: boolean;
}

export function PieMenu({ items, isOpen }: PieMenuProps) {
  const navigate = useNavigate();

  return (
    <div className={`pie-menu${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          className="pie-menu__item"
          style={{ '--i': i } as CSSProperties}
          tabIndex={isOpen ? 0 : -1}
          aria-label={item.label}
          onClick={(e) => {
            e.stopPropagation();
            navigate(item.to);
          }}
        >
          <span className="pie-menu__icon" aria-hidden="true">
            <Icon family="light" name={item.icon} />
          </span>
          <span className="pie-menu__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
