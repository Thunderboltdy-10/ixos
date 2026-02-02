export function getApiBase() {
  const base =
    (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';
  console.log('[API] Using API base:', base);
  return base;
}

