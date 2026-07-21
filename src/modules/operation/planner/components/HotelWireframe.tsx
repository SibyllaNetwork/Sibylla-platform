// ─── HotelWireframe ───────────────────────────────────────────────────────────
// Hotel in prospettiva (assonometria esplosa): ogni piano impostato è una
// piattaforma isometrica nella sagoma ghost dell'edificio, ARREDATA in modo
// illustrativo (reception al piano terra; corridoio, letti, ascensore e avventori
// ai piani camere). È un elemento puramente visivo: il click su un piano apre la
// planimetria/editor (gestito dal parent). Il dato camere vive nella planimetria.
import React from 'react';
import { Piano } from '../planner.types';
import HotelCrowd, { CrowdScene } from './HotelCrowd';

interface Props {
  piani: Piano[];
  selectedId?: number | null;
  onFloorClick?: (piano: Piano) => void;
}

// ── Parametri proiezione isometrica ──
const CX = 25;
const CY = 12.5;
const SLAB = 5;
const FLOOR_GAP = 84;
const TOP = 22;
const LABEL_W = 28;        // zona badge a sinistra (la struttura resta centrata)
const VW = 206;
const CXT = VW / 2;        // struttura centrata nel pannello

const gridDims = (n: number): [number, number] => {
  const c = Math.max(1, Math.ceil(Math.sqrt(n)));
  const r = Math.max(1, Math.ceil(n / c));
  return [c, r];
};

const pt = (Ox: number, Oy: number, i: number, j: number) =>
  `${(Ox + (i - j) * CX).toFixed(1)},${(Oy + (i + j) * CY).toFixed(1)}`;
const xy = (Ox: number, Oy: number, i: number, j: number): [number, number] =>
  [Ox + (i - j) * CX, Oy + (i + j) * CY];
const originX = (C: number, R: number) => CXT - ((C - R) * CX) / 2;

const HotelWireframe: React.FC<Props> = ({ piani, selectedId, onFloorClick }) => {
  if (!piani.length) return null;

  const floors = [...piani].reverse();
  const maxRooms = Math.max(...floors.map(f => f.camere.length));
  const [maxC, maxR] = gridDims(maxRooms);

  // ── Ascensore: cabina addossata alla parete posteriore (j piccolo), colonna a
  // destra. Stessa footprint su ogni piano → forma un vano verticale allineato.
  // Ha una porta sulla faccia frontale: gli avventori vi entrano/escono.
  const EL = { i0: maxC - 0.85, i1: maxC - 0.25, j0: 0.18, j1: 0.78, h: 21 };
  const elevator = (
    P: (i: number, j: number, dy?: number) => [number, number],
    poly: (pts: [number, number][]) => string,
    key: string,
  ) => {
    const { i0, i1, j0, j1, h } = EL;
    const mid = (i0 + i1) / 2;
    const [sx1, sy1] = P(mid, j1, 2);
    const [sx2, sy2] = P(mid, j1, h - 2);
    return (
      <g key={key}>
        {/* fianco destro + faccia frontale + tetto cabina */}
        <polygon className="hotel-viz__lift-side" points={poly([P(i1, j1), P(i1, j0), P(i1, j0, h), P(i1, j1, h)])} />
        <polygon className="hotel-viz__lift-front" points={poly([P(i0, j1), P(i1, j1), P(i1, j1, h), P(i0, j1, h)])} />
        <polygon className="hotel-viz__lift-top" points={poly([P(i0, j0, h), P(i1, j0, h), P(i1, j1, h), P(i0, j1, h)])} />
        {/* porta (faccia frontale, incassata) + fenditura centrale */}
        <polygon className="hotel-viz__lift-door" points={poly([P(i0 + 0.12, j1, 2), P(i1 - 0.12, j1, 2), P(i1 - 0.12, j1, h - 2), P(i0 + 0.12, j1, h - 2)])} />
        <line className="hotel-viz__lift-seam" x1={sx1} y1={sy1} x2={sx2} y2={sy2} />
      </g>
    );
  };

  // Il piano più basso (Piano Terra, badge 0) è la lobby col desk
  const bottomOy = TOP + (floors.length - 1) * FLOOR_GAP;
  const svgH = bottomOy + (maxC + maxR) * CY + SLAB + 18;

  // Sagoma ghost dell'edificio
  const envOy = TOP - 6;
  const envOx = originX(maxC, maxR);
  const [Tx, Ty] = xy(envOx, envOy, 0, 0);
  const [Rx, Ry] = xy(envOx, envOy, maxC, 0);
  const [Bx, By] = xy(envOx, envOy, maxC, maxR);
  const [Lx, Ly] = xy(envOx, envOy, 0, maxR);
  const envH = bottomOy - envOy;

  // viewBox ritagliato sulla sagoma reale: così la struttura riempie l'SVG (e
  // quindi la barra) invece di lasciare vuoti nel viewBox. Il margine di ~10px
  // attorno è dato dal padding del contenitore (.hotel-viz__scroll).
  const VB_PAD = 1;
  const bLeftX = envOx - maxR * CX;                 // punta sinistra edificio
  const bRightX = envOx + maxC * CX;                // punta destra edificio
  const badgeLeftX = LABEL_W / 2 - 9;               // bordo sinistro del badge tondo
  const vbX = Math.min(bLeftX, badgeLeftX) - VB_PAD;
  const vbW = bRightX + VB_PAD - vbX;
  const vbY = envOy - VB_PAD;
  const vbH = (svgH - 18) + VB_PAD - vbY;           // svgH include 18px di coda: escludili

  // ── Finestre sulle due facciate (per leggere l'edificio come hotel) ──
  const WIN_VPAD = 8;   // margine verticale finestra dentro il piano
  const WIN_HPAD = 0.24; // margine orizzontale (frazione di colonna)
  const leftTop = (frac: number): [number, number] => [envOx + (frac - maxR) * CX, envOy + (frac + maxR) * CY];
  const rightTop = (frac: number): [number, number] => [envOx + (maxC - maxR + frac) * CX, envOy + (maxC + maxR - frac) * CY];
  const buildWindows = (topEdge: (f: number) => [number, number], nSlots: number, tag: string) => {
    const out: React.ReactNode[] = [];
    // niente finestre sull'ultimo livello (lobby/piano terra)
    for (let f = 0; f < floors.length - 1; f++) {
      const yTop = f * FLOOR_GAP + WIN_VPAD;
      const yBot = (f + 1) * FLOOR_GAP - WIN_VPAD;
      for (let s = 0; s < nSlots; s++) {
        const [ax, ay] = topEdge(s + WIN_HPAD);
        const [bx, by] = topEdge(s + 1 - WIN_HPAD);
        out.push(
          <polygon
            key={`${tag}${f}-${s}`}
            className="hotel-viz__iso-window"
            points={`${ax.toFixed(1)},${(ay + yTop).toFixed(1)} ${bx.toFixed(1)},${(by + yTop).toFixed(1)} ${bx.toFixed(1)},${(by + yBot).toFixed(1)} ${ax.toFixed(1)},${(ay + yBot).toFixed(1)}`}
          />,
        );
      }
    }
    return out;
  };

  // Bordo superiore (rombo) di un plate, per evidenziare hover/selezione
  const plateOutline = (Ox: number, Oy: number) =>
    `${pt(Ox, Oy, 0, 0)} ${pt(Ox, Oy, maxC, 0)} ${pt(Ox, Oy, maxC, maxR)} ${pt(Ox, Oy, 0, maxR)}`;

  const slab = (Ox: number, Oy: number) => {
    const [lx, ly] = xy(Ox, Oy, 0, maxR);
    const [bx, by] = xy(Ox, Oy, maxC, maxR);
    const [rx, ry] = xy(Ox, Oy, maxC, 0);
    return (
      <>
        <polygon className="hotel-viz__iso-slab" points={`${lx},${ly} ${bx},${by} ${bx},${by + SLAB} ${lx},${ly + SLAB}`} />
        <polygon className="hotel-viz__iso-slab" points={`${bx},${by} ${rx},${ry} ${rx},${ry + SLAB} ${bx},${by + SLAB}`} />
      </>
    );
  };

  // Lobby: desk + poltrone + receptionist sul plate del piano terra
  const renderReception = (rOx: number, rOy: number) => {
    const P = (i: number, j: number, dy = 0): [number, number] => {
      const [x, y] = xy(rOx, rOy, i, j);
      return [x, y - dy];
    };
    const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    // box isometrico generico (cls = prefisso classe: rcp / rcpc / rcppot)
    const Box = (i0: number, j0: number, i1: number, j1: number, h: number, key: string, cls = 'rcp') => (
      <g key={key}>
        <polygon className={`hotel-viz__${cls}-side`} points={poly([P(i0, j1), P(i1, j1), P(i1, j1, h), P(i0, j1, h)])} />
        <polygon className={`hotel-viz__${cls}-side`} points={poly([P(i1, j1), P(i1, j0), P(i1, j0, h), P(i1, j1, h)])} />
        <polygon className={`hotel-viz__${cls}-top`} points={poly([P(i0, j0, h), P(i1, j0, h), P(i1, j1, h), P(i0, j1, h)])} />
      </g>
    );
    // poltrona: seduta + schienale (lato verso il fondo) + braccioli
    const Chair = (i0: number, j0: number, key: string) => {
      const w = 0.62, d = 0.62, seatH = 5, backH = 13, t = 0.14;
      return (
        <g key={key}>
          {Box(i0, j0, i0 + w, j0 + d, seatH, key + 's', 'rcpc')}
          {Box(i0, j0, i0 + w, j0 + t, backH, key + 'b', 'rcpc')}
          {Box(i0, j0, i0 + t, j0 + d, seatH + 3, key + 'al', 'rcpc')}
          {Box(i0 + w - t, j0, i0 + w, j0 + d, seatH + 3, key + 'ar', 'rcpc')}
        </g>
      );
    };
    const mid = maxC / 2;
    const [hx, hy] = P(mid, 0.55, 17);
    // pianta: vaso + chioma
    const [lx, ly] = P(maxC - 0.4, 0.5, 14);
    return (
      <g>
        <polygon className="hotel-viz__rcp-rug" points={poly([P(0.45, 1.55), P(maxC - 0.45, 1.55), P(maxC - 0.45, maxR - 0.35), P(0.45, maxR - 0.35)])} />

        {/* ascensore (parete posteriore) — dietro all'arredo */}
        {elevator(P, poly, 'lift')}

        {/* poltrone (davanti, rivolte al desk) */}
        {Chair(0.5, maxR - 1.2, 'ch1')}
        {Chair(maxC - 1.12, maxR - 1.2, 'ch2')}

        {/* desk reception (in fondo) */}
        {Box(0.6, 0.7, maxC - 0.6, 1.2, 11, 'desk')}

        {/* receptionist al desk */}
        <line className="hotel-viz__rcp-body" x1={P(mid, 0.55)[0]} y1={P(mid, 0.55)[1] - 4} x2={hx} y2={hy + 3} />
        <circle className="hotel-viz__rcp-head" cx={hx} cy={hy} r={3.4} />

        {/* pianta in vaso (angolo) */}
        {Box(maxC - 0.55, 0.35, maxC - 0.25, 0.65, 7, 'pot', 'rcppot')}
        <circle className="hotel-viz__rcp-leaf" cx={lx} cy={ly - 1} r={4.6} />
        <circle className="hotel-viz__rcp-leaf" cx={lx - 3.5} cy={ly + 1.5} r={3.4} />
        <circle className="hotel-viz__rcp-leaf" cx={lx + 3.5} cy={ly + 1.5} r={3.4} />
        <circle className="hotel-viz__rcp-leaf" cx={lx} cy={ly - 5} r={3.2} />
      </g>
    );
  };

  // Scena "piano camere": corridoio centrale, letti sui due lati, ascensore e
  // qualche avventore. È puramente illustrativa (il dato camere vive nella
  // planimetria); serve a rendere ogni piano riconoscibile come piano d'albergo.
  const renderFloorScene = (rOx: number, rOy: number, idx: number) => {
    const P = (i: number, j: number, dy = 0): [number, number] => {
      const [x, y] = xy(rOx, rOy, i, j);
      return [x, y - dy];
    };
    const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const Box = (i0: number, j0: number, i1: number, j1: number, h: number, key: string, cls = 'rcp') => (
      <g key={key}>
        <polygon className={`hotel-viz__${cls}-side`} points={poly([P(i0, j1), P(i1, j1), P(i1, j1, h), P(i0, j1, h)])} />
        <polygon className={`hotel-viz__${cls}-side`} points={poly([P(i1, j1), P(i1, j0), P(i1, j0, h), P(i1, j1, h)])} />
        <polygon className={`hotel-viz__${cls}-top`} points={poly([P(i0, j0, h), P(i1, j0, h), P(i1, j1, h), P(i0, j1, h)])} />
      </g>
    );
    const Figure = (i: number, j: number, key: string) => {
      const [bx, by] = P(i, j);
      const [hx, hy] = P(i, j, 15);
      return (
        <g key={key}>
          <line className="hotel-viz__rcp-body" x1={bx} y1={by - 3} x2={hx} y2={hy + 3} />
          <circle className="hotel-viz__rcp-head" cx={hx} cy={hy} r={3} />
        </g>
      );
    };
    const Plant = (i: number, j: number, key: string) => {
      const [lx, ly] = P(i, j, 12);
      return (
        <g key={key}>
          {Box(i - 0.12, j - 0.12, i + 0.12, j + 0.12, 6, `${key}v`, 'rcppot')}
          <circle className="hotel-viz__rcp-leaf" cx={lx} cy={ly - 1} r={4} />
          <circle className="hotel-viz__rcp-leaf" cx={lx - 3} cy={ly + 1.3} r={3} />
          <circle className="hotel-viz__rcp-leaf" cx={lx + 3} cy={ly + 1.3} r={3} />
          <circle className="hotel-viz__rcp-leaf" cx={lx} cy={ly - 4} r={2.8} />
        </g>
      );
    };
    // Divano (upholstery slate): seduta + schienale + braccioli
    const Sofa = (i0: number, j0: number, key: string) => {
      const w = 0.95, d = 0.5, seatH = 4, backH = 10, t = 0.14;
      return (
        <g key={key}>
          {Box(i0, j0, i0 + w, j0 + d, seatH, `${key}s`, 'rcpc')}
          {Box(i0, j0, i0 + w, j0 + t, backH, `${key}b`, 'rcpc')}
          {Box(i0, j0, i0 + t, j0 + d, seatH + 2, `${key}l`, 'rcpc')}
          {Box(i0 + w - t, j0, i0 + w, j0 + d, seatH + 2, `${key}r`, 'rcpc')}
        </g>
      );
    };

    const midJ = maxR / 2;
    const els: React.ReactNode[] = [];

    // Corridoio centrale (runner)
    els.push(
      <polygon key="corr" className="hotel-viz__rcp-rug"
        points={poly([P(0.3, midJ - 0.5), P(maxC - 0.3, midJ - 0.5), P(maxC - 0.3, midJ + 0.5), P(0.3, midJ + 0.5)])} />,
    );

    const deepTop = Math.max(0.45, midJ - 0.75);
    // Disegno retro→fronte per una corretta occlusione isometrica:
    // 1) fila letti dietro (j piccolo): materasso (tessuto) + testiera (legno)
    for (let s = 0; s < maxC; s++) {
      const i0 = s + 0.2, i1 = s + 0.8;
      els.push(Box(i0, 0.3, i1, 0.3 + deepTop, 2.4, `bt${s}`, 'rcpc'));
      els.push(Box(i0, 0.3, i1, 0.52, 3.6, `bth${s}`, 'rcp'));
    }
    // 2) ascensore addossato alla parete posteriore (con porta)
    els.push(elevator(P, poly, 'lift'));
    // 3) arredo variato per piano (divano/piante) + avventori — differenzia i piani
    const decor = idx % 3;
    if (decor === 0) {
      els.push(Sofa(0.2, midJ - 0.28, 'sofa'));
      els.push(Figure(maxC - 1.15, midJ + 0.12, 'g1'));
    } else if (decor === 1) {
      els.push(Plant(0.45, midJ - 0.05, 'pl1'));
      els.push(Figure(1.4, midJ - 0.08, 'g1'));
      if (maxC > 2) els.push(Figure(maxC - 1.2, midJ + 0.14, 'g2'));
    } else {
      els.push(Sofa(0.2, midJ - 0.28, 'sofa'));
      els.push(Plant(maxC - 0.5, midJ + 0.02, 'pl2'));
      els.push(Figure(1.55, midJ + 0.1, 'g1'));
    }
    // 4) fila letti davanti (j grande) — disegnata per ultima
    for (let s = 0; s < maxC; s++) {
      const i0 = s + 0.2, i1 = s + 0.8;
      const bj0 = maxR - 0.3 - deepTop;
      els.push(Box(i0, bj0, i1, maxR - 0.3, 2.4, `bb${s}`, 'rcpc'));
      els.push(Box(i0, maxR - 0.52, i1, maxR - 0.3, 3.6, `bbh${s}`, 'rcp'));
    }

    return <g>{els}</g>;
  };

  // Geometria per l'overlay animato degli avventori (stessa proiezione iso)
  const crowdScene: CrowdScene = {
    CX, CY,
    Ox: originX(maxC, maxR),
    floorOys: floors.map((_, f) => TOP + f * FLOOR_GAP),
    lobbyIndex: floors.length - 1,
    maxC, maxR,
    midJ: maxR / 2,
    liftI: (EL.i0 + EL.i1) / 2,   // centro porta ascensore (parete posteriore)
    liftJ: EL.j1,
  };

  return (
    <svg
      className="hotel-viz__iso"
      viewBox={`${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
      role="img"
      aria-label="Hotel in prospettiva: clicca un piano per il dettaglio"
    >
      {/* Sagoma dell'edificio (hotel) con finestre */}
      <g>
        {/* pareti */}
        <polygon className="hotel-viz__iso-wall hotel-viz__iso-wall--left" points={`${Lx},${Ly} ${Bx},${By} ${Bx},${By + envH} ${Lx},${Ly + envH}`} />
        <polygon className="hotel-viz__iso-wall hotel-viz__iso-wall--right" points={`${Bx},${By} ${Rx},${Ry} ${Rx},${Ry + envH} ${Bx},${By + envH}`} />
        {/* finestre */}
        {buildWindows(leftTop, maxC, 'wl')}
        {buildWindows(rightTop, maxR, 'wr')}
        {/* spigolo verticale frontale (angolo dell'edificio) */}
        <line className="hotel-viz__iso-edge" x1={Bx} y1={By} x2={Bx} y2={By + envH} />
        {/* tetto */}
        <polygon className="hotel-viz__iso-roof" points={`${Tx},${Ty} ${Rx},${Ry} ${Bx},${By} ${Lx},${Ly}`} />
      </g>

      {/* Piani esplosi cliccabili (alto → basso) */}
      {floors.map((piano, f) => {
        const Ox = originX(maxC, maxR);
        const Oy = TOP + f * FLOOR_GAP;
        const selected = selectedId === piano.id;
        const isLobby = f === floors.length - 1;
        return (
          <g
            key={piano.id}
            className={`hotel-viz__iso-floor${selected ? ' is-selected' : ''}${onFloorClick ? ' is-clickable' : ''}`}
            onClick={onFloorClick ? () => onFloorClick(piano) : undefined}
            role={onFloorClick ? 'button' : undefined}
            tabIndex={onFloorClick ? 0 : undefined}
            onKeyDown={onFloorClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFloorClick(piano); } } : undefined}
          >
            {slab(Ox, Oy)}
            {/* base piano (bianco con leggera trasparenza) */}
            <polygon className="hotel-viz__iso-platetop" points={plateOutline(Ox, Oy)} />
            {/* scena illustrativa del piano (reception al terra, camere sopra) */}
            {isLobby ? renderReception(Ox, Oy) : renderFloorScene(Ox, Oy, f)}
            {/* contorno evidenziazione */}
            <polygon className="hotel-viz__iso-floor-outline" points={plateOutline(Ox, Oy)} />
            {/* badge numerato del piano (numerazione dal basso: 0 = piano terra) */}
            <line className="hotel-viz__iso-leader" x1={LABEL_W} y1={Oy + maxR * CY} x2={Ox - maxR * CX} y2={Oy + maxR * CY} />
            <circle className="hotel-viz__iso-badge" cx={LABEL_W / 2} cy={Oy + maxR * CY} r={8.5} />
            <text className="hotel-viz__iso-badge-num" x={LABEL_W / 2} y={Oy + maxR * CY} textAnchor="middle">{piano.id === 0 ? 'T' : piano.id}</text>
          </g>
        );
      })}

      {/* Avventori in movimento (reception → ascensore → piani → uscita) */}
      <HotelCrowd scene={crowdScene} />

    </svg>
  );
};

export default HotelWireframe;
