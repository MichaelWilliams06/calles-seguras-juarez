import React, { useEffect, useMemo, useState } from 'react';

interface ReporteItemApi {
  id: number;
  kind: string;
  folio: string;
  colonia_nombre?: string;
  calle: string;
  estado: string;
  severidad?: string | null;
  nivel_agua?: string | null;
  confirmaciones: number;
  fecha_creacion?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function claveFoliosUsuario(): string {
  try {
    const raw = localStorage.getItem('csj_usuario');
    if (raw) {
      const parsed = JSON.parse(raw) as { correo?: string; id_usuario?: number };
      const id = parsed.correo || parsed.id_usuario;
      if (id) return `csj_folios_${String(id).toLowerCase()}`;
    }
  } catch {
    // ignorar error de lectura
  }
  return 'csj_folios_ciudadano';
}

export function obtenerMisFolios(): string[] {
  try {
    const raw = localStorage.getItem(claveFoliosUsuario());
    if (!raw) return [];
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista.map((f) => String(f).toUpperCase().trim()) : [];
  } catch {
    return [];
  }
}

export function registrarMiFolio(folio: string): string[] {
  const limpio = folio.toUpperCase().trim();
  if (!limpio) return obtenerMisFolios();
  const actuales = obtenerMisFolios();
  if (!actuales.includes(limpio)) {
    const nuevos = [limpio, ...actuales];
    localStorage.setItem(claveFoliosUsuario(), JSON.stringify(nuevos));
    return nuevos;
  }
  return actuales;
}

function eliminarMiFolio(folio: string): string[] {
  const limpio = folio.toUpperCase().trim();
  const nuevos = obtenerMisFolios().filter((f) => f !== limpio);
  localStorage.setItem(claveFoliosUsuario(), JSON.stringify(nuevos));
  return nuevos;
}

export const MisReportesPage: React.FC = () => {
  const [folios, setFolios] = useState<string[]>(() => obtenerMisFolios());
  const [todosReportes, setTodosReportes] = useState<ReporteItemApi[]>([]);
  const [nuevoFolio, setNuevoFolio] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const cargarReportes = async () => {
      setCargando(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/reportes?page=1&limit=100`);
        if (!res.ok) {
          throw new Error('No se pudieron consultar los reportes del sistema.');
        }
        const data = await res.json();
        setTodosReportes(Array.isArray(data) ? data : data.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de red al cargar tus reportes.');
      } finally {
        setCargando(false);
      }
    };

    cargarReportes();
  }, []);

  const misReportes = useMemo(() => {
    const setFolios = new Set(folios);
    return todosReportes.filter((r) => setFolios.has(r.folio.toUpperCase()));
  }, [folios, todosReportes]);

  const foliosNoEncontrados = useMemo(() => {
    const encontrados = new Set(misReportes.map((r) => r.folio.toUpperCase()));
    return folios.filter((f) => !encontrados.has(f));
  }, [folios, misReportes]);

  const handleAgregarFolio = (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    const limpio = nuevoFolio.trim().toUpperCase();
    if (!limpio) return;
    const actualizados = registrarMiFolio(limpio);
    setFolios(actualizados);
    setNuevoFolio('');
    setAviso(`Folio ${limpio} agregado a tu lista de seguimiento.`);
  };

  const handleQuitarFolio = (folio: string) => {
    const actualizados = eliminarMiFolio(folio);
    setFolios(actualizados);
  };

  return (
    <section aria-labelledby="mis-reportes-heading">
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
          SEGUIMIENTO CIUDADANO
        </p>
        <h1 id="mis-reportes-heading">Mis reportes</h1>
        <p style={{ maxWidth: '640px', margin: '0.4rem auto 0' }}>
          Consulta el estado operativo y las confirmaciones comunitarias de los reportes que has
          registrado o agregado por folio.
        </p>
      </div>

      <form
        onSubmit={handleAgregarFolio}
        style={{
          display: 'flex',
          gap: '0.6rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          background: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #d6d3c9',
          marginBottom: '1.25rem',
        }}
      >
        <input
          type="text"
          aria-label="Agregar folio para seguimiento"
          placeholder="Ej. BCH-2026-000001 o ENC-2026-000001"
          value={nuevoFolio}
          onChange={(e) => setNuevoFolio(e.target.value)}
          style={{ minWidth: '260px', padding: '0.45rem 0.65rem' }}
        />
        <button type="submit" className="btn">
          Seguir folio
        </button>
      </form>

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

      {aviso && (
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
          {aviso}
        </div>
      )}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando tus reportes...</p>
      ) : misReportes.length === 0 ? (
        <div
          style={{
            padding: '1.5rem',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #d6d3c9',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0 }}>
            Aún no tienes reportes activos asociados en esta sesión. Registra un bache o
            encharcamiento, o ingresa tu folio arriba para darle seguimiento.
          </p>
        </div>
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
                <th style={{ padding: '0.75rem' }}>Calle</th>
                <th style={{ padding: '0.75rem' }}>Colonia</th>
                <th style={{ padding: '0.75rem' }}>Estado</th>
                <th style={{ padding: '0.75rem' }}>Confirmaciones</th>
                <th style={{ padding: '0.75rem' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {misReportes.map((r) => (
                <tr key={`${r.kind}-${r.id}`} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 700 }}>{r.folio}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {r.kind === 'pavimento' ? 'Pavimento' : 'Encharcamiento'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{r.calle}</td>
                  <td style={{ padding: '0.75rem' }}>{r.colonia_nombre || '—'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <b>{r.estado}</b>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{r.confirmaciones}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn sm secondary"
                      onClick={() => handleQuitarFolio(r.folio)}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {foliosNoEncontrados.length > 0 && (
        <p className="sans" style={{ marginTop: '0.9rem', fontSize: '0.88rem' }}>
          Folios guardados sin coincidencia activa (pueden estar rechazados, cerrados o no existir):{' '}
          <b>{foliosNoEncontrados.join(', ')}</b>
        </p>
      )}
    </section>
  );
};