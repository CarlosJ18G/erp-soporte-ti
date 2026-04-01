import { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname;
  const techToken = localStorage.getItem('token');
  const clientToken = localStorage.getItem('clientToken');

  // En rutas cliente se prioriza token de cliente.
  if (path.startsWith('/client-')) {
    return clientToken || techToken;
  }

  return techToken || clientToken;
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string | undefined>;
}

/**
 * Wrapper central para todas las llamadas a la API REST.
 * Adjunta automáticamente el token JWT y maneja errores globales.
 */
async function request<T>(
  endpoint: string,
  { params, ...options }: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const url = new URL(`${API_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    });
  }

  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url.toString(), { ...options, headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. ¿Está el backend corriendo?', 0);
  }

  // Verificar que la respuesta sea JSON antes de parsear
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(`Error del servidor (${res.status}). Respuesta inesperada.`, res.status);
  }

  const json: ApiResponse<T> = await res.json();

  if (!res.ok) {
    const message = json.message || `Error ${res.status}`;
    throw new ApiError(message, res.status, json.errors);
  }

  return json;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Métodos HTTP ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method:  'POST',
      body:    JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method:  'PUT',
      body:    JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method:  'PATCH',
      body:    JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
