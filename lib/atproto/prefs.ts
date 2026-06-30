import type { Agent } from "@atproto/api";
import type { UserPrefsRecord } from "@/types/prefs";

// Singleton per-user preferences record. Mirrors lib/atproto/repo.ts style but
// kept separate to keep chatNode concerns clean. The payload is encrypted by the
// client; this layer never sees plaintext.

export const PREFS_COLLECTION = "app.gaston.userPrefs";
export const PREFS_RKEY = "self";

function toRecord(value: unknown): UserPrefsRecord {
  const v = value as UserPrefsRecord & { $type?: string };
  return {
    enc: v.enc,
    salt: v.salt,
    iv: v.iv,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

/** Fetch the user's prefs record, or null if they haven't set one yet. */
export async function getPrefs(agent: Agent): Promise<UserPrefsRecord | null> {
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: agent.did!,
      collection: PREFS_COLLECTION,
      rkey: PREFS_RKEY,
    });
    return toRecord(res.data.value);
  } catch (e) {
    // No record yet — getRecord throws RecordNotFound / 400 for a missing rkey.
    if (e instanceof Error && /not ?found|could not locate/i.test(e.message)) {
      return null;
    }
    // Some PDS implementations surface this as an XRPCError without a clean name;
    // treat any "RecordNotFound" marker as absent, otherwise rethrow.
    const name = (e as { error?: string })?.error;
    if (name === "RecordNotFound") return null;
    throw e;
  }
}

/** Create or overwrite the singleton prefs record (already-encrypted payload). */
export async function putPrefs(
  agent: Agent,
  record: UserPrefsRecord,
): Promise<UserPrefsRecord> {
  await agent.com.atproto.repo.putRecord({
    repo: agent.did!,
    collection: PREFS_COLLECTION,
    rkey: PREFS_RKEY,
    record: { $type: PREFS_COLLECTION, ...record },
  });
  return record;
}
