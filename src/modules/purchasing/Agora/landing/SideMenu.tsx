import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ds/icon';
import { MenuCircle } from './MenuCircle';
import type { ConstellationId } from './Constellations';
import type { PieMenuItem } from './PieMenu';
import './SideMenu.css';

interface SideMenuProps {
  onShow: (id: ConstellationId) => void;
  onHide: () => void;
}

interface MenuItem {
  id: ConstellationId;
  title: string;
  icon: ReactNode;
  to: string;
  subItems?: PieMenuItem[];
}

const ITEMS: MenuItem[] = [
  {
    id: 'cons-annunci',
    title: 'Tradezone',
    to: '/announcements',
    icon: <Icon family="light" name="scale-balanced" />,
    subItems: [
      { id: 'sub-annunci', label: 'Annunci', icon: 'bullhorn', to: '/announcements' },
      { id: 'sub-acquisti', label: 'Acquisti di Rete', icon: 'users', to: '/group-purchases' },
      { id: 'sub-match', label: 'Match Zone', icon: 'circle-nodes', to: '/match-zone' },
    ],
  },
  {
    id: 'cons-strutture',
    title: 'Pacchetti dinamici',
    to: '/dynamic-packages',
    icon: <Icon family="light" name="compass" />,
  },
  {
    id: 'cons-accademia',
    title: 'E-learning',
    to: '/elearning',
    icon: <Icon family="light" name="book-open" />,
  },
];

export function SideMenu({ onShow, onHide }: SideMenuProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLElement | null>(null);
  const [hoveredId, setHoveredId] = useState<ConstellationId | null>(null);
  const [lockedId, setLockedId] = useState<ConstellationId | null>(null);

  const activeId = lockedId ?? hoveredId;

  useEffect(() => {
    if (activeId) onShow(activeId);
    else onHide();
  }, [activeId, onShow, onHide]);

  // Click outside the side menu closes the locked pie.
  useEffect(() => {
    if (!lockedId) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setLockedId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [lockedId]);

  return (
    <nav ref={containerRef} className="side-menu" aria-label="Menu principale Agorà">
      {ITEMS.map((item) => (
        <MenuCircle
          key={item.id}
          consId={item.id}
          title={item.title}
          icon={item.icon}
          isActive={activeId === item.id}
          subItems={item.subItems}
          onEnter={() => setHoveredId(item.id)}
          onLeave={() => setHoveredId(null)}
          onActivate={() => {
            if (item.subItems) {
              setLockedId((prev) => (prev === item.id ? null : item.id));
            } else {
              navigate(item.to);
            }
          }}
        />
      ))}
    </nav>
  );
}
