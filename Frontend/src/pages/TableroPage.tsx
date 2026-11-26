import React, { useEffect, useMemo, useState } from 'react';

interface ResumenApi {
  total_baches: number;
  total_encharcamientos: number;
  baches_riesgo_alto: number;
  encharcamientos_riesgo_alto: number;
  total_confirmaciones: number;
}

interface ReporteItemApi {
  id: number;
  kind: string;
  folio: string;
  colonia_nombre?: string;
  calle: string;
  estado: string;
  severidad?: string | null;
  confirmaciones: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const TableroPage: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenApi | null>(null);
  const [reportes, setReportes] = useState<ReporteItemApi[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarTablero = async () => {
      setCargando(true);
      setError(null);
      try {
        const [resResumen, resReportes] = await Promise.all([
          fetch(`${API_BASE}/api/resumen`),
          fetch(`${API_BASE}/api/reportes?page=1&limit=100`),
        ]);
        if (!resResumen.ok || !resReportes.ok) {
          throw new Error('No se pudieron cargar los indicadores del tablero.');
        }
        const dataResumen: ResumenApi = await resResumen.json();
        const dataReportes = await resReportes.json();
        setResumen(dataResumen);
        setReportes(Array.isArray(dataReportes) ? dataReportes : dataReportes.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de red al consultar indicadores.');
      } finally {
        setCargando(false);
      }
    };

    cargarTablero();
  }, []);

  const conteoPorEstado = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const r of reportes) {
      mapa[r.estado] = (mapa[r.estado] || 0) + 1;
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [reportes]);

  const topColonias = useMemo(() => {
    const mapa: Record<string, { total: number; confirmaciones: number }> = {};
    for (const r of reportes) {
      const col = r.colonia_nombre || 'Sin colonia';
      if (!mapa[col]) mapa[col] = { total: 0, confirmaciones: 0 };
      mapa[col].total += 1;
      mapa[col].confirmaciones += r.confirmaciones || 0;
    }
    return Object.entries(mapa)
      .sort((a, b) => b[1].total - a[1].total || b[1].confirmaciones - a[1].confirmaciones)
      .slice(0, 10);
  }, [reportes]);

  return (
    <section aria-labelledby="tablero-heading">
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
          INDICADORES Y ANALÍTICA OPERATIVA
        </p>
        <h1 id="tablero-heading">Tablero Ejecutivo de Ciudad Juárez</h1>
        <p style={{ maxWidth: '680px', margin: '0.4rem auto 0' }}>
          Panorama general de reportes ciudadanos, distribución por estado de atención y colonias
          con mayor incidencia (sin exposición de datos personales).
        </p>
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

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando métricas...</p>
      ) : (
        <>
          {resumen && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.9rem',
                marginBottom: '1.5rem',
              }}
            >
              <article
                style={{
                  background: '#fff',
                  border: '1px solid #d6d3c9',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <span className="sans" style={{ fontSize: '0.85rem' }}>
                  Total baches registrados
                </span>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>
                  {resumen.total_baches}
                </p>
                <small className="sans">Riesgo alto: {resumen.baches_riesgo_alto}</small>
              </article>

              <article
                style={{
                  background: '#fff',
                  border: '1px solid #d6d3c9',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <span className="sans" style={{ fontSize: '0.85rem' }}>
                  Total encharcamientos
                </span>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>
                  {resumen.total_encharcamientos}
                </p>
                <small className="sans">Riesgo alto: {resumen.encharcamientos_riesgo_alto}</small>
              </article>

              <article
                style={{
                  background: '#fff',
                  border: '1px solid #d6d3c9',
                  borderRadius: '8px',
                  padding: '1rem',
                }}
              >
                <span className="sans" style={{ fontSize: '0.85rem' }}>
                  Confirmaciones ciudadanas
                </span>
                <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0' }}>
                  {resumen.total_confirmaciones}
                </p>
                <small className="sans">Validación comunitaria acumulada</small>
              </article>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '1px solid #d6d3c9',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
              }}
            >
              <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Distribución por estado operativo
              </h2>
              {conteoPorEstado.length === 0 ? (
                <p>Sin reportes activos para agrupar.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #d6d3c9', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Estado</th>
                      <th style={{ padding: '0.5rem' }}>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conteoPorEstado.map(([estado, total]) => (
                      <tr key={estado} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{estado}</td>
                        <td style={{ padding: '0.5rem' }}>{total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #d6d3c9',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
              }}
            >
              <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Top 10 colonias con mayor incidencia
              </h2>
              {topColonias.length === 0 ? (
                <p>Sin datos por colonia disponibles.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #d6d3c9', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Colonia</th>
                      <th style={{ padding: '0.5rem' }}>Reportes</th>
                      <th style={{ padding: '0.5rem' }}>Confirmaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topColonias.map(([colonia, datos]) => (
                      <tr key={colonia} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 600 }}>{colonia}</td>
                        <td style={{ padding: '0.5rem' }}>{datos.total}</td>
                        <td style={{ padding: '0.5rem' }}>{datos.confirmaciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};