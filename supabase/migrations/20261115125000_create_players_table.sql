-- Migration: Create players table for Ares Protocol account system and expedition progress saves
-- Target audience: Kids 7-12 (COPPA-friendly: nicknames only, no email, no personal details)

CREATE TABLE IF NOT EXISTS players (
  username text PRIMARY KEY CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  password_salt bytea NOT NULL,
  password_hash bytea NOT NULL,
  progress jsonb
);

COMMENT ON TABLE players IS 'Stores player nicknames, salted scrypt password credentials, and saved expedition snapshots';
COMMENT ON COLUMN players.username IS 'Alphanumeric nickname between 3 and 20 characters';
COMMENT ON COLUMN players.progress IS 'JSONB snapshot of expedition mission state, resources, seed, and active tasks';
