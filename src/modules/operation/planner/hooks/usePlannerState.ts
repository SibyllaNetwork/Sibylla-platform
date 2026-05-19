// ─── usePlannerState ──────────────────────────────────────────────────────────
// Hook che centralizza tutto lo stato della pagina Planner

import { useState, useMemo, useCallback } from 'react';
import { Pren, Camera } from '../planner.types';
import { PRENS, parseDt } from '../planner.data';

export function usePlannerState(navigate: (page: string) => void) {

  // ── Filtri ───────────────────────────────────────────────────────────────────
  const [struttura,    setStruttura]    = useState('Hotel Tutorial');
  const [cerca,        setCerca]        = useState('');
  const [startDateStr, setStartDateStr] = useState('2026-04-13');
  const [intervallo,   setIntervallo]   = useState(10);
  const [activePiani,  setActivePiani]  = useState<number[]>([]);
  const [filtroConf,   setFiltroConf]   = useState(true);
  const [filtroOpz,    setFiltroOpz]    = useState(true);

  // ── Selezione e modali ───────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<Pren | null>(null);
  const [showLegenda,     setShowLegenda]     = useState(false);
  const [showAssegnare,   setShowAssegnare]   = useState(false);
  const [showAllocare,    setShowAllocare]    = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const startDate = useMemo(() => parseDt(startDateStr), [startDateStr]);

  const filteredPrens = useMemo(() => {
    if (!cerca.trim()) return PRENS;
    const q = cerca.toLowerCase();
    return PRENS.filter(p =>
      p.nominativo.toLowerCase().includes(q) ||
      p.booking.toLowerCase().includes(q) ||
      p.numeroCamera.toLowerCase().includes(q)
    );
  }, [cerca]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const togglePiano = (id: number) =>
    setActivePiani(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const handleEmptyClick = useCallback((_cam: Camera, _date: Date) => {
    navigate('nuova-prenotazione');
  }, [navigate]);

  return {
    // state
    struttura, setStruttura,
    cerca, setCerca,
    startDateStr, setStartDateStr,
    startDate,
    intervallo, setIntervallo,
    activePiani, togglePiano,
    filtroConf, setFiltroConf,
    filtroOpz, setFiltroOpz,
    filteredPrens,
    selectedBooking, setSelectedBooking,
    showLegenda,   setShowLegenda,
    showAssegnare, setShowAssegnare,
    showAllocare,  setShowAllocare,
    handleEmptyClick,
  };
}
