import { useState } from 'react';
import { Button } from '../ds/button';
import { Icon } from '../ds/icon';
import { H2, H3, P3, P4, P6 } from '../ds/typography';
import './HotelCard.css';

interface HotelCardProps {
  name: string;
  location: string;
  stars: number;
  image: string;
  rooms: string;
  price: number;
  onBook?: () => void;
  justAdded?: boolean;
}

export function HotelCard({
  name,
  location,
  stars,
  image,
  rooms,
  price,
  onBook,
  justAdded = false,
}: HotelCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <article className="hotel-card">
      <div className="hotel-card__media">
        <img src={image} alt={name} className="hotel-card__image" />
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          aria-label={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          className={`hotel-card__fav${isFavorite ? ' hotel-card__fav--active' : ''}`}
        >
          <Icon family={isFavorite ? 'solid' : 'regular'} name="heart" />
        </button>
      </div>

      <div className="hotel-card__body">
        <div className="hotel-card__stars">
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon
              key={i}
              family="solid"
              name="star"
              className={i < stars ? 'hotel-card__star' : 'hotel-card__star--dim'}
            />
          ))}
        </div>

        <H3 className="hotel-card__title">{name}</H3>

        <P3 className="hotel-card__location">
          <Icon family="regular" name="location-dot" className="hotel-card__location-icon" />
          {location}
        </P3>

        <P4 className="hotel-card__rooms">{rooms}</P4>

        <div className="hotel-card__footer">
          <div>
            <P6 className="hotel-card__price-label">a partire da</P6>
            <H2 className="hotel-card__price">{price} €</H2>
          </div>
          <Button
            variant={justAdded ? 'approve' : 'primary'}
            size="md"
            onClick={onBook}
          >
            <Icon
              family="regular"
              name={justAdded ? 'check' : 'cart-shopping'}
              data-slot="icon"
            />
            {justAdded ? 'Aggiunto' : 'Prenota'}
          </Button>
        </div>
      </div>
    </article>
  );
}
