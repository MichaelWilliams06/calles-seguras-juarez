 import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { InicioPage } from './pages/InicioPage';
import { ReportarPage } from './pages/ReportarPage';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { ModeracionPage } from './pages/ModeracionPage';
import { api, type UsuarioAuth } from './services/api';
import { MiZonaPage } from './pages/MiZonaPage';
import { ColoniasPage } from './pages/ColoniasPage';
import { TableroPage } from './pages/TableroPage';
import { UsuariosAdminPage } from './pages/UsuariosAdminPage';
import { MisReportesPage } from './pages/MisReportesPage';
import type { RolUsuario } from './types';
import './styles/global.css';

function leerRolInicial(): RolUsuario {
  const token = localStorage.getItem('csj_token');
  const rawUser = localStorage.getItem('csj_usuario');
  if (!token || !rawUser) return 'visitante';
  try {
    const parsed = JSON.parse(rawUser) as UsuarioAuth;
    return (parsed.rol as RolUsuario) || 'visitante';
  } catch {
    return 'visitante';
  }
}

const AppShell: React.FC = () => {
  const [rol, setRol] = useState<RolUsuario>(() => leerRolInicial());
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('csj_token');
    if (!token) return;

    api
      .me()
      .then((perfil) => {
        setRol(perfil.rol as RolUsuario);
        localStorage.setItem('csj_usuario', JSON.stringify(perfil));
      })
      .catch(() => {
        localStorage.removeItem('csj_token');
        localStorage.removeItem('csj_usuario');
        setRol('visitante');
      });
  }, []);

  const rolNormalizado = String(rol).toLowerCase();
  const esVisitante = rolNormalizado === 'visitante';
  const esAdministrador = rolNormalizado === 'administrador';
  const puedeModerar = ['moderador', 'coordinador', 'administrador'].includes(rolNormalizado);
  const puedeVerTablero = ['coordinador', 'administrador', 'enlace_municipal'].includes(
    rolNormalizado
  );
  const puedeReportar = rolNormalizado === 'ciudadano';

  const handleLogout = () => {
    localStorage.removeItem('csj_token');
    localStorage.removeItem('csj_usuario');
    setRol('visitante');
    navigate('/');
  };

  return (
    <>
      <Navbar rol={rol} onLogout={handleLogout} />
      <main id="app">
        <Routes>
          <Route path="/" element={<InicioPage />} />
          <Route path="/mi-zona" element={<MiZonaPage />} />

          {/* Mis reportes (Ciudadano) */}
          <Route
            path="/mis-reportes"
            element={
              rolNormalizado === 'ciudadano' ? <MisReportesPage /> : <Navigate to="/" replace />
            }
          />

          {/* Colonias */}
          <Route
            path="/colonias"
            element={
              puedeModerar ? (
                <ColoniasPage rol={rol} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Tablero ejecutivo */}
          <Route
            path="/tablero"
            element={
              puedeVerTablero ? (
                <TableroPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Usuarios y roles (exclusivo Administrador) */}
          <Route
            path="/usuarios"
            element={
              esAdministrador ? (
                <UsuariosAdminPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Apartados de moderación */}
          <Route
            path="/moderacion"
            element={
              puedeModerar ? (
                <ModeracionPage seccionInicial="validar" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/moderacion/avances"
            element={
              puedeModerar ? (
                <ModeracionPage seccionInicial="avances" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/moderacion/seguimiento"
            element={
              puedeModerar ? (
                <ModeracionPage seccionInicial="seguimiento" />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/reportar-bache"
            element={
              puedeReportar ? (
                <ReportarPage kind="pavimento" rol={rol} />
              ) : (
                <Navigate to={esVisitante ? '/login' : '/'} replace />
              )
            }
          />
          <Route
            path="/reportar-encharcamiento"
            element={
              puedeReportar ? (
                <ReportarPage kind="encharcamiento" rol={rol} />
              ) : (
                <Navigate to={esVisitante ? '/login' : '/'} replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              <LoginPage
                rolActual={rol}
                onLogin={(nuevoRol: RolUsuario) => {
                  setRol(nuevoRol);
                  navigate(
                    ['moderador', 'coordinador', 'administrador'].includes(
                      String(nuevoRol).toLowerCase()
                    )
                      ? '/moderacion'
                      : '/'
                  );
                }}
              />
            }
          />
          <Route
            path="/registro"
            element={
              <RegistroPage
                onRegistrado={(nuevoRol: RolUsuario) => {
                  setRol(nuevoRol);
                  navigate('/');
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer sans">
        Asociación Civil &ldquo;Calles Seguras Juárez&rdquo; — Plataforma ciudadana de baches y encharcamientos.
      </footer>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
};

export default App;