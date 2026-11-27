export const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function apiRequest(baseUrl, path, { token, ...options } = {}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
