// ─── FOTO DEI PROFILI ─────────────────────────────────────────────────────────
//  Foto delle utenze di test di "Accesso profili" (amministratori delle
//  strutture), per struttura di CLIENTS_INIT. Senza foto restano le iniziali.
//  Immagini con licenza Shutterstock (sibylla-op/docs/immagini_app_op).
import mariaRossi from '../assets/profili/maria-rossi.jpg'
import carloVerdi from '../assets/profili/carlo-verdi.jpg'
import annaConti from '../assets/profili/anna-conti.jpg'
import giuliaNeri from '../assets/profili/giulia-neri.jpg'
import marcoBruno from '../assets/profili/marco-bruno.jpg'
import saraGreco from '../assets/profili/sara-greco.jpg'
import paoloFerri from '../assets/profili/paolo-ferri.jpg'
import elenaRusso from '../assets/profili/elena-russo.jpg'
import { strutturaDelProfilo, type AccessProfile } from './useAccessStore'

const PER_STRUTTURA: Record<number, string> = {
  1: mariaRossi,
  2: carloVerdi,
  3: annaConti,
  4: giuliaNeri,
  5: marcoBruno,
  6: saraGreco,
  7: paoloFerri,
  8: elenaRusso,
}

export const fotoProfilo = (p: AccessProfile | null | undefined): string | undefined => {
  const id = p ? strutturaDelProfilo(p) : null
  return id === null ? undefined : PER_STRUTTURA[id]
}
