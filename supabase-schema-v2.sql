-- Execute no Supabase → SQL Editor → New query → Run

-- Histórico de renovações
CREATE TABLE IF NOT EXISTS renewals (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  renewed_by   INTEGER     NOT NULL REFERENCES users(id),
  old_venc     DATE        NOT NULL,
  new_venc     DATE        NOT NULL,
  obs          TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renewals_company ON renewals(company_id);

-- Clientes (acesso somente leitura às próprias licenças)
CREATE TABLE IF NOT EXISTS clients (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username     TEXT        NOT NULL UNIQUE,
  password     TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
