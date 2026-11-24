import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type {
  Colonia,
  NivelAgua,
  ReporteItem,
  RolUsuario,
  TamanoBache,
  TipoDano,
} from '../types';

interface Props {
  kind: 'pavimento' | 'encharcamiento';
  rol?: RolUsuario;
}

// Límites geográficos aproximados del municipio de Juárez, Chihuahua (RN-01)
function dentroDeJuarez(lat: number, lng: number): boolean {
  return lat >= 31.10 && lat <= 31.82 && lng >= -106.95 && lng <= -106.15;
}

const COORDENADAS_COLONIAS: Record<string, { lat: number; lng: number }> = {
  'partido romero': { lat: 31.7335, lng: -106.4795 },
  'zona centro': { lat: 31.7368, lng: -106.4875 },
  'zona pronaf': { lat: 31.7475, lng: -106.4635 },
  'bellavista': { lat: 31.7295, lng: -106.4735 },
  'hidalgo': { lat: 31.7315, lng: -106.4685 },
  'san lorenzo': { lat: 31.7225, lng: -106.4695 },
  'anapra': { lat: 31.7685, lng: -106.5485 },
  'las torres': { lat: 31.6525, lng: -106.4185 },
  'parajes del sur': { lat: 31.6195, lng: -106.4095 },
};

function buscarRespaldoColonia(nombreColonia?: string): { lat: number; lng: number } | null {
  if (!nombreColonia) return null;
  const normalizada = nombreColonia.toLowerCase().trim();
  for (const [clave, coords] of Object.entries(COORDENADAS_COLONIAS)) {
    if (normalizada.includes(clave)) {
      return coords;
    }
  }
  return null;
}

function prepararConsultaCalle(calleTexto: string): string[] {
  const limpia = calleTexto.replace(/\s+/g, ' ').trim();
  if (!limpia) return [];

  const variantes = new Set<string>([limpia]);

  // Variante sin prefijos "Avenida" / "Av." / "Calle" para facilitar cruce en OSM
  const sinPrefijos = limpia
    .replace(/\b(avenida|av\.?|calle)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (sinPrefijos && sinPrefijos.toLowerCase() !== limpia.toLowerCase()) {
    variantes.add(sinPrefijos);
  }

  // Ejemplo: "calle uruguay entre vicente guerrero y 20 de noviembre"
  const matchEntre = limpia.match(/^(.*?)\s+entre\s+(.*?)\s+y\s+(.*)$/i);
  if (matchEntre) {
    const [, callePrincipal, cruceA, cruceB] = matchEntre.map((s) => s.trim());
    variantes.add(`${callePrincipal} y ${cruceA}`);
    variantes.add(`${callePrincipal} & ${cruceA}`);
    variantes.add(`${callePrincipal} y ${cruceB}`);
    variantes.add(`${callePrincipal} & ${cruceB}`);
    variantes.add(callePrincipal);
  }

  // Ejemplo: "Calle Uruguay y Avenida Vicente Guerrero"
  if (/\s+y\s+/i.test(limpia)) {
    variantes.add(limpia.replace(/\s+y\s+/gi, ' & '));
    const partesCruce = limpia
      .split(/\s+y\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (partesCruce.length >= 2) {
      variantes.add(partesCruce[0]);
    }
  }

  return Array.from(variantes);
}

async function geocodificarEnJuarez(
  calleTexto: string,
  coloniaNombre?: string
): Promise<{ lat: number; lng: number; etiqueta: string } | null> {
  const variantesCalle = prepararConsultaCalle(calleTexto);
  const coloniaLimpia = (coloniaNombre || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const consultas = [
    ...variantesCalle.map((v) =>
      [v, coloniaLimpia, 'Ciudad Juárez', 'Chihuahua', 'México'].filter(Boolean).join(', ')
    ),
    ...variantesCalle.map((v) =>
      [v, 'Ciudad Juárez', 'Chihuahua', 'México'].filter(Boolean).join(', ')
    ),
  ];

  for (const consulta of consultas) {
    const params = new URLSearchParams({
      q: consulta,
      format: 'json',
      limit: '1',
      countrycodes: 'mx',
      viewbox: '-106.95,31.82,-106.15,31.10',
      bounded: '1',
    });

    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (!resp.ok) continue;

    const datos = (await resp.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (datos.length > 0) {
      const latNum = Number(datos[0].lat);
      const lngNum = Number(datos[0].lon);
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum) && dentroDeJuarez(latNum, lngNum)) {
        return {
          lat: latNum,
          lng: lngNum,
          etiqueta: datos[0].display_name,
        };
      }
    }
  }

  const respaldo = buscarRespaldoColonia(coloniaLimpia);
  if (respaldo) {
    return {
      lat: respaldo.lat,
      lng: respaldo.lng,
      etiqueta: `Referencia aproximada en ${coloniaLimpia} (ajusta lat/lng si necesitas el cruce exacto)`,
    };
  }

  return null;
}

export const ReportarPage: React.FC<Props> = ({ kind }) => {
  const navigate = useNavigate();
  const [colonias, setColonias] = useState<Colonia[]>([]);
  const [coloniaId, setColoniaId] = useState<number | ''>('');
  const [cargandoColonias, setCargandoColonias] = useState<boolean>(true);
  const [errorColonias, setErrorColonias] = useState<string | null>(null);
  const [calle, setCalle] = useState('');
  const [latitud, setLatitud] = useState<string>('31.7333');
  const [longitud, setLongitud] = useState<string>('-106.4833');
  const [descripcion, setDescripcion] = useState('');

  // Estado de geocodificación
  const [buscandoUbicacion, setBuscandoUbicacion] = useState<boolean>(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const edicionManualCoordsRef = useRef<boolean>(false);

  // Campos dinámicos pavimento
  const [tipoDano, setTipoDano] = useState<TipoDano>('bache');
  const [tamano, setTamano] = useState<TamanoBache>('mediano');
  const [profundidad, setProfundidad] = useState('');
  const [carril, setCarril] = useState('Derecho');
  const [senalizado, setSenalizado] = useState(false);

  // Campos dinámicos encharcamiento
  const [nivelAgua, setNivelAgua] = useState<NivelAgua>('a un lado de la calle');
  const [riesgoAlto, setRiesgoAlto] = useState<'si' | 'no' | ''>('');

  // Control de duplicados y envío
  const [duplicados, setDuplicados] = useState<ReporteItem[]>([]);
  const [ignorarDuplicado, setIgnorarDuplicado] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinoTrasEnvio = '/';

  const cargarColonias = useCallback(() => {
    setCargandoColonias(true);
    setErrorColonias(null);
    api
      .getColonias()
      .then((list) => {
        const activas = list.filter((c) => c.activa);
        setColonias(activas);
        if (activas.length > 0) {
          setColoniaId((prev) => (prev === '' ? activas[0].id_colonia : prev));
        } else {
          setColoniaId('');
        }
      })
      .catch((err: Error) => {
        setColonias([]);
        setColoniaId('');
        setErrorColonias(err.message || 'No se pudieron cargar las colonias.');
      })
      .finally(() => setCargandoColonias(false));
  }, []);

  useEffect(() => {
    cargarColonias();
  }, [cargarColonias]);

  const coloniaSeleccionada = colonias.find((c) => c.id_colonia === Number(coloniaId));

  const resolverCoordenadasPorDireccion = useCallback(
    async (forzar = false) => {
      if (!forzar && edicionManualCoordsRef.current) return;

      const textoCalle = calle.trim();
      const nombreColonia = coloniaSeleccionada?.nombre;

      if (textoCalle.length < 3 && !nombreColonia) return;

      setBuscandoUbicacion(true);
      setAvisoUbicacion(null);
      try {
        if (textoCalle.length >= 3) {
          const resultado = await geocodificarEnJuarez(textoCalle, nombreColonia);
          if (resultado) {
            setLatitud(resultado.lat.toFixed(6));
            setLongitud(resultado.lng.toFixed(6));
            setIgnorarDuplicado(false);
            setDuplicados([]);
            setAvisoUbicacion(`Coordenadas actualizadas: ${resultado.etiqueta}`);
            return;
          }
        }

        const respaldo = buscarRespaldoColonia(nombreColonia);
        if (respaldo) {
          setLatitud(respaldo.lat.toFixed(6));
          setLongitud(respaldo.lng.toFixed(6));
          setIgnorarDuplicado(false);
          setDuplicados([]);
          setAvisoUbicacion(`Coordenadas centradas en ${nombreColonia}.`);
        }
      } catch {
        // Si Nominatim falla por red, no bloquea el formulario
      } finally {
        setBuscandoUbicacion(false);
      }
    },
    [calle, coloniaSeleccionada?.nombre]
  );

  // Geocodifica automáticamente con debounce al escribir la calle o cambiar de colonia
  useEffect(() => {
    if (calle.trim().length < 3 && !coloniaSeleccionada?.nombre) return;

    const timer = window.setTimeout(() => {
      void resolverCoordenadasPorDireccion(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [calle, coloniaSeleccionada?.nombre, resolverCoordenadasPorDireccion]);

  const usarUbicacionDispositivo = () => {
    setError(null);
    setAvisoUbicacion(null);
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        edicionManualCoordsRef.current = true;
        setLatitud(pos.coords.latitude.toFixed(6));
        setLongitud(pos.coords.longitude.toFixed(6));
        setIgnorarDuplicado(false);
        setDuplicados([]);
        setAvisoUbicacion('Se usó la ubicación actual de tu dispositivo.');
      },
      () =>
        setError('No se pudo obtener tu ubicación. Captura las coordenadas o la calle manualmente.')
    );
  };

  const handleConfirmarDuplicado = async (reporteId: number) => {
    setError(null);
    try {
      await api.confirmarReporte(kind, reporteId);
      navigate(destinoTrasEnvio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el reporte.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lat = Number(latitud);
    const lng = Number(longitud);

    if (coloniaId === '' || Number(coloniaId) < 1) {
      setError('Selecciona una colonia válida.');
      return;
    }
    if (!calle.trim()) {
      setError('Escribe una calle o referencia.');
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng) || !dentroDeJuarez(lat, lng)) {
      setError('La ubicación queda fuera del municipio de Ciudad Juárez (RN-01).');
      return;
    }
    if (kind === 'pavimento' && tipoDano === 'bache' && profundidad.trim() !== '') {
      const profNum = Number(profundidad);
      if (Number.isNaN(profNum) || profNum <= 0 || profNum > 200) {
        setError('La profundidad debe ser un número entre 1 y 200 cm.');
        return;
      }
    }
    if (descripcion.length > 500) {
      setError('La descripción no puede superar los 500 caracteres.');
      return;
    }
    if (kind === 'encharcamiento' && nivelAgua === 'intransitable' && !riesgoAlto) {
      setError('Indica si hay vehículos varados o personas en riesgo.');
      return;
    }

    setSubmitting(true);
    try {
      if (!ignorarDuplicado && duplicados.length === 0) {
        const cercanos = await api.verificarDuplicados(lat, lng, kind);
        if (cercanos.length > 0) {
          setDuplicados(cercanos);
          setSubmitting(false);
          return;
        }
      }

      if (kind === 'pavimento') {
        await api.crearBache({
          id_colonia: Number(coloniaId),
          calle: calle.trim(),
          latitud: lat,
          longitud: lng,
          descripcion: descripcion.trim() || null,
          tipo_dano: tipoDano,
          tamano: tipoDano === 'bache' ? tamano : null,
          profundidad_cm: tipoDano === 'bache' && profundidad.trim() ? Number(profundidad) : null,
          carril_afectado: tipoDano === 'bache' ? carril : null,
          severidad: tipoDano === 'alcantarilla_sin_tapa' ? 'Alta' : 'Media',
          senalizado: tipoDano === 'alcantarilla_sin_tapa' ? senalizado : null,
        });
      } else {
        await api.crearEncharcamiento({
          id_colonia: Number(coloniaId),
          calle: calle.trim(),
          latitud: lat,
          longitud: lng,
          descripcion: descripcion.trim() || null,
          nivel_agua: nivelAgua,
          riesgo_alto: nivelAgua === 'intransitable' ? riesgoAlto === 'si' : false,
        });
      }

      navigate(destinoTrasEnvio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión al enviar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="titulo-reportar">
      <p className="eyebrow">
        {kind === 'pavimento' ? 'Reportar daño en pavimento' : 'Reportar encharcamiento'}
      </p>
      <h1 id="titulo-reportar">
        {kind === 'pavimento' ? '¿Dónde está el bache?' : '¿Dónde está el agua?'}
      </h1>
      <p className="sub">
        La plataforma asigna un folio único y registra la hora oficial de Ciudad Juárez.
      </p>

      {duplicados.length > 0 && (
        <div
          className="panel"
          style={{ borderColor: 'var(--copper)', marginBottom: 16 }}
          role="region"
          aria-label="Reporte cercano detectado"
        >
          <p className="eyebrow">Ya existe un reporte cerca</p>
          <p>
            Encontramos el folio <strong>{duplicados[0].folio}</strong> en {duplicados[0].calle}.
            ¿Deseas confirmarlo en lugar de duplicarlo?
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleConfirmarDuplicado(duplicados[0].id)}
            >
              Confirmar ese reporte
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setIgnorarDuplicado(true);
                setDuplicados([]);
              }}
            >
              Es un daño distinto, continuar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="panel" noValidate>
        <div className="field">
          <label htmlFor="rep-colonia">Colonia</label>
          <select
            id="rep-colonia"
            value={coloniaId}
            disabled={cargandoColonias || colonias.length === 0}
            onChange={(e) => {
              edicionManualCoordsRef.current = false;
              setColoniaId(e.target.value ? Number(e.target.value) : '');
            }}
          >
            {colonias.length === 0 ? (
              <option value="">
                {cargandoColonias ? 'Cargando colonias…' : 'No hay colonias disponibles'}
              </option>
            ) : (
              colonias.map((c) => (
                <option key={c.id_colonia} value={c.id_colonia}>
                  {c.nombre} ({c.sector})
                </option>
              ))
            )}
          </select>
          {errorColonias && (
            <div className="err" role="alert" style={{ marginTop: 6 }}>
              {errorColonias}{' '}
              <button type="button" className="btn secondary sm" onClick={cargarColonias}>
                Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="rep-calle">Calle o referencia</label>
          <input
            id="rep-calle"
            type="text"
            required
            value={calle}
            onChange={(e) => {
              edicionManualCoordsRef.current = false;
              setCalle(e.target.value);
            }}
            placeholder="Ej. Calle Uruguay entre Vicente Guerrero y 20 de Noviembre"
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn secondary sm"
              disabled={buscandoUbicacion}
              onClick={() => {
                edicionManualCoordsRef.current = false;
                void resolverCoordenadasPorDireccion(true);
              }}
            >
              {buscandoUbicacion ? 'Buscando coordenadas…' : 'Ubicar calle en mapa'}
            </button>
            {avisoUbicacion && <span className="hint">{avisoUbicacion}</span>}
          </div>
        </div>

        <div className="filters-grid">
          <div className="field">
            <label htmlFor="rep-lat">Latitud</label>
            <input
              id="rep-lat"
              type="number"
              step="any"
              value={latitud}
              onChange={(e) => {
                edicionManualCoordsRef.current = true;
                setLatitud(e.target.value);
                setIgnorarDuplicado(false);
                setDuplicados([]);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="rep-lng">Longitud</label>
            <input
              id="rep-lng"
              type="number"
              step="any"
              value={longitud}
              onChange={(e) => {
                edicionManualCoordsRef.current = true;
                setLongitud(e.target.value);
                setIgnorarDuplicado(false);
                setDuplicados([]);
              }}
            />
          </div>
          <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="button" className="btn secondary" onClick={usarUbicacionDispositivo}>
              Usar mi ubicación
            </button>
          </div>
        </div>

        {kind === 'pavimento' ? (
          <fieldset>
            <legend>Detalles del daño</legend>
            <div className="field">
              <label htmlFor="rep-tipo">Tipo de daño</label>
              <select
                id="rep-tipo"
                value={tipoDano}
                onChange={(e) => setTipoDano(e.target.value as TipoDano)}
              >
                <option value="bache">Bache</option>
                <option value="hundimiento">Hundimiento</option>
                <option value="grieta">Grieta</option>
                <option value="alcantarilla_sin_tapa">Alcantarilla sin tapa</option>
              </select>
            </div>

            {tipoDano === 'bache' && (
              <>
                <div className="field">
                  <label htmlFor="rep-tamano">Tamaño aproximado</label>
                  <select
                    id="rep-tamano"
                    value={tamano}
                    onChange={(e) => setTamano(e.target.value as TamanoBache)}
                  >
                    <option value="chico">Chico (menos de 30 cm)</option>
                    <option value="mediano">Mediano (30 cm a 1 m)</option>
                    <option value="grande">Grande (más de 1 m)</option>
                  </select>
                </div>
                <div className="filters-grid">
                  <div className="field">
                    <label htmlFor="rep-prof">Profundidad aproximada (cm)</label>
                    <input
                      id="rep-prof"
                      type="number"
                      min="1"
                      max="200"
                      value={profundidad}
                      onChange={(e) => setProfundidad(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rep-carril">Carril afectado</label>
                    <input
                      id="rep-carril"
                      type="text"
                      value={carril}
                      onChange={(e) => setCarril(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {tipoDano === 'alcantarilla_sin_tapa' && (
              <div
                className="field"
                style={{ display: 'flex', gap: 10, alignItems: 'center' }}
              >
                <input
                  id="rep-senal"
                  type="checkbox"
                  checked={senalizado}
                  onChange={(e) => setSenalizado(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="rep-senal" style={{ margin: 0 }}>
                  ¿El punto está señalizado?
                </label>
                <span className="tag warn" style={{ marginLeft: 'auto' }}>
                  ⚠️ Severidad Alta
                </span>
              </div>
            )}
          </fieldset>
        ) : (
          <fieldset>
            <legend>Nivel del agua</legend>
            <div className="field">
              <label htmlFor="rep-nivel">Profundidad percibida</label>
              <select
                id="rep-nivel"
                value={nivelAgua}
                onChange={(e) => setNivelAgua(e.target.value as NivelAgua)}
              >
                <option value="a un lado de la calle">A un lado de la calle</option>
                <option value="cubre un carril">Cubre un carril</option>
                <option value="a media llanta">A media llanta</option>
                <option value="intransitable">Intransitable</option>
              </select>
            </div>

            {nivelAgua === 'intransitable' && (
              <div className="field">
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  ¿Hay vehículos varados o personas en riesgo? (obligatorio)
                </span>
                <label style={{ display: 'inline-flex', gap: 6, marginRight: 16 }}>
                  <input
                    type="radio"
                    name="riesgo"
                    value="si"
                    checked={riesgoAlto === 'si'}
                    onChange={() => setRiesgoAlto('si')}
                    style={{ width: 'auto' }}
                  />{' '}
                  Sí
                </label>
                <label style={{ display: 'inline-flex', gap: 6 }}>
                  <input
                    type="radio"
                    name="riesgo"
                    value="no"
                    checked={riesgoAlto === 'no'}
                    onChange={() => setRiesgoAlto('no')}
                    style={{ width: 'auto' }}
                  />{' '}
                  No
                </label>
              </div>
            )}
          </fieldset>
        )}

        <div className="field">
          <label htmlFor="rep-desc">Descripción adicional (opcional, máx. 500 caracteres)</label>
          <textarea
            id="rep-desc"
            rows={3}
            maxLength={500}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <div className="hint">{descripcion.length}/500 caracteres</div>
        </div>

        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn copper"
          disabled={submitting || cargandoColonias || colonias.length === 0}
        >
          {submitting ? 'Enviando reporte…' : 'Enviar reporte'}
        </button>
      </form>
    </section>
  );
};