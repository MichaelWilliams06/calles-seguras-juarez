import React, { useEffect, useState } from 'react';

interface UsuarioAdminItem {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ROLES_DISPONIBLES = [
  'Ciudadano',
  'Moderador',
  'Coordinador',
  'Enlace_Municipal',
  'Administrador',
];

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('csj_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const UsuariosAdminPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdminItem[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.detail === 'string' ? err.detail : 'No se pudo cargar la lista de usuarios.'
        );
      }
      const data: UsuarioAdminItem[] = await res.json();
      setUsuarios(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red al consultar usuarios.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const actualizarUsuario = async (
    usuario: UsuarioAdminItem,
    cambios: { rol?: string; activo?: boolean }
  ) => {
    setProcesandoId(usuario.id_usuario);
    setError(null);
    setMensajeOk(null);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${usuario.id_usuario}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(cambios),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.detail === 'string' ? err.detail : 'No se pudo actualizar el usuario.'
        );
      }
      const actualizado: UsuarioAdminItem = await res.json();
      setUsuarios((prev) =>
        prev.map((u) => (u.id_usuario === actualizado.id_usuario ? actualizado : u))
      );
      setMensajeOk(`Usuario "${actualizado.nombre}" actualizado.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar el usuario.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <section aria-labelledby="usuarios-heading">
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
          ADMINISTRACIÓN DE USUARIOS
        </p>
        <h1 id="usuarios-heading">Usuarios y Roles</h1>
        <p style={{ maxWidth: '640px', margin: '0.4rem auto 0' }}>
          Consulta las cuentas registradas, asigna el rol correspondiente y activa o desactiva
          el acceso de cada usuario.
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

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p
          style={{
            padding: '1.5rem',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #d6d3c9',
          }}
        >
          No hay usuarios registrados para mostrar.
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
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem' }}>Correo</th>
                <th style={{ padding: '0.75rem' }}>Estado</th>
                <th style={{ padding: '0.75rem' }}>Cambiar rol</th>
                <th style={{ padding: '0.75rem' }}>Acceso</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{u.id_usuario}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.nombre}</td>
                  <td style={{ padding: '0.75rem' }}>{u.correo}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <b>{u.activo ? 'Activo' : 'Inactivo'}</b>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <select
                      aria-label={`Cambiar rol de ${u.nombre}`}
                      value={u.rol}
                      disabled={procesandoId === u.id_usuario}
                      onChange={(e) => actualizarUsuario(u, { rol: e.target.value })}
                      style={{ padding: '0.35rem' }}
                    >
                      {ROLES_DISPONIBLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      className={`btn sm ${u.activo ? 'secondary' : ''}`}
                      disabled={procesandoId === u.id_usuario}
                      onClick={() => actualizarUsuario(u, { activo: !u.activo })}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
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