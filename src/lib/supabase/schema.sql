-- GeoProfessor Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Daily briefs table
CREATE TABLE IF NOT EXISTS daily_briefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  sections JSONB NOT NULL DEFAULT '[]',
  actors JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_briefs_date_idx ON daily_briefs (date DESC);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_briefs_updated_at
  BEFORE UPDATE ON daily_briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can read daily briefs (public)
CREATE POLICY "Public read daily_briefs"
  ON daily_briefs FOR SELECT TO anon, authenticated USING (true);

-- Only service_role can write (server-side API only)
CREATE POLICY "Service role manages daily_briefs"
  ON daily_briefs FOR ALL TO service_role USING (true);

CREATE POLICY "Service role manages push_subscriptions"
  ON push_subscriptions FOR ALL TO service_role USING (true);
