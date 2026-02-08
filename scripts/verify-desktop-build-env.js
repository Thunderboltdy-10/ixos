const required = [
  'VITE_API_URL',
  'VITE_CLERK_PUBLISHABLE_KEY',
  'IXOS_JWT_PUBLIC_KEY',
];

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
