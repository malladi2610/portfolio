CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  server_ts TEXT NOT NULL,
  client_ts TEXT,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  referrer_host TEXT,
  visitor_id TEXT,
  session_id TEXT,
  source_label TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  browser_language TEXT,
  browser_timezone TEXT,
  screen TEXT,
  viewport TEXT,
  ip_hash TEXT,
  ip TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  postal_code TEXT,
  timezone TEXT,
  latitude TEXT,
  longitude TEXT,
  colo TEXT,
  asn INTEGER,
  as_organization TEXT,
  cf_ray TEXT,
  is_bot INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS visits_server_ts_idx ON visits (server_ts DESC);
CREATE INDEX IF NOT EXISTS visits_path_idx ON visits (path);
CREATE INDEX IF NOT EXISTS visits_visitor_id_idx ON visits (visitor_id);
CREATE INDEX IF NOT EXISTS visits_ip_hash_idx ON visits (ip_hash);
CREATE INDEX IF NOT EXISTS visits_source_label_idx ON visits (source_label);
