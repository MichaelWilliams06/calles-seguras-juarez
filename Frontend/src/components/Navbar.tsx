 import React from 'react';
import { NavLink } from 'react-router-dom';
import type { RolUsuario } from '../types';

interface Props {
  rol: RolUsuario;
  onLogout?: () => void;
}

const ETIQUETA_ROL: Record<string, string> = {
  visitante: 'Visitante',
  ciudadano: 'Ciudadano',
  moderador: 'Moderador',
  coordinador: 'Coordinador',
  enlace_municipal: 'Enlace Municipal',
  administrador: 'Administrador',
};

export const Navbar: React.FC<Props> = ({ rol, onLogout }) => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'on' : undefined;

  const rolNormalizado = String(rol || 'visitante').toLowerCase();
  const esVisitante = rolNormalizado === 'visitante';
  const esCiudadano = rolNormalizado === 'ciudadano';
  const esModerador = rolNormalizado === 'moderador';
  const esCoordinador = rolNormalizado === 'coordinador';
  const esAdministrador = rolNormalizado === 'administrador';
  const esEnlace = rolNormalizado === 'enlace_municipal';

  return (
    <header className="app">
      <div className="top">
        <span className="seal" aria-hidden="true">CSJ</span>
        <div className="brand">
          <b>Calles Seguras Juárez</b>
          <span>Baches y encharcamientos</span>
        </div>
        <div className="top-act">
          <span className="sans">Rol: {ETIQUETA_ROL[rolNormalizado] || rol}</span>
          {!esVisitante ? (
            <button
              type="button"
              className="btn sm secondary"
              style={{ color: '#f3efe2', borderColor: 'rgba(243, 239, 226, 0.45)' }}
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          ) : (
            <>
              <NavLink to="/login" className="btn sm">
                Iniciar sesión
              </NavLink>
              <NavLink
                to="/registro"
                className="btn sm secondary"
                style={{ color: '#f3efe2', borderColor: 'rgba(243, 239, 226, 0.45)' }}
              >
                Crear cuenta
              </NavLink>
            </>
          )}
        </div>
      </div>

      <nav className="main" aria-label="Navegación principal">
        <ul>
          <li><NavLink to="/" end className={linkClass}>Reportes activos</NavLink></li>
          <li><NavLink to="/mi-zona" className={linkClass}>¿Cómo está mi zona?</NavLink></li>

          {esModerador ? (
            <>
              <li><NavLink to="/colonias" className={linkClass}>Colonias</NavLink></li>
              <li><NavLink to="/moderacion" end className={linkClass}>Validar / Rechazar</NavLink></li>
              <li><NavLink to="/moderacion/avances" className={linkClass}>Avances de reparación</NavLink></li>
              <li><NavLink to="/moderacion/seguimiento" className={linkClass}>Reportes en seguimiento</NavLink></li>
            </>
          ) : (
            <>
              {esCiudadano && (
                <>
                  <li><NavLink to="/reportar-bache" className={linkClass}>Reportar bache</NavLink></li>
                  <li><NavLink to="/reportar-encharcamiento" className={linkClass}>Reportar encharcamiento</NavLink></li>
                  <li><NavLink to="/mis-reportes" className={linkClass}>Mis reportes</NavLink></li>
                </>
              )}

              {esCoordinador && (
                <>
                  <li><NavLink to="/moderacion" className={linkClass}>Moderación</NavLink></li>
                  <li><NavLink to="/tablero" className={linkClass}>Tablero</NavLink></li>
                  <li><NavLink to="/colonias" className={linkClass}>Colonias</NavLink></li>
                </>
              )}

              {esAdministrador && (
                <>
                  <li><NavLink to="/moderacion" className={linkClass}>Moderación</NavLink></li>
                  <li><NavLink to="/tablero" className={linkClass}>Tablero</NavLink></li>
                  <li><NavLink to="/colonias" className={linkClass}>Colonias</NavLink></li>
                  <li><NavLink to="/usuarios" className={linkClass}>Usuarios y roles</NavLink></li>
                </>
              )}

              {esEnlace && (
                <li><NavLink to="/tablero" className={linkClass}>Tablero</NavLink></li>
              )}
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};