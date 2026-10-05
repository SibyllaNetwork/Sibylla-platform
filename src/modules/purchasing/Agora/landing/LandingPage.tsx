import { useState, useCallback } from 'react';
import { Sky } from './Sky';
import { City } from './City';
import { Logo } from './Logo';
import { TopMeta } from './TopMeta';
import { Constellations, type ConstellationId } from './Constellations';
import { SideMenu } from './SideMenu';
import { RightMenu } from './RightMenu';
import BtnBack from '../../../../core/components/BtnBack';
import './LandingPage.css';

export function LandingPage() {
  const [activeConstellation, setActiveConstellation] = useState<ConstellationId | null>(null);

  const showCons = useCallback((id: ConstellationId) => {
    setActiveConstellation(id);
  }, []);

  const hideCons = useCallback(() => {
    setActiveConstellation(null);
  }, []);

  return (
    <div className="landing-stage" data-screen-label="01 Home Agora">
      <Sky dim={activeConstellation !== null} />

      {/* Indietro: la landing copre a tutto schermo topbar e sidenav, quindi è
          l'unica via per tornare alla pagina Sibylla precedente. */}
      <div className="landing-stage__back">
        <BtnBack />
      </div>

      <Constellations active={activeConstellation} />

      <SideMenu onShow={showCons} onHide={hideCons} />

      <RightMenu />

      <TopMeta />

      <Logo />

      <City />
    </div>
  );
}
