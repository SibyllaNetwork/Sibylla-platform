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
import './AccommodationsPage.css';
import imgHotelArchimede from '../assets/MainContent/59e37e59d307da05a5844465dd8360c15951d0fd.png';
import imgHotelPresidente from '../assets/MainContent/34d52f1e0275b76c9d86ab63f6fc377694fede06.png';
import imgHotelContinental from '../assets/MainContent/cb6d4163ea1e7d5f34170476bd23e27f638bea8d.png';
import imgHotelBernini from '../assets/MainContent/afcbaab315fe8ce142d6e70be92ffcd004a92ff1.png';
import imgHotelRoma from '../assets/MainContent/86ae17e1a354ac2cd4f4790cbed8127730aa7837.png';
import imgHotelQuirinale from '../assets/MainContent/9c85d59cd7b8d7a55688231bc762611d82017d1a.png';
import imgHotelDesArtistes from '../assets/MainContent/2af089a2ff6ce44ab50015fe67678e0195dce0d8.png';
import imgGrandHotelPlaza from '../assets/MainContent/6f9b1ffe80604512d221111bf9cc722732e61c44.png';

type AccommodationCategory = 'hotel' | 'resort' | 'b&b' | 'agriturismo';

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

const ACCOMMODATIONS: Accommodation[] = [
  { id: 'archimede',    name: 'Hotel Archimede',    location: 'Via della Repubblica, Roma',    city: 'Roma',    province: 'RM', stars: 4, image: imgHotelArchimede,    rooms: '1 camera singola', price: 135, category: 'hotel' },
  { id: 'presidente',   name: 'Hotel Presidente',   location: 'Piazza della Vittoria, Milano', city: 'Milano',  province: 'MI', stars: 4, image: imgHotelPresidente,   rooms: '1 camera singola', price: 195, category: 'hotel' },
  { id: 'continental',  name: 'Hotel Continental',  location: 'Corso Italia, Torino',           city: 'Torino',  province: 'TO', stars: 4, image: imgHotelContinental,  rooms: '1 camera singola', price: 255, category: 'hotel' },
  { id: 'bernini',      name: 'Hotel Bernini',      location: 'Via Garibaldi, Napoli',          city: 'Napoli',  province: 'NA', stars: 4, image: imgHotelBernini,      rooms: '1 camera singola', price: 235, category: 'hotel' },
  { id: 'roma',         name: 'Hotel Roma',         location: 'Via della Villa, Roma',          city: 'Roma',    province: 'RM', stars: 5, image: imgHotelRoma,         rooms: '1 camera singola', price: 350, category: 'resort' },
  { id: 'quirinale',    name: 'Hotel Quirinale',    location: 'Via Nazionale, Roma',            city: 'Roma',    province: 'RM', stars: 5, image: imgHotelQuirinale,    rooms: '1 camera singola', price: 405, category: 'resort' },
  { id: 'des-artistes', name: 'Hotel des Artistes', location: 'Via della Vittoria, Firenze',    city: 'Firenze', province: 'FI', stars: 5, image: imgHotelDesArtistes,  rooms: '1 camera singola', price: 422, category: 'resort' },
  { id: 'plaza',        name: 'Grand Hotel Plaza',  location: 'Piazza della Libertà, Venezia',  city: 'Venezia', province: 'VE', stars: 5, image: imgGrandHotelPlaza,   rooms: '1 camera singola', price: 555, category: 'resort' },
];

const CITIES = Array.from(new Set(ACCOMMODATIONS.map((a) => a.city))).sort();
const PROVINCES = Array.from(new Set(ACCOMMODATIONS.map((a) => a.province))).sort();

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
      <Label>{label}</Label>
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
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [category, setCategory] = useState<AccommodationCategory | 'all'>('all');
  const [budgetMax, setBudgetMax] = useState<number>(500);
  const [sort, setSort] = useState('recommended');

  const handleBook = (a: Accommodation) => {
    const nights = computeNights(startDate, endDate);
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
    setJustAddedId(a.id);
    setTimeout(() => setJustAddedId((prev) => (prev === a.id ? null : prev)), 2000);
  };

  const filtered = useMemo(() => {
    const list = ACCOMMODATIONS.filter((a) => {
      if (city && a.city !== city) return false;
      if (province && a.province !== province) return false;
      if (category !== 'all' && a.category !== category) return false;
      if (a.price > budgetMax) return false;
      return true;
    });

    switch (sort) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'stars-desc': return [...list].sort((a, b) => b.stars - a.stars);
      default:           return list;
    }
  }, [city, province, category, budgetMax, sort]);

  return (
    <Layout>
      <PageHeader
        title="Strutture Ricettive"
        subtitle="Cerca e prenota il soggiorno perfetto per te"
        hideBack
      />

      <section aria-label="Filtri di ricerca" className="accommodations__filters">
        <div className="accommodations__filters-grid">
          <FilterField label="Seleziona Città">
            <Select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Tutte</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Provincia">
            <Select value={province} onChange={(e) => setProvince(e.target.value)}>
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
              max={500}
              step={10}
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

        {filtered.length === 0 ? (
          <div className="accommodations__empty">
            <P3>Nessuna struttura trovata con i filtri selezionati</P3>
          </div>
        ) : (
          <div className="accommodations__grid">
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
