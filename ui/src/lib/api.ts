export function getApiBase() {
  const base =
    (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';
  return base;
}

