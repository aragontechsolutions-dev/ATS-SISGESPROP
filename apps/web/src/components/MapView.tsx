import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isWithinTerritory, type GeoGeometry } from '@ats/pricing';
import uruguay from '@ats/pricing/uruguay.geometry.json';
import type { Coverage, LatLng } from '../api';

/**
 * Mapa de cobertura (Leaflet + OpenStreetMap). Este módulo se carga de forma diferida
 * (solo cuando el visitante llega a la sección) para no frenar la carga inicial.
 *
 * La comprobación "dentro de Uruguay" aquí es solo para dar respuesta inmediata:
 * el servidor vuelve a validar y recalcula todo (no se confía en el navegador).
 */
const GEOMETRY = uruguay.geometry as GeoGeometry;
/** Debe coincidir con TERRITORY_TOLERANCE_KM de la API (solo afecta el aviso inmediato). */
const TOLERANCE_KM = 2;
const URUGUAY_CENTER: L.LatLngExpression = [-32.6, -55.9];

interface Props {
  base: Coverage | null;
  point: LatLng | null;
  onPick: (point: LatLng) => void;
  onOutside: () => void;
}

export default function MapView({ base, point, onPick, onOutside }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pointLayer = useRef<L.CircleMarker | null>(null);
  const baseLayer = useRef<L.CircleMarker | null>(null);
  const handlers = useRef({ onPick, onOutside });
  handlers.current = { onPick, onOutside };

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: URUGUAY_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 16,
      maxBounds: L.latLngBounds([-36.5, -59.5], [-29.5, -52.0]),
      scrollWheelZoom: false,
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.geoJSON(GEOMETRY as unknown as GeoJSON.GeoJsonObject, {
      interactive: false,
      style: { color: '#183D32', weight: 2, fillColor: '#183D32', fillOpacity: 0.06 },
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const picked = { lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) };
      if (isWithinTerritory(picked, GEOMETRY, TOLERANCE_KM)) handlers.current.onPick(picked);
      else handlers.current.onOutside();
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Base de operaciones.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !base) return;
    baseLayer.current?.remove();
    baseLayer.current = L.circleMarker([base.baseLat, base.baseLng], {
      radius: 9,
      color: '#183D32',
      weight: 3,
      fillColor: '#B7A06A',
      fillOpacity: 1,
    })
      .bindTooltip(`Base de operaciones: ${base.baseLabel}`)
      .addTo(map);
  }, [base]);

  // Punto elegido por el visitante.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pointLayer.current?.remove();
    pointLayer.current = null;
    if (point) {
      pointLayer.current = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: '#183D32',
        fillOpacity: 1,
      })
        .bindTooltip('Tu propiedad')
        .addTo(map);
    }
  }, [point]);

  return (
    <div
      ref={containerRef}
      // isolate: crea un contexto de apilamiento propio. Leaflet usa z-index de 400 a 1000 en sus
      // capas y controles; sin esto quedaban por encima del menú fijo (z-40) al hacer scroll.
      className="isolate h-[420px] w-full rounded-lg border border-border md:h-[520px]"
      role="application"
      aria-label="Mapa de Uruguay. Haz clic o toca donde está tu propiedad."
      data-testid="coverage-map"
    />
  );
}
