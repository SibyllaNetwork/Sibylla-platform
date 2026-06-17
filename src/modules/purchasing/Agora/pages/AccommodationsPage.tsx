import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Layout } from './Layout';
import { PageHeader } from './PageHeader';
import { HotelCard } from './HotelCard';
import { useCart } from '../context/CartContext';
import { Button } from '../ds/button';
import { Icon } from '../ds/icon';
import { H2, P3 } from '../ds/typography';
import { Input } from '../ds/input';
import { Select } from '../ds/select';
import { Label } from '../ds/label';
import { Field } from '../ds/field';
import { Slider } from '../ds/slider';
import { useStrutturaPlatformStore } from '../../../../store/useStrutturaPlatformStore';
import { useCartStore } from '../../../../store/useCartStore';
import type { Struttura } from '../../../../admin/SibyllaAdminPanel/strutture/types';
import './AccommodationsPage.css';

type AccommodationCategory = 'hotel' | 'resort' | 'b&b' | 'agriturismo' | 'villa' | 'apartment' | 'ostello' | 'rifugio' | 'outlet';

interface Accommodation {
  id: string;
  name: string;
  location: string;
  city: string;
  province: string;
  stars: number;
  image: string;
  rooms: string;
  price: number;
  category: AccommodationCategory;
}

// ─── Mapping Struttura → Accommodation (modello di vista) ───────────────────
// Convertiamo le strutture pubblicate sul canale Agorà nel modello consumato
// dalla HotelCard. Il prezzo mostrato è il MINIMO `prezzoAgora` fra le tipologie
// di camera. Le stelle sono parsate dal label `5★L` / `5★` / ecc.
const parseStars = (c: string): number => {
  const n = parseInt(c.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

const formatRooms = (s: Struttura): string => {
  if (s.tipologieCamere.length === 0) return s.camere > 0 ? `${s.camere} camere disponibili` : 'Su richiesta'
  if (s.tipologieCamere.length === 1) return s.tipologieCamere[0].nome
  return `${s.tipologieCamere.length} tipologie · da ${s.tipologieCamere[0].nome}`
}

const minPrezzoAgora = (s: Struttura): number => {
  const valori = s.tipologieCamere.map(t => t.prezzoAgora).filter(p => p > 0)
  if (valori.length === 0) return 0
  return Math.min(...valori)
}

const strutturaToAccommodation = (s: Struttura): Accommodation => ({
  id: s.id,
  name: s.nome,
  location: `${s.indirizzo}, ${s.citta}`,
  city: s.citta,
  province: s.provincia,
  stars: parseStars(s.classificazione),
  image: s.fotoPrincipale || s.logoUrl,
  rooms: formatRooms(s),
  price: minPrezzoAgora(s),
  category: s.tipo as AccommodationCategory,
})

const CATEGORIES: Array<{ id: AccommodationCategory | 'all'; label: string }> = [
  { id: 'all',         label: 'Tutte le categorie' },
  { id: 'hotel',       label: 'Hotel' },
  { id: 'resort',      label: 'Resort / 5 stelle' },
  { id: 'b&b',         label: 'B&B' },
  { id: 'agriturismo', label: 'Agriturismo' },
];

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Consigliati' },
  { id: 'price-asc',   label: 'Prezzo: crescente' },
  { id: 'price-desc',  label: 'Prezzo: decrescente' },
  { id: 'stars-desc',  label: 'Stelle: decrescenti' },
];

interface FilterFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <Field className={className}>
      {/* Label allo standard piattaforma: 12px, weight 600, colore grigio (text-inactive) */}
      <Label className="!text-[12px] !font-semibold !leading-4 !text-text-inactive">{label}</Label>
      {children}
    </Field>
  );
}

function computeNights(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 1;
  return Math.max(1, Math.round((e - s) / 86400000));
}

export function AccommodationsPage() {
  const { addStay } = useCart();
  const addStayGlobal = useCartStore((s) => s.addStay);
  const strutture = useStrutturaPlatformStore((s) => s.strutture);

  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [category, setCategory] = useState<AccommodationCategory | 'all'>('all');
  const [budgetMax, setBudgetMax] = useState<number>(1500);
  const [sort, setSort] = useState('recommended');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // ─── Strutture pubblicate sul canale Agorà ─────────────────────────────
  // Solo le strutture attive E con `canali.agora.pubblicata = true` finiscono
  // in vetrina. Il toggle nell'admin (Sibylla Admin → Piattaforma admin →
  // Strutture → Strutture proprie → pill "Agorà") agisce direttamente su questo.
  const ACCOMMODATIONS = useMemo<Accommodation[]>(
    () =>
      strutture
        .filter((s) => s.attiva && s.canali.agora.pubblicata)
        .map(strutturaToAccommodation),
    [strutture],
  );

  const CITIES = useMemo(
    () => Array.from(new Set(ACCOMMODATIONS.map((a) => a.city))).sort(),
    [ACCOMMODATIONS],
  );
  const PROVINCES = useMemo(
    () => Array.from(new Set(ACCOMMODATIONS.map((a) => a.province).filter(Boolean))).sort(),
    [ACCOMMODATIONS],
  );

  const handleBook = (a: Accommodation) => {
    const nights = computeNights(startDate, endDate);
    // Cart locale AgoraShell (per la pagina /cart interna)
    addStay({
      id: a.id,
      name: a.name,
      location: a.location,
      image: a.image,
      pricePerNight: a.price,
      nights,
      adults,
      children,
      checkIn: startDate || null,
      checkOut: endDate || null,
      stars: a.stars,
      rooms: a.rooms,
    });
    // Cart globale Sibylla (per il badge nella topbar e altre pagine)
    addStayGlobal({
      id: a.id,
      nome: a.name,
      location: a.location,
      immagineUrl: a.image,
      prezzoPerNotte: a.price,
      notti: nights,
      adulti: adults,
      bambini: children,
      checkIn: startDate || null,
      checkOut: endDate || null,
      stelle: a.stars,
      camere: a.rooms,
    });
    setJustAddedId(a.id);
    setTimeout(() => setJustAddedId((prev) => (prev === a.id ? null : prev)), 2000);
  };

  const filtered = useMemo(() => {
    const list = ACCOMMODATIONS.filter((a) => {
      if (city && a.city !== city) return false;
      if (province && a.province !== province) return false;
      if (category !== 'all' && a.category !== category) return false;
      // Le strutture senza prezzo pubblicato passano comunque il filtro budget.
      if (a.price > 0 && a.price > budgetMax) return false;
      return true;
    });

    switch (sort) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'stars-desc': return [...list].sort((a, b) => b.stars - a.stars);
      default:           return list;
    }
  }, [ACCOMMODATIONS, city, province, category, budgetMax, sort]);

  return (
    <Layout>
      <PageHeader
        title="Strutture Ricettive"
        subtitle="Cerca e prenota il soggiorno perfetto per te"
      />

      <section aria-label="Filtri di ricerca" className="accommodations__filters">
        <div className="accommodations__filters-grid">
          <FilterField label="Seleziona Città">
            <Select className="accommodations__select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Tutte</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Provincia">
            <Select className="accommodations__select" value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">Tutte</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Data Inizio">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FilterField>

          <FilterField label="Data Fine">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FilterField>

          <FilterField label="Adulti">
            <Input
              type="number"
              min={1}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
            />
          </FilterField>

          <FilterField label="Bambini">
            <Input
              type="number"
              min={0}
              value={children}
              onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
            />
          </FilterField>

          <FilterField label="Categoria">
            <Select
              className="accommodations__select"
              value={category}
              onChange={(e) => setCategory(e.target.value as AccommodationCategory | 'all')}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Budget Max">
            <Slider
              min={0}
              max={2000}
              step={50}
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
              formatValue={(v) => `€ ${v}`}
            />
          </FilterField>
        </div>

        <div className="accommodations__filters-cta">
          <Button variant="primary" size="lg">
            <Icon family="regular" name="magnifying-glass" data-slot="icon" />
            Cerca Hotel
          </Button>
        </div>
      </section>

      <section>
        <div className="accommodations__results-head">
          <div>
            <H2>Hotel Disponibili</H2>
            <P3 className="accommodations__results-count">
              {filtered.length} {filtered.length === 1 ? 'struttura trovata' : 'strutture trovate'}
            </P3>
          </div>

          <div className="accommodations__results-controls">
            <div className="accommodations__view-toggle" role="group" aria-label="Modalità di visualizzazione">
              <button
                type="button"
                className={`accommodations__view-btn${view === 'grid' ? ' accommodations__view-btn--active' : ''}`}
                onClick={() => setView('grid')}
                title="Griglia"
                aria-pressed={view === 'grid'}
              >
                <Icon family="regular" name="grid-2" />
              </button>
              <button
                type="button"
                className={`accommodations__view-btn${view === 'list' ? ' accommodations__view-btn--active' : ''}`}
                onClick={() => setView('list')}
                title="Lista"
                aria-pressed={view === 'list'}
              >
                <Icon family="regular" name="list" />
              </button>
            </div>

            <div className="accommodations__sort">
              <Label className="accommodations__sort-label">Ordina per</Label>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                inputSize="dense"
                className="accommodations__sort-select"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="accommodations__empty">
            <P3>
              {ACCOMMODATIONS.length === 0
                ? 'Nessuna struttura pubblicata su Agorà. Vai in Sibylla Admin → Piattaforma admin → Strutture e attiva il canale Agorà.'
                : 'Nessuna struttura trovata con i filtri selezionati'}
            </P3>
          </div>
        ) : (
          <div className={`accommodations__grid${view === 'list' ? ' accommodations__grid--list' : ''}`}>
            {filtered.map((a) => (
              <HotelCard
                key={a.id}
                name={a.name}
                location={a.location}
                stars={a.stars}
                image={a.image}
                rooms={a.rooms}
                price={a.price}
                onBook={() => handleBook(a)}
                justAdded={justAddedId === a.id}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
