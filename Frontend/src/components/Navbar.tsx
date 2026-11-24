import React from 'react';
import { NavLink } from 'react-router-dom';
import type { RolUsuario } from '../types';

interface Props {
  rol: RolUsuario;
  onLogout?: () => void;
}

const ETIQUETA_ROL: Record<RolUsuario, string> = {
  visitante: 'Visitante',
  Ciudadano: 'Ciudadano',
  Moderador: 'Moderador',
  Coordinador: 'Coordinador',
  Enlace_Municipal: 'Enlace Municipal',
  Administrador: 'Administrador',
};

export const Navbar: React.FC<Props> = ({ rol, onLogout }) => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'on' : undefined;

  return (
    <header className="app">
      <div className="top">
        <span className="seal" aria-hidden="true">CSJ</span>
        <div className="brand">
          <b>Calles Seguras Juárez</b>
          <span>Baches y encharcamientos</span>
        </div>
        <div className="top-act">
          <span className="sans">Rol: {ETIQUETA_ROL[rol]}</span>
          {rol !== 'visitante' ? (
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

          {(rol === 'visitante' || rol === 'Ciudadano') && (
            <>
              <li><NavLink to="/reportar-bache" className={linkClass}>Reportar bache</NavLink></li>
              <li><NavLink to="/reportar-encharcamiento" className={linkClass}>Reportar encharcamiento</NavLink></li>
            </>
          )}

          {rol === 'Ciudadano' && (
            <li><NavLink to="/mis-reportes" className={linkClass}>Mis reportes</NavLink></li>
          )}

          {(rol === 'Moderador' || rol === 'Coordinador' || rol === 'Administrador') && (
            <li><NavLink to="/moderacion" className={linkClass}>Moderación</NavLink></li>
          )}

          {(rol === 'Coordinador' || rol === 'Administrador') && (
            <>
              <li><NavLink to="/tablero" className={linkClass}>Tablero</NavLink></li>
              <li><NavLink to="/colonias" className={linkClass}>Colonias</NavLink></li>
            </>
          )}

          {rol === 'Enlace_Municipal' && (
            <li><NavLink to="/tablero" className={linkClass}>Tablero</NavLink></li>
          )}
        </ul>
      </nav>
    </header>
  );
};