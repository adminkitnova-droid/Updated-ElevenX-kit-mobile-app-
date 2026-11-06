import { useState } from "react";
import { MapPin, Navigation, Compass, CheckCircle } from "lucide-react";

type Point = { lat: number; lon: number; label: string };
type Props = {
  value: Point | null;
  onChange: (point: Point, route: { distanceKm: number; durationMin: number }) => void;
  rider?: Point | null;
};

const POPULAR_LOCATIONS: { name: string; lat: number; lon: number; distKm: number; eta: string }[] = [
  { name: "Kololo (Acacia Mall Area)", lat: 0.3344, lon: 32.5878, distKm: 3.5, eta: "25 min" },
  { name: "Nakasero & CBD (Kampala Rd)", lat: 0.3152, lon: 32.5816, distKm: 2.1, eta: "20 min" },
  { name: "Ntinda Complex & Ministers Village", lat: 0.3542, lon: 32.6133, distKm: 6.8, eta: "35 min" },
  { name: "Bugolobi & Village Mall", lat: 0.3188, lon: 32.6178, distKm: 5.2, eta: "30 min" },
  { name: "Muyenga & Tank Hill", lat: 0.2989, lon: 32.6074, distKm: 7.1, eta: "40 min" },
  { name: "Kira Town & Najjera", lat: 0.3888, lon: 32.6412, distKm: 12.4, eta: "50 min" },
  { name: "Entebbe International Airport / Town", lat: 0.0512, lon: 32.4637, distKm: 38.0, eta: "1 hr 15 min" },
];

export function GeoapifyDeliveryMap({ value, onChange, rider }: Props) {
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const filtered = POPULAR_LOCATIONS.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (loc: (typeof POPULAR_LOCATIONS)[0], idx: number) => {
    setSelectedIdx(idx);
    onChange(
      { lat: loc.lat, lon: loc.lon, label: loc.name },
      { distanceKm: loc.distKm, durationMin: parseInt(loc.eta) || 30 }
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Delivery Pinpoint</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Select drop-off zone</span>
      </div>

      <div className="relative">
        <input
          type="text"
          className="field text-xs py-2 pr-8"
          placeholder="Search Kampala & Entebbe landmarks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MapPin className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {filtered.map((loc, idx) => {
          const isCurrent = value?.label === loc.name || selectedIdx === idx;
          return (
            <button
              key={loc.name}
              type="button"
              onClick={() => handleSelect(loc, idx)}
              className={`flex items-start justify-between p-2.5 rounded-xl border text-left text-xs transition ${
                isCurrent
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 bg-surface/50 text-muted-foreground hover:border-gold-line hover:text-foreground"
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className="font-semibold truncate text-[12px]">{loc.name}</p>
                <p className="text-[10px] text-muted-foreground">~{loc.distKm} km • Est. {loc.eta}</p>
              </div>
              {isCurrent && <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {value && (
        <div className="p-2.5 rounded-xl bg-gold-soft border border-gold-line/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Selected: <strong className="text-primary">{value.label}</strong></span>
          </div>
          <span className="text-[11px] font-bold text-primary">GPS Ready</span>
        </div>
      )}
    </div>
  );
}
