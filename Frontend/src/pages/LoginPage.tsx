import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type UsuarioAuth } from '../services/api';
import type { RolUsuario } from '../types';

interface Props {
  rolActual: RolUsuario;
  onLogin: (nuevoRol: RolUsuario, usuario?: UsuarioAuth) => void;
}

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!correo.trim() || !contrasena) {
      setError('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    setCargando(true);
    try {
      const resp = await api.login(correo.trim(), contrasena);
      localStorage.setItem('csj_token', resp.access_token);
      localStorage.setItem('csj_usuario', JSON.stringify(resp.usuario));
      onLogin(resp.usuario.rol as RolUsuario, resp.usuario);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-login">
      <p className="eyebrow">Acceso</p>
      <h1 id="titulo-login">Iniciar sesión</h1>
      <p className="sub">
        Ingresa tus credenciales para acceder a las herramientas según tu rol en la plataforma.
      </p>

      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 460 }} noValidate>
        {error && (
          <div role="alert" className="alert error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="login-correo">Correo electrónico</label>
          <input
            id="login-correo"
            type="email"
            autoComplete="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="nombre@ejemplo.mx"
            disabled={cargando}
          />
        </div>

        <div className="field">
          <label htmlFor="login-contrasena">Contraseña</label>
          <input
            id="login-contrasena"
            type="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="••••••••"
            disabled={cargando}
          />
        </div>

        <button type="submit" className="btn" disabled={cargando}>
          {cargando ? 'Iniciando sesión...' : 'Entrar'}
        </button>

        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          ¿Aún no tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </p>
      </form>
    </section>
  );
};