import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isWithinTerritory, type GeoGeometry } from '@ats/pricing';
import uruguay from '@ats/pricing/uruguay.geometry.json';

/**
 * Mapa del panel para ubicar la BASE DE OPERACIONES (pedido del 11/11/2026). Se carga de forma
 * diferida (solo en "Precios y viáticos").
 *
 * - Búsqueda por dirección con Nominatim (OpenStreetMap), restringida a Uruguay. Solo al pulsar
 *   "Buscar" (su política de uso prohíbe autocompletar) y con espera mínima entre búsquedas.
 *   Se envía únicamente el texto buscado (la dirección de la empresa, no datos personales).
 * - Clic en el mapa o arrastrar el marcador para ajustar.
 * - Coordenadas manuales: precisión y alternativa de teclado al mapa.
 * - Se valida "dentro de Uruguay" aquí para responder al instante; el servidor vuelve a validar.
 */
const GEOMETRY = uruguay.geometry as GeoGeometry;
const TOLERANCE_KM = 2;
/** Sin base guardada: zona prioritaria del Plan Maestro (Maldonado / Punta del Este). */
const DEFAULT_CENTER: L.LatLngExpression = [-34.9, -54.95];
const SEARCH_COOLDOWN_MS = 1500;
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface BasePoint {
  lat: number;
  lng: number;
}

interface SearchResult {
  label: string;
  lat: number;
  lng: number;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export default function BaseLocationMap({
  value,
  onChange,
  onError,
}: {
  value: BasePoint | null;
  onChange: (p: BasePoint) => void;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const handlers = useRef({ onChange, onError });
  handlers.current = { onChange, onError };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const lastSearch = useRef(0);
  const [lat, setLat] = useState(value ? String(value.lat) : '');
  const [lng, setLng] = useState(value ? String(value.lng) : '');

  /** Aplica un punto si está dentro de Uruguay; si no, avisa y no lo cambia. */
  const apply = useRef((p: BasePoint, zoom?: number) => {
    if (!isWithinTerritory(p, GEOMETRY, TOLERANCE_KM)) {
      handlers.current.onError('La base debe estar dentro de Uruguay.');
      return false;
    }
    const point = { lat: round6(p.lat), lng: round6(p.lng) };
    handlers.current.onChange(point);
    if (zoom && mapRef.current) mapRef.current.setView([point.lat, point.lng], zoom);
    return true;
  });

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: value ? [value.lat, value.lng] : DEFAULT_CENTER,
      zoom: value ? 15 : 10,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => void apply.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Marcador arrastrable sincronizado con el valor.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    setLat(String(value.lat));
    setLng(String(value.lng));
    if (!markerRef.current) {
      const icon = L.divIcon({ className: 'base-marker', iconSize: [24, 24], iconAnchor: [12, 12] });
      const marker = L.marker([value.lat, value.lng], { icon, draggable: true, title: 'Base de operaciones', alt: 'Base de operaciones' });
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        // Si se arrastra fuera de Uruguay, vuelve al último punto válido.
        if (!apply.current({ lat: ll.lat, lng: ll.lng })) marker.setLatLng([value.lat, value.lng]);
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
  }, [value]);

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) return handlers.current.onError('Escribe al menos 3 caracteres para buscar.');
    const wait = lastSearch.current + SEARCH_COOLDOWN_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastSearch.current = Date.now();
    setSearching(true);
    setResults(null);
    try {
      const url = `${NOMINATIM_URL}?${new URLSearchParams({ format: 'jsonv2', countrycodes: 'uy', limit: '5', 'accept-language': 'es', q })}`;
      const res = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Array<{ display_name?: unknown; lat?: unknown; lon?: unknown }>;
      // Solo se usan tres campos, validados; el resto de la respuesta se descarta.
      const parsed = (Array.isArray(data) ? data : [])
        .map((r) => ({ label: String(r.display_name ?? '').slice(0, 200), lat: Number(r.lat), lng: Number(r.lon) }))
        .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
      setResults(parsed);
    } catch {
      handlers.current.onError('No se pudo buscar la dirección. Intenta de nuevo o marca el punto en el mapa.');
    } finally {
      setSearching(false);
    }
  }

  function applyManual(e: FormEvent) {
    e.preventDefault();
    const p = { lat: Number(lat.replace(',', '.')), lng: Number(lng.replace(',', '.')) };
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
      return handlers.current.onError('Coordenadas inválidas (ej.: -34.9606, -54.9489).');
    }
    apply.current(p, 15);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => void search(e)} className="flex flex-wrap items-end gap-2" role="search" aria-label="Buscar la dirección de la base">
        <div className="min-w-0 flex-1">
          <label htmlFor="base-search" className="label">Buscar dirección</label>
          <input id="base-search" className="field" value={query} maxLength={200} placeholder="Ej.: Av. Roosevelt y Parada 10, Punta del Este" onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn-secondary" disabled={searching}>{searching ? 'Buscando…' : 'Buscar'}</button>
      </form>
      <div aria-live="polite">
        {results && results.length === 0 && <p className="text-sm">Sin resultados en Uruguay. Prueba con otra dirección o marca el punto en el mapa.</p>}
        {results && results.length > 0 && (
          <ul className="space-y-1" aria-label="Resultados de la búsqueda">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button type="button" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-background" onClick={() => { if (apply.current(r, 16)) setResults(null); }}>
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        ref={containerRef}
        className="isolate h-[420px] w-full rounded-lg border border-border"
        role="application"
        aria-label="Mapa para ubicar la base de operaciones. Haz clic donde está la base o arrastra el marcador."
        data-testid="base-map"
      />
      <form onSubmit={applyManual} className="flex flex-wrap items-end gap-2" aria-label="Coordenadas de la base">
        <div>
          <label htmlFor="base-lat" className="label">Latitud de la base</label>
          <input id="base-lat" className="field w-40" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div>
          <label htmlFor="base-lng" className="label">Longitud de la base</label>
          <input id="base-lng" className="field w-40" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
        <button className="btn-secondary">Aplicar coordenadas</button>
      </form>
      <p className="text-xs text-text-secondary">
        Búsqueda de direcciones: © colaboradores de OpenStreetMap (Nominatim). Revisa siempre el punto en el mapa antes de guardar.
      </p>
    </div>
  );
}
