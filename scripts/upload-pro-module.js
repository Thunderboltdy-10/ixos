#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--input') {
      result.input = args[i + 1];
      i += 1;
    } else if (arg === '--out-dir') {
      result.outDir = args[i + 1];
      i += 1;
    }
  }
  return result;
}

function findModuleFile(inputPath) {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) {
    return inputPath;
  }

  const entries = fs.readdirSync(inputPath);
  const candidates = entries.filter((name) => {
    const lower = name.toLowerCase();
    return lower.startsWith('ixos_pro') || lower.startsWith('libixos_pro');
  });
  if (candidates.length === 0) {
    throw new Error('Could not find ixos_pro module in input directory');
  }

  const extensions = process.platform === 'win32'
    ? ['.dll']
    : process.platform === 'darwin'
      ? ['.dylib']
      : ['.so'];

  const match = candidates.find((name) => extensions.some((ext) => name.endsWith(ext)));
  if (!match) {
    throw new Error('Could not find platform module file');
  }

  return path.join(inputPath, match);
}

function ensureKeyEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env ${name}`);
  }
  return value;
}

function decodeSymmetricKey(value) {
  try {
    const buf = Buffer.from(value, 'base64');
    if (buf.length !== 32) {
      throw new Error('Symmetric key must be 32 bytes');
    }
    return buf;
  } catch (err) {
    throw new Error(`Invalid IXOS_PRO_SYMMETRIC_KEY: ${err.message}`);
  }
}

function encryptModule(plaintext, key) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce, {
    authTagLength: 16,
  });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ciphertext, tag]);
}

function signModule(plaintext, pemKey) {
  try {
    return crypto.sign(null, plaintext, pemKey);
  } catch (err) {
    throw new Error(`Signing failed: ${err.message}`);
  }
}

function main() {
  const { input, outDir } = parseArgs();
  if (!input || !outDir) {
    throw new Error('Usage: upload-pro-module.js --input <path> --out-dir <path>');
  }

  const modulePath = findModuleFile(input);
  const moduleBytes = fs.readFileSync(modulePath);

  const signingKey = ensureKeyEnv('IXOS_PRO_SIGNING_KEY');
  const symmetricKey = decodeSymmetricKey(ensureKeyEnv('IXOS_PRO_SYMMETRIC_KEY'));

  const signature = signModule(moduleBytes, signingKey);
  const encrypted = encryptModule(moduleBytes, symmetricKey);

  fs.mkdirSync(outDir, { recursive: true });
  const baseName = path.basename(modulePath);
  const encPath = path.join(outDir, `${baseName}.enc`);
  const sigPath = path.join(outDir, `${baseName}.sig`);

  fs.writeFileSync(encPath, encrypted);
  fs.writeFileSync(sigPath, signature);

  console.log(`Encrypted module: ${encPath}`);
  console.log(`Signature: ${sigPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
