const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Anfrage fehlgeschlagen: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  list: <T>(resource: string) => request<T[]>(`/${resource}`),
  get: <T>(path: string) => request<T>(`/${path}`),
  create: <T>(resource: string, body: unknown) =>
    request<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(body) }),
  update: <T>(resource: string, id: string, body: unknown) =>
    request<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (resource: string, id: string) =>
    request<void>(`/${resource}/${id}`, { method: 'DELETE' }),
  put: <T>(path: string, body: unknown) =>
    request<T>(`/${path}`, { method: 'PUT', body: JSON.stringify(body) }),
};
