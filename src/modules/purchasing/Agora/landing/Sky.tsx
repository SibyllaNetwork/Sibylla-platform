import { useEffect, useRef } from 'react';
import './Sky.css';

interface SkyProps {
  /** Quando true, le stelle di sfondo vengono attenuate (per dare risalto a una costellazione) */
  dim: boolean;
}

const VARIANTS = ['s-a', 's-b', 's-c', 's-d'] as const;

/**
 * Genera il campo stellare distribuendo le stelle solo nella metà superiore (cielo),
 * lasciando libera la fascia inferiore dove c'è la città.
 */
function generateStars(layer: HTMLDivElement) {
  layer.innerHTML = '';
  const stage = layer.parentElement;
  if (!stage) return;

  const W = stage.clientWidth;
  const H = stage.clientHeight;
  const skyHeight = H * 0.5;

  const totalStars = 320;
  const featureStars = 16;

  for (let i = 0; i < totalStars; i++) {
    const s = document.createElement('div');
    s.className = 'landing-star ' + VARIANTS[i % VARIANTS.length];

    const x = Math.random() * W;
    const yBias = Math.pow(Math.random(), 1.5);
    const y = yBias * skyHeight;

    const size =
      Math.random() < 0.7 ? 1 + Math.random() * 1.2 : 2 + Math.random() * 1.5;

    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
    s.style.animationDuration = (3 + Math.random() * 5).toFixed(2) + 's';

    if (Math.random() < 0.3) {
      s.style.opacity = (0.3 + Math.random() * 0.4).toFixed(2);
      s.style.boxShadow = '0 0 3px rgba(255,255,255,0.4)';
    }

    layer.appendChild(s);
  }

  for (let i = 0; i < featureStars; i++) {
    const s = document.createElement('div');
    s.className =
      'landing-star feature ' +
      VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    const x = Math.random() * W;
    const y = Math.pow(Math.random(), 1.4) * skyHeight;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
    s.style.animationDuration = (4 + Math.random() * 4).toFixed(2) + 's';
    layer.appendChild(s);
  }
}

export function Sky({ dim }: SkyProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!layerRef.current) return;
    generateStars(layerRef.current);

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (layerRef.current) generateStars(layerRef.current);
      }, 150);
    };

    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <>
      <div className="landing-sky" aria-hidden="true" />
      <div
        ref={layerRef}
        className={`landing-stars-layer${dim ? ' is-dim' : ''}`}
        aria-hidden="true"
      />
      <div className="landing-shooting-star s1" aria-hidden="true" />
      <div className="landing-shooting-star s2" aria-hidden="true" />
    </>
  );
}
