import crypto from "crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateTransferCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeTransferCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatTransferCode(value: string) {
  const normalized = normalizeTransferCode(value);
  return normalized.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export function isValidTransferCode(value: string) {
  return normalizeTransferCode(value).length === CODE_LENGTH;
}
