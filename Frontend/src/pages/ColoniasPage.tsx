import React, { useEffect, useMemo, useState } from 'react';
import type { RolUsuario } from '../types';

interface Props {
  rol: RolUsuario;
}

interface ColoniaApi {
  id_colonia: number;
  nombre: string;
  sector: string;
  activa: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SECTORES_JUAREZ = [
  { id: 1, nombre: 'Centro' },
  { id: 2, nombre: 'Norte' },
  { id: 3, nombre: 'Norponiente' },
  { id: 4, nombre: 'Suroriente' },
  { id: 5, nombre: 'Sur' },
  { id: 6, nombre: 'Poniente' },
];

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('csj_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const ColoniasPage: React.FC<Props> = ({ rol }) => {
  const [colonias, setColonias] = useState<ColoniaApi[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);

  // Filtros de consulta
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroSector, setFiltroSector] = useState<string>('Todos');

  // Formulario exclusivo Coordinador / Administrador
  const [nombreNueva, setNombreNueva] = useState<string>('');
  const [idSectorNuevo, setIdSectorNuevo] = useState<number>(1);
  const [guardando, setGuardando] = useState<boolean>(false);

  const rolNormalizado = String(rol).toLowerCase();
  const puedeCrearColonia = ['coordinador', 'administrador'].includes(rolNormalizado);

  const cargarColonias = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/colonias`);
      if (!res.ok) throw new Error('No se pudo cargar el catálogo de colonias.');
      const data: ColoniaApi[] = await res.json();
      setColonias(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red al consultar colonias.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarColonias();
  }, []);

  const sectoresDisponibles = useMemo(() => {
    const unicos = Array.from(new Set(colonias.map((c) => c.sector).filter(Boolean)));
    return unicos.sort();
  }, [colonias]);

  const coloniasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return colonias.filter((c) => {
      const coincideNombre = !q || c.nombre.toLowerCase().includes(q);
      const coincideSector = filtroSector === 'Todos' || c.sector === filtroSector;
      return coincideNombre && coincideSector;
    });
  }, [colonias, busqueda, filtroSector]);

  const handleCrearColonia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNueva.trim()) {
      setError('Ingresa el nombre de la colonia.');
      return;
    }

    setGuardando(true);
    setError(null);
    setMensajeOk(null);
    try {
      const res = await fetch(`${API_BASE}/api/colonias`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          nombre: nombreNueva.trim(),
          id_sector: idSectorNuevo,
          activa: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.detail === 'string' ? err.detail : 'No se pudo registrar la colonia.'
        );
      }
      const creada: ColoniaApi = await res.json();
      setColonias((prev) =>
        [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setNombreNueva('');
      setMensajeOk(`Colonia "${creada.nombre}" agregada correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la colonia.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section aria-labelledby="colonias-heading">
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
          CATÁLOGO TERRITORIAL DE CIUDAD JUÁREZ
        </p>
        <h1 id="colonias-heading">Colonias y Sectores</h1>
        <p style={{ maxWidth: '680px', margin: '0.4rem auto 0' }}>
          {puedeCrearColonia
            ? 'Consulta las colonias registradas por sector y agrega nuevas colonias al catálogo.'
            : 'Consulta de apoyo de colonias y sectores activos en Ciudad Juárez para validar ubicaciones de reportes.'}
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

      {/* Alta de colonia solo visible para Coordinador / Administrador */}
      {puedeCrearColonia && (
        <form
          onSubmit={handleCrearColonia}
          style={{
            background: '#fff',
            border: '1px solid #d6d3c9',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
            Registrar nueva colonia
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.75rem',
              alignItems: 'end',
            }}
          >
            <div>
              <label
                className="sans"
                htmlFor="nueva-colonia-nombre"
                style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}
              >
                Nombre de la colonia
              </label>
              <input
                id="nueva-colonia-nombre"
                type="text"
                placeholder="Ej. Praderas de los Oasis"
                value={nombreNueva}
                onChange={(e) => setNombreNueva(e.target.value)}
                style={{ width: '100%', padding: '0.45rem' }}
              />
            </div>

            <div>
              <label
                className="sans"
                htmlFor="nueva-colonia-sector"
                style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}
              >
                Sector
              </label>
              <select
                id="nueva-colonia-sector"
                value={idSectorNuevo}
                onChange={(e) => setIdSectorNuevo(Number(e.target.value))}
                style={{ width: '100%', padding: '0.45rem' }}
              >
                {SECTORES_JUAREZ.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn sm" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Agregar colonia'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtros de búsqueda para cualquier rol autorizado */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: '#fff',
          padding: '0.9rem 1rem',
          borderRadius: '8px',
          border: '1px solid #d6d3c9',
          marginBottom: '1rem',
        }}
      >
        <input
          type="text"
          aria-label="Buscar colonia por nombre"
          placeholder="Buscar colonia por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: '1 1 240px', padding: '0.45rem' }}
        />
        <select
          aria-label="Filtrar por sector"
          value={filtroSector}
          onChange={(e) => setFiltroSector(e.target.value)}
          style={{ padding: '0.45rem' }}
        >
          <option value="Todos">Todos los sectores</option>
          {sectoresDisponibles.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando colonias...</p>
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
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Colonia</th>
                <th style={{ padding: '0.75rem' }}>Sector</th>
                <th style={{ padding: '0.75rem' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {coloniasFiltradas.map((col) => (
                <tr key={col.id_colonia} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{col.id_colonia}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{col.nombre}</td>
                  <td style={{ padding: '0.75rem' }}>{col.sector || 'Sin sector'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <b>{col.activa ? 'Activa' : 'Inactiva'}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};