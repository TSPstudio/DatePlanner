CREATE TABLE IF NOT EXISTS dates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  cooldown_until INTEGER DEFAULT NULL,
  roll_count INTEGER DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dates_cooldown ON dates(cooldown_until);
