const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003/api';

export async function api(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': localStorage.getItem('tenantId') || process.env.NEXT_PUBLIC_TENANT_ID || 'default',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
