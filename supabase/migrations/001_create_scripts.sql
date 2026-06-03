-- Migration: Create scripts table for storing generated script history
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  keyword TEXT NOT NULL,
  title TEXT,
  tagline TEXT,
  runtime TEXT,
  theme TEXT,
  bpm INTEGER,
  key TEXT,
  style_note TEXT,
  char_name TEXT,
  char_emoji TEXT,
  char_look TEXT,
  setting TEXT,
  sig_move TEXT,
  actions JSONB DEFAULT '[]'::jsonb,
  verse1 TEXT,
  chorus TEXT,
  verse2 TEXT,
  verse3 TEXT,
  bridge TEXT,
  outro TEXT,
  thumbnail TEXT
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_keyword ON scripts (keyword);

-- Enable Row Level Security
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for viewing script history)
CREATE POLICY "Allow anonymous read"
  ON scripts
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous insert (for saving generated scripts)
CREATE POLICY "Allow anonymous insert"
  ON scripts
  FOR INSERT
  TO anon
  WITH CHECK (true);
