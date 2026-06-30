// User preferences types. The stored record mirrors the `app.gaston.userPrefs`
// lexicon (see lexicons/app/gaston/userPrefs.json). Its payload is encrypted
// client-side: the server and PDS only ever see the ciphertext in `enc`.

/** The encrypted record body stored in the user's PDS. */
export interface UserPrefsRecord {
  /** Base64 AES-GCM ciphertext of a JSON-encoded UserPrefsPlain. */
  enc: string;
  /** Base64 PBKDF2 salt (not secret). */
  salt: string;
  /** Base64 AES-GCM IV (not secret). */
  iv: string;
  createdAt?: string;
  updatedAt: string;
}

/** The decrypted, in-memory preferences the user actually edits. */
export interface UserPrefsPlain {
  /** Custom instructions: how the assistant should respond to this user. */
  personalization: string;
  /** Manual memory: facts the user wants the assistant to always know. */
  memory: string;
}
