import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  type ClimaJuarez,
  type ResumenIndicadores,
} from '../services/api';
import type { Colonia, ReporteItem, RolUsuario } from '../types';
import { ReporteTag } from '../components/ReporteTag';

interface Props {
  rol?: RolUsuario;
}

const ROLES_GESTION: RolUsuario[] = [
  'Moderador',
  'Coordinador',
  'Enlace_Municipal',
  'Administrador',
];

export const InicioPage: React.FC<Props> = ({ rol = 'visitante' }) => {
  const [items, setItems] = useState<ReporteItem[]>([]);
  const [colonias, setColonias] = useState<Colonia[]>([]);
  const [resumen, setResumen] = useState<ResumenIndicadores | null>(null);
  const [clima, setClima] = useState<ClimaJuarez | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [coloniaId, setColoniaId] = useState('todas');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const esRolGestion = ROLES_GESTION.includes(rol);

  const cargarResumenYClima = useCallback(() => {
    api.getResumen().then(setResumen).catch(() => {});
    api.getClimaJuarez().then(setClima).catch(() => {});
  }, []);

  const cargarReportes = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });
    if (q.trim()) params.set('q', q.trim());
    if (tipo !== 'todos') params.set('tipo', tipo);
    if (coloniaId !== 'todas') params.set('colonia_id', coloniaId);

    api
      .getReportesActivos(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, tipo, coloniaId, page]);

  useEffect(() => {
    api.getColonias().then(setColonias).catch(() => {});
    cargarResumenYClima();
  }, [cargarResumenYClima]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  const handleConfirmar = async (reporte: ReporteItem) => {
    const clave = `${reporte.kind}-${reporte.id}`;
    setConfirmandoId(clave);
    try {
      await api.confirmarReporte(reporte.kind, reporte.id);
      setItems((prev) =>
        prev.map((item) =>
          item.kind === reporte.kind && item.id === reporte.id
            ? { ...item, confirmaciones: item.confirmaciones + 1 }
            : item
        )
      );
      cargarResumenYClima();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el reporte.');
    } finally {
      setConfirmandoId(null);
    }
  };

  const handleCambiarEstadoBache = async (reporte: ReporteItem, nuevoEstado: string) => {
    if (reporte.kind !== 'pavimento') return;
    try {
      await api.actualizarBache(reporte.id, { estado: nuevoEstado });
      cargarReportes();
      cargarResumenYClima();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    }
  };

  const handleEliminarBache = async (reporte: ReporteItem) => {
    if (reporte.kind !== 'pavimento') return;
    try {
      await api.eliminarBache(reporte.id);
      cargarReportes();
      cargarResumenYClima();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el reporte.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section aria-labelledby="titulo-inicio">
      <p className="eyebrow">Calles Seguras Juárez</p>
      <h1 id="titulo-inicio">Reportes activos en la ciudad</h1>
      <p className="sub">
        Consulta baches, hundimientos, grietas, alcantarillas sin tapa y encharcamientos sin necesidad de cuenta.
      </p>

      {(resumen || clima) && (
        <div className="panel" style={{ marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}>
          {resumen && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <span><strong>Baches:</strong> {resumen.total_baches} (Riesgo alto: {resumen.baches_riesgo_alto})</span>
              <span><strong>Encharcamientos:</strong> {resumen.total_encharcamientos} (Riesgo alto: {resumen.encharcamientos_riesgo_alto})</span>
              <span><strong>Confirmaciones ciudadanas:</strong> {resumen.total_confirmaciones}</span>
            </div>
          )}
          {clima && (
            <div className="sans" style={{ fontSize: 13 }}>
              {clima.disponible ? (
                <>
                  <strong>Clima en {clima.ciudad} ({clima.fuente}):</strong>{' '}
                  {clima.temperatura_c !== null ? `${clima.temperatura_c} °C` : 'N/D'} · Precipitación:{' '}
                  {clima.precipitacion_mm !== null ? `${clima.precipitacion_mm} mm` : 'N/D'}
                  {clima.alerta_encharcamiento && (
                    <span className="err" style={{ marginLeft: 8 }}>
                      — Alerta activa por lluvia / posible encharcamiento
                    </span>
                  )}
                </>
              ) : (
                <span>Clima en {clima.ciudad}: servicio externo no disponible por el momento.</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="panel filters-grid">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-q">Buscar por calle o folio</label>
          <input
            id="filtro-q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Ej. BCH-2026 o Av. Tecnológico"
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-tipo">Tipo de reporte</label>
          <select
            id="filtro-tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setPage(1);
            }}
          >
            <option value="todos">Todos</option>
            <option value="pavimento">Daño en pavimento</option>
            <option value="encharcamiento">Encharcamiento</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="filtro-colonia">Colonia</label>
          <select
            id="filtro-colonia"
            value={coloniaId}
            onChange={(e) => {
              setColoniaId(e.target.value);
              setPage(1);
            }}
          >
            <option value="todas">Todas</option>
            {colonias
              .filter((c) => c.activa)
              .map((c) => (
                <option key={c.id_colonia} value={c.id_colonia}>
                  {c.nombre}
                </option>
              ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="empty" role="status">
          Cargando reportes…
        </div>
      )}

      {error && (
        <div className="panel" role="alert">
          <p className="err" style={{ marginTop: 0 }}>
            No se pudieron cargar los reportes: {error}
          </p>
          <button type="button" className="btn secondary sm" onClick={cargarReportes}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="empty">
          <p>No encontramos reportes con esos filtros.</p>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => {
              setQ('');
              setTipo('todos');
              setColoniaId('todas');
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <p className="sans" style={{ fontSize: 13 }}>
            Mostrando {items.length} de {total} resultados
          </p>
          <div className="wrap-table">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Folio</th>
                  <th>Calle</th>
                  <th>Colonia</th>
                  <th>Estado</th>
                  <th>Confirmaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const clave = `${r.kind}-${r.id}`;
                  return (
                    <tr key={clave}>
                      <td>{r.kind === 'pavimento' ? '🕳️ Pavimento' : '💧 Encharcamiento'}</td>
                      <td>{r.folio}</td>
                      <td>{r.calle}</td>
                      <td>{r.colonia_nombre}</td>
                      <td>
                        <ReporteTag estado={r.estado} />
                      </td>
                      <td>{r.confirmaciones}</td>
                      <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Link to={`/reporte/${r.kind}/${r.id}`}>Ver</Link>
                        <button
                          type="button"
                          className="btn secondary sm"
                          disabled={confirmandoId === clave}
                          onClick={() => handleConfirmar(r)}
                        >
                          {confirmandoId === clave ? 'Confirmando…' : 'Confirmar'}
                        </button>
                        {esRolGestion && r.kind === 'pavimento' && (
                          <>
                            <select
                              aria-label={`Cambiar estado de ${r.folio}`}
                              value={r.estado}
                              onChange={(e) => handleCambiarEstadoBache(r, e.target.value)}
                            >
                              <option value="Recibido">Recibido</option>
                              <option value="En revisión">En revisión</option>
                              <option value="En reparación">En reparación</option>
                              <option value="Reparado">Reparado</option>
                              <option value="Rechazado">Rechazado</option>
                            </select>
                            <button
                              type="button"
                              className="btn secondary sm"
                              onClick={() => handleEliminarBache(r)}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <button
              type="button"
              className="btn secondary sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="btn secondary sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
};