/** Prefix API calls with Vite's deployment base (e.g. `/mulin/`). */
export const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
