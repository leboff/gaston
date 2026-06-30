import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  NodeSavedState,
  NodeSavedStateStore,
  NodeSavedSession,
  NodeSavedSessionStore,
} from "@atproto/oauth-client-node";

// A tiny SQLite database holding ONLY atproto OAuth state + session tokens.
// Chat content never touches this file — that lives in the user's PDS repo.

const DB_PATH = join(process.cwd(), "data", "auth.sqlite");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_session (sub TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}

export const stateStore: NodeSavedStateStore = {
  async set(key: string, value: NodeSavedState) {
    getDb()
      .prepare(
        "INSERT INTO auth_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(key, JSON.stringify(value));
  },
  async get(key: string) {
    const row = getDb()
      .prepare("SELECT value FROM auth_state WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as NodeSavedState) : undefined;
  },
  async del(key: string) {
    getDb().prepare("DELETE FROM auth_state WHERE key = ?").run(key);
  },
};

export const sessionStore: NodeSavedSessionStore = {
  async set(sub: string, value: NodeSavedSession) {
    getDb()
      .prepare(
        "INSERT INTO auth_session (sub, value) VALUES (?, ?) ON CONFLICT(sub) DO UPDATE SET value = excluded.value",
      )
      .run(sub, JSON.stringify(value));
  },
  async get(sub: string) {
    const row = getDb()
      .prepare("SELECT value FROM auth_session WHERE sub = ?")
      .get(sub) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as NodeSavedSession) : undefined;
  },
  async del(sub: string) {
    getDb().prepare("DELETE FROM auth_session WHERE sub = ?").run(sub);
  },
};
