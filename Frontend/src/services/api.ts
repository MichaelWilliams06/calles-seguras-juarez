import type { Colonia, ReporteItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface UsuarioAuth {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

export interface LoginRespuesta {
  access_token: string;
  token_type: string;
  usuario: UsuarioAuth;
}

export interface ResumenIndicadores {
  total_baches: number;
  total_encharcamientos: number;
  baches_riesgo_alto: number;
  encharcamientos_riesgo_alto: number;
  total_confirmaciones: number;
}

export interface ClimaJuarez {
  ciudad: string;
  temperatura_c: number | null;
  precipitacion_mm: number | null;
  alerta_encharcamiento: boolean;
  fuente: string;
  disponible: boolean;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('csj_token');
  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error en el servidor' }));
    const detail = err?.detail;
    const mensaje =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(' | ')
          : err?.message || `Error ${res.status}`;
    throw new Error(mensaje);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  // Autenticación
  login: (correo: string, contrasena: string) =>
    request<LoginRespuesta>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    }),
  registro: (nombre: string, correo: string, contrasena: string) =>
    request<UsuarioAuth>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nombre, correo, contrasena }),
    }),
  me: () => request<UsuarioAuth>('/auth/me'),

  // Colonias y reportes
  getColonias: (q?: string) => {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    return request<Colonia[]>(`/colonias${qs}`);
  },
  crearColonia: (payload: { nombre: string; id_sector: number; activa?: boolean }) =>
    request<Colonia>('/colonias', { method: 'POST', body: JSON.stringify(payload) }),
  getReportesActivos: (params: URLSearchParams) =>
    request<{ items: ReporteItem[]; total: number }>(`/reportes?${params.toString()}`),
  getReporteDetalle: (kind: 'pavimento' | 'encharcamiento', id: number) =>
    request<ReporteItem>(`/reportes/${kind}/${id}`),
  verificarDuplicados: (lat: number, lng: number, kind: 'pavimento' | 'encharcamiento') =>
    request<ReporteItem[]>(`/reportes/cercanos?lat=${lat}&lng=${lng}&kind=${kind}`),
  crearBache: (payload: Record<string, unknown>) =>
    request<ReporteItem>('/baches', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarBache: (id: number, payload: Record<string, unknown>) =>
    request<ReporteItem>(`/baches/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  eliminarBache: (id: number) =>
    request<void>(`/baches/${id}`, { method: 'DELETE' }),
  crearEncharcamiento: (payload: Record<string, unknown>) =>
    request<ReporteItem>('/encharcamientos', { method: 'POST', body: JSON.stringify(payload) }),
  actualizarEncharcamiento: (id: number, payload: Record<string, unknown>) =>
    request<ReporteItem>(`/encharcamientos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  confirmarReporte: (kind: 'pavimento' | 'encharcamiento', id: number) =>
    request<void>(`/${kind === 'pavimento' ? 'baches' : 'encharcamientos'}/${id}/confirmar`, {
      method: 'POST',
    }),

  // Resumen y API externa
  getResumen: () => request<ResumenIndicadores>('/resumen'),
  getClimaJuarez: () => request<ClimaJuarez>('/externo/clima-juarez'),
};