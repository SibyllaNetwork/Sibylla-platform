import { useNavigate } from 'react-router-dom';
import { Icon } from '../ds/icon';
import { MenuCircle } from './MenuCircle';
import './RightMenu.css';

export function RightMenu() {
  const navigate = useNavigate();

  return (
    <nav className="right-menu" aria-label="Dashboard">
      <MenuCircle
        consId="cons-dashboard"
        title="Dashboard"
        icon={<Icon family="light" name="gauge-high" />}
        isActive={false}
        onEnter={() => {}}
        onLeave={() => {}}
        onActivate={() => navigate('/dashboard')}
      />
    </nav>
  );
}
