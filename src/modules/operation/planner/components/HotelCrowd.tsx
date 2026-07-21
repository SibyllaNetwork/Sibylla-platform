// ─── HotelCrowd ───────────────────────────────────────────────────────────────
// Overlay animato per la "Mappa struttura" del Planner: avventori (con valigia)
// che entrano dalla reception al piano terra, prendono l'ascensore, salgono a
// piani casuali ed entrano in camera; altri che escono dalle camere, scendono e
// lasciano la struttura. Puramente decorativo/illustrativo.
//
// L'animazione è guidata da requestAnimationFrame che scrive direttamente gli
// attributi `transform`/`opacity` sui gruppi SVG (nessun re-render React per
// frame). Rispetta prefers-reduced-motion: in tal caso non renderizza nulla e la
// scena resta statica (le figure fisse disegnate da HotelWireframe).
import React, { useEffect, useRef } from 'react';

export interface CrowdScene {
  CX: number;
  CY: number;
  Ox: number;            // origine X (uguale per tutti i piani)
  floorOys: number[];    // origine Y per indice piano (0 = in alto … lobby = ultimo)
  lobbyIndex: number;    // indice del piano terra (reception)
  maxC: number;
  maxR: number;
  midJ: number;
  liftI: number;         // colonna del vano ascensore (griglia)
  liftJ: number;
}

interface Props { scene: CrowdScene }

const POOL = 5;                 // avventori in scena contemporaneamente
const RIDE_PER_FLOOR = 620;     // ms per piano di corsa ascensore

interface WP { x: number; y: number; op: number; d: number; ride: boolean; walk: boolean }
interface Trip { wp: WP[]; total: number; bag: boolean }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (n: number) => Math.floor(Math.random() * n);

const HotelCrowd: React.FC<Props> = ({ scene }) => {
  const groupRefs = useRef<(SVGGElement | null)[]>([]);
  const carRefs = useRef<(SVGRectElement | null)[]>([]);
  const bagRefs = useRef<(SVGGElement | null)[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const { CX, CY, Ox, floorOys, lobbyIndex, maxC, maxR, midJ, liftI, liftJ } = scene;
    const xy = (oy: number, i: number, j: number): [number, number] => [Ox + (i - j) * CX, oy + (i + j) * CY];
    const lobbyOy = floorOys[lobbyIndex];
    const mid = maxC / 2;
    const roomFloors = floorOys.length - 1; // piani camere (tutti tranne la lobby)

    // Punti chiave (screen)
    const doorPt = (): [number, number] => xy(lobbyOy, mid - 0.2, maxR + 0.9);      // ingresso (davanti)
    const deskPt = (): [number, number] => xy(lobbyOy, mid + 0.1, maxR - 1.1);      // davanti al desk
    const liftAt = (f: number): [number, number] => xy(floorOys[f], liftI - 0.1, liftJ);
    const stepOut = (f: number): [number, number] => xy(floorOys[f], liftI - 1.4, liftJ);
    const bedPt = (f: number, s: number): [number, number] => xy(floorOys[f], s + 0.5, maxR - 0.9);

    const wp = (p: [number, number], op: number, d: number, opt?: { ride?: boolean; walk?: boolean }): WP =>
      ({ x: p[0], y: p[1], op, d, ride: !!opt?.ride, walk: !!opt?.walk });

    const makeTrip = (): Trip => {
      // niente piani camere → giro solo in lobby
      const canRide = roomFloors > 0;
      const arrive = canRide ? Math.random() < 0.58 : false;
      const wps: WP[] = [];

      if (!canRide) {
        const door = doorPt(), desk = deskPt();
        wps.push(wp(door, 0, 0));
        wps.push(wp(door, 1, 320));
        wps.push(wp(desk, 1, 1500, { walk: true }));
        wps.push(wp(desk, 1, 1100));
        wps.push(wp(door, 1, 1500, { walk: true }));
        wps.push(wp(door, 0, 320));
      } else if (arrive) {
        const f = ri(roomFloors);            // 0..roomFloors-1 (piano camere)
        const s = ri(maxC);
        const door = doorPt(), desk = deskPt();
        const rideDur = RIDE_PER_FLOOR * Math.max(1, lobbyIndex - f);
        wps.push(wp(door, 0, 0));
        wps.push(wp(door, 1, 320));
        wps.push(wp(desk, 1, 1500, { walk: true }));          // check-in
        wps.push(wp(desk, 1, 900));
        wps.push(wp(liftAt(lobbyIndex), 1, 1400, { walk: true }));
        wps.push(wp(liftAt(lobbyIndex), 1, 520));              // attesa cabina
        wps.push(wp(liftAt(f), 1, rideDur, { ride: true }));   // salita
        wps.push(wp(stepOut(f), 1, 700, { walk: true }));
        wps.push(wp(bedPt(f, s), 1, 1250, { walk: true }));    // verso la camera
        wps.push(wp(bedPt(f, s), 0, 420));                     // entra
      } else {
        const f = ri(roomFloors);
        const s = ri(maxC);
        const door = doorPt(), desk = deskPt();
        const rideDur = RIDE_PER_FLOOR * Math.max(1, lobbyIndex - f);
        wps.push(wp(bedPt(f, s), 0, 0));
        wps.push(wp(bedPt(f, s), 1, 320));                     // esce dalla camera
        wps.push(wp(stepOut(f), 1, 1250, { walk: true }));
        wps.push(wp(liftAt(f), 1, 620, { walk: true }));
        wps.push(wp(liftAt(f), 1, 520));
        wps.push(wp(liftAt(lobbyIndex), 1, rideDur, { ride: true })); // discesa
        wps.push(wp(desk, 1, 1300, { walk: true }));
        wps.push(wp(door, 1, 1300, { walk: true }));           // verso l'uscita
        wps.push(wp(door, 0, 320));                            // esce
      }

      // tempi cumulativi
      let total = 0;
      for (const w of wps) total += w.d;
      return { wp: wps, total, bag: arrive || (!canRide) ? true : Math.random() < 0.4 };
    };

    // Stato per agente
    const agents = Array.from({ length: POOL }, (_, k) => ({
      trip: makeTrip(),
      t0: performance.now() + k * rnd(1400, 2600) + rnd(0, 800), // ingressi scaglionati
    }));

    const setBag = (k: number, on: boolean) => {
      const b = bagRefs.current[k];
      if (b) b.style.display = on ? '' : 'none';
    };
    agents.forEach((a, k) => setBag(k, a.trip.bag));

    const frame = (now: number) => {
      for (let k = 0; k < agents.length; k++) {
        const a = agents[k];
        const g = groupRefs.current[k];
        const car = carRefs.current[k];
        if (!g) continue;

        let t = now - a.t0;
        if (t < 0) { g.setAttribute('opacity', '0'); if (car) car.setAttribute('opacity', '0'); continue; }
        if (t >= a.trip.total) {                 // ciclo finito → nuovo viaggio
          a.trip = makeTrip();
          a.t0 = now + rnd(200, 1600);
          setBag(k, a.trip.bag);
          g.setAttribute('opacity', '0');
          if (car) car.setAttribute('opacity', '0');
          continue;
        }

        // trova il segmento corrente
        const wps = a.trip.wp;
        let acc = 0, seg = 0, segStart = 0;
        for (let s = 1; s < wps.length; s++) {
          if (t <= acc + wps[s].d) { seg = s; segStart = acc; break; }
          acc += wps[s].d;
          seg = s; segStart = acc;
        }
        const A = wps[seg - 1] ?? wps[0];
        const B = wps[seg] ?? A;
        const dur = B.d || 1;
        const f = Math.min(1, Math.max(0, (t - segStart) / dur));
        let x = A.x + (B.x - A.x) * f;
        let y = A.y + (B.y - A.y) * f;
        const op = A.op + (B.op - A.op) * f;

        // ondeggio "passi" durante la camminata
        if (B.walk) y -= Math.abs(Math.sin((t - segStart) / 95)) * 1.2;

        g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        g.setAttribute('opacity', op.toFixed(2));
        if (car) car.setAttribute('opacity', B.ride ? '0.92' : '0');
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // Rigenera quando cambia la geometria/insieme piani visibili
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.Ox, scene.lobbyIndex, scene.maxC, scene.maxR, scene.floorOys.join(',')]);

  return (
    <g className="hotel-viz__crowd" aria-hidden="true">
      {Array.from({ length: POOL }, (_, k) => (
        <g
          key={k}
          ref={el => { groupRefs.current[k] = el; }}
          className="hotel-viz__crowd-agent"
          opacity="0"
        >
          {/* cabina ascensore (visibile solo durante la corsa) */}
          <rect
            ref={el => { carRefs.current[k] = el; }}
            className="hotel-viz__crowd-car"
            x={-9} y={-19} width={18} height={22} rx={2} opacity="0"
          />
          {/* corpo + testa */}
          <line className="hotel-viz__crowd-body" x1={0} y1={-3} x2={0} y2={-12} />
          <circle className="hotel-viz__crowd-head" cx={0} cy={-15} r={3} />
          {/* valigia (trolley) */}
          <g ref={el => { bagRefs.current[k] = el; }} className="hotel-viz__crowd-bag">
            <rect x={3.4} y={-9.5} width={5.2} height={7.5} rx={1} />
            <line className="hotel-viz__crowd-bag-handle" x1={6} y1={-9.5} x2={6} y2={-12.5} />
          </g>
        </g>
      ))}
    </g>
  );
};

export default HotelCrowd;
