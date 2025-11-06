import { D1Client } from './d1';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_user_id TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  site_host TEXT NOT NULL,
  title TEXT,
  price TEXT,
  variant_summary TEXT,
  status TEXT CHECK(status IN ('UNKNOWN','NOT_AVAILABLE','COMING_SOON','AVAILABLE','ERROR')) DEFAULT 'UNKNOWN',
  status_conf_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  backoff_sec INTEGER DEFAULT 60,
  needs_manual INTEGER DEFAULT 0,
  etag TEXT,
  content_sig TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_checked_at DATETIME,
  next_check_at DATETIME,
  UNIQUE(user_id, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_tracks_due ON tracks(next_check_at);
CREATE INDEX IF NOT EXISTS idx_tracks_host ON tracks(site_host);
CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks(user_id);
`;

export async function runMigrations(client: D1Client): Promise<void> {
  const statements = SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await client.prepare(stmt).run();
  }
}
