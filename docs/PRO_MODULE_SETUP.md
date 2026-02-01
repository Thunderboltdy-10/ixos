# Ixos Pro Module Setup Guide

The Ixos Pro module is an encrypted dynamic library loaded at runtime. To make it work, you need to configure encryption keys and a hosting location.

## 1. Generate Keys

You need a Signing Keypair (Ed25519) and a Symmetric Key (ChaCha20-Poly1305).

**Option A: Use the Helper Script** (Recommended)
Run the provided helper script in `scripts/generate_keys.js` (you may need to create this if missing, see below).

**Option B: Manual Generation**
- **Signing Key**: Generate an Ed25519 keypair. You need the PEM private key for CI, and the Base64/Hex public key for the App (`IXOS_PRO_MODULE_PUBKEY`).
- **Symmetric Key**: Generate 32 bytes of random data, encode as Base64.

## 2. Configure Environment Variables

### Local Development (`.env`)
Add these to your `src-tauri/.env`:
```bash
# Public key to verify the module signature
IXOS_PRO_MODULE_PUBKEY="<your-base64-public-key>"

# URL to download the module from (can be local server or blob)
IXOS_PRO_MODULE_BASE_URL="https://<your-blob-store-url>"
```

### CI/CD (GitHub Secrets)
Set these secrets for the workflow `.github/workflows/build-pro-module.yml`:
- `IXOS_PRO_SIGNING_KEY`: The Private Key (PEM format).
- `IXOS_PRO_SYMMETRIC_KEY`: The 32-byte Symmetric Key (Base64).

## 3. Hosting (Vercel Blob)

The app expects the module at:
`$IXOS_PRO_MODULE_BASE_URL/modules/pro/v{version}/{platform}/ixos_pro.{ext}.enc`

1.  **Set up Vercel Blob** stores.
2.  **Configure the Build Workflow** to upload to this store (currently it outputs to `dist/` and expects a subsequent step or script to upload).
3.  **Update `upload-pro-module.js`** if you want to upload directly, or use the GitHub Action `vercel/blob-upload` in your workflow.

## 4. Verification

Run the verification script:
```powershell
./scripts/verify_pro_setup.ps1
```
