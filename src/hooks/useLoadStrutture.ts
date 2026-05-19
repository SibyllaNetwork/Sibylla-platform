import { useEffect } from 'react';
import { getStruttureForUser, type Struttura } from '../services/common.service';
import { useOrgStore } from '../store/useOrgStore';

/**
 * Al primo render carica le strutture dell'utente dal proxy
 * (`/Common/GetStruttureForUser`) e popola `useOrgStore`. Se il backend non
 * risponde lascia i mock di default così l'UI non si rompe.
 *
 * Da chiamare una sola volta dopo il login.
 */
export function useLoadStrutture(enabled: boolean): {
  loading: boolean;
  error: string | null;
  data: Struttura[];
} {
  const setStrutture = useOrgStore((s) => s.setStrutture);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getStruttureForUser()
      .then((list) => {
        if (cancelled) return;
        const nomi = list
          .filter((s) => s.attiva !== false)
          .map((s) => s.nome)
          .filter(Boolean);
        if (nomi.length > 0) {
          setStrutture(nomi);
        }
      })
      .catch(() => {
        /* fallback ai mock già presenti nello store */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, setStrutture]);

  // Per ora questo hook non espone stato di loading: la sidebar usa già il
  // contenuto di useOrgStore in tempo reale. Restituiamo segnaposti per
  // permettere al chiamante di estendere l'UX più avanti.
  return { loading: false, error: null, data: [] };
}
