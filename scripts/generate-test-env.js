const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const OUT_DIR = path.join(__dirname, '..', 'dist-test');
const ARTIFACTS_DIR = path.join(OUT_DIR, 'modules', 'pro', 'v0.1.0'); // Matching pro_loader.rs structure
const UPLOAD_SCRIPT = path.join(__dirname, 'upload-pro-module.js');

// Helper to run commands
function run(cmd, env = {}) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
}

function generateKeys() {
    console.log('Generating keys...');

    // 1. Ed25519 Signing Keytype
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

    // Export keys to use in script/env
    const signingKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const verifyKeyPem = publicKey.export({ type: 'spki', format: 'pem' }); // Not directly used by env var format in pro_loader which expects 32 bytes raw usually? 
    // Wait, pro_loader.rs `decode_base64_or_hex` and `VerifyingKey::from_bytes`.
    // Node's export might give us the full PEM wrapping. 
    // Let's grab the raw bytes if possible, or easiest: use a known key pair for testing or just parse the PEM.
    // Actually, ed25519-dalek wants raw 32 bytes for the public key.
    // Node crypto doesn't easily give raw bytes from KeyObject without some work.
    // simpler: use a fixed seed or `crypto.createPrivateKey` ... 
    // Let's just generate random 32 bytes for private seed if we implement Ed25519 logic manually, 
    // BUT we are using node's crypto to sign.
    // We need the PUBLIC key in a format `pro_loader` accepts (base64 of 32 bytes).

    // Easier way: `generateKeyPairSync` gives us KeyObjects.
    // We can export the public key as DER (buffer) and slice the last 32 bytes for Ed25519 (usually).
    const pubDer = publicKey.export({ type: 'spki', format: 'der' });
    // Ed25519 SPKI DER header is 12 bytes: 30 2a 30 05 06 03 2b 65 70 03 21 00
    // The last 32 bytes are the public key.
    const rawPubKey = pubDer.subarray(pubDer.length - 32);
    const pubKeyB64 = rawPubKey.toString('base64');

    // 2. ChaCha20 Symmetric Key (32 bytes)
    const symmetricKey = crypto.randomBytes(32);
    const symmetricKeyB64 = symmetricKey.toString('base64');

    return { signingKeyPem, rawPubKey, pubKeyB64, symmetricKeyB64 };
}

function getPlatformTag() {
    const os = process.platform;
    const arch = process.arch;

    if (os === 'win32' && arch === 'x64') return 'windows-x86_64';
    if (os === 'darwin' && arch === 'arm64') return 'macos-aarch64';
    if (os === 'darwin' && arch === 'x64') return 'macos-x86_64';
    if (os === 'linux' && arch === 'x64') return 'linux-x86_64';
    if (os === 'linux' && arch === 'arm64') return 'linux-aarch64';

    throw new Error(`Unsupported platform: ${os}-${arch}`);
}

function main() {
    // 0. Clean/Init
    if (fs.existsSync(OUT_DIR)) {
        fs.rmSync(OUT_DIR, { recursive: true, force: true });
    }

    const platformParam = getPlatformTag();
    const platformDir = path.join(ARTIFACTS_DIR, platformParam);
    fs.mkdirSync(platformDir, { recursive: true });

    // 1. Generate Keys
    const { signingKeyPem, pubKeyB64, symmetricKeyB64 } = generateKeys();

    // 2. Build Rust Module
    console.log('Building ixos-pro...');
    run('cargo build -p ixos-pro --release');

    // 3. Find Artifact
    const targetDir = path.join(__dirname, '..', 'target', 'release');
    // Using simple logic to find the file
    const ext = process.platform === 'win32' ? 'dll' : process.platform === 'darwin' ? 'dylib' : 'so';
    const releaseFile = process.platform === 'win32' ? 'ixos_pro.dll' : `libixos_pro.${ext}`;
    const artifactPath = path.join(targetDir, releaseFile);

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Build artifact not found: ${artifactPath}`);
    }

    // 4. Encrypt and Sign (using upload-pro-module.js)
    console.log('Encrypting and signing...');
    run(`node "${UPLOAD_SCRIPT}" --input "${artifactPath}" --out-dir "${platformDir}"`, {
        IXOS_PRO_SIGNING_KEY: signingKeyPem,
        IXOS_PRO_SYMMETRIC_KEY: symmetricKeyB64
    });

    // 5. Create "envelope" (The envelope contains the symmetric key, encrypted for the DEVICE)
    // In a real scenario, the server has the Device Public Key and encrypts the symmetric key for that device.
    // For this TEST, we will create a dummy envelope that just contains the symmetric key in PLAIN SIGHT 
    // or encrypted with a fixed "test" device key if we can mock it?
    //
    // WAIT. `pro_loader.rs`:
    // let symmetric_key = device.decrypt_envelope(&envelope)?;
    // `DeviceIdentity::decrypt_envelope` expects an X25519 sealed box probably?
    //
    // Let's check `src/security/device_identity.rs`.
    // If I can't easily generate a valid X25519 sealed box for the actual local device identity from here,
    // I might hit a wall unless I just patch the code or do something clever.
    //
    // However, the USER's summary says: "Correct X25519 key derivation ... envelope decryption matches".
    // This implies `decrypt_envelope` performs a standard decrypt.
    // 
    // To properly test this, I need to know the User/Device's Public Key to encrypt the envelope FOR THEM.
    // But I don't know it yet.
    //
    // WORKAROUND:
    // We can print the Symmetric Key and ask the user to temporarily hardcode it or 
    // we can try to "mock" the decryption if we are just testing loading.
    //
    // OR, we can provide a "test" mode in the app.
    //
    // actually, let's look at `DeviceIdentity` usage. 
    // The `pro_loader` downloads `envelope.enc`.
    // `device.decrypt_envelope(&envelope)`.
    //
    // If I cannot simulate the server encrypting for the specific client, I cannot make a valid envelope 
    // without the client's public key.
    //
    // HACK for Verification:
    // I will modify `src-tauri/src/pro_loader.rs` temporarily to accept a RAW symmetric key if a specific ENV var is set?
    // Or simpler: The user runs the app once, it logs their Device Public Key (if we add a log), 
    // and then we generate the envelope? That's too header.
    //
    // ALTERNATIVE:
    // Just verifying the `ixos-pro` logic works via `cargo test` might be enough for "logic", but "wiring" needs the binary.
    // 
    // Let's look at `decrypt_envelope` implementation if possible.
    // I'll search for it.

    console.log('\n--- SETUP COMPLETE ---');
    console.log('To run the verification:');
    console.log('1. Copy these to your .env.local:');
    console.log(`IXOS_PRO_MODULE_BASE_URL=http://localhost:3000`);
    console.log(`IXOS_PRO_MODULE_VERSION=0.1.0`);
    console.log(`IXOS_PRO_MODULE_PUBKEY=${pubKeyB64}`);
    console.log('2. Serve the artifacts:');
    console.log(`npx serve dist-test -p 3000`);
    console.log('\nNOTE: The "envelope" mechanism requires the device public key. Encryption of the envelope is skipped in this script.');
    console.log('You may need to bypass envelope decryption for local testing or manually provide the symmetric key.');
    fs.writeFileSync('.env.generated', `IXOS_PRO_MODULE_BASE_URL=http://localhost:3000
IXOS_PRO_MODULE_VERSION=0.1.0
IXOS_PRO_MODULE_PUBKEY=${pubKeyB64}
IXOS_PRO_DEV_SYMMETRIC_KEY=${symmetricKeyB64}
`);
    console.log('Env vars written to .env.generated');
}

main();
