 import React, { useEffect, useMemo, useState } from 'react';

export type SeccionModeracion = 'validar' | 'avances' | 'seguimiento';

interface Props {
  seccionInicial?: SeccionModeracion;
}

interface ReporteApi {
  id: number;
  kind: 'pavimento' | 'encharcamiento' | string;
  folio: string;
  colonia_id?: number;
  colonia_nombre?: string;
  calle: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  tipo_dano?: string | null;
  severidad?: string | null;
  nivel_agua?: string | null;
  riesgo_alto?: boolean | null;
  fecha_creacion?: string;
  confirmaciones?: number;
}

interface ReporteModeracion extends ReporteApi {
  ultima_nota?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MOTIVOS_RECHAZO = [
  'Reporte duplicado',
  'Fuera de Ciudad Juárez',
  'Información o ubicación insuficiente',
  'No corresponde a daño vial o encharcamiento',
];

const ESTADOS_AVANCE = ['Asignado', 'Reparado'];

const ESTADOS_SEGUIMIENTO_PAVIMENTO = [
  'Recibido',
  'En revisión',
  'Asignado',
  'Reparado',
  'Rechazado',
];

const ESTADOS_SEGUIMIENTO_ENCHARCAMIENTO = ['Activo', 'Resuelto', 'Descartado'];

function calcularDistanciaMetros(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('csj_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extraerMensajeError(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const detail = (err as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          const loc = Array.isArray((item as { loc?: unknown }).loc)
            ? `${(item as { loc: unknown[] }).loc.join('.')}: `
            : '';
          return `${loc}${String((item as { msg: unknown }).msg)}`;
        }
        return '';
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(' | ');
  }
  return fallback;
}

async function obtenerReportesApi(): Promise<ReporteApi[]> {
  const res = await fetch(`${API_BASE}/api/reportes?page=1&limit=100`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extraerMensajeError(err, 'No se pudieron cargar los reportes.'));
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.items || [];
}

async function enviarDictamenValidacion(
  reporte: ReporteModeracion,
  accion: 'En revisión' | 'Rechazado',
  motivo: string,
  comentario: string
): Promise<ReporteApi> {
  const notaFinal =
    comentario.trim() ||
    (accion === 'Rechazado' ? `Rechazado: ${motivo}` : 'Validado por moderación (En revisión)');

  const esPavimento = reporte.kind === 'pavimento';
  const endpoint = esPavimento
    ? `${API_BASE}/api/baches/${reporte.id}`
    : `${API_BASE}/api/encharcamientos/${reporte.id}`;

  const payload = esPavimento
    ? {
        estado: accion,
        comentario_publico: notaFinal,
      }
    : {
        estado: accion === 'Rechazado' ? 'Descartado' : 'Activo',
      };

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extraerMensajeError(err, 'No se pudo guardar el dictamen.'));
  }

  return res.json();
}

async function enviarAvanceReparacion(
  reporte: ReporteModeracion,
  nuevoEstado: string,
  comentario: string
): Promise<ReporteApi> {
  const esPavimento = reporte.kind === 'pavimento';
  const endpoint = esPavimento
    ? `${API_BASE}/api/baches/${reporte.id}`
    : `${API_BASE}/api/encharcamientos/${reporte.id}`;

  const payload = esPavimento
    ? {
        estado: nuevoEstado,
        comentario_publico: comentario.trim(),
      }
    : {
        estado: nuevoEstado === 'Reparado' ? 'Resuelto' : 'Activo',
      };

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extraerMensajeError(err, 'No se pudo registrar el avance.'));
  }

  return res.json();
}

async function enviarCambioEstadoSeguimiento(
  reporte: ReporteModeracion,
  nuevoEstado: string,
  comentario: string
): Promise<ReporteApi> {
  const esPavimento = reporte.kind === 'pavimento';
  const endpoint = esPavimento
    ? `${API_BASE}/api/baches/${reporte.id}`
    : `${API_BASE}/api/encharcamientos/${reporte.id}`;

  const payload = esPavimento
    ? {
        estado: nuevoEstado,
        ...(comentario.trim() ? { comentario_publico: comentario.trim() } : {}),
      }
    : {
        estado: nuevoEstado,
      };

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(extraerMensajeError(err, 'No se pudo actualizar el estado del reporte.'));
  }

  return res.json();
}

export const ModeracionPage: React.FC<Props> = ({ seccionInicial = 'validar' }) => {
  const [seccion, setSeccion] = useState<SeccionModeracion>(seccionInicial);
  const [reportes, setReportes] = useState<ReporteModeracion[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [procesandoClave, setProcesandoClave] = useState<string | null>(null);

  const [motivosPorClave, setMotivosPorClave] = useState<Record<string, string>>({});
  const [comentariosPorClave, setComentariosPorClave] = useState<Record<string, string>>({});
  const [estadoAvancePorClave, setEstadoAvancePorClave] = useState<Record<string, string>>({});
  const [estadoSeguimientoPorClave, setEstadoSeguimientoPorClave] = useState<
    Record<string, string>
  >({});

  const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
  const [busquedaFolio, setBusquedaFolio] = useState<string>('');

  const claveReporte = (r: Pick<ReporteApi, 'kind' | 'id'>) => `${r.kind}-${r.id}`;

  useEffect(() => {
    setSeccion(seccionInicial);
    setMensajeOk(null);
    setError(null);
  }, [seccionInicial]);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await obtenerReportesApi();
      setReportes((previos) => {
        const notasPrevias = new Map(
          previos.filter((p) => p.ultima_nota).map((p) => [claveReporte(p), p.ultima_nota!])
        );
        const combinados = new Map<string, ReporteModeracion>();

        for (const item of lista) {
          const k = claveReporte(item);
          combinados.set(k, {
            ...item,
            ultima_nota: notasPrevias.get(k),
          });
        }

        for (const previo of previos) {
          const k = claveReporte(previo);
          if (!combinados.has(k) && previo.ultima_nota) {
            combinados.set(k, previo);
          }
        }

        return Array.from(combinados.values());
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red al consultar reportes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const pendientesValidacion = useMemo(
    () => reportes.filter((r) => r.estado.toLowerCase() === 'recibido'),
    [reportes]
  );

  const enProcesoReparacion = useMemo(
    () =>
      reportes.filter(
        (r) =>
          r.kind === 'pavimento' &&
          ['en revisión', 'en revision', 'asignado'].includes(r.estado.toLowerCase())
      ),
    [reportes]
  );

  const reportesSeguimiento = useMemo(() => {
    return reportes.filter((r) => {
      const coincideEstado =
        filtroEstado === 'Todos' || r.estado.toLowerCase() === filtroEstado.toLowerCase();
      const q = busquedaFolio.trim().toLowerCase();
      const colonia = r.colonia_nombre || '';
      const coincideTexto =
        !q ||
        r.folio.toLowerCase().includes(q) ||
        r.calle.toLowerCase().includes(q) ||
        colonia.toLowerCase().includes(q);
      return coincideEstado && coincideTexto;
    });
  }, [reportes, filtroEstado, busquedaFolio]);

  const handleDictamen = async (
    reporte: ReporteModeracion,
    accion: 'En revisión' | 'Rechazado'
  ) => {
    const clave = claveReporte(reporte);
    const motivo = motivosPorClave[clave] || MOTIVOS_RECHAZO[0];
    const comentario = comentariosPorClave[clave] || '';

    setProcesandoClave(clave);
    setError(null);
    setMensajeOk(null);
    try {
      const actualizado = await enviarDictamenValidacion(reporte, accion, motivo, comentario);
      const notaGuardada =
        comentario.trim() ||
        (accion === 'Rechazado' ? `Rechazado: ${motivo}` : 'Validado por moderación (En revisión)');

      setReportes((previos) => {
        const existe = previos.some((p) => claveReporte(p) === clave);
        if (existe) {
          return previos.map((p) =>
            claveReporte(p) === clave
              ? { ...p, ...actualizado, ultima_nota: notaGuardada }
              : p
          );
        }
        return [{ ...reporte, ...actualizado, ultima_nota: notaGuardada }, ...previos];
      });

      setMensajeOk(`Folio ${reporte.folio} actualizado como "${actualizado.estado}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar el dictamen.');
    } finally {
      setProcesandoClave(null);
    }
  };

  const handleAvance = async (reporte: ReporteModeracion) => {
    const clave = claveReporte(reporte);
    const siguienteEstado = estadoAvancePorClave[clave] || 'Asignado';
    const comentario = comentariosPorClave[clave] || '';

    if (!comentario.trim()) {
      setError(`Agrega una nota breve de avance para el folio ${reporte.folio}.`);
      return;
    }

    setProcesandoClave(clave);
    setError(null);
    setMensajeOk(null);
    try {
      const actualizado = await enviarAvanceReparacion(reporte, siguienteEstado, comentario);
      setReportes((previos) =>
        previos.map((p) =>
          claveReporte(p) === clave
            ? { ...p, ...actualizado, ultima_nota: comentario.trim() }
            : p
        )
      );
      setMensajeOk(`Avance registrado para ${reporte.folio} (${actualizado.estado}).`);
      setComentariosPorClave((prev) => ({ ...prev, [clave]: '' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el avance.');
    } finally {
      setProcesandoClave(null);
    }
  };

  const handleCambioEstadoSeguimiento = async (reporte: ReporteModeracion) => {
    const clave = claveReporte(reporte);
    const opciones =
      reporte.kind === 'pavimento'
        ? ESTADOS_SEGUIMIENTO_PAVIMENTO
        : ESTADOS_SEGUIMIENTO_ENCHARCAMIENTO;
    const estadoElegido =
      estadoSeguimientoPorClave[clave] ||
      (opciones.includes(reporte.estado) ? reporte.estado : opciones[0]);
    const comentario = comentariosPorClave[clave] || '';

    setProcesandoClave(clave);
    setError(null);
    setMensajeOk(null);
    try {
      const actualizado = await enviarCambioEstadoSeguimiento(reporte, estadoElegido, comentario);
      setReportes((previos) =>
        previos.map((p) =>
          claveReporte(p) === clave
            ? {
                ...p,
                ...actualizado,
                ultima_nota: comentario.trim() || p.ultima_nota,
              }
            : p
        )
      );
      setMensajeOk(`Estado de ${reporte.folio} actualizado a "${actualizado.estado}".`);
      setComentariosPorClave((prev) => ({ ...prev, [clave]: '' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el estado.');
    } finally {
      setProcesandoClave(null);
    }
  };

  return (
    <section aria-labelledby="mod-heading">
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <p
          className="sans"
          style={{
            color: '#9c4221',
            fontWeight: 700,
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
          }}
        >
          PANEL DE MODERACIÓN CIUDADANA
        </p>
        <h1 id="mod-heading">Gestión y Seguimiento de Reportes</h1>
        <p style={{ maxWidth: '680px', margin: '0.4rem auto 0' }}>
          Valida o rechaza reportes recién recibidos, registra avances de reparación en vialidades y
          consulta o modifica el estado en seguimiento.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Apartados de moderación"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'validar'}
          className={`btn sm ${seccion === 'validar' ? '' : 'secondary'}`}
          onClick={() => setSeccion('validar')}
        >
          1. Validar / Rechazar ({pendientesValidacion.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'avances'}
          className={`btn sm ${seccion === 'avances' ? '' : 'secondary'}`}
          onClick={() => setSeccion('avances')}
        >
          2. Avances de reparación ({enProcesoReparacion.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seccion === 'seguimiento'}
          className={`btn sm ${seccion === 'seguimiento' ? '' : 'secondary'}`}
          onClick={() => setSeccion('seguimiento')}
        >
          3. Reportes en seguimiento ({reportes.length})
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {mensajeOk && (
        <div
          role="status"
          style={{
            background: '#dcfce7',
            color: '#166534',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          {mensajeOk}
        </div>
      )}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando reportes...</p>
      ) : (
        <>
          {seccion === 'validar' && (
            <div role="tabpanel" aria-label="Validar o rechazar reportes">
              <h2>Reportes pendientes de validación ({pendientesValidacion.length})</h2>
              {pendientesValidacion.length === 0 ? (
                <p
                  style={{
                    padding: '1.5rem',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #d6d3c9',
                  }}
                >
                  No hay reportes nuevos en estado <b>Recibido</b> pendientes por validar.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem', marginTop: '0.75rem' }}>
                  {pendientesValidacion.map((rep) => {
                    const clave = claveReporte(rep);
                    const posiblesDuplicados = reportes.filter((otro) => {
                      if (otro.id === rep.id && otro.kind === rep.kind) return false;
                      if (otro.kind !== rep.kind) return false;
                      if (['rechazado', 'descartado'].includes(otro.estado.toLowerCase())) {
                        return false;
                      }

                      const dist = calcularDistanciaMetros(
                        rep.latitud,
                        rep.longitud,
                        otro.latitud,
                        otro.longitud
                      );
                      const umbral = rep.kind === 'pavimento' ? 30 : 50;
                      if (dist !== null && dist <= umbral) return true;

                      return (
                        rep.colonia_id === otro.colonia_id &&
                        rep.calle.trim().toLowerCase() === otro.calle.trim().toLowerCase()
                      );
                    });

                    return (
                      <article
                        key={clave}
                        style={{
                          background: '#fff',
                          border: '1px solid #d6d3c9',
                          borderRadius: '8px',
                          padding: '1rem 1.25rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <strong>
                            {rep.folio} · {rep.calle}
                          </strong>
                          <span className="sans">
                            Colonia: <b>{rep.colonia_nombre || 'Sin colonia'}</b> · Estado:{' '}
                            <b>{rep.estado}</b>
                          </span>
                        </div>

                        {posiblesDuplicados.length > 0 && (
                          <div
                            role="status"
                            style={{
                              marginTop: '0.6rem',
                              padding: '0.5rem 0.75rem',
                              background: '#fef3c7',
                              border: '1px solid #f59e0b',
                              borderRadius: '6px',
                              color: '#92400e',
                              fontSize: '0.88rem',
                            }}
                          >
                            ⚠️ <b>Posible duplicado:</b> coincide con{' '}
                            {posiblesDuplicados.map((d) => `${d.folio} (${d.estado})`).join(', ')}.
                          </div>
                        )}

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '0.75rem',
                            marginTop: '0.75rem',
                            alignItems: 'end',
                          }}
                        >
                          <div>
                            <label
                              className="sans"
                              htmlFor={`motivo-${clave}`}
                              style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              Motivo (en caso de rechazo)
                            </label>
                            <select
                              id={`motivo-${clave}`}
                              value={motivosPorClave[clave] || MOTIVOS_RECHAZO[0]}
                              onChange={(e) =>
                                setMotivosPorClave((prev) => ({
                                  ...prev,
                                  [clave]: e.target.value,
                                }))
                              }
                              style={{ width: '100%', padding: '0.45rem' }}
                            >
                              {MOTIVOS_RECHAZO.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              className="sans"
                              htmlFor={`coment-val-${clave}`}
                              style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              Observación pública (opcional)
                            </label>
                            <input
                              id={`coment-val-${clave}`}
                              type="text"
                              placeholder="Ej. Verificado en cruce vial"
                              value={comentariosPorClave[clave] || ''}
                              onChange={(e) =>
                                setComentariosPorClave((prev) => ({
                                  ...prev,
                                  [clave]: e.target.value,
                                }))
                              }
                              style={{ width: '100%', padding: '0.45rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn sm"
                              disabled={procesandoClave === clave}
                              onClick={() => handleDictamen(rep, 'En revisión')}
                            >
                              Validar
                            </button>
                            <button
                              type="button"
                              className="btn sm secondary"
                              disabled={procesandoClave === clave}
                              onClick={() => handleDictamen(rep, 'Rechazado')}
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {seccion === 'avances' && (
            <div role="tabpanel" aria-label="Registrar avances de reparación">
              <h2>Registrar avances de reparación ({enProcesoReparacion.length})</h2>
              {enProcesoReparacion.length === 0 ? (
                <p
                  style={{
                    padding: '1.5rem',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #d6d3c9',
                  }}
                >
                  No hay reportes de pavimento en revisión o asignados en este momento.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem', marginTop: '0.75rem' }}>
                  {enProcesoReparacion.map((rep) => {
                    const clave = claveReporte(rep);
                    return (
                      <article
                        key={clave}
                        style={{
                          background: '#fff',
                          border: '1px solid #d6d3c9',
                          borderRadius: '8px',
                          padding: '1rem 1.25rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <strong>
                            {rep.folio} · {rep.calle} ({rep.colonia_nombre || 'Juárez'})
                          </strong>
                          <span className="sans">
                            Estado actual: <b>{rep.estado}</b>
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '0.75rem',
                            marginTop: '0.75rem',
                            alignItems: 'end',
                          }}
                        >
                          <div>
                            <label
                              className="sans"
                              htmlFor={`estado-${clave}`}
                              style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              Nuevo estado operativo
                            </label>
                            <select
                              id={`estado-${clave}`}
                              value={estadoAvancePorClave[clave] || 'Asignado'}
                              onChange={(e) =>
                                setEstadoAvancePorClave((prev) => ({
                                  ...prev,
                                  [clave]: e.target.value,
                                }))
                              }
                              style={{ width: '100%', padding: '0.45rem' }}
                            >
                              {ESTADOS_AVANCE.map((est) => (
                                <option key={est} value={est}>
                                  {est}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              className="sans"
                              htmlFor={`nota-${clave}`}
                              style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                marginBottom: '0.25rem',
                              }}
                            >
                              Nota de avance de reparación
                            </label>
                            <input
                              id={`nota-${clave}`}
                              type="text"
                              placeholder="Ej. Cuadrilla asignada / Bacheo asfáltico concluido"
                              value={comentariosPorClave[clave] || ''}
                              onChange={(e) =>
                                setComentariosPorClave((prev) => ({
                                  ...prev,
                                  [clave]: e.target.value,
                                }))
                              }
                              style={{ width: '100%', padding: '0.45rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn sm"
                              disabled={procesandoClave === clave}
                              onClick={() => handleAvance(rep)}
                            >
                              Guardar avance
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {seccion === 'seguimiento' && (
            <div role="tabpanel" aria-label="Consultar estado de reportes en seguimiento">
              <h2>Estado de reportes en seguimiento</h2>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  background: '#fff',
                  padding: '0.9rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #d6d3c9',
                  margin: '0.75rem 0 1rem',
                }}
              >
                <input
                  type="text"
                  aria-label="Buscar por folio, calle o colonia"
                  placeholder="Buscar folio, calle o colonia..."
                  value={busquedaFolio}
                  onChange={(e) => setBusquedaFolio(e.target.value)}
                  style={{ flex: '1 1 240px', padding: '0.45rem' }}
                />
                <select
                  aria-label="Filtrar por estado"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  style={{ padding: '0.45rem' }}
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="Recibido">Recibido</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Asignado">Asignado</option>
                  <option value="Reparado">Reparado</option>
                  <option value="Rechazado">Rechazado</option>
                  <option value="Activo">Activo (Encharcamiento)</option>
                  <option value="Resuelto">Resuelto (Encharcamiento)</option>
                  <option value="Descartado">Descartado (Encharcamiento)</option>
                </select>
              </div>

              {reportesSeguimiento.length === 0 ? (
                <p
                  style={{
                    padding: '1.5rem',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #d6d3c9',
                  }}
                >
                  No se encontraron reportes con los filtros seleccionados.
                </p>
              ) : (
                <div
                  style={{
                    overflowX: 'auto',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #d6d3c9',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #d6d3c9', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem' }}>Folio</th>
                        <th style={{ padding: '0.75rem' }}>Tipo</th>
                        <th style={{ padding: '0.75rem' }}>Ubicación / Colonia</th>
                        <th style={{ padding: '0.75rem' }}>Estado</th>
                        <th style={{ padding: '0.75rem' }}>Confirmaciones</th>
                        <th style={{ padding: '0.75rem' }}>Última nota / seguimiento</th>
                        <th style={{ padding: '0.75rem' }}>Modificar estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportesSeguimiento.map((rep) => {
                        const clave = claveReporte(rep);
                        const opcionesEstado =
                          rep.kind === 'pavimento'
                            ? ESTADOS_SEGUIMIENTO_PAVIMENTO
                            : ESTADOS_SEGUIMIENTO_ENCHARCAMIENTO;
                        const valorSelect =
                          estadoSeguimientoPorClave[clave] ||
                          (opcionesEstado.includes(rep.estado) ? rep.estado : opcionesEstado[0]);

                        return (
                          <tr key={clave} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{rep.folio}</td>
                            <td style={{ padding: '0.75rem' }}>{rep.kind}</td>
                            <td style={{ padding: '0.75rem' }}>
                              {rep.calle} ·{' '}
                              <span className="sans">{rep.colonia_nombre || 'Juárez'}</span>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <b>{rep.estado}</b>
                            </td>
                            <td style={{ padding: '0.75rem' }}>{rep.confirmaciones ?? 0}</td>
                            <td style={{ padding: '0.75rem' }}>
                              {rep.ultima_nota || 'Sin observaciones registradas'}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.4rem',
                                  alignItems: 'center',
                                }}
                              >
                                <select
                                  aria-label={`Estado de ${rep.folio}`}
                                  value={valorSelect}
                                  disabled={procesandoClave === clave}
                                  onChange={(e) =>
                                    setEstadoSeguimientoPorClave((prev) => ({
                                      ...prev,
                                      [clave]: e.target.value,
                                    }))
                                  }
                                  style={{ padding: '0.35rem' }}
                                >
                                  {opcionesEstado.map((est) => (
                                    <option key={est} value={est}>
                                      {est}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  aria-label={`Nota de seguimiento para ${rep.folio}`}
                                  placeholder="Nota opcional..."
                                  value={comentariosPorClave[clave] || ''}
                                  disabled={procesandoClave === clave}
                                  onChange={(e) =>
                                    setComentariosPorClave((prev) => ({
                                      ...prev,
                                      [clave]: e.target.value,
                                    }))
                                  }
                                  style={{ width: '140px', padding: '0.35rem' }}
                                />
                                <button
                                  type="button"
                                  className="btn sm"
                                  disabled={procesandoClave === clave}
                                  onClick={() => handleCambioEstadoSeguimiento(rep)}
                                >
                                  Guardar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};