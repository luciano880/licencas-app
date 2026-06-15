-- Execute no Supabase → SQL Editor → New query → Run
ALTER TABLE companies ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cidade TEXT;
