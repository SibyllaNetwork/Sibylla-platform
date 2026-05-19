import cittaPng from './assets/citta.png';
import './City.css';

export function City() {
  return (
    <div className="landing-city-wrap" aria-hidden="true">
      <img className="landing-city-img" src={cittaPng} alt="" />
    </div>
  );
}
