/**
 * FastAPI origin for browser requests.
 *
 * Local development always falls back to the backend on localhost. Vercel
 * should provide NEXT_PUBLIC_API_BASE_URL in its project environment when it
 * needs to call a deployed backend. Trailing slashes are stripped so the env
 * value never produces a double slash before /api/.
 */
function normalizeApiBase(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

const fromEnv = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE_URL);

export const API_BASE =
  fromEnv ||
  'http://localhost:8000';

export function isApiBaseConfigured(): boolean {
  return API_BASE.length > 0;
}

export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}
