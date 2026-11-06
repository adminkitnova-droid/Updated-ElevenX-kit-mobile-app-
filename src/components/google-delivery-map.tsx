import { useState, useCallback } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Navigation, MapPin, Bike, Compass, CheckCircle2 } from "lucide-react";
import firebaseConfig from "@/../firebase-applet-config.json";

export type DeliveryPoint = {
  lat: number;
  lng: number;
  label: string;
};

interface Props {
  value: DeliveryPoint | null;
  onChange: (point: DeliveryPoint, route: { distanceKm: number; durationMin: number }) => void;
  riderPosition?: { lat: number; lng: number } | null;
}

// ElevenX Flagship Store / Dispatch HQ in Kampala (Kololo Acacia Avenue)
const STORE_LOCATION: DeliveryPoint = {
  lat: 0.3344,
  lng: 32.5878,
  label: "ElevenX HQ (Acacia Avenue, Kololo)",
};

const POPULAR_AREAS = [
  { name: "Kololo (Acacia Mall Area)", lat: 0.3344, lng: 32.5878, distKm: 2.5, eta: "20 min" },
  { name: "Nakasero & CBD (Kampala Rd)", lat: 0.3152, lng: 32.5816, distKm: 3.2, eta: "25 min" },
  { name: "Ntinda Complex & Ministers Village", lat: 0.3542, lng: 32.6133, distKm: 5.8, eta: "30 min" },
  { name: "Bugolobi & Village Mall", lat: 0.3188, lng: 32.6178, distKm: 4.8, eta: "28 min" },
  { name: "Muyenga & Tank Hill", lat: 0.2989, lng: 32.6074, distKm: 6.5, eta: "35 min" },
  { name: "Kira Town & Najjera", lat: 0.3888, lng: 32.6412, distKm: 11.2, eta: "45 min" },
  { name: "Entebbe International Airport / Town", lat: 0.0512, lng: 32.4637, distKm: 38.0, eta: "1 hr 15 min" },
];

export function GoogleDeliveryMap({ value, onChange, riderPosition }: Props) {
  const mapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    firebaseConfig.apiKey ||
    "";

  const [search, setSearch] = useState("");

  const destination: DeliveryPoint = value || {
    lat: 0.3344,
    lng: 32.5878,
    label: "Kololo (Acacia Mall Area)",
  };

  const handleMapClick = useCallback((event: any) => {
    if (!event.detail?.latLng) return;
    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    // Calculate approximate straight-line distance from Kololo HQ
    const dLat = (lat - STORE_LOCATION.lat) * 111;
    const dLng = (lng - STORE_LOCATION.lng) * 111 * Math.cos(lat * (Math.PI / 180));
    const distKm = Math.max(1.5, Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 1.3 * 10) / 10);
    const durationMin = Math.round(distKm * 3.5);

    // Find closest known Kampala / Entebbe neighborhood
    let closestArea = POPULAR_AREAS[0];
    let minD = Infinity;
    for (const a of POPULAR_AREAS) {
      const d = Math.hypot((lat - a.lat) * 111, (lng - a.lng) * 111);
      if (d < minD) {
        minD = d;
        closestArea = a;
      }
    }

    const friendlyLabel = minD < 2.0
      ? `${closestArea.name} (GPS ${lat.toFixed(4)}, ${lng.toFixed(4)})`
      : `Location Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    onChange(
      {
        lat,
        lng,
        label: friendlyLabel,
      },
      {
        distanceKm: distKm,
        durationMin,
      }
    );
  }, [onChange]);

  const selectPreset = (area: (typeof POPULAR_AREAS)[0]) => {
    onChange(
      { lat: area.lat, lng: area.lng, label: area.name },
      { distanceKm: area.distKm, durationMin: parseInt(area.eta) || 30 }
    );
  };

  const filteredAreas = POPULAR_AREAS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 rounded-2xl border border-gold-line/40 bg-card/80 p-3.5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Google Live Dispatch Map
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">Click map or pick area</span>
      </div>

      {/* Live Google Map Canvas */}
      <div className="relative h-[280px] w-full overflow-hidden rounded-xl border border-border shadow-inner">
        <APIProvider apiKey={mapsApiKey}>
          <GoogleMap
            defaultCenter={{ lat: destination.lat, lng: destination.lng }}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            className="h-full w-full"
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          >
            {/* Store HQ Marker */}
            <AdvancedMarker position={{ lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng }} title="ElevenX Central Hub">
              <div className="flex flex-col items-center">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg border-2 border-white">
                  👑
                </div>
                <span className="text-[9px] font-bold bg-black/80 text-primary px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shadow">
                  ElevenX HQ
                </span>
              </div>
            </AdvancedMarker>

            {/* Destination Dropoff Marker */}
            <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }} title="Your Delivery Location">
              <div className="flex flex-col items-center animate-bounce">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-white shadow-xl border-2 border-white">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold bg-black/85 text-emerald-400 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shadow">
                  Drop-off
                </span>
              </div>
            </AdvancedMarker>

            {/* Rider Marker (if active dispatch) */}
            {riderPosition && (
              <AdvancedMarker position={riderPosition} title="Live Dispatch Rider">
                <div className="flex flex-col items-center">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-white shadow-lg border-2 border-white">
                    <Bike className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-bold bg-black/80 text-amber-400 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shadow">
                    Rider Dan
                  </span>
                </div>
              </AdvancedMarker>
            )}
          </GoogleMap>
        </APIProvider>
      </div>

      {/* Quick search & area chips */}
      <div className="space-y-2">
        <input
          type="text"
          className="field text-xs py-2 m-0"
          placeholder="Search Kampala or Entebbe dropoff points..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
          {filteredAreas.map((area) => {
            const isMatch = destination.label === area.name;
            return (
              <button
                key={area.name}
                type="button"
                onClick={() => selectPreset(area)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap transition shrink-0 ${
                  isMatch
                    ? "border-primary bg-primary text-primary-foreground shadow"
                    : "border-border bg-surface text-muted-foreground hover:border-gold-line hover:text-foreground"
                }`}
              >
                {area.name.split(" ")[0]} ({area.distKm}km)
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Selection Summary */}
      <div className="p-2.5 rounded-xl bg-gold-soft border border-gold-line/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <Compass className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-foreground truncate">
            Destination: <strong className="text-primary">{destination.label}</strong>
          </span>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
          GPS Live
        </span>
      </div>
    </div>
  );
}
