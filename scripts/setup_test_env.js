const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const TARGET_DIR = path.join(__dirname, '../dist-test');
const ENV_FILE = path.join(__dirname, '../src-tauri/.env.local');

console.log('🚀 Setting up Local Pro Module Test Environment...');

// 1. Generate Development Keys
console.log('\n🔑 Generating Dev Keys...');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Extract raw public key bytes for the app (skip PEM header/footer)
// Ed25519 SPKI DER structure is surprisingly complex to parse manually in JS without deps.
// So we'll use a trick: the last 32 bytes of the SPKI buffer are the key for Ed25519.
const pubKeyDer = crypto.createPublicKey(publicKey).export({ format: 'der', type: 'spki' });
const rawPubKey = pubKeyDer.subarray(pubKeyDer.length - 32);
const pubKeyBase64 = rawPubKey.toString('base64');
const symmetricKey = crypto.randomBytes(32);
const symmetricKeyBase64 = symmetricKey.toString('base64');

console.log('✅ Keys generated.');

// 2. Build ixos-pro
console.log('\n🛠️  Building ixos-pro (release)...');
try {
    execSync('cargo build -p ixos-pro --release', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (e) {
    console.error('Build failed.');
    process.exit(1);
}

// 3. Encrypt and "Upload" to dist-test
console.log('\n📦 Encrypting and Staging module...');
// Set environment variables for the upload script
process.env.IXOS_PRO_SIGNING_KEY = privateKey;
process.env.IXOS_PRO_SYMMETRIC_KEY = symmetricKeyBase64;

// Determine platform folder (mirroring pro_loader.rs logic logic roughly)
const platform = process.platform === 'win32' ? 'windows-x86_64' :
    process.platform === 'darwin' ? 'macos-aarch64' : 'linux-x86_64'; // simplified assumption

// Note: real script uses exact rust logic, but for local test on same machine it matches.

const version = "0.1.0"; // Placeholder version
const stagingDir = path.join(TARGET_DIR, 'modules/pro', `v${version}`, platform);
fs.mkdirSync(stagingDir, { recursive: true });

// Run upload script
try {
    execSync(`node scripts/upload-pro-module.js --input target/release --out-dir "${stagingDir}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
    });
} catch (e) {
    console.error('Packaging failed.');
    process.exit(1);
}

// Create fake envelope (since loader expects one, though we provided dev key env var to bypass it usually, 
// strictly speaking the loader code I saw downloads it if IXOS_PRO_DEV_SYMMETRIC_KEY is NOT set.
// If we set that env var, we don't need the envelope.
// Let's rely on setting the env var for simplicity.)

// 4. Update .env.local
console.log('\n📝 Updating src-tauri/.env.local...');

let envContent = '';
if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf8');
}

function updateEnv(key, val) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${val}"`);
    } else {
        envContent += `\n${key}="${val}"`;
    }
}

const localUrl = 'http://localhost:8080';

updateEnv('IXOS_PRO_MODULE_PUBKEY', pubKeyBase64);
updateEnv('IXOS_PRO_MODULE_BASE_URL', localUrl);
updateEnv('IXOS_PRO_DEV_SYMMETRIC_KEY', symmetricKeyBase64); // Bypass envelope decryption
updateEnv('IXOS_PRO_MODULE_VERSION', version);

fs.writeFileSync(ENV_FILE, envContent);

console.log('✅ .env.local updated.');

// 5. Serve
console.log('\n🎉 Setup Complete!');
console.log('\nTo run the tests:');
console.log('1. Start the file server in a separate terminal:');
console.log(`   npx http-server "${TARGET_DIR}" -p 8080 --cors`);
console.log('2. Restart your Tauri app (npm run tauri dev)');
console.log('\nThe app will download the module from http://localhost:8080');
