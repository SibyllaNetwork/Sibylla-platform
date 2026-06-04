import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ds/icon';
import { ITALY_VIEWBOX, REGIONS, PROVINCES } from '../data/italyMap';
import './LocationMap.css';

interface LocationMapProps {
  /** Provincia/regione attualmente selezionata (etichetta visualizzata). */
  value?: string;
  /** Restituisce { province, region }. province è undefined se si seleziona solo la regione. */
  onSelect: (sel: { region: string; province?: string }) => void;
}

type Box = [number, number, number, number];

const FULL_VIEW: Box = [0, 0, ITALY_VIEWBOX.w, ITALY_VIEWBOX.h];

/** Aggiunge padding a una bbox [x0,y0,x1,y1] e la converte in viewBox [x,y,w,h]. */
function paddedView(b: Box, pad = 0.12): Box {
  const [x0, y0, x1, y1] = b;
  const w = x1 - x0;
  const h = y1 - y0;
  const px = w * pad;
  const py = h * pad;
  return [x0 - px, y0 - py, w + px * 2, h + py * 2];
}

/** Tween animato del viewBox tra due stati (ease-out). */
function useViewBoxTween(target: Box) {
  const [vb, setVb] = useState<Box>(target);
  const fromRef = useRef<Box>(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    const dur = 460;
    cancelAnimationFrame(rafRef.current ?? 0);
    startRef.current = 0;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / dur);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const cur = from.map((v, i) => v + (to[i] - v) * e) as Box;
      setVb(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], target[2], target[3]]);

  return vb;
}

export function LocationMap({ value, onSelect }: LocationMapProps) {
  const [regionCode, setRegionCode] = useState<string | null>(null);
  const [hoverReg, setHoverReg] = useState<string | null>(null);
  const [tip, setTip] = useState<{ name: string; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const regionByCode = useMemo(() => {
    const m = new Map<string, (typeof REGIONS)[number]>();
    REGIONS.forEach((r) => m.set(r.c, r));
    return m;
  }, []);

  const activeRegion = regionCode ? regionByCode.get(regionCode) ?? null : null;
  const regionProvinces = useMemo(
    () => (regionCode ? PROVINCES.filter((p) => p.r === regionCode) : []),
    [regionCode],
  );

  const targetView: Box = activeRegion ? paddedView(activeRegion.b) : FULL_VIEW;
  const vb = useViewBoxTween(targetView);

  const moveTip = (name: string, e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ name, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="locmap" ref={wrapRef}>
      <div className="locmap__bar">
        {activeRegion ? (
          <>
            <button
              type="button"
              className="locmap__back"
              onClick={() => {
                setRegionCode(null);
                setTip(null);
              }}
            >
              <Icon family="light" name="arrow-left" />
              Cambia regione
            </button>
            <span className="locmap__crumb">{activeRegion.n}</span>
          </>
        ) : (
          <span className="locmap__hint">
            <Icon family="light" name="hand-pointer" /> Scegli una regione sulla mappa
          </span>
        )}
      </div>

      <svg
        className="locmap__svg"
        viewBox={vb.join(' ')}
        role="img"
        aria-label="Mappa d'Italia per la scelta della località"
        onMouseLeave={() => setTip(null)}
      >
        {!activeRegion &&
          REGIONS.map((r) => (
            <path
              key={r.c}
              d={r.d}
              className={`locmap__region${hoverReg === r.c ? ' is-hover' : ''}`}
              onMouseEnter={(e) => {
                setHoverReg(r.c);
                moveTip(r.n, e);
              }}
              onMouseMove={(e) => moveTip(r.n, e)}
              onMouseLeave={() => {
                setHoverReg(null);
                setTip(null);
              }}
              onClick={() => {
                setRegionCode(r.c);
                setTip(null);
                onSelect({ region: r.n });
              }}
            />
          ))}

        {activeRegion &&
          regionProvinces.map((p) => (
            <path
              key={p.a}
              d={p.d}
              className="locmap__prov"
              onMouseEnter={(e) => moveTip(p.n, e)}
              onMouseMove={(e) => moveTip(p.n, e)}
              onMouseLeave={() => setTip(null)}
              onClick={() => onSelect({ region: activeRegion.n, province: p.n })}
            />
          ))}
      </svg>

      {tip && (
        <span className="locmap__tip" style={{ left: tip.x, top: tip.y }}>
          {tip.name}
        </span>
      )}

      {value && <p className="locmap__selected">Selezionato: <strong>{value}</strong></p>}
    </div>
  );
}
