// ─── HotelWireframe ───────────────────────────────────────────────────────────
// Hotel in prospettiva (assonometria esplosa) generato DAI DATI: ogni piano
// impostato è una piattaforma isometrica nella sagoma ghost dell'edificio; le
// camere sono celle colorate per stato. I piani sono evidenziabili (hover) e
// cliccabili → il dettaglio frontale si apre con animazione (gestito dal parent).
import React from 'react';
import { Piano, Camera } from '../planner.types';
import { CAM_CLR } from '../planner.styles';

interface Props {
  piani: Piano[];
  selectedId?: number | null;
  onFloorClick?: (piano: Piano) => void;
  onRoomHover?: (cam: Camera | null, clientX: number, clientY: number) => void;
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

const HotelWireframe: React.FC<Props> = ({ piani, selectedId, onFloorClick, onRoomHover }) => {
  if (!piani.length) return null;

  const floors = [...piani].reverse();
  const maxRooms = Math.max(...floors.map(f => f.camere.length));
  const [maxC, maxR] = gridDims(maxRooms);

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

  // Linee di griglia del piano (sempre visibili, anche nelle posizioni senza camera)
  const gridLines = (Ox: number, Oy: number) => {
    const out: React.ReactNode[] = [];
    for (let i = 1; i < maxC; i++) {
      const [x1, y1] = xy(Ox, Oy, i, 0);
      const [x2, y2] = xy(Ox, Oy, i, maxR);
      out.push(<line key={`gv${i}`} className="hotel-viz__iso-grid" x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />);
    }
    for (let j = 1; j < maxR; j++) {
      const [x1, y1] = xy(Ox, Oy, 0, j);
      const [x2, y2] = xy(Ox, Oy, maxC, j);
      out.push(<line key={`gh${j}`} className="hotel-viz__iso-grid" x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />);
    }
    return out;
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

  return (
    <svg
      className="hotel-viz__iso"
      viewBox={`0 0 ${VW} ${svgH.toFixed(0)}`}
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
            {/* griglia del piano (sempre visibile) */}
            {!isLobby && gridLines(Ox, Oy)}
            {isLobby
              ? renderReception(Ox, Oy)
              : piano.camere.map((cam, k) => {
                  const i = k % maxC;
                  const j = Math.floor(k / maxC);
                  const points = `${pt(Ox, Oy, i, j)} ${pt(Ox, Oy, i + 1, j)} ${pt(Ox, Oy, i + 1, j + 1)} ${pt(Ox, Oy, i, j + 1)}`;
                  return (
                    <polygon
                      key={cam.numero}
                      className="hotel-viz__iso-cell"
                      points={points}
                      fill={CAM_CLR[cam.stato]}
                      onMouseEnter={onRoomHover ? (e) => onRoomHover(cam, e.clientX, e.clientY) : undefined}
                      onMouseMove={onRoomHover ? (e) => onRoomHover(cam, e.clientX, e.clientY) : undefined}
                      onMouseLeave={onRoomHover ? () => onRoomHover(null, 0, 0) : undefined}
                    />
                  );
                })}
            {/* contorno evidenziazione */}
            <polygon className="hotel-viz__iso-floor-outline" points={plateOutline(Ox, Oy)} />
            {/* badge numerato del piano (numerazione dal basso: 0 = piano terra) */}
            <line className="hotel-viz__iso-leader" x1={LABEL_W} y1={Oy + maxR * CY} x2={Ox - maxR * CX} y2={Oy + maxR * CY} />
            <circle className="hotel-viz__iso-badge" cx={LABEL_W / 2} cy={Oy + maxR * CY} r={8.5} />
            <text className="hotel-viz__iso-badge-num" x={LABEL_W / 2} y={Oy + maxR * CY} textAnchor="middle">{piano.id === 0 ? 'T' : piano.id}</text>
          </g>
        );
      })}

    </svg>
  );
};

export default HotelWireframe;
