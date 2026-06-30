// Client-side encryption for user preferences (personalization + memory).
//
// AT Protocol repos are PUBLICLY readable, so anything sensitive we store there
// must be encrypted in the browser before it leaves. We derive an AES-GCM key
// from a user passphrase (PBKDF2) and keep the derived key on-device so the
// passphrase is only needed once per device. The PDS and the Next server only
// ever see ciphertext.
//
// Web Crypto only — no dependencies. This module is client-only.

const PBKDF2_ITERATIONS = 200_000;
const KEY_LENGTH_BITS = 256;
const IV_LENGTH_BYTES = 12;
const SALT_LENGTH_BYTES = 16;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Return type pinned to `Uint8Array<ArrayBuffer>` so the bytes satisfy the
// Web Crypto `BufferSource` parameter types (which reject ArrayBufferLike).
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function utf8(s: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(s));
}

/** A fresh random PBKDF2 salt, base64-encoded. */
export function newSaltB64(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES)));
}

/** Derive an (extractable, so it can be cached) AES-GCM key from a passphrase + salt. */
export async function deriveKey(
  passphrase: string,
  saltB64: string,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    utf8(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    true, // extractable, so we can cache it on-device (exportKeyB64)
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a JSON-serializable value. Returns base64 ciphertext + IV. */
export async function encryptJson(
  key: CryptoKey,
  value: unknown,
): Promise<{ enc: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const plaintext = utf8(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  return {
    enc: bytesToBase64(new Uint8Array(cipher)),
    iv: bytesToBase64(iv),
  };
}

/**
 * Decrypt base64 ciphertext back into a value. Throws if the key is wrong
 * (AES-GCM auth tag mismatch) — callers treat that as "incorrect passphrase".
 */
export async function decryptJson<T>(
  key: CryptoKey,
  encB64: string,
  ivB64: string,
): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivB64) },
    key,
    base64ToBytes(encB64),
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** Export a derived key to base64 (raw) so it can be cached in localStorage. */
export async function exportKeyB64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64(new Uint8Array(raw));
}

/** Re-import a base64 raw key cached on-device. */
export async function importKeyB64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    base64ToBytes(b64),
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}
