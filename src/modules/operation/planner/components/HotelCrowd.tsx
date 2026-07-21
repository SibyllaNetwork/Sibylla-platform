// ─── HotelCrowd ───────────────────────────────────────────────────────────────
// Overlay animato per la "Mappa struttura" del Planner: avventori (con valigia)
// che entrano dalla reception al piano terra, raggiungono l'ascensore sulla
// parete posteriore, ENTRANO nella porta (scompaiono) ed ESCONO alla porta del
// piano di destinazione dirigendosi in camera. Altri fanno il percorso inverso e
// lasciano la struttura. Puramente decorativo.
//
// L'arrivo dell'ascensore NON è più una cabina che si sposta: è simulato dalla
// PORTA del piano di destinazione, il cui colore "sale" dalla base fino alla cima
// durante la corsa. Raggiunta la cima, l'ascensore è arrivato e l'ospite esce.
//
// Guidato da requestAnimationFrame che scrive direttamente transform/opacity/points
// sui nodi SVG (nessun re-render React per frame). Rispetta prefers-reduced-motion.
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
  liftI: number;         // centro porta ascensore (griglia)
  liftJ: number;         // faccia frontale ascensore (griglia j)
  elI0: number;          // footprint cabina (griglia i)
  elI1: number;
  elH: number;           // altezza cabina/porta
}

interface Props { scene: CrowdScene }

const POOL = 5;                 // avventori in scena contemporaneamente
const RIDE_PER_FLOOR = 720;     // ms per piano di corsa ascensore

interface WP { x: number; y: number; op: number; d: number; ride: boolean; walk: boolean; arrF: number; arrDown: boolean }
interface Trip { wp: WP[]; total: number; bag: boolean }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (n: number) => Math.floor(Math.random() * n);

const HotelCrowd: React.FC<Props> = ({ scene }) => {
  const personRefs = useRef<(SVGGElement | null)[]>([]);
  const bagRefs = useRef<(SVGGElement | null)[]>([]);
  const doorRefs = useRef<(SVGPolygonElement | null)[]>([]);  // luce-porta per piano
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const { CX, CY, Ox, floorOys, lobbyIndex, maxC, maxR, liftI, liftJ, elI0, elI1, elH } = scene;
    const xy = (oy: number, i: number, j: number): [number, number] => [Ox + (i - j) * CX, oy + (i + j) * CY];
    const lobbyOy = floorOys[lobbyIndex];
    const mid = maxC / 2;
    const nFloors = floorOys.length;
    const roomFloors = nFloors - 1;

    const door = (f: number): [number, number] => xy(floorOys[f], liftI, liftJ);
    const stand = (f: number): [number, number] => xy(floorOys[f], liftI, liftJ + 0.6);
    const doorPt = (): [number, number] => xy(lobbyOy, mid - 0.2, maxR + 0.9);
    const deskPt = (): [number, number] => xy(lobbyOy, mid + 0.1, maxR - 1.1);
    const bedPt = (f: number, s: number): [number, number] => xy(floorOys[f], s + 0.5, maxR - 0.9);

    // Punto sulla faccia della porta (dy = altezza dalla base del piano)
    const i0d = elI0 + 0.14, i1d = elI1 - 0.14, hb = 2, ht = elH - 2;
    const face = (f: number, i: number, dy: number): [number, number] => {
      const [x, y] = xy(floorOys[f], i, liftJ);
      return [x, y - dy];
    };
    // riempimento porta: in salita cresce dalla base verso l'alto; in discesa
    // (ospite che scende da un piano superiore) cala dall'alto verso il basso.
    const doorPoints = (f: number, frac: number, down: boolean): string => {
      const pts = down
        ? [face(f, i0d, ht), face(f, i1d, ht), face(f, i1d, ht - frac * (ht - hb)), face(f, i0d, ht - frac * (ht - hb))]
        : [face(f, i0d, hb), face(f, i1d, hb), face(f, i1d, hb + frac * (ht - hb)), face(f, i0d, hb + frac * (ht - hb))];
      return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    };

    const wp = (p: [number, number], op: number, d: number,
      opt?: { ride?: boolean; walk?: boolean; arrF?: number; arrDown?: boolean }): WP =>
      ({ x: p[0], y: p[1], op, d, ride: !!opt?.ride, walk: !!opt?.walk, arrF: opt?.arrF ?? -1, arrDown: !!opt?.arrDown });

    const rideDur = (f: number) => RIDE_PER_FLOOR * Math.max(1, Math.abs(lobbyIndex - f));

    const makeTrip = (): Trip => {
      const canRide = roomFloors > 0;
      const arrive = canRide ? Math.random() < 0.58 : false;
      const wps: WP[] = [];

      if (!canRide) {
        const d = doorPt(), desk = deskPt();
        wps.push(wp(d, 0, 0), wp(d, 1, 320), wp(desk, 1, 1500, { walk: true }),
          wp(desk, 1, 1100), wp(d, 1, 1500, { walk: true }), wp(d, 0, 320));
      } else if (arrive) {
        const f = ri(roomFloors), s = ri(maxC);
        const d = doorPt(), desk = deskPt();
        wps.push(
          wp(d, 0, 0),
          wp(d, 1, 300),
          wp(desk, 1, 1400, { walk: true }),                      // check-in
          wp(desk, 1, 850),
          wp(stand(lobbyIndex), 1, 1350, { walk: true }),          // verso l'ascensore
          wp(door(lobbyIndex), 1, 520, { walk: true }),            // alla porta
          wp(door(lobbyIndex), 0, 380),                            // ENTRA
          wp(door(f), 0, rideDur(f), { ride: true, arrF: f }),     // corsa (porta di f si "riempie")
          wp(door(f), 1, 420),                                     // ESCE al piano
          wp(stand(f), 1, 520, { walk: true }),
          wp(bedPt(f, s), 1, 1150, { walk: true }),                // verso la camera
          wp(bedPt(f, s), 0, 420),                                 // entra in camera
        );
      } else {
        const f = ri(roomFloors), s = ri(maxC);
        const d = doorPt(), desk = deskPt();
        wps.push(
          wp(bedPt(f, s), 0, 0),
          wp(bedPt(f, s), 1, 300),                                 // esce dalla camera
          wp(stand(f), 1, 1150, { walk: true }),
          wp(door(f), 1, 520, { walk: true }),
          wp(door(f), 0, 380),                                     // ENTRA
          wp(door(lobbyIndex), 0, rideDur(f), { ride: true, arrF: lobbyIndex, arrDown: true }), // discesa (porta lobby: dall'alto)
          wp(door(lobbyIndex), 1, 420),                            // ESCE in lobby
          wp(stand(lobbyIndex), 1, 520, { walk: true }),
          wp(desk, 1, 1150, { walk: true }),
          wp(doorPt(), 1, 1200, { walk: true }),                   // verso l'uscita
          wp(doorPt(), 0, 320),                                    // esce dalla struttura
        );
      }

      let total = 0;
      for (const w of wps) total += w.d;
      return { wp: wps, total, bag: arrive || !canRide ? true : Math.random() < 0.4 };
    };

    const agents = Array.from({ length: POOL }, (_, k) => ({
      trip: makeTrip(),
      t0: performance.now() + k * rnd(1500, 2700) + rnd(0, 700),
    }));

    const setBag = (k: number, on: boolean) => {
      const b = bagRefs.current[k];
      if (b) b.style.display = on ? '' : 'none';
    };
    agents.forEach((a, k) => setBag(k, a.trip.bag));

    const frame = (now: number) => {
      const fill = new Array(nFloors).fill(-1);    // frazione riempimento porta per piano (-1 = spenta)
      const dir = new Array(nFloors).fill(false);  // true = riempimento dall'alto (discesa)

      for (let k = 0; k < agents.length; k++) {
        const a = agents[k];
        const person = personRefs.current[k];
        if (!person) continue;

        const t = now - a.t0;
        if (t < 0) { person.setAttribute('opacity', '0'); continue; }
        if (t >= a.trip.total) {
          a.trip = makeTrip();
          a.t0 = now + rnd(200, 1500);
          setBag(k, a.trip.bag);
          person.setAttribute('opacity', '0');
          continue;
        }

        const wps = a.trip.wp;
        let acc = 0, seg = 1, segStart = 0;
        for (let s = 1; s < wps.length; s++) {
          if (t <= acc + wps[s].d) { seg = s; segStart = acc; break; }
          acc += wps[s].d;
          seg = s; segStart = acc;
        }
        const A = wps[seg - 1] ?? wps[0];
        const B = wps[seg] ?? A;
        const dur = B.d || 1;
        const f = Math.min(1, Math.max(0, (t - segStart) / dur));

        if (B.ride) {
          person.setAttribute('opacity', '0');             // in cabina: nascosto
          if (B.arrF >= 0 && B.arrF < nFloors && f > fill[B.arrF]) { fill[B.arrF] = f; dir[B.arrF] = B.arrDown; }
        } else {
          let x = A.x + (B.x - A.x) * f;
          let y = A.y + (B.y - A.y) * f;
          if (B.walk) y -= Math.abs(Math.sin((t - segStart) / 95)) * 1.2;
          person.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
          person.setAttribute('opacity', (A.op + (B.op - A.op) * f).toFixed(2));
        }
      }

      // Porte: colore che sale dalla base alla cima sul piano in arrivo
      for (let fl = 0; fl < nFloors; fl++) {
        const poly = doorRefs.current[fl];
        if (!poly) continue;
        const fr = fill[fl];
        if (fr < 0) { poly.setAttribute('opacity', '0'); continue; }
        poly.setAttribute('points', doorPoints(fl, fr, dir[fl]));
        poly.setAttribute('opacity', (0.35 + 0.6 * fr).toFixed(2));
      }

      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.Ox, scene.lobbyIndex, scene.maxC, scene.maxR, scene.liftI, scene.liftJ, scene.elI0, scene.elI1, scene.elH, scene.floorOys.join(',')]);

  return (
    <g className="hotel-viz__crowd" aria-hidden="true">
      {/* luci-porta ascensore (una per piano): riempimento animato durante la corsa */}
      {scene.floorOys.map((_, fl) => (
        <polygon
          key={`d${fl}`}
          ref={el => { doorRefs.current[fl] = el; }}
          className="hotel-viz__lift-arrive"
          points=""
          opacity="0"
        />
      ))}
      {/* avventori */}
      {Array.from({ length: POOL }, (_, k) => (
        <g
          key={k}
          ref={el => { personRefs.current[k] = el; }}
          className="hotel-viz__crowd-agent"
          opacity="0"
        >
          <line className="hotel-viz__crowd-body" x1={0} y1={-3} x2={0} y2={-12} />
          <circle className="hotel-viz__crowd-head" cx={0} cy={-15} r={3} />
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
