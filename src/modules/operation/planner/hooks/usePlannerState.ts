// ─── usePlannerState ──────────────────────────────────────────────────────────
// Hook che centralizza tutto lo stato della pagina Planner

import { useState, useMemo, useCallback } from 'react';
import { Pren, Camera } from '../planner.types';
import { PRENS, parseDt, addDays } from '../planner.data';
import { bookingStore } from '../../../../core/bookingStore';
import {
  useBlocchiFantasmaStore,
  type BloccoFantasma,
  type NuovoBloccoInput,
} from '../../../../store/useBlocchiFantasmaStore';

const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

  // ── Prenotazioni (mutabili) + Parcheggio ──────────────────────────────────────
  const [prens,          setPrens]          = useState<Pren[]>(PRENS);
  const [parkedIds,      setParkedIds]      = useState<string[]>([]);
  const [showParcheggio, setShowParcheggio] = useState(false);
  const [showRiepilogo,  setShowRiepilogo]  = useState(false);

  // ── Blocco fantasma (prelazione) ───────────────────────────────────────────────
  const blocchi       = useBlocchiFantasmaStore((s) => s.blocchi);
  const addBlocco     = useBlocchiFantasmaStore((s) => s.add);
  const updateBlocco  = useBlocchiFantasmaStore((s) => s.update);
  const removeBlocco  = useBlocchiFantasmaStore((s) => s.remove);
  const [ghostMode,   setGhostMode]   = useState(false);
  const [ghostDraft,  setGhostDraft]  = useState<{ dalISO: string; alISO: string; numeroCamera: string } | null>(null);
  const [ghostEditing, setGhostEditing] = useState<BloccoFantasma | null>(null);
  const toggleGhost = useCallback(() => setGhostMode((v) => !v), []);

  // Strisciata in modalità fantasma → apre la modale di creazione blocco.
  const handleGhostSelect = useCallback((cam: Camera, sDate: Date, eDate: Date) => {
    setGhostEditing(null);
    setGhostDraft({ dalISO: isoDate(sDate), alISO: isoDate(addDays(eDate, 1)), numeroCamera: cam.numero });
  }, []);

  // Click su un blocco esistente → apre la modale in modifica.
  const openGhostEdit = useCallback((b: BloccoFantasma) => {
    setGhostEditing(b);
    setGhostDraft({ dalISO: b.dalISO, alISO: b.alISO, numeroCamera: b.numeroCamera });
  }, []);

  const closeGhostModal = useCallback(() => { setGhostDraft(null); setGhostEditing(null); }, []);

  const saveBlocco = useCallback((input: NuovoBloccoInput) => {
    if (ghostEditing) updateBlocco(ghostEditing.id, input);
    else addBlocco(input);
  }, [ghostEditing, addBlocco, updateBlocco]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const startDate = useMemo(() => parseDt(startDateStr), [startDateStr]);

  const matchSearch = useCallback((p: Pren) => {
    if (!cerca.trim()) return true;
    const q = cerca.toLowerCase();
    return p.nominativo.toLowerCase().includes(q) ||
      p.booking.toLowerCase().includes(q) ||
      p.numeroCamera.toLowerCase().includes(q);
  }, [cerca]);

  // In calendario: prenotazioni non parcheggiate (+ ricerca)
  const filteredPrens = useMemo(
    () => prens.filter(p => !parkedIds.includes(p.id) && matchSearch(p)),
    [prens, parkedIds, matchSearch]
  );
  // Nel parcheggio
  const parkedPrens = useMemo(
    () => prens.filter(p => parkedIds.includes(p.id)),
    [prens, parkedIds]
  );

  // ── Azioni Parcheggio / spostamento ───────────────────────────────────────────
  const parkBooking = useCallback((id: string) => {
    setParkedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setShowParcheggio(true);
    setSelectedBooking(null);
  }, []);

  // Assegna una prenotazione a una camera (e la toglie dal parcheggio se c'era)
  const assignBookingToRoom = useCallback((id: string, numeroCamera: string) => {
    setPrens(prev => prev.map(p => (p.id === id ? { ...p, numeroCamera } : p)));
    setParkedIds(prev => prev.filter(x => x !== id));
  }, []);

  // Sposta una prenotazione nella timeline via drag&drop: cambia camera e/o
  // trasla le date di `deltaDays` (orizzontale = giorni).
  const moveBooking = useCallback((id: string, numeroCamera: string, deltaDays: number) => {
    setPrens(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (!deltaDays) return { ...p, numeroCamera };
      return {
        ...p,
        numeroCamera,
        checkIn:  isoDate(addDays(parseDt(p.checkIn),  deltaDays)),
        checkOut: isoDate(addDays(parseDt(p.checkOut), deltaDays)),
      };
    }));
    setParkedIds(prev => prev.filter(x => x !== id));
  }, []);

  // Clona una prenotazione (stessa camera/date, nuovo booking) → menu contestuale.
  const cloneBooking = useCallback((id: string) => {
    setPrens(prev => {
      const src = prev.find(p => p.id === id);
      if (!src) return prev;
      const clone: Pren = { ...src, id: `${src.id}-copy${prev.length}`, booking: `${src.booking}-C` };
      return [...prev, clone];
    });
  }, []);

  // Check-in di una prenotazione → menu contestuale.
  const checkInBooking = useCallback((id: string) => {
    setPrens(prev => prev.map(p => (p.id === id ? { ...p, stato: 'checkin', statoCheckIn: 'Effettuato' } : p)));
  }, []);

  const toggleParcheggio = useCallback(() => setShowParcheggio(v => !v), []);
  const toggleRiepilogo  = useCallback(() => setShowRiepilogo(v => !v), []);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const togglePiano = (id: number) =>
    setActivePiani(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  // Click su cella vuota → apre "Nuova prenotazione" precompilata (1 notte).
  // Passa anche la camera così NuovaPrenotazione può rilevare un eventuale blocco fantasma.
  const handleEmptyClick = useCallback((cam: Camera, date: Date) => {
    bookingStore.prefill = { dal: isoDate(date), al: isoDate(addDays(date, 1)), numeroCamera: cam.numero };
    navigate('nuova-prenotazione');
  }, [navigate]);

  // Trascinamento su più celle → "Nuova prenotazione" col periodo selezionato
  // (check-in = primo giorno, check-out = giorno dopo l'ultima notte).
  const handleSelectPeriod = useCallback((cam: Camera, startDate: Date, endDate: Date) => {
    bookingStore.prefill = { dal: isoDate(startDate), al: isoDate(addDays(endDate, 1)), numeroCamera: cam.numero };
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
    parkedPrens,
    selectedBooking, setSelectedBooking,
    showLegenda,   setShowLegenda,
    showAssegnare, setShowAssegnare,
    showAllocare,  setShowAllocare,
    showParcheggio, setShowParcheggio, toggleParcheggio,
    showRiepilogo, toggleRiepilogo,
    parkBooking, assignBookingToRoom, moveBooking, cloneBooking, checkInBooking,
    handleEmptyClick,
    handleSelectPeriod,
    // blocco fantasma
    blocchi,
    ghostMode, toggleGhost,
    ghostDraft, ghostEditing,
    handleGhostSelect, openGhostEdit, closeGhostModal,
    saveBlocco, removeBlocco,
  };
}
