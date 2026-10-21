-- Run in the Neon SQL editor (Vercel → Storage → your DB → Open in Neon).
-- Safe to run again: it only adds what's missing and never deletes data.
--
--   sessions       = REAL sessions only (live site, APP_MODE=real)
--   test_sessions  = TEST sessions only (preview, local, or live site with ?test=1)
-- Same columns, separate tables, so the two can never be mixed.

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_sec    INTEGER,

  -- PRE: before the game
  pre_mood        SMALLINT CHECK (pre_mood BETWEEN 1 AND 5),
  pre_energy      SMALLINT CHECK (pre_energy BETWEEN 0 AND 10),

  -- GAME
  purchases       JSONB NOT NULL,      -- [{id, qty}] and custom items [{id, custom, label, drain, qty}]
  total_energy    NUMERIC(8,2),
  reduce_item     TEXT,                -- "Which expense would you like to reduce?"

  -- POST: after the game
  post_mood       SMALLINT CHECK (post_mood BETWEEN 1 AND 5),
  post_energy     SMALLINT CHECK (post_energy BETWEEN 0 AND 10),
  post_aware      SMALLINT CHECK (post_aware BETWEEN 1 AND 5),   -- "more aware of my hidden effort"
  post_helpful    SMALLINT CHECK (post_helpful BETWEEN 1 AND 5),
  post_comment    TEXT
);

-- Columns added in later versions (ALTER so existing databases get them too).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refund_statement TEXT;          -- statement id from lib/refunds.js, or 'own'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refund_own_text  TEXT;          -- only when they wrote their own
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refund_level     TEXT;          -- little | some | lot
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refund_amount    NUMERIC(8,2);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS net_energy       NUMERIC(8,2);  -- total_energy - refund_amount
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ref_code         TEXT;          -- from receipt.ruangmalaysia.org/<code>

CREATE INDEX IF NOT EXISTS sessions_completed_at_idx ON sessions (completed_at DESC);
CREATE INDEX IF NOT EXISTS sessions_ref_code_idx     ON sessions (ref_code);

-- Test table: an exact copy of the real table's structure.
CREATE TABLE IF NOT EXISTS test_sessions (LIKE sessions INCLUDING ALL);
-- (If test_sessions already existed from an older version, add any new columns.)
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS refund_statement TEXT;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS refund_own_text  TEXT;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS refund_level     TEXT;
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS refund_amount    NUMERIC(8,2);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS net_energy       NUMERIC(8,2);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS ref_code         TEXT;
CREATE INDEX IF NOT EXISTS test_sessions_completed_at_idx ON test_sessions (completed_at DESC);

-- Handy view for analysis in the Neon SQL editor (real data only).
DROP VIEW IF EXISTS session_summary;
CREATE VIEW session_summary AS
SELECT id, completed_at AT TIME ZONE 'Asia/Kuala_Lumpur' AS completed_myt, ref_code,
       pre_mood, post_mood, post_mood - pre_mood AS mood_change,
       pre_energy, post_energy, post_energy - pre_energy AS energy_change,
       total_energy, refund_amount, net_energy, reduce_item,
       refund_statement, refund_level, refund_own_text, post_aware, post_helpful, post_comment
FROM sessions ORDER BY completed_at DESC;
