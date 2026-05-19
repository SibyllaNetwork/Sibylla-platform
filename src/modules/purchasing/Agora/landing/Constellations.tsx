import './Constellations.css';

export type ConstellationId = 'cons-annunci' | 'cons-strutture' | 'cons-accademia';

interface ConstellationsProps {
  /** ID della costellazione attiva, oppure null per nasconderle tutte */
  active: ConstellationId | null;
}

export function Constellations({ active }: ConstellationsProps) {
  return (
    <div className="landing-constellation-layer" aria-hidden="true">
      {/* AQUILA — sviluppata orizzontalmente nel cielo (y 140-460) */}
      <svg
        className={`landing-constellation${active === 'cons-annunci' ? ' is-visible' : ''}`}
        id="cons-annunci"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <line className="landing-c-line" x1="460"  y1="260" x2="640"  y2="200" />
        <line className="landing-c-line" x1="640"  y1="200" x2="860"  y2="260" />
        <line className="landing-c-line" x1="860"  y1="260" x2="1080" y2="260" />
        <line className="landing-c-line" x1="1080" y1="260" x2="1280" y2="220" />
        <line className="landing-c-line" x1="1280" y1="220" x2="1500" y2="160" />
        <line className="landing-c-line" x1="860"  y1="260" x2="780"  y2="400" />
        <line className="landing-c-line" x1="780"  y1="400" x2="680"  y2="480" />
        <line className="landing-c-line" x1="1080" y1="260" x2="1160" y2="380" />
        <circle className="landing-c-star" cx="460"  cy="260" r="3.5" />
        <circle className="landing-c-star" cx="640"  cy="200" r="4" />
        <circle className="landing-c-star" cx="860"  cy="260" r="4.5" />
        <circle className="landing-c-star" cx="970"  cy="260" r="6.5" />
        <circle className="landing-c-star" cx="1080" cy="260" r="3.8" />
        <circle className="landing-c-star" cx="1280" cy="220" r="4" />
        <circle className="landing-c-star" cx="1500" cy="160" r="3.5" />
        <circle className="landing-c-star" cx="780"  cy="400" r="3.5" />
        <circle className="landing-c-star" cx="680"  cy="480" r="3" />
        <circle className="landing-c-star" cx="1160" cy="380" r="3" />
      </svg>

      {/* CYGNUS — la Croce del Nord, distesa orizzontalmente */}
      <svg
        className={`landing-constellation${active === 'cons-strutture' ? ' is-visible' : ''}`}
        id="cons-strutture"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Asse principale del corpo (Albireo → Sadr → Deneb) */}
        <line className="landing-c-line" x1="380"  y1="490" x2="700"  y2="380" />
        <line className="landing-c-line" x1="700"  y1="380" x2="970"  y2="300" />
        <line className="landing-c-line" x1="970"  y1="300" x2="1220" y2="220" />
        <line className="landing-c-line" x1="1220" y1="220" x2="1480" y2="160" />
        {/* Ala sinistra */}
        <line className="landing-c-line" x1="970" y1="300" x2="780" y2="220" />
        <line className="landing-c-line" x1="780" y1="220" x2="600" y2="170" />
        <line className="landing-c-line" x1="600" y1="170" x2="480" y2="200" />
        {/* Ala destra */}
        <line className="landing-c-line" x1="970"  y1="300" x2="1140" y2="420" />
        <line className="landing-c-line" x1="1140" y1="420" x2="1320" y2="500" />
        <line className="landing-c-line" x1="1320" y1="500" x2="1500" y2="540" />
        {/* Stelle */}
        <circle className="landing-c-star" cx="380"  cy="490" r="4.2" />
        <circle className="landing-c-star" cx="700"  cy="380" r="3.8" />
        <circle className="landing-c-star" cx="970"  cy="300" r="5.6" />
        <circle className="landing-c-star" cx="1220" cy="220" r="4.4" />
        <circle className="landing-c-star" cx="1480" cy="160" r="6.8" />
        <circle className="landing-c-star" cx="780"  cy="220" r="3.8" />
        <circle className="landing-c-star" cx="600"  cy="170" r="4.6" />
        <circle className="landing-c-star" cx="480"  cy="200" r="3.2" />
        <circle className="landing-c-star" cx="1140" cy="420" r="3.8" />
        <circle className="landing-c-star" cx="1320" cy="500" r="3.6" />
        <circle className="landing-c-star" cx="1500" cy="540" r="3" />
        <circle className="landing-c-star" cx="1610" cy="120" r="2.4" />
      </svg>

      {/* ORION — sviluppato orizzontalmente nel cielo */}
      <svg
        className={`landing-constellation${active === 'cons-accademia' ? ' is-visible' : ''}`}
        id="cons-accademia"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <line className="landing-c-line" x1="460"  y1="200" x2="700"  y2="260" />
        <line className="landing-c-line" x1="700"  y1="260" x2="800"  y2="340" />
        <line className="landing-c-line" x1="800"  y1="340" x2="900"  y2="340" />
        <line className="landing-c-line" x1="900"  y1="340" x2="1000" y2="340" />
        <line className="landing-c-line" x1="1000" y1="340" x2="1100" y2="340" />
        <line className="landing-c-line" x1="800"  y1="340" x2="720"  y2="450" />
        <line className="landing-c-line" x1="1100" y1="340" x2="1180" y2="460" />
        <line className="landing-c-line" x1="1100" y1="340" x2="1320" y2="260" />
        <line className="landing-c-line" x1="1320" y1="260" x2="1480" y2="200" />
        <line className="landing-c-line" x1="720"  y1="450" x2="680"  y2="500" />
        <line className="landing-c-line" x1="1180" y1="460" x2="1240" y2="500" />
        <circle className="landing-c-star" cx="460"  cy="200" r="3.5" />
        <circle className="landing-c-star" cx="700"  cy="260" r="5.5" />
        <circle className="landing-c-star" cx="800"  cy="340" r="4.8" />
        <circle className="landing-c-star" cx="900"  cy="340" r="4.5" />
        <circle className="landing-c-star" cx="1000" cy="340" r="4.8" />
        <circle className="landing-c-star" cx="1100" cy="340" r="6.5" />
        <circle className="landing-c-star" cx="720"  cy="450" r="4" />
        <circle className="landing-c-star" cx="680"  cy="500" r="5" />
        <circle className="landing-c-star" cx="1180" cy="460" r="4" />
        <circle className="landing-c-star" cx="1240" cy="500" r="4" />
        <circle className="landing-c-star" cx="1320" cy="260" r="3.5" />
        <circle className="landing-c-star" cx="1480" cy="200" r="3.5" />
      </svg>
    </div>
  );
}
