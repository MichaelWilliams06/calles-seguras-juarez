import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ReporteZona {
  id: number;
  kind: 'pavimento' | 'encharcamiento';
  folio: string;
  colonia_nombre: string;
  calle: string;
  latitud: number;
  longitud: number;
  estado: string;
  severidad?: string | null;
  nivel_agua?: string | null;
}

interface RespuestaZona {
  centro: { lat: number; lon: number };
  radio_km: number;
  colonias_cercanas?: string[];
  reportes_cercanos?: {
    baches_activos: number;
    encharcamientos_activos: number;
    items?: ReporteZona[];
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const MiZonaPage: React.FC = () => {
  const [lat, setLat] = useState<string>('31.7308');
  const [lon, setLon] = useState<string>('-106.4436');
  const [radioKm, setRadioKm] = useState<string>('3.0');
  const [data, setData] = useState<RespuestaZona | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersByKeyRef = useRef<Record<string, L.CircleMarker>>({});
  const enfocadoManualRef = useRef(false);

  const consultar = async (latVal = lat, lonVal = lon, radioVal = radioKm) => {
    setCargando(true);
    setError(null);
    enfocadoManualRef.current = false;
    try {
      const params = new URLSearchParams({
        lat: String(latVal),
        lon: String(lonVal),
        radio_km: String(radioVal),
        solo_con_etiquetas: 'true',
      });
      const resp = await fetch(`${API_BASE}/api/zona/consulta?${params.toString()}`);
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.detail || 'No se pudo consultar la zona.');
      }
      const parsed = json as RespuestaZona;
      setData(parsed);
      if (parsed.centro && typeof parsed.centro.lat === 'number' && typeof parsed.centro.lon === 'number') {
        setLat(parsed.centro.lat.toFixed(6));
        setLon(parsed.centro.lon.toFixed(6));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar la zona.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([Number(lat), Number(lon)], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const nuevaLat = e.latlng.lat.toFixed(6);
      const nuevaLon = e.latlng.lng.toFixed(6);
      setLat(nuevaLat);
      setLon(nuevaLon);
      void consultar(nuevaLat, nuevaLon, radioKm);
    });

    void consultar(lat, lon, radioKm);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    markersByKeyRef.current = {};

    const cLat = Number(lat);
    const cLon = Number(lon);
    const rMetros = Number(radioKm) * 1000;

    let bounds: L.LatLngBounds | null = null;

    if (!Number.isNaN(cLat) && !Number.isNaN(cLon)) {
      L.circleMarker([cLat, cLon], {
        radius: 7,
        color: '#0f4c3a',
        fillColor: '#1b7a5e',
        fillOpacity: 1,
      })
        .bindPopup(`<b>Centro consultado (verde)</b><br/>${cLat.toFixed(6)}, ${cLon.toFixed(6)}`)
        .addTo(group);

      const radioCircle = L.circle([cLat, cLon], {
        radius: rMetros,
        color: '#0f4c3a',
        fillColor: '#1b7a5e',
        fillOpacity: 0.1,
      }).addTo(group);

      bounds = radioCircle.getBounds();
    }

    const items = data?.reportes_cercanos?.items ?? [];
    items.forEach((rep) => {
      const esEncharcamiento = rep.kind === 'encharcamiento';
      const marker = L.circleMarker([rep.latitud, rep.longitud], {
        radius: 9,
        color: esEncharcamiento ? '#1d4ed8' : '#b91c1c',
        fillColor: esEncharcamiento ? '#3b82f6' : '#ef4444',
        fillOpacity: 0.95,
        weight: 2,
      })
        .bindPopup(
          `<b>${esEncharcamiento ? 'Encharcamiento' : 'Bache'} (${rep.folio})</b><br/>` +
            `${rep.calle}<br/>` +
            `Colonia: ${rep.colonia_nombre}<br/>` +
            `Estado: ${rep.estado}<br/>` +
            `<small>${rep.latitud.toFixed(6)}, ${rep.longitud.toFixed(6)}</small>`
        )
        .addTo(group);

      markersByKeyRef.current[`${rep.kind}-${rep.id}`] = marker;

      if (bounds) {
        bounds.extend([rep.latitud, rep.longitud]);
      }
    });

    if (bounds && !enfocadoManualRef.current) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [data, lat, lon, radioKm]);

  const enfocarReporte = (rep: ReporteZona) => {
    const map = mapRef.current;
    if (!map) return;
    enfocadoManualRef.current = true;
    map.setView([rep.latitud, rep.longitud], 16);
    markersByKeyRef.current[`${rep.kind}-${rep.id}`]?.openPopup();
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nuevaLat = pos.coords.latitude.toFixed(6);
        const nuevaLon = pos.coords.longitude.toFixed(6);
        setLat(nuevaLat);
        setLon(nuevaLon);
        void consultar(nuevaLat, nuevaLon, radioKm);
      },
      () => {
        setError('No se pudo obtener tu ubicación GPS. Haz clic directamente sobre el mapa.');
      }
    );
  };

  return (
    <section className="contenedor" style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem' }}>
      <h1>¿Cómo está mi zona?</h1>
      <p>Haz clic en cualquier punto del mapa o ingresa coordenadas para revisar el radio en Ciudad Juárez.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end', marginBottom: '1rem' }}>
        <label>
          Latitud
          <input value={lat} onChange={(e) => setLat(e.target.value)} />
        </label>
        <label>
          Longitud
          <input value={lon} onChange={(e) => setLon(e.target.value)} />
        </label>
        <label>
          Radio (km)
          <select value={radioKm} onChange={(e) => setRadioKm(e.target.value)}>
            <option value="0.5">0.5 km</option>
            <option value="1.0">1.0 km</option>
            <option value="2.0">2.0 km</option>
            <option value="3.0">3.0 km</option>
          </select>
        </label>
        <button type="button" className="btn" onClick={() => void consultar()} disabled={cargando}>
          {cargando ? 'Consultando...' : 'Consultar zona'}
        </button>
        <button type="button" className="btn secondary" onClick={usarMiUbicacion} disabled={cargando}>
          Usar mi ubicación
        </button>
      </div>

      {error && <p style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</p>}

      <div
        ref={mapContainerRef}
        style={{
          height: '420px',
          width: '100%',
          borderRadius: '10px',
          border: '1px solid #d6d3c9',
          marginBottom: '1rem',
        }}
      />

      {data && (
        <div className="resultado-zona">
          <h2>Resumen del radio ({data.radio_km} km)</h2>
          <p>
            <strong>Baches activos cercanos (rojo):</strong> {data.reportes_cercanos?.baches_activos ?? 0} ·{' '}
            <strong>Encharcamientos activos cercanos (azul):</strong>{' '}
            {data.reportes_cercanos?.encharcamientos_activos ?? 0}
          </p>
          {data.colonias_cercanas && data.colonias_cercanas.length > 0 && (
            <p>
              <strong>Colonias con reportes cercanos:</strong> {data.colonias_cercanas.join(', ')}
            </p>
          )}
          {data.reportes_cercanos?.items && data.reportes_cercanos.items.length > 0 && (
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem' }}>
              {data.reportes_cercanos.items.map((rep) => (
                <li key={`${rep.kind}-${rep.id}`} style={{ marginBottom: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn sm secondary"
                    onClick={() => enfocarReporte(rep)}
                  >
                    Ubicar {rep.folio}
                  </button>{' '}
                  <strong>{rep.calle}</strong> — {rep.colonia_nombre} ({rep.estado})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};