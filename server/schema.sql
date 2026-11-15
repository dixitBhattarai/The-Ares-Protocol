CREATE TABLE IF NOT EXISTS players (
  username text PRIMARY KEY CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  password_salt bytea NOT NULL,
  password_hash bytea NOT NULL,
  progress jsonb
);
