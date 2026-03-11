const fs = require('fs');
const path = require('path');

const required = [
  'VITE_API_URL',
  'VITE_CLERK_PUBLISHABLE_KEY',
  'VITE_LEMONSQUEEZY_PRO_VARIANT_ID',
  'IXOS_JWT_PUBLIC_KEY',
];

function parseEnvFile(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip optional inline comment only for unquoted values.
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentIndex = value.indexOf(' #');
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value.replace(/\\n/g, '\n');
  }
  return out;
}

function hydrateFromEnvFiles() {
  const root = process.cwd();
  const candidates = [
    path.join(root, '.env'),
    path.join(root, '.env.local'),
    path.join(root, 'ixos-search', 'src-tauri', '.env'),
    path.join(root, 'ixos-search', 'src-tauri', '.env.local'),
    path.join(root, 'ixos-search', 'ui', '.env'),
    path.join(root, 'ixos-search', 'ui', '.env.local'),
  ];

  const merged = {};
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = parseEnvFile(fs.readFileSync(file, 'utf8'));
      Object.assign(merged, parsed);
    } catch (error) {
      console.warn(`[build:desktop] Could not read env file ${file}: ${String(error)}`);
    }
  }

  for (const [key, value] of Object.entries(merged)) {
    const existing = process.env[key];
    if (typeof existing === 'string' && existing.trim().length > 0) continue;
    process.env[key] = value;
  }
}

hydrateFromEnvFiles();

const missing = required.filter((key) => {
  const value = process.env[key];
  return typeof value !== 'string' || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error('[build:desktop] Missing required environment variables:');
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error('\nSet these vars in CI or your local shell before running a production desktop build.');
  process.exit(1);
}

console.log('[build:desktop] Required environment variables are present.');
