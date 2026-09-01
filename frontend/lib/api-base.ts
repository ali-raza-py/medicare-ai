/**
 * Railway FastAPI origin for browser requests.
 *
 * NEXT_PUBLIC_API_BASE_URL is inlined at Vercel build time. If it is missing
 * in production, the client used to fall back to "" and POST to
 * same-origin /api/... on Vercel (404 "Not Found") instead of Railway.
 * Trailing slashes are stripped so the env value never produces
 * https://host.up.railway.app//api/...
 */
function normalizeApiBase(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

const fromEnv = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL);

export const API_BASE =
  fromEnv ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

export function isApiBaseConfigured(): boolean {
  return API_BASE.length > 0;
}

export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}
