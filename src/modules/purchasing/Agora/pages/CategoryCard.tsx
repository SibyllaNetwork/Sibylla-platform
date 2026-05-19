import { useNavigate } from 'react-router-dom';
import { Icon } from '../ds/icon';
import './CategoryCard.css';

interface CategoryCardProps {
  id: number;
  name: string;
  icon: string;
  count: number;
  description: string;
}

export function CategoryCard({ id, name, icon, count, description }: CategoryCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="category-card"
      onClick={() => navigate(`/category/${id}`)}
    >
      <div className="category-card__inner">
        <div className="category-card__head">
          <span className="category-card__icon">
            <Icon family="light" name={icon} />
          </span>
          <span className="category-card__badge">{count}</span>
        </div>

        <h3 className="category-card__title">{name}</h3>
        <p className="category-card__desc">{description}</p>

        <span className="category-card__link">
          Esplora fornitori
          <Icon family="regular" name="arrow-right" />
        </span>
      </div>
    </button>
  );
}
