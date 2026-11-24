import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { RolUsuario } from '../types';

interface Props {
  onRegistrado: (nuevoRol: RolUsuario) => void;
}

export const RegistroPage: React.FC<Props> = ({ onRegistrado }) => {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nombre.trim().length < 2) {
      setError('Ingresa tu nombre completo (mínimo 2 caracteres).');
      return;
    }
    if (!correo.trim()) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      await api.registro(nombre.trim(), correo.trim(), contrasena);
      const sesion = await api.login(correo.trim(), contrasena);
      localStorage.setItem('csj_token', sesion.access_token);
      localStorage.setItem('csj_usuario', JSON.stringify(sesion.usuario));
      onRegistrado(sesion.usuario.rol as RolUsuario);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-registro">
      <p className="eyebrow">Cuenta ciudadana</p>
      <h1 id="titulo-registro">Crear cuenta</h1>
      <p className="sub">
        Regístrate para dar seguimiento a tus reportes y confirmar incidencias en Ciudad Juárez.
      </p>

      <form onSubmit={handleSubmit} className="panel" style={{ maxWidth: 460 }} noValidate>
        {error && (
          <div role="alert" className="alert error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="reg-nombre">Nombre completo</label>
          <input
            id="reg-nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. María López"
            disabled={cargando}
          />
        </div>

        <div className="field">
          <label htmlFor="reg-correo">Correo electrónico</label>
          <input
            id="reg-correo"
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
          <label htmlFor="reg-pass">Contraseña</label>
          <input
            id="reg-pass"
            type="password"
            autoComplete="new-password"
            required
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            disabled={cargando}
          />
        </div>

        <div className="field">
          <label htmlFor="reg-confirmar">Confirmar contraseña</label>
          <input
            id="reg-confirmar"
            type="password"
            autoComplete="new-password"
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repite tu contraseña"
            disabled={cargando}
          />
        </div>

        <button type="submit" className="btn" disabled={cargando}>
          {cargando ? 'Creando cuenta...' : 'Registrarme'}
        </button>

        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </section>
  );
};