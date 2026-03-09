export function getApiBase() {
  const env = (import.meta as any).env;
  const configured = env?.VITE_API_URL?.trim()?.replace(/\/$/, '');

  if (configured) {
    console.log('[API] Using API base:', configured);
    return configured;
  }

  if (env?.DEV) {
    const devBase = 'http://localhost:3000';
    console.warn('[API] VITE_API_URL missing; using development fallback:', devBase);
    return devBase;
  }

  // Production fallback to avoid release builds silently pointing to localhost.
  const prodBase = 'https://ixos.app';
  console.error('[API] VITE_API_URL missing in production build; falling back to:', prodBase);
  return prodBase;
}

